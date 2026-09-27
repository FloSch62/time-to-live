"""Shared hi-bit (contract v3, 2x density) helpers for the fx atlas modules (fx.py, fx_cable.py, fx_overlay.py).

All fx are authored at 2 atlas px per layout unit. Glows are hard-banded radial falloffs through long HD ramps
(master steps + half steps), never blurred; smoke is sphere-shaded through the ink/steel ramp; sparks are 1-px
streaks with a bright head and a tail that cools through its ramp; arcs are 1-px jagged walks. Every pixel is
opaque (fades are the game's globalAlpha). Seeds are fixed, output is deterministic.
"""
from __future__ import annotations

import math
import random

import numpy as np

import hd
from px import Img, idx, line_pts, ramp, T

# ── HD ramps, dark -> light ─────────────────────────────────────────────────────────────────────────────────
TEAL = ramp("t")                       # t0 .. t4 (9)
AMBER = ["a0", "a0h", "a1", "a1h", "a2", "a2h", "a3"]
VIOLET = ramp("v")
EMBER = ramp("e")
IVORY = ramp("i")
BRASS = ramp("b")
COPPER = ramp("c")
VERD = ramp("g")
STEEL = ["k4", "k4h", "k5", "k5~s0", "s0", "s0h", "s1", "s1h", "s2", "s2h", "s3"]
SMOKE = ["k2", "k2h", "k3", "k3h", "k4", "k4h", "k5", "k5~s0", "s0"]
SMOKE_LIGHT = ["k3", "k3h", "k4", "k4h", "k5", "k5~s0", "s0", "s0h", "s1"]
FIRE = ["e0", "e0h", "e1", "e1h", "e2", "a0", "a0h", "a1", "a1h", "a2", "a2h", "a3"]
# glow ramps (rim -> core) for light that sits on dark backgrounds: the rim is the darkest step of the hue
GLOW = {
    "teal": ["t0", "t0h", "t1", "t1h", "t2", "t2h", "t3", "t3h", "t4"],
    "amber": ["b1", "b1h", "b2", "a0", "a0h", "a1", "a1h", "a2", "a2h", "a3"],
    "violet": ["v0h", "v1", "v1h", "v2", "v2h", "v3", "v3h", "v4"],
    "ivory": ["i0", "i0h", "i1", "i1h", "i2", "i2h", "i3", "i3h", "i4"],
    "ember": ["e0", "e0h", "e1", "e1h", "e2", "e2h", "e3", "e3h", "e4"],
}
CORE = {"teal": "t4", "amber": "a3", "violet": "i4", "ivory": "a3", "ember": "a3"}


def grid(w, h):
    ys, xs = np.mgrid[0:h, 0:w]
    return xs + 0.5, ys + 0.5


def put_ramp(im: Img, mask, value, keys):
    """Write keys[int(value*n)] where mask (value 0..1, dark->light)."""
    n = len(keys)
    q = np.clip((value * n).astype(int), 0, n - 1)
    ids = np.array([idx(k) for k in keys])
    im.a[mask] = ids[q[mask]]
    return im


def radial(im: Img, cx, cy, r, keys, power=1.0, ry=None, only_empty=False, floor=0.0):
    """Hard-banded radial (or elliptical) glow: value = (1 - d/r)^power, quantised into keys (rim -> core)."""
    ry = r if ry is None else ry
    X, Y = grid(im.w, im.h)
    d = np.hypot((X - cx) / max(r, 1e-3), (Y - cy) / max(ry, 1e-3))
    v = np.clip(1 - d, 0, 1) ** power
    m = (d < 1) & (v > floor)
    if only_empty:
        m &= im.a < 0
    return put_ramp(im, m, (v - floor) / max(1 - floor, 1e-6), keys)


def puff(im: Img, cx, cy, r, keys=SMOKE, only_empty=False, ry=None, ambient=0.25, rough=0.0, seed=0):
    """Smoke puff: a sphere lit from the top-left, quantised through `keys` (dark -> light). rough > 0 breaks the
    silhouette with a lumpy, seeded edge and adds a little internal billowing (never noise speckle)."""
    ry = r if ry is None else ry
    if r < 0.7:
        return im
    w, h = im.w, im.h
    X, Y = grid(w, h)
    nx, ny = (X - cx) / r, (Y - cy) / ry
    rr = nx * nx + ny * ny
    lam_mod = 1.0
    if rough:
        rng = random.Random(seed)
        ph = [rng.uniform(0, 6.3) for _ in range(3)]
        th = np.arctan2(ny, nx)
        edge = 1 + rough * (0.55 * np.sin(3 * th + ph[0]) + 0.3 * np.sin(5 * th + ph[1]) + 0.15 * np.sin(8 * th + ph[2]))
        rr = rr / (edge * edge)
        lam_mod = 1 + rough * 0.5 * np.sin(2.3 * nx * 3 + ph[1]) * np.cos(2.1 * ny * 3 + ph[2])
    m = rr <= 1.0
    if only_empty:
        m &= im.a < 0
    nz = np.sqrt(np.clip(1 - np.minimum(rr, 1), 0, 1))
    lam = np.clip(hd.lambert(nx, ny, nz, ambient) * lam_mod, 0, 0.999)
    return put_ramp(im, m, lam, keys)


