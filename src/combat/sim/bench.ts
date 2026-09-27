// Benchmark player ships for tests, the balance runner and dev entries: what a reasonable player has at a given
// point of the voyage (starter / typical / strong per stage). Pure.
import type { ShipState } from "../../game/types.ts";
import type { StageIndex, WeaponId, DroneId, SpeciesId, RearCarId, KeelCarId } from "../../game/ids.ts";
import { makePlayerShip, newCrew, newInventory } from "../../data/ship.ts";
import { coupleCar, normalizeShip } from "../../data/consist.ts";
import type { Inventory } from "../../game/types.ts";

export type BenchLevel = "starter" | "typical" | "strong";

interface Spec {
  reactor: number;
  sys: Partial<Record<"shields" | "engines" | "weapons" | "air" | "medbay" | "helm" | "sensors" | "doors" | "drones" | "veil", number>>;
  weapons: WeaponId[];
  drones?: DroneId[];
  crew: SpeciesId[];
  rear?: RearCarId;
  keel?: KeelCarId;
  hull: number;
  xp?: number;
}

const SPECS: Record<StageIndex, Record<BenchLevel, Spec>> = {
  1: {
    starter: { reactor: 8, sys: {}, weapons: ["burst-emitter", "payload-launcher"], crew: [], hull: 30 },
    typical: { reactor: 10, sys: { shields: 4, engines: 3, weapons: 4 }, weapons: ["burst-emitter", "payload-launcher", "packet-laser"], crew: ["linefolk"], hull: 26 },
    strong: {
      reactor: 12, sys: { shields: 4, engines: 4, weapons: 5, helm: 2, sensors: 2 }, weapons: ["burst-emitter", "jumbo-frame", "payload-launcher"],
      drones: ["firewall-drone"], crew: ["linefolk", "courier"], rear: "drone-car", hull: 30,
    },
  },
  2: {
    starter: { reactor: 11, sys: { shields: 4, engines: 3, weapons: 4 }, weapons: ["burst-emitter", "payload-launcher", "packet-laser"], crew: ["linefolk"], hull: 24 },
    typical: {
      reactor: 14, sys: { shields: 4, engines: 4, weapons: 6, helm: 2, sensors: 2, medbay: 2 }, weapons: ["triple-burst", "burst-emitter", "jumbo-frame"],
      crew: ["linefolk", "courier"], hull: 26, keel: "ballast-keel", xp: 20,
    },
    strong: {
      reactor: 17, sys: { shields: 6, engines: 5, weapons: 7, helm: 2, sensors: 3, medbay: 2, drones: 3 },
      weapons: ["triple-burst", "burst-emitter", "trunk-lance"], drones: ["firewall-drone"], crew: ["linefolk", "courier", "warden"],
      rear: "drone-car", keel: "ballast-keel", hull: 34, xp: 30,
    },
  },
  3: {
    starter: {
      reactor: 14, sys: { shields: 4, engines: 4, weapons: 6, helm: 2, sensors: 2, medbay: 2 }, weapons: ["triple-burst", "burst-emitter", "jumbo-frame"],
      crew: ["linefolk", "courier"], hull: 24, xp: 20,
    },
    typical: {
      reactor: 20, sys: { shields: 6, engines: 5, weapons: 8, helm: 2, sensors: 3, medbay: 2, doors: 2 },
      weapons: ["triple-burst", "triple-burst", "jumbo-frame", "trunk-lance"], crew: ["linefolk", "courier", "warden"], rear: "armory-car",
      keel: "ballast-keel", hull: 32, xp: 40,
    },
    strong: {
      reactor: 25, sys: { shields: 8, engines: 6, weapons: 8, helm: 3, sensors: 3, medbay: 3, doors: 3, drones: 4 },
      weapons: ["triple-burst", "triple-burst", "trunk-lance", "jumbo-frame-ii"], drones: ["firewall-drone", "relay-drone"],
      crew: ["linefolk", "courier", "warden", "rigger"], rear: "drone-car", keel: "sling-keel", hull: 36, xp: 60,
    },
  },
};

export function benchShip(stage: StageIndex, level: BenchLevel, name = "Lamplighter"): ShipState {
  const sp = SPECS[stage][level];
  let s = makePlayerShip(name);
  if (sp.rear) s = coupleCar(s, "rear", sp.rear);
  if (sp.keel) s = coupleCar(s, "keel", sp.keel);
  s.reactor = sp.reactor;
  for (const [id, lv] of Object.entries(sp.sys)) {
    const st = s.systems[id as keyof typeof s.systems];
    if (st) st.level = Math.max(st.level, lv as number);
    else s.systems[id as keyof typeof s.systems] = { level: lv as number, damage: 0, power: 0 };
  }
  const main = ["shields", "engines", "air", "medbay"] as const;
  for (const id of main) {
    const st = s.systems[id];
    if (st) st.power = id === "medbay" ? 0 : id === "air" ? 1 : st.level;
  }
  normalizeShip(s);
  s.weapons = s.weapons.map((_, i) => sp.weapons[i] ?? null);
  s.weaponPower = s.weapons.map((w) => !!w);
  s.drones = s.drones.map((_, i) => sp.drones?.[i] ?? null);
  const stations = ["lead:engines", "lead:shields", "lead:sensors", "lead:doors"];
  sp.crew.forEach((sp2, i) => s.crew.push(newCrew(sp2, `${sp2} ${i + 1}`, stations[i % stations.length], i + 3)));
  if (sp.xp) for (const c of s.crew) for (const k of Object.keys(c.xp) as (keyof typeof c.xp)[]) c.xp[k] = sp.xp;
  s.hullMax = Math.max(s.hullMax, sp.hull);
  s.hull = s.hullMax;
  return s;
}

export function benchInventory(stage: StageIndex): Inventory {
  const inv = newInventory();
  inv.payloads = 8 + (stage - 1) * 2;
  inv.spares = 3 + (stage - 1) * 2;
  return inv;
}
