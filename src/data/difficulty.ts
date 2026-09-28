import type { StageIndex } from "../game/ids.ts";

export const DIFFICULTY_IDS = ["easy", "medium", "hard"] as const;
export type DifficultyId = (typeof DIFFICULTY_IDS)[number];

export interface DifficultyRules {
  id: DifficultyId;
  name: string;
  description: string;
  enemyHull: number;
  guardianHull: number;
  enemyWeaponCharge: number;
  enemyDamage: number;
  enemyEvasion: number;
  startingSalvage: number;
  relayStores: Record<StageIndex, number>;
  extraSealHops: number;
  repairPrices: Record<StageIndex, number>;
  supplyStock: number;
  stageTtlFloor: number;
  stageTtlTopup: number;
}

/** Fixed, visible voyage rules. No adjustment depends on wins, losses, player health or hidden performance. */
export const DIFFICULTIES: Record<DifficultyId, DifficultyRules> = {
  easy: {
    id: "easy", name: "Easy", description: "Slower patrol volleys, lighter hulls, generous service stores and more time ahead of the Seal.",
    enemyHull: 0.8, guardianHull: 0.8, enemyWeaponCharge: 1.4, enemyDamage: 0.85, enemyEvasion: 0.8,
    startingSalvage: 65, relayStores: { 1: 22, 2: 30, 3: 38 }, extraSealHops: 4,
    repairPrices: { 1: 1, 2: 2, 3: 3 }, supplyStock: 3, stageTtlFloor: 12, stageTtlTopup: 6,
  },
  medium: {
    id: "medium", name: "Medium", description: "Dangerous patrols with time to prepare. Equipment, repairs and refits compete for a limited budget.",
    enemyHull: 1, guardianHull: 1, enemyWeaponCharge: 1.25, enemyDamage: 0.95, enemyEvasion: 0.9,
    startingSalvage: 45, relayStores: { 1: 16, 2: 23, 3: 30 }, extraSealHops: 2,
    repairPrices: { 1: 2, 2: 2, 3: 3 }, supplyStock: 1, stageTtlFloor: 11, stageTtlTopup: 5,
  },
  hard: {
    id: "hard", name: "Hard", description: "Fast patrols, lean stores and a close Seal. Protect your specialists and preserve an escape route.",
    enemyHull: 1, guardianHull: 1, enemyWeaponCharge: 1.15, enemyDamage: 1, enemyEvasion: 1,
    startingSalvage: 30, relayStores: { 1: 16, 2: 23, 3: 30 }, extraSealHops: 0,
    repairPrices: { 1: 2, 2: 3, 3: 3 }, supplyStock: 0, stageTtlFloor: 10, stageTtlTopup: 4,
  },
};

export function isDifficulty(value: unknown): value is DifficultyId {
  return typeof value === "string" && (DIFFICULTY_IDS as readonly string[]).includes(value);
}

export function difficultyRules(id: DifficultyId = "medium"): DifficultyRules {
  return DIFFICULTIES[id] ?? DIFFICULTIES.medium;
}
