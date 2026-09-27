"""Shop / refit icons for the modular tender (contract v2.1 + v3 hi-bit): `car-<id>` and `module-<id>`,
64x64 with 40x40 `-sm`.

Cars share one Reach-dock design language: braided carrier, a two-wheel trolley (rear cars) or two hangers (keels),
ivory upper panels over a riveted tarnished-brass band, square dark windows with a few lit, the same lamps. Each
car's purpose is drawn on it. Modules are brass-framed crates showing their contents.
"""
from __future__ import annotations

import numpy as np

from icons_hd import R, Shape, dome, fill, lamp, outline, shade
from icons_sys import G, glyph_masks
from px import Img, idx

BIG, SM = 64, 40
IVORY = R["ivory"][1:]
BRASS = R["brass"]
STEEL = R["steel"][1:]


class D:
    """64-unit design box scaled to the target size."""

    def __init__(self, n):
        self.n = n
        self.k = n / 64.0
        self.S = Shape(n)

    def p(self, x, y):
        return (x * self.k, y * self.k)

    def rect(self, x, y, w, h):
        return self.S.rect(x * self.k, y * self.k, w * self.k, h * self.k)

    def rrect(self, x, y, w, h, r):
        return self.S.rrect(x * self.k, y * self.k, w * self.k, h * self.k, r * self.k)

    def chamfer(self, x, y, w, h, c):
        return self.S.chamfer(x * self.k, y * self.k, w * self.k, h * self.k, c * self.k)

    def circle(self, x, y, r):
        return self.S.circle(x * self.k, y * self.k, max(0.8, r * self.k))

    def ellipse(self, x, y, rx, ry):
        return self.S.ellipse(x * self.k, y * self.k, rx * self.k, ry * self.k)

    def ring(self, x, y, ro, ri):
        return self.S.ring(x * self.k, y * self.k, ro * self.k, ri * self.k)

    def poly(self, pts):
        return self.S.poly([self.p(*q) for q in pts])

    def line(self, a, b, w=1.0, w1=None):
        return self.S.line(self.p(*a), self.p(*b), max(1.0, w * self.k), max(1.0, w1 * self.k) if w1 else None)

    def polyline(self, pts, w=1.0):
        return self.S.polyline([self.p(*q) for q in pts], max(1.0, w * self.k))

    def w(self, v):
        return max(1, int(round(v * self.k)))


# ── shared parts ─────────────────────────────────────────────────────────────────────────────────────────
def carrier(img, d: D, y=4.0, th=4.0):
    band = d.rect(0, y, 64, th)
    shade(img, band, R["verdigris"], "bevel", width=1, ambient=0.3)
    for x in np.arange(-2, 64, 3.4):
        img.a[d.line((x, y), (x + th * 0.75, y + th), 1.0) & band] = idx("g0")
    img.a[d.rect(0, y, 64, 1.0) & band & (np.mod(d.S.X, 9) < 1.2)] = idx("c1h")


def trolley(img, d: D, cx, y=5.5, hang_to=18):
    for x in (cx - 7, cx + 7):
        m = d.circle(x, y, 4.2)
        shade(img, m, ["k2", "b0", "b0h", "b1", "b1h", "b2"], "sphere", sphere=(*d.p(x, y), 4.2 * d.k, 4.2 * d.k))
        img.a[d.ring(x, y, 2.9, 2.2)] = idx("b0")
        img.a[d.circle(x, y, 1.1)] = idx("k1")
    bar = d.rect(cx - 9, y + 3.8, 18, 2.2)
    shade(img, bar, BRASS, "bevel", width=1, ambient=0.3)
    for x in (cx - 5, cx + 4):
        rod = d.rect(x, y + 6, 1.6, hang_to - y - 6)
        shade(img, rod, R["steel-dark"], "bevel", width=1, ambient=0.4)


