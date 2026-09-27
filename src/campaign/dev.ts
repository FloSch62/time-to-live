// Dev entries (open /?dev=<name>): map, event, store, ship, yard, script, runbook, gameover, ending, relay, newvoyage,
// settings, credits, victory, overflow. Optional params: stage=1..3, seed=<n>, id=<eventId>, seq=<SCRIPT_NAME>,
// auto=1 (auto-resolve fights).
import type { DevFactory } from "../dev";
import type { App, Scene } from "../core/scene";
import { Rng } from "../core/rng";
import "./content-loader";
import { content } from "./content";
import { createRun, advanceStage, hop } from "./run";
import { newShip } from "./shipops";
import { currentRelay, type RunState } from "./model";
import type { StageIndex } from "../game/ids";
import type { ScriptBeat } from "../game/types";
import { Session, waitUntil } from "../screens/session";
import { createMapScene } from "../screens/map";
import { createStoreScene } from "../screens/store";
import { createShipScene } from "../screens/ship";
import { createScriptScene } from "../screens/script";
import { createRunbookScene } from "../screens/runbook";
import { createGameOverScene } from "../screens/gameover";
import { createCreditsScene } from "../screens/credits";
import { createNewVoyage } from "../screens/newvoyage";
import { createSettingsScene } from "../screens/settings";
import { createVictoryScene } from "../screens/victory";
import { createOverflowScene } from "../screens/overflow";
import { createTitle } from "../screens/title";
import { applyOutcome, newCtx, withRng } from "./events";
import { buildSetup } from "./voyage";
import { autoResolve } from "./autoresolve";
import { coupleCar } from "./refit";

const blank = (): Scene => ({ draw(g) { g.rect(0, 0, 960, 540, "#07080f"); } });

/** A run somewhere in a stage: a few hops in, some salvage, a car and a module to play with. */
export function devRun(params: URLSearchParams): RunState {
  const seed = Number(params.get("seed") ?? 20260927);
  const stage = Math.max(1, Math.min(3, Number(params.get("stage") ?? 1))) as StageIndex;
  const rng = new Rng(seed);
  const run = createRun(seed, newShip("Lamplighter", rng));
  while (run.stage < stage) advanceStage(run);
  run.inv.salvage = 180;
  run.fragments.push(...[...content.fragments.keys()].filter((_, i) => i % 4 === 0).slice(0, 9));
  const hops = Number(params.get("hops") ?? 3);
  for (let i = 0; i < hops; i++) {
    const cur = currentRelay(run);
    cur.resolved = true;
    const dist = cur.links.filter((j) => run.map.relays[j].x > cur.x);
    const to = dist.length ? dist[0] : cur.links[0];
    hop(run, to);
  }
  currentRelay(run).resolved = true;
  if (params.has("cars")) {
    coupleCar(run.ship, "freight-car");
    coupleCar(run.ship, "listening-keel");
    run.ship.moduleStore.push("workshop", "cargo-hold");
  }
  return run;
}

function startSession(app: App, run: RunState, params: URLSearchParams, after?: (s: Session) => void): Scene {
  const s = new Session(app, run);
  s.autoFights = params.get("auto") === "1";
  s.begin({});
  if (after) void waitUntil(() => !app.scenes.transitioning && app.scenes.stack.includes(s.relay)).then(() => setTimeout(() => after(s), 1300));
  return blank();
}

function scriptBeats(seq: string, stage: StageIndex): ScriptBeat[] {
  const s = content.script;
  const key = seq.toUpperCase();
  if (key === "PROLOGUE") return s.PROLOGUE;
  if (key === "ENDING") return s.ENDING;
  if (key === "GAME_OVER" || key === "GAMEOVER") return s.GAME_OVER;
  if (key.startsWith("STAGE_INTRO")) return s.STAGE_INTRO[(Number(key.slice(-1)) || stage) as StageIndex] ?? [];
  if (key.startsWith("STAGE_OUTRO")) return s.STAGE_OUTRO[(Number(key.slice(-1)) || stage) as StageIndex] ?? [];
  const g = s.GUARDIAN[seq.toLowerCase()] as Record<string, ScriptBeat[]> | undefined;
  if (g) return Object.values(g).flat();
  return s.PROLOGUE;
}

