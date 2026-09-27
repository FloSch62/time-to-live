"""System icons (contract v3, hi-bit): engraved relief glyphs on bevelled tarnished-brass switchboard plates.

Each glyph is vector geometry in a 28-unit design box, rendered natively at the target size (28 on the 40 px plate,
24 for the 28 px `-sm` icons, 36 for the 40 px emblem silhouettes). A glyph returns named masks:
  body  - the relief (shaded ivory / steel by power state)
  cut   - grooves engraved into the body
  glow  - small lit accents (teal / dark / ember / violet by power state)
"""
from __future__ import annotations

import math

import numpy as np

import hd
from icons_hd import R, Shape, contour, dome, fill, lamp, outline, shade
from px import Img, idx

SYSTEMS = ["shields", "engines", "weapons", "air", "medbay", "helm", "sensors", "doors", "drones", "veil", "reactor"]
STATES = ["powered", "unpowered", "damaged", "ionised"]

BODY = {"powered": R["ivory"], "unpowered": R["steel-dark"], "damaged": R["ivory-dim"], "ionised": R["steel"]}
GLOW = {"powered": R["teal"], "unpowered": R["dark-glow"], "damaged": R["ember"], "ionised": R["violet"]}


class G:
    """Scaled drawing into a size x size canvas from a 28-unit design box."""

    def __init__(self, size):
        self.n = size
        self.k = size / 28.0
        self.S = Shape(size)

    def p(self, x, y):
        return (x * self.k, y * self.k)

    def wd(self, w):
        return max(1.0, w * self.k)

    def rect(self, x, y, w, h):
        return self.S.rect(x * self.k, y * self.k, w * self.k, h * self.k)

    def rrect(self, x, y, w, h, r):
        return self.S.rrect(x * self.k, y * self.k, w * self.k, h * self.k, r * self.k)

    def chamfer(self, x, y, w, h, c):
        return self.S.chamfer(x * self.k, y * self.k, w * self.k, h * self.k, c * self.k)

    def circle(self, x, y, r):
        return self.S.circle(x * self.k, y * self.k, max(0.7, r * self.k))

    def ellipse(self, x, y, rx, ry):
        return self.S.ellipse(x * self.k, y * self.k, rx * self.k, ry * self.k)

    def ring(self, x, y, ro, ri):
        return self.S.ring(x * self.k, y * self.k, ro * self.k, ri * self.k)

    def poly(self, pts):
        return self.S.poly([self.p(*q) for q in pts])

    def line(self, a, b, w=1.0, w1=None):
        return self.S.line(self.p(*a), self.p(*b), self.wd(w), self.wd(w1) if w1 is not None else None)

    def polyline(self, pts, w=1.0):
        return self.S.polyline([self.p(*q) for q in pts], self.wd(w))

    def arc(self, x, y, r, thick, a0, a1):
        return self.S.arc(x * self.k, y * self.k, r * self.k, max(1.0, thick * self.k), a0, a1)

    def empty(self):
        return self.S.empty()


# ══ glyph designs (28-unit box) ══════════════════════════════════════════════════════════════════════════
def g_shields(g: G):
    """Ward mesh: a crest framing a lattice of ward-wire; a few charged nodes where the wires cross."""
    outer = g.poly([(3, 2), (25, 2), (25, 13), (23.5, 18.5), (14, 26.5), (4.5, 18.5), (3, 13)])
    inner = g.poly([(5.8, 4.8), (22.2, 4.8), (22.2, 12.6), (21.0, 17.2), (14, 23.0), (7.0, 17.2), (5.8, 12.6)])
    rim = outer & ~inner
    X, Y = g.S.X / g.k, g.S.Y / g.k
    pitch = 6.0
    a = np.mod(X - Y + 14 + 40, pitch)
    b = np.mod(X + Y - 14 + 40, pitch)
    tol = 0.5 / g.k
    wa = (np.minimum(a, pitch - a) <= tol)
    wb = (np.minimum(b, pitch - b) <= tol)
    wires = (wa | wb) & inner
    nodes = g.empty()
    for (nx, ny) in ((14, 9), (9, 14), (19, 14), (14, 19)):
        nodes |= g.circle(nx, ny, 1.3)
    return {"body": rim | wires, "glow": nodes & inner, "cut": inner & ~wires & ~nodes}


