#!/usr/bin/env python3
"""Review contact sheets: every candidate of the given assets, pixelized exactly as finalize would, at 1x and zoomed.

  python review.py GROUP [ID ...] [--zoom 2] [--out NAME] [--versions a,b] [--rooms]

Sheets land in art-src/sheets/<NAME or GROUP>.png. Vessels are shown on the space colour, optionally with the room
grid covered (--rooms) the way the game draws rooms over the hull; objects (weapons/drones/props) are auto-cropped.
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ART = Path(__file__).resolve().parent
ROOT = ART.parent
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "art"))
from pixelize import pixelize  # noqa: E402
import recipes  # noqa: E402
import objects  # noqa: E402

SPACE = (12, 15, 28)


def font(sz):
    try:
        return ImageFont.truetype("DejaVuSans.ttf", sz)
    except OSError:
        return ImageFont.load_default()


def render(group, aid, path, rooms):
    rec = json.loads(path.with_suffix(".json").read_text())
    rec = dict(rec, group=group, id=aid)
    p = recipes.params_for(rec)
    with Image.open(path) as im:
        if group in ("weapons", "drones", "props"):
            size = tuple(rec["size"])
            bbox, _ = objects.object_bbox(im)
            crop, _ = objects.framed_crop(im, bbox, size)
            px, info = pixelize(crop, size, **p)
        elif group in ("ships", "cars"):
            meta = json.loads((recipes.INIT / f"{aid}.json").read_text())
            px, info = pixelize(im, tuple(meta["canvas"]), **p)
        else:
            px, info = pixelize(im, tuple(rec["size"]), **p)
    tile = Image.new("RGBA", px.size, SPACE + (255,))
    tile.alpha_composite(px.convert("RGBA"))
    if rooms and group in ("ships", "cars"):
        g = meta.get("grid")
        if g:
            d = ImageDraw.Draw(tile, "RGBA")
            for cx in range(g["cols"]):
                for cy in range(g["rows"]):
                    x, y = g["x"] + cx * 32, g["y"] + cy * 32
                    d.rectangle((x, y, x + 31, y + 31), fill=(58, 62, 78, 235), outline=(20, 22, 30, 255))
        if meta.get("cable"):
            d = ImageDraw.Draw(tile)
            d.line((0, meta["cable"]["y"], tile.width, meta["cable"]["y"]), fill=(151, 69, 42), width=3)
    return tile.convert("RGB"), info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("group")
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--zoom", type=int, default=2)
    ap.add_argument("--out")
    ap.add_argument("--versions")
    ap.add_argument("--rooms", action="store_true")
    ap.add_argument("--no-1x", dest="one", action="store_false", default=True)
    a = ap.parse_args()
    base = ART / "cand" / a.group
    ids = a.ids or sorted(p.name for p in base.iterdir() if p.is_dir())
    vers = set(a.versions.split(",")) if a.versions else None
    rows = []
    for aid in ids:
        cands = sorted((base / aid).glob(f"{aid}-*.png"))
        if vers:
            cands = [c for c in cands if c.stem[len(aid) + 1:].split("-")[0] in vers]
        tiles = []
        for c in cands:
            try:
                t, info = render(a.group, aid, c, a.rooms)
            except Exception as e:  # keep the sheet going
                print("skip", c.name, e)
                continue
            tiles.append((c.stem[len(aid) + 1:], t, info["colors_used"]))
        if tiles:
            rows.append((aid, tiles))
    if not rows:
        print("nothing to show")
        return
    z = a.zoom
    pad, lab = 8, 16
    tw = max(t.width for _, ts in rows for _, t, _ in ts)
    th = max(t.height for _, ts in rows for _, t, _ in ts)
    cell_w = tw * z + (tw + pad if a.one else 0) + pad
    ncol = max(len(ts) for _, ts in rows)
    W = pad + ncol * cell_w
    H = sum(th * z + lab * 2 + pad for _ in rows) + pad
    sheet = Image.new("RGB", (W, H), (26, 26, 32))
    d = ImageDraw.Draw(sheet)
    y = pad
    for aid, ts in rows:
        d.text((pad, y), aid, fill=(240, 228, 200), font=font(14))
        for k, (tag, t, nc) in enumerate(ts):
            x = pad + k * cell_w
            d.text((x, y + lab), f"{tag}  ({nc} col)", fill=(200, 196, 186), font=font(11))
            sheet.paste(t.resize((t.width * z, t.height * z), Image.NEAREST), (x, y + lab * 2))
            if a.one:
                sheet.paste(t, (x + t.width * z + pad, y + lab * 2))
        y += th * z + lab * 2 + pad
    out = ART / "sheets" / f"{a.out or a.group}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main()
