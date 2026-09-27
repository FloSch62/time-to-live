// Pixel-crisp drawing helpers on the logical 960×540 context.
import { atlas, atlasScale, density, type Atlas, type AtlasFrame } from "./assets";
import { drawText, type TextOpts } from "./font";
import { P } from "./palette";

export type Ctx = CanvasRenderingContext2D;

export class Gfx {
  /** Seconds since start (for animations). */
  time = 0;
  constructor(readonly ctx: Ctx) {}

  rect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** 1-px outline inside the given box. */
  box(x: number, y: number, w: number, h: number, color: string, t = 1) {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    const c = this.ctx;
    c.fillStyle = color;
    c.fillRect(x, y, w, t);
    c.fillRect(x, y + h - t, w, t);
    c.fillRect(x, y + t, t, h - 2 * t);
    c.fillRect(x + w - t, y + t, t, h - 2 * t);
  }

  hline(x: number, y: number, w: number, color: string) {
    this.rect(x, y, w, 1, color);
  }
  vline(x: number, y: number, h: number, color: string) {
    this.rect(x, y, 1, h, color);
  }

  /** Bresenham line of 1-px squares (thickness t). */
  line(x0: number, y0: number, x1: number, y1: number, color: string, t = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const c = this.ctx;
    c.fillStyle = color;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const o = Math.floor(t / 2);
    for (let guard = 0; guard < 4000; guard++) {
      c.fillRect(x0 - o, y0 - o, t, t);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Midpoint circle outline (or filled). */
  circle(cx: number, cy: number, r: number, color: string, fill = false) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    r = Math.round(r);
    const c = this.ctx;
    c.fillStyle = color;
    let x = r;
    let y = 0;
    let err = 1 - r;
    while (x >= y) {
      if (fill) {
        c.fillRect(cx - x, cy + y, 2 * x + 1, 1);
        c.fillRect(cx - x, cy - y, 2 * x + 1, 1);
        c.fillRect(cx - y, cy + x, 2 * y + 1, 1);
        c.fillRect(cx - y, cy - x, 2 * y + 1, 1);
      } else {
        const pts = [
          [x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y],
        ];
        for (const [px, py] of pts) c.fillRect(cx + px, cy + py, 1, 1);
      }
      y++;
      if (err < 0) err += 2 * y + 1;
      else {
        x--;
        err += 2 * (y - x) + 1;
      }
    }
  }

  /** Pixel ellipse outline, used for shield bubbles. */
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string, t = 1, dash = 0, phase = 0) {
    const c = this.ctx;
    c.fillStyle = color;
    const steps = Math.max(24, Math.round((rx + ry) * 3));
    let lastX = NaN;
    let lastY = NaN;
    for (let i = 0; i < steps; i++) {
      if (dash > 0 && Math.floor((i + phase) / dash) % 2 === 1) continue;
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(a) * rx);
      const y = Math.round(cy + Math.sin(a) * ry);
      if (x === lastX && y === lastY) continue;
      c.fillRect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t);
      lastX = x;
      lastY = y;
    }
  }

  /**
   * Draw an image at (x, y) in layout units. Its size follows its density (HD art is drawn at half its pixel size,
   * i.e. 1:1 on the 1920×1080 backing store); `scale` multiplies that.
   */
  image(img: CanvasImageSource | null, x: number, y: number, scale = 1, alpha = 1) {
    if (!img) return;
    const d = density(img);
    const w = ((img as HTMLImageElement).width / d) * scale;
    const h = ((img as HTMLImageElement).height / d) * scale;
    const c = this.ctx;
    const a = c.globalAlpha;
    c.globalAlpha = a * alpha;
    c.drawImage(img, snap(x, d / scale), snap(y, d / scale), w, h);
    c.globalAlpha = a;
  }

  /** Draw an image stretched to cover the whole 960×540 screen (backgrounds of any resolution). */
  cover(img: CanvasImageSource | null, alpha = 1, offsetX = 0, offsetY = 0) {
    if (!img) return;
    const iw = (img as HTMLImageElement).width;
    const ih = (img as HTMLImageElement).height;
    const s = Math.max(960 / iw, 540 / ih);
    const c = this.ctx;
    const a = c.globalAlpha;
    c.globalAlpha = a * alpha;
    c.drawImage(img, Math.round((960 - iw * s) / 2 + offsetX), Math.round((540 - ih * s) / 2 + offsetY), iw * s, ih * s);
    c.globalAlpha = a;
  }

  /**
   * Draw part of an image. Source rect in image pixels; destination in layout units at the image's density `d`
   * (pass the atlas scale for HD atlases).
   */
  sub(img: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, x: number, y: number, flipX = false, d = density(img)) {
    const c = this.ctx;
    x = snap(x, d);
    y = snap(y, d);
    const dw = sw / d;
    const dh = sh / d;
    if (!flipX) {
      c.drawImage(img, sx, sy, sw, sh, x, y, dw, dh);
      return;
    }
    c.save();
    c.translate(x + dw, y);
    c.scale(-1, 1);
    c.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    c.restore();
  }

  frame(atlasName: string, frameName: string): AtlasFrame | null {
    return atlas(atlasName)?.frames[frameName] ?? null;
  }

  /** Size of an atlas frame in layout units (frame pixels / atlas scale). */
  frameSize(atlasName: string, frameName: string): { w: number; h: number } | null {
    const a = atlas(atlasName);
    const f = a?.frames[frameName];
    if (!a || !f) return null;
    const s = atlasScale(a);
    return { w: f.w / s, h: f.h / s };
  }

  /**
   * Draw an atlas frame with its anchor at (x, y). Returns false if the atlas/frame is missing (draw a fallback).
   */
  sprite(
    atlasName: string,
    frameName: string,
    x: number,
    y: number,
    opts: { flipX?: boolean; alpha?: number; image?: CanvasImageSource; noAnchor?: boolean } = {},
  ): boolean {
    const a = atlas(atlasName);
    const f = a?.frames[frameName];
    if (!a || !f) return false;
    const s = atlasScale(a);
    const ax = (opts.noAnchor ? 0 : opts.flipX ? f.w - 1 - f.ax : f.ax) / s;
    const ay = (opts.noAnchor ? 0 : f.ay) / s;
    const c = this.ctx;
    const prev = c.globalAlpha;
    if (opts.alpha !== undefined) c.globalAlpha = prev * opts.alpha;
    this.sub(opts.image ?? a.image, f.x, f.y, f.w, f.h, x - ax, y - ay, opts.flipX, s);
    c.globalAlpha = prev;
    return true;
  }

  /** Frame name of an animation at time t (seconds). */
  animFrame(atlasName: string, animName: string, t: number): string | null {
    const a = atlas(atlasName);
    const an = a?.anims[animName];
    if (!an || an.frames.length === 0) return null;
    let i = Math.floor(t * an.fps);
    i = an.loop ? i % an.frames.length : Math.min(i, an.frames.length - 1);
    return an.frames[i];
  }

  anim(
    atlasName: string,
    animName: string,
    t: number,
    x: number,
    y: number,
    opts: { flipX?: boolean; alpha?: number } = {},
  ): boolean {
    const f = this.animFrame(atlasName, animName, t);
    return f ? this.sprite(atlasName, f, x, y, opts) : false;
  }

  animDone(atlasName: string, animName: string, t: number): boolean {
    const an = atlas(atlasName)?.anims[animName];
    if (!an) return true;
    return !an.loop && t * an.fps >= an.frames.length;
  }

  /** 9-slice from the ui atlas; procedural fallback when the atlas isn't there yet. */
  panel(x: number, y: number, w: number, h: number, variant = "panel") {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    const a = atlas("ui");
    const s = a?.slices[variant] ?? (variant !== "panel" ? a?.slices["panel"] : undefined);
    if (a && s) {
      nineSlice(this.ctx, a, s, x, y, w, h);
      return;
    }
    fallbackPanel(this, x, y, w, h, variant);
  }

  text(text: string, x: number, y: number, opts: TextOpts = {}): number {
    return drawText(this.ctx, text, x, y, opts);
  }

  clip(x: number, y: number, w: number, h: number, fn: () => void) {
    const c = this.ctx;
    c.save();
    c.beginPath();
    c.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    c.clip();
    try {
      fn();
    } finally {
      c.restore();
    }
  }

  alpha(a: number, fn: () => void) {
    const c = this.ctx;
    const prev = c.globalAlpha;
    c.globalAlpha = prev * a;
    try {
      fn();
    } finally {
      c.globalAlpha = prev;
    }
  }

  /** Dim the whole screen (modals). */
  dim(a = 0.6, color: string = P.ink0) {
    this.alpha(a, () => this.rect(0, 0, 960, 540, color));
  }
}

