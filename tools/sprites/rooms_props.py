"""HD props for the rooms atlas (TILE 72): system emblems, windows, livery lamps, pipes and fittings, stowage props,
stencils, module dressings and the empty socket. All dark and low-contrast; light only on small accents."""
from __future__ import annotations

import math

import numpy as np

import hd
from px import Img, hexof, idx
from rooms_kit import (AMBER_GLOW, BRASS, BRASS_D, COPPER_D, FLOOR, GLASS, IRON, IVORY_D, RIVET, STEEL, T,
                       TEAL_GLOW, VERD_D, WALL, WALL_LO, WOOD, bolt, box, cyl_h, cyl_v, darken, disc_mask, gauge,
                       lamp, lighten, poly, put, rect_mask, rivet, shade_mask, shadow_below, shadow_right,
                       sphere_shade, stencil, stencil_img, torus_shade, wear)
from rooms_walls import LABEL, SYSTEMS, cabinet, fan, louvres, note, shelf, speaker, switchboard

# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# System emblems: glyphs engraved into a dark steel plate (44x40, anchor 22,20)
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
GW, GH = 28, 26


def _g():
    return hd.grid(GW, GH)


def _ring(cx, cy, ro, ri):
    X, Y = _g()
    d = np.hypot(X - cx, Y - cy)
    return (d <= ro) & (d > ri)


def _disc(cx, cy, r):
    X, Y = _g()
    return np.hypot(X - cx, Y - cy) <= r


def _rect(x, y, w, h):
    m = np.zeros((GH, GW), bool)
    m[y:y + h, x:x + w] = True
    return m


def _poly(pts):
    return hd.poly_mask(GW, GH, pts)


def _line(x0, y0, x1, y1, r=1.0):
    m, *_ = hd.capsule(GW, GH, (x0, y0), (x1, y1), r)
    return m


def glyph(sysid) -> np.ndarray:
    if sysid == "shields":
        outer = _poly([(5, 2), (23, 2), (23, 12), (14, 24), (5, 12)])
        inner = _poly([(8, 5), (20, 5), (20, 12), (14, 20), (8, 12)])
        return (outer & ~inner) | _poly([(11, 8), (17, 8), (17, 12), (14, 16), (11, 12)])
    if sysid == "engines":
        wheel = _ring(14, 15, 8.5, 5.5) | _disc(14, 15, 2.2)
        spokes = _line(14, 15, 14, 8, 0.8) | _line(14, 15, 20, 19, 0.8) | _line(14, 15, 8, 19, 0.8)
        cable = _rect(1, 3, 26, 2)
        hanger = _rect(13, 4, 2, 4)
        return wheel | spokes | cable | hanger
    if sysid == "weapons":
        barrel = _rect(8, 9, 18, 5)
        rings = _rect(12, 7, 2, 9) | _rect(17, 7, 2, 9) | _rect(22, 8, 2, 7)
        breech = _rect(3, 6, 7, 11)
        mount = _poly([(4, 17), (10, 17), (12, 23), (2, 23)])
        return barrel | rings | breech | mount
    if sysid == "air":
        ring = _ring(14, 13, 11.5, 9.5)
        blades = np.zeros((GH, GW), bool)
        for a0 in (0, 120, 240):
            pts = []
            for t in np.linspace(2, 8.5, 6):
                a = math.radians(a0 + t * 9)
                pts.append((14 + math.cos(a) * t, 13 + math.sin(a) * t))
            for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
                blades |= _line(x0, y0, x1, y1, 1.6)
        return ring | blades | _disc(14, 13, 2.2)
    if sysid == "medbay":
        return _rect(11, 3, 6, 20) | _rect(4, 10, 20, 6)
    if sysid == "helm":
        m = _ring(14, 13, 8.5, 6.2) | _disc(14, 13, 2.4)
        for k in range(8):
            a = math.radians(k * 45)
            m |= _line(14 + math.cos(a) * 2, 13 + math.sin(a) * 2, 14 + math.cos(a) * 12, 13 + math.sin(a) * 12, 0.9)
        return m
    if sysid == "sensors":
        horn = _poly([(3, 10), (13, 5), (13, 21), (3, 16)]) | _rect(13, 10, 4, 6)
        waves = (_ring(15, 13, 8, 6.6) | _ring(15, 13, 12, 10.6)) & _poly([(17, 0), (28, 0), (28, 26), (17, 26)])
        return horn | waves
    if sysid == "doors":
        outer = _rect(6, 2, 16, 22) & ~_rect(8, 4, 12, 18)
        split = _rect(13, 4, 2, 18)
        leaves = _rect(9, 5, 3, 16) | _rect(16, 5, 3, 16)
        return outer | split | leaves
    if sysid == "drones":
        body = _poly([(9, 11), (19, 11), (21, 16), (7, 16)]) | _rect(12, 16, 4, 4)
        arms = _rect(3, 8, 22, 2)
        rotors = _rect(1, 6, 7, 1) | _rect(20, 6, 7, 1) | _rect(4, 7, 1, 3) | _rect(23, 7, 1, 3)
        return body | arms | rotors
    if sysid == "veil":
        hood = _poly([(4, 21), (8, 6), (14, 2), (20, 6), (24, 21)]) & ~_poly([(8, 21), (11, 9), (14, 6), (17, 9),
                                                                            (20, 21)])
        lamp_ = _disc(14, 15, 3.2)
        slats = _rect(9, 19, 10, 1) | _rect(10, 22, 8, 1)
        return hood | lamp_ | slats
    if sysid == "reactor":
        bulb = _disc(14, 10, 7.5) & ~_disc(14, 10, 5.5)
        fil = _line(11, 12, 14, 7, 0.7) | _line(14, 7, 17, 12, 0.7)
        base = _rect(10, 17, 8, 2) | _rect(10, 20, 8, 2) | _rect(11, 23, 6, 2)
        return bulb | fil | base
    raise KeyError(sysid)


