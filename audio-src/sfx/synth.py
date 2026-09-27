"""Deterministic synthesized SFX elements (numpy/scipy): crisp, punchy, slightly retro sci-fi, FTL-like.
Every function returns a float64 array at 48 kHz (mono 1-D or stereo N x 2), peak around 0.5-1.0 (build.py masters).
`v` is the variant index; variation comes from small deterministic pitch/time offsets."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve, lfilter
import lib

SR = lib.SR


# ------------------------------------------------------------------------------------------------ primitives
def t_(dur):
    return np.arange(int(round(dur * SR))) / SR


def curve(a, b, n, shape="exp"):
    """a -> b over n samples; exp (for frequencies) or lin."""
    if shape == "exp":
        return a * (b / a) ** np.linspace(0, 1, n)
    return np.linspace(a, b, n)


def phase_of(freq):
    return np.cumsum(freq / SR) % 1.0


def _blep(p, dt):
    out = np.zeros_like(p)
    m = p < dt
    x = p[m] / dt[m]
    out[m] = x + x - x * x - 1
    m = p > 1 - dt
    x = (p[m] - 1) / dt[m]
    out[m] = x * x + x + x + 1
    return out


def osc(freq, shape="sine", pw=0.5, ph0=0.0):
    freq = np.asarray(freq, dtype=float)
    p = (np.cumsum(freq / SR) + ph0) % 1.0
    dt = np.clip(freq / SR, 1e-6, 0.5)
    if shape == "sine":
        return np.sin(2 * np.pi * p)
    if shape == "saw":
        return 2 * p - 1 - _blep(p, dt)
    if shape == "square":
        sq = np.where(p < pw, 1.0, -1.0)
        return sq + _blep(p, dt) - _blep((p + 1 - pw) % 1.0, dt)
    if shape == "tri":
        return 2 * np.abs(2 * p - 1) - 1
    raise ValueError(shape)


def noise(n, seed=0, color="white"):
    r = np.random.default_rng(seed).standard_normal(n)
    if color == "pink":
        b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
        r = lfilter(b, a, r) * 4
    elif color == "brown":
        r = np.cumsum(r) * 0.02
        r -= lfilter([1], [1, -0.995], r) * 0.005
    return r


def env_exp(n, attack=0.002, decay=0.2, hold=0.0):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-5), 0, 1)
    d = np.where(t < attack + hold, 1.0, np.exp(-(t - attack - hold) / max(decay, 1e-5)))
    return a * d


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2, gate=None):
    t = np.arange(n) / SR
    gate = gate if gate is not None else n / SR - r
    e = np.where(t < a, t / a, np.where(t < a + d, 1 - (1 - s) * (t - a) / d, s))
    rel = t >= gate
    g0 = np.interp(gate, t, e) if gate < t[-1] else s
    e[rel] = g0 * np.clip(1 - (t[rel] - gate) / r, 0, 1) ** 2
    return e


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45), btype="lowpass", fs=SR, output="sos"), x, axis=0)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, btype="highpass", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR * 0.45)], btype="bandpass", fs=SR, output="sos"), x, axis=0)


def sweep_filter(x, fc, kind="lowpass", q=0.8, block=128):
    """Time-varying resonant biquad (RBJ), coefficients per block, state carried (DF2T)."""
    if x.ndim == 2:
        return np.stack([sweep_filter(x[:, c], fc, kind, q, block) for c in range(x.shape[1])], 1)
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape[:1])
    y = np.zeros_like(x)
    z = np.zeros(2)
    for i in range(0, len(x), block):
        f = float(np.clip(fc[i], 20, SR * 0.45))
        w = 2 * np.pi * f / SR
        alpha = np.sin(w) / (2 * q)
        cw = np.cos(w)
        if kind == "lowpass":
            b = np.array([(1 - cw) / 2, 1 - cw, (1 - cw) / 2])
        elif kind == "highpass":
            b = np.array([(1 + cw) / 2, -(1 + cw), (1 + cw) / 2])
        else:
            b = np.array([alpha, 0, -alpha])
        a = np.array([1 + alpha, -2 * cw, 1 - alpha])
        b, a = b / a[0], a / a[0]
        y[i:i + block], z = lfilter(b, a, x[i:i + block], zi=z)
    return y


def drive(x, amount=2.0):
    return np.tanh(x * amount) / np.tanh(amount)


def crush(x, bits=8, hold=2):
    q = 2 ** (bits - 1)
    y = np.round(x * q) / q
    if hold > 1:
        y = np.repeat(y[::hold], hold)[:len(x)]
    return y


def pad_to(x, n):
    if len(x) >= n:
        return x[:n]
    shape = (n - len(x),) + x.shape[1:]
    return np.concatenate([x, np.zeros(shape)])


def mix(*parts):
    """parts: (signal, offset seconds, gain); mono and stereo mixed to stereo."""
    n = max(int(round(off * SR)) + len(s) for s, off, _ in parts)
    out = np.zeros((n, 2))
    for s, off, g in parts:
        o = int(round(off * SR))
        s = lib.stereo(s).copy()
        k = min(len(s) // 4, int(0.012 * SR))            # every layer ends on a short fade: no truncation clicks
        if k > 1:
            s[-k:] *= (np.linspace(1, 0, k) ** 2)[:, None]
        out[o:o + len(s)] += s * g
    return out


def reverb(x, rt=1.2, wet=0.25, damp=5000, seed=7, pre=0.012):
    """Convolution with a synthetic decaying-noise IR (decorrelated stereo), darker as it decays."""
    x = lib.stereo(x)
    n = int(SR * rt * 1.2)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    for ch in range(2):
        r = noise(n, seed + ch)
        r = lp(r, damp) * np.exp(-6.9 * t / rt)
        late = lp(r, damp * 0.35)
        mixc = np.clip(t / rt, 0, 1)[:, None][:, 0]
        ir[:, ch] = (1 - mixc) * r + mixc * late
    ir[: int(SR * 0.01)] *= np.linspace(0, 1, int(SR * 0.01))[:, None]
    ir = np.concatenate([np.zeros((int(SR * pre), 2)), ir])
    ir /= np.sqrt((ir ** 2).sum(0, keepdims=True)) + 1e-9
    wetsig = np.stack([fftconvolve(x[:, c], ir[:, c]) for c in range(2)], 1)
    out = np.zeros((len(wetsig), 2))
    out[:len(x)] += x * (1 - wet * 0.5)
    out += wetsig * wet
    return out


def bell(freq, dur=2.0, bright=1.0, seed=0):
    """Glass/metal bell: inharmonic partials with individual decays."""
    t = t_(dur)
    ratios = [1.0, 2.0, 2.76, 4.07, 5.43, 6.8]
    amps = [1.0, 0.55, 0.42 * bright, 0.28 * bright, 0.16 * bright, 0.09 * bright]
    decs = [dur * 0.55, dur * 0.35, dur * 0.25, dur * 0.16, dur * 0.1, dur * 0.07]
    rng = np.random.default_rng(seed)
    y = np.zeros(len(t))
    for r, a, d in zip(ratios, amps, decs):
        f = freq * r * (1 + rng.uniform(-0.002, 0.002))
        y += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
    y *= np.clip(t / 0.002, 0, 1)
    return y


def pluck(freq, dur=0.5, bright=0.6):
    t = t_(dur)
    y = osc(np.full(len(t), freq), "saw") * 0.6 + osc(np.full(len(t), freq * 2.0), "square", 0.3) * 0.2
    y = sweep_filter(y, freq * (1.5 + 18 * bright * np.exp(-t / 0.07)), "lowpass", 0.9)
    return y * env_exp(len(t), 0.002, dur * 0.35)


def blip(f0, f1, dur, shape="square", pw=0.5, cut=6000):
    n = int(SR * dur)
    y = osc(curve(f0, f1, n), shape, pw)
    y = lp(y, cut)
    return y * env_exp(n, 0.0015, dur * 0.45, hold=dur * 0.25)


def click(dur=0.004, seed=0, hi=2500):
    n = int(SR * dur)
    return hp(noise(n, seed), hi) * np.linspace(1, 0, n) ** 2


# ------------------------------------------------------------------------------------------------ weapons
def laser(v=0, heavy=False):
    """FTL-style laser: square/saw zap with a fast exponential pitch drop, a sine thump, a noise snap."""
    j = [1.0, 1.06, 0.94][v % 3]
    if not heavy:
        dur = 0.34
        n = int(SR * dur)
        f = curve(2100 * j, 230 * j, n)
        f = np.where(np.arange(n) < n * 0.55, f, f[int(n * 0.55)] * (np.maximum(np.arange(n), 1) / (n * 0.55)) ** -0.2)
        body = 0.55 * osc(f, "square", 0.35) + 0.45 * osc(f * 1.007, "saw")
        body = sweep_filter(body, np.clip(f * 3.2, 400, 11000), "lowpass", 1.4)
        body *= env_exp(n, 0.001, 0.09, hold=0.02)
        thump = osc(curve(210, 70, n), "sine") * env_exp(n, 0.001, 0.05) * 0.8
        snap = bp(noise(n, 11 + v), 2500, 9000) * env_exp(n, 0.0005, 0.012) * 0.8
        y = drive(body * 0.9 + thump + snap, 1.6)
    else:
        dur = 0.55
        n = int(SR * dur)
        f = curve(1250 * j, 110 * j, n)
        body = (osc(f, "saw") + osc(f * 1.012, "saw") + 0.6 * osc(f * 0.5, "square", 0.4)) / 2.4
        body = sweep_filter(body, np.clip(f * 4, 300, 9000), "lowpass", 1.6)
        body *= env_exp(n, 0.001, 0.16, hold=0.03)
        thump = osc(curve(160, 42, n), "sine") * env_exp(n, 0.001, 0.12) * 1.1
        snap = bp(noise(n, 21 + v), 1800, 8000) * env_exp(n, 0.0005, 0.02)
        y = drive(body + thump + 0.7 * snap, 2.2)
    return y


def ion(v=0):
    """Ion blaster: a wobbling blue-ish tone that rises then falls, with a fizzing shimmer."""
    dur = 0.62
    n = int(SR * dur)
    t = np.arange(n) / SR
    j = [1.0, 1.08][v % 2]
    f = (520 + 380 * np.exp(-t / 0.05)) * j * (1 + 0.08 * np.sin(2 * np.pi * 34 * t))
    core = osc(f, "tri") * 0.7 + osc(f * 2.01, "sine") * 0.35 + osc(f * 3.0, "sine") * 0.15
    core *= env_exp(n, 0.004, 0.18, hold=0.05)
    fizz = bp(noise(n, 31 + v), 3000, 11000) * (0.5 + 0.5 * np.sin(2 * np.pi * 61 * t)) * env_exp(n, 0.002, 0.14) * 0.5
    zap = osc(curve(3000, 700, n), "square", 0.2) * env_exp(n, 0.0005, 0.02) * 0.3
    return drive(core + fizz + zap, 1.3)


def beam(v=0, dur=1.35):
    """Beam: a sustained, detuned buzzing chord with a bright whine; the attack snaps, the tail pinches off."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    base = [110, 116.5][v % 2]
    vib = 1 + 0.006 * np.sin(2 * np.pi * 7 * t)
    y = sum(osc(np.full(n, base * r) * vib * (1 + d), "saw") for r, d in [(1, 0), (1, 0.009), (2, -0.004), (3, 0.006)]) / 3
    y = sweep_filter(y, 900 + 5000 * np.clip(t / 0.15, 0, 1) * (1 - 0.3 * np.clip((t - 0.9) / 0.4, 0, 1)), "lowpass", 2.0)
    whine = osc(np.full(n, 1760) * (1 + 0.01 * np.sin(2 * np.pi * 9 * t)), "sine") * 0.18
    crackle = bp(noise(n, 41 + v), 2000, 9000) * (np.random.default_rng(5 + v).random(n) > 0.995) * 3.0
    crackle = lp(crackle, 8000)
    e = env_adsr(n, 0.008, 0.08, 0.75, 0.28)
    snap = bp(noise(n, 43), 1500, 9000) * env_exp(n, 0.0005, 0.02)
    return drive((y + whine + 0.25 * crackle) * e + 0.6 * snap, 1.8)


