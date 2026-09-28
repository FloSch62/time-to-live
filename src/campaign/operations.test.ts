import { before, test } from "node:test";
import assert from "node:assert/strict";
import { Rng } from "../core/rng.ts";
import { LEAD_CAR_IDS } from "../game/ids.ts";
import { loadContent, testShip } from "./testkit.ts";
import { newShip, speciesMaxHp } from "./shipops.ts";
import { arrive, betweenRelays, canHop, createRun, hop, retreatRoutes, safeRecovery, safeRecoveryStatus } from "./run.ts";
import { currentRelay } from "./model.ts";
import { buildSetup, runEncounter } from "./voyage.ts";
import { headlessPresenter } from "./headless.ts";
import { deserialize, serialize } from "./savegame.ts";
import { buyItem, rollStock } from "./store.ts";
import { upgradeSystem } from "./upgrades.ts";
import { content } from "./content.ts";
import { coupleCar } from "./refit.ts";

before(async () => { await loadContent(); });

test("all starters retain the sixteen-hop stamp, distinct tools and purchasable missing shields", () => {
  for (const tender of LEAD_CAR_IDS) {
    const run = createRun(701, newShip(tender, new Rng(701), "amber", tender));
    assert.equal(run.inv.ttl, 16);
    assert.equal(run.ship.defId, tender);
    if (tender === "glasswing") {
      assert.equal(run.inv.payloads, 0);
      assert.deepEqual(run.ship.weapons.filter(Boolean), ["burst-emitter", "packet-laser", "packet-laser"]);
      // All three come powered: a fourth Weapons Bay bar and a ninth reactor bar carry them.
      assert.deepEqual(run.ship.weaponPower.slice(0, 3), [true, true, true]);
      assert.equal(run.ship.systems.weapons?.level, 4);
      assert.equal(run.ship.systems.weapons?.power, 4);
      assert.equal(run.ship.reactor, 9);
    }
    if (tender === "switchback") {
      assert.equal(run.ship.systems.shields, undefined);
      assert.deepEqual(run.ship.drones.filter(Boolean), ["relay-drone", "firewall-drone"]);
      assert.equal(run.ship.systems.veil?.level, 2);
      assert.equal(run.ship.systemRooms.veil, "lead:veil");
      assert.equal(upgradeSystem(run, "shields"), false, "an absent system cannot appear through an upgrade");
      const stock = rollStock(run, 1);
      const index = stock.items.findIndex(i => i.kind === "system" && i.id === "shields");
      assert.ok(index >= 0);
      run.inv.salvage = stock.items[index].price;
      assert.equal(buyItem(run, stock, index).ok, true);
      assert.equal(run.ship.systems.shields!.level, 2);
      assert.equal(run.inv.salvage, 0);
    }
  }
});

test("retreat commits the selected connected relay and one TTL/Seal step, preserving the unfinished enemy", async () => {
  const run = createRun(702, testShip());
  const from = currentRelay(run);
  from.resolved = false;
  from.pendingCombat = { enemy: "packet-leech" };
  const options = buildSetup(run, from.pendingCombat).retreatOptions!;
  const chosen = options.at(-1)!;
  const ttl = run.inv.ttl, seal = run.map.sealX, hull = run.ship.hull;
  const presenter = headlessPresenter(702);
  run.ship.systems.weapons!.damage = 1;
  presenter.combat = async () => ({ outcome: "fled", resolution: "escaped", retreatTo: chosen.to,
    ship: run.ship, inventory: run.inv, crewLost: [],
    stats: { seconds: 30, damageDealt: 0, damageTaken: 0, shotsFired: 0, shotsHit: 0 } });
  assert.equal(await runEncounter(run, presenter), "fled");
  assert.equal(run.pos, chosen.to);
  assert.equal(run.inv.ttl, ttl - chosen.cost);
  assert.equal(run.map.sealX, seal + run.map.sealStep);
  assert.equal(run.stats.hops, 1);
  assert.equal(from.pendingCombat?.enemy, "packet-leech");
  assert.equal(from.resolved, false);
  assert.equal(run.ship.hull, hull);
  assert.equal(run.ship.systems.weapons!.damage, 1, "an urgent retreat does not patch damaged machinery");
  assert.equal(run.guardianBeaten, false);
  run.inv.ttl = 0;
  assert.deepEqual(retreatRoutes(run), []);
});

