// Shared data contracts between workstreams (contract §9). Owned by the lead; request changes in docs/requests/.
import type {
  AugmentId, CarSlot, DroneId, EnemyId, HazardId, KeelCarId, LampColor, LeadCarId, ModuleId, MusicId, RearCarId,
  ResourceId, SpeciesId, StageIndex, SystemId, WeaponId,
} from "./ids";
import type { DifficultyId } from "../data/difficulty.ts";

// ─── Ship and crew state (campaign ⇄ combat) ────────────────────────────────────────────────────────────────

export type SkillId = "helm" | "engines" | "weapons" | "shields" | "repair" | "combat";

export interface CrewMember {
  id: string; // stable unique id within the run
  name: string;
  species: SpeciesId;
  hp: number; // current; max comes from the species
  /** Experience per skill; level thresholds are defined by the combat workstream (FTL: 2 levels). */
  xp: Record<SkillId, number>;
  /** Preferred room (by room id in the ship layout) where the crew member returns after combat / on load. */
  station?: string;
  /** Current room, independent of the saved return station; persists between relays and fights. */
  room?: string;
  /** Cosmetic variant index for sprites (lamp/coat colours). */
  look: number;
  /** Stats for the game-over/victory screens. */
  kills?: number;
  repairs?: number;
  joinedAt?: string; // stage/relay label, for the crew history
  /** Last consequential voyage incident, retained through refits, combat and saves. */
  memory?: string;
}

export interface SystemState {
  level: number; // max bars purchased
  damage: number; // damaged bars (0..level)
  power: number; // allocated power (persisted between combats, like FTL)
}

/**
 * The tender is a consist of cars: the lead car plus optional rear and keel cars (contract "★ DIRECTION v2.1").
 * Rooms are addressed as "<slot>:<roomId>" (e.g. "lead:helm", "rear:bay") so every car keeps its own layout data.
 */
export interface Consist {
  lead: LeadCarId;
  rear?: RearCarId;
  keel?: KeelCarId;
}

/** A module installed into a socket room ("<slot>:<roomId>" → module). */
export type ModuleMap = Record<string, ModuleId>;

export interface Livery {
  lamp: LampColor;
}

export interface ShipState {
  defId: LeadCarId;
  consist: Consist;
  modules: ModuleMap;
  livery: Livery;
  name: string;
  hull: number;
  hullMax: number;
  reactor: number; // reactor bars
  systems: Partial<Record<SystemId, SystemState>>;
  /** Which room ("<slot>:<roomId>") hosts each purchasable system (drones, veil) — derived from cars/modules. */
  systemRooms: Partial<Record<SystemId, string>>;
  weapons: (WeaponId | null)[]; // mounted, in order; length = weaponSlots
  weaponPower: boolean[]; // which mounted weapons are powered
  weaponSlots: number;
  drones: (DroneId | null)[];
  /** Drones armed at the relay: they launch as the next fight starts (one spare each). */
  dronePower?: boolean[];
  droneSlots: number;
  cargo: (WeaponId | DroneId)[]; // unmounted items (capacity from cars/modules; base 4)
  /** Modules owned but not installed (refit them into sockets at a market or bench). */
  moduleStore: ModuleId[];
  augments: AugmentId[]; // max 3
  crew: CrewMember[];
  /** Stage in which Second Way Home was spent (once per stage). */
  swhStage?: number;
}

export interface Inventory {
  salvage: number;
  ttl: number;
  payloads: number;
  spares: number;
}

// ─── Combat API (implemented by the combat workstream, called by the campaign) ────────────────────────────

export interface RetreatRoute {
  to: number;
  name: string;
  cost: number;
  sealed?: boolean;
}

export interface CombatSetup {
  difficulty?: DifficultyId;
  enemy: EnemyId;
  stage: StageIndex;
  seed: number;
  hazard?: HazardId;
  /** Human crews can surrender; the offer is built by the combat workstream from the reward tier. */
  surrenderable?: boolean;
  boss?: boolean;
  /** Short line shown when the fight begins (from the event). */
  intro?: string;
  music?: MusicId;
  /** Sealed-relay patrols give no rewards. */
  noReward?: boolean;
  /** Relay difficulty scaling within a stage, 0 (start) … 1 (exit). */
  depth: number;
  /** A real linked relay offered for a charged combat departure. Campaign spends the TTL and advances the Seal. */
  retreat?: RetreatRoute;
  /** Linked destinations shown before committing to a combat departure. */
  retreatOptions?: RetreatRoute[];
  scenario?: CombatScenario;
}

