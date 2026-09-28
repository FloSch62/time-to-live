// The Runbook: codex entries and message fragments collected across voyages (meta progress). Unlocked entries are
// readable; locked ones are dimmed plates. Fragments are small message slips by stage.
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { art, layoutSize } from "../core/assets";
import { sfx } from "../core/audio";
import { lineHeight, wrap } from "../core/font";
import { P, C, rgba } from "../core/palette";
import type { CodexEntry, FragmentDef } from "../game/types";
import type { StageIndex } from "../game/ids";
import { content } from "../campaign/content";
import { meta } from "../campaign/persist";
import { activeSession } from "./session";
import { promises, volunteerRecord, rememberedIncident } from "../content/voyage-record";
import { DOCK_RECORDS } from "../content/tender-story";
import { ROMAN, TYPE, artFrame, brassButton, divider, fitFont, footer, header, runModal, scrim, tabRow, textAt } from "./kit";
import { capHeight, measure } from "../core/font";

const CATS: { id: CodexEntry["category"]; name: string }[] = [
  { id: "world", name: "THE LINE" },
  { id: "places", name: "PLACES" },
  { id: "people", name: "PEOPLE" },
  { id: "machines", name: "MACHINES" },
  { id: "tender", name: "THE TENDER" },
  { id: "runbook", name: "RUNBOOK" },
];

export function codexUnlocked(c: CodexEntry): boolean {
  const m = meta();
  const run = activeSession()?.run;
  if (c.unlock === "start") return true;
  if (m.codex.includes(c.id) || run?.codex.includes(c.id)) return true;
  if (c.unlock.startsWith("enemy:")) {
    const e = c.unlock.slice(6);
    return m.enemiesMet.includes(e) || !!run?.met.includes(e as never);
  }
  return false;
}

export function fragmentFound(f: FragmentDef): boolean {
  return meta().fragments.includes(f.id) || !!activeSession()?.run.fragments.includes(f.id);
}

