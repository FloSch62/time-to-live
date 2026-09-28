// Backgrounds: key art from public/art (HD, drawn with g.cover), with code-painted HD fallbacks (1920×1080 canvases,
// cached, marked HD) until the art workstream delivers — fine stars, the Line's arc of lamps with the Faultline gap,
// spires over a soft layered cloud sea with many tones, stage light (copper, violet glass, ember), Relay Seven.
import { Gfx, pixelSceneCell } from "../core/gfx";
import { art, markHD } from "../core/assets";
import { P, hexToRgb } from "../core/palette";
import { Rng, hashString } from "../core/rng";
import type { HazardId, StageIndex } from "../game/ids";
import { settings } from "../core/save";

export type BackdropKind = "space" | "title" | "interior" | "quiet" | "chart" | "ending" | "carrier";
export type BackdropState = "idle" | "danger" | "restored" | "sealed" | "released";

export interface BackdropSpec {
  kind: BackdropKind;
  stage?: StageIndex;
  seed?: number;
  /** Use simulation time for machinery whose danger must freeze while paused. */
  time?: number;
  /** Only pass restoration/release after the corresponding world action actually happened. */
  state?: BackdropState;
  hazard?: HazardId;
  variant?: number;
  context?: "relay" | "combat";
}

const BW = 1920;
const BH = 1080;
const cache = new Map<string, HTMLCanvasElement>();

type Ctx = CanvasRenderingContext2D;

function hex(r: number, g: number, b: number) {
  return `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1)}`;
}

/** Mix two palette colours; `steps` quantises the ramp so banding stays deliberate (no dithering). */
function mix(a: string, b: string, t: number, steps = 12): string {
  const q = Math.round(Math.max(0, Math.min(1, t)) * steps) / steps;
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return hex(A[0] + (B[0] - A[0]) * q, A[1] + (B[1] - A[1]) * q, A[2] + (B[2] - A[2]) * q);
}

