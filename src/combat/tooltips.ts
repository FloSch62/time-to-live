// Rich tooltips (★v4): rooms, crew, doors, weapons, drones — with markup colours and inline icons.
import { SPECIES, SKILL_IDS, SKILL_NAMES, skillLevel } from "../data/species";
import { TUNING } from "../data/systems";
import type { Sim } from "./sim/sim";
import type { SimCrew, SimShip, SimDoor, SimWeapon, SimDrone } from "./sim/model";
import { effective, usable, isMain, manner } from "./sim/power";
import { chargeTime, chargeRate } from "./sim/weapons";
import { WEAPON_AIM } from "./sim/ai";
import { difficultyRules } from "../data/difficulty";
import { roomFires, roomBreaches } from "./sim/env";
import { speciesName, systemName, systemDesc, weaponName, weaponDesc, droneName } from "./assets";
import { sysState } from "./draw-ship";

const SPECIAL_ICON: Record<string, string> = { gate: "doors", bells: "shields", heart: "reactor", brood: "drones", artillery: "weapons" };

export function sysIcon(id: string, state: string): string {
  return `{icon:sys-${SPECIAL_ICON[id] ?? id}-${state}-sm}`;
}

const TASKS: Record<string, string> = {
  idle: "standing by", walk: "moving", man: "at the station", repair: "repairing", fire: "fighting a fire",
  breach: "patching a breach", fight: "fighting", sabotage: "sabotaging", door: "breaking a door", cut: "cutting the hull",
};

function pips(n: number): string {
  return n === 2 ? "{amber}••{/}" : n === 1 ? "{teal}•{/}{faint}•{/}" : "{faint}••{/}";
}

export function crewTooltip(sim: Sim, c: SimCrew): string {
  const ship = sim.ships[c.ship];
  const room = ship.rooms[ship.tileRoom[c.tile]];
  const f = c.hp / c.maxHp;
  const hc = f > 0.6 ? "good" : f > 0.3 ? "warn" : "bad";
  const who = c.side === 0 ? "" : c.kind === "boarder" ? " {bad}(boarder){/}" : c.kind === "escort" ? " {faint}(escort automaton){/}" : c.kind === "crawler" ? " {teal}(your crawler){/}" : " {bad}(enemy crew){/}";
  let s = `{title}${c.name}{/}${who}\n${speciesName(c.species)} · {${hc}}${Math.ceil(c.hp)}/${c.maxHp}{/} HP`;
  if (c.kind === "crew") {
    const trait = SPECIES[c.species as keyof typeof SPECIES]?.special;
    if (trait) s += `\n{dim}${trait}{/}`;
    s += "\n" + SKILL_IDS.map((k) => `${SKILL_NAMES[k]} ${pips(skillLevel(c.xp, k))}`).join("  ");
  }
  s += `\n{dim}${TASKS[c.task] ?? c.task}${room ? ` · ${room.sys ? systemName(room.sys.id) : room.name}` : ""}{/}`;
  if (c.side === 0 && c.kind === "crew") s += "\n{faint}Right-click a room to send selected crew.{/}";
  return s;
}

