// Out of combat the ship bar stays (design plan §2.3): at a relay the player plans the next fight's reactor and
// system power, weapon power and firing order, and which drones are armed. Planning runs on a Sim of the tender
// (the same power rules as a fight) and writes the result back to ShipState, which build.ts reads when the next
// fight starts: systems[*].power, weaponPower (in mount order) and dronePower.
import type { ShipState } from "../game/types.ts";
import type { SysKey } from "../data/layouts.ts";
import { Sim } from "./sim/sim.ts";
import { isMain, powerDrone, syncBayPower } from "./sim/power.ts";

/** A dockside Sim of the tender: crew aboard, no enemy crew, nothing charging. */
export function planningSim(ship: ShipState): Sim {
  const sim = new Sim(ship, { salvage: 0, ttl: 0, payloads: 0, spares: 0 }, { enemy: "packet-leech", stage: 1, depth: 0, seed: 1 });
  sim.crew = sim.playerCrew();
  return sim;
}

/** Copy the planned allocation from the Sim into the persistent ship (intent, as a finished fight records it). */
export function writePlan(sim: Sim, ship: ShipState) {
  const P = sim.ships[0];
  for (const [id, st] of Object.entries(ship.systems)) {
    if (!st || id === "weapons" || id === "drones" || !isMain(id as SysKey)) continue;
    const s = P.sys[id as SysKey];
    if (s) st.power = Math.max(0, Math.min(st.level, s.want));
  }
  ship.weaponPower = ship.weapons.map((wid, i) => !!wid && !!P.weapons.find((w) => w.slot === i)?.want);
  ship.dronePower = ship.drones.map((did, i) => !!did && !!P.drones.find((d) => d.slot === i)?.want);
}

export function planAddPower(sim: Sim, ship: ShipState, id: SysKey): boolean {
  if (id === "drones") return planNextDrone(sim, ship);
  const ok = sim.addPower(id);
  if (ok) writePlan(sim, ship);
  return ok;
}

export function planRemovePower(sim: Sim, ship: ShipState, id: SysKey): boolean {
  const ok = sim.removePower(id);
  if (ok) writePlan(sim, ship);
  return ok;
}

/** Power a weapon on or off (toggle when `on` is omitted). Returns whether the weapon now wants power. */
export function planWeapon(sim: Sim, ship: ShipState, slot: number, on?: boolean): boolean {
  const P = sim.ships[0];
  const i = P.weapons.findIndex((w) => w.slot === slot);
  if (i < 0) return false;
  const w = P.weapons[i];
  const want = on ?? !(w.powered || w.want);
  if (want) sim.setWeaponPower(i, true);
  else sim.setWeaponPower(i, false);
  writePlan(sim, ship);
  return w.want;
}

/** Arm a drone (it launches as the next fight starts, spending a spare) or dock it. Toggle when `on` is omitted. */
export function planDrone(sim: Sim, ship: ShipState, slot: number, on?: boolean): boolean {
  const P = sim.ships[0];
  const i = P.drones.findIndex((d) => d.slot === slot);
  if (i < 0) return false;
  const d = P.drones[i];
  const want = on ?? !(d.powered || d.want);
  if (want) powerDrone(P, i);
  else {
    d.powered = false;
    d.want = false;
    syncBayPower(P);
  }
  writePlan(sim, ship);
  return d.want;
}

function planNextDrone(sim: Sim, ship: ShipState): boolean {
  const P = sim.ships[0];
  const d = P.drones.find((q) => !q.powered);
  return d ? planDrone(sim, ship, d.slot, true) : false;
}

/** Swap two weapon mounts (firing order, hotkeys and hull position follow). The caller rebuilds its Sim. */
export function planSwapWeapons(ship: ShipState, a: number, b: number): boolean {
  if (a === b || a < 0 || b < 0 || a >= ship.weaponSlots || b >= ship.weaponSlots) return false;
  [ship.weapons[a], ship.weapons[b]] = [ship.weapons[b] ?? null, ship.weapons[a] ?? null];
  const pa = !!ship.weaponPower[a], pb = !!ship.weaponPower[b];
  ship.weaponPower[a] = pb;
  ship.weaponPower[b] = pa;
  return true;
}