def g_engines(g: G):
    """Drive trolley: two spoked wheels riding the braided carrier, hangers down to the drive housing."""
    body = g.empty()
    cut = g.empty()
    X, Y = g.S.X / g.k, g.S.Y / g.k
    for cx in (7.5, 20.5):
        body |= g.circle(cx, 7.5, 6.2)
        cut |= g.ring(cx, 7.5, 5.0, 4.2)  # tread groove
        r = np.hypot(X - cx, Y - 7.5)
        ang = np.degrees(np.arctan2(Y - 7.5, X - cx)) % 120
        cut |= (r > 1.9) & (r < 3.7) & (ang > 18) & (ang < 102)  # three spoke windows
    cable = g.rect(0, 12.2, 28, 2.6)
    body |= cable
    for x in range(-1, 28, 3):
        cut |= g.line((x, 12.3), (x + 1.8, 14.7), 0.9) & cable
    body |= g.rect(6.4, 8, 2.2, 11) | g.rect(19.4, 8, 2.2, 11)
    housing = g.rrect(3, 18.5, 22, 7.5, 1.5)
    body |= housing
    glow = g.rect(8, 21, 12, 1.2) | g.rect(8, 23.4, 12, 1.2)
    cut |= (g.rect(7, 20.2, 14, 0.8) | g.rect(7, 22.2, 14, 1.2) | g.rect(7, 24.6, 14, 0.8)) & housing
    cut |= g.circle(5.3, 22.2, 0.8) | g.circle(22.7, 22.2, 0.8)
    return {"body": body, "glow": glow, "cut": cut}


def g_weapons(g: G):
    """Signal emitter on a roof mount: finned barrel, glass lens at the muzzle, light ticks."""
    barrel = g.rrect(1, 7.5, 19, 7.5, 1.4)
    fins = g.empty()
    for x in (4, 7, 10, 13, 16):
        fins |= g.rect(x, 4, 1.6, 4)
    body = barrel | fins
    body |= g.poly([(6, 15), (15, 15), (16.5, 20), (4.5, 20)])
    body |= g.rrect(2, 20, 17, 3.5, 1)
    body |= g.rect(19.5, 8.5, 2, 5.5)
    cut = g.rect(2.5, 10.8, 15, 0.9) | g.circle(4.5, 21.7, 0.8) | g.circle(16.5, 21.7, 0.8)
    glow = g.circle(23.3, 11.2, 3.2)
    glow |= g.line((26.8, 6.5), (27.8, 5.5), 1) | g.line((27.2, 11.2), (28, 11.2), 1) | g.line((26.8, 16), (27.8, 17), 1)
    return {"body": body, "glow": glow, "cut": cut}


def g_air(g: G):
    """Air plant: an impeller in its housing ring, twisted blades, lit hub."""
    X, Y = g.S.X / g.k, g.S.Y / g.k
    r = np.hypot(X - 14, Y - 14)
    ang = np.degrees(np.arctan2(Y - 14, X - 14))
    twist = (ang - r * 5.5) % 60
    blades = (r < 10.6) & (r > 3.2) & (twist < 27)
    housing = g.ring(14, 14, 13.4, 11.6)
    body = blades | housing | g.circle(14, 14, 3.4)
    cut = g.ring(14, 14, 3.5, 2.6)
    for a in (45, 135, 225, 315):
        x, y = 14 + 12.5 * math.cos(math.radians(a)), 14 - 12.5 * math.sin(math.radians(a))
        cut |= g.circle(x, y, 0.6)
    glow = g.circle(14, 14, 1.9)
    return {"body": body, "glow": glow, "cut": cut}


def g_medbay(g: G):
    """Bench infirmary: a kettle on a bench, the warming plate lit."""
    kettle = g.ellipse(13, 13.5, 8.4, 6.6) & g.rect(0, 0, 28, 18.8)
    lid = g.ellipse(13, 7.4, 4.2, 1.8)
    knob = g.circle(13, 5.3, 1.3)
    spout = g.line((19.5, 13.5), (25.5, 8), 3.0, 1.8)
    handle = g.arc(5.2, 12.5, 4.3, 1.8, 95, 265)
    bench = g.rect(1.5, 20.4, 25, 2.6)
    legs = g.rect(3.5, 23, 2, 4.5) | g.rect(22.5, 23, 2, 4.5)
    body = kettle | lid | knob | spout | handle | bench | legs
    cut = g.rect(6, 12.4, 14, 0.9) & kettle
    glow = g.rect(7.5, 19, 11, 1.2)
    steam = g.polyline([(25.5, 5.8), (24.6, 4), (25.6, 2.3)], 0.9)
    return {"body": body | steam, "glow": glow, "cut": cut}


