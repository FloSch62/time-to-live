// The ward mesh as it is drawn (lore §2): a lattice of charged ward-wire around the car, one concentric shell per
// layer, grounded to the carrier through the drive trolley. Each shell is a pixel-crisp band (faint fill, diamond
// ward-wire with brighter nodes, a lit rim) rendered once from the envelope's distance field and cached; per frame
// it only shimmers, ripples where a bolt lands, breaks up when a layer is lost and is redrawn by a sweep while it
// recharges. Installed-but-dead layers (unpowered, damaged, ion-locked) stay visible as inert dotted wire; a tender
// without a Shield Array shows nothing. Guardian barriers (the Regent's gate, the Choir's glass) keep their own look.
import type { Gfx } from "../core/gfx.ts";
import { P, hexToRgb } from "../core/palette.ts";
import { settings } from "../core/save.ts";
import { markHD } from "../core/assets.ts";
import type { Sim } from "./sim/sim.ts";
import type { SimShip } from "./sim/model.ts";
import type { ShipView } from "./view.ts";
import { wardOutline, wardLocal, wardContact, type Point } from "./shield-geometry.ts";
import { shieldState } from "./sim/shield-state.ts";

type Impact = { x: number; y: number; at: number; ion: boolean };
type Surface = { charged: number; lost: { layer: number; at: number } | null; gained: { layer: number; at: number } | null; impacts: Impact[] };
const surfaces = new WeakMap<ShipView, Surface>();

function surface(v: ShipView, ship: SimShip, t: number): Surface {
  let s = surfaces.get(v);
  if (!s) { s = { charged: ship.shields, lost: null, gained: null, impacts: [] }; surfaces.set(v, s); }
  if (s.charged !== ship.shields) {
    if (ship.shields < s.charged) s.lost = { layer: ship.shields, at: t };
    else s.gained = { layer: ship.shields - 1, at: t };
    s.charged = ship.shields;
  }
  s.impacts = s.impacts.filter((i) => t - i.at < 0.8 && t >= i.at);
  return s;
}

export function disturbWard(v: ShipView, ship: SimShip, t: number, x: number, y: number, ion = false) {
  surface(v, ship, t).impacts.push({ x: x - v.dx, y: y - v.dy, at: t, ion });
}

/** The shell a projectile meets: the outermost charged ward layer, or a guardian barrier outside it. */
export function contactLayer(ship: SimShip): number {
  const st = shieldState(ship);
  if (ship.boss.gate?.up || ship.boss.glass?.up) return Math.max(st.charged, st.installed);
  return Math.max(0, st.charged - 1);
}

// ─── cached shell bands ──────────────────────────────────────────────────────────────────────────────────────

/** How a shell is painted: the outermost live shell gets the full field (rim, dithered inner fade, ward-wire),
 *  inner live shells a thin rim, dead layers a dotted rim, and `flare` is the ward-wire at full light (hits, sweep). */
type Style = "outer" | "rim" | "dead" | "flare";
type Hue = "ward" | "seal" | "gate" | "glass";
interface Band { img: HTMLCanvasElement; x: number; y: number; w: number; h: number }
interface DistBand { x0: number; y0: number; W: number; H: number; d: Float32Array }
const dists = new WeakMap<object, Map<number, DistBand | null>>();
const bands = new WeakMap<object, Map<string, Band | null>>();
const BAND = 12;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const HUES: Record<Hue, { rim: string; hot: string; wire: string; dim: string }> = {
  ward: { rim: P.teal2, hot: P.teal0, wire: P.teal1, dim: P.teal3 },
  seal: { rim: P.ember2, hot: P.ember0, wire: P.ember1, dim: P.ember3 },
  gate: { rim: P.brass2, hot: P.brass0, wire: P.brass1, dim: P.brass3 },
  glass: { rim: P.violet1, hot: P.violet0, wire: P.violet0, dim: P.violet2 },
};

/** Inward distance from shell `layer`'s edge for every HD pixel within BAND of it (Infinity elsewhere, negative
 *  just outside). Built once per shell from its polygon. */
