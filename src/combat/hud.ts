// Combat HUD (FTL layout at 960×540 layout units; muted FAULTLINE brass and indigo; never zoomed). The screen is
// split into fixed bands that never overlap a vessel (view.ts LAYOUT): the top bar (tender status, the handshake and
// HOP, stores), the enemy header, the crew roster and the comms log under the two vessels, and the ship bar along
// the bottom (reactor, system power, weapon and drone cards, commands). The ship bar is shared with the relay, where
// it runs in planning mode. Immediate mode: each widget draws itself and reports what the player asked for.
import { difficultyRules } from "../data/difficulty";
import type { App } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { P, C } from "../core/palette";
import { keyLabel } from "../core/ui";
import { measure } from "../core/font";
import { SYSTEMS } from "../data/systems";
import { SKILL_IDS, skillLevel } from "../data/species";
import type { SysKey } from "../data/layouts";
import type { Sim } from "./sim/sim";
import type { SimCrew, SimDrone, SimSystem, SimWeapon } from "./sim/model";
import { effective, usable, reactorUsed, isMain, manner } from "./sim/power";
import { chargeTime, chargeRate } from "./sim/weapons";
import { drawSysIcon, sysState } from "./draw-ship";
import { droneName, systemDesc, systemName, weaponName, enemyText, hazardText, itemIcon, weaponArt } from "./assets";
import { weaponTooltip, droneTooltip, sysIcon, crewTooltip, weaponStatLines } from "./tooltips";
import { shieldState } from "./sim/shield-state";
import { LAYOUT } from "./view";

export interface HudState {
  selected: Set<number>;
  weaponSel: number;
  paused: boolean;
  hoverCrew: number;
  requestDeparture?: () => void;
}

export type BarMode = "combat" | "plan";

export const SYS_KEYS: Partial<Record<SysKey, string>> = {
  shields: "KeyA", engines: "KeyS", medbay: "KeyD", air: "KeyF", drones: "KeyG", veil: "KeyH",
};
export const DRONE_KEYS = ["Digit7", "Digit8", "Digit9", "Digit0"] as const;

const MAIN_ORDER: SysKey[] = ["shields", "engines", "medbay", "air", "drones", "veil"];
const SUB_ORDER: SysKey[] = ["helm", "sensors", "doors"];
export const HUD_Y = LAYOUT.barY;

function icon(g: Gfx, frame: string, x: number, y: number): boolean {
  return g.sprite("icons", frame, x, y);
}

// ─── top bar ────────────────────────────────────────────────────────────────────────────────────────────────

const STATUS = { x: 4, w: 258 };
const SHAKE = { x: 266, w: 426 };
const STORES = { x: 696, w: 260 };
/** Screen rectangles of the top-bar panels (for world hit-testing). */
export const TOP_PANELS: [number, number, number, number][] = [
  [STATUS.x, LAYOUT.topY, STATUS.w, LAYOUT.topH], [SHAKE.x, LAYOUT.topY, SHAKE.w, LAYOUT.topH], [STORES.x, LAYOUT.topY, STORES.w, LAYOUT.topH],
];
export const PAUSE_PLATE = { x: 434, y: 51, w: 92, h: 15 };

export function drawTopBar(g: Gfx, app: App, sim: Sim, hs: HudState) {
  const ui = app.ui;
  const P0 = sim.ships[0];
  const y = LAYOUT.topY;
  g.panel(STATUS.x, y, STATUS.w, LAYOUT.topH, "panel-dark");
  // Hull: segments sized to fit between the label and the number.
  g.text("HULL", 10, y + 5, { font: "label", color: C.textDim });
  const hx = 40;
  const n = P0.hullMax;
  const segW = Math.max(2, Math.min(4, Math.floor(186 / n) - 1));
  const frac = P0.hull / n;
  const on = frac > 0.66 ? P.verd1 : frac > 0.33 ? P.amber2 : P.ember2;
  const onHi = frac > 0.66 ? P.verd0 : frac > 0.33 ? P.amber1 : P.ember1;
  for (let i = 0; i < n; i++) {
    const x = hx + i * (segW + 1);
    const lit = i < P0.hull;
    g.rect(x, y + 4, segW, 11, P.ink0);
    g.rect(x, y + 5, segW, 9, lit ? on : P.ink3);
    if (lit) g.hline(x, y + 5, segW, onHi);
  }
  if (P0.hitT < 0.25) g.alpha(0.6 * (1 - P0.hitT / 0.25), () => g.rect(hx, y + 4, n * (segW + 1), 11, P.ember1));
  g.text(`${Math.ceil(P0.hull)}`, STATUS.x + STATUS.w - 6, y + 1, { font: "body", color: frac > 0.33 ? C.text : C.bad, align: "right" });
  if (ui.hover(STATUS.x, y, STATUS.w, 18)) ui.setTooltip(`{icon:res-hull-sm} {title}Hull{/} ${Math.ceil(P0.hull)}/${P0.hullMax}\n{dim}The tender's plating. At zero the car breaks from its carrier. Repair at benches and exchanges.{/}`, 260);
  // Ward mesh: charged, available and installed layers share one vocabulary on both sides.
  drawMeshStatus(g, app, sim, 0, 10, y + 21, 132);
  const air = Math.round(P0.rooms.reduce((a, r) => a + r.o2 * r.tiles.length, 0) / P0.rooms.reduce((a, r) => a + r.tiles.length, 0));
  g.text(`EVASION ${P0.evasion}%`, 150, y + 21, { font: "label", color: P0.evasion > 0 ? C.text : C.bad });
  g.text(`AIR ${air}%`, 150, y + 32, { font: "label", color: air < 25 ? C.bad : air < 60 ? C.warn : C.text });
  if (P0.veilT > 0) g.text(`VEIL ${P0.veilT.toFixed(0)}s`, STATUS.x + STATUS.w - 6, y + 33, { font: "small", color: P.violet1, align: "right" });
  if (ui.hover(146, y + 20, 110, 11)) {
    const pilot = manner(sim, P0, "helm");
    const eng = manner(sim, P0, "engines");
    ui.setTooltip(`{icon:status-evasion-sm} {title}Evasion ${P0.evasion}%{/}\n{dim}The drive surges, brakes and swings the car on its carrier, so this share of bolts and payloads goes through empty air.{/}\nThrusters ${effective(P0.sys.engines)} · helm ${pilot ? `{good}${pilot.name}{/}` : "{bad}unattended{/}"} · thrusters ${eng ? `{good}${eng.name}{/}` : "{faint}unattended{/}"}${P0.mods.evasion ? `\n{faint}Coupled cars ${P0.mods.evasion}%{/}` : ""}${P0.veilT > 0 ? "\n{ion}Veiled +60%{/}" : ""}`, 280);
  }
  if (ui.hover(146, y + 31, 110, 11)) ui.setTooltip("{icon:status-low-air-sm} {title}Air{/} across the tender\n{dim}Below 5% in a room, crew who breathe suffocate. Breaches and open airlocks vent it into the thin outside.{/}", 260);

  drawHandshake(g, app, sim, hs);

  // Stores: icon and count, with the name underneath.
  g.panel(STORES.x, y, STORES.w, LAYOUT.topH, "panel-dark");
  const inv = sim.inventoryView();
  const res: [string, number, string, string][] = [
    ["salvage", inv.salvage, "SALVAGE", "{title}Salvage{/}\n{dim}The Line's currency: bent brass and good wire.{/}"],
    ["ttl", inv.ttl, "TTL", "{title}TTL{/}\n{dim}Hops left on your connection. Every relay switch takes one.{/}"],
    ["payloads", P0.payloads, "PAYLOADS", "{title}Payloads{/}\n{dim}Spliced charges for payload weapons, one per shot.{/}"],
    ["spares", P0.spares, "SPARES", "{title}Spares{/}\n{dim}Parts for drones: every launch spends one.{/}"],
  ];
  const cw = Math.floor((STORES.w - 8) / 4);
  res.forEach(([id, v, name, tip], i) => {
    const cx = STORES.x + 4 + i * cw;
    const low = (id === "payloads" || id === "spares") && v === 0 || id === "ttl" && v <= 2;
    if (!icon(g, `res-${id}-sm`, cx + 10, y + 13)) g.rect(cx + 3, y + 6, 12, 12, P.brass3);
    g.text(`${v}`, cx + 20, y + 4, { font: "body", color: low ? C.bad : C.text });
    g.text(name, cx + Math.round(cw / 2), y + 28, { font: "small", color: C.textFaint, align: "center" });
    if (ui.hover(cx, y + 2, cw, LAYOUT.topH - 4)) ui.setTooltip(`{icon:res-${id}-sm} ${tip}`, 240);
  });
  if (hs.paused) drawPausedFrame(g);
}

