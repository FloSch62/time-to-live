// drawShipPreview: the whole consist (cars, rooms, systems, modules, weapons, crew) for the campaign's ship and refit
// screens. Returns the room rectangles so the screen can hit-test sockets and rooms.
import type { Gfx } from "../core/gfx";
import { P } from "../core/palette";
import type { ShipState } from "../game/types";
import { TILE } from "../data/layouts";
import { CARS } from "../data/cars";
import { Sim } from "./sim/sim";
import { buildPlayerView, type ShipView, tileScreen } from "./view";
import { drawHull, drawRooms, drawDoors, drawCrew, drawWeaponAt, mountPositions, drawWardMesh } from "./draw-ship";

export interface PreviewOpts {
  /** Draw crew (default true). */
  crew?: boolean;
  state?: { sim: Sim; view: ShipView };
  selected?: Set<number>;
  hoverCrew?: number;
  hoverRoom?: number;
  /** Room id ("<slot>:<room>") to outline. */
  highlight?: string;
  /** Outline every module socket. */
  sockets?: boolean;
  /** Animation time (seconds). */
  t?: number;
  /** Draw the ward mesh (default false). */
  mesh?: boolean;
}

export interface PreviewRoom {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  system?: string;
  socket: boolean;
  module?: string;
}

export interface PreviewResult {
  w: number;
  h: number;
  rooms: PreviewRoom[];
}

const cache = new Map<string, { sim: Sim; view: ShipView }>();

function get(ship: ShipState) {
  const key = JSON.stringify([ship.consist, ship.modules, ship.systems, ship.systemRooms, ship.weapons, ship.weaponPower, ship.drones, ship.crew.map((c) => [c.id, c.station, c.room, c.hp]), ship.hull, ship.hullMax, ship.reactor, ship.livery]);
  let c = cache.get(key);
  if (!c) {
    const sim = new Sim(ship, { salvage: 0, ttl: 0, payloads: 0, spares: 0 }, { enemy: "packet-leech", stage: 1, seed: 1, depth: 0 });
    const view = buildPlayerView(sim.ships[0]);
    c = { sim, view };
    if (cache.size > 12) cache.clear();
    cache.set(key, c);
  }
  return c;
}

/** Size of the preview for a ship (to lay out a screen). */
export function shipPreviewSize(ship: ShipState): { w: number; h: number } {
  const { view } = get(ship);
  return { w: view.bw, h: view.bh };
}

/**
 * Draw the tender with its top-left bounding corner at (x, y). Everything is at 1:1 (pixel art).
 */
export function drawShipPreview(g: Gfx, ship: ShipState, x: number, y: number, opts: PreviewOpts = {}): PreviewResult {
  const { sim, view } = opts.state ?? get(ship);
  const S = sim.ships[0];
  const lamp = ship.livery?.lamp ?? "amber";
  const ox = Math.round(x - view.bx);
  const oy = Math.round(y - view.by);
  const ctx = g.ctx;
  ctx.save();
  ctx.translate(ox, oy);
  view.dx = 0;
  view.dy = 0;
  const t = opts.t ?? 0;
  const prevT = sim.t;
  sim.t = t;
  drawHull(g, sim, S, view, lamp);
  const hps: { car: string; x: number; side: "roof" | "belly"; mount?: { x: number; y: number } }[] = [];
  for (const c of view.cars) {
    const def = CARS[c.id as keyof typeof CARS];
    def?.hardpoints.forEach((hp, k) => hps.push({ car: c.slot, x: hp.x, side: hp.side, mount: c.meta.mounts[k] }));
  }
  const mounts = mountPositions(S, view, hps);
  for (const w of S.weapons) if (mounts[w.slot]) drawWeaponAt(g, sim, w, mounts[w.slot], 1, false);
  drawRooms(g, sim, S, view, { hoverRoom: opts.hoverRoom ?? -1, targetRooms: new Set(), dark: false, showInterior: true, lamp });
  drawDoors(g, sim, S, view, -1);
  if (opts.crew !== false) drawCrew(g, sim, S, view, { visibleEnemy: true, selected: opts.selected ?? new Set(), hover: opts.hoverCrew ?? -1 });
  if (opts.mesh) drawWardMesh(g, sim, S, view, 0, {});
  const rooms: PreviewRoom[] = [];
  const sockets = new Set(sim.startState().modules ? Object.keys(sim.startState().modules) : []);
  for (const r of S.rooms) {
    const [rx, ry] = tileScreen(view, r.x, r.y);
    const [slot, rid] = r.id.split(":");
    const carId = ship.consist[slot as "lead" | "rear" | "keel"];
    const lg = carId ? Object.values(CARS[carId].legend).find((q) => q.id === rid) : undefined;
    const socket = !!lg?.socket;
    rooms.push({ id: r.id, name: r.name, x: rx + ox, y: ry + oy, w: r.w * TILE, h: r.h * TILE, system: r.sys?.id, socket, module: r.module });
    if ((opts.sockets && socket) || opts.highlight === r.id) {
      const col = opts.highlight === r.id ? P.amber1 : P.brass2;
      g.box(rx, ry, r.w * TILE, r.h * TILE, col);
      if (socket && !r.module) g.text("socket", rx + 3, ry + r.h * TILE - 12, { font: "small", color: P.brass1 });
    }
  }
  void sockets;
  sim.t = prevT;
  ctx.restore();
  return { w: view.bw, h: view.bh, rooms };
}
