// After a fight: TASK ENDED (or SURRENDER ACCEPTED), the machine's last line, the aftermath and the rewards.
import type { App, Scene } from "../core/scene";
import { sfx } from "../core/audio";
import { P, C } from "../core/palette";
import { ENEMY_FLAVOR } from "../content/flavor";
import type { RunState } from "../campaign/model";
import type { VictoryInfo } from "../campaign/voyage";
import { enemyName } from "../campaign/catalog";
import { HUD_BAND, SCRIM, TYPE, brassButton, divider, header, resColor, resIcon, RES_LABEL, scrim, textAt, titlePlate } from "./kit";
import { measure } from "../core/font";
import { wrap, lineHeight } from "../core/font";
import { drawNotice } from "./event";

export function createVictoryScene(app: App, run: RunState, info: VictoryInfo, onDone: () => void): Scene {
  let t = 0;
  const fl = (ENEMY_FLAVOR as Record<string, { name: string; taskEnded: string; aftermath: string; surrenderAccepted?: string }>)[info.setup.enemy];
  const surrendered = info.result.outcome === "surrendered";
  const resolution = info.result.resolution ?? (surrendered ? "spared" : "destroyed");
  const human = info.setup.enemy === "scavenger-skiff";
  const title = surrendered ? "SURRENDER ACCEPTED" : resolution === "delivered" ? "CONNECTION RECEIVED"
    : resolution === "released" ? "DUTY RELEASED" : resolution === "disabled" ? "SAFELY DISABLED"
    : human ? "VESSEL LOST" : "FORCED SHUTDOWN";
  const message = surrendered ? fl?.surrenderAccepted ?? "The weapons lower. The crew's terms stand."
    : resolution === "delivered" ? "The isolation shell stands open. The archive remains lit. The first message has a receipt."
    : resolution === "released" ? (info.setup.scenario ? `${info.setup.scenario.label ?? "The held duty"} is acknowledged. The mechanism parks with its hull intact.` : fl?.aftermath ?? "The passage opens. Its old duty is complete.")
    : resolution === "disabled" ? "The drive winds down and the tool retracts. A standby lamp remains lit."
    : human ? "The skiff's hull fails. No surrender was accepted. The loss remains part of this voyage."
    : "Its working structure gives out and its weapons go quiet. The task is ended by force, and the crew ride on.";
  sfx.play("victory-sting");
  const scene: Scene = {
    overlay: true,
    update(dt) {
      t += dt;
    },
    draw(g, a) {
      scrim(g, a, run, SCRIM * Math.min(1, 0.3 + t * 2));
      const w = 600;
      const ap = info.applied;
      const inner = w - 60;
      const msgH = wrap(message, inner, "body").length * lineHeight("body");
      const lines: { text: string; color: string }[] = [];
      if (info.result.systemsPatched) lines.push({ text: `Berth secured · the crew patched ${info.result.systemsPatched} system bars`, color: P.teal1 });
      if (info.result.hullRecovered) lines.push({ text: `Workshop · recovered ${info.result.hullRecovered} hull from the secured berth`, color: P.teal1 });
      const deltasH = ap?.deltas.length ? 30 : 0;
      const noticesH = (ap?.notices.length ?? 0) * 22;
      const h = 24 + 16 + msgH + 10 + 14 + lines.length * 16 + 18 + (info.setup.noReward ? 22 : 0) + deltasH + noticesH + 58;
      const x = 480 - w / 2;
      const y = Math.round(HUD_BAND + 8 + Math.max(0, (514 - HUD_BAND - 8 - h) / 2));
      g.panel(x, y, w, h, "dialog");
      titlePlate(g, 480, y - 11, title, { w: 300, color: surrendered ? P.amber1 : P.teal1 });
      header(g, fl?.name ?? enemyName(info.setup.enemy), 480, y + 24, { font: TYPE.strong, color: P.brass1, align: "center" });
      let cy = y + 40;
      cy += textAt(g, message, 480, cy, { font: TYPE.body, align: "center", width: inner, color: C.text, shadow: P.ink0 }) + 10;
      textAt(g, `Hull lost ${info.result.stats.damageTaken} · ${info.result.crewLost.length} crew lost`, 480, cy, { font: TYPE.note, align: "center", color: P.ivory3 });
      cy += 14;
      for (const l of lines) {
        textAt(g, l.text, 480, cy + 2, { font: TYPE.note, align: "center", color: l.color });
        cy += 16;
      }
      cy += 6;
      divider(g, x + 40, cy, w - 80);
      cy += 12;
      if (info.setup.noReward) {
        textAt(g, "Nothing here is worth taking. The Seal keeps what it closes.", 480, cy + 2, { font: TYPE.body, align: "center", color: P.ivory3 });
        cy += 22;
      }
      if (ap) {
        if (ap.deltas.length) {
          const widths = ap.deltas.map((d) => 30 + measure(`+${d.amount} ${RES_LABEL[d.id]}`, "body"));
          const tw = widths.reduce((s, v) => s + v + 6, -6);
          let cx = 480 - Math.round(tw / 2);
          ap.deltas.forEach((d, k) => {
            g.panel(cx, cy, widths[k], 22, "panel-dark");
            resIcon(g, d.id, cx + 5, cy + 3);
            g.text(`${d.amount > 0 ? "+" : "–"}${Math.abs(d.amount)} {ivory3}${RES_LABEL[d.id]}{/}`, cx + 24, cy + 3, { font: "body", color: d.amount > 0 ? resColor(d.id) : P.ember1 });
            cx += widths[k] + 6;
          });
          cy += 30;
        }
        for (const n of ap.notices) {
          drawNotice(g, n, x + 60, cy);
          cy += 22;
        }
      }
      if (brassButton(a, "vic-go", 480 - 90, y + h - 44, 180, 30, "CONTINUE", { hotkey: "Space", hotkeys: ["Enter", "Digit1"] })) {
        a.scenes.remove(scene);
        onDone();
      }
    },
  };
  void run;
  return scene;
}
