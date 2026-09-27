// Weapons (contract §4.2): FTL baseline numbers re-skinned. Enemy-only weapons live in ENEMY_WEAPONS.
import type { StageIndex, WeaponId } from "../game/ids.ts";

export type WeaponType = "laser" | "ion" | "beam" | "payload" | "flak";

export interface WeaponDef {
  id: string;
  name: string;
  type: WeaponType;
  /** Hull/system damage per projectile (beam: per room crossed). */
  damage: number;
  /** Projectiles per volley (flak: pellets). */
  shots: number;
  /** Ion damage per hit. */
  ion?: number;
  power: number;
  /** Seconds to charge at 100%. */
  charge: number;
  /** Beam length in tiles. */
  beamLength?: number;
  fireChance: number;
  breachChance: number;
  /** Crew damage per damage point (FTL 15). */
  crewDamage?: number;
  /** Extra system damage on top of `damage`. */
  sysBonus?: number;
  /** Payloads consumed per volley (player only; enemies have a magazine). */
  ammo?: number;
  /** Heartpulse chain: seconds removed per consecutive volley, and max steps. */
  chain?: { step: number; max: number };
  /** Flak scatter radius in tiles. */
  spread?: number;
  /** Store price (sell = half). 0 = not sold. */
  cost: number;
  /** 0 common … 3 legendary (store and reward weighting). */
  rarity: number;
  /** Earliest stage where stores/rewards offer it. */
  stageMin: StageIndex;
  /** Projectile colour family (fx atlas: teal amber ivory ember violet chain). */
  color: "teal" | "amber" | "ivory" | "ember" | "violet" | "chain";
  sfx: string;
  desc: string;
  /** Weapons sprite atlas prefix (enemy weapons reuse a player weapon look). */
  sprite: string;
}

