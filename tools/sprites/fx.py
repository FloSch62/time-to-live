"""FX atlas — hi-bit (contract v3): authored at 2 atlas px per layout unit ("scale": 2 in fx.json).

Projectiles, beams, explosions, hits, room hazards (fire / breach / seal lattice / veil shimmer), particles and
markers. Glows, particles and fire have no outline and fall off through long HD ramps (fx_common); solid bits
(shells, rivets, shards, reticles, markers) carry a 1-px dark outline. Restrained and physical (contract rule 8):
small hot cores, smoke, sparks, debris; no comic bursts. Everything procedural uses fixed seeds.

All sizes and anchors below are ATLAS px (layout = /2). Projectiles point RIGHT; asymmetric ones also ship `-left`
copies. Anchors are the visual centre except: room tiles (0,0; 72x72, floor line at row 64), shield ripple (hit
point on the ward-mesh apex), move-marker and teleport-in (floor point, like crew). The overlays for the painted
weapons/drones live in fx_overlay.py, the carrier cable and handshake fx in fx_cable.py.
"""
from __future__ import annotations

import math
import random

import numpy as np

import hd
from atlas import Atlas
from fx_common import (AMBER, BRASS, COPPER, EMBER, FIRE, GLOW, IVORY, SMOKE, SMOKE_LIGHT, STEEL, TEAL, VERD,
                       VIOLET, add_lr, arc, despeck, fbm, grid, mirror, periodic_noise, puff, put_ramp, radial,
                       streak)
from px import Img, hexof, idx, line_pts, T

TILE = 72     # room tile (36 layout units, contract v4)
FLOOR = 64    # floor line row inside a room tile (floor plate rows 64..71)


# ─── laser bolts: signal packets ─────────────────────────────────────────────────────────────────────────────

def packet_bolt(colour: str, W: int, H: int, frame: int, head_frac=0.46) -> Img:
    """A pushed relay-lamp signal: an elongated lamp-head of light (hard bands, a thin white-hot core line) driving
    a train of short, thin packets that step 2 px per frame (reads as a pulsed signal, not a streak)."""
    keys = GLOW[colour]
    im = Img(W, H)
    hl = W * head_frac
    cx, cy = W - hl / 2 - 0.5, H / 2
    radial(im, cx, cy, hl / 2, keys[1:], power=1.15, ry=H / 2)
    core_rows = [int(cy)] if H % 2 else [int(cy) - 1, int(cy)]
    x0, x1 = int(cx - hl * 0.3), int(cx + hl * 0.42)
    for x in range(x0, x1):
        for y in core_rows:
            im.put(x, y, keys[-1] if x > x0 + 1 else keys[-2])
    im.put(x1 - 3, core_rows[0], "i4" if colour != "ivory" else "a3")
    x = int(W - hl) - 1 - (frame % 2) * 2
    for i, ln in enumerate([6, 5, 4, 3, 2]):
        k = max(1, len(keys) - 2 - i * 2)
        rows = core_rows if i < 2 or len(core_rows) == 1 else core_rows[:1]
        for xx in range(max(0, x - ln + 1), x + 1):
            for yy in rows:
                im.put(xx, yy, keys[k])
        x -= ln + 3
        if x < 0:
            break
    return im


def chain_bolt(frame: int) -> Img:
    """Heartpulse: an ember packet wearing a thin pulse ring around its head (the ring swells on frame 1)."""
    im = Img(30, 18)
    b = packet_bolt("ember", 26, 8, frame)
    cx, cy = 20.5, 9.0
    rx, ry = (4.0, 7.2) if frame == 0 else (5.2, 8.4)
    X, Y = grid(30, 18)
    d = np.hypot((X - cx) / rx, (Y - cy) / ry)
    ring = (d <= 1.0) & (d > 1.0 - 1.1 / min(rx, ry))
    im.a[ring] = idx("e2h" if frame == 0 else "e2")
    im.blit(b, 2, 5)
    return im


def build_bolts(at: Atlas):
    at.group("bolts")
    add_lr(at, "bolt-teal", [packet_bolt("teal", 28, 8, f) for f in range(2)], 14, 4, 12, True)
    add_lr(at, "bolt-amber", [packet_bolt("amber", 30, 10, f, 0.5) for f in range(2)], 15, 5, 12, True)
    add_lr(at, "bolt-ivory", [packet_bolt("ivory", 26, 6, f, 0.4) for f in range(2)], 13, 3, 12, True)
    add_lr(at, "bolt-chain", [chain_bolt(f) for f in range(2)], 15, 9, 12, True)
    add_lr(at, "bolt-ember", [packet_bolt("ember", 28, 8, f) for f in range(2)], 14, 4, 12, True)
    add_lr(at, "bolt-violet", [packet_bolt("violet", 28, 8, f) for f in range(2)], 14, 4, 12, True)


# ─── ion ─────────────────────────────────────────────────────────────────────────────────────────────────────

def ion_ball(frame: int, S=28) -> Img:
    """Crackling violet orb: a slightly wobbling plasma body in hard bands with a white core, and 3 thin arcs that
    jump off its surface in a new place every frame."""
    im = Img(S, S)
    c = S / 2
    X, Y = grid(S, S)
    ang = np.arctan2(Y - c, X - c)
    wob = 1 + 0.08 * np.sin(ang * 3 + frame * 1.7) + 0.05 * np.sin(ang * 5 - frame * 2.3)
    d = np.hypot(X - c, Y - c) / (7.2 * wob)
    v = np.clip(1 - d, 0, 1) ** 0.7
    put_ramp(im, d < 1, v, VIOLET[1:] + ["i4"])
    rng = random.Random(610 + frame)
    for k in range(3):
        a = rng.uniform(0, 2 * math.pi)
        r0 = 6.5
        arc(im, c - 0.5 + math.cos(a) * r0, c - 0.5 + math.sin(a) * r0, a + rng.uniform(-0.4, 0.4),
            rng.randint(4, 7), rng, "v3", tip="v4", jog=0.5, maxoff=2)
    return im


def ion_hit(frame: int, S=36) -> Img:
    im = Img(S, S)
    c = S / 2
    rng = random.Random(77 + frame)
    if frame >= 1:
        for k in range(4):
            a = rng.uniform(0, 2 * math.pi)
            puff(im, c + math.cos(a) * (3 + frame * 2), c + math.sin(a) * (3 + frame * 2) - frame,
                 2.0 + frame * 0.8, ["v0", "v0h", "v1", "k5"] if frame < 3 else ["k3", "k3h", "k4", "k4h"])
    core = [5.0, 3.6, 2.2, 0][frame]
    if core:
        radial(im, c, c, core, GLOW["violet"][2:] + ["i4"], power=0.8)
    n = [6, 6, 4, 2][frame]
    for k in range(n):
        a = k * 2 * math.pi / n + rng.uniform(-0.3, 0.3)
        r0 = [3, 5, 8, 11][frame]
        L = [9, 11, 8, 4][frame]
        arc(im, c - 0.5 + math.cos(a) * r0, c - 0.5 + math.sin(a) * r0, a, L, rng,
            ["v4", "v3h", "v3", "v2"][frame], tip="v4" if frame < 2 else None, jog=0.5)
    return im


def build_ion(at: Atlas):
    at.group("ion")
    at.seq("ion-ball", [ion_ball(f) for f in range(4)], 14, 14, fps=12, loop=True)
    at.seq("ion-hit", [ion_hit(f) for f in range(4)], 18, 18, fps=12, loop=False)


# ─── payload shells (spliced charges) ──────────────────────────────────────────────────────────────────────

