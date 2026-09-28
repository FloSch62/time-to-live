// The ward mesh envelope (lore §2: a lattice of charged ward-wire around the car that catches bolts and grounds them
// through the carrier). It is an offset of the occupied hull silhouette: every car of the consist (rooms plus the
// opaque hull art, nose lamp and keel included; the trolley above the roof excluded), grown by a distance field and
// traced as a smooth iso-contour, so it keeps an even margin, never cuts through the hull, and bridges the coupling
// and keel gaps. Each ward layer is its own concentric shell. Painting and projectile interception share it.
import type { ShipView } from "./view.ts";
import { TILE } from "../data/layouts.ts";
export type Point = [number, number];

/** Distance from the hull to the first shell, and between shells (layout units). */
export const WARD_MARGIN = { player: 11, enemy: 12, gap: 2 };
/** The smoothed envelope never comes closer to the hull than its offset minus this. */
const SLACK = 3;
/** Smoothing half-window along the envelope (layout units): the field reads as one calm capsule. */
const SMOOTH = 18;
const STEP = 2;

export function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (pts: Point[]) => { const out: Point[] = []; for (const p of pts) { while (out.length > 1 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop(); out.push(p); } return out; };
  const lower = half(sorted), upper = half(sorted.reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export interface Field { x0: number; y0: number; cols: number; rows: number; dist: Float32Array; complete: boolean }
export const FIELD_STEP = STEP;

/** Distance from the hull at a world-local point (bilinear between cell centres). */
export function fieldDistance(f: Field, x: number, y: number): number {
  const fx = (x - f.x0) / STEP - 0.5, fy = (y - f.y0) / STEP - 0.5;
  const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
  const at = (a: number, b: number) => (a < 0 || b < 0 || a >= f.cols || b >= f.rows ? 1e6 : f.dist[b * f.cols + a]);
  return (at(i, j) * (1 - tx) + at(i + 1, j) * tx) * (1 - ty) + (at(i, j + 1) * (1 - tx) + at(i + 1, j + 1) * tx) * ty;
}

const CLOSE = 12;

/** Euclidean distance (layout units) from every cell to the nearest seed cell, by vector propagation (8SSEDT). */
function edt(seed: Uint8Array, cols: number, rows: number): Float32Array {
  const INF = 1e6;
  const ox = new Float32Array(cols * rows), oy = new Float32Array(cols * rows);
  for (let i = 0; i < ox.length; i++) { const o = seed[i] ? 0 : INF; ox[i] = o; oy[i] = o; }
  const len = (k: number) => ox[k] * ox[k] + oy[k] * oy[k];
  const cmp = (k: number, n: number, dx: number, dy: number) => {
    const nx = ox[n] + dx, ny = oy[n] + dy;
    if (nx * nx + ny * ny < len(k)) { ox[k] = nx; oy[k] = ny; }
  };
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      if (i > 0) cmp(k, k - 1, 1, 0);
      if (j > 0) { cmp(k, k - cols, 0, 1); if (i > 0) cmp(k, k - cols - 1, 1, 1); if (i < cols - 1) cmp(k, k - cols + 1, 1, 1); }
    }
    for (let i = cols - 2; i >= 0; i--) cmp(j * cols + i, j * cols + i + 1, 1, 0);
  }
  for (let j = rows - 1; j >= 0; j--) {
    for (let i = cols - 1; i >= 0; i--) {
      const k = j * cols + i;
      if (i < cols - 1) cmp(k, k + 1, 1, 0);
      if (j < rows - 1) { cmp(k, k + cols, 0, 1); if (i < cols - 1) cmp(k, k + cols + 1, 1, 1); if (i > 0) cmp(k, k + cols - 1, 1, 1); }
    }
    for (let i = 1; i < cols; i++) cmp(j * cols + i, j * cols + i - 1, 1, 0);
  }
  const d = new Float32Array(cols * rows);
  for (let k = 0; k < d.length; k++) d[k] = Math.sqrt(len(k)) * STEP;
  return d;
}

