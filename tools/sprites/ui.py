"""UI atlas (HD, contract v3): 9-slice panels and buttons, bars and segments, form widgets, cursors, livery swatches.

Authored at 2x density (Atlas scale 2): every rect, anchor, 9-slice inset, hotspot and extra key (textDy,
drawHeight, content) is in ATLAS pixels; the core draws the atlas at half size (1 atlas px = 1 physical px at 1080p).
Room visuals live in rooms.py.

Frame language (FAULTLINE in hi-bit pixels): k0 outline · a brass moulding drawn ring by ring from an 11-step HD
ramp (outer bead lit on its top/left slope, groove, fillet) · k0 separation · dark gap · chipped-ivory hairline ·
indigo fill with a very quiet brushed grain and a soft inner shadow. Light comes from the top-left.

Tiling rule: the framework TILES 9-slice edges and centres (src/core/gfx.ts nineSlice), so every inset equals the
number of concentric frame rings, every edge strip is constant along its length, corner ornaments stay inside the
corner cells, and the centre is exactly one grain tile.

Hard rule 8 (serious look): dark, desaturated fills; colour lives in thin lines, rims and small lit accents.
"""
from __future__ import annotations

import math

import numpy as np

from atlas import Atlas
from hd import bevel_normals, capsule, ellipse_mask, lambert, paint, poly_mask, sphere_normals
from px import Img, idx

# ── HD material ramps (dark -> light, 11 steps where it matters) ─────────────────────────────────────────────
R_BRASS = ["b0", "b0h", "b1", "b1h", "b2", "b2h", "b3", "b3h", "b4", "b4h", "b5"]
R_BRIGHT = ["b0h", "b1", "b1h", "b2", "b2h", "b3", "b3h", "b4", "b4h", "b5", "a3"]
R_DANGER = ["k0h", "k1", "k1h", "c0", "c0h", "e0", "e0h", "e1", "e1h", "e2", "e2h"]
R_GLASS = ["k1", "k1h", "k2", "v0", "v0h", "v1", "v1h", "v2", "v2h", "v3", "v3h"]
R_COPPER = ["k1", "c0", "c0h", "c1", "c1h", "c2", "c2h", "c3", "c3h", "c4", "c4~b3"]
R_EMBER = ["k1", "e0", "e0h", "c1", "c1h", "c2", "c2h", "c3", "c3h", "c4", "c4~b3"]
R_STEEL = ["k2", "k3", "k3h", "k4", "k4h", "k5", "k5~s0", "s0", "s0h", "s1", "s2"]
R_TEAL = ["k1", "g0", "t0", "t0h", "t1", "t1h", "t2", "t2h", "t3", "t3h", "t4"]


# ── primitives ────────────────────────────────────────────────────────────────────────────────────────────
def ring(img: Img, i: int, tl, br, x=0, y=0, w=None, h=None):
    """Concentric ring i of rect (x,y,w,h): top row + left column in `tl`, bottom row + right column in `br`.
    The top-right corner takes `tl`, the bottom-left corner takes `br` (a 45° mitre)."""
    w = img.w if w is None else w
    h = img.h if h is None else h
    x0, y0, x1, y1 = x + i, y + i, x + w - 1 - i, y + h - 1 - i
    if x1 < x0 or y1 < y0:
        return img
    if tl is not None:
        img.hline(x0, x1, y0, tl)
        img.vline(x0, y0, y1 - 1, tl)
    if br is not None:
        img.hline(x0, x1, y1, br)
        img.vline(x1, y0 + 1, y1, br)
    return img


def rings(img: Img, profile, x=0, y=0, w=None, h=None, start=0):
    for i, (tl, br) in enumerate(profile):
        ring(img, start + i, tl, br, x, y, w, h)
    return img


def cut_corners(img: Img, n=1, c="k0"):
    """Round the outer corners: clear the corner pixel (n=2: a 3-px stair) and close it diagonally with `c`."""
    w, h = img.w, img.h
    for (cx, cy, dx, dy) in ((0, 0, 1, 1), (w - 1, 0, -1, 1), (0, h - 1, 1, -1), (w - 1, h - 1, -1, -1)):
        img.put(cx, cy, None)
        if n >= 2:
            img.put(cx + dx, cy, None).put(cx, cy + dy, None)
            img.put(cx + 2 * dx, cy + dy, c).put(cx + dx, cy + 2 * dy, c)
        img.put(cx + dx, cy + dy, c)
    return img


def grain(base, dark, lite, size=32):
    """Very quiet brushed texture tile (seamless: no mark crosses the tile edge)."""
    t = Img(size, size, base)
    marks = [(3, 4, 4, dark), (17, 2, 3, lite), (24, 9, 5, dark), (9, 13, 3, dark), (27, 18, 2, lite),
             (4, 22, 5, dark), (15, 26, 3, dark), (21, 29, 4, lite), (12, 19, 2, lite)]
    if size < 32:
        marks = [(m[0] % size, m[1] % size, min(m[2], size - 1 - m[0] % size), m[3]) for m in marks[:4]]
    for x, y, n, c in marks:
        if x + n <= size:
            t.hline(x, x + n - 1, y, c)
    return t


def fill_tile(img: Img, tile: Img, x0, y0, x1, y1, ox, oy):
    """Fill rect [x0,x1)x[y0,y1) with `tile`, tile origin at (ox, oy)."""
    for y in range(y0, y1):
        for x in range(x0, x1):
            img.a[y, x] = tile.a[(y - oy) % tile.h, (x - ox) % tile.w]
    return img


def shade(img: Img, mask, ramp, width=2, ambient=0.16, bias=0.0, normals=None):
    """Bevel-shade a mask with the house light into `ramp` (dark->light)."""
    nx, ny, nz = normals if normals is not None else bevel_normals(mask, width)
    v = lambert(nx, ny, nz, ambient)
    paint(img, mask, v, ramp, bias=bias)
    return img


def outline_mask(img: Img, mask, c="k0"):
    """1-px 4-connected outline around `mask`, only on transparent pixels."""
    m = mask
    g = np.zeros_like(m)
    g[1:, :] |= m[:-1, :]
    g[:-1, :] |= m[1:, :]
    g[:, 1:] |= m[:, :-1]
    g[:, :-1] |= m[:, 1:]
    img.a[g & ~m & (img.a < 0)] = idx(c)
    return img


def gem(img: Img, cx, cy, r, ramp, bezel="k0"):
    """Round cabochon in a k0 bezel: dark body, lit up-left, one hot glint (ramp dark->light, 4+ keys)."""
    W, H = img.w, img.h
    m_bez = ellipse_mask(W, H, cx, cy, r + 1, r + 1)
    img.fill_mask(m_bez, bezel)
    m = ellipse_mask(W, H, cx, cy, r, r)
    nx, ny, nz = sphere_normals(W, H, cx, cy, r, r)
    v = lambert(nx, ny, nz, 0.1)
    paint(img, m, v, ramp)
    img.put(int(cx - r * 0.45), int(cy - r * 0.45), ramp[-1])
    return img


def diamond(img: Img, cx, cy, r, ramp):
    """Faceted diamond stud: k0 outline, lit upper-left facets (ramp dark->light, 5 keys)."""
    for y in range(-r - 1, r + 2):
        for x in range(-r - 1, r + 2):
            d = abs(x) + abs(y)
            if d == r + 1:
                img.put(cx + x, cy + y, "k0")
            elif d <= r:
                if x + y < -1:
                    c = ramp[4]
                elif x + y < 0:
                    c = ramp[3]
                elif x + y == 0:
                    c = ramp[2]
                elif x + y <= 1:
                    c = ramp[1]
                else:
                    c = ramp[0]
                img.put(cx + x, cy + y, c)
    return img


