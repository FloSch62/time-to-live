# Requests from the writing workstream

## 1. `EventDef.hazard?: HazardId` (schema request)

Hazard-pool events describe arriving in one specific hazard (a rust squall is not a debris field). There is no field
for that yet. **Until it lands, every hazard-pool event id contains its hazard id** (e.g.
`s1-hazard-rust-squall-lamps`), which `src/campaign/events.ts` already matches on. When the field exists, the writing
workstream will fill it in on every hazard event; the id convention stays.

## 2. Guardian script beats (FYI, no schema change)

`src/content/script.ts` exports `GUARDIAN: Record<guardianId, Record<"approach" | "handshake" | "start" | "half" |
"final" | "defeat", ScriptBeat[]>>`: `approach` before the exit event, `handshake` (handshake + refusal) when the
fight starts, `start` / `half` / `final` phase banners (the first beat's text is the machine line; for the Blackout
Core these are Custody, Emergency at half integrity, Event Horizon), and `defeat`. `GUARDIAN_BARKS` holds short
machine lines for the combat screen.

## 3. Ending callbacks (FYI, no schema change)

`ENDING_CALLBACKS: { flag, beat }[]` in `script.ts`: optional ending beats for things the crew carried (music box,
Pell's letter, the courier's log, a reply to the evening caller, the Kittiwake, Moss's decoy, the Lamplighter's berth).
Show every beat whose run flag is set, in order, inserted before `ENDING[ENDING_CALLBACK_INSERT_AT]`.

## 4. Game over (FYI)

`GAME_OVER` is the default beat list (what the loader reads). `GAME_OVER_VARIANTS` has `hull` (tender destroyed),
`crew` (every crew member lost: the tender becomes an echo tender), and `default`. `GAME_OVER_TITLES` are headline
lines for the stats screen.

## 5. Waiting at TTL 0 (FYI)

Scripted events with ids starting `wait-` (in `src/content/events/shared.ts`) replace the built-in waiting events
in `src/campaign/run.ts`. They declare `stages`.

## 6. Exit aftermath flags (FYI)

Each stage's exit (guardian) fight has an `onWin` aftermath event that sets `guardian-1-ended` /
`guardian-2-ended` / `guardian-3-ended`. The campaign may key the stage transition off the aftermath closing.

## 7. Names (FYI)

`names.ts` exports full-name lists per species (`LINEFOLK_NAMES`, `WARDEN_NAMES`, `COURIER_NAMES`,
`BELLMAKER_NAMES`, `RIGGER_DESIGNATIONS`), raw pools (`GIVEN_NAMES`, `FAMILY_NAMES`, `DESIGNATION_BIRDS`),
`RELAY_NAMES` for the map and `TENDER_NAMES` for the naming screen, shaped for `registerNames` in
`src/campaign/content.ts`.

## 8. `Condition.car` / `Condition.module` (schema request, v2.1)

Events want to react to the consist ("the rear car's door is jammed", "a bellmaker tunes your horn array", "Pell
buys back your freight car"). Proposed:

```ts
interface Condition {
  // …
  /** A car of this id is coupled, or any car in this slot ("rear" | "keel"). */
  car?: RearCarId | KeelCarId | "rear" | "keel";
  /** Room for a car in that slot (nothing coupled there yet). */
  carFree?: "rear" | "keel";
  /** This module is installed or in the module stores. */
  module?: ModuleId;
}
```

Until then the content only offers cars and modules (`Outcome.car`, `Outcome.module`) and never gates on them.

## 9. Flavor for cars, modules, livery (FYI)

`flavor.ts` exports `CAR_FLAVOR` (lead, rear and keel cars, with `slot`), `MODULE_FLAVOR`, `LIVERY_FLAVOR`, and every
`ENEMY_FLAVOR` entry now has `mobility: "crawler" | "installation" | "flier"`. System display names stay as
`src/data/systems.ts` has them (Shield Array, Thrusters, …); their descriptions carry the cable fiction (the ward
mesh, the drive trolley's motors).
