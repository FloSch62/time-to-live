// Combat simulation tests (node --test): power, shields, evasion, ion, air/fire, pathfinding, charging, guardians,
// boarders, surrender, determinism, full fights against every enemy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Sim } from "./sim/sim.ts";
import { autoFight } from "./sim/autoplay.ts";
import { benchShip, benchInventory } from "./sim/bench.ts";
import { effective, usable, reactorFree, shieldMax, applyIon, damageSystem } from "./sim/power.ts";
import { findPath } from "./sim/path.ts";
import { updateCrew } from "./sim/crew.ts";
import { startFire, startBreach } from "./sim/env.ts";
import { aiTargets } from "./sim/ai.ts";
import { spawnLocalShot } from "./sim/weapons.ts";
import { chargeTime, specialShieldForTest } from "./sim/testkit.ts";
import { makePlayerShip, newInventory } from "../data/ship.ts";
import { coupleCar } from "../data/consist.ts";
import { ENEMIES } from "../data/enemies.ts";
import { ENEMY_IDS, type EnemyId, type StageIndex } from "../game/ids.ts";
import type { ShipState } from "../game/types.ts";

function fight(enemy: EnemyId, opts: { ship?: ShipState; seed?: number; stage?: StageIndex; depth?: number } = {}) {
  const def = ENEMIES[enemy];
  return new Sim(opts.ship ?? makePlayerShip("T"), newInventory(), {
    enemy, stage: opts.stage ?? def.stage, seed: opts.seed ?? 1, depth: opts.depth ?? 0.3, boss: !!def.boss,
    surrenderable: def.kind === "human",
  });
}

function run(sim: Sim, seconds: number) {
  for (let i = 0; i < seconds * 60 && !sim.outcome; i++) sim.step();
}

test("starting power: reactor 8, shields up at one layer, subsystems self-powered", () => {
  const sim = fight("packet-leech");
  const P = sim.ships[0];
  assert.equal(P.reactor, 8);
  assert.ok(P.evasion > 0, "the pilot is already at the helm while the opening frame is paused");
  assert.equal(P.shields, 1);
  assert.equal(shieldMax(P), 1);
  assert.equal(effective(P.sys.helm), 1, "helm is a subsystem");
  assert.equal(reactorFree(P), 0, "shields 2 + engines 2 + weapons 3 + air 1");
  assert.equal(P.weapons.filter((w) => w.powered).length, 2);
  // No reactor left: the infirmary can't be powered until something else gives.
  assert.equal(sim.addPower("medbay"), false);
  assert.equal(sim.removePower("engines"), true);
  assert.equal(sim.addPower("medbay"), true);
});

test("damage and ion remove power; it returns after repair / when the ion clears", () => {
  const sim = fight("packet-leech");
  const P = sim.ships[0];
  const sh = P.sys.shields!;
  damageSystem(sim, P, sh, 1);
  assert.equal(sh.power, 1);
  assert.equal(shieldMax(P), 0);
  sh.damage = 0;
  run(sim, 0.1);
  assert.equal(sh.power, 2, "power comes back on its own");
  applyIon(sim, P, sh, 1);
  assert.equal(usable(sh), 1);
  assert.equal(effective(sh), 1);
  run(sim, 5.5);
  assert.equal(sh.ion, 0);
  assert.equal(effective(sh), 2);
});

test("ion stacks lock one bar each and clear one by one", () => {
  const sim = fight("packet-leech");
  const P = sim.ships[0];
  const w = P.sys.weapons!;
  applyIon(sim, P, w, 2);
  assert.equal(w.ion, 2);
  run(sim, 0.05);
  assert.equal(P.weapons.filter((q) => q.powered).length, 1, "only the 1-power weapon fits the one bar left");
  run(sim, 5.2);
  assert.equal(w.ion, 1);
  run(sim, 5.2);
  assert.equal(w.ion, 0);
  run(sim, 0.1);
  assert.equal(P.weapons.filter((q) => q.powered).length, 2, "powered again");
});

