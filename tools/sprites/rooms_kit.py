"""HD (contract v3, 2x density) painting kit for the rooms atlas.

Everything here paints into an `Img` with hard pixel edges, using shaded masks (hd.py normals + Lambert quantised
into material ramps), bevels, rivets, cylinders, ambient occlusion and small glows. Light: top-left, slightly in
front (hd.LIGHT). Background materials are deliberately dark and low-contrast (rule 8) so crew read on top.
"""
from __future__ import annotations

import math
import random

import numpy as np

import hd
from px import Img, idx, NAME

T = 72          # tile, atlas px (contract v4: 36 layout units)
FLOOR = 64      # first row of the floor plate (lit top edge) = the floor line crew stand on
FLOOR_ROWS = ["b1", "b0h", "b0", "b0", "c0", "k1", "k0h", "k0"]   # rows 64..71, top lip to underside

# ── material ramps (dark -> light) ───────────────────────────────────────────────────────────────────────────
WALL = ["b0", "b0h", "i0~b1", "i0", "i0h", "i1", "i1h"]
WALL_LO = ["k1", "b0", "b0h", "b1", "b1h", "i0~b1", "i0"]
IRON = ["k0h", "k1", "k1h", "k2", "k2h", "k3", "k3h", "k4", "k4h"]
STEEL = ["k2", "k3", "k4", "k5", "k5~s0", "s0", "s0h", "s1", "s1h"]
BRASS_D = ["k0h", "k1", "c0", "b0", "b0h", "b1", "b1h"]             # tarnished brass (background)
RIVET = ["k0h", "k1", "k1h", "c0", "b0", "b0h"]
BRASS = ["c0", "b0", "b0h", "b1", "b1h", "b2", "b2h", "b3", "b3h"]    # device brass (foreground)
IVORY_D = ["k2", "k3", "k4", "i0~b1", "i0", "i0h"]                 # worn enamel (background)
IVORY = ["k4", "i0", "i0h", "i1", "i1h", "i2", "i2h", "i3"]          # enamel (devices, doors)
COPPER_D = ["k0h", "k1", "c0", "c0h", "c1", "c1h"]
VERD_D = ["k0h", "k1", "g0", "g0h", "g1", "g1h"]
WOOD = ["k0h", "k1", "c0", "b0", "c0h", "b0h"]
GLASS = ["k0", "k0h", "k1", "k1h", "k2"]
TEAL_GLOW = ["t0", "t0h", "t1", "t1h", "t2", "t2h", "t3", "t3h", "t4"]
AMBER_GLOW = ["c1", "a0", "a0h", "a1", "a1h", "a2", "a2h", "a3"]


def K(key):
    return idx(key)


# ── low-level ───────────────────────────────────────────────────────────────────────────────────────────────
def put(im: Img, x, y, c):
    im.put(int(x), int(y), c)


def rect_mask(im: Img, x, y, w, h) -> np.ndarray:
    m = np.zeros(im.a.shape, bool)
    m[max(0, y):max(0, y + h), max(0, x):max(0, x + w)] = True
    return m


def paint_mask(im: Img, mask, ramp, value):
    hd.paint(im, mask, value, ramp)


def darken(im: Img, mask, steps=1):
    hd.darken_where(im, mask, steps)


def lighten(im: Img, mask, steps=1):
    hd.lighten_where(im, mask, steps)


def shade_mask(im: Img, mask, ramp, bevel=2, flat=0.52, contrast=1.0, grad=0.0, bias=0.0):
    """Bevelled flat part: faces at `flat` brightness, top/left bevel lit, bottom/right bevel dark.
    `grad` darkens toward the bottom of the part (grime / occlusion)."""
    if not mask.any():
        return
    nx, ny, nz = hd.bevel_normals(mask, bevel)
    v = hd.lambert(nx, ny, nz)
    base = hd.lambert(np.zeros(1), np.zeros(1), np.ones(1))[0]
    v = flat + (v - base) * contrast
    if grad:
        ys = np.nonzero(mask)[0]
        y0, y1 = ys.min(), ys.max() + 1
        Y = np.mgrid[0:mask.shape[0], 0:mask.shape[1]][0]
        v = v - grad * np.clip((Y - y0) / max(1, y1 - y0), 0, 1)
    v = v + bias
    hd.paint(im, mask, np.clip(v, 0, 1), ramp)


def box(im: Img, x, y, w, h, ramp, bevel=2, **kw):
    shade_mask(im, rect_mask(im, x, y, w, h), ramp, bevel, **kw)


def cyl_h(im: Img, x0, x1, y, d, ramp, outline=True, lo=0.0, hi=1.0):
    """Horizontal cylinder (pipe/rail) from x0..x1 (incl.), top row y, diameter d."""
    for j in range(d):
        s = (j + 0.5) / d * 2 - 1              # -1 top .. 1 bottom
        nz = math.sqrt(max(0.0, 1 - s * s))
        v = hd.lambert(np.array([0.0]), np.array([s]), np.array([nz]))[0]
        v = lo + (hi - lo) * v
        k = ramp[min(len(ramp) - 1, int(v * len(ramp)))]
        im.hline(x0, x1, y + j, k)
    if outline:
        im.hline(x0, x1, y + d - 1, ramp[0])


