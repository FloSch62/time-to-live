"""HD station devices for the rooms atlas: 72x72 overlays (anchor 0,0) drawn on the station tile BEFORE the crew.

Right-facing: the device stands in columns ~40..71, its working face (slanted control surface, rows ~28..42)
toward the operator standing at x ~30; left-facing frames are mirrors (operator at x ~42). States: two powered
frames (a lamp blinks) and `-off` (all lamps dark, screens dead). Light is only ever a few small lamps (rule 8).
"""
from __future__ import annotations

import math

import numpy as np

import hd
from px import Img, idx
from rooms_kit import (AMBER_GLOW, BRASS, BRASS_D, COPPER_D, GLASS, IRON, IVORY_D, RIVET, STEEL, T,
                       TEAL_GLOW, VERD_D, box, bolt, cyl_h, cyl_v, darken, disc_mask, gauge, knob, lamp, poly, put,
                       rect_mask, rivet, screen, shade_mask, shadow_below, shadow_right, sphere_shade, torus_shade)

DESK = IRON                       # console carcass: dark iron
FLOOR = 58    # devices are designed on a 64 grid with the floor at 58, then shifted (+6, +6) onto the 72 tile
SHIFT = 6
TRIM = BRASS_D                    # tarnished brass trim
GLOWS = {
    "teal": TEAL_GLOW,
    "amber": AMBER_GLOW,
    "violet": ["v0", "v0h", "v1", "v1h", "v2", "v2h", "v3", "v3h", "v4"],
    "verd": ["g0", "g0h", "g1", "g1h", "g2", "g2h", "g3", "g3h", "g4"],
    "ember": ["e0", "e0h", "e1", "e1h", "e2", "e2h", "e3", "e3h", "e4"],
}


class Ctx:
    """Drawing context for one frame: state 'on0' | 'on1' | 'off'."""

    def __init__(self, state):
        self.state = state
        self.on = state != "off"
        self.blink = state == "on0"

    def lamp(self, im, x, y, r=1.4, glow="teal", steady=True):
        lit = self.on and (steady or self.blink)
        lamp(im, x, y, r, GLOWS[glow], TRIM, lit=lit)

    def pip(self, im, x, y, glow="teal", steady=False):
        lit = self.on and (steady or not self.blink)
        g = GLOWS[glow]
        put(im, x, y, g[-2] if lit else "k2")
        put(im, x + 1, y, g[-5] if lit else "k1h")


def desk(im: Img, x0=36, top=30, slope_x=46, back_top=None, x1=62):
    """Side-view console carcass: a slanted control face rising from (x0, top+6) to (slope_x, top), a vertical back
    and a plinth on the floor. Returns the slanted-face mask."""
    back_top = top if back_top is None else back_top
    pts = [(x0, FLOOR), (x0, top + 7), (slope_x, top), (x1, top), (x1, FLOOR)]
    body = hd.poly_mask(im.w, im.h, pts)
    shade_mask(im, body, DESK, bevel=2, flat=0.45, grad=0.25)
    # slanted control face (lit: it faces up-left)
    face = hd.poly_mask(im.w, im.h, [(x0 + 1, top + 7), (slope_x, top + 1), (slope_x + 3, top + 1),
                                     (x0 + 4, top + 9), (x0 + 1, top + 9)])
    shade_mask(im, face, IRON[2:], bevel=0, flat=0.62)
    # brass lip along the slope and the top
    im.line(x0, top + 7, slope_x, top, TRIM[-2])
    im.hline(slope_x, x1, top, TRIM[-3])
    im.hline(slope_x, x1, top + 1, TRIM[2])
    # plinth + kick
    box(im, x0 - 1, FLOOR - 4, x1 - x0 + 3, 4, IRON[:6], bevel=1, flat=0.35)
    # access panel with louvres on the cabinet side
    px0, py0 = x0 + 6, top + 14
    box(im, px0, py0, x1 - px0 - 4, 12, DESK[1:], bevel=1, flat=0.35)
    for yy in range(py0 + 3, py0 + 10, 2):
        im.hline(px0 + 3, x1 - 8, yy, "k0h")
    for bx, by in ((px0 + 1, py0 + 1), (x1 - 6, py0 + 1), (px0 + 1, py0 + 9), (x1 - 6, py0 + 9)):
        put(im, bx, by, "k3")
    im.vline(x1 + 1, top, FLOOR - 1, "k0")
    shadow_right(im, x1 + 1, top + 2, FLOOR - 1, 1)
    return face