function distBand(v: ShipView, layer: number): DistBand | null {
  const { pts, field } = wardLocal(v, layer);
  if (!field || pts.length < 3) return null;
  let m = dists.get(field);
  if (!m) { m = new Map(); dists.set(field, m); }
  if (m.has(layer)) return m.get(layer) ?? null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i], [nx, ny] = pts[(i + 1) % pts.length];
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    area += x * ny - nx * y;
  }
  x0 = Math.floor(x0) - 2; y0 = Math.floor(y0) - 2; x1 = Math.ceil(x1) + 2; y1 = Math.ceil(y1) + 2;
  const W = (x1 - x0) * 2, H = (y1 - y0) * 2;
  const d = new Float32Array(W * H).fill(Infinity);
  const sign = area > 0 ? 1 : -1;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    const sx = bx - ax, sy = by - ay, L2 = sx * sx + sy * sy || 1;
    const X0 = Math.max(0, Math.floor((Math.min(ax, bx) - BAND - x0) * 2)), X1 = Math.min(W - 1, Math.ceil((Math.max(ax, bx) + BAND - x0) * 2));
    const Y0 = Math.max(0, Math.floor((Math.min(ay, by) - BAND - y0) * 2)), Y1 = Math.min(H - 1, Math.ceil((Math.max(ay, by) + BAND - y0) * 2));
    for (let Y = Y0; Y <= Y1; Y++) {
      const py = y0 + (Y + 0.5) / 2;
      for (let X = X0; X <= X1; X++) {
        const px = x0 + (X + 0.5) / 2;
        const t = Math.max(0, Math.min(1, ((px - ax) * sx + (py - ay) * sy) / L2));
        const dist = Math.hypot(px - ax - sx * t, py - ay - sy * t);
        const k = Y * W + X;
        if (dist < Math.abs(d[k])) d[k] = (sx * (py - ay) - sy * (px - ax)) * sign >= 0 ? dist : -dist;
      }
    }
  }
  const out = { x0, y0, W, H, d };
  m.set(layer, out);
  return out;
}

/** Paint one shell into a cached HD canvas: light only (no dark pixels), world-aligned ward-wire. */
function band(v: ShipView, layer: number, style: Style, hue: Hue): Band | null {
  const db = distBand(v, layer);
  const { field } = wardLocal(v, layer);
  if (!db || !field || typeof document === "undefined") return null;
  let m = bands.get(field);
  if (!m) { m = new Map(); bands.set(field, m); }
  const key = `${layer}|${style}|${hue}`;
  if (m.has(key)) return m.get(key) ?? null;
  const { x0, y0, W, H, d } = db;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  if (!ctx) { m.set(key, null); return null; }
  const img = ctx.createImageData(W, H);
  const px = img.data;
  const H4 = HUES[hue];
  const cols = { rim: hexToRgb(H4.rim), hot: hexToRgb(H4.hot), wire: hexToRgb(H4.wire), dim: hexToRgb(H4.dim) };
  const put = (k: number, c: [number, number, number], a: number) => {
    const o = k * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = Math.round(Math.min(1, a) * 255);
  };
  const cell = hue === "gate" ? 12 : hue === "glass" ? 10 : 14;
  for (let Y = 0; Y < H; Y++) {
    for (let X = 0; X < W; X++) {
      const k = Y * W + X;
      const dist = d[k];
      if (!(dist >= 0) || dist > BAND) continue;
      const gx = Math.round((x0 + (X + 0.5) / 2) * 2), gy = Math.round((y0 + (Y + 0.5) / 2) * 2);
      let wire: boolean, node: boolean;
      if (hue === "gate") {
        const a = ((gx % cell) + cell) % cell, b = ((gy % cell) + cell) % cell;
        wire = a === 0 || b === 0; node = a === 0 && b === 0;
      } else {
        const a = (((gx + gy) % cell) + cell) % cell, b = (((gx - gy) % cell) + cell) % cell;
        wire = a === 0 || b === 0; node = a === 0 && b === 0;
      }
      if (style === "dead") {
        if (dist < 0.5 && ((gx + gy) & 7) < 3) put(k, cols.dim, 0.75);
        continue;
      }
      if (style === "rim") {
        if (dist < 0.5) put(k, cols.wire, 0.8);
        else if (dist < 1) put(k, cols.rim, 0.3);
        continue;
      }
      if (style === "flare") {
        if (dist < 1) put(k, cols.hot, 1);
        else if (node) put(k, cols.hot, 1);
        else if (wire) put(k, cols.wire, 0.9 * (1 - dist / BAND) + 0.1);
        continue;
      }
      // Outer shell: a two-pixel lit rim, then light that fades inward in ordered-dither steps, and faint
      // ward-wire that shows mostly near the rim (glancing view through the field).
      if (dist < 0.5) { put(k, cols.rim, 0.95); continue; }
      if (dist < 1) { put(k, cols.hot, 0.75); continue; }
      const f = Math.max(0, 1 - (dist - 1) / 7);
      if (node && dist < 7) { put(k, cols.hot, 0.35 + 0.5 * f); continue; }
      if (wire && dist < 10) { put(k, cols.wire, 0.1 + 0.32 * Math.max(0, 1 - (dist - 1) / 9)); continue; }
      if (f > 0 && BAYER[(Y & 3) * 4 + (X & 3)] / 16 < f * f * 0.6) put(k, cols.wire, 0.16);
    }
  }
  ctx.putImageData(img, 0, 0);
  markHD(cv, 2);
  const b = { img: cv, x: x0, y: y0, w: W / 2, h: H / 2 };
  m.set(key, b);
  return b;
}

