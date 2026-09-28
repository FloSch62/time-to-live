// Repeatable readiness probes using the combat simulation and the campaign's real retreat bridge.
// Depleted supplies are an explicit stress case, not a claim about normal starting inventory.
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { Rng } from "../../src/core/rng.ts";
import { LEAD_CAR_IDS } from "../../src/game/ids.ts";
import { newShip } from "../../src/campaign/shipops.ts";
import { createRun } from "../../src/campaign/run.ts";
import { currentRelay } from "../../src/campaign/model.ts";
import { loadContent } from "../../src/campaign/testkit.ts";
import { buildSetup, runEncounter } from "../../src/campaign/voyage.ts";
import { headlessPresenter } from "../../src/campaign/headless.ts";
import { Sim } from "../../src/combat/sim/sim.ts";
import { autoFight } from "../../src/combat/sim/autoplay.ts";

const args = process.argv.slice(2);
const option = (key: string, fallback: string) => { const i = args.indexOf(`--${key}`); return i < 0 ? fallback : args[i + 1]; };
const n = Number(option("n", "24"));
await loadContent();
const rows = [];
for (const tender of LEAD_CAR_IDS) for (const challenge of ["interception", "depleted-supplies", "retreat"] as const) {
  for (let i = 1; i <= n; i++) {
    const seed = i * 31337;
    const run = createRun(seed, newShip(tender, new Rng(seed), "amber", tender));
    const relay = currentRelay(run);
    relay.resolved = false;
    relay.pendingCombat = { enemy: ["packet-leech", "cable-wraith", "rust-prophet"][i % 3] as "packet-leech", surrenderable: false };
    if (challenge === "depleted-supplies") { run.inv.payloads = 0; run.inv.spares = 0; }
    const setup = { ...buildSetup(run, relay.pendingCombat), depth: 0.1 };
    const sim = new Sim(run.ship, run.inv, setup);
    if (challenge === "retreat") {
      // Same crew/repair orders as normal play, but reserve drive power and never fire offensive weapons.
      autoFight(sim, { escapeOnly: true }, 600);
    } else autoFight(sim, { fleeAt: 0 }, 600);
    if (!sim.outcome) {
      rows.push({ tender, challenge, seed, enemy: setup.enemy, outcome: "timeout", hull: sim.ships[0].hull });
      continue;
    }
    const result = sim.result();
    const before = { ttl: run.inv.ttl, pos: run.pos, seal: run.map.sealX };
    if (result.outcome === "fled") {
      const p = headlessPresenter(seed);
      p.combat = async () => result;
      assert.equal(await runEncounter(run, p), "fled");
      assert.equal(run.pos, result.retreatTo);
      assert.notEqual(run.pos, before.pos);
      assert.equal(run.inv.ttl, before.ttl - 1);
      assert.equal(run.map.sealX, before.seal + run.map.sealStep);
    }
    rows.push({ tender, challenge, seed, enemy: setup.enemy, outcome: result.outcome,
      hull: result.ship.hull, crew: result.ship.crew.length, seconds: result.stats.seconds,
      payloads: result.inventory.payloads, spares: result.inventory.spares,
      retreatTo: result.retreatTo, ttlSpent: before.ttl - run.inv.ttl });
  }
}
const summary = LEAD_CAR_IDS.flatMap(tender => ["interception", "depleted-supplies", "retreat"].map(challenge => {
  const sample = rows.filter(row => row.tender === tender && row.challenge === challenge);
  return { tender, challenge, runs: sample.length,
    victories: sample.filter(row => row.outcome === "victory").length,
    retreats: sample.filter(row => row.outcome === "fled").length,
    defeats: sample.filter(row => row.outcome === "defeat").length,
    timeouts: sample.filter(row => row.outcome === "timeout").length };
}));
console.log(JSON.stringify(summary, null, 2));
const out = option("out", "");
if (out) writeFileSync(out, JSON.stringify({ summary, rows }, null, 2));
