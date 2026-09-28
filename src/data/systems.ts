// Systems (contract §3.3): names, level caps, upgrade costs, reactor costs, and the tuning numbers the sim uses.
import type { SystemId } from "../game/ids.ts";

export interface SystemDef {
  id: SystemId;
  name: string;
  /** Short label for tight HUD spots. */
  short: string;
  maxLevel: number;
  /** Subsystems don't draw reactor power: their power equals their undamaged level (FTL). */
  subsystem: boolean;
  /** Bought in a store and installed into a hold room. */
  purchasable: boolean;
  /** Price to install (purchasable systems start at `buyLevel`). */
  buyCost?: number;
  buyLevel?: number;
  /** cost[L] = price to upgrade from level L-1 to L. */
  cost: number[];
  /** A crew member at the station gives a bonus. */
  mannable: boolean;
  desc: string;
  /** What each level does, for the upgrade screen (index = level). */
  levels: string[];
}

const E = [5, 10, 15, 20, 25, 28, 31, 35];

export const SYSTEMS: Record<SystemId, SystemDef> = {
  shields: {
    id: "shields", name: "Shield Array", short: "Shields", maxLevel: 8, subsystem: false, purchasable: true, buyCost: 90, buyLevel: 2,
    cost: [0, 0, 0, 25, 35, 55, 75, 110, 145], mannable: true,
    desc: "The ward mesh. Every 2 power raises one rechargeable mesh layer. Emitter bolts, rivets and jammer pulses strike the mesh; payloads go through it. Each layer weakens a lance beam by 1.",
    levels: ["", "1 bar", "1 layer", "1 layer (+1 bar)", "2 layers", "2 layers (+1 bar)", "3 layers", "3 layers (+1 bar)", "4 layers"],
  },
  engines: {
    id: "engines", name: "Thrusters", short: "Thrusters", maxLevel: 8, subsystem: false, purchasable: false,
    cost: [0, 0, 15, 25, 40, 60, 85, 110, 140], mannable: true,
    desc: "The drive trolley's motors: evasion (with the Helm manned) and the handshake charge for the next switch.",
    levels: ["", ...E.map((e) => `${e}% evasion`)],
  },
  weapons: {
    id: "weapons", name: "Weapons Bay", short: "Weapons", maxLevel: 8, subsystem: false, purchasable: false,
    cost: [0, 0, 20, 25, 40, 60, 85, 115, 150], mannable: true,
    desc: "Power for mounted weapons: each weapon needs its own bars.",
    levels: ["", "1 bar", "2 bars", "3 bars", "4 bars", "5 bars", "6 bars", "7 bars", "8 bars"],
  },
  air: {
    id: "air", name: "Air Plant", short: "Air", maxLevel: 3, subsystem: false, purchasable: false, cost: [0, 0, 25, 45],
    mannable: false, desc: "Refills the air in every room of the car. Unpowered, the air slowly thins; below 5% crew suffocate.",
    levels: ["", "Slow refill", "Faster refill", "Fast refill"],
  },
  medbay: {
    id: "medbay", name: "Bench Infirmary", short: "Infirmary", maxLevel: 3, subsystem: false, purchasable: false,
    cost: [0, 0, 30, 45], mannable: false, desc: "Heals crew standing in the room.",
    levels: ["", "Heal 1×", "Heal 1.5×", "Heal 3×"],
  },
  helm: {
    id: "helm", name: "Helm", short: "Helm", maxLevel: 3, subsystem: true, purchasable: false, cost: [0, 0, 25, 45],
    mannable: true, desc: "A crew member must acknowledge every departure. Higher levels preserve partial evasion while the Helm is unattended.",
    levels: ["", "Manned only", "Autopilot at 50%", "Autopilot at 80%"],
  },
  sensors: {
    id: "sensors", name: "Listening Post", short: "Sensors", maxLevel: 4, subsystem: true, purchasable: false,
    cost: [0, 0, 25, 40, 55], mannable: true,
    desc: "L1 your own interior · L2 enemy interior and crew · L3 enemy weapon charge · L4 enemy power. Manned: +1 level.",
    levels: ["", "Own interior", "Enemy interior", "Enemy weapons", "Enemy power"],
  },
  doors: {
    id: "doors", name: "Bulkheads", short: "Doors", maxLevel: 3, subsystem: true, purchasable: false, cost: [0, 0, 30, 45],
    mannable: true, desc: "Open and close doors. Higher levels hold boarders back longer. Manned: stronger.",
    levels: ["", "Standard doors", "Blast doors", "Vault doors"],
  },
  drones: {
    id: "drones", name: "Drone Bay", short: "Drones", maxLevel: 8, subsystem: false, purchasable: true, buyCost: 60,
    buyLevel: 2, cost: [0, 0, 20, 25, 35, 55, 75, 100, 130], mannable: false,
    desc: "Power for drones. Each launch spends a spare.",
    levels: ["", "1 bar", "2 bars", "3 bars", "4 bars", "5 bars", "6 bars", "7 bars", "8 bars"],
  },
  veil: {
    id: "veil", name: "Lamp-Dark Veil", short: "Veil", maxLevel: 3, subsystem: false, purchasable: true, buyCost: 90,
    buyLevel: 1, cost: [0, 0, 50, 80], mannable: false,
    desc: "Douse every lamp and go silent: +60% evasion and enemy weapons stop charging while it lasts.",
    levels: ["", "5 s veil", "10 s veil", "15 s veil"],
  },
};

