#!/usr/bin/env python3
"""pixelize.py: turn a large Krea 2 render into crisp pixel art in TIME TO LIVE's master palette.

Deterministic (no randomness except a fixed-seed k-means), numpy + Pillow only. Pipeline:

 1. fit    - optional crop box on the source, then centre-crop to the target aspect and resize (Lanczos) to an
             integer multiple f of the target size when it is not one already.
 2. down   - per target cell (f x f source pixels): 'median' = per-channel median in OKLab of the inner cell
             (trim = fraction cut off each side), 'mode' = most frequent palette colour among the cell's pixels,
             'mean' = plain mean. Median/mode keep edges crisp instead of averaging them into mud.
 3. tone   - optional OKLab adjustments before snapping: contrast around mid grey, chroma gain, lightness gamma.
 4. snap   - nearest master-palette colour in OKLab (palette.json, 50 colours). Scenes may add up to 16 extra
             colours (k-means over the pixels the palette fits worst, e.g. cloud/sky gradients); they are reported.
 5. prune  - colours used by fewer than min_share of the pixels are merged into their nearest surviving colour
             (bright accents - lamps, stars - are kept).
 6. clean  - orphan removal: a pixel that shares its colour with none of its 4 neighbours and whose lightness is
             within orphan_dl of its 8-neighbour majority colour is replaced by that colour (so stars/lamps stay),
             then optional majority smoothing passes.
 7. alpha  - 'sil' (exact silhouette PNG at target size, e.g. hull silhouettes that cover the room grid; edge pixels
             that are really backdrop are removed within a band, never inside --protect), 'flood' (flood fill from
             the border through backdrop-like pixels), or 'none'. Small detached islands are dropped.
 8. outline- 'sel' (selective outline: every opaque pixel touching transparency becomes a darker shade of itself,
             snapped to the palette), 'ink' (1-px ink ring outside the sprite), or 'none'.

CLI:  pixelize.py IN OUT --size W H [--alpha sil --sil SIL.png] [--outline sel] [--extra 12] ...
API:  pixelize(pil_image, size=(w, h), **params) -> (PIL RGBA/RGB image, info dict)
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PALETTE_JSON = ROOT / "public" / "palette.json"

DEFAULTS = dict(
    crop=None, down="median", trim=0.125, snap=False, pre_median=0, contrast=1.0, chroma=1.0, gamma=1.0, lift=0.0,
    extra=0, extra_thresh=0.035, extra_lmin=0.2, min_share=0.0015, keep_bright_l=0.80, orphan_dl=0.22, orphan_passes=2,
    smooth_passes=0, alpha="none", sil=None, protect=None, bg=None, bg_tol=0.06, edge_band=3, min_island=6,
    outline="none", outline_dark=0.45, exclude=None, lamps=None, lamp_colors=None, lamp_lmin=0.62,
    ramp_steps=0, max_colors=0,
)


# ------------------------------------------------------------------------------------------------ colour
def srgb_to_oklab(rgb):
    """rgb uint8/float array (...,3) in 0..255 -> OKLab float (...,3)."""
    c = np.asarray(rgb, dtype=np.float64) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                   [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]])
    lms = np.cbrt(lin @ m1.T)
    m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                   [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]])
    return lms @ m2.T


def oklab_to_srgb(lab):
    lab = np.asarray(lab, dtype=np.float64)
    m2i = np.array([[1.0, 0.3963377774, 0.2158037573],
                    [1.0, -0.1055613458, -0.0638541728],
                    [1.0, -0.0894841775, -1.2914855480]])
    lms = (lab @ m2i.T) ** 3
    m1i = np.array([[4.0767416621, -3.3077115913, 0.2309699292],
                    [-1.2684380046, 2.6097574011, -0.3413193965],
                    [-0.0041960863, -0.7034186147, 1.7076147010]])
    lin = np.clip(lms @ m1i.T, 0, 1)
    c = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)
    return np.clip(np.round(c * 255), 0, 255).astype(np.uint8)


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def load_palette(path=PALETTE_JSON):
    data = json.loads(Path(path).read_text())
    return np.array([hex_to_rgb(h) for h in data["all"]], dtype=np.uint8)


def build_palette(ramp_steps=0, exclude=None, path=PALETTE_JSON):
    """Master palette, optionally extended with `ramp_steps` OKLab in-between colours between neighbouring entries of
    each master ramp (DIRECTION v3: hi-bit shading from the master ramps). Excluded colours are dropped, and no
    in-between is made next to them."""
    data = json.loads(Path(path).read_text())
    excl = {hex_to_rgb(h) for h in (exclude or [])}
    out = []
    for name, ramp in data["groups"].items():
        cols = [hex_to_rgb(h) for h in ramp if hex_to_rgb(h) not in excl]
        out.extend(cols)
        if ramp_steps and len(cols) > 1:
            lab = srgb_to_oklab(np.array(cols, dtype=np.uint8))
            order = np.argsort(lab[:, 0])
            for i in range(len(order) - 1):
                a, b = lab[order[i]], lab[order[i + 1]]
                for k in range(1, ramp_steps + 1):
                    t = k / (ramp_steps + 1)
                    out.append(tuple(int(v) for v in oklab_to_srgb((a * (1 - t) + b * t)[None])[0]))
    return np.unique(np.array(out, dtype=np.uint8), axis=0)


def nearest(lab, pal_lab, chunk=65536):
    """Index of the nearest palette entry for each OKLab colour (flattened)."""
    flat = lab.reshape(-1, 3)
    out = np.empty(len(flat), dtype=np.int32)
    for i in range(0, len(flat), chunk):
        d = ((flat[i:i + chunk, None, :] - pal_lab[None, :, :]) ** 2).sum(-1)
        out[i:i + chunk] = d.argmin(1)
    return out.reshape(lab.shape[:-1])


# ------------------------------------------------------------------------------------------------ steps
def fit(img, size, crop):
    if crop:
        x, y, w, h = crop
        img = img.crop((x, y, x + w, y + h))
    W, H = size
    # centre-crop to target aspect
    sw, sh = img.size
    if abs(sw / sh - W / H) > 1e-3:
        if sw / sh > W / H:
            nw = round(sh * W / H)
            x0 = (sw - nw) // 2
            img = img.crop((x0, 0, x0 + nw, sh))
        else:
            nh = round(sw * H / W)
            y0 = (sh - nh) // 2
            img = img.crop((0, y0, sw, y0 + nh))
    f = max(1, round(img.width / W))
    if img.size != (W * f, H * f):
        img = img.resize((W * f, H * f), Image.LANCZOS)
    return img, f


def grid_phase(gray, f):
    """Phase (0..f-1) of the dominant pseudo-pixel grid of period f along x and y, and its strength
    (edge-energy peak / mean). Used to align cell sampling with Krea's latent-aligned pixel-art grid."""
    out = []
    for axis in (1, 0):
        g = np.abs(np.diff(gray, axis=axis)).sum(1 - axis)
        pos = np.arange(1, len(g) + 1) % f
        prof = np.bincount(pos, weights=g, minlength=f) / np.maximum(1, np.bincount(pos, minlength=f))
        out.append((int(prof.argmax()), float(prof.max() / max(prof.mean(), 1e-9))))
    return out  # [(phase_x, strength_x), (phase_y, strength_y)]


