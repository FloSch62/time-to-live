#!/usr/bin/env python3
"""A2 (revised): the Glasswing and Switchback hulls in the established hull recipe, with keyed Krea fittings.

  python tools/art/hull_v5.py key                 chroma-key every parts/<id>:m candidate -> art-src/cand/parts/_key/
                                                  + tools/shots/art/hulls/keyed.png (300 % over dark and light)
  python tools/art/hull_v5.py compose glasswing   hulls.py init (volume, saddle, no trolley) + the picked keyed
                                                  fittings pasted at their placements -> art-src/init/<id>-init.png,
                                                  -mask.png (body 1.0, fittings 0.45), -sil.png (fittings included)
  python tools/art/hull_v5.py family CAND_GW CAND_SB
                                                  pixelize both candidates once with the ship recipe and write
                                                  tools/shots/art/hulls/family.png (1x and 3x beside the Lamplighter)

Key cut: OKLab distance to the #FF00FF key, the main connected component plus everything touching it, enclosed holes
filled, a 3-px edge despill from the interior colours. Placements (final px) live in PLACE; picks in PICKS.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art-src"
INIT = ART / "init"
KEYED = ART / "cand" / "parts" / "_key"
OUT = ROOT / "tools" / "shots" / "art" / "hulls"
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "art"))
from pixelize import srgb_to_oklab  # noqa: E402

KEY = (255, 0, 255)
FITTINGS = ("prism-housing", "collimators", "survey-horns", "drone-cradle", "retrieval-crane", "saddle-plate",
            "collimator-pair")
# final-px placements: (part, x, y_bottom or ("lamp", dx, dy), height). Anchored bottom-left on the roof unless noted.
# Roof fittings stay under ~58 px: the carrier runs the whole width 72 px above the roof line.
PLACE = {
    "glasswing": [("saddle-plate", "anchor", "roof+0", 16), ("survey-horns", 46, "roof+6", 58),
                  ("survey-horns", 88, "roof+6", 58), ("prism-housing", 598, "roof+6", 58),
                  ("collimator-pair", 520, "flank", 88)],
    "switchback": [("saddle-plate", "anchor", "roof+0", 16), ("retrieval-crane", 100, "roof+6", 60),
                   ("drone-cradle", 290, "roof+6", 58), ("drone-cradle", 356, "roof+6", 58),
                   ("drone-cradle", 422, "roof+6", 58)],
}
PICKS_FILE = ART / "hulls" / "picks-v5.json"
FIT_STRENGTH = 0.45
CABLE_X = {"glasswing": 360, "switchback": 770}          # the trolley pivot (cable anchor) on each sister
TOP_MOUNTS = {"glasswing": [160, 555], "switchback": [70, 1004]}


def key_cut(path, glass_ok=False, drop_blades=False):
    """Chroma-key a fitting rendered on #FF00FF: magenta-hued pixels (any lightness: the key, its shading and the
    pink halo the model paints around edges) are background; enclosed key areas (truss triangles, the inside of a
    cradle) stay transparent; the main component plus anything touching it is kept; a 3-px rim despill."""
    im = np.asarray(Image.open(path).convert("RGB"))
    lab = srgb_to_oklab(im)
    key = srgb_to_oklab(np.array([KEY], np.uint8))[0]
    d = np.sqrt(((lab - key) ** 2).sum(-1))
    C = np.hypot(lab[..., 1], lab[..., 2])
    keyish = (d < 0.25) | ((lab[..., 1] > 0.11) & (lab[..., 2] < -0.02) & (C > 0.13))
    # background = key-hued pixels connected to the border, plus enclosed areas of (near) pure key (the sky seen
    # through a truss); enclosed tinted areas are glass the model painted pink next to the key: keep them, as violet
    reach, _ = ndimage.label(keyish)
    border_ids = np.unique(np.concatenate([reach[0], reach[-1], reach[:, 0], reach[:, -1]]))
    outside = np.isin(reach, border_ids[border_ids > 0])
    pure = d < 0.14
    comp, nc = ndimage.label(keyish & ~outside)
    if nc:
        pure_share = ndimage.mean(pure, comp, np.arange(1, nc + 1))
        enclosed_bg = np.isin(comp, np.nonzero(pure_share > 0.5)[0] + 1)
    else:
        enclosed_bg = np.zeros_like(keyish)
    glass = keyish & ~outside & ~enclosed_bg
    if not glass_ok:                           # only the prism housing has glass the model tints next to the key
        enclosed_bg |= glass
        glass &= False
    keyish = outside | enclosed_bg
    if glass.any():
        g = lab[glass]
        g[:, 1] = g[:, 1] * 0.3
        g[:, 2] = np.minimum(g[:, 2], -0.1)
        from pixelize import oklab_to_srgb
        im = im.copy()
        im[glass] = oklab_to_srgb(g)
    fg = ndimage.binary_opening(~keyish, np.ones((3, 3)))
    lab_, n = ndimage.label(fg, np.ones((3, 3)))
    if not n:
        return None
    sizes = np.bincount(lab_.ravel())
    sizes[0] = 0
    main = lab_ == sizes.argmax()
    near = ndimage.binary_dilation(main, iterations=4)
    keep_ids = np.unique(lab_[near & fg])
    keep = np.isin(lab_, keep_ids[keep_ids > 0])
    keep &= sizes[lab_] >= 30                                   # specks
    # despill: rim pixels with a pink cast take the nearest interior colour
    inner = ndimage.binary_erosion(keep, iterations=3)
    rim = keep & ~inner
    out = im.copy()
    if inner.any():
        _, (iy, ix) = ndimage.distance_transform_edt(~inner, return_indices=True)
        spill = rim & (lab[..., 1] > 0.05) & (lab[..., 2] < -0.01)
        out[spill] = im[iy[spill], ix[spill]]
    a = np.dstack([out, (keep * 255).astype(np.uint8)])
    ys, xs = np.nonzero(keep)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    if drop_blades:
        # rotor blades: thin wide rows at the top read as floating dashes at 1x; cut them down to the hub
        op = a[..., 3] > 0
        w = op.shape[1]
        for y in range(int(op.shape[0] * 0.2)):
            if op[y].sum() > 0.45 * w:
                cols = np.nonzero(op[y])[0]
                cx = (cols.min() + cols.max()) // 2
                a[y, :max(0, cx - w // 12)] = 0
                a[y, cx + w // 12:] = 0
        op = a[..., 3] > 0
        ys, xs = np.nonzero(op)
        a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return Image.fromarray(a, "RGBA")


def cmd_key():
    KEYED.mkdir(parents=True, exist_ok=True)
    rows = []
    for pid in FITTINGS:
        cands = sorted((ART / "cand" / "parts" / pid).glob(f"{pid}-m-*.png"))
        outs = []
        for c in cands:
            cut = key_cut(c, glass_ok=(pid == "prism-housing"), drop_blades=(pid == "drone-cradle"))
            if cut is None:
                continue
            cut.save(KEYED / f"{c.stem}.png")
            outs.append((c.stem.rsplit("-", 1)[1], cut))
        rows.append((pid, outs))
    # review sheet: each cut at 300 % of its final size over dark and over light
    import subjects
    import hullparts
    tiles = []
    for pid, outs in rows:
        size = (hullparts.FITTING_BRIEFS.get(pid) or subjects.PARTS[pid])[0]
        for seed, cut in outs:
            k = size[1] / cut.height
            small = cut.resize((max(1, round(cut.width * k)), size[1]), Image.LANCZOS)
            big = small.resize((small.width * 3, small.height * 3), Image.NEAREST)
            pair = Image.new("RGB", (big.width * 2 + 10, big.height), (0, 0, 0))
            for i, bg in enumerate(((22, 26, 44), (214, 206, 186))):
                b = Image.new("RGBA", big.size, bg + (255,))
                b.alpha_composite(big)
                pair.paste(b.convert("RGB"), (i * (big.width + 10), 0))
            tiles.append((f"{pid} m-{seed}", pair))
    W = max(t.width for _, t in tiles) + 20
    H = sum(t.height + 24 for _, t in tiles) + 10
    sh = Image.new("RGB", (W, H), (12, 14, 24))
    dr = ImageDraw.Draw(sh)
    y = 6
    for name, t in tiles:
        dr.text((10, y), name, fill=(233, 223, 196))
        sh.paste(t, (10, y + 16))
        y += t.height + 24
    OUT.mkdir(parents=True, exist_ok=True)
    sh.save(OUT / "keyed.png")
    print("sheet", OUT / "keyed.png")


def cmd_compose(vid):
    import hulls
    meta = hulls.render(vid)
    picks = json.loads(PICKS_FILE.read_text())
    init = Image.open(INIT / f"{vid}-init.png").convert("RGBA")
    mask = np.asarray(Image.open(INIT / f"{vid}-mask.png").convert("L")).astype(np.float64)
    sil = np.asarray(Image.open(INIT / f"{vid}-sil.png").convert("L")) > 127
    k = init.width / meta["canvas"][0]                       # init px per final px (2)
    roof = meta["cable"]["y"] + 72                           # the roof line (trolley.py: 72 px under the carrier)
    glow = meta["glow"]
    placed = []
    for pid, x, y, h in PLACE[vid]:
        cut = Image.open(KEYED / f"{pid}-m-{picks[pid]}.png")
        if pid == "saddle-plate":                                  # trolley.py SADDLE (wide v3 saddles)
            import trolley
            w = trolley.SADDLE["heavy" if vid == "switchback" else "standard"][0]
        else:
            w = round(cut.width * h / cut.height)
        if y == "flank":                                     # bolted to the forward flank above the lamp
            x0, y0 = x, meta["grid"]["y"] + 84
        elif y == "lamp":                                    # hung on the nose front under the guide lamp
            lx, ly, lr = glow[0]["x"], glow[0]["y"], glow[0]["r"]
            op = sil
            yy = int(ly + lr + 8)
            edge = int(np.nonzero(op[yy])[0].max())
            x0, y0 = edge - 30, yy                          # the bracket overlaps the nose plating
        else:
            sink = int(y.split("+")[1])
            x0, y0 = x, roof - h + sink
            if x == "anchor":
                x0 = meta["cable"]["x"] - w // 2
        part = cut.resize((round(w * k), round(h * k)), Image.LANCZOS)
        init.alpha_composite(part, (round(x0 * k), round(y0 * k)))
        a = np.asarray(part)[..., 3] > 127
        a_big = np.zeros(mask.shape, bool)
        ys, xs = round(y0 * k), round(x0 * k)
        hh, ww = a.shape
        a_big[ys:ys + hh, xs:xs + ww] = a[:max(0, min(hh, mask.shape[0] - ys)), :max(0, min(ww, mask.shape[1] - xs))]
        grown = ndimage.binary_dilation(a_big, iterations=6)
        mask = np.where(grown, FIT_STRENGTH * 255, mask)
        fin = np.asarray(part.resize((w, h), Image.BOX))[..., 3] > 127
        sil[y0:y0 + h, x0:x0 + w] |= fin[:max(0, min(h, sil.shape[0] - y0)), :max(0, min(w, sil.shape[1] - x0))]
        placed.append({"part": pid, "pick": picks[pid], "x": int(x0), "y": int(y0), "w": int(w), "h": int(h)})
    init.convert("RGB").save(INIT / f"{vid}-init.png")
    Image.fromarray(np.clip(mask, 0, 255).astype(np.uint8)).save(INIT / f"{vid}-mask.png")
    Image.fromarray((sil * 255).astype(np.uint8)).save(INIT / f"{vid}-sil.png")
    meta = json.loads((INIT / f"{vid}.json").read_text())
    meta["fittings"] = placed
    meta["saddle"] = {"x": meta["cable"]["x"], "y": roof}
    meta["trolley"] = {"kind": "heavy" if vid == "switchback" else "standard",
                       "pivot": {"x": meta["cable"]["x"], "y": roof}, "saddle": meta["cable"]}
    (INIT / f"{vid}.json").write_text(json.dumps(meta, indent=1) + "\n")
    print(vid, json.dumps(placed))


def with_trolley(hull, cable, kind):
    """Hull + its drive trolley on a carrier, in the game's order (hull, BACK, carrier, FRONT), frame 0."""
    import trolley as T
    ships = json.loads((ROOT / "public/art/ships/ships.json").read_text())
    tm = ships[f"trolley-{kind}"]
    back = np.asarray(Image.open(ROOT / f"public/art/ships/trolley-{kind}-back.png").convert("RGBA"))[:, :tm["w"]]
    front = np.asarray(Image.open(ROOT / f"public/art/ships/trolley-{kind}-front.png").convert("RGBA"))[:, :tm["w"]]
    top = tm["saddle"]["y"] - cable["y"]                      # extra room above the hull for the carriage
    H = hull.height + max(0, top)
    pad = np.zeros((H, hull.width, 4), np.uint8)
    pad[max(0, top):] = np.asarray(hull)
    return T.in_hull(pad, (cable["x"], cable["y"] + max(0, top)), back, front,
                     {"origin": [tm["saddle"]["x"], tm["saddle"]["y"]]})


