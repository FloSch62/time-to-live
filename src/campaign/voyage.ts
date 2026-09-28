// The voyage driver: one async loop that plays a whole run through a Presenter. The UI implements the presenter
// with scenes (screens/presenter.ts); the headless auto-run test implements it with random choices and
// auto-resolved fights. Pure module.
import { hashString } from "../core/rng.ts";
import type { EnemyId, MusicId } from "../game/ids.ts";
import type { CombatResult, CombatSetup, ScriptBeat } from "../game/types.ts";
import { catalog, isGuardian } from "./catalog.ts";
import { content, eventById } from "./content.ts";
import {
  applyOutcome, applyReward, markSeen, newCtx, presentEvent, promisedEvents, resolveChoice, unlockCodex, withRng,
  type Applied, type EventView, type Notice,
} from "./events.ts";
import { currentRelay, isSealed, relayDepth, type PendingCombat, type RunState } from "./model.ts";
import { advanceStage, claimRelayStores, hop, retreatRoute, retreatRoutes, safeRecovery, waitForSignal } from "./run.ts";
import { tenderStats } from "./refit.ts";

export type HubAction = { kind: "hop"; to: number } | { kind: "wait" } | { kind: "service" };

export type ScriptKind = "prologue" | "intro" | "outro" | "guardian" | "ending" | "gameover";

export interface VictoryInfo {
  result: CombatResult;
  setup: CombatSetup;
  applied: Applied | null;
}

export interface Presenter {
  /** A new relay was reached (hop animation, music). */
  arrived(run: RunState): Promise<void>;
  /** Show an event and resolve with the chosen choice index. */
  choose(run: RunState, view: EventView): Promise<number>;
  /** Show what a choice did. */
  outcome(run: RunState, applied: Applied, view: EventView): Promise<void>;
  /** Decide about items/crew that did not fit aboard. */
  overflow(run: RunState, applied: Applied): Promise<void>;
  /** Close the event window (before a fight, the store or the hub). */
  closeEvent(): void;
  combat(run: RunState, setup: CombatSetup): Promise<CombatResult>;
  victory(run: RunState, info: VictoryInfo): Promise<void>;
  store(run: RunState): Promise<void>;
  script(run: RunState, beats: ScriptBeat[], kind: ScriptKind): Promise<void>;
  hub(run: RunState): Promise<HubAction>;
  save(run: RunState): void;
  gameOver(run: RunState): Promise<void>;
  ending(run: RunState): Promise<void>;
}

export const GUARDIAN_MUSIC: Partial<Record<EnemyId, MusicId>> = {
  "iron-regent": "iron-regent",
  "hollow-choir": "hollow-choir",
  "blackout-core": "event-horizon",
};

export type EncounterEnd = "done" | "fled" | "defeat";

/** Grants that need the player: items/crew with no room aboard, cars offered for coupling. */
export function needsDecision(a: Applied): boolean {
  return a.grants.some((g) => g.placed === "overflow" || g.placed === "offer");
}

/** Play the voyage from the current state until victory or defeat. */
export async function playVoyage(run: RunState, p: Presenter, opts: { prologue?: boolean } = {}): Promise<"victory" | "defeat"> {
  if (opts.prologue) {
    await p.script(run, content.script.PROLOGUE, "prologue");
    await p.script(run, content.script.STAGE_INTRO[1] ?? [], "intro");
    p.save(run);
  }
  await p.arrived(run);
  for (let guard = 0; guard < 100000; guard++) {
    const relay = currentRelay(run);
    if (!relay.resolved && !relay.fledHere) {
      const end = await runEncounter(run, p);
      if (end === "defeat") {
        run.ended = "defeat";
        await p.gameOver(run);
        return "defeat";
      }
      // The exit aftermath sets guardian-<stage>-ended (writing); a boss victory sets guardianBeaten (combat).
      if (run.flags.includes(`guardian-${run.stage}-ended`)) run.guardianBeaten = true;
      p.save(run);
      if (end === "fled") {
        await p.arrived(run);
        continue;
      }
      if (run.guardianBeaten) {
        const won = await stageTransition(run, p);
        if (won) return "victory";
        await p.arrived(run);
        continue;
      }
    }
    const act = await p.hub(run);
    if (act.kind === "hop") {
      hop(run, act.to);
      p.save(run);
      await p.arrived(run);
    } else if (act.kind === "service") {
      safeRecovery(run);
      p.save(run);
      if (currentRelay(run).pendingCombat) await p.arrived(run);
    } else {
      waitForSignal(run);
      p.save(run);
    }
  }
  throw new Error("voyage loop guard");
}