function px(c: Ctx, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function gradient(c: Ctx, stops: [number, string][], y0 = 0, y1 = BH, steps = 16) {
  for (let y = y0; y < y1; y += 2) {
    const f = (y - y0) / (y1 - y0);
    let i = 0;
    while (i < stops.length - 2 && f > stops[i + 1][0]) i++;
    const [fa, ca] = stops[i];
    const [fb, cb] = stops[i + 1];
    px(c, 0, y, BW, 2, mix(ca, cb, (f - fa) / (fb - fa || 1), steps));
  }
}

/** Stepped soft light (concentric ellipses with low alpha). */
function light(c: Ctx, cx: number, cy: number, rx: number, ry: number, col: string, a: number, steps = 10) {
  c.fillStyle = col;
  for (let i = steps; i >= 1; i--) {
    c.globalAlpha = (a / steps) * 1.4;
    const RX = (rx * i) / steps;
    const RY = (ry * i) / steps;
    for (let dy = -RY; dy <= RY; dy += 2) {
      const half = RX * Math.sqrt(Math.max(0, 1 - (dy * dy) / (RY * RY)));
      c.fillRect(Math.round(cx - half), Math.round(cy + dy), Math.round(half * 2), 2);
    }
  }
  c.globalAlpha = 1;
}

function stars(c: Ctx, rng: Rng, n: number, maxY: number) {
  for (let i = 0; i < n; i++) {
    const x = rng.int(0, BW - 1);
    const y = Math.floor(Math.pow(rng.next(), 1.4) * maxY);
    const r = rng.next();
    const fade = 1 - y / maxY;
    const col = r < 0.6 ? mix(P.ink3, P.steel1, fade * 0.8) : r < 0.85 ? mix(P.steel0, P.steel3, fade) : r < 0.93 ? mix(P.teal4, P.teal1, fade) : mix(P.brass4, P.amber1, fade);
    px(c, x, y, 1, 1, col);
    if (r > 0.985) {
      px(c, x - 1, y, 3, 1, mix(P.ink2, P.steel1, 0.6));
      px(c, x, y - 1, 1, 3, mix(P.ink2, P.steel1, 0.6));
      px(c, x, y, 1, 1, P.ivory0);
      if (r > 0.995) {
        px(c, x - 3, y, 7, 1, mix(P.ink2, P.steel0, 0.5));
        px(c, x, y - 3, 1, 7, mix(P.ink2, P.steel0, 0.5));
        px(c, x, y, 1, 1, P.ivory0);
      }
    }
  }
  // faint milky band
  for (let i = 0; i < 2200; i++) {
    const u = rng.next();
    const x = u * BW;
    const y = 120 + u * 260 + rng.range(-70, 70) * (0.5 + rng.next());
    if (y < maxY) px(c, x, y, 1, 1, mix(P.ink2, P.steel0, rng.range(0.1, 0.5)));
  }
}

/** The Line: a long arc of dark machinery with lamps, broken by the Faultline gap. */
function lineArc(c: Ctx, rng: Rng, y0: number, bow: number, gapAt: number, gapW: number, lamp: string) {
  const yAt = (x: number) => y0 + bow * ((x - BW / 2) / (BW / 2)) ** 2;
  for (let x = -4; x < BW + 4; x++) {
    const y = Math.round(yAt(x));
    const d = Math.abs(x - gapAt);
    if (d < gapW / 2) {
      if (rng.chance(0.03)) px(c, x, y + rng.int(-6, 18), rng.int(1, 3), rng.int(1, 2), P.steel0);
      continue;
    }
    const broken = d < gapW / 2 + 14 ? rng.int(0, 4) : 0;
    const th = 10 - broken;
    px(c, x, y, 1, th, P.ink3);
    px(c, x, y + 2, 1, th - 5, mix(P.ink3, P.ink4, 0.5));
    px(c, x, y, 1, 1, P.steel0);
    px(c, x, y + 1, 1, 1, mix(P.ink4, P.steel0, 0.5));
    px(c, x, y + th, 1, 2, P.ink1);
    if (x % 23 === 0) px(c, x, y - 6, 1, 6, P.ink3); // masts
    if (x % 67 === 0) px(c, x - 2, y - 9, 5, 3, P.ink3);
  }
  // lamps with small lights
  for (let x = 6; x < BW; x += 18) {
    if (Math.abs(x - gapAt) < gapW / 2 + 16) continue;
    const y = Math.round(yAt(x)) - 2;
    const on = rng.chance(0.85);
    px(c, x, y, 2, 2, on ? lamp : P.brass5);
    if (on && x % 54 === 6) light(c, x + 1, y + 1, 10, 7, lamp, 0.25, 4);
  }
}

function spire(c: Ctx, rng: Rng, x: number, top: number, bottom: number, w: number, body: string, edge: string, lit: string | null) {
  px(c, x, top, w, bottom - top, body);
  px(c, x, top, 2, bottom - top, edge);
  px(c, x + w - 1, top, 1, bottom - top, mix(body, P.ink0, 0.4));
  for (let y = top + 10; y < bottom; y += rng.int(14, 28)) {
    px(c, x - 3, y, w + 6, 2, edge);
    px(c, x - 3, y + 2, w + 6, 1, mix(body, P.ink0, 0.3));
    if (lit && rng.chance(0.35)) px(c, x + rng.int(2, Math.max(2, w - 4)), y + 5, 2, 2, lit);
  }
  // crown: gantry and mast
  px(c, x - 6, top - 4, w + 12, 4, body);
  px(c, x - 6, top - 4, w + 12, 1, edge);
  px(c, x + Math.floor(w / 2) - 1, top - 26, 2, 22, body);
  for (let k = 0; k < 3; k++) px(c, x + Math.floor(w / 2) - 5 + k, top - 20 + k * 6, 11 - k * 2, 1, edge);
  if (lit) {
    px(c, x + Math.floor(w / 2) - 1, top - 28, 3, 3, lit);
    light(c, x + Math.floor(w / 2), top - 27, 12, 10, lit, 0.2, 4);
  }
}

interface CloudTone {
  top: string;
  lit: string;
  body: string;
  shade: string;
}

/** A layer of billows: bumpy top line from layered sines, lit rims, gradient bodies and shadowed bases. */
function clouds(c: Ctx, rng: Rng, baseY: number, amp: number, scale: number, tone: CloudTone) {
  const phases = [rng.range(0, 6), rng.range(0, 6), rng.range(0, 6), rng.range(0, 6)];
  const top = new Array<number>(BW);
  for (let x = 0; x < BW; x++) {
    const u = x / scale;
    const v =
      Math.abs(Math.sin(u * 0.9 + phases[0])) * 1.0 +
      Math.abs(Math.sin(u * 2.3 + phases[1])) * 0.45 +
      Math.abs(Math.sin(u * 5.1 + phases[2])) * 0.18 +
      Math.sin(u * 0.21 + phases[3]) * 0.6;
    top[x] = Math.round(baseY - v * amp);
  }
  for (let x = 0; x < BW; x++) {
    const y = top[x];
    const slope = (top[Math.min(BW - 1, x + 3)] - top[Math.max(0, x - 3)]) / 6;
    const lit = slope > 0.15; // faces the light from the left
    px(c, x, y, 1, 2, lit ? tone.top : tone.lit);
    px(c, x, y + 2, 1, 6, lit ? tone.lit : mix(tone.lit, tone.body, 0.5));
    px(c, x, y + 8, 1, 18, mix(tone.lit, tone.body, 0.7));
    px(c, x, y + 26, 1, BH - y - 26, tone.body);
    // soft shadow under each billow toward the next layer
    const depth = baseY + amp * 0.2 - y;
    if (depth < 0) px(c, x, y + 26, 1, Math.min(30, -depth * 0.6), mix(tone.body, tone.shade, 0.6));
  }
}

const HAZE: Record<StageIndex, [string, string, string]> = {
  1: [P.verd4, P.copper3, P.copper2],
  2: [P.violet4, P.violet3, P.violet2],
  3: [P.ember4, P.copper3, P.ember3],
};

const CLOUDS: Record<StageIndex, CloudTone[]> = {
  1: [
    { top: mix(P.steel1, P.copper1, 0.35), lit: mix(P.ink4, P.steel0, 0.6), body: P.ink3, shade: P.ink2 },
    { top: mix(P.steel1, P.ivory3, 0.3), lit: P.steel0, body: mix(P.ink3, P.ink4, 0.5), shade: P.ink2 },
    { top: mix(P.ivory3, P.copper0, 0.2), lit: mix(P.steel0, P.steel1, 0.5), body: P.ink4, shade: P.ink3 },
    { top: P.ivory3, lit: P.steel1, body: mix(P.ink4, P.steel0, 0.4), shade: P.ink3 },
  ],
  2: [
    { top: mix(P.violet3, P.violet1, 0.4), lit: P.violet4, body: mix(P.ink3, P.violet4, 0.4), shade: P.ink2 },
    { top: mix(P.violet2, P.steel1, 0.4), lit: mix(P.violet4, P.ink4, 0.4), body: P.ink3, shade: P.ink2 },
    { top: mix(P.violet1, P.ivory3, 0.4), lit: mix(P.violet3, P.steel0, 0.5), body: mix(P.ink4, P.violet4, 0.4), shade: P.ink3 },
    { top: mix(P.violet0, P.ivory2, 0.5), lit: mix(P.violet2, P.steel1, 0.5), body: mix(P.ink4, P.violet3, 0.3), shade: P.ink3 },
  ],
  3: [
    { top: mix(P.ember3, P.copper2, 0.5), lit: P.ember4, body: mix(P.ink2, P.ember4, 0.5), shade: P.ink1 },
    { top: mix(P.ember2, P.copper1, 0.4), lit: mix(P.ember4, P.copper3, 0.5), body: mix(P.ink2, P.ember4, 0.3), shade: P.ink1 },
    { top: mix(P.ember1, P.copper0, 0.5), lit: mix(P.ember3, P.copper3, 0.5), body: mix(P.ink3, P.ember4, 0.4), shade: P.ink2 },
    { top: mix(P.ember0, P.amber1, 0.4), lit: mix(P.ember2, P.copper2, 0.5), body: mix(P.ink3, P.copper4, 0.5), shade: P.ink2 },
  ],
};

function paintSpace(c: Ctx, stage: StageIndex, seed: number, title = false) {
  const rng = new Rng(seed);
  const [h0, h1, h2] = HAZE[stage];
  gradient(c, [
    [0, P.ink0], [0.25, mix(P.ink0, P.ink1, 0.8)], [0.45, P.ink2], [0.6, mix(P.ink2, P.ink3, 0.7)],
    [0.7, mix(P.ink3, h0, 0.5)], [0.76, mix(h0, h1, 0.4)], [0.8, title ? mix(h1, h2, 0.5) : h1], [1, P.ink2],
  ], 0, BH, 24);
  stars(c, rng, 1400, 700);
  // horizon light: the sun under the cloud floor (stage tinted)
  light(c, title ? 1400 : rng.int(300, 1600), 820, 900, 140, h2, 0.35, 14);
  lineArc(c, rng, title ? 250 : rng.int(150, 240), title ? 110 : 80, title ? 1330 : rng.int(260, 1660), title ? 150 : rng.int(60, 120), stage === 2 ? P.violet1 : P.amber2);
  // far spires with scaffolds and lit crowns
  for (let i = 0; i < 18; i++) {
    const x = rng.int(0, BW);
    const top = rng.int(520, 760);
    const w = rng.int(6, 18);
    spire(c, rng, x, top, 900, w, mix(P.ink1, P.ink2, 0.6), mix(P.ink2, P.ink3, 0.7), rng.chance(0.45) ? (stage === 2 ? P.violet2 : stage === 3 ? P.ember2 : P.amber3) : null);
  }
  // stage features on the horizon
  if (stage === 1) {
    for (let i = 0; i < 9; i++) {
      const x0 = rng.int(-200, BW);
      const x1 = x0 + rng.int(240, 640);
      const y0 = rng.int(600, 740);
      const sag = rng.int(30, 90);
      const col = i % 2 ? P.copper3 : P.verd3;
      for (let x = x0; x <= x1; x++) {
        const u = (x - x0) / (x1 - x0);
        const y = y0 + sag * 4 * u * (1 - u);
        px(c, x, y, 1, 2, col);
        if (x % 5 === 0) px(c, x, y, 1, 1, mix(col, P.ivory3, 0.3));
      }
    }
    // a gantry crane
    const cx = rng.int(160, 800);
    px(c, cx, 480, 10, 380, P.ink1);
    for (let y = 490; y < 860; y += 24) {
      px(c, cx - 4, y, 18, 2, P.ink2);
    }
    px(c, cx - 140, 480, 300, 8, P.ink1);
    px(c, cx - 140, 480, 300, 1, P.ink3);
    px(c, cx + 120, 488, 2, 110, P.ink2);
    px(c, cx + 108, 598, 26, 18, P.ink1);
    px(c, cx + 112, 602, 3, 3, P.amber3);
  } else if (stage === 2) {
    for (let i = 0; i < 7; i++) {
      const cx = rng.int(0, BW);
      const r = rng.int(50, 150);
      const by = rng.int(780, 860);
      for (let dy = 0; dy < r; dy++) {
        const half = Math.floor(Math.sqrt(r * r - dy * dy) * 1.25);
        const band = dy % 18 < 2;
        px(c, cx - half, by - dy, half * 2, 1, band ? mix(P.violet3, P.violet1, 0.3) : mix(P.ink2, P.violet4, 0.7));
        px(c, cx - half, by - dy, 2, 1, mix(P.violet2, P.violet0, 0.3));
      }
      px(c, cx - 1, by - r - 16, 2, 16, P.violet2);
      light(c, cx - r * 0.4, by - r * 0.7, 26, 12, P.violet0, 0.25, 5);
    }
    // glass fog bands
    for (let k = 0; k < 4; k++) {
      c.globalAlpha = 0.07;
      px(c, 0, 740 + k * 26, BW, 14, P.violet1);
    }
    c.globalAlpha = 1;
  } else {
    const cx = rng.int(1200, 1680);
    const cy = 600;
    const R = 190;
    light(c, cx, cy, R * 2.2, R * 1.6, P.ember3, 0.4, 14);
    for (let ring = 0; ring < 5; ring++) {
      const rr = R - ring * 30;
      for (let a = 0; a < 720; a++) {
        const ang = (a / 720) * Math.PI * 2;
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr * 0.92;
        const gap = (a + ring * 90) % 180 < 12;
        if (!gap) px(c, x, y, 3, 3, ring % 2 ? mix(P.ember4, P.ink2, 0.3) : mix(P.ember3, P.ember4, 0.5));
      }
    }
    for (let a = 0; a < 260; a++) {
      const ang = rng.range(0, Math.PI * 2);
      const rr = rng.range(10, R - 40);
      px(c, cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.9, 2, 2, rng.chance(0.5) ? P.amber2 : P.ember1);
    }
    light(c, cx, cy, 70, 64, P.amber1, 0.35, 8);
  }
  // cloud sea: four layers, back to front
  const tones = CLOUDS[stage];
  clouds(c, rng, 872, 26, 70, tones[0]);
  clouds(c, rng, 912, 32, 95, tones[1]);
  clouds(c, rng, 966, 38, 130, tones[2]);
  clouds(c, rng, 1036, 44, 170, tones[3]);
  // near spires
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? rng.int(30, 220) : rng.int(1640, 1840);
    spire(c, rng, x, rng.int(360, 520), BH, rng.int(34, 56), P.ink1, mix(P.ink2, P.ink3, 0.5), stage === 2 ? P.violet1 : P.amber2);
  }
  vignette(c, 0.55);
}

