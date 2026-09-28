# Design polish: plan and implementation record

This document replaces the earlier "implementation and verification" note. That note described the previous pass
as complete, but the game does not look like it. It had passing tests, pixel-difference checks and asset-loading
audits, yet the shipped result still has overlapping HUD panels, clipped and overflowing text, crew that are hard to
find, two new vessels whose hulls do not hang from their carrier, and scenery that reads as posterized oil painting
rather than pixel art. **Automated checks prove wiring, not quality.** Every item below is accepted only after a
person or agent has looked at real in-game screenshots at 1920×1080 and 1366×768.

The [current rules](current-design.md) and [lore](lore.md) remain the design and world references. The earlier
note is kept at the end as historical context.

---

## 1. Assessment (27 Sep 2026, screenshots of the running build)

### 1.1 Art

| Area | What is wrong |
| --- | --- |
| Backgrounds (`bg/*`, 18 images) | Painted at 2560×1440 and pixelized to 1920×1080 in 2×2 cells. On screen they read as a posterized oil painting: mottled speckle in skies and clouds, painterly gradients, soft mushy details and no deliberate pixel clusters. That is FAULTLINE's oil-painting recipe pushed through a pixelizer, not pixel art. |
| Lore illustrations (`events/*` 44, `ending/*` 6, title, Relay Seven, line-quiet) | Flat vector illustration, pixelized. Figures are generic silhouettes. The title shows a generic tram with a hanging lantern instead of a lamplighter-pattern tender on its trolley. |
| Glasswing and Switchback hulls | Flat rectangular slabs with no nose, cupola or keel shaping. Glasswing's drive trolley is a wheeled cart floating above the roof that never meets the carrier. Switchback's grip arms are hairlines, and its roof equipment floats. Neither reads as a lamplighter-pattern car. |
| Enemy hulls | Packet Leech shows a low-resolution mosaic block above its roof in combat. All enemy hulls need an in-game check. |
| Combat backdrop overlays | The sun glare draws a black eclipse disk that does not belong to any world object. The procedural overlays were tuned for the old paintings. |

### 1.2 Interface

| Screen | What is wrong |
| --- | --- |
| Combat | The incoming-hail panel covers half the enemy vessel. The crew list floats over the backdrop without a panel. The power column shows a stray "0", and the A/S/D/F labels hang loose above the icons. The bottom bar has a large dead zone between the weapons and commands. The PAUSED banner text is misaligned, captions truncate ("CARRIER TRAFFIC DETECTE…"), and the enemy system strip is tiny. |
| Crew (all ship views) | Crew figures are narrow, brass-coloured and stand in front of equally bright, busy room props. At normal viewing distance they disappear into the furniture. |
| Relay (non-fight) | Key hints are drawn over the frame border. The crew panel title is clipped. A full-width message panel holds one line. Weapon and drone slots are **not visible at all**, so the next fight cannot be planned. |
| New Voyage | Tabs collide with the vessel preview and its tooltip. Text overflows its boxes: crew traits run past the frame ("Array." clipped), and "Payload Launcher" wraps into the footnote. Footer and key hints overlap frame borders. Type sizes vary with no hierarchy. |
| Map | Key hints are clipped at the screen edge. The title plate crowds the run HUD, and "HEART" overlaps its compass. |
| Store | Item names and stats truncate ("Thermi…", "1 power ·…"). Two thirds of the panel is empty. Descriptions use a larger type than titles. |
| Ship / Yard / Event | The run HUD peeks out around every modal. Large empty regions: the Upgrades help panel, and the Event screen below the text. Socket labels are tiny. |
| Title | Menu items and sub-labels sit on bright clouds with poor contrast. The footer is illegible. |
| Global | The widely tracked small-caps label font is hard to read at 1366×768. The weapon and drone sprites mounted on the hull cannot be hovered. |

### 1.3 World sense

The lore says every Reach tender was built "all to one pattern". Glasswing and Switchback need to be recognisable
members of that family, variants fitted for optical survey and drone retrieval. At present they look like unrelated
boxes. Every image, overlay and line of text must pass one test: **would a lamper riding this carrier see or say
this?** The core facts: the tender hangs from a drive trolley gripping a carrier cable; nothing flies except small
rotor drones; machines are never killed, their tasks end; brass, chipped ivory, verdigris and gunmetal, with colour
only from small lit accents.

---

## 2. Direction

### 2.1 Pixel art (replaces the "HD painting, pixelized" recipe for scenes)

Target: **finest hand-crafted-looking pixel art**, the quality bar of modern pixel-art games' backgrounds (Eastward,
The Last Night, Sea of Stars, Blasphemous, FTL's own backdrops for readability). The Krea 2 pipeline remains the
generator, but the output must look *authored*, not filtered.

- **Resolution:** scenes are authored on a real low-resolution pixel grid and drawn at an integer scale with no
  smoothing. The candidates are 640×360 (3× at 1080p) and 480×270 (4×). The style study (§4, A1) picks one by
  looking at in-game screenshots with vessels in front. Event illustrations use the same pixel size as the chosen
  scene grid, or an exact 2× of it inside their frame.
- **Clusters, not noise:** no single-pixel speckle, mottling or dither noise in flat areas. Gradients use clean
  bands or deliberate ordered dither in sky and fog only.
- **Palette:** 24–40 colours per scene, hue-shifted ramps from the master palette (contract §7). Shadows go cool
  indigo, lights go warm. Regional accents: Copper verdigris/rust, Glass violet, Heart ember.
- **Depth:** 3–5 readable planes (sky/stars → far spires and ring → mid machinery → near silhouettes), each with its
  own value range. The middle band stays quiet for the vessels.
- **Mood:** dark indigo edge-of-space night, cloud sea far below, carriers sagging between spire tops, small warm
  lamps against vast cold machinery. Melancholy, solemn and a little hopeful.
- **Consistency with sprites:** vessels, rooms, crew and weapons keep the established hi-bit sprite recipe, which
  works. Scenes must not fight them: lower contrast and saturation than the hulls, with no bright shapes behind the
  hull silhouettes.

### 2.2 Vessels

All three starting tenders are lamplighter-pattern cars. They share the brass-and-ivory body, **lamp cupola at the
nose**, **cab window** under it, **drive trolley and grip arms on the roof that physically grip the carrier cable**,
keel of tanks below and riveted plates. They differ in job fittings:

- **Glasswing G-04, optical inspection:** compact, paired external collimator lenses, roof prism housing, survey
  horns, lens caps. Violet-glass and teal accents.
- **Switchback S-08, drone retrieval:** tall body, launch cradles and a retrieval crane mounted *on* the roof,
  lower retrieval shutters, heavy drive. Dark gunmetal and amber accents.

The occupied room grids (10×4, 13×5) stay exactly as they are in `ships.json`. The trolley height and cable
attachment must match the Lamplighter's in every view: new voyage, relay, combat and yard with cars.

### 2.3 Interface rules

- Logical canvas 960×540. Every screen is checked at 1920×1080 and 1366×768. Nothing overlaps, clips, truncates
  with an ellipsis where it could fit, or sits on busy art without a backing panel.
- One type scale, used everywhere: screen title, panel header, body, stat/number, hint. Tracked caps only where they
  remain legible at 1366×768.
- Key hints live in one consistent footer strip and never cross a frame border.
- Modals use a proper scrim. The run HUD either sits cleanly above the scrim or is hidden, and never half-shows.
- Every interactive or informative element has a hover tooltip, including the weapons and drones mounted on a hull
  (player and enemy, in combat and out of it).
- **Out of combat, the ship bar stays.** The relay view shows the same bottom ship bar as combat in *planning
  mode*: reactor and system power, weapon slots (order and power) and drone slots. Changes persist in `ShipState`
  (`weapons`, `weaponPower`, `drones`, `systems[*].power`) and apply when the next fight starts.

### 2.4 Crew visibility

