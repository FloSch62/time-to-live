import { difficultyRules } from "../../data/difficulty.ts";
// Enemy AI (power profile, targeting, crew/escort orders, veil, surrender and flight), boarders, the three
// guardians' laws, and stage hazards.
import type { SysKey } from "../../data/layouts.ts";
import { weaponDef } from "../../data/weapons.ts";
import type { SimShip, SimWeapon, Target, SimCrew } from "./model.ts";
import type { Sim } from "./sim.ts";
import { effective, isMain, reactorFree, syncBayPower, usable, applyIon, damageSystem, clampPower, manner } from "./power.ts";
import { orderMove, makeBoarder } from "./crew.ts";
import { chargeTime, targetValid, spawnLocalShot } from "./weapons.ts";
import { startFire, startBreach } from "./env.ts";
import { makeWeapon } from "./build.ts";

// ─── Power ──────────────────────────────────────────────────────────────────────────────────────────────────

export function aiPower(sim: Sim, ship: SimShip) {
  const e = ship.enemy;
  if (!e) return;
  const order: SysKey[] = [...e.ai.power];
  for (const s of ship.systems) if (isMain(s.id) && !order.includes(s.id)) order.push(s.id);
  // Depower everything (same tick: weapons keep their charge), then allocate by priority.
  for (const s of ship.systems) if (isMain(s.id)) s.power = 0;
  const wasPowered = ship.weapons.map((w) => w.powered);
  for (const w of ship.weapons) if (!w.art) w.powered = false;
  const dronesWere = ship.drones.map((d) => d.powered);
  for (const d of ship.drones) d.powered = false;
  let budget = ship.reactor;
  for (const id of order) {
    const s = ship.sys[id];
    if (!s || !isMain(id)) continue;
    const cap = usable(s);
    if (id === "weapons") {
      let load = 0;
      for (const w of ship.weapons) {
        if (w.art) continue;
        const need = w.def.power;
        if (load + need <= cap && need <= budget) {
          budget -= need;
          load += need;
          w.powered = true;
        }
      }
    } else if (id === "drones") {
      let load = 0;
      for (const d of ship.drones) {
        const need = d.def.power;
        if (load + need <= cap && need <= budget) {
          budget -= need;
          load += need;
          d.powered = true;
        }
      }
    } else {
      let p = Math.min(Math.max(0, cap - s.bonus), budget);
      if (id === "shields") p -= (p + s.bonus) % 2 === 1 && p > 0 ? 1 : 0;
      s.power = p;
      budget -= p;
    }
    s.want = s.power;
  }
  ship.weapons.forEach((w, i) => {
    w.want = w.powered;
    if (wasPowered[i] && !w.powered) w.chain = 0;
  });
  ship.drones.forEach((d, i) => {
    d.want = d.powered;
    if (dronesWere[i] && !d.powered && d.out) sim.droneDepowered(ship, d);
  });
  syncBayPower(ship);
  clampPower(sim, ship);
}

// ─── Targeting ──────────────────────────────────────────────────────────────────────────────────────────────

export function pickRoom(sim: Sim, shooter: SimShip): number {
  const T = sim.ships[0];
  const e = shooter.enemy;
  const weights = e?.ai.targets ?? { any: 1 };
  if (e?.autonomous && usable(shooter.sys.helm) <= 0) return sim.rng.pick(T.rooms).i;
  const any = weights.any ?? 1;
  const opts: { room: number; w: number }[] = [];
  for (const r of T.rooms) {
    let w = any / T.rooms.length;
    if (r.sys) w += weights[r.sys.id] ?? 0;
    // Machines keep hitting what they already broke a little less.
    if (r.sys && r.sys.damage >= r.sys.level) w *= 0.4;
    opts.push({ room: r.i, w });
  }
  return sim.rng.weighted(opts, (o) => o.w).room;
}

function beamLine(sim: Sim, room: number, len: number): Target {
  const T = sim.ships[0];
  const r = T.rooms[room];
  const x0 = r.x + 0.2 + sim.rng.next() * (r.w - 0.4);
  const y0 = r.y + 0.3 + sim.rng.next() * 0.4;
  const dir = sim.rng.next() < 0.5 ? -1 : 1;
  const slope = (sim.rng.next() - 0.5) * 0.9;
  const dx = dir * len * Math.cos(Math.atan(slope));
  return { kind: "beam", x0, y0, x1: x0 + dx, y1: y0 + dx * slope * dir };
}

