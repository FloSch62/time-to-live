// The event window (FTL style): title plate, optional 320×160 event art and/or 96×96 portrait with a speaker plate,
// typewriter text with markup, numbered choices (1–4 hotkeys) with blue options and disabled reasons; then the outcome
// with resource deltas, item/crew/fragment/Runbook notices and Continue.
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { art, artSettled } from "../core/assets";
import { sfx } from "../core/audio";
import { lineHeight, wrap, measure } from "../core/font";
import { P, C, rgba } from "../core/palette";
import type { Applied, ChoiceView, EventView, Notice } from "../campaign/events";
import type { Session } from "./session";
import { createPauseMenu } from "./pause";
import { artFrame, hasUi, icon, resColor, resIcon, RES_LABEL, titlePlate, tracked } from "./kit";
import { itemThumb } from "./items";

export interface EventWindow extends Scene {
  setChoices(view: EventView, resolve: (i: number) => void): void;
  setOutcome(applied: Applied, view: EventView, resolve: () => void): void;
}

const TEXT_SPEED = 150; // chars per second

export function createEventWindow(app: App, session: Session): EventWindow {
  let view: EventView | null = null;
  let applied: Applied | null = null;
  let onChoice: ((i: number) => void) | null = null;
  let onContinue: (() => void) | null = null;
  let reveal = 1;
  let chars = 1;
  let t = 0;
  let appear = 0;
  let hoverRow = -1;

  function startText(text: string) {
    chars = Math.max(1, text.replace(/\{[^}]*\}/g, "").length);
    reveal = 0;
  }

  const win: EventWindow = {
    overlay: true,
    setChoices(v, res) {
      view = v;
      applied = null;
      onChoice = res;
      onContinue = null;
      startText(v.text);
      appear = 0;
    },
    setOutcome(a, v, res) {
      view = v;
      applied = a;
      onChoice = null;
      onContinue = res;
      startText(a.text ?? "");
      if (a.deltas.some((d) => d.id === "salvage" && d.amount > 0)) sfx.play("salvage-pickup", { volume: 0.7 });
      if (a.notices.some((n) => n.kind === "fragment")) sfx.play("radio-squelch", { volume: 0.6 });
    },
    update(dt) {
      t += dt;
      appear = Math.min(1, appear + dt * 5);
      if (reveal < 1) reveal = Math.min(1, reveal + (dt * TEXT_SPEED) / chars);
    },
    draw(g, a) {
      if (!view) return;
      g.dim(0.5 * appear);
      const input = a.input;
      // layout: art on top (320×160), portrait beside the text, width grows with long texts
      const artImg = view.art ? art(view.art.includes("/") ? view.art : `events/${view.art}`) : null;
      const portrait = view.portrait ? art(`portraits/${view.portrait}`) : null;
      const showPortrait = !!view.portrait;
      const body = applied ? applied.text ?? "" : view.text;
      const pad = 24;
      const lh = lineHeight("body");
      const plainLen = (view.text ?? "").length;
      let winW = showPortrait || plainLen > 420 ? 760 : 680;
      const textW = () => winW - pad * 2 - (showPortrait ? 112 : 0);
      let bodyLines = body ? wrap(body, textW(), "body") : [];
      let rows = applied ? outcomeRows(applied) : choiceRows(view.choices, winW - pad * 2);
      const rowsH = () => (applied ? rows.reduce((s2, r) => s2 + r.h, 0) + 8 + 30 : rows.reduce((s2, r) => s2 + r.h + 4, 0) + 8);
      const speakerH = view.speaker && showPortrait ? 16 : view.speaker ? 12 : 0;
      const textH = () => Math.max(bodyLines.length * lh + speakerH, showPortrait ? 100 : 0);
      let artShown = !!view.art;
      const total = () => pad + 8 + (artShown ? 178 : 0) + textH() + 14 + rowsH() + pad - 20;
      if (total() > 528) {
        winW = 860;
        bodyLines = body ? wrap(body, textW(), "body") : [];
        rows = applied ? outcomeRows(applied) : choiceRows(view.choices, winW - pad * 2);
      }
      if (total() > 528) artShown = false;
      const h = total();
      const x = Math.round(480 - winW / 2);
      const textX = x + pad + (showPortrait ? 112 : 0);
      const y = Math.max(12, Math.round(272 - h / 2 + (1 - appear) * 12));
      g.panel(x, y, winW, h, "dialog");
      if (view.title) titlePlate(g, 480, y - 9, view.title.toUpperCase(), { w: 260 });
      let cy = y + pad + 2;
      if (artShown) {
        const ax = 480 - 160;
        artFrame(g, ax, cy, 320, 160);
        if (artImg) g.image(artImg, ax, cy);
        else placeholderArt(g, ax, cy, 320, 160, t, view.art ?? "");
        cy += 160 + 18;
      }
      if (showPortrait) {
        const px = x + pad;
        artFrame(g, px, cy + 2, 96, 96, P.brass2);
        if (portrait) g.image(portrait, px, cy + 2);
        else placeholderPortrait(g, px, cy + 2, t);
      }
      if (view.speaker) {
        tracked(g, view.speaker.toUpperCase(), textX, cy, { font: "labelb", color: P.brass1 });
        cy += speakerH;
      }
      if (body) g.text(body, textX, cy, { font: "body", color: C.text, width: textW(), reveal, shadow: P.ink0 });
      cy += textH() - speakerH + 14;
      // divider
      g.hline(x + pad, cy - 7, winW - pad * 2, rgba(P.brass3, 0.5));
      const skip = input.keyPressed("Space") || input.keyPressed("Enter");
      if (reveal < 1) {
        if (skip || input.pressed(0)) {
          reveal = 1;
          input.eatKey("Space");
          input.eatKey("Enter");
          input.consume();
        }
        return;
      }
      if (!applied) drawChoices(g, a, rows as ChoiceRow[], x + pad, cy, winW - pad * 2);
      else drawOutcome(g, a, rows as OutRow[], x + pad, cy, winW - pad * 2, textW());
      if (input.keyPressed("Escape")) {
        input.eatKey("Escape");
        session.push(createPauseMenu(a, session));
      }
    },
  };

  interface ChoiceRow {
    c: ChoiceView;
    num: number;
    lines: string[];
    h: number;
  }

  function choiceRows(choices: ChoiceView[], w: number): ChoiceRow[] {
    const rows: ChoiceRow[] = [];
    let num = 1;
    for (const c of choices) {
      if (c.hidden) continue;
      const label = c.blue && c.label ? `{teal1}${c.label}{/} ` : "";
      const txt = `${label}${c.text}`;
      const lines = wrap(txt, w - 34, "body");
      const extra = !c.enabled && c.reason ? 1 : 0;
      rows.push({ c, num: num++, lines, h: lines.length * lineHeight("body") + extra * 10 + 4 });
    }
    return rows;
  }

  function drawChoices(g: Gfx, a: App, rows: ChoiceRow[], x: number, y: number, w: number) {
    let cy = y;
    let hovered = -1;
    for (const r of rows) {
      const over = a.ui.hot(`evc-${r.num}`, x - 6, cy - 2, w + 12, r.h + 2, r.c.enabled);
      if (over) hovered = r.num;
      const key = `Digit${r.num}`;
      const keyHit = a.input.keyPressed(key) || a.input.keyPressed(`Numpad${r.num}`);
      if (over && r.c.enabled) {
        a.ui.cursor = "pointer";
        g.rect(x - 6, cy - 2, w + 12, r.h + 2, rgba(r.c.blue ? P.teal3 : P.brass3, 0.18));
        g.rect(x - 6, cy - 2, 2, r.h + 2, r.c.blue ? P.teal2 : P.brass1);
      } else if (over) a.ui.cursor = "blocked";
      const numCol = !r.c.enabled ? P.ivory4 : r.c.blue ? P.teal1 : P.brass1;
      g.text(`${r.num}.`, x, cy, { font: "body", color: numCol, shadow: P.ink0 });
      const col = !r.c.enabled ? C.textFaint : r.c.blue ? P.teal0 : over ? P.ivory0 : C.text;
      g.text(r.lines.join("\n"), x + 24, cy, { font: "body", color: col, shadow: P.ink0 });
      if (!r.c.enabled && r.c.reason) g.text(`(${r.c.reason})`, x + 24, cy + r.lines.length * lineHeight("body") - 3, { font: "small", color: P.ember1 });
      if (r.c.enabled && ((over && a.input.pressed(0)) || keyHit)) {
        a.input.consume();
        a.input.eatKey(key);
        pick(r.c.index);
        return;
      }
      cy += r.h + 4;
    }
    if (hovered !== hoverRow) hoverRow = hovered;
  }

  function pick(i: number) {
    const f = onChoice;
    onChoice = null;
    sfx.play("ui-click");
    f?.(i);
  }

  interface OutRow {
    kind: "delta" | "notice";
    h: number;
    draw(g: Gfx, x: number, y: number): void;
  }

  function outcomeRows(ap: Applied): OutRow[] {
    const rows: OutRow[] = [];
    if (ap.deltas.length) {
      rows.push({
        kind: "delta",
        h: 24,
        draw(g, x, y) {
          let cx = x;
          for (const d of ap.deltas) {
            const w = 30 + measure(`${d.amount > 0 ? "+" : "–"}${Math.abs(d.amount)} ${RES_LABEL[d.id]}`, "body");
            g.panel(cx, y, w, 22, "panel-dark");
            resIcon(g, d.id, cx + 5, y + 3);
            const col = d.amount > 0 ? (d.id === "hull" ? P.verd0 : resColor(d.id)) : P.ember1;
            g.text(`${d.amount > 0 ? "+" : "–"}${Math.abs(d.amount)} {ivory3}${RES_LABEL[d.id]}{/}`, cx + 24, y + 3, { font: "body", color: col, shadow: P.ink0 });
            cx += w + 6;
          }
        },
      });
    }
    for (const n of ap.notices) rows.push({ kind: "notice", h: 20, draw: (g, x, y) => drawNotice(g, n, x, y) });
    return rows;
  }

  function drawOutcome(g: Gfx, a: App, rows: OutRow[], x: number, y: number, w: number, _tw: number) {
    let cy = y;
    for (const r of rows) {
      r.draw(g, x, cy);
      cy += r.h;
    }
    cy += 8;
    const over = a.ui.hot("ev-continue", x - 6, cy - 2, w + 12, 22, true);
    if (over) {
      a.ui.cursor = "pointer";
      g.rect(x - 6, cy - 2, w + 12, 22, rgba(P.brass3, 0.18));
      g.rect(x - 6, cy - 2, 2, 22, P.brass1);
    }
    g.text("1.", x, cy, { font: "body", color: P.brass1, shadow: P.ink0 });
    g.text(applied?.combat ? "Continue. {ember1}(a fight){/}" : applied?.store ? "Continue. {amber1}(trade){/}" : "Continue.", x + 24, cy, { font: "body", color: over ? P.ivory0 : C.text, shadow: P.ink0 });
    const key = a.input.keyPressed("Digit1") || a.input.keyPressed("Space") || a.input.keyPressed("Enter") || a.input.keyPressed("Numpad1");
    if ((over && a.input.pressed(0)) || key) {
      a.input.consume();
      for (const k of ["Digit1", "Space", "Enter", "Numpad1"]) a.input.eatKey(k);
      const f = onContinue;
      onContinue = null;
      sfx.play("ui-click");
      f?.();
    }
  }

  return win;
}

