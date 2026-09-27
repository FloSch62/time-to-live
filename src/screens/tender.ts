// The Lamplighter in side view, hanging from its drive trolley on a carrier (contract ★ v2). Uses the combat
// workstream's drawShipPreview or the hull art when present; otherwise a code-drawn cable car.
import type { Gfx } from "../core/gfx";
import { art, getJson, layoutSize, loadJson, markHD } from "../core/assets";
import { P, hexToRgb } from "../core/palette";
import type { ShipState } from "../game/types";
import { combatApi, previewGrip } from "../campaign/combat-adapter";
import { cable, cachedLayer, dot, glowHD } from "./kit";

interface ShipsMeta {
  [id: string]: { w?: number; h?: number; grid?: { x: number; y: number }; cable?: { x: number; y: number }; glow?: { x: number; y: number; r?: number }[] };
}

void loadJson<ShipsMeta>("art/ships/ships.json");

function shipsMeta(): ShipsMeta | null {
  return getJson<ShipsMeta>("art/ships/ships.json");
}

// ─── code-drawn fallback ──────────────────────────────────────────────────────────────────────────────────

const LAMP: Record<string, string> = { amber: P.amber1, teal: P.teal1, violet: P.violet1, ember: P.ember1, ivory: P.ivory0 };
const FW = 300;
const FH = 118;
/** Grip point (where the trolley wheels ride the carrier) in the fallback image. */
const GRIP = { x: 150, y: 6 };
const fallbackCanvas = new Map<string, HTMLCanvasElement>();