/** Weapons with a duty of their own aim at systems in this order (skipping ones already broken), then at random.
 *  The Iron Regent tests for a second way home: its Routing Edict goes for the route (helm, then drive), not for
 *  the guns that would give it its proof. */
export const WEAPON_AIM: Record<string, SysKey[]> = { "regent-edict": ["helm", "engines"] };

function aimedRoom(sim: Sim, w: SimWeapon, shooter: SimShip): number {
  const T = sim.ships[0];
  for (const id of WEAPON_AIM[w.def.id] ?? []) {
    const s = T.sys[id];
    if (s && s.damage < s.level) return s.room;
  }
  return WEAPON_AIM[w.def.id] ? sim.rng.pick(T.rooms).i : pickRoom(sim, shooter);
}

export function aiTargets(sim: Sim, ship: SimShip, dt = 0) {
  // Machines fire in salvos: charged weapons wait (1.5 s, guardians 3 s) for the rest so shots land together.
  const hold = ship.enemy?.boss ? 3 : ship.kind === "human" ? 0.6 : 1.5;
  const live = ship.weapons.filter((w) => (w.art ? usable(w.art) > 0 && w.active : w.powered));
  const charged = live.filter((w) => w.charge >= chargeTime(w) - 1e-6).length;
  const all = live.every((w) => w.charge >= chargeTime(w) * 0.97);
  if (charged > 0 && !all) {
    ship.holdT += dt;
    ship.salvoOk = ship.holdT >= hold;
  } else {
    ship.holdT = 0;
    ship.salvoOk = true;
  }
  for (const w of ship.weapons) {
    if (w.target && targetValid(sim, w.target, ship.side)) continue;
    if (w.charge < chargeTime(w) * 0.85) continue;
    const room = aimedRoom(sim, w, ship);
    w.target = w.def.type === "beam" ? beamLine(sim, room, w.def.beamLength ?? 2) : { kind: "room", room };
  }
}

// ─── Crew / escorts ─────────────────────────────────────────────────────────────────────────────────────────

const STATION_ORDER: SysKey[] = ["helm", "weapons", "shields", "engines", "sensors", "doors"];

function roomHasWork(ship: SimShip, ri: number): number {
  const r = ship.rooms[ri];
  let w = 0;
  for (const t of r.tiles) {
    if (ship.fire[t] > 0) w += 6;
    if (ship.breach[t] > 0) w += 5;
  }
  if (r.sys && r.sys.damage > 0) {
    const imp: Partial<Record<SysKey, number>> = { shields: 5, weapons: 4, engines: 3, helm: 3, gate: 5, bells: 5, heart: 4, artillery: 3, drones: 2, air: 2 };
    w += (imp[r.sys.id] ?? 1) + r.sys.damage;
  }
  return w;
}

