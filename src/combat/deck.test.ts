import test from "node:test";
import assert from "node:assert/strict";
import { makePlayerShip, newInventory } from "../data/ship.ts";
import { CARS } from "../data/cars.ts";
import { ENEMY_LAYOUTS } from "../data/layouts.ts";
import { normalizeShip, coupleCar } from "../data/consist.ts";
import { Sim } from "./sim/sim.ts";
import { orderMove, updateDeckMovement } from "./sim/crew.ts";
import { findPath } from "./sim/path.ts";

const setup = { enemy: "packet-leech" as const, stage: 1 as const, seed: 22, depth: 0 };
const dock = (ship = makePlayerShip("Deck test")) => {
  const sim = new Sim(ship, newInventory(), setup);
  sim.crew = sim.playerCrew();
  return sim;
};
const walk = (sim: Sim, seconds = 40) => { for (let i = 0; i < seconds * 60; i++) updateDeckMovement(sim, 1 / 60); };

test("the consolidated vessel has 13 rooms and every functional bay has at least two tiles", () => {
  const sim = dock(), ship = sim.ships[0];
  assert.equal(ship.rooms.length, 13);
  for (const r of ship.rooms) if (!r.lift) assert.ok(r.tiles.length >= 2, r.id);
  assert.equal(Object.values(CARS.lamplighter.legend).filter(r => r.socket).length, 2);
});

test("all three starter plans stay reachable with every rear and keel combination and every hostile layout", () => {
  const rear = [null, ...Object.values(CARS).filter(c => c.slot === "rear").map(c => c.id)] as const;
  const keel = [null, ...Object.values(CARS).filter(c => c.slot === "keel").map(c => c.id)] as const;
  const check = (sim: Sim, side: 0 | 1) => {
    const s = sim.ships[side], from = s.rooms[0].tiles[0];
    for (const r of s.rooms) assert.ok(r.tiles[0] === from || findPath(s, from, r.tiles[0], false).length, `${s.defId}: ${r.id}`);
  };
  for (const lead of ["lamplighter", "glasswing", "switchback"] as const) for (const r of rear) for (const k of keel) {
    let ship = makePlayerShip("Paths", undefined, "amber", lead);
    ship = coupleCar(ship, "rear", r as never);
    ship = coupleCar(ship, "keel", k as never);
    check(dock(ship), 0);
  }
  for (const enemy of Object.keys(ENEMY_LAYOUTS)) check(new Sim(makePlayerShip("Paths"), newInventory(), { ...setup, enemy: enemy as never }), 1);
});

test("crew walk and queue through service lifts and recover at an equipped workshop bench", () => {
  let ship = coupleCar(makePlayerShip("Walking"), "keel", "workshop-keel");
  ship.crew[0].hp = 50;
  const sim = dock(ship), s = sim.ships[0];
  const target = s.rooms.find(r => r.id === "keel:bench")!;
  for (const c of sim.crew.slice(0, 2)) assert.ok(orderMove(sim, c, target.i));
  const hp = sim.crew.map(c => c.hp), xp = sim.crew.map(c => JSON.stringify(c.xp));
  walk(sim);
  for (const c of sim.crew.slice(0, 2)) {
    assert.equal(c.path.length, 0); assert.equal(s.tileRoom[c.tile], target.i);
  }
  assert.notEqual(sim.crew[0].tile, sim.crew[1].tile, "crew reserve different berths");
  assert.ok(sim.crew[0].hp > hp[0] && sim.crew[0].hp <= sim.crew[0].maxHp, "the equipped workshop services injured crew");
  assert.deepEqual(sim.crew.slice(1).map(c => c.hp), hp.slice(1), "healthy crew remain at their actual maximum");
  assert.deepEqual(sim.crew.map(c => JSON.stringify(c.xp)), xp);
  assert.equal(s.hull, ship.hull); assert.equal(sim.projectiles.length, 0);
});

test("current crew rooms survive combat handoff independently of saved return stations", () => {
  const sim = dock(), s = sim.ships[0], c = sim.playerCrew()[0];
  const dest = s.rooms.find(r => r.id === "lead:medbay")!;
  assert.ok(orderMove(sim, c, dest.i)); walk(sim);
  sim.finish("escaped");
  const saved = JSON.parse(JSON.stringify(sim.result().ship));
  assert.equal(saved.crew[0].room, "lead:medbay");
  assert.equal(saved.crew[0].station, "lead:helm");
  const resumed = dock(saved), member = resumed.playerCrew()[0];
  assert.equal(resumed.ships[0].rooms[resumed.ships[0].tileRoom[member.tile]].id, "lead:medbay");
  resumed.returnToStations(); walk(resumed);
  assert.equal(resumed.ships[0].rooms[resumed.ships[0].tileRoom[member.tile]].id, "lead:helm");
});

test("old save rooms and detached-car locations migrate to valid crew stations", () => {
  const old = makePlayerShip("Old voyage");
  old.crew[0].room = "lead:quarters";
  assert.equal(normalizeShip(old).crew[0].room, "lead:helm");
  let ship = coupleCar(makePlayerShip("Refit"), "rear", "freight-car");
  ship.crew[0].room = "rear:freight"; ship.crew[0].station = "rear:freight";
  ship = coupleCar(ship, "rear", null);
  assert.equal(ship.crew[0].room, "lead:hall");
});