const w = (d: Omit<WeaponDef, "sprite"> & { sprite?: string }): WeaponDef => ({ ...d, sprite: d.sprite ?? d.id });

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  "packet-laser": w({
    id: "packet-laser", name: "Packet Laser", type: "laser", damage: 1, shots: 1, power: 1, charge: 9, fireChance: 0.1,
    breachChance: 0, cost: 25, rarity: 0, stageMin: 1, color: "teal", sfx: "laser-fire",
    desc: "One light bolt. Cheap, reliable, and it keeps a shield busy.",
  }),
  "burst-emitter": w({
    id: "burst-emitter", name: "Burst Emitter", type: "laser", damage: 1, shots: 2, power: 2, charge: 12, fireChance: 0.1,
    breachChance: 0.05, cost: 45, rarity: 0, stageMin: 1, color: "teal", sfx: "laser-fire",
    desc: "Two bolts in a quick burst. Each bolt strips one shield layer.",
  }),
  "triple-burst": w({
    id: "triple-burst", name: "Triple Burst", type: "laser", damage: 1, shots: 3, power: 2, charge: 12, fireChance: 0.1,
    breachChance: 0.1, cost: 70, rarity: 1, stageMin: 1, color: "teal", sfx: "laser-fire",
    desc: "Three bolts per volley: the lampers' favourite shield-breaker.",
  }),
  "jumbo-frame": w({
    id: "jumbo-frame", name: "Jumbo Frame", type: "laser", damage: 2, shots: 1, power: 1, charge: 9, fireChance: 0.15,
    breachChance: 0.2, crewDamage: 15, cost: 50, rarity: 1, stageMin: 1, color: "amber", sfx: "laser-heavy",
    desc: "One oversized bolt: 2 damage, good odds of a breach.",
  }),
  "jumbo-frame-ii": w({
    id: "jumbo-frame-ii", name: "Jumbo Frame II", type: "laser", damage: 2, shots: 2, power: 3, charge: 13, fireChance: 0.3,
    breachChance: 0.3, cost: 75, rarity: 2, stageMin: 2, color: "amber", sfx: "laser-heavy",
    desc: "Two heavy bolts. Starts fires and holes alike.",
  }),
  "multicast-array": w({
    id: "multicast-array", name: "Multicast Array", type: "laser", damage: 1, shots: 5, power: 4, charge: 19, fireChance: 0.1,
    breachChance: 0.1, cost: 100, rarity: 3, stageMin: 2, color: "ivory", sfx: "laser-fire",
    desc: "Five bolts to every address at once. Slow, hungry, devastating.",
  }),
  jammer: w({
    id: "jammer", name: "Jammer", type: "ion", damage: 0, shots: 1, ion: 1, power: 1, charge: 8, fireChance: 0,
    breachChance: 0, cost: 30, rarity: 0, stageMin: 1, color: "violet", sfx: "ion-fire",
    desc: "Ion bolt: strips a shield layer and locks one bar of power for a while. No hull damage.",
  }),
  "flood-cannon": w({
    id: "flood-cannon", name: "Flood Cannon", type: "ion", damage: 0, shots: 1, ion: 2, power: 3, charge: 13, fireChance: 0,
    breachChance: 0, cost: 50, rarity: 1, stageMin: 1, color: "violet", sfx: "ion-fire",
    desc: "A heavy ion flood: 2 ion damage, long lockouts.",
  }),
  "fiber-lance": w({
    id: "fiber-lance", name: "Fiber Lance", type: "beam", damage: 1, shots: 1, power: 2, charge: 12, beamLength: 2.6,
    fireChance: 0.1, breachChance: 0, crewDamage: 15, cost: 40, rarity: 0, stageMin: 1, color: "teal", sfx: "beam-fire",
    desc: "Short beam: 1 damage to every room it crosses, minus shield layers. Never misses.",
  }),
  "trunk-lance": w({
    id: "trunk-lance", name: "Trunk Lance", type: "beam", damage: 2, shots: 1, power: 3, charge: 17, beamLength: 4.2,
    fireChance: 0.15, breachChance: 0, crewDamage: 15, cost: 65, rarity: 2, stageMin: 1, color: "amber", sfx: "beam-fire",
    desc: "Long beam: 2 damage per room crossed, minus shield layers.",
  }),
  "payload-launcher": w({
    id: "payload-launcher", name: "Payload Launcher", type: "payload", damage: 3, shots: 1, ammo: 1, power: 1, charge: 11,
    fireChance: 0.1, breachChance: 0.2, cost: 40, rarity: 0, stageMin: 1, color: "amber", sfx: "payload-launch",
    desc: "Fires one payload (uses 1). Ignores shields; firewall drones can shoot it down.",
  }),
  "breach-spike": w({
    id: "breach-spike", name: "Breach Spike", type: "payload", damage: 4, shots: 1, ammo: 1, power: 3, charge: 22,
    fireChance: 0.1, breachChance: 0.8, sysBonus: 0, cost: 60, rarity: 2, stageMin: 1, color: "ember", sfx: "payload-launch",
    desc: "A hull-piercing spike: 4 damage and almost always a breach. Uses 1 payload.",
  }),
  "thermite-payload": w({
    id: "thermite-payload", name: "Thermite Payload", type: "payload", damage: 1, shots: 1, ammo: 1, power: 1, charge: 10,
    fireChance: 0.9, breachChance: 0, cost: 45, rarity: 1, stageMin: 1, color: "ember", sfx: "payload-launch",
    desc: "A small shell packed with thermite: 90% chance to start a fire. Uses 1 payload.",
  }),
  "scatter-shot": w({
    id: "scatter-shot", name: "Scatter Shot", type: "flak", damage: 1, shots: 3, power: 2, charge: 10, spread: 1.1,
    fireChance: 0.05, breachChance: 0.05, cost: 60, rarity: 1, stageMin: 1, color: "ivory", sfx: "flak-fire",
    desc: "Three pellets scattered around the target. Brutal against shields.",
  }),
  "heartpulse-chain": w({
    id: "heartpulse-chain", name: "Heartpulse Chain", type: "laser", damage: 1, shots: 2, power: 2, charge: 16,
    chain: { step: 2, max: 3 }, fireChance: 0.1, breachChance: 0.05, cost: 85, rarity: 3, stageMin: 2, color: "chain",
    sfx: "laser-fire", desc: "Two bolts. Every consecutive volley charges 2 s faster (up to 3 times) while it stays powered.",
  }),
  "cathedral-chime": w({
    id: "cathedral-chime", name: "Cathedral Chime", type: "beam", damage: 1, shots: 1, ion: 1, power: 3, charge: 16,
    beamLength: 3.4, fireChance: 0, breachChance: 0, crewDamage: 15, cost: 90, rarity: 3, stageMin: 2, color: "violet",
    sfx: "beam-fire",
    desc: "A ringing beam: ionises the shield it strikes (one layer), then 1 damage + 1 ion to every room it crosses.",
  }),
};

