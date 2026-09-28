// Drawing a vessel in the side-view cutaway (★v2): hull art (or a procedural car), rooms as interior decks, doors,
// hatches with ladders, consoles, system emblems, air tint, fires, breaches, crew, weapon mounts and the ward mesh.
// Serious and physical (hard rule 8): restrained light, no cartoon motion.
import type { Gfx } from "../core/gfx";
import { settings } from "../core/save";
import { measure } from "../core/font";
import { P, rgba } from "../core/palette";
import { atlas, markHD, density, getJson } from "../core/assets";
import { CARS } from "../data/cars";
import { paletteSwap } from "../core/gfx";
import { TILE } from "../data/layouts";
import type { SimCrew, SimRoom, SimShip, SimSystem } from "./sim/model";
import type { Sim } from "./sim/sim";
import { effective, usable } from "./sim/power";
import type { CarView, ShipView } from "./view";
import { carPoint, tileScreen, toScreen } from "./view";
import { hullImage, lampColor, weaponArt, droneArt, trolleyMeta, trolleyLayers, mountSpecs, keepClearBoxes, hullSolidAt, type TrolleyMeta, type TrolleyLayers, type MountSpec } from "./assets";
import { chargeTime } from "./sim/weapons";
import { orbit } from "./sim/drones";
import { drawBay } from "./room-art";
import { drawWardSurface } from "./shield-surface";
import { CARRIER_THICKNESS, carrierThrough } from "./carrier";
import type { LampColor } from "../game/ids";

// ─── palette helpers ────────────────────────────────────────────────────────────────────────────────────────

const TINTS: Record<string, { body: string; dark: string; light: string; trim: string; line: string }> = {
  player: { body: P.ivory3, dark: P.brass4, light: P.ivory1, trim: P.brass2, line: P.brass5 },
  copper: { body: P.copper2, dark: P.copper3, light: P.copper0, trim: P.verd2, line: P.copper4 },
  verd: { body: P.verd2, dark: P.verd3, light: P.verd1, trim: P.copper1, line: P.verd4 },
  rust: { body: P.copper3, dark: P.copper4, light: P.copper1, trim: P.brass4, line: P.ink0 },
  brass: { body: P.brass3, dark: P.brass4, light: P.brass1, trim: P.ivory3, line: P.brass5 },
  iron: { body: P.steel0, dark: P.ink4, light: P.steel1, trim: P.brass4, line: P.ink1 },
  violet: { body: P.violet3, dark: P.violet4, light: P.violet2, trim: P.ivory3, line: P.ink1 },
  glass: { body: P.violet2, dark: P.violet3, light: P.violet1, trim: P.teal3, line: P.violet4 },
  ember: { body: P.ember3, dark: P.ember4, light: P.ember2, trim: P.brass4, line: P.ink0 },
  black: { body: P.ink3, dark: P.ink1, light: P.ink5, trim: P.ember3, line: P.ink0 },
  ivory: { body: P.ivory3, dark: P.ivory4, light: P.ivory2, trim: P.brass3, line: P.brass5 },
};

export const SYS_COLOR = { on: P.teal2, off: P.steel1, dmg: P.ember2, ion: P.violet1 };

export function sysState(s: SimSystem): "powered" | "unpowered" | "damaged" | "ionised" {
  if (s.ion > 0) return "ionised";
  if (s.damage >= s.level) return "damaged";
  if (s.damage > 0) return effective(s) > 0 ? "damaged" : "damaged";
  return effective(s) > 0 ? "powered" : "unpowered";
}

const SPECIAL_ICON: Record<string, string> = { gate: "doors", bells: "shields", heart: "reactor", brood: "drones", artillery: "weapons" };

export function drawSysIcon(g: Gfx, id: string, state: string, x: number, y: number, small = false) {
  const icon = SPECIAL_ICON[id] ?? id;
  if (g.sprite("icons", `sys-${icon}-${state}${small ? "-sm" : ""}`, x, y)) return;
  // Fallback: a coloured roundel with the initial.
  const c = state === "powered" ? SYS_COLOR.on : state === "damaged" ? SYS_COLOR.dmg : state === "ionised" ? SYS_COLOR.ion : SYS_COLOR.off;
  const r = small ? 4 : 7;
  g.circle(x, y, r, P.ink0, true);
  g.circle(x, y, r - 1, c, true);
  g.text(id.slice(0, 1).toUpperCase(), x, y - (small ? 5 : 6), { font: "small", color: P.ink0, align: "center" });
}

// ─── hull ───────────────────────────────────────────────────────────────────────────────────────────────────

export function drawHull(g: Gfx, sim: Sim, ship: SimShip, v: ShipView, lamp: LampColor | undefined) {
  for (const c of v.cars) {
    const img = hullImage(c.id, ship.side === 0 ? lamp : undefined, [c.cols, c.rows]);
    const x = Math.round(c.x + v.dx);
    const y = Math.round(c.y + v.dy);
    if (img) g.image(img, x, y);
    else proceduralHull(g, ship, c, x, y, lamp);
    if (ship.side === 1) drawHostileFrame(g, ship, c, x, y);
    if (ship.side === 1) drawMachineDuty(g, sim, ship, c, x, y);
    // Hit flash: the whole car briefly brightens.
    if (ship.hitT < 0.12 && img) g.alpha(0.35 * (1 - ship.hitT / 0.12), () => g.image(img, x, y));
    // Lamps and glow points.
    for (const gp of c.meta.glow) {
      const [gx, gy] = carPoint(v, c, gp);
      const col = ship.side === 0 ? lampColor(lamp, 2) : glowColor(ship);
      const lit = ship.dead ? Math.max(0, 1 - ship.deadT / 1.6) : 1;
      glow(g, gx, gy, gp.r, col, (0.25 + 0.05 * Math.sin(sim.t * 1.7 + gp.x)) * lit);
    }
  }
}

// ─── drive trolley (separately painted layers, when the art provides them) ─────────────────────────────────

/** Cars of a view whose drive trolley is a separate back/front layer pair (loaded). */
export function trolleyCars(v: ShipView) {
  const out: { car: CarView; meta: TrolleyMeta; layers: TrolleyLayers }[] = [];
  for (const car of v.cars) {
    const meta = trolleyMeta(car.id);
    const layers = meta ? trolleyLayers(meta.kind) : null;
    if (meta && layers) out.push({ car, meta, layers });
  }
  return out;
}

/** Where the carrier's centre passes through each car's grip. With a separate trolley the carriage rides the
 *  carrier while the hull swings beneath it (the view's sideways sway, v.dx, moves the hull only). */