function drawMeshStatus(g: Gfx, app: App, sim: Sim, side: 0 | 1, x: number, y: number, width: number) {
  const state = shieldState(sim.ships[side]);
  g.text(`MESH ${state.charged}/${state.available}`, x, y, { font: "small", color: state.charged ? P.teal0 : C.bad });
  const count = Math.max(state.installed, state.available);
  for (let i = 0; i < count; i++) {
    const px = x + 58 + i * 11, available = i < state.available;
    g.box(px, y + 1, 8, 7, available ? P.teal2 : P.steel3);
    if (i < state.charged) g.rect(px + 1, y + 2, 6, 5, P.teal1);
    else if (!available) g.line(px, y + 7, px + 7, y + 1, P.steel2);
  }
  g.text(state.cause || state.status, x, y + 11, { font: "small", color: state.charged ? C.textDim : C.bad, width, maxLines: 1 });
  if (state.recharging) {
    const bx = x + 58 + count * 11 + 2, bw = Math.max(20, width - (bx - x));
    g.rect(bx, y + 2, bw, 5, P.ink0);
    g.rect(bx + 1, y + 3, Math.round((bw - 2) * state.progress), 3, P.teal1);
  }
  if (app.ui.hover(x - 2, y - 2, width, 23)) app.ui.setTooltip(state.description + (side === 1 ? `\nEvasion ${sim.ships[1].evasion}%` : ""), 300);
}

function drawHandshake(g: Gfx, app: App, sim: Sim, hs: HudState) {
  const ui = app.ui;
  const P0 = sim.ships[0];
  const x = SHAKE.x;
  const y = LAYOUT.topY;
  g.panel(x, y, SHAKE.w, LAYOUT.topH, "panel-dark");
  const hopW = 64;
  const bx = x + SHAKE.w - hopW - 6;
  const labels = ["HELLO", "I HEAR YOU", "I HEAR YOU HEAR ME"];
  const segW = Math.floor((bx - 8 - (x + 8) - 4) / 3);
  for (let i = 0; i < 3; i++) {
    const sx = x + 8 + i * (segW + 2);
    const f = Math.max(0, Math.min(1, P0.hop * 3 - i));
    g.rect(sx, y + 18, segW, 9, P.ink0);
    g.rect(sx + 1, y + 19, segW - 2, 7, P.ink2);
    if (f > 0) {
      g.rect(sx + 1, y + 19, Math.round((segW - 2) * f), 7, f >= 1 ? P.amber2 : P.amber3);
      g.hline(sx + 1, y + 19, Math.round((segW - 2) * f), f >= 1 ? P.amber1 : P.amber2);
    }
    if (f > 0 && f < 1) g.rect(sx + Math.round((segW - 2) * f), y + 19, 1, 7, P.amber0);
    g.text(labels[i], sx + Math.round(segW / 2), y + 30, { font: "small", color: f >= 1 ? P.amber1 : C.textFaint, align: "center" });
  }
  const eng = effective(P0.sys.engines);
  const pilot = manner(sim, P0, "helm");
  const why = eng <= 0 ? "the drive has no power" : usable(P0.sys.helm) <= 0 ? "the helm is out" : !pilot ? "helm unattended, no greeting" : "";
  if (!icon(g, `handshake-${Math.min(3, Math.floor(P0.hop * 3 + 1e-6))}`, x + 16, y + 9)) g.circle(x + 16, y + 9, 4, P.amber2);
  g.text(why ? `HANDSHAKE · ${why.toUpperCase()}` : "HANDSHAKE", x + 30, y + 4, { font: "label", color: why ? C.bad : C.textDim });
  if (ui.hover(x, y, bx - x, LAYOUT.topH)) {
    ui.setTooltip("{title}The handshake{/}\n{dim}Hello. I hear you. I hear you hear me. The helm sends it while the drive spools the trolley up to line speed. When all three are heard, HOP takes the switch and runs you down the carrier to a linked relay, leaving the fight and its rewards.{/}\nNeeds power in the Thrusters and a crew member at the Helm. From Helm 2 the switch is prepared at half speed without one, but only a crew member can send the final greeting.", 300);
  }
  const ready = sim.hopReady();
  if (ui.button("hop", bx, y + 6, hopW, 32, "HOP", { variant: ready ? "blue" : "normal", disabled: !ready, hotkey: "KeyJ", tooltip: ready ? "Choose a linked relay and confirm its TTL cost (J). The Seal advances once." : !sim.setup.retreat ? "No linked relay can be reached from this fight." : sim.inventoryView().ttl < sim.setup.retreat.cost ? `Leaving needs ${sim.setup.retreat.cost} TTL.` : !manner(sim, P0, "helm") ? "Helm unattended: send a crew member to the Helm to speak the greeting." : "Complete the handshake with a working drive and an attended helm." })) hs.requestDeparture?.();
  if (ready) g.alpha(0.3 + 0.2 * Math.sin(app.time * 4), () => g.box(bx - 1, y + 5, hopW + 2, 34, P.amber1));
}

function drawPausedFrame(g: Gfx) {
  g.alpha(0.75, () => {
    g.rect(0, 0, 960, 2, P.brass2);
    g.rect(0, 538, 960, 2, P.brass2);
    g.rect(0, 0, 2, 540, P.brass2);
    g.rect(958, 0, 2, 540, P.brass2);
  });
  const p = PAUSE_PLATE;
  g.panel(p.x, p.y, p.w, p.h, "panel-dark");
  g.text("PAUSED", p.x + p.w / 2, p.y + 3, { font: "labelb", color: P.brass1, align: "center" });
}

// ─── enemy header ───────────────────────────────────────────────────────────────────────────────────────────