def g_helm(g: G):
    """Helm: the two-pane cab window above the driving board, gauges, and the drive lever."""
    frame = g.chamfer(2, 1.5, 24, 11, 2.5)
    window = g.chamfer(4.5, 3.8, 19, 6.4, 1.5)
    mullion = g.rect(13.2, 3, 1.6, 8)
    board = g.poly([(1.5, 13.5), (26.5, 13.5), (24.5, 19.5), (3.5, 19.5)])
    stand = g.rect(11, 19.5, 6, 5) | g.rrect(6, 24.2, 16, 2.8, 1)
    lever = g.line((19.5, 17), (24.5, 12.5), 1.6)
    body = (frame & ~window) | (mullion & frame) | board | stand | lever | g.circle(24.8, 12.2, 1.7)
    carrier = g.line((4.5, 7.2), (23.5, 5.4), 1.0) & window & ~mullion
    glow = g.circle(7, 16.5, 1.5) | g.circle(11.5, 16.5, 1.5)
    cut = window & ~mullion & ~carrier
    cut |= g.rect(3.5, 18, 21, 0.8) & board
    return {"body": body | carrier, "glow": glow, "cut": cut}


def g_sensors(g: G):
    """Listening post: a flared horn turned to the dark, its pipe down to the mount."""
    cone = g.poly([(4.5, 1.8), (16.5, 9.4), (16.5, 12.6), (4.5, 20.2)])
    mouth = g.ellipse(4.6, 11, 2.6, 9.2)
    throat = g.ellipse(4.2, 11, 1.4, 7.4)
    pipe = g.polyline([(16, 11), (21, 11), (23.5, 13.5), (23.5, 21)], 3.0)
    mount = g.rrect(18.5, 21, 10, 3, 1) | g.rect(20.5, 24, 6, 3)
    body = (cone | mouth | pipe | mount) & ~throat
    cut = g.line((9, 5), (9, 17), 0.9) & cone
    cut |= g.line((12.8, 7.5), (12.8, 14.5), 0.9) & cone
    glow = g.circle(21, 11, 1.2) | g.arc(4.5, 11, 12.5, 1, 150, 210) & g.rect(0, 0, 3, 28)
    return {"body": body, "glow": glow, "cut": cut | (throat & mouth)}


def g_doors(g: G):
    """Bulkheads: a knife-switch — base plate, pivot block, raised blade, contact clips."""
    base = g.rrect(1.5, 20, 25, 5.5, 1.2)
    pivot = g.rrect(3, 14, 7, 6.5, 1)
    clip = g.rect(18, 12, 1.8, 8.5) | g.rect(22.2, 12, 1.8, 8.5) | g.rect(18, 18.5, 6, 2)
    blade = g.line((6.5, 16.5), (20.5, 4.5), 2.8)
    handle = g.line((19, 2.8), (23.8, 7.2), 2.8)
    body = base | pivot | clip | blade | handle
    cut = g.circle(4.5, 22.8, 0.8) | g.circle(23.5, 22.8, 0.8) | g.line((8, 15.2), (19.5, 5.4), 0.8) & blade
    glow = g.circle(6.5, 16.8, 1.4) | g.rect(19.8, 15, 2.4, 1.2)
    return {"body": body, "glow": glow, "cut": cut}


def g_drones(g: G):
    """Drone bay: one of the Line's drones — rotor bar, hub, hull with a lamp lens, landing legs."""
    rotor = g.rrect(1, 2.5, 26, 2.2, 1)
    hub = g.rect(12.6, 4.5, 2.8, 4)
    hull = g.ellipse(14, 13.5, 10.2, 5.6)
    legs = g.line((8, 17.5), (5, 24), 1.6) | g.line((20, 17.5), (23, 24), 1.6)
    feet = g.rect(2.5, 23.6, 5, 1.8) | g.rect(20.5, 23.6, 5, 1.8)
    body = rotor | hub | hull | legs | feet
    cut = g.ellipse(14, 15.2, 6.4, 2.8) & hull
    glow = g.ellipse(14, 15.2, 4.6, 1.6)
    cut |= g.line((4.5, 12.5), (8, 12.5), 0.9) | g.line((20, 12.5), (23.5, 12.5), 0.9)
    return {"body": body, "glow": glow, "cut": cut & ~glow}


