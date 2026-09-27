// Shared drawing kit for the campaign screens: tracked labels, plates, dividers, icons with procedural fallbacks,
// resource chips, the run HUD, carrier cables, lamps. Everything is pixel-drawn in the canvas.
import { Gfx, Gfx as GfxCtor } from "../core/gfx";
import type { App } from "../core/scene";
import { atlas, atlasScale, markHD } from "../core/assets";
import { measure, lineHeight, type FontId } from "../core/font";
import { P, C, STAGE_TINT, rgba } from "../core/palette";
import { sfx } from "../core/audio";
import type { ResourceId, StageIndex } from "../game/ids";
import type { RunState } from "../campaign/model";
import { currentRelay, isSealed } from "../campaign/model";
import { hopsUntilSealed } from "../campaign/map";
import { stageName } from "../campaign/events";

export const W = 960;
export const H = 540;

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function tint(stage: StageIndex) {
  return STAGE_TINT[stage];
}

// ─── text ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Letter-spaced single-line text (labels, plates). Returns the width. */
export function tracked(
  g: Gfx, text: string, x: number, y: number,
  opts: { font?: FontId; color?: string; track?: number; align?: "left" | "center" | "right"; shadow?: string | null; alpha?: number } = {},
): number {
  const font = opts.font ?? "label";
  const track = opts.track ?? 2;
  const chars = [...text];
  const widths = chars.map((c) => measure(c, font));
  const total = widths.reduce((a, b) => a + b, 0) + track * Math.max(0, chars.length - 1);
  let cx = opts.align === "center" ? x - Math.floor(total / 2) : opts.align === "right" ? x - total : x;
  chars.forEach((c, i) => {
    if (c !== " ") g.text(c, cx, y, { font, color: opts.color ?? C.textDim, shadow: opts.shadow ?? null, alpha: opts.alpha });
    cx += widths[i] + track;
  });
  return total;
}

export function trackedWidth(text: string, font: FontId = "label", track = 2): number {
  const chars = [...text];
  return chars.reduce((a, c) => a + measure(c, font), 0) + track * Math.max(0, chars.length - 1);
}

// ─── frames, plates, dividers ─────────────────────────────────────────────────────────────────────────────

export function hasUi(frame: string): boolean {
  return !!atlas("ui")?.frames[frame] || !!atlas("ui")?.slices[frame];
}

/** Brass title plate with centred tracked text. */
export function titlePlate(g: Gfx, cx: number, y: number, text: string, opts: { w?: number; color?: string; font?: FontId; sub?: string } = {}) {
  const font = opts.font ?? "labelb";
  const tw = trackedWidth(text, font, 2);
  const w = Math.max(opts.w ?? 0, tw + 44);
  const h = 22;
  const x = Math.round(cx - w / 2);
  g.panel(x, y, w, h, hasUi("title-plate") ? "title-plate" : "panel-hi");
  tracked(g, text, cx, y + 6, { font, color: opts.color ?? P.brass0, align: "center", shadow: P.ink0 });
  return { x, y, w, h };
}

/** Ornamental divider (brass line with a centre lozenge). */
export function divider(g: Gfx, x: number, y: number, w: number, color: string = P.brass3) {
  const cx = Math.round(x + w / 2);
  g.hline(x, y, w, color);
  g.hline(x + 6, y + 1, w - 12, rgba(P.ink0, 0.6));
  g.rect(cx - 2, y - 2, 5, 5, P.ink1);
  g.rect(cx - 1, y - 1, 3, 3, P.brass1);
  g.rect(cx, y - 3, 1, 7, color);
  g.rect(cx - 3, y, 7, 1, color);
  g.rect(x, y - 1, 2, 3, color);
  g.rect(x + w - 2, y - 1, 2, 3, color);
}

