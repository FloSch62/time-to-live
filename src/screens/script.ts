// Script player (reusable): ScriptBeat sequences with art at 2× (or event art framed), portraits with speaker
// plates, typewriter text (click / Space completes, then advances), music and sfx per beat, Skip (Esc / S).
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { art, artSettled } from "../core/assets";
import { music, sfx } from "../core/audio";
import { settings } from "../core/save";
import { lineHeight, wrap } from "../core/font";
import { P, C, rgba } from "../core/palette";
import type { ScriptBeat } from "../game/types";
import type { RunState } from "../campaign/model";
import { drawBackdrop, twinkle, type BackdropSpec } from "./backdrop";
import { FOOTER_Y, TYPE, artFrame, brassButton, footer, hasUi, header, keeperLamp, trackedWidth } from "./kit";
import { placeholderArt, placeholderPortrait } from "./event";
import { carrierScene } from "./tender";
import { droneArt } from "../combat/assets";
import type { ScriptKind } from "../campaign/voyage";

export interface ScriptOpts {
  kind: ScriptKind | "dev";
  run?: RunState;
  onDone(): void;
}

const SPEED = 42; // chars/s — calm, readable

/** Which fallback painting a beat's art id maps to. */
function fallbackFor(id: string | undefined, run: RunState | undefined): BackdropSpec {
  const stage = run?.stage ?? 1;
  if (!id) return { kind: "space", stage };
  if (id.includes("relay-seven")) return { kind: "interior" };
  if (id.includes("line-quiet")) return { kind: "quiet" };
  const m = id.match(/s([123])-/);
  if (m) return { kind: "space", stage: Number(m[1]) as 1 | 2 | 3, seed: id.length * 97 };
  if (id.startsWith("ending/")) return { kind: "ending", seed: id.charCodeAt(id.length - 1) };
  if (id.includes("title")) return { kind: "title" };
  return { kind: "space", stage };
}

