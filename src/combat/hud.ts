// Combat HUD (FTL layout at 960×540 layout units; muted FAULTLINE brass and indigo; never zoomed): hull, ward mesh,
// evasion/air, the handshake (hop charge) and HOP, resources, the enemy readout, reactor and system power, weapon and
// drone cards, crew list and command buttons. Immediate mode: each widget draws and handles its own input.
import type { App } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { P, C } from "../core/palette";
import { keyLabel } from "../core/ui";
import { SYSTEMS } from "../data/systems";
import { SKILL_IDS, SKILL_NAMES, skillLevel } from "../data/species";
import type { SysKey } from "../data/layouts";
import type { Sim } from "./sim/sim";
import type { SimSystem, SimWeapon } from "./sim/model";
import { effective, usable, reactorUsed, isMain, shieldMax, manner } from "./sim/power";
import { chargeTime } from "./sim/weapons";
import { drawSysIcon, sysState } from "./draw-ship";
import { droneName, systemDesc, systemName, weaponName, speciesName, enemyText, hazardText, itemIcon, weaponArt } from "./assets";
import { weaponTooltip, droneTooltip, sysIcon, crewTooltip } from "./tooltips";
import { ENEMY_AREA } from "./view";

export interface HudState {
  selected: Set<number>;
  weaponSel: number;
  paused: boolean;
  hoverCrew: number;
}

export const SYS_KEYS: Partial<Record<SysKey, string>> = {
  shields: "KeyA", engines: "KeyS", medbay: "KeyD", air: "KeyF", drones: "KeyG", veil: "KeyH",
};

const MAIN_ORDER: SysKey[] = ["shields", "engines", "medbay", "air", "drones", "veil"];
const SUB_ORDER: SysKey[] = ["helm", "sensors", "doors"];
export const HUD_Y = 442;
export const CREW_Y = 350;
/** Crew list row height for n crew (fits above the bottom bar). */
export function crewRowH(n: number): number {
  return Math.max(14, Math.min(20, Math.floor((HUD_Y - 4 - CREW_Y) / Math.max(1, Math.ceil(n / 2))) - 2));
}
export function crewListH(n: number): number {
  return Math.ceil(n / 2) * (crewRowH(n) + 2);
}

function label(g: Gfx, s: string, x: number, y: number, color: string = C.textDim) {
  g.text(s, x, y, { font: "label", color });
}

function icon(g: Gfx, frame: string, x: number, y: number): boolean {
  return g.sprite("icons", frame, x, y);
}

// ─── top bar ────────────────────────────────────────────────────────────────────────────────────────────────

