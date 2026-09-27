// The combat simulation: a deterministic fixed-step FTL fight between the player's tender (a consist of cars) and
// one enemy. Pure TypeScript, no DOM. The scene feeds commands and reads state + events; tests and the headless
// balance runner drive it directly.
import { Rng } from "../../core/rng.ts";
import type { CombatResult, CrewMember, Inventory, Reward, ShipState } from "../../game/types.ts";
import type { SpeciesId } from "../../game/ids.ts";
import { scaleEnemy, type ScaledEnemy } from "../../data/enemies.ts";
import { rollReward, surrenderOffer } from "../../data/rewards.ts";
import { FALLBACK_NAMES } from "../../data/ship.ts";
import { normalizeShip } from "../../data/consist.ts";
import { TUNING } from "../../data/systems.ts";
import type { SysKey } from "../../data/layouts.ts";
import {
  DT, other, type BeamShot, type CombatStats, type Projectile, type SimCrew, type SimDrone, type SimEvent,
  type SimSetup, type SimShip, type Side, type Target,
} from "./model.ts";
import { buildEnemyShip, buildPlayerShip } from "./build.ts";
import {
  addPower, removePower, powerWeapon, unpowerWeapon, powerDrone, updateSystems, shieldMax, effective, usable,
  manner, syncBayPower, clampPower,
} from "./power.ts";
import { updateCrew, orderMove, makeCrewFromMember, makeHumanCrew, makeEscort, makeCrawler, freeTileIn } from "./crew.ts";
import { updateEnv, doorMaxHp, startBreach } from "./env.ts";
import { updateWeapons, updateProjectiles, updateBeams, chargeTime, targetValid } from "./weapons.ts";
import { updateDrones, destroyDrone } from "./drones.ts";
import { updateEnemy, updateHazards, specialShield, aiPower } from "./ai.ts";

export type Outcome = "victory" | "defeat" | "fled" | "surrendered" | "escaped";

export class Sim {
  t = 0;
  rng: Rng;
  setup: SimSetup;
  ships: [SimShip, SimShip];
  crew: SimCrew[] = [];
  projectiles: Projectile[] = [];
  beams: BeamShot[] = [];
  events: SimEvent[] = [];
  outcome: Outcome | null = null;
  outcomeT = 0;
  autofire = false;
  stats: CombatStats = { seconds: 0, damageDealt: 0, damageTaken: 0, shotsFired: 0, shotsHit: 0 };
  nextId = 0;
  volleyId = 0;
  hazardT = 6;
  surrender: { reward: Reward; declined: boolean; pending: boolean } | null = null;
  crewLost: { name: string; species: SpeciesId }[] = [];
  swhUsed = false;
  reward: Reward | undefined;
  enemyDef: ScaledEnemy;
  private playerState: ShipState;
  private inventory: Inventory;

  constructor(state: ShipState, inv: Inventory, setup: SimSetup) {
    this.setup = { ...setup };
    this.rng = new Rng((setup.seed >>> 0) ^ 0x5eed);
    this.playerState = normalizeShip(JSON.parse(JSON.stringify(state)) as ShipState);
    this.inventory = { ...inv };
    this.enemyDef = scaleEnemy(setup.enemy, setup.stage, setup.depth);
    const P = buildPlayerShip(this.playerState);
    P.payloads = inv.payloads;
    P.spares = inv.spares;
    const E = buildEnemyShip(this.enemyDef);
    this.ships = [P, E];
    // Crew.
    for (const m of this.playerState.crew) this.placeMember(m);
    this.placeEnemyCrew();
    for (const S of this.ships) for (const d of S.doors) d.hp = doorMaxHp(this, S);
    // Establish station tasks before the first paused frame shows helm and evasion status.
    updateCrew(this, 0);
    // Power up, shields up.
    updateSystems(this, P, 0);
    aiPower(this, E);
    updateSystems(this, E, 0);
    for (const S of this.ships) S.shields = shieldMax(S);
    if (P.augments.includes("startup-config")) for (const w of P.weapons) w.charge = chargeTime(w);
    this.hazardT = 5 + this.rng.next() * 4;
  }

  // ─── setup helpers ────────────────────────────────────────────────────────────────────────────────────────