export function drawEnemyHeader(g: Gfx, app: App, sim: Sim) {
  const ui = app.ui;
  const E = sim.ships[1];
  const H = LAYOUT.enemyHead;
  const tx = enemyText(E.defId);
  g.panel(H.x, H.y, H.w, H.h, "panel-dark");
  const x0 = H.x + 8;
  const right = H.x + H.w - 8;
  const meshX = right - 128;
  g.text(tx.name.toUpperCase(), x0, H.y + 5, { font: "labelb", color: E.dead ? C.textFaint : P.ember1, width: meshX - x0 - 8, maxLines: 1 });
  if (tx.classLine) g.text(tx.classLine, x0, H.y + 17, { font: "small", color: C.textFaint, width: meshX - x0 - 8, maxLines: 1 });
  if (ui.hover(x0 - 4, H.y + 2, meshX - x0, 24)) {
    const e = E.enemy!, rules = difficultyRules(sim.setup.difficulty);
    ui.setTooltip(`{title}${tx.name}{/}${tx.classLine ? `\n{dim}${tx.classLine}{/}` : ""}\n${e.mobility === "installation" ? "Installation: fixed in place, it cannot dodge." : e.mobility === "flier" ? "Rotor machine: hard to hit." : "Rides its own carrier."}${e.kind === "human" ? "\n{warn}A human crew: they may surrender.{/}" : ""}\n{brass}${rules.name} voyage{/}: hostile volleys take ${Math.round(rules.enemyWeaponCharge * 100)}% base time; hostile hull and crew impact ${Math.round(rules.enemyDamage * 100)}%.`, 260);
  }
  drawMeshStatus(g, app, sim, 1, meshX, H.y + 5, 128);
  // Hull (the Core's meter belongs to its isolation machinery, never the archive).
  const hy = H.y + 30;
  const n = E.hullMax;
  const sw = Math.max(2, Math.min(4, Math.floor(196 / n) - 1));
  g.text("HULL", x0, hy - 2, { font: "small", color: C.textFaint });
  const hx = x0 + 26;
  for (let i = 0; i < n; i++) {
    const lit = i < E.hull;
    g.rect(hx + i * (sw + 1), hy, sw, 7, P.ink0);
    g.rect(hx + i * (sw + 1), hy + 1, sw, 5, lit ? (E.hull / n > 0.33 ? P.verd2 : P.ember2) : P.ink3);
  }
  g.text(`${Math.ceil(E.hull)}/${E.hullMax}`, hx + n * (sw + 1) + 5, hy - 2, { font: "small", color: C.text });
  if (ui.hover(x0, hy - 3, n * (sw + 1) + 60, 12)) ui.setTooltip(`{icon:res-hull-sm} ${E.boss.core ? "Isolation shell" : "Hull"} ${Math.ceil(E.hull)}/${E.hullMax}`);
  drawEnemyLaw(g, app, sim, right, hy - 2, right - (hx + n * (sw + 1) + 40));
  drawEnemySystems(g, app, sim, x0, H.y + 40, right);
}

/** Guardian laws, duty objectives and flight: one line on the right of the hull row. */
function drawEnemyLaw(g: Gfx, app: App, sim: Sim, right: number, y: number, room: number) {
  const ui = app.ui;
  const E = sim.ships[1];
  const gate = E.boss.gate, glass = E.boss.glass, core = E.boss.core, scenario = sim.setup.scenario;
  let law = "";
  let tip = "";
  let color: string = P.brass1;
  if (glass && !sim.outcome) {
    const P0 = sim.ships[0], helmWorking = usable(P0.sys.helm) > 0 && (!!manner(sim, P0, "helm") || usable(P0.sys.helm) >= 2);
    const label = glass.up ? glass.tuning ? `HOLDING ${glass.channel.toFixed(1)}/12s${helmWorking ? "" : " · HELM LOST"}` : `TUNE CHANNEL ${glass.channel.toFixed(1)}/12s` : `GLASS OPEN ${Math.max(0, glass.downT).toFixed(0)}s`;
    const w = Math.min(room, 170);
    if (glass.up) {
      if (ui.button("choir-tune", right - w, y - 2, w, 13, label, { font: "small", active: glass.tuning, tooltip: "{title}Keep a channel open{/}\nHold the helm on the Choir's note for 12 seconds and the glass opens. Tuning spends the handshake charge; losing the helm drains progress. Damaged bells tune faster and keep the opening longer. Three hits within one second also force it open." })) sim.tuneChoir(!glass.tuning);
      return;
    }
    law = label;
    tip = "{title}The glass is open{/}\nThe bells can be hit until it closes again.";
  } else if (gate) {
    // Name the routes already heard: a gun mount or the drone, the tender's second voice.
    const heard = [...new Set(gate.locks.filter((l) => sim.t - l.t <= 2.2).map((l) => l.source))].filter((src) => /^[wd]0:/.test(src));
    const names = heard.map((src) => (src[0] === "d" ? "DRONE" : `MOUNT ${Number(src.split(":")[1]) + 1}`));
    law = gate.up ? `GATE SEALED · ${heard.length}/2 SOURCES${names.length ? ` · ${names.join(" + ")}` : ""}` : `GATE OPEN ${Math.max(0, gate.downT).toFixed(0)}s`;
    tip = "{title}No passage without proof of a second way home{/}\nWhile sealed, the gate stops every hit. Land hits from {brass}two different routes{/} within 2.2 seconds (two guns, or a gun and a combat drone) and it opens for a while. A hit on a gate warden counts for its route. While the gate is sealed a combat drone works the gate and times its bolt to answer your guns. The wardens mend the Regent and close the gate sooner.\n{dim}Its Routing Edict goes for your route: Helm, then Thrusters.{/}";
  } else if (core) {
    law = `${["", "CUSTODY", "EMERGENCY", "EVENT HORIZON"][core.phase]} · ARCHIVE PROTECTED`;
    color = P.ember1;
    tip = (core.phase === 1 ? "{title}Custody{/}\nCut, breach, jam, strike, in rotation. Break a step's room to skip it." : core.phase === 2 ? "{title}Emergency{/}\nThe Core spends its reserve: two steps at a time, faster." : "{title}Event horizon{/}\nEvery light is pulled inward (-10% evasion). The sealing drones close the shell: +1 ward layer while any flies.") + "\n{dim}The archive inside must survive: stop the isolation machinery, then send the greeting.{/}";
  } else if (scenario && !sim.outcome && !sim.deliveryReady) {
    const target = E.sys[scenario.system];
    law = `${(scenario.label ?? "RELEASE DUTY").toUpperCase()} ${sim.dutyProgress.toFixed(1)}/${scenario.holdSeconds ?? 5}s`;
    color = target && usable(target) ? P.amber2 : P.teal1;
    tip = `{title}${scenario.label ?? "Release its duty"}{/}\nDisable the ${systemName(scenario.system)} and keep your helm attended for ${scenario.holdSeconds ?? 5} seconds. The machine stops; nothing is destroyed.\n${target && usable(target) ? "{warn}The mechanism is still working.{/}" : "{good}Mechanism stopped: acknowledging.{/}"}`;
  } else if (E.fleeing && !sim.outcome) {
    const w = 60;
    g.text("RUNNING", right - w - 4, y, { font: "small", color: C.warn, align: "right" });
    g.rect(right - w, y + 2, w, 5, P.ink0);
    g.rect(right - w + 1, y + 3, Math.round((w - 2) * E.hop), 3, P.amber2);
    if (ui.hover(right - w - 44, y - 1, w + 44, 11)) ui.setTooltip("{title}Spooling up to run{/}\n{dim}When the bar fills they take the switch and leave. Hit their thrusters or helm to stop it.{/}", 240);
    return;
  }
  if (!law) return;
  g.text(law, right, y, { font: "small", color, align: "right" });
  if (ui.hover(right - measure(law, "small") - 2, y - 1, measure(law, "small") + 4, 11)) ui.setTooltip(tip, 290);
}

