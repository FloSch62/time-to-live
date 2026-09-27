"""Master and deliver one piece from its picked, conformed takes:
  master.py <piece> <version>=<take> [<version>=<take> ...] [--note "why"]

- Lossless masters: audio-src/music/masters/<piece>-<version>.flac (48 kHz stereo 24-bit) = the conformed take with the
  piece's constant delivery gain applied (the take's own native recording stays in takes/<piece>/<version>/<take>/).
- Calm layers are attenuated when necessary: exploration sits at least 2.5 LU below battle; custody/emergency
  sit at least 4/2 LU below horizon. Then one gain for every version of a piece: the gain that brings the battle version (event-horizon: horizon) to -19 LUFS integrated, lowered if
  any version's true peak would pass -2 dBTP. No compression, limiting or EQ: constant gains only.
- Delivery: public/audio/music/<piece>-<version>.ogg (pairs/layers) or <piece>.ogg (singles), 48 kHz stereo Vorbis q5,
  re-measured after encoding (true peak <= -2 dBTP; the gain steps down and re-encodes if not).
- Every version has exactly the same sample count; loopStart/loopEnd are the conformed bar lines (plans.layout).
- public/audio/music.json gets the piece's entry; work/<piece>/master.json keeps the provenance."""
import hashlib, json, subprocess, sys, tempfile
from pathlib import Path
import numpy as np, soundfile as sf
from core import plans, load_json, save_json, loudness, WORK, ROOT, FF, SR, MUSIC

PUB = ROOT / "public" / "audio" / "music"
MASTERS = MUSIC / "masters"
MUSIC_JSON = ROOT / "public" / "audio" / "music.json"
TARGET, CEIL = -19.0, -2.0


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def encode(y, out):
    with tempfile.TemporaryDirectory() as d:
        sf.write(f"{d}/m.wav", y, SR, subtype="FLOAT")
        subprocess.run([FF, "-v", "error", "-y", "-i", f"{d}/m.wav", "-map_metadata", "-1", "-c:a", "libvorbis",
                        "-q:a", "5", "-ar", str(SR), str(out)], check=True)


def decode_len(path):
    with tempfile.TemporaryDirectory() as d:
        subprocess.run([FF, "-v", "error", "-y", "-i", str(path), "-c:a", "pcm_f32le", f"{d}/o.wav"], check=True)
        return sf.info(f"{d}/o.wav").frames


