// Enemy vessels (contract §4.5): systems, weapons, AI profiles, specials and scaling by stage/depth.
import type { BoarderId, DroneId, EnemyId, SpeciesId, StageIndex } from "../game/ids.ts";
import type { SysKey } from "./layouts.ts";
import { weaponDef } from "./weapons.ts";
import { DRONES } from "./drones.ts";

export type RewardTier = "low" | "med" | "high" | "elite" | "boss";

export interface GrowStep {
  /** Depth (0…1) from which the step applies. */
  at: number;
  hull?: number;
  reactor?: number;
  /** Added to system levels. */
  systems?: Partial<Record<SysKey, number>>;
  /** Replaces the weapon list. */
  weapons?: string[];
  drones?: DroneId[];
  escorts?: number;
}

export interface AdjunctSpec {
  kind: "gate-warden" | "sealing-drone";
  count: number;
  hp: number;
  evasion: number;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  stage: StageIndex;
  /** machine: crewless auto-ship (may carry escort automatons). human: crewed, can surrender. autopilot: an empty tender. */
  kind: "machine" | "human" | "autopilot";
  /** The vessel itself is the robot: no walking crew or repair escorts. */
  autonomous?: boolean;
  /** ★v2 mobility class: crawlers ride a carrier (low evasion), installations are built in (0 evasion, more hull),
   *  fliers are rotor drones (high evasion). */
  mobility: "crawler" | "installation" | "flier";
  elite?: boolean;
  boss?: boolean;
  hull: number;
  reactor: number;
  systems: Partial<Record<SysKey, number>>;
  weapons: string[];
  /** Weapons bound to an artillery room (weapon index → room id) instead of the Weapons Bay. */
  artillery?: Record<number, string>;
  drones?: DroneId[];
  escorts?: number;
  crew?: SpeciesId[];
  boarders?: { kind: BoarderId; count: number; every: number; first: number; max: number };
  ai: {
    /** Target weights by system (any = random room). */
    targets: Partial<Record<SysKey | "any", number>>;
    /** Power priority, most important first. */
    power: SysKey[];
    /** Uses the Veil when a volley is incoming. */
    veil?: boolean;
  };
  reward: RewardTier;
  /** Offer surrender at or below this hull fraction (human crews). */
  surrender?: number;
  /** Start charging the hop drive to escape at or below this hull fraction. */
  flee?: number;
  adjuncts?: AdjunctSpec[];
  grow?: GrowStep[];
  /** Per-stage overrides for enemies that appear in every stage (quarantine drones). */
  stages?: Partial<Record<StageIndex, Partial<Omit<EnemyDef, "stages" | "id">>>>;
  /** Fallback handshake / task-ended lines (src/content/flavor.ts wins when present). */
  hail: string;
  ended: string;
  /** Hull tint for procedural fallback art. */
  tint: "copper" | "verd" | "rust" | "brass" | "iron" | "violet" | "glass" | "ember" | "black" | "ivory";
}

