// Content validation (writing deliverable 10).
// Run: node --experimental-strip-types --test src/content/*.test.ts
// Partial runs while a deck is being written:
//   TTL_CONTENT_STAGES=1        quantity checks only for these stages
//   TTL_CONTENT_POOLS=event,distress   quantity checks only for these pools
//   TTL_CONTENT_DECKS=stage1-signals   per-event checks only for these decks
// Any of these switches partial mode: "every fragment/codex entry is unlocked somewhere" and "every flag that is read
// is also set somewhere" are skipped, since other decks may not exist yet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AUGMENT_IDS, BOARDER_IDS, DRONE_IDS, ENEMY_IDS, HAZARD_IDS, KEEL_CAR_IDS, LAMP_COLORS, LEAD_CAR_IDS, MODULE_IDS,
  MUSIC_IDS, REAR_CAR_IDS, RESOURCE_IDS, SPECIES_IDS, SYSTEM_IDS, WEAPON_IDS,
} from "../game/ids.ts";
import type { EnemyId, HazardId, StageIndex } from "../game/ids.ts";
import type { ChoiceDef, CodexEntry, Condition, EventDef, EventPool, Outcome, ScriptBeat } from "../game/types.ts";
import { ALL_EVENTS, ALL_FLAGS, WAIT_EVENT_PREFIX } from "./events/index.ts";
import { STAGE1_SIGNALS } from "./events/stage1-signals.ts";
import { STAGE1_RELAYS } from "./events/stage1-relays.ts";
import { STAGE2_SIGNALS } from "./events/stage2-signals.ts";
import { STAGE2_RELAYS } from "./events/stage2-relays.ts";
import { STAGE3_SIGNALS } from "./events/stage3-signals.ts";
import { STAGE3_RELAYS } from "./events/stage3-relays.ts";
import { SHARED_EVENTS } from "./events/shared.ts";
import { CHAIN_EVENTS } from "./events/chains.ts";
import { FRAGMENTS } from "./fragments.ts";
import { CODEX } from "./codex.ts";
import {
  CREDIT_TOOLS, CREDITS, ENDING, ENDING_CALLBACKS, ENDING_CALLBACK_INSERT_AT, GAME_OVER, GAME_OVER_TITLES,
  GAME_OVER_VARIANTS, GUARDIAN, GUARDIAN_BARKS, PROLOGUE, STAGE_INTRO, STAGE_OUTRO,
} from "./script.ts";
import {
  AUGMENT_FLAVOR, BOARDER_FLAVOR, CAR_FLAVOR, DRONE_FLAVOR, ENEMY_FLAVOR, HAZARD_FLAVOR, LIVERY_FLAVOR, MODULE_FLAVOR,
  RELAY_FLAVOR, RESOURCE_FLAVOR, SPECIES_FLAVOR, STAGE_FLAVOR, SYSTEM_FLAVOR, WEAPON_FLAVOR,
} from "./flavor.ts";
import {
  BELLMAKER_NAMES, COURIER_NAMES, DEFAULT_TENDER_NAME, DESIGNATION_BIRDS, FAMILY_NAMES, GIVEN_NAMES, LINEFOLK_NAMES,
  RELAY_NAMES, RIGGER_DESIGNATIONS, TENDER_NAMES, WARDEN_NAMES,
} from "./names.ts";
import { TIPS } from "./tips.ts";
import { CORE_FLAGS } from "./flags.ts";

// ─── Configuration ─────────────────────────────────────────────────────────────────────────────────────────

const env = (name: string) => (process.env[name] ?? "").split(",").map(s => s.trim()).filter(Boolean);
const STAGES_UNDER_TEST = (env("TTL_CONTENT_STAGES").map(Number) as StageIndex[]);
const POOLS_UNDER_TEST = env("TTL_CONTENT_POOLS") as EventPool[];
const DECKS_UNDER_TEST = env("TTL_CONTENT_DECKS");
const PARTIAL = STAGES_UNDER_TEST.length > 0 || POOLS_UNDER_TEST.length > 0 || DECKS_UNDER_TEST.length > 0;
const STAGES: StageIndex[] = STAGES_UNDER_TEST.length ? STAGES_UNDER_TEST : [1, 2, 3];

const DECKS: Record<string, EventDef[]> = {
  "stage1-signals": STAGE1_SIGNALS, "stage1-relays": STAGE1_RELAYS,
  "stage2-signals": STAGE2_SIGNALS, "stage2-relays": STAGE2_RELAYS,
  "stage3-signals": STAGE3_SIGNALS, "stage3-relays": STAGE3_RELAYS,
  shared: SHARED_EVENTS, chains: CHAIN_EVENTS,
};
const CHECKED_EVENTS: EventDef[] = DECKS_UNDER_TEST.length
  ? DECKS_UNDER_TEST.flatMap(name => DECKS[name] ?? [])
  : ALL_EVENTS;

const POOLS: EventPool[] = ["event", "distress", "combat", "hazard", "bench", "market", "sealed", "empty", "exit", "scripted"];
const MIN_PER_STAGE: Partial<Record<EventPool, number>> = {
  event: 22, distress: 8, combat: 10, hazard: 4, bench: 4, market: 3, empty: 5, sealed: 3, exit: 1,
};

const STAGE_ENEMIES: Record<StageIndex, EnemyId[]> = {
  1: ["packet-leech", "cable-wraith", "rust-prophet", "scrap-foreman", "scavenger-skiff", "static-nest", "ferric-colossus"],
  2: ["prism-widow", "glass-echo", "wire-weaver", "glass-choir", "coil-serpent", "echo-tender"],
  3: ["gate-sentinel", "null-marshal", "ash-moth", "grave-reaver", "demolition-engine"],
};
const GUARDIANS: Record<StageIndex, EnemyId> = { 1: "iron-regent", 2: "hollow-choir", 3: "blackout-core" };
const STAGE_HAZARDS: Record<StageIndex, HazardId[]> = {
  1: ["debris-field", "rust-squall", "sun-glare"],
  2: ["glass-fog", "ringing-panes", "resonance"],
  3: ["ember-draft", "dark-stretch", "sealing-lattice"],
};
const HUMAN_ENEMIES: EnemyId[] = ["scavenger-skiff"];

