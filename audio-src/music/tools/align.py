"""Map a take onto its plan's bar grid: align.py <piece> [<version>/<take> ...]   (default: every take of the piece)

What YuE2 does (measured on copper-reach): it renders at a constant tempo within ~0.1 % of the written BPM, and the
beats of a whole take sit on ONE straight line (per-16-beat median residual within +-5 ms from the second window on).
So a take is described by two numbers: its beat period and the time of bar 0's downbeat.

1. A dynamic-programming beat tracker (Ellis 2007) on a band-wise onset-flux curve, the plan's beat as prior; beats are
   refined to their local flux peak.
2. A robust (iteratively trimmed) straight-line fit beat index -> time gives the take's period and grid phase.
3. Melody-aware DTW of the plan (faultline lore dtw.py, sixteenth steps at the plan BPM) gives every bar's approximate
   start; bar 0 = the median of (start_b - b*bar) over all bars, snapped to the fitted beat grid. Each bar's DTW start
   must then lie within one beat of its grid time; bars that do not are flagged (a dropped/extra bar or a lost plan).
4. Drift check: the median beat residual per 16-beat window; windows over 20 ms are flagged.
Writes work/<piece>/<version>-<take>.align.json."""
import sys
import numpy as np
from core import (plans, load, take_path, list_takes, band_chroma, plan_roll, onset_flux, save_json, env_db, WORK, SR)


HOP = 0.005


def dtw_bars(pid, version, m, abc=None):
    bpm = plans.P[pid]["bpm"]
    fr = 60.0 / bpm / 4
    mel, chd, bar_of = plan_roll(pid, version, abc=abc)
    hi = band_chroma(m, fr, 250, 1600)
    lo = band_chroma(m, fr, 55, 250)
    has = mel.sum(1) > 0
    c_mel = 1 - mel @ hi.T
    c_chd = 1 - 0.5 * (chd @ hi.T + chd @ lo.T)
    cost = np.where(has[:, None], 0.55 * c_mel + 0.45 * c_chd, c_chd)
    I, J = cost.shape
    INF = 1e18
    D = np.full((I, J), INF)
    k0 = max(2, int(2.0 / fr))
    D[0, :k0] = cost[0, :k0]
    P = np.zeros((I, J), np.int8)
    for i in range(1, I):
        a = np.full(J, INF); a[1:] = D[i - 1, :-1]
        b = np.full(J, INF); b[2:] = D[i - 1, :-2] + cost[i, 1:-1]
        c = np.full(J, INF)
        if i >= 2:
            c[1:] = D[i - 2, :-1] + cost[i - 1, 1:]
        st = np.vstack([a, b, c])
        k = np.argmin(st, 0)
        D[i] = st[k, np.arange(J)] + cost[i]
        P[i] = k
    j = int(np.argmin(D[-1] / (np.arange(J) + I)))
    i = I - 1
    path = [(i, j)]
    while i > 0:
        k = P[i, j]
        if k == 0:
            i, j = i - 1, j - 1
        elif k == 1:
            path.append((i, j - 1)); i, j = i - 1, j - 2
        else:
            path.append((i - 1, j - 1)); i, j = i - 2, j - 1
        path.append((i, j))
    path = path[::-1]
    first = {}
    for i, j in path:
        first.setdefault(int(bar_of[i]), j * fr)
    nb = int(bar_of.max()) + 1
    return np.array([first.get(b, np.nan) for b in range(nb)]), float(np.mean([cost[i, j] for i, j in path]))


def track_beats(flux, period, tightness=120.0):
    """Ellis DP beat tracking on a flux curve sampled every HOP s; period in frames."""
    f = flux / (np.std(flux) + 1e-9)
    f = np.convolve(f, np.exp(-0.5 * (np.arange(-6, 7) / 2.0) ** 2), mode="same")
    n = len(f)
    score = f.copy()
    back = np.full(n, -1)
    lo, hi = int(round(0.75 * period)), int(round(1.33 * period))
    offs = np.arange(lo, hi + 1)
    pen = -tightness * np.log(offs / period) ** 2
    for t in range(hi, n):
        cand = score[t - offs] + pen
        k = int(np.argmax(cand))
        if cand[k] > 0:
            score[t] = f[t] + cand[k]
            back[t] = t - offs[k]
    t = n - hi + int(np.argmax(score[n - hi:]))
    beats = [t]
    while back[t] >= 0:
        t = back[t]
        beats.append(t)
    beats = np.array(beats[::-1], float)
    ref = []
    for b in beats.astype(int):
        a, c = max(1, b - 2), min(n - 2, b + 2)
        k = a + int(np.argmax(f[a:c + 1]))
        y0, y1, y2 = f[k - 1], f[k], f[k + 1]
        den = y0 - 2 * y1 + y2
        ref.append(k + (0.5 * (y0 - y2) / den if abs(den) > 1e-9 else 0.0))
    return np.array(ref) * HOP, f


