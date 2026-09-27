"""In-context preview scenes (used by `preview.py <atlas> --scene`): the side-view deck kit from the rooms atlas with
crew, consoles, doors, hatches and fx placed the way the game places them (TILE 32, floor line = tile row 29), drawn
at 1x and scaled up so readability can be judged as on screen.
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SPR = os.path.join(ROOT, "public", "sprites")
OUT = os.path.join(HERE, "preview")
TILE = 72      # atlas px (36 layout units), contract v4
FLOOR = 64     # floor line inside a tile
FONT = ImageFont.load_default()
_cache = {}


def atlas(name):
    if name not in _cache:
        p = os.path.join(SPR, f"{name}.json")
        if not os.path.exists(p):
            _cache[name] = None
        else:
            doc = json.load(open(p))
            _cache[name] = (doc, Image.open(os.path.join(SPR, doc["image"])).convert("RGBA"))
    return _cache[name]


def frame(name, fr):
    a = atlas(name)
    if not a or fr not in a[0]["frames"]:
        return None, None
    f = a[0]["frames"][fr]
    return a[1].crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"])), f


def draw(canvas, name, fr, x, y, anchor=True, recolor=None, flip=False):
    im, f = frame(name, fr)
    if im is None:
        return False
    if recolor:
        im = swap(im, recolor)
    ax = (f["w"] - 1 - f["ax"]) if flip else f["ax"]
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if anchor:
        x, y = x - ax, y - f["ay"]
    canvas.alpha_composite(im, (int(x), int(y)))
    return True


def swap(im, mapping):
    m = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)): tuple(int(t[i:i + 2], 16) for i in (1, 3, 5))
         for h, t in mapping.items()}
    out = im.copy()
    px, po = im.load(), out.load()
    for yy in range(im.height):
        for xx in range(im.width):
            r, g, b, a = px[xx, yy]
            if a and (r, g, b) in m:
                po[xx, yy] = m[(r, g, b)] + (a,)
    return out


def room(c, gx, gy, tx, ty, w, kind):
    for i in range(w):
        draw(c, "rooms", f"wall-{kind}-{(tx + i) % 3}", gx + (tx + i) * TILE, gy + ty * TILE, anchor=False)


def crew(c, gx, gy, tx, ty, fr, slot=16, **kw):
    draw(c, "crew", fr, gx + tx * TILE + slot, gy + ty * TILE + FLOOR, **kw)


def save(canvas, name, scale=3):
    os.makedirs(OUT, exist_ok=True)
    big = canvas.resize((canvas.width * scale, canvas.height * scale), Image.NEAREST)
    path = os.path.join(OUT, f"scene-{name}.png")
    big.save(path)
    return path


def render(name):
    fn = globals().get(f"scene_{name.replace('-', '_')}")
    if not fn:
        print(f"no scene for {name}")
        return []
    return fn()


def scene_crew():
    """A slice of the Lamplighter (8 x 3 tiles) with crew at work, rendered 1:1 at HD density, plus a line-up of
    looks and portraits. Saved at 1x (as on a 1080p screen) and 2x (the game's zoom)."""
    W, H = 8 * TILE + 32, 3 * TILE + 32 + 220
    c = Image.new("RGBA", (W, H), (12, 15, 28, 255))
    gx, gy = 16, 16
    room(c, gx, gy, 0, 0, 2, "engines")
    room(c, gx, gy, 2, 0, 2, "corridor")
    room(c, gx, gy, 4, 0, 2, "weapons")
    room(c, gx, gy, 6, 0, 2, "helm")
    room(c, gx, gy, 0, 1, 3, "hold")
    room(c, gx, gy, 3, 1, 2, "shields")
    room(c, gx, gy, 5, 1, 3, "medbay")
    room(c, gx, gy, 0, 2, 2, "air")
    room(c, gx, gy, 2, 2, 2, "sensors")
    room(c, gx, gy, 4, 2, 4, "quarters")
    for tx, ty, kind in ((2, 0, "door-open"), (4, 0, "door-closed"), (6, 0, "door-locked"), (3, 1, "door-closed"),
                         (5, 1, "door-open"), (2, 2, "door-closed"), (4, 2, "door-closed")):
        draw(c, "rooms", kind, gx + tx * TILE, gy + ty * TILE)
    draw(c, "rooms", "hatch-open", gx + 3 * TILE + 36, gy + 0 * TILE + FLOOR)
    draw(c, "rooms", "ladder", gx + 3 * TILE + 36, gy + 1 * TILE)
    draw(c, "rooms", "ladder-top", gx + 3 * TILE + 36, gy + 0 * TILE + FLOOR)
    draw(c, "rooms", "console-helm-right-0", gx + 7 * TILE, gy + 0 * TILE, anchor=False)
    draw(c, "rooms", "console-weapons-right-0", gx + 5 * TILE, gy + 0 * TILE, anchor=False)
    draw(c, "rooms", "console-shields-left-0", gx + 3 * TILE, gy + 1 * TILE, anchor=False)
    draw(c, "rooms", "console-sensors-right-0", gx + 3 * TILE, gy + 2 * TILE, anchor=False)
    draw(c, "rooms", "console-engines-left-0", gx + 0 * TILE, gy + 0 * TILE, anchor=False)
    crew(c, gx, gy, 7, 0, "linefolk-man-right-0", 30)
    crew(c, gx, gy, 5, 0, "warden-man-right-1", 30)
    crew(c, gx, gy, 4, 0, "courier-walk-right-2")
    crew(c, gx, gy, 0, 0, "rigger-man-left-0", 42)
    crew(c, gx, gy, 3, 1, "bellmaker-man-left-0", 42)
    crew(c, gx, gy, 3, 0, "linefolk-climb-up-1", 36)
    crew(c, gx, gy, 1, 1, "splicer-fight-left-2")
    crew(c, gx, gy, 0, 1, "warden-fight-right-2")
    crew(c, gx, gy, 2, 1, "spark-mite-sabotage-right-1")
    draw(c, "fx", "fire-1", gx + 6 * TILE, gy + 1 * TILE, anchor=False)
    crew(c, gx, gy, 5, 1, "rigger-repair-right-1")
    crew(c, gx, gy, 7, 1, "courier-hurt-left-0")
    crew(c, gx, gy, 3, 2, "courier-man-right-0", 30)
    crew(c, gx, gy, 5, 2, "linefolk-idle-right-0")
    crew(c, gx, gy, 6, 2, "marshal-trooper-walk-left-3")
    crew(c, gx, gy, 7, 2, "linefolk-stop-right-3")
    draw(c, "crew", "select-ring", gx + 5 * TILE + 36, gy + 2 * TILE + FLOOR)
    draw(c, "crew", "bubble-repair-0", gx + 5 * TILE + 36, gy + 1 * TILE + 6)
    # line-up of looks (idle + portrait), recoloured the way the game does it
    doc = atlas("crew")[0]
    x, y = 8, 3 * TILE + 40
    for sp in ("linefolk", "warden", "rigger", "courier", "bellmaker"):
        for m in doc.get("variants", {}).get(sp, [{}])[:4]:
            draw(c, "crew", f"{sp}-idle-right-0", x + 18, y + 72, recolor=m)
            draw(c, "crew", f"{sp}-portrait", x + 18, y + 108, recolor=m)
            x += 38
        x += 6
        if x > W - 160:
            x, y = 8, y + 140
    return [save(c, "crew", 1), save_as(c, "crew-x2", 2)]


def save_as(canvas, name, scale):
    os.makedirs(OUT, exist_ok=True)
    big = canvas.resize((canvas.width * scale, canvas.height * scale), Image.NEAREST)
    path = os.path.join(OUT, f"scene-{name}.png")
    big.save(path)
    return path
