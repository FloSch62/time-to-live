import { test, before } from "node:test";
import assert from "node:assert/strict";
import { Rng } from "../core/rng.ts";
import { loadContent, testShip } from "./testkit.ts";
import { createRun } from "./run.ts";
import {
  applyOutcome, checkCondition, newCtx, presentEvent, reqLabel, substitute, resolveChoice, pickEventFor,
} from "./events.ts";
import { content } from "./content.ts";
import { crewCap } from "./refit.ts";
import type { EventDef } from "../game/types.ts";

before(async () => {
  await loadContent();
});

function run() {
  return createRun(4242, testShip("Kettle Run"));
}

test("conditions: resources, systems, weapons by id and type, species, crew, flags, stage", () => {
  const r = run();
  r.inv.salvage = 20;
  assert.equal(checkCondition(r, { resources: { salvage: 20 } }).ok, true);
  assert.equal(checkCondition(r, { resources: { salvage: 21 } }).ok, false);
  assert.match(checkCondition(r, { resources: { salvage: 21 } }).reason!, /21 Salvage/);
  assert.equal(checkCondition(r, { system: { id: "sensors", level: 1 } }).ok, true);
  assert.equal(checkCondition(r, { system: { id: "sensors", level: 2 } }).ok, false);
  assert.equal(checkCondition(r, { system: { id: "drones", level: 1 } }).ok, false);
  assert.equal(checkCondition(r, { weapon: "burst-emitter" }).ok, true);
  assert.equal(checkCondition(r, { weapon: "laser" }).ok, true);
  assert.equal(checkCondition(r, { weapon: "payload" }).ok, true);
  assert.equal(checkCondition(r, { weapon: "beam" }).ok, false);
  r.ship.cargo.push("fiber-lance");
  assert.equal(checkCondition(r, { weapon: "beam" }).ok, true, "cargo counts");
  assert.equal(checkCondition(r, { species: "rigger" }).ok, true);
  assert.equal(checkCondition(r, { species: "bellmaker" }).ok, false);
  assert.equal(checkCondition(r, { crewMin: 3 }).ok, true);
  assert.equal(checkCondition(r, { crewMin: 4 }).ok, false);
  assert.equal(checkCondition(r, { flag: "x" }).ok, false);
  r.flags.push("x");
  assert.equal(checkCondition(r, { flag: "x" }).ok, true);
  assert.equal(checkCondition(r, { notFlag: "x" }).ok, false);
  assert.equal(checkCondition(r, { stage: 1 }).ok, true);
  assert.equal(checkCondition(r, { stage: 2 }).ok, false);
  assert.equal(checkCondition(r, { augment: "keepalive" }).ok, false);
  assert.equal(checkCondition(r, { drone: "relay-drone" }).ok, false);
});

test("blue option labels", () => {
  assert.equal(reqLabel({ system: { id: "sensors", level: 1 } }), "[Listening Post]");
  assert.equal(reqLabel({ system: { id: "sensors", level: 2 } }), "[Listening Post II]");
  assert.equal(reqLabel({ species: "rigger" }), "[Rigger]");
  assert.equal(reqLabel({ weapon: "fiber-lance" }), "[Fiber Lance]");
  assert.equal(reqLabel({ weapon: "beam" }), "[Beam weapon]");
});

test("placeholders", () => {
  const r = run();
  const ctx = newCtx(r);
  const s = substitute("{ship} · {stage} · {ttl} · {crew:rigger} · {crew} · {teal}lamp{/}", r, ctx);
  assert.match(s, /^Kettle Run · The Copper Reach · 16 · Rigger 7-Tern · /);
  assert.ok(s.endsWith("{teal}lamp{/}"), "colour markup untouched");
  const name = s.split(" · ")[4];
  assert.ok(r.ship.crew.some((c) => c.name === name));
  // {crew} is stable within an encounter
  assert.equal(substitute("{crew}", r, ctx), name);
});

test("choices: blue options hidden when unmet, disabled with a reason otherwise", () => {
  const r = run();
  const def: EventDef = {
    id: "t-choices", pool: "scripted", text: "x",
    choices: [
      { text: "Scan.", blue: true, req: { system: { id: "sensors", level: 2 } }, outcomes: [{ outcome: {} }] },
      { text: "Pay.", req: { resources: { salvage: 999 } }, outcomes: [{ outcome: {} }] },
      { text: "Rigger.", blue: true, req: { species: "rigger" }, outcomes: [{ outcome: {} }] },
      { text: "Leave.", outcomes: [{ outcome: {} }] },
    ],
  };
  const v = presentEvent(r, def, newCtx(r));
  assert.equal(v.choices[0].hidden, true);
  assert.equal(v.choices[1].enabled, false);
  assert.equal(v.choices[1].hidden, false);
  assert.match(v.choices[1].reason!, /999 Salvage/);
  assert.equal(v.choices[2].blue, true);
  assert.equal(v.choices[2].label, "[Rigger]");
  assert.equal(v.choices[3].enabled, true);
});

