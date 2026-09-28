#!/usr/bin/env python3
"""A2 hull kit: build lamplighter-pattern tenders from Krea-painted component sprites.

  python tools/art/assemble_hull.py parts                 cut out + pixelize every parts/* candidate; picking sheet
  python tools/art/assemble_hull.py build glasswing       assemble from art-src/hulls/glasswing.json -> preview + blend init
  python tools/art/assemble_hull.py finalize glasswing [--blend CAND.png]
                                                          (optionally the Krea blend-pass candidate) -> public/art/ships

Parts (subjects.PARTS, prompts in art-src/hullparts.py) are painted alone on a flat navy backdrop. `parts` cuts each
candidate out like tools/art/objects.py (largest foreground component, framed crop, border-flood alpha, hull palette)
at its target size (1 px = 1 backing px at TILE 72) into art-src/cand/parts/_px/<id>/<seed>.png and draws
tools/shots/art/hulls/parts.png. Picks live in art-src/hulls/picks.json ({part: seed}).

`build` places, per the vessel layout: the body modules (six 72-px columns sliced from each body strip; the layout
lists strip:column per grid column, so no module repeats next to itself), the rear cap and the nose (overlapping the
body ends), roof fittings standing on the roof rail on their own base plates, roof hardpoint plates at the top mounts,
the trolley with its sheaves on the carrier line exactly as on the Lamplighter (its hanger struts extended down to
the roof rail), keel tanks and lugs hanging from the keel strip, belly plates at the belly mounts. The grid rectangle
is filled opaque. Colours are snapped to the hull palette (master ramps + 2 in-between steps), lit nose-lamp pixels
become the four livery lampColors, a selective 1-px outline closes the silhouette, and ships.json metadata (cable,
mounts, couplerRear, keelHang, glow) is derived from the placements. It also writes the blend-pass init (2x) and mask
(repaint inside the silhouette, outside the grid rectangle) for a low-denoise Krea img2img (`hulls/<id>:blend`).
"""
import argparse
import datetime
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art-src"
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "art"))
sys.path.insert(0, str(ART))
from pixelize import build_palette, hex_to_rgb, nearest, pixelize, srgb_to_oklab  # noqa: E402
from objects import framed_crop, object_bbox  # noqa: E402

PX = ART / "cand" / "parts" / "_px"
HULLS = ART / "hulls"
OUT = ROOT / "tools" / "shots" / "art" / "hulls"
PUB = ROOT / "public" / "art" / "ships"
LAMP_COLORS = ["#fff1c2", "#ffd98a", "#ffb347", "#e8822a"]
PART_PARAMS = dict(down="median", trim=0.125, alpha="flood", outline="none", bg_tol=0.07, min_share=0.001,
                   orphan_dl=0.16, orphan_passes=2, min_island=12, ramp_steps=2, max_colors=64, pre_median=3,
                   exclude=LAMP_COLORS)
# parts that must fill their target box exactly (body strips, end caps, noses): tight crop, stretched to size
FILL = {"body-4a", "body-4b", "body-5a", "body-5b", "rear-cap", "rear-cap-5", "nose-lamp", "nose-optical",
        "nose-heavy"}
KIT = ART / "kit"
L_TROLLEY = dict(src="lamplighter-ref.png", box=(298, 0, 602, 92), cable=(152, 20),   # cable point in the box
                 struts=[(27, 45), (258, 277)], bar=(320, 92, 580, 100))                 # strut cols; yoke bar


def parts_list():
    import subjects
    import hullparts
    return {**subjects.PARTS, **hullparts.EXTRA_INIT}


