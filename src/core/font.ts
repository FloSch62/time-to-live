// Bitmap pixel fonts (public/fonts/<id>.png/.json built by tools/build_fonts.py). Crisp, tintable, with markup.
//
// Markup inside text:
//   {teal}…{/}          colour by palette name (see palette.ts P) or {#rrggbb}
//   {icon:name}         inline 10–16 px icon from the "icons" atlas (vertically centred on the line)
//   {br}                forced line break (also "\n")
//
// Type scale (see TYPE in screens/kit.ts): big (display) › head (title) › body › caps / capsb / note. The last three
// are scaled pixel fonts (1.5 layout units per font pixel, 3 backing pixels at 1080p): legible labels and notes at
// 1366×768. label / labelb / small are the old 5-px sizes, kept for dense HUD glyphs.
import { loadImage, loadJson, atlas, atlasScale } from "./assets";
import { P } from "./palette";

export type FontId = "body" | "head" | "big" | "label" | "labelb" | "small" | "caps" | "capsb" | "note";

interface FontMeta {
  id: string;
  top: number;
  bottom: number;
  lineHeight: number;
  capHeight: number;
  /** Layout units per atlas pixel (scaled fonts); 1 when absent. Metrics above are already in layout units. */
  scale?: number;
  glyphs: Record<string, [number, number, number, number, number, number, number]>;
}

interface Font {
  meta: FontMeta;
  image: HTMLImageElement;
  tinted: Map<string, HTMLCanvasElement>;
}

const fonts = new Map<FontId, Font>();

export async function loadFonts(): Promise<void> {
  const ids: FontId[] = ["body", "head", "big", "label", "labelb", "small", "caps", "capsb", "note"];
  await Promise.all(
    ids.map(async (id) => {
      const [meta, image] = await Promise.all([loadJson<FontMeta>(`fonts/${id}.json`), loadImage(`fonts/${id}.png`)]);
      if (meta && image) fonts.set(id, { meta, image, tinted: new Map() });
    }),
  );
}

function tinted(font: Font, color: string): HTMLCanvasElement {
  let c = font.tinted.get(color);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = font.image.width;
  c.height = font.image.height;
  const x = c.getContext("2d")!;
  x.drawImage(font.image, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  font.tinted.set(color, c);
  return c;
}

export function lineHeight(font: FontId = "body"): number {
  return fonts.get(font)?.meta.lineHeight ?? 14;
}

/** Pixels from the top of a line box to the baseline. */
export function baselineOffset(font: FontId = "body"): number {
  return -(fonts.get(font)?.meta.top ?? -10);
}

export function capHeight(font: FontId = "body"): number {
  return fonts.get(font)?.meta.capHeight ?? 8;
}

/** Pixels from the top of a line box to the top of the capitals (for optical vertical centring). */
export function capTop(font: FontId = "body"): number {
  return baselineOffset(font) - capHeight(font);
}

/** y for a line box whose capitals are centred in the band [y, y + h). */
export function centerY(font: FontId, y: number, h: number): number {
  return Math.round((y + (h - capHeight(font)) / 2 - capTop(font)) * 2) / 2;
}

function scaleOf(font: Font | undefined): number {
  return font?.meta.scale ?? 1;
}

// ─── markup ────────────────────────────────────────────────────────────────────────────────────────────────

type Token =
  | { t: "text"; s: string }
  | { t: "color"; c: string | null }
  | { t: "icon"; name: string }
  | { t: "br" };

const tokenCache = new Map<string, Token[]>();

/** Friendly colour names usable in markup besides every palette entry ({teal2}) and hex ({#rrggbb}). */
export const COLOR_ALIASES: Record<string, string> = {
  teal: P.teal2, amber: P.amber2, violet: P.violet1, ember: P.ember1, red: P.ember2, brass: P.brass1, gold: P.brass1,
  ivory: P.ivory1, white: P.ivory0, verd: P.verd1, green: P.verd1, copper: P.copper0, steel: P.steel2, dim: P.ivory3,
  faint: P.ivory4, good: P.verd1, bad: P.ember2, warn: P.amber2, blue: P.teal1, ion: P.violet1, title: P.brass1,
};

function colorFor(tag: string): string | null {
  if (tag.startsWith("#")) return tag;
  if (tag in P) return P[tag as keyof typeof P];
  return COLOR_ALIASES[tag] ?? null;
}

function tokenize(text: string): Token[] {
  const cached = tokenCache.get(text);
  if (cached) return cached;
  const out: Token[] = [];
  let i = 0;
  let buf = "";
  const flush = () => {
    if (buf) out.push({ t: "text", s: buf });
    buf = "";
  };
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\n") {
      flush();
      out.push({ t: "br" });
      i++;
      continue;
    }
    if (ch === "{") {
      const end = text.indexOf("}", i);
      if (end > i) {
        const tag = text.slice(i + 1, end);
        if (tag === "/") {
          flush();
          out.push({ t: "color", c: null });
          i = end + 1;
          continue;
        }
        if (tag === "br") {
          flush();
          out.push({ t: "br" });
          i = end + 1;
          continue;
        }
        if (tag.startsWith("icon:")) {
          flush();
          out.push({ t: "icon", name: tag.slice(5) });
          i = end + 1;
          continue;
        }
        const col = colorFor(tag);
        if (col) {
          flush();
          out.push({ t: "color", c: col });
          i = end + 1;
          continue;
        }
      }
    }
    buf += ch;
    i++;
  }
  flush();
  if (tokenCache.size > 4000) tokenCache.clear();
  tokenCache.set(text, out);
  return out;
}

