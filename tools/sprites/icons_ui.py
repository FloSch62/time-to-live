"""Button glyphs and pips (contract v3, hi-bit).

Glyphs are quiet ivory reliefs (40x40; `-dim` in steel) for buttons, with 28x28 `-sm` versions of the arrows,
check, plus, minus and close. Pips: rarity gems 18x18, skill-level lamps 20x20.
"""
from __future__ import annotations

import math

import numpy as np

from icons_hd import R, Shape, dome, lamp, outline, shade
from icons_res import frame
from icons_sys import G
from px import Img, idx

MAIN, SMALL = 40, 28
LIT = R["ivory"][1:]
DIM = ["k3", "k4", "k5", "k5~s0", "s0", "s0h", "s1"]


def relief(g: G, mask, ramp, cut=None) -> Img:
    img = Img(g.n, g.n)
    shade(img, mask, ramp, "bevel", width=max(1, int(g.k * 1.2)), ambient=0.3, bias=0.05)
    if cut is not None:
        img.a[cut & mask] = idx(ramp[0])
    return img


def arrow(g: G, direction="right"):
    m = g.rect(3, 11.5, 14, 5) | g.poly([(15, 4.5), (25.5, 14), (15, 23.5)])
    if direction == "right":
        return m
    X, Y = g.S.X, g.S.Y
    n = g.n
    if direction == "left":
        return m[:, ::-1]
    if direction == "up":
        return np.rot90(m, 1)
    return np.rot90(m, -1)


