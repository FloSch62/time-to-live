// Save format: the whole RunState as JSON with a version (see docs/campaign-notes.md). Pure module.
import { SAVE_VERSION, type RunState } from "./model.ts";
import { normalizeShip } from "./refit.ts";
import { isDifficulty, type DifficultyId } from "../data/difficulty.ts";

export interface SaveFile {
  kind: "ttl-voyage";
  version: number;
  savedAt: number;
  /** Short summary for the title's Continue button. */
  summary: { stage: number; relay: string; ship: string; hull: number; ttl: number; difficulty?: DifficultyId };
  run: RunState;
}

export function toSave(run: RunState, now = Date.now()): SaveFile {
  const r = run.map.relays[run.pos];
  return {
    kind: "ttl-voyage",
    version: SAVE_VERSION,
    savedAt: now,
    summary: { stage: run.stage, relay: r?.name ?? "", ship: run.ship.name, hull: run.ship.hull, ttl: run.inv.ttl, difficulty: run.difficulty },
    run: JSON.parse(JSON.stringify(run)) as RunState,
  };
}

/** Validate and return a run from a save (null if it is not a usable save). */
export function fromSave(data: unknown): RunState | null {
  if (!data || typeof data !== "object") return null;
  const s = data as Partial<SaveFile>;
  if (s.kind !== "ttl-voyage" || s.version !== SAVE_VERSION || !s.run) return null;
  const run = s.run;
  if (!isDifficulty(run.difficulty)) run.difficulty = "medium";
  if (!run.map || !Array.isArray(run.map.relays) || !run.ship || !run.inv || !Array.isArray(run.rng)) return null;
  if (run.pos < 0 || run.pos >= run.map.relays.length) return null;
  if (run.ended) return null;
  run.flags ??= [];
  run.fragments ??= [];
  run.codex ??= [];
  run.usedEvents ??= [];
  run.route ??= [];
  run.met ??= [];
  run.found ??= [];
  normalizeShip(run.ship);
  return JSON.parse(JSON.stringify(run)) as RunState;
}

export function serialize(run: RunState): string {
  return JSON.stringify(toSave(run));
}

export function deserialize(s: string): RunState | null {
  try {
    return fromSave(JSON.parse(s));
  } catch {
    return null;
  }
}
