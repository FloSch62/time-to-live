import { test, before } from "node:test";
import assert from "node:assert/strict";
import { Rng } from "../core/rng.ts";
import { loadContent, testShip } from "./testkit.ts";
import { createRun } from "./run.ts";
import { applyOutcome, checkCondition, newCtx, reqLabel } from "./events.ts";
import { coupleCar, uncoupleCar, refit, sockets, tenderStats, freeSocket, crewCap } from "./refit.ts";
import { buyItem, rollStock, sellCar } from "./store.ts";
import { installSystem } from "./shipops.ts";
import { deserialize, serialize } from "./savegame.ts";

before(async () => {
  await loadContent();
});

test("coupling cars changes the numbers, costs evasion, and uncoupling returns modules to the stores", () => {
  const r = createRun(11, testShip());
  const s0 = tenderStats(r.ship);
  coupleCar(r.ship, "freight-car");
  const s1 = tenderStats(r.ship);
  assert.equal(r.ship.consist.rear, "freight-car");
  assert.ok(s1.cargo > s0.cargo, "freight car adds cargo");
  assert.ok(s1.hullMax > s0.hullMax, "freight car adds hull");
  assert.equal(s1.evasion, s0.evasion - 2);
  const rearSock = sockets(r.ship).find((s) => s.startsWith("rear:"));
  assert.ok(rearSock, "the rear car brings a socket");
  r.ship.moduleStore.push("cargo-hold");
  refit(r.ship, rearSock!, "cargo-hold");
  assert.equal(r.ship.modules[rearSock!], "cargo-hold");
  assert.ok(tenderStats(r.ship).cargo > s1.cargo);
  uncoupleCar(r.ship, "rear");
  assert.equal(r.ship.consist.rear, undefined);
  assert.ok(r.ship.moduleStore.includes("cargo-hold"), "module back in the stores");
  assert.equal(tenderStats(r.ship).cargo, s0.cargo);
});

test("drone bay: a system needs a host (car or module)", () => {
  const r = createRun(12, testShip());
  assert.equal(r.ship.systems.drones, undefined);
  assert.ok(installSystem(r.ship, "drones"));
  assert.ok(r.ship.systems.drones && r.ship.systemRooms.drones, "hosted by a drone-bay module in a socket");
  const r2 = createRun(13, testShip());
  coupleCar(r2.ship, "drone-car");
  assert.ok(r2.ship.systems.drones && r2.ship.systemRooms.drones?.startsWith("rear:"), "the drone car hosts it");
});

test("outcomes offer cars and store modules; conditions and labels know cars and modules", () => {
  const r = createRun(14, testShip());
  const rng = new Rng(1);
  const a = applyOutcome(r, { car: "random-keel", module: "ballast" }, newCtx(r), rng);
  assert.equal(a.grants.find((g) => g.kind === "car")?.placed, "offer");
  assert.ok(r.ship.moduleStore.includes("ballast"));
  assert.equal(checkCondition(r, { module: "ballast" }).ok, true);
  assert.equal(checkCondition(r, { car: "rear" }).ok, false);
  assert.equal(checkCondition(r, { carFree: "rear" }).ok, true);
  coupleCar(r.ship, "bunk-car");
  assert.equal(checkCondition(r, { car: "rear" }).ok, true);
  assert.equal(checkCondition(r, { car: "bunk-car" }).ok, true);
  assert.equal(checkCondition(r, { carFree: "rear" }).ok, false);
  assert.match(reqLabel({ car: "keel" }), /Keel car/);
  assert.ok(crewCap(r.ship) > 6, "bunk car adds berths");
});

test("stores sell cars and modules; Pell always has cars; selling a car pays half", () => {
  const r = createRun(15, testShip());
  const pell = rollStock(r, r.pos, true);
  assert.ok(pell.items.filter((i) => i.kind === "car").length >= 2);
  assert.ok(pell.pell);
  r.inv.salvage = 500;
  const k = pell.items.findIndex((i) => i.kind === "car");
  assert.ok(buyItem(r, pell, k).ok);
  const slot = r.ship.consist.rear ? "rear" : "keel";
  const before = r.inv.salvage;
  assert.ok(sellCar(r, slot).ok);
  assert.ok(r.inv.salvage > before);
  const m = pell.items.findIndex((i) => i.kind === "module");
  if (m >= 0) {
    const free = freeSocket(r.ship);
    assert.ok(buyItem(r, pell, m).ok);
    if (free) assert.ok(r.ship.modules[free], "a bought module is fitted into a free socket");
  }
});

test("the consist survives a save round-trip", () => {
  const r = createRun(16, testShip());
  coupleCar(r.ship, "armory-car");
  coupleCar(r.ship, "listening-keel");
  r.ship.livery.lamp = "violet";
  const back = deserialize(serialize(r))!;
  assert.deepEqual(back.ship.consist, r.ship.consist);
  assert.equal(back.ship.livery.lamp, "violet");
  assert.equal(back.ship.weaponSlots, r.ship.weaponSlots);
});

test("paid car replacements and sales preserve occupied crew berths without charging", () => {
  const run = createRun(171, testShip());
  coupleCar(run.ship, "bunk-car");
  while (run.ship.crew.length < 8) run.ship.crew.push({ ...run.ship.crew[0], id: String(100 + run.ship.crew.length) });
  run.inv.salvage = 500;
  const stock = rollStock(run, 1);
  stock.items.push({ kind: "car", id: "armory-car", price: 75 });
  const before = JSON.stringify(run.ship);
  const result = buyItem(run, stock, stock.items.length - 1);
  assert.equal(result.ok, false);
  assert.match(result.reason!, /berths/);
  assert.equal(sellCar(run, "rear").ok, false);
  assert.equal(run.inv.salvage, 500);
  assert.equal(JSON.stringify(run.ship), before);
  assert.equal(stock.items.at(-1)!.sold, undefined);
});

test("a shop cannot sell a redundant second system housing", () => {
  const run = createRun(172, testShip());
  assert.ok(installSystem(run.ship, "drones"));
  run.inv.salvage = 500;
  const stock = rollStock(run, 1);
  stock.items.push({ kind: "module", id: "drone-bay", price: 60 });
  assert.equal(buyItem(run, stock, stock.items.length - 1).ok, false);
  assert.equal(run.inv.salvage, 500);
});
