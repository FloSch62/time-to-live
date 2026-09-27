# Campaign workstream notes

The campaign layer: run state, stage charts and the Seal, the event runtime, rewards, the store, upgrades and refits,
save/continue, meta progress, and every non-combat screen. Code in `src/campaign/**` (logic; the pure modules are
node-testable) and `src/screens/**` (scenes).

## Flow

```
Title ─ New voyage (name, livery lamp, crew, seed) ─ PROLOGUE ─ STAGE_INTRO[1] ─┐
      └ Continue (loads the save, restarts the current relay's encounter)        │
                                                                                 ▼
  ┌──────────────────────── relay view (hub) ◄───────────────────────────────────┐
  │  arrive → event window (choices → outcome → [overflow/car offer])            │
  │        → combat (combat scene; fallback auto-resolve) → victory/reward        │
  │        → store (market) → next event …                                        │
  │  hub: Chart·Hop (M) / Ship (U) / Exchange (S) / Esc pause                     │
  │  hop: handshake + 1 TTL, the Seal advances, augments tick → arrive           │
  │  TTL 0: WAIT for a signal (Seal +1.5 steps; wait-* events, or a patrol)      │
  └── exit relay: GUARDIAN.approach → exit event → boss fight → GUARDIAN.defeat  │
        → onWin aftermath (sets guardian-N-ended) → STAGE_OUTRO[N]               │
        → N<3: STAGE_INTRO[N+1], new chart, TTL +3 (min 6) ─────────────────────┘
        → N=3: ENDING (+ ENDING_CALLBACKS by flag) → credits → voyage summary → title
  defeat (hull 0 / no crew): GAME_OVER_VARIANTS[hull|crew|default] → run summary → title
```

The whole voyage is one async loop, `playVoyage(run, presenter)` in `src/campaign/voyage.ts`. The UI presenter is
`src/screens/session.ts` (scenes); the headless presenter (`src/campaign/headless.ts`) plays random voyages in tests.

## Rules decided here

- **Stage charts** (`map.ts`): 20–24 relays, Poisson-disc on a 760×330 chart, planar links within a hop radius (2–5
  each, at most one dead end), start left, guardian right, shortest route 6–9 hops. Types by stage weights plus 2–3
  exchanges spread over the thirds, one bench, two hazards, one signal guaranteed. Relay names from `names.ts`.
- **The Seal**: starts off-chart; each hop advances it `sealStep` = (exit.x − start) / (shortest + margin), margin 7/6/5
  hops by stage. Waiting advances 1.5 steps. Hops out of a *glass fog* relay advance it ×0.5, out of a *sealing
  lattice* ×2. It stops just short of the guardian's relay (the gate holds). `Outcome.seal` pushes it back/forward.
  Every arrival at a sealed relay meets a fresh quarantine patrol (`sealed` pool, no rewards).