export function drawTopBar(g: Gfx, app: App, sim: Sim, hs: HudState) {
  const ui = app.ui;
  const P0 = sim.ships[0];
  g.panel(4, 4, 256, 44, "panel-dark");
  // Hull.
  label(g, "HULL", 10, 8);
  const hx = 44;
  const n = P0.hullMax;
  const segW = n > 40 ? 3 : 4;
  const frac = P0.hull / n;
  const on = frac > 0.66 ? P.verd1 : frac > 0.33 ? P.amber2 : P.ember2;
  const onHi = frac > 0.66 ? P.verd0 : frac > 0.33 ? P.amber1 : P.ember1;
  for (let i = 0; i < n; i++) {
    const x = hx + i * (segW + 1);
    const lit = i < P0.hull;
    g.rect(x, 8, segW, 11, P.ink0);
    g.rect(x, 9, segW, 9, lit ? on : P.ink3);
    if (lit) g.hline(x, 9, segW, onHi);
  }
  if (P0.hitT < 0.25) g.alpha(0.6 * (1 - P0.hitT / 0.25), () => g.rect(hx, 8, n * (segW + 1), 11, P.ember1));
  g.text(`${P0.hull}`, hx + n * (segW + 1) + 4, 6, { font: "body", color: C.text });
  if (ui.hover(4, 4, 256, 18)) ui.setTooltip(`{icon:res-hull-sm} {title}Hull{/} ${P0.hull}/${P0.hullMax}\n{dim}At zero the tender breaks from its carrier. Repair at benches and markets.{/}`, 260);
  // Ward mesh pips.
  label(g, "MESH", 10, 27);
  const sm = shieldMax(P0);
  const base = Math.floor(effective(P0.sys.shields) / 2);
  if (sm === 0) g.text("down", 48, 25, { font: "small", color: C.bad });
  for (let i = 0; i < sm; i++) {
    const x = 50 + i * 13;
    const lit = i < P0.shields;
    const charging = i === P0.shields;
    const ion = (P0.sys.shields?.ion ?? 0) > 0;
    const frame = lit ? (ion ? "shield-pip-ionised" : "shield-pip-on") : charging ? "shield-pip-charging" : "shield-pip-off";
    if (!g.sprite("ui", frame, x + 5, 31)) {
      g.rect(x, 26, 10, 10, P.ink0);
      g.rect(x + 1, 27, 8, 8, lit ? (i >= base ? P.ember2 : ion ? P.violet1 : P.teal2) : P.ink3);
    }
    if (charging) g.rect(x, 38, Math.round(10 * P0.shieldT), 1, P.teal1);
  }
  if (ui.hover(4, 24, 124, 18)) ui.setTooltip(`{icon:sys-shields-powered-sm} {title}Ward mesh{/} ${P0.shields}/${sm} layers\n{dim}Charged ward-wire around the car. Each layer catches one bolt, then recharges in about two seconds. Every 2 power in the Shield Array raises a layer. Payloads pass through; beams lose 1 damage per layer.{/}`, 280);
  // Evasion and air.
  const air = Math.round(P0.rooms.reduce((a, r) => a + r.o2 * r.tiles.length, 0) / P0.rooms.reduce((a, r) => a + r.tiles.length, 0));
  g.text(`EVASION ${P0.evasion}%`, 150, 25, { font: "label", color: P0.evasion > 0 ? C.text : C.bad });
  g.text(`AIR ${air}%`, 150, 36, { font: "label", color: air < 25 ? C.bad : air < 60 ? C.warn : C.text });
  if (ui.hover(146, 24, 110, 11)) {
    const pilot = manner(sim, P0, "helm");
    const eng = manner(sim, P0, "engines");
    ui.setTooltip(`{icon:status-evasion-sm} {title}Evasion ${P0.evasion}%{/}\n{dim}The drive surges, brakes and swings the car on its carrier: bolts and payloads miss this often.{/}\nThrusters ${effective(P0.sys.engines)} · helm ${pilot ? `{good}${pilot.name}{/}` : "{bad}unmanned{/}"} · thrusters ${eng ? `{good}${eng.name}{/}` : "{faint}unmanned{/}"}${P0.mods.evasion ? `\n{faint}Coupled cars ${P0.mods.evasion}%{/}` : ""}${P0.veilT > 0 ? "\n{ion}Veiled +60%{/}" : ""}`, 280);
  }
  if (ui.hover(146, 35, 110, 11)) ui.setTooltip("{icon:status-low-air-sm} {title}Air{/} across the tender.\n{dim}Below 5% in a room, crew who breathe suffocate. Breaches and open airlocks vent it into the thin outside.{/}", 260);
  if (P0.veilT > 0) g.text(`VEIL ${P0.veilT.toFixed(0)}`, 222, 36, { font: "small", color: P.violet1 });

  drawHandshake(g, app, sim);

  // Resources.
  const inv = sim.inventoryView();
  const res: [string, number, string][] = [
    ["salvage", inv.salvage, "{title}Salvage{/}\n{dim}The Line's currency: bent brass and good wire.{/}"],
    ["ttl", inv.ttl, "{title}TTL{/}\n{dim}Hops left on your connection. Every hop spends one.{/}"],
    ["payloads", P0.payloads, "{title}Payloads{/}\n{dim}Spliced charges for payload weapons (one per shot).{/}"],
    ["spares", P0.spares, "{title}Spares{/}\n{dim}Parts to launch drones (one per launch).{/}"],
  ];
  g.panel(716, 4, 240, 26, "panel-dark");
  let rx = 724;
  for (const [id, v, tip] of res) {
    if (!icon(g, `res-${id}-sm`, rx + 7, 17)) g.rect(rx, 11, 12, 12, P.brass3);
    g.text(`${v}`, rx + 17, 8, { font: "body", color: C.text });
    if (ui.hover(rx - 2, 6, 56, 22)) ui.setTooltip(`{icon:res-${id}-sm} ${tip}`, 240);
    rx += 58;
  }
  if (hs.paused) drawPausedFrame(g);
}

function drawHandshake(g: Gfx, app: App, sim: Sim) {
  const ui = app.ui;
  const P0 = sim.ships[0];
  const x = 296;
  const y = 4;
  const w = 318;
  g.panel(x, y, w + 76, 44, "panel-dark");
  const labels = ["HELLO", "I HEAR YOU", "I HEAR YOU HEAR ME"];
  const segW = Math.floor((w - 16) / 3);
  for (let i = 0; i < 3; i++) {
    const sx = x + 8 + i * (segW + 2);
    const f = Math.max(0, Math.min(1, P0.hop * 3 - i));
    g.rect(sx, y + 21, segW, 9, P.ink0);
    g.rect(sx + 1, y + 22, segW - 2, 7, P.ink2);
    if (f > 0) {
      g.rect(sx + 1, y + 22, Math.round((segW - 2) * f), 7, f >= 1 ? P.amber2 : P.amber3);
      g.hline(sx + 1, y + 22, Math.round((segW - 2) * f), f >= 1 ? P.amber1 : P.amber2);
    }
    if (f > 0 && f < 1) g.rect(sx + Math.round((segW - 2) * f), y + 22, 1, 7, P.amber0);
    g.text(labels[i], sx + Math.round(segW / 2), y + 32, { font: "small", color: f >= 1 ? P.amber1 : C.textFaint, align: "center" });
  }
  const eng = effective(P0.sys.engines);
  const pilot = manner(sim, P0, "helm");
  const why = eng <= 0 ? "the drive has no power" : !pilot && usable(P0.sys.helm) < 2 ? "nobody at the helm" : "";
  if (!icon(g, `handshake-${Math.min(3, Math.floor(P0.hop * 3 + 1e-6))}`, x + 14, y + 11)) g.circle(x + 14, y + 11, 4, P.amber2);
  g.text(why ? `HANDSHAKE — ${why}` : "HANDSHAKE", x + 26, y + 6, { font: "label", color: why ? C.bad : C.textDim });
  if (ui.hover(x, y, w, 44)) {
    ui.setTooltip("{title}The handshake{/}\n{dim}Hello. — I hear you. — I hear you hear me. The helm sends it; the drive spools the trolley to line speed. When all three are heard, HOP runs you down the carrier to the next relay — leaving the fight and its rewards.{/}\nNeeds power in the Thrusters and someone at the Helm (autopilot from Helm 2, at half speed).", 300);
  }
  const ready = sim.hopReady();
  const bx = x + w + 4;
  if (ui.button("hop", bx, y + 6, 66, 32, "HOP", { variant: ready ? "blue" : "normal", disabled: !ready, hotkey: "KeyJ", tooltip: ready ? "Hop to the next relay now (J). You leave the fight." : "The handshake isn't complete yet." })) sim.hop();
  if (ready) g.alpha(0.3 + 0.2 * Math.sin(app.time * 4), () => g.box(bx - 1, y + 5, 68, 34, P.amber1));
}