function shade(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const h = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${h(A[0] + (B[0] - A[0]) * t)}${h(A[1] + (B[1] - A[1]) * t)}${h(A[2] + (B[2] - A[2]) * t)}`;
}

/** The Lamplighter drawn in code at HD density (2 px per layout unit): a riveted brass-and-ivory cable car. */
function paintFallback(lampCol: string): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = FW * 2;
  cv.height = FH * 2;
  const c = cv.getContext("2d")!;
  const r = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const G = { x: GRIP.x * 2, y: GRIP.y * 2 };
  const bx = 48;
  const by = 76;
  const bw = 492;
  const bh = 100;
  // ── drive trolley: iron carriage, two grooved wheels on the carrier, grip arms ──
  r(G.x - 62, G.y + 12, 124, 18, P.ink0);
  r(G.x - 60, G.y + 14, 120, 14, P.ink3);
  r(G.x - 60, G.y + 14, 120, 2, P.steel0);
  r(G.x - 60, G.y + 26, 120, 2, P.ink2);
  for (let k = G.x - 56; k < G.x + 58; k += 8) r(k, G.y + 20, 2, 2, P.ink2);
  for (const wx of [G.x - 44, G.x + 26]) {
    r(wx - 2, G.y - 4, 22, 22, P.ink0);
    r(wx, G.y - 2, 18, 18, P.steel0);
    r(wx + 2, G.y, 14, 14, P.ink3);
    r(wx + 6, G.y + 4, 6, 6, P.steel1);
    r(wx + 8, G.y + 6, 2, 2, P.steel3);
    r(wx, G.y + 6, 18, 2, P.ink2);
    r(wx + 8, G.y - 2, 2, 18, P.ink2);
  }
  for (const ax of [G.x - 44, G.x + 36]) {
    r(ax, G.y + 30, 8, by - G.y - 30, P.ink0);
    r(ax + 2, G.y + 30, 4, by - G.y - 30, P.brass4);
    r(ax + 2, G.y + 30, 1, by - G.y - 30, P.brass3);
  }
  r(G.x - 6, G.y + 30, 12, by - G.y - 30, P.ink0);
  r(G.x - 4, G.y + 30, 8, by - G.y - 30, P.ink3);
  // ── roof: conduit and tool mounts ──
  r(bx + 40, by - 6, bw - 80, 6, P.ink2);
  r(bx + 40, by - 6, bw - 80, 1, P.ink4);
  for (const hx of [bx + 140, bx + 352]) {
    r(hx - 2, by - 18, 40, 18, P.ink0);
    r(hx, by - 16, 36, 14, P.ink3);
    r(hx, by - 16, 36, 2, P.steel0);
    r(hx + 28, by - 22, 28, 8, P.ink0);
    r(hx + 28, by - 20, 26, 4, P.steel0);
    r(hx + 28, by - 20, 26, 1, P.steel1);
  }
  // ── body: long chamfered car ──
  const body = (x: number, y: number, w: number, h: number, col: string, ch = 8) => {
    r(x + ch, y, w - ch * 2, h, col);
    for (let k = 0; k < ch; k++) {
      r(x + k, y + ch - k, 1, h - (ch - k) * 2, col);
      r(x + w - 1 - k, y + ch - k, 1, h - (ch - k) * 2, col);
    }
  };
  body(bx - 2, by - 2, bw + 4, bh + 4, P.ink0);
  body(bx, by, bw, bh, P.ivory4);
  // upper ivory plating with a soft vertical ramp
  const up = [P.ivory2, shade(P.ivory2, P.ivory3, 0.5), P.ivory3, P.ivory3, shade(P.ivory3, P.ivory4, 0.4)];
  for (let i = 0; i < 26; i++) r(bx + 8, by + 2 + i, bw - 16, 1, up[Math.min(up.length - 1, Math.floor(i / 6))]);
  r(bx + 8, by + 2, bw - 16, 1, P.ivory1);
  // brass belt
  r(bx + 4, by + 28, bw - 8, 5, P.brass3);
  r(bx + 4, by + 28, bw - 8, 1, P.brass1);
  r(bx + 4, by + 32, bw - 8, 1, P.brass5);
  // window band
  r(bx + 4, by + 33, bw - 8, 34, shade(P.ivory4, P.brass5, 0.3));
  // lower brass/iron skirt
  for (let i = 0; i < 30; i++) r(bx + 6, by + 67 + i, bw - 12, 1, shade(P.brass5, P.ink2, i / 30));
  r(bx + 6, by + 67, bw - 12, 1, P.brass4);
  // plate seams and rivet rows
  for (let x = bx + 52; x < bx + bw - 40; x += 64) {
    r(x, by + 3, 1, bh - 6, shade(P.ivory4, P.ink2, 0.5));
    r(x + 1, by + 3, 1, bh - 6, P.ivory3);
    for (let y = by + 6; y < by + bh - 6; y += 7) r(x + 4, y, 1, 1, P.brass4);
  }
  for (let x = bx + 12; x < bx + bw - 12; x += 6) {
    r(x, by + 8, 1, 1, shade(P.ivory4, P.ink2, 0.3));
    r(x + 3, by + 72, 1, 1, P.brass4);
    r(x, by + 92, 1, 1, P.ink2);
  }
  // windows: deep-set, framed, a few dimly lit
  for (let i = 0; i < 8; i++) {
    const wx = bx + 76 + i * 42;
    const lit = i === 3 || i === 5;
    r(wx - 2, by + 36, 22, 24, P.ink0);
    r(wx, by + 38, 18, 20, P.brass4);
    r(wx + 2, by + 40, 14, 16, lit ? shade(P.amber3, P.copper2, 0.3) : shade(P.ink2, P.brass5, 0.4));
    if (lit) {
      r(wx + 2, by + 40, 14, 5, P.amber2);
      r(wx + 3, by + 41, 4, 2, P.amber1);
      r(wx + 2, by + 54, 14, 2, P.copper2);
    } else {
      r(wx + 3, by + 41, 2, 6, shade(P.ink3, P.steel0, 0.5));
    }
    r(wx - 2, by + 60, 22, 2, P.brass3);
  }
  // cab window at the nose (helm): teal glass with a reflection
  r(bx + bw - 76, by + 34, 50, 30, P.ink0);
  r(bx + bw - 74, by + 36, 46, 26, P.teal4);
  r(bx + bw - 74, by + 36, 46, 2, P.teal3);
  for (let k = 0; k < 10; k++) r(bx + bw - 70 + k, by + 44 + k, 2, 1, shade(P.teal4, P.teal2, 0.5));
  r(bx + bw - 74, by + 50, 46, 1, P.ink1);
  // name plate
  r(bx + 104, by + 72, 88, 14, P.ink0);
  r(bx + 106, by + 74, 84, 10, P.brass3);
  r(bx + 106, by + 74, 84, 2, P.brass2);
  for (let k = bx + 112; k < bx + 184; k += 6) r(k, by + 78, 3, 2, P.brass5);
  // tail: cable-thrust spools (copper braid on iron drums)
  r(bx - 32, by + 22, 36, 58, P.ink0);
  r(bx - 30, by + 24, 32, 54, P.copper3);
  for (let y = by + 26; y < by + 76; y += 3) {
    r(bx - 30, y, 32, 1, P.copper2);
    r(bx - 30 + ((y >> 1) % 6), y + 1, 2, 1, P.copper1);
  }
  r(bx - 30, by + 24, 4, 54, P.copper4);
  r(bx - 38, by + 42, 8, 18, P.ink3);
  r(bx - 38, by + 42, 8, 2, P.steel0);
  // nose: the lamp cupola, iron hood over the lens
  const nx = bx + bw - 8;
  r(nx, by + 16, 38, 54, P.ink0);
  r(nx + 2, by + 18, 32, 50, P.ink3);
  r(nx + 2, by + 18, 32, 3, P.steel0);
  r(nx + 18, by + 28, 14, 30, P.ink1);
  r(nx + 20, by + 30, 10, 26, lampCol);
  r(nx + 22, by + 34, 4, 8, P.ivory0);
  r(nx + 18, by + 26, 16, 3, P.steel1);
  // keel: tanks and ballast (dark iron)
  for (const tx of [bx + 72, bx + 208, bx + 332]) {
    r(tx - 2, by + bh + 2, 100, 22, P.ink0);
    r(tx, by + bh + 4, 96, 18, P.ink3);
    r(tx, by + bh + 4, 96, 2, P.steel0);
    r(tx, by + bh + 18, 96, 4, P.ink2);
    for (let k = tx + 12; k < tx + 88; k += 16) r(k, by + bh + 8, 2, 10, P.ink2);
    r(tx + 8, by + bh, 6, 6, P.ink0);
    r(tx + 80, by + bh, 6, 6, P.ink0);
  }
  // belly mount
  r(bx + 256, by + bh + 24, 32, 14, P.ink0);
  r(bx + 258, by + bh + 26, 28, 10, P.ink3);
  markHD(cv);
  return cv;
}

export interface TenderDraw {
  /** Grip point on screen (where the carrier runs). */
  gripX: number;
  gripY: number;
  w: number;
  h: number;
}

/** Size and grip offset of the tender image that will be drawn. */
export function tenderMetrics(): { w: number; h: number; grip: { x: number; y: number }; source: "art" | "fallback" } {
  const img = art("ships/lamplighter");
  const meta = shipsMeta()?.lamplighter;
  if (img) {
    const ls = layoutSize(img);
    // ships.json geometry is in image pixels (HD): halve it for layout units.
    const grip = meta?.cable ? { x: meta.cable.x / 2, y: meta.cable.y / 2 } : { x: Math.round(ls.w / 2), y: 4 };
    return { w: ls.w, h: ls.h, grip, source: "art" };
  }
  return { w: FW, h: FH, grip: GRIP, source: "fallback" };
}

/**
 * Draw the tender with its grip point at (gx, gy). `lamp` pulses the nose lamp. The combat workstream's preview is
 * used when it exists (it may draw rooms and crew too).
 */
export function drawTender(g: Gfx, ship: ShipState, gx: number, gy: number, t: number, opts: { lamp?: boolean; preview?: boolean; crew?: boolean; draw?: (x: number, y: number) => void } = {}) {
  const pg = opts.preview !== false ? previewGrip(ship) : null;
  if (pg && combatApi.drawShipPreview) {
    const x = Math.round(gx - pg.x);
    const y = Math.round(gy - pg.y);
    if (opts.draw) opts.draw(x, y);
    else combatApi.drawShipPreview(g, ship, x, y, { t, crew: opts.crew !== false });
    return { x, y, w: pg.w, h: pg.h };
  }
  const m = tenderMetrics();
  const x = Math.round(gx - m.grip.x);
  const y = Math.round(gy - m.grip.y);
  const img = art("ships/lamplighter");
  const lampCol = LAMP[ship.livery?.lamp ?? "amber"] ?? P.amber1;
  if (img) g.image(img, x, y);
  else {
    let fc = fallbackCanvas.get(lampCol);
    if (!fc) {
      fc = paintFallback(lampCol);
      fallbackCanvas.set(lampCol, fc);
    }
    g.image(fc, x, y);
  }
  if (opts.lamp !== false) {
    const glowPts = shipsMeta()?.lamplighter?.glow;
    const pulse = 0.25 + 0.1 * Math.sin(t * 2.4);
    if (img && glowPts?.length) for (const p of glowPts) glowHD(g, x + p.x / 2, y + p.y / 2, (p.r ?? 24) / 2, lampCol, pulse);
    else if (!img) glowHD(g, x + 24 + 246 + 13, y + 38 + 21, 16, lampCol, pulse);
  }
  return { x, y, w: m.w, h: m.h };
}

/** Trolley sparks where the grip rides the carrier. */
export function trolleySparks(g: Gfx, gx: number, gy: number, t: number, intensity = 1) {
  const n = Math.floor(3 * intensity);
  for (let i = 0; i < n; i++) {
    const ph = (t * 1.7 + i * 0.37) % 1;
    if (ph > 0.35) continue;
    const s = Math.sin(i * 12.9898 + Math.floor(t * 1.7) * 78.233) * 43758.5453;
    const rnd = s - Math.floor(s);
    const sx = gx - 14 + rnd * 28 + ph * 10 * (rnd > 0.5 ? 1 : -1);
    const sy = gy + ph * 26 + ph * ph * 30;
    dot(g, sx, sy, ph < 0.12 ? P.amber0 : ph < 0.25 ? P.amber2 : P.ember2);
  }
}

/** The carrier across the relay view and the tender hanging from it. Returns the grip position. */
export function carrierScene(g: Gfx, ship: ShipState, t: number, opts: { x?: number; slideX?: number; sway?: boolean; cableY?: number; fitHeight?: number; draw?: (x: number, y: number) => void } = {}) {
  const x0 = -20;
  const x1 = 980;
  const y0 = opts.cableY ?? 96;
  const sag = 40;
  // Centre the whole consist (rear and keel cars included) on opts.x.
  const pg = previewGrip(ship);
  const centre = opts.x ?? 420;
  const fit = pg ? Math.min(1, 760 / pg.w, (opts.fitHeight ?? Infinity) / pg.h) : 1;
  const baseX = pg ? centre - pg.w * fit / 2 + pg.x * fit : centre;
  const gx = Math.round(baseX + (opts.slideX ?? 0));
  const swayX = opts.sway === false ? 0 : Math.round(Math.sin(t * 0.9) * 1.2);
  const u = (gx - x0) / (x1 - x0);
  const gy = Math.round(y0 + sag * 4 * u * (1 - u));
  // back cable shadow, cable (cached: a thousand pixels of braid)
  const layer = cachedLayer("carrier", `${y0}|${sag}`, 960, y0 + sag + 12, (lg) => {
    cable(lg, x0, y0 + 3, x1, y0 + 3, sag, { color: P.ink1, hi: P.ink1, lo: P.ink0, thick: 3, braid: false, hd: true });
    cable(lg, x0, y0, x1, y0, sag, { thick: 7, hd: true, color: P.copper2, hi: P.copper0, lo: P.copper4 });
    cable(lg, x0, y0 + 1.5, x1, y0 + 1.5, sag, { thick: 2, hd: true, color: P.copper3, hi: P.copper1, lo: P.copper3, braid: false });
  });
  g.image(layer, 0, 0);
  g.ctx.save();
  g.ctx.translate(gx + swayX, gy);
  g.ctx.scale(fit, fit);
  g.ctx.translate(-gx - swayX, -gy);
  drawTender(g, ship, gx + swayX, gy, t, { draw: opts.draw });
  g.ctx.restore();
  trolleySparks(g, gx + swayX, gy, t, opts.slideX ? 3 : 1);
  return { gx: gx + swayX, gy };
}
