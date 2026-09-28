// The UI presenter of a voyage: maps the voyage driver's requests (campaign/voyage.ts) onto scenes — the relay view
// (hub), the event window, fights, the store, rewards, scripts, game over and the ending.
import type { App, Scene } from "../core/scene";
import { goToTitle } from "./nav";
import { music, sfx } from "../core/audio";
import type { CombatResult, CombatSetup, ScriptBeat } from "../game/types";
import type { RunState } from "../campaign/model";
import { currentRelay, hasFlag, setFlag } from "../campaign/model";
import { content } from "../campaign/content";
import { tenderOpening, departureIntro } from "../content/tender-story";
import { endingReflections } from "../content/voyage-record";
import type { Applied, EventView } from "../campaign/events";
import { playVoyage, type HubAction, type Presenter, type ScriptKind, type VictoryInfo } from "../campaign/voyage";
import { saveRun, recordEnd, recordStart } from "../campaign/persist";
import { makeCombatScene, autoFight } from "../campaign/combat-adapter";
import { createRelayScene, type RelayScene } from "./relay";
import { createEventWindow, type EventWindow } from "./event";
import { createVictoryScene } from "./victory";
import { createOverflowScene } from "./overflow";
import { createStoreScene } from "./store";
import { createScriptScene } from "./script";
import { createGameOverScene } from "./gameover";
import { createCreditsScene } from "./credits";
import { createPauseMenu } from "./pause";
import { createAutoFightScene } from "./autofight";
import { playRelayMusic, relayTheme } from "./music";

export function waitUntil(cond: () => boolean): Promise<void> {
  return new Promise((res) => {
    const f = () => (cond() ? res() : requestAnimationFrame(f));
    f();
  });
}

let current: Session | null = null;

export function activeSession(): Session | null {
  return current;
}

export class Session implements Presenter {
  relay: RelayScene;
  eventWin: EventWindow | null = null;
  alive = true;
  /** Dev option: resolve fights automatically even when the combat scene exists. */
  autoFights = false;
  /**
   * An encounter is in progress: the last save (the arrival checkpoint) must stand, or a continued voyage would
   * replay the encounter on top of its own outcomes.
   */
  encounterActive = false;
  private lastSetup: CombatSetup | null = null;

  constructor(readonly app: App, readonly run: RunState) {
    this.relay = createRelayScene(app, this);
    current = this;
    // Test hook: ?autofight resolves fights with the fallback (headless flow checks).
    if (typeof location !== "undefined" && new URLSearchParams(location.search).has("autofight")) this.autoFights = true;
  }

  /** Start (or continue) the voyage. */
  begin(opts: { prologue?: boolean; fresh?: boolean } = {}) {
    if (opts.fresh) recordStart(this.run.ship.name);
    const t0 = performance.now();
    const tick = () => {
      if (!this.alive) return;
      this.run.stats.seconds += 1;
      setTimeout(tick, 1000);
    };
    setTimeout(tick, 1000);
    void t0;
    void playVoyage(this.run, this, { prologue: opts.prologue }).catch((e) => {
      console.error("voyage error", e);
    });
  }

  /** Leave to the title (the voyage stays saved at its last save point). */
  quitToTitle() {
    this.alive = false;
    if (current === this) current = null;
    goToTitle(this.app, 0.5);
  }

  private get scenes() {
    return this.app.scenes;
  }

  /** Make the relay view the base scene and wait until any fade is over. */
  async ensureBase() {
    await waitUntil(() => !this.scenes.transitioning);
    if (!this.scenes.stack.includes(this.relay)) {
      this.scenes.switchTo(this.relay);
      await waitUntil(() => !this.scenes.transitioning && this.scenes.stack.includes(this.relay));
    }
  }

  push(s: Scene) {
    this.scenes.push(s);
  }

  remove(s: Scene) {
    this.scenes.remove(s);
  }

  private guard<T>(p: Promise<T>): Promise<T> {
    // Promises of a quit session never resolve (the voyage loop just stops).
    return this.alive ? p : new Promise<T>(() => {});
  }

  // ─── Presenter ──────────────────────────────────────────────────────────────────────────────────────────

  async arrived(run: RunState) {
    this.encounterActive = false;
    await this.ensureBase();
    playRelayMusic(run);
    await this.guard(this.relay.arrive());
  }

  async choose(run: RunState, view: EventView): Promise<number> {
    this.encounterActive = true;
    await this.ensureBase();
    const r = currentRelay(run);
    // The guardian's approach cut-in before its exit event (once per stage).
    if (r.type === "exit" && !hasFlag(run, `approach-${run.stage}`)) {
      const g = content.script.GUARDIAN[guardianOf(run)] as Record<string, ScriptBeat[]> | undefined;
      setFlag(run, `approach-${run.stage}`);
      if (g?.approach?.length) {
        this.closeEvent();
        await this.script(run, g.approach, "guardian");
        await this.ensureBase();
      }
    }
    if (view.music) void music.play(view.music);
    if (!this.eventWin || !this.scenes.stack.includes(this.eventWin)) {
      this.eventWin = createEventWindow(this.app, this);
      this.push(this.eventWin);
      sfx.play("event-open", { volume: 0.7 });
    }
    return this.guard(new Promise<number>((res) => this.eventWin!.setChoices(view, res)));
  }