function vignette(c: Ctx, strength: number) {
  const img = c.getImageData(0, 0, BW, BH);
  const d = img.data;
  for (let y = 0; y < BH; y++) {
    const dy = (y - BH / 2) / (BH / 2);
    for (let x = 0; x < BW; x++) {
      const dx = (x - BW / 2) / (BW / 2);
      const v = Math.max(0, dx * dx * 0.45 + dy * dy * 0.55 - 0.35) * strength;
      if (v <= 0) continue;
      const k = 1 - Math.min(0.85, Math.round(v * 10) / 10);
      const i = (y * BW + x) * 4;
      d[i] = d[i] * k;
      d[i + 1] = d[i + 1] * k;
      d[i + 2] = d[i + 2] * k;
    }
  }
  c.putImageData(img, 0, 0);
}

function paintInterior(c: Ctx, seed: number, quiet: boolean) {
  const rng = new Rng(seed);
  gradient(c, [[0, P.ink0], [0.55, P.ink1], [1, quiet ? P.ink1 : mix(P.ink1, P.brass5, 0.6)]]);
  // the switchboard wall
  const x0 = 280;
  const y0 = 144;
  const w = 1360;
  const h = 600;
  px(c, x0 - 24, y0 - 24, w + 48, h + 48, P.brass5);
  px(c, x0 - 24, y0 - 24, w + 48, 2, P.brass4);
  px(c, x0 - 16, y0 - 16, w + 32, h + 32, P.ink2);
  px(c, x0, y0, w, h, P.ink1);
  for (let r = 0; r < 7; r++) {
    px(c, x0 + 12, y0 + 30 + r * 80 - 14, w - 24, 2, mix(P.ink2, P.brass5, 0.4));
    for (let k = 0; k < 20; k++) {
      const lx = x0 + 40 + k * 64;
      const ly = y0 + 30 + r * 80;
      const lit = rng.chance(0.04);
      px(c, lx - 3, ly - 3, 22, 22, P.ink3);
      px(c, lx - 2, ly - 2, 20, 1, P.brass4);
      px(c, lx, ly, 16, 16, lit ? P.brass3 : mix(P.brass5, P.ink2, 0.4));
      px(c, lx + 2, ly + 2, 5, 3, lit ? P.brass1 : P.brass5);
      // label strip and jack
      px(c, lx - 2, ly + 22, 20, 5, mix(P.ivory4, P.ink2, 0.5));
      px(c, lx + 5, ly + 34, 6, 10, P.ink0);
      px(c, lx + 6, ly + 35, 4, 1, P.steel0);
      if (rng.chance(0.22)) {
        const drop = rng.int(40, 170);
        const sway = rng.range(3, 9);
        for (let dd = 0; dd < drop; dd++) px(c, lx + 7 + Math.round(Math.sin(dd / 22) * sway), ly + 44 + dd, 2, 1, dd % 9 === 0 ? P.copper2 : P.copper3);
      }
    }
  }
  // desk
  px(c, 160, 784, 1600, 40, P.brass4);
  px(c, 160, 784, 1600, 4, P.brass3);
  px(c, 160, 788, 1600, 2, P.brass2);
  px(c, 160, 824, 1600, 256, P.ink2);
  for (let x = 200; x < 1760; x += 120) px(c, x, 830, 2, 250, P.ink1);
  // the Operator's chair
  const cx = quiet ? 1000 : 940;
  px(c, cx, 600, 136, 176, P.ink2);
  px(c, cx + 8, 608, 120, 160, mix(P.ink3, P.copper4, 0.3));
  px(c, cx + 8, 608, 120, 3, P.ink4);
  px(c, cx + 24, 776, 16, 120, P.ink2);
  px(c, cx + 96, 776, 16, 120, P.ink2);
  // headset on the desk
  px(c, 1200, 770, 50, 6, P.ink3);
  px(c, 1196, 758, 12, 18, P.ink3);
  px(c, 1242, 758, 12, 18, P.ink3);
  // lamp on the desk
  if (!quiet) {
    light(c, 1500, 760, 380, 160, P.amber2, 0.45, 14);
    px(c, 1488, 720, 56, 64, P.brass3);
    px(c, 1488, 720, 56, 4, P.brass1);
    px(c, 1496, 704, 40, 16, P.amber1);
    px(c, 1500, 706, 16, 6, P.amber0);
  }
  // kettle and cups
  px(c, 440, 736, 64, 48, P.steel0);
  px(c, 448, 728, 48, 8, P.steel1);
  px(c, 440, 736, 64, 3, P.steel2);
  px(c, 504, 748, 16, 12, P.steel0);
  for (const cx2 of [560, 610]) {
    px(c, cx2, 760, 26, 24, P.ivory4);
    px(c, cx2, 760, 26, 3, P.ivory3);
  }
  // window with the sky and the Line
  px(c, 1696, 80, 184, 440, P.ink0);
  px(c, 1704, 88, 168, 424, P.ink2);
  for (let i = 0; i < 90; i++) px(c, 1704 + rng.int(0, 167), 88 + rng.int(0, 240), 1, 1, P.steel1);
  px(c, 1704, 240, 168, 6, P.ink3);
  for (let x = 1704; x < 1872; x += 14) px(c, x, 236, 2, 2, P.amber3);
  vignette(c, 0.7);
}

function paintChart(c: Ctx) {
  gradient(c, [[0, P.ink1], [1, P.ink2]]);
  for (let x = 0; x < BW; x += 32) for (let y = 0; y < BH; y += 4) px(c, x, y, 1, 2, P.ink3);
  for (let y = 0; y < BH; y += 32) for (let x = 0; x < BW; x += 4) px(c, x, y, 2, 1, P.ink3);
}