/** A 4-px bevelled brass frame around art (the art is drawn inside by the caller). */
export function artFrame(g: Gfx, x: number, y: number, w: number, h: number, accent: string = P.brass2) {
  g.rect(x - 4, y - 4, w + 8, h + 8, P.ink0);
  g.box(x - 3, y - 3, w + 6, h + 6, P.brass4);
  g.box(x - 2, y - 2, w + 4, h + 4, accent);
  g.box(x - 1, y - 1, w + 2, h + 2, P.brass5);
  g.hline(x - 2, y - 2, w + 4, P.brass1);
  for (const [cx, cy] of [[x - 3, y - 3], [x + w + 1, y - 3], [x - 3, y + h + 1], [x + w + 1, y + h + 1]]) {
    g.rect(cx, cy, 2, 2, P.brass0);
  }
}

/** Dim panel inset. */
export function inset(g: Gfx, x: number, y: number, w: number, h: number, fill: string = P.ink1) {
  g.rect(x, y, w, h, fill);
  g.hline(x, y, w, P.ink0);
  g.vline(x, y, h, P.ink0);
  g.hline(x, y + h - 1, w, P.ink3);
  g.vline(x + w - 1, y, h, P.ink3);
}

// ─── icons ────────────────────────────────────────────────────────────────────────────────────────────────

export function iconSize(name: string): { w: number; h: number } | null {
  const a = atlas("icons");
  const f = a?.frames[name];
  if (!a || !f) return null;
  const k = atlasScale(a);
  return { w: f.w / k, h: f.h / k };
}

/** Draw an icons-atlas frame with its top-left at (x, y); returns false when missing. */
export function icon(g: Gfx, name: string, x: number, y: number, alpha = 1): boolean {
  return g.sprite("icons", name, x, y, { noAnchor: true, alpha });
}

/** Draw an icon centred at (cx, cy). */
export function iconC(g: Gfx, name: string, cx: number, cy: number, alpha = 1): boolean {
  const s = iconSize(name);
  if (!s) return false;
  return icon(g, name, Math.round(cx - s.w / 2), Math.round(cy - s.h / 2), alpha);
}

const RES_COLOR: Record<ResourceId, string> = {
  salvage: P.brass1, ttl: P.amber2, payloads: P.copper0, spares: P.teal2, hull: P.verd1,
};

/** Resource icon (16 px, or 10 px small). */
export function resIcon(g: Gfx, id: ResourceId, x: number, y: number, small = false) {
  if (icon(g, small ? `res-${id}-sm` : `res-${id}`, x, y)) return;
  const s = small ? 10 : 16;
  const c = RES_COLOR[id];
  g.rect(x + 1, y + 1, s - 2, s - 2, P.ink0);
  if (id === "ttl") {
    g.rect(x + s / 2 - 2, y + 2, 4, s - 6, c);
    g.rect(x + s / 2 - 1, y + 3, 2, 2, P.amber0);
  } else if (id === "salvage") {
    g.circle(x + s / 2, y + s / 2, s / 2 - 3, c, true);
    g.rect(x + s / 2 - 1, y + s / 2 - 1, 2, 2, P.ink0);
  } else if (id === "payloads") {
    g.rect(x + 3, y + s / 2 - 2, s - 7, 4, c);
    g.rect(x + s - 4, y + s / 2 - 1, 2, 2, P.teal2);
  } else if (id === "spares") {
    g.circle(x + s / 2, y + s / 2, s / 2 - 3, P.ivory2);
    g.rect(x + s / 2 - 1, y + s / 2 - 1, 3, 3, c);
  } else {
    g.rect(x + 2, y + 3, s - 4, s - 6, c);
  }
}

export const RES_LABEL: Record<ResourceId, string> = {
  salvage: "Salvage", ttl: "TTL", payloads: "Payloads", spares: "Spares", hull: "Hull",
};

export function resColor(id: ResourceId) {
  return RES_COLOR[id];
}

// ─── cables and lamps ─────────────────────────────────────────────────────────────────────────────────────

