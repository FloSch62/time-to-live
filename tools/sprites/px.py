"""Core pixel-art toolkit for TIME TO LIVE code-authored sprites.

Everything is drawn into `Img`, a small indexed-colour canvas: each pixel holds a palette index (0..49) or -1 for
transparent. Only colours of the master palette (public/palette.json) can ever be written, so palette discipline is
enforced by construction.

Palette keys (two characters: group letter + ramp step, HIGHER DIGIT = LIGHTER in every ramp):

    k0..k5  ink        #07080f .. #3a4a70   (k0 = the outline colour)
    s0..s3  steel      #4a5068 .. #c3c7d4
    i0..i4  ivory      #7d7159 .. #f4ecd6
    b0..b5  brass      #553619 .. #ffe39a
    c0..c4  copper     #3f1b16 .. #e08a55
    g0..g4  verdigris  #1b3b38 .. #8fd6b6
    t0..t4  teal       #146069 .. #c8fff6
    a0..a3  amber      #e8822a .. #fff1c2
    v0..v4  violet     #2c2159 .. #e2c8ff
    e0..e4  ember      #5e1224 .. #ffc2a8

Conventions (see README.md): light comes from the top-left; sprites get a 1-px `k0` outline (4-connected) unless
they are glows/particles; ramps are used in order without skipping more than one step between neighbours.
"""
from __future__ import annotations

import json
import math
import os
from typing import Iterable

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PALETTE_PATH = os.path.join(ROOT, "public", "palette.json")

with open(PALETTE_PATH) as f:
    _PAL = json.load(f)

HEX: list[str] = [h.lower() for h in _PAL["all"]]
RGB: np.ndarray = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in HEX], dtype=np.uint8)

_GROUP_LETTER = {
    "ink": "k", "steel": "s", "ivory": "i", "brass": "b", "copper": "c",
    "verdigris": "g", "teal": "t", "amber": "a", "violet": "v", "ember": "e",
}
# groups listed dark->light in palette.json (others are light->dark)
_DARK_FIRST = {"ink", "steel"}

KEY: dict[str, int] = {}
for gname, cols in _PAL["groups"].items():
    letter = _GROUP_LETTER[gname]
    ordered = cols if gname in _DARK_FIRST else list(reversed(cols))
    for n, hx in enumerate(ordered):
        KEY[f"{letter}{n}"] = HEX.index(hx.lower())
MASTER_COUNT = len(HEX)

# ── HD (contract v3) palette extension: the midpoint between every pair of neighbouring steps in a master ramp
#    ("b2h" = halfway between b2 and b3) plus a few documented bridges between ramps. Hi-bit sprites may use these
#    in-between steps; nothing else. The full list is recorded in tools/sprites/palette-hd.json.
_RAMP_LETTERS = {"k": 6, "s": 4, "i": 5, "b": 6, "c": 5, "g": 5, "t": 5, "a": 4, "v": 5, "e": 5}
BRIDGES = [("k5", "s0"), ("e4", "c4"), ("s3", "i3"), ("i0", "b1"), ("c4", "b3")]