/** Typical reward ranges (contract of the writing brief). */
const SALVAGE_MAX: Record<StageIndex, number> = { 1: 40, 2: 60, 3: 80 };
const RES_BOUNDS: Record<string, [number, number]> = {
  salvage: [-150, 80], ttl: [-3, 3], payloads: [-4, 4], spares: [-3, 3], hull: [-6, -1],
};

const EXPECTED_ENEMY_NAMES: Record<string, string> = {
  "packet-leech": "Packet Leech", "cable-wraith": "Cable Wraith", "rust-prophet": "Rust Prophet",
  "scrap-foreman": "Scrap Foreman", "scavenger-skiff": "Scavenger Skiff", "static-nest": "Static Nest",
  "ferric-colossus": "Ferric Colossus", "iron-regent": "The Iron Regent", "prism-widow": "Prism Widow",
  "glass-echo": "Glass Echo", "wire-weaver": "Wire Weaver", "glass-choir": "Glass Choir", "coil-serpent": "Coil Serpent",
  "echo-tender": "Echo Tender", "hollow-choir": "The Hollow Choir", "gate-sentinel": "Gate Sentinel",
  "null-marshal": "Null Marshal", "ash-moth": "Ash Moth", "grave-reaver": "Grave Reaver",
  "demolition-engine": "Demolition Engine", "blackout-core": "The Blackout Core", "quarantine-drone": "Quarantine Drone",
  "gate-warden": "Gate Warden", "sealing-drone": "Sealing Drone",
};

// ─── Art keys ──────────────────────────────────────────────────────────────────────────────────────────────

const STANDARD_ART = new Set<string>([
  "bg/title", "bg/relay-seven", "bg/line-quiet",
  ...[1, 2, 3].flatMap(s => ["a", "b", "c"].map(v => `bg/s${s}-${v}`)),
  ...[1, 2, 3, 4, 5, 6].map(n => `ending/e${n}`),
  "ships/lamplighter", ...ENEMY_IDS.map(id => `ships/${id}`), "ships/gate-warden", "ships/sealing-drone",
  ...["operator", "pell", "scavenger", "bench-keeper", "bellmaker", "teal-jacket", "warden-memory"].map(p => `portraits/${p}`),
]);
const ART_REQUESTS_PATH = new URL("../../docs/art-requests.md", import.meta.url);
const ART_REQUEST_TEXT = readFileSync(ART_REQUESTS_PATH, "utf8");
const REQUESTED_ART = new Set<string>(
  [...ART_REQUEST_TEXT.matchAll(/`((?:events|portraits|props|bg)\/[a-z0-9-]+)`/g)].map(m => m[1]),
);
const artOk = (key: string) => STANDARD_ART.has(key) || REQUESTED_ART.has(key);
const usedArt = new Set<string>();

// ─── Helpers ───────────────────────────────────────────────────────────────────────────────────────────────

const BY_ID = new Map<string, EventDef>();
const duplicateIds: string[] = [];
for (const e of ALL_EVENTS) {
  if (BY_ID.has(e.id)) duplicateIds.push(e.id);
  BY_ID.set(e.id, e);
}
const FRAGMENT_IDS = new Set(FRAGMENTS.map(f => f.id));
const CODEX_BY_ID = new Map<string, CodexEntry>(CODEX.map(c => [c.id, c]));

function* outcomesOf(e: EventDef): Generator<[ChoiceDef, Outcome]> {
  for (const c of e.choices) for (const w of c.outcomes) yield [c, w.outcome];
}

/** Every event reachable from `id` through next / onWin / onSurrender (including itself). */
function reachable(id: string): EventDef[] {
  const seen = new Set<string>();
  const out: EventDef[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const e = BY_ID.get(cur);
    if (!e) continue;
    out.push(e);
    for (const [, o] of outcomesOf(e)) {
      if (o.next) stack.push(o.next);
      if (o.combat?.onWin) stack.push(o.combat.onWin);
      if (o.combat?.onSurrender) stack.push(o.combat.onSurrender);
    }
  }
  return out;
}

const rangeOf = (r: number | [number, number]): [number, number] => (Array.isArray(r) ? r : [r, r]);
const PLACEHOLDER = /\{([^}]*)\}/g;

/** Keys that hold ids or asset paths, not narrative text. */
const NON_TEXT_KEYS = new Set([
  "id", "art", "portrait", "music", "sfx", "unlock", "next", "onWin", "onSurrender", "fragment", "codex", "flags",
  "clearFlags", "flag", "notFlag", "enemy", "weapon", "drone", "augment", "species", "pool", "category", "kind",
  "mobility", "crewLoss", "system", "guardian", "car", "module", "slot",
]);

function stringsIn(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => stringsIn(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) if (!NON_TEXT_KEYS.has(k)) stringsIn(v, `${path}.${k}`, out);
  }
}

/**
 * Direction v2 (contract): nothing flies between relays but drones. The tender is a cable car on the carriers,
 * relays switch it, it stalls at TTL 0. Words from the old spaceship fiction are errors.
 */
const OFF_FICTION = /\b(space ?ships?|starships?|space stations?|orbit(s|al|ing)?|asteroids?|planets?|hyperspace|warp|jump drive|hop drive|throw coils?|cable-thrust|docking|airlock tubes?|boarding tubes?|open space|deep space|outer space|vacuum|missiles?|torpedo(es)?|drift(s|ed|ing)?|ships?)\b/i;

function checkNarrativeStrings(label: string, value: unknown, errors: string[]): void {
  const all: [string, string][] = [];
  stringsIn(value, label, all);
  for (const [path, s] of all) {
    if (s.includes("!")) errors.push(`${path}: exclamation mark in "${s.slice(0, 80)}"`);
    if (/\bTODO\b|\bTBD\b|\bFIXME\b|lorem ipsum/i.test(s)) errors.push(`${path}: placeholder text in "${s.slice(0, 80)}"`);
    const off = OFF_FICTION.exec(s.replace(PLACEHOLDER, ""));
    if (off) errors.push(`${path}: "${off[0]}" belongs to the old flying fiction (cable tenders on carriers now): "${s.slice(0, 80)}"`);
  }
}