def cut_part(pid, cand, size=None):
    """Candidate PNG -> pixelized RGBA part at its target size."""
    tw, th = size or parts_list()[pid][0]
    with Image.open(cand) as im:
        im = im.convert("RGB")
        bbox, _ = object_bbox(im)
        if pid in FILL:
            x0, y0, x1, y1 = bbox
            if pid.startswith("body-"):
                # body strips: drop the painted end edges, so modules from two strips join without a dark seam
                cut = int(round((x1 - x0) * 0.012))
                x0, x1 = x0 + cut, x1 - cut
            crop = im.crop((x0, y0, x1, y1)).resize((tw * 4, th * 4), Image.LANCZOS)
            pad = Image.new("RGB", (crop.width + 32, crop.height + 32), tuple(int(v) for v in np.median(
                np.concatenate([np.asarray(im)[0], np.asarray(im)[-1]]), axis=0)))
            pad.paste(crop, (16, 16))
            out, _ = pixelize(pad, (tw + 8, th + 8), **PART_PARAMS)
            out = out.crop((4, 4, 4 + tw, 4 + th))
        else:
            crop, _ = framed_crop(im, bbox, (tw, th), margin=0.03)
            out, _ = pixelize(crop, (tw, th), **dict(PART_PARAMS, min_island=3))
            return Image.fromarray(anchor_islands(np.asarray(out.convert("RGBA"))), "RGBA")
    return out.convert("RGBA")


def anchor_islands(a, max_share=0.2):
    """No floating parts: every small island (hook, lens cap, rotor blade) either hangs from the main body on a 1-px
    cable drawn straight up to the first opaque pixel above it, or is removed."""
    op = a[..., 3] > 0
    lab_, n = ndimage.label(op, np.ones((3, 3)))
    if n <= 1:
        return a
    sizes = np.bincount(lab_.ravel(), minlength=n + 1)
    sizes[0] = 0
    main = int(sizes.argmax())
    out = a.copy()
    wire = np.array([63, 70, 92, 255], np.uint8)
    for i in range(1, n + 1):
        if i == main:
            continue
        ys, xs = np.nonzero(lab_ == i)
        if sizes[i] > max_share * sizes[main]:
            continue                                   # a big second body (a separate bogie): keep as is
        # hang it from the main body: search straight up from the island's centre column
        cx = int(np.round(xs.mean()))
        top = ys.min()
        col = lab_[:top, cx]
        hit = np.nonzero(col == main)[0]
        if len(hit):
            y0 = hit.max() + 1
            out[y0:top, cx] = wire
            continue
        out[lab_ == i] = 0                             # nothing to hang from: drop it
    return out


def cmd_parts(only=None):
    parts = parts_list()
    PX.mkdir(parents=True, exist_ok=True)
    rows = []
    for pid, (size, _brief) in parts.items():
        if only and pid not in only:
            continue
        cands = sorted((ART / "cand" / "parts" / pid).glob(f"{pid}-*-*.png"), key=lambda c: (
            c.stem[len(pid) + 1:].split("-")[0] != "i", c.stem))
        outs = []
        for c in cands:
            ver, seed = c.stem[len(pid) + 1:].split("-")
            seed = f"{ver}-{seed}"
            dst = PX / pid / f"{seed}.png"
            dst.parent.mkdir(parents=True, exist_ok=True)
            if not dst.exists():
                cut_part(pid, c).save(dst)
            outs.append((seed, Image.open(dst).convert("RGBA")))
        rows.append((pid, size, outs))
        print(pid, len(outs))
    # picking sheet: each candidate at 2x on the dark backdrop with its seed
    k = 2
    cellw = max(max(s[0] for _, s, _o in rows), 120) * k + 20
    rowh = [max(s[1] * k, 40) + 40 for _, s, _o in rows]
    ncol = max(len(o) for _, _s, o in rows) if rows else 4
    W = 220 + ncol * cellw
    sheet = Image.new("RGB", (W, sum(rowh) + 20), (12, 14, 24))
    d = ImageDraw.Draw(sheet)
    y = 10
    for (pid, size, outs), rh in zip(rows, rowh):
        d.text((10, y + 4), f"{pid}\n{size[0]}x{size[1]}", fill=(233, 223, 196))
        for i, (seed, im) in enumerate(outs):
            x = 220 + i * cellw
            bg = Image.new("RGBA", im.size, (40, 44, 70, 255))
            bg.alpha_composite(im)
            sheet.paste(bg.convert("RGB").resize((im.width * k, im.height * k), Image.NEAREST), (x, y + 16))
            d.text((x, y + 2), seed, fill=(144, 150, 168))
        y += rh
    OUT.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT / "parts.png")
    print("sheet", (OUT / "parts.png").relative_to(ROOT))