def rivet(img: Img, x, y, ramp=R_BRASS):
    """3x3 domed rivet: spec top-left, shade bottom-right."""
    img.put(x, y, ramp[8]).put(x + 1, y, ramp[6]).put(x + 2, y, ramp[4])
    img.put(x, y + 1, ramp[6]).put(x + 1, y + 1, ramp[5]).put(x + 2, y + 1, ramp[2])
    img.put(x, y + 2, ramp[4]).put(x + 1, y + 2, ramp[2]).put(x + 2, y + 2, ramp[1])
    return img


def mask_from(art: str, ch="#") -> np.ndarray:
    rows = [r for r in art.split("\n") if r.strip()]
    ind = min(len(r) - len(r.lstrip(" ")) for r in rows if r.strip())
    rows = [r[ind:] for r in rows]
    w = max(len(r) for r in rows)
    m = np.zeros((len(rows), w), dtype=bool)
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            m[y, x] = c in ch
    return m


# ── panels ────────────────────────────────────────────────────────────────────────────────────────────────
def moulding(R, hair, gap, fill, shadow):
    """16 rings (outside -> in) for a big panel from an 11-step ramp R."""
    return [
        ("k0", "k0"),            # outline
        (R[7], R[1]),            # outer lit edge
        (R[10], R[2]),           # spec on the bead's upper slope
        (R[8], R[3]),
        (R[6], R[5]),            # crest (faces the viewer)
        (R[4], R[7]),
        (R[2], R[8]),            # inner slope: dark on top, lit below
        ("k0", "k0"),            # groove
        (R[6], R[2]),            # fillet (small flat lip)
        (R[4], R[3]),
        ("k0", "k0"),            # separation
        (gap, gap),              # dark gap
        hair,                    # chipped-ivory hairline
        (gap, gap),
        (shadow, fill),          # soft inner shadow under the top/left hairline
        (fill, fill),
    ]


BIG = {
    #  name          ramp      hairline (tl, br)   gap    fill   shadow  grain dark / lite   gem ramp
    "panel":        (R_BRASS, ("i3", "i1h"), "k1", "k2", "k1h", ("k1h", "k2h"), ("c0", "c1", "a0", "a1", "a3")),
    "panel-bright": (R_BRIGHT, ("t3", "t1h"), "k1", "k3", "k2h", ("k2h", "k3h"), ("g0", "t0", "t1", "t2", "t4")),
    "panel-danger": (R_DANGER, ("e2h", "e0h"), "k0", "k1", "k0h", ("k0h", "k1h"), ("c0", "c1", "a0", "a1", "a3")),
    "panel-glass":  (R_GLASS, ("v3", "v1h"), "k1", "v0", "k2", ("k2", "v0h"), ("g0", "t0", "t1", "t2", "t4")),
    "panel-copper": (R_COPPER, ("g3", "g1h"), "k1", "k2", "k1h", ("k1h", "k2h"), ("g0", "g1", "g2", "g3", "g4")),
    "panel-ember":  (R_EMBER, ("e3", "e1"), "k0", "k1", "k0h", ("k0h", "k1h"), ("c0", "c1", "a0", "a1", "a3")),
}
BOSS = """
    ...............
    .##############
    .##############
    .##############
    .##############
    .##############
    .##############
    .##############
    .##############
    .##############
    .#############.
    .############..
    .###########...
    .##########....
    .#########.....
"""


def boss(img: Img, fx: bool, fy: bool, R, gem_ramp, size=15):
    """Corner boss: chamfered brass plate (bevel-shaded with the house light in every corner), gem in a bezel,
    two small rivets on the edges."""
    W, H = img.w, img.h
    cm = mask_from(BOSS)[:size, :size]
    if fx:
        cm = cm[:, ::-1]
    if fy:
        cm = cm[::-1, :]
    ox = W - size if fx else 0
    oy = H - size if fy else 0
    m = np.zeros((H, W), dtype=bool)
    m[oy:oy + size, ox:ox + size] = cm
    img.a[m] = -1
    shade(img, m, R[1:10], width=2, ambient=0.2)
    outline_mask(img, m, "k0")
    # engraved line one px inside the lit edges
    gx = 7 if not fx else W - 8
    gy = 7 if not fy else H - 8
    gem(img, gx + 0.5, gy + 0.5, 2.6, gem_ramp)
    return img


def framed(name):
    R, hair, gap, fill, shadow, (gd, gl), gem_ramp = BIG[name]
    S, I = 64, 16
    img = Img(S, S)
    fill_tile(img, grain(fill, gd, gl), I, I, S - I, S - I, I, I)
    rings(img, moulding(R, hair, gap, fill, shadow))
    for fx in (False, True):
        for fy in (False, True):
            boss(img, fx, fy, R, gem_ramp)
    cut_corners(img, 1)
    return img, I


def panels(atlas: Atlas):
    atlas.group("panels")
    for name in BIG:
        img, n = framed(name)
        atlas.slice9(name, img, n, n, n, n)

    # panel-hi: slim bright frame (inset 8). The framework pairs it with panel-dark (checkbox hover 14x14 layout,
    # focused text fields h=20 layout); the 6x6-layout teal checkbox mark lands exactly in its centre.
    S, I = 40, 8
    p = Img(S, S)
    fill_tile(p, grain("k3", "k2h", "k3h", 24), I, I, S - I, S - I, I, I)
    rings(p, [("k0", "k0"), ("b4h", "b1"), ("b3h", "b1h"), ("b2", "b2h"), ("k0", "k0"), ("t3", "t1h"),
              ("k2h", "k3"), ("k3", "k3")])
    p.put(1, 1, "a3").put(2, 1, "b5").put(1, 2, "b5")
    cut_corners(p, 1)
    atlas.slice9("panel-hi", p, I, I, I, I)

    # panel-dark: recessed well with a sunken brass lip (inset 6; keycaps at h=11 layout, checkboxes 14x14)
    S, I = 24, 6
    p = Img(S, S, "k1")
    rings(p, [("k0", "k0"), ("b0h", "b3"), ("b1", "b2h"), ("k0", "k1h"), ("k0h", "k1"), ("k1", "k1")])
    cut_corners(p, 1)
    atlas.slice9("panel-dark", p, I, I, I, I)

    # panel-flat: quiet sub-panel inside a panel (lists, stat blocks): brass hairline, faint inner lip
    S, I = 40, 4
    p = Img(S, S)
    fill_tile(p, grain("k2", "k1h", "k2h"), I, I, S - I, S - I, I, I)
    rings(p, [("b1h", "b0h"), ("k1", "k1"), ("k2h", "k1h"), ("k2", "k2")])
    atlas.slice9("panel-flat", p, I, I, I, I)

    # tooltip: compact brass rim, dark gap, deep fill; bright corner pins (inset 6)
    S, I = 20, 6
    p = Img(S, S, "k1")
    rings(p, [("k0", "k0"), ("b4", "b1"), ("b2h", "b1h"), ("k0", "k0"), ("k0h", "k1"), ("k1", "k1")])
    for (x, y) in ((2, 2), (S - 3, 2), (2, S - 3), (S - 3, S - 3)):
        p.put(x, y, "b5" if (x, y) == (2, 2) else "b3h")
    cut_corners(p, 1)
    atlas.slice9("tooltip", p, I, I, I, I)
    ta = Img.ascii("""
        kbbbbbbbbbbbbbbbk
        .kKKKKKKKKKKKKKk.
        ..kKKKKKKKKKKKk..
        ...kKKKKKKKKKk...
        ....kKKKKKKKk....
        .....kKKKKKk.....
        ......kKKKk......
        .......kKk.......
        ........k........
    """, {"k": "k0", "b": "b1h", "K": "k1"})
    atlas.add("tooltip-arrow-down", ta, 8, 8)
    atlas.add("tooltip-arrow-up", ta.flip_v().recolor({"b1h": "b4"}), 8, 0)

    dialog(atlas)
    plates(atlas)
    slots(atlas)


