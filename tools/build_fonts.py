#!/usr/bin/env python3
"""Rasterise the bundled OFL pixel fonts into bitmap atlases at their native pixel sizes.

Run: tools/.venv/bin/python tools/build_fonts.py
Output: public/fonts/<id>.png (white glyphs on transparent) + public/fonts/<id>.json + OFL licences.
Glyph record: [x, y, w, h, ox, oy, adv] where (ox, oy) is the offset from the pen (baseline) to the glyph's top-left.
"""
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "fonts-src"
OUT = ROOT / "public" / "fonts"

FONTS = {
    # id: (file, size in px, extra line gap, licence file)
    "body": ("Jersey10-Regular.ttf", 1400 / 75, 3, "jersey10-OFL.txt"),
    "head": ("Jersey15-Regular.ttf", 27, 3, "jersey15-OFL.txt"),
    "big": ("Jersey20-Regular.ttf", 34, 4, "jersey10-OFL.txt"),
    "label": ("Silkscreen-Regular.ttf", 8, 2, "silkscreen-OFL.txt"),
    "labelb": ("Silkscreen-Bold.ttf", 8, 2, "silkscreen-OFL.txt"),
    "small": ("Tiny5-Regular.ttf", 8, 2, "tiny5-OFL.txt"),
}

CHARS = "".join(chr(c) for c in range(32, 127)) + "·—–…’‘“”éèàäöüßÉÖÜÄ×→←↑↓•°±½"


def build(fid, file, size, gap, lic):
    font = ImageFont.truetype(str(SRC / file), size)
    font.set_variation_by_name  # noqa: B018 (keep pillow happy for static fonts)
    ascent, descent = font.getmetrics()
    from fontTools.ttLib import TTFont

    cmap = TTFont(str(SRC / file)).getBestCmap()
    glyphs = {}
    cells = []
    for ch in CHARS:
        if ord(ch) not in cmap:
            continue
        adv = round(font.getlength(ch))
        box = font.getbbox(ch, anchor="ls")  # relative to baseline origin
        w, h = box[2] - box[0], box[3] - box[1]
        if w <= 0 or h <= 0:
            glyphs[ch] = [0, 0, 0, 0, 0, 0, adv]
            continue
        img = Image.new("L", (w + 4, h + 4), 0)
        d = ImageDraw.Draw(img)
        d.fontmode = "1"
        d.text((2 - box[0], 2 - box[1]), ch, font=font, fill=255, anchor="ls")
        bb = img.getbbox()
        if not bb:
            glyphs[ch] = [0, 0, 0, 0, 0, 0, adv]
            continue
        crop = img.crop(bb)
        ox = bb[0] - 2 + box[0]
        oy = bb[1] - 2 + box[1]
        cells.append((ch, crop, ox, oy, adv))
    # pack in rows
    width = 256
    x = y = rowh = 0
    placed = []
    for ch, crop, ox, oy, adv in cells:
        if x + crop.width + 1 > width:
            x, y, rowh = 0, y + rowh + 1, 0
        placed.append((ch, crop, x, y, ox, oy, adv))
        x += crop.width + 1
        rowh = max(rowh, crop.height)
    height = y + rowh + 1
    atlas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for ch, crop, px, py, ox, oy, adv in placed:
        a = crop.point(lambda v: 255 if v > 127 else 0)
        solid = Image.new("RGBA", crop.size, (255, 255, 255, 255))
        atlas.paste(solid, (px, py), a)
        glyphs[ch] = [px, py, crop.width, crop.height, ox, oy, adv]
    atlas.save(OUT / f"{fid}.png")
    ascii_recs = [glyphs[c] for c in CHARS[:95] if c in glyphs and glyphs[c][2] > 0]
    top = min(r[5] for r in ascii_recs)  # most negative: highest pixel above the baseline
    bottom = max(r[5] + r[3] for r in ascii_recs)
    meta = {
        "id": fid,
        "top": top,
        "bottom": bottom,
        "file": file,
        "size": size,
        "ascent": ascent,
        "descent": descent,
        "lineHeight": bottom - top + gap,
        "capHeight": -(font.getbbox("H", anchor="ls")[1]),
        "glyphs": glyphs,
    }
    (OUT / f"{fid}.json").write_text(json.dumps(meta, separators=(",", ":")))
    shutil.copy(SRC / lic, OUT / lic)
    print(f"{fid}: {len(glyphs)} glyphs, atlas {width}x{height}, line {meta['lineHeight']}, cap {meta['capHeight']}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for fid, (file, size, gap, lic) in FONTS.items():
        build(fid, file, size, gap, lic)


if __name__ == "__main__":
    main()
