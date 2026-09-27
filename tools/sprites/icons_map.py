"""Relay beacons and the Lamplighter map marker (contract v3, hi-bit).

Beacons (40x40) are relay lamps: a bevelled tarnished-brass bezel, mostly dark glass with a reflection, and a small
lit mark burning in the glass in the kind's colour. The marker is the cable car hanging from its trolley on a
braided carrier (56x32, `-sm` 36x20), nose right.
"""
from __future__ import annotations

import math

import numpy as np

from icons_hd import R, Shape, dome, fill, lamp, outline, shade
from px import Img, idx

N = 40
C = 20.0

# kind -> (dim symbol colour, bright pixel colour)
MARK = {
    "unknown": ("i0h", "i2"), "combat": ("e1", "e2h"), "event": ("t0h", "t2"), "market": ("b1h", "b3"),
    "bench": ("g1", "g2h"), "distress": ("a0", "a1h"), "sealed": ("v1", "e1h"),
}


def bezel(img: Img, r_out=18.5, r_in=13.2, ramp=None, rivets=True):
    S = Shape(N)
    ring = S.ring(C, C, r_out, r_in)
    shade(img, ring, ramp or R["brass"], "bevel", width=2, ambient=0.22)
    img.a[S.ring(C, C, r_out, r_out - 0.9) & (S.X + S.Y > 2 * C + 6)] = idx("b0")
    if rivets:
        for a in (45, 135, 225, 315):
            x, y = S.at(C, C, (r_out + r_in) / 2, a)
            dome(img, x, y, 1.3, ["k2", "b0", "b1", "b1h", "b2h", "b3"])


def glass(img: Img, r=13.2):
    S = Shape(N)
    img.a[S.circle(C, C, r)] = idx("k0")
    shade(img, S.circle(C, C, r - 1), R["glass"], "sphere", sphere=(C + 2, C + 2, r + 2, r + 2), ambient=0.1)
    refl = S.arc(C, C, r - 3.2, 1.2, 105, 160)
    img.a[refl] = idx("k4")
    img.a[S.arc(C, C, r - 3.2, 1.2, 118, 135)] = idx("k4h")


def symbol(kind) -> tuple:
    """(dim mask, bright mask) of the lit mark burning in the glass (drawn in a 40x40 canvas, centred)."""
    S = Shape(N)
    if kind == "unknown":
        dim = S.arc(C, 16.5, 4.2, 2, -60, 180) | S.line((C + 2.1, 19.8), (C, 22.5), 2) | S.line((C, 22.5), (C, 24), 2)
        bright = S.circle(C, 27.5, 1.3)
    elif kind == "combat":
        dim = S.poly([(C + 2, 11), (C - 4.5, 21), (C - 0.5, 21), (C - 2.5, 29), (C + 4.5, 18.5), (C + 0.5, 18.5),
                      (C + 3.5, 11)])
        bright = S.circle(C - 0.5, 20, 1.2)
    elif kind == "event":
        env = S.rect(C - 7, C - 4.5, 14, 10)
        flap = S.line((C - 6.5, C - 4), (C, C + 1.2), 1.4) | S.line((C + 6.5, C - 4), (C, C + 1.2), 1.4)
        dim = env & ~S.rect(C - 5.8, C - 3.3, 11.6, 7.6) | flap
        bright = S.circle(C, C + 1, 1.2)
    elif kind == "market":
        dim = S.ring(C, C, 7, 2.3)
        X, Y = S.X, S.Y
        ang = (np.degrees(np.arctan2(Y - C, X - C)) + 360) % 60
        dim &= ~((np.hypot(X - C, Y - C) > 5.6) & (ang < 16))
        bright = S.circle(C - 3.5, C - 3.5, 1.1)
    elif kind == "bench":
        kettle = S.ellipse(C - 1, C + 2.5, 6, 4.5) & S.rect(0, 0, N, C + 6)
        dim = kettle | S.line((C + 4, C + 2), (C + 8, C - 1.5), 1.8) | S.rect(C - 7, C + 6.5, 12, 1.6)
        dim |= S.ellipse(C - 1, C - 2.2, 2.6, 1.1)
        bright = S.line((C + 7.5, C - 5), (C + 6.5, C - 8), 1)
    elif kind == "distress":
        dim = S.rect(C - 1.5, 11, 3, 12)
        bright = S.rect(C - 1.5, 25.5, 3, 3) | S.rect(C - 1.5, 11, 3, 2)
    elif kind == "sealed":
        dim = S.line((C - 6, C - 6), (C + 6, C + 6), 1.8) | S.line((C + 6, C - 6), (C - 6, C + 6), 1.8)
        bright = S.circle(C, C, 1.4)
    return dim, bright


