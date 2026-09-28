#!/usr/bin/env python3
"""Programmatic hull silhouettes for TIME TO LIVE vessels (DIRECTION v2: side-view cutaways, TILE 32).

Each ship is a list of simple shapes in FINAL pixel coordinates. From them we render
  art-src/init/<id>-init.png  colour-blocked init at generation scale (SCALE x) on the flat backdrop,
  art-src/init/<id>-mask.png  repaint mask (silhouette dilated + feathered) at generation scale,
  art-src/init/<id>-sil.png   exact silhouette at final size (the hull's alpha; always covers the room grid).
The player's cable tender faces RIGHT, hostiles face LEFT. The room grid rectangle (TILE 32, one deck per row) is
always fully inside the silhouette. Crawlers carry a drive trolley/grip whose carrier point is recorded as `cable`
(the game draws the carrier cable itself); installations carry their anchoring structure; fliers carry rotors.

Usage: python tools/art/hulls.py [id ...]      (no ids = all ships)
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
INIT = ROOT / "art-src" / "init"
TILE = 36  # DIRECTION v4: TILE 36 layout units = 72 image px; one deck per grid row
TILE_V2 = 32  # the unit the hostile designs were first authored in (remapped by remap())
SCALE = 4
BG = (12, 15, 28)
KEEP = 0.5   # repaint strength inside "keep" regions (1 = full repaint)
HD = 2       # DIRECTION v3: finals are HD images at 2 image px per layout unit (shapes are authored in layout units)

# init colour roles (material hints for Krea; the pixelizer maps the result to the master palette anyway)
ROLE = {
    "ivory": (207, 194, 160), "ivory_hi": (233, 223, 196), "brass": (176, 122, 50), "brass_dk": (127, 84, 36),
    "brass_hi": (217, 162, 74), "steel": (74, 80, 104), "steel_dk": (40, 53, 86), "steel_hi": (107, 112, 134),
    "iron": (58, 62, 78), "iron_dk": (30, 34, 48), "copper": (151, 69, 42), "copper_hi": (200, 102, 58),
    "verdi": (63, 138, 116), "verdi_dk": (42, 92, 82), "rust": (106, 45, 32), "violet": (79, 58, 143),
    "violet_hi": (125, 91, 201), "violet_lt": (178, 140, 240), "glass": (44, 33, 89), "black": (19, 26, 43),
    "ember": (163, 34, 46), "ember_dk": (94, 18, 36),
    "ivory_dk": (168, 155, 123), "ivory_sh": (125, 113, 89),
    # glows (drawn as decals, never part of the silhouette unless the shape says so)
    "amber": (255, 179, 71), "amber_hi": (255, 241, 194), "teal": (63, 211, 201), "teal_hi": (200, 255, 246),
    "red": (224, 68, 58), "red_hi": (255, 138, 107), "vglow": (226, 200, 255),
    # livery lamps (player cars): these areas become the reserved amber lamp ramp the game recolours
    "lamp": (255, 179, 71), "lamp_hi": (255, 241, 194),
}
LAMP_ROLES = {"lamp", "lamp_hi"}
LAMP_COLORS = ["#fff1c2", "#ffd98a", "#ffb347", "#e8822a"]


def grid_rect(s):
    if not s.get("grid"):
        return None
    gx, gy, c, r = s["grid"]
    return gx, gy, c * TILE, r * TILE


# ---------------------------------------------------------------------------------------------------- shapes
# shape = (role, kind, args, solid) ; solid=True -> part of the silhouette
def poly(role, pts, solid=True):
    return (role, "poly", pts, solid)


def rect(role, x, y, w, h, solid=True):
    return (role, "poly", [(x, y), (x + w, y), (x + w, y + h), (x, y + h)], solid)


def rrect(role, x, y, w, h, r, solid=True):
    return (role, "rrect", (x, y, w, h, r), solid)


def ell(role, cx, cy, rx, ry=None, solid=True):
    return (role, "ell", (cx, cy, rx, ry if ry is not None else rx), solid)


def line(role, pts, width, solid=True):
    return (role, "line", (pts, width), solid)


def dot(role, x, y, r=2):
    return (role, "ell", (x, y, r, r), False)


def mirror(shapes, cy):
    """Shapes plus their mirror image about the horizontal line y=cy."""
    out = list(shapes)
    for role, kind, a, solid in shapes:
        if kind == "poly":
            out.append((role, kind, [(x, 2 * cy - y) for x, y in a], solid))
        elif kind == "rrect":
            x, y, w, h, r = a
            out.append((role, kind, (x, 2 * cy - y - h, w, h, r), solid))
        elif kind == "ell":
            cx, ey, rx, ry = a
            out.append((role, kind, (cx, 2 * cy - ey, rx, ry), solid))
        elif kind == "line":
            pts, wd = a
            out.append((role, kind, ([(x, 2 * cy - y) for x, y in pts], wd), solid))
    return out


def flip_x(shapes, w):
    """Mirror left<->right on a canvas of width w (to author enemies nose-right and flip them)."""
    out = []
    for role, kind, a, solid in shapes:
        if kind == "poly":
            out.append((role, kind, [(w - x, y) for x, y in a], solid))
        elif kind == "rrect":
            x, y, ww, h, r = a
            out.append((role, kind, (w - x - ww, y, ww, h, r), solid))
        elif kind == "ell":
            cx, cy, rx, ry = a
            out.append((role, kind, (w - cx, cy, rx, ry), solid))
        elif kind == "line":
            pts, wd = a
            out.append((role, kind, ([(w - x, y) for x, y in pts], wd), solid))
    return out


def body_rect(s, m=6, r=14, role="ivory"):
    """The mandatory hull block: the room grid expanded by m px with rounded corners (r <= 3.4 m keeps coverage)."""
    x, y, w, h = grid_rect(s)
    return rrect(role, x - m, y - m, w + 2 * m, h + 2 * m, r)


# ---------------------------------------------------------------------------------------------------- ships
def lamplighter():
    """v4 lead car (native TILE 36 layout units): side-view cable tender, grid 12x4 (864x288 image px), nose/cab RIGHT,
    drive trolley on the roof gripping the carrier (the game draws the cable), rear gangway coupler (left), keel lugs
    and belly hatch, 4 hardpoints (roof aft/fore, belly aft/fore). Lamp-role pixels are the livery ramp."""
    s = {"canvas": (504, 220), "grid": (24, 60, 12, 4), "face": "right", "class": "player", "unit": 36}
    tr, cable = trolley(150, 300, 50, "brass")
    s["shapes"] = tr + [
        rrect("brass", 14, 46, 446, 10, 4),
        rect("steel", 68, 36, 26, 12), rect("steel", 378, 36, 26, 12),                  # roof hardpoints aft/fore
        rrect("ivory", 12, 50, 448, 160, 16),                                              # car body, covers the grid
        poly("ivory", [(448, 52), (474, 58), (492, 80), (502, 120), (496, 166), (474, 200), (448, 210)]),
        poly("brass_dk", [(452, 62), (476, 68), (490, 100), (452, 100)]),                  # cab window frame
        poly("lamp", [(456, 66), (474, 71), (485, 96), (456, 96)], False),                 # lit cab window
        ell("brass", 483, 142, 15, 18), ell("lamp", 485, 142, 11, 14, False), ell("lamp_hi", 487, 139, 4, 5, False),
        rect("brass", 2, 130, 10, 40), rect("steel_hi", 8, 134, 6, 32),                   # rear gangway coupler
        rect("iron", 0, 192, 14, 6),                                                       # drawbar
        rect("brass_dk", 12, 204, 448, 6), rect("brass_dk", 22, 209, 428, 5),             # belly rib + plate
        rect("brass_hi", 148, 206, 16, 13), rect("brass_hi", 300, 206, 16, 13),            # keel hang lugs
        rect("steel", 212, 209, 40, 8),                                                    # belly hatch
        rect("steel", 78, 209, 26, 10), rect("steel", 380, 209, 26, 10),                  # belly hardpoints aft/fore
        rect("verdi", 170, 211, 34, 4), rect("verdi", 262, 211, 34, 4),                    # verdigris pipe run
        dot("lamp", 22, 64, 3), dot("teal", 70, 58, 2), dot("teal", 420, 58, 2),
    ]
    s["cable"] = cable
    s["keep"] = [(0.65, rect("x", 146, 0, 158, 50)),
                 ell("x", 483, 142, 17, 20), poly("x", [(452, 62), (476, 68), (490, 100), (452, 100)]),
                 (0.75, rect("x", 0, 128, 16, 44)), (0.8, rect("x", 146, 204, 20, 16)),
                 (0.8, rect("x", 298, 204, 20, 16)), (0.8, rect("x", 210, 207, 44, 12)),
                 (0.8, rect("x", 76, 207, 30, 13)), (0.8, rect("x", 378, 207, 30, 13))]
    s["mounts"] = [(81, 36), (391, 36), (91, 219), (393, 219)]   # roof aft, roof fore, belly aft, belly fore
    s["glow"] = [(485, 142, 13), (470, 82, 10), (22, 64, 3)]
    s["couplerRear"] = (2, 150)
    s["keelHang"] = (232, 219)
    return s


def glasswing():
    """Native 10x4 survey hull. Narrow pressure body with a separate twin optics rail, never a scaled Lamplighter."""
    s = {"canvas": (452, 244), "grid": (24, 76, 10, 4), "face": "right", "class": "player", "unit": 36}
    tr, cable = trolley(106, 238, 64, "brass")
    s["shapes"] = tr + [
        body_rect(s, 7, 12),
        poly("ivory", [(378, 68), (402, 78), (413, 107), (413, 138), (384, 150)]),
        poly("brass_dk", [(388, 83), (400, 88), (406, 111), (386, 111)]),
        poly("lamp", [(391, 87), (398, 91), (402, 106), (389, 106)], False),
        # Independent low survey bridge and huge faceted prism outside the occupied grid.
        rect("brass_dk", 266, 52, 103, 15),
        poly("brass", [(270, 47), (319, 14), (360, 26), (373, 53), (318, 63)]),
        poly("teal", [(278, 45), (319, 21), (351, 30), (361, 48), (319, 55)], False),
        line("steel_hi", [(319, 21), (319, 55), (351, 30)], 2, False),
        # Pair of long exposed optical tubes gives the survey nose its own silhouette.
        rect("steel_dk", 381, 143, 59, 18), rect("brass", 385, 139, 10, 26),
        rect("brass", 414, 138, 9, 28), ell("brass_hi", 441, 152, 10, 17),
        ell("teal", 445, 152, 5, 12, False),
        rect("steel_dk", 381, 189, 59, 18), rect("brass", 385, 185, 10, 26),
        rect("brass", 414, 184, 9, 28), ell("brass_hi", 441, 198, 10, 17),
        ell("lamp", 445, 198, 5, 12, False),
        # Compact stepped service tail, clear aerial vanes, coupler at rear tile [0,2].
        rect("steel_dk", 12, 89, 10, 46), rect("verdi", 16, 101, 7, 20),
        line("steel_hi", [(37, 70), (37, 39), (47, 33)], 4),
        line("brass", [(53, 70), (53, 44), (61, 37)], 3),
        rect("brass", 2, 147, 16, 38), rect("steel_hi", 6, 152, 7, 27),
        rect("brass_dk", 18, 219, 372, 10),
        rect("steel", 62, 228, 26, 12), rect("steel", 329, 228, 26, 12),
        rect("steel", 63, 60, 25, 12), rect("steel", 379, 56, 25, 15),
        rect("brass_hi", 96, 224, 15, 17), rect("brass_hi", 243, 224, 15, 17),
        rect("steel", 138, 228, 26, 14),
        dot("lamp", 22, 82, 3), dot("teal", 349, 64, 3),
    ]
    s.update(cable=cable, keep=[], lamp_repaint=1.0,
             mounts=[(75, 60), (391, 56), (75, 240), (342, 240)],
             glow=[(445, 198, 10), (445, 152, 10), (396, 97, 8), (319, 36, 14)],
             couplerRear=(2, 166), keelHang=(150, 242))
    return s


def switchback():
    """Native 13x5 retrieval workshop. Five decks, a tall lifting crane and three external drone cradles."""
    s = {"canvas": (560, 292), "grid": (24, 90, 13, 5), "face": "right", "class": "player", "unit": 36}
    # The open yoke is intentionally unlike a solid cab-shaped pylon: visible negative space prevents
    # the model interpreting the cable grip as a small wheeled vehicle parked on the roof.
    cable = (317, 10)
    tr = [line("brass", [(251, 38), (272, 78)], 9), line("brass", [(383, 38), (362, 78)], 9),
          line("steel_hi", [(256, 44), (276, 77)], 3), line("steel_hi", [(378, 44), (358, 77)], 3),
          rect("brass_dk", 309, 37, 16, 43), rect("steel_hi", 314, 45, 6, 29),
          rrect("brass", 236, 30, 162, 13, 4), rect("steel_dk", 271, 7, 92, 6)]
    for wheel in (251, 383):
        tr += [ell("steel_dk", wheel, 22, 19), ell("brass", wheel, 22, 15),
               ell("steel", wheel, 22, 12), ell("brass_hi", wheel, 22, 5),
               line("brass_hi", [(wheel - 12, 22), (wheel + 12, 22)], 2),
               line("brass_hi", [(wheel, 10), (wheel, 34)], 2)]
    s["shapes"] = tr + [
        body_rect(s, 8, 6),
        rect("brass_dk", 17, 82, 481, 10),
        poly("ivory", [(489, 82), (526, 94), (548, 124), (548, 168), (526, 178), (514, 270), (489, 278)]),
        rect("brass_dk", 500, 103, 33, 47), rect("lamp", 505, 109, 23, 32, False),
        rect("steel_dk", 513, 188, 45, 56), rect("brass", 523, 183, 34, 7),
        rect("brass", 523, 242, 34, 7), rect("lamp", 547, 200, 7, 20, False),
        # The articulated crane stands above the drive and the occupied grid.
        rect("steel_dk", 28, 64, 37, 22),
        line("brass", [(44, 69), (69, 21), (176, 21)], 12),
        line("steel_hi", [(51, 66), (75, 31), (168, 31)], 4),
        ell("brass_hi", 70, 25, 9), line("steel", [(176, 20), (176, 60), (166, 68)], 4),
        # Three separate drone saddles, with open space between the rotor-shaped equipment.
        rect("brass_dk", 78, 71, 136, 12),
        rect("steel_dk", 81, 48, 31, 25), rect("steel_dk", 127, 48, 31, 25), rect("steel_dk", 173, 48, 31, 25),
        ell("steel", 97, 55, 16, 10), ell("steel", 143, 55, 16, 10), ell("steel", 189, 55, 16, 10),
        dot("teal", 97, 54, 3), dot("teal", 143, 54, 3), dot("teal", 189, 54, 3),
        # Bottom-deck retrieval mouth, deep belly racks and five-deck rear gangway.
        rect("brass", 2, 197, 16, 38), rect("steel_hi", 6, 202, 7, 27),
        rect("brass_dk", 16, 271, 489, 10),
        rect("steel_dk", 66, 272, 106, 18), rect("steel_dk", 330, 272, 108, 18),
        line("brass_hi", [(70, 277), (168, 277)], 3, False),
        line("brass_hi", [(334, 277), (434, 277)], 3, False),
        rect("steel", 212, 270, 64, 20), rect("brass_hi", 191, 276, 17, 15), rect("brass_hi", 347, 276, 17, 15),
        rect("steel", 33, 76, 25, 12), rect("steel", 464, 70, 25, 15),
        rect("steel", 35, 279, 24, 12), rect("steel", 461, 279, 24, 12),
        dot("lamp", 20, 96, 3), dot("teal", 485, 87, 3),
    ]
    s.update(cable=cable, keep=[], lamp_repaint=1.0,
             mounts=[(45, 76), (477, 70), (47, 291), (473, 291)],
             glow=[(550, 210, 8), (516, 124, 12), (97, 54, 4), (143, 54, 4), (189, 54, 4)],
             couplerRear=(2, 216), keelHang=(258, 291))
    return s


# ---------------------------------------------------------------------------------------------------- A2 v5 tenders
# Lamplighter-pattern sisters with volume (lead, A2 revision): a capsule body with a rounded roofline and lower edge,
# cylinder shading (lit top band, shadow band below), brass ribs and rails, a roof saddle plate for the separate drive
# trolley (tools/art/trolley.py; no trolley is baked into the hull), nose lamp and cab window, tail cap with the
# gangway coupler, keel tanks strapped to the belly. The roof line is always 36 units (72 px) under the carrier, so the
# one trolley design fits every tender. Job fittings (Krea parts on a key backdrop) are composited by hull_v5.py.
TROLLEY_DROP = 36   # layout units from the carrier centre line to the roof line (trolley.py: 72 px)


def _tender_v5(canvas, grid, body_top, body_bot, nose, cable_x, mounts, keel, ribs_every=2, saddle_half=75,
               minimal=True):
    """minimal=True (A2 round 5): only the capsule volume, nose, keel, rails and saddle are blocked in; Krea invents
    the plating, ribs, pipes and ports at full repaint (as it did for the Lamplighter), so the side is its own."""
    gx, gy, cols, rows = grid
    gw, gh = cols * TILE, rows * TILE
    x0, x1 = gx - 8, gx + gw + 6
    shapes = []
    # keel tanks first (behind the belly), strapped
    for kx, kw in keel:
        # a horizontal riveted air tank: rounded end caps, a lit upper band, two brass straps up into the belly
        shapes += [rrect("steel", kx, body_bot - 6, kw, 18, 9), rect("steel_hi", kx + 8, body_bot - 3, kw - 16, 3, False),
                   rect("steel_dk", kx + 8, body_bot + 7, kw - 16, 3, False),
                   ell("steel_dk", kx + 5, body_bot + 3, 4, 7, False), ell("steel_dk", kx + kw - 5, body_bot + 3, 4, 7, False)]
        for sx in (kx + kw // 4, kx + 3 * kw // 4):
            shapes += [rect("brass", sx - 3, body_bot - 10, 6, 22), rect("brass_hi", sx - 3, body_bot - 10, 2, 22, False)]
    # tail cap with the gangway coupler
    shapes += [rrect("ivory", x0 - 10, body_top + 6, 26, body_bot - body_top - 12, 10),
               rect("brass", x0 - 14, (body_top + body_bot) // 2 - 16, 10, 34),
               rect("steel_hi", x0 - 11, (body_top + body_bot) // 2 - 12, 5, 26)]
    # the capsule body, its plates in slightly different tones (patched and replaced over four hundred years)
    shapes.append(rrect("ivory", x0, body_top, x1 - x0, body_bot - body_top, 20))
    for c in range(0, cols, 2) if not minimal else ():
        for r in range(rows):
            if (c * 7 + r * 3) % 5 in (1, 3):
                shapes.append(rect("ivory_dk" if (c + r) % 3 else "ivory_hi", gx + c * TILE + 3, gy + r * TILE + 2,
                                   2 * TILE - 6, TILE - 4, False))
    shapes += nose
    if minimal:
        shapes += [rrect("ivory_hi", x0 + 6, body_top + 3, x1 - x0 - 10, 8, 3, False),
                   rrect("ivory_dk", x0 + 6, body_bot - 26, x1 - x0 - 10, 18, 6, False),
                   rrect("brass", x0 + 4, body_top - 3, x1 - x0 - 8, 5, 2),
                   rect("brass_dk", x0 + 6, body_bot - 5, x1 - x0 - 12, 4),
                   rrect("brass", cable_x - saddle_half, body_top - 7, 2 * saddle_half, 8, 2)]
        for mx in mounts[:2]:
            shapes.append(rect("steel", mx - 13, body_top - 7, 26, 8))
        for mx in mounts[2:]:
            shapes.append(rect("steel", mx - 13, body_bot - 2, 26, 9))
        return shapes
    # cylinder shading (decals inside the silhouette)
    shapes += [rrect("ivory_hi", x0 + 6, body_top + 3, x1 - x0 - 10, 6, 3, False),
               rrect("ivory_dk", x0 + 6, body_bot - 22, x1 - x0 - 10, 14, 6, False),
               rrect("ivory_sh", x0 + 10, body_bot - 9, x1 - x0 - 18, 5, 3, False)]
    # brass roof rail, belly rail, ribs every other column, deck straps
    shapes += [rrect("brass", x0 + 4, body_top - 3, x1 - x0 - 8, 5, 2), rect("brass_dk", x0 + 6, body_bot - 5, x1 - x0 - 12, 4)]
    for c in range(0, cols + 1, ribs_every):
        x = gx + c * TILE - 2
        shapes += [rect("brass", x, body_top + 1, 4, body_bot - body_top - 3, False),
                   rect("brass_hi", x, body_top + 1, 1, body_bot - body_top - 3, False)]
    for r in range(1, rows):
        shapes.append(rect("brass_dk", x0 + 4, gy + r * TILE - 1, x1 - x0 - 8, 3, False))
    # verdigris pipe runs with elbows and drops, rust streaks under straps, brass-rimmed portholes
    L = (x1 - x0)
    shapes += [rect("verdi", x0 + 30, body_top + 9, L // 3, 3, False), rect("verdi", x0 + 30 + L // 3, body_top + 9, 3, 30, False),
               rect("verdi_dk", x0 + 30, body_top + 12, L // 3, 1, False),
               rect("verdi", x0 + L // 2, body_bot - 17, L // 3, 3, False), rect("verdi", x0 + L // 2, body_bot - 40, 3, 26, False),
               rect("verdi_dk", x0 + L // 2, body_bot - 14, L // 3, 1, False)]
    for k in range(9):
        rx = x0 + 20 + (k * 97) % (L - 40)
        shapes.append(rect("rust", rx, body_top + 12 + (k * 23) % 60, 2, 10 + (k * 7) % 14, False))
    for c in range(1, cols, 3):
        px_, py_ = gx + c * TILE + TILE // 2, gy + TILE // 2
        shapes += [ell("brass", px_, py_, 7, 7, False), ell("glass", px_, py_, 5, 5, False),
                   ell("steel_hi", px_ - 2, py_ - 2, 1.5, 1.5, False)]
    # roof saddle plate for the trolley hanger (struts land at +-17 units), roof hardpoint pedestals
    roof = body_top
    shapes += [rrect("brass", cable_x - saddle_half, roof - 7, 2 * saddle_half, 8, 2),
               rect("brass_dk", cable_x - saddle_half + 2, roof - 1, 2 * saddle_half - 4, 2)]
    for mx in mounts[:2]:
        shapes.append(rect("steel", mx - 13, roof - 7, 26, 8))
    for mx in mounts[2:]:
        shapes.append(rect("steel", mx - 13, body_bot - 2, 26, 9))
    return shapes


def glasswing_v5():
    """Glasswing G-04, optical inspection (10x4): compact, rounded optical nose with a violet lens ring round the
    guide lamp; prism housing forward, collimators under the lamp and survey horns aft come from hull_v5.py."""
    grid = (24, 76, 10, 4)
    top, bot = 66, 230
    cable_x = 180
    nose = [ell("ivory", 380, 148, 56, 80),
            poly("brass_dk", [(392, 82), (418, 90), (432, 118), (392, 118)]),
            poly("lamp", [(395, 86), (416, 93), (428, 115), (395, 115)], False),
            ell("violet_hi", 422, 160, 20, 22), ell("brass", 422, 160, 16, 18),
            ell("lamp", 424, 160, 12, 14, False), ell("lamp_hi", 426, 156, 4, 5, False),
            rrect("ivory_dk", 350, 196, 70, 20, 8, False),
            ell("brass", 404, 200, 6, 6), ell("glass", 404, 200, 4, 4, False)]
    s = {"canvas": (490, 256), "grid": grid, "face": "right", "class": "player", "unit": 36}
    mounts = [80, 277, 70, 330]
    s["shapes"] = _tender_v5(s["canvas"], grid, top, bot, nose, cable_x, mounts, [(40, 120), (200, 130)], saddle_half=75)
    s["shapes"] += [dot("lamp", 20, 84, 3), dot("teal", 60, 74, 2)]
    keep = [(0.85, ell("x", 380, 148, 58, 82)), (0.45, ell("x", 422, 160, 22, 24)),
            (0.55, poly("x", [(390, 80), (420, 88), (434, 120), (390, 120)])),
            (0.85, rect("x", 38, bot - 12, 124, 26)), (0.85, rect("x", 198, bot - 12, 134, 26)),
            (0.5, rect("x", 0, 124, 22, 50))]
    s.update(cable=(cable_x, top - TROLLEY_DROP), keep=keep, lamp_repaint=0.35,
             mounts=[(80, top - 7), (277, top - 7), (70, bot + 9), (330, bot + 9)],
             glow=[(424, 160, 13), (412, 101, 10), (20, 84, 3)],
             couplerRear=(2, (top + bot) // 2), keelHang=(200, bot + 8))
    return s


def switchback_v5():
    """Switchback S-08, drone retrieval (13x5): tall and heavy, a blunt high nose with a wide cab window, the guide
    lamp above dark louvred retrieval shutters; the heavy double trolley; retrieval crane and drone cradles aft
    (hull_v5.py)."""
    grid = (24, 90, 13, 5)
    top, bot = 80, 280
    cable_x = 385
    nose = [poly("ivory", [(470, 80), (518, 84), (540, 104), (546, 160), (546, 262), (528, 280), (470, 280)]),
            poly("brass_dk", [(494, 94), (530, 98), (538, 132), (494, 132)]),
            poly("lamp", [(497, 97), (528, 100), (535, 129), (497, 129)], False),
            ell("brass", 528, 158, 16, 18), ell("lamp", 530, 158, 12, 14, False),
            ell("lamp_hi", 532, 154, 4, 5, False),
            rect("steel_dk", 500, 188, 42, 64)] + [
            rect("steel_hi", 503, 192 + 8 * k, 36, 3, False) for k in range(8)] + [
            rect("brass", 498, 186, 46, 4), rect("brass", 498, 252, 46, 4),
            rrect("ivory_dk", 474, 256, 66, 20, 8, False)]
    s = {"canvas": (560, 296), "grid": grid, "face": "right", "class": "player", "unit": 36}
    mounts = [35, 502, 90, 440]
    s["shapes"] = _tender_v5(s["canvas"], grid, top, bot, nose, cable_x, mounts, [(60, 150), (300, 150)], saddle_half=104)
    s["shapes"] += [dot("lamp", 20, 98, 3), dot("teal", 480, 88, 2)]
    # the lowest deck: a band of roll-up retrieval shutters in dark gunmetal behind brass frames
    sy0, sy1 = 90 + 4 * 36 + 4, 90 + 5 * 36 - 3
    for k in range(8):
        bx0 = 30 + k * 56
        s["shapes"] += [rect("brass_dk", bx0, sy0 - 2, 54, sy1 - sy0 + 4), rect("steel_dk", bx0 + 2, sy0, 50, sy1 - sy0)]
        s["shapes"] += [rect("steel", bx0 + 3, yy, 48, 1, False) for yy in range(sy0 + 3, sy1 - 1, 4)]
    keep = [(0.85, poly("x", [(470, 78), (520, 82), (548, 102), (550, 282), (470, 284)])),
            (0.45, ell("x", 528, 158, 18, 20)), (0.55, poly("x", [(492, 92), (532, 96), (540, 134), (492, 134)])),
            (0.7, rect("x", 496, 184, 50, 74)), (0.85, rect("x", 58, bot - 12, 154, 26)),
            (0.85, rect("x", 298, bot - 12, 154, 26)), (0.5, rect("x", 0, 160, 22, 60))]
    s.update(cable=(cable_x, top - TROLLEY_DROP), keep=keep, lamp_repaint=0.35,
             mounts=[(35, top - 7), (502, top - 7), (90, bot + 9), (440, bot + 9)],
             glow=[(530, 158, 13), (516, 114, 12), (20, 98, 3)],
             couplerRear=(2, (top + bot) // 2), keelHang=(270, bot + 8))
    return s


def _rear_base(extra, keep_extra=()):
    """v4 rear car (grid 4x4, native TILE 36): small trolley, ivory body, front gangway coupler on the RIGHT (towards
    the lead car) at the lead car's coupler height; grid top 50 below the cable like the lead car, so decks align."""
    s = {"canvas": (172, 224), "grid": (12, 60, 4, 4), "face": "right", "class": "rear-car", "unit": 36}
    tr, cable = trolley(50, 122, 50, "brass")
    s["shapes"] = tr + [
        rrect("brass", 6, 46, 160, 10, 4),
        rrect("ivory", 4, 50, 160, 160, 12),
        rect("brass_dk", 166, 130, 6, 40), rect("steel", 160, 134, 8, 32),                # front gangway coupler
        rect("iron", 160, 192, 12, 6),
        rect("brass_dk", 4, 204, 160, 6),
        dot("lamp", 10, 64, 3),
    ] + extra
    s["cable"] = cable
    s["keep"] = [(0.65, rect("x", 46, 0, 80, 50)), (0.75, rect("x", 158, 128, 14, 44))] + list(keep_extra)
    s["couplerFront"] = (171, 150)
    s["glow"] = [(10, 64, 3)]
    s["mounts"] = []
    return s


