// Power, ion, shields, evasion, veil and hop drive (FTL rules).
import type { SysKey } from "../../data/layouts.ts";
import { SYSTEMS, TUNING } from "../../data/systems.ts";
import { MAN_BONUS, skillLevel } from "../../data/species.ts";
import type { SimCrew, SimShip, SimSystem } from "./model.ts";
import type { Sim } from "./sim.ts";

/** Main systems draw reactor power; subsystems and machine specials are powered by their own level. */
export const MAIN: SysKey[] = ["shields", "engines", "weapons", "air", "medbay", "drones", "veil"];

export function isMain(id: SysKey): boolean {
  return MAIN.includes(id);
}

/** Bars that can hold power: level − damage − ion. */
export function usable(s: SimSystem | undefined | null): number {
  if (!s) return 0;
  return Math.max(0, s.level - s.damage - s.ion);
}

/** Effective power the system is running at. */
export function effective(s: SimSystem | undefined | null): number {
  if (!s) return 0;
  if (!isMain(s.id)) return usable(s);
  return Math.min(usable(s), s.power + s.bonus);
}

export function reactorUsed(ship: SimShip): number {
  let n = 0;
  for (const s of ship.systems) if (isMain(s.id)) n += Math.max(0, s.power);
  return n;
}

export function reactorFree(ship: SimShip): number {
  return ship.reactor - reactorUsed(ship);
}

/** Recompute weapons/drones system power from what is powered. Reactor draw = total − free (bellmaker) power. */
export function syncBayPower(ship: SimShip) {
  const w = ship.sys.weapons;
  if (w) {
    let sum = 0;
    for (const x of ship.weapons) if (x.powered && !x.art) sum += x.def.power;
    w.power = Math.max(0, sum - w.bonus);
  }
  const d = ship.sys.drones;
  if (d) {
    let sum = 0;
    for (const x of ship.drones) if (x.powered) sum += x.def.power;
    d.power = Math.max(0, sum - d.bonus);
  }
}

function bayLoad(ship: SimShip, id: "weapons" | "drones"): number {
  let sum = 0;
  if (id === "weapons") {
    for (const x of ship.weapons) if (x.powered && !x.art) sum += x.def.power;
  } else {
    for (const x of ship.drones) if (x.powered) sum += x.def.power;
  }
  return sum;
}

/** Enforce limits after damage/ion/bonus changes: return power to the reactor, depower last weapons/drones. */
export function clampPower(sim: Sim, ship: SimShip) {
  for (const s of ship.systems) {
    if (!isMain(s.id)) continue;
    const cap = usable(s);
    if (s.id === "weapons") {
      let load = bayLoad(ship, "weapons");
      for (let i = ship.weapons.length - 1; i >= 0 && load > cap; i--) {
        const w = ship.weapons[i];
        if (w.powered && !w.art) {
          w.powered = false;
          load -= w.def.power;
        }
      }
    } else if (s.id === "drones") {
      let load = bayLoad(ship, "drones");
      for (let i = ship.drones.length - 1; i >= 0 && load > cap; i--) {
        const d = ship.drones[i];
        if (d.powered) {
          d.powered = false;
          load -= d.def.power;
          sim.droneDepowered(ship, d);
        }
      }
    } else if (s.power + s.bonus > cap) {
      s.power = Math.max(0, cap - s.bonus);
    }
  }
  syncBayPower(ship);
  // Reactor over-commitment (e.g. rust squall): shed from the lowest priority systems.
  let over = reactorUsed(ship) - ship.reactor;
  const order: SysKey[] = ["veil", "drones", "medbay", "air", "engines", "weapons", "shields"];
  for (const id of order) {
    if (over <= 0) break;
    const s = ship.sys[id];
    if (!s) continue;
    if (id === "weapons" || id === "drones") {
      const list = id === "weapons" ? ship.weapons : ship.drones;
      for (let i = list.length - 1; i >= 0 && over > 0; i--) {
        const x = list[i];
        if (x.powered && !("art" in x && x.art)) {
          x.powered = false;
          over -= x.def.power;
          if (id === "drones") sim.droneDepowered(ship, x as never);
        }
      }
      syncBayPower(ship);
    } else {
      const cut = Math.min(s.power, over);
      s.power -= cut;
      over -= cut;
    }
  }
}

