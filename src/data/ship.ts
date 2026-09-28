// The Lamplighter's starting state (FTL Kestrel-like) and small ShipState helpers. Pure.
import type { LampColor, LeadCarId, SpeciesId, SystemId } from "../game/ids.ts";
import type { CrewMember, Inventory, ShipState, SystemState } from "../game/types.ts";
import { SPECIES, emptyXp } from "./species.ts";
import { SYSTEMS } from "./systems.ts";
import { normalizeShip } from "./consist.ts";
import { LEAD_CARS } from "./cars.ts";

export const FALLBACK_NAMES: Record<SpeciesId, string[]> = {
  linefolk: ["Ada Morrow", "Tamsin Vell", "Oren Pike", "Jory Lamb", "Nell Hartley", "Pim Sato", "Rosa Keel", "Idris Wren"],
  warden: ["Brann Hale", "Mira Stoke", "Cass Ormond", "Tev Harrow", "Juno Blackwood", "Rhee Calder"],
  rigger: ["Rigger 7-Tern", "Rigger 2-Wren", "Rigger 9-Plover", "Rigger 4-Heron", "Rigger 5-Swift", "Rigger 3-Kite"],
  courier: ["Lio Fenn", "Sable Ruiz", "Kit Amsel", "Nadia Crow", "Teo Brask", "Wim Oduya"],
  bellmaker: ["Sister Aurel", "Ewan Glass", "Maud Vesper", "Corin Tolle"],
};