# parts along the axis s (atlas px, forward +): (s0, s1, half-width at s0, at s1, ramp, texture)
SHELL_SPECS = {
    "payload": [  # a spliced charge: canister wrapped in copper wire, braided splice tail, brass contact cap
        (-11.4, -8.4, 1.8, 1.8, VERD, "braid"),
        (-8.4, -6.2, 3.4, 3.4, COPPER, "wire"),
        (-6.2, -4.0, 3.4, 3.4, STEEL, None),
        (-4.0, -1.8, 3.4, 3.4, COPPER, "wire"),
        (-1.8, 0.8, 3.4, 3.4, STEEL, None),
        (0.8, 3.0, 3.4, 3.4, COPPER, "wire"),
        (3.0, 6.4, 3.4, 2.2, BRASS[1:10], None),
        (6.4, 8.8, 1.8, 0.6, TEAL[2:], "hot"),
    ],
    "breach": [  # a hardened spike driver slug: fins, iron body, brass collar, long steel spike
        (-12.4, -8.8, 5.4, 3.2, BRASS[0:8], None),
        (-8.8, 0.8, 3.0, 3.0, STEEL[:9], None),
        (0.8, 2.8, 3.4, 3.4, BRASS[1:10], None),
        (2.8, 7.0, 2.4, 2.0, STEEL[2:], None),
        (7.0, 13.8, 2.0, 0.3, STEEL[3:], None),
    ],
    "thermite": [  # a short canister with an ember-hot nose
        (-10.8, -7.2, 5.2, 3.2, ["k2", "k2h", "k3", "k3h", "k4", "k4h", "k5"], None),
        (-7.2, 3.0, 3.0, 3.0, STEEL[:8], None),
        (3.0, 4.8, 3.2, 3.2, ["b1", "b1h", "b2", "b2h", "b3"], None),
        (4.8, 6.8, 3.2, 3.2, EMBER[1:7], "hot"),
        (6.8, 10.2, 3.2, 0.4, EMBER[2:8], "hot"),
    ],
}
SHELL_TAIL = {"payload": -11.4, "breach": -12.4, "thermite": -10.8}


def _axis(k, size, diag_off=0.0):
    th = k * math.pi / 4
    ax_, ay_ = math.cos(th), -math.sin(th)
    return ax_, ay_, -ay_, ax_


def raster_shell(kind: str, k: int, size=32) -> Img:
    """Rasterise a shell pointing k*45 deg CCW from +x: cylinder-shaded parts (screen-space top-left light),
    wire coils striped along the axis, a dark outline."""
    ax_, ay_, px_, py_ = _axis(k, size)
    o = size / 2
    im = Img(size, size)
    X, Y = grid(size, size)
    dx, dy = X - o, Y - o
    s = dx * ax_ + dy * ay_
    t = dx * px_ + dy * py_
    for (s0, s1, w0, w1, keys, tex) in SHELL_SPECS[kind]:
        w = w0 + (w1 - w0) * np.clip((s - s0) / (s1 - s0), 0, 1)
        m = (s >= s0) & (s < s1) & (np.abs(t) <= w) & (im.a < 0)
        u = np.clip(t / np.maximum(w, 0.3), -1, 1)
        nz = np.sqrt(np.clip(1 - u * u, 0, 1))
        lam = hd.lambert(u * px_, u * py_, nz, 0.22)
        if tex == "wire":
            lam = lam * np.where(np.floor(s) % 2 == 0, 1.0, 0.72)
        elif tex == "braid":
            lam = lam * np.where((np.floor(s) + np.floor(t)) % 3 == 0, 0.7, 1.0)
        elif tex == "hot":
            lam = 0.45 + 0.55 * lam
        put_ramp(im, m, lam, keys)
    im.outline("k0")
    return im


def exhaust(kind: str, k: int, frame: int, size=44) -> Img:
    """Exhaust behind the shell tail for rotation k (same axis maths as raster_shell): a small hot core cooling
    to ember, and two small grey puffs of propellant smoke behind it."""
    ax_, ay_, px_, py_ = _axis(k, size)
    o = size / 2
    tail = SHELL_TAIL[kind]
    im = Img(size, size)
    X, Y = grid(size, size)
    dx, dy = X - o, Y - o
    s = dx * ax_ + dy * ay_
    t = dx * px_ + dy * py_
    L = 8.0 if frame == 0 else 10.5
    u = (tail - 0.6 - s) / L
    w = (2.4 if frame == 0 else 2.0) * np.clip(1 - u, 0, 1) ** 0.8 + 0.4
    m = (u >= 0) & (u <= 1) & (np.abs(t) <= w)
    v = np.clip(1 - u, 0, 1) * (1 - 0.5 * np.abs(t) / np.maximum(w, 0.4))
    put_ramp(im, m, v, ["e1", "e1h", "e2", "a0", "a0h", "a1", "a2", "a3"])
    for j, d in enumerate((L + 3.5, L + 7.0)):
        sx = o + ax_ * (tail - d) + px_ * (0.8 if (j + frame) % 2 else -0.8)
        sy = o + ay_ * (tail - d) + py_ * (0.8 if (j + frame) % 2 else -0.8)
        puff(im, sx, sy, 2.2 - j * 0.5 + frame * 0.3, SMOKE_LIGHT, only_empty=True)
    return im


def build_shells(at: Atlas):
    at.group("shells")
    for kind, pre in (("payload", "shell"), ("breach", "shell-breach"), ("thermite", "shell-thermite")):
        rots = [raster_shell(kind, k) for k in range(8)]
        for k, im in enumerate(rots):
            at.add(f"{pre}-r{k}", im, 16, 16)
        for k, im in enumerate(rots):
            fr = []
            for f in range(2):
                c = Img(44, 44)
                c.blit(exhaust(kind, k, f), 0, 0)
                c.blit(im, 6, 6)
                fr.append(c)
            at.seq(f"{pre}-fly-r{k}", fr, 22, 22, fps=12, loop=True)
    # standalone exhaust for a right-moving shell (flame points left), anchor = the shell tail
    fl = []
    for f in range(2):
        im = Img(12, 10)
        L = 9 if f == 0 else 11
        X, Y = grid(12, 10)
        u = (11.5 - X) / L
        w = 2.4 * np.clip(1 - u, 0, 1) ** 0.8 + 0.3
        m = (u >= 0) & (u <= 1) & (np.abs(Y - 5) <= w)
        v = np.clip(1 - u, 0, 1) * (1 - 0.5 * np.abs(Y - 5) / np.maximum(w, 0.3))
        put_ramp(im, m, v, ["e1", "e1h", "e2", "a0", "a0h", "a1", "a2", "a3"])
        fl.append(im)
    at.seq("shell-exhaust", fl, 11, 5, fps=12, loop=True)


# ─── flak (rivet scatter) ──────────────────────────────────────────────────────────────────────────────────

