"""Regenerate the picks section of audio-src/README.md (between <!-- PICKS:BEGIN --> and <!-- PICKS:END -->) from
public/audio/music.json, music/work/<piece>/{master,eval,sync}.json, the Whisper results and sfx/manifest.json.
  python3 audio-src/report.py"""
import hashlib, json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
WORK = HERE / "music" / "work"


def load(p, d=None):
    p = Path(p)
    return json.loads(p.read_text()) if p.exists() else d


def mmss(s):
    return f"{int(s // 60)}:{s % 60:04.1f}"


def speech_verdict(delivery):
    stem = Path(delivery).stem
    f = WORK / "speech" / f"{stem}.medium-novad.json"
    d = load(f)
    if d is None:
        return "pending"
    if d.get('audio_sha256'):
        with (ROOT / delivery).open('rb') as audio:
            if hashlib.file_digest(audio,'sha256').hexdigest() != d['audio_sha256']:
                return 'pending'
    elif f.stat().st_mtime < (ROOT / delivery).stat().st_mtime:
        return 'pending'
    hits = [r for r in d["segments"] if r["speech"]]
    return "clean" if not hits else f"WORDS: {hits[0]['text'][:40]}"


def main():
    music = load(ROOT / "public/audio/music.json", {})
    out = ["## Music: what was delivered and why", "",
           "| id | files | length | loop (s) | bars @ BPM, score key | gain | Whisper (no VAD) |", "|---|---|---|---|---|---|---|"]
    for pid, e in music.items():
        m = load(WORK / pid / "master.json", {})
        files = ", ".join(f"`{Path(f).name}`" for k, f in e["files"].items() if not (pid == "event-horizon" and k == "main"))
        sp = "; ".join(f"{v}: {speech_verdict(r['delivery'])}" for v, r in m.get("versions", {}).items())
        out.append(f"| `{pid}` | {files} | {mmss(e['duration'])} | {e['loopStart']:.2f}–{e['loopEnd']:.2f}"
                   f"{'' if e['loop'] else ' (no loop)'} | {e['bars']} @ {e['bpm']}, {e['key']} | {e['gainDb']:+.1f} dB | {sp} |")
    out += [""]
    for pid, e in music.items():
        m = load(WORK / pid / "master.json", {})
        ev = {r["take"]: r for r in load(WORK / pid / "eval.json", [])}
        sync = load(WORK / pid / "sync.json", {})
        out.append(f"### `{pid}`")
        if m.get("note"):
            out.append(f"Why: {m['note']}")
        for v, r in m.get("versions", {}).items():
            er = ev.get(f"{v}/{r['take']}", {})
            c = r["conform"]
            out.append(f"- **{v}** = take `{r['take']}` (seed {r['seed']}): CLAP cinematic {er.get('cinematic')} "
                       f"(min {er.get('cinematic_min')}), vocal max {er.get('vocal_max')}, FTL-likeness {er.get('ftl')}; "
                       f"conform rate {c['rate_min']}–{c['rate_max']} (≤ {c['max_cents']} cents), output grid phase "
                       f"{c['verify']['grid_phase_ms']} ms; delivered {r['delivered']['lufs']:.1f} LUFS, "
                       f"{r['delivered']['tp']:.1f} dBTP, LRA {r['delivered']['lra']:.1f}.")
            if r.get("layer_trim_db"):
                out.append(f"  Calm-layer attenuation before the shared delivery gain: {r['layer_trim_db']:.2f} dB.")
            if c.get("phase_correction_beats"):
                out.append(f"  Paired phase correction: {c['phase_correction_beats']:+g} source beats before conforming.")
            if er.get("reject"):
                out.append("  Automated flags retained: " + "; ".join(er["reject"]) + ".")
            if er.get('advisory'):
                out.append('  Listening-review indicators: ' + '; '.join(er['advisory']) + '.')
        for k, rows in sync.items():
            if k.startswith('_'):
                continue
            if not isinstance(rows, list):
                out.append(f"- Sync {k}: best offset {rows.get('best')} {rows.get('unit', 'beats')}; correlations {rows.get('scores')}.")
                continue
            good = [x for x in rows if x["corr"] >= 0.3]
            lags = [x["lag_ms"] for x in good]
            if lags:
                out.append(f"- Sync {k}: {len(good)}/{len(rows)} four-bar windows confident, lag median "
                           f"{sorted(lags)[len(lags) // 2]} ms, max |lag| {max(map(abs, lags))} ms.")
        chosen = {f"{v}/{r['take']}" for v, r in m.get("versions", {}).items()}
        others = [r for t, r in ev.items() if t not in chosen]
        if others:
            out.append("- Other takes: " + "; ".join(
                f"`{r['take']}` " + ("rejected (" + ", ".join(r["reject"]) + ")" if r["reject"] else
                                     f"ok, score {r['score']} (cinematic {r['cinematic']}, min {r['cinematic_min']})")
                for r in sorted(others, key=lambda r: r["take"])) + ".")
        out.append("")
    sfx = load(ROOT / "public/audio/sfx.json", {})
    man = load(HERE / "sfx" / "manifest.json", {})
    out += ["## SFX: what was delivered", "",
            "| id | variants | length | level (target) | loop | layers (variant 1) |", "|---|---|---|---|---|---|"]
    for cid, e in sfx.items():
        mm = man.get(cid, {})
        vs = mm.get("variants", [])
        if not vs:
            continue
        layers = ", ".join(sorted({l["element"] for l in vs[0]["layers"]})) or "synth only"
        out.append(f"| `{cid}` | {len(e['files'])} | {vs[0]['seconds']:.2f} s | {vs[0]['level_db']:.1f} ({mm['target_db']}) | "
                   f"{'yes' if e['loop'] else ''} | SA: {layers} + synth |" if layers != "synth only" else
                   f"| `{cid}` | {len(e['files'])} | {vs[0]['seconds']:.2f} s | {vs[0]['level_db']:.1f} ({mm['target_db']}) | "
                   f"{'yes' if e['loop'] else ''} | synth only |")
    readme = (HERE / "README.md").read_text()
    a, b = readme.index("<!-- PICKS:BEGIN -->"), readme.index("<!-- PICKS:END -->")
    readme = readme[:a] + "<!-- PICKS:BEGIN -->\n" + "\n".join(out) + "\n" + readme[b:]
    (HERE / "README.md").write_text(readme)
    print(f"README picks: {len(music)} pieces, {len(sfx)} cues")


if __name__ == "__main__":
    main()
