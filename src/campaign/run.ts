// Run lifecycle: new voyage, arrival, hop, waiting for a signal at TTL 0, map knowledge, stage transitions.
// Pure module.
import { Rng, hashString } from "../core/rng.ts";
import type { StageIndex } from "../game/ids.ts";
import type { EventDef, Inventory, ShipState } from "../game/types.ts";
import { catalog } from "./catalog.ts";
import { content } from "./content.ts";
import { eligibleEvents, pickEventFor, withRng } from "./events.ts";
import { advanceSeal, generateMap, sealFactor } from "./map.ts";
import {
  SAVE_VERSION, currentRelay, emptyStats, isSealed, type Relay, type RunState,
} from "./model.ts";
import { afterHop, hasAugment, startInventory } from "./shipops.ts";
import { tenderStats } from "./refit.ts";

export const STAGE_TTL_TOPUP = 3;
export const STAGE_TTL_FLOOR = 6;

/** The three-stage voyage has a compressed upgrade economy: each cleared relay carries maintenance stores. */
export const RELAY_STORES: Record<StageIndex, number> = { 1: 24, 2: 36, 3: 48 };

export function claimRelayStores(run: RunState): number {
  const relay = currentRelay(run);
  if (!relay.resolved || relay.serviceSalvage !== undefined || relay.type === "start" || relay.type === "exit"
    || relay.sealedVisit || isSealed(run.map, relay)) return 0;
  const amount = RELAY_STORES[run.stage];
  relay.serviceSalvage = amount;
  run.inv.salvage += amount;
  run.stats.salvageEarned += amount;
  return amount;
}

export function createRun(seed: number, ship: ShipState, inv: Inventory = startInventory()): RunState {
  const map = generateMap(1, seed);
  const run: RunState = {
    version: SAVE_VERSION,
    seed,
    rng: new Rng(hashString(`run-${seed}`)).state(),
    stage: 1,
    map,
    pos: map.start,
    ship,
    inv: { ...inv },
    flags: [],
    fragments: [],
    codex: [],
    usedEvents: [],
    stats: emptyStats(),
    route: [],
    met: [],
    nextCrewId: ship.crew.length + 1,
    fights: 0,
    guardianBeaten: false,
    startedAt: 0,
    stagesCleared: 0,
    found: [],
  };
  arrive(run, true);
  return run;
}

/** Arrive at run.pos: mark visited, pick the relay's event, record the route. */
export function arrive(run: RunState, first = false) {
  const map = run.map;
  const r = currentRelay(run);
  const sealed = isSealed(map, r);
  for (const x of map.relays) x.fledHere = undefined;
  if (!r.visited) {
    r.visited = true;
    run.stats.relaysVisited++;
  }
  run.route.push({ stage: run.stage, relay: r.id, name: r.name, type: r.type, sealed: sealed || undefined });
  if (r.type === "start" && !sealed) {
    r.resolved = true;
    return;
  }
  if (sealed) {
    // Every arrival at a sealed relay meets a fresh patrol, and there is nothing left worth taking.
    r.sealedVisit = true;
    r.resolved = false;
    r.pendingCombat = undefined;
    r.eventId = pickEventFor(run, r.id, `sealed-${run.stats.hops}`) ?? undefined;
    reserveUnique(run, r.eventId);
    return;
  }
  if (!r.resolved && !r.pendingCombat && !r.eventId) {
    r.eventId = pickEventFor(run, r.id) ?? undefined;
    reserveUnique(run, r.eventId);
  }
  void first;
}

function reserveUnique(run: RunState, id: string | undefined) {
  if (!id) return;
  const def = content.events.get(id);
  if (def?.unique && !run.usedEvents.includes(id)) run.usedEvents.push(id);
}

export function canHop(run: RunState, to: number): { ok: boolean; reason?: string } {
  const r = currentRelay(run);
  if (!r.links.includes(to)) return { ok: false, reason: "Out of range" };
  if (run.inv.ttl <= 0) return { ok: false, reason: "TTL 0 · no relay will throw you" };
  if (!r.resolved && !r.pendingCombat) return { ok: false, reason: "Finish what is happening here first" };
  return { ok: true };
}

/** Hop to a linked relay: spend 1 TTL, advance the Seal, crew mend between relays, augments tick. */
export function hop(run: RunState, to: number) {
  const from = currentRelay(run);
  run.inv.ttl = Math.max(0, run.inv.ttl - 1);
  run.stats.hops++;
  advanceSeal(run.map, sealFactor(from));
  run.pos = to;
  betweenRelays(run);
  arrive(run);
}

/** What happens during a hop regardless of destination: system damage is mended, augments work. */
export function betweenRelays(run: RunState) {
  for (const s of Object.values(run.ship.systems)) if (s) s.damage = 0;
  afterHop(run.ship);
}

// ─── waiting for a signal (TTL 0) ─────────────────────────────────────────────────────────────────────────