export function carrierGrips(v: ShipView): [number, number][] {
  const layered = new Map(trolleyCars(v).map((q) => [q.car, q.meta]));
  const out: [number, number][] = [];
  for (const c of v.cars) {
    const tm = layered.get(c);
    if (tm) out.push([Math.round(c.x + tm.saddle.x), Math.round(c.y + tm.saddle.y + v.dy)]);
    else if (c.meta.cable) out.push([Math.round(c.x + c.meta.cable.x + v.dx), Math.round(c.y + c.meta.cable.y + v.dy)]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/** Draw one layer of every separate trolley. `phase` counts sheave frames (advances while the drive runs). */
export function drawTrolleys(g: Gfx, v: ShipView, layer: "back" | "front", phase = 0) {
  for (const { car, meta, layers } of trolleyCars(v)) {
    const img = layer === "back" ? layers.back : layers.front;
    const f = settings.reducedMotion ? 0 : Math.floor(phase) % layers.frames;
    const d = density(img) > 1 ? density(img) : 2;
    const x = car.x + meta.saddle.x - layers.saddle.x;
    const y = car.y + meta.saddle.y + v.dy - layers.saddle.y;
    const sw = layers.w * d, sh = layers.h * d;
    g.ctx.drawImage(img, f * sw, 0, sw, sh, Math.round(x * 2) / 2, Math.round(y * 2) / 2, layers.w, layers.h);
  }
}

const trolleyBoxCache = new Map<string, [number, number, number, number]>();

/** Opaque extent of a trolley kind's layers (frame 0, back and front), relative to its saddle (layout units). */
function trolleyBox(layers: TrolleyLayers, kind: string): [number, number, number, number] {
  const hit = trolleyBoxCache.get(kind);
  if (hit) return hit;
  const full: [number, number, number, number] = [-layers.saddle.x, -layers.saddle.y, layers.w, layers.h];
  if (typeof document === "undefined" || !layers.back.complete || !layers.front.complete) return full;
  const d = layers.back.width / (layers.w * layers.frames);
  const W = Math.round(layers.w * d), H = Math.round(layers.h * d);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return full;
  ctx.drawImage(layers.back, 0, 0, W, H, 0, 0, W, H);
  ctx.drawImage(layers.front, 0, 0, W, H, 0, 0, W, H);
  const a = ctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (a[(y * W + x) * 4 + 3] <= 100) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (x1 < 0) return full;
  const box: [number, number, number, number] = [x0 / d - layers.saddle.x, y0 / d - layers.saddle.y, (x1 + 1 - x0) / d, (y1 + 1 - y0) / d];
  trolleyBoxCache.set(kind, box);
  return box;
}

/** World rectangles of a vessel beyond its hull art: its mounted weapons with their pylons (inside the ward) and
 *  its separately painted drive trolleys (above it). The camera fits them too (view `fitCamera`). */
export function contentRects(v: ShipView, ship: SimShip): { warded: [number, number, number, number][]; bare: [number, number, number, number][] } {
  const ms = ship.side === 0 ? mountPositions(ship, v, playerHardpoints(v)) : [];
  const warded = ship.weapons.flatMap((w) => (ms[w.slot] ? [weaponRect(w, ms[w.slot], 1)] : []));
  const bare = trolleyCars(v).map(({ car, meta, layers }) => {
    const [bx, by, bw, bh] = trolleyBox(layers, meta.kind);
    return [car.x + meta.saddle.x + bx, car.y + meta.saddle.y + v.dy + by, bw, bh] as [number, number, number, number];
  });
  return { warded, bare };
}

/** Purposeful external tooling remains visible even when the vessel uses shipped hull artwork. */
function drawMachineDuty(g: Gfx, sim: Sim, ship: SimShip, car: CarView, x: number, y: number) {
  const m = car.meta, live = !sim.outcome && !sim.deliveryReady && effective(ship.sys[sim.setup.scenario?.system ?? "weapons"]) > 0;
  const t = settings.reducedMotion || !live ? 0 : sim.t;
  const cx = x + m.gx - 4, cy = y + m.gy + Math.min(1.5, ship.rows / 2) * TILE;
  if (ship.defId === "packet-leech") {
    const aperture = live ? 5 + Math.sin(t * .7) * 2 : 14;
    for (const sign of [-1, 1]) {
      g.line(cx - 15, cy + sign * 18, cx - 15, cy + sign * aperture, P.brass2, 3);
      g.line(cx - 15, cy + sign * aperture, cx - 3, cy + sign * aperture, P.brass1, 3);
    }
    g.circle(cx - 7, cy, 2, live ? P.amber1 : P.teal1, true);
    if (live) for (let i = 0; i < 3; i++) g.rect(cx - 45 + ((t * 6 + i * 9) % 24), cy - 2, 3, 3, P.amber2);
  } else if (ship.defId === "cable-wraith") {
    const open = live ? 5 + Math.sin(t * 1.2) * 4 : 2;
    g.circle(cx, cy, 4, P.steel1, true);
    for (const sign of [-1, 1]) {
      g.line(cx + 6, cy - sign * 6, cx - 21, cy + sign * open, P.steel2, 3);
      g.line(cx - 12, cy + sign * open * .6, cx - 21, cy + sign * open, P.ember2);
    }
  } else if (ship.defId === "rust-prophet") {
    const hornY = y + m.gy - 9, angle = live ? Math.sin(t * .5) * .3 : 0;
    g.line(cx + 28, hornY + 8, cx + 28, hornY - 3, P.brass2, 3);
    g.line(cx + 28, hornY, cx + 9, hornY - 7 + angle * 8, P.copper0, 3);
    g.line(cx + 28, hornY, cx + 9, hornY + 7 + angle * 8, P.copper0, 3);
    g.line(cx + 9, hornY - 7 + angle * 8, cx + 9, hornY + 7 + angle * 8, P.copper1, 2);
  }
}

/** Exposed structural hardware connects the cutaway decks to each hostile's suspension and armor. */
function drawHostileFrame(g: Gfx, ship: SimShip, car: CarView, x: number, y: number) {
  const m = car.meta;
  const tint = TINTS[ship.enemy?.tint ?? "iron"] ?? TINTS.iron;
  if (car.id === "iron-regent") {
    // The guardian's exposed gun stations are supported by armored deck cradles (height: the mount's own `pylon`
    // in ships.json when it has one).
    const specs = mountSpecs(car.id, m, [car.cols, car.rows]);
    for (const [i, mount] of m.mounts.entries()) {
      const mx = x + mount.x, my = y + mount.y;
      const depth = specs[i]?.pylon ?? (i === 0 ? 21 : 9);
      g.rect(mx - 10, my + 1, 20, depth, P.ink0);
      g.rect(mx - 8, my + 2, 16, depth - 2, P.brass4);
      g.hline(mx - 9, my + 2, 18, P.brass1);
      g.vline(mx - 5, my + 4, depth - 5, P.steel1);
      g.vline(mx + 5, my + 4, depth - 5, P.steel1);
    }
  }
  if (m.cable && ship.mobility === "crawler") {
    const cx = x + m.cable.x, cy = y + m.cable.y;
    const top = y + m.gy - 4;
    // Two grooved steel sheaves ride ON the carrier (its centre line is cy, CARRIER_THICKNESS thick): each wheel's
    // groove sits on the cable's top edge, its axle strap drops past the cable to a load-bearing crosshead.
    const wy = cy - CARRIER_THICKNESS / 2 - 2;
    for (const dx of [-18, 18]) {
      g.rect(cx + dx - 3, cy + 7, 6, Math.max(3, top - cy - 7), P.ink0);
      g.rect(cx + dx - 2, cy + 7, 3, Math.max(3, top - cy - 7), tint.trim);
      g.rect(cx + dx - 1, wy, 3, cy + 8 - wy, P.ink0);
      g.rect(cx + dx, wy, 1, cy + 8 - wy, tint.trim);
      g.circle(cx + dx, wy, 8, P.ink0, true);
      g.circle(cx + dx, wy, 6, P.steel1, true);
      g.circle(cx + dx, wy, 3, tint.trim, true);
      g.circle(cx + dx, wy, 1, P.ivory1, true);
    }
    g.rect(cx - 28, cy + 7, 56, 8, P.ink0);
    g.rect(cx - 26, cy + 8, 52, 5, tint.dark);
    g.hline(cx - 26, cy + 8, 52, tint.light);
    if (top > cy + 22) {
      g.line(cx - 17, cy + 16, cx + 16, top, tint.line, 2);
      g.line(cx + 17, cy + 16, cx - 16, top, tint.trim);
    }
  }
  // A continuous armored rim follows the occupied deck shape. Internal dividers remain room walls.
  const S = ship;
  for (let ty = 0; ty < S.rows; ty++) for (let tx = 0; tx < S.cols; tx++) {
    const tile = ty * S.cols + tx;
    if (S.tileRoom[tile] < 0) continue;
    const px = x + m.gx + tx * TILE, py = y + m.gy + ty * TILE;
    if (ty === 0 || S.tileRoom[tile - S.cols] < 0) {
      g.rect(px - 2, py - 4, TILE + 4, 4, P.ink0);
      g.rect(px, py - 3, TILE, 2, tint.trim); g.hline(px, py - 3, TILE, tint.light);
    }
    if (ty === S.rows - 1 || S.tileRoom[tile + S.cols] < 0) {
      g.rect(px - 2, py + TILE, TILE + 4, 4, P.ink0); g.hline(px, py + TILE + 1, TILE, tint.trim);
    }
    if (tx === 0 || S.tileRoom[tile - 1] < 0) g.rect(px - 3, py, 3, TILE, tint.trim);
    if (tx === S.cols - 1 || S.tileRoom[tile + 1] < 0) g.rect(px + TILE, py, 3, TILE, tint.dark);
  }
}

function glowColor(ship: SimShip): string {
  const t = ship.enemy?.tint;
  if (t === "violet" || t === "glass") return P.violet1;
  if (t === "ember" || t === "black" || t === "rust") return P.ember2;
  if (t === "verd") return P.amber2;
  return P.amber2;
}

export function glow(g: Gfx, x: number, y: number, r: number, color: string, a: number) {
  if (a <= 0) return;
  const c = g.ctx;
  const prev = c.globalAlpha;
  for (let i = 3; i >= 1; i--) {
    c.globalAlpha = prev * a * (0.35 / i);
    g.circle(x, y, Math.max(1, Math.round((r * (i + 1)) / 2)), color, true);
  }
  c.globalAlpha = prev * Math.min(1, a * 2.2);
  g.circle(x, y, Math.max(1, Math.round(r / 3)), P.ivory0, true);
  c.globalAlpha = prev;
}

function proceduralHull(g: Gfx, ship: SimShip, c: CarView, x: number, y: number, lamp: LampColor | undefined) {
  const tint = TINTS[ship.side === 0 ? "player" : ship.enemy?.tint ?? "iron"] ?? TINTS.iron;
  const m = c.meta;
  const gx = x + m.gx;
  const gy = y + m.gy;
  const gw = c.cols * TILE;
  const gh = c.rows * TILE;
  const face = ship.side === 0 ? 1 : -1;
  const pad = 7;
  const bx = gx - pad;
  const by = gy - pad;
  const bw = gw + pad * 2;
  const bh = gh + pad * 2 + 2;
  // Suspension: trolley and hangers up to the carrier.
  if (m.cable && ship.mobility !== "flier" && ship.mobility !== "installation") {
    const cx = x + m.cable.x;
    const cy = y + m.cable.y;
    g.rect(cx - 16, cy + 2, 32, 9, P.ink0);
    g.rect(cx - 15, cy + 3, 30, 7, tint.dark);
    g.hline(cx - 15, cy + 3, 30, tint.trim);
    g.circle(cx - 9, cy + 1, 4, P.ink0, true);
    g.circle(cx + 9, cy + 1, 4, P.ink0, true);
    g.circle(cx - 9, cy + 1, 2, P.steel1, true);
    g.circle(cx + 9, cy + 1, 2, P.steel1, true);
    for (const hx of [cx - 10, cx + 9]) {
      g.rect(hx, cy + 10, 2, by - cy - 10, P.ink0);
      g.rect(hx, cy + 10, 1, by - cy - 10, tint.trim);
    }
  }
  if (ship.mobility === "flier") {
    // Rotors: two blurred discs on struts.
    for (const rx of [bx + 18, bx + bw - 18]) {
      g.rect(rx - 1, by - 14, 2, 14, P.ink0);
      g.alpha(0.55, () => g.rect(rx - 18, by - 16, 36, 2, P.steel2));
      g.rect(rx - 3, by - 17, 6, 4, tint.dark);
    }
  }
  if (ship.mobility === "installation") {
    // Anchoring girder down into the structure below.
    const ax = bx + Math.round(bw / 2);
    g.rect(ax - 12, by + bh, 24, 600, P.ink1);
    for (let yy = by + bh; yy < 540; yy += 14) {
      g.line(ax - 12, yy, ax + 12, yy + 14, P.ink3);
      g.line(ax + 12, yy, ax - 12, yy + 14, P.ink3);
    }
    g.rect(ax - 12, by + bh, 2, 600, P.ink3);
    g.rect(ax + 10, by + bh, 2, 600, P.ink3);
  }
  // Body with rounded ends; the nose is a longer taper.
  g.rect(bx + 3, by - 1, bw - 6, bh + 2, P.ink0);
  g.rect(bx - 1, by + 3, bw + 2, bh - 6, P.ink0);
  g.rect(bx + 3, by, bw - 6, bh, tint.body);
  g.rect(bx, by + 3, bw, bh - 6, tint.body);
  g.hline(bx + 3, by, bw - 6, tint.light);
  g.hline(bx + 3, by + 1, bw - 6, tint.light);
  g.rect(bx + 3, by + bh - 3, bw - 6, 3, tint.dark);
  // Plate seams and rivets.
  for (let sx = bx + 12; sx < bx + bw - 6; sx += 32) {
    g.vline(sx, by + 2, 3, tint.line);
    g.vline(sx, by + bh - 5, 3, tint.line);
    g.rect(sx + 3, by + 3, 1, 1, tint.light);
    g.rect(sx + 3, by + bh - 4, 1, 1, tint.line);
  }
  // Nose / cab.
  const nx = face > 0 ? bx + bw : bx;
  const ny = by + Math.round(bh * 0.35);
  const nh = Math.round(bh * 0.5);
  for (let i = 0; i < 12; i++) {
    const hh = Math.max(2, nh - i * 3);
    g.rect(nx + face * i - (face < 0 ? 1 : 0), ny + (nh - hh) / 2, 1, hh, i === 11 ? P.ink0 : i < 2 ? tint.dark : tint.body);
  }
  if (ship.side === 0 && c.slot === "lead") {
    // Lamp cupola.
    const lx = nx + face * 5;
    const ly = ny + Math.round(nh / 2);
    g.circle(lx, ly, 4, P.ink0, true);
    g.circle(lx, ly, 3, lampColor(lamp, 1), true);
  }
  // Keel band.
  g.rect(bx + 10, by + bh, bw - 20, 4, P.ink0);
  g.rect(bx + 11, by + bh, bw - 22, 3, tint.dark);
}

// ─── rooms (sprites "rooms" deck kit, procedural fallback) ──────────────────────────────────────────────────

/** Floor line inside a tile (the kit's floor plate is the bottom 3 units). */
export const FLOOR = TILE - 3;
const MID = TILE / 2;

/** Draw a kit frame into a tile cell, bottom-aligned (the kit may be authored for a smaller tile). */
function kitTile(g: Gfx, frame: string, x: number, y: number, opts: { image?: CanvasImageSource } = {}): boolean {
  const fs = g.frameSize("rooms", frame);
  if (!fs) return false;
  const oy = y + TILE - fs.h;
  if (fs.h < TILE) g.rect(x, y, TILE, TILE - fs.h + 1, P.ink1);
  if (fs.w >= TILE) return g.sprite("rooms", frame, x, oy, opts);
  let ok = true;
  g.clip(x, y, TILE, TILE, () => {
    for (let xx = x; xx < x + TILE; xx += fs.w) ok = g.sprite("rooms", frame, xx, oy, opts) && ok;
  });
  return ok;
}

export interface RoomDrawOpts {
  hoverRoom: number;
  targetRooms: Set<number>;
  dark: boolean;
  showInterior: boolean;
  lamp: LampColor | undefined;
  selectedRooms?: Set<number>;
}

const KIT_SYS: Record<string, string> = {
  shields: "shields", engines: "engines", weapons: "weapons", air: "air", medbay: "medbay", helm: "helm",
  sensors: "sensors", doors: "doors", drones: "drones", veil: "veil", gate: "reactor", bells: "shields",
  heart: "reactor", brood: "drones", artillery: "weapons",
};

function wallKind(r: SimRoom): string {
  if (r.sys) return KIT_SYS[r.sys.id] ?? "hold";
  if (r.socket) return "socket";
  const id = r.id.includes(":") ? r.id.split(":")[1] : r.id;
  if (/corridor|vestibule|gangway|hall|gallery|run|conduit|shell|keel|well/.test(id)) return "corridor";
  if (/quarters|bunk|bench|lockers|galley|warrant|brig|cells/.test(id)) return "quarters";
  if (r.module !== undefined || /^hold/.test(id)) return r.module !== undefined ? "socket" : "hold";
  return "hold";
}

let liveryCache: { key: string; img: HTMLCanvasElement | null } = { key: "", img: null };

/** The rooms atlas image with the livery's lamp colours (used only for lamp frames). */
function liveryImage(lamp: LampColor | undefined): CanvasImageSource | undefined {
  if (!lamp || lamp === "amber") return undefined;
  const a = atlas("rooms");
  if (!a) return undefined;
  const key = `rooms-${lamp}`;
  if (liveryCache.key === key) return liveryCache.img ?? undefined;
  const maps = (a.meta.livery as Record<string, Record<string, string>> | undefined)?.[lamp];
  const img = maps ? paletteSwap(a.image, key, maps) : null;
  if (img) markHD(img, density(a.image));
  liveryCache = { key, img };
  return img ?? undefined;
}

export function drawRooms(g: Gfx, sim: Sim, ship: SimShip, v: ShipView, o: RoomDrawOpts) {
  const t = sim.t;
  const kit = !!atlas("rooms");
  const lampImg = ship.side === 0 ? liveryImage(o.lamp) : undefined;
  for (const r of ship.rooms) {
    const [x, y] = tileScreen(v, r.x, r.y);
    const w = r.w * TILE;
    const h = r.h * TILE;
    const kind = wallKind(r);
    const powered = r.sys ? effective(r.sys) > 0 : true;
    if (r.lift) {
      drawLift(g, ship, r, v);
    } else {
      drawBay(g, ship, r, x, y, w, h, kind, powered, t);
      if (r.module) {
        // Installed modules sit in the open mounting cradle.
        const frame = `module-${r.module}-a`;
        g.clip(x + 3, y + 3, w - 6, h - 6, () => g.sprite("rooms", frame, x + w / 2 - 16, y + 3));
      }
      // A small wall console sits clear of the bay's large identifying fixture.
      if (r.sys && r.station >= 0) {
        const tx = r.station % ship.cols;
        const [px, py] = tileScreen(v, tx, Math.floor(r.station / ship.cols));
        drawConsoleFallback(g, px, py, r.stationDir === "right", powered);
      }
    }
    // Fires, breaches (interior visibility).
    if (o.showInterior) {
      for (const tIdx of r.tiles) {
        const tx = tIdx % ship.cols;
        const ty = (tIdx - tx) / ship.cols;
        const [px, py] = tileScreen(v, tx, ty);
        if (ship.breach[tIdx] > 0) drawBreach(g, px, py, t);
        if (ship.fire[tIdx] > 0) drawFire(g, px, py, t, ship.fire[tIdx], tIdx);
      }
      if (r.o2 < 60) g.alpha(Math.min(0.42, (60 - r.o2) / 115), () => g.rect(x, y, w, h - 3, P.ember3));
    }
    // Unpowered / dark rooms.
    if (r.sys && !powered) g.alpha(0.12, () => g.rect(x + 2, y + 3, w - 4, h - 6, P.ink0));
    if (ship.side === 0 && o.dark) {
      let crewHere = false;
      for (const c of sim.crew) if (!c.dead && c.ship === 0 && c.side === 0 && ship.tileRoom[c.tile] === r.i) crewHere = true;
      if (!crewHere) g.alpha(0.62, () => g.rect(x, y, w, h, P.ink0));
    }
    if (ship.side === 1 && !o.showInterior) g.alpha(0.16, () => g.rect(x + 2, y + 3, w - 4, h - 6, P.ink0));
    if (ship.dead) g.alpha(Math.min(0.55, ship.deadT * 0.3), () => g.rect(x, y, w, h, P.ink0));
    // Small tactical system badge; room identity comes from the machinery around it.
    if (r.sys) {
      g.alpha(.7, () => g.rect(x + 4, y + 4, 16, 16, P.ink1));
      drawSysIcon(g, r.sys.id, sysState(r.sys), x + 12, y + 12, true);
    }
    // System damage readout: small bars under the emblem.
    if (r.sys && (r.sys.damage > 0 || r.sys.ion > 0)) {
      const n = r.sys.level;
      const bw = Math.min(3, Math.max(1, Math.floor((w - 10) / n) - 1));
      const x0 = x + 5;
      const by = y + 24;
      g.rect(x0 - 1, by - 1, n * (bw + 1) + 1, 4, P.ink0);
      for (let i = 0; i < n; i++) {
        const ok = i < n - r.sys.damage;
        const ion = ok && i >= n - r.sys.damage - r.sys.ion;
        g.rect(x0 + i * (bw + 1), by, bw, 2, !ok ? P.ember2 : ion ? P.violet1 : P.teal3);
      }
      if (r.sys.repair > 0) g.rect(x0, by + 3, Math.round(n * (bw + 1) * r.sys.repair), 1, P.amber2);
      if (r.sys.damage >= r.sys.level) g.alpha(0.3 + 0.2 * Math.sin(t * 5), () => g.box(x + 1, y + 1, w - 2, h - 4, P.ember2));
    }
    if (o.targetRooms.has(r.i)) g.alpha(0.5 + 0.2 * Math.sin(t * 5), () => g.box(x + 1, y + 1, w - 2, h - 4, P.ember1));
    if (o.hoverRoom === r.i) g.alpha(0.85, () => g.box(x, y, w, h - 2, ship.side === 0 ? P.teal1 : P.ember1));
  }
  // Walls between rooms where there's no door.
  if (kit) drawWalls(g, ship, v);
}

function drawWalls(g: Gfx, ship: SimShip, v: ShipView) {
  const { cols, rows, tileRoom } = ship;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const t = y * cols + x;
      const a = tileRoom[t];
      const b = tileRoom[t + 1];
      if (a < 0 || b < 0 || a === b) continue;
      if (ship.tileCar && ship.tileCar[t] !== ship.tileCar[t + 1]) continue;
      if (ship.doorAt.has(`${t}:${t + 1}`)) continue;
      const [px, py] = tileScreen(v, x + 1, y);
      g.sprite("rooms", "wall-v", px, py);
    }
  }
}

function drawConsoleFallback(g: Gfx, px: number, py: number, right: boolean, live: boolean) {
  const cx = right ? px + TILE - 12 : px + 3;
  const cy = py + FLOOR - 16;
  g.rect(cx, cy, 9, 16, P.ink0);
  g.rect(cx + 1, cy + 1, 7, 15, P.steel0);
  g.rect(cx + 2, cy + 2, 5, 4, live ? P.teal2 : P.steel1);
  g.hline(cx + 1, cy + 8, 7, P.brass3);
}

function drawRoomInterior(g: Gfx, ship: SimShip, r: SimRoom, x: number, y: number, w: number, h: number, lamp: LampColor | undefined) {
  const sysRoom = !!r.sys;
  const wall = sysRoom ? P.ink3 : P.ink2;
  g.rect(x, y, w, h, P.ink0);
  g.rect(x, y + 2, w, h - 5, wall);
  g.rect(x, y + 2, w, 4, sysRoom ? P.ink4 : P.ink3);
  g.hline(x, y + 6, w, P.ink1);
  g.hline(x, y + Math.round(TILE * 0.55), w, sysRoom ? P.ink5 : P.ink4);
  for (let sx = x + 16; sx < x + w - 1; sx += 16) g.vline(sx, y + 7, h - 10, P.ink1);
  g.rect(x, y + h - 3, w, 1, P.brass3);
  g.rect(x, y + h - 2, w, 2, P.brass5);
  const lc = ship.side === 0 ? lampColor(lamp, 1) : P.amber1;
  g.alpha(0.06, () => g.rect(x + 1, y + 5, w - 2, h - 9, lc));
}

function drawFire(g: Gfx, x: number, y: number, t: number, hp: number, seed: number) {
  const a = Math.min(1, hp / 60);
  g.alpha(0.22 * a, () => g.rect(x, y + 2, TILE, TILE - 5, P.ember3));
  if (!g.anim("fx", "fire", t + seed * 0.13, x + (TILE - 32) / 2, y + TILE - 32, { alpha: a })) {
    for (let i = 0; i < 4; i++) {
      const fh = 6 + (((Math.sin(t * 9 + i * 1.7 + seed) + 1) * 5) | 0);
      const fx = x + 5 + i * 6;
      g.rect(fx, y + TILE - 3 - fh, 4, fh, P.ember2);
      g.rect(fx + 1, y + TILE - 3 - Math.round(fh * 0.6), 2, Math.round(fh * 0.6), P.amber2);
    }
  }
}

function drawBreach(g: Gfx, x: number, y: number, t: number) {
  if (!g.anim("fx", "breach", t, x + (TILE - 32) / 2, y + TILE - 32)) {
    g.rect(x + 10, y + 9, 12, 10, P.ink0);
    g.rect(x + 12, y + 11, 8, 6, P.ink1);
    g.box(x + 9, y + 8, 14, 12, P.steel1);
  }
  for (let i = 0; i < 3; i++) {
    const f = (t * 1.6 + i / 3) % 1;
    g.alpha(0.5 * (1 - f), () => fine(g, x + 16 + Math.sin(i * 2.1) * 4 * f, y + 14 - f * 10, 0.5, 1.5, P.steel3));
  }
}

/** Fine (half-unit) rectangle for HD detail. */
export function fine(g: Gfx, x: number, y: number, w: number, h: number, color: string) {
  const c = g.ctx;
  c.fillStyle = color;
  c.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, Math.max(0.5, Math.round(w * 2) / 2), Math.max(0.5, Math.round(h * 2) / 2));
}