function checkPlaceholders(where: string, text: string, speciesOk: Set<string>, errors: string[]): void {
  for (const m of text.matchAll(PLACEHOLDER)) {
    const p = m[1];
    if (["ship", "crew", "stage", "ttl", "relay"].includes(p)) continue;
    const sp = /^crew:(.+)$/.exec(p);
    if (sp) {
      if (!(SPECIES_IDS as readonly string[]).includes(sp[1])) errors.push(`${where}: unknown species placeholder {${p}}`);
      else if (!speciesOk.has(sp[1])) errors.push(`${where}: {${p}} used without a matching species requirement`);
      continue;
    }
    errors.push(`${where}: unknown placeholder {${p}}`);
  }
}

function checkCondition(where: string, c: Condition | undefined, errors: string[]): void {
  if (!c) return;
  for (const [k, v] of Object.entries(c.resources ?? {})) {
    if (!(RESOURCE_IDS as readonly string[]).includes(k)) errors.push(`${where}: unknown resource ${k}`);
    if (typeof v !== "number" || v < 0) errors.push(`${where}: bad resource amount ${k}=${v}`);
  }
  if (c.system) {
    if (!(SYSTEM_IDS as readonly string[]).includes(c.system.id)) errors.push(`${where}: unknown system ${c.system.id}`);
    if (c.system.level < 1 || c.system.level > 8) errors.push(`${where}: odd system level ${c.system.level}`);
  }
  if (c.weapon && !([...WEAPON_IDS, "laser", "ion", "beam", "payload", "flak"] as string[]).includes(c.weapon)) errors.push(`${where}: unknown weapon ${c.weapon}`);
  if (c.drone && !(DRONE_IDS as readonly string[]).includes(c.drone)) errors.push(`${where}: unknown drone ${c.drone}`);
  if (c.augment && !(AUGMENT_IDS as readonly string[]).includes(c.augment)) errors.push(`${where}: unknown augment ${c.augment}`);
  if (c.species && !(SPECIES_IDS as readonly string[]).includes(c.species)) errors.push(`${where}: unknown species ${c.species}`);
  for (const f of [c.flag, c.notFlag]) if (f && !(f in ALL_FLAGS)) errors.push(`${where}: undeclared flag ${f}`);
  if (c.stage && ![1, 2, 3].includes(c.stage)) errors.push(`${where}: bad stage ${c.stage}`);
  if (c.crewMin !== undefined && (c.crewMin < 1 || c.crewMin > 8)) errors.push(`${where}: odd crewMin ${c.crewMin}`);
}

// ─── Tests ─────────────────────────────────────────────────────────────────────────────────────────────────

test("event ids are unique", () => {
  assert.deepEqual(duplicateIds, [], `duplicate event ids: ${duplicateIds.join(", ")}`);
});