# ------------------------------------------------------------------------------------------------ assembly helpers
def load_part(pid, picks, size=None):
    if pid == "trolley":
        L = np.asarray(Image.open(KIT / L_TROLLEY["src"]).convert("RGBA"))
        x0, y0, x1, y1 = L_TROLLEY["box"]
        return L[y0:y1, x0:x1].copy()
    if pid not in picks:
        print(f"  (no pick for {pid}: skipped)")
        return np.zeros((1, 1, 4), np.uint8)
    pick = picks[pid]                          # "<version>-<seed>", e.g. "i-1234"
    if size:
        cand = ART / "cand" / "parts" / pid / f"{pid}-{pick}.png"
        return np.asarray(cut_part(pid, cand, size)).copy()
    return np.asarray(Image.open(PX / pid / f"{pick}.png").convert("RGBA")).copy()


def paste(dst, src, x, y, under=False):
    H, W = dst.shape[:2]
    h, w = src.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    s = src[y0 - y:y1 - y, x0 - x:x1 - x]
    d = dst[y0:y1, x0:x1]
    m = s[..., 3:4] > 0
    if under:
        m = m & (d[..., 3:4] == 0)
    dst[y0:y1, x0:x1] = np.where(m, s, d)


def trim(a):
    ys, xs = np.nonzero(a[..., 3] > 0)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def extend_down(a, to_h, rows=4, cols=None, bar=None):
    """Continue the hanger struts downward until the part is to_h tall: the bottom `rows` rows are repeated, only in
    the column ranges `cols` when given (the drive housing between the struts then ends on the `bar` image, a short
    lower yoke), else in every column."""
    h = a.shape[0]
    if to_h <= h:
        return a
    out = np.zeros((to_h, a.shape[1], 4), np.uint8)
    out[:h] = a
    seg = a[h - rows:h].copy()
    if cols:
        keep = np.zeros(a.shape[1], bool)
        for c0, c1 in cols:
            keep[c0:c1] = True
        seg[:, ~keep] = 0
    y0 = h
    if bar is not None:
        bx = (a.shape[1] - bar.shape[1]) // 2
        paste(out, bar, bx, h)
        y0 = h
    for y in range(y0, to_h, rows):
        n = min(rows, to_h - y)
        paste(out, seg[:n], 0, y)
    return out


def warm_blobs(part, n_max=2):
    """Bright warm clusters of a nose part, largest first: [(mask, (cx, cy), radius)] (guide lamp, cab window)."""
    lab = srgb_to_oklab(part[..., :3])
    L, b = lab[..., 0], lab[..., 2]
    warm = (L > 0.66) & (b > 0.05) & (part[..., 3] > 0)
    lab_, n = ndimage.label(ndimage.binary_closing(warm, np.ones((3, 3))))
    if not n:
        return []
    sizes = ndimage.sum(warm, lab_, np.arange(1, n + 1))
    out = []
    for k in np.argsort(-sizes)[:n_max]:
        if sizes[k] < 12:
            break
        m = lab_ == k + 1
        ys, xs = np.nonzero(m)
        out.append((m, (int(xs.mean()), int(ys.mean())), int(max(np.ptp(xs), np.ptp(ys)) / 2 + 2)))
    return out


def lamp_blob(part):
    """The guide lamp: the roundest of the two largest warm clusters (the cab window is wide and flat)."""
    blobs = warm_blobs(part)
    if not blobs:
        return None
    def roundness(bl):
        m = bl[0]
        ys, xs = np.nonzero(m)
        return abs(np.log((np.ptp(xs) + 1) / (np.ptp(ys) + 1)))
    blobs.sort(key=lambda bl: (roundness(bl), -bl[2]))
    return blobs[0]