def slope_controls(im: Img, c: Ctx, x0=36, top=30, slope_x=46, glow="teal", n=3):
    """A row of knobs and pips along the slanted face."""
    for i in range(n):
        t = (i + 1) / (n + 1)
        x = int(x0 + 1 + (slope_x - x0) * t)
        y = int(top + 7 - 7 * t) + 1
        if i == n // 2:
            c.pip(im, x, y, glow)
        else:
            knob(im, x, y, IRON[1:])


def hood(im: Img, x, y, w, h, ramp=DESK):
    box(im, x, y, w, h, ramp, bevel=2, flat=0.42, grad=0.2)
    im.hline(x, x + w - 1, y, "k0")
    im.vline(x + w - 1, y, y + h - 1, "k0")
    im.vline(x, y, y + h - 1, "k0")
    for rx in (x + 2, x + w - 5):
        rivet(im, rx, y + 2, RIVET)
    shadow_right(im, x + w, y + 1, y + h, 1)


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
def helm(im, c):
    # cab window high on the wall (the helm sits at the nose)
    box(im, 38, 4, 26, 18, TRIM, bevel=2, flat=0.4)
    im.rect(41, 7, 20, 12, "k0h")
    for y in range(7, 19):  # the night outside: a faint gradient, horizon glow at the bottom
        c_ = ["k0h", "k0h", "k1", "k1", "k1", "k1h", "k1h", "k2", "k2", "k2h", "k3", "k2h"][y - 7]
        im.hline(41, 60, y, c_)
    im.line(43, 16, 47, 12, "k3")      # glass glint
    im.line(44, 16, 48, 12, "k2h")
    im.vline(50, 7, 18, "k1")          # mullion
    shadow_below(im, 38, 63, 22, 2)
    desk(im, 36, 30, 46)
    slope_controls(im, c, 36, 30, 46, "teal", 3)
    # steering wheel on its column in front of the desk
    cyl_v(im, 33, 30, 44, 3, TRIM)
    wx, wy = 34.5, 28.5
    outer = disc_mask(im.w, im.h, wx, wy, 7.5)
    inner = disc_mask(im.w, im.h, wx, wy, 5.6)
    torus_shade(im, outer & ~inner, wx, wy, 6.5, TRIM)
    for a in (30, 150, 270):
        r_ = math.radians(a)
        for t in np.linspace(1, 5.6, 6):
            put(im, math.floor(wx + math.cos(r_) * t), math.floor(wy + math.sin(r_) * t), TRIM[3])
    hub = disc_mask(im.w, im.h, wx, wy, 1.6)
    sphere_shade(im, hub, wx, wy, 2, TRIM[2:])
    # chart-lamp on the desk top
    c.lamp(im, 57, 27, 1.5, "amber")


def shields(im, c):
    hood(im, 44, 8, 18, 22)
    # ward-mesh board: a lattice with nodes
    im.rect(47, 11, 12, 16, "k0h")
    for y in range(11, 27, 3):
        im.hline(47, 58, y, "k1h")
    for x in range(47, 59, 3):
        im.vline(x, 11, 26, "k1h")
    for (nx, ny) in ((50, 14), (56, 20), (53, 23)):
        put(im, nx, ny, "k3")
    c.pip(im, 50, 17, "teal")
    c.pip(im, 56, 14, "teal", steady=True)
    # ward coil drum on top
    cyl_h(im, 45, 60, 4, 4, COPPER_D)
    for x in range(45, 61, 2):
        put(im, x, 5, "k1")
    desk(im, 36, 30, 46)
    slope_controls(im, c, 36, 30, 46, "teal", 3)


def weapons(im, c):
    # periscope sight tube down from the ceiling to an eyepiece
    cyl_v(im, 48, 0, 20, 4, STEEL[:7])
    box(im, 42, 20, 12, 6, IRON, bevel=1, flat=0.45)
    box(im, 40, 21, 3, 4, TRIM, bevel=1)
    put(im, 40, 22, "k0")
    desk(im, 36, 30, 46)
    # range dial and trigger levers
    gauge(im, 56, 38, 5.5, angle=40, face=IVORY_D, bezel=TRIM)
    for i, lx in enumerate((40, 43)):
        im.line(lx, 33 - i, lx + 2, 27 - i, "k2h")
        box(im, lx + 1, 25 - i, 3, 3, ["k1", "e0", "e0h", "e1"], bevel=1)
    c.pip(im, 58, 31, "amber")
    c.lamp(im, 61, 27, 1.3, "amber")


