"""Rank the takes of a piece: evaluate.py <piece>   -> work/<piece>/eval.json and a table.

Hard rejects (any one): the take lost the plan (bars > 1 beat off the grid), needs more than 0.3 % global tempo
correction (> 5 cents), drifts > 30 ms in any 4-bar window after the intro, too short a ring-out (< 1.5 s after the
last plan bar), Whisper found lexical words, CLAP vocal max > 0.5, a dropout (>= 0.25 s at >= 12 dB, or >= 0.2 s at
>= 15 dB under the local median, inside the plan body), the key is not the plan's key.
Soft score: CLAP cinematic mean + 0.5 x cinematic min + 3 x ftl - 0.3 x vocal max (prefers melodic, score-like,
FTL-ish synth music over techno windows).
Also reported: integrated loudness (LUFS) of the raw take, the level of each four-bar window (RMS dB), and the loop
seam: RMS difference and chroma similarity of the two bars before loopEnd vs the two bars before loopStart."""
import json, sys
import numpy as np
from core import (plans, load, take_path, list_takes, load_json, save_json, loudness, band_chroma, key_scores, env_db, triad,
                  WORK, SR)


def dropouts(m, start, end):
    h = int(0.1 * SR)
    lv = np.array([10 * np.log10(np.mean(m[i:i + h] ** 2) + 1e-10) for i in range(0, len(m) - h, h)])
    out = []
    cur = None
    for i in range(15, len(lv) - 15):
        t = i * 0.1
        ref = np.median(lv[i - 15:i + 16])
        dip = ref > -42 and lv[i] < ref - 8 and start <= t <= end
        if dip and cur is None:
            cur = [i, i, ref, lv[i]]
        elif dip:
            cur[1] = i; cur[3] = min(cur[3], lv[i])
        elif cur is not None:
            out.append(cur); cur = None
    bad = []
    for a, b, ref, low in out:
        dur, depth = (b - a + 1) * 0.1, ref - low
        if dur < 2.0 and ((dur >= 0.25 and depth >= 12) or (dur >= 0.2 and depth >= 15)):
            bad.append((round(a * 0.1, 1), round(float(dur), 1), round(float(depth), 1)))
    return bad


def speech_words(pid, version, take):
    f = WORK / "speech" / f"{pid}-{version}-{take}.medium.json"
    if not f.exists():
        return None
    d = json.loads(f.read_text())
    return [r["text"] for r in d["segments"] if r["speech"]]