def unify_palette(img, lamp_mask):
    """Snap to the hull palette (master ramps + 2 steps, lamp colours excluded); lamp pixels -> lampColors."""
    pal = build_palette(2, LAMP_COLORS)
    pal_lab = srgb_to_oklab(pal)
    op = img[..., 3] > 0
    lab = srgb_to_oklab(img[..., :3])
    idx = nearest(lab[op][None], pal_lab)[0]
    out = img.copy()
    out[op, :3] = pal[idx]
    if lamp_mask is not None and lamp_mask.any():
        ramp = np.array([hex_to_rgb(h) for h in LAMP_COLORS], np.uint8)
        Lsrc = lab[..., 0]
        lit = lamp_mask & op & (Lsrc >= 0.62)
        if lit.any():
            qs = np.quantile(Lsrc[lit], [0.85, 0.6, 0.3])
            level = np.where(Lsrc >= qs[0], 0, np.where(Lsrc >= qs[1], 1, np.where(Lsrc >= qs[2], 2, 3)))
            out[lit, :3] = ramp[level[lit]]
    return out


def selective_outline(img):
    op = img[..., 3] > 0
    edge = op & ~ndimage.binary_erosion(op, np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]), border_value=0)
    lab = srgb_to_oklab(img[..., :3])
    dark = lab[edge].copy()
    dark[:, 0] *= 0.45
    dark[:, 1:] *= 0.7
    core = np.array([hex_to_rgb(h) for h in json.loads((ROOT / "public/palette.json").read_text())["all"]
                     if h not in LAMP_COLORS], np.uint8)
    out = img.copy()
    out[edge, :3] = core[nearest(dark[None], srgb_to_oklab(core))[0]]
    return out