function drawPausedFrame(g: Gfx) {
  g.alpha(0.75, () => {
    g.rect(0, 0, 960, 2, P.brass2);
    g.rect(0, 538, 960, 2, P.brass2);
    g.rect(0, 0, 2, 540, P.brass2);
    g.rect(958, 0, 2, 540, P.brass2);
  });
  const w = 150;
  g.panel(264 - w / 2, 50, w, 22, "panel");
  g.text("PAUSED", 264, 53, { font: "labelb", color: P.brass1, align: "center" });
  g.text("SPACE", 264 + w / 2 - 6, 56, { font: "small", color: C.textFaint, align: "right" });
}

// ─── enemy readout ──────────────────────────────────────────────────────────────────────────────────────────

export function drawEnemyHeader(g: Gfx, app: App, sim: Sim) {
  const ui = app.ui;
  const E = sim.ships[1];
  const A = ENEMY_AREA;
  const tx = enemyText(E.defId);
  const col = P.brass4;
  for (const [cx, cy, sx, sy] of [[A.x, A.y, 1, 1], [A.x + A.w - 1, A.y, -1, 1], [A.x, A.y + A.h - 1, 1, -1], [A.x + A.w - 1, A.y + A.h - 1, -1, -1]] as const) {
    g.rect(sx > 0 ? cx : cx - 11, cy, 12, 1, col);
    g.rect(cx, sy > 0 ? cy : cy - 11, 1, 12, col);
  }
  g.panel(A.x + 4, A.y + 2, A.w - 8, 38, "panel-dark");
  g.text(tx.name.toUpperCase(), A.x + 10, A.y + 5, { font: "labelb", color: E.dead ? C.textFaint : P.ember1 });
  if (tx.classLine) g.text(tx.classLine, A.x + 10, A.y + 17, { font: "small", color: C.textFaint });
  if (ui.hover(A.x + 4, A.y + 2, 160, 24)) {
    const e = E.enemy!;
    ui.setTooltip(`{title}${tx.name}{/}${tx.classLine ? `\n{dim}${tx.classLine}{/}` : ""}\n${e.mobility === "installation" ? "Installation: it cannot dodge." : e.mobility === "flier" ? "Flier: hard to hit." : "Crawler on its carrier."}${e.kind === "human" ? "\n{warn}A human crew: they may surrender.{/}" : ""}`, 260);
  }
  // Hull.
  const hx = A.x + 10;
  const hy = A.y + 29;
  const n = E.hullMax;
  const sw = Math.max(2, Math.min(4, Math.floor((A.w - 120) / n) - 1));
  for (let i = 0; i < n; i++) g.rect(hx + i * (sw + 1), hy, sw, 6, i < E.hull ? (E.hull / n > 0.33 ? P.verd2 : P.ember2) : P.ink3);
  g.text(`${Math.ceil(E.hull)}/${E.hullMax}`, hx + n * (sw + 1) + 5, hy - 2, { font: "small", color: C.text });
  if (ui.hover(hx, hy - 2, n * (sw + 1), 10)) ui.setTooltip(`{icon:res-hull-sm} Hull ${E.hull}/${E.hullMax}`);
  // Mesh pips, evasion.
  const rx = A.x + A.w - 12;
  const sm = shieldMax(E);
  for (let i = 0; i < sm; i++) {
    const lit = i < E.shields;
    const x = rx - 10 - i * 11;
    const extra = i >= Math.floor(effective(E.sys.shields) / 2);
    g.rect(x, A.y + 6, 9, 9, P.ink0);
    g.rect(x + 1, A.y + 7, 7, 7, lit ? (extra ? P.ember2 : P.teal2) : P.ink3);
  }
  g.text(`EVASION ${E.evasion}%`, rx, A.y + 18, { font: "small", color: C.textDim, align: "right" });
  if (ui.hover(rx - 100, A.y + 4, 102, 24)) ui.setTooltip(`{icon:sys-shields-powered-sm} Ward mesh ${E.shields}/${sm} layers${E.bonusLayers ? " (the shell adds one)" : ""}\n{icon:status-evasion-sm} Evasion ${E.evasion}%`, 240);
  // Guardian laws.
  const gate = E.boss.gate;
  const glass = E.boss.glass;
  const core = E.boss.core;
  let law = "";
  let lawTip = "";
  if (gate) {
    law = gate.up ? `GATE SEALED · ${new Set(gate.locks.filter((l) => sim.t - l.t <= 2.2).map((l) => l.source)).size}/2 routes` : `GATE OPEN ${Math.max(0, gate.downT).toFixed(0)}s`;
    lawTip = "{title}No passage without proof of a second way home{/}\nWhile sealed, the gate stops every hit. Land hits from {brass}two different weapons{/} (or a weapon and a drone) within two seconds and it opens for a while. The gate wardens mend the Regent and close the gate sooner.";
  } else if (glass) {
    law = glass.up ? `GLASS WHOLE · ${glass.hits.filter((h) => sim.t - h <= 1).length}/3 voices` : `GLASS BROKEN ${Math.max(0, glass.downT).toFixed(0)}s`;
    lawTip = "{title}Plurality breaks the glass{/}\nA single hit only rings a bell. {violet}Three hits landing within one second{/} — a volley of bolts, payloads, beam rooms — shatter it for a while.";
  } else if (core) {
    law = ["", "CUSTODY", "EMERGENCY", "EVENT HORIZON"][core.phase];
    lawTip = core.phase === 1 ? "{title}Custody{/}\nCut, breach, jam, strike, in rotation. Break a step's room to skip it." : core.phase === 2 ? "{title}Emergency{/}\nThe Core spends its reserve: two steps at a time, faster." : "{title}Event horizon{/}\nEvery light is pulled inward (−10% evasion). The sealing drones close the shell: +1 ward layer while any flies.";
  }
  if (law) {
    g.text(law, rx, A.y + 28, { font: "small", color: gate || glass ? P.brass1 : P.ember1, align: "right" });
    if (ui.hover(rx - 150, A.y + 26, 152, 11)) ui.setTooltip(lawTip, 290);
  }
  if (sim.setup.hazard) {
    const hz = hazardText(sim.setup.hazard);
    const hy2 = A.y + A.h - 40;
    icon(g, `hazard-${sim.setup.hazard}`, A.x + 16, hy2 + 5);
    g.text(hz.name.toUpperCase(), A.x + 28, hy2, { font: "small", color: P.amber2 });
    if (ui.hover(A.x + 6, hy2 - 4, 150, 16)) ui.setTooltip(`{title}${hz.name}{/}\n{dim}${hz.desc || ""}{/}`, 260);
  }
  drawEnemySystems(g, app, sim);
  if (E.fleeing) {
    g.text("RUNNING", A.x + 10, A.y + 42, { font: "small", color: C.warn });
    g.rect(A.x + 52, A.y + 44, 60, 3, P.ink3);
    g.rect(A.x + 52, A.y + 44, Math.round(60 * E.hop), 3, P.amber2);
  }
}