/** FTL: power comes back on its own after repair or ion if the reactor has room. */
export function autoRestore(sim: Sim, ship: SimShip) {
  for (const s of ship.systems) {
    if (!isMain(s.id) || s.id === "weapons" || s.id === "drones") continue;
    while (s.want > s.power && s.power + s.bonus < usable(s) && reactorFree(ship) > 0) s.power++;
  }
  const ws = ship.sys.weapons;
  if (ws) {
    for (const w of ship.weapons) {
      if (!w.want || w.powered || w.art) continue;
      if (bayLoad(ship, "weapons") + w.def.power > usable(ws)) continue;
      w.powered = true;
      syncBayPower(ship);
      if (reactorUsed(ship) > ship.reactor) {
        w.powered = false;
        syncBayPower(ship);
      }
    }
  }
  const ds = ship.sys.drones;
  if (ds) {
    for (const d of ship.drones) {
      if (!d.want || d.powered) continue;
      if (bayLoad(ship, "drones") + d.def.power <= usable(ds)) {
        d.powered = true;
        syncBayPower(ship);
        if (reactorUsed(ship) > ship.reactor) {
          d.powered = false;
          syncBayPower(ship);
        }
      }
    }
  }
}

/** Try to power a weapon (player click). */
export function powerWeapon(sim: Sim, ship: SimShip, i: number): boolean {
  const w = ship.weapons[i];
  const ws = ship.sys.weapons;
  if (!w || w.powered || !ws) return false;
  if (bayLoad(ship, "weapons") + w.def.power > usable(ws)) return false;
  w.powered = true;
  syncBayPower(ship);
  if (reactorUsed(ship) > ship.reactor) {
    w.powered = false;
    syncBayPower(ship);
    return false;
  }
  w.want = true;
  return true;
}

export function unpowerWeapon(ship: SimShip, i: number): boolean {
  const w = ship.weapons[i];
  if (!w || !w.powered) {
    if (w) w.want = false;
    return false;
  }
  w.powered = false;
  w.want = false;
  syncBayPower(ship);
  return true;
}

export function powerDrone(ship: SimShip, i: number): boolean {
  const d = ship.drones[i];
  const ds = ship.sys.drones;
  if (!d || d.powered || !ds) return false;
  if (bayLoad(ship, "drones") + d.def.power > usable(ds)) return false;
  d.powered = true;
  syncBayPower(ship);
  if (reactorUsed(ship) > ship.reactor) {
    d.powered = false;
    syncBayPower(ship);
    return false;
  }
  d.want = true;
  return true;
}

/** Add one bar to a main system. */
export function addPower(ship: SimShip, id: SysKey): boolean {
  const s = ship.sys[id];
  if (!s || !isMain(id)) return false;
  if (id === "weapons") {
    for (let i = 0; i < ship.weapons.length; i++) if (!ship.weapons[i].powered && powerWeaponNoSim(ship, i)) return true;
    return false;
  }
  if (id === "drones") {
    for (let i = 0; i < ship.drones.length; i++) if (!ship.drones[i].powered && powerDrone(ship, i)) return true;
    return false;
  }
  if (s.power + s.bonus >= usable(s) || reactorFree(ship) <= 0) return false;
  s.power++;
  s.want = s.power;
  return true;
}

function powerWeaponNoSim(ship: SimShip, i: number): boolean {
  const w = ship.weapons[i];
  const ws = ship.sys.weapons;
  if (!w || w.powered || !ws || w.art) return false;
  if (bayLoad(ship, "weapons") + w.def.power > usable(ws)) return false;
  w.powered = true;
  syncBayPower(ship);
  if (reactorUsed(ship) > ship.reactor) {
    w.powered = false;
    syncBayPower(ship);
    return false;
  }
  w.want = true;
  return true;
}