export function roomTooltip(sim: Sim, side: 0 | 1, ri: number): string {
  const ship = sim.ships[side];
  const r = ship?.rooms[ri];
  if (!r) return "";
  const sens = side === 0 ? Math.max(1, sim.sensorLevel(0)) : sim.sensorLevel(0);
  const interior = side === 0 || sens >= 2;
  const lines: string[] = [];
  if (r.sys) {
    const s = r.sys;
    const st = sysState(s);
    const eff = effective(s);
    const showPower = side === 0 || sim.seeEnemyPower();
    let head = `${sysIcon(s.id, st)} {title}${systemName(s.id)}{/} · level ${s.level}`;
    if (showPower) head += isMain(s.id) ? ` · {teal}${eff}{/} power` : ` · {teal}${usable(s)}{/} running`;
    lines.push(head);
    const d: string[] = [];
    if (s.damage) d.push(`{bad}${s.damage} damaged{/}`);
    if (s.ion) d.push(`{ion}${s.ion} ionised (${s.ionT.toFixed(0)} s){/}`);
    if (s.repair > 0 && s.damage) d.push(`{warn}repairing ${Math.round(s.repair * 100)}%{/}`);
    if (d.length) lines.push(d.join(" · "));
    if (side === 0) {
      const m = manner(sim, ship, s.id);
      if (ship.rooms[ri].station >= 0) lines.push(m ? `{good}Manned by ${m.name}{/}` : "{faint}Station unmanned{/}");
      lines.push(`{dim}${systemDesc(s.id)}{/}`);
    }
    if (s.id === "drones" && ship.drones.length) {
      lines.push(ship.drones.map((d) => `${droneName(d.def.id)}: ${d.out ? "{teal}deployed{/}" : d.powered ? side === 0 && !sim.t ? "{good}armed{/}" : "{warn}launching{/}" : "{faint}docked{/}"}`).join("\n"));
    }
  } else lines.push(`{title}${r.name || "Room"}{/}${r.module ? ` · module: {brass}${r.module}{/}` : ""}`);
  if (interior) {
    const env: string[] = [];
    const o2c = r.o2 < TUNING.suffocateAt ? "bad" : r.o2 < 40 ? "warn" : "good";
    env.push(`{icon:status-low-air-sm} air {${o2c}}${Math.round(r.o2)}%{/}`);
    const fires = roomFires(ship, ri);
    const br = roomBreaches(ship, ri);
    if (fires) env.push(`{icon:status-fire-sm} {bad}fire ×${fires}{/}`);
    if (br) env.push(`{icon:status-breach-sm} {bad}breach ×${br}{/}`);
    lines.push(env.join("  "));
    const crew = sim.crew.filter((c) => !c.dead && c.ship === side && ship.tileRoom[c.tile] === ri);
    if (crew.length) lines.push(`Inside: ${crew.map((c) => (c.side === 0 ? `{teal}${c.name}{/}` : `{bad}${c.kind === "escort" ? "escort" : c.name}{/}`)).join(", ")}`);
  } else lines.push("{faint}Interior unseen (Listening Post 2).{/}");
  if (side === 1) lines.push("{faint}Select a weapon, then click to target.{/}");
  return lines.join("\n");
}

export function doorTooltip(sim: Sim, d: SimDoor): string {
  const kind = d.airlock ? "Airlock" : d.gangway ? (d.hatch ? "Keel hatch" : "Gangway") : d.hatch ? "Hatch" : "Door";
  const state = d.broken > 0 ? "{bad}broken open{/}" : d.open ? "{warn}open{/}" : "closed";
  const ship = sim.ships[0];
  const lv = effective(ship.sys.doors);
  let s = `{title}${kind}{/} · ${state}\nStrength ${Math.round(d.hp)} (Bulkheads ${lv}).`;
  if (d.airlock) s += "\n{warn}Opening it vents the room into the thin outside (puts out fires).{/}";
  s += sim.canUseDoors() ? `\n{faint}Click to ${d.open ? "close" : "open"}.{/}` : "\n{bad}Bulkheads are down: doors can't be worked.{/}";
  return s;
}

const TYPE_WORD: Record<string, string> = {
  laser: "emitter", ion: "jammer", beam: "lance", payload: "payload launcher", flak: "scatter gun",
};

/** Plain damage wording for one volley. */
function volleyWords(d: SimWeapon["def"]): string {
  if (d.type === "beam") return `beam: ${d.damage} damage to each room crossed${d.ion ? ` + ${d.ion} ion` : ""}`;
  if (d.type === "ion") return `${d.shots} × ion ${d.ion ?? 1}`;
  if (d.type === "payload") return `${d.shots > 1 ? `${d.shots} × ` : ""}${d.damage} damage`;
  if (d.type === "flak") return `${d.shots} pellets × ${d.damage} damage`;
  return `${d.shots} × ${d.damage} damage${d.ion ? ` + ${d.ion} ion` : ""}`;
}