function drawEnemySystems(g: Gfx, app: App, sim: Sim) {
  const ui = app.ui;
  const E = sim.ships[1];
  const A = ENEMY_AREA;
  const showPower = sim.seeEnemyPower();
  const list = E.systems.filter((s) => s.id !== "artillery");
  let x = A.x + 10;
  const y = A.y + A.h - 24;
  g.panel(A.x + 4, y - 3, A.w - 8, 25, "panel-dark");
  for (const s of list) {
    drawSysIcon(g, s.id, sysState(s), x + 7, y + 9, true);
    for (let i = 0; i < s.level; i++) {
      const ok = i < s.level - s.damage;
      const powered = showPower && (isMain(s.id) ? i < effective(s) : i < usable(s));
      const ion = ok && s.ion > 0 && i >= s.level - s.damage - s.ion;
      g.rect(x + 16, y + 17 - i * 2, 4, 1, !ok ? P.ember2 : ion ? P.violet1 : powered ? P.teal2 : showPower ? P.steel0 : P.steel1);
    }
    if (ui.hover(x, y - 2, 22, 22)) ui.setTooltip(`${sysIcon(s.id, sysState(s))} {title}${systemName(s.id)}{/} · ${s.level - s.damage}/${s.level} working${s.ion ? ` · {ion}${s.ion} ionised{/}` : ""}${showPower ? ` · {teal}${effective(s)} powered{/}` : "\n{faint}Power readings need Listening Post 4.{/}"}`, 260);
    x += 24;
  }
  if (sim.seeEnemyCharge()) {
    let wx = A.x + A.w - 12;
    for (let i = E.weapons.length - 1; i >= 0; i--) {
      const w = E.weapons[i];
      const f = Math.min(1, w.charge / chargeTime(w));
      const live = w.art ? usable(w.art) > 0 && w.active : w.powered;
      g.rect(wx - 22, y + 4, 22, 5, P.ink0);
      g.rect(wx - 21, y + 5, Math.round(20 * f), 3, !live ? P.steel0 : f >= 1 ? P.ember1 : P.amber3);
      if (ui.hover(wx - 24, y, 26, 14)) ui.setTooltip(weaponTooltip(sim, w, 1), 280);
      wx -= 26;
    }
  } else if (ui.hover(A.x + A.w - 90, y, 86, 14)) ui.setTooltip("{faint}Enemy weapon charge needs Listening Post 3 (or the Wireshark Tap).{/}");
}