function drawEnemySystems(g: Gfx, app: App, sim: Sim, x0: number, y: number, right: number) {
  const ui = app.ui;
  const E = sim.ships[1];
  const showPower = sim.seeEnemyPower();
  const list = E.systems.filter((s) => s.id !== "artillery");
  // Weapon charge bars sit at the right end; the systems fill the rest.
  const weapons = E.weapons;
  const wbW = 26;
  const wx0 = right - weapons.length * (wbW + 3) + 3;
  const pipW = list.reduce((a, s) => a + 16 + s.level * 4 + 6, 0) > wx0 - x0 - 8 ? 2 : 3;
  let x = x0;
  for (const s of list) {
    const cell = 16 + s.level * (pipW + 1) + 5;
    drawSysIcon(g, s.id, sysState(s), x + 7, y + 8, true);
    g.rect(x + 15, y + 2, s.level * (pipW + 1) + 1, 12, P.ink0);
    for (let i = 0; i < s.level; i++) {
      const ok = i < s.level - s.damage;
      const ion = ok && s.ion > 0 && i >= s.level - s.damage - s.ion;
      const powered = showPower && (isMain(s.id) ? i < effective(s) : i < usable(s));
      g.rect(x + 16 + i * (pipW + 1), y + 3, pipW, 10, !ok ? P.ember2 : ion ? P.violet1 : powered ? P.teal2 : showPower ? P.steel0 : P.steel1);
    }
    if (ui.hover(x, y, cell - 2, 16)) ui.setTooltip(`${sysIcon(s.id, sysState(s))} {title}${systemName(s.id)}{/} · ${s.level - s.damage}/${s.level} working${s.ion ? ` · {ion}${s.ion} ionised{/}` : ""}${showPower ? ` · {teal}${effective(s)} powered{/}` : "\n{faint}Power readings need Listening Post 4.{/}"}\n{dim}${systemDesc(s.id)}{/}`, 270);
    x += cell;
  }
  if (!weapons.length) return;
  if (!sim.seeEnemyCharge()) {
    g.text("charge unseen", right, y + 3, { font: "small", color: C.textFaint, align: "right" });
    if (ui.hover(right - 70, y, 72, 14)) ui.setTooltip("{faint}Reading enemy weapon charge needs Listening Post 3 (or the Wireshark Tap).{/}");
    return;
  }
  weapons.forEach((w, i) => {
    const wx = wx0 + i * (wbW + 3);
    const f = Math.min(1, w.charge / chargeTime(w));
    const live = w.art ? usable(w.art) > 0 && w.active : w.powered;
    g.rect(wx, y + 4, wbW, 8, P.ink0);
    g.rect(wx + 1, y + 5, Math.round((wbW - 2) * f), 6, !live ? P.steel0 : f >= 1 ? P.ember1 : P.amber3);
    if (f >= 1 && live) g.hline(wx + 1, y + 5, wbW - 2, P.ember0);
    if (ui.hover(wx - 1, y, wbW + 2, 16)) ui.setTooltip(weaponTooltip(sim, w, 1), 290);
  });
}

// ─── ship bar: reactor, systems, weapons, drones (combat and relay planning) ─────────────────────────────────

/** What the player asked the ship bar to do this frame. The caller applies it (combat sim or relay plan). */
export interface BarIntents {
  addPower?: SysKey;
  removePower?: SysKey;
  veil?: boolean;
  weaponClick?: number;
  weaponRight?: number;
  weaponSwap?: [number, number];
  droneClick?: number;
  droneRight?: number;
}

export interface BarOpts {
  mode: BarMode;
  /** Width reserved at the right end for the command column (drawn by the caller). */
  commandsW: number;
}

/** Bar geometry shared by both modes. */
const BAR = { barsBottom: 55, pitch: 6, iconY: 67, labelY: 78 };

let weaponDrag: { slot: number; x: number; y: number; moved: boolean } | null = null;

export function drawShipBar(g: Gfx, app: App, sim: Sim, hs: HudState, opts: BarOpts): BarIntents {
  const ui = app.ui;
  const P0 = sim.ships[0];
  const out: BarIntents = {};
  const y0 = LAYOUT.barY;
  g.panel(2, y0, 956, LAYOUT.barH, "panel");
  // Reactor: columns of eight bars; lit bars are free to assign.
  const used = reactorUsed(P0);
  const free = P0.reactor - used;
  const rx = 12;
  const per = 8;
  const cols = Math.max(1, Math.ceil(P0.reactor / per));
  const rw = Math.max(30, cols * 11);
  const colX = rx + Math.round((rw - cols * 11) / 2);
  for (let i = 0; i < P0.reactor; i++) {
    const c = Math.floor(i / per);
    const r = i % per;
    const lit = i < free;
    const x = colX + c * 11;
    const by = y0 + BAR.barsBottom - 5 - r * BAR.pitch;
    g.rect(x, by, 10, 5, P.ink0);
    g.rect(x + 1, by + 1, 8, 3, lit ? P.teal2 : P.ink3);
    if (lit) g.hline(x + 1, by + 1, 8, P.teal1);
  }
  drawSysIcon(g, "reactor", free > 0 ? "powered" : "unpowered", rx + rw / 2, y0 + BAR.iconY);
  g.text(`${free} FREE`, rx + rw / 2, y0 + BAR.labelY, { font: "small", color: free > 0 ? P.teal1 : C.textFaint, align: "center" });
  if (ui.hover(rx - 4, y0 + 6, rw + 8, 88)) ui.setTooltip(`{icon:sys-reactor-powered-sm} {title}Reactor{/} · ${free} of ${P0.reactor} bars free\n{dim}Click a system to give it a bar; right-click to take one back.${opts.mode === "plan" ? " Changes here are how the tender enters its next fight." : ""} More bars are bought at exchanges and benches.{/}`, 270);
  let x = rx + rw + 8;
  for (const id of MAIN_ORDER) {
    const s = P0.sys[id];
    if (!s) continue;
    drawSystemColumn(g, app, sim, s, x, y0, false, opts.mode, out);
    x += 26;
  }
  g.vline(x + 1, y0 + 12, 78, P.brass5);
  x += 6;
  for (const id of SUB_ORDER) {
    const s = P0.sys[id];
    if (!s) continue;
    drawSystemColumn(g, app, sim, s, x, y0, true, opts.mode, out);
    x += 24;
  }
  x += 6;
  // Weapons and drones share the rest of the width up to the command column: no dead zone.
  // Drone slots without a Drone Bay and without drones would only be empty boxes: the Ship screen lists them.
  const droneSlots = P0.sys.drones || P0.drones.length ? sim.droneSlots() : 0;
  const weaponSlots = sim.weaponSlots();
  const end = 956 - 6 - opts.commandsW - 6;
  const groups = (weaponSlots ? 1 : 0) + (droneSlots ? 1 : 0);
  const avail = end - x - (groups - 1) * 6 - groups * 30;
  const units = weaponSlots + droneSlots * 0.72;
  const wCard = units > 0 ? Math.floor(avail / units) : 0;
  if (weaponSlots) {
    const gw = droneSlots ? 30 + weaponSlots * wCard : end - x;
    drawWeapons(g, app, sim, hs, x, y0, gw, opts.mode, out);
    x += gw + 6;
  }
  if (droneSlots) drawDrones(g, app, sim, x, y0, end - x, opts.mode, out);
  return out;
}