def sub_thump(f0=90, f1=40, dur=0.35, decay=0.12):
    n = int(SR * dur)
    return osc(curve(f0, f1, n), "sine") * env_exp(n, 0.001, decay)


def whoosh(dur=0.6, f0=600, f1=4000, seed=0, q=1.2, peak_at=0.6):
    n = int(SR * dur)
    t = np.arange(n) / SR
    y = sweep_filter(noise(n, seed), curve(f0, f1, n), "bandpass", q)
    e = np.where(t < dur * peak_at, (t / (dur * peak_at)) ** 2, np.exp(-(t - dur * peak_at) / (dur * 0.15)))
    return y * e * 3


def miss(v=0):
    """A projectile passing: falling pitch (doppler) plus a band-passed air sweep panned across."""
    dur = 0.55
    n = int(SR * dur)
    t = np.arange(n) / SR
    j = [1.0, 0.9][v % 2]
    tone = osc(curve(1500 * j, 520 * j, n), "tri") * np.exp(-((t - 0.2) / 0.12) ** 2) * 0.5
    air = sweep_filter(noise(n, 51 + v), curve(4500, 900, n), "bandpass", 1.5) * np.exp(-((t - 0.22) / 0.1) ** 2) * 3
    y = tone + air
    p = np.linspace(-0.8, 0.8, n) * (1 if v % 2 == 0 else -1)
    a = (p + 1) * np.pi / 4
    return np.stack([y * np.cos(a), y * np.sin(a)], 1) * np.sqrt(2)