def grid_fit(beats, period):
    """Robust straight line through the beats: (period, t0) with t_k = t0 + k*period; returns residuals too."""
    idx = np.round((beats - beats[0]) / period)
    ok = np.ones(len(beats), bool)
    for tol in (0.08, 0.04, 0.025):
        A = np.vstack([idx[ok], np.ones(ok.sum())]).T
        coef, *_ = np.linalg.lstsq(A, beats[ok], rcond=None)
        res = beats - (idx * coef[0] + coef[1])
        ok = np.abs(res) < tol
        idx = np.round((beats - coef[1]) / coef[0])
    return float(coef[0]), float(coef[1]), res, idx


def comb_score(f, t0, period, n, sub=0.5):
    """Sum of the smoothed flux at t0 + k*period (and `sub` x at the eighths) for k < n; f sampled every HOP."""
    k = np.arange(n)
    q = (t0 + k * period) / HOP
    e = (t0 + (k + 0.5) * period) / HOP
    return np.interp(q, np.arange(len(f)), f).sum() + sub * np.interp(e, np.arange(len(f)), f).sum()


def comb_fit(flux, beat_plan, start=0.0, end=None):
    """Global constant-tempo grid fit straight on the onset flux: (period, t0) maximising the comb sum."""
    f = flux / (np.std(flux) + 1e-9)
    f = np.convolve(f, np.exp(-0.5 * (np.arange(-4, 5) / 1.6) ** 2), mode="same")
    end = end or len(f) * HOP
    best = (-1e9, None, None)
    for rel in np.arange(0.97, 1.03, 0.0005):
        period = beat_plan * rel
        n = int((end - start) / period) - 1
        for t0 in np.arange(start, start + period, HOP):
            sc = comb_score(f, t0, period, n)
            if sc > best[0]:
                best = (sc, period, t0)
    _, period, t0 = best
    for step_p, step_t in ((beat_plan * 0.0001, 0.001), (beat_plan * 0.00002, 0.0002)):   # refine
        cand = [(comb_score(f, t, p, int((end - start) / p) - 1), p, t)
                for p in period + step_p * np.arange(-6, 7) for t in t0 + step_t * np.arange(-6, 7)]
        _, period, t0 = max(cand)
    return period, t0, f


def local_offsets(f, period, t0, first, last, n=16, span=0.08):
    """Per n-beat window: the phase shift (ms) of the best local comb within +-span s (drift / slips)."""
    out = []
    k = first
    while k < last:
        kk = min(n, last - k)
        shifts = np.arange(-span, span + 1e-9, 0.002)
        sc = [comb_score(f, t0 + k * period + d, period, kk) for d in shifts]
        j = int(np.argmax(sc))
        conf = (sc[j] - np.median(sc)) / (np.std(sc) + 1e-9)
        out.append((round(1000 * shifts[j], 1), round(float(conf), 2)))
        k += n
    return out


def chord_rows(pid, version, take):
    """The take's own planned chords, one per bar (from its score.abc)."""
    from core import bars_from_abc
    abc = (take_path(pid, version, take).parent / "score.abc").read_text()
    return [c for c, _ in bars_from_abc(abc)]


def bar_chroma(C, hop, t0, bar, nbars):
    """Mean chroma per bar for bars starting at t0 + b*bar (C: frames x 12 at `hop` s)."""
    out = np.zeros((nbars, 12))
    for b in range(nbars):
        a, e = int((t0 + b * bar) / hop), int((t0 + (b + 1) * bar) / hop)
        a, e = max(0, a), min(len(C), e)
        if e > a:
            v = C[a:e].mean(0)
            out[b] = v / (np.linalg.norm(v) + 1e-12)
    return out


def chord_match(C, hop, t0, bar, chords):
    """Per-bar similarity of the audio to the planned triads."""
    from core import triad
    B = bar_chroma(C, hop, t0, bar, len(chords))
    return np.array([B[b] @ triad(c) for b, c in enumerate(chords)])