/** Occupied cells of the consist and their distance field (in layout units). */
function buildField(v: ShipView, reach: number): Field | null {
  const pts: Point[] = [];
  const rects: [number, number, number, number][] = [];
  const samples = new Map<object, { points: [number, number][]; step: number }>();
  let complete = true;
  for (const c of v.cars) {
    const m = c.meta;
    if (c.body?.length) for (const [x, y] of c.body) pts.push([x + c.x, y + c.y]);
    else {
      const w = (c.cols ?? m.cols ?? 1) * TILE, h = (c.rows ?? m.rows ?? 1) * TILE;
      rects.push([c.x + (m.gx ?? 0), c.y + (m.gy ?? 0), w, h]);
    }
    const art = c.sampleArt?.();
    if (art === null) complete = false;
    else if (art) { samples.set(c, art); for (const [x, y] of art.points) pts.push([x + c.x, y + c.y]); }
  }
  const extra = v.extras?.();
  if (extra === null) complete = false;
  else if (extra) rects.push(...extra);
  // Room corners arrive in fours: fill their rectangles so a sparse sampling never leaves gaps inside a deck.
  if (!pts.length && !rects.length) return null;
  const all = [...pts, ...rects.flatMap(([x, y, w, h]) => [[x, y], [x + w, y + h]] as Point[])];
  const pad = reach + CLOSE + 6;
  const x0 = Math.floor((Math.min(...all.map((p) => p[0])) - pad) / STEP) * STEP;
  const y0 = Math.floor((Math.min(...all.map((p) => p[1])) - pad) / STEP) * STEP;
  const cols = Math.ceil((Math.max(...all.map((p) => p[0])) + pad - x0) / STEP) + 1;
  const rows = Math.ceil((Math.max(...all.map((p) => p[1])) + pad - y0) / STEP) + 1;
  const inside = new Uint8Array(cols * rows);
  const mark = (x: number, y: number) => {
    const i = Math.floor((x - x0) / STEP), j = Math.floor((y - y0) / STEP);
    if (i >= 0 && j >= 0 && i < cols && j < rows) inside[j * cols + i] = 1;
  };
  const fill = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy += STEP / 2) for (let xx = x; xx < x + w; xx += STEP / 2) mark(xx, yy);
  };
  for (const r of rects) fill(...r);
  // Coupled and suspended cars hang from the lead car on gangways and hangers: tie each into one field.
  const lead = v.cars.find((c) => c.slot === "lead");
  const centre = (c: typeof v.cars[number]): Point => [c.x + (c.meta.gx ?? 0) + (c.cols ?? c.meta.cols ?? 1) * TILE / 2, c.y + (c.meta.gy ?? 0) + (c.rows ?? c.meta.rows ?? 1) * TILE / 2];
  if (lead) for (const c of v.cars) {
    if (c === lead) continue;
    const [ax, ay] = centre(lead), [bx, by] = centre(c);
    const n = Math.ceil(Math.hypot(bx - ax, by - ay));
    for (let i = 0; i <= n; i++) fill(ax + (bx - ax) * (i / n) - 5, ay + (by - ay) * (i / n) - 5, 10, 10);
  }
  // Body samples: rooms come as rectangles of four corners (filled), hull art as a dense sample grid (each point
  // stands for its neighbourhood).
  for (const c of v.cars) {
    const b = c.body ?? [];
    for (let k = 0; k + 3 < b.length; k += 4) {
      const xs = [b[k][0], b[k + 1][0], b[k + 2][0], b[k + 3][0]], ys = [b[k][1], b[k + 1][1], b[k + 2][1], b[k + 3][1]];
      fill(c.x + Math.min(...xs), c.y + Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    }
    const art = samples.get(c);
    if (art) for (const [x, y] of art.points) fill(c.x + x - art.step / 2, c.y + y - art.step / 2, art.step, art.step);
  }
  // Close small notches between fittings (radius CLOSE) so the envelope reads as one smooth shell, then measure the
  // distance from that closed body.
  const d1 = edt(inside, cols, rows);
  const outsideDilated = new Uint8Array(cols * rows);
  for (let k = 0; k < d1.length; k++) outsideDilated[k] = d1[k] > CLOSE ? 1 : 0;
  const d2 = edt(outsideDilated, cols, rows);
  const closed = new Uint8Array(cols * rows);
  for (let k = 0; k < d2.length; k++) closed[k] = inside[k] || d2[k] >= CLOSE ? 1 : 0;
  const d = edt(closed, cols, rows);
  return { x0, y0, cols, rows, dist: d, complete };
}

