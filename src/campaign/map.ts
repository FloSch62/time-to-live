// Stage map generation (contract §3.2): Poisson-disc relays on a wide chart, hop-radius links (planar, 2–5 each),
// start on the left, the guardian's exit on the far right, relay types by stage weights, hazards, and the Seal.
// Pure module.
import { Rng } from "../core/rng.ts";
import type { HazardId, StageIndex } from "../game/ids.ts";
import type { Relay, RelayType, StageMap } from "./model.ts";
import { content } from "./content.ts";

export const CHART_W = 760;
export const CHART_H = 330;
const MIN_DIST = 70;
const HOP_RADIUS = 134;

export const STAGE_HAZARDS: Record<StageIndex, HazardId[]> = {
  1: ["debris-field", "rust-squall", "sun-glare"],
  2: ["glass-fog", "ringing-panes", "resonance"],
  3: ["ember-draft", "dark-stretch", "sealing-lattice"],
};

/** Relay type weights per stage for the non-fixed relays. */
const TYPE_WEIGHTS: Record<StageIndex, [RelayType, number][]> = {
  1: [["combat", 30], ["event", 27], ["distress", 12], ["hazard", 10], ["bench", 7], ["empty", 10]],
  2: [["combat", 31], ["event", 25], ["distress", 12], ["hazard", 14], ["bench", 7], ["empty", 9]],
  3: [["combat", 37], ["event", 21], ["distress", 10], ["hazard", 16], ["bench", 6], ["empty", 8]],
};

/** Hops of slack the Seal gives beyond the shortest route (FTL fleet pressure). */
const SEAL_MARGIN: Record<StageIndex, number> = { 1: 7, 2: 6, 3: 5 };
const SEAL_START = -46;

const STAGE_LETTER: Record<StageIndex, string> = { 1: "R", 2: "G", 3: "H" };

