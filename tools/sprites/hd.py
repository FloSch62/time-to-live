"""Hi-bit (HD, contract v3) authoring helpers shared by every atlas module.

Atlases are authored at 2x density (2 atlas px per layout unit). At this resolution hand-placed ASCII alone gets
slow, so these helpers do the repetitive parts deterministically while the artistic decisions stay explicit:

- material ramps built from the master ramps plus their HD half steps (px.ramp) — 7..11 steps per material;
- `step(key, d)`: move a colour d steps lighter/darker along its own HD ramp (for AO, rim light, far limbs);
- masks: polygon, capsule, ellipse (pixel-centre sampling, no anti-aliasing);
- normals + Lambert shading into a ramp with the house light (top-left, slightly in front), quantised into bands;
- ambient occlusion: darken pixels of a part that sit next to an occluder (folds, joints, under straps);
- selective outline: silhouette edge in k0, but lit top-left edges use the darkest step of the adjacent fill;
- cleanup: remove orphan pixels (a single pixel unlike all 8 neighbours) that read as noise.
"""
from __future__ import annotations

import math

import numpy as np

from px import KEY, NAME, Img, idx, ramp

LIGHT = (-0.55, -0.72, 0.42)  # house light: from the top-left, a little in front
_L = np.array(LIGHT) / np.linalg.norm(LIGHT)

# ── HD ramps (dark -> light). Every key of a ramp can be stepped along its own ramp. ──────────────────────────
HD_RAMPS = {letter: ramp(letter) for letter in "ksibcgtave"}
# a few cross-ramp materials used everywhere
MAT = {
    "ink": ramp("k"),
    "iron": ["k1", "k2", "k2h", "k3", "k3h", "k4", "k4h", "k5", "k5~s0", "s0"],
    "steel": ["k3", "k4", "k5", "k5~s0", "s0", "s0h", "s1", "s1h", "s2", "s2h", "s3"],
    "brass": ["b0", "b0h", "b1", "b1h", "b2", "b2h", "b3", "b3h", "b4"],
    "brass-dark": ["k2", "c0", "b0", "b0h", "b1", "b1h", "b2", "b2h"],
    "ivory": ["i0", "i0h", "i1", "i1h", "i2", "i2h", "i3", "i3h", "i4"],
    "ivory-worn": ["k4", "b0", "i0", "i0h", "i1", "i1h", "i2", "i2h", "i3"],
    "copper": ramp("c"),
    "verdigris": ramp("g"),
    "teal": ramp("t"),
    "amber": ramp("a"),
    "violet": ramp("v"),
    "ember": ramp("e"),
}

_POS = {}
for _letter, _keys in HD_RAMPS.items():
    for _i, _k in enumerate(_keys):
        _POS[_k] = (_letter, _i)


def step(key: str, d: int) -> str:
    """Move `key` d steps along its HD ramp (negative = darker), clamped to the ramp ends."""
    if key not in _POS:
        return key
    letter, i = _POS[key]
    keys = HD_RAMPS[letter]
    return keys[max(0, min(len(keys) - 1, i + d))]


def step_idx(v: int, d: int) -> int:
    """Same as step() on a palette index (-1 stays transparent)."""
    if v < 0:
        return v
    return idx(step(NAME[int(v)], d))


# ── masks ───────────────────────────────────────────────────────────────────────────────────────────────────
def grid(w, h):
    ys, xs = np.mgrid[0:h, 0:w]
    return xs + 0.5, ys + 0.5


def poly_mask(w, h, pts) -> np.ndarray:
    """Even-odd polygon fill sampled at pixel centres."""
    X, Y = grid(w, h)
    inside = np.zeros((h, w), bool)
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        if y1 == y2:
            continue
        cond = ((Y >= min(y1, y2)) & (Y < max(y1, y2)))
        xint = x1 + (Y - y1) * (x2 - x1) / (y2 - y1)
        inside ^= cond & (X < xint)
    return inside


def ellipse_mask(w, h, cx, cy, rx, ry) -> np.ndarray:
    X, Y = grid(w, h)
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1.0


def capsule(w, h, p0, p1, r0, r1=None):
    """Tapered capsule from p0 (radius r0) to p1 (radius r1). Returns (mask, t_along, s_across in -1..1)."""
    r1 = r0 if r1 is None else r1
    X, Y = grid(w, h)
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy or 1e-6
    t = ((X - x0) * dx + (Y - y0) * dy) / L2
    tc = np.clip(t, 0, 1)
    px_, py_ = x0 + tc * dx, y0 + tc * dy
    r = r0 + (r1 - r0) * tc
    dist = np.hypot(X - px_, Y - py_)
    mask = dist <= r
    # signed distance across the axis (for cylinder shading): left-hand normal of the axis
    L = math.sqrt(L2)
    nxa, nya = -dy / L, dx / L
    s = ((X - px_) * nxa + (Y - py_) * nya) / np.maximum(r, 0.5)
    return mask, t, np.clip(s, -1, 1), (nxa, nya)


# ── shading ────────────────────────────────────────────────────────────────────────────────────────────────
def lambert(nx, ny, nz, ambient=0.18):
    n = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9
    d = (nx * _L[0] + ny * _L[1] + nz * _L[2]) / n
    return np.clip(ambient + (1 - ambient) * np.maximum(d, 0), 0, 1)