const NOTICE_ICON: Partial<Record<Notice["kind"], string>> = {
  "crew-join": "glyph-crew", "crew-loss": "status-crew-lost", "crew-hurt": "status-crew-lost", system: "status-repair",
  fragment: "glyph-info", codex: "glyph-codex", map: "glyph-map", seal: "beacon-seal-front", repair: "status-repair",
  heal: "glyph-plus", overflow: "glyph-close", store: "glyph-store", car: "glyph-ship", module: "glyph-upgrade",
};

const NOTICE_COLOR: Partial<Record<Notice["kind"], string>> = {
  weapon: P.brass0, drone: P.brass0, augment: P.brass0, "crew-join": P.verd0, "crew-loss": P.ember1, "crew-hurt": P.amber1,
  system: P.ember1, fragment: P.ivory0, codex: P.teal1, map: P.teal1, seal: P.violet1, overflow: P.amber1, car: P.brass0,
  module: P.brass0, heal: P.verd0,
};

export function drawNotice(g: Gfx, n: Notice, x: number, y: number) {
  if ((n.kind === "weapon" || n.kind === "drone" || n.kind === "augment") && n.id) {
    itemThumb(g, n.id, x, y - 1, 18);
  } else {
    const ic = NOTICE_ICON[n.kind];
    if (!ic || !icon(g, ic, x + 1, y)) {
      g.rect(x + 5, y + 5, 6, 6, NOTICE_COLOR[n.kind] ?? P.ivory2);
    }
  }
  g.text(n.text, x + 24, y, { font: "body", color: NOTICE_COLOR[n.kind] ?? C.text, shadow: P.ink0 });
}