def cells(arr, f, trim):
    """(H*f, W*f, C) -> (H, W, n, C) samples of each cell's inner region."""
    Hf, Wf, C = arr.shape
    H, W = Hf // f, Wf // f
    blk = arr.reshape(H, f, W, f, C).transpose(0, 2, 1, 3, 4)
    t = int(round(f * trim))
    if t and f - 2 * t >= 1:
        blk = blk[:, :, t:f - t, t:f - t, :]
    n = blk.shape[2] * blk.shape[3]
    return blk.reshape(H, W, n, C)


def kmeans(x, k, iters=20, seed=7):
    rng = np.random.default_rng(seed)
    # k-means++ init
    cent = [x[rng.integers(len(x))]]
    for _ in range(1, k):
        d = np.min(((x[:, None, :] - np.array(cent)[None]) ** 2).sum(-1), axis=1)
        if d.sum() == 0:
            break
        cent.append(x[rng.choice(len(x), p=d / d.sum())])
    cent = np.array(cent)
    for _ in range(iters):
        lab = ((x[:, None, :] - cent[None]) ** 2).sum(-1).argmin(1)
        new = np.array([x[lab == i].mean(0) if np.any(lab == i) else cent[i] for i in range(len(cent))])
        if np.allclose(new, cent):
            break
        cent = new
    return cent