export interface CombatScenario {
  objective: "release-duty";
  system: SystemId | "artillery";
  holdSeconds?: number;
  enemyHull?: number;
  enemyDamage?: Partial<Record<SystemId | "artillery", number>>;
  label?: string;
}

export interface CombatResult {
  outcome: "victory" | "fled" | "surrendered" | "defeat" | "escaped";
  resolution?: "destroyed" | "disabled" | "released" | "delivered" | "spared" | "escaped";
  /** The destination confirmed during combat. Campaign applies this departure exactly once. */
  retreatTo?: number;
  /** Machinery bars patched only after securing the berth; hull and crew wounds are retained. */
  systemsPatched?: number;
  /** Actual hull recovered by a coupled workshop after an ordinary secured encounter. */
  hullRecovered?: number;
  ship: ShipState;
  inventory: Inventory;
  /** Rewards already rolled by combat for a victory/surrender (the campaign shows and applies them). */
  reward?: Reward;
  crewLost: { name: string; species: SpeciesId }[];
  stats: { seconds: number; damageDealt: number; damageTaken: number; shotsFired: number; shotsHit: number };
}

export interface Reward {
  resources?: Partial<Record<ResourceId, number>>;
  weapon?: WeaponId;
  drone?: DroneId;
  augment?: AugmentId;
  car?: RearCarId | KeelCarId;
  module?: ModuleId;
  crew?: { species: SpeciesId; name?: string };
}

// ─── Narrative content (writing workstream → campaign runtime) ────────────────────────────────────────────

/** Where an event can be drawn from when a relay is generated. `scripted` events are only reached by id. */
export type EventPool =
  | "event" // ordinary relay event
  | "distress" // unknown signal / distress beacon
  | "combat" // intro text for a hostile encounter (usually leads to a combat outcome)
  | "hazard" // arriving in a hazard relay
  | "bench" // safe rest relay (keeper benches)
  | "market" // arrival text for a market (store opens after)
  | "sealed" // relay overtaken by the Seal
  | "empty" // nothing here: short atmospheric texts
  | "exit" // the stage guardian's relay (one per stage)
  | "scripted";

export interface Condition {
  tender?: LeadCarId;
  /** e.g. { salvage: 30 } — at least this much. */
  resources?: Partial<Record<ResourceId, number>>;
  /** Installed system at least this level (e.g. sensors ≥ 2). */
  system?: { id: SystemId; level: number };
  weapon?: WeaponId | "laser" | "ion" | "beam" | "payload" | "flak";
  drone?: DroneId;
  augment?: AugmentId;
  species?: SpeciesId; // a crew member of this species aboard
  crewMin?: number;
  flag?: string; // run flag set
  notFlag?: string;
  stage?: StageIndex;
  /** A car of this id is coupled, or any car in this slot. */
  car?: RearCarId | KeelCarId | "rear" | "keel";
  /** Nothing coupled in that slot yet (room for a car). */
  carFree?: "rear" | "keel";
  /** This module is installed or in the module stores. */
  module?: ModuleId;
}

export type Range = number | [number, number];