# ------------------------------------------------------------------------------------------------ shields, ion, energy
def shield_ripple(v=0, dur=0.45):
    n = int(SR * dur)
    t = np.arange(n) / SR
    j = [1.0, 1.12, 0.9][v % 3]
    f = 330 * j * (1 + 0.5 * np.sin(2 * np.pi * 38 * t) * np.exp(-t / 0.15))
    y = osc(f, "sine") * 0.6 + osc(f * 2.5, "tri") * 0.25
    y *= env_exp(n, 0.001, 0.12)
    sh = bp(noise(n, 61 + v), 2500, 9000) * env_exp(n, 0.0008, 0.05) * 0.9
    return drive(y + sh, 1.4)


def shield_sweep(up=True, dur=0.75):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = curve(300, 900, n) if up else curve(900, 180, n)
    y = sum(osc(f * r * (1 + 0.004 * k), "sine") * a for k, (r, a) in enumerate([(1, 0.6), (1.5, 0.3), (2, 0.25), (3, 0.1)]))
    y *= (1 + 0.35 * np.sin(2 * np.pi * (14 if up else 9) * t))
    sh = sweep_filter(noise(n, 71), curve(1500, 8000, n) if up else curve(7000, 900, n), "bandpass", 1.0) * 0.8
    e = env_adsr(n, 0.02 if up else 0.004, 0.1, 0.8, 0.3) if up else env_exp(n, 0.004, 0.3)
    return (y + sh) * e