def main():
    global PUB, MASTERS, MUSIC_JSON
    pid = sys.argv[1]
    args = sys.argv[2:]
    preview = "--preview" in args
    if preview:
        args.remove("--preview")
        PUB = MUSIC / "previews"
        MASTERS = PUB / "lossless"
        MUSIC_JSON = PUB / "music.json"
    note = ""
    if "--note" in args:
        i = args.index("--note"); note = args[i + 1]; del args[i:i + 2]
    picks = dict(a.split("=") for a in args)
    P = plans.P[pid]
    assert set(picks) == set(P["versions"]), f"pick every version: {list(P['versions'])}"
    L = plans.layout(pid)
    audio, conf = {}, {}
    for v, t in picks.items():
        conf[v] = load_json(WORK / pid / f"{v}-{t}.conform.json")
        x, sr = sf.read(WORK / pid / f"{v}-{t}.wav", dtype="float32", always_2d=True)
        audio[v] = x
    n = {len(x) for x in audio.values()}
    assert len(n) == 1, f"versions differ in length: {n}"
    source_levels = {v: loudness(x) for v, x in audio.items()}
    lv = {v: dict(levels) for v, levels in source_levels.items()}
    # Generated calm takes can be louder than combat. Attenuate only, retaining dynamics and the shared grid.
    trims = {v: 0.0 for v in audio}
    reference = "battle" if "battle" in audio else "horizon" if "horizon" in audio else None
    if reference:
        for v, gap in {"explore": 2.5, "custody": 4.0, "emergency": 2.0}.items():
            if v not in audio: continue
            trims[v] = min(0.0, lv[reference]["lufs"] - gap - lv[v]["lufs"])
            audio[v] *= 10 ** (trims[v] / 20)
            lv[v]["lufs"] += trims[v]
            lv[v]["tp"] += trims[v]
    # the brief: the pair gain brings the BATTLE version to about -19 LUFS (event-horizon: the horizon layer)
    loudest = "battle" if "battle" in lv else "horizon" if "horizon" in lv else next(iter(lv))
    gain = TARGET - lv[loudest]["lufs"]
    gain = min(gain, min(CEIL - 0.3 - lv[v]["tp"] for v in lv))
    PUB.mkdir(parents=True, exist_ok=True)
    MASTERS.mkdir(parents=True, exist_ok=True)
    single = P["kind"] == "single"
    for attempt in range(6):
        out, ok = {}, True
        for v, x in audio.items():
            y = x * 10 ** (gain / 20)
            fname = f"{pid}.ogg" if single else f"{pid}-{v}.ogg"
            encode(y, PUB / fname)
            d = loudness(PUB / fname)
            out[v] = dict(file=fname, delivered=d)
            if d["tp"] > CEIL:
                ok = False
        if ok:
            break
        worst = max(o["delivered"]["tp"] for o in out.values())
        gain -= (worst - CEIL) + 0.1
    else:
        raise RuntimeError("true-peak check failed")
    versions = {}
    for v, x in audio.items():
        y = x * 10 ** (gain / 20)
        flac = MASTERS / (f"{pid}.flac" if single else f"{pid}-{v}.flac")
        sf.write(flac, y, SR, subtype="PCM_24")
        dl = decode_len(PUB / out[v]["file"])
        take_dir = MUSIC / "takes" / pid / v / picks[v]
        versions[v] = dict(take=picks[v], seed=json.loads((take_dir / "gen.json").read_text())["seed"],
                           source=str((take_dir / "audio.flac").relative_to(ROOT)), source_sha256=sha(take_dir / "audio.flac"),
                           conform=dict(rate_min=conf[v]["rate_min"], rate_max=conf[v]["rate_max"],
                                        seam=conf[v].get('seam'),
                                        phase_correction_beats=conf[v].get("phase_correction_beats", 0),
                                        max_cents=conf[v]["max_cents"], verify=conf[v]["verify"]),
                           master=str(flac.relative_to(ROOT)), master_sha256=sha(flac),
                           delivery=str((PUB / out[v]["file"]).relative_to(ROOT)), delivery_sha256=sha(PUB / out[v]["file"]),
                           bytes=(PUB / out[v]["file"]).stat().st_size, samples=len(x), decoded_samples=dl,
                           source_levels=source_levels[v], layer_trim_db=round(trims[v], 3),
                           pre_gain=lv[v], delivered=out[v]["delivered"])
    dur = len(next(iter(audio.values()))) / SR
    ls, le = L["loop"]
    entry = dict(files={("main" if single else v): f"audio/music/{out[v]['file']}" for v in picks},
                 bpm=P["bpm"], key=P["key"], bars=L["bars"], barSeconds=round(L["bar_s"], 6),
                 duration=round(dur, 6), loopStart=round(ls * L["bar_s"], 6), loopEnd=round(le * L["bar_s"], 6),
                 loop=L["loop_ok"], gainDb=round(gain, 2))
    if P.get('revision') == 'v4-new-composition':
        quiet = [b for b, _, label in L['sections'] if label == 'interlude']
        entry['revision'] = P['revision']
        entry['takes'] = dict(picks)
        entry['cues'] = {'theme': round(4 * L['bar_s'], 3)}
        if quiet:
            entry['cues'].update(contrast=round(min(quiet) * L['bar_s'], 3),
                                 **{'return': round((max(quiet) + 4) * L['bar_s'], 3)})
    if pid == "event-horizon":
        entry["files"]["main"] = entry["files"]["custody"]
    mj = load_json(MUSIC_JSON)
    mj[pid] = entry
    order = list(plans.P)
    MUSIC_JSON.write_text(json.dumps({k: mj[k] for k in order if k in mj}, indent=1) + "\n")
    save_json(WORK / pid / ("preview-master.json" if preview else "master.json"), dict(piece=pid, note=note, gain_db=round(gain, 3), loudest=loudest,
                                               target_lufs=TARGET, ceiling_dbtp=CEIL, layout=L, entry=entry,
                                               versions=versions))
    print(f"{pid}: gain {gain:+.2f} dB (from {loudest}), {dur:.3f}s, loop {entry['loopStart']:.3f}-{entry['loopEnd']:.3f}")
    for v, r in versions.items():
        print(f"   {v:9} {r['take']:4} pre {r['pre_gain']['lufs']:.1f} LUFS -> {r['delivered']['lufs']:.1f} LUFS, "
              f"tp {r['delivered']['tp']:.1f} dBTP, lra {r['delivered']['lra']:.1f}, samples {r['samples']} decoded {r['decoded_samples']}")


if __name__ == "__main__":
    main()