def engines(im, c):
    hood(im, 48, 12, 14, 18)
    gauge(im, 55, 20, 5.5, angle=-60 if c.blink else -30, face=IVORY_D, bezel=TRIM)
    desk(im, 36, 30, 46)
    # the drive throttle: two tall levers in a quadrant
    q = hd.poly_mask(im.w, im.h, [(38, 34), (46, 26), (48, 28), (40, 36)])
    shade_mask(im, q, TRIM, bevel=1, flat=0.45)
    for i, (bx, by, tx, ty) in enumerate(((42, 31, 36, 18), (44, 29, 40, 16))):
        im.line(bx, by, tx, ty, "k3" if i == 0 else "k2h")
        im.line(bx + 1, by, tx + 1, ty, "k1h")
        box(im, tx - 1, ty - 3, 4, 4, IVORY_D, bevel=1, flat=0.55)
    c.pip(im, 58, 32, "amber")
    c.lamp(im, 51, 14.5, 1.2, "amber", steady=False)


def sensors(im, c):
    # listening horns: two brass cones on swivels
    for (hx, hy, s) in ((44, 4, 1.0), (54, 9, 0.75)):
        L = 12 * s
        pts = [(hx, hy), (hx + L, hy + L * 0.55), (hx + L - 3 * s, hy + L * 0.55 + 4 * s), (hx - 2 * s, hy + 5 * s)]
        poly(im, pts, TRIM, bevel=1, flat=0.5)
        mouth = disc_mask(im.w, im.h, hx + 0.5, hy + 2.6 * s, 2.8 * s)
        im.a[mouth] = idx("k0h")
        cyl_v(im, int(hx + L - 3), int(hy + L * 0.55 + 3), 26, 2, IRON[:6])
    hood(im, 46, 20, 16, 12)
    # a round scope with a trace
    scope = disc_mask(im.w, im.h, 54, 26, 4.2)
    rim = disc_mask(im.w, im.h, 54, 26, 5.4) & ~scope
    torus_shade(im, rim, 54, 26, 4.8, TRIM)
    im.a[scope] = idx("k0h")
    if c.on:
        for x in range(51, 58):
            put(im, x, 26 + (1 if (x + (0 if c.blink else 1)) % 4 == 0 else 0), "t0h")
        put(im, 55, 26, "t2")
    desk(im, 36, 34, 46, x1=62)
    slope_controls(im, c, 36, 34, 46, "teal", 3)


def doors(im, c):
    hood(im, 44, 10, 18, 20)
    # mimic diagram of the tender's doors: a line with lamp stations
    im.rect(47, 13, 12, 12, "k0h")
    im.hline(48, 57, 19, "k2")
    for i, x in enumerate((49, 52, 55)):
        im.vline(x, 15, 23, "k1h")
        put(im, x, 19, "k3")
    c.pip(im, 51, 16, "teal")
    c.pip(im, 55, 22, "ember", steady=True)
    # a bank of levers on the desk
    desk(im, 36, 32, 46)
    for i in range(3):
        lx = 38 + i * 3
        im.line(lx, 35 - i, lx - 1, 28 - i, "k3")
        box(im, lx - 2, 26 - i, 3, 3, TRIM, bevel=1)


def medbay(im, c):
    # wall cabinet with a verdigris cross lamp
    box(im, 46, 6, 16, 18, IVORY_D, bevel=2, flat=0.45, grad=0.15)
    im.rect(49, 9, 10, 12, "k2")
    cx, cy = 54, 15
    g = GLOWS["verd"]
    lit = c.on
    im.rect(cx - 1, cy - 4, 3, 9, g[2] if lit else "k3")
    im.rect(cx - 4, cy - 1, 9, 3, g[2] if lit else "k3")
    if lit:
        put(im, cx, cy, g[5 if c.blink else 4])
    shadow_below(im, 46, 62, 24, 2)
    # the bench: a padded cot along the tile
    top = 40
    box(im, 4, top, 58, 5, ["k2", "k3", "k4", "i0~b1", "i0", "i0h"], bevel=1, flat=0.55)   # mattress
    box(im, 56, top - 5, 7, 6, ["k2", "k3", "k4", "i0~b1", "i0"], bevel=1, flat=0.5)       # pillow end
    box(im, 3, top + 5, 60, 3, TRIM, bevel=1, flat=0.45)                                 # frame
    for lx in (6, 57):
        box(im, lx, top + 8, 3, FLOOR - top - 8, IRON[:6], bevel=1)
    shadow_below(im, 3, 62, top + 8, 2)