/** Weapons only machines carry. Same rules, own names and looks. */
export const ENEMY_WEAPONS: Record<string, WeaponDef> = {
  "buffer-clamp": w({
    id: "buffer-clamp", name: "Buffer Clamp", type: "ion", damage: 0, shots: 1, ion: 1, power: 1, charge: 13, fireChance: 0,
    breachChance: 0, cost: 0, rarity: 0, stageMin: 1, color: "amber", sfx: "ion-fire", sprite: "jammer",
    desc: "The leech's intake clamp: drains a shield layer and holds the power.",
  }),
  "wraith-shears": w({
    id: "wraith-shears", name: "Isolation Shears", type: "beam", damage: 2, shots: 1, power: 2, charge: 18, beamLength: 3.2,
    fireChance: 0.1, breachChance: 0, crewDamage: 15, cost: 0, rarity: 0, stageMin: 1, color: "ember", sfx: "beam-fire",
    sprite: "trunk-lance", desc: "Cutting beam: 2 per room, minus shields.",
  }),
  "warning-horn": w({
    id: "warning-horn", name: "Warning Horn", type: "ion", damage: 0, shots: 2, ion: 1, power: 2, charge: 14, fireChance: 0,
    breachChance: 0, cost: 0, rarity: 0, stageMin: 1, color: "violet", sfx: "ion-fire", sprite: "flood-cannon",
    desc: "Two ion warnings, broadcast on the wrong band.",
  }),
  "crane-hook": w({
    id: "crane-hook", name: "Crane Hook", type: "payload", damage: 2, shots: 1, power: 1, charge: 13, fireChance: 0.1,
    breachChance: 0.3, cost: 0, rarity: 0, stageMin: 1, color: "amber", sfx: "payload-launch", sprite: "payload-launcher",
    desc: "Condemned scrap thrown into your skip. Ignores shields.",
  }),
  "furnace-maw": w({
    id: "furnace-maw", name: "Furnace Maw", type: "payload", damage: 1, shots: 1, power: 1, charge: 12, fireChance: 0.9,
    breachChance: 0, cost: 0, rarity: 0, stageMin: 1, color: "ember", sfx: "payload-launch", sprite: "thermite-payload",
    desc: "A ladle of slag. Starts fires.",
  }),
  "regent-edict": w({
    id: "regent-edict", name: "Routing Edict", type: "laser", damage: 2, shots: 2, power: 3, charge: 14, fireChance: 0.15,
    breachChance: 0.25, cost: 0, rarity: 0, stageMin: 1, color: "amber", sfx: "laser-heavy", sprite: "jumbo-frame-ii",
    desc: "Two heavy bolts stamped with the Copper Gate's authority.",
  }),
  "choir-refrain": w({
    id: "choir-refrain", name: "Refrain", type: "ion", damage: 0, shots: 3, ion: 1, power: 3, charge: 20, fireChance: 0,
    breachChance: 0, cost: 0, rarity: 0, stageMin: 2, color: "violet", sfx: "ion-fire", sprite: "flood-cannon",
    desc: "The Choir sings the evacuation order again. Three ion notes.",
  }),
  "countdown-charge": w({
    id: "countdown-charge", name: "Countdown Charge", type: "payload", damage: 4, shots: 1, power: 2, charge: 24,
    fireChance: 0.3, breachChance: 0.6, cost: 0, rarity: 0, stageMin: 3, color: "ember", sfx: "payload-launch",
    sprite: "breach-spike", desc: "It counts down on everything it meets.",
  }),
  "custody-cut": w({
    id: "custody-cut", name: "Custody: Cut", type: "beam", damage: 2, shots: 1, power: 0, charge: 10, beamLength: 4.4,
    fireChance: 0.2, breachChance: 0, crewDamage: 15, cost: 0, rarity: 0, stageMin: 3, color: "ember", sfx: "beam-fire",
    sprite: "trunk-lance", desc: "Rotation step one: cut.",
  }),
  "custody-breach": w({
    id: "custody-breach", name: "Custody: Breach", type: "payload", damage: 3, shots: 1, power: 0, charge: 10,
    fireChance: 0.1, breachChance: 0.8, cost: 0, rarity: 0, stageMin: 3, color: "ember", sfx: "payload-launch",
    sprite: "breach-spike", desc: "Rotation step two: breach.",
  }),
  "custody-jam": w({
    id: "custody-jam", name: "Custody: Jam", type: "ion", damage: 0, shots: 2, ion: 2, power: 0, charge: 10, fireChance: 0,
    breachChance: 0, cost: 0, rarity: 0, stageMin: 3, color: "violet", sfx: "ion-fire", sprite: "flood-cannon",
    desc: "Rotation step three: jam.",
  }),
  "custody-strike": w({
    id: "custody-strike", name: "Custody: Strike", type: "laser", damage: 1, shots: 4, power: 0, charge: 10,
    fireChance: 0.1, breachChance: 0.1, cost: 0, rarity: 0, stageMin: 3, color: "ember", sfx: "laser-fire",
    sprite: "multicast-array", desc: "Rotation step four: strike.",
  }),
  "horizon-pull": w({
    id: "horizon-pull", name: "Event Horizon", type: "beam", damage: 3, shots: 1, power: 0, charge: 22, beamLength: 5.5,
    fireChance: 0.3, breachChance: 0, crewDamage: 20, cost: 0, rarity: 0, stageMin: 3, color: "ember", sfx: "beam-fire",
    sprite: "trunk-lance", desc: "Every light in the room is pulled inward.",
  }),
  "seal-bolt": w({
    id: "seal-bolt", name: "Seal Bolt", type: "ion", damage: 0, shots: 1, ion: 2, power: 0, charge: 16, fireChance: 0,
    breachChance: 0, cost: 0, rarity: 0, stageMin: 1, color: "ember", sfx: "ion-fire", sprite: "jammer",
    desc: "A sealing clamp: locks two bars of the system it strikes.",
  }),
};

export function weaponDef(id: string): WeaponDef {
  const d = (WEAPONS as Record<string, WeaponDef>)[id] ?? ENEMY_WEAPONS[id];
  if (!d) throw new Error(`unknown weapon ${id}`);
  return d;
}

/** Travel times (seconds) for the two legs of a projectile's flight: leaving the shooter, arriving at the target. */
export const FLIGHT: Record<WeaponType | "debris" | "drone", [number, number]> = {
  laser: [0.45, 0.85],
  ion: [0.55, 1.0],
  flak: [0.45, 0.9],
  payload: [0.7, 1.35],
  beam: [0.12, 0.25],
  debris: [0, 1.6],
  drone: [0, 0.6],
};

export function weaponTypeLabel(d: WeaponDef): string {
  if (d.type === "beam" && d.ion) return "beam + ion";
  if (d.chain) return "laser (chain)";
  return d.type;
}
