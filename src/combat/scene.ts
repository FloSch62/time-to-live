// The combat scene: fixed-step sim under real-time-with-pause, the side-view world (backdrop, carriers, the two
// vessels) seen through two zoomable cameras (★v4), FTL controls, effects/sound from sim events, rich tooltips,
// dialogs (surrender) and the end of the fight.
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { P, C, STAGE_TINT } from "../core/palette";
import { art, atlas, density } from "../core/assets";
import { sfx, music, type LoopHandle } from "../core/audio";
import { settings } from "../core/save";
import { hashString } from "../core/rng";
import type { CombatResult, CombatSetup, Inventory, ShipState } from "../game/types";
import { TILE } from "../data/layouts";
import { CARS } from "../data/cars";
import type { SysKey } from "../data/layouts";
import { Sim } from "./sim/sim";
import { DT, type Projectile, type SimEvent, type Target } from "./sim/model";
import { usable, effective } from "./sim/power";
import { beamRooms, chargeTime } from "./sim/weapons";
import { AutoPlayer } from "./sim/autoplay";
import {
  buildEnemyView, buildPlayerView, fromScreen, toScreen, ENEMY_AREA, PLAYER_AREA, type ShipView, carPoint,
  camToScreen, camToWorld, camInRegion, withCamera, zoomAt, resetZoom, panCam, updateCam,
} from "./view";
import {
  drawHull, drawRooms, drawDoors, drawCrew, crewFeet, doorRect, drawWardMesh, drawDrones, drawWeaponAt,
  mountPositions, muzzle, glow, type MountPos,
} from "./draw-ship";
import { Fx, drawBeam } from "./fx";
import { drawTopBar, drawEnemyHeader, drawBottomBar, drawCrewList, drawCommands, SYS_KEYS, CREW_Y, crewListH, type HudState } from "./hud";
import { enemyText, systemName, speciesName } from "./assets";
import { crewTooltip, roomTooltip, doorTooltip } from "./tooltips";

export interface CombatOpts {
  ship: ShipState;
  inventory: Inventory;
  setup: CombatSetup;
  onEnd: (r: CombatResult) => void;
  onMenu?: () => void;
  /** Dev: let the autopilot play the player's side. */
  auto?: boolean;
  /** Dev: fast-forward this many seconds (autopilot) before the first frame (for screenshots). */
  warp?: number;
}

interface LogLine {
  text: string;
  t: number;
  color: string;
}