def emblem(sysid, lit=False) -> Img:
    """A dark enamelled steel plate with the system glyph engraved into it: recess k1, brass inlay on the lit lower
    lip; `-lit` turns the inlay faint teal and adds one small teal lamp pip (never a lit glyph). 44x40."""
    W, H = 44, 40
    im = Img(W, H)
    m = rect_mask(im, 0, 0, W, H)
    for x, y in ((0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)):
        m[y, x] = False
    shade_mask(im, m, ["k0", "k1", "k1h", "k2", "k2h", "k3", "k3h"], bevel=2, flat=0.5, grad=0.15)
    wear(im, m & ~rect_mask(im, 4, 4, W - 8, H - 8), 90 + SYSTEMS.index(sysid), n=4)
    for x, y in ((3, 3), (W - 6, 3), (3, H - 6), (W - 6, H - 6)):
        rivet(im, x, y, RIVET)
    g = glyph(sysid)
    ox, oy = (W - GW) // 2, (H - GH) // 2
    pad = np.pad(g, 1, constant_values=False)
    for y in range(GH):
        for x in range(GW):
            if not g[y, x]:
                continue
            down = not pad[y + 2, x + 1]
            right = not pad[y + 1, x + 2]
            up = not pad[y, x + 1]
            left = not pad[y + 1, x]
            if down or right:
                c = ("t0h" if down else "t0") if lit else ("b0h" if down else "b0")
            elif up or left:
                c = "k0h"
            else:
                c = "k1"
            put(im, ox + x, oy + y, c)
    if lit:
        lamp(im, W - 9.5, 9.5, 1.3, TEAL_GLOW, BRASS_D, lit=True)
    return im


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Windows (anchor centre): night sky outside, a faint horizon, glass glints
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
SKY = ["k0h", "k0h", "k1", "k1", "k1", "k1h", "k1h", "k2", "k2", "k2h", "k3", "k3h"]


