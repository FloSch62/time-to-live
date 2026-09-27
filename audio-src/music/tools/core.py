"""Shared numpy-only music analysis for TIME TO LIVE (runs in faultline/.venv-score, read-only use).
Adapted from faultline .work/lore/score/tools/common.py and dtw.py (generalised to any BPM and key)."""
import json, re, subprocess, sys, tempfile
from pathlib import Path
import numpy as np, soundfile as sf

MUSIC = Path(__file__).resolve().parents[1]           # audio-src/music
sys.path.insert(0, str(MUSIC))
import plans                                           # noqa: E402

ROOT = MUSIC.parents[1]
TAKES = MUSIC / "takes"
WORK = MUSIC / "work"
FF = "/home/clab/projects/clab/faultline/.venv-score/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2"
SR = 48000
PC = {"C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11,
      "C#": 1, "D#": 3, "G#": 8, "A#": 10, "E#": 5, "B#": 0, "Gb": 6, "Cb": 11}
MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
NOTE = re.compile(r"([=^_]*)([A-Ga-gz])([,']*)(\d*)")


def load(path):
    x, sr = sf.read(str(path), dtype="float32", always_2d=True)
    assert sr == SR, (path, sr)
    return x, x.mean(1)


def take_path(pid, version, take):
    return TAKES / pid / version / take / "audio.flac"


def list_takes(pid, version):
    d = TAKES / pid / version
    first = plans.P[pid].get("takes_from", 1)                  # earlier takes used a superseded form
    return sorted((p.name for p in d.iterdir() if (p / "audio.flac").exists() and int(p.name[1:]) >= first),
                  key=lambda s: int(s[1:])) if d.exists() else []


