// Event runtime: event selection per relay, conditions, blue options, placeholder substitution, outcome rolls and
// application of every Outcome field (game/types.ts). Pure module.
import { Rng, hashString } from "../core/rng.ts";
import type { EnemyId, ResourceId, SpeciesId, StageIndex, SystemId } from "../game/ids.ts";
import { RESOURCE_IDS, SPECIES_IDS } from "../game/ids.ts";
import type { ChoiceDef, Condition, EventDef, EventPool, Outcome, Range, Reward } from "../game/types.ts";
import { ENEMY_FLAVOR, RELAY_FLAVOR, STAGE_FLAVOR } from "../content/flavor.ts";
import { catalog, enemyName, itemName, isHuman, titleCase } from "./catalog.ts";
import { content, eventById } from "./content.ts";
import { pushSeal } from "./map.ts";
import {
  currentRelay, isSealed, relayDepth, setFlag, clearFlag, hasFlag,
  type ItemId, type PendingCombat, type RunState,
} from "./model.ts";
import { randomAugment, randomDrone, randomSpecies, randomWeapon, rollReward } from "./rewards.ts";
import {
  crewCap, addAugment, allDrones, allWeapons, healAll, isAugment, isDrone, isWeapon, makeCrew, placeItem,
  repairHull, speciesMaxHp, type Placement,
} from "./shipops.ts";
import { carInfo, carSlot, isCarId, moduleInfo, normalizeShip, payloadCap, sparesCap, type AttachCarId } from "./refit.ts";
import { KEEL_CAR_IDS, MODULE_IDS, REAR_CAR_IDS, type ModuleId } from "../game/ids.ts";

// ─── rng helpers ──────────────────────────────────────────────────────────────────────────────────────────

/** Run a function with the run's main generator and store its state back. */
export function withRng<T>(run: RunState, fn: (rng: Rng) => T): T {
  const rng = new Rng(run.rng);
  const out = fn(rng);
  run.rng = rng.state();
  return out;
}

export function rollRange(r: Range, rng: Rng): number {
  if (typeof r === "number") return r;
  const [a, b] = r;
  return rng.int(Math.min(a, b), Math.max(a, b));
}

// ─── names ────────────────────────────────────────────────────────────────────────────────────────────────

export function stageName(stage: StageIndex): string {
  return STAGE_FLAVOR?.[stage]?.name ?? ["", "The Copper Reach", "The Glass Cathedral", "The Blackout Heart"][stage];
}

export function systemName(id: SystemId): string {
  return catalog.systems[id]?.name ?? titleCase(id);
}

export function speciesName(id: SpeciesId): string {
  return catalog.species[id]?.name ?? titleCase(id);
}

export const RESOURCE_NAME: Record<ResourceId, string> = {
  salvage: "Salvage", ttl: "TTL", payloads: "Payloads", spares: "Spares", hull: "Hull",
};

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// ─── conditions ───────────────────────────────────────────────────────────────────────────────────────────

export interface CheckResult {
  ok: boolean;
  reason?: string;
}

export function resourceAmount(run: RunState, id: ResourceId): number {
  return id === "hull" ? run.ship.hull : run.inv[id];
}