def ion_crackle(v=0, dur=0.6):
    n = int(SR * dur)
    t = np.arange(n) / SR
    rng = np.random.default_rng(81 + v)
    spikes = (rng.random(n) > 0.985) * rng.standard_normal(n) * 4
    y = bp(spikes + 0.3 * noise(n, 82 + v), 1500, 10000) * (0.6 + 0.4 * np.sin(2 * np.pi * 50 * t))
    tone = osc((600 + 200 * np.sin(2 * np.pi * 23 * t)) * [1, 1.1][v % 2], "tri") * 0.4
    return drive((y + tone) * env_exp(n, 0.001, 0.2), 1.5)


# ------------------------------------------------------------------------------------------------ UI
def ui_click():
    return mix((blip(1900, 1500, 0.018, "square", 0.3, 7000), 0, 0.5), (click(0.004, 1, 3000), 0, 0.8))


def ui_hover():
    return mix((blip(2600, 2600, 0.012, "sine", cut=9000), 0, 0.5))


def ui_back():
    return mix((blip(1300, 1250, 0.045, "square", 0.25, 5000), 0, 0.5), (blip(900, 860, 0.06, "square", 0.25, 4500), 0.05, 0.5))


def ui_open():
    n = int(SR * 0.16)
    sw = osc(curve(600, 1500, n), "tri") * env_exp(n, 0.01, 0.05, hold=0.05) * 0.5
    return mix((sw, 0, 1), (click(0.004, 3, 2500), 0.0, 0.6), (blip(1500, 1500, 0.04, "sine"), 0.12, 0.4))