def g_veil(g: G):
    """Lamp-dark veil: a bell-shaped hood lowered over the lamp; shutter slats close its mouth."""
    X, Y = g.S.X / g.k, g.S.Y / g.k
    t = np.clip((Y - 2) / 22.0, 0, 1)
    half = 4.2 + 8.8 * t ** 0.55
    outer = (Y >= 2) & (Y <= 24) & (np.abs(X - 14) <= half)
    outer |= g.ellipse(14, 3.2, 4.2, 2.2)
    outer |= g.rect(12.8, 0, 2.4, 2)  # hanger eye
    mouth = (Y >= 13) & (Y <= 24) & (np.abs(X - 14) <= half - 2.4)
    body = outer & ~mouth
    slats = (g.rect(0, 15.5, 28, 1.3) | g.rect(0, 19, 28, 1.3) | g.rect(0, 22.5, 28, 1.5)) & mouth
    body |= slats
    glow = g.ellipse(14, 17.8, 4.2, 1.6) & mouth & ~slats
    cut = mouth & ~slats & ~glow
    cut |= (g.line((9, 6), (7.5, 12.5), 0.9) | g.line((19, 6), (20.5, 12.5), 0.9)) & outer
    return {"body": body, "glow": glow, "cut": cut}


def g_reactor(g: G):
    """Reactor: a valve tube — glass envelope, anode plates, lit filament, ridged socket and pins."""
    envelope = g.rrect(7.5, 2.5, 13, 18.5, 5.5)
    glass = g.rrect(9, 4, 10, 15.5, 4.3)
    cap = g.rect(11.5, 0.5, 5, 2.2)
    socket = g.rrect(5.5, 20, 17, 5, 1)
    pins = g.rect(8, 25, 1.4, 2.5) | g.rect(13.3, 25, 1.4, 2.5) | g.rect(18.6, 25, 1.4, 2.5)
    plates = g.rect(10.2, 8, 1.6, 9) | g.rect(16.2, 8, 1.6, 9)
    body = (envelope & ~glass) | cap | socket | pins | plates
    cut = g.rect(5.5, 21.8, 17, 0.9) & socket
    fil = g.polyline([(14, 17.5), (12.8, 15.5), (15.2, 13.5), (12.8, 11.5), (15.2, 9.5), (14, 7.5)], 1.0)
    return {"body": body, "glow": fil, "cut": cut | (glass & ~fil & ~plates)}


GLYPHS = {
    "shields": g_shields, "engines": g_engines, "weapons": g_weapons, "air": g_air, "medbay": g_medbay,
    "helm": g_helm, "sensors": g_sensors, "doors": g_doors, "drones": g_drones, "veil": g_veil, "reactor": g_reactor,
}


def glyph_masks(sid, size):
    g = G(size)
    parts = GLYPHS[sid](g)
    body = parts["body"] & ~parts["glow"]
    cut = parts["cut"] & ~parts["glow"]
    return body, cut, parts["glow"]


def render_glyph(sid, size, state) -> Img:
    """Engraved relief glyph (size x size canvas, 1 px of margin used by the outline)."""
    body, cut, glow = glyph_masks(sid, size)
    img = Img(size, size)
    solid = body & ~cut
    shade(img, solid, BODY[state], "bevel", width=1 if size < 30 else 2, ambient=0.22)
    # grooves: darkest step of the body ramp, lower-right lip one step lighter than the face
    img.a[cut & body] = idx(BODY[state][0])
    img.a[cut & ~body] = idx("k0")
    # lit accents: brighter centre, darker rim
    inner = glow.copy()
    inner[1:, :] &= glow[:-1, :]
    inner[:-1, :] &= glow[1:, :]
    inner[:, 1:] &= glow[:, :-1]
    inner[:, :-1] &= glow[:, 1:]
    img.a[glow] = idx(GLOW[state][2])
    img.a[inner] = idx(GLOW[state][-2])
    if state == "damaged":
        crack(img, solid | glow, size)
    elif state == "ionised":
        flicker(img, solid | glow, size)
    outline(img, None, "k0")
    return img


def crack(img: Img, mask, size):
    """A jagged ember crack running down-left across the glyph."""
    k = size / 28.0
    pts = [(21, 4), (18.5, 8), (19.5, 10), (15.5, 13.5), (16.2, 15.5), (11.5, 19), (12, 21), (7.5, 25)]
    S = Shape(size)
    line = S.polyline([(x * k, y * k) for x, y in pts], 1.0)
    hot = line & mask
    img.a[hot] = idx("e2")
    # a lit spot where the crack is widest
    for (x, y) in pts[2:4]:
        if 0 <= int(y * k) < size and 0 <= int(x * k) < size and mask[int(y * k), int(x * k)]:
            img.put(int(x * k), int(y * k), "e3")
    # dark shoulders under the crack
    sh = np.zeros_like(hot)
    sh[1:, :] |= hot[:-1, :]
    img.a[sh & mask & ~hot] = idx("e0")


