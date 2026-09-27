"""HD back-wall tiles (64x64 atlas px) for the rooms atlas.

TILE 72 (contract v4). Rows 0..4 ceiling beam (underside of the deck above), 5..63 back wall, 64..71 floor plate
(row 64 = lit top edge = floor line). Every pattern repeats every 36 (or 18/12/9/6) px so tiles join seamlessly. Everything is dark and low-contrast (rule 8);
each tile has at most one small lit accent.
"""
from __future__ import annotations

import math

import numpy as np

import hd
from px import Img, idx
from rooms_kit import (AMBER_GLOW, BRASS, BRASS_D, RIVET, COPPER_D, FLOOR, FLOOR_ROWS, GLASS, IRON, IVORY_D, STEEL, T, TEAL_GLOW,
                       VERD_D, WALL, WALL_LO, WOOD, box, bolt, cyl_h, cyl_v, darken, gauge, glow_dot, lamp,
                       lighten, poly, put, rect_mask, rivet, shade_mask, shadow_below, shadow_right, stencil, wear,
                       disc_mask, ring_mask, torus_shade, sphere_shade, screen, knob)

SYSTEMS = ["shields", "engines", "weapons", "air", "medbay", "helm", "sensors", "doors", "drones", "veil",
           "reactor"]
KINDS = ["corridor", "hold", "quarters", "socket"] + SYSTEMS
LABEL = {"shields": "WARD", "engines": "DRIVE", "weapons": "ARMS", "air": "AIR", "medbay": "BENCH",
         "helm": "HELM", "sensors": "LISTEN", "doors": "DOORS", "drones": "DRONES", "veil": "VEIL",
         "reactor": "LAMP", "corridor": "DECK", "hold": "HOLD", "quarters": "BUNKS", "socket": "SOCKET"}
TRAY = {"corridor", "sensors"}


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# structure shared by every tile
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
def ceiling(im: Img):
    """Rows 0..4: the deck above seen from below: plate underside + a riveted beam flange."""
    im.hline(0, T - 1, 0, "k0")
    im.hline(0, T - 1, 1, "k0h")
    im.rect(0, 2, T, 2, "k1")
    im.hline(0, T - 1, 3, "k1h")      # the flange's front edge catches a little light
    im.hline(0, T - 1, 4, "k0h")
    for x in range(6, T, 18):
        put(im, x, 2, "k2")
        put(im, x + 1, 2, "k1h")


def floor_plate(im: Img, y=FLOOR, grate=False):
    """Rows y..y+7: the deck plate edge: lit top lip, brass-dark face with bolt heads, dark underside."""
    for j, c in enumerate(FLOOR_ROWS):
        im.hline(0, im.w - 1, y + j, c)
    for x in range(8, im.w, 18):
        bolt(im, x, y + 2, ["k1", "c0", "b0", "b0h", "b1", "b1h", "b2"])
    if grate:
        for x in range(1, im.w, 6):
            for dx in range(3):
                put(im, x + dx, y + 1, "b0")
            put(im, x + 3, y + 1, "b0h")


def panels(im: Img, y0, y1, ramp=WALL, seam_rows=(), width=36, seed=0, rivets=True, grad=0.10):
    """Bevelled riveted plates from row y0 to y1 (incl.), `width` px wide, optional horizontal seams."""
    rows = [y0] + [r for r in seam_rows] + [y1 + 1]
    k = 0
    for x0 in range(0, T, width):
        for a, b in zip(rows[:-1], rows[1:]):
            m = rect_mask(im, x0 + 1, a + 1, width - 1, b - a - 1)
            shade_mask(im, m, ramp, bevel=2, flat=0.42, contrast=0.9, grad=grad)
            wear(im, m & ~rect_mask(im, x0 + 3, a + 3, width - 5, b - a - 5), seed + k, n=3)
            k += 1
            if rivets:
                for rx in (x0 + 5, x0 + width - 8):
                    rivet(im, rx, a + 3, RIVET)
        im.vline(x0, y0, y1, ramp[0])
    for r in rows[:-1]:
        im.hline(0, T - 1, r, ramp[0])


def rail(im: Img, y):
    """Chair rail: a tarnished brass rod on brackets; occlusion below."""
    cyl_h(im, 0, T - 1, y, 4, BRASS_D)
    for x in (16, 52):
        box(im, x, y - 1, 4, 6, BRASS_D[:6], bevel=1)
    shadow_below(im, 0, T - 1, y + 4, 2)