/** Rooms of the Lamplighter that can take a purchasable system. */
export const HOLD_ROOMS = ["hold-a", "hold-b", "hold-c"] as const;
export const DEFAULT_SYSTEM_ROOM: Partial<Record<SystemId, string>> = { drones: "hold-a", veil: "hold-b" };

export const MAX_REACTOR = 25;

/** Price of the next reactor bar when the reactor currently has `bars`. */
export function reactorCost(bars: number): number {
  if (bars >= MAX_REACTOR) return Infinity;
  if (bars < 12) return 15;
  if (bars < 17) return 25;
  if (bars < 21) return 40;
  return 60;
}

/** Reactor upgrade costs indexed by current bar count (8…24). */
export const REACTOR_COSTS: Record<number, number> = Object.fromEntries(
  Array.from({ length: MAX_REACTOR - 1 }, (_, i) => [i + 1, reactorCost(i + 1)]),
);

/** Price to upgrade a system from level-1 to level. */
export function upgradeCost(id: SystemId, level: number): number {
  const d = SYSTEMS[id];
  if (level > d.maxLevel) return Infinity;
  return d.cost[level] ?? Infinity;
}

// ─── Tuning used by the sim ─────────────────────────────────────────────────────────────────────────────────

export const TUNING = {
  evasionByEngine: [0, ...E],
  /** Seconds per shield layer at base. */
  shieldRecharge: 2,
  /** Seconds a system bar is locked per ion stack. */
  ionLock: 5,
  /** Seconds for 1.0 repair-speed crew to fix one system bar. */
  repairBar: 6.5,
  /** Breach HP and crew repair per second. */
  breachHp: 100,
  breachRepair: 13,
  fireHp: 100,
  fireFight: 26,
  /** Hop drive: seconds to full at engine power 1..8 (manned helm). */
  hopSeconds: [0, 70, 58, 48, 41, 36, 32, 29, 26],
  /** Air change per second by Air Plant level (%/s, whole ship budget spread over rooms). */
  airRefill: [0, 1.4, 2.8, 4.2],
  /** Air lost per second with no working Air Plant. */
  airDecay: 0.4,
  /** Crew below this air % suffocate. */
  suffocateAt: 5,
  suffocateDps: 6.5,
  fireDps: 9,
  medbayHps: [0, 6, 9, 18],
  benchKitHps: 1.1,
  meleeDps: 8,
  /** Crew damage per damage point of a hit (FTL 15). */
  crewPerDamage: 15,
  crewWalk: 2.4, // tiles per second at move 1.0
  doorHp: [60, 100, 160, 240],
  veilSeconds: [0, 5, 10, 15],
  veilCooldown: 20,
  veilEvasion: 60,
  evasionCap: 90,
} as const;
