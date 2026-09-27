#!/usr/bin/env python3
"""Render zoomed contact sheets of the atlases to tools/sprites/preview/*.png.

    preview.py                         # every atlas, x4, dark background
    preview.py crew --filter linefolk  # frames whose name contains 'linefolk' (comma = OR)
    preview.py ui --scale 3 --bg floor
    preview.py ui --slices             # 9-slices stretched to several sizes
    preview.py crew --scene            # in-context scene (rooms, crew, props) at x3

Each cell shows the frame on a solid background with small anchor ticks (ax/ay) on the cell border, labelled with
its frame name. Long sheets are split into pages (<name>-p2.png ...).
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SPR = os.path.join(ROOT, "public", "sprites")
OUT = os.path.join(HERE, "preview")

BGS = {
    "dark": (19, 26, 43),     # k2
    "black": (7, 8, 15),      # k0
    "floor": (40, 53, 86),    # k4
    "mid": (107, 112, 134),   # s1
    "light": (233, 223, 196), # i3
}
FONT = ImageFont.load_default()


def load(name):
    doc = json.load(open(os.path.join(SPR, f"{name}.json")))
    img = Image.open(os.path.join(SPR, doc["image"])).convert("RGBA")
    return doc, img


def frame_img(img, f):
    return img.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))


def sheet(name, filt=None, scale=4, bg="dark", maxw=1600, maxh=1500, tag=None, cols_hint=None):
    doc, img = load(name)
    frames = list(doc["frames"].items())
    if filt:
        keys = [k.strip() for k in filt.split(",")]
        frames = [(n, f) for n, f in frames if any(k in n for k in keys)]
    if not frames:
        print("no frames match", filt)
        return []
    bgc = BGS[bg]
    cells = []
    for n, f in frames:
        fi = frame_img(img, f).resize((f["w"] * scale, f["h"] * scale), Image.NEAREST)
        label = n
        tw = int(FONT.getlength(label))
        cw = max(fi.width, tw) + 8
        ch = fi.height + 16
        cells.append((n, f, fi, label, cw, ch))
    pages, cur, x, y, row_h, width = [], [], 0, 0, 0, 0
    for c in cells:
        if x + c[4] > maxw and x > 0:
            y += row_h + 6
            x, row_h = 0, 0
        if y + c[5] > maxh and cur:
            pages.append((cur, width, y))
            cur, x, y, row_h, width = [], 0, 0, 0, 0
        cur.append((c, x, y))
        x += c[4] + 6
        width = max(width, x)
        row_h = max(row_h, c[5])
    pages.append((cur, width, y + row_h))
    os.makedirs(OUT, exist_ok=True)
    outs = []
    for pi, (cells_p, w, h) in enumerate(pages):
        sheet = Image.new("RGBA", (w + 8, h + 8), (12, 15, 28, 255))
        d = ImageDraw.Draw(sheet)
        for (n, f, fi, label, cw, ch), x, y in cells_p:
            x += 4
            y += 4
            d.rectangle((x, y, x + fi.width + 3, y + fi.height + 3), fill=bgc + (255,))
            sheet.alpha_composite(fi, (x + 2, y + 2))
            # anchor ticks
            axp = x + 2 + f["ax"] * scale + scale // 2
            ayp = y + 2 + f["ay"] * scale + scale // 2
            tick = (255, 0, 200, 255)
            d.line((axp, y, axp, y + 1), fill=tick)
            d.line((axp, y + fi.height + 2, axp, y + fi.height + 3), fill=tick)
            d.line((x, ayp, x + 1, ayp), fill=tick)
            d.line((x + fi.width + 2, ayp, x + fi.width + 3, ayp), fill=tick)
            d.text((x, y + fi.height + 5), label, fill=(233, 223, 196, 255), font=FONT)
        suffix = f"-{tag}" if tag else ""
        pg = f"-p{pi + 1}" if len(pages) > 1 else ""
        path = os.path.join(OUT, f"{name}{suffix}{pg}.png")
        sheet.save(path)
        outs.append(path)
    return outs


def slices_sheet(name, scale=3):
    doc, img = load(name)
    sl = doc.get("slices", {})
    if not sl:
        return []
    sizes = [(48, 24), (96, 40), (160, 64)]
    rows = []
    for n, s in sl.items():
        src = img.crop((s["x"], s["y"], s["x"] + s["w"], s["y"] + s["h"]))
        row = []
        for W, H in sizes:
            W, H = max(W, s["l"] + s["r"] + 1), max(H, s["t"] + s["b"] + 1)
            row.append(nine(src, s, W, H).resize((W * scale, H * scale), Image.NEAREST))
        rows.append((n, row))
    tw = sum(r.width for r in rows[0][1]) + 12 * len(sizes) + 160
    th = sum(max(r.height for r in row) + 10 for _, row in rows) + 10
    sheet = Image.new("RGBA", (tw, th), (7, 8, 15, 255))
    d = ImageDraw.Draw(sheet)
    y = 6
    for n, row in rows:
        d.text((6, y + 4), n, fill=(233, 223, 196, 255), font=FONT)
        x = 160
        for r in row:
            sheet.alpha_composite(r, (x, y))
            x += r.width + 12
        y += max(r.height for r in row) + 10
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{name}-slices.png")
    sheet.save(path)
    return [path]


def nine(src, s, W, H):
    l, t, r, b = s["l"], s["t"], s["r"], s["b"]
    sw, sh = src.width, src.height
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    xs = [(0, l, 0, l), (l, sw - r, l, W - r), (sw - r, sw, W - r, W)]
    ys = [(0, t, 0, t), (t, sh - b, t, H - b), (sh - b, sh, H - b, H)]
    for sx0, sx1, dx0, dx1 in xs:
        for sy0, sy1, dy0, dy1 in ys:
            if sx1 <= sx0 or sy1 <= sy0 or dx1 <= dx0 or dy1 <= dy0:
                continue
            piece = src.crop((sx0, sy0, sx1, sy1)).resize((dx1 - dx0, dy1 - dy0), Image.NEAREST)
            out.alpha_composite(piece, (dx0, dy0))
    return out


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--filter")
    ap.add_argument("--scale", type=int, default=4)
    ap.add_argument("--bg", default="dark", choices=list(BGS))
    ap.add_argument("--tag")
    ap.add_argument("--maxw", type=int, default=1600)
    ap.add_argument("--slices", action="store_true")
    ap.add_argument("--scene", action="store_true")
    a = ap.parse_args(argv)
    names = a.names or sorted(f[:-5] for f in os.listdir(SPR) if f.endswith(".json"))
    for n in names:
        if a.scene:
            import scenes
            outs = scenes.render(n)
        elif a.slices:
            outs = slices_sheet(n, a.scale)
        else:
            outs = sheet(n, a.filter, a.scale, a.bg, a.maxw, tag=a.tag or (a.filter.replace(",", "+") if a.filter else None))
        for o in outs:
            print(os.path.relpath(o))


if __name__ == "__main__":
    sys.path.insert(0, HERE)
    main(sys.argv[1:])
