// New voyage: name the tender (suggestions from names.ts), choose the livery lamp, meet the crew (rename them), see
// the tender in side view on its carrier, the voyage seed, then Begin → the Prologue at Relay Seven.
import type { App, Scene } from "../core/scene";
import { goToTitle } from "./nav";
import type { Gfx } from "../core/gfx";
import { music, sfx } from "../core/audio";
import { P, C, rgba } from "../core/palette";
import { Rng } from "../core/rng";
import { LAMP_COLORS, type LampColor, type LeadCarId } from "../game/ids";
import { STARTING_TENDERS, newInventory } from "../data/ship";
import { DIFFICULTY_IDS, difficultyRules, type DifficultyId } from "../data/difficulty";
import { CARS } from "../data/cars";
import { tenderStats } from "../campaign/refit";
import { SPECIES_FLAVOR } from "../content/flavor";
import { newShip, tenderNames, pickCrewName, speciesMaxHp } from "../campaign/shipops";
import { createRun } from "../campaign/run";
import { deleteSave } from "../campaign/persist";
import { catalog } from "../campaign/catalog";
import { content } from "../campaign/content";
import { drawBackdrop, twinkle } from "./backdrop";
import { TYPE, brassButton, fittingLine, footer, glow, header, icon, inset, tabRow, textAt, titlePlate } from "./kit";
import { measure } from "../core/font";
import { carrierScene } from "./tender";
import { LAMP_HEX } from "./yard";
import { Session } from "./session";
import { volunteerRecord } from "../content/voyage-record";

const WORKING_ROLE: Record<LeadCarId, string> = {
  lamplighter: "Relit lamps and took crews off broken platforms. Its paired emitter and old repair-charge launcher now stop hunters.",
  glasswing: "A lamplighter car refitted with lenses to align signal lamps. Its three emitters now fire together into quarantine defences.",
  switchback: "A tall lamplighter car that fetched drones from unreachable spans. Armed drones and a heavy drive stand in for a ward mesh.",
};

const POWER_PLAN: Record<LeadCarId, string> = {
  lamplighter: "8 power: weapons 3 · mesh 2 · drive 2 · air 1. The Packet Laser runs once the Weapons Bay has a 4th bar.",
  glasswing: "9 power: lasers 4 · mesh 2 · drive 2 · air 1; all three guns live. Medicine needs rerouting.",
  switchback: "10 power: drones 4 · drive 3 · burst 2 · air 1. Reroute 2 for the full Veil window.",
};

/** Screen margin. */
const M = 16;

const MODE_SUMMARY: Record<DifficultyId, string> = {
  easy: "Slower patrol volleys. More salvage, cheaper repairs and extra time ahead of the Seal.",
  medium: "Dangerous patrols, with room to prepare. Repairs, weapons and refits share one budget.",
  hard: "Fast patrols and lean stores. Protect specialists, plan repairs and keep an escape route.",
};

