// Ship, crew and inventory operations used by events, rewards, the store and the ship screen. Pure module.
import { Rng } from "../core/rng.ts";
import {
  AUGMENT_IDS, DRONE_IDS, SPECIES_IDS, WEAPON_IDS,
  type AugmentId, type DroneId, type SpeciesId, type SystemId, type WeaponId,
} from "../game/ids.ts";
import type { CrewMember, Inventory, ShipState, SkillId } from "../game/types.ts";
import { catalog, itemKind, sellPrice } from "./catalog.ts";
import { content } from "./content.ts";
import { makePlayerShip, newInventory, installSystem as dataInstallSystem } from "../data/ship.ts";
import { afterHop as dataAfterHop } from "../data/augments.ts";
import type { RunState } from "./model.ts";
import { cargoCap, crewCap, freeSocket, normalizeShip, refit } from "./refit.ts";
import type { LampColor, ModuleId } from "../game/ids.ts";

export { cargoCap, crewCap };
export const AUGMENT_MAX = 3;

/** Fallback names until src/content/names.ts exists (and to top up short lists). */
const FALLBACK_NAMES: Record<SpeciesId, string[]> = {
  linefolk: ["Oona Brisk", "Tam Hale", "Imre Vas", "Noor Pell", "Jory Senna", "Ada Quill", "Bram Otte", "Wren Adair", "Sela Moor", "Kit Varga"],
  warden: ["Harl Dunmore", "Vessa Crane", "Odo Rask", "Brin Tallow", "Maud Keel", "Garr Idris"],
  rigger: ["Rigger 7-Tern", "Rigger 3-Plover", "Rigger 11-Wren", "Rigger 5-Petrel", "Rigger 9-Kestrel", "Rigger 2-Swift"],
  courier: ["Lio Fenn", "Pip Arden", "Cass Merrow", "Tully Rook", "Juno Vell", "Ansel Drift"],
  bellmaker: ["Marit Seldon", "Ilo Vashti", "Beren Tolle", "Sabine Glass", "Orrin Fane"],
};

export const DEFAULT_TENDER_NAMES = ["Lamplighter", "Kettle Run", "Second Helping", "Late Shift", "Keepalive", "Last Orders", "Go Ahead", "Still Here"];

export function tenderNames(): string[] {
  return content.names.tender.length ? content.names.tender : DEFAULT_TENDER_NAMES;
}

export function crewNamePool(species: SpeciesId): string[] {
  const own = content.names.crew[species];
  if (own && own.length) return own;
  if (species !== "rigger" && content.names.any.length) return content.names.any;
  return FALLBACK_NAMES[species];
}

export function pickCrewName(species: SpeciesId, taken: string[], rng: Rng): string {
  const pool = crewNamePool(species).filter((n) => !taken.includes(n));
  if (pool.length) return rng.pick(pool);
  const fb = FALLBACK_NAMES[species].filter((n) => !taken.includes(n));
  if (fb.length) return rng.pick(fb);
  return `${catalog.species[species]?.name ?? species} ${rng.int(2, 99)}`;
}

export function speciesMaxHp(species: SpeciesId): number {
  return catalog.species[species]?.hp ?? 100;
}

export function emptyXp(): Record<SkillId, number> {
  return { helm: 0, engines: 0, weapons: 0, shields: 0, repair: 0, combat: 0 };
}

export function makeCrew(run: RunState, species: SpeciesId, name: string | undefined, rng: Rng, joinedAt?: string): CrewMember {
  const taken = run.ship.crew.map((c) => c.name);
  const ids = new Set(run.ship.crew.map((c) => c.id));
  let id = `c${run.nextCrewId++}`;
  while (ids.has(id)) id = `c${run.nextCrewId++}`;
  return {
    id,
    name: name && !taken.includes(name) ? name : pickCrewName(species, taken, rng),
    species,
    hp: speciesMaxHp(species),
    xp: emptyXp(),
    look: rng.int(0, 3),
    joinedAt,
  };
}

