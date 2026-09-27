// Drones (contract §4.3). Deploying a drone spends 1 spare; it stays out until the fight ends, it is destroyed, or
// the Drone Bay loses its power (then redeploying costs another spare, like FTL).
import type { DroneId, StageIndex } from "../game/ids.ts";

export type DroneKind = "defence" | "combat" | "repair" | "anti" | "boarding";

export interface DroneDef {
  id: DroneId;
  name: string;
  kind: DroneKind;
  power: number;
  /** Seconds between shots / actions. */
  cooldown: number;
  /** Damage per shot (combat) / hull repaired per action (repair). */
  damage: number;
  /** Repair drone: total hull repaired before it is spent. Boarding drone: body HP. */
  capacity?: number;
  cost: number;
  rarity: number;
  stageMin: StageIndex;
  desc: string;
}

export const DRONES: Record<DroneId, DroneDef> = {
  "firewall-drone": {
    id: "firewall-drone", name: "Firewall Drone", kind: "defence", power: 2, cooldown: 1.6, damage: 0, cost: 45, rarity: 1,
    stageMin: 1, desc: "Orbits the tender and shoots down incoming payloads, debris and crawlers.",
  },
  "relay-drone": {
    id: "relay-drone", name: "Relay Drone", kind: "combat", power: 2, cooldown: 4.6, damage: 1, cost: 45, rarity: 0,
    stageMin: 1, desc: "Flies to the enemy and fires 1-damage laser bolts at random rooms.",
  },
  "rigger-drone": {
    id: "rigger-drone", name: "Rigger Drone", kind: "repair", power: 1, cooldown: 2.4, damage: 1, capacity: 4, cost: 40,
    rarity: 0, stageMin: 1, desc: "Patches the hull: 1 point every few seconds, up to 4, then it is spent.",
  },
  "bulwark-drone": {
    id: "bulwark-drone", name: "Bulwark Drone", kind: "anti", power: 2, cooldown: 2.8, damage: 1, cost: 35, rarity: 0,
    stageMin: 1, desc: "Hunts enemy drones: each hit knocks one out of the sky.",
  },
  "crawler-drone": {
    id: "crawler-drone", name: "Crawler Drone", kind: "boarding", power: 3, cooldown: 0, damage: 1, capacity: 110, cost: 60,
    rarity: 2, stageMin: 1,
    desc: "Bores into an enemy room (breach), then crawls from system to system taking them apart.",
  },
};
