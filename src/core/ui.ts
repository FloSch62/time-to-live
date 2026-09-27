// Immediate-mode pixel UI kit. Call widgets inside a scene's draw(); they draw and return interaction results.
import type { Gfx } from "./gfx";
import type { Input } from "./input";
import { measure, lineHeight, wrap, type FontId } from "./font";
import { C, P } from "./palette";
import { sfx } from "./audio";
import { atlas } from "./assets";

export type CursorKind = "arrow" | "pointer" | "target" | "crew-move" | "blocked" | "grab";

export interface ButtonOpts {
  variant?: "normal" | "blue" | "danger" | "ghost";
  disabled?: boolean;
  /** Keyboard code that triggers the button (e.g. "Space", "KeyJ", "Digit1"). Shown as a keycap when showKey. */
  hotkey?: string;
  showKey?: boolean;
  icon?: string; // icons atlas frame
  tooltip?: string;
  font?: FontId;
  align?: "left" | "center";
  /** Draw as selected/toggled on. */
  active?: boolean;
  color?: string;
  sound?: string | null;
}

interface Tooltip {
  text: string;
  x: number;
  y: number;
  width: number;
}

export class UI {
  cursor: CursorKind = "arrow";
  private tooltip: Tooltip | null = null;
  private hoverId: string | null = null;
  private lastHoverId: string | null = null;
  private hoverStart = 0;
  private activeId: string | null = null;
  private scroll = new Map<string, number>();
  private dragging: string | null = null;
  focusId: string | null = null;
  time = 0;

  constructor(readonly g: Gfx, readonly input: Input) {}

  begin(time: number) {
    this.time = time;
    this.cursor = "arrow";
    this.tooltip = null;
    this.lastHoverId = this.hoverId;
    this.hoverId = null;
    if (!this.input.isDown(0) && !this.input.isDown(2)) {
      this.dragging = null;
    }
  }

  /** Draw deferred overlays (tooltips) and the cursor. Call once at the very end of the frame. */
  end() {
    if (this.tooltip) this.drawTooltip(this.tooltip);
    this.drawCursor();
    // Buttons must see their captured press during the release frame before it is cleared.
    if (!this.input.isDown(0)) this.activeId = null;
  }

  hover(x: number, y: number, w: number, h: number): boolean {
    return this.input.inRect(x, y, w, h);
  }

  /** Register hover for an id; returns true when hovered (plays hover sound on enter). */
  hot(id: string, x: number, y: number, w: number, h: number, sound = true): boolean {
    if (!this.input.inRect(x, y, w, h)) return false;
    this.hoverId = id;
    if (id !== this.lastHoverId) {
      this.hoverStart = this.time;
      if (sound) sfx.play("ui-hover", { volume: 0.35 });
    }
    return true;
  }

  /** Seconds the current hover has lasted (for delayed tooltips). */
  hoverTime(): number {
    return this.time - this.hoverStart;
  }

  setTooltip(text: string, width = 220) {
    this.tooltip = { text, x: this.input.mx, y: this.input.my, width };
  }

  /** Clickable region without visuals. Returns true on click (left). */
  area(id: string, x: number, y: number, w: number, h: number, opts: { tooltip?: string; cursor?: CursorKind; button?: 0 | 2 } = {}): boolean {
    const over = this.hot(id, x, y, w, h, false);
    if (!over) return false;
    this.cursor = opts.cursor ?? "pointer";
    if (opts.tooltip && this.hoverTime() > 0.25) this.setTooltip(opts.tooltip);
    const b = opts.button ?? 0;
    if (this.input.pressed(b)) {
      this.input.consume();
      return true;
    }
    return false;
  }

