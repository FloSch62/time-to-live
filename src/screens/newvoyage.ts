// New voyage: name the tender (suggestions from names.ts), choose the livery lamp, meet the crew (rename them), see
// the tender in side view on its carrier, the voyage seed, then Begin → the Prologue at Relay Seven.
import type { App, Scene } from "../core/scene";
import { goToTitle } from "./nav";
import type { Gfx } from "../core/gfx";
import { music, sfx } from "../core/audio";
import { P, C, rgba } from "../core/palette";
import { Rng } from "../core/rng";
import { LAMP_COLORS, type LampColor } from "../game/ids";
import { SPECIES_FLAVOR } from "../content/flavor";
import { newShip, tenderNames, pickCrewName, speciesMaxHp } from "../campaign/shipops";
import { createRun } from "../campaign/run";
import { deleteSave } from "../campaign/persist";
import { catalog } from "../campaign/catalog";
import { content } from "../campaign/content";
import { drawBackdrop, twinkle } from "./backdrop";
import { brassButton, divider, glow, icon, keyHints, titlePlate, tracked } from "./kit";
import { carrierScene } from "./tender";
import { LAMP_HEX } from "./yard";
import { Session } from "./session";

export function createNewVoyage(app: App): Scene {
  let seed = Math.floor(Math.random() * 900000) + 100000;
  const rng = new Rng(seed);
  let lamp: LampColor = "amber";
  let ship = newShip(tenderNames()[0] ?? "Lamplighter", rng, lamp);
  let name = ship.name;
  let t = 0;
  let editing: number | null = null;
  let buf = "";
  let suggestion = 0;
  const tip = content.tips.length ? content.tips[Math.floor(Math.random() * content.tips.length)] : "";

  const scene: Scene = {
    enter() {
      void music.play("title");
    },
    update(dt) {
      t += dt;
    },
    draw(g, a) {
      drawBackdrop(g, "bg/s1-a", { kind: "space", stage: 1, seed: 777 });
      twinkle(g, t, 88, 20, 200);
      g.dim(0.25);
      ship.name = name || "Lamplighter";
      ship.livery.lamp = lamp;
      carrierScene(g, ship, t, { x: 480, cableY: 58 });
      titlePlate(g, 480, 14, "A NEW VOYAGE", { w: 260 });
      // left: the tender
      const px = 24;
      const py = 318;
      g.panel(px, py, 300, 212, "dialog");
      tracked(g, "NAME THE TENDER", px + 18, py + 16, { font: "label", color: P.ivory3 });
      name = a.ui.textField("tender-name", px + 18, py + 30, 264, name, 20);
      const names = tenderNames();
      tracked(g, "SUGGESTIONS", px + 18, py + 60, { font: "small", color: P.ivory4, track: 1 });
      for (let k = 0; k < 4; k++) {
        const n = names[(suggestion + k) % names.length];
        if (brassButton(a, `sugg-${k}`, px + 18 + (k % 2) * 134, py + 72 + Math.floor(k / 2) * 26, 130, 22, n, { variant: "normal", font: "body", sound: "ui-click" })) name = n;
      }
      if (brassButton(a, "sugg-more", px + 18, py + 126, 264, 18, "OTHER NAMES", { variant: "normal", font: "small" })) suggestion = (suggestion + 4) % Math.max(1, names.length);
      divider(g, px + 18, py + 154, 264);
      tracked(g, "LIVERY LAMP", px + 18, py + 166, { font: "label", color: P.ivory3 });
      LAMP_COLORS.forEach((c, i) => {
        const sx = px + 130 + i * 30;
        const on = lamp === c;
        g.rect(sx, py + 160, 24, 24, P.ink0);
        g.box(sx, py + 160, 24, 24, on ? P.brass0 : P.brass4);
        g.rect(sx + 7, py + 167, 10, 10, LAMP_HEX[c]);
        if (on) glow(g, sx + 12, py + 172, 12, LAMP_HEX[c], 0.3);
        if (a.ui.area(`nv-lamp-${c}`, sx, py + 160, 24, 24, { tooltip: `${c[0].toUpperCase()}${c.slice(1)} lamps` })) {
          lamp = c;
          sfx.play("lamp-on", { volume: 0.6 });
        }
      });
      g.text(`{ivory4}The name goes on the lead car's plate; the old name L-12 shows through the paint.{/}`, px + 18, py + 190, { font: "small", width: 264 });
      // middle: the crew
      const cx = 336;
      g.panel(cx, py, 380, 212, "dialog");
      tracked(g, "THE CREW · NIGHT SHIFT VOLUNTEERS", cx + 18, py + 16, { font: "label", color: P.ivory3 });
      ship.crew.forEach((c, i) => crewRow(g, a, i, cx + 18, py + 34 + i * 52, 344));
      if (brassButton(a, "reroll-crew", cx + 18, py + 190, 344, 18, "OTHER VOLUNTEERS", { variant: "normal", font: "small" })) {
        const taken: string[] = [];
        for (const c of ship.crew) {
          c.name = pickCrewName(c.species, taken, rng);
          taken.push(c.name);
        }
      }
      // right: the voyage
      const vx = 728;
      g.panel(vx, py, 208, 212, "dialog");
      tracked(g, "THE CONNECTION", vx + 18, py + 16, { font: "label", color: P.ivory3 });
      g.text(`{ivory4}TTL{/} {amber1}16{/}   {ivory4}Hull{/} {verd0}${ship.hull}{/}`, vx + 18, py + 34, { font: "body" });
      g.text(`{ivory4}Weapons{/} ${ship.weapons.filter(Boolean).map((w) => catalog.weapons[w!]?.name ?? w).join(", ")}`, vx + 18, py + 54, { font: "body", width: 174 });
      tracked(g, "VOYAGE SEED", vx + 18, py + 108, { font: "small", color: P.ivory4, track: 1 });
      g.text(String(seed), vx + 18, py + 120, { font: "head", color: P.ivory1 });
      if (brassButton(a, "reseed", vx + 110, py + 122, 80, 20, "NEW SEED", { variant: "normal", font: "small" })) {
        seed = Math.floor(Math.random() * 900000) + 100000;
      }
      if (brassButton(a, "begin", vx + 18, py + 160, 172, 40, "BEGIN", { hotkey: "Enter", sub: "Relay Seven" })) begin();
      if (brassButton(a, "nv-back", 24, 14, 90, 24, "BACK", { variant: "normal", font: "label", hotkey: "Escape", sound: "ui-back" })) {
        goToTitle(a, 0.4);
      }
      keyHints(g, a, 960 - 12, 540 - 14, [["ENTER", "begin"], ["ESC", "back"]], "right");
      if (tip) g.text(`{ivory4}${tip}{/}`, 24, 540 - 16, { font: "small", width: 760, maxLines: 1 });
    },
  };

  function crewRow(g: Gfx, a: App, i: number, x: number, y: number, w: number) {
    const c = ship.crew[i];
    g.panel(x, y, w, 46, "panel");
    if (!icon(g, `species-${c.species}`, x + 8, y + 14)) g.rect(x + 10, y + 16, 12, 12, P.ink3);
    if (editing === i) {
      buf = a.ui.textField(`crew-name-${i}`, x + 32, y + 4, 200, buf, 22);
      a.ui.focusId = `crew-name-${i}`;
      if (a.input.keyPressed("Enter") || a.input.keyPressed("Escape")) {
        a.input.eatKey("Enter");
        a.input.eatKey("Escape");
        if (buf.trim()) c.name = buf.trim();
        editing = null;
      }
    } else {
      g.text(c.name, x + 32, y + 5, { font: "body", color: P.ivory0 });
      if (brassButton(a, `rename-${i}`, x + w - 74, y + 5, 66, 18, "RENAME", { variant: "normal", font: "small" })) {
        editing = i;
        buf = c.name;
      }
    }
    const fl = SPECIES_FLAVOR?.[c.species];
    g.text(`{brass2}${fl?.name ?? c.species}{/} {ivory4}· ${speciesMaxHp(c.species)} HP · ${catalog.species[c.species]?.special ?? fl?.desc ?? ""}{/}`, x + 32, y + 24, { font: "small", width: w - 40, maxLines: 2 });
  }

  function begin() {
    ship.name = (name || "Lamplighter").trim();
    ship.livery.lamp = lamp;
    deleteSave();
    const run = createRun(seed, ship);
    const s = new Session(app, run);
    s.begin({ prologue: true, fresh: true });
  }

  void rgba;
  void C;
  return scene;
}
