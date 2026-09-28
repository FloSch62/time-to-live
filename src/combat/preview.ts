// drawShipPreview: the whole consist (cars, rooms, systems, modules, weapons, crew) for the campaign's ship and refit
// screens. Returns the room rectangles so the screen can hit-test sockets and rooms.
import type { Gfx } from "../core/gfx";
import { P } from "../core/palette";
import type { ShipState } from "../game/types";
import { TILE } from "../data/layouts";
import { CARS } from "../data/cars";
import { Sim } from "./sim/sim";
import { buildPlayerView, type ShipView, tileScreen } from "./view";
import { drawHull, drawRooms, drawDoors, drawCrew, drawWeaponAt, mountPositions, drawWardMesh, weaponRect, trolleyCars, drawTrolleys, tenderCarrier, carrierGrips, playerHardpoints, wrapWeapons } from "./draw-ship";
import { drawCarrier, type CarrierRegion } from "./carrier";
import { weaponTooltip } from "./tooltips";

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
  /**
   * The carrier the consist hangs from. `draw` is the caller's own carrier (called with the caller's transform);
   * otherwise a flat carrier through the grips runs `extend` layout units past the consist on both sides (clip it
   * yourself). It is drawn behind the hull; when the art has separate trolley layers, the stretch through each
   * carriage is drawn again between its back and front layers. `outside`: the caller already drew the full span.
   */
  carrier?: { region?: CarrierRegion; draw?: () => void; extend?: number; outside?: boolean };
  /** Sheave frames turned (separately painted trolleys). */
  sheave?: number;
  /** The closed car seen from outside (title card): hull, trolley, carrier, guns and lamps; no cutaway rooms, doors,
   *  crew, ward or room markers. */
  exterior?: boolean;
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

/** A weapon on the hull, in the same coordinates as the rooms; `tip()` builds its hover tooltip. */
export interface PreviewMount {
  slot: number;
  x: number;
  y: number;
  w: number;
  h: number;
  tip: () => string;
}

export interface PreviewResult {
  w: number;
  h: number;
  rooms: PreviewRoom[];
  mounts: PreviewMount[];
}

const cache = new Map<string, { sim: Sim; view: ShipView }>();

function get(ship: ShipState) {
  const key = JSON.stringify([ship.consist, ship.modules, ship.systems, ship.systemRooms, ship.weapons, ship.weaponPower, ship.drones, ship.crew.map((c) => [c.id, c.station, c.room, c.hp]), ship.hull, ship.hullMax, ship.reactor, ship.livery]);
  let c = cache.get(key);
  if (!c) {
    const sim = new Sim(ship, { salvage: 0, ttl: 0, payloads: 0, spares: 0 }, { enemy: "packet-leech", stage: 1, seed: 1, depth: 0 });
    const view = buildPlayerView(sim.ships[0]);
    wrapWeapons(view, sim.ships[0]);
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

/** Where the carrier passes each car's grip, relative to the preview's top-left corner (every car of the consist that
 *  hangs from the carrier, lead first by x). */
export function shipPreviewGrips(ship: ShipState): [number, number][] {
  const { view } = get(ship);
  return carrierGrips(view).map(([x, y]) => [x - view.bx, y - view.by] as [number, number]);
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
  const cr = opts.carrier;
  const paintCarrier = () => {
    if (!cr) return;
    if (cr.draw) {
      ctx.save();
      ctx.translate(-ox, -oy);
      cr.draw();
      ctx.restore();
      return;
    }
    const ext = cr.extend ?? 60;
    const line = tenderCarrier(view, view.bx - ext, view.bx + view.bw + ext, [8, 8]);
    if (!line) return;
    drawCarrier(g, line.yAt, line.pts[0][0], line.pts[line.pts.length - 1][0], cr.region ?? null, 0, line.pts.join(";"));
  };
  if (cr && !cr.outside) paintCarrier();
  drawHull(g, sim, S, view, lamp);
  const layered = trolleyCars(view);
  if (layered.length) {
    drawTrolleys(g, view, "back", opts.sheave ?? 0);
    if (cr) {
      // The carrier passes through each carriage: its stretch there goes over the back layer, under the front.
      ctx.save();
      ctx.beginPath();
      for (const { car, meta, layers } of layered) ctx.rect(car.x + meta.saddle.x - layers.saddle.x - 1, car.y + meta.saddle.y - layers.saddle.y - 1, layers.w + 2, layers.h + 2);
      ctx.clip();
      paintCarrier();
      ctx.restore();
    }
    drawTrolleys(g, view, "front", opts.sheave ?? 0);
  }
  const mounts = mountPositions(S, view, playerHardpoints(view));
  for (const w of S.weapons) if (mounts[w.slot]) drawWeaponAt(g, sim, w, mounts[w.slot], 1, false);
  const mountRects: PreviewMount[] = [];
  for (const w of S.weapons) {
    const m = mounts[w.slot];
    if (!m) continue;
    const [rx, ry, rw, rh] = weaponRect(w, m, 1);
    mountRects.push({ slot: w.slot, x: rx + ox, y: ry + oy, w: rw, h: rh, tip: () => weaponTooltip(sim, w, 0, "plan", `mount ${w.slot + 1}, ${m.belly ? "belly" : "roof"}`) });
  }
  const cutaway = !opts.exterior;
  if (cutaway) {
    drawRooms(g, sim, S, view, { hoverRoom: opts.hoverRoom ?? -1, targetRooms: new Set(), dark: false, showInterior: true, lamp });
    drawDoors(g, sim, S, view, -1);
    if (opts.crew !== false) drawCrew(g, sim, S, view, { visibleEnemy: true, selected: opts.selected ?? new Set(), hover: opts.hoverCrew ?? -1 });
    if (opts.mesh) drawWardMesh(g, sim, S, view, 0, {});
  }
  const rooms: PreviewRoom[] = [];
  const sockets = new Set(sim.startState().modules ? Object.keys(sim.startState().modules) : []);
  for (const r of S.rooms) {
    const [rx, ry] = tileScreen(view, r.x, r.y);
    const [slot, rid] = r.id.split(":");
    const carId = ship.consist[slot as "lead" | "rear" | "keel"];
    const lg = carId ? Object.values(CARS[carId].legend).find((q) => q.id === rid) : undefined;
    const socket = !!lg?.socket;
    rooms.push({ id: r.id, name: r.name, x: rx + ox, y: ry + oy, w: r.w * TILE, h: r.h * TILE, system: r.sys?.id, socket, module: r.module });
    if (cutaway && ((opts.sockets && socket) || opts.highlight === r.id)) {
      const col = opts.highlight === r.id ? P.amber1 : P.brass2;
      g.box(rx, ry, r.w * TILE, r.h * TILE, col);
      if (socket && !r.module) g.text("socket", rx + 3, ry + r.h * TILE - 12, { font: "small", color: P.brass1 });
    }
  }
  void sockets;
  sim.t = prevT;
  ctx.restore();
  return { w: view.bw, h: view.bh, rooms, mounts: mountRects };
}
