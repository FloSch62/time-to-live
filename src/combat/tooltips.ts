// Rich tooltips (★v4): rooms, crew, doors, weapons, drones — with markup colours and inline icons.
import { SPECIES, SKILL_IDS, SKILL_NAMES, skillLevel } from "../data/species";
import { TUNING } from "../data/systems";
import type { Sim } from "./sim/sim";
import type { SimCrew, SimShip, SimDoor, SimWeapon, SimDrone } from "./sim/model";
import { effective, usable, isMain, manner } from "./sim/power";
import { chargeTime } from "./sim/weapons";
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
  return n === 2 ? "{amber}●●{/}" : n === 1 ? "{teal}●{/}{faint}●{/}" : "{faint}●●{/}";
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
  const r = ship.rooms[ri];
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

export function weaponTooltip(sim: Sim, w: SimWeapon, side: 0 | 1): string {
  const d = w.def;
  const ct = chargeTime(w);
  const f = Math.min(1, w.charge / ct);
  const parts: string[] = [];
  if (d.type === "beam") parts.push(`${d.damage}/room${d.ion ? ` + ${d.ion} ion` : ""}, length ${d.beamLength?.toFixed(1)}`);
  else if (d.type === "ion") parts.push(`${d.ion} ion × ${d.shots}`);
  else parts.push(`${d.damage} dmg × ${d.shots}${d.ion ? ` + ${d.ion} ion` : ""}`);
  const extra: string[] = [];
  if (d.fireChance >= 0.2) extra.push(`fire ${Math.round(d.fireChance * 100)}%`);
  if (d.breachChance >= 0.2) extra.push(`breach ${Math.round(d.breachChance * 100)}%`);
  if (d.type === "payload") extra.push("ignores the ward mesh");
  if (d.ammo) extra.push(`uses ${d.ammo} payload`);
  if (d.chain) extra.push(`chain ×${w.chain} (−${d.chain.step} s per volley)`);
  let s = `{title}${weaponName(d.id)}{/} · {dim}${d.type}{/}\n${parts.join(" · ")} · ${d.power} power · ${ct.toFixed(1)} s`;
  if (extra.length) s += `\n{dim}${extra.join(" · ")}{/}`;
  const live = w.art ? usable(w.art) > 0 : w.powered;
  s += `\n${live ? `charge {${f >= 1 ? "warn" : "teal"}}${Math.round(f * 100)}%{/}` : "{faint}unpowered{/}"}`;
  if (w.target) {
    const T = sim.ships[side === 0 ? 1 : 0];
    const t = w.target;
    const where = t.kind === "room" ? (T.rooms[t.room].sys ? systemName(T.rooms[t.room].sys!.id) : T.rooms[t.room].name) : t.kind === "adj" ? T.adjuncts[t.i]?.kind.replace("-", " ") : "beam line";
    s += ` · target {bad}${where}{/}`;
  }
  const desc = weaponDesc(d.id);
  if (desc) s += `\n{dim}${desc}{/}`;
  if (side === 0) s += `\n{faint}${d.type === "beam" ? "Select, then press on an enemy room and drag the cut." : "Select, then click an enemy room."} Right-click: ${w.target ? "clear target" : "power down"}.{/}`;
  return s;
}

export function droneTooltip(d: SimDrone): string {
  const st = d.out ? "{teal}flying{/}" : d.powered ? "launching" : "{faint}unpowered{/}";
  return `{title}${droneName(d.def.id)}{/} · ${d.def.power} power · ${st}\n{dim}${d.def.desc}{/}\n{faint}Click: power and launch (spends a spare) · right-click: recall.{/}`;
}

export function shipTooltip(ship: SimShip): string {
  return `${ship.name}`;
}
