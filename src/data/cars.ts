// The modular tender (contract ★v2.1, sizes ★v4: lead 12×4, rear 4×4, keel 6×2): lead, rear and keel cars as pure data. Adding a car = a new entry here plus
// its hull art (ships/<art>.png + ships.json points). Rooms use the same ASCII-map format as the enemy layouts
// (one letter = one rectangular room, one grid row = one deck, TILE 36). Legend flags: `sys` hosts a system,
// `socket` accepts a module, `bench` heals crew slowly.
import type { CarId, CarSlot, KeelCarId, LeadCarId, RearCarId, SystemId } from "../game/ids.ts";
import type { AirlockDef, LegendEntry } from "./layouts.ts";

export interface CarLegend extends LegendEntry {
  socket?: boolean;
  /** Crew heal slowly in this room (HP/s). */
  bench?: number;
}

export interface Hardpoint {
  /** Tile column of the car the mount sits over/under. */
  x: number;
  side: "roof" | "belly";
}

export interface CarDef {
  id: CarId;
  slot: CarSlot;
  name: string;
  desc: string;
  map: string[];
  legend: Record<string, CarLegend>;
  airlocks: AirlockDef[];
  /** Coupling tiles (car coords): `rear` = where a rear car's gangway enters (lead), `front` = a rear car's gangway
   *  end, `keel` = the lead's lower-deck tile over the keel hatch, `top` = the keel's top-deck tile under it. */
  couple: { rear?: [number, number]; front?: [number, number]; keel?: [number, number]; top?: [number, number] };
  /** Keel placement: column of the lead car above the keel's column 0. */
  keelX?: number;
  hardpoints: Hardpoint[];
  droneSlots: number;
  hull: number;
  crew: number;
  cargo: number;
  payloadCap: number;
  sparesCap: number;
  effects: {
    /** + effective sensors levels. */
    sensors?: number;
    /** Repair speed bonus (0.25 = +25%). */
    repair?: number;
    /** Air decay multiplier with no working Air Plant (0.5 = half as fast). */
    airDecay?: number;
    /** Reveals adjacent relays on the map (campaign). */
    reveal?: boolean;
  };
  cost: number;
  rarity: number;
  /** Hull art id under public/art/ships/. */
  art: string;
}

const car = (d: CarDef) => d;

export const LEAD_CARS: Record<LeadCarId, CarDef> = {
  lamplighter: car({
    id: "lamplighter", slot: "lead", name: "Lamplighter",
    desc: "Reach-dock lamplighter-pattern tender: cab and helm at the nose, drive trolley on the roof, four decks.",
    // Thirteen bays: eight systems, two refit bays, a mess, stores and the service lift.
    // Keep the original hull grid and couplers so existing art and saved consists remain compatible.
    map: [
      ".EEEElWWWSS.",
      "aaaaalhhhPPP",
      "bbDDDlMMMsss",
      "..kkklOOOO..",
    ],
    legend: {
      E: { id: "engines", name: "Drive Room", sys: "engines", st: [0, 0], dir: "left" },
      W: { id: "weapons", name: "Weapons Bay", sys: "weapons", st: [2, 0], dir: "right" },
      S: { id: "shields", name: "Ward Mesh", sys: "shields", st: [1, 0], dir: "right" },
      a: { id: "hold-a", name: "Forward Refit Bay", socket: true },
      h: { id: "hall", name: "Crew Mess" },
      P: { id: "helm", name: "Helm Cab", sys: "helm", st: [2, 0], dir: "right" },
      b: { id: "hold-b", name: "Aft Refit Bay", socket: true },
      D: { id: "doors", name: "Bulkheads", sys: "doors", st: [0, 0], dir: "left" },
      M: { id: "medbay", name: "Infirmary", sys: "medbay" },
      s: { id: "sensors", name: "Listening Post", sys: "sensors", st: [2, 0], dir: "right" },
      k: { id: "stores", name: "Stores" },
      O: { id: "air", name: "Air Plant", sys: "air" },
      l: { id: "lift", name: "Service Lift", lift: true },
    },
    airlocks: [
      { room: "hold-b", x: 0, y: 2, side: "left" },
      { room: "weapons", x: 7, y: 0, side: "up" },
      { room: "stores", x: 2, y: 3, side: "down" },
    ],
    couple: { rear: [0, 2], keel: [5, 3] },
    keelX: 3,
    hardpoints: [{ x: 8, side: "roof" }, { x: 4, side: "roof" }, { x: 9, side: "belly" }, { x: 3, side: "belly" }],
    droneSlots: 2, hull: 30, crew: 8, cargo: 4, payloadCap: 12, sparesCap: 8, effects: {}, cost: 0, rarity: 0,
    art: "lamplighter",
  }),
};