def crew_select():
    return mix((blip(880, 880, 0.045, "square", 0.3, 5000), 0, 0.45), (blip(1320, 1320, 0.07, "square", 0.3, 5000), 0.045, 0.45))


def crew_move():
    return mix((blip(700, 1050, 0.07, "tri", cut=6000), 0, 0.6), (click(0.003, 5, 3000), 0, 0.3))


def power(up=True):
    f0, f1 = (480, 960) if up else (960, 440)
    return mix((blip(f0, f1, 0.085, "square", 0.3, 4200), 0, 0.5), (click(0.004, 7 if up else 8, 2200), 0, 0.5))


def power_denied():
    n = int(SR * 0.13)
    y = (osc(np.full(n, 150.0), "square", 0.5) + osc(np.full(n, 157.0), "square", 0.5)) * 0.5
    y = lp(y, 2400) * env_exp(n, 0.002, 0.08, hold=0.04)
    return mix((y, 0, 0.6), (y, 0.15, 0.6))


def weapon_select():
    return mix((blip(1100, 1100, 0.03, "square", 0.4, 5000), 0, 0.45), (click(0.004, 9, 3000), 0, 0.6))


def weapon_charged():
    b1 = bell(1568, 0.5, 0.6, 3) * 0.5
    b2 = bell(2093, 0.6, 0.6, 4) * 0.45
    tick = blip(1047, 1400, 0.05, "tri", cut=6000) * 0.4
    return reverb(mix((tick, 0, 1), (b1, 0.04, 1), (b2, 0.1, 1)), 0.6, 0.15)


def chime(notes, step=0.09, dur=1.2, bright=0.7, wet=0.25, rt=1.4):
    parts = [(bell(f, dur, bright, i) * 0.5 + pad_to(pluck(f, dur * 0.5, 0.5), int(round(dur * SR))) * 0.25, i * step, 1.0)
             for i, f in enumerate(notes)]
    return reverb(mix(*parts), rt, wet)


def hop_ready():
    # open fifths and a ninth (A E A B), no major third: a cold glimmer, not a fanfare
    return chime([440, 659.3, 880, 987.8], 0.08, 1.4, 0.7, 0.3, 1.6)


def repair_done():
    return chime([659.3, 987.8], 0.1, 0.9, 0.6, 0.2, 1.0)


def buy_chime():
    return chime([1318.5, 1760.0], 0.07, 0.7, 0.9, 0.15, 0.8)


def sell_chime():
    return chime([1760.0, 1318.5, 987.8], 0.06, 0.6, 0.8, 0.15, 0.8)


def pickup_blip():
    return mix((blip(700, 1400, 0.09, "square", 0.3, 5000), 0, 0.4), (blip(1400, 1400, 0.06, "tri", cut=7000), 0.08, 0.4))


