// The voyage driver: one async loop that plays a whole run through a Presenter. The UI implements the presenter
// with scenes (screens/presenter.ts); the headless auto-run test implements it with random choices and
// auto-resolved fights. Pure module.
import { hashString } from "../core/rng.ts";
import type { EnemyId, MusicId } from "../game/ids.ts";
import type { CombatResult, CombatSetup, ScriptBeat } from "../game/types.ts";
import { catalog, isGuardian } from "./catalog.ts";
import { content, eventById } from "./content.ts";
import {
  applyReward, markSeen, newCtx, presentEvent, resolveChoice, unlockCodex, withRng,
  type Applied, type EventView, type Notice,
} from "./events.ts";
import { currentRelay, isSealed, relayDepth, type PendingCombat, type RunState } from "./model.ts";
import { advanceStage, claimRelayStores, hop, waitForSignal } from "./run.ts";

export type HubAction = { kind: "hop"; to: number } | { kind: "wait" };

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
  const ctx = newCtx(run, relay.eventId ?? "");
  let eventId: string | undefined = relay.eventId;
  let pending: PendingCombat | undefined = relay.pendingCombat;
  if (pending) {
    relay.pendingCombat = undefined;
    eventId = undefined;
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
        relay.fledHere = true;
        return "fled";
      }
      if (r.outcome === "victory") eventId = spec.onWin ?? eventId;
      else if (r.outcome === "surrendered") eventId = spec.onSurrender ?? eventId;
      continue;
    }
    const def = eventById(eventId);
    if (!def) break;
    markSeen(run, def.id);
    const view = presentEvent(run, def, ctx);
    const idx = await p.choose(run, view);
    const applied = resolveChoice(run, def, idx, ctx);
    if (!applied.empty) await p.outcome(run, applied, view);
    if (needsDecision(applied)) await p.overflow(run, applied);
    if (applied.defeat) return "defeat";
    if (applied.store) {
      p.closeEvent();
      await p.store(run);
    }
    eventId = applied.next;
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
    enemy: spec.enemy,
    stage: run.stage,
    seed: hashString(`${run.seed}|${run.stage}|${relay.id}|fight-${run.fights}`),
    hazard: relay.hazard,
    surrenderable: spec.surrenderable ?? catalog.humans.includes(spec.enemy),
    boss: boss || undefined,
    intro: spec.intro,
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
  run.ship = result.ship;
  run.inv = result.inventory;
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
    run.stats.machinesStopped++;
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