function paint(spec: BackdropSpec): HTMLCanvasElement {
  const key = `${spec.kind}|${spec.stage ?? 1}|${spec.seed ?? 0}`;
  let cv = cache.get(key);
  if (cv) return cv;
  cv = document.createElement("canvas");
  cv.width = BW;
  cv.height = BH;
  const c = cv.getContext("2d", { willReadFrequently: true })!;
  c.imageSmoothingEnabled = false;
  const stage = spec.stage ?? 1;
  const seed = spec.seed ?? hashString(spec.kind);
  switch (spec.kind) {
    case "title": paintSpace(c, 1, seed, true); break;
    case "interior": paintInterior(c, seed, false); break;
    case "quiet": paintInterior(c, seed, true); break;
    case "chart": paintChart(c); break;
    case "ending": paintSpace(c, 1, seed, true); break;
    default: paintSpace(c, stage, seed);
  }
  markHD(cv);
  if (cache.size > 8) cache.delete(cache.keys().next().value!);
  cache.set(key, cv);
  return cv;
}

/** The fallback painting (always available). */
export function fallbackBackdrop(spec: BackdropSpec): HTMLCanvasElement {
  return paint(spec);
}

/**
 * Dev-only art study override (A1 style study): `?bg=<id under public/art>` replaces the
 * backdrop image of every scene; `&bgfx=0` hides the procedural overlays (regional machinery, landmark motion, back
 * weather, twinkles) so the candidate is judged on its own behind the real vessels; `&layers=1` draws the R4 planes
 * `<id>-sky` and `<id>-scene` with a grid-snapped parallax instead of the flat image.
 */
const study: { bg: string; fx: boolean; layers: boolean } | null = (() => {
  if (!import.meta.env?.DEV || typeof location === "undefined") return null;
  const q = new URLSearchParams(location.search);
  const bg = q.get("bg");
  return bg ? { bg: bg.replace(/^\/?(art\/)?/, "").replace(/\.png$/, ""), fx: q.get("bgfx") !== "0",
    layers: q.get("layers") === "1" } : null;
})();

/** Art-pixel size (layout units) of the pixel-art scene drawn this frame, 0 for an HD painting or fallback. */
let sceneCell = 0;

let gridLayer: HTMLCanvasElement | null = null;
/**
 * Draw `draw` (layout-unit code) into an offscreen canvas at the scene's art resolution and blit it with smoothing
 * off, so procedural weather, glare and fog land on the same pixel grid as a DIRECTION v5 pixel-art scene.
 */
function onArtGrid(g: Gfx, cell: number, draw: (lg: Gfx) => void) {
  const w = Math.round(960 / cell);
  const h = Math.round(540 / cell);
  if (!gridLayer || gridLayer.width !== w || gridLayer.height !== h) {
    gridLayer = document.createElement("canvas");
    gridLayer.width = w;
    gridLayer.height = h;
  }
  const c = gridLayer.getContext("2d")!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, w, h);
  // the layer sees the caller's current transform (zoom, screen shake), scaled from backing to art pixels
  const m = g.ctx.getTransform();
  const k = 1 / (2 * cell);
  c.setTransform(m.a * k, m.b * k, m.c * k, m.d * k, m.e * k, m.f * k);
  c.imageSmoothingEnabled = false;
  const lg = new Gfx(c);
  lg.time = g.time;
  draw(lg);
  const main = g.ctx;
  main.save();
  main.setTransform(1, 0, 0, 1, 0, 0);
  main.imageSmoothingEnabled = false;
  main.drawImage(gridLayer, 0, 0, w * 2 * cell, h * 2 * cell);
  main.restore();
}

/**
 * Draw code-drawn world pieces (pylons, benches, gantries) on the art-pixel grid of the pixel-art scene shown this
 * frame, so they match its 3x pixels; draws directly when the backdrop is an HD painting. Keeps the caller's
 * transform (zoom) and clip.
 */
export function drawOnArtGrid(g: Gfx, draw: (lg: Gfx) => void) {
  if (sceneCell) onArtGrid(g, sceneCell, draw);
  else draw(g);
}

/** Draw a full-screen background: `public/art/<id>.png` (HD, g.cover) when present, otherwise the painted fallback.
 * Low-resolution pixel-art scenes (DIRECTION v5) are drawn at an integer scale with the drift snapped to their grid. */
/**
 * Paintings that can stand behind a fight: the enemy camera region (layout x 560-954, y 110-370) holds no strong
 * landmark (reviewed in game with every region's enemies). Refuges (`e`) are sanctuaries and never host a fight;
 * s2-d's mirror dish and s3-a's archive sphere fill the enemy region.
 */
const COMBAT_SAFE: Record<number, string[]> = { 1: ["a", "b", "c", "d"], 2: ["a", "b", "c"], 3: ["b", "c", "d"] };

function combatScene(id: string, seed: number): string {
  const m = /^bg\/s([123])-([a-e])$/.exec(id);
  if (!m) return id;
  const safe = COMBAT_SAFE[Number(m[1])];
  if (safe.includes(m[2])) return id;
  return `bg/s${m[1]}-${safe[Math.abs(seed) % safe.length]}`;
}

/** The painting drawn this frame (its painted sun anchors the glare). */
let currentBg = "";

export function drawBackdrop(g: Gfx, id: string | null, spec: BackdropSpec, dx = 0, dy = 0) {
  if (study) id = study.bg;
  else if (id && spec.context === "combat") id = combatScene(id, spec.seed ?? 0);
  currentBg = id ?? "";
  const img = id ? art(id) : null;
  const world = spec.kind === "space" || spec.kind === "carrier";
  const t = settings.reducedMotion ? 0 : spec.time ?? g.time;
  const ox = settings.reducedMotion ? 0 : dx;
  const oy = settings.reducedMotion ? 0 : dy;
  sceneCell = 0;
  if (img && pixelSceneCell(img)) {
    // Distant drift moves in whole art pixels: a slow one-pixel step, never a smeared sub-pixel slide.
    const drift = world && !settings.reducedMotion ? Math.sin(t * 0.055 + (spec.seed ?? 0)) * 2 : 0;
    // R4 parallax planes (pixelscene.py layers): the sky plane stays put, the scene plane drifts over it.
    const sky = study?.layers && id ? art(`${id}-sky`) : null;
    const scene = sky ? art(`${id}-scene`) : null;
    if (sky && scene) {
      sceneCell = g.pixelScene(sky, 0.35 * drift + ox, oy);
      g.pixelScene(scene, drift + ox, oy);
    } else sceneCell = g.pixelScene(img, drift + ox, oy);
  } else if (world && img) {
    // A few overscan pixels let the distant painting breathe behind the fixed carrier, without bare edges.
    const drift = settings.reducedMotion ? 0 : Math.sin(t * 0.055 + (spec.seed ?? 0)) * 2;
    g.ctx.drawImage(img, Math.round(-8 + drift + ox), Math.round(-5 + oy), 976, 550);
  } else g.cover(img ?? paint(spec), 1, ox, oy);
  if (world && (!study || study.fx)) {
    if (sceneCell) {
      // DIRECTION v5 scenes carry their own machinery and lamps; the procedural machinery and landmark overlays
      // were drawn for the old paintings (and put a hoist over the enemy region). What stays, on the art-pixel
      // grid: the relay-state cue (gameplay information) and the back weather.
      const cell = sceneCell;
      onArtGrid(g, cell, (lg) => {
        drawStateCue(lg, spec.stage ?? 1, spec.state ?? "idle", t, cell);
        drawWeather(lg, spec.stage ?? 1, spec.hazard, t, false, settings.reducedMotion, 1);
      });
    } else {
      drawRegionalMotion(g, spec.stage ?? 1, t, spec.state);
      if (id) drawLandmarkMotion(g, id, t, spec.state ?? "idle");
      drawWeather(g, spec.stage ?? 1, spec.hazard, t, false, settings.reducedMotion, 1);
    }
  }
  return !!img;
}

