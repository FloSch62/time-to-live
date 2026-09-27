"""Resources, statuses and the handshake meter (contract v3, hi-bit). Main icons 40x40, small `-sm` 28x28.

Each icon is drawn in a 28-unit design box rendered natively at 38 px (main) or 26 px (small), shaded with the
house light into muted HD ramps, and outlined; lit colour only on small accents (rule 8).
"""
from __future__ import annotations

import math

import numpy as np

from icons_hd import R, Shape, contour, dome, fill, lamp, outline, shade
from icons_sys import G, plate
from px import Img, idx

MAIN, SMALL = 40, 28


def frame(img: Img, n: int) -> Img:
    """Centre a drawn (n-2)-box image into an n x n frame with a 1-px outline margin."""
    out = Img(n, n)
    bb = img.bbox()
    sub = img.crop(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1])
    if sub.w > n - 2 or sub.h > n - 2:
        raise ValueError(f"icon art {sub.w}x{sub.h} does not fit {n}")
    out.blit(sub, (n - sub.w) // 2, (n - sub.h) // 2)
    outline(out, None, "k0")
    return out


def both(fn):
    """Render fn(g) at main (38 px box) and small (26 px box) sizes."""
    return frame(fn(G(MAIN - 2)), MAIN), frame(fn(G(SMALL - 2)), SMALL)


def cut_in(img: Img, mask, key="k1"):
    img.a[mask & (img.a >= 0)] = idx(key)


# ══ RESOURCES ═════════════════════════════════════════════════════════════════════════════════════════════
def res_salvage(g: G) -> Img:
    """A bent brass gear with one tooth broken off, copper wire threaded through the hub."""
    img = Img(g.n, g.n)
    X, Y = g.S.X / g.k, g.S.Y / g.k
    cx, cy = 12.5, 12.5
    r = np.hypot(X - cx, (Y - cy) * 1.06)
    ang = (np.degrees(np.arctan2(Y - cy, X - cx)) + 360) % 360
    tooth = (ang % 40) < 19
    broken = (ang > 120) & (ang < 160)
    gear = ((r <= 8.6) | ((r <= 11.6) & tooth & ~broken)) & (r > 3.2)
    shade(img, gear, R["brass"], "bevel", width=max(1, int(g.k * 1.5)), ambient=0.22)
    groove = (np.abs(r - 6.2) < 0.45 / g.k + 0.2) & gear
    img.a[groove] = idx("b0")
    # copper wire through the hub, trailing off in a loose coil to the bottom-right
    wire = g.polyline([(10.5, 11), (13, 13), (17.5, 17.5), (21.5, 19.5), (24.5, 22.5), (24, 26), (21, 27)], 2.0)
    wire &= ~(gear & (Y < 12.6) & (X < 12.4))
    shade(img, wire, R["copper"], "bevel", width=1, ambient=0.3)
    img.a[g.circle(21, 27, 1.2) & wire] = idx("c3")
    return img


def res_ttl(g: G) -> Img:
    """The Operator's hop-count tag: tarnished brass on a cord, engraved tally, a small amber lamp-pip."""
    img = Img(g.n, g.n)
    tag = g.poly([(3, 12), (8, 7), (26, 7), (26, 25), (3, 25)])
    shade(img, tag, R["brass"], "bevel", width=max(1, int(g.k * 1.5)), ambient=0.22)
    hole = g.circle(7.2, 11.4, 1.6)
    cut_in(img, hole, "k0")
    cord = g.polyline([(7.2, 11.4), (5, 6), (6.5, 2), (9.5, 1), (11, 3.5), (8.2, 9.5)], 1.2)
    cord &= ~tag | hole
    shade(img, cord & ~hole, R["steel-dark"], "bevel", width=1, ambient=0.4)
    # tally: four strokes and a cross stroke, engraved
    marks = g.empty()
    for x in (8.5, 11.5, 14.5, 17.5):
        marks |= g.line((x, 13.5), (x, 21.5), 1.1)
    marks |= g.line((6.8, 20.5), (19.5, 14.2), 1.1)
    marks &= tag
    img.a[marks] = idx("b0")
    lip = np.zeros_like(marks)
    lip[:, 1:] |= marks[:, :-1]
    img.a[lip & ~marks & tag] = idx("b2h")
    # lamp-pip riveted into the corner
    lamp(img, 23 * g.k, 10.8 * g.k, max(1.2, 1.7 * g.k), R["amber"])
    img.a[g.rect(3.5, 23.4, 22, 0.9) & tag] = idx("b0h")
    return img


def res_payloads(g: G) -> Img:
    """A spliced charge: dark teal glass nose, tarnished brass case with a copper band, stepped base."""
    img = Img(g.n, g.n)
    cx = 14
    nose = g.poly([(cx, 1.5), (cx + 3, 4), (cx + 5, 8.5), (cx - 5, 8.5), (cx - 3, 4)]) | g.ellipse(cx, 6.5, 5, 3.2)
    nose &= g.rect(0, 0, 28, 8.6)
    case = g.rect(cx - 5, 8.5, 10, 14)
    band = g.rect(cx - 5.4, 18.2, 10.8, 2.2)
    base = g.rect(cx - 6, 22.5, 12, 3.5) | g.rect(cx - 5, 26, 10, 1.5)
    ax = ((cx, 0), (cx, 28), 5.0)
    shade(img, case, R["brass"], "cyl", cyl=((cx, 0), (cx, 28), 5.2), ambient=0.2)
    shade(img, base, R["brass"], "cyl", cyl=((cx, 0), (cx, 28), 6.2), ambient=0.2)
    shade(img, band, R["copper"], "cyl", cyl=((cx, 0), (cx, 28), 5.6), ambient=0.25)
    shade(img, nose, ["k1", "t0", "t0h", "t1", "t1h"], "sphere", sphere=(cx, 7, 5, 6), ambient=0.1)
    img.put(int((cx - 2) * g.k), int(4.5 * g.k), "t2")
    img.a[g.rect(cx - 5, 12, 10, 0.8) & case] = idx("b0")
    img.a[g.rect(cx - 6, 22.5, 12, 0.8)] = idx("b0")
    return img


def res_spares(g: G) -> Img:
    """An automaton lens in a worn ivory ring: dark glass, a dim teal glint, four screws, one chip."""
    img = Img(g.n, g.n)
    ring = g.ring(14, 14, 13, 8.6)
    shade(img, ring, R["ivory"][1:], "bevel", width=max(1, int(g.k * 2)), ambient=0.22)
    seat = g.ring(14, 14, 8.6, 7.4)
    fill(img, seat, "k0")
    lens = g.circle(14, 14, 7.4)
    shade(img, lens, ["k0", "k1", "k1h", "k2", "t0", "t0h"], "sphere", sphere=(14 * g.k, 14 * g.k, 7.4 * g.k, 7.4 * g.k),
          ambient=0.05)
    for (x, y) in ((10.8, 10.2), (11.8, 10.2)):
        img.put(int(x * g.k), int(y * g.k), "t2")
    img.put(int(11.2 * g.k), int(11.2 * g.k), "t1")
    for a in (45, 135, 225, 315):
        x, y = 14 + 10.8 * math.cos(math.radians(a)), 14 - 10.8 * math.sin(math.radians(a))
        img.a[g.circle(x, y, 0.9)] = idx("i0")
        img.put(int(x * g.k), int(y * g.k), "k4")
    chip = g.poly([(21, 22.5), (24.5, 19.5), (23.5, 23.5)]) & ring
    img.a[chip] = idx("s0")
    return img


def res_hull(g: G) -> Img:
    """A riveted hull plate: ivory paint over steel, worn through along the lower edge, a weld seam."""
    img = Img(g.n, g.n)
    plate_m = g.chamfer(1, 4, 26, 20, 2.5)
    shade(img, plate_m, R["steel"], "bevel", width=max(1, int(g.k * 1.5)), ambient=0.22)
    X, Y = g.S.X / g.k, g.S.Y / g.k
    edge = 15.2 + 0.9 * np.sin(X * 0.55 + 0.4) + 0.5 * np.sin(X * 1.7)
    chips = g.ellipse(7.5, 10.5, 1.4, 0.8) | g.ellipse(19.5, 8.8, 1.1, 0.7) | g.ellipse(22.5, 13, 1.6, 0.8)
    paint = plate_m & (Y < edge) & g.chamfer(2.2, 5.2, 23.6, 17.6, 1.8) & ~chips
    shade(img, paint, R["ivory"][2:], "bevel", width=1, ambient=0.3)
    seam = g.rect(1, 18.5, 26, 0.9) & plate_m
    img.a[seam] = idx("k3")
    for x in (4, 9, 14, 19, 24):
        for y in (7, 21.5):
            dome(img, x * g.k, y * g.k, max(0.9, 1.1 * g.k), ["k3", "s0", "s1", "s2"])
    return img


def resources():
    out = {}
    for name, fn in (("salvage", res_salvage), ("ttl", res_ttl), ("payloads", res_payloads),
                     ("spares", res_spares), ("hull", res_hull)):
        out[f"res-{name}"], out[f"res-{name}-sm"] = both(fn)
    return out


# ══ STATUSES ══════════════════════════════════════════════════════════════════════════════════════════════
def st_fire(g: G) -> Img:
    """A small flame cluster: dark ember tongues, a short amber heart at the base, a smudge of smoke above."""
    img = Img(g.n, g.n)
    X, Y = g.S.X / g.k, g.S.Y / g.k
    tongues = [(13.5, 6.5, 5.8, 26.5, 1.0), (8, 11.5, 4.2, 26.5, -1.0), (19.5, 10.5, 4.0, 26.5, 1.4),
               (4.2, 17.5, 2.6, 26.5, -0.6), (24, 16.5, 2.4, 26.5, 0.8)]
    flame = g.empty()
    heat = np.zeros((g.n, g.n))
    for (cx, top, hw, base, lean0) in tongues:
        t = np.clip((Y - top) / (base - top), 0, 1)
        lean = (1 - t) ** 2 * lean0 * 2.2
        half = hw * np.sin(np.pi * (0.08 + 0.92 * t ** 0.75) / 1.25) * (0.35 + 0.65 * t ** 0.35)
        m = (Y >= top) & (Y <= base) & (np.abs(X - cx - lean) <= half)
        flame |= m
        hv = t ** 1.3 * (1 - (np.abs(X - cx - lean) / np.maximum(half, 0.1)) ** 2)
        heat = np.maximum(heat, np.where(m, hv, 0))
    from hd import paint
    paint(img, flame, heat, ["e0", "e0h", "e1", "e1h", "e2", "e2h", "a0", "a1"], 0.0, 1.0)
    smoke = (g.ellipse(12.5, 5.2, 4.6, 2.4) | g.ellipse(16.8, 3.6, 3.4, 1.9)) & ~flame
    shade(img, smoke, ["k2", "k2h", "k3", "k3h", "k4"], "bevel", width=2, ambient=0.3)
    return img


def st_breach(g: G) -> Img:
    """A hull plate torn open: dark void, edges bent inward catching the light."""
    img = Img(g.n, g.n)
    plate_m = g.chamfer(1, 2, 26, 24, 2.5)
    shade(img, plate_m, R["steel"], "bevel", width=max(1, int(g.k * 1.5)), ambient=0.22)
    hole = g.poly([(8, 9), (11.5, 6.5), (14, 8.5), (17.5, 6), (20.5, 9.5), (19, 12.5), (21.5, 16), (18, 20.5),
                   (14.5, 18.5), (11, 21.5), (7.5, 18), (9, 14.5), (6.5, 12)])
    lip = g.poly([(6.8, 8.2), (11.5, 5.4), (14, 7.3), (17.5, 4.8), (21.8, 9.5), (20.3, 12.5), (22.8, 16.2),
                  (18.3, 21.8), (14.5, 19.8), (11, 22.8), (6.2, 18.3), (7.8, 14.5), (5.3, 12)]) & ~hole
    shade(img, lip, R["steel"][2:], "bevel", width=1, ambient=0.4, bias=0.1)
    fill(img, hole, "k0")
    img.a[g.poly([(9.5, 11), (12.5, 9.5), (11.5, 13)]) & hole] = idx("k1")
    for x, y in ((4, 5), (24, 5), (4, 23), (24, 23)):
        dome(img, x * g.k, y * g.k, max(0.9, 1.1 * g.k), ["k3", "s0", "s1", "s2"])
    return img


def st_low_air(g: G) -> Img:
    """An air-pressure gauge, the needle dropped into the ember zone."""
    img = Img(g.n, g.n)
    shade(img, g.ring(14, 14, 13.5, 11), R["brass"], "bevel", width=max(1, int(g.k * 1.5)), ambient=0.22)
    face = g.circle(14, 14, 11)
    fill(img, face, "k2")
    img.a[g.ring(14, 14, 11, 10.2)] = idx("k1")
    for deg in range(-45, 226, 27):
        x0, y0 = 14 + 9.2 * math.cos(math.radians(deg)), 14 - 9.2 * math.sin(math.radians(deg))
        x1, y1 = 14 + 7.4 * math.cos(math.radians(deg)), 14 - 7.4 * math.sin(math.radians(deg))
        img.a[g.line((x0, y0), (x1, y1), 0.9)] = idx("e1" if deg > 180 else "i1")
    img.a[g.arc(14, 14, 8.8, 1.2, 190, 228)] = idx("e0h")
    tip = (14 + 8.4 * math.cos(math.radians(212)), 14 - 8.4 * math.sin(math.radians(212)))
    img.a[g.line((14, 14), tip, 1.2)] = idx("e2")
    img.put(int(tip[0] * g.k), int(tip[1] * g.k), "e3")
    dome(img, 14 * g.k, 14 * g.k, max(1.2, 1.8 * g.k), ["k2", "b0", "b1", "b2", "b3"])
    img.a[g.rect(11.5, 19, 5, 1.6) & face] = idx("i0")
    return img


def st_pause(g: G) -> Img:
    img = Img(g.n, g.n)
    for x in (5.5, 16.5):
        shade(img, g.rrect(x, 2, 6, 24, 1), R["ivory"][1:], "bevel", width=max(1, int(g.k * 1.5)), ambient=0.25)
    return img


def st_evasion(g: G) -> Img:
    """The car swinging clear on its carrier while a bolt passes under it."""
    img = Img(g.n, g.n)
    carrier = g.rect(0, 2.5, 28, 2)
    shade(img, carrier, R["verdigris"], "bevel", width=1, ambient=0.3)
    for x in range(0, 28, 3):
        img.a[g.line((x, 2.5), (x + 1.4, 4.5), 0.8) & carrier] = idx("g0")
    for r in (9.5, 13):
        img.a[g.arc(9, 3.5, r, 0.9, 238, 268)] = idx("k4h")
    shade(img, g.circle(9, 3.5, 2.4), R["brass"], "sphere", sphere=(9 * g.k, 3.5 * g.k, 2.4 * g.k, 2.4 * g.k))
    hanger = g.line((9, 5.5), (16.5, 11.5), 1.4)
    shade(img, hanger, R["steel-dark"], "flat", ambient=0.6)
    ang = math.radians(-22)
    cx, cy, hw, hh = 18, 15.5, 7.5, 3.8

    def rot(x, y):
        return (cx + x * math.cos(ang) - y * math.sin(ang), cy + x * math.sin(ang) + y * math.cos(ang))
    car = g.poly([rot(-hw + 1.5, -hh), rot(hw - 1, -hh), rot(hw, -hh + 1.2), rot(hw, hh), rot(-hw, hh),
                  rot(-hw, -hh + 1.5)])
    shade(img, car, R["ivory"][1:], "bevel", width=1, ambient=0.25)
    band = g.poly([rot(-hw, 1.2), rot(hw, 1.2), rot(hw, hh), rot(-hw, hh)]) & car
    shade(img, band, R["brass"], "bevel", width=1, ambient=0.25)
    for i in range(3):
        wx = -4.5 + i * 3.5
        win = g.poly([rot(wx, -2.2), rot(wx + 2.2, -2.2), rot(wx + 2.2, -0.2), rot(wx, -0.2)]) & car
        img.a[win] = idx("k2")
    bolt = g.line((1, 25), (10, 23), 1.8, 0.8)
    img.a[bolt] = idx("e1")
    img.a[g.line((1, 25), (3.5, 24.4), 1.8)] = idx("e2")
    return img


def st_sensors(g: G) -> Img:
    """A watching eye: worn ivory lids, dark iris, a dim teal glint."""
    img = Img(g.n, g.n)
    X, Y = g.S.X / g.k, g.S.Y / g.k
    half = 8.5 * np.clip(1 - ((X - 14) / 13.5) ** 2, 0, 1) ** 0.75
    eye = np.abs(Y - 14) <= half
    shade(img, eye, R["ivory"][1:], "bevel", width=max(1, int(g.k * 2)), ambient=0.22)
    open_ = np.abs(Y - 14) <= half - 2.2
    fill(img, open_ & eye, "k1")
    iris = g.circle(14, 14, 6.0) & open_
    shade(img, iris, ["k0", "k1", "k1h", "t0", "t0h", "t1"], "sphere",
          sphere=(14 * g.k, 14 * g.k, 6 * g.k, 6 * g.k), ambient=0.05)
    img.a[g.circle(14, 14, 2.2)] = idx("k0")
    img.put(int(11.8 * g.k), int(11.6 * g.k), "t2")
    img.put(int(12.6 * g.k), int(11.6 * g.k), "t1")
    return img


def st_lock(g: G) -> Img:
    img = Img(g.n, g.n)
    shackle = g.arc(14, 11, 6.2, 2.4, 0, 180) | g.rect(6.6, 11, 2.4, 3) | g.rect(19, 11, 2.4, 3)
    shade(img, shackle, R["steel"], "bevel", width=1, ambient=0.3)
    body = g.rrect(3.5, 13, 21, 14, 2)
    shade(img, body, R["brass"], "bevel", width=max(1, int(g.k * 2)), ambient=0.22)
    key = g.circle(14, 18.5, 1.9) | g.poly([(13, 19), (15, 19), (15.8, 23.5), (12.2, 23.5)])
    img.a[key] = idx("k0")
    img.a[g.rect(3.5, 15.3, 21, 0.9) & body] = idx("b0h")
    return img


def st_crew_lost(g: G) -> Img:
    """A doused hand lantern: brass cage, dark glass, a thin grey wisp."""
    img = Img(g.n, g.n)
    ring = g.ring(14, 5.5, 2.6, 1.3)
    shade(img, ring, R["brass"], "bevel", width=1)
    cap = g.poly([(9, 11), (19, 11), (17, 7.8), (11, 7.8)])
    shade(img, cap, R["brass"], "bevel", width=1)
    glass = g.rrect(9.5, 11, 9, 11, 1.5)
    shade(img, glass, ["k0", "k1", "k1h", "k2", "k2h"], "sphere", sphere=(14 * g.k, 16.5 * g.k, 5 * g.k, 6 * g.k))
    bars = (g.rect(9, 11, 1.4, 11) | g.rect(17.6, 11, 1.4, 11) | g.rect(13.3, 11, 1.4, 11)) & glass
    shade(img, bars, R["brass"], "flat", ambient=0.5)
    wick = g.rect(13.4, 17.5, 1.2, 2)
    img.a[wick] = idx("k4")
    base = g.rrect(8, 21.5, 12, 3.2, 1)
    shade(img, base, R["brass"], "bevel", width=1)
    wisp = g.polyline([(14, 17), (15.2, 14.5), (13.8, 12.5)], 0.9) & glass
    img.a[wisp] = idx("s0")
    img.a[g.polyline([(16, 7), (17.5, 4.5), (16.5, 1.5)], 0.9)] = idx("s0")
    return img


def st_boarders(g: G) -> Img:
    """A spark-mite's head: plated copper shell with patina, one amber sensor slit, steel cutter mandibles,
    static crackling on the feelers."""
    img = Img(g.n, g.n)
    shell = g.poly([(6, 18.5), (4.5, 13), (8, 8.5), (14, 7), (20, 8.5), (23.5, 13), (22, 18.5)])
    shade(img, shell, R["copper"], "bevel", width=max(1, int(g.k * 1.5)), ambient=0.2)
    for seam in (g.line((14, 7.2), (14, 18.5), 0.9), g.line((8, 8.8), (10.5, 18.5), 0.9),
                 g.line((20, 8.8), (17.5, 18.5), 0.9)):
        img.a[seam & shell] = idx("c0h")
    pat = g.poly([(8.5, 10), (12.5, 9), (11.5, 12.5), (7, 13)]) & shell
    shade(img, pat, ["g0", "g0h", "g1", "g1h"], "flat", ambient=0.5)
    slit = g.rrect(8, 14, 12, 2.4, 1)
    img.a[slit] = idx("k0")
    img.a[g.rect(9, 14.6, 10, 1.2)] = idx("a0")
    img.a[g.rect(12.5, 14.6, 3, 1.2)] = idx("a1h")
    mand = g.poly([(8, 18.5), (12, 18.5), (13, 23), (10.5, 21.5)]) | g.poly([(20, 18.5), (16, 18.5), (15, 23),
                                                                                 (17.5, 21.5)])
    shade(img, mand, R["steel"], "bevel", width=1, ambient=0.25)
    feelers = g.polyline([(9, 8.5), (6, 4), (2.5, 2.5)], 1.0) | g.polyline([(19, 8.5), (22, 4), (25.5, 2.5)], 1.0)
    img.a[feelers & (img.a < 0)] = idx("s0")
    for x in (2.2, 25.8):
        img.put(int(x * g.k), int(2.2 * g.k), "t2")
        img.put(int(x * g.k) + (1 if x > 14 else -1), int(2.2 * g.k), "t1")
    legs = g.empty()
    for x0, x1 in ((6, 2), (8, 4.5), (22, 26), (20, 23.5)):
        legs |= g.polyline([(x0, 17.5), (x1, 20.5), (x1 + (0.5 if x1 < 14 else -0.5), 26)], 1.0)
    img.a[legs & (img.a < 0)] = idx("k4")
    return img


def st_suffocating(g: G) -> Img:
    img = Img(g.n, g.n)
    for (cx, cy, r) in ((8.5, 19, 6.2), (19, 9.5, 4.6), (20.5, 21, 3.0), (8.5, 6.5, 2.2)):
        ringm = g.ring(cx, cy, r, r - max(0.9, 1.2 / g.k))
        shade(img, ringm, R["steel"][2:], "sphere", sphere=(cx * g.k, cy * g.k, r * g.k, r * g.k), ambient=0.25)
        img.put(int((cx - r * 0.45) * g.k), int((cy - r * 0.5) * g.k), "t2")
    return img


def st_ion(g: G) -> Img:
    """A dark charge knot with violet arcs crawling off it."""
    img = Img(g.n, g.n)
    shade(img, g.circle(14, 14, 7.5), ["k0", "k1", "k1h", "v0", "v0h"], "sphere",
          sphere=(14 * g.k, 14 * g.k, 7.5 * g.k, 7.5 * g.k), ambient=0.05)
    img.put(int(12 * g.k), int(11.5 * g.k), "v2")
    arcs = [[(19, 9), (22, 7.5), (21.5, 4.5), (25, 2.5)], [(8.5, 19.5), (6, 21), (6.5, 24), (3, 26)],
            [(20.5, 17.5), (24, 19.5), (27, 18.5)]]
    for pts in arcs:
        m = g.polyline(pts, 1.0)
        img.a[m & (img.a < 0)] = idx("v1h")
        x, y = pts[1]
        img.put(int(x * g.k), int(y * g.k), "v3")
    return img


def st_repair(g: G) -> Img:
    """A spanner: steel shaft, an open jaw."""
    img = Img(g.n, g.n)
    shaft = g.line((4, 24.5), (18, 10.5), 3.2)
    head = g.circle(20.5, 7.5, 5.8)
    jaw = g.poly([(20.5, 7.5), (28, 0.5), (28, 5.5), (24, 7.5)]) | g.circle(21, 7, 2.5)
    m = (shaft | head) & ~jaw
    shade(img, m, R["steel"], "bevel", width=max(1, int(g.k * 1.5)), ambient=0.22)
    img.a[g.circle(5.2, 23.3, 1.1)] = idx("k2")
    return img


def st_target(g: G) -> Img:
    img = Img(g.n, g.n)
    img.a[g.ring(14, 14, 10, 8.8)] = idx("e1")
    img.a[g.arc(14, 14, 9.4, 1.2, 100, 170)] = idx("e2")
    for (a, b) in (((14, 0.5), (14, 7.5)), ((14, 20.5), (14, 27.5)), ((0.5, 14), (7.5, 14)), ((20.5, 14), (27.5, 14))):
        img.a[g.line(a, b, 1.2)] = idx("e1h")
    img.a[g.circle(14, 14, 1.3)] = idx("e2")
    return img


def st_handshake(g: G) -> Img:
    """Handshake in progress: three relay lamps on a carrier — two amber cores lit, the last one waiting."""
    img = Img(g.n, g.n)
    carrier = g.rect(0, 13, 28, 2)
    shade(img, carrier, R["verdigris"], "bevel", width=1, ambient=0.3)
    for i, x in enumerate((4.5, 14, 23.5)):
        img.a[g.circle(x, 14, 4.3)] = idx("k0")
        shade(img, g.circle(x, 14, 3.5), R["glass"], "sphere", sphere=(x * g.k, 14 * g.k, 3.5 * g.k, 3.5 * g.k))
        if i < 2:
            img.a[g.circle(x - 0.3, 13.7, 1.5)] = idx("a0h")
            img.put(int((x - 0.8) * g.k), int(13.2 * g.k), "a2")
        else:
            img.put(int((x - 1.4) * g.k), int(12.4 * g.k), "k4")
    return img


def statuses():
    fns = [("fire", st_fire), ("breach", st_breach), ("low-air", st_low_air), ("pause", st_pause),
           ("evasion", st_evasion), ("sensors", st_sensors), ("lock", st_lock), ("crew-lost", st_crew_lost),
           ("boarders", st_boarders), ("suffocating", st_suffocating), ("ion", st_ion), ("repair", st_repair),
           ("target", st_target), ("handshake", st_handshake)]
    out = {}
    for name, fn in fns:
        out[f"status-{name}"], out[f"status-{name}-sm"] = both(fn)
    return out


# ══ HANDSHAKE METER (40x40) ══════════════════════════════════════════════════════════════════════════════
def handshake():
    """handshake-0..3: HELLO · I HEAR YOU · I HEAR YOU HEAR ME. Three relay lamps along a braided carrier on a
    switch plate; they light amber in turn, and all show teal when the switch will throw (the tongue closes)."""
    out = {}
    S = Shape(MAIN)
    for n in range(4):
        img = plate("unpowered" if n == 0 else "powered")
        carrier = S.rect(6, 21, 28, 3)
        shade(img, carrier, R["verdigris"], "bevel", width=1, ambient=0.3)
        for x in range(6, 34, 3):
            img.a[S.line((x, 21), (x + 1.6, 24), 0.8) & carrier] = idx("g0")
        for i, x in enumerate((11.5, 20, 28.5)):
            img.a[S.circle(x, 15.5, 3.9)] = idx("k0")
            shade(img, S.circle(x, 15.5, 3.2), R["glass"], "sphere", sphere=(x, 15.5, 3.2, 3.2))
            lit = i < n
            if lit:
                col = R["teal"] if n == 3 else R["amber"]
                img.a[S.circle(x - 0.3, 15.2, 1.7)] = idx(col[2])
                img.put(int(x - 1), 14, col[-1])
            else:
                img.put(int(x - 1.5), 14, "k4")
        # switch tongue under the carrier: open until the handshake completes
        if n == 3:
            tongue = S.rect(12, 28, 16, 2)
        else:
            tongue = S.line((12, 29), (26, 26.5), 2)
        shade(img, tongue, R["brass"], "bevel", width=1)
        for x in (11, 29):
            dome(img, x, 29, 1.4, ["k2", "b0", "b1", "b2", "b3"])
        out[f"handshake-{n}"] = img
    return out
