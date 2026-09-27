"""Crop and rank every Stable Audio element take (CPU): el/ranked.json.

Score = CLAP(prompt) + CLAP(element text) - 0.5 * max CLAP(unwanted) - attack penalty (hits: soft attacks read as mush)
- noise-floor penalty (hits) - unsteadiness penalty (beds, which become loops or tails). A pre-filter, as in faultline
.work/sfx/compose.py; build.py picks by rank index, and README.md lists what was picked.
  /home/clab/projects/clab/faultline/.work/sfx/.venv/bin/python audio-src/sfx/rank.py"""
import json
from pathlib import Path
import numpy as np
import torch
from transformers import ClapModel, ClapProcessor
import lib

torch.set_num_threads(12)
# element: (crop spec, CLAP text). hit spec = (max s, lead-in s, gap s); bed spec = ("bed", keep s)
CROP = {
    "elec_crack": ((0.5, 0.03, 0.10), "a short sharp electric spark crack"),
    "relay_clack": ((0.35, 0.03, 0.08), "a small relay clicking"),
    "heavy_zap": ((0.9, 0.03, 0.15), "a heavy electric discharge"),
    "arc_buzz": (("bed", 3.0), "a continuous electric arc buzzing"),
    "pneu_launch": ((1.3, 0.05, 0.20), "a missile launching from a tube"),
    "cannon": ((1.2, 0.03, 0.25), "a cannon shot"),
    "metal_clang": ((1.0, 0.03, 0.20), "a metal impact clang"),
    "metal_heavy": ((1.6, 0.03, 0.25), "a heavy metal crash"),
    "explosion": ((2.2, 0.05, 0.30), "an explosion"),
    "explosion_big": ((3.8, 0.05, 0.40), "a large explosion with a long rumble"),
    "debris": (("bed", 2.5), "metal debris rattling on the floor"),
    "powerdown": ((3.2, 0.40, 0.30), "a machine powering down"),
    "powerup": ((2.2, 0.60, 0.20), "a machine powering up"),
    "hum": (("bed", 6.0), "a steady low electric hum"),
    "fire": (("bed", 8.0), "fire crackling"),
    "air_rush": (("bed", 3.0), "air hissing out of a hole"),
    "metal_tear": ((1.0, 0.05, 0.20), "metal tearing"),
    "door_slide": ((1.0, 0.05, 0.15), "a sci-fi door sliding open"),
    "door_thud": ((0.9, 0.05, 0.15), "a door closing with a thud"),
    "ratchet": (("bed", 4.5), "a ratchet wrench and metal tapping"),
    "sparks": (("bed", 3.0), "welding sparks crackling"),
    "scuffle": ((1.2, 0.05, 0.20), "metal clanks of a scuffle"),
    "clamp": ((1.0, 0.05, 0.20), "a heavy clamp latching"),
    "whoosh": ((1.0, 0.30, 0.15), "a fast whoosh"),
    "coins": ((1.0, 0.03, 0.15), "coins clinking"),
    "scrap": ((1.0, 0.03, 0.15), "metal scraps clattering"),
    "squelch": ((1.2, 0.03, 0.15), "a radio squelch"),
    "glass_bell": ((5.5, 0.03, 0.50), "a glass bell ringing"),
    "lamp_buzz": ((1.5, 0.03, 0.20), "a relay click and an electric buzz"),
    "switch": ((0.6, 0.03, 0.10), "a heavy switch clunk"),
    "servo": ((0.8, 0.05, 0.12), "a small servo motor whir"),
    "slam_far": ((4.0, 0.05, 0.50), "a distant heavy metal door slam"),
    "air_brake": ((1.0, 0.05, 0.15), "a pneumatic hiss"),
    "cable_twang": ((1.6, 0.03, 0.25), "a steel cable twang"),
    "wheel_hiss": (("bed", 4.5), "wheels rolling fast on a cable"),
    "cable_brake": ((3.0, 0.30, 0.30), "a metal brake squealing on a cable"),
    "cable_creak": (("bed", 8.0), "a steel cable creaking"),
    "switchgear": ((1.0, 0.03, 0.15), "a heavy switch lever clunk"),
    "motor_spool": (("bed", 3.0), "an electric motor spinning up"),
    "chain": ((1.2, 0.05, 0.20), "a heavy chain rattling"),
    "latch_release": ((0.8, 0.03, 0.15), "a metal latch releasing"),
    "impact_wrench": ((1.2, 0.05, 0.20), "a pneumatic impact wrench"),
}
UNWANTED = ["music", "a person speaking", "a man talking", "background noise hiss", "cartoon sound effect"]


