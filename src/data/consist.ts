// Composing the player's consist (lead + rear + keel cars + socket modules) into one sim layout, and the pure refit
// helpers the campaign's ship screen uses (couple/uncouple cars, install/remove modules, validation). ★v2.1.
import type { CarId, CarSlot, KeelCarId, ModuleId, RearCarId, SystemId, WeaponId, DroneId } from "../game/ids.ts";
import type { Consist, ModuleMap, ShipState } from "../game/types.ts";
import { CARS, carDef, type CarDef, CAR_EVASION_MALUS } from "./cars.ts";
import { MODULES } from "./modules.ts";
import { SYSTEMS } from "./systems.ts";
import { parseLayout, type LayoutDef, type RoomDef, type AirlockDef } from "./layouts.ts";

export interface CarPlacement {
  slot: CarSlot;
  def: CarDef;
  /** Offset of the car's grid inside the composite grid (tiles). */
  ox: number;
  oy: number;
  cols: number;
  rows: number;
}

export interface ConsistLayout extends LayoutDef {
  cars: CarPlacement[];
  /** Room id → module installed there. */
  modules: ModuleMap;
  /** Socket room ids ("<slot>:<room>"). */
  sockets: string[];
}

export const roomKey = (slot: CarSlot, id: string) => `${slot}:${id}`;

export function carsOf(c: Consist): { slot: CarSlot; id: CarId }[] {
  const out: { slot: CarSlot; id: CarId }[] = [{ slot: "lead", id: c.lead }];
  if (c.rear) out.push({ slot: "rear", id: c.rear });
  if (c.keel) out.push({ slot: "keel", id: c.keel });
  return out;
}

/** Build the composite layout: rear car to the left of the lead car, keel car under it. */
export function composeConsist(consist: Consist, modules: ModuleMap = {}): ConsistLayout {
  const lead = carDef(consist.lead);
  const rear = consist.rear ? carDef(consist.rear) : null;
  const keel = consist.keel ? carDef(consist.keel) : null;
  const dims = (d: CarDef) => [d.map[0].length, d.map.length] as const;
  const [lc, lr] = dims(lead);
  const rearCols = rear ? dims(rear)[0] : 0;
  const placements: CarPlacement[] = [];
  const leadP: CarPlacement = { slot: "lead", def: lead, ox: rearCols, oy: 0, cols: lc, rows: lr };
  if (rear) {
    const [c, r] = dims(rear);
    placements.push({ slot: "rear", def: rear, ox: 0, oy: Math.max(0, lr - r), cols: c, rows: r });
  }
  placements.push(leadP);
  if (keel) {
    const [c, r] = dims(keel);
    placements.push({ slot: "keel", def: keel, ox: rearCols + (lead.keelX ?? Math.floor((lc - c) / 2)), oy: lr, cols: c, rows: r });
  }
  let cols = 0;
  let rows = 0;
  for (const p of placements) {
    cols = Math.max(cols, p.ox + p.cols);
    rows = Math.max(rows, p.oy + p.rows);
  }
  const rooms: RoomDef[] = [];
  const airlocks: AirlockDef[] = [];
  const tileCar = new Int8Array(cols * rows).fill(-1);
  const sockets: string[] = [];
  const mods: ModuleMap = {};
  const hosted = new Set<SystemId>();
  placements.forEach((p, ci) => {
    const L = parseLayout(p.def.map, "right", p.def.legend, []);
    for (const r of L.rooms) {
      const lg = Object.values(p.def.legend).find((q) => q.id === r.id);
      const id = roomKey(p.slot, r.id);
      const room: RoomDef = { ...r, id, x: r.x + p.ox, y: r.y + p.oy };
      if (r.station) room.station = [r.station[0] + p.ox, r.station[1] + p.oy];
      if (room.system) hosted.add(room.system as SystemId);
      if (lg?.socket) {
        sockets.push(id);
        const m = modules[id];
        if (m) mods[id] = m;
      }
      rooms.push(room);
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tileCar[(y + p.oy) * cols + x + p.ox] = ci;
    }
    for (const a of p.def.airlocks) airlocks.push({ ...a, room: roomKey(p.slot, a.room), x: a.x + p.ox, y: a.y + p.oy });
  });
  // Modules hosting systems no car provides (drone-bay → drones, veil-housing → veil).
  for (const [rid, m] of Object.entries(mods)) {
    const h = MODULES[m]?.hosts;
    if (!h || hosted.has(h)) continue;
    const room = rooms.find((r) => r.id === rid);
    if (room && !room.system) {
      room.system = h;
      hosted.add(h);
    }
  }
  const connectors: { ta: number; tb: number; hatch: boolean }[] = [];
  if (rear && lead.couple.rear && rear.couple.front) {
    const rp = placements.find((p) => p.slot === "rear")!;
    const [fx, fy] = rear.couple.front;
    const [bx, by] = lead.couple.rear;
    connectors.push({ ta: (fy + rp.oy) * cols + fx + rp.ox, tb: (by + leadP.oy) * cols + bx + leadP.ox, hatch: false });
  }
  if (keel && lead.couple.keel && keel.couple.top) {
    const kp = placements.find((p) => p.slot === "keel")!;
    const [lx, ly] = lead.couple.keel;
    const [tx, ty] = keel.couple.top;
    connectors.push({ ta: (ly + leadP.oy) * cols + lx + leadP.ox, tb: (ty + kp.oy) * cols + tx + kp.ox, hatch: true });
  }
  rooms.sort((a, b) => a.y - b.y || a.x - b.x);
  return { cols, rows, rooms, airlocks, face: "right", tileCar, connectors, cars: placements, modules: mods, sockets };
}