  private placeMember(m: CrewMember) {
    const P = this.ships[0];
    const location = m.room ?? m.station;
    const want = location ? (location.includes(":") ? location : `lead:${location}`) : "lead:hall";
    let room = P.rooms.find((r) => r.id === want) ?? P.rooms.find((r) => r.id === "lead:hall") ?? P.rooms[0];
    const probe = makeCrewFromMember(m, 0, room.tiles[0], P.cols);
    let tile = freeTileIn(this, P, room.i, probe);
    if (tile < 0) {
      for (const r of P.rooms) {
        tile = freeTileIn(this, P, r.i, probe);
        if (tile >= 0) {
          room = r;
          break;
        }
      }
    }
    if (tile < 0) return;
    const c = makeCrewFromMember(m, 0, tile, P.cols);
    c.stationRoom = P.rooms.find(r => r.id === m.station)?.i ?? room.i;
    this.crew.push(c);
  }

  private placeEnemyCrew() {
    const E = this.ships[1];
    const e = this.enemyDef;
    const put = (c: SimCrew, room: number) => {
      const tile = freeTileIn(this, E, room, c);
      if (tile < 0) return;
      const x = tile % E.cols;
      c.tile = tile;
      c.x = x + 0.5;
      c.y = (tile - x) / E.cols + 0.5;
      c.stationRoom = room;
      this.crew.push(c);
    };
    if (e.crew) {
      const order: SysKey[] = ["helm", "weapons", "shields", "engines", "sensors"];
      e.crew.forEach((sp, i) => {
        const names = FALLBACK_NAMES[sp];
        const c = makeHumanCrew(sp, names[(i * 3 + this.setup.seed) % names.length], 1, 0, E.cols);
        const s = E.sys[order[i % order.length]];
        put(c, s ? s.room : this.rng.pick(E.rooms).i);
      });
    }
    const n = e.escorts ?? 0;
    const sysRooms = E.rooms.filter((r) => r.sys);
    for (let i = 0; i < n; i++) {
      const c = makeEscort(1, 0, E.cols, i + 1);
      const r = sysRooms.length ? sysRooms[(i * 2 + 1) % sysRooms.length] : this.rng.pick(E.rooms);
      put(c, r.i);
    }
  }

  // ─── loop ─────────────────────────────────────────────────────────────────────────────────────────────────

  emit(e: SimEvent) {
    this.events.push(e);
    if (this.events.length > 400) this.events.splice(0, this.events.length - 400);
  }

  /** Drain events (renderer). */
  takeEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  step(dt = DT) {
    if (this.outcome) {
      this.outcomeT += dt;
      for (const S of this.ships) if (S.dead) S.deadT += dt;
      return;
    }
    this.t += dt;
    this.stats.seconds += dt;
    const [P, E] = this.ships;
    updateSystems(this, P, dt);
    updateSystems(this, E, dt);
    updateWeapons(this, P, dt);
    updateWeapons(this, E, dt);
    updateProjectiles(this, dt);
    updateBeams(this, dt);
    updateDrones(this, P, dt);
    updateDrones(this, E, dt);
    updateCrew(this, dt);
    updateEnv(this, P, dt);
    updateEnv(this, E, dt);
    updateEnemy(this, E, dt);
    updateHazards(this, dt);
    P.hitT += dt;
    E.hitT += dt;
    this.checkEnd();
  }

  /** Run for `seconds` of sim time. */
  run(seconds: number) {
    const n = Math.round(seconds / DT);
    for (let i = 0; i < n && !this.outcome; i++) this.step(DT);
  }

  private checkEnd() {
    const [P, E] = this.ships;
    if (P.hull <= 0) {
      P.dead = true;
      this.finish("defeat");
      return;
    }
    const playerCrew = this.crew.filter((c) => c.side === 0 && c.kind === "crew");
    if (playerCrew.length > 0 && playerCrew.every((c) => c.dead)) {
      this.finish("defeat");
      return;
    }
    if (E.hull <= 0) {
      E.hull = 0;
      E.dead = true;
      this.finish("victory");
      return;
    }
    if (E.kind === "human") {
      const ec = this.crew.filter((c) => c.side === 1 && c.kind === "crew");
      if (ec.length && ec.every((c) => c.dead)) {
        E.dead = true;
        this.finish("victory", true);
      }
    }
  }

