import { test } from "node:test";
import assert from "node:assert/strict";
import { Sim } from "./sim/sim.ts";
import { AutoPlayer } from "./sim/autoplay.ts";
import { chargeRate } from "./sim/weapons.ts";
import { updateSystems, manner } from "./sim/power.ts";
import { updateDrones } from "./sim/drones.ts";
import { coupleCar } from "../data/consist.ts";
import { sendBoarders } from "./sim/ai.ts";
import { shieldState } from "./sim/shield-state.ts";
import { makePlayerShip, newInventory } from "../data/ship.ts";
import { wardOutline, wardContact } from "./shield-geometry.ts";
import type { ShipView } from "./view.ts";
import type { CombatSetup } from "../game/types.ts";

function encounter(overrides: Partial<CombatSetup> = {}) {
  return new Sim(makePlayerShip("Test"), newInventory(), { enemy: "packet-leech", stage: 1, seed: 41, depth: .2, ...overrides });
}

test("optional shield arrays occupy native bays and unfitted tenders stay exposed", () => {
  for (const id of ["lamplighter", "glasswing", "switchback"] as const) {
    const sim = new Sim(makePlayerShip("T", undefined, "amber", id), newInventory(id), { enemy: "packet-leech", stage: 1, seed: 1, depth: 0 });
    const state = shieldState(sim.ships[0]);
    assert.equal(state.charged, id === "switchback" ? 0 : 1);
    assert.equal(state.installed, id === "switchback" ? 0 : 1);
    assert.equal(state.status, id === "switchback" ? "NOT FITTED" : "PROTECTED");
    assert.equal(state.recharging, false);
  }
});

test("mesh telemetry distinguishes charged, unavailable, ion-locked and unfitted capacity", () => {
  const sim = encounter(), P = sim.ships[0], system = P.sys.shields!;
  system.level = 4; system.power = 2; P.shields = 1;
  let state = shieldState(P);
  assert.deepEqual([state.charged, state.available, state.installed, state.cause], [1, 1, 2, "LOW POWER"]);
  P.shields = 0; P.shieldT = .6;
  state = shieldState(P);
  assert.equal(state.status, "EXPOSED"); assert.equal(state.recharging, true); assert.equal(state.progress, .6);
  system.damage = 3;
  state = shieldState(P);
  assert.equal(state.cause, "DAMAGED"); assert.equal(state.recharging, false); assert.equal(state.progress, 0);
  system.damage = 0; system.ion = 3;
  assert.equal(shieldState(P).cause, "ION-LOCKED");
});

test("removing mesh power drops protection immediately while combat is paused", () => {
  const sim = encounter();
  assert.equal(sim.ships[0].shields, 1);
  assert.equal(sim.removePower("shields"), true);
  assert.equal(sim.ships[0].shields, 0);
  assert.equal(shieldState(sim.ships[0]).recharging, false);
});

test("departure requires a legal affordable destination and returns its exact identity", () => {
  const routes = [{ to: 7, name: "Near", cost: 1 }, { to: 9, name: "Far", cost: 2 }];
  const sim = encounter({ retreat: routes[0], retreatOptions: routes });
  sim.ships[0].hop = 1;
  assert.equal(sim.hop(99), false);
  assert.equal(sim.hop(9), true);
  assert.equal(sim.result().retreatTo, 9);
  assert.equal(sim.result().inventory.ttl, newInventory().ttl, "campaign commits the travel transaction once");
  const empty = new Sim(makePlayerShip("T"), { ...newInventory(), ttl: 0 }, sim.setup);
  empty.ships[0].hop = 1;
  assert.equal(empty.hopReady(), false); assert.equal(empty.hop(7), false);
  const unlinked = encounter(); unlinked.ships[0].hop = 1;
  assert.equal(unlinked.hop(), false);
  assert.throws(() => unlinked.result(), /Combat has not ended/);
});