def drone_car():
    s = _rear_base([
        rect("steel_dk", 8, 34, 34, 14), ell("steel", 25, 32, 13, 6), ell("steel_hi", 25, 26, 16, 2),
        rect("steel_dk", 128, 34, 34, 14), ell("steel", 145, 32, 13, 6), ell("steel_hi", 145, 26, 16, 2),
        rect("steel_dk", 12, 210, 66, 12), rect("steel_dk", 92, 210, 66, 12),
        line("brass", [(45, 210), (45, 222)], 2, False), line("brass", [(125, 210), (125, 222)], 2, False),
        dot("teal", 25, 32, 2), dot("teal", 145, 32, 2),
    ])
    s["glow"] += [(25, 32, 3), (145, 32, 3)]
    return s


def armory_car():
    s = _rear_base([
        ell("brass_dk", 28, 46, 22, 6), rect("steel", 12, 24, 32, 20), rect("steel_hi", 42, 30, 24, 7),
        rect("brass_dk", 132, 38, 26, 10),
        rect("iron", 24, 210, 124, 9), dot("amber", 34, 214, 2), dot("amber", 138, 214, 2),
    ])
    s["mounts"] = [(40, 26)]
    return s


def freight_car():
    s = _rear_base([
        rect("brass_dk", 8, 28, 38, 20), line("iron_dk", [(8, 28), (46, 48)], 2, False),
        line("iron_dk", [(8, 48), (46, 28)], 2, False), rect("brass_dk", 126, 28, 40, 20),
        line("iron_dk", [(126, 28), (166, 48)], 2, False), line("iron_dk", [(126, 48), (166, 28)], 2, False),
        rect("iron", 10, 210, 152, 13),
    ] + [rrect("brass", x, 211, 10, 11, 4) for x in range(16, 156, 14)] + [
        dot("teal", x + 5, 219, 1) for x in range(16, 156, 14)])
    return s