export const REAR_CARS: Record<RearCarId, CarDef> = {
  "drone-car": car({
    id: "drone-car", slot: "rear", name: "Drone Car", desc: "Drone Bay room with a roof launch hatch, one more drone slot, one socket.",
    map: [".lRR", "hlgg", "klvv", ".lss"],
    legend: {
      R: { id: "bay", name: "Drone Bay", sys: "drones" }, k: { id: "hold", name: "Car Hold", socket: true },
      a: { id: "passage", name: "Passage" },
      g: { id: "gallery", name: "Gallery" }, v: { id: "gangway", name: "Gangway" }, h: { id: "spares", name: "Spares Store" },
      s: { id: "sump", name: "Sump" },
    },
    airlocks: [{ room: "hold", x: 0, y: 2, side: "left" }],
    couple: { front: [3, 2] }, hardpoints: [], droneSlots: 1, hull: 0, crew: 0, cargo: 0, payloadCap: 0, sparesCap: 0,
    effects: {}, cost: 90, rarity: 1, art: "drone-car",
  }),
  "armory-car": car({
    id: "armory-car", slot: "rear", name: "Armory Car", desc: "One more weapon hardpoint on the roof, one socket.",
    map: [".lmm", "hlgg", "klvv", ".lss"],
    legend: {
      m: { id: "magazine", name: "Magazine" }, k: { id: "hold", name: "Car Hold", socket: true },
      a: { id: "passage", name: "Passage" },
      g: { id: "gallery", name: "Gallery" }, v: { id: "gangway", name: "Gangway" }, h: { id: "armoury", name: "Armoury" },
      s: { id: "sump", name: "Sump" },
    },
    airlocks: [{ room: "hold", x: 0, y: 2, side: "left" }],
    couple: { front: [3, 2] }, hardpoints: [{ x: 2, side: "roof" }], droneSlots: 0, hull: 0, crew: 0, cargo: 0,
    payloadCap: 0, sparesCap: 0, effects: {}, cost: 80, rarity: 1, art: "armory-car",
  }),
  "freight-car": car({
    id: "freight-car", slot: "rear", name: "Freight Car", desc: "+4 cargo, a payload rack (+4 max payloads), +3 hull, one socket.",
    map: [".lff", "glhh", "klrr", ".lss"],
    legend: {
      h: { id: "hall", name: "Freight Hall" },
      f: { id: "freight", name: "Freight Deck" }, k: { id: "hold", name: "Car Hold", socket: true },
      r: { id: "rack", name: "Payload Rack" }, v: { id: "gangway", name: "Gangway" }, g: { id: "stores", name: "Stores" },
      s: { id: "sump", name: "Sump" },
    },
    airlocks: [{ room: "hold", x: 0, y: 2, side: "left" }],
    couple: { front: [3, 2] }, hardpoints: [], droneSlots: 0, hull: 3, crew: 0, cargo: 4, payloadCap: 4, sparesCap: 0,
    effects: {}, cost: 60, rarity: 0, art: "freight-car",
  }),
  "bunk-car": car({
    id: "bunk-car", slot: "rear", name: "Bunk Car", desc: "+2 crew berths, a bench room where crew heal slowly, one socket.",
    map: [".lbb", "clhh", "klee", ".lss"],
    legend: {
      h: { id: "hall", name: "Bunk Hall" },
      b: { id: "bunks", name: "Bunks" }, k: { id: "hold", name: "Car Hold", socket: true },
      e: { id: "bench", name: "Bench", bench: 1.2 }, v: { id: "gangway", name: "Gangway" }, c: { id: "lockers", name: "Lockers" },
      s: { id: "sump", name: "Sump" },
    },
    airlocks: [{ room: "hold", x: 0, y: 2, side: "left" }],
    couple: { front: [3, 2] }, hardpoints: [], droneSlots: 0, hull: 0, crew: 2, cargo: 0, payloadCap: 0, sparesCap: 0,
    effects: {}, cost: 60, rarity: 0, art: "bunk-car",
  }),
  "veil-car": car({
    id: "veil-car", slot: "rear", name: "Veil Car", desc: "Lamp-Dark Veil room, one socket.",
    map: [".lVV", "hlgg", "klvv", ".lss"],
    legend: {
      V: { id: "veil", name: "Veil Room", sys: "veil" }, k: { id: "hold", name: "Car Hold", socket: true },
      a: { id: "passage", name: "Passage" },
      g: { id: "gallery", name: "Gallery" }, v: { id: "gangway", name: "Gangway" }, h: { id: "store", name: "Dark Store" },
      s: { id: "sump", name: "Sump" },
    },
    airlocks: [{ room: "hold", x: 0, y: 2, side: "left" }],
    couple: { front: [3, 2] }, hardpoints: [], droneSlots: 0, hull: 0, crew: 0, cargo: 0, payloadCap: 0, sparesCap: 0,
    effects: {}, cost: 110, rarity: 2, art: "veil-car",
  }),
};