def lamp_beacon(kind) -> Img:
    img = Img(N, N)
    bezel(img)
    glass(img)
    dim, bright = symbol(kind)
    col, hot = MARK[kind]
    img.a[dim] = idx(col)
    img.a[bright] = idx(hot)
    outline(img, None, "k0")
    return img


def beacons():
    out = {}
    S = Shape(N)
    for i in range(4):
        img = Img(N, N)
        rr = [14.5, 16.0, 17.5, 19.0][i]
        col = ["a0", "b1h", "b1", "b0h"][i]
        img.a[S.ring(C, C, rr, rr - 1.0)] = idx(col)
        core = Img(N, N)
        bezel(core, 12.5, 9.0, rivets=False)
        glass(core, 9.0)
        core.a[S.circle(C, C, 5.2)] = idx("b0")
        shade(core, S.circle(C, C, 4.4), ["a0", "a0h", "a1", "a1h", "a2"], "sphere",
              sphere=(C, C, 4.4, 4.4), ambient=0.35)
        core.put(int(C) - 2, int(C) - 2, "a3")
        outline(core, None, "k0")
        img.blit(core, 0, 0)
        out[f"beacon-current-{i}"] = img
    img = Img(N, N)
    bezel(img, 10.5, 7.5, ramp=R["steel-dark"], rivets=False)
    glass(img, 7.5)
    img.a[S.circle(C, C, 1.2)] = idx("k4")
    outline(img, None, "k0")
    out["beacon-visited"] = img
    for kind in ("unknown", "combat", "event", "market", "bench", "distress", "sealed"):
        out[f"beacon-{kind}"] = lamp_beacon(kind)
    for name, lo, hi in (("beacon-ring-hover", "i0", "i2"), ("beacon-ring-select", "t0h", "t2")):
        img = Img(N, N)
        ring = S.ring(C, C, 19.6, 18.7)
        img.a[ring] = idx(lo)
        img.a[ring & (S.X + S.Y < 2 * C - 4)] = idx(hi)
        for a in (0, 90, 180, 270):
            x, y = S.at(C, C, 17.2, a)
            img.a[S.circle(x, y, 0.9)] = idx(hi)
        out[name] = img
    out["beacon-hazard"] = hazard_plate()
    out["beacon-exit"] = exit_beacon()
    out["beacon-seal-front"] = seal_front()
    out["beacon-cut"] = cut_carrier()
    return out


def hazard_plate() -> Img:
    """A stencilled warning plate: dark riveted steel, an amber stencil triangle with a bar and a dot."""
    S = Shape(N)
    img = Img(N, N)
    plate = S.chamfer(1.5, 5, 37, 30, 3)
    shade(img, plate, R["steel-dark"], "bevel", width=2, ambient=0.25)
    for x, y in ((5, 8.5), (35, 8.5), (5, 31.5), (35, 31.5)):
        dome(img, x, y, 1.3, ["k2", "k4", "s0", "s1"])
    tri = S.poly([(C, 9.5), (C + 11.5, 29), (C - 11.5, 29)])
    inner = S.poly([(C, 13.5), (C + 8.2, 26.8), (C - 8.2, 26.8)])
    stencil = tri & ~inner
    # stencil bridges (the gaps a real stencil leaves)
    stencil &= ~S.rect(C - 0.6, 9, 1.2, 4)
    img.a[stencil] = idx("a0")
    img.a[stencil & (S.X < C) & (S.Y < 22)] = idx("a0h")
    img.a[S.rect(C - 1.2, 16, 2.4, 6.5)] = idx("a0")
    img.a[S.rect(C - 1.2, 23.8, 2.4, 2)] = idx("a1")
    outline(img, None, "k0")
    return img