  finish(o: Outcome, crewKill = false) {
    if (this.outcome) return;
    this.outcome = o;
    this.outcomeT = 0;
    const e = this.enemyDef;
    const salvageMul = this.ships[0].augments.includes("salvage-arm") ? 1.15 : 1;
    if (o === "victory" && !this.setup.noReward) {
      const tier = crewKill && e.reward === "med" ? "high" : e.reward;
      this.reward = rollReward(this.rng, this.setup.stage, this.setup.depth, tier, { salvageMul, forceItem: e.boss });
    } else if (o === "surrendered" && this.surrender) this.reward = this.surrender.reward;
    // Stop everything in flight.
    for (const p of this.projectiles) p.dead = true;
    for (const b of this.beams) b.done = true;
    for (const c of this.crew) if (!c.dead && c.side !== c.ship && o === "victory" && c.side === 1) {
      c.dead = true;
      c.deadT = 0;
    }
    this.emit({ type: "outcome", text: o });
  }

  // ─── callbacks used by the modules ────────────────────────────────────────────────────────────────────────

  crewInRoom(shipSide: Side, room: number, owner: Side): boolean {
    const S = this.ships[shipSide];
    for (const c of this.crew) if (!c.dead && c.ship === shipSide && c.side === owner && S.tileRoom[c.tile] === room) return true;
    return false;
  }

  crewDied(c: SimCrew) {
    this.emit({ type: c.kind === "crew" && c.side === 0 ? "crew-lost" : "crew-stopped", side: c.ship, uid: c.uid, x: c.x, y: c.y });
    if (c.side === 0 && c.kind === "crew") this.crewLost.push({ name: c.name, species: c.species as SpeciesId });
    if (c.kind === "crawler") {
      for (const d of this.ships[c.side].drones) if (d.body === c.uid) {
        d.body = -1;
        d.out = false;
      }
    }
  }

  damageHull(T: SimShip, n: number, from: Side | -1) {
    T.hull -= n;
    if (T.side === 1) this.stats.damageDealt += n;
    else this.stats.damageTaken += n;
    if (T.side === 0 && T.hull <= 0 && T.augments.includes("second-way-home") && !this.swhUsed) {
      const used = this.playerState.swhStage;
      if (used !== this.setup.stage) {
        T.hull = 1;
        this.swhUsed = true;
        this.emit({ type: "second-way-home", side: 0 });
      }
    }
    const core = T.boss.core;
    if (core && core.phase < 3 && T.hull <= 0) T.hull = 1;
    void from;
  }

  specialShield(T: SimShip, source: string, count: number, x: number, y: number): boolean {
    return specialShield(this, T, source, count, x, y);
  }

  crawlerArrives(p: Projectile, T: SimShip, tile: number) {
    const owner = p.from as Side;
    const d = this.ships[owner].drones[(p as { drone?: number }).drone ?? -1];
    startBreach(this, T, tile);
    const c = makeCrawler(owner, T.side, tile, T.cols);
    this.crew.push(c);
    if (d) {
      d.body = c.uid;
      d.at = T.side;
    }
    this.emit({ type: "crawler-in", side: T.side, room: T.tileRoom[tile], uid: c.uid });
  }

  crawlerShot(p: Projectile) {
    const owner = p.from as Side;
    const d = this.ships[owner].drones[(p as { drone?: number }).drone ?? -1];
    if (d) {
      d.out = false;
      d.body = -1;
    }
  }

  droneDepowered(ship: SimShip, d: SimDrone) {
    destroyDrone(this, ship, d, "unpowered");
  }

  offerSurrender() {
    if (this.surrender) return;
    this.surrender = { reward: surrenderOffer(this.rng, this.setup.stage, this.setup.depth), declined: false, pending: true };
    this.emit({ type: "surrender", side: 1 });
  }

  // ─── player commands ──────────────────────────────────────────────────────────────────────────────────────

  addPower(id: SysKey): boolean {
    const ok = addPower(this.ships[0], id);
    this.emit({ type: ok ? "power-up" : "power-denied", side: 0, kind: id });
    return ok;
  }

  removePower(id: SysKey): boolean {
    const ok = removePower(this.ships[0], id);
    if (ok) this.emit({ type: "power-down", side: 0, kind: id });
    return ok;
  }