export function createScriptScene(app: App, beats: ScriptBeat[], opts: ScriptOpts): Scene {
  let i = 0;
  let reveal = 0;
  let t = 0;
  let beatT = 0;
  let done = false;
  let fade = 0;
  let lastBg = "";

  function beat() {
    return beats[Math.min(i, beats.length - 1)];
  }
  function bgOf(b: ScriptBeat): string | undefined {
    // Beats without art keep the previous background.
    for (let k = i; k >= 0; k--) if (beats[k].art) return beats[k].art;
    return b.art;
  }
  function enterBeat() {
    const b = beat();
    reveal = settings.textSpeed === "instant" ? 1 : 0;
    beatT = 0;
    if (b.music) void music.play(b.music);
    if (b.sfx) sfx.play(b.sfx);
    const bg = bgOf(b) ?? "";
    if (bg !== lastBg) {
      fade = 1;
      lastBg = bg;
    }
  }
  function finish() {
    if (done) return;
    done = true;
    opts.onDone();
  }
  function advance() {
    if (i >= beats.length - 1) {
      sfx.play("ui-click", { volume: 0.5 });
      finish();
      return;
    }
    i++;
    enterBeat();
  }

  const scene: Scene = {
    enter() {
      if (!beats.length) finish();
      else enterBeat();
    },
    update(dt) {
      t += dt;
      beatT += dt;
      fade = Math.max(0, fade - dt * 2.2);
      const len = Math.max(1, beat()?.text.length ?? 1);
      reveal = settings.textSpeed === "instant" ? 1 : Math.min(1, reveal + (dt * SPEED * (settings.textSpeed === "fast" ? 3 : 1)) / len);
    },
    draw(g, a) {
      if (!beats.length) return;
      const b = beat();
      const bg = bgOf(b);
      const isFull = !!bg && (bg.startsWith("bg/") || bg.startsWith("ending/"));
      // background
      if (bg && isFull) {
        drawBackdrop(g, bg, fallbackFor(bg, opts.run));
        if (bg.includes("relay-seven") && !art(bg)) interiorLamps(g, t);
        else if (!art(bg)) twinkle(g, t, bg.length * 13, 20, 240);
        if (!art(bg) && bg.startsWith("bg/s") && opts.run) carrierScene(g, opts.run.ship, t, { x: 520, cableY: 60, region: opts.run.stage });
      } else {
        drawBackdrop(g, null, fallbackFor(undefined, opts.run));
        twinkle(g, t, 7, 24, 240);
        g.dim(0.35);
        if (bg) {
          // event art (320×160) framed in the middle
          const img = art(bg.includes("/") ? bg : `events/${bg}`);
          const ax = 480 - 160;
          const ay = 70;
          artFrame(g, ax, ay, 320, 160);
          if (img) g.pixelFit(img, ax, ay, 320, 160); // v5 event art 320x160 drawn 2x; HD art fits at 1x
          else placeholderArt(g, ax, ay, 320, 160, t, bg);
        }
      }
      void artSettled;
      if (opts.kind === "intro" && opts.run?.stage === 1) {
        const ship = opts.run.ship;
        carrierScene(g, ship, settings.reducedMotion ? 0 : t, { x: 390, cableY: 52, fitHeight: 210, region: opts.run?.stage ?? 1 });
        // The same service hardware the player will command answers a real dock test lamp.
        const received = settings.reducedMotion || beatT > 1.4;
        g.rect(774, 92, 12, 194, P.ink2);
        g.rect(755, 136, 48, 44, P.brass4);
        g.box(755, 136, 48, 44, P.brass2);
        g.rect(766, 147, 26, 20, received ? P.teal1 : P.ink1);
        if (ship.consist?.lead === "switchback") {
          const d = droneArt("relay-drone").img;
          const progress = settings.reducedMotion ? 1 : Math.min(1, beatT / 1.4);
          if (d) g.image(d, 550 + progress * 164, 208 - Math.sin(progress * Math.PI) * 44, 0.45);
        } else if (!settings.reducedMotion && beatT > 0.7 && beatT < 1.4) {
          g.line(566, 158, 764, 158, P.teal1);
          g.line(566, 161, 764, 161, P.ivory1);
        }
        header(g, received ? "Test lamp · received" : "Service signal", 779, 192, { color: received ? P.teal1 : P.ivory3, align: "center", shadow: P.ink0 });
      }
      // text box
      const hasPortrait = !!b.portrait;
      const boxW = 760;
      const boxX = 480 - boxW / 2;
      const textX = boxX + 28 + (hasPortrait ? 112 : 0);
      const textW = boxW - 56 - (hasPortrait ? 112 : 0);
      const lines = wrap(b.text, textW, "body");
      const lh = lineHeight("body");
      const boxH = Math.max(hasPortrait ? 132 : 70, lines.length * lh + 44);
      const boxY = FOOTER_Y - 10 - boxH;
      g.alpha(0.92, () => g.panel(boxX, boxY, boxW, boxH, "dialog"));
      if (hasPortrait) {
        const px = boxX + 22;
        const py = boxY + 16;
        const img = art(`portraits/${b.portrait}`);
        artFrame(g, px, py, 96, 96);
        if (img) g.image(img, px, py);
        else placeholderPortrait(g, px, py, t);
      }
      if (b.speaker) {
        const sx = hasPortrait ? boxX + 22 + 48 : textX;
        const sw = Math.max(110, Math.ceil(trackedWidth(b.speaker.toUpperCase(), TYPE.strong)) + 28);
        const nx = Math.round(hasPortrait ? sx - sw / 2 : sx - 6);
        g.panel(nx, boxY - 11, sw, 20, hasUi("nameplate-brass") ? "nameplate-brass" : "panel-hi");
        header(g, b.speaker, nx + sw / 2, boxY - 11 + Math.round((20 - 7.5) / 2), { font: TYPE.strong, color: P.ink1, align: "center" });
      }
      const ty = boxY + Math.round((boxH - lines.length * lh) / 2) - 2;
      g.text(b.text, textX, ty, { font: "body", color: C.text, width: textW, reveal, shadow: P.ink0 });
      // progress pips and prompt
      const pipsX = boxX + boxW - 20 - beats.length * 6;
      for (let k = 0; k < beats.length; k++) g.rect(pipsX + k * 6, boxY + boxH - 12, 4, 2, k <= i ? P.brass1 : P.ink4);
      if (reveal >= 1 && (settings.reducedMotion || Math.floor(t * 2) % 2 === 0)) {
        g.rect(boxX + boxW - 28, boxY + boxH - 26, 6, 6, P.brass1);
        g.rect(boxX + boxW - 27, boxY + boxH - 25, 4, 4, P.amber1);
      }
      // controls
      const input = a.input;
      const adv = input.keyPressed("Space") || input.keyPressed("Enter");
      if (brassButton(a, "script-skip", 960 - 16 - 96, 12, 96, 24, "SKIP", { variant: "normal", hotkey: "Escape", sound: "ui-back" })) {
        finish();
        return;
      }
      if ((input.pressed(0) || adv) && !done) {
        input.consume();
        input.eatKey("Space");
        input.eatKey("Enter");
        if (reveal < 1) reveal = 1;
        else advance();
      }
      footer(g, a, [["SPACE", "continue"]], [["ESC", "skip"]]);
      if (fade > 0) g.alpha(fade, () => g.rect(0, 0, 960, 540, P.ink0));
    },
  };
  return scene;
}

/** Relay Seven fallback life: the KEEPER lamp blinking on the board. */
function interiorLamps(g: Gfx, t: number) {
  keeperLamp(g, 2 * (70 + 10 + 11 * 16) + 4, 2 * (36 + 10 + 3 * 20) + 4, t);
  g.alpha(0.06, () => g.rect(0, 0, 960, 540, rgba(P.amber2, 1)));
}