/** Marching squares at distance r; returns the outer loop (largest area). */
function contour(f: Field, r: number): Point[] {
  const { x0, y0, cols, rows, dist } = f;
  // A tiny offset keeps the iso-level off exact cell distances, so no contour point lands on a cell corner
  // (two edges would share it and the loop would break).
  const level = r + 0.0137;
  const val = (i: number, j: number) => (i < 0 || j < 0 || i >= cols || j >= rows ? 1e9 : dist[j * cols + i]) - level;
  // Cell centres sit at (x0 + (i + .5) * STEP, y0 + (j + .5) * STEP).
  const px = (i: number) => x0 + (i + 0.5) * STEP, py = (j: number) => y0 + (j + 0.5) * STEP;
  const lerp = (a: number, b: number) => (Math.abs(a - b) < 1e-9 ? 0.5 : a / (a - b));
  const segs = new Map<string, string>();
  const pos = new Map<string, Point>();
  const key = (p: Point) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const add = (a: Point, b: Point) => {
    const ka = key(a), kb = key(b);
    pos.set(ka, a); pos.set(kb, b);
    segs.set(ka, kb);
  };
  for (let j = -1; j < rows; j++) for (let i = -1; i < cols; i++) {
    const tl = val(i, j), tr = val(i + 1, j), br = val(i + 1, j + 1), bl = val(i, j + 1);
    const code = (tl < 0 ? 8 : 0) | (tr < 0 ? 4 : 0) | (br < 0 ? 2 : 0) | (bl < 0 ? 1 : 0);
    if (code === 0 || code === 15) continue;
    const top: Point = [px(i) + lerp(tl, tr) * STEP, py(j)];
    const right: Point = [px(i + 1), py(j) + lerp(tr, br) * STEP];
    const bottom: Point = [px(i) + lerp(bl, br) * STEP, py(j + 1)];
    const left: Point = [px(i), py(j) + lerp(tl, bl) * STEP];
    // Oriented so the inside lies to the right of travel (clockwise loops on screen).
    switch (code) {
      case 1: add(bottom, left); break;
      case 2: add(right, bottom); break;
      case 3: add(right, left); break;
      case 4: add(top, right); break;
      case 5: add(top, left); add(bottom, right); break;
      case 6: add(top, bottom); break;
      case 7: add(top, left); break;
      case 8: add(left, top); break;
      case 9: add(bottom, top); break;
      case 10: add(left, bottom); add(right, top); break;
      case 11: add(right, top); break;
      case 12: add(left, right); break;
      case 13: add(bottom, right); break;
      case 14: add(left, bottom); break;
    }
  }
  const seen = new Set<string>();
  let best: Point[] = [];
  let bestArea = 0;
  for (const start of segs.keys()) {
    if (seen.has(start)) continue;
    const loop: Point[] = [];
    let k: string | undefined = start;
    for (let guard = 0; k && !seen.has(k) && guard < segs.size + 2; guard++) {
      seen.add(k);
      loop.push(pos.get(k)!);
      k = segs.get(k);
    }
    let area = 0;
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    if (Math.abs(area) > bestArea) { bestArea = Math.abs(area); best = loop; }
  }
  return calm(f, resample(best, STEP), r);
}

/** Even spacing along a closed loop. */
function resample(loop: Point[], spacing: number): Point[] {
  if (loop.length < 3) return loop;
  const out: Point[] = [];
  let carry = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let t = carry;
    while (t < len) {
      out.push([a[0] + (b[0] - a[0]) * (t / len), a[1] + (b[1] - a[1]) * (t / len)]);
      t += spacing;
    }
    carry = t - len;
  }
  return out;
}

/** Smooth the offset contour over a wide window so small fittings do not dent it, then push any point that came
 *  more than SLACK inside its offset back out along the distance gradient: a calm field with an even margin. */