def bunk_car():
    s = _rear_base([rrect("ivory", 8, 32, 40, 16, 5), rrect("ivory", 124, 32, 40, 16, 5)]
                   + [rect("lamp", x, 36, 7, 7, False) for x in (12, 23, 34)]
                   + [rect("lamp", x, 36, 7, 7, False) for x in (129, 140, 151)]
                   + [rect("iron", 14, 210, 144, 9)] + [rect("lamp", x, 212, 6, 4, False) for x in range(22, 152, 16)])
    s["glow"] += [(26, 40, 4), (144, 40, 4)]
    return s


def veil_car():
    s = _rear_base([rrect("steel_dk", 8, 32, 40, 16, 5), rrect("steel_dk", 124, 32, 40, 16, 5)]
                   + [line("iron_dk", [(x, 34), (x + 6, 46)], 3, False) for x in list(range(11, 46, 8)) + list(range(127, 162, 8))]
                   + [rect("steel_dk", 10, 210, 152, 12)]
                   + [line("iron_dk", [(x, 211), (x + 5, 221)], 3, False) for x in range(13, 158, 9)]
                   + [rect("lamp", 82, 38, 8, 4, False)])
    return s


def _keel_base(extra):
    """v4 keel car (grid 6x2, native TILE 36), slung under the lead car on two hanger struts from the top."""
    s = {"canvas": (240, 124), "grid": (12, 34, 6, 2), "face": "right", "class": "keel-car", "unit": 36}
    s["shapes"] = [
        rect("brass_dk", 84, 0, 72, 6),
        line("brass", [(92, 4), (104, 30)], 7), line("brass", [(148, 4), (136, 30)], 7),
        rect("steel_dk", 108, 22, 24, 8),
        rrect("ivory", 6, 28, 228, 82, 12),
        rect("brass_dk", 6, 104, 228, 6),
        dot("lamp", 226, 46, 3),
    ] + extra
    s["hangTop"] = (120, 0)
    s["keep"] = [(0.75, rect("x", 82, 0, 76, 32))]
    s["glow"] = [(226, 46, 3)]
    s["mounts"] = []
    return s