def rivet(variant: int) -> Img:
    """A tumbling rivet: domed brass head on a steel shank (side, diagonal, end-on)."""
    if variant == 0:
        im = Img(14, 10)
        X, Y = grid(14, 10)
        shank = (X >= 5) & (X < 13) & (np.abs(Y - 5) <= 1.6)
        u = np.clip((Y - 5) / 1.6, -1, 1)
        put_ramp(im, shank, hd.lambert(np.zeros_like(u), u, np.sqrt(np.clip(1 - u * u, 0, 1)), 0.25), STEEL[2:])
        head = ((X - 5.5) / 3.6) ** 2 + ((Y - 5) / 4.0) ** 2 <= 1.0
        head &= X < 6.2
        nx, ny = (X - 5.5) / 3.6, (Y - 5) / 4.0
        put_ramp(im, head, hd.lambert(nx, ny, np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1)), 0.25), BRASS[1:10])
    elif variant == 1:
        im = Img(12, 12)
        X, Y = grid(12, 12)
        # shank along the diagonal to the lower right, head at the upper left
        d = ((X - 4) + (Y - 4)) / math.sqrt(2)
        t = ((X - 4) - (Y - 4)) / math.sqrt(2)
        shank = (d > 0) & (d < 8) & (np.abs(t) <= 1.5)
        u = np.clip(t / 1.5, -1, 1)
        put_ramp(im, shank, hd.lambert(u * 0.7, -u * 0.7, np.sqrt(np.clip(1 - u * u, 0, 1)), 0.25), STEEL[2:])
        nx, ny = (X - 4.2) / 3.4, (Y - 4.2) / 3.4
        head = nx * nx + ny * ny <= 1
        put_ramp(im, head, hd.lambert(nx, ny, np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1)), 0.25), BRASS[1:10])
    else:
        im = Img(10, 10)
        X, Y = grid(10, 10)
        nx, ny = (X - 5) / 3.8, (Y - 5) / 3.8
        head = nx * nx + ny * ny <= 1
        put_ramp(im, head, hd.lambert(nx, ny, np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1)), 0.25), BRASS[1:10])
        im.put(5, 5, "b1")
    im.outline("k0")
    return im


def flak_burst(frame: int) -> Img:
    S = 26
    c = S / 2
    im = Img(S, S)
    rng = random.Random(330 + frame)
    if frame == 0:
        radial(im, c, c, 6.0, GLOW["amber"][2:], power=0.9)
        for k in range(6):
            a = k * math.pi / 3 + rng.uniform(-0.3, 0.3)
            streak(im, c + math.cos(a) * 5, c + math.sin(a) * 5, c + math.cos(a) * 9, c + math.sin(a) * 9,
                   ["a0", "a1", "a2"])
    elif frame == 1:
        puff(im, c, c - 0.5, 6.4, SMOKE_LIGHT)
        radial(im, c - 0.5, c, 3.2, ["e1", "e1h", "e2", "a0", "a1"], power=0.8)
        for k in range(6):
            a = k * math.pi / 3 + rng.uniform(-0.3, 0.3)
            x, y = c + math.cos(a) * 10.5, c + math.sin(a) * 10.5
            im.put(int(x), int(y), "b3")
            im.put(int(x) + 1, int(y) + 1, "b1")
    else:
        for (x, y, r) in ((9.0, 11.0, 4.4), (16.5, 12.0, 3.8), (12.5, 16.5, 3.6)):
            puff(im, x, y, r, SMOKE)
        im.put(12, 12, "e1")
    return im


