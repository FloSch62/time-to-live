// System and reactor upgrades with salvage (contract §3.6). Costs from the catalog (src/data when present).
// Pure module.
import type { SystemId } from "../game/ids.ts";
import type { ShipState } from "../game/types.ts";
import { catalog } from "./catalog.ts";
import type { RunState } from "./model.ts";

/** Salvage to add one level to an installed system, or null at max / not installed. */
export function upgradeCost(ship: ShipState, sys: SystemId): number | null {
  const st = ship.systems[sys];
  const info = catalog.systems[sys];
  if (!st || !info) return null;
  if (st.level >= info.max) return null;
  return info.upgrade[st.level] ?? info.upgrade[info.upgrade.length - 1] ?? 50;
}

export function upgradeSystem(run: RunState, sys: SystemId): boolean {
  const cost = upgradeCost(run.ship, sys);
  if (cost === null || run.inv.salvage < cost) return false;
  run.inv.salvage -= cost;
  run.stats.salvageSpent += cost;
  run.ship.systems[sys]!.level++;
  return true;
}

export function reactorCost(ship: ShipState): number | null {
  if (ship.reactor >= catalog.reactorMax) return null;
  return catalog.reactorCost(ship.reactor);
}

export function upgradeReactor(run: RunState): boolean {
  const cost = reactorCost(run.ship);
  if (cost === null || run.inv.salvage < cost) return false;
  run.inv.salvage -= cost;
  run.stats.salvageSpent += cost;
  run.ship.reactor++;
  return true;
}

/** Total power the installed systems could draw (for the reactor readout). */
export function powerDemand(ship: ShipState): number {
  let n = 0;
  for (const [id, s] of Object.entries(ship.systems)) {
    if (!s) continue;
    if (catalog.systems[id as SystemId]?.subsystem) continue;
    n += s.level;
  }
  return n;
}