/** The Lamplighter at the start of a voyage (src/data), crew named from the writing's name lists. */
export function newShip(name: string, rng: Rng, lamp: LampColor = "amber"): ShipState {
  const ship = normalizeShip(makePlayerShip(name, (species, taken) => pickCrewName(species, taken, rng), lamp));
  // Stable, short crew ids within the run.
  ship.crew.forEach((c, i) => (c.id = `c${i + 1}`));
  return ship;
}

export function startInventory(): Inventory {
  return typeof newInventory === "function" ? newInventory() : { ...START_INVENTORY };
}

/** Augment effects between relays (src/data: Varga's Crimper, Harrow's Kettle). */
export function afterHop(ship: ShipState) {
  if (typeof dataAfterHop === "function") dataAfterHop(ship);
  else {
    if (hasAugment(ship, "vargas-crimper")) repairHull(ship, 1);
    if (hasAugment(ship, "harrows-kettle")) healAll(ship);
  }
}

/**
 * Install a purchasable system (drones / veil). It needs a host: a car that carries it, or its module in a socket.
 * When no host is aboard, the host module goes into a free socket (returns false if there is none).
 */
export function installSystem(ship: ShipState, id: SystemId): boolean {
  normalizeShip(ship);
  const hostModule: ModuleId | null = id === "drones" ? "drone-bay" : id === "veil" ? "veil-housing" : null;
  const hosted = Object.values(ship.systemRooms).length && ship.systemRooms[id];
  if (!hosted && hostModule) {
    const sock = freeSocket(ship);
    if (!sock) return false;
    ship.moduleStore.push(hostModule);
    refit(ship, sock, hostModule);
  }
  if (typeof dataInstallSystem === "function") dataInstallSystem(ship, id);
  else if (!ship.systems[id]) ship.systems[id] = { level: catalog.systems[id]?.buyLevel ?? 1, damage: 0, power: 0 };
  return true;
}

/** Baseline Lamplighter (tests; contract §4.6, FTL Kestrel numbers). */
export function baselineShip(name: string): ShipState {
  return {
    defId: "lamplighter",
    consist: { lead: "lamplighter" },
    modules: {},
    moduleStore: [],
    livery: { lamp: "amber" },
    name,
    hull: 30,
    hullMax: 30,
    reactor: 8,
    systems: {
      shields: { level: 2, damage: 0, power: 2 },
      engines: { level: 2, damage: 0, power: 2 },
      weapons: { level: 3, damage: 0, power: 3 },
      air: { level: 1, damage: 0, power: 1 },
      medbay: { level: 1, damage: 0, power: 0 },
      helm: { level: 1, damage: 0, power: 1 },
      sensors: { level: 1, damage: 0, power: 1 },
      doors: { level: 1, damage: 0, power: 1 },
    },
    systemRooms: {},
    weapons: ["burst-emitter", "payload-launcher", null, null],
    weaponPower: [true, true, false, false],
    weaponSlots: 4,
    drones: [null, null, null],
    droneSlots: 3,
    cargo: [],
    augments: [],
    crew: [],
  };
}

export const START_INVENTORY: Inventory = { salvage: 30, ttl: 16, payloads: 8, spares: 2 };

/** Rooms where purchasable systems go (contract §4.6: hold-a = drones slot, hold-b = veil slot). */
export const SYSTEM_ROOM: Partial<Record<SystemId, string>> = { drones: "hold-a", veil: "hold-b" };

// ─── items ───────────────────────────────────────────────────────────────────────────────────────────────

export type Placement = "mounted" | "cargo" | "overflow";

export function isWeapon(id: string): id is WeaponId {
  return (WEAPON_IDS as readonly string[]).includes(id);
}
export function isDrone(id: string): id is DroneId {
  return (DRONE_IDS as readonly string[]).includes(id);
}
export function isAugment(id: string): id is AugmentId {
  return (AUGMENT_IDS as readonly string[]).includes(id);
}
export function isSpecies(id: string): id is SpeciesId {
  return (SPECIES_IDS as readonly string[]).includes(id);
}