def analyse(pid, version, take, m=None, out_name=None):
    """m / out_name: analyse given audio (e.g. a tempo-corrected copy) and write work/<piece>/<out_name>.align.json."""
    if m is None:
        x, m = load(take_path(pid, version, take))
    L = plans.layout(pid)
    bpm = plans.P[pid]["bpm"]
    beat_plan = 60.0 / bpm
    abc = (take_path(pid, version, take).parent / "score.abc").read_text()
    starts, cost = dtw_bars(pid, version, m, abc)
    flux = onset_flux(m, HOP)
    period, t0, f = comb_fit(flux, beat_plan)
    bar_take = 4 * period
    # bar 0: coarse estimate from every bar's DTW start, then the beat phase (and bar) chosen by matching bar-synchronous
    # chroma to the planned chords over the whole body: with sparse plans (two-bar chords, whole notes) the DTW alone
    # places bars only to about a beat, and a one-beat error would put explore and battle a beat apart.
    b = np.arange(len(starts))
    good = ~np.isnan(starts) & (b > 0) & (b < L["bars"] - L["tail"])
    est = float(np.median(starts[good] - b[good] * bar_take))
    chords = chord_rows(pid, version, take)[: L["bars"] - L["tail"]]
    hop_c = 0.05
    C = band_chroma(m, hop_c, 55, 2000)
    # YuE2 renders from bar 0: the first onset of the take IS bar 0's downbeat (every v1 take began within 0.3 s).
    # bar0 = the fitted beat-grid point nearest that onset. The chord match is reported (fit, and the margin over
    # other beat phases), but with two-bar chords it cannot resolve the beat phase, so it only checks bars (below).
    e = env_db(m, hop=0.01, win=0.02)
    loud = (e > -60.0).astype(float)
    ahead = np.convolve(loud, np.ones(8), mode="full")[7:len(loud) + 7]      # loud frames in [i, i+8)
    sustained = (loud > 0) & (ahead >= 8)
    first = int(np.argmax(sustained)) * 0.01
    k_first = round((first - t0) / period)             # the grid beat nearest the first sustained sound
    bar0 = t0 + k_first * period
    cands = []
    for k in range(k_first - 4, k_first + 5):
        sc = chord_match(C, hop_c, t0 + k * period, bar_take, chords)
        cands.append((float(sc.mean()), k))
    best = dict((k, sc) for sc, k in cands)[k_first]
    phase_margin = best - max(sc for sc, k in cands if k != k_first)
    if abs(est - bar0) > 1.5 * period:
        flags_pre = [f"DTW puts bar 0 at {est:.2f} s, first onset at {first:.2f} s"]
    else:
        flags_pre = []
    dev = (starts - (bar0 + b * bar_take)) / period            # in beats
    # plan-following per four-bar window: the window's own best shift (-4..4 beats) against the global grid
    per = chord_match(C, hop_c, bar0, bar_take, chords)
    lost, shifts = [], []
    for w in range(L["intro"], len(chords), 4):
        base = per[w:w + 4].mean()
        alt = []
        for sh in (-8, -4, 4, 8):                               # whole-bar slips (a dropped / added bar)
            sc = chord_match(C, hop_c, bar0 + w * bar_take + sh * period, bar_take, chords[w:w + 4]).mean()
            alt.append((sc, sh))
        a_best, a_sh = max(alt)
        shifts.append((w, round(float(base), 3), a_sh, round(float(a_best), 3)))
        if a_best > base + 0.06:
            lost.append(w)
    # drift: the best local phase per 16-beat window (plan body only), with a confidence
    body_end = bar0 + (L["bars"] - L["tail"]) * bar_take
    k0 = int(round((bar0 - t0) / period))
    loc = local_offsets(f, period, t0, k0, k0 + 4 * (L["bars"] - L["tail"]))
    win = [w if c >= 2.0 else None for w, c in loc]
    flags = list(flags_pre)
    if lost:
        flags.append(f"{len(lost)} windows fit the plan better shifted (bars {lost[:10]})")
    bad_w = [(i, w) for i, w in enumerate(win) if w is not None and abs(w) > 20]
    if bad_w:
        flags.append(f"drift windows >20 ms: {bad_w[:8]}")
    empty_w = sum(1 for w in win if w is None)
    if empty_w > 2:
        flags.append(f"{empty_w} windows without a beat lock")
    ratio = L["bar_s"] / bar_take
    if abs(ratio - 1) > 0.02:
        flags.append(f"tempo {60 / period:.2f} vs plan {bpm}: ratio {ratio:.4f}")
    dur = len(m) / SR
    tail_s = dur - body_end
    inlier = float(np.mean([c for _, c in loc]))
    r = dict(piece=pid, version=version, take=take, duration=round(dur, 3), dtw_cost=round(cost, 3),
             period=round(period, 7), tempo_bpm=round(60.0 / period, 3), plan_bpm=bpm, ratio=round(ratio, 7),
             bar0=round(bar0, 4), bar0_dtw=round(est, 3), first_onset=round(first, 3), phase_margin=round(phase_margin, 4),
             chord_fit=round(best, 3),
             window_shifts=shifts, body_end=round(body_end, 3), tail_seconds=round(tail_s, 2),
             lock_conf=round(inlier, 3), window_residual_ms=win, window_conf=[c for _, c in loc], dtw_dev_beats=[None if np.isnan(d) else round(float(d), 2) for d in dev],
             lost_bars=lost, flags=flags)
    save_json(WORK / pid / f"{out_name or f'{version}-{take}'}.align.json", r)
    return r


def main():
    pid = sys.argv[1]
    jobs = [tuple(a.split("/")) for a in sys.argv[2:]] or [(v, t) for v in plans.P[pid]["versions"] for t in list_takes(pid, v)]
    for version, take in jobs:
        r = analyse(pid, version, take)
        w = [abs(v) for v in r["window_residual_ms"] if v is not None]
        print(f"{pid}/{version}/{take}: dur {r['duration']}s tempo {r['tempo_bpm']} (x{r['ratio']:.5f}) bar0 {r['bar0']:.3f} "
              f"(dtw {r['bar0_dtw']:.3f}, phase margin {r['phase_margin']:.3f}, fit {r['chord_fit']:.2f}) tail {r['tail_seconds']}s lock {r['lock_conf']:.1f} "
              f"win max {max(w) if w else None} ms cost {r['dtw_cost']}  flags: {'; '.join(r['flags']) or '-'}", flush=True)


if __name__ == "__main__":
    main()