/** A sagging braided carrier cable between two points (catenary-ish parabola). */
export function cable(
  g: Gfx, x0: number, y0: number, x1: number, y1: number, sag: number,
  opts: { color?: string; hi?: string; lo?: string; thick?: number; braid?: boolean; from?: number; to?: number; hd?: boolean } = {},
) {
  if (opts.hd) return cableHD(g, x0, y0, x1, y1, sag, opts);
  const color = opts.color ?? P.copper2;
  const hi = opts.hi ?? P.copper0;
  const lo = opts.lo ?? P.copper4;
  const t = opts.thick ?? 2;
  const n = Math.max(2, Math.ceil(Math.abs(x1 - x0) + Math.abs(y1 - y0) + Math.abs(sag) * 2));
  const from = opts.from ?? 0;
  const to = opts.to ?? 1;
  let lastX = NaN;
  let lastY = NaN;
  for (let i = Math.floor(from * n); i <= Math.ceil(to * n); i++) {
    const u = i / n;
    const x = Math.round(x0 + (x1 - x0) * u);
    const y = Math.round(y0 + (y1 - y0) * u + sag * 4 * u * (1 - u));
    if (x === lastX && y === lastY) continue;
    // local slope decides whether the strand's thickness runs across x or y
    const dx = (x1 - x0);
    const dy = (y1 - y0) + sag * 4 * (1 - 2 * u);
    const steep = Math.abs(dy) > Math.abs(dx);
    lastX = x;
    lastY = y;
    if (t >= 3) {
      if (steep) {
        g.rect(x - 1, y, t, 1, lo);
        g.rect(x - 1, y, 1, 1, hi);
        g.rect(x, y, t - 2, 1, color);
      } else {
        g.rect(x, y - 1, 1, t, lo);
        g.rect(x, y - 1, 1, 1, hi);
        g.rect(x, y, 1, t - 2, color);
      }
      if (opts.braid !== false && ((x + y) & 3) === 0) g.rect(x, y, 1, 1, hi);
    } else if (t === 2) {
      g.rect(x, y, 1, 1, color);
      if (steep) g.rect(x + 1, y, 1, 1, lo);
      else g.rect(x, y + 1, 1, 1, lo);
      if (opts.braid !== false && ((x * 3 + y) % 7) === 0) g.rect(x, y, 1, 1, hi);
    } else {
      g.rect(x, y, 1, 1, color);
    }
  }
}

/**
 * HD cable: sampled every backing pixel; `thick` is in backing pixels (a braided carrier reads as 3–6 px with a lit
 * top strand, a dark underside and a twisted highlight every few pixels).
 */
function cableHD(
  g: Gfx, x0: number, y0: number, x1: number, y1: number, sag: number,
  opts: { color?: string; hi?: string; lo?: string; thick?: number; braid?: boolean; from?: number; to?: number },
) {
  const c = g.ctx;
  const color = opts.color ?? P.copper2;
  const hi = opts.hi ?? P.copper0;
  const lo = opts.lo ?? P.copper4;
  const t = opts.thick ?? 3;
  const n = Math.max(2, Math.ceil((Math.abs(x1 - x0) + Math.abs(y1 - y0) + Math.abs(sag) * 2) * 2));
  const from = opts.from ?? 0;
  const to = opts.to ?? 1;
  let lastX = NaN;
  let lastY = NaN;
  for (let i = Math.floor(from * n); i <= Math.ceil(to * n); i++) {
    const u = i / n;
    const X = Math.round((x0 + (x1 - x0) * u) * 2);
    const Y = Math.round((y0 + (y1 - y0) * u + sag * 4 * u * (1 - u)) * 2);
    if (X === lastX && Y === lastY) continue;
    lastX = X;
    lastY = Y;
    const dy = (y1 - y0) + sag * 4 * (1 - 2 * u);
    const steep = Math.abs(dy) > Math.abs(x1 - x0);
    const x = X / 2;
    const y = Y / 2;
    if (steep) {
      c.fillStyle = lo;
      c.fillRect(x, y, t / 2, 0.5);
      c.fillStyle = color;
      c.fillRect(x, y, Math.max(0.5, (t - 1) / 2), 0.5);
      c.fillStyle = hi;
      c.fillRect(x, y, 0.5, 0.5);
    } else {
      c.fillStyle = lo;
      c.fillRect(x, y, 0.5, t / 2);
      c.fillStyle = color;
      c.fillRect(x, y, 0.5, Math.max(0.5, (t - 1) / 2));
      c.fillStyle = hi;
      c.fillRect(x, y, 0.5, 0.5);
    }
    if (opts.braid !== false && t >= 3 && (X + Y) % 5 === 0) {
      c.fillStyle = hi;
      c.fillRect(x, y + (steep ? 0 : 0.5), 0.5, 0.5);
    }
  }
}

