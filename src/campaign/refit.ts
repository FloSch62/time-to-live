// The modular tender (contract ★ v2.1) for the campaign: cars coupled to the lead car, room modules in sockets, the
// livery. Rules and numbers are the combat workstream's (src/data: CARS, MODULES, consistStats, coupleCar,
// applyRefit, normalizeShip); names and descriptions prefer the writing's flavor.ts. The helpers here mutate the run's
// ship in place (the data helpers return copies) and report what did not fit. Pure module.
import {
  KEEL_CAR_IDS, MODULE_IDS, REAR_CAR_IDS, LAMP_COLORS,
  type CarSlot, type KeelCarId, type LampColor, type ModuleId, type RearCarId, type SystemId,
} from "../game/ids.ts";
import type { ShipState } from "../game/types.ts";
import { CARS } from "../data/cars.ts";
import { MODULES } from "../data/modules.ts";
import {
  applyRefit as dataRefit, consistStats, coupleCar as dataCouple, normalizeShip as dataNormalize,
} from "../data/consist.ts";
import * as flavor from "../content/flavor.ts";
import { titleCase } from "./catalog.ts";

export type AttachCarId = RearCarId | KeelCarId;

export interface CarInfo {
  id: AttachCarId;
  slot: "rear" | "keel";
  name: string;
  desc: string;
  lore: string;
  price: number;
  rarity: number;
}

export interface ModuleInfo {
  id: ModuleId;
  name: string;
  desc: string;
  lore: string;
  price: number;
  rarity: number;
  hosts?: SystemId;
}

type FlavorRec = Record<string, { name: string; desc: string; lore?: string }> | undefined;
const FL = flavor as unknown as Record<string, unknown>;

export function carInfo(id: AttachCarId): CarInfo {
  const d = CARS[id];
  const f = (FL.CAR_FLAVOR as FlavorRec)?.[id];
  return {
    id,
    slot: d?.slot === "keel" ? "keel" : "rear",
    name: f?.name ?? d?.name ?? titleCase(id),
    desc: f?.desc ?? d?.desc ?? "",
    lore: f?.lore ?? "",
    price: d?.cost ?? 70,
    rarity: (d?.rarity ?? 1) + 1,
  };
}

export function moduleInfo(id: ModuleId): ModuleInfo {
  const d = MODULES[id];
  const f = (FL.MODULE_FLAVOR as FlavorRec)?.[id];
  return {
    id,
    name: f?.name ?? d?.name ?? titleCase(id),
    desc: f?.desc ?? d?.desc ?? "",
    lore: f?.lore ?? "",
    price: d?.cost ?? 40,
    rarity: (d?.rarity ?? 1) + 1,
    hosts: d?.hosts,
  };
}

export function isCarId(id: string): id is AttachCarId {
  return (REAR_CAR_IDS as readonly string[]).includes(id) || (KEEL_CAR_IDS as readonly string[]).includes(id);
}
export function isModuleId(id: string): id is ModuleId {
  return (MODULE_IDS as readonly string[]).includes(id);
}
export function carSlot(id: AttachCarId): "rear" | "keel" {
  return (REAR_CAR_IDS as readonly string[]).includes(id) ? "rear" : "keel";
}

// ─── state helpers ────────────────────────────────────────────────────────────────────────────────────────

/** Make sure a ship has the v2.1 fields and derived slots/hosting in line with its consist (old saves too). */
export function normalizeShip(ship: ShipState): ShipState {
  ship.consist ??= { lead: "lamplighter" };
  ship.modules ??= {};
  ship.moduleStore ??= [];
  ship.livery ??= { lamp: "amber" };
  return dataNormalize(ship);
}

export function sockets(ship: ShipState): string[] {
  return consistStats(ship.consist ?? { lead: "lamplighter" }, ship.modules ?? {}).sockets;
}

export function freeSocket(ship: ShipState): string | null {
  return sockets(ship).find((s) => !ship.modules?.[s]) ?? null;
}

export interface TenderStats {
  hullMax: number;
  weaponSlots: number;
  droneSlots: number;
  cargo: number;
  crew: number;
  payloadMax: number;
  sparesMax: number;
  sensors: number;
  repair: number;
  evasion: number; // penalty in %
  cars: number;
  reveal: boolean;
  systems: SystemId[]; // hosted purchasable systems
}

