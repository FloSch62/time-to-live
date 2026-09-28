#!/usr/bin/env python3
"""A1 pixel-art style study: process candidates, stage them for the in-game override, shoot them, build sheets.

  python tools/art/style_study.py [--only ID ...] [--no-shots] [--sheets-only]

Entries live in art-src/study.json (list of {id, subject, recipe, note, src, size, preset, params, crop}). For each:
  1. tools/art/pixelscene.py turns `src` (a Krea render under art-src/) into art-src/cand/study/_final/<id>.png
     (+ .json info with palette and parameters) and copies it to public/art/_study/<id>.png;
  2. backgrounds are shot in game behind the Lamplighter: /?dev=relay and /?dev=combat with &bg=_study/<id>&bgfx=0
     (tools/shot.mjs, 1920x1080; dev server at $TTL_URL or http://127.0.0.1:5181);
     events are composited into the event screen's 320x160 art frame (the screen is not ours to override);
  3. tools/shots/art/style-study/<subject>.png: one row per recipe: native 1:1 | 300% nearest crop | relay | combat.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art-src"
FINAL = ART / "cand" / "study" / "_final"
PUB = ROOT / "public" / "art" / "_study"
OUT = ROOT / "tools" / "shots" / "art" / "style-study"
sys.path.insert(0, str(ROOT / "tools" / "art"))
from pixelscene import PRESETS, pixelscene  # noqa: E402

BG = (12, 14, 24)
INK = (233, 223, 196)
DIM = (144, 150, 168)


def font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def band_stats(img, y0=0.2, y1=0.65):
    """OKLab stats of the band the vessels cover (default 20-65 % of the height): mean L, L spread (p95-p5) and
    p95 chroma. For the backdrop to sit behind the hulls these must stay well below the hull's own values."""
    from pixelize import srgb_to_oklab
    import numpy as np
    a = np.asarray(img.convert("RGB"))
    H = a.shape[0]
    lab = srgb_to_oklab(a[int(y0 * H):int(y1 * H)]).reshape(-1, 3)
    L = lab[:, 0]
    C = np.hypot(lab[:, 1], lab[:, 2])
    return {"L_mean": round(float(L.mean()), 3), "L_spread": round(float(np.percentile(L, 95) - np.percentile(L, 5)), 3),
            "C_p95": round(float(np.percentile(C, 95)), 3)}


def hull_stats():
    import numpy as np
    from pixelize import srgb_to_oklab
    im = Image.open(ROOT / "public" / "art" / "ships" / "lamplighter.png").convert("RGBA")
    a = np.asarray(im)
    px = a[a[..., 3] > 200][:, :3]
    lab = srgb_to_oklab(px)
    L = lab[:, 0]
    C = np.hypot(lab[:, 1], lab[:, 2])
    return {"L_mean": round(float(L.mean()), 3), "L_spread": round(float(np.percentile(L, 95) - np.percentile(L, 5)), 3),
            "C_p95": round(float(np.percentile(C, 95)), 3)}


def process(e):
    if e.get("baseline"):
        # the shipped art as the reference row (R0): no processing, shown as-is
        import numpy as np
        from pixelscene import singletons
        img = Image.open(ROOT / e["src"]).convert("RGB")
        n = len(img.getcolors(1 << 24) or [])
        a = np.asarray(img).astype(np.int64)
        _, inv = np.unique((a[..., 0] << 16 | a[..., 1] << 8 | a[..., 2]).ravel(), return_inverse=True)
        idx = inv.reshape(a.shape[:2])
        # counted on its 2x2 cells (the HD painting's own pixel), comparable with the low-res scenes
        orph = singletons(idx[::2, ::2], np.ones(idx[::2, ::2].shape, bool))
        info = {"id": e["id"], "source": e["src"], "recipe": e["recipe"], "colors_used": n, "singletons_detail": orph,
                "smooth_share": "-", "size": list(img.size), "band": band_stats(img)}
        return img, info
    params = dict(PRESETS.get(e.get("preset"), {}))
    params.update(e.get("params", {}))
    with Image.open(ART / e["src"]) as im:
        if e.get("src_crop"):
            x, y, w, h = e["src_crop"]
            im = im.crop((x, y, x + w, y + h))
        out, info = pixelscene(im, tuple(e["size"]), **params)
    info.update(id=e["id"], preset=e.get("preset"), source=e["src"], recipe=e["recipe"], band=band_stats(out))
    if e.get("src_crop"):
        info["src_crop"] = e["src_crop"]
    src_json = (ART / e["src"]).with_suffix(".json")
    if src_json.exists():
        rec = json.loads(src_json.read_text())
        info["generation"] = {k: rec.get(k) for k in ("seed", "width", "height", "prompt", "version", "steps", "cfg",
                                                      "sampler", "scheduler", "models", "seconds")}
    FINAL.mkdir(parents=True, exist_ok=True)
    PUB.mkdir(parents=True, exist_ok=True)
    for name, im in (info.pop("_layers", None) or {}).items():
        im.save(FINAL / f"{e['id']}-{name}.png", optimize=True)
        shutil.copy(FINAL / f"{e['id']}-{name}.png", PUB / f"{e['id']}-{name}.png")
    out.save(FINAL / f"{e['id']}.png", optimize=True)
    (FINAL / f"{e['id']}.json").write_text(json.dumps(info, indent=1) + "\n")
    shutil.copy(FINAL / f"{e['id']}.png", PUB / f"{e['id']}.png")
    return out, info