  button(id: string, x: number, y: number, w: number, h: number, label: string, opts: ButtonOpts = {}): boolean {
    const g = this.g;
    const over = this.hot(id, x, y, w, h, !opts.disabled);
    let clicked = false;
    if (over) {
      this.cursor = opts.disabled ? "blocked" : "pointer";
      if (opts.tooltip && this.hoverTime() > 0.3) this.setTooltip(opts.tooltip);
      if (!opts.disabled && this.input.pressed(0)) {
        this.activeId = id;
        this.input.consume();
      }
      if (!opts.disabled && this.activeId === id && this.input.released(0)) clicked = true;
    }
    if (!opts.disabled && opts.hotkey && this.input.keyPressed(opts.hotkey)) {
      this.input.eatKey(opts.hotkey);
      clicked = true;
    }
    const pressed = this.activeId === id && this.input.isDown(0) && over;
    const variant = opts.variant ?? "normal";
    let slice = "button-normal";
    if (opts.disabled) slice = "button-disabled";
    else if (variant === "blue") slice = "button-blue";
    else if (variant === "danger") slice = "button-danger";
    else if (pressed) slice = "button-pressed";
    else if (over || opts.active) slice = "button-hover";
    if (variant !== "ghost") g.panel(x, y, w, h, slice);
    else if (over) g.rect(x, y, w, h, P.ink3);
    const font = opts.font ?? "body";
    const lh = lineHeight(font);
    const color = opts.disabled
      ? C.textFaint
      : opts.color ?? (variant === "blue" ? P.teal1 : variant === "danger" ? P.ember1 : over || opts.active ? P.ivory0 : C.text);
    let tx = x + 8;
    const ty = y + Math.round((h - lh) / 2) + (pressed ? 1 : 0);
    if (opts.icon) {
      const f = g.frameSize("icons", opts.icon);
      if (f) {
        g.sprite("icons", opts.icon, x + 6, y + Math.round((h - f.h) / 2) + (pressed ? 1 : 0), { noAnchor: true, alpha: opts.disabled ? 0.4 : 1 });
        tx += f.w + 2;
      }
    }
    if (label) {
      if ((opts.align ?? "center") === "center" && !opts.icon) {
        g.text(label, x + Math.round(w / 2), ty, { font, color, align: "center", shadow: P.ink0 });
      } else {
        g.text(label, tx, ty, { font, color, shadow: P.ink0, width: w - (tx - x) - 6, maxLines: Math.max(1, Math.floor((h - 4) / lh)) });
      }
    }
    if (opts.hotkey && opts.showKey) this.keycap(opts.hotkey, x + w - 4, y + 3, "right");
    if (clicked && opts.sound !== null) sfx.play(opts.sound ?? "ui-click");
    return clicked;
  }

  /** Small square icon button. */
  iconButton(id: string, x: number, y: number, size: number, icon: string, opts: ButtonOpts = {}): boolean {
    const over = this.hover(x, y, size, size);
    const clicked = this.button(id, x, y, size, size, "", { ...opts, icon: undefined });
    const f = this.g.frameSize("icons", icon);
    if (f) {
      this.g.sprite("icons", icon, x + Math.round((size - f.w) / 2), y + Math.round((size - f.h) / 2), {
        noAnchor: true,
        alpha: opts.disabled ? 0.4 : 1,
      });
    } else {
      this.g.text(icon.slice(0, 1).toUpperCase(), x + size / 2, y + 2, { font: "label", align: "center", color: over ? P.ivory0 : C.text });
    }
    return clicked;
  }

  keycap(code: string, x: number, y: number, align: "left" | "right" = "left") {
    const label = keyLabel(code);
    const w = measure(label, "small") + 6;
    const lx = align === "right" ? x - w : x;
    this.g.panel(lx, y, w, 11, "panel-dark");
    this.g.text(label, lx + 3, y + 1, { font: "small", color: P.ivory2 });
    return w;
  }