/**
 * The relay's state on a DIRECTION v5 scene, as world objects in the band just under the HUD (layout y 50-104),
 * never over the vessels: `restored`/`released` relights the ring's lamp line (teal), `danger` sets its warning
 * lamps blinking ember, `sealed` draws the Seal's black lattice with thin red seams over the ring. Drawn into the
 * art-grid layer (one art pixel = `cell` layout units). Reduced motion holds every lamp lit.
 */
function drawStateCue(g: Gfx, stage: StageIndex, state: BackdropState, t: number, cell: number) {
  if (state === "idle") return;
  const c = g.ctx;
  // everything in whole art pixels: (ax, ay) art-pixel coordinates, w/h in art pixels
  const ap = (ax: number, ay: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(ax * cell, ay * cell, w * cell, h * cell);
  };
  const W = Math.round(960 / cell);
  const y0 = Math.round(52 / cell);                          // just under the HUD bars
  if (state === "sealed") {
    // the Seal's lattice clamped over the ring: dark struts with a lit edge, a red seam glowing in every strut
    const h = Math.round(46 / cell);
    g.alpha(0.92, () => {
      ap(0, y0, W, 2, P.ink1);
      ap(0, y0 + h, W, 2, P.ink1);
      for (let k = -h; k < W + h; k += 24) {
        for (let i = 0; i < h; i++) {
          ap(k + i, y0 + i, 2, 1, P.ink1);
          ap(k + h - i, y0 + i, 2, 1, P.ink1);
          ap(k + i, y0 + i, 1, 1, P.ink4);
          if (i % 2 === 0) ap(k + h - i + 1, y0 + i, 1, 1, P.ember3);
        }
      }
    });
    return;
  }
  // a relit (or warning) lamp line: a dark cable with hanging lamp housings
  const lit = state === "danger" ? P.ember1 : P.teal1;
  const core = state === "danger" ? P.ember0 : P.teal0;
  const halo = state === "danger" ? P.ember2 : P.teal2;
  ap(0, y0, W, 1, P.ink1);
  const step = Math.round(64 / cell);
  for (let x = Math.round(step / 2); x < W; x += step) {
    const k = Math.round(x / step);
    ap(x, y0 + 1, 1, 2, P.ink2);                             // hanger
    ap(x - 1, y0 + 3, 3, 1, P.brass4);                       // housing
    const on = state !== "danger" || settings.reducedMotion || Math.floor(t * 1.6 + k * 0.5) % 2 === 0;
    if (!on) { ap(x - 1, y0 + 4, 3, 2, P.ink3); continue; }
    g.alpha(0.35, () => ap(x - 2, y0 + 3, 5, 5, halo));
    ap(x - 1, y0 + 4, 3, 2, lit);
    ap(x, y0 + 4, 1, 1, core);
  }
  if (stage && state === "danger") g.alpha(0.07, () => ap(0, y0 - 1, W, 9, P.ember3));
}

/** Light and moving service equipment follow landmarks in the six newer Krea paintings. */
function drawLandmarkMotion(g: Gfx, id: string, time: number, state: BackdropState) {
  const stopped = state === "sealed";
  const t = settings.reducedMotion || stopped ? 0 : time;
  const lamp = stopped ? P.ember2 : state === "restored" || state === "released" ? P.teal1 : P.amber1;
  if (id === "bg/s1-d") {
    // Signal carriers trace the long switchback cable from the near left tower to the far right head.
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.018 + i * 0.31) % 1;
      const x = 73 + p * 838, y = 14 + 165 * p - 34 * Math.sin(p * Math.PI);
      g.line(x - 8, y, x + 8, y + 3, P.brass3, 2);
      g.rect(x - 2, y - 1, 4, 3, lamp);
      weatherGlow(g, x, y, 15, 8, lamp, 0.022);
    }
    for (const [x, y, r] of [[47, 168, 49], [46, 291, 83]]) {
      const a = t * 0.085;
      g.alpha(0.5, () => {
        for (let k = 0; k < 4; k++) {
          const angle = a + k * Math.PI / 2;
          const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
          g.line(px, py, px + Math.cos(angle + 0.15) * 5, py + Math.sin(angle + 0.15) * 5, P.copper1, 2);
        }
      });
    }
  } else if (id === "bg/s1-e") {
    // The sun remains far away; the dock's pair of guide lamps pass light through its open horseshoe.
    weatherGlow(g, 716, 430, 118, 39, lamp, 0.016);
    for (let k = 0; k < 8; k++) {
      const a = Math.PI * (0.14 + k * 0.10), x = 719 + Math.cos(a) * 112, y = 402 - Math.sin(a) * 78;
      g.rect(x, y, 2, 3, stopped || (Math.floor(t * 0.65) + k) % 8 > 5 ? P.brass4 : lamp);
    }
  } else if (id === "bg/s2-d") {
    // Slow calibration beams link the facing mirror dishes. The endpoints stay on the painted mirrors.
    const y = 142 + (settings.reducedMotion ? 0 : Math.sin(t * 0.24) * 23);
    g.alpha(stopped ? 0.04 : 0.19, () => {
      g.line(70, y, 853, 277 - (y - 142), stopped ? P.ember3 : P.teal1, 1.5);
      g.line(853, 277 - (y - 142), 371, 426, P.violet1);
    });
    weatherGlow(g, 70, y, 17, 30, P.teal1, 0.025);
    weatherGlow(g, 853, 277 - (y - 142), 17, 30, P.violet1, 0.028);
  } else if (id === "bg/s2-e") {
    const tipX = 565, tipY = 142;
    const endY = 88 + (settings.reducedMotion ? 0 : Math.sin(t * 0.12) * 26);
    lightRay(g, tipX, tipY, 40, endY, 7, P.violet1, stopped ? 0.01 : 0.10);
    g.alpha(0.3, () => g.line(tipX, tipY, 40, endY, P.violet0));
    weatherGlow(g, 687, 184, 18, 22, stopped ? P.ember2 : P.teal1, 0.035);
  } else if (id === "bg/s3-d") {
    // A slow pressure front rises from the heat exchangers, distinct from the fast near embers.
    for (let k = 0; k < 12; k++) {
      const rise = (t * 5 + k * 41) % 160;
      const x = 60 + k * 79 + Math.sin(rise * 0.025 + k) * 7;
      g.alpha(0.35 * (1 - rise / 200), () => g.line(x, 430 - rise, x - 2, 420 - rise, P.copper2));
    }
  } else if (id === "bg/s3-e") {
    // Occupied sanctuary windows hold steady while the exterior cable sends a slow acknowledgement.
    weatherGlow(g, 620, 454, 125, 44, lamp, 0.021);
    const p = (t * 0.045) % 1;
    g.rect(750 + p * 177, 416 - p * 5, 4, 2, lamp);
    g.alpha(0.13, () => g.hline(746, 418, 184, lamp));
  }
}

/** Physical foreground infrastructure is shared by loaded paintings and fallback skies. It is deliberately
 * anchored to the overhead Line; no camera drift or free-flight star scroll. Signal lamps retain state when
 * animation is disabled, and ordinary victory never implies that a whole region has been repaired. */
export function drawRegionalMotion(g: Gfx, stage: StageIndex, time: number, state: BackdropState = "idle") {
  const t = settings.reducedMotion ? 0 : time;
  const sealed = state === "sealed";
  const restored = state === "restored" || state === "released";
  const danger = state === "danger";
  const signal = sealed || danger ? P.ember2 : restored ? P.teal2 : P.amber3;
  const c = g.ctx;
  c.save();

  // Two shallow banks move at different speeds far below the playable ships. Their small range keeps the
  // horizon fixed and makes altitude legible without suggesting the tender is flying through open space.
  for (let depth = 0; depth < 2; depth++) {
    const drift = Math.sin(t * (depth ? 0.035 : 0.055) + depth * 2) * (depth ? 12 : 24);
    c.globalAlpha = depth ? 0.06 : 0.075;
    c.fillStyle = stage === 1 ? P.copper1 : stage === 2 ? P.violet1 : P.ember3;
    c.beginPath();
    c.moveTo(-40, 540);
    for (let x = -40; x <= 1000; x += 20) {
      const y = 432 + depth * 52 + Math.sin((x + drift) / (74 + depth * 31)) * 8
        + Math.sin((x + drift) / 23) * 3;
      c.lineTo(x, Math.round(y));
    }
    c.lineTo(1000, 540);
    c.closePath();
    c.fill();
  }
  c.globalAlpha = 1;

  if (stage === 1) copperMachinery(g, t, sealed, restored, danger, signal);
  else if (stage === 2) glassMachinery(g, t, sealed, restored, danger, signal);
  else heartMachinery(g, t, sealed, restored, danger, signal);
  c.restore();
}

