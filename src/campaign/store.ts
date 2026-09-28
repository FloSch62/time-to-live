// The Salvage Exchange (contract §3.5): stock rolled per market by stage, prices from the catalog, buy/sell at half
// price, hull repair per point, supplies, system installs and crew hire. Pell's stall in Stage I. Pure module.
import { Rng, hashString } from "../core/rng.ts";
import type { AugmentId, DroneId, SpeciesId, SystemId, WeaponId } from "../game/ids.ts";
import { catalog, itemInfo, rarityWeight, sellPrice, type ItemInfo } from "./catalog.ts";
import { currentRelay, type RunState, type StoreItem, type StoreStock } from "./model.ts";
import {
  AUGMENT_MAX, cargoCap, crewCap, SYSTEM_ROOM, addAugment, installSystem, makeCrew, pickCrewName, placeItem, removeItem,
} from "./shipops.ts";
import { relayLabel } from "./events.ts";
import { ALL_CARS, ALL_MODULES, carInfo, coupleCar, freeSocket, isCarId, moduleInfo, payloadCap, refit, refitBlocker, carSlot, sparesCap, uncoupleCar, uncoupleBlocker, type AttachCarId, type Displaced } from "./refit.ts";
import type { ModuleId } from "../game/ids.ts";
import { difficultyRules } from "../data/difficulty.ts";

const STAGE_MARKUP = [1, 1, 1.1, 1.2];

export function priceOf(base: number, stage: number, pell = false): number {
  return Math.max(1, Math.round(base * (STAGE_MARKUP[stage] ?? 1) * (pell ? 0.92 : 1)));
}

function pickItems(list: ItemInfo[], n: number, stage: 1 | 2 | 3, rng: Rng): ItemInfo[] {
  const pool = list.filter((i) => !i.noStore && (i.minStage ?? 1) <= stage);
  const out: ItemInfo[] = [];
  for (let k = 0; k < n && pool.length; k++) {
    const it = rng.weighted(pool, (i) => rarityWeight(i, stage) + 0.2);
    out.push(it);
    pool.splice(pool.indexOf(it), 1);
  }
  return out;
}

/** Roll a market's stock (deterministic per run seed, stage and relay). */
export function rollStock(run: RunState, relayId: number, pell = false): StoreStock {
  const stage = run.stage;
  const rules = difficultyRules(run.difficulty);
  const rng = new Rng(hashString(`${run.seed}|store|${stage}|${relayId}`));
  const items: StoreItem[] = [];
  for (const w of pickItems(Object.values(catalog.weapons), 3, stage, rng)) items.push({ kind: "weapon", id: w.id, price: priceOf(w.price, stage, pell) });
  // A three-stage run has few exchanges. Keep one dependable, ammunition-free option on each shelf;
  // the other slots retain their random specializations. Upgrading never depends on a rare drop.
  const dependable: Record<1 | 2 | 3, WeaponId[]> = {
    1: ["packet-laser", "burst-emitter"],
    2: ["triple-burst", "jumbo-frame-ii"],
    3: ["triple-burst", "jumbo-frame-ii", "multicast-array"],
  };
  if (!items.some(it => dependable[stage].includes(it.id as WeaponId))) {
    const w = catalog.weapons[rng.pick(dependable[stage])];
    items[0] = { kind: "weapon", id: w.id, price: priceOf(w.price, stage, pell) };
  }
  for (const d of pickItems(Object.values(catalog.drones), rng.int(1, 2), stage, rng)) items.push({ kind: "drone", id: d.id, price: priceOf(d.price, stage, pell) });
  const augs = pickItems(Object.values(catalog.augments), rng.int(2, 3), stage, rng);
  if (pell && !augs.some((a) => a.id === "vargas-crimper")) augs[0] = catalog.augments["vargas-crimper"];
  for (const a of augs) items.push({ kind: "augment", id: a.id, price: priceOf(a.price, stage, pell) });
  const hires = Object.values(catalog.species).filter((s) => s.hireable);
  const nCrew = rng.int(1, 2);
  const taken: string[] = run.ship.crew.map((c) => c.name);
  for (let k = 0; k < nCrew; k++) {
    const sp = rng.pick(hires);
    const name = pickCrewName(sp.id, taken, rng);
    taken.push(name);
    items.push({ kind: "crew", id: sp.id, price: priceOf(sp.price, stage), name });
  }
  // Cars and refits (Pell's stall in Stage I always has a couple of cars).
  const cars = [rng.pick(ALL_CARS.filter(c => carSlot(c) === "rear")), rng.pick(ALL_CARS.filter(c => carSlot(c) === "keel"))];
  if (pell) cars.push(rng.pick(ALL_CARS.filter(c => !cars.includes(c))));
  for (const c of cars) items.push({ kind: "car", id: c, price: priceOf(carInfo(c).price, stage, pell) });
  const mods = rng.shuffle([...ALL_MODULES].filter((m) => m !== "drone-bay" && m !== "veil-housing")).slice(0, rng.int(2, 3));
  for (const m of mods) items.push({ kind: "module", id: m, price: priceOf(moduleInfo(m).price, stage, pell) });
  for (const sys of ["shields", "drones", "veil"] as SystemId[]) {
    const info = catalog.systems[sys];
    if (info?.buy && (sys === "shields" || rng.chance(sys === "drones" ? 0.75 : 0.5))) items.push({ kind: "system", id: sys, price: priceOf(info.buy, stage) });
  }
  const stock: StoreStock = {
    items,
    ttl: rng.int(3, 7) + rules.supplyStock,
    payloads: rng.int(3, 7) + rules.supplyStock,
    spares: rng.int(2, 6) + rules.supplyStock,
    prices: {
      ttl: priceOf(3, stage, pell),
      payloads: priceOf(6, stage, pell),
      spares: priceOf(8, stage, pell),
      hull: rules.repairPrices[stage],
    },
  };
  if (pell) stock.pell = true;
  return stock;
}

