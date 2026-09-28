#!/usr/bin/env python3
"""A2: weapon mounts that fit the new hulls and the new drive trolley (lead's review, 27 Sep).

  python tools/art/mounts_v5.py lamplighter glasswing switchback     (after the hull finals are written)

Every roof and belly mount sits on a painted hardpoint plate, clear of the trolley and its saddle, the roof fittings
(crane, cradles, prism housing, horns, collimators) and the nose lamp and cab window. Roof mounts are low enough that
the tallest weapon sprite (63 image px above its pivot, cathedral-chime / flood-cannon) keeps >= 7 px of air under
the carrier (carrier half-thickness 6); belly mounts sit at the keel's lowest edge. Writes ships.json `mounts`
(image px, density 2) and `keepClear` (boxes, image px, each with a `what`) for C's clearance check, and records
the edits in art-src/manifest.json. Deterministic; runs on the current finals (re-run after a re-finalize).

Weapon extents around the pivot (all weapons.json sprites): up 63, left 65, right 101 (facing right); belly guns are
mirrored vertically (down 63).
"""
import datetime
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "public" / "art" / "ships"
ART = ROOT / "art-src"
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "art"))
from pixelize import build_palette, nearest, srgb_to_oklab  # noqa: E402

UP, LEFT, RIGHT = 63, 65, 102   # trunk-lance: pivot 42 to opaque column 143 (C, mount-qa)
PAL = {"k": (7, 8, 15), "k2": (19, 26, 43), "b0": (85, 54, 25), "b1": (127, 84, 36), "b2": (176, 122, 50),
       "b3": (217, 162, 74), "b4": (242, 196, 107), "b5": (255, 227, 154), "s1": (74, 80, 104)}

# per hull: roof and belly mounts (image px; the pivot of the weapon), regions to clear above the roof, extra fixes
PLAN = {
    # belly mounts stay outside a coupled keel car's footprint (keelHang.x +- 240) with the whole weapon envelope
    "lamplighter": {"roof": [(162, 100), (782, 100)], "belly": [(116, 407), (786, 437)],
                    "erase_above": [(130, 0, 196, 92), (750, 0, 814, 92)], "roof_y": 92},
    "glasswing": {"roof": [(106, 140), (760, 138)], "belly": [(44, 444), (720, 459)],
                  "erase_above": [(38, 0, 132, 120), (128, 0, 210, 118)], "roof_y": 120,
                  "horns": (0, 142, 62), "wedge": (8, 340, 66, 458), "collimators": (774, 350, 54),
                  "repaint": (768, 244, 812, 316)},
    "switchback": {"roof": [(1050, 170)], "belly": [(190, 583), (850, 583)], "erase_above": [], "roof_y": 146},
}


def lum(rgb):
    return srgb_to_oklab(np.asarray(rgb, np.uint8).reshape(-1, 3))[:, 0].reshape(np.asarray(rgb).shape[:-1])


def plate(a, cx, y, belly=False, w=40):
    """A flat riveted brass hardpoint ring (w x 6) centred at cx; its top edge at y - 3 (roof) / y - 3 (belly)."""
    H, W = a.shape[:2]
    x0, y0 = cx - w // 2, y - 3
    rows = ["k", "b4", "b3", "b2", "b1", "k"] if not belly else ["k", "b2", "b2", "b1", "b0", "k"]
    for i, r in enumerate(rows):
        yy = y0 + i
        if 0 <= yy < H:
            a[yy, max(0, x0):min(W, x0 + w), :3] = PAL[r]
            a[yy, max(0, x0):min(W, x0 + w), 3] = 255
    for yy in range(y0, y0 + 6):
        for xx in (x0, x0 + w - 1):
            if 0 <= yy < H and 0 <= xx < W:
                a[yy, xx, :3] = PAL["k"]
                a[yy, xx, 3] = 255
    for rx in (x0 + 4, x0 + w // 2 - 1, x0 + w - 5):                 # rivets
        if 0 <= y0 + 2 < H and 0 <= rx < W:
            a[y0 + 2, rx, :3] = PAL["b5"]
    cx0 = cx - 6                                                     # the clamp slot
    if 0 <= y0 + 3 < H:
        a[y0 + 3, cx0:cx0 + 12, :3] = PAL["k2"]


def fill_wedge(a, box):
    """Glasswing tail: the dark wedge with a ladder under the rear cap becomes rear-cap ivory, shaded darker toward
    the bottom, with the silhouette's 1-px dark outline kept."""
    x0, y0, x1, y1 = box
    sub = a[y0:y1, x0:x1]
    L = lum(sub[..., :3])
    op = sub[..., 3] > 0
    dark = op & (L < 0.42)
    ramp = [(233, 223, 196), (207, 194, 160), (168, 155, 123), (125, 113, 89)]
    for x in range(sub.shape[1]):
        col = np.nonzero(dark[:, x])[0]
        if not len(col):
            continue
        top = col.min()
        for y in col:
            depth = (y - top) / max(1, (y1 - y0) - top)
            sub[y, x, :3] = ramp[min(3, 1 + int(depth * 3))]
    # re-outline the silhouette edge inside the box
    from scipy import ndimage
    edge = op & ~ndimage.binary_erosion(op, np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]), border_value=0)
    sub[edge & dark, :3] = PAL["k2"]
    a[y0:y1, x0:x1] = sub