function serviceLamp(g: Gfx, x: number, y: number, color: string, lit: boolean) {
  g.rect(x - 2, y - 2, 6, 5, P.ink1);
  g.rect(x - 1, y - 1, 4, 3, lit ? color : P.steel0);
  if (lit) g.alpha(0.09, () => g.rect(x - 5, y - 4, 12, 9, color));
}

function copperMachinery(g: Gfx, t: number, sealed: boolean, restored: boolean, danger: boolean, signal: string) {
  // A small service bridge hangs from the illustrated carrier. The hoist returns to its mechanical stop,
  // waits, and repeats; the closed isolation clamp stops both hoist and local traffic.
  g.alpha(0.8, () => {
    for (const x of [54, 210]) {
      g.line(x, 98, x + 8, 148, P.ink2, 3);
      g.line(x + 2, 103, x + 8, 142, P.copper4);
    }
    g.rect(58, 144, 168, 7, P.ink1);
    g.hline(58, 144, 168, P.copper3);
    for (let x = 62; x < 220; x += 16) {
      g.line(x, 146, x + 12, 151, P.ink4);
    }
    const cycle = t % 28;
    const work = sealed ? 0 : danger ? 0.78 : cycle < 9 ? cycle / 9 : cycle < 18 ? (18 - cycle) / 9 : 0;
    const trolley = 112 + Math.round(work * 42);
    const drop = 17 + Math.round(work * 24);
    g.rect(trolley - 9, 141, 20, 13, P.ink2);
    g.box(trolley - 9, 141, 20, 13, P.copper4);
    g.circle(trolley - 5, 143, 2, P.brass3, true);
    g.circle(trolley + 7, 143, 2, P.brass3, true);
    g.line(trolley, 154, trolley, 154 + drop, P.steel0);
    g.line(trolley + 3, 154, trolley + 3, 154 + drop, P.ink4);
    g.rect(trolley - 5, 154 + drop, 13, 4, P.brass4);
    g.line(trolley - 4, 158 + drop, trolley, 164 + drop, P.steel0, 2);
    g.line(trolley + 7, 158 + drop, trolley + 3, 164 + drop, P.steel0, 2);
    serviceLamp(g, trolley, 149, signal, !sealed);
    if (danger || sealed) {
      // The brake physically closes; this remains readable without movement or warning colour.
      g.line(trolley - 8, 145, trolley - 3, 150, P.ivory3, 2);
      g.line(trolley + 8, 145, trolley + 3, 150, P.ivory3, 2);
    }
    for (let i = 0; i < 5; i++) serviceLamp(g, 67 + i * 35, 147, signal, !sealed && (restored || i === 0 || i === 3));
  });
  // A single local maintenance car follows a visibly sagging cable, then waits out of sight. No busy traffic.
  g.alpha(0.4, () => {
    const cableY = (x: number) => 136 + 14 * Math.sin((x - 564) / 318 * Math.PI);
    for (let x = 564; x < 884; x += 4) g.line(x, cableY(x), x + 4, cableY(x + 4), P.steel0);
    if (!sealed && !danger) {
      const travel = (t + 13) % 84;
      if (travel < 38) {
        const x = 570 + travel / 38 * 304;
        const y = cableY(x);
        g.rect(x - 3, y - 2, 7, 4, P.brass4);
        g.vline(x, y + 1, 6, P.steel1);
        g.rect(x - 6, y + 6, 13, 8, P.ink2);
        g.hline(x - 6, y + 6, 13, P.copper3);
        g.rect(x + 3, y + 8, 2, 2, restored ? P.teal2 : P.amber2);
      }
    }
    if (sealed) {
      g.rect(710, 139, 14, 18, P.ink1);
      g.line(710, 140, 723, 156, P.ember3, 2);
      serviceLamp(g, 717, 140, P.ember2, true);
    }
  });
}

function glassMachinery(g: Gfx, t: number, sealed: boolean, restored: boolean, danger: boolean, signal: string) {
  const period = danger ? 11 : 23;
  const phase = t % period;
  const sweeping = !sealed && !restored && phase < 4.5;
  for (const [i, x] of [128, 786].entries()) {
    const echo = Math.max(0, 1 - Math.abs(phase - 5 - i * 0.8) / 1.8);
    const sway = settings.reducedMotion || sealed || restored ? 0 : Math.sin(t * 2.4 - i) * echo * 3;
    g.alpha(0.75, () => {
      g.rect(x - 16, 116, 34, 7, P.ink1);
      g.hline(x - 16, 116, 34, P.brass4);
      g.line(x - 10, 122, x - 10 + sway, 159, P.ink4);
      g.line(x + 11, 122, x + 11 + sway, 159, P.ink4);
      g.rect(x - 12 + sway, 152, 26, 19, P.ink1);
      const open = restored ? 9 : sealed ? 0 : Math.round(3 + echo * 5);
      g.rect(x - 10 + sway, 155, 9 - open / 2, 13, P.violet4);
      g.rect(x + 3 + open / 2 + sway, 155, 9 - open / 2, 13, P.violet4);
      g.vline(x + sway, 154, 15, sealed ? P.steel0 : restored ? P.teal3 : P.violet2);
      if (danger || sealed) {
        g.line(x - 7 + sway, 157, x + 7 + sway, 168, P.steel1);
        g.line(x + 7 + sway, 157, x - 7 + sway, 168, P.steel1);
      }
      serviceLamp(g, x + sway, 173, signal, !sealed || i === 0);
    });
    if (sweeping && !settings.reducedMotion) {
      // A thin cone from an actual suspended optic, with a long silent interval between sweeps.
      const targetX = x + (i ? -1 : 1) * (100 + phase * 58);
      g.alpha(danger ? 0.06 : 0.035, () => {
        const c = g.ctx;
        c.fillStyle = danger ? P.ember1 : P.violet0;
        c.beginPath();
        c.moveTo(x, 170);
        c.lineTo(targetX - 22, 362);
        c.lineTo(targetX + 22, 362);
        c.closePath();
        c.fill();
      });
    }
  }
}