// ─── doors, hatches, ladders, gangways ──────────────────────────────────────────────────────────────────────

function doorFrame(anim: number): number {
  return Math.max(0, Math.min(3, Math.round(anim * 3)));
}

export function drawDoors(g: Gfx, sim: Sim, ship: SimShip, v: ShipView, hoverDoor: number) {
  const kit = !!atlas("rooms");
  for (const d of ship.doors) {
    const hot = hoverDoor === d.i;
    const f = doorFrame(d.anim);
    const broken = d.broken > 0;
    if (d.hatch) {
      const upperT = d.tb >= 0 ? Math.min(d.ta, d.tb) : d.ta;
      const tx = upperT % ship.cols;
      const ty = Math.floor(upperT / ship.cols);
      const [px, py] = tileScreen(v, tx, ty);
      const cx = px + MID;
      if (d.airlock) {
        const hy = d.side === "up" ? py - 3 : py + FLOOR;
        if (!(kit && g.sprite("rooms", broken ? "hatch-locked" : `hatch-${f}`, cx, hy))) hatchFallback(g, cx, hy, d.anim, true, broken);
        if (hot) g.box(cx - 12, hy - 3, 24, 10, P.teal1);
        continue;
      }
      const lowerT = Math.max(d.ta, d.tb);
      const [lx, ly] = tileScreen(v, lowerT % ship.cols, Math.floor(lowerT / ship.cols));
      const floorY = py + FLOOR;
      // The keel is reached through a sealed service-lift extension.
      g.rect(cx - 12, floorY, 24, Math.max(4, ly - floorY), P.ink1);
      g.vline(cx - 11, floorY, ly + TILE - floorY, P.brass3);
      g.vline(cx + 10, floorY, ly + TILE - floorY, P.brass3);
      hatchFallback(g, cx, floorY, d.anim, false, broken);
      if (hot) g.box(cx - 12, floorY - 3, 24, 10, P.teal1);
      continue;
    }
    // Wall doors (the kit's doors are floor-aligned).
    const [, py0] = tileScreen(v, Math.min(d.x, ship.cols - 1), d.y);
    const dh = g.frameSize("rooms", "door-closed")?.h ?? TILE;
    const py = py0 + Math.max(0, TILE - dh);
    let wx: number;
    if (d.airlock) {
      const [ax] = tileScreen(v, d.side === "right" ? d.x - 1 : d.x, d.y);
      wx = d.side === "right" ? ax + TILE : ax;
      if (!(kit && g.sprite("rooms", broken ? "airlock-locked" : `airlock-${f}`, wx, py))) doorFallback(g, wx, py, d.anim, true, broken);
    } else if (d.gangway) {
      const [ax] = tileScreen(v, d.ta % ship.cols, d.y);
      const [bxs] = tileScreen(v, d.tb % ship.cols, d.y);
      const left = Math.min(ax, bxs) + TILE;
      const right = Math.max(ax, bxs);
      wx = Math.round((left + right) / 2);
      // Bellows across the coupling gap.
      g.rect(left, py + 4, right - left, TILE - 8, P.ink0);
      for (let fx = left; fx < right; fx += 2) g.vline(fx, py + 5, TILE - 10, fx % 4 ? P.ink2 : P.ink3);
      if (!(kit && g.sprite("rooms", broken ? "gangway-locked" : `gangway-${f}`, wx, py))) doorFallback(g, wx, py, d.anim, false, broken);
    } else {
      const [px] = tileScreen(v, d.x, d.y);
      wx = px;
      if (!(kit && g.sprite("rooms", broken ? "door-locked" : `door-${f}`, wx, py))) doorFallback(g, wx, py, d.anim, false, broken);
    }
    if (hot) g.box(wx - 5, py0 + 2, 10, TILE - 4, P.teal1);
  }
}

