// Item catalog used by the campaign (store prices, rarity, reward rolls, system upgrade costs, names).
// Names and descriptions come from the writing workstream's flavor.ts. Numbers start from a baseline table
// (FTL-like) and are replaced by the combat workstream's src/data exports at boot (see data-adapter.ts).
// Pure module.
import {
  AUGMENT_IDS, DRONE_IDS, ENEMY_IDS, SPECIES_IDS, SYSTEM_IDS, WEAPON_IDS,
  type AugmentId, type DroneId, type EnemyId, type SpeciesId, type StageIndex, type SystemId, type WeaponId,
} from "../game/ids.ts";
import type { Reward } from "../game/types.ts";
import {
  AUGMENT_FLAVOR, DRONE_FLAVOR, ENEMY_FLAVOR, SPECIES_FLAVOR, SYSTEM_FLAVOR, WEAPON_FLAVOR,
} from "../content/flavor.ts";
import { WEAPONS } from "../data/weapons.ts";
import { DRONES } from "../data/drones.ts";
import { AUGMENTS } from "../data/augments.ts";
import { SYSTEMS, MAX_REACTOR, reactorCost as dataReactorCost } from "../data/systems.ts";
import { SPECIES } from "../data/species.ts";
import { ENEMIES, STAGE_ENEMIES, GUARDIANS } from "../data/enemies.ts";

export type WeaponType = "laser" | "ion" | "beam" | "payload" | "flak";

export interface ItemInfo {
  id: string;
  kind: "weapon" | "drone" | "augment";
  name: string;
  desc: string;
  lore: string;
  price: number;
  /** 1 common … 5 very rare. */
  rarity: number;
  wtype?: WeaponType;
  power?: number;
  /** Payloads per shot (payload weapons). */
  ammo?: number;
  /** Extra numbers for cards (damage, shots, charge). */
  stats?: string;
  /** Only in rewards/events, never in stores. */
  noStore?: boolean;
  /** Earliest stage it may show up in random rolls. */
  minStage?: StageIndex;
}

export interface SystemInfo {
  id: SystemId;
  name: string;
  desc: string;
  max: number;
  /** cost[L] = salvage to go from level L to L+1 (index 0 unused for owned systems). */
  upgrade: number[];
  /** Store price to install the system at level 1 (purchasable systems). */
  buy?: number;
  /** Level a purchased system starts at. */
  buyLevel?: number;
  subsystem?: boolean;
  /** What each level does (index = level). */
  levels?: string[];
}

export interface SpeciesInfo {
  id: SpeciesId;
  name: string;
  desc: string;
  hp: number;
  price: number;
  hireable: boolean;
  special?: string;
}

export interface Catalog {
  weapons: Record<WeaponId, ItemInfo>;
  drones: Record<DroneId, ItemInfo>;
  augments: Record<AugmentId, ItemInfo>;
  systems: Record<SystemId, SystemInfo>;
  species: Record<SpeciesId, SpeciesInfo>;
  reactorMax: number;
  reactorCost(bars: number): number;
  enemiesByStage: Record<StageIndex, EnemyId[]>;
  elites: EnemyId[];
  humans: EnemyId[];
  guardians: Record<StageIndex, EnemyId>;
  /** Optional reward roller from src/data (tier, stage, depth, seed) → Reward. */
  rollReward?: (tier: "low" | "med" | "high", stage: StageIndex, depth: number, seed: number) => Reward;
  /** Where the data came from (debug overlay). */
  source: "baseline" | "data";
}

type Base = [price: number, rarity: number, extra?: Partial<ItemInfo>];