async function stageTransition(run: RunState, p: Presenter): Promise<boolean> {
  p.closeEvent();
  await p.script(run, content.script.STAGE_OUTRO[run.stage] ?? [], "outro");
  run.stagesCleared++;
  if (run.stage === 3) {
    run.ended = "victory";
    await p.ending(run);
    return true;
  }
  advanceStage(run);
  await p.script(run, content.script.STAGE_INTRO[run.stage] ?? [], "intro");
  p.save(run);
  return false;
}

/** Play the current relay's encounter: its event chain, fights, store visits. */
export async function runEncounter(run: RunState, p: Presenter): Promise<EncounterEnd> {
  const relay = currentRelay(run);
  let ctx = newCtx(run, relay.eventId ?? "");
  let eventId: string | undefined = relay.eventId;
  // A promised handover must not vanish because the random route lacked an event node.
  const followups = relay.type === "exit" && !relay.pendingCombat ? promisedEvents(run).map(e => e.id) : [];
  const queued = [...followups, ...(eventId ? [eventId] : [])];
  eventId = queued.shift();
  let pending: PendingCombat | undefined = relay.pendingCombat;
  if (pending) {
    relay.pendingCombat = undefined;
    eventId = undefined;
    queued.length = 0;
  }
  for (let guard = 0; guard < 64; guard++) {
    if (pending) {
      const spec = pending;
      pending = undefined;
      p.closeEvent();
      const r = await fight(run, p, spec);
      if (r.outcome === "defeat") return "defeat";
      if (r.outcome === "fled") {
        relay.pendingCombat = spec;
        relay.resolved = false;
        relay.fledHere = undefined;
        const escape = retreatRoutes(run).find(route => route.to === (r.retreatTo ?? retreatRoute(run)?.to));
        if (!escape || !hop(run, escape.to)) throw new Error("Combat returned a retreat without an available departure");
        return "fled";
      }
      if (r.outcome === "victory") eventId = spec.onWin ?? eventId;
      else if (r.outcome === "surrendered") eventId = spec.onSurrender ?? eventId;
      continue;
    }
    const def = eventById(eventId);
    if (!def) {
      if (queued.length) { eventId = queued.shift(); continue; }
      break;
    }
    ctx = newCtx(run, def.id);
    markSeen(run, def.id);
    const view = presentEvent(run, def, ctx);
    if (def.maintenance !== undefined) relay.maintenance = def.maintenance;
    if (def.directCombat) {
      const applied = withRng(run, rng => applyOutcome(run, { combat: def.directCombat }, ctx, rng));
      pending = applied.combat;
      eventId = undefined;
      continue;
    }
    const appliedArrivals = relay.arrivalAppliedIds ?? (relay.arrivalApplied && relay.eventId ? [relay.eventId] : []);
    if (def.arrival && !appliedArrivals.includes(def.id)) {
      relay.arrivalApplied = true;
      relay.arrivalAppliedIds = [...appliedArrivals, def.id];
      const applied = withRng(run, rng => applyOutcome(run, def.arrival!, ctx, rng));
      if (!applied.empty) await p.outcome(run, applied, view);
      if (needsDecision(applied)) await p.overflow(run, applied);
      if (applied.defeat) return "defeat";
      if (applied.combat) { pending = applied.combat; eventId = applied.next; continue; }
      if (!def.choices.length) { eventId = applied.next ?? queued.shift(); continue; }
    }
    if (def.arrival && !def.choices.length) { eventId = def.arrival.next ?? queued.shift(); continue; }
    const quiet = def.glimpse || (def.pool === "empty" && def.choices.length === 1 && def.choices[0].outcomes.length === 1 && !Object.keys(def.choices[0].outcomes[0].outcome).length);
    if (quiet) {
      relay.glimpse = { title: view.title, text: view.text };
      eventId = queued.shift();
      continue;
    }
    const idx = await p.choose(run, view);
    const applied = resolveChoice(run, def, idx, ctx);
    if (!applied.empty) await p.outcome(run, applied, view);
    if (needsDecision(applied)) await p.overflow(run, applied);
    if (applied.defeat) return "defeat";
    if (applied.store) {
      p.closeEvent();
      await p.store(run);
    }
    eventId = applied.next ?? queued.shift();
    if (applied.combat) pending = applied.combat;
  }
  p.closeEvent();
  relay.resolved = true;
  claimRelayStores(run);
  return "done";
}

