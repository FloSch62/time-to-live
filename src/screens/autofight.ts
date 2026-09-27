// Fallback fight (until the combat scene is wired, or with the dev auto-fight switch): the machine's handshake and a
// short resolution bar; the outcome comes from campaign/autoresolve.ts.
import type { App, Scene } from "../core/scene";
import { sfx } from "../core/audio";
import { P, C } from "../core/palette";
import { ENEMY_FLAVOR } from "../content/flavor";
import type { CombatResult, CombatSetup } from "../game/types";
import type { RunState } from "../campaign/model";
import { enemyName } from "../campaign/catalog";
import { brassButton, titlePlate, tracked } from "./kit";

const DEV = typeof location !== "undefined" && new URLSearchParams(location.search).has("dev");

export function createAutoFightScene(app: App, run: RunState, setup: CombatSetup, done: (force?: CombatResult["outcome"]) => void): Scene {
  let t = 0;
  let resolving = -1;
  let force: CombatResult["outcome"] | undefined;
  const fl = (ENEMY_FLAVOR as Record<string, { name: string; classLine: string; handshake: string }>)[setup.enemy];
  const scene: Scene = {
    overlay: true,
    update(dt) {
      t += dt;
      if (resolving >= 0) {
        resolving += dt;
        if (resolving > 1.4) {
          app.scenes.remove(scene);
          done(force);
        }
      }
    },
    draw(g, a) {
      g.dim(0.6);
      const w = 520;
      const h = 230;
      const x = 480 - w / 2;
      const y = 270 - h / 2;
      g.panel(x, y, w, h, setup.boss ? "panel-danger" : "dialog");
      titlePlate(g, 480, y - 10, setup.boss ? "GUARDIAN" : "UNKNOWN SENDER", { w: 220, color: P.ember1 });
      tracked(g, (fl?.name ?? enemyName(setup.enemy)).toUpperCase(), 480, y + 26, { font: "labelb", color: P.brass0, align: "center" });
      if (fl?.classLine) g.text(`{ivory3}${fl.classLine}{/}`, 480, y + 40, { align: "center" });
      g.text(`{teal1}${fl?.handshake ?? "UNKNOWN SENDER."}{/}`, 480, y + 64, { align: "center", width: w - 60 });
      if (setup.intro) g.text(setup.intro, 480, y + 104, { align: "center", width: w - 60, color: C.textDim });
      if (resolving >= 0) {
        const f = Math.min(1, resolving / 1.3);
        g.rect(x + 60, y + h - 50, w - 120, 8, P.ink0);
        g.rect(x + 61, y + h - 49, Math.round((w - 122) * f), 6, P.ember2);
        tracked(g, "HELLO · I HEAR YOU · I HEAR YOU HEAR ME", 480, y + h - 34, { font: "small", color: P.ivory3, align: "center", track: 1 });
        return;
      }
      const bw = DEV ? 120 : 200;
      if (brassButton(a, "af-fight", DEV ? x + 24 : 480 - bw / 2, y + h - 52, bw, 32, "ENGAGE", { hotkey: "Space", variant: "danger" })) start();
      if (DEV) {
        if (brassButton(a, "af-win", x + 154, y + h - 52, 100, 32, "WIN", { variant: "normal", hotkey: "KeyW" })) start("victory");
        if (brassButton(a, "af-flee", x + 264, y + h - 52, 100, 32, "FLEE", { variant: "normal", hotkey: "KeyF" })) start("fled");
        if (brassButton(a, "af-lose", x + 374, y + h - 52, 100, 32, "LOSE", { variant: "normal", hotkey: "KeyL" })) start("defeat");
        if (setup.surrenderable && brassButton(a, "af-sur", x + w - 110, y + 8, 100, 22, "SURRENDER", { variant: "normal", font: "label" })) start("surrendered");
      }
    },
  };
  function start(f?: CombatResult["outcome"]) {
    force = f;
    resolving = 0;
    sfx.play("laser-fire");
  }
  void run;
  return scene;
}
