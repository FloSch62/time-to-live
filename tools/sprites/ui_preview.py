#!/usr/bin/env python3
"""UI-specific previews (helper for iterating on ui.py; the general contact sheets come from preview.py).

    ui_preview.py slices [filter] [--scale N]   9-slices stretched to 3 sizes, in a compact grid
    ui_preview.py mock [--scale N]              a mock screen at HD density (layout x atlas scale), 9-slices TILED
                                                like src/core/gfx.ts
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import preview  # noqa: E402

OUT = os.path.join(HERE, "preview")


def slices(filt=None, scale=3, cols=3):
    doc, img = preview.load("ui")
    sl = [(n, s) for n, s in doc["slices"].items() if not filt or any(k in n for k in filt.split(","))]
    K = doc.get("scale", 1)
    sizes = [(14 * K, 11 * K), (37 * K, 23 * K), (83 * K, 45 * K)]
    cells = []
    for n, s in sl:
        src = img.crop((s["x"], s["y"], s["x"] + s["w"], s["y"] + s["h"]))
        parts = []
        for W, H in sizes:
            W, H = max(W, s["l"] + s["r"] + 2), max(H, s["t"] + s["b"] + 2)
            parts.append(tile9(doc, img, n, W, H).resize((W * scale, H * scale), Image.NEAREST))
        cells.append((n, parts))
    cw = sum(p.width for p in cells[0][1]) + 8 * len(sizes)
    ch = max(p.height for p in cells[0][1]) + 18
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * (cw + 12) + 8, rows * ch + 8), (40, 53, 86, 255))
    d = ImageDraw.Draw(sheet)
    for i, (n, parts) in enumerate(cells):
        x0 = 8 + (i % cols) * (cw + 12)
        y0 = 4 + (i // cols) * ch
        d.text((x0, y0), n, fill=(244, 236, 214, 255), font=preview.FONT)
        x = x0
        for p in parts:
            sheet.alpha_composite(p, (x, y0 + 12))
            x += p.width + 8
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"ui-slices{'-' + filt.replace(',', '+') if filt else ''}.png")
    sheet.save(path)
    print(os.path.relpath(path))


def tile9(doc, img, n, W, H):
    """9-slice exactly like src/core/gfx.ts nineSlice: corners copied, edges and centre TILED (never stretched)."""
    s = doc["slices"][n]
    l, t, r, b = s["l"], s["t"], s["r"], s["b"]
    sx, sy, sw, sh = s["x"], s["y"], s["w"], s["h"]
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cw, ch = sw - l - r, sh - t - b
    iw, ih = max(0, W - l - r), max(0, H - t - b)

    def blit(px, py, pw, ph, dx, dy):
        if pw > 0 and ph > 0:
            out.alpha_composite(img.crop((px, py, px + pw, py + ph)), (dx, dy))

    def tilef(px, py, pw, ph, dx, dy, dw, dh):
        if pw <= 0 or ph <= 0 or dw <= 0 or dh <= 0:
            return
        yy = 0
        while yy < dh:
            hh = min(ph, dh - yy)
            xx = 0
            while xx < dw:
                ww = min(pw, dw - xx)
                blit(px, py, ww, hh, dx + xx, dy + yy)
                xx += pw
            yy += ph
    blit(sx, sy, l, t, 0, 0)
    blit(sx + sw - r, sy, r, t, W - r, 0)
    blit(sx, sy + sh - b, l, b, 0, H - b)
    blit(sx + sw - r, sy + sh - b, r, b, W - r, H - b)
    tilef(sx + l, sy, cw, t, l, 0, iw, t)
    tilef(sx + l, sy + sh - b, cw, b, l, H - b, iw, b)
    tilef(sx, sy + t, l, ch, 0, t, l, ih)
    tilef(sx + sw - r, sy + t, r, ch, W - r, t, r, ih)
    tilef(sx + l, sy + t, cw, ch, l, t, iw, ih)
    return out


def mock(scale=1):
    """A mock screen drawn the way the framework draws it: layout units x2 (HD density, 1 atlas px = 1 physical px
    at 1080p), 9-slices tiled. `scale` magnifies the result for inspection."""
    doc, img = preview.load("ui")
    K = doc.get("scale", 1)
    F = doc["frames"]
    try:
        idoc, iimg = preview.load("icons")
        IK = idoc.get("scale", 1)
    except Exception:
        idoc, iimg, IK = None, None, 1
    font = ImageFont.load_default(size=8 * K) if hasattr(ImageFont, "load_default") else preview.FONT

    def fr(n):
        f = F[n]
        return img.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))

    def put(canvas, n, x, y, anchor=True):
        f = F[n]
        canvas.alpha_composite(fr(n), (int(x * K) - (f["ax"] if anchor else 0), int(y * K) - (f["ay"] if anchor else 0)))

    def icon(canvas, n, x, y):
        if idoc and n in idoc["frames"]:
            f = idoc["frames"][n]
            im = iimg.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
            if IK != K:
                im = im.resize((im.width * K // IK, im.height * K // IK), Image.NEAREST)
            canvas.alpha_composite(im, (int(x * K), int(y * K)))

    def nine(canvas, n, x, y, w, h):
        canvas.alpha_composite(tile9(doc, img, n, int(w * K), int(h * K)), (int(x * K), int(y * K)))

    W, H = 480, 270
    c = Image.new("RGBA", (W * K, H * K), (12, 15, 28, 255))
    d = ImageDraw.Draw(c)

    def text(x, y, t, col=(233, 223, 196, 255)):
        d.text((x * K, y * K), t, fill=col, font=font)

    nine(c, "panel", 8, 14, 190, 152)
    nine(c, "title-plate", 40, 6, 126, 20)
    text(72, 11, "SHIP SYSTEMS")
    y = 32
    for i, (n, wdt) in enumerate((("button-normal", 120), ("button-hover", 90), ("button-pressed", 70),
                                  ("button-disabled", 110), ("button-blue", 116), ("button-danger", 60))):
        hh = 24 if i % 2 == 0 else 20
        nine(c, n, 18, y, wdt, hh)
        text(26, y + (hh - 9) / 2 + (1 if "pressed" in n else 0), n.replace("button-", ""),
             (127, 247, 230, 255) if "blue" in n else (255, 138, 107, 255) if "danger" in n else (233, 223, 196, 255))
        y += 26 if i % 2 == 0 else 22
    for i, k in enumerate(("J", "Space", "1")):
        wdt = 6 + 5 * len(k)
        nine(c, "panel-dark", 150, 34 + i * 14, wdt, 11)
        text(153, 35 + i * 14, k)
    nine(c, "panel-dark", 150, 80, 14, 14)
    nine(c, "panel-hi", 168, 80, 14, 14)
    d.rectangle(((168 + 4) * K, 84 * K, (168 + 10) * K - 1, 90 * K - 1), fill=(63, 211, 201, 255))
    d.rectangle((150 * K, 105 * K, 188 * K, 107 * K), fill=(7, 8, 15, 255))
    d.rectangle((150 * K, 105 * K, 168 * K, 107 * K), fill=(127, 247, 230, 255))
    nine(c, "button-normal", 165, 100, 7, 12)
    nine(c, "button-hover", 178, 100, 7, 12)
    nine(c, "panel-dark", 140, 120, 50, 20)
    nine(c, "panel-hi", 140, 142, 50, 20)
    for i, n in enumerate(("iconbutton", "iconbutton-hover", "iconbutton-pressed", "iconbutton-on")):
        nine(c, n, 206 + i * 28, 6, 24, 24)
        icon(c, "glyph-pause", 206 + i * 28 + 2, 6 + 2 + (1 if "pressed" in n else 0))
    for i, n in enumerate(("panel-bright", "panel-danger", "panel-glass", "panel-copper", "panel-ember", "panel-flat")):
        x = 206 + (i % 3) * 90
        yy = 36 + (i // 3) * 58
        nine(c, n, x, yy, 84 + (i % 2) * 3, 52 - (i % 3))
        text(x + 10, yy + 10, n.replace("panel-", ""))
    nine(c, "tooltip", 206, 154, 120, 30)
    text(212, 159, "Hop to the next relay.")
    put(c, "tooltip-arrow-up", 230, 150)
    nine(c, "dialog", 8, 170, 250, 94)
    put(c, "dialog-crest", 133, 170)
    text(26, 190, "A lamp blinks at Relay Seven.")
    nine(c, "button-blue", 20, 212, 200, 22)
    text(28, 218, "1. Answer the page.", (127, 247, 230, 255))
    nine(c, "button-normal", 20, 236, 200, 22)
    text(28, 242, "2. Let it ring.")
    nine(c, "panel", 270, 196, 200, 68)
    nine(c, "tab-on", 280, 182, 50, 18)
    nine(c, "tab-off", 332, 182, 50, 18)
    nine(c, "tab-hover", 384, 182, 50, 18)
    for i, n in enumerate(("slot", "slot-hi", "slot-ready", "slot-empty")):
        nine(c, n, 280 + i * 30, 206, 26, 26)
        icon(c, "sys-shields-powered", 283 + i * 30, 209)
    nine(c, "bar-frame", 280, 238, 100, 10)
    for i in range(23):
        put(c, "hull-full" if i < 15 else ("hull-amber" if i < 19 else "hull-empty"), 283 + i * 4, 238, anchor=False)
    for i, st in enumerate(["on", "on", "on", "damaged", "ionised", "off", "slot"]):
        put(c, f"power-{st}", 400, 258 - i * 5, anchor=False)
    put(c, "divider", 432, 252)
    for i, col in enumerate(("amber", "teal", "violet", "ember", "ivory")):
        put(c, f"swatch-{col}" + ("-selected" if i == 1 else "-hover" if i == 3 else ""), 358 + i * 23, 170)
    nine(c, "button-brass", 206, 128, 64, 20)
    text(222, 133, "HOP", (7, 8, 15, 255))
    put(c, "cursor-arrow", 250, 120)
    put(c, "cursor-pointer", 110, 60)
    put(c, "cursor-target", 450, 20)
    if scale != 1:
        c = c.resize((c.width * scale, c.height * scale), Image.NEAREST)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "ui-mock.png")
    c.save(path)
    print(os.path.relpath(path))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("mode")
    ap.add_argument("filter", nargs="?")
    ap.add_argument("--scale", type=int, default=None)
    ap.add_argument("--cols", type=int, default=3)
    a = ap.parse_args()
    if a.mode == "slices":
        slices(a.filter, a.scale or 2, a.cols)
    else:
        mock(a.scale or 1)