test("shields recharge a layer in about two seconds", () => {
  const sim = fight("packet-leech");
  const P = sim.ships[0];
  // Keep the shields room unmanned for a clean measurement.
  for (const c of sim.crew) if (c.side === 0) c.tile = P.rooms.find((r) => r.id === "lead:hall")!.tiles[0];
  P.shields = 0;
  run(sim, 1.9);
  assert.equal(P.shields, 0);
  run(sim, 0.2);
  assert.equal(P.shields, 1);
});

test("evasion: engines + manned helm; nobody at the helm, no evasion; installations never dodge", () => {
  const sim = fight("rust-prophet");
  const P = sim.ships[0];
  run(sim, 0.2);
  // Linefolk at the helm (+5), nobody at the thrusters: engines 2 → 10% + 5.
  assert.equal(P.evasion, 15);
  const pilot = sim.crew.find((c) => c.side === 0 && c.task === "man" && P.tileRoom[c.tile] === P.sys.helm!.room)!;
  sim.moveCrew([pilot.uid], P.rooms.find((r) => r.id === "lead:hall")!.i);
  run(sim, 4);
  assert.equal(P.evasion, 0, "helm level 1 has no autopilot");
  assert.equal(sim.ships[1].evasion, 0, "the Rust Prophet is an installation");
});

test("weapons charge only while powered", () => {
  const sim = fight("packet-leech");
  const P = sim.ships[0];
  const w = P.weapons[0];
  run(sim, 3);
  const c1 = w.charge;
  assert.ok(c1 > 2.5 && c1 < 3.6, `charged ~3 s (manned weapons +10%): ${c1}`);
  sim.setWeaponPower(0, false);
  run(sim, 0.5);
  assert.ok(w.charge < c1, "an unpowered weapon loses charge");
  assert.equal(chargeTime(w), w.def.charge);
});

test("a laser volley strips shields; a payload ignores them", () => {
  const sim = fight("packet-leech");
  const [P, E] = sim.ships;
  run(sim, 13);
  assert.ok(P.weapons.filter((w) => w.powered).every((w) => w.charge >= chargeTime(w)));
  assert.equal(P.weapons.find((w) => w.def.id === "packet-laser")?.powered, false, "the spare packet emitter waits for a fourth bay bar");
  const hull0 = E.hull;
  const sh0 = E.shields;
  assert.equal(sh0, 1);
  sim.setTarget(1, { kind: "room", room: E.sys.weapons!.room }); // payload launcher
  run(sim, 2.5);
  const hit = E.hull < hull0;
  const missed = sim.stats.shotsFired > sim.stats.shotsHit;
  assert.ok(hit || missed, "the payload hit the hull or missed");
  if (hit) assert.equal(E.shields, sh0, "payload passed the mesh");
  assert.ok(P.payloads === 7);
});

test("fire spreads with air and starves without it; breaches vent the room", () => {
  const sim = fight("packet-leech");
  const P = sim.ships[0];
  const hall = P.rooms.find((r) => r.id === "lead:hall")!;
  startFire(sim, P, hall.tiles[0]);
  for (const c of sim.crew) if (c.side === 0) c.tile = P.rooms.find((r) => r.id === "lead:helm")!.tiles[0];
  run(sim, 25);
  const burning = hall.tiles.filter((t) => P.fire[t] > 0).length;
  assert.ok(burning >= 1, "still burning");
  assert.ok(hall.o2 < 100, "fire eats the air");
  const q = P.rooms.find((r) => r.id === "lead:hold-b")!;
  startBreach(sim, P, q.tiles[0]);
  run(sim, 5);
  assert.ok(q.o2 < 75, `breach vents the room: ${q.o2}`);
  // Starve a fire: no air at all.
  const t = P.rooms.find((r) => r.id === "lead:stores")!;
  t.o2 = 0;
  P.fire[t.tiles[0]] = 100;
  run(sim, 4);
  assert.equal(P.fire[t.tiles[0]], 0, "no air, no fire");
});