def body(img, d: D, x0, y0, x1, y1, band_y, nose=False):
    """Ivory upper panels over a riveted brass band; a steel roof strip; end couplers."""
    pts = [(x0, y0 + 2), (x0 + 2, y0), (x1 - (6 if nose else 2), y0), (x1, y0 + (6 if nose else 2)), (x1, y1),
           (x0, y1)]
    m = d.poly(pts)
    upper = m & (d.S.Y < band_y * d.k)
    lower = m & ~upper
    shade(img, upper, IVORY, "bevel", width=d.w(1.6), ambient=0.25)
    shade(img, lower, BRASS, "bevel", width=d.w(1.6), ambient=0.25)
    img.a[d.rect(x0, band_y, x1 - x0, 1.0) & m] = idx("b0")
    for x in np.arange(x0 + 3, x1 - 2, 5):
        img.a[d.circle(x, band_y + 3, 0.8)] = idx("b2h")
    roof = d.rect(x0 + 2, y0 - 1.5, x1 - x0 - (8 if nose else 4), 1.8)
    shade(img, roof, R["steel-dark"], "bevel", width=1, ambient=0.35)
    # panel seams
    for x in np.arange(x0 + 12, x1 - 6, 12):
        img.a[d.rect(x, y0 + 1, 0.9, band_y - y0 - 1) & upper] = idx("i0h")
    return m


def windows(img, d: D, x0, x1, y, n, size, lit_every=2, lit=("t1", "t2"), offset=0):
    span = x1 - x0
    gap = (span - n * size) / (n + 1)
    x = x0 + gap
    for i in range(n):
        img.a[d.rect(x - 1, y - 1, size + 2, size + 2)] = idx("k0")
        shade(img, d.rect(x, y, size, size), R["glass"], "flat", ambient=0.35)
        img.a[d.rect(x + size * 0.55, y + size * 0.55, size * 0.45, size * 0.45)] = idx("k2")
        if (i + offset) % lit_every == 0:
            img.a[d.rect(x, y, max(1, size * 0.35), max(1, size * 0.35))] = idx(lit[1])
            img.a[d.rect(x + size * 0.35, y, size * 0.3, max(1, size * 0.3))] = idx(lit[0])
        x += size + gap


def coupler(img, d: D, x, y, side):
    m = d.rect(x - (3 if side < 0 else 0), y, 3, 2.4)
    shade(img, m, R["steel-dark"], "bevel", width=1, ambient=0.35)


def mini_emitter(img, d: D, x, y, flip=False):
    """A small roof/belly weapon mount: steel base, brass barrel, a dim amber lens."""
    base = d.rrect(x, y + (0 if not flip else 3), 9, 4, 1)
    shade(img, base, R["steel-dark"], "bevel", width=1, ambient=0.35)
    by = y - 3.2 if not flip else y + 7
    barrel = d.rrect(x + 3, by, 16, 3.4, 1)
    shade(img, barrel, BRASS, "cyl", cyl=(d.p(0, by + 1.7), d.p(64, by + 1.7), 1.7 * d.k), ambient=0.25)
    img.a[d.circle(x + 19.5, by + 1.7, 1.6)] = idx("a0")
    img.put(int((x + 19) * d.k), int((by + 1) * d.k), "a1h")