def air(im, c):
    # the air plant: a fan housing on a pedestal, ducts up into the ceiling
    cyl_v(im, 52, 0, 12, 6, STEEL[:7])
    fx, fy, r = 51.5, 22.5, 10.5
    outer = disc_mask(im.w, im.h, fx, fy, r)
    inner = disc_mask(im.w, im.h, fx, fy, r - 2.5)
    torus_shade(im, outer & ~inner, fx, fy, r - 1.2, IRON)
    im.a[inner] = idx("k0h")
    rot = 0 if c.blink or not c.on else 45
    for a0 in (0, 90, 180, 270):
        for t in np.linspace(1.5, r - 3, 9):
            a = math.radians(a0 + rot + t * 6)
            put(im, math.floor(fx + math.cos(a) * t), math.floor(fy + math.sin(a) * t), "k2h")
    hub = disc_mask(im.w, im.h, fx, fy, 2.2)
    sphere_shade(im, hub, fx, fy, 2.5, IRON[2:])
    box(im, 46, 33, 12, FLOOR - 33, IRON, bevel=2, flat=0.4, grad=0.2)
    gauge(im, 52, 40, 3.8, angle=20, face=IVORY_D, bezel=TRIM, glint=False)
    c.pip(im, 49, 48, "teal")


def drones(im, c):
    # the launch cradle: two clamp jaws on a frame, a charging lead, no drone body
    box(im, 40, 6, 22, 3, TRIM, bevel=1)
    for x in (42, 58):
        box(im, x, 9, 3, 22, IRON[:7], bevel=1)
    for x, d in ((46, 1), (54, -1)):
        pts = [(x, 12), (x + 3 * d, 14), (x + 3 * d, 20), (x, 22)]
        poly(im, pts, STEEL[:7], bevel=1)
    im.line(50, 22, 47, 30, "c0h")
    im.line(51, 22, 48, 30, "c1")
    desk(im, 36, 32, 46)
    c.pip(im, 40, 34, "teal")
    c.lamp(im, 52, 10.5, 1.2, "teal", steady=False)


def veil(im, c):
    hood(im, 44, 8, 18, 22)
    # lamp-dark shutter drum and its crank
    for y in range(11, 27, 3):
        box(im, 47, y, 12, 2, IRON[2:], bevel=0, flat=0.55)
        im.hline(47, 58, y + 2, "k0h")
    cyl_v(im, 40, 12, 26, 2, TRIM)
    box(im, 38, 11, 5, 3, TRIM, bevel=1)
    desk(im, 36, 32, 46)
    c.lamp(im, 41, 34.5, 1.3, "violet")


def reactor(im, c):
    # the lamp core: a tall glass cylinder in a brass cage, a thin warm filament
    box(im, 40, 2, 20, 5, TRIM, bevel=1, flat=0.45)
    box(im, 40, 48, 20, 10, TRIM, bevel=2, flat=0.4)
    for i, cc in enumerate(["k0", "k0h", "k1", "k1h", "k1", "k1", "k0h", "k0h", "k0", "k0"]):
        im.vline(45 + i, 7, 47, cc)
    im.vline(46, 9, 45, "k2")          # glass highlight
    if c.on:
        im.vline(49, 9, 45, "c1")
        im.vline(49, 16, 38, "a0")
        im.vline(50, 20, 34, "c1h" if hasattr(c, "x") else "c1")
        put(im, 49, 27, "a2" if c.blink else "a1h")
    for x in (42, 57):                  # cage bars
        cyl_v(im, x, 7, 47, 2, TRIM)
    for y in (18, 36):
        im.hline(42, 58, y, TRIM[3])
    c.pip(im, 45, 52, "amber")


DEVICES = {"helm": helm, "shields": shields, "weapons": weapons, "engines": engines, "sensors": sensors,
           "doors": doors, "medbay": medbay, "air": air, "drones": drones, "veil": veil, "reactor": reactor}
SYSTEMS = list(DEVICES)


def _patch_ceiling(im, system):
    """Things hung from the ceiling reach up to row 0 after the shift."""
    if system == "weapons":
        cyl_v(im, 48 + SHIFT, 0, SHIFT, 4, STEEL[:7])
    elif system == "air":
        cyl_v(im, 52 + SHIFT, 0, SHIFT, 6, STEEL[:7])
    elif system == "reactor":
        for x in (43 + SHIFT, 55 + SHIFT):
            cyl_v(im, x, 0, SHIFT + 2, 2, TRIM)


def console(system, state) -> Img:
    im = Img(T, T)
    DEVICES[system](im, Ctx(state))
    im = im.shift(SHIFT, SHIFT)
    _patch_ceiling(im, system)
    return im


def add(atlas):
    atlas.group("consoles")
    for sysid in SYSTEMS:
        on = [console(sysid, "on0"), console(sysid, "on1")]
        off = console(sysid, "off")
        for d, fl in (("right", False), ("left", True)):
            fr = [im.flip_h() if fl else im for im in on]
            names = [atlas.add(f"console-{sysid}-{d}-{i}", im, 0, 0) for i, im in enumerate(fr)]
            atlas.anim(f"console-{sysid}-{d}", names, 2, True)
            atlas.add(f"console-{sysid}-{d}-off", off.flip_h() if fl else off, 0, 0)