test("open doors share air between rooms; an open airlock vents", () => {
  const sim = fight("packet-leech");
  const P = sim.ships[0];
  const a = P.rooms.find((r) => r.id === "lead:hall")!;
  const door = P.doors.find((d) => !d.hatch && !d.airlock && (d.a === a.i || d.b === a.i))!;
  const b = P.rooms[door.a === a.i ? door.b : door.a];
  a.o2 = 20;
  b.o2 = 100;
  door.open = true;
  run(sim, 3);
  assert.ok(Math.abs(a.o2 - b.o2) < 15, `equalised: ${a.o2} / ${b.o2}`);
  const lock = P.doors.find((d) => d.airlock)!;
  lock.open = true;
  const r = P.rooms[lock.a];
  run(sim, 4);
  assert.ok(r.o2 < 50, `vented: ${r.o2}`);
});

test("pathfinding rides lifts between decks and crosses the gangway to the rear car", () => {
  let s = makePlayerShip("T");
  s = coupleCar(s, "rear", "drone-car");
  s = coupleCar(s, "keel", "workshop-keel");
  const sim = new Sim(s, newInventory(), { enemy: "packet-leech", stage: 1, seed: 3, depth: 0 });
  const P = sim.ships[0];
  const helm = P.rooms.find((r) => r.id === "lead:helm")!;
  const bay = P.rooms.find((r) => r.id === "rear:bay")!;
  const keel = P.rooms.find((r) => r.id.startsWith("keel:"))!;
  const p1 = findPath(P, helm.tiles[0], bay.tiles[0]);
  assert.ok(p1.length > 5, "helm → drone bay");
  const p2 = findPath(P, bay.tiles[0], keel.tiles[0]);
  assert.ok(p2.length > 3, "drone bay → keel car");
  // A crew member actually walks there.
  const c = sim.crew.find((q) => q.side === 0)!;
  sim.moveCrew([c.uid], keel.i);
  run(sim, 20);
  assert.equal(P.tileRoom[c.tile], keel.i);
});

test("every deck of every enemy and modular tender is reachable through service lifts", () => {
  for (const enemy of ENEMY_IDS) {
    const sim = fight(enemy, { ship: coupleCar(coupleCar(makePlayerShip("T"), "rear", "drone-car"), "keel", "workshop-keel") });
    for (const ship of sim.ships) {
      const start = ship.rooms[0].tiles[0];
      for (const room of ship.rooms) for (const tile of room.tiles) {
        assert.ok(tile === start || findPath(ship, start, tile).length, `${enemy}: ${ship.side}/${room.id} unreachable`);
      }
      assert.ok(ship.rooms.some(r => r.lift), `${enemy}: a service lift exists`);
      assert.ok(ship.doors.every(d => !d.hatch || d.airlock || d.gangway), "no ladder shortcuts between decks");
    }
  }
});

test("a service cage carries one rider, queues the next, and releases a lost rider", () => {
  const sim = fight("packet-leech");
  const ship = sim.ships[0];
  const shaft = ship.rooms.find(r => r.lift)!;
  const crew = sim.playerCrew().slice(0, 2);
  for (const c of crew) {
    c.tile = shaft.tiles[0]; c.x = shaft.x + 0.5; c.y = shaft.y + 0.5;
    c.path = shaft.tiles.slice(1); c.dest = c.path.at(-1)!;
  }
  updateCrew(sim, 0.1);
  assert.equal(shaft.lift!.rider, crew[0].uid);
  assert.ok(crew[0].y > crew[1].y, "second rider waits on the landing");
  crew[0].dead = true;
  for (let i = 0; i < 60; i++) updateCrew(sim, 1 / 60);
  assert.ok(crew[1].y > shaft.y + 0.5, "the next rider can take an abandoned cage");
  for (let i = 0; i < 240; i++) updateCrew(sim, 1 / 60);
  assert.equal(crew[1].tile, shaft.tiles.at(-1));
  assert.equal(shaft.lift!.rider, null);
});