test("every event is well formed and every reference resolves", () => {
  const errors: string[] = [];
  const referenced = new Set<string>();
  for (const e of ALL_EVENTS) for (const [, o] of outcomesOf(e)) {
    if (o.next) referenced.add(o.next);
    if (o.combat?.onWin) referenced.add(o.combat.onWin);
    if (o.combat?.onSurrender) referenced.add(o.combat.onSurrender);
  }

  for (const e of CHECKED_EVENTS) {
    const at = `event ${e.id}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id)) errors.push(`${at}: id should be kebab-case`);
    if (!POOLS.includes(e.pool)) errors.push(`${at}: unknown pool ${e.pool}`);
    if (!e.stages || !e.stages.length) errors.push(`${at}: declare stages (also on scripted events)`);
    for (const s of e.stages ?? []) if (![1, 2, 3].includes(s)) errors.push(`${at}: bad stage ${s}`);
    if (!e.text?.trim()) errors.push(`${at}: empty text`);
    if (e.text && e.text.length > 900) errors.push(`${at}: body text is ${e.text.length} chars (max 900)`);
    if (e.title && e.title.length > 40) errors.push(`${at}: title too long`);
    if (!e.choices?.length) errors.push(`${at}: no choices`);
    if (e.weight !== undefined && e.weight <= 0) errors.push(`${at}: weight must be positive`);
    if (e.music && !(MUSIC_IDS as readonly string[]).includes(e.music)) errors.push(`${at}: unknown music ${e.music}`);
    if (e.art) { const k = `events/${e.art}`; usedArt.add(k); if (!artOk(k)) errors.push(`${at}: art ${k} is not standard or requested`); }
    if (e.portrait) { const k = `portraits/${e.portrait}`; usedArt.add(k); if (!artOk(k)) errors.push(`${at}: portrait ${k} is not standard or requested`); }
    if (e.pool === "scripted" && !e.id.startsWith(WAIT_EVENT_PREFIX) && !referenced.has(e.id)) errors.push(`${at}: scripted event is never reached`);
    if (e.id.startsWith(WAIT_EVENT_PREFIX) && e.pool !== "scripted") errors.push(`${at}: waiting events (${WAIT_EVENT_PREFIX}*) are scripted`);
    checkCondition(`${at}.requires`, e.requires, errors);
    checkNarrativeStrings(at, e, errors);

    const minStage = Math.min(...(e.stages ?? [1])) as StageIndex;
    const bodySpecies = new Set<string>(e.requires?.species ? [e.requires.species] : []);
    checkPlaceholders(`${at}.text`, e.text ?? "", bodySpecies, errors);

    e.choices?.forEach((c, ci) => {
      const cat = `${at}.choices[${ci}]`;
      if (!c.text?.trim()) errors.push(`${cat}: empty choice text`);
      if (c.text && c.text.length > 110) errors.push(`${cat}: choice text is ${c.text.length} chars (max 110)`);
      if (c.blue && !c.req) errors.push(`${cat}: blue option without req`);
      if (!c.outcomes?.length) errors.push(`${cat}: no outcomes`);
      checkCondition(`${cat}.req`, c.req, errors);
      const species = new Set<string>([...bodySpecies, ...(c.req?.species ? [c.req.species] : [])]);
      checkPlaceholders(`${cat}.text`, c.text ?? "", species, errors);

      // A price stated in the choice text, e.g. "(20 salvage)", must be required up front and actually paid.
      for (const m of (c.text ?? "").matchAll(/\((\d+) (salvage|TTL|ttl|payloads?|spares?)\)/g)) {
        const amount = Number(m[1]);
        const r = (m[2].toLowerCase().startsWith("payload") ? "payloads" : m[2].toLowerCase().startsWith("spare") ? "spares" : m[2].toLowerCase()) as "salvage" | "ttl" | "payloads" | "spares";
        if ((c.req?.resources?.[r] ?? 0) < amount) errors.push(`${cat}: states a price of ${amount} ${r}; add req.resources.${r} >= ${amount}`);
        if (!c.outcomes.some(w => { const v = w.outcome.resources?.[r]; return v !== undefined && rangeOf(v)[0] < 0; })) errors.push(`${cat}: states a price of ${amount} ${r} but no outcome charges it`);
      }

      c.outcomes?.forEach((w, oi) => {
        const oat = `${cat}.outcomes[${oi}]`;
        const o = w.outcome;
        if (w.weight !== undefined && w.weight <= 0) errors.push(`${oat}: weight must be positive`);
        if (o.text) {
          checkPlaceholders(`${oat}.text`, o.text, species, errors);
          if (o.text.length > 700) errors.push(`${oat}: outcome text is ${o.text.length} chars (max 700)`);
        }
        for (const [k, v] of Object.entries(o.resources ?? {})) {
          if (!(RESOURCE_IDS as readonly string[]).includes(k)) { errors.push(`${oat}: unknown resource ${k}`); continue; }
          const [lo, hi] = rangeOf(v as number | [number, number]);
          if (lo > hi) errors.push(`${oat}: range ${k} [${lo}, ${hi}] is reversed`);
          const [bLo, bHi] = RES_BOUNDS[k];
          const max = k === "salvage" ? Math.min(bHi, SALVAGE_MAX[minStage]) : bHi;
          if (lo < bLo || hi > max) errors.push(`${oat}: ${k} [${lo}, ${hi}] outside [${bLo}, ${max}] for stage ${minStage}`);
        }
        if (o.weapon && o.weapon !== "random" && !(WEAPON_IDS as readonly string[]).includes(o.weapon)) errors.push(`${oat}: unknown weapon ${o.weapon}`);
        if (o.drone && o.drone !== "random" && !(DRONE_IDS as readonly string[]).includes(o.drone)) errors.push(`${oat}: unknown drone ${o.drone}`);
        if (o.augment && o.augment !== "random" && !(AUGMENT_IDS as readonly string[]).includes(o.augment)) errors.push(`${oat}: unknown augment ${o.augment}`);
        if (o.car && !([...REAR_CAR_IDS, ...KEEL_CAR_IDS, "random-rear", "random-keel"] as string[]).includes(o.car)) errors.push(`${oat}: unknown car ${o.car}`);
        if (o.module && o.module !== "random" && !(MODULE_IDS as readonly string[]).includes(o.module)) errors.push(`${oat}: unknown module ${o.module}`);
        if (o.crewJoin && o.crewJoin.species !== "random" && !(SPECIES_IDS as readonly string[]).includes(o.crewJoin.species)) errors.push(`${oat}: unknown crewJoin species ${o.crewJoin.species}`);
        if (o.crewLoss && o.crewLoss !== "random" && !(SPECIES_IDS as readonly string[]).includes(o.crewLoss)) errors.push(`${oat}: unknown crewLoss ${o.crewLoss}`);
        if (o.crewDamage && (o.crewDamage.amount < 1 || o.crewDamage.amount > 100 || !["all", "one"].includes(o.crewDamage.who))) errors.push(`${oat}: bad crewDamage`);
        if (o.systemDamage && ((o.systemDamage.system !== "random" && !(SYSTEM_IDS as readonly string[]).includes(o.systemDamage.system)) || o.systemDamage.amount < 1 || o.systemDamage.amount > 4)) errors.push(`${oat}: bad systemDamage`);
        if (o.seal !== undefined && (o.seal < -3 || o.seal > 3 || o.seal === 0)) errors.push(`${oat}: seal ${o.seal} outside ±1..3`);
        if (o.repair !== undefined && o.repair !== "full" && (o.repair < 1 || o.repair > 30)) errors.push(`${oat}: repair ${o.repair} out of range`);
        if (o.reward && !["low", "med", "high"].includes(o.reward)) errors.push(`${oat}: bad reward tier`);
        for (const f of [...(o.flags ?? []), ...(o.clearFlags ?? [])]) if (!(f in ALL_FLAGS)) errors.push(`${oat}: undeclared flag ${f}`);
        if (o.fragment && !FRAGMENT_IDS.has(o.fragment)) errors.push(`${oat}: unknown fragment ${o.fragment}`);
        if (o.codex) {
          const entry = CODEX_BY_ID.get(o.codex);
          if (!entry) errors.push(`${oat}: unknown codex entry ${o.codex}`);
          else if (entry.unlock !== "outcome") errors.push(`${oat}: codex ${o.codex} is unlocked by "${entry.unlock}", not by outcomes`);
        }
        for (const [field, ref] of [["next", o.next], ["onWin", o.combat?.onWin], ["onSurrender", o.combat?.onSurrender]] as const) {
          if (!ref) continue;
          const target = BY_ID.get(ref);
          if (!target) errors.push(`${oat}: ${field} → unknown event ${ref}`);
          else if (target.pool !== "scripted") errors.push(`${oat}: ${field} → ${ref} should be a scripted event (is ${target.pool})`);
          if (ref === e.id) errors.push(`${oat}: ${field} points at itself`);
        }
        if (o.combat) {
          const enemy = o.combat.enemy;
          if (!(ENEMY_IDS as readonly string[]).includes(enemy)) { errors.push(`${oat}: unknown enemy ${enemy}`); return; }
          if (o.combat.intro) checkPlaceholders(`${oat}.combat.intro`, o.combat.intro, species, errors);
          const guardianStage = ([1, 2, 3] as StageIndex[]).find(s => GUARDIANS[s] === enemy);
          if (guardianStage) {
            if (!(e.pool === "exit" || e.pool === "scripted") || e.stages?.join() !== String(guardianStage)) errors.push(`${oat}: guardian ${enemy} outside its stage's exit sequence`);
          } else if (enemy !== "quarantine-drone") {
            for (const s of e.stages ?? []) if (!STAGE_ENEMIES[s].includes(enemy)) errors.push(`${oat}: ${enemy} does not belong to stage ${s}`);
          }
          if (HUMAN_ENEMIES.includes(enemy) && !o.combat.surrenderable) errors.push(`${oat}: ${enemy} is a human crew; set surrenderable`);
          if (o.combat.onSurrender && !o.combat.surrenderable) errors.push(`${oat}: onSurrender without surrenderable`);
          if (e.pool === "sealed" && !o.combat.noReward) errors.push(`${oat}: sealed-relay patrols give no rewards (noReward)`);
        }
      });
    });
  }
  assert.deepEqual(errors, [], `\n${errors.join("\n")}`);
});