def _mid(h1: str, h2: str) -> str:
    a = [int(h1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(h2[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{(x + y + 1) // 2:02x}" for x, y in zip(a, b))


def _add_key(key: str, hx: str):
    if hx not in HEX:
        HEX.append(hx)
    KEY[key] = HEX.index(hx)


for _l, _n in _RAMP_LETTERS.items():
    for _i in range(_n - 1):
        _add_key(f"{_l}{_i}h", _mid(HEX[KEY[f"{_l}{_i}"]], HEX[KEY[f"{_l}{_i + 1}"]]))
for _a, _b in BRIDGES:
    _add_key(f"{_a}~{_b}", _mid(HEX[KEY[_a]], HEX[KEY[_b]]))
RGB = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in HEX], dtype=np.uint8)
NAME = {}
for _k, _v in KEY.items():
    NAME.setdefault(_v, _k)

def ramp(letter: str, lo: int = 0, hi: int | None = None, half: bool = True) -> list[str]:
    """Keys of one ramp dark->light, from step lo to step hi inclusive, with half steps between when half=True."""
    n = _RAMP_LETTERS[letter]
    hi = n - 1 if hi is None else hi
    out = []
    for i in range(lo, hi + 1):
        out.append(f"{letter}{i}")
        if half and i < hi:
            out.append(f"{letter}{i}h")
    return out


RAMPS = {
    "k": ["k0", "k1", "k2", "k3", "k4", "k5"],
    "s": ["s0", "s1", "s2", "s3"],
    "i": ["i0", "i1", "i2", "i3", "i4"],
    "b": ["b0", "b1", "b2", "b3", "b4", "b5"],
    "c": ["c0", "c1", "c2", "c3", "c4"],
    "g": ["g0", "g1", "g2", "g3", "g4"],
    "t": ["t0", "t1", "t2", "t3", "t4"],
    "a": ["a0", "a1", "a2", "a3"],
    "v": ["v0", "v1", "v2", "v3", "v4"],
    "e": ["e0", "e1", "e2", "e3", "e4"],
}

T = -1  # transparent


def idx(c) -> int:
    """Palette key ('b3'), '#rrggbb', int index or None/'.' (transparent) -> palette index / -1."""
    if c is None or c == "." or c == -1:
        return T
    if isinstance(c, (int, np.integer)):
        return int(c)
    if isinstance(c, str):
        if c.startswith("#"):
            return HEX.index(c.lower())
        return KEY[c]
    raise ValueError(c)


def hexof(c) -> str:
    return HEX[idx(c)]


class Img:
    """Indexed-colour sprite canvas. a[y, x] = palette index or -1."""

    __slots__ = ("a",)

    def __init__(self, w: int, h: int, fill=None):
        self.a = np.full((h, w), idx(fill), dtype=np.int16)

    # ── construction ────────────────────────────────────────────────────────────────────────────────
    @classmethod
    def of(cls, arr: np.ndarray) -> "Img":
        o = cls.__new__(cls)
        o.a = arr.astype(np.int16).copy()
        return o

    @classmethod
    def ascii(cls, art: str | list[str], legend: dict, w: int | None = None, h: int | None = None) -> "Img":
        """Build from ASCII art. `.` and space are transparent; other chars looked up in `legend` (char -> key).
        Leading/trailing blank lines of a triple-quoted string are dropped; common indentation is removed."""
        rows = _ascii_rows(art)
        hh = h or len(rows)
        ww = w or max((len(r) for r in rows), default=0)
        img = cls(ww, hh)
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch in ". ":
                    continue
                if ch not in legend:
                    raise KeyError(f"ascii char {ch!r} not in legend (row {y}: {row!r})")
                img.a[y, x] = idx(legend[ch])
        return img

    def copy(self) -> "Img":
        return Img.of(self.a)

    @property
    def w(self) -> int:
        return self.a.shape[1]

    @property
    def h(self) -> int:
        return self.a.shape[0]

    # ── pixel ops ───────────────────────────────────────────────────────────────────────────────────
    def inb(self, x, y) -> bool:
        return 0 <= x < self.w and 0 <= y < self.h

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if self.inb(x, y):
            self.a[y, x] = idx(c)
        return self

    def get(self, x, y) -> int:
        return int(self.a[y, x]) if self.inb(x, y) else T

    def key(self, x, y) -> str | None:
        v = self.get(x, y)
        return None if v < 0 else NAME[v]

    def opaque(self, x, y) -> bool:
        return self.get(x, y) >= 0

    def pts(self, pts: Iterable, c):
        for x, y in pts:
            self.put(x, y, c)
        return self

    def rect(self, x, y, w, h, c):
        x0, y0, x1, y1 = max(0, x), max(0, y), min(self.w, x + w), min(self.h, y + h)
        if x1 > x0 and y1 > y0:
            self.a[y0:y1, x0:x1] = idx(c)
        return self

    def box(self, x, y, w, h, c):
        """1-px rectangle outline."""
        self.hline(x, x + w - 1, y, c)
        self.hline(x, x + w - 1, y + h - 1, c)
        self.vline(x, y, y + h - 1, c)
        self.vline(x + w - 1, y, y + h - 1, c)
        return self

    def hline(self, x0, x1, y, c):
        if x1 < x0:
            x0, x1 = x1, x0
        for x in range(x0, x1 + 1):
            self.put(x, y, c)
        return self

    def vline(self, x, y0, y1, c):
        if y1 < y0:
            y0, y1 = y1, y0
        for y in range(y0, y1 + 1):
            self.put(x, y, c)
        return self

    def line(self, x0, y0, x1, y1, c):
        for x, y in line_pts(x0, y0, x1, y1):
            self.put(x, y, c)
        return self

    def disc(self, cx, cy, r, c):
        """Filled circle; centre may be fractional (e.g. 7.5 for an even diameter)."""
        for x, y in disc_pts(cx, cy, r):
            self.put(x, y, c)
        return self

    def ring(self, cx, cy, r, c, thick=1):
        inner = set(disc_pts(cx, cy, r - thick)) if r - thick > 0 else set()
        for p in disc_pts(cx, cy, r):
            if p not in inner:
                self.put(p[0], p[1], c)
        return self

    def ellipse(self, cx, cy, rx, ry, c):
        for x, y in ellipse_pts(cx, cy, rx, ry):
            self.put(x, y, c)
        return self

    def fill_mask(self, mask: np.ndarray, c):
        self.a[mask] = idx(c)
        return self

    def mask(self) -> np.ndarray:
        return self.a >= 0

    def recolor(self, mapping: dict) -> "Img":
        """Return a copy with colours swapped (keys/hex/indices accepted; applied simultaneously)."""
        out = self.a.copy()
        for src, dst in mapping.items():
            out[self.a == idx(src)] = idx(dst)
        return Img.of(out)

    def only(self, c) -> "Img":
        """Silhouette: every opaque pixel set to c."""
        out = self.a.copy()
        out[out >= 0] = idx(c)
        return Img.of(out)

    # ── composition ─────────────────────────────────────────────────────────────────────────────────
    def blit(self, src: "Img", x: int, y: int):
        x, y = int(x), int(y)
        sh, sw = src.a.shape
        dx0, dy0 = max(0, x), max(0, y)
        dx1, dy1 = min(self.w, x + sw), min(self.h, y + sh)
        if dx1 <= dx0 or dy1 <= dy0:
            return self
        s = src.a[dy0 - y:dy1 - y, dx0 - x:dx1 - x]
        d = self.a[dy0:dy1, dx0:dx1]
        m = s >= 0
        d[m] = s[m]
        return self

    def under(self, src: "Img", x: int, y: int):
        """Blit src only where self is transparent (draw behind)."""
        tmp = Img(self.w, self.h)
        tmp.blit(src, x, y)
        m = (self.a < 0) & (tmp.a >= 0)
        self.a[m] = tmp.a[m]
        return self

    def flip_h(self) -> "Img":
        return Img.of(self.a[:, ::-1])

    def flip_v(self) -> "Img":
        return Img.of(self.a[::-1, :])

    def rot90(self, k=1) -> "Img":
        """Rotate counter-clockwise by k*90 degrees (pixel-exact)."""
        return Img.of(np.rot90(self.a, k))

    def crop(self, x, y, w, h) -> "Img":
        out = Img(w, h)
        out.blit(Img.of(self.a), -x, -y)
        return out

    def pad(self, n=1) -> "Img":
        out = Img(self.w + 2 * n, self.h + 2 * n)
        out.blit(self, n, n)
        return out

    def shift(self, dx, dy) -> "Img":
        out = Img(self.w, self.h)
        out.blit(self, dx, dy)
        return out

    def bbox(self):
        ys, xs = np.nonzero(self.a >= 0)
        if len(xs) == 0:
            return None
        return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1

    # ── pixel-art helpers ───────────────────────────────────────────────────────────────────────────
    def outline(self, c="k0", diag=False, only_where_empty=True) -> "Img":
        """Add a 1-px outline around opaque pixels (in place, on transparent pixels only)."""
        m = self.a >= 0
        grow = np.zeros_like(m)
        grow[1:, :] |= m[:-1, :]
        grow[:-1, :] |= m[1:, :]
        grow[:, 1:] |= m[:, :-1]
        grow[:, :-1] |= m[:, 1:]
        if diag:
            grow[1:, 1:] |= m[:-1, :-1]
            grow[1:, :-1] |= m[:-1, 1:]
            grow[:-1, 1:] |= m[1:, :-1]
            grow[:-1, :-1] |= m[1:, 1:]
        ring = grow & ~m
        self.a[ring] = idx(c)
        return self

    def inner_edge(self, mask_fn=None):
        """Return boolean mask of opaque pixels touching transparency (4-neighbour)."""
        m = self.a >= 0
        e = np.zeros_like(m)
        pad = np.pad(m, 1, constant_values=False)
        e |= ~pad[:-2, 1:-1]
        e |= ~pad[2:, 1:-1]
        e |= ~pad[1:-1, :-2]
        e |= ~pad[1:-1, 2:]
        return e & m

    def rim(self, light: str, dark: str | None = None, sel=None):
        """Top-left rim light / bottom-right rim shade on the silhouette edge (only on pixels in `sel` colours)."""
        m = self.a >= 0
        pad = np.pad(m, 1, constant_values=False)
        up_empty = ~pad[:-2, 1:-1]
        left_empty = ~pad[1:-1, :-2]
        down_empty = ~pad[2:, 1:-1]
        right_empty = ~pad[1:-1, 2:]
        selm = np.isin(self.a, [idx(s) for s in sel]) if sel else m
        if light:
            self.a[(up_empty | left_empty) & m & selm] = idx(light)
        if dark:
            self.a[(down_empty | right_empty) & ~(up_empty | left_empty) & m & selm] = idx(dark)
        return self

    def sphere(self, cx, cy, r, ramp: list[str], light=(-0.55, -0.65), spec: str | None = None, bands=None):
        """Disc shaded as a lit sphere from the top-left with hard bands from `ramp` (dark->light)."""
        lx, ly = light
        ln = math.hypot(lx, ly)
        lx, ly = lx / ln, ly / ln
        n = len(ramp)
        pts = disc_pts(cx, cy, r)
        for x, y in pts:
            dx = (x + 0.5 - cx) / max(r, 0.5)
            dy = (y + 0.5 - cy) / max(r, 0.5)
            dz = math.sqrt(max(0.0, 1 - dx * dx - dy * dy))
            lam = max(0.0, dx * lx + dy * ly + dz * 0.6) / 1.17
            k = min(n - 1, int(lam * n)) if bands is None else _band(lam, bands)
            self.put(x, y, ramp[k])
        if spec:
            sx = int(math.floor(cx - r * 0.45))
            sy = int(math.floor(cy - r * 0.45))
            self.put(sx, sy, spec)
        return self

    def to_rgba(self) -> np.ndarray:
        out = np.zeros((self.h, self.w, 4), dtype=np.uint8)
        m = self.a >= 0
        out[m, :3] = RGB[self.a[m]]
        out[m, 3] = 255
        return out

    def keys_used(self) -> set[str]:
        return {NAME[int(v)] for v in np.unique(self.a) if v >= 0}

    def __repr__(self):
        return f"Img({self.w}x{self.h})"


def _band(lam, bands):
    for i, b in enumerate(bands):
        if lam < b:
            return i
    return len(bands)


def _ascii_rows(art) -> list[str]:
    if isinstance(art, list):
        return list(art)
    lines = art.split("\n")
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    indent = min((len(l) - len(l.lstrip(" ")) for l in lines if l.strip()), default=0)
    return [l[indent:].rstrip() for l in lines]


def line_pts(x0, y0, x1, y1):
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    pts = []
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy
    return pts


def disc_pts(cx, cy, r):
    """Pixels whose centres lie within radius r (+ a small bias for rounder small circles)."""
    pts = []
    rr = r * r + r * 0.35
    for y in range(int(math.floor(cy - r - 1)), int(math.ceil(cy + r + 1))):
        for x in range(int(math.floor(cx - r - 1)), int(math.ceil(cx + r + 1))):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx * dx + dy * dy <= rr:
                pts.append((x, y))
    return pts


def ellipse_pts(cx, cy, rx, ry):
    pts = []
    for y in range(int(math.floor(cy - ry - 1)), int(math.ceil(cy + ry + 1))):
        for x in range(int(math.floor(cx - rx - 1)), int(math.ceil(cx + rx + 1))):
            dx, dy = (x + 0.5 - cx) / max(rx, 0.01), (y + 0.5 - cy) / max(ry, 0.01)
            if dx * dx + dy * dy <= 1.0 + 0.35 / max(min(rx, ry), 0.5):
                pts.append((x, y))
    return pts


def ring_pts(cx, cy, r, thick=1):
    inner = set(disc_pts(cx, cy, r - thick)) if r - thick > 0 else set()
    return [p for p in disc_pts(cx, cy, r) if p not in inner]


def hexmap(mapping: dict) -> dict:
    """{key: key} -> {'#hex': '#hex'} for the JSON palette-swap tables."""
    return {hexof(a): hexof(b) for a, b in mapping.items() if hexof(a) != hexof(b)}
