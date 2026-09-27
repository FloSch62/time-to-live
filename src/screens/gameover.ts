// The line goes quiet: the run summary after a defeat — route, relays visited, machines stopped, salvage earned, crew
// lost and aboard, fragments found — over the empty chair at Relay Seven.
import type { App, Scene } from "../core/scene";
import { goToTitle } from "./nav";
import type { Gfx } from "../core/gfx";
import { music } from "../core/audio";
import { P, C, STAGE_TINT } from "../core/palette";
import { content } from "../campaign/content";
import type { RunState } from "../campaign/model";
import { stageName, speciesName } from "../campaign/events";
import { drawBackdrop } from "./backdrop";
import { ROMAN, brassButton, divider, keeperLamp, titlePlate, tracked } from "./kit";

export function createGameOverScene(app: App, run: RunState, opts: { victory?: boolean; onDone?: () => void } = {}): Scene {
  let t = 0;
  const titles = content.script.GAME_OVER_TITLES.length ? content.script.GAME_OVER_TITLES : ["The line goes quiet."];
  const headline = opts.victory ? "And then, an answer." : titles[run.seed % titles.length];
  const scene: Scene = {
    enter() {
      if (!opts.victory) void music.play("line-quiet");
    },
    update(dt) {
      t += dt;
    },
    draw(g, a) {
      drawBackdrop(g, opts.victory ? "ending/e6" : "bg/line-quiet", { kind: opts.victory ? "ending" : "quiet" });
      g.dim(0.55);
      if (!opts.victory) keeperLamp(g, 480, 44, t);
      g.text(headline, 480, 62, { font: "big", color: opts.victory ? P.brass0 : P.ivory1, align: "center", shadow: P.ink0 });
      tracked(g, `${run.ship.name.toUpperCase()} · ${opts.victory ? "VOYAGE COMPLETE" : `LOST IN ${stageName(run.stage).toUpperCase()}`}`, 480, 100, { font: "labelb", color: opts.victory ? P.teal1 : P.ember1, align: "center" });
      const x = 110;
      const w = 740;
      const y = 124;
      const h = 360;
      g.panel(x, y, w, h, "dialog");
      titlePlate(g, 480, y - 10, "THE VOYAGE", { w: 200 });
      stats(g, run, x + 30, y + 24);
      route(g, run, x + 30, y + 150, w - 60);
      crew(g, run, x + 30, y + 244, w - 60);
      if (brassButton(a, "go-title", 480 - 100, 540 - 46, 200, 32, "TO RELAY SEVEN", { hotkey: "Enter", hotkeys: ["Space", "Escape"] })) {
        if (opts.onDone) opts.onDone();
        else goToTitle(a, 0.8);
      }
    },
  };
  return scene;
}

function stat(g: Gfx, label: string, value: string, x: number, y: number, color: string = P.ivory0) {
  tracked(g, label, x, y, { font: "label", color: P.ivory4 });
  g.text(value, x, y + 12, { font: "head", color, shadow: P.ink0 });
}

function stats(g: Gfx, run: RunState, x: number, y: number) {
  const s = run.stats;
  const col = 172;
  stat(g, "STAGE REACHED", `${ROMAN[run.stage]} · ${stageName(run.stage).replace(/^The /, "")}`, x, y, STAGE_TINT[run.stage].light);
  stat(g, "HOPS", String(s.hops), x + col * 2, y);
  stat(g, "RELAYS VISITED", String(s.relaysVisited), x + col * 3, y);
  stat(g, "MACHINES STOPPED", String(s.machinesStopped), x, y + 52);
  stat(g, "SALVAGE EARNED", String(s.salvageEarned), x + col, y + 52, P.brass1);
  stat(g, "FRAGMENTS FOUND", `${run.fragments.length}`, x + col * 2, y + 52, P.ivory0);
  stat(g, "CREWS SPARED", String(s.shipsSpared), x + col * 3, y + 52);
  divider(g, x, y + 108, 680);
}

function route(g: Gfx, run: RunState, x: number, y: number, w: number) {
  tracked(g, "ROUTE", x, y, { font: "label", color: P.ivory4 });
  const r = run.route;
  const step = Math.max(8, Math.min(26, Math.floor(w / Math.max(1, r.length))));
  const cy = y + 34;
  g.hline(x, cy, Math.min(w, step * r.length), P.copper3);
  r.forEach((e, i) => {
    const px = x + i * step + 4;
    const col = e.sealed ? P.violet2 : e.type === "exit" ? P.ember1 : e.type === "market" ? P.brass1 : STAGE_TINT[e.stage].main;
    g.rect(px - 2, cy - 2, 5, 5, P.ink0);
    g.rect(px - 1, cy - 1, 3, 3, col);
    if (i > 0 && r[i - 1].stage !== e.stage) {
      g.vline(px - Math.floor(step / 2), cy - 12, 24, P.brass2);
      tracked(g, ROMAN[e.stage], px - Math.floor(step / 2) + 3, cy - 14, { font: "small", color: P.brass1 });
    }
  });
  const last = r[r.length - 1];
  if (last) g.text(`{ivory3}last relay:{/} ${last.name}`, x, cy + 14, { font: "body" });
}

function crew(g: Gfx, run: RunState, x: number, y: number, w: number) {
  tracked(g, "CREW", x, y, { font: "label", color: P.ivory4 });
  const aboard = run.ship.crew.map((c) => `{ivory1}${c.name}{/} {ivory4}${speciesName(c.species)}{/}`);
  const lost = run.stats.crewLost.map((c) => `{ember1}${c.name}{/} {ivory4}${speciesName(c.species)}{/}`);
  g.text(aboard.length ? aboard.join("   ") : "{ivory4}Nobody was left aboard.{/}", x, y + 14, { font: "body", width: w, maxLines: 2 });
  if (lost.length) g.text(`{ivory4}Lost:{/} ${lost.join("   ")}`, x, y + 50, { font: "body", width: w, maxLines: 2, color: C.textDim });
}
