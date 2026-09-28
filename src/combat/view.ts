// Screen placement of the two vessels (★v2 side view, ★v4 sizes): the player's consist hangs from its carrier across
// the top of the left area (rear car coupled on the left, keel car slung underneath); the enemy sits in the right
// panel (crawlers hang from their own carrier, installations are anchored, fliers bob). Maps sim tile coordinates to
// "world" pixels (layout units at zoom 1). Each side has a camera (★v4 zoom 1×/1.5×/2×) mapping world → screen.
import { TILE } from "../data/layouts";
import type { HullMeta } from "../data/hulls";
import type { SimShip } from "./sim/model";
import { hullMeta, hullBodyPoints } from "./assets";

export interface CarView {
  slot: string;
  id: string;
  meta: HullMeta;
  /** Hull top-left in world pixels (before sway). */
  x: number;
  y: number;
  /** Grid tile offset of this car inside the ship's (composite) grid. */
  ox: number;
  oy: number;
  cols: number;
  rows: number;
  /** Occupied deck corners in hull-local pixels, four per room. */
  body?: [number, number][];
  /** Samples of the opaque hull art (null while the art is still loading). */
  sampleArt?: () => { points: [number, number][]; step: number } | null;
}

export interface Camera {
  /** Region of the screen this camera draws into. */
  rx: number;
  ry: number;
  rw: number;
  rh: number;
  z: number;
  baseZ: number;
  baseX: number;
  baseY: number;
  /** World point shown at the region's top-left. */
  x: number;
  y: number;
  /** Zoom target and the anchor kept under the cursor while easing. */
  tz: number;
  ax: number;
  ay: number;
  sx: number;
  sy: number;
}

export interface ShipView {
  side: 0 | 1;
  cars: CarView[];
  /** Animated offset (sway, bob, recoil). */
  dx: number;
  dy: number;
  /** Union of hull rectangles (world). */
  bx: number;
  by: number;
  bw: number;
  bh: number;
  mobility: SimShip["mobility"];
  cam: Camera;
  /** Further solid rectangles the ward wraps (view-local, without sway): the mounted weapons. null while their art
   *  metadata is still loading (the envelope is rebuilt once it arrives). */
  extras?: () => [number, number, number, number][] | null;
}

export const GANGWAY_GAP = 4;
/**
 * Combat screen layout (960×540 layout units). Top bar 4–48; the two vessels each own a world region that no HUD
 * panel ever covers; below them the crew roster (left) and the comms log (right); the ship bar along the bottom.
 */
export const LAYOUT = {
  topY: 4,
  topH: 44,
  /** Left/right split between the player's and the enemy's halves. */
  splitX: 555,
  enemyHead: { x: 558, y: 50, w: 398, h: 58 },
  enemyCam: { x: 560, y: 110, w: 394, h: 260 },
  crew: { x: 4, y: 374, w: 550, h: 66 },
  comms: { x: 558, y: 374, w: 398, h: 66 },
  barY: 442,
  barH: 96,
} as const;
export const PLAYER_AREA = { x: 4, y: 52, w: 550, h: 318 };
export const ENEMY_AREA = { x: 558, y: 50, w: 398, h: 320 };
export const PLAYER_RIGHT = 632;
export const PLAYER_TOP = 50;

function camera(r: { x: number; y: number; w: number; h: number }): Camera {
  return { rx: r.x, ry: r.y, rw: r.w, rh: r.h, z: 1, baseZ: 1, baseX: r.x, baseY: r.y, x: r.x, y: r.y, tz: 1, ax: 0, ay: 0, sx: 0, sy: 0 };
}

