"""Shared SFX helpers (numpy/scipy; run with faultline/.work/sfx/.venv/bin/python, read-only use).

Everything works at 48 kHz stereo float. Stable Audio takes (44.1 kHz) are resampled on load.
Loudness: K-weighted (BS.1770 pre-filter) momentary loudness over a 100 ms sliding window; a cue's level is the max of
that curve ("peak momentary loudness", dB LKFS-like). Loops use the mean momentary loudness instead."""
from pathlib import Path
import json
import numpy as np
import soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt, lfilter

HERE = Path(__file__).resolve().parent
EL = HERE / "el"
SR = 48000
PEAK = 10 ** (-3.05 / 20)          # delivery ceiling: peaks <= -3 dBFS


# ------------------------------------------------------------------------------------------------ io
def load_take(rel):
    x, sr = sf.read(HERE / rel, dtype="float64", always_2d=True)
    if sr != SR:
        x = resample_poly(x, 160, 147, axis=0) if sr == 44100 else resample_poly(x, SR, sr, axis=0)
    if x.shape[1] == 1:
        x = np.repeat(x, 2, 1)
    return x


def mono(x):
    return x.mean(1) if x.ndim == 2 else x


def stereo(x):
    return np.stack([x, x], 1) if x.ndim == 1 else x


# ------------------------------------------------------------------------------------------------ analysis
def env_db(m, hop=0.005, win=0.01):
    h, w = int(SR * hop), int(SR * win)
    p = np.concatenate([m ** 2, np.zeros(w)])
    c = np.concatenate([[0.0], np.cumsum(p)])
    n = max(1, len(m) // h)
    idx = np.arange(n) * h
    return 10 * np.log10((c[idx + w] - c[idx]) / w + 1e-14)


def kweight(x):
    """BS.1770 K-weighting at 48 kHz (shelf + RLB high-pass), per channel."""
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)


def momentary(x, win=0.1, hop=0.01):
    k = kweight(stereo(x))
    p = (k ** 2).sum(1)
    w, h = int(SR * win), int(SR * hop)
    if len(p) < w:
        p = np.concatenate([p, np.zeros(w - len(p))])
    c = np.concatenate([[0.0], np.cumsum(p)])
    idx = np.arange(0, len(p) - w + 1, h)
    return -0.691 + 10 * np.log10((c[idx + w] - c[idx]) / w + 1e-14)


def peak_loudness(x):
    return float(momentary(x).max())


def mean_loudness(x):
    ml = momentary(x, win=0.4, hop=0.1)
    e = 10 ** (ml / 10)
    return float(10 * np.log10(e.mean() + 1e-14))


