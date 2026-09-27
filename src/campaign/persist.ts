// Browser persistence: the one active voyage and the meta progress (localStorage via core/save).
import { loadSaved, removeSaved, saveJson } from "../core/save";
import type { RunState } from "./model";
import { toSave, fromSave, type SaveFile } from "./savegame";
import { absorbRun, emptyMeta, finishRun, normalizeMeta, startRun, type MetaState } from "./meta";

const RUN_KEY = "voyage";
const META_KEY = "meta";

let metaCache: MetaState | null = null;

export function meta(): MetaState {
  if (!metaCache) metaCache = normalizeMeta(loadSaved<MetaState>(META_KEY));
  return metaCache;
}

export function saveMeta() {
  saveJson(META_KEY, meta());
}

/** Save the voyage (and fold its discoveries into the meta progress). */
export function saveRun(run: RunState) {
  if (run.ended) return;
  saveJson(RUN_KEY, toSave(run));
  absorbRun(meta(), run);
  saveMeta();
}

export function loadRun(): RunState | null {
  return fromSave(loadSaved<SaveFile>(RUN_KEY));
}

export function saveSummary(): SaveFile["summary"] | null {
  const s = loadSaved<SaveFile>(RUN_KEY);
  if (!s || !fromSave(s)) return null;
  return s.summary;
}

export function hasSave(): boolean {
  return saveSummary() !== null;
}

export function deleteSave() {
  removeSaved(RUN_KEY);
}

export function recordStart(tenderName: string) {
  startRun(meta(), tenderName);
  saveMeta();
}

/** A voyage ended (victory or defeat): count it and delete the save. */
export function recordEnd(run: RunState) {
  finishRun(meta(), run);
  saveMeta();
  deleteSave();
}

export function resetMeta() {
  metaCache = emptyMeta();
  saveMeta();
}