def paste_part(a, pid, x0, y0, h):
    """A keyed Krea fitting (art-src/hulls/picks-v5.json) snapped to the hull palette with a selective outline and
    pasted at (x0, y0) with height h. Returns its box."""
    import hull_v5
    picks = json.loads((ART / "hulls" / "picks-v5.json").read_text())
    cut = Image.open(hull_v5.KEYED / f"{pid}-m-{picks[pid]}.png").convert("RGBA")
    w = round(cut.width * h / cut.height)
    part = np.asarray(cut.resize((w, h), Image.BOX)).copy()
    part[..., 3] = np.where(part[..., 3] > 127, 255, 0)
    pal = build_palette(2)
    op = part[..., 3] > 0
    part[op, :3] = pal[nearest(srgb_to_oklab(part[..., :3][op])[None], srgb_to_oklab(pal))[0]]
    from scipy import ndimage
    edge = op & ~ndimage.binary_erosion(op, np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]), border_value=0)
    part[edge, :3] = PAL["k2"]
    H, W = a.shape[:2]
    for yy in range(h):
        for xx in range(w):
            if part[yy, xx, 3] and 0 <= y0 + yy < H and 0 <= x0 + xx < W:
                a[y0 + yy, x0 + xx] = part[yy, xx]
    return (x0, y0, w, h)


def horns_at_tail(a, x0, bottom, h):
    """Glasswing survey horns moved to the tail (the rear roof gun needs the aft roof): the keyed Krea part,
    snapped to the hull palette with a selective outline, standing on the rear cap."""
    import hull_v5
    picks = json.loads((ART / "hulls" / "picks-v5.json").read_text())
    cut = Image.open(hull_v5.KEYED / f"survey-horns-m-{picks['survey-horns']}.png").convert("RGBA")
    w = round(cut.width * h / cut.height)
    part = np.asarray(cut.resize((w, h), Image.BOX)).copy()
    part[..., 3] = np.where(part[..., 3] > 127, 255, 0)
    pal = build_palette(2)
    op = part[..., 3] > 0
    part[op, :3] = pal[nearest(srgb_to_oklab(part[..., :3][op])[None], srgb_to_oklab(pal))[0]]
    from scipy import ndimage
    edge = op & ~ndimage.binary_erosion(op, np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]), border_value=0)
    part[edge, :3] = PAL["k2"]
    y0 = bottom - h
    H, W = a.shape[:2]
    for yy in range(h):
        for xx in range(w):
            if part[yy, xx, 3] and 0 <= y0 + yy < H and 0 <= x0 + xx < W:
                a[y0 + yy, x0 + xx] = part[yy, xx]
    return (x0, y0, w, h)