export function buildPlayerView(ship: SimShip): ShipView {
  const cars: CarView[] = [];
  const placed = ship.cars ?? [{ slot: "lead", id: ship.defId, ox: 0, oy: 0, cols: ship.cols, rows: ship.rows }];
  const lead = placed.find((c) => c.slot === "lead")!;
  const lm = hullMeta(lead.id, "player", [lead.cols, lead.rows]);
  const lx = PLAYER_RIGHT - lm.w;
  const ly = PLAYER_TOP;
  cars.push({ slot: "lead", id: lead.id, meta: lm, x: lx, y: ly, ox: lead.ox, oy: lead.oy, cols: lead.cols, rows: lead.rows });
  const rear = placed.find((c) => c.slot === "rear");
  if (rear) {
    const rm = hullMeta(rear.id, "rear", [rear.cols, rear.rows]);
    const cr = lm.couplerRear ?? { x: 0, y: lm.gy + TILE * 1.5 };
    const cf = rm.couplerFront ?? { x: rm.w, y: rm.gy + TILE * 1.5 };
    // Decks line up: the rear grid's rows sit on the lead grid's rows.
    const x = lx + cr.x - GANGWAY_GAP - cf.x;
    const y = ly + lm.gy + (rear.oy - lead.oy) * TILE - rm.gy;
    cars.push({ slot: "rear", id: rear.id, meta: rm, x, y, ox: rear.ox, oy: rear.oy, cols: rear.cols, rows: rear.rows });
  }
  const keel = placed.find((c) => c.slot === "keel");
  if (keel) {
    const km = hullMeta(keel.id, "keel", [keel.cols, keel.rows]);
    // Keel grid column 0 sits under lead column (keel.ox - lead.ox), hung just below the lead car.
    const gxScreen = lx + lm.gx + (keel.ox - lead.ox) * TILE;
    const x = gxScreen - km.gx;
    const hangY = lm.keelHang?.y ?? lm.gy + lead.rows * TILE + 10;
    const top = km.hangTop ?? { x: km.w / 2, y: 0 };
    const y = ly + hangY - top.y;
    cars.push({ slot: "keel", id: keel.id, meta: km, x, y, ox: keel.ox, oy: keel.oy, cols: keel.cols, rows: keel.rows });
  }
  return finish({ side: 0, cars, dx: 0, dy: 0, bx: 0, by: 0, bw: 0, bh: 0, mobility: "player", cam: camera(PLAYER_AREA) }, ship);
}

export function buildEnemyView(ship: SimShip): ShipView {
  const m = hullMeta(ship.defId, ship.mobility === "player" ? "crawler" : ship.mobility, [ship.cols, ship.rows]);
  const A = ENEMY_AREA;
  let x = Math.round(A.x + A.w / 2 - m.w / 2);
  // Keep the room grid on screen; transparent margins and guardians may run past the panel.
  const gridR = x + m.gx + ship.cols * TILE;
  if (gridR > 958) x -= gridR - 958;
  let y: number;
  if (ship.mobility === "crawler") y = PLAYER_TOP + 6;
  else y = Math.round(A.y + 30 + (A.h - 30) / 2 - m.h / 2);
  y = Math.max(A.y + 28 - m.gy + 6, Math.min(y, A.y + A.h - m.h + 16));
  const cars: CarView[] = [{ slot: "enemy", id: ship.defId, meta: m, x, y, ox: 0, oy: 0, cols: ship.cols, rows: ship.rows }];
  return finish({ side: 1, cars, dx: 0, dy: 0, bx: 0, by: 0, bw: 0, bh: 0, mobility: ship.mobility, cam: camera(A) }, ship);
}

function finish(v: ShipView, ship: SimShip): ShipView {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of v.cars) {
    c.body = ship.rooms.filter(r => r.x >= c.ox && r.x < c.ox + c.cols && r.y >= c.oy && r.y < c.oy + c.rows)
      .flatMap(r => [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]]
        .map(([x, y]) => [c.meta.gx + (x - c.ox) * TILE, c.meta.gy + (y - c.oy) * TILE] as [number, number]));
    const cut = v.side === 0 || !!c.meta.cable;
    c.sampleArt = () => hullBodyPoints(c.id, c.meta, [c.cols, c.rows], cut);
    x0 = Math.min(x0, c.x);
    y0 = Math.min(y0, c.y);
    x1 = Math.max(x1, c.x + c.meta.w);
    y1 = Math.max(y1, c.y + c.meta.h);
  }
  v.bx = x0;
  v.by = y0;
  v.bw = x1 - x0;
  v.bh = y1 - y0;
  // Fill both fighting areas from the actual hull bounds. Even a small enemy is a readable opponent.
  const c = v.cam;
  if (v.side === 1) { const r = LAYOUT.enemyCam; c.rx = r.x; c.rw = r.w; c.ry = r.y; c.rh = r.h; }
  fitCamera(v, ship);
  return v;
}