const ICON_W = 12;

/** Icon frame with its layout size (HD atlases are drawn at 1/scale). */
function iconFrame(name: string) {
  const a = atlas("icons");
  if (!a) return null;
  const f = a.frames[name] ?? a.frames[`${name}-sm`] ?? a.frames[`${name}-small`] ?? null;
  if (!f) return null;
  const s = atlasScale(a);
  return { ...f, lw: f.w / s, lh: f.h / s };
}

function charAdvance(font: Font | undefined, ch: string): number {
  if (!font) return 6;
  const g = font.meta.glyphs[ch] ?? font.meta.glyphs["?"];
  return g ? g[6] * scaleOf(font) : 6;
}

/** Width of a single line (markup aware, no wrapping). */
export function measure(text: string, fontId: FontId = "body"): number {
  const font = fonts.get(fontId);
  let w = 0;
  let max = 0;
  for (const tok of tokenize(text)) {
    if (tok.t === "text") for (const ch of tok.s) w += charAdvance(font, ch);
    else if (tok.t === "icon") w += (iconFrame(tok.name)?.lw ?? ICON_W) + 1;
    else if (tok.t === "br") {
      max = Math.max(max, w);
      w = 0;
    }
  }
  return Math.max(max, w);
}

/** Split text into lines no wider than `width`, keeping markup tags intact (colour carries across lines). */
export function wrap(text: string, width: number, fontId: FontId = "body"): string[] {
  const font = fonts.get(fontId);
  const lines: string[] = [];
  let line = "";
  let lineW = 0;
  let color: string | null = null;
  const spaceW = charAdvance(font, " ");
  const pushLine = () => {
    lines.push(line);
    line = color ? `{${color}}` : "";
    lineW = 0;
  };
  for (const tok of tokenize(text)) {
    if (tok.t === "br") {
      pushLine();
      continue;
    }
    if (tok.t === "color") {
      color = tok.c;
      line += tok.c ? `{${tok.c}}` : "{/}";
      continue;
    }
    if (tok.t === "icon") {
      const w = (iconFrame(tok.name)?.lw ?? ICON_W) + 1;
      if (lineW + w > width && lineW > 0) pushLine();
      line += `{icon:${tok.name}}`;
      lineW += w;
      continue;
    }
    const words = tok.s.split(/( )/);
    for (const word of words) {
      if (word === "") continue;
      if (word === " ") {
        if (lineW > 0) {
          line += " ";
          lineW += spaceW;
        }
        continue;
      }
      let ww = 0;
      for (const ch of word) ww += charAdvance(font, ch);
      if (lineW + ww > width && lineW > 0) {
        line = line.replace(/ +$/, "");
        pushLine();
      }
      line += word;
      lineW += ww;
    }
  }
  if (line && line !== (color ? `{${color}}` : "")) lines.push(line);
  return lines;
}

