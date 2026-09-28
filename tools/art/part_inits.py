#!/usr/bin/env python3
"""A2 hull kit: colour-blocked init images for the exact-geometry parts (Krea repaints them at moderate denoise).

  python tools/art/part_inits.py        -> art-src/init/parts/<id>-init.png (+ .json with the object box)

Text-to-image draws "a section of a car body" as a whole small car, so body strips, end caps and noses get their
geometry from here: the part is drawn at 1x (hull px), upscaled 4x (nearest) and centred on the flat navy backdrop
with a 10 % margin. Body strips are six 72-px panels (roof rail + upper band, the plated wall with deck straps,
the gunmetal keel strip with tanks); the per-panel variants make a 10- or 13-column body non-repeating. Noses and the
rear cap start from the Lamplighter final's own silhouette (the lamplighter pattern), varied per job.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "art-src" / "init" / "parts"
L_REF = ROOT / "art-src" / "kit" / "lamplighter-ref.png"
NAVY = (12, 15, 28)
C = {"b0": (85, 54, 25), "b1": (127, 84, 36), "b2": (176, 122, 50), "b3": (217, 162, 74), "b4": (242, 196, 107),
     "i0": (244, 236, 214), "i1": (233, 223, 196), "i2": (207, 194, 160), "i3": (168, 155, 123), "i4": (125, 113, 89),
     "g0": (19, 26, 43), "g1": (28, 38, 64), "g2": (40, 53, 86), "g3": (58, 74, 112), "t0": (20, 96, 105),
     "t1": (30, 154, 160), "t2": (63, 211, 201), "r0": (106, 45, 32), "r1": (151, 69, 42), "v1": (125, 91, 201),
     "v2": (178, 140, 240), "k": (7, 8, 15)}
SCALE = 4
MARGIN = 0.10


def canvas(w, h, col=None):
    a = np.zeros((h, w, 3), np.uint8)
    a[:] = col or NAVY
    return a


def rect(a, x0, y0, x1, y1, c):
    a[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = C[c] if isinstance(c, str) else c


def disc(a, cx, cy, r, c):
    yy, xx = np.ogrid[:a.shape[0], :a.shape[1]]
    a[(xx - cx) ** 2 + (yy - cy) ** 2 <= r * r] = C[c]


def panel_wall(a, x0, y_top, y_bot, variant, seed):
    """One 72-px panel of wall between ribs: ivory plate with top-left light, and its variant fitting."""
    rng = np.random.default_rng(seed)
    rect(a, x0 + 4, y_top, x0 + 68, y_bot, "i1")
    rect(a, x0 + 4, y_top + (y_bot - y_top) * 3 // 5, x0 + 68, y_bot, "i2")   # lower half a step darker
    rect(a, x0 + 60, y_top, x0 + 68, y_bot, "i2")                              # right edge shade
    for _ in range(3):                                                         # chips and grime
        cx, cy = x0 + rng.integers(10, 62), rng.integers(y_top + 6, y_bot - 6)
        rect(a, cx, cy, cx + rng.integers(2, 6), cy + rng.integers(1, 3), "i3")
    mid = (y_top + y_bot) // 2
    if variant == "porthole":
        disc(a, x0 + 36, mid - 14, 14, "b1")
        disc(a, x0 + 36, mid - 14, 12, "b3")
        disc(a, x0 + 36, mid - 14, 9, "g1")
        disc(a, x0 + 33, mid - 17, 3, "t0")
    elif variant == "portholes":
        for dy in (-40, 22):
            disc(a, x0 + 36, mid + dy, 9, "b1")
            disc(a, x0 + 36, mid + dy, 7, "b3")
            disc(a, x0 + 36, mid + dy, 5, "g1")
    elif variant == "door":
        rect(a, x0 + 14, y_top + 20, x0 + 58, y_bot - 8, "b1")
        rect(a, x0 + 17, y_top + 23, x0 + 55, y_bot - 11, "i2")
        disc(a, x0 + 36, y_top + 44, 7, "b2")
        disc(a, x0 + 36, y_top + 44, 5, "g1")
        rect(a, x0 + 48, mid + 6, x0 + 52, mid + 22, "b3")
    elif variant == "pipe":
        yp = mid + 30
        rect(a, x0, yp, x0 + 72, yp + 6, "t1")
        rect(a, x0, yp, x0 + 72, yp + 2, "t2")
        rect(a, x0 + 30, yp - 2, x0 + 38, yp + 8, "b2")
    elif variant == "cover":
        rect(a, x0 + 20, mid + 10, x0 + 52, mid + 40, "i3")
        rect(a, x0 + 21, mid + 11, x0 + 51, mid + 39, "i1")
        for px, py in ((24, 14), (48, 14), (24, 36), (48, 36)):
            rect(a, x0 + px, mid + py, x0 + px + 2, mid + py + 2, "i4")
    elif variant == "shutter":
        ys = y_bot - 64
        rect(a, x0 + 8, ys, x0 + 64, y_bot - 6, "g1")
        for yy in range(ys + 4, y_bot - 8, 8):
            rect(a, x0 + 10, yy, x0 + 62, yy + 3, "g3")


def body_strip(rows, variants, seed=1):
    t = 72
    wall = rows * t
    W, H = 6 * t, 30 + wall + 42
    a = canvas(W, H)
    # roof rail and upper band
    rect(a, 0, 0, W, 8, "b2")
    rect(a, 0, 0, W, 2, "b4")
    rect(a, 0, 7, W, 8, "b0")
    rect(a, 0, 8, W, 30, "i1")
    rect(a, 0, 26, W, 30, "b1")
    for i, v in enumerate(variants):
        panel_wall(a, i * t, 30, 30 + wall, v, seed * 10 + i)
    # deck straps between the decks
    for k in range(1, rows):
        y = 30 + k * t
        rect(a, 0, y - 3, W, y + 3, "b2")
        rect(a, 0, y - 3, W, y - 2, "b4")
    # vertical ribs at panel boundaries, riveted
    for k in range(0, 7):
        x = k * t
        rect(a, x - 4, 8, x + 4, 30 + wall, "b2")
        rect(a, x - 4, 8, x - 2, 30 + wall, "b3")
        rect(a, x + 3, 8, x + 4, 30 + wall, "b0")
        for y in range(14, 30 + wall, 12):
            rect(a, x - 1, y, x + 1, y + 2, "b4")
    # keel strip: gunmetal with two tanks and rust
    ky = 30 + wall
    rect(a, 0, ky, W, H, "g1")
    rect(a, 0, ky, W, ky + 3, "g3")
    for tx in (30, 250):
        rect(a, tx, ky + 10, tx + 150, ky + 34, "g2")
        rect(a, tx + 4, ky + 12, tx + 146, ky + 16, "g3")
        rect(a, tx + 40, ky + 10, tx + 46, ky + 34, "b1")
        rect(a, tx + 104, ky + 10, tx + 110, ky + 34, "b1")
    rng = np.random.default_rng(seed)
    for _ in range(10):
        x, y = rng.integers(0, W - 8), rng.integers(ky + 2, H - 4)
        rect(a, x, y, x + rng.integers(3, 9), y + 2, "r0")
    return a


def lamplighter():
    return np.asarray(Image.open(L_REF).convert("RGBA"))


def stretch_rows(a, H):
    idx = np.clip(np.round(np.linspace(0, a.shape[0] - 1, H)).astype(int), 0, a.shape[0] - 1)
    return a[idx]


def on_navy(rgba):
    out = canvas(rgba.shape[1], rgba.shape[0])
    m = rgba[..., 3:4] > 0
    return np.where(m, rgba[..., :3], out)


def nose(kind):
    L = lamplighter()
    part = L[90:440, 858:1008].copy()               # 150 x 350: the last body panel and the nose
    if kind == "nose-lamp":
        part = stretch_rows(part, 360)
    elif kind == "nose-optical":
        part = stretch_rows(part, 360)
        # violet-tinted lens ring around the guide lamp: brass ring pixels near the lamp shift violet
        lab = part[..., :3].astype(int)
        yy, xx = np.ogrid[:part.shape[0], :part.shape[1]]
        ring = ((xx - 112) ** 2 + (yy - 200) ** 2 <= 46 ** 2) & ((xx - 112) ** 2 + (yy - 200) ** 2 >= 30 ** 2)
        brass = (lab[..., 0] > lab[..., 2] + 30) & (part[..., 3] > 0)
        sel = ring & brass
        part[sel, :3] = np.array(C["v1"])
    else:                                            # nose-heavy: taller, louvred retrieval shutters under the lamp
        part = stretch_rows(part, 432)
        y0 = 300
        for yy in range(y0, y0 + 64, 8):
            part[yy:yy + 5, 60:132, :3] = C["g1"]
            part[yy:yy + 2, 60:132, :3] = C["g3"]
        part[y0 - 4:y0 + 66, 56:60, :3] = C["b1"]
    return on_navy(part)


def rear(rows):
    L = lamplighter()
    part = L[90:440, 0:56].copy()
    part = stretch_rows(part, 30 + rows * 72 + 42)
    return on_navy(part)


def save(pid, a):
    OUT.mkdir(parents=True, exist_ok=True)
    h, w = a.shape[:2]
    big = np.asarray(Image.fromarray(a).resize((w * SCALE, h * SCALE), Image.NEAREST))
    mw, mh = int(round(w * SCALE * MARGIN)), int(round(h * SCALE * MARGIN))
    W = int(np.ceil((w * SCALE + 2 * mw) / 16) * 16)
    H = int(np.ceil((h * SCALE + 2 * mh) / 16) * 16)
    k = min(1.0, 2560 / max(W, H))
    frame = canvas(W, H)
    x0, y0 = (W - w * SCALE) // 2, (H - h * SCALE) // 2
    frame[y0:y0 + h * SCALE, x0:x0 + w * SCALE] = big
    img = Image.fromarray(frame)
    if k < 1:
        img = img.resize((int(W * k) // 16 * 16, int(H * k) // 16 * 16), Image.LANCZOS)
    img.save(OUT / f"{pid}-init.png")
    (OUT / f"{pid}.json").write_text(json.dumps({"size": [w, h], "gen": list(img.size)}) + "\n")
    return img.size


def main():
    va = ["porthole", "plain", "pipe", "porthole", "cover", "plain"]
    vb = ["door", "plain", "portholes", "cover", "porthole", "plain"]
    vc = ["plain", "shutter", "porthole", "shutter", "plain", "portholes"]
    jobs = {
        "body-4a": body_strip(4, va, 1), "body-4b": body_strip(4, vb, 2),
        "body-5a": body_strip(5, va, 3), "body-5b": body_strip(5, vc, 4),
        "nose-lamp": nose("nose-lamp"), "nose-optical": nose("nose-optical"), "nose-heavy": nose("nose-heavy"),
        "rear-cap": rear(4), "rear-cap-5": rear(5),
    }
    for pid, a in jobs.items():
        print(pid, a.shape[1], a.shape[0], save(pid, a))


if __name__ == "__main__":
    main()
