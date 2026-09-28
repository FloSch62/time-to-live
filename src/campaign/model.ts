// Run state of a voyage (campaign workstream). Plain JSON-serialisable data: the whole RunState is the save file.
// Pure module: no DOM, explicit .ts imports (node --test).
import type {
  AugmentId, DroneId, EnemyId, HazardId, ResourceId, SpeciesId, StageIndex, WeaponId,
} from "../game/ids.ts";
import type { CombatResult, CombatScenario, Inventory, ShipState } from "../game/types.ts";
import type { DifficultyId } from "../data/difficulty.ts";

export const SAVE_VERSION = 1;

/** Relay kinds on the stage map (contract §3.2). `start` is the stage's arrival relay (quiet, already resolved). */
export type RelayType = "start" | "combat" | "event" | "distress" | "market" | "hazard" | "bench" | "empty" | "exit";

/** A combat that was fled and is still waiting at the relay (FTL: the ship is still there when you come back). */
export interface PendingCombat {
  enemy: EnemyId;
  surrenderable?: boolean;
  noReward?: boolean;
  intro?: string;
  onWin?: string;
  onSurrender?: string;
  boss?: boolean;
  scenario?: CombatScenario;
}

export interface StoreItem {
  kind: "weapon" | "drone" | "augment" | "crew" | "system" | "car" | "module";
  id: string; // WeaponId | DroneId | AugmentId | SpeciesId | SystemId | car id | ModuleId
  price: number;
  sold?: boolean;
  /** Crew for hire keep a rolled name. */
  name?: string;
}

export interface StoreStock {
  items: StoreItem[];
  /** Supplies left in stock. */
  ttl: number;
  payloads: number;
  spares: number;
  /** Price per unit. */
  prices: { ttl: number; payloads: number; spares: number; hull: number };
  /** Pell's stall (Stage I, when the market event says so). */
  pell?: boolean;
}

export interface Relay {
  /** One-time maintenance stores recovered after clearing this relay. Persisted to prevent farming. */
  serviceSalvage?: number;
  /** Overrides the stage service allocation, including an explicit inaccessible-store loss. */
  maintenance?: number | false;
  /** Authored patrol territory: arrival goes directly to a robotic interception. */
  interception?: boolean;
  glimpse?: { title?: string; text: string };
  /** Set before applying a fixed arrival loss, so a restored/revisited relay cannot repeat it. */
  arrivalApplied?: boolean;
  /** Fixed arrivals already applied on this relay, including later events in an aftermath chain. */
  arrivalAppliedIds?: string[];
  id: number;
  x: number; // chart pixels (0..CHART_W)
  y: number;
  links: number[];
  type: RelayType;
  hazard?: HazardId;
  name: string;
  /** 0/1: which of the stage's two themes plays here. */
  theme: 0 | 1;
  /** Which stage backdrop (a/b/c) the relay view uses. */
  bg: 0 | 1 | 2;
  visited: boolean;
  /** Event assigned on first arrival (deterministic from the seed). */
  eventId?: string;
  /** The relay's encounter is over (nothing left to do but hop). */
  resolved: boolean;
  /** The actual result of the last confrontation here; clearing a menu does not restore a machine. */
  resolution?: CombatResult["resolution"];
  systemsPatched?: number;
  hullRecovered?: number;
  pendingCombat?: PendingCombat;
  store?: StoreStock;
  /** The player fled a fight here and has not left yet (the hub opens instead of the fight). */
  fledHere?: boolean;
  /** The relay was sealed the last time the player arrived (a fresh patrol greets each arrival). */
  sealedVisit?: boolean;
}

export interface StageMap {
  stage: StageIndex;
  w: number;
  h: number;
  relays: Relay[];
  start: number;
  exit: number;
  /** The Seal's front in chart x; relays left of it are sealed. Starts off-map. */
  sealX: number;
  /** Chart pixels the Seal advances per hop. */
  sealStep: number;
  /** Shortest start→exit hops (for the TTL margin). */
  shortest: number;
  revealed: boolean;
}

export interface RouteEntry {
  stage: StageIndex;
  relay: number;
  name: string;
  type: RelayType;
  sealed?: boolean;
}

export interface RunStats {
  hops: number;
  relaysVisited: number;
  machinesStopped: number;
  /** Human-crewed vessels defeated; distinct from autonomous machines stopped. Optional for old saves. */
  humanFightsWon?: number;
  shipsSpared: number;
  fightsFled: number;
  salvageEarned: number;
  salvageSpent: number;
  crewLost: { name: string; species: SpeciesId }[];
  crewJoined: number;
  eventsSeen: number;
  damageDealt: number;
  damageTaken: number;
  waits: number;
  seconds: number;
  itemsFound: number;
}

export interface RunState {
  difficulty: DifficultyId;
  version: number;
  seed: number;
  /** Main generator state (sfc32). */
  rng: [number, number, number, number];
  stage: StageIndex;
  map: StageMap;
  pos: number;
  ship: ShipState;
  inv: Inventory;
  flags: string[];
  fragments: string[];
  codex: string[];
  /** Unique events already used this run. */
  usedEvents: string[];
  stats: RunStats;
  route: RouteEntry[];
  /** Enemies met this run (codex `enemy:<id>` unlocks). */
  met: EnemyId[];
  nextCrewId: number;
  /** Counter for combat seeds. */
  fights: number;
  /** Current stage's guardian beaten (stage transition pending). */
  guardianBeaten: boolean;
  /** How the run ended (set when it is over). */
  ended?: "victory" | "defeat";
  startedAt: number;
  /** Stage history for the summary. */
  stagesCleared: number;
  /** Items obtained this run (weapons/drones/augments), for the summary. */
  found: (WeaponId | DroneId | AugmentId)[];
}

export type ItemId = WeaponId | DroneId | AugmentId;

export const RESOURCE_KEYS: readonly ResourceId[] = ["salvage", "ttl", "payloads", "spares", "hull"];

export function emptyStats(): RunStats {
  return {
    hops: 0, relaysVisited: 0, machinesStopped: 0, humanFightsWon: 0, shipsSpared: 0, fightsFled: 0, salvageEarned: 0, salvageSpent: 0,
    crewLost: [], crewJoined: 0, eventsSeen: 0, damageDealt: 0, damageTaken: 0, waits: 0, seconds: 0, itemsFound: 0,
  };
}

export function currentRelay(run: RunState): Relay {
  return run.map.relays[run.pos];
}

export function isSealed(map: StageMap, r: Relay): boolean {
  return r.id !== map.exit && r.x < map.sealX;
}

export function hasFlag(run: RunState, f: string): boolean {
  return run.flags.includes(f);
}

export function setFlag(run: RunState, f: string) {
  if (!run.flags.includes(f)) run.flags.push(f);
}

export function clearFlag(run: RunState, f: string) {
  run.flags = run.flags.filter((x) => x !== f);
}

/** Relay depth within the stage, 0 (start) … 1 (exit), from its x position. */
export function relayDepth(map: StageMap, r: Relay): number {
  const s = map.relays[map.start];
  const e = map.relays[map.exit];
  return Math.max(0, Math.min(1, (r.x - s.x) / Math.max(1, e.x - s.x)));
}
