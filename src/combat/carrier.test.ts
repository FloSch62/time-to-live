// Weapon clearance relies on the carrier around a hanging tender never sagging below its grips (draw-ship
// `carrierFloor`): a taut carrier span stays at or above its lower end everywhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import { carrierThrough } from "./carrier-line.ts";

test("a taut carrier never dips below the lower end of any span", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let run = 0; run < 200; run++) {
    const pts: [number, number][] = [];
    let x = -40 - rnd() * 300;
    for (let k = 0; k < 2 + Math.floor(rnd() * 4); k++) {
      pts.push([Math.round(x), Math.round(40 + rnd() * 60)]);
      x += 20 + rnd() * 400;
    }
    const yAt = carrierThrough(pts, true);
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
      for (let s = ax; s <= bx; s += 0.5) assert.ok(yAt(s) <= Math.max(ay, by) + 1e-9, `span ${ax},${ay} → ${bx},${by} dips to ${yAt(s)} at ${s}`);
    }
  }
});

test("an untaut carrier still sags between its supports", () => {
  const free = carrierThrough([[0, 50], [400, 50]]);
  assert.ok(free(200) > 60);
  const taut = carrierThrough([[0, 50], [400, 50]], true);
  assert.equal(taut(200), 50);
});