/** y of the sagging cable at x. */
export function cableY(x0: number, y0: number, x1: number, y1: number, sag: number, x: number): number {
  const u = Math.max(0, Math.min(1, (x - x0) / (x1 - x0 || 1)));
  return y0 + (y1 - y0) * u + sag * 4 * u * (1 - u);
}

/** A soft pixel glow (concentric alpha discs) for lamps. */
export function glow(g: Gfx, cx: number, cy: number, r: number, color: string, a = 0.35) {
  for (let i = 3; i >= 1; i--) {
    g.alpha(a / (i + 0.5), () => g.circle(cx, cy, Math.round((r * i) / 3), color, true));
  }
}

/** The blinking KEEPER lamp motif. */
export function keeperLamp(g: Gfx, x: number, y: number, t: number, period = 2.2) {
  const on = (t % period) < period * 0.45;
  g.rect(x - 4, y - 4, 9, 9, P.ink0);
  g.rect(x - 3, y - 3, 7, 7, P.brass4);
  g.rect(x - 2, y - 2, 5, 5, on ? P.amber1 : P.brass5);
  if (on) {
    g.rect(x - 1, y - 1, 2, 2, P.amber0);
    glow(g, x, y, 14, P.amber2, 0.25);
  }
}

// ─── HUD ──────────────────────────────────────────────────────────────────────────────────────────────────

export function hullColor(f: number) {
  return f > 0.5 ? P.verd1 : f > 0.25 ? P.amber2 : P.ember2;
}

/** The segmented hull bar. */
export function hullBar(g: Gfx, x: number, y: number, hull: number, max: number, segW = 5, h = 12) {
  const f = max > 0 ? hull / max : 0;
  const col = hullColor(f);
  g.rect(x - 2, y - 2, max * (segW + 1) + 3, h + 4, P.ink0);
  for (let i = 0; i < max; i++) {
    const sx = x + i * (segW + 1);
    if (i < hull) {
      g.rect(sx, y, segW, h, col);
      g.hline(sx, y, segW, rgba(P.ivory0, 0.35));
      g.hline(sx, y + h - 1, segW, rgba(P.ink0, 0.35));
    } else g.rect(sx, y, segW, h, P.ink3);
  }
}

/** Animated number (counts toward the target). */
const counters = new Map<string, number>();
export function counted(key: string, target: number, dt = 1 / 60): number {
  let v = counters.get(key);
  if (v === undefined) v = target;
  const d = target - v;
  if (Math.abs(d) < 0.5) v = target;
  else v += d * Math.min(1, dt * 9) + Math.sign(d) * 0.3;
  counters.set(key, v);
  return Math.round(v);
}

export function resChip(g: Gfx, app: App, id: ResourceId, value: number, x: number, y: number, w = 66, tooltip?: string) {
  g.panel(x, y, w, 22, "panel-dark");
  resIcon(g, id, x + 4, y + 3);
  const v = counted(`hud-${id}`, value);
  const warn = (id === "ttl" && value <= 2) || (id === "payloads" && value === 0);
  g.text(String(v), x + w - 6, y + 3, { font: "body", color: warn ? (Math.floor(app.time * 3) % 2 ? P.ember1 : P.amber1) : P.ivory0, align: "right", shadow: P.ink0 });
  if (tooltip) app.ui.area(`chip-${id}`, x, y, w, 22, { tooltip, cursor: "arrow" });
}

