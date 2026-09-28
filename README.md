# TIME TO LIVE — a Faultline voyage

A single-player, pause-and-command roguelike set on the carriers outside FAULTLINE's Line. Choose **Lamplighter**, **Glasswing**, or **Switchback**, then take a working cable tender through the **Copper Reach**, **Glass Cathedral**, and **Blackout Heart**. Keep the crew alive, divert power, target machinery, and complete the greeting before the quarantine seals the route behind you.

The three-stage campaign contains 348 events, 51 recovered messages, 99 Runbook entries, 22 enemy types, and three guardians with different counterplay. The tender can carry rear and keel cars, room modules, 16 weapons, five drone types, and 14 augments. It has one crew and one voyage; there is no character switching or multiplayer.

Everything on screen is drawn inside the game canvas: bitmap type, brass controls, animated rooms and crew, Krea hulls, and painted pixel environments. The enemy occupies a large dedicated battle area. Both sides support independent zoom and pan. The vessels have independent deck plans: Lamplighter has 13 rooms, Glasswing 12, and Switchback 16 across five decks. Bay sets, mounts, drone capacity, crew capacity and expansion sockets differ.

The alpha ships locally generated Krea artwork, fifteen regional backgrounds, 1,726 hand-authored sprite frames, 14 YuE2 music themes across 22 adaptive tracks, and 64 sound-effect cues with 89 variants. Music uses original scores and locally generated performances.

## Play locally

Requires Node 24 or newer.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5181/**. Use **Alt+Enter** or the Settings menu for fullscreen. The existing development server uses this folder and port. Music starts after the first keyboard or mouse interaction.

Progress saves at campaign checkpoints in this browser. Continue resumes the voyage; a lost fight ends it. Settings and discovered Runbook entries persist between voyages. Clearing browser storage removes them.

Open **Field guide** on the title or pause screen for controls and guardian tactics. Choose Easy, Medium or Hard before departure. Eligible cleared relays unlock a single allocation based on the region and difficulty; revisits and sealed relays cannot be farmed. Field service restores crew and system faults for one Seal step. Hull repair costs salvage; a Workshop Keel also recovers limited hull after secured ordinary fights. Exchanges keep a dependable ammunition-free weapon in stock alongside their random equipment.

## Controls

| Action | Control |
| --- | --- |
| Field guide on title / pause screen | F1 |
| Pause / give orders | Space |
| Cancel selection / open pause menu | Escape |
| Select weapon / target room | 1–6, then click the enemy |
| Beam targeting | Drag across enemy rooms |
| Turn autofire on/off | V |
| Select crew (combat or relay) | Click a crew member or roster portrait or F1–F12; Shift adds to selection |
| Move selected crew (combat or relay) | Right-click a room |
| Return / save stations | R / Shift+R |
| Add / remove system power | Click / right-click system bars; Shift reverses system hotkeys |
| Toggle drones | 7–0; Shift turns off |
| Open / close all doors | O / L |
| Activate Lamp-Dark Veil | C |
| Escape to a connected relay after handshake (1 TTL + Seal step) | J or HOP |
| Zoom a vessel | Mouse wheel over that vessel |
| Pan | Middle-button drag or arrow keys; right-drag also works in combat |
| Reset views | Z; double middle-click resets the pointed view |
| Chart / tender upgrades at a relay | M / U |

Hover crew for health, species traits, skills and current orders. Crew can walk between rooms and attached cars at any relay; their current room and saved return station persist separately.

Room and equipment tooltips explain damage, power, costs, and guardian rules. Service lifts carry crew between decks; connected cars have usable gangways and lift connections.

## Validation and production

```sh
npm test          # campaign, save, content, mechanics and complete simulated voyages
npm run build    # TypeScript and production bundle
npm run test:production # serve dist temporarily and check its actual entry point
npm run test:e2e # isolated browser checks; development server must be running
npm run test:balance
npm run test:campaign # full voyages with real combat and legal purchases
node tools/vessel-qa.mjs # every wagon purchase preview at both desktop sizes
node tools/readability-qa.mjs # crew hover, dockside travel, zoom, attached keel and saved stations
npm run test:ux # dense upgrade panel, guide, relay stores and Continue
npm run test:audio # WebAudio phases, fades and bounded caches
npm run test:assets # all runtime content references
npm run test:media # decode every shipped image and sound in Chromium
npm run test:narrative # render every event and outcome, check canvas bounds
npm run test:soak # repeated live guardian fights in one page
```

Browser evidence is written under `tools/shots/qa/`. Tests use an isolated browser context and do not touch a player's saved voyage. The alpha remains subject to playtesting and balance tuning.

See [readability overhaul](docs/readability-pass.md) for the room, hull, equipment and crew changes.

See [alpha validation](docs/alpha-validation.md) for the checked scope and remaining review items.

- [Current design](docs/current-design.md), [audit implementation](docs/design-audit-implementation.md), [lore](docs/lore.md), [historical contract](docs/contract.md), and [combat balance evidence](docs/balance-combat.md), and [difficulty cohorts](docs/difficulty-balance.md).
- `art-src/`: local Krea 2 prompts, reference images, candidates, queue, and delivery provenance.
- `audio-src/`: local YuE2 scores, takes, analysis, mastering and effect sources.
- `tools/sprites/`: hand-authored animated pixel sprite atlases.
- `public/`: runtime assets; model weights and authoring tools are not shipped in the game.

Generation jobs share FAULTLINE's GPU lock. Krea and YuE never run together. The launchers now enforce a 15 GiB process-group RAM ceiling and a 256 MiB swap ceiling through user systemd services. Art delivery uses bounded palette matching and a separate 1 GiB ceiling. These limits protect the host; a failed generation can be resumed from the preserved queue/takes.

See asset-specific notices and manifests for third-party and generated material. The game is an original FAULTLINE expansion; FTL and its soundtrack are influences, not included assets.
