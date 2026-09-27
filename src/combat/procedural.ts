// Procedural hulls (fallback until the art workstream's painting for a car/enemy exists): rendered once into a cached
// HD canvas (2 px per layout unit) in the same material language as the painted Lamplighter — ivory panels in brass
// frames, rivets, teal pipes, rust, a dark belly, trolley and grip on the roof. Serious, weathered, functional.
import { markHD } from "../core/assets";
import { P } from "../core/palette";
import type { HullMeta } from "../data/hulls";
import { TILE } from "../data/layouts";

interface Mat {
  panel: string;
  panelLo: string;
  panelHi: string;
  frame: string;
  frameHi: string;
  frameLo: string;
  belly: string;
  bellyHi: string;
  rust: string;
  pipe: string;
  pipeHi: string;
  lamp: string;
}

const MATS: Record<string, Mat> = {
  player: { panel: P.ivory1, panelLo: P.ivory2, panelHi: P.ivory0, frame: P.brass3, frameHi: P.brass2, frameLo: P.brass4, belly: P.ink3, bellyHi: P.ink4, rust: P.copper2, pipe: P.teal3, pipeHi: P.teal2, lamp: P.amber2 },
  copper: { panel: P.copper2, panelLo: P.copper3, panelHi: P.copper1, frame: P.verd3, frameHi: P.verd2, frameLo: P.verd4, belly: P.ink2, bellyHi: P.ink3, rust: P.copper4, pipe: P.verd2, pipeHi: P.verd1, lamp: P.amber2 },
  verd: { panel: P.verd2, panelLo: P.verd3, panelHi: P.verd1, frame: P.copper2, frameHi: P.copper1, frameLo: P.copper3, belly: P.ink2, bellyHi: P.ink3, rust: P.copper3, pipe: P.brass3, pipeHi: P.brass2, lamp: P.amber2 },
  rust: { panel: P.copper3, panelLo: P.copper4, panelHi: P.copper2, frame: P.brass4, frameHi: P.brass3, frameLo: P.brass5, belly: P.ink1, bellyHi: P.ink2, rust: P.copper4, pipe: P.steel0, pipeHi: P.steel1, lamp: P.ember2 },
  brass: { panel: P.brass3, panelLo: P.brass4, panelHi: P.brass2, frame: P.brass5, frameHi: P.brass4, frameLo: P.ink1, belly: P.ink2, bellyHi: P.ink3, rust: P.copper3, pipe: P.steel1, pipeHi: P.steel2, lamp: P.amber1 },
  iron: { panel: P.steel0, panelLo: P.ink4, panelHi: P.steel1, frame: P.ink3, frameHi: P.ink5, frameLo: P.ink1, belly: P.ink1, bellyHi: P.ink2, rust: P.copper3, pipe: P.brass4, pipeHi: P.brass3, lamp: P.ember2 },
  violet: { panel: P.violet3, panelLo: P.violet4, panelHi: P.violet2, frame: P.ink3, frameHi: P.ink5, frameLo: P.ink1, belly: P.ink1, bellyHi: P.ink2, rust: P.violet4, pipe: P.violet1, pipeHi: P.violet0, lamp: P.violet0 },
  glass: { panel: P.violet2, panelLo: P.violet3, panelHi: P.violet1, frame: P.brass4, frameHi: P.brass3, frameLo: P.brass5, belly: P.ink2, bellyHi: P.ink3, rust: P.violet4, pipe: P.teal3, pipeHi: P.teal2, lamp: P.violet0 },
  ember: { panel: P.ember3, panelLo: P.ember4, panelHi: P.ember2, frame: P.ink2, frameHi: P.ink4, frameLo: P.ink0, belly: P.ink1, bellyHi: P.ink2, rust: P.ember4, pipe: P.brass4, pipeHi: P.brass3, lamp: P.ember1 },
  black: { panel: P.ink3, panelLo: P.ink2, panelHi: P.ink4, frame: P.ink1, frameHi: P.ink5, frameLo: P.ink0, belly: P.ink1, bellyHi: P.ink2, rust: P.ember4, pipe: P.ember3, pipeHi: P.ember2, lamp: P.ember2 },
  ivory: { panel: P.ivory2, panelLo: P.ivory3, panelHi: P.ivory1, frame: P.brass3, frameHi: P.brass2, frameLo: P.brass4, belly: P.ink3, bellyHi: P.ink4, rust: P.copper2, pipe: P.teal3, pipeHi: P.teal2, lamp: P.amber2 },
};

const cache = new Map<string, HTMLCanvasElement>();

function rng(seed: number) {
  let h = seed || 1;
  return () => {
    h = (h * 16807) % 2147483647;
    return h / 2147483647;
  };
}

export interface HullSpec {
  id: string;
  meta: HullMeta;
  cols: number;
  rows: number;
  tint: string;
  face: 1 | -1;
  kind: "lead" | "rear" | "keel" | "crawler" | "installation" | "flier";
}