// ─── bottom bar: reactor, systems, weapons, drones ─────────────────────────────────────────────────────────

export interface BottomActions {
  weaponClick?: number;
  weaponRight?: number;
}

export function drawBottomBar(g: Gfx, app: App, sim: Sim, hs: HudState): BottomActions {
  const ui = app.ui;
  const P0 = sim.ships[0];
  const out: BottomActions = {};
  const y0 = HUD_Y;
  g.panel(2, y0, 956, 540 - y0 - 2, "panel");
  // Reactor: columns of bars (free power lit).
  const used = reactorUsed(P0);
  const free = P0.reactor - used;
  const rx = 10;
  const per = 12;
  const cols = Math.ceil(P0.reactor / per);
  for (let i = 0; i < P0.reactor; i++) {
    const c = Math.floor(i / per);
    const r = i % per;
    const lit = i < free;
    const x = rx + c * 11;
    const y = y0 + 80 - r * 6;
    g.rect(x, y, 9, 5, P.ink0);
    g.rect(x + 1, y + 1, 7, 3, lit ? P.teal2 : P.ink3);
    if (lit) g.hline(x + 1, y + 1, 7, P.teal1);
  }
  g.text(`${free}`, rx + (cols * 11) / 2 - 1, y0 + 6, { font: "small", color: free > 0 ? P.teal1 : C.textFaint, align: "center" });
  if (ui.hover(rx - 2, y0 + 4, cols * 11 + 4, 88)) ui.setTooltip(`{icon:sys-reactor-powered-sm} {title}Reactor{/} ${free} of ${P0.reactor} bars free\n{dim}Click a system to give it a bar, right-click to take one back. Upgrade the reactor at markets and benches.{/}`, 260);
  let x = rx + cols * 11 + 10;
  for (const id of MAIN_ORDER) {
    const s = P0.sys[id];
    if (!s) continue;
    drawSystemColumn(g, app, sim, s, x, y0, false);
    x += 26;
  }
  x += 3;
  g.vline(x - 3, y0 + 10, 80, P.brass5);
  for (const id of SUB_ORDER) {
    const s = P0.sys[id];
    if (!s) continue;
    drawSystemColumn(g, app, sim, s, x, y0, true);
    x += 24;
  }
  x += 6;
  const droneSlots = P0.sys.drones ? sim.droneSlots() : 0;
  const weaponSlots = sim.weaponSlots();
  const remaining = 806 - x;
  const droneBudget = droneSlots ? Math.min(202, Math.round(remaining * droneSlots * 0.68 / (weaponSlots + droneSlots * 0.68))) : 0;
  x = drawWeapons(g, app, sim, hs, x, y0, out, remaining - droneBudget - (droneSlots ? 6 : 0));
  if (droneSlots) drawDrones(g, app, sim, x + 6, y0, droneBudget);
  return out;
}