def crop(take):
    spec, _ = CROP[take["element"]]
    x = lib.load_take(take["file"])
    if spec[0] == "bed":
        y, steady = lib.crop_bed(x, keep=spec[1])
        return y, dict(seconds=round(len(y) / lib.SR, 3), steadyDb=round(steady, 2))
    y, info = lib.crop_hit(x, *spec)
    return y, info


def attack_ms(y):
    env = lib.env_db(lib.mono(y), hop=0.001, win=0.002)
    env -= env.max()
    peak = int(np.argmax(env))
    start = int(np.argmax(env[:peak + 1] > -26))
    return float(peak - start)


def main():
    takes = json.loads((lib.EL / "takes.json").read_text())
    model = ClapModel.from_pretrained("laion/clap-htsat-unfused").eval()
    proc = ClapProcessor.from_pretrained("laion/clap-htsat-unfused")
    texts = sorted({t["prompt"] for t in takes}) + sorted({c[1] for c in CROP.values()}) + UNWANTED
    with torch.no_grad():
        tf = model.get_text_features(**proc(text=texts, return_tensors="pt", padding=True))
    T = torch.nn.functional.normalize(tf, dim=-1)
    ix = {t: i for i, t in enumerate(texts)}
    ranked = {}
    for k, take in enumerate(takes):
        y, info = crop(take)
        take = dict(take, **info)
        m = lib.mono(y)
        m = m / (np.abs(m).max() + 1e-9) * 0.5
        with torch.no_grad():
            af = model.get_audio_features(**proc(audio=[m.astype(np.float32)], sampling_rate=48000, return_tensors="pt"))
        sim = (T @ torch.nn.functional.normalize(af, dim=-1)[0]).numpy()
        take["prompt_sim"] = round(float(sim[ix[take["prompt"]]]), 3)
        take["text_sim"] = round(float(sim[ix[CROP[take["element"]][1]]]), 3)
        take["unwanted"] = round(float(max(sim[ix[u]] for u in UNWANTED)), 3)
        score = take["prompt_sim"] + take["text_sim"] - 0.5 * take["unwanted"]
        take["kind"] = "bed" if CROP[take["element"]][0][0] == "bed" else "hit"
        if take["kind"] == "hit":
            take["attackMs"] = attack_ms(y)
            if take["element"] not in ("whoosh", "powerup", "powerdown", "glass_bell", "slam_far", "servo", "air_brake"):
                score -= 0.004 * max(0, take["attackMs"] - 12)
            if take["floorDb"] > -40:
                score -= 0.1
            if take["truncated"]:
                score -= 0.05
            if take["seconds"] < 0.04:
                score -= 1.0                                   # an empty crop
        else:
            score -= 0.03 * max(0, take["steadyDb"] - 2.5)
        take["score"] = round(score, 3)
        ranked.setdefault(take["element"], []).append(take)
        if k % 50 == 0:
            print(k, take["file"], take["score"], flush=True)
    for g in ranked.values():
        g.sort(key=lambda t: -t["score"])
    (lib.EL / "ranked.json").write_text(json.dumps(ranked, indent=1))
    for name, g in ranked.items():
        print(f"{name:13}", "  ".join(f"{Path(t['file']).stem}:{t['score']:.2f}/{t['seconds']:.2f}s" for t in g[:4]))


if __name__ == "__main__":
    main()