export function aiCrew(sim: Sim, ship: SimShip) {
  const mine = sim.crew.filter((c) => !c.dead && c.side === ship.side && c.ship === ship.side && c.kind !== "boarder" && c.kind !== "crawler");
  if (!mine.length) return;
  // Rooms with hostiles aboard.
  const hostileRooms = new Map<number, number>();
  for (const c of sim.crew) {
    if (c.dead || c.ship !== ship.side || c.side === ship.side) continue;
    const r = ship.tileRoom[c.tile];
    hostileRooms.set(r, (hostileRooms.get(r) ?? 0) + 1);
  }
  const work: { room: number; w: number }[] = [];
  for (const r of ship.rooms) {
    const w = roomHasWork(ship, r.i) + (hostileRooms.get(r.i) ?? 0) * 7;
    if (w > 0) work.push({ room: r.i, w });
  }
  work.sort((a, b) => b.w - a.w);
  const busy = (c: SimCrew) => c.task === "fight" || c.task === "fire" || c.task === "breach" || c.task === "repair";
  if (ship.kind === "human") {
    // Stations first, one repairer when work exists, the wounded to the infirmary.
    const med = ship.sys.medbay;
    const stations = STATION_ORDER.map((id) => ship.sys[id]).filter((s) => s && ship.rooms[s.room].station >= 0);
    mine.forEach((c, i) => {
      if (c.path.length) return;
      const here = ship.tileRoom[c.tile];
      if (med && effective(med) > 0 && c.hp < c.maxHp * 0.35 && here !== med.room) {
        orderMove(sim, c, med.room);
        return;
      }
      if (med && here === med.room && c.hp < c.maxHp * 0.9 && effective(med) > 0) return;
      if (busy(c)) return;
      const isRepairer = i === mine.length - 1 && work.length > 0;
      if (isRepairer) {
        if (here !== work[0].room) orderMove(sim, c, work[0].room);
        return;
      }
      const s = stations[i % Math.max(1, stations.length)];
      if (s && here !== s.room) orderMove(sim, c, s.room);
    });
    return;
  }
  // Escort automatons: spread over the work, else patrol system rooms.
  const assigned = new Map<number, number>();
  for (const c of mine) {
    const here = ship.tileRoom[c.tile];
    if (busy(c) && !c.path.length) {
      assigned.set(here, (assigned.get(here) ?? 0) + 1);
      continue;
    }
    if (c.path.length) {
      assigned.set(c.orderRoom, (assigned.get(c.orderRoom) ?? 0) + 1);
      continue;
    }
  }
  for (const c of mine) {
    if (c.path.length || busy(c)) continue;
    let best = -1;
    let bw = 0;
    for (const w of work) {
      const load = assigned.get(w.room) ?? 0;
      const score = w.w / (1 + load * 1.5);
      if (score > bw) {
        bw = score;
        best = w.room;
      }
    }
    if (best >= 0 && best !== ship.tileRoom[c.tile]) {
      if (orderMove(sim, c, best)) assigned.set(best, (assigned.get(best) ?? 0) + 1);
    } else if (best < 0 && sim.rng.chance(0.08)) {
      const rooms = ship.rooms.filter((r) => r.sys);
      if (rooms.length) orderMove(sim, c, sim.rng.pick(rooms).i);
    }
  }
}

// ─── Per-tick enemy update ──────────────────────────────────────────────────────────────────────────────────

export function updateEnemy(sim: Sim, ship: SimShip, dt: number) {
  if (ship.dead || sim.outcome) return;
  const e = ship.enemy!;
  ship.aiT -= dt;
  if (ship.aiT <= 0) {
    ship.aiT = 0.5;
    aiPower(sim, ship);
    aiCrew(sim, ship);
  }
  aiTargets(sim, ship, dt);
  if (e.autonomous) {
    const damaged = ship.systems.filter(s => s.damage > 0);
    if (damaged.length && usable(ship.sys.helm) > 0) {
      ship.repairArmT += dt;
      if (ship.repairArmT >= 9) {
        const system = damaged.sort((a, b) => b.damage - a.damage)[0];
        system.damage--;
        ship.repairArmT = 0;
        sim.emit({ type: "robot-repair", side: 1, room: system.room });
      }
    } else ship.repairArmT = 0;
  }
  // Veil when a volley is in the air.
  if (e.ai.veil && ship.sys.veil && usable(ship.sys.veil) > 0 && ship.veilT <= 0 && ship.veilCd <= 0) {
    let incoming = 0;
    for (const p of sim.projectiles) if (!p.dead && p.to === ship.side && p.t > p.t1 * 0.5) incoming++;
    for (const b of sim.beams) if (!b.done && b.to === ship.side && b.t < b.delay) incoming += 2;
    if (incoming >= 2) sim.activateVeil(ship);
  }
  // Human crews: surrender, then run.
  if (ship.kind === "human") {
    const frac = ship.hull / ship.hullMax;
    if (e.surrender && sim.setup.surrenderable !== false && frac <= e.surrender && !sim.surrender) sim.offerSurrender();
    if (e.flee && frac <= e.flee && !ship.fleeing && (!sim.surrender || sim.surrender.declined)) {
      ship.fleeing = true;
      ship.hop = 0;
      sim.emit({ type: "enemy-flee", side: 1 });
    }
    if (ship.fleeing && ship.hop >= 1) sim.finish("escaped");
  }
  // Boarders.
  if (e.boarders && ship.sys.brood) {
    const b = e.boarders;
    if (ship.broodT === 0) ship.broodT = b.first;
    const before = ship.broodT;
    if (effective(ship.sys.brood) > 0) ship.broodT -= dt / difficultyRules(sim.setup.difficulty).enemyWeaponCharge;
    if (before > 3 && ship.broodT <= 3) sim.emit({ type: "brood-charge", side: 1 });
    if (ship.broodT <= 0) {
      ship.broodT = b.every;
      const alive = sim.crew.filter((c) => !c.dead && c.kind === "boarder" && c.side === 1).length + sim.boarding.reduce((n, b) => n + b.count, 0);
      const n = Math.min(b.count + (usable(ship.sys.brood) >= 3 ? 1 : 0), b.max - alive);
      if (n > 0) sendBoarders(sim, b.kind, n);
    }
  }
  updateBoarding(sim, dt);
  updateBoss(sim, ship, dt);
}