# ------------------------------------------------------------------------------------------------ alarms, loops
def air_alarm(period=1.2):
    """Two-tone alert, exactly periodic (loops sample-exactly): A-tone 0.22 s, B-tone 0.22 s, rest."""
    n = int(SR * period)
    y = np.zeros(n)
    for f, start in [(880.0, 0.0), (660.0, 0.26)]:
        m = int(SR * 0.22)
        tone = (osc(np.full(m, f), "square", 0.5) * 0.5 + osc(np.full(m, f * 2), "sine") * 0.2)
        tone = lp(tone, 3500) * env_adsr(m, 0.006, 0.05, 0.8, 0.05)
        s = int(SR * start)
        y[s:s + m] += tone
    return y


def hull_alarm():
    """Urgent one-shot: three klaxon pulses with a falling edge."""
    parts = []
    for i in range(3):
        m = int(SR * 0.17)
        t = np.arange(m) / SR
        f = 520 * (1 - 0.12 * t / 0.17)
        tone = osc(f, "saw") * 0.5 + osc(f * 1.5, "square", 0.4) * 0.25
        tone = lp(tone, 3200) * env_adsr(m, 0.004, 0.04, 0.85, 0.04)
        parts.append((tone, i * 0.22, 1.0))
    return reverb(mix(*parts), 0.5, 0.12)


def hop_charge(period=2.0):
    """Hop-drive charge thrum: a 55 Hz cable drone pulsing in eighths at 120 BPM (8 pulses per 2 s), exactly
    periodic so it loops sample-exactly; 55 Hz and the pulse rate divide the period."""
    n = int(SR * period)
    t = np.arange(n) / SR
    base = 55.0
    y = osc(np.full(n, base), "saw") * 0.5 + osc(np.full(n, base * 2), "saw") * 0.25 + osc(np.full(n, base * 3), "sine") * 0.12
    y = lp(y, 900)
    pulse = 0.55 + 0.45 * (0.5 - 0.5 * np.cos(2 * np.pi * 4.0 * t)) ** 1.5
    shimmer = osc(np.full(n, 440.0) * (1 + 0.003 * np.sin(2 * np.pi * 0.5 * t)), "sine") * 0.05
    return y * pulse + shimmer


def hop_riser(dur=2.6):
    """Rising cable thrum: bass saw 40 -> 170 Hz, tremolo accelerating 4 -> 32 Hz, filter opening."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = curve(40, 170, n)
    y = osc(f, "saw") + 0.6 * osc(f * 1.5, "saw") + 0.4 * osc(f * 2.02, "square", 0.4)
    y = sweep_filter(y, curve(200, 5000, n), "lowpass", 1.2)
    rate = curve(4, 32, n)
    trem = 0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rate) / SR)
    e = np.clip(t / dur, 0, 1) ** 1.6
    return y * (0.35 + 0.65 * trem) * e


def zap_up(dur=0.35):
    n = int(SR * dur)
    y = osc(curve(200, 3200, n), "square", 0.3) * 0.5 + bp(noise(n, 91), 2000, 10000) * 0.4
    return y * env_exp(n, 0.25 * dur, 0.05)


def descending_tone(f0=700, f1=180, dur=0.6, shape="tri"):
    n = int(SR * dur)
    return lp(osc(curve(f0, f1, n), shape), 3000) * env_exp(n, 0.003, dur * 0.4)


def machine_wind_down(dur=2.6):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = curve(220, 38, n)
    y = osc(f, "saw") * 0.6 + osc(f * 1.5, "square", 0.4) * 0.3
    y = sweep_filter(y, curve(3000, 150, n), "lowpass", 1.1)
    return y * np.clip(t / 0.05, 0, 1) * (1 - t / dur) ** 1.5


def drone_hit(dur=2.4, base=55.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    y = osc(np.full(n, base), "saw") + osc(np.full(n, base * 1.06), "saw") + 0.5 * osc(np.full(n, base * 0.5), "sine")
    y = sweep_filter(y, curve(2400, 180, n), "lowpass", 1.3)
    return y * env_exp(n, 0.004, 0.9)


def lamps_off(up=False, n_lamps=5, dur=1.4):
    """The veil: lamps douse one after another (clicks) under a closing filter sweep of a warm pad (reversed: on)."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    padsig = sum(osc(np.full(n, f), "saw") for f in (110, 164.8, 220, 277.2)) / 4
    fc = curve(4500, 250, n) if not up else curve(250, 4500, n)
    padsig = sweep_filter(padsig, fc, "lowpass", 1.0) * (env_exp(n, 0.02, 0.5) if not up else np.clip(t / dur, 0, 1) ** 1.5 * env_exp(n, 0.0, 10))
    parts = [(padsig, 0, 0.6)]
    for i in range(n_lamps):
        at = (i * 0.11) if not up else (dur - 0.25 - (n_lamps - 1 - i) * 0.1)
        parts.append((click(0.006, 100 + i, 1800), at, 0.5))
        parts.append((blip(1600 - 150 * i if not up else 900 + 150 * i, 1600 - 150 * i if not up else 900 + 150 * i,
                          0.03, "sine"), at, 0.18))
    return mix(*parts)


