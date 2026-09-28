import type { SimShip } from "./model.ts";
import { effective, shieldMax } from "./power.ts";

/** Shared player/enemy vocabulary: installed capacity is never confused with charged protection. */
export function shieldState(ship: SimShip) {
  const system = ship.sys.shields;
  const available = shieldMax(ship);
  const installed = Math.floor((system?.level ?? 0) / 2) + ship.bonusLayers;
  const charged = Math.min(ship.shields, available);
  const cause = !system && !ship.bonusLayers ? "NOT FITTED" : available === 0
    ? (system?.ion ?? 0) > 0 ? "ION-LOCKED" : (system?.damage ?? 0) > 0 ? "DAMAGED" : "UNPOWERED"
    : available < installed ? (system?.ion ?? 0) > 0 ? "ION-LOCKED" : (system?.damage ?? 0) > 0 ? "DAMAGED" : "LOW POWER"
    : "";
  const status = charged > 0 ? "PROTECTED" : available > 0 ? "EXPOSED" : cause;
  const recharging = available > charged;
  return { charged, available, installed, cause, status, recharging, progress: recharging ? ship.shieldT : 0,
    description: `MESH ${charged}/${available} · ${status}${cause && cause !== status ? ` · ${cause}` : ""}\nInstalled ${installed} layers; ${effective(system)} power; ${system?.damage ?? 0} damaged bars; ${system?.ion ?? 0} ion-locked bars.${ship.bonusLayers ? " One layer supplied by sealing drones." : ""}\nBolts consume one layer. Payloads bypass the field. Beams lose one damage per charged layer.` };
}
