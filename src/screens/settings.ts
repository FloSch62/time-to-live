// Settings: volumes (master / music / sfx), scale mode (auto / integer / fit), fullscreen, screen shake, auto-pause.
import type { App, Scene } from "../core/scene";
import { audio, sfx } from "../core/audio";
import { P, C } from "../core/palette";
import { settings, saveSettings, type Settings } from "../core/save";
import { brassButton, divider, titlePlate, tracked } from "./kit";

export function createSettingsScene(app: App, opts: { standalone?: boolean } = {}): Scene {
  sfx.play("ui-open", { volume: 0.7 });
  let lastSfx = 0;
  const scene: Scene = {
    overlay: !opts.standalone,
    draw(g, a) {
      if (opts.standalone) g.rect(0, 0, 960, 540, P.ink0);
      else g.dim(0.6);
      const w = 480;
      const h = 420;
      const x = 480 - w / 2;
      const y = 270 - h / 2;
      g.panel(x, y, w, h, "dialog");
      titlePlate(g, 480, y - 11, "SETTINGS", { w: 200 });
      let cy = y + 30;
      tracked(g, "SOUND", x + 30, cy, { font: "label", color: P.ivory3 });
      cy += 18;
      const vol = (key: "master" | "music" | "sfx", label: string) => {
        g.text(label, x + 30, cy, { font: "body", color: C.text });
        const v = a.ui.slider(`vol-${key}`, x + 150, cy + 3, 240, settings[key]);
        g.text(`${Math.round(v * 100)}`, x + w - 30, cy, { font: "body", color: P.ivory3, align: "right" });
        if (v !== settings[key]) {
          settings[key] = v;
          audio.volumes = { master: settings.master, music: settings.music, sfx: settings.sfx };
          audio.applyVolumes();
          saveSettings();
          if (key !== "music" && a.time - lastSfx > 0.25) {
            lastSfx = a.time;
            sfx.play("ui-click");
          }
        }
        cy += 26;
      };
      vol("master", "Master");
      vol("music", "Music");
      vol("sfx", "Effects");
      divider(g, x + 30, cy + 2, w - 60);
      cy += 14;
      tracked(g, "SCREEN", x + 30, cy, { font: "label", color: P.ivory3 });
      cy += 18;
      g.text("Scaling", x + 30, cy + 3, { font: "body", color: C.text });
      const modes: [Settings["scale"], string, string][] = [
        ["auto", "AUTO", "Whole-pixel scaling unless it wastes too much of the screen."],
        ["integer", "PIXEL-PERFECT", "Always whole-pixel scaling (may leave borders)."],
        ["fit", "FIT", "Fill the window (pixels may be uneven)."],
      ];
      modes.forEach(([m, label, tip], i) => {
        if (brassButton(a, `scale-${m}`, x + 150 + i * 98, cy, 94, 24, label, { variant: settings.scale === m ? "brass" : "normal", font: "label", tooltip: tip })) {
          settings.scale = m;
          a.screen.setMode(m);
          saveSettings();
        }
      });
      cy += 32;
      if (brassButton(a, "fullscreen", x + 150, cy, 290, 24, a.screen.fullscreen ? "LEAVE FULLSCREEN" : "FULLSCREEN", { variant: "normal", font: "label", tooltip: "Also F11 or Alt+Enter." })) {
        void a.screen.toggleFullscreen();
      }
      cy += 34;
      const shake = a.ui.checkbox("shake", x + 30, cy, "Screen shake in fights", settings.screenShake);
      if (shake !== settings.screenShake) {
        settings.screenShake = shake;
        saveSettings();
      }
      cy += 26;
      divider(g, x + 30, cy, w - 60);
      cy += 12;
      tracked(g, "AUTO-PAUSE IN FIGHTS", x + 30, cy, { font: "label", color: P.ivory3 });
      cy += 18;
      const ap = settings.autoPause;
      const box = (key: keyof Settings["autoPause"], label: string) => {
        const v = a.ui.checkbox(`ap-${key}`, x + 30, cy, label, ap[key]);
        if (v !== ap[key]) {
          ap[key] = v;
          saveSettings();
        }
        cy += 22;
      };
      box("onArrive", "When a fight begins");
      box("onBoarders", "When boarders come aboard");
      box("onFire", "When a fire breaks out");
      if (brassButton(a, "set-done", 480 - 80, y + h - 44, 160, 28, "DONE", { hotkey: "Escape" })) {
        sfx.play("ui-back", { volume: 0.7 });
        a.scenes.remove(scene);
      }
    },
  };
  return scene;
}