function sysKeyHelp(key: string | undefined): string {
  return key ? ` (${keyLabel(key)}; Shift+${keyLabel(key)} takes one back)` : "";
}

function drawSystemColumn(g: Gfx, app: App, sim: Sim, s: SimSystem, x: number, y0: number, sub: boolean, mode: BarMode, out: BarIntents) {
  const ui = app.ui;
  const input = app.input;
  const P0 = sim.ships[0];
  const eff = effective(s);
  const bottom = y0 + BAR.barsBottom;
  for (let i = 0; i < s.level; i++) {
    const by = bottom - 5 - i * BAR.pitch;
    const dmgFrom = s.level - s.damage;
    let c: string = P.ink3;
    let hi: string | null = null;
    if (i >= dmgFrom) c = P.ember2;
    else if (i >= dmgFrom - s.ion) c = P.violet1;
    else if (i < eff) {
      c = i >= s.power && s.bonus > 0 ? P.violet0 : P.teal2;
      hi = P.teal1;
    }
    g.rect(x + 3, by, 18, 5, P.ink0);
    g.rect(x + 4, by + 1, 16, 3, c);
    if (hi && c === P.teal2) g.hline(x + 4, by + 1, 16, hi);
  }
  drawSysIcon(g, s.id, sysState(s), x + 12, y0 + BAR.iconY);
  const key = SYS_KEYS[s.id];
  if (key) g.text(keyLabel(key), x + 12, y0 + BAR.labelY, { font: "small", color: C.textDim, align: "center" });
  const hot = ui.hover(x, y0 + 6, 24, 88);
  if (hot) {
    const d = (SYSTEMS as Record<string, { levels?: string[] }>)[s.id];
    const lvl = d?.levels?.[s.level] ? ` · ${d.levels[s.level]}` : "";
    const how = sub ? "{faint}Subsystem: runs on its own level, no reactor bars.{/}" : `{faint}Click: +1 bar${sysKeyHelp(key)} · right-click: -1.{/}`;
    const dmg = s.damage ? `\n{bad}${s.damage} bar${s.damage > 1 ? "s" : ""} damaged{/}${mode === "combat" ? ": send crew to its room." : ": repaired in a fight or by field service."}` : "";
    const ion = s.ion ? `\n{ion}Ionised: ${s.ion} bar${s.ion > 1 ? "s" : ""} locked for ${s.ionT.toFixed(0)} s.{/}` : "";
    const man = ["shields", "engines", "weapons", "helm", "sensors", "doors"].includes(s.id) ? manner(sim, P0, s.id) : null;
    const manned = man ? `\n{good}Attended by ${man.name}{/}` : "";
    ui.setTooltip(`${sysIcon(s.id, sysState(s))} {title}${systemName(s.id)}{/} · ${eff}/${s.level}${lvl}\n{dim}${systemDesc(s.id)}{/}${dmg}${ion}${manned}\n${how}`, 290);
    ui.cursor = sub ? "arrow" : "pointer";
    if (!sub && input.pressed(0)) {
      input.consume();
      if (mode === "combat" && s.id === "veil" && eff > 0 && s.power >= s.level - s.damage - s.ion) out.veil = true;
      else out.addPower = s.id;
    }
    if (!sub && input.pressed(2)) {
      input.consume();
      out.removePower = s.id;
    }
  }
  if (s.id === "veil" && mode === "combat") {
    const ready = eff > 0 && P0.veilT <= 0 && P0.veilCd <= 0;
    const lbl = P0.veilT > 0 ? `${P0.veilT.toFixed(0)}` : P0.veilCd > 0 ? `${P0.veilCd.toFixed(0)}` : "GO";
    if (ui.button("veil-go", x + 1, y0 + 5, 22, 12, "", { disabled: !ready, hotkey: "KeyC", tooltip: "{title}Lamp-Dark Veil{/} (C)\n{dim}Douse every lamp: +60% evasion and hostile weapons stop charging while it lasts, then it cools down.{/}", sound: "veil-on" })) out.veil = true;
    g.text(lbl, x + 12, y0 + 7, { font: "small", color: ready ? P.violet0 : C.textFaint, align: "center" });
  }
}

/** A bay column: the bay's bars (lit = in use by powered weapons/drones), its icon and "used/level". */
function bayColumn(g: Gfx, app: App, s: SimSystem | undefined, id: "weapons" | "drones", used: number, x: number, y0: number, tip: string) {
  const bottom = y0 + BAR.barsBottom;
  if (!s) {
    drawSysIcon(g, id, "unpowered", x + 15, y0 + BAR.iconY);
    g.text("none", x + 15, y0 + BAR.labelY, { font: "small", color: C.textFaint, align: "center" });
  } else {
    for (let i = 0; i < s.level; i++) {
      const dmg = i >= s.level - s.damage;
      const ion = !dmg && i >= s.level - s.damage - s.ion;
      const by = bottom - 5 - i * BAR.pitch;
      g.rect(x + 7, by, 16, 5, P.ink0);
      g.rect(x + 8, by + 1, 14, 3, dmg ? P.ember2 : ion ? P.violet1 : i < used ? P.teal2 : P.ink3);
      if (!dmg && !ion && i < used) g.hline(x + 8, by + 1, 14, P.teal1);
    }
    drawSysIcon(g, id, sysState(s), x + 15, y0 + BAR.iconY);
    g.text(`${used}/${s.level - s.damage}`, x + 15, y0 + BAR.labelY, { font: "small", color: C.textDim, align: "center" });
  }
  if (app.ui.hover(x + 2, y0 + 6, 26, 88)) app.ui.setTooltip(tip, 270);
}

function drawWeapons(g: Gfx, app: App, sim: Sim, hs: HudState, x0: number, y0: number, w: number, mode: BarMode, out: BarIntents) {
  const P0 = sim.ships[0];
  const ws = P0.sys.weapons;
  const slots = sim.weaponSlots();
  g.panel(x0, y0 + 4, w, 88, "panel-dark");
  const used = P0.weapons.filter((q) => q.powered && !q.art).reduce((a, q) => a + q.def.power, 0);
  bayColumn(g, app, ws, "weapons", used, x0, y0, ws
    ? `${sysIcon("weapons", sysState(ws))} {title}Weapons Bay{/} · ${used}/${ws.level - ws.damage} bars in use\n{dim}${systemDesc("weapons")}{/}\n{faint}Click a weapon card to give it power; right-click to take it away.${mode === "plan" ? " Drag a card onto another to change the firing order." : ""}{/}`
    : "{title}No Weapons Bay{/}");
  const cardW = Math.floor((w - 32 - (slots - 1) * 3 - 3) / slots);
  for (let i = 0; i < slots; i++) weaponCard(g, app, sim, hs, i, x0 + 30 + i * (cardW + 3), y0 + 7, cardW, 82, mode, out);
  // Drag ghost (planning: reorder mounts).
  if (weaponDrag?.moved) {
    const wpn = P0.weapons.find((q) => q.slot === weaponDrag!.slot);
    if (wpn) {
      const label = weaponName(wpn.def.id);
      const tw = measure(label, "small") + 10;
      g.alpha(0.9, () => g.panel(app.input.x - tw / 2, app.input.y - 18, tw, 14, "panel-hi"));
      g.text(label, app.input.x, app.input.y - 15, { font: "small", color: P.ivory0, align: "center" });
    }
  }
  if (weaponDrag && !app.input.isDown(0)) weaponDrag = null;
}