function drawSystemColumn(g: Gfx, app: App, sim: Sim, s: SimSystem, x: number, y0: number, sub: boolean) {
  const ui = app.ui;
  const input = app.input;
  const P0 = sim.ships[0];
  const eff = effective(s);
  const iy = y0 + 80;
  for (let i = 0; i < s.level; i++) {
    const by = iy - 12 - i * 6;
    const dmgFrom = s.level - s.damage;
    let c: string = P.ink3;
    let hi: string | null = null;
    if (i >= dmgFrom) c = P.ember2;
    else if (i >= dmgFrom - s.ion) c = P.violet1;
    else if (i < eff) {
      c = i >= s.power && s.bonus > 0 ? P.violet0 : P.teal2;
      hi = P.teal1;
    }
    g.rect(x, by, 16, 5, P.ink0);
    g.rect(x + 1, by + 1, 14, 3, c);
    if (hi && c === P.teal2) g.hline(x + 1, by + 1, 14, hi);
  }
  drawSysIcon(g, s.id, sysState(s), x + 8, iy + 3);
  const key = SYS_KEYS[s.id];
  if (key) g.text(keyLabel(key), x + 8, iy - 12 - s.level * 6 - 9, { font: "small", color: C.textFaint, align: "center" });
  const hot = ui.hover(x - 4, y0 + 4, 24, 92);
  if (hot) {
    const d = (SYSTEMS as Record<string, { levels: string[] }>)[s.id];
    const lvl = d?.levels?.[s.level] ? ` · ${d.levels[s.level]}` : "";
    const how = sub ? "{faint}Subsystem: runs on its own level, no reactor power.{/}" : `{faint}Click: +1 power${key ? ` (${keyLabel(key)})` : ""} · right-click: −1${key ? ` (Shift+${keyLabel(key)})` : ""}.{/}`;
    const dmg = s.damage ? `\n{bad}${s.damage} bar${s.damage > 1 ? "s" : ""} damaged{/} — send crew to its room.` : "";
    const ion = s.ion ? `\n{ion}Ionised: ${s.ion} bar${s.ion > 1 ? "s" : ""} locked for ${s.ionT.toFixed(0)} s.{/}` : "";
    const man = ["shields", "engines", "weapons", "helm", "sensors", "doors"].includes(s.id) ? manner(sim, P0, s.id) : null;
    const manned = man ? `\n{good}Manned by ${man.name}{/}` : "";
    ui.setTooltip(`${sysIcon(s.id, sysState(s))} {title}${systemName(s.id)}{/} · ${eff}/${s.level}${lvl}\n{dim}${systemDesc(s.id)}{/}${dmg}${ion}${manned}\n${how}`, 290);
    ui.cursor = sub ? "arrow" : "pointer";
    if (!sub && input.pressed(0)) {
      input.consume();
      if (s.id === "veil" && eff > 0 && s.power >= s.level - s.damage - s.ion) sim.activateVeil();
      else sim.addPower(s.id);
    }
    if (!sub && input.pressed(2)) {
      input.consume();
      sim.removePower(s.id);
    }
  }
  if (s.id === "veil") {
    const ready = eff > 0 && P0.veilT <= 0 && P0.veilCd <= 0;
    const lbl = P0.veilT > 0 ? `${P0.veilT.toFixed(0)}` : P0.veilCd > 0 ? `${P0.veilCd.toFixed(0)}` : "GO";
    if (ui.button("veil-go", x - 3, y0 + 4, 22, 13, "", { disabled: !ready, hotkey: "KeyC", tooltip: "{title}Lamp-Dark Veil{/} (C)\n{dim}Douse every lamp: +60% evasion and enemy weapons stop charging while it lasts, then it cools down.{/}", sound: "veil-on" })) sim.activateVeil();
    g.text(lbl, x + 8, y0 + 5, { font: "small", color: ready ? P.violet0 : C.textFaint, align: "center" });
  }
}

function weaponGlyph(g: Gfx, w: SimWeapon, x: number, y: number, width: number) {
  const { img, meta } = weaponArt(w.def.sprite);
  if (img && meta) {
    const scale = Math.min(width / meta.w, 26 / meta.h);
    g.ctx.drawImage(img, x + (width - meta.w * scale) / 2, y + (26 - meta.h * scale) / 2, meta.w * scale, meta.h * scale);
  }
}

function drawWeapons(g: Gfx, app: App, sim: Sim, hs: HudState, x0: number, y0: number, out: BottomActions, budget: number): number {
  const ui = app.ui;
  const input = app.input;
  const P0 = sim.ships[0];
  const ws = P0.sys.weapons;
  const slots = sim.weaponSlots();
  const cardW = Math.min(88, Math.floor((budget - 31) / slots) - 3);
  const w = 28 + slots * (cardW + 3) + 3;
  g.panel(x0, y0 + 4, w, 88, "panel-dark");
  if (ws) {
    const used = P0.weapons.filter((q) => q.powered).reduce((a, q) => a + q.def.power, 0);
    for (let i = 0; i < ws.level; i++) {
      const dmg = i >= ws.level - ws.damage;
      const ion = !dmg && i >= ws.level - ws.damage - ws.ion;
      const by = y0 + 80 - i * 6;
      g.rect(x0 + 7, by, 14, 5, P.ink0);
      g.rect(x0 + 8, by + 1, 12, 3, dmg ? P.ember2 : ion ? P.violet1 : i < used ? P.teal2 : P.ink3);
    }
    drawSysIcon(g, "weapons", sysState(ws), x0 + 14, y0 + 16, true);
    if (ui.hover(x0 + 4, y0 + 6, 22, 86)) ui.setTooltip(`${sysIcon("weapons", sysState(ws))} {title}Weapons Bay{/} · ${effective(ws)}/${ws.level} bars\n{dim}Each weapon needs its own bars. Click a card to power a weapon; right-click to power it down.{/}`, 260);
  }
  for (let i = 0; i < slots; i++) {
    const cx = x0 + 28 + i * (cardW + 3);
    const cy = y0 + 8;
    const wpn = P0.weapons.find((q) => q.slot === i);
    const sel = hs.weaponSel === i;
    g.panel(cx, cy, cardW, 80, sel ? "panel-hi" : "panel");
    if (!wpn) {
      g.text("empty", cx + cardW / 2, cy + 32, { font: "small", color: C.textFaint, align: "center" });
      continue;
    }
    const ct = chargeTime(wpn);
    const f = Math.min(1, wpn.charge / ct);
    const ready = wpn.powered && f >= 1;
    ui.keycap(`Digit${i + 1}`, cx + 5, cy + 5);
    g.text(weaponName(wpn.def.id), cx + 20, cy + 5, { font: "small", color: wpn.powered ? C.text : C.textFaint, width: cardW - 24, maxLines: 2 });
    g.alpha(wpn.powered ? 1 : 0.45, () => weaponGlyph(g, wpn, cx + 6, cy + 23, cardW - 22));
    // Power pips (right side).
    for (let k = 0; k < wpn.def.power; k++) g.rect(cx + cardW - 10, cy + 46 - k * 6, 5, 4, wpn.powered ? P.teal2 : P.ink3);
    // Charge bar.
    g.rect(cx + 5, cy + 52, cardW - 10, 8, P.ink0);
    const fw = Math.round((cardW - 12) * f);
    if (fw > 0) {
      g.rect(cx + 6, cy + 53, fw, 6, ready ? P.amber2 : wpn.powered ? P.teal3 : P.steel0);
      g.hline(cx + 6, cy + 53, fw, ready ? P.amber1 : P.teal2);
    }
    if (wpn.def.chain && wpn.chain > 0) g.text(`×${wpn.chain}`, cx + cardW - 16, cy + 22, { font: "small", color: P.amber1, align: "right" });
    const status = !wpn.powered ? "OFF" : wpn.target ? (ready ? "FIRING" : "TARGETED") : ready ? "READY" : `${Math.round(f * 100)}%`;
    g.text(status, cx + 6, cy + 63, { font: "small", color: wpn.target ? P.ember1 : ready ? P.amber1 : C.textFaint });
    if (wpn.def.ammo) g.text(`{icon:res-payloads-sm}${P0.payloads}`, cx + cardW - 5, cy + 63, { font: "small", color: P0.payloads >= wpn.def.ammo ? C.textDim : C.bad, align: "right" });
    if (sel) g.box(cx + 1, cy + 1, cardW - 2, 78, P.amber1);
    if (ready && !sel) g.alpha(0.25 + 0.15 * Math.sin(app.time * 5), () => g.box(cx + 2, cy + 2, cardW - 4, 76, P.amber2));
    if (ui.hover(cx, cy, cardW, 80)) {
      ui.setTooltip(weaponTooltip(sim, wpn, 0), 300);
      ui.cursor = "pointer";
      if (input.pressed(0)) {
        input.consume();
        out.weaponClick = i;
      }
      if (input.pressed(2)) {
        input.consume();
        out.weaponRight = i;
      }
    }
  }
  return x0 + w;
}

