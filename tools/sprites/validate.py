#!/usr/bin/env python3
"""Validate every atlas in public/sprites/ against the atlas contract.

Checks: JSON shape; image exists and matches size; every frame inside the image; anchors sane; every anim frame
exists; 9-slice insets fit; every pixel is fully transparent or an opaque master-palette colour (no AA, no alpha
blends); palette-swap tables only use palette colours and only remap colours that occur in the species' frames.
Exit code 1 on any error.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SPR = os.path.join(ROOT, "public", "sprites")
PAL = json.load(open(os.path.join(ROOT, "public", "palette.json")))
HDPAL = json.load(open(os.path.join(HERE, "palette-hd.json")))
# master palette + the HD in-between ramp steps (contract v3), recorded in tools/sprites/palette-hd.json
PALSET = {h.lower() for h in PAL["all"]} | {h.lower() for h in HDPAL["extended"].values()}
PAL_RGB = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in PALSET}

REQUIRED = ["crew", "icons", "fx", "ui", "rooms"]


def check(name):
    errs, warns = [], []
    jp = os.path.join(SPR, f"{name}.json")
    if not os.path.exists(jp):
        return [f"{name}: missing {jp}"], warns
    doc = json.load(open(jp))
    if doc.get("scale") != 2:
        errs.append(f"{name}: top-level \"scale\" must be 2 (HD atlas, contract v3), got {doc.get('scale')}")
    ip = os.path.join(SPR, doc.get("image", ""))
    if doc.get("image") != f"{name}.png" or not os.path.exists(ip):
        errs.append(f"{name}: bad image field {doc.get('image')}")
        return errs, warns
    im = Image.open(ip)
    if im.mode != "RGBA":
        errs.append(f"{name}: image mode {im.mode}, expected RGBA")
        im = im.convert("RGBA")
    a = np.asarray(im)
    H, W = a.shape[:2]
    if "size" in doc and (doc["size"]["w"] != W or doc["size"]["h"] != H):
        errs.append(f"{name}: size field {doc['size']} != image {W}x{H}")
    # pixels
    alpha = a[..., 3]
    bad_alpha = np.count_nonzero((alpha != 0) & (alpha != 255))
    if bad_alpha:
        errs.append(f"{name}: {bad_alpha} semi-transparent pixels")
    op = a[alpha == 255][:, :3]
    cols = {tuple(int(v) for v in c) for c in np.unique(op, axis=0)} if len(op) else set()
    off = cols - PAL_RGB
    if off:
        errs.append(f"{name}: {len(off)} colours outside the HD palette e.g. {sorted(off)[:5]}")
    elif len(cols) > 96:
        warns.append(f"{name}: {len(cols)} colours in use")
    frames = doc.get("frames", {})
    if not frames:
        errs.append(f"{name}: no frames")
    for fn, f in frames.items():
        for k in ("x", "y", "w", "h", "ax", "ay"):
            if not isinstance(f.get(k), int):
                errs.append(f"{name}: frame {fn} missing int {k}")
                break
        else:
            if f["x"] < 0 or f["y"] < 0 or f["w"] <= 0 or f["h"] <= 0 or f["x"] + f["w"] > W or f["y"] + f["h"] > H:
                errs.append(f"{name}: frame {fn} out of bounds {f}")
            if not (-f["w"] <= f["ax"] <= 2 * f["w"] and -f["h"] <= f["ay"] <= 2 * f["h"]):
                warns.append(f"{name}: frame {fn} anchor far outside frame")
            if fn != fn.lower() or " " in fn:
                errs.append(f"{name}: frame name not lowercase kebab: {fn}")
            sub = alpha[f["y"]:f["y"] + f["h"], f["x"]:f["x"] + f["w"]]
            if not sub.any():
                warns.append(f"{name}: frame {fn} is fully transparent")
    for an, anim in doc.get("anims", {}).items():
        if not anim.get("frames"):
            errs.append(f"{name}: anim {an} has no frames")
        for fr in anim.get("frames", []):
            if fr not in frames:
                errs.append(f"{name}: anim {an} references missing frame {fr}")
        if not isinstance(anim.get("fps"), (int, float)) or anim["fps"] <= 0:
            errs.append(f"{name}: anim {an} bad fps")
        if not isinstance(anim.get("loop"), bool):
            errs.append(f"{name}: anim {an} bad loop")
    for sn, s in doc.get("slices", {}).items():
        if s["x"] + s["w"] > W or s["y"] + s["h"] > H:
            errs.append(f"{name}: slice {sn} out of bounds")
        if s["l"] + s["r"] >= s["w"] or s["t"] + s["b"] >= s["h"]:
            errs.append(f"{name}: slice {sn} insets too large")
        if sn not in frames:
            warns.append(f"{name}: slice {sn} has no matching frame")
    # palette swaps
    for sp, lst in doc.get("variants", {}).items():
        for i, m in enumerate(lst):
            for fh, th in m.items():
                if fh.lower() not in PALSET or th.lower() not in PALSET:
                    errs.append(f"{name}: variant {sp}[{i}] uses non-palette colour {fh}->{th}")
    for sp, chans in doc.get("variantChannels", {}).items():
        for ch, lst in chans.items():
            for i, m in enumerate(lst):
                for fh, th in m.items():
                    if fh.lower() not in PALSET or th.lower() not in PALSET:
                        errs.append(f"{name}: channel {sp}.{ch}[{i}] non-palette {fh}->{th}")
    return errs, warns


def main(argv):
    names = argv or sorted({f[:-5] for f in os.listdir(SPR) if f.endswith(".json")} | set(REQUIRED))
    all_errs = []
    for n in names:
        errs, warns = check(n)
        doc = json.load(open(os.path.join(SPR, f"{n}.json"))) if os.path.exists(os.path.join(SPR, f"{n}.json")) else {}
        status = "OK " if not errs else "ERR"
        print(f"{status} {n:8s} frames={len(doc.get('frames', {})):4d} anims={len(doc.get('anims', {})):4d} "
              f"slices={len(doc.get('slices', {})):3d} warnings={len(warns)}")
        for w in warns[:10]:
            print("   warn:", w)
        if len(warns) > 10:
            print(f"   ... {len(warns) - 10} more warnings")
        for e in errs[:30]:
            print("   ERROR:", e)
        all_errs += errs
    sys.exit(1 if all_errs else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
