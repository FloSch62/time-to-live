// Room modules for socket rooms (contract ★v2.1). Adding a module = a new entry here (+ an icon frame).
import type { ModuleId, SystemId } from "../game/ids.ts";

export interface ModuleDef {
  id: ModuleId;
  name: string;
  desc: string;
  /** System this module hosts when no car does (drone-bay → drones, veil-housing → veil). */
  hosts?: SystemId;
  effects: {
    repair?: number;
    crew?: number;
    cargo?: number;
    payloadCap?: number;
    sparesCap?: number;
    hull?: number;
    sensors?: number;
    /** Crew heal slowly in the socket room (HP/s). */
    bench?: number;
  };
  cost: number;
  rarity: number;
}

export const MODULES: Record<ModuleId, ModuleDef> = {
  "drone-bay": { id: "drone-bay", name: "Drone Bay", desc: "Hosts the Drone Bay system in this room.", hosts: "drones", effects: {}, cost: 55, rarity: 1 },
  "veil-housing": { id: "veil-housing", name: "Veil Housing", desc: "Hosts the Lamp-Dark Veil in this room.", hosts: "veil", effects: {}, cost: 80, rarity: 2 },
  workshop: { id: "workshop", name: "Workshop", desc: "Crew repair 25% faster.", effects: { repair: 0.25 }, cost: 45, rarity: 1 },
  bunks: { id: "bunks", name: "Bunks", desc: "+1 crew berth.", effects: { crew: 1 }, cost: 30, rarity: 0 },
  "cargo-hold": { id: "cargo-hold", name: "Cargo Hold", desc: "+2 cargo.", effects: { cargo: 2 }, cost: 25, rarity: 0 },
  "payload-rack": { id: "payload-rack", name: "Payload Rack", desc: "+3 max payloads.", effects: { payloadCap: 3 }, cost: 30, rarity: 0 },
  ballast: { id: "ballast", name: "Ballast", desc: "+3 hull.", effects: { hull: 3 }, cost: 40, rarity: 0 },
  "listening-horn-array": { id: "listening-horn-array", name: "Listening Horn Array", desc: "+1 Listening Post level.", effects: { sensors: 1 }, cost: 45, rarity: 1 },
  "kettle-bench": { id: "kettle-bench", name: "Kettle Bench", desc: "Crew in this room heal slowly.", effects: { bench: 1.5 }, cost: 30, rarity: 0 },
};
