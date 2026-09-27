// Meta progress across voyages: Runbook entries and message fragments ever found, enemies met, voyages started /
// completed, best stage. Pure data functions; persistence is in persist.ts.
import type { RunState } from "./model.ts";

export interface MetaState {
  version: 1;
  codex: string[];
  fragments: string[];
  enemiesMet: string[];
  voyages: number;
  completed: number;
  defeats: number;
  bestStage: number;
  /** At least one voyage reached the ending ("voyage completed"). */
  voyageCompleted: boolean;
  totalHops: number;
  machinesStopped: number;
  /** Tender names used, most recent first. */
  tenders: string[];
}

export function emptyMeta(): MetaState {
  return {
    version: 1, codex: [], fragments: [], enemiesMet: [], voyages: 0, completed: 0, defeats: 0, bestStage: 0,
    voyageCompleted: false, totalHops: 0, machinesStopped: 0, tenders: [],
  };
}

export function normalizeMeta(m: Partial<MetaState> | null | undefined): MetaState {
  const e = emptyMeta();
  if (!m || typeof m !== "object") return e;
  return {
    ...e,
    ...m,
    codex: Array.isArray(m.codex) ? m.codex : [],
    fragments: Array.isArray(m.fragments) ? m.fragments : [],
    enemiesMet: Array.isArray(m.enemiesMet) ? m.enemiesMet : [],
    tenders: Array.isArray(m.tenders) ? m.tenders : [],
    version: 1,
  };
}

function union(a: string[], b: string[]) {
  const s = new Set(a);
  for (const x of b) s.add(x);
  return [...s];
}

/** Knowledge found during a run persists immediately (even if the run is lost later). */
export function absorbRun(meta: MetaState, run: RunState): MetaState {
  meta.codex = union(meta.codex, run.codex);
  meta.fragments = union(meta.fragments, run.fragments);
  meta.enemiesMet = union(meta.enemiesMet, run.met);
  meta.bestStage = Math.max(meta.bestStage, run.stage);
  return meta;
}

/** A run ended: count it once. */
export function finishRun(meta: MetaState, run: RunState): MetaState {
  absorbRun(meta, run);
  meta.totalHops += run.stats.hops;
  meta.machinesStopped += run.stats.machinesStopped;
  if (run.ended === "victory") {
    meta.completed++;
    meta.voyageCompleted = true;
    meta.bestStage = 4;
  } else meta.defeats++;
  return meta;
}

export function startRun(meta: MetaState, tenderName: string): MetaState {
  meta.voyages++;
  meta.tenders = [tenderName, ...meta.tenders.filter((t) => t !== tenderName)].slice(0, 8);
  return meta;
}
