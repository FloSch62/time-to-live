// Content validation for the combat workstream's data (layouts, cars, enemies, weapons, rewards, refits).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ENEMY_IDS, WEAPON_IDS, DRONE_IDS, AUGMENT_IDS, SYSTEM_IDS, REAR_CAR_IDS, KEEL_CAR_IDS, MODULE_IDS, LEAD_CAR_IDS } from "../game/ids.ts";
import { ENEMY_LAYOUTS, ENEMY_GRIDS, enemyLayout, parseLayout, TILE } from "./layouts.ts";
import { ENEMIES, scaleEnemy } from "./enemies.ts";
import { WEAPONS, weaponDef } from "./weapons.ts";
import { DRONES } from "./drones.ts";
import { AUGMENTS } from "./augments.ts";
import { SYSTEMS, reactorCost, upgradeCost } from "./systems.ts";
import { CARS, carDef } from "./cars.ts";
import { MODULES } from "./modules.ts";
import { composeConsist, consistStats, coupleCar, applyRefit, validateShip, normalizeShip } from "./consist.ts";
import { makePlayerShip } from "./ship.ts";
import { rollReward } from "./rewards.ts";
import { Rng } from "../core/rng.ts";
import { Sim } from "../combat/sim/sim.ts";
import { findPath } from "../combat/sim/path.ts";
import { newInventory } from "./ship.ts";

test("tile size follows the contract (★v4)", () => {
  assert.equal(TILE, 36);
});

test("every enemy has a layout on its contract grid, rooms are rectangles, and one weapons/shields room", () => {
  for (const id of ENEMY_IDS) {
    assert.ok(ENEMY_LAYOUTS[id], `layout for ${id}`);
    const L = enemyLayout(id);
    const [c, r] = ENEMY_GRIDS[id];
    assert.equal(L.cols, c, `${id} cols`);
    assert.equal(L.rows, r, `${id} rows`);
    const def = ENEMIES[id];
    if (!def.boss) assert.ok(L.cols <= 8, `${id}: non-boss hostiles are at most 8 wide`);
    for (const room of L.rooms) {
      if (room.lift) assert.equal(room.w, 1, `${id}:${room.id} lift is one tile wide`);
      else assert.equal(room.h, 1, `${id}:${room.id} rooms are one deck tall`);
    }
  }
});

test("every system an enemy declares has a room (except artillery)", () => {
  for (const id of ENEMY_IDS) {
    const L = enemyLayout(id);
    const def = ENEMIES[id];
    for (const sys of Object.keys(def.systems)) {
      if (sys === "artillery") continue;
      assert.ok(L.rooms.some((r) => r.system === sys), `${id} has a room for ${sys}`);
    }
    // Installations do not evade: no engines/helm.
    if (def.mobility === "installation") assert.ok(!def.systems.engines, `${id} installation without engines`);
  }
});

test("enemy weapons exist and scaled enemies stay sane", () => {
  for (const id of ENEMY_IDS) {
    for (const d of [0, 0.5, 1]) {
      const e = scaleEnemy(id, ENEMIES[id].stage, d);
      for (const w of e.weapons) assert.ok(weaponDef(w), `${id}: weapon ${w}`);
      assert.ok(e.hull > 0 && e.reactor > 0);
    }
  }
  for (const st of [1, 2, 3] as const) assert.ok(scaleEnemy("quarantine-drone", st, 0.5).hull > 0);
});

test("the rooms of every car are rectangles and the layouts connect", () => {
  for (const [id, def] of Object.entries(CARS)) {
    const L = parseLayout(def.map, "right", def.legend, def.airlocks);
    if (def.slot === "lead") assert.deepEqual([L.cols, L.rows], id === "glasswing" ? [10, 4] : id === "switchback" ? [13, 5] : [12, 4], `${id} independent deck plan`);
    if (def.slot === "rear") assert.deepEqual([L.cols, L.rows], [4, 4], `${id} rear car 4×4`);
    if (def.slot === "keel") assert.deepEqual([L.cols, L.rows], [6, 2], `${id} keel car 6×2`);
    for (const a of def.airlocks) assert.ok(L.rooms.some((r) => r.id === a.room), `${id} airlock room ${a.room}`);
  }
  assert.equal(CARS.lamplighter.hardpoints.length, 3);
  assert.equal(Object.values(CARS.lamplighter.legend).filter((l) => l.socket).length, 2);
});

test("every item id has data", () => {
  for (const id of WEAPON_IDS) assert.ok(WEAPONS[id]?.cost > 0, id);
  for (const id of DRONE_IDS) assert.ok(DRONES[id], id);
  for (const id of AUGMENT_IDS) assert.ok(AUGMENTS[id], id);
  for (const id of SYSTEM_IDS) assert.ok(SYSTEMS[id].maxLevel >= 1, id);
  for (const id of [...REAR_CAR_IDS, ...KEEL_CAR_IDS]) assert.ok(carDef(id).cost > 0, id);
  for (const id of MODULE_IDS) assert.ok(MODULES[id], id);
  assert.ok(reactorCost(8) > 0 && Number.isFinite(upgradeCost("shields", 4)));
});

