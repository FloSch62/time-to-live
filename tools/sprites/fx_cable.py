"""FX (hi-bit, 2x density): the carrier cable, trolley-wheel sparks, the handshake charge pulses, relay switch
flashes and the Seal's severed cable end. Added to the fx atlas by fx.build() (group "cable"). Atlas px throughout.

Carrier cable: `cable-carrier` is a 32x12 tile (dark edge rows 0 and 11, a 10-px braid of verdigris strands over
copper, lit from the top) that repeats seamlessly left-right; anchor row 6 = the cable centre line. Draw the sag
COLUMN BY COLUMN in backing (HD) pixels: for every HD column X along the span, blit the 1-px column (X mod 32) of
the tile at HD y = 2*sag(X/2) - 6, where sag() is the layout-unit curve. The braid is periodic, so the twist stays
continuous however the curve bends. `cable-carrier-down|up` (32x14) are the same tile with a 2-px step at x=16 for
coarse tile-by-tile drawing. `cable-carrier-thin` (32x6, anchor row 3, no dark edge) is for background routes.
"""
from __future__ import annotations

import math
import random

import numpy as np

import hd
from fx_common import GLOW, SMOKE, arc, grid, put_ramp, radial, streak
from px import Img, idx, line_pts

BRAID = ["k1h", "g0", "g0h", "g1", "g1h", "g2", "g2h", "g3", "g3h", "g4"]


def braid(w=32, h=10, period=8, lean=0.9, glint=True, keys=BRAID, dark=0.0) -> Img:
    """Twisted rope: diagonal strands (one every `period` px) each shaded as a rounded ridge, the whole rope shaded
    as a cylinder lit from above. With `glint`, one strand in four is worn through to the copper core (a darker,
    warmer strand) — periodic in x over 4 * period."""
    im = Img(w, h)
    X, Y = grid(w, h)
    u = np.clip((Y - h / 2) / (h / 2), -1, 1)
    cyl = hd.lambert(np.zeros_like(u), u, np.sqrt(np.clip(1 - u * u, 0, 1)), 0.22)
    q = X + (Y - h / 2) * lean
    p = (q % period) / period
    ridge = np.sin(np.pi * p)
    v = cyl * (0.45 + 0.55 * ridge) - dark
    v = np.where(p < 0.12, v * 0.45, v)
    v = np.clip(v, 0, 0.999)
    put_ramp(im, np.ones((h, w), bool), v, keys)
    if glint:
        worn = (np.floor(q / period) % 4 == 0) & (p >= 0.38) & (p <= 0.72) & (Y < h * 0.55)
        put_ramp(im, worn, v, ["k1h", "g0", "g0h", "c0h", "c1", "c1", "c1h", "c1h", "c2", "c2h"])
    return im


def cable_tile() -> Img:
    im = Img(32, 12)
    im.hline(0, 31, 0, "k0")
    im.hline(0, 31, 11, "k0")
    im.blit(braid(32, 10), 0, 1)
    return im


def cable_step(tile: Img, down=True) -> Img:
    """Same tile with a 2-px step at the middle (down: right half two rows lower)."""
    im = Img(32, 14)
    for x in range(32):
        dy = (2 if x >= 16 else 0) if down else (0 if x >= 16 else 2)
        im.blit(tile.crop(x, 0, 1, 12), x, dy)
    return im


def cable_thin() -> Img:
    """A distant carrier: 5-px braid, darker, no dark edge, a 1-px shadow row under it."""
    im = Img(32, 6)
    im.blit(braid(32, 5, period=6, lean=1.0, glint=False, keys=["k1", "k1h", "g0", "g0h", "g1", "g1h", "g2"]), 0, 0)
    im.hline(0, 31, 5, "k1")
    return im