export function sendBoarders(sim: Sim, kind: "spark-mite" | "splicer" | "marshal-trooper", n: number) {
  const P = sim.ships[0];
  const rooms = P.rooms.filter(r => P.doors.some(d => d.airlock && d.a === r.i));
  const room = sim.rng.pick(rooms.length ? rooms : P.rooms);
  const door = P.doors.find(d => d.airlock && d.a === room.i);
  sim.boarding.push({ id: sim.nextId++, kind, count: n, room: room.i, tile: door?.ta ?? room.tiles[0], elapsed: 0, duration: 4 });
  sim.emit({ type: "boarding-launch", side: 0, room: room.i, n, kind });
}

function updateBoarding(sim: Sim, dt: number) {
  for (const b of [...sim.boarding]) {
    if (effective(sim.ships[1].sys.brood) <= 0) {
      sim.boarding = sim.boarding.filter(q => q !== b);
      sim.emit({ type: "boarding-cut", side: 0, room: b.room });
      continue;
    }
    b.elapsed += dt;
    if (b.elapsed < b.duration) continue;
    const P = sim.ships[0], room = P.rooms[b.room];
    startBreach(sim, P, b.tile);
    for (let i = 0; i < b.count; i++) sim.crew.push(makeBoarder(b.kind, 1, 0, room.tiles[i % room.tiles.length], P.cols));
    sim.emit({ type: "boarders", side: 0, room: b.room, n: b.count, kind: b.kind });
    sim.boarding = sim.boarding.filter(q => q !== b);
  }
}

// ─── Guardians ──────────────────────────────────────────────────────────────────────────────────────────────

const GATE_WINDOW = 2.2;
const GLASS_WINDOW = 1.0;

/** Boss shields: returns true when the hit is absorbed. `count` = simultaneous hits (beam rooms). */
/** Register an attack route on the Regent's sealed gate; true when this route opens it. A gate warden is a piece of
 *  the gate stepped out, so a hit on one proves its route too. */
export function gateRoute(sim: Sim, T: SimShip, source: string, x: number, y: number): boolean {
  const g = T.boss.gate;
  if (!g || !g.up) return false;
  g.locks = g.locks.filter((l) => sim.t - l.t <= GATE_WINDOW && l.source !== source);
  g.locks.push({ source, t: sim.t });
  const routes = new Set(g.locks.map((l) => l.source)).size;
  if (routes >= 2) {
    g.up = false;
    const wardens = T.adjuncts.filter((a) => a.alive && a.kind === "gate-warden").length;
    g.downT = 10 - wardens * 2.5 + (T.sys.gate ? T.sys.gate.damage * 2 : 0);
    g.locks = [];
    sim.emit({ type: "gate-open", side: T.side, x, y });
    return true;
  }
  sim.emit({ type: "gate-lock", side: T.side, x, y, n: routes });
  return false;
}

export function specialShield(sim: Sim, T: SimShip, source: string, count: number, x: number, y: number): boolean {
  const g = T.boss.gate;
  if (g && g.up) return !gateRoute(sim, T, source, x, y);
  const gl = T.boss.glass;
  if (gl && gl.up) {
    gl.hits = gl.hits.filter((h) => sim.t - h <= GLASS_WINDOW);
    for (let i = 0; i < count; i++) gl.hits.push(sim.t);
    if (gl.hits.length >= 3) {
      gl.up = false;
      gl.downT = 11;
      gl.hits = [];
      sim.emit({ type: "glass-shatter", side: T.side, x, y });
      return false;
    }
    sim.emit({ type: "glass-ring", side: T.side, x, y, n: gl.hits.length });
    return true;
  }
  return false;
}