function doorFallback(g: Gfx, x: number, y: number, open: number, airlock: boolean, broken: boolean) {
  const h = TILE - 3;
  g.rect(x - 2, y, 4, h, P.ink0);
  const slab = Math.round((h - 2) * (1 - open));
  if (slab > 0) {
    g.rect(x - 1, y + 1, 2, slab, broken ? P.ember2 : airlock ? P.ember3 : P.brass3);
    g.vline(x - 1, y + 1, slab, airlock ? P.ember1 : P.brass1);
  }
}

function hatchFallback(g: Gfx, cx: number, y: number, open: number, airlock: boolean, broken: boolean) {
  g.rect(cx - 10, y, 20, 4, P.ink0);
  const slab = Math.round(18 * (1 - open));
  if (slab > 0) g.rect(cx - 9, y + 1, slab, 2, broken ? P.ember2 : airlock ? P.ember3 : P.brass3);
}

/** Warm brass service cage. The simulation owns its position and serializes riders. */
function drawLift(g: Gfx, ship: SimShip, room: SimRoom, v: ShipView) {
  const [x, y] = tileScreen(v, room.x, room.y);
  const h = room.h * TILE;
  g.rect(x, y, TILE, h, "#111a20");
  g.vline(x + 4, y + 2, h - 4, P.brass3);
  g.vline(x + TILE - 5, y + 2, h - 4, P.brass3);
  g.vline(x + 7, y + 2, h - 4, P.steel2);
  for (let i = 0; i < room.h; i++) {
    g.hline(x + 1, y + i * TILE + FLOOR, 5, P.brass1);
    g.hline(x + TILE - 6, y + i * TILE + FLOOR, 5, P.brass1);
    g.rect(x + 2, y + i * TILE + 5, 2, 2, P.amber1);
  }
  const cy = y + ((room.lift?.y ?? room.y + 0.5) - room.y - 0.5) * TILE;
  g.vline(x + MID - 2, y, Math.max(0, cy - y), P.steel1);
  g.vline(x + MID + 2, y, Math.max(0, cy - y), P.steel3);
  g.rect(x + 7, cy + 2, TILE - 14, TILE - 5, "#665c48");
  g.box(x + 6, cy + 1, TILE - 12, TILE - 3, P.brass1);
  g.hline(x + 7, cy + 3, TILE - 14, P.ivory2);
  g.rect(x + MID - 3, cy + 3, 6, 2, P.amber1);
  g.hline(x + 6, cy + FLOOR, TILE - 12, P.brass0);
  // The shaft and carriage identify the lift; a pair of direction chevrons replaces its label.
  g.line(x + MID - 3, y + 7, x + MID, y + 4, P.ivory3);
  g.line(x + MID, y + 4, x + MID + 3, y + 7, P.ivory3);
  g.line(x + MID - 3, y + 10, x + MID, y + 13, P.ivory3);
  g.line(x + MID, y + 13, x + MID + 3, y + 10, P.ivory3);
}