const T_STD = { weapons: 3, shields: 3, helm: 1, engines: 1, any: 2 };

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  // ─── Stage I · Copper Reach ─────────────────────────────────────────────────────────────────────────────
  "packet-leech": {
    id: "packet-leech", name: "Packet Leech", stage: 1, kind: "machine", mobility: "crawler", hull: 8, reactor: 6,
    systems: { shields: 2, engines: 1, weapons: 3, helm: 1 }, weapons: ["burst-emitter", "buffer-clamp"], escorts: 1,
    ai: { targets: { shields: 4, weapons: 2, any: 2 }, power: ["shields", "weapons", "engines", "helm"] }, reward: "med",
    grow: [{ at: 0.45, hull: 2, systems: { engines: 1 } }, { at: 0.8, systems: { weapons: 1 }, weapons: ["burst-emitter", "buffer-clamp", "packet-laser"], reactor: 1 }],
    hail: "BUFFER FULL. RETAINING ALL TRAFFIC. PLEASE HOLD.", ended: "The buffer lets go. Its traffic spills into your queue, and the leech drifts, light.", tint: "verd",
  },
  "cable-wraith": {
    id: "cable-wraith", name: "Cable Wraith", stage: 1, kind: "machine", mobility: "crawler", hull: 9, reactor: 7,
    systems: { shields: 2, engines: 2, weapons: 3, helm: 1 }, weapons: ["packet-laser", "wraith-shears"], escorts: 0,
    ai: { targets: T_STD, power: ["weapons", "shields", "engines", "helm"] }, reward: "med",
    grow: [{ at: 0.5, hull: 2, systems: { weapons: 1 }, weapons: ["burst-emitter", "wraith-shears"], reactor: 1 }, { at: 0.85, systems: { shields: 1, engines: 1 }, reactor: 1 }],
    hail: "LIVE ROUTE DETECTED. ISOLATING.", ended: "The shears fold. For once, a new cable stays connected.", tint: "iron",
  },
  "rust-prophet": {
    id: "rust-prophet", name: "Rust Prophet", stage: 1, kind: "machine", mobility: "installation", hull: 10, reactor: 6,
    systems: { shields: 2, weapons: 4, sensors: 1 }, weapons: ["burst-emitter", "warning-horn"], escorts: 1,
    ai: { targets: { shields: 3, weapons: 3, engines: 2, any: 2 }, power: ["weapons", "shields", "engines", "helm"] }, reward: "med",
    grow: [{ at: 0.5, hull: 2 }, { at: 0.8, systems: { shields: 1 }, reactor: 1 }],
    hail: "CORROSION WARNING. CORROSION WARNING. CORROSION WARNING.", ended: "The horns go quiet. The warning lamp stops turning.", tint: "rust",
  },
  "scrap-foreman": {
    id: "scrap-foreman", name: "Scrap Foreman", stage: 1, kind: "machine", mobility: "crawler", hull: 10, reactor: 7,
    systems: { shields: 2, engines: 1, weapons: 3, helm: 1 }, weapons: ["burst-emitter", "crane-hook"], escorts: 2,
    ai: { targets: T_STD, power: ["weapons", "shields", "engines", "helm"] }, reward: "med",
    grow: [{ at: 0.5, hull: 2 }, { at: 0.8, systems: { engines: 1, shields: 1 }, reactor: 2 }],
    hail: "INSPECTION IN PROGRESS. HULL CONDEMNED.", ended: "The hammer rests. The condemned list goes unsigned.", tint: "brass",
  },
  "scavenger-skiff": {
    id: "scavenger-skiff", name: "Scavenger Skiff", stage: 1, kind: "human", mobility: "crawler", hull: 10, reactor: 8,
    systems: { shields: 2, engines: 2, weapons: 3, helm: 1, air: 1, medbay: 1, sensors: 1 }, weapons: ["burst-emitter", "packet-laser"],
    crew: ["linefolk", "courier", "warden"],
    ai: { targets: { weapons: 3, shields: 2, engines: 2, any: 3 }, power: ["shields", "weapons", "engines", "air", "medbay"] },
    reward: "med", surrender: 0.45, flee: 0.25,
    grow: [{ at: 0.5, hull: 2 }, { at: 0.8, systems: { engines: 1, weapons: 1 }, weapons: ["burst-emitter", "jumbo-frame"], reactor: 1 }],
    hail: "Nothing personal. We need the parts more than you do.", ended: "The skiff goes quiet.", tint: "copper",
  },
  "static-nest": {
    id: "static-nest", name: "Static Nest", stage: 1, kind: "machine", mobility: "installation", hull: 11, reactor: 5,
    systems: { shields: 2, weapons: 2, sensors: 1, brood: 2 }, weapons: ["burst-emitter"],
    boarders: { kind: "spark-mite", count: 2, every: 30, first: 7, max: 4 },
    ai: { targets: T_STD, power: ["shields", "weapons", "engines", "helm"] }, reward: "med",
    grow: [{ at: 0.5, hull: 2, systems: { brood: 1 } }, { at: 0.8, systems: { weapons: 1, shields: 1 }, weapons: ["burst-emitter", "packet-laser"], reactor: 2 }],
    hail: "LINE OPEN. HOLDING. LINE OPEN. HOLDING.", ended: "The nest goes quiet. Every line it held is let go.", tint: "copper",
  },
  "ferric-colossus": {
    id: "ferric-colossus", name: "Ferric Colossus", stage: 1, kind: "machine", mobility: "installation", elite: true, hull: 16, reactor: 10,
    systems: { shields: 4, weapons: 4, sensors: 1, drones: 2 },
    weapons: ["burst-emitter", "jumbo-frame", "furnace-maw"], escorts: 2,
    ai: { targets: { weapons: 3, shields: 3, helm: 2, any: 2 }, power: ["shields", "weapons", "drones", "engines", "helm"] },
    reward: "elite", grow: [{ at: 0.6, hull: 2 }, { at: 0.85, drones: ["firewall-drone"] }],
    hail: "FURNACE BANKED. STAND AWAY FROM THE MOUTH.", ended: "The furnace door settles. Even iron can learn to rest.", tint: "iron",
  },
  "iron-regent": {
    id: "iron-regent", name: "The Iron Regent", stage: 1, kind: "machine", mobility: "installation", boss: true, hull: 24, reactor: 12,
    systems: { shields: 2, weapons: 5, sensors: 1, doors: 2, gate: 3 },
    weapons: ["regent-edict", "triple-burst"], escorts: 3,
    adjuncts: [{ kind: "gate-warden", count: 2, hp: 5, evasion: 15 }],
    ai: { targets: { weapons: 3, shields: 3, helm: 2, engines: 1, any: 1 }, power: ["shields", "weapons", "engines", "helm"] },
    reward: "boss",
    hail: "NO PASSAGE WITHOUT PROOF OF A SECOND WAY HOME.", ended: "The crown dims to the colour of old brass. The gate wings open, and beyond them the glass bells are ringing.", tint: "brass",
  },

  // ─── Stage II · Glass Cathedral ─────────────────────────────────────────────────────────────────────────
  "prism-widow": {
    id: "prism-widow", name: "Prism Widow", stage: 2, kind: "machine", mobility: "crawler", hull: 16, reactor: 10,
    systems: { shields: 4, engines: 3, weapons: 3, helm: 2, veil: 1 }, weapons: ["triple-burst", "jammer"], escorts: 1,
    ai: { targets: T_STD, power: ["shields", "weapons", "veil", "engines", "helm"], veil: true }, reward: "med",
    grow: [{ at: 0.5, hull: 2 }, { at: 0.8, systems: { engines: 1 }, reactor: 1 }],
    hail: "ISOLATION WEB HOLDING. NOTHING GETS THROUGH.", ended: "The web unravels. Light takes the long way home.", tint: "violet",
  },
  "glass-echo": {
    id: "glass-echo", name: "Glass Echo", stage: 2, kind: "machine", mobility: "flier", hull: 12, reactor: 12,
    systems: { shields: 4, engines: 6, weapons: 5, helm: 2 }, weapons: ["triple-burst", "jumbo-frame", "jammer"],
    ai: { targets: { weapons: 2, shields: 2, any: 3 }, power: ["engines", "shields", "weapons", "helm"] }, reward: "med",
    grow: [{ at: 0.5, hull: 1 }, { at: 0.8, systems: { weapons: 1 }, weapons: ["triple-burst", "jumbo-frame"], reactor: 1 }],
    hail: "…ACUATE… EVACUATE… VACUATE…", ended: "The bell cracks through. The last echo goes out and does not come back.", tint: "glass",
  },
  "wire-weaver": {
    id: "wire-weaver", name: "Wire Weaver", stage: 2, kind: "machine", mobility: "crawler", hull: 16, reactor: 11,
    systems: { shields: 4, engines: 2, weapons: 5, helm: 1, drones: 4 }, weapons: ["triple-burst", "burst-emitter"],
    drones: ["relay-drone", "firewall-drone"], escorts: 2,
    ai: { targets: T_STD, power: ["shields", "drones", "weapons", "engines", "helm"] }, reward: "med",
    grow: [{ at: 0.5, hull: 2 }, { at: 0.8, systems: { weapons: 1 }, weapons: ["triple-burst", "burst-emitter", "packet-laser"], reactor: 1 }],
    hail: "TENSION NOMINAL. ADDING TENSION.", ended: "The threads slacken.", tint: "brass",
  },
  "glass-choir": {
    id: "glass-choir", name: "Glass Choir", stage: 2, kind: "machine", mobility: "installation", hull: 20, reactor: 10,
    systems: { shields: 4, weapons: 7, sensors: 1 }, weapons: ["triple-burst", "burst-emitter", "jammer", "fiber-lance"], escorts: 1,
    ai: { targets: T_STD, power: ["shields", "weapons", "engines", "helm"] }, reward: "med",
    grow: [{ at: 0.5, hull: 2 }, { at: 0.8, systems: { shields: 1 }, reactor: 1 }],
    hail: "ALL SECTIONS PROCEED— NO, HOLD— NO—", ended: "For a moment all three bells agree on silence.", tint: "glass",
  },
  "coil-serpent": {
    id: "coil-serpent", name: "Coil Serpent", stage: 2, kind: "machine", mobility: "crawler", hull: 19, reactor: 11,
    systems: { shields: 4, engines: 3, weapons: 6, helm: 1 }, weapons: ["triple-burst", "trunk-lance", "packet-laser"], escorts: 1,
    ai: { targets: T_STD, power: ["weapons", "shields", "engines", "helm"] }, reward: "med",
    grow: [{ at: 0.5, hull: 2 }, { at: 0.8, systems: { shields: 1 }, reactor: 1 }],
    hail: "SIGNAL CARRIER FOUND. RECOVERING.", ended: "The coils open.", tint: "copper",
  },
  "echo-tender": {
    id: "echo-tender", name: "Echo Tender", stage: 2, kind: "autopilot", mobility: "crawler", hull: 17, reactor: 9,
    systems: { shields: 4, engines: 3, weapons: 3, helm: 2, air: 1, medbay: 1, sensors: 1 },
    weapons: ["burst-emitter", "payload-launcher"],
    ai: { targets: { weapons: 2, shields: 2, engines: 2, any: 2 }, power: ["shields", "weapons", "engines", "air"] }, reward: "high",
    grow: [{ at: 0.6, hull: 2, systems: { engines: 1 } }],
    hail: "ROUND IN PROGRESS. RELIGHTING. KEEP CLEAR OF THE LAMP.", ended: "The autopilot lets go of the round. The lamp is still lit.", tint: "ivory",
  },
  "hollow-choir": {
    id: "hollow-choir", name: "The Hollow Choir", stage: 2, kind: "machine", mobility: "installation", boss: true, hull: 30, reactor: 16,
    systems: { shields: 4, weapons: 8, sensors: 2, bells: 3 },
    weapons: ["cathedral-chime", "triple-burst", "choir-refrain"], escorts: 3,
    ai: { targets: { weapons: 3, shields: 3, helm: 2, engines: 2, any: 1 }, power: ["shields", "weapons", "engines", "helm"] },
    reward: "boss",
    hail: "EVERY VOICE WILL BE HEARD. EVERY VOICE WILL BE KEPT.", ended: "The masks open their mouths, and this time the voices leave.", tint: "violet",
  },

  // ─── Stage III · Blackout Heart ─────────────────────────────────────────────────────────────────────────
  "gate-sentinel": {
    id: "gate-sentinel", name: "Gate Sentinel", stage: 3, kind: "machine", mobility: "installation", hull: 22, reactor: 12,
    systems: { shields: 6, weapons: 7, sensors: 3, doors: 3 }, weapons: ["jumbo-frame-ii", "triple-burst", "jammer"], escorts: 2,
    ai: { targets: T_STD, power: ["shields", "weapons", "engines", "helm"] }, reward: "med",
    grow: [{ at: 0.5, hull: 2 }, { at: 0.8, systems: { weapons: 1 }, reactor: 1 }],
    hail: "PRESENT YOUR KEY.", ended: "The checkpoint releases its lock. The archive remains intact.", tint: "black",
  },
  "null-marshal": {
    id: "null-marshal", name: "Null Marshal", stage: 3, kind: "machine", mobility: "crawler", hull: 20, reactor: 13,
    systems: { shields: 4, engines: 3, weapons: 5, helm: 2, brood: 2 }, weapons: ["triple-burst", "breach-spike"], escorts: 2,
    boarders: { kind: "marshal-trooper", count: 2, every: 55, first: 14, max: 2 },
    ai: { targets: T_STD, power: ["shields", "weapons", "engines", "helm"] }, reward: "high",
    grow: [{ at: 0.5, hull: 2 }, { at: 0.8, systems: { shields: 1, engines: 1 }, reactor: 2 }],
    hail: "UNKEYED PERSONNEL. YOU WILL BE ESCORTED OUT.", ended: "The warrant expires.", tint: "black",
  },
  "ash-moth": {
    id: "ash-moth", name: "Ash Moth", stage: 3, kind: "machine", mobility: "flier", hull: 16, reactor: 11,
    systems: { shields: 4, engines: 4, weapons: 4, helm: 2 }, weapons: ["scatter-shot", "thermite-payload", "furnace-maw"], escorts: 1,
    ai: { targets: { shields: 3, weapons: 2, helm: 2, air: 2, any: 2 }, power: ["shields", "weapons", "engines", "helm"] }, reward: "med",
    grow: [{ at: 0.5, hull: 2 }, { at: 0.8, systems: { shields: 1 }, reactor: 1 }],
    hail: "HEAT SIGNATURE FOUND. COOLING.", ended: "The wings fold around a lantern that no longer needs tending.", tint: "ember",
  },
  "grave-reaver": {
    id: "grave-reaver", name: "Grave Reaver", stage: 3, kind: "machine", mobility: "crawler", hull: 21, reactor: 12,
    systems: { shields: 4, engines: 2, weapons: 8, helm: 1 }, weapons: ["jumbo-frame-ii", "breach-spike", "burst-emitter"], escorts: 2,
    ai: { targets: { weapons: 2, shields: 3, air: 2, medbay: 1, any: 2 }, power: ["weapons", "shields", "engines", "helm"] }, reward: "high",
    grow: [{ at: 0.5, hull: 2 }, { at: 0.8, systems: { shields: 1, engines: 1 }, reactor: 2 }],
    hail: "WEAK SIGNAL. PERMISSION TO BEGIN.", ended: "The claws lower.", tint: "rust",
  },
  "demolition-engine": {
    id: "demolition-engine", name: "Demolition Engine", stage: 3, kind: "machine", mobility: "crawler", elite: true, hull: 26, reactor: 16,
    systems: { shields: 6, engines: 3, weapons: 7, helm: 2, sensors: 2, drones: 4 },
    weapons: ["multicast-array", "countdown-charge", "jammer"], drones: ["firewall-drone", "bulwark-drone"], escorts: 3,
    ai: { targets: { weapons: 3, shields: 3, helm: 2, any: 2 }, power: ["shields", "weapons", "drones", "engines", "helm"] },
    reward: "elite", grow: [{ at: 0.6, hull: 2 }],
    hail: "T-MINUS… T-MINUS… T-MINUS…", ended: "The countdown lamp dims to nothing. The relay it came for will stand another night.", tint: "ember",
  },
  "blackout-core": {
    id: "blackout-core", name: "The Blackout Core", stage: 3, kind: "machine", mobility: "installation", boss: true, hull: 30, reactor: 18,
    systems: { shields: 4, sensors: 3, doors: 3, drones: 2, heart: 4, artillery: 2 },
    weapons: ["custody-cut", "custody-breach", "custody-jam", "custody-strike"],
    artillery: { 0: "cut", 1: "breach", 2: "jam", 3: "strike" }, drones: ["firewall-drone"], escorts: 4,
    adjuncts: [{ kind: "sealing-drone", count: 2, hp: 4, evasion: 15 }],
    ai: { targets: { weapons: 3, shields: 3, helm: 2, engines: 2, any: 1 }, power: ["shields", "drones", "engines", "helm"] },
    reward: "boss",
    hail: "YOU ARE THE ANSWER I SENT FOR. I CANNOT LET YOU IN.", ended: "The isolation shell falls silent. Inside it, the delivery lights are still on.", tint: "ember",
  },

  // ─── Any stage (sealed relays) ──────────────────────────────────────────────────────────────────────────
  "quarantine-drone": {
    id: "quarantine-drone", name: "Quarantine Drone", stage: 1, kind: "machine", mobility: "flier", hull: 11, reactor: 7,
    autonomous: true,
    systems: { shields: 2, engines: 2, weapons: 3, helm: 1 }, weapons: ["burst-emitter", "jammer"], escorts: 0,
    ai: { targets: { helm: 4, engines: 3, weapons: 2, shields: 2, any: 1 }, power: ["weapons", "shields", "engines", "helm"] }, reward: "low",
    stages: {
      2: { hull: 14, reactor: 11, systems: { shields: 4, engines: 3, weapons: 5, helm: 2 }, weapons: ["triple-burst", "jammer", "packet-laser"] },
      3: { hull: 21, reactor: 15, systems: { shields: 6, engines: 4, weapons: 6, helm: 2 }, weapons: ["triple-burst", "jumbo-frame-ii", "jammer"] },
    },
    grow: [{ at: 0.6, hull: 2 }],
    hail: "ROUTE SEALED. CONNECTION WILL BE CLOSED.", ended: "The clamps open. Somewhere behind the shell, a route is marked safe.", tint: "black",
  },
};