test("boarding traverses a visible grapple, can be cut, and enters through a real breach", () => {
  const sim = encounter({ enemy: "static-nest" }), E = sim.ships[1];
  E.weapons = [];
  sendBoarders(sim, "spark-mite", 2);
  assert.equal(sim.boarding.length, 1);
  assert.equal(sim.crew.filter(c => c.kind === "boarder").length, 0);
  sim.run(2);
  assert.equal(sim.boarding.length, 1);
  E.sys.brood!.damage = E.sys.brood!.level;
  sim.step();
  assert.equal(sim.boarding.length, 0);
  assert.equal(sim.crew.filter(c => c.kind === "boarder").length, 0);
  assert.ok(sim.takeEvents().some(e => e.type === "boarding-cut"));
  E.sys.brood!.damage = 0;
  sendBoarders(sim, "spark-mite", 2);
  const entry = sim.boarding[0].tile;
  sim.run(4.1);
  assert.equal(sim.crew.filter(c => c.kind === "boarder").length, 2);
  assert.ok(sim.ships[0].breach[entry] > 0);
});

test("duty release needs continuous suppression and a working acknowledgement", () => {
  const sim = encounter({ scenario: { objective: "release-duty", system: "weapons", holdSeconds: 2, enemyDamage: { weapons: 3 } } });
  const E = sim.ships[1]; sim.crew = sim.crew.filter(c => c.side === 0);
  assert.equal(E.sys.weapons!.damage, E.sys.weapons!.level);
  sim.run(1); assert.ok(sim.dutyProgress > .9); assert.equal(sim.outcome, null);
  E.sys.weapons!.damage = 0; sim.step(); assert.equal(sim.dutyProgress, 0);
  E.sys.weapons!.damage = E.sys.weapons!.level; sim.run(2.1);
  assert.equal(sim.outcome, "victory"); assert.equal(sim.resolution, "released"); assert.ok(E.hull > 0); assert.equal(E.dead, false);
});

test("the Choir supports sustained helm tuning and loses progress when the helm fails", () => {
  const sim = encounter({ enemy: "hollow-choir", stage: 2 });
  sim.ships[1].weapons = [];
  sim.tuneChoir(true); sim.run(3);
  const gl = sim.ships[1].boss.glass!;
  assert.ok(gl.channel > 2.9 && gl.up);
  sim.ships[0].sys.helm!.damage = sim.ships[0].sys.helm!.level;
  sim.run(.5); assert.ok(gl.channel < 2.1);
  sim.ships[0].sys.helm!.damage = 0;
  sim.run(11); assert.equal(gl.up, false);
  assert.ok(sim.takeEvents().some(e => e.type === "choir-channel"));
});

test("opening the Core shell freezes danger until the deliberate delivery action", () => {
  const sim = encounter({ enemy: "blackout-core", stage: 3 });
  const E = sim.ships[1], P = sim.ships[0];
  E.boss.core!.phase = 3; E.hull = 0; sim.step();
  assert.equal(sim.deliveryReady, true); assert.equal(sim.outcome, null);
  assert.equal(E.dead, false); assert.equal(E.shields, 0);
  const hull = P.hull, time = sim.t, crewHp = sim.crew.map(c => c.hp);
  P.fire[P.rooms[0].tiles[0]] = 1;
  sim.run(40);
  assert.equal(P.hull, hull); assert.equal(sim.t, time); assert.deepEqual(sim.crew.map(c => c.hp), crewHp);
  assert.equal(sim.deliver(), true); assert.equal(sim.resolution, "delivered"); assert.equal(sim.outcome, "victory");
  assert.equal(sim.deliver(), false);
});

test("a crewless hunter repairs through its controller and does not suffer an empty-crew defeat", () => {
  const sim = encounter({ enemy: "quarantine-drone" }), E = sim.ships[1];
  assert.equal(sim.crew.filter(c => c.side === 1).length, 0);
  E.weapons = []; E.sys.engines!.damage = 1;
  sim.run(9.2); assert.equal(E.sys.engines!.damage, 0); assert.equal(sim.outcome, null);
  E.sys.helm!.damage = E.sys.helm!.level; E.sys.engines!.damage = 1;
  sim.run(10); assert.equal(E.sys.engines!.damage, 1);
});