export function createCombatScene(app: App, opts: CombatOpts): Scene {
  const setup = opts.setup;
  const sim = new Sim(opts.ship, opts.inventory, {
    enemy: setup.enemy, stage: setup.stage, seed: setup.seed, depth: setup.depth, hazard: setup.hazard, boss: setup.boss,
    surrenderable: setup.surrenderable, noReward: setup.noReward,
  });
  const auto = opts.auto ? new AutoPlayer(sim) : null;
  if (opts.warp) {
    const ap = auto ?? new AutoPlayer(sim);
    for (let i = 0; i < opts.warp * 60 && !sim.outcome; i++) {
      ap.tick(DT);
      sim.step(DT);
    }
    sim.takeEvents();
  }
  const lamp = sim.startState().livery?.lamp ?? "amber";
  const views: [ShipView, ShipView] = [buildPlayerView(sim.ships[0]), buildEnemyView(sim.ships[1])];
  const fx = new Fx();
  const hs: HudState = { selected: new Set(), weaponSel: -1, paused: !!settings.autoPause?.onArrive && !opts.warp, hoverCrew: -1 };
  const text = enemyText(setup.enemy);
  const log: LogLine[] = [];
  const bgVariant = "abc"[hashString(`${setup.seed}`) % 3];
  let acc = 0;
  let ended = false;
  let endShown = 0;
  let realT = 0;
  let introT = 0;
  let drag: { x: number; y: number } | null = null;
  let beamDrag: { i: number; x0: number; y0: number } | null = null;
  let middleDrag: { x: number; y: number; cam: 0 | 1 } | null = null;
  let middleAt = -10;
  let rdrag: { x: number; y: number; cam: 0 | 1; moved: boolean } | null = null;
  let fireLoop: LoopHandle | null = null;
  const stars = makeStars(hashString(`stars${setup.seed}`));

  const say = (t: string, color: string = C.text) => {
    log.push({ text: t, t: realT, color });
    if (log.length > 6) log.shift();
  };
  if (setup.intro) say(setup.intro, C.textDim);

  // Hardpoints in consist order → mount world positions.
  const hardpoints = () => {
    const out: { car: string; x: number; side: "roof" | "belly"; mount?: { x: number; y: number } }[] = [];
    for (const c of views[0].cars) {
      const def = CARS[c.id as keyof typeof CARS];
      if (!def) continue;
      def.hardpoints.forEach((hp, k) => out.push({ car: c.slot, x: hp.x, side: hp.side, mount: c.meta.mounts[k] }));
    }
    return out;
  };
  const playerMounts = (): MountPos[] => mountPositions(sim.ships[0], views[0], hardpoints());
  const enemyMounts = (): MountPos[] => {
    const v = views[1];
    const c = v.cars[0];
    const E = sim.ships[1];
    const wr = E.sys.weapons ? E.rooms[E.sys.weapons.room] : E.rooms[0];
    return E.weapons.map((w, i) => {
      const artRoom = w.art ? E.rooms[w.art.room] : null;
      if (artRoom && !c.meta.mounts[i]) {
        const [x, y] = toScreen(v, artRoom.x + artRoom.w / 2, artRoom.y);
        return { x: Math.round(x), y: Math.round(y) - 4, belly: false };
      }
      const m = c.meta.mounts[i % Math.max(1, c.meta.mounts.length)];
      if (m) {
        const [x, y] = carPoint(v, c, m);
        return { x: Math.round(x), y: Math.round(y), belly: m.y > c.meta.gy + (E.rows * TILE) / 2 };
      }
      // Fallback: roof and belly over the weapons room.
      const belly = i % 2 === 1;
      const [x, y] = toScreen(v, wr.x + 0.5 + Math.floor(i / 2) * 0.9, belly ? E.rows : 0);
      return { x: Math.round(x), y: Math.round(y) + (belly ? 6 : -6), belly };
    });
  };
  const muzzleWorld = (side: 0 | 1, slot: number): [number, number] | null => {
    const mounts = side === 0 ? playerMounts() : enemyMounts();
    const w = sim.ships[side].weapons.find((q) => q.slot === slot);
    const m = mounts[slot] ?? mounts[0];
    if (!m || !w) return null;
    return muzzle(w, m, side === 0 ? 1 : -1);
  };
  /** Screen start of a projectile. */
  const projStart = (p: Projectile): [number, number] => {
    if (p.from === -1) {
      const [tx, ty] = toScreen(views[p.to], p.px, p.py);
      const [sx, sy] = camToScreen(views[p.to].cam, tx, ty);
      return [p.to === 0 ? sx - 260 : sx + 260, sy - 90];
    }
    if (p.sx !== undefined && p.sy !== undefined) return camToScreen(views[p.to].cam, ...toScreen(views[p.to], p.sx, p.sy));
    if (p.ox !== undefined && p.oy !== undefined) return camToScreen(views[p.from].cam, ...toScreen(views[p.from], p.ox, p.oy));
    const m = muzzleWorld(p.from, p.mount);
    const w = m ?? toScreen(views[p.from], sim.ships[p.from].cols / 2, 0);
    return camToScreen(views[p.from].cam, w[0], w[1]);
  };
  const projEnd = (p: Projectile): [number, number] => camToScreen(views[p.to].cam, ...toScreen(views[p.to], p.px, p.py));

  // ─── events → effects, sound, log ────────────────────────────────────────────────────────────────────────

  const shipPoint = (e: SimEvent): [number, number] => toScreen(views[e.side ?? 0], e.x ?? 0, e.y ?? 0);
  const roomName = (side: 0 | 1, ri: number | undefined) => {
    const r = ri !== undefined ? sim.ships[side].rooms[ri] : undefined;
    if (!r) return "";
    return r.sys ? systemName(r.sys.id) : r.name;
  };

  const handle = (e: SimEvent) => {
    const pan = e.side === 1 ? 0.45 : e.side === 0 ? -0.45 : 0;
    fx.cam = e.side === 1 ? 1 : 0;
    switch (e.type) {
      case "fire": {
        sfx.play(e.text ?? "laser-fire", { pan: e.side === 0 ? -0.4 : 0.4, volume: 0.8 });
        const mounts = e.side === 0 ? playerMounts() : enemyMounts();
        const w = sim.ships[e.side ?? 0].weapons.find((q) => q.slot === e.slot);
        const m = mounts[e.slot ?? 0];
        if (m && w) {
          const [mx, my] = muzzle(w, m, e.side === 0 ? 1 : -1);
          fx.add({ kind: "flash", x: mx, y: my, life: 0.12, size: 5, color: P.amber1 });
          fx.sparks(mx, my, 3, P.amber0);
        }
        break;
      }
      case "fire-shot":
        sfx.play(e.text ?? "laser-fire", { pan: e.side === 0 ? -0.4 : 0.4, volume: 0.6, throttle: 0.08 });
        break;
      case "hit": {
        const [x, y] = shipPoint(e);
        const n = e.n ?? 1;
        fx.explosion(x, y, n >= 3 ? "large" : n >= 2 ? "medium" : "small");
        sfx.play(n >= 2 ? "hull-hit-big" : "hull-hit-small", { pan });
        if (e.side === 0) {
          fx.shake(n >= 3 ? 3 : n >= 2 ? 2 : 1);
          if (e.room !== undefined && sim.ships[0].rooms[e.room]?.sys) say(`${roomName(0, e.room)} hit.`, C.bad);
        }
        break;
      }
      case "miss": {
        const [x, y] = shipPoint(e);
        sfx.play("miss", { pan, volume: 0.6 });
        fx.add({ kind: "text", x, y: y - 10, text: "miss", life: 0.9, color: P.steel2 });
        break;
      }
      case "shield-hit": {
        const v = views[e.side ?? 0];
        const [, y] = shipPoint(e);
        const x = e.side === 1 ? v.bx + v.dx - 2 : v.bx + v.bw + v.dx + 2;
        fx.ripple(x, Math.max(v.by + 10, Math.min(v.by + v.bh - 10, y)), e.kind === "ion" ? P.violet1 : P.teal1, e.side === 1);
        fx.sparks(x, y, 4, e.kind === "ion" ? P.violet1 : P.teal1);
        sfx.play("shield-hit", { pan });
        break;
      }
      case "ion-hit": {
        const [x, y] = shipPoint(e);
        if (!fx.list.length || true) fx.add({ kind: "anim", x, y, anim: "ion-hit", life: 0.6 });
        fx.sparks(x, y, 6, P.violet1);
        sfx.play("ion-hit", { pan });
        if (e.side === 0 && e.room !== undefined) say(`${roomName(0, e.room)} ionised.`, P.violet1);
        break;
      }
      case "beam-start":
        sfx.play("beam-fire", { pan, volume: 0.9 });
        break;
      case "beam-blocked":
        say("The beam dies on the ward mesh.", C.textDim);
        break;
      case "fire-start":
        if (e.side === 0) {
          say(`Fire in the ${roomName(0, e.room)}.`, C.warn);
          if (settings.autoPause?.onFire) hs.paused = true;
        }
        break;
      case "breach": {
        const S = sim.ships[e.side ?? 0];
        const t = e.n ?? 0;
        const [x, y] = toScreen(views[e.side ?? 0], (t % S.cols) + 0.5, Math.floor(t / S.cols) + 0.5);
        fx.sparks(x, y, 8, P.steel3);
        sfx.play("breach", { pan });
        if (e.side === 0) say(`Breach in the ${roomName(0, e.room)}. Air is venting.`, C.bad);
        break;
      }
      case "crew-lost":
      case "crew-stopped": {
        const c = sim.crew.find((q) => q.uid === e.uid);
        if (c) {
          const [x, y] = crewFeet(sim.ships[c.ship], views[c.ship], c);
          if (!fx.list.find(() => false)) fx.add({ kind: "anim", x, y: y - 10, anim: "stop-sparks", life: 0.8 });
          fx.sparks(x, y - 10, 6, P.amber1);
          sfx.play("crew-stopped", { pan });
          if (e.type === "crew-lost") say(`${c.name} is lost.`, C.bad);
          else if (c.side === 1 && c.ship === 0) say(`${speciesName(c.species)} stopped.`, C.good);
          else if (c.side === 1 && c.kind === "crew") say(`${c.name} is down.`, C.textDim);
          hs.selected.delete(c.uid);
        }
        break;
      }
      case "door-open":
        sfx.play("door-open", { volume: 0.5 });
        break;
      case "door-close":
        sfx.play("door-close", { volume: 0.5 });
        break;
      case "door-broken":
        if (e.side === 0) say("Boarders are through a door.", C.bad);
        break;
      case "boarders": {
        sfx.play("teleport-in");
        sfx.play("boarders", { volume: 0.8 });
        const S = sim.ships[0];
        const r = S.rooms[e.room ?? 0];
        for (const t of r.tiles) {
          const [x, y] = toScreen(views[0], (t % S.cols) + 0.5, Math.floor(t / S.cols) + 1);
          fx.add({ kind: "anim", x, y: y - 2, anim: "teleport-in", life: 0.7 });
        }
        say(`Boarders in the ${roomName(0, e.room)}.`, C.bad);
        if (settings.autoPause?.onBoarders) hs.paused = true;
        break;
      }
      case "crawler-in":
        sfx.play("teleport-in", { pan });
        if (e.side === 1) say("The crawler is aboard.", C.good);
        break;
      case "power-up":
        sfx.play("power-up", { volume: 0.5, throttle: 0.05 });
        break;
      case "power-down":
        sfx.play("power-down", { volume: 0.5, throttle: 0.05 });
        break;
      case "power-denied":
        sfx.play("power-denied", { volume: 0.6, throttle: 0.1 });
        break;
      case "weapon-charged":
        sfx.play("weapon-charged", { volume: 0.35, throttle: 0.2 });
        break;
      case "hop-step":
        sfx.play("hop-charge", { volume: 0.6 });
        break;
      case "hop-ready":
        sfx.play("hop-ready");
        say("The switch has heard you. HOP is ready.", P.amber1);
        break;
      case "shot-down": {
        const p = sim.projectiles.find((q) => q.id === e.n);
        if (p) {
          const [x, y] = fx.projPos(p, projStart, projEnd);
          fx.cam = -1;
          fx.explosion(x, y, "small");
        }
        sfx.play("hull-hit-small", { volume: 0.5, pan });
        break;
      }
      case "drone-launch":
        sfx.play("drone-launch", { pan });
        break;
      case "drone-down": {
        const v = views[e.side ?? 0];
        const [x, y] = toScreen(v, e.x ?? 0, e.y ?? 0);
        if (e.kind === "shot") fx.explosion(x, y, "small");
        break;
      }
      case "drone-fire": {
        sfx.play("laser-fire", { volume: 0.4, throttle: 0.1, pan });
        break;
      }
      case "veil-on":
        sfx.play("veil-on");
        if (e.side === 1) say(`${text.name} goes dark.`, P.violet1);
        break;
      case "veil-off":
        sfx.play("veil-off");
        break;
      case "gate-lock": {
        const [x, y] = shipPoint(e);
        fx.sparks(x, y, 5, P.brass1);
        sfx.play("shield-hit", { rate: 0.8, pan });
        say(e.n === 1 ? "The gate holds: one route proved." : "The gate holds.", P.brass1);
        break;
      }
      case "gate-open": {
        const v = views[1];
        for (let i = 0; i < 24; i++) fx.add({ kind: "shard", x: v.bx + fx.rnd() * v.bw, y: v.by + fx.rnd() * v.bh, vx: (fx.rnd() - 0.5) * 60, vy: -fx.rnd() * 40, life: 1, color: P.brass1 });
        sfx.play("shield-down");
        say("Two routes. The gate opens.", P.amber1);
        break;
      }
      case "gate-up":
        sfx.play("shield-up");
        say("The gate seals again.", P.brass2);
        break;
      case "glass-ring":
        sfx.play("glass-bell", { volume: 0.6, rate: 0.9 + 0.1 * (e.n ?? 1) });
        break;
      case "glass-shatter": {
        const v = views[1];
        for (let i = 0; i < 40; i++) fx.add({ kind: "shard", x: v.bx + fx.rnd() * v.bw, y: v.by + fx.rnd() * v.bh, vx: (fx.rnd() - 0.5) * 90, vy: -fx.rnd() * 50, life: 1.2, color: fx.rnd() < 0.5 ? P.violet0 : P.violet1 });
        sfx.play("glass-bell", { rate: 0.6 });
        sfx.play("shield-down");
        say("Many voices at once. The glass breaks.", P.violet0);
        break;
      }
      case "glass-up":
        say("The glass closes over the bells.", P.violet1);
        break;
      case "phase": {
        music.setLayer(e.n === 2 ? "emergency" : "horizon");
        fx.shake(4);
        const v = views[1];
        fx.add({ kind: "flash", x: v.bx + v.bw / 2, y: v.by + v.bh / 2, life: 1.2, size: 60, color: e.n === 2 ? P.ivory0 : P.ember1 });
        say(e.n === 2 ? "Emergency. The Core spends its reserve; every lamp in the Heart dims to feed it." : "Event horizon. The light is pulled inward. Sealing drones rise.", P.ember1);
        sfx.play("hull-alarm");
        break;
      }
      case "custody-step":
        break;
      case "warden-mend": {
        const [x, y] = toScreen(views[1], e.x ?? 0, e.y ?? 0);
        fx.sparks(x, y, 4, P.teal1);
        break;
      }
      case "adj-hit": {
        const [x, y] = toScreen(views[1], e.x ?? 0, e.y ?? 0);
        fx.explosion(x, y, "small");
        sfx.play("hull-hit-small", { pan: 0.45 });
        break;
      }
      case "adj-down": {
        const [x, y] = toScreen(views[1], e.x ?? 0, e.y ?? 0);
        fx.explosion(x, y, "medium");
        say(e.kind === "gate-warden" ? "A gate warden steps back into the gate." : "A sealing drone falls silent.", C.good);
        break;
      }
      case "seal-fire":
        sfx.play("ion-fire", { pan: 0.45 });
        break;
      case "surrender":
        sfx.play("radio-squelch");
        break;
      case "enemy-flee":
        say(`${text.name} is spooling up to run.`, C.warn);
        break;
      case "no-payloads":
        say("No payloads left.", C.warn);
        break;
      case "no-spares":
        say("No spares to launch a drone.", C.warn);
        break;
      case "second-way-home":
        say("Second way home: the tender holds at 1 hull.", P.amber1);
        fx.shake(4);
        break;
      case "plating":
        say("Brass plating turns the blow.", P.brass1);
        break;
      case "hull-repair": {
        const [x, y] = toScreen(views[0], e.x ?? 0, e.y ?? 0);
        fx.sparks(x, y, 3, P.verd0);
        break;
      }
      case "repaired":
        sfx.play("repair-done", { volume: 0.4, throttle: 0.4 });
        break;
      case "rust":
        if (e.side === 0) say(`Rust squall: the ${roomName(0, e.room)} seizes.`, P.copper0);
        break;
      case "glare":
        if (e.side === 0) say("Sun glare sets a fire.", C.warn);
        break;
      case "pane-ring":
        if (e.side === 0) say(`The panes ring. The ${roomName(0, e.room)} is ionised.`, P.violet1);
        sfx.play("glass-bell", { volume: 0.5 });
        break;
      case "debris":
        break;
      case "room-full":
        say("That room is full.", C.textDim);
        break;
      case "stations-saved":
        say("Stations saved.", C.textDim);
        break;
      case "brood-charge":
        say("The brood stirs.", C.warn);
        break;
      case "outcome":
        onOutcome(e.text ?? "");
        break;
    }
  };

  const onOutcome = (o: string) => {
    if (o === "victory") {
      sfx.play("ship-destroyed");
      sfx.play("victory-sting");
      music.setLayer("explore");
    } else if (o === "defeat") {
      sfx.play("defeat-sting");
    } else if (o === "fled") {
      sfx.play("hop");
      music.setLayer("explore");
    } else if (o === "surrendered") {
      music.setLayer("explore");
    } else if (o === "escaped") {
      say(`${text.name} runs down the carrier.`, C.textDim);
      music.setLayer("explore");
    }
  };

  // ─── update ──────────────────────────────────────────────────────────────────────────────────────────────

  const modal = () => !!sim.surrender?.pending || (!!sim.outcome && endShown > 0);

  function update(dt: number) {
    realT += dt;
    introT += dt;
    if (!hs.paused && !modal()) {
      acc += dt;
      let steps = 0;
      while (acc >= DT && steps < 8) {
        auto?.tick(DT);
        sim.step(DT);
        acc -= DT;
        steps++;
      }
      if (steps >= 8) acc = 0;
    }
    for (const e of sim.takeEvents()) handle(e);
    fx.cam = -1;
    fx.update(hs.paused ? 0 : dt);
    updateCam(views[0].cam, dt);
    updateCam(views[1].cam, dt);
    // Vessel motion: gentle sway on the carrier, fliers bob, installations stand.
    const t = realT;
    const [PV, EV] = views;
    PV.dx = Math.round(Math.sin(t * 0.55) * 1);
    PV.dy = Math.round(Math.sin(t * 0.8 + 1) * 0.8);
    const E = sim.ships[1];
    if (E.mobility === "flier") {
      EV.dx = Math.round(Math.sin(t * 0.7) * 2);
      EV.dy = Math.round(Math.sin(t * 1.3) * 3);
    } else if (E.mobility === "crawler") {
      EV.dx = Math.round(Math.sin(t * 0.5 + 2) * 1);
      EV.dy = Math.round(Math.sin(t * 0.75) * 0.8);
    } else {
      EV.dx = 0;
      EV.dy = 0;
    }
    if (sim.outcome === "victory" && E.mobility !== "installation") EV.dy += Math.round(Math.max(0, E.deadT - 1.2) ** 2 * 14);
    if (sim.outcome === "escaped") EV.dx += Math.round(sim.outcomeT ** 2 * 260);
    if (sim.outcome === "fled") PV.dx += Math.round(sim.outcomeT ** 2 * 420);
    if (sim.outcome === "victory" && E.deadT < 3 && fx.rnd() < 0.15) {
      fx.cam = 1;
      fx.sparks(EV.bx + fx.rnd() * EV.bw, EV.by + fx.rnd() * EV.bh, 3, P.amber1);
      if (fx.rnd() < 0.3) fx.add({ kind: "smoke", x: EV.bx + fx.rnd() * EV.bw, y: EV.by + EV.bh * 0.5, vx: 0, vy: -12, life: 2, size: 4, color: P.ink4 });
      fx.cam = -1;
    }
    // Trolley sparks on the carrier now and then.
    if (!sim.outcome && fx.rnd() < dt * 0.25) {
      const lead = PV.cars.find((c) => c.slot === "lead");
      if (lead?.meta.cable) {
        fx.cam = 0;
        fx.add({ kind: "anim", x: lead.x + lead.meta.cable.x + PV.dx, y: lead.y + lead.meta.cable.y + PV.dy, anim: "trolley-spark", life: 0.4 });
        fx.cam = -1;
      }
    }
    // Fire loop sound on board.
    const P0 = sim.ships[0];
    let fires = 0;
    for (let i = 0; i < P0.fire.length; i++) if (P0.fire[i] > 0) fires++;
    if (fires && !fireLoop) fireLoop = sfx.loop("fire-loop", { volume: 0.3 });
    if (fireLoop) fireLoop.setVolume(Math.min(0.7, fires * 0.12));
    if (!fires && fireLoop) {
      fireLoop.stop();
      fireLoop = null;
    }
    // End of the fight.
    if (sim.outcome && !ended) {
      const o = sim.outcome;
      const wait = o === "fled" ? 1.3 : o === "victory" ? 2.4 : o === "defeat" ? 2.6 : 0.6;
      if (o === "fled" && sim.outcomeT >= wait) finish();
      else if (sim.outcomeT >= wait) endShown += dt;
    }
  }

  function finish() {
    if (ended) return;
    ended = true;
    fireLoop?.stop();
    fireLoop = null;
    opts.onEnd(sim.result());
  }

  // ─── input: cameras and world ────────────────────────────────────────────────────────────────────────────

  const inHud = (mx: number, my: number) =>
    my >= 440 || (my < 50 && (mx < 262 || (mx > 294 && mx < 692) || mx > 714)) || (mx < 374 && my > CREW_Y && my < CREW_Y + crewListH(sim.playerCrew().length));

  /** Mouse in world coordinates of a side (null when outside its region). */
  function worldMouse(side: 0 | 1): [number, number] | null {
    const cam = views[side].cam;
    const mx = app.input.x;
    const my = app.input.y;
    if (!camInRegion(cam, mx, my) || inHud(mx, my)) return null;
    return camToWorld(cam, mx, my);
  }

  function hoverRoomOf(side: 0 | 1): number {
    const w = worldMouse(side);
    if (!w) return -1;
    const p = fromScreen(views[side], w[0], w[1]);
    if (!p) return -1;
    const S = sim.ships[side];
    const tx = Math.floor(p[0]);
    const ty = Math.floor(p[1]);
    if (tx < 0 || ty < 0 || tx >= S.cols || ty >= S.rows) return -1;
    return S.tileRoom[ty * S.cols + tx];
  }

  function crewUnder(side: 0 | 1, owner: 0 | 1 | -1 = 0): number {
    const w = worldMouse(side);
    if (!w) return -1;
    let best = -1;
    let bd = 14;
    for (const c of sim.crew) {
      if (c.dead || c.ship !== side || (owner >= 0 && c.side !== owner)) continue;
      if (side === 1 && c.side === 1 && !sim.seeEnemyCrew()) continue;
      const [fx0, fy0] = crewFeet(sim.ships[side], views[side], c);
      const d = Math.abs(w[0] - fx0) + Math.abs(w[1] - (fy0 - 14)) * 0.6;
      if (d < bd) {
        bd = d;
        best = c.uid;
      }
    }
    return best;
  }

  function doorUnder(): number {
    const w = worldMouse(0);
    if (!w) return -1;
    const S = sim.ships[0];
    for (const d of S.doors) {
      const [x, y, dw, dh] = doorRect(S, views[0], d);
      if (w[0] >= x && w[1] >= y && w[0] < x + dw && w[1] < y + dh) return d.i;
    }
    return -1;
  }

  function adjUnder(): number {
    const w = worldMouse(1);
    if (!w) return -1;
    const E = sim.ships[1];
    for (const a of E.adjuncts) {
      if (!a.alive || !a.active) continue;
      const [x, y] = toScreen(views[1], a.x, a.y);
      if (Math.abs(w[0] - x) < 26 && Math.abs(w[1] - y) < 22) return a.i;
    }
    return -1;
  }

  function selectWeapon(i: number) {
    const P0 = sim.ships[0];
    const w = P0.weapons.find((q) => q.slot === i);
    if (!w) return;
    if (!w.powered) {
      sim.setWeaponPower(P0.weapons.indexOf(w), true);
      return;
    }
    hs.weaponSel = hs.weaponSel === i ? -1 : i;
    if (hs.weaponSel >= 0) sfx.play("weapon-select", { volume: 0.6 });
  }

  function cameraInput() {
    const input = app.input;
    const mx = input.x;
    const my = input.y;
    for (const side of [0, 1] as const) {
      const cam = views[side].cam;
      if (!camInRegion(cam, mx, my) || inHud(mx, my)) continue;
      if (input.wheel) zoomAt(cam, input.wheel, mx, my);
      if (input.pressed(1)) {
        if (app.time - middleAt < 0.3) resetZoom(cam);
        else middleDrag = { x: mx, y: my, cam: side };
        middleAt = app.time;
        input.consume();
      }
      if (cam.z > cam.baseZ * 1.01) {
        const dx = Number(input.key("ArrowLeft")) - Number(input.key("ArrowRight"));
        const dy = Number(input.key("ArrowUp")) - Number(input.key("ArrowDown"));
        if (dx || dy) panCam(cam, dx * 4, dy * 4);
      }
      // Edge pan when zoomed.
      if (cam.z > cam.baseZ * 1.01 && !drag && !beamDrag) {
        const e = 14;
        const sp = 5;
        let dx = 0;
        let dy = 0;
        if (mx < cam.rx + e) dx = sp;
        else if (mx > cam.rx + cam.rw - e) dx = -sp;
        if (my < cam.ry + e) dy = sp;
        else if (my > cam.ry + cam.rh - e) dy = -sp;
        if (dx || dy) panCam(cam, dx, dy);
      }
      if (input.pressed(2) && !rdrag) rdrag = { x: mx, y: my, cam: side, moved: false };
    }
    if (middleDrag) {
      if (!input.isDown(1)) middleDrag = null;
      else {
        panCam(views[middleDrag.cam].cam, mx - middleDrag.x, my - middleDrag.y);
        middleDrag.x = mx;
        middleDrag.y = my;
      }
    }
    if (rdrag) {
      const cam = views[rdrag.cam].cam;
      const dx = mx - rdrag.x;
      const dy = my - rdrag.y;
      if (!rdrag.moved && cam.z > cam.baseZ * 1.01 && Math.abs(dx) + Math.abs(dy) > 5) rdrag.moved = true;
      if (rdrag.moved) {
        panCam(cam, dx, dy);
        rdrag.x = mx;
        rdrag.y = my;
      }
    }
    if (input.keyPressed("KeyZ")) {
      resetZoom(views[0].cam);
      resetZoom(views[1].cam);
    }
  }

  /** Right-click (released without dragging the camera). */
  function rightClicked(): boolean {
    const input = app.input;
    if (!rdrag || !input.released(2)) return false;
    const was = !rdrag.moved;
    rdrag = null;
    return was;
  }

  function worldInput(g: Gfx) {
    const input = app.input;
    const ui = app.ui;
    const hoverOwn = hoverRoomOf(0);
    const hoverEnemy = hoverRoomOf(1);
    const hoverDoor = doorUnder();
    const hoverAdj = adjUnder();
    const own = crewUnder(0, 0);
    const other = own < 0 ? crewUnder(0, 1) : -1;
    const enemyCrew = crewUnder(1, -1);
    hs.hoverCrew = own >= 0 ? own : hs.hoverCrew;
    const P0 = sim.ships[0];
    const wsel = hs.weaponSel >= 0 ? P0.weapons.find((q) => q.slot === hs.weaponSel) : undefined;
    const P0idx = wsel ? P0.weapons.indexOf(wsel) : -1;
    const rclick = rightClicked();
    // Weapon targeting.
    if (wsel && !sim.outcome) {
      if (hoverEnemy >= 0 || hoverAdj >= 0) ui.cursor = "target";
      if (wsel.def.type === "beam") {
        if (input.pressed(0) && hoverEnemy >= 0) {
          const w = worldMouse(1)!;
          const p = fromScreen(views[1], w[0], w[1])!;
          beamDrag = { i: P0idx, x0: p[0], y0: p[1] };
          input.consume();
        }
      } else if (input.pressed(0) && (hoverEnemy >= 0 || hoverAdj >= 0)) {
        const t: Target = hoverAdj >= 0 ? { kind: "adj", i: hoverAdj } : { kind: "room", room: hoverEnemy };
        sim.setTarget(P0idx, t);
        sfx.play("weapon-select", { volume: 0.5 });
        hs.weaponSel = -1;
        input.consume();
      }
      if (rclick) {
        sim.setTarget(P0idx, null);
        hs.weaponSel = -1;
      }
    }
    if (beamDrag) {
      const w = P0.weapons[beamDrag.i];
      const wm = worldMouse(1);
      const p = wm ? fromScreen(views[1], wm[0], wm[1]) : null;
      const len = w?.def.beamLength ?? 2;
      let x1 = p ? p[0] : beamDrag.x0 + len;
      let y1 = p ? p[1] : beamDrag.y0;
      const d = Math.hypot(x1 - beamDrag.x0, y1 - beamDrag.y0);
      if (d < 0.2) {
        x1 = beamDrag.x0 + len;
        y1 = beamDrag.y0;
      } else if (d > len) {
        x1 = beamDrag.x0 + ((x1 - beamDrag.x0) / d) * len;
        y1 = beamDrag.y0 + ((y1 - beamDrag.y0) / d) * len;
      }
      const cam = views[1].cam;
      const [sx, sy] = camToScreen(cam, ...toScreen(views[1], beamDrag.x0, beamDrag.y0));
      const [ex, ey] = camToScreen(cam, ...toScreen(views[1], x1, y1));
      g.line(sx, sy, ex, ey, P.ember1);
      g.circle(Math.round(sx), Math.round(sy), 2, P.ember1, true);
      const rooms = beamRooms(sim.ships[1], { x0: beamDrag.x0, y0: beamDrag.y0, x1, y1 });
      g.text(`${rooms.length} room${rooms.length === 1 ? "" : "s"}`, Math.round(ex) + 6, Math.round(ey) - 4, { font: "small", color: P.ember1, shadow: P.ink0 });
      if (!input.isDown(0)) {
        if (w) sim.setTarget(beamDrag.i, { kind: "beam", x0: beamDrag.x0, y0: beamDrag.y0, x1, y1 });
        beamDrag = null;
        hs.weaponSel = -1;
      }
      return { hoverOwn, hoverEnemy };
    }
    // Tooltips in the world.
    if (own >= 0 || other >= 0) {
      const c = sim.crew.find((q) => q.uid === (own >= 0 ? own : other));
      if (c) ui.setTooltip(crewTooltip(sim, c), 280);
    } else if (enemyCrew >= 0) {
      const c = sim.crew.find((q) => q.uid === enemyCrew);
      if (c) ui.setTooltip(crewTooltip(sim, c), 280);
    } else if (hoverDoor >= 0) ui.setTooltip(doorTooltip(sim, P0.doors[hoverDoor]), 260);
    else if (hoverAdj >= 0) {
      const a = sim.ships[1].adjuncts[hoverAdj];
      ui.setTooltip(a.kind === "gate-warden"
        ? `{title}Gate Warden{/} · ${a.hp}/${a.maxHp}\n{dim}A piece of the gate, stepped out. It mends the Regent and closes the gate faster.{/}\n{faint}Target it with a weapon.{/}`
        : `{title}Sealing Drone{/} · ${a.hp}/${a.maxHp}\n{dim}Closes the shell: +1 ward layer on the Core while it flies, and fires sealing bolts.{/}\n{faint}Target it with a weapon.{/}`, 260);
    } else if (hoverEnemy >= 0) ui.setTooltip(roomTooltip(sim, 1, hoverEnemy), 280);
    else if (hoverOwn >= 0) ui.setTooltip(roomTooltip(sim, 0, hoverOwn), 280);
    if (wsel) return { hoverOwn: -1, hoverEnemy };
    // Crew orders.
    if (hs.selected.size && hoverOwn >= 0 && !sim.outcome) {
      ui.cursor = "crew-move";
      if (rclick) sim.moveCrew([...hs.selected], hoverOwn);
    }
    // Doors.
    if (hoverDoor >= 0 && own < 0) {
      ui.cursor = "pointer";
      if (input.pressed(0)) {
        sim.toggleDoor(hoverDoor);
        input.consume();
      }
    }
    // Selection: click a crew member, or drag a box.
    const mx = input.x;
    const my = input.y;
    if (input.pressed(0) && camInRegion(views[0].cam, mx, my) && !inHud(mx, my)) {
      if (own >= 0) {
        if (!input.shift) hs.selected.clear();
        if (hs.selected.has(own) && input.shift) hs.selected.delete(own);
        else hs.selected.add(own);
        sfx.play("crew-select", { volume: 0.6 });
        input.consume();
      } else {
        drag = { x: mx, y: my };
        input.consume();
      }
    }
    if (drag) {
      const x0 = Math.min(drag.x, mx);
      const y0 = Math.min(drag.y, my);
      const w = Math.abs(mx - drag.x);
      const h = Math.abs(my - drag.y);
      if (w > 3 || h > 3) g.box(x0, y0, w, h, P.teal2);
      if (!input.isDown(0)) {
        if (w > 3 || h > 3) {
          if (!input.shift) hs.selected.clear();
          for (const c of sim.crew) {
            if (c.dead || c.side !== 0 || c.ship !== 0 || c.kind !== "crew") continue;
            const [fx0, fy0] = camToScreen(views[0].cam, ...crewFeet(P0, views[0], c));
            if (fx0 >= x0 && fx0 <= x0 + w && fy0 - 12 >= y0 && fy0 - 12 <= y0 + h) hs.selected.add(c.uid);
          }
          if (hs.selected.size) sfx.play("crew-select", { volume: 0.6 });
        } else if (!input.shift) hs.selected.clear();
        drag = null;
      }
    }
    return { hoverOwn, hoverEnemy };
  }

  function hotkeys() {
    const input = app.input;
    const P0 = sim.ships[0];
    if (input.keyPressed("Space")) {
      hs.paused = !hs.paused;
      input.eatKey("Space");
    }
    if (input.keyPressed("Escape")) {
      if (hs.weaponSel >= 0) hs.weaponSel = -1;
      else if (hs.selected.size) hs.selected.clear();
      else {
        hs.paused = true;
        input.eatKey("Escape");
        opts.onMenu?.();
      }
    }
    for (let i = 0; i < sim.weaponSlots(); i++) {
      if (input.keyPressed(`Digit${i + 1}`)) {
        const w = P0.weapons.find((q) => q.slot === i);
        if (w && input.shift) sim.setWeaponPower(P0.weapons.indexOf(w), false);
        else selectWeapon(i);
      }
    }
    for (let i = 0; i < 3; i++) {
      if (input.keyPressed(`Digit${7 + i}`)) sim.setDronePower(i, !input.shift && !P0.drones.find((d) => d.slot === i)?.powered);
    }
    for (const [id, key] of Object.entries(SYS_KEYS) as [SysKey, string][]) {
      if (input.keyPressed(key)) {
        if (input.shift) sim.removePower(id);
        else sim.addPower(id);
      }
    }
    if (input.keyPressed("KeyR") && input.keyShifted("KeyR")) sim.saveStations();
    for (let i = 0; i < sim.playerCrew().length; i++) {
      if (input.keyPressed(`F${i + 1}`)) {
        const c = sim.playerCrew()[i];
        if (c && !c.dead) {
          if (!input.shift) hs.selected.clear();
          hs.selected.add(c.uid);
        }
      }
    }
  }

  // ─── draw ────────────────────────────────────────────────────────────────────────────────────────────────

  function draw(g: Gfx) {
    const [sxo, syo] = fx.shakeOffset(settings.screenShake !== false, realT);
    const ctx = g.ctx;
    ctx.save();
    ctx.translate(sxo, syo);
    drawBackdrop(g, setup.stage, bgVariant, realT, stars, sim);
    const E = sim.ships[1];
    const P0 = sim.ships[0];
    const hoverE = hs.weaponSel >= 0 ? hoverRoomOf(1) : -1;
    const hoverP = hs.selected.size && hs.weaponSel < 0 ? hoverRoomOf(0) : -1;
    const hoverD = doorUnder();
    const targetRooms = new Set<number>();
    for (const w of P0.weapons) if (w.target?.kind === "room") targetRooms.add(w.target.room);
    // Enemy vessel (its camera).
    const showInterior = sim.seeEnemyCrew();
    const em = enemyMounts();
    withCamera(ctx, views[1].cam, () => {
      drawCarrier(g, sim, views[1], 1);
      drawHull(g, sim, E, views[1], undefined);
      E.weapons.forEach((w, i) => em[i] && drawWeaponAt(g, sim, w, em[i], -1, sim.seeEnemyCharge()));
      drawRooms(g, sim, E, views[1], { hoverRoom: hoverE, targetRooms, dark: false, showInterior, lamp: undefined });
      drawDoors(g, sim, E, views[1], -1);
      drawCrew(g, sim, E, views[1], { visibleEnemy: showInterior, selected: hs.selected, hover: -1 });
      drawTargets(g);
      drawWardMesh(g, sim, E, views[1], E.hitT < 0.2 ? 1 - E.hitT / 0.2 : 0, { gate: E.boss.gate?.up, glass: E.boss.glass?.up });
      drawAdjuncts(g, sim, views[1]);
      fx.draw(g, "back", 1);
      drawDrones(g, sim, sim.ships[0], views, 1);
      drawDrones(g, sim, sim.ships[1], views, 1);
      fx.draw(g, "front", 1);
      if (E.veilT > 0) g.alpha(0.3, () => g.rect(views[1].bx, views[1].by, views[1].bw, views[1].bh, P.ink0));
    });
    // Player consist (its camera).
    const pm = playerMounts();
    withCamera(ctx, views[0].cam, () => {
      drawCarrier(g, sim, views[0], 0);
      fx.draw(g, "back", 0);
      drawHull(g, sim, P0, views[0], lamp);
      P0.weapons.forEach((w) => pm[w.slot] && drawWeaponAt(g, sim, w, pm[w.slot], 1, true));
      drawRooms(g, sim, P0, views[0], { hoverRoom: hoverP, targetRooms: new Set(), dark: sim.sensorLevel(0) <= 0, showInterior: true, lamp });
      drawDoors(g, sim, P0, views[0], hoverD);
      drawCrew(g, sim, P0, views[0], { visibleEnemy: true, selected: hs.selected, hover: hs.hoverCrew });
      drawEnemyIntent(g);
      drawWardMesh(g, sim, P0, views[0], P0.hitT < 0.2 ? 1 - P0.hitT / 0.2 : 0, {});
      drawDrones(g, sim, sim.ships[0], views, 0);
      drawDrones(g, sim, sim.ships[1], views, 0);
      fx.draw(g, "front", 0);
      if (P0.veilT > 0) g.alpha(0.22, () => g.rect(views[0].bx, views[0].by, views[0].bw, views[0].bh, P.ink0));
    });
    // Between the cameras: projectiles, beams, screen effects.
    fx.drawProjectiles(g, sim, projStart, projEnd);
    for (const b of sim.beams) {
      const mw = muzzleWorld(b.from, b.slot) ?? toScreen(views[b.from], 0, 0);
      const mz = camToScreen(views[b.from].cam, mw[0], mw[1]);
      const from = camToScreen(views[b.to].cam, ...toScreen(views[b.to], b.x0, b.y0));
      const cur = camToScreen(views[b.to].cam, ...toScreen(views[b.to], b.cx, b.cy));
      drawBeam(g, b, mz, from, cur, sim.t);
    }
    fx.draw(g, "back", -1);
    fx.draw(g, "front", -1);
    ctx.restore();
    zoomBadges(g);

    // HUD (never zoomed).
    hs.hoverCrew = -1;
    drawTopBar(g, app, sim, hs);
    drawEnemyHeader(g, app, sim);
    const acts = drawBottomBar(g, app, sim, hs);
    if (acts.weaponClick !== undefined) selectWeapon(acts.weaponClick);
    if (acts.weaponRight !== undefined) {
      const w = P0.weapons.find((q) => q.slot === acts.weaponRight);
      if (w) {
        if (w.target) sim.setTarget(P0.weapons.indexOf(w), null);
        else sim.setWeaponPower(P0.weapons.indexOf(w), false);
      }
      if (hs.weaponSel === acts.weaponRight) hs.weaponSel = -1;
    }
    drawCommands(g, app, sim, hs, 812);
    const clicked = drawCrewList(g, app, sim, hs, 6, CREW_Y);
    if (clicked !== null) {
      if (!app.input.shift) hs.selected.clear();
      hs.selected.add(clicked);
      sfx.play("crew-select", { volume: 0.6 });
    }
    drawLog(g);
    if (!modal() && !sim.outcome) {
      hotkeys();
      cameraInput();
      worldInput(g);
    } else {
      cameraInput();
      if (!sim.outcome && app.input.keyPressed("Space") && !sim.surrender?.pending) hs.paused = !hs.paused;
    }
    if (!app.input.isDown(2)) rdrag = null;
    drawIntro(g);
    drawSurrender(g);
    drawEnd(g);
  }

  function zoomBadges(g: Gfx) {
    for (const side of [0, 1] as const) {
      const cam = views[side].cam;
      if (cam.tz === cam.baseZ && cam.z === cam.baseZ) continue;
      const x = side === 0 ? cam.rx + 6 : cam.rx + cam.rw - 64;
      const y = cam.ry + cam.rh - 16;
      g.panel(x, y, 58, 13, "panel-dark");
      g.text(`${(cam.tz / cam.baseZ).toFixed(1)}× · Z`, x + 29, y + 2, { font: "small", color: C.textDim, align: "center" });
      g.alpha(0.5, () => g.box(cam.rx, cam.ry, cam.rw, cam.rh, P.brass4));
    }
  }

  function drawLog(g: Gfx) {
    let y = 426;
    for (let i = log.length - 1; i >= 0 && y > 380; i--) {
      const l = log[i];
      const age = realT - l.t;
      if (age > 7) continue;
      const a = age > 5 ? 1 - (age - 5) / 2 : 1;
      g.text(l.text, 384, y, { font: "small", color: l.color, width: 134, maxLines: 1, alpha: a * (i === log.length - 1 ? 1 : 0.7), shadow: P.ink0 });
      y -= 10;
    }
  }

  function drawTargets(g: Gfx) {
    const P0 = sim.ships[0];
    const E = sim.ships[1];
    for (const w of P0.weapons) {
      const t = w.target;
      if (!t) continue;
      const ready = w.charge >= chargeTime(w) - 1e-3;
      if (t.kind === "room") {
        const r = E.rooms[t.room];
        const [x, y] = toScreen(views[1], r.x + r.w / 2, r.y + r.h / 2);
        if (!g.anim("fx", ready ? "reticle-locked" : "reticle", sim.t, Math.round(x), Math.round(y))) g.circle(Math.round(x), Math.round(y), 8, P.ember1);
        g.text(`${w.slot + 1}`, Math.round(x) + 9, Math.round(y) - 12, { font: "small", color: P.ember1, shadow: P.ink0 });
      } else if (t.kind === "adj") {
        const a = E.adjuncts[t.i];
        const [x, y] = toScreen(views[1], a.x, a.y);
        g.circle(Math.round(x), Math.round(y), 12, P.ember1);
        g.text(`${w.slot + 1}`, Math.round(x) + 12, Math.round(y) - 14, { font: "small", color: P.ember1, shadow: P.ink0 });
      } else {
        const [x0, y0] = toScreen(views[1], t.x0, t.y0);
        const [x1, y1] = toScreen(views[1], t.x1, t.y1);
        g.alpha(0.8, () => g.line(x0, y0, x1, y1, P.ember1));
        g.circle(Math.round(x0), Math.round(y0), 2, P.ember1, true);
      }
    }
  }

  /** Enemy intentions (Listening Post 3): reticles on your rooms. */
  function drawEnemyIntent(g: Gfx) {
    if (!sim.seeEnemyCharge()) return;
    const P0 = sim.ships[0];
    for (const w of sim.ships[1].weapons) {
      if (!w.target || w.target.kind !== "room") continue;
      const r = P0.rooms[w.target.room];
      const [x, y] = toScreen(views[0], r.x + r.w / 2, r.y + r.h / 2);
      g.alpha(0.55, () => g.circle(Math.round(x), Math.round(y), 7, P.ember2));
    }
  }

  function drawIntro(g: Gfx) {
    if (sim.outcome || introT > 14) return;
    if (introT > 9 && !hs.paused) return;
    const a = introT > 8 ? Math.max(0, 1 - (introT - 8)) : 1;
    const A = ENEMY_AREA;
    const x = A.x + 10;
    const y = A.y + A.h - 39;
    g.alpha(Math.max(a, hs.paused ? 1 : 0), () => {
      g.text(text.handshake, x, y, { font: "small", color: P.ember0, width: A.w - 20,
        maxLines: 1, shadow: P.ink0, reveal: Math.min(1, introT / 2.5) });
    });
  }

  function drawSurrender(g: Gfx) {
    const s = sim.surrender;
    if (!s?.pending || sim.outcome) return;
    const ui = app.ui;
    g.dim(0.45);
    const w = 400;
    const h = 150;
    const x = 480 - w / 2;
    const y = 170;
    g.panel(x, y, w, h, "dialog");
    g.text(text.name.toUpperCase(), x + 16, y + 12, { font: "labelb", color: P.ember1 });
    g.text(text.surrender, x + 16, y + 28, { color: C.text, width: w - 32 });
    const r = s.reward.resources ?? {};
    const parts = Object.entries(r).map(([k, v]) => `{icon:res-${k}-sm}${v}`);
    g.text(`They offer ${parts.join("  ")}`, x + 16, y + 80, { font: "small", color: P.amber1, width: w - 32 });
    if (ui.button("sur-yes", x + 16, y + h - 34, 170, 24, "Accept", { variant: "blue", hotkey: "Digit1", showKey: true })) sim.acceptSurrender();
    if (ui.button("sur-no", x + w - 186, y + h - 34, 170, 24, "Keep fighting", { hotkey: "Digit2", showKey: true })) sim.declineSurrender();
  }

  function drawEnd(g: Gfx) {
    const o = sim.outcome;
    if (!o || o === "fled" || endShown <= 0) return;
    const ui = app.ui;
    const a = Math.min(1, endShown * 2);
    g.alpha(a, () => {
      const w = 430;
      const h = 124;
      const x = 480 - w / 2;
      const y = 190;
      g.panel(x, y, w, h, o === "defeat" ? "panel-danger" : "dialog");
      let title = "";
      let body = "";
      let color: string = P.brass1;
      if (o === "victory") {
        title = sim.ships[1].kind === "human" ? "THEIR FIGHT IS OVER" : "TASK ENDED";
        body = sim.ships[1].kind === "human" ? text.aftermath || text.taskEnded : text.taskEnded;
      } else if (o === "surrendered") {
        title = "SURRENDER ACCEPTED";
        body = text.surrenderAccepted;
      } else if (o === "escaped") {
        title = "THEY RAN";
        body = `${text.name} ran down the carrier.`;
        color = C.textDim;
      } else {
        title = "THE LINE GOES QUIET";
        body = sim.ships[0].hull <= 0 ? "The tender breaks from its carrier." : "Nobody is left aboard to answer.";
        color = P.ember1;
      }
      g.text(title, 480, y + 12, { font: "head", color, align: "center" });
      g.text(body, 480, y + 44, { color: C.text, align: "center", width: w - 40, reveal: Math.min(1, endShown / 2) });
    });
    if (endShown > 0.6 && ui.button("end-go", 480 - 80, 190 + 124 - 32, 160, 24, "Continue", { variant: "blue", hotkey: "Enter", showKey: true })) finish();
    if (endShown > 0.6 && app.input.keyPressed("Space")) finish();
  }

  return {
    enter() {
      if (setup.music) void music.play(setup.music, setup.music === "event-horizon" ? "custody" : "battle");
      else music.setLayer("battle");
    },
    exit() {
      fireLoop?.stop();
      fireLoop = null;
    },
    update,
    draw(g: Gfx) {
      draw(g);
    },
  };
}