export const KEEL_CARS: Record<KeelCarId, CarDef> = {
  "ballast-keel": car({
    id: "ballast-keel", slot: "keel", name: "Ballast Keel", desc: "+6 hull. Air reserve: air thins half as fast.",
    map: ["ttlbbb", ".clee."],
    legend: { e: { id: "service", name: "Service Bay" }, t: { id: "tank-a", name: "Ballast Tank" }, b: { id: "well", name: "Ballast Well" }, u: { id: "tank-b", name: "Ballast Tank" }, c: { id: "reserve", name: "Air Reserve" } },
    airlocks: [], couple: { top: [2, 0] }, hardpoints: [], droneSlots: 0, hull: 6, crew: 0, cargo: 0, payloadCap: 0,
    sparesCap: 0, effects: { airDecay: 0.5 }, cost: 70, rarity: 0, art: "ballast-keel",
  }),
  "listening-keel": car({
    id: "listening-keel", slot: "keel", name: "Listening Keel", desc: "A horn array: +1 Listening Post level and a look at adjacent relays.",
    map: ["hhlggg", ".alee."],
    legend: { e: { id: "service", name: "Service Bay" }, h: { id: "horn-a", name: "Horn" }, w: { id: "well", name: "Keel Well" }, g: { id: "horn-b", name: "Horn" }, a: { id: "array", name: "Horn Array" } },
    airlocks: [], couple: { top: [2, 0] }, hardpoints: [], droneSlots: 0, hull: 1, crew: 0, cargo: 0, payloadCap: 0,
    sparesCap: 0, effects: { sensors: 1, reveal: true }, cost: 80, rarity: 1, art: "listening-keel",
  }),
  "sling-keel": car({
    id: "sling-keel", slot: "keel", name: "Sling Keel", desc: "One more weapon hardpoint on the belly, +2 max payloads.",
    map: ["aalbbb", ".mlee."],
    legend: { e: { id: "service", name: "Service Bay" }, a: { id: "sling-a", name: "Sling" }, w: { id: "well", name: "Keel Well" }, b: { id: "sling-b", name: "Sling" }, m: { id: "magazine", name: "Magazine" } },
    airlocks: [], couple: { top: [2, 0] }, hardpoints: [{ x: 3, side: "belly" }], droneSlots: 0, hull: 1, crew: 0,
    cargo: 0, payloadCap: 2, sparesCap: 0, effects: {}, cost: 75, rarity: 1, art: "sling-keel",
  }),
  "workshop-keel": car({
    id: "workshop-keel", slot: "keel", name: "Workshop Keel", desc: "Repairs 25% faster, +2 max spares, one socket.",
    map: ["kklbbb", ".tlee."],
    legend: { e: { id: "service", name: "Service Bay" }, k: { id: "hold", name: "Keel Hold", socket: true }, w: { id: "well", name: "Keel Well" }, b: { id: "bench", name: "Workbench" }, t: { id: "tools", name: "Tool Store" } },
    airlocks: [], couple: { top: [2, 0] }, hardpoints: [], droneSlots: 0, hull: 1, crew: 0, cargo: 0, payloadCap: 0,
    sparesCap: 2, effects: { repair: 0.25 }, cost: 85, rarity: 1, art: "workshop-keel",
  }),
};

export const CARS: Record<CarId, CarDef> = { ...LEAD_CARS, ...REAR_CARS, ...KEEL_CARS };

export function carDef(id: CarId): CarDef {
  const d = CARS[id];
  if (!d) throw new Error(`unknown car ${id}`);
  return d;
}

/** Systems a car hosts in its own rooms (drone-car → drones, veil-car → veil). */
export function carSystems(id: CarId): SystemId[] {
  const out: SystemId[] = [];
  for (const lg of Object.values(carDef(id).legend)) if (lg.sys) out.push(lg.sys as SystemId);
  return out;
}

/** Every coupled car costs 2% evasion (★v2.1). */
export const CAR_EVASION_MALUS = 2;