/** Top HUD of a run: hull, resources, stage/relay plate, Seal distance. */
export function runHud(g: Gfx, app: App, run: RunState, opts: { compact?: boolean } = {}) {
  const ship = run.ship;
  // Hull
  g.panel(8, 8, 214, 44, "panel");
  tracked(g, "HULL", 18, 15, { font: "label", color: P.ivory3 });
  g.text(`${ship.hull}/${ship.hullMax}`, 212, 12, { font: "body", color: hullColor(ship.hull / ship.hullMax), align: "right", shadow: P.ink0 });
  const segW = Math.max(3, Math.min(5, Math.floor(190 / ship.hullMax) - 1));
  hullBar(g, 18, 31, ship.hull, ship.hullMax, segW, 12);
  app.ui.area("hud-hull", 8, 8, 214, 44, { tooltip: "Hull: the tender's plating. Repairs at an exchange or a bench. At 0 the connection is lost.", cursor: "arrow" });
  // Resources
  const inv = run.inv;
  const tips: Record<string, string> = {
    ttl: "TTL: hops left on the connection. Every relay that switches you onto a new carrier takes one. At 0 no relay will switch you.",
    salvage: "Salvage: Night Shift currency.",
    payloads: "Payloads: ammunition for payload weapons.",
    spares: "Spares: automaton spares. Every drone launch spends one.",
  };
  resChip(g, app, "ttl", inv.ttl, 228, 8, 62, tips.ttl);
  resChip(g, app, "salvage", inv.salvage, 294, 8, 74, tips.salvage);
  resChip(g, app, "payloads", inv.payloads, 228, 32, 62, tips.payloads);
  resChip(g, app, "spares", inv.spares, 294, 32, 74, tips.spares);
  if (opts.compact) return;
  // Stage / relay plate
  const r = currentRelay(run);
  const t = tint(run.stage);
  const label = `STAGE ${ROMAN[run.stage]} · ${stageName(run.stage).replace(/^The /, "").toUpperCase()}`;
  const cx = 600;
  g.panel(cx - 150, 8, 300, 44, "panel");
  g.rect(cx - 146, 12, 292, 2, t.dark);
  tracked(g, label, cx, 17, { font: "labelb", color: t.light, align: "center" });
  const sealed = isSealed(run.map, r);
  const hops = hopsUntilSealed(run.map, r);
  const sealTxt = sealed ? "{ember1}SEALED{/}" : hops === Infinity ? "{verd1}the gate holds the Seal{/}" : hops <= 1 ? `{ember1}Seal: next hop{/}` : `{ivory3}Seal: ${hops} hops behind{/}`;
  g.text(`{ivory1}${r.name}{/}  {ivory4}·{/}  ${sealTxt}`, cx, 30, { font: "body", align: "center", shadow: P.ink0 });
}

// ─── misc ─────────────────────────────────────────────────────────────────────────────────────────────────

export function lh(font: FontId = "body") {
  return lineHeight(font);
}

