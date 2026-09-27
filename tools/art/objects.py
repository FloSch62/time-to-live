#!/usr/bin/env python3
"""Weapons, drones and set pieces: Krea candidate (object on a flat dark backdrop) -> pixel sprite + metadata.

  python tools/art/objects.py weapons/<id> CAND.png [--params JSON]
  python tools/art/objects.py drones/<id> CAND.png
  python tools/art/objects.py props/<id> CAND.png

Steps: find the object's bounding box against the backdrop (largest non-backdrop component), grow it to the target
aspect with a small margin (padding with the backdrop colour), pixelize (tools/pixelize.py: alpha by border flood,
selective outline) to the exact final size, then derive points from the final alpha/colours:
  weapons: pivot (clamp base: bottom-centre of the lowest opaque rows), muzzle (front-most opaque pixel), lens (lit
           glass clusters: teal/amber/violet ramps; fallback just behind the muzzle), plus a 64x64 icon made from the
           same source crop;
  drones:  rotors (top-most opaque rows: centre + width), lens (as weapons).
Writes public/art/<group>/<id>.png, <group>.json and the provenance record in art-src/manifest.json.
"""
import argparse
import datetime
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "art"))
from pixelize import pixelize, srgb_to_oklab, hex_to_rgb, load_palette  # noqa: E402
import recipes  # noqa: E402

PUBLIC = ROOT / "public" / "art"
ART_SRC = ROOT / "art-src"
LIT = {h for g in ("teal", "amber", "violet") for h in json.loads((ROOT / "public/palette.json").read_text())["groups"][g]}


def object_bbox(im, tol=0.09):
    """Bounding box (x0, y0, x1, y1) of the largest non-backdrop component, in source pixels."""
    from scipy import ndimage
    small = im.convert("RGB").resize((im.width // 4, im.height // 4), Image.BOX)
    lab = srgb_to_oklab(np.asarray(small))
    border = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bg = np.median(border, axis=0)
    fg = np.sqrt(((lab - bg) ** 2).sum(-1)) > tol
    fg = ndimage.binary_opening(fg, iterations=1)
    lab_ids, n = ndimage.label(fg, structure=np.ones((3, 3)))
    if n == 0:
        return (0, 0, im.width, im.height), bg
    sizes = ndimage.sum(fg, lab_ids, index=np.arange(1, n + 1))
    big = np.argmax(sizes) + 1
    # keep components that are at least 3 % of the largest (rotor blades, antennas)
    keep = np.isin(lab_ids, [i + 1 for i, sz in enumerate(sizes) if sz >= 0.03 * sizes[big - 1]])
    ys, xs = np.nonzero(keep)
    return (xs.min() * 4, ys.min() * 4, (xs.max() + 1) * 4, (ys.max() + 1) * 4), bg


def framed_crop(im, bbox, size, margin=0.04):
    """Crop around bbox grown to the target aspect (+margin), padding with the border colour."""
    W, H = size
    x0, y0, x1, y1 = bbox
    bw, bh = x1 - x0, y1 - y0
    bw, bh = bw * (1 + 2 * margin), bh * (1 + 2 * margin)
    if bw / bh > W / H:
        bh = bw * H / W
    else:
        bw = bh * W / H
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    box = [round(cx - bw / 2), round(cy - bh / 2), round(cx + bw / 2), round(cy + bh / 2)]
    arr = np.asarray(im.convert("RGB"))
    border = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]])
    fill = tuple(int(v) for v in np.median(border, axis=0))
    canvas = Image.new("RGB", (box[2] - box[0], box[3] - box[1]), fill)
    canvas.paste(im.convert("RGB"), (-box[0], -box[1]))
    return canvas, box


def lens_points(rgba, max_n=3):
    from scipy import ndimage
    a = np.asarray(rgba)
    lit = np.zeros(a.shape[:2], bool)
    for h in LIT:
        r, g, b = hex_to_rgb(h)
        lit |= (a[..., 0] == r) & (a[..., 1] == g) & (a[..., 2] == b) & (a[..., 3] > 0)
    lab_ids, n = ndimage.label(lit, structure=np.ones((3, 3)))
    pts = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab_ids == i)
        if len(xs) >= 2:
            pts.append((len(xs), int(round(xs.mean())), int(round(ys.mean())), max(2, int(round((len(xs) / 3.14) ** 0.5)))))
    pts.sort(reverse=True)
    return [dict(x=x, y=y, r=r) for _, x, y, r in pts[:max_n]]


