#!/usr/bin/env python3
"""A3 events whose subject is a tender: our real hull art composited into the img2img init (lead, 27 Sep).

  python tools/art/event_inits.py [event ...]      -> art-src/init/events/<event>-init.png (2560x1280) + .json

The init is a flat, dark night scene in blocks (indigo sky, a pale horizon band, the cloud sea, a few distant lattice
towers in the stage's light) with one braided carrier cable, and on it the actual tender: hull PNG + its drive
trolley's BACK layer + the cable + the FRONT layer, exactly as the game draws them, scaled and posed per event. A few
scene blocks per event (a switch box, a gantry, a gate, a sun) give Krea the layout; it repaints everything at the
recorded denoise (art-src/v5.py `v5t`), so the tenders in the world are the cars the player rides.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SHIPS = ROOT / "public" / "art" / "ships"
OUT = ROOT / "art-src" / "init" / "events"
W, H = 2560, 1280

LIGHT = {"I": ((58, 42, 60), (150, 90, 70)), "II": ((52, 40, 90), (150, 120, 200)),
         "III": ((50, 24, 30), (170, 60, 50)), "shared": ((40, 44, 70), (120, 110, 120))}

# event -> scene: stage, hull, scale, the trolley pivot position (x, carrier y), tilt degrees, lamp lit, extras
SCENES = {
    "echo-tender-lit": dict(stage="II", hull="lamplighter", scale=1.1, at=(1380, 330), extras=["towers"]),
    "tender-wreck": dict(stage="I", hull="lamplighter", scale=0.95, at=(1300, 380), tilt=-9, lamp=False,
                         extras=["gantry", "towers"]),
    "relay-switchyard": dict(stage="shared", hull="lamplighter", scale=0.62, at=(820, 520),
                             extras=["switchbox", "cables3", "towers"]),
    "derelict-car": dict(stage="shared", hull="cars/freight-car", scale=1.4, at=(1280, 360), lamp=False,
                         extras=["towers"]),
    "sun-glare": dict(stage="I", hull="lamplighter", scale=0.8, at=(1500, 420), extras=["sun", "towers"]),
    "resonance": dict(stage="II", hull="lamplighter", scale=0.7, at=(1250, 560), extras=["glasswall"]),
    "glass-fog": dict(stage="II", hull="lamplighter", scale=0.7, at=(1300, 520), extras=["fog", "towers"]),
    "dark-stretch": dict(stage="III", hull="lamplighter", scale=0.8, at=(1350, 480), extras=[]),
    "ember-draft": dict(stage="III", hull="lamplighter", scale=0.75, at=(1250, 500), extras=["fins"]),
    "copper-gate": dict(stage="I", hull="lamplighter", scale=0.28, at=(700, 780), extras=["gate"]),
    "heart-shell": dict(stage="III", hull="lamplighter", scale=0.25, at=(600, 820), extras=["shell"]),
    "hollow-choir-hall": dict(stage="II", hull="lamplighter", scale=0.3, at=(500, 800), extras=["hall"]),
    "switchback-seventh-drone": dict(stage="I", hull="switchback", scale=1.0, at=(1500, 120),
                                     extras=["span", "towers"]),
    "glasswing-lamp-alignment": dict(stage="II", hull="glasswing", scale=1.5, at=(700, 180), crop_nose=True,
                                     extras=["relaylamp"]),
    "refit-bay": dict(stage="shared", hull="lamplighter", scale=0.9, at=(1280, 330), extras=["workshop"]),
    "carrier-cut": dict(stage="I", hull="lamplighter", scale=0.5, at=(700, 520), extras=["sidecable", "towers"]),
    "scavenger-skiff-hail": dict(stage="I", hull="cars/freight-car", scale=1.0, at=(1500, 380), lamp=False,
                                 extras=["skiff", "towers"]),
}


def ships_meta():
    return json.loads((SHIPS / "ships.json").read_text())


def rope(d, x0, y0, x1, y1, sag, thick, col=(42, 92, 82), hi=(111, 181, 154)):
    pts = []
    for i in range(101):
        u = i / 100
        pts.append((x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + sag * 4 * u * (1 - u)))
    d.line(pts, fill=(12, 20, 22), width=thick + 4)
    d.line(pts, fill=col, width=thick)
    d.line([(x, y - thick * 0.25) for x, y in pts], fill=hi, width=max(1, thick // 4))


def background(stage):
    low, glow = LIGHT[stage]
    a = np.zeros((H, W, 3), np.float64)
    for y in range(H):
        t = y / H
        top = np.array([8, 10, 22])
        horizon = np.array(glow) * 0.55
        c = top * (1 - t ** 1.6) + horizon * t ** 1.6
        if y > H * 0.72:                                      # the cloud sea
            k = (y - H * 0.72) / (H * 0.28)
            c = np.array(low) * (0.9 - 0.3 * k) + np.array([30, 34, 56]) * 0.3
        a[y] = c
    img = Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGB").convert("RGBA")
    d = ImageDraw.Draw(img)
    for k in range(9):                                        # cloud bands
        y = int(H * 0.74 + k * 36)
        d.rectangle((0, y, W, y + 10), fill=tuple(int(v * 1.1) for v in low) + (255,))
    return img, d


def towers(d, stage, n=6, seed=3):
    rng = np.random.default_rng(seed)
    for k in range(n):
        x = int(rng.uniform(80, W - 80))
        h = int(rng.uniform(200, 520))
        base = int(H * 0.76)
        w = int(h * 0.08)
        col = (26, 30, 48)
        d.polygon([(x - w, base), (x + w, base), (x + w // 3, base - h), (x - w // 3, base - h)], fill=col)
        for y in range(base - h + 20, base, 40):
            d.line([(x - w, y), (x + w, y - 30)], fill=(40, 46, 70), width=3)
        d.ellipse((x - 5, base - h - 14, x + 5, base - h - 4), fill=(255, 179, 71))


def tender_layers(hull_id):
    meta = ships_meta()
    e = meta[hull_id.split("/")[-1]]
    hull = Image.open(SHIPS / f"{hull_id}.png").convert("RGBA")
    kind = (e.get("trolley") or {}).get("kind")
    back = front = tm = None
    if kind:
        tm = meta[f"trolley-{kind}"]
        b = Image.open(SHIPS / f"trolley-{kind}-back.png").convert("RGBA")
        f = Image.open(SHIPS / f"trolley-{kind}-front.png").convert("RGBA")
        back, front = b.crop((0, 0, tm["w"], tm["h"])), f.crop((0, 0, tm["w"], tm["h"]))
    return hull, e, back, front, tm


def compose(eid, sc):
    img, d = background(sc["stage"])
    ex = sc.get("extras", [])
    if "towers" in ex:
        towers(d, sc["stage"])
    if "sun" in ex:
        d.ellipse((260, 760, 460, 960), fill=(255, 226, 150))
    if "gate" in ex:
        d.rectangle((1500, 180, 1760, 960), fill=(40, 30, 28)); d.rectangle((1780, 180, 2040, 960), fill=(46, 34, 30))
        d.polygon([(1700, 320), (1840, 240), (1980, 320), (1840, 420)], fill=(90, 60, 30))
    if "shell" in ex:
        for r in (620, 520, 420, 320):
            d.ellipse((1700 - r, 640 - r, 1700 + r, 640 + r), outline=(150, 40, 40), width=26)
        d.ellipse((1640, 560, 1760, 720), fill=(255, 200, 90))
    if "hall" in ex:
        d.rectangle((900, 60, 2500, 1100), fill=(22, 18, 40))
        for x in range(1000, 2450, 140):
            d.rectangle((x, 120, x + 40, 900), fill=(60, 46, 110))
            d.ellipse((x - 20, 180, x + 60, 280), fill=(170, 140, 220))
    if "glasswall" in ex:
        for x in range(0, W, 180):
            d.polygon([(x, 0), (x + 170, 0), (x + 150, 420), (x + 20, 420)], fill=(70, 54, 130))
            d.line([(x + 85, 0), (x + 85, 420)], fill=(180, 150, 240), width=6)
    if "fog" in ex:
        for k in range(6):
            y = 780 + k * 60
            d.rectangle((0, y, W, y + 34), fill=(200, 190, 230))
    if "fins" in ex:
        for x in range(0, W, 120):
            d.polygon([(x, 0), (x + 60, 0), (x + 40, 360), (x + 20, 360)], fill=(40, 20, 22))
            d.line([(x + 30, 0), (x + 30, 360)], fill=(220, 80, 50), width=4)
    if "switchbox" in ex:
        d.rectangle((1480, 420, 1880, 900), fill=(38, 40, 52)); d.rectangle((1500, 440, 1860, 470), fill=(176, 122, 50))
        for x in range(1520, 1860, 60):
            d.rectangle((x, 520, x + 30, 640), fill=(127, 84, 36))
        d.rectangle((1660, 120, 1690, 420), fill=(30, 32, 44)); d.ellipse((1640, 80, 1710, 150), fill=(255, 190, 90))
    if "cables3" in ex:
        for y0, y1 in ((330, 480), (600, 470), (900, 520)):
            rope(d, -40, y0, 1500, y1, 20, 26)
    if "gantry" in ex:
        d.rectangle((600, 820, 2200, 880), fill=(60, 44, 34))
        for x in range(640, 2200, 110):
            d.line([(x, 820), (x + 55, 880)], fill=(90, 62, 40), width=10)
    if "workshop" in ex:
        d.rectangle((0, 0, W, 120), fill=(30, 32, 44)); d.rectangle((0, 1000, W, H), fill=(40, 36, 36))
        d.rectangle((200, 700, 700, 1000), fill=(90, 70, 50)); d.ellipse((380, 140, 480, 240), fill=(255, 200, 110))
    if "span" in ex:
        rope(d, -40, 1040, W + 40, 1000, 40, 30)
        d.rectangle((1700, 990, 1780, 1060), fill=(220, 210, 190)); d.ellipse((1720, 1000, 1750, 1030), fill=(255, 200, 90))
    if "relaylamp" in ex:
        d.rectangle((1700, 0, 2560, 1000), fill=(60, 46, 110))
        for x in range(1720, 2560, 120):
            d.rectangle((x, 0, x + 14, 1000), fill=(30, 26, 50))
        d.line([(2000, 500), (1500, 560)], fill=(176, 122, 50), width=26)
        d.ellipse((1400, 470, 1560, 630), fill=(255, 230, 170))
    if "skiff" in ex:
        d.rectangle((1500 - 400, 520, 1500 - 160, 700), fill=(120, 60, 40))
    if "sidecable" in ex:
        rope(d, -40, 900, W + 40, 820, 60, 30)
        d.rectangle((1500, 760, 1760, 900), fill=(40, 42, 50)); d.polygon([(1560, 820), (1760, 700), (1780, 740)],
                                                                           fill=(150, 150, 170))
    env = img.copy()                                              # the scene without the tender (v5e init)
    # the tender on its carrier
    hull, e, back, front, tm = tender_layers(sc["hull"])
    s = sc["scale"]
    cx, cy = sc["at"]
    cab = e.get("cable", {"x": hull.width // 2, "y": 20})
    layer = Image.new("RGBA", (hull.width + 600, hull.height + 400), (0, 0, 0, 0))
    ox, oy = 300, 200                                            # hull origin inside the layer
    pivot = (ox + cab["x"], oy + cab["y"])
    layer.alpha_composite(hull, (ox, oy))
    if back is not None:
        layer.alpha_composite(back, (pivot[0] - tm["saddle"]["x"], pivot[1] - tm["saddle"]["y"]))
    if sc.get("lamp", True) is False:
        pass
    if sc.get("crop_nose"):
        layer = layer.crop((ox + int(hull.width * 0.55), 0, layer.width, layer.height))
        pivot = (pivot[0] - (ox + int(hull.width * 0.55)), pivot[1])
    lw, lh = int(layer.width * s), int(layer.height * s)
    layer = layer.resize((lw, lh), Image.NEAREST)
    if sc.get("tilt"):
        layer = layer.rotate(sc["tilt"], resample=Image.NEAREST, expand=False, center=(pivot[0] * s, pivot[1] * s))
    x0, y0 = int(cx - pivot[0] * s), int(cy - pivot[1] * s)
    # carrier cable through the pivot (drawn between BACK and FRONT, like the game)
    d2 = ImageDraw.Draw(img)
    if not sc.get("crop_nose"):
        th = max(8, int(12 * s))
        rope(d2, -40, cy - 36, cx, cy, 8, th)                  # the carrier passes through the grip
        rope(d2, cx, cy, W + 40, cy - 28, 8, th)
    img.alpha_composite(layer, (x0, y0))
    if front is not None and not sc.get("crop_nose"):
        fl = front.resize((int(front.width * s), int(front.height * s)), Image.NEAREST)
        if sc.get("tilt"):
            fl = fl.rotate(sc["tilt"], resample=Image.NEAREST, expand=False,
                           center=(tm["saddle"]["x"] * s, tm["saddle"]["y"] * s))
        img.alpha_composite(fl, (int(cx - tm["saddle"]["x"] * s), int(cy - tm["saddle"]["y"] * s)))
    # repaint mask: the scene is repainted fully; the tender (hull, trolley, the carrier through its grip) only
    # lightly (value 50/255), so Krea keeps our car and paints the world around it
    tm_mask = Image.new("L", (W, H), 255)
    sil = Image.new("L", (W, H), 0)
    sil.paste(layer.getchannel("A").point(lambda v: 255 if v > 0 else 0), (x0, y0))
    if front is not None and not sc.get("crop_nose"):
        fa = fl.getchannel("A").point(lambda v: 255 if v > 0 else 0)
        sil.paste(fa, (int(cx - tm["saddle"]["x"] * s), int(cy - tm["saddle"]["y"] * s)), fa)
    from PIL import ImageFilter
    sil = sil.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(4))
    tm_mask.paste(50, (0, 0), sil)
    OUT.mkdir(parents=True, exist_ok=True)
    tm_mask.save(OUT / f"{eid}-mask.png")
    # v5e: the env init has the empty carrier; the overlay (carrier + tender, the game's draw order) is composited
    # onto the pixelized scene by tools/art/finalize_v5.py, so the world's tenders are exactly our cars
    de = ImageDraw.Draw(env)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    do = ImageDraw.Draw(ov)
    if not sc.get("crop_nose"):
        th = max(8, int(12 * s))
        for dd in (de, do):
            rope(dd, -40, cy - 36, cx, cy, 8, th)
            rope(dd, cx, cy, W + 40, cy - 28, 8, th)
    tl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    tl.alpha_composite(layer, (x0, y0))
    back_ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    back_ov.alpha_composite(tl)
    back_ov.alpha_composite(ov)                                  # carrier over hull + BACK
    if front is not None and not sc.get("crop_nose"):
        back_ov.alpha_composite(fl, (int(cx - tm["saddle"]["x"] * s), int(cy - tm["saddle"]["y"] * s)))
    env.convert("RGB").save(OUT / f"{eid}-env-init.png")
    back_ov.save(OUT / f"{eid}-overlay.png")
    img.convert("RGB").save(OUT / f"{eid}-init.png")
    (OUT / f"{eid}.json").write_text(json.dumps(dict(sc, size=[W, H]), indent=1) + "\n")
    return img


if __name__ == "__main__":
    ids = sys.argv[1:] or list(SCENES)
    for eid in ids:
        compose(eid, SCENES[eid])
        print(eid)
