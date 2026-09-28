// A headless presenter that plays a voyage with random choices and auto-resolved fights (tests, balancing).
// Pure module.
import { Rng } from "../core/rng.ts";
import type { CombatResult, CombatSetup } from "../game/types.ts";
import { autoResolve } from "./autoresolve.ts";
import { eventById } from "./content.ts";
import type { Applied, EventView } from "./events.ts";
import { currentRelay, isSealed, type RunState } from "./model.ts";
import { canHop, knowledge, safeRecoveryStatus } from "./run.ts";
import { buyItem, buySupply, repairHullAt, storeHere } from "./store.ts";
import { upgradeCost, upgradeSystem } from "./upgrades.ts";
import { hopDistances } from "./map.ts";
import type { HubAction, Presenter, ScriptKind, VictoryInfo } from "./voyage.ts";
import type { SystemId } from "../game/ids.ts";
import { carSlot, coupleCar, isCarId } from "./refit.ts";

export interface HeadlessLog {
  events: string[];
  fights: { enemy: string; outcome: string; stage: number }[];
  scripts: ScriptKind[];
  stagesReached: number;
  saves: number;
  waits: number;
  problems: string[];
}

export function headlessPresenter(seed: number, opts: { forceWin?: boolean; log?: HeadlessLog } = {}): Presenter & { log: HeadlessLog } {
  const rng = new Rng(seed);
  const log: HeadlessLog = opts.log ?? { events: [], fights: [], scripts: [], stagesReached: 1, saves: 0, waits: 0, problems: [] };
  return {
    log,
    async arrived(run: RunState) {
      log.stagesReached = Math.max(log.stagesReached, run.stage);
    },
    async choose(run: RunState, view: EventView) {
      log.events.push(view.id);
      const ok = view.choices.filter((c) => c.enabled && !c.hidden);
      if (!ok.length) {
        log.problems.push(`event ${view.id} has no enabled choice`);
        return 0;
      }
      // Prefer blue options a little, like a player would.
      return rng.weighted(ok, (c) => (c.blue ? 2 : 1)).index;
    },
    async outcome(_run: RunState, a: Applied) {
      if (a.next && !eventById(a.next)) log.problems.push(`missing next event ${a.next}`);
    },
    async overflow(run: RunState, a: Applied) {
      // Couple offered cars into empty slots; leave the rest.
      for (const g of a.grants) {
        if (g.kind === "car" && g.placed === "offer" && isCarId(g.id) && !run.ship.consist[carSlot(g.id)]) coupleCar(run.ship, g.id);
      }
    },
    closeEvent() {},
    async combat(run: RunState, setup: CombatSetup): Promise<CombatResult> {
      const r = autoResolve(run.ship, run.inv, setup, opts.forceWin ? { force: "victory" } : {});
      log.fights.push({ enemy: setup.enemy, outcome: r.outcome, stage: setup.stage });
      return r;
    },
    async victory(_run: RunState, _info: VictoryInfo) {},
    async store(run: RunState) {
      const stock = storeHere(run);
      repairHullAt(run, stock, "all");
      if (run.inv.ttl < 6) buySupply(run, stock, "ttl", Math.min(stock.ttl, 3));
      stock.items.forEach((_, i) => {
        if (rng.chance(0.3)) buyItem(run, stock, i);
      });
    },
    async script(_run: RunState, _beats, kind: ScriptKind) {
      log.scripts.push(kind);
    },
    async hub(run: RunState): Promise<HubAction> {
      // Spend spare salvage on upgrades now and then.
      if (run.inv.salvage > 90) {
        const sys = rng.pick(["shields", "engines", "weapons"] as SystemId[]);
        if (upgradeCost(run.ship, sys) !== null) upgradeSystem(run, sys);
      }
      const cur = currentRelay(run);
      if (cur.type === "market") await this.store(run);
      if (run.inv.ttl <= 0) {
        log.waits++;
        return { kind: "wait" };
      }
      const options = cur.links.filter((j) => canHop(run, j).ok);
      if (!options.length) {
        if (safeRecoveryStatus(run).ok) return { kind: "service" };
        log.problems.push(`no hop from ${cur.name}`);
        return { kind: "wait" };
      }
      const dist = hopDistances(run.map.relays, run.map.exit);
      // Head for the exit, with some wandering while the Seal is far behind.
      const map = run.map;
      const exitward = options.filter((j) => dist[j] < dist[cur.id]);
      const safe = options.filter((j) => !isSealed(map, map.relays[j]));
      const wander = rng.chance(run.inv.ttl > dist[cur.id] + 3 ? 0.45 : 0.1);
      const pool = wander && safe.length ? safe : exitward.length ? exitward : options;
      const pick = rng.weighted(pool, (j) => (knowledge(run, map.relays[j]) === "type" && map.relays[j].type === "market" ? 3 : 1));
      return { kind: "hop", to: pick };
    },
    save() {
      log.saves++;
    },
    async gameOver() { log.scripts.push("gameover"); },
    async ending() { log.scripts.push("ending"); },
  };
}