def wall_base(style="panel", tray=False, seed=0) -> Img:
    im = Img(T, T, "k2")
    ceiling(im)
    top = 5
    if style == "hold":
        return wall_hold(seed)
    if tray:
        cable_tray(im, 6)
        top = 14
    panels(im, top, 45, WALL, seam_rows=(26 if not tray else 30,), seed=seed)
    shadow_below(im, 0, T - 1, top, 2)
    low = WOOD if style == "quarters" else WALL_LO
    for x0 in range(0, T, 18):
        m = rect_mask(im, x0 + 1, 50, 17, 11)
        shade_mask(im, m, low, bevel=1, flat=0.45, contrast=0.8, grad=0.12)
        im.vline(x0, 50, 60, low[0])
    rail(im, 46)
    # kick plate + contact shadow above the floor line
    im.rect(0, 61, T, 2, "k1h")
    im.hline(0, T - 1, 61, "k2")
    for x in range(4, T, 18):
        bolt(im, x, 61, ["k0h", "k1", "k1h", "k2", "k2h", "k3"])
    im.hline(0, T - 1, 63, "k0")
    floor_plate(im)
    return im


def wall_hold(seed=0) -> Img:
    """Cargo hold: dark shell plating between heavy ribs and stringers (no enamel)."""
    im = Img(T, T, "k1")
    ceiling(im)
    panels(im, 5, 62, WALL_LO, seam_rows=(34,), width=36, seed=seed, rivets=False, grad=0.15)
    for sy in (22, 45):  # stringers
        box(im, 0, sy, T, 4, IRON[:6], bevel=1)
        shadow_below(im, 0, T - 1, sy + 4, 2)
    for rx in (0, 36):   # ribs (frames), drawn over the stringers
        box(im, rx, 5, 7, 58, IRON[:7], bevel=2, grad=0.12)
        shadow_right(im, rx + 7, 5, 62, 2)
        for ry in range(10, 62, 9):
            rivet(im, rx + 2, ry, IRON[2:8])
    shadow_below(im, 0, T - 1, 5, 2)
    im.hline(0, T - 1, 63, "k0")
    floor_plate(im, grate=True)
    return im


def cable_tray(im: Img, y):
    """A braided carrier-cable spare run in a tray under the beam: dark verdigris, twist grooves, clamps."""
    im.rect(0, y, T, 7, "k1")
    im.hline(0, T - 1, y + 6, "k0h")
    for x in range(T):
        for j in range(5):
            s = (j + 0.5) / 5 * 2 - 1
            v = hd.lambert(np.array([0.0]), np.array([s]), np.array([math.sqrt(1 - s * s)]))[0]
            # twist: a diagonal groove every 5 px
            ph = (x + j) % 6
            if ph == 0:
                v -= 0.35
            elif ph == 1:
                v += 0.08
            v = max(0.0, min(0.999, v))
            put(im, x, y + 1 + j, VERD_D[int(v * len(VERD_D))])
        if x % 36 == 13:
            put(im, x, y + 2, "c0h")
    for cx in (9, 45):
        box(im, cx, y, 3, 7, BRASS_D[:6], bevel=1)
    shadow_below(im, 0, T - 1, y + 7, 2)


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# decor (all dark; `accent` pixels are the only lit things)
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
def handrail(im: Img, y=30):
    cyl_h(im, 0, T - 1, y, 3, BRASS_D)
    for x in (14, 50):
        box(im, x, y + 3, 3, 5, IRON[:6], bevel=1)
    shadow_below(im, 0, T - 1, y + 3, 2)