/** The current relay's store, rolled on first visit. */
export function storeHere(run: RunState, pell = false): StoreStock {
  const r = currentRelay(run);
  if (!r.store) r.store = rollStock(run, r.id, pell);
  else if (pell && !r.store.pell) r.store.pell = true;
  return r.store;
}

export interface TxResult {
  ok: boolean;
  reason?: string;
  text?: string;
}

function spend(run: RunState, n: number) {
  run.inv.salvage -= n;
  run.stats.salvageSpent += n;
}

export function canAfford(run: RunState, n: number) {
  return run.inv.salvage >= n;
}

/** Why an item cannot be bought right now (or null). */
export function buyBlocker(run: RunState, it: StoreItem): string | null {
  if (it.sold) return "Sold";
  if (!canAfford(run, it.price)) return "Not enough salvage";
  const ship = run.ship;
  if (it.kind === "augment") {
    if (ship.augments.length >= AUGMENT_MAX) return "Augment slots full (3)";
    if (ship.augments.includes(it.id as AugmentId)) return "Already fitted";
  }
  if (it.kind === "weapon" || it.kind === "drone") {
    const mounts = it.kind === "weapon" ? ship.weapons : ship.drones;
    const slots = it.kind === "weapon" ? ship.weaponSlots : ship.droneSlots;
    const freeMount = (it.kind === "weapon" || !!ship.systems.drones) && mounts.slice(0, slots).some((m) => !m);
    if (!freeMount && ship.cargo.length >= cargoCap(ship)) return "No room: free a mount or cargo slot";
  }
  if (it.kind === "crew" && ship.crew.length >= crewCap(ship)) return `Crew full (${crewCap(ship)})`;
  if (it.kind === "car" && ship.consist?.[carSlot(it.id as AttachCarId)] === it.id) return "Already coupled";
  if (it.kind === "car") {
    const preview = JSON.parse(JSON.stringify(ship)) as typeof ship;
    coupleCar(preview, it.id as AttachCarId);
    const capacity = crewCap(preview);
    if (ship.crew.length > capacity) return `Crew need ${ship.crew.length} berths; this consist has ${capacity}`;
  }
  if (it.kind === "module") {
    const block = refitBlocker(ship, freeSocket(ship) ?? "", it.id as ModuleId);
    if (block) return block;
  }
  if (it.kind === "system") {
    if (ship.systems[it.id as SystemId]) return "Already installed";
    if (it.id !== "shields" && !ship.systemRooms[it.id as SystemId] && !freeSocket(ship)) return "No free module socket";
  }
  return null;
}