def ballast_keel():
    return _keel_base([rrect("steel", 0, 42, 16, 56, 8), rrect("steel", 224, 42, 16, 56, 8),
                       rect("iron", 24, 110, 50, 12), rect("iron", 96, 110, 48, 14), rect("iron", 166, 110, 50, 12),
                       rect("copper", 24, 110, 192, 3, False)])


def listening_keel():
    horns = [poly("copper", [(x - 5, 108), (x + 5, 108), (x + 15, 124), (x - 15, 124)]) for x in (44, 92, 140, 188)]
    return _keel_base(horns + [poly("copper", [(232, 58), (240, 48), (240, 96), (232, 86)]), dot("teal", 140, 116, 2)])


def sling_keel():
    s = _keel_base([rect("iron", 40, 110, 162, 8), poly("steel", [(200, 108), (240, 112), (240, 120), (200, 120)]),
                    rrect("brass", 62, 116, 22, 8, 3), rrect("brass", 94, 116, 22, 8, 3)])
    s["mounts"] = [(232, 116)]
    return s


def workshop_keel():
    return _keel_base([line("steel_hi", [(50, 110), (34, 120), (16, 122)], 4), poly("steel", [(16, 116), (4, 124), (18, 124)]),
                       line("steel_hi", [(186, 110), (206, 118), (224, 118)], 4), line("steel", [(224, 118), (224, 124)], 2),
                       rect("iron", 86, 110, 68, 10), dot("amber", 120, 114, 2)])


CARS = {"drone-car": drone_car, "armory-car": armory_car, "freight-car": freight_car, "bunk-car": bunk_car,
        "veil-car": veil_car, "ballast-keel": ballast_keel, "listening-keel": listening_keel,
        "sling-keel": sling_keel, "workshop-keel": workshop_keel}
CAR_GRIDS = {"rear-car": (4, 4), "keel-car": (6, 2)}


CABLE_Y = 10


def trolley(x0, x1, top, role="brass", cable_y=CABLE_Y):
    """Drive trolley riding the carrier (the game draws the cable itself at y=cable_y): two grip wheels, a frame, a
    grip clamp and a solid hanger pylon down to the roof at y=top (thin struts get dropped by the model)."""
    cx = (x0 + x1) // 2
    dk = {"brass": "brass_dk", "iron": "iron_dk", "steel": "steel_dk", "copper": "rust"}.get(role, "iron_dk")
    w = x1 - x0
    return [
        poly(dk, [(x0 + w * 0.22, cable_y + 16), (x1 - w * 0.22, cable_y + 16), (x1 - w * 0.12, top + 3),
                  (x0 + w * 0.12, top + 3)]),                                                   # hanger pylon
        rect(role, cx - 5, cable_y + 16, 10, top - cable_y - 14),                                # centre post
        line(role, [(x0 + 16, cable_y + 16), (x0 + w * 0.12, top + 2)], 8),
        line(role, [(x1 - 16, cable_y + 16), (x1 - w * 0.12, top + 2)], 8),
        rrect(role, x0, cable_y + 5, w, 13, 5),
        ell("steel_dk", x0 + 13, cable_y + 1, 11, 11), ell("brass_hi", x0 + 13, cable_y + 1, 4, 4, False),
        ell("steel_dk", x1 - 13, cable_y + 1, 11, 11), ell("brass_hi", x1 - 13, cable_y + 1, 4, 4, False),
        poly(dk, [(cx - 16, cable_y - 8), (cx + 16, cable_y - 8), (cx + 20, cable_y + 6), (cx - 20, cable_y + 6)]),
    ], (cx, cable_y)


def rotor(cx, y, span, mast_to):
    """A drone rotor: mast from the body up to the hub, a thin blurred blade disc."""
    return [line("steel", [(cx, mast_to), (cx, y)], 4), ell("steel_hi", cx, y, span, 3),
            ell("steel_dk", cx, y, 5, 4)]


def bell(role, x, top, bottom, half):
    """Side view of a hanging bell: narrow crown, flared lip."""
    return poly(role, [(x - half * 0.35, top), (x + half * 0.35, top), (x + half * 0.7, top + (bottom - top) * 0.6),
                       (x + half, bottom), (x - half, bottom), (x - half * 0.7, top + (bottom - top) * 0.6)])


# ---------------------------------------------------------------------------------------------------- crawlers
def packet_leech():
    # recovery drone hulk clamped to the carrier: bulbous overflowing buffer tank, grasping intake arms forward
    s = {"canvas": (288, 208), "grid": (44, 80, 7, 3), "face": "left", "class": "crawler"}
    tr, cable = trolley(112, 204, 70, "copper")
    s["shapes"] = tr + [
        body_rect(s, 6, 20, "verdi_dk"),
        ell("verdi", 164, 128, 112, 72),
        line("verdi_dk", [(52, 100), (24, 84), (6, 98)], 8), poly("copper", [(10, 90), (0, 84), (0, 108), (12, 104)]),
        line("verdi_dk", [(52, 156), (22, 172), (10, 196)], 8), poly("copper", [(4, 190), (0, 204), (18, 204), (16, 194)]),
        rrect("copper", 30, 104, 26, 48, 8), ell("amber", 36, 128, 6, 14, False),
        ell("amber", 172, 124, 42, 30, False), ell("amber_hi", 172, 122, 18, 12, False),
        rect("copper_hi", 240, 96, 34, 10), rect("copper_hi", 240, 150, 34, 10),
        dot("teal", 110, 80, 3), dot("teal", 230, 180, 3),
    ]
    s["cable"], s["mounts"] = cable, [(64, 72), (64, 188)]
    s["glow"] = [(172, 124, 30), (36, 128, 8)]
    return s


def cable_wraith():
    # isolation cutter riding the carrier: long thin hull, enormous open shears at the nose, severed cables trailing
    s = {"canvas": (352, 176), "grid": (56, 72, 9, 2), "face": "left", "class": "crawler"}
    tr, cable = trolley(160, 270, 64, "iron")
    blade = [poly("steel_hi", [(52, 100), (4, 40), (14, 34), (64, 94)]),
             poly("steel", [(50, 96), (74, 76), (82, 84), (58, 104)])]
    s["shapes"] = tr + [
        body_rect(s, 5, 10, "steel_dk"),
        poly("iron", [(50, 68), (330, 66), (348, 80), (350, 132), (336, 146), (50, 146)]),
    ] + mirror(blade, 108) + [
        ell("brass", 48, 108, 11, 12), ell("amber", 48, 108, 5, 5, False),
        rect("steel_hi", 70, 104, 250, 5, False),
        line("copper", [(320, 146), (330, 160), (344, 170)], 3), line("verdi_dk", [(286, 146), (282, 164), (290, 174)], 3),
        dot("teal_hi", 344, 170, 3), dot("teal_hi", 290, 173, 2),
    ]
    s["cable"], s["mounts"] = cable, [(96, 62), (140, 154)]
    s["glow"] = [(48, 108, 6)]
    return s


def scrap_foreman():
    # yard crane on a gantry rail: crane house, lattice jib forward with a hoist claw, a container frame hung below
    s = {"canvas": (336, 240), "grid": (104, 64, 7, 3), "face": "left", "class": "crawler"}
    tr, cable = trolley(170, 290, 56, "brass")
    s["shapes"] = tr + [
        body_rect(s, 6, 10, "rust"),
        poly("brass", [(106, 64), (4, 50), (4, 64), (106, 90)]),
        line("iron_dk", [(20, 54), (40, 66), (60, 57), (80, 70), (100, 62)], 2, False),
        line("steel", [(12, 64), (12, 150)], 3),
        poly("steel", [(0, 150), (24, 150), (28, 178), (18, 170), (12, 190), (6, 170), (0, 178)]),
        line("iron", [(130, 160), (130, 172)], 4), line("iron", [(290, 160), (290, 172)], 4),
        rect("copper", 116, 172, 184, 60), line("iron_dk", [(116, 172), (300, 232)], 3, False),
        line("iron_dk", [(116, 232), (300, 172)], 3, False),
        rect("brass", 98, 150, 234, 6, False), dot("amber", 314, 74, 3), dot("amber", 112, 74, 3),
    ]
    s["cable"], s["mounts"] = cable, [(124, 56), (200, 238)]
    s["glow"] = [(314, 74, 4), (112, 74, 4), (12, 150, 3)]
    return s


