"""CLAP pre-filter (laion/clap-htsat-unfused, CPU), adapted from faultline lore judge.py for the FTL-style brief:
  cinematic = retro-cinematic synth / orchestral game score   vs  techno = generic techno / EDM / club
  vocal     = singing, lyrics, chanting                        vs  instrumental
  ftl       = mean similarity to "retro synth space game soundtrack" descriptions (absolute cosine, for ranking)
per 10 s window (5 s hop); summarised per take and per plan section (bars from align.json).
Usage: judge.py <piece> [<version>/<take> ...] [--wav <file> ...]  -> work/<piece>/judge.json"""
import json, os, sys
import numpy as np, torch
from transformers import ClapModel, ClapProcessor
from core import plans, load, take_path, list_takes, load_json, save_json, WORK, SR

torch.set_num_threads(int(os.environ.get('OMP_NUM_THREADS', '4')))
MODEL = "laion/clap-htsat-unfused"
model = ClapModel.from_pretrained(MODEL, local_files_only=True).eval()
proc = ClapProcessor.from_pretrained(MODEL, local_files_only=True)
PROMPTS = {
    "cinematic": ["atmospheric retro synthesizer video game soundtrack with arpeggios and warm pads",
                  "cinematic orchestral film score with strings, piano and drums",
                  "melodic retro-futuristic space music with analog synths and a guitar melody"],
    "techno": ["techno track with a four on the floor kick drum", "EDM electronic dance music with a club beat and drops",
               "trance dance music with a pumping kick and supersaw leads"],
    "vocal": ["a person singing", "a singer singing lyrics", "vocal humming and chanting", "a choir singing words"],
    "instrumental": ["instrumental music with no vocals", "instrumental synthesizer music", "instrumental film score without singing"],
    "ftl": ["retro analog synthesizer space game soundtrack with arpeggios, pads and a melodic lead",
            "ambient sci-fi synth soundtrack for a starship strategy game"],
    "dark": ["dark melancholic ambient synthesizer music", "lonely mysterious deep space synth soundtrack",
             "sad slow minor-key music", "cold desolate 1980s sci-fi film synth score"],
    "happy": ["happy upbeat cheerful music", "bright uplifting joyful music", "playful feel-good major-key music",
              "heroic triumphant adventure music"],
    "score": ["dark retro synthesizer video game soundtrack", "1980s sci-fi film synth score",
              "cinematic dark ambient synth music", "tense dark synth battle music with drums"],
    "club": ["EDM club dance track with a four on the floor kick and a drop", "trance dance music with supersaw leads and a pumping kick",
             "upbeat house music", "pop dance song"],
    # mood composite (calibrated on references, see README): four dark-vs-bright pairs, averaged
    "m_sad": ["sad music"], "m_happy": ["happy music"],
    "m_ominous": ["ominous tense mysterious music"], "m_cheer": ["cheerful joyful playful music"],
    "m_lonely": ["lonely melancholic music"], "m_upl": ["optimistic uplifting music"],
    "intense": ["intense action battle music with driving drums", "epic combat soundtrack with pounding percussion",
                "fast urgent fight music"],
    "calm": ["calm ambient exploration music", "peaceful atmospheric soundtrack with soft pads",
             "gentle slow reflective music"],
}


@torch.no_grad()
def text_embed(texts):
    inputs = proc(text=texts, return_tensors="pt", padding=True)
    return torch.nn.functional.normalize(model.get_text_features(**inputs), dim=-1)


TEXT = {k: text_embed(v) for k, v in PROMPTS.items()}
SCALE = model.logit_scale_a.exp().item()


@torch.no_grad()
def audio_embed(chunks):
    out = []
    for i in range(0, len(chunks), 8):
        inputs = proc(audio=chunks[i:i + 8], sampling_rate=48000, return_tensors="pt")
        out.append(torch.nn.functional.normalize(model.get_audio_features(**inputs), dim=-1))
    return torch.cat(out)


def pair(a, x, y):
    lx, ly = (a @ TEXT[x].T).mean(1), (a @ TEXT[y].T).mean(1)
    return torch.sigmoid(SCALE * (lx - ly)).numpy()


def judge_audio(m, bar_s=None, bar0=0.0):
    n, h = int(10 * SR), int(5 * SR)
    starts = list(range(0, max(1, len(m) - n + 1), h))
    a = audio_embed([m[s:s + n] for s in starts])
    cine, voc = pair(a, "cinematic", "techno"), pair(a, "vocal", "instrumental")
    ftl = (a @ TEXT["ftl"].T).mean(1).numpy()
    inten = pair(a, "intense", "calm")
    dark = (pair(a, "dark", "happy") + pair(a, "m_sad", "m_happy") + pair(a, "m_ominous", "m_cheer")
            + pair(a, "m_lonely", "m_upl")) / 4
    score = pair(a, "score", "club")
    mids = np.array([(s + n / 2) / SR for s in starts])
    row = dict(cinematic=round(float(cine.mean()), 3), cinematic_min=round(float(cine.min()), 3),
               vocal_max=round(float(voc.max()), 3), vocal_mean=round(float(voc.mean()), 3),
               vocal_max_at=round(float(mids[int(np.argmax(voc))]), 1), ftl=round(float(ftl.mean()), 3),
               intense=round(float(inten.mean()), 3), dark=round(float(dark.mean()), 3), dark_min=round(float(dark.min()), 3),
               score=round(float(score.mean()), 3), score_min=round(float(score.min()), 3),
               windows=[dict(t=round(float(t), 1), cine=round(float(c), 2), vocal=round(float(v), 2), intense=round(float(i), 2),
                             dark=round(float(d), 2), score=round(float(sc), 2))
                        for t, c, v, i, d, sc in zip(mids, cine, voc, inten, dark, score)])
    return row


def main():
    pid = sys.argv[1]
    args = sys.argv[2:]
    out_path = WORK / pid / "judge.json"
    res = load_json(out_path)
    if "--wav" in args:
        i = args.index("--wav")
        files, args = args[i + 1:], args[:i]
        for f in files:
            import soundfile as sf
            x, sr = sf.read(f, dtype="float32", always_2d=True)
            r = judge_audio(x.mean(1))
            res["wav:" + f.split("/")[-1]] = r
            print(f"{f}: cine {r['cinematic']:.2f} (min {r['cinematic_min']:.2f}) vocal max {r['vocal_max']:.2f} "
                  f"@{r['vocal_max_at']}s ftl {r['ftl']:.3f} intense {r['intense']:.2f} DARK {r['dark']:.2f} "
                  f"(min {r['dark_min']:.2f}) score-not-club {r['score']:.2f} (min {r['score_min']:.2f})", flush=True)
    jobs = [tuple(a.split("/")) for a in args] or ([] if "--wav" in sys.argv else
                                                   [(v, t) for v in plans.P[pid]["versions"] for t in list_takes(pid, v)])
    for version, take in jobs:
        x, m = load(take_path(pid, version, take))
        r = judge_audio(m)
        res[f"{version}/{take}"] = r
        print(f"{pid}/{version}/{take}: cine {r['cinematic']:.2f} (min {r['cinematic_min']:.2f}) vocal max {r['vocal_max']:.2f} "
              f"@{r['vocal_max_at']}s mean {r['vocal_mean']:.2f} ftl {r['ftl']:.3f} intense {r['intense']:.2f} DARK {r['dark']:.2f} (min {r['dark_min']:.2f}) "
              f"score-not-club {r['score']:.2f} (min {r['score_min']:.2f})", flush=True)
    save_json(out_path, res)


if __name__ == "__main__":
    main()