def cyl_v(im: Img, x, y0, y1, d, ramp, lo=0.0, hi=1.0):
    for i in range(d):
        s = (i + 0.5) / d * 2 - 1
        nz = math.sqrt(max(0.0, 1 - s * s))
        v = hd.lambert(np.array([s]), np.array([0.0]), np.array([nz]))[0]
        v = lo + (hi - lo) * v
        k = ramp[min(len(ramp) - 1, int(v * len(ramp)))]
        im.vline(x + i, y0, y1, k)
    im.vline(x + d - 1, y0, y1, ramp[0])


def shadow_below(im: Img, x0, x1, y, depth=2):
    """Ambient occlusion strip under a trim/pipe: step the existing pixels darker, fading with distance."""
    for j in range(depth):
        m = np.zeros(im.a.shape, bool)
        if 0 <= y + j < im.h:
            m[y + j, max(0, x0):min(im.w, x1 + 1)] = True
        darken(im, m, depth - j)


def shadow_right(im: Img, x, y0, y1, depth=2):
    for i in range(depth):
        m = np.zeros(im.a.shape, bool)
        if 0 <= x + i < im.w:
            m[max(0, y0):min(im.h, y1 + 1), x + i] = True
        darken(im, m, depth - i)


def rivet(im: Img, x, y, ramp=BRASS_D, shadow=True):
    """3x3 domed rivet head: lit top-left, dark bottom-right, 1-px cast shadow."""
    hi, mid, lo = ramp[-1], ramp[len(ramp) // 2], ramp[1]
    pat = [(0, 0, hi), (1, 0, mid), (0, 1, mid), (1, 1, mid), (2, 1, lo), (1, 2, lo), (2, 2, ramp[0])]
    for dx, dy, c in pat:
        put(im, x + dx, y + dy, c)
    if shadow:
        m = np.zeros(im.a.shape, bool)
        for dx, dy in ((3, 2), (2, 3), (3, 3)):
            if im.inb(x + dx, y + dy):
                m[y + dy, x + dx] = True
        darken(im, m, 1)


def bolt(im: Img, x, y, ramp=BRASS_D):
    """2x2 flat bolt head."""
    put(im, x, y, ramp[-2])
    put(im, x + 1, y, ramp[len(ramp) // 2])
    put(im, x, y + 1, ramp[len(ramp) // 2])
    put(im, x + 1, y + 1, ramp[1])


def ring_mask(w, h, cx, cy, r_out, r_in):
    X, Y = hd.grid(w, h)
    d = np.hypot(X - cx, Y - cy)
    return (d <= r_out) & (d > r_in)


def disc_mask(w, h, cx, cy, r):
    X, Y = hd.grid(w, h)
    return np.hypot(X - cx, Y - cy) <= r


def sphere_shade(im: Img, mask, cx, cy, r, ramp, bias=0.0):
    nx, ny, nz = hd.sphere_normals(im.w, im.h, cx, cy, r, r)
    v = hd.lambert(nx, ny, nz) + bias
    hd.paint(im, mask, np.clip(v, 0, 1), ramp)


def torus_shade(im: Img, mask, cx, cy, r_mid, ramp, bias=0.0):
    """A ring bezel: normals point away from the ring's centre line (lit top-left outer, bottom-right inner)."""
    X, Y = hd.grid(im.w, im.h)
    dx, dy = X - cx, Y - cy
    d = np.hypot(dx, dy) + 1e-6
    off = (d - r_mid)
    nx = dx / d * np.clip(off, -1.2, 1.2)
    ny = dy / d * np.clip(off, -1.2, 1.2)
    nz = np.ones_like(nx) * 0.9
    v = hd.lambert(nx, ny, nz) + bias
    hd.paint(im, mask, np.clip(v, 0, 1), ramp)


def gauge(im: Img, cx, cy, r=5.5, angle=-40, face=IVORY_D, bezel=BRASS_D, glint=True):
    """Round gauge: brass bezel, enamel face with ticks, dark needle, a glass glint."""
    w, h = im.w, im.h
    outer = disc_mask(w, h, cx, cy, r)
    inner = disc_mask(w, h, cx, cy, r - 1.6)
    torus_shade(im, outer & ~inner, cx, cy, r - 0.8, bezel)
    sphere_shade(im, inner, cx - r * 0.3, cy - r * 0.3, r * 3.2, face[2:], bias=0.12)
    # ticks
    for a in (-120, -60, 0, 60, 120):
        rad = math.radians(a - 90)
        tx, ty = cx + math.cos(rad) * (r - 2.4), cy + math.sin(rad) * (r - 2.4)
        put(im, math.floor(tx), math.floor(ty), face[0])
    # needle
    rad = math.radians(angle - 90)
    for t in np.linspace(0, r - 2.2, 8):
        put(im, math.floor(cx + math.cos(rad) * t), math.floor(cy + math.sin(rad) * t), "k1")
    put(im, math.floor(cx), math.floor(cy), "k0h")
    if glint:
        put(im, math.floor(cx - r * 0.45), math.floor(cy - r * 0.5), face[-1])


def lamp(im: Img, cx, cy, r=2.2, glow=AMBER_GLOW, bezel=BRASS_D, lit=True):
    """Small indicator lamp: brass bezel ring and a glass bead (lit = banded glow, core pixel brightest)."""
    w, h = im.w, im.h
    outer = disc_mask(w, h, cx, cy, r + 1.0)
    bead = disc_mask(w, h, cx, cy, r)
    torus_shade(im, outer & ~bead, cx, cy, r + 0.5, bezel)
    if lit:
        sphere_shade(im, bead, cx, cy, r * 1.3, glow[2:], bias=0.1)
        put(im, math.floor(cx - 0.5), math.floor(cy - 0.5), glow[-1])
    else:
        sphere_shade(im, bead, cx, cy, r * 1.3, GLASS)


def glow_dot(im: Img, x, y, glow, big=False):
    """A tiny lit pip (1-2 px) with a darker halo pixel or two."""
    put(im, x, y, glow[-1])
    if big:
        put(im, x + 1, y, glow[-3])
        put(im, x, y + 1, glow[-4])
        put(im, x + 1, y + 1, glow[-5])


def screen(im: Img, x, y, w, h, tint=TEAL_GLOW, lit=True, lines=True, blips=((0.3, 0.5),), frame_ramp=IRON):
    """Dark glass screen with a bevelled frame, faint scanlines and one or two lit blips."""
    box(im, x - 2, y - 2, w + 4, h + 4, frame_ramp, bevel=1)
    im.rect(x, y, w, h, "k0h")
    if lit:
        if lines:
            for yy in range(y + 1, y + h, 2):
                im.hline(x, x + w - 1, yy, tint[0])
        for fx, fy in blips:
            bx, by = x + int(fx * (w - 1)), y + int(fy * (h - 1))
            put(im, bx, by, tint[-2])
            put(im, bx + 1, by, tint[-5])
    im.hline(x, x + w - 1, y, "k0")
    im.vline(x, y, y + h - 1, "k0")
    put(im, x + w - 2, y + 1, "k2")  # glass glint


def knob(im: Img, x, y, ramp=IRON):
    put(im, x, y, ramp[-1])
    put(im, x + 1, y, ramp[-3])
    put(im, x, y + 1, ramp[-4])
    put(im, x + 1, y + 1, ramp[1])


def outline_mask(im: Img, mask, c="k0"):
    """1-px outline around a mask (4-connected, outside)."""
    pad = np.pad(mask, 1, constant_values=False)
    grow = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    ring = grow & ~mask
    im.a[ring] = K(c)


def poly(im: Img, pts, ramp, bevel=2, **kw):
    m = hd.poly_mask(im.w, im.h, pts)
    shade_mask(im, m, ramp, bevel, **kw)
    return m


def rng(seed):
    return random.Random(seed)


def wear(im: Img, mask, seed, n=6, lighter=True):
    """A few short worn scuffs (2-4 px clusters, 1 step lighter) inside a part; deterministic."""
    r = rng(seed)
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return
    for _ in range(n):
        i = r.randrange(len(xs))
        x, y = xs[i], ys[i]
        ln = r.choice((2, 3, 3, 4))
        horiz = r.random() < 0.7
        m = np.zeros(im.a.shape, bool)
        for k in range(ln):
            xx, yy = (x + k, y) if horiz else (x, y + k)
            if 0 <= xx < im.w and 0 <= yy < im.h and mask[yy, xx]:
                m[yy, xx] = True
        (lighten if lighter else darken)(im, m, 1)


# ── stencil lettering (5x7 stencil face, bridges built in) ─────────────────────────────────────────────────
FONT = {
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    "C": [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
    "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "G": [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
    "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "I": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
    "K": ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
    "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    "M": ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
    "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "V": ["#...#", "#...#", "#...#", "#...#", ".#.#.", ".#.#.", "..#.."],
    "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
    "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
    "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
    "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
    "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
    "4": ["#...#", "#...#", "#...#", "#####", "....#", "....#", "....#"],
    "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
    "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
    "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
    " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
}
STENCIL_BRIDGE = 3  # row index cut through vertical strokes (stencil bridges)


def text_w(s):
    return len(s) * 6 - 1


def stencil(im: Img, s, x, y, c="k3", bridges=True, chips=0, seed=0):
    r = rng(seed)
    for i, ch in enumerate(s):
        for yy, row in enumerate(FONT[ch]):
            for xx, v in enumerate(row):
                if v != "#":
                    continue
                if bridges and yy == STENCIL_BRIDGE and row.count("#") <= 2 and ch not in "-":
                    continue
                if chips and r.random() < chips:
                    continue
                put(im, x + i * 6 + xx, y + yy, c)
    return im


def stencil_img(s, c="k3") -> Img:
    im = Img(text_w(s), 7)
    return stencil(im, s, 0, 0, c)