export function checkCondition(run: RunState, c: Condition | undefined): CheckResult {
  if (!c) return { ok: true };
  const ship = run.ship;
  if (c.resources) {
    for (const [k, v] of Object.entries(c.resources) as [ResourceId, number][]) {
      if (resourceAmount(run, k) < v) return { ok: false, reason: `Needs ${v} ${RESOURCE_NAME[k]}` };
    }
  }
  if (c.system) {
    const s = ship.systems[c.system.id];
    if (!s || s.level < c.system.level) {
      return { ok: false, reason: `Needs ${systemName(c.system.id)}${c.system.level > 1 ? ` level ${c.system.level}` : ""}` };
    }
  }
  if (c.weapon) {
    const ws = allWeapons(ship);
    const ok = isWeapon(c.weapon) ? ws.includes(c.weapon) : ws.some((w) => catalog.weapons[w]?.wtype === c.weapon);
    if (!ok) return { ok: false, reason: isWeapon(c.weapon) ? `Needs ${itemName(c.weapon)}` : `Needs a ${c.weapon} weapon` };
  }
  if (c.drone && !allDrones(ship).includes(c.drone)) return { ok: false, reason: `Needs ${itemName(c.drone)}` };
  if (c.augment && !ship.augments.includes(c.augment)) return { ok: false, reason: `Needs ${itemName(c.augment)}` };
  if (c.species && !ship.crew.some((m) => m.species === c.species)) {
    return { ok: false, reason: `Needs a ${speciesName(c.species)} aboard` };
  }
  if (c.crewMin !== undefined && ship.crew.length < c.crewMin) return { ok: false, reason: `Needs ${c.crewMin} crew` };
  if (c.car) {
    const cs = ship.consist ?? { lead: "lamplighter" };
    const ok = c.car === "rear" || c.car === "keel" ? !!cs[c.car] : cs.rear === c.car || cs.keel === c.car;
    if (!ok) return { ok: false, reason: c.car === "rear" ? "Needs a rear car" : c.car === "keel" ? "Needs a keel car" : `Needs the ${carInfo(c.car as AttachCarId).name}` };
  }
  if (c.carFree) {
    const cs = ship.consist ?? { lead: "lamplighter" };
    if (cs[c.carFree]) return { ok: false, reason: `The ${c.carFree} coupling is taken` };
  }
  if (c.module) {
    const has = Object.values(ship.modules ?? {}).includes(c.module) || (ship.moduleStore ?? []).includes(c.module);
    if (!has) return { ok: false, reason: `Needs the ${moduleInfo(c.module).name}` };
  }
  if (c.flag && !hasFlag(run, c.flag)) return { ok: false, reason: "Not available" };
  if (c.notFlag && hasFlag(run, c.notFlag)) return { ok: false, reason: "Not available" };
  if (c.stage !== undefined && run.stage !== c.stage) return { ok: false, reason: "Not available" };
  return { ok: true };
}

/** The FTL blue-option label, e.g. "[Listening Post]", "[Rigger]", "[Fiber Lance]". */
export function reqLabel(c: Condition | undefined): string {
  if (!c) return "";
  const parts: string[] = [];
  if (c.system) parts.push(`${systemName(c.system.id)}${c.system.level > 1 ? ` ${ROMAN[c.system.level] ?? c.system.level}` : ""}`);
  if (c.weapon) parts.push(isWeapon(c.weapon) ? itemName(c.weapon) : `${titleCase(c.weapon)} weapon`);
  if (c.drone) parts.push(itemName(c.drone));
  if (c.augment) parts.push(itemName(c.augment));
  if (c.species) parts.push(speciesName(c.species));
  if (c.crewMin !== undefined) parts.push(`${c.crewMin} crew`);
  if (c.car) parts.push(c.car === "rear" ? "Rear car" : c.car === "keel" ? "Keel car" : carInfo(c.car as AttachCarId).name);
  if (c.carFree) parts.push(c.carFree === "rear" ? "Free rear coupling" : "Free keel hangers");
  if (c.module) parts.push(moduleInfo(c.module).name);
  if (!parts.length && c.resources) {
    for (const [k, v] of Object.entries(c.resources) as [ResourceId, number][]) parts.push(`${v} ${RESOURCE_NAME[k]}`);
  }
  return parts.length ? `[${parts.join(", ")}]` : "";
}

// ─── placeholders ─────────────────────────────────────────────────────────────────────────────────────────

export interface EventCtx {
  /** Crew member chosen for {crew} in this encounter (id). */
  crewId?: string;
  /** Seed for stable per-view choices. */
  seed: number;
}

export function newCtx(run: RunState, salt = ""): EventCtx {
  const seed = hashString(`${run.seed}:${run.stage}:${run.pos}:${run.stats.hops}:${salt}`);
  const rng = new Rng(seed);
  const crew = run.ship.crew;
  return { seed, crewId: crew.length ? rng.pick(crew).id : undefined };
}