# ── rear cars ────────────────────────────────────────────────────────────────────────────────────────────
def rear_car(kind, n) -> Img:
    d = D(n)
    img = Img(n, n)
    x0, y0, x1, y1, band = 4, 19, 60, 47, 37
    carrier(img, d)
    trolley(img, d, 32, 5.5, y0 - 1)
    m = body(img, d, x0, y0, x1, y1, band)
    coupler(img, d, x0, band + 1, -1)
    coupler(img, d, x1, band + 1, 1)
    if kind == "drone-car":
        bay = d.rect(9, 22, 46, 20)
        fill(img, bay, "k1")
        img.a[d.rect(9, 22, 46, 1.2)] = idx("k0")
        img.a[d.rect(9, 31.5, 46, 1.2) | d.rect(9, 41, 46, 1.2)] = idx("k3")
        for (x, y) in ((13, 27.5), (34, 37)):
            rotor = d.rect(x - 1, y - 3.4, 14, 1.2)
            img.a[rotor] = idx("s0")
            img.a[d.rect(x + 5.4, y - 2.4, 1.2, 1.8)] = idx("s0")
            hull = d.ellipse(x + 6, y + 0.5, 6, 2.6)
            shade(img, hull, BRASS, "sphere", sphere=(*d.p(x + 6, y), 6 * d.k, 2.6 * d.k), ambient=0.2)
            img.a[d.ellipse(x + 6, y + 1.2, 2.4, 0.9)] = idx("t0h")
            img.put(int((x + 5) * d.k), int((y + 1) * d.k), "t2")
        img.a[d.circle(50, 26.5, 1.2)] = idx("t1")
    elif kind == "armory-car":
        windows(img, d, x0 + 2, x1 - 2, 23, 6, 5)
        mini_emitter(img, d, 30, 14.5)
        img.a[d.rect(8, 31, 48, 0.9) & m] = idx("i0h")
    elif kind == "freight-car":
        door = d.rect(10, 21, 44, 22)
        fill(img, door, "k1")
        img.a[d.rect(10, 21, 44, 1.2)] = idx("k0")
        crates = [(12, 33, 9), (22, 33, 9), (32, 33, 9), (42.5, 33, 9), (16.5, 24, 9), (27, 24, 9)]
        for (cx, cy, s) in crates:
            cm = d.rect(cx, cy, s, s - 0.2)
            shade(img, cm, ["k2", "c0", "c0h", "c1", "c1h", "c2"], "bevel", width=1, ambient=0.25)
            img.a[d.line((cx + 1, cy + 1), (cx + s - 1, cy + s - 1.2), 0.9) & cm] = idx("c0")
            img.a[d.rect(cx, cy + s / 2 - 0.5, s, 0.9) & cm] = idx("c0h")
        img.a[d.rect(49, 43, 5, 1)] = idx("k0")
    elif kind == "bunk-car":
        windows(img, d, x0 + 2, x1 - 2, 23, 7, 4, lit_every=2, lit=("a0", "a1"))
        windows(img, d, x0 + 2, x1 - 2, 39.5, 7, 3, lit_every=3, lit=("a0", "a1"), offset=1)
    elif kind == "veil-car":
        hood = d.rrect(10, 14, 44, 5, 2)
        shade(img, hood, ["k2", "v0", "v0h", "v1"], "bevel", width=1, ambient=0.3)
        for i, x in enumerate((15, 26, 37, 48)):
            img.a[d.circle(x, 28, 4.4)] = idx("k0")
            shade(img, d.circle(x, 28, 3.6), R["glass"], "sphere", sphere=(*d.p(x, 28), 3.6 * d.k, 3.6 * d.k))
            img.a[d.rect(x - 3.6, 29.6, 7.2, 1.2) & d.circle(x, 28, 3.6)] = idx("v1h" if i % 2 == 0 else "v1")
            sh = d.rect(x - 4.5, 23.5, 9, 5.5)
            shade(img, sh, R["steel-dark"], "bevel", width=1, ambient=0.3)
            img.a[d.rect(x - 4.5, 25.5, 9, 0.9)] = idx("k2")
    outline(img, None, "k0")
    return img