def glyph_masks(g: G):
    """name -> (mask, cut or None)"""
    d = {}
    d["hop"] = (g.poly([(2, 5), (11, 14), (2, 23), (2, 18.5), (6.5, 14), (2, 9.5)])
                | g.poly([(11, 5), (20, 14), (11, 23), (11, 18.5), (15.5, 14), (11, 9.5)])
                | g.rect(21.5, 5, 4, 18), None)
    d["pause"] = (g.rrect(6, 4, 6, 20, 1) | g.rrect(16, 4, 6, 20, 1), None)
    d["play"] = (g.poly([(7, 3.5), (24, 14), (7, 24.5)]), None)
    car = g.poly([(3, 12), (21, 12), (25.5, 15), (25.5, 20.5), (3, 20.5)])
    d["ship"] = (car | g.rect(0, 5, 28, 1.8) | g.rect(10, 6.5, 1.6, 5.5) | g.rect(16, 6.5, 1.6, 5.5)
                 | g.circle(10.8, 5.8, 2) | g.circle(16.8, 5.8, 2) | g.rrect(9, 20.5, 10, 2.5, 1),
                 g.rect(5, 14, 2.2, 2.2) | g.rect(9, 14, 2.2, 2.2) | g.rect(13, 14, 2.2, 2.2)
                 | g.rect(19.5, 14, 3.5, 2.2) | g.rect(3, 17.5, 22.5, 0.9))
    chart = g.poly([(2, 5), (10, 3), (18, 5), (26, 3), (26, 23), (18, 25), (10, 23), (2, 25)])
    folds = g.line((10, 3), (10, 23), 0.9) | g.line((18, 5), (18, 25), 0.9)
    route = g.empty()
    for (a, b) in (((5, 19), (8, 16)), ((10, 14.5), (13, 12.5)), ((15.5, 11.5), (18.5, 10)), ((20.5, 9), (23, 7.5))):
        route |= g.line(a, b, 1.1)
    d["map"] = (chart, folds | route | g.circle(23, 7.5, 1.4) | g.circle(5, 19, 1.2))
    rails = g.rrect(1, 5, 26, 2.2, 1) | g.rrect(1, 13, 26, 2.2, 1) | g.rrect(1, 21, 26, 2.2, 1)
    knobs = g.rrect(15, 2.5, 4, 7, 1) | g.rrect(6, 10.5, 4, 7, 1) | g.rrect(19, 18.5, 4, 7, 1)
    d["settings"] = (rails | knobs, g.rect(16.4, 4, 1.2, 4) | g.rect(7.4, 12, 1.2, 4) | g.rect(20.4, 20, 1.2, 4))
    horn = g.poly([(2, 10), (7, 10), (15, 3), (15, 25), (7, 18), (2, 18)])
    d["sound-on"] = (horn | g.arc(15, 14, 5.5, 1.8, -50, 50) | g.arc(15, 14, 9.5, 1.8, -50, 50),
                     g.line((15, 7), (15, 21), 0.9))
    d["sound-off"] = (horn | g.line((18.5, 9.5), (26, 18.5), 2.4) | g.line((26, 9.5), (18.5, 18.5), 2.4),
                      g.line((15, 7), (15, 21), 0.9))
    br = g.empty()
    for (x, y, sx, sy) in ((2, 2, 1, 1), (26, 2, -1, 1), (2, 26, 1, -1), (26, 26, -1, -1)):
        br |= g.line((x, y), (x + 7 * sx, y), 2.6) | g.line((x, y), (x, y + 7 * sy), 2.6)
    d["fullscreen"] = (br, None)
    d["close"] = (g.line((4, 4), (24, 24), 3.4) | g.line((24, 4), (4, 24), 3.4), None)
    back = g.arc(15, 14, 7.5, 3.2, -90, 90) | g.rect(8, 3.9, 7, 3.2) | g.rect(8, 20.9, 11, 3.2)
    d["back"] = (back | g.poly([(1.5, 5.5), (9, 0), (9, 11)]), None)
    for dname in ("right", "left", "up", "down"):
        d[f"arrow-{dname}"] = (arrow(g, dname), None)
    d["check"] = (g.polyline([(3, 14.5), (10.5, 22), (25, 5.5)], 3.6), None)
    d["plus"] = (g.rect(11.5, 3, 5, 22) | g.rect(3, 11.5, 22, 5), None)
    d["minus"] = (g.rect(3, 11.5, 22, 5), None)
    head = g.circle(14, 9, 5.8)
    shoulders = g.ellipse(14, 26, 11.5, 8) & g.rect(0, 0, 28, 27)
    headset = g.arc(14, 9, 7.3, 1.4, 20, 160) | g.rrect(5.5, 7, 3, 6, 1) | g.rrect(19.5, 7, 3, 6, 1)
    mic = g.polyline([(7, 12.5), (8.5, 15.5), (11.5, 15.5)], 1.1)
    d["crew"] = (head | shoulders | headset | mic, g.ellipse(14, 17.5, 5, 1.3) | g.line((14, 19), (14, 27), 0.9))
    book = g.poly([(1, 6), (13.3, 4), (13.3, 25), (1, 25.5)]) | g.poly([(26.9, 6), (14.7, 4), (14.7, 25),
                                                                         (26.9, 25.5)])
    lines = g.empty()
    for y in (9, 12.5, 16, 19.5):
        lines |= g.line((4, y), (10.5, y - 0.5), 0.9) | g.line((17.5, y - 0.5), (24, y), 0.9)
    d["codex"] = (book | g.rect(13.3, 4, 1.4, 22), lines | g.rect(13.3, 4, 1.4, 22))
    stamp = g.circle(14, 4.5, 3.5) | g.rect(12.5, 7, 3, 7) | g.rrect(5, 13.5, 18, 6, 1.5) | g.rect(3, 20.5, 22, 3)
    teeth = g.empty()
    for x in range(4, 25, 3):
        teeth |= g.rect(x, 23.5, 1.5, 2.5)
    d["save"] = (stamp | teeth, g.rect(5, 16, 18, 0.9))
    up = g.poly([(14, 2), (25, 13), (18, 13), (18, 20), (10, 20), (10, 13), (3, 13)])
    d["upgrade"] = (up | g.rrect(2, 22.5, 24, 3.5, 1), None)
    crate = g.rrect(2, 9, 24, 16, 1.5) | g.poly([(4, 9), (7, 3), (21, 3), (24, 9)])
    d["store"] = (crate, g.rect(2, 13, 24, 0.9) | g.rect(2, 20.5, 24, 0.9) | g.rect(12.5, 9, 3, 7) & ~g.rect(13.5, 10, 1, 5)
                  | g.line((7, 3), (4, 9), 0.9) | g.line((21, 3), (24, 9), 0.9))
    d["info"] = (g.circle(14, 14, 12.5), g.rect(12, 11, 4, 10) | g.circle(14, 7.2, 2.2) | g.rect(10.5, 20, 7, 2))
    loop = g.arc(13, 14, 9.5, 3, 40, 340)
    d["autofire"] = (loop | g.poly([(19.5, 2.5), (27, 7.5), (19, 12)]) | g.circle(13, 14, 3.5),
                     g.circle(13, 14, 1.5))
    return d