function weaponCard(g: Gfx, app: App, sim: Sim, hs: HudState, i: number, cx: number, cy: number, cw: number, ch: number, mode: BarMode, out: BarIntents) {
  const ui = app.ui;
  const input = app.input;
  const P0 = sim.ships[0];
  const wpn = P0.weapons.find((q) => q.slot === i);
  const hover = ui.hover(cx, cy, cw, ch);
  if (!wpn) {
    g.panel(cx, cy, cw, ch, weaponDrag?.moved && hover ? "slot-hi" : "slot-empty");
    ui.keycap(`Digit${i + 1}`, cx + 5, cy + 5);
    g.text("EMPTY MOUNT", cx + cw / 2, cy + ch / 2 - 5, { font: "small", color: C.textFaint, align: "center" });
    if (hover) {
      ui.setTooltip(`{title}Mount ${i + 1}: empty{/}\n{dim}Fit a weapon from cargo on the Tender screen (U).${mode === "plan" ? " Drop a weapon card here to move it to this mount." : ""}{/}`, 240);
      if (mode === "plan" && weaponDrag?.moved && input.released(0) && weaponDrag.slot !== i) out.weaponSwap = [weaponDrag.slot, i];
    }
    return;
  }
  const ct = chargeTime(wpn);
  const f = Math.min(1, wpn.charge / ct);
  const combat = mode === "combat";
  const ready = combat && wpn.powered && f >= 1;
  const sel = combat && hs.weaponSel === i;
  const dropTarget = mode === "plan" && weaponDrag?.moved && hover && weaponDrag.slot !== i;
  g.panel(cx, cy, cw, ch, sel || dropTarget ? "slot-hi" : ready ? "slot-ready" : "slot");
  if (!wpn.powered) g.alpha(0.35, () => g.rect(cx + 3, cy + 3, cw - 6, ch - 6, P.ink0));
  // Header: key, name, power bars.
  ui.keycap(`Digit${i + 1}`, cx + 5, cy + 5);
  const pipsW = wpn.def.power * 5;
  for (let k = 0; k < wpn.def.power; k++) {
    const px = cx + cw - 7 - (k + 1) * 5;
    g.rect(px, cy + 6, 4, 8, P.ink0);
    g.rect(px + 1, cy + 7, 2, 6, wpn.powered ? P.teal2 : P.steel0);
  }
  const nameW = cw - 20 - pipsW - 10;
  const name = weaponName(wpn.def.id);
  // A name that does not fit beside the keycap gets two full-width lines under it and the art shrinks.
  const oneLine = measure(name, "small") <= nameW;
  if (oneLine) g.text(name, cx + 19, cy + 6, { font: "small", color: wpn.powered ? C.text : C.textDim });
  else g.text(name, cx + 6, cy + 18, { font: "small", color: wpn.powered ? C.text : C.textDim, width: cw - 12, maxLines: 2 });
  // Art (and plain stats when the card is wide enough).
  const wide = cw >= 132;
  const artW = wide ? Math.floor(cw * 0.46) : cw - 12;
  const artY = oneLine ? cy + 19 : cy + 37;
  g.alpha(wpn.powered ? 1 : 0.55, () => weaponGlyph(g, wpn, cx + 6, artY, artW, oneLine ? 30 : 17));
  if (wide) {
    const lines = weaponStatLines(sim, wpn, 0);
    lines.slice(0, 3).forEach((l, k) => g.text(l, cx + 10 + artW, cy + 19 + k * 10, { font: "small", color: k === 0 ? C.text : C.textDim, width: cw - artW - 16, maxLines: 1 }));
  }
  if (wpn.def.chain && wpn.chain > 0) g.text(`×${wpn.chain}`, cx + cw - 7, cy + 40, { font: "small", color: P.amber1, align: "right" });
  // Charge bar and status line.
  const barY = cy + ch - 27;
  g.rect(cx + 6, barY, cw - 12, 9, P.ink0);
  g.rect(cx + 7, barY + 1, cw - 14, 7, P.ink2);
  if (combat) {
    const fw = Math.round((cw - 14) * f);
    if (fw > 0) {
      g.rect(cx + 7, barY + 1, fw, 7, ready ? P.amber2 : wpn.powered ? P.teal3 : P.steel0);
      g.hline(cx + 7, barY + 1, fw, ready ? P.amber1 : P.teal2);
    }
  } else if (wpn.powered) {
    g.rect(cx + 7, barY + 1, cw - 14, 7, P.teal4);
    g.hline(cx + 7, barY + 1, cw - 14, P.teal3);
  }
  const secs = (ct - wpn.charge) / Math.max(0.01, chargeRate(sim, P0));
  const bayShort = !wpn.powered && bayLacksBars(P0, wpn);
  let status: string;
  let sc: string;
  if (!wpn.powered && bayShort) { status = "NEEDS A BAY BAR"; sc = P.amber2; }
  else if (!combat) {
    status = wpn.powered ? "POWERED" : wpn.want ? "NO FREE POWER" : "OFF";
    sc = wpn.powered ? P.teal1 : wpn.want ? C.bad : C.textFaint;
  } else if (!wpn.powered) { status = "OFF"; sc = C.textFaint; }
  else if (wpn.target) {
    const T = sim.ships[1];
    const t = wpn.target;
    const tr = t.kind === "room" ? T.rooms[t.room] : undefined;
    const where = tr ? (tr.sys ? systemName(tr.sys.id) : tr.name) : t.kind === "adj" ? "drone" : "beam line";
    status = ready ? `FIRING · ${where}` : `${Math.round(f * 100)}% · ${where}`;
    sc = P.ember1;
  } else if (ready) { status = "READY · PICK TARGET"; sc = P.amber1; }
  else { status = `${Math.round(f * 100)}% · ${secs.toFixed(1)} s`; sc = C.textDim; }
  const ammoW = wpn.def.ammo ? 26 : 0;
  g.text(status, cx + 7, cy + ch - 15, { font: "small", color: sc, width: cw - 14 - ammoW, maxLines: 1 });
  if (wpn.def.ammo) g.text(`{icon:res-payloads-sm}${P0.payloads}`, cx + cw - 7, cy + ch - 15, { font: "small", color: P0.payloads >= wpn.def.ammo ? C.textDim : C.bad, align: "right" });
  if (sel) g.box(cx + 1, cy + 1, cw - 2, ch - 2, P.amber1);
  if (ready && !sel) g.alpha(0.25 + 0.15 * Math.sin(app.time * 5), () => g.box(cx + 2, cy + 2, cw - 4, ch - 4, P.amber2));
  if (hover) {
    ui.setTooltip(weaponTooltip(sim, wpn, 0, mode), 300);
    ui.cursor = "pointer";
    if (input.pressed(0)) {
      input.consume();
      if (combat) out.weaponClick = i;
      else weaponDrag = { slot: i, x: input.x, y: input.y, moved: false };
    }
    if (input.pressed(2)) {
      input.consume();
      out.weaponRight = i;
    }
    if (!combat && weaponDrag && input.released(0)) {
      if (weaponDrag.slot === i && !weaponDrag.moved) out.weaponClick = i;
      else if (weaponDrag.slot !== i && weaponDrag.moved) out.weaponSwap = [weaponDrag.slot, i];
    }
  }
  if (!combat && weaponDrag?.slot === i && input.isDown(0) && Math.abs(input.x - weaponDrag.x) + Math.abs(input.y - weaponDrag.y) > 4) weaponDrag.moved = true;
}