test("secured battle aftermath reports machinery patches while retaining hull and crew injuries", async () => {
  for (const outcome of ["victory", "surrendered", "escaped"] as const) {
    const run = createRun(710, testShip());
    const relay = currentRelay(run);
    relay.resolved = false;
    relay.pendingCombat = { enemy: "scavenger-skiff" };
    run.ship.hull = 18;
    run.ship.crew[0].hp = 44;
    run.ship.systems.weapons!.damage = 2;
    const p = headlessPresenter(710);
    p.combat = async () => ({ outcome, ship: run.ship, inventory: run.inv, crewLost: [],
      stats: { seconds: 30, damageDealt: 0, damageTaken: 0, shotsFired: 0, shotsHit: 0 } });
    p.victory = async (_r, info) => { assert.equal(info.result.systemsPatched, 2); };
    await runEncounter(run, p);
    assert.equal(run.ship.systems.weapons!.damage, 0);
    assert.equal(relay.systemsPatched, 2);
    assert.equal(run.ship.hull, 18);
    assert.equal(run.ship.crew[0].hp, 44);
  }
});

test("Workshop Keel recovers only missing hull after a secured ordinary fight and reports the receipt", async () => {
  for (const outcome of ["victory", "surrendered", "escaped", "fled"] as const) {
    const run = createRun(712, testShip());
    coupleCar(run.ship, "workshop-keel");
    run.ship.hull = run.ship.hullMax - 1;
    const relay = currentRelay(run);
    relay.pendingCombat = { enemy: "scavenger-skiff" };
    relay.resolved = false;
    const p = headlessPresenter(712);
    p.combat = async (_r, setup) => ({ outcome, retreatTo: outcome === "fled" ? setup.retreat!.to : undefined,
      ship: run.ship, inventory: run.inv, crewLost: [], stats: {seconds:10,damageDealt:0,damageTaken:0,shotsFired:0,shotsHit:0} });
    await runEncounter(run, p);
    assert.equal(run.ship.hull, run.ship.hullMax - (outcome === "fled" ? 1 : 0));
    assert.equal(relay.hullRecovered, outcome === "fled" ? undefined : 1);
  }
});

test("field service spends a visible Seal step; ordinary travel preserves injury and system faults", () => {
  const run = createRun(703, testShip());
  run.pos = run.map.relays.find(r => r.x > 300 && r.type !== "exit")!.id;
  const relay = currentRelay(run);
  relay.resolved = true;
  run.ship.crew[0].hp = 31;
  run.ship.systems.engines!.damage = 2;
  run.ship.hull = 19;
  betweenRelays(run);
  assert.equal(run.ship.crew[0].hp, 31);
  assert.equal(run.ship.systems.engines!.damage, 2);
  const status = safeRecoveryStatus(run);
  assert.equal(status.ok, true);
  assert.equal(status.crewInjured, 1);
  assert.equal(status.systemsDamaged, 2);
  const seal = run.map.sealX, inv = { ...run.inv };
  assert.equal(safeRecovery(run).ok, true);
  assert.equal(run.map.sealX, seal + run.map.sealStep);
  assert.equal(run.ship.crew[0].hp, speciesMaxHp(run.ship.crew[0].species));
  assert.equal(run.ship.systems.engines!.damage, 0);
  assert.equal(run.ship.hull, 19);
  assert.deepEqual(run.inv, inv);
  assert.equal(safeRecovery(run).ok, false, "healthy vessels cannot spend accidental service steps");
  run.ship.crew[0].hp = 31;
  run.map.sealX = relay.x - run.map.sealStep / 2;
  assert.equal(safeRecoveryStatus(run).patrolRisk, true, "service warns when the berth will be overtaken");
  assert.equal(safeRecovery(run).ok, true);
  assert.equal(relay.resolved, false);
  assert.equal(relay.pendingCombat?.enemy, "quarantine-drone", "finishing exposed service brings a patrol instead of a soft lock");
  relay.pendingCombat = undefined;
  relay.resolved = true;
  run.ship.systems.engines!.damage = run.ship.systems.engines!.level;
  assert.equal(safeRecoveryStatus(run).patrolRisk, false);
  assert.equal(safeRecovery(run).ok, true, "a cleared quarantine berth still permits repairing a disabled drive");
  assert.equal(relay.pendingCombat, undefined, "service in an already-cleared berth does not invent an endless patrol loop");
});