/** A cached HD canvas of the procedural hull for this spec. */
export function proceduralHull(s: HullSpec): HTMLCanvasElement {
  const key = `${s.id}|${s.meta.w}x${s.meta.h}|${s.tint}|${s.kind}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  const D = 2;
  c.width = Math.ceil(s.meta.w * D);
  c.height = Math.ceil(s.meta.h * D);
  const x = c.getContext("2d")!;
  const R = (px: number, py: number, w: number, h: number, col: string) => {
    x.fillStyle = col;
    x.fillRect(Math.round(px * D), Math.round(py * D), Math.max(1, Math.round(w * D)), Math.max(1, Math.round(h * D)));
  };
  /** Image-pixel rect (fine detail). */
  const r1 = (px: number, py: number, w: number, h: number, col: string) => {
    x.fillStyle = col;
    x.fillRect(Math.round(px), Math.round(py), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  };
  const m = MATS[s.tint] ?? MATS.iron;
  const rand = rng(hashKey(key));
  const gw = s.cols * TILE;
  const gh = s.rows * TILE;
  const pad = s.kind === "keel" ? 7 : 9;
  const bx = s.meta.gx - pad;
  const by = s.meta.gy - pad;
  const bw = gw + pad * 2;
  const bh = gh + pad * 2 + 3;
  const noseLen = s.kind === "lead" ? Math.max(12, s.meta.w - (s.meta.gx + gw + pad) - 4) : s.kind === "crawler" || s.kind === "flier" ? 14 : 0;
  // ── suspension: trolley and hangers up to the carrier
  if (s.meta.cable && (s.kind === "lead" || s.kind === "rear" || s.kind === "crawler")) {
    const cx = s.meta.cable.x;
    const cy = s.meta.cable.y;
    const tw = s.kind === "rear" ? 44 : 70;
    for (const hx of [cx - tw / 2 + 6, cx + tw / 2 - 8]) {
      R(hx, cy + 8, 3, by - cy - 8, P.ink0);
      R(hx + 0.5, cy + 8, 1.5, by - cy - 8, m.frameHi);
    }
    R(cx - tw / 2, cy + 4, tw, 9, P.ink0);
    R(cx - tw / 2 + 1, cy + 5, tw - 2, 7, m.frame);
    R(cx - tw / 2 + 1, cy + 5, tw - 2, 1.5, m.frameHi);
    R(cx - 10, cy - 2, 20, 8, m.frameLo);
    for (const wx of [cx - tw / 2 + 6, cx + tw / 2 - 6]) {
      circle(x, wx * D, (cy + 1) * D, 6 * D, P.ink0);
      circle(x, wx * D, (cy + 1) * D, 4.5 * D, P.ink3);
      circle(x, wx * D, (cy + 1) * D, 2 * D, P.steel1);
    }
  }
  if (s.kind === "keel" && s.meta.hangTop) {
    const hx = s.meta.hangTop.x;
    for (const o of [-18, 16]) R(hx + o, 0, 3, by + 1, P.ink0), R(hx + o + 0.5, 0, 1.5, by + 1, m.frameHi);
  }
  if (s.kind === "flier") {
    for (const rx of [bx + 22, bx + bw - 22]) {
      R(rx - 1.5, by - 16, 3, 16, P.ink0);
      R(rx - 20, by - 18, 40, 2, P.steel2);
      R(rx - 4, by - 20, 8, 5, m.frameLo);
    }
  }
  if (s.kind === "installation") {
    const ax = bx + bw / 2;
    R(ax - 14, by + bh, 28, s.meta.h - (by + bh), P.ink1);
    R(ax - 14, by + bh, 3, s.meta.h - (by + bh), P.ink3);
    R(ax + 11, by + bh, 3, s.meta.h - (by + bh), P.ink3);
    for (let yy = by + bh; yy < s.meta.h - 4; yy += 16) {
      for (let k = 0; k < 16; k++) {
        r1((ax - 12 + (k / 16) * 24) * D, (yy + k) * D, D, D, P.ink3);
        r1((ax + 12 - (k / 16) * 24) * D, (yy + k) * D, D, D, P.ink3);
      }
    }
  }
  // ── body: outline, panels in frames, belly band
  roundRect(x, bx * D, by * D, bw * D, bh * D, 7 * D, P.ink0);
  roundRect(x, (bx + 1) * D, (by + 1) * D, (bw - 2) * D, (bh - 2) * D, 6 * D, m.frameLo);
  roundRect(x, (bx + 2) * D, (by + 2) * D, (bw - 4) * D, (bh - 4) * D, 5 * D, m.panel);
  // Panels between the frame lines (one column per tile, one row per deck), shaded top-left light.
  const colW = TILE;
  for (let py = 0; py <= s.rows; py++) {
    const yy = s.meta.gy + py * TILE - (py === 0 ? pad - 2 : 0);
    R(bx + 2, yy - 1, bw - 4, 2.5, m.frame);
    R(bx + 2, yy - 1, bw - 4, 0.5, m.frameHi);
  }
  for (let cx = s.meta.gx; cx <= s.meta.gx + gw + 0.1; cx += colW) {
    R(cx - 1, by + 2, 2.5, bh - 4, m.frame);
    R(cx - 1, by + 2, 0.5, bh - 4, m.frameHi);
    for (let ry = by + 5; ry < by + bh - 4; ry += 6) r1((cx + 0.5) * D, ry * D, 2, 2, m.frameHi);
  }
  // Weathering: panel shade, rust speckle.
  for (let i = 0; i < (bw * bh) / 60; i++) {
    const px = bx + 3 + rand() * (bw - 6);
    const py = by + 3 + rand() * (bh - 6);
    r1(px * D, py * D, 1 + Math.floor(rand() * 3), 1 + Math.floor(rand() * 2), rand() < 0.6 ? m.panelLo : m.rust);
  }
  // Belly band and skirt.
  R(bx + 3, by + bh - 7, bw - 6, 5, m.belly);
  R(bx + 3, by + bh - 7, bw - 6, 0.5, m.bellyHi);
  for (let k = bx + 10; k < bx + bw - 10; k += 22) R(k, by + bh - 2, 12, 3, P.ink1);
  // Roof trim.
  R(bx + 6, by + 1, bw - 12, 1.5, m.panelHi);
  // A teal pipe run along the upper deck with elbows.
  const pipeY = by + 5;
  R(bx + 14, pipeY, bw * 0.55, 2, m.pipe);
  R(bx + 14, pipeY, bw * 0.55, 0.5, m.pipeHi);
  R(bx + 14 + bw * 0.55, pipeY, 2, 10, m.pipe);
  R(bx + 12, pipeY - 1, 4, 4, m.frameLo);
  // ── nose / cab
  if (noseLen > 0) {
    const nx = s.face > 0 ? bx + bw - 2 : bx + 2;
    const ny = by + 6;
    const nh = bh - 14;
    for (let i = 0; i < noseLen; i++) {
      const f = i / noseLen;
      const h = nh * (1 - f * f * 0.75);
      const yy = ny + (nh - h) * 0.55;
      const xx = nx + s.face * i;
      R(xx, yy, 1, h, i === noseLen - 1 ? P.ink0 : f < 0.15 ? m.frameLo : m.panel);
      R(xx, yy, 1, 0.5, P.ink0);
      R(xx, yy + h - 0.5, 1, 0.5, P.ink0);
    }
    if (s.kind === "lead") {
      // Cab window and the lamp cupola.
      const wx = s.face > 0 ? nx + 2 : nx - 12;
      R(wx, ny + 6, 10, 12, P.ink0);
      R(wx + 1, ny + 7, 8, 10, P.brass4);
      R(wx + 1.5, ny + 7.5, 7, 9, m.lamp);
      const lx = nx + s.face * (noseLen - 9);
      circle(x, lx * D, (ny + nh * 0.62) * D, 8 * D, P.ink0);
      circle(x, lx * D, (ny + nh * 0.62) * D, 6.5 * D, P.brass3);
      circle(x, lx * D, (ny + nh * 0.62) * D, 5 * D, m.lamp);
      circle(x, (lx - 1.5) * D, (ny + nh * 0.62 - 1.5) * D, 2 * D, P.amber0);
    }
  }
  // Couplers.
  if (s.kind === "rear" && s.meta.couplerFront) R(s.meta.couplerFront.x - 5, s.meta.couplerFront.y - 3, 6, 6, P.ink0);
  if (s.kind === "lead" && s.meta.couplerRear) R(s.meta.couplerRear.x, s.meta.couplerRear.y - 4, 6, 8, P.ink0);
  cache.set(key, c);
  return markHD(c, D);
}

function hashKey(k: string): number {
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619);
  return (h >>> 0) % 2147483646 + 1;
}

function roundRect(x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number, col: string) {
  x.fillStyle = col;
  const R = Math.round(r);
  for (let yy = 0; yy < h; yy++) {
    let inset = 0;
    if (yy < R) inset = R - Math.round(Math.sqrt(R * R - (R - yy) * (R - yy)));
    else if (yy > h - R) inset = R - Math.round(Math.sqrt(R * R - (yy - (h - R)) * (yy - (h - R))));
    x.fillRect(Math.round(px + inset), Math.round(py + yy), Math.round(w - inset * 2), 1);
  }
}

function circle(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string) {
  x.fillStyle = col;
  for (let yy = -r; yy <= r; yy++) {
    const w = Math.round(Math.sqrt(Math.max(0, r * r - yy * yy)));
    x.fillRect(Math.round(cx - w), Math.round(cy + yy), w * 2, 1);
  }
}