def refit(vid):
    ships = json.loads((PUB / "ships.json").read_text())
    e = ships[vid]
    p = PLAN[vid]
    path = PUB / f"{vid}.png"
    a = np.asarray(Image.open(path).convert("RGBA")).copy()
    before = hashlib.sha256(path.read_bytes()).hexdigest()
    ops = []
    for x0, y0, x1, y1 in p["erase_above"]:
        a[y0:y1, x0:x1] = 0
        ops.append(["erase", x0, y0, x1, y1])
    keep = []
    if p.get("horns"):
        hx, hb, hh = p["horns"]
        box = horns_at_tail(a, hx, hb, hh)
        ops.append(["horns-to-tail", *box])
        keep.append({"what": "survey horns", "x": box[0], "y": box[1], "w": box[2], "h": box[3]})
    if p.get("repaint"):
        # the flank collimators Krea painted under the room grid poke out onto the nose: repaint that strip as plain
        # nose plating (vertical blend between the rows just above and below, snapped to the hull palette)
        x0, y0, x1, y1 = p["repaint"]
        pal = build_palette(2)
        top = a[y0 - 2, x0:x1, :3].astype(float)
        bot = a[y1 + 2, x0:x1, :3].astype(float)
        for yy in range(y0, y1):
            t = (yy - y0) / max(1, y1 - y0)
            row = (top * (1 - t) + bot * t).astype(np.uint8)
            opq = a[yy, x0:x1, 3] > 0
            snap = pal[nearest(srgb_to_oklab(row)[None], srgb_to_oklab(pal))[0]]
            a[yy, x0:x1, :3] = np.where(opq[:, None], snap, a[yy, x0:x1, :3])
        ops.append(["repaint", x0, y0, x1, y1])
    if p.get("collimators"):
        cx0, cy0, ch = p["collimators"]
        box = paste_part(a, "collimator-pair", cx0, cy0, ch)
        ops.append(["collimators-to-nose", *box])
        keep.append({"what": "collimator pair", "x": box[0], "y": box[1], "w": box[2], "h": box[3]})
    if p.get("wedge"):
        fill_wedge(a, p["wedge"])
        ops.append(["tail-wedge-fill", *p["wedge"]])
    for mx, my in p["roof"]:
        plate(a, mx, my)
    for mx, my in p["belly"]:
        plate(a, mx, my, belly=True)
    Image.fromarray(a, "RGBA").save(path, optimize=True)
    # keep-clear boxes: trolley + saddle, roof fittings, nose lamp and cab window
    cx, cy = e["cable"]["x"], e["cable"]["y"]
    kind = e.get("trolley", {}).get("kind", "standard")
    half, low = (266, 208) if kind == "heavy" else (190, 151)
    keep.append({"what": f"drive trolley ({kind}): carriage and sheaves", "x": cx - half, "y": cy - 83,
                 "w": 2 * half, "h": 83 + 6})
    keep.append({"what": f"drive trolley ({kind}): hanger and saddle", "x": cx - low, "y": cy + 6, "w": 2 * low,
                 "h": 66})
    meta = json.loads((ART / "init" / f"{vid}.json").read_text()) if vid != "lamplighter" else {}
    for f in meta.get("fittings", []):
        if f["part"] in ("saddle-plate",) or (vid == "glasswing" and f["part"] in ("survey-horns",
                                                                                  "collimator-pair")):
            continue
        keep.append({"what": f["part"], "x": f["x"], "y": f["y"], "w": f["w"], "h": f["h"]})
    for g in e.get("glow", [])[:2]:
        r = g["r"] + 6
        keep.append({"what": "nose lamp" if g is e["glow"][0] else "cab window", "x": g["x"] - r, "y": g["y"] - r,
                     "w": 2 * r, "h": 2 * r})
    e["mounts"] = [{"x": x, "y": y} for x, y in p["roof"] + p["belly"]]
    e["keepClear"] = keep
    e["weaponEnvelope"] = {"up": UP, "left": LEFT, "right": RIGHT}
    (PUB / "ships.json").write_text(json.dumps(ships, indent=1) + "\n")
    man_path = ART / "manifest.json"
    man = json.loads(man_path.read_text())
    rec = man["ships"][vid]
    rec["mounts_refit"] = {"date": datetime.date.today().isoformat(), "tool": "tools/art/mounts_v5.py",
                           "ops": ops, "mounts": e["mounts"], "before_sha256": before}
    rec["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
    man_path.write_text(json.dumps(man, indent=1, sort_keys=True) + "\n")
    # self-check: roof guns clear the carrier and the keep-clear boxes (worst-case envelope)
    for mx, my in p["roof"]:
        top = my - UP
        assert top >= cy + 6 + 7, (vid, mx, my, "carrier", top)
        for k in keep:
            if k["what"] in ("nose lamp", "cab window"):
                continue
            ox = min(mx + RIGHT, k["x"] + k["w"]) - max(mx - LEFT, k["x"])
            oy = min(my, k["y"] + k["h"]) - max(top, k["y"])
            if ox > 0 and oy > 0:
                print(f"  note: {vid} roof mount {mx},{my} envelope overlaps {k['what']} by {ox}x{oy}")
    print(vid, "mounts", e["mounts"])


if __name__ == "__main__":
    for v in sys.argv[1:]:
        refit(v)