def streak(im: Img, x0, y0, x1, y1, keys, head=None):
    """1-px spark streak from the tail (x0,y0) to the head (x1,y1); colour warms along keys (dark -> light)."""
    pts = line_pts(round(x0), round(y0), round(x1), round(y1))
    n = len(pts)
    for i, (x, y) in enumerate(pts):
        k = keys[min(len(keys) - 1, int((i + 1) / n * len(keys)))]
        im.put(x, y, k)
    if head:
        im.put(pts[-1][0], pts[-1][1], head)
    return im


def arc(im: Img, x0, y0, ang, length, rng, col, tip=None, jog=0.4, maxoff=3, glow_col=None):
    """1-px jagged electric arc walking out along `ang`, stepping sideways at random steps; optional dim glow
    pixels beside the bright path (one side, sparse) to give the arc body at HD density."""
    px_, py_ = -math.sin(ang), math.cos(ang)
    off = 0
    prev = None
    pts = []
    for i in range(int(length)):
        if i > 1 and rng.random() < jog:
            off = max(-maxoff, min(maxoff, off + rng.choice((-1, 1))))
        p = (int(round(x0 + math.cos(ang) * i + px_ * off)), int(round(y0 + math.sin(ang) * i + py_ * off)))
        if prev:
            for q in line_pts(prev[0], prev[1], p[0], p[1]):
                pts.append(q)
        prev = p
    if glow_col:
        for j, (x, y) in enumerate(pts):
            if j % 3 == 1:
                gx, gy = x + (1 if abs(py_) > abs(px_) else 0), y + (1 if abs(px_) >= abs(py_) else 0)
                if im.get(gx, gy) < 0:
                    im.put(gx, gy, glow_col)
    for x, y in pts:
        im.put(x, y, col)
    if tip and pts:
        im.put(pts[-1][0], pts[-1][1], tip)
    return pts


def periodic_noise(w, h, cell_x, cell_y, seed):
    """Smooth value noise on a torus (periodic in x over w and y over h), values 0..1."""
    rng = random.Random(seed)
    gx, gy = max(1, w // cell_x), max(1, h // cell_y)
    lat = np.array([[rng.random() for _ in range(gx)] for _ in range(gy)])
    X, Y = grid(w, h)
    fx_, fy_ = (X - 0.5) / cell_x, (Y - 0.5) / cell_y
    ix, iy = np.floor(fx_).astype(int), np.floor(fy_).astype(int)
    tx, ty = fx_ - ix, fy_ - iy
    tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    x0, x1 = ix % gx, (ix + 1) % gx
    y0, y1 = iy % gy, (iy + 1) % gy
    a_ = lat[y0, x0] * (1 - tx) + lat[y0, x1] * tx
    b_ = lat[y1, x0] * (1 - tx) + lat[y1, x1] * tx
    return a_ * (1 - ty) + b_ * ty


def fbm(w, h, seed, cells=((16, 16, 0.55), (8, 8, 0.3), (4, 4, 0.15))):
    out = np.zeros((h, w))
    for i, (cx, cy, amp) in enumerate(cells):
        out += periodic_noise(w, h, cx, cy, seed + i * 17) * amp
    return out / sum(c[2] for c in cells)


def clean(im: Img, passes=1) -> Img:
    """Remove single orphan pixels inside a shape (hd.cleanup) and lone opaque specks with no opaque neighbour."""
    hd.cleanup(im, passes)
    return im


def despeck(im: Img, keep=()) -> Img:
    """Drop opaque pixels with no opaque 4-neighbour unless their colour is in `keep` (sparks keep their heads)."""
    a = im.a
    m = a >= 0
    pad = np.pad(m, 1, constant_values=False)
    nb = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    keep_i = [idx(k) for k in keep]
    lone = m & ~nb & ~np.isin(a, keep_i)
    a[lone] = T
    return im


def mirror(imgs):
    return [im.flip_h() for im in imgs]


def add_lr(at, base, imgs, ax, ay, fps, loop):
    """Right-facing sequence + mirrored `-left` sequence (anchor mirrored)."""
    at.seq(base, imgs, ax, ay, fps=fps, loop=loop)
    at.seq(f"{base}-left", mirror(imgs), imgs[0].w - 1 - ax, ay, fps=fps, loop=loop)