# ------------------------------------------------------------------------------------------------ crop
def crop_hit(x, max_s, lead_in, gap, floor=-42):
    """faultline .work/sfx/master.py crop: anchor on the loudest moment, start at the first onset within lead_in
    before it, end at the first `gap` s of quiet after the peak (a second, unrelated event is never kept)."""
    m = mono(x)
    env = env_db(m)
    env = env - env.max()
    step = 0.005
    peak = int(np.argmax(env))
    lead = max(0, peak - int(lead_in / step))
    onset = lead + int(np.argmax(env[lead:peak + 1] > -26))
    start = max(0, int(onset * step * SR) - int(SR * 0.006))
    limit = min(len(m), start + int(SR * max_s))
    s0 = start // int(step * SR)
    window = env[s0: limit // int(step * SR)]
    quiet = window < floor
    run, need = 0, int(gap / step)
    for i in range(peak - s0, len(window)):
        run = run + 1 if quiet[i] else 0
        if run >= need:
            window = window[: i - run + 1]
            limit = start + int(len(window) * step * SR)
            break
    loud = np.nonzero(window > floor + 2)[0]
    end = min(limit, start + int((loud[-1] + 1) * step * SR) + int(SR * 0.03)) if len(loud) else limit
    truncated = bool(end >= limit and window[-int(0.05 / step):].max() > -30)
    y = x[start:end].copy()
    fi = int(SR * 0.002)
    y[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = min(len(y) // 3, int(SR * (0.12 if truncated else 0.03)))
    y[-fo:] *= (np.linspace(1, 0, fo) ** 2)[:, None]
    floor_db = float(np.percentile(env_db(mono(y)) - env.max(), 15)) if len(y) > SR * 0.02 else 0.0
    return y, dict(start=round(start / SR, 3), seconds=round(len(y) / SR, 3), truncated=truncated,
                   floorDb=round(floor_db, 1))


def crop_bed(x, trim=0.35, keep=None):
    """A steady stretch of a bed: drop `trim` s at both ends (the model's fades), keep up to `keep` s from the steadiest
    region. Returns the crop and its steadiness (std of 100 ms levels in dB, lower = steadier)."""
    a, b = int(SR * trim), len(x) - int(SR * trim)
    y = x[a:b]
    lv = env_db(mono(y), hop=0.1, win=0.1)
    if keep and len(y) > SR * keep:
        n = int(keep / 0.1)
        best, bi = 1e9, 0
        for i in range(0, len(lv) - n + 1):
            s = float(np.std(lv[i:i + n])) - 0.02 * float(np.mean(lv[i:i + n]))
            if s < best:
                best, bi = s, i
        y = y[int(bi * 0.1 * SR): int(bi * 0.1 * SR) + int(keep * SR)]
        lv = lv[bi:bi + n]
    return y.copy(), float(np.std(lv))


# ------------------------------------------------------------------------------------------------ processing
def bandpass(x, lo=None, hi=None, order=2):
    if lo:
        x = sosfilt(butter(order, lo, btype="highpass", fs=SR, output="sos"), x, axis=0)
    if hi:
        x = sosfilt(butter(order, hi, btype="lowpass", fs=SR, output="sos"), x, axis=0)
    return x


def varispeed(x, speed):
    if abs(speed - 1) < 1e-3:
        return x
    up, down = 1000, int(round(1000 * speed))
    return resample_poly(x, up, down, axis=0)


def fade(x, fin=0.002, fout=0.03, curve=2.0):
    x = x.copy()
    a = min(len(x) // 2, int(SR * fin))
    b = min(len(x) // 2, int(SR * fout))
    if a:
        x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim == 2 else np.linspace(0, 1, a)
    if b:
        r = np.linspace(1, 0, b) ** curve
        x[-b:] *= r[:, None] if x.ndim == 2 else r
    return x


def pan(x, p):
    """Constant-power pan of a mono or stereo signal; p in [-1, 1]."""
    m = mono(x) if x.ndim == 2 else x
    a = (p + 1) * np.pi / 4
    return np.stack([m * np.cos(a), m * np.sin(a)], 1) * np.sqrt(2)


def reflections(x, tail=0.25, amount=0.19, seed=0):
    """Small deterministic room (faultline build_effects.py style): 14 asymmetric filtered reflections."""
    x = stereo(x)
    dry = mono(x)
    out = np.zeros((len(x) + int(tail * SR), 2))
    out[:len(x)] = x
    for i in range(1, 15):
        for ch in range(2):
            d = int(SR * tail * (i / 16 + ch * 0.009))
            refl = sosfilt(butter(1, max(800, 6500 - i * 370), fs=SR, output="sos"), dry)
            out[d:d + len(x), ch] += refl * (amount * np.exp(-i * 0.27))
    return out


def soft_limit(x, ceiling=PEAK):
    knee = ceiling * 0.55
    mag = np.abs(x)
    over = mag > knee
    y = x.copy()
    y[over] = np.sign(x[over]) * (knee + (ceiling - knee) * np.tanh((mag[over] - knee) / (ceiling - knee)))
    return y


def master(x, target, drive=0.0, loop=False, hp=35, lp=16000):
    """Band-limit, set the level to `target` (peak momentary loudness; loops: mean loudness), keep peaks <= -3 dBFS
    (soft knee when `drive` dB of extra level is allowed; otherwise a plain gain reduction)."""
    x = stereo(x)
    if loop:                               # circular filtering: the file's start must continue its own end
        n = len(x)
        x = bandpass(np.concatenate([x, x, x]), hp, lp)[n:2 * n]
    else:
        x = bandpass(x, hp, lp)
    level = mean_loudness(x) if loop else peak_loudness(x)
    gain = 10 ** ((target - level) / 20)
    ceiling_gain = PEAK / max(np.abs(x).max(), 1e-9)
    if gain <= ceiling_gain or drive <= 0:
        y = x * min(gain, ceiling_gain)
    else:
        y = soft_limit(x * min(gain, ceiling_gain * 10 ** (drive / 20)))
    y = np.clip(y, -PEAK, PEAK)
    return y


def loopable(x, xf=0.4):
    """Make a bed loop seamlessly: the last `xf` s are crossfaded (equal power) into the first `xf` s, and the result
    starts after that crossfade region, so the file's end flows exactly into its start."""
    n = int(SR * xf)
    x = stereo(x)
    body = x[n:].copy()
    t = np.linspace(0, np.pi / 2, n)[:, None]
    body[-n:] = body[-n:] * np.cos(t) + x[:n] * np.sin(t)
    return body


def write_ogg(path, x, q=5):
    """48 kHz stereo Vorbis via ffmpeg (float WAV in a temp file)."""
    import subprocess, tempfile
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        sf.write(f"{d}/in.wav", stereo(x).astype(np.float32), SR, subtype="FLOAT")
        subprocess.run([FFMPEG, "-v", "error", "-y", "-i", f"{d}/in.wav", "-map_metadata", "-1", "-c:a", "libvorbis",
                        "-q:a", str(q), "-ar", str(SR), str(path)], check=True)


FFMPEG = "/home/clab/projects/clab/faultline/.venv-score/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2"


def decode(path):
    import subprocess, tempfile
    with tempfile.TemporaryDirectory() as d:
        subprocess.run([FFMPEG, "-v", "error", "-y", "-i", str(path), "-c:a", "pcm_f32le", f"{d}/o.wav"], check=True)
        y, sr = sf.read(f"{d}/o.wav", dtype="float64", always_2d=True)
    return y, sr