// ─── world: backdrop, carriers, adjuncts ────────────────────────────────────────────────────────────────────

interface Star {
  x: number;
  y: number;
  s: number;
  c: string;
}

function makeStars(seed: number): Star[] {
  let h = seed || 1;
  const r = () => {
    h = (h * 16807) % 2147483647;
    return h / 2147483647;
  };
  const out: Star[] = [];
  for (let i = 0; i < 90; i++) out.push({ x: r() * 960, y: r() * 300, s: r() < 0.1 ? 2 : 1, c: r() < 0.2 ? P.teal0 : r() < 0.4 ? P.amber0 : P.steel3 });
  return out;
}

function drawBackdrop(g: Gfx, stage: number, variant: string, t: number, stars: Star[], sim: Sim) {
  const bg = art(`bg/s${stage}-${variant}`) ?? art(`bg/s${stage}-a`);
  if (bg) g.cover(bg);
  else {
    // Procedural sky at the edge of space: indigo to the cloud sea.
    const bands = [P.ink0, P.ink1, P.ink2, P.ink3];
    for (let i = 0; i < 4; i++) g.rect(0, i * 90, 960, 90, bands[i]);
    const tint = STAGE_TINT[stage as 1 | 2 | 3] ?? STAGE_TINT[1];
    g.alpha(0.18, () => g.rect(0, 330, 960, 210, tint.dark));
    // Cloud sea.
    for (let i = 0; i < 6; i++) {
      const y = 380 + i * 22;
      g.alpha(0.12 + i * 0.05, () => {
        for (let x = -40; x < 1000; x += 60) g.ellipse(x + ((t * (3 + i) + i * 37) % 60), y, 40, 8, P.steel0, 1);
      });
    }
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * 0.8 + s.x);
      g.alpha(0.4 + 0.5 * tw, () => g.rect(Math.round((s.x - t * 1.5) % 960 + 960) % 960, Math.round(s.y), s.s, s.s, s.c));
    }
    // Distant Line: a long arc of dark machinery with lamps.
    g.rect(0, 300, 960, 6, P.ink1);
    for (let x = 20; x < 960; x += 80) g.rect(x, 298, 2, 2, P.amber3);
  }
  // Dust drifting across (parallax).
  for (let i = 0; i < 24; i++) {
    const x = ((i * 97 + t * (6 + (i % 4) * 3)) % 1000) - 20;
    const y = 60 + ((i * 53) % 360);
    g.alpha(0.25, () => g.rect(Math.round(x), y, 1, 1, P.steel2));
  }
  if (sim.setup.hazard === "glass-fog" || sim.setup.hazard === "dark-stretch") g.alpha(0.3, () => g.rect(0, 0, 960, 540, sim.setup.hazard === "glass-fog" ? P.violet4 : P.ink0));
  if (sim.setup.hazard === "sealing-lattice") {
    g.alpha(0.12, () => {
      for (let x = 0; x < 960; x += 24) g.line(x, 0, x + 200, 540, P.ember2);
    });
  }
}

