"""FX overlays for the PAINTED weapons and drones (art workstream, public/art/weapons|drones/*.json) — hi-bit, 2x
density (atlas px; the art JSON points are image px, which are the same HD density: place anchors on them 1:1).

- `lens-<colour>-<5|7|9>-<step>`: lens-charge glow. The size in the NAME is the lens diameter in LAYOUT units; the
  frames are HD: lit core 10/14/18 px inside a 26/30/34-px frame, anchor = centre (13/15/17). Pick the size whose
  core best matches the art's lens r (core px ~ 2r). step 0..3 follows the charge fraction; `-pulse` loops when
  charged. Colours: teal, amber, violet, ivory, ember.
- `muzzle-<family>` (+ `-left`): flash at the weapon's `muzzle` point (anchor = the muzzle). Families: signal
  (lasers), jammer (ion), lance (beams; anchored on the lens itself), slug (payloads), scatter (flak), chain
  (heartpulse), chime (cathedral chime).
- `rotor-blur-<8|12|16>`: the number is the rotor span in LAYOUT units; frames are HD (20/28/36 x 10), anchor =
  hub. `prop-blur-<8|12>` vertical props. `exhaust-puff` (+ `-left`) behind thrusters, `recoil-dust` at a clamp
  `pivot` on firing.
Glows have no outline and fall off through hard HD bands; every pixel is opaque (the game fades with globalAlpha).
"""
from __future__ import annotations

import math
import random

import numpy as np

from fx_common import (GLOW, SMOKE, SMOKE_LIGHT, add_lr, arc, grid, puff, put_ramp, radial, streak)
from px import Img, idx

LENS_COLOURS = ("teal", "amber", "violet", "ivory", "ember")
LENS_SIZES = {5: 10, 7: 14, 9: 18}   # layout name -> HD core diameter
GLINT = {"teal": "i4", "amber": "i4", "violet": "i4", "ivory": "a3", "ember": "a3"}