/** Simple ease. */
export function ease(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Wrap an action key hint line: [KEY] label pairs. */
export function keyHints(g: Gfx, app: App, x: number, y: number, hints: [string, string][], align: "left" | "right" = "left") {
  let total = 0;
  const parts = hints.map(([k, l]) => {
    const kw = measure(k, "small") + 6;
    const lw = measure(l, "small");
    total += kw + 4 + lw + 10;
    return { k, l, kw, lw };
  });
  let cx = align === "right" ? x - total + 10 : x;
  for (const p of parts) {
    g.panel(cx, y, p.kw, 11, "panel-dark");
    g.text(p.k, cx + 3, y + 1, { font: "small", color: P.ivory2 });
    g.text(p.l, cx + p.kw + 4, y + 1, { font: "small", color: P.ivory4 });
    cx += p.kw + 4 + p.lw + 10;
  }
  void app;
}

// ─── buttons ──────────────────────────────────────────────────────────────────────────────────────────────

export interface BrassOpts {
  hotkey?: string;
  hotkeys?: string[];
  icon?: string;
  disabled?: boolean;
  tooltip?: string;
  sub?: string;
  font?: FontId;
  variant?: "brass" | "normal" | "blue" | "danger";
  sound?: string | null;
}

/** A primary action button (brass slab, dark engraved label) with keycap hint. Returns true when triggered. */
export function brassButton(app: App, id: string, x: number, y: number, w: number, h: number, label: string, opts: BrassOpts = {}): boolean {
  const { ui, input, g } = app;
  const over = ui.hot(id, x, y, w, h, !opts.disabled);
  let clicked = false;
  if (over) {
    ui.cursor = opts.disabled ? "blocked" : "pointer";
    if (opts.tooltip && ui.hoverTime() > 0.3) ui.setTooltip(opts.tooltip, 260);
    if (!opts.disabled && input.pressed(0)) {
      input.consume();
      clicked = true;
    }
  }
  const keys = [...(opts.hotkey ? [opts.hotkey] : []), ...(opts.hotkeys ?? [])];
  if (!opts.disabled) {
    for (const k of keys) {
      if (input.keyPressed(k)) {
        input.eatKey(k);
        clicked = true;
      }
    }
  }
  const pressed = over && input.isDown(0) && !opts.disabled;
  const v = opts.variant ?? "brass";
  const hasBrass = hasUi("button-brass");
  let slice: string;
  if (opts.disabled) slice = "button-disabled";
  else if (v === "brass" && hasBrass) slice = pressed ? "button-brass-pressed" : over ? "button-brass-hover" : "button-brass";
  else if (v === "blue") slice = pressed ? "button-blue-pressed" : over ? "button-blue-hover" : "button-blue";
  else if (v === "danger") slice = pressed ? "button-danger-pressed" : over ? "button-danger-hover" : "button-danger";
  else slice = pressed ? "button-pressed" : over ? "button-hover" : "button-normal";
  if (!hasUi(slice)) slice = pressed ? "button-pressed" : over ? "button-hover" : "button-normal";
  g.panel(x, y, w, h, slice);
  const dark = v === "brass" && hasBrass && !opts.disabled;
  const col = opts.disabled ? P.ivory4 : dark ? P.ink1 : v === "blue" ? P.teal1 : v === "danger" ? P.ember1 : over ? P.ivory0 : P.ivory1;
  const font = opts.font ?? "labelb";
  let tx = x + Math.round(w / 2);
  const hasIcon = !!opts.icon && !!iconSize(opts.icon);
  const lhh = lineHeight(font);
  const ty = y + Math.round((h - lhh) / 2) + (pressed ? 1 : 0) - (opts.sub ? 5 : 0);
  if (hasIcon) {
    const s = iconSize(opts.icon!)!;
    const tw = (font === "label" || font === "labelb" ? trackedWidth(label, font, 2) : measure(label, font)) + s.w + 6;
    const ix = x + Math.round((w - tw) / 2);
    icon(app.g, opts.icon!, ix, y + Math.round((h - s.h) / 2) + (pressed ? 1 : 0) - (opts.sub ? 5 : 0), opts.disabled ? 0.5 : 1);
    tx = ix + s.w + 6 + Math.round((tw - s.w - 6) / 2);
  }
  if (font === "label" || font === "labelb") tracked(g, label, tx, ty + 1, { font, color: col, align: "center", shadow: dark ? null : P.ink0 });
  else g.text(label, tx, ty, { font, color: col, align: "center", shadow: dark ? null : P.ink0 });
  if (opts.sub) g.text(opts.sub, x + Math.round(w / 2), ty + lhh - 1, { font: "small", color: dark ? P.brass5 : P.ivory3, align: "center" });
  if (opts.hotkey) {
    const kl = opts.hotkey.replace(/^Key|^Digit/, "").replace("Escape", "ESC").replace("Enter", "ENTER").replace("Space", "SPACE");
    const kw = measure(kl, "small") + 6;
    g.panel(x + w - kw - 4, y + 4, kw, 11, "panel-dark");
    g.text(kl, x + w - kw - 1, y + 5, { font: "small", color: P.ivory2 });
  }
  if (clicked && opts.sound !== null) sfx.play(opts.sound ?? "ui-click");
  return clicked;
}

// ─── cached layers ────────────────────────────────────────────────────────────────────────────────────────

const layers = new Map<string, HTMLCanvasElement>();

/**
 * An offscreen layer painted once per key with a Gfx of its own (for static, pixel-heavy drawing such as cables,
 * lattices and chart grids). Keep keys few; old layers of the same family are dropped.
 */
export function cachedLayer(family: string, key: string, w: number, h: number, paint: (g: Gfx) => void): HTMLCanvasElement {
  const full = `${family}|${key}`;
  let cv = layers.get(full);
  if (cv) return cv;
  for (const k of [...layers.keys()]) if (k.startsWith(`${family}|`)) layers.delete(k);
  cv = document.createElement("canvas");
  cv.width = w * 2;
  cv.height = h * 2;
  const ctx = cv.getContext("2d")!;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const g2 = new GfxCtor(ctx);
  paint(g2);
  markHD(cv);
  layers.set(full, cv);
  return cv;
}

// ─── HD fine drawing (half layout units = 1 backing pixel at 1080p) ───────────────────────────────────────

/** One backing pixel (half a layout unit) at (x, y) in layout units. */
export function dot(g: Gfx, x: number, y: number, color: string, w = 0.5, h = 0.5) {
  const c = g.ctx;
  c.fillStyle = color;
  c.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, w, h);
}

