// Pause menu (Escape outside combat): Resume, Ship, Runbook, Settings, Save & quit to title.
import type { App, Scene } from "../core/scene";
import { sfx } from "../core/audio";
import { P } from "../core/palette";
import type { Session } from "./session";
import { brassButton, divider, keeperLamp, titlePlate, tracked } from "./kit";
import { createShipScene } from "./ship";
import { createRunbookScene } from "./runbook";
import { createSettingsScene } from "./settings";
import { createGuideScene } from "./guide";
import { stageName } from "../campaign/events";
import { currentRelay } from "../campaign/model";
import { content } from "../campaign/content";

export function createPauseMenu(app: App, session: Session, opts: { combat?: boolean } = {}): Scene {
  let t = 0;
  const tips = content.tips;
  const tip = tips.length ? tips[Math.floor(Math.random() * tips.length)] : "";
  sfx.play("ui-open", { volume: 0.6 });
  const scene: Scene = {
    overlay: true,
    update(dt) {
      t += dt;
    },
    draw(g, a) {
      g.dim(0.6);
      const w = 300;
      const h = 320;
      const x = 480 - w / 2;
      const y = 270 - h / 2;
      g.panel(x, y, w, h, "dialog");
      titlePlate(g, 480, y - 10, "PAUSED", { w: 150 });
      const run = session.run;
      keeperLamp(g, 480, y + 30, t);
      tracked(g, `${run.ship.name.toUpperCase()} · ${currentRelay(run).name}`, 480, y + 44, { font: "label", color: P.ivory2, align: "center" });
      g.text(`{ivory4}${stageName(run.stage)} · hop ${run.stats.hops}{/}`, 480, y + 58, { align: "center" });
      divider(g, x + 30, y + 80, w - 60);
      let by = y + 94;
      const bw = w - 60;
      const bx = x + 30;
      if (brassButton(a, "p-resume", bx, by, bw, 30, "RESUME", { hotkey: "Escape" })) close();
      by += 36;
      if (!opts.combat && brassButton(a, "p-ship", bx, by, bw, 26, "SHIP", { variant: "normal", hotkey: "KeyU" })) {
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
      if (tip) g.text(`{ivory4}${tip}{/}`, 480, y + h + 16, { font: "body", align: "center", width: 560 });
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