export function createNewVoyage(app: App): Scene {
  let seed = Math.floor(Math.random() * 900000) + 100000;
  const rng = new Rng(seed);
  let lamp: LampColor = "amber";
  let tender: LeadCarId = "lamplighter";
  let difficulty: DifficultyId = "medium";
  let ship = newShip("Lamplighter", rng, lamp);
  let name = ship.name;
  let t = 0;
  let editing: number | null = null;
  let buf = "";
  let suggestion = 0;
  // a tip that fits the footer beside the key hints (never cut)
  const tip = fittingLine(content.tips, 960 - 32 - 190);

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
      g.dim(0.45);
      const profile = STARTING_TENDERS.find(p => p.id === tender)!;
      ship.name = name || profile.name;
      ship.livery.lamp = lamp;
      // ── top: back, title, the three tenders ──
      if (brassButton(a, "nv-back", M, 8, 96, 24, "BACK", { variant: "normal", hotkey: "Escape", sound: "ui-back" })) goToTitle(a, 0.4);
      titlePlate(g, 480, 9, "A NEW VOYAGE", { w: 260 });
      const pick = tabRow(a, "nv-tender", M, 40, 960 - M * 2, 26, STARTING_TENDERS.map((p) => ({ label: `${p.name} · ${p.designation}`, id: `tender-${p.id}` })), STARTING_TENDERS.findIndex((p) => p.id === tender), 8);
      if (STARTING_TENDERS[pick].id !== tender) {
        const p = STARTING_TENDERS[pick];
        tender = p.id;
        ship = newShip(name === profile.name ? p.name : name, rng, lamp, tender);
        name = ship.name;
        editing = null;
        return;
      }
      // ── upper left: the tender on its carrier ──
      const pv = { x: M, y: 72, w: 596, h: 140 };
      inset(g, pv.x, pv.y, pv.w, pv.h, rgba(P.ink0, 0.55));
      g.clip(pv.x + 1, pv.y + 1, pv.w - 2, pv.h - 2, () => {
        carrierScene(g, ship, t, { x: pv.x + pv.w / 2, cableY: pv.y + 10 - 34, fitHeight: 90, region: 1 });
      });
      const capacity = tenderStats(ship);
      const native = tender === "switchback" ? "Native drones + Veil · 2 free sockets" : tender === "glasswing" ? "Calibration cradle · 1 free socket" : "Rescue hold · 2 free sockets";
      const roomCount = new Set(CARS[tender].map.join("").replace(/[. ]/g, "")).size;
      const statLine = `${roomCount} rooms · ${CARS[tender].map.length} decks · ${capacity.weaponSlots} gun mounts · ${capacity.droneSlots} drone ${capacity.droneSlots === 1 ? "slot" : "slots"} · ${capacity.crew} berths`;
      const sy = pv.y + pv.h - 34;
      g.alpha(0.8, () => g.rect(pv.x + 1, sy - 6, pv.w - 2, 39, P.ink0));
      textAt(g, statLine, pv.x + pv.w / 2, sy, { font: TYPE.body, align: "center", color: P.ivory1 });
      textAt(g, native, pv.x + pv.w / 2, sy + 17, { font: TYPE.note, align: "center", color: P.teal1 });
      if (a.ui.hover(pv.x, pv.y, pv.w, pv.h - 40)) a.ui.setTooltip(`{brass1}${profile.name} · ${profile.designation}{/} · ${profile.role}\n${profile.description ?? WORKING_ROLE[tender]}`, 320, { ...pv, side: "below" });
      // ── upper right: difficulty ──
      const dx = pv.x + pv.w + 12;
      const dw = 960 - M - dx;
      g.panel(dx, pv.y, dw, pv.h, "panel");
      header(g, "Voyage difficulty", dx + 14, pv.y + 13, { color: P.brass1 });
      const bw = Math.floor((dw - 28 - 12) / 3);
      DIFFICULTY_IDS.forEach((id, i) => {
        const mode = difficultyRules(id);
        if (brassButton(a, `difficulty-${id}`, dx + 14 + i * (bw + 6), pv.y + 28, bw, 26, mode.name.toUpperCase(), {
          variant: difficulty === id ? "brass" : "normal", tooltip: mode.description,
        })) difficulty = id;
      });
      textAt(g, MODE_SUMMARY[difficulty], dx + 14, pv.y + 66, { font: TYPE.body, width: dw - 28, color: C.text });
      const rules = difficultyRules(difficulty);
      textAt(g, `Starting salvage ${rules.startingSalvage}`, dx + 14, pv.y + pv.h - 20, { font: TYPE.note, color: P.ivory3 });
      // ── middle band: what it was for, the opening plan, the tradeoff ──
      const by = pv.y + pv.h + 8;
      const bh = 100;
      g.panel(M, by, 960 - M * 2, bh, "panel");
      const colW = Math.floor((960 - M * 2 - 28 - 24) / 3);
      const c1 = M + 14;
      const c2 = c1 + colW + 12;
      const c3 = c2 + colW + 12;
      g.vline(c2 - 6, by + 10, bh - 20, rgba(P.brass4, 0.6));
      g.vline(c3 - 6, by + 10, bh - 20, rgba(P.brass4, 0.6));
      header(g, profile.role, c1, by + 12, { color: P.brass1 });
      textAt(g, WORKING_ROLE[tender], c1, by + 27, { font: TYPE.body, width: colW, color: C.text });
      header(g, "Your opening plan", c2, by + 12, { color: P.teal1 });
      const sh = textAt(g, profile.strength, c2, by + 27, { font: TYPE.body, width: colW, color: C.text });
      textAt(g, POWER_PLAN[tender], c2, by + 27 + sh + 1, { font: TYPE.note, width: colW, color: P.ivory3 });
      header(g, "The tradeoff", c3, by + 12, { color: P.amber1 });
      textAt(g, profile.limitation, c3, by + 27, { font: TYPE.body, width: colW, color: C.text });
      // ── bottom: name and livery · the crew · the connection ──
      const py = by + bh + 8;
      const ph = 514 - py;
      const nameW = 250;
      const connW = 216;
      const crewX = M + nameW + 12;
      const crewW = 960 - M - connW - 12 - crewX;
      const vx = 960 - M - connW;
      // name and livery
      const px = M;
      g.panel(px, py, nameW, ph, "panel");
      const iw = nameW - 28;
      header(g, "Name the tender", px + 14, py + 12);
      name = a.ui.textField("tender-name", px + 14, py + 24, iw, name, 20);
      textAt(g, `${profile.designation} stays its dock number.`, px + 14, py + 50, { font: TYPE.note, color: P.ivory4 });
      const names = tenderNames();
      const sw2 = Math.floor((iw - 6) / 2);
      for (let k = 0; k < 4; k++) {
        const n = names[(suggestion + k) % names.length];
        if (brassButton(a, `sugg-${k}`, px + 14 + (k % 2) * (sw2 + 6), py + 62 + Math.floor(k / 2) * 24, sw2, 21, n, { variant: "normal", font: "body", sound: "ui-click" })) name = n;
      }
      if (brassButton(a, "sugg-more", px + 14, py + 111, iw, 19, "OTHER NAMES", { variant: "normal" })) suggestion = (suggestion + 4) % Math.max(1, names.length);
      header(g, "Livery lamp", px + 14, py + 140);
      LAMP_COLORS.forEach((c, i) => {
        const sx = px + 14 + i * 28;
        const ly = py + 152;
        const on = lamp === c;
        g.rect(sx, ly, 22, 22, P.ink0);
        g.box(sx, ly, 22, 22, on ? P.brass0 : P.brass4);
        g.rect(sx + 6, ly + 6, 10, 10, LAMP_HEX[c]);
        if (on) glow(g, sx + 11, ly + 11, 11, LAMP_HEX[c], 0.3);
        if (a.ui.area(`nv-lamp-${c}`, sx, ly, 22, 22, { tooltip: `${c[0].toUpperCase()}${c.slice(1)} lamps` })) {
          lamp = c;
          sfx.play("lamp-on", { volume: 0.6 });
        }
      });
      // the crew
      g.panel(crewX, py, crewW, ph, "panel");
      header(g, "Night Shift volunteers", crewX + 14, py + 12);
      if (brassButton(a, "reroll-crew", crewX + crewW - 12 - 176, py + 6, 176, 19, "OTHER VOLUNTEERS", { variant: "normal" })) {
        const taken: string[] = [];
        for (const c of ship.crew) {
          c.name = pickCrewName(c.species, taken, rng);
          taken.push(c.name);
        }
      }
      const rowH = Math.floor((ph - 28 - 8) / Math.max(1, ship.crew.length));
      ship.crew.forEach((c, i) => crewRow(g, a, i, crewX + 10, py + 30 + i * rowH, crewW - 20, rowH - 4));
      // the connection
      g.panel(vx, py, connW, ph, "panel");
      header(g, "The connection", vx + 14, py + 12);
      const inv = newInventory(tender);
      textAt(g, `{ivory3}TTL{/} {amber1}16{/}   {ivory3}Hull{/} {verd0}${ship.hull}{/}`, vx + 14, py + 28, { font: TYPE.body });
      const mesh = ship.systems.shields ? `${Math.floor(ship.systems.shields.level / 2)} mesh layer` : "no ward mesh";
      textAt(g, `${mesh} · reactor ${ship.reactor}\npayloads ${inv.payloads} · spares ${inv.spares}\nsalvage ${rules.startingSalvage}`, vx + 14, py + 45, { font: TYPE.note, color: P.ivory2 });
      header(g, "Voyage seed", vx + 14, py + 92);
      textAt(g, String(seed), vx + 14, py + 104, { font: TYPE.title, color: P.ivory1 });
      if (brassButton(a, "reseed", vx + connW - 14 - 92, py + 100, 92, 22, "NEW SEED", { variant: "normal" })) {
        seed = Math.floor(Math.random() * 900000) + 100000;
      }
      if (brassButton(a, "begin", vx + 14, py + ph - 14 - 40, connW - 28, 40, "BEGIN", { hotkey: "Enter", sub: "from Relay Seven" })) begin();
      footer(g, a, [], [["ENTER", "begin"], ["ESC", "back"]], { note: tip });
    },
  };

  function crewRow(g: Gfx, a: App, i: number, x: number, y: number, w: number, h: number) {
    const c = ship.crew[i];
    g.panel(x, y, w, h, "panel-dark");
    if (!g.sprite("crew", `${c.species}-portrait`, x + 4, y + Math.round((h - 32) / 2), { noAnchor: true }) && !icon(g, `species-${c.species}`, x + 8, y + 14)) g.rect(x + 10, y + 16, 12, 12, P.ink3);
    const tx = x + 42;
    const tw = w - 42 - 8;
    const fl = SPECIES_FLAVOR?.[c.species];
    if (editing === i) {
      buf = a.ui.textField(`crew-name-${i}`, tx, y + 3, 190, buf, 22);
      a.ui.focusId = `crew-name-${i}`;
      if (a.input.keyPressed("Enter") || a.input.keyPressed("Escape")) {
        a.input.eatKey("Enter");
        a.input.eatKey("Escape");
        if (buf.trim()) c.name = buf.trim();
        editing = null;
      }
    } else {
      textAt(g, c.name, tx, y + 5, { font: TYPE.body, color: P.ivory0 });
      textAt(g, `${fl?.name ?? c.species} · ${speciesMaxHp(c.species)} HP`, tx + Math.ceil(measure(c.name, TYPE.body)) + 10, y + 7.5, { font: TYPE.note, color: P.brass1 });
      if (brassButton(a, `rename-${i}`, x + w - 6 - 76, y + 4, 76, 18, "RENAME", { variant: "normal" })) {
        editing = i;
        buf = c.name;
      }
    }
    textAt(g, catalog.species[c.species]?.special ?? fl?.desc ?? "", tx, y + 21, { font: TYPE.note, width: tw, color: P.ivory3 });
    if (a.ui.hover(x, y, 40, h)) a.ui.setTooltip(`${c.name}\n${volunteerRecord(c)}`, 300, { x, y, w: 40, h, side: "right" });
  }

  function begin() {
    ship.name = (name || "Lamplighter").trim();
    ship.livery.lamp = lamp;
    deleteSave();
    const run = createRun(seed, ship, undefined, difficulty);
    const s = new Session(app, run);
    s.begin({ prologue: true, fresh: true });
  }

  void rgba;
  void C;
  return scene;
}