def sting(notes, pad_chord, dur=2.6, wet=0.35, bright=0.8, step=0.11):
    parts = [(bell(f, 1.6, bright, i) * 0.4 + pad_to(pluck(f, 0.8, 0.6), int(round(1.6 * SR))) * 0.35, i * step, 1.0)
             for i, f in enumerate(notes)]
    n = int(SR * dur)
    padsig = sum(osc(np.full(n, f) * (1 + 0.003 * k), "saw") for k, f in enumerate(pad_chord)) / len(pad_chord)
    padsig = lp(padsig, 2200) * env_adsr(n, 0.25, 0.3, 0.7, 1.0)
    parts.append((padsig, 0.05, 0.35))
    return reverb(mix(*parts), 1.8, wet)


def victory_sting():
    # the machine's task ended: relief, not triumph -- D sus2 (D A E) rising to a high D over an open-fifth pad
    return sting([587.3, 880.0, 1318.5, 1174.7], [73.4, 110.0, 146.8, 220.0], 2.8, 0.38, 0.8, 0.14)


def defeat_sting():
    return sting([880.0, 698.5, 587.3, 440.0], [73.4, 110.0, 146.8, 174.6], 3.4, 0.4, 0.5, 0.28)


def page_bell():
    """The Relay Seven page: a switchboard bell pattern, two soft strikes on A5."""
    b = bell(880, 1.8, 0.5, 9) * 0.5 + pad_to(bell(1760, 0.8, 0.3, 10), int(1.8 * SR)) * 0.12
    return reverb(mix((b, 0, 1), (b, 0.55, 0.8)), 1.5, 0.3)


def warm_hum(dur=0.9, f=100.0):
    n = int(SR * dur)
    y = osc(np.full(n, f), "sine") + 0.3 * osc(np.full(n, f * 2), "sine") + 0.1 * osc(np.full(n, f * 3), "tri")
    return y * env_adsr(n, 0.02, 0.1, 0.7, 0.4)


def glass_bell_synth(f=1046.5, dur=4.0):
    return reverb(bell(f, dur, 1.0, 12) * 0.6 + pad_to(bell(f * 1.5, dur * 0.6, 0.6, 13), int(round(dur * SR))) * 0.15, 2.2, 0.3)


def radio_blip():
    n = int(SR * 0.25)
    t = np.arange(n) / SR
    y = bp(noise(n, 111), 800, 3500) * env_exp(n, 0.002, 0.08) * 0.8
    tone = osc(np.full(n, 1200.0) * (1 + 0.02 * np.sin(2 * np.pi * 40 * t)), "square", 0.5) * 0.15 * env_exp(n, 0.002, 0.05)
    return lp(y + tone, 4000)