test("autoplay powers both Switchback drones against interceptable weapons before extra evasion", () => {
  const sim = new Sim(makePlayerShip("T", undefined, "amber", "switchback"), newInventory("switchback"), { enemy: "scrap-foreman", stage: 1, seed: 1, depth: 0 });
  new AutoPlayer(sim).tick(1 / 60);
  assert.equal(sim.ships[0].drones.filter(d => d.powered).length, 2);
});

test("the ward traces attached cars and suspension gaps while excluding empty corners", () => {
  const view = { side: 0, dx: 3, dy: 2, cars: [
    { slot: "lead", x: 100, y: 0, meta: { w: 120, h: 80 }, body: [[0,0],[120,0],[120,80],[0,80]] },
    { slot: "rear", x: 0, y: 0, meta: { w: 90, h: 70 }, body: [[0,0],[90,0],[90,70],[0,70]] },
    { slot: "keel", x: 120, y: 90, meta: { w: 65, h: 40 }, body: [[0,0],[65,0],[65,40],[0,40]] },
  ] } as ShipView;
  const outline = wardOutline(view);
  assert.ok(outline.length > 20);
  const inside = ([x, y]: [number, number]) => {
    let found = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const a = outline[i], b = outline[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) found = !found;
    }
    return found;
  };
  assert.equal(inside([40, 40]), true); assert.equal(inside([150, 120]), true); assert.equal(inside([155, 95]), true);
  assert.equal(inside([30, 120]), false, "empty lower corner stays outside the ward");
  const rearContact = wardContact(outline, [-100, 40], [40, 40]);
  const keelContact = wardContact(outline, [280, 120], [150, 120]);
  assert.ok(rearContact[0] < 3 && rearContact[0] > -11 && rearContact[1] === 40);
  assert.ok(keelContact[0] > 188 && keelContact[0] < 202 && keelContact[1] === 120);
  assert.equal(inside([rearContact[0] + 1, 40]), true, "the projectile contacts the painted edge");
});


test("pressure-hull geometry ignores transparent sprite margins", () => {
  const v = { side: 1, dx: 0, dy: 0, cars: [{ slot: "enemy", x: 0, y: 0, cols: 2, rows: 2, meta: { w: 800, h: 900, gx: 100, gy: 100 }, body: [[100,100],[172,100],[172,172],[100,172]] }] } as ShipView;
  const edge = wardOutline(v);
  assert.ok(Math.max(...edge.map(p => p[0])) < 190);
  assert.ok(Math.max(...edge.map(p => p[1])) < 190);
  assert.ok(wardContact(edge, [0, 136], [136, 136])[0] > 80);
});

test("fixed difficulty scales enemy hull, hostile impact and volley cadence without altering player weapons", () => {
  const fights = (["easy", "medium", "hard"] as const).map(difficulty => encounter({ difficulty }));
  const hulls = fights.map(s => s.ships[1].hullMax);
  assert.ok(hulls[0] < hulls[1] && hulls[1] <= hulls[2]);
  for (const s of fights) for (let i = 0; i < 120; i++) s.step();
  const charge = fights.map(s => s.ships[1].weapons[0].charge);
  assert.ok(charge[0] < charge[1] && charge[1] < charge[2]);
  const taken = fights.map(s => { const P = s.ships[0], before = P.hull; s.damageHull(P, 4, 1); return before - P.hull; });
  assert.ok(taken[0] < taken[1] && taken[1] < taken[2]);
  for (const s of fights) { const E = s.ships[1], before = E.hull; s.damageHull(E, 4, 0); assert.equal(before - E.hull, 4); }
});

test("a beam-only fit can fire when its cut penetrates the target's remaining ward", () => {
  const ship = makePlayerShip("Beam fit");
  ship.weapons = ["trunk-lance", null, null]; ship.weaponPower = [true, false, false];
  ship.systems.weapons!.level = 4; ship.reactor = 12;
  const sim = new Sim(ship, newInventory(), { enemy: "packet-leech", stage: 1, seed: 5, depth: 0 });
  sim.ships[1].shields = 0;
  const beam = sim.ships[0].weapons[0]; beam.charge = 100;
  new AutoPlayer(sim).tick(1 / 60);
  assert.ok(beam.target, "a pure beam loadout receives a legal target");
  sim.step();
  assert.equal(sim.beams.length, 1);
});