// ─── drawing ─────────────────────────────────────────────────────────────────────────────────────────────────

function drawBand(g: Gfx, b: Band, v: ShipView, alpha: number, clip?: (c: CanvasRenderingContext2D) => void, lighter = false) {
  const c = g.ctx;
  c.save();
  if (clip) { c.beginPath(); clip(c); c.clip(); }
  c.globalAlpha *= Math.max(0, Math.min(1, alpha));
  if (lighter) c.globalCompositeOperation = "lighter";
  c.drawImage(b.img, Math.round((b.x + v.dx) * 2) / 2, Math.round((b.y + v.dy) * 2) / 2, b.w, b.h);
  c.restore();
}

/** The faint tint of the field inside the outer shell (the hull stays fully readable through it). */
function tint(g: Gfx, pts: Point[], color: string, a: number) {
  if (pts.length < 3) return;
  const c = g.ctx;
  c.save();
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.globalAlpha *= a;
  c.fillStyle = color;
  c.fill();
  c.restore();
}

function insidePoly(p: Point[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) inside = !inside;
  }
  return inside;
}

/** Grounding leads: ward-wire from the top of the outer shell up the grip arms to the carrier. */
function drawGround(g: Gfx, v: ShipView, outline: Point[], color: string, a: number, t: number) {
  for (const car of v.cars) {
    const grip = car.meta.cable;
    if (!grip) continue;
    const gx = car.x + grip.x + v.dx, gy = car.y + grip.y + v.dy;
    for (const off of car.slot === "lead" || car.slot === "enemy" ? [-12, 12] : [0]) {
      const x = Math.round(gx + off);
      if (insidePoly(outline, x, gy + 7)) continue;
      const hit = wardContact(outline, [x, gy + 7], [x, gy + 400]);
      if (hit[1] >= gy + 399) continue;
      const y0 = Math.round(gy + 7), y1 = Math.round(hit[1]);
      g.alpha(a * 0.5, () => g.rect(x, y0, 1, y1 - y0, color));
      if (!settings.reducedMotion) {
        const f = (t * 0.7 + (off > 0 ? 0.5 : 0)) % 1;
        g.alpha(a, () => g.rect(x - 0.5, Math.round(y1 - (y1 - y0) * f), 2, 2, P.teal0));
      }
      g.alpha(a, () => { g.rect(x - 1, y1 - 1, 3, 2, color); g.rect(x - 1, y0 - 1, 3, 2, color); });
    }
  }
}