export function removePower(ship: SimShip, id: SysKey): boolean {
  const s = ship.sys[id];
  if (!s || !isMain(id)) return false;
  if (id === "weapons") {
    for (let i = ship.weapons.length - 1; i >= 0; i--) if (ship.weapons[i].powered) return unpowerWeapon(ship, i);
    return false;
  }
  if (id === "drones") {
    for (let i = ship.drones.length - 1; i >= 0; i--) {
      const d = ship.drones[i];
      if (d.powered) {
        d.powered = false;
        d.want = false;
        syncBayPower(ship);
        return true;
      }
    }
    return false;
  }
  if (s.power <= 0) return false;
  s.power--;
  s.want = s.power;
  return true;
}

/** Ion: lock bars, strip power. */
export function applyIon(sim: Sim, ship: SimShip, s: SimSystem, n: number) {
  if (n <= 0) return;
  s.ion = Math.min(s.level, s.ion + n);
  s.ionT = TUNING.ionLock;
  clampPower(sim, ship);
  if (s.id === "shields") ship.shields = Math.min(ship.shields, shieldMax(ship));
  if (s.id === "veil" && usable(s) <= 0) ship.veilT = Math.min(ship.veilT, 0);
}

export function damageSystem(sim: Sim, ship: SimShip, s: SimSystem, n: number) {
  if (n <= 0) return;
  s.damage = Math.min(s.level, s.damage + n);
  s.repair = 0;
  clampPower(sim, ship);
  if (s.id === "shields") ship.shields = Math.min(ship.shields, shieldMax(ship));
}

export function shieldMax(ship: SimShip): number {
  return Math.floor(effective(ship.sys.shields) / 2) + ship.bonusLayers;
}

/** The crew member manning a system's station, if any. */
export function manner(sim: Sim, ship: SimShip, id: SysKey): SimCrew | null {
  const s = ship.sys[id];
  if (!s) return null;
  const room = ship.rooms[s.room];
  if (room.station < 0) return null;
  for (const c of sim.crew) {
    if (c.dead || c.ship !== ship.side || c.side !== ship.side || c.kind === "boarder") continue;
    if (c.task === "man" && c.tile === room.station) return c;
  }
  return null;
}

/** Engine evasion by mobility class (★v2). */
const MOBILITY_MUL = { player: 1, crawler: 0.8, installation: 0, flier: 1.3 };

export function computeEvasion(sim: Sim, ship: SimShip): number {
  const engines = effective(ship.sys.engines);
  const helm = ship.sys.helm;
  let ev = 0;
  const mobMul = MOBILITY_MUL[ship.mobility];
  if (mobMul > 0 && engines > 0 && helm && usable(helm) > 0) {
    const base = TUNING.evasionByEngine[Math.min(8, engines)];
    if (ship.kind === "machine" || ship.kind === "autopilot") {
      // Crewless machines fly on their own control core.
      ev = base * mobMul + (ship.mobility === "flier" ? 6 : 0);
    } else {
      const pilot = manner(sim, ship, "helm");
      const eng = manner(sim, ship, "engines");
      if (pilot) {
        ev = base + MAN_BONUS.helmEvasion[skillLevel(pilot.xp, "helm")] + (pilot.species === "courier" ? 3 : 0);
      } else {
        const lv = usable(helm);
        ev = lv >= 3 ? base * 0.8 : lv >= 2 ? base * 0.5 : 0;
      }
      if (ev > 0 && eng) ev += MAN_BONUS.enginesEvasion[skillLevel(eng.xp, "engines")] + (eng.species === "courier" ? 3 : 0);
      ev *= mobMul;
    }
  }
  if (ev > 0) ev += ship.mods.evasion; // coupled cars weigh on the carrier (★v2.1)
  if (ship.augments.includes("lamp-dark-coating") && ev > 0) ev += 5;
  if (ship.veilT > 0) ev += TUNING.veilEvasion;
  const core = sim.ships[1].boss.core;
  if (ship.side === 0 && core && core.phase === 3 && !sim.ships[1].dead) ev -= 10; // the event horizon pulls
  return Math.max(0, Math.min(TUNING.evasionCap, Math.round(ev)));
}