test("specialist wagon benefits change actual weapon, drone, Veil and debris behavior", () => {
  const make = (rear: "armory-car" | "drone-car" | "veil-car" | null, keel: "ballast-keel" | null = null) => {
    let ship = makePlayerShip("Wagon test", undefined, "amber", "switchback");
    ship = coupleCar(coupleCar(ship, "rear", rear), "keel", keel);
    const sim = new Sim(ship, newInventory("switchback"), { enemy: "packet-leech", stage: 1, seed: 1, depth: 0, hazard: "debris-field" });
    sim.crew = [];
    return sim;
  };
  const base = make(null), armory = make("armory-car"), drone = make("drone-car"), veil = make("veil-car"), ballast = make(null, "ballast-keel");
  assert.ok(Math.abs(chargeRate(armory, armory.ships[0]) / chargeRate(base, base.ships[0]) - 1.1) < 1e-8);
  for (const s of [base, drone]) { const d = s.ships[0].drones[0]; d.out = true; d.powered = true; d.cd = 20; updateDrones(s, s.ships[0], 1); }
  assert.ok(Math.abs(base.ships[0].drones[0].cd - drone.ships[0].drones[0].cd - .15) < 1e-8);
  for (const s of [base, veil]) { s.ships[0].veilT = .01; updateSystems(s, s.ships[0], .02); }
  assert.ok(Math.abs(veil.ships[0].veilCd / base.ships[0].veilCd - .9) < 1e-8);
  const loss = [base, ballast].map(s => { const P = s.ships[0], before = P.hull; s.damageHull(P, 4, -1); return before - P.hull; });
  assert.deepEqual(loss, [4, 2]);
});

test("autoplay can preserve a real payload reserve and deliberately spend it at a guardian", () => {
  const held = encounter(); held.ships[0].payloads = 3;
  new AutoPlayer(held, { payloadReserve: 3 }).tick(1 / 60);
  assert.equal(held.ships[0].weapons.find(w => w.def.ammo)!.powered, false);
  const guardian = encounter({ enemy: "iron-regent", boss: true }); guardian.ships[0].payloads = 3;
  new AutoPlayer(guardian, { payloadReserve: 0 }).tick(1 / 60);
  assert.equal(guardian.ships[0].weapons.find(w => w.def.ammo)!.powered, true);
  assert.equal(guardian.ships[0].payloads, 3, "reserving and powering never fabricates or spends ammunition");
});

test("damage control sends a wounded rigger to the actual native workshop before health is critical", () => {
  const sim = new Sim(makePlayerShip("Care", undefined, "amber", "switchback"), newInventory("switchback"), { enemy: "packet-leech", stage: 1, seed: 3, depth: 0 });
  const P = sim.ships[0], rigger = sim.playerCrew().find(c => c.species === "rigger")!;
  rigger.hp = rigger.maxHp * .45;
  new AutoPlayer(sim).tick(1 / 60);
  const target = P.rooms[P.tileRoom[rigger.path.length ? rigger.dest : rigger.tile]];
  assert.ok(target.bench > 0);
  assert.equal(target.id, "lead:workshop");
  assert.ok(rigger.path.length > 0, "recovery still requires the real deck/lift journey");
});

test("only a crew member at the helm speaks the greeting: an automated helm charges the switch but cannot hop", () => {
  const routes = [{ to: 4, name: "Next", cost: 1 }];
  const sim = encounter({ retreat: routes[0], retreatOptions: routes });
  const P = sim.ships[0];
  P.sys.helm!.level = 3;
  for (const c of sim.crew) if (c.side === 0 && c.task === "man" && P.rooms[P.tileRoom[c.tile]]?.sys?.id === "helm") {
    sim.moveCrew([c.uid], P.sys.engines!.room);
  }
  for (let i = 0; i < 120; i++) sim.step();
  assert.ok(!manner(sim, P, "helm"), "the helm is empty");
  P.hop = 1;
  assert.equal(sim.hopReady(), false, "no greeting without a crew member");
  assert.equal(sim.hop(4), false);
});
