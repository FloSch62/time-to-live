# Combat workstream notes

FTL combat, re-skinned for the Line (contract ★v2 side view, ★v2.1 modular consist, ★v2.2 painted weapons/drones,
★v3 HD). The simulation is pure TypeScript in `src/combat/sim/*` (deterministic, fixed step 1/60 s, node-testable);
the scene, renderer and HUD live in `src/combat/*`; game data in `src/data/*`.

## API (for the campaign)

```ts
import { createCombatScene, newPlayerShip, drawShipPreview, shipPreviewSize } from "../combat";
import { WEAPONS, DRONES, AUGMENTS, SYSTEMS, SPECIES, ENEMIES, CARS, MODULES, REACTOR_COSTS, reactorCost,
         upgradeCost, rollReward, afterHop, coupleCar, applyRefit, validateShip, normalizeShip, consistStats,
         deriveSystemRooms, newInventory, itemCost, sellPrice } from "../data";
```

- `createCombatScene(app, { ship, inventory, setup, onEnd })` → `Scene`. Calls `onEnd(result)` exactly once; never
  removes itself (switch scenes in `onEnd`). Music: sets the `battle` layer on enter (or plays `setup.music`), back
  to `explore` on victory/flight. `setup.intro` is shown in the combat log; the enemy's handshake line comes from
  `ENEMY_FLAVOR`.
- `CombatResult.ship` is a normalized copy: hull, system power allocations (FTL keeps them), system damage repaired
  after the fight (kept on defeat), crew hp/xp/kills/repairs, dead crew removed (listed in `crewLost`), weapon power.
  `inventory` has payloads/spares spent (Drone Recovery refunds spares of drones still flying). `reward` is rolled
  for victory/surrender (not for `noReward`). Enemy crews that run away → `outcome: "fled"` (see requests/combat.md).
- `newPlayerShip(name, lamp = "amber")`: the Lamplighter lead car (30 hull, reactor 8, shields 2, engines 2,
  weapons 3, air 1, medbay 1, helm 1, sensors 1, doors 1; 3 hardpoints: Burst Emitter + Payload Launcher; 2 drone
  slots; 2 module sockets), crew linefolk (helm) + warden (shields) + rigger (weapons), names from content.
- `newInventory()`: salvage 20, TTL 16, payloads 8, spares 2.
- `drawShipPreview(g, ship, x, y, { crew, highlight, sockets, t, mesh })` draws the whole consist with (x, y) as its
  top-left and returns `{ w, h, rooms: [{ id, name, x, y, w, h, system, socket, module }] }` in screen coords for
  hit-testing. `shipPreviewSize(ship)` gives the size first.
- Refits (pure, return a new valid ShipState): `coupleCar(ship, "rear" | "keel", carId | null)`,
  `applyRefit(ship, "<slot>:<room>", moduleId | null)`; `normalizeShip(ship)` re-derives slots/system hosting;
  `validateShip(ship)` lists problems; `consistStats(consist, modules)` gives weapon/drone slots, crew/cargo/payload/
  spares caps, hull bonus, sensors/repair modifiers, evasion malus, socket list.
- `afterHop(ship)`: Varga's Crimper (+1 hull) and Harrow's Kettle (full heal). Call after every hop.
- `rollReward(rng, stage, depth, tier)`; tiers `low | med | high | elite | boss`.
- Costs: `SYSTEMS[id].cost[level]` (price to reach `level`), `buyCost`/`buyLevel` for drones/veil, `reactorCost(bars)`
  / `REACTOR_COSTS[bars]`, `WEAPONS[id].cost`, `DRONES[id].cost`, `AUGMENTS[id].cost`, `CARS[id].cost`,
  `MODULES[id].cost`; `sellPrice(id)` = half.

## Dev entries
- `/?dev=combat&enemy=<id>&stage=<n>` fresh starter ship (`&level=typical|strong`, `&depth=0.5`, `&hazard=<id>`,
  `&seed=n`, `&auto=1` autopilot, `&rear=<car>&keel=<car>`, `&lamp=teal`, `&paused=0`).
- `/?dev=combat-strong&enemy=<id>` upgraded ship for the enemy's stage.
- `/?dev=combat-ship&rear=drone-car&keel=ballast-keel` consist preview.

## Controls
| Input | Action |
|---|---|
| Space | pause / resume (orders work while paused) |
| Left-click crew / drag a box / F1–F8 | select crew (Shift adds) |
| Right-click a room | move selected crew there |
| Left-click a door, hatch or airlock | open / close it |
| Z / X | open all doors (vents) / close all doors |
| R / Shift+R | return crew to saved stations / save current positions |
| 1–5 or click a weapon card | power it (if off) / select it for targeting |
| click an enemy room / warden / sealing drone | target with the selected weapon |
| beams: press on an enemy room and drag | aim the cut (length limited) |
| right-click (targeting) / Esc | cancel |
| right-click weapon card, Shift+1–5 | clear its target / power it down |
| V | autofire |
| click system icon / right-click | +1 / −1 power |
| A S D F G H (+Shift) | power shields, thrusters, infirmary, air, drones, veil (Shift removes) |
| C | engage the Lamp-Dark Veil |
| 7–9 | launch / recall drones |
| J | HOP (when the handshake is complete) |

## Mechanics (decisions)
- FTL numbers: shields 2 power per layer, 2 s recharge per layer; engines evasion 5/10/15/20/25/28/31/35 %; manning
  bonuses and skill XP as FTL (helm/engines +5/7/10 % evasion, weapons +10/15/20 % charge, shields +10/20/30 %
  recharge, repair ×1/1.1/1.2, combat ×1/1.1/1.2); ion locks one bar per stack for 5 s; beams never miss (unless
  veiled) and lose 1 damage per shield layer; payloads ignore shields; flak scatters around the room.
- Mobility (★v2): crawlers ×0.8 engine evasion, fliers ×1.3 (+6), installations 0. Each coupled car −2 % evasion.
- Handshake = hop drive: charges with drive power and a manned helm (autopilot at helm 2+ at half speed); three
  segments HELLO · I HEAR YOU · I HEAR YOU HEAR ME; HOP → `outcome: "fled"`.
- Side view: every grid row is a deck; doors in walls, hatches with ladders in floors (climbing is slower and
  costs more in pathfinding); airlocks on the outer edges; gangway door between rear and lead car, keel hatch.
- Guardians: Iron Regent's gate (two different routes within 2.2 s open it for ~10 s; gate wardens mend and close it
  faster), Hollow Choir's glass (3 hits within 1 s shatter it for 11 s), Blackout Core (Custody rotation of four
  artillery rooms; Emergency at 50 %: +8 hull, repairs, +4 reactor, +2 shield levels, two steps at a time, ×1.3
  charge; Event Horizon at 25 %: +8 hull, horizon beam, two sealing drones each adding a shield layer, −10 %
  evasion for the tender).
- Hazards: debris (1-damage debris every 7–13 s at either ship; shields/defence drones stop it), rust squall (−1 power
  on a random system of each ship every 20 s for 10 s), sun glare / ember draft (fires every 24/30 s, ember draft
  doubles fire spread), glass fog / dark stretch (sensors blank for both), ringing panes (ion on a random system of
  each ship every 20 s), resonance (+10 % charge for all), sealing lattice (handshake 15 % slower).