/** Screen rectangle of a door for hit-testing. */
export function doorRect(ship: SimShip, v: ShipView, d: SimShip["doors"][number]): [number, number, number, number] {
  if (d.hatch) {
    const upperT = d.tb >= 0 ? Math.min(d.ta, d.tb) : d.ta;
    const tx = upperT % ship.cols;
    const ty = Math.floor(upperT / ship.cols);
    const [px, py] = tileScreen(v, tx, ty);
    const hy = d.airlock && d.side === "up" ? py - 3 : py + FLOOR;
    return [px + MID - 12, hy - 4, 24, 10];
  }
  const [, py] = tileScreen(v, Math.min(d.x, ship.cols - 1), d.y);
  let wx: number;
  if (d.airlock) {
    const [ax] = tileScreen(v, d.side === "right" ? d.x - 1 : d.x, d.y);
    wx = d.side === "right" ? ax + TILE : ax;
  } else if (d.gangway) {
    const [ax] = tileScreen(v, d.ta % ship.cols, d.y);
    const [bxs] = tileScreen(v, d.tb % ship.cols, d.y);
    wx = Math.round((Math.min(ax, bxs) + TILE + Math.max(ax, bxs)) / 2);
  } else wx = tileScreen(v, d.x, d.y)[0];
  return [wx - 5, py + 2, 10, TILE - 6];
}

// ─── crew ───────────────────────────────────────────────────────────────────────────────────────────────────

const CREW_COLORS: Record<string, [string, string, string]> = {
  linefolk: [P.ivory1, P.brass3, P.amber2],
  warden: [P.ink4, P.brass2, P.ember2],
  rigger: [P.ivory2, P.ivory3, P.teal2],
  courier: [P.verd1, P.copper1, P.amber2],
  bellmaker: [P.violet2, P.ivory2, P.violet0],
  escort: [P.steel1, P.steel0, P.amber2],
  crawler: [P.steel0, P.ink3, P.ember2],
  "spark-mite": [P.copper2, P.ink3, P.amber1],
  splicer: [P.steel1, P.copper3, P.ember1],
  "marshal-trooper": [P.ink3, P.ink5, P.ember2],
};

/** Height of a standing crew figure above its feet (layout units): name tags and health bars sit above it. */
export const CREW_HEAD = 25;

/** Horizontal slot of a crew member inside a tile (station consoles push them aside). */
function slotX(ship: SimShip, c: SimCrew): number {
  if (c.task !== "man" || c.path.length) return MID;
  const r = ship.rooms[ship.tileRoom[c.tile]];
  if (!r || r.station !== c.tile) return MID;
  return r.stationDir === "left" ? MID + 4 : MID - 4;
}

/** Screen position of a crew member's feet on the floor line (handles gaps between cars). */
export function crewFeet(ship: SimShip, v: ShipView, c: SimCrew): [number, number] {
  const tx = c.tile % ship.cols;
  const ty = (c.tile - tx) / ship.cols;
  const [ax, ay] = tileScreen(v, tx, ty);
  if (c.path.length) {
    const nt = c.path[0];
    const nx = nt % ship.cols;
    const ny = (nt - nx) / ship.cols;
    const [bx, by] = tileScreen(v, nx, ny);
    const prog = Math.min(1, Math.abs(c.x - (tx + 0.5)) + Math.abs(c.y - (ty + 0.5)));
    return [Math.round(ax + (bx - ax) * prog + MID), Math.round(ay + (by - ay) * prog + FLOOR)];
  }
  return [ax + slotX(ship, c), ay + FLOOR];
}

const lookCache = new Map<string, CanvasImageSource | null>();
const FIGURE = /^(linefolk|warden|rigger|courier|bellmaker|spark-mite|splicer|marshal-trooper)-(?!portrait)/;

/**
 * Crew readability (design plan §2.4): a copy of the crew atlas where every figure frame gets a clean one-pixel dark
 * outline all round and a light rim along its lit (top and left) edge, so a figure reads against any room.
 * Portraits, rings and bubbles are left alone. Cached per palette variant.
 */
