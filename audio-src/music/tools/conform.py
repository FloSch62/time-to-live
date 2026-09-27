"""Conform a take to its plan's exact bar grid: conform.py <piece> <version>/<take> [...]

Bar b of the output starts at exactly b * 240/BPM seconds, in every version of a piece, so explore and battle (or the
event-horizon phases) can be started together and crossfaded in sync.

The time map (output time -> take time) runs through one anchor per four-bar window: the take's global beat line
(align.py: one period + bar 0) plus that window's measured local phase offset (only confident windows; the intro
window and unconfident ones follow the global line). Between anchors the map is linear. The take is then resampled
along that map with a 32-tap Kaiser-windowed sinc: no splices, no joins, no phase-vocoder artifacts; the pitch moves
by the local rate only (|rate - 1| <= 0.3 % -> <= 5 cents; takes needing more are rejected by evaluate.py).

After the body: the take's own ring-out up to TAIL seconds after the tail downbeat (2 plan bars + 2.5 s), faded over
its last 2 s, padded with silence if the take ends sooner, so every version has the same length.
Loop seam: the last SEAM s before loopEnd are crossfaded (equal power) into the SEAM s before loopStart, so playback
that jumps loopEnd -> loopStart is sample-continuous (the loop start follows an earlier occurrence of the loop's final
section, plans.layout, so both sides are the same music).
Writes work/<piece>/<version>-<take>.wav (48 kHz stereo float) and .conform.json; prints the verification: the output's
own comb-fit tempo and each window's phase error against the ideal grid."""
import sys
import numpy as np, soundfile as sf
from core import plans, load, take_path, save_json, load_json, onset_flux, WORK, SR
import align

TAIL_EXTRA = 2.5
SEAM = 0.03
K = 16                                              # half-width of the sinc kernel in taps


def kaiser_sinc(frac, cutoff=0.97, beta=8.6):
    """Kernel values for taps k = -K+1..K at fractional offset frac (array n x 1)."""
    k = np.arange(-K + 1, K + 1)[None, :]
    d = k - frac
    w = np.i0(beta * np.sqrt(np.clip(1 - (d / K) ** 2, 0, 1))) / np.i0(beta)
    return cutoff * np.sinc(cutoff * d) * w


def resample_map(x, pos, chunk=32768):
    """y[n] = x evaluated at fractional input sample position pos[n] (windowed sinc), per channel."""
    xp = np.concatenate([np.zeros((K + 2, x.shape[1]), np.float32), x, np.zeros((K + 2, x.shape[1]), np.float32)])
    y = np.zeros((len(pos), x.shape[1]), np.float32)
    for a in range(0, len(pos), chunk):
        p = pos[a:a + chunk] + (K + 2)
        i0 = np.floor(p).astype(np.int64)
        fr = (p - i0)[:, None]
        h = kaiser_sinc(fr).astype(np.float32)
        idx = i0[:, None] + np.arange(-K + 1, K + 1)[None, :]
        valid = (idx >= 0) & (idx < len(xp))
        idx = np.clip(idx, 0, len(xp) - 1)
        for c in range(x.shape[1]):
            y[a:a + chunk, c] = (xp[idx, c] * valid * h).sum(1)
    return y


def time_map(al, L):
    """Anchors (out time, take time) through the body; linear between, global slope outside."""
    bar_out = L["bar_s"]
    period = al["period"]
    bar0 = al["bar0"]
    anchors = []
    nwin = len(al["window_residual_ms"])
    for i, w in enumerate(al["window_residual_ms"]):
        conf = al["window_conf"][i]
        use = w is not None and i > 0 and conf >= 2.5 and abs(w) <= 40
        centre_bar = 4 * i + 2
        t_out = centre_bar * bar_out
        t_take = bar0 + centre_bar * 4 * period + (w / 1000.0 if use else 0.0)
        anchors.append((t_out, t_take, use))
    return anchors


