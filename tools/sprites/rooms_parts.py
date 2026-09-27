"""HD structure for the rooms atlas: floor/ceiling strips, bulkhead walls, hull edges, doors, airlocks, hatches,
ladders, the gangway coupler and the keel hatch/tube. All sizes in atlas px (2x density)."""
from __future__ import annotations

import math

import numpy as np

import hd
from px import Img, idx
from rooms_kit import (AMBER_GLOW, BRASS, BRASS_D, FLOOR, FLOOR_ROWS, GLASS, IRON, IVORY, RIVET, STEEL, T, TEAL_GLOW, bolt,
                       box, cyl_h, cyl_v, darken, disc_mask, lamp, put, rect_mask, rivet, shade_mask, shadow_below,
                       shadow_right, sphere_shade, torus_shade)
from rooms_walls import ceiling, floor_plate

DOOR_IVORY = ["k2", "k3", "k4", "i0~b1", "i0", "i0h", "i1"]
DOOR_EMBER = ["k1", "e0", "e0h", "e1", "e1h", "e2"]
DOOR_STEEL = ["k1", "k2", "k3", "k4", "k5", "k5~s0", "s0"]
PLEAT = ["k0", "k0h", "k1", "k1h", "k2", "k2h"]


# ── strips, bulkheads, hull edges ───────────────────────────────────────────────────────────────────────────
def floor_strip(grate=False) -> Img:
    im = Img(T, 8)
    floor_plate(im, 0, grate)
    return im


def ceiling_strip() -> Img:
    im = Img(T, 5)
    ceiling(im)
    return im


def wall_v() -> Img:
    """8x72 bulkhead between two rooms of a deck (anchor 4,0 on the wall line)."""
    im = Img(8, T)
    im.vline(0, 0, T - 1, "k0")
    im.vline(7, 0, T - 1, "k0")
    box(im, 1, 0, 6, T, IRON, bevel=2, flat=0.45)
    for y in (9, 27, 45):
        rivet(im, 2, y, RIVET)
    # floor plate passes through
    for j, c in enumerate(FLOOR_ROWS):
        im.hline(1, 6, FLOOR + j, c)
    im.hline(1, 6, 0, "k0h")
    return im


def hull_skin(w, h) -> Img:
    """Exterior skin band (enamel plates, brass trim), `h` rows, outer edge at row 0."""
    im = Img(w, h)
    im.hline(0, w - 1, 0, "k0")
    box(im, 0, 1, w, 5, DOOR_IVORY, bevel=1, flat=0.55)
    for x in range(0, w, 36):
        im.vline(x, 1, 5, "k3")
    for x in range(6, w, 18):
        bolt(im, x, 3, ["k2", "k3", "k4", "i0~b1", "i0"])
    im.hline(0, w - 1, 6, "b1")
    im.hline(0, w - 1, 7, "b0")
    box(im, 0, 8, w, h - 9, IRON[:6], bevel=1, flat=0.35)
    im.hline(0, w - 1, h - 1, "k0")
    return im


def hull_roof() -> Img:
    return hull_skin(T, 12)


def hull_belly() -> Img:
    return hull_skin(T, 12).flip_v()


def hull_end(left: bool) -> Img:
    im = hull_skin(T, 12).rot90(1)  # outer edge on the left
    return im if left else im.flip_h()


def hull_corner(which) -> Img:
    im = Img(12, 12)
    m = disc_mask(24, 24, 12, 12, 11.6)[:12, :12]
    ring_in = disc_mask(24, 24, 12, 12, 6.2)[:12, :12]
    mask = m & ~ring_in
    X, Y = hd.grid(12, 12)
    d = np.hypot(X - 12, Y - 12)
    ramp_cols = {0: "k0", 1: "i0h", 2: "i0", 3: "i0", 4: "i0~b1", 5: "k4", 6: "b1", 7: "b0", 8: "k2", 9: "k1",
                 10: "k1", 11: "k0"}
    for y in range(12):
        for x in range(12):
            if mask[y, x]:
                k = int(11.6 - d[y, x])
                im.put(x, y, ramp_cols.get(max(0, min(11, k)), "k1"))
    im.put(11, 11, "k0")
    return {"tl": im, "tr": im.flip_h(), "bl": im.flip_v(), "br": im.flip_h().flip_v()}[which]