# ── dialog ──────────────────────────────────────────────────────────────────────────────────────────────────
def dialog(atlas: Atlas):
    """Event window (96x96, inset 32): brass moulding, ivory hairline, ornate corner brackets carrying an amber
    lamp jewel, scroll curls along both edges ending in a diamond, all inside the 32-px corner cells."""
    S, I = 96, 32
    img = Img(S, S)
    fill_tile(img, grain("k2", "k1h", "k2h"), I, I, S - I, S - I, I, I)
    prof = moulding(R_BRASS, ("i3", "i1h"), "k1", "k2", "k1h")[:11]           # outline .. separation
    prof += [("k1", "k1"), ("k1", "k1"), ("i3", "i1h"), ("k1", "k1"), ("k1h", "k2")]
    prof += [("k2", "k2")] * (I - len(prof))
    rings(img, prof)
    X, Y = np.meshgrid(np.arange(S) + 0.5, np.arange(S) + 0.5)
    for f_x in (False, True):
        for f_y in (False, True):
            fx = (lambda v: S - v) if f_x else (lambda v: v)        # mirror a coordinate (pixel-centre space)
            fy = (lambda v: S - v) if f_y else (lambda v: v)
            # leaf tails along both hairlines (tapered, cylinder-shaded), each ending in a diamond stud
            for (p0, p1) in (((17.5, 13.5), (25.0, 13.5)), ((13.5, 17.5), (13.5, 25.0))):
                q0 = (fx(p0[0]), fy(p0[1]))
                q1 = (fx(p1[0]), fy(p1[1]))
                m, t, sx, an = capsule(S, S, q0, q1, 2.2, 0.8)
                img.a[m] = -1
                nx, ny, nz = bevel_normals(m, 1)
                paint(img, m, lambert(nx, ny, nz, 0.22), R_BRASS[2:10])
                outline_mask(img, m)
            diamond(img, int(fx(27.5)), int(fy(13.5)), 2, ("b0h", "b1h", "b2h", "b3h", "b4h"))
            diamond(img, int(fx(13.5)), int(fy(27.5)), 2, ("b0h", "b1h", "b2h", "b3h", "b4h"))
            # turned medallion over the moulding corner: torus-shaded ring, k0 seat, amber lamp jewel
            cx, cy = fx(10.0), fy(10.0)
            r = np.hypot(X - cx, Y - cy) + 1e-6
            tor = (r <= 9.6) & (r >= 5.4)
            tn = (r - 7.5) / 2.1
            bx, by = (X - cx) / r * tn, (Y - cy) / r * tn
            bz = np.sqrt(np.clip(1 - tn ** 2, 0, 1))
            img.a[tor] = -1
            paint(img, tor, lambert(bx, by, bz, 0.16), R_BRASS[1:11])
            # a bead ring: every other pixel on the medallion's rim picks up a highlight / shade
            rim = (r <= 9.6) & (r > 8.7)
            ang = np.arctan2(Y - cy, X - cx)
            beads = rim & (np.floor((ang + math.pi) / (2 * math.pi) * 28) % 2 == 0)
            img.fill_mask(beads & ((X - cx) + (Y - cy) < 0), "b4h")
            img.fill_mask(beads & ((X - cx) + (Y - cy) >= 0), "b1")
            outline_mask(img, r <= 9.6)
            seat = r < 5.4
            img.fill_mask(seat, "k0")
            gem(img, cx, cy, 3.7, ("c0", "c0h", "c1", "a0", "a1", "a2", "a3"))
    atlas.slice9("dialog", img, I, I, I, I)

    # crest overlaid at the top edge centre (ax/ay = its centre on the frame line)
    W, H = 54, 24
    crest = Img(W, H)
    m = poly_mask(W, H, [(1, 12), (8, 9), (16, 9), (21, 4), (27, 2), (33, 4), (38, 9), (46, 9), (53, 12),
                         (46, 15), (38, 15), (33, 20), (27, 22), (21, 20), (16, 15), (8, 15)])
    shade(crest, m, R_BRASS[1:10], width=2, ambient=0.2)
    outline_mask(crest, m, "k0")
    # scroll grooves
    for x in list(range(5, 15)) + list(range(40, 50)):
        if m[12, x]:
            crest.put(x, 12, "b1")
    gem(crest, 27.5, 12.0, 4.4, ("c0", "c1", "a0", "a1", "a2", "a3"))
    atlas.add("dialog-crest", crest, 27, 12)


# ── plates, keycaps, slots ──────────────────────────────────────────────────────────────────────────────────
def plates(atlas: Atlas):
    # title-plate 64x40 (draw 40 atlas px tall = 20 layout): brass plate with notched, scrolled ends and a recessed
    # engraved field for ivory text. Insets l=r=20, t=10, b=12.
    W, H = 64, 40
    img = Img(W, H)
    m = poly_mask(W, H, [(9, 1), (W - 9, 1), (W - 1, 9), (W - 1, H - 11), (W - 9, H - 3), (9, H - 3),
                         (1, H - 11), (1, 9)])
    shade(img, m, R_BRASS[1:10], width=3, ambient=0.22)
    outline_mask(img, m, "k0")
    # the plate's drop shadow lip (2 rows under the plate)
    for x in range(10, W - 10):
        img.put(x, H - 2, "k1")
    field = np.zeros((H, W), dtype=bool)
    field[9:H - 11, 18:W - 18] = True
    img.a[field] = idx("k2")
    up = np.roll(field, 1, 0)
    left = np.roll(field, 1, 1)
    img.fill_mask(field & ~up, "k0")                       # top inner edge in shadow
    img.fill_mask(field & ~left & up, "k0")
    img.fill_mask(field & np.roll(field, 1, 0) & ~np.roll(field, 2, 0), "k1")
    img.fill_mask(field & ~np.roll(field, -1, 0), "b2h")   # bottom lip catches the light
    img.fill_mask(field & ~np.roll(field, -1, 1) & np.roll(field, -1, 0), "b1h")
    for side in (0, 1):
        f = (lambda v: v) if side == 0 else (lambda v: W - 1 - v)
        diamond(img, f(9), 14, 3, ("b0h", "b1h", "b2h", "b3h", "b4h"))
        img.put(f(9), 14, "a2")
        for y in range(8, 22):
            if img.get(f(15), y) >= 0:
                img.put(f(15), y, "b1")            # engraved rule beside the field
                img.put(f(16), y, "b3")
    atlas.slice9("title-plate", img, 20, 10, 20, 12, drawHeight=40)

    # nameplate-brass 40x28 (inset 10): solid tarnished-brass plate for engraved (dark) text
    W, H = 40, 28
    img = Img(W, H)
    m = np.zeros((H, W), dtype=bool)
    m[1:H - 1, 1:W - 1] = True
    img.fill_mask(m, "b2h")
    rings(img, [("k0", "k0"), ("b4", "b0h"), ("b3h", "b1"), ("b2", "b3"), ("b1h", "b3h"), ("b2h", "b2h")] +
          [("b2h", "b2h")] * 4)
    for (x, y) in ((4, 4), (W - 7, 4), (4, H - 7), (W - 7, H - 7)):
        rivet(img, x, y)
    cut_corners(img, 1)
    atlas.slice9("nameplate-brass", img, 10, 10, 10, 10)

    # keycaps 22x24 (insets 6,6,6,8): raised key on a brass-rimmed base, 3-px front lip; legend drawn by code
    for name, face, top, side, lip, rim in (
            ("keycap", "k4", "k5", "k3h", "k2", "s1"), ("keycap-pressed", "k3h", "k4", "k3", "k2", "s0"),
            ("keycap-lit", "g0", "g0h", "k2h", "k1h", "t2")):
        W, H = 22, 24
        img = Img(W, H)
        oy = 2 if name == "keycap-pressed" else 0
        img.rect(1, 1, W - 2, H - 2, lip)
        img.rect(1, 1 + oy, W - 2, H - 6, face)
        img.hline(1, W - 2, 1 + oy, rim)
        img.vline(1, 1 + oy, H - 6 + oy, top)
        img.hline(2, W - 3, 2 + oy, top)
        img.hline(2, W - 2, H - 6 + oy, side)
        img.vline(W - 2, 2 + oy, H - 6 + oy, side)
        img.hline(1, W - 2, H - 3, "b1")
        img.hline(1, W - 2, H - 2, "k1")
        for y in range(1, 1 + oy):
            img.hline(1, W - 2, y, "k1")
        rings(img, [("k0", "k0")])
        cut_corners(img, 1)
        atlas.slice9(name, img, 6, 6, 6, 8)


