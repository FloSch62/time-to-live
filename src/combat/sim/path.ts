// Tile pathfinding (Dijkstra on tiny grids; ≤ 60 tiles per ship). Crew walk along a deck inside a room, pass doors
// between horizontally adjacent rooms, and climb hatches between decks (climbing costs more, ★v2).
import type { SimShip } from "./model.ts";
import { doorKey } from "./build.ts";

export const CLIMB_COST = 1.8;

/** Neighbour tiles reachable from tile t with the step cost. `hostile` walkers may cross closed doors (they break them). */
export function neighbours(ship: SimShip, t: number, hostile: boolean, out: [number, number][]): void {
  out.length = 0;
  const { cols, rows, tileRoom } = ship;
  const x = t % cols;
  const y = (t - x) / cols;
  const r = tileRoom[t];
  const cand: [number, number, boolean][] = [];
  if (x > 0) cand.push([t - 1, 1, false]);
  if (x < cols - 1) cand.push([t + 1, 1, false]);
  if (y > 0) cand.push([t - cols, CLIMB_COST, true]);
  if (y < rows - 1) cand.push([t + cols, CLIMB_COST, true]);
  for (const [n, c] of cand) {
    const rn = tileRoom[n];
    if (rn < 0) continue;
    if (rn === r) {
      out.push([n, c]);
      continue;
    }
    const di = ship.doorAt.get(doorKey(t, n));
    if (di === undefined) continue;
    const d = ship.doors[di];
    const closed = !d.open && d.broken <= 0;
    out.push([n, c + (hostile && closed ? 5 : 0.15)]);
  }
}

/** Shortest path from `from` to `to` (tile indices), excluding `from`. Empty if unreachable or equal. */
export function findPath(ship: SimShip, from: number, to: number, hostile = false): number[] {
  if (from === to) return [];
  const n = ship.cols * ship.rows;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  dist[from] = 0;
  const nb: [number, number][] = [];
  for (;;) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) (best = dist[i]), (u = i);
    if (u < 0) return [];
    if (u === to) break;
    done[u] = 1;
    neighbours(ship, u, hostile, nb);
    for (const [v, c] of nb) {
      const nd = dist[u] + c;
      if (nd < dist[v] - 1e-9) {
        dist[v] = nd;
        prev[v] = u;
      }
    }
  }
  const path: number[] = [];
  for (let v = to; v !== from; v = prev[v]) {
    if (v < 0) return [];
    path.push(v);
  }
  return path.reverse();
}

/** Path cost to every tile (for picking the nearest target). */
export function distances(ship: SimShip, from: number, hostile = false): Float64Array {
  const n = ship.cols * ship.rows;
  const dist = new Float64Array(n).fill(Infinity);
  const done = new Uint8Array(n);
  dist[from] = 0;
  const nb: [number, number][] = [];
  for (;;) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) (best = dist[i]), (u = i);
    if (u < 0) break;
    done[u] = 1;
    neighbours(ship, u, hostile, nb);
    for (const [v, c] of nb) if (dist[u] + c < dist[v]) dist[v] = dist[u] + c;
  }
  return dist;
}