export interface Outcome {
  /** Override this relay's one-time maintenance allocation; false means its stores are inaccessible. */
  maintenance?: number | false;
  text?: string; // shown after the choice
  /** Resource changes (negative = cost/loss). Ranges are rolled. */
  resources?: Partial<Record<ResourceId, Range>>;
  /** Standard FTL-like random reward (salvage + chance of item/resources), scaled by stage and depth. */
  reward?: "low" | "med" | "high";
  weapon?: WeaponId | "random";
  drone?: DroneId | "random";
  augment?: AugmentId | "random";
  /** A car offered for coupling (replaces the car in its slot if the player accepts). */
  car?: RearCarId | KeelCarId | "random-rear" | "random-keel";
  /** A room module (goes to the tender's module stores until refitted into a socket). */
  module?: ModuleId | "random";
  crewJoin?: { species: SpeciesId | "random"; name?: string };
  /** A crew member is lost ("random" or the first of a species). */
  crewLoss?: "random" | SpeciesId;
  /** Damage to every crew member (or `one` random). */
  crewDamage?: { amount: number; who: "all" | "one" };
  systemDamage?: { system: SystemId | "random"; amount: number };
  /** Start a fight. When it is won, `onWin` (event id) runs if given, else the standard reward screen. */
  combat?: {
    enemy: EnemyId;
    surrenderable?: boolean;
    noReward?: boolean;
    intro?: string;
    onWin?: string;
    onSurrender?: string;
    scenario?: CombatScenario;
  };
  store?: boolean; // open the store after the text
  next?: string; // continue with another event id
  flags?: string[]; // set run flags
  clearFlags?: string[];
  fragment?: string; // unlock a message fragment (FragmentDef.id)
  codex?: string; // unlock a codex entry (CodexEntry.id)
  revealMap?: boolean; // reveal the whole stage map
  /** Push the Seal back (positive) or pull it forward (negative), in hops. */
  seal?: number;
  /** Repair hull fully / by amount. */
  repair?: number | "full";
  /** Heal crew fully. */
  heal?: boolean;
}

export interface WeightedOutcome {
  weight?: number; // default 1
  /** Preparation changes the odds without promising that an uncertain action succeeds. */
  modifiers?: { when: Condition; multiply: number }[];
  outcome: Outcome;
}

export interface ChoiceDef {
  text: string;
  req?: Condition;
  /** FTL "blue option": highlighted, labelled with its requirement (e.g. "[Listening Post]"). */
  blue?: boolean;
  /** Hide the choice when the requirement is not met (default: blue options hidden, others shown disabled). */
  hideIfUnmet?: boolean;
  outcomes: WeightedOutcome[];
}

export interface EventDef {
  /** Named participant required by this event's bodily actions or expertise. Human excludes riggers. */
  cast?: "human" | SpeciesId;
  id: string;
  pool: EventPool;
  /** Stages where the event can appear (random pools). */
  stages?: StageIndex[];
  weight?: number; // default 1
  /** An interception opens in combat immediately; choices are not presented. */
  directCombat?: Outcome["combat"];
  maintenance?: number | false;
  /** Quiet stop: preserve its text at the relay without opening a decision window. */
  glimpse?: boolean;
  /** Fixed arrival consequence, applied once before any choices. */
  arrival?: Outcome;
  unique?: boolean; // at most once per run
  requires?: Condition;
  /** For `hazard`-pool events: the hazard this arrival text describes. */
  hazard?: HazardId;
  title?: string; // small header plate
  art?: string; // public/art/events/<art>.png (320×160)
  portrait?: string; // public/art/portraits/<portrait>.png (96×96)
  speaker?: string;
  /**
   * Body text. Placeholders: {ship} (tender name), {crew} (a random crew name), {crew:<species>} (a crew member of
   * that species, used only when a matching `req`/`requires` guarantees one), {stage} (stage name), {ttl}.
   */
  text: string;
  choices: ChoiceDef[];
  music?: MusicId;
}

export interface FragmentDef {
  id: string;
  stage: StageIndex;
  kind: "queue" | "ground" | "teal"; // evacuation queue / sent up from the Ground / the evening radio calls
  from: string; // sender label as the queue shows it
  to: string;
  text: string;
}

export interface CodexEntry {
  id: string;
  category: "world" | "people" | "places" | "machines" | "runbook" | "tender";
  title: string;
  text: string;
  art?: string; // any art path under public/art/
  /** Unlocked from the start, or by an outcome's `codex` field, or by meeting an enemy (`enemy:<id>`). */
  unlock: "start" | "outcome" | `enemy:${EnemyId}`;
}

export interface ScriptBeat {
  speaker?: string;
  portrait?: string;
  art?: string; // background art (480×270) or event art
  text: string;
  music?: MusicId;
  sfx?: string;
}
