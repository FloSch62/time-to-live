#!/usr/bin/env python3
"""DIRECTION v5 (A3) finalize: a picked Krea candidate -> pixel-art scene or event in public/art + manifest record.

  python tools/art/finalize_v5.py bg/s1-a art-src/cand/bg/s1-a/s1-a-v5c-295398006.png [--params JSON] [--note TXT]
  python tools/art/finalize_v5.py events/copper-market CAND.png
  python tools/art/finalize_v5.py sheet bg s1          contact sheet of a region's candidates (tools/shots/art/v5/)

Scenes (bg/*, ending/*): tools/art/pixelscene.py --preset pix8 onto 640x360 (drawn 3x in game).
Events (events/*): --preset event onto 320x160 (drawn 2x in the 640x320 event frame).
The record keeps the source candidate, its prompt/seed/settings, the pixelscene parameters, the scene palette and
the vessel-band statistics (DIRECTION v5 acceptance: mean L 0.20-0.28, spread <= 0.28, p95 chroma <= 0.07).
"""
import argparse
import datetime
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art-src"
PUB = ROOT / "public" / "art"
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "art"))
from pixelscene import PRESETS, pixelscene  # noqa: E402

SCENE = {"size": (640, 360), "preset": "pix8"}
EVENT = {"size": (320, 160), "preset": "event"}


def kind(group):
    return EVENT if group == "events" else SCENE


def band_stats(img, y0=0.2, y1=0.65):
    import numpy as np
    from pixelize import srgb_to_oklab
    a = np.asarray(img.convert("RGB"))
    H = a.shape[0]
    lab = srgb_to_oklab(a[int(y0 * H):int(y1 * H)]).reshape(-1, 3)
    L = lab[:, 0]
    C = np.hypot(lab[:, 1], lab[:, 2])
    return {"L_mean": round(float(L.mean()), 3), "L_spread": round(float(np.percentile(L, 95) - np.percentile(L, 5)), 3),
            "C_p95": round(float(np.percentile(C, 95)), 3)}


def process(key, cand, overrides=None):
    group, aid = key.split("/")
    k = kind(group)
    params = dict(PRESETS[k["preset"]])
    params.update({kk: v for kk, v in (overrides or {}).items() if kk not in ("night_top", "heal_panel")})
    with Image.open(cand) as im:
        out, info = pixelscene(im, k["size"], **params)
    info.pop("_layers", None)
    return out, info, params


def composite_tender(out, aid):
    """v5e tender events: our carrier + tender overlay (art-src/init/events/<id>-overlay.png, 2560x1280) reduced to
    the event grid (per-cell median of opaque pixels, alpha by majority), snapped to the hull palette, dimmed a
    little into the night scene, and laid over the pixel scene."""
    import numpy as np
    from pixelize import build_palette, nearest, srgb_to_oklab
    ovp = ART / "init" / "events" / f"{aid}-overlay.png"
    if not ovp.exists():
        return out, False
    ov = np.asarray(Image.open(ovp).convert("RGBA")).astype(np.float64)
    W, H = out.size
    f = ov.shape[1] // W
    cells = ov[:H * f, :W * f].reshape(H, f, W, f, 4).transpose(0, 2, 1, 3, 4).reshape(H, W, f * f, 4)
    alpha = (cells[..., 3] > 127)
    share = alpha.mean(-1)
    rgb = np.zeros((H, W, 3))
    for y in range(H):
        for x in range(W):
            if share[y, x] >= 0.45:
                px = cells[y, x][alpha[y, x]][:, :3]
                rgb[y, x] = np.median(px, axis=0)
    pal = build_palette(2)
    lab = srgb_to_oklab(np.clip(rgb * 0.88, 0, 255).astype(np.uint8))
    idx = nearest(lab, srgb_to_oklab(pal))
    a = np.asarray(out.convert("RGB")).copy()
    m = share >= 0.45
    a[m] = pal[idx][m]
    return Image.fromarray(a, "RGB"), True


def night_top(out, rows):
    """Replace a painted sunset band at the top (rows 0..rows) by the night sky continued upward: each row takes
    the colour of the first clean dark row below it, darkened toward the top in clean bands (hard 2-row steps)."""
    import numpy as np
    from pixelize import srgb_to_oklab, oklab_to_srgb
    a = np.asarray(out.convert("RGB")).copy()
    lab = srgb_to_oklab(a)
    base = np.median(lab[rows + 6:rows + 30].reshape(-1, 3), axis=0)
    for y in range(rows + 1):
        t = 1 - y / max(1, rows)
        c = base.copy()
        c[0] = base[0] * (1 - 0.35 * t)
        c[1:] = base[1:] * (1 - 0.3 * t)
        a[y] = oklab_to_srgb(c[None])[0]
    return Image.fromarray(a, "RGB")