/** Braided carrier cables: the player's across the top of the left area, a crawler's on the right. */
function drawCarrier(g: Gfx, sim: Sim, v: ShipView, side: 0 | 1) {
  if (side === 0) {
    const grips: [number, number][] = [];
    for (const c of v.cars) if (c.meta.cable) grips.push([Math.round(c.x + c.meta.cable.x + v.dx), Math.round(c.y + c.meta.cable.y + v.dy)]);
    grips.sort((a, b) => a[0] - b[0]);
    if (grips.length) cable(g, [[-30, grips[0][1] - 18], ...grips, [660, grips[grips.length - 1][1] - 12]], sim.t, sim.ships[0].hop);
    return;
  }
  const E = sim.ships[1];
  const m = v.cars[0].meta;
  if (E.mobility === "crawler" && m.cable) {
    const gx = Math.round(v.cars[0].x + m.cable.x + v.dx);
    const gy = Math.round(v.cars[0].y + m.cable.y + v.dy);
    cable(g, [[600, gy - 14], [gx, gy], [990, gy - 12]], sim.t, 0);
  }
}

/** Cable height along a polyline of sagging spans. */
function cableY(pts: [number, number][], x: number): number {
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[k + 1];
    if (x < x0 || x > x1) continue;
    const f = (x - x0) / Math.max(1, x1 - x0);
    const sag = Math.min(18, Math.abs(x1 - x0) * 0.05);
    return y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * sag;
  }
  return pts[pts.length - 1][1];
}

