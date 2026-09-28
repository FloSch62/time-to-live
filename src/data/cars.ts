// The modular tender (contract ★v2.1, independent lead plans, rear 4×4, keel 6×2): lead, rear and keel cars as pure data. Adding a car = a new entry here plus
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
  /** Evasion lost to this attachment's weight and suspension. Lead cars do not pay this. */
  evasionCost?: number;
  /** Capacity supplied with specialist machinery; reactor power is still required. */
  systemLevels?: Partial<Record<SystemId, number>>;
  effects: {
    /** + effective sensors levels. */
    sensors?: number;
    /** Repair speed bonus (0.25 = +25%). */
    repair?: number;
    /** Air decay multiplier with no working Air Plant (0.5 = half as fast). */
    airDecay?: number;
    /** Reveals adjacent relays on the map (campaign). */
    reveal?: boolean;
    weaponCharge?: number;
    droneCharge?: number;
    veilCooldown?: number;
    debrisProtection?: number;
    relayStores?: number;
    salvageRepair?: number;
  };
  cost: number;
  rarity: number;
  /** Hull art id under public/art/ships/. */
  art: string;
}

const car = (d: CarDef) => d;

const BASE_LEAD_CARS = {
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
    hardpoints: [{ x: 8, side: "roof" }, { x: 4, side: "roof" }, { x: 9, side: "belly" }],
    droneSlots: 2, hull: 30, crew: 6, cargo: 4, payloadCap: 12, sparesCap: 8, effects: {}, cost: 0, rarity: 0,
    art: "lamplighter",
  }),
};