function updateBoss(sim: Sim, ship: SimShip, dt: number) {
  const g = ship.boss.gate;
  if (g) {
    const gate = ship.sys.gate;
    if (!g.up) {
      g.downT -= dt;
      if (g.downT <= 0 && gate && usable(gate) > 0) {
        g.up = true;
        sim.emit({ type: "gate-up", side: 1 });
      }
    } else if (!gate || usable(gate) <= 0) {
      g.up = false;
      g.downT = 4;
    }
    // Gate wardens mend the Regent.
    for (const a of ship.adjuncts) {
      if (!a.alive || !a.active || a.stun > 0) continue;
      a.cd -= dt;
      if (a.cd <= 0) {
        a.cd = 9;
        const hurtSys = ship.systems.filter((s) => s.damage > 0).sort((p, q) => q.damage - p.damage)[0];
        if (hurtSys) {
          hurtSys.damage--;
          sim.emit({ type: "warden-mend", side: 1, x: a.x, y: a.y, room: hurtSys.room });
        } else if (ship.hull < ship.hullMax && sim.rng.chance(0.35)) {
          ship.hull++;
          sim.emit({ type: "warden-mend", side: 1, x: a.x, y: a.y, room: -1 });
        }
      }
    }
  }
  const gl = ship.boss.glass;
  if (gl) {
    const bells = ship.sys.bells;
    const P = sim.ships[0];
    const holding = gl.tuning && usable(P.sys.helm) > 0 && (!!manner(sim, P, "helm") || usable(P.sys.helm) >= 2);
    if (gl.up) {
      gl.channel = holding ? Math.min(12, gl.channel + dt * (1 + (bells?.damage ?? 0) * 0.25)) : Math.max(0, gl.channel - dt * 2);
      if (holding) P.hop = Math.max(0, P.hop - dt / 12);
      if (gl.channel >= 12) {
        gl.up = false;
        gl.downT = 12 + (bells?.damage ?? 0) * 4;
        gl.channel = 0;
        sim.emit({ type: "choir-channel", side: 1 });
      }
    }
    if (!gl.up) {
      // Damaged bell machinery takes longer to reassert a compulsory single voice.
      gl.downT -= dt / (1 + (bells?.damage ?? 0) * 0.35);
      if (gl.downT <= 0 && bells && usable(bells) > 0) {
        gl.up = true;
        sim.emit({ type: "glass-up", side: 1 });
      }
    } else if (!bells || usable(bells) <= 0) {
      gl.up = false;
      gl.downT = 3;
    }
  }
  const core = ship.boss.core;
  if (core) updateCore(sim, ship, core, dt);
  // Adjunct motion and sealing drones' bolts.
  for (const a of ship.adjuncts) {
    if (a.stun > 0) a.stun -= dt;
    a.hitT += dt;
    if (!a.alive || !a.active) continue;
    const bob = Math.sin(sim.t * 1.3 + a.i * 2) * 0.25;
    a.x = a.hx + Math.cos(sim.t * 0.5 + a.i) * 0.3;
    a.y = a.hy + bob;
    if (a.kind === "sealing-drone" && a.stun <= 0) {
      a.cd -= dt;
      if (a.cd <= 0) {
        a.cd = 15;
        const room = pickRoom(sim, ship);
        spawnLocalShot(sim, 1, 0, a.x, a.y, { kind: "room", room }, { dmg: 0, ion: 2, kind: "seal", source: `adj${a.i}`, color: "ember", fromShip: true, t2: 1.1 });
        sim.emit({ type: "seal-fire", side: 1, x: a.x, y: a.y });
      }
    }
  }
  // The shell closes (+1 ward layer) while any sealing drone flies.
  ship.bonusLayers = ship.adjuncts.some((a) => a.alive && a.active && a.kind === "sealing-drone") ? 1 : 0;
}