function cable(g: Gfx, pts: [number, number][], t: number, hop: number) {
  const x0 = Math.round(pts[0][0]);
  const x1 = Math.round(pts[pts.length - 1][0]);
  const a = atlas("fx");
  const tile = a?.frames["cable-carrier"];
  if (a && tile) {
    // The sprites workstream's braid, blitted column by column along the sag (fx.json "cable").
    const d = density(a.image);
    const tw = tile.w / d;
    for (let x = x0; x < x1; x++) {
      const y = Math.round(cableY(pts, x));
      const col = (((x % tw) + tw) % tw) * d;
      g.sub(a.image, tile.x + col, tile.y, d, tile.h, x, y - tile.ay / d, false, d);
    }
  } else {
    for (let x = x0; x < x1; x += 2) {
      const y = cableY(pts, x);
      g.rect(x, Math.round(y) - 2, 2, 4, P.ink0);
      g.rect(x, Math.round(y) - 1, 2, 2, (x >> 1) % 2 ? P.verd3 : P.verd2);
    }
  }
  // The handshake riding the carrier ahead of the tender (beads per stage).
  if (hop > 0 && hop < 1) {
    const stage = hop < 1 / 3 ? "hello" : hop < 2 / 3 ? "hear" : "hearhear";
    const bx = x1 - 120 + ((t * 40) % 110);
    if (!g.anim("fx", `handshake-${stage}`, t, Math.round(bx), Math.round(cableY(pts, bx)))) {
      const n = stage === "hello" ? 1 : stage === "hear" ? 2 : 3;
      for (let i = 0; i < n; i++) glow(g, bx + i * 6, cableY(pts, bx + i * 6), 2, P.amber1, 0.8);
    }
  } else if (hop >= 1) g.anim("fx", "handshake-complete", t, Math.round(x1 - 60), Math.round(cableY(pts, x1 - 60)));
}