# ── keels ────────────────────────────────────────────────────────────────────────────────────────────────
def keel(kind, n) -> Img:
    d = D(n)
    img = Img(n, n)
    x0, x1, y0, y1 = 5, 59, 14, 46
    for x in (17, 47):
        rod = d.rect(x, 0, 2, y0 + 1)
        shade(img, rod, R["steel-dark"], "bevel", width=1, ambient=0.4)
        shade(img, d.rect(x - 2, y0 - 2, 6, 2.2), BRASS, "bevel", width=1)
    X, Y = d.S.X / d.k, d.S.Y / d.k
    t = np.clip((Y - y0) / (y1 - y0), 0, 1)
    inset = (np.clip(t - 0.5, 0, None) / 0.5) ** 1.6 * 9
    pod = (Y >= y0) & (Y <= y1) & (X >= x0 + inset) & (X <= x1 - inset)
    band = 28
    upper = pod & (Y < band)
    shade(img, upper, IVORY, "bevel", width=d.w(1.6), ambient=0.25)
    shade(img, pod & ~upper, BRASS, "bevel", width=d.w(1.6), ambient=0.25)
    img.a[d.rect(0, band, 64, 1.0) & pod] = idx("b0")
    for x in np.arange(9, 57, 5):
        img.a[d.circle(x, band + 3, 0.8) & pod] = idx("b2h")
    if kind == "ballast-keel":
        for x in (18, 32, 46):
            m = d.circle(x, 21, 5.6)
            shade(img, m, STEEL, "sphere", sphere=(*d.p(x - 1, 20), 6 * d.k, 6 * d.k), ambient=0.2)
            img.a[d.rect(x - 5.6, 21, 11.2, 0.9) & m] = idx("k4")
            img.a[d.rect(x - 1, 14.5, 2, 1.6)] = idx("b1")
    elif kind == "listening-keel":
        windows(img, d, x0 + 4, x1 - 4, 18, 5, 4)
        for (hx, lean) in ((17, -1), (32, 0), (47, 1)):
            stalk = d.rect(hx - 0.8, y1 - 4, 1.6, 4)
            shade(img, stalk, R["steel-dark"], "flat", ambient=0.5)
            top = (hx, y1 + 0.5)
            mouth = (hx + lean * 5, y1 + 8)
            horn = d.line(top, mouth, 2.0, 7.5)
            shade(img, horn, BRASS, "bevel", width=1, ambient=0.25)
            img.a[d.circle(mouth[0] + lean * 0.8, mouth[1] + 0.8, 2.6) & horn] = idx("k0")
            img.put(int((mouth[0] - 1.5) * d.k), int((mouth[1] - 2) * d.k), "t1h")
    elif kind == "sling-keel":
        windows(img, d, x0 + 4, x1 - 4, 18, 5, 4)
        mini_emitter(img, d, 24, y1 - 3, flip=True)
    elif kind == "workshop-keel":
        win = d.rect(12, 17, 40, 9.5)
        img.a[d.rect(11, 16, 42, 11.5)] = idx("k0")
        fill(img, win, "k1")
        img.a[d.rect(12, 24.5, 40, 2)] = idx("b0h")
        img.a[d.line((16, 24), (22, 18.5), 1.2)] = idx("s0h")
        img.a[d.circle(22.5, 18, 1.4)] = idx("s1")
        vice = d.rect(38, 21, 7, 3.5)
        shade(img, vice, STEEL, "bevel", width=1)
        lamp(img, 48 * d.k, 19 * d.k, max(1.0, 1.6 * d.k), R["amber"])
    outline(img, None, "k0")
    return img


# ── the lead car ─────────────────────────────────────────────────────────────────────────────────────────
def lead_car(n) -> Img:
    d = D(n)
    img = Img(n, n)
    x0, y0, x1, y1, band = 3, 20, 61, 47, 37
    carrier(img, d)
    trolley(img, d, 28, 5.5, y0 - 1)
    body(img, d, x0, y0, x1, y1, band, nose=True)
    windows(img, d, x0 + 2, 46, 24, 5, 5)
    cab = d.poly([(49, 24), (55, 24), (59, 30), (49, 30)])
    img.a[d.poly([(48, 23), (55.5, 23), (60, 31), (48, 31)])] = idx("k0")
    shade(img, cab, R["glass"], "flat", ambient=0.35)
    img.a[d.rect(50, 24, 2, 1.2)] = idx("t2")
    cup = d.rect(51, 16.5, 7, 3)
    shade(img, cup, BRASS, "bevel", width=1)
    lamp(img, 54.5 * d.k, 14 * d.k, max(1.4, 2.6 * d.k), R["amber"])
    plate_m = d.rect(10, 40, 18, 4)
    shade(img, plate_m, IVORY, "bevel", width=1, ambient=0.3)
    img.a[d.rect(12, 41.6, 14, 0.9)] = idx("i0")
    coupler(img, d, x0, band + 1, -1)
    outline(img, None, "k0")
    return img