def pixel_hull(vid, cand):
    """The ship recipe, with a 3-px edge band: the family silhouette is exact (init alpha + keyed fittings), so the
    wide backdrop band of the Krea-silhouette recipe would only eat thin dark fittings (crane jib, cradle arms)."""
    from pixelize import pixelize
    import recipes
    meta = json.loads((INIT / f"{vid}.json").read_text())
    params = recipes.params_for({"group": "ships", "id": vid})
    params.update(edge_band=3)
    with Image.open(cand) as im:
        return pixelize(im.convert("RGB"), tuple(meta["canvas"]), **params)


def cmd_family(cands):
    from pixelize import pixelize
    import recipes
    ships = json.loads((ROOT / "public/art/ships/ships.json").read_text())
    L = Image.open(ROOT / "public/art/ships/lamplighter.png").convert("RGBA")
    ims = [("lamplighter", with_trolley(L, ships["lamplighter"]["cable"], "standard"))]
    for c in cands:
        vid = "glasswing" if "glasswing" in Path(c).stem else "switchback"
        meta = json.loads((INIT / f"{vid}.json").read_text())
        out, info = pixel_hull(vid, c)
        out = Image.fromarray(polish(np.asarray(out.convert("RGBA")))[0], "RGBA")
        out.save(OUT / f"{vid}-v5-pixel.png")
        ims.append((f"{vid} {Path(c).stem}", with_trolley(out.convert("RGBA"), meta["cable"],
                                                             meta["trolley"]["kind"])))
    W = max(im.width for _, im in ims) * 3 + 40
    H = sum(im.height * 4 + 80 for _, im in ims) + 20
    sh = Image.new("RGB", (W, H), (12, 14, 24))
    dr = ImageDraw.Draw(sh)
    y = 10
    # 1x: the three side by side at the top (as in game, same scale); then each at 3x
    x = 20
    dr.text((20, y), "1x (1 image px = 1 backing px at 1080p)", fill=(233, 223, 196))
    for name, im in ims:
        bg = Image.new("RGBA", im.size, (26, 32, 52, 255))
        bg.alpha_composite(im.convert("RGBA"))
        sh.paste(bg.convert("RGB"), (x, y + 18))
        x += im.width + 20
    y += max(im.height for _, im in ims) + 50
    for name, im in ims:
        bg = Image.new("RGBA", im.size, (26, 32, 52, 255))
        bg.alpha_composite(im.convert("RGBA"))
        dr.text((20, y), name + "  (3x nearest)", fill=(233, 223, 196))
        sh.paste(bg.convert("RGB").resize((im.width * 3, im.height * 3), Image.NEAREST), (20, y + 18))
        y += im.height * 3 + 40
    sh = sh.crop((0, 0, max(W, x), y))
    sh.save(OUT / "family.png")
    print("sheet", OUT / "family.png")