const WEAPON_BASE: Record<WeaponId, Base> = {
  "packet-laser": [30, 1, { wtype: "laser", power: 1, stats: "1 dmg × 1 · 9 s" }],
  "burst-emitter": [50, 1, { wtype: "laser", power: 2, stats: "1 dmg × 2 · 12 s" }],
  "triple-burst": [80, 3, { wtype: "laser", power: 2, stats: "1 dmg × 3 · 12 s" }],
  "jumbo-frame": [55, 2, { wtype: "laser", power: 1, stats: "2 dmg × 1 · 9 s" }],
  "jumbo-frame-ii": [85, 3, { wtype: "laser", power: 3, stats: "2 dmg × 2 · 13 s", minStage: 2 }],
  "multicast-array": [120, 4, { wtype: "laser", power: 4, stats: "1 dmg × 5 · 19 s", minStage: 2 }],
  jammer: [30, 1, { wtype: "ion", power: 1, stats: "ion 1 · 8 s" }],
  "flood-cannon": [70, 3, { wtype: "ion", power: 3, stats: "ion 2 · 13 s" }],
  "fiber-lance": [50, 2, { wtype: "beam", power: 2, stats: "beam 1/room · 12 s" }],
  "trunk-lance": [90, 3, { wtype: "beam", power: 3, stats: "beam 2/room · 17 s", minStage: 2 }],
  "payload-launcher": [45, 1, { wtype: "payload", power: 1, ammo: 1, stats: "3 dmg · 11 s · 1 payload" }],
  "breach-spike": [80, 3, { wtype: "payload", power: 3, ammo: 1, stats: "4 dmg · 22 s · breach" }],
  "thermite-payload": [50, 2, { wtype: "payload", power: 1, ammo: 1, stats: "1 dmg · 10 s · fire" }],
  "scatter-shot": [65, 2, { wtype: "flak", power: 2, stats: "1 dmg × 3 · 10 s" }],
  "heartpulse-chain": [95, 4, { wtype: "laser", power: 2, stats: "1 dmg × 2 · 16 s → faster", minStage: 2 }],
  "cathedral-chime": [110, 5, { wtype: "beam", power: 3, stats: "beam 1/room + ion · 16 s", minStage: 2 }],
};

const DRONE_BASE: Record<DroneId, Base> = {
  "firewall-drone": [50, 2, { power: 2, stats: "defence · shoots payloads" }],
  "relay-drone": [50, 1, { power: 2, stats: "combat · laser" }],
  "rigger-drone": [45, 2, { power: 1, stats: "repair · 1 use" }],
  "bulwark-drone": [55, 3, { power: 2, stats: "defence · anti-drone" }],
  "crawler-drone": [60, 3, { power: 3, stats: "boarding · sabotage" }],
};

const AUGMENT_BASE: Record<AugmentId, Base> = {
  "startup-config": [30, 1],
  "hot-swap-rig": [50, 2],
  "vargas-crimper": [55, 2],
  "harrows-kettle": [45, 2],
  "salvage-arm": [50, 1],
  "listening-horn": [40, 1],
  "brass-plating": [70, 3],
  "sprinkler-runbook": [35, 1],
  "bench-kit": [60, 2],
  "lamp-dark-coating": [45, 2],
  "second-way-home": [90, 4],
  keepalive: [60, 3],
  "drone-recovery": [45, 3],
  "wireshark-tap": [40, 2],
};

const SYSTEM_BASE: Record<SystemId, { max: number; upgrade: number[]; buy?: number; subsystem?: boolean }> = {
  shields: { max: 8, upgrade: [0, 60, 80, 60, 110, 90, 140, 160] },
  engines: { max: 8, upgrade: [0, 10, 15, 30, 40, 60, 80, 120] },
  weapons: { max: 8, upgrade: [0, 40, 25, 35, 50, 75, 90, 100] },
  air: { max: 3, upgrade: [0, 25, 50] },
  medbay: { max: 3, upgrade: [0, 35, 45] },
  helm: { max: 3, upgrade: [0, 20, 50], subsystem: true },
  sensors: { max: 4, upgrade: [0, 25, 40, 55], subsystem: true },
  doors: { max: 3, upgrade: [0, 35, 50], subsystem: true },
  drones: { max: 8, upgrade: [0, 10, 20, 30, 45, 60, 80, 100], buy: 60 },
  veil: { max: 3, upgrade: [0, 30, 60], buy: 150 },
};

const SPECIES_BASE: Record<SpeciesId, [hp: number, price: number, hireable: boolean]> = {
  linefolk: [100, 45, true],
  warden: [130, 55, true],
  rigger: [90, 50, true],
  courier: [80, 45, true],
  bellmaker: [70, 60, false],
};

function items<K extends string>(ids: readonly K[], kind: ItemInfo["kind"], base: Record<K, Base>, fl: Record<K, { name: string; desc: string; lore: string }>): Record<K, ItemInfo> {
  const out = {} as Record<K, ItemInfo>;
  for (const id of ids) {
    const [price, rarity, extra] = base[id];
    const f = fl?.[id];
    out[id] = { id, kind, name: f?.name ?? titleCase(id), desc: f?.desc ?? "", lore: f?.lore ?? "", price, rarity, ...(extra ?? {}) };
  }
  return out;
}