function heartMachinery(g: Gfx, t: number, sealed: boolean, restored: boolean, danger: boolean, signal: string) {
  for (const [index, x] of [76, 722].entries()) {
    g.alpha(0.82, () => {
      // Conduit channels visibly feed a pressure shutter, with depleted reserve lamps between healthy ones.
      g.rect(x, 103, 162, 6, P.ink1);
      g.hline(x, 103, 162, P.copper4);
      for (let k = 0; k < 10; k++) {
        const exhausted = (k + index) % 4 === 2;
        const passing = settings.reducedMotion || restored || (Math.floor(t * 0.6) + k) % 10 < 4;
        const on = !sealed && (restored || !exhausted && passing);
        g.rect(x + 5 + k * 15, 105, 8, 2, on ? signal : P.ink3);
      }
      g.rect(x + 47, 109, 69, 48, P.ink1);
      g.box(x + 47, 109, 69, 48, P.copper4);
      const opening = restored ? 1 : sealed || danger ? 0 : Math.max(0, Math.sin(t * 0.16 + index) - 0.65) * 1.5;
      const gap = Math.round(opening * 14);
      g.rect(x + 53, 116, 57, 32, restored ? P.ink3 : P.ember4);
      for (let k = 0; k < 4; k++) {
        const y = 117 + k * 8;
        g.rect(x + 53, y, 28 - gap, 6, P.ink2);
        g.rect(x + 82 + gap, y, 28 - gap, 6, P.ink2);
        g.hline(x + 53, y, 28 - gap, P.copper4);
        g.hline(x + 82 + gap, y, 28 - gap, P.copper4);
      }
      serviceLamp(g, x + 81, 153, signal, true);
      if (danger || sealed) {
        g.rect(x + 77, 121, 8, 18, P.steel0);
        g.hline(x + 78, 122, 6, P.ivory3);
      }
    });
    if (!sealed && !restored && !settings.reducedMotion) {
      g.alpha(0.1, () => {
        for (let k = 0; k < 5; k++) {
          const rise = (t * 3 + k * 9 + index * 17) % 40;
          const dx = Math.sin(rise * 0.14 + k) * 7;
          g.hline(x + 67 + k * 5 + dx, 116 - rise, 5, P.copper2);
        }
      });
    }
  }
}

/** Five authored landmarks per region. Quiet stops consistently reach the refuge; ordinary berths vary by identity. */
export function stageBg(stage: StageIndex, variant: number, location?: { id?: number; kind?: string; hazard?: HazardId }): string {
  const refuge = location?.kind === "bench" || location?.kind === "refuge";
  const letter = refuge || stage === 1 && location?.hazard === "sun-glare" ? "e"
    : location?.id != null ? "abcde"[(Math.abs(location.id) + variant * 2) % 5]
    : "ade"[Math.abs(variant) % 3];
  return `bg/s${stage}-${letter}`;
}

/** Deterministic twinkling stars drawn over a backdrop, at backing-pixel size. */
export function twinkle(g: Gfx, t: number, seed: number, n = 26, maxY = 300) {
  if (study && !study.fx) return;
  if (settings.reducedMotion) t = 0;
  if (sceneCell) {
    // over a pixel-art scene the stars sit on its art-pixel grid, one art pixel each
    const rng = new Rng(seed);
    const k = sceneCell;
    for (let i = 0; i < n; i++) {
      const x = Math.floor(rng.int(0, 1919) / 2 / k) * k;
      const y = Math.floor(rng.int(0, maxY * 2) / 2 / k) * k;
      const ph = rng.range(0, Math.PI * 2);
      const sp = rng.range(0.5, 1.6);
      const v = Math.sin(t * sp + ph);
      if (v > 0.6) g.alpha(v > 0.9 ? 0.9 : 0.55, () => {
        g.ctx.fillStyle = v > 0.9 ? P.ivory1 : P.steel2;
        g.ctx.fillRect(x, y, k, k); // g.rect would round the 1.5-unit grid
      });
    }
    return;
  }
  const rng = new Rng(seed);
  const c = g.ctx;
  for (let i = 0; i < n; i++) {
    const x = rng.int(0, 1919) / 2;
    const y = rng.int(0, maxY * 2) / 2;
    const ph = rng.range(0, Math.PI * 2);
    const sp = rng.range(0.5, 1.6);
    const v = Math.sin(t * sp + ph);
    if (v > 0.4) {
      c.fillStyle = v > 0.85 ? P.ivory0 : P.steel3;
      c.fillRect(x, y, 0.5, 0.5);
      if (v > 0.93) {
        c.fillStyle = P.steel1;
        c.fillRect(x - 0.5, y, 1.5, 0.5);
        c.fillRect(x, y - 0.5, 0.5, 1.5);
        c.fillStyle = P.ivory0;
        c.fillRect(x, y, 0.5, 0.5);
      }
    }
  }
}

export function rgbOf(h: string) {
  return hexToRgb(h);
}

/** Weather in front of the actual hulls, below all HUD and controls. The back layer comes from drawBackdrop.
 * Reduced motion freezes geometry and preserves the source and hazard silhouette without pulsing or strobing. */
export function drawForeground(g: Gfx, stage: StageIndex, hazard: HazardId | undefined, time: number,
  reducedMotion = settings.reducedMotion, intensity = 1) {
  if (sceneCell) {
    const cell = sceneCell;
    onArtGrid(g, cell, (lg) => drawWeather(lg, stage, hazard, reducedMotion ? 0 : time, true, reducedMotion, intensity));
    return;
  }
  drawWeather(g, stage, hazard, reducedMotion ? 0 : time, true, reducedMotion, intensity);
}

