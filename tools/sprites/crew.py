"""Crew atlas v3 — HD (2x density) side-view crew, 64x64 frames (contract DIRECTION v3).

Figures are built by a small skeletal rig: joints (pelvis, spine, neck, hips/knees/ankles, shoulders/elbows/wrists)
are posed per frame, limbs are solved with 2-bone IK, and every body part is a shaded shape (tapered capsules for
limbs, a spine-aligned polygon for the torso, ellipses/polygons for the head, coat skirts that drape over the legs).
Each pixel stores a *material* and a light value (Lambert, house light from the top-left); overlapping parts cast a
little occlusion on what lies behind them; materials resolve to multi-step HD ramps; the silhouette gets a selective
outline; hand-placed detail stamps (eyes, brows, headset, lamps, seams, buckles) go on top.

Individual looks are palette swaps of whole material ramps (see CHANNELS / LOOKS); the build checks that every
swappable colour belongs to one channel only.

Frame 72x72 (contract v4), facing RIGHT, anchor (36, 71) = the outline row under the boots (put it on the room's
floor line). The rig is posed in 64-unit "design" space and the canvas scales every shape by K = 72/64, so the
figures are ~60 px tall while 1-px details stay single pixels. Left frames are exact mirrors (anchor x 35).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field, replace

import numpy as np

import hd
from atlas import Atlas
from px import Img, hexof, idx

FW = FH = 72
AX, AY = 36, 71
K = 72 / 64          # design units (a 64-px figure space) -> frame pixels; figures come out ~59-60 px tall
SOLE = 62            # bottom row of the boot soles (design units)
THIGH, SHIN = 11.0, 11.5
UPPER, FORE = 9.5, 8.5
SPINE = 15.0
H, W = FH, FW


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Material canvas
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
FIXED_KEYS: set = set()   # every fixed palette key placed by detail stamps (checked against swap channels)


class Canvas:
    """Per-pixel material code + light value + part order (for occlusion); fixed colours for details."""

    def __init__(self, w=FW, h=FH, k=K):
        self.w, self.h = w, h
        self.k = k
        self.mat = np.full((h, w), "", dtype=object)
        self.val = np.zeros((h, w))
        self.part = np.full((h, w), -1, int)
        self.n = 0
        self.fixed = {}      # (x, y) -> palette key, drawn after outline? no: before outline (inside silhouette)
        self.late = {}       # (x, y) -> palette key drawn after the outline (glows, sparks)
        self.noshadow = set()

    # design-space -> pixel-space helpers
    def T(self, p):
        return p[0] * self.k, p[1] * self.k

    def polymask(self, pts):
        return hd.poly_mask(self.w, self.h, [self.T(p) for p in pts])

    def ellmask(self, cx, cy, rx, ry):
        x, y = self.T((cx, cy))
        return hd.ellipse_mask(self.w, self.h, x, y, rx * self.k, ry * self.k)

    def sphn(self, cx, cy, rx, ry):
        x, y = self.T((cx, cy))
        return hd.sphere_normals(self.w, self.h, x, y, rx * self.k, ry * self.k)

    def fill(self, mask, mat, val, dv=0.0, cast=True):
        self.n += 1
        m = mask
        self.mat[m] = mat
        v = val if np.isscalar(val) else val[m]
        self.val[m] = np.clip(v + dv, 0, 1)
        self.part[m] = self.n if cast else -2
        for k in [k for k in self.fixed if m[k[1], k[0]]]:
            del self.fixed[k]
        return self.n

    def put(self, x, y, key, late=False):
        x, y = self.T((x, y))
        self.putpx(int(x), int(y), key, late)

    def putpx(self, x, y, key, late=False):
        if not isinstance(key, tuple):
            FIXED_KEYS.add(key)
        if 0 <= x < self.w and 0 <= y < self.h:
            (self.late if late else self.fixed)[(int(x), int(y))] = key

    def setmat(self, x, y, mat, val):
        x, y = self.T((x, y))
        self.setpx(int(x), int(y), mat, val)

    def setpx(self, x, y, mat, val):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            if self.part[y, x] == -1:
                self.part[y, x] = -2          # a free-standing detail pixel: no occlusion either way
            self.mat[y, x] = mat
            self.val[y, x] = val
            self.fixed.pop((x, y), None)

    def occlusion(self, strength=0.22, contour=0.14):
        """Where a part lies in front of another, the pixels of the part behind get a dark contour line (the shadow
        of the front part's edge) and a softer occlusion one pixel further. Strongest under/right of the front part."""
        p = self.part
        dv = np.zeros_like(self.val)
        line = np.zeros(p.shape, bool)
        for dx, dy, s in ((0, -1, 1.35), (-1, 0, 1.2), (1, 0, 0.8), (0, 1, 0.7)):
            nb = np.full_like(p, -1)
            ys = slice(max(0, dy), self.h + min(0, dy))
            xs = slice(max(0, dx), self.w + min(0, dx))
            yd = slice(max(0, -dy), self.h + min(0, -dy))
            xd = slice(max(0, -dx), self.w + min(0, -dx))
            nb[yd, xd] = p[ys, xs]
            front = (p >= 0) & (nb > p)
            line |= front
            dv = np.maximum(dv, front * strength * s)
        self.val = np.clip(self.val - dv, 0, 1)
        self.val[line] = np.minimum(self.val[line], contour)

    def resolve(self, ramps: dict, outline=True, lit_steps=-3, bands=None) -> Img:
        """bands[mat] = number of light planes for big surfaces (values snap to planes, contours keep the darkest
        step); materials without an entry use every step of their ramp."""
        bands = bands if bands is not None else getattr(self, "bands", {})
        img = Img(self.w, self.h)
        for mat, keys in ramps.items():
            m = self.mat == mat
            if not m.any():
                continue
            ids = np.array([idx(k) for k in keys])
            v = self.val[m]
            B = bands.get(mat)
            n = len(keys)
            if B:
                planes = np.round(np.linspace(1, n - 1, B)).astype(int)
                qb = np.clip((v * B).astype(int), 0, B - 1)
                q = planes[qb]
                q[v < 0.16] = 0
            else:
                q = np.clip((v * n).astype(int), 0, n - 1)
            img.a[m] = ids[q]
        unknown = set(np.unique(self.mat[(self.mat != "")]).tolist()) - set(ramps)
        if unknown:
            raise KeyError(f"materials without ramp: {unknown}")
        hd.cleanup(img)

        def key(k):
            return ramps[k[1]][k[2]] if isinstance(k, tuple) else k
        for (x, y), k in self.fixed.items():
            if img.a[y, x] >= 0:
                img.put(x, y, key(k))
        if outline:
            hd.selout(img, "k0", lit_steps)
        for (x, y), k in self.late.items():
            img.put(x, y, key(k))
        return img


# ── shapes ──────────────────────────────────────────────────────────────────────────────────────────────────
def limb(cv: Canvas, p0, p1, r0, r1, mat, dv=0.0, amb=0.2, soft=1.0):
    m, t, s, n = hd.capsule(cv.w, cv.h, cv.T(p0), cv.T(p1), r0 * cv.k, r1 * cv.k)
    nx, ny, nz = hd.cylinder_normals(s * soft, n)
    val = hd.lambert(nx, ny, nz, amb)
    return cv.fill(m, mat, val, dv)


def blob(cv: Canvas, cx, cy, rx, ry, mat, dv=0.0, amb=0.2):
    m = cv.ellmask(cx, cy, rx, ry)
    nx, ny, nz = cv.sphn(cx, cy, rx, ry)
    return cv.fill(m, mat, hd.lambert(nx, ny, nz, amb), dv)


def poly(cv: Canvas, pts, mat, dv=0.0, axis=None, amb=0.2, flat=0.62):
    """Polygon; shaded as a cylinder around `axis` ((p0, p1, radius)) or flat-ish if axis is None."""
    m = cv.polymask(pts)
    if axis is None:
        val = np.full((cv.h, cv.w), flat)
    else:
        (x0, y0), (x1, y1), rad = axis
        (x0, y0), (x1, y1), rad = cv.T((x0, y0)), cv.T((x1, y1)), rad * cv.k
        X, Y = hd.grid(cv.w, cv.h)
        dx, dy = x1 - x0, y1 - y0
        L = math.hypot(dx, dy) or 1
        nxa, nya = -dy / L, dx / L
        s = np.clip(((X - x0) * nxa + (Y - y0) * nya) / rad, -1, 1)
        nx, ny, nz = hd.cylinder_normals(s, (nxa, nya))
        val = hd.lambert(nx, ny, nz, amb)
    return cv.fill(m, mat, val, dv)


def line(cv: Canvas, p0, p1, key, late=False):
    from px import line_pts
    (a, b), (c, d) = cv.T(p0), cv.T(p1)
    for x, y in line_pts(round(a - 0.5), round(b - 0.5), round(c - 0.5), round(d - 0.5)):
        cv.putpx(x, y, key, late)


def matline(cv: Canvas, p0, p1, mat, val):
    from px import line_pts
    (a, b), (c, d) = cv.T(p0), cv.T(p1)
    for x, y in line_pts(round(a - 0.5), round(b - 0.5), round(c - 0.5), round(d - 0.5)):
        cv.setpx(x, y, mat, val)


# ── kinematics ─────────────────────────────────────────────────────────────────────────────────────────────
def ik(root, target, a, b, bend=1.0):
    rx, ry = root
    tx, ty = target
    dx, dy = tx - rx, ty - ry
    d = math.hypot(dx, dy)
    d = max(abs(a - b) + 1e-3, min(a + b - 1e-3, d))
    ang = math.atan2(dy, dx)
    cosA = (a * a + d * d - b * b) / (2 * a * d)
    A = math.acos(max(-1, min(1, cosA)))
    return rx + a * math.cos(ang - bend * A), ry + a * math.sin(ang - bend * A)


def add(p, q, k=1.0):
    return p[0] + q[0] * k, p[1] + q[1] * k


def lerp(p, q, t):
    return p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t


@dataclass
class Pose:
    pelvis: tuple = (32.0, 36.5)
    lean: float = 0.0                 # spine angle, radians, + leans forward (toward +x)
    head: float = 0.0                 # head tilt relative to spine, + nods forward/down
    near_ankle: tuple = (33.5, 58.5)
    far_ankle: tuple = (30.5, 58.5)
    near_toe: float = 0.0             # foot pitch, + = toe down (heel up)
    far_toe: float = 0.0
    near_wrist: tuple | None = None   # None = hanging
    far_wrist: tuple | None = None
    near_hand: str = "open"
    far_hand: str = "open"
    tool: str | None = None           # "spanner" in the near hand
    breathe: float = 0.0              # 0..1 chest rise
    eyes: str = "open"                # open | closed
    lamp: float = 1.0                 # chest lamp intensity 0..1
    kneel: bool = False


class Skeleton:
    def __init__(self, pose: Pose, dims: dict):
        self.p = pose
        d = dims
        P = pose.pelvis
        u = (math.sin(pose.lean), -math.cos(pose.lean))        # spine up
        n = (math.cos(pose.lean), math.sin(pose.lean))         # body front
        self.u, self.n = u, n
        self.P = P
        self.C = add(P, u, d["spine"])                         # chest top / neck base
        hu = (math.sin(pose.lean + pose.head), -math.cos(pose.lean + pose.head))
        self.hu = hu
        self.Hc = add(add(self.C, hu, d["neck"] + 3.6), (math.cos(pose.lean + pose.head), math.sin(pose.lean + pose.head)), 0.6)
        self.S = add(add(self.C, u, -2.2), n, -0.6)           # shoulder joint
        self.hip_near = add(P, n, 0.6)
        self.hip_far = add(P, n, -0.8)
        thigh, shin = d["thigh"], d["shin"]
        self.knee_near = ik(self.hip_near, pose.near_ankle, thigh, shin, +1)
        self.knee_far = ik(self.hip_far, pose.far_ankle, thigh, shin, +1)
        self.ankle_near, self.ankle_far = pose.near_ankle, pose.far_ankle
        up, fo = d["upper"], d["fore"]
        hang_n = add(self.S, (0.6, up + fo - 0.6))
        hang_f = add(self.S, (-0.6, up + fo - 0.6))
        self.wrist_near = pose.near_wrist or hang_n
        self.wrist_far = pose.far_wrist or hang_f
        self.elbow_near = ik(self.S, self.wrist_near, up, fo, -1)
        self.elbow_far = ik(add(self.S, n, -1.0), self.wrist_far, up, fo, -1)
        self.S_far = add(self.S, n, -1.0)


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Human renderer (side view)
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
DIMS = dict(spine=SPINE, neck=2.0, thigh=THIGH, shin=SHIN, upper=UPPER, fore=FORE,
            front=[3.2, 3.4, 3.0, 3.8, 4.1, 2.6], back=[3.7, 3.9, 3.1, 3.3, 3.5, 2.7],
            thigh_r=(3.0, 2.3), shin_r=(2.3, 1.8), arm_r=(2.2, 1.8), fore_r=(1.8, 1.5))
TS = [-0.12, 0.0, 0.3, 0.55, 0.8, 1.0]


@dataclass
class Look:
    name: str
    ramps: dict
    dims: dict = field(default_factory=lambda: dict(DIMS))
    skirt: float = 9.0            # coat length below the pelvis (0 = no skirt)
    skirt_flare: float = 1.5
    hair: str = "short"           # short | long | cap | none
    helmet: bool = False
    back: object = None           # fn(cv, sk, pose, frame_kind)
    head_gear: object = None      # fn(cv, sk, pose)
    front: object = None          # fn(cv, sk, pose)
    torso_detail: object = None   # fn(cv, sk, pose)
    lamp_at: float = 0.72         # chest lamp position along the spine (None = no lamp)
    back_view: object = None      # fn(cv, look, P, C, half, f): things on the back in the climb view
    back_head: object = None      # fn(cv, look, Hc): headgear seen from behind
    sleeve: str = "coat"
    hand: str = "skin"
    leg: str = "trousers"
    boot: str = "boot"
    far_dv: float = -0.24
    bands: dict = field(default_factory=lambda: {"coat": 4, "trousers": 4, "boot": 3, "leather": 3, "hair": 4,
                                                 "skin": 4, "brass": 4, "sole": 2})


def torso_pts(sk: Skeleton, d, breathe=0.0, t0=None):
    P, u, n = sk.P, sk.u, sk.n
    front = [f + (0.5 * breathe if i in (3, 4) else 0) for i, f in enumerate(d["front"])]
    fr = [add(add(P, u, t * d["spine"]), n, f) for t, f in zip(TS, front)]
    bk = [add(add(P, u, t * d["spine"]), n, -b) for t, b in zip(TS, d["back"])]
    return fr + bk[::-1]


def boot(cv: Canvas, ankle, pitch, mat, dv, sole_mat):
    ax_, ay_ = ankle
    pts = [(-2.6, -1.8), (1.6, -2.2), (2.4, 0.2), (4.8, 1.2), (5.8, 2.4), (5.8, 3.9), (-2.8, 3.9)]
    c, s = math.cos(pitch), math.sin(pitch)
    piv = (4.8, 3.9) if pitch > 0 else (-2.8, 3.9)   # heel lifts around the toe; toe lifts around the heel
    out = []
    for x, y in pts:
        x0, y0 = x - piv[0], y - piv[1]
        out.append((ax_ + piv[0] + x0 * c - y0 * s, ay_ + piv[1] + x0 * s + y0 * c))
    poly(cv, out, mat, dv, axis=((ax_ - 1, ay_ + 2.2), (ax_ + 5, ay_ + 2.2), 3.2))
    # sole: the lowest row of the boot
    m = cv.mat == mat
    ys, xs = np.nonzero(m & (cv.part == cv.n))
    if len(ys):
        for x in set(xs.tolist()):
            col = ys[xs == x]
            cv.setmat(x, col.max(), sole_mat, 0.3 if dv < 0 else 0.45)


def hand(cv, wrist, elbow, look, dv, kind="open"):
    d = (wrist[0] - elbow[0], wrist[1] - elbow[1])
    L = math.hypot(*d) or 1
    c = add(wrist, (d[0] / L, d[1] / L), 1.4)
    blob(cv, c[0], c[1], 1.6, 1.7, look.hand, dv)
    return c


def arm(cv, sk: Skeleton, look: Look, near: bool, pose: Pose):
    dv = 0.0 if near else look.far_dv
    S = sk.S if near else sk.S_far
    E = sk.elbow_near if near else sk.elbow_far
    Wr = sk.wrist_near if near else sk.wrist_far
    d = look.dims
    limb(cv, S, E, d["arm_r"][0], d["arm_r"][1], look.sleeve, dv)
    limb(cv, E, Wr, d["fore_r"][0], d["fore_r"][1], look.sleeve, dv)
    # elbow crease and cuff
    cv.setmat(E[0] - 0.4, E[1] + 0.4, look.sleeve, 0.2 + dv)
    cv.setmat(E[0] + 0.6, E[1] + 0.2, look.sleeve, 0.3 + dv)
    c = hand(cv, Wr, E, look, dv, pose.near_hand if near else pose.far_hand)
    cuff = lerp(E, Wr, 0.86)
    matline(cv, add(cuff, (-0.8, -0.8)), add(cuff, (0.8, 0.8)), look.sleeve, 0.25 + dv)
    if near and pose.tool == "spanner":
        dirx = Wr[0] - E[0]
        diry = Wr[1] - E[1]
        L = math.hypot(dirx, diry) or 1
        tip = add(c, (dirx / L, diry / L), 5.0)
        matline(cv, c, tip, "tool", 0.7)
        cv.setmat(tip[0] + 0.5, tip[1] - 0.5, "tool", 0.9)
        cv.setmat(tip[0] + 0.5, tip[1] + 0.8, "tool", 0.5)
    return c


def leg(cv, sk: Skeleton, look: Look, near: bool, pose: Pose):
    dv = 0.0 if near else look.far_dv
    Hp = sk.hip_near if near else sk.hip_far
    K = sk.knee_near if near else sk.knee_far
    A = sk.ankle_near if near else sk.ankle_far
    d = look.dims
    limb(cv, Hp, K, d["thigh_r"][0], d["thigh_r"][1], look.leg, dv)
    limb(cv, K, A, d["shin_r"][0], d["shin_r"][1], look.leg, dv)
    boot(cv, A, pose.near_toe if near else pose.far_toe, look.boot, dv, "sole")


def skirt(cv, sk: Skeleton, look: Look, dv=0.0):
    if look.skirt <= 0:
        return
    P, u, n = sk.P, sk.u, sk.n
    L = look.skirt
    projs = []
    for Hp, K, r in ((sk.hip_near, sk.knee_near, look.dims["thigh_r"][0]), (sk.hip_far, sk.knee_far, look.dims["thigh_r"][0])):
        f = min(1.0, L / THIGH)
        q = lerp(Hp, K, f)
        rel = (q[0] - P[0], q[1] - P[1])
        projs.append((rel[0] * n[0] + rel[1] * n[1], rel[0] * u[0] + rel[1] * u[1]))
    front = max(p[0] for p in projs) + 2.6
    back = min(p[0] for p in projs) - 2.6 - look.skirt_flare
    down_f = -min(L, max(-projs[0][1], -projs[1][1]) + 1)
    pts = [add(add(P, u, 4.5), n, look.dims["front"][2] + 0.3),
           add(add(P, u, -L + 0.5), n, front),
           add(add(P, u, -L - 0.5), n, (front + back) / 2),
           add(add(P, u, -L + 1.0), n, back),
           add(add(P, u, 4.5), n, -look.dims["back"][2] - 0.3)]
    poly(cv, pts, "coat", dv, axis=(add(P, u, 4), add(P, u, -L), 4.2))
    # a hem shade and a vertical seam
    hem_f, hem_b = pts[1], pts[3]
    matline(cv, add(hem_f, (-0.6, -0.6)), add(hem_b, (0.6, -0.6)), "coat", 0.3)


def head(cv, sk: Skeleton, look: Look, pose: Pose):
    Hc = sk.Hc
    x, y = Hc
    # neck (in the shadow of the jaw)
    limb(cv, add(sk.C, sk.u, -0.5), add(sk.C, sk.hu, 2.6), 1.6, 1.5, "skin", -0.3)
    # cranium + face profile (brow, nose, lips, chin, jaw)
    blob(cv, x - 0.5, y - 0.5, 3.7, 4.1, "skin", 0.08, amb=0.35)
    face = [(x + 2.0, y - 3.3), (x + 3.3, y - 1.8), (x + 3.5, y - 0.6), (x + 4.4, y + 0.9), (x + 4.3, y + 1.5),
            (x + 3.6, y + 1.7), (x + 3.8, y + 2.5), (x + 3.4, y + 3.1), (x + 2.8, y + 3.9), (x + 0.8, y + 4.1),
            (x - 1.3, y + 3.0), (x - 0.8, y - 2.0)]
    poly(cv, face, "skin", 0.1, axis=((x - 3, y), (x + 4.5, y), 5.0), amb=0.4)
    if look.helmet:
        return Hc
    # features: brow, eye (with a lit lid), nose shade, mouth line, jaw shade, ear
    cv.setmat(x + 2.2, y - 1.3, "skin", 0.3)
    cv.setmat(x + 3.2, y - 1.3, "skin", 0.45)
    if pose.eyes == "open":
        cv.put(x + 2.3, y - 0.3, "k0h")
    else:
        cv.setmat(x + 2.3, y - 0.3, "skin", 0.3)
    cv.setmat(x + 3.3, y + 1.2, "skin", 0.35)          # under the nose
    cv.setmat(x + 3.0, y + 2.1, "skin", 0.25)          # mouth line
    cv.setmat(x + 2.2, y + 3.2, "skin", 0.4)           # jaw shade
    cv.setmat(x - 0.6, y + 0.0, "skin", 0.28)          # ear
    cv.setmat(x - 0.6, y + 1.0, "skin", 0.36)
    cv.setmat(x + 0.4, y + 0.5, "skin", 0.5)
    return Hc


def hair_short(cv, Hc, dv=0.0):
    x, y = Hc
    pts = [(x + 2.9, y - 2.4), (x + 2.1, y - 4.2), (x - 0.4, y - 5.1), (x - 3.2, y - 4.1), (x - 4.4, y - 1.5),
           (x - 4.0, y + 1.8), (x - 2.7, y + 2.7), (x - 1.7, y + 0.9), (x - 1.8, y - 0.8), (x + 0.6, y - 2.1),
           (x + 2.0, y - 1.9)]
    m = cv.polymask(pts)
    nx, ny, nz = cv.sphn(x - 0.6, y - 1.0, 4.8, 5.0)
    cv.fill(m, "hair", hd.lambert(nx, ny, nz, 0.25), dv)
    # combed strands: short darker strokes following the flow from the crown to the nape
    matline(cv, (x - 0.6, y - 4.2), (x - 2.8, y - 2.4), "hair", 0.3)
    matline(cv, (x - 3.2, y - 1.2), (x - 3.4, y + 1.2), "hair", 0.3)
    matline(cv, (x + 1.4, y - 3.6), (x + 0.2, y - 2.6), "hair", 0.45)


def hair_long(cv, Hc, dv=0.0, length=9):
    x, y = Hc
    pts = [(x + 3.4, y - 2.2), (x + 2.6, y - 4.7), (x - 0.4, y - 5.6), (x - 3.8, y - 4.4), (x - 5.0, y - 1.0),
           (x - 5.0, y + length - 3), (x - 3.8, y + length), (x - 2.0, y + length - 1), (x - 1.8, y + 1.2),
           (x - 1.4, y - 0.8), (x + 0.8, y - 2.4), (x + 2.2, y - 1.6)]
    m = cv.polymask(pts)
    nx, ny, nz = cv.sphn(x - 0.8, y + 1.0, 5.6, 8.0)
    cv.fill(m, "hair", hd.lambert(nx, ny, nz, 0.2), dv)
    for k in range(0, length, 3):
        cv.setmat(x - 3.4, y + k, "hair", 0.3)
        cv.setmat(x - 2.4, y + k + 1, "hair", 0.45)


def render_side(look: Look, pose: Pose) -> Canvas:
    cv = Canvas()
    sk = Skeleton(pose, look.dims)
    arm(cv, sk, look, False, pose)
    leg(cv, sk, look, False, pose)
    if look.back:
        look.back(cv, sk, look, pose)
    tp = torso_pts(sk, look.dims, pose.breathe)
    poly(cv, tp, "coat", 0.0, axis=(add(sk.P, sk.n, -4), add(sk.P, sk.n, 4), 4.6))
    leg(cv, sk, look, True, pose)
    skirt(cv, sk, look)
    if look.torso_detail:
        look.torso_detail(cv, sk, look, pose)
    Hc = head(cv, sk, look, pose)
    if look.hair == "short":
        hair_short(cv, Hc)
    elif look.hair == "long":
        hair_long(cv, Hc, length=11)
    if look.head_gear:
        look.head_gear(cv, sk, look, pose)
    arm(cv, sk, look, True, pose)
    if look.front:
        look.front(cv, sk, look, pose)
    if look.lamp_at is not None:
        chest_lamp(cv, sk, look, pose)
    cv.occlusion()
    cv.bands = look.bands
    return cv


def chest_lamp(cv, sk: Skeleton, look: Look, pose: Pose):
    """A small brass-cased lamp on the chest front with a 2-3 px glow that spills past the coat."""
    t = look.lamp_at
    p = cv.T(add(add(sk.P, sk.u, t * look.dims["spine"]), sk.n, look.dims["front"][4] - 0.6))
    x, y = int(p[0]), int(p[1])
    cv.setpx(x, y - 1, "brass", 0.75)
    cv.setpx(x - 1, y - 1, "brass", 0.55)
    cv.setpx(x, y + 2, "brass", 0.35)
    cv.setpx(x - 1, y, "brass", 0.4)
    cv.setpx(x - 1, y + 1, "brass", 0.3)
    lamp = look.ramps["lamp"]
    if pose.lamp > 0:
        cv.putpx(x, y, ("@", "lamp", -1))
        cv.putpx(x, y + 1, ("@", "lamp", -3))
        cv.putpx(x + 1, y, ("@", "lamp", -2), late=True)
        if pose.lamp > 0.6:
            cv.putpx(x + 2, y, ("@", "lamp", -4), late=True)
            cv.putpx(x + 1, y + 1, ("@", "lamp", -4), late=True)
            cv.putpx(x + 1, y - 1, ("@", "lamp", -5), late=True)
            cv.putpx(x + 3, y, ("@", "lamp", -6), late=True)
    else:
        cv.putpx(x, y, ("@", "lamp", 1))
        cv.putpx(x, y + 1, ("@", "lamp", 0))


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Species looks
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
R_SKIN = ["c3", "c4~b3", "e4~c4", "e4"]
R_BRASS = ["b1", "b1h", "b2", "b2h", "b3", "b3h", "b4"]
R_LEATHER = ["k1", "b0", "b0h", "b1", "b1h"]
R_SOLE = ["k0", "k0h"]
R_TOOL = ["k3", "s0", "s1", "s2", "s3"]
R_TROUSERS = ["k1", "k2", "k2h", "k3", "k3h", "k4"]
R_LAMP_TEAL = ["t0", "t1", "t1h", "t2", "t2h", "t3", "t4"]
R_LAMP_AMBER = ["e0", "a0", "a0h", "a1", "a1h", "a2", "a3"]


def spine_pt(sk, t, off, d=None):
    return add(add(sk.P, sk.u, t * SPINE), sk.n, off)


def belt(cv, sk, look, t=0.06, mat="leather", buckle=True, pouch=True):
    d = look.dims
    for k, dt in enumerate((0.0, -0.07)):
        a = spine_pt(sk, t + dt, d["front"][1] + 0.6)
        b = spine_pt(sk, t + dt, -d["back"][1] - 0.6)
        matline(cv, b, a, mat, 0.62 - 0.25 * k)
    if buckle:
        f = spine_pt(sk, t - 0.03, d["front"][1] - 0.2)
        cv.setmat(f[0], f[1], "brass", 0.85)
        cv.setmat(f[0], f[1] + 1, "brass", 0.45)
    if pouch:
        p = spine_pt(sk, t - 0.12, -d["back"][1] + 0.4)
        pts = [add(p, (-2.2, -1)), add(p, (1.0, -1)), add(p, (1.2, 3.2)), add(p, (-2.0, 3.4))]
        poly(cv, pts, mat, 0.0, axis=(add(p, (-2, 1)), add(p, (1, 1)), 2.0))
        cv.setmat(p[0] - 0.5, p[1] - 0.2, "brass", 0.7)


def headset(cv, sk, look, pose):
    x, y = sk.Hc
    # band over the crown (hugging the hair), ear cup with a signal LED, boom mic to the mouth
    matline(cv, (x - 0.8, y - 1.2), (x - 0.6, y - 4.4), "brass", 0.45)
    blob(cv, x - 0.7, y + 0.5, 1.6, 1.9, "brass")
    cv.put(x - 1.2, y - 0.2, ("@", "lamp", -3))
    matline(cv, (x + 0.5, y + 1.7), (x + 2.8, y + 2.8), "brass", 0.35)
    cv.setmat(x + 3.2, y + 2.8, "leather", 0.2)


def linefolk_torso(cv, sk, look, pose):
    d = look.dims
    # collar: a turned-up band at the neck
    c0 = spine_pt(sk, 0.97, d["front"][5] - 0.2)
    c1 = spine_pt(sk, 0.97, -d["back"][5] + 0.2)
    matline(cv, c1, c0, "coat", 0.35)
    matline(cv, add(c1, sk.u, 1), add(c0, sk.u, 1), "coat", 0.8)
    # side seam and a worn patch with stitches on the back
    matline(cv, spine_pt(sk, 0.15, -0.8), spine_pt(sk, 0.85, -0.6), "coat", 0.45)
    p = spine_pt(sk, 0.62, -2.6)
    for dy in range(0, 4):
        for dx in range(0, 2):
            cv.setmat(p[0] + dx, p[1] + dy, "coat", 0.5)
    for dy in (0, 2):
        cv.setmat(p[0] - 1, p[1] + dy + 0.5, "coat", 0.3)
    coat_front(cv, sk, look, buttons=True, pocket=True)
    belt(cv, sk, look)


def coat_front(cv, sk, look, buttons=True, pocket=True, trim=None):
    """Front opening (placket) with buttons, a waist fold and a patch pocket on the skirt."""
    d = look.dims
    top = spine_pt(sk, 0.9, d["front"][4] - 0.9)
    mid = spine_pt(sk, 0.3, d["front"][2] - 0.9)
    low = add(add(sk.P, sk.u, -look.skirt + 1.5), sk.n, d["front"][1] + 0.8)
    matline(cv, top, mid, "coat", 0.28)
    matline(cv, mid, low, "coat", 0.28)
    if trim:
        matline(cv, add(top, sk.n, 0.9), add(mid, sk.n, 0.9), trim, 0.6)
        matline(cv, add(mid, sk.n, 0.9), add(low, sk.n, 0.9), trim, 0.6)
    if buttons:
        for t in (0.78, 0.55, 0.32):
            b = spine_pt(sk, t, d["front"][3] - 1.6)
            cv.setmat(b[0], b[1], "brass", 0.55)
    # waist fold just under the belt
    matline(cv, spine_pt(sk, -0.05, -d["back"][1] + 1.2), spine_pt(sk, -0.05, d["front"][1] - 1.4), "coat", 0.3)
    if pocket and look.skirt > 5:
        p = add(add(sk.P, sk.u, -3.2), sk.n, 0.2)
        matline(cv, p, add(p, sk.n, 2.6), "coat", 0.25)
        matline(cv, add(p, sk.u, -2.6), add(add(p, sk.u, -2.6), sk.n, 2.6), "coat", 0.3)


def linefolk_back(cv, sk, look, pose):
    # a coil of line cable slung on the back (verdigris braid)
    c = spine_pt(sk, 0.62, -look.dims["back"][3] - 0.6)
    m1 = cv.ellmask(c[0], c[1], 2.8, 3.6)
    m2 = cv.ellmask(c[0], c[1], 1.4, 2.2)
    nx, ny, nz = cv.sphn(c[0], c[1], 2.8, 3.6)
    cv.fill(m1 & ~m2, "cable", hd.lambert(nx, ny, nz, 0.2))
    for k in range(-3, 4, 2):
        cv.setmat(c[0] - 2.2, c[1] + k, "cable", 0.3)


def headset_back(cv, look, Hc):
    x, y = Hc
    matline(cv, (x - 3.6, y - 0.5), (x + 3.6, y - 0.5), "brass", 0.45)
    for sx in (-1, 1):
        blob(cv, x + sx * 3.9, y + 0.8, 1.3, 1.8, "brass", 0.0)
    cv.put(x - 4.2, y + 0.2, ("@", "lamp", -3))


def linefolk_back_view(cv, look, P, C, half, f):
    c = (C[0] - 0.4, C[1] + 6.5)
    m1 = cv.ellmask(c[0], c[1], 3.0, 2.6)
    m2 = cv.ellmask(c[0], c[1], 1.6, 1.3)
    nx, ny, nz = cv.sphn(c[0], c[1], 3.0, 2.6)
    cv.fill(m1 & ~m2, "cable", hd.lambert(nx, ny, nz, 0.2))
    matline(cv, (P[0] - half + 0.5, P[1] - 1.5), (P[0] + half - 0.5, P[1] - 1.5), "leather", 0.55)
    matline(cv, (P[0] - half + 0.5, P[1] - 0.5), (P[0] + half - 0.5, P[1] - 0.5), "leather", 0.3)
    pts = [(P[0] + 1.5, P[1] - 1.8), (P[0] + 4.2, P[1] - 1.8), (P[0] + 4.2, P[1] + 1.8), (P[0] + 1.5, P[1] + 1.8)]
    poly(cv, pts, "leather", 0.0, axis=((P[0] + 1.5, P[1]), (P[0] + 4.2, P[1]), 1.6))


LINEFOLK = Look(
    "linefolk",
    ramps={"coat": ["i0", "i0h", "i1", "i1h", "i2", "i2h", "i3"], "skin": R_SKIN,
           "hair": ["c0", "c0h", "c1", "c1h", "c2"], "trousers": R_TROUSERS, "boot": R_LEATHER,
           "leather": R_LEATHER, "sole": R_SOLE, "brass": R_BRASS, "lamp": R_LAMP_TEAL, "tool": R_TOOL,
           "cable": ["g0", "g0h", "g1", "g1h", "g2"]},
    skirt=8.5,
    head_gear=headset,
    torso_detail=linefolk_torso,
    back=linefolk_back,
    back_view=linefolk_back_view,
    back_head=headset_back,
)


# ── Warden: heavier build, dark plate armour, brass visor band, ember stripe ─────────────────────────────────
R_ARMOUR = ["k1", "k2", "k3", "k4", "k5", "k5~s0", "s0", "s1"]
R_STRIPE = ["e0", "e1", "e1h", "e2"]
WARDEN_DIMS = dict(DIMS, front=[3.8, 4.0, 3.6, 4.5, 4.8, 3.2], back=[4.3, 4.5, 3.7, 4.0, 4.2, 3.3],
                   thigh_r=(3.4, 2.7), shin_r=(2.7, 2.2), arm_r=(2.6, 2.2), fore_r=(2.2, 1.9))


def helmet(cv, sk, look, pose):
    x, y = sk.Hc
    # dome
    pts = [(x + 3.0, y - 1.2), (x + 2.6, y - 3.8), (x + 0.2, y - 5.4), (x - 3.0, y - 4.8), (x - 4.6, y - 2.2),
           (x - 4.6, y + 2.6), (x - 2.4, y + 3.4), (x - 1.0, y + 1.6), (x + 1.4, y + 0.6), (x + 3.4, y + 0.4)]
    m = cv.polymask(pts)
    nx, ny, nz = cv.sphn(x - 0.6, y - 1.0, 5.0, 5.2)
    cv.fill(m, "coat", hd.lambert(nx, ny, nz, 0.22))
    # brass visor band across the eyes with a dark sight slit
    matline(cv, (x - 1.6, y - 1.0), (x + 3.8, y - 1.0), "brass", 0.75)
    matline(cv, (x - 1.6, y + 0.0), (x + 3.9, y + 0.0), "brass", 0.4)
    matline(cv, (x + 1.2, y - 0.5), (x + 3.6, y - 0.5), "slit", 0.5)
    # ember crest from brow to nape
    matline(cv, (x + 1.8, y - 4.3), (x - 1.0, y - 5.4), "stripe", 0.8)
    matline(cv, (x - 1.0, y - 5.4), (x - 4.2, y - 3.4), "stripe", 0.55)
    # cheek guard edge + rivet
    matline(cv, (x - 1.0, y + 1.4), (x + 1.4, y + 0.8), "coat", 0.25)
    cv.setmat(x - 2.6, y + 0.6, "brass", 0.6)


def warden_torso(cv, sk, look, pose):
    d = look.dims
    # segmented plates: lit top edge + dark seam
    for t in (0.34, 0.58):
        a = spine_pt(sk, t, d["front"][3] - 0.2)
        b = spine_pt(sk, t, -d["back"][3] + 0.2)
        matline(cv, b, a, "coat", 0.12)
        matline(cv, add(b, sk.u, 1), add(a, sk.u, 1), "coat", 0.85)
    # ember stripe down the chest front
    matline(cv, spine_pt(sk, 0.92, d["front"][4] - 1.2), spine_pt(sk, 0.08, d["front"][1] - 1.2), "stripe", 0.75)
    matline(cv, spine_pt(sk, 0.92, d["front"][4] - 2.2), spine_pt(sk, 0.08, d["front"][1] - 2.2), "stripe", 0.35)
    belt(cv, sk, look, mat="leather", pouch=False)


def warden_front(cv, sk, look, pose):
    # pauldron over the near shoulder
    S = sk.S
    blob(cv, S[0] - 0.2, S[1] - 0.4, 3.4, 2.6, "coat", 0.05)
    matline(cv, (S[0] - 3.0, S[1] + 1.6), (S[0] + 2.8, S[1] + 1.2), "coat", 0.15)
    cv.setmat(S[0] + 1.2, S[1] - 1.6, "brass", 0.6)


def warden_back_head(cv, look, Hc):
    x, y = Hc
    m = cv.ellmask(x, y - 0.4, 4.4, 4.8)
    nx, ny, nz = cv.sphn(x, y - 0.4, 4.4, 4.8)
    cv.fill(m, "coat", hd.lambert(nx, ny, nz, 0.22))
    matline(cv, (x, y - 5.0), (x, y + 3.2), "stripe", 0.7)
    matline(cv, (x - 4.3, y + 0.2), (x + 4.3, y + 0.2), "brass", 0.5)


def warden_back_view(cv, look, P, C, half, f):
    matline(cv, (C[0], C[1] + 1.0), (C[0], P[1] - 1.0), "stripe", 0.7)
    for yy in (C[1] + 5.5, C[1] + 9.5):
        matline(cv, (C[0] - half + 0.8, yy), (C[0] + half - 0.8, yy), "coat", 0.12)
    matline(cv, (P[0] - half + 0.5, P[1] - 1.5), (P[0] + half - 0.5, P[1] - 1.5), "leather", 0.5)


WARDEN = Look(
    "warden",
    ramps={"coat": R_ARMOUR, "skin": R_SKIN, "trousers": R_ARMOUR, "boot": R_ARMOUR,
           "leather": ["k0", "b0", "b0h", "b1"], "sole": R_SOLE, "brass": R_BRASS, "stripe": R_STRIPE,
           "lamp": R_STRIPE, "slit": ["k0", "k0"], "tool": R_TOOL, "hair": ["k0"]},
    dims=WARDEN_DIMS,
    skirt=6.5,
    skirt_flare=1.0,
    hair="none",
    head_gear=helmet,
    torso_detail=warden_torso,
    front=warden_front,
    lamp_at=None,
    hand="coat",
    leg="coat",
    boot="coat",
    back_view=warden_back_view,
    back_head=warden_back_head,
    bands={"coat": 5, "boot": 4, "leather": 3, "skin": 4, "brass": 4, "sole": 2},
)
WARDEN.helmet = False


# ── Courier: muted green duster to the knee, satchel, goggles pushed up, amber lamp ─────────────────────────
R_DUSTER = ["g0", "g0h", "g0h", "g1", "g1h", "g1h", "g2"]


def goggles(cv, sk, look, pose):
    x, y = sk.Hc
    matline(cv, (x - 3.8, y - 2.4), (x + 1.0, y - 3.6), "leather", 0.45)      # strap
    blob(cv, x + 1.8, y - 3.4, 1.5, 1.3, "brass")
    cv.put(x + 2.2, y - 3.4, "t0h")
    cv.put(x + 1.8, y - 3.8, "t1")


def courier_torso(cv, sk, look, pose):
    d = look.dims
    coat_front(cv, sk, look, buttons=False, pocket=True)
    # satchel strap across the chest (near shoulder to far hip)
    matline(cv, add(sk.S, (1.2, -1.2)), spine_pt(sk, 0.1, d["front"][1] - 0.4), "leather", 0.5)
    matline(cv, add(sk.S, (0.2, -1.2)), spine_pt(sk, 0.1, d["front"][1] - 1.4), "leather", 0.3)
    belt(cv, sk, look, pouch=False)


def courier_back(cv, sk, look, pose):
    # satchel hanging behind the hip
    p = spine_pt(sk, 0.05, -look.dims["back"][1] - 1.2)
    pts = [add(p, (-3.2, -2.4)), add(p, (2.0, -2.8)), add(p, (2.4, 3.6)), add(p, (-3.0, 4.0))]
    poly(cv, pts, "leather", 0.05, axis=(add(p, (-3, 0)), add(p, (2.4, 0)), 3.0))
    matline(cv, add(p, (-3.0, -0.6)), add(p, (2.2, -1.0)), "leather", 0.25)
    cv.setmat(p[0] - 0.2, p[1] + 0.2, "brass", 0.7)


def courier_back_view(cv, look, P, C, half, f):
    matline(cv, (C[0] + half - 1.0, C[1] + 1.0), (C[0] - half + 1.5, P[1] - 2.0), "leather", 0.5)
    pts = [(P[0] - half - 1.5, P[1] - 3.0), (P[0] - half + 3.0, P[1] - 3.0), (P[0] - half + 3.0, P[1] + 3.0),
           (P[0] - half - 1.5, P[1] + 3.0)]
    poly(cv, pts, "leather", 0.0, axis=((P[0] - half - 1.5, P[1]), (P[0] - half + 3, P[1]), 2.4))


def goggles_back(cv, look, Hc):
    x, y = Hc
    matline(cv, (x - 3.9, y - 2.2), (x + 3.9, y - 2.2), "leather", 0.45)


COURIER = Look(
    "courier",
    ramps={"coat": R_DUSTER, "skin": ["c2h", "c3", "c3h", "c4", "c4~b3"], "hair": ["c0", "c0h", "c1", "c1h", "c2"],
           "trousers": R_TROUSERS, "boot": R_LEATHER, "leather": R_LEATHER, "sole": R_SOLE, "brass": R_BRASS,
           "lamp": R_LAMP_AMBER, "tool": R_TOOL},
    skirt=14.0,
    skirt_flare=2.4,
    head_gear=goggles,
    torso_detail=courier_torso,
    back=courier_back,
    back_view=courier_back_view,
    back_head=goggles_back,
    dims=dict(DIMS, front=[3.0, 3.2, 2.8, 3.5, 3.8, 2.5], back=[3.5, 3.7, 2.9, 3.1, 3.3, 2.6]),
)


# ── Bellmaker: long steel-grey coat with violet trim, glass tuning fork, glass pendant, silver hair ───────────
R_GREYCOAT = ["k3", "k4", "k5", "k5~s0", "s0", "s0h", "s1"]
R_GLASS = ["v0", "v1", "v1h", "v2", "v2h", "v3", "v4"]


def fork_side(cv, sk, look, pose):
    """The glass tuning fork slung across the back: a stem and two tines above the shoulder, with glints."""
    base = spine_pt(sk, 0.35, -look.dims["back"][3] - 0.2)
    top = add(base, sk.u, 9.0)
    ax, ay = cv.T(base)
    bx, by = cv.T(top)
    from px import line_pts
    stem = line_pts(round(ax), round(ay), round(bx), round(by))
    for i, (x, y) in enumerate(stem):
        cv.setpx(x, y, "glass", 0.55)
        cv.setpx(x + 1, y, "glass", 0.3)
    # tines: a U at the top
    tx, ty = stem[-1]
    for k in range(0, 5):
        cv.setpx(tx - 2, ty - k, "glass", 0.7)
        cv.setpx(tx + 2, ty - k, "glass", 0.4)
    cv.setpx(tx - 1, ty, "glass", 0.55)
    cv.setpx(tx + 1, ty, "glass", 0.45)
    cv.putpx(tx - 2, ty - 3, ("@", "glass", -1))     # refraction glints
    cv.putpx(tx - 2, ty - 1, ("@", "glass", -2))
    cv.putpx(tx, ty + 5, ("@", "glass", -2))


def bellmaker_torso(cv, sk, look, pose):
    coat_front(cv, sk, look, buttons=False, pocket=False, trim="glass")
    # violet trim at the collar
    d = look.dims
    matline(cv, spine_pt(sk, 0.97, -d["back"][5]), spine_pt(sk, 0.97, d["front"][5]), "glass", 0.45)


def bellmaker_back_view(cv, look, P, C, half, f):
    from px import line_pts
    x0, y0 = cv.T((C[0] - 3.0, P[1] - 2.0))
    x1, y1 = cv.T((C[0] + 2.0, C[1] - 9.0))
    for i, (x, y) in enumerate(line_pts(round(x0), round(y0), round(x1), round(y1))):
        cv.setpx(x, y, "glass", 0.55)
    tx, ty = round(x1), round(y1)
    for k in range(6):
        cv.setpx(tx - 2, ty - k, "glass", 0.7)
        cv.setpx(tx + 2, ty - k, "glass", 0.45)
    cv.putpx(tx - 2, ty - 4, ("@", "glass", -1))
    matline(cv, (C[0] - half + 0.6, P[1] + look.skirt - 2), (C[0] + half - 0.6, P[1] + look.skirt - 2), "glass", 0.5)


BELLMAKER = Look(
    "bellmaker",
    ramps={"coat": R_GREYCOAT, "skin": ["c1", "c1h", "c2", "c2h", "c3"], "hair": ["i0", "i1", "i2", "i3", "i4"],
           "trousers": ["k0", "k1", "k1h", "k2", "k2h"], "boot": ["k0", "k1", "k1h", "k2"], "leather": R_LEATHER,
           "sole": R_SOLE, "brass": R_BRASS, "glass": R_GLASS, "lamp": R_GLASS, "tool": R_TOOL},
    skirt=19.0,
    skirt_flare=3.0,
    hair="long",
    back=fork_side,
    torso_detail=bellmaker_torso,
    back_view=bellmaker_back_view,
    dims=dict(DIMS, front=[3.0, 3.2, 2.8, 3.5, 3.7, 2.5], back=[3.5, 3.6, 2.9, 3.1, 3.3, 2.6]),
    bands={"coat": 5, "trousers": 3, "boot": 3, "leather": 3, "hair": 4, "skin": 4, "brass": 4, "sole": 2},
)



# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Boarder machines. They are *stopped*, never killed: the stop sequence powers them down.
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
R_MSTEEL = ["k1", "k2", "k3", "k4", "k5", "k5~s0", "s0", "s1"]


def splicer_hood(cv, sk, look, pose):
    """An armoured cowl over the head with a single amber sensor slit."""
    x, y = sk.Hc
    pts = [(x + 3.6, y - 1.8), (x + 2.8, y - 4.4), (x + 0.2, y - 5.6), (x - 3.4, y - 4.8), (x - 5.0, y - 1.8),
           (x - 5.2, y + 3.4), (x - 3.4, y + 5.0), (x + 1.0, y + 4.6), (x + 3.4, y + 3.4), (x + 4.2, y + 1.2)]
    m = cv.polymask(pts)
    nx, ny, nz = cv.sphn(x - 0.8, y - 0.6, 5.4, 5.8)
    cv.fill(m, "coat", hd.lambert(nx, ny, nz, 0.2))
    matline(cv, (x + 1.0, y - 0.6), (x + 4.0, y - 0.6), "slit", 0.2)
    matline(cv, (x + 1.4, y + 0.4), (x + 3.8, y + 0.4), "slit", 0.2)
    lit = pose.eyes != "closed" and pose.lamp > 0
    if lit:
        a, b = cv.T((x + 2.2, y - 0.1))
        cv.putpx(int(a), int(b), "a2")
        cv.putpx(int(a) + 1, int(b), "a1")
        cv.putpx(int(a) - 1, int(b), "a0")
        cv.putpx(int(a) + 3, int(b), "a0", late=True)
    matline(cv, (x - 4.0, y + 1.0), (x - 1.0, y + 4.0), "coat", 0.25)   # cowl seam


def splicer_torso(cv, sk, look, pose):
    d = look.dims
    for t in (0.35, 0.5, 0.65):
        matline(cv, spine_pt(sk, t, -d["back"][3] + 0.8), spine_pt(sk, t, d["front"][3] - 0.8), "coat", 0.2)
    # exposed cable bundle at the waist (verdigris braid)
    matline(cv, spine_pt(sk, 0.18, -1.5), spine_pt(sk, -0.05, -1.0), "cable", 0.6)
    matline(cv, spine_pt(sk, 0.18, -0.5), spine_pt(sk, -0.05, 0.0), "cable", 0.35)


def splicer_front(cv, sk, look, pose):
    """The near hand is a cutting disc on a hub."""
    E, W = sk.elbow_near, sk.wrist_near
    d = (W[0] - E[0], W[1] - E[1])
    L = math.hypot(*d) or 1
    c = add(W, (d[0] / L, d[1] / L), 2.2)
    blob(cv, c[0], c[1], 3.0, 3.0, "tool", 0.05)
    blob(cv, c[0], c[1], 1.0, 1.0, "brass", 0.0)
    cx, cy = cv.T(c)
    rim = [(int(cx) + 3, int(cy)), (int(cx), int(cy) - 3), (int(cx) - 2, int(cy) - 2)]
    for x, y in rim:
        cv.putpx(x, y, "s3")


SPLICER = Look(
    "splicer",
    ramps={"coat": R_MSTEEL, "skin": R_MSTEEL, "trousers": R_MSTEEL, "boot": ["k0", "k1", "k2", "k3"],
           "sole": R_SOLE, "brass": ["b0", "b1", "b1h", "b2", "b2h"], "lamp": R_LAMP_AMBER, "tool": R_TOOL,
           "slit": ["k0", "k1"], "cable": ["g0", "g0h", "g1", "g1h"], "leather": R_LEATHER, "hair": ["k0"]},
    dims=dict(DIMS, front=[2.6, 2.8, 2.2, 3.0, 3.4, 2.2], back=[3.0, 3.2, 2.4, 2.8, 3.1, 2.4],
              thigh_r=(2.4, 1.8), shin_r=(1.9, 1.5), arm_r=(1.8, 1.5), fore_r=(1.5, 1.3), spine=15.5),
    skirt=0.0,
    hair="none",
    head_gear=splicer_hood,
    torso_detail=splicer_torso,
    front=splicer_front,
    lamp_at=0.6,
    hand="coat",
    leg="trousers",
    boot="boot",
    bands={"coat": 5, "trousers": 4, "boot": 3, "brass": 3, "sole": 2, "skin": 4},
)


def marshal_helmet(cv, sk, look, pose):
    """Angular full helmet with a narrow ember visor slit and a crest ridge."""
    x, y = sk.Hc
    pts = [(x + 3.8, y - 2.0), (x + 3.2, y - 4.6), (x + 0.4, y - 5.8), (x - 3.4, y - 5.0), (x - 5.0, y - 2.0),
           (x - 4.8, y + 3.6), (x - 2.2, y + 5.2), (x + 2.6, y + 4.8), (x + 4.4, y + 2.4), (x + 4.6, y + 0.2)]
    m = cv.polymask(pts)
    nx, ny, nz = cv.sphn(x - 0.6, y - 0.6, 5.6, 6.0)
    cv.fill(m, "coat", hd.lambert(nx, ny, nz, 0.2))
    matline(cv, (x - 0.5, y - 0.4), (x + 4.4, y - 0.4), "slit", 0.2)
    if pose.lamp > 0 and pose.eyes != "closed":
        a, b = cv.T((x + 1.2, y - 0.4))
        for k in range(4):
            cv.putpx(int(a) + k, int(b), ["e1", "e2", "e3", "e2"][k])
        cv.putpx(int(a) + 5, int(b), "e1", late=True)
    else:
        a, b = cv.T((x + 1.2, y - 0.4))
        for k in range(4):
            cv.putpx(int(a) + k, int(b), "e0")
    matline(cv, (x + 2.8, y - 5.0), (x - 3.6, y - 5.2), "coat", 0.9)   # crest ridge
    matline(cv, (x + 0.4, y + 1.6), (x + 3.6, y + 2.6), "coat", 0.2)   # jaw plate seam


def marshal_torso(cv, sk, look, pose):
    d = look.dims
    for t in (0.36, 0.62):
        a = spine_pt(sk, t, d["front"][3] - 0.2)
        b = spine_pt(sk, t, -d["back"][3] + 0.2)
        matline(cv, b, a, "coat", 0.1)
        matline(cv, add(b, sk.u, 1), add(a, sk.u, 1), "coat", 0.8)
    lit = pose.lamp > 0
    # ember seam lights: along the chest front and down the side
    for (t0, o0, t1, o1) in ((0.9, d["front"][4] - 1.4, 0.4, d["front"][2] - 1.4), (0.8, -1.0, 0.1, -1.0)):
        a, b = cv.T(spine_pt(sk, t0, o0))
        c, e = cv.T(spine_pt(sk, t1, o1))
        from px import line_pts
        for i, (x, y) in enumerate(line_pts(round(a), round(b), round(c), round(e))):
            cv.putpx(x, y, ("e2" if i % 3 else "e3") if lit else "e0")
    belt(cv, sk, look, mat="coat", buckle=False, pouch=False)


def marshal_front(cv, sk, look, pose):
    S = sk.S
    blob(cv, S[0] - 0.4, S[1] - 0.6, 3.8, 2.8, "coat", 0.05)
    matline(cv, (S[0] - 3.4, S[1] + 1.6), (S[0] + 3.0, S[1] + 1.2), "coat", 0.1)
    a, b = cv.T((S[0] + 1.6, S[1] - 1.8))
    cv.putpx(int(a), int(b), "e2" if pose.lamp > 0 else "e0")


def marshal_back_head(cv, look, Hc):
    x, y = Hc
    m = cv.ellmask(x, y - 0.4, 4.8, 5.2)
    nx, ny, nz = cv.sphn(x, y - 0.4, 4.8, 5.2)
    cv.fill(m, "coat", hd.lambert(nx, ny, nz, 0.2))
    matline(cv, (x, y - 5.4), (x, y + 3.6), "coat", 0.9)


def marshal_back_view(cv, look, P, C, half, f):
    a, b = cv.T((C[0] - 0.5, C[1] + 1.0))
    c, e = cv.T((C[0] - 0.5, P[1] - 1.0))
    for y in range(int(b), int(e)):
        cv.putpx(int(a), y, "e2" if y % 3 else "e3")


MARSHAL = Look(
    "marshal-trooper",
    ramps={"coat": ["k1", "k2", "k2h", "k3", "k3h", "k4", "k5", "k5~s0"], "skin": ["k1", "k2", "k3", "k4"],
           "trousers": ["k1", "k2", "k2h", "k3", "k4", "k5"], "boot": ["k0", "k1", "k2", "k3"], "sole": R_SOLE,
           "brass": ["b0", "b1", "b1h", "b2"], "lamp": ["e0", "e1", "e1h", "e2", "e2h", "e3", "e4"],
           "tool": R_TOOL, "slit": ["k0", "k1"], "leather": R_LEATHER, "hair": ["k0"]},
    dims=dict(WARDEN_DIMS, spine=15.8, front=[4.0, 4.2, 3.8, 4.8, 5.2, 3.4], back=[4.5, 4.7, 3.9, 4.2, 4.5, 3.5],
              thigh_r=(3.6, 2.9), shin_r=(2.9, 2.3), arm_r=(2.8, 2.4), fore_r=(2.4, 2.0)),
    skirt=7.0,
    skirt_flare=0.8,
    hair="none",
    head_gear=marshal_helmet,
    torso_detail=marshal_torso,
    front=marshal_front,
    lamp_at=None,
    hand="coat",
    leg="trousers",
    boot="boot",
    back_view=marshal_back_view,
    back_head=marshal_back_head,
    bands={"coat": 5, "trousers": 4, "boot": 3, "sole": 2, "skin": 3, "brass": 3},
)
MARSHAL.helmet = False


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Pose library (facing right). Distances in atlas px; the floor is SOLE (62); a flat standing ankle is 58.5.
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
GROUND = 58.5
# walk: (near ankle dx, lift, pitch), (far ...), pelvis dy, near wrist (dx, y), far wrist (dx, y) — 8 frames,
# contact / down / pass / up for each leg; arms counter-swing; the pelvis drops 1 px on the "down" frames only.
WALK = [
    ((7.5, 0.0, -0.15), (-6.5, 1.0, 0.30), 0.0, (-5.0, 41.5), (5.5, 41.0)),
    ((4.5, 0.0, 0.00), (-7.5, 2.4, 0.35), 0.8, (-3.5, 42.0), (4.0, 41.5)),
    ((0.8, 0.0, 0.00), (-2.0, 4.2, 0.20), 0.3, (-0.5, 42.5), (0.5, 42.5)),
    ((-3.2, 0.0, 0.15), (4.0, 2.2, -0.15), 0.0, (3.0, 42.0), (-3.0, 42.0)),
    ((-6.5, 1.0, 0.30), (7.5, 0.0, -0.15), 0.0, (5.5, 41.0), (-5.0, 41.5)),
    ((-7.5, 2.4, 0.35), (4.5, 0.0, 0.00), 0.8, (4.0, 41.5), (-3.5, 42.0)),
    ((-2.0, 4.2, 0.20), (0.8, 0.0, 0.00), 0.3, (0.5, 42.5), (-0.5, 42.5)),
    ((4.0, 2.2, -0.15), (-3.2, 0.0, 0.15), 0.0, (-3.0, 42.0), (3.0, 42.0)),
]


def pose_for(kind: str, f: int) -> Pose:
    px0, py0 = 32.0, 36.5
    if kind == "idle":
        return Pose(breathe=[0.0, 1.0, 0.0][f], eyes="closed" if f == 2 else "open",
                    lamp=[1.0, 0.7, 1.0][f], pelvis=(px0, py0), lean=0.02)
    if kind == "walk":
        nl, fl, dy, nw, fw = WALK[f]
        P = (px0, py0 + dy)
        return Pose(pelvis=P, lean=0.07,
                    near_ankle=(P[0] + nl[0], GROUND - nl[1]), near_toe=nl[2],
                    far_ankle=(P[0] + fl[0] - 1.0, GROUND - fl[1]), far_toe=fl[2],
                    near_wrist=(P[0] + nw[0], nw[1] + dy), far_wrist=(P[0] + fw[0] - 1.0, fw[1] + dy))
    if kind == "repair":
        # braced stance, spanner worked against a panel at chest height
        wr = [(41.5, 30.5), (42.5, 29.5), (41.0, 31.5)][f]
        return Pose(pelvis=(31.0, 37.0), lean=0.12, head=0.08,
                    near_ankle=(35.5, GROUND), far_ankle=(27.5, GROUND),
                    near_wrist=wr, far_wrist=(38.5, 33.0), near_hand="fist", tool="spanner")
    if kind == "man":
        # standing at a console, hands on the board at waist height, small working motions
        nw = [(40.0, 37.5), (40.5, 36.5), (40.0, 37.5)][f]
        fw = [(39.0, 38.0), (39.0, 38.0), (38.5, 37.0)][f]
        return Pose(pelvis=(31.0, 36.8), lean=0.14, head=[0.18, 0.18, 0.26][f],
                    near_ankle=(33.0, GROUND), far_ankle=(29.0, GROUND), near_wrist=nw, far_wrist=fw)
    if kind == "fight":
        stance = dict(near_ankle=(37.0, GROUND), far_ankle=(25.0, GROUND), far_toe=0.25)
        if f == 0:   # guard
            return Pose(pelvis=(31.0, 38.0), lean=0.14, near_wrist=(38.0, 29.5), far_wrist=(36.0, 31.0),
                        near_hand="fist", far_hand="fist", **stance)
        if f == 1:   # wind-up
            return Pose(pelvis=(30.0, 38.0), lean=0.02, head=-0.05, near_wrist=(29.0, 31.0), far_wrist=(36.0, 31.0),
                        near_hand="fist", far_hand="fist", **stance)
        return Pose(pelvis=(33.0, 38.0), lean=0.2, near_wrist=(49.5, 28.5), far_wrist=(35.0, 32.0),
                    near_hand="fist", far_hand="fist", **stance)
    if kind == "hurt":
        return Pose(pelvis=(30.5 - f, 37.0), lean=-0.16 - 0.06 * f, head=-0.2,
                    near_ankle=(33.0, GROUND), far_ankle=(27.0, GROUND - 1.0 * f), far_toe=0.3,
                    near_wrist=(30.0 - f, 34.0), far_wrist=(26.0, 41.0), eyes="closed")
    if kind == "stop":
        if f == 0:   # stagger, knees give
            return Pose(pelvis=(31.0, 40.0), lean=0.35, head=0.35, near_ankle=(35.0, GROUND),
                        far_ankle=(27.0, GROUND), near_wrist=(37.0, 45.0), far_wrist=(33.0, 46.0), lamp=0.6)
        if f == 1:   # kneel on one knee, a hand on the floor
            return Pose(pelvis=(29.0, 47.5), lean=0.5, head=0.4, near_ankle=(38.0, GROUND),
                        far_ankle=(20.0, GROUND - 1.0), far_toe=0.9, near_wrist=(39.5, 55.5),
                        far_wrist=(35.0, 52.0), eyes="closed", lamp=0.4)
        if f == 2:   # sitting, slumped forward
            return Pose(pelvis=(26.0, 56.5), lean=0.75, head=0.5, near_ankle=(42.0, GROUND),
                        far_ankle=(40.0, GROUND), near_toe=-0.3, far_toe=-0.3, near_wrist=(40.0, 54.0),
                        far_wrist=(38.0, 55.0), eyes="closed", lamp=0.0)
        # lying on the back, head to the left, still
        return Pose(pelvis=(36.0, 56.8), lean=-math.pi / 2, head=-0.1, near_ankle=(55.0, 57.0),
                    far_ankle=(54.0, 58.0), near_toe=-1.3, far_toe=-1.3, near_wrist=(34.0, 58.5),
                    far_wrist=(30.0, 58.0), eyes="closed", lamp=0.0)
    raise KeyError(kind)


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Back view on a ladder (climb)
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
CLIMB = [  # left hand, right hand, left foot (ankle), right foot, body dy
    ((27.0, 9.0), (37.0, 13.0), (28.5, 55.0), (35.5, 59.0), 0.0),
    ((27.0, 11.0), (37.0, 11.0), (28.5, 57.0), (35.5, 57.0), -1.0),
    ((27.0, 13.0), (37.0, 9.0), (28.5, 59.0), (35.5, 55.0), 0.0),
    ((27.0, 11.0), (37.0, 11.0), (28.5, 57.0), (35.5, 57.0), -1.0),
]


def render_back(look: Look, f: int) -> Canvas:
    cv = Canvas()
    lh, rh, lf, rf, dy = CLIMB[f]
    d = look.dims
    P = (32.0, 36.5 + dy)
    C = (32.0, P[1] - d["spine"])
    wide = d["front"][4] + d["back"][3]          # shoulder breadth follows the side-view chest depth
    half = 5.0 + (wide - 7.4) * 0.6
    # legs (each thigh from its hip, knees bend outward/forward on the rungs)
    for hip, ank, dv in (((30.0, P[1]), lf, 0.0), ((34.0, P[1]), rf, -0.1)):
        knee = ik(hip, ank, d["thigh"], d["shin"], +1 if ank[0] < 32 else -1)
        limb(cv, hip, knee, d["thigh_r"][0], d["thigh_r"][1], look.leg, dv)
        limb(cv, knee, ank, d["shin_r"][0], d["shin_r"][1], look.leg, dv)
        pts = [(ank[0] - 2.2, ank[1] - 1.5), (ank[0] + 2.2, ank[1] - 1.5), (ank[0] + 2.4, ank[1] + 3.2),
               (ank[0] - 2.4, ank[1] + 3.2)]
        poly(cv, pts, look.boot, dv, axis=((ank[0] - 3, ank[1]), (ank[0] + 3, ank[1]), 3.0))
    # coat hem behind the legs? the coat hangs over the thighs from behind
    if look.skirt > 0:
        L = min(look.skirt, 16)
        pts = [(C[0] - half + 0.4, P[1] - 4), (C[0] + half - 0.4, P[1] - 4), (C[0] + half + 0.6, P[1] + L - 1),
               (C[0] - half - 0.6, P[1] + L - 1)]
        poly(cv, pts, "coat", 0.0, axis=((C[0] - half, P[1]), (C[0] + half, P[1]), half + 0.5))
    # torso (back)
    pts = [(C[0] - half, C[1] + 1.2), (C[0] - half + 1.2, C[1] - 0.4), (C[0] + half - 1.2, C[1] - 0.4),
           (C[0] + half, C[1] + 1.2), (C[0] + half - 0.6, P[1] - 5), (C[0] + half - 0.2, P[1] + 1),
           (C[0] - half + 0.2, P[1] + 1), (C[0] - half + 0.6, P[1] - 5)]
    poly(cv, pts, "coat", 0.0, axis=((C[0] - half, P[1]), (C[0] + half, P[1]), half))
    # back seam
    matline(cv, (C[0] + 0.3, C[1] + 1.5), (C[0] + 0.3, P[1] + 0.5), "coat", 0.3)
    if look.back_view:
        look.back_view(cv, look, P, C, half, f)
    # arms up to the rungs
    for sh, hnd, dv in (((C[0] - half + 1.0, C[1] + 1.5), lh, 0.0), ((C[0] + half - 1.0, C[1] + 1.5), rh, -0.08)):
        el = ik(sh, hnd, d["upper"], d["fore"], -1 if hnd[0] < 32 else 1)
        limb(cv, sh, el, d["arm_r"][0], d["arm_r"][1], look.sleeve, dv)
        limb(cv, el, hnd, d["fore_r"][0], d["fore_r"][1], look.sleeve, dv)
        blob(cv, hnd[0], hnd[1] - 1.2, 1.6, 1.7, look.hand, dv)
    # head from behind
    Hc = (C[0] + 0.2, C[1] - 5.8)
    limb(cv, C, (C[0], C[1] - 2.5), 1.7, 1.6, "skin", -0.25)
    if look.helmet:
        look.back_head(cv, look, Hc)
    else:
        blob(cv, Hc[0], Hc[1], 3.8, 4.3, "skin", 0.0)
        if look.hair in ("short", "long"):
            hl = 4.0 if look.hair == "short" else 10.0
            pts = [(Hc[0] - 4.0, Hc[1] - 1.0), (Hc[0] - 2.6, Hc[1] - 4.4), (Hc[0] + 2.6, Hc[1] - 4.4),
                   (Hc[0] + 4.0, Hc[1] - 1.0), (Hc[0] + 3.8, Hc[1] + hl - 1), (Hc[0] - 3.8, Hc[1] + hl - 1)]
            m = cv.polymask(pts)
            nx, ny, nz = cv.sphn(Hc[0], Hc[1] + 0.5, 4.6, 5.0 + hl * 0.3)
            cv.fill(m, "hair", hd.lambert(nx, ny, nz, 0.25))
            matline(cv, (Hc[0] - 1.2, Hc[1] - 3.2), (Hc[0] - 2.0, Hc[1] + 1.0), "hair", 0.3)
            matline(cv, (Hc[0] + 1.4, Hc[1] - 2.6), (Hc[0] + 1.8, Hc[1] + 1.6), "hair", 0.35)
        if look.back_head:
            look.back_head(cv, look, Hc)
    cv.occlusion()
    cv.bands = look.bands
    return cv



# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Rigger: a reclaimed maintenance automaton — riveted enamel cabinet on piston legs, one teal lens, tool arms
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
RIG_RAMPS = {"shell": ["b0", "i0", "i0h", "i1", "i1h", "i2", "i2h"], "metal": ["k1", "k2", "k3", "k4", "k5", "s0", "s1"],
             "brass": R_BRASS, "lens": ["t0", "t0h", "t1", "t1h", "t2", "t3", "t4"], "lamp": R_LAMP_AMBER,
             "tool": R_TOOL, "sole": R_SOLE, "dark": ["k0", "k1", "k2"]}
RIG_BANDS = {"shell": 5, "metal": 4, "brass": 4, "sole": 2}


def rig_pose(kind, f):
    """(pelvis, lean, near ankle, far ankle, near wrist, far wrist, lens 0..1, lamp 0..1, fold 0..1)."""
    P = (31.0, 43.5)
    g = GROUND
    std = dict(P=P, lean=0.0, na=(33.5, g), fa=(29.0, g), nw=None, fw=None, lens=1.0, lamp=1.0, fold=0.0, tool=None)
    if kind == "idle":
        return dict(std, lens=[1.0, 0.8, 1.0][f], lamp=[1.0, 1.0, 0.4][f])
    if kind == "walk":
        nl, fl, dy, nw, fw = WALK[f]
        return dict(std, P=(P[0], P[1] + round(dy * 0.8)), na=(P[0] + nl[0] * 0.75, g - nl[1] * 0.8),
                    fa=(P[0] + fl[0] * 0.75 - 1.5, g - fl[1] * 0.8))
    if kind == "repair":
        return dict(std, P=(31.5, 44.0), na=(35.0, g), fa=(27.5, g), nw=[(46.5, 36.0), (47.5, 35.0), (46.0, 37.0)][f],
                    tool="torch")
    if kind == "man":
        return dict(std, nw=[(44.5, 38.0), (45.5, 37.0), (44.5, 38.0)][f], lens=[1.0, 1.0, 0.8][f])
    if kind == "fight":
        return dict(std, P=(31.0 + [0, -1, 2][f], 44.5), na=(36.0, g), fa=(26.0, g),
                    nw=[(42.0, 36.0), (36.0, 36.0), (52.0, 34.0)][f], tool="claw")
    if kind == "hurt":
        return dict(std, P=(30.0 - f, 43.5 + f), na=(33.5 - f * 0.5, g), lens=[0.4, 0.7][f])
    if kind == "stop":
        return dict(std, P=(31.0, 44.5 + [1.5, 4.5, 7.0, 7.5][f]),
                    na=(35.0 + f, g), fa=(27.0 - f * 0.5, g), lens=[0.6, 0.35, 0.15, 0.0][f],
                    lamp=[0.6, 0.2, 0.0, 0.0][f], fold=f / 3)
    raise KeyError(kind)


def render_rigger(kind, f) -> Canvas:
    cv = Canvas()
    r = rig_pose(kind, f)
    P, lean = r["P"], r["lean"]
    u = (math.sin(lean), -math.cos(lean))
    n = (math.cos(lean), math.sin(lean))

    def B(x, y):  # body-local (x forward, y down) -> design space around the pelvis/hip bar
        return (P[0] + n[0] * x - u[0] * y, P[1] + n[1] * x - u[1] * y)

    # far arm (torch / second manipulator) behind the cabinet
    S_far = B(-1.0, -12.0)
    wf = r["fw"] or B(0.5, -2.0)
    ef = ik(S_far, wf, 6.5, 6.0, -1)
    limb(cv, S_far, ef, 1.6, 1.4, "metal", -0.25)
    limb(cv, ef, wf, 1.4, 1.2, "metal", -0.25)
    # legs: piston legs with a knee housing and broad feet
    for near in (False, True):
        hip = B(1.0 if near else -2.5, 0.0)
        ank = r["na"] if near else r["fa"]
        knee = ik(hip, ank, 7.0, 7.5, +1)
        dv = 0.0 if near else -0.25
        limb(cv, hip, knee, 1.9, 1.6, "metal", dv)
        limb(cv, knee, ank, 1.6, 1.3, "metal", dv)
        blob(cv, knee[0], knee[1], 2.1, 2.1, "brass" if near else "metal", dv - 0.05)
        pts = [(ank[0] - 3.0, ank[1] - 0.5), (ank[0] + 3.4, ank[1] - 0.5), (ank[0] + 4.4, ank[1] + 3.5),
               (ank[0] - 3.4, ank[1] + 3.5)]
        poly(cv, pts, "metal", dv, axis=((ank[0] - 3, ank[1] + 1.5), (ank[0] + 4, ank[1] + 1.5), 3.4))
        matline(cv, (ank[0] - 3.2, ank[1] + 3.2), (ank[0] + 4.2, ank[1] + 3.2), "sole", 0.4)
    # hip bar / chassis under the cabinet
    poly(cv, [B(-8.0, -1.5), B(7.5, -1.5), B(6.5, 1.8), B(-7.0, 1.8)], "metal", 0.0,
         axis=(B(0, -1.5), B(0, 1.8), 2.0))
    # the cabinet: a tall riveted enamel box with a chamfered top
    body = [B(-8.5, -1.0), B(-8.5, -17.0), B(-6.5, -19.5), B(6.0, -19.5), B(8.5, -17.0), B(8.5, -1.0)]
    poly(cv, body, "shell", 0.0, axis=(B(-8.5, -10), B(8.5, -10), 9.0))
    # top vent grille and panel seams
    for k in range(-5, 5, 2):
        matline(cv, B(k, -18.4), B(k, -16.6), "shell", 0.15)
    matline(cv, B(-8.0, -15.5), B(8.0, -15.5), "shell", 0.25)
    matline(cv, B(-8.0, -5.0), B(8.0, -5.0), "shell", 0.25)
    matline(cv, B(-8.0, -4.0), B(8.0, -4.0), "shell", 0.75)
    matline(cv, B(-2.0, -15.0), B(-2.0, -5.5), "shell", 0.3)
    for (x, y) in ((-7.0, -14.0), (-7.0, -6.5), (-3.2, -14.0), (-3.2, -6.5), (7.0, -6.5)):
        pp = B(x, y)
        cv.setmat(pp[0], pp[1], "brass", 0.55)
    # wear: a few chipped spots showing the dark undercoat
    for (x, y) in ((-6.0, -11.0), (-5.0, -10.5), (3.5, -3.0), (5.8, -12.0)):
        pp = B(x, y)
        cv.setmat(pp[0], pp[1], "shell", 0.05)
    # stencilled number plate
    for i, (x, y) in enumerate(((-6.5, -9.0), (-5.5, -9.0), (-4.5, -9.0), (-6.5, -8.0), (-4.5, -8.0))):
        pp = B(x, y)
        cv.setmat(pp[0], pp[1], "shell", 0.3)
    # lens assembly on the front: brass ring, dark housing, teal glass with an iris and a glint
    lc = B(8.8, -12.0)
    blob(cv, lc[0], lc[1], 3.6, 3.8, "brass", 0.0)
    blob(cv, lc[0] + 0.3, lc[1], 2.6, 2.8, "dark", 0.0)
    lv = r["lens"]
    if lv > 0:
        m = cv.ellmask(lc[0] + 0.4, lc[1], 2.0, 2.2)
        nx, ny, nz = cv.sphn(lc[0] + 0.4, lc[1], 2.0, 2.2)
        cv.fill(m, "lens", np.clip(hd.lambert(nx, ny, nz, 0.3) * (0.55 + 0.45 * lv), 0, 1))
        cx, cy = cv.T((lc[0] + 0.6, lc[1] + 0.2))
        cv.putpx(int(cx), int(cy), ("@", "lens", 6 if lv > 0.7 else 4))
        cv.putpx(int(cx) - 1, int(cy) - 1, ("@", "lens", 5 if lv > 0.7 else 2))
        if lv > 0.7:
            cv.putpx(int(cx) + 2, int(cy), ("@", "lens", 2), late=True)
            cv.putpx(int(cx) + 3, int(cy), ("@", "lens", 1), late=True)
    # mast lamp on the back corner
    mast = B(-6.5, -19.5)
    matline(cv, mast, B(-6.5, -22.5), "metal", 0.5)
    tipx, tipy = cv.T(B(-6.5, -23.0))
    cv.putpx(int(tipx), int(tipy), R_LAMP_AMBER[-2] if r["lamp"] > 0.5 else (R_LAMP_AMBER[2] if r["lamp"] > 0 else "k3"))
    if r["lamp"] > 0.8:
        cv.putpx(int(tipx), int(tipy) - 1, R_LAMP_AMBER[-4], late=True)
    # near manipulator arm from the front-lower corner, tool at the end
    S = B(5.5, -7.0)
    wn = r["nw"] or B(9.5, -0.5)
    en = ik(S, wn, 6.5, 6.0, -1)
    blob(cv, S[0], S[1], 2.0, 2.0, "brass", -0.05)
    limb(cv, S, en, 1.7, 1.5, "metal", 0.0)
    blob(cv, en[0], en[1], 1.5, 1.5, "brass", 0.0)
    limb(cv, en, wn, 1.5, 1.3, "metal", 0.0)
    d = (wn[0] - en[0], wn[1] - en[1])
    L = math.hypot(*d) or 1
    d = (d[0] / L, d[1] / L)
    tip = add(wn, d, 3.0)
    if r["tool"] == "torch":
        limb(cv, wn, tip, 1.0, 0.7, "brass", 0.0)
    else:  # two-finger claw
        side = (-d[1], d[0])
        matline(cv, wn, add(add(wn, d, 3.0), side, 1.4), "tool", 0.7)
        matline(cv, wn, add(add(wn, d, 3.0), side, -1.4), "tool", 0.5)
    if r["fold"] > 0.9:
        cv.val[cv.mat == "lens"] *= 0.3
    cv.occlusion()
    cv.bands = RIG_BANDS
    return cv


def render_rigger_back(f) -> Canvas:
    cv = Canvas()
    lh, rh, lf, rf, dy = CLIMB[f]
    P = (32.0, 43.5 + dy)
    for hip, ank, dv in (((29.5, P[1]), (lf[0], lf[1] + 1.0), 0.0), ((34.5, P[1]), (rf[0], rf[1] + 1.0), -0.1)):
        knee = ik(hip, ank, 7.0, 7.5, +1 if ank[0] < 32 else -1)
        limb(cv, hip, knee, 1.9, 1.6, "metal", dv)
        limb(cv, knee, ank, 1.6, 1.3, "metal", dv)
        poly(cv, [(ank[0] - 2.6, ank[1] - 0.5), (ank[0] + 2.6, ank[1] - 0.5), (ank[0] + 2.8, ank[1] + 3.5),
                  (ank[0] - 2.8, ank[1] + 3.5)], "metal", dv, axis=((ank[0] - 3, ank[1]), (ank[0] + 3, ank[1]), 3))
    body = [(23.5, P[1] - 1.0), (23.5, P[1] - 17.0), (25.5, P[1] - 19.5), (38.5, P[1] - 19.5), (40.5, P[1] - 17.0),
            (40.5, P[1] - 1.0)]
    poly(cv, body, "shell", 0.0, axis=((23.5, P[1]), (40.5, P[1]), 8.5))
    # back service hatch with a verdigris-stained vent
    poly(cv, [(27.0, P[1] - 15.0), (37.0, P[1] - 15.0), (37.0, P[1] - 5.0), (27.0, P[1] - 5.0)], "metal", 0.0,
         axis=((27, P[1] - 10), (37, P[1] - 10), 5.0))
    for yy in range(int(P[1] - 13), int(P[1] - 6), 2):
        matline(cv, (28.5, yy), (35.5, yy), "dark", 0.3)
    matline(cv, (23.8, P[1] - 4.0), (40.2, P[1] - 4.0), "shell", 0.75)
    for sh, hnd, dv in (((25.0, P[1] - 14.0), lh, 0.0), ((39.0, P[1] - 14.0), rh, -0.08)):
        el = ik(sh, hnd, 7.0, 7.0, -1 if hnd[0] < 32 else 1)
        limb(cv, sh, el, 1.7, 1.5, "metal", dv)
        limb(cv, el, hnd, 1.5, 1.3, "metal", dv)
        matline(cv, hnd, (hnd[0], hnd[1] - 2.0), "tool", 0.6)
    matline(cv, (25.5, P[1] - 19.5), (25.5, P[1] - 22.5), "metal", 0.5)
    tx, ty = cv.T((25.5, P[1] - 23.0))
    cv.putpx(int(tx), int(ty), R_LAMP_AMBER[-2])
    cv.occlusion()
    cv.bands = RIG_BANDS
    return cv


class RiggerSpecies:
    name = "rigger"
    ramps = RIG_RAMPS

    def render(self, pose, f) -> Img:
        if pose == "climb":
            return render_rigger_back(f).resolve(RIG_RAMPS)
        im = render_rigger(pose, f).resolve(RIG_RAMPS)
        if pose == "repair":
            sparks(im, f, ("t4", "i4", "a2"))
        return im



# ── Spark-mite: a low copper crawler with a patinated carapace, six jointed legs and a spark-gap nose ─────────
MITE_RAMPS = {"shell": ["k2", "c0", "c0h", "c1", "c1h", "c2"], "patina": ["g0", "g1", "g1h", "g2"],
              "metal": ["k1", "k2", "k3", "k4", "k5", "s0"], "sole": R_SOLE, "dark": ["k0", "k1"]}
MITE_BANDS = {"shell": 4, "metal": 3}


def render_mite(kind, f) -> Canvas:
    cv = Canvas()
    dx = {"fight": [0, -1.5, 2.5], "hurt": [-1.5, -2.5], "repair": [1, 1, 1]}.get(kind, [0] * 8)
    ox = dx[f] if f < len(dx) else 0
    drop = {"stop": [0.5, 1.5, 3.0, 3.2]}.get(kind, [0] * 8)
    oy = drop[f] if f < len(drop) else 0
    cx, cy = 30.0 + ox, 55.0 + oy
    phase = f / 8.0 * 2 * math.pi if kind == "walk" else 0.0
    # legs: three per side; the far set darker. Each leg: hip on the body, knee up and out, foot on the floor.
    for side, dv in ((-1, -0.3), (1, 0.0)):
        for i, hx in enumerate((-5.0, 0.0, 5.0)):
            ph = phase + i * 2.1 + (math.pi if side < 0 else 0)
            lift = max(0.0, math.sin(ph)) * 2.2 if kind == "walk" else 0.0
            swing = math.cos(ph) * 2.0 if kind == "walk" else 0.0
            if kind == "stop" and f >= 1:
                lift, swing = 0.0, 0.0
            hip = (cx + hx * 0.9, cy - 0.5)
            fold = (f if kind == "stop" else 0)
            foot = (cx + hx * 2.2 + swing + (4.0 if hx == 0 else 1.5) * side,
                    GROUND + 3.0 - lift - (oy * 0.4 if kind == "stop" else 0))
            knee = (hip[0] + hx * 1.1 + (3.0 if hx == 0 else 1.2) * side + swing * 0.5,
                    cy - 6.5 - lift * 0.4 + fold * 1.6)
            limb(cv, hip, knee, 0.7, 0.6, "metal", dv)
            limb(cv, knee, foot, 0.6, 0.45, "metal", dv)
    # carapace: a low dome with a patina, segmented
    m = cv.ellmask(cx, cy - 2.0, 9.0, 4.6) & ~cv.polymask([(cx - 12, cy - 0.4), (cx + 12, cy - 0.4), (cx + 12, cy + 6),
                                                          (cx - 12, cy + 6)])
    nx, ny, nz = cv.sphn(cx, cy - 1.0, 9.0, 5.6)
    cv.fill(m, "shell", hd.lambert(nx, ny, nz, 0.22))
    poly(cv, [(cx - 9.0, cy - 1.2), (cx + 9.0, cy - 1.2), (cx + 8.0, cy + 1.0), (cx - 8.0, cy + 1.0)], "metal", 0.0,
         axis=((cx, cy - 1.2), (cx, cy + 1.0), 1.2))
    for sx in (-3.0, 2.0):
        matline(cv, (cx + sx, cy - 6.2), (cx + sx + 1.0, cy - 1.4), "shell", 0.2)
    for (px_, py_) in ((cx - 4.8, cy - 4.0), (cx - 3.8, cy - 3.2), (cx + 0.5, cy - 5.0), (cx + 4.8, cy - 3.0)):
        cv.setmat(px_, py_, "patina", 0.55)
    # head/nose with a single amber sensor and the spark-gap electrodes
    hc = (cx + 9.2, cy - 1.6)
    blob(cv, hc[0], hc[1], 2.6, 2.2, "metal", 0.0)
    a, b = cv.T((hc[0] + 1.0, hc[1] - 0.4))
    lit = not (kind == "stop" and f >= 1)
    cv.putpx(int(a), int(b), "a2" if lit else "k3")
    if lit:
        cv.putpx(int(a) + 1, int(b), "a0")
    for sy in (-1.2, 0.8):
        matline(cv, (hc[0] + 1.5, hc[1] + sy), (hc[0] + 4.8, hc[1] + sy * 1.6), "metal", 0.8)
    cv.occlusion()
    cv.bands = MITE_BANDS
    return cv


def mite_sparks(img: Img, kind, f):
    """Arcs between the electrodes; sabotage/fight throw them into whatever is in front."""
    x0, y0 = 45, 56
    arcs = {
        "idle": [[(x0, y0), (x0 + 1, y0 + 1)], [(x0 + 1, y0 - 1)], []][f % 3],
        "walk": [[(x0, y0)], [], [(x0 + 1, y0 + 1)], [], [(x0, y0 - 1)], [], [(x0 + 1, y0)], []][f % 8],
        "repair": [[(x0 + 2, y0), (x0 + 3, y0 - 1), (x0 + 4, y0), (x0 + 5, y0 + 1)],
                   [(x0 + 2, y0 + 1), (x0 + 3, y0), (x0 + 4, y0 - 1), (x0 + 5, y0), (x0 + 6, y0 - 2), (x0 + 7, y0 - 1)],
                   [(x0 + 2, y0), (x0 + 3, y0 + 1), (x0 + 4, y0), (x0 + 5, y0 - 1), (x0 + 6, y0), (x0 + 8, y0 + 1)]][f % 3],
        "fight": [[], [(x0, y0)], [(x0 + 4, y0), (x0 + 5, y0 - 1), (x0 + 6, y0), (x0 + 7, y0 + 1)]][f % 3],
    }.get(kind, [])
    for i, (x, y) in enumerate(arcs):
        img.put(x, y, "t4" if i % 2 == 0 else "t2")


class MiteSpecies:
    name = "spark-mite"

    def render(self, pose, f) -> Img:
        kind = "repair" if pose == "sabotage" else pose
        if kind == "climb":
            side = render_mite("walk", [0, 2, 4, 6][f]).resolve(MITE_RAMPS)
            rot = Img.of(np.rot90(side.a, 1))
            bb = rot.bbox()
            out = Img(FW, FH)
            w, h = bb[2] - bb[0], bb[3] - bb[1]
            out.blit(rot.crop(bb[0], bb[1], w, h), FW // 2 - w // 2, 70 - h)
            return out
        im = render_mite(kind, f).resolve(MITE_RAMPS)
        mite_sparks(im, kind, f)
        return im


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Atlas assembly
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
POSES = [  # (pose, frames, fps, loop, mirrored)
    ("idle", 3, 4, True, True),
    ("walk", 8, 12, True, True),
    ("climb", 4, 8, True, False),
    ("repair", 3, 8, True, True),
    ("man", 3, 3, True, True),
    ("fight", 3, 6, True, True),
    ("hurt", 2, 8, False, True),
    ("stop", 4, 4, False, True),
]
IDLE_SEQ = [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 2]


def sparks(img: Img, f: int, hot=("a3", "a2", "a1")):
    """Repair sparks spraying from the tool tip (unoutlined), placed in frame pixels."""
    pts = [[(51, 32), (53, 30), (52, 35)], [(52, 31), (54, 29), (55, 33), (51, 35), (53, 36)],
           [(53, 30), (56, 28), (55, 34), (52, 36), (57, 31), (54, 38)]][f]
    for i, (x, y) in enumerate(pts):
        img.put(x, y, hot[i % len(hot)])


class HumanSpecies:
    def __init__(self, look: Look, spark=("a3", "a2", "a1")):
        self.look = look
        self.name = look.name
        self.spark = spark

    def render(self, pose: str, f: int) -> Img:
        L = self.look
        if pose == "climb":
            return render_back(L, f).resolve(L.ramps)
        rig = "repair" if pose == "sabotage" else pose
        im = render_side(L, pose_for(rig, f)).resolve(L.ramps)
        if rig == "repair":
            sparks(im, f, self.spark)
        return im


def add_species(atlas: Atlas, sp, poses=POSES):
    atlas.group(sp.name)
    atlas.add(f"{sp.name}-portrait", portrait(sp.name), PW // 2, PW // 2)
    for pose, n, fps, loop, mirrored in poses:
        imgs = [sp.render(pose, f) for f in range(n)]
        dirs = [("right", imgs, AX)] if mirrored else [("up", imgs, AX)]
        if mirrored:
            dirs.append(("left", [im.flip_h() for im in imgs], FW - 1 - AX))
        for d, ims, ax in dirs:
            names = [atlas.add(f"{sp.name}-{pose}-{d}-{i}", im, ax, AY) for i, im in enumerate(ims)]
            seq = [names[i] for i in IDLE_SEQ] if pose == "idle" else names
            atlas.anim(f"{sp.name}-{pose}-{d}", seq, fps, loop)


POSES_BOARDER = [  # 'sabotage' uses the rig's repair pose
    ("idle", 3, 4, True, True),
    ("walk", 8, 14, True, True),
    ("climb", 4, 8, True, False),
    ("sabotage", 3, 10, True, True),
    ("fight", 3, 8, True, True),
    ("hurt", 2, 8, False, True),
    ("stop", 4, 5, False, True),
]


def build() -> Atlas:
    atlas = Atlas("crew", width=2048, scale=2)
    for sp in SPECIES:
        add_species(atlas, sp)
    for sp in BOARDERS:
        add_species(atlas, sp, POSES_BOARDER)
    for sp in SPECIES + BOARDERS:     # portraits sit in each species' band's own group for per-species swaps
        pass
    add_crew_ui(atlas)
    variants, chans, looks = variant_tables()
    atlas.meta("variants", variants)
    atlas.meta("variantChannels", chans)
    atlas.meta("variantLooks", looks)
    return atlas


SPECIES = [HumanSpecies(LINEFOLK), HumanSpecies(WARDEN), RiggerSpecies(), HumanSpecies(COURIER),
           HumanSpecies(BELLMAKER)]
BOARDERS = [MiteSpecies(), HumanSpecies(SPLICER, ("t4", "t3", "i4")), HumanSpecies(MARSHAL, ("e4", "e3", "a3"))]


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Portraits: 56x56 front-view busts for the crew list (same materials => the same palette swaps apply)
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
PW = 56


def _pc() -> Canvas:
    return Canvas(PW, PW, k=1.0)


def bust(cv: Canvas, look: Look, coat="coat", collar=True, shoulders=24.0):
    """Shoulders and chest in a coat, lit from the top-left."""
    pts = [(28 - shoulders, 56), (28 - shoulders + 1, 47), (28 - shoulders + 5, 42.5), (22, 40), (34, 40),
           (28 + shoulders - 5, 42.5), (28 + shoulders - 1, 47), (28 + shoulders, 56)]
    poly(cv, pts, coat, 0.0, axis=((28 - shoulders, 48), (28 + shoulders, 48), shoulders + 2))
    if collar:
        poly(cv, [(21, 39.5), (28, 45.5), (35, 39.5), (36, 42.5), (28, 49), (20, 42.5)], coat, 0.12,
             axis=((20, 44), (36, 44), 9))


def face(cv: Canvas, look: Look, cx=28.0, cy=24.5, eyes=True, brows="hair", mouth=True, rx=9.0, ry=11.0):
    # neck
    poly(cv, [(23.5, 32), (32.5, 32), (33.0, 42), (23.0, 42)], "skin", -0.2, axis=((23, 36), (33, 36), 5.5))
    # ears
    for ex in (cx - rx - 0.2, cx + rx + 0.2):
        blob(cv, ex, cy + 1.5, 1.8, 3.0, "skin", -0.1)
    # skull + jaw
    m = cv.ellmask(cx, cy - 1.0, rx, ry - 1.0) | cv.polymask(
        [(cx - rx + 0.3, cy), (cx + rx - 0.3, cy), (cx + rx - 1.6, cy + 7.0), (cx + 3.0, cy + 10.5),
         (cx - 3.0, cy + 10.5), (cx - rx + 1.6, cy + 7.0)])
    nx, ny, nz = hd.sphere_normals(PW, PW, cx, cy + 0.5, rx + 1.0, ry + 1.5)
    cv.fill(m, "skin", hd.lambert(nx, ny, nz, 0.32))
    X, Y = int(cx), int(cy)
    if eyes:
        for ex, near in ((X - 6, True), (X + 3, False)):
            for k in range(-1, 4):                          # socket shade + upper lid line
                cv.setpx(ex + k, Y, "skin", 0.26 if k in (0, 1, 2) else 0.34)
            cv.putpx(ex, Y + 1, "s2" if near else "s1h")    # muted sclera
            cv.putpx(ex + 1, Y + 1, "k0h")                  # iris / pupil
            cv.putpx(ex + 2, Y + 1, "k1" if near else "k0h")
            cv.setpx(ex - 1, Y + 1, "skin", 0.4)
            cv.setpx(ex + 3, Y + 1, "skin", 0.38)
            for k in range(0, 3):                           # lower lid
                cv.setpx(ex + k, Y + 2, "skin", 0.45)
    if brows:
        for bx, lit in ((X - 7, 0.32), (X + 2, 0.22)):
            for k in range(5):
                cv.setpx(bx + k, Y - 2 - (1 if k in (1, 2) else 0), brows, lit)
    # nose: lit bridge, shadowed right flank, nostrils, under-nose shade
    for yy in range(Y + 1, Y + 7):
        cv.setpx(X + 1, yy, "skin", 0.36)
        cv.setpx(X - 1, yy, "skin", 0.9)
    cv.setpx(X - 2, Y + 7, "skin", 0.28)
    cv.setpx(X + 1, Y + 7, "skin", 0.22)
    cv.setpx(X + 2, Y + 7, "skin", 0.3)
    cv.setpx(X - 1, Y + 7, "skin", 0.45)
    if mouth:
        for k in range(-3, 3):
            cv.setpx(X + k, Y + 10, "skin", 0.16 if abs(k + 0.5) < 2 else 0.28)
        for k in range(-2, 2):
            cv.setpx(X + k, Y + 11, "skin", 0.8)
        cv.setpx(X - 4, Y + 10, "skin", 0.35)
    # cheekbone and jaw shadow on the right, chin shade
    for yy in range(Y + 3, Y + 9):
        cv.setpx(X + 7, yy, "skin", 0.3)
    for k in range(-2, 3):
        cv.setpx(X + k, Y + 13, "skin", 0.4)


def hair_front(cv: Canvas, style="short", cx=28.0, cy=24.5):
    if style == "short":
        pts = [(cx - 10.2, cy + 2.0), (cx - 10.4, cy - 5.0), (cx - 7.0, cy - 11.0), (cx, cy - 12.6),
               (cx + 7.4, cy - 11.0), (cx + 10.4, cy - 5.0), (cx + 10.2, cy + 2.0), (cx + 8.6, cy - 3.2),
               (cx + 3.0, cy - 5.6), (cx - 2.0, cy - 4.4), (cx - 8.6, cy - 3.2)]
    elif style == "long":
        pts = [(cx - 11.5, cy + 17.0), (cx - 11.8, cy - 4.0), (cx - 7.5, cy - 11.4), (cx, cy - 12.8),
               (cx + 7.6, cy - 11.4), (cx + 11.8, cy - 4.0), (cx + 11.5, cy + 17.0), (cx + 9.0, cy + 16.0),
               (cx + 9.2, cy - 2.4), (cx + 3.0, cy - 6.4), (cx - 3.0, cy - 5.0), (cx - 9.2, cy - 2.4),
               (cx - 9.0, cy + 16.0)]
    else:
        return
    m = cv.polymask(pts)
    nx, ny, nz = hd.sphere_normals(PW, PW, cx, cy - 2.0, 12.0, 13.0)
    cv.fill(m, "hair", hd.lambert(nx, ny, nz, 0.25))
    # strands
    for (a, b) in (((cx - 4, cy - 10), (cx - 7, cy - 4)), ((cx + 2, cy - 11), (cx + 5, cy - 6)),
                   ((cx - 1, cy - 11), (cx - 2, cy - 6))):
        matline(cv, a, b, "hair", 0.32)


def portrait_linefolk(look):
    cv = _pc()
    bust(cv, look)
    face(cv, look)
    hair_front(cv, "short")
    # headset: band over the crown, both ear cups, boom mic to the mouth corner, LED
    for x in range(19, 38):
        yy = 13.0 - math.sqrt(max(0.0, 90 - (x - 28.5) ** 2)) * 0.95 + 9.2
        cv.setpx(x, int(yy), "brass", 0.5)
    for ex in (17.5, 38.5):
        blob(cv, ex, 26.5, 2.6, 3.4, "brass", 0.0)
    cv.putpx(17, 25, ("@", "lamp", -3))
    matline(cv, (19.0, 29.5), (24.0, 34.2), "brass", 0.35)
    cv.setpx(24, 34, "leather", 0.2)
    # coat details: placket, lamp with glow, patch
    matline(cv, (28, 46), (28, 56), "coat", 0.25)
    for yy in (49, 53):
        cv.setpx(29, yy, "brass", 0.55)
    lx, ly = 34, 48
    cv.setpx(lx - 1, ly - 1, "brass", 0.7)
    cv.setpx(lx, ly - 1, "brass", 0.75)
    cv.setpx(lx + 1, ly - 1, "brass", 0.6)
    cv.setpx(lx - 1, ly, "brass", 0.4)
    cv.setpx(lx + 1, ly, "brass", 0.3)
    lamp = look.ramps["lamp"]
    cv.putpx(lx, ly, ("@", "lamp", -1))
    cv.putpx(lx, ly + 1, ("@", "lamp", -3))
    cv.putpx(lx + 2, ly, ("@", "lamp", -4), late=True)
    cv.putpx(lx, ly + 2, ("@", "lamp", -5))
    for (x, y) in ((9, 50), (10, 50), (9, 51), (10, 51), (11, 51)):
        cv.setpx(x, y, "coat", 0.45)
    cv.occlusion()
    return cv


def portrait_warden(look):
    cv = _pc()
    bust(cv, look, shoulders=26)
    # pauldrons
    for sx in (7.0, 49.0):
        blob(cv, sx, 45.0, 6.5, 4.5, "coat", 0.05)
    face(cv, look, eyes=False, brows=None)
    # helmet over the head, visor band across the eyes, cheek guards, crest
    m = cv.ellmask(28, 22.5, 11.5, 11.5) & ~cv.polymask([(19, 33), (37, 33), (36, 27.5), (20, 27.5)])
    m &= ~cv.polymask([(22, 36), (34, 36), (34, 28.0), (22, 28.0)])
    nx, ny, nz = hd.sphere_normals(PW, PW, 28, 22.5, 12, 12)
    cv.fill(m, "coat", hd.lambert(nx, ny, nz, 0.22))
    for x in range(17, 40):
        cv.setpx(x, 24, "brass", 0.8 if x < 30 else 0.6)
        cv.setpx(x, 25, "slit", 0.2)
        cv.setpx(x, 26, "brass", 0.4)
    for y in range(11, 22):
        cv.setpx(28, y, "stripe", 0.75)
        cv.setpx(29, y, "stripe", 0.4)
    for y in range(40, 56):
        cv.setpx(28, y, "stripe", 0.7)
    cv.setpx(21, 30, "brass", 0.6)
    cv.setpx(35, 30, "brass", 0.5)
    cv.occlusion()
    return cv


def portrait_courier(look):
    cv = _pc()
    bust(cv, look)
    face(cv, look)
    hair_front(cv, "short")
    # goggles pushed up on the forehead
    for x in range(18, 39):
        cv.setpx(x, 15, "leather", 0.45)
    for gx in (23.0, 33.0):
        blob(cv, gx, 15.0, 3.2, 2.6, "brass", 0.0)
        cv.putpx(int(gx), 15, "t0h")
        cv.putpx(int(gx) - 1, 14, "t1")
    # satchel strap across the chest, lamp
    matline(cv, (12, 42), (40, 56), "leather", 0.5)
    matline(cv, (12, 43), (39, 56), "leather", 0.3)
    lamp = look.ramps["lamp"]
    cv.putpx(20, 48, ("@", "lamp", -1))
    cv.putpx(20, 49, ("@", "lamp", -3))
    cv.putpx(22, 48, ("@", "lamp", -4), late=True)
    cv.setpx(19, 47, "brass", 0.7)
    cv.setpx(20, 47, "brass", 0.6)
    cv.occlusion()
    return cv


def portrait_bellmaker(look):
    cv = _pc()
    # the fork behind the shoulder
    for y in range(18, 44):
        cv.setpx(44 - (y - 18) // 6, y, "glass", 0.75)
        cv.setpx(45 - (y - 18) // 6, y, "glass", 0.45)
    for y in range(12, 20):
        cv.setpx(41, y, "glass", 0.85)
        cv.setpx(46, y, "glass", 0.6)
    for x in range(41, 47):
        cv.setpx(x, 20, "glass", 0.65)
    cv.putpx(41, 13, ("@", "glass", -1))
    cv.putpx(46, 16, ("@", "glass", -2))
    hair_front(cv, "long")
    bust(cv, look)
    face(cv, look)
    # forelocks over the brow
    matline(cv, (22, 14), (19, 22), "hair", 0.7)
    matline(cv, (34, 14), (37, 22), "hair", 0.5)
    # violet trim at the lapels + glass pendant on a cord
    matline(cv, (21, 40), (26, 56), "glass", 0.45)
    matline(cv, (35, 40), (30, 56), "glass", 0.4)
    matline(cv, (24, 41), (28, 48), "leather", 0.3)
    matline(cv, (32, 41), (28, 48), "leather", 0.3)
    glass = look.ramps["glass"]
    cv.putpx(28, 49, ("@", "glass", -1))
    cv.putpx(27, 50, ("@", "glass", -3))
    cv.putpx(28, 50, ("@", "glass", -2))
    cv.putpx(28, 51, ("@", "glass", -4))
    cv.putpx(30, 49, ("@", "glass", -4), late=True)
    cv.occlusion()
    return cv


def portrait_rigger(look_ramps):
    cv = _pc()
    # a front view of the cabinet: enamel box, dark lens housing with the teal lens, vent grille, mast lamp
    poly(cv, [(8, 56), (8, 16), (12, 11), (44, 11), (48, 16), (48, 56)], "shell", 0.0, axis=((8, 30), (48, 30), 20))
    for x in range(14, 43, 3):
        matline(cv, (x, 13), (x, 17), "shell", 0.15)
    matline(cv, (9, 19), (47, 19), "shell", 0.25)
    matline(cv, (9, 44), (47, 44), "shell", 0.25)
    matline(cv, (9, 45), (47, 45), "shell", 0.75)
    blob(cv, 28, 31, 9.0, 9.0, "brass", 0.0)
    blob(cv, 28, 31, 7.2, 7.2, "dark", 0.0)
    m = cv.ellmask(28.5, 31, 5.4, 5.4)
    nx, ny, nz = hd.sphere_normals(PW, PW, 28.5, 31, 5.4, 5.4)
    cv.fill(m, "lens", hd.lambert(nx, ny, nz, 0.3))
    cv.putpx(26, 29, ("@", "lens", 6))
    cv.putpx(27, 29, ("@", "lens", 5))
    cv.putpx(26, 30, ("@", "lens", 5))
    blob(cv, 29, 32, 1.6, 1.6, "dark", 0.0)
    for (x, y) in ((11, 22), (45, 22), (11, 41), (45, 41), (14, 50), (42, 50)):
        cv.setpx(x, y, "brass", 0.6)
    for (x, y) in ((16, 38), (17, 38), (40, 24)):
        cv.setpx(x, y, "shell", 0.05)
    matline(cv, (12, 11), (12, 4), "metal", 0.5)
    cv.putpx(12, 3, R_LAMP_AMBER[-2])
    for x in range(14, 22):
        cv.setpx(x, 50, "shell", 0.3)
    cv.occlusion()
    return cv


def portrait_machine(kind, look):
    cv = _pc()
    bust(cv, look, collar=False, shoulders=25 if kind == "marshal" else 20)
    face(cv, look, eyes=False, brows=None, mouth=False)
    m = cv.ellmask(28, 22.0, 11.0, 12.5)
    nx, ny, nz = hd.sphere_normals(PW, PW, 28, 22, 12, 13)
    cv.fill(m, "coat", hd.lambert(nx, ny, nz, 0.22))
    if kind == "marshal":
        for x in range(19, 38):
            cv.setpx(x, 23, "slit", 0.2)
        for x in range(22, 35):
            cv.putpx(x, 23, "e3" if 26 <= x <= 30 else "e2")
        for y in range(9, 21):
            cv.setpx(28, y, "coat", 0.9)
        for y in range(42, 56, 1):
            cv.putpx(28, y, "e2" if y % 3 else "e3")
        for sx in (8.0, 48.0):
            blob(cv, sx, 45.0, 6.0, 4.5, "coat", 0.05)
    else:
        for x in range(21, 36):
            cv.setpx(x, 23, "slit", 0.2)
            cv.setpx(x, 24, "slit", 0.2)
        cv.putpx(28, 23, "a2")
        cv.putpx(29, 23, "a1")
        cv.putpx(27, 23, "a0")
        for y in range(44, 52):
            for x in (26, 27, 28, 29, 30):
                cv.setpx(x, y, "brass" if (x + y) % 2 else "coat", 0.4)
        cv.putpx(28, 48, "a2")
    cv.occlusion()
    return cv


def portrait_mite():
    cv = _pc()
    m = cv.ellmask(28, 34, 20, 13) & ~cv.polymask([(0, 38), (56, 38), (56, 56), (0, 56)])
    nx, ny, nz = hd.sphere_normals(PW, PW, 28, 36, 20, 15)
    cv.fill(m, "shell", hd.lambert(nx, ny, nz, 0.22))
    poly(cv, [(8, 37), (48, 37), (46, 42), (10, 42)], "metal", 0.0, axis=((28, 37), (28, 42), 3))
    for sx in (-1, 1):
        for k in range(3):
            hx = 28 + sx * (10 + k * 5)
            matline(cv, (hx, 40), (hx + sx * 4, 30 + k * 2), "metal", 0.6)
            matline(cv, (hx + sx * 4, 30 + k * 2), (hx + sx * 7, 50), "metal", 0.45)
    blob(cv, 28, 42, 6, 4.5, "metal", 0.0)
    cv.putpx(28, 42, "a2")
    cv.putpx(29, 42, "a0")
    matline(cv, (25, 45), (22, 52), "metal", 0.8)
    matline(cv, (31, 45), (34, 52), "metal", 0.8)
    cv.putpx(21, 53, "t4", late=True)
    cv.putpx(35, 53, "t3", late=True)
    cv.putpx(22, 54, "t2", late=True)
    for (x, y) in ((18, 28), (19, 27), (30, 25), (38, 30)):
        cv.setpx(x, y, "patina", 0.55)
    cv.occlusion()
    return cv


def portrait(name) -> Img:
    if name == "linefolk":
        return portrait_linefolk(LINEFOLK).resolve(LINEFOLK.ramps, bands={})
    if name == "warden":
        return portrait_warden(WARDEN).resolve(WARDEN.ramps, bands={})
    if name == "courier":
        return portrait_courier(COURIER).resolve(COURIER.ramps, bands={})
    if name == "bellmaker":
        return portrait_bellmaker(BELLMAKER).resolve(BELLMAKER.ramps, bands={})
    if name == "rigger":
        return portrait_rigger(RIG_RAMPS).resolve(RIG_RAMPS, bands={})
    if name == "splicer":
        return portrait_machine("splicer", SPLICER).resolve(SPLICER.ramps, bands={})
    if name == "marshal-trooper":
        return portrait_machine("marshal", MARSHAL).resolve(MARSHAL.ramps, bands={})
    if name == "spark-mite":
        return portrait_mite().resolve(MITE_RAMPS, bands={})
    raise KeyError(name)


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Crew UI bits (2x density): floor selection brackets, status tags, hp bar
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
def select_marker(hi, mid, lo, w=44) -> Img:
    """Floor brackets under the feet (anchor = centre of the floor line): two bevelled corner brackets joined by
    a faint arc, drawn 2 px thick."""
    im = Img(w, 9)
    for x0, dirx in ((0, 1), (w - 1, -1)):
        for k in range(8):
            im.put(x0 + dirx * k, 7, hi if k < 6 else mid).put(x0 + dirx * k, 8, mid)
        for yy in range(2, 8):
            im.put(x0, yy, hi).put(x0 + dirx, yy, mid)
        im.put(x0, 1, mid)
    for x in range(10, w - 10):
        im.put(x, 8, lo if (x // 2) % 2 == 0 else mid)
    return im


TAG_W, TAG_H = 20, 22


def status_tag(kind, f) -> Img:
    """A small dark tag in a tarnished brass bevel hung above the head; the symbol is the only lit accent."""
    im = Img(TAG_W, TAG_H)
    body = hd.poly_mask(TAG_W, TAG_H, [(1, 1), (19, 1), (19, 16), (12, 16), (10, 19), (8, 16), (1, 16)])
    nx, ny, nz = hd.bevel_normals(body, 2)
    hd.paint(im, body, hd.lambert(nx, ny, nz, 0.2), hd.MAT["brass-dark"])
    inner = hd.poly_mask(TAG_W, TAG_H, [(4, 4), (16, 4), (16, 13.5), (4, 13.5)])
    im.fill_mask(inner, "k1")
    im.hline(4, 15, 4, "k0")
    hd.selout(im, "k0", -3)
    cx, cy = 10, 9
    if kind == "suffocating":   # rising air bubbles
        pts = [((7, 11), "t1"), ((11, 9), "t2"), ((9, 7), "t0h")] if f == 0 else [((7, 9), "t2"), ((11, 11), "t1"), ((12, 6), "t0h")]
        for (x, y), c in pts:
            im.put(x, y, c).put(x + 1, y, c).put(x, y - 1, hd.step(c, -1))
    elif kind == "alert":
        c = "e2" if f == 0 else "e1h"
        for y in range(6, 11):
            im.put(cx - 1, y, c).put(cx, y, hd.step(c, -1))
        im.put(cx - 1, 12, c).put(cx, 12, hd.step(c, -1))
    elif kind == "repair":      # spanner and a spark
        for k in range(6):
            im.put(6 + k, 12 - k, "s1").put(7 + k, 12 - k, "s0")
        im.put(12, 6, "s2").put(13, 7, "s1").put(12, 8, "s1")
        im.put(14, 5 if f == 0 else 11, "a2")
    elif kind == "fire":
        tongue = [(9, 6), (10, 7), (9, 8), (10, 8), (8, 9), (9, 9), (10, 9), (11, 9), (8, 10), (9, 10), (10, 10),
                  (11, 10), (8, 11), (9, 11), (10, 11), (11, 11), (7, 12), (12, 12)]
        for x, y in tongue:
            im.put(x + (1 if f and y < 9 else 0), y, "e1" if y < 10 else "e2")
        im.put(9, 11, "a0").put(10, 11, "a1" if f == 0 else "a0")
    elif kind == "stopped":     # a doused lamp
        for y in range(6, 13):
            im.put(9, y, "s0").put(10, y, "k4")
        im.put(8, 8, "s0").put(11, 8, "k4").put(8, 11, "s0").put(11, 11, "k4")
        im.put(9, 9, "k3").put(10, 9, "k3")
    return im


def hp_bar():
    fr = Img(36, 6, "k0")
    fr.rect(1, 1, 34, 4, None)
    fr.hline(1, 34, 0, "k1")
    fills = {"green": "g2", "amber": "a0", "red": "e1", "empty": "k2"}
    return fr, {k: Img(1, 1, v) for k, v in fills.items()}


def add_crew_ui(atlas):
    atlas.group("ui")
    atlas.add("select-ring", select_marker("t2", "t1", "t0"), 22, 8)
    atlas.add("select-ring-hover", select_marker("i2", "i1", "i0"), 22, 8)
    atlas.add("select-ring-enemy", select_marker("e2", "e1", "e0"), 22, 8)
    atlas.add("select-ring-small", select_marker("t2", "t1", "t0", 32), 16, 8)
    for kind in ("suffocating", "alert", "repair", "fire", "stopped"):
        names = [atlas.add(f"bubble-{kind}-{f}", status_tag(kind, f), 10, 20) for f in range(2)]
        atlas.anim(f"bubble-{kind}", names, 3, True)
    fr, fills = hp_bar()
    atlas.add("crew-hp-frame", fr, 0, 0)
    for k, im in fills.items():
        atlas.add(f"crew-hp-fill-{k}", im, 0, 0)


# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Palette-swap looks. A channel = "<materials>/<materials sharing its colours>"; each option lists one ramp per
# key material (same length as the default ramp). The build checks that no other material or fixed detail colour
# of the species uses a channel's source colours.
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
SKIN4 = {"fair": ["c3", "c4~b3", "e4~c4", "e4"], "pale": ["i1", "i1h", "i2h", "e4"],
         "olive": ["b1", "b1h", "b2h", "c4~b3"], "tan": ["c2", "c3", "c3h", "c4"], "brown": ["c1", "c2", "c2h", "c3"],
         "deep": ["c0", "c1", "c1h", "c2"], "umber": ["k2", "b0", "b0h", "b1"]}
SKIN5 = {k: [v[0]] + v for k, v in SKIN4.items()}
SKIN5.update({"tan": ["c2h", "c3", "c3h", "c4", "c4~b3"], "brown": ["c1", "c1h", "c2", "c2h", "c3"]})
HAIR5 = {"brown": ["c0", "c0h", "c1", "c1h", "c2"], "black": ["k0", "k1", "k1h", "k2", "k2h"],
         "blond": ["b1", "b1h", "b2", "b2h", "b3"], "grey": ["k5", "s0", "s0h", "s1", "s2"],
         "auburn": ["c1", "c1h", "c2", "c2h", "c3"], "white": ["i0", "i1", "i2", "i3", "i4"],
         "silver": ["s0", "s0h", "s1", "s2", "s3"]}
COAT7 = {"ivory": ["i0", "i0h", "i1", "i1h", "i2", "i2h", "i3"], "grey": ["k4", "k5", "s0", "s0h", "s1", "s1h", "s2"],
         "khaki": ["b0", "b0h", "b1", "b1h", "b2", "b2h", "b3"], "green": ["g0", "g0h", "g0h", "g1", "g1h", "g1h", "g2"],
         "rust": ["c0", "c0h", "c1", "c1h", "c2", "c2h", "c3"], "slate": ["k3", "k4", "k5", "k5~s0", "s0", "s0h", "s1"],
         "ink": ["k1", "k2", "k2h", "k3", "k3h", "k4", "k5"]}
LAMP7 = {"teal": R_LAMP_TEAL, "amber": R_LAMP_AMBER, "ivory": ["i0", "i1", "i1h", "i2", "i3", "i3h", "i4"],
         "violet": R_GLASS, "verdigris": ["g0", "g0h", "g1", "g1h", "g2", "g3", "g4"]}


def _skin_opts(n, keys=("fair", "pale", "olive", "tan", "brown", "deep", "umber")):
    src = SKIN4 if n == 4 else SKIN5
    return [[src[k]] for k in keys]


CHANNELS = {
    "linefolk": {
        "skin": ("skin", _skin_opts(4)),
        "hair": ("hair", [[HAIR5[k]] for k in ("brown", "black", "auburn", "blond", "grey", "white")]),
        "coat": ("coat", [[COAT7[k]] for k in ("ivory", "grey", "khaki", "green", "rust")]),
        "lamp": ("lamp", [[LAMP7[k]] for k in ("teal", "amber", "ivory")]),
    },
    "warden": {
        "skin": ("skin", _skin_opts(4)),
        "armour": ("coat/trousers,boot", [[R_ARMOUR], [["k1", "c0", "b0", "b0h", "b1", "b1h", "b2", "b2h"]],
                            [["k1", "g0", "g0h", "g1", "g1h", "g2", "g2h", "g3"]],
                            [["k0", "k1", "k1h", "k2", "k2h", "k3", "k3h", "k4"]]]),
        "stripe": ("stripe/lamp", [[R_STRIPE], [["c1", "a0", "a0h", "a1"]], [["t0", "t0h", "t1", "t1h"]],
                              [["v0", "v1", "v1h", "v2"]]]),
    },
    "courier": {
        "skin": ("skin", _skin_opts(5, ("tan", "fair", "brown", "olive", "deep", "pale", "umber"))),
        "hair": ("hair", [[HAIR5[k]] for k in ("brown", "black", "auburn", "blond", "grey")]),
        "coat": ("coat", [[COAT7[k]] for k in ("green", "khaki", "grey", "rust", "ink")]),
        "lamp": ("lamp", [[LAMP7[k]] for k in ("amber", "teal")]),
    },
    "bellmaker": {
        "skin": ("skin", _skin_opts(5, ("brown", "deep", "tan", "fair", "umber", "olive"))),
        "hair": ("hair", [[HAIR5[k]] for k in ("white", "silver", "black", "grey", "auburn")]),
        "coat": ("coat", [[COAT7[k]] for k in ("slate", "ink", "rust", "khaki")]),
        "glass": ("glass/lamp", [[R_GLASS], [["t0", "t0h", "t1", "t1h", "t2", "t3", "t4"]],
                                 [R_LAMP_AMBER]]),
    },
    "rigger": {
        "shell": ("shell", [[RIG_RAMPS["shell"]], [["b0", "b1", "b1h", "b2", "b2h", "b3", "b3h"]],
                            [["k3", "k4", "k5", "s0", "s0h", "s1", "s1h"]],
                            [["k2", "g0", "g0h", "g1", "g1h", "g2", "g2h"]],
                            [["k2", "c0", "c0h", "c1", "c1h", "c2", "c2h"]]]),
        "lens": ("lens", [[RIG_RAMPS["lens"]], [["e0", "a0", "a0h", "a1", "a1h", "a2", "a3"]],
                          [["v0", "v1", "v1h", "v2", "v2h", "v3", "v4"]], [["g0", "g0h", "g1", "g1h", "g2", "g3", "g4"]]]),
    },
}
# Looks: CrewMember.look % len(variants[species]); values index CHANNELS options in channel order; look 0 = default.
LOOKS = {
    "linefolk": [(0, 0, 0, 0), (3, 1, 0, 1), (5, 1, 1, 0), (1, 2, 0, 0), (4, 1, 2, 1), (2, 3, 1, 1),
                 (6, 4, 0, 0), (0, 5, 3, 1), (4, 4, 1, 2), (1, 0, 2, 0), (5, 2, 0, 1), (3, 4, 4, 0)],
    "warden": [(0, 0, 0), (4, 1, 0), (1, 0, 1), (5, 2, 2), (2, 3, 3), (6, 0, 0), (3, 3, 1), (0, 1, 2)],
    "courier": [(0, 0, 0, 0), (1, 1, 1, 0), (2, 2, 2, 1), (3, 0, 0, 0), (4, 3, 3, 1), (5, 4, 4, 0),
                (6, 1, 1, 1), (1, 3, 2, 0)],
    "bellmaker": [(0, 0, 0, 0), (1, 1, 1, 1), (2, 0, 2, 2), (3, 3, 0, 0), (4, 2, 3, 1), (5, 4, 1, 0)],
    "rigger": [(0, 0), (1, 1), (2, 0), (3, 2), (4, 3), (0, 1), (2, 2), (1, 0)],
}
LOOK_OF = {"linefolk": LINEFOLK, "warden": WARDEN, "courier": COURIER, "bellmaker": BELLMAKER}
INCIDENTAL = {"tool", "sole", "slit"}


def variant_tables():
    variants, chans_json, looks_json = {}, {}, {}
    sp_by = {sp.name: sp for sp in SPECIES}
    for name, chans in CHANNELS.items():
        ramps = RIG_RAMPS if name == "rigger" else LOOK_OF[name].ramps
        FIXED_KEYS.clear()
        sp = sp_by[name]
        for pose, n, fps, loop, mirrored in POSES:      # render once to collect the fixed detail keys
            for f in range(n):
                sp.render(pose, f)
        portrait(name)
        fixed = {hexof(k) for k in FIXED_KEYS}
        chans_json[name] = {}
        for cname, (mats, options) in chans.items():
            keys, _, shared = mats.partition("/")
            keys = keys.split(",")
            shared = set(shared.split(",")) if shared else set()
            src = [hexof(c) for m in keys for c in ramps[m]]
            others = {hexof(c) for m, r in ramps.items() if m not in keys and m not in shared and m not in INCIDENTAL
                      for c in r}
            clash = (set(src) & others) | (set(src) & fixed)
            if clash:
                raise ValueError(f"{name}.{cname}: swappable colours also used elsewhere: {sorted(clash)}")
            chans_json[name][cname] = []
            for opt in options:
                m = {}
                for mat, target in zip(keys, opt):
                    if len(target) != len(ramps[mat]):
                        raise ValueError(f"{name}.{cname}: option length {len(target)} != {len(ramps[mat])}")
                    for a, b in zip(ramps[mat], target):
                        if hexof(a) != hexof(b) and hexof(a) not in m:
                            m[hexof(a)] = hexof(b)
                chans_json[name][cname].append(m)
        variants[name], looks_json[name] = [], []
        for look in LOOKS[name]:
            m = {}
            for (cname, _), oi in zip(chans.items(), look):
                m.update(chans_json[name][cname][oi])
            variants[name].append(m)
            looks_json[name].append(dict(zip(chans.keys(), look)))
    return variants, chans_json, looks_json