/** Each working pattern has its own circulation, service bays and expansion constraints. */
export const LEAD_CARS: Record<LeadCarId, CarDef> = {
  ...BASE_LEAD_CARS,
  glasswing: car({ id: "glasswing", slot: "lead", name: "Glasswing", art: "glasswing",
    desc: "Compact lamplighter-pattern inspection car: paired lenses under the nose cupola, a prism housing on the roof. Optics, ward mesh and survey lab share the top deck; one equipment bay limits expansion.",
    map: [".WWlSSsss.", "EEElhhhPPP", "aaalMMMDDD", "..blOOOO.."],
    legend: {
      W: { id: "weapons", name: "Optics Gallery", sys: "weapons", st: [1, 0], dir: "right" },
      S: { id: "shields", name: "Prism Ward", sys: "shields", st: [0, 0], dir: "left" },
      s: { id: "sensors", name: "Survey Lab", sys: "sensors", st: [2, 0], dir: "right" },
      E: { id: "engines", name: "Fine Drive", sys: "engines", st: [0, 0], dir: "left" },
      h: { id: "hall", name: "Survey Mess" },
      P: { id: "helm", name: "Observation Cab", sys: "helm", st: [2, 0], dir: "right" },
      a: { id: "hold-a", name: "Optical Equipment Bay", socket: true },
      M: { id: "medbay", name: "First Aid", sys: "medbay" },
      D: { id: "doors", name: "Pressure Locks", sys: "doors", st: [2, 0], dir: "right" },
      b: { id: "calibration", name: "Calibration Cradle", bench: 0.6 },
      O: { id: "air", name: "Air Plant", sys: "air" },
      l: { id: "lift", name: "Optics Lift", lift: true },
    },
    airlocks: [{ room: "hold-a", x: 0, y: 2, side: "left" }, { room: "weapons", x: 1, y: 0, side: "up" }],
    couple: { rear: [0, 2], keel: [3, 3] }, keelX: 1,
    hardpoints: [{ x: 1, side: "roof" }, { x: 7, side: "roof" }, { x: 6, side: "belly" }],
    droneSlots: 1, hull: 28, crew: 5, cargo: 3, payloadCap: 8, sparesCap: 6,
    effects: { sensors: 1 }, cost: 0, rarity: 0,
  }),
  switchback: car({ id: "switchback", slot: "lead", name: "Switchback", art: "switchback",
    desc: "Tall lamplighter-pattern retrieval car: five decks, launch cradles and a crane on the roof. Native drone and Veil bays leave two equipment sockets; the long lift separates cradles from the shutters.",
    map: [".RRRRRlWWWSS.", "qqqqqqlhhhPPP", "EEEEEElaaasss", "bbDDDDlMMMkkk", "..VVVVlOOOO.."],
    legend: {
      R: { id: "drones", name: "Retrieval Cradles", sys: "drones" },
      W: { id: "weapons", name: "Cover Emitter", sys: "weapons", st: [2, 0], dir: "right" },
      S: { id: "shields", name: "Ward Mesh Bay", sys: "shields", st: [1, 0], dir: "right" },
      q: { id: "workshop", name: "Retrieval Workshop", bench: 0.8 },
      h: { id: "hall", name: "Dispatch Room" },
      P: { id: "helm", name: "Crane Control Cab", sys: "helm", st: [2, 0], dir: "right" },
      E: { id: "engines", name: "Haulage Drive", sys: "engines", st: [0, 0], dir: "left" },
      a: { id: "hold-a", name: "Forward Tool Bay", socket: true },
      s: { id: "sensors", name: "Return Beacon", sys: "sensors", st: [2, 0], dir: "right" },
      b: { id: "hold-b", name: "Aft Tool Bay", socket: true },
      D: { id: "doors", name: "Cargo Locks", sys: "doors", st: [0, 0], dir: "left" },
      M: { id: "medbay", name: "Crew Aid Station", sys: "medbay" },
      k: { id: "spares", name: "Recovered Parts" },
      V: { id: "veil", name: "Retrieval Shutters", sys: "veil" },
      O: { id: "air", name: "Air Plant", sys: "air" },
      l: { id: "lift", name: "Freight Lift", lift: true },
    },
    airlocks: [{ room: "hold-b", x: 0, y: 3, side: "left" }, { room: "drones", x: 2, y: 0, side: "up" }, { room: "spares", x: 12, y: 3, side: "right" }],
    couple: { rear: [0, 3], keel: [6, 4] }, keelX: 4,
    hardpoints: [{ x: 8, side: "roof" }, { x: 10, side: "belly" }],
    droneSlots: 3, hull: 34, crew: 5, cargo: 3, payloadCap: 6, sparesCap: 12,
    effects: { repair: 0.1 }, cost: 0, rarity: 0,
  }),
};

