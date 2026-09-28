import { test, before } from "node:test";
import assert from "node:assert/strict";
import { loadContent, testShip, type LoadReport } from "./testkit.ts";
import { createRun } from "./run.ts";
import { playVoyage, runEncounter } from "./voyage.ts";
import { headlessPresenter } from "./headless.ts";
import { content } from "./content.ts";
import { deserialize, serialize } from "./savegame.ts";
import { currentRelay } from "./model.ts";

let report: LoadReport;
before(async () => {
  report = await loadContent();
});

test("headless voyages with random choices always end in victory or defeat, never a dead end", async () => {
  let victories = 0;
  let stages = 0;
  const problems: string[] = [];
  for (let seed = 1; seed <= 40; seed++) {
    const run = createRun(seed * 31337, testShip());
    const p = headlessPresenter(seed);
    const end = await playVoyage(run, p, { prologue: true });
    assert.ok(end === "victory" || end === "defeat");
    if (end === "victory") victories++;
    stages += p.log.stagesReached;
    problems.push(...p.log.problems);
    // every save point is a valid save
    assert.ok(run.ended);
  }
  assert.deepEqual(problems, []);
  assert.ok(stages > 40, "runs get past the first stage");
  console.log(`# auto-run: ${victories}/40 victories, avg stage ${(stages / 40).toFixed(2)} (content: ${report.real ? "real" : "sample"})`);
});

test("forced-win voyages reach the ending through all three guardians", async () => {
  for (let seed = 1; seed <= 12; seed++) {
    const run = createRun(seed * 8191, testShip());
    const p = headlessPresenter(seed, { forceWin: true });
    const end = await playVoyage(run, p, { prologue: true });
    assert.equal(end, "victory", `seed ${seed}: ${p.log.problems.join("; ")}`);
    assert.equal(run.stagesCleared, 3);
    assert.ok(p.log.scripts.includes("ending"), "the completed voyage presents its ending");
    const bosses = p.log.fights.filter((f) => ["iron-regent", "hollow-choir", "blackout-core"].includes(f.enemy) && f.outcome === "victory");
    assert.equal(bosses.length, 3, "each guardian beaten once");
  }
});

test("a run saved at any hub moment restores and continues", async () => {
  const run = createRun(99, testShip());
  const p = headlessPresenter(5, { forceWin: true });
  let snapshots = 0;
  const origSave = p.save;
  p.save = (r) => {
    origSave(r);
    const back = deserialize(serialize(r));
    if (!r.ended) assert.ok(back, "save restores");
    snapshots++;
  };
  await playVoyage(run, p);
  assert.ok(snapshots > 10);
});

test("an opponent that escapes clears the relay without becoming a pending rematch", async () => {
  const run = createRun(151, testShip());
  const relay = currentRelay(run);
  relay.resolved = false;
  relay.pendingCombat = { enemy: "scavenger-skiff" };
  const p = headlessPresenter(151);
  p.combat = async () => ({ outcome: "escaped", ship: run.ship, inventory: run.inv, crewLost: [],
    stats: {seconds:1,damageDealt:0,damageTaken:0,shotsFired:0,shotsHit:0} });
  p.victory = async () => { assert.fail("escape must not offer a victory reward"); };
  const salvage = run.inv.salvage;
  assert.equal(await runEncounter(run,p), "done");
  assert.equal(relay.resolved,true);
  assert.equal(relay.pendingCombat,undefined);
  assert.equal(run.stats.fightsFled,0);
  assert.equal(run.inv.salvage,salvage);
});

test("every event reference resolves (next/onWin/onSurrender, fragments, codex, enemies)", () => {
  const missing: string[] = [];
  for (const e of content.events.values()) {
    if (!e.choices.length && !e.directCombat && !e.arrival && !e.glimpse) missing.push(`${e.id}: no choices or arrival action`);
    const fixed = [e.arrival, ...(e.directCombat ? [{ combat: e.directCombat }] : [])].filter(Boolean);
    for (const o of fixed) {
      for (const ref of [o!.next, o!.combat?.onWin, o!.combat?.onSurrender]) {
        if (ref && !content.events.has(ref)) missing.push(`${e.id} → ${ref}`);
      }
      if (report.real && o!.fragment && !content.fragments.has(o!.fragment)) missing.push(`${e.id}: fragment ${o!.fragment}`);
      if (report.real && o!.codex && content.codex.size && !content.codex.has(o!.codex)) missing.push(`${e.id}: codex ${o!.codex}`);
    }
    for (const c of e.choices) {
      if (!c.outcomes.length) missing.push(`${e.id}: choice without outcomes`);
      for (const w of c.outcomes) {
        const o = w.outcome;
        for (const ref of [o.next, o.combat?.onWin, o.combat?.onSurrender]) {
          if (ref && !content.events.has(ref)) missing.push(`${e.id} → ${ref}`);
        }
        if (report.real && o.fragment && !content.fragments.has(o.fragment)) missing.push(`${e.id}: fragment ${o.fragment}`);
        if (report.real && o.codex && content.codex.size && !content.codex.has(o.codex)) missing.push(`${e.id}: codex ${o.codex}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});
