# Objective audit — 27 September 2026

The attached objective asks for a complete desktop alpha inspired by FTL in the FAULTLINE / Containerlab setting,
with three stages, consistent local Krea art, local YuE2 music, substantial tactical complexity, readable vessels,
and continued UI/UX and balance work after the first apparent completion.

| Requirement | Current implementation and evidence |
| --- | --- |
| Continue the existing work in a separate folder | `/home/clab/projects/clab/time-to-live`; the preserved Vite process serves port 5181 from this directory. FAULTLINE remains the reference project. |
| Three complete stages and lore | Copper Reach, Glass Cathedral and Blackout Heart; prologue, three guardians, stage transitions, ending and defeat. `docs/lore.md` establishes continuity; `src/content/` contains 336 events, 51 messages and 99 codex entries. The real-combat campaign sample includes complete, unforced victories. |
| FTL-inspired tactical roguelike complexity | Pause and command; reactor allocation, shield layers, weapon volleys and beams, ammunition, evasion, service-lift crew movement, repairs, fire, air, breaches, boarding enemies, drones, Veil, augments, modular rear/keel cars, upgrades, route pressure, stores, event choices, surrender, retreat and permanent defeat. Covered by mechanics tests, real combat benchmarks and browser flows. |
| One vessel / no character switching | One Lamplighter consist and its crew throughout a voyage. There is no separate player-character campaign or character switching. |
| Large, readable player and enemy; useful desktop space | Independent vessel areas fitted to hull bounds, large rooms and crew, separate enemy header and status strip, compact equipment controls. Screenshots cover all guardians, expanded cars and drones, and 1366/1920/2560 px desktop views. Readability does not require zoom. |
| Zoom and drag | Independent wheel zoom, middle/right drag, keyboard pan and reset; exercised in `tools/qa.mjs`. |
| Game presentation, no browser UI | Canvas-only game surface, bitmap fonts, brass controls and hand-authored sprite UI. `index.html` contains the canvas rather than DOM menus/forms. Title, map, encounters, shops, upgrades, guide and combat screenshots are under `tools/shots/qa/`. Fullscreen is available. |
| Many consistent Krea graphics | 146 primary local Krea 2 Turbo assets with prompts, seeds, recipes and source candidates recorded in `art-src/manifest.json`. Category sheets and gameplay compositions reviewed; art dimensions and every runtime image decode pass. |
| Pixel animations | 1,726 authored sprite frames across 310 animations; generation code in `tools/sprites/`. This uses the explicitly permitted hand-authored fallback. |
| Local YuE2 audio and requested musical influences | 14 themes / 22 tracks from local YuE2, original ABC scores, FAULTLINE instrumental colors and FTL-inspired synth arrangements. `audio-src/music/plans.py`, source takes, analysis and `audio-src/README.md` preserve the evidence. Adaptive layers, mastering, speech detection, beat/harmonic matching and runtime crossfades checked. Subjective listening notes remain documented as alpha review items. |
| Serialize heavy models; avoid repeating the memory failure | Shared GPU lock, bounded palette matching, memory-limited generation/processing services and bounded runtime audio caches. Generation jobs and the inherited idle loop are stopped. The model-free host has substantial available RAM. The live combat soak checks repeated scene cleanup. |
| Subagent restriction | No subagents were used during this continuation; no alternative model was substituted for the requested Opus subagents. |
| Continue polishing UI/UX and balance | The second audit found and corrected an underfunded campaign economy, shield-cost progression, stacked guardian defenses, unreliable exchange stock and overly rapid Core artillery. Added the Field Guide, visible maintenance receipts and chart explanations, fixed the Continue-menu spacing, and tested the fullest upgrade panel. |
| Reviewable, runnable alpha | Source, runtime media, provenance, play instructions, production `dist/`, tests, balance reports and screenshots are in the project. The production artifact opens the guide, creates a voyage, saves a checkpoint and opens the chart in Chromium. |

The detailed evidence and limits are in [alpha-validation.md](alpha-validation.md),
[balance-campaign.md](balance-campaign.md) and [balance-combat.md](balance-combat.md). Alpha completion does not mean
every route wins, all generative audio classifiers agree, or every possible browser/multi-hour session has been
tested. Those broader claims are not made.
