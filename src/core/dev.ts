// ?dev=kit — a gallery of the core UI kit, fonts and atlases for visual checks.
import type { DevFactory } from "../dev";
import type { Scene } from "./scene";
import { P, C } from "./palette";
import { atlas } from "./assets";

let checked = true;
let vol = 0.6;
let tab = 0;
let name = "Lamplighter";

export const dev: Record<string, DevFactory> = {
  kit: (): Scene => ({
    draw(g, app) {
      const ui = app.ui;
      g.rect(0, 0, 960, 540, P.ink1);
      g.panel(16, 16, 440, 250);
      g.text("Heading Font 27px", 30, 26, { font: "head", color: C.title, shadow: P.ink0 });
      g.text("BIG TITLE 34", 30, 54, { font: "big", color: P.brass1, shadow: P.ink0 });
      g.text(
        "Body text: The {teal}Lamplighter{/} hops along the dark Line. Every hop costs {amber2}1 TTL{/}. Hello. — I hear you. — I hear you hear me.",
        30, 92, { width: 400 },
      );
      g.text("LABEL FONT · SHIELDS · WEAPONS · ENGINES", 30, 150, { font: "label", color: C.textDim });
      g.text("small font: salvage 42 · payloads 8 · spares 3", 30, 164, { font: "small", color: C.textDim });
      if (ui.button("b1", 30, 184, 120, 24, "Hop", { hotkey: "KeyJ", showKey: true, tooltip: "Hop to the next relay." })) console.log("hop");
      ui.button("b2", 160, 184, 120, 24, "Blue option", { variant: "blue" });
      ui.button("b3", 290, 184, 120, 24, "Disabled", { disabled: true });
      checked = ui.checkbox("c1", 30, 220, "Screen shake", checked);
      vol = ui.slider("s1", 200, 222, 160, vol);
      tab = ui.tabs("t", 480, 16, ["Weapons", "Drones", "Systems"], tab);
      g.panel(480, 40, 460, 226, "panel-glass");
      ui.scrollArea("sa", 490, 50, 440, 206, 600, (off) => {
        for (let i = 0; i < 30; i++) g.text(`Row ${i + 1} — scroll content`, 496, 52 + i * 20 - off, { color: i % 2 ? C.text : C.textDim });
      });
      name = ui.textField("tf", 30, 250 - 4, 160, name);
      ui.segBar(480, 290, 6, 12, 8, 5, { on: P.teal2, off: P.ink4, edge: P.teal1 });
      ui.bar(480, 310, 200, 10, 22, 30, P.verd1);
      const a = atlas("ui");
      const i = atlas("icons");
      g.text(`atlases: ui ${a ? "ok" : "—"} · icons ${i ? "ok" : "—"} · crew ${atlas("crew") ? "ok" : "—"}`, 480, 330, { font: "small", color: C.textDim });
      ["panel", "panel-hi", "panel-danger", "panel-glass", "panel-dark", "dialog"].forEach((v, k) => g.panel(16 + k * 150, 380, 140, 80, v));
    },
  }),
};
