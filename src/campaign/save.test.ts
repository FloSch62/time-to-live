import { test, before } from "node:test";
import assert from "node:assert/strict";
import { loadContent, testShip } from "./testkit.ts";
import { createRun, hop, canHop } from "./run.ts";
import { serialize, deserialize, toSave, fromSave } from "./savegame.ts";
import { storeHere, buySupply } from "./store.ts";
import { absorbRun, emptyMeta, finishRun, normalizeMeta } from "./meta.ts";

before(async () => {
  await loadContent();
});

test("save round-trip keeps the whole run (seed, rng, map, position, seal, ship, inventory, flags, stats)", () => {
  const r = createRun(777, testShip());
  r.map.relays[r.pos].resolved = true;
  const to = r.map.relays[r.pos].links[0];
  assert.ok(canHop(r, to).ok);
  hop(r, to);
  r.flags.push("met-pell");
  r.fragments.push("f1-berth");
  r.inv.salvage = 123;
  const s = serialize(r);
  const back = deserialize(s)!;
  assert.ok(back);
  assert.deepEqual(back, JSON.parse(JSON.stringify(r)));
  // the restored run keeps rolling identically
  assert.deepEqual(back.rng, r.rng);
  assert.equal(back.map.sealX, r.map.sealX);
  assert.equal(back.pos, to);
});

test("broken or finished saves are rejected", () => {
  assert.equal(deserialize("{"), null);
  assert.equal(deserialize(JSON.stringify({ kind: "nope" })), null);
  const r = createRun(1, testShip());
  const f = toSave(r);
  f.version = 999;
  assert.equal(fromSave(f), null);
  r.ended = "defeat";
  assert.equal(fromSave(toSave(r)), null);
});

test("stores are rolled once per relay and persist in the save", () => {
  const r = createRun(55, testShip());
  const st = storeHere(r);
  const again = storeHere(r);
  assert.equal(st, again);
  r.inv.salvage = 100;
  const ttl = r.inv.ttl;
  assert.ok(buySupply(r, st, "ttl", 1).ok);
  assert.equal(r.inv.ttl, ttl + 1);
  const back = deserialize(serialize(r))!;
  assert.deepEqual(back.map.relays[back.pos].store, st);
});

test("meta progress absorbs knowledge and counts finished runs", () => {
  const m = emptyMeta();
  const r = createRun(3, testShip());
  r.codex.push("c1");
  r.fragments.push("f1");
  r.met.push("packet-leech");
  absorbRun(m, r);
  absorbRun(m, r);
  assert.deepEqual(m.codex, ["c1"]);
  r.ended = "victory";
  finishRun(m, r);
  assert.equal(m.voyageCompleted, true);
  assert.equal(m.completed, 1);
  assert.deepEqual(normalizeMeta(JSON.parse(JSON.stringify(m))), m);
  assert.deepEqual(normalizeMeta(null), emptyMeta());
});