def exit_beacon() -> Img:
    """The guardian's gate: ember-lit gate bars behind dark glass, a tarnished brass crown on the bezel."""
    S = Shape(N)
    img = Img(N, N)
    crown = S.poly([(12.5, 5), (14.5, 0.8), (16.5, 3.5), (C, 0.3), (23.5, 3.5), (25.5, 0.8), (27.5, 5)])
    shade(img, crown, R["brass"], "bevel", width=1, ambient=0.3)
    bezel(img, 18.5, 13.2)
    glass(img)
    arch = S.arc(C, C - 1, 6.5, 1.6, 0, 180) | S.rect(C - 7.3, C - 1, 1.6, 9) | S.rect(C + 5.7, C - 1, 1.6, 9)
    bars = S.rect(C - 3.8, C - 5.5, 1.3, 13.5) | S.rect(C - 0.65, C - 7, 1.3, 15) | S.rect(C + 2.5, C - 5.5, 1.3, 13.5)
    img.a[arch | bars] = idx("e1")
    img.a[S.rect(C - 8, C + 8, 16, 1.4)] = idx("e0h")
    img.a[S.circle(C, C + 1, 1.2)] = idx("e2h")
    outline(img, None, "k0")
    return img


def seal_front() -> Img:
    """A column of quarantine lattice: dark grid, ember wire, a few lit nodes."""
    img = Img(N, N)
    S = Shape(N)
    col = S.rect(11, 1, 18, 38)
    X, Y = S.X, S.Y
    a = np.mod(X - Y, 7)
    b = np.mod(X + Y, 7)
    wire = (np.minimum(a, 7 - a) < 0.8) | (np.minimum(b, 7 - b) < 0.8)
    fill(img, col, "k1")
    img.a[col & wire] = idx("e0h")
    nodes = col & (np.minimum(a, 7 - a) < 0.8) & (np.minimum(b, 7 - b) < 0.8) & (np.mod(Y, 14) < 7)
    img.a[nodes] = idx("e1h")
    img.a[S.rect(11, 1, 1, 38)] = idx("s0")
    img.a[S.rect(28, 1, 1, 38)] = idx("k3")
    img.a[S.rect(11, 1, 18, 1)] = idx("s0")
    img.a[S.rect(11, 38, 18, 1)] = idx("k3")
    outline(img, None, "k0")
    return img


def braid(img: Img, S: Shape, x0, x1, y, thick=3.0):
    band = S.rect(x0, y, x1 - x0, thick)
    shade(img, band, R["verdigris"], "bevel", width=1, ambient=0.3)
    for x in np.arange(x0 - 2, x1, 2.5):
        img.a[S.line((x, y), (x + thick * 0.7, y + thick), 0.8) & band] = idx("g0")
    img.a[S.rect(x0, y, x1 - x0, 0.9) & band & (np.mod(S.X, 5) < 1)] = idx("c2")
    return band


def cut_carrier() -> Img:
    """A severed carrier: the braid parted, frayed strands at both ends, one last spark."""
    S = Shape(N)
    img = Img(N, N)
    braid(img, S, 1, 17, 12, 4)
    braid(img, S, 23, 39, 23, 4)
    for (a, b) in (((17, 12.8), (19.5, 11)), ((17, 14), (20, 14.8)), ((17, 15.2), (18.8, 17.5)),
                   ((23, 23.8), (20.5, 22)), ((23, 25), (20, 26.5)), ((23, 26.3), (21.5, 28.5))):
        img.a[S.line(a, b, 0.9)] = idx("g1")
    img.a[S.line((21, 17), (22.5, 15.5), 0.9)] = idx("a0")
    img.put(22, 16, "a1h")
    img.a[S.line((19.8, 19.5), (18.8, 20.5), 0.9)] = idx("a0")
    outline(img, None, "k0")
    return img