let uid = 0;
export function newCrewId(): string {
  uid++;
  return `c${Date.now().toString(36)}${uid.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function newCrew(species: SpeciesId, name: string, station?: string, look = 0): CrewMember {
  return { id: newCrewId(), name, species, hp: SPECIES[species].hp, xp: emptyXp(), station, look, kills: 0, repairs: 0 };
}

export interface StartingTender {
  id: LeadCarId;
  name: string;
  designation: string;
  role: string;
  description: string;
  strength: string;
  limitation: string;
}

export const STARTING_TENDERS: StartingTender[] = [
  { id: "lamplighter", name: "Lamplighter", designation: "L-12", role: "Lamp and rescue tender",
    description: "The lamplighter pattern as the Reach docks first built it. Two hundred years of relighting rounds and eleven rescue trips on the Night of the Fault. Its paired signal emitter and old repair-charge launcher now keep hunters off the carrier, and the Night Shift bolted a spare packet emitter into the empty third mount.",
    strength: "Ward mesh · Burst Emitter + Payload Launcher · spare Packet Laser in mount 3",
    limitation: "Payloads go through the mesh but spend scarce charges. The Packet Laser waits for a 4th Weapons Bay bar." },
  { id: "glasswing", name: "Glasswing", designation: "G-04", role: "Optical inspection tender",
    description: "A lamplighter-pattern car refitted to keep warning lamps in focus and inspect carrier glass: paired lenses under the nose cupola, a prism housing and survey horns on the roof. The Night Shift fitted a second packet emitter to the belly mount; all three emitters now fire together into quarantine defences.",
    strength: "Ward mesh · Burst Emitter + two Packet Lasers · survey lab",
    limitation: "No payload weapon, one drone slot. Fire all three emitters together to break a mesh." },
  { id: "switchback", name: "Switchback", designation: "S-08", role: "Drone retrieval tender",
    description: "A lamplighter-pattern car built tall to fetch inspection drones back from spans no person could reach. A heavy drive, a thicker hull and launch cradles on the roof took the place of a ward mesh; its retrieval shutters let it work with every lamp dark.",
    strength: "Relay + Firewall drones · Burst Emitter · Veil shutters · drone recovery",
    limitation: "No ward mesh, two gun mounts. Drones do the heavy work; close the Veil against volleys." },
];

const sys = (level: number, power: number): SystemState => ({ level, damage: 0, power });

/**
 * The Lamplighter at the start of a voyage (lead car only): 30 hull, reactor 8, shields 2, engines 2, weapons 3, air 1,
 * medbay 1, helm 1, sensors 1, doors 1; 3 hardpoints, 2 drone slots, 2 module sockets. Burst Emitter + Payload Launcher, and
 * a Packet Laser in mount 3 that stays unpowered until the Weapons Bay gets a fourth bar. Crew: a linefolk (helm), a warden (shields) and a
 * rigger (weapons). The Glasswing starts with reactor 9 and weapons 4: Burst Emitter and two Packet Lasers, all powered.
 * `pickName(species, taken)` supplies names (content names when present).
 */
export function makePlayerShip(
  name: string,
  pickName?: (species: SpeciesId, taken: string[]) => string | undefined,
  lamp: LampColor = "amber",
  tenderId: LeadCarId = "lamplighter",
): ShipState {
  const taken: string[] = [];
  const nm = (s: SpeciesId) => {
    const n = pickName?.(s, taken) || FALLBACK_NAMES[s].find((x) => !taken.includes(x)) || FALLBACK_NAMES[s][0];
    taken.push(n);
    return n;
  };
  const tender = STARTING_TENDERS.find((t) => t.id === tenderId)!;
  const ship: ShipState = {
    defId: tenderId,
    consist: { lead: tenderId },
    modules: {},
    moduleStore: [],
    livery: { lamp },
    name: name || tender.name,
    hull: LEAD_CARS[tenderId].hull,
    hullMax: LEAD_CARS[tenderId].hull,
    reactor: 8,
    systems: {
      shields: sys(2, 2),
      engines: sys(2, 2),
      weapons: sys(3, 3),
      air: sys(1, 1),
      medbay: sys(1, 0),
      helm: sys(1, 1),
      sensors: sys(1, 1),
      doors: sys(1, 1),
    },
    systemRooms: {},
    weapons: ["burst-emitter", "payload-launcher", null, null],
    weaponPower: [true, true, false, false],
    weaponSlots: 4,
    drones: [null, null],
    droneSlots: 2,
    cargo: [],
    augments: [],
    crew: [
      newCrew("linefolk", nm("linefolk"), "lead:helm", 0),
      newCrew("warden", nm("warden"), "lead:shields", 1),
      newCrew("rigger", nm("rigger"), "lead:weapons", 2),
    ],
  };
  // The Night Shift bolted a spare packet emitter into the Lamplighter's empty third mount; the bay needs another bar
  // before it can run.
  if (tenderId === "lamplighter") { ship.weapons[2] = "packet-laser"; ship.weaponPower[2] = false; }
  // The Glasswing comes with a Burst Emitter and two Packet Lasers, all powered: a fourth Weapons Bay bar and a ninth
  // reactor bar carry the second laser.
  if (tenderId === "glasswing") {
    ship.reactor = 9;
    ship.systems.weapons = sys(4, 4);
    ship.weapons[1] = "packet-laser";
    ship.weapons[2] = "packet-laser";
    ship.weaponPower[2] = true;
  }
  if (tenderId === "switchback") {
    delete ship.systems.shields;
    ship.hull = ship.hullMax = 34;
    ship.reactor = 10;
    ship.systems.engines = sys(3, 3);
    ship.systems.weapons = sys(2, 2);
    ship.systems.drones = sys(4, 4);
    ship.systems.veil = sys(2, 0);
    ship.drones = ["relay-drone", "firewall-drone"];
    ship.weapons[1] = null;
    ship.weaponPower[1] = false;
    ship.augments = ["drone-recovery"];
    ship.crew[1].station = "lead:engines";
  }
  return normalizeShip(ship);
}

export function newInventory(tenderId: LeadCarId = "lamplighter"): Inventory {
  return { salvage: 20, ttl: 16, payloads: tenderId === "lamplighter" ? 8 : 0, spares: tenderId === "switchback" ? 8 : 2 };
}

/** Give the ship a purchasable system at its purchase level (it only works while a car or module hosts it). */
export function installSystem(ship: ShipState, id: SystemId): void {
  const d = SYSTEMS[id];
  if (!ship.systems[id]) ship.systems[id] = { level: d.buyLevel ?? 1, damage: 0, power: 0 };
}

/** Deep copy (the sim never mutates the ShipState it was given). */
export function cloneShip(s: ShipState): ShipState {
  return JSON.parse(JSON.stringify(s)) as ShipState;
}