def shoot(e, url_base):
    shots = {}
    if e["subject"] == "cm":
        return shots
    for view in ("relay", "combat"):
        path = OUT / "shots" / f"{e['id']}-{view}.png"
        path.parent.mkdir(parents=True, exist_ok=True)
        bg = e["src"].replace("public/art/", "").replace(".png", "") if e.get("baseline") else f"_study/{e['id']}"
        q = f"/?dev={view}&bg={bg}&bgfx=0"
        subprocess.run(["node", "tools/shot.mjs", q, str(path), "5500", "1920", "1080"], cwd=ROOT, check=True,
                       capture_output=True, env={**__import__("os").environ, "TTL_URL": url_base})
        shots[view] = path
    return shots


def event_composite(e, img):
    """Paste the candidate into the event screen's art frame (layout 320,y 320x160 -> backing 640x320 at 2x)."""
    base = OUT / "shots" / "event-screen.png"
    if not base.exists():
        return None
    scr = Image.open(base).convert("RGB")
    frame = json.loads((OUT / "shots" / "event-frame.json").read_text())  # {"x":..,"y":..,"w":640,"h":320}
    k = frame["w"] // img.width
    art = img.resize((img.width * k, img.height * k), Image.NEAREST)
    ox = frame["x"] + (frame["w"] - art.width) // 2
    oy = frame["y"] + (frame["h"] - art.height) // 2
    scr.paste(art, (ox, oy))
    path = OUT / "shots" / f"{e['id']}-event.png"
    scr.save(path)
    return path


def crop300(img, crop):
    fx, fy, fw, fh = crop
    W, H = img.size
    box = (round(fx * W), round(fy * H), round((fx + fw) * W), round((fy + fh) * H))
    c = img.crop(box)
    return c.resize((c.width * 3, c.height * 3), Image.NEAREST)