def lens_glow(colour: str, core_d: int, step: int, pulse: int = -1) -> Img:
    """Lens-charge glow, frame = core + 16. step 0 = a dim ember of light in the glass; 1-2 the glass fills from
    the centre; 3 = full: a hard-banded bright body, a thin halo ring of light around the rim, a small hot core,
    a 1-px glint up-left and four very short spoke glints."""
    keys = GLOW[colour]
    F = core_d + 16
    c = F / 2
    r = core_d / 2
    im = Img(F, F)
    if step == 0:
        radial(im, c, c, r - 0.8, keys[:3], power=1.0)
        radial(im, c, c, r * 0.35, keys[1:4], power=1.0)
        return im
    halo = {1: 0.0, 2: 1.5, 3: 2.5}[step] + (1.5 if pulse == 1 else 0.0)
    if halo:
        radial(im, c, c, r + halo, keys[:3], power=1.8)
    body_top = {1: 5, 2: 7, 3: len(keys)}[step]
    radial(im, c, c, r, keys[1:body_top], power=0.7)
    if step >= 2:
        radial(im, c, c, r * (0.35 if step == 2 else 0.45), keys[-3:], power=0.8)
    if step == 3:
        ci = int(c)
        L = int(r + halo) + (1 if pulse == 1 else 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            for s_ in range(int(r) - 1, L + 1):
                x, y = ci + dx * s_, ci + dy * s_
                if 0 <= x < F and 0 <= y < F:
                    im.put(x, y, keys[6] if s_ <= r else keys[4] if s_ <= r + 1 else keys[2])
        g = int(c - r * 0.45)
        im.put(g, g, GLINT[colour])
        im.put(g + 1, g, keys[-1])
    return im


def build_lenses(at):
    at.group("lens")
    for colour in LENS_COLOURS:
        for name_size, core_d in LENS_SIZES.items():
            names = []
            for step in range(4):
                im = lens_glow(colour, core_d, step)
                names.append(at.add(f"lens-{colour}-{name_size}-{step}", im, im.w // 2, im.h // 2))
            at.anim(f"lens-{colour}-{name_size}", names, 4, False)
            p = [lens_glow(colour, core_d, 3, 0), lens_glow(colour, core_d, 3, 1)]
            pn = [at.add(f"lens-{colour}-{name_size}-pulse-{i}", im, im.w // 2, im.h // 2) for i, im in enumerate(p)]
            at.anim(f"lens-{colour}-{name_size}-pulse", pn, 6, True)


# ─── muzzle flashes (facing right; anchor = muzzle point) ───────────────────────────────────────────────────

def _haze(im, cx, cy, r, keys, rng, n=5):
    """A thin, loose cloud (a few small sphere-shaded blobs), only on empty pixels."""
    for k in range(n):
        a = rng.random() * 2 * math.pi
        d = rng.random() * r * 0.8
        puff(im, cx + math.cos(a) * d, cy + math.sin(a) * d, 1.4 + rng.random() * r * 0.45, keys, only_empty=True)


def muzzle_signal():
    """Lasers: a relay lamp's light pushed until it cuts — a small bloom at the lens and a short beam spike."""
    W, H, ax, ay = 60, 26, 10, 13
    out = []
    spec = [(6.4, 14), (5.0, 20), (3.2, 12), (1.8, 6)]
    for f, (r, L) in enumerate(spec):
        im = Img(W, H)
        keys = GLOW["teal"][[0, 0, 2, 4][f]:[9, 9, 8, 6][f]]
        for x in range(ax + 3, ax + 3 + L):
            u = (x - ax - 3) / max(L, 1)
            im.put(x, ay, keys[max(0, int((1 - u) * (len(keys) - 1)))])
            if u < 0.5 and f < 2:
                im.put(x, ay - 1, keys[max(0, int((1 - u) * (len(keys) - 4)))])
        radial(im, ax + 0.5, ay + 0.5, r, keys, power=0.85)
        if f == 0:
            im.put(ax, ay, "i4")
        out.append(im)
    return out, ax, ay


def muzzle_jammer():
    """Ion: the horn dumps noise — a brief violet-white core, a few crackling 1-px arcs jumping forward, violet
    sparks and a thin ionised haze that drifts off and darkens."""
    W, H, ax, ay = 50, 38, 6, 19
    out = []
    for f in range(4):
        im = Img(W, H)
        rng = random.Random(900 + f)
        if f >= 1:
            _haze(im, ax + 8 + f * 6, ay - (f - 1) * 1.5, 3.0 + f * 1.8,
                  ["v0", "v0h", "v1", "k5"] if f < 3 else SMOKE[:6], rng)
        if f < 3:
            angs = [(-0.75, -0.2, 0.3, 0.75), (-0.6, 0.05, 0.55), (-0.35, 0.3)][f]
            for k, ang in enumerate(angs):
                L = [14, 20, 14][f] + (k % 2) * 4
                arc(im, ax + 2, ay, ang, L, rng, "v3" if f < 2 else "v2h", tip="v4" if f < 2 else None,
                    jog=0.45, glow_col="v1h")
        if f < 2:
            radial(im, ax + 0.5, ay + 0.5, [4.6, 3.0][f], GLOW["violet"][2:] + ["i4"], power=0.8)
        for k in range(3 if f < 3 else 1):
            sx = ax + 8 + f * 8 + rng.randint(0, 6)
            sy = ay + rng.choice((-8, -6, 6, 8)) + f * 2
            if 0 <= sy < H:
                streak(im, sx - 2, sy - 1, sx, sy, ["v1", "v3", "v4"] if f < 2 else ["v0h", "v1h", "v2"])
        out.append(im)
    return out, ax, ay


def muzzle_lance():
    """Beams: the prism head catches the light — a small hot core on the lens, a thin horizontal streak (longer in
    the beam direction), a faint vertical glint and a violet fleck of the prism; it tightens and fades."""
    S = 42
    c = S // 2
    out = []
    for f in range(3):
        im = Img(S, S)
        fwd, back = [14, 18, 8][f], [6, 8, 4][f]
        keys = GLOW["teal"]
        for s_ in range(1, fwd + 1):
            im.put(c + s_, c, keys[max(0, 8 - int(s_ / fwd * 7))])
        for s_ in range(1, back + 1):
            im.put(c - s_, c, keys[max(0, 7 - int(s_ / back * 7))])
        if f < 2:
            for s_ in range(1, 5):
                im.put(c, c - s_, keys[6 - s_])
                im.put(c, c + s_, keys[6 - s_])
        radial(im, c + 0.5, c + 0.5, [3.6, 2.8, 2.0][f], keys[3:], power=0.8)
        im.put(c, c, "i4" if f < 2 else "t4")
        if f == 1:
            im.put(c + 6, c - 2, "v4")
            im.put(c + 7, c - 2, "v3")
        out.append(im)
    return out, c, c


def muzzle_slug():
    """Payloads: a pneumatic cough — a brief amber flash, a pale compressed-air puff rolling forward and a few
    copper sparks from the splice."""
    W, H, ax, ay = 54, 30, 8, 15
    out = []
    spec = [
        [(7.0, 0.0, 5.6)],
        [(11.0, -1.0, 7.2), (19.0, 1.0, 5.0)],
        [(14.0, -2.0, 7.0), (23.0, 1.0, 6.0), (30.0, -1.0, 3.6)],
        [(18.0, -4.0, 5.0), (27.0, -1.0, 4.6), (35.0, -2.0, 2.8)],
    ]
    ramps = [["s1", "s1h", "s2", "s2h", "s3", "s3~i3", "i3", "i4"], SMOKE_LIGHT[2:] + ["s1h", "s2"], SMOKE_LIGHT, SMOKE]
    for f in range(4):
        im = Img(W, H)
        rng = random.Random(1100 + f)
        for x, dy, r in spec[f]:
            puff(im, ax + x, ay + 0.5 + dy, r, ramps[f])
        if f == 0:
            radial(im, ax + 1.5, ay + 0.5, 4.4, GLOW["amber"][3:], power=0.85)
        for k in range(3 if f < 3 else 1):
            a = rng.uniform(-0.9, 0.9)
            r0 = 8 + f * 7 + rng.uniform(0, 4)
            streak(im, ax + math.cos(a) * r0, ay + math.sin(a) * r0, ax + math.cos(a) * (r0 + 4),
                   ay + math.sin(a) * (r0 + 4) + f, ["c1", "c2", "c4"] if f < 2 else ["c0h", "c1", "c2"])
        out.append(im)
    return out, ax, ay


def muzzle_scatter():
    """Flak: the rivet gun coughs — a small amber flash, three thin tongues, rivets flying out, a little smoke."""
    W, H, ax, ay = 54, 38, 8, 19
    out = []
    angs = [-0.42, 0.0, 0.42]
    rivet_angs = [-0.55, -0.3, -0.08, 0.12, 0.34, 0.58]
    for f in range(4):
        im = Img(W, H)
        L = [8, 12, 6, 0][f]
        for a in angs:
            if L:
                streak(im, ax + 2 + math.cos(a) * (L + 2), ay + math.sin(a) * (L + 2) * 1.2,
                       ax + 2 + math.cos(a) * 2, ay + math.sin(a) * 2 * 1.2, ["e1", "a0", "a1", "a2"])
        if f >= 1:
            d = [0, 18, 30, 40][f]
            for i, a in enumerate(rivet_angs):
                x = ax + 2 + math.cos(a) * (d + (i % 2) * 4)
                y = ay + math.sin(a) * (d + (i % 2) * 4) * 1.2
                if 1 <= int(y) < H - 1:
                    im.pts([(int(x), int(y)), (int(x) + 1, int(y))], "b3h" if f < 3 else "b2")
                    im.pts([(int(x), int(y) + 1), (int(x) + 1, int(y) + 1)], "b1")
        if f >= 2:
            puff(im, ax + 5, ay - 1, [0, 0, 3.4, 4.6][f], SMOKE_LIGHT if f == 2 else SMOKE)
        if f < 2:
            radial(im, ax + 1.5, ay + 0.5, [5.0, 3.4][f], GLOW["amber"][2:], power=0.85)
        out.append(im)
    return out, ax, ay


def muzzle_chain():
    """Heartpulse: the core lamp discharges — a small ember-white bloom, short arcs off the rings, sparks dropping
    away and a breath of dark heat haze."""
    W, H, ax, ay = 40, 38, 6, 19
    out = []
    for f in range(4):
        im = Img(W, H)
        rng = random.Random(1300 + f)
        if f >= 2:
            _haze(im, ax + 6 + f * 4, ay - f * 2, 2.4 + f * 1.2, SMOKE[:6], rng, n=4)
        if f < 3:
            for ang in ((-0.8, 0.55), (-0.6, 0.75), (-0.4,))[f]:
                arc(im, ax + 2, ay, ang, [10, 14, 8][f], rng, "e3" if f < 2 else "e2", tip="e4" if f == 0 else None,
                    jog=0.45, glow_col="e1h")
        for k in range(3 if f < 3 else 2):
            sx = ax + 4 + f * 4 + k * 4
            sy = ay + 4 + f * 4 + (k % 2) * 2
            if sy < H - 1:
                streak(im, sx, sy - 2, sx, sy, ["e1", "e2", "a2"] if f < 2 else ["e0h", "e1", "e2"])
        if f < 2:
            radial(im, ax + 1.5, ay + 0.5, [4.6, 3.0][f], GLOW["ember"][2:], power=0.85)
            im.put(ax + 1, ay, "a3" if f == 0 else "e4")
        out.append(im)
    return out, ax, ay


def muzzle_chime():
    """Cathedral chime: the glass bell rings — a soft violet glow at the mouth, two faint partial shimmer arcs
    travelling out (sound in the glass) and a few glass glints."""
    W, H, ax, ay = 50, 42, 8, 21
    out = []
    X, Y = grid(W, H)
    d = np.hypot(X - ax - 1.5, Y - ay - 0.5)
    ang = np.arctan2(Y - ay - 0.5, X - ax - 1.5)
    for f in range(4):
        im = Img(W, H)
        for k in range(2):
            rad = 8.0 + k * 10.0 + f * 5.0
            if rad > 38:
                continue
            col = ["v3", "v2h", "v2", "v1h", "v1"][min(4, k + f)]
            ring = (np.abs(d - rad) <= 0.6) & (np.abs(ang) < 0.55) & ((np.floor(ang * rad / 1.5) % 3) != 0)
            im.a[ring] = idx(col)
        glints = [[(6, -4), (8, 4)], [(14, -6), (16, 6)], [(22, -8)], []][f]
        for gx, gy in glints:
            im.put(ax + gx, ay + gy, "i4" if f < 1 else "v4")
            im.put(ax + gx + 1, ay + gy, "v3")
        if f < 2:
            radial(im, ax + 1.5, ay + 0.5, [4.2, 2.8][f], GLOW["violet"][1:] + ["i4"], power=0.85)
        out.append(im)
    return out, ax, ay


MUZZLES = {
    "signal": (muzzle_signal, 16),
    "jammer": (muzzle_jammer, 14),
    "lance": (muzzle_lance, 12),
    "slug": (muzzle_slug, 14),
    "scatter": (muzzle_scatter, 16),
    "chain": (muzzle_chain, 12),
    "chime": (muzzle_chime, 12),
}


def build_muzzles(at):
    at.group("muzzle")
    for fam, (fn, fps) in MUZZLES.items():
        imgs, ax, ay = fn()
        add_lr(at, f"muzzle-{fam}", imgs, ax, ay, fps, False)


# ─── rotors, props, exhaust, recoil dust ────────────────────────────────────────────────────────────────────

def rotor_blur(span: int, f: int) -> Img:
    """A spinning rotor seen edge-on (HD: (span+2)*2 x 10): a thin disc of dashed blade streaks, lit blade tips
    that alternate ends, one blade streak sweeping across and a brass hub."""
    W, H = (span + 2) * 2, 10
    im = Img(W, H)
    cx, cy = W / 2, H / 2
    rx = span
    for x in range(W):
        u = (x + 0.5 - cx) / rx
        if abs(u) > 1.0:
            continue
        ph = (x + f * 5) % 10
        if ph < 3:
            im.put(x, 3, "s0" if ph else "s0h")
        if (x + f * 5 + 5) % 10 < 3:
            im.put(x, 6, "s1")
        if abs(u) > 0.8:
            im.put(x, 4, "s1h")
            im.put(x, 5, "s1")
    lt = (0, 1) if f != 1 else (W - 2, W - 1)
    for x in lt:
        im.put(x, 4, "i3")
        im.put(x, 5, "s2")
    bx = [int(cx - rx * 0.6), int(cx), int(cx + rx * 0.6)][f]
    for dx in range(-3, 4):
        im.put(bx + dx, 4, "s2h" if abs(dx) < 2 else "s1h")
        im.put(bx + dx, 5, "s1h" if abs(dx) < 2 else "s1")
    hx = int(cx)
    for (x, y, col) in ((hx - 1, 4, "b3h"), (hx, 4, "b3"), (hx - 1, 5, "b2"), (hx, 5, "b1h")):
        im.put(x, y, col)
    return im


def prop_blur(span: int, f: int) -> Img:
    """A propeller seen from the side (vertical blur strip)."""
    return rotor_blur(span, f).rot90(1)


def exhaust_puff() -> list[Img]:
    """Small thruster puff drifting LEFT (behind a right-facing drone). 24x18, anchor = emission point (22,8)."""
    out = []
    spec = [
        ([(17.0, 8.5, 3.2)], True),
        ([(14.0, 8.0, 4.4)], False),
        ([(10.0, 7.0, 4.6), (16.0, 9.0, 2.4)], False),
        ([(6.0, 6.0, 3.4), (11.0, 8.0, 2.8)], False),
    ]
    for f, (ps, hot) in enumerate(spec):
        im = Img(24, 18)
        ramp_ = [SMOKE_LIGHT[2:] + ["s1h", "s2", "s2h"], SMOKE_LIGHT, SMOKE_LIGHT[:7], SMOKE[:6]][f]
        for x, y, r in ps:
            puff(im, x, y, r, ramp_)
        if hot:
            radial(im, 21.5, 8.5, 2.6, ["a0", "a1", "a2", "a3"], power=0.8)
        out.append(im)
    return out


def recoil_dust() -> list[Img]:
    """Grit shaken off the rail clamp when a weapon fires. 36x12, anchor = clamp base centre (18,10)."""
    out = []
    for f in range(3):
        im = Img(36, 12)
        spread = [6, 11, 15][f]
        ramp_ = [SMOKE_LIGHT, SMOKE_LIGHT[:7], SMOKE[:6]][f]
        for side in (-1, 1):
            puff(im, 18 + side * spread, 7.5 - f, [2.8, 3.2, 2.6][f], ramp_)
            puff(im, 18 + side * (spread - 4), 9.0 - f * 0.5, [1.6, 2.0, 1.4][f], ramp_, only_empty=True)
        if f == 0:
            im.pts([(16, 10), (17, 10)], "b3")
            im.pts([(20, 9)], "b2")
        out.append(im)
    return out


def build_rotors(at):
    at.group("rotors")
    for span in (8, 12, 16):
        imgs = [rotor_blur(span, f) for f in range(3)]
        at.seq(f"rotor-blur-{span}", imgs, imgs[0].w // 2, imgs[0].h // 2, fps=18, loop=True)
    for span in (8, 12):
        imgs = [prop_blur(span, f) for f in range(3)]
        at.seq(f"prop-blur-{span}", imgs, imgs[0].w // 2, imgs[0].h // 2, fps=18, loop=True)
    ex = exhaust_puff()
    add_lr(at, "exhaust-puff", ex, 22, 8, 10, False)
    at.seq("recoil-dust", recoil_dust(), 18, 10, fps=12, loop=False)


def build_overlays(at):
    build_lenses(at)
    build_muzzles(at)
    build_rotors(at)