/** The Weapons Bay has no room for this weapon beside the weapons already powered. */
export function bayLacksBars(P0: import("./sim/model").SimShip, w: SimWeapon): boolean {
  const ws = P0.sys.weapons;
  const busy = P0.weapons.filter((q) => q.powered && !q.art).reduce((n, q) => n + q.def.power, 0);
  return !ws || busy + w.def.power > usable(ws);
}

function weaponGlyph(g: Gfx, w: SimWeapon, x: number, y: number, width: number, height: number) {
  const { img, meta } = weaponArt(w.def.sprite);
  if (img && meta) {
    const scale = Math.min(1, width / meta.w, height / meta.h);
    const dw = Math.round(meta.w * scale * 2) / 2, dh = Math.round(meta.h * scale * 2) / 2;
    g.ctx.drawImage(img, Math.round((x + (width - dw) / 2) * 2) / 2, Math.round((y + (height - dh) / 2) * 2) / 2, dw, dh);
  }
}

function drawDrones(g: Gfx, app: App, sim: Sim, x0: number, y0: number, w: number, mode: BarMode, out: BarIntents) {
  const ui = app.ui;
  const input = app.input;
  const P0 = sim.ships[0];
  const slots = sim.droneSlots();
  g.panel(x0, y0 + 4, w, 88, "panel-dark");
  const ds = P0.sys.drones;
  const used = P0.drones.filter((q) => q.powered).reduce((a, q) => a + q.def.power, 0);
  bayColumn(g, app, ds, "drones", used, x0, y0, ds
    ? `${sysIcon("drones", sysState(ds))} {title}Drone Bay{/} · ${used}/${ds.level - ds.damage} bars in use\n{dim}${systemDesc("drones")}{/}\n{faint}${mode === "plan" ? "Click a drone to arm it: an armed drone launches when the next fight starts (one spare)." : "Click a drone to power and launch it (one spare); right-click to recall it."}{/}`
    : "{title}No Drone Bay{/}\n{dim}Couple a Drone Car or fit a Drone Bay module into a socket.{/}");
  const cardW = Math.floor((w - 32 - (slots - 1) * 3 - 3) / slots);
  for (let i = 0; i < slots; i++) {
    const cx = x0 + 30 + i * (cardW + 3);
    const cy = y0 + 7;
    const ch = 82;
    const d = P0.drones.find((q) => q.slot === i);
    const hover = ui.hover(cx, cy, cardW, ch);
    if (!d) {
      g.panel(cx, cy, cardW, ch, "slot-empty");
      if (DRONE_KEYS[i]) ui.keycap(DRONE_KEYS[i], cx + 5, cy + 5);
      g.text("EMPTY", cx + cardW / 2, cy + ch / 2 - 5, { font: "small", color: C.textFaint, align: "center" });
      if (hover) ui.setTooltip("{title}Empty drone slot{/}\n{dim}Fit a drone from cargo on the Tender screen (U).{/}", 220);
      continue;
    }
    const armed = mode === "plan" ? d.powered : d.powered || d.out;
    g.panel(cx, cy, cardW, ch, d.out ? "slot-hi" : "slot");
    if (!armed) g.alpha(0.35, () => g.rect(cx + 3, cy + 3, cardW - 6, ch - 6, P.ink0));
    if (DRONE_KEYS[i]) ui.keycap(DRONE_KEYS[i], cx + 5, cy + 5);
    for (let k = 0; k < d.def.power; k++) {
      const px = cx + cardW - 7 - (k + 1) * 5;
      g.rect(px, cy + 6, 4, 8, P.ink0);
      g.rect(px + 1, cy + 7, 2, 6, d.powered ? P.teal2 : P.steel0);
    }
    g.text(droneName(d.def.id), cx + 6, cy + 18, { font: "small", color: armed ? C.text : C.textDim, width: cardW - 12, maxLines: 2 });
    const img = itemIcon("drone", d.def.id);
    if (img) {
      const s = Math.min(26, cardW - 14) / 32;
      g.image(img, Math.round(cx + cardW / 2 - 16 * s), cy + 38, s, armed ? 1 : 0.5);
    }
    let st: string;
    let sc: string;
    if (mode === "plan") { st = d.powered ? "ARMED" : d.want ? "NO FREE POWER" : "DOCKED"; sc = d.powered ? P.teal1 : d.want ? C.bad : C.textFaint; }
    else { st = d.out ? "DEPLOYED" : d.powered ? "LAUNCHING" : "DOCKED"; sc = d.out ? P.teal1 : d.powered ? P.amber1 : C.textFaint; }
    g.text(st, cx + 6, cy + ch - 15, { font: "small", color: sc, width: cardW - 12, maxLines: 1 });
    if (d.def.kind === "repair" && d.out) g.text(`${d.used}/${d.def.capacity}`, cx + cardW - 6, cy + ch - 15, { font: "small", color: C.textDim, align: "right" });
    if (hover) {
      ui.setTooltip(droneTooltip(sim, d, mode), 280);
      ui.cursor = "pointer";
      if (input.pressed(0)) {
        input.consume();
        out.droneClick = i;
      }
      if (input.pressed(2)) {
        input.consume();
        out.droneRight = i;
      }
    }
  }
}

// ─── command buttons ────────────────────────────────────────────────────────────────────────────────────────

export const COMMANDS_W = 122;

export function drawCommands(g: Gfx, app: App, sim: Sim, hs: HudState): void {
  const ui = app.ui;
  const x = 956 - 6 - COMMANDS_W;
  const bh = 15;
  let yy = LAYOUT.barY + 7;
  const btn = (id: string, lbl: string, key: string, tip: string, active = false) => {
    const r = ui.button(id, x, yy, COMMANDS_W, bh, lbl, { font: "small", hotkey: key === "KeyR" && (app.input.shift || app.input.keyShifted(key)) ? undefined : key, showKey: true, tooltip: tip, active });
    yy += bh + 2;
    return r;
  };
  if (btn("autofire", sim.autofire ? "AUTOFIRE ON" : "AUTOFIRE", "KeyV", "{title}Autofire{/} (V)\n{dim}Weapons keep firing at their target whenever they charge.{/}", sim.autofire)) sim.setAutofire(!sim.autofire);
  if (btn("doors-open", "OPEN DOORS", "KeyO", "{title}Open every door and airlock{/} (O)\n{dim}Vents air, and any fire, into the thin outside.{/}")) sim.setAllDoors(true);
  if (btn("doors-close", "CLOSE DOORS", "KeyL", "{title}Close every door{/} (L)\n{dim}Your crew still pass; boarders must cut through.{/}")) sim.setAllDoors(false);
  if (btn("stations", "STATIONS", "KeyR", "{title}Return to stations{/} (R)\n{dim}Shift+R saves where everyone stands now.{/}")) sim.returnToStations();
  if (btn("pause", hs.paused ? "RESUME" : "PAUSE", "Space", "{title}Pause{/} (Space)\n{dim}Orders can be given while paused. The wheel zooms a view; Z resets.{/}", hs.paused)) hs.paused = !hs.paused;
}