test("the starting tender is valid and composes", () => {
  const s = makePlayerShip("Lamplighter");
  assert.deepEqual(validateShip(normalizeShip(s)), []);
  const L = composeConsist(s.consist, s.modules);
  assert.equal(L.cols, 12);
  assert.equal(L.rows, 4);
  assert.equal(s.weaponSlots, 3);
  assert.equal(s.crew.length, 3);
  assert.equal(s.hull, 30);
});

test("coupling cars and refitting modules keep the ship valid", () => {
  let s = makePlayerShip("L");
  s = coupleCar(s, "rear", "drone-car");
  assert.ok(s.systems.drones, "drone car brings the Drone Bay");
  assert.equal(s.systemRooms.drones, "rear:bay");
  assert.equal(s.droneSlots, 3);
  s = coupleCar(s, "keel", "ballast-keel");
  assert.equal(s.hullMax, 38);
  assert.deepEqual(validateShip(s), []);
  const L = composeConsist(s.consist, s.modules);
  assert.equal(L.connectors?.length, 2, "gangway and keel hatch");
  // Uncouple: the Drone Bay's level is kept in storage, unhosted.
  s.systems.drones!.level = 4;
  s = coupleCar(s, "rear", null);
  assert.equal(s.systems.drones?.level, 4);
  assert.equal(s.systemRooms.drones, undefined);
  // A module can host it again.
  s = applyRefit(s, "lead:hold-a", "drone-bay");
  assert.equal(s.systemRooms.drones, "lead:hold-a");
  s = applyRefit(s, "lead:hold-b", "ballast");
  assert.equal(s.hullMax, 41);
  s = applyRefit(s, "lead:hold-b", null);
  assert.equal(s.hullMax, 38);
  assert.ok(s.moduleStore.includes("ballast"));
  assert.deepEqual(validateShip(s), []);
  const st = consistStats(s.consist, s.modules);
  assert.equal(st.weaponSlots, 3);
});

test("armory car adds a hardpoint; crew in a removed car move to the lead", () => {
  let s = makePlayerShip("L");
  s = coupleCar(s, "rear", "armory-car");
  assert.equal(s.weaponSlots, 4);
  s.weapons[3] = "packet-laser";
  s.crew[0].station = "rear:magazine";
  s = coupleCar(s, "rear", null);
  assert.equal(s.weaponSlots, 3);
  assert.ok(s.cargo.includes("packet-laser"), "the fourth weapon goes to cargo");
  assert.equal(s.crew[0].station, "lead:hall");
});

test("rewards scale with stage and tier", () => {
  const rng = new Rng(1);
  let low = 0;
  let boss = 0;
  for (let i = 0; i < 200; i++) {
    low += rollReward(rng, 1, 0, "low").resources?.salvage ?? 0;
    boss += rollReward(rng, 3, 1, "boss").resources?.salvage ?? 0;
  }
  assert.ok(boss > low * 3);
  const b = rollReward(new Rng(5), 2, 1, "boss");
  assert.ok(b.weapon || b.drone || b.augment, "guardians always drop an item");
});

test("all three deck plans keep every bay and console reachable with every rear and keel combination", () => {
  for (const lead of LEAD_CAR_IDS) for (const rear of [null, ...REAR_CAR_IDS]) for (const keel of [null, ...KEEL_CAR_IDS]) {
    let state = makePlayerShip("Connectivity", undefined, "amber", lead);
    state = coupleCar(coupleCar(state, "rear", rear), "keel", keel);
    assert.deepEqual(validateShip(state), [], `${lead}/${rear}/${keel}`);
    const sim = new Sim(state, newInventory(lead), { enemy: "packet-leech", stage: 1, seed: 42, depth: 0 });
    const ship = sim.ships[0], from = ship.rooms[0].tiles[0];
    for (const room of ship.rooms) for (const tile of room.tiles) {
      assert.ok(tile === from || findPath(ship, from, tile).length, `${lead}/${rear}/${keel}: ${room.id} tile ${tile}`);
    }
  }
});

test("native retrieval bays preserve sockets and obsolete module saves migrate without duplicate hosts", () => {
  const s = makePlayerShip("S", undefined, "amber", "switchback");
  assert.equal(s.systemRooms.drones, "lead:drones");
  assert.equal(s.systemRooms.veil, "lead:veil");
  assert.deepEqual(s.modules, {});
  assert.equal(s.droneSlots, 3);
  assert.equal(s.weaponSlots, 2);
  s.modules = { "lead:hold-a": "drone-bay", "lead:hold-b": "veil-housing" };
  normalizeShip(s);
  assert.deepEqual(s.modules, {});
  assert.deepEqual(new Set(s.moduleStore), new Set(["drone-bay", "veil-housing"]));
  assert.deepEqual(validateShip(s), []);
});

test("reusable ballast modules never supply free hull repairs", () => {
  let ship = makePlayerShip("Damaged");
  ship.hull = 1;
  ship.moduleStore.push("ballast");
  for (let i = 0; i < 5; i++) {
    ship = applyRefit(ship, "lead:hold-a", "ballast");
    assert.equal(ship.hullMax, 33);
    assert.equal(ship.hull, 1);
    ship = applyRefit(ship, "lead:hold-a", null);
    assert.equal(ship.hull, 1);
  }
});