test("each stage meets the pool quantities", () => {
  const errors: string[] = [];
  for (const s of STAGES) {
    const inStage = ALL_EVENTS.filter(e => e.stages?.includes(s));
    for (const [pool, min] of Object.entries(MIN_PER_STAGE) as [EventPool, number][]) {
      if (POOLS_UNDER_TEST.length && !POOLS_UNDER_TEST.includes(pool)) continue;
      const n = inStage.filter(e => e.pool === pool).length;
      if (pool === "exit" ? n !== 1 : n < min) errors.push(`stage ${s}: ${n} "${pool}" events (need ${pool === "exit" ? "exactly 1" : `≥ ${min}`})`);
    }
    const want = (p: EventPool) => !POOLS_UNDER_TEST.length || POOLS_UNDER_TEST.includes(p);

    if (want("combat")) {
      const met = new Map<EnemyId, number>();
      for (const e of inStage.filter(x => x.pool === "combat")) {
        const enemies = new Set<EnemyId>();
        for (const r of reachable(e.id)) for (const [, o] of outcomesOf(r)) if (o.combat) enemies.add(o.combat.enemy);
        if (!enemies.size) errors.push(`stage ${s}: combat event ${e.id} never starts a fight`);
        for (const en of enemies) met.set(en, (met.get(en) ?? 0) + 1);
      }
      for (const en of STAGE_ENEMIES[s]) if (!met.get(en)) errors.push(`stage ${s}: no combat intro for ${en}`);
    }
    if (want("hazard")) {
      for (const h of STAGE_HAZARDS[s]) {
        const n = inStage.filter(e => e.pool === "hazard" && e.id.includes(h)).length;
        if (!n) errors.push(`stage ${s}: no hazard event for ${h} (hazard event ids must contain the hazard id)`);
      }
      for (const e of inStage.filter(x => x.pool === "hazard")) {
        if (!STAGE_HAZARDS[s].some(h => e.id.includes(h))) errors.push(`stage ${s}: hazard event ${e.id} names no hazard of its stage in its id`);
      }
    }
    if (want("sealed")) {
      for (const e of inStage.filter(x => x.pool === "sealed")) {
        const fights = reachable(e.id).flatMap(r => [...outcomesOf(r)].map(([, o]) => o.combat).filter(Boolean));
        if (!fights.some(c => c!.enemy === "quarantine-drone")) errors.push(`stage ${s}: sealed event ${e.id} has no quarantine-drone fight`);
      }
    }
    if (want("market")) {
      for (const e of inStage.filter(x => x.pool === "market")) {
        if (!reachable(e.id).some(r => [...outcomesOf(r)].some(([, o]) => o.store))) errors.push(`stage ${s}: market event ${e.id} never opens the store`);
      }
    }
    if (want("exit")) {
      for (const e of inStage.filter(x => x.pool === "exit")) {
        const seq = reachable(e.id);
        const bossFights = seq.flatMap(r => [...outcomesOf(r)].map(([, o]) => o.combat).filter(c => c?.enemy === GUARDIANS[s]));
        if (!bossFights.length) errors.push(`stage ${s}: exit ${e.id} never fights ${GUARDIANS[s]}`);
        for (const c of bossFights) {
          if (!c!.onWin) { errors.push(`stage ${s}: guardian fight in ${e.id} has no onWin aftermath`); continue; }
          const after = reachable(c!.onWin);
          if (!after.some(r => [...outcomesOf(r)].some(([, o]) => o.flags?.includes(`guardian-${s}-ended`)))) {
            errors.push(`stage ${s}: aftermath ${c!.onWin} never sets guardian-${s}-ended`);
          }
        }
        if (e.stages?.join() !== String(s)) errors.push(`stage ${s}: exit ${e.id} must belong to stage ${s} only`);
      }
    }
  }
  assert.deepEqual(errors, [], `\n${errors.join("\n")}`);
});

test("waiting events exist for TTL 0 (campaign picks ids starting with wait-)", () => {
  if (PARTIAL) return;
  const waits = ALL_EVENTS.filter(e => e.id.startsWith(WAIT_EVENT_PREFIX));
  assert.ok(waits.length >= 4, `only ${waits.length} ${WAIT_EVENT_PREFIX}* events (need ≥ 4)`);
  for (const s of [1, 2, 3] as StageIndex[]) assert.ok(waits.some(e => e.stages?.includes(s)), `no waiting event for stage ${s}`);
});

test("the modular tender: cars and modules are offered by events", () => {
  if (PARTIAL) return;
  const withCar = ALL_EVENTS.filter(e => [...outcomesOf(e)].some(([, o]) => o.car));
  const withModule = ALL_EVENTS.filter(e => [...outcomesOf(e)].some(([, o]) => o.module));
  assert.ok(withCar.length >= 3, `only ${withCar.length} events offer a car (need ≥ 3)`);
  assert.ok(withModule.length >= 5, `only ${withModule.length} events offer a module (need ≥ 5)`);
});