def scavenger_skiff():
    # human crew: a salvaged cable car patched from three others, salvage net slung below, crates on the roof
    s = {"canvas": (272, 216), "grid": (52, 72, 6, 3), "face": "left", "class": "crawler"}
    tr, cable = trolley(100, 196, 62, "steel")
    s["shapes"] = tr + [
        body_rect(s, 6, 12, "steel"),
        poly("steel", [(48, 64), (236, 62), (254, 76), (258, 124), (248, 176), (48, 178), (30, 164), (12, 132),
                       (8, 112), (22, 84)]),
        poly("glass", [(18, 100), (40, 86), (46, 112), (16, 112)], False), dot("teal", 30, 104, 3),
        rect("copper", 74, 78, 40, 30, False), rect("ivory", 140, 124, 50, 36, False),
        rect("verdi_dk", 196, 80, 36, 30, False), rect("rust", 92, 132, 36, 34, False),
        rect("brass_dk", 206, 130, 32, 34, False),
        rect("brass_dk", 206, 46, 28, 18), rect("copper", 62, 50, 26, 14),
        poly("brass_dk", [(84, 178), (212, 178), (198, 210), (98, 210)]),
    ] + [line("iron_dk", [(x, 180), (x + 16, 208)], 1, False) for x in range(90, 200, 14)] + [
        line("iron_dk", [(x + 16, 180), (x, 208)], 1, False) for x in range(90, 200, 14)]
    s["cable"], s["mounts"] = cable, [(70, 58), (236, 186)]
    s["glow"] = [(30, 104, 5), (250, 100, 3)]
    return s


def prism_widow():
    # optical repair automaton hanging from glass-web cables by its upper legs; lower legs curled beneath
    s = {"canvas": (320, 240), "grid": (64, 72, 7, 3), "face": "left", "class": "crawler"}
    legs = []
    for (x0, y0), (xk, yk), (xf, yf) in (((96, 82), (70, 32), (84, CABLE_Y)), ((146, 74), (130, 28), (142, CABLE_Y)),
                                          ((216, 74), (232, 28), (220, CABLE_Y)), ((266, 82), (292, 32), (278, CABLE_Y)),
                                          ((96, 162), (66, 198), (40, 230)), ((146, 170), (130, 210), (112, 234)),
                                          ((216, 170), (234, 210), (252, 234)), ((266, 162), (296, 196), (316, 226))):
        legs += [line("violet_lt", [(x0, y0), (xk, yk), (xf, yf)], 5), dot("vglow", xf, yf, 3)]
    s["shapes"] = legs + [
        body_rect(s, 6, 20, "violet"),
        ell("glass", 212, 120, 96, 62), ell("violet_hi", 212, 120, 70, 44, False),
        ell("violet", 72, 120, 42, 46),
        dot("vglow", 40, 110, 4), dot("vglow", 40, 130, 4), dot("vglow", 32, 120, 3),
        line("vglow", [(84, 14), (142, 14), (220, 14), (278, 14)], 1, False),
        line("vglow", [(70, 32), (130, 28)], 1, False), line("vglow", [(232, 28), (292, 32)], 1, False),
        ell("vglow", 212, 120, 16, 12, False),
    ]
    s["cable"], s["mounts"] = (181, CABLE_Y), [(62, 64), (62, 180)]
    s["glow"] = [(212, 120, 16), (38, 120, 8)]
    return s


def wire_weaver():
    # wiring automaton on the carrier: carriage with cable spools, several jointed arms reaching forward
    s = {"canvas": (320, 232), "grid": (84, 72, 7, 3), "face": "left", "class": "crawler"}
    tr, cable = trolley(150, 260, 62, "brass")
    s["shapes"] = tr + [
        body_rect(s, 6, 14, "brass_dk"),
        ell("copper", 110, 60, 24, 24), ell("brass_dk", 110, 60, 8, 8, False),
        ell("copper", 290, 190, 26, 26), ell("brass_dk", 290, 190, 9, 9, False),
        line("steel_hi", [(88, 92), (52, 70), (14, 84)], 4), line("steel_hi", [(88, 112), (46, 112), (8, 126)], 4),
        line("steel_hi", [(88, 142), (48, 156), (16, 176)], 4), line("steel_hi", [(96, 164), (64, 198), (32, 218)], 4),
        poly("steel", [(14, 84), (0, 76), (2, 92)]), poly("steel", [(8, 126), (0, 118), (0, 134)]),
        poly("steel", [(16, 176), (2, 172), (8, 186)]), poly("steel", [(32, 218), (18, 216), (24, 228)]),
        line("copper_hi", [(110, 60), (14, 84)], 1, False), line("copper_hi", [(110, 60), (8, 126)], 1, False),
        rect("copper_hi", 100, 118, 190, 4, False), dot("amber", 96, 120, 4),
    ]
    s["cable"], s["mounts"] = cable, [(120, 62), (220, 180)]
    s["glow"] = [(96, 120, 5)]
    return s


def coil_serpent():
    # segmented cable-recovery coil riding the carrier on two grips, gripper head forward
    s = {"canvas": (352, 176), "grid": (48, 72, 9, 2), "face": "left", "class": "crawler"}
    shapes = [body_rect(s, 5, 12, "copper")]
    for x in (126, 262):
        shapes += [line("steel", [(x, CABLE_Y), (x, 66)], 6), ell("steel_dk", x, CABLE_Y + 1, 10, 10),
                   ell("brass_hi", x, CABLE_Y + 1, 4, 4, False)]
    for i, x in enumerate(range(62, 342, 22)):
        shapes.append(ell("copper_hi" if i % 2 else "verdi", x, 104, 13, 42))
        shapes.append(rect("brass_dk", x - 2, 66, 4, 76, False))
    shapes += [poly("iron", [(56, 74), (22, 80), (6, 98), (6, 110), (22, 128), (56, 134)]),
               poly("steel_hi", [(12, 88), (0, 76), (6, 72), (22, 84)]), poly("steel_hi", [(12, 120), (0, 132), (6, 136), (22, 124)]),
               dot("amber", 22, 104, 4), poly("verdi_dk", [(340, 84), (352, 94), (352, 114), (340, 124)])]
    s["shapes"] = shapes
    s["cable"], s["mounts"] = (194, CABLE_Y), [(74, 64), (74, 146)]
    s["glow"] = [(22, 104, 5)]
    return s


def echo_tender():
    # an earlier keeper's tender of the lamplighter pattern on autopilot, nobody aboard, nose lamp still lit (faces left)
    s = {"canvas": (320, 208), "grid": (44, 72, 8, 3), "face": "left", "class": "crawler"}
    tr, cable = trolley(120, 220, 58, "brass")
    s["shapes"] = tr + [
        rrect("brass", 34, 56, 272, 10, 4),
        rrect("ivory", 36, 60, 270, 116, 14),
        poly("ivory", [(46, 62), (22, 68), (8, 88), (2, 118), (8, 150), (26, 170), (46, 176)]),
        poly("glass", [(12, 78), (32, 74), (36, 98), (8, 98)], False),
        ell("brass", 8, 128, 10, 12), ell("amber", 6, 128, 6, 8, False), ell("amber_hi", 5, 127, 3, 3, False),
        poly("steel", [(304, 74), (316, 86), (318, 150), (304, 164)]),
        rect("brass_dk", 36, 170, 270, 6),
        rrect("steel", 80, 176, 92, 22, 10), rect("iron", 200, 176, 60, 26),
        rect("steel", 90, 46, 22, 12), rect("steel", 250, 46, 22, 12),
    ]
    s["cable"], s["mounts"] = cable, [(101, 46), (261, 46)]
    s["glow"] = [(6, 128, 12)]
    return s


def null_marshal():
    # angular armoured escort riding the carrier: chevron armour, boarding pod, ember running lights
    s = {"canvas": (304, 208), "grid": (52, 72, 7, 3), "face": "left", "class": "crawler"}
    tr, cable = trolley(120, 220, 62, "iron")
    s["shapes"] = tr + [
        body_rect(s, 5, 6, "iron"),
        poly("iron", [(18, 120), (48, 64), (240, 62), (286, 78), (298, 120), (286, 172), (240, 180), (48, 178)]),
        poly("steel", [(30, 120), (80, 82), (132, 120), (80, 158)], False),
        rrect("steel", 150, 180, 56, 22, 6), dot("ember", 178, 190, 3),
        line("ember", [(56, 70), (274, 72)], 2, False), line("ember", [(56, 172), (274, 172)], 2, False),
        dot("red", 28, 120, 4),
    ]
    s["cable"], s["mounts"] = cable, [(84, 60), (84, 186)]
    s["glow"] = [(28, 120, 6), (178, 190, 3)]
    return s


def grave_reaver():
    # reactor dismantler on the carrier: two huge pincer claws forward, cutting-disc housing, payload racks
    s = {"canvas": (352, 224), "grid": (84, 64, 8, 3), "face": "left", "class": "crawler"}
    tr, cable = trolley(176, 296, 56, "iron")
    s["shapes"] = tr + [
        body_rect(s, 6, 12, "iron_dk"),
        poly("steel", [(88, 80), (44, 62), (10, 78), (2, 106), (18, 104), (28, 88), (54, 88), (88, 102)]),
        poly("steel_hi", [(2, 106), (18, 104), (22, 118), (6, 116)]),
        poly("steel", [(88, 140), (48, 158), (14, 180), (8, 208), (24, 204), (32, 186), (58, 174), (88, 158)]),
        poly("steel_hi", [(8, 208), (24, 204), (30, 218), (12, 220)]),
        ell("iron", 88, 90, 12, 12), ell("iron", 88, 150, 12, 12),
        ell("steel", 160, 112, 28, 28, False), ell("amber", 160, 112, 12, 12, False),
        rect("rust", 210, 72, 100, 10, False), rect("rust", 210, 142, 100, 10, False),
    ]
    s["cable"], s["mounts"] = cable, [(104, 56), (220, 168)]
    s["glow"] = [(160, 112, 12)]
    return s