export function substitute(text: string, run: RunState, ctx: EventCtx): string {
  return text.replace(/\{(ship|crew|stage|ttl|relay|crew:[a-z]+)\}/g, (m, key: string) => {
    if (key === "ship") return run.ship.name;
    if (key === "stage") return stageName(run.stage);
    if (key === "ttl") return String(run.inv.ttl);
    if (key === "relay") return currentRelay(run)?.name ?? "the relay";
    if (key === "crew") {
      let c = run.ship.crew.find((x) => x.id === ctx.crewId);
      if (!c && run.ship.crew.length) {
        c = run.ship.crew[ctx.seed % run.ship.crew.length];
        ctx.crewId = c.id;
      }
      return c?.name ?? "the crew";
    }
    const sp = key.slice(5) as SpeciesId;
    const c = run.ship.crew.find((x) => x.species === sp);
    if (c) return c.name;
    return (SPECIES_IDS as readonly string[]).includes(sp) ? `the ${speciesName(sp).toLowerCase()}` : m;
  });
}

// ─── presenting events ────────────────────────────────────────────────────────────────────────────────────

export interface ChoiceView {
  index: number;
  text: string;
  enabled: boolean;
  blue: boolean;
  label: string; // "[Listening Post]"
  reason?: string;
  /** Costs in the requirement (shown as a small line). */
  hidden: boolean;
}

export interface EventView {
  id: string;
  title?: string;
  text: string;
  art?: string;
  portrait?: string;
  speaker?: string;
  choices: ChoiceView[];
  music?: string;
}

export function presentEvent(run: RunState, def: EventDef, ctx: EventCtx): EventView {
  const choices: ChoiceView[] = def.choices.map((c: ChoiceDef, i) => {
    const res = checkCondition(run, c.req);
    const blue = !!c.blue;
    const hideIfUnmet = c.hideIfUnmet ?? blue;
    return {
      index: i,
      text: substitute(c.text, run, ctx),
      enabled: res.ok,
      blue: blue && res.ok,
      label: blue ? reqLabel(c.req) : "",
      reason: res.ok ? undefined : res.reason,
      hidden: !res.ok && hideIfUnmet,
    };
  });
  // Never leave the player without a way on: if everything is hidden/disabled, enable the last one.
  if (!choices.some((c) => c.enabled && !c.hidden) && choices.length) {
    const last = choices[choices.length - 1];
    last.enabled = true;
    last.hidden = false;
    last.reason = undefined;
  }
  return {
    id: def.id,
    title: def.title ? substitute(def.title, run, ctx) : undefined,
    text: substitute(def.text, run, ctx),
    art: def.art,
    portrait: def.portrait,
    speaker: def.speaker ? substitute(def.speaker, run, ctx) : undefined,
    choices,
    music: def.music,
  };
}

// ─── event selection ──────────────────────────────────────────────────────────────────────────────────────

export function poolFor(run: RunState, relayId: number): EventPool | null {
  const map = run.map;
  const r = map.relays[relayId];
  if (isSealed(map, r)) return "sealed";
  switch (r.type) {
    case "start": return null;
    default: return r.type as EventPool;
  }
}

export function eligibleEvents(run: RunState, pool: EventPool): EventDef[] {
  const out: EventDef[] = [];
  for (const e of content.events.values()) {
    if (e.pool !== pool) continue;
    if (e.stages && e.stages.length && !e.stages.includes(run.stage)) continue;
    if (e.unique && run.usedEvents.includes(e.id)) continue;
    if (!checkCondition(run, e.requires).ok) continue;
    out.push(e);
  }
  return out;
}

const HAZARD_RE = /debris-field|rust-squall|sun-glare|glass-fog|ringing-panes|resonance|ember-draft|dark-stretch|sealing-lattice/;

/** Deterministic event for a relay (seeded by run seed, stage and relay). Falls back to generated events. */
export function pickEventFor(run: RunState, relayId: number, salt = ""): string | null {
  const pool = poolFor(run, relayId);
  if (!pool) return null;
  const r = run.map.relays[relayId];
  const rng = new Rng(hashString(`${run.seed}|${run.stage}|${relayId}|${pool}|${salt}`));
  let list = eligibleEvents(run, pool);
  // Hazard relays prefer events written for their hazard (id or flag mention it).
  if (pool === "hazard" && r.hazard) {
    const own = list.filter((e) => (e as { hazard?: string }).hazard === r.hazard || (!(e as { hazard?: string }).hazard && e.id.includes(r.hazard!)));
    if (own.length) list = own;
    else {
      const generic = list.filter((e) => !(e as { hazard?: string }).hazard && !HAZARD_RE.test(e.id));
      if (generic.length) list = generic;
    }
  }
  if (list.length) {
    const e = rng.weighted(list, (x) => x.weight ?? 1);
    return e.id;
  }
  return generatedEvent(run, pool, rng).id;
}

