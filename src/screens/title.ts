// Title screen: key art at 2× with twinkling stars and the Line's lamps, the TIME TO LIVE logo in brass and ivory,
// the menu (Continue with stage/relay/tender, New voyage, The Runbook, Settings, Credits) and the blinking KEEPER
// lamp. Music "title".
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { art, markHD } from "../core/assets";
import { music, sfx } from "../core/audio";
import { drawText, measure } from "../core/font";
import { P, C, rgba } from "../core/palette";
import "../campaign/content-loader";
import { content } from "../campaign/content";
import { loadRun, meta, saveSummary } from "../campaign/persist";
import { stageName } from "../campaign/events";
import { drawBackdrop, twinkle } from "./backdrop";
import { ROMAN, SCRIM, TYPE, brassButton, footer, header, keeperLamp, textAt, glow, divider } from "./kit";
import { Session } from "./session";
import { registerTitle } from "./nav";
import { createNewVoyage } from "./newvoyage";
import { createRunbookScene } from "./runbook";
import { createSettingsScene } from "./settings";
import { createGuideScene } from "./guide";
import { createCreditsScene } from "./credits";
import { carrierScene } from "./tender";
import { baselineShip } from "../campaign/shipops";
import { difficultyRules } from "../data/difficulty";

let logoCanvas: HTMLCanvasElement | null = null;

/**
 * The logo, rendered once at HD from the big bitmap font: every font pixel becomes a 4×4 block of image pixels (2×2
 * layout units), shaded per image row in brass (ivory light at the top of every stroke, deep brass underneath), with
 * a fine dark outline — engraved brass plate lettering, crisp at 1080p.
 */
function logo(): HTMLCanvasElement | null {
  if (logoCanvas) return logoCanvas;
  const text = "TIME TO LIVE";
  const fw = measure(text, "big") + 2;
  if (fw < 40) return null; // fonts not ready
  const fh = 30;
  const src = document.createElement("canvas");
  src.width = fw;
  src.height = fh;
  const sc = src.getContext("2d", { willReadFrequently: true })!;
  drawText(sc, text, 1, 0, { font: "big", color: "#ffffff" });
  const m = sc.getImageData(0, 0, fw, fh).data;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < fw && y < fh && m[(y * fw + x) * 4 + 3] > 128;
  // vertical extent of the glyphs
  let top = fh;
  let bot = 0;
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (on(x, y)) {
    top = Math.min(top, y);
    bot = Math.max(bot, y);
  }
  const S = 4;
  const pad = 6;
  const W = fw * S + pad * 2;
  const H = (bot - top + 1) * S + pad * 2;
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const oc = out.getContext("2d")!;
  const img = oc.createImageData(W, H);
  const d = img.data;
  const set = (x: number, y: number, hexc: string) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const n = parseInt(hexc.slice(1), 16);
    const i = (y * W + x) * 4;
    d[i] = (n >> 16) & 255;
    d[i + 1] = (n >> 8) & 255;
    d[i + 2] = n & 255;
    d[i + 3] = 255;
  };
  const ramp = [P.brass0, P.brass0, P.brass1, P.brass1, P.brass1, P.brass2, P.brass2, P.brass2, P.brass3, P.brass3, P.brass4];
  const gh = (bot - top + 1) * S;
  const inside = (X: number, Y: number) => on(Math.floor((X - pad) / S), Math.floor((Y - pad) / S) + top) && X >= pad && Y >= pad;
  // outline (2 image px) first
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    if (inside(X, Y)) continue;
    let near = false;
    for (let dy = -2; dy <= 3 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) if (inside(X + dx, Y + dy)) near = true;
    if (near) set(X, Y, P.ink0);
  }
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    if (!inside(X, Y)) continue;
    const row = Math.max(0, Math.min(ramp.length - 1, Math.floor(((Y - pad) / gh) * ramp.length)));
    let col: string = ramp[row];
    if (!inside(X, Y - 1)) col = P.ivory0; // lit top edge of every stroke
    else if (!inside(X, Y - 2)) col = P.brass0;
    else if (!inside(X, Y + 1)) col = P.brass5; // underside
    else if (!inside(X - 1, Y)) col = row < 4 ? P.brass0 : P.brass2; // lit left edge
    else if (!inside(X + 1, Y)) col = P.brass4;
    set(X, Y, col);
  }
  oc.putImageData(img, 0, 0);
  markHD(out);
  logoCanvas = out;
  return out;
}

const MENU_X = 72;

registerTitle((app) => createTitle(app));