/** A fine 1-backing-pixel line (Bresenham on the half-unit grid). */
export function fineLine(g: Gfx, x0: number, y0: number, x1: number, y1: number, color: string, t = 1) {
  let ax = Math.round(x0 * 2);
  let ay = Math.round(y0 * 2);
  const bx = Math.round(x1 * 2);
  const by = Math.round(y1 * 2);
  const c = g.ctx;
  c.fillStyle = color;
  const dx = Math.abs(bx - ax);
  const dy = -Math.abs(by - ay);
  const sx = ax < bx ? 1 : -1;
  const sy = ay < by ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 8000; guard++) {
    c.fillRect(ax / 2, ay / 2, t / 2, t / 2);
    if (ax === bx && ay === by) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      ax += sx;
    }
    if (e2 <= dx) {
      err += dx;
      ay += sy;
    }
  }
}

/** Stepped HD light: concentric discs at half-unit resolution, low alpha (hard edges, no blur). */
export function glowHD(g: Gfx, cx: number, cy: number, r: number, color: string, a = 0.3, steps = 5) {
  const c = g.ctx;
  const prev = c.globalAlpha;
  c.fillStyle = color;
  for (let i = steps; i >= 1; i--) {
    const rr = (r * i) / steps;
    c.globalAlpha = prev * (a / steps) * 1.6;
    const R = Math.round(rr * 2);
    for (let yy = -R; yy <= R; yy++) {
      const half = Math.floor(Math.sqrt(R * R - yy * yy));
      c.fillRect(Math.round(cx * 2 - half) / 2, Math.round(cy * 2 + yy) / 2, (half * 2 + 1) / 2, 0.5);
    }
  }
  c.globalAlpha = prev;
}

// ─── zoom (contract ★ v4): wheel 1× → 1.5× → 2× around the cursor, right-drag pan, Z / middle-click reset ────

export const ZOOM_STEPS = [1, 1.5, 2];

export class Zoom {
  z = 1;
  target = 1;
  /** Screen = F + O + z·(p – F). */
  fx = 480;
  fy = 270;
  ox = 0;
  oy = 0;
  private drag: { x: number; y: number; button: 1 | 2 } | null = null;
  private middleAt = -10;