def heal_panel(out, col, rows):
    """Krea painted the requested calm left half as a darker flat panel with a hard vertical edge at `col`. Sky pixels
    left of the edge (rows 0..rows; within 0.05 L of the row's left median) take the right half's sky of the same row
    (a 24-px strip just right of the edge, tiled, so its bands and seams continue); towers, lamps and the lamp arc
    (darker or brighter than the sky) keep their pixels."""
    import numpy as np
    from pixelize import srgb_to_oklab
    a = np.asarray(out.convert("RGB")).copy()
    L = srgb_to_oklab(a)[..., 0]
    for y in range(rows):
        med = np.median(L[y, max(0, col - 60):col])
        right = a[y, col + 3:col + 90].reshape(-1, 3)
        vals, cnt = np.unique(right, axis=0, return_counts=True)
        band = vals[cnt.argmax()]                                   # the right half's band colour in this row
        for x in range(col + 3):
            if abs(L[y, x] - med) <= 0.05 or x >= col - 1:
                if x >= col - 1 and abs(L[y, x] - med) > 0.05 and abs(L[y, x] - L[y, col + 4]) > 0.05:
                    continue
                a[y, x] = band
    return Image.fromarray(a, "RGB")


def finalize(key, cand, overrides=None, note=None):
    group, aid = key.split("/")
    cand = Path(cand).resolve()
    out, info, params = process(key, cand, overrides)
    if group == "events" and ("-v5e-" in cand.name or "-v5s-" in cand.name):
        out, _ = composite_tender(out, aid)
    if overrides and overrides.get("night_top"):
        out = night_top(out, int(overrides["night_top"]))
    if overrides and overrides.get("heal_panel"):
        out = heal_panel(out, *overrides["heal_panel"])
    dest = PUB / group / f"{aid}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, optimize=True)
    rec = json.loads(cand.with_suffix(".json").read_text()) if cand.with_suffix(".json").exists() else {}
    gen = {k: rec.get(k) for k in ("version", "prompt", "seed", "width", "height", "denoise", "steps", "cfg",
                                   "sampler", "scheduler", "models", "comfyui_revision") if rec.get(k) is not None}
    man_path = ART / "manifest.json"
    man = json.loads(man_path.read_text())
    band = band_stats(out) if group != "events" else None
    man.setdefault(group, {})[aid] = {
        "file": str(dest.relative_to(ROOT / "public")), "size": list(out.size), "direction": "v5",
        "source": str(cand.relative_to(ROOT)), "engine": "local-krea-2-turbo (ComfyUI)", "generation": gen,
        "pixelscene": {k: (list(v) if isinstance(v, tuple) else v) for k, v in params.items()},
        "palette": info["palette"], "colors_used": info["colors_used"], "orphans": info["singletons_detail"],
        **({"band": band} if band else {}), "sha256": hashlib.sha256(dest.read_bytes()).hexdigest(),
        "date": datetime.date.today().isoformat(), **({"note": note} if note else {}),
    }
    man_path.write_text(json.dumps(man, indent=1, sort_keys=True) + "\n")
    print(f"final {dest.relative_to(ROOT)} {out.size} colours {info['colors_used']} orphans "
          f"{info['singletons_detail']} band {band}")
    return dest


def sheet(group, prefix, version="v5c"):
    """All candidates of a region (ids starting with prefix): native at 2x per row, with band stats."""
    rows = []
    for d in sorted((ART / "cand" / group).glob(f"{prefix}*")):
        cands = sorted(d.glob(f"{d.name}-{version}-*.png"))
        if cands:
            rows.append((d.name, cands))
    k = 2 if group != "events" else 2
    size = kind(group)["size"]
    cw, ch = size[0] * k + 16, size[1] * k + 34
    ncol = max(len(c) for _, c in rows) if rows else 1
    sh = Image.new("RGB", (ncol * cw + 16, len(rows) * ch + 16), (12, 14, 24))
    d = ImageDraw.Draw(sh)
    for r, (aid, cands) in enumerate(rows):
        for i, c in enumerate(cands):
            out, info, _ = process(f"{group}/{aid}", c)
            x, y = 8 + i * cw, 8 + r * ch
            sh.paste(out.resize((size[0] * k, size[1] * k), Image.NEAREST), (x, y + 26))
            b = band_stats(out) if group != "events" else {}
            d.text((x, y + 6), f"{aid} {c.stem.rsplit('-', 1)[1]}  L{b.get('L_mean', '')} "
                               f"s{b.get('L_spread', '')} C{b.get('C_p95', '')}  orph {info['singletons_detail']}",
                   fill=(233, 223, 196))
    out = ROOT / "tools" / "shots" / "art" / "v5" / f"{group}-{prefix}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sh.save(out)
    print("sheet", out.relative_to(ROOT))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("key")
    ap.add_argument("arg")
    ap.add_argument("arg2", nargs="?")
    ap.add_argument("--params")
    ap.add_argument("--note")
    ap.add_argument("--version", default="v5c")
    a = ap.parse_args()
    if a.key == "sheet":
        sheet(a.arg, a.arg2 or "", a.version)
    else:
        finalize(a.key, a.arg, json.loads(a.params) if a.params else None, a.note)


if __name__ == "__main__":
    main()