/** 9-slice with insets in atlas pixels; the destination is in layout units (atlas scale k = HD atlases). */
function nineSlice(c: Ctx, a: Atlas, s: { x: number; y: number; w: number; h: number; l: number; t: number; r: number; b: number }, x: number, y: number, w: number, h: number) {
  const img = a.image;
  const k = atlasScale(a);
  const { l, t, r, b } = s;
  const cw = s.w - l - r;
  const ch = s.h - t - b;
  const L = l / k, T = t / k, R = r / k, B = b / k;
  const iw = Math.max(0, w - L - R);
  const ih = Math.max(0, h - T - B);
  // corners
  c.drawImage(img, s.x, s.y, l, t, x, y, L, T);
  c.drawImage(img, s.x + s.w - r, s.y, r, t, x + w - R, y, R, T);
  c.drawImage(img, s.x, s.y + s.h - b, l, b, x, y + h - B, L, B);
  c.drawImage(img, s.x + s.w - r, s.y + s.h - b, r, b, x + w - R, y + h - B, R, B);
  // edges and centre are tiled (not stretched) to keep pixels crisp
  tile(c, img, k, s.x + l, s.y, cw, t, x + L, y, iw, T);
  tile(c, img, k, s.x + l, s.y + s.h - b, cw, b, x + L, y + h - B, iw, B);
  tile(c, img, k, s.x, s.y + t, l, ch, x, y + T, L, ih);
  tile(c, img, k, s.x + s.w - r, s.y + t, r, ch, x + w - R, y + T, R, ih);
  tile(c, img, k, s.x + l, s.y + t, cw, ch, x + L, y + T, iw, ih);
}