def cars():
    out = {}
    for k in ("drone-car", "armory-car", "freight-car", "bunk-car", "veil-car"):
        out[f"car-{k}"] = rear_car(k, BIG)
        out[f"car-{k}-sm"] = rear_car(k, SM)
    for k in ("ballast-keel", "listening-keel", "sling-keel", "workshop-keel"):
        out[f"car-{k}"] = keel(k, BIG)
        out[f"car-{k}-sm"] = keel(k, SM)
    out["car-lamplighter"] = lead_car(BIG)
    out["car-lamplighter-sm"] = lead_car(SM)
    return out


# ══ modules ════════════════════════════════════════════════════════════════════════════════════════════════
def crate(n) -> Img:
    d = D(n)
    img = Img(n, n)
    outer = d.chamfer(1.5, 1.5, 61, 61, 5)
    inner = d.chamfer(7, 7, 50, 50, 3)
    shade(img, outer & ~inner, BRASS, "bevel", width=d.w(2.4), ambient=0.22)
    fill(img, inner, "k1")
    sh = inner & ~np.roll(np.roll(inner, d.w(2), 0), d.w(2), 1)
    img.a[sh] = idx("k0")
    for (x, y) in ((5, 5), (59, 5), (5, 59), (59, 59)):
        dome(img, x * d.k, y * d.k, max(1.1, 1.8 * d.k), ["k2", "b0", "b1", "b1h", "b2h", "b3"])
    plate_m = d.rect(24, 58.5, 16, 3.5)
    shade(img, plate_m, IVORY, "bevel", width=1, ambient=0.35)
    outline(img, None, "k0")
    return img


def _sys_content(sid, size, body_ramp, glow_key):
    body, cut, glow = glyph_masks(sid, size)
    img = Img(size, size)
    shade(img, body & ~cut, body_ramp, "bevel", width=1 if size < 30 else 2, ambient=0.25)
    img.a[cut & body] = idx(body_ramp[0])
    img.a[glow] = idx(glow_key)
    outline(img, None, "k0")
    return img