// ─── crew roster ────────────────────────────────────────────────────────────────────────────────────────────

const TASK_LABEL: Record<string, string> = {
  repair: "repairing", fire: "fighting fire", breach: "patching breach", fight: "fighting", door: "at a door",
};

/** Where a crew member is and what they are doing, in a few words. */
export function crewStation(sim: Sim, c: SimCrew): string {
  const S = sim.ships[c.ship];
  const room = S.rooms[S.tileRoom[c.tile]];
  const where = room ? (room.sys ? systemName(room.sys.id) : room.name) : "";
  if (c.path.length) {
    const to = S.rooms[c.orderRoom];
    return to ? `to ${to.sys ? systemName(to.sys.id) : to.name}` : "moving";
  }
  if (c.task === "man") return where;
  const t = TASK_LABEL[c.task];
  return t ? `${t}` : where;
}

export interface CrewPanelOpts {
  title?: string;
  hint?: string;
  /** Hover sets this uid (for the in-room highlight). */
  onHover?: (uid: number) => void;
  tooltipExtra?: string;
}

/** The roster under the player's vessel: portrait, name, hull-like health, where they are and their F-key. Returns
 *  the uid of a clicked card. Used by combat and by the relay. */
export function drawCrewPanel(g: Gfx, app: App, sim: Sim, selected: Set<number>, rect: { x: number; y: number; w: number; h: number }, opts: CrewPanelOpts = {}): number | null {
  const ui = app.ui;
  const input = app.input;
  const { x, y, w, h } = rect;
  g.panel(x, y, w, h, "panel-dark");
  const crew = sim.playerCrew();
  g.text(opts.title ?? `CREW · ${crew.filter((c) => !c.dead).length}`, x + 8, y + 4, { font: "label", color: C.textDim });
  if (opts.hint) g.text(opts.hint, x + w - 8, y + 4, { font: "small", color: C.textFaint, align: "right" });
  let clicked: number | null = null;
  const n = Math.max(1, crew.length);
  const cols = n <= 6 ? 3 : n <= 12 ? 4 : 5;
  const rows = Math.ceil(n / cols);
  const top = y + 15;
  const areaH = y + h - 4 - top;
  const rowH = Math.min(areaH, Math.floor((areaH - (rows - 1) * 2) / rows));
  const cardW = Math.floor((w - 12 - (cols - 1) * 4) / cols);
  crew.forEach((c, i) => {
    const cx = x + 6 + (i % cols) * (cardW + 4);
    const ry = top + Math.floor(i / cols) * (rowH + 2);
    const sel = selected.has(c.uid);
    const hover = ui.hot(`crew-${c.id || c.uid}`, cx, ry, cardW, rowH, false);
    g.rect(cx, ry, cardW, rowH, c.dead ? P.ink1 : sel ? P.ink4 : hover ? P.ink3 : P.ink2);
    g.box(cx, ry, cardW, rowH, sel ? P.teal1 : P.brass5);
    const big = rowH >= 36;
    const ps = big ? 28 : Math.min(20, rowH - 2);
    g.clip(cx + 1, ry + 1, ps, rowH - 2, () => {
      if (!g.sprite("crew", `${c.species}-portrait`, cx + 1, ry + 1 + Math.max(0, Math.round((rowH - 2 - ps) / 2)) - (big ? 0 : 3), { noAnchor: true, alpha: c.dead ? 0.35 : 1 })) g.rect(cx + 4, ry + 4, ps - 6, ps - 6, P.ivory3);
    });
    const tx = cx + ps + 5;
    const keyW = i < 12 ? measure(`F${i + 1}`, "small") + 6 : 0;
    g.text(c.name, tx, ry + (big ? 4 : 2), { font: "small", color: c.dead ? C.textFaint : sel ? P.ivory0 : C.text, width: cardW - (tx - cx) - keyW - 6, maxLines: 1 });
    if (i < 12) ui.keycap(`F${i + 1}`, cx + cardW - 3, ry + (big ? 3 : 2), "right");
    if (c.dead) {
      g.text("lost", tx, ry + rowH - 11, { font: "small", color: C.bad });
      return;
    }
    const f = c.hp / c.maxHp;
    const hpCol = f > 0.6 ? P.verd1 : f > 0.3 ? P.amber2 : P.ember2;
    const station = crewStation(sim, c);
    const stCol = c.task === "fight" || c.task === "fire" || c.task === "breach" ? C.bad : c.task === "repair" ? C.warn : C.textDim;
    if (big) {
      g.text(station, tx, ry + 15, { font: "small", color: stCol, width: cardW - (tx - cx) - 6, maxLines: 1 });
      const bw = cardW - (tx - cx) - 38;
      g.rect(tx, ry + rowH - 10, bw, 6, P.ink0);
      g.rect(tx + 1, ry + rowH - 9, Math.max(1, Math.round((bw - 2) * f)), 4, hpCol);
      let sx = cx + cardW - 33;
      for (const sk of SKILL_IDS) {
        const lv = skillLevel(c.xp, sk);
        g.rect(sx, ry + rowH - 10, 4, 6, P.ink0);
        g.rect(sx + 1, ry + rowH - 9, 2, 4, lv === 2 ? P.amber1 : lv === 1 ? P.teal2 : P.ink4);
        sx += 5;
      }
    } else if (rowH >= 20) {
      const bw = Math.min(56, Math.floor((cardW - (tx - cx)) * 0.4));
      g.rect(tx, ry + rowH - 8, bw, 5, P.ink0);
      g.rect(tx + 1, ry + rowH - 7, Math.max(1, Math.round((bw - 2) * f)), 3, hpCol);
      g.text(station, tx + bw + 5, ry + rowH - 11, { font: "small", color: stCol, width: cardW - (tx - cx) - bw - 9, maxLines: 1 });
    } else {
      g.rect(tx, ry + rowH - 3, cardW - (tx - cx) - 3, 2, P.ink0);
      g.rect(tx, ry + rowH - 3, Math.max(1, Math.round((cardW - (tx - cx) - 3) * f)), 2, hpCol);
    }
    if (hover) {
      ui.setTooltip(crewTooltip(sim, c) + (opts.tooltipExtra ?? "") + `\n{faint}Click to select (Shift adds)${i < 12 ? `, or F${i + 1}` : ""}.{/}`, 290);
      ui.cursor = "pointer";
      opts.onHover?.(c.uid);
      if (input.pressed(0)) {
        input.consume();
        clicked = c.uid;
      }
    }
  });
  return clicked;
}

export function hazardLine(sim: Sim): { name: string; desc: string } | null {
  return sim.setup.hazard ? hazardText(sim.setup.hazard) : null;
}

export type { SimDrone };