def sheet(subject, entries, results):
    rows = [e for e in entries if e["subject"] == subject and e["id"] in results]
    if not rows:
        return None
    ev = subject == "cm"
    cols = [680, 0, 980, 980] if not ev else [680, 0, 980]
    tiles = []
    for e in rows:
        img = results[e["id"]]["img"]
        crop = e.get("crop", [0.0, 0.5, 0.4, 0.4] if not ev else [0.3, 0.2, 0.4, 0.5])
        if e.get("baseline"):
            # shipped HD art: thumbnail at 1/3 (1/2 for events) and the crop at 100% (= screen scale, like a
            # 640-grid crop at 300%)
            fx, fy, fw, fh = crop
            W, H = img.size
            c3 = img.crop((round(fx * W), round(fy * H), round((fx + fw) * W), round((fy + fh) * H)))
            if ev:
                c3 = c3.resize((c3.width * 3 // 2, c3.height * 3 // 2), Image.NEAREST)
            img = img.resize((W // 3, H // 3) if not ev else (W // 2, H // 2), Image.LANCZOS)
        else:
            c3 = crop300(img, crop)
        tiles.append((e, img, c3))
    cols[1] = max(t[2].width for t in tiles) + 20
    row_h = max(max(540, t[2].height, t[1].height) for t in tiles) + 70
    Wsheet = sum(cols) + 20
    sh = Image.new("RGB", (Wsheet, row_h * len(tiles) + 60), BG)
    d = ImageDraw.Draw(sh)
    hs = hull_stats()
    d.text((20, 16), f"TIME TO LIVE · A1 pixel-art style study · {subject}    (Lamplighter hull: L {hs['L_mean']} "
           f"spread {hs['L_spread']} C95 {hs['C_p95']}; orphans = isolated pixels in flat surroundings, sky seams excluded)",
           fill=INK, font=font(26))
    for r, (e, img, c3) in enumerate(tiles):
        y = 60 + r * row_h
        info = results[e["id"]]["info"]
        w0, h0 = info.get("size", [img.width, img.height])
        b = info.get("band", {})
        band = f"mid band L {b.get('L_mean')} spread {b.get('L_spread')} C95 {b.get('C_p95')}" if b and not ev else ""
        label = (f"{e['id']}  ·  {e['recipe']}  ·  {w0}x{h0}  ·  {info['colors_used']} colours  ·  "
                 f"orphans {info['singletons_detail']}  ·  {band}  ·  {e.get('note', '')}")
        d.text((20, y + 8), label, fill=INK, font=font(20))
        x = 20
        sh.paste(img, (x, y + 44))
        x += cols[0]
        sh.paste(c3, (x, y + 44))
        d.text((x, y + 44 + c3.height + 4), "300% nearest", fill=DIM, font=font(14))
        x += cols[1]
        shots = results[e["id"]].get("shots", {})
        for view in (["relay", "combat"] if not ev else ["event"]):
            p = shots.get(view)
            if p and Path(p).exists():
                s = Image.open(p).convert("RGB").resize((960, 540), Image.LANCZOS)
                sh.paste(s, (x, y + 44))
                d.text((x, y + 44 + 542), f"in game: {view} (50%)", fill=DIM, font=font(14))
            x += 980
    path = OUT / f"{subject}.png"
    sh.save(path, optimize=True)
    return path


def parallax_sheet(entries):
    """R4: for entries processed with layers, the sky plane, the scene plane (on magenta) and the scene shifted
    -3 / 0 / +3 art px over the fixed sky, all at 1:1 art pixels x2."""
    rows = [e for e in entries if e.get("params", {}).get("layers") and (FINAL / f"{e['id']}-sky.png").exists()]
    if not rows:
        return None
    k = 2
    W, H = 640 * k, 360 * k
    sh = Image.new("RGB", (W * 3 + 80, (H + 50) * 2 * len(rows) + 60), BG)
    d = ImageDraw.Draw(sh)
    d.text((20, 16), "TIME TO LIVE · A1 · R4 parallax planes (sky plane fixed, scene plane shifted by whole art "
                     "pixels)", fill=INK, font=font(26))
    for r, e in enumerate(rows):
        y = 60 + r * (H + 50) * 2
        sky = Image.open(FINAL / f"{e['id']}-sky.png").convert("RGBA")
        sc = Image.open(FINAL / f"{e['id']}-scene.png").convert("RGBA")
        mag = Image.new("RGBA", sky.size, (255, 0, 255, 255))
        mag.alpha_composite(sc)
        tiles = [("sky plane", sky), ("scene plane (alpha on magenta)", mag)]
        for dx in (-3, 0, 3):
            c = sky.copy()
            s2 = Image.new("RGBA", sky.size)
            s2.paste(sc, (dx, 0))
            c.alpha_composite(s2)
            tiles.append((f"scene {dx:+d} px", c))
        for i, (label, im) in enumerate(tiles):
            cx = 20 + (i % 3) * (W + 20)
            cy = y + (i // 3) * (H + 50)
            sh.paste(im.convert("RGB").resize((W, H), Image.NEAREST), (cx, cy + 30))
            d.text((cx, cy + 4), f"{e['id']} · {label}", fill=INK, font=font(20))
    path = OUT / "r4-parallax.png"
    sh.save(path, optimize=True)
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--no-shots", action="store_true")
    ap.add_argument("--url", default="http://127.0.0.1:5181")
    a = ap.parse_args()
    entries = json.loads((ART / "study.json").read_text())
    results = {}
    for e in entries:
        if a.only and e["id"] not in a.only and e["subject"] not in a.only:
            # reuse the processed image for the sheet
            p = FINAL / f"{e['id']}.png"
            if p.exists():
                results[e["id"]] = {"img": Image.open(p).convert("RGB"),
                                    "info": json.loads(p.with_suffix(".json").read_text()),
                                    "shots": {v: OUT / "shots" / f"{e['id']}-{v}.png" for v in ("relay", "combat", "event")}}
            continue
        if not (ROOT / e["src"] if e.get("baseline") else ART / e["src"]).exists():
            print(f"{e['id']}: source not rendered yet ({e['src']}), skipped", flush=True)
            continue
        img, info = process(e)
        res = {"img": img, "info": info, "shots": {}}
        if not a.no_shots:
            res["shots"] = shoot(e, a.url)
        if e["subject"] == "cm":
            p = event_composite(e, img)
            if p:
                res["shots"]["event"] = p
        else:
            res["shots"].update({v: OUT / "shots" / f"{e['id']}-{v}.png" for v in ("relay", "combat")
                                 if v not in res["shots"]})
        results[e["id"]] = res
        print(f"{e['id']}: {info['colors_used']} colours, orphans {info['singletons_detail']}, "
              f"smooth {info['smooth_share']}", flush=True)
    for subject in sorted({e["subject"] for e in entries}):
        p = sheet(subject, entries, results)
        if p:
            print("sheet", p.relative_to(ROOT))
    p = parallax_sheet(entries)
    if p:
        print("sheet", p.relative_to(ROOT))


if __name__ == "__main__":
    main()
