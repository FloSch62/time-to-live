#!/usr/bin/env python3
"""The drive trolley family (A2): one designed carriage for every tender, painted by sketch-guided Krea img2img.

  python tools/art/trolley.py sketch            -> art-src/init/trolley/<kind>-init.png (+ -regions.png, .json)
  python tools/art/trolley.py cut CAND.png      -> pixelized layers of one candidate (tools/shots/art/hulls/_trolley)
  python tools/art/trolley.py sheet             -> tools/shots/art/hulls/trolley.png (3x, on a carrier, old vs new)
  python tools/art/trolley.py final <kind> CAND.png  -> public/art/ships/trolley-<kind>-back.png / -front.png + meta

Design (an aerial-ropeway carriage in the Reach-dock pattern; lore: "drive trolley and grip arms"): a riveted brass
carriage whose grooved dark-steel sheaves ride ON TOP of the braided carrier; an axle beam links the sheave hubs; a
drive-motor housing with a gear train sits on the beam; a central drop plate passes in front of the carrier and ends
in grip jaws clamping it from below (the grip Pell sold); a pivot pin under it carries the hanger: two struts with
coil-spring dampers splaying down to the roof saddle plate on the hull. Small amber marker lamps at the beam ends and
a teal indicator on the housing. `heavy` (Switchback) is two carriages on a balance beam with the same hanger.

Geometry in final pixels (hull density: 1 px = 1 backing px at TILE 72). Origin: the carrier centre line at the pivot
(the hull's `cable` anchor). The carrier is ~12 px thick (combat carrier sprite), so the sheave grooves sit on y=-6 and
the jaws close at y=+6. The saddle top is at y=+62 (roof line at +72 below the carrier, the same on every tender).
Layers: BACK = far side plate + sheaves; the game draws the carrier over it; FRONT = axle beam, hubs, housing, drop
plate, jaws, pivot and hanger. The carrier band itself is only a guide for Krea and is cut out.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
INIT = ROOT / "art-src" / "init" / "trolley"
OUT = ROOT / "tools" / "shots" / "art" / "hulls"
PUB = ROOT / "public" / "art" / "ships"
sys.path.insert(0, str(ROOT / "tools"))
from pixelize import build_palette, hex_to_rgb, nearest, srgb_to_oklab  # noqa: E402

KEY = (255, 0, 255)
S = 6                     # sketch scale (sketch px per final px)
PAD = 40                  # final-px margin around the design inside the render canvas
C = {  # sketch colours (top-left light); the pixelizer maps the result onto the hull palette
    "b0": (85, 54, 25), "b1": (127, 84, 36), "b2": (176, 122, 50), "b3": (217, 162, 74), "b4": (242, 196, 107),
    "s0": (19, 26, 43), "s1": (40, 53, 86), "s2": (74, 80, 104), "s3": (107, 112, 134), "s4": (144, 150, 168),
    "i0": (30, 34, 48), "i1": (58, 62, 78), "v1": (42, 92, 82), "v2": (63, 138, 116), "am": (255, 179, 71),
    "ah": (255, 241, 194), "tl": (63, 211, 201), "th": (200, 255, 246), "rope": (42, 92, 82), "rope_hi": (111, 181, 154),
    "k": (7, 8, 15),
}
REGION = {"back": 1, "front": 2, "carrier": 3}
CARRIER_HALF = 6          # final px (the game's carrier sprite is 12 px thick)
SADDLE_TOP = 62           # final px below the carrier centre line
UNIT = {"standard": 1.8, "heavy": 1.8, "car": 1.35}   # final px per design unit, per kind (v3 tenders; rear cars)
G = 1.8                   # the current kind's unit (set by use_kind)
CH = CARRIER_HALF / G     # the carrier half-thickness and the saddle top in design units
ST = SADDLE_TOP / G


def use_kind(kind):
    global G, CH, ST
    G = UNIT[kind]
    CH = CARRIER_HALF / G
    ST = SADDLE_TOP / G


class Sketch:
    """Draw in final-pixel coordinates (origin at the pivot on the carrier line) onto an S-times canvas."""

    def __init__(self, x0, y0, x1, y1):
        self.x0, self.y0 = x0 - PAD, y0 - PAD
        self.w, self.h = int(math.ceil((x1 - x0) + 2 * PAD)), int(math.ceil((y1 - y0) + 2 * PAD))
        self.img = Image.new("RGB", (self.w * S, self.h * S), KEY)
        self.reg = Image.new("L", (self.w * S, self.h * S), 0)
        self.d = ImageDraw.Draw(self.img)
        self.r = ImageDraw.Draw(self.reg)

    def P(self, x, y):
        return ((x - self.x0) * S, (y - self.y0) * S)

    def poly(self, pts, col, region, outline=True):
        q = [self.P(x, y) for x, y in pts]
        self.d.polygon(q, fill=C[col], outline=C["k"] if outline else None, width=S if outline else 0)
        if region:
            self.r.polygon(q, fill=REGION[region])

    def rect(self, x0, y0, x1, y1, col, region, outline=True):
        self.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], col, region, outline)

    def disc(self, cx, cy, r, col, region, outline=True):
        a, b = self.P(cx - r, cy - r), self.P(cx + r, cy + r)
        self.d.ellipse([a, b], fill=C[col], outline=C["k"] if outline else None, width=S if outline else 0)
        if region:
            self.r.ellipse([a, b], fill=REGION[region])

    def line(self, pts, col, width, region=None):
        q = [self.P(x, y) for x, y in pts]
        self.d.line(q, fill=C[col], width=int(width * S))
        if region:
            self.r.line(q, fill=REGION[region], width=int(width * S))

    def rivets(self, x0, x1, y, step=8, col="b4"):
        for x in range(int(x0), int(x1) + 1, step):
            self.disc(x, y, 0.9, col, None, outline=False)


def plate(sk, x0, y0, x1, y1, region, dark=False):
    """A riveted brass plate with top-left light: bright top edge, mid body, dark bottom band."""
    base, hi, lo = ("b1", "b2", "b0") if dark else ("b2", "b3", "b1")
    sk.rect(x0, y0, x1, y1, base, region)
    sk.rect(x0 + 1, y0 + 1, x1 - 1, y0 + 3, hi, None, outline=False)
    sk.rect(x0 + 1, y1 - 3, x1 - 1, y1 - 1, lo, None, outline=False)
    sk.rivets(x0 + 3, x1 - 3, y0 + 5, 7, "b4" if not dark else "b3")


def sheave(sk, cx, cy, r):
    """A grooved dark-steel sheave with spokes and a brass hub (drawn in the BACK region)."""
    sk.disc(cx, cy, r, "s1", "back")
    sk.disc(cx, cy, r - 2, "s2", None, outline=False)            # near flange face
    sk.disc(cx, cy, r - 5, "s0", None, outline=False)            # groove shadow ring
    sk.disc(cx, cy, r - 7, "s2", None, outline=False)            # web
    for k in range(6):                                           # spokes
        a = k * math.pi / 3 + math.pi / 12
        sk.line([(cx, cy), (cx + math.cos(a) * (r - 7), cy + math.sin(a) * (r - 7))], "s3", 2.2)
    # top-left rim highlight
    for k in range(10):
        a = math.pi + 0.2 + k * 0.13
        sk.disc(cx + math.cos(a) * (r - 1.2), cy + math.sin(a) * (r - 1.2), 0.9, "s4", None, outline=False)


def carriage(sk, cx, beam_y=-24, r=22, span=62, housing=True, lamps=True, jaws=True):
    """One carriage centred on cx: back plate, two sheaves, axle beam, hubs, housing, drop plate, jaws, pin."""
    # far side plate (BACK): a trapezoid behind the sheaves, down to the carrier top
    sk.poly([(cx - span - 12, beam_y - 6), (cx + span + 12, beam_y - 6), (cx + span - 4, -CH),
             (cx - span + 4, -CH)], "b0", "back")
    sk.rivets(cx - span, cx + span, beam_y - 2, 9, "b2")
    for sx in (cx - span, cx + span):
        sheave(sk, sx, -CH - r + 4, r)
    # axle beam (FRONT) linking the hubs, rounded ends, with marker lamps
    sk.poly([(cx - span - 16, beam_y - 5), (cx + span + 16, beam_y - 5), (cx + span + 20, beam_y + 1),
             (cx + span + 16, beam_y + 7), (cx - span - 16, beam_y + 7), (cx - span - 20, beam_y + 1)], "b2", "front")
    sk.rect(cx - span - 14, beam_y - 4, cx + span + 14, beam_y - 2, "b3", None, outline=False)
    sk.rect(cx - span - 14, beam_y + 4, cx + span + 14, beam_y + 6, "b1", None, outline=False)
    sk.rivets(cx - span - 8, cx + span + 8, beam_y + 1, 10)
    for sx in (cx - span, cx + span):                            # hub caps on the beam
        sk.disc(sx, -CH - r + 4, 7, "b2", "front")
        sk.disc(sx, -CH - r + 4, 4, "b3", None, outline=False)
        sk.disc(sx - 1.5, -CH - r + 2.5, 1.5, "b4", None, outline=False)
    if lamps:
        for sx, side in ((cx - span - 20, -1), (cx + span + 20, 1)):
            sk.rect(sx - 2 if side > 0 else sx - 3, beam_y - 2, sx + 3 if side > 0 else sx + 2, beam_y + 5, "i1", "front")
            sk.disc(sx + side * 3, beam_y + 1.5, 2.6, "am", "front")
            sk.disc(sx + side * 3 - 0.8, beam_y + 0.6, 1.0, "ah", None, outline=False)
    if housing:
        # drive-motor housing with a gear train and a teal indicator, on top of the beam
        hx0, hx1, hy0 = cx - 26, cx + 26, beam_y - 22
        sk.poly([(hx0, beam_y - 5), (hx0 + 4, hy0), (hx1 - 4, hy0), (hx1, beam_y - 5)], "i1", "front")
        sk.rect(hx0 + 5, hy0 + 2, hx1 - 5, hy0 + 4, "s3", None, outline=False)
        for fx in range(int(hx0) + 22, int(hx1) - 6, 4):                   # cooling fins
            sk.rect(fx, hy0 + 6, fx + 2, beam_y - 7, "s2", None, outline=False)
        sk.disc(hx0 + 11, beam_y - 11, 7, "b2", "front")                  # gear train
        sk.disc(hx0 + 11, beam_y - 11, 3, "b1", None, outline=False)
        for k in range(8):
            a = k * math.pi / 4
            sk.disc(hx0 + 11 + math.cos(a) * 7, beam_y - 11 + math.sin(a) * 7, 1.3, "b3", None, outline=False)
        sk.disc(hx1 - 7, hy0 + 5, 2.2, "tl", "front")
        sk.disc(hx1 - 7.6, hy0 + 4.4, 0.8, "th", None, outline=False)
    if jaws:
        # drop plate in front of the carrier, ending in the grip jaws that clamp it from below
        sk.poly([(cx - 14, beam_y + 6), (cx + 14, beam_y + 6), (cx + 12, 12), (cx - 12, 12)], "b2", "front")
        sk.rect(cx - 12, beam_y + 8, cx - 9, 10, "b3", None, outline=False)
        sk.rivets(cx - 6, cx + 6, beam_y + 11, 6)
        # jaws: an upper and a lower claw closing on the carrier (y = -CH .. +CH)
        sk.poly([(cx - 18, -CH - 4), (cx - 8, -CH - 6), (cx - 8, -1), (cx - 18, -CH + 1)],
                "i1", "front")
        sk.poly([(cx + 18, -CH - 4), (cx + 8, -CH - 6), (cx + 8, -1), (cx + 18, -CH + 1)],
                "i1", "front")
        sk.poly([(cx - 20, CH + 5), (cx + 20, CH + 5), (cx + 16, CH - 1),
                 (cx - 16, CH - 1)], "s2", "front")
        sk.rect(cx - 18, CH + 3, cx + 18, CH + 5, "s1", None, outline=False)
        for bx in (cx - 13, cx + 13):
            sk.disc(bx, CH + 2, 1.4, "s4", None, outline=False)


def hanger(sk, px, py, link_from=CH + 4):
    """A hanger link from the lower jaw down to the pivot pin at (px, py), then two sprung struts with a tie bar
    splaying down to the saddle top."""
    sk.poly([(px - 7, link_from), (px + 7, link_from), (px + 6, py), (px - 6, py)], "b1", "front")
    sk.rect(px - 5, link_from + 1, px - 3, py - 2, "b2", None, outline=False)
    sk.disc(px, py, 7, "b2", "front")
    sk.disc(px, py, 3.5, "b1", None, outline=False)
    sk.disc(px - 1.5, py - 1.5, 1.3, "b4", None, outline=False)
    for side in (-1, 1):
        top = (px + side * 5, py + 4)
        foot = (px + side * 22, ST)
        sk.line([top, foot], "k", 10.5, "front")
        sk.line([top, foot], "b2", 8.0)
        sk.line([(top[0] - 2.2 * side, top[1]), (foot[0] - 2.2 * side, foot[1])], "b3", 2.0)
        sk.line([(top[0] + 2.4 * side, top[1] + 1), (foot[0] + 2.4 * side, foot[1])], "b1", 1.6)
        # coil-spring damper sleeve in the middle third of the strut
        for k in range(7):
            t = 0.36 + k * 0.045
            x = top[0] + (foot[0] - top[0]) * t
            y = top[1] + (foot[1] - top[1]) * t
            sk.line([(x - 4.5, y - 1.2 * side), (x + 4.5, y + 1.2 * side)], "s3", 1.8)
        # clevis foot bolted to the saddle
        fx, fy = foot
        if side == 1:                                   # tie bar between the struts
            ty = py + (ST - py) * 0.7
            dx = 5 + 17 * 0.7
            sk.rect(px - dx, ty - 2.5, px + dx, ty + 2.5, "b1", "front")
            sk.rivets(px - dx + 3, px + dx - 3, ty, 8, "b3")
        sk.rect(fx - 6, fy - 5, fx + 6, fy, "b1", "front")
        sk.disc(fx, fy - 2.5, 1.5, "b4", None, outline=False)


def hanger_wide(sk, px, py, bar_half, foot_half, link_from=CH + 4):
    """v3 stance: a short link from the lower jaw to the pivot pin, a riveted equalizer bar under it, and two
    coil-sprung struts from the bar ends splaying slightly out to two clevis feet on a wide saddle (the load path
    from the sheaves to the roof reads at a glance)."""
    sk.poly([(px - 7, link_from), (px + 7, link_from), (px + 6, py), (px - 6, py)], "b1", "front")
    sk.rect(px - 5, link_from + 1, px - 3, py - 2, "b2", None, outline=False)
    by0, by1 = py + 2, py + 8
    plate(sk, px - bar_half - 4, by0, px + bar_half + 4, by1, "front")
    sk.disc(px, py, 6.5, "b2", "front")
    sk.disc(px, py, 3.2, "b1", None, outline=False)
    sk.disc(px - 1.4, py - 1.4, 1.2, "b4", None, outline=False)
    for side in (-1, 1):
        top = (px + side * bar_half, by1 - 1)
        foot = (px + side * foot_half, ST)
        sk.line([top, foot], "k", 10.5, "front")
        sk.line([top, foot], "b2", 8.0)
        sk.line([(top[0] - 2.2 * side, top[1]), (foot[0] - 2.2 * side, foot[1])], "b3", 2.0)
        sk.line([(top[0] + 2.4 * side, top[1]), (foot[0] + 2.4 * side, foot[1])], "b1", 1.6)
        for k in range(6):                                     # coil spring round the middle of the strut
            t = 0.25 + k * 0.1
            x = top[0] + (foot[0] - top[0]) * t
            y = top[1] + (foot[1] - top[1]) * t
            sk.line([(x - 5, y - 1.0), (x + 5, y + 1.0)], "s3", 1.8)
        sk.disc(top[0], top[1], 3, "b3", None, outline=False)  # strut pin in the bar end
        fx, fy = foot
        sk.rect(fx - 7, fy - 5, fx + 7, fy, "b1", "front")      # clevis foot
        sk.disc(fx, fy - 2.5, 1.6, "b4", None, outline=False)


def carrier_guide(sk, x0, x1):
    """The braided carrier (guide only; cut out after painting)."""
    sk.rect(x0, -CH, x1, CH, "rope", "carrier")
    for x in range(int(x0), int(x1), 5):
        sk.line([(x, -CH + 1), (x + 4, CH - 1)], "rope_hi", 1.2)


def build(kind):
    use_kind(kind)
    if kind == "car":
        # rear cars: a compact carriage with the same parts, a narrower sprung stance on a short saddle
        sk = Sketch(-100, -50, 100, ST + 2)
        carrier_guide(sk, -100 - PAD + 1, 100 + PAD - 1)
        carriage(sk, 0, span=52)
        hanger_wide(sk, 0, 11, bar_half=22, foot_half=28)
    elif kind == "standard":
        sk = Sketch(-130, -50, 130, ST + 2)
        carrier_guide(sk, -130 - PAD + 1, 130 + PAD - 1)
        carriage(sk, 0, span=80)
        hanger_wide(sk, 0, 11, bar_half=62, foot_half=72)
    else:  # heavy: two carriages on a balance beam whose ends carry the sprung struts
        sk = Sketch(-170, -50, 170, ST + 2)
        carrier_guide(sk, -170 - PAD + 1, 170 + PAD - 1)
        for cx in (-72, 72):
            carriage(sk, cx, span=50, housing=True, lamps=True)
        for cx in (-72, 72):
            sk.poly([(cx - 6, CH + 4), (cx + 6, CH + 4), (cx + 6, 15), (cx - 6, 15)], "b1", "front")
        plate(sk, -104, 12, 104, 21, "front")
        for cx in (-72, 72):
            sk.disc(cx, 15, 4.5, "b2", "front")
            sk.disc(cx, 15, 2, "b1", None, outline=False)
        sk.disc(0, 16.5, 6, "b2", "front")                        # the beam's central pivot (walking beam)
        sk.disc(0, 16.5, 2.8, "b1", None, outline=False)
        for side in (-1, 1):
            top, foot = (side * 96, 20), (side * 104, ST)
            sk.line([top, foot], "k", 10.5, "front")
            sk.line([top, foot], "b2", 8.0)
            sk.line([(top[0] - 2.2 * side, top[1]), (foot[0] - 2.2 * side, foot[1])], "b3", 2.0)
            for k in range(5):
                t = 0.25 + k * 0.12
                x = top[0] + (foot[0] - top[0]) * t
                y = top[1] + (foot[1] - top[1]) * t
                sk.line([(x - 5, y - 1.0), (x + 5, y + 1.0)], "s3", 1.8)
            sk.rect(foot[0] - 7, foot[1] - 5, foot[0] + 7, foot[1], "b1", "front")
            sk.disc(foot[0], foot[1] - 2.5, 1.6, "b4", None, outline=False)
    meta = {"kind": kind, "scale": S, "unit_px": G, "pad": PAD, "origin": [round(-sk.x0 * G), round(-sk.y0 * G)],
            "size": [round(sk.w * G), round(sk.h * G)], "carrier_half": CARRIER_HALF, "saddle_top": SADDLE_TOP}
    return sk, meta


def cmd_sketch():
    INIT.mkdir(parents=True, exist_ok=True)
    for kind in ("standard", "heavy", "car"):
        sk, meta = build(kind)
        W, H = sk.img.size
        # the render canvas: multiples of 16, long side <= 2560 (the sketch fills most of it)
        cw, ch = int(math.ceil(W / 16) * 16), int(math.ceil(H / 16) * 16)
        k = min(1.0, 2560 / max(cw, ch))
        canvas = Image.new("RGB", (cw, ch), KEY)
        canvas.paste(sk.img, ((cw - W) // 2, (ch - H) // 2))
        reg = Image.new("L", (cw, ch), 0)
        reg.paste(sk.reg, ((cw - W) // 2, (ch - H) // 2))
        if k < 1:
            nw, nh = int(cw * k) // 16 * 16, int(ch * k) // 16 * 16
            canvas = canvas.resize((nw, nh), Image.LANCZOS)
            reg = reg.resize((nw, nh), Image.NEAREST)
            meta["canvas_k"] = nw / cw
        else:
            meta["canvas_k"] = 1.0
        meta["render_scale"] = S / G * meta["canvas_k"]           # render px per final px
        meta["offset"] = [(cw - W) // 2, (ch - H) // 2]
        meta["gen"] = list(canvas.size)
        canvas.save(INIT / f"{kind}-init.png")
        reg.save(INIT / f"{kind}-regions.png")
        # the final-resolution regions (exact geometry for alpha and the layer split)
        fin = sk.reg.resize((meta["size"][0], meta["size"][1]), Image.NEAREST)
        fin.save(INIT / f"{kind}-regions-final.png")
        (INIT / f"{kind}.json").write_text(json.dumps(meta, indent=1) + "\n")
        print(kind, meta)


# ------------------------------------------------------------------------------------------------ cut
def cut(cand, kind):
    use_kind(kind)
    """Candidate render -> (back RGBA, front RGBA) at final size, hull palette, selective outline."""
    meta = json.loads((INIT / f"{kind}.json").read_text())
    W, H = meta["size"]
    rs = meta["render_scale"]
    kc = meta.get("canvas_k", 1.0)
    ox, oy = meta["offset"]
    im = Image.open(cand).convert("RGB")
    # back to the sketch frame, then per-cell OKLab median down to final pixels (5x5 cells, inner 3x3)
    x0, y0 = int(round(ox * kc)), int(round(oy * kc))
    Q = 5
    crop = im.crop((x0, y0, x0 + int(round(W * rs)), y0 + int(round(H * rs)))).resize((W * Q, H * Q), Image.LANCZOS)
    lab = srgb_to_oklab(np.asarray(crop)).reshape(H, Q, W, Q, 3).transpose(0, 2, 1, 3, 4)
    cell = lab[:, :, 1:Q - 1, 1:Q - 1].reshape(H, W, -1, 3)
    med = np.median(cell, axis=2)
    reg = np.asarray(Image.open(INIT / f"{kind}-regions-final.png"))
    # despill: silhouette pixels that came out as the magenta key (the painted edge sits a pixel inside the sketch
    # outline) take the colour of their nearest non-key neighbour inside the silhouette
    key = srgb_to_oklab(np.array([KEY], np.uint8))[0]
    hue_mag = (med[..., 1] > 0.08) & (med[..., 2] < -0.04)
    keyish = (np.sqrt(((med - key) ** 2).sum(-1)) < 0.22) | hue_mag
    from scipy import ndimage
    good = (reg > 0) & ~keyish
    if keyish.any():
        _, (iy, ix) = ndimage.distance_transform_edt(~good, return_indices=True)
        med = np.where(keyish[..., None], med[iy, ix], med)
    pal = build_palette(2)
    pal_lab = srgb_to_oklab(pal)
    idx = nearest(med, pal_lab)
    rgb = pal[idx]
    front = reg == REGION["front"]
    back = reg == REGION["back"]
    # the far plate behind the carrier: fill the carrier band in BACK from the rows just above it
    oyf = meta["origin"][1]
    band = (np.arange(H)[:, None] >= oyf - CARRIER_HALF) & (np.arange(H)[:, None] <= oyf + CARRIER_HALF)
    back_rgb = rgb.copy()
    top = max(0, oyf - CARRIER_HALF - 1)
    back_rgb[band[:, 0]] = rgb[top]

    def layer(mask, src):
        a = np.zeros((H, W, 4), np.uint8)
        a[mask, :3] = src[mask]
        a[mask, 3] = 255
        return outline(a)
    return layer(back, back_rgb), layer(front, rgb), meta


def outline(a):
    from scipy import ndimage
    op = a[..., 3] > 0
    edge = op & ~ndimage.binary_erosion(op, np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]), border_value=0)
    lab = srgb_to_oklab(a[..., :3])
    dark = lab[edge].copy()
    dark[:, 0] *= 0.45
    dark[:, 1:] *= 0.7
    core = np.array([hex_to_rgb(h) for h in json.loads((ROOT / "public/palette.json").read_text())["all"]], np.uint8)
    out = a.copy()
    out[edge, :3] = core[nearest(dark[None], srgb_to_oklab(core))[0]]
    return out


def on_carrier(back, front, meta, k=3, bg=(26, 32, 52)):
    """Composite BACK, a 12-px braided carrier and FRONT on a dark backdrop at k x (the game's draw order)."""
    H, W = back.shape[:2]
    img = Image.new("RGBA", (W, H), bg + (255,))
    img.alpha_composite(Image.fromarray(back, "RGBA"))
    rope = np.zeros((H, W, 4), np.uint8)
    oy = meta["origin"][1]
    for y in range(oy - CARRIER_HALF, oy + CARRIER_HALF):
        for x in range(W):
            v = (x + y) % 6
            col = (111, 181, 154) if v == 0 else (63, 138, 116) if v < 3 else (42, 92, 82)
            if y in (oy - CARRIER_HALF, oy + CARRIER_HALF - 1):
                col = (27, 59, 56)
            rope[y, x] = col + (255,)
    img.alpha_composite(Image.fromarray(rope, "RGBA"))
    img.alpha_composite(Image.fromarray(front, "RGBA"))
    return img.convert("RGB").resize((W * k, H * k), Image.NEAREST)


def cmd_cut(cands):
    OUT.joinpath("_trolley").mkdir(parents=True, exist_ok=True)
    for c in cands:
        kind = "heavy" if "heavy" in Path(c).stem else "car" if Path(c).stem.startswith("car") else "standard"
        back, front, meta = cut(c, kind)
        name = Path(c).stem
        Image.fromarray(back).save(OUT / "_trolley" / f"{name}-back.png")
        Image.fromarray(front).save(OUT / "_trolley" / f"{name}-front.png")
        on_carrier(back, front, meta).save(OUT / "_trolley" / f"{name}-3x.png")
        print(name)


def old_trolley():
    """The Lamplighter's baked trolley (rows 0-91 over x 298-602) on the same carrier, for comparison."""
    L = np.asarray(Image.open(ROOT / "art-src" / "kit" / "lamplighter-ref.png").convert("RGBA"))
    part = L[0:100, 250:650].copy()
    H, W = 200, 400
    back = np.zeros((H, W, 4), np.uint8)
    back[76:176, :] = part
    front = np.zeros_like(back)
    return back, front, {"origin": [200, 96]}


def erase_baked(hull, box=(296, 0, 604, 92)):
    """The Lamplighter with its baked trolley removed (everything above the roof line over the trolley span)."""
    a = np.asarray(hull.convert("RGBA")).copy()
    x0, y0, x1, y1 = box
    a[y0:y1, x0:x1] = 0
    return a


SADDLE_W, SADDLE_H = 128, 16     # the roof saddle, bottom on the roof line (+72): its plate overlaps the strut feet
SADDLE = {"standard": (int(2 * (72 + 12) * 1.8), 16), "heavy": (int(2 * (104 + 12) * 1.8), 16),   # v3: wide saddles
          "car": (90, 14)}


def saddle_sprite(width=SADDLE_W, height=SADDLE_H):
    """The keyed Krea saddle plate (parts/saddle-plate:m, picked in art-src/hulls/picks-v5.json) at final size."""
    picks = json.loads((ROOT / "art-src" / "hulls" / "picks-v5.json").read_text())
    p = ROOT / "art-src" / "cand" / "parts" / "_key" / f"saddle-plate-m-{picks['saddle-plate']}.png"
    im = Image.open(p).convert("RGBA")
    return np.asarray(im.resize((width, height), Image.BOX))


def in_hull(hull_rgba, anchor, back, front, meta, saddle=None, roof=None):
    """Composite a hull + saddle + BACK + a 12-px carrier + FRONT (the game's order) for previews."""
    H = hull_rgba.shape[0] + 0
    W = hull_rgba.shape[1]
    ox, oy = meta["origin"]
    ax, ay = anchor
    img = Image.new("RGBA", (W, H), (26, 32, 52, 255))
    img.alpha_composite(Image.fromarray(hull_rgba, "RGBA"))
    if saddle is not None:
        img.alpha_composite(Image.fromarray(saddle, "RGBA"), (ax - saddle.shape[1] // 2, roof - saddle.shape[0]))
    img.alpha_composite(Image.fromarray(back, "RGBA"), (ax - ox, ay - oy))
    rope = np.zeros((H, W, 4), np.uint8)
    for y in range(ay - CARRIER_HALF, ay + CARRIER_HALF):
        for x in range(W):
            v = (x + y) % 6
            col = (111, 181, 154) if v == 0 else (63, 138, 116) if v < 3 else (42, 92, 82)
            if y in (ay - CARRIER_HALF, ay + CARRIER_HALF - 1):
                col = (27, 59, 56)
            rope[y, x] = col + (255,)
    img.alpha_composite(Image.fromarray(rope, "RGBA"))
    img.alpha_composite(Image.fromarray(front, "RGBA"), (ax - ox, ay - oy))
    return img


def cmd_sheet(picks):
    """3x: the old trolley and the picked standard/heavy candidates on a carrier."""
    from PIL import ImageDraw
    tiles = [("old (baked into lamplighter.png)", *old_trolley())]
    for c in picks:
        kind = "heavy" if "heavy" in Path(c).stem else "car" if Path(c).stem.startswith("car") else "standard"
        b, f, m = cut(c, kind)
        tiles.append((f"{kind}: {Path(c).stem}", b, f, m))
    ims = [(t, on_carrier(b, f, m)) for t, b, f, m in tiles]
    # in context: the Lamplighter with its baked trolley erased, the new standard carriage on its saddle
    std = [x for x in tiles[1:] if "standard" in x[0]]
    if std:
        t, b, f, m = std[0]
        L = Image.open(ROOT / "art-src" / "kit" / "lamplighter-ref.png")
        hull = erase_baked(L)
        P = 80
        pad = np.zeros((hull.shape[0] + P, hull.shape[1], 4), np.uint8)
        pad[P:] = hull
        try:
            sad = saddle_sprite(*SADDLE["standard"])
        except (FileNotFoundError, KeyError):
            sad = None
        comp = in_hull(pad, (450, 20 + P), b, f, m, sad, roof=92 + P)
        ims.append(("in context: lamplighter.png with the baked trolley erased + " + t.split(": ")[1] + " (1x)",
                    comp.convert("RGB")))
        ims.append(("same, 3x crop", comp.crop((250, 0, 650, 200)).convert("RGB").resize((1200, 600), Image.NEAREST)))
    W = max(im.width for _, im in ims) + 40
    H = sum(im.height + 40 for _, im in ims) + 20
    sh = Image.new("RGB", (W, H), (12, 14, 24))
    d = ImageDraw.Draw(sh)
    y = 10
    for t, im in ims:
        d.text((20, y), t + "  (3x; draw order BACK -> carrier -> FRONT)", fill=(233, 223, 196))
        sh.paste(im, (20, y + 22))
        y += im.height + 40
    OUT.mkdir(parents=True, exist_ok=True)
    sh.save(OUT / "trolley.png")
    print("sheet", OUT / "trolley.png")


SHEAVES = {"standard": [(-80, 22), (80, 22)], "heavy": [(-122, 22), (-22, 22), (22, 22), (122, 22)],
           "car": [(-52, 22), (52, 22)]}
FRAMES = 4                        # sheave rotation frames (6 spokes: 60 deg period, 15 deg per frame)


def sheave_frames(back, meta, kind):
    use_kind(kind)
    """Frames of the BACK layer with each sheave's web (inside the rim) turned by k * 15 degrees (nearest)."""
    H, W = back.shape[:2]
    ox, oy = meta["origin"]
    out = [back]
    for k in range(1, FRAMES):
        f = back.copy()
        for sx, r in SHEAVES[kind]:
            cx, cy = ox + sx * G, oy + (-CH - r + 4) * G
            rin = (r - 3.2) * G
            x0, y0 = int(cx - rin - 2), int(cy - rin - 2)
            x1, y1 = int(cx + rin + 3), int(cy + rin + 3)
            patch = Image.fromarray(back[y0:y1, x0:x1])
            rot = np.asarray(patch.rotate(-15 * k, resample=Image.NEAREST, center=(cx - x0, cy - y0)))
            yy, xx = np.mgrid[y0:y1, x0:x1]
            disc = (xx - cx) ** 2 + (yy - cy) ** 2 <= rin ** 2
            reg = f[y0:y1, x0:x1]
            ok = disc & (rot[..., 3] > 0) & (reg[..., 3] > 0)
            reg[ok] = rot[ok]
        out.append(f)
    return out


def cmd_final(kind, cand):
    """Write public/art/ships/trolley-<kind>-back.png / -front.png (FRAMES frames side by side; the front repeats)
    and the ships.json "trolley-<kind>" geometry entry C's renderer reads: {w, h, saddle (the carrier point in the
    layer), frames, density 2, source}."""
    back, front, meta = cut(cand, kind)
    frames = sheave_frames(back, meta, kind)
    H, W = back.shape[:2]
    strip_b = np.concatenate(frames, 1)
    strip_f = np.concatenate([front] * FRAMES, 1)
    PUB.mkdir(parents=True, exist_ok=True)
    Image.fromarray(strip_b).save(PUB / f"trolley-{kind}-back.png", optimize=True)
    Image.fromarray(strip_f).save(PUB / f"trolley-{kind}-front.png", optimize=True)
    ships_path = PUB / "ships.json"
    ships = json.loads(ships_path.read_text())
    ships[f"trolley-{kind}"] = {"w": W, "h": H, "saddle": {"x": meta["origin"][0], "y": meta["origin"][1]},
                                "frames": FRAMES, "density": 2, "saddleTop": SADDLE_TOP,
                                "carrierHalf": CARRIER_HALF, "source": str(Path(cand).resolve().relative_to(ROOT))}
    ships_path.write_text(json.dumps(ships, indent=1) + "\n")
    print("final", kind, ships[f"trolley-{kind}"])
    return back, front, meta


def snap_hull_palette(a):
    """Snap an RGBA sprite to the hull palette (master ramps + 2 in-between steps), keep alpha."""
    pal = build_palette(2)
    out = a.copy()
    op = a[..., 3] > 0
    out[op, :3] = pal[nearest(srgb_to_oklab(a[..., :3][op])[None], srgb_to_oklab(pal))[0]]
    return out


def cmd_lamplighter():
    """The Lamplighter without its baked trolley: erase everything above the roof line over the trolley span,
    paste the standard saddle on the roof at the cable anchor, set ships.json trolley fields."""
    src = ROOT / "art-src" / "kit" / "lamplighter-ref.png"          # the shipped final before this edit
    hull = erase_baked(Image.open(src))
    w, h = SADDLE["standard"]
    sad = snap_hull_palette(saddle_sprite(w, h))
    ships_path = PUB / "ships.json"
    ships = json.loads(ships_path.read_text())
    e = ships["lamplighter"]
    cx, cy = e["cable"]["x"], e["cable"]["y"]
    roof = cy + 72
    img = Image.fromarray(hull, "RGBA")
    img.alpha_composite(Image.fromarray(sad, "RGBA"), (cx - w // 2, roof - h))
    img.save(PUB / "lamplighter.png", optimize=True)
    e["trolley"] = {"kind": "standard", "pivot": {"x": cx, "y": roof}, "saddle": {"x": cx, "y": cy}}
    ships_path.write_text(json.dumps(ships, indent=1) + "\n")
    man_path = ROOT / "art-src" / "manifest.json"
    man = json.loads(man_path.read_text())
    import datetime
    import hashlib
    rec = man["ships"]["lamplighter"]
    rec["trolley_edit"] = {"date": datetime.date.today().isoformat(),
                           "note": "A2: baked trolley erased (x 296-604 above y 92); standard saddle plate pasted; "
                                   "the drive trolley is now the separate layered trolley-standard art",
                           "saddle": "art-src/cand/parts/_key (parts/saddle-plate:m, art-src/hulls/picks-v5.json)",
                           "before_sha256": hashlib.sha256(src.read_bytes()).hexdigest()}
    rec["sha256"] = hashlib.sha256((PUB / "lamplighter.png").read_bytes()).hexdigest()
    man_path.write_text(json.dumps(man, indent=1, sort_keys=True) + "\n")
    print("lamplighter edited", e["trolley"])


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "sketch":
        cmd_sketch()
    elif cmd == "cut":
        cmd_cut(sys.argv[2:])
    elif cmd == "sheet":
        cmd_sheet(sys.argv[2:])
    elif cmd == "final":
        cmd_final(sys.argv[2], sys.argv[3])
    elif cmd == "lamplighter":
        cmd_lamplighter()
