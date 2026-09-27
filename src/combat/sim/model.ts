// Combat sim data model. Pure (no DOM). Coordinates inside a ship are in TILES (floats), origin at the top-left of
// the ship's room grid; each grid row is one deck (★v2 side view). The renderer maps tiles to pixels (TILE 32).
import type { AugmentId, CarId, CarSlot, EnemyId, HazardId, ModuleId, StageIndex } from "../../game/ids.ts";
import type { CrewMember, SkillId } from "../../game/types.ts";
import type { Dir, SysKey } from "../../data/layouts.ts";
import type { WeaponDef } from "../../data/weapons.ts";
import type { DroneDef } from "../../data/drones.ts";
import type { ScaledEnemy } from "../../data/enemies.ts";

export type Side = 0 | 1; // 0 = player, 1 = enemy
export const other = (s: Side): Side => (s === 0 ? 1 : 0);

export interface SimSystem {
  id: SysKey;
  room: number;
  level: number;
  /** Damaged bars. */
  damage: number;
  /** Reactor bars drawn (main systems) — subsystems/specials keep power = usable automatically. */
  power: number;
  /** What the crew last asked for: power returns automatically after repair/ion (FTL). */
  want: number;
  /** Ion-locked bars and the seconds until the next one clears. */
  ion: number;
  ionT: number;
  /** Repair progress towards removing one damaged bar (0…1). */
  repair: number;
  /** Damage progress from fire/sabotage towards one more damaged bar (0…1). */
  wear: number;
  /** Free power from bellmakers tuning the room. */
  bonus: number;
  /** Rust (hazard) lock visual timer. */
  rust: number;
}

export interface SimRoom {
  /** A shared service cage; riders queue at landings. Position is in tile coordinates. */
  lift?: { y: number; rider: number | null };
  i: number;
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sys: SimSystem | null;
  /** Air 0…100. */
  o2: number;
  station: number; // tile index or -1
  stationDir: Dir | null;
  tiles: number[];
  /** Crew heal slowly here (HP/s): bunk-car bench, kettle-bench module. */
  bench: number;
  /** Module installed in this socket room (player). */
  module?: ModuleId;
}

export interface SimDoor {
  i: number;
  /** Room indices on each side; -1 = outside (airlock). */
  a: number;
  b: number;
  /** Tile indices on each side (b = -1 for airlocks). */
  ta: number;
  tb: number;
  /** Door geometry in tiles: the wall segment it sits in. */
  x: number;
  y: number;
  /** Hatch = in a floor/ceiling (vertical neighbours, ladder); otherwise a door in a wall. */
  hatch: boolean;
  airlock: boolean;
  open: boolean;
  /** Seconds a passing crew member keeps it open. */
  held: number;
  hp: number;
  /** Seconds it stays forced open after boarders broke it. */
  broken: number;
  /** 0 closed … 1 open (animation). */
  anim: number;
  /** Connects two cars of the consist (gangway door / keel hatch). */
  gangway: boolean;
  /** Airlocks: which outer edge. */
  side?: Dir;
}

export type CrewKind = "crew" | "boarder" | "escort" | "crawler";
export type Task = "idle" | "walk" | "man" | "repair" | "fire" | "breach" | "fight" | "sabotage" | "door" | "cut";

export interface SimCrew {
  uid: number;
  id: string;
  name: string;
  kind: CrewKind;
  /** Species id, boarder id, "escort" or "crawler". */
  species: string;
  /** Owner side. */
  side: Side;
  /** Ship the crew member stands on. */
  ship: Side;
  hp: number;
  maxHp: number;
  /** Position in tiles (tile centre = tx + 0.5, ty + 0.5). */
  x: number;
  y: number;
  tile: number;
  path: number[];
  /** Destination tile (-1 none). */
  dest: number;
  task: Task;
  target: number;
  move: number;
  repair: number;
  combat: number;
  breathes: boolean;
  fireMul: number;
  learn: number;
  medbay: boolean;
  armour: number;
  sabotage: number;
  doorCut: number;
  breacher: boolean;
  xp: Record<SkillId, number>;
  /** Saved station: room index (-1 none). */
  stationRoom: number;
  dead: boolean;
  deadT: number;
  facing: 1 | -1;
  climbing: boolean;
  /** Seconds in the current task (for sabotage/cut timers and animations). */
  taskT: number;
  kills: number;
  repairs: number;
  /** Heal/damage flash timers for the renderer. */
  hurtT: number;
  healT: number;
  member?: CrewMember;
  /** AI: seconds until the next decision. */
  think: number;
  /** Ordered by the player/AI to this room (keeps them from wandering). */
  orderRoom: number;
}

export type Target =
  | { kind: "room"; room: number }
  | { kind: "adj"; i: number }
  | { kind: "beam"; x0: number; y0: number; x1: number; y1: number };

export interface SimWeapon {
  def: WeaponDef;
  slot: number;
  powered: boolean;
  /** Crew wants it powered (restored automatically after repair). */
  want: boolean;
  charge: number;
  target: Target | null;
  chain: number;
  /** Shots left in the volley being fired, the gap timer, and the volley's target. */
  queue: number;
  queueT: number;
  volley: number;
  volleyTarget: Target | null;
  /** Seconds since the last shot (renderer: firing animation). */
  fired: number;
  /** Artillery room system this weapon is bound to (bosses). */
  art: SimSystem | null;
  /** Boss rotation: only the active step charges. */
  active: boolean;
}

export type ProjKind = "laser" | "ion" | "payload" | "flak" | "debris" | "drone" | "crawler" | "seal";