test("flags are declared, and every flag that is read is set somewhere", () => {
  const errors: string[] = [];
  const set = new Set<string>();
  const read = new Map<string, string>();
  for (const e of ALL_EVENTS) {
    const note = (c: Condition | undefined, where: string) => {
      if (c?.flag) read.set(c.flag, where);
      if (c?.notFlag) read.set(c.notFlag, where);
    };
    note(e.requires, e.id);
    for (const c of e.choices) {
      note(c.req, e.id);
      for (const w of c.outcomes) for (const f of w.outcome.flags ?? []) set.add(f);
    }
  }
  for (const { flag } of ENDING_CALLBACKS) {
    if (!(flag in ALL_FLAGS)) errors.push(`ending callback: undeclared flag ${flag}`);
    read.set(flag, "ENDING_CALLBACKS");
  }
  for (const f of Object.keys(CORE_FLAGS)) if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f)) errors.push(`flag ${f} should be kebab-case`);
  if (!PARTIAL) {
    for (const [f, where] of read) if (!set.has(f)) errors.push(`flag ${f} is read (${where}) but never set`);
  }
  assert.deepEqual(errors, [], `\n${errors.join("\n")}`);
});

test("fragments", () => {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const f of FRAGMENTS) {
    if (ids.has(f.id)) errors.push(`duplicate fragment ${f.id}`);
    ids.add(f.id);
    if (![1, 2, 3].includes(f.stage)) errors.push(`${f.id}: bad stage`);
    if (!["queue", "ground", "teal"].includes(f.kind)) errors.push(`${f.id}: bad kind`);
    if (!f.from.trim() || !f.to.trim() || !f.text.trim()) errors.push(`${f.id}: empty field`);
    if (f.text.length > 240) errors.push(`${f.id}: fragment is long (${f.text.length}); keep them small`);
    if (f.kind === "teal") {
      if (f.from !== "Unknown sender · priority low") errors.push(`${f.id}: evening calls are "Unknown sender · priority low"`);
      if (/jacket|sister|ghost|your turn/i.test(f.text)) errors.push(`${f.id}: never connect the evening caller to the Ghost`);
    }
  }
  for (const s of [1, 2, 3] as StageIndex[]) {
    const n = FRAGMENTS.filter(f => f.stage === s).length;
    if (n < 12) errors.push(`stage ${s}: ${n} fragments (need ≥ 12)`);
  }
  // Events that deliver an evening call never mention jackets, sisters or the Ghost.
  const teal = new Set(FRAGMENTS.filter(f => f.kind === "teal").map(f => f.id));
  for (const e of ALL_EVENTS) {
    const hasTeal = [...outcomesOf(e)].some(([, o]) => o.fragment && teal.has(o.fragment));
    if (!hasTeal) continue;
    const all: [string, string][] = [];
    stringsIn(e, e.id, all);
    for (const [path, s] of all) if (/jacket|sister|ghost/i.test(s)) errors.push(`${path}: an evening-call event must not mention "${s.match(/jacket|sister|ghost/i)![0]}"`);
  }
  if (!PARTIAL) {
    const unlocked = new Set<string>();
    for (const e of ALL_EVENTS) for (const [, o] of outcomesOf(e)) if (o.fragment) unlocked.add(o.fragment);
    for (const f of FRAGMENTS) if (!unlocked.has(f.id)) errors.push(`fragment ${f.id} is never unlocked by an event`);
  }
  checkNarrativeStrings("FRAGMENTS", FRAGMENTS, errors);
  assert.deepEqual(errors, [], `\n${errors.join("\n")}`);
});

test("codex", () => {
  const errors: string[] = [];
  const ids = new Set<string>();
  const CATS = ["world", "people", "places", "machines", "runbook", "tender"];
  for (const c of CODEX) {
    if (ids.has(c.id)) errors.push(`duplicate codex ${c.id}`);
    ids.add(c.id);
    if (!CATS.includes(c.category)) errors.push(`${c.id}: bad category`);
    if (!c.title.trim() || !c.text.trim()) errors.push(`${c.id}: empty`);
    const u = c.unlock;
    if (u !== "start" && u !== "outcome") {
      const m = /^enemy:(.+)$/.exec(u);
      if (!m || !(ENEMY_IDS as readonly string[]).includes(m[1])) errors.push(`${c.id}: bad unlock ${u}`);
    }
    if (c.art) { usedArt.add(c.art); if (!artOk(c.art)) errors.push(`${c.id}: art ${c.art} is not standard or requested`); }
  }
  if (CODEX.length < 60) errors.push(`codex has ${CODEX.length} entries (need ≥ 60)`);
  for (const id of ENEMY_IDS) if (!CODEX.some(c => c.unlock === `enemy:${id}`)) errors.push(`no codex entry unlocked by enemy:${id}`);
  for (const cat of CATS) if (!CODEX.some(c => c.category === cat)) errors.push(`no codex entries in ${cat}`);
  if (!PARTIAL) {
    const unlocked = new Set<string>();
    for (const e of ALL_EVENTS) for (const [, o] of outcomesOf(e)) if (o.codex) unlocked.add(o.codex);
    for (const c of CODEX) if (c.unlock === "outcome" && !unlocked.has(c.id)) errors.push(`codex ${c.id} (unlock: outcome) is never unlocked by an event`);
  }
  checkNarrativeStrings("CODEX", CODEX, errors);
  assert.deepEqual(errors, [], `\n${errors.join("\n")}`);
});

