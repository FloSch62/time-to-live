#!/usr/bin/env python3
"""A2: rear cars in line with the tenders (lead, 27 Sep): baked trolley erased, a saddle on the roof, the separate
`car` drive trolley (tools/art/trolley.py, same parts and sketch as the tenders', compact), hardpoint plates at
every mount, keepClear and weaponEnvelope in ships.json.

  python tools/art/cars_v5.py              (all rear cars; the originals are kept in art-src/kit/cars/)

Every rear car keeps its cable anchor (172, 20) and roof line (92): the carriage rides the carrier line exactly as the
lead car's does (72 px from the carrier to the roof on every car). The Armory Car's roof gun moves to the rear end of
the car, clear of the trolley's hanger and saddle (a rear car is the last car of the consist, so its rear is open).
"""
import datetime
import hashlib
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "public" / "art" / "ships"
ART = ROOT / "art-src"
KIT = ART / "kit" / "cars"
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "art"))
import trolley  # noqa: E402
from mounts_v5 import LEFT, RIGHT, UP, plate  # noqa: E402

REAR = ("armory-car", "bunk-car", "drone-car", "freight-car", "veil-car")
ROOF = 92
TROLLEY_SPAN = (88, 262)          # the baked trolley's columns (all rear cars share the pattern)
MOUNTS = {"armory-car": {"roof": [(18, 100)], "belly": []}}


def refit(cid):
    ships = json.loads((PUB / "ships.json").read_text())
    e = ships[cid]
    src = PUB.parent / e["file"]
    KIT.mkdir(parents=True, exist_ok=True)
    kept = KIT / f"{cid}.png"
    if not kept.exists():
        shutil.copy(src, kept)
    a = np.asarray(Image.open(kept).convert("RGBA")).copy()
    x0, x1 = TROLLEY_SPAN
    a[:ROOF, x0:x1] = 0                                              # the baked trolley and its pylon
    cx, cy = e["cable"]["x"], e["cable"]["y"]
    w, h = trolley.SADDLE["car"]
    sad = trolley.snap_hull_palette(trolley.saddle_sprite(w, h))
    img = Image.fromarray(a, "RGBA")
    img.alpha_composite(Image.fromarray(sad, "RGBA"), (cx - w // 2, ROOF - h + 2))
    a = np.asarray(img).copy()
    m = MOUNTS.get(cid, {"roof": [], "belly": []})
    for mx, my in m["roof"]:
        plate(a, mx, my, w=34)
    for mx, my in m["belly"]:
        plate(a, mx, my, belly=True, w=34)
    Image.fromarray(a, "RGBA").save(src, optimize=True)
    tm = ships.get("trolley-car", {})
    half = 115
    low = w // 2
    e["trolley"] = {"kind": "car", "pivot": {"x": cx, "y": ROOF}, "saddle": {"x": cx, "y": cy}}
    e["keepClear"] = [
        {"what": "drive trolley (car): carriage and sheaves", "x": cx - half, "y": cy - 70, "w": 2 * half, "h": 76},
        {"what": "drive trolley (car): hanger and saddle", "x": cx - low, "y": cy + 6, "w": 2 * low, "h": 66}]
    e["weaponEnvelope"] = {"up": UP, "left": LEFT, "right": RIGHT}
    if cid in MOUNTS:
        e["mounts"] = [{"x": x, "y": y} for x, y in m["roof"] + m["belly"]]
    (PUB / "ships.json").write_text(json.dumps(ships, indent=1) + "\n")
    man_path = ART / "manifest.json"
    man = json.loads(man_path.read_text())
    rec = man.setdefault("cars", {}).setdefault(cid, {})
    rec["trolley_refit"] = {"date": datetime.date.today().isoformat(), "tool": "tools/art/cars_v5.py",
                            "erased": [x0, 0, x1, ROOF], "saddle": [w, h], "mounts": e.get("mounts"),
                            "before": str(kept.relative_to(ROOT))}
    rec["sha256"] = hashlib.sha256(src.read_bytes()).hexdigest()
    man_path.write_text(json.dumps(man, indent=1, sort_keys=True) + "\n")
    print(cid, e["trolley"], e.get("mounts"))


if __name__ == "__main__":
    for c in sys.argv[1:] or REAR:
        refit(c)
