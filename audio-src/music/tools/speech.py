# Adapted from faultline .work/lore/score/tools/speech.py (read-only there). Results: audio-src/music/work/speech/.
"""Find lexical speech / sung words in score files with faster-whisper.
Usage: speech.py [--model medium|large-v3] [--device cpu|cuda] [--novad] file ... -> prints segments, writes
<file>.speech.json next to each file (or tools/speech/<name>.json for raw takes).
A segment counts as SPEECH when it is confident: avg_logprob > -0.8, no_speech_prob < 0.5, >= 3 words, and a
compression ratio < 2.4 (loops of one word are the classic hallucination on music). Everything else is listed as
'weak' so choir vowels and hallucinations can be told apart by eye (and by the spectrogram)."""
import hashlib, json, os, re, sys, time
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "work" / "speech"
OUT.mkdir(parents=True, exist_ok=True)

# Whisper's subtitle-credit hallucinations on music (seen here: "Terima kasih telah menonton!", "We'll be right back.",
# "(c) transcript Emily Beynon"); these are not lyrics.
HALLU = re.compile(r"thank(s| you) for watching|terima kasih|menonton|transcript|subtitle|amara\.org|subscribe|"
                   r"right back|see you in the next|sous-titr|untertitel|in the comments|questions or other problems", re.I)


def lexical(seg):
    """Lexical words: confident, not a loop, several words, not a known hallucination; no_speech_prob < 0.6 unless
    the segment is long (music pushes no_speech up: the real French in h21 was 0.32; the hallucinated credits 0.73-0.81)."""
    words = seg["words"]
    wp = sum(w["p"] for w in words) / max(1, len(words))
    return bool(seg["avg_logprob"] > -0.8 and len(words) >= 3 and seg["comp"] < 2.4 and wp > 0.5
                and (seg["no_speech"] < 0.6 or len(words) >= 6) and not HALLU.search(seg["text"]))


if sys.argv[1:2] == ["--reverdict"]:                 # re-judge saved results without rerunning Whisper
    for f in sorted(OUT.glob("*.json")):
        d = json.loads(f.read_text())
        hits = [r for r in d["segments"] if lexical(r)]
        print(f"{'WORDS' if hits else 'clean'}  {f.name}" + "".join(f"\n    {r['start']:.1f}-{r['end']:.1f} ns {r['no_speech']} n{len(r['words'])}: {r['text'][:90]}" for r in hits))
    sys.exit()
from faster_whisper import WhisperModel

args = sys.argv[1:]
model_name, device, vad = "medium", "cpu", True
if "--model" in args:
    i = args.index("--model"); model_name = args[i + 1]; del args[i:i + 2]
if "--device" in args:
    i = args.index("--device"); device = args[i + 1]; del args[i:i + 2]
if "--novad" in args:
    args.remove("--novad"); vad = False
t0 = time.time()
model = WhisperModel(model_name, device=device, compute_type="int8" if device == "cpu" else "float16",
                     cpu_threads=int(os.environ.get('OMP_NUM_THREADS', '4')), local_files_only=True)
print(f"model {model_name} on {device} loaded in {time.time() - t0:.0f}s, vad={vad}", flush=True)
for f in args:
    p = Path(f)
    t0 = time.time()
    def run(word_ts):
        segs, info = model.transcribe(str(p), beam_size=5, word_timestamps=word_ts, vad_filter=vad,
                                      vad_parameters=dict(min_silence_duration_ms=500),
                                      condition_on_previous_text=False, multilingual=True, temperature=0.0)
        rows = []
        for s in segs:
            if word_ts:
                words = [dict(w=w.word, start=round(w.start, 2), end=round(w.end, 2), p=round(w.probability, 2)) for w in (s.words or [])]
            else:                                   # fallback: no per-word probabilities
                words = [dict(w=w, start=None, end=None, p=1.0) for w in s.text.split()]
            row = dict(start=round(s.start, 2), end=round(s.end, 2), text=s.text.strip(), avg_logprob=round(float(s.avg_logprob), 2),
                       no_speech=round(float(s.no_speech_prob), 2), comp=round(float(s.compression_ratio), 2),
                       lang=getattr(s, "language", None), words=words)
            row["speech"] = lexical(row)
            rows.append(row)
        return rows, info
    try:
        rows, info = run(True)
    except IndexError:                              # faster-whisper 1.2.1 alignment bug on an empty segment
        print(f"  (word timestamps failed on {p}; rerun without them)", flush=True)
        rows, info = run(False)
    name = "-".join(p.parts[-4:-1]) if p.stem == "audio" else p.stem
    tag = f"{model_name}{'' if vad else '-novad'}"
    with p.open('rb') as source:
        source_sha256 = hashlib.file_digest(source, 'sha256').hexdigest()
    (OUT / f"{name}.{tag}.json").write_text(json.dumps(dict(file=str(p), audio_sha256=source_sha256, language=info.language,
                                                             language_prob=round(info.language_probability, 2), segments=rows), indent=1))
    n_words = sum(len(r["words"]) for r in rows if r["speech"])
    verdict = "WORDS" if n_words else "clean"
    print(f"\n== {verdict}: {p}  ({time.time() - t0:.0f}s)  first-window language {info.language} {info.language_probability:.2f}  segments {len(rows)}", flush=True)
    for r in rows:
        mark = "SPEECH" if r["speech"] else "weak  "
        wp = sum(w["p"] for w in r["words"]) / max(1, len(r["words"]))
        print(f"  {mark} {r['start']:7.2f}-{r['end']:7.2f} [{r['lang']}] lp {r['avg_logprob']:5.2f} ns {r['no_speech']:.2f} "
              f"cr {r['comp']:.1f} wp {wp:.2f} n{len(r['words'])}: {r['text'][:110]}", flush=True)
