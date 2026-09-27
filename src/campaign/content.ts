// Content registry: the writing workstream's events, fragments, codex, script, names and tips, collected by duck
// typing so the runtime does not depend on export names. Filled in the browser by content-loader.ts (Vite glob)
// and in tests by loading src/content with node. Pure module.
import type { CodexEntry, EventDef, FragmentDef, ScriptBeat } from "../game/types.ts";
import type { SpeciesId, StageIndex } from "../game/ids.ts";

export interface ScriptSet {
  PROLOGUE: ScriptBeat[];
  STAGE_INTRO: Partial<Record<StageIndex, ScriptBeat[]>>;
  STAGE_OUTRO: Partial<Record<StageIndex, ScriptBeat[]>>;
  /** Guardian lines by enemy id: arbitrary keyed beat lists (intro, phases, defeat …). */
  GUARDIAN: Record<string, Record<string, ScriptBeat[]> | ScriptBeat[]>;
  ENDING: ScriptBeat[];
  /** Optional ending beats shown when their run flag is set, inserted before ENDING[endingInsertAt]. */
  ENDING_CALLBACKS: { flag: string; beat: ScriptBeat }[];
  endingInsertAt: number;
  GAME_OVER: ScriptBeat[];
  GAME_OVER_VARIANTS: Partial<Record<"hull" | "crew" | "default", ScriptBeat[]>>;
  GAME_OVER_TITLES: string[];
  GUARDIAN_BARKS: Record<string, string[]>;
  CREDITS: CreditsBlock[];
}

export interface CreditsBlock {
  heading?: string;
  lines: string[];
}

export interface NameSet {
  tender: string[];
  crew: Partial<Record<SpeciesId, string[]>>;
  any: string[];
  relay: string[];
}

function emptyScript(): ScriptSet {
  return {
    PROLOGUE: [], STAGE_INTRO: {}, STAGE_OUTRO: {}, GUARDIAN: {}, ENDING: [], ENDING_CALLBACKS: [], endingInsertAt: -1,
    GAME_OVER: [], GAME_OVER_VARIANTS: {}, GAME_OVER_TITLES: [], GUARDIAN_BARKS: {}, CREDITS: [],
  };
}