/** Built-in waiting events; the writing workstream can replace them with events whose id starts with "wait-". */
export const WAIT_EVENTS: EventDef[] = [
  {
    id: "wait-static",
    pool: "scripted",
    title: "Waiting for a signal",
    text: "The lamp blinks. The Listening Post hears the Line breathe: static, the tick of cooling plate, and far off a relay throwing something that is not you.\n\nNothing answers. Behind you, the Seal takes another relay.",
    choices: [{ text: "Keep the lamp lit.", outcomes: [{ outcome: {} }] }],
  },
  {
    id: "wait-skiff",
    pool: "scripted",
    title: "A passing skiff",
    text: "A scavenger skiff drifts into your beam, running dark to save its cells. Its captain leans into the radio. \"You're expired in transit, lamper. We've a stamp press and a use for salvage.\"",
    choices: [
      { text: "Buy a re-stamp. (15 salvage)", req: { resources: { salvage: 15 } }, outcomes: [{ outcome: { resources: { salvage: -15, ttl: 3 }, text: "The press thumps twice through the hull. Three hops on the connection, and a receipt nobody will ever check." } }] },
      { text: "Ask them to vouch for you.", outcomes: [
        { weight: 2, outcome: { resources: { ttl: 1 }, text: "\"One hop. Pay it forward.\" The press thumps once and the skiff is gone before you can thank them." } },
        { weight: 1, outcome: { text: "\"Nobody vouched for us.\" The skiff's lamp goes out, and it is gone." } },
      ] },
    ],
  },
  {
    id: "wait-echo",
    pool: "scripted",
    title: "A lamp in the dark",
    text: "A lamp crosses the dark on its round: an echo tender, nobody aboard. For a moment its beam holds yours, and the relay under you remembers how to throw.",
    choices: [{ text: "Hold the beam.", outcomes: [{ outcome: { resources: { ttl: 2 }, text: "The echo tender's beam carries a stamp the old way, relay to relay. Two hops. Then it is gone on its round." } }] }],
  },
];

/** Wait at the current relay: the Seal advances faster than for a hop; maybe something answers. */
export function waitForSignal(run: RunState): string | null {
  run.stats.waits++;
  advanceSeal(run.map, 1.5);
  const r = currentRelay(run);
  if (isSealed(run.map, r)) {
    // Drifting dark inside the Seal: a patrol finds you half the time; otherwise a signal may still come.
    const patrol = withRng(run, (rng) => rng.chance(0.5));
    if (patrol) {
      arrive(run);
      return r.eventId ?? null;
    }
  }
  const own = [...content.events.values()].filter((e) => e.id.startsWith("wait-"));
  for (const e of WAIT_EVENTS) if (!content.events.has(e.id)) content.events.set(e.id, e);
  const pool = own.length ? own : WAIT_EVENTS;
  const id = withRng(run, (rng) => {
    const valid = pool.filter((e) => (!e.stages || e.stages.includes(run.stage)) && !(e.unique && run.usedEvents.includes(e.id)));
    // Sometimes a machine answers the lamp instead.
    if (rng.chance(0.25)) {
      const hostile = eligibleEvents(run, "combat");
      if (hostile.length) return rng.weighted(hostile, (e) => e.weight ?? 1).id;
    }
    // Keep at least one TTL-giving answer likely so waiting is never a dead end.
    return rng.weighted(valid.length ? valid : WAIT_EVENTS, (e) => (e.id === "wait-static" ? 1.2 : e.weight ?? 1)).id;
  });
  r.eventId = id;
  r.resolved = false;
  r.pendingCombat = undefined;
  r.fledHere = undefined;
  return id;
}

// ─── knowledge of the chart ───────────────────────────────────────────────────────────────────────────────

export type Knowledge = "full" | "type" | "unknown";

/** How much the player knows about a relay (FTL: exit always, adjacent markets/distress/hazards, sensors …). */
export function knowledge(run: RunState, r: Relay): Knowledge {
  const map = run.map;
  if (r.visited || r.id === map.exit || map.revealed) return "full";
  const cur = currentRelay(run);
  const adjacentNow = cur.links.includes(r.id);
  const adjacentVisited = r.links.some((j) => map.relays[j].visited);
  if (adjacentNow && (hasAugment(run.ship, "listening-horn") || tenderStats(run.ship).reveal)) return "full";
  const sensors = run.ship.systems.sensors?.level ?? 0;
  if (r.type === "market" && sensors >= 3) return "type";
  if ((adjacentNow || adjacentVisited) && ["market", "distress", "hazard", "bench"].includes(r.type)) return "type";
  return "unknown";
}

// ─── stages ───────────────────────────────────────────────────────────────────────────────────────────────

/** Move to the next stage: new chart, TTL re-stamp, arrive at its start relay. */
export function advanceStage(run: RunState) {
  const next = (run.stage + 1) as StageIndex;
  run.stage = next;
  run.map = generateMap(next, run.seed);
  run.pos = run.map.start;
  run.guardianBeaten = false;
  run.inv.ttl = Math.max(STAGE_TTL_FLOOR, run.inv.ttl + STAGE_TTL_TOPUP);
  arrive(run);
}

export function guardianOf(stage: StageIndex) {
  return catalog.guardians[stage];
}

export function hopsLeftEstimate(run: RunState): number {
  return run.inv.ttl;
}
