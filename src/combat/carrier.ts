// The carrier: one renderer for every view where a tender or a crawler hangs (relay, combat, yard, new voyage,
// store and overflow previews, refit receipts, title and script scenes).
//
// Lore §2: heavy braided cables slung between spire tops. Copper Reach carriers are verdigris-crusted copper; in the
// Glass Cathedral they are partly glass-sheathed optical trunks (violet sheath, teal core); in the Blackout Heart they
// are soot-dark with ember glints. The braid is the sprites workstream's `cable-carrier` tile (fx atlas, 32×12 atlas
// px at 2× density), recoloured per region and blitted one backing-pixel column at a time along the sag, so the twist
// stays continuous and every pixel is crisp at the vessel sprites' density (the carrier passes through the drive
// trolley, so it shares the hull's pixel grid; painted background carriers sit on the coarser art grid behind it).
import type { Gfx } from "../core/gfx";
import { P, hexToRgb } from "../core/palette";
import { atlas, atlasScale, density, markHD } from "../core/assets";
export { carrierThrough, carrierSag } from "./carrier-line.ts";

/** Carrier thickness in layout units at zoom 1 (the tile's 12 backing pixels). Sheave grooves are sized to this. */
export const CARRIER_THICKNESS = 6;
/** Braid repeat along the carrier, layout units. */
export const CARRIER_PERIOD = 16;

export type CarrierRegion = 1 | 2 | 3 | null;

/** Source ramps in the tile (verdigris braid, copper core) and each region's replacement, dark to light. */
const SRC_BRAID = ["#1b3b38", "#234c45", "#2a5c52", "#357363", "#3f8a74", "#57a087", "#6fb59a", "#7fc6a8"];
const SRC_CORE = ["#6a2d20", "#813925", "#97452a"];
const RAMPS: Record<string, { braid: string[]; core: string[]; edge?: [string, string] }> = {
  // Copper Reach: the tile as painted.
  copper: { braid: SRC_BRAID, core: SRC_CORE },
  // Glass Cathedral: violet glass sheath over an optical trunk; the worn strands show a teal core.
  glass: { braid: ["#2c2159", "#3a2d73", "#4f3a8f", "#664bac", "#7d5bc9", "#9874dd", "#b28cf0", "#c9aaf8"], core: [P.teal4, P.teal3, P.teal2] },
  // Blackout Heart: soot-dark steel with ember glints.
  heart: { braid: ["#0c0f1c", "#131a2b", "#1c2640", "#222e4b", "#283556", "#3a4a70", "#4a5068", "#5b6077"], core: [P.ember4, P.ember3, P.ember2] },
  // Neutral fallback (no region known): dark steel, brass-worn core.
  neutral: { braid: ["#1c2640", "#283556", "#3a4a70", "#4a5068", "#5b6077", "#6b7086", "#7e8397", "#9096a8"], core: [P.brass5, P.brass4, P.brass3] },
};

function regionKey(region: CarrierRegion): string {
  return region === 1 ? "copper" : region === 2 ? "glass" : region === 3 ? "heart" : "neutral";
}

interface Tile { img: HTMLCanvasElement; w: number; h: number; ay: number; d: number }
const tiles = new Map<string, Tile | null>();