test("script: prologue, stages, guardians, ending, game over, credits", () => {
  const errors: string[] = [];
  const beats: [string, ScriptBeat][] = [];
  const add = (label: string, list: ScriptBeat[]) => {
    if (!list?.length) errors.push(`${label}: empty`);
    list?.forEach((b, i) => beats.push([`${label}[${i}]`, b]));
  };
  add("PROLOGUE", PROLOGUE);
  for (const s of [1, 2, 3] as StageIndex[]) { add(`STAGE_INTRO[${s}]`, STAGE_INTRO[s]); add(`STAGE_OUTRO[${s}]`, STAGE_OUTRO[s]); }
  for (const [id, g] of Object.entries(GUARDIAN)) {
    for (const [moment, list] of Object.entries(g)) add(`GUARDIAN.${id}.${moment}`, list);
    for (const moment of ["approach", "handshake", "start", "half", "final", "defeat"]) if (!(g as Record<string, ScriptBeat[]>)[moment]?.length) errors.push(`GUARDIAN.${id}: missing ${moment}`);
    if (!GUARDIAN_BARKS[id as keyof typeof GUARDIAN_BARKS]?.length) errors.push(`GUARDIAN_BARKS.${id}: missing`);
  }
  add("ENDING", ENDING);
  ENDING_CALLBACKS.forEach((c, i) => beats.push([`ENDING_CALLBACKS[${i}]`, c.beat]));
  for (const [k, list] of Object.entries(GAME_OVER_VARIANTS)) add(`GAME_OVER_VARIANTS.${k}`, list);
  if (!GAME_OVER.length) errors.push("GAME_OVER: empty");

  const joined = (list: ScriptBeat[]) => list.map(b => b.text).join("\n");
  if (!joined(PROLOGUE).includes("Who'll take it?")) errors.push("PROLOGUE: the Operator asks \"Who'll take it?\"");
  if (!joined(PROLOGUE).includes("Go ahead.")) errors.push("PROLOGUE: ends with \"Go ahead.\"");
  if (!/TTL 16/.test(joined(PROLOGUE))) errors.push("PROLOGUE: the TTL is stamped");
  if (!/KEEPER/.test(joined(PROLOGUE))) errors.push("PROLOGUE: the KEEPER lamp");
  for (const needed of ["And then, an answer.", "Made it down. Your turn.", "GROUND"]) {
    if (!joined(ENDING).includes(needed)) errors.push(`ENDING: missing "${needed}"`);
  }
  if (ENDING_CALLBACK_INSERT_AT < 1 || ENDING_CALLBACK_INSERT_AT >= ENDING.length) errors.push("ENDING_CALLBACK_INSERT_AT out of range");
  for (const [k, list] of Object.entries(GAME_OVER_VARIANTS)) {
    const t = joined(list);
    if (!t.includes("Who'll take it?") || !/lamp blinks again/.test(t)) errors.push(`GAME_OVER.${k}: the lamp blinks again and the Operator asks again`);
  }
  const credits = CREDITS.flatMap(c => [c.title, ...c.lines]).join("\n");
  for (const needed of ["Original FAULTLINE created by Florian Schwarz — flosch.me", "A Containerlab universe fan game", "Krea 2", "YuE2", "Stable Audio 3"]) {
    if (!credits.includes(needed)) errors.push(`CREDITS: missing "${needed}"`);
  }
  for (const tool of ["Krea 2", "YuE2", "Stable Audio 3"]) if (!CREDIT_TOOLS.some(t => t.tool === tool)) errors.push(`CREDIT_TOOLS: missing ${tool}`);
  if (!GAME_OVER_TITLES.length) errors.push("GAME_OVER_TITLES empty");

  for (const [where, b] of beats) {
    if (!b.text?.trim()) errors.push(`${where}: empty text`);
    if (b.art) { usedArt.add(b.art); if (!artOk(b.art)) errors.push(`${where}: art ${b.art} is not standard or requested`); }
    if (b.portrait) { const k = `portraits/${b.portrait}`; usedArt.add(k); if (!artOk(k)) errors.push(`${where}: portrait ${k} not standard or requested`); }
    if (b.music && !(MUSIC_IDS as readonly string[]).includes(b.music)) errors.push(`${where}: unknown music ${b.music}`);
  }
  checkNarrativeStrings("SCRIPT", { PROLOGUE, STAGE_INTRO, STAGE_OUTRO, GUARDIAN, GUARDIAN_BARKS, ENDING, ENDING_CALLBACKS, GAME_OVER_VARIANTS, GAME_OVER_TITLES, CREDITS }, errors);
  assert.deepEqual(errors, [], `\n${errors.join("\n")}`);
});