def slots(atlas: Atlas):
    """Equipment slots (weapon/drone/augment/cargo boxes) 28x28, inset 8: recessed well, sunken lip, L-corner ticks."""
    for name, lip_tl, lip_br, corner, well, line in (
            ("slot", "b0h", "b3", "b4", "k1", "k2h"), ("slot-hi", "t0", "t2h", "t3", "k2", "t0"),
            ("slot-ready", "c1", "a0", "a2", "k2", "c2"), ("slot-empty", "k3h", "s0", "s1", "k1", "k2")):
        S, I = 28, 8
        img = Img(S, S, well)
        rings(img, [("k0", "k0"), (lip_tl, lip_br), (lip_tl, lip_br), ("k0", "k0"), ("k0h", line),
                    (well, well), (well, well), (well, well)])
        for (x, y, dx, dy) in ((2, 2, 1, 1), (S - 3, 2, -1, 1), (2, S - 3, 1, -1), (S - 3, S - 3, -1, -1)):
            for k in range(5):
                img.put(x + dx * k, y, corner).put(x, y + dy * k, corner)
        cut_corners(img, 1)
        atlas.slice9(name, img, I, I, I, I)


# ── buttons, tabs ─────────────────────────────────────────────────────────────────────────────────────────
# (face ramp lo2 lo1 face hi1 hi2, hi line, rim tl, rim br, lip hi/mid/dk, spec)
BUTTONS = {
    "button-normal":         (("k2", "k2h", "k3", "k3h", "k4"), "k4h", "b3", "b1", ("b1", "b0h", "b0"), "b4h"),
    "button-hover":          (("k3", "k3h", "k4", "k4h", "k5"), "k5~s0", "b4h", "b2", ("b1h", "b1", "b0h"), "b5"),
    "button-pressed":        (("k2", "k2h", "k3", "k3h", "k3h"), "k4", "b2", "b1", ("b1", "b0h", "b0"), "b3"),
    "button-disabled":       (("k1h", "k2", "k2", "k2h", "k2h"), "k3", "k4h", "k3", ("k2h", "k2", "k1h"), "s0"),
    "button-blue":           (("k1h", "k2", "g0", "g0h", "g0h"), "t0", "t1", "k3", ("k3", "k2h", "k2"), "t3"),
    "button-blue-hover":     (("k2", "g0", "g0h", "g1", "g1"), "t0h", "t2", "t0", ("k3h", "k3", "k2h"), "t3h"),
    "button-blue-pressed":   (("k1h", "k2", "k2h", "g0", "g0"), "g0h", "t0", "k3", ("k3", "k2h", "k2"), "t1"),
    "button-danger":         (("k1", "k1h", "c0", "c0h", "c0h"), "e0", "e1", "k2", ("k2h", "k2", "k1h"), "e3"),
    "button-danger-hover":   (("k1h", "c0", "c0h", "e0", "e0"), "e0h", "e2", "e0", ("k2h", "k2", "k1h"), "e3h"),
    "button-danger-pressed": (("k1", "k1", "k1h", "c0", "c0"), "c0h", "e0", "k2", ("k2h", "k2", "k1h"), "e1"),
    "button-brass":          (("b1", "b1h", "b2", "b2h", "b3"), "b3h", "b4", "b0h", ("b0h", "b0", "c0"), "b5"),
    "button-brass-hover":    (("b1h", "b2", "b2h", "b3", "b3h"), "b4", "b4h", "b1", ("b1", "b0h", "b0"), "a3"),
    "button-brass-pressed":  (("b1", "b1h", "b2", "b2", "b2h"), "b3", "b3", "b0h", ("b0h", "b0", "c0"), "b4"),
}


def button(spec, pressed=False, W=48, H=48):
    """48-px bevelled key (insets l=r=6, t=6, b=10; pressed t=8, b=9 with the face 2 px lower).
    Every edge strip is constant along its length and the centre is flat, so the framework tiles it cleanly."""
    (lo2, lo1, face, hi1, hi2), hi, rtl, rbr, (lp_hi, lp, lp_dk), sp = spec
    img = Img(W, H, face)
    oy = 2 if pressed else 0
    lip_top = H - 7 + (2 if pressed else 0) - 0
    # face shading
    img.hline(1, W - 2, 2 + oy, hi)
    img.hline(1, W - 2, 3 + oy, hi2)
    img.hline(1, W - 2, 4 + oy, hi1)
    img.vline(2, 2 + oy, H - 10, hi)
    img.vline(3, 3 + oy, H - 10, hi1)
    img.vline(W - 3, 3 + oy, H - 9, lo2)
    img.vline(W - 4, 4 + oy, H - 10, lo1)
    img.hline(3, W - 4, H - 10 + (1 if pressed else 0), lo1)
    img.hline(2, W - 3, H - 9 + (1 if pressed else 0), lo2)
    if pressed:
        img.hline(1, W - 2, 1, rbr)
        img.hline(1, W - 2, 2, "k1")
        img.hline(1, W - 2, 3, "k1h")
        img.vline(1, 1, H - 7, rbr)
        img.vline(2, 2, 3, "k1")
    else:
        img.hline(1, W - 2, 1, rtl)
        img.vline(1, 1, H - 9, rtl)
        img.put(2, 2, sp)
    img.vline(W - 2, 2, H - 8 + (1 if pressed else 0), rbr)
    img.hline(1, W - 2, H - 8 + (1 if pressed else 0), rbr)
    # lip (the key's step) and the contact shadow
    rows = ([lp_hi, lp, lp, lp_dk] if not pressed else [lp_hi, lp_dk])
    y = H - 7 + (1 if pressed else 0)
    for c in rows:
        img.hline(1, W - 2, y, c)
        y += 1
    while y < H - 1:
        img.hline(1, W - 2, y, "k1")
        y += 1
    ring(img, 0, "k0", "k0")
    cut_corners(img, 2)
    return img


def buttons(atlas: Atlas):
    atlas.group("buttons")
    for name, spec in BUTTONS.items():
        pressed = name.endswith("pressed")
        img = button(spec, pressed)
        t, b = (8, 9) if pressed else (6, 10)
        atlas.slice9(name, img, 6, t, 6, b, textDy=2 if pressed else 0)
    # square icon button 48x48 for a 40x40 icon (same bevel)
    for suffix, key in (("", "button-normal"), ("-hover", "button-hover"), ("-pressed", "button-pressed"),
                        ("-on", "button-blue-hover")):
        p = suffix == "-pressed"
        img = button(BUTTONS[key], p)
        atlas.slice9("iconbutton" + suffix, img, 6, 8 if p else 6, 6, 9 if p else 10, textDy=2 if p else 0)

    # tabs (sit on a panel's top edge): tab-on is open at the bottom and merges into the panel fill (k2)
    W, H = 40, 32
    for name, prof, line, fill in (
            ("tab-on", [("k0", "k0"), ("b4", "b0h"), ("b3h", "b1"), ("b2h", "b1h"), ("b1", "b2"), ("k0", "k0"),
                        ("k1h", "k2")], "t2h", "k2"),
            ("tab-off", [("k0", "k0"), ("b3", "b0h"), ("b2h", "b1"), ("b1h", "b1h"), ("k0", "k0"), ("k0h", "k1")],
             None, "k1"),
            ("tab-hover", [("k0", "k0"), ("b4h", "b1"), ("b3h", "b1h"), ("b2", "b2"), ("k0", "k0"), ("k1h", "k2")],
             "b3h", "k2")):
        on = name == "tab-on"
        img = Img(W, H)
        y0 = 0 if on else 4
        hh = (H + 12) if on else (H - y0)
        img.rect(0, y0, W, H - y0, fill)
        rings(img, prof, 0, y0, W, hh)
        if line:
            img.hline(len(prof), W - 1 - len(prof), y0 + len(prof), line)
        # rounded top corners
        for (cx, dx) in ((0, 1), (W - 1, -1)):
            img.put(cx, y0, None).put(cx + dx, y0, None).put(cx, y0 + 1, None)
            img.put(cx + dx, y0 + 1, "k0").put(cx + 2 * dx, y0 + 1, prof[1][0]).put(cx + dx, y0 + 2, prof[1][0])
        if on:
            atlas.slice9(name, img, 8, 10, 8, 4)
        else:
            atlas.slice9(name, img, 8, 12, 8, 8)


