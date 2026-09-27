#!/usr/bin/env python3
"""Rooms atlas previews (reads public/sprites/rooms.json/png; TILE 72 atlas px, floor line at tile row 64):

    rooms_preview.py mock      # the Lamplighter lead car interior (12x4 decks) at 1:1 HD  -> preview/rooms-mock.png
                               #   (+ rooms-mock-x2.png, a 2x crop of the helm end, as the game's zoom shows it)
    rooms_preview.py strips    # every room kind as a 3-tile run (0,1,2) to check seams     -> preview/rooms-strips.png
    rooms_preview.py modules   # every module dressing as a 2-tile socket room               -> preview/rooms-modules.png
    rooms_preview.py couplers  # gangway + keel hatch/tube/ladder states                      -> preview/rooms-couplers.png
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SPR = os.path.join(ROOT, "public", "sprites")
OUT = os.path.join(HERE, "preview")
FONT = ImageFont.load_default()
T = 72
FL = 64
_cache = {}


def atlas(name):
    if name not in _cache:
        p = os.path.join(SPR, f"{name}.json")
        if not os.path.exists(p):
            _cache[name] = None
        else:
            d = json.load(open(p))
            _cache[name] = (d, Image.open(os.path.join(SPR, d["image"])).convert("RGBA"))
    return _cache[name]


def draw(c, name, fr, x, y, anchor=True):
    a = atlas(name)
    if not a or fr not in a[0]["frames"]:
        return False
    f = a[0]["frames"][fr]
    im = a[1].crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
    if anchor:
        x, y = x - f["ax"], y - f["ay"]
    c.alpha_composite(im, (int(x), int(y)))
    return True


def save(c, name, scale=1):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, f"rooms-{name}.png")
    (c if scale == 1 else c.resize((c.width * scale, c.height * scale), Image.NEAREST)).save(p)
    print(os.path.relpath(p))


def room(c, gx, gy, tx, ty, w, kind, variants=(0, 1, 2)):
    for i in range(w):
        draw(c, "rooms", f"wall-{kind}-{variants[i % len(variants)]}", gx + (tx + i) * T, gy + ty * T, anchor=False)


# the lead car, 12x4 (tx, ty, w, kind, variants, emblem, console, console-dir)
LAYOUT = [
    (0, 0, 2, "air", (0, 1), "air", "air", "right"),
    (2, 0, 2, "weapons", (1, 2), "weapons", "weapons", "right"),
    (4, 0, 3, "corridor", (0, 1, 2), None, None, None),
    (7, 0, 2, "shields", (0, 2), "shields", "shields", "left"),
    (9, 0, 2, "sensors", (1, 2), "sensors", "sensors", "right"),
    (11, 0, 1, "quarters", (2,), None, None, None),
    (0, 1, 2, "engines", (1, 2), "engines", "engines", "right"),
    (2, 1, 3, "hold", (0, 1, 2), None, None, None),
    (5, 1, 4, "corridor", (0, 2, 1, 0), None, None, None),
    (9, 1, 2, "medbay", (1, 2), "medbay", "medbay", "right"),
    (11, 1, 1, "helm", (1,), "helm", "helm", "right"),
    (0, 2, 2, "reactor", (1, 2), "reactor", "reactor", "right"),
    (2, 2, 2, "doors", (0, 1), "doors", "doors", "left"),
    (4, 2, 3, "quarters", (0, 1, 2), None, None, None),
    (7, 2, 2, "socket", (0, 1), None, None, None),
    (9, 2, 3, "veil", (0, 1, 2), "veil", "veil", "right"),
    (0, 3, 3, "hold", (2, 0, 1), None, None, None),
    (3, 3, 2, "socket", (0, 1), None, None, None),
    (5, 3, 3, "corridor", (1, 0, 2), None, None, None),
    (8, 3, 2, "drones", (1, 2), "drones", "drones", "left"),
    (10, 3, 2, "quarters", (1, 0), None, None, None),
]
DOORS = {(0, 2): "door-closed", (0, 4): "door-open", (0, 7): "door-2", (0, 9): "door-closed",
         (0, 11): "door-locked", (1, 2): "door-open", (1, 5): "door-closed", (1, 9): "door-open",
         (1, 11): "door-closed", (2, 2): "door-closed", (2, 4): "door-open", (2, 7): "door-1", (2, 9): "door-closed",
         (3, 3): "door-closed", (3, 5): "door-open", (3, 8): "door-closed", (3, 10): "door-open"}


def mock():
    W, H = 12 * T + 64, 4 * T + 64
    c = Image.new("RGBA", (W, H), (7, 8, 15, 255))
    gx, gy = 32, 32
    for i in range(12):
        draw(c, "rooms", "hull-roof", gx + i * T, gy)
        draw(c, "rooms", "hull-belly", gx + i * T, gy + 4 * T)
    for j in range(4):
        draw(c, "rooms", "hull-end-left", gx, gy + j * T)
        draw(c, "rooms", "hull-end-right", gx + 12 * T, gy + j * T)
    for n, x, y in (("hull-corner-tl", gx, gy), ("hull-corner-tr", gx + 12 * T, gy),
                    ("hull-corner-bl", gx, gy + 4 * T), ("hull-corner-br", gx + 12 * T, gy + 4 * T)):
        draw(c, "rooms", n, x, y)
    for (tx, ty, w, kind, vs, emb, con, cdir) in LAYOUT:
        room(c, gx, gy, tx, ty, w, kind, vs)
    for (tx, ty, w, kind, vs, emb, con, cdir) in LAYOUT:
        if emb and w > 1:   # emblems go on a tile without the station device; 1-tile rooms get a stencil
            ex = gx + tx * T + (w * T) // 2
            if con:
                ex = gx + (tx if cdir == "right" else tx + w - 1) * T + 36
            draw(c, "rooms", f"emblem-{emb}-lit", ex, gy + ty * T + 25)
        elif emb:
            draw(c, "rooms", f"stencil-{kind}", gx + tx * T + 18, gy + ty * T + 52)
        if con:
            ctx = tx + w - 1 if cdir == "right" else tx
            draw(c, "rooms", f"console-{con}-{cdir}-0", gx + ctx * T, gy + ty * T)
    # module dressings in the two sockets
    for (tx, ty), mid in (((7, 2), "kettle-bench"), ((3, 3), "workshop")):
        draw(c, "rooms", f"module-{mid}-a", gx + tx * T, gy + ty * T, anchor=False)
        draw(c, "rooms", f"module-{mid}-b", gx + (tx + 1) * T, gy + ty * T, anchor=False)
    draw(c, "rooms", "lamp-ceiling-0", gx + 5 * T + 36, gy + 0 * T + 5)
    draw(c, "rooms", "lamp-wall-0", gx + 7 * T + 50, gy + 1 * T + 14)
    draw(c, "rooms", "lamp-wall-1", gx + 4 * T + 14, gy + 2 * T + 14)
    draw(c, "rooms", "porthole", gx + 11 * T + 36, gy + 0 * T + 26)
    draw(c, "rooms", "window-slit", gx + 5 * T + 36, gy + 2 * T + 22)
    draw(c, "rooms", "crate-large", gx + 3 * T + 18, gy + 1 * T + FL)
    draw(c, "rooms", "crate-small", gx + 3 * T + 52, gy + 1 * T + FL)
    draw(c, "rooms", "cable-spool", gx + 1 * T + 30, gy + 3 * T + FL)
    draw(c, "rooms", "barrel", gx + 2 * T + 14, gy + 3 * T + FL)
    draw(c, "rooms", "bunk", gx + 10 * T + 40, gy + 3 * T + FL)
    draw(c, "rooms", "galley-stove", gx + 6 * T + 50, gy + 2 * T + FL)
    # ladders + hatches between the corridor decks
    for (lx, upper) in ((6, 0), (5, 1), (6, 2)):
        draw(c, "rooms", "ladder", gx + lx * T + 36, gy + (upper + 1) * T)
        draw(c, "rooms", "ladder-top", gx + lx * T + 36, gy + upper * T + FL)
        draw(c, "rooms", "hatch-open" if upper != 1 else "hatch-closed", gx + lx * T + 36, gy + upper * T + FL)
    bounds = {}
    for (tx, ty, w, *_r) in LAYOUT:
        bounds.setdefault(ty, set()).update({tx, tx + w})
    for ty, xs in bounds.items():
        for bx in sorted(xs):
            if bx in (0, 12):
                continue
            draw(c, "rooms", DOORS.get((ty, bx), "wall-v"), gx + bx * T, gy + ty * T)
    draw(c, "rooms", "airlock-closed", gx, gy + 1 * T)
    draw(c, "rooms", "airlock-open", gx + 12 * T, gy + 3 * T)
    ca = atlas("crew")
    if ca:
        frames = ca[0]["frames"]

        def put(fr, tx, ty, sx=36, y=None):
            if fr in frames:
                draw(c, "crew", fr, gx + tx * T + sx, gy + ty * T + (FL if y is None else y))

        put("linefolk-man-right-0", 11, 1, 30)
        put("warden-man-left-0", 7, 0, 42)
        put("courier-man-right-0", 3, 0, 30)
        put("courier-walk-right-2", 5, 1, 20)
        put("rigger-repair-right-1", 1, 1, 30)
        put("bellmaker-idle-left-0", 9, 1, 44)
        put("linefolk-idle-left-1", 4, 2, 50)
        put("linefolk-climb-up-1", 5, 2, 36, 40)
        put("splicer-sabotage-left-0", 8, 2, 30)
        put("marshal-trooper-idle-left-0", 9, 2, 50)
        put("warden-walk-right-3", 6, 3, 20)
        put("linefolk-man-left-0", 8, 3, 42)
    save(c, "mock", 1)
    crop = c.crop((gx + 7 * T, gy, gx + 12 * T + 16, gy + 2 * T + 8))
    save(crop, "mock-x2", 2)


def strips():
    doc = atlas("rooms")[0]
    kinds = [n[5:-2] for n in doc["frames"] if n.startswith("wall-") and n.endswith("-0") and n != "wall-v"]
    cols = 3
    rows = (len(kinds) + cols - 1) // cols
    c = Image.new("RGBA", (cols * (3 * T + 16) + 8, rows * (T + 14) + 8), (7, 8, 15, 255))
    d = ImageDraw.Draw(c)
    for i, k in enumerate(kinds):
        x0 = 8 + (i % cols) * (3 * T + 16)
        y0 = 4 + (i // cols) * (T + 14)
        for j in range(3):
            draw(c, "rooms", f"wall-{k}-{j}", x0 + j * T, y0, anchor=False)
        d.text((x0, y0 + T + 1), k, fill=(233, 223, 196, 255), font=FONT)
    save(c, "strips", 1)


def modules():
    doc = atlas("rooms")[0]
    mods = sorted({n[len("module-"):-2] for n in doc["frames"] if n.startswith("module-")}) + ["socket-empty"]
    cols = 3
    rows = (len(mods) + cols - 1) // cols
    c = Image.new("RGBA", (cols * (2 * T + 12) + 8, rows * (T + 14) + 8), (7, 8, 15, 255))
    d = ImageDraw.Draw(c)
    for i, m in enumerate(mods):
        x0 = 8 + (i % cols) * (2 * T + 12)
        y0 = 4 + (i // cols) * (T + 14)
        for j in range(2):
            draw(c, "rooms", f"wall-socket-{j}", x0 + j * T, y0, anchor=False)
        pre = m if m == "socket-empty" else f"module-{m}"
        draw(c, "rooms", f"{pre}-a", x0, y0, anchor=False)
        draw(c, "rooms", f"{pre}-b", x0 + T, y0, anchor=False)
        draw(c, "rooms", "wall-v", x0, y0)
        draw(c, "rooms", "wall-v", x0 + 2 * T, y0)
        d.text((x0, y0 + T + 1), m, fill=(233, 223, 196, 255), font=FONT)
    save(c, "modules", 2)


def couplers():
    names = ["gangway-0", "gangway-1", "gangway-2", "gangway-3", "gangway-locked", "keel-hatch-0", "keel-hatch-1",
             "keel-hatch-2", "keel-hatch-3", "keel-hatch-locked"]
    c = Image.new("RGBA", (5 * 130 + 8, 2 * 120 + 8), (7, 8, 15, 255))
    for i, n in enumerate(names):
        x0 = 8 + (i % 5) * 130
        y0 = 8 + (i // 5) * 120
        if n.startswith("gangway"):
            draw(c, "rooms", "wall-corridor-0", x0 - 20, y0, anchor=False)
            draw(c, "rooms", "hull-end-right", x0 + 52, y0)
            draw(c, "rooms", "wall-corridor-1", x0 + 52 + 12 + 36, y0, anchor=False)
            draw(c, "rooms", "hull-end-left", x0 + 52 + 12 + 36, y0)
            draw(c, "rooms", n, x0 + 52 + 6 + 18, y0)
        else:
            draw(c, "rooms", "wall-corridor-0", x0, y0, anchor=False)
            draw(c, "rooms", "keel-tube", x0 + 36, y0 + FL + 10)
            draw(c, "rooms", "keel-tube", x0 + 36, y0 + FL + 28)
            draw(c, "rooms", "ladder", x0 + 36, y0 + FL + 8)
            draw(c, "rooms", n, x0 + 36, y0 + FL)
    save(c, "couplers", 2)


if __name__ == "__main__":
    for w in sys.argv[1:] or ["mock", "strips", "modules", "couplers"]:
        globals()[w]()
