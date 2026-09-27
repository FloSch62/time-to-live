#!/usr/bin/env python3
"""Promote a picked Krea candidate to a final pixel-art asset.

  python tools/art/finalize.py GROUP/ID CANDIDATE.png [--params '{"contrast":1.1}'] [--note "why"]

Pixelizes the candidate with the group recipe (tools/art/recipes.py) + overrides, writes public/art/<group>/<id>.png,
and records provenance in art-src/manifest.json (group -> id -> record: source candidate, prompt, seed, model and
sampler settings, pixelize parameters, extra colours, sha256). Ships also update public/art/ships/ships.json.
"""
import argparse
import datetime
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART_SRC = ROOT / "art-src"
PUBLIC = ROOT / "public" / "art"
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "art"))
from pixelize import pixelize  # noqa: E402
import recipes  # noqa: E402

OUT_DIR = {"ships": "ships", "cars": "ships/cars", "bg": "bg", "props": "props", "portraits": "portraits", "events": "events",
           "ending": "ending"}


def load_json(p, default):
    return json.loads(p.read_text()) if p.exists() else default


def finalize(key, cand, overrides=None, note=None, post=None):
    group, aid = key.split("/")
    cand = Path(cand)
    if not cand.is_absolute():
        cand = (ART_SRC / cand) if (ART_SRC / cand).exists() else (ROOT / cand)
    rec = load_json(cand.with_suffix(".json"), {})
    rec_for_params = dict(rec, group=group, id=aid)
    params = recipes.params_for(rec_for_params, overrides=overrides)
    size = tuple(rec.get("size") or [])
    if group in ("ships", "cars"):
        meta = json.loads((recipes.INIT / f"{aid}.json").read_text())
        size = tuple(meta["canvas"])
    with Image.open(cand) as im:
        out, info = pixelize(im, size, **params)
    if post:
        out = post(out)
    dest = PUBLIC / OUT_DIR[group] / f"{aid}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, optimize=True)
    sha = hashlib.sha256(dest.read_bytes()).hexdigest()

    man_path = ART_SRC / "manifest.json"
    man = load_json(man_path, {})
    gen = {k: rec.get(k) for k in ("version", "prompt", "seed", "width", "height", "strength", "shift", "denoise",
                                   "steps", "cfg", "sampler", "scheduler", "models", "comfyui_revision")
           if rec.get(k) is not None}
    if rec.get("refs"):
        gen["refs"] = [r["path"].replace(str(ROOT) + "/", "") for r in rec["refs"]]
    if rec.get("init"):
        gen["init"] = str(Path(rec["init"]).relative_to(ROOT))
        gen["mask"] = str(Path(rec["mask"]).relative_to(ROOT)) if rec.get("mask") else None
    record = {
        "file": str(dest.relative_to(ROOT / "public")),
        "size": list(out.size),
        "source": str(cand.relative_to(ROOT)),
        "engine": "local-krea-2-turbo (ComfyUI)",
        "generation": gen,
        "pixelize": {k: v for k, v in info["params"].items()},
        "extra_colors": info["extra_colors"],
        "colors_used": info["colors_used"],
        "sha256": sha,
        "date": datetime.date.today().isoformat(),
    }
    if note:
        record["note"] = note
    if "sil" in params:
        record["pixelize"]["sil"] = str(Path(params["sil"]).relative_to(ROOT))
    man.setdefault(group, {})[aid] = record
    man_path.write_text(json.dumps(man, indent=1, sort_keys=True) + "\n")

    if group in ("ships", "cars"):
        sj_path = PUBLIC / "ships" / "ships.json"
        sj = load_json(sj_path, {})
        entry = {"file": f"{OUT_DIR[group]}/{aid}.png", "w": out.width, "h": out.height, "class": meta.get("class"),
                 "face": meta["face"], "grid": meta["grid"]}
        for k in ("cable", "couplerRear", "couplerFront", "keelHang", "hangTop"):
            if meta.get(k):
                entry[k] = meta[k]
        entry.update(mounts=meta["mounts"], glow=meta["glow"])
        if meta.get("lampColors"):
            entry["lampColors"] = meta["lampColors"]
        sj[aid] = entry
        sj_path.write_text(json.dumps(dict(sorted(sj.items())), indent=1) + "\n")
    print(f"final {dest.relative_to(ROOT)}  {out.size}  colours {info['colors_used']}  extra {len(info['extra_colors'])}")
    return dest, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("key")
    ap.add_argument("cand")
    ap.add_argument("--params")
    ap.add_argument("--note")
    a = ap.parse_args()
    finalize(a.key, a.cand, json.loads(a.params) if a.params else None, a.note)


if __name__ == "__main__":
    main()