# ── bars and segments ─────────────────────────────────────────────────────────────────────────────────────
def bars(atlas: Atlas):
    atlas.group("bars")
    # bar-frame 20x20, inset 6; fills go `content` = 6 atlas px inside
    img = Img(20, 20, "k1")
    rings(img, [("k0", "k0"), ("b4", "b1"), ("b3", "b1h"), ("k0", "k0"), ("k0h", "k1"), ("k1", "k1")])
    img.put(1, 1, "b5")
    cut_corners(img, 1)
    atlas.slice9("bar-frame", img, 6, 6, 6, 6, content=6)
    img2 = img.recolor({"b4": "s1", "b5": "s2", "b3": "s0h", "b1": "k4", "b1h": "k4h"})
    atlas.slice9("bar-frame-dim", img2, 6, 6, 6, 6, content=6)

    # charge fills 8x12 (h: 6 layout) — muted body, light on the top rows and on the leading-edge cap
    fills = {  # cap, top hi, top, main, lower, bottom
        "teal": ("t3", "t2h", "t2", "t1", "t0h", "g0"),
        "amber": ("a2", "a1", "a0h", "a0", "c2h", "c1"),
        "violet": ("v4", "v3h", "v3", "v2", "v1h", "v0h"),
        "ember": ("e3", "e2h", "e2", "e1", "e0h", "c0"),
        "verdigris": ("g4", "g3h", "g3", "g2", "g1h", "g0h"),
    }
    for n, (cap, th, tp, mn, lw, bt) in fills.items():
        rows = [th, tp, mn, mn, mn, mn, mn, mn, lw, lw, bt, bt]
        img = Img(8, 12)
        for y, c in enumerate(rows):
            img.hline(0, 7, y, c)
        atlas.slice9(f"charge-fill-{n}", img, 2, 2, 2, 4)
        atlas.slice9(f"charge-fill-{n}-v", Img.of(img.a.T.copy()), 2, 2, 4, 2)
        c = Img(2, 12)
        for y, k in enumerate([cap, cap, cap, th, th, tp, tp, tp, mn, mn, lw, bt]):
            c.hline(0, 1, y, k)
        atlas.add(f"charge-cap-{n}", c, 0, 0)

    # power segments 24x8 (12x4 layout), stacked with a 2-px gap; reactor 32x8; weapon pips 8x14
    P = {  # edge, lit, lit2, body, dark
        "on": ("t0", "t2h", "t1h", "t1", "t0h"),
        "off": ("s1", "k1", "k1", "k1", "k1"),
        "damaged": ("e0", "e2", "e1h", "e1", "e0h"),
        "ionised": ("v0", "v3", "v2", "v1h", "v1"),
        "slot": ("k4", "k2", "k2", "k2", "k2"),
        "reserve": ("g0", "g3", "g2", "g1h", "g1"),
    }

    def seg(w, h, st, vertical=False):
        edge, lit, lit2, body, dark = P[st]
        img = Img(w, h, body)
        if vertical:
            img.vline(1, 1, h - 2, lit).vline(2, 1, h - 2, lit2).vline(w - 2, 1, h - 2, dark)
        else:
            img.hline(1, w - 2, 1, lit).hline(1, w - 2, 2, lit2).hline(1, w - 2, h - 2, dark)
        if st == "off":
            img = Img(w, h, "k1")
            rings(img, [("s1", "s0"), ("k0", "k0")])
            return img
        ring(img, 0, edge, edge)
        return img

    for st in P:
        atlas.add(f"power-{st}", seg(24, 8, st), 0, 0)
    for st in P:
        atlas.add(f"reactor-{st}", seg(32, 8, st), 0, 0)
    for st in P:
        atlas.add(f"pip-power-{st}", seg(8, 14, st, vertical=True), 0, 0)

    # hull plating segments 8x20 (4x10 layout) at an 8-px pitch: left column + top/bottom rows are the seam
    H = {  # hi, hi2, mid, lo, lo2, deep
        "full": ("g2h", "g2", "g1h", "g1", "g0h", "g0"),
        "amber": ("a0h", "a0", "c3", "c2h", "c2", "c1"),
        "red": ("e2", "e1h", "e1", "e0h", "e0", "c0"),
        "empty": ("k3", "k2h", "k2", "k1h", "k1h", "k1"),
    }
    for st, (hi, hi2, mid, lo, lo2, deep) in H.items():
        img = Img(8, 20, mid)
        img.vline(0, 0, 19, "k0").hline(0, 7, 0, "k0").hline(0, 7, 19, "k0")
        img.vline(1, 1, 18, hi).vline(2, 2, 17, hi2)
        img.vline(6, 2, 18, lo).vline(7, 1, 18, lo2)
        img.hline(1, 7, 1, hi).hline(2, 6, 17, lo).hline(1, 7, 18, deep)
        if st != "empty":
            img.put(3, 8, hi).put(4, 8, hi2).put(3, 9, hi2).put(4, 9, lo)   # a pressed rivet in the plate
            img.put(3, 12, hi2).put(4, 12, mid).put(3, 13, mid).put(4, 13, lo2)
        atlas.add(f"hull-{st}", img, 0, 0)

    # shield layer pips 16x16 (round, stacked horizontally)
    for st, glass, core in (("on", ["k2", "g0", "g0h"], [("t0h", 3.2), ("t1h", 2.0), ("t3", 0.9)]),
                            ("charging", ["k1h", "k2", "g0"], [("t0", 2.2), ("t0h", 1.0)]),
                            ("ionised", ["k2", "v0", "v0h"], [("v1h", 3.2), ("v2h", 2.0), ("v4", 0.9)])):
        img = Img(16, 16)
        img.disc(8.0, 8.0, 6.4, "b1")                     # thin brass collar
        for (x, y) in ((4, 3), (3, 4), (5, 2), (2, 5)):
            img.put(x, y, "b3")
        img.disc(8.0, 8.0, 5.2, "k0")
        gm = ellipse_mask(16, 16, 8.0, 8.0, 4.4, 4.4)
        nx, ny, nz = sphere_normals(16, 16, 8.0, 8.0, 4.4, 4.4)
        paint(img, gm, lambert(nx, ny, nz, 0.1), glass)
        glow_core(img, 7.2, 7.2, core)
        img.outline("k0")
        atlas.add(f"shield-pip-{st}", img, 8, 8)
    img = Img(16, 16)
    img.disc(8.0, 8.0, 6.4, "s0")
    img.disc(8.0, 8.0, 5.2, "k0")
    img.disc(8.0, 8.0, 4.2, "k1")
    for (x, y) in ((4, 4), (5, 3), (3, 5)):
        img.put(x, y, "s1")
    img.outline("k0")
    atlas.add("shield-pip-off", img, 8, 8)