/** Short stat lines for a weapon card (wide cards show them beside the art). */
export function weaponStatLines(sim: Sim, w: SimWeapon, side: 0 | 1): string[] {
  const d = w.def;
  const rate = chargeRate(sim, sim.ships[side]);
  const first = d.type === "beam" ? `beam ${d.damage}/room${d.ion ? ` +${d.ion} ion` : ""}` : d.type === "ion" ? `ion ${d.ion} × ${d.shots}` : `${d.shots} × ${d.damage} dmg${d.ion ? ` +${d.ion} ion` : ""}`;
  const extra = d.type === "payload" ? "skips ward mesh" : d.fireChance >= 0.2 ? `fire ${Math.round(d.fireChance * 100)}%` : d.breachChance >= 0.2 ? `breach ${Math.round(d.breachChance * 100)}%` : TYPE_WORD[d.type] ?? d.type;
  return [first, `${(chargeTime(w) / rate).toFixed(1)} s charge`, extra];
}

/** Weapon tooltip: what it does in plain words, numbers, and its state right now. Used by the ship bar cards,
 *  the enemy header and the mounts on both hulls. */
export function weaponTooltip(sim: Sim, w: SimWeapon, side: 0 | 1, mode: "combat" | "plan" = "combat", where?: string): string {
  const d = w.def;
  const ship = sim.ships[side];
  const ct = chargeTime(w);
  const rate = chargeRate(sim, ship);
  const f = Math.min(1, w.charge / ct);
  const name = weaponName(d.id);
  const word = TYPE_WORD[d.type] ?? d.type;
  const kind = name.toLowerCase().includes(word.split(" ")[0]) ? "" : word;
  let s = `{title}${name}{/}${kind || where ? ` · {dim}${[kind, where].filter(Boolean).join(" · ")}{/}` : ""}`;
  const desc = weaponDesc(d.id);
  if (desc) s += `\n{dim}${desc}{/}`;
  s += `\n${volleyWords(d)} · ${(ct / rate).toFixed(1)} s charge · {teal}${d.power} power{/}`;
  const aim = WEAPON_AIM[d.id];
  if (aim) s += `\n{warn}Aims at your ${aim.map((id) => systemName(id)).join(", then your ")}, then anywhere.{/}`;
  const extra: string[] = [];
  if (d.fireChance >= 0.1) extra.push(`fire ${Math.round(d.fireChance * 100)}%`);
  if (d.breachChance >= 0.1) extra.push(`breach ${Math.round(d.breachChance * 100)}%`);
  if (d.ammo && side === 0) extra.push(`${ship.payloads} payload${ship.payloads === 1 ? "" : "s"} left`);
  if (d.chain) extra.push(`each volley in a row charges ${d.chain.step} s faster (now ×${w.chain})`);
  if (side === 1 && difficultyRules(sim.setup.difficulty).enemyDamage !== 1) extra.push(`${Math.round(difficultyRules(sim.setup.difficulty).enemyDamage * 100)}% hull and crew impact on this difficulty`);
  if (side === 0 && ship.mods.weaponCharge) extra.push(`Armory car: +${Math.round(ship.mods.weaponCharge * 100)}% charge rate`);
  if (extra.length) s += `\n{dim}${extra.join(" · ")}{/}`;
  // State.
  const bay = w.art ?? ship.sys.weapons;
  const live = w.art ? usable(w.art) > 0 && w.active : w.powered;
  const bayHurt = bay && bay.damage > 0 ? ` {bad}${w.art ? systemName(w.art.id) : "Weapons Bay"} damaged ${bay.damage}/${bay.level}{/}` : "";
  const wbay = side === 0 ? ship.sys.weapons : null;
  const busy = side === 0 && !w.powered ? ship.weapons.filter((q) => q.powered && !q.art).reduce((n, q) => n + q.def.power, 0) : 0;
  const bayFull = side === 0 && !w.powered && (!wbay || busy + d.power > usable(wbay));
  if (bayFull) {
    const bars = wbay ? usable(wbay) : 0;
    const more = Math.max(1, busy + d.power - bars);
    s += `\n{warn}Needs ${more === 1 ? "one more Weapons Bay bar" : `${more} more Weapons Bay bars`}:{/} the bay's ${bars} bar${bars === 1 ? " is" : "s are"} in use. Upgrade the Weapons Bay on the Tender screen, or power another weapon down.`;
  }
  if (mode === "plan") {
    if (!bayFull || w.powered) s += `\n${w.powered ? "{good}Powered:{/} charges from the first moment of the next fight." : w.want ? "{bad}No free power:{/} free reactor bars first." : "{faint}Off:{/} power it to enter the next fight charging."}`;
    s += bayHurt;
  } else if (side === 1 && !sim.seeEnemyCharge()) {
    s += `\n{faint}Charge unseen: needs Listening Post 3.{/}${bayHurt}`;
  } else {
    const secs = Math.max(0, (ct - w.charge) / Math.max(0.01, rate));
    s += `\n${!live ? "{faint}Unpowered.{/}" : f >= 1 ? "{warn}Charged and ready to fire.{/}" : `Charging {teal}${Math.round(f * 100)}%{/} · ready in ${secs.toFixed(1)} s`}${bayHurt}`;
  }
  if (w.target && mode === "combat" && (side === 0 || sim.seeEnemyCharge())) {
    const T = sim.ships[side === 0 ? 1 : 0];
    const t = w.target;
    const tr = t.kind === "room" ? T.rooms[t.room] : undefined;
    const at = tr ? (tr.sys ? systemName(tr.sys.id) : tr.name) : t.kind === "adj" ? T.adjuncts[t.i]?.kind.replace("-", " ") ?? "drone" : "beam line";
    s += side === 0 ? ` · aimed at {bad}${at}{/}` : ` · aimed at your {bad}${at}{/}`;
  }
  if (side === 0 && !where) s += mode === "plan"
    ? "\n{faint}Click: power on/off. Drag onto another card to swap mounts.{/}"
    : `\n{faint}${d.type === "beam" ? "Select, then press on an enemy room and drag the cut." : "Select, then click an enemy room."} Right-click: ${w.target ? "clear target" : "power down"}.{/}`;
  return s;
}

