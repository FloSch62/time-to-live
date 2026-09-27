# TIME TO LIVE: audio (music + sound effects)

Everything here is the audio workstream's source, provenance and notes (contract §8). Deliveries live in
`public/audio/` (`music/*.ogg`, `music.json`, `sfx/*.ogg`, `sfx.json`). Nothing here is needed to run the game.

**Audit page:** run `npm run dev` and open `http://127.0.0.1:5181/audio-src/listen.html`
(or serve the project root with a local static HTTP server). It plays each theme's explore and battle files together, sample-synced
and looping on the recorded points, with a crossfade slider and a "jump to seam" button. Every SFX is a button.

## How the game should use the music

- `public/audio/music.json`: `{ "<id>": { "files": {"explore", "battle"} | {"main"} | {"custody", "emergency",
  "horizon", "main"}, "bpm", "key", "bars", "barSeconds", "duration", "loopStart", "loopEnd", "loop", "gainDb" } }`.
  Paths are relative to `public/`. `gainDb` is informational (already applied in the file).
- **Explore/battle crossfade (FTL-style):** decode both files, start two `AudioBufferSourceNode`s at the **same**
  `AudioContext` time and offset, both with `loop = true`, `loopStart`, `loopEnd` from `music.json`, each through its
  own `GainNode`. Keep the inactive one at gain 0 and crossfade equal-power over ~1.5–2 s when combat starts or ends
  (`g_explore = cos(x·π/2)`, `g_battle = sin(x·π/2)`). Both files have the same sample count and bar grid (bar *n*
  starts at *n* × `barSeconds` in both), so they stay aligned forever, including across loops. Calm layers receive a recorded static attenuation when needed, followed by a shared mastering gain, so battle is louder without compressing either performance.
- **event-horizon** has three synced phase layers (`custody`, `emergency`, `horizon`; `main` = custody): run all
  three together the same way and crossfade to the next layer when the Blackout Core changes phase.
- **Loops:** the first pass plays the intro (0 → `loopStart`); after that playback cycles `loopStart` → `loopEnd`.
  The seam is baked: fresh area pairs blend the last full bar before `loopEnd` into the matching chord before
  `loopStart`; earlier tracks use a 30 ms blend. The audio after `loopEnd` includes the closing recap and ring-out
  (with a 2 s fade), used only if the game lets a track end.
- `line-quiet` has `loop: false` (short game-over piece; play once).

## How the game should use the SFX