/** Built-in events for pools the content does not cover (texts come from flavor.ts). */
export function generatedEvent(run: RunState, pool: EventPool, rng: Rng): EventDef {
  const stage = run.stage;
  const enemyFor = (): EnemyId => {
    if (pool === "sealed") return "quarantine-drone";
    if (pool === "exit") return catalog.guardians[stage];
    return rng.pick(catalog.enemiesByStage[stage]);
  };
  let def: EventDef;
  if (pool === "combat" || pool === "sealed" || pool === "exit" || pool === "hazard") {
    const enemy = enemyFor();
    const fl = (ENEMY_FLAVOR as Record<string, { name: string; classLine: string; handshake: string }>)[enemy];
    const hz = pool === "hazard" ? `${RELAY_FLAVOR?.hazard?.desc ?? ""}\n\n` : "";
    def = {
      id: `gen:${pool}:${enemy}`,
      pool,
      title: fl?.name ?? enemyName(enemy),
      text: `${hz}${fl?.classLine ?? ""}\n\n{teal}${fl?.handshake ?? "UNKNOWN SENDER."}{/}`,
      choices: [{ text: "Engage.", outcomes: [{ outcome: { combat: { enemy, noReward: pool === "sealed" } } }] }],
    };
  } else {
    const fl = (RELAY_FLAVOR as Record<string, { name: string; desc: string }>)[pool] ?? RELAY_FLAVOR.empty;
    const outcome: Outcome = pool === "market" ? { store: true } : pool === "bench" ? { repair: 3, heal: true } : {};
    def = {
      id: `gen:${pool}`,
      pool,
      title: fl.name,
      text: fl.desc,
      choices: [{ text: pool === "market" ? "Trade." : "Continue.", outcomes: [{ outcome }] }],
    };
  }
  content.events.set(def.id, def);
  return def;
}

// ─── outcomes ─────────────────────────────────────────────────────────────────────────────────────────────

export function rollOutcome(choice: ChoiceDef, rng: Rng): Outcome {
  if (!choice.outcomes.length) return {};
  return rng.weighted(choice.outcomes, (o) => o.weight ?? 1).outcome;
}

export interface Delta {
  id: ResourceId;
  amount: number;
}

export type NoticeKind =
  | "weapon" | "drone" | "augment" | "crew-join" | "crew-loss" | "crew-hurt" | "system" | "fragment" | "codex"
  | "map" | "seal" | "repair" | "heal" | "overflow" | "store" | "car" | "module";

export interface Notice {
  kind: NoticeKind;
  text: string;
  id?: string;
}

export interface Grant {
  kind: "weapon" | "drone" | "augment" | "crew" | "car" | "module";
  id: string; // item id, crew id, car id or module id
  /** Cars are offered (the player confirms coupling); modules go to the stores. */
  placed: Placement | "offer" | "stored";
}

export interface Applied {
  text?: string;
  deltas: Delta[];
  notices: Notice[];
  grants: Grant[];
  combat?: PendingCombat;
  store?: boolean;
  next?: string;
  defeat?: "hull" | "crew";
  /** Nothing to show (no text, no effects): the flow skips the outcome view. */
  empty: boolean;
}