export interface TextOpts {
  font?: FontId;
  color?: string;
  align?: "left" | "center" | "right";
  /** 1-px drop shadow colour (down-right). */
  shadow?: string | null;
  /** Wrap width; when set, text wraps and returns the block height. */
  width?: number;
  lineHeight?: number;
  maxLines?: number;
  /** 0..1 fraction of characters revealed (typewriter). */
  reveal?: number;
  alpha?: number;
}

/**
 * Draw text with its line box top at y. Returns the height used.
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: TextOpts = {},
): number {
  const fontId = opts.font ?? "body";
  const lh = opts.lineHeight ?? lineHeight(fontId);
  let lines = opts.width ? wrap(text, opts.width, fontId) : text.split("\n");
  if (opts.maxLines && lines.length > opts.maxLines) {
    lines = lines.slice(0, opts.maxLines);
    lines[lines.length - 1] = lines[lines.length - 1].replace(/.{0,2}$/, "…");
  }
  let budget = opts.reveal !== undefined ? Math.floor(opts.reveal * countChars(lines)) : Infinity;
  let cy = y;
  for (const ln of lines) {
    let lx = x;
    if (opts.align && opts.align !== "left") {
      const w = measure(ln, fontId);
      lx = opts.align === "center" ? x - Math.floor(w / 2) : x - w;
    }
    if (opts.shadow) drawLine(ctx, ln, lx + 1, cy + 1, fontId, opts.shadow, true, budget, opts.alpha);
    budget = drawLine(ctx, ln, lx, cy, fontId, opts.color ?? P.ivory1, false, budget, opts.alpha);
    cy += lh;
  }
  return lines.length * lh;
}

function countChars(lines: string[]): number {
  let n = 0;
  for (const l of lines) for (const tok of tokenize(l)) if (tok.t === "text") n += tok.s.length;
  return n;
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  fontId: FontId,
  baseColor: string,
  shadowPass: boolean,
  budget: number,
  alpha?: number,
): number {
  const font = fonts.get(fontId);
  const k = scaleOf(font);
  // Scaled fonts snap to backing pixels (half layout units); the classic fonts keep whole layout units.
  const snap = k === 1 ? 1 : 2;
  x = Math.round(x * snap) / snap;
  y = Math.round(y * snap) / snap;
  const base = y + baselineOffset(fontId);
  let color = baseColor;
  let img = font ? tinted(font, color) : null;
  const prevAlpha = ctx.globalAlpha;
  if (alpha !== undefined) ctx.globalAlpha = prevAlpha * alpha;
  for (const tok of tokenize(line)) {
    if (tok.t === "color") {
      if (!shadowPass) {
        color = tok.c ?? baseColor;
        img = font ? tinted(font, color) : null;
      }
      continue;
    }
    if (tok.t === "icon") {
      const a = atlas("icons");
      const f = iconFrame(tok.name);
      if (a && f && !shadowPass) {
        const iy = Math.round((base - capHeight(fontId) / 2 - f.lh / 2) * 2) / 2;
        ctx.drawImage(a.image, f.x, f.y, f.w, f.h, x, iy, f.lw, f.lh);
      }
      x += (f?.lw ?? ICON_W) + 1;
      continue;
    }
    if (tok.t !== "text") continue;
    for (const ch of tok.s) {
      if (budget <= 0) break;
      budget--;
      if (!font || !img) {
        if (ch !== " ") {
          ctx.fillStyle = color;
          ctx.fillRect(x, base - 7, 5, 7);
        }
        x += 6;
        continue;
      }
      const g = font.meta.glyphs[ch] ?? font.meta.glyphs["?"];
      if (!g) continue;
      if (g[2] > 0) {
        if (k === 1) ctx.drawImage(img, g[0], g[1], g[2], g[3], x + g[4], base + g[5], g[2], g[3]);
        else ctx.drawImage(img, g[0], g[1], g[2], g[3], x + g[4] * k, base + g[5] * k, g[2] * k, g[3] * k);
      }
      x += g[6] * k;
    }
  }
  ctx.globalAlpha = prevAlpha;
  return budget;
}