export interface Projectile {
  id: number;
  /** -1 = hazard (debris). */
  from: Side | -1;
  to: Side;
  kind: ProjKind;
  def: WeaponDef | null;
  dmg: number;
  ion: number;
  fire: number;
  breach: number;
  crewDmg: number;
  sysBonus: number;
  target: Target;
  /** Aim point in the target ship's tiles. */
  px: number;
  py: number;
  /** Start point: shooter weapon slot (mount) or, for drones/adjuncts, a point in the target ship's tiles. */
  mount: number;
  sx?: number;
  sy?: number;
  /** Source ship tiles start point (for leg 1). */
  ox?: number;
  oy?: number;
  t: number;
  /** Leg 1 (leaving the shooter) and leg 2 (arriving) durations. */
  t1: number;
  t2: number;
  volley: number;
  /** Distinct damage route for the Iron Regent's gate (weapon slot / drone). */
  source: string;
  dead: boolean;
  /** Set when a defence drone has claimed it. */
  claimed: boolean;
  /** Visual colour family. */
  color: string;
}

export interface BeamShot {
  id: number;
  from: Side;
  to: Side;
  def: WeaponDef;
  slot: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  /** Seconds before the sweep starts (the beam crossing the gap). */
  delay: number;
  dur: number;
  hit: number[];
  started: boolean;
  /** Damage per room after shields, decided at sweep start. */
  dmg: number;
  ion: number;
  blocked: boolean;
  missed: boolean;
  volley: number;
  source: string;
  done: boolean;
  /** Current sweep point (tiles in the target ship) for the renderer. */
  cx: number;
  cy: number;
}

export interface SimDrone {
  def: DroneDef;
  slot: number;
  side: Side;
  /** Deployed and alive. */
  out: boolean;
  powered: boolean;
  want: boolean;
  /** Which ship's space it flies around. */
  at: Side;
  x: number;
  y: number;
  ang: number;
  cd: number;
  /** Repair drone: hull repaired so far. */
  used: number;
  /** Launch animation / flight time (0…1). */
  launch: number;
  /** Crawler: uid of its body once aboard (-1 none). */
  body: number;
  /** Stunned by ion (seconds). */
  stun: number;
  /** Deployed this fight (for Drone Recovery). */
  deployed: number;
}

export interface SimAdjunct {
  kind: "gate-warden" | "sealing-drone";
  i: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  /** Hidden until a phase raises it. */
  active: boolean;
  evasion: number;
  /** Position in the owner ship's tiles (outside the grid). */
  x: number;
  y: number;
  hx: number;
  hy: number;
  cd: number;
  stun: number;
  hitT: number;
}

export interface BossState {
  gate?: { up: boolean; downT: number; locks: { source: string; t: number }[]; repairT: number };
  glass?: { up: boolean; downT: number; hits: number[] };
  core?: { phase: 1 | 2 | 3; step: number; phaseT: number };
}

export interface SimShip {
  side: Side;
  defId: string;
  name: string;
  face: "left" | "right";
  cols: number;
  rows: number;
  rooms: SimRoom[];
  tileRoom: Int16Array;
  fire: Float32Array;
  breach: Float32Array;
  doors: SimDoor[];
  /** Door index lookup by tile pair key. */
  doorAt: Map<string, number>;
  systems: SimSystem[];
  sys: Partial<Record<SysKey, SimSystem>>;
  reactor: number;
  hull: number;
  hullMax: number;
  weapons: SimWeapon[];
  drones: SimDrone[];
  shields: number;
  shieldT: number;
  /** Hop drive / handshake charge 0…1 (player) or escape charge (fleeing humans). */
  hop: number;
  veilT: number;
  veilCd: number;
  evasion: number;
  augments: AugmentId[];
  /** Player: inventory payloads/spares (enemies: unlimited). */
  payloads: number;
  spares: number;
  kind: "player" | "machine" | "human" | "autopilot";
  mobility: "player" | "crawler" | "installation" | "flier";
  enemy?: ScaledEnemy;
  adjuncts: SimAdjunct[];
  boss: BossState;
  dead: boolean;
  deadT: number;
  /** Fleeing (humans): charging the hop to escape. */
  fleeing: boolean;
  /** Weapons charge multiplier (boss phases). */
  chargeMul: number;
  /** Extra shield layers (sealing drones around the Core). */
  bonusLayers: number;
  /** AI timers (decisions, guardian volley hold). */
  aiT: number;
  holdT: number;
  /** Enemy salvo gate: weapons may fire. */
  salvoOk: boolean;
  broodT: number;
  /** Seconds since the last hull hit (renderer flash). */
  hitT: number;
  /** Player consist: car of each tile (-1 none) and car placements in the composite grid. */
  tileCar: Int8Array | null;
  cars?: { slot: CarSlot; id: CarId; ox: number; oy: number; cols: number; rows: number }[];
  /** Consist/module modifiers: +sensors levels, +repair speed, air decay multiplier, evasion change. */
  mods: { sensors: number; repair: number; airDecay: number; evasion: number };
}

export interface SimEvent {
  type: string;
  side?: Side;
  x?: number;
  y?: number;
  room?: number;
  n?: number;
  kind?: string;
  text?: string;
  uid?: number;
  slot?: number;
}

export interface CombatStats {
  seconds: number;
  damageDealt: number;
  damageTaken: number;
  shotsFired: number;
  shotsHit: number;
}

export interface SimSetup {
  enemy: EnemyId;
  stage: StageIndex;
  seed: number;
  depth: number;
  hazard?: HazardId;
  boss?: boolean;
  surrenderable?: boolean;
  noReward?: boolean;
}

export const DT = 1 / 60;

export const tileIndex = (s: { cols: number }, x: number, y: number) => y * s.cols + x;