def flicker(img: Img, mask, size):
    """A violet flicker line crawling through the glyph."""
    k = size / 28.0
    S = Shape(size)
    pts = [(0.5, 14), (4, 12), (7, 15.5), (11, 12.5), (14, 15), (17.5, 12), (21, 15), (24.5, 12.5), (27.5, 14)]
    line = S.polyline([(x * k, y * k) for x, y in pts], 1.0)
    img.a[line & mask] = idx("v3")
    img.a[line & ~mask] = idx("v1")
    mid = S.circle(14 * k, 15 * k, 1.0)
    img.a[mid & line] = idx("v4")


# ══ plate ════════════════════════════════════════════════════════════════════════════════════════════════
PLATE_BRASS = {"powered": R["brass"], "unpowered": ["k1", "k2", "c0", "b0", "b0h", "b1", "b1h"],
               "damaged": R["brass"], "ionised": R["brass"]}


def plate(state, size=40) -> Img:
    """Bevelled tarnished-brass switchboard plate: chamfered rim, 4 domed rivets, recessed field, status lamp."""
    S = Shape(size)
    img = Img(size, size)
    outer = S.chamfer(1, 1, size - 2, size - 2, 5)
    field = S.chamfer(5, 5, size - 10, size - 10, 3)
    rim = outer & ~field
    shade(img, rim, PLATE_BRASS[state], "bevel", width=2, ambient=0.25)
    # recessed field: dark, inner shadow top-left, faint catch-light bottom-right
    fill(img, field, "k1")
    shadow = field & ~np.roll(np.roll(field, 2, 0), 2, 1)
    img.a[shadow] = idx("k0")
    catch = field & ~np.roll(np.roll(field, -1, 0), -1, 1)
    img.a[catch & ~shadow] = idx("k2h")
    for (cx, cy) in ((4.5, 4.5), (size - 4.5, 4.5), (4.5, size - 4.5), (size - 4.5, size - 4.5)):
        dome(img, cx, cy, 1.6, ["k2", "b0", "b1", "b1h", "b2h", "b3"])
    outline(img, None, "k0")
    # status lamp in the top rim
    hi = {"powered": R["teal"], "unpowered": None, "damaged": R["ember"], "ionised": R["violet"]}[state]
    cx = size / 2
    img.a[S.ellipse(cx, 3.0, 4.2, 2.6)] = idx("k0")
    if hi:
        m = S.ellipse(cx, 3.0, 3.0, 1.5)
        shade(img, m, hi, "sphere", sphere=(cx, 3.0, 3.0, 1.5), ambient=0.4)
        img.put(int(cx) - 1, 2, hi[-1])
        # a faint halo on the rim either side
        for dx in (-5, 4):
            img.put(int(cx) + dx, 3, hi[1])
    else:
        m = S.ellipse(cx, 3.0, 3.0, 1.5)
        fill(img, m, "k2")
        img.put(int(cx) - 1, 2, "k4")
    return img


def sys_icon(sid, state, small=False) -> Img:
    if small:
        g = render_glyph(sid, 26, state)
        out = Img(28, 28)
        out.blit(g, 1, 1)
        # a small status lamp tucked into the top-right corner when it is free
        S = Shape(28)
        spot = S.circle(24.5, 3.5, 3.2)
        if not (out.a[spot] >= 0).any():
            lamp_ramp = {"powered": R["teal"], "unpowered": None, "damaged": R["ember"], "ionised": R["violet"]}[state]
            if lamp_ramp:
                lamp(out, 24.5, 3.5, 1.7, lamp_ramp)
            else:
                lamp(out, 24.5, 3.5, 1.7, R["glass"], lit=False)
        return out
    img = plate(state)
    g = render_glyph(sid, 30, state)
    img.blit(g, 5, 6)
    return img


def system_glyph(sid) -> Img:
    """40x40 single-colour ('i4') silhouette of the system glyph, no outline; engraved cuts stay transparent."""
    body, cut, glow = glyph_masks(sid, 36)
    m = (body | glow) & ~cut
    img = Img(40, 40)
    sub = Img(36, 36)
    sub.a[m] = idx("i4")
    img.blit(sub, 2, 2)
    return img
