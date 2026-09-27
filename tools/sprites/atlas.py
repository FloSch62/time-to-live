"""Deterministic atlas packer + writer (public/sprites/<name>.png + .json).

Frames are packed in insertion order, group by group, on shelves of a fixed atlas width with 1 px of transparent
spacing. Pixel-identical frames share one rectangle (their names stay distinct in the JSON). Output is byte-for-byte
reproducible for the same inputs.
"""
from __future__ import annotations

import hashlib
import json
import os
from collections import OrderedDict

import numpy as np
from PIL import Image

from px import ROOT, Img

OUT_DIR = os.path.join(ROOT, "public", "sprites")


class Frame:
    __slots__ = ("name", "img", "ax", "ay", "group", "extra", "rect")

    def __init__(self, name, img, ax, ay, group, extra):
        self.name, self.img, self.ax, self.ay, self.group, self.extra = name, img, ax, ay, group, extra
        self.rect = None


class Atlas:
    def __init__(self, name: str, width: int = 512, pad: int = 1, scale: int = 2):
        """scale = atlas pixels per layout unit (contract v3: HD atlases are authored at 2x density)."""
        self.name = name
        self.scale = scale
        self.width = width
        self.pad = pad
        self.frames: "OrderedDict[str, Frame]" = OrderedDict()
        self.anims: "OrderedDict[str, dict]" = OrderedDict()
        self.slices: "OrderedDict[str, dict]" = OrderedDict()
        self.extra: "OrderedDict[str, object]" = OrderedDict()
        self._group = "main"
        self.group_rects: "OrderedDict[str, list]" = OrderedDict()

    # ── authoring API ───────────────────────────────────────────────────────────────────────────────
    def group(self, name: str):
        """Start a new packing band. Every later frame goes into this group until the next call."""
        self._group = name
        return self

    def add(self, name: str, img: Img, ax: int | None = None, ay: int | None = None, **extra):
        """Add a frame. Anchor defaults to the image centre. Extra keys (e.g. mx/my muzzle) go into the JSON."""
        if name in self.frames:
            raise ValueError(f"{self.name}: duplicate frame {name}")
        if img.w == 0 or img.h == 0:
            raise ValueError(f"{self.name}: empty frame {name}")
        ax = img.w // 2 if ax is None else ax
        ay = img.h // 2 if ay is None else ay
        self.frames[name] = Frame(name, img, int(ax), int(ay), self._group, extra)
        return name

    def anim(self, name: str, frames: list[str], fps: float = 8, loop: bool = True, **extra):
        if name in self.anims:
            raise ValueError(f"{self.name}: duplicate anim {name}")
        d = {"frames": list(frames), "fps": fps, "loop": loop}
        d.update(extra)
        self.anims[name] = d
        return name

    def seq(self, base: str, imgs: list[Img], ax=None, ay=None, fps=8, loop=True, anim=True, **extra):
        """Add frames base-0..base-N and an anim `base` over them."""
        names = [self.add(f"{base}-{i}", im, ax, ay, **extra) for i, im in enumerate(imgs)]
        if anim:
            self.anim(base, names, fps, loop)
        return names

    def slice9(self, name: str, img: Img, l: int, t: int, r: int, b: int, **extra):
        """Add a 9-slice source: stored as a frame and in `slices` with its insets."""
        self.add(name, img, 0, 0, **extra)
        self.slices[name] = {"l": l, "t": t, "r": r, "b": b}
        return name

    def meta(self, key: str, value):
        self.extra[key] = value

    # ── packing / output ────────────────────────────────────────────────────────────────────────────
    def pack(self):
        pad = self.pad
        W = self.width
        placed: dict[str, tuple] = {}
        y = 0
        groups = OrderedDict()
        for fr in self.frames.values():
            groups.setdefault(fr.group, []).append(fr)
        for gname, frs in groups.items():
            x = 0
            row_h = 0
            gy0 = y
            gx1 = 0
            for fr in frs:
                w, h = fr.img.w, fr.img.h
                if w > W:
                    raise ValueError(f"frame {fr.name} wider than atlas")
                digest = hashlib.sha1(fr.img.a.tobytes() + bytes([w & 255, w >> 8, h & 255, h >> 8])).hexdigest()
                if digest in placed:
                    fr.rect = placed[digest]
                    continue
                if x + w > W:
                    y += row_h + pad
                    x, row_h = 0, 0
                fr.rect = (x, y, w, h)
                placed[digest] = fr.rect
                x += w + pad
                gx1 = max(gx1, x - pad)
                row_h = max(row_h, h)
            y += row_h + pad
            self.group_rects[gname] = [0, gy0, gx1, y - pad - gy0]
        height = max(1, y - pad)
        canvas = Img(W, height)
        done = set()
        for fr in self.frames.values():
            if fr.rect in done:
                continue
            done.add(fr.rect)
            canvas.blit(fr.img, fr.rect[0], fr.rect[1])
        # trim unused width (to the widest frame rectangle, never to visible pixels)
        used_w = max((fr.rect[0] + fr.rect[2] for fr in self.frames.values()), default=1)
        canvas = canvas.crop(0, 0, used_w, height)
        return canvas

    def save(self, out_dir: str = OUT_DIR):
        os.makedirs(out_dir, exist_ok=True)
        canvas = self.pack()
        png = os.path.join(out_dir, f"{self.name}.png")
        Image.fromarray(canvas.to_rgba(), "RGBA").save(png, optimize=True)
        doc = OrderedDict()
        doc["image"] = f"{self.name}.png"
        doc["scale"] = self.scale
        doc["size"] = {"w": canvas.w, "h": canvas.h}
        doc["frames"] = OrderedDict()
        for fr in self.frames.values():
            x, y, w, h = fr.rect
            d = OrderedDict(x=x, y=y, w=w, h=h, ax=fr.ax, ay=fr.ay)
            d.update(fr.extra)
            doc["frames"][fr.name] = d
        doc["anims"] = self.anims
        if self.slices:
            sl = OrderedDict()
            for n, ins in self.slices.items():
                x, y, w, h = self.frames[n].rect
                sl[n] = OrderedDict(x=x, y=y, w=w, h=h, **ins)
            doc["slices"] = sl
        doc["groups"] = OrderedDict((g, dict(zip("xywh", r))) for g, r in self.group_rects.items())
        for k, v in self.extra.items():
            doc[k] = v
        with open(os.path.join(out_dir, f"{self.name}.json"), "w") as f:
            f.write(_dump(doc))
        return png, canvas.w, canvas.h, len(self.frames), len(self.anims)


