// Backgrounds: key art from public/art (HD, drawn with g.cover), with code-painted HD fallbacks (1920×1080 canvases,
// cached, marked HD) until the art workstream delivers — fine stars, the Line's arc of lamps with the Faultline gap,
// spires over a soft layered cloud sea with many tones, stage light (copper, violet glass, ember), Relay Seven.
import type { Gfx } from "../core/gfx";
import { art, markHD } from "../core/assets";
import { P, hexToRgb } from "../core/palette";
import { Rng, hashString } from "../core/rng";
import type { StageIndex } from "../game/ids";

export type BackdropKind = "space" | "title" | "interior" | "quiet" | "chart" | "ending" | "carrier";

export interface BackdropSpec {
  kind: BackdropKind;
  stage?: StageIndex;
  seed?: number;
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

/** Draw a full-screen background: `public/art/<id>.png` (HD, g.cover) when present, otherwise the painted fallback. */
export function drawBackdrop(g: Gfx, id: string | null, spec: BackdropSpec, dx = 0, dy = 0) {
  const img = id ? art(id) : null;
  if (img) {
    g.cover(img, 1, dx, dy);
    return true;
  }
  g.cover(paint(spec), 1, dx, dy);
  return false;
}

/** Stage backdrop id for a relay (bg/s<n>-a|b|c). */
export function stageBg(stage: StageIndex, variant: 0 | 1 | 2): string {
  return `bg/s${stage}-${"abc"[variant]}`;
}

/** Deterministic twinkling stars drawn over a backdrop, at backing-pixel size. */
export function twinkle(g: Gfx, t: number, seed: number, n = 26, maxY = 300) {
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
