// After a fight: TASK ENDED (or SURRENDER ACCEPTED), the machine's last line, the aftermath and the rewards.
import type { App, Scene } from "../core/scene";
import { sfx } from "../core/audio";
import { P, C } from "../core/palette";
import { ENEMY_FLAVOR } from "../content/flavor";
import type { RunState } from "../campaign/model";
import type { VictoryInfo } from "../campaign/voyage";
import { enemyName } from "../campaign/catalog";
import { brassButton, divider, resColor, resIcon, RES_LABEL, titlePlate, tracked } from "./kit";
import { measure } from "../core/font";
import { drawNotice } from "./event";

export function createVictoryScene(app: App, run: RunState, info: VictoryInfo, onDone: () => void): Scene {
  let t = 0;
  const fl = (ENEMY_FLAVOR as Record<string, { name: string; taskEnded: string; aftermath: string; surrenderAccepted?: string }>)[info.setup.enemy];
  const surrendered = info.result.outcome === "surrendered";
  sfx.play("victory-sting");
  const scene: Scene = {
    overlay: true,
    update(dt) {
      t += dt;
    },
    draw(g, a) {
      g.dim(Math.min(0.55, t * 2));
      const w = 560;
      const ap = info.applied;
      const rows = (ap?.deltas.length ? 1 : 0) + (ap?.notices.length ?? 0);
      const h = 196 + rows * 22 + (info.setup.noReward ? 16 : 0);
      const x = 480 - w / 2;
      const y = Math.round(270 - h / 2);
      g.panel(x, y, w, h, "dialog");
      titlePlate(g, 480, y - 10, surrendered ? "SURRENDER ACCEPTED" : "TASK ENDED", { w: 260, color: surrendered ? P.amber1 : P.teal1 });
      tracked(g, (fl?.name ?? enemyName(info.setup.enemy)).toUpperCase(), 480, y + 24, { font: "labelb", color: P.brass1, align: "center" });
      let cy = y + 42;
      const machineLine = surrendered ? fl?.surrenderAccepted ?? "" : fl?.taskEnded ?? "";
      if (machineLine) {
        cy += g.text(surrendered ? machineLine : `{teal1}${machineLine}{/}`, 480, cy, { font: "body", align: "center", width: w - 60, color: C.text, shadow: P.ink0 });
        cy += 6;
      }
      if (fl?.aftermath && !surrendered) {
        cy += g.text(`{ivory3}${fl.aftermath}{/}`, 480, cy, { font: "body", align: "center", width: w - 60 });
      }
      cy += 10;
      divider(g, x + 40, cy, w - 80);
      cy += 12;
      if (info.setup.noReward) {
        g.text("{ivory4}Nothing here is worth taking. The Seal keeps what it closes.{/}", 480, cy, { font: "body", align: "center" });
        cy += 20;
      }
      if (ap) {
        if (ap.deltas.length) {
          let tw = 0;
          const widths = ap.deltas.map((d) => 30 + measure(`+${d.amount} ${RES_LABEL[d.id]}`, "body"));
          tw = widths.reduce((s, v) => s + v + 6, -6);
          let cx = 480 - Math.round(tw / 2);
          ap.deltas.forEach((d, k) => {
            g.panel(cx, cy, widths[k], 22, "panel-dark");
            resIcon(g, d.id, cx + 5, cy + 3);
            g.text(`${d.amount > 0 ? "+" : "–"}${Math.abs(d.amount)} {ivory3}${RES_LABEL[d.id]}{/}`, cx + 24, cy + 3, { font: "body", color: d.amount > 0 ? resColor(d.id) : P.ember1 });
            cx += widths[k] + 6;
          });
          cy += 28;
        }
        for (const n of ap.notices) {
          drawNotice(g, n, x + 60, cy);
          cy += 22;
        }
      }
      if (brassButton(a, "vic-go", 480 - 80, y + h - 44, 160, 30, "CONTINUE", { hotkey: "Space", hotkeys: ["Enter", "Digit1"] })) {
        a.scenes.remove(scene);
        onDone();
      }
    },
  };
  void run;
  return scene;
}