  /** Handle input over the zoomable area (call once per frame, before drawing). */
  handle(app: App, area: { x: number; y: number; w: number; h: number }, rightDrag = true) {
    const input = app.input;
    const over = input.inRect(area.x, area.y, area.w, area.h);
    if (over && input.wheel) {
      const i = ZOOM_STEPS.indexOf(this.target);
      const ni = Math.max(0, Math.min(ZOOM_STEPS.length - 1, (i < 0 ? 0 : i) - Math.sign(input.wheel)));
      const next = ZOOM_STEPS[ni];
      if (next !== this.target) this.zoomAt(input.x, input.y, next);
    }
    if (over && this.target > 1 && ((rightDrag && input.pressed(2)) || input.pressed(1))) {
      this.drag = { x: input.x, y: input.y, button: input.pressed(1) ? 1 : 2 };
    }
    if (over && this.target > 1) {
      this.ox += 4 * (Number(input.key("ArrowLeft")) - Number(input.key("ArrowRight")));
      this.oy += 4 * (Number(input.key("ArrowUp")) - Number(input.key("ArrowDown")));
      this.clamp(area);
    }
    if (this.drag) {
      if (input.isDown(this.drag.button)) {
        this.ox += input.x - this.drag.x;
        this.oy += input.y - this.drag.y;
        this.drag = { x: input.x, y: input.y, button: this.drag.button };
        this.clamp(area);
      } else this.drag = null;
    }
    const doubleMiddle = over && input.pressed(1) && app.time - this.middleAt < 0.3;
    if (over && input.pressed(1)) this.middleAt = app.time;
    if (input.keyPressed("KeyZ") || doubleMiddle) {
      input.eatKey("KeyZ");
      this.reset();
    }
  }

  private zoomAt(mx: number, my: number, next: number) {
    // keep the world point under the cursor fixed
    const z = this.z;
    const px = this.fx + (mx - this.fx - this.ox) / z;
    const py = this.fy + (my - this.fy - this.oy) / z;
    if (this.target === 1 && next > 1) {
      this.fx = px;
      this.fy = py;
      this.ox = mx - px;
      this.oy = my - py;
    } else {
      this.ox = mx - this.fx - next * (px - this.fx);
      this.oy = my - this.fy - next * (py - this.fy);
    }
    this.target = next;
    this.z = next;
    if (next === 1) this.reset();
  }

  private clamp(area: { x: number; y: number; w: number; h: number }) {
    const lim = (this.z - 1) * Math.max(area.w, area.h) * 0.6 + 40;
    this.ox = Math.max(-lim, Math.min(lim, this.ox));
    this.oy = Math.max(-lim, Math.min(lim, this.oy));
  }

  reset() {
    this.z = 1;
    this.target = 1;
    this.ox = 0;
    this.oy = 0;
    this.fx = 480;
    this.fy = 270;
  }

  /** Draw `fn` through the zoom transform. */
  apply(g: Gfx, fn: () => void) {
    if (this.z === 1 && this.ox === 0 && this.oy === 0) {
      fn();
      return;
    }
    const c = g.ctx;
    c.save();
    c.translate(this.fx + this.ox, this.fy + this.oy);
    c.scale(this.z, this.z);
    c.translate(-this.fx, -this.fy);
    try {
      fn();
    } finally {
      c.restore();
    }
  }

  /** Screen point → world point (for hit tests inside the zoomed view). */
  toWorld(x: number, y: number): { x: number; y: number } {
    return { x: this.fx + (x - this.fx - this.ox) / this.z, y: this.fy + (y - this.fy - this.oy) / this.z };
  }

  /** World rect → screen rect. */
  toScreen(x: number, y: number, w: number, h: number) {
    return { x: this.fx + this.ox + this.z * (x - this.fx), y: this.fy + this.oy + this.z * (y - this.fy), w: w * this.z, h: h * this.z };
  }
}