def demolition_engine():
    # elite decommissioning machine hanging from two trolleys: heavy iron body, wrecking ram, exhaust stacks
    s = {"canvas": (352, 256), "grid": (72, 72, 8, 4), "face": "left", "class": "crawler"}
    t1, _ = trolley(112, 190, 64, "iron")
    t2, _ = trolley(244, 322, 64, "iron")
    s["shapes"] = t1 + t2 + [
        body_rect(s, 8, 12, "iron"),
        rect("rust", 200, 34, 16, 34), rect("rust", 226, 42, 14, 26), dot("ember", 208, 36, 4), dot("ember", 233, 44, 3),
        poly("steel", [(72, 112), (32, 118), (12, 136), (32, 156), (72, 162)]), rect("steel_hi", 2, 122, 18, 30),
        rect("iron_dk", 80, 208, 240, 34), rect("amber", 110, 196, 180, 5, False),
    ] + [line("iron", [(x, 210), (x, 240)], 3, False) for x in range(88, 320, 14)]
    s["cable"], s["mounts"] = (217, CABLE_Y), [(92, 64), (200, 246)]
    s["glow"] = [(208, 36, 5), (233, 44, 4), (200, 198, 3)]
    return s


# ---------------------------------------------------------------------------------------------------- installations
def rust_prophet():
    # maintenance beacon built on a gantry stub: tall mast with flared broadcasting horns and a warning lamp on top
    s = {"canvas": (240, 256), "grid": (64, 86, 4, 5), "face": "left", "class": "installation"}
    s["shapes"] = [
        body_rect(s, 6, 10, "rust"),
        rect("iron", 120, 14, 16, 76),
        poly("copper", [(120, 26), (78, 8), (70, 48), (120, 40)]), poly("copper", [(136, 26), (178, 8), (186, 48), (136, 40)]),
        poly("copper", [(64, 110), (24, 92), (16, 136), (64, 126)]),
        poly("copper", [(64, 186), (28, 176), (22, 214), (64, 202)]),
        ell("red", 128, 12, 10, 10), ell("red_hi", 128, 11, 4, 4, False),
        rect("iron", 192, 150, 48, 22), poly("iron_dk", [(192, 172), (240, 172), (240, 200), (206, 200)]),
        rect("rust", 76, 244, 104, 8, False), dot("amber", 80, 100, 3),
    ]
    s["mounts"] = [(58, 150), (58, 236)]
    s["glow"] = [(128, 12, 10), (80, 100, 4)]
    return s


def static_nest():
    # brood hive of spark mites hanging under a relay platform
    s = {"canvas": (256, 240), "grid": (52, 84, 5, 4), "face": "left", "class": "installation"}
    shapes = [rect("iron", 0, 14, 256, 26), line("iron_dk", [(0, 27), (256, 27)], 2, False),
              line("iron", [(84, 40), (84, 84)], 6), line("iron", [(172, 40), (172, 84)], 6),
              body_rect(s, 6, 20, "rust"), ell("copper", 132, 150, 94, 82)]
    for i in range(16):
        a = 2 * math.pi * i / 16 + 0.2
        x, y = 132 + 98 * math.cos(a), 152 + 84 * math.sin(a)
        if 8 < x < 248 and 46 < y < 236:
            shapes.append(ell("copper_hi" if i % 2 else "rust", round(x), round(y), 13, 12))
            if i % 3 == 0:
                shapes.append(dot("teal", round(x), round(y), 4))
    shapes += [rrect("iron", 12, 124, 42, 16, 5), rrect("iron", 16, 164, 38, 16, 5),
               dot("amber", 18, 132, 3), dot("amber", 22, 172, 3),
               ell("amber", 138, 150, 22, 20, False), ell("amber_hi", 138, 150, 9, 8, False)]
    s["shapes"] = shapes
    s["mounts"] = [(40, 108), (40, 204)]
    s["glow"] = [(138, 150, 20), (18, 132, 4), (22, 172, 4)]
    return s


def ferric_colossus():
    # foundry guardian standing on its foundry deck: heavy iron slabs, chimneys, a glowing furnace mouth forward
    s = {"canvas": (336, 256), "grid": (64, 80, 8, 4), "face": "left", "class": "installation"}
    s["shapes"] = [
        rect("iron_dk", 16, 216, 320, 40), line("iron", [(16, 224), (336, 224)], 2, False),
        rect("iron", 232, 18, 26, 66), rect("iron", 274, 36, 20, 48),
        dot("ember", 245, 20, 6), dot("ember", 284, 38, 5),
        body_rect(s, 8, 10, "iron"),
        poly("iron", [(64, 96), (30, 110), (18, 144), (30, 180), (64, 194)]),
        ell("ember", 38, 144, 14, 32, False), ell("amber", 36, 144, 8, 22, False), ell("amber_hi", 34, 144, 4, 10, False),
        rect("rust", 110, 140, 150, 10, False),
    ] + [line("iron_dk", [(x, 74), (x, 214)], 2, False) for x in (120, 180, 240)]
    s["mounts"] = [(94, 72), (150, 72)]
    s["glow"] = [(36, 144, 22), (245, 20, 6), (284, 38, 5)]
    return s


def glass_choir():
    # three announcement bells hung beneath a brass bell-house, chained to a hall beam
    s = {"canvas": (320, 256), "grid": (32, 64, 8, 3), "face": "left", "class": "installation"}
    shapes = [rect("brass_dk", 0, 0, 320, 14)] + [line("iron", [(x, 14), (x, 60)], 4) for x in (64, 160, 256)]
    shapes += [body_rect(s, 6, 8, "brass_dk")]
    shapes += [rect("glass", x, 76, 44, 64, False) for x in (52, 138, 224)]
    for x in (80, 160, 240):
        shapes += [line("brass", [(x, 160), (x, 172)], 6), bell("violet_hi", x, 170, 238, 38),
                   ell("violet_lt", x, 240, 7, 7)]
    s["shapes"] = shapes
    s["mounts"] = [(40, 56), (40, 168)]
    s["glow"] = [(80, 238, 6), (160, 238, 6), (240, 238, 6)]
    return s


def gate_sentinel():
    # checkpoint platform on a gantry stub: barred gate forward, key-scanner lens on a boom
    s = {"canvas": (288, 240), "grid": (72, 64, 6, 4), "face": "left", "class": "installation"}
    s["shapes"] = [
        body_rect(s, 6, 8, "iron"),
        rect("brass_dk", 46, 56, 26, 144),
    ] + [line("iron_dk", [(x, 58), (x, 198)], 3, False) for x in (52, 60, 68)] + [
        rect("iron", 264, 110, 24, 40), rect("iron_dk", 96, 200, 150, 18),
        line("iron", [(120, 218), (110, 240)], 6), line("iron", [(220, 218), (232, 240)], 6),
        line("iron", [(90, 60), (46, 30)], 8), ell("iron", 32, 24, 20, 20), ell("iron_dk", 30, 24, 13, 13, False),
        ell("red", 28, 24, 9, 9, False), ell("red_hi", 26, 23, 3, 3, False),
        rect("amber", 90, 66, 150, 4, False),
    ]
    s["mounts"] = [(84, 56), (170, 206)]
    s["glow"] = [(28, 24, 10), (160, 68, 3)]
    return s


def iron_regent():
    # An armored gate engine: broad forward shield, structural command crown, compact drive/lock assemblies.
    s = {"unit": 36, "canvas": (420, 340), "grid": (72, 100, 9, 5), "face": "left", "class": "installation"}
    shapes = [
        # Rear fixed gate clamp and its two load-bearing arms.
        rect("iron_dk", 401, 62, 15, 242),
        poly("steel", [(351, 82), (408, 66), (408, 103), (371, 121)]),
        poly("steel", [(365, 257), (407, 268), (407, 304), (343, 287)]),
        # Solid chamfered pressure hull completely covers the existing cutaway grid.
        poly("iron", [(90, 78), (354, 78), (404, 107), (404, 275), (374, 296), (75, 296), (54, 262), (54, 119)]),
        rect("steel", 68, 98, 332, 184),
        # Forward shield: two broad overlapping slabs around a recessed central gate lock.
        poly("brass_dk", [(62, 76), (30, 89), (9, 129), (9, 232), (29, 273), (68, 284), (79, 243), (79, 117)]),
        poly("brass", [(36, 100), (19, 139), (19, 220), (36, 259), (50, 261), (44, 99)]),
        rect("iron_dk", 46, 117, 27, 128),
        ell("steel", 48, 180, 22, 31), ell("brass", 47, 180, 16, 24), ell("iron_dk", 47, 180, 11, 18),
        ell("amber", 46, 180, 6, 12, False),
        # The crown is an armored command citadel on a thick structural neck, not decorative spikes.
        rect("iron_dk", 166, 48, 125, 42),
        poly("brass", [(137, 53), (160, 25), (271, 25), (308, 52), (303, 72), (145, 72)]),
        rect("steel", 173, 13, 14, 23), rect("steel", 212, 7, 18, 28), rect("steel", 257, 16, 13, 22),
        rect("iron_dk", 161, 43, 119, 16), rect("teal", 167, 47, 107, 5, False),
        # Roof shoulders and heavy hydraulic locking rams.
        poly("brass_dk", [(73, 97), (82, 76), (144, 75), (154, 96)]),
        poly("brass_dk", [(303, 96), (316, 77), (370, 88), (395, 106)]),
        line("steel_hi", [(96, 78), (158, 64)], 9), line("copper", [(105, 77), (146, 68)], 5),
        line("steel_hi", [(291, 65), (348, 82)], 9), line("copper", [(303, 69), (337, 78)], 5),
        # Low, ribbed power blocks connect into a substantial armored keel.
        poly("iron_dk", [(91, 279), (384, 279), (371, 313), (318, 331), (150, 331), (84, 307)]),
        rect("brass_dk", 136, 297, 72, 28), rect("brass_dk", 260, 297, 71, 28),
        rect("steel", 217, 298, 35, 35),
    ]
    for x in range(143, 201, 8): shapes.append(rect("copper", x, 300, 3, 21, False))
    for x in range(267, 327, 8): shapes.append(rect("copper", x, 300, 3, 21, False))
    for y in (110, 146, 214, 250): shapes.append(rect("brass_hi", 24, y, 17, 5, False))
    s["shapes"] = shapes
    s["mounts"] = [(101, 77), (105, 299)]
    s["glow"] = [(220, 49, 7), (46, 180, 10)]
    return s