# ══ the Lamplighter map marker ═════════════════════════════════════════════════════════════════════════════
def ship(w, h, lamp_on=True) -> Img:
    """The cable car on its trolley: carrier, two-wheel trolley, hangers, ivory car with a brass band, cab window
    and lamp cupola at the nose (right), keel tank below."""
    S = Shape(w, h)
    img = Img(w, h)
    k = w / 56.0
    braid(img, S, 0, w, 3 * k, max(2.0, 3 * k))
    for x in (22, 32):
        dome(img, x * k, 3.6 * k, max(1.4, 2.8 * k), ["k2", "b0", "b1", "b1h", "b2", "b2h"])
        img.put(int(x * k), int(3.6 * k), "k1")
    frame_bar = S.rect(20 * k, 6.5 * k, 14 * k, max(1, 1.6 * k))
    shade(img, frame_bar, R["brass"], "flat", ambient=0.5)
    for x in (23, 31):
        shade(img, S.rect(x * k, 8 * k, max(1, 1.6 * k), 5 * k), R["steel-dark"], "bevel", width=1, ambient=0.4)
    body = S.poly([(5 * k, 13 * k), (45 * k, 13 * k), (51 * k, 16 * k), (53.5 * k, 20 * k), (51 * k, 26 * k),
                   (5 * k, 26 * k), (3 * k, 23 * k), (3 * k, 15.5 * k)])
    upper = body & (S.Y < 20.5 * k)
    lower = body & ~upper
    shade(img, upper, R["ivory"][1:], "bevel", width=1, ambient=0.25)
    shade(img, lower, R["brass"], "bevel", width=1, ambient=0.25)
    for x in np.arange(7, 48, 4.5):
        img.put(int(x * k), int(23 * k), "b2h")
    img.a[S.rect(3 * k, 20.3 * k, 49 * k, max(1, 0.8 * k)) & body] = idx("b0")
    for i, x in enumerate(np.arange(8, 40, 5.2)):
        win = S.rect(x * k, 15.3 * k, max(2, 3 * k), max(2, 2.8 * k))
        img.a[win] = idx("k1")
        if i % 2 == 0:
            img.put(int(x * k), int(15.3 * k), "t1h")
    cab = S.poly([(43 * k, 15 * k), (49 * k, 15 * k), (51.5 * k, 19 * k), (43 * k, 19 * k)])
    img.a[cab] = idx("k1")
    img.put(int(47 * k), int(16 * k), "t2")
    lc = (47 * k, 11.5 * k)
    img.a[S.rect(45.3 * k, 12 * k, 3.6 * k, 1.6 * k)] = idx("b1")
    if lamp_on:
        shade(img, S.circle(lc[0], lc[1], max(1.4, 2.2 * k)), R["amber"], "sphere",
              sphere=(lc[0], lc[1], 2.2 * k, 2.2 * k), ambient=0.4)
        img.put(int(lc[0] - 1), int(lc[1] - 1), "a3")
    else:
        shade(img, S.circle(lc[0], lc[1], max(1.4, 2.2 * k)), ["b0", "b0h", "b1", "b1h"], "sphere",
              sphere=(lc[0], lc[1], 2.2 * k, 2.2 * k))
    keel = S.rrect(14 * k, 26 * k, 22 * k, 3.5 * k, 1.5 * k)
    shade(img, keel, R["steel-dark"], "bevel", width=1, ambient=0.3)
    outline(img, None, "k0")
    return img


def ship_marker():
    return {"ship-lamplighter-0": ship(56, 32, True), "ship-lamplighter-1": ship(56, 32, False),
            "ship-lamplighter-sm": ship(36, 20, True)}