function outlinedCrew(src: CanvasImageSource & { width: number; height: number }, species: string): HTMLCanvasElement | null {
  const a = atlas("crew");
  if (!a || typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = src.width;
  cv.height = src.height;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = img.data;
  const W = cv.width;
  const OUT = [7, 8, 15];
  const RIM = [244, 236, 214];
  for (const [name, f] of Object.entries(a.frames)) {
    if (!FIGURE.test(name) || !name.startsWith(`${species}-`)) continue;
    const x0 = f.x, y0 = f.y, x1 = f.x + f.w, y1 = f.y + f.h;
    const solid = new Uint8Array(f.w * f.h);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) solid[(y - y0) * f.w + (x - x0)] = d[(y * W + x) * 4 + 3] > 0 ? 1 : 0;
    const at = (x: number, y: number) => x >= x0 && y >= y0 && x < x1 && y < y1 && solid[(y - y0) * f.w + (x - x0)] === 1;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      if (at(x, y)) {
        // Lit edge: open to the upper-left light. Lift the pixel a third of the way to warm ivory.
        if (!at(x, y - 1) || !at(x - 1, y) && at(x + 1, y)) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] + (RIM[k] - d[i + k]) * 0.34);
        continue;
      }
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) {
        d[i] = OUT[0]; d[i + 1] = OUT[1]; d[i + 2] = OUT[2]; d[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  markHD(cv, density(src));
  return cv;
}

function crewImage(c: SimCrew): CanvasImageSource | undefined {
  const a = atlas("crew");
  if (!a) return undefined;
  const variants = c.kind === "crew" && c.member ? (a.meta.variants as Record<string, Record<string, string>[]> | undefined)?.[c.species] : undefined;
  const look = variants?.length ? (c.member!.look ?? 0) % variants.length : 0;
  const sp = c.species === "escort" ? "rigger" : c.species === "crawler" ? "spark-mite" : c.species;
  const key = `crew-${sp}-${look}`;
  let img = lookCache.get(key);
  if (img === undefined) {
    const base = look === 0 ? a.image : markHD(paletteSwap(a.image, key, variants![look]), density(a.image));
    img = outlinedCrew(base as HTMLCanvasElement, sp) ?? base;
    lookCache.set(key, img);
  }
  return img ?? undefined;
}

export function drawCrew(g: Gfx, sim: Sim, ship: SimShip, v: ShipView, o: { visibleEnemy: boolean; selected: Set<number>; hover: number }) {
  const t = sim.t;
  for (const c of sim.crew) {
    if (c.ship !== ship.side) continue;
    if (c.side !== 0 && ship.side === 1 && !o.visibleEnemy) continue;
    if (c.dead && c.deadT > 4) continue;
    const [fx, fy] = crewFeet(ship, v, c);
    const dir = c.facing > 0 ? "right" : "left";
    const sp = c.species === "escort" ? "rigger" : c.species === "crawler" ? "spark-mite" : c.species;
    const boarder = c.kind === "boarder" || c.kind === "crawler";
    let state = "idle";
    if (c.dead) state = "stop";
    else if (c.climbing) state = "idle";
    else if (c.path.length) state = "walk";
    else if (c.hurtT < 0.2 && c.task !== "fight") state = "hurt";
    else if (c.task === "fight" || c.task === "door") state = "fight";
    else if (c.task === "repair" || c.task === "fire" || c.task === "breach") state = boarder ? "sabotage" : "repair";
    else if (c.task === "sabotage" || c.task === "cut") state = "sabotage";
    else if (c.task === "man") state = "man";
    const names = state === "climb" ? [`${sp}-climb-up`, `${sp}-walk-${dir}`] : [`${sp}-${state}-${dir}`, state === "sabotage" ? `${sp}-fight-${dir}` : "", `${sp}-idle-${dir}`];
    const alpha = c.dead ? Math.max(0, 1 - Math.max(0, c.deadT - 2.5) / 1.5) : 1;
    const at = c.dead ? c.deadT : t + (c.uid % 7) * 0.13;
    const image = crewImage(c);
    const sel = o.selected.has(c.uid);
    const hostile = c.side !== 0;
    const ringCol = hostile ? P.ember1 : sel ? P.teal1 : P.teal2;
    const ring = !c.dead && (sel || o.hover === c.uid);
    // A soft contact shadow grounds every figure; the selection ring wraps the feet (back arc behind, front arc in
    // front of the figure).
    if (!c.dead && !c.climbing) g.alpha(0.5 * alpha, () => floorEllipse(g, fx, fy, 7, 1.5, P.ink0));
    if (ring) floorRing(g, fx, fy, ringCol, "back", sel ? 1 : 0.75);
    let drawn = false;
    for (const a of names) {
      if (!a) continue;
      if (g.anim("crew", a, at, fx, fy, { alpha, ...(image ? { image } : {}) } as never)) {
        drawn = true;
        break;
      }
    }
    if (!drawn) proceduralCrew(g, c, fx, fy, t, alpha);
    if (ring) floorRing(g, fx, fy, ringCol, "front", sel ? 1 : 0.75);
    // Escort automatons are the enemy's machines: a thin amber lens mark.
    if (c.kind === "escort" && !c.dead) fine(g, fx - 1, fy - 13, 2, 0.5, P.amber1);
    if (c.dead) continue;
    // Hit flash.
    if (c.hurtT < 0.08) g.alpha(0.5, () => g.rect(fx - 6, fy - 23, 12, 22, P.ivory0));
    // Health.
    if (c.hp < c.maxHp || sel) {
      const f = c.hp / c.maxHp;
      const hx = fx - 9;
      const hy = fy - CREW_HEAD - 3;
      if (g.sprite("crew", "crew-hp-frame", hx, hy)) {
        const fill = f > 0.6 ? "green" : f > 0.3 ? "amber" : "red";
        const fw = Math.max(1, Math.round(16 * f));
        const fr = atlas("crew")?.frames[`crew-hp-fill-${fill}`];
        if (fr) for (let i = 0; i < fw; i++) g.sprite("crew", `crew-hp-fill-${fill}`, hx + 1 + i, hy + 1);
      } else {
        g.rect(hx, hy, 18, 3, P.ink0);
        g.rect(hx + 1, hy + 1, Math.max(1, Math.round(16 * f)), 1, f > 0.6 ? P.verd1 : f > 0.3 ? P.amber2 : P.ember2);
      }
    }
    // Status bubbles.
    const room = ship.rooms[ship.tileRoom[c.tile]];
    let bubble = "";
    if (ship.fire[c.tile] > 0) bubble = "fire";
    else if (c.breathes && room && room.o2 < 10) bubble = "suffocating";
    else if (c.task === "repair" && !boarder) bubble = "repair";
    if (bubble && !c.path.length) g.anim("crew", `bubble-${bubble}`, t, fx + 6, fy - CREW_HEAD - 5);
    if (c.healT < 0.3) fine(g, fx - 0.5, fy - CREW_HEAD - 6, 1, 1, P.verd0);
  }
}

/** Filled flat ellipse at half-unit resolution (contact shadow). */
function floorEllipse(g: Gfx, cx: number, cy: number, rx: number, ry: number, color: string) {
  for (let dy = -ry; dy <= ry + 1e-6; dy += 0.5) {
    const hw = rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.25)) ** 2));
    fine(g, cx - hw, cy + dy, hw * 2, 0.5, color);
  }
}

/** Selection ring on the floor: a dark bed and a bright line, one half at a time. */
function floorRing(g: Gfx, cx: number, cy: number, color: string, half: "back" | "front", a: number) {
  const rx = 10, ry = 2.6;
  g.alpha(a, () => {
    for (let i = 0; i < 128; i++) {
      const ang = (i / 128) * Math.PI * 2;
      const s = Math.sin(ang);
      if (half === "back" ? s > 0 : s <= 0) continue;
      const x = cx + Math.cos(ang) * rx, y = cy + 0.5 + s * ry;
      fine(g, x - 0.5, y - 0.5, 1.5, 1.5, P.ink0);
    }
    for (let i = 0; i < 128; i++) {
      const ang = (i / 128) * Math.PI * 2;
      const s = Math.sin(ang);
      if (half === "back" ? s > 0 : s <= 0) continue;
      fine(g, cx + Math.cos(ang) * rx, cy + 0.5 + s * ry, 0.5, 0.5, color);
    }
  });
}

/** A small name tag above a crew member's head (hover). (x, y) is the head top. */
export function crewNameTag(g: Gfx, name: string, x: number, y: number, color: string = P.ivory0) {
  const w = measure(name, "small") + 8;
  const tx = Math.round(x - w / 2), ty = Math.round(y - 13);
  g.rect(tx, ty, w, 11, P.ink0);
  g.box(tx, ty, w, 11, P.brass4);
  g.text(name, tx + 4, ty + 1, { font: "small", color });
}

function proceduralCrew(g: Gfx, c: SimCrew, x: number, y: number, t: number, alpha: number) {
  const [body, trim, lamp] = CREW_COLORS[c.species] ?? CREW_COLORS.linefolk;
  const walk = c.path.length ? Math.round(Math.sin(t * 12 + c.uid) * 1) : 0;
  g.alpha(alpha, () => {
    if (c.dead) {
      g.rect(x - 9, y - 4, 18, 4, P.ink0);
      g.rect(x - 8, y - 3, 16, 2, body);
      return;
    }
    if (c.kind === "crawler" || c.species === "spark-mite") {
      g.rect(x - 7, y - 8, 14, 7, P.ink0);
      g.rect(x - 6, y - 7, 12, 5, body);
      g.rect(x + (c.facing > 0 ? 3 : -5), y - 6, 2, 2, lamp);
      for (const lx of [-6, -2, 2, 5]) g.rect(x + lx, y - 2, 1, 2, trim);
      return;
    }
    const tall = c.species === "rigger" || c.species === "escort" ? 19 : 23;
    g.rect(x - 4, y - tall + 6, 8, tall - 8, P.ink0);
    g.rect(x - 3, y - tall + 7, 6, tall - 12, body);
    g.rect(x - 3, y - 5 + walk, 2, 5 - walk, trim);
    g.rect(x + 1, y - 5 - walk, 2, 5 + walk, trim);
    g.rect(x - 3, y - tall, 6, 7, P.ink0);
    g.rect(x - 2, y - tall + 1, 4, 5, c.species === "rigger" || c.species === "escort" ? body : P.ivory1);
    g.rect(x + (c.facing > 0 ? 1 : -2), y - tall + 2, 1, 1, c.species === "rigger" ? P.teal1 : P.ink1);
    g.rect(x - 1, y - tall + 9, 2, 2, lamp);
  });
}

// ─── weapons and drones ─────────────────────────────────────────────────────────────────────────────────────

/** Open air kept between a roof weapon and the carrier or a keep-clear fitting above it (layout units). */
export const CLEAR_AIR = 3;
/** Default pylon heights (layout units): a short riveted pedestal on the roof, a snug collar under the keel. */
export const PYLON_ROOF = 4;
export const PYLON_BELLY = 1;
/** A painted hardpoint plate is 6 image px deep, centred on its mount point: its face is 1.5 units off the centre. */
const PLATE_HALF = 1.5;

export interface MountPos {
  /** The weapon's pivot (its foot; world). */
  x: number;
  y: number;
  belly: boolean;
  /** Face of the hardpoint plate the pylon stands on (world y): the plate's top on the roof, its underside on the
   *  belly. Absent for mounts without a pylon (hostile hulls). */
  plateY?: number;
  /** Pylon height in use (layout units, a multiple of one hull pixel) and the height the mount asked for; lower
   *  when the weapon would otherwise come closer than CLEAR_AIR to the carrier or a keep-clear fitting. */
  pylon?: number;
  want?: number;
}

/** A weapon sprite's opaque extent around its pivot (layout units; facing right, roof orientation). */
export interface WeaponBox { l: number; r: number; up: number; down: number }

const PROCEDURAL_BOX: WeaponBox = { l: 6, r: 18, up: 9, down: 0 };
const boxCache = new Map<string, WeaponBox>();

