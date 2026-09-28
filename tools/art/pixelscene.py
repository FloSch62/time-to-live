#!/usr/bin/env python3
"""pixelscene.py: Krea 2 render -> authored-looking low-resolution pixel-art scene (DIRECTION v5, A1 style study).

Unlike tools/pixelize.py (HD sprites, 2x2 cells, master palette + 64 colours), this targets a real low-resolution
grid (640x360 drawn 3x, or 480x270 drawn 4x) and a small per-scene palette, and it rebuilds the smooth sky/fog so
there is no speckle. Deterministic (fixed-seed k-means, no other randomness); numpy + Pillow + scipy.

  1. fit      centre-crop to the target aspect, resize (Lanczos) to an integer multiple f of the target size.
  2. prefilt  optional edge-preserving Kuwahara filter at source resolution (flattens painterly texture).
  3. grid     optional: detect the phase of Krea's pseudo-pixel grid (pixel-art prompts rendered at 8x) and align
              the cells to it.
  4. down     per-cell OKLab median of the inner cell (trim) -> one art pixel per cell.
  5. tone     contrast / chroma / lift, then a hue-shift grade: shadows pulled toward indigo, lights toward amber.
  6. smooth   large low-gradient regions (sky, fog, cloud tops) are found at native resolution; stars (small bright
              outliers) are lifted out first; the region is replaced by a masked Gaussian field (no speckle).
  7. palette  K colours per scene: k-means in OKLab over the scene (smooth regions down-weighted) + a few accent
              clusters for lamps/glows; centroids close to the master ramps (public/palette.json + 2 in-between
              steps) snap onto them.
  8. map      nearest colour; inside smooth regions clean bands, and a Bayer ordered dither only in a narrow seam
              between neighbouring band colours (sky_dither = seam width as a fraction of the step, 0 = hard bands).
  9. clean    outside smooth regions, same-colour 4-connected clusters of <= min_cluster pixels whose lightness is
              close to their surroundings are merged into the neighbour majority (lamps, stars and lines survive);
              optional majority passes.
 10. stars    the lifted stars are stamped back as single palette pixels.
 11. layers   optional (R4): split into a sky plane and a scene plane for parallax (see split_layers).

CLI:  pixelscene.py SRC OUT --size W H [--preset NAME] [--params JSON] [--info OUT.json]
API:  pixelscene(img, size, **params) -> (PIL RGB image, info dict)
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
from pixelize import (build_palette, cells, fit, grid_phase, kmeans, nearest, neighbours, majority,  # noqa: E402
                      oklab_to_srgb, srgb_to_oklab)

DEFAULTS = dict(
    crop=None, kuwahara=0, grid=False, trim=0.125,
    contrast=1.0, chroma=1.0, lift=0.0, gamma=1.0,
    grade=0.0, grade_shadow=(0.005, -0.045), grade_light=(0.012, 0.035),
    smooth_grad=0.018, smooth_min_area=0.004, smooth_sigma=2.5, smooth_erode=1, hole_max=48, hole_dE=0.08,
    star_dl=0.10, star_max=3,
    colors=32, accents=4, accent_c=0.09, accent_l=0.78, smooth_weight=0.25, snap_master=0.025, sky_colors=10,
    sky_dither=0.0, bayer=4,     # sky_dither: width of the ordered-dither seam between bands (0 = clean bands)
    row_w=31, soft_y=0.8, line_k=0.0, line_floor=0.02,   # line_k > 0: protect thin sky structures (off: moire risk)
    min_cluster=2, cluster_dl=0.12, flat_frac=0.6, majority_passes=0, majority_dl=0.10,
    layers=False, haze=0.0,     # haze: pull pale far detail toward the sky behind it (0..1)
)

PRESETS = {
    # R1/R2: painted (cel) source at 4x of 640x360, median cells
    "cel": dict(kuwahara=3, trim=0.0, colors=32, grade=0.5, chroma=0.9, sky_dither=0.35, soft_y=1.6,
                majority_passes=1),
    # R3: pixel-art source rendered at 8x the grid; cells follow Krea's pseudo-pixel lattice
    "pix8": dict(grid=True, trim=0.25, colors=40, smooth_weight=0.15, grade=0.4, chroma=0.92, gamma=1.15,
                 sky_dither=0.35, soft_y=1.6, haze=0.85),
    # event illustrations: a little more colour, figures matter more than sky
    "event": dict(kuwahara=0, grid=True, trim=0.25, colors=36, accents=5, grade=0.3, chroma=0.95, sky_dither=0.0,
                  smooth_min_area=0.01),
}

BAYER4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float64)
BAYER2 = np.array([[0, 2], [3, 1]], dtype=np.float64)


# ------------------------------------------------------------------------------------------------ helpers
def kuwahara(lab, r):
    """Classic 4-quadrant Kuwahara on an OKLab image (H, W, 3); quadrant chosen by the variance of L."""
    k = r + 1
    means, vars_ = [], []
    L = lab[..., 0]
    mL = ndimage.uniform_filter(L, k, mode="reflect")
    mL2 = ndimage.uniform_filter(L * L, k, mode="reflect")
    mC = [ndimage.uniform_filter(lab[..., c], k, mode="reflect") for c in range(3)]
    # uniform_filter centres the k-box at (k-1)//2; shift so each box is one quadrant of the (2r+1) window
    c0 = (k - 1) // 2
    for dy, dx in ((-r, -r), (-r, 0), (0, -r), (0, 0)):
        sy, sx = dy + c0, dx + c0

        def sh(a):
            return np.roll(np.roll(a, -sy, 0), -sx, 1)
        v = sh(mL2) - sh(mL) ** 2
        vars_.append(v)
        means.append(np.stack([sh(m) for m in mC], -1))
    vars_ = np.stack(vars_, 0)
    pick = vars_.argmin(0)
    out = np.zeros_like(lab)
    for i in range(4):
        out = np.where((pick == i)[..., None], means[i], out)
    return out


def grade_lab(lab, amount, shadow, light):
    """Hue-shift grade: dark values lean toward `shadow` (a, b), light values toward `light`, weighted by lightness."""
    if not amount:
        return lab
    x = lab.copy()
    L = np.clip(x[..., 0], 0, 1)
    # saturated accents (verdigris, rust, violet glass, ember) keep their hue: the grade acts on the neutrals
    keep = np.clip(1 - np.hypot(x[..., 1], x[..., 2]) / 0.09, 0.25, 1)
    ws = amount * np.clip((0.55 - L) / 0.45, 0, 1) ** 1.5 * keep
    wl = amount * np.clip((L - 0.55) / 0.35, 0, 1) ** 1.5 * 0.6 * keep
    for w, (a, b) in ((ws, shadow), (wl, light)):
        x[..., 1] = x[..., 1] * (1 - w) + a * w
        x[..., 2] = x[..., 2] * (1 - w) + b * w
    return x


def smooth_mask(lab, p):
    H, W = lab.shape[:2]
    L = ndimage.gaussian_filter(lab[..., 0], 1.0)
    a = ndimage.gaussian_filter(lab[..., 1], 1.0)
    b = ndimage.gaussian_filter(lab[..., 2], 1.0)
    g = np.hypot(ndimage.sobel(L, 0), ndimage.sobel(L, 1)) / 8
    g += 0.6 * (np.hypot(ndimage.sobel(a, 0), ndimage.sobel(a, 1)) + np.hypot(ndimage.sobel(b, 0), ndimage.sobel(b, 1))) / 8
    m = g < p["smooth_grad"]
    m = ndimage.binary_opening(m, np.ones((3, 3)))
    lab_, n = ndimage.label(m)
    if n:
        sizes = ndimage.sum(m, lab_, np.arange(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sizes >= p["smooth_min_area"] * H * W
        m = keep[lab_]
    # fill only small holes (stars, single noise pixels); a distant spire enclosed by sky stays detail
    holes = ndimage.binary_fill_holes(m) & ~m
    hl, hn = ndimage.label(holes)
    if hn:
        hs = np.bincount(hl.ravel(), minlength=hn + 1)
        m |= (hs[hl] <= 12) & holes
    # larger holes that barely differ from the sky around them (stray dither dots on a band seam) are sky too
    if p["hole_max"]:
        holes = ndimage.binary_fill_holes(m) & ~m
        hl, hn = ndimage.label(holes, np.ones((3, 3)))
        if hn:
            est = masked_blur(lab, m, 3.0, fill=True)
            dE = np.sqrt(((lab - est) ** 2).sum(-1))
            hs = np.bincount(hl.ravel(), minlength=hn + 1)
            mx = ndimage.maximum(dE, hl, np.arange(hn + 1))
            ok = (hs <= p["hole_max"]) & (np.asarray(mx) <= p["hole_dE"])
            ok[0] = False
            m |= ok[hl]
    if p["smooth_erode"]:
        m = ndimage.binary_erosion(m, iterations=p["smooth_erode"], border_value=1)
    return m


def find_stars(lab, region, dl, max_size):
    """Small bright outliers inside the smooth region: (mask of star pixels)."""
    L = lab[..., 0]
    med = ndimage.median_filter(L, 5)
    cand = region & (L - med > dl)
    lab_, n = ndimage.label(cand, np.ones((3, 3)))
    if not n:
        return cand
    sizes = ndimage.sum(cand, lab_, np.arange(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = sizes <= max_size
    return keep[lab_]


def masked_blur(lab, mask, sigma, fill=False):
    """Gaussian blur of `lab` using only `mask` pixels. Outside the mask the input is kept, or with fill=True the
    blur is continued under large objects too (progressively wider kernels, then the row mean of the mask)."""
    m = mask.astype(np.float64)
    w = ndimage.gaussian_filter(m, sigma)
    out = np.empty_like(lab)
    for c in range(3):
        out[..., c] = ndimage.gaussian_filter(lab[..., c] * m, sigma) / np.maximum(w, 1e-6)
    if fill and mask.any():
        ok = w > 0.05
        for s2 in (sigma * 4, sigma * 12):
            if ok.all():
                break
            w2 = ndimage.gaussian_filter(m, s2)
            for c in range(3):
                v = ndimage.gaussian_filter(lab[..., c] * m, s2) / np.maximum(w2, 1e-9)
                out[..., c] = np.where(~ok & (w2 > 0.02), v, out[..., c])
            ok |= w2 > 0.02
        if not ok.all():
            rows = (lab * m[..., None]).sum(1) / np.maximum(m.sum(1), 1)[:, None]
            filled = np.where(m.sum(1)[:, None] > 0, rows, np.nan)
            idx = np.arange(len(filled))
            for c in range(3):
                good = ~np.isnan(filled[:, c])
                filled[:, c] = np.interp(idx, idx[good], filled[good, c])
            out = np.where(~ok[..., None], filled[:, None, :], out)
        return np.where(mask[..., None], lab, out)
    return np.where(mask[..., None], out, lab)


def build_scene_palette(lab, smooth, stars, p, rng_seed=7):
    flat = lab.reshape(-1, 3)
    sm = smooth.reshape(-1)
    C = np.hypot(flat[:, 1], flat[:, 2])
    acc = ((C > p["accent_c"]) & (flat[:, 0] > 0.55)) | (flat[:, 0] > p["accent_l"]) | stars.reshape(-1)
    base = flat[~acc]
    wts = np.where(sm[~acc], p["smooth_weight"], 1.0)
    # deterministic weighted subsample: keep every pixel of detail, a stride of the smooth ones
    step = max(1, int(round(1 / max(p["smooth_weight"], 1e-3))))
    idx = np.arange(len(base))
    sel = (wts >= 1) | (idx % step == 0)
    sample = base[sel]
    sample = sample[:: max(1, len(sample) // 40000)]
    k_acc = p["accents"] if acc.sum() >= p["accents"] * 6 else 0
    # the sky/fog gets its own levels (one per visible band), so a band never sits between two colours and turns
    # into a wide checkerboard; the rest of the palette goes to the detail
    k_sky = p["sky_colors"] if sm.sum() >= p["sky_colors"] * 50 else 0
    parts = []
    if k_sky:
        sk = flat[sm & ~acc]
        parts.append(kmeans(sk[:: max(1, len(sk) // 30000)], k_sky, iters=30, seed=rng_seed + 2))
        sample = base[~sm[~acc]]
        sample = sample[:: max(1, len(sample) // 40000)]
    cent = kmeans(sample, p["colors"] - k_acc - k_sky, iters=30, seed=rng_seed)
    if parts:
        cent = np.concatenate([cent] + parts)
    if k_acc:
        a = flat[acc]
        a = a[:: max(1, len(a) // 8000)]
        cent = np.concatenate([cent, kmeans(a, k_acc, iters=30, seed=rng_seed + 1)])
    snapped = 0
    if p["snap_master"]:
        master = build_palette(ramp_steps=2)
        mlab = srgb_to_oklab(master)
        d = np.sqrt(((cent[:, None] - mlab[None]) ** 2).sum(-1))
        j = d.argmin(1)
        close = d[np.arange(len(cent)), j] <= p["snap_master"]
        cent = np.where(close[:, None], mlab[j], cent)
        snapped = int(close.sum())
    rgb = np.unique(oklab_to_srgb(cent), axis=0)
    return rgb, snapped


def _row_field(lab, region, sigma, row_w, soft_y=0.8):
    prefill = masked_blur(lab, region, sigma, fill=True)
    base = np.where(region[..., None], lab, prefill)
    if row_w and row_w > 1:
        f = np.stack([ndimage.median_filter(base[..., c], size=(1, row_w), mode="nearest") for c in range(3)], -1)
        return np.stack([ndimage.gaussian_filter(f[..., c], sigma=(soft_y, 2.0), mode="nearest") for c in range(3)], -1)
    return prefill


def sky_field(lab, region, sigma, row_w, min_px=64, main=False, soft_y=0.8):
    """The clean sky/fog field: a row-wise median (keeps the horizontal band structure of a side-view sky, drops
    random noise and short structures), softened a little. Computed separately for every connected smooth region,
    so a flat dark silhouette interior never mixes with the sky beside it. With main=True, returns the field of the
    largest region continued over the whole frame (the sky plane behind everything)."""
    comp, n = ndimage.label(region)
    if not n:
        return lab.copy()
    sizes = np.bincount(comp.ravel(), minlength=n + 1)
    if main:
        k = int(sizes[1:].argmax()) + 1
        return _row_field(lab, comp == k, sigma, row_w, soft_y)
    out = lab.copy()
    small = np.zeros(region.shape, bool)
    for k in range(1, n + 1):
        m = comp == k
        if sizes[k] < min_px:
            small |= m
            continue
        f = _row_field(lab, m, sigma, row_w, soft_y)
        out[m] = f[m]
    if small.any():
        out[small] = masked_blur(lab, small, sigma)[small]
    return out


def protect_lines(lab, smooth, stars, sigma, k_sigma, floor, row_w=31, length=7):
    """Coherent thin structures inside the smooth region (distant cables, masts, crane jibs): pixels whose deviation
    from the smoothed field persists along a 5-pixel line in one of four directions. Random sky noise averages out
    along the line; a cable does not. Returns the mask of line pixels (to be treated as detail)."""
    region = smooth & ~stars
    field = sky_field(lab, region, sigma, row_w)[..., 0]
    res = np.where(region, lab[..., 0] - field, 0.0)
    n = int(length)
    # no horizontal kernel: horizontal structure in a side-view sky is band seams, which the field already keeps
    ks = [np.ones((n, 1)) / n, np.eye(n) / n, np.fliplr(np.eye(n)) / n]
    resp = np.stack([ndimage.convolve(res, k, mode="nearest") for k in ks], 0)
    j = np.abs(resp).argmax(0)
    line = np.take_along_axis(resp, j[None], 0)[0]
    sig = 1.4826 * np.median(np.abs(res[region])) if region.any() else 0.0
    # local noise (MAD over 15x15): dithered band edges are noisy, so they need a much stronger coherent line
    loc = 1.4826 * ndimage.median_filter(np.abs(res), size=15, mode="nearest")
    thr = np.maximum(floor, k_sigma * np.maximum(loc, sig) / np.sqrt(n))
    m = region & (np.abs(line) > thr) & (np.sign(line) == np.sign(res)) & (np.abs(res) > 0.5 * thr)
    # a line needs length: keep only elongated components (>= 8 px) at least 6 px tall (the kernels are vertical and
    # diagonal; a horizontal chain of blobs is dither moire on a band seam, not a structure)
    lab_, nl = ndimage.label(m, np.ones((3, 3)))
    if nl:
        sizes = np.bincount(lab_.ravel(), minlength=nl + 1)
        tall = np.zeros(nl + 1)
        for i, sl in enumerate(ndimage.find_objects(lab_), start=1):
            tall[i] = sl[0].stop - sl[0].start
        m &= (sizes[lab_] >= 8) & (tall[lab_] >= 6)
    return m, float(sig)


def clean_orphans(idx, pal_lab, region, min_cluster, dl, protect, flat_frac=0.6):
    """Speckle removal: a same-colour 4-connected cluster of <= min_cluster pixels whose surroundings are flat (the
    8-neighbour majority colour holds >= flat_frac of the ring) and whose lightness is within dl of that majority is
    merged into it. Detail in textured areas, lines, lamps and stars survive."""
    if min_cluster <= 0:
        return idx
    H, W = idx.shape
    for _ in range(2):
        small = np.zeros((H, W), bool)
        for c in np.unique(idx):
            m = idx == c
            lab_, n = ndimage.label(m)
            if not n:
                continue
            sizes = np.bincount(lab_.ravel(), minlength=n + 1)
            small |= (sizes[lab_] <= min_cluster) & m
        small &= region & ~protect
        if not small.any():
            break
        nb = neighbours(idx)
        valid = (nb >= 0) & (nb != idx[None])
        maj, cnt = majority(nb, valid)
        L = pal_lab[:, 0]
        ok = small & (maj >= 0) & (cnt >= int(np.ceil(8 * flat_frac)) - 1) & \
            (np.abs(L[idx] - L[np.maximum(maj, 0)]) <= dl)
        if not ok.any():
            break
        idx = np.where(ok, maj, idx)
    return idx


def majority_passes(idx, pal_lab, region, passes, dl):
    for _ in range(passes):
        nb = neighbours(idx)
        valid = nb >= 0
        maj, cnt = majority(nb, valid)
        L = pal_lab[:, 0]
        rep = region & (cnt >= 6) & (maj != idx) & (np.abs(L[idx] - L[np.maximum(maj, 0)]) <= dl)
        idx = np.where(rep, maj, idx)
    return idx


def singletons(idx, region):
    """Speckle metric: pixels whose colour matches none of their 4 neighbours while >= 6 of their 8 neighbours share
    one other colour (an orphan in a flat area; texture, lines and rivets in busy areas do not count)."""
    nb = neighbours(idx)
    same = (nb[[0, 2, 4, 6]] == idx[None]).any(0)
    maj, cnt = majority(nb, (nb >= 0) & (nb != idx[None]))
    return int((~same & (cnt >= 6) & region).sum())


# ------------------------------------------------------------------------------------------------ main API
def seam_quantize(lab, region, pal_lab, width, bayer=4):
    """Quantize `region` of `lab` to clean palette bands; only a seam of `width` (fraction of the step between the
    two nearest colours) around each band edge is ordered-dithered (Bayer). Returns palette indices for region."""
    H, W = region.shape
    B = BAYER4 if bayer == 4 else BAYER2
    thr = (np.tile(B, (H // B.shape[0] + 1, W // B.shape[1] + 1))[:H, :W] + 0.5) / B.size
    pts = lab[region]
    out = np.empty(len(pts), dtype=np.int64)
    for i in range(0, len(pts), 65536):
        q = pts[i:i + 65536]
        d = ((q[:, None, :] - pal_lab[None]) ** 2).sum(-1)
        o = np.argsort(d, 1)[:, :2]
        c1, c2 = pal_lab[o[:, 0]], pal_lab[o[:, 1]]
        seg = c2 - c1
        t = np.clip(((q - c1) * seg).sum(-1) / np.maximum((seg * seg).sum(-1), 1e-9), 0, 1)
        t2 = np.clip((t - (0.5 - width / 2)) / max(width, 1e-6), 0, 1)
        out[i:i + 65536] = np.where(t2 > thr[region][i:i + 65536], o[:, 1], o[:, 0])
    return out


def split_layers(idx, pal_rgb, pal_lab, lab, smooth, stars, field, p):
    """R4 parallax planes from one scene: `sky` (opaque: the largest smooth region, i.e. the open sky, with its
    banded field continued behind everything, plus its stars) and `scene` (alpha: everything else, drawn over the
    sky with a small, grid-snapped parallax offset). A colour-based far/near split of the objects was tried and
    rejected: haze-lit distant spires are brighter than the sky while flat silhouette interiors look like sky."""
    H, W = idx.shape
    comp, n = ndimage.label(smooth)
    if not n:
        return None
    sizes = np.bincount(comp.ravel(), minlength=n + 1)
    skym = comp == int(sizes[1:].argmax()) + 1
    skym = ndimage.binary_fill_holes(skym) & (skym | stars)          # stars inside the sky stay in the sky plane
    main = sky_field(lab, skym & ~stars, p["smooth_sigma"], p["row_w"], main=True, soft_y=p["soft_y"])
    sky_idx = seam_quantize(main, np.ones((H, W), bool), pal_lab, p["sky_dither"] or 0.0, p["bayer"]).reshape(H, W)
    sky_idx[skym] = idx[skym]
    scene = ~skym
    rgb = pal_rgb[idx].astype(np.uint8)
    a = np.zeros((H, W, 4), np.uint8)
    a[scene, :3] = rgb[scene]
    a[scene, 3] = 255
    return {"sky": Image.fromarray(pal_rgb[sky_idx].astype(np.uint8), "RGB"), "scene": Image.fromarray(a, "RGBA")}


def pixelscene(img, size, **kw):
    p = dict(DEFAULTS)
    p.update({k: v for k, v in kw.items() if v is not None})
    W, H = size
    img, f = fit(img.convert("RGB"), size, p["crop"])
    src = np.asarray(img, dtype=np.uint8)
    snap = None
    if p["grid"] and f >= 4:
        (px_, sx), (py_, sy) = grid_phase(src.mean(-1), f)
        snap = {"phase": [px_, py_], "strength": [round(sx, 3), round(sy, 3)]}
        if px_:
            src = np.concatenate([src[:, px_:], np.repeat(src[:, -1:], px_, 1)], 1)
        if py_:
            src = np.concatenate([src[py_:], np.repeat(src[-1:], py_, 0)], 0)
    lab_src = srgb_to_oklab(src)
    if p["kuwahara"]:
        lab_src = kuwahara(lab_src, int(p["kuwahara"]))
    lab = np.median(cells(lab_src, f, p["trim"]), axis=2)

    # tone
    if p["gamma"] != 1.0:
        lab[..., 0] = np.clip(lab[..., 0], 0, 1) ** p["gamma"]
    if p["contrast"] != 1.0:
        lab[..., 0] = (lab[..., 0] - 0.5) * p["contrast"] + 0.5
    lab[..., 0] += p["lift"]
    if p["chroma"] != 1.0:
        lab[..., 1:] *= p["chroma"]
    lab = grade_lab(lab, p["grade"], p["grade_shadow"], p["grade_light"])

    # smooth regions (sky, fog) and stars
    smooth = smooth_mask(lab, p)
    stars = find_stars(lab, smooth, p["star_dl"], p["star_max"])
    lines = np.zeros_like(smooth)
    noise = None
    if p["line_k"]:
        lines, noise = protect_lines(lab, smooth, stars, p["smooth_sigma"], p["line_k"], p["line_floor"], p["row_w"])
        smooth &= ~lines
    field = sky_field(lab, smooth & ~stars, p["smooth_sigma"], p["row_w"], soft_y=p["soft_y"])
    lab2 = np.where((smooth & ~stars)[..., None], field, lab)
    hazed = 0
    if p["haze"]:
        # atmospheric perspective: pale, neutral detail brighter than the sky behind it (distant spires that pop
        # out of the haze) is pulled toward that sky; lamps (small or warm) and dark near silhouettes are untouched
        behind = sky_field(lab, smooth & ~stars, p["smooth_sigma"], p["row_w"], main=True, soft_y=p["soft_y"])
        det = ~smooth & ~stars
        dL = lab2[..., 0] - behind[..., 0]
        C = np.hypot(lab2[..., 1], lab2[..., 2])
        pale = det & (dL > 0.02) & (C < 0.07)
        comp, n = ndimage.label(pale, np.ones((3, 3)))
        if n:
            sizes = np.bincount(comp.ravel(), minlength=n + 1)
            tall = np.zeros(n + 1, bool)            # spires and masts, not the wide cloud-sea bands
            for i, sl in enumerate(ndimage.find_objects(comp), start=1):
                tall[i] = (sl[0].stop - sl[0].start) >= 1.2 * (sl[1].stop - sl[1].start)
            # above the cloud line every pale neutral structure is distant; below it only tall ones (spires)
            H_ = pale.shape[0]
            frac = det.mean(1)
            low = np.nonzero(frac[int(0.4 * H_):] > 0.6)[0]
            cloud_top = int(0.4 * H_) + int(low[0]) if len(low) else H_
            above = np.zeros_like(pale)
            above[:cloud_top] = True
            cand = pale & (sizes[comp] >= 12)
            sel = cand & (tall[comp] | above)
            # follow a hazed spire down into the cloud band: vertical-only growth through pale pixels
            grow = sel & above
            vert = np.array([[0, 1, 0], [0, 1, 0], [0, 1, 0]], bool)
            for _ in range(60):
                nxt = ndimage.binary_dilation(grow, vert) & cand
                if (nxt == grow).all():
                    break
                grow = nxt
            pale = sel | grow
            k = p["haze"]
            tgt = lab2.copy()
            tgt[..., 0] = behind[..., 0] + dL * (1 - k)
            tgt[..., 1:] = lab2[..., 1:] * (1 - k * 0.6) + behind[..., 1:] * (k * 0.6)
            lab2 = np.where(pale[..., None], tgt, lab2)
            hazed = int(pale.sum())

    pal_rgb, snapped = build_scene_palette(lab2, smooth, stars, p)
    pal_lab = srgb_to_oklab(pal_rgb)

    # map: nearest colour; in the smooth region clean bands with a narrow ordered-dither seam between neighbours
    idx = nearest(lab2, pal_lab)
    sky = smooth & ~stars
    if p["sky_dither"] and sky.any():
        idx[sky] = seam_quantize(lab2, sky, pal_lab, p["sky_dither"], p["bayer"])

    detail = ~smooth
    protect = stars.copy()
    idx = clean_orphans(idx, pal_lab, detail, p["min_cluster"], p["cluster_dl"], protect | lines, p["flat_frac"])
    if p["majority_passes"]:
        idx = majority_passes(idx, pal_lab, detail & ~protect, p["majority_passes"], p["majority_dl"])
    # stars back as single bright pixels (nearest palette colour of their original value)
    if stars.any():
        idx[stars] = nearest(lab[stars][None], pal_lab)[0]

    layers = split_layers(idx, pal_rgb, pal_lab, lab, smooth, stars, field, p) if p["layers"] else None
    rgb = pal_rgb[idx].astype(np.uint8)
    used = np.unique(idx)
    info = {
        "size": [W, H], "factor": f, "grid": snap,
        "params": {k: (list(v) if isinstance(v, tuple) else v) for k, v in p.items()},
        "palette": ["#%02x%02x%02x" % tuple(int(v) for v in pal_rgb[i]) for i in used],
        "colors_used": int(len(used)), "snapped_to_master": snapped,
        "smooth_share": round(float(smooth.mean()), 3), "stars": int(stars.sum()), "line_pixels": int(lines.sum()),
        "sky_noise": None if noise is None else round(noise, 4), "hazed": hazed,
        "singletons_detail": singletons(idx, detail & ~protect),
    }
    if layers:
        info["layers"] = {k: int((np.asarray(v)[..., 3] > 0).sum()) if v.mode == "RGBA" else W * H
                          for k, v in layers.items()}
        info["_layers"] = layers
    return Image.fromarray(rgb, "RGB"), info


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--size", type=int, nargs=2, required=True)
    ap.add_argument("--preset", choices=sorted(PRESETS))
    ap.add_argument("--params", help="JSON object of parameters (over the preset)")
    ap.add_argument("--info", help="write the info JSON here")
    a = ap.parse_args(argv)
    params = dict(PRESETS.get(a.preset, {}))
    if a.params:
        params.update(json.loads(a.params))
    with Image.open(a.src) as im:
        out, info = pixelscene(im, tuple(a.size), **params)
    info["preset"] = a.preset
    info["source"] = str(a.src)
    out.save(a.out, optimize=True)
    for name, im in (info.pop("_layers", None) or {}).items():
        im.save(str(Path(a.out).with_suffix("")) + f"-{name}.png", optimize=True)
    if a.info:
        Path(a.info).write_text(json.dumps(info, indent=1) + "\n")
    print(json.dumps({"out": a.out, "colors": info["colors_used"], "singletons": info["singletons_detail"],
                      "smooth": info["smooth_share"], "grid": info["grid"]}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