def hollow_choir():
    # Guardian II: the Cathedral's announcement engine hung on chains in the glass hall; organ pipes, bells, masks
    s = {"canvas": (384, 320), "grid": (64, 100, 9, 5), "face": "left", "class": "installation"}
    shapes = [rect("brass_dk", 60, 0, 300, 10), line("iron", [(110, 10), (110, 96)], 5), line("iron", [(310, 10), (310, 96)], 5)]
    for i, x in enumerate(range(90, 340, 16)):
        h = [34, 48, 58, 44, 30, 52, 40, 56, 34, 46, 28, 42, 36, 50, 32, 44][i % 16]
        shapes += [rrect("violet", x, 100 - h, 11, h + 6, 4), rect("violet_lt", x + 3, 102 - h, 3, h - 4, False)]
    shapes += [body_rect(s, 8, 20, "glass"), poly("glass", [(64, 112), (34, 126), (18, 180), (34, 234), (64, 248)])]
    for x, y in ((40, 150), (40, 210), (26, 180)):
        shapes += [ell("ivory", x, y, 12, 16), dot("iron_dk", x - 4, y - 4, 2), dot("iron_dk", x + 4, y - 4, 2)]
    shapes += [ell("violet_hi", 150, 178, 44, 44, False), ell("glass", 150, 178, 28, 28, False),
               ell("vglow", 150, 178, 10, 10, False), ell("violet_hi", 260, 150, 28, 28, False),
               ell("violet_hi", 260, 216, 28, 28, False)]
    for x in (130, 210, 290):
        shapes += [line("brass", [(x, 266), (x, 272)], 5), bell("violet_hi", x, 270, 314, 26)]
    s["shapes"] = shapes
    s["mounts"] = [(58, 112), (58, 252)]
    s["glow"] = [(150, 178, 20), (130, 312, 6), (210, 312, 6), (290, 312, 6)]
    return s


def blackout_core():
    # Guardian III: the Heart's shell, a sphere of archive machinery in concentric shells, braced to the ring
    s = {"canvas": (384, 320), "grid": (48, 64, 9, 6), "face": "left", "class": "installation"}
    s["shapes"] = [
        rect("iron_dk", 166, 0, 52, 30), rect("iron_dk", 166, 290, 52, 30),
        body_rect(s, 4, 10, "iron_dk"),
        ell("iron", 192, 160, 164, 150),
        ell("ember_dk", 192, 160, 132, 122, False), ell("iron_dk", 192, 160, 102, 94, False),
        ell("ember", 192, 160, 62, 58, False), ell("red_hi", 192, 160, 32, 30, False), ell("amber_hi", 192, 160, 12, 12, False),
        line("iron_dk", [(28, 160), (356, 160)], 5, False), line("iron_dk", [(192, 12), (192, 308)], 5, False),
    ]
    s["mounts"] = [(40, 120), (40, 200), (96, 40), (96, 280)]
    s["glow"] = [(192, 160, 44)]
    return s


# ---------------------------------------------------------------------------------------------------- fliers
def glass_echo():
    # small fast bell-drone on a rotor: flared glass bell mouth forward, swept glass fins, thruster aft
    s = {"canvas": (256, 176), "grid": (68, 76, 5, 2), "face": "left", "class": "flier"}
    s["shapes"] = rotor(148, 18, 60, 72) + [
        body_rect(s, 5, 10, "violet"),
        poly("violet_hi", [(72, 72), (32, 62), (10, 56), (4, 108), (10, 160), (32, 152), (72, 142)]),
        ell("glass", 14, 108, 9, 40, False), ell("vglow", 12, 108, 4, 18, False),
        poly("violet_lt", [(206, 76), (238, 36), (252, 42), (228, 76)]),
        poly("violet_lt", [(206, 140), (238, 170), (252, 164), (228, 140)]),
        rrect("steel_dk", 226, 94, 28, 28, 8), rect("teal", 250, 100, 4, 16, False),
    ]
    s["mounts"] = [(66, 70), (66, 146)]
    s["glow"] = [(12, 108, 10), (252, 108, 5), (148, 18, 4)]
    return s


def ash_moth():
    # cooling drone on rotors with two big wings of radiator fins; sheds conductive ash
    s = {"canvas": (256, 240), "grid": (64, 76, 5, 3), "face": "left", "class": "flier"}
    upper = [poly("steel", [(86, 76), (70, 16), (196, 8), (232, 44), (220, 76)])]
    lower = [poly("steel", [(86, 172), (74, 226), (190, 234), (228, 204), (220, 172)])]
    fins = [line("steel_hi", [(x, 74), (x - 10, 18)], 2, False) for x in range(96, 220, 12)]
    fins += [line("steel_hi", [(x, 174), (x - 8, 228)], 2, False) for x in range(96, 220, 12)]
    s["shapes"] = rotor(40, 8, 26, 26) + rotor(236, 8, 18, 44) + upper + lower + fins + [
        rect("iron", 34, 24, 12, 60), body_rect(s, 6, 20, "iron"),
        ell("iron", 50, 124, 26, 30), ell("teal", 44, 124, 9, 11, False), ell("teal_hi", 42, 122, 3, 4, False),
        rrect("steel_dk", 218, 104, 30, 40, 10), rect("ember", 244, 112, 4, 24, False),
        dot("steel_hi", 250, 96, 2), dot("steel_hi", 252, 150, 2), dot("steel", 246, 160, 2),
    ]
    s["mounts"] = [(58, 96), (58, 152)]
    s["glow"] = [(44, 124, 9), (246, 124, 5)]
    return s


def quarantine_drone():
    # the Seal's sealing drone: matte black shell, red seam light, twin rotors on top, clamps below
    s = {"canvas": (240, 192), "grid": (40, 64, 5, 3), "face": "left", "class": "flier"}
    s["shapes"] = [
        line("steel", [(78, 20), (78, 50)], 4), line("steel", [(162, 20), (162, 50)], 4),
        ell("steel_hi", 78, 18, 40, 3), ell("steel_hi", 162, 18, 40, 3),
        rrect("black", 58, 36, 40, 18, 6), rrect("black", 142, 36, 40, 18, 6),
        body_rect(s, 6, 20, "black"), ell("black", 120, 112, 112, 66),
        line("red", [(12, 112), (230, 112)], 2, False), line("red", [(60, 52), (120, 48), (180, 52)], 2, False),
        line("red", [(60, 172), (120, 176), (180, 172)], 2, False),
        ell("red", 20, 112, 6, 6, False), ell("red_hi", 19, 111, 3, 3, False),
        poly("iron_dk", [(84, 172), (74, 190), (96, 190)]), poly("iron_dk", [(156, 172), (146, 190), (168, 190)]),
    ]
    s["mounts"] = [(30, 90), (30, 134)]
    s["glow"] = [(20, 112, 6), (120, 48, 3), (78, 18, 3), (162, 18, 3)]
    return s


def gate_warden():
    # roomless flier: a brass-framed piece of the gate on a rotor, one teal lens forward
    s = {"canvas": (72, 72), "grid": None, "face": "left", "class": "flier"}
    s["shapes"] = rotor(38, 6, 30, 18) + [
        rrect("brass_dk", 10, 18, 54, 48, 4), rect("iron", 18, 14, 38, 56),
        line("brass", [(26, 16), (26, 68)], 2, False), line("brass", [(46, 16), (46, 68)], 2, False),
        poly("iron", [(10, 30), (2, 36), (2, 50), (10, 56)]), ell("teal", 8, 43, 5, 6, False), ell("teal_hi", 7, 43, 2, 2, False),
        rrect("steel_dk", 60, 34, 10, 18, 3),
    ]
    s["mounts"] = [(4, 43)]
    s["glow"] = [(7, 43, 5), (38, 6, 3)]
    return s


def sealing_drone():
    # roomless flier: small matte black sealing drone, red seam, one rotor
    s = {"canvas": (72, 72), "grid": None, "face": "left", "class": "flier"}
    s["shapes"] = rotor(38, 6, 28, 22) + [
        ell("black", 36, 42, 30, 22), poly("iron_dk", [(50, 60), (62, 70), (40, 64)]),
        line("red", [(8, 42), (64, 42)], 2, False), ell("red", 12, 42, 4, 4, False), ell("red_hi", 11, 41, 2, 2, False),
    ]
    s["mounts"] = [(6, 42)]
    s["glow"] = [(11, 42, 4), (38, 6, 3)]
    return s


SHIPS = {
    "lamplighter": lamplighter,
    "glasswing": glasswing_v5, "switchback": switchback_v5,
    "packet-leech": packet_leech, "cable-wraith": cable_wraith, "rust-prophet": rust_prophet,
    "scrap-foreman": scrap_foreman, "scavenger-skiff": scavenger_skiff, "static-nest": static_nest,
    "ferric-colossus": ferric_colossus, "iron-regent": iron_regent, "gate-warden": gate_warden,
    "prism-widow": prism_widow, "glass-echo": glass_echo, "wire-weaver": wire_weaver, "glass-choir": glass_choir,
    "coil-serpent": coil_serpent, "echo-tender": echo_tender, "hollow-choir": hollow_choir,
    "gate-sentinel": gate_sentinel, "null-marshal": null_marshal, "ash-moth": ash_moth,
    "grave-reaver": grave_reaver, "demolition-engine": demolition_engine, "quarantine-drone": quarantine_drone,
    "blackout-core": blackout_core, "sealing-drone": sealing_drone,
}

# the lead's fixed room grids, DIRECTION v2 (cols x rows of 32 px tiles, side view)
GRIDS = {"lamplighter": (12, 4), "glasswing": (10, 4), "switchback": (13, 5), "packet-leech": (7, 3), "cable-wraith": (8, 2), "rust-prophet": (4, 5),
         "scrap-foreman": (7, 3), "scavenger-skiff": (6, 3), "static-nest": (5, 4), "ferric-colossus": (8, 4),
         "iron-regent": (9, 5), "prism-widow": (7, 3), "glass-echo": (5, 2), "wire-weaver": (7, 3),
         "glass-choir": (8, 3), "coil-serpent": (8, 2), "echo-tender": (8, 3), "hollow-choir": (9, 5),
         "gate-sentinel": (6, 4), "null-marshal": (7, 3), "ash-moth": (5, 3), "grave-reaver": (8, 3),
         "demolition-engine": (8, 4), "quarantine-drone": (5, 3), "blackout-core": (9, 6)}
BOSSES = {"iron-regent", "hollow-choir", "blackout-core"}


# ---------------------------------------------------------------------------------------------------- v4 remap
LIMITS = {"boss": (480, 400), "hostile": (344, 300)}   # layout units (x2 = image px)