export const REAR_CARS: Record<RearCarId, CarDef> = {
  "drone-car": car({
    id: "drone-car", slot: "rear", name: "Drone Car", desc: "Drone Bay IV, +1 launch slot, +6 spares capacity and 15% faster drone cycles. One socket; -3% evasion.",
    map: [".lRR", "hlgg", "klvv", ".lss"],
    legend: {
      R: { id: "bay", name: "Drone Bay", sys: "drones" }, k: { id: "hold", name: "Car Hold", socket: true },
      a: { id: "passage", name: "Passage" },
      g: { id: "gallery", name: "Gallery" }, v: { id: "gangway", name: "Gangway" }, h: { id: "spares", name: "Spares Store" },
      s: { id: "sump", name: "Sump" },
    },
    airlocks: [{ room: "hold", x: 0, y: 2, side: "left" }],
    couple: { front: [3, 2] }, hardpoints: [], droneSlots: 1, hull: 0, crew: 0, cargo: 0, payloadCap: 0, sparesCap: 6,
    effects: { droneCharge: 0.15 }, evasionCost: 3, systemLevels: { drones: 4 }, cost: 90, rarity: 1, art: "drone-car",
  }),
  "armory-car": car({
    id: "armory-car", slot: "rear", name: "Armory Car", desc: "+1 roof mount and 10% faster weapon charging. One socket; -3% evasion. Guns and reactor power sold separately.",
    map: [".lmm", "hlgg", "klvv", ".lss"],
    legend: {
      m: { id: "magazine", name: "Magazine" }, k: { id: "hold", name: "Car Hold", socket: true },
      a: { id: "passage", name: "Passage" },
      g: { id: "gallery", name: "Gallery" }, v: { id: "gangway", name: "Gangway" }, h: { id: "armoury", name: "Armoury" },
      s: { id: "sump", name: "Sump" },
    },
    airlocks: [{ room: "hold", x: 0, y: 2, side: "left" }],
    couple: { front: [3, 2] }, hardpoints: [{ x: 2, side: "roof" }], droneSlots: 0, hull: 0, crew: 0, cargo: 0,
    payloadCap: 0, sparesCap: 0, effects: { weaponCharge: 0.1 }, evasionCost: 3, cost: 75, rarity: 1, art: "armory-car",
  }),
  "freight-car": car({
    id: "freight-car", slot: "rear", name: "Freight Car", desc: "+4 salvage from each eligible arrival, +4 cargo, +4 payload capacity, +3 hull and one socket; -2% evasion.",
    map: [".lff", "glhh", "klrr", ".lss"],
    legend: {
      h: { id: "hall", name: "Freight Hall" },
      f: { id: "freight", name: "Freight Deck" }, k: { id: "hold", name: "Car Hold", socket: true },
      r: { id: "rack", name: "Payload Rack" }, v: { id: "gangway", name: "Gangway" }, g: { id: "stores", name: "Stores" },
      s: { id: "sump", name: "Sump" },
    },
    airlocks: [{ room: "hold", x: 0, y: 2, side: "left" }],
    couple: { front: [3, 2] }, hardpoints: [], droneSlots: 0, hull: 3, crew: 0, cargo: 4, payloadCap: 4, sparesCap: 0,
    effects: { relayStores: 4 }, evasionCost: 2, cost: 65, rarity: 0, art: "freight-car",
  }),
  "bunk-car": car({
    id: "bunk-car", slot: "rear", name: "Bunk Car", desc: "+3 crew berths and a recovery bench: 2 HP/s for people and riggers without reactor power. One socket; -2% evasion.",
    map: [".lbb", "clhh", "klee", ".lss"],
    legend: {
      h: { id: "hall", name: "Bunk Hall" },
      b: { id: "bunks", name: "Bunks" }, k: { id: "hold", name: "Car Hold", socket: true },
      e: { id: "bench", name: "Recovery Bench", bench: 2 }, v: { id: "gangway", name: "Gangway" }, c: { id: "lockers", name: "Lockers" },
      s: { id: "sump", name: "Sump" },
    },
    airlocks: [{ room: "hold", x: 0, y: 2, side: "left" }],
    couple: { front: [3, 2] }, hardpoints: [], droneSlots: 0, hull: 0, crew: 3, cargo: 0, payloadCap: 0, sparesCap: 0,
    effects: {}, evasionCost: 2, cost: 65, rarity: 0, art: "bunk-car",
  }),
  "veil-car": car({
    id: "veil-car", slot: "rear", name: "Veil Car", desc: "Veil II machinery and 10% shorter Veil cooldown. One socket; -3% evasion. Needs 2 power for its full duration.",
    map: [".lVV", "hlgg", "klvv", ".lss"],
    legend: {
      V: { id: "veil", name: "Veil Room", sys: "veil" }, k: { id: "hold", name: "Car Hold", socket: true },
      a: { id: "passage", name: "Passage" },
      g: { id: "gallery", name: "Gallery" }, v: { id: "gangway", name: "Gangway" }, h: { id: "store", name: "Dark Store" },
      s: { id: "sump", name: "Sump" },
    },
    airlocks: [{ room: "hold", x: 0, y: 2, side: "left" }],
    couple: { front: [3, 2] }, hardpoints: [], droneSlots: 0, hull: 0, crew: 0, cargo: 0, payloadCap: 0, sparesCap: 0,
    effects: { veilCooldown: 0.1 }, evasionCost: 3, systemLevels: { veil: 2 }, cost: 110, rarity: 2, art: "veil-car",
  }),
};