  /** Toggle a weapon's power (true = power on). */
  setWeaponPower(i: number, on: boolean): boolean {
    const P = this.ships[0];
    const ok = on ? powerWeapon(this, P, i) : unpowerWeapon(P, i);
    this.emit({ type: ok ? (on ? "power-up" : "power-down") : "power-denied", side: 0, kind: "weapons" });
    return ok;
  }

  setTarget(i: number, t: Target | null) {
    const w = this.ships[0].weapons[i];
    if (!w) return;
    if (t && t.kind === "adj" && w.def.type === "beam") return;
    w.target = t;
    if (t) this.emit({ type: "target", side: 0, slot: i });
  }

  setAutofire(on: boolean) {
    this.autofire = on;
  }

  setDronePower(i: number, on: boolean): boolean {
    const P = this.ships[0];
    const d = P.drones[i];
    if (!d) return false;
    if (on) {
      if (P.spares <= 0 && !d.out) {
        this.emit({ type: "no-spares", side: 0 });
        return false;
      }
      const ok = powerDrone(P, i);
      this.emit({ type: ok ? "power-up" : "power-denied", side: 0, kind: "drones" });
      return ok;
    }
    d.powered = false;
    d.want = false;
    syncBayPower(P);
    if (d.out) destroyDrone(this, P, d, "recalled");
    this.emit({ type: "power-down", side: 0, kind: "drones" });
    return true;
  }

  moveCrew(uids: number[], room: number) {
    let moved = 0;
    for (const uid of uids) {
      const c = this.crew.find((q) => q.uid === uid);
      if (!c || c.dead || c.side !== 0 || c.ship !== 0) continue;
      if (orderMove(this, c, room)) moved++;
    }
    this.emit({ type: moved ? "crew-move" : "room-full", side: 0, room });
  }

  canUseDoors(): boolean {
    return effective(this.ships[0].sys.doors) > 0 || usable(this.ships[0].sys.doors) > 0;
  }

  toggleDoor(i: number) {
    const d = this.ships[0].doors[i];
    if (!d) return;
    if (!this.canUseDoors()) {
      this.emit({ type: "power-denied", side: 0, kind: "doors" });
      return;
    }
    d.open = !d.open;
    this.emit({ type: d.open ? "door-open" : "door-close", side: 0, n: i });
  }

  setAllDoors(open: boolean) {
    if (!this.canUseDoors()) {
      this.emit({ type: "power-denied", side: 0, kind: "doors" });
      return;
    }
    for (const d of this.ships[0].doors) d.open = open;
    this.emit({ type: open ? "door-open" : "door-close", side: 0, n: -1 });
  }

  activateVeil(ship: SimShip = this.ships[0]): boolean {
    const v = ship.sys.veil;
    const lv = effective(v);
    if (!v || lv <= 0 || ship.veilT > 0 || ship.veilCd > 0) {
      if (ship.side === 0) this.emit({ type: "power-denied", side: 0, kind: "veil" });
      return false;
    }
    ship.veilT = TUNING.veilSeconds[Math.min(3, lv)];
    this.emit({ type: "veil-on", side: ship.side });
    return true;
  }

  hopReady(): boolean {
    return this.ships[0].hop >= 1 && !this.outcome;
  }

  hop(): boolean {
    if (!this.hopReady()) return false;
    this.finish("fled");
    this.emit({ type: "hop", side: 0 });
    return true;
  }

  saveStations() {
    const P = this.ships[0];
    for (const c of this.crew) {
      if (c.dead || c.side !== 0 || c.kind !== "crew" || c.ship !== 0) continue;
      const room = P.tileRoom[c.path.length ? c.dest : c.tile];
      c.stationRoom = room;
      if (c.member) c.member.station = P.rooms[room]?.id;
    }
    this.emit({ type: "stations-saved", side: 0 });
  }

  returnToStations() {
    const P = this.ships[0];
    for (const c of this.crew) {
      if (c.dead || c.side !== 0 || c.kind !== "crew" || c.ship !== 0 || c.stationRoom < 0) continue;
      if (P.tileRoom[c.tile] === c.stationRoom && !c.path.length) continue;
      orderMove(this, c, c.stationRoom);
    }
    this.emit({ type: "crew-move", side: 0 });
  }

