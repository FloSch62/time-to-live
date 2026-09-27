#!/usr/bin/env python3
"""Contact sheets for candidates: raw render (reduced) | pixelized at 1x | pixelized at 2x (the in-game zoom
for backgrounds; sprites are drawn 1x on a 2x-scaled window, so 2x is how a player sees them).

  python sheet.py OUT.png [--title T] [--zoom 2] [--params JSON] [--raw] CAND.png ...

Each CAND is pixelized with the params of the recipe for its group (tools/art/recipes.py) unless --params.
Sprites (alpha) are shown over the in-game dark space colour.
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ART = Path(__file__).resolve().parent
sys.path.insert(0, str(ART.parent / "tools"))
sys.path.insert(0, str(ART.parent / "tools" / "art"))
from pixelize import pixelize  # noqa: E402
import recipes  # noqa: E402

SPACE = (12, 15, 28)


def font(sz):
    try:
        return ImageFont.truetype("DejaVuSans.ttf", sz)
    except OSError:
        return ImageFont.load_default()


def render_row(path, params, zoom, raw):
    rec = json.loads(path.with_suffix(".json").read_text()) if path.with_suffix(".json").exists() else {}
    size = tuple(rec.get("size") or params.pop("size"))
    p = recipes.params_for(rec, path) if params is None else dict(params)
    with Image.open(path) as im:
        px, info = pixelize(im, size, **p)
        src = im.convert("RGB")
    tiles = []
    if raw:
        r = src.copy()
        r.thumbnail((size[0] * zoom, size[1] * zoom), Image.LANCZOS)
        tiles.append(r)
    for z in (1, zoom):
        t = Image.new("RGB", (size[0] * z, size[1] * z), SPACE)
        big = px.resize((size[0] * z, size[1] * z), Image.NEAREST)
        if big.mode == "RGBA":
            t.paste(big, (0, 0), big)
        else:
            t = big.convert("RGB")
        tiles.append(t)
    return tiles, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--title", default="")
    ap.add_argument("--zoom", type=int, default=2)
    ap.add_argument("--params")
    ap.add_argument("--raw", action="store_true", default=True)
    ap.add_argument("--no-raw", dest="raw", action="store_false")
    ap.add_argument("items", nargs="+")
    a = ap.parse_args()
    params = json.loads(a.params) if a.params else None
    rows = []
    for item in a.items:
        for path in sorted(Path().glob(item)) if any(c in item for c in "*?[") else [Path(item)]:
            tiles, info = render_row(path, params and dict(params), a.zoom, a.raw)
            rows.append((path.stem, tiles, info))
    pad, lab = 8, 18
    width = max(sum(t.width for t in tiles) + pad * (len(tiles) + 1) for _, tiles, _ in rows)
    top = 30 if a.title else 0
    height = top + sum(max(t.height for t in tiles) + lab + pad for _, tiles, _ in rows) + pad
    sheet = Image.new("RGB", (width, height), (24, 24, 30))
    d = ImageDraw.Draw(sheet)
    if a.title:
        d.text((pad, 6), a.title, fill=(240, 230, 205), font=font(18))
    y = top + pad
    for name, tiles, info in rows:
        d.text((pad, y), f"{name}   colours {info['colors_used']}  extra {len(info['extra_colors'])}",
               fill=(220, 214, 200), font=font(13))
        x = pad
        for t in tiles:
            sheet.paste(t, (x, y + lab))
            x += t.width + pad
        y += max(t.height for t in tiles) + lab + pad
    out = Path(a.out)
    if not out.is_absolute():
        out = ART / "sheets" / out
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main()
