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
import { ROMAN, brassButton, keeperLamp, tracked, glow, divider } from "./kit";
import { Session } from "./session";
import { registerTitle } from "./nav";
import { createNewVoyage } from "./newvoyage";
import { createRunbookScene } from "./runbook";
import { createSettingsScene } from "./settings";
import { createGuideScene } from "./guide";
import { createCreditsScene } from "./credits";
import { carrierScene } from "./tender";
import { baselineShip } from "../campaign/shipops";

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
        carrierScene(g, demoShip, t, { x: 700 + mx, cableY: 250, sway: true });
      }
      // left vignette for the menu
      g.alpha(0.55, () => {
        for (let x = 0; x < 420; x += 2) g.alpha(Math.max(0, 1 - x / 420), () => g.rect(x, 0, 2, 540, P.ink0));
      });
      // logo
      const L = logo();
      tracked(g, "A FAULTLINE VOYAGE", MENU_X + 2, 74, { font: "label", color: P.brass2, track: 4 });
      g.hline(MENU_X - 24, 79, 18, P.brass3);
      if (L) g.image(L, MENU_X - 5, 92);
      else g.text("TIME TO LIVE", MENU_X, 100, { font: "big", color: P.brass1 });
      const ty = 90 + 34 * 2 + 10;
      divider(g, MENU_X, ty + 4, 150);
      keeperLamp(g, MENU_X + 170, ty + 4, t);
      g.text("Every hop costs a little life.", MENU_X, ty + 16, { font: "head", color: P.ivory1, shadow: P.ink0 });
      // menu
      let my = summary ? 260 : 300;
      const bw = 300;
      if (summary) {
        const sub = `STAGE ${ROMAN[summary.stage as 1 | 2 | 3]} · ${summary.relay} · ${summary.ship.toUpperCase()}`;
        if (brassButton(a, "t-continue", MENU_X, my, bw, 46, "CONTINUE VOYAGE", { hotkey: "Enter", sub, font: "labelb" })) continueVoyage();
        my += 54;
      }
      const item = (id: string, label: string, sub: string, key?: string) => {
        const over = a.ui.hot(id, MENU_X, my, bw, 30, true);
        if (over) {
          a.ui.cursor = "pointer";
          g.rect(MENU_X, my, bw, 30, rgba(P.brass3, 0.12));
        }
        g.vline(MENU_X, my + 2, 26, over ? P.brass1 : P.brass4);
        g.text(label, MENU_X + 16, my + 4, { font: "head", color: over ? P.ivory0 : P.ivory1, shadow: P.ink0 });
        if (sub) tracked(g, sub, MENU_X + bw - 8, my + 11, { font: "small", color: P.ivory2, shadow: P.ink0, align: "right", track: 1 });
        const hit = (over && a.input.pressed(0)) || (key && a.input.keyPressed(key));
        if (hit) {
          a.input.consume();
          if (key) a.input.eatKey(key);
          sfx.play("ui-click");
        }
        my += 36;
        return !!hit;
      };
      if (item("t-new", "New voyage", summary ? "ABANDONS THE CURRENT ONE" : "FROM RELAY SEVEN", summary ? undefined : "Enter")) {
        if (summary) confirmNew = true;
        else newVoyage();
      }
      const m = meta();
      const entries = [...content.codex.values()].filter((c) => c.unlock === "start" || m.codex.includes(c.id)).length;
      if (item("t-runbook", "The Runbook", `${entries} ENTRIES · ${m.fragments.length} FRAGMENTS`)) a.scenes.push(createRunbookScene(a, () => {}, { standalone: false }));
      if (item("t-settings", "Settings", "")) a.scenes.push(createSettingsScene(a));
      if (item("t-guide", "Field guide", "CONTROLS & TACTICS · F1", "F1")) a.scenes.push(createGuideScene(a));
      if (item("t-credits", "Credits", "")) a.scenes.switchTo(createCreditsScene(a));
      // footer
      tracked(g, `ALPHA · ${m.voyages} VOYAGE${m.voyages === 1 ? "" : "S"} · ${m.completed} ANSWERED`, MENU_X, 540 - 28, { font: "small", color: P.ivory4, track: 2 });
      tracked(g, "MUSIC · TIME TO LIVE", 960 - 24, 540 - 28, { font: "small", color: P.ivory4, align: "right", track: 2 });
      if (confirmNew) confirmDialog(g, a);
    },
  };

  function confirmDialog(g: Gfx, a: App) {
    g.dim(0.6);
    const w = 420;
    const h = 150;
    const x = 480 - w / 2;
    const y = 270 - h / 2;
    g.panel(x, y, w, h, "panel-danger");
    tracked(g, "ABANDON THE VOYAGE?", 480, y + 20, { font: "labelb", color: P.ember1, align: "center" });
    g.text(`The ${summary?.ship ?? "tender"} is still out on the Line. Starting again drops that connection for good.`, 480, y + 40, { align: "center", width: w - 40, color: C.text });
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