ORDER = ["hop", "pause", "play", "ship", "map", "settings", "sound-on", "sound-off", "fullscreen", "close", "back",
         "arrow-left", "arrow-right", "arrow-up", "arrow-down", "check", "plus", "minus", "crew", "codex", "save",
         "upgrade", "store", "info", "autofire"]
SM = ["arrow-left", "arrow-right", "arrow-up", "arrow-down", "check", "plus", "minus", "close"]


def glyphs():
    out = {}
    gm, gs = G(MAIN - 4), G(SMALL - 4)
    big, small = glyph_masks(gm), glyph_masks(gs)
    for k in ORDER:
        m, c = big[k]
        out[f"glyph-{k}"] = frame(relief(gm, m, LIT, c), MAIN)
        out[f"glyph-{k}-dim"] = frame(relief(gm, m, DIM, c), MAIN)
    for k in SM:
        m, c = small[k]
        out[f"glyph-{k}-sm"] = frame(relief(gs, m, LIT, c), SMALL)
        out[f"glyph-{k}-sm-dim"] = frame(relief(gs, m, DIM, c), SMALL)
    return out


def gem(n, ramp) -> Img:
    """A cut gem: four facets lit from the top-left, a small table highlight."""
    S = Shape(n)
    c = n / 2
    img = Img(n, n)
    X, Y = S.X - c, S.Y - c
    diamond = np.abs(X) + np.abs(Y) <= c - 1
    tl = diamond & (X <= 0) & (Y <= 0)
    tr = diamond & (X > 0) & (Y <= 0)
    bl = diamond & (X <= 0) & (Y > 0)
    br = diamond & (X > 0) & (Y > 0)
    img.a[tl] = idx(ramp[3])
    img.a[tr] = idx(ramp[2])
    img.a[bl] = idx(ramp[1])
    img.a[br] = idx(ramp[0])
    table = np.abs(X) + np.abs(Y) <= c * 0.35
    img.a[table] = idx(ramp[2])
    img.a[table & (X + Y < 0)] = idx(ramp[3])
    img.put(int(c - 2), int(c - 2), ramp[4])
    outline(img, None, "k0")
    return img


def pips():
    out = {}
    for k, ramp in (("common", ["k4", "s0", "s0h", "s1", "s2"]), ("uncommon", ["t0", "t0h", "t1", "t1h", "t2"]),
                    ("rare", ["b0", "a0", "a0h", "a1", "a1h"]), ("legendary", ["v0", "v0h", "v1", "v1h", "v2h"])):
        out[f"pip-rarity-{k}"] = gem(18, ramp)
    n = 20
    S = Shape(n)
    img = Img(n, n)
    shade(img, S.ring(10, 10, 9, 6.3), R["brass"], "bevel", width=1, ambient=0.25)
    shade(img, S.circle(10, 10, 6.3), R["glass"], "sphere", sphere=(11, 11, 7, 7))
    img.put(7, 7, "k4")
    outline(img, None, "k0")
    out["pip-skill-0"] = img
    img = Img(n, n)
    shade(img, S.ring(10, 10, 9, 6.3), R["brass"], "bevel", width=1, ambient=0.25)
    shade(img, S.circle(10, 10, 6.3), R["teal"][:6], "sphere", sphere=(10, 10, 6.3, 6.3), ambient=0.2)
    img.put(7, 7, "t3")
    outline(img, None, "k0")
    out["pip-skill-1"] = img
    img = Img(n, n)
    shade(img, S.ring(10, 10, 9, 6.3), R["brass"], "bevel", width=1, ambient=0.25)
    shade(img, S.circle(10, 10, 6.3), R["brass-lit"][:8], "sphere", sphere=(10, 10, 6.3, 6.3), ambient=0.2)
    img.put(7, 7, "a2")
    outline(img, None, "k0")
    out["pip-skill-2"] = img
    return out