def note(im: Img, x, y, w=10, h=12, pin="e1", seed=0):
    m = rect_mask(im, x, y, w, h)
    shade_mask(im, m, IVORY_D, bevel=1, flat=0.62, contrast=0.6, grad=0.15)
    r = np.random.default_rng(seed)
    for k, yy in enumerate(range(y + 3, y + h - 2, 2)):
        ln = int(w - 3 - r.integers(0, 4))
        im.hline(x + 2, x + 1 + ln, yy, "k4")
    # curled corner + shadow
    put(im, x + w - 1, y + h - 1, "k2")
    shadow_right(im, x + w, y + 1, y + h, 1)
    shadow_below(im, x + 1, x + w, y + h, 1)
    put(im, x + w // 2, y, pin)
    put(im, x + w // 2, y + 1, "k1")


def chart(im: Img, x, y, w=24, h=15):
    m = rect_mask(im, x, y, w, h)
    shade_mask(im, m, IVORY_D, bevel=1, flat=0.6, contrast=0.6, grad=0.12)
    pts = [(x + 2, y + h - 4), (x + 8, y + h - 6), (x + 13, y + 6), (x + w - 3, y + 3)]
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        im.line(x0, y0, x1, y1, "c1")
    for px_, py_ in pts:
        put(im, px_, py_, "k1")
    for gx in range(x + 4, x + w - 1, 6):
        im.vline(gx, y + 1, y + h - 2, "i0~b1")
    shadow_right(im, x + w, y + 1, y + h, 1)
    shadow_below(im, x + 1, x + w, y + h, 1)
    put(im, x + 1, y, "e1")
    put(im, x + w - 2, y, "e1")


def speaker(im: Img, cx, cy, r=8):
    w, h = im.w, im.h
    outer = disc_mask(w, h, cx, cy, r)
    inner = disc_mask(w, h, cx, cy, r - 2)
    torus_shade(im, outer & ~inner, cx, cy, r - 1, BRASS_D)
    im.a[inner] = idx("k1")
    for y in range(int(cy - r + 3), int(cy + r - 2), 2):
        for x in range(int(cx - r + 3), int(cx + r - 2), 2):
            if inner[y, x]:
                put(im, x, y, "k0h")
                put(im, x + 1, y + 1, "k2") if inner[min(h - 1, y + 1), min(w - 1, x + 1)] else None


def vent(im: Img, x, y, w, h):
    box(im, x, y, w, h, IRON[:7], bevel=2)
    for yy in range(y + 3, y + h - 3, 3):
        im.hline(x + 3, x + w - 4, yy, "k0h")
        im.hline(x + 3, x + w - 4, yy + 1, "k2h")


def coil(im: Img, y=6, h=7):
    """Ward-wire coil wound around a conduit (copper, dark)."""
    im.rect(0, y, T, h, "k1")
    for x in range(T):
        for j in range(h):
            s = (j + 0.5) / h * 2 - 1
            v = hd.lambert(np.array([0.0]), np.array([s]), np.array([math.sqrt(1 - s * s)]))[0]
            if (x + j // 2) % 3 == 0:
                v -= 0.3
            put(im, x, y + j, COPPER_D[max(0, min(len(COPPER_D) - 1, int(v * len(COPPER_D))))])
    for cx in (20, 56):
        box(im, cx, y - 1, 4, h + 2, IRON[:6], bevel=1)
    shadow_below(im, 0, T - 1, y + h, 2)


def drive_pipe(im: Img, y=6, d=9):
    cyl_h(im, 0, T - 1, y, d, BRASS_D, hi=0.85)
    for fx in (30, 66):
        box(im, fx, y - 1, 3, d + 2, BRASS_D[:7], bevel=1)
        for by in (y, y + d - 1):
            put(im, fx + 1, by, "b1h")
    shadow_below(im, 0, T - 1, y + d, 3)


def conduit(im: Img, y):
    cyl_h(im, 0, T - 1, y, 4, VERD_D)
    cyl_h(im, 0, T - 1, y + 4, 3, COPPER_D)
    for x in (18, 54):
        box(im, x, y - 1, 3, 9, BRASS_D[:6], bevel=1)
    shadow_below(im, 0, T - 1, y + 7, 2)


def louvres(im: Img, x, y, w, h):
    box(im, x, y, w, h, IRON[:7], bevel=2)
    for yy in range(y + 3, y + h - 3, 4):
        im.hline(x + 3, x + w - 4, yy, "k2h")
        im.hline(x + 3, x + w - 4, yy + 1, "k1")
        im.hline(x + 3, x + w - 4, yy + 2, "k0h")


def med_tiles(im: Img):
    """Glazed tiles on the lower wall (medbay), dark and cool."""
    ramp = ["k1", "k1h", "k2", "k2h", "k3", "k3h"]
    for ty in (50, 55):
        for tx in range(0, T, 8):
            m = rect_mask(im, tx + 1, ty + 1, 7, 4)
            shade_mask(im, m, ramp, bevel=1, flat=0.5, contrast=0.8)
        im.hline(0, T - 1, ty, "k0h")
    for tx in range(0, T, 8):
        im.vline(tx, 50, 60, "k0h")


def cabinet(im: Img, x, y, w=18, h=18, cross=True):
    box(im, x, y, w, h, IVORY_D, bevel=2, flat=0.45, grad=0.15)
    im.rect(x + 3, y + 3, w - 6, h - 6, "k2")
    box(im, x + 3, y + 3, w - 6, h - 6, IVORY_D[:5], bevel=1, flat=0.35)
    if cross:
        cx, cy = x + w // 2, y + h // 2
        im.rect(cx - 1, cy - 4, 3, 9, "g0h")
        im.rect(cx - 4, cy - 1, 9, 3, "g0h")
        im.vline(cx - 1, cy - 4, cy + 4, "g1")
        im.hline(cx - 4, cx + 4, cy - 1, "g1")
    put(im, x + w - 3, y + h // 2, "b1")
    shadow_right(im, x + w, y + 1, y + h, 2)
    shadow_below(im, x + 1, x + w, y + h, 2)


def ammo_rack(im: Img, x=6, y=43, n=8):
    box(im, x - 2, y - 2, n * 6 + 3, 14, IRON[:6], bevel=1)
    im.rect(x, y, n * 6 - 1, 10, "k0h")
    for i in range(n):
        sx = x + i * 6
        cyl_v(im, sx, y + 2, y + 9, 4, BRASS_D)
        for dx in range(4):
            put(im, sx + dx, y + 1, ["k2", "k3", "k3", "k2"][dx])  # dark tips
    shadow_below(im, x - 2, x + n * 6, y + 12, 2)


def clock(im: Img, cx, cy):
    gauge(im, cx, cy, 8.5, angle=150, face=IVORY_D, bezel=BRASS_D)
    put(im, int(cx), int(cy) - 4, "k1")
    put(im, int(cx), int(cy) - 3, "k1")


def speaking_tube(im: Img, x=50):
    cyl_v(im, x, 5, 30, 4, BRASS_D)
    poly(im, [(x - 3, 31), (x + 7, 31), (x + 5, 36), (x - 1, 36)], BRASS_D, bevel=1)
    im.hline(x - 1, x + 5, 36, "k0h")
    im.rect(x, 33, 4, 2, "k0h")
    shadow_right(im, x + 4, 5, 30, 2)


def phones(im: Img, x, y):
    """Two headsets hanging on hooks (listening post)."""
    for i in range(2):
        hx = x + i * 11
        box(im, hx + 3, y, 2, 3, IRON[:6], bevel=1)
        im.line(hx, y + 5, hx + 3, y + 2, "k2h")
        im.line(hx + 8, y + 5, hx + 5, y + 2, "k2h")
        for cx in (hx, hx + 8):
            m = rect_mask(im, cx - 1, y + 5, 3, 5)
            shade_mask(im, m, COPPER_D, bevel=1, flat=0.4)
        im.line(hx + 1, y + 10, hx + 4, y + 16, "k1h")


def switchboard(im: Img, x, y, cols=6, cords=((0, 3, "c1"), (1, 5, "e0h"))):
    w, h = cols * 4 + 5, 14
    box(im, x, y, w, h, BRASS_D, bevel=2, flat=0.25)
    jacks = []
    for r in range(2):
        for c in range(cols):
            jx, jy = x + 3 + c * 4, y + 3 + r * 5
            put(im, jx, jy, "k0")
            put(im, jx + 1, jy, "k0h")
            put(im, jx, jy + 1, "b1")
            jacks.append((jx, jy))
    for k, (a, b, col) in enumerate(cords):
        (ax, ay), (bx, by) = jacks[cols + a], jacks[cols + b]
        low = y + h + 3 + k * 2
        put(im, ax, ay, "b2")
        put(im, bx, by, "b2")
        # sagging cord: vertical drops + a catenary-ish bottom
        pts = []
        for t in np.linspace(0, 1, 30):
            xx = ax + (bx - ax) * t
            yy = ay + 1 + (low - ay - 1) * (1 - (2 * t - 1) ** 2) ** 0.6
            pts.append((int(round(xx)), int(round(yy))))
        for px_, py_ in pts:
            put(im, px_, py_, col)
    shadow_right(im, x + w, y + 1, y + h, 2)
    shadow_below(im, x + 1, x + w, y + h, 2)


def relay_pair(im: Img, x, y, lit="t"):
    box(im, x, y, 14, 8, BRASS_D, bevel=1, flat=0.35)
    lamp(im, x + 4, y + 4, 1.6, TEAL_GLOW if lit == "t" else AMBER_GLOW, BRASS_D, lit=bool(lit))
    lamp(im, x + 10, y + 4, 1.6, AMBER_GLOW, BRASS_D, lit=False)
    shadow_below(im, x + 1, x + 14, y + 8, 1)


def control_box(im: Img, x, y, w=22, h=16):
    box(im, x, y, w, h, IRON[:7], bevel=2)
    for i in range(4):
        cyl_v(im, x + 4 + i * 4, y + 7, y + 11, 2, STEEL[:6])
        put(im, x + 4 + i * 4, y + 6, "k4")
    for i in range(3):
        lamp(im, x + 5 + i * 5, y + 3.5, 1.1, AMBER_GLOW, IRON, lit=False)
    shadow_right(im, x + w, y + 1, y + h, 2)
    shadow_below(im, x + 1, x + w, y + h, 2)


def lever(im: Img, x, y):
    box(im, x, y + 6, 10, 14, IRON[:7], bevel=2)
    im.line(x + 5, y + 7, x + 3, y, "k3")
    im.line(x + 6, y + 7, x + 4, y, "k2")
    box(im, x + 2, y - 2, 4, 3, COPPER_D, bevel=1)


def shelf(im: Img, x, y, w, items=True):
    box(im, x, y, w, 3, WOOD, bevel=1)
    for bx in (x + 2, x + w - 4):
        poly(im, [(bx, y + 3), (bx + 2, y + 3), (bx + 2, y + 7)], IRON[:5], bevel=0)
    shadow_below(im, x, x + w, y + 3, 2)
    if items:
        # an enamel mug, a lens in a ring, a tin
        box(im, x + 3, y - 6, 5, 6, IVORY_D, bevel=1, flat=0.55)
        put(im, x + 8, y - 4, "k4")
        put(im, x + 8, y - 3, "k4")
        m = disc_mask(im.w, im.h, x + 13, y - 3, 2.6)
        torus_shade(im, m, x + 13, y - 3, 2.0, BRASS_D)
        put(im, x + 13, y - 3, "t0")
        box(im, x + 18, y - 8, 6, 8, COPPER_D, bevel=1)


def photo(im: Img, x, y):
    box(im, x, y, 14, 16, BRASS_D, bevel=1, flat=0.4)
    im.rect(x + 2, y + 2, 10, 12, "i0~b1")
    shade_mask(im, rect_mask(im, x + 2, y + 2, 10, 12), ["k2", "k3", "k4", "i0~b1", "i0"], bevel=0, flat=0.55,
               grad=0.35)
    # two figures, a horizon
    im.hline(x + 2, x + 11, y + 10, "k3")
    im.rect(x + 4, y + 6, 2, 5, "k2")
    im.rect(x + 8, y + 5, 2, 6, "k2")
    put(im, x + 4, y + 5, "k2h")
    put(im, x + 8, y + 4, "k2h")
    shadow_right(im, x + 14, y + 1, y + 16, 1)
    shadow_below(im, x + 1, x + 14, y + 16, 1)


def net(im: Img, x0, x1, y0, y1):
    for y in range(y0 + 3, y1 + 1, 7):
        for x in range(x0, x1 + 1):
            put(im, x, y, "c0h")
            if (x - x0) % 7 == 0:
                put(im, x, y, "c1")
    for x in range(x0, x1 + 1, 7):
        for y in range(y0, y1 + 1):
            put(im, x, y, "c0h" if im.key(x, y) != "c1" else "c1")
    for x in (x0, x1):
        bolt(im, x, y0 - 2, IRON[:6])


def straps(im: Img):
    for x in (17, 53):
        cyl_v(im, x, 8, 60, 3, COPPER_D)
        box(im, x - 2, 32, 7, 6, BRASS_D, bevel=1)
        put(im, x + 1, 34, "k0h")
        put(im, x + 1, 35, "k0h")


def fan(im: Img, cx, cy, r=10, accent=False):
    w, h = im.w, im.h
    outer = disc_mask(w, h, cx, cy, r)
    inner = disc_mask(w, h, cx, cy, r - 2.2)
    torus_shade(im, outer & ~inner, cx, cy, r - 1.1, IRON)
    im.a[inner] = idx("k0h")
    for ang in (20, 110, 200, 290):
        pts = []
        for t in np.linspace(1.2, r - 2.5, 10):
            a = math.radians(ang + t * 7)
            pts.append((cx + math.cos(a) * t, cy + math.sin(a) * t))
        for (x0, y0) in pts:
            put(im, math.floor(x0), math.floor(y0), "k2h")
            put(im, math.floor(x0) + 1, math.floor(y0), "k2")
    hub = disc_mask(w, h, cx, cy, 2.2)
    sphere_shade(im, hub, cx, cy, 2.5, IRON[2:])
    if accent:
        put(im, math.floor(cx), math.floor(cy), "t1")


def lamp_tube(im: Img, x, y0, y1, lit=True):
    """A glass lamp-line tube (reactor): dark glass with a thin warm core."""
    box(im, x - 2, y0 - 3, 11, 3, BRASS_D, bevel=1)
    box(im, x - 2, y1 + 1, 11, 3, BRASS_D, bevel=1)
    for i, c in enumerate(["k0", "k1", "k1h", "k1", "k1", "k0h", "k0"]):
        im.vline(x + i, y0, y1, c)
    if lit:
        im.vline(x + 3, y0 + 1, y1 - 1, "c1")
        im.vline(x + 3, y0 + 6, y1 - 6, "a0")
    put(im, x + 1, y0 + 2, "k3")
    shadow_right(im, x + 7, y0, y1, 2)


def hazard(im: Img, y=61):
    for x in range(T):
        c = "b0h" if ((x + 0) // 4) % 2 == 0 else "k0h"
        put(im, x, y, c)
        put(im, x, y + 1, c if c == "k0h" else "b0")


def hooks(im: Img, y=52):
    for x in range(6, T, 18):
        cyl_v(im, x, y, y + 5, 2, STEEL[:5])
        put(im, x + 2, y + 5, "k4")
        put(im, x + 3, y + 4, "k3")


def locker_row(im: Img, x, y, n=2):
    for i in range(n):
        m = rect_mask(im, x + i * 13, y, 12, 26)
        shade_mask(im, m, WALL, bevel=2, flat=0.5, grad=0.12)
        for vy in range(y + 3, y + 10, 2):
            im.hline(x + i * 13 + 3, x + i * 13 + 8, vy, "k1")
        put(im, x + i * 13 + 9, y + 14, "b1")
    shadow_right(im, x + n * 13, y + 1, y + 26, 2)


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
ACCENTS = {  # (kind, variant) -> [(x, y, key)] the tile's one lit accent (pixels written last)
}


def wall_tile(kind: str, v: int) -> Img:
    seed = KINDS.index(kind) * 7 + v * 3
    if kind == "hold":
        im = wall_hold(seed)
        if v == 1:
            net(im, 12, 61, 12, 40)
        elif v == 2:
            straps(im)
            stencil(im, "C-7", 26, 52, "k2h")
        return im
    style = "quarters" if kind == "quarters" else "panel"
    im = wall_base(style, tray=kind in TRAY, seed=seed)
    if kind == "socket":
        if v == 1:
            for x in (16, 52):
                bolt(im, x, 55, BRASS_D)
        return im
    if kind == "corridor":
        handrail(im, 34)
        if v == 1:
            note(im, 11, 17, seed=1)
            note(im, 27, 19, 9, 10, pin="t0", seed=2)
        elif v == 2:
            switchboard(im, 9, 16)
            relay_pair(im, 47, 18)
    elif kind == "quarters":
        if v == 1:
            shelf(im, 11, 32, 28)
            note(im, 50, 13, seed=3)
        elif v == 2:
            photo(im, 43, 13)
            note(im, 13, 16, seed=4)
    elif kind == "shields":
        coil(im, 6)
        if v == 1:
            relay_pair(im, 29, 22)
        elif v == 2:
            gauge(im, 53, 29, 6.5, angle=30)
    elif kind == "engines":
        drive_pipe(im, 6)
        if v == 1:
            gauge(im, 18, 31, 6.5, angle=-50)
            gauge(im, 52, 31, 6.5, angle=20)
        elif v == 2:
            valve(im, 54, 29)
            stencil(im, "DRIVE", 6, 52, "k2h")
        floor_plate(im, grate=True)
    elif kind == "weapons":
        ammo_rack(im, 12, 50)
        if v == 1:
            relay_pair(im, 45, 20, lit="a")
            control_box(im, 11, 16)
        elif v == 2:
            cyl_v(im, 56, 5, 44, 4, STEEL[:7])
            stencil(im, "ARMS", 11, 22, "k2h")
    elif kind == "air":
        vent(im, 0, 6, T, 11)
        if v == 1:
            fan(im, 36, 31, 11, accent=True)
        elif v == 2:
            cyl_v(im, 54, 17, 44, 4, STEEL[:7])
            stencil(im, "AIR", 11, 27, "k2h")
    elif kind == "medbay":
        med_tiles(im)
        if v == 1:
            cabinet(im, 26, 16, 20, 20)
        elif v == 2:
            cabinet(im, 43, 16, 20, 22, cross=False)
            note(im, 13, 18, seed=5)
    elif kind == "helm":
        if v == 0:
            chart(im, 11, 15, 26, 16)
            note(im, 48, 17, pin="a0", seed=6)
        elif v == 1:
            clock(im, 50, 25)
            note(im, 16, 17, seed=7)
        elif v == 2:
            speaking_tube(im, 57)
            chart(im, 11, 17, 26, 16)
    elif kind == "sensors":
        conduit(im, 16)
        if v == 1:
            speaker(im, 25.5, 35.5, 9)
        elif v == 2:
            switchboard(im, 7, 27, 5, ((0, 4, "c1"), (1, 2, "e0h")))
            phones(im, 41, 27)
    elif kind == "doors":
        cyl_h(im, 0, T - 1, 6, 5, STEEL[:7])
        shadow_below(im, 0, T - 1, 11, 2)
        if v == 0:
            control_box(im, 18, 20, 24, 17)
        elif v == 1:
            lever(im, 48, 20)
            relay_pair(im, 13, 22)
        elif v == 2:
            gauge(im, 27, 29, 6.5, angle=-20)
            stencil(im, "DOORS", 6, 52, "k2h")
    elif kind == "drones":
        hooks(im, 52)
        if v == 1:
            shelf(im, 18, 34, 34, items=False)
            for i in range(3):
                m = disc_mask(im.w, im.h, 25 + i * 10, 30, 3.2)
                torus_shade(im, m, 25 + i * 10, 30, 2.4, IVORY_D)
                put(im, 25 + i * 10, 30, "t0")
        elif v == 2:
            cyl_v(im, 45, 5, 38, 2, COPPER_D)
            stencil(im, "DRONES", 6, 22, "k2h")
    elif kind == "veil":
        if v == 0:
            louvres(im, 7, 15, 58, 25)
        elif v == 1:
            louvres(im, 7, 15, 25, 25)
            louvres(im, 40, 15, 25, 25)
        elif v == 2:
            louvres(im, 11, 15, 50, 14)
            stencil(im, "VEIL", 24, 33, "k2h")
    elif kind == "reactor":
        hazard(im)
        if v == 1:
            lamp_tube(im, 14, 13, 41)
            lamp_tube(im, 50, 13, 41, lit=False)
        elif v == 2:
            gauge(im, 36, 27, 8, angle=60)
            stencil(im, "LAMP", 9, 52, "k2h")
    for x, y, c in ACCENTS.get((kind, v), []):
        put(im, x, y, c)
    return im


def valve(im: Img, cx, cy, r=7):
    w, h = im.w, im.h
    outer = disc_mask(w, h, cx, cy, r)
    inner = disc_mask(w, h, cx, cy, r - 2)
    torus_shade(im, outer & ~inner, cx, cy, r - 1, BRASS_D)
    for a in (0, 90, 180, 270):
        rad = math.radians(a + 45)
        for t in np.linspace(0, r - 2, 6):
            put(im, math.floor(cx + math.cos(rad) * t), math.floor(cy + math.sin(rad) * t), "b0h")
    hub = disc_mask(w, h, cx, cy, 1.8)
    sphere_shade(im, hub, cx, cy, 2, BRASS_D[2:])
    cyl_v(im, int(cx) - 1, int(cy + r), int(cy + r + 6), 3, BRASS_D)