# ── form widgets ──────────────────────────────────────────────────────────────────────────────────────────
def widgets(atlas: Atlas):
    atlas.group("widgets")
    # slider track 24x14 (draw 14 tall): recessed groove between brass end caps
    tr = Img(24, 14)
    tr.rect(1, 3, 22, 8, "k0")
    tr.hline(3, 20, 4, "k0h").hline(3, 20, 5, "k1").hline(3, 20, 6, "k1h").hline(3, 20, 7, "k1h")
    tr.hline(3, 20, 8, "k2").hline(3, 20, 9, "k3")
    for x0 in (0, 19):
        m = np.zeros((14, 24), dtype=bool)
        m[2:12, x0:x0 + 5] = True
        tr.a[m] = -1
        shade(tr, m, R_BRASS[1:10], width=1, ambient=0.2)
        outline_mask(tr, m)
    tr.outline("k0")
    atlas.slice9("slider-track", tr, 6, 4, 6, 4, drawHeight=14)
    fl = Img(12, 14)
    fl.hline(0, 11, 5, "t2").hline(0, 11, 6, "t1h").hline(0, 11, 7, "t1").hline(0, 11, 8, "t0h")
    atlas.slice9("slider-fill", fl, 2, 4, 2, 4, drawHeight=14)
    # knobs 18x24 (anchor 9,12): brass lever with a groove; hover lights a teal core
    for name, R, core in (("slider-knob", R_BRASS, None), ("slider-knob-hover", R_BRIGHT, "t2"),
                          ("slider-knob-pressed", R_BRASS, "t1h")):
        k = Img(18, 24)
        m = poly_mask(18, 24, [(3, 1), (15, 1), (17, 3), (17, 15), (9, 23), (1, 15), (1, 3)])
        shade(k, m, R[1:10], width=2, ambient=0.2)
        outline_mask(k, m)
        k.vline(8, 4, 13, "b0h" if R is R_BRASS else "b1")
        k.vline(9, 4, 13, "b3" if R is R_BRASS else "b4")
        if core:
            k.vline(8, 5, 12, "g0").vline(9, 5, 12, core)
        k.put(3, 2, R[10])
        atlas.add(name, k, 9, 12)

    # scroll track / thumb (vertical, 12 wide)
    st = Img(12, 24, "k1")
    rings(st, [("k0", "k0"), ("k0", "k3"), ("k0h", "k2"), ("k1", "k1")])
    atlas.slice9("scroll-track", st, 4, 4, 4, 4)
    for name, R in (("scroll-thumb", R_BRASS), ("scroll-thumb-hover", R_BRIGHT)):
        th = Img(12, 24)
        m = np.zeros((24, 12), dtype=bool)
        m[1:23, 1:11] = True
        for (x, y) in ((1, 1), (10, 1), (1, 22), (10, 22)):
            m[y, x] = False
        shade(th, m, R[1:10], width=2, ambient=0.2)
        outline_mask(th, m)
        atlas.slice9(name, th, 4, 6, 4, 6)
    grip = Img(8, 10)
    for y in (1, 4, 7):
        grip.hline(1, 6, y, "b0h").hline(1, 6, y + 1, "b4")
    atlas.add("scroll-grip", grip, 4, 5)

    # checkboxes 22x22 (anchor 11,11): brass rim, recessed well, teal tick when on
    def box(rim_tl, rim_br, well="k1"):
        b = Img(22, 22, well)
        rings(b, [("k0", "k0"), (rim_tl, rim_br), (rim_tl, rim_br), ("k0", "k0"), ("k0h", "k2"), (well, well)])
        b.put(1, 1, "b5" if rim_tl == "b4" else "b4")
        cut_corners(b, 1)
        return b
    tick = Img.ascii("""
        ..........Tt
        .........Tt.
        ........Tt..
        Tt.....Tt...
        .Tt...Tt....
        ..Tt.Tt.....
        ...TTt......
        ....t.......
    """, {"T": "t2h", "t": "t0h"})
    atlas.add("checkbox-off", box("b3", "b1"), 11, 11)
    atlas.add("checkbox-hover", box("b4", "b2", "k2"), 11, 11)
    on = box("b3", "b1", "k1")
    on.blit(tick, 5, 7)
    atlas.add("checkbox-on", on, 11, 11)
    onh = box("b4", "b2", "k2")
    onh.blit(tick.recolor({"t2h": "t3", "t0h": "t1"}), 5, 7)
    atlas.add("checkbox-on-hover", onh, 11, 11)

    # radio 22x22: turned brass ring, dark well, small amber lamp core when on
    def radio(lit):
        r = Img(22, 22)
        m = ellipse_mask(22, 22, 11, 11, 9.6, 9.6)
        hole = ellipse_mask(22, 22, 11, 11, 6.2, 6.2)
        nx, ny, nz = sphere_normals(22, 22, 11, 11, 9.6, 9.6)
        v = lambert(nx, ny, nz + 0.4, 0.2)
        paint(r, m & ~hole, v, R_BRASS[1:10])
        r.fill_mask(hole, "k0")
        r.fill_mask(ellipse_mask(22, 22, 11, 11, 5.2, 5.2), "k1")
        if lit:
            glow_core(r, 10.0, 10.0, [("c1", 4.2), ("c2", 3.0), ("a0", 2.0), ("a1", 1.2)])
            r.put(9, 9, "a3")
        r.outline("k0")
        return r
    atlas.add("radio-off", radio(False), 11, 11)
    atlas.add("radio-on", radio(True), 11, 11)

    # dividers: brass rule (3 px) with pointed ends and a centre ornament; tile `divider-mid`
    mid = Img(8, 10)
    mid.hline(0, 7, 3, "k0").hline(0, 7, 4, "b3h").hline(0, 7, 5, "b2").hline(0, 7, 6, "b1").hline(0, 7, 7, "k0")
    atlas.add("divider-mid", mid, 0, 5)
    left = Img.ascii("""
        ..........
        ..........
        ..........
        ......oooo
        ...ooo3333
        oooB222222
        ...ooo1111
        ......oooo
        ..........
        ..........
    """, {"o": "k0", "3": "b3h", "2": "b2", "1": "b1", "B": "b4"})
    atlas.add("divider-left", left, 0, 5)
    atlas.add("divider-right", left.flip_h(), 9, 5)
    orn = Img(30, 14)
    for x in range(30):
        orn.put(x, 5, "k0").put(x, 6, "b3h").put(x, 7, "b2").put(x, 8, "b1").put(x, 9, "k0")
    diamond(orn, 15, 7, 5, ("b0h", "b1h", "b2h", "b3h", "b4h"))
    gem(orn, 15.5, 7.5, 1.6, ("g0", "t0", "t1", "t2", "t3"))
    for x in (6, 23):
        orn.put(x, 6, "b5").put(x + 1, 6, "b4")
    atlas.add("divider-ornament", orn, 15, 7)
    d = Img(128, 14)
    d.blit(left, 0, 2)
    for x in range(10, 118, 8):
        d.blit(mid, x, 2)
    d.blit(left.flip_h(), 118, 2)
    d.blit(orn, 49, 0)
    atlas.add("divider", d, 64, 7)

    # badges (counters) 18x18 and pills 20x18 (inset 6): muted enamel with a lit top-left edge
    for n, ramp in (("badge", ["c0", "c0h", "e0", "e0h", "e1", "e1h"]),
                    ("badge-teal", ["k2", "g0", "g0h", "t0", "t0h", "t1"]),
                    ("badge-amber", ["c0", "c1", "c1h", "c2", "c2h", "a0"])):
        b = Img(18, 18)
        m = ellipse_mask(18, 18, 9.0, 9.0, 7.6, 7.6)
        nx, ny, nz = bevel_normals(m, 1)
        paint(b, m, lambert(nx, ny, nz * 1.6, 0.2), ramp[1:])      # flat enamel face, lit rim top-left
        b.outline("k0")
        atlas.add(n, b, 9, 9)
        p = Img(20, 18, ramp[3])
        rings(p, [("k0", "k0"), (ramp[5], ramp[1]), (ramp[4], ramp[2]), (ramp[3], ramp[3]), (ramp[3], ramp[3]),
                  (ramp[3], ramp[3])])
        cut_corners(p, 2)
        atlas.slice9(n + "-pill", p, 6, 6, 6, 6)

    # indicator lamps 14x14 (anchor 7,7): dark glass in a thin bezel, a small lit core when on
    def lamp(glass, core):
        l = Img(14, 14)
        l.disc(7.0, 7.0, 6.0, "b1")
        for (x, y) in ((3, 2), (2, 3), (4, 2), (2, 4)):
            l.put(x, y, "b3")
        l.disc(7.0, 7.0, 4.6, "k0")
        gm = ellipse_mask(14, 14, 7.0, 7.0, 3.9, 3.9)
        nx, ny, nz = sphere_normals(14, 14, 7.0, 7.0, 3.9, 3.9)
        paint(l, gm, lambert(nx, ny, nz, 0.1), glass)
        if core:
            glow_core(l, 6.2, 6.2, core)
        l.outline("k0")
        return l
    atlas.add("lamp-on", lamp(["c0", "c0h", "c1"], [("a0", 2.2), ("a1", 1.4), ("a3", 0.6)]), 7, 7)
    atlas.add("lamp-teal-on", lamp(["k2", "g0", "g0h"], [("t1", 2.2), ("t2", 1.4), ("t4", 0.6)]), 7, 7)
    atlas.add("lamp-red-on", lamp(["k1", "c0", "c0h"], [("e1", 2.2), ("e2", 1.4), ("e4", 0.6)]), 7, 7)
    atlas.add("lamp-violet-on", lamp(["k2", "v0", "v0h"], [("v1h", 2.2), ("v3", 1.4), ("v4", 0.6)]), 7, 7)
    atlas.add("lamp-off", lamp(["k1", "k1h", "k2h"], None), 7, 7)

    # outline boxes (hollow) 24x24, inset 8: drag-select (teal), hover (brass), target (ember)
    for name, (line, corner, tip) in (("selection-box", ("t0h", "t2", "t3")), ("hover-box", ("b1", "b3h", "b4h")),
                                      ("target-box", ("e0h", "e2", "e3"))):
        s = Img(24, 24)
        s.box(0, 0, 24, 24, line)
        for (x, y, dx, dy) in ((0, 0, 1, 1), (23, 0, -1, 1), (0, 23, 1, -1), (23, 23, -1, -1)):
            for k in range(7):
                s.put(x + dx * k, y, corner).put(x, y + dy * k, corner)
                if k < 5:
                    s.put(x + dx * k, y + dy, "k0").put(x + dx, y + dy * k, "k0")
            s.put(x, y, tip)
        atlas.slice9(name, s, 8, 8, 8, 8)