def evaluate(pid, version, take, judge):
    L = plans.layout(pid)
    al = load_json(WORK / pid / f"{version}-{take}.align.json")
    x, m = load(take_path(pid, version, take))
    bar_t = 4 * al["period"]
    b0 = al["bar0"]
    body_bars = L["bars"] - L["tail"]
    tb = lambda bar: b0 + bar * bar_t
    audible_end = L['loop'][1] if L['loop_ok'] else body_bars
    rej, advisory = [], []
    # The reference study supersedes v2's blanket darkness/major-key/club gates.
    # Keep those classifier estimates visible; they are not listening verdicts.
    style_flags = advisory if plans.P[pid].get('revision') == 'v4-new-composition' else rej
    lost = [b for b in al["lost_bars"] if L["intro"] <= b < audible_end]
    if lost:
        rej.append(f"lost plan ({len(lost)} bars from bar {lost[0]})")
    if abs(al["ratio"] - 1) > 0.02:                   # up to 2 % is corrected by rubberband before the conform
        rej.append(f"tempo x{al['ratio']:.4f}")
    # pairs/layers must hold the grid everywhere (they are crossfaded); singles may breathe (a rubato phrase) except in
    # the windows that hold the loop points
    ls_, le_ = L["loop"]
    near_loop = {ls_ // 4, max(0, ls_ // 4 - 1), le_ // 4 - 1}
    single = plans.P[pid]["kind"] == "single"
    drift = [w for i, w in enumerate(al["window_residual_ms"]) if i > 0 and w is not None
             and i * 4 < audible_end and abs(w) > (30 if (not single or i in near_loop) else 60)]
    if drift:
        rej.append(f"drift {drift[:4]} ms")
    if not L['loop_ok'] and al["tail_seconds"] < 1.5:
        rej.append(f"tail {al['tail_seconds']} s")
    if L['loop_ok'] and tb(audible_end) > len(m) / SR:
        rej.append('take ends before the loop boundary')
    j = judge.get(f"{version}/{take}", {})
    if j.get("vocal_max", 0) > 0.5:
        rej.append(f"CLAP vocal {j['vocal_max']}")
    # v2 gates (user feedback: v1 was "very happy and far away from Ben Prunty"):
    #  mood: CLAP dark/melancholic vs happy/upbeat per 10 s window -- happy must lose clearly (the ending is exempt)
    #  not-club: CLAP dark synth score vs generic EDM/club/pop dance
    ending = pid == "an-answer"
    fighting = version in ("battle", "custody", "emergency", "horizon") or pid in ("iron-regent", "hollow-choir")
    # CLAP mood is weakly calibrated (single prompt pairs call even deliberately dark scores "happy"), so the gate is a
    # four-pair composite set against references: FAULTLINE's dark pieces score 0.38-0.52, the v1 files the user
    # called happy 0.10-0.19 (battle 0.19). Explore/singles need >= 0.33, fights >= 0.26, and no more than 25 % of
    # the 10 s windows may fall below 0.2 (clearly bright passages).
    if j and not ending:
        need = 0.26 if fighting else 0.33
        wins = [w for w in j.get("windows", []) if w.get("dark") is not None]
        bright = sum(1 for w in wins if w["dark"] < 0.2) / max(1, len(wins))
        if j.get("dark", 0) < need or bright > 0.25:
            style_flags.append(f"v2 mood proxy (CLAP {j.get('dark')}; bright windows {bright:.0%})")
    if j and (j.get("score", 1) < 0.45 or j.get("score_min", 1) < 0.08):
        style_flags.append(f"club/EDM-leaning (CLAP score-vs-club {j.get('score')}, min {j.get('score_min')})")
    words = speech_words(pid, version, take)
    if words:
        rej.append(f"Whisper words: {words[:2]}")
    drops = dropouts(m, tb(L["intro"]), tb(audible_end))
    # dips inside the planned breaks (interlude sections) are musical, not dropouts
    breaks = [(tb(b0_), tb(b0_ + 4)) for b0_, name, label in L["sections"] if label == "interlude"]
    planned = [d for d in drops if any(a - 0.5 <= d[0] <= b for a, b in breaks)]
    drops = [d for d in drops if d not in planned]
    if drops:
        # A short RMS dip can also be the space after a pluck or a phrase rest.
        # The rhythmically active v4 scores require listening review of these
        # locations; an energy detector alone cannot declare an audio dropout.
        (advisory if plans.P[pid].get('revision') == 'v4-new-composition' else rej).append(
            f"brief level dips to review {drops[:3]}")
    # key: did the model transpose? the take's chroma against the plan's own chord profile at every transposition
    ch = band_chroma(m[max(0, int(tb(0) * SR)):int(tb(body_bars) * SR)], 0.25, 55, 2000).sum(0)
    ch = ch / (np.linalg.norm(ch) + 1e-9)
    prof = np.sum([triad(c) for c, *_r in plans.bars_of(pid, version)], 0)
    corr = [float(np.corrcoef(ch, np.roll(prof, k))[0, 1]) for k in range(12)]
    shift = int(np.argmax(corr))
    best = f"{'+' if shift <= 6 else '-'}{shift if shift <= 6 else 12 - shift} st" if shift else plans.P[pid]["key"]
    if shift and corr[shift] - corr[0] > 0.08:
        rej.append(f"transposed {best} (corr {corr[shift]:.2f} vs {corr[0]:.2f})")
    elif shift:
        best = plans.P[pid]["key"] + f" (~{best})"
    # minor gate: the plan's minor key must beat every major key on the Krumhansl profiles (the v1 takes read as the
    # relative major, F or Bb, which is what made them sound happy); the ending is exempt
    ks = key_scores(ch)
    plan_key = plans.P[pid]["key"]
    if not ending and plan_key.endswith("m"):
        maj = max((k for k in ks if not k.endswith("m")), key=ks.get)
        if ks[maj] >= ks[plan_key]:
            style_flags.append(f"major-leaning ({maj} {ks[maj]:.2f} >= {plan_key} {ks[plan_key]:.2f})")
    mode_margin = round(ks[plan_key] - max(v for k, v in ks.items() if not k.endswith("m")), 3) if plan_key.endswith("m") else None
    # levels
    lv = loudness(take_path(pid, version, take))
    win_db = []
    for w in range(0, body_bars, 4):
        seg = m[max(0, int(tb(w) * SR)):int(tb(w + 4) * SR)]
        win_db.append(round(float(10 * np.log10(np.mean(seg ** 2) + 1e-10)), 1))
    ls, le = L["loop"]
    def seg2(bar):
        return m[max(0, int(tb(bar - 2) * SR)):int(tb(bar) * SR)]
    a, b = seg2(ls), seg2(le)
    seam_db = seam_chroma = None
    if len(a) > SR and len(b) > SR:
        seam_db = round(float(10 * np.log10((np.mean(b ** 2) + 1e-10) / (np.mean(a ** 2) + 1e-10))), 1)
        ca = band_chroma(a, 0.25, 55, 2000).mean(0); cb = band_chroma(b, 0.25, 55, 2000).mean(0)
        seam_chroma = round(float(ca @ cb / (np.linalg.norm(ca) * np.linalg.norm(cb) + 1e-9)), 3)
    score = (1.5 * j.get("dark", 0) + 0.5 * j.get("score", 0) + 3 * j.get("ftl", 0) - 0.3 * j.get("vocal_max", 0)
             - (0.05 if abs(al["ratio"] - 1) > 0.002 else 0.0)            # a tempo-corrected take ranks a little lower
             + (1.0 * j.get("intense", 0.5) if version in ("battle", "emergency", "horizon") else 0.0)
             + (0.5 * (1 - j.get("intense", 0.5)) if version == "explore" else 0.0))   # explore calm, battle driving
    return dict(take=f"{version}/{take}", reject=rej, advisory=advisory, planned_dips=planned, score=round(score, 3), cinematic=j.get("cinematic"),
                intense=j.get("intense"), dark=j.get("dark"), not_club=j.get("score"), mode_margin=mode_margin,
                cinematic_min=j.get("cinematic_min"), vocal_max=j.get("vocal_max"), ftl=j.get("ftl"),
                speech_checked=words is not None, lufs=lv["lufs"], tp=lv["tp"], lra=lv["lra"], key=best,
                window_db=win_db, seam_db=seam_db, seam_chroma=seam_chroma, ratio=al["ratio"], tail=al["tail_seconds"])


def main():
    pid = sys.argv[1]
    judge = load_json(WORK / pid / "judge.json")
    rows = []
    for version in plans.P[pid]["versions"]:
        for take in list_takes(pid, version):
            if not (WORK / pid / f"{version}-{take}.align.json").exists():
                continue
            rows.append(evaluate(pid, version, take, judge))
    save_json(WORK / pid / "eval.json", rows)
    for r in sorted(rows, key=lambda r: (r["take"].split("/")[0], bool(r["reject"]), -r["score"])):
        print(f"{r['take']:12} {'REJECT' if r['reject'] else 'ok    '} score {r['score']:.2f} cine {r['cinematic']} "
              f"(min {r['cinematic_min']}) DARK {r['dark']} notclub {r['not_club']} minor+{r['mode_margin']} int {r['intense']} voc {r['vocal_max']} ftl {r['ftl']} {r['lufs']:.1f} LUFS tp {r['tp']:.1f} "
              f"key {r['key']} seam {r['seam_db']} dB/{r['seam_chroma']} speech {'y' if r['speech_checked'] else '-'}"
              f"{'  ' + '; '.join(r['reject']) if r['reject'] else ''}")
        print(f"{'':12} window dB {r['window_db']}")


if __name__ == "__main__":
    main()