def polish(a):
    """No floating parts at 1x: islands < 20 px are dropped; a small part hanging below something (a crane hook) gets
    a 1-px dark wire up to it; a larger part sitting just above something (a drone parked in its cradle) gets a
    short dark clamp post down to it (<= 12 px). Returns the fixed RGBA array and a list of the fixes."""
    a = a.copy()
    fixes = []
    for _ in range(3):
        op = a[..., 3] > 0
        lab, n = ndimage.label(op, np.ones((3, 3)))
        if n <= 1:
            break
        sizes = np.bincount(lab.ravel())
        sizes[0] = 0
        main = int(sizes.argmax())
        changed = False
        for i, sl in enumerate(ndimage.find_objects(lab), start=1):
            if i == main or sl is None:
                continue
            m = lab == i
            ys, xs = np.nonzero(m)
            if sizes[i] < 20:
                a[m] = 0
                fixes.append(("drop", int(xs.mean()), int(ys.mean()), int(sizes[i])))
                changed = True
                continue
            cx = int(np.round(np.median(xs)))
            top, bot = ys.min(), ys.max()
            above = np.nonzero(lab[:top, cx] == main)[0]
            below = np.nonzero(lab[bot + 1:, cx] == main)[0]
            if sizes[i] < 200 and len(above) and top - above.max() <= 40:
                y0 = above.max() + 1
                a[y0:top, cx, :3] = (40, 53, 86)
                a[y0:top, cx, 3] = 255
                fixes.append(("wire", cx, int(y0), int(top - y0)))
                changed = True
            elif len(below) and below.min() <= 12:
                y1 = bot + 1 + below.min()
                for x in (cx - 2, cx - 1, cx, cx + 1, cx + 2):
                    a[bot + 1:y1, x, :3] = (58, 74, 112) if x in (cx - 1, cx, cx + 1) else (19, 26, 43)
                    a[bot + 1:y1, x, 3] = 255
                fixes.append(("post", cx, int(bot + 1), int(y1 - bot - 1)))
                changed = True
        if not changed:
            break
    return a, fixes