function addResource(run: RunState, id: ResourceId, amount: number, deltas: Delta[]) {
  if (!amount) return;
  if (id === "hull") {
    const before = run.ship.hull;
    run.ship.hull = Math.max(0, Math.min(run.ship.hullMax, run.ship.hull + amount));
    const d = run.ship.hull - before;
    if (d) deltas.push({ id, amount: d });
    if (d < 0) run.stats.damageTaken += -d;
    return;
  }
  const before = run.inv[id];
  const cap = id === "payloads" ? payloadCap(run.ship) : id === "spares" ? sparesCap(run.ship) : Infinity;
  run.inv[id] = Math.max(0, Math.min(Math.max(cap, before), before + amount));
  const d = run.inv[id] - before;
  if (d) deltas.push({ id, amount: d });
  if (id === "salvage") {
    if (d > 0) run.stats.salvageEarned += d;
    else run.stats.salvageSpent += -d;
  }
}

function mergeDeltas(ds: Delta[]): Delta[] {
  const m = new Map<ResourceId, number>();
  for (const d of ds) m.set(d.id, (m.get(d.id) ?? 0) + d.amount);
  return RESOURCE_IDS.filter((k) => m.get(k)).map((k) => ({ id: k, amount: m.get(k)! }));
}

export function relayLabel(run: RunState): string {
  const r = currentRelay(run);
  return `${stageName(run.stage)} · ${r?.name ?? ""}`;
}

/** Grant an item (auto-placed) and return the grant + notice. */
export function grantItem(run: RunState, id: ItemId, notices: Notice[], grants: Grant[]) {
  run.stats.itemsFound++;
  run.found.push(id);
  if (isAugment(id)) {
    const placed = addAugment(run.ship, id);
    grants.push({ kind: "augment", id, placed });
    notices.push({ kind: placed === "overflow" ? "overflow" : "augment", id, text: `Augment: ${itemName(id)}` });
    return;
  }
  const { placed } = placeItem(run.ship, id);
  const kind = isWeapon(id) ? "weapon" : "drone";
  grants.push({ kind, id, placed });
  const where = placed === "mounted" ? "mounted" : placed === "cargo" ? "stowed in cargo" : "no room aboard";
  notices.push({ kind: placed === "overflow" ? "overflow" : kind, id, text: `${kind === "weapon" ? "Weapon" : "Drone"}: ${itemName(id)} (${where})` });
}

export function grantCrew(run: RunState, species: SpeciesId, name: string | undefined, rng: Rng, notices: Notice[], grants: Grant[]) {
  const member = makeCrew(run, species, name, rng, relayLabel(run));
  if (run.ship.crew.length >= crewCap(run.ship)) {
    // Crew is full: the reward screen may dismiss someone to make room; otherwise they stay behind.
    grants.push({ kind: "crew", id: member.id, placed: "overflow" });
    pendingCrew.set(member.id, member);
    notices.push({ kind: "overflow", id: member.id, text: `${member.name} (${speciesName(species)}) would join, but the crew is full` });
    return;
  }
  run.ship.crew.push(member);
  run.stats.crewJoined++;
  grants.push({ kind: "crew", id: member.id, placed: "mounted" });
  notices.push({ kind: "crew-join", id: member.id, text: `${member.name} (${speciesName(species)}) joins the crew` });
}

/** Crew who could not join because the crew was full (reward screen can still take them). */
export const pendingCrew = new Map<string, import("../game/types.ts").CrewMember>();

export function applyReward(run: RunState, rw: Reward, rng: Rng, deltas: Delta[], notices: Notice[], grants: Grant[]) {
  if (rw.resources) for (const [k, v] of Object.entries(rw.resources) as [ResourceId, number][]) addResource(run, k, v, deltas);
  if (rw.weapon) grantItem(run, rw.weapon, notices, grants);
  if (rw.drone) grantItem(run, rw.drone, notices, grants);
  if (rw.augment) grantItem(run, rw.augment, notices, grants);
  if (rw.car) offerCar(run, rw.car, notices, grants);
  if (rw.module) grantModule(run, rw.module, notices, grants);
  if (rw.crew) grantCrew(run, rw.crew.species, rw.crew.name, rng, notices, grants);
}

/** A car is offered: the overflow/offer screen asks before coupling (it replaces the car in that slot). */
export function offerCar(run: RunState, id: AttachCarId, notices: Notice[], grants: Grant[]) {
  normalizeShip(run.ship);
  grants.push({ kind: "car", id, placed: "offer" });
  const info = carInfo(id);
  const cur = run.ship.consist[carSlot(id)];
  notices.push({ kind: "car", id, text: `Car offered: ${info.name}${cur ? ` (would replace the ${carInfo(cur).name})` : ""}` });
}