/** An enemy scaled to the fight's stage and depth. */
export interface ScaledEnemy extends Omit<EnemyDef, "grow" | "stages"> {
  stageFought: StageIndex;
  depth: number;
}

export function scaleEnemy(id: EnemyId, stage: StageIndex, depth: number): ScaledEnemy {
  const base = ENEMIES[id];
  if (!base) throw new Error(`unknown enemy ${id}`);
  const { grow, stages, ...rest } = base;
  const e: ScaledEnemy = {
    ...rest,
    systems: { ...base.systems },
    weapons: [...base.weapons],
    drones: base.drones ? [...base.drones] : undefined,
    stageFought: stage,
    depth,
  };
  const over = stages?.[stage];
  if (over) {
    Object.assign(e, over);
    e.systems = { ...base.systems, ...(over.systems ?? {}) };
    if (over.weapons) e.weapons = [...over.weapons];
  } else if (stage > base.stage && !base.boss) {
    // Generic scaling for enemies met later than their home stage.
    const d = stage - base.stage;
    e.hull += 4 * d;
    e.reactor += 3 * d;
    e.systems.shields = (e.systems.shields ?? 0) + 2 * d;
    if (e.systems.engines) e.systems.engines += d;
    e.systems.weapons = (e.systems.weapons ?? 0) + d;
  }
  for (const g of grow ?? []) {
    if (depth + 1e-9 < g.at) continue;
    if (g.hull) e.hull += g.hull;
    if (g.reactor) e.reactor += g.reactor;
    if (g.systems) for (const [k, v] of Object.entries(g.systems)) e.systems[k as SysKey] = (e.systems[k as SysKey] ?? 0) + (v ?? 0);
    if (g.weapons) e.weapons = [...g.weapons];
    if (g.drones) e.drones = [...g.drones];
    if (g.escorts) e.escorts = (e.escorts ?? 0) + g.escorts;
  }
  // Machines carry enough reactor for everything they field (difficulty comes from systems and weapons).
  const sy = e.systems;
  const wp = e.weapons.map((w, i) => (e.artillery?.[i] ? 0 : weaponDef(w).power)).reduce((a, b) => a + b, 0);
  const dp = (e.drones ?? []).reduce((a, d) => a + DRONES[d].power, 0);
  const need = (sy.shields ?? 0) + (sy.engines ?? 0) + Math.min(wp, sy.weapons ?? 0) + Math.min(dp, sy.drones ?? 0) +
    (sy.veil ?? 0) + (sy.air ?? 0) + (sy.medbay ?? 0);
  e.reactor = Math.max(e.reactor, need);
  return e;
}

export const STAGE_ENEMIES: Record<StageIndex, EnemyId[]> = {
  1: ["packet-leech", "cable-wraith", "rust-prophet", "scrap-foreman", "scavenger-skiff", "static-nest", "ferric-colossus"],
  2: ["prism-widow", "glass-echo", "wire-weaver", "glass-choir", "coil-serpent", "echo-tender"],
  3: ["gate-sentinel", "null-marshal", "ash-moth", "grave-reaver", "demolition-engine"],
};

export const GUARDIANS: Record<StageIndex, EnemyId> = { 1: "iron-regent", 2: "hollow-choir", 3: "blackout-core" };
