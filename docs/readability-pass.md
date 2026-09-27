# Room, vessel and crew readability pass — 2026-09-27

The Lamplighter now has 13 rooms instead of 19. System bays are wider, secondary compartments are consolidated, and doors and service lifts keep the entire consist connected. The two refit sockets remain available. Existing saves referencing removed rooms migrate to valid stations.

Rooms use their machinery and built-in fittings as their identity. There are no overhead room-name strips. Large cropped Krea furnishings sit against distinct architecture: traction pipes and vents, munitions racks, capacitor banks, observation glazing, medical cabinets, instrument screens, pressure tanks, workshop tools, bunks and mess fittings. Small system icons show power and damage state; hover still supplies the detailed room name and rules. The foreground remains available to crew, fire and breaches.

The pass delivers 21 room furnishings, 16 replaced weapons and 11 replaced hostile hulls. The Iron Regent has a new silhouette and Krea artwork: a solid armored gate engine, a forward shield and lock lens, a raised command section with hydraulic supports, and ribbed power blocks below. Its room grid and guardian mechanics are unchanged. Coil Serpent and Quarantine Drone retain their previous hull art because the new candidates did not contain the cutaway satisfactorily.

All accepted local Krea sources, prompts, seeds and pixel processing parameters are recorded in `art-src/manifest.json` and `art-src/readability-picks.json`. `tools/art/promote-readable.py` reproduces the explicit accepted list, including the second Thermite variant. No audio was changed. Generation was sequential under the shared GPU lock and the existing 15 GiB memory ceiling; model services stopped after each batch.

At a relay, click a crew member or roster portrait, or use F1–F10, then right-click a room to move. Shift adds to selection. Crew visibly walk through doors and queue for service lifts, including attached cars. R recalls saved stations; Shift+R updates stations. Their current room and saved station persist separately across Continue and combat. Dockside movement does not heal, grant XP or run combat. Hover crew for health, skills, species traits and current task. The relay uses middle drag for panning, reserving right-click for crew orders.

Validation evidence is recorded in `tools/shots/readability/`, the general `tools/shots/qa/` browser reports, and `docs/balance-readability.md`. The layout regression tests cover all 30 rear/keel combinations and all 22 enemy layouts. The balance sample contains 372 fights; a separate 32-run real-combat campaign sample reached stage 2 in 18 runs, stage 3 in 7, and won once, without timeouts. This is the fixed autopilot's behavior, not a measured human win rate.

## Final checks

- 79 simulation and save tests passed; TypeScript and Vite production build passed.
- 15 browser flows, focused crew interaction tests, dense ten-crew relay layout and production entry-point smoke passed.
- No room/roster/relay-notice overlap with ten crew, both attached cars, a hazard and earned relay stores.
- 299 runtime asset references and 167 delivered-art dimensions passed; all manifest file hashes match.
- Chromium decoded all 199 PNGs and 111 Ogg files. The replacement Regent was also rendered and checked in-game.
- Final screenshots reviewed at 1366×768, 1920×1080 and 2560×1440.
- Nine repeated live guardian fights: no browser errors, 16.7 ms median and 33.4 ms p95 frame intervals, 432,868 bytes retained JavaScript heap growth after warm-up; music cache remained bounded at six files.

Screenshots: `tools/shots/readability/rooms-detailed.png`, `regent-redesign.png`, `regent-1366.png`, `regent-2560.png`, `relay-full.png`, `relay-ten-crew.png`, and `equipment.png`. Focused machine-readable reports: `tools/shots/readability/report.json` and `layout.json`.