test("crew repair damaged systems and fight boarders", () => {
  const sim = fight("static-nest");
  const P = sim.ships[0];
  const sh = P.sys.shields!;
  damageSystem(sim, P, sh, 2);
  run(sim, 19);
  assert.equal(sh.damage, 0, "the warden at the shields repaired them");
  // Boarders arrive from the brood.
  let boarded = false;
  for (let i = 0; i < 60 * 40 && !sim.outcome; i++) {
    sim.step();
    if (sim.crew.some((c) => c.kind === "boarder")) boarded = true;
  }
  assert.ok(boarded, "spark mites came aboard");
});

test("the Iron Regent's gate needs two different routes", () => {
  const sim = fight("iron-regent", { ship: benchShip(1, "typical") });
  const E = sim.ships[1];
  assert.ok(E.boss.gate?.up);
  assert.equal(specialShieldForTest(sim, E, "w0:0"), true, "one route: absorbed");
  assert.equal(specialShieldForTest(sim, E, "w0:0"), true, "the same route again: absorbed");
  assert.equal(specialShieldForTest(sim, E, "w0:1"), false, "a second route opens the gate");
  assert.equal(E.boss.gate?.up, false);
});

test("the Hollow Choir's glass breaks only under three hits together", () => {
  const sim = fight("hollow-choir", { ship: benchShip(2, "typical") });
  const E = sim.ships[1];
  assert.equal(specialShieldForTest(sim, E, "a"), true);
  run(sim, 1.2);
  assert.equal(specialShieldForTest(sim, E, "a"), true);
  assert.equal(specialShieldForTest(sim, E, "b"), true);
  assert.equal(specialShieldForTest(sim, E, "c"), false, "third voice within a second: shattered");
  assert.equal(E.boss.glass?.up, false);
});

test("the Blackout Core changes phase, restoring hull", () => {
  const sim = fight("blackout-core", { ship: benchShip(3, "strong") });
  const E = sim.ships[1];
  const firstThreshold = E.hullMax * .5;
  E.hull = firstThreshold;
  run(sim, 0.1);
  assert.equal(E.boss.core?.phase, 2);
  assert.equal(E.hull, firstThreshold + 7);
  E.hull = E.hullMax * .25;
  run(sim, 0.1);
  assert.equal(E.boss.core?.phase, 3);
  assert.ok(E.adjuncts.every((a) => a.active), "sealing drones rise");
  assert.equal(E.bonusLayers, 1, "the shell closes while a sealing drone flies");
});

test("scavengers offer to surrender; accepting ends the fight with a reward", () => {
  const sim = fight("scavenger-skiff", { ship: benchShip(1, "strong") });
  const E = sim.ships[1];
  E.hull = 4;
  run(sim, 0.6);
  assert.ok(sim.surrender?.pending);
  sim.acceptSurrender();
  assert.equal(sim.outcome, "surrendered");
  const r = sim.result();
  assert.equal(r.outcome, "surrendered");
  assert.ok((r.reward?.resources?.salvage ?? 0) > 0);
});

test("the handshake charges with a pilot and the drive, and HOP flees", () => {
  const sim = fight("packet-leech");
  sim.setup.retreat = { to: 4, name: "Keeper bench", cost: 1 };
  run(sim, 0.5);
  assert.ok(sim.ships[0].hop > 0);
  sim.ships[0].hop = 1;
  assert.ok(sim.hop());
  assert.equal(sim.result().outcome, "fled");
  assert.equal(sim.result().reward, undefined);
});

test("an escaping scavenger is reported separately from a player retreat", () => {
  const sim = fight("scavenger-skiff");
  sim.ships[1].fleeing = true;
  sim.ships[1].hop = 1;
  run(sim, 1);
  assert.equal(sim.result().outcome, "escaped");
  assert.equal(sim.result().reward, undefined);
});

test("the sim is deterministic for a seed", () => {
  const a = autoFight(fight("cable-wraith", { seed: 42 }), {}, 300).result();
  const b = autoFight(fight("cable-wraith", { seed: 42 }), {}, 300).result();
  assert.deepEqual(a.stats, b.stats);
  assert.equal(a.ship.hull, b.ship.hull);
});