# ------------------------------------------------------------------------------------------------ direction v2: the cable car
def handshake(n_tones):
    """The three-way handshake segments: HELLO (A5) / I HEAR YOU (A5 B5) / I HEAR YOU HEAR ME (A5 B5 E6), crisp
    telegraph-like tones with a short bell tail; the third lands on an open sus2 (no major third: a glimmer)."""
    freqs = [880.0, 987.8, 1318.5][:n_tones]
    parts = []
    for i, f in enumerate(freqs):
        m = int(SR * 0.11)
        tone = osc(np.full(m, f), "square", 0.3) * 0.35 + osc(np.full(m, f), "tri") * 0.5
        tone = lp(tone, 5500) * env_adsr(m, 0.003, 0.03, 0.7, 0.04)
        b = bell(f, 0.6 if i == n_tones - 1 else 0.35, 0.5, 20 + i) * 0.35
        parts += [(tone, i * 0.085, 1.0), (b, i * 0.085, 1.0)]
    parts.append((click(0.004, 30 + n_tones, 2500), 0.0, 0.4))
    return reverb(mix(*parts), 0.7, 0.15)


def handshake_pulse_loop(period=2.0):
    """hop-charge: the trolley spool-up hum (55 Hz family, slow swell) with three short handshake pulses per cycle
    (0.0, 0.25, 0.5 s: Hello / I hear you / I hear you hear me), exactly periodic."""
    n1 = int(SR * period)
    n = 3 * n1                               # render three periods and keep the middle one: the filters are settled
    t = np.arange(n) / SR
    hum = osc(np.full(n, 55.0), "saw") * 0.45 + osc(np.full(n, 110.0), "saw") * 0.2 + osc(np.full(n, 165.0), "sine") * 0.12
    hum = lp(hum, 1100) * (0.8 + 0.2 * np.sin(2 * np.pi * t / period) ** 2)
    whine = osc(np.full(n, 440.0) * (1 + 0.002 * np.sin(2 * np.pi * 1.0 * t)), "sine") * 0.05
    y = hum + whine
    for rep in range(3):
        for i, f in enumerate([660.0, 660.0, 880.0]):
            m = int(SR * 0.07)
            s = rep * n1 + int(SR * 0.25 * i)
            p = osc(np.full(m, f), "tri") * env_exp(m, 0.002, 0.03) * 0.5
            y[s:s + m] += p
    return y[n1:2 * n1]


def brake_squeal(dur=1.8, seed=0):
    """A trolley braking on a steel cable: a resonant squeal falling in pitch with friction noise, slowing to a stop."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = curve(2400, 1300, n) * (1 + 0.004 * np.sin(2 * np.pi * 11 * t))
    sq = osc(f, "tri") * 0.4 + osc(f * 2.01, "sine") * 0.12
    fr = sweep_filter(noise(n, 140 + seed), curve(3500, 900, n), "bandpass", 2.5) * 1.5
    e = np.clip(t / 0.08, 0, 1) * np.clip((dur - t) / 0.5, 0, 1) ** 1.3
    am = 0.75 + 0.25 * np.sin(2 * np.pi * curve(18, 4, n, "lin") * t)
    return (sq + fr) * e * am


def trolley_away(rise=1.3, away=1.9):
    """The trolley racing down the carrier: the cable thrum rises to line speed, then passes and recedes (pitch drops a
    little, the filter closes, the level decays) -- no hard stop."""
    n1, n2 = int(SR * rise), int(SR * away)
    n = n1 + n2
    t = np.arange(n) / SR
    f = np.concatenate([curve(40, 165, n1), 165 * curve(1.0, 0.86, n2)])
    y = osc(f, "saw") + 0.6 * osc(f * 1.5, "saw") + 0.4 * osc(f * 2.02, "square", 0.4)
    fc = np.concatenate([curve(200, 5000, n1), curve(5000, 350, n2)])
    y = sweep_filter(y, fc, "lowpass", 1.2)
    rate = np.concatenate([curve(4, 30, n1), np.full(n2, 30.0)])
    trem = 0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rate) / SR)
    e = np.where(t < rise, (t / rise) ** 1.5, np.exp(-(t - rise) / 0.45))
    return y * (0.4 + 0.6 * trem) * e