test("flavor covers every id with the contract's names", () => {
  const errors: string[] = [];
  const need = (label: string, ids: readonly string[], rec: Record<string, { name: string; desc: string; lore: string }>) => {
    for (const id of ids) {
      const f = rec[id];
      if (!f) { errors.push(`${label}: missing ${id}`); continue; }
      if (!f.name?.trim() || !f.desc?.trim() || !f.lore?.trim()) errors.push(`${label}.${id}: name, desc and lore required`);
    }
  };
  need("SYSTEM_FLAVOR", SYSTEM_IDS, SYSTEM_FLAVOR);
  need("WEAPON_FLAVOR", WEAPON_IDS, WEAPON_FLAVOR);
  need("DRONE_FLAVOR", DRONE_IDS, DRONE_FLAVOR);
  need("AUGMENT_FLAVOR", AUGMENT_IDS, AUGMENT_FLAVOR);
  need("SPECIES_FLAVOR", SPECIES_IDS, SPECIES_FLAVOR);
  need("BOARDER_FLAVOR", BOARDER_IDS, BOARDER_FLAVOR);
  need("RESOURCE_FLAVOR", RESOURCE_IDS, RESOURCE_FLAVOR);
  need("HAZARD_FLAVOR", HAZARD_IDS, HAZARD_FLAVOR);
  need("ENEMY_FLAVOR", [...ENEMY_IDS, "gate-warden", "sealing-drone"], ENEMY_FLAVOR);
  need("CAR_FLAVOR", [...LEAD_CAR_IDS, ...REAR_CAR_IDS, ...KEEL_CAR_IDS], CAR_FLAVOR);
  need("MODULE_FLAVOR", MODULE_IDS, MODULE_FLAVOR);
  for (const c of LAMP_COLORS) if (!LIVERY_FLAVOR[c]?.name || !LIVERY_FLAVOR[c]?.lore) errors.push(`LIVERY_FLAVOR.${c}: missing`);
  for (const id of REAR_CAR_IDS) if (CAR_FLAVOR[id].slot !== "rear") errors.push(`CAR_FLAVOR.${id}: slot should be rear`);
  for (const id of KEEL_CAR_IDS) if (CAR_FLAVOR[id].slot !== "keel") errors.push(`CAR_FLAVOR.${id}: slot should be keel`);
  for (const [id, f] of Object.entries(ENEMY_FLAVOR)) if (!["crawler", "installation", "flier"].includes(f.mobility)) errors.push(`ENEMY_FLAVOR.${id}: mobility`);
  for (const [id, f] of Object.entries(ENEMY_FLAVOR)) {
    if (!f.classLine || !f.handshake || !f.taskEnded || !f.aftermath) errors.push(`ENEMY_FLAVOR.${id}: classLine, handshake, taskEnded, aftermath required`);
    if (EXPECTED_ENEMY_NAMES[id] !== f.name) errors.push(`ENEMY_FLAVOR.${id}: name "${f.name}" should be "${EXPECTED_ENEMY_NAMES[id]}"`);
  }
  for (const id of HUMAN_ENEMIES) if (!ENEMY_FLAVOR[id].surrender || !ENEMY_FLAVOR[id].surrenderAccepted) errors.push(`ENEMY_FLAVOR.${id}: human crews need surrender lines`);
  const names: Record<string, string> = {
    shields: "Shield Array", engines: "Thrusters", weapons: "Weapons Bay", air: "Air Plant", medbay: "Bench Infirmary",
    helm: "Helm", sensors: "Listening Post", doors: "Bulkheads", drones: "Drone Bay", veil: "Lamp-Dark Veil",
  };
  for (const [id, n] of Object.entries(names)) if (SYSTEM_FLAVOR[id as keyof typeof SYSTEM_FLAVOR].name !== n) errors.push(`SYSTEM_FLAVOR.${id}: should be named ${n}`);
  for (const s of [1, 2, 3] as StageIndex[]) if (!STAGE_FLAVOR[s]?.name) errors.push(`STAGE_FLAVOR[${s}] missing`);
  checkNarrativeStrings("FLAVOR", { SYSTEM_FLAVOR, WEAPON_FLAVOR, DRONE_FLAVOR, AUGMENT_FLAVOR, SPECIES_FLAVOR, BOARDER_FLAVOR, RESOURCE_FLAVOR, HAZARD_FLAVOR, ENEMY_FLAVOR, STAGE_FLAVOR, RELAY_FLAVOR, CAR_FLAVOR, MODULE_FLAVOR, LIVERY_FLAVOR }, errors);
  assert.deepEqual(errors, [], `\n${errors.join("\n")}`);
});

test("names and tips", () => {
  const errors: string[] = [];
  const uniq = (label: string, list: string[], min: number) => {
    if (list.length < min) errors.push(`${label}: ${list.length} (need ≥ ${min})`);
    const dup = list.filter((n, i) => list.indexOf(n) !== i);
    if (dup.length) errors.push(`${label}: duplicates ${dup.join(", ")}`);
  };
  uniq("GIVEN_NAMES", GIVEN_NAMES, 80);
  uniq("FAMILY_NAMES", FAMILY_NAMES, 40);
  uniq("RIGGER_DESIGNATIONS", RIGGER_DESIGNATIONS, 20);
  uniq("DESIGNATION_BIRDS", DESIGNATION_BIRDS, 20);
  uniq("LINEFOLK_NAMES", LINEFOLK_NAMES, 30);
  uniq("WARDEN_NAMES", WARDEN_NAMES, 15);
  uniq("COURIER_NAMES", COURIER_NAMES, 15);
  uniq("RELAY_NAMES", RELAY_NAMES, 30);
  uniq("TENDER_NAMES", TENDER_NAMES, 10);
  uniq("BELLMAKER_NAMES", BELLMAKER_NAMES, 6);
  for (const d of RIGGER_DESIGNATIONS) if (!/^Rigger \d+-[A-Z][a-z]+$/.test(d)) errors.push(`rigger designation "${d}" should look like "Rigger 7-Tern"`);
  if (!TENDER_NAMES.includes(DEFAULT_TENDER_NAME)) errors.push("TENDER_NAMES should include the default name");
  // Characters who join by name in events must not also be rolled as random recruits.
  const pools = new Set([...LINEFOLK_NAMES, ...WARDEN_NAMES, ...COURIER_NAMES, ...BELLMAKER_NAMES, ...RIGGER_DESIGNATIONS]);
  const named = new Map<string, string>();
  for (const e of ALL_EVENTS) for (const [, o] of outcomesOf(e)) {
    const n = o.crewJoin?.name;
    if (!n) continue;
    if (pools.has(n)) errors.push(`${e.id}: crewJoin name "${n}" is also in a random name pool`);
    const deck = Object.entries(DECKS).find(([, list]) => list.includes(e))?.[0] ?? "?";
    if (named.has(n) && named.get(n) !== deck) errors.push(`${e.id}: "${n}" also joins in deck ${named.get(n)}`);
    named.set(n, deck);
  }
  for (const e of ALL_EVENTS) {
    if (e.speaker && pools.has(e.speaker)) errors.push(`${e.id}: speaker "${e.speaker}" is also in a random name pool`);
  }
  if (TIPS.length < 25) errors.push(`TIPS: ${TIPS.length} (need ≥ 25)`);
  for (const t of TIPS) if (t.length > 160) errors.push(`tip too long: ${t}`);
  checkNarrativeStrings("NAMES", { GIVEN_NAMES, FAMILY_NAMES, RIGGER_DESIGNATIONS, TENDER_NAMES, BELLMAKER_NAMES, LINEFOLK_NAMES, WARDEN_NAMES, COURIER_NAMES, RELAY_NAMES }, errors);
  checkNarrativeStrings("TIPS", TIPS, errors);
  assert.deepEqual(errors, [], `\n${errors.join("\n")}`);
});

test("requested art is used (diagnostic)", t => {
  if (PARTIAL) return;
  const unused = [...REQUESTED_ART].filter(k => !usedArt.has(k));
  if (unused.length) t.diagnostic(`requested but unused art: ${unused.join(", ")}`);
});
