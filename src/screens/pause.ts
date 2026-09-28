// Pause menu (Escape outside combat): Resume, Ship, Runbook, Settings, Save & quit to title.
import type { App, Scene } from "../core/scene";
import { sfx } from "../core/audio";
import { P } from "../core/palette";
import type { Session } from "./session";
import { HUD_BAND, TYPE, brassButton, divider, fittingLine, footer, header, keeperLamp, scrim, textAt, titlePlate } from "./kit";
import { createShipScene } from "./ship";
import { createRunbookScene } from "./runbook";
import { createSettingsScene } from "./settings";
import { createGuideScene } from "./guide";
import { stageName } from "../campaign/events";
import { currentRelay } from "../campaign/model";
import { content } from "../campaign/content";
import { difficultyRules } from "../data/difficulty";

export function createPauseMenu(app: App, session: Session, opts: { combat?: boolean } = {}): Scene {
  let t = 0;
  // a tip that fits the footer strip whole (never cut, never floating over the relay)
  const tip = fittingLine(content.tips, 960 - 32 - 130);
  sfx.play("ui-open", { volume: 0.6 });
  const scene: Scene = {
    overlay: true,
    update(dt) {
      t += dt;
    },
    draw(g, a) {
      const run = session.run;
      // over a fight the combat HUD stays under the scrim (its own layout); over the relay the run HUD sits above it
      if (opts.combat) scrim(g);
      else scrim(g, a, run);
      const w = 320;
      const h = opts.combat ? 300 : 330;
      const x = 480 - w / 2;
      const y = Math.round(HUD_BAND + 8 + (514 - HUD_BAND - 8 - h) / 2);
      g.panel(x, y, w, h, "dialog");
      titlePlate(g, 480, y - 11, "PAUSED", { w: 150 });
      keeperLamp(g, 480, y + 30, t);
      header(g, `${run.ship.name} · ${currentRelay(run).name}`, 480, y + 44, { color: P.ivory2, align: "center" });
      textAt(g, `${stageName(run.stage)} · hop ${run.stats.hops} · ${difficultyRules(run.difficulty).name}`, 480, y + 60, { font: TYPE.note, color: P.ivory3, align: "center" });
      divider(g, x + 30, y + 80, w - 60);
      let by = y + 94;
      const bw = w - 60;
      const bx = x + 30;
      if (brassButton(a, "p-resume", bx, by, bw, 30, "RESUME", { hotkey: "Escape" })) close();
      by += 36;
      if (!opts.combat && brassButton(a, "p-ship", bx, by, bw, 26, "TENDER", { variant: "normal", hotkey: "KeyU" })) {
        close();
        session.push(createShipScene(a, run, () => session.saveFromUI(run)));
      }
      if (!opts.combat) by += 30;
      if (brassButton(a, "p-runbook", bx, by, bw, 26, "THE RUNBOOK", { variant: "normal", hotkey: "KeyB" })) {
        session.push(createRunbookScene(a, () => {}));
      }
      by += 30;
      if (brassButton(a, "p-settings", bx, by, bw, 26, "SETTINGS", { variant: "normal" })) session.push(createSettingsScene(a));
      by += 30;
      if (brassButton(a, "p-guide", bx, by, bw, 26, "FIELD GUIDE", { variant: "normal", hotkey: "F1" })) session.push(createGuideScene(a));
      by += 38;
      footer(g, a, [], [["ESC", "resume"]], { note: tip });
      if (brassButton(a, "p-quit", bx, by, bw, 30, "SAVE & QUIT TO TITLE", { variant: "danger", tooltip: "The voyage is saved at the last relay. An encounter in progress restarts when you continue." })) {
        session.saveFromUI(run);
        session.quitToTitle();
      }
    },
  };
  function close() {
    sfx.play("ui-back", { volume: 0.6 });
    session.remove(scene);
  }
  return scene;
}