def conform(pid, version, take):
    L = plans.layout(pid)
    al = load_json(WORK / pid / f"{version}-{take}.align.json")
    x, _ = load(take_path(pid, version, take))
    pre = None
    if abs(al["ratio"] - 1) > 0.002:
        # YuE2 sometimes renders ~1 % off the written tempo: correct that globally with rubberband (pitch kept), then
        # re-align the corrected audio; the sinc time map below only handles the small residual.
        from core import stretch
        x = stretch(x, al["ratio"], tmpdir=str(WORK))
        al = align.analyse(pid, version, take, m=x.mean(1), out_name=f"{version}-{take}.stretched")
        pre = dict(rubberband_ratio=round(load_json(WORK / pid / f"{version}-{take}.align.json")["ratio"], 6),
                   residual_ratio=al["ratio"], realigned_flags=al["flags"])
    bar_out = L["bar_s"]
    # A paired harmonic check can resolve whole-beat ambiguity that onset phase alone cannot.
    phase_correction = plans.P[pid].get("conform_offsets", {}).get(f"{version}/{take}", 0)
    if phase_correction:
        al = {**al, "bar0": al["bar0"] + phase_correction * al["period"]}
    body_bars = L["bars"] - L["tail"]
    n_out = int(round((body_bars * bar_out + L["tail"] * bar_out + TAIL_EXTRA) * SR))
    anchors = time_map(al, L)
    ao = np.array([a[0] for a in anchors])
    at = np.array([a[1] for a in anchors])
    slope = 4 * al["period"] / bar_out                      # take seconds per output second (global)
    t_out = np.arange(n_out) / SR
    # piecewise-linear through the anchors; outside, the global slope from the first/last anchor
    t_take = np.interp(t_out, ao, at)
    t_take = np.where(t_out < ao[0], at[0] + (t_out - ao[0]) * slope, t_take)
    t_take = np.where(t_out > ao[-1], at[-1] + (t_out - ao[-1]) * slope, t_take)
    rates = np.diff(at) / np.diff(ao)
    y = resample_map(x, t_take * SR)
    # beyond the take's end: silence (resample_map pads zeros); fade the ring-out's last 2 s
    f = int(2.0 * SR)
    y[-f:] *= (np.cos(np.linspace(0, np.pi / 2, f)) ** 2)[:, None].astype(np.float32)
    fi = int(0.01 * SR)
    y[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)[:, None]
    # loop seam
    ls, le = L["loop"]
    seam = None
    if L["loop_ok"]:
        a, b = int(round(ls * bar_out * SR)), int(round(le * bar_out * SR))
        # Fresh scores finish the loop on the same dominant chord as the last
        # intro bar. Blend that complete bar so changes in arrangement/level
        # resolve gradually instead of just concealing a sample click.
        seam_s = plans.P[pid].get('loop_crossfade_bars',0) * bar_out or SEAM
        n = min(int(round(seam_s * SR)), a, b-a)
        t = np.linspace(0, np.pi / 2, n, dtype=np.float32)[:, None]
        orig = y[b - n:b].copy()
        y[b - n:b] = orig * np.cos(t) + y[a - n:a] * np.sin(t)
        seam = dict(loop_start_sample=a, loop_end_sample=b, crossfade_s=n/SR)
    out = WORK / pid / f"{version}-{take}.wav"
    sf.write(out, y, SR, subtype="FLOAT")
    # verification on the output: comb-fit tempo and window phase errors against the ideal grid
    m = y.mean(1)
    flux = onset_flux(m, align.HOP)
    period, t0, fz = align.comb_fit(flux, 60.0 / plans.P[pid]["bpm"], end=body_bars * bar_out)
    loc = align.local_offsets(fz, 60.0 / plans.P[pid]["bpm"], 0.0, 0, 4 * body_bars)
    phase_ms = ((t0 + period / 2) % period - period / 2) * 1000
    ver = dict(tempo_bpm=round(60 / period, 3), grid_phase_ms=round(phase_ms, 1),
               window_error_ms=[w for w, c in loc], window_conf=[c for w, c in loc])
    meta = dict(piece=pid, version=version, take=take, duration=round(n_out / SR, 6), samples=n_out, bar_s=bar_out,
                bars=L["bars"], loop_bars=L["loop"], loop_start=round(ls * bar_out, 6), loop_end=round(le * bar_out, 6),
                anchors=[dict(out=round(o, 3), take=round(t, 4), local=u) for o, t, u in anchors],
                rate_min=round(float(rates.min()), 5), rate_max=round(float(rates.max()), 5),
                max_cents=round(float(1200 * np.log2(max(rates.max(), 1 / rates.min()))), 1),
                take_seconds_used=round(float(t_take[-1]), 3), seam=seam, verify=ver, tempo_correction=pre,
                phase_correction_beats=phase_correction)
    save_json(WORK / pid / f"{version}-{take}.conform.json", meta)
    return meta


def main():
    pid = sys.argv[1]
    for job in sys.argv[2:]:
        version, take = job.split("/")
        r = conform(pid, version, take)
        v = r["verify"]
        errs = [abs(w) for w, c in zip(v["window_error_ms"], v["window_conf"]) if c >= 2.0]
        print(f"{pid}/{version}/{take}: {r['duration']:.3f}s rate {r['rate_min']}-{r['rate_max']} (<= {r['max_cents']} cents)  "
              f"verify tempo {v['tempo_bpm']} phase {v['grid_phase_ms']} ms  window err max {max(errs) if errs else None} ms "
              f"median {np.median(errs) if errs else None}", flush=True)


if __name__ == "__main__":
    main()
