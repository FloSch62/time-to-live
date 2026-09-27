# Alpha validation — 27 September 2026

TIME TO LIVE has a complete three-stage campaign from the prologue through the ending, with defeat, checkpoint
continuation, markets, modular tender upgrades, crew management, guardian encounters, and persistent Runbook
discoveries. This is a playable alpha; the checks below establish the tested scope, not release certification.

## Content and delivered media

| Content | Delivered |
| --- | ---: |
| Stages / guardians | 3 / 3 |
| Events / outcomes | 336 / 1,126 |
| Recovered messages / Runbook entries | 51 / 99 |
| Enemy types / weapons / drones / augments | 22 / 16 / 5 / 14 |
| Primary Krea artworks | 146 |
| Sprite frames / animations | 1,726 / 310 |
| YuE2 themes / music files | 14 / 22 |
| Sound-effect cues / variants | 64 / 89 |

Art provenance is in `art-src/manifest.json`. Original music scores, generated takes, selected versions, mastering
measurements, and accepted analysis flags are retained in `audio-src/`. Production assets are in `public/` and
copied into `dist/` by the build. Generator models and source takes are not shipped in the production bundle.

## Checks completed

- **74 automated tests pass.** Coverage includes save restoration, map reachability, event references, campaign
  completion and failure, all enemy layouts, service lifts and gangways, combat systems, and guardian mechanics.
- **TypeScript and Vite production build pass** with 117 modules bundled.
- **The built `dist/` runs through title, new voyage, prologue, relay, and chart** in an isolated browser,
  creating a persistent checkpoint and opening the chart overlay without errors.
- **15 browser flows pass** with no page errors or missing media: the four-page Field Guide, new voyage, prologue, chart, checkpoint
  continuation, campaign combat pause/settings/resume, events, markets, yard, Runbook, ending, defeat, all three
  guardians, an expanded tender, targeting, zoom, and pan. Layouts were checked at 1366, 1920, and 2560 pixels wide.
- **The additional UX audit passes:** all 16 guide cards fit above their control hints, the guide works at 1366 px,
  all ten installed systems and the reactor fit above the upgrade footer, and maintenance claims survive Continue.
- **All 1,462 event and outcome windows fit** using the actual fonts, including conditional choices.
- **All 178 PNGs and 111 OGGs decode in Chromium.** Audio has two channels, nonzero sampled levels, and music
  durations agree with metadata. The reference audit resolves 266 content paths, 14 music themes, and 64 effects.
- **All 146 main artworks pass dimension checks.** Required weapon and drone HUD icons are present.
- **WebAudio checks pass** for synchronized source startup, phase changes, interrupted equal-power crossfades,
  baked mastering gain, the non-looping defeat cue, effect loop bounds, idempotent stops, and bounded caches.
- **Nine live guardian fights pass in one browser page** over 90 seconds, with real boss music loaded, no page
  or HTTP errors, and at most six cached music buffers. Median frame intervals were 16.7 ms and 95th percentiles
  33.4 ms on this host. Post-warmup retained JavaScript heap grew by 428,544 bytes. This short soak does not
  establish multi-hour stability or total process-memory behavior.
- **All 22 delivered music files pass the configured speech detector.** The medium Whisper pass uses no VAD;
  low-confidence repetitive hallucinations remain in its reports. This is an automated check, not a listening sign-off.
- **All paired music layers match at zero measured beat and harmonic offsets after conforming.** Last Orders
  and the Core's final layer required recorded one-beat corrections. Some low-confidence local onset windows
  remain flagged. The final Core's confident windows have at most 5 ms relative onset lag.

Browser reports and screenshots are under `tools/shots/qa/`. The headless combat benchmark in
[`balance-combat.md`](balance-combat.md) records 1,116 fights across tender strengths and encounter depths.
[`balance-campaign.md`](balance-campaign.md) records the real-combat economy audit, including its policy limits.

## Stability and remaining review

The excessive art-processing allocation was replaced with bounded palette-matching chunks. Krea and YuE share
one GPU lock, and each generation process group has a 15 GiB RAM and 256 MiB swap ceiling. Processing and browser
checks have their own smaller limits. Completed model services and the inherited art loop have been stopped;
the development server on port 5181 remains available.

The music keeps its generative-performance review notes. In particular, the Core's Custody opening retains a
score-versus-club classifier warning; some tracks retain tonal-profile ambiguity and short phrase-level dips.
The supplied arrangements need human listening review. Balance and difficulty likewise need human playtesting;
automated victories demonstrate reachability and mechanics, not a polished difficulty curve. Browser checks
cover desktop Chromium, not a full cross-browser or mobile compatibility matrix.