def env_db(m, hop=0.05, win=0.1):
    h, w = int(SR * hop), int(SR * win)
    p = np.concatenate([np.zeros(w // 2, np.float32), m.astype(np.float32) ** 2, np.zeros(w, np.float32)])
    c = np.concatenate([[0.0], np.cumsum(p, dtype=np.float64)])
    n = len(m) // h
    idx = np.arange(n) * h
    return 10 * np.log10((c[idx + w] - c[idx]) / w + 1e-10)


def onset_flux(m, hop=0.005, bands=((30, 200), (200, 2000), (2000, 12000))):
    """Band-wise positive spectral-energy flux (log), summed: an onset strength curve sampled every `hop` s."""
    n = 1024
    h = int(SR * hop)
    count = max(1, (len(m) - n) // h + 1)
    win = np.hanning(n).astype(np.float32)
    f = np.fft.rfftfreq(n, 1 / SR)
    out = np.zeros(count)
    prev = None
    E = np.zeros((count, len(bands)))
    for c0 in range(0, count, 2048):
        idx = np.arange(n)[None, :] + h * np.arange(c0, min(count, c0 + 2048))[:, None]
        P = np.abs(np.fft.rfft(m[np.clip(idx, 0, len(m) - 1)] * win, axis=1)) ** 2
        for k, (lo, hi) in enumerate(bands):
            E[c0:c0 + len(P), k] = np.log10(P[:, (f >= lo) & (f < hi)].sum(1) + 1e-9)
    d = np.maximum(0, np.diff(E, axis=0, prepend=E[:1]))
    out = d.sum(1)
    shift = int(round(n / 2 / h))                    # frame i centred at i*hop + n/2
    out = np.concatenate([np.zeros(shift), out])[:count]
    return out


def band_chroma(m, fr, lo, hi, n=8192):
    h = int(round(SR * fr))
    count = max(1, (len(m) - n) // h + 1)
    win = np.hanning(n).astype(np.float32)
    f = np.fft.rfftfreq(n, 1 / SR)
    band = (f > lo) & (f < hi)
    pcs = np.round(12 * np.log2(f[band] / 261.63)).astype(int) % 12
    out = np.zeros((count, 12))
    for c0 in range(0, count, 512):
        idx = np.arange(n)[None, :] + h * np.arange(c0, min(count, c0 + 512))[:, None]
        P = np.abs(np.fft.rfft(m[np.clip(idx, 0, len(m) - 1)] * win, axis=1))[:, band] ** 2
        for k in range(12):
            out[c0:c0 + len(P), k] = P[:, pcs == k].sum(1)
    shift = int(round(n / 2 / SR / fr))
    out = np.concatenate([np.repeat(out[:1], shift, 0), out])
    return out / (np.linalg.norm(out, axis=1, keepdims=True) + 1e-12)


def triad(ch):
    match = re.fullmatch(r'([A-G](?:#|b)?)(.*)', ch)
    if not match:
        raise ValueError(f'Unsupported chord: {ch}')
    root, quality = match.groups()
    minor = quality.startswith('m') and not quality.startswith('maj')
    r = PC[root]
    t = np.zeros(12)
    t[[r, (r + (3 if minor else 4)) % 12, (r + 7) % 12]] = [1, .8, .8]
    if '7' in quality:
        t[(r + (11 if 'maj7' in quality else 10)) % 12] = .5
    return t / np.linalg.norm(t)


def key_scores(cvec):
    s = {}
    for name, root in PC.items():
        s[name + "m"] = float(np.corrcoef(cvec, np.roll(MINOR, root))[0, 1])
        s[name] = float(np.corrcoef(cvec, np.roll(MAJOR, root))[0, 1])
    return s


def bars_from_abc(abc):
    """[(chord, ins bar)] from one of our generated scores (blocks of V: Vocal chord line + V: Ins bar line)."""
    out, chords = [], None
    lines = abc.splitlines()
    for i, line in enumerate(lines):
        if line.startswith("V: Vocal") and i + 1 < len(lines):
            chords = re.findall(r'"([^"]+)"z32', lines[i + 1])
        if line.startswith("V: Ins") and i + 1 < len(lines) and chords is not None:
            bars = [b.strip() for b in lines[i + 1].split("|") if b.strip()]
            out += list(zip(chords, bars))
            chords = None
    return out


def plan_roll(pid, version, step_units=2, abc=None):
    """Plan as a sixteenth-step piano roll: melody pitch class (held notes continue) and the bar's chord.
    abc: the take's own score.abc (so takes of an earlier plan revision are read against their own plan)."""
    keyacc = plans.KEYACC[plans.P[pid]["key"]]
    mel, chd, bar_of = [], [], []
    rows = bars_from_abc(abc) if abc else [(c, b) for c, b, *_r in plans.bars_of(pid, version)]
    for b, (ch, bar) in enumerate(rows):
        steps = [None] * (32 // step_units)
        pos = 0
        for acc, n, octv, ln in NOTE.findall(bar):
            ln = int(ln or 1)
            if n != "z":
                pc = PC[n.upper()] + (1 if acc == "^" else -1 if acc == "_" else 0 if acc == "=" else keyacc.get(n.upper(), 0))
                for s in range(pos // step_units, min(len(steps), (pos + ln + step_units - 1) // step_units)):
                    steps[s] = pc % 12
            pos += ln
        for s in steps:
            vec = np.zeros(12)
            if s is not None:
                vec[s] = 1
            mel.append(vec); chd.append(triad(ch)); bar_of.append(b)
    return np.array(mel), np.array(chd), np.array(bar_of)


def stretch(seg, ratio, tmpdir=None):
    """Rubberband time stretch (pitch kept) via the faultline static ffmpeg: output length ~ len(seg) * ratio."""
    if abs(ratio - 1) < 1e-5:
        return seg.copy()
    with tempfile.TemporaryDirectory(dir=tmpdir) as d:
        sf.write(f"{d}/in.wav", seg, SR, subtype="FLOAT")
        subprocess.run([FF, "-v", "error", "-y", "-i", f"{d}/in.wav", "-af",
                        f"rubberband=tempo={1 / ratio:.8f}:transients=mixed:detector=compound:phase=laminar:"
                        "window=standard:pitchq=quality:channels=together", "-ar", str(SR), "-c:a", "pcm_f32le",
                        f"{d}/out.wav"], check=True)
        y, _ = sf.read(f"{d}/out.wav", dtype="float32", always_2d=True)
    return y


def loudness(path_or_audio, filters=""):
    """ffmpeg loudnorm measurement pass: integrated LUFS, true peak dBTP, LRA."""
    if not isinstance(path_or_audio, (str, Path)):
        with tempfile.TemporaryDirectory() as d:
            sf.write(f"{d}/m.wav", path_or_audio, SR, subtype="FLOAT")
            return loudness(f"{d}/m.wav", filters)
    af = "loudnorm=I=-19:TP=-2:LRA=11:print_format=json"
    r = subprocess.run([FF, "-hide_banner", "-nostats", "-i", str(path_or_audio), "-af",
                        (filters + "," + af) if filters else af, "-f", "null", "-"], capture_output=True, text=True, check=True)
    v, _ = json.JSONDecoder().raw_decode(r.stderr[r.stderr.rindex("{"):])
    return dict(lufs=float(v["input_i"]), tp=float(v["input_tp"]), lra=float(v["input_lra"]))


def save_json(path, obj):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(obj, indent=1, default=float))


def load_json(path, default=None):
    p = Path(path)
    return json.loads(p.read_text()) if p.exists() else ({} if default is None else default)