export function grantModule(run: RunState, id: ModuleId, notices: Notice[], grants: Grant[]) {
  normalizeShip(run.ship);
  run.ship.moduleStore.push(id);
  grants.push({ kind: "module", id, placed: "stored" });
  notices.push({ kind: "module", id, text: `Module: ${moduleInfo(id).name} (in the stores; refit at an exchange or a bench)` });
}

function crewDeath(run: RunState, id: string, notices: Notice[], verb = "is lost") {
  const i = run.ship.crew.findIndex((c) => c.id === id);
  if (i < 0) return;
  const [c] = run.ship.crew.splice(i, 1);
  run.stats.crewLost.push({ name: c.name, species: c.species });
  notices.push({ kind: "crew-loss", id: c.id, text: `${c.name} ${verb}` });
}

export function unlockFragment(run: RunState, id: string, notices: Notice[]) {
  if (run.fragments.includes(id)) return;
  run.fragments.push(id);
  const f = content.fragments.get(id);
  notices.push({ kind: "fragment", id, text: f ? `Message fragment · ${f.from}` : "Message fragment recovered" });
}

export function unlockCodex(run: RunState, id: string, notices: Notice[]) {
  if (run.codex.includes(id)) return;
  run.codex.push(id);
  const c = content.codex.get(id);
  notices.push({ kind: "codex", id, text: `Runbook entry · ${c?.title ?? titleCase(id)}` });
}