# ------------------------------------------------------------------------------------------------ build
def cmd_build(vid):
    lay = json.loads((HULLS / f"{vid}.json").read_text())
    picks = json.loads((HULLS / "picks.json").read_text())
    W, H = lay["canvas"]
    g = lay["grid"]
    gx, gy, cols, rows_, t = g["x"], g["y"], g["cols"], g["rows"], g["tile"]
    gw, gh = cols * t, rows_ * t
    roof_h, keel_h = lay.get("roof_h", 30), lay.get("keel_h", 42)
    top, bottom = gy - roof_h, gy + gh + keel_h
    T = np.zeros((H, W, 4), np.uint8)
    placed = {}
    # rear cap and nose first (the body overlaps their inner edges)
    rear = load_part(lay["rear"], picks, (lay.get("rear_w", 56), bottom - top))
    paste(T, rear, gx - rear.shape[1] + lay.get("rear_overlap", 8), top)
    nose_w = lay.get("nose_w", 140)
    nose = load_part(lay["nose"], picks, (nose_w, bottom - top))
    nx = gx + gw - lay.get("nose_overlap", 8)
    paste(T, nose, nx, top)
    lb = lamp_blob(nose)
    lamp_mask = np.zeros((H, W), bool)
    if lb:
        m, (cx, cy), r = lb
        lamp_mask[top:top + m.shape[0], nx:nx + m.shape[1]] |= m[:H - top, :W - nx]
        placed["lamp"] = (nx + cx, top + cy, r)
    # body modules
    strips = {}
    for c, spec in enumerate(lay["body"]):
        sid, col = spec.split(":")
        if sid not in strips:
            strips[sid] = load_part(sid, picks, (6 * t, bottom - top))
        mod = strips[sid][:, int(col) * t:(int(col) + 1) * t]
        mod = mod.copy()
        mod[..., 3] = 255                     # the body wall is solid
        paste(T, mod, gx + c * t, top)
    # grid rectangle opaque (already covered by the body; keep the guarantee)
    T[gy:gy + gh, gx:gx + gw, 3] = 255
    # trolley at the cable anchor
    cxa, cya = lay["cable"]
    if lay.get("trolley", "trolley") == "trolley":
        tr = load_part("trolley", picks)
        ox, oy = L_TROLLEY["cable"]
        Lr = np.asarray(Image.open(KIT / L_TROLLEY["src"]).convert("RGBA"))
        bx0, by0, bx1, by1 = L_TROLLEY["bar"]
        tr = extend_down(tr, top + 6 - (cya - oy), cols=L_TROLLEY["struts"], bar=Lr[by0:by1, bx0:bx1].copy())
    else:
        tr = trim(load_part(lay["trolley"], picks))
        ox, oy = tr.shape[1] // 2, cya - lay.get("sheave_top", 1)
        tr = extend_down(tr, top + 6 - (cya - oy))
    paste(T, tr, cxa - ox, cya - oy)
    # roof hardpoint plates at the top mounts, then roof fittings
    mounts = []
    plate = trim(load_part("roof-plate", picks))
    for mx in lay["mounts_top"]:
        paste(T, plate, mx - plate.shape[1] // 2, top - plate.shape[0] + 3)
        mounts.append({"x": int(mx), "y": int(top - plate.shape[0] + 3)})
    for f in lay.get("roof", []):
        p = trim(load_part(f["part"], {**picks, f["part"]: f["pick"]} if f.get("pick") else picks))
        if f.get("flip"):
            p = p[:, ::-1]
        paste(T, p, f["x"], top - p.shape[0] + f.get("sink", 3))
        placed[f["part"] + f"@{f['x']}"] = (f["x"], top - p.shape[0] + f.get("sink", 3), p.shape[1], p.shape[0])
    for f in lay.get("front", []):                    # fittings on the nose front, placed from the guide lamp
        p = trim(load_part(f["part"], {**picks, f["part"]: f["pick"]} if f.get("pick") else picks))
        if f.get("anchor") == "lamp" and "lamp" in placed:
            lx_, ly_, lr = placed["lamp"]
            paste(T, p, lx_ + f.get("dx", 0) - p.shape[1] // 2, ly_ + lr + f.get("dy", 0))
        else:
            paste(T, p, f["x"], f["y"])
    # keel: tanks and lugs hanging from the keel strip, belly plates at the belly mounts
    for f in lay.get("keel", []):
        p = trim(load_part(f["part"], {**picks, f["part"]: f["pick"]} if f.get("pick") else picks))
        paste(T, p, f["x"], bottom - f.get("rise", 14), under=True)
    bplate = trim(load_part("belly-plate", picks))
    for mx in lay["mounts_belly"]:
        paste(T, bplate, mx - bplate.shape[1] // 2, bottom - 4)
        mounts.append({"x": int(mx), "y": int(bottom - 4 + bplate.shape[0])})
    keel_lug = trim(load_part("keel-lug", picks))
    kx = lay.get("keel_hang_x", gx + gw // 2)
    paste(T, keel_lug, kx - keel_lug.shape[1] // 2, bottom - 6)
    keel_hang = {"x": int(kx), "y": int(bottom - 6 + keel_lug.shape[0] - 2)}
    T = unify_palette(T, lamp_mask)
    T = selective_outline(T)
    T[gy:gy + gh, gx:gx + gw, 3] = 255
    img = Image.fromarray(T, "RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f"{vid}-assembled.png")
    glow = []
    if "lamp" in placed:
        x, y, r = placed["lamp"]
        glow.append({"x": x, "y": y, "r": max(14, min(30, r))})
    others = [bl for bl in warm_blobs(nose) if lb is None or bl[1] != lb[1]]
    if others:                                          # the cab window glows too
        m, (cx, cy), r = others[0]
        glow.append({"x": int(nx + cx), "y": int(top + cy), "r": int(max(12, min(22, r)))})
    glow += lay.get("glow_extra", [])
    meta = {"w": W, "h": H, "grid": g, "cable": {"x": cxa, "y": cya}, "mounts": mounts,
            "couplerRear": lay["couplerRear"], "keelHang": keel_hang, "glow": glow}
    (OUT / f"{vid}-assembled.json").write_text(json.dumps(meta, indent=1) + "\n")
    # blend-pass init (2x, on the navy backdrop) and mask (repaint the visible frame, keep the grid rectangle)
    init = Image.new("RGBA", (W, H), (12, 15, 28, 255))
    init.alpha_composite(img)
    init.convert("RGB").resize((W * 2, H * 2), Image.NEAREST).save(HULLS / f"{vid}-blend-init.png")
    op = T[..., 3] > 0
    m = ndimage.binary_erosion(op, iterations=2)
    m[gy:gy + gh, gx:gx + gw] = False
    mk = Image.fromarray((m * 255).astype(np.uint8)).resize((W * 2, H * 2), Image.NEAREST)
    from PIL import ImageFilter
    mk.filter(ImageFilter.GaussianBlur(2)).save(HULLS / f"{vid}-blend-mask.png")
    Image.fromarray((op * 255).astype(np.uint8)).save(HULLS / f"{vid}-sil.png")
    print(vid, json.dumps(meta))
    return img, meta


def cmd_finalize(vid, blend=None):
    img = Image.open(OUT / f"{vid}-assembled.png").convert("RGBA")
    meta = json.loads((OUT / f"{vid}-assembled.json").read_text())
    lay = json.loads((HULLS / f"{vid}.json").read_text())
    note = "assembled from the A2 hull kit (tools/art/assemble_hull.py)"
    if blend:
        g = meta["grid"]
        W, H = meta["w"], meta["h"]
        sil = HULLS / f"{vid}-sil.png"
        with Image.open(blend) as bim:
            out, info = pixelize(bim.convert("RGB"), (W, H), down="median", trim=0.0, alpha="sil", sil=str(sil),
                                 protect=[g["x"], g["y"], g["cols"] * g["tile"], g["rows"] * g["tile"]],
                                 edge_band=0, outline="sel", ramp_steps=2, max_colors=64, min_share=0.0008,
                                 orphan_dl=0.16, orphan_passes=2, exclude=LAMP_COLORS)
        out = np.asarray(out.convert("RGBA")).copy()
        # the lamp keeps the assembled livery colours; the grid rectangle keeps the assembled pixels
        a0 = np.asarray(img)
        lampset = {tuple(hex_to_rgb(h)) for h in LAMP_COLORS}
        lampmask = np.array([[tuple(p[:3]) in lampset for p in row] for row in a0])
        out[lampmask] = a0[lampmask]
        gx, gy, gw, gh = g["x"], g["y"], g["cols"] * g["tile"], g["rows"] * g["tile"]
        out[gy:gy + gh, gx:gx + gw] = a0[gy:gy + gh, gx:gx + gw]
        img = Image.fromarray(out, "RGBA")
        note += f"; Krea blend pass {Path(blend).name} re-pixelized onto the assembled silhouette"
    dest = PUB / f"{vid}.png"
    img.save(dest, optimize=True)
    ships = json.loads((PUB / "ships.json").read_text())
    e = ships[vid]
    for k in ("w", "h", "grid", "cable", "mounts", "couplerRear", "keelHang", "glow"):
        e[k] = meta[k]
    e["lampColors"] = LAMP_COLORS
    (PUB / "ships.json").write_text(json.dumps(ships, indent=1) + "\n")
    man_path = ART / "manifest.json"
    man = json.loads(man_path.read_text())
    picks = json.loads((HULLS / "picks.json").read_text())
    rec = man.setdefault("ships", {}).get(vid, {})
    rec.update({"file": f"art/ships/{vid}.png", "date": datetime.date.today().isoformat(),
                "engine": "A2 hull kit: Krea 2 parts (parts/*) assembled by tools/art/assemble_hull.py",
                "layout": f"art-src/hulls/{vid}.json", "parts": {p: picks.get(p) for p in sorted(set(
                    [lay["rear"], lay["nose"], "roof-plate", "belly-plate", "keel-lug"] +
                    [s.split(":")[0] for s in lay["body"]] + [f["part"] for f in lay.get("roof", []) +
                                                               lay.get("front", []) + lay.get("keel", [])]))},
                "trolley": lay.get("trolley", "trolley (cut from the Lamplighter final)"),
                "blend": str(Path(blend).relative_to(ROOT)) if blend else None,
                "note": note, "size": [meta["w"], meta["h"]],
                "sha256": hashlib.sha256(dest.read_bytes()).hexdigest()})
    man["ships"][vid] = rec
    man_path.write_text(json.dumps(man, indent=1, sort_keys=True) + "\n")
    print("final", dest.relative_to(ROOT))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["parts", "build", "finalize"])
    ap.add_argument("vid", nargs="*")
    ap.add_argument("--blend")
    a = ap.parse_args()
    if a.cmd == "parts":
        cmd_parts(a.vid or None)
    elif a.cmd == "build":
        for v in a.vid:
            cmd_build(v)
    else:
        for v in a.vid:
            cmd_finalize(v, a.blend)


if __name__ == "__main__":
    main()