function updateCore(sim: Sim, ship: SimShip, core: NonNullable<SimShip["boss"]["core"]>, dt: number) {
  core.phaseT += dt;
  const frac = ship.hull / ship.hullMax;
  if (core.phase === 1 && frac <= 0.5) {
    core.phase = 2;
    core.phaseT = 0;
    ship.hull = Math.min(ship.hullMax, ship.hull + 7);
    for (const s of ship.systems) {
      s.damage = 0;
      s.ion = 0;
    }
    ship.reactor += 4;
    ship.chargeMul = 1.3;
    for (const f of ship.fire.keys()) ship.fire[f] = 0;
    sim.emit({ type: "phase", side: 1, n: 2 });
  } else if (core.phase === 2 && frac <= 0.25) {
    core.phase = 3;
    core.phaseT = 0;
    ship.hull = Math.min(ship.hullMax, ship.hull + 7);
    for (const s of ship.systems) s.damage = Math.max(0, s.damage - 2);
    for (const a of ship.adjuncts) if (a.kind === "sealing-drone") {
      a.active = true;
      a.alive = true;
      a.hp = a.maxHp;
    }
    const heart = ship.sys.heart;
    const w = makeWeapon(weaponDef("horizon-pull"), ship.weapons.length);
    w.art = heart ?? null;
    w.want = true;
    ship.weapons.push(w);
    sim.emit({ type: "phase", side: 1, n: 3 });
  }
  // Custody rotation: only the active step(s) charge; firing advances the rotation.
  const rot = ship.weapons.filter((w) => w.def.id.startsWith("custody-"));
  const live = rot.filter((w) => w.art && usable(w.art) > 0);
  if (!live.length) return;
  const n = core.phase === 1 ? 1 : 2;
  const activeIdx: number[] = [];
  for (let k = 0; k < rot.length && activeIdx.length < n; k++) {
    const idx = (core.step + k) % rot.length;
    const w = rot[idx];
    if (w.art && usable(w.art) > 0) activeIdx.push(idx);
  }
  rot.forEach((w, i) => (w.active = activeIdx.includes(i)));
  for (const i of activeIdx) {
    if (rot[i].fired === 0) {
      core.step = (i + 1) % rot.length;
      sim.emit({ type: "custody-step", side: 1, n: core.step });
      break;
    }
  }
  // Phase 3's horizon beam and heart: the heart feeds the pull.
  for (const w of ship.weapons) if (w.def.id === "horizon-pull") w.active = true;
  void reactorFree;
  void damageSystem;
  void applyIon;
}

// ─── Hazards (contract §3.2) ────────────────────────────────────────────────────────────────────────────────

export function updateHazards(sim: Sim, dt: number) {
  const hz = sim.setup.hazard;
  if (!hz || sim.outcome) return;
  sim.hazardT -= dt;
  if (sim.hazardT > 0) return;
  const both = [sim.ships[0], sim.ships[1]];
  switch (hz) {
    case "debris-field": {
      sim.hazardT = 7 + sim.rng.next() * 6;
      const T = sim.rng.pick(both);
      const room = sim.rng.pick(T.rooms).i;
      const p = spawnLocalShot(sim, -1 as never, T.side, 0, 0, { kind: "room", room }, { dmg: 1, kind: "debris", source: "debris", color: "ivory", t2: 1.6 });
      p.from = -1;
      delete p.sx;
      delete p.sy;
      sim.emit({ type: "debris", side: T.side });
      break;
    }
    case "rust-squall": {
      sim.hazardT = 20;
      for (const T of both) {
        const opts = T.systems.filter((s) => effective(s) > 0);
        if (!opts.length) continue;
        const s = sim.rng.pick(opts);
        applyIon(sim, T, s, 1);
        s.ionT = 10;
        s.rust = 10;
        sim.emit({ type: "rust", side: T.side, room: s.room });
      }
      break;
    }
    case "sun-glare":
    case "ember-draft": {
      sim.hazardT = hz === "sun-glare" ? 24 : 30;
      for (const T of both) {
        const r = sim.rng.pick(T.rooms);
        startFire(sim, T, sim.rng.pick(r.tiles));
        sim.emit({ type: "glare", side: T.side, room: r.i });
      }
      break;
    }
    case "ringing-panes": {
      sim.hazardT = 20;
      for (const T of both) {
        const opts = T.systems.filter((s) => s.level > 0);
        if (!opts.length) continue;
        const s = sim.rng.pick(opts);
        applyIon(sim, T, s, 1);
        sim.emit({ type: "pane-ring", side: T.side, room: s.room });
      }
      break;
    }
    default:
      sim.hazardT = 999;
  }
}

export function weaponName(w: SimWeapon): string {
  return w.def.name;
}
