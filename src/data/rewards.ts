// FTL-like reward rolls, shared by combat victories and event outcomes.
import type { Rng } from "../core/rng.ts";
import type { AugmentId, DroneId, SpeciesId, StageIndex, WeaponId } from "../game/ids.ts";
import type { Reward } from "../game/types.ts";
import type { RewardTier } from "./enemies.ts";
import { WEAPONS } from "./weapons.ts";
import { DRONES } from "./drones.ts";
import { AUGMENTS } from "./augments.ts";

export type { RewardTier };

const TIER: Record<RewardTier, { mul: number; item: number; crew: number; extra: number }> = {
  low: { mul: 0.6, item: 0.03, crew: 0, extra: 0.6 },
  med: { mul: 1, item: 0.08, crew: 0.03, extra: 1 },
  high: { mul: 1.35, item: 0.16, crew: 0.05, extra: 1.3 },
  elite: { mul: 1.8, item: 0.45, crew: 0.05, extra: 1.6 },
  boss: { mul: 2.4, item: 1, crew: 0, extra: 2 },
};

/** Salvage range for a standard (med) reward at a stage, before depth. */
const SALVAGE: Record<StageIndex, [number, number]> = { 1: [13, 22], 2: [22, 34], 3: [32, 46] };

const RARITY_WEIGHT = [10, 6, 3, 1];

export interface RewardOpts {
  /** Multiplier on salvage (Salvage Arm: 1.15). */
  salvageMul?: number;
  /** Force an item roll to succeed. */
  forceItem?: boolean;
}

/**
 * Roll a reward: salvage scaled by stage and depth (0…1 within the stage), with chances of TTL, payloads, spares,
 * an item (weapon/drone/augment) and, rarely, a crew member.
 */
export function rollReward(rng: Rng, stage: StageIndex, depth: number, tier: RewardTier | "low" | "med" | "high", opts: RewardOpts = {}): Reward {
  const t = TIER[tier] ?? TIER.med;
  const [lo, hi] = SALVAGE[stage] ?? SALVAGE[1];
  const d = Math.max(0, Math.min(1, depth));
  const base = rng.int(lo, hi) + Math.round(d * (6 + 3 * stage));
  const salvage = Math.max(1, Math.round(base * t.mul * (opts.salvageMul ?? 1)));
  const resources: NonNullable<Reward["resources"]> = { salvage };
  if (rng.chance(0.35 * t.extra)) resources.ttl = rng.int(1, tier === "boss" ? 4 : 3);
  if (rng.chance(0.3 * t.extra)) resources.payloads = rng.int(1, tier === "boss" || tier === "elite" ? 5 : 3);
  if (rng.chance(0.22 * t.extra)) resources.spares = rng.int(1, 2);
  const r: Reward = { resources };
  if (opts.forceItem || rng.chance(t.item)) {
    const kind = rng.weighted(["weapon", "drone", "augment"] as const, (k) => (k === "weapon" ? 5 : k === "drone" ? 2 : tier === "boss" ? 3 : 2));
    if (kind === "weapon") r.weapon = randomWeapon(rng, stage, tier === "boss" || tier === "elite");
    else if (kind === "drone") r.drone = randomDrone(rng, stage);
    else r.augment = randomAugment(rng);
  }
  if (t.crew > 0 && rng.chance(t.crew)) r.crew = { species: randomRecruitSpecies(rng) };
  return r;
}

export function randomWeapon(rng: Rng, stage: StageIndex, rich = false): WeaponId {
  const ids = (Object.keys(WEAPONS) as WeaponId[]).filter((id) => WEAPONS[id].stageMin <= stage);
  return rng.weighted(ids, (id) => {
    const r = WEAPONS[id].rarity;
    return (RARITY_WEIGHT[r] ?? 1) * (rich && r >= 1 ? 2 : 1);
  });
}

export function randomDrone(rng: Rng, stage: StageIndex): DroneId {
  const ids = (Object.keys(DRONES) as DroneId[]).filter((id) => DRONES[id].stageMin <= stage);
  return rng.weighted(ids, (id) => RARITY_WEIGHT[DRONES[id].rarity] ?? 1);
}

export function randomAugment(rng: Rng, exclude: AugmentId[] = []): AugmentId {
  const ids = (Object.keys(AUGMENTS) as AugmentId[]).filter((id) => !exclude.includes(id));
  return rng.weighted(ids, (id) => RARITY_WEIGHT[AUGMENTS[id].rarity] ?? 1);
}

/** Species that can join from rewards and events (bellmakers only join through their own events). */
export function randomRecruitSpecies(rng: Rng): SpeciesId {
  return rng.weighted(["linefolk", "warden", "rigger", "courier"] as SpeciesId[], (s) => (s === "linefolk" ? 4 : 2));
}

/** Store/sell prices. */
export function itemCost(id: string): number {
  return (WEAPONS as Record<string, { cost: number }>)[id]?.cost ?? (DRONES as Record<string, { cost: number }>)[id]?.cost ??
    (AUGMENTS as Record<string, { cost: number }>)[id]?.cost ?? 0;
}

export function sellPrice(id: string): number {
  return Math.floor(itemCost(id) / 2);
}

/** Surrender offer from a human crew: roughly a med reward without the item roll. */
export function surrenderOffer(rng: Rng, stage: StageIndex, depth: number): Reward {
  const r = rollReward(rng, stage, depth, "med");
  delete r.weapon;
  delete r.drone;
  delete r.augment;
  delete r.crew;
  if (r.resources?.salvage) r.resources.salvage = Math.round(r.resources.salvage * 0.8);
  return r;
}