interface Pt {
  x: number;
  y: number;
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = o(c, d, a);
  const d2 = o(c, d, b);
  const d3 = o(a, b, c);
  const d4 = o(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Minimum distance from point p to segment ab. */
function pointSegDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Breadth-first hop distances from `from` (–1 = unreachable). */
export function hopDistances(relays: { links: number[] }[], from: number): number[] {
  const d = relays.map(() => -1);
  d[from] = 0;
  const q = [from];
  while (q.length) {
    const i = q.shift()!;
    for (const j of relays[i].links) {
      if (d[j] < 0) {
        d[j] = d[i] + 1;
        q.push(j);
      }
    }
  }
  return d;
}

function tryGenerate(stage: StageIndex, rng: Rng): StageMap | null {
  const W = CHART_W;
  const H = CHART_H;
  const pts: Pt[] = [];
  const start = { x: 22, y: Math.round(H / 2 + rng.int(-50, 50)) };
  const exit = { x: W - 20, y: Math.round(H / 2 + rng.int(-60, 60)) };
  pts.push(start, exit);
  const target = rng.int(20, 24);
  // Dart throwing with a minimum distance (Poisson-disc); a few passes with shrinking spacing if needed.
  for (let pass = 0; pass < 3 && pts.length < target; pass++) {
    const md = MIN_DIST - pass * 6;
    for (let tries = 0; tries < 4000 && pts.length < target; tries++) {
      const p = { x: rng.int(62, W - 62), y: rng.int(18, H - 18) };
      if (pts.every((q) => dist(p, q) >= md)) pts.push(p);
    }
  }
  if (pts.length < 20) return null;

  const n = pts.length;
  const links: Set<number>[] = pts.map(() => new Set<number>());
  const edges: [number, number][] = [];
  const cand: [number, number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const d = dist(pts[i], pts[j]);
    if (d <= HOP_RADIUS) cand.push([i, j, d]);
  }
  cand.sort((a, b) => a[2] - b[2]);
  const crosses = (i: number, j: number) =>
    edges.some(([a, b]) => a !== i && a !== j && b !== i && b !== j && segmentsCross(pts[i], pts[j], pts[a], pts[b])) ||
    // don't let a link graze past another relay
    pts.some((p, k) => k !== i && k !== j && pointSegDist(p, pts[i], pts[j]) < 14);
  for (const [i, j] of cand) {
    if (links[i].size >= 5 || links[j].size >= 5) continue;
    if (crosses(i, j)) continue;
    edges.push([i, j]);
    links[i].add(j);
    links[j].add(i);
  }
  // Raise every relay to at least 2 links where a non-crossing link within reach exists.
  for (let i = 0; i < n; i++) {
    if (links[i].size >= 2) continue;
    const near = [...pts.keys()]
      .filter((j) => j !== i && !links[i].has(j) && links[j].size < 5)
      .sort((a, b) => dist(pts[i], pts[a]) - dist(pts[i], pts[b]));
    for (const j of near) {
      if (links[i].size >= 2) break;
      if (dist(pts[i], pts[j]) > HOP_RADIUS * 1.35) break;
      if (crosses(i, j)) continue;
      edges.push([i, j]);
      links[i].add(j);
      links[j].add(i);
    }
  }
  const relaysLinks = links.map((s) => ({ links: [...s] }));
  const d = hopDistances(relaysLinks, 0);
  if (d.some((x) => x < 0)) return null;
  if (links.some((s) => s.size < 1)) return null;
  const lowDeg = links.filter((s) => s.size < 2).length;
  if (lowDeg > 1) return null;
  const shortest = d[1];
  const [minHops, maxHops] = stage === 1 ? [6, 8] : [6, 9];
  if (shortest < minHops || shortest > maxHops) return null;

  // Order relays left → right (start = 0 stays first, exit last) for stable ids and names.
  const order = [...pts.keys()].sort((a, b) => (a === 0 ? -1 : b === 0 ? 1 : a === 1 ? 1 : b === 1 ? -1 : pts[a].x - pts[b].x));
  const newId = new Map<number, number>();
  order.forEach((old, i) => newId.set(old, i));
  const relays: Relay[] = order.map((old, i) => ({
    id: i,
    x: pts[old].x,
    y: pts[old].y,
    links: [...links[old]].map((j) => newId.get(j)!).sort((a, b) => a - b),
    type: "empty" as RelayType,
    name: `${STAGE_LETTER[stage]}-${String(i + 1).padStart(2, "0")}`,
    theme: (rng.chance(0.5) ? 0 : 1) as 0 | 1,
    bg: rng.int(0, 2) as 0 | 1 | 2,
    visited: false,
    resolved: false,
  }));
  // Relay names from the writing's list (switchyards along the Line), the chart code as a fallback.
  const names = rng.shuffle([...content.names.relay]);
  relays.forEach((r, i) => {
    if (names[i]) r.name = names[i];
  });
  const startId = 0;
  const exitId = relays.length - 1;
  relays[startId].type = "start";
  relays[exitId].type = "exit";
  assignTypes(stage, relays, startId, exitId, rng);

  const budget = shortest + SEAL_MARGIN[stage];
  const sealStep = (relays[exitId].x - 34 - SEAL_START) / budget;
  return {
    stage, w: W, h: H, relays, start: startId, exit: exitId, sealX: SEAL_START, sealStep, shortest, revealed: false,
  };
}

function assignTypes(stage: StageIndex, relays: Relay[], startId: number, exitId: number, rng: Rng) {
  const free = relays.filter((r) => r.id !== startId && r.id !== exitId);
  // Markets: spread across the chart (one per third, the last third only sometimes).
  const markets = stage === 3 ? 2 : rng.chance(0.5) ? 3 : 2;
  const thirds = [0, 1, 2].map((t) =>
    free.filter((r) => r.x >= (CHART_W * t) / 3 + (t === 0 ? 90 : 0) && r.x < (CHART_W * (t + 1)) / 3 - (t === 2 ? 60 : 0)),
  );
  const order = markets === 3 ? [0, 1, 2] : rng.chance(0.5) ? [0, 1] : [1, 2];
  for (const t of order) {
    const pool = thirds[t].filter((r) => r.type === "empty" && !relays.some((q) => q.type === "market" && Math.hypot(q.x - r.x, q.y - r.y) < 150));
    if (pool.length) rng.pick(pool).type = "market";
  }
  const rest = free.filter((r) => r.type === "empty");
  rng.shuffle(rest);
  // Guarantee a little variety: one bench, two hazards, one distress.
  const fixed: RelayType[] = ["bench", "hazard", "hazard", "distress"];
  for (const t of fixed) {
    const r = rest.pop();
    if (r) r.type = t;
  }
  for (const r of rest) r.type = rng.weighted(TYPE_WEIGHTS[stage], (w) => w[1])[0];
  // Relays right next to the start are gentler: no combat on the first hop if it can be helped.
  for (const id of relays[startId].links) {
    const r = relays[id];
    if (r.type === "combat" && rng.chance(0.6)) r.type = "event";
  }
  for (const r of relays) {
    if (r.type === "hazard") r.hazard = rng.pick(STAGE_HAZARDS[stage]);
  }
}

/** Deterministic map for a stage of a run. */
export function generateMap(stage: StageIndex, seed: number): StageMap {
  const base = new Rng((seed ^ Math.imul(stage, 0x9e3779b1)) >>> 0);
  for (let attempt = 0; attempt < 200; attempt++) {
    const m = tryGenerate(stage, base.fork(`map-${stage}-${attempt}`));
    if (m) return m;
  }
  throw new Error(`map generation failed for stage ${stage}`);
}

// ─── The Seal ─────────────────────────────────────────────────────────────────────────────────────────────

/** Seal advance factor for leaving a relay (hazards change it). */
export function sealFactor(r: Relay): number {
  if (r.hazard === "sealing-lattice") return 2;
  if (r.hazard === "glass-fog") return 0.5;
  return 1;
}

/** Advance the Seal by `hops` steps (capped so the guardian's relay stays open). */
export function advanceSeal(map: StageMap, hops: number) {
  const exit = map.relays[map.exit];
  map.sealX = Math.min(exit.x - 12, map.sealX + map.sealStep * hops);
}

/** Push the Seal back (positive n) or pull it forward (negative n), in hops. */
export function pushSeal(map: StageMap, n: number) {
  const exit = map.relays[map.exit];
  map.sealX = Math.max(SEAL_START - map.sealStep * 2, Math.min(exit.x - 12, map.sealX - map.sealStep * n));
}

/** Hops until the Seal reaches a relay (0 = sealed already). */
export function hopsUntilSealed(map: StageMap, r: Relay): number {
  if (r.id === map.exit) return Infinity;
  if (r.x < map.sealX) return 0;
  return Math.ceil((r.x - map.sealX) / map.sealStep);
}