test("outcomes: every field applies", () => {
  const r = run();
  const rng = new Rng(7);
  const ctx = newCtx(r);
  r.ship.hull = 20;
  r.inv.salvage = 10;
  let a = applyOutcome(r, { resources: { salvage: [5, 5], ttl: -2, hull: -3, payloads: 2, spares: 1 } }, ctx, rng);
  assert.equal(r.inv.salvage, 15);
  assert.equal(r.inv.ttl, 14);
  assert.equal(r.ship.hull, 17);
  assert.deepEqual(a.deltas.map((d) => d.id), ["salvage", "ttl", "payloads", "spares", "hull"]);
  a = applyOutcome(r, { weapon: "fiber-lance", drone: "relay-drone", augment: "keepalive" }, ctx, rng);
  assert.ok(r.ship.weapons.includes("fiber-lance"), "weapon mounted in a free slot");
  assert.ok(r.ship.cargo.includes("relay-drone"), "drone to cargo (no drone bay)");
  assert.ok(r.ship.augments.includes("keepalive"));
  assert.equal(a.grants.length, 3);
  a = applyOutcome(r, { weapon: "random", augment: "random" }, ctx, rng);
  assert.equal(a.grants.length, 2);
  const n = r.ship.crew.length;
  a = applyOutcome(r, { crewJoin: { species: "courier", name: "Pip Arden" } }, ctx, rng);
  assert.equal(r.ship.crew.length, n + 1);
  assert.ok(r.ship.crew.some((c) => c.name === "Pip Arden" && c.species === "courier" && c.hp === 80));
  a = applyOutcome(r, { crewLoss: "courier" }, ctx, rng);
  assert.equal(r.ship.crew.length, n);
  assert.equal(r.stats.crewLost.at(-1)?.name, "Pip Arden");
  a = applyOutcome(r, { crewDamage: { amount: 30, who: "all" } }, ctx, rng);
  assert.ok(r.ship.crew.every((c) => c.hp < 100 || c.species === "warden"));
  applyOutcome(r, { heal: true }, ctx, rng);
  assert.ok(r.ship.crew.every((c) => c.hp >= 90));
  a = applyOutcome(r, { systemDamage: { system: "shields", amount: 1 } }, ctx, rng);
  assert.equal(r.ship.systems.shields!.damage, 1);
  applyOutcome(r, { systemDamage: { system: "random", amount: 1 } }, ctx, rng);
  applyOutcome(r, { flags: ["a", "b"], clearFlags: ["a"] }, ctx, rng);
  assert.deepEqual(r.flags, ["b"]);
  a = applyOutcome(r, { fragment: "f1-music-box", codex: "whatever" }, ctx, rng);
  assert.ok(r.fragments.includes("f1-music-box") && r.codex.includes("whatever"));
  assert.equal(a.notices.filter((x) => x.kind === "fragment" || x.kind === "codex").length, 2);
  applyOutcome(r, { revealMap: true }, ctx, rng);
  assert.equal(r.map.revealed, true);
  const sx = r.map.sealX;
  applyOutcome(r, { seal: 2 }, ctx, rng);
  assert.ok(r.map.sealX < sx);
  applyOutcome(r, { seal: -1 }, ctx, rng);
  r.ship.hull = 10;
  applyOutcome(r, { repair: 5 }, ctx, rng);
  assert.equal(r.ship.hull, 15);
  applyOutcome(r, { repair: "full" }, ctx, rng);
  assert.equal(r.ship.hull, r.ship.hullMax);
  a = applyOutcome(r, { reward: "high" }, ctx, rng);
  assert.ok((a.deltas.find((d) => d.id === "salvage")?.amount ?? 0) > 0);
  a = applyOutcome(r, { combat: { enemy: "scavenger-skiff", onWin: "x" }, store: true, next: "y" }, ctx, rng);
  assert.equal(a.combat?.enemy, "scavenger-skiff");
  assert.equal(a.combat?.surrenderable, true, "human crews can surrender");
  assert.equal(a.combat?.onWin, "x");
  assert.equal(a.store, true);
  assert.equal(a.next, "y");
  a = applyOutcome(r, { resources: { hull: -999 } }, ctx, rng);
  assert.equal(a.defeat, "hull");
});

test("crew overflow and slot overflow are reported, never lost silently", () => {
  const r = run();
  const rng = new Rng(3);
  const ctx = newCtx(r);
  const cap = crewCap(r.ship);
  for (let i = 0; i < cap - 3; i++) applyOutcome(r, { crewJoin: { species: "linefolk" } }, ctx, rng);
  assert.equal(r.ship.crew.length, cap);
  const a = applyOutcome(r, { crewJoin: { species: "linefolk" } }, ctx, rng);
  assert.equal(a.grants[0].placed, "overflow");
  for (let i = 0; i < 8; i++) applyOutcome(r, { weapon: "packet-laser" }, ctx, rng);
  const b = applyOutcome(r, { weapon: "jammer" }, ctx, rng);
  assert.equal(b.grants[0].placed, "overflow");
});

test("event picking is deterministic and respects stages/unique/requires", () => {
  const r = run();
  for (const relay of r.map.relays) {
    const a = pickEventFor(r, relay.id);
    const b = pickEventFor(r, relay.id);
    assert.equal(a, b);
    if (relay.type === "start") assert.equal(a, null);
    else {
      const def = content.events.get(a!);
      assert.ok(def, `event ${a} exists`);
      if (def!.stages) assert.ok(def!.stages.includes(1));
    }
  }
});

test("resolveChoice rolls with the run rng and advances it", () => {
  const r = run();
  const def: EventDef = {
    id: "t-roll", pool: "scripted", text: "x",
    choices: [{ text: "go", outcomes: [{ outcome: { resources: { salvage: [1, 100] } } }] }],
  };
  const s0 = [...r.rng];
  const before = r.inv.salvage;
  resolveChoice(r, def, 0, newCtx(r));
  assert.notDeepEqual(r.rng, s0);
  assert.ok(r.inv.salvage > before);
});
