# Audio workstream progress log

Newest last. Each GPU hold runs under `flock faultline/.work/locks/gpu.lock`, ≤ ~20 min, one process at a time.

## Hold 0 — Stable Audio elements (2026-09-26 23:14, 3 min)
- `sfx/gen.py`: 33 element pools × 2 prompts × 8 seeds = 528 takes in 175 s.
- CPU after: `sfx/rank.py` (crop + CLAP rank), `sfx/synth.py` + `sfx/build.py` → **all 57 contract cues delivered**
  (`public/audio/sfx/*.ogg`, 82 files, `public/audio/sfx.json`), v1.

## Hold 1 — YuE2 pilots (23:18–23:33, 10 min)
- copper-reach explore t1–t3, battle t1–t3; title t1–t3 (CFG 1.6 away from voices, non-vocal block labels).
- Findings: YuE2 plays at the written tempo to 0.02–0.1 % and the whole take sits on one beat line (per-4-bar
  window residual within ±6 ms) → conform = one smooth time map + sinc resample (no splices). Verified on
  copper-reach explore/battle t2: output grid phase < 1 ms, window error median 0 ms.
- CLAP: no vocals anywhere (vocal max ≤ 0.16). Explore cinematic 0.76–0.83. **Battle dipped to techno (0.04–0.2)
  exactly in the monotone eighth-pulse override sections** → battle plan rev 2 (contoured 3-3-2 ostinati, break
  builds with rising quarters, hybrid-orchestral style text).
- Rejects: copper-reach explore t1 (lost the plan at bar 49, +17 s), title t1 (lost the plan at bar 49).

## Direction v2 (coordinator, 2026-09-27)
- The tender is a cable car on carrier cables. SFX to redo: hop (switchgear clunk + trolley racing down the carrier),
  hop-charge (trolley spool-up hum with three handshake pulses) + new `handshake-1..3`, shield-hit (ward mesh:
  crackle + twang), arrive (trolley braking on the cable), optional `cable-creak` loop. New Stable Audio elements
  queued in hold 2 (cable_twang, wheel_hiss, cable_brake, cable_creak, switchgear, motor_spool).

## Hold 2 (2026-09-26 23:45 – 00:01, 16 min)
- SFX: 6 cable-car element pools (96 takes, 47 s). CPU after: hop, hop-charge, shield-hit, arrive rebuilt for
  direction v2; new `handshake-1/2/3`, `cable-creak`, `couple`, `uncouple`, `refit` (coordinator addendum) → 64 cues.
- Music: copper-reach battle rev 2 t4–t7, rust-kingdom e1–2/b1–2, iron-regent t1–2, exchange t1–2, copper e4, title t4.
- **Delivered: copper-reach** (explore t2 + battle t5; sync verified: lag 0 ms median, max 5 ms; gain −6.7 dB,
  battle −19.0 / explore −18.2 LUFS), **title** (t4, rubberband-corrected +1.06 % tempo), **exchange** (t1).
- Rev 2 battle works (CLAP cinematic 0.84–0.91). New lessons: (1) YuE2 sometimes misses the tempo by ~1 %
  (rust-kingdom battle, title t4) → conform now rubberband-corrects the global tempo first; (2) groove sections
  without a melody read as techno in explore too (rust-kingdom H) → plan rev 3: counter-melodies in every groove
  section, identical in explore and battle; (3) iron-regent read techno throughout → hybrid-orchestral style text.

## Hold 3 (00:11–00:19, stopped early)
- SFX: chain / latch_release / impact_wrench pools (48 takes); couple/uncouple/refit rebuilt.
- Music: stopped after 1 take (title t5) when the **user feedback** arrived: "the music I have heard so far was
  very happy and far away from Ben Prunty". Lock released early for the art workstream.

## Direction v2 "dark" (2026-09-27 00:20)
- v1 plans, takes, analysis and masters archived to `music/archive-v1/` (not delivered; the old copper-reach,
  title and exchange files stay in `public/` only until their v2 replacements land).
- New plans (`music/plans.py` v2): minor modes only (Aeolian/Dorian, Phrygian bII), one chord per two bars, sparse
  long-note melodies, dark 1980s sci-fi synth-score style texts; battle = dark synth-bass ostinato + drum machine
  with gated snare + minor-second stabs, never heroic. NEGATIVE adds the happy/uplifting/heroic vocabulary.
- New gates (`tools/evaluate.py`): CLAP dark-vs-happy (≥ 0.65 explore/singles, ≥ 0.55 battle; happy may win in
  ≤ 20 % of windows), CLAP score-vs-club (generic EDM), the plan's minor key must beat every major key (v1's
  copper-reach battle, title and exchange read as F / Bb / F major and fail it). an-answer is exempt (the ending).
- SFX: victory-sting, hop-ready and handshake-3 lose their major thirds (open fifths / sus2 glimmers).

## Hold 4 (00:31–00:40, stopped early) — v2.0 pilots
- copper-reach explore t1–3, battle t1–3. Every take failed the new gates: the key profiles read **F / Bb major**
  (the plan itself spent 10 of 32 bars on bVI/bVII major chords and only 10 on the tonic; the battle ostinato over Bb
  was Bb–C–F–A, i.e. Bb Lydian), CLAP heard vocal-like pads in two explore takes (vocal 0.66 / 0.83; "Vangelis-like"
  invites choir pads) and the battle take leaned club (drum machine + bass ostinato). Stopped the hold rather than
  render title/exchange with the same harmonic flaw.
- Tools: CLAP mood recalibrated (a single dark-vs-happy pair calls even FAULTLINE's darkest pieces "happy"; now a
  four-pair composite gated against references). Bar 0 is now anchored on the take's first sustained sound (with
  two-bar chords the DTW and the chord match cannot resolve the beat phase; a one-beat error would put explore and
  battle a beat apart); `sync.py` adds a beat-shift test on beat-synchronous chroma (best shift must be 0).

## Plans v2.1 (00:50)
- Tonic on 40–57 % of bars, major chords (bVI / Phrygian bII) ≤ 14 %, v always minor; battle grooves are pedal
  ostinati on the tonic (root, root, b2, root, root, low 5th, b7, root) under the moving chords; exchange moved to
  A-minor lounge (D Dorian's major IV reads major); "Vangelis" removed; NEGATIVE adds wordless choir / vocal pads /
  humming and upbeat synthwave / outrun; CFG 1.6 → 1.8.

## Next
- Hold 5 (queued): v2.1 pilots — copper-reach explore/battle t1–3, title t1–3, exchange t1–2, relay-seven t1.