export function drawWardSurface(g: Gfx, sim: Sim, ship: SimShip, v: ShipView) {
  const state = shieldState(ship);
  const gate = !!ship.boss.gate?.up, glass = !!ship.boss.glass?.up;
  if (!ship.sys.shields && !ship.bonusLayers && !gate && !glass) return;
  const s = surface(v, ship, sim.t);
  const t = settings.reducedMotion ? 0 : sim.t;
  const hue: Hue = ship.bonusLayers > 0 && ship.side === 1 ? "seal" : "ward";
  const layers = Math.min(4, Math.max(state.installed, state.charged));
  const sys = ship.sys.shields;
  const outer = state.charged > 0 ? Math.min(layers, state.charged) - 1 : -1;
  const barrier = gate || glass ? Math.max(outer + 1, state.installed) : -1;
  const barrierHue: Hue = gate ? "gate" : "glass";
  // The outermost live field: faint tint inside it, the full shell on its edge.
  const top = barrier >= 0 ? barrier : outer;
  if (top >= 0) {
    const hueTop = barrier >= 0 ? barrierHue : hue;
    tint(g, wardOutline(v, top), HUES[hueTop].wire, 0.07);
  }
  for (let k = 0; k < layers; k++) {
    if (k < state.charged) {
      const full = k === outer && barrier < 0;
      const b = band(v, k, full ? "outer" : "rim", hue);
      if (!b) continue;
      const gained = s.gained && s.gained.layer === k ? Math.min(1, (sim.t - s.gained.at) / 0.6) : 1;
      drawBand(g, b, v, (0.88 + 0.12 * Math.sin(t * 1.3 + k * 1.7)) * (0.5 + 0.5 * gained));
      // A slow light travels along the wire.
      if (full && !settings.reducedMotion) {
        const f = band(v, k, "flare", hue);
        if (f) {
          const span = f.w + 80, sx = f.x + v.dx - 40 + ((t * 38 + k * 97) % span);
          drawBand(g, f, v, 0.35, (c) => { c.moveTo(sx, f.y + v.dy); c.lineTo(sx + 18, f.y + v.dy); c.lineTo(sx - 2, f.y + v.dy + f.h); c.lineTo(sx - 20, f.y + v.dy + f.h); c.closePath(); }, true);
        }
      }
    } else if (k === state.charged && k < state.available) {
      // Recharging: the dead wire is redrawn by a bright sweep from the stern toward the nose.
      const dead = band(v, k, "dead", hue);
      if (dead) drawBand(g, dead, v, 0.8);
      const b = band(v, k, "rim", hue), f = band(v, k, "flare", hue);
      if (!b || !f) continue;
      const p = state.progress;
      const face = ship.side === 0 ? 1 : -1;
      const edge = face > 0 ? b.x + v.dx + b.w * p : b.x + v.dx + b.w * (1 - p);
      drawBand(g, b, v, 0.9, (c) => face > 0 ? c.rect(b.x + v.dx, b.y + v.dy, b.w * p, b.h) : c.rect(edge, b.y + v.dy, b.w * p, b.h));
      drawBand(g, f, v, 0.9, (c) => c.rect(edge - 3, f.y + v.dy, 6, f.h), true);
    } else {
      // Installed but dead: inert dotted wire; grey unpowered, red damaged, violet flicker ion-locked.
      const deadHue: Hue = (sys?.ion ?? 0) > 0 ? "glass" : (sys?.damage ?? 0) > 0 ? "seal" : "ward";
      const dead = band(v, k, "dead", deadHue);
      if (!dead) continue;
      const flicker = (sys?.ion ?? 0) > 0 && !settings.reducedMotion ? 0.5 + 0.5 * Math.abs(Math.sin(t * 7 + k)) : 1;
      drawBand(g, dead, v, (deadHue === "ward" ? 0.45 : 0.7) * flicker);
    }
  }
  // Collapse: the lost layer's wire breaks into strips that slide apart and go out, with sparks along it.
  if (s.lost && sim.t - s.lost.at < 0.6) {
    const b = band(v, s.lost.layer, "flare", hue);
    const age = (sim.t - s.lost.at) / 0.6;
    if (b) {
      const strips = Math.ceil(b.h / 6);
      for (let i = 0; i < strips; i++) {
        const jitter = settings.reducedMotion ? 0 : Math.round((((i * 7919) % 13) - 6) * age * 3);
        const y = b.y + v.dy + i * 6;
        const c = g.ctx;
        c.save();
        c.beginPath(); c.rect(b.x + v.dx - 20, y, b.w + 40, 6); c.clip();
        c.globalAlpha *= (1 - age) * (i % 3 === 0 ? 0.4 : 0.8);
        c.drawImage(b.img, Math.round((b.x + v.dx + jitter) * 2) / 2, Math.round((b.y + v.dy) * 2) / 2, b.w, b.h);
        c.restore();
      }
      const pts = wardOutline(v, s.lost.layer);
      for (let i = 0; i < pts.length; i += 9) {
        const [x, y] = pts[i];
        const fall = settings.reducedMotion ? 0 : age * age * 14;
        g.alpha(1 - age, () => g.rect(Math.round(x), Math.round(y + fall), 1, 1, i % 2 ? P.teal0 : P.amber1));
      }
    }
  } else if (s.lost) s.lost = null;
  // Guardian barriers: their own outer field, in their own hue and weave, with the gate leaves or glass panes.
  if (barrier >= 0) {
    const b = band(v, barrier, "outer", barrierHue);
    if (b) drawBand(g, b, v, 0.85 + 0.15 * Math.sin(t * 1.1));
    const f = band(v, barrier, "flare", barrierHue);
    if (f && !settings.reducedMotion) {
      const span = f.w + 80, sx = f.x + v.dx - 40 + ((t * 30) % span);
      drawBand(g, f, v, 0.3, (c) => { c.moveTo(sx, f.y + v.dy); c.lineTo(sx + 22, f.y + v.dy); c.lineTo(sx + 2, f.y + v.dy + f.h); c.lineTo(sx - 20, f.y + v.dy + f.h); c.closePath(); }, true);
    }
    barrierFittings(g, sim, ship, wardOutline(v, barrier), gate);
  }
  // Impacts: the ward-wire flares in an expanding ring around the contact point, with a few sparks.
  const hitLayer = barrier >= 0 ? barrier : Math.max(0, outer, state.charged - 1);
  for (const im of s.impacts) {
    const age = sim.t - im.at, fade = Math.max(0, 1 - age / 0.8);
    const hHue: Hue = im.ion ? "glass" : barrier >= 0 ? barrierHue : hue;
    const f = band(v, hitLayer, "flare", hHue) ?? band(v, 0, "flare", hHue);
    const x = im.x + v.dx, y = im.y + v.dy;
    const r0 = settings.reducedMotion ? 10 : 4 + age * 70;
    if (f) {
      drawBand(g, f, v, fade, (c) => { c.arc(x, y, r0 + 9, 0, Math.PI * 2); c.arc(x, y, Math.max(0, r0 - 3), 0, Math.PI * 2, true); }, true);
      drawBand(g, f, v, fade, (c) => c.arc(x, y, 10, 0, Math.PI * 2), true);
    }
    if (!settings.reducedMotion) for (let i = 0; i < 6; i++) {
      const a = i * 1.047 + im.at * 3, dd = 3 + age * 26;
      g.alpha(fade, () => g.rect(Math.round(x + Math.cos(a) * dd), Math.round(y + Math.sin(a) * dd * 0.6 + age * age * 10), 1, 1, i % 2 ? P.ivory0 : HUES[hHue].wire));
    }
  }
  if (outer >= 0 && (ship.side === 0 || ship.mobility === "crawler")) drawGround(g, v, wardOutline(v, outer), HUES[hue].wire, 0.8, t);
}