export function tenderStats(ship: ShipState): TenderStats {
  const cs = ship.consist ?? { lead: "lamplighter" };
  const st = consistStats(cs, ship.modules ?? {});
  const cars = (cs.rear ? 1 : 0) + (cs.keel ? 1 : 0);
  const hosted = new Set<SystemId>();
  for (const id of [cs.rear, cs.keel]) {
    if (!id) continue;
    for (const lg of Object.values(CARS[id]?.legend ?? {})) if (lg.sys) hosted.add(lg.sys as SystemId);
  }
  for (const [rid, m] of Object.entries(ship.modules ?? {})) if (st.sockets.includes(rid) && MODULES[m]?.hosts) hosted.add(MODULES[m].hosts!);
  return {
    hullMax: ship.hullMax,
    weaponSlots: st.weaponSlots,
    droneSlots: st.droneSlots,
    cargo: st.cargoCap,
    crew: st.crewCap,
    payloadMax: st.payloadCap,
    sparesMax: st.sparesCap,
    sensors: st.sensors,
    repair: st.repair,
    evasion: -st.evasionMalus,
    cars,
    reveal: st.reveal,
    systems: [...hosted],
  };
}

export function crewCap(ship: ShipState): number {
  return tenderStats(ship).crew;
}
export function cargoCap(ship: ShipState): number {
  return tenderStats(ship).cargo;
}
export function payloadCap(ship: ShipState): number {
  return tenderStats(ship).payloadMax || 99;
}
export function sparesCap(ship: ShipState): number {
  return tenderStats(ship).sparesMax || 99;
}

// ─── changing the consist (in place) ──────────────────────────────────────────────────────────────────────

export interface Displaced {
  /** Weapons/drones that lost their mount and did not fit in cargo (the caller sells them). */
  items: string[];
  /** Modules that went back to the stores. */
  modules: ModuleId[];
}

function adopt(ship: ShipState, next: ShipState): Displaced {
  const beforeStore = [...(ship.moduleStore ?? [])];
  Object.assign(ship, next);
  const out: Displaced = { items: [], modules: [] };
  const cap = cargoCap(ship);
  while (ship.cargo.length > cap) out.items.push(ship.cargo.pop()!);
  const added = [...ship.moduleStore];
  for (const m of beforeStore) {
    const i = added.indexOf(m);
    if (i >= 0) added.splice(i, 1);
  }
  out.modules = added;
  return out;
}

/** Couple a car (replacing the one in its slot). */
export function coupleCar(ship: ShipState, id: AttachCarId): Displaced {
  normalizeShip(ship);
  return adopt(ship, dataCouple(ship, carSlot(id), id));
}

/** Uncouple the car in a slot (its sockets' modules go back to the stores). */
export function uncoupleCar(ship: ShipState, slot: "rear" | "keel"): Displaced {
  normalizeShip(ship);
  if (!ship.consist[slot]) return { items: [], modules: [] };
  return adopt(ship, dataCouple(ship, slot, null));
}

/** Install (or remove with null) a module in a socket. The old module goes back to the stores. */
export function refit(ship: ShipState, socket: string, module: ModuleId | null): Displaced {
  normalizeShip(ship);
  if (!sockets(ship).includes(socket)) return { items: [], modules: [] };
  return adopt(ship, dataRefit(ship, socket, module));
}

export function lampColors(): readonly LampColor[] {
  return LAMP_COLORS;
}

/** "Lead car · Roof Hold" for a socket room id ("lead:hold-a"). */
export function socketLabel(socket: string, ship?: ShipState): string {
  const [slot, room] = socket.split(":");
  const carId = slot === "lead" ? ship?.consist?.lead ?? "lamplighter" : slot === "rear" ? ship?.consist?.rear : ship?.consist?.keel;
  const car = slot === "lead" ? "Lead car" : slot === "rear" ? "Rear car" : "Keel car";
  const legend = carId ? CARS[carId]?.legend : undefined;
  const name = legend ? Object.values(legend).find((l) => l.id === room)?.name : undefined;
  return `${car} · ${name ?? titleCase(room ?? "")}`;
}

export function slotName(slot: CarSlot): string {
  return slot === "lead" ? "Lead car" : slot === "rear" ? "Rear car" : "Keel car";
}

export const EVASION_PER_CAR = 2;
export const ALL_CARS: readonly AttachCarId[] = [...REAR_CAR_IDS, ...KEEL_CAR_IDS];
export const ALL_MODULES: readonly ModuleId[] = MODULE_IDS;
