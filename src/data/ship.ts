// The Lamplighter's starting state (FTL Kestrel-like) and small ShipState helpers. Pure.
import type { LampColor, SpeciesId, SystemId } from "../game/ids.ts";
import type { CrewMember, Inventory, ShipState, SystemState } from "../game/types.ts";
import { SPECIES, emptyXp } from "./species.ts";
import { SYSTEMS } from "./systems.ts";

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

const sys = (level: number, power: number): SystemState => ({ level, damage: 0, power });

/**
 * The Lamplighter at the start of a voyage (lead car only): 30 hull, reactor 8, shields 2, engines 2, weapons 3, air 1,
 * medbay 1, helm 1, sensors 1, doors 1; 3 hardpoints, 2 drone slots, 2 module sockets. Burst Emitter + Payload Launcher. Crew: a linefolk (helm), a warden (shields) and a
 * rigger (weapons). `pickName(species, taken)` supplies names (content names when present).
 */
export function makePlayerShip(
  name: string,
  pickName?: (species: SpeciesId, taken: string[]) => string | undefined,
  lamp: LampColor = "amber",
): ShipState {
  const taken: string[] = [];
  const nm = (s: SpeciesId) => {
    const n = pickName?.(s, taken) || FALLBACK_NAMES[s].find((x) => !taken.includes(x)) || FALLBACK_NAMES[s][0];
    taken.push(n);
    return n;
  };
  return {
    defId: "lamplighter",
    consist: { lead: "lamplighter" },
    modules: {},
    moduleStore: [],
    livery: { lamp },
    name: name || "Lamplighter",
    hull: 30,
    hullMax: 30,
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
    weapons: ["burst-emitter", "payload-launcher", null],
    weaponPower: [true, true, false],
    weaponSlots: 3,
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
}

export function newInventory(): Inventory {
  return { salvage: 20, ttl: 16, payloads: 8, spares: 2 };
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