function drawAdjuncts(g: Gfx, sim: Sim, v: ShipView) {
  const E = sim.ships[1];
  for (const a of E.adjuncts) {
    if (!a.active) continue;
    const [x, y] = toScreen(v, a.x, a.y);
    const img = art(`ships/${a.kind}`);
    const alpha = a.alive ? 1 : 0.25;
    if (img) g.image(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2), 1, alpha);
    else {
      g.alpha(alpha, () => {
        const col = a.kind === "gate-warden" ? P.brass3 : P.ink3;
        g.rect(Math.round(x) - 14, Math.round(y) - 10, 28, 20, P.ink0);
        g.rect(Math.round(x) - 13, Math.round(y) - 9, 26, 18, col);
        g.rect(Math.round(x) - 13, Math.round(y) - 9, 26, 2, a.kind === "gate-warden" ? P.brass1 : P.ember3);
        g.rect(Math.round(x) - 3, Math.round(y) - 3, 6, 6, P.ink0);
        g.rect(Math.round(x) - 2, Math.round(y) - 2, 4, 4, a.kind === "gate-warden" ? P.amber1 : P.ember2);
      });
    }
    if (a.alive) {
      glow(g, x, y, 5, a.kind === "gate-warden" ? P.amber2 : P.ember2, 0.35);
      // Hit points.
      for (let i = 0; i < a.maxHp; i++) g.rect(Math.round(x) - a.maxHp * 2 + i * 4, Math.round(y) + 16, 3, 2, i < a.hp ? P.verd1 : P.ink3);
      if (a.hitT < 0.15) g.alpha(0.6, () => g.circle(Math.round(x), Math.round(y), 14, P.ivory0));
    }
  }
  void usable;
  void effective;
}