/** The Regent's two gate leaves and the Choir's refracting panes, on the barrier's forward face. */
function barrierFittings(g: Gfx, sim: Sim, ship: SimShip, points: Point[], gate: boolean) {
  if (points.length < 3) return;
  const c = g.ctx;
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const left = Math.min(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const h = bottom - top, cy = (top + bottom) / 2;
  const stroke = (col: string, width: number, alpha: number) => { c.strokeStyle = col; c.lineWidth = width; c.globalAlpha = alpha; c.stroke(); };
  c.save(); c.lineJoin = "round"; c.lineCap = "round";
  if (gate) {
    const locks = new Set(ship.boss.gate!.locks.filter((l) => sim.t - l.t <= 2.2).map((l) => l.source)).size;
    for (let half = 0; half < 2; half++) {
      const y0 = cy + (half ? 7 : -7), y1 = half ? bottom - h * 0.14 : top + h * 0.14;
      const edge = Math.min(...points.filter((p) => Math.abs(p[1] - y0) < 3).map((p) => p[0]), left + 4);
      c.beginPath(); c.moveTo(edge + 24, y1); c.bezierCurveTo(edge - 4, y1, edge - 4, y0, edge + 9, y0);
      stroke(P.brass3, 5, 0.9); stroke(half < locks ? P.amber0 : P.brass1, 2, 0.95);
      g.rect(Math.round(edge + 5), Math.round(y0 - 3), 7, 6, P.ink0); g.rect(Math.round(edge + 7), Math.round(y0 - 2), 3, 4, half < locks ? P.amber0 : P.brass3);
    }
  } else {
    const channel = ship.boss.glass!.channel / 12;
    for (let i = 0; i < 3; i++) {
      const y = top + h * (0.2 + i * 0.3);
      const edge = Math.min(...points.filter((p) => Math.abs(p[1] - y) < 3).map((p) => p[0]), left + 6);
      const x = edge + 2 + Math.abs(i - 1) * 8;
      c.beginPath(); c.moveTo(x + 12, y - h * 0.1); c.lineTo(x - 4, y); c.lineTo(x + 12, y + h * 0.1);
      stroke(P.violet1, 3, 0.2); stroke(channel > i / 3 ? P.ivory0 : P.violet1, 1, 0.85);
    }
  }
  c.restore();
}