/** A tasteful stand-in for missing event art: a dark plate with the relay lamp and a slow scanline. */
export function placeholderArt(g: Gfx, x: number, y: number, w: number, h: number, t: number, id: string) {
  g.rect(x, y, w, h, P.ink1);
  let s = 0;
  for (const ch of id) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = 0; i < 40; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    g.rect(x + (s % w), y + ((s >> 8) % Math.floor(h * 0.6)), 1, 1, P.steel0);
  }
  // horizon, a carrier and a lamp
  g.rect(x, y + h - 36, w, 36, P.ink2);
  for (let i = 0; i < w; i += 6) g.rect(x + i, y + h - 36 + ((i * 7) % 5), 6, 2, P.ink3);
  for (let i = 0; i < w; i++) {
    const u = i / w;
    g.rect(x + i, y + 30 + Math.round(26 * 4 * u * (1 - u)), 1, 1, P.copper3);
  }
  const lx = x + Math.round(w * 0.62);
  const ly = y + 56;
  const on = t % 2.2 < 1.2;
  g.rect(lx - 2, ly - 2, 5, 5, on ? P.amber1 : P.brass5);
  if (on) g.alpha(0.2, () => g.circle(lx, ly, 12, P.amber2, true));
  const sl = y + Math.floor((t * 30) % h);
  g.alpha(0.08, () => g.rect(x, sl, w, 2, P.ivory0));
}

export function placeholderPortrait(g: Gfx, x: number, y: number, t: number) {
  g.rect(x, y, 96, 96, P.ink2);
  g.circle(x + 48, y + 40, 18, P.ink3, true);
  g.rect(x + 22, y + 62, 52, 34, P.ink3);
  g.rect(x + 40, y + 72, 4, 4, t % 2 < 1 ? P.amber2 : P.brass4);
}