export function buildSetup(run: RunState, spec: PendingCombat): CombatSetup {
  const relay = currentRelay(run);
  const sealed = isSealed(run.map, relay);
  const boss = spec.boss ?? isGuardian(spec.enemy);
  return {
    difficulty: run.difficulty,
    enemy: spec.enemy,
    stage: run.stage,
    seed: hashString(`${run.seed}|${run.stage}|${relay.id}|fight-${run.fights}`),
    hazard: relay.hazard,
    surrenderable: spec.surrenderable ?? catalog.humans.includes(spec.enemy),
    boss: boss || undefined,
    intro: spec.intro,
    scenario: spec.scenario,
    retreat: retreatRoute(run),
    retreatOptions: retreatRoutes(run),
    music: GUARDIAN_MUSIC[spec.enemy],
    noReward: spec.noReward || sealed || undefined,
    depth: boss ? 1 : relayDepth(run.map, relay),
  };
}

/** Enemy met: unlock its Runbook entries (`enemy:<id>`). */
export function meetEnemy(run: RunState, enemy: EnemyId): Notice[] {
  const notices: Notice[] = [];
  if (!run.met.includes(enemy)) run.met.push(enemy);
  for (const c of content.codex.values()) {
    if (c.unlock === `enemy:${enemy}`) unlockCodex(run, c.id, notices);
  }
  return notices;
}

async function fight(run: RunState, p: Presenter, spec: PendingCombat): Promise<CombatResult> {
  const setup = buildSetup(run, spec);
  run.fights++;
  meetEnemy(run, spec.enemy);
  const result = await p.combat(run, setup);
  currentRelay(run).resolution = result.resolution;
  for (const member of result.ship.crew) {
    const before = run.ship.crew.find(c => c.id === member.id);
    const where = currentRelay(run).name;
    if (result.crewLost.length) member.memory = `Lost ${result.crewLost.map(c => c.name).join(" and ")} at ${where}.`;
    else if (before && member.hp < before.hp - 15) member.memory = `Survived the fight at ${where} with serious injuries.`;
    else if (before && (member.repairs ?? 0) > (before.repairs ?? 0)) member.memory = `Kept damaged systems running under fire at ${where}.`;
    else if (result.resolution === "released") member.memory = `Helped end a machine's unfinished duty at ${where}.`;
  }
  run.ship = result.ship;
  run.inv = result.inventory;
  if (["victory", "surrendered", "escaped"].includes(result.outcome)) {
    result.systemsPatched = 0;
    for (const system of Object.values(run.ship.systems)) if (system) {
      result.systemsPatched += system.damage;
      system.damage = 0;
    }
    currentRelay(run).systemsPatched = result.systemsPatched;
    result.hullRecovered = setup.boss ? 0 : Math.min(run.ship.hullMax - run.ship.hull, tenderStats(run.ship).salvageRepair);
    run.ship.hull += result.hullRecovered;
    currentRelay(run).hullRecovered = result.hullRecovered;
  }
  run.stats.damageDealt += result.stats?.damageDealt ?? 0;
  run.stats.damageTaken += result.stats?.damageTaken ?? 0;
  for (const c of result.crewLost ?? []) run.stats.crewLost.push(c);
  if (result.outcome === "defeat") return result;
  // The opponent left: the relay is clear, with no salvage or player retreat counted.
  if (result.outcome === "escaped") return result;
  if (result.outcome === "fled") {
    run.stats.fightsFled++;
    return result;
  }
  if (result.outcome === "victory") {
    if (catalog.humans.includes(spec.enemy)) run.stats.humanFightsWon = (run.stats.humanFightsWon ?? 0) + 1;
    else run.stats.machinesStopped++;
    if (setup.boss) run.guardianBeaten = true;
  } else if (result.outcome === "surrendered") {
    run.stats.shipsSpared++;
  }
  const custom = result.outcome === "victory" ? spec.onWin : spec.onSurrender;
  let applied: Applied | null = null;
  if (!custom && !setup.noReward && result.reward) {
    applied = withRng(run, (rng) => {
      const a: Applied = { deltas: [], notices: [], grants: [], empty: false };
      applyReward(run, result.reward!, rng, a.deltas, a.notices, a.grants);
      return a;
    });
  }
  if (!custom) await p.victory(run, { result, setup, applied });
  if (applied && needsDecision(applied)) await p.overflow(run, applied);
  return result;
}