export function createRunbookScene(app: App, onClose: () => void, opts: { standalone?: boolean } = {}): Scene {
  let tab = 0;
  let cat = 0;
  let entry: string | null = null;
  let stage: StageIndex = 1;
  sfx.play("ui-open", { volume: 0.7 });
  const scene: Scene = {
    overlay: !opts.standalone,
    draw(g, a) {
      const codex = [...content.codex.values()];
      const frags = [...content.fragments.values()];
      const cOpen = codex.filter(codexUnlocked).length;
      const fOpen = frags.filter(fragmentFound).length;
      const sub = `${cOpen} of ${codex.length} entries · ${fOpen} of ${frags.length} message fragments`;
      const run = activeSession()?.run;
      let box: { x: number; y: number; w: number; right: number; bottom: number };
      if (run && !opts.standalone) box = runModal(g, a, run, "The Runbook", sub);
      else {
        if (opts.standalone) {
          g.rect(0, 0, 960, 540, P.ink0);
          const bg = art("bg/title");
          if (bg) g.cover(bg, 0.35);
        } else scrim(g);
        const X = 16;
        const Y = 24;
        const W = 928;
        const H = 490;
        g.panel(X, Y, W, H, "dialog");
        textAt(g, "The Runbook", X + 24, Y + 20, { font: TYPE.title, color: P.brass0, shadow: P.ink0 });
        textAt(g, sub, X + 24 + Math.ceil(measure("The Runbook", TYPE.title)) + 14, Y + 20 + capHeight(TYPE.title) - capHeight(TYPE.note), { font: TYPE.note, color: P.ivory3 });
        box = { x: X + 24, y: Y + 48, w: W - 48, right: X + W - 24, bottom: Y + H - 22 };
      }
      tab = tabRow(a, "rb-tab", box.x, box.y - 4, 420, 24, [{ label: "ENTRIES" }, { label: "THE QUEUE" }, { label: "THIS VOYAGE" }], tab);
      const cy = box.y + 30;
      const ch = box.bottom - 38 - cy;
      if (tab === 0) entriesTab(g, a, codex, box.x, cy, box.w, ch);
      else if (tab === 1) queueTab(g, a, frags, box.x, cy, box.w, ch);
      else voyageTab(g, a, box.x, cy, box.w, ch);
      footer(g, a, [["WHEEL", "scroll"]], [["ESC", "close"]]);
      if (brassButton(a, "rb-close", box.right - 150, box.bottom - 28, 150, 28, "CLOSE", { hotkey: "Escape", hotkeys: ["KeyB"] })) {
        sfx.play("ui-back", { volume: 0.7 });
        a.scenes.remove(scene);
        onClose();
      }
    },
  };

  function voyageTab(g: Gfx, a: App, x: number, y: number, w: number, h: number) {
    const run = activeSession()?.run;
    if (!run) {
      g.text("A voyage's people and commitments are recorded here while it is underway. The entries and message fragments remain available between voyages.", x + 12, y + 16, { font: "body", width: w - 24 });
      return;
    }
    const entries = [{ title: run.ship.name, state: "DOCK RECORD", text: DOCK_RECORDS[run.ship.consist?.lead ?? "lamplighter"] }, ...promises(run)];
    if (!promises(run).length) entries.push({ title: "Promises and carried messages", state: "A CLEAN PAGE", text: "Accepted letters, remembered contacts and unfinished handovers will be kept here, with their next regional lead." });
    for (const c of run.ship.crew) entries.push({ title: c.name, state: "ABOARD", text: `${volunteerRecord(c)}\n${rememberedIncident(c)}` });
    for (const c of run.stats.crewLost) entries.push({ title: c.name, state: "DID NOT RETURN", text: "Their name stays on this voyage's page. The empty station belongs to someone the crew knew." });
    const rows = entries.map(e => ({ ...e, height: 44 + wrap(e.text, w - 48, "body").length * lineHeight("body") }));
    a.ui.scrollArea("rb-voyage", x, y, w, h, rows.reduce((sum, r) => sum + r.height + 8, 0), off => {
      let cy = y - off;
      for (const row of rows) {
        g.panel(x + 4, cy, w - 16, row.height, "panel");
        textAt(g, row.title, x + 18, cy + 14, { font: TYPE.body, color: P.brass1 });
        header(g, row.state, x + w - 30, cy + 15, { color: row.state === "DID NOT RETURN" ? P.ember1 : P.teal1, align: "right" });
        g.text(row.text, x + 18, cy + 30, { font: "body", width: w - 48 });
        cy += row.height + 8;
      }
    });
  }

  function entriesTab(g: Gfx, a: App, codex: CodexEntry[], x: number, y: number, w: number, h: number) {
    // categories
    CATS.forEach((c, i) => {
      const list = codex.filter((e) => e.category === c.id);
      const open = list.filter(codexUnlocked).length;
      if (brassButton(a, `rb-cat-${i}`, x, y + i * 30, 172, 26, `${c.name} ${open}/${list.length}`, { variant: cat === i ? "brass" : "normal", font: "label", sound: "ui-click" })) {
        cat = i;
        entry = null;
        a.ui.resetScroll("rb-list");
      }
    });
    const list = codex.filter((e) => e.category === CATS[cat].id);
    const lx = x + 184;
    const lw = 250;
    g.panel(lx, y, lw, h, "panel-dark");
    const rowH = 24;
    a.ui.scrollArea("rb-list", lx + 4, y + 4, lw - 8, h - 8, list.length * rowH + 4, (off) => {
      list.forEach((e, i) => {
        const ry = y + 6 + i * rowH - off;
        if (ry < y - rowH || ry > y + h) return;
        const open = codexUnlocked(e);
        const over = open && a.ui.hover(lx + 4, Math.max(ry, y), lw - 16, rowH - 2) && a.input.y >= y && a.input.y < y + h;
        const isSel = entry === e.id;
        g.rect(lx + 6, ry, lw - 20, rowH - 3, isSel ? rgba(P.brass3, 0.35) : over ? rgba(P.brass3, 0.18) : open ? P.ink2 : P.ink1);
        if (isSel) g.rect(lx + 6, ry, 2, rowH - 3, P.brass1);
        const fit = fitFont(e.title, lw - 36, [["body", 0], [TYPE.note, 0]]);
        g.text(open ? e.title : "—", lx + 14, ry + (fit.font === "body" ? 2 : 5), { font: open ? fit.font : "body", color: open ? (isSel ? P.ivory0 : C.text) : P.ink5 });
        if (over && a.input.pressed(0)) {
          a.input.consume();
          entry = e.id;
          a.ui.resetScroll("rb-read");
          sfx.play("ui-click", { volume: 0.6 });
        }
      });
    });
    // reading pane
    const px = lx + lw + 12;
    const pw = w - (px - x);
    g.panel(px, y, pw, h, "panel");
    const e = entry ? content.codex.get(entry) : null;
    if (!e) {
      g.text("{ivory3}Choose an entry. Entries open as the voyage meets people, places and machines; what one voyage learns, the next one keeps.{/}", px + 16, y + 16, { font: "body", width: pw - 32 });
      return;
    }
    const img = e.art ? art(e.art) : null;
    const textLines = wrap(e.text, pw - 40, "body");
    // DIRECTION v5 pixel art (events 320x160, scenes 640x360) is drawn 2x: one art pixel = two layout units
    const v5 = !!img && img.width <= 640 && /^(events|bg|ending)\//.test(e.art ?? "");
    const ls = img ? (v5 ? { w: img.width, h: img.height } : layoutSize(img)) : { w: 0, h: 0 };
    const artH = img && ls.w <= pw - 40 ? ls.h + 16 : 0;
    const contentH = 36 + artH + textLines.length * lineHeight("body") + 20;
    a.ui.scrollArea("rb-read", px + 4, y + 4, pw - 8, h - 8, contentH, (off) => {
      let cy = y + 14 - off;
      textAt(g, e.title, px + 16, cy + 2, { font: TYPE.title, color: P.brass0 });
      cy += 24;
      divider(g, px + 16, cy, pw - 40);
      cy += 10;
      if (img && artH) {
        artFrame(g, px + 16, cy, ls.w, ls.h);
        if (v5) g.pixelFit(img, px + 16, cy, ls.w, ls.h);
        else g.image(img, px + 16, cy);
        cy += artH;
      }
      g.text(e.text, px + 16, cy, { font: "body", color: C.text, width: pw - 40 });
    });
  }

  function queueTab(g: Gfx, a: App, frags: FragmentDef[], x: number, y: number, w: number, h: number) {
    ([1, 2, 3] as StageIndex[]).forEach((s, i) => {
      const list = frags.filter((f) => f.stage === s);
      const open = list.filter(fragmentFound).length;
      if (brassButton(a, `rb-st-${s}`, x + i * 176, y, 170, 24, `STAGE ${ROMAN[s]} · ${open}/${list.length}`, { variant: stage === s ? "brass" : "normal", font: "label", sound: "ui-click" })) {
        stage = s;
        a.ui.resetScroll("rb-queue");
      }
    });
    const list = frags.filter((f) => f.stage === stage);
    const cols = 3;
    const sw = Math.floor((w - 16 - (cols - 1) * 12) / cols);
    // every row is as tall as its longest open slip: message text is never cut
    const rowsN = Math.ceil(list.length / cols);
    const rowH: number[] = [];
    for (let r = 0; r < rowsN; r++) {
      let hmax = 72;
      for (const f of list.slice(r * cols, r * cols + cols)) if (fragmentFound(f)) hmax = Math.max(hmax, slipHeight(f, sw));
      rowH.push(hmax);
    }
    const top = y + 34;
    const hh = h - 34;
    a.ui.scrollArea("rb-queue", x, top, w, hh, rowH.reduce((s2, v) => s2 + v + 12, 0), (off) => {
      let sy = top - off;
      for (let r = 0; r < rowsN; r++) {
        list.slice(r * cols, r * cols + cols).forEach((f, k) => {
          if (sy > top + hh || sy + rowH[r] < top) return;
          slip(g, f, x + k * (sw + 12), sy, sw, rowH[r], fragmentFound(f));
        });
        sy += rowH[r] + 12;
      }
    });
  }

  return scene;
}

