// The event window (FTL style): title plate, optional 320×160 event art and/or 96×96 portrait with a speaker plate,
// typewriter text with markup, numbered choices (1–4 hotkeys) with blue options and disabled reasons; then the outcome
// with resource deltas, item/crew/fragment/Runbook notices and Continue.
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { art, artSettled } from "../core/assets";
import { sfx } from "../core/audio";
import { settings } from "../core/save";
import { lineHeight, wrap, measure } from "../core/font";
import { P, C, rgba } from "../core/palette";
import type { Applied, ChoiceView, EventView, Notice } from "../campaign/events";
import type { Session } from "./session";
import { createPauseMenu } from "./pause";
import { SCRIM, TYPE, artFrame, hasUi, header, icon, resColor, resIcon, RES_LABEL, scrim, titlePlate, tracked } from "./kit";
import { itemThumb } from "./items";

export interface EventWindow extends Scene {
  setChoices(view: EventView, resolve: (i: number) => void): void;
  setOutcome(applied: Applied, view: EventView, resolve: () => void): void;
}

const TEXT_SPEED = 150; // chars per second
const PAD = 24;
const SPEAKER_H = 17;

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
  /** Seconds since the text finished typing (the choices wake up). */
  let settleT = 0;

  function startText(text: string) {
    chars = Math.max(1, text.replace(/\{[^}]*\}/g, "").length);
    reveal = settings.textSpeed === "instant" ? 1 : 0;
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
      settleT += dt;
      appear = Math.min(1, appear + dt * 5);
      if (reveal < 1) reveal = settings.textSpeed === "instant" ? 1 : Math.min(1, reveal + (dt * TEXT_SPEED * (settings.textSpeed === "fast" ? 3 : 1)) / chars);
    },
    draw(g, a) {
      if (!view) return;
      scrim(g, a, session.run, SCRIM * Math.min(1, 0.4 + appear));
      const input = a.input;
      const artImg = view.art ? art(view.art.includes("/") ? view.art : `events/${view.art}`) : null;
      const portrait = view.portrait ? art(`portraits/${view.portrait}`) : null;
      const showPortrait = !!view.portrait;
      const body = applied ? applied.text ?? "" : view.text;
      const L = layout(view, body, !!view.art);
      const { x, winW, h, textX, textW } = L;
      const y = Math.round(L.y + (settings.reducedMotion ? 0 : (1 - appear) * 10));
      g.panel(x, y, winW, h, "dialog");
      if (view.title) titlePlate(g, 480, y - 11, view.title.toUpperCase(), { w: 260 });
      let cy = y + PAD;
      if (L.art === "top") {
        const ax = 480 - 160;
        artFrame(g, ax, cy, 320, 160);
        if (artImg) g.pixelFit(artImg, ax, cy, 320, 160); // v5 events are 320x160 art px drawn 2x; HD art fits at 1x
        else placeholderArt(g, ax, cy, 320, 160, t, view.art ?? "");
        cy += 160 + 16;
      } else if (L.art === "side") {
        const ax = x + PAD;
        artFrame(g, ax, cy + 2, 320, 160);
        if (artImg) g.pixelFit(artImg, ax, cy + 2, 320, 160); // v5 event art 320x160 drawn 2x (A)
        else placeholderArt(g, ax, cy + 2, 320, 160, t, view.art ?? "");
      }
      const blockTop = cy;
      if (showPortrait) {
        const px = L.art === "side" ? x + PAD : x + PAD;
        const py = L.art === "side" ? cy + 176 : cy + 2;
        artFrame(g, px, py, 96, 96, P.brass2);
        if (portrait) g.image(portrait, px, py);
        else placeholderPortrait(g, px, py, t);
      }
      if (view.speaker) {
        header(g, view.speaker, textX, cy + 2, { font: TYPE.strong, color: P.brass1 });
        cy += SPEAKER_H;
      }
      if (body) g.text(body, textX, cy, { font: "body", color: C.text, width: textW, reveal, shadow: P.ink0 });
      cy = blockTop + L.textBlockH + 14;
      g.hline(x + PAD, cy - 8, winW - PAD * 2, rgba(P.brass3, 0.5));
      const typing = reveal < 1;
      if (typing) {
        const skip = input.keyPressed("Space") || input.keyPressed("Enter");
        if (skip || input.pressed(0)) {
          reveal = 1;
          input.eatKey("Space");
          input.eatKey("Enter");
          input.consume();
        }
      }
      // The choices are laid out from the start (no empty region while the text types); they wake when it is done.
      g.alpha(typing ? 0.3 : Math.min(1, settleT * 6 + 0.3), () => {
        if (!applied) drawChoices(g, a, L.rows as ChoiceRow[], x + PAD, cy, winW - PAD * 2, !typing);
        else drawOutcome(g, a, L.rows as OutRow[], x + PAD, cy, winW - PAD * 2, !typing);
      });
      if (typing) settleT = 0;
      if (!typing && input.keyPressed("Escape")) {
        input.eatKey("Escape");
        session.push(createPauseMenu(a, session));
      }
    },
  };

  /** Space and placement of everything in the window; the art moves beside the text, then goes, when tall. */
  function layout(v: EventView, body: string, hasArt: boolean) {
    const showPortrait = !!v.portrait;
    const maxH = 514 - 76;
    const lh = lineHeight("body");
    const speakerH = v.speaker ? SPEAKER_H : 0;
    const build = (winW: number, artMode: "top" | "side" | "none") => {
      const inner = winW - PAD * 2;
      const leftCol = artMode === "side" ? 336 : showPortrait ? 112 : 0;
      const textW = inner - leftCol;
      const lines = body ? wrap(body, textW, "body").length : 0;
      const leftH = artMode === "side" ? 162 + (showPortrait ? 16 + 98 : 0) : showPortrait ? 100 : 0;
      const textBlockH = Math.max(lines * lh + speakerH, leftH);
      const rows = applied ? outcomeRows(applied) : choiceRows(v.choices, inner);
      const rowsH = applied ? rows.reduce((s2, r) => s2 + r.h, 0) + 8 + 24 : rows.reduce((s2, r) => s2 + r.h + 4, 0);
      const h = PAD + (artMode === "top" ? 176 : 0) + textBlockH + 14 + rowsH + PAD - 6;
      return { winW, art: artMode, textW, textBlockH, rows, h, leftCol };
    };
    const tries: [number, "top" | "side" | "none"][] = hasArt
      ? [[showPortrait || (v.text ?? "").length > 420 ? 760 : 700, "top"], [860, "top"], [900, "side"], [900, "none"]]
      : [[showPortrait || (v.text ?? "").length > 420 ? 760 : 700, "none"], [860, "none"], [900, "none"]];
    let L = build(tries[0][0], tries[0][1]);
    for (const [w0, m] of tries) {
      L = build(w0, m);
      if (L.h <= maxH) break;
    }
    const x = Math.round(480 - L.winW / 2);
    const y = Math.max(76, Math.round(76 + (maxH - L.h) / 2));
    const textX = x + PAD + L.leftCol;
    return { ...L, x, y, textX };
  }

  interface ChoiceRow {
    c: ChoiceView;
    num: number;
    lines: string[];
    sub: string[];
    h: number;
  }

  function choiceRows(choices: ChoiceView[], w: number): ChoiceRow[] {
    const rows: ChoiceRow[] = [];
    let num = 1;
    for (const c of choices) {
      if (c.hidden) continue;
      const label = c.blue && c.label ? `{teal1}${c.label}{/} ` : "";
      const lines = wrap(`${label}${c.text}`, w - 30, "body");
      // a fixed cost first (amber), then the requirement that is missing, or the uncertainty
      const note = [c.cost ? `{amber1}${c.cost}{/}` : "", !c.enabled && c.reason ? c.reason : c.risk ? c.risk : c.blue && !c.cost ? "capability available" : ""].filter(Boolean).join(" {ivory4}·{/} ");
      const sub = note ? wrap(note, w - 30, TYPE.note) : [];
      rows.push({ c, num: num++, lines, sub, h: lines.length * lineHeight("body") + sub.length * lineHeight(TYPE.note) + 2 });
    }
    return rows;
  }

  function drawChoices(g: Gfx, a: App, rows: ChoiceRow[], x: number, y: number, w: number, live: boolean) {
    let cy = y;
    let hovered = -1;
    for (const r of rows) {
      const over = live && a.ui.hot(`evc-${r.num}`, x - 6, cy - 3, w + 12, r.h + 2, r.c.enabled);
      if (over) hovered = r.num;
      const key = `Digit${r.num}`;
      const keyHit = live && (a.input.keyPressed(key) || a.input.keyPressed(`Numpad${r.num}`));
      if (over && r.c.enabled) {
        a.ui.cursor = "pointer";
        g.rect(x - 6, cy - 3, w + 12, r.h + 2, rgba(r.c.blue ? P.teal3 : P.brass3, 0.18));
        g.rect(x - 6, cy - 3, 2, r.h + 2, r.c.blue ? P.teal2 : P.brass1);
      } else if (over) a.ui.cursor = "blocked";
      const numCol = !r.c.enabled ? P.ivory4 : r.c.blue ? P.teal1 : P.brass1;
      g.text(`${r.num}.`, x, cy, { font: "body", color: numCol, shadow: P.ink0 });
      const col = !r.c.enabled ? C.textFaint : r.c.blue ? P.teal0 : over ? P.ivory0 : C.text;
      g.text(r.lines.join("\n"), x + 24, cy, { font: "body", color: col, shadow: P.ink0 });
      if (r.sub.length) g.text(r.sub.join("\n"), x + 24, cy + r.lines.length * lineHeight("body") - 2, { font: TYPE.note, color: !r.c.enabled ? P.ember1 : r.c.blue ? P.teal2 : P.ivory4 });
      if (live && r.c.enabled && ((over && a.input.pressed(0)) || keyHit)) {
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

  function drawOutcome(g: Gfx, a: App, rows: OutRow[], x: number, y: number, w: number, live: boolean) {
    let cy = y;
    for (const r of rows) {
      r.draw(g, x, cy);
      cy += r.h;
    }
    cy += 8;
    const over = live && a.ui.hot("ev-continue", x - 6, cy - 3, w + 12, 22, true);
    if (over) {
      a.ui.cursor = "pointer";
      g.rect(x - 6, cy - 3, w + 12, 22, rgba(P.brass3, 0.18));
      g.rect(x - 6, cy - 3, 2, 22, P.brass1);
    }
    g.text("1.", x, cy, { font: "body", color: P.brass1, shadow: P.ink0 });
    g.text(applied?.combat ? "Continue. {ember1}(a fight){/}" : applied?.store ? "Continue. {amber1}(trade){/}" : "Continue.", x + 24, cy, { font: "body", color: over ? P.ivory0 : C.text, shadow: P.ink0 });
    if (!live) return;
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