def glow_core(img: Img, cx, cy, layers):
    """Concentric hard-edged glow discs, [(key, radius), ...] from the outside in."""
    for key, r in layers:
        img.fill_mask(ellipse_mask(img.w, img.h, cx + 0.5, cy + 0.5, r, r), key)
    return img


# ── cursors (hotspot = ax, ay in atlas px) ────────────────────────────────────────────────────────────────
R_IVORY = ["i0", "i0h", "i1", "i1h", "i2", "i2h", "i3", "i3h", "i4"]


def _edges(m):
    up = np.roll(m, 1, 0)
    dn = np.roll(m, -1, 0)
    lf = np.roll(m, 1, 1)
    rt = np.roll(m, -1, 1)
    return up, dn, lf, rt


def arrow_cursor() -> Img:
    W, H = 22, 32
    img = Img(W, H)
    m = poly_mask(W, H, [(1, 1), (1, 25.5), (6.8, 20.2), (10.8, 29.2), (14.6, 27.6), (10.8, 18.8), (18.6, 18.6)])
    img.fill_mask(m, "i3h")
    up, dn, lf, rt = _edges(m)
    x = np.arange(W)[None, :].repeat(H, 0)
    img.fill_mask(m & (x <= 3), "i4")
    img.fill_mask(m & ~lf, "i4")
    img.fill_mask(m & (~rt | ~dn) & lf, "i2")
    # brass edge on the lower-right wing and tail (the handle side)
    inner = m & ~(~rt | ~dn)
    edge2 = m & ~inner
    img.fill_mask(edge2 & (x >= 6) & ~(~lf), "b3")
    img.fill_mask(m & ~dn & (x >= 6), "b1h")
    outline_mask(img, m)
    return img


def hand(pointing=True) -> Img:
    W, H = 26, 32
    img = Img(W, H)
    parts = []
    if pointing:
        parts.append(capsule(W, H, (10.5, 3.2), (10.5, 16), 2.7)[0])
        curls = [((14.6, 13.5), (14.6, 17.5), 2.5), ((18.4, 14.5), (18.4, 18.5), 2.4), ((21.8, 16), (21.8, 19.5), 2.1)]
    else:
        curls = [((7.8, 12.5), (7.8, 15.5), 2.5), ((11.8, 11.5), (11.8, 15), 2.6), ((15.8, 11.5), (15.8, 15), 2.6),
                 ((19.6, 12.5), (19.6, 16), 2.4)]
    for p0, p1, r in curls:
        parts.append(capsule(W, H, p0, p1, r)[0])
    palm = poly_mask(W, H, [(7, 15), (23.5, 16), (24, 24), (21, 28.5), (9, 28.5), (6.5, 24)])
    thumb = capsule(W, H, (3.6, 17.5) if pointing else (4.2, 18.5), (8.5, 23), 2.6)[0]
    allm = palm | thumb
    for p in parts:
        allm |= p
    nx, ny, nz = bevel_normals(allm, 2)
    paint(img, allm, lambert(nx, ny, nz, 0.22), R_IVORY)
    # creases between fingers / thumb / palm
    for p in parts + [thumb]:
        others = allm & ~p
        up, dn, lf, rt = _edges(others)
        crease = p & (up | dn | lf | rt) & ~(np.roll(p, 1, 1) & np.roll(p, -1, 1) & np.roll(p, 1, 0) & np.roll(p, -1, 0))
        img.fill_mask(crease & (np.roll(others, -1, 1) | np.roll(others, -1, 0)), "i1")
    # brass cuff
    cuff = np.zeros((H, W), dtype=bool)
    cuff[28:31, 8:23] = True
    img.a[cuff] = -1
    shade(img, cuff, R_BRASS[1:10], width=1, ambient=0.2)
    allm |= cuff
    outline_mask(img, allm)
    return img


def reticle(ramp) -> Img:
    """35x35 targeting reticle, hotspot 17,17. ramp: shade, body, lit, hot."""
    shade_k, body, lit, hot = ramp
    S = 35
    img = Img(S, S)
    c = 17.5
    for y in range(S):
        for x in range(S):
            dx, dy = x + 0.5 - c, y + 0.5 - c
            r = math.hypot(dx, dy)
            if 10.2 <= r <= 12.6 and abs(dx) > 1.6 and abs(dy) > 1.6:
                lt = -(dx * 0.6 + dy * 0.8) / r
                img.put(x, y, lit if lt > 0.55 else body if lt > -0.4 else shade_k)
    for k in list(range(2, 10)) + list(range(25, 33)):
        img.put(17, k, body).put(k, 17, body)
    for k in (2, 3):
        img.put(17, k, lit).put(k, 17, lit)
    img.put(17, 17, hot)
    img.outline("k0")
    return img


def blocked_cursor() -> Img:
    S = 35
    img = Img(S, S)
    c = 17.5
    m = np.zeros((S, S), dtype=bool)
    for y in range(S):
        for x in range(S):
            dx, dy = x + 0.5 - c, y + 0.5 - c
            r = math.hypot(dx, dy)
            if 9.0 <= r <= 12.8:
                m[y, x] = True
            if r < 10 and abs(dx - dy) <= 2.4:
                m[y, x] = True
    nx, ny, nz = bevel_normals(m, 1)
    paint(img, m, lambert(nx, ny, nz, 0.25), ["c0", "e0", "e0h", "e1", "e1h", "e2", "e2h"])
    outline_mask(img, m)
    return img