def cmd_finalize(vid, cand):
    """Pixelize the picked candidate once (ship recipe, 3-px edge band), write public/art/ships/<vid>.png, the
    ships.json geometry (grid unchanged; cable, mounts, couplerRear, keelHang, glow, lampColors, trolley) and the
    manifest record."""
    import datetime
    import hashlib
    out, info = pixel_hull(vid, cand)
    fixed, fixes = polish(np.asarray(out.convert("RGBA")))
    out = Image.fromarray(fixed, "RGBA")
    print("polish", fixes)
    meta = json.loads((INIT / f"{vid}.json").read_text())
    pub = ROOT / "public" / "art" / "ships"
    out.save(pub / f"{vid}.png", optimize=True)
    ships = json.loads((pub / "ships.json").read_text())
    e = ships[vid]
    W, H = meta["canvas"]
    e.update(w=W, h=H, cable=meta["cable"], mounts=meta["mounts"], couplerRear=meta["couplerRear"],
             keelHang=meta["keelHang"], glow=meta["glow"], lampColors=meta["lampColors"],
             trolley={"kind": meta["trolley"]["kind"], "pivot": meta["trolley"]["pivot"],
                      "saddle": meta["trolley"]["saddle"]})
    assert e["grid"] == meta["grid"], (e["grid"], meta["grid"])
    (pub / "ships.json").write_text(json.dumps(ships, indent=1) + "\n")
    rec_c = json.loads(Path(cand).with_suffix(".json").read_text())
    man_path = ART / "manifest.json"
    man = json.loads(man_path.read_text())
    man.setdefault("ships", {})[vid] = {
        "file": f"art/ships/{vid}.png", "size": [W, H], "date": datetime.date.today().isoformat(),
        "engine": "local-krea-2-turbo (ComfyUI)", "source": str(Path(cand).resolve().relative_to(ROOT)),
        "generation": {k: rec_c.get(k) for k in ("version", "prompt", "seed", "width", "height", "denoise", "steps",
                                                   "cfg", "sampler", "scheduler", "models", "comfyui_revision",
                                                   "init_snapshot", "mask_snapshot")},
        "init": "tools/art/hull_v5.py family-init: the Lamplighter final (baked trolley erased) resampled onto the "
                "sister's grid, nose change, keyed Krea fittings (art-src/hulls/picks-v5.json) on their plates",
        "fittings": meta.get("fittings"), "pixelize": info["params"], "colors_used": info["colors_used"],
        "sha256": hashlib.sha256((pub / f"{vid}.png").read_bytes()).hexdigest(),
        "polish": fixes,
        "note": "A2 (revised): lamplighter-pattern sister; the drive trolley is the separate trolley-" +
                meta["trolley"]["kind"] + " art (tools/art/trolley.py)"}
    man_path.write_text(json.dumps(man, indent=1, sort_keys=True) + "\n")
    print("final", vid, W, H, info["colors_used"])