function weatherGlow(g: Gfx, x: number, y: number, rx: number, ry: number, color: string, alpha: number) {
  const c = g.ctx;
  g.alpha(alpha, () => {
    c.fillStyle = color;
    for (let ring = 7; ring > 0; ring--) {
      c.beginPath();
      c.ellipse(x, y, rx * ring / 7, ry * ring / 7, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
}

function lightRay(g: Gfx, x: number, y: number, tx: number, ty: number, width: number, color: string, alpha: number) {
  const c = g.ctx;
  g.alpha(alpha, () => {
    c.fillStyle = color;
    c.beginPath(); c.moveTo(x - 1, y); c.lineTo(tx - width, ty); c.lineTo(tx + width, ty); c.lineTo(x + 1, y);
    c.closePath(); c.fill();
  });
}

/** Where the sun is: painted in the sunward refuge (bg/s1-e, art (47, 236) at 3x); elsewhere (fights) it sits low on
 * the far horizon just beyond the left edge, where the Copper scenes carry their copper glow. */
const SUN_AT: Record<string, { x: number; y: number }> = { "bg/s1-e": { x: 71, y: 354 } };
const SUN_DEFAULT = { x: 24, y: 384 };

function sunWeather(g: Gfx, t: number, front: boolean, reduced: boolean, intensity: number) {
  const { x, y } = SUN_AT[currentBg] ?? SUN_DEFAULT;
  const shimmer = reduced ? 1 : 0.95 + Math.sin(t * 0.75) * 0.05;
  if (!front) {
    // Corona and rays around the painted sun.
    weatherGlow(g, x, y, 136, 94, P.amber1, 0.035 * intensity);
    weatherGlow(g, x, y, 65, 57, P.amber0, 0.055 * intensity);
    for (let i = 0; i < 18; i++) {
      const angle = i * Math.PI * 2 / 18 + (reduced ? 0 : Math.sin(t * 0.06) * 0.025);
      const reach = 80 + i % 4 * 19;
      const tx = x + Math.cos(angle) * reach, ty = y + Math.sin(angle) * reach * 0.7;
      lightRay(g, x, y, tx, ty, 3 + i % 3, P.amber1, 0.085 * intensity);
    }
    // (the painted sun belongs to the scene art; no drawn disk and no black "eclipse" vane over it)
    g.alpha(0.38 * intensity, () => {
      g.hline(x - 211, y + 7, 422, P.amber2);
      g.hline(x - 111, y + 9, 235, P.ivory1);
      g.hline(x - 73, y - 4, 145, P.amber0);
    });
    for (const [tx, width] of [[226, 46], [530, 20], [890, 68]]) {
      lightRay(g, x - 9, y + 15, tx, 414, width, P.amber1, 0.027 * intensity);
    }
  } else {
    // Long diagonal rays and discrete lens ghosts make the glare visibly pass in front of the tender.
    // Low glare along the horizon, and lens ghosts on the axis from the sun through the screen centre.
    lightRay(g, x, y + 4, 586, y - 40, 26, P.amber0, 0.038 * shimmer * intensity);
    lightRay(g, x, y + 4, 864, y - 12, 34, P.amber1, 0.04 * shimmer * intensity);
    const ax = 480 - x, ay = 270 - y;
    weatherGlow(g, x + ax * 1.05, y + ay * 1.05, 41, 14, P.amber1, 0.009 * intensity);
    g.alpha(0.08 * intensity, () => {
      g.circle(x + ax * 0.45, y + ay * 0.45, 14, P.amber1);
      g.circle(x + ax * 0.75, y + ay * 0.75, 22, P.amber2);
      g.circle(x + ax * 1.35, y + ay * 1.35, 10, P.teal2);
    });
    g.alpha(0.2 * intensity, () => {
      g.hline(x - 60, y - 2, 365, P.ivory0);
      g.hline(x - 48, y, 232, P.amber1);
    });
  }
}

function fogWeather(g: Gfx, t: number, front: boolean, strength: number, rust = false) {
  const c = g.ctx;
  const banks = front ? 3 : 5;
  for (let bank = 0; bank < banks; bank++) {
    const shift = (t * (front ? 8 : 2.5) + bank * 193) % 1140;
    const base = front ? 324 + bank * 29 : 171 + bank * 54;
    g.alpha((front ? 0.07 : 0.13) * strength, () => {
      c.fillStyle = rust ? bank % 2 ? P.copper2 : P.amber3 : bank % 2 ? P.violet1 : P.steel2;
      c.beginPath(); c.moveTo(-30, base + 22);
      for (let px = -30; px <= 990; px += 15) {
        c.lineTo(px, base + Math.sin((px + shift) / 87) * 14 + Math.sin((px - shift * 0.35) / 31) * 4);
      }
      c.lineTo(990, base + (front ? 26 : 38)); c.lineTo(-30, base + (front ? 26 : 38)); c.closePath(); c.fill();
    });
  }
}

function drawWeather(g: Gfx, stage: StageIndex, hazard: HazardId | undefined, time: number,
  front: boolean, reduced: boolean, intensity: number) {
  const t = reduced ? 0 : time;
  const seed = hashString(hazard ?? `ambient-${stage}`) + (front ? 731 : 0);
  const rng = new Rng(seed);
  const c = g.ctx;
  g.clip(0, 56, 960, 348, () => {
    if (hazard === "sun-glare") { sunWeather(g, t, front, reduced, intensity); return; }
    if (hazard === "glass-fog") { fogWeather(g, t, front, intensity); return; }
    if (hazard === "dark-stretch") {
      if (!front) {
        g.alpha(0.27 * intensity, () => g.rect(0, 56, 960, 348, P.ink0));
        for (const x of [40, 238, 760, 916]) {
          g.rect(x - 2, 101, 6, 9, P.ink1);
          g.line(x - 3, 101, x + 4, 110, P.ember3);
        }
      } else {
        // The dead stretch extinguishes distant lamps, while two local beacons keep decks readable.
        weatherGlow(g, 31, 270, 53, 90, P.amber2, 0.018 * intensity);
        weatherGlow(g, 935, 192, 43, 87, P.ember2, 0.014 * intensity);
        g.alpha(0.22 * intensity, () => { g.rect(0, 56, 15, 348, P.ink0); g.rect(947, 56, 13, 348, P.ink0); });
      }
      return;
    }
    if (hazard === "sealing-lattice") {
      const beam = front ? 1.5 : 3;
      for (let k = 0; k < (front ? 4 : 8); k++) {
        const x = -135 + k * (front ? 346 : 162);
        g.alpha((front ? 0.16 : 0.42) * intensity, () => {
          g.line(x, 56, x + 202, 404, P.ink0, beam + 4);
          g.line(x + 92, 56, x - 110, 404, P.ink0, beam + 4);
          g.line(x, 56, x + 202, 404, P.ember3, beam);
          g.line(x + 92, 56, x - 110, 404, P.copper3, beam);
        });
        const progress = reduced ? 0.43 : (t * 0.065 + k * 0.19) % 1;
        g.alpha(0.5 * intensity, () => g.rect(x + progress * 202 - 2, 56 + progress * 348, 4, 8, P.ember1));
      }
      return;
    }
    if (hazard === "resonance" || hazard === "ringing-panes") {
      if (!front) {
        for (const x of [96, 857]) {
          g.line(x, 58, x, 138, P.steel0);
          g.box(x - 17, 125, 34, 48, P.violet2, 2);
          g.line(x - 14, 128, x + 14, 171, P.violet1);
          g.rect(x - 3, 138, 6, 23, P.violet0);
        }
      }
      for (let k = 0; k < (front ? 2 : 4); k++) {
        const pulse = reduced ? 0.48 + k * 0.16 : (t * 0.22 + k * 0.24) % 1;
        const radius = 26 + pulse * 210;
        g.alpha((front ? 0.035 : 0.13) * (1 - pulse * 0.55) * intensity, () => {
          c.strokeStyle = P.violet1; c.lineWidth = front ? 2 : 3;
          for (const x of [96, 857]) { c.beginPath(); c.ellipse(x, 150, radius, radius * 0.65, 0, 0, Math.PI * 2); c.stroke(); }
        });
      }
      if (hazard === "resonance") return;
    }
    const rubble = hazard === "debris-field";
    const rust = hazard === "rust-squall";
    const embers = hazard === "ember-draft";
    const glass = hazard === "ringing-panes";
    // Ambient layers remain present without a hazard: sparse warm dust, optical motes, or drifting ash.
    const n = front ? rubble ? 12 : rust ? 42 : embers ? 35 : glass ? 12 : 7
      : rubble ? 30 : rust ? 96 : embers ? 65 : glass ? 24 : 21;
    for (let i = 0; i < n; i++) {
      const speed = (front ? 12 : 3) * (0.5 + rng.next()) * (rust ? 2.8 : 1);
      const startX = rng.range(-80, 1040), startY = rng.range(52, 440);
      const driftX = embers ? t * speed * 0.35 : t * speed;
      const driftY = embers ? -t * speed : rust ? t * speed * 0.36 : t * speed * 0.12;
      const x = ((startX + driftX + 1120) % 1120) - 80;
      const y = ((startY + driftY + 388 * 100) % 388) + 38;
      const size = rubble ? (front ? 7 : 2) + rng.int(0, front ? 12 : 5) : glass ? 3 + rng.int(0, 5)
        : front ? embers ? 2 + i % 2 : 2 : 1;
      // Keep large near objects at the sides and in the gutter below the tender's working decks.
      if (front && rubble && x > 145 && x < 819 && y > 124 && y < 323) continue;
      const col = rust ? (i % 3 ? P.copper2 : P.amber3) : embers ? (i % 4 ? P.ember1 : P.amber0)
        : glass ? P.violet1 : rubble ? (i % 2 ? P.steel0 : P.copper3) : stage === 2 ? P.violet2 : stage === 3 ? P.ember2 : P.copper1;
      g.alpha((front ? rubble ? 0.83 : 0.48 : rubble ? 0.56 : 0.36) * intensity, () => {
        if (rubble || glass) {
          c.fillStyle = col; c.beginPath();
          c.moveTo(x - size, y); c.lineTo(x - size * 0.45, y - size * 0.58);
          c.lineTo(x + size * 0.7, y - size * 0.45); c.lineTo(x + size, y + size * 0.37);
          c.lineTo(x - size * 0.3, y + size * 0.7); c.closePath(); c.fill();
          g.line(x - size * 0.5, y - size * 0.46, x + size * 0.6, y - size * 0.35, glass ? P.violet0 : P.ivory3);
        } else {
          g.rect(x, y, size, size, col);
          if (rust) g.line(x - (front ? 10 : 4), y - (front ? 3 : 1), x, y, col);
          if (embers) {
            g.line(x, y + (front ? 13 : 6), x + 1, y + 1, P.copper2, front ? 1.5 : 1);
            if (front && i % 5 === 0) weatherGlow(g, x, y, 7, 9, P.amber1, 0.024);
          }
        }
      });
    }
    if (rust && !front) {
      g.alpha(0.075 * intensity, () => g.rect(0, 56, 960, 348, P.copper2));
      fogWeather(g, t * 2, false, 0.38 * intensity, true);
    }
  });
}
