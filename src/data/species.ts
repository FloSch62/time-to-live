// Crew species, hostile boarders and skill rules (contract §2). Pure data: importable from node tests.
import type { BoarderId, SpeciesId } from "../game/ids.ts";
import type { SkillId } from "../game/types.ts";

export interface SpeciesDef {
  id: SpeciesId;
  name: string;
  hp: number;
  /** Walking speed multiplier (1 = linefolk). */
  move: number;
  /** Repair speed multiplier (systems, breaches, fires). */
  repair: number;
  /** Melee damage multiplier. */
  combat: number;
  breathes: boolean;
  /** Fire damage multiplier taken. */
  fireMul: number;
  /** XP gain multiplier. */
  learn: number;
  /** Can be healed by the Bench Infirmary. */
  medbay: boolean;
  /** Short rules text for tooltips. */
  special: string;
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  linefolk: {
    id: "linefolk", name: "Linefolk", hp: 100, move: 1, repair: 1, combat: 1, breathes: true, fireMul: 1, learn: 1.5,
    medbay: true, special: "Learns station skills 1.5× faster.",
  },
  warden: {
    id: "warden", name: "Warden", hp: 130, move: 0.85, repair: 0.8, combat: 1.5, breathes: true, fireMul: 0.5, learn: 1,
    medbay: true, special: "Half damage from fire. +10% mesh recharge when manning the Shield Array.",
  },
  rigger: {
    id: "rigger", name: "Rigger", hp: 90, move: 1, repair: 2, combat: 0.5, breathes: false, fireMul: 1, learn: 1,
    medbay: false,
    special: "Repairs twice as fast. Does not breathe. Cannot use the Bench Infirmary; mends itself while repairing.",
  },
  courier: {
    id: "courier", name: "Courier", hp: 80, move: 1.4, repair: 1, combat: 0.8, breathes: true, fireMul: 1, learn: 1,
    medbay: true, special: "Fast on their feet. +3% evasion while at the Helm or the Thrusters.",
  },
  bellmaker: {
    id: "bellmaker", name: "Bellmaker", hp: 70, move: 1, repair: 1, combat: 0.6, breathes: true, fireMul: 1, learn: 1,
    medbay: true, special: "Tunes the system in their room: +1 free power to it.",
  },
};

export interface BoarderDef {
  id: BoarderId;
  name: string;
  hp: number;
  move: number;
  combat: number;
  /** Sabotage speed on systems (bars per ~8 s at 1.0). */
  sabotage: number;
  /** Door-breaking multiplier. */
  doorCut: number;
  /** Can cut a breach into the room it stands in. */
  breacher: boolean;
  /** Damage taken multiplier (armour). */
  armour: number;
}

export const BOARDERS: Record<BoarderId, BoarderDef> = {
  "spark-mite": { id: "spark-mite", name: "Spark Mite", hp: 40, move: 1.5, combat: 0.5, sabotage: 1.3, doorCut: 1, breacher: false, armour: 1 },
  splicer: { id: "splicer", name: "Splicer", hp: 80, move: 1, combat: 0.8, sabotage: 1, doorCut: 3, breacher: true, armour: 1 },
  "marshal-trooper": { id: "marshal-trooper", name: "Marshal Trooper", hp: 120, move: 0.85, combat: 1.3, sabotage: 1, doorCut: 1.5, breacher: false, armour: 0.8 },
};

/** Machine crew that are not player species: escort automatons of the enemy machines, and the crawler drone. */
export const ESCORT_AUTOMATON = { name: "Escort Automaton", hp: 70, move: 0.9, repair: 1.2, combat: 0.7 };
export const CRAWLER_BODY = { name: "Crawler Drone", hp: 110, move: 0.9, combat: 0.9, sabotage: 1.6 };

// ─── Skills (FTL: two learned levels per skill) ───────────────────────────────────────────────────────────────

export const SKILL_IDS: SkillId[] = ["helm", "engines", "weapons", "shields", "repair", "combat"];

/** XP needed for skill level 1 and 2. */
export const SKILL_XP: Record<SkillId, [number, number]> = {
  helm: [15, 30],
  engines: [15, 30],
  weapons: [45, 90],
  shields: [40, 80],
  repair: [14, 28],
  combat: [8, 16],
};

export const SKILL_NAMES: Record<SkillId, string> = {
  helm: "Helm", engines: "Thrusters", weapons: "Weapons", shields: "Shields", repair: "Repair", combat: "Combat",
};

export function skillLevel(xp: Record<SkillId, number> | undefined, skill: SkillId): 0 | 1 | 2 {
  const v = xp?.[skill] ?? 0;
  const [a, b] = SKILL_XP[skill];
  return v >= b ? 2 : v >= a ? 1 : 0;
}

/** Manning bonus by skill level (contract §3.3; FTL values). */
export const MAN_BONUS = {
  helmEvasion: [5, 7, 10],
  enginesEvasion: [5, 7, 10],
  weaponsCharge: [0.1, 0.15, 0.2],
  shieldsCharge: [0.1, 0.2, 0.3],
  repairSpeed: [1, 1.1, 1.2],
  combatDamage: [1, 1.1, 1.2],
} as const;

export function emptyXp(): Record<SkillId, number> {
  return { helm: 0, engines: 0, weapons: 0, shields: 0, repair: 0, combat: 0 };
}
