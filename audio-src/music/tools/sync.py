"""Check that the versions of a piece are in sync: sync.py <piece> <version>=<take> <version>=<take> [...]

For every four-bar window: the lag (ms, within +-120 ms) that maximises the cross-correlation of the two versions'
onset-flux curves, and its peak correlation; also each version's own grid phase error (comb fit against the ideal grid,
conform.py's verification). Versions are compared against the first one given. Writes work/<piece>/sync.json."""
import sys
import numpy as np, soundfile as sf
from core import plans, onset_flux, save_json, WORK, SR

HOP = 0.005


def main():
    pid = sys.argv[1]
    picks = [a.split("=") for a in sys.argv[2:]]
    L = plans.layout(pid)
    body = L["bars"] - L["tail"]
    fl = {}
    for v, t in picks:
        x, _ = sf.read(WORK / pid / f"{v}-{t}.wav", dtype="float32", always_2d=True)
        f = onset_flux(x.mean(1), HOP)
        f = np.convolve(f, np.exp(-0.5 * (np.arange(-4, 5) / 1.6) ** 2), mode="same")
        fl[v] = f
    ref_v = picks[0][0]
    res = {'_takes': dict(picks), '_loop_bars': L['loop']}
    for v, _ in picks[1:]:
        rows = []
        for w in range(0, body, 4):
            a, b = int(w * L["bar_s"] / HOP), int((w + 4) * L["bar_s"] / HOP)
            r, s = fl[ref_v][a:b], fl[v][a:b]
            r = (r - r.mean()) / (r.std() + 1e-9); s = (s - s.mean()) / (s.std() + 1e-9)
            lags = np.arange(-24, 25)
            cc = [float(np.mean(r[max(0, -k):len(r) - max(0, k)] * s[max(0, k):len(s) - max(0, -k)])) for k in lags]
            k = int(np.argmax(cc))
            rows.append(dict(bar=w, lag_ms=int(lags[k] * HOP * 1000), corr=round(cc[k], 2), corr0=round(cc[24], 2)))
        res[f"{v} vs {ref_v}"] = rows
        good = [r for r in rows if r["corr"] >= 0.3]
        lags_ms = [r["lag_ms"] for r in good]
        print(f"{pid}: {v} vs {ref_v}: windows {len(rows)}, confident {len(good)}; lag median {np.median(lags_ms) if lags_ms else None} ms, "
              f"max |lag| {max(map(abs, lags_ms)) if lags_ms else None} ms; per window " +
              " ".join(f"{r['bar']}:{r['lag_ms']:+d}({r['corr']:.2f})" for r in rows))
    # beat-phase check: beat-synchronous chroma (on the ideal grid) of each version against the reference, shifted by
    # -4..4 beats; the best shift must be 0 (a one-beat downbeat error is invisible to the +-120 ms onset lags above)
    from core import band_chroma
    beat = 60.0 / plans.P[pid]["bpm"]
    def beatchroma(v, t):
        x, _ = sf.read(WORK / pid / f"{v}-{t}.wav", dtype="float32", always_2d=True)
        C = band_chroma(x.mean(1), 0.05, 55, 2000)
        nb = int(body * L["bar_s"] / beat)
        B = np.array([C[int(k * beat / 0.05):int((k + 1) * beat / 0.05)].mean(0) for k in range(nb)])
        return B / (np.linalg.norm(B, axis=1, keepdims=True) + 1e-12)
    ref = beatchroma(*picks[0])
    for v, t in picks[1:]:
        B = beatchroma(v, t)
        sc = {}
        for k in range(-4, 5):
            a = ref[max(0, -k):len(ref) - max(0, k)]
            b = B[max(0, k):len(B) - max(0, -k)]
            sc[k] = float(np.mean(np.sum(a * b, 1)))
        best = max(sc, key=sc.get)
        res[f"{v} vs {ref_v} beat shift"] = dict(best=best, scores={str(k): round(x, 4) for k, x in sc.items()})
        print(f"{pid}: {v} vs {ref_v}: beat-synchronous chroma best shift {best:+d} beats (score {sc[best]:.3f}; "
              f"at 0: {sc[0]:.3f}; +-1: {sc[-1]:.3f}/{sc[1]:.3f})" + ("" if best == 0 else "  <-- NOT IN PHASE"))
        pitch = {k: float(np.mean(np.sum(ref * np.roll(B, k, axis=1), axis=1))) for k in range(-6, 6)}
        best_pitch = max(pitch, key=pitch.get)
        res[f"{v} vs {ref_v} pitch shift"] = dict(best=best_pitch, unit="semitones",
                                                   scores={str(k): round(x, 4) for k, x in pitch.items()})
        print(f"{pid}: {v} vs {ref_v}: harmonic comparison best rotation {best_pitch:+d} semitones "
              f"(score {pitch[best_pitch]:.3f}; at 0: {pitch[0]:.3f})" +
              ("" if best_pitch == 0 else "  <-- REVIEW HARMONIC MATCH"))
    save_json(WORK / pid / "sync.json", res)


if __name__ == "__main__":
    main()