# ------------------------------------------------------------------------------------------------ family init
def _remap(src, xs_src, xs_dst, ys_src, ys_dst, W, H):
    """Piecewise-linear resample of src (RGBA array) so that the source breakpoints xs_src/ys_src land on
    xs_dst/ys_dst (each list increasing); nearest sampling (the result is an init, Krea repaints it)."""
    tx = np.interp(np.arange(W) + 0.5, xs_dst, xs_src)
    ty = np.interp(np.arange(H) + 0.5, ys_dst, ys_src)
    ix = np.clip(tx.astype(int), 0, src.shape[1] - 1)
    iy = np.clip(ty.astype(int), 0, src.shape[0] - 1)
    out = src[iy][:, ix].copy()
    outside_x = (np.arange(W) + 0.5 < xs_dst[0]) | (np.arange(W) + 0.5 > xs_dst[-1])
    outside_y = (np.arange(H) + 0.5 < ys_dst[0]) | (np.arange(H) + 0.5 > ys_dst[-1])
    out[:, outside_x] = 0
    out[outside_y] = 0
    return out


def redesign_side(vid, body, g, roof_t):
    """Give the sister its own side: the Lamplighter's side features (portholes, pipes, door, hatch, rib rhythm)
    are replaced by clean cylinder-shaded ivory, then the sister's own rib rhythm, straps, ports and job features
    are blocked in (Krea paints them in the Lamplighter's materials)."""
    a = body.copy()
    gx, gy, gw, gh = g["x"], g["y"], g["cols"] * 72, g["rows"] * 72
    x0, x1 = gx + 2, gx + gw - 4
    y0, y1 = roof_t + 4, gy + gh + 2
    # per-row median of ivory pixels = the car's cylinder shading
    lab = srgb_to_oklab(a[..., :3])
    C = np.hypot(lab[..., 1], lab[..., 2])
    ivory = (lab[..., 0] > 0.72) & (C < 0.06)
    shade = np.zeros((a.shape[0], 3), np.uint8)
    last = np.array([214, 204, 176], np.uint8)
    for y in range(y0, y1):
        m = ivory[y, x0:x1]
        if m.sum() > 20:
            last = np.median(a[y, x0:x1][m][:, :3], axis=0).astype(np.uint8)
        shade[y] = last
    a[y0:y1, x0:x1, :3] = shade[y0:y1, None, :]
    img = Image.fromarray(a, "RGBA")
    d = ImageDraw.Draw(img)
    B, BD, BH_ = (176, 122, 50, 255), (127, 84, 36, 255), (217, 162, 74, 255)
    rib_step = 90 if vid == "glasswing" else 104
    for x in range(x0 + rib_step // 2, x1 - 10, rib_step):          # vertical ribs, the sister's own rhythm
        d.rectangle((x - 4, y0, x + 4, y1), fill=B)
        d.rectangle((x - 4, y0, x - 3, y1), fill=BH_)
        d.rectangle((x + 3, y0, x + 4, y1), fill=BD)
    straps = [gy + 72 * 2 - 3] if vid == "glasswing" else [gy + 72 - 3, gy + 72 * 3 - 3]
    for sy in straps:                                              # horizontal straps
        d.rectangle((x0, sy, x1, sy + 6), fill=B)
        d.rectangle((x0, sy, x1, sy + 1), fill=BH_)
    if vid == "glasswing":
        # a row of small inspection ports along the upper deck, and a long verdigris conduit under them
        for k, px_ in enumerate(range(x0 + 30, x1 - 20, 45)):
            if k % 2 == 1 and abs(px_ - (x0 + rib_step // 2 + rib_step * (k // 2))) < 8:
                continue
            cy = gy + 30
            d.ellipse((px_ - 9, cy - 9, px_ + 9, cy + 9), fill=B)
            d.ellipse((px_ - 6, cy - 6, px_ + 6, cy + 6), fill=(40, 53, 86, 255))
            d.ellipse((px_ - 4, cy - 4, px_ - 1, cy - 1), fill=(127, 247, 230, 255))
        d.rectangle((x0 + 10, gy + 58, x1 - 30, gy + 62), fill=(63, 138, 116, 255))
        # the paired external collimators: two long brass lens barrels on brackets along the forward flank,
        # running past the nose, teal lens above amber, lens caps on chains
        for k, (cy, lens) in enumerate(((gy + 84, (63, 211, 201, 255)), (gy + 114, (255, 179, 71, 255)))):
            bx0, bx1 = x1 - 200, x1 + 40
            d.rectangle((bx0, cy - 11, bx1, cy + 11), fill=(7, 8, 15, 255))
            d.rectangle((bx0 + 2, cy - 9, bx1 - 2, cy + 9), fill=B)
            d.rectangle((bx0 + 2, cy - 9, bx1 - 2, cy - 5), fill=BH_)
            d.rectangle((bx0 + 2, cy + 5, bx1 - 2, cy + 9), fill=BD)
            for rx in (bx0 + 16, bx0 + 96, bx1 - 26):                 # rings
                d.rectangle((rx, cy - 12, rx + 6, cy + 12), fill=(242, 196, 107, 255))
            d.ellipse((bx1 - 7, cy - 13, bx1 + 7, cy + 13), fill=(7, 8, 15, 255))
            d.ellipse((bx1 - 5, cy - 10, bx1 + 5, cy + 10), fill=lens)
            if k == 1:
                for bx in (bx0 + 36, bx0 + 140):                       # brackets bolted to the side
                    d.rectangle((bx - 8, cy - 40, bx + 8, cy + 18), fill=BD)
                    d.rectangle((bx - 12, cy + 14, bx + 12, cy + 20), fill=B)
            for j in range(3):                                          # lens cap hanging on a chain
                d.rectangle((bx1 - 16, cy + 12 + j * 4, bx1 - 14, cy + 14 + j * 4), fill=BH_)
            d.ellipse((bx1 - 22, cy + 24, bx1 - 8, cy + 32), fill=(74, 80, 104, 255))
    else:
        # the lowest deck is a row of roll-up retrieval shutters in dark gunmetal, framed in brass
        sy0, sy1 = gy + 72 * 4 + 6, gy + gh - 4
        n = 8
        w = (x1 - x0 - 20) / n
        for k in range(n):
            bx0 = int(x0 + 10 + k * w) + 3
            bx1 = int(x0 + 10 + (k + 1) * w) - 3
            d.rectangle((bx0 - 3, sy0 - 3, bx1 + 3, sy1 + 3), fill=BD)
            d.rectangle((bx0, sy0, bx1, sy1), fill=(28, 38, 64, 255))
            for yy in range(sy0 + 4, sy1 - 2, 6):
                d.rectangle((bx0 + 2, yy, bx1 - 2, yy + 2), fill=(58, 74, 112, 255))
            d.rectangle((bx0 + (bx1 - bx0) // 2 - 4, sy1 - 8, bx0 + (bx1 - bx0) // 2 + 4, sy1 - 4), fill=BH_)
        # portholes in pairs on the second deck
        for px_ in range(x0 + 60, x1 - 60, 208):
            for dx in (0, 34):
                cx, cy = px_ + dx, gy + 72 + 36
                d.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), fill=B)
                d.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), fill=(255, 179, 71, 255))
    out = np.asarray(img).copy()
    out[..., 3] = a[..., 3]
    return out


def cmd_family_init(vid):
    """The sister's init is the Lamplighter's own painted body (baked trolley erased), resampled piecewise onto the
    sister's grid (rear cap, grid, nose keep their proportions), with the job's nose change and the keyed fittings
    pasted on; Krea repaints it at a moderate denoise (the family look, volume and detail come from the Lamplighter)."""
    import hulls
    import trolley
    meta = hulls.render(vid)                               # canvas + grid (its colour-block init is replaced)
    meta["cable"] = {"x": CABLE_X[vid], "y": meta["cable"]["y"]}
    W, H = meta["canvas"]
    g = meta["grid"]
    L = trolley.erase_baked(Image.open(ART / "kit" / "lamplighter-ref.png"))
    LG = dict(x=48, y=120, w=864, h=288)
    roof_t = meta["cable"]["y"] + 72
    gx, gy, gw, gh = g["x"], g["y"], g["cols"] * 72, g["rows"] * 72
    xs_src = [0, LG["x"], LG["x"] + LG["w"], 1008]
    xs_dst = [0, gx, gx + gw, gx + gw + (1008 - LG["x"] - LG["w"])]
    ys_src = [92, LG["y"], LG["y"] + LG["h"], 440]
    ys_dst = [roof_t, gy, gy + gh, gy + gh + (440 - LG["y"] - LG["h"])]
    body = _remap(L, xs_src, xs_dst, ys_src, ys_dst, W, H)

    def fx(x):
        return int(round(np.interp(x, xs_src, xs_dst)))

    def fy(y):
        return int(round(np.interp(y, ys_src, ys_dst, left=ys_dst[0] - (ys_src[0] - y))))
    Lm = json.loads((ART / "kit" / "lamplighter-ref.json").read_text()) if (ART / "kit" / "lamplighter-ref.json").exists() \
        else {"glow": [[970, 284, 26], [940, 164, 20], [44, 128, 6]], "belly": [[182, 438], [786, 438]],
              "keelHang": [464, 438], "couplerRear": [4, 300]}
    glow = [{"x": fx(x), "y": fy(y), "r": r} for x, y, r in Lm["glow"]]
    lamp = glow[0]
    lx, ly, lr = lamp["x"], lamp["y"], lamp["r"]
    body = redesign_side(vid, body, g, roof_t)
    img = Image.new("RGBA", (W, H), (12, 15, 28, 255))
    img.alpha_composite(Image.fromarray(body, "RGBA"))
    # roof hardpoint pedestals (the Lamplighter's own, x 136-188 above its roof) at the sister's top mounts
    ped = Image.fromarray(np.asarray(Image.open(ART / "kit" / "lamplighter-ref.png").convert("RGBA"))[72:92, 136:188])
    for mx in TOP_MOUNTS[vid]:
        img.alpha_composite(ped, (mx - 26, roof_t - 20))
        body[roof_t - 20:roof_t, mx - 26:mx + 26, 3] |= np.asarray(ped)[..., 3]
    d = ImageDraw.Draw(img)
    if vid == "glasswing":                                 # optical nose: violet lens ring round the guide lamp
        d.ellipse((lx - lr - 7, ly - lr - 7, lx + lr + 7, ly + lr + 7), outline=(125, 91, 201, 255), width=7)
    else:                                                  # heavy nose: louvred retrieval shutters under the lamp
        sx0, sy0 = lx - 44, ly + lr + 16
        d.rectangle((sx0 - 3, sy0 - 3, sx0 + 64, sy0 + 104), fill=(176, 122, 50, 255))
        d.rectangle((sx0, sy0, sx0 + 61, sy0 + 101), fill=(28, 38, 64, 255))
        for k in range(12):
            y = sy0 + 4 + k * 8
            d.rectangle((sx0 + 3, y, sx0 + 58, y + 3), fill=(74, 80, 104, 255))
    base = np.asarray(img.convert("RGB")).copy()
    sil = (body[..., 3] > 0)
    big = Image.fromarray(base).resize((W * 2, H * 2), Image.NEAREST).convert("RGBA")
    mask = np.zeros((H * 2, W * 2), np.float64)
    silbig = np.asarray(Image.fromarray((sil * 255).astype(np.uint8)).resize((W * 2, H * 2), Image.NEAREST)) > 127
    mask[ndimage.binary_dilation(silbig, iterations=10)] = 0.8 * 255
    picks = json.loads(PICKS_FILE.read_text())
    placed = []
    for pid, x, y, h in PLACE[vid]:
        cut = Image.open(KEYED / f"{pid}-m-{picks[pid]}.png")
        if pid == "saddle-plate":
            w = trolley.SADDLE["heavy" if vid == "switchback" else "standard"][0]
        else:
            w = round(cut.width * h / cut.height)
        if y == "lamp":
            yy = int(ly + lr + 4)
            edge = int(np.nonzero(sil[yy])[0].max())
            x0, y0 = edge - 30, yy
        elif y == "flank":                                 # bolted to the forward flank, barrels past the nose
            x0, y0 = x, g["y"] + 72 * 2 + 8
        else:
            sink = int(y.split("+")[1])
            x0, y0 = x, roof_t - h + sink
            if x == "anchor":
                x0 = meta["cable"]["x"] - w // 2
        part = cut.resize((w * 2, h * 2), Image.LANCZOS)
        big.alpha_composite(part, (x0 * 2, y0 * 2))
        a = np.asarray(part)[..., 3] > 127
        m = np.zeros(mask.shape, bool)
        m[y0 * 2:y0 * 2 + a.shape[0], x0 * 2:x0 * 2 + a.shape[1]] = a[:max(0, mask.shape[0] - y0 * 2),
                                                                         :max(0, mask.shape[1] - x0 * 2)]
        mask[ndimage.binary_dilation(m, iterations=4)] = FIT_STRENGTH * 255
        fin = np.asarray(cut.resize((w, h), Image.BOX))[..., 3] > 127
        sil[y0:y0 + h, x0:x0 + w] |= fin[:max(0, H - y0), :max(0, W - x0)]
        placed.append({"part": pid, "pick": picks[pid], "x": int(x0), "y": int(y0), "w": int(w), "h": int(h)})
    # the livery lamp mask follows the Lamplighter's own lamp through the same resample
    lm = np.asarray(Image.open(INIT / "lamplighter-lamps.png").convert("L"))
    lm4 = np.dstack([lm, lm, lm, lm])
    lmap = _remap(lm4, xs_src, xs_dst, ys_src, ys_dst, W, H)[..., 0]
    Image.fromarray(((lmap > 127) * 255).astype(np.uint8)).save(INIT / f"{vid}-lamps.png")
    from PIL import ImageFilter
    big.convert("RGB").save(INIT / f"{vid}-init.png")
    Image.fromarray(mask.astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)).save(INIT / f"{vid}-mask.png")
    Image.fromarray((sil * 255).astype(np.uint8)).save(INIT / f"{vid}-sil.png")
    jm = json.loads((INIT / f"{vid}.json").read_text())
    jm.update(cable=meta["cable"], glow=glow,
              mounts=[{"x": mx, "y": roof_t - 20} for mx in TOP_MOUNTS[vid]] +
                     [{"x": fx(x), "y": fy(y)} for x, y in Lm["belly"]],
              keelHang={"x": fx(Lm["keelHang"][0]), "y": fy(Lm["keelHang"][1])},
              couplerRear={"x": Lm["couplerRear"][0], "y": fy(Lm["couplerRear"][1])},
              lampColors=["#fff1c2", "#ffd98a", "#ffb347", "#e8822a"])
    jm.update(fittings=placed, init="family (lamplighter-ref resampled)", saddle={"x": meta["cable"]["x"], "y": roof_t},
              trolley={"kind": "heavy" if vid == "switchback" else "standard",
                       "pivot": {"x": meta["cable"]["x"], "y": roof_t}, "saddle": meta["cable"]})
    (INIT / f"{vid}.json").write_text(json.dumps(jm, indent=1) + "\n")
    print(vid, "family init", W, H)


if __name__ == "__main__":
    sys.path.insert(0, str(ART))
    cmd = sys.argv[1]
    if cmd == "key":
        cmd_key()
    elif cmd == "compose":
        for v in sys.argv[2:]:
            cmd_compose(v)
    elif cmd == "family":
        cmd_family(sys.argv[2:])
    elif cmd == "finalize":
        cmd_finalize(sys.argv[2], sys.argv[3])
    elif cmd == "family-init":
        for v in sys.argv[2:]:
            cmd_family_init(v)
