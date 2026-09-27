import { test } from "node:test";
import assert from "node:assert/strict";
import { generateMap, hopDistances, advanceSeal, pushSeal, hopsUntilSealed, CHART_W, CHART_H, STAGE_HAZARDS } from "./map.ts";
import { isSealed } from "./model.ts";
import type { StageIndex } from "../game/ids.ts";

const STAGES: StageIndex[] = [1, 2, 3];

test("maps are deterministic per seed and stage", () => {
  const a = generateMap(1, 1234);
  const b = generateMap(1, 1234);
  assert.deepEqual(a, b);
  const c = generateMap(2, 1234);
  assert.notDeepEqual(a.relays.map((r) => [r.x, r.y]), c.relays.map((r) => [r.x, r.y]));
});

test("every relay is reachable, start left, exit right, 2–5 links, sensible size", () => {
  for (let seed = 1; seed <= 120; seed++) {
    for (const st of STAGES) {
      const m = generateMap(st, seed * 7919 + 13);
      assert.ok(m.relays.length >= 20 && m.relays.length <= 24, `relay count ${m.relays.length}`);
      const d = hopDistances(m.relays, m.start);
      assert.ok(d.every((x) => x >= 0), "connected");
      assert.equal(m.relays[m.start].type, "start");
      assert.equal(m.relays[m.exit].type, "exit");
      assert.ok(m.relays[m.start].x < 60 && m.relays[m.exit].x > CHART_W - 60);
      for (const r of m.relays) {
        assert.ok(r.links.length >= 1 && r.links.length <= 5, `links ${r.links.length}`);
        assert.ok(r.x >= 0 && r.x <= CHART_W && r.y >= 0 && r.y <= CHART_H);
        for (const j of r.links) assert.ok(m.relays[j].links.includes(r.id), "links are symmetric");
        if (r.type === "hazard") assert.ok(r.hazard && STAGE_HAZARDS[st].includes(r.hazard));
        else assert.equal(r.hazard, undefined);
      }
      assert.ok(m.relays.filter((r) => r.links.length < 2).length <= 1, "at most one dead end");
      const markets = m.relays.filter((r) => r.type === "market").length;
      assert.ok(markets >= 1 && markets <= 3, `markets ${markets}`);
      assert.ok(m.shortest >= 6 && m.shortest <= 9, `shortest ${m.shortest}`);
    }
  }
});

test("the exit is reachable within the stage with a TTL margin before the Seal closes the route", () => {
  for (let seed = 1; seed <= 60; seed++) {
    for (const st of STAGES) {
      const m = generateMap(st, seed * 104729);
      // Walk a shortest route; the Seal must never overtake the tender on it.
      const toExit = hopDistances(m.relays, m.exit);
      let pos = m.start;
      let hops = 0;
      while (pos !== m.exit) {
        const next = m.relays[pos].links.reduce((a, b) => (toExit[b] < toExit[a] ? b : a));
        advanceSeal(m, 1);
        pos = next;
        hops++;
        assert.ok(!isSealed(m, m.relays[pos]), `seed ${seed} stage ${st}: sealed on the shortest route at hop ${hops}`);
      }
      assert.equal(hops, m.shortest);
      // Starting TTL (16) covers the shortest route with a margin of at least 6 hops.
      assert.ok(16 - m.shortest >= 6);
    }
  }
});

test("the Seal advances from the left, never seals the exit, and can be pushed back", () => {
  const m = generateMap(1, 99);
  assert.ok(m.sealX < 0, "starts off-map");
  const s0 = m.relays[m.start];
  assert.ok(!isSealed(m, s0));
  advanceSeal(m, 2);
  assert.ok(isSealed(m, s0), "start is sealed after two hops");
  for (let i = 0; i < 60; i++) advanceSeal(m, 1);
  assert.ok(!isSealed(m, m.relays[m.exit]), "exit stays open");
  const before = m.sealX;
  pushSeal(m, 2);
  assert.ok(Math.abs(before - m.sealX - 2 * m.sealStep) < 1e-6);
  assert.equal(hopsUntilSealed(m, m.relays[m.exit]), Infinity);
  const sealedCount = m.relays.filter((r) => isSealed(m, r)).length;
  assert.ok(sealedCount >= m.relays.length - 4, "late in the stage nearly everything is sealed");
});