/** Per-tick system upkeep for one ship. */
export function updateSystems(sim: Sim, ship: SimShip, dt: number) {
  let changed = false;
  for (const s of ship.systems) {
    if (s.ion > 0) {
      s.ionT -= dt;
      if (s.ionT <= 0) {
        s.ion--;
        s.ionT = s.ion > 0 ? TUNING.ionLock : 0;
        changed = true;
      }
    }
    if (s.rust > 0) s.rust -= dt;
    // Bellmakers tune the system in their room.
    let bonus = 0;
    for (const c of sim.crew) {
      if (!c.dead && c.species === "bellmaker" && c.ship === ship.side && c.side === ship.side && ship.tileRoom[c.tile] === s.room && c.path.length === 0) bonus++;
    }
    bonus = Math.min(bonus, usable(s));
    if (bonus !== s.bonus) {
      s.bonus = bonus;
      changed = true;
    }
  }
  if (changed) clampPower(sim, ship);
  autoRestore(sim, ship);
  syncBayPower(ship);

  // Shields recharge.
  const max = shieldMax(ship);
  if (ship.shields > max) ship.shields = max;
  if (ship.shields < max) {
    let rate = 1;
    const m = manner(sim, ship, "shields");
    if (m) rate += MAN_BONUS.shieldsCharge[skillLevel(m.xp, "shields")] + (m.species === "warden" ? 0.1 : 0);
    if (ship.augments.includes("keepalive")) rate += 0.15;
    ship.shieldT += (dt * rate) / TUNING.shieldRecharge;
    if (ship.shieldT >= 1) {
      ship.shieldT = 0;
      ship.shields++;
      if (ship.side === 0) sim.emit({ type: "shield-up", side: ship.side });
    }
  } else ship.shieldT = 0;

  // Veil.
  if (ship.veilT > 0) {
    ship.veilT -= dt;
    if (ship.veilT <= 0 || usable(ship.sys.veil) <= 0) {
      ship.veilT = 0;
      ship.veilCd = TUNING.veilCooldown;
      sim.emit({ type: "veil-off", side: ship.side });
    }
  } else if (ship.veilCd > 0) ship.veilCd -= dt;

  ship.evasion = computeEvasion(sim, ship);

  // Hop drive / handshake (player), escape charge (fleeing humans).
  if (ship.side === 0 || ship.fleeing) {
    const eng = effective(ship.sys.engines);
    const helm = ship.sys.helm;
    const pilot = manner(sim, ship, "helm");
    let rate = 0;
    if (eng > 0 && helm && usable(helm) > 0) {
      const secs = TUNING.hopSeconds[Math.min(8, eng)];
      if (pilot) rate = 1 / secs;
      else if (usable(helm) >= 2 || ship.kind === "autopilot") rate = 0.5 / secs;
      if (pilot) rate *= 1 + 0.05 * skillLevel(pilot.xp, "helm");
    }
    if (sim.setup.hazard === "sealing-lattice" && ship.side === 0) rate *= 0.85;
    if (ship.hop < 1) {
      const before = ship.hop;
      ship.hop = Math.min(1, ship.hop + rate * dt);
      if (ship.side === 0) {
        for (const k of [1 / 3, 2 / 3]) if (before < k && ship.hop >= k) sim.emit({ type: "hop-step", side: 0, n: k < 0.5 ? 1 : 2 });
        if (before < 1 && ship.hop >= 1) sim.emit({ type: "hop-ready", side: 0 });
      }
    }
  }
}

export function sysName(id: SysKey): string {
  return (SYSTEMS as Record<string, { name: string }>)[id]?.name ?? { gate: "Gate Seal", bells: "Glass Bells", heart: "The Heart", brood: "Brood", artillery: "Artillery" }[id as string] ?? id;
}