def neighbours(idx, pad_val=-1):
    """Stack of the 8 neighbours of each pixel (N, NE, E, SE, S, SW, W, NW) with padding."""
    p = np.pad(idx, 1, constant_values=pad_val)
    H, W = idx.shape
    offs = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
    return np.stack([p[1 + dy:1 + dy + H, 1 + dx:1 + dx + W] for dy, dx in offs], 0)


def majority(nb, valid):
    """Most frequent value among neighbour stack (8,H,W) where valid; returns (value, count)."""
    best = np.full(nb.shape[1:], -1)
    cnt = np.zeros(nb.shape[1:], dtype=np.int32)
    for i in range(8):
        v = nb[i]
        c = ((nb == v[None]) & valid).sum(0)
        c = np.where(valid[i], c, 0)
        upd = c > cnt
        best = np.where(upd, v, best)
        cnt = np.where(upd, c, cnt)
    return best, cnt


def clean_orphans(idx, pal_lab, opaque, dl, passes):
    for _ in range(passes):
        nb = neighbours(idx)
        valid = neighbours(opaque.astype(np.int32), 0).astype(bool) & (nb >= 0)
        four = nb[[0, 2, 4, 6]]
        same4 = ((four == idx[None]) & valid[[0, 2, 4, 6]]).any(0)
        maj, cnt = majority(nb, valid)
        L = pal_lab[:, 0]
        cand = opaque & ~same4 & (maj >= 0) & (cnt >= 3)
        diff = np.abs(L[idx] - L[np.maximum(maj, 0)])
        rep = cand & (diff <= dl)
        if not rep.any():
            break
        idx = np.where(rep, maj, idx)
    return idx


def smooth(idx, pal_lab, opaque, passes, dl=0.12):
    for _ in range(passes):
        nb = neighbours(idx)
        valid = neighbours(opaque.astype(np.int32), 0).astype(bool) & (nb >= 0)
        maj, cnt = majority(nb, valid)
        L = pal_lab[:, 0]
        diff = np.abs(L[idx] - L[np.maximum(maj, 0)])
        rep = opaque & (cnt >= 6) & (maj != idx) & (diff <= dl)
        idx = np.where(rep, maj, idx)
    return idx


def flood_bg(lab_cells, bg_lab, tol, seed_mask):
    """Flood from seed_mask through pixels within tol of bg_lab (4-connectivity)."""
    from scipy import ndimage
    close = np.sqrt(((lab_cells - bg_lab) ** 2).sum(-1)) <= tol
    lab, _ = ndimage.label(close)
    ids = np.unique(lab[seed_mask & close])
    ids = ids[ids > 0]
    return np.isin(lab, ids)


def drop_islands(opaque, min_size, protect=None):
    from scipy import ndimage
    lab, n = ndimage.label(opaque, structure=np.ones((3, 3)))
    if n <= 1:
        return opaque
    sizes = ndimage.sum(opaque, lab, index=np.arange(1, n + 1))
    keep = np.zeros(n + 1, dtype=bool)
    keep[1:] = sizes >= min_size
    keep[np.argmax(sizes) + 1] = True
    if protect is not None:
        keep[np.unique(lab[protect & opaque])] = True
        keep[0] = False
    return keep[lab]