- `public/audio/sfx.json`: `{ "<id>": { "files": ["audio/sfx/<id>[-n].ogg", ...], "gain": 0, "loop": bool,
  ["loopStart", "loopEnd"] } }`. Pick a random variant when there are several. Levels are baked (UI quiet, weapons and
  hits in the middle, explosions and the ship's end loudest); `gain` is 0 everywhere and is there for mixing.
- Loops (`fire-loop`, `repair-loop`, `hop-charge`, `air-alarm`, `cable-creak`) are seamless: set
  `loop = true` with the recorded `loopStart`/`loopEnd` (exact sample bounds; a decoder may pad the end by a few ms).
- Direction v2 additions: `handshake-1/2/3` (the three handshake segments filling: HELLO, I HEAR YOU, I HEAR YOU HEAR
  ME; rising, the third resolves), `cable-creak` (quiet ambience loop), `couple`, `uncouple`, `refit`.

<!-- PICKS:BEGIN -->
## Music: what was delivered and why

| id | files | length | loop (s) | bars @ BPM, score key | gain | Whisper (no VAD) |
|---|---|---|---|---|---|---|
| `title` | `title.ogg` | 2:44.2 | 52.17–156.52 | 62 @ 92, Dm | -4.2 dB | main: clean |
| `relay-seven` | `relay-seven.ogg` | 2:27.8 | 37.89–138.95 | 46 @ 76, Dm | -2.3 dB | main: clean |
| `copper-reach` | `copper-reach-explore.ogg`, `copper-reach-battle.ogg` | 2:44.0 | 9.23–147.69 | 70 @ 104, Em | -5.2 dB | explore: clean; battle: clean |
| `rust-kingdom` | `rust-kingdom-explore.ogg`, `rust-kingdom-battle.ogg` | 2:50.5 | 9.60–153.60 | 70 @ 100, Gm | -6.8 dB | explore: clean; battle: clean |
| `exchange` | `exchange.ogg` | 2:20.4 | 71.49–132.77 | 54 @ 94, Am | -3.9 dB | main: clean |
| `iron-regent` | `iron-regent.ogg` | 2:27.3 | 41.38–140.69 | 70 @ 116, Dm | -4.8 dB | main: clean |
| `glass-cathedral` | `glass-cathedral-explore.ogg`, `glass-cathedral-battle.ogg` | 2:49.6 | 8.57–154.29 | 78 @ 112, F#m | -6.0 dB | explore: clean; battle: clean |
| `choir-weather` | `choir-weather-explore.ogg`, `choir-weather-battle.ogg` | 2:20.3 | 8.89–124.44 | 62 @ 108, C#m | -5.5 dB | explore: clean; battle: clean |
| `hollow-choir` | `hollow-choir.ogg` | 2:38.1 | 44.44–151.11 | 70 @ 108, Am | -0.9 dB | main: clean |
| `blackout-heart` | `blackout-heart-explore.ogg`, `blackout-heart-battle.ogg` | 2:38.5 | 8.00–144.00 | 78 @ 120, Am | -5.4 dB | explore: clean; battle: clean |
| `last-orders` | `last-orders-explore.ogg`, `last-orders-battle.ogg` | 2:46.3 | 7.62–152.38 | 86 @ 126, Bm | -4.8 dB | explore: clean; battle: clean |
| `event-horizon` | `event-horizon-custody.ogg`, `event-horizon-emergency.ogg`, `event-horizon-horizon.ogg` | 2:15.8 | 22.86–129.52 | 70 @ 126, Cm | -4.7 dB | custody: clean; emergency: clean; horizon: clean |
| `an-answer` | `an-answer.ogg` | 2:59.6 | 102.86–171.43 | 62 @ 84, F | -6.4 dB | main: clean |
| `line-quiet` | `line-quiet.ogg` | 0:50.5 | 13.71–41.14 (no loop) | 14 @ 70, Dm | -2.9 dB | main: clean |

### `title`
Why: Selected v2 pilot for stronger retro synth-score similarity, low vocal likelihood and stable beat grid. Whisper found no words. Preserve the generated key; tonal-profile flags and a brief phrase-level attenuation remain documented in the analysis. This standalone title cue is not required to match another layer harmonically.
- **main** = take `t2` (seed 986432): CLAP cinematic 0.918 (min 0.628), vocal max 0.134, FTL-likeness 0.308; conform rate 0.99941–1.00036 (≤ 1.0 cents), output grid phase 0.2 ms; delivered -19.0 LUFS, -4.0 dBTP, LRA 4.2.
  Automated flags retained: dropouts [(150.9, 0.5, 12.1)]; transposed +5 st (corr 0.44 vs 0.30); major-leaning (Bb 0.63 >= Dm 0.30).
- Other takes: `main/t1` rejected (lost plan (3 bars from bar 40), tempo x1.0304, drift [76.0, -68.0, 80.0] ms, CLAP vocal 0.71).

### `relay-seven`
Why: Alpha selection: very dark atmospheric cue (CLAP mood 0.780), no detected lexical speech, low vocal likelihood. YuE transposed the written key; this standalone cue preserves that performance. Tonal-profile flags are retained as advisory evidence, not hidden.
- **main** = take `t1` (seed 640043): CLAP cinematic 0.997 (min 0.98), vocal max 0.119, FTL-likeness 0.173; conform rate 0.99968–1.00048 (≤ 0.8 cents), output grid phase 2.2 ms; delivered -19.2 LUFS, -2.5 dBTP, LRA 10.4.
  Automated flags retained: transposed -5 st (corr 0.76 vs 0.48); major-leaning (A 0.75 >= Dm 0.28).

### `copper-reach`
Why: New E-minor melody and electronic arrangement, following the user-positive exploration t21 direction. Exploration t22 retains the new score with a more stable pulse. Raw score-fit warnings remain; paired beat and pitch checks are aligned.
- **explore** = take `t22` (seed 739235): CLAP cinematic 0.617 (min 0.256), vocal max 0.187, FTL-likeness 0.24; conform rate 0.99955–1.0002 (≤ 0.8 cents), output grid phase 0.0 ms; delivered -21.5 LUFS, -5.5 dBTP, LRA 6.9.
  Calm-layer attenuation before the shared delivery gain: -1.03 dB.
  Automated flags retained: lost plan (3 bars from bar 28).
  Listening-review indicators: v2 mood proxy (CLAP 0.177; bright windows 85%); club/EDM-leaning (CLAP score-vs-club 0.184, min 0.05).
- **battle** = take `t21` (seed 404706): CLAP cinematic 0.362 (min 0.026), vocal max 0.081, FTL-likeness 0.273; conform rate 0.99959–1.00045 (≤ 0.8 cents), output grid phase 0.0 ms; delivered -19.0 LUFS, -4.7 dBTP, LRA 6.3.
  Listening-review indicators: v2 mood proxy (CLAP 0.083; bright windows 94%); club/EDM-leaning (CLAP score-vs-club 0.087, min 0.008).
- Sync battle vs explore: 16/17 four-bar windows confident, lag median 0 ms, max |lag| 0 ms.
- Sync battle vs explore beat shift: best offset 0 beats; correlations {'-4': 0.4739, '-3': 0.5201, '-2': 0.5599, '-1': 0.6038, '0': 0.7256, '1': 0.6361, '2': 0.5749, '3': 0.5256, '4': 0.4676}.
- Sync battle vs explore pitch shift: best offset 0 semitones; correlations {'-6': 0.3589, '-5': 0.4355, '-4': 0.358, '-3': 0.3351, '-2': 0.3829, '-1': 0.4091, '0': 0.7256, '1': 0.439, '2': 0.378, '3': 0.3804, '4': 0.3485, '5': 0.4271}.
- Other takes: `explore/t21` rejected (drift [-70.0, -50.0] ms).

### `rust-kingdom`
Why: New G-minor pulse-synth theme with a more active battle groove. Battle receives 0.44 percent pitch-preserving tempo correction. Exploration phrase-fit warnings remain; paired timing and harmony are aligned inside the loop.
- **explore** = take `t21` (seed 756294): CLAP cinematic 0.592 (min 0.287), vocal max 0.185, FTL-likeness 0.233; conform rate 0.99958–1.0 (≤ 0.7 cents), output grid phase 0.0 ms; delivered -21.5 LUFS, -10.5 dBTP, LRA 5.0.
  Calm-layer attenuation before the shared delivery gain: -4.82 dB.
  Automated flags retained: lost plan (2 bars from bar 24).
  Listening-review indicators: v2 mood proxy (CLAP 0.119; bright windows 97%); club/EDM-leaning (CLAP score-vs-club 0.082, min 0.03); brief level dips to review [(115.9, 0.2, 20.4)].
- **battle** = take `t21` (seed 580208): CLAP cinematic 0.167 (min 0.059), vocal max 0.265, FTL-likeness 0.229; conform rate 0.99896–1.00271 (≤ 4.7 cents), output grid phase 0.0 ms; delivered -19.0 LUFS, -4.4 dBTP, LRA 5.9.
  Listening-review indicators: v2 mood proxy (CLAP 0.065; bright windows 100%); club/EDM-leaning (CLAP score-vs-club 0.024, min 0.012).
- Sync battle vs explore: 17/17 four-bar windows confident, lag median 0 ms, max |lag| 45 ms.
- Sync battle vs explore beat shift: best offset 0 beats; correlations {'-4': 0.4158, '-3': 0.4511, '-2': 0.5578, '-1': 0.6427, '0': 0.8072, '1': 0.646, '2': 0.5487, '3': 0.4538, '4': 0.4081}.
- Sync battle vs explore pitch shift: best offset 0 semitones; correlations {'-6': 0.2645, '-5': 0.3609, '-4': 0.2696, '-3': 0.3232, '-2': 0.3233, '-1': 0.3358, '0': 0.8072, '1': 0.3584, '2': 0.3391, '3': 0.3046, '4': 0.2917, '5': 0.3832}.

### `exchange`
Why: Replaces the bright v1 trade cue with a quiet, desolate felt-piano and analog-pad performance (dark 0.717, score-not-club 0.836). Raw instrumental speech scan clean. Accepted alpha performance variations: rubato in one late phrase, one brief attenuation and an ambiguous A-major/minor tonal profile. Timing is conformed; original flags remain visible.
- **main** = take `t3` (seed 747900): CLAP cinematic 0.964 (min 0.916), vocal max 0.392, FTL-likeness 0.218; conform rate 0.99855–1.00247 (≤ 4.3 cents), output grid phase 0.0 ms; delivered -19.0 LUFS, -3.5 dBTP, LRA 11.5.
  Automated flags retained: drift [-80.0] ms; dropouts [(82.0, 0.4, 13.3)]; major-leaning (A 0.72 >= Am 0.64).
- Other takes: `main/t1` rejected (lost plan (2 bars from bar 4), not dark enough (CLAP mood 0.223, need 0.33; bright windows 38%), club/EDM-leaning (CLAP score-vs-club 0.392, min 0.128), dropouts [(116.6, 0.8, 22.0)], major-leaning (A 0.45 >= Am 0.33)); `main/t2` rejected (lost plan (4 bars from bar 4), CLAP vocal 0.824, not dark enough (CLAP mood 0.233, need 0.33; bright windows 42%), club/EDM-leaning (CLAP score-vs-club 0.315, min 0.046), transposed +1 st (corr 0.55 vs -0.02), major-leaning (Bb 0.44 >= Am -0.06)); `main/t4` rejected (lost plan (1 bars from bar 36), dropouts [(91.4, 0.6, 14.6), (122.2, 0.4, 13.5), (132.2, 0.6, 14.2)], major-leaning (A 0.42 >= Am 0.41)).

### `iron-regent`
Why: Selected revised held-note guardian arrangement: stronger retro-score similarity (0.357), restrained percussion, stable timing and clean raw speech scan. Preserves the generated D-minor performance. Alpha review accepts tonal-profile ambiguity and 30 percent brighter CLAP windows; these mood flags remain documented.
- **main** = take `t3` (seed 191555): CLAP cinematic 0.718 (min 0.329), vocal max 0.348, FTL-likeness 0.357; conform rate 0.99928–1.00145 (≤ 2.5 cents), output grid phase 0.0 ms; delivered -19.0 LUFS, -5.8 dBTP, LRA 5.4.
  Automated flags retained: not dark enough (CLAP mood 0.351, need 0.26; bright windows 30%); major-leaning (Eb 0.43 >= Dm 0.27).
- Other takes: `main/t1` rejected (lost plan (1 bars from bar 36), not dark enough (CLAP mood 0.159, need 0.26; bright windows 78%), club/EDM-leaning (CLAP score-vs-club 0.208, min 0.025)); `main/t2` rejected (lost plan (1 bars from bar 36), not dark enough (CLAP mood 0.308, need 0.26; bright windows 46%), transposed +1 st (corr 0.52 vs 0.18), major-leaning (Eb 0.52 >= Dm 0.09)).

### `glass-cathedral`
Why: New F-sharp-minor FM/pluck theme. Battle t22 replaces t21 because the first arrangement lacked rhythmic contrast. Both chosen takes have clean raw timing and voice checks; brief energy dips remain review indicators.
- **explore** = take `t21` (seed 755951): CLAP cinematic 0.502 (min 0.204), vocal max 0.055, FTL-likeness 0.169; conform rate 0.99979–1.00025 (≤ 0.4 cents), output grid phase 0.0 ms; delivered -21.8 LUFS, -5.8 dBTP, LRA 6.7.
  Listening-review indicators: v2 mood proxy (CLAP 0.081; bright windows 100%); club/EDM-leaning (CLAP score-vs-club 0.027, min 0.007); brief level dips to review [(28.6, 0.2, 18.3), (31.8, 0.2, 15.8), (106.8, 0.2, 22.3)].
- **battle** = take `t22` (seed 125268): CLAP cinematic 0.315 (min 0.034), vocal max 0.079, FTL-likeness 0.273; conform rate 0.99977–1.00023 (≤ 0.4 cents), output grid phase -0.1 ms; delivered -19.0 LUFS, -5.9 dBTP, LRA 4.8.
  Listening-review indicators: v2 mood proxy (CLAP 0.081; bright windows 97%); club/EDM-leaning (CLAP score-vs-club 0.032, min 0.01).
- Sync battle vs explore: 19/19 four-bar windows confident, lag median 0 ms, max |lag| 0 ms.
- Sync battle vs explore beat shift: best offset 0 beats; correlations {'-4': 0.4374, '-3': 0.4672, '-2': 0.5539, '-1': 0.6068, '0': 0.7928, '1': 0.6497, '2': 0.5467, '3': 0.4671, '4': 0.4007}.
- Sync battle vs explore pitch shift: best offset 0 semitones; correlations {'-6': 0.244, '-5': 0.4062, '-4': 0.3283, '-3': 0.3208, '-2': 0.3548, '-1': 0.3235, '0': 0.7928, '1': 0.3297, '2': 0.3081, '3': 0.3552, '4': 0.3155, '5': 0.409}.
- Other takes: `battle/t21` rejected (CLAP vocal 0.507).

### `choir-weather`
Why: New C-sharp-minor FM lead and glass-pluck theme. The t22 pair restores calm exploration and driving battle; the first pair had reversed intensity. Both chosen takes have clean raw timing and voice checks.
- **explore** = take `t22` (seed 742024): CLAP cinematic 0.362 (min 0.176), vocal max 0.233, FTL-likeness 0.21; conform rate 0.99958–0.9998 (≤ 0.7 cents), output grid phase 0.0 ms; delivered -21.5 LUFS, -6.6 dBTP, LRA 2.1.
  Calm-layer attenuation before the shared delivery gain: -1.46 dB.
  Listening-review indicators: v2 mood proxy (CLAP 0.231; bright windows 35%); club/EDM-leaning (CLAP score-vs-club 0.169, min 0.059).
- **battle** = take `t22` (seed 563602): CLAP cinematic 0.282 (min 0.174), vocal max 0.049, FTL-likeness 0.225; conform rate 0.99917–0.99984 (≤ 1.4 cents), output grid phase 0.0 ms; delivered -19.0 LUFS, -5.0 dBTP, LRA 5.2.
  Listening-review indicators: v2 mood proxy (CLAP 0.073; bright windows 100%); club/EDM-leaning (CLAP score-vs-club 0.027, min 0.015); brief level dips to review [(48.0, 0.3, 13.2), (56.9, 0.3, 15.7), (59.2, 0.2, 15.5)].
- Sync battle vs explore: 15/15 four-bar windows confident, lag median 0 ms, max |lag| 0 ms.
- Sync battle vs explore beat shift: best offset 0 beats; correlations {'-4': 0.4422, '-3': 0.4992, '-2': 0.5883, '-1': 0.6536, '0': 0.7764, '1': 0.6294, '2': 0.5121, '3': 0.4361, '4': 0.4203}.
- Sync battle vs explore pitch shift: best offset 0 semitones; correlations {'-6': 0.2719, '-5': 0.4264, '-4': 0.3643, '-3': 0.3828, '-2': 0.376, '-1': 0.358, '0': 0.7764, '1': 0.3377, '2': 0.3383, '3': 0.3684, '4': 0.3648, '5': 0.4617}.
- Other takes: `battle/t21` rejected (lost plan (1 bars from bar 52), CLAP vocal 0.531); `explore/t21` ok, score 0.82 (cinematic 0.083, min 0.002).

### `hollow-choir`
Why: Selected sparse felt-piano, glass-bell and analog-pad guardian cue: dark 0.822, score-not-club 0.857, low vocal likelihood 0.083 and no raw lexical speech. This encounter uses ominous restraint. Global tempo is corrected with pitch preserved. Accepted alpha variations are brief quiet phrase gaps and an ambiguous A-major/minor profile; the original flags remain in the report.
- **main** = take `t4` (seed 620951): CLAP cinematic 0.987 (min 0.965), vocal max 0.083, FTL-likeness 0.26; conform rate 0.99888–1.00135 (≤ 2.3 cents), output grid phase 1.2 ms; delivered -19.0 LUFS, -3.2 dBTP, LRA 3.3.
  Automated flags retained: dropouts [(8.7, 0.5, 14.8), (15.1, 0.7, 13.9), (21.8, 0.5, 13.4)]; major-leaning (A 0.62 >= Am 0.51).
- Other takes: `main/t1` rejected (lost plan (6 bars from bar 12), drift [76.0] ms, not dark enough (CLAP mood 0.176, need 0.26; bright windows 87%), club/EDM-leaning (CLAP score-vs-club 0.216, min 0.024), dropouts [(14.6, 1.0, 15.9)], major-leaning (Bb 0.41 >= Am 0.29)); `main/t2` rejected (lost plan (2 bars from bar 36), not dark enough (CLAP mood 0.318, need 0.26; bright windows 50%), club/EDM-leaning (CLAP score-vs-club 0.511, min 0.051), dropouts [(10.6, 0.3, 12.4), (15.0, 0.4, 17.2), (19.5, 0.3, 13.8)], major-leaning (Bb 0.55 >= Am 0.10)); `main/t3` rejected (lost plan (1 bars from bar 36), not dark enough (CLAP mood 0.2, need 0.26; bright windows 70%), club/EDM-leaning (CLAP score-vs-club 0.302, min 0.11), dropouts [(108.4, 0.4, 12.4), (139.5, 0.4, 12.5), (144.0, 0.4, 17.6)], major-leaning (F 0.46 >= Am 0.44)); `main/t5` rejected (dropouts [(21.8, 0.5, 13.0), (35.2, 0.4, 12.6), (43.9, 0.6, 12.4)]).

### `blackout-heart`
Why: New A-minor theme. Exploration t22 uses lighter percussion and sustained bass after t21 was more driving than combat. Raw phrase-fit warnings remain and are assessed alongside the paired beat, pitch and timing checks.
- **explore** = take `t22` (seed 924083): CLAP cinematic 0.455 (min 0.237), vocal max 0.259, FTL-likeness 0.287; conform rate 0.9995–1.0005 (≤ 0.9 cents), output grid phase 0.0 ms; delivered -21.5 LUFS, -7.0 dBTP, LRA 4.4.
  Calm-layer attenuation before the shared delivery gain: -1.49 dB.
  Automated flags retained: lost plan (1 bars from bar 68).
  Listening-review indicators: v2 mood proxy (CLAP 0.144; bright windows 81%); club/EDM-leaning (CLAP score-vs-club 0.102, min 0.02).
- **battle** = take `t21` (seed 774657): CLAP cinematic 0.147 (min 0.014), vocal max 0.145, FTL-likeness 0.31; conform rate 0.99925–1.00075 (≤ 1.3 cents), output grid phase 0.0 ms; delivered -19.0 LUFS, -6.5 dBTP, LRA 4.9.
  Automated flags retained: lost plan (3 bars from bar 24).
  Listening-review indicators: v2 mood proxy (CLAP 0.057; bright windows 97%); club/EDM-leaning (CLAP score-vs-club 0.028, min 0.006); major-leaning (Bb 0.48 >= Am 0.31).
- Sync battle vs explore: 18/19 four-bar windows confident, lag median 0 ms, max |lag| 5 ms.
- Sync battle vs explore beat shift: best offset 0 beats; correlations {'-4': 0.3994, '-3': 0.4474, '-2': 0.4897, '-1': 0.5392, '0': 0.6584, '1': 0.5772, '2': 0.5231, '3': 0.4568, '4': 0.3759}.
- Sync battle vs explore pitch shift: best offset 0 semitones; correlations {'-6': 0.3339, '-5': 0.3864, '-4': 0.3244, '-3': 0.319, '-2': 0.3147, '-1': 0.4324, '0': 0.6584, '1': 0.3981, '2': 0.3703, '3': 0.3375, '4': 0.3472, '5': 0.3255}.
- Other takes: `explore/t21` ok, score 1.092 (cinematic 0.099, min 0.021).

### `last-orders`
Why: New B-minor finale at 126 BPM: restrained exploration and strongly driving combat. Raw phrase-fit warnings remain. Three onset windows favor a sixteenth-note offset by only 0.02-0.05 correlation; both recordings independently lock at 0 ms in those windows, with zero best beat/pitch shift. These are retained as rhythmic-pattern ambiguities, not corrected by shifting the music.
- **explore** = take `t21` (seed 962514): CLAP cinematic 0.967 (min 0.881), vocal max 0.033, FTL-likeness 0.309; conform rate 0.99974–1.00026 (≤ 0.5 cents), output grid phase 0.2 ms; delivered -21.5 LUFS, -9.9 dBTP, LRA 4.9.
  Calm-layer attenuation before the shared delivery gain: -4.44 dB.
  Automated flags retained: lost plan (2 bars from bar 36).
  Listening-review indicators: v2 mood proxy (CLAP 0.142; bright windows 94%); club/EDM-leaning (CLAP score-vs-club 0.259, min 0.147).
- **battle** = take `t21` (seed 137700): CLAP cinematic 0.244 (min 0.002), vocal max 0.243, FTL-likeness 0.292; conform rate 0.99974–1.00026 (≤ 0.5 cents), output grid phase 0.0 ms; delivered -19.1 LUFS, -4.8 dBTP, LRA 7.2.
  Automated flags retained: lost plan (3 bars from bar 28).
  Listening-review indicators: v2 mood proxy (CLAP 0.058; bright windows 97%); club/EDM-leaning (CLAP score-vs-club 0.064, min 0.005).
- Sync battle vs explore: 20/21 four-bar windows confident, lag median 0 ms, max |lag| 120 ms.
- Sync battle vs explore beat shift: best offset 0 beats; correlations {'-4': 0.4832, '-3': 0.5079, '-2': 0.5743, '-1': 0.6152, '0': 0.7324, '1': 0.6423, '2': 0.5894, '3': 0.5072, '4': 0.441}.
- Sync battle vs explore pitch shift: best offset 0 semitones; correlations {'-6': 0.2719, '-5': 0.421, '-4': 0.3612, '-3': 0.2995, '-2': 0.3589, '-1': 0.3131, '0': 0.7324, '1': 0.3631, '2': 0.3459, '3': 0.3802, '4': 0.3217, '5': 0.4475}.

### `event-horizon`
Why: Alpha selection: darker piano-led Custody t3, restrained synth Emergency t2, and ominous Horizon t3. All raw speech scans are clean. Custody retains a score-versus-club classifier warning despite its darker mood result; its opening arrangement remains a listening-review item. Tonal-profile ambiguity, brief phrase dips, and local timing/adherence flags are retained. The layers share one grid; Horizon is advanced one source beat to correct its measured harmonic phase. Custody and Emergency are attenuated below Horizon.
- **custody** = take `t3` (seed 540577): CLAP cinematic 0.668 (min 0.472), vocal max 0.214, FTL-likeness 0.143; conform rate 0.99804–1.00014 (≤ 3.4 cents), output grid phase 0.0 ms; delivered -23.0 LUFS, -8.3 dBTP, LRA 2.8.
  Calm-layer attenuation before the shared delivery gain: -4.65 dB.
  Automated flags retained: club/EDM-leaning (CLAP score-vs-club 0.369, min 0.184); dropouts [(60.4, 0.4, 13.8), (64.3, 0.3, 12.9), (79.4, 0.4, 15.7)]; major-leaning (C 0.55 >= Cm 0.51).
- **emergency** = take `t2` (seed 674201): CLAP cinematic 0.91 (min 0.685), vocal max 0.017, FTL-likeness 0.306; conform rate 0.99486–1.00483 (≤ 8.9 cents), output grid phase 1.2 ms; delivered -21.0 LUFS, -6.0 dBTP, LRA 4.5.
  Calm-layer attenuation before the shared delivery gain: -1.48 dB.
  Automated flags retained: drift [40.0] ms; dropouts [(113.8, 0.4, 12.5)].
- **horizon** = take `t3` (seed 409954): CLAP cinematic 0.867 (min 0.449), vocal max 0.053, FTL-likeness 0.187; conform rate 0.99659–1.00341 (≤ 5.9 cents), output grid phase 0.0 ms; delivered -19.0 LUFS, -3.7 dBTP, LRA 8.8.
  Paired phase correction: +1 source beats before conforming.
  Automated flags retained: lost plan (1 bars from bar 64); drift [-62.0] ms; dropouts [(7.7, 0.3, 14.8), (11.6, 0.3, 15.5), (13.4, 0.5, 18.6)]; major-leaning (C 0.63 >= Cm 0.47).
- Sync emergency vs custody: 10/17 four-bar windows confident, lag median 0 ms, max |lag| 5 ms.
- Sync horizon vs custody: 12/17 four-bar windows confident, lag median 0 ms, max |lag| 5 ms.
- Sync emergency vs custody beat shift: best offset 0 beats; correlations {'-4': 0.5869, '-3': 0.6067, '-2': 0.6491, '-1': 0.7239, '0': 0.8284, '1': 0.773, '2': 0.695, '3': 0.6377, '4': 0.6303}.
- Sync emergency vs custody pitch shift: best offset 0 semitones; correlations {'-6': 0.2133, '-5': 0.2575, '-4': 0.2, '-3': 0.2668, '-2': 0.2918, '-1': 0.3632, '0': 0.8284, '1': 0.3563, '2': 0.2665, '3': 0.2497, '4': 0.2644, '5': 0.3683}.
- Sync horizon vs custody beat shift: best offset 0 beats; correlations {'-4': 0.5164, '-3': 0.5243, '-2': 0.5613, '-1': 0.6175, '0': 0.6883, '1': 0.6236, '2': 0.5752, '3': 0.5456, '4': 0.5219}.
- Sync horizon vs custody pitch shift: best offset 0 semitones; correlations {'-6': 0.2428, '-5': 0.2672, '-4': 0.2776, '-3': 0.2704, '-2': 0.2487, '-1': 0.3522, '0': 0.6883, '1': 0.3139, '2': 0.2195, '3': 0.2509, '4': 0.2219, '5': 0.3671}.
- Other takes: `custody/t1` rejected (not dark enough (CLAP mood 0.196, need 0.26; bright windows 68%), club/EDM-leaning (CLAP score-vs-club 0.415, min 0.02)); `custody/t2` rejected (drift [80.0, -52.0, -80.0] ms, not dark enough (CLAP mood 0.219, need 0.26; bright windows 60%), club/EDM-leaning (CLAP score-vs-club 0.448, min 0.172), dropouts [(91.0, 0.3, 15.5), (102.5, 0.3, 17.9), (106.2, 0.4, 19.5)]); `emergency/t1` rejected (lost plan (1 bars from bar 12), not dark enough (CLAP mood 0.17, need 0.26; bright windows 76%), club/EDM-leaning (CLAP score-vs-club 0.237, min 0.021), dropouts [(22.0, 0.3, 16.4), (67.2, 0.4, 14.3), (67.8, 0.3, 12.2)]); `horizon/t1` rejected (lost plan (2 bars from bar 20), not dark enough (CLAP mood 0.309, need 0.26; bright windows 29%)); `horizon/t2` rejected (not dark enough (CLAP mood 0.166, need 0.26; bright windows 92%), club/EDM-leaning (CLAP score-vs-club 0.425, min 0.132), dropouts [(29.8, 0.7, 12.5), (41.2, 0.7, 20.5), (45.0, 0.7, 24.6)]); `horizon/t4` rejected (not dark enough (CLAP mood 0.292, need 0.26; bright windows 48%), club/EDM-leaning (CLAP score-vs-club 0.435, min 0.185), dropouts [(11.1, 0.4, 18.6), (13.0, 0.4, 14.6), (14.8, 0.5, 15.9)], major-leaning (C 0.62 >= Cm 0.53)).

### `an-answer`
Why: Selected hopeful ending: raw timing, non-club mood and instrumental speech checks pass. The ending deliberately opens into F major. Original takes and analysis retained.
- **main** = take `t1` (seed 701619): CLAP cinematic 0.801 (min 0.332), vocal max 0.18, FTL-likeness 0.325; conform rate 0.99928–1.00068 (≤ 1.2 cents), output grid phase 0.0 ms; delivered -19.0 LUFS, -6.2 dBTP, LRA 4.4.

### `line-quiet`
Why: Selected restrained defeat cue: D minor, dark non-club arrangement, raw speech scan clean. Small global tempo correction conforms the written pulse; cue plays once and ends.
- **main** = take `t1` (seed 445388): CLAP cinematic 0.846 (min 0.789), vocal max 0.169, FTL-likeness 0.171; conform rate 0.99979–1.00023 (≤ 0.4 cents), output grid phase 9.0 ms; delivered -19.0 LUFS, -3.0 dBTP, LRA 4.2.

## SFX: what was delivered

| id | variants | length | level (target) | loop | layers (variant 1) |
|---|---|---|---|---|---|
| `laser-fire` | 3 | 0.42 s | -13.4 (-13) |  | SA: elec_crack, relay_clack + synth |
| `laser-heavy` | 2 | 0.66 s | -11.1 (-11) |  | SA: elec_crack, heavy_zap + synth |
| `ion-fire` | 2 | 0.75 s | -13.2 (-13) |  | SA: arc_buzz + synth |
| `beam-fire` | 2 | 1.40 s | -13.1 (-13) |  | SA: arc_buzz + synth |
| `payload-launch` | 2 | 0.97 s | -12.0 (-12) |  | SA: pneu_launch + synth |
| `flak-fire` | 2 | 0.83 s | -12.1 (-12) |  | SA: cannon, elec_crack + synth |
| `shield-hit` | 3 | 0.47 s | -14.3 (-14) |  | SA: cable_twang, elec_crack + synth |
| `shield-up` | 1 | 0.81 s | -19.2 (-19) |  | SA: powerup + synth |
| `shield-down` | 1 | 0.88 s | -17.2 (-17) |  | SA: elec_crack, powerdown + synth |
| `hull-hit-small` | 3 | 0.67 s | -12.1 (-12) |  | SA: debris, metal_clang + synth |
| `hull-hit-big` | 2 | 1.24 s | -9.5 (-9) |  | SA: debris, explosion, metal_heavy + synth |
| `miss` | 2 | 0.56 s | -18.4 (-18) |  | SA: whoosh + synth |
| `explosion-room` | 3 | 1.30 s | -9.2 (-9) |  | SA: debris, explosion, metal_clang + synth |
| `ship-destroyed` | 1 | 4.08 s | -8.6 (-8) |  | SA: explosion, explosion_big, powerdown, relay_clack + synth |
| `fire-loop` | 1 | 7.20 s | -24.0 (-24) | yes | SA: fire + synth |
| `breach` | 2 | 1.85 s | -12.2 (-12) |  | SA: air_rush, metal_tear + synth |
| `air-alarm` | 1 | 1.20 s | -21.9 (-22) | yes | synth only |
| `hull-alarm` | 1 | 1.00 s | -15.9 (-16) |  | synth only |
| `door-open` | 2 | 0.91 s | -21.3 (-21) |  | SA: air_brake, door_slide + synth |
| `door-close` | 2 | 0.71 s | -20.2 (-20) |  | SA: door_thud + synth |
| `repair-loop` | 1 | 4.00 s | -26.4 (-26) | yes | SA: ratchet, sparks + synth |
| `repair-done` | 1 | 1.60 s | -19.0 (-19) |  | SA: relay_clack + synth |
| `crew-select` | 1 | 0.11 s | -25.1 (-25) |  | synth only |
| `crew-move` | 1 | 0.07 s | -26.0 (-26) |  | synth only |
| `crew-fight` | 3 | 0.76 s | -18.3 (-18) |  | SA: scuffle + synth |
| `crew-stopped` | 1 | 0.90 s | -18.9 (-19) |  | SA: relay_clack + synth |
| `boarders` | 1 | 1.65 s | -15.1 (-15) |  | SA: clamp + synth |
| `power-up` | 1 | 0.08 s | -24.1 (-24) |  | SA: relay_clack + synth |
| `power-down` | 1 | 0.08 s | -25.0 (-25) |  | SA: relay_clack + synth |
| `power-denied` | 1 | 0.28 s | -22.9 (-23) |  | synth only |
| `weapon-charged` | 1 | 0.97 s | -22.0 (-22) |  | synth only |
| `weapon-select` | 1 | 0.12 s | -24.1 (-24) |  | SA: switch + synth |
| `hop-charge` | 1 | 2.00 s | -24.0 (-24) | yes | SA: motor_spool + synth |
| `hop-ready` | 1 | 2.60 s | -19.0 (-19) |  | synth only |
| `hop` | 1 | 3.54 s | -12.2 (-12) |  | SA: cable_twang, relay_clack, switchgear, wheel_hiss + synth |
| `arrive` | 1 | 3.17 s | -18.4 (-18) |  | SA: air_brake, cable_brake, relay_clack, switchgear, wheel_hiss + synth |
| `ui-click` | 1 | 0.01 s | -27.1 (-27) |  | synth only |
| `ui-hover` | 1 | 0.02 s | -32.9 (-33) |  | synth only |
| `ui-back` | 1 | 0.13 s | -27.2 (-27) |  | synth only |
| `ui-open` | 1 | 0.16 s | -26.0 (-26) |  | synth only |
| `buy` | 1 | 1.16 s | -20.1 (-20) |  | SA: coins + synth |
| `sell` | 1 | 1.10 s | -21.0 (-21) |  | SA: coins + synth |
| `salvage-pickup` | 2 | 0.59 s | -20.4 (-20) |  | SA: scrap + synth |
| `event-open` | 1 | 1.54 s | -23.0 (-23) |  | SA: squelch + synth |
| `map-open` | 1 | 0.53 s | -24.1 (-24) |  | SA: relay_clack, whoosh + synth |
| `seal-advance` | 1 | 2.63 s | -16.1 (-16) |  | SA: slam_far + synth |
| `lamp-on` | 1 | 1.15 s | -22.3 (-22) |  | SA: lamp_buzz + synth |
| `glass-bell` | 2 | 4.84 s | -18.1 (-18) |  | SA: glass_bell + synth |
| `radio-squelch` | 2 | 1.00 s | -21.4 (-21) |  | SA: squelch + synth |
| `page-lamp` | 1 | 3.47 s | -18.9 (-19) |  | SA: lamp_buzz, relay_clack + synth |
| `victory-sting` | 1 | 3.46 s | -16.0 (-16) |  | synth only |
| `defeat-sting` | 1 | 4.06 s | -17.0 (-17) |  | synth only |
| `drone-launch` | 1 | 0.66 s | -16.1 (-16) |  | SA: pneu_launch, servo + synth |
| `veil-on` | 1 | 1.43 s | -19.1 (-19) |  | synth only |
| `veil-off` | 1 | 1.60 s | -19.1 (-19) |  | synth only |
| `ion-hit` | 2 | 0.71 s | -14.2 (-14) |  | SA: arc_buzz, elec_crack + synth |
| `teleport-in` | 2 | 0.55 s | -16.2 (-16) |  | SA: clamp, heavy_zap + synth |
| `handshake-1` | 1 | 0.95 s | -21.0 (-21) |  | synth only |
| `handshake-2` | 1 | 0.96 s | -21.0 (-21) |  | synth only |
| `handshake-3` | 1 | 1.05 s | -19.9 (-20) |  | synth only |
| `cable-creak` | 1 | 7.00 s | -32.1 (-32) | yes | SA: cable_creak + synth |
| `couple` | 1 | 1.26 s | -15.1 (-15) |  | SA: cable_twang, clamp, scrap, switchgear + synth |
| `uncouple` | 1 | 0.78 s | -16.3 (-16) |  | SA: air_brake, cable_twang, metal_clang, switch + synth |
| `refit` | 1 | 2.11 s | -17.3 (-17) |  | SA: clamp, powerup, ratchet, relay_clack, scrap, switchgear + synth |
<!-- PICKS:END -->

## Direction (read this first)

**v4 fresh compositions (2026-09-27).** The user rejected Copper Reach's melody and asked
for new exploration/battle music guided by the overall FTL / Ben Prunty / Multiverse
sound, including how the references develop intensity. The six area pairs now have
new source scores in `music/compositions/`; the delivery manifest and master records
identify what has actually been delivered. Earlier v2 deliveries remain in
`music/archive-v2/`. V3 reinterpretations and the first native-planner v4 pilot are
superseded, with their source files retained.

The [reference study](music/references/arrangement-study.md) examines six complete
Multiverse pairs over time and compares against the local library of 64 recordings.
Exploration has moving synth patterns and expressive melodic answers. Battle uses a
more definite bass/drum groove, builds intensity, opens into a contrasting middle,
and returns with developed counterpoint. The previous rules demanding almost static
minor harmony, mostly whole notes and universally subdued combat are superseded for
these pairs. Electronic timbres differ by area: dusty analog pulses, glassy FM
sequences, airy signals, resonant low machinery and precise clockwork patterns.

`music/compose_editorial.py` writes original scores from blank; `fresh_plans.py`
validates their bar grid and loads `compositions/selected.json`. The rejected old
melodies and reference recordings are not score inputs. YuE2 receives the new ABC
and text instrumentation/arrangement brief; its installed interface does not accept
reference audio. Reference classifiers are analysis aids, not a listening verdict.

## Music pipeline (`music/`)

1. **Plans** (`music/plans.py`): one ABC plan per piece: four-bar sections (chords + one Ins line, `L:1/32`, every bar
   exactly one 4/4 measure) arranged by a form: intro → loop body → 2 tail bars. An area theme is rendered twice from
   the same plan: `explore` with a calm style text and `battle` with a driving one; the battle version may replace a
   section's Ins line with a denser rhythm **on the same chords**, never changing the bar count. Block labels are
   non-vocal only (`intro / instrumental / interlude / outro`): YuE2 plans singing for verse/chorus/bridge
   (faultline lore round 3). Style texts never mention voices.
2. **Generation** (`music/gen.py`): YuE2-3B + YuE2-Vae (the faultline `.venv-score` `yue2` package, unquantized,
   CUDA, AR offload, 12 GiB pipeline budget), **classifier-free guidance 1.6 for v4**: the negative branch is the
   same instruction + ABC with a `[Tags]` text naming vocals, sung/spoken words, choir words and generic EDM, so
   logits = neg + cfg · (pos − neg) (faultline `gen2.py`). Every take keeps `score.abc`, `request.json` (style, seed,
   ABC), `config.json` (effective generation config), `gen.json` (CFG, negative, seed, plan hash, timing),
   `result.json`, `semantic.npy`, `latent.npy` and the native `audio.flac` in `music/takes/<piece>/<version>/t<n>/`.
   Seeds: `plans.seed(piece, version, n)`.
3. **Analysis** (`music/tools/`, numpy in `.venv-score`):
   - `align.py`: estimates tempo and timing rather than assuming the render followed the score. A global comb fit on the onset flux gives the take's beat period and phase; melody-aware DTW of the plan
     (faultline lore `dtw.py`, generalised) finds bar 0 and checks that every bar lies within a beat of its grid time
     (suspected dropped or added bars are flagged for review); a per-4-bar local phase measures drift.
   - `judge.py`: CLAP (laion/clap-htsat-unfused) per 10 s window: cinematic/synth-score vs techno/EDM, vocal vs
     instrumental, and similarity to "retro synth space game soundtrack" descriptions.
   - `speech.py`: faster-whisper medium (CPU, int8) on the raw take (with VAD) and on every delivered file (without
     VAD, stricter); a confident multi-word segment rejects the take (faultline lore rule, hallucination filter).
   - `evaluate.py`: quality flags (lost plan, > 2 % global tempo correction, drift > 30 ms in a 4-bar window, Whisper
     words, CLAP vocal > 0.5, dropouts, wrong key, short ring-out) and a soft score (CLAP cinematic mean + ½ min +
     3 × FTL-likeness − 0.3 × vocal), loudness and the loop-seam match.
4. **Conform** (`conform.py`): output time → take time runs through one anchor per four-bar window (the global beat
   line plus that window's measured offset, confident windows only); the take is resampled along that map with a
   32-tap Kaiser-windowed sinc. Larger global tempo errors are corrected first with Rubberband while keeping pitch;
   the remaining small timing corrections move pitch only by their local rate (recorded in the conform report). Bar *n* then starts at exactly *n* × 240/BPM s. Verification: the output's own comb fit (tempo,
   grid phase, per-window error) and `sync.py` (onset cross-correlation of the two versions per 4-bar window).
5. **Master** (`master.py`): static attenuation keeps exploration at least 2.5 LU below battle (Core custody/emergency: 4/2 LU below horizon), followed by one constant gain per piece (the loudest version, battle, to −19 LUFS integrated; lower
   if any version's true peak would pass −2 dBTP); no compression/limiting/EQ. Lossless masters
   `music/masters/<piece>[-<version>].flac` (48 kHz stereo 24-bit); delivery 48 kHz stereo Vorbis q5, re-measured.

V4 batches use `bash tools/runtime/render-music.sh piece:explore:21 piece:battle:21`.
It serializes GPU use, keeps host memory below 11 GiB with no swap, and stops each
batch after a bounded hold. Completed takes are skipped on resumption; semantic
checkpoints let interrupted acoustic stages resume with the same request and seed.
The model is released between semantic generation, acoustic synthesis and decoding.
Acoustic synthesis uses fused Flash attention with full-query causal prefill (tiled
causal masks are unsupported by this backend). The 12 GiB pipeline setting caps
PyTorch allocation at 10 GiB, leaving space for the Windows desktop.
`bash tools/runtime/review-music.sh piece` runs one bounded CPU review at a time,
serially with generation; no extra audio-caption model is required.

V4 game loops stop before the generated closing recap. Their last chord matches
the pre-loop chord, allowing a one-bar equal-power blend into the next cycle.
The full source performance and raw analysis remain available. Flags outside the
played loop do not reject an otherwise usable loop; uncertain in-loop flags remain
visible for review. `--preview` masters into `music/previews/` without changing the
runtime manifest. `bash tools/runtime/check-music-deliveries.sh --preview` scans the
exact preview encodings without VAD and records their hashes. Selection is recorded
in `music/compositions/delivery-selection.json`; `music/tools/promote_previews.py`
verifies the selection, timing, encoding and speech reports before copying the
checked files into the game. The listening page supports current, previous and
candidate sets.

## SFX pipeline (`sfx/`)

- `gen.py`: Stable Audio 3 Small SFX (`stabilityai/stable-audio-3-small-sfx`, faultline `.work/sfx/.venv`, fp16,
  8 pingpong steps, CFG 1.0): 39 single-event element pools × 2 prompts × 8 seeds (≥ 3 s windows, cropped later; the
  model emits noise bursts below ~2 s). Takes + prompts + seeds in `sfx/el/takes.json`.
- `rank.py`: crop (hits: anchored on the loudest moment, ending at the first quiet gap; beds: the steadiest stretch)
  and CLAP-rank each pool (prompt + element text − unwanted classes − soft-attack/noise/unsteadiness penalties) →
  `sfx/el/ranked.json`.
- `synth.py`: deterministic numpy/scipy synthesis for the crisp retro elements (lasers, ion, beams, UI blips, power,
  alarms, chimes, stings, the handshake tones, the trolley thrum, brake squeal).
- `build.py`: one recipe per cue (layers with gain/offset/filters/varispeed, a small shared room), mastered to its
  loudness tier (K-weighted peak momentary loudness for one-shots, mean loudness for loops), peaks ≤ −3 dBFS,
  48 kHz stereo Vorbis q5. Loops are made seamless (bed crossfaded into itself, or exactly periodic synthesis).
  `sfx/manifest.json` lists every variant's layers with the element take, prompt, seed and score. Lossless masters in
  `sfx/masters/`.

## Licenses

- **YuE2** (music): code and model-weight terms copied verbatim to `licenses/YuE2-LICENSE`,
  `licenses/YuE2-MODEL_LICENSE` and `licenses/YuE2-THIRD_PARTY_NOTICES.md` (from faultline `soundtrack/licenses/`).
  Model weights are not shipped.
- **Stable Audio 3 Small SFX** (sound-effect layers): Stability AI Community License, copied to
  `licenses/StableAudio3-COMMUNITY_LICENSE.md` (+ `StableAudio3-NOTICE`, the Gemma terms notice of its text encoder).
  Terms that matter here: free for research, non-commercial use and commercial use by individuals/organisations under
  USD 1M annual revenue; **commercial use requires registering with Stability AI** (stability.ai/community-license);
  we own the outputs (§IV.c.iii); outputs may not be used to train other foundation models; the "Powered by
  Stability AI" / Notice-file obligations apply when distributing the model or derivative works (outputs are not
  derivative works by the license's definition), so the game ships no model and needs no notice for the audio itself.
  Crediting "Sound effects partly generated with Stable Audio 3 Small (Stability AI)" in the credits is courteous.
- Synthesized layers are original code in this folder.
