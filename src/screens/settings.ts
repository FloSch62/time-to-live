// Settings: volumes (master / music / sfx), scale mode (auto / integer / fit), fullscreen, screen shake, auto-pause.
import type { App, Scene } from "../core/scene";
import { audio, sfx } from "../core/audio";
import { P, C, rgba } from "../core/palette";
import { settings, saveSettings, type Settings } from "../core/save";
import { HUD_BAND, TYPE, brassButton, header, scrim, textAt, titlePlate } from "./kit";

export function createSettingsScene(app: App, opts: { standalone?: boolean } = {}): Scene {
  sfx.play("ui-open", { volume: 0.7 });
  let lastSfx = 0;
  const scene: Scene = {
    overlay: !opts.standalone,
    draw(g, a) {
      if (opts.standalone) g.rect(0, 0, 960, 540, P.ink0);
      else scrim(g);
      const w = 720;
      const h = 300;
      const x = 480 - w / 2;
      const y = Math.round(HUD_BAND + 8 + (514 - HUD_BAND - 8 - h) / 2);
      g.panel(x, y, w, h, "dialog");
      titlePlate(g, 480, y - 11, "SETTINGS", { w: 200 });
      const colW = 318;
      const lx = x + 30;
      const rx = x + w - 30 - colW;
      g.vline(480, y + 26, h - 80, rgba(P.brass4, 0.5));
      // ── left: sound and screen ──
      let cy = y + 30;
      header(g, "Sound", lx, cy);
      cy += 16;
      const vol = (key: "master" | "music" | "sfx", label: string) => {
        textAt(g, label, lx, cy + 2, { font: TYPE.body, color: C.text });
        const v = a.ui.slider(`vol-${key}`, lx + 90, cy, colW - 130, settings[key]);
        textAt(g, `${Math.round(v * 100)}`, lx + colW, cy + 2, { font: TYPE.body, color: P.ivory3, align: "right" });
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
        cy += 24;
      };
      vol("master", "Master");
      vol("music", "Music");
      vol("sfx", "Effects");
      cy += 8;
      header(g, "Screen scaling", lx, cy);
      cy += 14;
      const modes: [Settings["scale"], string, string, number][] = [
        ["auto", "AUTO", "Whole-pixel scaling unless it wastes too much of the screen.", 76],
        ["integer", "PIXEL-PERFECT", "Always whole-pixel scaling (may leave borders).", 154],
        ["fit", "FIT", "Fill the window (pixels may be uneven).", 76],
      ];
      let bx = lx;
      modes.forEach(([m, label, tip, bw]) => {
        if (brassButton(a, `scale-${m}`, bx, cy, bw, 24, label, { variant: settings.scale === m ? "brass" : "normal", tooltip: tip })) {
          settings.scale = m;
          a.screen.setMode(m);
          saveSettings();
        }
        bx += bw + 6;
      });
      cy += 32;
      if (brassButton(a, "fullscreen", lx, cy, colW, 24, a.screen.fullscreen ? "LEAVE FULLSCREEN" : "FULLSCREEN", { variant: "normal", tooltip: "Also F11 or Alt+Enter." })) {
        void a.screen.toggleFullscreen();
      }
      // ── right: motion, text, fights ──
      cy = y + 30;
      header(g, "Motion and text", rx, cy);
      cy += 16;
      const shake = a.ui.checkbox("shake", rx, cy, "Screen shake in fights", settings.screenShake);
      if (shake !== settings.screenShake) {
        settings.screenShake = shake;
        saveSettings();
      }
      cy += 22;
      const reduced = a.ui.checkbox("reduced-motion", rx, cy, "Reduced motion and flashes", settings.reducedMotion);
      if (reduced !== settings.reducedMotion) {
        settings.reducedMotion = reduced;
        saveSettings();
      }
      cy += 30;
      header(g, "Text reveal", rx, cy);
      cy += 14;
      (["normal", "fast", "instant"] as const).forEach((speed, i) => {
        const bw = Math.floor((colW - 12) / 3);
        if (brassButton(a, `text-${speed}`, rx + i * (bw + 6), cy, bw, 24, speed.toUpperCase(), { variant: settings.textSpeed === speed ? "brass" : "normal" })) {
          settings.textSpeed = speed;
          saveSettings();
        }
      });
      cy += 36;
      header(g, "Auto-pause in fights", rx, cy);
      cy += 16;
      const ap = settings.autoPause;
      const box = (key: keyof Settings["autoPause"], label: string) => {
        const v = a.ui.checkbox(`ap-${key}`, rx, cy, label, ap[key]);
        if (v !== ap[key]) {
          ap[key] = v;
          saveSettings();
        }
        cy += 22;
      };
      box("onArrive", "When a fight begins");
      box("onBoarders", "When boarders come aboard");
      box("onFire", "When a fire breaks out");
      if (brassButton(a, "set-done", 480 - 80, y + h - 46, 160, 28, "DONE", { hotkey: "Escape" })) {
        sfx.play("ui-back", { volume: 0.7 });
        a.scenes.remove(scene);
      }
    },
  };
  return scene;
}
