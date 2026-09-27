// Test helpers (node only): load the writing workstream's src/content into the registry, or a tiny local sample
// set when it is not there yet. Not imported by the game.
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { EventDef } from "../game/types.ts";
import { content, registerModule, resetContent } from "./content.ts";
import { baselineShip, emptyXp } from "./shipops.ts";
import { normalizeShip } from "./refit.ts";
import type { ShipState } from "../game/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, "..", "content");

export interface LoadReport {
  real: boolean;
  modules: string[];
  failed: { path: string; error: string }[];
}

/** Load every module of src/content (recursively). Falls back to the sample set when nothing loads. */
export async function loadContent(): Promise<LoadReport> {
  resetContent();
  const report: LoadReport = { real: false, modules: [], failed: [] };
  const files: string[] = [];
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, f.name);
      if (f.isDirectory()) walk(p);
      else if (f.name.endsWith(".ts") && !f.name.endsWith(".test.ts")) files.push(p);
    }
  };
  walk(contentDir);
  for (const f of files) {
    try {
      const mod = (await import(pathToFileURL(f).href)) as Record<string, unknown>;
      registerModule(f, mod);
      report.modules.push(f.slice(contentDir.length + 1));
    } catch (e) {
      report.failed.push({ path: f, error: String((e as Error).message ?? e).split("\n")[0] });
    }
  }
  const hasEvents = [...content.events.values()].some((e) => !e.id.startsWith("gen:") && !e.id.startsWith("wait-"));
  report.real = hasEvents;
  if (!hasEvents) for (const e of SAMPLE_EVENTS) content.events.set(e.id, e);
  return report;
}

/** A minimal event set covering every pool, used only while src/content/events is missing. */
export const SAMPLE_EVENTS: EventDef[] = [
  {
    id: "sample-event", pool: "event", title: "A lamp", text: "{crew} sees a lamp on {stage}. The {ship} has {ttl} hops.",
    choices: [
      { text: "Look closer.", outcomes: [{ weight: 2, outcome: { text: "Salvage.", resources: { salvage: [5, 10] }, next: "sample-next" } }, { outcome: { text: "Nothing.", resources: { hull: -2 } } }] },
      { text: "Scan it.", blue: true, req: { system: { id: "sensors", level: 2 } }, outcomes: [{ outcome: { reward: "high", fragment: "f1-music-box" } }] },
      { text: "Leave.", outcomes: [{ outcome: {} }] },
    ],
  },
  { id: "sample-next", pool: "scripted", text: "And then another thing.", choices: [{ text: "Go on.", outcomes: [{ outcome: { reward: "low" } }] }] },
  {
    id: "sample-combat", pool: "combat", text: "A machine.",
    choices: [{ text: "Fight.", outcomes: [{ outcome: { combat: { enemy: "packet-leech" } } }] }],
  },
  {
    id: "sample-distress", pool: "distress", text: "A drifting car.",
    choices: [{ text: "Help.", outcomes: [{ outcome: { crewJoin: { species: "random" } } }, { outcome: { combat: { enemy: "scavenger-skiff", surrenderable: true } } }] }],
  },
  { id: "sample-market", pool: "market", text: "The exchange.", choices: [{ text: "Trade.", outcomes: [{ outcome: { store: true } }] }] },
  { id: "sample-bench", pool: "bench", text: "A bench.", choices: [{ text: "Rest.", outcomes: [{ outcome: { repair: 5, heal: true, resources: { ttl: 1 } } }] }] },
  { id: "sample-hazard", pool: "hazard", text: "Debris.", choices: [{ text: "Push through.", outcomes: [{ outcome: { resources: { hull: [-3, -1] } } }] }] },
  { id: "sample-empty", pool: "empty", text: "Quiet.", choices: [{ text: "Continue.", outcomes: [{ outcome: {} }] }] },
  {
    id: "sample-sealed", pool: "sealed", text: "The Seal.",
    choices: [{ text: "Fight.", outcomes: [{ outcome: { combat: { enemy: "quarantine-drone", noReward: true } } }] }],
  },
  ...([1, 2, 3] as const).map((s): EventDef => ({
    id: `sample-exit-${s}`, pool: "exit", stages: [s], text: "The guardian.",
    choices: [{ text: "Fight.", outcomes: [{ outcome: { combat: { enemy: (["iron-regent", "hollow-choir", "blackout-core"] as const)[s - 1], onWin: `sample-exit-win-${s}` } } }] }],
  })),
  ...([1, 2, 3] as const).map((s): EventDef => ({
    id: `sample-exit-win-${s}`, pool: "scripted", text: "It ends.",
    choices: [{ text: "Go on.", outcomes: [{ outcome: { reward: "high", codex: "sample-codex" } }] }],
  })),
];

export function testShip(name = "Test Tender"): ShipState {
  const s = baselineShip(name);
  s.crew = [
    { id: "c1", name: "Oona Brisk", species: "linefolk", hp: 100, xp: emptyXp(), look: 0, station: "lead:helm" },
    { id: "c2", name: "Harl Dunmore", species: "warden", hp: 130, xp: emptyXp(), look: 1, station: "lead:shields" },
    { id: "c3", name: "Rigger 7-Tern", species: "rigger", hp: 90, xp: emptyXp(), look: 2, station: "lead:weapons" },
  ];
  return normalizeShip(s);
}