- **TTL**: 1 per hop. At 0 the chart offers WAIT: half the time inside the Seal a patrol finds you, otherwise a
  `wait-*` event (content's, else three built-in ones in `run.ts`); a quarter of waits draw a `combat` event.
- **Stage transition**: TTL = max(6, TTL + 3). Hull and crew are not restored (FTL).
- **Knowledge of the chart**: exit always; visited; adjacent-to-visited exchanges/signals/hazards/benches; with the
  Listening Horn augment or a car with `reveal` (Listening Keel) the adjacent relays in full; sensors ≥ 3 shows
  every exchange; `revealMap` everything.
- **Between relays** (every hop): system damage is mended by the crew; `afterHop` augments (Varga's Crimper,
  Harrow's Kettle) from `src/data`.
- **Fleeing**: the fight stays at the relay (`pendingCombat`); coming back restarts it without the event.
- **Stores** roll once per relay (seeded) and persist: 3 weapons, 1–2 drones, 2–3 augments, 1–2 crew, Drone
  Bay/Veil (hosted by a module in a free socket when no car carries one), cars (Pell: 2–3; others 55% one), 2–3
  modules, TTL/payloads/spares, hull repair per point (2/3/4 by stage). Prices ×1/1.1/1.2 by stage, Pell −8%.
  Selling = half price. Payloads and spares respect the consist's caps. Pell's stall = Stage I market whose event id
  contains `pell` (or flag `pell-stall`).
- **Refits** (Ship screen → Yard): modules can be fitted/swapped/removed and cars uncoupled only at an exchange or
  a bench; the livery lamp there too (and on the New Voyage screen). Uncoupling at an exchange sells the car for half;
  at a bench it is left behind. Every change shows its stat deltas before Confirm.
- **Unique events** are reserved at arrival (so a restarted encounter keeps its event).

## Save format (`savegame.ts`, localStorage `ttl.voyage`)

```json
{ "kind": "ttl-voyage", "version": 1, "savedAt": 0,
  "summary": { "stage": 1, "relay": "Tallow Lamp", "ship": "Lamplighter", "hull": 30, "ttl": 16 },
  "run": RunState }
```

`RunState` (`model.ts`) is plain JSON: seed, `rng` (sfc32 state), stage, `map` (relays with type/hazard/name/links/
visited/eventId/resolved/pendingCombat/store stock, `sealX`, `sealStep`, `revealed`), `pos`, `ship` (ShipState with
consist/modules/moduleStore/livery), `inv`, `flags`, `fragments`, `codex`, `usedEvents`, `stats`, `route`, `met`,
`nextCrewId`, `fights`, `guardianBeaten`, `stagesCleared`, `found`.

Save points: after the prologue, at every arrival (before the encounter — the checkpoint), after every encounter,
after the store and the ship screen, on Save & quit. Nothing is saved mid-encounter, so continuing restarts the
current relay's encounter from its first event with the same rng state (no save-scumming). A finished run
(victory or defeat) deletes the save. Loading normalises the ship through `src/data`'s `normalizeShip`.

**Meta progress** (`meta.ts`, `ttl.meta`): Runbook entries, fragments and enemies ever met (absorbed at every save,
so knowledge survives a lost voyage), voyages started/completed/defeats, best stage, `voyageCompleted`, total hops,
machines stopped, recent tender names.

## Flags

Stored only (content defines them): everything in `src/content/flags.ts` / `ALL_FLAGS`. Read by the campaign:
`guardian-1/2/3-ended` (stage transition), the ending callback flags (`corran-berth`, `music-box-sent`,
`pell-letter-posted`, `courier-log-3`, `kittiwake-lit`, `moss-decoy`, `answer-queued`), `pell-stall` /
`store:pell` (Pell's stall). Set by the campaign: `approach-<stage>` (the guardian's approach cut-in was shown).

## Integration points

- **Combat** (`combat-adapter.ts`): finds `createCombatScene` / `drawShipPreview` in `src/combat` by Vite glob; falls
  back to `autoresolve.ts` (and dev WIN/FLEE/LOSE buttons under `?dev`). `CombatSetup` from `voyage.ts buildSetup`:
  depth from the relay's x, hazard, `surrenderable` for human crews, `boss` + guardian music for the exit,
  `noReward` in sealed relays. The result's ship/inventory replace the run's; `reward` is applied and shown.
  `previewGrip()` mirrors combat's `buildPlayerView` to hang the consist from the relay view's carrier.
- **Data** (`src/data`): prices, rarities, system costs/levels, reactor, species, enemies by stage, rewards
  (`rollReward`, `randomWeapon` …), the Lamplighter (`makePlayerShip`), consist rules (`consistStats`, `coupleCar`,
  `applyRefit`, `normalizeShip`), `afterHop`.
- **Content** (`content.ts` registry, filled by `content-loader.ts` glob / `testkit.ts` in node): events (pool, stages,
  weight, unique, requires, hazard), fragments, codex (start/outcome/enemy unlocks), script (PROLOGUE, STAGE_INTRO/
  OUTRO, GUARDIAN approach/defeat, ENDING + callbacks, GAME_OVER variants/titles, CREDITS), names, tips, flavor.
- **Art**: `bg/title`, `bg/relay-seven`, `bg/line-quiet`, `bg/s<n>-a|b|c`, `bg/map-s<n>`, `events/*`, `portraits/*`,
  `ending/e1…e6`, `ships/lamplighter` (+ `ships.json`), `weapons/<id>-icon`, `drones/<id>-icon`. Every one has a
  code-painted HD fallback (`backdrop.ts`, `tender.ts`, `items.ts`, `event.ts` placeholders).
- **Audio**: music per contract §8.1 (`screens/music.ts`: stage themes A/B per relay, exchange at markets and in the
  store, guardian tracks via `CombatSetup.music`, relay-seven/an-answer/line-quiet/title from scripts and screens);
  sfx: ui-*, hop, arrive, map-open, event-open, buy, sell, salvage-pickup, radio-squelch, victory-sting,
  defeat-sting, lamp-on, door-close, repair-done, power-up, power-denied, page-lamp (script beats).

## Dev entries (`/?dev=…`)

`title`, `relay`, `map` (`&stage=2&hops=5`), `event` (`&id=<eventId>` or `&pool=bench`), `store` (`&stage=1&pell`),
`ship` (`&tab=0..3&bench`), `yard`, `script` (`&seq=PROLOGUE|ENDING|GAME_OVER|STAGE_INTRO_2|STAGE_OUTRO_1|iron-regent`),
`runbook`, `gameover`, `ending`, `credits`, `newvoyage`, `settings`, `victory`, `overflow`. Common params: `seed`,
`stage`, `hops`, `cars`, `auto=1` (auto-resolve fights).

## Tests (`npm test`)

`map.test.ts` (determinism, connectivity, degrees, the Seal never overtakes a shortest route, pushback),
`events.test.ts` (conditions incl. cars/modules, blue labels, placeholders, every Outcome field, overflow,
deterministic picking), `save.test.ts` (round-trip, rejection, store persistence, meta), `autorun.test.ts` (40 random
voyages end in victory or defeat with no dead ends; 12 forced-win voyages beat all three guardians; saves restore at
every save point; every event reference resolves).
