// The combat scene: fixed-step sim under real-time-with-pause, the side-view world (backdrop, carriers, the two
// vessels) seen through two zoomable cameras (★v4), FTL controls, effects/sound from sim events, rich tooltips,
// dialogs (surrender) and the end of the fight.
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { wrap, lineHeight } from "../core/font";
import { P, C } from "../core/palette";
import { art, atlas, density } from "../core/assets";
import { sfx, music, type LoopHandle } from "../core/audio";
import { settings } from "../core/save";
import { hashString } from "../core/rng";
import { drawBackdrop, drawForeground, stageBg } from "../screens/backdrop";
import type { CombatResult, CombatSetup, Inventory, ShipState } from "../game/types";
import { TILE } from "../data/layouts";
import { CARS } from "../data/cars";
import type { SysKey } from "../data/layouts";
import { Sim } from "./sim/sim";
import { DT, type Projectile, type SimEvent, type Target } from "./sim/model";
import { usable, effective } from "./sim/power";
import { wardOutline, wardContact } from "./shield-geometry";
import { disturbWard, contactLayer } from "./shield-surface";
import { GUARDIAN, type GuardianId } from "../content/script";
import { beamRooms, chargeTime } from "./sim/weapons";
import { AutoPlayer } from "./sim/autoplay";
import {
  buildEnemyView, buildPlayerView, fitCamera, fromScreen, toScreen, LAYOUT, type ShipView, carPoint,
  camToScreen, camToWorld, camInRegion, withCamera, zoomAt, resetZoom, panCam, updateCam,
} from "./view";
import {
  drawHull, drawRooms, drawDoors, drawCrew, crewFeet, doorRect, drawWardMesh, drawDrones, drawWeaponAt,
  trolleyCars, drawTrolleys, tenderCarrier, playerHardpoints, wrapWeapons, contentRects,
  mountPositions, muzzle, glow, weaponRect, droneRect, mountHighlight, crewNameTag, CREW_HEAD, type MountPos,
} from "./draw-ship";
import { Fx, drawBeam } from "./fx";
import { drawCarrier, type CarrierRegion } from "./carrier";
import type { SimShip } from "./sim/model";
import type { LampColor } from "../game/ids";
import { drawTopBar, drawEnemyHeader, drawShipBar, drawCrewPanel, drawCommands, SYS_KEYS, DRONE_KEYS, COMMANDS_W, PAUSE_PLATE, type HudState, type BarIntents } from "./hud";
import { enemyText, systemName, speciesName, hazardText } from "./assets";
import { crewTooltip, roomTooltip, doorTooltip, weaponTooltip, droneTooltip } from "./tooltips";

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
  const sim = new Sim(opts.ship, opts.inventory, setup);
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
  wrapWeapons(views[0], sim.ships[0]);
  // The camera frames the guns and the trolley too. Their art may still be loading when the scene opens: refit while
  // their extent changes during the first seconds, unless the player has already zoomed or panned.
  let fitKey = "";
  const refit = () => {
    const c = views[0].cam;
    if (c.z !== c.baseZ || c.tz !== c.baseZ || c.x !== c.baseX || c.y !== c.baseY) return;
    const { warded, bare } = contentRects(views[0], sim.ships[0]);
    const key = JSON.stringify([warded, bare]);
    if (key === fitKey) return;
    fitKey = key;
    fitCamera(views[0], sim.ships[0], warded, bare);
  };
  refit();
  const fx = new Fx();
  const hs: HudState = { selected: new Set(), weaponSel: -1, paused: !!settings.autoPause?.onArrive && !opts.warp, hoverCrew: -1 };
  const text = enemyText(setup.enemy);
  const log: LogLine[] = [];
  const bgVariant = hashString(`${setup.seed}`) % 8;
  let acc = 0;
  let ended = false;
  let endShown = 0;
  let realT = 0;
  let introT = 0;
  let historyOpen = false;
  let historyPage = 0;
  let departureOpen = false;
  let drag: { x: number; y: number } | null = null;
  let beamDrag: { i: number; x0: number; y0: number } | null = null;
  let middleDrag: { x: number; y: number; cam: 0 | 1 } | null = null;
  let middleAt = -10;
  let rdrag: { x: number; y: number; cam: 0 | 1; moved: boolean } | null = null;
  let fireLoop: LoopHandle | null = null;
  /** Sheave frames turned so far by each side's drive trolley (separately painted trolleys only). */
  const sheave: [number, number] = [0, 0];

  const say = (t: string, color: string = C.text) => {
    log.push({ text: t, t: sim.t, color });
    if (log.length > 120) log.shift();
  };
  const guardian = GUARDIAN[setup.enemy as GuardianId];
  const openingHail = [setup.intro, ...(guardian?.handshake.map(b => b.text) ?? [text.handshake]), ...(guardian?.start.map(b => b.text) ?? [])].filter(Boolean).join("\n");
  say(openingHail, C.text);
  hs.requestDeparture = () => { departureOpen = true; };


  // Hardpoints in consist order → mount world positions.
  const playerMounts = (): MountPos[] => mountPositions(sim.ships[0], views[0], playerHardpoints(views[0]));
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
  const shieldPoint = (side: 0 | 1, start: [number, number], end: [number, number]): [number, number] => {
    const v = views[side];
    return wardContact(wardOutline(v, contactLayer(sim.ships[side])).map(p => camToScreen(v.cam, ...p)), start, end);
  };
  const projEnd = (p: Projectile): [number, number] => {
    const end = camToScreen(views[p.to].cam, ...toScreen(views[p.to], p.px, p.py));
    const target = sim.ships[p.to], barrier = target.boss.gate?.up || target.boss.glass?.up;
    return p.target.kind !== "adj" && (barrier || p.kind !== "payload" && p.kind !== "crawler" && target.shields > 0)
      ? shieldPoint(p.to, fx.projectileStart(p, projStart), end) : end;
  };

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
        if (e.projectile) {
          const p = e.projectile, start = fx.projectileStart(p, projStart), end = projEnd(p);
          const length = Math.hypot(end[0] - start[0], end[1] - start[1]) || 1;
          fx.cam = -1;
          fx.add({ kind: "ghost", x: end[0], y: end[1] - 18, vx: (end[0] - start[0]) / length * 320, vy: (end[1] - start[1]) / length * 320 - 35, life: .45, proj: p.color });
          fx.cam = e.side ?? 0;
        }
        sfx.play("miss", { pan, volume: 0.6 });
        fx.add({ kind: "text", x, y: y - 10, text: "miss", life: 0.9, color: P.steel2 });
        break;
      }
      case "shield-hit": {
        const side = e.side ?? 0, v = views[side];
        const target = camToScreen(v.cam, ...shipPoint(e));
        const start: [number, number] = e.projectile ? fx.projectileStart(e.projectile, projStart) : [side ? 0 : 960, target[1]];
        const contact = shieldPoint(side, start, target);
        const [x, y] = camToWorld(v.cam, ...contact);
        disturbWard(v, sim.ships[side], sim.t, x, y, e.kind === "ion");
        fx.ripple(x, y, e.kind === "ion" ? P.violet1 : P.teal1, e.side === 1);
        fx.sparks(x, y, 4, e.kind === "ion" ? P.violet1 : P.teal1);
        if (sim.ships[side].shields === 0) {
          fx.add({ kind: "text", x: x + (side === 0 ? -34 : 34), y: y - 14, life: 1, text: "MESH EXPOSED", color: P.ember1 });
          sfx.play("shield-down", { pan, volume: .5 });
        }
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
      case "boarding-launch":
        say(`Grapple approaching ${roomName(0, e.room)}: 4 seconds. Disable the enemy Brood to cut the crossing.`, C.warn);
        sfx.play("boarders", { volume: .6 });
        if (settings.autoPause?.onBoarders) hs.paused = true;
        break;
      case "boarding-cut":
        say("The grapple releases. The boarding party cannot cross.", C.good);
        sfx.play("door-close", { volume: .6 });
        break;
      case "boarders": {
        sfx.play("breach");
        sfx.play("boarders", { volume: .8 });
        const S = sim.ships[0], r = S.rooms[e.room ?? 0];
        const [x, y] = toScreen(views[0], r.x + .5, r.y + .5);
        fx.sparks(x, y, 8, P.steel1);
        say(`Boarders breached the ${roomName(0, e.room)}. Close internal doors and move defenders.`, C.bad);
        if (settings.autoPause?.onBoarders) hs.paused = true;
        break;
      }
      case "crawler-in":
        sfx.play("breach", { pan });
        if (e.side === 1) say("The crawler has attached and cut its way aboard.", C.good);
        break;
      case "shield-up":
        sfx.play("shield-up", { pan, volume: .3, throttle: .3 });
        break;
      case "shield-bypass":
        say("Payload passes through the ward mesh.", C.textDim);
        break;
      case "robot-repair":
        say(`Repair arm restores ${roomName(1, e.room)}. Disable its controller to stop repairs.`, C.warn);
        break;
      case "duty-acknowledge":
        say("Duty mechanism stopped. Keep it disabled while the helm acknowledges.", P.teal1);
        break;
      case "choir-channel":
        say("The held channel opens the glass. The bells can no longer drown it out.", P.violet0);
        sfx.play("shield-down", { pan: .5 });
        break;
      case "delivery-ready":
        hs.weaponSel = -1;
        say("Isolation machinery stopped. The archive is safe. Complete the greeting to deliver the messages.", P.teal1);
        sfx.play("hop-ready");
        break;
      case "delivery-connected":
        say("I hear you hear me. First message: DELIVERED.", P.amber1);
        sfx.play("hop");
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
        const v = views[e.side ?? 1], target = shipPoint(e);
        const [x, y] = wardContact(wardOutline(v, contactLayer(sim.ships[e.side ?? 1])), [v.bx - 100, target[1]], target);
        disturbWard(v, sim.ships[e.side ?? 1], sim.t, x, y);
        fx.sparks(x, y, 5, P.brass1);
        sfx.play("shield-hit", { rate: 0.8, pan });
        say(e.n === 1 ? "The gate holds: one attack source registered." : "The gate holds.", P.brass1);
        break;
      }
      case "gate-open": {
        const v = views[1];
        for (let i = 0; i < 24; i++) fx.add({ kind: "shard", x: v.bx + fx.rnd() * v.bw, y: v.by + fx.rnd() * v.bh, vx: (fx.rnd() - 0.5) * 60, vy: -fx.rnd() * 40, life: 1, color: P.brass1 });
        sfx.play("shield-down");
        say("Two independent attack sources. The gate interlock opens.", P.amber1);
        break;
      }
      case "gate-up":
        sfx.play("shield-up");
        say("The gate seals again.", P.brass2);
        break;
      case "glass-ring": {
        const v = views[e.side ?? 1], target = shipPoint(e);
        const [x, y] = wardContact(wardOutline(v, contactLayer(sim.ships[e.side ?? 1])), [v.bx - 100, target[1]], target);
        disturbWard(v, sim.ships[e.side ?? 1], sim.t, x, y, true);
        sfx.play("glass-bell", { volume: 0.6, rate: 0.9 + 0.1 * (e.n ?? 1) });
        break;
      }
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
        for (const beat of guardian?.[e.n === 2 ? "half" : "final"] ?? []) say(beat.text, P.ember1);
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
        say(e.kind === "gate-warden" ? "A gate warden folds back into the gate." : "A sealing drone falls silent.", C.good);
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
      sfx.play(sim.resolution === "destroyed" ? "ship-destroyed" : "power-down");
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

  const modal = () => historyOpen || departureOpen || sim.deliveryReady && !sim.outcome || !!sim.surrender?.pending || (!!sim.outcome && endShown > 0);

  function update(dt: number) {
    realT += dt;
    if (realT < 3) refit();
    if (!hs.paused && !modal()) introT += dt;
    if (sim.outcome || !hs.paused && !modal()) {
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
    // The drive trolley's sheaves turn while its motors run: faster while it spools the handshake.
    if (!settings.reducedMotion && !hs.paused && !modal()) for (const side of [0, 1] as const) {
      const S = sim.ships[side];
      if (effective(S.sys.engines) > 0 && !S.dead) sheave[side] += dt * (S.hop > 0 && S.hop < 1 ? 12 : 6);
    }
    fx.cam = -1;
    fx.update(hs.paused && !sim.outcome || modal() ? 0 : dt);
    updateCam(views[0].cam, dt);
    updateCam(views[1].cam, dt);
    // Vessel motion: gentle sway on the carrier, fliers bob, installations stand.
    const t = settings.reducedMotion ? 0 : sim.t;
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
    if (!settings.reducedMotion && sim.resolution === "destroyed" && E.mobility !== "installation") EV.dy += Math.round(Math.max(0, E.deadT - .2) ** 2 * 30);
    if (!settings.reducedMotion && sim.outcome === "escaped") EV.dx += Math.round(sim.outcomeT ** 2 * 260);
    if (!settings.reducedMotion && sim.outcome === "fled") PV.dx += Math.round(sim.outcomeT ** 2 * 420);
    if (sim.resolution === "destroyed" && !settings.reducedMotion && E.deadT < 3 && fx.rnd() < 0.15) {
      fx.cam = 1;
      fx.sparks(EV.bx + fx.rnd() * EV.bw, EV.by + fx.rnd() * EV.bh, 3, P.amber1);
      if (fx.rnd() < 0.3) fx.add({ kind: "smoke", x: EV.bx + fx.rnd() * EV.bw, y: EV.by + EV.bh * 0.5, vx: 0, vy: -12, life: 2, size: 4, color: P.ink4 });
      fx.cam = -1;
    }
    // Trolley sparks on the carrier now and then.
    if (!sim.outcome && !settings.reducedMotion && !hs.paused && !modal() && fx.rnd() < dt * 0.25) {
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
    if (fireLoop) fireLoop.setVolume(sim.deliveryReady || sim.outcome || hs.paused || modal() ? 0 : Math.min(0.7, fires * 0.12));
    if (!fires && fireLoop) {
      fireLoop.stop();
      fireLoop = null;
    }
    // End of the fight.
    if (sim.outcome && !ended) {
      const o = sim.outcome;
      const wait = o === "fled" ? 1.3 : o === "victory" ? 1.2 : o === "defeat" ? 2.6 : 0.6;
      if (o !== "defeat" && sim.outcomeT >= wait) finish();
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

  // The world regions never sit under a HUD panel except the small PAUSED plate at the top of the screen.
  const inHud = (mx: number, my: number) =>
    my >= LAYOUT.crew.y - 2 || my < LAYOUT.topY + LAYOUT.topH ||
    (hs.paused && mx >= PAUSE_PLATE.x && mx < PAUSE_PLATE.x + PAUSE_PLATE.w && my < PAUSE_PLATE.y + PAUSE_PLATE.h);

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
      const d = Math.abs(w[0] - fx0) + Math.abs(w[1] - (fy0 - 12)) * 0.6;
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

  /** A weapon on either hull or a drone in flight under the pointer: its tooltip and world rectangle. */
  let hoverMount: { side: 0 | 1; rect: [number, number, number, number] } | null = null;
  let tagUid = -1;
  function mountUnder(): { tip: string; side: 0 | 1; rect: [number, number, number, number] } | null {
    const inside = (p: [number, number], r: [number, number, number, number]) => p[0] >= r[0] && p[1] >= r[1] && p[0] < r[0] + r[2] && p[1] < r[1] + r[3];
    for (const side of [0, 1] as const) {
      const w = worldMouse(side);
      if (!w) continue;
      for (const owner of [0, 1] as const) for (const d of sim.ships[owner].drones) {
        if (!d.out || d.at !== side || d.def.kind === "boarding") continue;
        const r = droneRect(d, views[side]);
        if (inside(w, r)) return { tip: droneTooltip(sim, d), side, rect: r };
      }
      const S = sim.ships[side];
      const mounts = side === 0 ? playerMounts() : enemyMounts();
      for (let i = 0; i < S.weapons.length; i++) {
        const wpn = S.weapons[i];
        const m = side === 0 ? mounts[wpn.slot] : mounts[i];
        if (!m) continue;
        const r = weaponRect(wpn, m, side === 0 ? 1 : -1);
        if (inside(w, r)) return { tip: weaponTooltip(sim, wpn, side, "combat", side === 0 ? `mount ${wpn.slot + 1}${m.belly ? ", belly" : ", roof"}` : "hostile mount"), side, rect: r };
      }
    }
    return null;
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
    const mount = mountUnder();
    hoverMount = mount ? { side: mount.side, rect: mount.rect } : null;
    const own = crewUnder(0, 0);
    const other = own < 0 ? crewUnder(0, 1) : -1;
    const enemyCrew = crewUnder(1, -1);
    hs.hoverCrew = own >= 0 ? own : hs.hoverCrew;
    tagUid = own >= 0 ? own : other >= 0 ? other : enemyCrew;
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
    } else if (mount) ui.setTooltip(mount.tip, 300);
    else if (hoverDoor >= 0) ui.setTooltip(doorTooltip(sim, P0.doors[hoverDoor]), 260);
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
    for (let i = 0; i < Math.min(DRONE_KEYS.length, sim.droneSlots()); i++) {
      if (input.keyPressed(DRONE_KEYS[i])) sim.setDronePower(i, !input.shift && !P0.drones.find((d) => d.slot === i)?.powered);
    }
    for (const [id, key] of Object.entries(SYS_KEYS) as [SysKey, string][]) {
      if (input.keyPressed(key)) {
        if (input.shift) sim.removePower(id);
        else sim.addPower(id);
      }
    }
    if (input.keyPressed("KeyR") && input.keyShifted("KeyR")) sim.saveStations();
    for (let i = 0; i < Math.min(12, sim.playerCrew().length); i++) {
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
    const [sxo, syo] = fx.shakeOffset(settings.screenShake !== false && !settings.reducedMotion, realT);
    const ctx = g.ctx;
    ctx.save();
    ctx.translate(sxo, syo);
    drawBackdrop(g, stageBg(setup.stage, bgVariant, { hazard: setup.hazard, id: setup.seed }), { kind: "carrier", stage: setup.stage, seed: setup.seed, time: sim.t, hazard: setup.hazard, context: "combat", variant: bgVariant, state: "danger" });
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
      hullOnCarrier(g, sim, E, views[1], undefined, sheave[1]);
      E.weapons.forEach((w, i) => em[i] && drawWeaponAt(g, sim, w, em[i], -1, sim.seeEnemyCharge()));
      if (hoverMount?.side === 1) mountHighlight(g, hoverMount.rect, P.ember1);
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
      fx.draw(g, "back", 0);
      hullOnCarrier(g, sim, P0, views[0], lamp, sheave[0]);
      P0.weapons.forEach((w) => pm[w.slot] && drawWeaponAt(g, sim, w, pm[w.slot], 1, true));
      if (hoverMount?.side === 0) mountHighlight(g, hoverMount.rect, P.teal1);
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
    drawBoarding(g);
    drawShutdown(g);
    fx.drawProjectiles(g, sim, projStart, projEnd);
    for (const b of sim.beams) {
      const mw = muzzleWorld(b.from, b.slot) ?? toScreen(views[b.from], 0, 0);
      const mz = camToScreen(views[b.from].cam, mw[0], mw[1]);
      let from = camToScreen(views[b.to].cam, ...toScreen(views[b.to], b.x0, b.y0));
      let cur = camToScreen(views[b.to].cam, ...toScreen(views[b.to], b.cx, b.cy));
      if (b.blocked) { from = shieldPoint(b.to, mz, from); cur = shieldPoint(b.to, mz, cur); }
      drawBeam(g, b, mz, from, cur, sim.t);
    }
    fx.draw(g, "back", -1);
    fx.draw(g, "front", -1);
    ctx.restore();
    drawForeground(g, setup.stage, setup.hazard, sim.t, settings.reducedMotion);
    zoomBadges(g);
    // Name tag over the hovered crew member (from the world or the roster), in screen space so it stays crisp.
    const tagged = sim.crew.find((c) => c.uid === (tagUid >= 0 ? tagUid : hs.hoverCrew));
    if (tagged && !tagged.dead && !modal()) {
      const [hx, hy] = crewFeet(sim.ships[tagged.ship], views[tagged.ship], tagged);
      const [sx, sy] = camToScreen(views[tagged.ship].cam, hx, hy - CREW_HEAD - 4);
      crewNameTag(g, tagged.kind === "crew" ? tagged.name : speciesName(tagged.species), sx, sy, tagged.side === 0 ? P.ivory0 : P.ember1);
    }

    // Overlays own input; underlying controls stay visible without receiving clicks or hotkeys.
    const inputEnabled = app.input.enabled;
    if (modal()) app.input.enabled = false;
    // HUD (never zoomed).
    hs.hoverCrew = -1;
    drawTopBar(g, app, sim, hs);
    drawEnemyHeader(g, app, sim);
    applyBar(drawShipBar(g, app, sim, hs, { mode: "combat", commandsW: COMMANDS_W }));
    drawCommands(g, app, sim, hs);
    const clicked = drawCrewPanel(g, app, sim, hs.selected, LAYOUT.crew, {
      hint: "F1–F" + Math.min(12, sim.playerCrew().length) + " select · right-click a room to send",
      onHover: (uid) => { hs.hoverCrew = uid; },
    });
    if (clicked !== null) {
      if (!app.input.shift) hs.selected.clear();
      hs.selected.add(clicked);
      sfx.play("crew-select", { volume: 0.6 });
    }
    drawComms(g);
    if (!modal() && !sim.outcome) {
      hotkeys();
      cameraInput();
      worldInput(g);
    } else {
      cameraInput();
      if (!sim.outcome && app.input.keyPressed("Space") && !sim.surrender?.pending) hs.paused = !hs.paused;
    }
    if (!app.input.isDown(2)) rdrag = null;
    if (modal() || sim.outcome) { hoverMount = null; tagUid = -1; }
    app.input.enabled = inputEnabled;
    drawReading(g);
    drawDeparture(g);
    drawDelivery(g);
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

  /** Apply what the ship bar asked for to the live fight. */
  function applyBar(a: BarIntents) {
    const P0 = sim.ships[0];
    if (a.veil) sim.activateVeil();
    else if (a.addPower) sim.addPower(a.addPower);
    if (a.removePower) sim.removePower(a.removePower);
    if (a.weaponClick !== undefined) selectWeapon(a.weaponClick);
    if (a.weaponRight !== undefined) {
      const w = P0.weapons.find((q) => q.slot === a.weaponRight);
      if (w) {
        if (w.target) sim.setTarget(P0.weapons.indexOf(w), null);
        else sim.setWeaponPower(P0.weapons.indexOf(w), false);
      }
      if (hs.weaponSel === a.weaponRight) hs.weaponSel = -1;
    }
    if (a.droneClick !== undefined) sim.setDronePower(a.droneClick, true);
    if (a.droneRight !== undefined) sim.setDronePower(a.droneRight, false);
  }

  /** Comms: hails and the running combat log, docked under the enemy so it never covers a vessel. The newest line
   *  sits at the bottom; B opens the full history. */
  function drawComms(g: Gfx) {
    const R = LAYOUT.comms;
    const ui = app.ui;
    g.panel(R.x, R.y, R.w, R.h, "panel-dark");
    g.text("COMMS", R.x + 8, R.y + 4, { font: "label", color: C.textDim });
    const bw = 84;
    if (sim.setup.hazard) {
      const hz = hazardText(sim.setup.hazard);
      const hx = R.x + 54;
      g.text(hz.name.toUpperCase(), hx, R.y + 4, { font: "small", color: P.amber2, width: R.w - (hx - R.x) - bw - 16, maxLines: 1 });
      if (ui.hover(hx - 2, R.y + 2, 150, 11)) ui.setTooltip(`{title}${hz.name}{/}\n{dim}${hz.desc || ""}{/}`, 260);
    }
    if (!modal() && ui.button("combat-log", R.x + R.w - bw - 6, R.y + 3, bw, 12, "HISTORY · B", { font: "small", hotkey: "KeyB", tooltip: "Every hail and report of this fight. Reading pauses the fight." })) {
      historyOpen = true;
      historyPage = 0;
    }
    const width = R.w - 16;
    const lh = lineHeight("small");
    const top = R.y + 17;
    const max = Math.max(1, Math.floor((R.y + R.h - 3 - top) / lh));
    const lines: { text: string; color: string; alpha: number }[] = [];
    for (let i = log.length - 1; i >= 0 && lines.length < max; i--) {
      const l = log[i];
      let wrapped = wrap(l.text, width, "small");
      const room = max - lines.length;
      if (wrapped.length > room) {
        if (lines.length) break;
        wrapped = [...wrapped.slice(0, room - 1), "{faint}… the rest is in HISTORY (B){/}"];
      }
      const age = sim.t - l.t;
      const alpha = i === log.length - 1 ? 1 : age > 20 ? 0.55 : 0.8;
      for (let k = wrapped.length - 1; k >= 0; k--) lines.unshift({ text: wrapped[k], color: l.color, alpha });
    }
    const opening = log.length === 1;
    const reveal = !opening || settings.textSpeed === "instant" || hs.paused ? 1 : Math.min(1, introT / (settings.textSpeed === "fast" ? 1 : 2.5));
    lines.forEach((l, k) => g.text(l.text, R.x + 8, top + k * lh, { font: "small", color: l.color, alpha: l.alpha, reveal: opening ? reveal : undefined }));
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

  function drawReading(g: Gfx) {
    if (!historyOpen) return;
    g.dim(.7); g.panel(190, 75, 580, 390, "dialog");
    g.text("HAIL & COMBAT HISTORY · PAUSED", 208, 91, { font: "labelb", color: P.brass1 });
    const lines = log.slice().reverse().flatMap(l => [...wrap(`${Math.floor(l.t)}s  ${l.text}`, 542, "body").map(text => ({ text, color: l.color })), { text: "", color: l.color }]);
    const row = lineHeight("body"), pageSize = Math.floor(300 / row), pages = Math.max(1, Math.ceil(lines.length / pageSize));
    historyPage = Math.min(historyPage, pages - 1);
    lines.slice(historyPage * pageSize, (historyPage + 1) * pageSize).forEach((l, i) => {
      g.text(l.text, 208, 119 + i * row, { font: "body", color: l.color });
    });
    g.text(`${historyPage + 1}/${pages}`, 486, 437, { font: "small", color: C.textDim, align: "center" });
    if (app.ui.button("log-older", 208, 433, 96, 22, "Older", { disabled: historyPage >= pages - 1 })) historyPage++;
    if (app.ui.button("log-newer", 312, 433, 96, 22, "Newer", { disabled: historyPage <= 0 })) historyPage--;
    if (app.ui.button("log-close", 628, 433, 124, 22, "Return", { hotkey: "Escape", variant: "blue" })) historyOpen = false;
  }

  function drawDeparture(g: Gfx) {
    if (!departureOpen) return;
    const routes = sim.setup.retreatOptions ?? (sim.setup.retreat ? [sim.setup.retreat] : []);
    const h = 104 + routes.length * 34, y = Math.max(64, (540 - h) / 2);
    g.dim(.65); g.panel(260, y, 440, h, "dialog");
    g.text("CHOOSE DEPARTURE · PAUSED", 276, y + 13, { font: "labelb", color: P.brass1 });
    g.text("Leave this fight. Spend the shown TTL. The Seal advances once.", 276, y + 33, { font: "small", width: 408 });
    routes.forEach((r, i) => {
      if (app.ui.button(`depart-${r.to}`, 276, y + 55 + i * 34, 408, 28, `${r.name} · ${r.cost} TTL${"sealed" in r && r.sealed ? " · SEALED ARRIVAL" : ""}`, { font: "small", disabled: !sim.hopReady(r.to), variant: "blue" })) {
        sim.hop(r.to); departureOpen = false;
      }
    });
    if (app.ui.button("depart-cancel", 420, y + h - 31, 120, 23, "Stay", { hotkey: "Escape" })) departureOpen = false;
  }

  function drawDelivery(g: Gfx) {
    if (!sim.deliveryReady || sim.outcome) return;
    g.dim(.55); g.panel(230, 171, 500, 186, "dialog");
    g.text("THE ISOLATION SHELL IS OPEN", 480, 188, { font: "head", color: P.teal1, align: "center" });
    g.text("The archive lights are still on. The machinery has stopped and the route is safe. Send the final greeting so the waiting messages can leave.", 254, 225, { width: 452 });
    if (app.ui.button("deliver", 328, 314, 304, 28, "I HEAR YOU HEAR ME · DELIVER", { font: "label", variant: "blue", hotkey: "Enter" })) sim.deliver();
  }

  function drawBoarding(g: Gfx) {
    for (const b of sim.boarding) {
      const E = sim.ships[1], P0 = sim.ships[0], brood = E.rooms[E.sys.brood!.room];
      const start = camToScreen(views[1].cam, ...toScreen(views[1], brood.x + .5, brood.y + .5));
      const end = camToScreen(views[0].cam, ...toScreen(views[0], b.tile % P0.cols + .5, Math.floor(b.tile / P0.cols) + .5));
      g.line(...start, ...end, P.steel2);
      const f = b.elapsed / b.duration, x = start[0] + (end[0] - start[0]) * f, y = start[1] + (end[1] - start[1]) * f;
      g.rect(x - 4, y - 3, 8, 6, P.ember2); g.box(end[0] - 9, end[1] - 9, 18, 18, P.ember1);
      g.text(`BOARDING ${(b.duration - b.elapsed).toFixed(1)}s · ${P0.rooms[b.room].name}`, end[0], end[1] - 22, { font: "small", color: P.ember1, align: "center", shadow: P.ink0 });
    }
  }

  function drawShutdown(g: Gfx) {
    const released = sim.resolution === "released" || sim.resolution === "delivered" || sim.deliveryReady;
    if (!released) return;
    const v = views[1], E = sim.ships[1], f = Math.min(1, sim.outcomeT / 1.2);
    const center = camToScreen(v.cam, ...toScreen(v, E.cols / 2, E.rows / 2));
    const x = center[0], y = center[1];
    const offset = settings.reducedMotion ? 14 : 3 + f * 22;
    if (E.boss.gate) {
      // Heavy interlock leaves part, then their two independent receipt lamps hold.
      for (const sign of [-1, 1]) {
        g.box(x + sign * offset - 9, y - 38, 18, 76, P.brass2);
        g.line(x + sign * offset, y - 33, x + sign * offset, y + 33, P.brass1, 3);
        g.circle(x + sign * offset, y - 28, 3, P.teal1, true);
      }
    } else if (E.boss.glass) {
      // The panes fold outward; individual stored lights leave through the opening.
      for (let i = 0; i < 3; i++) {
        const cy = y - 28 + i * 28;
        for (const sign of [-1, 1]) {
          g.line(x + sign * offset, cy - 11, x + sign * (offset + 10), cy, P.violet1, 2);
          g.line(x + sign * (offset + 10), cy, x + sign * offset, cy + 11, P.violet1, 2);
        }
        g.circle(x + 28 + f * 48 + i * 11, cy, 2, P.ivory1, true);
      }
    } else if (E.boss.core) {
      // The isolation rings separate around the archive, which remains lit.
      for (const sign of [-1, 1]) for (let i = 0; i < 14; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 14, b = -Math.PI / 2 + (i + 1) * Math.PI / 14;
        g.line(x + sign * (offset + Math.cos(a) * 32), y + Math.sin(a) * 48, x + sign * (offset + Math.cos(b) * 32), y + Math.sin(b) * 48, P.teal2, 2);
      }
      for (let i = 0; i < 6; i++) g.circle(x - 12 + i % 3 * 12, y - 8 + Math.floor(i / 3) * 16, 2, P.amber1, true);
      if (sim.resolution === "delivered") for (let i = 0; i < 5; i++) g.circle(x - 40 - i * 13 - f * 32, y - 16 + i * 8, 2, P.amber1, true);
    } else {
      // A released working clamp retracts and retains its standby lamp.
      for (const sign of [-1, 1]) {
        g.line(x + sign * offset, y - 20, x + sign * offset, y + 20, P.brass1, 3);
        g.line(x + sign * offset, y + 20, x + sign * (offset - 8), y + 20, P.brass1, 3);
      }
      g.circle(x, y, 4, P.teal1, true);
    }
    g.text(sim.resolution === "delivered" ? "DELIVERED" : E.boss.gate ? "GATE RELEASED" : E.boss.glass ? "VOICES RELEASED" : sim.deliveryReady ? "ARCHIVE SAFE" : "DUTY RELEASED", x, y + 55, { font: "labelb", color: P.teal1, align: "center", shadow: P.ink0 });
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
    if (o !== "defeat" || endShown <= 0) return;
    const ui = app.ui;
    const a = Math.min(1, endShown * 2);
    g.alpha(a, () => {
      const w = 430;
      const h = 124;
      const x = 480 - w / 2;
      const y = 190;
      g.panel(x, y, w, h, "panel-danger");
      const body = sim.ships[0].hull <= 0 ? "The tender breaks from its carrier." : "Nobody is left aboard to answer.";
      g.text("THE LINE GOES QUIET", 480, y + 12, { font: "head", color: P.ember1, align: "center" });
      g.text(body, 480, y + 44, { color: C.text, align: "center", width: w - 40, reveal: settings.textSpeed === "instant" ? 1 : Math.min(1, endShown / (settings.textSpeed === "fast" ? .7 : 2)) });
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

/** The carrier across a camera's whole region (the shared renderer in carrier.ts): the player's consist hangs from
 *  it by every car's grip; a crawler rides its own. The handshake's beads travel ahead of the tender. */
function drawCarrierFor(g: Gfx, sim: Sim, v: ShipView, side: 0 | 1) {
  const xl = Math.floor(camToWorld(v.cam, v.cam.rx, 0)[0]) - 12;
  const xr = Math.ceil(camToWorld(v.cam, v.cam.rx + v.cam.rw, 0)[0]) + 12;
  if (side === 1 && sim.ships[1].mobility !== "crawler") return;
  // Taut around the hanging vessel: it never dips below its grips, so roof guns keep their clear air.
  const line = tenderCarrier(v, xl, xr, side === 0 ? [18, 12] : [14, 12]);
  if (!line) return;
  const { pts, yAt } = line;
  drawCarrier(g, yAt, pts[0][0], pts[pts.length - 1][0], sim.setup.stage as CarrierRegion, 0, pts.join(";"));
  if (side === 0) handshakeBeads(g, yAt, pts[pts.length - 1][0], sim.t, sim.ships[0].hop);
}

/** The handshake riding the carrier ahead of the tender (beads per stage). */
function handshakeBeads(g: Gfx, yAt: (x: number) => number, x1: number, t: number, hop: number) {
  if (hop > 0 && hop < 1) {
    const stage = hop < 1 / 3 ? "hello" : hop < 2 / 3 ? "hear" : "hearhear";
    const bx = x1 - 120 + ((t * 40) % 110);
    if (!g.anim("fx", `handshake-${stage}`, t, Math.round(bx), Math.round(yAt(bx)))) {
      const n = stage === "hello" ? 1 : stage === "hear" ? 2 : 3;
      for (let i = 0; i < n; i++) glow(g, bx + i * 6, yAt(bx + i * 6), 2, P.amber1, 0.8);
    }
  } else if (hop >= 1) g.anim("fx", "handshake-complete", t, Math.round(x1 - 60), Math.round(yAt(x1 - 60)));
}

/** Hull, then (with separately painted trolleys) trolley back, carrier, trolley front; otherwise carrier then hull
 *  with its baked trolley. */
function hullOnCarrier(g: Gfx, sim: Sim, ship: SimShip, v: ShipView, lamp: LampColor | undefined, sheave: number) {
  if (trolleyCars(v).length) {
    drawHull(g, sim, ship, v, lamp);
    drawTrolleys(g, v, "back", sheave);
    drawCarrierFor(g, sim, v, ship.side);
    drawTrolleys(g, v, "front", sheave);
  } else {
    drawCarrierFor(g, sim, v, ship.side);
    drawHull(g, sim, ship, v, lamp);
  }
}

function drawAdjuncts(g: Gfx, sim: Sim, v: ShipView) {
  const E = sim.ships[1];
  for (const a of E.adjuncts) {
    if (!a.active) continue;
    const [x, y] = toScreen(v, a.x, a.y);
    const img = art(`ships/${a.kind}`);
    const alpha = a.alive ? 1 : 0.25;
    if (img) g.image(img, Math.round(x - img.width / density(img) / 2), Math.round(y - img.height / density(img) / 2), 1, alpha); // centred at its layout size (A: HD art is density 2)
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