def trolley_spark() -> list[Img]:
    """Sparks where a drive-trolley wheel grips the carrier (40x28, anchor = contact point 24,8). The car runs right,
    so the sparks spray back (left) and fall; a few are teal from the signal on the line."""
    rng = random.Random(4242)
    rays = [(math.pi * (0.55 + 0.055 * i) + rng.uniform(-0.05, 0.05), rng.uniform(0.75, 1.25)) for i in range(10)]
    frames = []
    cx, cy = 24, 8
    for f in range(4):
        im = Img(40, 28)
        if f == 0:
            radial(im, cx + 0.5, cy + 0.5, 4.2, GLOW["amber"][3:], power=0.85)
            im.put(cx, cy, "i4")
        elif f == 1:
            radial(im, cx + 0.5, cy + 0.5, 2.4, ["a1", "a2", "a3"], power=0.8)
        for k, (ang, spd) in enumerate(rays):
            if f == 3 and k % 2:
                continue
            r0 = [3.0, 7.0, 12.0, 17.0][f] * spd
            r1 = [9.0, 14.0, 18.0, 20.0][f] * spd
            gy = 0.9 * f * f

            def at(r, g):
                return cx + math.cos(ang) * r, cy + math.sin(ang) * r * 0.45 + r * 0.25 + g
            x0, y0 = at(r0, gy)
            x1, y1 = at(r1, gy * 1.5)
            teal = k % 4 == 1
            keys = ([["t2", "t3", "t4"], ["t1", "t2", "t3"], ["t0h", "t1", "t2"], ["t0", "t0h", "t1"]] if teal else
                    [["a1", "a2", "a3"], ["a0", "a1", "a2"], ["e1", "a0", "a1"], ["c1", "b1", "b2"]])[f]
            streak(im, x0, y0, x1, y1, keys)
        frames.append(im)
    return frames


# handshake pulses: 1, 2, 3 beads for HELLO / I HEAR YOU / I HEAR YOU HEAR ME
HANDSHAKE = {
    "handshake-hello": (GLOW["teal"], 1),
    "handshake-hear": (GLOW["amber"], 2),
    "handshake-hearhear": (GLOW["ivory"], 3),
}


def pulse_frames(keys, beads, n=6, W=64, H=14) -> list[Img]:
    """A packet of `beads` glowing beads riding the cable left -> right across a W-px segment (anchor 0,7 = the
    cable centre line at the segment start). Each bead: a hard-banded glow with a bright core and a short tail
    along the cable centre."""
    frames = []
    stepw = W / n
    cy = 7
    for f in range(n):
        im = Img(W, H)
        head = f * stepw + 8
        for b in range(beads):
            x = head - b * 10
            for t in range(1, 10):
                xx = int(x - t)
                if 0 <= xx < W:
                    k = keys[max(0, len(keys) - 3 - t)]
                    im.put(xx, cy, k)
                    if t < 4:
                        im.put(xx, cy - 1, keys[max(0, len(keys) - 5 - t)])
            if -4 <= x < W + 4:
                radial(im, x + 0.5, cy, 4.0, keys[1:], power=0.9, ry=3.4)
                if 0 <= int(x) < W:
                    im.put(int(x), cy, "i4" if keys is not GLOW["ivory"] else "a3")
        frames.append(im)
    return frames


def handshake_complete() -> list[Img]:
    """The switch takes the connection: a compact ivory-teal bloom on the switch contact, a short horizontal glint
    along the carrier and a thin ring of light that spreads and fades (67x67, anchor centre). No star cross."""
    frames = []
    S = 67
    c = S / 2
    X, Y = grid(S, S)
    d = np.hypot(X - c, Y - c)
    for f in range(5):
        im = Img(S, S)
        R = [6, 12, 18, 24, 28][f]
        ring = np.abs(d - R) <= 0.8
        if f >= 2:
            ang = np.arctan2(Y - c, X - c)
            ring &= (np.floor(ang * R / 2.0) % 2 == 0)
        im.a[ring] = idx(["t3h", "t3", "t2", "t1", "t0h"][f])
        core = [5.6, 4.4, 3.2, 2.0, 0][f]
        if core:
            radial(im, c, c, core + 2.0, GLOW["teal"][2:], power=0.85)
            im.put(int(c), int(c), "i4")
        L = [10, 16, 12, 6, 0][f]
        for dx in (1, -1):
            for k in range(3, L + 1):
                im.put(int(c) + dx * k, int(c), "t4" if k < L * 0.4 else "t3" if k < L * 0.75 else "t1h")
        frames.append(im)
    return frames