test("a calm hop calls a living pilot to an operational Helm and preserves their return station", () => {
  const run = createRun(709, testShip());
  const to = currentRelay(run).links[0];
  run.ship.crew[0].room = "lead:medbay";
  run.ship.systems.engines!.damage = run.ship.systems.engines!.level;
  assert.equal(canHop(run, to).ok, false);
  run.ship.systems.engines!.damage = 0;
  assert.equal(hop(run, to), true);
  assert.equal(run.ship.crew[0].room, "lead:helm");
  assert.equal(run.ship.crew[0].station, "lead:helm");
});

test("fixed adverse arrivals happen once, with no choice and no hidden service compensation", async () => {
  const run = createRun(704, testShip());
  const relay = run.map.relays.find(r => r.type !== "start" && r.type !== "exit")!;
  run.pos = relay.id;
  relay.interception = false;
  relay.eventId = "test-fixed-loss";
  content.events.set("test-fixed-loss", { id: "test-fixed-loss", pool: "scripted", text: "The cable parts.",
    maintenance: false, arrival: { resources: { hull: -3, salvage: -5 } }, choices: [] });
  const p = headlessPresenter(704);
  p.choose = async () => { assert.fail("an unavoidable arrival has no invented choice"); };
  const hull = run.ship.hull, salvage = run.inv.salvage;
  await runEncounter(run, p);
  assert.equal(run.ship.hull, hull - 3);
  assert.equal(run.inv.salvage, salvage - 5);
  assert.equal(relay.serviceSalvage, 0);
  const restored = deserialize(serialize(run))!;
  arrive(restored);
  assert.equal(currentRelay(restored).arrivalApplied, true);
  assert.equal(restored.ship.hull, hull - 3);
  content.events.delete("test-fixed-loss");
});

test("human combat victories keep their own ledger and persist actual relay resolution", async () => {
  const run = createRun(705, testShip());
  const relay = currentRelay(run);
  relay.resolved = false;
  relay.pendingCombat = { enemy: "scavenger-skiff" };
  const p = headlessPresenter(705, { forceWin: true });
  await runEncounter(run, p);
  assert.equal(run.stats.machinesStopped, 0);
  assert.equal(run.stats.humanFightsWon, 1);
  assert.equal(relay.resolution, "destroyed");
  assert.equal(deserialize(serialize(run))!.map.relays[relay.id].resolution, "destroyed");
});

test("multiple automatic arrivals on the same relay each resolve once without a zero-choice dead end", async () => {
  const run = createRun(712, testShip());
  const relay = currentRelay(run);
  relay.resolved = false;
  relay.eventId = "t-auto-first";
  content.events.set("t-auto-first", { id: "t-auto-first", pool: "scripted", text: "An obligation ends.",
    arrival: { flags: ["first-arrival"], next: "t-auto-second" }, choices: [] });
  content.events.set("t-auto-second", { id: "t-auto-second", pool: "scripted", text: "A message arrives.",
    arrival: { flags: ["second-arrival"], resources: { ttl: 1 } }, choices: [] });
  const p = headlessPresenter(712);
  p.choose = async () => { assert.fail("automatic aftermath must not ask for a missing choice"); };
  await runEncounter(run, p);
  assert.deepEqual(relay.arrivalAppliedIds, ["t-auto-first", "t-auto-second"]);
  assert.ok(run.flags.includes("first-arrival") && run.flags.includes("second-arrival"));
  assert.equal(run.inv.ttl, 17);
  const restored = deserialize(serialize(run))!;
  await runEncounter(restored, p);
  assert.equal(restored.inv.ttl, 17);
  content.events.delete("t-auto-first");
  content.events.delete("t-auto-second");
});
