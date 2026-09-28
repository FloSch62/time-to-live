// Augments (contract §4.4). Combat effects are applied by the sim; hop/map effects through the helpers below,
// which the campaign calls (afterHop) or reads (flags).
import type { AugmentId } from "../game/ids.ts";
import type { ShipState } from "../game/types.ts";
import { SPECIES } from "./species.ts";

export interface AugmentDef {
  id: AugmentId;
  name: string;
  cost: number;
  rarity: number;
  /** Where the effect lives: combat sim, campaign (map/hop), or both. */
  scope: "combat" | "campaign" | "both";
  desc: string;
}

export const AUGMENTS: Record<AugmentId, AugmentDef> = {
  "startup-config": { id: "startup-config", name: "Startup Config", cost: 45, rarity: 1, scope: "combat", desc: "Weapons start every fight fully charged." },
  "hot-swap-rig": { id: "hot-swap-rig", name: "Hot Swap Rig", cost: 55, rarity: 1, scope: "combat", desc: "Weapons charge 10% faster." },
  "vargas-crimper": { id: "vargas-crimper", name: "Varga's Crimper", cost: 50, rarity: 1, scope: "campaign", desc: "Repairs 1 hull after every hop." },
  "harrows-kettle": { id: "harrows-kettle", name: "Harrow's Kettle", cost: 35, rarity: 0, scope: "campaign", desc: "All crew heal fully after each hop." },
  "salvage-arm": { id: "salvage-arm", name: "Salvage Arm", cost: 50, rarity: 1, scope: "combat", desc: "+15% salvage from victories." },
  "listening-horn": { id: "listening-horn", name: "Listening Horn", cost: 40, rarity: 1, scope: "campaign", desc: "Reveals what waits at adjacent relays on the map." },
  "brass-plating": { id: "brass-plating", name: "Brass Plating", cost: 55, rarity: 2, scope: "combat", desc: "15% chance to shrug off any hull damage." },
  "sprinkler-runbook": { id: "sprinkler-runbook", name: "Sprinkler Runbook", cost: 35, rarity: 0, scope: "combat", desc: "Fires in rooms with nobody in them die out three times faster." },
  "bench-kit": { id: "bench-kit", name: "Bench Kit", cost: 40, rarity: 1, scope: "combat", desc: "Crew slowly heal anywhere aboard during fights." },
  "lamp-dark-coating": { id: "lamp-dark-coating", name: "Lamp-Dark Coating", cost: 45, rarity: 1, scope: "combat", desc: "+5% evasion." },
  "second-way-home": { id: "second-way-home", name: "Second Way Home", cost: 65, rarity: 3, scope: "both", desc: "Once per stage, a lethal hit leaves the tender at 1 hull instead." },
  keepalive: { id: "keepalive", name: "Keepalive", cost: 50, rarity: 1, scope: "combat", desc: "Mesh layers recharge 15% faster." },
  "drone-recovery": { id: "drone-recovery", name: "Drone Recovery", cost: 40, rarity: 1, scope: "combat", desc: "Drones still flying when a fight ends are recovered (their spare is refunded)." },
  "wireshark-tap": { id: "wireshark-tap", name: "Wireshark Tap", cost: 35, rarity: 0, scope: "combat", desc: "See enemy weapon charge regardless of your Listening Post." },
};

export const MAX_AUGMENTS = 3;

export function hasAugment(ship: Pick<ShipState, "augments">, id: AugmentId): boolean {
  return ship.augments.includes(id);
}

/**
 * Campaign hook: call once after every hop (after the TTL is spent). Applies Varga's Crimper and Harrow's Kettle.
 * Mutates and returns the ship.
 */
export function afterHop(ship: ShipState): ShipState {
  if (hasAugment(ship, "vargas-crimper")) ship.hull = Math.min(ship.hullMax, ship.hull + 1);
  if (hasAugment(ship, "harrows-kettle")) for (const c of ship.crew) c.hp = SPECIES[c.species].hp;
  return ship;
}

/**
 * Second Way Home is once per stage. The sim records the stage it was spent in on the ship (`swhStage`, a small
 * extension field the campaign saves with the ship). The campaign doesn't need to do anything.
 */
export interface ShipStateExt extends ShipState {
  swhStage?: number;
}