/** Put a weapon/drone where it fits: a free mount, else cargo, else overflow (caller decides). */
export function placeItem(ship: ShipState, id: WeaponId | DroneId): { placed: Placement; slot?: number } {
  const mounts = isWeapon(id) ? ship.weapons : ship.drones;
  const slots = isWeapon(id) ? ship.weaponSlots : ship.droneSlots;
  // Drones only mount when a drone bay is installed.
  const canMount = isWeapon(id) || !!ship.systems.drones;
  if (canMount) {
    for (let i = 0; i < slots; i++) {
      if (!mounts[i]) {
        while (mounts.length < slots) (mounts as unknown[]).push(null);
        (mounts as (string | null)[])[i] = id;
        if (isWeapon(id)) {
          while (ship.weaponPower.length < slots) ship.weaponPower.push(false);
          ship.weaponPower[i] = false;
        }
        return { placed: "mounted", slot: i };
      }
    }
  }
  if (ship.cargo.length < cargoCap(ship)) {
    ship.cargo.push(id);
    return { placed: "cargo", slot: ship.cargo.length - 1 };
  }
  return { placed: "overflow" };
}

export function addAugment(ship: ShipState, id: AugmentId): Placement {
  if (ship.augments.length >= AUGMENT_MAX) return "overflow";
  ship.augments.push(id);
  return "mounted";
}

export function hasAugment(ship: ShipState, id: AugmentId): boolean {
  return ship.augments.includes(id);
}

/** All weapons aboard (mounted + cargo). */
export function allWeapons(ship: ShipState): WeaponId[] {
  return [...ship.weapons.filter((w): w is WeaponId => !!w), ...ship.cargo.filter(isWeapon)];
}
export function allDrones(ship: ShipState): DroneId[] {
  return [...ship.drones.filter((d): d is DroneId => !!d), ...ship.cargo.filter(isDrone)];
}

/** Remove one item from the ship (mounted or cargo). Returns true if found. */
export function removeItem(ship: ShipState, id: string): boolean {
  const ci = ship.cargo.indexOf(id as WeaponId);
  if (ci >= 0) {
    ship.cargo.splice(ci, 1);
    return true;
  }
  const wi = ship.weapons.indexOf(id as WeaponId);
  if (wi >= 0) {
    ship.weapons[wi] = null;
    ship.weaponPower[wi] = false;
    return true;
  }
  const di = ship.drones.indexOf(id as DroneId);
  if (di >= 0) {
    ship.drones[di] = null;
    return true;
  }
  const ai = ship.augments.indexOf(id as AugmentId);
  if (ai >= 0) {
    ship.augments.splice(ai, 1);
    return true;
  }
  return false;
}

export function itemValue(id: string): number {
  return sellPrice(id);
}

/** Power used by mounted, powered weapons (for keeping weaponPower consistent after swaps). */
export function normalizeWeaponPower(ship: ShipState) {
  const cap = ship.systems.weapons ? ship.systems.weapons.level - ship.systems.weapons.damage : 0;
  let used = 0;
  for (let i = 0; i < ship.weaponSlots; i++) {
    const w = ship.weapons[i];
    if (!w) {
      ship.weaponPower[i] = false;
      continue;
    }
    const p = catalog.weapons[w]?.power ?? 1;
    if (ship.weaponPower[i] && used + p <= cap) used += p;
    else ship.weaponPower[i] = false;
  }
}

// ─── crew ─────────────────────────────────────────────────────────────────────────────────────────────────

export function crewAlive(ship: ShipState): number {
  return ship.crew.length;
}

export function healAll(ship: ShipState) {
  for (const c of ship.crew) c.hp = speciesMaxHp(c.species);
}

export function removeCrew(ship: ShipState, id: string): CrewMember | null {
  const i = ship.crew.findIndex((c) => c.id === id);
  if (i < 0) return null;
  return ship.crew.splice(i, 1)[0];
}

export function repairHull(ship: ShipState, n: number | "full") {
  ship.hull = n === "full" ? ship.hullMax : Math.min(ship.hullMax, ship.hull + n);
}

export function kindOf(id: string) {
  return itemKind(id);
}