type Rect = [number, number, number, number];

/**
 * Fit a view's camera to its hull bounds and any further world rectangles that belong to the vessel (the mounted
 * weapons and the drive trolley: draw-ship `contentRects`). Pixel art stays crisp at whole-number zooms: a vessel
 * that fits at 1× or more is shown at exactly 1× (2× for a very small hostile); only consists too large for their
 * region scale down. Room for the ward mesh shells around it and 8 units of clear space inside the region, so
 * neither hull, guns nor ward ever touch a screen edge.
 */
export function fitCamera(v: ShipView, ship: SimShip, warded: Rect[] = [], bare: Rect[] = []) {
  const c = v.cam;
  const shells = Math.floor((ship.sys.shields?.level ?? 0) / 2) + ship.bonusLayers + (ship.boss.gate || ship.boss.glass ? 1 : 0);
  const ward = shells > 0 ? (v.side === 1 ? 12 : 11) + (Math.min(4, shells) - 1) * 2 + 1 : 0;
  const pad = 2 * (ward + 8);
  let x0 = v.bx, y0 = v.by, x1 = v.bx + v.bw, y1 = v.by + v.bh;
  const add = (x: number, y: number, w: number, h: number) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + w);
    y1 = Math.max(y1, y + h);
  };
  // Warded parts (the guns) get the ward's room like the hull; bare parts (the trolley above the ward) only the
  // 8 units of clear space: shrink them by the ward so the shared padding below fits both.
  for (const [x, y, w, h] of warded) add(x, y, w, h);
  for (const [x, y, w, h] of bare) add(x + Math.min(ward, w / 2), y + Math.min(ward, h / 2), Math.max(0, w - 2 * ward), Math.max(0, h - 2 * ward));
  const fit = Math.min((c.rw - pad) / (x1 - x0), (c.rh - pad) / (y1 - y0));
  c.baseZ = fit >= 1 ? Math.min(v.side === 1 ? 2 : 1, Math.floor(fit)) : fit;
  c.z = c.tz = c.baseZ;
  c.baseX = (x0 + x1) / 2 - c.rw / (2 * c.baseZ);
  c.baseY = (y0 + y1) / 2 - c.rh / (2 * c.baseZ);
  c.x = c.baseX;
  c.y = c.baseY;
}