/** An ivory message slip (queue/ground) or a dark radio log card (evening calls). */
export function slip(g: Gfx, f: FragmentDef, x: number, y: number, w: number, h: number, open: boolean) {
  const teal = f.kind === "teal";
  const paper = teal ? P.ink2 : f.kind === "ground" ? P.ivory2 : P.ivory1;
  g.rect(x + 2, y + 2, w, h, P.ink0);
  if (!open) {
    g.rect(x, y, w, h, P.ink2);
    g.box(x, y, w, h, P.ink4);
    header(g, "Undelivered", x + w / 2, y + h / 2 - 4, { color: P.ink5, align: "center" });
    return;
  }
  g.rect(x, y, w, h, paper);
  // torn-off perforation at the top and a punched hole
  for (let k = 2; k < w - 2; k += 4) g.rect(x + k, y, 2, 1, teal ? P.ink3 : P.ivory3);
  g.rect(x + w - 12, y + 6, 4, 4, teal ? P.ink1 : P.ivory3);
  const ink = teal ? P.teal1 : P.ink2;
  const dim = teal ? P.teal3 : P.ivory4;
  const hh = slipHead(f, w);
  textAt(g, `From ${f.from}`, x + 8, y + 8, { font: TYPE.note, color: dim, width: w - 30 });
  textAt(g, `To ${f.to}`, x + 8, y + 8 + hh.from * lineHeight(TYPE.note), { font: TYPE.note, color: dim, width: w - 16 });
  const ly = y + 8 + (hh.from + hh.to) * lineHeight(TYPE.note);
  g.hline(x + 8, ly, w - 16, teal ? P.ink4 : P.ivory3);
  g.text(f.text, x + 8, ly + 4, { font: "body", color: ink, width: w - 16 });
  if (f.kind === "ground") {
    // a small postmark
    g.circle(x + w - 20, y + h - 18, 10, P.copper2);
    g.circle(x + w - 20, y + h - 18, 7, rgba(P.copper2, 0.6));
  }
}

function slipHead(f: FragmentDef, w: number) {
  return { from: wrap(`From ${f.from}`, w - 30, TYPE.note).length, to: wrap(`To ${f.to}`, w - 16, TYPE.note).length };
}

/** Height a message slip needs to show its whole text. */
function slipHeight(f: FragmentDef, w: number): number {
  const hh = slipHead(f, w);
  return 8 + (hh.from + hh.to) * lineHeight(TYPE.note) + 4 + wrap(f.text, w - 16, "body").length * lineHeight("body") + 10;
}