def _dump(doc) -> str:
    """JSON with one entry per line for frames/anims/slices (diff-friendly, still valid JSON)."""
    parts = ["{"]
    keys = list(doc.keys())
    for i, k in enumerate(keys):
        v = doc[k]
        comma = "," if i < len(keys) - 1 else ""
        if isinstance(v, dict) and k in ("frames", "anims", "slices", "groups") and v:
            parts.append(f' {json.dumps(k)}: {{')
            items = list(v.items())
            for j, (fk, fv) in enumerate(items):
                c2 = "," if j < len(items) - 1 else ""
                parts.append(f'  {json.dumps(fk)}: {json.dumps(fv, separators=(",", ":"))}{c2}')
            parts.append(f" }}{comma}")
        elif isinstance(v, dict) and v and all(isinstance(x, (dict, list)) for x in v.values()):
            parts.append(f' {json.dumps(k)}: {{')
            items = list(v.items())
            for j, (fk, fv) in enumerate(items):
                c2 = "," if j < len(items) - 1 else ""
                parts.append(f'  {json.dumps(fk)}: {json.dumps(fv, separators=(",", ":"))}{c2}')
            parts.append(f" }}{comma}")
        else:
            parts.append(f' {json.dumps(k)}: {json.dumps(v, separators=(",", ":"))}{comma}')
    parts.append("}")
    return "\n".join(parts) + "\n"
