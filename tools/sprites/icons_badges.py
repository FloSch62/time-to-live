"""Relic-style round badges (contract v3, hi-bit), FAULTLINE's relic/perk look: a riveted tarnished bezel, an inset
dark field, a small muted symbol with one lit accent. 40x40 (skill badges also have bare 28x28 `-sm` symbols).

aug-<id> (14) · hazard-<id> (9, rim tinted by stage: copper / violet / ember) · species-<id> (5) · pip-skill-<skill> (6)
"""
from __future__ import annotations

import math

import numpy as np

from icons_hd import R, Shape, dome, fill, lamp, outline, shade
from icons_res import frame
from icons_sys import G, glyph_masks
from px import Img, idx

N = 40
C = 20.0
RIM = {
    "brass": R["brass"],
    "copper": ["k2", "c0", "c0h", "c1", "c1h", "c2", "c2h", "c3"],
    "violet": ["k2", "v0", "v0h", "v1", "v1h", "v2"],
    "ember": ["k2", "e0", "e0h", "e1", "e1h"],
}
GOLD = ["b0", "b0h", "b1", "b1h", "b2", "b2h", "b3"]
IVORY = R["ivory"][1:]
STEEL = R["steel"][2:]


def badge(symbol: Img, rim="brass") -> Img:
    S = Shape(N)
    img = Img(N, N)
    ring = S.ring(C, C, 19.2, 15.4)
    shade(img, ring, RIM[rim], "bevel", width=2, ambient=0.22)
    field = S.circle(C, C, 15.4)
    fill(img, field, "k1")
    img.a[S.arc(C, C, 14.6, 1.6, 90, 200)] = idx("k0")
    img.a[S.arc(C, C, 14.8, 1.0, 270, 20)] = idx("k2")
    for a in (90, 0, 270, 180):
        x, y = S.at(C, C, 17.3, a)
        dome(img, x, y, 1.2, [RIM[rim][0], RIM[rim][2], RIM[rim][4], RIM[rim][-1]])
    outline(img, None, "k0")
    if symbol is not None:
        bb = symbol.bbox()
        sym = symbol.crop(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1])
        if sym.w > 26 or sym.h > 26:
            raise ValueError(f"badge symbol {sym.w}x{sym.h} > 26")
        tmp = Img(N, N)
        tmp.blit(sym, (N - sym.w) // 2, (N - sym.h) // 2)
        outline(tmp, None, "k0")
        img.blit(tmp, 0, 0)
    return img


def canvas():
    g = G(24)
    return g, Img(24, 24)


def braid(img, g: G, y, x0=0, x1=24, th=2.4):
    band = g.rect(x0, y, x1 - x0, th)
    shade(img, band, R["verdigris"], "bevel", width=1, ambient=0.3)
    for x in np.arange(x0 - 1, x1, 2.4):
        img.a[g.line((x, y), (x + th * 0.7, y + th), 0.8) & band] = idx("g0")
    return band


# ══ augments ════════════════════════════════════════════════════════════════════════════════════════════
def a_startup_config():
    """A switchboard plug pushed home, its lamp already lit."""
    g, img = canvas()
    cord = g.polyline([(1, 23), (4, 18), (9, 16.5), (12, 14)], 1.6)
    shade(img, cord, R["iron"], "bevel", width=1, ambient=0.4)
    plug = g.line((11, 15), (18, 8), 4.2)
    shade(img, plug, GOLD, "cyl", cyl=(g.p(11, 15), g.p(18, 8), 2.1 * g.k), ambient=0.2)
    tip = g.line((18, 8), (22, 4), 1.6)
    shade(img, tip, STEEL, "flat", ambient=0.6)
    img.a[g.line((13, 13), (15, 11), 0.9)] = idx("b0")
    lamp(img, 5 * g.k, 5 * g.k, 2.3 * g.k, R["amber"])
    return img


def a_hot_swap_rig():
    """Two charge cartridges trading places, a brass fuse between them."""
    g, img = canvas()
    for x in (2.5, 16.5):
        cart = g.rrect(x, 4, 5, 16, 1.2)
        shade(img, cart, STEEL, "cyl", cyl=(g.p(x + 2.5, 0), g.p(x + 2.5, 24), 2.5 * g.k), ambient=0.2)
        img.a[g.rect(x, 7, 5, 1) | g.rect(x, 16, 5, 1)] = idx("k4")
    img.a[g.rect(3.5, 9, 3, 6)] = idx("t0h")
    img.a[g.rect(17.5, 9, 3, 6)] = idx("k2")
    arr = g.arc(12, 12, 5.5, 1.3, 30, 150) | g.poly([(7, 11), (5.2, 8), (9.2, 8.2)])
    arr2 = g.arc(12, 12, 5.5, 1.3, 210, 330) | g.poly([(17, 13), (18.8, 16), (14.8, 15.8)])
    img.a[arr | arr2] = idx("i1")
    fuse = g.rrect(10.5, 10, 3, 4, 0.8)
    shade(img, fuse, GOLD, "bevel", width=1)
    return img


def a_vargas_crimper():
    """Varga's crimper: steel jaws closed on a copper cable end, worn grips."""
    g, img = canvas()
    h1 = g.line((3, 22), (10.5, 12), 2.6)
    h2 = g.line((8.5, 23), (12.5, 13), 2.6)
    shade(img, h1 | h2, ["k2", "c0", "c1", "c1h", "c2"], "bevel", width=1, ambient=0.3)
    jaw = g.poly([(10, 12.5), (13.5, 12), (19.5, 5), (17.5, 3), (14.5, 6.5)])
    shade(img, jaw, STEEL, "bevel", width=1, ambient=0.25)
    dome(img, 12 * g.k, 12.5 * g.k, 1.4 * g.k, ["k3", "s0", "s1", "s2"])
    cable = g.line((16, 1), (23, 8), 2.2)
    shade(img, cable, R["copper"], "cyl", cyl=(g.p(16, 1), g.p(23, 8), 1.1 * g.k))
    return img


def a_harrows_kettle():
    """Harrow's kettle on the bench stove, a thread of steam."""
    g, img = canvas()
    body = g.ellipse(11, 14.5, 8, 6) & g.rect(0, 0, 24, 19.5)
    shade(img, body, GOLD, "sphere", sphere=(*g.p(10, 13), 8 * g.k, 6 * g.k), ambient=0.2)
    lid = g.ellipse(11, 8.8, 4, 1.6) | g.circle(11, 7, 1.2)
    shade(img, lid, GOLD, "bevel", width=1)
    spout = g.line((17.5, 14), (22.5, 9), 2.4, 1.5)
    shade(img, spout, GOLD, "bevel", width=1)
    handle = g.arc(3.5, 13.5, 3.5, 1.4, 100, 260)
    shade(img, handle, R["iron"], "flat", ambient=0.6)
    stove = g.rect(2, 20, 18, 2.5)
    shade(img, stove, R["iron"], "bevel", width=1)
    img.a[g.rect(5, 19.3, 12, 0.9)] = idx("a0")
    img.a[g.polyline([(22.5, 7), (21.5, 4.5), (22.8, 2)], 0.9)] = idx("i0")
    return img


def a_salvage_arm():
    """A salvage arm: jointed steel arm, claw closed on a brass gear."""
    g, img = canvas()
    arm = g.line((2, 22), (7, 12), 2.8) | g.line((7, 12), (15, 9), 2.4)
    shade(img, arm, STEEL, "bevel", width=1, ambient=0.25)
    dome(img, 7 * g.k, 12 * g.k, 1.8 * g.k, ["k3", "b0", "b1", "b2"])
    gear_c = (19, 12.5)
    X, Y = g.S.X / g.k, g.S.Y / g.k
    r = np.hypot(X - gear_c[0], Y - gear_c[1])
    ang = (np.degrees(np.arctan2(Y - gear_c[1], X - gear_c[0])) + 360) % 45
    gear = ((r < 4) | ((r < 5.3) & (ang < 22))) & (r > 1.5)
    shade(img, gear, GOLD, "bevel", width=1)
    claw = g.polyline([(14, 8), (16.5, 5.5), (19.5, 6.5)], 1.4) | g.polyline([(15, 10.5), (16, 14.5), (18.5, 17)], 1.4)
    shade(img, claw, STEEL, "flat", ambient=0.5)
    return img


def a_listening_horn():
    """A brass listening horn on its stalk."""
    g, img = canvas()
    cone = g.poly([(3, 2), (13, 8.5), (13, 11.5), (3, 18)])
    mouth = g.ellipse(3.3, 10, 2, 8)
    shade(img, (cone | mouth), GOLD, "bevel", width=1, ambient=0.25)
    img.a[g.ellipse(3, 10, 1, 6.2)] = idx("k0")
    pipe = g.polyline([(12.5, 10), (17, 10), (19.5, 12.5), (19.5, 20)], 2.4)
    shade(img, pipe, GOLD, "bevel", width=1)
    base = g.rrect(15, 20, 9, 3, 1)
    shade(img, base, R["iron"], "bevel", width=1)
    img.put(int(17 * g.k), int(9.6 * g.k), "t2")
    return img


def a_brass_plating():
    """Overlapping riveted brass plates."""
    g, img = canvas()
    for (x, y) in ((2, 3), (12, 3), (7, 12.5)):
        pl = g.chamfer(x, y, 10, 9.5, 1.8)
        shade(img, pl, GOLD, "bevel", width=1, ambient=0.25)
        for (dx, dy) in ((1.8, 1.8), (8.2, 1.8), (1.8, 7.7), (8.2, 7.7)):
            img.put(int((x + dx) * g.k), int((y + dy) * g.k), "b3")
        img.a[g.rect(x, y + 9, 10, 0.9)] = idx("k1")
    return img


def a_sprinkler_runbook():
    """The runbook open at the fire page, a spray head above it."""
    g, img = canvas()
    book = g.poly([(1, 13), (11.3, 11.5), (11.3, 22), (1, 22.5)]) | g.poly([(23, 13), (12.7, 11.5), (12.7, 22),
                                                                            (23, 22.5)])
    shade(img, book, IVORY, "bevel", width=1, ambient=0.3)
    img.a[g.rect(11.3, 11.5, 1.4, 11)] = idx("i0")
    for y in (15, 17.5, 20):
        img.a[g.line((3, y), (9.5, y - 0.4), 0.8) | g.line((14.5, y - 0.4), (21, y), 0.8)] = idx("i0h")
    head = g.rrect(9, 2, 6, 3, 1) | g.rect(11.3, 0, 1.4, 2)
    shade(img, head, STEEL, "bevel", width=1)
    for x in (8, 12, 16):
        img.a[g.line((12, 5.5), (x, 9.5), 0.8)] = idx("t0h")
    img.put(int(12 * g.k), int(8.5 * g.k), "t1h")
    return img


def a_bench_kit():
    """A field bench kit: strapped case, brass corners, one small vial."""
    g, img = canvas()
    case = g.rrect(1.5, 8, 21, 14, 1.5)
    shade(img, case, ["k2", "c0", "c0h", "c1", "c1h", "c2"], "bevel", width=1, ambient=0.25)
    handle = g.arc(12, 8, 3.5, 1.3, 0, 180)
    shade(img, handle, R["iron"], "flat", ambient=0.6)
    strap = g.rect(1.5, 13.5, 21, 2.2)
    shade(img, strap, R["verdigris"], "flat", ambient=0.5)
    for (x, y) in ((1.5, 8), (20, 8), (1.5, 19.5), (20, 19.5)):
        img.a[g.rect(x, y, 2.5, 2.5)] = idx("b1h")
    vial = g.rrect(15.5, 2, 3, 6, 1)
    shade(img, vial, ["k1", "t0", "t0h", "t1"], "cyl", cyl=(g.p(17, 0), g.p(17, 24), 1.5 * g.k))
    img.a[g.rect(15.5, 1, 3, 1.2)] = idx("s1")
    return img


def a_lamp_dark_coating():
    """A lamp behind a lowered shutter: only a sliver of violet light escapes."""
    g, img = canvas()
    cage = g.rrect(5, 3, 14, 18, 2)
    shade(img, cage, R["iron"], "bevel", width=1, ambient=0.3)
    glass = g.rrect(7, 5, 10, 14, 1.5)
    shade(img, glass, R["glass"], "sphere", sphere=(*g.p(12, 12), 6 * g.k, 8 * g.k))
    img.a[g.rect(7, 16, 10, 1.2)] = idx("v1h")
    img.a[g.rect(10, 16, 4, 1.2)] = idx("v2h")
    shutter = g.rect(6, 5, 12, 10.5)
    shade(img, shutter, ["k2", "v0", "v0h", "v1"], "bevel", width=1, ambient=0.3)
    for y in (7.5, 10, 12.5):
        img.a[g.rect(6, y, 12, 0.8)] = idx("k1")
    img.a[g.ring(12, 1.8, 2, 1)] = idx("s0")
    base = g.rrect(4, 21, 16, 2.5, 1)
    shade(img, base, R["iron"], "bevel", width=1)
    return img


def a_second_way_home():
    """A second way home: the route forks, and the second branch still ends at a lit relay lamp."""
    g, img = canvas()
    main = g.polyline([(1, 20), (10, 14), (23, 14)], 2.0)
    fork = g.polyline([(10, 14), (15, 6), (19, 4)], 2.0)
    shade(img, main | fork, R["verdigris"], "bevel", width=1, ambient=0.3)
    img.a[g.circle(10, 14, 2.2)] = idx("b1")
    lamp(img, 21 * g.k, 4 * g.k, 2.4 * g.k, R["teal"])
    lamp(img, 22 * g.k, 14 * g.k, 1.8 * g.k, R["glass"], lit=False)
    return img


def a_keepalive():
    """Keepalive: the ward-mesh pulse — a steady line with one live beat."""
    g, img = canvas()
    braid(img, g, 18, 0, 24, 2.4)
    pulse = g.polyline([(0, 11), (7, 11), (9, 6), (11.5, 16), (13.5, 3.5), (15.5, 11), (24, 11)], 1.2)
    img.a[pulse] = idx("t0h")
    img.a[g.polyline([(9, 6), (11.5, 16), (13.5, 3.5)], 1.2)] = idx("t1h")
    img.put(int(13.5 * g.k), int(3.8 * g.k), "t2")
    return img


def a_drone_recovery():
    """A drone brought home: the drone and the arc of its return."""
    g, img = canvas()
    body, cut, glow = glyph_masks("drones", 16)
    d = Img(16, 16)
    shade(d, body & ~cut, GOLD, "bevel", width=1, ambient=0.25)
    d.a[glow] = idx("t0h")
    img.blit(d, 4, 6)
    arc = g.arc(12, 13, 10.5, 1.3, 20, 160)
    img.a[arc & (img.a < 0)] = idx("i1")
    img.a[g.poly([(21, 6.5), (23.8, 11), (18.5, 10.5)])] = idx("i1")
    return img


def a_wireshark_tap():
    """The wireshark tap: a dim teal fin cutting along the carrier it listens to."""
    g, img = canvas()
    braid(img, g, 16, 0, 24, 3)
    fin = g.poly([(6, 15.5), (13, 2), (15, 6.5), (20, 15.5)])
    shade(img, fin, ["k2", "t0", "t0h", "t1", "t1h"], "bevel", width=1, ambient=0.25)
    img.a[g.line((13, 3), (13.5, 14.5), 0.8) & fin] = idx("t0")
    img.put(int(12.5 * g.k), int(5 * g.k), "t2")
    wake = g.line((2, 21), (8, 21), 0.8) | g.line((17, 21.5), (23, 21.5), 0.8)
    img.a[wake] = idx("k4")
    return img


AUGS = {
    "startup-config": a_startup_config, "hot-swap-rig": a_hot_swap_rig, "vargas-crimper": a_vargas_crimper,
    "harrows-kettle": a_harrows_kettle, "salvage-arm": a_salvage_arm, "listening-horn": a_listening_horn,
    "brass-plating": a_brass_plating, "sprinkler-runbook": a_sprinkler_runbook, "bench-kit": a_bench_kit,
    "lamp-dark-coating": a_lamp_dark_coating, "second-way-home": a_second_way_home, "keepalive": a_keepalive,
    "drone-recovery": a_drone_recovery, "wireshark-tap": a_wireshark_tap,
}


# ══ hazards ══════════════════════════════════════════════════════════════════════════════════════════════
def h_debris_field():
    g, img = canvas()
    for (pts, ramp) in (([(2, 5), (9, 2.5), (11, 8), (5, 10.5)], STEEL), ([(13, 12), (21, 10), (22.5, 16), (15, 18.5)],
                         ["k2", "c0", "c1", "c1h", "c2"]), ([(4, 16), (9, 15), (8.5, 20.5), (3.5, 21)], STEEL)):
        m = g.poly(pts)
        shade(img, m, ramp, "bevel", width=1, ambient=0.25)
    for (a, b) in (((12, 4), (17, 2.5)), ((16, 6), (21, 5)), ((11, 20.5), (15, 22))):
        img.a[g.line(a, b, 0.8)] = idx("k4")
    return img


def h_rust_squall():
    g, img = canvas()
    for (y, x0, x1) in ((5, 2, 18), (10, 0, 22), (15, 3, 23), (20, 1, 16)):
        img.a[g.line((x0, y), (x1, y - 1.5), 1.2)] = idx("s0")
        img.a[g.line((x1 - 3, y - 1), (x1, y - 1.5), 1.2)] = idx("s1")
    for (x, y) in ((6, 7.5), (15, 12.5), (9, 17.5), (19, 4), (20, 18)):
        flake = g.poly([(x, y), (x + 2, y - 0.8), (x + 1.5, y + 1.2)])
        shade(img, flake, ["c0", "c1", "c1h", "c2", "c3"], "bevel", width=1)
    return img


def h_sun_glare():
    g, img = canvas()
    for a in range(0, 360, 30):
        p0 = (12 + 7 * math.cos(math.radians(a)), 12 - 7 * math.sin(math.radians(a)))
        p1 = (12 + (11 if a % 60 == 0 else 9.5) * math.cos(math.radians(a)),
              12 - (11 if a % 60 == 0 else 9.5) * math.sin(math.radians(a)))
        img.a[g.line(p0, p1, 1.1)] = idx("a0" if a % 60 == 0 else "b1h")
    disc = g.circle(12, 12, 5.5)
    shade(img, disc, ["b0", "a0", "a0h", "a1", "a1h"], "sphere", sphere=(*g.p(12, 12), 5.5 * g.k, 5.5 * g.k),
          ambient=0.3)
    return img


def h_glass_fog():
    g, img = canvas()
    for (x, y, w) in ((2, 4, 15), (6, 9, 17), (1, 14, 19), (5, 19, 14)):
        band = g.rrect(x, y, w, 3, 1.5)
        shade(img, band, ["k2", "v0", "v0h", "v1", "v1h"], "bevel", width=1, ambient=0.3)
    return img


def h_ringing_panes():
    g, img = canvas()
    bell = g.poly([(8, 5), (16, 5), (18.5, 17), (5.5, 17)]) | g.ellipse(12, 5, 4, 2.5) | g.rrect(3.5, 16, 17, 2.5, 1)
    shade(img, bell, ["k2", "v0", "v0h", "v1", "v1h", "v2"], "bevel", width=1, ambient=0.25)
    img.a[g.circle(12, 20.2, 1.4)] = idx("v2h")
    for r in (9.5, 11.8):
        img.a[(g.arc(12, 11, r, 0.9, 150, 210) | g.arc(12, 11, r, 0.9, 330, 30)) & (img.a < 0)] = idx("v1")
    return img


def h_resonance():
    g, img = canvas()
    fork = g.rect(8, 2, 2.2, 11) | g.rect(13.8, 2, 2.2, 11) | g.rect(8, 12, 8, 2.2) | g.rect(10.9, 14, 2.2, 8)
    shade(img, fork, ["k2", "v0h", "v1", "v1h", "v2", "v2h"], "bevel", width=1, ambient=0.25)
    for r in (3, 5.5):
        img.a[g.arc(12, 6, r + 5, 0.9, 150, 210)] = idx("t0h")
        img.a[g.arc(12, 6, r + 5, 0.9, 330, 30)] = idx("t0h")
    return img


def h_ember_draft():
    g, img = canvas()
    X, Y = g.S.X / g.k, g.S.Y / g.k
    t = np.clip((Y - 8) / 14, 0, 1)
    flame = (Y >= 8) & (Y <= 22) & (np.abs(X - 12 - (1 - t) ** 2 * 2) <= 5 * np.sin(np.pi * (0.1 + 0.9 * t ** 0.8) / 1.2))
    from hd import paint
    paint(img, flame, t, ["e0", "e0h", "e1", "e1h", "e2", "a0"], 0.0, 1.0)
    for (x, y) in ((5, 7), (18, 5), (9, 2.5), (15, 9), (20, 13)):
        img.a[g.circle(x, y, 0.9)] = idx("e1h")
    img.put(int(9 * g.k), int(2.5 * g.k), "a0")
    return img


def h_dark_stretch():
    g, img = canvas()
    lampm = g.circle(12, 12, 8)
    shade(img, lampm, ["k0", "k1", "k1h", "k2", "k2h", "k3"], "sphere", sphere=(*g.p(10, 10), 8 * g.k, 8 * g.k))
    img.a[g.arc(12, 12, 8.5, 1.2, 200, 340)] = idx("e0h")
    img.a[g.circle(12, 12, 2)] = idx("k0")
    return img


def h_sealing_lattice():
    g, img = canvas()
    X, Y = g.S.X / g.k, g.S.Y / g.k
    a, b = np.mod(X - Y + 30, 6), np.mod(X + Y, 6)
    area = g.circle(12, 12, 11)
    wire = ((np.minimum(a, 6 - a) < 0.7) | (np.minimum(b, 6 - b) < 0.7)) & area
    img.a[wire] = idx("e0h")
    nodes = (np.minimum(a, 6 - a) < 0.7) & (np.minimum(b, 6 - b) < 0.7) & g.circle(12, 12, 7)
    img.a[nodes] = idx("e1h")
    return img


HAZ = {
    "debris-field": ("copper", h_debris_field), "rust-squall": ("copper", h_rust_squall),
    "sun-glare": ("copper", h_sun_glare), "glass-fog": ("violet", h_glass_fog),
    "ringing-panes": ("violet", h_ringing_panes), "resonance": ("violet", h_resonance),
    "ember-draft": ("ember", h_ember_draft), "dark-stretch": ("ember", h_dark_stretch),
    "sealing-lattice": ("ember", h_sealing_lattice),
}


# ══ species ══════════════════════════════════════════════════════════════════════════════════════════════
def s_linefolk():
    """A headset with its boom mic and the small chest lamp below."""
    g, img = canvas()
    band = g.arc(12, 11, 8.5, 1.8, 10, 170)
    shade(img, band, R["iron"], "flat", ambient=0.6)
    for x in (2.5, 17.5):
        cup = g.rrect(x, 8.5, 4, 7, 1.5)
        shade(img, cup, GOLD, "bevel", width=1, ambient=0.25)
    boom = g.polyline([(5, 15), (6.5, 19), (11, 20)], 1.3)
    shade(img, boom, R["iron"], "flat", ambient=0.6)
    img.a[g.circle(11.8, 20, 1.4)] = idx("k4")
    lamp(img, 12 * g.k, 5.5 * g.k, 2 * g.k, R["teal"])
    return img


def s_warden():
    """A warden's helm: dark plates, a brass visor band, the ember stripe."""
    g, img = canvas()
    helm = g.ellipse(12, 11, 9, 9.5) & g.rect(0, 0, 24, 19.5)
    helm |= g.poly([(3.5, 15), (20.5, 15), (19, 21.5), (5, 21.5)])
    shade(img, helm, R["iron"], "sphere", sphere=(*g.p(11, 10), 9 * g.k, 10 * g.k), ambient=0.25)
    visor = g.rect(3, 10.5, 18, 3.2)
    shade(img, visor, GOLD, "bevel", width=1, ambient=0.25)
    img.a[g.rect(4, 12, 16, 0.9)] = idx("b0")
    img.a[g.rect(11, 1.5, 2, 9) | g.rect(11, 14, 2, 7)] = idx("e1")
    img.a[g.rect(11, 1.5, 1, 9)] = idx("e1h")
    return img


def s_rigger():
    """A rigger's head housing: boxy ivory shell, one teal lens off centre, a tool arm stub."""
    g, img = canvas()
    box = g.chamfer(2, 4, 17, 15, 2)
    shade(img, box, IVORY, "bevel", width=1, ambient=0.25)
    img.a[g.circle(8.5, 11, 4)] = idx("k0")
    shade(img, g.circle(8.5, 11, 3.2), ["k1", "t0", "t0h", "t1"], "sphere",
          sphere=(*g.p(8.5, 11), 3.2 * g.k, 3.2 * g.k))
    img.put(int(7.5 * g.k), int(9.8 * g.k), "t2")
    img.a[g.rect(13.5, 8, 4, 0.9) | g.rect(13.5, 11, 4, 0.9) | g.rect(13.5, 14, 4, 0.9)] = idx("i0")
    arm = g.line((19, 13), (23, 19), 2)
    shade(img, arm, STEEL, "bevel", width=1)
    img.a[g.rect(10, 1, 1.3, 3)] = idx("s0")
    return img


def s_courier():
    """Courier's goggles pushed up on a cap, a satchel strap below."""
    g, img = canvas()
    cap = g.ellipse(12, 12, 10, 7.5) & g.rect(0, 0, 24, 13.5)
    shade(img, cap, ["k2", "g0", "g0h", "g1", "g1h", "g2"], "sphere", sphere=(*g.p(11, 10), 10 * g.k, 8 * g.k))
    strapb = g.rect(2, 9, 20, 2)
    shade(img, strapb, ["c0", "c1", "c1h", "c2"], "flat", ambient=0.5)
    for x in (7.5, 16.5):
        img.a[g.circle(x, 10, 3.6)] = idx("k0")
        shade(img, g.ring(x, 10, 3.6, 2.4), GOLD, "bevel", width=1)
        shade(img, g.circle(x, 10, 2.4), ["k1", "t0", "t0h", "t1"], "sphere", sphere=(*g.p(x, 10), 2.4 * g.k, 2.4 * g.k))
    strap = g.line((3, 15), (21, 22), 2.2)
    shade(img, strap, ["c0", "c1", "c1h", "c2"], "flat", ambient=0.5)
    lamp(img, 17 * g.k, 19.5 * g.k, 1.7 * g.k, R["amber"])
    return img


def s_bellmaker():
    """A glass tuning fork and the bellmaker's pendant."""
    g, img = canvas()
    fork = g.rect(4, 2, 2, 11) | g.rect(9, 2, 2, 11) | g.rect(4, 12, 7, 2) | g.rect(6.5, 14, 2, 8)
    shade(img, fork, ["k2", "v0h", "v1", "v1h", "v2", "v2h"], "bevel", width=1, ambient=0.25)
    chain = g.polyline([(14, 2), (16.5, 8), (19, 2)], 0.8)
    img.a[chain] = idx("s0")
    pend = g.poly([(16.5, 9), (19.5, 13), (16.5, 19), (13.5, 13)])
    shade(img, pend, ["v0", "v0h", "v1", "v1h", "v2"], "bevel", width=1, ambient=0.3)
    img.put(int(15.8 * g.k), int(12 * g.k), "v3")
    return img


SPECIES = {"linefolk": s_linefolk, "warden": s_warden, "rigger": s_rigger, "courier": s_courier,
           "bellmaker": s_bellmaker}


# ══ skills ═══════════════════════════════════════════════════════════════════════════════════════════════
def skill_symbol(skill, size):
    """Gold relief of the skill's glyph (system glyphs for helm/engines/weapons/shields; spanner; fist)."""
    img = Img(size, size)
    if skill in ("helm", "engines", "weapons", "shields"):
        body, cut, glow = glyph_masks(skill, size)
        shade(img, body & ~cut, GOLD, "bevel", width=1, ambient=0.25)
        img.a[glow] = idx("a0")
        img.a[cut & body] = idx("b0")
        return img
    g = G(size)
    if skill == "repair":
        shaft = g.line((3, 25), (17, 11), 3.4)
        head = g.circle(20, 8, 6)
        jaw = g.poly([(20, 8), (28, 1), (28, 6), (24, 8)]) | g.circle(20.5, 7.5, 2.6)
        shade(img, (shaft | head) & ~jaw, GOLD, "bevel", width=1, ambient=0.25)
    else:
        fist = g.rrect(5, 8, 17, 13, 3) | g.rrect(8, 19, 11, 6, 1)
        shade(img, fist, GOLD, "bevel", width=1, ambient=0.25)
        for x in (9.5, 13.5, 17.5):
            img.a[g.line((x, 8.5), (x, 13.5), 0.9)] = idx("b0")
        thumb = g.rrect(2.5, 13, 8, 4, 2)
        shade(img, thumb, GOLD, "bevel", width=1, ambient=0.3)
    return img


def augments():
    return {f"aug-{k}": badge(fn()) for k, fn in AUGS.items()}


def hazards():
    return {f"hazard-{k}": badge(fn(), rim) for k, (rim, fn) in HAZ.items()}


def species():
    return {f"species-{k}": badge(fn()) for k, fn in SPECIES.items()}


def skill_badges():
    out = {}
    for k in ("helm", "engines", "weapons", "shields", "repair", "combat"):
        out[f"pip-skill-{k}"] = badge(skill_symbol(k, 24))
        out[f"pip-skill-{k}-sm"] = frame(skill_symbol(k, 26), 28)
    return out