def switch_flash() -> list[Img]:
    """Relay switchgear arc: an amber arc jumping the gap of a knife switch between two brass contacts
    (34x50, anchor centre 17,25)."""
    frames = []
    for f in range(4):
        im = Img(34, 50)
        rng = random.Random(77 + f)
        cx = 17
        if f < 3:
            pts = [(cx, 4)]
            x = cx
            for y in range(5, 46):
                if rng.random() < 0.5:
                    x = max(cx - 5, min(cx + 5, x + rng.choice((-1, 1))))
                pts.append((x, y))
            hot = ["a3", "i4", "a3"][f]
            glow = ["a1h", "a2", "a1"][f]
            for (x, y) in pts:
                im.put(x - 1, y, glow).put(x + 1, y, glow)
            for (x, y) in pts:
                im.put(x, y, hot)
            if f == 1:
                arc(im, pts[20][0], 24, -0.6, 7, rng, "a2", tip="a3")
        else:
            for (y) in range(6, 44, 5):
                im.put(cx + ((y // 5) % 3) - 1, y, "a0")
        for yy, lit in ((2, True), (3, True), (46, False), (47, False)):
            im.hline(cx - 4, cx + 4, yy, ("b4" if yy in (2, 46) else "b2") if f < 3 else "b2")
            im.put(cx - 5, yy, "k0")
            im.put(cx + 5, yy, "k0")
        frames.append(im)
    return frames


def cable_cut() -> list[Img]:
    """Severed carrier end (the cut faces right): frayed strands of verdigris and copper, ember sparks spitting
    from the cut (36x28, anchor = cut end 22,12)."""
    tile = cable_tile()
    frames = []
    for f in range(4):
        rng = random.Random(911 + f)
        im = Img(36, 28)
        im.blit(tile.crop(0, 0, 20, 12), 0, 6)
        for k, (y, ln, col) in enumerate(((8, 3, "g2"), (9, 5, "c2"), (10, 2, "g1h"), (11, 4, "g3"), (12, 6, "c3"),
                                          (13, 3, "g2"), (14, 5, "c1h"), (15, 2, "g1"), (16, 4, "g2h"))):
            bend = (k % 3) - 1
            for i in range(ln):
                im.put(20 + i, y + (bend if i > ln // 2 else 0), col)
        im.put(20, 6, "k0")
        im.put(20, 17, "k0")
        radial(im, 23.5, 12.5, [3.2, 2.2, 3.0, 1.6][f], ["e1", "e2", "e3", "e4"], power=0.8)
        for k in range(6):
            ang = rng.uniform(-1.2, 1.3)
            r0 = rng.uniform(3.0, 6.0) + f
            r1 = r0 + rng.uniform(2.0, 4.0)
            g = f * 0.8
            if (k + f) % 3 != 0:
                streak(im, 23 + math.cos(ang) * r0, 12 + math.sin(ang) * r0 * 0.8 + g,
                       23 + math.cos(ang) * r1, 12 + math.sin(ang) * r1 * 0.8 + g * 1.5,
                       [["e2", "e3", "e4"], ["e1", "e2", "a2"], ["e1", "e2", "e3"], ["e0h", "e1", "e2"]][f])
        frames.append(im)
    return frames


def build_cable(at):
    at.group("cable")
    tile = cable_tile()
    at.add("cable-carrier", tile, 0, 6)
    at.add("cable-carrier-down", cable_step(tile, True), 0, 6)
    at.add("cable-carrier-up", cable_step(tile, False), 0, 8)
    at.add("cable-carrier-thin", cable_thin(), 0, 3)
    at.seq("trolley-spark", trolley_spark(), 24, 8, fps=16, loop=False)
    for name, (keys, beads) in HANDSHAKE.items():
        at.seq(name, pulse_frames(keys, beads), 0, 7, fps=12, loop=True)
    at.seq("handshake-complete", handshake_complete(), 33, 33, fps=12, loop=False)
    at.seq("switch-flash", switch_flash(), 17, 25, fps=14, loop=False)
    at.seq("cable-cut", cable_cut(), 22, 12, fps=10, loop=True)
    at.meta("cable", {
        "units": "atlas px at 2x density (fx.json scale 2): halve for layout units",
        "tile": "cable-carrier 32x12, anchor (0,6) = cable centre row; repeats every 32 px horizontally",
        "sag": "draw column by column in HD (backing) px: for each HD column X along the span blit column (X mod 32) "
               "of cable-carrier at HD y = 2*sag(X/2) - 6 (sag in layout units)",
        "steps": "cable-carrier-down/up: 32x14 tiles with a 2-px step at x=16, anchors (0,6)/(0,8), for coarse "
                 "tile-by-tile curves",
        "thin": "cable-carrier-thin 32x6, anchor (0,3), no dark edge, for background routes; same column method "
                "with y = 2*sag(X/2) - 3",
        "handshake": "handshake-hello|hear|hearhear: 64x14 pulses (1/2/3 beads) riding the cable, anchor (0,7) = "
                     "cable centre at the segment start; loop along the segment while that stage fills; "
                     "handshake-complete (67x67, anchor 33,33) when HOP is ready",
    })