Crew must be the most readable thing in a room. The means are to recede the room props (lower contrast and value
behind the crew's standing zone), give each figure a clean dark outline and a light rim, and enlarge them where the
room height allows. Selected crew get a clear floor ring, and hovering shows a name tag. Species remain
distinguishable in silhouette.

---

## 3. Execution rules

- Agents: Opus 5.5 subagents at xhigh effort. Each agent owns a set of files (below). Shared
  files are edited with small in-place edits, never whole-file rewrites, and re-read before editing.
- **Krea 2 is serial.** Only the art agent (A) runs image generation, one job at a time, through
  `art-src/loop.sh` under the shared GPU lock. No other agent queues Krea work.
- No agent commits, stashes, resets or reverts other people's changes.

| Agent | Owns |
| --- | --- |
| **A: art** | `art-src/*`, `tools/pixelize.py`, `tools/art/*`, `public/art/*`, `src/screens/backdrop.ts`, the bg/illustration drawing helpers in `src/core/gfx.ts` (smoothing, integer scale) |
| **C: ship view** (combat and relay) | `src/combat/*` (HUD, scene, draw-ship, tooltips, view, room-art), `src/screens/relay.ts`, crew sprites (`tools/sprites/*`, `public/sprites/crew.*`) |
| **S: screens** | every other `src/screens/*`, `src/screens/kit.ts`, `src/core/ui.ts`, `src/core/font.ts`, `public/fonts/*` |
| **L: world and design** | `src/content/*`, text fields in `src/data/*`, `docs/lore.md`, `docs/current-design.md`, and the subject briefs in `art-src/subjects.py` (with A) |

---

## 4. Workstreams and acceptance

### A1. Pixel-art style study (Krea 2)
Test two or three recipes on the same subjects: one Copper Reach background, one Glass Cathedral background and one
event illustration. The options are the native 640×360 or 480×270 grid, cluster cleanup, palette size, flat-shaded
versus pixel-art prompting, and optionally separate depth layers. Compare them **in game** behind the Lamplighter
(relay and combat). *Accept:* a recorded recipe in `art-src/README.md` and a comparison sheet, with the choice made
on in-game screenshots.

### A2. Glasswing and Switchback hulls
Rebuild both hulls per §2.2 (silhouette init in `tools/art/hulls.py`, Krea repaint, finalize).
*Accept:* no floating parts, trolley on the cable at the same height as the Lamplighter, nose cupola and cab
window visible, full room-grid coverage. Checked in new voyage, relay, combat, and yard with every rear and keel car.

### A3. Scene and lore art in the new style
Redo 15 regional backgrounds, title (a lamplighter-pattern tender on its carrier), Relay Seven, line-quiet, 6
endings, 44 event illustrations, then portraits if they clash. Retune `backdrop.ts` overlays so parallax, weather
and glare snap to the art pixel grid and depict world objects: no free-floating eclipse disk. Subject briefs are
checked against lore by L. *Accept:* region contact sheets and in-game screenshots per region. Reduced motion
still freezes ambient motion.

### A4. Enemy hull check
Every enemy in combat at 1920×1080. Fix broken or low-resolution pieces such as Packet Leech's roof mosaic.

### C1. Combat layout
Hail/comms docked where it never covers a vessel. The crew list gets a real panel. The bottom bar is coherent:
power column with aligned hotkeys and no stray glyphs, weapon cards with legible charge and power, drone cards,
commands, and no dead zone. Captions and banners fit. The enemy header and system strip are readable.
*Accept:* screenshots of a starter fight, a boss fight, a boarding fight and a hail at both resolutions.

### C2. Crew visibility (§2.4), in combat, relay and yard

### C3. Hull mount tooltips
Hovering a weapon or drone on a hull shows its name, stats and state: charge, power, damage, deployed or docked.
Works for player and enemy, in combat and on the relay and ship views.

### C4. Relay planning bar (§2.3)
Weapon and drone slots, power and order are visible and editable out of combat and persist into the next fight.
The relay layout is rebuilt around it: crew panel, compact relay message, ship bar, and SHIP / CHART actions.
*Accept:* a unit test that pre-fight changes reach the combat sim, plus screenshots.

### S1. Type scale, scrim, footer hints, tooltips, in the shared kit

### S2. Every campaign screen
Title, new voyage, map, store (all tabs), ship (upgrades, equipment, crew, yard), event, runbook, settings, pause,
game over, victory, credits, guide, overflow, tender, script. *Accept:* per-screen screenshots at both
resolutions, with no overlap, clipping or orphaned text.

### L1. World-sense and whole-game review
Walk the whole voyage: title → prologue → new voyage → relays and events → stores → combat → guardians → ending
and game over. Fix text in owned files. Make the three tenders coherent in lore as lamplighter-pattern variants.
Check the art subject briefs. List any issues in other agents' files for routing. Record design findings, pacing and
clarity problems below.

### V. Final verification
`pnpm test`, `pnpm build`, the QA scripts that still apply, and a full screenshot pass of every screen at both
resolutions, reviewed by eye.

---

## 5. Record

*(Filled in as work lands. Each entry: what changed, where, how it was verified, what is still open.)*

### Lead: decisions and backlog

- Decided (user): renders capped at 2560×1440; scenes use the v5 "fine pixel" night recipe (640×360 drawn 3×); events 320×160.
- Decided (user): vessels built from Krea-painted components; the drive trolley is redesigned for all three tenders from a sketch-guided Krea img2img, split into back/front layers so the carrier runs through the carriage.
- Decided (user): Lamplighter starts with an unpowered Packet Laser in mount 3; Medium retuned to keep its band.
- Decided (lead): Iron Regent Edict aims Helm → Thrusters → anywhere; no ward-breaker rule (campaign cohort regression).
- Backlog: carriers must look the same in every view (relay draws a thin orange line, combat a thick braided rope); sheave grooves must fit the carrier thickness. Owner: C, with the trolley integration.
- Backlog: title menu backing shows a hard vertical edge over the art; recheck with the new title art.

**Final status (27 Sep 2026, end of session).** `pnpm test` (128/128), `pnpm build` and every QA script pass;
final screenshots at both resolutions are in `tools/shots/qa/final/`. Decided late by the user: Glasswing starts with a
Burst Emitter and two powered Packet Lasers (Weapons Bay 4, reactor 9); Krea renders capped at 2 candidates per item
(`MAX_CANDIDATES` in `art-src/specs.py`); ComfyUI runs with `--use-sage-attention`. Open for a later session:
- 40 of 44 event illustrations and the two tender-story events (jobs in `art-src/queue/skipped/`; tender subjects need
  the render-empty-then-composite path), `bg/line-quiet`, scrap-foreman and cable-wraith hull repaints, two portraits.
- Medium sits at 44.6% after the Glasswing change (target 38–42%); Easy at ~80%; Switchback/Glasswing lead on Hard.
- Delete the review copies in `public/art/_study/` before release. Nothing is committed yet.

### A: art

**A1 · Pixel-art style study (done; recipe chosen by the lead).**
- *Compared* on a Copper Reach background, a Glass Cathedral background and the Copper Market event: R0 (shipped),
  R1/R2 (a flat "cel" prompt pixelized to 640×360 / 480×270), R3 (an explicit pixel-art prompt with Krea's 8-px pixel
  as the art pixel: 3840→480×270, 5120→640×360), night/layout/carrier prompt rounds (R3n, R3c), R4 (sky plane + scene
  plane for parallax) and, after the 2560×1440 render cap, R5 (a "fine hi-bit pixel" prompt at 2560×1440 → 640×360),
  a night-illustration prompt → 640×360, and the pixel prompt → 320×180.
- *Sheets:* `tools/shots/art/style-study/cr.png`, `gc.png`, `cm.png`, `r4-parallax.png` and `capped/`. Each row shows
  the native image at 1:1, a 300 % nearest crop, and the relay and combat screens behind the Lamplighter. Rows also
  carry the vessel-band L, spread and chroma, and flat-area orphans: about 6,000 on the shipped paintings against
  100–200 for R3 and R5.
- *Chosen (lead):* scenes use R5, 640×360 drawn 3× (`art-src/v5.py` `v5c`); events use R3, 320×160 drawn 2× from
  2560×1280. The post-process is `tools/art/pixelscene.py --preset pix8`. It grid-aligns the cells, applies a night
  gamma and hue-shift grade, rebuilds the sky as a banded field with narrow Bayer seams, and uses a 32–40 colour scene
  palette with orphan cleanup. The full recipe is "DIRECTION v5" in `art-src/README.md`. R1/R2 and R0 are rejected.
- *Code:* `src/core/gfx.ts` gains `pixelScene` (integer scale, smoothing off, offsets snapped to the art grid, edge
  repeat), `pixelSceneCell` and `pixelFit` (event art in its frame). `src/screens/backdrop.ts` draws low-resolution scenes that way, puts twinkles on the art
  grid, drops the black eclipse disk from `sunWeather`, and has a dev-only `?bg=<id>&bgfx=0&layers=1` review override.
- *Pipeline fixes:* `art-src/worker.py` had been yielding every 5 minutes to its own lock (after the systemd-run
  change), and it now reloads the prompt modules for each job. The style heads from art-briefs §11.3 are applied in
  `specs.py`.

- *Also:* `pixelFit` is now called by `event.ts` (both art layouts), `script.ts` and `runbook.ts` (the last only for
  events, bg and ending art).

**A2 · Tenders, drive trolley, mounts (done, accepted by the lead).**
- *Drive trolley.* `tools/art/trolley.py` builds one designed carriage for every car:
  - Grooved spoked sheaves ride on top of the carrier, grip jaws close below it, with a drive motor and gear.
  - A sprung hanger on a wide stance lands on a roof saddle.
  - Made from a procedural sketch on a magenta key, then Krea img2img, pixelized at hull density and split into BACK
    and FRONT layers by the sketch masks, with 4 sheave frames.
  - Three kinds: standard, heavy (two carriages on a balance beam) and car (compact).
  - Files: `public/art/ships/trolley-<kind>-{back,front}.png` and `ships.json` `trolley-<kind>`. Every car has
    `trolley {kind, pivot, saddle}`. C draws hull, then BACK, then the carrier, then FRONT.
  - The Lamplighter's and the rear cars' baked trolleys are erased; their originals are in `art-src/kit/`.
- *Glasswing* (980×512) and *Switchback* (1120×592). Grids unchanged (10×4, 13×5).
  - Built by `tools/art/hull_v5.py`: a family init resampled from the Lamplighter, with Krea fittings cut from a
    magenta key (prism housing, collimator pair, survey horns, drone cradles, retrieval crane, saddle).
  - One "min" repaint (the Switchback also uses the Lamplighter as style reference), then pixelized once.
  - The polish step drops floating islands, hangs the hook on a wire and posts the drones in their cradles.
  - Sheets: `tools/shots/art/hulls/family.png` and `trolley.png`; in game in `tools/shots/art/hulls/ingame/`.
- *Mounts.* `tools/art/mounts_v5.py` and `tools/art/cars_v5.py` write the mounts on painted hardpoint plates, keep
  belly guns clear of a coupled keel car's footprint, and add `keepClear` and `weaponEnvelope` (63/65/102).
  `pnpm test:mounts`: all mounts clear.
- *Abandoned routes* (tools removed or superseded; candidates kept for provenance):
  - the kitbash of Lamplighter pieces;
  - the strip/part assembler (`tools/art/assemble_hull.py`, `part_inits.py`);
  - blend-pass specs.

**A3 · Scenes and lore art (partly done; the user asked to finish, so the rest keeps its old art).**

Installed (v5 pixel art, 640×360 drawn 3×, or events 320×160 drawn 2×; each with a manifest record):
- *Copper:* s1-a…s1-e.
- *Glass:* s2-a…s2-e.
- *Heart:* s3-a, with a painted sunset band at the top replaced by night; s3-b…s3-e.
- *Title:* the Line's lamp arc over the cloud sea. The painted left panel is healed. `title.ts` now always draws the real
  Lamplighter on its trolley and carrier over the art.
- *Relay Seven* (intro).
- *Endings* e1–e6.
- *Events:* machine-hulk, copper-market, relay-bench, tender-radio.

Combat:
- Refuges and landmark-heavy paintings (s1-e, s2-d, s2-e, s3-a, s3-e) never back a fight (`backdrop.ts` `COMBAT_SAFE`).
- Sun glare anchors to the painted sun, or to the left horizon.
- Weather and the relay-state cues (restored/danger/sealed) are drawn on the art grid.
- `browser-qa` and `atmosphere-qa` pass.

Skipped, still on the old art (revisit later; every item has a prompt ready in `art-src/v5.py`):
- *Scene:* `bg/line-quiet`. Candidates showed modern consoles, not the brass board.
- *Events* (40 of 44), plus the two new tender-story events. The v5c/v5s prompts and the composite path are ready; the
  jobs are in `art-src/queue/skipped/`.
- *Hulls:* scrap-foreman and cable-wraith (`r2` spec ready; they show the same 4-px blocks the Leech had).
- *Portraits:* recruit-linefolk-c and bellmaker-b. These are new requests, listed as pending in `tools/art/audit.py`.
- *Endings:* e3 has no lamp arc painted.

**A4 · Enemies (done in part).**
- Packet Leech repainted without the pseudo-pixel blocks.
- Payload Launcher redrawn as a pneumatic slug thrower (sprite and icon).
- All 24 enemies checked in combat: `tools/shots/art/enemies/sheet.png`.
- Gate wardens and sealing drones are adjuncts, not standalone enemies. Their sprites were drawn at 2× offset; a
  one-line fix in `scene.ts` `drawAdjuncts` (centre at layout size) went in.

**Verification.**
- `pnpm test` (128) and `pnpm build` pass.
- `pnpm test:assets` and `pnpm test:mounts` pass.
- `tools/art/audit.py`, `browser-qa.mjs` and `atmosphere-qa.mjs` pass.
- No ComfyUI or loop was left running.

### C: ship view

**C1 · Combat layout** (`src/combat/view.ts`, `hud.ts`, `scene.ts`). The screen is now fixed bands (`LAYOUT` in
`view.ts`), so no panel ever covers a vessel: top bar 4–48 (tender status; handshake and HOP; stores with their
names), the two vessel regions (player 4–554 × 52–370; enemy camera 560–954 × 110–370 under a 58-unit enemy header),
the crew roster (under the tender) and the comms panel (under the enemy) at 374–440, and the ship bar at 442–538.
- Comms: hails and the running log are one docked panel, newest line at the bottom; an overlong hail ends with
  "… the rest is in HISTORY (B)". The floating INCOMING HAIL box, the truncated bottom caption and the objective box
  over the tender are gone. Guardian laws, duty progress, "RUNNING" and the Choir's tuning button live in the enemy
  header, which also carries a readable systems row (icon plus one pip per bar: powered, unpowered, unknown, damaged,
  ionised) and the hostile weapons' charge bars.
- Ship bar: reactor column with "n FREE" under its icon (the stray "0" is gone); every system column has its bars,
  icon and hotkey in one aligned row; weapon and drone cards share all the width up to the command column (no dead
  zone). Wide cards show plain stats beside the art; narrow cards wrap the name onto two lines. A drone group only
  appears when the tender has a Drone Bay or drones.
- PAUSED is a plate centred under the handshake; the hull readout is rounded; "MESH EXPOSED" stays inside the view;
  carriers span the whole camera at any zoom. Base zooms snap to whole numbers (1× for a tender that fits with its
  ward and 8 units of clearance, 1× or 2× for hostiles) so hull art stays crisp; only oversized consists scale down.
- Helm rule (routed from L): the handshake may charge on an automated Helm 2, but completing HOP and a duty
  acknowledgement need a crew member at the Helm (`sim.ts`); the HUD says "HANDSHAKE · HELM UNATTENDED, NO GREETING".
  The Choir's tuning channel is unchanged. Test added (`operations.test.ts`).

**C2 · Crew** (`tools/sprites/crew.py` → `public/sprites/crew.*`, `draw-ship.ts`, `room-art.ts`). Per the lead's
correction the figures were not enlarged but re-proportioned: humans 47–49 px tall (were ~60) and 19–23 px wide (were
16–19) with a larger head (about 1:4.5), riggers 39 px, boarders in proportion; every animation, the boarders and
the procedural fallback follow (`sturdy()`, `remap()` and a head zoom in the rig; poses keep floor contact). Portraits
are separate busts and unchanged. In game every figure gets a one-pixel dark outline and a warm rim on its lit edge
(runtime pass over the atlas, per palette variant), a soft contact shadow, a two-part floor ring when selected or
hovered, and a name tag on hover (world or roster). Room back walls recede (a wash of the wall colour plus a little
ink) so crew are the brightest, hardest-edged thing in a bay; the infirmary bed is capped at about a body length.
Sprite sheet: `tools/shots/qa/ship-view/crew-sprite-sheet.png`; 3× crops of all three tenders:
`crew-zoom-3x-three-tenders.png`.

**C3 · Hull mounts.** Hovering a weapon on either hull or a drone in flight shows its name, plain wording of what it
fires, damage, charge time, power and live state (charging %, ready, unpowered, bay damage, target), with corner
brackets on the mount. The Drone Bay room lists its drones as docked, armed, launching or deployed (docked drones are
the ones painted in the bay). The same tooltips work at the relay (`deck.ts`) and in the Yard (`drawShipPreview` now
returns `mounts`; a six-line edit in `src/screens/yard.ts`).

**C4 · Relay planning bar** (`src/screens/relay.ts`, `src/combat/plan.ts`, `deck.ts`). The relay mirrors combat: the
same crew roster under the tender, a compact relay panel beside it (name and kind, description, receipts, TTL
warning, and the stop's own actions: EXCHANGE (E), FIELD SERVICE, LOOK AROUND), and the same ship bar in planning
mode with CHART · HOP (M) and TENDER (U) where combat has its orders. Planning edits reactor and system power,
weapon power, weapon order (drag a card onto another mount) and armed drones, with the combat hotkeys (A/S/D/F…,
1–4, 7–0; Shift takes back). They are written to `ShipState` (`systems[*].power`, `weaponPower`, and a new optional
`dronePower`, read by `sim/build.ts` and written by `Sim.result()`); an armed drone launches as the next fight starts
and spends a spare. `src/combat/plan.test.ts` proves planned power, order and arming reach the next fight's Sim. Key
hints now sit in the roster header; nothing is drawn over a frame border.

**C5 · Ward mesh** (`shield-geometry.ts`, `shield-surface.ts`, `assets.ts`), reworked after review. The mesh now reads
as light, not a border.
- Envelope: an offset of the whole opaque hull silhouette of every car (nose lamp, roof equipment, rear and keel
  cars tied in by their gangways and hangers; the trolley column above the roof left out), from a Euclidean distance
  field closed over notches, then smoothed along an 18-unit window and pushed back out wherever it came more than
  3 units inside its offset. Margin 8–14 units (11 nominal, 12 for hostiles); it no longer hugs every fitting. The
  iso-level is offset slightly so no contour point lands on a cell corner (this had broken hostile loops at 12).
- Look: inside the outer shell only a faint tint (7%); a crisp two-pixel lit rim; an inner fade in 4×4
  ordered-dither steps; faint world-aligned diamond ward-wire that shows mostly near the rim, with brighter nodes. No
  dark pixels anywhere. Extra layers are thin concentric rims 2 units apart. The Regent's gate is a brass square weave
  and the Choir's glass a violet fine diamond, each with the same translucency, plus the existing gate leaves and panes.
- Motion: slow shimmer and a travelling glint; a hit flares the wire in an expanding ring at the contact point with
  sparks; a lost layer breaks into sliding strips; a recharging layer's dotted wire is redrawn behind a bright sweep;
  dead layers are dotted wire (grey unpowered, red damaged, violet flicker ion-locked); no Shield Array, no field.
  Grounding leads run from the outer shell up the grip arms. Reduced motion freezes shimmer, glint, sweep and break-up.
- Edges: the player region widened to 4–554 (enemy header, camera and comms now start at 558), and both camera fits
  reserve the ward's shells plus 8 units of clear space, so no hull or ward touches a screen edge. The Lamplighter
  still shows at a crisp 1×; only consists that cannot fit scale down (checked with every tender plus a rear and a
  keel car at both resolutions).
- Crops: `ward-3x-dark-and-sun.png`, `ward-3x-regent-gate-and-choir-glass.png`,
  `ward-hit-collapse-recharge-sequence-1920.png`.

**Iron Regent balance** (lead's decisions; `sim/drones.ts`, `sim/ai.ts`, `sim/weapons.ts`; the bot's Veil rule was measured and left as it was).
Headless: Iron Regent fights per tender at a Stage I "typical" bench, played by `AutoPlayer` (Lamplighter: the
existing bench; Glasswing and Switchback: their own loadouts, +2 reactor, bench system levels, a Packet Laser in a
free mount, one extra crew, hull −4). Seeds 1…n, same seeds for every step.

| Step | Lamplighter | Glasswing | Switchback |
| --- | --- | --- | --- |
| 0. Before (n=20) | 20/20 | 18/20 | 2/20 |
| 1. Combat drone works the sealed gate (n=20) | 20/20 | 18/20 | 5/20 |
| 2. + drone holds its bolt to answer a gun (n=20) | 20/20 | 18/20 | 7/20 |
| 3. + a gate-warden hit proves its route (n=20) | 20/20 | 18/20 | 8/20 |
| 4. Bot Veil rule check (Switchback only, n=40) | — | — | 11/40 current rule; 6–8/40 for three "timed" rules; 12/40 cast on any inbound bolt |
| 5. Routing Edict aims at the route: Helm, then Thrusters, then anywhere (n=40) | 40/40 | 40/40 | 31/40 |
| 6. + the Edict is a ward-breaker (n=40; later removed, see below) | 30/40 | 34/40 | 31/40 |

- Step 4 (the bot): the old rule already veiled on any inbound volley of two or more bolts: about 4 casts a fight,
  with 3.5 of 12.4 Edict bolts arriving under the Veil. The Firewall drone stays docked, correctly, because the Regent
  fires nothing it can intercept. Three rules that saved the Veil for the Edict or cast before it fired all did worse
  (the 5 s Veil then misses the Triple Burst volleys), so the rule is unchanged; the 8/20 did not understate the bot
  much.
- Step 5: aiming at the Weapons Bay stopped the tender from ever giving the proof the Regent asks for. Now the Edict
  goes for the route. Switchback rose to 31/40, but the two tenders with a ward mesh became trivial (40/40).
- Step 6: hull +6 or +10 left them at 20/20 (Switchback 11–12/20); Shield Array 4 dropped Switchback to 1/20; an
  extra jammer, payload launcher or breach spike dropped one tender far below the others. The fix that treats all three
  alike: **a charged ward layer only weakens the Edict**. The layer goes down and the bolt still lands, one damage
  lighter (2 → 1 per bolt; the Edict's own damage is unchanged). In the fiction the edict carries the Gate's
  authority over the carrier; the ward cannot ground all of it. The Hard-only shorter window was not needed.
- Result: 15/20, 17/20 and 15.5/20, inside the 12–17/20 band. Winners end with 13, 7 and 9 hull, so the guardian
  costs something.
- UI tells the truth: the Edict's tooltip (hull mount and enemy header) says "Aims at your Helm, then your
  Thrusters, then anywhere" and "A charged ward layer only weakens it…"; the gate law tooltip adds the same line.
  Tests: drone gate targeting, warden routes, Edict aim order and the ward-breaker rule (`sim.test.ts`).

**Campaign check after the Regent changes** (`tools/balance/campaign.ts`, the verification cohort of
`docs/difficulty-balance.md`: `--n 32 --offset 1000 --difficulty all --policy equipment,support`, 576 voyages per
column). All columns are the current tree (other agents' changes included), so the documented figures (older source
fingerprint) are shown for reference only. "Old Edict" switches off the Edict's aim order and the ward-breaker rule in
a wrapper; the drone-at-gate and warden-route changes cannot be switched off and are in every column.

| Mode | Documented | Old Edict | Aim order only | Ward-breaker only | **Current (both)** |
| --- | ---: | ---: | ---: | ---: | ---: |
| Easy | 72.4% | 145/192 (75.5%) | 149/192 (77.6%) | 137/192 (71.4%) | **136/192 (70.8%)** |
| Medium | 37.5% | 74/192 (38.5%) | 76/192 (39.6%) | 63/192 (32.8%) | **81/192 (42.2%)** |
| Hard | 15.1% | 40/192 (20.8%) | 36/192 (18.8%) | 27/192 (14.1%) | **26/192 (13.5%)** |
| Runs lost at the Regent, E / M / H | – / – / 58 | 4 / 25 / 49 | 2 / 12 / 29 | 19 / 74 / 122 | **7 / 28 / 80** |

Per tender, current rules (wins of 64; where the losses end: Stage I, the Regent, Stage II, the Choir, Stage III,
the Core):

| Mode | Lamplighter | Glasswing | Switchback |
| --- | --- | --- | --- |
| Easy | 40 (0/4/6/0/9/5) | 45 (0/1/2/1/8/7) | 51 (0/2/2/0/6/3) |
| Medium | 16 (1/14/17/0/11/5) | 30 (3/4/9/0/9/9) | 35 (1/10/5/3/7/3) |
| Hard | 2 (2/38/12/1/3/6) | 7 (1/17/26/0/10/3) | 17 (0/25/16/1/4/1) |

With the old Edict, Hard was Lamplighter 5, Glasswing 9, Switchback 26 wins of 64.

- **Regression, reported to the lead, not retuned:** on Hard the Regent is now a wall. It ends 80 of 166 failed
  voyages (was 49 with the old Edict, 58 documented), and Lamplighter Hard fell to 2/64. The isolation columns show
  the cause: the ward-breaker rule alone ends 122 Hard voyages at the Regent, while the aim order alone lowers the
  Regent's losses (29) and keeps Hard at 18.8%. The Stage-I-end "typical" bench is stronger than the builds the
  campaign policies actually bring to the Regent on Hard (1–2 ward layers, fewer upgrades), so the bench table above
  understated the ward-breaker's cost. The overall mode rates remain ordered and near the diagnostic bands (Medium
  is 2 points above its 20–40% band).
- No timeouts in the current column (one Easy timeout in the old and aim-only columns).

**Decision: ward-breaker removed** (lead, after the campaign check). A charged ward layer stops an Edict bolt like
any other bolt; the aim order (Helm, Thrusters, anywhere), the drone-at-gate behaviour and the gate-warden route stay.
Tooltips, the gate law text, the `current-design.md` Regent paragraph and the test were updated. The Stage-I bench
with these rules: Lamplighter 40/40, Glasswing 40/40, Switchback 31/40.

Verification cohort, final rules (same command as above; identical to the "aim order only" column):

| Mode | Overall | Regent losses | Lamplighter (wins; losses I/Regent/II/Choir/III/Core) | Glasswing | Switchback |
| --- | ---: | ---: | --- | --- | --- |
| Easy | 149/192 (77.6%) | 2 | 41 (0/1/7/0/7/8) | 53 (0/0/0/0/7/4) | 55 (0/1/2/0/3/3) |
| Medium | 76/192 (39.6%) | 12 | 14 (1/5/10/0/15/19) | 25 (3/0/7/0/11/18) | 37 (1/7/4/3/9/3) |
| Hard | 36/192 (18.8%) | 29 | 6 (2/9/26/4/9/8) | 9 (1/5/20/0/22/7) | 21 (0/15/18/3/6/1) |

Against the documented cohort (72.4 / 37.5 / 15.1%): Easy +5, Medium +2, Hard +4 points, all within or near the
diagnostic bands; Regent losses on Hard fall from 58 to 29. No regression. One Easy policy timeout (the documented
cohort also had one).

**Tender parity (proposal only, not applied).** The Lamplighter is the weakest tender on Medium and Hard, with its
losses concentrated in Stage II (Hard: 26 of 58). Diagnosis from the final cohort:
- Stage II hostiles carry two-layer ward meshes. The Lamplighter's only ammunition-free gun at the start is the Burst
  Emitter (two bolts), so it cannot break a two-layer mesh without payloads; Glasswing's Burst + Packet Laser fires
  three bolts.
- It runs dry: of 94 Hard Stage II fights with the launcher mounted, 36 began with 0 payloads and 39 with 1–3. With
  the launcher mounted it fled 31/94 and lost 6.1 hull per fight; without it, 10/136 and 4.5.
- Bot policy contributes: it tops payloads up last (after upgrades and wagons: 15–18 salvage per run in Stage I, only
  3–5 in Stage II) and spends every payload on the Regent. But more payloads do not fix it (below): the cause is the
  missing third ammunition-free bolt, not the price of ammunition.

Measured variants (scratch copies of the tree, same cohort; Glasswing and Switchback unchanged in every variant):

| Variant (Lamplighter start only unless noted) | Lamplighter E / M / H | Overall E / M / H |
| --- | --- | --- |
| Current | 41 / 14 / 6 | 77.6 / 39.6 / 18.8% |
| Full payload rack at start (12 instead of 8) | 50 / 15 / 6 | 82.3 / 40.1 / 18.8% |
| Payload price 6 → 4 (store, all tenders) | 42 / 15 / 4 | 78.1 / 40.1 / 16.7% |
| Weapons Bay 4 + reactor 9 (no new gun) | 43 / 23 / 8 | 78.6 / 44.3 / 19.8% |
| **Packet Laser in mount 3, unpowered (needs a Weapons Bay upgrade)** | 47 / 33 / 8 | 80.7 / 49.5 / 19.8% |
| **Packet Laser in mount 3 + Weapons Bay 4** (reactor 8) | 50 / 33 / 15 | 82.3 / 49.5 / 23.4% |
| Packet Laser + Weapons Bay 4 + reactor 9 | 51 / 37 / 14 | 82.8 / 51.6 / 22.9% |

Glasswing is 53 / 25 / 9 and Switchback 55 / 37 / 21. Proposals: (1) the Packet Laser mounted but unpowered, the
smallest change (one item in `makePlayerShip`), which lifts Medium to Glasswing's level and above and keeps Hard where
it is; (2) the Packet Laser with Weapons Bay 4, which brings Hard to Glasswing's level but lifts overall Medium to
49.5%, above its 20–40% band, so it would want a matching Medium adjustment. Either keeps the payload launcher and its
identity; the lore line "Burst Emitter + Payload Launcher" would gain "and an old Packet Laser".

**Relay tower on the art grid** (agent A's request). `drawPylon` and `drawBench` in `relay.ts` now draw through A's
`drawOnArtGrid` with a small `ArtGridGfx` whose strokes are whole art pixels (1.5 layout units, at least one art
pixel thick); drawing plain 1-unit strokes onto the grid left them blurred at two-thirds coverage. The bench label
stays on the screen grid. Before/after 3× crop: `tools/shots/qa/ship-view/relay-tower-art-grid-before-after-3x.png`.

**Lamplighter option A and Medium tune-down** (user's choice, lead's instructions).
- `src/data/ship.ts`: the Lamplighter starts with a Packet Laser in mount 3, unpowered (Burst Emitter and Payload
  Launcher unchanged). Its tender profile, the New Voyage opening plan and power line (`newvoyage.ts`), the
  `current-design.md` tender table and the `makePlayerShip` note say so: the Night Shift bolted a spare packet emitter
  into the empty third mount, and the bay needs one more bar before it can run.
- Ship bar (combat and relay planning): a weapon the Weapons Bay has no room for shows **NEEDS A BAY BAR**, and its
  tooltip says how many more bars it needs and to upgrade the bay on the Tender screen or power another weapon down.
- `src/data/difficulty.ts`, Medium only, two broad knobs: hostile and guardian hulls 90% → 100%, relay allocations
  18/26/34 → 16/23/30 (Hard's). Probes on Medium (single-knob and paired, both cohorts) are listed below; this pair gave
  the best combined rate and parity. `current-design.md` (allocations, mode sentence) updated.
- Tests updated for the new start (`sim.test.ts`, `plan.test.ts`).

| Medium probe (after option A) | Training (144) | Verification (192) |
| --- | ---: | ---: |
| No Medium change | – | 49.5% |
| Evasion 100% | – | 44.3% |
| Weapon charge 1.20 | – | 41.1% (L 20, G 25, S 34) |
| Hull 95% + evasion 100% | 50.7% | 41.1% |
| Hull 90% + evasion 100% + Hard allocations | 43.8% | 40.6% (S +42%) |
| **Hull 100% + Hard allocations (applied)** | **41.0%** | **37.5%** |

Final cohorts (fingerprint `9e554a1e…bde8`), overall and per tender (wins; Lamplighter / Glasswing / Switchback):

| Mode | Training | Verification | Combined | Verification per tender (of 64) |
| --- | ---: | ---: | ---: | --- |
| Easy | 79.2% | 80.7% | 80.1% | 47 / 53 / 55 |
| Medium | 41.0% | 37.5% | **39.0%** | 21 / 21 / 30 |
| Hard | 19.4% | 19.8% | 19.6% | 8 / 9 / 21 |

Medium parity over both cohorts: −8% / −18% / +26% of the mean (Switchback's support policy buys a Shield Array).
Easy (80%) stays above its original 45–70% band and was left alone as instructed. `docs/difficulty-balance.md` was
rewritten with the current rules, fingerprint, commands, per-tender tables with loss locations, the policy matrix,
economy table and example voyages. Two verification voyages hit the policy budget (listed there).

**One carrier everywhere** (`src/combat/carrier.ts`, new). Every view where a tender or crawler hangs uses the same
renderer: relay (all regions), combat (player consist and crawling hostiles), yard, new voyage, store, overflow and
refit previews, title and script scenes (`tender.ts carrierScene`). The old thin relay line (`kit.cable`) and the
combat-only braid are gone from those views (the chart still uses `kit.cable` for routes).
- **Thickness: 6 layout units at zoom 1** (the fx braid tile's 12 backing px; 12 px in the 2× hull art). It scales
  with the vessel it carries (camera zoom in combat, the fit scale of relay and preview consists), so the carrier
  always keeps the same proportion to the trolley. Recorded in `current-design.md` for agent A's sheave grooves.
- Regional tint by palette swap of the braid: Copper verdigris (as painted), Glass violet sheath with a teal core,
  Heart soot-dark steel with ember glints, dark steel when no region is known. Drawn one backing-pixel column at a
  time along the sag, crisp on the vessel sprites' grid (it passes through the trolley, so it shares the hull's pixel
  density; painted background carriers stay on the coarser art grid behind it and read as further away).
- Sag: the relay keeps its 40-unit catenary across the screen; combat spans sag ≈5% between grips; previews run flat
  through the grips. The relay carrier now runs through the switch tower's frame (the tower is drawn over it).
- Crawler grips (`drawHostileFrame`): the two sheaves now sit on the carrier's top edge (their centre 5 units above
  its centre line) with an axle strap past it to the crosshead.

**Drive trolley groundwork** (for agent A's layers).
- `ships.json` per car: `"trolley": { "kind": "standard" | "heavy", "pivot": {x, y}, "saddle": {x, y} }` in hull
  image px (saddle = where the carrier's centre passes through the carriage; pivot defaults to the saddle). Optional
  layer geometry `"trolley-<kind>": { "w", "h", "saddle": {x, y}, "frames": n }` (frames laid side by side, each
  `w` wide; defaults: one frame, saddle at the image centre). Layers: `public/art/ships/trolley-<kind>-back.png` and
  `-front.png`. Nothing is requested until a car has a `trolley` field, so the current baked look stays until then.
- Draw order with layers: hull, trolley back, carrier, trolley front, everywhere (combat, and every preview via
  `drawShipPreview`'s new `carrier` option, which also clips a second pass of the carrier to each carriage when the
  caller drew the full span itself).
- Sheave frames turn while the drive runs (combat: while the Thrusters are powered, faster during the handshake;
  relay: during the hop and arrival slide). Pendulum: the carriage rides the carrier while the hull keeps the view's
  small sideways sway beneath it (a translation about the grip, not a rotation, so pixel art stays crisp and every hit
  test, ward envelope and mount tooltip keeps using the hull's own offset). Both frozen under reduced motion.
- Verified with stand-in layers served to the browser (never written to `public/art`): the carrier passes over the
  back layer and under the front one in combat, relay and yard; sheaves turn; ward, mount tooltips and hit tests
  unchanged. Screenshots: `tools/shots/qa/ship-view/carrier-*.png` (relay Copper/Glass/Heart, combat crawler and
  Heart consist, yard with cars and new voyage at both sizes; store, overflow and title at 1920).

**Full regression pass** (after the four parallel workstreams; dev server on :5181, 1920×1080 unless the script
sets otherwise). Causes: (a) real regression, fixed; (b) stale expectation after the intended redesign, check updated
with its intent kept; (c) caused by agent A's art work in progress, listed only.

| Script | Result | Cause | What I did |
| --- | --- | --- | --- |
| `pnpm test` | pass (126) | – | – |
| `pnpm build` | pass | – | – |
| `pnpm test:assets` / `test:media` / `test:narrative` | pass | – | – |
| `pnpm test:e2e` (`tools/qa.mjs`) | pass after fix | (b) the guide check looked for card prose at fixed coordinates of the old guide (0 of 16 found) | It now pairs each card's prose with its control hint, whatever the layout, and asserts all 20 cards on all five pages fit (it covered four) |
| `pnpm test:production` | pass | – | – |
| `pnpm test:ux` | pass after fix | (b) expected the old Medium allocation (18) | Expects 16, the Medium tune-down value, in both places |
| `tools/design-qa.mjs` | pass | – | – |
| `tools/vessel-qa.mjs` | pass | (b) its guide check matched no text after the guide redesign (a vacuous pass) | Same pairing as e2e, and it fails if no card is found |
| `tools/screens-qa.mjs` | pass (98 shots) | – | – |
| `tools/art/browser-qa.mjs` | **fail** | (c) Copper background: the backdrop state overlays (restored, sealed, danger) change 0 pixels on the new 640×360 pixel scene (Glass and Heart still change) | Not fixed: A's `backdrop.ts` overlay retune for the pixel scenes is in progress |
| `tools/art/refit-qa.mjs` | pass after fix | (b) the redesigned exchange scrolls and only registers visible rows; the test car was appended last, off-screen | The test car is inserted first |
| `tools/art/atmosphere-qa.mjs` | pass | – | – |
| `tools/readability-qa.mjs` | pass | – | – |
| `tools/readability-layout-qa.mjs` | pass after fix | (b) expected the old stacked relay panels (x 8, w 770) and `ui.area` crew rows | Checks the new side-by-side roster and relay panels (no overlap, above the ship bar) and all ten crew cards inside the roster |
| `pnpm test:soak` (9 guardian battles, bounded) | pass | (a) found on the way: frames ran at 33 ms in headless Chromium | See below; now 16.7 ms median and p95, heap growth bounded, no errors |

- **Performance regression (a), fixed.** Profiling one combat frame found about 9,900 image blits, 8,000 of them
  9-slice panels: `Gfx.panel` tiles each panel's edges and centre from 12-px source cells, so the larger HUD panels of
  the new layout cost hundreds of blits each. `Gfx.panel` (`src/core/gfx.ts`) now composes each variant and size
  once into an offscreen canvas and reuses it (pixel-identical: HUD bands diff to 0 pixels). The carrier now also
  caches each span by its geometry (`drawCarrier` key). Combat draw time 26 → 8.5 ms, relay 18.6 → 4.8 ms
  (headless, software canvas).
- **Console and page errors:** none in e2e, soak, or a sweep of 23 screens (title, new voyage, relay in all three
  regions, chart, event, exchange, tender, yard, overflow, runbook, game over, ending, victory, credits, settings and
  six live battles including the three guardians and a Switchback consist with cars): 0 console errors or warnings,
  0 page errors, 0 HTTP errors.

**Other routed items done:** "SHIP" → "TENDER" on the relay button; "Ship screen (U)" → "Tender screen (U)"; the
gate warden "folds back into the gate"; tooltip lookups guarded. Glyphs missing from the bitmap fonts replaced in
player-facing text: "−" (U+2212) → "-", "●" → "•", "→" → words. `tools/vessel-qa.mjs` roster check updated to the
new layout (all 13 cards selectable inside the roster panel, none overlapping); it passes at both sizes.

**Edits outside my files:** `src/game/types.ts` (optional `dronePower`), `src/screens/yard.ts` (mount tooltips),
`src/campaign/dev.ts` (`&tender=` for `?dev=relay`), `tools/vessel-qa.mjs` (roster check). Dev: `?dev=combat&tender=glasswing|switchback&crew=n`.

**Verified.** `pnpm test` (all pass, incl. the new planning, helm, gate-source and drone-gate tests), `pnpm build` and
`node tools/vessel-qa.mjs`. Screenshots
at 1920×1080 and 1366×768 in `tools/shots/qa/ship-view/`: starter fight with hail, the Regent with rear and keel
cars, boarding (Static Nest grapple), the Blackout Core, the Hollow Choir (Glasswing), Switchback with drones out,
relay planning, relay with cars, relay Switchback; plus 1920 shots of mount, drone and yard tooltips, an edited plan,
selection ring and name tag, the ward exposed and recharging, and a nose crop sequence of a hit, collapse, sweep and recharge (`ward-hit-collapse-recharge-sequence-1920.png`).

**Open or for others.**
- A: Packet Leech's hull art itself is a low-resolution mosaic (8-px blocks in `public/art/ships/packet-leech.png`,
  most visible on its dome); it is not a drawing bug. The whole-number zoom now shows it at 1× instead of ~1.75×, which
  helps, but it needs repainting. Also the backdrop's black eclipse disk and the payload launcher sprite (reads as a
  finned missile) are A's.
- Balance: the Regent table above covers only the guardian; the campaign balance runs (`pnpm test:balance`,
  `test:campaign`) were not re-run after the Edict change.
- `dronePower` stays with the slot index when drones are moved on the Equipment tab (S could reset it as weaponPower
  is reset). The surrender and departure dialogs are unchanged modals and were not re-captured (the dev fight has no
  retreat route and the autopilot accepts surrenders). The climb (back-view) frames are unused in game and keep the
  old rig scaled down. Each shell band is built once (a short one-time cost the first time that shell appears).

#### Weapon mounts on the new hulls (lead's task, 27 Sep)

The question was whether the new vessels look right with weapons fitted. A has moved every mount onto a painted
hardpoint plate and added `keepClear` zones and a `weaponEnvelope` to `ships.json`. My part was the pylons, the
carrier line, the camera, and a clearance check.

- **Pylons** (`src/combat/draw-ship.ts`).
  - The long thin posts are gone. Each weapon stands on its hardpoint plate, which is A's mount point; the plate's
    face is 3 image px off the centre.
  - The stand is a riveted brass pylon on the hull pixel grid (half-unit steps): a foot flange, a column with two
    rivet rows, and a collar under the weapon.
  - Pylon height is a per-mount property: `mounts[i].pylon`, in image px. The defaults are a 4-unit pedestal on the
    roof and a 1-unit collar under the belly (snug under the keel).
  - The code cuts the pylon down, never below 0, until the weapon in that slot keeps `CLEAR_AIR` (3 units) under
    the carrier's lower edge and under every keepClear zone above its plate. The weapon is never raised.
  - Clearance uses each sprite's measured opaque box, not its padded frame.
  - Mounts in open air on older art (Armory Car) stand on the first hull pixel below the mount point.
  - The Iron Regent's armoured gun cradles (the `depth = i === 0 ? 21 : 9` line) also take a mount's `pylon` when it
    has one. Their look is unchanged.
- **Carrier line** (`carrier-line.ts`, `tenderCarrier`, `carrierFloor`).
  - Before: combat's carrier sagged by up to 18 units between its end and the grip, so beside the Lamplighter's left
    roof gun it hung at grip height (the "rides at carrier height" shot).
  - Every carrier around a tender is now taut: straight arms rising from the grips, with a span's sag capped at its
    rise/π, so it never runs below its grips. This holds in combat, in the preview (relay, yard, store, overflow), and
    in `carrierScene` (tender screen, relay, new voyage, script).
  - Clearance is measured against that floor, so a gun's pylon is the same in every view.
  - `carrierScene` runs the line through every grip of the consist, and blends back to the free catenary while the
    tender is within 80 units of a screen edge (arrival and departure).
  - New unit test: `src/combat/carrier.test.ts`.
- **Ward and camera** (`view.ts` `fitCamera`, `ShipView.extras`).
  - The ward now wraps the mounted guns and their pylons.
  - The camera frames the hull, guns and trolley. The ward's room is kept around the guns but not around the trolley.
    It re-fits during the first 3 s while art loads, unless the player has zoomed.
  - The Switchback's roof gun used to be cut off at the region edge and its belly gun sat on the edge; both are now
    inside. The Lamplighter and Glasswing stay at 1×. The Switchback goes from 0.95× to about 0.93×; it was already
    below 1× because it is wider than its region.
- **Hit areas.** A weapon's hover area is its opaque box plus its pylon down to the plate, padded 2 units. Combat,
  relay, yard and store tooltips follow the new positions (`mounts-relay-hover.png`).
- **Clearance QA:** `tools/mount-qa.mjs` (`pnpm test:mounts`, `--quick` for the four largest sprites).
  - Coverage: each tender alone, and with an Armory Car and a Sling Keel, with each of the 16 player weapon sprites on
    every mount at once.
  - Checks:
    - carrier air, against the model line and against the line combat draws;
    - keepClear zones, including CLEAR_AIR under zones above a plate;
    - A's `weaponEnvelope` on every roof mount;
    - weapon-vs-weapon and hover-area overlaps;
    - ward containment, with a margin of at least 8 (intended 11);
    - camera region;
    - belly snugness;
    - hull art of coupled cars inside a weapon box, and painted fittings on car art that has no keepClear zones.
  - A live hover pass in the combat scene points at each gun, at its pylon, and at 6 units of clear air above it.
  - It prints a table per mount and one grouped line per problem, and exits 1.

  | Mount (tender alone) | Pylon, min to max over 16 sprites (default) | Least carrier air, model/drawn (sprite) | Least ward margin |
  | --- | --- | --- | --- |
  | Lamplighter roof aft / fore | 1–4 (4) / 1–4 (4) | 3 / 5 (flood-cannon) both | 8.8 / 9.1 |
  | Lamplighter belly | 1 (1) | – | 8.9 |
  | Glasswing roof aft / fore | 0–4 (4) / 0–4 (4) | 3 / 4.8 (flood-cannon); 3 / 5.6 (multicast-array) | 9.1 / 8.9 |
  | Glasswing belly | 1 (1) | – | 8.9 |
  | Switchback roof | 2–4 (4) | 3 / 6.2 (flood-cannon) | 8.7 |
  | Switchback belly | 1 (1) | – | 8.8 |

  The hover pass succeeds on all eight mounts (weapon, pylon, and clear air above).

  **Result at the time: fails** (after A's fixes it passes; see "Final round"). 76 findings in 16 groups. None of them are drawing bugs; all are placement in the art:
  1. **Glasswing aft roof mount (108,140), trunk-lance.** Its barrel tip reaches x 105.0 units, which is 1 image px
     into the "hanger and saddle" zone (starting at 104.5), even at pylon 0.
     - Cause: the `weaponEnvelope.right` of 101 is one px short. The trunk-lance runs from pivot 42 to its last
       opaque column 143, so the value should be 102.
     - Fix for A: move the mount 2 px aft, to (106,140), or narrow the zone.
     - This is the only failure on the three tenders alone.
  2. **Armory Car roof mount** (older art, not re-authored), on every consist:
     - its own painted trolley and grip lie inside every weapon's box (1,600–4,500 px);
     - flood-cannon and cathedral-chime get only 1–1.5 units of air under the carrier at pylon 0;
     - the envelope needs 2 more units (6 more on the Glasswing).
     - It needs a hardpoint plate and keepClear zones like the tenders.
  3. **Sling Keel coupled under the Glasswing and Switchback.** It sits under the lead's belly mount, so large belly
     guns overlap the keel car's hull:
     - Glasswing (520,483): 7 sprites, up to 1,070 px;
     - Switchback (800,583): 4 sprites, up to 257 px.
     - The Lamplighter's belly mount clears its keel. A (placement) or the lead (whether that hardpoint stays usable
       with a keel car) should decide.
- **Screenshots** (`tools/shots/qa/ship-view/`):
  - `mounts-armed-{lamplighter,glasswing,switchback}-{1920,1366}.png`, taken with
    `/?dev=combat&tender=…&weapons=flood-cannon,trunk-lance,multicast-array,heartpulse-chain`. The Switchback has two
    hardpoints and the others three, so the fourth weapon has no mount.
  - `mounts-roof-pylons-2x.png`, `mounts-belly-snug-3x.png`, `mounts-relay-taut-carrier-1920.png` and
    `mounts-relay-hover.png`.
- **Verified:**
  - `pnpm test` (128 pass) and `pnpm build`;
  - `tools/qa.mjs`, `readability-layout-qa`, `vessel-qa`, `ux-qa` and `art/refit-qa` pass;
  - no page errors.
- **Edits outside `src/combat`:**
  - `src/screens/tender.ts` (`carrierScene` taut line);
  - `package.json` (`test:mounts`);
  - `tools/mount-qa.mjs` (new).

#### Final round (27 Sep)

- **Glasswing starting fit (user decision).** The Glasswing now comes with a Burst Emitter and two Packet Lasers
  (the second in its belly mount), all powered at the start.
  - Its Weapons Bay goes from 3 to 4 bars. It also needed a ninth reactor bar: mesh 2 + drive 2 + weapons 4 + air 1.
    The reactor was fully used before.
  - Changed files:
    - `src/data/ship.ts` (fit, profile, doc comment);
    - the New Voyage plan text: "9 power: lasers 4 · mesh 2 · drive 2 · air 1; all three guns live";
    - `docs/current-design.md`;
    - `src/campaign/operations.test.ts` (asserts three weapons, all powered, Weapons Bay 4, reactor 9);
    - `tools/design-qa.mjs` (the saved-voyage loadout check).
  - **Balance:** Medium, both policies, the same seeds as the frozen cohorts. No other rule was retuned.

    | Cohort | Before | After |
    | --- | --- | --- |
    | Verification (seeds 1001–1032) | 21/64 (32.8%) | 32/64 (50.0%) |
    | Training | 15/48 | 23/48 |

    - Across both cohorts the Glasswing moves from last (36/112) to level with the Switchback (55/112). The Lamplighter
      stays at 40/112. Against the mean that is −20% / +10% / +10%, inside the ±25% parity band.
    - Medium overall moves from 39.0% to 44.6%, above the 38–42% target. Recorded at the top of "Frozen cohorts" in
      `docs/difficulty-balance.md`.
- **Title: the car from outside.** `drawShipPreview` has a new `exterior` option, passed through `drawTender` and
  `carrierScene`. It draws hull, trolley, carrier, guns and lamps, with no cutaway rooms, doors, crew, ward or markers.
  - The title uses it, so the closed Lamplighter shows its painted exterior, lit cab window and nose lamp.
  - The title's carrier now starts under the menu's solid backing (`carrierFrom`) and fades in over 96 units, so it
    never crosses the menu text.
  - Shots: `tools/shots/qa/final/title-{1920,1366}.png`.
- **Mount QA now passes** ("all mounts clear") on A's re-authored mounts: Glasswing aft roof mount moved, envelope
  right 102, Armory Car plate and keepClear zones, belly mounts moved clear of the keel car.
- **Final verification (plan §4 V).** All pass:
  - `pnpm test` (128), `pnpm build`;
  - `test:assets`, `test:media`, `test:narrative`, `test:e2e`, `test:production`, `test:ux`, `test:mounts`;
  - `design-qa`, `vessel-qa`, `screens-qa` (98 shots), `readability-qa`, `readability-layout-qa`;
  - `art/refit-qa`, and at the end A's `art/browser-qa` and `art/atmosphere-qa`.
  - Regressions fixed:
    - `design-qa` expected the old two-weapon Glasswing (updated to the user's fit);
    - the Glasswing plan text ran past its panel and was shortened;
    - the Lamplighter tradeoff touched the panel border and was shortened to three lines.
  - `e2e`, `design-qa`, `screens-qa` and `readability-qa` were re-run after the text and title changes.
- **Final screenshots** (`tools/shots/qa/final/`, 1920 and 1366):
  - title; New Voyage for all three tenders; relay;
  - combat against the starter, the Regent and the Core;
  - exchange, tender screen, event, chart and ending.
  - I reviewed each one; nothing is clipped or overlapping after the fixes above.

### S: screens

**S1, the shared kit** (`src/core/font.ts`, `src/core/ui.ts`, `src/screens/kit.ts`, `tools/build_fonts.py`,
`public/fonts/caps|capsb|note.*`).
- **Type scale.** `TYPE` in `kit.ts`: display (`big`, cap 20) › title (`head`, 15) › body (`body`, 10) › label /
  strong / note (7.5). The last three are new *scaled* pixel fonts: Silkscreen Regular/Bold and Tiny5 drawn at 1.5
  layout units per font pixel (3 backing pixels at 1080p, crisp; about 11 px caps at 1366×768). `build_fonts.py`
  writes them (`SCALED`), `font.ts` draws any font with a `scale` and snaps it to backing pixels. The old 5-px
  `label`/`labelb`/`small` stay for dense combat glyphs; no campaign screen uses them any more.
- **Helpers.** `header()` (panel headers, caps top at y), `textAt()` (text by cap top), `fitFont()`, `lineCount()`,
  `tabRow()` (tabs sized to their labels, optional counts and keys), `salvageChip()`, `keyChip()`, `footer()`,
  `fittingLine()` (a tip that fits whole), `scrim()`, `runModal()` / `RUN_MODAL`, `HUD_BAND`, `FOOTER_Y`, `SCRIM`.
  `centerY()`/`capTop()` in `font.ts` centre capitals optically.
- **Buttons.** `brassButton` upgrades the old tracked 5-px labels to the caps faces whenever they fit (falls back
  so no existing button overflows), centres text on the capitals, and draws its hotkey as a legible chip inside the
  right edge. Titles plates use the bold caps. Every signature is unchanged.
- **Scrim and HUD.** Every modal over a voyage calls `scrim(g, app, run)`: everything underneath dims to 0.86 and
  the run HUD is redrawn crisp above it, so it is either fully there (store, tender, chart, event, pause, victory,
  overflow, runbook) or fully set aside (dialogs over dialogs, combat pause). Run modals keep y < 58 clear.
- **Footer.** One key-hint strip along the bottom edge (`FOOTER_Y` = 522), outside every frame; chips in the note
  face; an optional tip only when it fits whole.
- **Tooltips.** `ui.setTooltip(text, width, anchor?)`: with an anchor rectangle the tooltip sits beside it (below
  by default, then above, right, left) and never covers it. `UI.button`/`UI.area` and `brassButton` tooltips are
  anchored to their control. New `equipmentTooltip()` / `itemStats()` in `items.ts` give weapons, drones and
  augments their full numbers from the combat data (store, sell list, tender equipment, overflow).

**S2, every campaign screen**, rebuilt on the kit:
- **Title** (`title.ts`): the menu column has its own dark backing with a soft edge, so it reads over any art;
  menu items in the title face with note sub-lines under them; footer strip with stats and keys. The tagline is
  gone (user request); the KEEPER lamp now blinks at the end of the kicker.
- **New voyage** (`newvoyage.ts`): a clean grid. Back and plate; three tender tabs; the tender on its carrier in
  its own inset with stats on a backing band; difficulty panel; one band for role / opening plan / tradeoff; name
  and livery, the three volunteers (traits wrap, never clipped), and the connection with seed and BEGIN. The vessel
  tooltip sits below the preview. L's summaries and "no ward mesh" applied.
- **Chart** (`map.ts`): the plate is a run modal under the HUD with its title and flavour in a header row (no more
  plate crowding the HUD); relay y compressed to 0.92 to fit; labels in the note face on dark backing; "Toward the
  Heart" sits clear of its compass; hints in the footer.
- **Exchange** (`store.ts`): full-width rows instead of cards: picture (weapon, drone and car art), name and kind,
  numbers, the whole description (rows grow, a scroll bar appears only if needed), BUY with the blocker under it.
  Tabs sized to labels with counts; car confirmation with art, deltas and the consist preview; supplies and repair
  rows; sell list with full tooltips; Pell's portrait.
- **Tender screen** (`ship.ts`, `yard.ts`): upgrades rows adapt to the number of systems; the help panel always
  shows a system (the hovered, last or first) with its levels; equipment slots show name and numbers, full
  tooltips on hover; cargo beside augments; crew rows with health and skills. Yard: socket labels in screen space
  (legible at any zoom), consist numbers, refit/car/livery strip.
- **Event** (`event.ts`): the window sits under the HUD band; the art moves beside the text, then goes, when a
  long event needs the room; choices are laid out from the start at 30 % and wake when the text finishes (no empty
  region while it types); cost/uncertainty/requirement lines under each choice in the note face.
- **Cost line** (`src/campaign/events.ts` `choiceCost`, drawn by `event.ts`, test `choice-cost.test.ts`): each
  choice shows the costs every outcome takes, e.g. "Seal +1 hop · –2 hull · –1 payload", in amber. Costs only some
  outcomes carry stay under "Uncertain outcome". 92 choices currently show a fixed cost.
- **Script** (`script.ts`): speaker plate in the bold caps, text box above the footer, footer hints.
  `session.ts` now plays each guardian's written `defeat` beats before the stage outro (dropping outro beats that
  retell the same moment) and plays the Stage II/III intros in full.
- **Pause, settings, runbook, guide, victory, overflow, game over, credits, refit receipt, autofight**: scrim +
  HUD where there is a run, plates in the bold caps, text in the scale, tips in the footer. Settings is two
  columns; the runbook is a run modal in a voyage and message slips grow to their text; the guide has tabs sized to
  labels and five pages that fit; overflow shows item numbers and, for cars, the consist preview; credits get a
  reading column behind the roll. L's copy routes applied ("TENDER", "Tender screen", ward mesh wording, guide
  lines).

**Verified.** `pnpm test` (124 pass) and `pnpm build`. `tools/design-qa.mjs` passes at both resolutions.
Every screen was looked at in screenshots at 1920×1080 and 1366×768: `node tools/screens-qa.mjs` writes 49 views
(including tooltips, typing, blue options, cost lines, car confirm, yard socket, refit receipt) × 2 resolutions to
`tools/shots/qa/screens/`.

**Open.**
- `tools/vessel-qa.mjs` now stops at its relay check ("13 crew portraits … `crew-` ids"), which follows C's relay
  rebuild; its store check was changed to accept text that wraps without a line cap.
- C: U+2212 "−" in `src/combat/hud.ts` and `src/combat/sim/power.ts` is not in any bitmap font and draws as "?"
  (use "–"). The combat HUD can adopt `TYPE`, `header()`, `keyChip()` and anchored tooltips; `UI.keycap` and the
  5-px fonts were left unchanged for it.
- A: the title menu column covers x < 404 and fades out by x ≈ 500 (layout units); the title subject should sit to
  the right of that.
- Tabs and buttons that must stay short: "PIXEL-PERFECT" and the store tabs fit only in the regular caps.

### L: world and design

**What the review covered.**
- The whole voyage, read as a player meets it:
  - title, the opening (`tenderOpening`, as played in the real game) and all three tenders;
  - every event deck (about 12,000 lines, split across three parallel read-throughs);
  - exchanges, benches, the hail, handshake, surrender and retreat copy in combat;
  - all three guardians, the ending, game over, the Runbook and the field guide.
- Screenshots at 1920×1080 and 1366×768: title, new voyage (all three tenders), relay, chart, exchange, a starter
  fight, the Iron Regent, the opening sequence and the Runbook.
- Contact sheets of all 18 backgrounds, 6 endings and 44 event illustrations.
- A headless sample:
  - Command: `tools/balance/campaign.ts --n 6`, medium difficulty, equipment policy, 18 runs.
  - Victories: 4 in 18.
  - A full run is about 34 relays and 14 fights.

**Findings, ranked by how much they hurt the player.**

1. **Costs are hidden at the moment of choice.**
   - The event window labels a multi-outcome choice "Uncertain outcome", but it never shows a fixed cost: a Seal
     step, TTL, hull, a crew injury or a spent payload.
   - About 60 choices hid such a cost in the text. That breaks the lore rule "losses are fair". Their wording now
     names the cost.
   - The reliable fix is a cost line generated from the outcome in `presentEvent` (`src/campaign/events.ts`) and
     drawn by `src/screens/event.ts`, for example "Seal +1 · −2 hull · 1 payload".
2. **Switchback cannot pass the Iron Regent.**
   - In the headless sample, Switchback reached Stage II in 1 of 6 runs. Lamplighter and Glasswing reached it in 6 of 6.
   - The Regent's gate only opens to two different sources within 2.2 s. Switchback starts with one gun (plus the
     Relay Drone), and the bot policy did not time the two.
   - This needs a design decision (C, balance):
     - confirm that a drone plus a gun reliably counts in play;
     - or say it at the gate;
     - or offer Switchback a second gun or an early tuning.
3. **The Helm rule contradicts the simulation.**
   - Lore, current-design, the Helm description and the tips all say a greeting needs a crew member at the helm.
   - The combat sim both charges and completes the handshake with an *unmanned* Helm at level ≥2:
     - `src/combat/sim/power.ts`: `usable(helm) >= 2` gives half rate;
     - `src/combat/sim/sim.ts` `hopReady`: `|| usable(P.sys.helm) >= 2`.
   - Either require attendance, or change the rule everywhere (C and design).
4. **The art contradicts the world** (A; details in [art-briefs.md](art-briefs.md)).
   - Nearly all 44 event illustrations put a crowd of silhouettes in the foreground.
   - Many show trams, wheeled wagons, gondolas, a boat, Earth churches on clouds, or a planet seen from orbit
     (sun-glare, e3).
   - The title shows a tram with a pantograph and a hanging lantern.
   - Relay Seven has a candle flame on the switchboard.
   - The combat glare draws a black eclipse disk (`backdrop.ts` `sunWeather`).
   - Root causes are in the style heads:
     - `EVENT_WORLD` ends "Figures are small, seen from behind…", which invites crowds;
     - `ENV_HEAD`, `FIG_HEAD` and `readable-regent` say "orbital".
5. **The UI calls the tender a ship and the mesh "shields".** This is S and C copy; see the routing list.
6. **The written prologue was never played.**
   - The session swapped `PROLOGUE` for a four-beat `tenderOpening`. In it the Operator (who "says little") read out
     tutorial rules, and every tender opened with generic text.
   - Now fixed: the real opening plays the full Relay Seven prologue with the chosen car's two dock beats and one
     objective line. The departure beat keeps the TTL/Seal rule.
   - Still open for S: `session.ts` trims Stage II/III intros to their first and last beat and outros to the last
     beat, and it never plays the guardians' authored `defeat` beats. That is acceptable, but those beats are dead
     content.
7. **Text assumed the Lamplighter.**
   - Examples: an "L-12" work order shown to every car, the ward mesh on Switchback (which has none), payload choices
     without payloads, and Moss's "Dock Twelve car, Pell's grip".
   - About 30 lines fixed. Two requirements added:
     - `s1-combat-wraith-ahead` now needs 1 payload;
     - `s2-rack-of-forks` (bellmaker) now needs a Shield Array.
   - Open:
     - Payload rewards still reach tenders without a launcher: `s1-bench-shelf`, `s1-condemned-skip`,
       `s1-relief-returns`, `s1-market-skiff-exchange`, `chain-moss-reach-trade` and `chain-moss-glass(-grudge)`.
     - `systemDamage: shields` is free on Switchback (`s3-pulse-ahead`).
     - Glasswing and Switchback have no story of their own. Proposal: one gated event each. For Glasswing, the old
       alignment crew's KEEP THE PAIR TOGETHER note. For Switchback, the seventh drone found on a span.
8. **The Seal and the carriers.**
   - About ten texts said the Seal *cuts* carriers, against lore §2 and current-design ("closes signaling conduits;
     the steel holds"). All are fixed; only a Cable Wraith cuts a work span.
   - Several outcomes still say "the switch throws" or "two relays on" when no hop happens: `s3-gallery-dark`,
     `s3-twice-hello`, `s3-ash-moth-lamp`, `s3-escort-beacon` and `s3-sealed-wardens-relay`.
   - A rule was added to lore §13: events happen in the current yard, and the chart owns the hop.
9. **Guardian teaching.**
   - The Regent was written as having "gauntlets"; it is a gate machine with no arms. Its opening hail did not say
     how its gate opens. The Choir's hail spoke of "the shell".
   - The hails now state the real rules, matching the HUD tooltips:
     - two sources within a breath;
     - three hits in a second, or 12 s of held helm channel that drains handshake charge;
     - break a custody room to skip that step, with the archive never a target.
   - The codex, tips, lore and current-design agree with them.
10. **Pacing and repetition.**
    - Stage I hands out many TTL re-stamps and Stage III many full heals. Both look soft before their guardians;
      check this in balance.
    - Repeated scenes:
      - two departure boards;
      - two heartbeat lamps;
      - four first-hello escort scenes;
      - two events titled "Inspection Due";
      - six Stage II "wait, and the Seal moves" choices with no upside;
      - echo tenders in Stage II (the Kittiwake plus the Patience plus four relay events), where lore asks for *the*
        echo tender;
      - Stage III distress signals that end in the same Marshal/Moth/Reaver fight.
    - Proposal: retitle the duplicates, lower the weights of `s2-combat-echo-tender-relight` and
      `s2-distress-tender-requests`, and give waits a small upside.
11. **Casting.**
    - Several portraits contradicted the text's gender or age: `recruit-linefolk-b` is an old man but voiced women, and
      the courier portraits had the same problem. Names and portraits were aligned in the events.
    - New portrait requests: `recruit-linefolk-c` (older woman) and `bellmaker-b` (very old). The `bellmaker` portrait
      still stands in for four bellmakers.
12. **Small false claims, fixed.**
    - Glasswing's survey horns do not "hear one relay farther": its +1 Listening Post only works in combat.
    - "Hopping away forfeits the reward" omitted the TTL and Seal cost.
    - The Veil Car said "cloak", and Thrusters said "hop-drive".
    - The name suggestions offered "Lamplighter" for the other two cars.

**What L changed (text only, no numbers).**
- `src/data/ship.ts`: tender descriptions and limitations. The three cars now read as lamplighter-pattern cars
  fitted for lamps, optical inspection and drone retrieval.
- `src/data/cars.ts`:
  - Glasswing and Switchback descriptions.
  - Air-room names "Lens Purge Plant" and "Workshop Ventilation" become "Air Plant".
  - "Spare Ward Cradle" becomes "Ward Mesh Bay".
- `src/data/weapons.ts`, `systems.ts`, `species.ts`, `augments.ts`, `drones.ts`:
  - "shield(s)" becomes "mesh layer" or "ward mesh" in every player-facing line.
  - "hop-drive", "ship-wide" and "orbits" are replaced.
- `src/content/flavor.ts`: car descriptions for the two new tenders, Keepalive, courier, Veil Car and Triple Burst.
- `src/content/codex.ts`:
  - New entries: *The Lamplighter Pattern* (which now holds the maintenance-key text), *G-04, the Glasswing* and
    *S-08, the Switchback*.
  - Gate wardens now fly on rotors and mend the Regent.
  - The Regent and Choir entries state their real rules.
- `src/content/script.ts`:
  - Prologue narration is no longer attributed to the Operator.
  - "Three of them are standing".
  - The guardian hails teach the real rules.
  - The Regent has no gauntlets.
  - Crew-lost game over now ends as "one more echo tender on the Line", as lore §10 says.
- `src/content/tender-story.ts`: the opening and departure are rebuilt (finding 6). Dock records are
  lamplighter-pattern.
- `src/content/tips.ts`, `names.ts` and `content.test.ts`:
  - The guardian tips are rewritten.
  - The retreat cost is now in the tips.
  - No dock name appears among the name suggestions.
  - The test now accepts `ships/glasswing` and `ships/switchback` art.
- Events (about 170 in-place text edits across all eight decks, no ids, flags, weights or numbers changed): cost
  wording, tender neutrality, Seal and carrier consistency, casting, "boathook", "dead" machines, and
  `s3-lift-control` art (now `lift-head`).
- `docs/lore.md`:
  - §2 explains that the pattern holds whatever the job.
  - §6 says four decks, matching the ship.
  - The new §6a covers Glasswing and Switchback.
  - §8 describes the guardian rules as they play in a fight.
  - The glossary gains lamplighter pattern, mesh layer, payloads, spares and Exchange.
  - §13 adds three rules: three tenders with one pattern, one word per thing, and events do not hop.
- `docs/current-design.md`: the tender family, exact guardian rules, and a "Words" section.
- `art-src/subjects.py` (ids unchanged; `import specs` still loads): Glasswing and Switchback subjects, title,
  relay-seven, s1-e (no eclipse disk), e3 (from a spire top, not from space), and the legacy EVENTS, PROPS and
  scavenger text.
- `docs/art-requests.md`:
  - The sealed relay keeps its carrier.
  - The carrier cut is a Wraith cutting a side span.
  - The radio and refit art are tender-neutral.
  - Skiffs hang from carriers.
  - The Colossus is built into the wall.
  - Two portrait requests added.
- New `docs/art-briefs.md`: 2–4 sentences per scene, illustration, ending and hull, stating what must be visible,
  what must not, and what is wrong now.
- One edit outside L's files: `src/screens/newvoyage.ts:51`. The first name suggestion is no longer "Lamplighter", so
  the initial ship is created as `newShip("Lamplighter", …)` instead of `tenderNames()[0]`.

**Verified.**
- `pnpm test` passes (0 failures).
- `pnpm build` passes.
- `python3 -c "import specs"` loads 186 assets.
- `parse_requests()` returns 44 events.
- The opening beats were printed for all three tenders and read through.
- The Runbook tender entries were checked by screenshot.

**Routed to other agents** (file · current string → proposed string · reason).

- **S · `src/screens/relay.ts:184`** (C) **and `src/screens/pause.ts:44`**
  - Current: button label "SHIP".
  - Proposed: "TENDER".
  - Reason: the game never calls the car a ship.
  - Same fix in `src/screens/guide.ts:12` "U ship and upgrades", `store.ts:95`/`347` "Ship screen", and
    `combat/hud.ts:502`/`624` "Ship screen (U)".
- **S · `src/screens/newvoyage.ts:153`**
  - Current: "SHIELDS NOT FITTED".
  - Proposed: "NO WARD MESH".
- **S · `src/screens/newvoyage.ts:28–30`**
  - The local summaries duplicate `STARTING_TENDERS`. Use these (3 lines each):
    - Lamplighter: "Relit lamps and took crews off broken platforms. Its paired emitter and old repair-charge launcher
      now stop hunters."
    - Glasswing: "A lamplighter car refitted with lenses to align signal lamps. Its paired emitters now fire together
      into quarantine defences."
    - Switchback: "A tall lamplighter car that fetched drones from unreachable spans. Armed drones and a heavy drive
      stand in for a ward mesh."
- **S · `src/screens/guide.ts`**

  | Location | Current | Proposed |
  | --- | --- | --- |
  | l.16 | "break shields with one volley" | "break the ward mesh with one volley" |
  | l.22 | "Weapons, shields, air and engines compete" | "Weapons, the Shield Array, air and the Thrusters compete" |
  | l.23 | "TWO BARS, ONE SHIELD" / "Shields gain a layer every two powered bars" | "TWO BARS, ONE MESH LAYER" / "The Shield Array raises one mesh layer for every two powered bars" |
  | l.12 | "a dependable ammunition-free weapon" | "a dependable weapon that needs no payloads" |
  | l.34, Regent card | "Destroy those wardens" | "Stop those wardens" (machines' tasks end) |
  | l.36, Core card | "the Heart powers a devastating beam" | "the Core pulls every light inward in one long beam" |
- **C · `src/combat/scene.ts:446`**
  - Current: "A gate warden steps back into the gate."
  - Proposed: "A gate warden folds back into the gate."
  - Reason: wardens fly on rotors.
- **C · combat sim**
  - Issue: the Helm attendance mismatch (finding 3).
  - Also: consider a cost line for the event window (finding 1; `src/campaign/events.ts` is shared).
- **A · `src/screens/backdrop.ts` ≈830**
  - Current: `g.circle(x + 58, y - 4, 24, P.ink1, true)`, the black eclipse disk.
  - Proposed: remove it, or draw a spire-top/mast silhouette crossing the sun.
- **A · `art-src/specs.py`**
  - `EVENT_WORLD`: no crowds (text in art-briefs §11.3).
  - `ENV_HEAD`, `FIG_HEAD` and `readable-regent`: "orbital" becomes "held up on spires above the cloud sea".
  - `ILL`: "top-down space game" becomes "side-view game".
  - The `copper-market` override contradicts the request: interior or exterior?
- **A/C · `weapons/payload-launcher` sprite**
  - Issue: it reads as a finned missile.
  - Proposed: an iron tube, air tank and brass shells with teal tips.
- **Design / balance**
  - Finding 2 (Switchback at the Regent).
  - Finding 7 (payload rewards for launcherless tenders; tender stories).
  - Finding 10 (TTL/heal generosity, repetition).

#### L2: content fixes (findings 7–10)

All changes are text plus existing mechanisms (`req`, `hideIfUnmet`, event `requires`, outcome `modifiers`,
weights). No engine code changed, and no ids were deleted.

**1. Rewards and costs now fit the tender.**
- Two ways, depending on how the payloads appear:
  - **Choices that are about payloads** are gated by capability with `req: { weapon: "payload" }, hideIfUnmet`. Where
    that would leave a tender short of options, a sibling choice is available to every car:
    - Moss (Reach): "Ask for payloads" is gated; new "Ask for spares instead of promises" gives 2 spares.
    - Moss (Glass): "Payloads, and a rack" is gated; new "Spares, and a hold to keep them in" gives 3 spares and a
      Cargo Hold.
    - Scavenger trade "spares for payloads" is gated.
    - `s3-demolition-after` "Take the breaker charges" is gated.
    - `s3-gatehouse` payload rack is gated.
    - `s1-condemned-skip` is about nothing but shells, so the whole event now `requires: { weapon: "payload" }`.
  - **Single-outcome grants** alternate by tender with outcome `modifiers` (`tender: lamplighter` ↔ the other two).
    Exactly one outcome has weight, so the choice is not marked uncertain, and the new cost line shows the right
    cost. Payloads are swapped at roughly their exchange value:
    - `s1-bench-shelf` tin: 2 payloads, or 10 salvage.
    - `s1-market-skiff-exchange` (Tollands): 2 payloads, or 1 spare and 5 salvage.
    - `s1-relief-returns` (both choices): TTL 2 plus 2 payloads, or TTL 2 plus 2 spares.
    - `s3-shift-rations` armoury: 2–3 payloads, or 2 spares.
    - Stage III warden rate: 2 payloads and a payload rack, or 2 spares and a cargo hold.
    - `chain-moss-glass-grudge`: the loss is 2–3 payloads, or 1–2 spares. It was free on a car without payloads. Its
      text now says "payloads or spares".
  - Mixed rewards where the payloads are a bonus were left alone: the lampers' stash, the Sentinel queue salvage, and
    the Demolition recall (whose real prize is skipping an elite fight).
- `s3-pulse-ahead`: shield damage (free on Switchback) became one bar of **random system** damage ("one of the
  systems takes the worst of it"). The cost is now the same on every car, and the "preparation" label is not
  misused.
- **Missing mechanism** (for the campaign owner): there is no negative capability condition (`notWeapon`, `not`).
  - Because of that, the alternation keys on the tender, not the equipment. A Glasswing that bought a Payload
    Launcher still gets the substitute, and a Lamplighter that sold its launcher still gets payloads. Both are rare
    and still honest.
  - Also: the random victory/`reward` rolls (`src/data/rewards.ts:44`, `src/campaign/rewards.ts:19`) still grant
    payloads to cars without a slug thrower. Route: reroll payloads to spares when `!weapon: payload`.

**2. One story each for Glasswing and Switchback** (`shared.ts`, gated by `requires: { tender }`, unique, weight 2)
- **`any-glasswing-pair`** (Stage II, "Keep the Pair Together"). A Cathedral warning lamp has slipped out of focus.
  - Align it with both lenses: Seal +1, TTL +1 re-stamp, sets `glasswing-pair-aligned`.
  - Use one lens: 50/50 between TTL +1 and one Weapons Bay bar. The choice text warns: "The paint on the rack says
    otherwise."
  - Leave it.
- **`any-switchback-seventh`** (Stage I, "Six Returned, One Missing"). Drone S-08 · 7 is wedged on a work span.
  - Crane: Seal +1, 3 spares, the drone's survey reveals the chart.
  - Service drone: 1 spare; 2/3 chance to net +2 spares and the reveal, 1/3 the spare is lost. The choice text
    warns: "the wind under the span is strong."
  - Mark it on the chart.
- Two flags (`flags.ts`) and two ending callbacks. The tender's own beat, including L-12's `corran-berth`, is now
  last in `ENDING_CALLBACKS`, so it survives `endingReflections`' two-beat limit.
- Both events reuse `cathedral-nave` and `spire-top`. The proposed art ids `events/glasswing-lamp-alignment` and
  `events/switchback-seventh-drone` are briefed in art-briefs.md §6.

**3. No hop inside an event.**
- About 55 outcome and choice lines across all decks now keep the car in the current yard. "The switch throws", "you
  switch away", "two/three relays on", "the next relay switches you" and "tow her to the next relay" became "the relay
  takes the car into its yard", "brings you in by a side carrier" (where a TTL was spent), "holds the switch for you"
  or "writes the car into its switch log".
- The named events:
  - `s3-gallery-dark`
  - `s3-twice-hello` (all three outcomes)
  - `s3-ash-moth-lamp`
  - `s3-escort-beacon`
  - `s3-marshal-escort-out` (doors)
  - the sealed wardens relay (choice now "slip into the yard under their clamps")
  - `s3-empty-bells-on-stone` ("Get the car ready to move")
  - `s1-wraith-behind` ("Run for the yard")
  - the Stage II web, bells, serpent and lattice relays
- TTL gifts phrased as "opens the next two relays" or "switches you with a stamp to spare" now read as re-stamps.
- Future-tense remarks ("nobody says anything until the next relay") were kept.

**4. Repetition.**
- Duplicate scenes now have distinct angles:
  - `s1-empty-departures` is now the **Arrivals** board ("CAR FROM BELOW · AWAITED").
  - `s1-empty-heartbeat` is now **Still Here**, a keepalive lamp the crew can answer. The hourly heartbeat stays
    with `s1-heartbeat-lamp`.
  - `s1-yard-inspection` is retitled **Chalk Marks**.
  - `s1-escort-hello` is now **Still on Shift**: an escort awake and sweeping a step for a crew that is not coming.
    The shared `any-first-hello` escort sleeps, `s1-sos-lost-rigger` has lost its crew, and the Foreman's escort holds
    a condemned lamp.
- Stage II's seven no-upside waits now carry a small honest upside. The Seal cost is unchanged, and the cost line
  still shows it.

  | Wait | Upside |
  | --- | --- |
  | `s2-ahead-of-the-seal` | +2 hull |
  | `s2-distress-breathing` (all night) | crew rest (heal) |
  | `s2-combat-echo-hour` | codex *The Heartbeat* |
  | `s2-combat-choir-hellos` | fragment *f2-announcement* |
  | `s2-combat-echo-tender-carrier` | its arms patch +2 hull |
  | `s2-hazard-ringing-panes-pulse` | +2 hull |
  | `s2-hazard-resonance-bells` | heal |

- Echo tenders: weights lowered, so the Kittiwake stays *the* echo tender. Per-draw share among ungated Stage II
  events:

  | Event | Pool | Before | After |
  | --- | --- | --- | --- |
  | `s2-combat-echo-tender-relight` | combat | 1 → 4.0 % | 0.5 → 2.0 % |
  | `s2-distress-tender-requests` | distress | 1 → 6.3 % | 0.5 → 3.3 % |

- Soft spots were measured and left unchanged, because the data does not justify cutting weights.
  - Probe: headless `playVoyage`, 60 seeds, random choices, forced wins.
  - TTL left at the guardian:

    | Stage | Average TTL left | Range | Hops in the stage (average) |
    | --- | --- | --- | --- |
    | I | 6.1 | 0–13 | 14.9 |
    | II | 4.4 | 0–12 | 12.6 |
    | III | 4.3 | 0–12 | 12.7 |

  - Stage I is looser but still reaches 0.
  - Stage III has 24 events with a guaranteed free heal, 8 of them outside benches. The sample's Stage III losses come
    from hull, not crew.
  - **Recommendation:**
    - If human playtests show TTL never binds in Stage I, halve `s1-bench-hobb` (2 → 1) and `s1-bench-press`
      (1 → 0.5) first.
    - Convert the non-bench Stage III heals (`s3-reading-room`, `s3-lift-control`, `s3-ground-packets`,
      `s3-school-question`, `s3-staff-bunk-car`) to a small repair or a fragment. That is a design decision, not a
      weight.

**Tagline removed** (lead's request): "Every hop costs a little life." is gone from the credits card in
`src/content/script.ts` (which keeps "a Faultline voyage") and from lore §0. No replacement tagline. The copies in
`src/screens/title.ts:144` and `src/screens/credits.ts:20` belong to S.

**Verified.**
- `pnpm test`: 122 pass, 0 fail.
- `pnpm build` passes.
- A script presented the changed events for all three tenders:
  - the alternated choices are deterministic;
  - the cost line reads "−2–3 payloads" on L-12 and "−1–2 spares" on G-04/S-08;
  - gated payload choices are hidden on G-04/S-08;
  - the Stage II waits show "Seal +1 hop" and grant their upside.

---

## Appendix: the previous pass (historical)

The previous note claimed: three physical vessel plans (Lamplighter 12×4, Glasswing 10×4, Switchback 13×5); nine
functional cars with visible costs; six extra regional paintings (15 total) with parallax and weather; ward
geometry that follows the hull; persistent Easy/Medium/Hard difficulty; and balance runs recorded in
[difficulty-balance.md](difficulty-balance.md). The mechanics and data changes remain in the code and are not
disputed here. Their visual presentation is what this plan revises. The QA scripts it listed (`tools/design-qa.mjs`,
`tools/vessel-qa.mjs`, `tools/art/browser-qa.mjs`, `tools/art/refit-qa.mjs`, `pnpm test:*`) remain useful as
regression checks.