def weapon_points(rgba):
    al = np.asarray(rgba)[..., 3] > 0
    ys, xs = np.nonzero(al)
    h = rgba.height
    bottom = ys.max()
    rows = al[max(0, bottom - 2):bottom + 1]
    bx = np.nonzero(rows.any(0))[0]
    pivot = dict(x=int(round(bx.mean())), y=int(bottom))
    right = xs.max()
    my = np.nonzero(al[:, right])[0]
    muzzle = dict(x=int(right), y=int(round(my.mean())))
    lens = lens_points(rgba) or [dict(x=max(0, muzzle["x"] - 3), y=muzzle["y"], r=2)]
    return pivot, muzzle, lens


def rotor_points(rgba):
    al = np.asarray(rgba)[..., 3] > 0
    ys, xs = np.nonzero(al)
    top = ys.min()
    row = np.nonzero(al[top:top + 2].any(0))[0]
    return [dict(x=int(round(row.mean())), y=int(top), w=int(row.max() - row.min() + 1))]


def finalize_object(key, cand, overrides=None, note=None, size=None):
    group, oid = key.split("/")
    cand = Path(cand)
    if not cand.is_absolute():
        cand = (ART_SRC / cand) if (ART_SRC / cand).exists() else (ROOT / cand)
    rec = json.loads(cand.with_suffix(".json").read_text()) if cand.with_suffix(".json").exists() else {}
    size = tuple(size or rec.get("size"))
    params = recipes.params_for(dict(rec, group=group, id=oid), overrides=overrides)
    with Image.open(cand) as im:
        bbox, _ = object_bbox(im)
        crop, box = framed_crop(im, bbox, size)
        out, info = pixelize(crop, size, **params)
        extra = {}
        if group in ("weapons", "drones"):
            icon_crop, _ = framed_crop(im, bbox, (64, 64), margin=0.08)
            icon, _ = pixelize(icon_crop, (64, 64), **params)
            icon_path = PUBLIC / group / f"{oid}-icon.png"
            icon_path.parent.mkdir(parents=True, exist_ok=True)
            icon.save(icon_path, optimize=True)
            extra["icon"] = f"{group}/{oid}-icon.png"
    dest = PUBLIC / group / f"{oid}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, optimize=True)
    sha = hashlib.sha256(dest.read_bytes()).hexdigest()

    js_path = PUBLIC / group / f"{group}.json"
    js = json.loads(js_path.read_text()) if js_path.exists() else {}
    entry = {"file": f"{group}/{oid}.png", "w": out.width, "h": out.height}
    if group == "weapons":
        pivot, muzzle, lens = weapon_points(out)
        entry.update(pivot=pivot, muzzle=muzzle, lens=lens, **extra)
    elif group == "drones":
        entry.update(rotors=rotor_points(out), lens=lens_points(out) or [], **extra)
    if group in ("weapons", "drones"):
        js[oid] = entry
        js_path.write_text(json.dumps(dict(sorted(js.items())), indent=1) + "\n")

    man_path = ART_SRC / "manifest.json"
    man = json.loads(man_path.read_text()) if man_path.exists() else {}
    gen = {k: rec.get(k) for k in ("version", "prompt", "seed", "width", "height", "strength", "shift", "denoise",
                                   "steps", "cfg", "sampler", "scheduler", "models", "comfyui_revision")
           if rec.get(k) is not None}
    if rec.get("refs"):
        gen["refs"] = [r["path"].replace(str(ROOT) + "/", "") for r in rec["refs"]]
    man.setdefault(group, {})[oid] = {
        "file": str(dest.relative_to(ROOT / "public")), "size": list(out.size),
        "source": str(cand.relative_to(ROOT)), "source_crop": box, "engine": "local-krea-2-turbo (ComfyUI)",
        "generation": gen, "pixelize": info["params"], "extra_colors": info["extra_colors"],
        "colors_used": info["colors_used"], "sha256": sha, "date": datetime.date.today().isoformat(),
        **({"note": note} if note else {}), **({"meta": entry} if group in ("weapons", "drones") else {}),
    }
    man_path.write_text(json.dumps(man, indent=1, sort_keys=True) + "\n")
    print(f"final {dest.relative_to(ROOT)} {out.size} colours {info['colors_used']}")
    return dest, entry


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("key")
    ap.add_argument("cand")
    ap.add_argument("--params")
    ap.add_argument("--note")
    a = ap.parse_args()
    finalize_object(a.key, a.cand, json.loads(a.params) if a.params else None, a.note)


if __name__ == "__main__":
    main()