def window(w, h) -> Img:
    im = Img(w, h)
    box(im, 0, 0, w, h, BRASS_D, bevel=2, flat=0.42)
    ih = h - 6
    for j in range(ih):
        im.hline(3, w - 4, 3 + j, SKY[min(len(SKY) - 1, int(j / ih * len(SKY)))])
    im.hline(3, w - 4, 3, "k0")
    im.vline(3, 3, h - 4, "k0")
    im.line(6, h - 5, 6 + ih - 2, 4, "k3")
    im.line(7, h - 5, 7 + ih - 2, 4, "k2h")
    for x in range(w // 3, w - 3, w // 3):
        im.vline(x, 3, h - 4, "k1")
    for bx in (1, w - 3):
        put(im, bx, h // 2, "b1")
    return im


def porthole() -> Img:
    im = Img(24, 24)
    c = 12
    outer = disc_mask(24, 24, c, c, 11.5)
    glass = disc_mask(24, 24, c, c, 7.2)
    torus_shade(im, outer & ~glass, c, c, 9.4, BRASS_D)
    X, Y = hd.grid(24, 24)
    for y in range(24):
        for x in range(24):
            if glass[y, x]:
                im.put(x, y, SKY[min(len(SKY) - 1, int((y - 5) / 14 * len(SKY)))] if y > 5 else "k0h")
    im.line(8, 14, 13, 8, "k3")
    for a in range(0, 360, 45):
        r_ = math.radians(a)
        rivet(im, int(c + math.cos(r_) * 9.3) - 1, int(c + math.sin(r_) * 9.3) - 1, RIVET, shadow=False)
    return im


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Livery lamps (amber = identity; swapped by the `livery` table). anchor top-centre on the wall.
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
LAMP_AMBER = ["a0", "a0h", "a1", "a1h", "a2", "a2h", "a3"]


def lamp_wall(state) -> Img:
    """10x18 caged bulkhead lamp on a bracket."""
    im = Img(10, 18)
    box(im, 3, 0, 4, 3, BRASS_D, bevel=1)                 # bracket
    box(im, 1, 3, 8, 3, BRASS_D, bevel=1, flat=0.5)       # cap
    bulb = hd.ellipse_mask(10, 18, 5, 10.5, 3.6, 4.6)
    if state == "off":
        sphere_shade(im, bulb, 4.2, 9, 5, GLASS)
    else:
        r = LAMP_AMBER if state == 0 else LAMP_AMBER[:-2]
        sphere_shade(im, bulb, 4.4, 9.5, 5.2, ["c1"] + r, bias=0.15)
    for y in (7, 10, 13):                                  # cage wires
        for x in range(1, 9):
            if bulb[y, x] or (x in (1, 8) and 6 <= y <= 14):
                put(im, x, y, "b0")
    box(im, 2, 15, 6, 2, BRASS_D, bevel=0, flat=0.4)
    put(im, 5, 17, "b0")
    return im


def lamp_ceiling(state) -> Img:
    """12x16 hanging lamp with a shade (anchor top centre on the ceiling beam)."""
    im = Img(12, 16)
    im.vline(6, 0, 4, "b0")
    shade = hd.poly_mask(12, 16, [(3, 5), (9, 5), (12, 10), (0, 10)])
    shade_mask(im, shade, BRASS_D, bevel=1, flat=0.5)
    bulb = hd.ellipse_mask(12, 16, 6, 11.5, 3.2, 3.0)
    if state == "off":
        sphere_shade(im, bulb, 5.5, 11, 4, GLASS)
    else:
        r = LAMP_AMBER if state == 0 else LAMP_AMBER[:-2]
        sphere_shade(im, bulb, 5.8, 11.5, 4.2, ["c1"] + r, bias=0.2)
    return im


def lamp_signal(state) -> Img:
    """8x8 panel signal lamp."""
    im = Img(8, 8)
    lamp(im, 4, 4, 2.2, ["c1"] + (LAMP_AMBER if state == 0 else LAMP_AMBER[:-2]), BRASS_D, lit=state != "off")
    return im


LIVERY_TARGET = {"teal": "t", "violet": "v", "ember": "e", "ivory": "i"}


def livery_tables():
    out = {"amber": {}}
    src = LAMP_AMBER
    for name, L in LIVERY_TARGET.items():
        dst = [f"{L}1", f"{L}1h", f"{L}2", f"{L}2h", f"{L}3", f"{L}3h", f"{L}4"]
        out[name] = {hexof(a): hexof(b) for a, b in zip(src, dst)}
    return out


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Pipes / fittings
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
def pipe_h(ramp=BRASS_D, d=10, n=T) -> Img:
    im = Img(n, d)
    cyl_h(im, 0, n - 1, 0, d, ramp)
    im.hline(0, n - 1, 0, "k0")
    im.hline(0, n - 1, d - 1, "k0")
    return im


def pipe_v(ramp=BRASS_D, d=10, n=T) -> Img:
    im = Img(d, n)
    cyl_v(im, 0, 0, n - 1, d, ramp)
    im.vline(0, 0, n - 1, "k0")
    im.vline(d - 1, 0, n - 1, "k0")
    return im


def pipe_elbow(which) -> Img:
    """12x12 bend joining pipe-h and pipe-v (d=10), shaded as a torus quarter."""
    im = Img(12, 12)
    c = (12, 12)
    ring = disc_mask(24, 24, 12, 12, 11.5)[:12, :12] & ~disc_mask(24, 24, 12, 12, 1.5)[:12, :12]
    X, Y = hd.grid(12, 12)
    d = np.hypot(X - 12, Y - 12)
    ramp = BRASS_D
    for y in range(12):
        for x in range(12):
            if ring[y, x]:
                t = (d[y, x] - 1.5) / 10
                s = 1 - 2 * t
                v = hd.lambert(np.array([-0.5 * s]), np.array([-0.7 * s]), np.array([math.sqrt(max(0, 1 - s * s)) + 0.2]))[0]
                im.put(x, y, ramp[min(len(ramp) - 1, int(v * len(ramp)))])
    base = im
    return {"tl": base, "tr": base.flip_h(), "bl": base.flip_v(), "br": base.flip_h().flip_v()}[which]


def pipe_flange() -> Img:
    im = Img(6, 14)
    box(im, 0, 0, 6, 14, BRASS_D, bevel=1, flat=0.5)
    for y in (2, 10):
        bolt(im, 2, y, BRASS_D)
    return im


def gauge_prop() -> Img:
    im = Img(16, 16)
    gauge(im, 8, 8, 7.4, angle=-35)
    return im


def valve_prop() -> Img:
    im = Img(18, 24)
    from rooms_walls import valve
    valve(im, 9, 8, 8)
    return im


def vent_prop() -> Img:
    im = Img(26, 14)
    from rooms_walls import vent
    vent(im, 0, 0, 26, 14)
    return im


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Stowage / furniture props (anchor bottom-centre: place at (x, tileY + 64))
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
def crate_small() -> Img:
    im = Img(26, 22)
    box(im, 0, 0, 26, 22, WOOD, bevel=2, flat=0.5, grad=0.2)
    for x in (0, 22):
        box(im, x, 0, 4, 22, BRASS_D[:6], bevel=1, flat=0.45)
    im.line(5, 3, 20, 18, "k1")
    im.line(5, 18, 20, 3, "k1")
    im.hline(0, 25, 0, "k0")
    return im


def crate_large() -> Img:
    im = Img(34, 30)
    box(im, 0, 0, 34, 30, IRON[:7], bevel=2, flat=0.42, grad=0.18)
    box(im, 0, 0, 34, 4, IVORY_D, bevel=1, flat=0.5)
    box(im, 0, 26, 34, 4, IVORY_D, bevel=1, flat=0.4)
    im.rect(6, 9, 22, 13, "k1h")
    stencil(im, "C-7", 8, 12, "k3")
    for x, y in ((3, 6), (29, 6), (3, 22), (29, 22)):
        bolt(im, x, y, IRON[:6])
    return im


def barrel() -> Img:
    im = Img(22, 30)
    for i in range(22):
        s = (i + 0.5) / 22 * 2 - 1
        v = hd.lambert(np.array([s]), np.array([0.0]), np.array([math.sqrt(max(0, 1 - s * s))]))[0]
        k = COPPER_D[min(len(COPPER_D) - 1, int(v * len(COPPER_D)))]
        im.vline(i, 2, 27, k)
    for y in (2, 9, 20, 27):
        im.hline(0, 21, y, "k0h")
        im.hline(0, 21, y + 1, "c1")
    box(im, 1, 0, 20, 3, IRON[:6], bevel=1, flat=0.45)
    im.vline(0, 2, 29, "k0")
    im.vline(21, 2, 29, "k0")
    im.hline(0, 21, 29, "k0")
    return im


def cable_spool() -> Img:
    im = Img(34, 28)
    for cx in (4, 29):
        disc = hd.ellipse_mask(34, 28, cx + 0.5, 13.5, 4, 13.5)
        shade_mask(im, disc, WOOD, bevel=2, flat=0.45)
    core = rect_mask(im, 7, 3, 20, 22)
    for x in range(7, 27):
        for y in range(3, 25):
            ph = (x + y) % 6
            s = (y - 14) / 11
            v = 0.55 - 0.3 * s - (0.3 if ph == 0 else 0)
            put(im, x, y, VERD_D[max(0, min(len(VERD_D) - 1, int(v * len(VERD_D))))])
    im.hline(0, 33, 27, "k0")
    return im


def toolbox() -> Img:
    im = Img(22, 14)
    box(im, 0, 4, 22, 10, ["k1", "e0", "e0h", "e1", "e1h"], bevel=1, flat=0.45)
    box(im, 6, 0, 10, 2, IRON[:6], bevel=0)
    im.vline(6, 0, 4, "k2")
    im.vline(15, 0, 4, "k2")
    im.hline(0, 21, 7, "k1")
    put(im, 10, 8, "b1")
    return im


def bunk() -> Img:
    im = Img(60, 24)
    box(im, 1, 5, 58, 6, ["k1", "k2", "k3", "k4", "i0~b1", "i0"], bevel=1, flat=0.5)    # mattress
    box(im, 48, 2, 11, 5, ["k2", "k3", "k4", "i0~b1", "i0", "i0h"], bevel=1, flat=0.55)  # pillow
    box(im, 1, 7, 30, 4, ["k1", "k2", "k2h", "k3", "k3h"], bevel=1, flat=0.5)          # folded blanket
    box(im, 0, 11, 60, 4, BRASS_D, bevel=1, flat=0.45)
    for x in (2, 55):
        box(im, x, 15, 3, 9, IRON[:6], bevel=1)
    return im


def galley_stove() -> Img:
    im = Img(30, 32)
    box(im, 0, 12, 30, 20, IRON[:7], bevel=2, flat=0.42, grad=0.2)
    box(im, 0, 10, 30, 3, BRASS_D, bevel=1, flat=0.5)
    im.rect(4, 17, 12, 9, "k0h")                       # oven door window
    put(im, 7, 22, "a0")                               # a small warm glow inside
    put(im, 8, 22, "c1")
    put(im, 7, 23, "c1")
    for i in range(2):
        knob(im, 20 + i * 4, 18)
    # the kettle on the hob
    body = hd.ellipse_mask(30, 32, 12, 6.5, 7, 4.2)
    sphere_shade(im, body, 10, 5, 7, STEEL[:8])
    box(im, 8, 0, 8, 2, STEEL[:6], bevel=0)
    im.line(19, 5, 23, 3, "s0")
    im.hline(5, 18, 10, "k1")
    return im


def knob(im, x, y):
    from rooms_kit import knob as _k
    _k(im, x, y, IRON[1:])


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Module dressings (72x72 back-wall overlays, anchor 0,0; `-a` first tile, `-b` second tile of a socket room)
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
def _tile():
    return Img(T, T)


def _on_floor(im, prop, cx):
    im.blit(prop, cx - prop.w // 2, FLOOR - prop.h)
    shadow_right(im, cx - prop.w // 2 + prop.w, FLOOR - prop.h + 2, FLOOR - 1, 0)


def rails(im):
    for y in (8, 38):
        box(im, 2, y, T - 4, 4, STEEL[:6], bevel=1, flat=0.45)
        shadow_below(im, 2, T - 3, y + 4, 2)
    for x in range(8, T, 18):
        for y in (18, 28, 50):
            bolt(im, x, y, IRON[:6])


def module(mid, half) -> Img:
    im = _tile()
    if mid == "drone-bay":
        if half == "a":
            box(im, 10, 8, 52, 4, BRASS_D, bevel=1)
            for x in (14, 54):
                box(im, x, 12, 4, 30, IRON[:7], bevel=1)
            for x, d in ((28, 1), (44, -1)):
                poly(im, [(x, 18), (x + 5 * d, 21), (x + 5 * d, 30), (x, 33)], STEEL[:7], bevel=1)
            im.line(36, 33, 32, 46, "c0h")
            im.line(37, 33, 33, 46, "c1")
            tray = Img(26, 6)
            box(tray, 0, 0, 26, 6, IRON[:6], bevel=1)
            for i in range(4):
                m = disc_mask(26, 6, 4 + i * 6, 3, 2)
                torus_shade(tray, m, 4 + i * 6, 3, 1.5, IVORY_D)
            im.blit(tray, 23, 50)
            lamp(im, 36, 14, 1.4, TEAL_GLOW, BRASS_D, lit=True)
        else:
            box(im, 8, 14, 56, 22, IRON[:7], bevel=2, flat=0.4)
            for i in range(4):
                bx = 12 + i * 13
                box(im, bx, 18, 10, 14, WALL_LO, bevel=1, flat=0.5)
                m = disc_mask(T, T, bx + 5, 24, 2.5)
                torus_shade(im, m, bx + 5, 24, 1.8, IVORY_D)
            shadow_below(im, 8, 63, 36, 2)
            cyl_v(im, 44, 36, 60, 2, COPPER_D)
    elif mid == "veil-housing":
        if half == "a":
            drum = hd.ellipse_mask(T, T, 36, 28, 20, 14)
            shade_mask(im, drum, IRON, bevel=3, flat=0.4)
            for y in range(18, 40, 4):
                for x in range(18, 55):
                    if drum[y, x]:
                        put(im, x, y, "k0h")
            box(im, 32, 42, 8, 22, IRON[:6], bevel=1)
            lamp(im, 50, 20, 1.3, ["v0", "v0h", "v1", "v1h", "v2", "v2h", "v3"], BRASS_D, lit=True)
        else:
            louvres(im, 8, 10, 56, 32)
    elif mid == "workshop":
        if half == "a":
            box(im, 6, 40, 60, 5, WOOD, bevel=1, flat=0.55)                 # bench top
            for x in (8, 60):
                box(im, x, 45, 4, 19, IRON[:6], bevel=1)
            box(im, 12, 32, 12, 8, IRON[:7], bevel=1)                         # vice
            box(im, 10, 34, 3, 4, STEEL[:6], bevel=0)
            box(im, 36, 36, 18, 4, ["k1", "e0", "e0h", "e1", "e1h"], bevel=1)  # toolbox
            lamp(im, 58, 34, 1.3, AMBER_GLOW, BRASS_D, lit=True)
            shadow_below(im, 6, 65, 45, 2)
        else:
            box(im, 6, 8, 60, 34, WOOD, bevel=2, flat=0.35)                  # tool board
            for x in range(10, 64, 6):
                for y in range(12, 40, 6):
                    put(im, x, y, "k1")
            for i, (x, h) in enumerate(((12, 16), (20, 12), (28, 18), (38, 10), (46, 14), (54, 16))):
                box(im, x, 12, 3, h, STEEL[:6] if i % 2 else IRON[:6], bevel=0, flat=0.55)
            shadow_below(im, 6, 65, 42, 2)
    elif mid == "bunks":
        if half == "a":
            b = bunk()
            im.blit(b, 6, 10)
            im.blit(b, 6, 34)
            for x in (6, 64):
                box(im, x, 8, 3, 56, IRON[:6], bevel=1)
        else:
            for i in range(2):
                x = 12 + i * 26
                box(im, x, 16, 22, 48, WALL, bevel=2, flat=0.5, grad=0.15)
                for y in range(20, 30, 2):
                    im.hline(x + 4, x + 17, y, "k1")
                put(im, x + 18, 40, "b1")
                put(im, x + 18, 41, "b0")
    elif mid == "cargo-hold":
        if half == "a":
            _on_floor(im, crate_large(), 22)
            _on_floor(im, crate_small(), 54)
            cs = crate_small()
            im.blit(cs, 9, 12)
        else:
            for y in range(10, 44, 7):
                im.hline(8, 64, y, "c0h")
            for x in range(8, 65, 7):
                im.vline(x, 8, 44, "c0h")
            for x in (8, 64):
                bolt(im, x, 6, IRON[:6])
            _on_floor(im, barrel(), 50)
    elif mid == "payload-rack":
        box(im, 6, 8, 60, 56, IRON[:6], bevel=2, flat=0.35)
        for row, y in enumerate((12, 30, 48)):
            box(im, 8, y + 14, 56, 3, BRASS_D, bevel=1)
            for i in range(9):
                if half == "b" and row == 2 and i >= 5:
                    continue
                x = 10 + i * 6
                cyl_v(im, x, y + 2, y + 13, 4, BRASS_D[:6])
                for dx, c in enumerate(("k2", "k3", "k3", "k2")):
                    put(im, x + dx, y + 1, c)
        if half == "a":
            put(im, 11, 13, "t1")
    elif mid == "ballast":
        if half == "a":
            tank = hd.ellipse_mask(T, T, 36, 44, 28, 10)
            shade_mask(im, tank, BRASS_D, bevel=3, flat=0.45)
            for x in (20, 52):
                box(im, x, 52, 4, 12, IRON[:6], bevel=1)
            gauge(im, 36, 22, 6, angle=10)
            cyl_v(im, 35, 28, 34, 2, BRASS_D)
        else:
            for i in range(3):
                for x0 in (12, 40):
                    box(im, x0, FLOOR - 9 - i * 9, 22, 9, IRON[:7], bevel=2, flat=0.42)
    elif mid == "listening-horn-array":
        if half == "a":
            for (hx, hy, s) in ((6, 8, 1.0), (40, 6, 1.1)):
                L = 22 * s
                pts = [(hx, hy), (hx + L, hy + L * 0.5), (hx + L - 4, hy + L * 0.5 + 6), (hx - 3, hy + 9 * s)]
                poly(im, pts, BRASS_D, bevel=2, flat=0.5)
                mouth = disc_mask(T, T, hx + 1, hy + 4.5 * s, 4.5 * s)
                im.a[mouth] = idx("k0h")
                cyl_v(im, int(hx + L - 5), int(hy + L * 0.5 + 5), 60, 3, COPPER_D)
        else:
            switchboard(im, 10, 14, 7, ((0, 4, "c1"), (2, 6, "e0h")))
            lamp(im, 52, 20, 1.4, TEAL_GLOW, BRASS_D, lit=True)
            for x in (18, 30, 42):
                cyl_v(im, x, 40, 60, 2, COPPER_D)
    elif mid == "kettle-bench":
        if half == "a":
            box(im, 4, 44, 64, 5, WOOD, bevel=1, flat=0.55)
            for x in (6, 62):
                box(im, x, 49, 4, 15, IRON[:6], bevel=1)
            k = galley_stove().crop(0, 0, 30, 11)
            im.blit(k, 10, 33)
            for i, x in enumerate((36, 44)):
                box(im, x, 38, 6, 6, IVORY_D, bevel=1, flat=0.55)
                put(im, x + 6, 40, "k4")
            # steam, very faint
            for (x, y) in ((22, 28), (23, 26), (22, 24), (21, 22)):
                put(im, x, y, "k3h")
            put(im, 18, 43, "a0")
            shadow_below(im, 4, 67, 49, 2)
        else:
            shelf(im, 10, 26, 36)
            note(im, 52, 14, seed=11)
            _on_floor(im, barrel(), 50)
    else:
        raise KeyError(mid)
    return im


MODULES = ["drone-bay", "veil-housing", "workshop", "bunks", "cargo-hold", "payload-rack", "ballast",
           "listening-horn-array", "kettle-bench"]


def socket_empty(half) -> Img:
    im = _tile()
    rails(im)
    if half == "a":
        stencil(im, "SOCKET", 18, 22, "k3", chips=0.12, seed=4)
    return im


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
def add(atlas):
    atlas.group("emblems")
    for sysid in SYSTEMS:
        atlas.add(f"emblem-{sysid}", emblem(sysid), 22, 20)
        atlas.add(f"emblem-{sysid}-lit", emblem(sysid, True), 22, 20)
    atlas.group("stencils")
    for kind, text in LABEL.items():
        im = stencil_img(text, "k3")
        atlas.add(f"stencil-{kind}", im, im.w // 2, 3)
    atlas.group("windows-lamps")
    for name, im in (("window-slit", window(40, 14)), ("window-cab", window(48, 22)), ("porthole", porthole())):
        atlas.add(name, im, im.w // 2, im.h // 2)
    livery_frames = []
    for name, fn in (("lamp-wall", lamp_wall), ("lamp-ceiling", lamp_ceiling), ("lamp-signal", lamp_signal)):
        ims = [fn(0), fn(1)]
        names = [atlas.add(f"{name}-{i}", im, im.w // 2, 0) for i, im in enumerate(ims)]
        off = fn("off")
        atlas.add(f"{name}-off", off, off.w // 2, 0)
        atlas.anim(name, names, 3, True)
        livery_frames += names + [f"{name}-off"]
    atlas.group("pipes")
    atlas.add("pipe-h", pipe_h(), 0, 0)
    atlas.add("pipe-v", pipe_v(), 0, 0)
    for w in ("tl", "tr", "bl", "br"):
        atlas.add(f"pipe-elbow-{w}", pipe_elbow(w), 0, 0)
    atlas.add("pipe-flange", pipe_flange(), 3, 0)
    atlas.add("conduit-h", pipe_h(VERD_D, 6), 0, 0)
    atlas.add("conduit-v", pipe_v(VERD_D, 6), 0, 0)
    atlas.add("gauge", gauge_prop(), 8, 8)
    atlas.add("valve", valve_prop(), 9, 8)
    atlas.add("vent", vent_prop(), 13, 7)
    atlas.group("props")
    for name, fn in (("crate-small", crate_small), ("crate-large", crate_large), ("barrel", barrel),
                     ("cable-spool", cable_spool), ("toolbox", toolbox), ("bunk", bunk),
                     ("galley-stove", galley_stove)):
        im = fn()
        atlas.add(name, im, im.w // 2, im.h)
    atlas.group("modules")
    for mid in MODULES:
        for half in ("a", "b"):
            atlas.add(f"module-{mid}-{half}", module(mid, half), 0, 0)
    atlas.add("socket-empty-a", socket_empty("a"), 0, 0)
    atlas.add("socket-empty-b", socket_empty("b"), 0, 0)
    atlas.meta("livery", livery_tables())
    atlas.meta("liveryFrames", livery_frames)