export const dev: Record<string, DevFactory> = {
  title: (app) => createTitle(app),
  relay: (app, p) => startSession(app, devRun(p), p),
  map: (app, p) =>
    startSession(app, devRun(p), p, (s) => s.push(createMapScene(app, s, { hopEnabled: true, onHop: () => {}, onWait: () => {} }))),
  event: (app, p) => {
    const run = devRun(p);
    const id = p.get("id");
    const r = currentRelay(run);
    if (id && content.events.has(id)) {
      r.eventId = id;
      r.resolved = false;
    } else {
      // no id: the first event of the current stage's "event" pool
      const e = [...content.events.values()].find((x) => x.pool === (p.get("pool") ?? "event") && (!x.stages || x.stages.includes(run.stage)));
      if (e) {
        r.eventId = e.id;
        r.resolved = false;
      }
    }
    return startSession(app, run, p);
  },
  store: (app, p) => {
    const run = devRun(p);
    const r = currentRelay(run);
    r.type = "market";
    r.resolved = true;
    if (p.has("pell")) run.flags.push("pell-stall");
    return startSession(app, run, p, (s) => s.push(createStoreScene(app, run, () => {})));
  },
  ship: (app, p) => {
    const run = devRun(p);
    if (p.has("bench")) currentRelay(run).type = "bench";
    return startSession(app, run, p, (s) => s.push(createShipScene(app, run, () => {}, Number(p.get("tab") ?? 0))));
  },
  yard: (app, p) => {
    p.set("cars", "1");
    const run = devRun(p);
    currentRelay(run).type = "market";
    return startSession(app, run, p, (s) => s.push(createShipScene(app, run, () => {}, 3)));
  },
  script: (app, p) => {
    const run = devRun(p);
    const beats = scriptBeats(p.get("seq") ?? "PROLOGUE", run.stage);
    return createScriptScene(app, beats, { kind: "dev", run, onDone: () => app.scenes.switchTo(createTitle(app)) });
  },
  runbook: (app) => createRunbookScene(app, () => app.scenes.switchTo(createTitle(app)), { standalone: true }),
  gameover: (app, p) => {
    const q = new URLSearchParams(p);
    if (!q.has("hops")) q.set("hops", "6");
    const run = devRun(q);
    run.stats.machinesStopped = 7;
    run.stats.crewLost.push({ name: "Tamsin Vell", species: "linefolk" });
    run.ended = "defeat";
    return createGameOverScene(app, run);
  },
  ending: (app, p) => {
    const run = devRun(p);
    run.flags.push("music-box-sent", "answer-queued");
    const s = content.script;
    const beats = [...s.ENDING];
    const extra = s.ENDING_CALLBACKS.filter((c) => run.flags.includes(c.flag)).map((c) => c.beat);
    beats.splice(s.endingInsertAt >= 0 ? s.endingInsertAt : beats.length, 0, ...extra);
    return createScriptScene(app, beats, { kind: "ending", run, onDone: () => app.scenes.switchTo(createCreditsScene(app, { ending: true, run })) });
  },
  credits: (app) => createCreditsScene(app),
  newvoyage: (app) => createNewVoyage(app),
  settings: (app) => createSettingsScene(app, { standalone: true }),
  victory: (app, p) => {
    const run = devRun(p);
    return startSession(app, run, p, (s) => {
      const setup = buildSetup(run, { enemy: "scavenger-skiff", surrenderable: true });
      const result = autoResolve(run.ship, run.inv, setup, { force: "victory" });
      const applied = withRng(run, (rng) => applyOutcome(run, { reward: "high", weapon: "fiber-lance", fragment: [...content.fragments.keys()][3] }, newCtx(run), rng));
      s.push(createVictoryScene(app, run, { result, setup, applied }, () => {}));
    });
  },
  overflow: (app, p) => {
    const run = devRun(p);
    return startSession(app, run, p, (s) => {
      const applied = withRng(run, (rng) => applyOutcome(run, { car: "armory-car", weapon: "jammer" }, newCtx(run), rng));
      run.ship.cargo.push("jammer", "packet-laser", "fiber-lance", "scatter-shot");
      const a2 = withRng(run, (rng) => applyOutcome(run, { weapon: "trunk-lance" }, newCtx(run), rng));
      applied.grants.push(...a2.grants);
      s.push(createOverflowScene(app, run, applied, () => {}));
    });
  },
};