def content(name, n) -> Img:
    size = int(round(n * 0.62))
    d = D(size)
    if name == "drone-bay":
        return _sys_content("drones", size, BRASS, "t0h")
    if name == "veil-housing":
        return _sys_content("veil", size, ["k2", "v0", "v0h", "v1", "v1h"], "v1h")
    if name == "listening-horn-array":
        return _sys_content("sensors", size, BRASS, "t0h")
    if name == "kettle-bench":
        return _sys_content("medbay", size, BRASS, "a0")
    img = Img(size, size)
    if name == "workshop":
        sp = d.line((8, 56), (40, 22), 6) | d.circle(44, 18, 10)
        jaw = d.poly([(44, 18), (62, 2), (62, 12), (52, 18)]) | d.circle(45, 17, 4.5)
        shade(img, sp & ~jaw, STEEL, "bevel", width=d.w(2), ambient=0.25)
        ham = d.line((12, 14), (46, 50), 4.5)
        shade(img, ham, ["k2", "c0", "c0h", "c1", "c1h", "c2"], "bevel", width=1, ambient=0.3)
        head = d.poly([(4, 16), (16, 4), (24, 12), (12, 24)])
        shade(img, head, R["iron"], "bevel", width=d.w(2), ambient=0.3)
    elif name == "bunks":
        frame_m = d.rect(4, 6, 5, 54) | d.rect(55, 6, 5, 54)
        shade(img, frame_m, BRASS, "bevel", width=1, ambient=0.3)
        for y in (14, 38):
            mat = d.rrect(9, y, 46, 7, 2)
            shade(img, mat, IVORY, "bevel", width=1, ambient=0.3)
            blank = d.rect(24, y, 31, 7) & mat
            shade(img, blank, ["k2", "k3", "k4", "k5", "k5~s0"], "bevel", width=1, ambient=0.3)
            img.a[d.rect(9, y + 7, 46, 3)] = idx("b0h")
        lamp(img, 50 * d.k, 30 * d.k, max(1.2, 2.2 * d.k), R["amber"])
    elif name == "cargo-hold":
        for (x, y, s) in ((4, 30, 26), (33, 30, 26), (18, 5, 26)):
            cm = d.rect(x, y, s, s)
            shade(img, cm, ["k2", "c0", "c0h", "c1", "c1h", "c2", "c2h"], "bevel", width=d.w(2), ambient=0.25)
            img.a[d.line((x + 3, y + 3), (x + s - 3, y + s - 3), 1.6) & cm] = idx("c0")
            img.a[d.line((x + s - 3, y + 3), (x + 3, y + s - 3), 1.6) & cm] = idx("c0")
            img.a[d.rect(x, y + s / 2 - 1, s, 1.6) & cm] = idx("c0h")
    elif name == "payload-rack":
        rack = d.rect(2, 44, 60, 5) | d.rect(2, 56, 60, 4)
        shade(img, rack, BRASS, "bevel", width=1, ambient=0.3)
        for x in (10, 26, 42):
            shell = d.rrect(x, 16, 12, 30, 2)
            shade(img, shell, BRASS, "cyl", cyl=(d.p(x + 6, 0), d.p(x + 6, 64), 6 * d.k), ambient=0.2)
            nose = d.ellipse(x + 6, 16, 6, 7) & d.rect(0, 0, 64, 17)
            shade(img, nose, ["k1", "t0", "t0h", "t1"], "sphere", sphere=(*d.p(x + 5, 12), 6 * d.k, 6 * d.k))
            img.a[d.rect(x, 34, 12, 3) & shell] = idx("c1h")
            img.put(int((x + 3) * d.k), int(12 * d.k), "t2")
    elif name == "ballast":
        tank = d.circle(32, 36, 24)
        shade(img, tank, STEEL, "sphere", sphere=(*d.p(28, 32), 26 * d.k, 26 * d.k), ambient=0.2)
        img.a[d.rect(8, 36, 48, 2) & tank] = idx("k4")
        for x in np.arange(12, 54, 6):
            img.a[d.circle(x, 40, 1) & tank] = idx("s1h")
        valve = d.rect(28, 4, 8, 9)
        shade(img, valve, BRASS, "bevel", width=1)
        img.a[d.rect(24, 4, 16, 3)] = idx("b1h")
    outline(img, None, "k0")
    return img


MODULES = ["drone-bay", "veil-housing", "workshop", "bunks", "cargo-hold", "payload-rack", "ballast",
           "listening-horn-array", "kettle-bench"]


def module_icon(name, n) -> Img:
    img = crate(n)
    c = content(name, n)
    bb = c.bbox()
    c = c.crop(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1])
    lim = int(n * 0.72)
    if c.w > lim or c.h > lim:
        raise ValueError(f"module {name} content {c.w}x{c.h} > {lim}")
    img.blit(c, (n - c.w) // 2, (n - c.h) // 2 - max(1, n // 32))
    return img


def modules():
    out = {}
    for m in MODULES:
        out[f"module-{m}"] = module_icon(m, BIG)
        out[f"module-{m}-sm"] = module_icon(m, SM)
    return out
