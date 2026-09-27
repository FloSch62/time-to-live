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
import { ROMAN, artFrame, brassButton, divider, titlePlate, tracked } from "./kit";

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
      if (opts.standalone) {
        g.rect(0, 0, 960, 540, P.ink0);
        const bg = art("bg/title");
        if (bg) g.cover(bg, 0.35);
      } else g.dim(0.65);
      const X = 20;
      const Y = 30;
      const W = 920;
      const H = 490;
      g.panel(X, Y, W, H, "dialog");
      titlePlate(g, 480, Y - 11, "THE RUNBOOK", { w: 260 });
      const codex = [...content.codex.values()];
      const frags = [...content.fragments.values()];
      const cOpen = codex.filter(codexUnlocked).length;
      const fOpen = frags.filter(fragmentFound).length;
      tracked(g, `${cOpen}/${codex.length} ENTRIES · ${fOpen}/${frags.length} FRAGMENTS`, X + W - 24, Y + 20, { font: "label", color: P.ivory3, align: "right" });
      ["ENTRIES", "THE QUEUE"].forEach((l, i) => {
        if (brassButton(a, `rb-tab-${i}`, X + 24 + i * 150, Y + 14, 144, 24, l, { variant: tab === i ? "brass" : "normal", font: "label", sound: "ui-click" })) tab = i;
      });
      if (tab === 0) entriesTab(g, a, codex, X + 24, Y + 50, W - 48, H - 100);
      else queueTab(g, a, frags, X + 24, Y + 50, W - 48, H - 100);
      if (brassButton(a, "rb-close", X + W - 24 - 150, Y + H - 42, 150, 28, "CLOSE", { hotkey: "Escape", hotkeys: ["KeyB"] })) {
        sfx.play("ui-back", { volume: 0.7 });
        a.scenes.remove(scene);
        onClose();
      }
    },
  };

  function entriesTab(g: Gfx, a: App, codex: CodexEntry[], x: number, y: number, w: number, h: number) {
    // categories
    CATS.forEach((c, i) => {
      const list = codex.filter((e) => e.category === c.id);
      const open = list.filter(codexUnlocked).length;
      if (brassButton(a, `rb-cat-${i}`, x, y + i * 30, 160, 26, `${c.name} ${open}/${list.length}`, { variant: cat === i ? "brass" : "normal", font: "label", sound: "ui-click" })) {
        cat = i;
        entry = null;
        a.ui.resetScroll("rb-list");
      }
    });
    const list = codex.filter((e) => e.category === CATS[cat].id);
    const lx = x + 172;
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
        g.text(open ? e.title : "—", lx + 14, ry + 2, { font: "body", color: open ? (isSel ? P.ivory0 : C.text) : P.ink5, width: lw - 36, maxLines: 1 });
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
      g.text("{ivory4}Choose an entry. Entries open as the voyage meets people, places and machines; what one voyage learns, the next one keeps.{/}", px + 16, y + 16, { font: "body", width: pw - 32 });
      return;
    }
    const img = e.art ? art(e.art) : null;
    const textLines = wrap(e.text, pw - 40, "body");
    const ls = img ? layoutSize(img) : { w: 0, h: 0 };
    const artH = img && ls.w <= pw - 40 ? ls.h + 16 : 0;
    const contentH = 30 + artH + textLines.length * lineHeight("body") + 20;
    a.ui.scrollArea("rb-read", px + 4, y + 4, pw - 8, h - 8, contentH, (off) => {
      let cy = y + 14 - off;
      tracked(g, e.title.toUpperCase(), px + 16, cy, { font: "labelb", color: P.brass0 });
      cy += 18;
      divider(g, px + 16, cy, pw - 40);
      cy += 10;
      if (img && artH) {
        artFrame(g, px + 16, cy, ls.w, ls.h);
        g.image(img, px + 16, cy);
        cy += artH;
      }
      g.text(e.text, px + 16, cy, { font: "body", color: C.text, width: pw - 40 });
    });
  }

  function queueTab(g: Gfx, a: App, frags: FragmentDef[], x: number, y: number, w: number, h: number) {
    ([1, 2, 3] as StageIndex[]).forEach((s, i) => {
      const list = frags.filter((f) => f.stage === s);
      const open = list.filter(fragmentFound).length;
      if (brassButton(a, `rb-st-${s}`, x + i * 164, y, 158, 24, `STAGE ${ROMAN[s]} · ${open}/${list.length}`, { variant: stage === s ? "brass" : "normal", font: "label", sound: "ui-click" })) {
        stage = s;
        a.ui.resetScroll("rb-queue");
      }
    });
    const list = frags.filter((f) => f.stage === stage);
    const cols = 3;
    const sw = Math.floor((w - 16 - (cols - 1) * 12) / cols);
    const sh = 112;
    const rows = Math.ceil(list.length / cols);
    const top = y + 34;
    const hh = h - 34;
    a.ui.scrollArea("rb-queue", x, top, w, hh, rows * (sh + 12), (off) => {
      list.forEach((f, i) => {
        const sx = x + (i % cols) * (sw + 12);
        const sy = top + Math.floor(i / cols) * (sh + 12) - off;
        if (sy > top + hh || sy + sh < top) return;
        slip(g, f, sx, sy, sw, sh, fragmentFound(f));
      });
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
    tracked(g, "UNDELIVERED", x + w / 2, y + h / 2 - 4, { font: "small", color: P.ink5, align: "center", track: 2 });
    return;
  }
  g.rect(x, y, w, h, paper);
  // torn-off perforation at the top and a punched hole
  for (let k = 2; k < w - 2; k += 4) g.rect(x + k, y, 2, 1, teal ? P.ink3 : P.ivory3);
  g.rect(x + w - 12, y + 6, 4, 4, teal ? P.ink1 : P.ivory3);
  const ink = teal ? P.teal1 : P.ink2;
  const dim = teal ? P.teal3 : P.ivory4;
  g.text(`FROM ${f.from}`.toUpperCase(), x + 8, y + 6, { font: "small", color: dim, width: w - 26, maxLines: 1 });
  g.text(`TO ${f.to}`.toUpperCase(), x + 8, y + 16, { font: "small", color: dim, width: w - 16, maxLines: 1 });
  g.hline(x + 8, y + 27, w - 16, teal ? P.ink4 : P.ivory3);
  g.text(f.text, x + 8, y + 31, { font: "body", color: ink, width: w - 16, maxLines: 4 });
  if (f.kind === "ground") {
    // a small postmark
    g.circle(x + w - 20, y + h - 18, 10, P.copper2);
    g.circle(x + w - 20, y + h - 18, 7, rgba(P.copper2, 0.6));
  }
}