/** Apply every field of an outcome to the run. Flow fields (combat/store/next) are returned for the caller. */
export function applyOutcome(run: RunState, o: Outcome, ctx: EventCtx, rng: Rng): Applied {
  const deltas: Delta[] = [];
  const notices: Notice[] = [];
  const grants: Grant[] = [];
  const stage = run.stage;
  const depth = relayDepth(run.map, currentRelay(run));

  if (o.resources) {
    for (const [k, v] of Object.entries(o.resources) as [ResourceId, Range][]) addResource(run, k, rollRange(v, rng), deltas);
  }
  if (o.reward) applyReward(run, rollReward(o.reward, stage, depth, rng), rng, deltas, notices, grants);
  if (o.weapon) grantItem(run, o.weapon === "random" ? randomWeapon(stage, rng) : o.weapon, notices, grants);
  if (o.drone) grantItem(run, o.drone === "random" ? randomDrone(stage, rng) : o.drone, notices, grants);
  if (o.augment) grantItem(run, o.augment === "random" ? randomAugment(stage, rng, run.ship.augments) : o.augment, notices, grants);
  if (o.car) {
    const pool = o.car === "random-rear" ? REAR_CAR_IDS : o.car === "random-keel" ? KEEL_CAR_IDS : null;
    const id = (pool ? rng.pick(pool) : o.car) as AttachCarId;
    if (isCarId(id)) offerCar(run, id, notices, grants);
  }
  if (o.module) grantModule(run, o.module === "random" ? rng.pick(MODULE_IDS) : o.module, notices, grants);
  if (o.crewJoin) {
    const sp = o.crewJoin.species === "random" ? randomSpecies(rng) : o.crewJoin.species;
    grantCrew(run, sp, o.crewJoin.name, rng, notices, grants);
  }
  if (o.crewLoss && run.ship.crew.length) {
    const cands = o.crewLoss === "random" ? run.ship.crew : run.ship.crew.filter((c) => c.species === o.crewLoss);
    // Prefer the named {crew} of this encounter when it matches.
    const named = cands.find((c) => c.id === ctx.crewId);
    const victim = named ?? (cands.length ? rng.pick(cands) : null);
    if (victim) crewDeath(run, victim.id, notices);
  }
  if (o.crewDamage && run.ship.crew.length) {
    const targets = o.crewDamage.who === "all"
      ? [...run.ship.crew]
      : [run.ship.crew.find((c) => c.id === ctx.crewId) ?? rng.pick(run.ship.crew)];
    for (const c of targets) {
      c.hp -= o.crewDamage.amount;
      if (c.hp <= 0) crewDeath(run, c.id, notices, "does not make it");
      else notices.push({ kind: "crew-hurt", id: c.id, text: `${c.name} is hurt (–${o.crewDamage.amount})` });
    }
  }
  if (o.systemDamage) {
    const installed = (Object.keys(run.ship.systems) as SystemId[]).filter((s) => (run.ship.systems[s]?.level ?? 0) > 0);
    const sys = o.systemDamage.system === "random" ? (installed.length ? rng.pick(installed) : null) : o.systemDamage.system;
    const st = sys ? run.ship.systems[sys] : undefined;
    if (sys && st) {
      const before = st.damage;
      st.damage = Math.min(st.level, st.damage + o.systemDamage.amount);
      if (st.damage > before) notices.push({ kind: "system", id: sys, text: `${systemName(sys)} damaged (${st.damage - before})` });
    }
  }
  if (o.flags) for (const f of o.flags) setFlag(run, f);
  if (o.clearFlags) for (const f of o.clearFlags) clearFlag(run, f);
  if (o.fragment) unlockFragment(run, o.fragment, notices);
  if (o.codex) unlockCodex(run, o.codex, notices);
  if (o.revealMap && !run.map.revealed) {
    run.map.revealed = true;
    notices.push({ kind: "map", text: "The stage chart is revealed" });
  }
  if (o.seal) {
    pushSeal(run.map, o.seal);
    notices.push({ kind: "seal", text: o.seal > 0 ? `The Seal falls back ${o.seal} hop${o.seal > 1 ? "s" : ""}` : `The Seal gains ${-o.seal} hop${o.seal < -1 ? "s" : ""}` });
  }
  if (o.repair) {
    const before = run.ship.hull;
    repairHull(run.ship, o.repair);
    if (run.ship.hull > before) deltas.push({ id: "hull", amount: run.ship.hull - before });
  }
  if (o.heal) {
    const hurt = run.ship.crew.some((c) => c.hp < speciesMaxHp(c.species));
    healAll(run.ship);
    if (hurt) notices.push({ kind: "heal", text: "The crew are patched up" });
  }

  let defeat: Applied["defeat"];
  if (run.ship.hull <= 0) defeat = "hull";
  else if (run.ship.crew.length === 0) defeat = "crew";

  let combat: PendingCombat | undefined;
  if (o.combat) {
    combat = {
      enemy: o.combat.enemy,
      surrenderable: o.combat.surrenderable ?? isHuman(o.combat.enemy),
      noReward: o.combat.noReward,
      intro: o.combat.intro ? substitute(o.combat.intro, run, ctx) : undefined,
      onWin: o.combat.onWin,
      onSurrender: o.combat.onSurrender,
    };
  }
  const text = o.text ? substitute(o.text, run, ctx) : undefined;
  const merged = mergeDeltas(deltas);
  return {
    text,
    deltas: merged,
    notices,
    grants,
    combat,
    store: o.store,
    next: o.next,
    defeat,
    empty: !text && !merged.length && !notices.length,
  };
}

/** Choose a choice of an event: roll the outcome with the run's rng and apply it. */
export function resolveChoice(run: RunState, def: EventDef, index: number, ctx: EventCtx): Applied {
  const choice = def.choices[index];
  if (!choice) return { deltas: [], notices: [], grants: [], empty: true };
  return withRng(run, (rng) => applyOutcome(run, rollOutcome(choice, rng), ctx, rng));
}

/** Mark an event as seen (unique events are used once per run). */
export function markSeen(run: RunState, id: string) {
  const def = eventById(id);
  run.stats.eventsSeen++;
  if (def?.unique && !run.usedEvents.includes(id)) run.usedEvents.push(id);
}

/** Every event id referenced by an event (next/onWin/onSurrender), for validation. */
export function referencedEvents(def: EventDef): string[] {
  const out: string[] = [];
  for (const c of def.choices) for (const w of c.outcomes) {
    const o = w.outcome;
    if (o.next) out.push(o.next);
    if (o.combat?.onWin) out.push(o.combat.onWin);
    if (o.combat?.onSurrender) out.push(o.combat.onSurrender);
  }
  return out;
}
