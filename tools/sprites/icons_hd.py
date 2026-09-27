"""Hi-bit (contract v3) icon toolkit: vector masks sampled at pixel centres, shaded with the house light into muted
HD ramps (tools/sprites/hd.py), then outlined selectively. Every icon of the icons atlas is built from these parts.

Geometry is written in atlas pixels (2x density): a main icon is 40x40, a small one 28x28.
"""
from __future__ import annotations

import math

import numpy as np

import hd
from px import KEY, Img, idx

# ── muted material ramps (dark -> light) ────────────────────────────────────────────────────────────────────
R = {
    "brass": ["k2", "c0", "b0", "b0h", "b1", "b1h", "b2", "b2h", "b3"],          # tarnished brass
    "brass-lit": ["b0", "b0h", "b1", "b1h", "b2", "b2h", "b3", "b3h", "b4"],
    "ivory": ["k4", "i0", "i0h", "i1", "i1h", "i2", "i2h", "i3"],                  # engraved ivory relief
    "ivory-dim": ["k4", "k5~s0", "i0", "i0h", "i1", "i1h", "i2"],
    "steel": ["k3", "k4", "k5", "k5~s0", "s0", "s0h", "s1", "s1h", "s2"],
    "steel-dark": ["k2", "k3", "k3h", "k4", "k4h", "k5", "k5~s0", "s0"],
    "iron": ["k1", "k2", "k2h", "k3", "k3h", "k4", "k4h", "k5"],
    "copper": ["k2", "c0", "c0h", "c1", "c1h", "c2", "c2h", "c3"],
    "verdigris": ["k2", "g0", "g0h", "g1", "g1h", "g2", "g2h", "g3"],
    "glass": ["k0", "k1", "k1h", "k2", "k2h", "k3"],
    "teal": ["t0", "t0h", "t1", "t1h", "t2", "t2h", "t3"],
    "amber": ["b0", "a0", "a0h", "a1", "a1h", "a2"],
    "ember": ["e0", "e0h", "e1", "e1h", "e2", "e2h", "e3"],
    "violet": ["v0", "v0h", "v1", "v1h", "v2", "v2h", "v3"],
    "dark-glow": ["k3", "k3h", "k4", "k4h", "k5"],
}


# ── masks ───────────────────────────────────────────────────────────────────────────────────────────────────
class Shape:
    """Mask factory bound to a canvas size."""

    def __init__(self, w, h=None):
        self.w, self.h = w, h or w
        self.X, self.Y = hd.grid(self.w, self.h)

    def empty(self):
        return np.zeros((self.h, self.w), bool)

    def rect(self, x, y, w, h):
        return (self.X >= x) & (self.X < x + w) & (self.Y >= y) & (self.Y < y + h)

    def rrect(self, x, y, w, h, r):
        """Rounded rectangle (corner radius r)."""
        m = self.rect(x, y, w, h)
        cx = np.clip(self.X, x + r, x + w - r)
        cy = np.clip(self.Y, y + r, y + h - r)
        return m & (np.hypot(self.X - cx, self.Y - cy) <= r + 0.01)

    def chamfer(self, x, y, w, h, c):
        """Rectangle with 45° chamfered corners of size c."""
        m = self.rect(x, y, w, h)
        X, Y = self.X, self.Y
        for (px, py, sx, sy) in ((x, y, 1, 1), (x + w, y, -1, 1), (x, y + h, 1, -1), (x + w, y + h, -1, -1)):
            m &= ((X - px) * sx + (Y - py) * sy) >= c
        return m

    def circle(self, cx, cy, r):
        return np.hypot(self.X - cx, self.Y - cy) <= r

    def ellipse(self, cx, cy, rx, ry):
        return ((self.X - cx) / rx) ** 2 + ((self.Y - cy) / ry) ** 2 <= 1.0

    def ring(self, cx, cy, r_out, r_in):
        d = np.hypot(self.X - cx, self.Y - cy)
        return (d <= r_out) & (d > r_in)

    def poly(self, pts):
        return hd.poly_mask(self.w, self.h, pts)

    def line(self, p0, p1, width=1.0, width1=None):
        m, _, _, _ = hd.capsule(self.w, self.h, p0, p1, width / 2, (width1 if width1 is not None else width) / 2)
        return m

    def polyline(self, pts, width=1.0):
        m = self.empty()
        for a, b in zip(pts, pts[1:]):
            m |= self.line(a, b, width)
        return m

    def arc(self, cx, cy, r, thick, a0, a1):
        """Ring sector between angles a0..a1 (degrees, 0 = right, counter-clockwise, screen y up)."""
        d = np.hypot(self.X - cx, self.Y - cy)
        ang = np.degrees(np.arctan2(-(self.Y - cy), self.X - cx)) % 360
        a0, a1 = a0 % 360, a1 % 360
        inside = (ang >= a0) & (ang <= a1) if a0 <= a1 else (ang >= a0) | (ang <= a1)
        return (d <= r + thick / 2) & (d >= r - thick / 2) & inside

    def at(self, cx, cy, r, deg):
        t = math.radians(deg)
        return cx + r * math.cos(t), cy - r * math.sin(t)