# ── doors ───────────────────────────────────────────────────────────────────────────────────────────────────
def door(width, state, locked=False, airlock=False) -> Img:
    """Vertical door on the wall line: lintel housing, jambs, a slab split at mid-height whose halves retract into
    the lintel and the sill. state 0 closed .. 3 open. width 14 (door) / 18 (airlock)."""
    w = width
    im = Img(w, T)
    # jambs
    for x0, x1 in ((0, 1), (w - 2, w - 1)):
        box(im, x0, 0, 2, T, IRON[:7], bevel=0, flat=0.5 if x0 == 0 else 0.3)
    im.vline(0, 0, T - 1, "k0")
    im.vline(w - 1, 0, T - 1, "k0")
    # shaft behind the slab (dark)
    im.rect(2, 6, w - 4, FLOOR - 6, "k0h")
    for y in range(6, FLOOR, 4):
        im.hline(2, w - 3, y, "k0")
    # lintel housing rows 0..5 and sill rows 58..63
    box(im, 0, 0, w, 6, IRON[:7], bevel=1, flat=0.4)
    im.hline(0, w - 1, 5, "k0")
    for j, c in enumerate(FLOOR_ROWS):
        im.hline(0, w - 1, FLOOR + j, c)
    im.rect(2, FLOOR + 1, w - 4, 2, "k0")
    if locked:
        lamp(im, w / 2, 2.8, 1.2, ["e0", "e0h", "e1", "e1h", "e2", "e2h", "e3", "e3h"], IRON, lit=True)
    else:
        lamp(im, w / 2, 2.8, 1.2, TEAL_GLOW if not airlock else AMBER_GLOW, IRON, lit=True)
    face = DOOR_EMBER if locked else (DOOR_STEEL if airlock else DOOR_IVORY)
    half = (FLOOR - 6) // 2          # 29 rows per half
    retract = [0, 10, 20, 28][state]
    top_y0, bot_y1 = 6, FLOOR - 1

    def slab(y0, y1, src_off, leading_bottom):
        """Paint rows y0..y1 of a slab half whose content is offset by src_off (rows hidden in the housing)."""
        if y1 < y0:
            return
        m = rect_mask(im, 2, y0, w - 4, y1 - y0 + 1)
        shade_mask(im, m, face, bevel=1, flat=0.5, contrast=0.8)
        for y in range(y0, y1 + 1):
            sy = y - y0 + src_off         # row within the full half
            if sy % 10 == 9:
                im.hline(2, w - 3, y, face[1])
                im.hline(2, w - 3, min(y1, y + 1), face[-2]) if y + 1 <= y1 else None
        # hazard band at the leading edge
        edge_rows = range(y1 - 3, y1 + 1) if leading_bottom else range(y0, y0 + 4)
        for y in edge_rows:
            if y0 <= y <= y1:
                for x in range(2, w - 2):
                    c = "b0h" if ((x + y) // 2) % 2 == 0 else "k1"
                    put(im, x, y, c if not locked else "k1")
        if airlock and leading_bottom and src_off + (y1 - y0) >= 12:
            cy = y0 + 10 - src_off
            if y0 + 2 <= cy <= y1 - 3:
                port = disc_mask(im.w, im.h, w / 2, cy + 0.5, 3.2)
                glass = disc_mask(im.w, im.h, w / 2, cy + 0.5, 2.0)
                torus_shade(im, port & ~glass, w / 2, cy + 0.5, 2.6, STEEL)
                im.a[glass] = idx("t0")
                put(im, int(w / 2) - 1, cy - 1, "t1")
        if locked and not leading_bottom:
            by = y0 + 8 - 0
            if y0 <= by <= y1:
                box(im, 1, by, w - 2, 3, STEEL, bevel=1, flat=0.6)
        im.vline(2, y0, y1, "k1")

    # top half: its lower (leading) rows stay visible
    slab(top_y0, top_y0 + half - 1 - retract, retract, True)
    # bottom half
    slab(bot_y1 - half + 1 + retract, bot_y1, 0, False)
    return im


def door_set(width, airlock=False):
    return [door(width, s, False, airlock) for s in range(4)], door(width, 0, True, airlock)


# ── hatches, ladders ────────────────────────────────────────────────────────────────────────────────────────
def hatch(state, locked=False, w=44) -> Img:
    """44x10, anchor (22,0) on the upper room's floor line at the tile centre. Rows 0..7 = the floor plate with the
    sliding lid, rows 8..9 = the coaming collar seen under the deck (top of the lower room)."""
    im = Img(w, 10)
    for j, c in enumerate(FLOOR_ROWS):
        im.hline(0, w - 1, j, c)
    box(im, 0, 8, w, 2, IRON[:6], bevel=0, flat=0.35)
    im.hline(0, w - 1, 9, "k0")
    for x in (2, w - 4):
        bolt(im, x, 2, ["k1", "c0", "b0", "b0h", "b1", "b1h", "b2"])
    op0, op1 = 5, w - 6
    gap = [0, 9, 20, 34][state]
    im.rect(op0, 0, op1 - op0 + 1, 10, "k0")
    for y in range(1, 10):
        im.hline(op0 + 1, op1 - 1, y, "k0h" if y % 3 else "k0")
    lid = DOOR_EMBER if locked else ["k1", "c0", "b0", "b0h", "b1", "b1h"]
    half_w = (op1 - op0 + 1) // 2
    lw = half_w - gap // 2
    if lw > 0:
        for x0 in (op0, op1 - lw + 1):
            m = rect_mask(im, x0, 0, lw, 5)
            shade_mask(im, m, lid, bevel=1, flat=0.5)
        if state == 0:
            im.vline(op0 + half_w, 0, 4, "k0")
            for hx in (op0 + half_w - 5, op0 + half_w + 4):
                put(im, hx, 2, lid[-1])
                put(im, hx + 1, 2, lid[-2])
        if locked:
            box(im, op0 + 3, 1, op1 - op0 - 5, 2, STEEL, bevel=0, flat=0.6)
    im.vline(op0 - 1, 0, 9, "k0")
    im.vline(op1 + 1, 0, 9, "k0")
    return im


def ladder() -> Img:
    """30x72 ladder section (anchor 15,0), tiles vertically; rungs every 8 px."""
    im = Img(30, T)
    for x0 in (0, 25):
        cyl_v(im, x0 + 1, 0, T - 1, 4, BRASS_D)
        im.vline(x0, 0, T - 1, "k0")
        im.vline(x0 + 5, 0, T - 1, "k0")
    for y in range(2, T, 8):
        cyl_h(im, 6, 24, y, 3, BRASS_D, outline=False)
        im.hline(6, 24, y + 3, "k0")
    return im


def ladder_top() -> Img:
    """30x20 grab rails above the upper floor (anchor 15,20 on the upper room's floor line)."""
    im = Img(30, 20)
    for x0 in (0, 25):
        cyl_v(im, x0 + 1, 3, 19, 4, BRASS_D)
        im.vline(x0, 3, 19, "k0")
        im.vline(x0 + 5, 3, 19, "k0")
    cyl_h(im, 1, 28, 0, 4, BRASS_D)
    im.hline(0, 29, 0, "k0")
    im.put(0, 0, None).put(29, 0, None)
    return im


# ── gangway coupler, keel hatch, keel tube ──────────────────────────────────────────────────────────────────
def gangway(state, locked=False) -> Img:
    """36x72 bellows coupler between two cars (anchor 18,0), with a door slab in the middle."""
    W_ = 36
    im = Img(W_, T)
    for x in range(W_):
        ph = x % 4
        c = PLEAT[[2, 4, 5, 1][ph]]
        im.vline(x, 0, 8, c)
        im.vline(x, FLOOR - 2, FLOOR - 1, c)
        for y in range(9, FLOOR - 2):
            put(im, x, y, PLEAT[[0, 1, 2, 0][ph]])
    im.hline(0, W_ - 1, 0, "k0")
    im.hline(0, W_ - 1, 9, "k0")
    for j, c in enumerate(FLOOR_ROWS):
        im.hline(0, W_ - 1, FLOOR + j, c)
    for x0 in (0, W_ - 4):
        box(im, x0, 0, 4, T, IRON[:7], bevel=1, flat=0.45)
        for y in (7, 34, 58):
            bolt(im, x0 + 1, y, IRON[:6])
    im.vline(0, 0, T - 1, "k0")
    im.vline(W_ - 1, 0, T - 1, "k0")
    d = door(14, state, locked)
    im.blit(d, (W_ - 14) // 2, 0)
    return im


def keel_hatch(state, locked=False) -> Img:
    """54x18, anchor (27,0) on the lead car's lower-deck floor line: the hatch plus a heavy coupling collar."""
    im = Img(54, 18)
    box(im, 0, 8, 54, 9, IRON[:7], bevel=2, flat=0.4)
    im.hline(0, 53, 17, "k0")
    for x in range(3, 54, 8):
        rivet(im, x, 11, IRON[2:8])
    h = hatch(state, locked)
    im.blit(h, 5, 0)
    if state >= 2:
        im.rect(11, 10, 32, 8, "k0h")
        for y in (11, 13, 15, 17):
            im.hline(11, 42, y, "k0")
        im.vline(10, 8, 17, "k0")
        im.vline(43, 8, 17, "k0")
    return im


def keel_tube() -> Img:
    """44x18 ribbed sleeve around the ladder between the lead car's belly and the keel car (anchor 22,0), tiles
    vertically (18-px period); draw `ladder` on top."""
    im = Img(44, 18)
    im.rect(0, 0, 44, 18, "k0h")
    for x0 in (0, 39):
        box(im, x0, 0, 5, 18, IRON[:6], bevel=1, flat=0.4 if x0 == 0 else 0.25)
    for y in (0, 9):
        box(im, 0, y, 44, 3, IRON[:7], bevel=1, flat=0.45)
        im.hline(0, 43, y + 3, "k0")
    im.vline(0, 0, 17, "k0")
    im.vline(43, 0, 17, "k0")
    return im


def add(atlas):
    atlas.group("structure")
    atlas.add("floor-plate", floor_strip(), 0, 0)
    atlas.add("floor-plate-grate", floor_strip(True), 0, 0)
    atlas.add("ceiling-trim", ceiling_strip(), 0, 0)
    atlas.add("wall-v", wall_v(), 4, 0)
    atlas.add("hull-roof", hull_roof(), 0, 12)
    atlas.add("hull-belly", hull_belly(), 0, 0)
    atlas.add("hull-end-left", hull_end(True), 12, 0)
    atlas.add("hull-end-right", hull_end(False), 0, 0)
    for c, (ax, ay) in (("tl", (12, 12)), ("tr", (0, 12)), ("bl", (12, 0)), ("br", (0, 0))):
        atlas.add(f"hull-corner-{c}", hull_corner(c), ax, ay)
    atlas.group("doors")
    for base, width, air in (("door", 14, False), ("airlock", 18, True)):
        fr, lk = door_set(width, air)
        names = [atlas.add(f"{base}-{i}", im, width // 2, 0) for i, im in enumerate(fr)]
        atlas.add(f"{base}-closed", fr[0], width // 2, 0)
        atlas.add(f"{base}-open", fr[3], width // 2, 0)
        atlas.add(f"{base}-locked", lk, width // 2, 0)
        atlas.anim(f"{base}-opening", names, 16, False)
        atlas.anim(f"{base}-closing", names[::-1], 16, False)
    fr = [hatch(i) for i in range(4)]
    names = [atlas.add(f"hatch-{i}", im, 22, 0) for i, im in enumerate(fr)]
    atlas.add("hatch-closed", fr[0], 22, 0)
    atlas.add("hatch-open", fr[3], 22, 0)
    atlas.add("hatch-locked", hatch(0, True), 22, 0)
    atlas.anim("hatch-opening", names, 16, False)
    atlas.anim("hatch-closing", names[::-1], 16, False)
    atlas.add("ladder", ladder(), 15, 0)
    atlas.add("ladder-top", ladder_top(), 15, 20)
    atlas.group("couplers")
    for base, fn, ax in (("gangway", gangway, 18), ("keel-hatch", keel_hatch, 27)):
        fr = [fn(i) for i in range(4)]
        names = [atlas.add(f"{base}-{i}", im, ax, 0) for i, im in enumerate(fr)]
        atlas.add(f"{base}-closed", fr[0], ax, 0)
        atlas.add(f"{base}-open", fr[3], ax, 0)
        atlas.add(f"{base}-locked", fn(0, True), ax, 0)
        atlas.anim(f"{base}-opening", names, 16, False)
        atlas.anim(f"{base}-closing", names[::-1], 16, False)
    atlas.add("keel-tube", keel_tube(), 22, 0)