// ─── Derived stats ──────────────────────────────────────────────────────────────────────────────────────────

export interface ConsistStats {
  weaponSlots: number;
  droneSlots: number;
  crewCap: number;
  cargoCap: number;
  payloadCap: number;
  sparesCap: number;
  /** Hull contributed by coupled cars and modules beyond the lead car. */
  hullBonus: number;
  sensors: number;
  repair: number;
  airDecay: number;
  evasionMalus: number;
  reveal: boolean;
  sockets: string[];
}

export function consistStats(consist: Consist, modules: ModuleMap = {}): ConsistStats {
  const cars = carsOf(consist).map((c) => ({ slot: c.slot, def: carDef(c.id) }));
  const st: ConsistStats = {
    weaponSlots: 0, droneSlots: 0, crewCap: 0, cargoCap: 0, payloadCap: 0, sparesCap: 0, hullBonus: 0, sensors: 0,
    repair: 0, airDecay: 1, evasionMalus: CAR_EVASION_MALUS * (cars.length - 1), reveal: false, sockets: [],
  };
  for (const { slot, def } of cars) {
    st.weaponSlots += def.hardpoints.length;
    st.droneSlots += def.droneSlots;
    st.crewCap += def.crew;
    st.cargoCap += def.cargo;
    st.payloadCap += def.payloadCap;
    st.sparesCap += def.sparesCap;
    if (slot !== "lead") st.hullBonus += def.hull;
    st.sensors += def.effects.sensors ?? 0;
    st.repair += def.effects.repair ?? 0;
    st.airDecay *= def.effects.airDecay ?? 1;
    st.reveal ||= !!def.effects.reveal;
    for (const lg of Object.values(def.legend)) if (lg.socket) st.sockets.push(roomKey(slot, lg.id));
  }
  for (const [rid, m] of Object.entries(modules)) {
    if (!st.sockets.includes(rid)) continue;
    const e = MODULES[m]?.effects ?? {};
    st.crewCap += e.crew ?? 0;
    st.cargoCap += e.cargo ?? 0;
    st.payloadCap += e.payloadCap ?? 0;
    st.sparesCap += e.sparesCap ?? 0;
    st.hullBonus += e.hull ?? 0;
    st.sensors += e.sensors ?? 0;
    st.repair += e.repair ?? 0;
  }
  return st;
}