def cursors(atlas: Atlas):
    atlas.group("cursors")
    arrow = arrow_cursor()
    atlas.add("cursor-arrow", arrow, 1, 1)
    atlas.add("cursor-pointer", hand(True), 10, 1)
    atlas.add("cursor-grab", hand(False), 13, 16)
    atlas.add("cursor-target", reticle(("e0h", "e1h", "e2h", "e3")), 17, 17)
    atlas.add("cursor-target-ion", reticle(("v1", "v2", "v3", "v4")), 17, 17)
    atlas.add("cursor-target-beam", reticle(("c2", "a0", "a1", "a2")), 17, 17)
    atlas.add("cursor-blocked", blocked_cursor(), 17, 17)

    def with_badge(badge: Img, name):
        c = Img(36, 36)
        c.blit(arrow, 0, 0)
        c.blit(badge, 36 - badge.w, 36 - badge.h)
        atlas.add(name, c, 1, 1)

    chev = Img(18, 16)
    for i, (y0, col) in enumerate(((1, "t2"), (7, "t1h"))):
        m = poly_mask(18, 16, [(1, y0), (9, y0 + 5), (17, y0), (17, y0 + 3.5), (9, y0 + 8.5), (1, y0 + 3.5)])
        chev.fill_mask(m, col)
        up, dn, lf, rt = _edges(m)
        chev.fill_mask(m & ~dn, "t0")
    chev.outline("k0")
    with_badge(chev, "cursor-crew-move")
    sp = Img(18, 18)
    m, t, s_, an = capsule(18, 18, (4, 14), (12, 6), 1.8)
    head = ellipse_mask(18, 18, 13.2, 4.8, 3.6, 3.6) & ~ellipse_mask(18, 18, 14.8, 3.2, 1.8, 1.8)
    mm = m | head
    nx, ny, nz = bevel_normals(mm, 1)
    paint(sp, mm, lambert(nx, ny, nz, 0.2), R_BRASS[1:10])
    outline_mask(sp, mm)
    with_badge(sp, "cursor-repair")
    door = Img(16, 18)
    dm = np.zeros((18, 16), dtype=bool)
    dm[1:17, 1:15] = True
    shade(door, dm, R_BRASS[1:10], width=1)
    door.rect(4, 4, 8, 11, "k1")
    door.vline(4, 4, 14, "k0").hline(4, 11, 4, "k0")
    door.vline(8, 5, 14, "k2")
    door.put(10, 9, "a1")
    outline_mask(door, dm)
    with_badge(door, "cursor-door")
    sel = Img(16, 16)
    rm = ellipse_mask(16, 16, 8, 8, 6.6, 6.6) & ~ellipse_mask(16, 16, 8, 8, 3.8, 3.8)
    nx, ny, nz = sphere_normals(16, 16, 8, 8, 6.6, 6.6)
    paint(sel, rm, lambert(nx, ny, nz + 0.3, 0.2), ["g0", "t0", "t0h", "t1", "t1h", "t2", "t3"])
    sel.outline("k0")
    with_badge(sel, "cursor-crew")
    for i, core in enumerate(([("a0", 3.4), ("a1", 2.2), ("a3", 1.0)], [("c2", 3.0), ("a0", 1.8), ("a1", 0.8)])):
        l = Img(18, 18)
        l.disc(9.0, 9.0, 7.6, "b1")
        l.disc(9.0, 9.0, 6.0, "k0")
        gm = ellipse_mask(18, 18, 9.0, 9.0, 5.2, 5.2)
        nx, ny, nz = sphere_normals(18, 18, 9.0, 9.0, 5.2, 5.2)
        paint(l, gm, lambert(nx, ny, nz, 0.1), ["c0", "c0h", "c1"])
        glow_core(l, 8.0, 8.0, core)
        for (x, y) in ((4, 3), (3, 4), (5, 2)):
            l.put(x, y, "b3")
        l.outline("k0")
        atlas.add(f"cursor-wait-{i}", l, 9, 9)
    atlas.anim("cursor-wait", ["cursor-wait-0", "cursor-wait-1"], fps=3, loop=True)


# ── livery swatches (contract v2.1 LAMP_COLORS) ─────────────────────────────────────────────────────────────
LIVERY = {  # dark glass ramp (4 steps, dark->less dark), filament glow (mid, lit, core)
    "amber": (["c0", "c0h", "c1", "c1h"], ("a0", "a1h", "a3")),
    "teal": (["k2", "g0", "g0h", "t0"], ("t1", "t2h", "t4")),
    "violet": (["k2", "v0", "v0h", "v1"], ("v2", "v3h", "v4")),
    "ember": (["k1", "c0", "c0h", "e0"], ("e1", "e2h", "e4")),
    "ivory": (["k3h", "k4h", "i0", "i0h"], ("i1h", "i3", "i4")),
}


def swatch(glass, glowk, state) -> Img:
    """40x40 lamp glass in a dark brass bezel (anchor 20,20). normal: dim filament; hover: brighter filament and
    bezel; selected: lit filament with a soft halo in the glass and a thin glow ring outside the bezel."""
    S, c = 40, 20.0
    img = Img(S, S)
    mid, lit, core = glowk
    bez = {"normal": ["k1", "c0"] + R_BRASS[0:5], "hover": ["k1", "c0"] + R_BRASS[0:7],
           "selected": ["c0"] + R_BRASS[0:8]}[state]
    ring_m = ellipse_mask(S, S, c, c, 14.2, 14.2) & ~ellipse_mask(S, S, c, c, 10.6, 10.6)
    nx, ny, nz = sphere_normals(S, S, c, c, 14.2, 14.2)
    # a turned bezel: the outer half faces out, the inner half faces in (torus-like normals)
    X, Y = np.meshgrid(np.arange(S) + 0.5 - c, np.arange(S) + 0.5 - c)
    r = np.hypot(X, Y) + 1e-6
    tnorm = (r - 12.4) / 1.8
    bx, by, bz = X / r * tnorm, Y / r * tnorm, np.sqrt(np.clip(1 - tnorm ** 2, 0, 1))
    paint(img, ring_m, lambert(bx, by, bz, 0.05), bez)
    seat = ellipse_mask(S, S, c, c, 10.6, 10.6)
    img.fill_mask(seat, "k0")
    gm = ellipse_mask(S, S, c, c, 9.6, 9.6)
    gx, gy, gz = sphere_normals(S, S, c, c, 9.6, 9.6)
    paint(img, gm, lambert(gx, gy, gz, 0.05), glass, bias=-0.22)
    fx, fy = c - 2.0, c - 2.0
    if state == "normal":
        glow_core(img, fx - 0.5, fy - 0.5, [(glass[3], 3.2), (mid, 1.6)])
    elif state == "hover":
        glow_core(img, fx - 0.5, fy - 0.5, [(glass[3], 4.6), (mid, 3.0), (lit, 1.5)])
    else:
        glow_core(img, fx - 0.5, fy - 0.5, [(glass[3], 6.6), (mid, 4.6), (lit, 2.8), (core, 1.3)])
    # a cold specular glint on the glass, top-left
    img.put(13, 14, glass[3]).put(14, 13, glass[3])
    outline_mask(img, ring_m | seat)
    if state == "selected":
        halo = ellipse_mask(S, S, c, c, 17.6, 17.6) & ~ellipse_mask(S, S, c, c, 16.4, 16.4)
        img.fill_mask(halo & (img.a < 0), mid)
        img.fill_mask((ellipse_mask(S, S, c, c, 18.6, 18.6) & ~ellipse_mask(S, S, c, c, 17.6, 17.6)) & (img.a < 0),
                      "k0")
    return img


def swatches(atlas: Atlas):
    atlas.group("swatches")
    for name, (glass, glowk) in LIVERY.items():
        atlas.add(f"swatch-{name}", swatch(glass, glowk, "normal"), 20, 20)
        atlas.add(f"swatch-{name}-hover", swatch(glass, glowk, "hover"), 20, 20)
        atlas.add(f"swatch-{name}-selected", swatch(glass, glowk, "selected"), 20, 20)


def build() -> Atlas:
    atlas = Atlas("ui", width=1024, scale=2)
    panels(atlas)
    buttons(atlas)
    bars(atlas)
    widgets(atlas)
    cursors(atlas)
    swatches(atlas)
    return atlas