def build_flak(at: Atlas):
    at.group("flak")
    for i in range(3):
        im = rivet(i)
        at.add(f"flak-pellet-{i}", im, im.w // 2, im.h // 2)
    at.seq("flak-burst", [flak_burst(f) for f in range(3)], 13, 13, fps=12, loop=False)


# ─── beams ──────────────────────────────────────────────────────────────────────────────────────────────────

BEAM_RAMPS = {
    "teal": GLOW["teal"],
    "amber": GLOW["amber"],
    "violet": GLOW["violet"] + ["i4"],
    "ember": GLOW["ember"],
}
BEAM_H = {"thin": 6, "mid": 10, "wide": 18}
BEAM_L = 16


def beam_profile(colour: str, width: str) -> list[str]:
    """Colours top->bottom of the beam cross-section (symmetric), at rest (no shimmer)."""
    keys = BEAM_RAMPS[colour]
    H = BEAM_H[width]
    out = []
    for y in range(H):
        v = 1 - abs(y + 0.5 - H / 2) / (H / 2)
        v = v ** 0.8
        out.append(keys[min(len(keys) - 1, int(v * len(keys)))])
    return out


def beam_tile(colour: str, width: str, frame: int) -> Img:
    """16-px beam tile: a hard-banded cross-section; the inner bands swell and thin in a wave that travels in the
    firing direction (period 16, so tiles join seamlessly); a few bright photons ride the core."""
    keys = BEAM_RAMPS[colour]
    H = BEAM_H[width]
    L = BEAM_L
    im = Img(L, H)
    n = len(keys)
    for x in range(L):
        wave = 0.10 * math.sin(2 * math.pi * (x - 4 * frame) / L) + 0.05 * math.sin(4 * math.pi * (x - 4 * frame) / L + 1)
        for y in range(H):
            v = 1 - abs(y + 0.5 - H / 2) / (H / 2)
            v = v ** 0.8
            if v > 0.25:
                v = min(0.999, v + wave)
            im.put(x, y, keys[min(n - 1, int(v * n))])
    cy = H // 2
    for k in range(2):
        px_ = (4 * frame + k * 8 + 2) % L
        im.put(px_, cy - 1 if H % 2 == 0 else cy, "i4")
    return im


def beam_impact(colour: str, frame: int) -> Img:
    """Where the beam bites: a small hot core on the plate, a thin halo, molten sparks and a wisp of smoke."""
    keys = BEAM_RAMPS[colour]
    S = 34
    im = Img(S, S)
    c = S / 2
    rng = random.Random(40 + frame)
    puff(im, c + 5 + frame % 2 * 2, c - 9, 3.0 + (frame % 2) * 1.2, SMOKE)
    r = [5.2, 6.4, 5.6, 6.8][frame]
    radial(im, c, c, r + 2.0, keys[:4], power=1.0)
    radial(im, c, c, r, keys, power=0.8)
    im.put(int(c), int(c), "i4")
    for k in range(4):
        a = rng.uniform(-math.pi, 0.4)
        r0, r1 = r + 2.5, r + rng.uniform(5, 9)
        streak(im, c + math.cos(a) * r0, c + math.sin(a) * r0, c + math.cos(a) * r1, c + math.sin(a) * r1,
               keys[2:-1], head=keys[-1])
    return im


def build_beams(at: Atlas):
    at.group("beams")
    profiles = {}
    for colour in BEAM_RAMPS:
        profiles[colour] = {}
        for width, H in BEAM_H.items():
            imgs = [beam_tile(colour, width, f) for f in range(4)]
            at.seq(f"beam-{colour}-{width}", imgs, 0, H // 2, fps=12, loop=True)
            at.seq(f"beam-{colour}-{width}-left", mirror(imgs), 0, H // 2, fps=12, loop=True)
            profiles[colour][width] = [hexof(k) for k in beam_profile(colour, width)]
        at.seq(f"beam-impact-{colour}", [beam_impact(colour, f) for f in range(4)], 17, 17, fps=12, loop=True)
    at.meta("beamProfiles", profiles)


# ─── explosions ────────────────────────────────────────────────────────────────────────────────────────────

def ease_out(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 2


def explosion_frames(size: int, n: int, R: float, nlumps: int, seed: int, nflecks: int, secondary=0):
    """Fireball = union of lumps around one hot core, broken up by noise; cools from amber through ember into dark
    smoke; sphere-shaded smoke puffs roll out behind it and then over it; debris (ivory plate chips, sheared rivets,
    hot sparks) flies out and cools."""
    rng = random.Random(seed)
    c = size / 2
    lumps = [(0.0, 0.0, 0.6, 0.0, 1.0)]
    for i in range(nlumps):
        ang = i / nlumps * 2 * math.pi + rng.uniform(-0.4, 0.4)
        d = rng.uniform(0.3, 0.52)
        delay = rng.uniform(0.1, 0.25) if i < secondary else 0.0
        lumps.append((math.cos(ang) * d, math.sin(ang) * d, rng.uniform(0.32, 0.44), delay, rng.uniform(0.75, 1.4)))
    puffs = []
    for i in range(nlumps + 4):
        ang = i / (nlumps + 4) * 2 * math.pi + rng.uniform(-0.3, 0.3)
        d = rng.uniform(0.3, 0.65)
        front = i % 3 == 0
        t0 = rng.uniform(0.40, 0.55) if front else rng.uniform(0.15, 0.32)
        puffs.append((math.cos(ang) * d, math.sin(ang) * d, rng.uniform(0.2, 0.3), t0, front))
    flecks = []
    for i in range(nflecks):
        ang = (i / nflecks) * 2 * math.pi + rng.uniform(-0.25, 0.25)
        flecks.append((ang, rng.uniform(0.8, 1.2), rng.uniform(0.6, 1.0), i % 3))
    X, Y = grid(size, size)
    frames = []
    for f in range(n):
        t = f / (n - 1)
        im = Img(size, size)

        def draw_puffs(front):
            for (sx, sy, sr, t0, fr) in sorted(puffs, key=lambda p: p[1]):
                if fr != front or t < t0:
                    continue
                lt = (t - t0) / (1 - t0 + 1e-6)
                grow = 0.55 + 0.9 * ease_out(lt / 0.6)
                fade = 1.0 if lt < 0.6 else max(0.0, 1 - (lt - 0.6) * 1.6)
                rr = R * sr * grow * fade
                if rr < 1.2:
                    continue
                cx = c + R * sx * (1 + 0.45 * lt)
                cy = c + R * sy * (1 + 0.45 * lt) - R * 0.3 * lt
                puff(im, cx, cy, rr, SMOKE if t > 0.8 else SMOKE_LIGHT, rough=0.22,
                     seed=int(sx * 1000 + sy * 97) + seed)

        draw_puffs(False)
        F = np.zeros((size, size))
        cur_r = 0.0
        for (lx, ly, lr, delay, decay) in lumps:
            if t < delay:
                continue
            lt = (t - delay) / (1 - delay)
            grow = 0.4 + 0.6 * ease_out(lt / 0.35)
            shrink = 1.0 if lt < 0.4 else max(0.0, 1 - (lt - 0.4) * 1.75 * decay)
            rr = R * lr * grow * shrink
            if rr < 1.2:
                continue
            cx, cy = c + R * lx * grow, c + R * ly * grow
            cur_r = max(cur_r, rr + R * math.hypot(lx, ly) * grow)
            F = np.maximum(F, 1 - np.hypot(X - cx, Y - cy) / rr)
        heat = max(0.0, 1.0 - t * 1.45)
        if cur_r > 0 and heat > 0.05:
            core = 1 - np.hypot(X - (c - R * 0.06), Y - (c - R * 0.1)) / max(cur_r, 1)
            h = np.clip(0.55 * np.clip(core, 0, 1) ** 1.6 + 0.45 * F, 0, 1)
            nz = periodic_noise(size, size, max(2, size // 10), max(2, size // 10), seed * 7 + f)
            nz2 = periodic_noise(size, size, max(2, size // 18), max(2, size // 18), seed * 11 + f)
            contrast = 0.6 if t < 0.3 else 1.2
            val = (h * 0.72 + 0.2) * heat * (1.0 - contrast / 2 + contrast * (0.6 * nz + 0.4 * nz2)) * \
                (1.0 if t < 0.3 else 1.35)
            thr = 0.12 if t < 0.3 else 0.24 if t < 0.55 else 0.26
            vis = (F > 0) & (val >= thr)
            ramp_ = FIRE if t < 0.3 else ["k4", "e0", "e0h", "e1", "e1h", "e2", "a0", "a0h", "a1", "a1h", "a2", "a2h"] \
                if t < 0.55 else ["k3h", "k4", "k4h", "e0", "e0h", "e1", "e1h", "e2", "a0", "a0h", "a1", "a1h"]
            put_ramp(im, vis, np.clip((val - thr) / 0.95, 0, 0.999), ramp_)
        draw_puffs(True)
        if f == 0:
            fr = R * 0.2
            radial(im, c, c, fr + 3, GLOW["amber"][1:], power=1.1)
            rng2 = random.Random(seed + 5)
            for k in range(6):
                ang = k * 2 * math.pi / 6 + rng2.uniform(-0.35, 0.35)
                r0, r1 = fr + 3, fr + 3 + R * rng2.uniform(0.14, 0.3)
                streak(im, c + math.cos(ang) * r0, c + math.sin(ang) * r0, c + math.cos(ang) * r1,
                       c + math.sin(ang) * r1, ["a0", "a1", "a2"])
        if 0 < f < n - 1:
            for ang, spd, life, kind in flecks:
                if t > life:
                    continue
                lt = t / life
                dist = R * (0.4 + spd * 0.95 * ease_out(lt))
                x = c + math.cos(ang) * dist
                y = c + math.sin(ang) * dist + R * 0.12 * lt * lt
                xi, yi = int(x), int(y)
                if kind == 0 and lt > 0.2:  # a chip of ivory enamel plate, tumbling
                    chip = [(0, 0, "i3"), (1, 0, "i2h"), (2, 0, "i2"), (0, 1, "b2"), (1, 1, "b1"), (2, 1, "b1")] \
                        if f % 2 else [(0, 0, "i3"), (0, 1, "i2"), (0, 2, "i1h"), (1, 0, "b2"), (1, 1, "b1h"),
                                       (1, 2, "b1")]
                    for ddx, ddy, col in chip:
                        im.put(xi + ddx, yi + ddy, col)
                    continue
                if kind == 1 and lt > 0.2:  # a sheared rivet
                    im.pts([(xi, yi), (xi + 1, yi)], "b3h")
                    im.pts([(xi, yi + 1), (xi + 1, yi + 1)], "b1")
                    continue
                tail = R * (0.18 if lt < 0.5 else 0.1)
                keys = ["a0", "a1", "a2", "a3"] if lt < 0.4 else ["e1", "a0", "a1"] if lt < 0.75 else ["c1", "c2", "b2"]
                streak(im, x - math.cos(ang) * tail, y - math.sin(ang) * tail, x, y, keys)
        despeck(im, keep=("a3", "a2", "a1", "b3h", "i3", "b2", "c2", "b2"))
        frames.append(im)
    return frames


def build_explosions(at: Atlas):
    at.group("explosions")
    at.seq("explosion-small", explosion_frames(54, 6, 21.4, 5, 12, 7), 27, 27, fps=14, loop=False)
    at.seq("explosion-medium", explosion_frames(90, 8, 35.0, 6, 23, 11), 45, 45, fps=14, loop=False)
    at.seq("explosion-large", explosion_frames(144, 10, 56.0, 8, 37, 16, secondary=2), 72, 72, fps=14, loop=False)


# ─── hits, the ward mesh ───────────────────────────────────────────────────────────────────────────────────

def hit_sparks() -> list[Img]:
    """Hull hit: a small white-hot bloom where the bolt lands and a spray of sparks that fly out, arc down and cool."""
    rng = random.Random(505)
    S = 34
    c = S / 2
    rays = [(-math.pi / 2 + (i - 4) * 0.42 + rng.uniform(-0.12, 0.12), rng.uniform(0.75, 1.2)) for i in range(9)]
    frames = []
    for f in range(4):
        im = Img(S, S)
        if f == 0:
            radial(im, c, c, 5.5, GLOW["amber"][2:], power=0.9)
            im.put(int(c), int(c), "i4")
        elif f == 1:
            radial(im, c, c, 3.0, ["a0", "a1", "a2", "a3"], power=0.8)
        for k, (ang, spd) in enumerate(rays):
            if f == 3 and k % 2:
                continue
            r0 = [4.0, 6.5, 10.0, 13.0][f] * spd
            r1 = [8.0, 11.5, 14.0, 15.0][f] * spd
            g = [0, 0.4, 1.6, 3.2][f]
            x0, y0 = c + math.cos(ang) * r0, c + math.sin(ang) * r0 + g * 0.5
            x1, y1 = c + math.cos(ang) * r1, c + math.sin(ang) * r1 + g
            keys = [["a1", "a2", "a3"], ["a0", "a1", "a2", "a3"], ["e1", "a0", "a1", "a2"], ["c1", "b1", "b2"]][f]
            streak(im, x0, y0, x1, y1, keys)
        frames.append(im)
    return frames


def shield_ripple(keys) -> list[Img]:
    """Ward-mesh flash: the charged ward-wire lattice around the car catches the bolt and grounds it. A diamond
    lattice of 1-px wire (period 8) lights up at the hit point; the flash runs along the mesh shell and fades.
    The shell arc bulges RIGHT (the player's mesh hit from the right); anchor = the hit point on the outer wire."""
    W, H = 48, 66
    ax, ay = 38, 32
    R = 68.0
    n = len(keys)
    frames = []
    for f in range(5):
        im = Img(W, H)
        front = [6.0, 14.0, 22.0, 29.0, 33.0][f]
        bright = [1.0, 0.95, 0.78, 0.55, 0.35][f]
        for dy in range(-33, 34):
            y = ay + dy
            if not 0 <= y < H:
                continue
            arcx = ax - (R - math.sqrt(R * R - dy * dy))
            dist = abs(dy)
            if dist > front:
                continue
            v0 = bright * (0.45 + 0.55 * math.exp(-((dist - front) ** 2) / 30.0))
            for tt in range(-12, 1):
                wa = (dy + tt) % 8 == 0
                wb = (dy - tt) % 8 == 0
                outer = tt == 0
                if not (wa or wb or outer):
                    continue
                node = wa and wb
                v = v0 * (1.0 if outer or node else 0.8) * (1 - 0.045 * (-tt))
                k = min(n - 1, int(v * n))
                if k < 1:
                    continue
                im.put(int(round(arcx + tt)), y, keys[k])
        if f <= 1:
            radial(im, ax + 0.5, ay + 0.5, [5.0, 3.5][f], keys[2:], power=0.9)
            if f == 0:
                im.put(ax, ay, "i4")
        frames.append(im)
    return frames


def build_hits(at: Atlas):
    at.group("hits")
    at.seq("hit-sparks", hit_sparks(), 17, 17, fps=14, loop=False)
    for name, keys in (("shield-ripple", GLOW["teal"]), ("shield-ripple-ion", GLOW["violet"] + ["i4"])):
        rip = shield_ripple(keys)
        at.seq(name, rip, 38, 32, fps=12, loop=False)
        at.seq(f"{name}-left", mirror(rip), 48 - 1 - 38, 32, fps=12, loop=False)


# ─── room tiles 64x64: fire, breach, seal lattice, veil shimmer ─────────────────────────────────────────────

_FIRE_N = None


def fire_tile(frame: int, n=4) -> Img:
    """Side view: a room fire. A low bed of embers along the floor line, irregular tongues of flame of different
    heights licking up (a vertically streaked noise texture scrolls upward and loops over the 4 frames), heat only
    in small bright cores near the base, two thin plumes of dark smoke curling up the wall and a few sparks."""
    global _FIRE_N
    S = TILE
    if _FIRE_N is None:
        _FIRE_N = (periodic_noise(S, S, 4, 18, 311), periodic_noise(S, S, 8, 36, 312), periodic_noise(S, S, 8, 8, 313),
                   periodic_noise(S, S, 2, 9, 314))
    n1, n2, n3, n4 = _FIRE_N
    X, Y = grid(S, S)
    shift = frame * (S // n)
    t1 = n1[(np.arange(S) + shift) % S, :]
    t2 = n2[(np.arange(S) + shift // 2) % S, :]
    t4 = n4[(np.arange(S) + shift * 2) % S, :]
    xs = np.arange(S) + 0.5
    env = (11.0 + 27.0 * np.exp(-((xs - 26.0) / 10.0) ** 2) + 18.0 * np.exp(-((xs - 52.0) / 7.0) ** 2)
           + 3.4 * np.sin(xs * 0.6 + frame * 1.9))
    height = FLOOR + 0.5 - Y
    u = np.clip(height / env[None, :], 0, 2)
    heat = np.clip(1.1 - u, 0, None) ** 0.9 * (0.22 + 0.62 * t1 * (0.55 + 0.7 * t2) + 0.1 * t4)
    heat = np.where(height < 0, -1, heat)
    im = Img(S, S)
    vis = heat >= 0.15
    put_ramp(im, vis, np.clip((heat - 0.15) / 0.95, 0, 0.999), FIRE)
    for x in range(S):  # the ember bed along the floor line
        v = n3[(FLOOR + frame * 6) % S, x]
        im.put(x, FLOOR, "a0" if v > 0.68 else "e2" if v > 0.45 else "e1h" if v > 0.25 else "e1")
        im.put(x, FLOOR - 1, im.key(x, FLOOR - 1) or ("e1" if v > 0.4 else "e0h"))
    hd.cleanup(im)
    for (x, y) in ((25 + (frame % 2) * 2, FLOOR - 2), (52, FLOOR - 2)):
        if im.key(x, y) in ("a2", "a2h", "a3"):
            im.put(x, y, "a3")
    smoke = Img(S, S)
    for i, (sx, s0) in enumerate(((25.0, 0.0), (51.0, 0.45))):
        for k in range(7):
            ph = (s0 + frame / n / 1.75 + k / 7.0) % 1.0
            cy = FLOOR - 28 - ph * 34
            cx = sx + math.sin(ph * 4.2 + i * 2 + k * 0.7) * (1.5 + 6.0 * ph)
            r = 2.2 + 4.2 * ph
            puff(smoke, cx, cy, r, SMOKE[1:7] if ph < 0.6 else SMOKE[:5], ry=r * 0.85, rough=0.18, seed=i * 10 + k)
    m = (smoke.a >= 0) & (im.a < 0)
    im.a[m] = smoke.a[m]
    rng = random.Random(1200)
    for sx, s0 in [(rng.uniform(14, 58), rng.uniform(0, 1)) for _ in range(4)]:
        ph = (s0 + frame / n) % 1.0
        y = FLOOR - 22 - ph * 30
        x = sx + math.sin(ph * 5 + sx) * 3
        keys = ["a1", "a2", "a3"] if ph < 0.4 else ["e2", "a0", "a1"] if ph < 0.75 else ["e1", "e1h", "e2"]
        streak(im, x, y + 2, x, y, keys)
    return im


def breach_tile(frame: int, n=4) -> Img:
    """Side view: a hole torn through the car's riveted wall plating. Chipped ivory enamel curls back to bare brass
    at the lip, a ring of rivets survives around it, the thin cold outside shows through, and the room's air
    streams out through the hole in pale streaks."""
    S = TILE
    im = Img(S, S)
    rng = random.Random(2024)
    cx, cy = 35.0, 31.5
    verts = 15
    radii = [14.8 + rng.uniform(-3.4, 3.8) for _ in range(verts)]

    def rad_at(th):
        tt = (th % (2 * math.pi)) / (2 * math.pi) * verts
        i = int(tt) % verts
        fr = tt - int(tt)
        return radii[i] * (1 - fr) + radii[(i + 1) % verts] * fr

    X, Y = grid(S, S)
    dx, dy = X - cx, (Y - cy) * 1.05
    D = np.hypot(dx, dy)
    TH = np.arctan2(dy, dx)
    RR = np.vectorize(rad_at)(TH)
    hole = D <= RR
    lip = (D <= RR + 2.0) & ~hole
    enamel = (D <= RR + 4.4) & ~hole & ~lip
    soot = (D <= RR + 9.0) & ~hole & ~lip & ~enamel
    snoise = periodic_noise(S, S, 4, 4, 77)
    for (y, x) in zip(*np.nonzero(soot)):
        d = D[y, x] - RR[y, x] - 4.4
        v = snoise[y, x] - d / 9.0
        if v > 0.55:
            im.put(x, y, "k1h")
        elif v > 0.35:
            im.put(x, y, "k2")
        elif v > 0.2:
            im.put(x, y, "k2h")
    chip_n = periodic_noise(S, S, 2, 2, 91)
    for (y, x) in zip(*np.nonzero(enamel)):
        ang = math.atan2(y + 0.5 - cy, x + 0.5 - cx)
        lit = math.cos(ang - math.pi * 1.25)
        if chip_n[y, x] > 0.62:
            im.put(x, y, "b1h" if lit > 0 else "b1")
        else:
            im.put(x, y, "i3" if lit > 0.5 else "i2h" if lit > 0.0 else "i2" if lit > -0.5 else "i1h")
    for (y, x) in zip(*np.nonzero(lip)):
        ang = math.atan2(y + 0.5 - cy, x + 0.5 - cx)
        lit = math.cos(ang - math.pi / 4)
        inner = D[y, x] - RR[y, x] < 1.0
        k = ["b0", "b0h", "b1", "b1h", "b2", "b2h", "b3", "b3h", "b4"][int((lit + 1) / 2 * 8.99)]
        im.put(x, y, k if inner else hd.step(k, -2))
    im.fill_mask(hole, "k0")
    depth = hole & (D > RR - 2.2)
    for (y, x) in zip(*np.nonzero(depth)):
        ang = math.atan2(y + 0.5 - cy, x + 0.5 - cx)
        im.put(x, y, "k2" if math.cos(ang - math.pi / 4) > 0.2 else "k1")
    for (x, y, col) in ((29, 27, "k4"), (41, 36, "s0"), (34, 38, "k3"), (43, 25, "k3h")):
        if hole[y, x]:
            im.put(x, y, col)
    for k in range(12):
        ang = k * 2 * math.pi / 12 + 0.3
        r = rad_at(ang) + 7.0
        x, y = int(cx + math.cos(ang) * r), int(cy + math.sin(ang) * r / 1.05)
        if 1 <= x < S - 2 and 1 <= y < S - 2 and not hole[y, x] and y < FLOOR:
            im.pts([(x, y), (x + 1, y)], "b3h")
            im.pts([(x, y + 1)], "b2")
            im.pts([(x + 1, y + 1)], "b1")
            im.put(x + 2, y + 2, "k1")
    for (ang, ln) in ((-2.4, 4.4), (0.3, 3.6), (1.9, 4.4), (-0.9, 3.2), (2.8, 3.0)):
        r0 = rad_at(ang) + 0.8
        x0, y0 = cx + math.cos(ang) * r0, cy + math.sin(ang) * r0 / 1.05
        x1, y1 = cx + math.cos(ang) * (r0 - ln), cy + math.sin(ang) * (r0 - ln) / 1.05
        for (px_, py_) in line_pts(round(x0), round(y0), round(x1), round(y1)):
            im.put(px_, py_, "b2")
            im.put(px_ + 1, py_, "b1")
        im.put(round(x1), round(y1), "i2")
    for j in range(4):
        th0 = j * 2 * math.pi / 4 + 2.3
        u0 = (frame / n) * 0.72
        pts = []
        for st in range(7):
            uu = u0 + 0.045 * st
            th = th0 + uu * 0.9
            r = 33.5 - uu * 17.0
            pts.append((cx + math.cos(th) * r, cy + math.sin(th) * r * 0.85))
        cols = ["k5", "s0", "s0h", "s1", "s2", "s3", "i4"]
        for i in range(len(pts) - 1):
            for (x, y) in line_pts(round(pts[i][0]), round(pts[i][1]), round(pts[i + 1][0]), round(pts[i + 1][1])):
                if 0 <= x < S and 0 <= y < FLOOR and not hole[y, x] and im.key(x, y) not in ("b4", "b3h", "b3"):
                    im.put(x, y, cols[i])
    return im


def seal_lattice(frame: int, n=4) -> Img:
    """The Seal's quarantine grid (red-violet), tileable both ways (period 36), a scanline sweeping down over the
    4 frames. Wires 1 px, nodes 3x3 studs."""
    S = TILE
    P = 36
    im = Img(S, S)
    band = frame * (S // n)
    for y in range(S):
        dyb = (y - band) % S
        for x in range(S):
            a_ = (x + y) % P == 0
            b_ = (x - y) % P == 0
            if not (a_ or b_):
                continue
            node = a_ and b_
            if dyb < 3:
                col = "e4" if node else ("e3" if a_ else "v4")
            elif dyb < 10:
                col = "e3" if node else ("e2h" if a_ else "v3")
            elif dyb >= S - 4:
                col = "e2h" if node else ("e1h" if a_ else "v2h")
            else:
                col = "e2" if node else ("e1" if a_ else "v1h")
            im.put(x, y, col)
    for y in range(S):
        for x in range(S):
            if (x + y) % P == 0 and (x - y) % P == 0:
                dyb = (y - band) % S
                c_ = "e3" if dyb < 10 else "e2"
                for ddx in (-1, 0, 1):
                    for ddy in (-1, 0, 1):
                        if ddx or ddy:
                            im.put((x + ddx) % S, (y + ddy) % S, c_ if abs(ddx) + abs(ddy) == 1 else "e1")
                im.put(x, y, "e4" if dyb < 10 else "e3")
    for x in range(S):
        if im.get(x, band) < 0 and x % 3 == 0:
            im.put(x, band, "v2")
    return im


def veil_shimmer(frame: int, n=4) -> Img:
    """Lamp-dark veil: faint violet diagonal shimmer dashes drifting across (tileable, 72x72)."""
    S = TILE
    im = Img(S, S)
    off = frame * (S // n)
    for y in range(S):
        for x in range(S):
            d = (x - y + off) % 24
            if d == 0 and ((x // 6 + y // 9) % 2 == 0):
                im.put(x, y, "v2")
            elif d == 1 and ((x // 6 + y // 9) % 2 == 0) and (x + y) % 4 == 0:
                im.put(x, y, "v1h")
            elif d == 12 and (x + y) % 24 == 0:
                im.put(x, y, "v3")
    return im


def build_tiles(at: Atlas):
    at.group("tiles")
    at.seq("fire", [fire_tile(f) for f in range(4)], 0, 0, fps=8, loop=True)
    at.seq("breach", [breach_tile(f) for f in range(4)], 0, 0, fps=8, loop=True)
    at.seq("seal-lattice", [seal_lattice(f) for f in range(4)], 0, 0, fps=6, loop=True)
    at.seq("veil-shimmer", [veil_shimmer(f) for f in range(4)], 0, 0, fps=6, loop=True)


# ─── small particles ───────────────────────────────────────────────────────────────────────────────────────

def smoke_puffs() -> list[Img]:
    spec = [
        [(14.0, 16.0, 4.6)],
        [(14.0, 15.0, 7.0)],
        [(12.0, 13.0, 6.6), (18.0, 17.0, 5.0)],
        [(11.0, 10.0, 4.2), (19.0, 13.0, 3.6), (15.0, 18.0, 3.0)],
    ]
    frames = []
    for f, ps in enumerate(spec):
        im = Img(28, 28)
        for j, (x, y, r) in enumerate(ps):
            puff(im, x, y, r, SMOKE_LIGHT if f < 3 else SMOKE, rough=0.2, seed=50 + j)
        frames.append(im)
    return frames


def repair_sparks() -> list[Img]:
    """Welding at the repair point: a pin-point white-hot contact, short spark streaks and cooling droplets."""
    frames = []
    S = 28
    c = 14
    for f in range(3):
        im = Img(S, S)
        rng = random.Random(420 + f)
        radial(im, c, c, [3.5, 2.6, 1.8][f], ["a0", "a1", "a2", "a3"], power=0.8)
        im.put(c, c, "i4" if f < 2 else "a3")
        for k in range([6, 5, 3][f]):
            a = rng.uniform(-math.pi, math.pi * 0.2)
            r0, r1 = 3 + f * 2, 6 + f * 3 + rng.uniform(0, 3)
            g = f * 1.2
            keys = [["a1", "a2", "a3"], ["a0", "a1", "a2"], ["e1", "a0", "b2"]][f]
            streak(im, c + math.cos(a) * r0, c + math.sin(a) * r0, c + math.cos(a) * r1, c + math.sin(a) * r1 + g, keys)
        frames.append(im)
    return frames


GLASS_SHARDS = [
    [(1, 0), (6, 4), (9, 11), (2, 8)],
    [(4, 0), (10, 5), (5, 11), (0, 6)],
    [(0, 1), (10, 0), (7, 6), (5, 11)],
    [(2, 1), (11, 5), (8, 9), (0, 7)],
]


def glass_shard(i: int) -> Img:
    """A shard of Cathedral glass: two facets (lit / shaded violet), a bright edge glint, dark outline."""
    im = Img(12, 12)
    pts = [(x + 0.5, y + 0.5) for x, y in GLASS_SHARDS[i]]
    m = hd.poly_mask(12, 12, pts)
    X, Y = grid(12, 12)
    (x0, y0), (x2, y2) = pts[0], pts[2]
    side = (X - x0) * (y2 - y0) - (Y - y0) * (x2 - x0)
    im.a[m & (side < 0)] = idx("v3")
    im.a[m & (side >= 0)] = idx("v1h")
    band = m & (np.abs(side) < 6)
    im.a[band & (side < 0)] = idx("v3h")
    im.a[band & (side >= 0)] = idx("v2")
    im.rim("v4", None, sel=["v3", "v3h"])
    im.outline("k0")
    return im


def stop_sparks() -> list[Img]:
    """A machine powering down: a few teal sparks sinking and dimming, a small curl of dark smoke."""
    frames = []
    S = 32
    pts = [(12, 12), (20, 10), (16, 18), (8, 18), (23, 18)]
    for f in range(4):
        im = Img(S, S)
        if f >= 1:
            puff(im, 16 + f, 13 - f * 2, 2.2 + f * 1.2, SMOKE)
        for k, (x, y) in enumerate(pts):
            if f == 3 and k > 2:
                continue
            y2 = y + f * 2 + (k % 2) * f
            x2 = x + (k - 2) * f // 2
            keys = [["t2", "t3", "t4"], ["t1", "t2", "t3"], ["t0", "t1", "t1h"], ["k5", "s0", "t0"]][f]
            streak(im, x2, y2 - 2, x2, y2, keys)
        frames.append(im)
    return frames


def build_particles(at: Atlas):
    at.group("particles")
    at.seq("smoke", smoke_puffs(), 14, 14, fps=8, loop=False)
    at.seq("repair-sparks", repair_sparks(), 14, 14, fps=12, loop=True)
    for i in range(4):
        at.add(f"glass-shard-{i}", glass_shard(i), 6, 6)
    motes = []
    for f in range(4):
        im = Img(10, 10)
        r = [1.6, 2.8, 2.2, 1.2][f]
        radial(im, 5, 5, r + 0.6, ["e1", "e1h", "e2", "e2h", "e3", "a2"][:[3, 6, 5, 3][f]], power=0.8)
        motes.append(im)
    at.seq("ember-mote", motes, 5, 5, fps=8, loop=True)
    sp = []
    for f in range(4):
        im = Img(18, 18)
        arm = [0, 2, 4, 2][f]
        radial(im, 9, 9, [1.4, 2.0, 2.6, 1.8][f], ["b2", "b3", "b4", "b5"], power=0.8)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            for s_ in range(2, 2 + arm):
                im.put(9 + dx * s_, 9 + dy * s_, "b4" if s_ < 2 + arm // 2 else "b3")
        if f == 2:
            im.put(9, 9, "a3")
        sp.append(im)
    at.seq("salvage-sparkle", sp, 9, 9, fps=10, loop=True)
    tr = []
    for f, r in enumerate([3.6, 2.6, 1.6]):
        im = Img(10, 10)
        radial(im, 5, 5, r, GLOW["teal"][f * 2: 7 - f], power=0.9)
        tr.append(im)
    at.seq("drone-trail", tr, 5, 5, fps=10, loop=False)
    at.seq("stop-sparks", stop_sparks(), 16, 16, fps=8, loop=False)


# ─── markers ───────────────────────────────────────────────────────────────────────────────────────────────

def move_marker() -> list[Img]:
    """Side view crew-move target at the feet: a teal signal chevron bobbing above two brass floor brackets.
    34x20, anchor (17,19) = the floor point (put it on the floor line)."""
    frames = []
    W, H = 34, 20
    X, Y = grid(W, H)
    for f in range(4):
        im = Img(W, H)
        bob = [0, 1, 2, 1][f]
        top = 1 + bob
        tri = (Y >= top) & (Y <= top + 7) & (np.abs(X - 17) <= (top + 7 - Y) * 0.95 + 0.3)
        notch = (Y >= top) & (Y <= top + 2.6) & (np.abs(X - 17) <= (top + 2.6 - Y) * 0.95 - 0.5)
        shape = tri & ~notch
        v = np.clip(1 - (Y - top) / 8.0, 0, 1) * 0.55 + np.clip(1 - np.abs(X - 17) / 8.0, 0, 1) * 0.45
        put_ramp(im, shape, v, TEAL[3:])
        for x0, dx in ((2, 1), (31, -1)):
            for yy in (13, 14, 15):
                im.put(x0, yy, "b3h" if yy == 13 else "b2h")
            for xx in range(1, 6):
                im.put(x0 + dx * xx, 15, "b2h" if xx < 2 else "b2")
                im.put(x0 + dx * xx, 16, "b1")
        for x in range(12, 23):
            im.put(x, 16, "t2" if abs(x - 17) < 3 else "t1h")
        im.put(17 + (f % 2) * 2 - 1, 16, "t3")
        im.outline("k0")
        frames.append(im)
    return frames


def reticle(lamp_keys, locked=False) -> list[Img]:
    """Targeting reticle as a switchboard jack: a turned brass bezel ring (torus-shaded) with four lamp nubs
    (N/E/S/W), crosshair ticks and a jack socket at the centre. Unlocked, the lamps light round in turn; locked,
    all four burn and pulse. 57x57, anchor (28,28). lamp_keys = (off, dim, lit, core)."""
    off, dim, lit, core = lamp_keys
    S = 57
    c = 28.5
    out = []
    X, Y = grid(S, S)
    d = np.hypot(X - c, Y - c)
    ring = (d >= 17.2) & (d <= 22.0)
    u = np.clip((d - 19.6) / 2.4, -1, 1)
    nx, ny = (X - c) / np.maximum(d, 1e-3) * u, (Y - c) / np.maximum(d, 1e-3) * u
    lam = hd.lambert(nx, ny, np.sqrt(np.clip(1 - u * u, 0, 1)), 0.2)
    sock = (d >= 3.4) & (d <= 5.8)
    us = np.clip((d - 4.6) / 1.2, -1, 1)
    lam_s = hd.lambert((X - c) / np.maximum(d, 1e-3) * us, (Y - c) / np.maximum(d, 1e-3) * us,
                       np.sqrt(np.clip(1 - us * us, 0, 1)), 0.2)
    lamps = [(28, 8), (48, 28), (28, 48), (8, 28)]
    for f in range(4):
        im = Img(S, S)
        put_ramp(im, ring, lam, BRASS[0:10])
        put_ramp(im, sock, lam_s, BRASS[1:9])
        for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0)):
            for r in range(9, 15):
                col = (lit if r < 11 else dim) if locked else ("b2h" if r < 12 else "b1h")
                im.put(28 + dx * r, 28 + dy * r, col)
        im.put(28, 28, (core if f % 2 == 0 else lit) if locked else dim)
        for i, (lx, ly) in enumerate(lamps):
            on = locked or i == f % 4
            for ddx in (-2, -1, 0, 1, 2):
                for ddy in (-2, -1, 0, 1, 2):
                    if abs(ddx) + abs(ddy) <= 3 and im.get(lx + ddx, ly + ddy) >= 0:
                        im.put(lx + ddx, ly + ddy, "b1")
            glow_keys = [dim, lit, core] if on and (not locked or f % 2 == 0) else [off, dim, lit] if on else [off, off, dim]
            radial(im, lx + 0.5, ly + 0.5, 2.4, glow_keys, power=0.8)
        im.outline("k0")
        out.append(im)
    return out


def hop_glow() -> list[Img]:
    """The handshake spooling up: a dark brass track in three segments — HELLO (teal), I HEAR YOU (amber),
    I HEAR YOU HEAR ME (ivory) — each with a lamp nub; a bright pulse runs round (60 deg per frame). 67x67."""
    S = 67
    c = S / 2
    X, Y = grid(S, S)
    d = np.hypot(X - c, Y - c)
    ring = (d >= 24.2) & (d <= 28.4)
    ang = np.arctan2(Y - c, X - c)
    rel = (ang + math.pi / 2) % (2 * math.pi)
    seg = (rel / (2 * math.pi / 3)).astype(int)
    within = rel - seg * 2 * math.pi / 3
    segs = [GLOW["teal"], GLOW["amber"], GLOW["ivory"]]
    frames = []
    for f in range(6):
        im = Img(S, S)
        head = -math.pi / 2 + f * math.pi / 3
        behind = (head - ang) % (2 * math.pi)
        radial_v = 1 - np.abs(d - 26.3) / 2.2
        for si in range(3):
            m = ring & (seg == si) & (within >= 0.1)
            base = 0.35 + 0.25 * radial_v
            pulse = np.where(behind < 0.3, 1.0, np.where(behind < 1.1, 0.8 - behind * 0.3, 0.0))
            v = np.clip(np.maximum(base, pulse * (0.6 + 0.4 * radial_v)), 0, 0.999)
            put_ramp(im, m, v, segs[si])
        gap = ring & (within < 0.1)
        im.a[gap] = idx("b0h")
        for si, st in enumerate((-math.pi / 2, math.pi / 6, 5 * math.pi / 6)):
            lx = c + math.cos(st + 0.12) * 26.3
            ly = c + math.sin(st + 0.12) * 26.3
            radial(im, lx, ly, 3.2, BRASS[2:8], power=0.6)
            radial(im, lx, ly, 1.8, segs[si][-4:], power=0.8)
        frames.append(im)
    return frames


def hop_flash() -> list[Img]:
    """The switch takes the tender: the three handshake arcs close in on the lamp, then a short horizontal flare."""
    S = 67
    c = S / 2
    X, Y = grid(S, S)
    d = np.hypot(X - c, Y - c)
    ang = np.arctan2(Y - c, X - c)
    rel = (ang + math.pi / 2) % (2 * math.pi)
    seg = (rel / (2 * math.pi / 3)).astype(int)
    within = rel - seg * 2 * math.pi / 3
    arcs = [GLOW["teal"], GLOW["amber"], GLOW["ivory"]]
    frames = []
    for f, (r, core) in enumerate([(26, 0), (18, 3.2), (10, 5.2), (0, 7.2)]):
        im = Img(S, S)
        if r:
            ring = (np.abs(d - r) <= 1.6) & (within >= 0.12)
            v = 1 - np.abs(d - r) / 1.6
            for si in range(3):
                put_ramp(im, ring & (seg == si), 0.5 + 0.49 * v, arcs[si])
        if core:
            radial(im, c, c, core + 2, GLOW["amber"][1:], power=0.8)
        if f == 3:
            for dx in (1, -1):
                for st in range(8, 17):
                    im.put(int(c) + dx * st, int(c), "a2" if st < 11 else "a1" if st < 14 else "a0")
        frames.append(im)
    return frames


def teleport_in() -> list[Img]:
    """Boarders latching on: an amber lattice of light draws the body in. 48x64, anchor at the feet (24,63)."""
    frames = []
    W, H = 48, 64
    for f in range(6):
        im = Img(W, H)
        top = [60, 38, 16, 4, 4, 4][f]
        cols = (12, 24, 36)
        if f <= 4:
            for x in cols:
                for y in range(top, H - 2):
                    k = y - top
                    im.put(x, y, ["a3", "a2h", "a2", "a1h"][min(3, k // 2)] if k < 8 else ["a1", "a1", "a1h", "a1", "a0h"][f])
            if f >= 2:
                for y in range(top + 4, H - 2, 8):
                    im.hline(cols[0], cols[-1], y, ["a0", "a0", "a0h", "a1", "a0h"][f])
        if f >= 3:
            core = [0, 0, 0, 5.0, 7.0, 3.2][f]
            radial(im, 24, 34, core * 0.55, GLOW["amber"][1:], ry=core * 2.6, power=1.2)
        rr = [6, 12, 14, 14, 12, 6][f]
        for x in range(24 - rr, 24 + rr + 1):
            im.put(x, H - 1, "a1" if abs(x - 24) < rr * 0.6 else "a0h" if abs(x - 24) < rr else "a0")
            im.put(x, H - 2, "a0" if abs(x - 24) < rr * 0.6 else "b2")
        frames.append(im)
    return frames


def build_markers(at: Atlas):
    at.group("markers")
    at.seq("move-marker", move_marker(), 17, 19, fps=8, loop=True)
    at.seq("reticle", reticle(("b1", "a0h", "a2", "a3")), 28, 28, fps=6, loop=True)
    at.seq("reticle-locked", reticle(("e0", "e1h", "e3", "e4"), locked=True), 28, 28, fps=6, loop=True)
    at.seq("reticle-ion", reticle(("b1", "v2", "v3h", "v4")), 28, 28, fps=6, loop=True)
    at.seq("reticle-ion-locked", reticle(("v0h", "v2", "v3h", "v4"), locked=True), 28, 28, fps=6, loop=True)
    at.seq("hop-glow", hop_glow(), 33, 33, fps=10, loop=True)
    at.seq("hop-flash", hop_flash(), 33, 33, fps=12, loop=False)
    at.seq("teleport-in", teleport_in(), 24, 63, fps=10, loop=False)


def build(at: Atlas | None = None) -> Atlas:
    at = at or Atlas("fx", width=1024)
    build_bolts(at)
    build_ion(at)
    build_shells(at)
    build_flak(at)
    build_beams(at)
    build_explosions(at)
    build_hits(at)
    build_tiles(at)
    build_particles(at)
    build_markers(at)
    from fx_cable import build_cable
    build_cable(at)
    from fx_overlay import build_overlays
    build_overlays(at)
    return at