/** Tile a source rect (image px) over a destination rect (layout units) at scale k (image px per layout unit). */
function tile(c: Ctx, img: CanvasImageSource, k: number, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) {
  if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;
  const tw = sw / k;
  const th = sh / k;
  for (let y = 0; y < dh; y += th) {
    const hh = Math.min(th, dh - y);
    for (let x = 0; x < dw; x += tw) {
      const ww = Math.min(tw, dw - x);
      c.drawImage(img, sx, sy, ww * k, hh * k, dx + x, dy + y, ww, hh);
    }
  }
}

/** Round a layout coordinate to the nearest backing pixel for density d (d = 2 → half units). */
export function snap(v: number, d = 1): number {
  const k = Math.max(1, Math.min(2, d));
  return Math.round(v * k) / k;
}

const FALLBACK: Record<string, { fill: string; outer: string; frame: string; inner: string }> = {
  panel: { fill: P.ink2, outer: P.ink0, frame: P.brass3, inner: P.brass5 },
  "panel-hi": { fill: P.ink3, outer: P.ink0, frame: P.brass1, inner: P.brass4 },
  "panel-danger": { fill: "#1f0d16", outer: P.ink0, frame: P.ember2, inner: P.ember4 },
  "panel-glass": { fill: "#171433", outer: P.ink0, frame: P.violet2, inner: P.violet4 },
  "panel-dark": { fill: P.ink1, outer: P.ink0, frame: P.ink4, inner: P.ink3 },
  tooltip: { fill: P.ink1, outer: P.ink0, frame: P.ivory3, inner: P.ink3 },
  dialog: { fill: P.ink2, outer: P.ink0, frame: P.brass2, inner: P.brass5 },
  "button-normal": { fill: P.ink3, outer: P.ink0, frame: P.brass3, inner: P.brass5 },
  "button-hover": { fill: P.ink4, outer: P.ink0, frame: P.brass1, inner: P.brass4 },
  "button-pressed": { fill: P.ink2, outer: P.ink0, frame: P.brass2, inner: P.ink1 },
  "button-disabled": { fill: P.ink2, outer: P.ink0, frame: P.steel0, inner: P.ink3 },
  "button-blue": { fill: "#0f2a33", outer: P.ink0, frame: P.teal2, inner: P.teal4 },
  "button-danger": { fill: "#2a0f18", outer: P.ink0, frame: P.ember2, inner: P.ember4 },
};

function fallbackPanel(g: Gfx, x: number, y: number, w: number, h: number, variant: string) {
  const s = FALLBACK[variant] ?? FALLBACK.panel;
  g.rect(x, y, w, h, s.outer);
  g.rect(x + 1, y + 1, w - 2, h - 2, s.frame);
  g.rect(x + 2, y + 2, w - 4, h - 4, s.inner);
  g.rect(x + 3, y + 3, w - 6, h - 6, s.fill);
  // rivets
  if (w > 16 && h > 16) {
    g.rect(x + 3, y + 3, 1, 1, s.frame);
    g.rect(x + w - 4, y + 3, 1, 1, s.frame);
    g.rect(x + 3, y + h - 4, 1, 1, s.frame);
    g.rect(x + w - 4, y + h - 4, 1, 1, s.frame);
  }
}

// ─── silhouettes / tinted copies (hit flashes, palette swaps) ─────────────────────────────────────────────

const tintCache = new Map<string, HTMLCanvasElement>();

/** A copy of an image with every opaque pixel set to `color` (cached). */
export function silhouette(img: HTMLImageElement | HTMLCanvasElement, key: string, color: string): HTMLCanvasElement {
  const k = `${key}|${color}`;
  let c = tintCache.get(k);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  tintCache.set(k, c);
  return c;
}

/** A copy of an image with exact colours replaced (palette swap, cached). Map keys/values are #rrggbb. */
export function paletteSwap(img: HTMLImageElement | HTMLCanvasElement, key: string, map: Record<string, string>): HTMLCanvasElement {
  let c = tintCache.get(`swap|${key}`);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(img, 0, 0);
  const data = x.getImageData(0, 0, c.width, c.height);
  const lut = new Map<number, [number, number, number]>();
  for (const [from, to] of Object.entries(map)) {
    const f = parseInt(from.replace("#", ""), 16);
    const t = parseInt(to.replace("#", ""), 16);
    lut.set(f, [(t >> 16) & 255, (t >> 8) & 255, t & 255]);
  }
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const v = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    const to = lut.get(v);
    if (to) {
      d[i] = to[0];
      d[i + 1] = to[1];
      d[i + 2] = to[2];
    }
  }
  x.putImageData(data, 0, 0);
  tintCache.set(`swap|${key}`, c);
  return c;
}