# ── shading ────────────────────────────────────────────────────────────────────────────────────────────────
def shade(img: Img, mask, ramp, mode="bevel", width=2, ambient=0.18, bias=0.0, lo=0.1, hi=1.0, sphere=None,
          cyl=None, flat_nz=1.0):
    """Paint `mask` with `ramp` using the house light. mode: bevel | flat | sphere | cyl."""
    if not mask.any():
        return img
    h, w = mask.shape
    if mode == "bevel":
        nx, ny, nz = hd.bevel_normals(mask, width, flat_nz)
    elif mode == "flat":
        nx, ny, nz = np.zeros((h, w)), np.zeros((h, w)), np.ones((h, w))
    elif mode == "sphere":
        cx, cy, rx, ry = sphere
        nx, ny, nz = hd.sphere_normals(w, h, cx, cy, rx, ry)
    elif mode == "cyl":  # cylinder along an axis: cyl = (p0, p1, r)
        p0, p1, r = cyl
        _, _, s, an = hd.capsule(w, h, p0, p1, r, r)
        nx, ny, nz = hd.cylinder_normals(s, an)
    else:
        raise ValueError(mode)
    v = hd.lambert(nx, ny, nz, ambient)
    hd.paint(img, mask, v, ramp, lo, hi, bias)
    return img


def fill(img: Img, mask, key):
    img.a[mask] = idx(key)
    return img


def groove(img: Img, mask, dark="k0", lip=None):
    """Engraved line: the groove is dark, its lower-right lip catches the light (one step lighter than the surface)."""
    img.a[mask] = idx(dark)
    if lip:
        h, w = mask.shape
        below = np.zeros_like(mask)
        below[1:, :] |= mask[:-1, :]
        below[:, 1:] |= mask[:, :-1]
        below &= ~mask & (img.a >= 0)
        img.a[below] = idx(lip)
    return img


def outline(img: Img, mask=None, key="k0", diag=False):
    """1-px outline around `mask` (default: all opaque) written onto transparent pixels only."""
    m = (img.a >= 0) if mask is None else mask
    grow = np.zeros_like(m)
    grow[1:, :] |= m[:-1, :]
    grow[:-1, :] |= m[1:, :]
    grow[:, 1:] |= m[:, :-1]
    grow[:, :-1] |= m[:, 1:]
    if diag:
        grow[1:, 1:] |= m[:-1, :-1]
        grow[1:, :-1] |= m[:-1, 1:]
        grow[:-1, 1:] |= m[1:, :-1]
        grow[:-1, :-1] |= m[1:, 1:]
    ring = grow & ~m & (img.a < 0)
    img.a[ring] = idx(key)
    return img


def contour(img: Img, mask, key="k0"):
    """1-px dark separation drawn just outside `mask` over whatever is there (not only on transparent pixels)."""
    grow = np.zeros_like(mask)
    grow[1:, :] |= mask[:-1, :]
    grow[:-1, :] |= mask[1:, :]
    grow[:, 1:] |= mask[:, :-1]
    grow[:, :-1] |= mask[:, 1:]
    img.a[grow & ~mask] = idx(key)
    return img


def dome(img: Img, cx, cy, r, ramp, spec=None):
    """A small shaded dome (rivet, lamp glass, knob)."""
    S = Shape(img.w, img.h)
    m = S.circle(cx, cy, r)
    shade(img, m, ramp, "sphere", sphere=(cx, cy, r, r), ambient=0.15)
    if spec:
        img.put(int(cx - r * 0.45), int(cy - r * 0.45), spec)
    return m


def lamp(img: Img, cx, cy, r, glow_ramp, lit=True, socket="k0"):
    """A lamp: dark socket ring, glass dome; lit lamps get a hot core pixel cluster."""
    S = Shape(img.w, img.h)
    img.a[S.circle(cx, cy, r + 1.0)] = idx(socket)
    if lit:
        dome(img, cx, cy, r, glow_ramp)
        img.put(int(cx - 0.6), int(cy - 0.6), glow_ramp[-1])
    else:
        dome(img, cx, cy, r, R["glass"])
        img.put(int(cx - r * 0.5), int(cy - r * 0.5), "k4")
    return img


def place(g: Img, size, w=None, dx=0, dy=0) -> Img:
    """Trim to bbox and centre in a size x (w or size) frame."""
    bb = g.bbox()
    g = g.crop(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1])
    W, H = (w or size), size
    if g.w > W or g.h > H:
        raise ValueError(f"art {g.w}x{g.h} does not fit {W}x{H}")
    out = Img(W, H)
    out.blit(g, (W - g.w) // 2 + dx, (H - g.h) // 2 + dy)
    return out


def recolor_ramp(img: Img, src, dst):
    """Map every key of ramp `src` onto ramp `dst` by relative position."""
    m = {}
    for i, k in enumerate(src):
        j = round(i * (len(dst) - 1) / max(1, len(src) - 1))
        m[k] = dst[j]
    return img.recolor(m)