const DRONE_ROLE: Record<string, string> = {
  defence: "Stays by your tender.", combat: "Flies across to the enemy.", repair: "Works on your own hull.",
  anti: "Flies across and hunts enemy drones.", boarding: "Crosses and bores into the enemy car.",
};

/** Drone tooltip: role, numbers and where it is (docked, launching, deployed). */
export function droneTooltip(sim: Sim, d: SimDrone, mode: "combat" | "plan" = "combat"): string {
  const own = d.side === 0;
  let s = `{title}${droneName(d.def.id)}{/} · {dim}${d.def.kind} drone{/}\n{dim}${d.def.desc}{/}\n${DRONE_ROLE[d.def.kind] ?? ""} {teal}${d.def.power} power{/}${d.def.cooldown ? ` · acts every ${d.def.cooldown.toFixed(1)} s` : ""}${d.def.capacity && d.def.kind === "repair" ? ` · ${d.def.capacity} patches` : ""}`;
  if (mode === "plan") s += `\n${d.powered ? "{good}Armed:{/} launches as the next fight starts (spends one spare)." : d.want ? "{bad}Armed but no free power.{/}" : "{faint}Docked.{/} Arm it to launch at the start of the next fight."}`;
  else {
    const state = d.out ? `{teal}Deployed{/} · ${d.at === d.side ? "by its own car" : "at the other car"}` : d.powered ? "{warn}Launching{/}" : "{faint}Docked, unpowered{/}";
    s += `\n${state}${d.stun > 0 ? " · {ion}stunned{/}" : ""}${d.out && d.def.kind === "repair" ? ` · ${d.used}/${d.def.capacity} used` : ""}`;
  }
  if (own) s += mode === "plan" ? "\n{faint}Click: arm or disarm.{/}" : `\n{faint}Click: power and launch (one spare; ${sim.ships[0].spares} left) · right-click: recall.{/}`;
  return s;
}

export function shipTooltip(ship: SimShip): string {
  return `${ship.name}`;
}