/** The car containing tile (tx, ty), or the nearest one. */
export function carAt(v: ShipView, tx: number, ty: number): CarView {
  let best = v.cars[0];
  let bd = Infinity;
  for (const c of v.cars) {
    const inX = tx >= c.ox && tx < c.ox + c.cols;
    const inY = ty >= c.oy && ty < c.oy + c.rows;
    if (inX && inY) return c;
    const dx = inX ? 0 : Math.min(Math.abs(tx - c.ox), Math.abs(tx - (c.ox + c.cols)));
    const dy = inY ? 0 : Math.min(Math.abs(ty - c.oy), Math.abs(ty - (c.oy + c.rows)));
    const d = dx + dy;
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

/** World position of a point in tile coordinates. */
export function toScreen(v: ShipView, x: number, y: number): [number, number] {
  const c = carAt(v, Math.floor(x), Math.floor(y));
  return [c.x + c.meta.gx + (x - c.ox) * TILE + v.dx, c.y + c.meta.gy + (y - c.oy) * TILE + v.dy];
}

/** Top-left world pixel of a tile. */
export function tileScreen(v: ShipView, tx: number, ty: number): [number, number] {
  const c = carAt(v, tx, ty);
  return [Math.round(c.x + c.meta.gx + (tx - c.ox) * TILE + v.dx), Math.round(c.y + c.meta.gy + (ty - c.oy) * TILE + v.dy)];
}

/** Inverse: world → tile coordinates (float), or null when outside every car grid. */
export function fromScreen(v: ShipView, sx: number, sy: number): [number, number] | null {
  for (const c of v.cars) {
    const gx = c.x + c.meta.gx + v.dx;
    const gy = c.y + c.meta.gy + v.dy;
    if (sx >= gx && sy >= gy && sx < gx + c.cols * TILE && sy < gy + c.rows * TILE) {
      return [c.ox + (sx - gx) / TILE, c.oy + (sy - gy) / TILE];
    }
  }
  return null;
}

/** World position for an absolute hull-image point of a car. */
export function carPoint(v: ShipView, c: CarView, p: { x: number; y: number }): [number, number] {
  return [c.x + p.x + v.dx, c.y + p.y + v.dy];
}

// ─── cameras ────────────────────────────────────────────────────────────────────────────────────────────────

export const ZOOMS = [1, 1.5, 2];

/** Translation of the camera snapped to backing pixels (HD = 2) so zoomed pixels stay crisp. */
function camT(c: Camera): [number, number] {
  return [Math.round((c.rx - c.x * c.z) * 2) / 2, Math.round((c.ry - c.y * c.z) * 2) / 2];
}

export function camToScreen(c: Camera, wx: number, wy: number): [number, number] {
  const [tx, ty] = camT(c);
  return [tx + wx * c.z, ty + wy * c.z];
}

export function camToWorld(c: Camera, sx: number, sy: number): [number, number] {
  const [tx, ty] = camT(c);
  return [(sx - tx) / c.z, (sy - ty) / c.z];
}

export function camInRegion(c: Camera, sx: number, sy: number): boolean {
  return sx >= c.rx && sy >= c.ry && sx < c.rx + c.rw && sy < c.ry + c.rh;
}

/** Run `fn` with the camera's transform (and clip when zoomed). */
export function withCamera(ctx: CanvasRenderingContext2D, c: Camera, fn: () => void) {
  ctx.save();
  if (c.z !== 1 || c.x !== c.rx || c.y !== c.ry) {
    ctx.beginPath();
    ctx.rect(c.rx, c.ry, c.rw, c.rh);
    ctx.clip();
    const [tx, ty] = camT(c);
    ctx.translate(tx, ty);
    ctx.scale(c.z, c.z);
  }
  try {
    fn();
  } finally {
    ctx.restore();
  }
}

function clampCam(c: Camera) {
  const vw = c.rw / c.z;
  const vh = c.rh / c.z;
  c.x = Math.max(c.baseX, Math.min(c.baseX + c.rw / c.baseZ - vw, c.x));
  c.y = Math.max(c.baseY, Math.min(c.baseY + c.rh / c.baseZ - vh, c.y));
}

/** Step the zoom around a screen point (wheel). */
export function zoomAt(c: Camera, dir: number, sx: number, sy: number) {
  const i = ZOOMS.findIndex(z => Math.abs(z - c.tz / c.baseZ) < 0.01);
  const next = c.baseZ * ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? 0 : i) + (dir > 0 ? -1 : 1)))];
  if (next === c.tz) return;
  const [wx, wy] = camToWorld(c, sx, sy);
  c.tz = next;
  c.ax = wx;
  c.ay = wy;
  c.sx = sx;
  c.sy = sy;
}

export function resetZoom(c: Camera) {
  c.tz = c.baseZ;
  c.ax = c.baseX + c.rw / (2 * c.baseZ);
  c.ay = c.baseY + c.rh / (2 * c.baseZ);
  c.sx = c.rx + c.rw / 2;
  c.sy = c.ry + c.rh / 2;
}

export function panCam(c: Camera, dsx: number, dsy: number) {
  c.x -= dsx / c.z;
  c.y -= dsy / c.z;
  clampCam(c);
}

/** Ease the zoom toward its target, keeping the anchor under the cursor. */
export function updateCam(c: Camera, dt: number) {
  if (c.z === c.tz) return;
  const k = Math.min(1, dt * 12);
  c.z += (c.tz - c.z) * k;
  if (Math.abs(c.z - c.tz) < 0.01) c.z = c.tz;
  // Keep (ax, ay) at (sx, sy): sx = rx + (ax - x) * z → x = ax - (sx - rx) / z
  c.x = c.ax - (c.sx - c.rx) / c.z;
  c.y = c.ay - (c.sy - c.ry) / c.z;
  clampCam(c);
}