/** Which room hosts each purchasable system: a car room first, else a socket module. */
export function deriveSystemRooms(consist: Consist, modules: ModuleMap = {}): Partial<Record<SystemId, string>> {
  const out: Partial<Record<SystemId, string>> = {};
  for (const { slot, id } of carsOf(consist)) {
    if (slot === "lead") continue;
    for (const lg of Object.values(carDef(id).legend)) if (lg.sys) out[lg.sys as SystemId] = roomKey(slot, lg.id);
  }
  const sockets = consistStats(consist, modules).sockets;
  for (const [rid, m] of Object.entries(modules)) {
    const h = MODULES[m]?.hosts;
    if (h && !out[h] && sockets.includes(rid)) out[h] = rid;
  }
  return out;
}

// ─── Refits (pure: return a new ShipState) ──────────────────────────────────────────────────────────────────

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Bring every derived field in line with the consist and modules (slots, system hosting, crew stations). */
export function normalizeShip(input: ShipState): ShipState {
  const s = input;
  s.consist ??= { lead: "lamplighter" };
  s.modules ??= {};
  s.moduleStore ??= [];
  s.livery ??= { lamp: "amber" };
  const st = consistStats(s.consist, s.modules);
  // Modules in sockets that no longer exist go back to the store.
  for (const rid of Object.keys(s.modules)) {
    if (!st.sockets.includes(rid)) {
      s.moduleStore.push(s.modules[rid]);
      delete s.modules[rid];
    }
  }
  s.systemRooms = deriveSystemRooms(s.consist, s.modules);
  // Hosted systems exist (at their purchase level) — unhosted ones keep their level in storage, unpowered.
  for (const id of ["drones", "veil"] as SystemId[]) {
    if (s.systemRooms[id]) {
      if (!s.systems[id]) s.systems[id] = { level: SYSTEMS[id].buyLevel ?? 1, damage: 0, power: 0 };
    } else if (s.systems[id]) s.systems[id]!.power = 0;
  }
  // Weapon slots.
  resizeSlots(s, "weapons", st.weaponSlots);
  resizeSlots(s, "drones", st.droneSlots);
  // Crew stations pointing at rooms that are gone.
  const L = composeConsist(s.consist, s.modules);
  const ids = new Set(L.rooms.map((r) => r.id));
  for (const c of s.crew) {
    if (c.station && !c.station.includes(":")) c.station = `lead:${c.station}`;
    if (c.station && !ids.has(c.station)) c.station = "lead:hall";
    if (c.room && !ids.has(c.room)) c.room = c.station ?? "lead:hall";
  }
  return s;
}

function resizeSlots(s: ShipState, kind: "weapons" | "drones", n: number) {
  if (kind === "weapons") {
    const cur = s.weapons;
    while (cur.length > n) {
      const w = cur.pop();
      s.weaponPower.pop();
      if (w) s.cargo.push(w);
    }
    while (cur.length < n) cur.push(null);
    while (s.weaponPower.length < n) s.weaponPower.push(false);
    s.weaponPower.length = n;
    s.weaponSlots = n;
  } else {
    const cur = s.drones;
    while (cur.length > n) {
      const d = cur.pop();
      if (d) s.cargo.push(d);
    }
    while (cur.length < n) cur.push(null);
    s.droneSlots = n;
  }
}

/** Couple (or with `null`, uncouple) the rear/keel car. Hull bonus follows the car; modules in its sockets go to
 *  the module store; crew stationed there move to the lead car; systems it hosted are stored at their level. */
