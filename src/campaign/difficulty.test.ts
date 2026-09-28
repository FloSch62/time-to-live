import { before, test } from "node:test";
import assert from "node:assert/strict";
import { DIFFICULTY_IDS, DIFFICULTIES } from "../data/difficulty.ts";
import { loadContent, testShip } from "./testkit.ts";
import { createRun, claimRelayStores, advanceStage } from "./run.ts";
import { serialize, deserialize, toSave, fromSave } from "./savegame.ts";
import { currentRelay } from "./model.ts";
import { rollStock } from "./store.ts";
import { buildSetup } from "./voyage.ts";
import { carSlot, type AttachCarId } from "./refit.ts";

before(async () => { await loadContent(); });

test("difficulty persists through saves, combat and every stage; old saves become Medium", () => {
  for (const difficulty of DIFFICULTY_IDS) {
    const run = createRun(233, testShip(), undefined, difficulty);
    assert.equal(run.inv.salvage, DIFFICULTIES[difficulty].startingSalvage);
    assert.equal(deserialize(serialize(run))!.difficulty, difficulty);
    assert.equal(toSave(run).summary.difficulty, difficulty);
    for (const stage of [1, 2, 3] as const) {
      if (stage > 1) advanceStage(run);
      assert.equal(buildSetup(run, { enemy: "packet-leech" }).difficulty, difficulty);
      run.pos = run.map.relays.find(r => r.type !== "start" && r.type !== "exit")!.id;
      currentRelay(run).resolved = true;
      assert.equal(claimRelayStores(run), DIFFICULTIES[difficulty].relayStores[stage]);
      assert.equal(rollStock(run, 1).prices.hull, DIFFICULTIES[difficulty].repairPrices[stage]);
    }
  }
  const old = toSave(createRun(234, testShip()));
  delete (old.run as Partial<typeof old.run>).difficulty;
  assert.equal(fromSave(old)!.difficulty, "medium");
});

test("shared seeds keep the same map and catalogue stock while difficulty changes visible pressure and supplies", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const runs = DIFFICULTY_IDS.map(d => createRun(seed, testShip(), undefined, d));
    assert.deepEqual(runs[0].map.relays, runs[1].map.relays);
    assert.deepEqual(runs[1].map.relays, runs[2].map.relays);
    assert.ok(runs[0].map.sealStep < runs[1].map.sealStep && runs[1].map.sealStep < runs[2].map.sealStep);
    const stocks = runs.map(r => rollStock(r, 1));
    assert.deepEqual(stocks[0].items, stocks[2].items);
    assert.ok(stocks[0].ttl > stocks[1].ttl && stocks[1].ttl > stocks[2].ttl);
    const cars = stocks[0].items.filter(i => i.kind === "car");
    assert.ok(cars.some(i => carSlot(i.id as AttachCarId) === "rear"));
    assert.ok(cars.some(i => carSlot(i.id as AttachCarId) === "keel"));
  }
});