  /** Horizontal segmented bar (power, hull). */
  segBar(x: number, y: number, segW: number, h: number, total: number, filled: number, colors: { on: string; off: string; edge?: string }, gap = 1) {
    const g = this.g;
    for (let i = 0; i < total; i++) {
      const sx = x + i * (segW + gap);
      g.rect(sx, y, segW, h, i < filled ? colors.on : colors.off);
      if (colors.edge && i < filled) g.hline(sx, y, segW, colors.edge);
    }
  }

  /** Continuous bar with frame. */
  bar(x: number, y: number, w: number, h: number, value: number, max: number, color: string, back: string = P.ink1) {
    const g = this.g;
    g.rect(x, y, w, h, P.ink0);
    g.rect(x + 1, y + 1, w - 2, h - 2, back);
    const f = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
    const fw = Math.round((w - 2) * f);
    if (fw > 0) {
      g.rect(x + 1, y + 1, fw, h - 2, color);
      g.hline(x + 1, y + 1, fw, "rgba(255,255,255,0.25)");
    }
  }

  checkbox(id: string, x: number, y: number, label: string, value: boolean): boolean {
    const g = this.g;
    const w = 14 + 6 + measure(label, "body");
    const clicked = this.area(id, x, y, w, 14);
    const over = this.hover(x, y, w, 14);
    g.panel(x, y, 14, 14, over ? "panel-hi" : "panel-dark");
    if (value) g.rect(x + 4, y + 4, 6, 6, P.teal2);
    g.text(label, x + 20, y - 1, { color: over ? P.ivory0 : C.text });
    if (clicked) sfx.play("ui-click");
    return clicked ? !value : value;
  }

  /** Horizontal slider 0..1. */
  slider(id: string, x: number, y: number, w: number, value: number): number {
    const g = this.g;
    const h = 12;
    const over = this.hot(id, x - 4, y - 2, w + 8, h + 4, false);
    if (over) this.cursor = "pointer";
    if (over && this.input.pressed(0)) {
      this.dragging = id;
      this.input.consume();
    }
    if (this.dragging === id && this.input.isDown(0)) {
      value = Math.max(0, Math.min(1, (this.input.x - x) / w));
    }
    g.rect(x, y + 5, w, 3, P.ink0);
    g.rect(x, y + 5, Math.round(w * value), 3, P.teal3);
    const kx = Math.round(x + w * value) - 3;
    g.panel(kx, y, 7, h, over || this.dragging === id ? "button-hover" : "button-normal");
    return value;
  }

  /** Tabs; returns the selected index. */
  tabs(id: string, x: number, y: number, labels: string[], selected: number, tabW = 110, h = 20): number {
    let sel = selected;
    labels.forEach((label, i) => {
      if (this.button(`${id}:${i}`, x + i * (tabW + 2), y, tabW, h, label, { active: i === selected, font: "body" })) sel = i;
    });
    return sel;
  }

  /**
   * Scrollable region. `draw(offsetY)` must draw content starting at y - offsetY. Returns the scroll offset.
   * Custom brass thumb; mouse wheel scrolls when hovered.
   */
  scrollArea(id: string, x: number, y: number, w: number, h: number, contentH: number, draw: (offset: number) => void): number {
    const g = this.g;
    const maxScroll = Math.max(0, contentH - h);
    let off = Math.min(this.scroll.get(id) ?? 0, maxScroll);
    if (this.hover(x, y, w, h) && this.input.wheel) off = Math.max(0, Math.min(maxScroll, off + this.input.wheel * 24));
    g.clip(x, y, w - (maxScroll > 0 ? 8 : 0), h, () => draw(off));
    if (maxScroll > 0) {
      const tx = x + w - 6;
      g.rect(tx, y, 4, h, P.ink1);
      const th = Math.max(16, Math.round((h * h) / contentH));
      const ty = y + Math.round((h - th) * (off / maxScroll));
      const over = this.hot(`${id}:thumb`, tx - 2, y, 8, h, false);
      if (over && this.input.pressed(0)) {
        this.dragging = `${id}:thumb`;
        this.input.consume();
      }
      if (this.dragging === `${id}:thumb` && this.input.isDown(0)) {
        off = Math.max(0, Math.min(maxScroll, ((this.input.y - y - th / 2) / (h - th)) * maxScroll));
      }
      g.rect(tx, ty, 4, th, over || this.dragging === `${id}:thumb` ? P.brass1 : P.brass3);
    }
    this.scroll.set(id, off);
    return off;
  }