export function coupleCar(ship: ShipState, slot: "rear" | "keel", carId: RearCarId | KeelCarId | null): ShipState {
  const s = normalizeShip(clone(ship));
  const before = consistStats(s.consist, s.modules).hullBonus;
  const oldId = s.consist[slot];
  if (oldId) {
    for (const rid of Object.keys(s.modules)) {
      if (rid.startsWith(`${slot}:`)) {
        s.moduleStore.push(s.modules[rid]);
        delete s.modules[rid];
      }
    }
    for (const c of s.crew) if (c.station?.startsWith(`${slot}:`)) c.station = "lead:hall";
  }
  if (carId) {
    const def = CARS[carId];
    if (!def || def.slot !== slot) throw new Error(`car ${carId} does not fit the ${slot} slot`);
    (s.consist as unknown as Record<string, string | undefined>)[slot] = carId;
  } else delete s.consist[slot];
  normalizeShip(s);
  const after = consistStats(s.consist, s.modules).hullBonus;
  adjustHull(s, after - before);
  return s;
}

/** Install a module into a socket room (or remove it with `null`). The replaced module goes to the store; the
 *  installed one is taken from the store when it is there. */
export function applyRefit(ship: ShipState, socket: string, module: ModuleId | null): ShipState {
  const s = normalizeShip(clone(ship));
  const st = consistStats(s.consist, s.modules);
  if (!st.sockets.includes(socket)) throw new Error(`${socket} is not a socket room`);
  const before = st.hullBonus;
  const old = s.modules[socket];
  if (old) {
    s.moduleStore.push(old);
    delete s.modules[socket];
  }
  if (module) {
    const k = s.moduleStore.indexOf(module);
    if (k >= 0) s.moduleStore.splice(k, 1);
    s.modules[socket] = module;
  }
  normalizeShip(s);
  adjustHull(s, consistStats(s.consist, s.modules).hullBonus - before);
  return s;
}

function adjustHull(s: ShipState, delta: number) {
  if (!delta) return;
  s.hullMax = Math.max(1, s.hullMax + delta);
  s.hull = Math.max(1, Math.min(s.hullMax, s.hull + Math.max(0, delta)));
  if (s.hull > s.hullMax) s.hull = s.hullMax;
}

/** Problems with a ship state (empty = valid). */
export function validateShip(s: ShipState): string[] {
  const out: string[] = [];
  if (!s.consist || !CARS[s.consist.lead]) out.push("unknown lead car");
  if (s.consist?.rear && CARS[s.consist.rear]?.slot !== "rear") out.push(`bad rear car ${s.consist.rear}`);
  if (s.consist?.keel && CARS[s.consist.keel]?.slot !== "keel") out.push(`bad keel car ${s.consist.keel}`);
  if (out.length) return out;
  const st = consistStats(s.consist, s.modules ?? {});
  if (s.weapons.length !== st.weaponSlots) out.push(`weapons has ${s.weapons.length} slots, consist gives ${st.weaponSlots}`);
  if (s.drones.length !== st.droneSlots) out.push(`drones has ${s.drones.length} slots, consist gives ${st.droneSlots}`);
  for (const rid of Object.keys(s.modules ?? {})) if (!st.sockets.includes(rid)) out.push(`module in missing socket ${rid}`);
  if (s.crew.length > st.crewCap) out.push(`crew ${s.crew.length} over capacity ${st.crewCap}`);
  if (s.cargo.length > st.cargoCap) out.push(`cargo ${s.cargo.length} over capacity ${st.cargoCap}`);
  if (s.hull > s.hullMax) out.push("hull above max");
  const L = composeConsist(s.consist, s.modules ?? {});
  const ids = new Set(L.rooms.map((r) => r.id));
  for (const [sys, rid] of Object.entries(s.systemRooms)) if (rid && !ids.has(rid)) out.push(`system ${sys} in missing room ${rid}`);
  return out;
}

/** Can this weapon/drone be mounted (a free slot exists)? */
export function freeSlot(s: ShipState, kind: "weapon" | "drone"): number {
  const list: (WeaponId | DroneId | null)[] = kind === "weapon" ? s.weapons : s.drones;
  return list.indexOf(null);
}