# ------------------------------------------------------------------------------------------------ main API
def pixelize(img, size, palette=None, **kw):
    p = dict(DEFAULTS)
    p.update({k: v for k, v in kw.items() if v is not None or k in ("crop", "sil", "protect", "bg", "exclude", "lamps")})
    W, H = size
    img = img.convert("RGB")
    img, f = fit(img, size, p["crop"])
    if p["pre_median"]:
        from PIL import ImageFilter
        img = img.filter(ImageFilter.MedianFilter(p["pre_median"]))
    src = np.asarray(img, dtype=np.uint8)
    snap_info = None
    if p["snap"] and f >= 4:
        (px_, sx), (py_, sy) = grid_phase(src.mean(-1), f)
        snap_info = {"phase": [px_, py_], "strength": [round(sx, 2), round(sy, 2)]}
        # shift so cell boundaries sit on the detected grid lines (edge-replicate the border)
        if sx > 1.5 and px_:
            src = np.concatenate([src[:, px_:], np.repeat(src[:, -1:], px_, 1)], 1)
        if sy > 1.5 and py_:
            src = np.concatenate([src[py_:], np.repeat(src[-1:], py_, 0)], 0)
    src_lab = srgb_to_oklab(src)

    if palette is None:
        pal_rgb = build_palette(p["ramp_steps"], p["exclude"])
    else:
        pal_rgb = np.asarray(palette, dtype=np.uint8)
    pal_lab = srgb_to_oklab(pal_rgb)

    # 2. downsample
    samples = cells(src_lab, f, p["trim"] if p["down"] != "mode" else 0)
    if p["down"] == "median":
        lab = np.median(samples, axis=2)
    elif p["down"] == "mean":
        lab = samples.mean(axis=2)
    elif p["down"] == "mode":
        lab = np.median(samples, axis=2)  # used for extra-colour fitting and alpha tests
    else:
        raise ValueError(p["down"])

    # 3. tone
    def tone(x):
        x = x.copy()
        if p["gamma"] != 1.0:
            x[..., 0] = np.clip(x[..., 0], 0, 1) ** p["gamma"]
        if p["contrast"] != 1.0:
            x[..., 0] = (x[..., 0] - 0.5) * p["contrast"] + 0.5
        x[..., 0] += p["lift"]
        if p["chroma"] != 1.0:
            x[..., 1:] *= p["chroma"]
        return x
    lab = tone(lab)

    # 4. palette (+ extras)
    extras = []
    if p["extra"]:
        flat = lab.reshape(-1, 3)
        # HD frames have millions of pixels. A full pixels × palette × RGB broadcast exhausts RAM and
        # starves the GPU renderer. Query exact nearest palette colours in bounded chunks instead.
        closest = nearest(lab, pal_lab).reshape(-1)
        d = np.linalg.norm(flat - pal_lab[closest], axis=1)
        bad = flat[(d > p["extra_thresh"]) & (flat[:, 0] >= p["extra_lmin"])]
        if len(bad) >= p["extra"] * 8:
            sub = bad[:: max(1, len(bad) // 20000)]
            cent = kmeans(sub, p["extra"])
            ext_rgb = oklab_to_srgb(cent)
            ext_rgb = np.unique(ext_rgb, axis=0)
            pal_rgb = np.concatenate([pal_rgb, ext_rgb])
            pal_lab = srgb_to_oklab(pal_rgb)
            extras = ["#%02x%02x%02x" % tuple(int(v) for v in c) for c in ext_rgb]

    if p["down"] == "mode":
        sidx = nearest(tone(src_lab), pal_lab)
        cidx = cells(sidx[..., None], f, 0)[..., 0]  # (H, W, n)
        K = len(pal_lab)
        counts = np.zeros((H, W, K), dtype=np.int32)
        for j in range(cidx.shape[2]):
            np.add.at(counts, (np.arange(H)[:, None], np.arange(W)[None, :], cidx[:, :, j]), 1)
        idx = counts.argmax(-1)
    else:
        idx = nearest(lab, pal_lab)

    # 7a. alpha (decided before pruning so the backdrop does not count)
    opaque = np.ones((H, W), dtype=bool)
    protect = np.zeros((H, W), dtype=bool)
    if p["protect"]:
        x, y, w, h = p["protect"]
        protect[y:y + h, x:x + w] = True
    if p["alpha"] in ("sil", "flood"):
        if p["bg"] is not None:
            bg_lab = srgb_to_oklab(np.array(hex_to_rgb(p["bg"]) if isinstance(p["bg"], str) else p["bg"]))
        else:
            border = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
            bg_lab = np.median(border, axis=0)
        if p["alpha"] == "sil":
            sil = Image.open(p["sil"]).convert("L")
            if sil.size != (W, H):
                sil = sil.resize((W, H), Image.NEAREST)
            opaque = np.asarray(sil) >= 128
            if p["edge_band"]:
                from scipy import ndimage
                inner = ndimage.binary_erosion(opaque, iterations=p["edge_band"])
                band = opaque & ~inner & ~protect
                seed = ~opaque
                cand = band | seed
                bgmask = flood_bg(np.where(cand[..., None], lab, 9.0), bg_lab, p["bg_tol"], seed)
                opaque &= ~(bgmask & band)
            protect_all = protect
        else:
            seed = np.zeros((H, W), dtype=bool)
            seed[0, :] = seed[-1, :] = seed[:, 0] = seed[:, -1] = True
            bgmask = flood_bg(lab, bg_lab, p["bg_tol"], seed)
            opaque = ~bgmask | protect
            protect_all = protect
        opaque = drop_islands(opaque, p["min_island"], protect_all if protect.any() else None)
        # fill pinholes fully enclosed by the sprite
        from scipy import ndimage
        opaque = ndimage.binary_fill_holes(opaque) if p["alpha"] == "flood" else opaque

    # 5. prune rare colours
    used = np.bincount(idx[opaque], minlength=len(pal_lab))
    share = used / max(1, opaque.sum())
    keep = (share >= p["min_share"]) | ((pal_lab[:, 0] >= p["keep_bright_l"]) & (used > 0))
    if not keep.any():
        keep = used > 0
    if (~keep & (used > 0)).any():
        kept = np.where(keep)[0]
        remap = np.arange(len(pal_lab))
        for i in np.where(~keep & (used > 0))[0]:
            remap[i] = kept[((pal_lab[kept] - pal_lab[i]) ** 2).sum(-1).argmin()]
        idx = remap[idx]

    # 5b. cap the per-asset palette (most used colours win; bright accents are kept)
    if p["max_colors"]:
        used = np.bincount(idx[opaque], minlength=len(pal_lab))
        ranked = np.argsort(-used)
        keep_ids = [i for i in ranked[:p["max_colors"]] if used[i] > 0]
        keep_ids += [i for i in np.where((pal_lab[:, 0] >= p["keep_bright_l"]) & (used > 0))[0] if i not in keep_ids]
        keep_ids = np.array(keep_ids)
        if (used > 0).sum() > len(keep_ids):
            remap = np.arange(len(pal_lab))
            for i in np.where(used > 0)[0]:
                if i not in keep_ids:
                    remap[i] = keep_ids[((pal_lab[keep_ids] - pal_lab[i]) ** 2).sum(-1).argmin()]
            idx = remap[idx]

    # 6. clean
    idx = clean_orphans(idx, pal_lab, opaque, p["orphan_dl"], p["orphan_passes"])
    if p["smooth_passes"]:
        idx = smooth(idx, pal_lab, opaque, p["smooth_passes"])

    rgb = pal_rgb[idx]

    # 7b. livery lamps: lit pixels inside the lamp mask become the reserved lamp ramp (by lightness), so the game can
    # recolour exactly those colours; everything else was mapped without them (pass them in `exclude`).
    if p["lamps"] and p["lamp_colors"]:
        lm = Image.open(p["lamps"]).convert("L")
        if lm.size != (W, H):
            lm = lm.resize((W, H), Image.NEAREST)
        lmask = (np.asarray(lm) >= 128) & opaque
        ramp = np.array([hex_to_rgb(h) for h in p["lamp_colors"]], dtype=np.uint8)
        ramp_L = srgb_to_oklab(ramp)[:, 0]
        order = np.argsort(-ramp_L)                     # brightest first
        Lsrc = lab[..., 0]
        lit = lmask & (Lsrc >= p["lamp_lmin"])
        if lit.any():
            # spread the lit pixels over the ramp by lightness quantiles (brightest core -> lightest colour)
            qs = np.quantile(Lsrc[lit], [0.85, 0.6, 0.3])
            level = np.where(Lsrc >= qs[0], 0, np.where(Lsrc >= qs[1], 1, np.where(Lsrc >= qs[2], 2, 3)))
            rgb[lit] = ramp[order][np.minimum(level[lit], len(ramp) - 1)]

    # 8. outline
    if p["alpha"] != "none" and p["outline"] != "none":
        from scipy import ndimage
        if p["outline"] == "sel":
            edge = opaque & ~ndimage.binary_erosion(opaque, structure=np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]),
                                                    border_value=0)
            base = pal_lab[idx[edge]]
            dark = base.copy()
            dark[:, 0] = base[:, 0] * p["outline_dark"]
            dark[:, 1:] *= 0.7
            core = load_palette()
            if p["exclude"]:
                excl = {hex_to_rgb(h) for h in p["exclude"]}
                core = np.array([c for c in core if tuple(int(v) for v in c) not in excl], dtype=np.uint8)
            core_lab = srgb_to_oklab(core)
            rgb[edge] = core[nearest(dark[None], core_lab)[0]]
        elif p["outline"] == "ink":
            ring = ndimage.binary_dilation(opaque, structure=np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]])) & ~opaque
            rgb[ring] = hex_to_rgb("#07080f")
            opaque = opaque | ring

    info = {"size": [W, H], "factor": f, "snap": snap_info,
            "params": {k: v for k, v in p.items() if k not in ("sil", "lamps")},
            "extra_colors": extras,
            "colors_used": int(len(np.unique(rgb[opaque].reshape(-1, 3), axis=0)))}
    if p["alpha"] == "none":
        return Image.fromarray(rgb.astype(np.uint8), "RGB"), info
    rgba = np.concatenate([rgb, (opaque * 255).astype(np.uint8)[..., None]], -1)
    rgba[~opaque] = 0
    return Image.fromarray(rgba.astype(np.uint8), "RGBA"), info


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--size", type=int, nargs=2, required=True)
    ap.add_argument("--params", help="JSON object of parameters (overridden by explicit flags)")
    for k, v in DEFAULTS.items():
        if k in ("crop", "protect"):
            ap.add_argument("--" + k.replace("_", "-"), type=int, nargs=4)
        elif k == "exclude":
            ap.add_argument("--exclude", nargs="+")
        elif isinstance(v, bool):
            ap.add_argument("--" + k.replace("_", "-"), type=lambda s: s.lower() in ("1", "true", "yes"))
        elif isinstance(v, int) and not isinstance(v, bool):
            ap.add_argument("--" + k.replace("_", "-"), type=int)
        elif isinstance(v, float):
            ap.add_argument("--" + k.replace("_", "-"), type=float)
        else:
            ap.add_argument("--" + k.replace("_", "-"))
    ap.add_argument("--info", help="write the info JSON here")
    a = ap.parse_args(argv)
    params = json.loads(a.params) if a.params else {}
    for k in DEFAULTS:
        v = getattr(a, k)
        if v is not None:
            params[k] = v
    with Image.open(a.src) as im:
        out, info = pixelize(im, tuple(a.size), **params)
    out.save(a.out, optimize=True)
    if a.info:
        Path(a.info).write_text(json.dumps(info, indent=1) + "\n")
    print(json.dumps({"out": a.out, "colors": info["colors_used"], "extra": info["extra_colors"]}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
