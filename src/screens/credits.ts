// Credits roll (from src/content/script.ts CREDITS). After the ending it rolls over the GROUND lamp, then the voyage
// summary, then the title. Always carries the FAULTLINE attribution.
import type { App, Scene } from "../core/scene";
import { goToTitle } from "./nav";
import { music } from "../core/audio";
import { lineHeight } from "../core/font";
import { P } from "../core/palette";
import { content, type CreditsBlock } from "../campaign/content";
import type { RunState } from "../campaign/model";
import { drawBackdrop, twinkle } from "./backdrop";
import { keeperLamp, keyHints, tracked } from "./kit";
import { createGameOverScene } from "./gameover";

const ATTRIBUTION = "Original FAULTLINE created by Florian Schwarz — flosch.me";

function blocks(): CreditsBlock[] {
  const b = content.script.CREDITS.length
    ? content.script.CREDITS
    : [
      { heading: "TIME TO LIVE", lines: ["a Faultline voyage", "Every hop costs a little life."] },
      { heading: "The Line", lines: [ATTRIBUTION] },
    ];
  const all = b.flatMap((x) => x.lines);
  if (!all.some((l) => l.includes("Florian Schwarz"))) return [...b, { heading: "The Line", lines: [ATTRIBUTION] }];
  return b;
}

export function createCreditsScene(app: App, opts: { ending?: boolean; run?: RunState } = {}): Scene {
  let y = 540;
  let t = 0;
  const list = blocks();
  const lh = lineHeight("body");
  const total = list.reduce((s, b) => s + (b.heading ? 40 : 10) + b.lines.length * (lh + 4) + 36, 0) + 200;
  let left = false;
  const leave = () => {
    if (left) return;
    left = true;
    if (opts.ending && opts.run) {
      app.scenes.switchTo(createGameOverScene(app, opts.run, { victory: true }), true, 1);
    } else goToTitle(app, 0.6);
  };
  const scene: Scene = {
    enter() {
      if (!opts.ending) void music.play("title");
    },
    update(dt) {
      t += dt;
      y -= dt * (app.input.key("Space") ? 90 : 28);
      if (y < -total) leave();
    },
    draw(g, a) {
      drawBackdrop(g, opts.ending ? "ending/e6" : "bg/title", { kind: opts.ending ? "ending" : "title" });
      twinkle(g, t, 99, 30, 300);
      g.dim(0.62);
      let cy = Math.round(y);
      for (const b of list) {
        if (b.heading) {
          if (b.heading === "TIME TO LIVE") {
            g.text("TIME TO LIVE", 480, cy, { font: "big", color: P.brass0, align: "center", shadow: P.ink0 });
            cy += 40;
          } else {
            tracked(g, b.heading.toUpperCase(), 480, cy, { font: "labelb", color: P.brass1, align: "center" });
            cy += 22;
          }
        } else cy += 10;
        for (const l of b.lines) {
          const attr = l.includes("Florian Schwarz");
          g.text(l, 480, cy, { font: "body", color: attr ? P.ivory0 : P.ivory2, align: "center", shadow: P.ink0 });
          cy += lh + 4;
        }
        cy += 36;
      }
      keeperLamp(g, 480, cy + 40, t);
      // the attribution stays on screen at the bottom throughout
      g.rect(0, 540 - 30, 960, 30, P.ink0);
      g.text(`{ivory3}${ATTRIBUTION}{/}`, 480, 540 - 24, { font: "body", align: "center" });
      keyHints(g, a, 12, 12, [["SPACE", "faster"], ["ESC", "leave"]]);
      if (a.input.keyPressed("Escape") || a.input.keyPressed("Enter")) {
        a.input.eatKey("Escape");
        leave();
      }
    },
  };
  return scene;
}