export function createTitle(app: App): Scene {
  let t = 0;
  let summary = saveSummary();
  let confirmNew = false;
  const demoShip = baselineShip("Lamplighter");
  const scene: Scene = {
    enter() {
      void music.play("title");
      summary = saveSummary();
    },
    update(dt) {
      t += dt;
    },
    draw(g, a) {
      const mx = Math.round(((a.input.x - 480) / 480) * 3);
      const hasArt = !!art("bg/title");
      drawBackdrop(g, "bg/title", { kind: "title", seed: 4242 });
      twinkle(g, t, 1234, 34, 280);
      // the Line's lamps: a slow light running along the arc (only over the painted fallback, where we know the arc)
      if (!hasArt) {
        const u = (t * 0.03) % 1;
        const lx = Math.round(u * 960);
        const ly = Math.round(2 * (64 + 26 * ((lx / 2 - 240) / 240) ** 2)) - 3;
        glow(g, lx, ly, 8, P.amber1, 0.35);
      }
      // The real Lamplighter on its drive trolley and carrier, over the painted night (the v5 title art leaves the
      // car to the game so it is always the car the player rides).
      // Seen from outside on the title card: the closed car (no cutaway). The carrier starts under the menu's solid
      // backing and comes out of it through the fade, so it never crosses the menu text at full contrast.
      const COL = 404;
      carrierScene(g, demoShip, t, { x: 700 + mx, cableY: 250, sway: true, region: 1, exterior: true, carrierFrom: COL - 48 });
      // The menu column has its own dark backing, so it reads over any title art (bright clouds included): solid
      // behind the logo and the menu, then a short fade into the picture.
      g.alpha(0.82, () => g.rect(0, 0, COL, 540, P.ink0));
      for (let x = 0; x < 96; x += 2) g.alpha(0.82 * (1 - x / 96), () => g.rect(COL + x, 0, 2, 540, P.ink0));
      // logo
      const L = logo();
      // kicker (with the KEEPER lamp blinking at its end) and the wordmark; the menu follows
      const top = summary ? 96 : 112;
      const kw = header(g, "A Faultline voyage", MENU_X + 2, top, { color: P.brass1 });
      g.hline(MENU_X - 24, top + 3, 18, P.brass3);
      keeperLamp(g, MENU_X + 2 + kw + 16, top + 3, t);
      if (L) g.image(L, MENU_X - 5, top + 16);
      else g.text("TIME TO LIVE", MENU_X, top + 22, { font: "big", color: P.brass1 });
      let my = top + 110;
      const bw = 300;
      if (summary) {
        const sub = `${difficultyRules(summary.difficulty).name} · ${summary.ship} · Stage ${ROMAN[summary.stage as 1 | 2 | 3]}`;
        if (brassButton(a, "t-continue", MENU_X, my, bw, 46, "CONTINUE VOYAGE", { hotkey: "Enter", sub })) continueVoyage();
        my += 56;
      }
      const item = (id: string, label: string, sub: string, key?: string) => {
        const ih = sub ? 40 : 30;
        const over = a.ui.hot(id, MENU_X, my, bw, ih, true);
        if (over) {
          a.ui.cursor = "pointer";
          g.rect(MENU_X, my, bw, ih, rgba(P.brass3, 0.16));
        }
        g.rect(MENU_X, my + 2, 2, ih - 4, over ? P.brass1 : P.brass4);
        textAt(g, label, MENU_X + 16, my + 6, { font: TYPE.title, color: over ? P.ivory0 : P.ivory1, shadow: P.ink0 });
        if (sub) textAt(g, sub, MENU_X + 16, my + 26, { font: TYPE.note, color: over ? P.ivory1 : P.ivory3 });
        const hit = (over && a.input.pressed(0)) || (key && a.input.keyPressed(key));
        if (hit) {
          a.input.consume();
          if (key) a.input.eatKey(key);
          sfx.play("ui-click");
        }
        my += ih + 6;
        return !!hit;
      };
      if (item("t-new", "New voyage", summary ? "Abandons the voyage underway" : "From Relay Seven", summary ? undefined : "Enter")) {
        if (summary) confirmNew = true;
        else newVoyage();
      }
      const m = meta();
      const entries = [...content.codex.values()].filter((c) => c.unlock === "start" || m.codex.includes(c.id)).length;
      if (item("t-runbook", "The Runbook", `${entries} entries · ${m.fragments.length} message fragments`)) a.scenes.push(createRunbookScene(a, () => {}, { standalone: false }));
      if (item("t-settings", "Settings", "")) a.scenes.push(createSettingsScene(a));
      if (item("t-guide", "Field guide", "Controls and tactics · F1", "F1")) a.scenes.push(createGuideScene(a));
      if (item("t-credits", "Credits", "")) a.scenes.switchTo(createCreditsScene(a));
      // footer
      footer(g, a, [], summary ? [["ENTER", "continue"], ["F1", "field guide"]] : [["ENTER", "new voyage"], ["F1", "field guide"]], { note: `Alpha · ${m.voyages} voyage${m.voyages === 1 ? "" : "s"} · ${m.completed} answered` });
      if (confirmNew) confirmDialog(g, a);
    },
  };

  function confirmDialog(g: Gfx, a: App) {
    g.dim(SCRIM);
    const w = 420;
    const h = 150;
    const x = 480 - w / 2;
    const y = 270 - h / 2;
    g.panel(x, y, w, h, "panel-danger");
    header(g, "Abandon the voyage?", 480, y + 20, { font: TYPE.strong, color: P.ember1, align: "center" });
    textAt(g, `The ${summary?.ship ?? "tender"} is still out on the Line. Starting again drops that connection for good.`, 480, y + 42, { align: "center", width: w - 40, color: C.text });
    if (brassButton(a, "cn-yes", x + 30, y + h - 44, 170, 28, "START AGAIN", { variant: "danger" })) {
      confirmNew = false;
      newVoyage();
    }
    if (brassButton(a, "cn-no", x + w - 200, y + h - 44, 170, 28, "KEEP IT", { variant: "normal", hotkey: "Escape" })) confirmNew = false;
  }

  function newVoyage() {
    app.scenes.switchTo(createNewVoyage(app), true, 0.4);
  }

  function continueVoyage() {
    const run = loadRun();
    if (!run) {
      summary = null;
      return;
    }
    const s = new Session(app, run);
    s.begin({});
  }

  void stageName;
  return scene;
}