def _ceil4(v):
    return int(math.ceil(v / 4.0) * 4)


def remap(s, sid):
    """Move a design authored on the v2 grid (TILE 32) onto its v4 grid (TILE 36, GRIDS): the room-grid interior is
    stretched to the new grid, everything outside it keeps its offset from the grid edge, scaled by `a` (<= 1) so the
    canvas fits the panel limits. Roomless fliers are simply scaled by 36/32."""
    if s.get("unit") == 36:
        return s
    W, H = s["canvas"]
    if not s.get("grid"):
        f = TILE / TILE_V2
        fx = fy = (lambda v: v * f)
        a = f
        W2, H2 = _ceil4(W * f), _ceil4(H * f)
        grid2 = None
    else:
        gx, gy, c, r = s["grid"]
        gw, gh = c * TILE_V2, r * TILE_V2
        c2, r2 = GRIDS.get(sid, (c, r))
        gw2, gh2 = c2 * TILE, r2 * TILE
        L, R, T, B = gx, W - gx - gw, gy, H - gy - gh
        wmax, hmax = LIMITS["boss" if sid in BOSSES else "hostile"]
        a = 1.0
        if L + R > 0:
            a = min(a, (wmax - 4 - gw2) / (L + R))
        if T + B > 0:
            a = min(a, (hmax - 4 - gh2) / (T + B))
        a = max(a, 0.55)
        gx2, gy2 = round(a * L), round(a * T)
        W2, H2 = _ceil4(gx2 + gw2 + a * R), _ceil4(gy2 + gh2 + a * B)

        def fx(x):
            if x <= gx:
                return gx2 - (gx - x) * a
            if x >= gx + gw:
                return gx2 + gw2 + (x - gx - gw) * a
            return gx2 + (x - gx) * gw2 / gw

        def fy(y):
            if y <= gy:
                return gy2 - (gy - y) * a
            if y >= gy + gh:
                return gy2 + gh2 + (y - gy - gh) * a
            return gy2 + (y - gy) * gh2 / gh
        grid2 = (gx2, gy2, c2, r2)
    wf = max(a, 0.75)

    def tshape(sh):
        role, kind, args, solid = sh
        if kind == "poly":
            return (role, kind, [(fx(x), fy(y)) for x, y in args], solid)
        if kind == "rrect":
            x, y, w, h, rr = args
            x0, y0, x1, y1 = fx(x), fy(y), fx(x + w), fy(y + h)
            return (role, kind, (x0, y0, x1 - x0, y1 - y0, rr * wf), solid)
        if kind == "ell":
            cx, cy, rx, ry = args
            x0, y0, x1, y1 = fx(cx - rx), fy(cy - ry), fx(cx + rx), fy(cy + ry)
            return (role, kind, ((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2), solid)
        if kind == "line":
            pts, w = args
            return (role, kind, ([(fx(x), fy(y)) for x, y in pts], w * wf), solid)
        return sh

    out = dict(s)
    out["canvas"] = (W2, H2)
    out["grid"] = grid2
    out["shapes"] = [tshape(sh) for sh in s["shapes"]]
    if s.get("keep"):
        out["keep"] = [(it[0], tshape(it[1])) if len(it) == 2 else tshape(it) for it in s["keep"]]
    for key in ("cable", "couplerRear", "couplerFront", "keelHang", "hangTop"):
        if s.get(key):
            out[key] = (round(fx(s[key][0])), round(fy(s[key][1])))
    out["mounts"] = [(round(fx(x)), round(fy(y))) for x, y in s["mounts"]]
    out["glow"] = [(round(fx(x)), round(fy(y)), max(2, round(r * wf))) for x, y, r in s["glow"]]
    out["unit"] = 36
    out["remap"] = round(a, 3)
    return out


# ---------------------------------------------------------------------------------------------------- render
def _draw(draw, kind, a, fill, k):
    if kind == "poly":
        draw.polygon([(x * k, y * k) for x, y in a], fill=fill)
    elif kind == "rrect":
        x, y, w, h, r = a
        draw.rounded_rectangle((x * k, y * k, (x + w) * k - 1, (y + h) * k - 1), radius=r * k, fill=fill)
    elif kind == "ell":
        cx, cy, rx, ry = a
        draw.ellipse(((cx - rx) * k, (cy - ry) * k, (cx + rx) * k - 1, (cy + ry) * k - 1), fill=fill)
    elif kind == "line":
        pts, wd = a
        draw.line([(x * k, y * k) for x, y in pts], fill=fill, width=max(1, round(wd * k)), joint="curve")


def render(sid, s=None):
    s = remap(s or (SHIPS.get(sid) or CARS[sid])(), sid)
    W, H = s["canvas"]
    k = SCALE * 2  # supersample 2x, then downsample to generation scale
    col = Image.new("RGB", (W * k, H * k), BG)
    sil = Image.new("L", (W * k, H * k), 0)
    dc, ds = ImageDraw.Draw(col), ImageDraw.Draw(sil)
    import numpy as np
    for role, kind, a, solid in s["shapes"]:
        if solid and kind != "line":
            # top-lit volume hint: each solid shape gets a vertical light-to-dark gradient
            m = Image.new("L", col.size, 0)
            _draw(ImageDraw.Draw(m), kind, a, 255, k)
            bb = m.getbbox()
            if bb:
                h = max(1, bb[3] - bb[1])
                ramp = np.clip(1.18 - 0.5 * (np.arange(h) / h), 0, 2)[:, None, None]
                tile = np.clip(np.array(ROLE[role], dtype=float)[None, None, :] * ramp, 0, 255).astype(np.uint8)
                tile = np.repeat(tile, bb[2] - bb[0], axis=1)
                col.paste(Image.fromarray(tile, "RGB"), bb[:2], m.crop(bb))
        else:
            _draw(dc, kind, a, ROLE[role], k)
        if solid:
            _draw(ds, kind, a, 255, k)
    gw, gh = W * SCALE, H * SCALE
    col = col.resize((gw, gh), Image.LANCZOS)
    sil_gen = sil.resize((gw, gh), Image.BOX)
    # final-size silhouette: area coverage >= 50 %
    sil_fin = sil.resize((W * HD, H * HD), Image.BOX).point(lambda v: 255 if v >= 128 else 0)
    if grid_rect(s):
        gx, gy, gw_, gh_ = grid_rect(s)
        if gx + gw_ > W or gy + gh_ > H:
            raise SystemExit(f"{sid}: grid outside the canvas")
        crop = sil_fin.crop((gx * HD, gy * HD, (gx + gw_) * HD, (gy + gh_) * HD))
        if crop.getextrema()[0] < 255:
            raise SystemExit(f"{sid}: silhouette does not cover the room grid")
        want = GRIDS.get(sid) or CAR_GRIDS.get(s.get("class"))
        if want and tuple(s["grid"][2:]) != want:
            raise SystemExit(f"{sid}: grid {s['grid'][2:]} != fixed {want}")
    lim = LIMITS["boss"] if sid in BOSSES else (560, 296) if s.get("class") == "player" else (244, 224) if sid in CARS \
        else LIMITS["hostile"]
    if W > lim[0] or H > lim[1]:
        raise SystemExit(f"{sid}: canvas {W}x{H} exceeds {lim}")
    # repaint mask: silhouette dilated ~5 final px, feathered
    d = 5 * SCALE
    m = sil_gen.point(lambda v: 255 if v >= 64 else 0).filter(ImageFilter.MaxFilter(2 * (d // 2) + 1))
    m = m.filter(ImageFilter.MaxFilter(2 * (d // 2) + 1)).filter(ImageFilter.GaussianBlur(3 * SCALE))
    keep = list(s.get("keep", [])) + [(s.get("lamp_repaint", KEEP), sh)
                                      for sh in s["shapes"] if sh[0] in LAMP_ROLES]
    if keep:
        # partial repaint strength over detail the model tends to drop (KSampler blends the init back there)
        km = Image.new("L", (W * k, H * k), 0)
        for item in keep:
            strength, shape = item if len(item) == 2 else (KEEP, item)
            _r, kind, a, _s = shape
            _draw(ImageDraw.Draw(km), kind, a, int(255 * (1 - strength)), k)
        km = km.resize((gw, gh), Image.BOX).filter(ImageFilter.GaussianBlur(2 * SCALE))
        m = ImageChops.subtract(m, km)
    INIT.mkdir(parents=True, exist_ok=True)
    col.save(INIT / f"{sid}-init.png")
    m.save(INIT / f"{sid}-mask.png")
    sil_fin.save(INIT / f"{sid}-sil.png")
    # livery lamp mask (final size): lamp-role shapes, grown by 1 px
    lm = Image.new("L", (W * k, H * k), 0)
    for role, kind, a, solid in s["shapes"]:
        if role in LAMP_ROLES:
            _draw(ImageDraw.Draw(lm), kind, a, 255, k)
    lm = lm.resize((W * HD, H * HD), Image.BOX).point(lambda v: 255 if v >= 60 else 0)
    if lm.getbbox():
        lm.filter(ImageFilter.MaxFilter(3)).save(INIT / f"{sid}-lamps.png")
    def xy(p):
        return {"x": p[0] * HD, "y": p[1] * HD}

    g = s.get("grid")
    meta = {"canvas": [W * HD, H * HD], "layout": [W, H], "gen": [gw, gh], "density": HD, "remap": s.get("remap"),
            "cable": xy(s["cable"]) if s.get("cable") else None,
            "class": s.get("class"),
            "grid": {"x": g[0] * HD, "y": g[1] * HD, "cols": g[2], "rows": g[3], "tile": TILE * HD} if g else None,
            "face": s["face"], "mounts": [xy(m) for m in s["mounts"]],
            **{k2: xy(s[k2]) for k2 in ("couplerRear", "couplerFront", "keelHang", "hangTop") if s.get(k2)},
            "lampColors": LAMP_COLORS if any(r in LAMP_ROLES for r, *_ in s["shapes"]) else None,
            "glow": [{"x": x * HD, "y": y * HD, "r": r * HD} for x, y, r in s["glow"]]}
    (INIT / f"{sid}.json").write_text(json.dumps(meta, indent=1) + "\n")
    return meta


def main(ids):
    for sid in ids or list(SHIPS) + list(CARS):
        meta = render(sid)
        print(sid, meta["canvas"], meta["gen"])


if __name__ == "__main__":
    main(sys.argv[1:])