export function weaponBox(sprite: string): WeaponBox {
  const hit = boxCache.get(sprite);
  if (hit) return hit;
  const { img, meta } = weaponArt(sprite);
  if (!meta) return PROCEDURAL_BOX;
  const full: WeaponBox = { l: meta.pivot.x, r: meta.w - meta.pivot.x, up: meta.pivot.y, down: meta.h - meta.pivot.y };
  if (!img || typeof document === "undefined" || !img.complete || !img.naturalWidth) return full;
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth;
  cv.height = img.naturalHeight;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return full;
  ctx.drawImage(img, 0, 0);
  const a = ctx.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    if (a[(y * cv.width + x) * 4 + 3] <= 100) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) return full;
  const s = cv.width / meta.w;
  const box = { l: meta.pivot.x - x0 / s, r: (x1 + 1) / s - meta.pivot.x, up: meta.pivot.y - y0 / s, down: (y1 + 1) / s - meta.pivot.y };
  boxCache.set(sprite, box);
  return box;
}

/** A mounted weapon's opaque rectangle (world) for the given facing. */
export function weaponBounds(sprite: string, m: MountPos, face: 1 | -1): [number, number, number, number] {
  const b = weaponBox(sprite);
  const x0 = face > 0 ? m.x - b.l : m.x - b.r;
  const y0 = m.belly ? m.y - b.down : m.y - b.up;
  return [x0, y0, b.l + b.r, b.up + b.down];
}

/** Where the carrier's centre passes each car's grip (the trolley saddle, else the painted cable grip), world. */
function gripLine(v: ShipView): [number, number][] {
  const out: [number, number][] = [];
  for (const c of v.cars) {
    const tm = trolleyMeta(c.id);
    const p = tm?.saddle ?? c.meta.cable;
    if (p) out.push([c.x + p.x + (tm ? 0 : v.dx), c.y + p.y + v.dy]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/**
 * The lowest the carrier's centre line can run near a vessel (world y at x): level with each grip beyond the
 * outermost ones, and no lower than the lower grip between two. Every carrier drawn around a tender is taut
 * (carrierThrough `taut`) and rises away from its grips, so it never comes below this line; roof weapons are kept
 * CLEAR_AIR under its lower edge.
 */
export function carrierFloor(v: ShipView): ((x: number) => number) | null {
  const g = gripLine(v);
  if (!g.length) return null;
  return (x: number) => {
    if (x <= g[0][0]) return g[0][1];
    for (let k = 0; k < g.length - 1; k++) if (x <= g[k + 1][0]) return Math.max(g[k][1], g[k + 1][1]);
    return g[g.length - 1][1];
  };
}

/** The carrier line through a tender's grips out to x0 and x1: taut arms rising away from the load. */
export function tenderCarrier(v: ShipView, x0: number, x1: number, rise: [number, number] = [18, 12]): { pts: [number, number][]; yAt: (x: number) => number } | null {
  const grips = carrierGrips(v);
  if (!grips.length) return null;
  const first = grips[0], last = grips[grips.length - 1];
  const pts: [number, number][] = [[Math.min(x0, first[0] - 40), first[1] - rise[0]], ...grips, [Math.max(x1, last[0] + 40), last[1] - rise[1]]];
  return { pts, yAt: carrierThrough(pts, true) };
}

/** Zones no weapon may enter (ships.json `keepClear`: the drive trolley, roof fittings, lamp, cab window), world. */
export function keepClearZones(v: ShipView): { what: string; x: number; y: number; w: number; h: number }[] {
  return v.cars.flatMap((c) => keepClearBoxes(c.id, [c.cols, c.rows]).map((b) => ({ what: b.what ?? "fitting", x: c.x + b.x + v.dx, y: c.y + b.y + v.dy, w: b.w, h: b.h })));
}

type Hardpoint = { car: string; x: number; side: "roof" | "belly"; mount?: { x: number; y: number } };

/** The consist's weapon hardpoints in slot order (lead car first, then rear and keel cars). */
export function playerHardpoints(v: ShipView): Hardpoint[] {
  const out: Hardpoint[] = [];
  for (const c of v.cars) {
    const def = CARS[c.id as keyof typeof CARS];
    def?.hardpoints.forEach((hp, k) => out.push({ car: c.slot, x: hp.x, side: hp.side, mount: c.meta.mounts[k] }));
  }
  return out;
}

/** The ward wraps the mounted weapons and their pylons too (the envelope keeps its margin around every gun). */
export function wrapWeapons(v: ShipView, ship: SimShip) {
  v.extras = () => {
    // Wait for the weapon art (its opaque extent) and the hull art (its plates) before wrapping.
    if (!getJson("art/weapons/weapons.json")) return null;
    if (ship.weapons.some((w) => { const { meta, img } = weaponArt(w.def.sprite); return meta && (!img || !img.complete); })) return null;
    if (v.cars.some((c) => hullSolidAt(c.id, [c.cols, c.rows], 0, 0) === null && hullImage(c.id, undefined, [c.cols, c.rows]) !== null)) return null;
    const ms = mountPositions(ship, v, playerHardpoints(v));
    return ship.weapons.flatMap((w) => {
      const m = ms[w.slot];
      if (!m) return [];
      const [x, y, rw, rh] = weaponRect(w, m, 1);
      return [[x - v.dx, y - v.dy, rw, rh] as [number, number, number, number]];
    });
  };
}

/** World position of each weapon mount (player: car hardpoints in consist order, matched to the nearest painted
 *  hardpoint plate on the same side of that car; procedural positions when the art has none). The weapon stands on a
 *  pylon: PYLON_ROOF / PYLON_BELLY or the mount's own `pylon`, cut down (never below the plate) so that the weapon in
 *  that slot keeps CLEAR_AIR under the carrier and under any keep-clear fitting above it. */
export function mountPositions(ship: SimShip, v: ShipView, hardpoints: Hardpoint[]): MountPos[] {
  const out: MountPos[] = [];
  const used = new Set<string>();
  const floor = carrierFloor(v);
  const keep = keepClearZones(v);
  hardpoints.forEach((hp, k) => {
    const c = v.cars.find((q) => q.slot === hp.car) ?? v.cars[0];
    const roof = hp.side === "roof";
    const want = c.meta.gx + (hp.x + 0.5) * TILE;
    const midY = c.meta.gy + (c.rows * TILE) / 2;
    const specs = mountSpecs(c.id, c.meta, [c.cols, c.rows]);
    let best = -1;
    let bd = Infinity;
    specs.forEach((m, i) => {
      if (used.has(`${c.slot}:${i}`) || (m.y < midY) !== roof) return;
      const d = Math.abs(m.x - want);
      if (d < bd) { bd = d; best = i; }
    });
    // The hull is drawn at whole units: plates and pylons follow its pixel grid exactly.
    const ox = Math.round(c.x + v.dx), oy = Math.round(c.y + v.dy);
    let px: number, face: number, wantPylon: number;
    if (best >= 0) {
      used.add(`${c.slot}:${best}`);
      const m = specs[best];
      px = m.x;
      face = plateFace(c, m, roof);
      wantPylon = m.pylon ?? (roof ? PYLON_ROOF : PYLON_BELLY);
    } else {
      px = Math.round(want);
      face = roof ? c.meta.gy - 3 : c.meta.gy + c.rows * TILE + 3;
      wantPylon = roof ? PYLON_ROOF : PYLON_BELLY;
    }
    const X = ox + px, F = oy + face;
    let pylon = wantPylon;
    const w = ship.weapons.find((q) => q.slot === k);
    if (roof && w) {
      const b = weaponBox(w.def.sprite);
      const x0 = X - b.l, x1 = X + b.r;
      // The highest the weapon's top may reach.
      let limit = -Infinity;
      if (floor) for (let x = x0; ; x = Math.min(x1, x + 2)) {
        limit = Math.max(limit, floor(x) + CARRIER_THICKNESS / 2 + CLEAR_AIR);
        if (x >= x1) break;
      }
      for (const z of keep) if (z.x < x1 && z.x + z.w > x0 && z.y + z.h <= F + 0.5) limit = Math.max(limit, z.y + z.h + CLEAR_AIR);
      pylon = Math.min(pylon, F - limit - b.up);
    }
    pylon = Math.max(0, Math.floor(pylon * 2) / 2);
    out.push({ x: X, y: roof ? F - pylon : F + pylon, belly: !roof, plateY: F, pylon, want: wantPylon });
  });
  return out;
}

/** The face of a mount's hardpoint plate (car-local y). A mount point on the painted hull is a plate's centre; one in
 *  open air (older art) stands on the first hull pixel below it (above it, under the belly). */
function plateFace(c: CarView, m: MountSpec, roof: boolean): number {
  const at = (y: number) => hullSolidAt(c.id, [c.cols, c.rows], m.x, y);
  const here = at(m.y);
  if (here === null || here) return roof ? m.y - PLATE_HALF : m.y + PLATE_HALF;
  for (let d = 0.5; d <= 48; d += 0.5) {
    const y = roof ? m.y + d : m.y - d;
    if (at(y)) return roof ? y : y + 0.5;
  }
  return m.y;
}

/** A riveted brass pylon from a hardpoint plate's face up to (down to) a weapon's foot, on the hull pixel grid
 *  (half-unit steps): a foot flange on the plate, a column with two rivet rows, a collar under the weapon. Low
 *  pylons are a single clamp collar. */
function drawPylon(g: Gfx, x: number, face: number, foot: number, belly: boolean) {
  const h = Math.abs(face - foot);
  if (h < 0.5) return;
  const c = g.ctx;
  const px = (x0: number, y0: number, w: number, hh: number, col: string) => {
    if (w <= 0 || hh <= 0) return;
    c.fillStyle = col;
    c.fillRect(Math.round(x0 * 2) / 2, Math.round(y0 * 2) / 2, Math.round(w * 2) / 2, Math.round(hh * 2) / 2);
  };
  const f = Math.round(face * 2) / 2;
  // Top y of a band `t` thick starting `d` from the plate face toward the weapon.
  const band = (d: number, t: number) => (belly ? f + d : f - d - t);
  const cx = Math.round(x * 2) / 2;
  if (h < 3) {
    px(cx - 6, band(0, h), 12, h, P.ink0);
    if (h >= 1.5) {
      px(cx - 5.5, band(0.5, h - 1), 11, h - 1, P.brass3);
      px(cx - 5.5, belly ? band(0.5, 0.5) : band(h - 1, 0.5), 11, 0.5, P.brass1);
    }
    return;
  }
  // Foot flange.
  px(cx - 7, band(0, 2), 14, 2, P.ink0);
  px(cx - 6.5, band(0.5, 1), 13, 1, P.brass2);
  px(cx - 6.5, belly ? band(0.5, 0.5) : band(1, 0.5), 13, 0.5, P.brass1);
  // Column.
  const c0 = 2, c1 = h - 1.5;
  if (c1 > c0) {
    px(cx - 4.5, band(c0, c1 - c0), 9, c1 - c0, P.ink0);
    px(cx - 4, band(c0, c1 - c0), 8, c1 - c0, P.brass3);
    px(cx - 4, band(c0, c1 - c0), 1, c1 - c0, P.brass1);
    px(cx + 2.5, band(c0, c1 - c0), 1.5, c1 - c0, P.brass5);
    for (let d = c0 + 1; d <= c1 - 1; d += 2.5) {
      px(cx - 2.5, band(d, 0.5), 0.5, 0.5, P.brass0);
      px(cx + 1.5, band(d, 0.5), 0.5, 0.5, P.brass0);
    }
  }
  // Collar.
  px(cx - 6, band(h - 1.5, 1.5), 12, 1.5, P.ink0);
  px(cx - 5.5, band(h - 1, 0.5), 11, 0.5, P.brass2);
}

export function drawWeaponAt(g: Gfx, sim: Sim, w: SimShip["weapons"][number], m: MountPos, face: 1 | -1, showCharge: boolean) {
  if (m.plateY !== undefined && m.pylon) drawPylon(g, m.x, m.plateY, m.y, m.belly);
  const { img, meta } = weaponArt(w.def.sprite);
  const f = Math.min(1, w.charge / chargeTime(w));
  const recoil = !settings.reducedMotion && w.fired < 0.12 ? Math.round((1 - w.fired / 0.12) * 2) : 0;
  const live = w.powered || (w.art ? usable(w.art) > 0 : false);
  if (img && meta) {
    const c = g.ctx;
    c.save();
    c.translate(Math.round(m.x * 2) / 2 - face * recoil, Math.round(m.y * 2) / 2);
    c.scale(face, m.belly ? -1 : 1);
    c.drawImage(img, -meta.pivot.x, -meta.pivot.y, meta.w, meta.h);
    c.restore();
    if (showCharge && live) for (const l of meta.lens) {
      const lx = m.x + face * (l.x - meta.pivot.x) - face * recoil;
      const ly = m.y + (m.belly ? -1 : 1) * (l.y - meta.pivot.y);
      glow(g, lx, ly, l.r + 1, w.def.color === "violet" ? P.violet1 : w.def.color === "amber" || w.def.color === "ember" ? P.amber2 : P.teal2, f * 0.8);
    }
    return;
  }
  // Procedural rail-clamp mount with a lamp-head barrel.
  const x = Math.round(m.x) - face * recoil;
  const y = Math.round(m.y);
  const s = m.belly ? -1 : 1;
  const heavy = w.def.power >= 3;
  const len = heavy ? 22 : 16;
  const col = w.def.type === "ion" ? P.violet3 : w.def.type === "beam" ? P.teal4 : w.def.type === "payload" ? P.steel0 : P.brass3;
  g.rect(x - 6, y - (s > 0 ? 3 : 0), 12, 3, P.ink0);
  g.rect(x - 5, y - (s > 0 ? 2 : -1), 10, 1, P.brass4);
  const by = y - s * 6 - (s > 0 ? 3 : 0);
  const bx = face > 0 ? x - 4 : x - len + 4;
  g.rect(bx, by, len, 6, P.ink0);
  g.rect(bx + 1, by + 1, len - 2, 4, col);
  g.hline(bx + 1, by + 1, len - 2, P.brass1);
  const tip = face > 0 ? bx + len - 3 : bx + 1;
  g.rect(tip, by + 1, 2, 4, P.ink1);
  if (showCharge && live) {
    const lc = w.def.color === "violet" ? P.violet1 : w.def.color === "amber" || w.def.color === "ember" ? P.amber2 : P.teal2;
    glow(g, tip + 1, by + 3, 3, lc, 0.15 + f * 0.75);
  }
}

/** World rectangle covered by a mounted weapon and its pylon (for hover tooltips), padded a little. */
export function weaponRect(w: SimShip["weapons"][number], m: MountPos, face: 1 | -1): [number, number, number, number] {
  const [x, y, bw, bh] = weaponBounds(w.def.sprite, m, face);
  let y0 = y, y1 = y + bh;
  if (m.plateY !== undefined) { y0 = Math.min(y0, m.plateY); y1 = Math.max(y1, m.plateY); }
  return [x - 2, y0 - 2, bw + 4, y1 - y0 + 4];
}

/** Corner brackets around a hovered hull mount. */
export function mountHighlight(g: Gfx, r: [number, number, number, number], color: string) {
  const [x, y, w, h] = r.map(Math.round);
  g.alpha(0.85, () => {
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]] as const) {
      g.rect(sx > 0 ? cx : cx - 4, cy, 4, 1, color);
      g.rect(cx, sy > 0 ? cy : cy - 4, 1, 4, color);
    }
  });
}