test("a full scripted fight: the starter tender beats a Packet Leech", () => {
  const sim = autoFight(fight("packet-leech", { seed: 7 }), {}, 300);
  const r = sim.result();
  assert.equal(r.outcome, "victory");
  assert.ok(r.reward?.resources?.salvage);
  assert.ok(r.ship.hull > 0 && r.ship.hull <= 30);
  assert.equal(r.ship.crew.length + r.crewLost.length, 3);
  for (const st of Object.values(r.ship.systems)) assert.equal(st!.damage, 0, "repaired after the fight");
});

test("every enemy loads and can be beaten by a reasonable tender", () => {
  for (const id of ENEMY_IDS) {
    const def = ENEMIES[id];
    const stage = def.stage;
    let wins = 0;
    for (let s = 0; s < 4 && wins === 0; s++) {
      const sim = new Sim(benchShip(stage, def.boss || def.elite ? "strong" : "typical"), benchInventory(stage), {
        enemy: id, stage, seed: 100 + s, depth: 0.5, boss: !!def.boss, surrenderable: def.kind === "human",
      });
      autoFight(sim, {}, 900);
      if (!sim.outcome) continue;
      const o = sim.result().outcome;
      if (o === "victory" || o === "surrendered") wins++;
    }
    assert.ok(wins > 0, `${id} beatable`);
  }
});

test("a drone is a legitimate second route through the Iron Regent's gate", () => {
  const sim = fight("iron-regent");
  const E = sim.ships[1];
  assert.equal(specialShieldForTest(sim, E, "w0:0"), true, "one weapon alone is stopped");
  assert.equal(specialShieldForTest(sim, E, "d0:0"), false, "a relay drone's bolt from another route opens the gate");
  assert.equal(E.boss.gate?.up, false);
});

test("while the gate is sealed a combat drone works the gate, and a hit on a gate warden proves a route", () => {
  const sim = fight("iron-regent", { ship: makePlayerShip("T", undefined, "amber", "switchback") });
  const E = sim.ships[1];
  assert.equal(sim.gateRoute(E, "w0:0", 0, 0), false, "a gun's hit on a warden registers one route");
  assert.equal(specialShieldForTest(sim, E, "d0:0"), false, "the drone's bolt on the gate is the second route: open");
  E.boss.gate!.up = true;
  // The relay drone waits to answer a gun, then aims at the gate room.
  const P = sim.ships[0];
  const relay = P.drones.find((d) => d.def.kind === "combat")!;
  sim.setDronePower(P.drones.indexOf(relay), true);
  for (let i = 0; i < 60 * 14 && !sim.projectiles.some((p) => p.source.startsWith("d0")); i++) sim.step();
  const bolt = sim.projectiles.find((p) => p.source.startsWith("d0"));
  assert.ok(bolt, "the drone fires within its hold time");
  assert.equal(bolt!.target.kind === "room" && bolt!.target.room, E.sys.gate!.room);
});

test("the Regent's Routing Edict aims at the route and a charged ward layer stops it like any bolt", () => {
  const sim = fight("iron-regent", { ship: benchShip(1, "typical") });
  const [P, E] = sim.ships;
  const edict = E.weapons.find((w) => w.def.id === "regent-edict")!;
  edict.charge = 99;
  aiTargets(sim, E, 0);
  assert.deepEqual(edict.target, { kind: "room", room: P.sys.helm!.room }, "helm first");
  P.sys.helm!.damage = P.sys.helm!.level;
  edict.target = null;
  aiTargets(sim, E, 0);
  assert.deepEqual(edict.target, { kind: "room", room: P.sys.engines!.room }, "then the drive");
  // Against a charged ward layer: the layer takes the bolt and the hull is untouched.
  const layers = P.shields, hull = P.hull;
  assert.ok(layers > 0);
  P.evasion = 0;
  const p = spawnLocalShot(sim, 1, 0, 1, 1, { kind: "room", room: P.sys.engines!.room }, { dmg: 2, source: "w1:0", kind: "laser" });
  p.def = edict.def;
  for (let i = 0; i < 120 && !p.dead; i++) { sim.step(); P.evasion = 0; }
  assert.equal(P.shields, layers - 1);
  assert.equal(P.hull, hull, "the ward grounds it");
});