export function titleCase(id: string): string {
  return id.split("-").map((w) => w.slice(0, 1).toUpperCase() + w.slice(1)).join(" ");
}

function baseline(): Catalog {
  const systems = {} as Record<SystemId, SystemInfo>;
  for (const id of SYSTEM_IDS) {
    const b = SYSTEM_BASE[id];
    const f = SYSTEM_FLAVOR?.[id];
    systems[id] = { id, name: f?.name ?? titleCase(id), desc: f?.desc ?? "", ...b };
  }
  const species = {} as Record<SpeciesId, SpeciesInfo>;
  for (const id of SPECIES_IDS) {
    const [hp, price, hireable] = SPECIES_BASE[id];
    const f = SPECIES_FLAVOR?.[id];
    species[id] = { id, name: f?.name ?? titleCase(id), desc: f?.desc ?? "", hp, price, hireable };
  }
  return {
    weapons: items(WEAPON_IDS, "weapon", WEAPON_BASE, WEAPON_FLAVOR),
    drones: items(DRONE_IDS, "drone", DRONE_BASE, DRONE_FLAVOR),
    augments: items(AUGMENT_IDS, "augment", AUGMENT_BASE, AUGMENT_FLAVOR),
    systems,
    species,
    reactorMax: 25,
    reactorCost: (bars: number) => 30 + 5 * Math.max(0, Math.floor((bars - 8) / 2)),
    enemiesByStage: {
      1: ["packet-leech", "cable-wraith", "rust-prophet", "scrap-foreman", "scavenger-skiff", "static-nest"],
      2: ["prism-widow", "glass-echo", "wire-weaver", "glass-choir", "coil-serpent", "echo-tender"],
      3: ["gate-sentinel", "null-marshal", "ash-moth", "grave-reaver"],
    },
    elites: ["ferric-colossus", "demolition-engine"],
    humans: ["scavenger-skiff"],
    guardians: { 1: "iron-regent", 2: "hollow-choir", 3: "blackout-core" },
    source: "baseline",
  };
}

/** Numbers from the combat workstream's src/data (names/descriptions still prefer the writing's flavor.ts). */
function fromData(c: Catalog): Catalog {
  const fl = (rec: Record<string, { name: string; desc: string; lore: string }> | undefined, id: string) => rec?.[id];
  for (const id of WEAPON_IDS) {
    const d = WEAPONS?.[id];
    if (!d) continue;
    const f = fl(WEAPON_FLAVOR, id);
    const dmg = d.type === "ion" ? `ion ${d.ion ?? d.damage}` : d.type === "beam" ? `beam ${d.damage}/room` : `${d.damage} dmg × ${d.shots}`;
    c.weapons[id] = {
      ...c.weapons[id], name: f?.name ?? d.name, desc: f?.desc ?? d.desc, price: d.cost || c.weapons[id].price,
      rarity: d.rarity + 1, wtype: d.type, power: d.power, ammo: d.ammo, minStage: d.stageMin, noStore: d.cost === 0,
      stats: `${dmg} · ${d.charge}s · ${d.power} power${d.ammo ? " · 1 payload" : ""}`,
    };
  }
  for (const id of DRONE_IDS) {
    const d = DRONES?.[id];
    if (!d) continue;
    const f = fl(DRONE_FLAVOR, id);
    c.drones[id] = {
      ...c.drones[id], name: f?.name ?? d.name, desc: f?.desc ?? d.desc, price: d.cost, rarity: d.rarity + 1, power: d.power,
      minStage: d.stageMin, stats: `${d.kind} · ${d.power} power · 1 spare per launch`,
    };
  }
  for (const id of AUGMENT_IDS) {
    const d = AUGMENTS?.[id];
    if (!d) continue;
    const f = fl(AUGMENT_FLAVOR, id);
    c.augments[id] = { ...c.augments[id], name: f?.name ?? d.name, desc: f?.desc ?? d.desc, price: d.cost, rarity: d.rarity + 1 };
  }
  for (const id of SYSTEM_IDS) {
    const d = SYSTEMS?.[id];
    if (!d) continue;
    const f = SYSTEM_FLAVOR?.[id];
    // data: cost[L] = price to reach level L; ours: upgrade[L] = price to go from L to L+1.
    const upgrade = Array.from({ length: d.maxLevel }, (_, L) => d.cost[L + 1] ?? 0);
    c.systems[id] = {
      id, name: f?.name ?? d.name, desc: f?.desc ?? d.desc, max: d.maxLevel, upgrade, buy: d.purchasable ? d.buyCost : undefined,
      buyLevel: d.buyLevel, subsystem: d.subsystem, levels: d.levels,
    };
  }
  for (const id of SPECIES_IDS) {
    const d = SPECIES?.[id];
    if (!d) continue;
    c.species[id] = { ...c.species[id], hp: d.hp, special: d.special };
  }
  if (MAX_REACTOR) c.reactorMax = MAX_REACTOR;
  if (dataReactorCost) c.reactorCost = dataReactorCost;
  if (STAGE_ENEMIES && ENEMIES) {
    const elites = Object.values(ENEMIES).filter((e) => e.elite).map((e) => e.id);
    c.elites = elites;
    c.humans = Object.values(ENEMIES).filter((e) => e.kind === "human").map((e) => e.id);
    c.enemiesByStage = {
      1: STAGE_ENEMIES[1].filter((e) => !elites.includes(e)),
      2: STAGE_ENEMIES[2].filter((e) => !elites.includes(e)),
      3: STAGE_ENEMIES[3].filter((e) => !elites.includes(e)),
    };
  }
  if (GUARDIANS) c.guardians = { ...GUARDIANS };
  c.source = "data";
  return c;
}