/** World rectangle of a flying drone (for hover tooltips). */
export function droneRect(d: SimShip["drones"][number], v: ShipView): [number, number, number, number] {
  const [x, y] = toScreen(v, d.x, d.y);
  const { meta } = droneArt(d.def.id);
  const w = meta?.w ?? 12, h = meta?.h ?? 8;
  return [x - w / 2 - 2, y - h / 2 - 3, w + 4, h + 6];
}

/** Muzzle point of a weapon on screen. */
export function muzzle(w: SimShip["weapons"][number], m: MountPos, face: 1 | -1): [number, number] {
  const { meta } = weaponArt(w.def.sprite);
  const recoil = !settings.reducedMotion && w.fired < .12 ? Math.round((1 - w.fired / .12) * 2) : 0;
  if (meta) return [m.x + face * (meta.muzzle.x - meta.pivot.x - recoil), m.y + (m.belly ? -1 : 1) * (meta.muzzle.y - meta.pivot.y)];
  const s = m.belly ? -1 : 1;
  const len = w.def.power >= 3 ? 22 : 16;
  return [m.x + face * (len - 4 - recoil), m.y - s * 6 - (s > 0 ? 0 : -3)];
}

/** Drones of `owner` flying in the space of ship `at` (drawn inside that ship's camera). */
export function drawDrones(g: Gfx, sim: Sim, owner: SimShip, views: [ShipView, ShipView], at: 0 | 1) {
  for (const d of owner.drones) {
    if (!d.out || d.at !== at || d.def.kind === "boarding") continue;
    const v = views[d.at];
    const [sx, sy] = toScreen(v, d.x, d.y);
    const x = Math.round(sx);
    const y = Math.round(sy + Math.sin(sim.t * 2.3 + d.slot) * 1.5);
    const { img, meta } = droneArt(d.def.id);
    const face = owner.side === 0 ? 1 : -1;
    if (img && meta) {
      const c = g.ctx;
      c.save();
      c.translate(x, y);
      c.scale(face, 1);
      c.drawImage(img, -Math.round(meta.w / 2), -Math.round(meta.h / 2), meta.w, meta.h);
      c.restore();
      for (const r of meta.rotors) g.alpha(0.35 + 0.2 * Math.sin(sim.t * 40 + r.x), () => g.hline(x + face * (r.x - meta.w / 2) - r.w / 2, y + r.y - meta.h / 2, r.w, P.steel3));
      continue;
    }
    const col = d.def.kind === "defence" ? P.teal2 : d.def.kind === "combat" ? P.amber2 : d.def.kind === "anti" ? P.ember1 : P.verd1;
    g.rect(x - 5, y - 3, 10, 6, P.ink0);
    g.rect(x - 4, y - 2, 8, 4, owner.side === 0 ? P.ivory3 : P.steel0);
    g.rect(x + face * 2, y - 1, 2, 2, col);
    g.alpha(0.5, () => g.hline(x - 7, y - 5, 14, P.steel2));
    if (d.def.kind === "defence") g.alpha(0.3 + 0.15 * Math.sin(sim.t * 6), () => g.circle(x, y, 7, P.teal2));
  }
}

// ─── ward mesh (shields) ────────────────────────────────────────────────────────────────────────────────────

export function drawWardMesh(g: Gfx, sim: Sim, ship: SimShip, v: ShipView, _hitFlash: number, _extra: { gate?: boolean; glass?: boolean }) {
  drawWardSurface(g, sim, ship, v);
}

export function droneOrbit(ship: SimShip, d: SimShip["drones"][number], t: number): [number, number] {
  return orbit(ship, d, t);
}