def cylinder_normals(s, axis_normal):
    """Normals of a cylinder: across-axis offset s in -1..1 bends the normal toward the axis normal."""
    nxa, nya = axis_normal
    nz = np.sqrt(np.clip(1 - s * s, 0, 1))
    return s * nxa, s * nya, nz


def sphere_normals(w, h, cx, cy, rx, ry):
    X, Y = grid(w, h)
    nx = (X - cx) / rx
    ny = (Y - cy) / ry
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    return nx, ny, nz


def bevel_normals(mask, width=2, flat_nz=1.0):
    """Flat face with bevelled edges: pixels within `width` of the mask edge tilt outward."""
    h, w = mask.shape
    nx = np.zeros((h, w))
    ny = np.zeros((h, w))
    m = mask.astype(float)
    for d in range(1, width + 1):
        pad = np.pad(mask, d, constant_values=False)
        left = ~pad[d:-d, :-2 * d] if d else 0
        right = ~pad[d:-d, 2 * d:]
        up = ~pad[:-2 * d, d:-d]
        down = ~pad[2 * d:, d:-d]
        wgt = (width + 1 - d) / width
        nx = np.where(mask & left & (nx == 0), -wgt, nx)
        nx = np.where(mask & right & (nx == 0), wgt, nx)
        ny = np.where(mask & up & (ny == 0), -wgt, ny)
        ny = np.where(mask & down & (ny == 0), wgt, ny)
    nz = np.full((h, w), flat_nz) * m
    return nx, ny, nz


def quantise(value, ramp_keys, lo=0.0, hi=1.0, bias=0.0):
    """Map 0..1 values to ramp indices (hard bands)."""
    n = len(ramp_keys)
    v = np.clip((value - lo) / max(hi - lo, 1e-6) + bias, 0, 0.9999)
    return (v * n).astype(int)


def paint(img: Img, mask, value, ramp_keys, lo=0.0, hi=1.0, bias=0.0):
    """Write ramp colours chosen by `value` (0..1) into img where mask is set."""
    ids = np.array([idx(k) for k in ramp_keys])
    q = quantise(value, ramp_keys, lo, hi, bias)
    img.a[mask] = ids[q[mask]]
    return img


def occlusion(mask, occluder, radius=2):
    """0..1 amount of occlusion for pixels of `mask` near `occluder` pixels (distance falloff, square kernel)."""
    h, w = mask.shape
    occ = np.zeros((h, w))
    for d in range(1, radius + 1):
        pad = np.pad(occluder, d, constant_values=False)
        near = np.zeros((h, w), bool)
        for dy in (-d, 0, d):
            for dx in (-d, 0, d):
                if dx == 0 and dy == 0:
                    continue
                near |= pad[d + dy:d + dy + h, d + dx:d + dx + w]
        occ = np.maximum(occ, near * (radius + 1 - d) / radius)
    return occ * mask


def darken_where(img: Img, where, steps=1):
    """Step every coloured pixel in `where` darker along its own ramp."""
    ys, xs = np.nonzero(where & (img.a >= 0))
    for y, x in zip(ys, xs):
        img.a[y, x] = step_idx(img.a[y, x], -steps)
    return img


def lighten_where(img: Img, where, steps=1):
    return darken_where(img, where, -steps)


# ── outline & cleanup ──────────────────────────────────────────────────────────────────────────────────────
def selout(img: Img, dark="k0", lit_steps=-4, lit_sides=("up", "left")):
    """Outline the silhouette. Outline pixels facing the light (top/left of the shape) take the adjacent fill colour
    stepped `lit_steps` darker (a coloured, softer edge); the rest are `dark`."""
    a = img.a
    m = a >= 0
    h, w = a.shape
    out = a.copy()
    dirs = {"up": (0, 1), "down": (0, -1), "left": (1, 0), "right": (-1, 0)}  # neighbour offset inside the shape
    for y in range(h):
        for x in range(w):
            if m[y, x]:
                continue
            nb = []
            for name, (dx, dy) in dirs.items():
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and m[yy, xx]:
                    nb.append((name, a[yy, xx]))
            if not nb:
                continue
            lit = [v for name, v in nb if name in lit_sides]
            unlit = [v for name, v in nb if name not in lit_sides]
            if lit and not unlit:
                out[y, x] = step_idx(lit[0], lit_steps)
            else:
                out[y, x] = idx(dark)
    img.a = out
    return img


def cleanup(img: Img, passes=1):
    """Replace orphan pixels (colour unlike all 8 neighbours, all neighbours opaque) by the most common neighbour."""
    for _ in range(passes):
        a = img.a
        h, w = a.shape
        out = a.copy()
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                v = a[y, x]
                if v < 0:
                    continue
                nb = a[y - 1:y + 2, x - 1:x + 2].flatten().tolist()
                nb.pop(4)
                if min(nb) < 0 or v in nb:
                    continue
                vals, counts = np.unique(nb, return_counts=True)
                out[y, x] = vals[np.argmax(counts)]
        img.a = out
    return img


def glow(img: Img, cx, cy, radius, ramp_keys, core=None):
    """Hard-banded radial glow (no outline); ramp_keys dark->light from the rim to the centre."""
    n = len(ramp_keys)
    for y in range(int(cy - radius - 1), int(cy + radius + 2)):
        for x in range(int(cx - radius - 1), int(cx + radius + 2)):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d <= radius:
                k = min(n - 1, int((1 - d / radius) * n))
                if img.inb(x, y):
                    img.put(x, y, ramp_keys[k])
    if core:
        img.put(int(cx), int(cy), core)
    return img