function drawDrones(g: Gfx, app: App, sim: Sim, x0: number, y0: number, budget: number): number {
  const ui = app.ui;
  const input = app.input;
  const P0 = sim.ships[0];
  const slots = sim.droneSlots();
  if (!slots) return x0;
  const cardW = Math.min(58, Math.floor((budget - 31) / slots) - 3);
  const w = 28 + slots * (cardW + 3) + 3;
  g.panel(x0, y0 + 4, w, 88, "panel-dark");
  const ds = P0.sys.drones;
  if (ds) {
    const used = P0.drones.filter((q) => q.powered).reduce((a, q) => a + q.def.power, 0);
    for (let i = 0; i < ds.level; i++) {
      const dmg = i >= ds.level - ds.damage;
      const by = y0 + 80 - i * 6;
      g.rect(x0 + 7, by, 14, 5, P.ink0);
      g.rect(x0 + 8, by + 1, 12, 3, dmg ? P.ember2 : i < used ? P.teal2 : P.ink3);
    }
    drawSysIcon(g, "drones", sysState(ds), x0 + 14, y0 + 16, true);
  } else {
    g.text("no bay", x0 + 14, y0 + 44, { font: "small", color: C.textFaint, align: "center" });
    if (ui.hover(x0, y0 + 4, 26, 88)) ui.setTooltip("{title}No Drone Bay{/}\n{dim}Couple a Drone Car or fit a Drone Bay module into a socket.{/}", 240);
  }
  for (let i = 0; i < slots; i++) {
    const cx = x0 + 28 + i * (cardW + 3);
    const cy = y0 + 8;
    const d = P0.drones.find((q) => q.slot === i);
    g.panel(cx, cy, cardW, 80, "panel");
    if (!d) {
      g.text("empty", cx + cardW / 2, cy + 32, { font: "small", color: C.textFaint, align: "center" });
      continue;
    }
    ui.keycap(`Digit${7 + i}`, cx + 5, cy + 5);
    g.text(droneName(d.def.id), cx + 5, cy + 18, { font: "small", color: d.powered ? C.text : C.textFaint, width: cardW - 10, maxLines: 2 });
    const icon = itemIcon("drone", d.def.id);
    const iconSize = Math.min(22, cardW - 18);
    if (icon) g.image(icon, cx + 4, cy + 35, iconSize / 32, d.powered ? 1 : 0.5);
    for (let k = 0; k < d.def.power; k++) g.rect(cx + cardW - 10, cy + 46 - k * 6, 5, 4, d.powered ? P.teal2 : P.ink3);
    const st = d.out ? "OUT" : d.powered ? "LAUNCH" : "OFF";
    g.text(st, cx + 5, cy + 63, { font: "small", color: d.out ? P.teal1 : C.textFaint });
    if (d.def.kind === "repair" && d.out) g.text(`${d.used}/${d.def.capacity}`, cx + cardW - 5, cy + 63, { font: "small", color: C.textDim, align: "right" });
    if (ui.hover(cx, cy, cardW, 80)) {
      ui.setTooltip(droneTooltip(d), 280);
      ui.cursor = "pointer";
      if (input.pressed(0)) {
        input.consume();
        sim.setDronePower(i, true);
      }
      if (input.pressed(2)) {
        input.consume();
        sim.setDronePower(i, false);
      }
    }
  }
  return x0 + w;
}