/** The braid tile recoloured for a region (backing pixels), built once from the fx atlas. */
function tile(region: CarrierRegion): Tile | null {
  const key = regionKey(region);
  const hit = tiles.get(key);
  if (hit !== undefined) return hit;
  const a = atlas("fx");
  const f = a?.frames["cable-carrier"];
  if (!a || !f || typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = f.w;
  cv.height = f.h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(a.image, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  const r = RAMPS[key];
  if (key !== "copper") {
    const map = new Map<number, [number, number, number]>();
    const add = (from: string, to: string) => map.set(parseInt(from.slice(1), 16), hexToRgb(to));
    SRC_BRAID.forEach((c, i) => add(c, r.braid[i]));
    SRC_CORE.forEach((c, i) => add(c, r.core[i]));
    const img = ctx.getImageData(0, 0, f.w, f.h);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      const to = map.get((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
      if (to) { px[i] = to[0]; px[i + 1] = to[1]; px[i + 2] = to[2]; }
    }
    ctx.putImageData(img, 0, 0);
  }
  const d = density(a.image) > 1 ? density(a.image) : atlasScale(a);
  markHD(cv, d);
  const t = { img: cv, w: f.w, h: f.h, ay: f.ay, d };
  tiles.set(key, t);
  return t;
}

const spans = new Map<string, { img: HTMLCanvasElement; x: number; y: number; w: number; h: number }>();

/**
 * Draw a carrier span from x0 to x1 (layout units, current transform) whose centre line is `yAt(x)`.
 * `phase` shifts the braid along the cable (layout units) so a car running along it can make the braid travel.
 * With a `key` naming the span's geometry, the span is rendered once into an offscreen strip and reused (a braid is
 * a thousand one-pixel column blits; the key must change whenever the curve does).
 */
export function drawCarrier(g: Gfx, yAt: (x: number) => number, x0: number, x1: number, region: CarrierRegion, phase = 0, key?: string) {
  const t = tile(region);
  if (key && t && typeof document !== "undefined") {
    const k = `${regionKey(region)}|${phase}|${x0}|${x1}|${key}`;
    let span = spans.get(k);
    if (!span) {
      let top = Infinity, bottom = -Infinity;
      for (let x = x0; x <= x1; x += 4) { const y = yAt(x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
      top = Math.floor(top - CARRIER_THICKNESS), bottom = Math.ceil(bottom + CARRIER_THICKNESS);
      const w = Math.ceil(x1 - x0) + 1, h = bottom - top;
      const cv = document.createElement("canvas");
      cv.width = w * t.d;
      cv.height = h * t.d;
      const cg = new (g.constructor as new (c: CanvasRenderingContext2D) => Gfx)(cv.getContext("2d")!);
      cg.ctx.scale(t.d, t.d);
      cg.ctx.translate(-x0, -top);
      drawCarrier(cg, yAt, x0, x1, region, phase);
      markHD(cv, t.d);
      if (spans.size > 24) spans.clear();
      span = { img: cv, x: x0, y: top, w, h };
      spans.set(k, span);
    }
    const c = g.ctx;
    const smooth = c.imageSmoothingEnabled;
    c.imageSmoothingEnabled = false;
    c.drawImage(span.img, span.x, span.y, span.w, span.h);
    c.imageSmoothingEnabled = smooth;
    return;
  }
  drawSpan(g, yAt, x0, x1, region, phase);
}

function drawSpan(g: Gfx, yAt: (x: number) => number, x0: number, x1: number, region: CarrierRegion, phase: number) {
  const t = tile(region);
  const c = g.ctx;
  if (!t) {
    // Before the fx atlas has loaded: a plain dark rope of the same thickness.
    for (let x = Math.floor(x0); x < x1; x++) {
      const y = Math.round(yAt(x));
      g.rect(x, y - CARRIER_THICKNESS / 2, 1, CARRIER_THICKNESS, P.ink0);
      g.rect(x, y - CARRIER_THICKNESS / 2 + 1, 1, CARRIER_THICKNESS - 2, region === 2 ? P.violet3 : region === 3 ? P.ink4 : P.verd3);
    }
    return;
  }
  // Only the columns that can reach the canvas (the span may run far past a clipped preview).
  const m = c.getTransform();
  if (m.b === 0 && m.c === 0 && m.a > 0) {
    x0 = Math.max(x0, (0 - m.e) / m.a - 2);
    x1 = Math.min(x1, (c.canvas.width - m.e) / m.a + 2);
  }
  const d = t.d;
  const step = 1 / d;
  const X0 = Math.floor(x0 * d), X1 = Math.ceil(x1 * d);
  const shift = Math.round(phase * d);
  const hy = t.ay / d;
  const hh = t.h / d;
  const smooth = c.imageSmoothingEnabled;
  c.imageSmoothingEnabled = false;
  for (let X = X0; X < X1; X++) {
    const x = X / d;
    const y = Math.round(yAt(x + step / 2) * d) / d;
    const col = (((X - shift) % t.w) + t.w) % t.w;
    c.drawImage(t.img, col, 0, 1, t.h, x, y - hy, step, hh);
  }
  c.imageSmoothingEnabled = smooth;
}
