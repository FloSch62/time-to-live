// Reward rolls (FTL-like): salvage scaled by stage and depth, a chance of TTL/payloads/spares and of an item.
// Uses src/data's rollReward when the combat workstream provides it (catalog.rollReward). Pure module.
import { Rng } from "../core/rng.ts";
import type { AugmentId, DroneId, SpeciesId, StageIndex, WeaponId } from "../game/ids.ts";
import type { Reward } from "../game/types.ts";
import { catalog, rarityWeight, type ItemInfo } from "./catalog.ts";
import * as dataRewards from "../data/rewards.ts";

export type Tier = "low" | "med" | "high";

const SALVAGE: Record<Tier, [number, number]> = { low: [8, 16], med: [16, 28], high: [28, 42] };

export function baselineReward(tier: Tier, stage: StageIndex, depth: number, rng: Rng): Reward {
  const scale = 1 + 0.4 * (stage - 1) + 0.25 * depth;
  const [a, b] = SALVAGE[tier];
  const res: Reward["resources"] = { salvage: Math.round(rng.int(a, b) * scale) };
  const extra = tier === "low" ? 0.45 : tier === "med" ? 0.7 : 0.9;
  if (rng.chance(extra)) {
    const pick = rng.weighted(["ttl", "payloads", "spares"] as const, (k) => (k === "ttl" ? 5 : k === "payloads" ? 3 : 2));
    const amt = pick === "ttl" ? rng.int(1, tier === "high" ? 4 : 3) : rng.int(1, tier === "high" ? 4 : 3);
    res[pick] = amt;
  }
  const out: Reward = { resources: res };
  const itemChance = tier === "low" ? 0.04 : tier === "med" ? 0.12 : 0.32;
  if (rng.chance(itemChance)) {
    const k = rng.weighted(["weapon", "drone", "augment"] as const, (x) => (x === "weapon" ? 5 : x === "drone" ? 2 : 3));
    if (k === "weapon") out.weapon = randomWeapon(stage, rng);
    else if (k === "drone") out.drone = randomDrone(stage, rng);
    else out.augment = randomAugment(stage, rng);
  } else if (tier === "high" && rng.chance(0.06)) {
    out.crew = { species: randomSpecies(rng) };
  }
  return out;
}

/** Standard reward (src/data's FTL-like table; the baseline only if that is unavailable). */
export function rollReward(tier: Tier | "elite" | "boss", stage: StageIndex, depth: number, rng: Rng): Reward {
  if (typeof dataRewards.rollReward === "function") return dataRewards.rollReward(rng, stage, depth, tier);
  return baselineReward(tier === "elite" || tier === "boss" ? "high" : tier, stage, depth, rng);
}

function pickByRarity(list: ItemInfo[], stage: StageIndex, rng: Rng): string {
  return rng.weighted(list, (i) => rarityWeight(i, stage)).id;
}

export function randomWeapon(stage: StageIndex, rng: Rng): WeaponId {
  if (typeof dataRewards.randomWeapon === "function") return dataRewards.randomWeapon(rng, stage);
  return pickByRarity(Object.values(catalog.weapons).filter((w) => !w.noStore), stage, rng) as WeaponId;
}
export function randomDrone(stage: StageIndex, rng: Rng): DroneId {
  if (typeof dataRewards.randomDrone === "function") return dataRewards.randomDrone(rng, stage);
  return pickByRarity(Object.values(catalog.drones), stage, rng) as DroneId;
}
export function randomAugment(stage: StageIndex, rng: Rng, exclude: AugmentId[] = []): AugmentId {
  if (typeof dataRewards.randomAugment === "function") return dataRewards.randomAugment(rng, exclude);
  const list = Object.values(catalog.augments).filter((a) => !exclude.includes(a.id as AugmentId));
  return pickByRarity(list.length ? list : Object.values(catalog.augments), stage, rng) as AugmentId;
}
export function randomSpecies(rng: Rng, allowBellmaker = false): SpeciesId {
  if (!allowBellmaker && typeof dataRewards.randomRecruitSpecies === "function") return dataRewards.randomRecruitSpecies(rng);
  const list = Object.values(catalog.species).filter((s) => s.hireable || allowBellmaker);
  return rng.pick(list).id;
}