  resetScroll(id: string) {
    this.scroll.delete(id);
  }

  /** Single-line text field. Returns the new value. */
  textField(id: string, x: number, y: number, w: number, value: string, maxLen = 24): string {
    const g = this.g;
    const h = 20;
    if (this.area(id, x, y, w, h, { cursor: "pointer" })) this.focusId = id;
    const focused = this.focusId === id;
    g.panel(x, y, w, h, focused ? "panel-hi" : "panel-dark");
    if (focused) {
      for (const ch of this.input.typed) {
        if (ch === "\b") value = value.slice(0, -1);
        else if (ch === "\n") this.focusId = null;
        else if (value.length < maxLen && ch >= " ") value += ch;
      }
    }
    g.text(value, x + 6, y + 2, { color: P.ivory0 });
    if (focused && Math.floor(this.time * 2) % 2 === 0) g.rect(x + 7 + measure(value), y + 5, 1, 11, P.teal1);
    return value;
  }

  private drawTooltip(t: Tooltip) {
    const g = this.g;
    const lines = wrap(t.text, t.width - 12, "body");
    const lh = lineHeight("body");
    let w = 0;
    for (const l of lines) w = Math.max(w, measure(l, "body"));
    w += 12;
    const h = lines.length * lh + 8;
    let x = t.x + 14;
    let y = t.y + 14;
    if (x + w > 956) x = t.x - w - 6;
    if (y + h > 536) y = t.y - h - 6;
    x = Math.max(4, x);
    y = Math.max(4, y);
    g.panel(x, y, w, h, "tooltip");
    g.text(lines.join("\n"), x + 6, y + 4, { color: C.text });
  }

  private drawCursor() {
    if (!this.input.inside) return;
    const x = this.input.mx;
    const y = this.input.my;
    const name = `cursor-${this.cursor}`;
    if (this.g.sprite("ui", name, x, y)) return;
    if (this.cursor !== "arrow" && this.g.sprite("ui", "cursor-arrow", x, y)) return;
    // Procedural fallback cursor.
    const g = this.g;
    if (this.cursor === "target") {
      g.rect(x - 6, y, 4, 1, P.ember1);
      g.rect(x + 3, y, 4, 1, P.ember1);
      g.rect(x, y - 6, 1, 4, P.ember1);
      g.rect(x, y + 3, 1, 4, P.ember1);
      return;
    }
    const arrow = [
      "X.........",
      "XX........",
      "XOX.......",
      "XOOX......",
      "XOOOX.....",
      "XOOOOX....",
      "XOOOOOX...",
      "XOOOOOOX..",
      "XOOOOXXXX.",
      "XOXOOX....",
      "XX.XOOX...",
      "X...XOX...",
      ".....XX...",
    ];
    for (let r = 0; r < arrow.length; r++) {
      for (let c = 0; c < arrow[r].length; c++) {
        const ch = arrow[r][c];
        if (ch === "X") g.rect(x + c, y + r, 1, 1, P.ink0);
        else if (ch === "O") g.rect(x + c, y + r, 1, 1, this.cursor === "pointer" ? P.brass1 : P.ivory0);
      }
    }
  }
}

export function keyLabel(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  const map: Record<string, string> = {
    Space: "SPACE", Escape: "ESC", Enter: "ENTER", Tab: "TAB", ShiftLeft: "SHIFT", ArrowLeft: "←", ArrowRight: "→",
    ArrowUp: "↑", ArrowDown: "↓", Backspace: "BKSP",
  };
  return map[code] ?? code.toUpperCase();
}