export const content = {
  events: new Map<string, EventDef>(),
  fragments: new Map<string, FragmentDef>(),
  codex: new Map<string, CodexEntry>(),
  script: emptyScript(),
  names: { tender: [], crew: {}, any: [], relay: [] } as NameSet,
  tips: [] as string[],
  /** Where each event came from (module path), for validation messages. */
  origin: new Map<string, string>(),
  loaded: false,
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function isEventDef(v: unknown): v is EventDef {
  return isObj(v) && typeof v.id === "string" && typeof v.pool === "string" && Array.isArray(v.choices);
}
function isFragment(v: unknown): v is FragmentDef {
  return isObj(v) && typeof v.id === "string" && typeof v.from === "string" && typeof v.to === "string" && typeof v.kind === "string";
}
function isCodex(v: unknown): v is CodexEntry {
  return isObj(v) && typeof v.id === "string" && typeof v.category === "string" && typeof v.title === "string";
}
function isBeat(v: unknown): v is ScriptBeat {
  return isObj(v) && typeof v.text === "string";
}
function isBeats(v: unknown): v is ScriptBeat[] {
  return Array.isArray(v) && v.length > 0 && v.every(isBeat);
}

function collect<T>(v: unknown, test: (x: unknown) => x is T, out: T[], depth = 0) {
  if (depth > 3) return;
  if (test(v)) {
    out.push(v);
    return;
  }
  if (Array.isArray(v)) for (const x of v) collect(x, test, out, depth + 1);
  else if (isObj(v)) for (const x of Object.values(v)) collect(x, test, out, depth + 1);
}

/** Register the exports of one content module (path is used to route: events/, fragments, codex, script …). */
export function registerModule(path: string, mod: Record<string, unknown>) {
  const p = path.replace(/\\/g, "/");
  if (/\/events\//.test(p) || /events\.ts$/.test(p)) {
    const list: EventDef[] = [];
    for (const v of Object.values(mod)) collect(v, isEventDef, list);
    for (const e of list) {
      content.events.set(e.id, e);
      content.origin.set(e.id, p);
    }
  }
  if (/fragments\.ts$/.test(p)) {
    const list: FragmentDef[] = [];
    for (const v of Object.values(mod)) collect(v, isFragment, list);
    for (const f of list) content.fragments.set(f.id, f);
  }
  if (/codex\.ts$/.test(p)) {
    const list: CodexEntry[] = [];
    for (const v of Object.values(mod)) collect(v, isCodex, list);
    for (const c of list) content.codex.set(c.id, c);
  }
  if (/script\.ts$/.test(p)) registerScript(mod);
  if (/names\.ts$/.test(p)) registerNames(mod);
  if (/tips\.ts$/.test(p)) {
    for (const v of Object.values(mod)) {
      if (Array.isArray(v) && v.every((x) => typeof x === "string")) content.tips.push(...(v as string[]));
      else if (Array.isArray(v)) for (const x of v) if (isObj(x) && typeof x.text === "string") content.tips.push(x.text);
    }
  }
  content.loaded = true;
}

function stageRecord(v: unknown): Partial<Record<StageIndex, ScriptBeat[]>> {
  const out: Partial<Record<StageIndex, ScriptBeat[]>> = {};
  if (Array.isArray(v)) {
    // [stage1, stage2, stage3] or [null, s1, s2, s3]
    const arr = v.filter((x) => isBeats(x)) as ScriptBeat[][];
    if (v.length === 4 && !isBeats(v[0])) arr.splice(0, arr.length, ...(v.slice(1) as ScriptBeat[][]));
    arr.forEach((b, i) => (out[(i + 1) as StageIndex] = b));
  } else if (isObj(v)) {
    for (const [k, b] of Object.entries(v)) {
      const n = Number(k.replace(/\D/g, "")) as StageIndex;
      if (n >= 1 && n <= 3 && isBeats(b)) out[n] = b;
    }
  }
  return out;
}

function toCredits(v: unknown): CreditsBlock[] {
  const out: CreditsBlock[] = [];
  if (!Array.isArray(v)) return out;
  for (const x of v) {
    if (typeof x === "string") out.push({ lines: [x] });
    else if (isObj(x)) {
      const heading = (x.heading ?? x.title ?? x.role ?? x.section) as string | undefined;
      let lines: string[] = [];
      const l = x.lines ?? x.names ?? x.entries ?? x.people ?? x.text;
      if (Array.isArray(l)) lines = l.map((s) => (typeof s === "string" ? s : isObj(s) ? String(s.name ?? s.text ?? "") : String(s)));
      else if (typeof l === "string") lines = l.split("\n");
      out.push({ heading, lines });
    }
  }
  return out;
}

export function registerScript(mod: Record<string, unknown>) {
  const s = content.script;
  for (const [key, v] of Object.entries(mod)) {
    const k = key.toUpperCase();
    if (k === "PROLOGUE" && isBeats(v)) s.PROLOGUE = v;
    else if (k === "ENDING" && isBeats(v)) s.ENDING = v;
    else if ((k === "GAME_OVER" || k === "GAMEOVER") && isBeats(v)) s.GAME_OVER = v;
    else if (k === "STAGE_INTRO" || k === "STAGE_INTROS") s.STAGE_INTRO = stageRecord(v);
    else if (k === "STAGE_OUTRO" || k === "STAGE_OUTROS") s.STAGE_OUTRO = stageRecord(v);
    else if (k === "GUARDIAN" || k === "GUARDIANS") s.GUARDIAN = (isObj(v) ? v : {}) as ScriptSet["GUARDIAN"];
    else if (k === "GUARDIAN_BARKS" && isObj(v)) s.GUARDIAN_BARKS = v as Record<string, string[]>;
    else if (k === "ENDING_CALLBACKS" && Array.isArray(v)) s.ENDING_CALLBACKS = v.filter((x) => isObj(x) && typeof x.flag === "string" && isBeat(x.beat)) as ScriptSet["ENDING_CALLBACKS"];
    else if (k === "ENDING_CALLBACK_INSERT_AT" && typeof v === "number") s.endingInsertAt = v;
    else if (k === "GAME_OVER_VARIANTS" && isObj(v)) {
      for (const [vk, b] of Object.entries(v)) if (isBeats(b)) s.GAME_OVER_VARIANTS[vk as "hull"] = b;
    } else if (k === "GAME_OVER_TITLES" && Array.isArray(v)) s.GAME_OVER_TITLES = v.filter((x) => typeof x === "string") as string[];
    else if (k === "CREDITS") s.CREDITS = toCredits(v);
    else if (k === "SCRIPT" && isObj(v)) registerScript(v);
  }
}

export function registerNames(mod: Record<string, unknown>) {
  const n = content.names;
  const strs = (v: unknown) => (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string") ? (v as string[]) : null);
  for (const [key, v] of Object.entries(mod)) {
    const k = key.toLowerCase();
    const arr = strs(v);
    // Raw pools (given names, family names, birds) are building blocks, not names.
    if (/given|family|bird|default/.test(k)) continue;
    if (arr) {
      if (k.includes("tender") || k.includes("ship")) n.tender.push(...arr);
      else if (k.includes("relay")) n.relay.push(...arr);
      else if (k.includes("rigger")) (n.crew.rigger ??= []).push(...arr);
      else if (k.includes("warden")) (n.crew.warden ??= []).push(...arr);
      else if (k.includes("courier")) (n.crew.courier ??= []).push(...arr);
      else if (k.includes("bellmaker")) (n.crew.bellmaker ??= []).push(...arr);
      else if (k.includes("linefolk")) (n.crew.linefolk ??= []).push(...arr);
      else if (k.includes("crew") || k.includes("name")) n.any.push(...arr);
    } else if (isObj(v)) {
      // e.g. CREW_NAMES = { linefolk: [...], rigger: [...] }
      for (const [sk, sv] of Object.entries(v)) {
        const a = strs(sv);
        if (!a) continue;
        const spk = sk.toLowerCase();
        if (["linefolk", "warden", "rigger", "courier", "bellmaker"].includes(spk)) (n.crew[spk as SpeciesId] ??= []).push(...a);
        else if (k.includes("tender") || spk.includes("tender")) n.tender.push(...a);
        else n.any.push(...a);
      }
    }
  }
}

export function eventById(id: string | undefined): EventDef | undefined {
  return id ? content.events.get(id) : undefined;
}

/** Clear everything (tests). */
export function resetContent() {
  content.events.clear();
  content.fragments.clear();
  content.codex.clear();
  content.origin.clear();
  content.script = emptyScript();
  content.names = { tender: [], crew: {}, any: [], relay: [] };
  content.tips = [];
  content.loaded = false;
}