function calm(f: Field, loop: Point[], r: number): Point[] {
  const n = loop.length;
  if (n < 8) return loop;
  const w = Math.max(1, Math.min(Math.floor(n / 6), Math.round(SMOOTH / STEP)));
  let pts = loop;
  for (let pass = 0; pass < 3; pass++) {
    const sx = new Float64Array(n + 1), sy = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) { sx[i + 1] = sx[i] + pts[i][0]; sy[i + 1] = sy[i] + pts[i][1]; }
    const sum = (arr: Float64Array, a: number, b: number) => {
      // inclusive range a..b on a ring
      if (a < 0) return arr[n] - arr[n + a] + arr[b + 1];
      if (b >= n) return arr[n] - arr[a] + arr[b - n + 1];
      return arr[b + 1] - arr[a];
    };
    pts = pts.map((_, i) => [sum(sx, i - w, i + w) / (2 * w + 1), sum(sy, i - w, i + w) / (2 * w + 1)] as Point);
  }
  const clear = Math.max(1, r - SLACK);
  for (const p of pts) {
    for (let k = 0; k < 6; k++) {
      const d = fieldDistance(f, p[0], p[1]);
      if (d >= clear) break;
      const gx = fieldDistance(f, p[0] + 1, p[1]) - fieldDistance(f, p[0] - 1, p[1]);
      const gy = fieldDistance(f, p[0], p[1] + 1) - fieldDistance(f, p[0], p[1] - 1);
      const gl = Math.hypot(gx, gy) || 1;
      p[0] += (gx / gl) * (clear - d + 0.25);
      p[1] += (gy / gl) * (clear - d + 0.25);
    }
  }
  // A last light pass removes kinks left by the push-out.
  return pts.map((p, i) => {
    const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    return [(a[0] + p[0] * 2 + b[0]) / 4, (a[1] + p[1] * 2 + b[1]) / 4] as Point;
  });
}

const cache = new WeakMap<ShipView, { field: Field | null; layers: Map<number, Point[]>; retry: number }>();
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Offset of shell `layer` (0 = innermost) from the hull. */
export function wardRadius(v: ShipView, layer: number): number {
  return (v.side === 1 ? WARD_MARGIN.enemy : WARD_MARGIN.player) + layer * WARD_MARGIN.gap;
}

function entry(v: ShipView) {
  let c = cache.get(v);
  // While hull art is still loading the envelope follows the rooms; it is rebuilt from the art once it arrives.
  if (!c || c.field && !c.field.complete && now() > c.retry) {
    c = { field: buildField(v, wardRadius(v, 5)), layers: new Map(), retry: now() + 400 };
    cache.set(v, c);
  }
  return c;
}

/** The ward's distance field around a vessel (view-local coordinates, without sway). */
export function wardField(v: ShipView): Field | null {
  return entry(v).field;
}

function local(v: ShipView, layer: number): Point[] {
  const c = entry(v);
  let pts = c.layers.get(layer);
  if (!pts) { pts = c.field ? contour(c.field, wardRadius(v, layer)) : []; c.layers.set(layer, pts); }
  return pts;
}

/** Shell `layer` in view-local coordinates (no sway) and the field it was traced from (a cache key). */
export function wardLocal(v: ShipView, layer: number): { pts: Point[]; field: Field | null } {
  return { pts: local(v, Math.max(0, Math.min(5, layer))), field: entry(v).field };
}

/** Shell `layer` of the ward around a vessel, in world coordinates (sway included). */
export function wardOutline(v: ShipView, layer = 0): Point[] {
  return local(v, Math.max(0, Math.min(5, layer))).map(([x, y]) => [x + v.dx, y + v.dy]);
}

/** The shell a projectile meets first: the outermost charged one. */
export function wardOutlineFor(v: ShipView, charged: number): Point[] {
  return wardOutline(v, Math.max(0, charged - 1));
}

/** First contact on a path from outside the envelope toward its interior. */
export function wardContact(outline: Point[], start: Point, end: Point): Point {
  const dx = end[0] - start[0], dy = end[1] - start[1];
  let nearest = 1;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    const sx = b[0] - a[0], sy = b[1] - a[1], den = dx * sy - dy * sx;
    if (Math.abs(den) < 1e-8) continue;
    const ax = a[0] - start[0], ay = a[1] - start[1];
    const t = (ax * sy - ay * sx) / den, u = (ax * dy - ay * dx) / den;
    if (t >= 0 && t <= nearest && u >= 0 && u <= 1) nearest = t;
  }
  return [start[0] + dx * nearest, start[1] + dy * nearest];
}