  acceptSurrender() {
    if (!this.surrender || this.outcome) return;
    this.surrender.pending = false;
    this.finish("surrendered");
  }

  declineSurrender() {
    if (!this.surrender) return;
    this.surrender.pending = false;
    this.surrender.declined = true;
  }

  // ─── queries for the HUD ──────────────────────────────────────────────────────────────────────────────────

  /** Listening Post level seen by `side` (manned +1, keel/modules +N, fog/dark hazards blank it). */
  sensorLevel(side: Side = 0): number {
    const S = this.ships[side];
    const hz = this.setup.hazard;
    if (hz === "glass-fog" || hz === "dark-stretch") return 0;
    let lv = usable(S.sys.sensors);
    if (lv > 0 && manner(this, S, "sensors")) lv++;
    if (lv > 0) lv += S.mods.sensors;
    return lv;
  }

  seeEnemyCrew(): boolean {
    return this.sensorLevel(0) >= 2;
  }

  seeEnemyCharge(): boolean {
    return this.sensorLevel(0) >= 3 || this.ships[0].augments.includes("wireshark-tap");
  }

  seeEnemyPower(): boolean {
    return this.sensorLevel(0) >= 4;
  }

  inventoryView(): Inventory {
    const P = this.ships[0];
    return { ...this.inventory, payloads: P.payloads, spares: P.spares };
  }

  weaponSlots(): number {
    return this.playerState.weaponSlots;
  }

  droneSlots(): number {
    return this.playerState.droneSlots;
  }

  /** The persistent ship state the fight started from (normalized). */
  startState(): ShipState {
    return this.playerState;
  }

  playerCrew(): SimCrew[] {
    return this.crew.filter((c) => c.side === 0 && c.kind === "crew");
  }

  targetOk(t: Target | null): boolean {
    return targetValid(this, t, 0);
  }

  // ─── result ───────────────────────────────────────────────────────────────────────────────────────────────

  result(): CombatResult {
    const P = this.ships[0];
    const s = JSON.parse(JSON.stringify(this.playerState)) as ShipState;
    const defeat = this.outcome === "defeat";
    s.hull = Math.max(defeat ? 0 : 1, Math.min(s.hullMax, Math.round(P.hull)));
    for (const [id, st] of Object.entries(s.systems)) {
      if (!st) continue;
      const sim = P.sys[id as SysKey];
      st.damage = defeat && sim ? sim.damage : 0; // the crew patch everything up after the fight
      if (sim && id !== "weapons" && id !== "drones") st.power = Math.min(st.level, sim.want);
    }
    s.weaponPower = s.weapons.map((wid, i) => !!wid && !!P.weapons.find((w) => w.slot === i)?.want);
    const byId = new Map(this.crew.filter((c) => c.side === 0 && c.kind === "crew").map((c) => [c.id, c]));
    s.crew = s.crew.filter((m) => !byId.get(m.id)?.dead);
    for (const m of s.crew) {
      const c = byId.get(m.id);
      if (!c) continue;
      m.hp = Math.max(1, Math.round(c.hp));
      m.xp = { ...c.xp };
      m.kills = (m.kills ?? 0) + c.kills;
      m.repairs = (m.repairs ?? 0) + c.repairs;
      if (c.member?.station) m.station = c.member.station;
      m.room = P.rooms[P.tileRoom[c.tile]]?.id;
    }
    if (this.swhUsed) s.swhStage = this.setup.stage;
    let spares = P.spares;
    if (P.augments.includes("drone-recovery")) for (const d of P.drones) if (d.out && d.def.kind !== "repair") spares++;
    const inventory: Inventory = { ...this.inventory, payloads: P.payloads, spares };
    const outcome = this.outcome ?? "fled";
    return {
      outcome,
      ship: s,
      inventory,
      reward: outcome === "victory" || outcome === "surrendered" ? this.reward : undefined,
      crewLost: [...this.crewLost],
      stats: {
        seconds: Math.round(this.stats.seconds),
        damageDealt: Math.round(this.stats.damageDealt),
        damageTaken: Math.round(this.stats.damageTaken),
        shotsFired: this.stats.shotsFired,
        shotsHit: this.stats.shotsHit,
      },
    };
  }
}

export { DT, other, clampPower };
