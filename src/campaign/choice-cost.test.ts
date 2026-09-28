// The event window's cost line: only costs every possible outcome takes are listed; the rest stays "uncertain".
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { loadContent, testShip } from "./testkit.ts";
import { createRun } from "./run.ts";
import { choiceCost, presentEvent, newCtx } from "./events.ts";
import type { ChoiceDef, EventDef } from "../game/types.ts";

before(async () => {
  await loadContent();
});

const run = () => createRun(4242, testShip("Kettle Run"));

test("a single outcome shows its fixed costs: Seal, resources, injury, system damage", () => {
  const c: ChoiceDef = {
    text: "Go.",
    outcomes: [{ outcome: { seal: -1, resources: { hull: -2, payloads: -1, salvage: 10 }, crewDamage: { amount: 15, who: "one" }, systemDamage: { system: "shields", amount: 1 } } }],
  };
  const s = choiceCost(run(), c);
  assert.match(s, /Seal \+1 hop/);
  assert.match(s, /–2 hull/);
  assert.match(s, /–1 payload\b/);
  assert.match(s, /one crew member –15 health/);
  assert.match(s, /Shield Array –1 bar/);
  assert.doesNotMatch(s, /salvage/, "gains are not costs");
});

test("costs only some outcomes carry are not shown as fixed", () => {
  const c: ChoiceDef = {
    text: "Try.",
    outcomes: [
      { outcome: { seal: -1, resources: { hull: -3 } } },
      { outcome: { seal: -1 } },
    ],
  };
  assert.equal(choiceCost(run(), c), "Seal +1 hop");
});

test("ranges read as ranges; presentEvent carries the line", () => {
  const def: EventDef = {
    id: "t-cost", pool: "event", text: "A test.",
    choices: [
      { text: "Pay.", outcomes: [{ outcome: { resources: { ttl: [-2, -1] } } }] },
      { text: "Walk on.", outcomes: [{ outcome: {} }] },
    ],
  };
  const v = presentEvent(run(), def, newCtx(run()));
  assert.equal(v.choices[0].cost, "–1 to 2 TTL");
  assert.equal(v.choices[1].cost, undefined);
});