export const catalog: Catalog = fromData(baseline());

/** Merge numbers from src/data (partial records are fine). */
export function patchCatalog(p: Partial<Catalog>) {
  for (const k of ["weapons", "drones", "augments", "systems", "species"] as const) {
    const src = p[k] as Record<string, object> | undefined;
    if (!src) continue;
    const dst = catalog[k] as Record<string, object>;
    for (const [id, v] of Object.entries(src)) dst[id] = { ...(dst[id] ?? {}), ...v };
  }
  if (p.reactorCost) catalog.reactorCost = p.reactorCost;
  if (p.reactorMax) catalog.reactorMax = p.reactorMax;
  if (p.enemiesByStage) catalog.enemiesByStage = p.enemiesByStage;
  if (p.elites) catalog.elites = p.elites;
  if (p.humans) catalog.humans = p.humans;
  if (p.rollReward) catalog.rollReward = p.rollReward;
  if (p.source) catalog.source = p.source;
}

export function itemInfo(id: string): ItemInfo | null {
  return (
    (catalog.weapons as Record<string, ItemInfo>)[id] ??
    (catalog.drones as Record<string, ItemInfo>)[id] ??
    (catalog.augments as Record<string, ItemInfo>)[id] ??
    null
  );
}

export function itemKind(id: string): "weapon" | "drone" | "augment" | null {
  if ((WEAPON_IDS as readonly string[]).includes(id)) return "weapon";
  if ((DRONE_IDS as readonly string[]).includes(id)) return "drone";
  if ((AUGMENT_IDS as readonly string[]).includes(id)) return "augment";
  return null;
}

export function itemName(id: string): string {
  return itemInfo(id)?.name ?? titleCase(id);
}

export function enemyName(id: string): string {
  return (ENEMY_FLAVOR as Record<string, { name: string }>)?.[id]?.name ?? titleCase(id);
}

export function isEnemyId(id: string): id is EnemyId {
  return (ENEMY_IDS as readonly string[]).includes(id);
}

export function sellPrice(id: string): number {
  return Math.floor((itemInfo(id)?.price ?? 20) / 2);
}

export function isHuman(enemy: EnemyId): boolean {
  return catalog.humans.includes(enemy);
}

export function isGuardian(enemy: EnemyId): boolean {
  return Object.values(catalog.guardians).includes(enemy);
}

/** Rarity weights by stage: rarity 1..5. */
const RARITY_WEIGHT: Record<StageIndex, number[]> = {
  1: [0, 6, 4, 2, 0.6, 0.15],
  2: [0, 4, 4, 3, 1.4, 0.5],
  3: [0, 3, 3, 4, 2, 1],
};

export function rarityWeight(info: ItemInfo, stage: StageIndex): number {
  if (info.minStage && stage < info.minStage) return info.rarity >= 4 ? 0 : 0.3;
  return RARITY_WEIGHT[stage][Math.max(1, Math.min(5, info.rarity))] ?? 1;
}
