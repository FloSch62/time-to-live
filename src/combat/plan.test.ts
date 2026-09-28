// Relay planning (design plan §2.3, C4): changes made on the ship bar out of combat persist in ShipState and are
// the allocation the next fight starts with.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePlayerShip, newInventory } from "../data/ship.ts";
import { Sim } from "./sim/sim.ts";
import { effective, reactorUsed } from "./sim/power.ts";
import { planningSim, planAddPower, planRemovePower, planWeapon, planDrone, planSwapWeapons } from "./plan.ts";

const fightWith = (ship: ReturnType<typeof makePlayerShip>, inv = newInventory()) =>
  new Sim(JSON.parse(JSON.stringify(ship)), inv, { enemy: "packet-leech", stage: 1, seed: 3, depth: 0.2 });

test("planned system and weapon power reach the next fight", () => {
  const ship = makePlayerShip("Plan");
  const plan = planningSim(ship);
  assert.ok(planRemovePower(plan, ship, "shields"));
  assert.ok(planRemovePower(plan, ship, "shields"));
  assert.ok(planAddPower(plan, ship, "medbay"), "a freed bar goes to the infirmary");
  assert.equal(planWeapon(plan, ship, 0, false), false, "burst emitter powered down");
  assert.ok(planAddPower(plan, ship, "engines") === false, "thrusters are already at their level");
  assert.deepEqual(ship.weaponPower.slice(0, 2), [false, true]);
  assert.equal(ship.systems.shields!.power, 0);
  assert.equal(ship.systems.medbay!.power, 1);

  const sim = fightWith(ship);
  const P = sim.ships[0];
  assert.equal(effective(P.sys.shields), 0, "the fight starts with the mesh unpowered, as planned");
  assert.equal(P.shields, 0);
  assert.equal(effective(P.sys.medbay), 1);
  assert.equal(P.weapons.find((w) => w.slot === 0)!.powered, false);
  assert.equal(P.weapons.find((w) => w.slot === 1)!.powered, true);
  assert.ok(reactorUsed(P) <= P.reactor);
});

test("weapon order swapped at the relay is the order in the fight", () => {
  const ship = makePlayerShip("Order");
  assert.ok(planSwapWeapons(ship, 0, 2), "burst emitter trades places with the spare packet laser in mount 3");
  assert.deepEqual(ship.weapons.slice(0, 3), ["packet-laser", "payload-launcher", "burst-emitter"]);
  assert.deepEqual(ship.weaponPower.slice(0, 3), [false, true, true]);
  const sim = fightWith(ship);
  const burst = sim.ships[0].weapons.find((w) => w.def.id === "burst-emitter")!;
  assert.equal(burst.slot, 2);
  assert.ok(burst.powered, "its power flag travels with it");
});

test("a drone armed at the relay launches when the next fight starts", () => {
  const ship = makePlayerShip("Drones", undefined, "amber", "switchback");
  const plan = planningSim(ship);
  assert.equal(planDrone(plan, ship, 1, true), true, "firewall drone armed");
  assert.deepEqual(ship.dronePower?.slice(0, 2), [false, true]);
  const inv = newInventory("switchback");
  const sim = fightWith(ship, inv);
  const d = sim.ships[0].drones.find((q) => q.slot === 1)!;
  assert.ok(d.powered, "armed drones are powered as the fight opens");
  sim.step();
  assert.ok(d.out, "and launch on the first tick");
  assert.equal(sim.ships[0].spares, inv.spares - 1, "spending one spare");
  assert.equal(sim.ships[0].drones.find((q) => q.slot === 0)!.powered, false, "the unarmed drone stays docked");
});

test("disarming and depowering are remembered too", () => {
  const ship = makePlayerShip("Off", undefined, "amber", "switchback");
  const plan = planningSim(ship);
  planDrone(plan, ship, 0, true);
  planDrone(plan, ship, 0, false);
  assert.deepEqual(ship.dronePower?.slice(0, 2), [false, false]);
  planWeapon(plan, ship, 0, false);
  const sim = fightWith(ship, newInventory("switchback"));
  assert.equal(sim.ships[0].weapons[0].powered, false);
  assert.ok(sim.ships[0].drones.every((d) => !d.powered));
});