export function buyItem(run: RunState, stock: StoreStock, index: number): TxResult {
  const it = stock.items[index];
  if (!it) return { ok: false, reason: "Nothing there" };
  const block = buyBlocker(run, it);
  if (block) return { ok: false, reason: block };
  const ship = run.ship;
  if (it.kind === "weapon" || it.kind === "drone") {
    const r = placeItem(ship, it.id as WeaponId | DroneId);
    if (r.placed === "overflow") return { ok: false, reason: "No room" };
    run.found.push(it.id as WeaponId);
  } else if (it.kind === "augment") {
    addAugment(ship, it.id as AugmentId);
  } else if (it.kind === "crew") {
    const rng = new Rng(hashString(`${run.seed}|hire|${it.name}`));
    const m = makeCrew(run, it.id as SpeciesId, it.name, rng, relayLabel(run));
    ship.crew.push(m);
    run.stats.crewJoined++;
  } else if (it.kind === "system") {
    if (!installSystem(ship, it.id as SystemId)) return { ok: false, reason: "No free module socket" };
  } else if (it.kind === "car") {
    const out: Displaced = coupleCar(ship, it.id as AttachCarId);
    for (const x of out.items) run.inv.salvage += sellPrice(x);
  } else if (it.kind === "module") {
    ship.moduleStore.push(it.id as ModuleId);
    const sock = freeSocket(ship);
    if (sock) refit(ship, sock, it.id as ModuleId);
  }
  spend(run, it.price);
  it.sold = true;
  return { ok: true };
}

export type Supply = "ttl" | "payloads" | "spares";

/** How many of a supply the tender can still carry. */
export function supplyRoom(run: RunState, kind: Supply): number {
  if (kind === "ttl") return 99;
  return Math.max(0, (kind === "payloads" ? payloadCap(run.ship) : sparesCap(run.ship)) - run.inv[kind]);
}

export function buySupply(run: RunState, stock: StoreStock, kind: Supply, n = 1): TxResult {
  const price = stock.prices[kind] * n;
  if (supplyRoom(run, kind) < n) return { ok: false, reason: "No room to carry more" };
  if (stock[kind] < n) return { ok: false, reason: "Out of stock" };
  if (!canAfford(run, price)) return { ok: false, reason: "Not enough salvage" };
  spend(run, price);
  stock[kind] -= n;
  run.inv[kind] += n;
  return { ok: true };
}

export function repairCost(run: RunState, stock: StoreStock, n: number | "all"): number {
  const missing = run.ship.hullMax - run.ship.hull;
  const pts = n === "all" ? Math.min(missing, Math.floor(run.inv.salvage / stock.prices.hull)) : Math.min(n, missing);
  return pts * stock.prices.hull;
}

export function repairHullAt(run: RunState, stock: StoreStock, n: number | "all"): TxResult {
  const missing = run.ship.hullMax - run.ship.hull;
  if (missing <= 0) return { ok: false, reason: "Hull is whole" };
  const pts = n === "all" ? Math.min(missing, Math.floor(run.inv.salvage / stock.prices.hull)) : Math.min(n, missing);
  if (pts <= 0 || !canAfford(run, pts * stock.prices.hull)) return { ok: false, reason: "Not enough salvage" };
  spend(run, pts * stock.prices.hull);
  run.ship.hull += pts;
  return { ok: true };
}

/** Sell a weapon/drone/augment (mounted or in cargo) for half its price. */
export function sellItem(run: RunState, id: string): TxResult {
  if (!itemInfo(id)) return { ok: false, reason: "Cannot sell that" };
  // Keep at least one weapon aboard.
  const ws = run.ship.weapons.filter(Boolean).length + run.ship.cargo.filter((c) => catalog.weapons[c as WeaponId]).length;
  if (catalog.weapons[id as WeaponId] && ws <= 1) return { ok: false, reason: "The tender needs one weapon" };
  if (!removeItem(run.ship, id)) return { ok: false, reason: "Not aboard" };
  const v = sellPrice(id);
  run.inv.salvage += v;
  run.stats.salvageEarned += v;
  return { ok: true, text: `+${v}` };
}

/** Uncouple a car and sell it for half its price. */
export function sellCar(run: RunState, slot: "rear" | "keel"): TxResult {
  const id = run.ship.consist?.[slot];
  if (!id || !isCarId(id)) return { ok: false, reason: "No car there" };
  const block = uncoupleBlocker(run.ship, slot);
  if (block) return { ok: false, reason: block };
  const out = uncoupleCar(run.ship, slot);
  let v = Math.floor(carInfo(id).price / 2);
  for (const x of out.items) v += sellPrice(x);
  run.inv.salvage += v;
  run.stats.salvageEarned += v;
  return { ok: true, text: `+${v}` };
}

/** Sell a module from the stores for half its price. */
export function sellModule(run: RunState, id: ModuleId): TxResult {
  const i = run.ship.moduleStore.indexOf(id);
  if (i < 0) return { ok: false, reason: "Not in the stores" };
  run.ship.moduleStore.splice(i, 1);
  const v = Math.floor(moduleInfo(id).price / 2);
  run.inv.salvage += v;
  run.stats.salvageEarned += v;
  return { ok: true, text: `+${v}` };
}