  async outcome(_run: RunState, applied: Applied, view: EventView) {
    if (!this.eventWin || !this.scenes.stack.includes(this.eventWin)) {
      this.eventWin = createEventWindow(this.app, this);
      this.push(this.eventWin);
    }
    return this.guard(new Promise<void>((res) => this.eventWin!.setOutcome(applied, view, res)));
  }

  async overflow(run: RunState, applied: Applied) {
    await waitUntil(() => !this.scenes.transitioning);
    return this.guard(new Promise<void>((res) => this.push(createOverflowScene(this.app, run, applied, res))));
  }

  closeEvent() {
    if (this.eventWin) {
      this.remove(this.eventWin);
      this.eventWin = null;
    }
  }

  async combat(run: RunState, setup: CombatSetup): Promise<CombatResult> {
    this.encounterActive = true;
    this.closeEvent();
    this.lastSetup = setup;
    if (setup.music) void music.play(setup.music, "battle");
    else void music.play(relayTheme(run), "battle");
    await waitUntil(() => !this.scenes.transitioning);
    const result = await this.guard(
      new Promise<CombatResult>((res) => {
        const done = (r: CombatResult) => res(r);
        const scene = this.autoFights ? null : makeCombatScene(this.app, run.ship, run.inv, setup, done, () => this.push(createPauseMenu(this.app, this, { combat: true })));
        if (scene) this.scenes.switchTo(scene);
        else this.push(createAutoFightScene(this.app, run, setup, (force) => done(autoFight(run.ship, run.inv, setup, force))));
      }),
    );
    if (result.outcome !== "defeat") {
      await this.ensureBase();
      music.setLayer("explore");
    }
    return result;
  }

  async victory(run: RunState, info: VictoryInfo) {
    await this.ensureBase();
    return this.guard(new Promise<void>((res) => this.push(createVictoryScene(this.app, run, info, res))));
  }

  async store(run: RunState) {
    await this.ensureBase();
    void music.play("exchange");
    await this.guard(new Promise<void>((res) => this.push(createStoreScene(this.app, run, res))));
    this.saveFromUI(run);
    playRelayMusic(run);
  }

  async script(run: RunState, beats: ScriptBeat[], kind: ScriptKind) {
    if (kind === "prologue") beats = tenderOpening(run.ship);
    else if (kind === "intro" && run.stage === 1) beats = departureIntro(run.ship);
    else if (kind === "outro") {
      // The guardian's written defeat (its task ending, in its own words), then the stage's outro without the beats
      // that retell the same moment. After the Heart the ending follows directly.
      const defeat = (content.script.GUARDIAN[guardianOf(run)] as Record<string, ScriptBeat[]> | undefined)?.defeat ?? [];
      const first = (t: string) => t.split(/(?<=[.!?])\s/)[0].trim();
      const rest = run.stage === 3 ? [] : beats.filter((b) => !defeat.some((d) => first(d.text) === first(b.text)));
      beats = [...defeat, ...rest];
    }
    if (!beats.length) return;
    await waitUntil(() => !this.scenes.transitioning);
    return this.guard(
      new Promise<void>((res) => {
        this.scenes.switchTo(createScriptScene(this.app, beats, { kind, run, onDone: res }), true, 0.6);
      }),
    );
  }

  async hub(run: RunState): Promise<HubAction> {
    this.encounterActive = false;
    await this.ensureBase();
    this.closeEvent();
    playRelayMusic(run);
    return this.guard(this.relay.hub());
  }

  /** Save points chosen by the voyage driver (arrival checkpoints, ends of encounters). */
  save(run: RunState) {
    if (!this.alive) return;
    saveRun(run);
  }

  /** Saves asked for by screens (store, ship, Save & quit): skipped while an encounter is in progress. */
  saveFromUI(run: RunState) {
    if (!this.alive || this.encounterActive) return;
    saveRun(run);
  }

  async gameOver(run: RunState) {
    recordEnd(run);
    this.closeEvent();
    const cause = run.ship.hull <= 0 ? "hull" : run.ship.crew.length === 0 ? "crew" : "default";
    const beats = content.script.GAME_OVER_VARIANTS[cause] ?? content.script.GAME_OVER;
    void music.play("line-quiet");
    sfx.play("defeat-sting");
    await this.script(run, beats, "gameover");
    this.alive = false;
    if (current === this) current = null;
    this.scenes.switchTo(createGameOverScene(this.app, run), true, 0.8);
  }

  async ending(run: RunState) {
    recordEnd(run);
    this.closeEvent();
    const s = content.script;
    const beats = [...s.ENDING];
    const extra = endingReflections(run, s.ENDING_CALLBACKS);
    const at = s.endingInsertAt >= 0 ? Math.min(s.endingInsertAt, beats.length) : beats.length;
    beats.splice(at, 0, ...extra);
    void music.play("an-answer");
    await this.script(run, beats, "ending");
    this.alive = false;
    if (current === this) current = null;
    this.scenes.switchTo(createCreditsScene(this.app, { ending: true, run }), true, 1.2);
  }

  lastCombatSetup() {
    return this.lastSetup;
  }
}

function guardianOf(run: RunState): string {
  return ["", "iron-regent", "hollow-choir", "blackout-core"][run.stage];
}