export const KEEL_CARS: Record<KeelCarId, CarDef> = {
  "ballast-keel": car({
    id: "ballast-keel", slot: "keel", name: "Ballast Keel", desc: "+8 hull, half hull damage from debris and an air reserve that slows air loss by half; -3% evasion.",
    map: ["ttlbbb", ".clee."],
    legend: { e: { id: "service", name: "Service Bay" }, t: { id: "tank-a", name: "Ballast Tank" }, b: { id: "well", name: "Ballast Well" }, u: { id: "tank-b", name: "Ballast Tank" }, c: { id: "reserve", name: "Air Reserve" } },
    airlocks: [], couple: { top: [2, 0] }, hardpoints: [], droneSlots: 0, hull: 8, crew: 0, cargo: 0, payloadCap: 0,
    sparesCap: 0, effects: { airDecay: 0.5, debrisProtection: 0.5 }, evasionCost: 3, cost: 70, rarity: 0, art: "ballast-keel",
  }),
  "listening-keel": car({
    id: "listening-keel", slot: "keel", name: "Listening Keel", desc: "+1 Listening Post level and remote relay scouting. Light suspension: only -1% evasion.",
    map: ["hhlggg", ".alee."],
    legend: { e: { id: "service", name: "Service Bay" }, h: { id: "horn-a", name: "Horn" }, w: { id: "well", name: "Keel Well" }, g: { id: "horn-b", name: "Horn" }, a: { id: "array", name: "Horn Array" } },
    airlocks: [], couple: { top: [2, 0] }, hardpoints: [], droneSlots: 0, hull: 1, crew: 0, cargo: 0, payloadCap: 0,
    sparesCap: 0, effects: { sensors: 1, reveal: true }, evasionCost: 1, cost: 70, rarity: 1, art: "listening-keel",
  }),
  "sling-keel": car({
    id: "sling-keel", slot: "keel", name: "Sling Keel", desc: "+1 belly mount and +4 payload capacity. Light suspension: only -1% evasion. Weapon and power sold separately.",
    map: ["aalbbb", ".mlee."],
    legend: { e: { id: "service", name: "Service Bay" }, a: { id: "sling-a", name: "Sling" }, w: { id: "well", name: "Keel Well" }, b: { id: "sling-b", name: "Sling" }, m: { id: "magazine", name: "Magazine" } },
    airlocks: [], couple: { top: [2, 0] }, hardpoints: [{ x: 3, side: "belly" }], droneSlots: 0, hull: 1, crew: 0,
    cargo: 0, payloadCap: 4, sparesCap: 0, effects: {}, evasionCost: 1, cost: 65, rarity: 1, art: "sling-keel",
  }),
  "workshop-keel": car({
    id: "workshop-keel", slot: "keel", name: "Workshop Keel", desc: "Repair 35% faster; restore up to 2 hull after a secured ordinary fight. Repair bench, +2 spares and one socket; -2% evasion.",
    map: ["kklbbb", ".tlee."],
    legend: { e: { id: "service", name: "Service Bay" }, k: { id: "hold", name: "Keel Hold", socket: true }, w: { id: "well", name: "Keel Well" }, b: { id: "bench", name: "Repair Bench", bench: 1.2 }, t: { id: "tools", name: "Tool Store" } },
    airlocks: [], couple: { top: [2, 0] }, hardpoints: [], droneSlots: 0, hull: 1, crew: 0, cargo: 0, payloadCap: 0,
    sparesCap: 2, effects: { repair: 0.35, salvageRepair: 2 }, evasionCost: 2, cost: 85, rarity: 1, art: "workshop-keel",
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

/** Fallback handling cost for cars without an explicit mass penalty. */
export const CAR_EVASION_MALUS = 2;