// ─── command buttons ────────────────────────────────────────────────────────────────────────────────────────

export function drawCommands(g: Gfx, app: App, sim: Sim, hs: HudState, x: number): void {
  const ui = app.ui;
  const y = HUD_Y + 4;
  const bw = 956 - x - 6;
  if (bw < 60) return;
  const bh = 15;
  let yy = y + 2;
  const btn = (id: string, lbl: string, key: string, tip: string, active = false) => {
    const r = ui.button(id, x, yy, bw, bh, lbl, { font: "small", hotkey: key === "KeyR" && (app.input.shift || app.input.keyShifted(key)) ? undefined : key, showKey: true, tooltip: tip, active });
    yy += bh + 2;
    return r;
  };
  if (btn("autofire", sim.autofire ? "AUTOFIRE ON" : "AUTOFIRE", "KeyV", "{title}Autofire{/} (V)\n{dim}Weapons keep firing at their target whenever they charge.{/}", sim.autofire)) sim.setAutofire(!sim.autofire);
  if (btn("doors-open", "OPEN DOORS", "KeyO", "{title}Open every door and airlock{/} (O)\n{dim}Vents air — and fires — into the thin outside.{/}")) sim.setAllDoors(true);
  if (btn("doors-close", "CLOSE DOORS", "KeyL", "{title}Close every door{/} (L)\n{dim}Your crew still pass; boarders must cut through.{/}")) sim.setAllDoors(false);
  if (btn("stations", "STATIONS", "KeyR", "{title}Return to stations{/} (R)\n{dim}Shift+R saves where everyone stands now.{/}")) sim.returnToStations();
  if (btn("pause", hs.paused ? "RESUME" : "PAUSE", "Space", "{title}Pause{/} (Space)\n{dim}Orders can be given while paused. Wheel zooms a view, Z resets.{/}", hs.paused)) hs.paused = !hs.paused;
}

// ─── crew list ──────────────────────────────────────────────────────────────────────────────────────────────

export function drawCrewList(g: Gfx, app: App, sim: Sim, hs: HudState, x: number, y: number): number | null {
  const ui = app.ui;
  const input = app.input;
  let clicked: number | null = null;
  const crew = sim.playerCrew();
  const rowH = crewRowH(crew.length);
  crew.forEach((c, i) => {
    const cx = x + (i % 2) * 184;
    const ry = y + Math.floor(i / 2) * (rowH + 2);
    const sel = hs.selected.has(c.uid);
    g.panel(cx, ry, 180, rowH, c.dead ? "panel-dark" : sel ? "panel-hi" : "panel-dark");
    // Portrait bust.
    if (!g.sprite("crew", `${c.species}-portrait`, cx + 11, ry + 10, { alpha: c.dead ? 0.35 : 1 })) {
      g.clip(cx + 2, ry + 2, 18, rowH - 4, () => {
        if (!g.anim("crew", `${c.species}-idle-right`, app.time, cx + 11, ry + rowH + 8)) g.rect(cx + 7, ry + 5, 8, 8, c.dead ? P.ink4 : P.ivory2);
      });
    }
    g.text(c.name, cx + 24, ry + 1, { font: "small", color: c.dead ? C.textFaint : sel ? P.ivory0 : C.text });
    if (c.dead) {
      g.text("lost", cx + 174, ry + 1, { font: "small", color: C.bad, align: "right" });
      return;
    }
    const f = c.hp / c.maxHp;
    g.rect(cx + 24, ry + 12, 64, 4, P.ink0);
    g.rect(cx + 25, ry + 13, Math.max(1, Math.round(62 * f)), 2, f > 0.6 ? P.verd1 : f > 0.3 ? P.amber2 : P.ember2);
    let sx = cx + 92;
    for (const sk of SKILL_IDS) {
      const lv = skillLevel(c.xp, sk);
      g.rect(sx, ry + 12, 4, 4, P.ink0);
      g.rect(sx + 1, ry + 13, 2, 2, lv === 2 ? P.amber1 : lv === 1 ? P.teal2 : P.ink3);
      sx += 6;
    }
    const task = c.task === "man" ? "station" : c.task === "repair" ? "repair" : c.task === "fire" ? "fire" : c.task === "breach" ? "breach" : c.task === "fight" ? "fight" : c.path.length ? "moving" : "";
    if (task) g.text(task, cx + 174, ry + 1, { font: "small", color: c.task === "fight" ? C.bad : C.textFaint, align: "right" });
    ui.keycap(`F${i + 1}`, cx + 176 - 22, ry + 9);
    if (ui.hover(cx, ry, 180, rowH)) {
      ui.setTooltip(crewTooltip(sim, c) + `\n{faint}Click to select (Shift adds), F${i + 1}.{/}`, 290);
      ui.cursor = "pointer";
      hs.hoverCrew = c.uid;
      if (input.pressed(0)) {
        input.consume();
        clicked = c.uid;
      }
    }
  });
  void SKILL_NAMES;
  void speciesName;
  return clicked;
}
