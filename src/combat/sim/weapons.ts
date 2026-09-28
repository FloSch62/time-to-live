import { difficultyRules } from "../../data/difficulty.ts";
// Weapons: charging, volleys, projectiles (two flight legs: leaving the shooter, arriving at the target), evasion,
// shields (ward mesh), boss shields, beams dragged across rooms, flak scatter, and damage to rooms/systems/crew.
import { FLIGHT, type WeaponDef } from "../../data/weapons.ts";
import { MAN_BONUS, skillLevel } from "../../data/species.ts";
import { TUNING } from "../../data/systems.ts";
import type { BeamShot, Projectile, ProjKind, SimShip, SimWeapon, Side, Target } from "./model.ts";
import { other } from "./model.ts";
import type { Sim } from "./sim.ts";
import { applyIon, damageSystem, manner, effective, usable } from "./power.ts";
import { addXp, hurt } from "./crew.ts";
import { startBreach, startFire } from "./env.ts";

export const SHOT_GAP = 0.14;

export function chargeTime(w: SimWeapon): number {
  const c = w.def.chain ? w.def.charge - w.def.chain.step * Math.min(w.chain, w.def.chain.max) : w.def.charge;
  return Math.max(1, c);
}

export function chargeRate(sim: Sim, ship: SimShip): number {
  let r = ship.chargeMul / (ship.side === 1 ? difficultyRules(sim.setup.difficulty).enemyWeaponCharge : 1);
  r *= 1 + ship.mods.weaponCharge;
  const m = manner(sim, ship, "weapons");
  if (m) r *= 1 + MAN_BONUS.weaponsCharge[skillLevel(m.xp, "weapons")];
  if (ship.augments.includes("hot-swap-rig")) r *= 1.1;
  if (sim.setup.hazard === "resonance") r *= 1.1;
  return r;
}

export function weaponReady(w: SimWeapon): boolean {
  return w.charge >= chargeTime(w) - 1e-6;
}

export function weaponLive(w: SimWeapon): boolean {
  if (w.art) return usable(w.art) > 0 && w.active;
  return w.powered;
}

export function targetValid(sim: Sim, t: Target | null, shooter: Side): boolean {
  if (!t) return false;
  const T = sim.ships[other(shooter)];
  if (T.dead) return false;
  if (t.kind === "adj") {
    const a = T.adjuncts[t.i];
    return !!a && a.alive && a.active;
  }
  return true;
}

export function updateWeapons(sim: Sim, ship: SimShip, dt: number) {
  const foe = sim.ships[other(ship.side)];
  const paused = foe.veilT > 0; // the veil stops the other side's weapons charging
  const rate = chargeRate(sim, ship);
  for (const w of ship.weapons) {
    w.fired += dt;
    const live = weaponLive(w) && !ship.dead;
    const ct = chargeTime(w);
    if (live) {
      if (!paused && w.charge < ct) {
        const before = w.charge;
        w.charge = Math.min(ct, w.charge + dt * rate);
        if (before < ct && w.charge >= ct && ship.side === 0) sim.emit({ type: "weapon-charged", side: 0, slot: w.slot });
      }
    } else {
      w.charge = Math.max(0, w.charge - dt * 3);
      w.chain = 0;
      w.queue = 0;
    }
    // Volley in progress.
    if (w.queue > 0) {
      w.queueT -= dt;
      while (w.queue > 0 && w.queueT <= 0) {
        spawnShot(sim, ship, w, w.volleyTarget!, w.def.shots - w.queue);
        w.queue--;
        w.queueT += SHOT_GAP;
      }
      continue;
    }
    if (!live || !weaponReady(w)) continue;
    if (ship.side === 1 && !ship.salvoOk) continue;
    if (!targetValid(sim, w.target, ship.side)) {
      if (w.target) w.target = null;
      continue;
    }
    if (foe.dead || sim.outcome) continue;
    if (w.def.ammo && ship.side === 0) {
      if (ship.payloads < w.def.ammo) {
        if (w.fired > 3) {
          sim.emit({ type: "no-payloads", side: 0, slot: w.slot });
          w.fired = 0;
        }
        continue;
      }
      ship.payloads -= w.def.ammo;
    }
    fireVolley(sim, ship, w, w.target!);
  }
}

export function fireVolley(sim: Sim, ship: SimShip, w: SimWeapon, target: Target) {
  w.charge = 0;
  w.fired = 0;
  if (w.def.chain) w.chain = Math.min(w.def.chain.max, w.chain + 1);
  const volley = ++sim.volleyId;
  w.volley = volley;
  w.volleyTarget = target;
  sim.emit({ type: "fire", side: ship.side, slot: w.slot, kind: w.def.type, text: w.def.sfx });
  if (ship.side === 0) {
    const m = manner(sim, ship, "weapons");
    if (m) addXp(m, "weapons", 1);
  }
  if (!(ship.side === 0 && sim.autofire) && ship.side === 0) w.target = null;
  if (ship.side === 1) w.target = null;
  if (w.def.type === "beam") {
    fireBeam(sim, ship, w, target, volley);
    return;
  }
  if (w.def.type === "flak") {
    for (let i = 0; i < w.def.shots; i++) spawnShot(sim, ship, w, target, i);
    return;
  }
  spawnShot(sim, ship, w, target, 0);
  w.queue = w.def.shots - 1;
  w.queueT = SHOT_GAP;
}

function aimPoint(sim: Sim, T: SimShip, t: Target, spread = 0): [number, number] {
  if (t.kind === "adj") {
    const a = T.adjuncts[t.i];
    return [a.x, a.y];
  }
  if (t.kind === "beam") return [t.x0, t.y0];
  const r = T.rooms[t.room];
  if (spread > 0) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const a = sim.rng.next() * Math.PI * 2;
    const d = Math.sqrt(sim.rng.next()) * spread;
    return [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6];
  }
  const tile = sim.rng.pick(r.tiles);
  const tx = tile % T.cols;
  const ty = (tile - tx) / T.cols;
  return [tx + 0.3 + sim.rng.next() * 0.4, ty + 0.35 + sim.rng.next() * 0.3];
}

function kindOf(d: WeaponDef): ProjKind {
  return d.type === "beam" ? "laser" : d.type;
}

function spawnShot(sim: Sim, ship: SimShip, w: SimWeapon, target: Target, idx: number) {
  const T = sim.ships[other(ship.side)];
  if (T.dead) return;
  const kind = kindOf(w.def);
  const [px, py] = aimPoint(sim, T, target, w.def.type === "flak" ? w.def.spread ?? 1 : 0);
  const [t1, t2] = FLIGHT[w.def.type];
  const p: Projectile = {
    id: ++sim.nextId, from: ship.side, to: T.side, kind, def: w.def, dmg: w.def.damage, ion: w.def.ion ?? 0,
    fire: w.def.fireChance, breach: w.def.breachChance, crewDmg: w.def.crewDamage ?? TUNING.crewPerDamage,
    sysBonus: w.def.sysBonus ?? 0, target, px, py, mount: w.slot, t: -idx * 0.02 * (w.def.type === "flak" ? 1 : 0),
    t1: t1 + (w.def.type === "flak" ? idx * 0.03 : 0), t2, volley: w.volley, source: `w${ship.side}:${w.slot}`,
    dead: false, claimed: false, color: w.def.color,
  };
  sim.projectiles.push(p);
  if (ship.side === 0) sim.stats.shotsFired++;
  if (idx > 0 && w.def.type !== "flak") sim.emit({ type: "fire-shot", side: ship.side, slot: w.slot, kind: w.def.type, text: w.def.sfx });
}

/** A projectile from a drone or adjunct already near the target (no leg 1). */
export function spawnLocalShot(
  sim: Sim, from: Side, to: Side, sx: number, sy: number, target: Target, o: { dmg: number; ion?: number; kind?: ProjKind; source: string; color?: string; t2?: number; fromShip?: boolean },
) {
  const T = sim.ships[to];
  const [px, py] = aimPoint(sim, T, target);
  const p: Projectile = {
    id: ++sim.nextId, from, to, kind: o.kind ?? "drone", def: null, dmg: o.dmg, ion: o.ion ?? 0, fire: 0.05, breach: 0,
    crewDmg: TUNING.crewPerDamage, sysBonus: 0, target, px, py, mount: -1, sx, sy, t: 0,
    t1: o.fromShip ? 0.4 : 0, t2: o.t2 ?? 0.35, volley: ++sim.volleyId, source: o.source, dead: false, claimed: false,
    color: o.color ?? "teal",
  };
  if (o.fromShip) {
    p.ox = sx;
    p.oy = sy;
    delete p.sx;
    delete p.sy;
  }
  sim.projectiles.push(p);
  return p;
}

export function updateProjectiles(sim: Sim, dt: number) {
  for (const p of sim.projectiles) {
    if (p.dead) continue;
    p.t += dt;
    if (p.t >= p.t1 + p.t2) {
      p.dead = true;
      resolve(sim, p);
    }
  }
  if (sim.projectiles.length > 64) sim.projectiles = sim.projectiles.filter((p) => !p.dead);
}

/** Tile and room under a point in a ship (nearest room tile when the point falls between rooms). */
export function roomAt(T: SimShip, x: number, y: number): [number, number] {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx >= 0 && ty >= 0 && tx < T.cols && ty < T.rows) {
    const t = ty * T.cols + tx;
    if (T.tileRoom[t] >= 0) return [t, T.tileRoom[t]];
  }
  let best = -1;
  let bd = Infinity;
  for (let t = 0; t < T.tileRoom.length; t++) {
    if (T.tileRoom[t] < 0) continue;
    const cx = (t % T.cols) + 0.5;
    const cy = Math.floor(t / T.cols) + 0.5;
    const d = (cx - x) ** 2 + (cy - y) ** 2;
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return [best, best >= 0 ? T.tileRoom[best] : -1];
}

function pilotXp(sim: Sim, T: SimShip) {
  if (T.side !== 0) return;
  const h = manner(sim, T, "helm");
  if (h) addXp(h, "helm", 1);
  const e = manner(sim, T, "engines");
  if (e) addXp(e, "engines", 1);
}

function resolve(sim: Sim, p: Projectile) {
  const T = sim.ships[p.to];
  if (T.dead || sim.outcome) return;
  // Boss adjuncts (gate wardens, sealing drones).
  if (p.target.kind === "adj") {
    const a = T.adjuncts[p.target.i];
    if (!a || !a.alive) return;
    if (sim.rng.next() * 100 < a.evasion) {
      sim.emit({ type: "miss", side: T.side, x: a.x, y: a.y, kind: "adj" });
      return;
    }
    if (p.from === 0) sim.stats.shotsHit++;
    if (p.ion > 0) a.stun = Math.max(a.stun, 5 * p.ion);
    const dmg = Math.max(p.dmg, p.ion > 0 ? 0 : 0);
    a.hp -= dmg;
    a.hitT = 0;
    if (p.from === 0) sim.stats.damageDealt += dmg;
    sim.emit({ type: "adj-hit", side: T.side, x: a.x, y: a.y, n: dmg, kind: p.kind });
    if (a.kind === "gate-warden" && T.boss.gate?.up) sim.gateRoute(T, p.source, a.x, a.y);
    if (a.hp <= 0) {
      a.alive = false;
      a.hp = 0;
      sim.emit({ type: "adj-down", side: T.side, x: a.x, y: a.y, n: a.i, kind: a.kind });
    }
    return;
  }
  // Evasion.
  if (p.kind !== "crawler" && sim.rng.next() * 100 < T.evasion) {
    sim.emit({ type: "miss", side: T.side, x: p.px, y: p.py, kind: p.kind, projectile: p });
    pilotXp(sim, T);
    return;
  }
  if (p.from === 0) sim.stats.shotsHit++;
  // Boss shields: the Regent's gate, the Choir's glass.
  if (p.kind !== "crawler" && sim.specialShield(T, p.source, 1, p.px, p.py)) return;
  // Ward mesh (shields).
  const shieldable = p.kind !== "payload" && p.kind !== "crawler";
  if (shieldable && T.shields > 0) {
    T.shields--;
    if (p.ion > 0 && T.sys.shields) applyIon(sim, T, T.sys.shields, p.ion);
    sim.emit({ type: "shield-hit", side: T.side, x: p.px, y: p.py, kind: p.ion > 0 ? "ion" : p.kind, projectile: p });
    if (T.side === 0) {
      const m = manner(sim, T, "shields");
      if (m) addXp(m, "shields", 1);
    }
    return;
  }
  const [tile, ri] = roomAt(T, p.px, p.py);
  if (ri < 0) return;
  if (p.kind === "crawler") {
    sim.crawlerArrives(p, T, tile);
    return;
  }
  if (p.kind === "payload" && T.shields > 0) sim.emit({ type: "shield-bypass", side: T.side, x: p.px, y: p.py });
  hitRoom(sim, T, ri, tile, {
    dmg: p.dmg, ion: p.ion, fire: p.fire, breach: p.breach, crewDmg: p.crewDmg, sysBonus: p.sysBonus, from: p.from, kind: p.kind,
  }, p.px, p.py);
}

export interface HitSpec {
  dmg: number;
  ion: number;
  fire: number;
  breach: number;
  crewDmg: number;
  sysBonus: number;
  from: Side | -1;
  kind: string;
}

export function hitRoom(sim: Sim, T: SimShip, ri: number, tile: number, h: HitSpec, x: number, y: number) {
  const room = T.rooms[ri];
  const s = room.sys;
  if (h.dmg > 0) {
    let hull = h.dmg;
    if (T.side === 0 && T.augments.includes("brass-plating") && sim.rng.chance(0.15)) {
      hull = 0;
      sim.emit({ type: "plating", side: 0, x, y });
    }
    if (hull > 0) sim.damageHull(T, hull, h.from);
    if (s) damageSystem(sim, T, s, h.dmg + h.sysBonus);
    for (const c of sim.crew) {
      if (c.dead || c.ship !== T.side || T.tileRoom[c.tile] !== ri) continue;
      hurt(sim, c, h.dmg * h.crewDmg * (c.armour ?? 1) * (h.from === 1 ? difficultyRules(sim.setup.difficulty).enemyDamage : 1), null);
    }
    if (h.fire > 0 && sim.rng.chance(h.fire)) startFire(sim, T, tile);
    if (h.breach > 0 && sim.rng.chance(h.breach)) startBreach(sim, T, tile);
    T.hitT = 0;
    sim.emit({ type: "hit", side: T.side, x, y, n: h.dmg, room: ri, kind: h.kind });
  }
  if (h.ion > 0) {
    if (s) applyIon(sim, T, s, h.ion);
    sim.emit({ type: "ion-hit", side: T.side, x, y, n: h.ion, room: ri });
  }
}

// ─── Beams ──────────────────────────────────────────────────────────────────────────────────────────────────

function fireBeam(sim: Sim, ship: SimShip, w: SimWeapon, target: Target, volley: number) {
  const T = sim.ships[other(ship.side)];
  let x0: number;
  let y0: number;
  let x1: number;
  let y1: number;
  if (target.kind === "beam") ({ x0, y0, x1, y1 } = target);
  else {
    const [ax, ay] = aimPoint(sim, T, target);
    x0 = ax;
    y0 = ay;
    const ang = sim.rng.next() < 0.5 ? 0 : Math.PI;
    x1 = ax + Math.cos(ang) * (w.def.beamLength ?? 2);
    y1 = ay + (sim.rng.next() - 0.5) * 0.4;
  }
  // Clamp the beam to its length.
  const len = w.def.beamLength ?? 2;
  const d = Math.hypot(x1 - x0, y1 - y0);
  if (d > len) {
    x1 = x0 + ((x1 - x0) / d) * len;
    y1 = y0 + ((y1 - y0) / d) * len;
  }
  const b: BeamShot = {
    id: ++sim.nextId, from: ship.side, to: T.side, def: w.def, slot: w.slot, x0, y0, x1, y1, t: 0,
    delay: FLIGHT.beam[0] + FLIGHT.beam[1], dur: 0.9 + len * 0.08, hit: [], started: false, dmg: 0, ion: w.def.ion ?? 0,
    blocked: false, missed: false, volley, source: `w${ship.side}:${w.slot}`, done: false, cx: x0, cy: y0,
  };
  sim.beams.push(b);
  if (ship.side === 0) sim.stats.shotsFired++;
}

/** Rooms a beam line crosses, in order. */
export function beamRooms(T: SimShip, b: { x0: number; y0: number; x1: number; y1: number }): number[] {
  const out: number[] = [];
  const steps = Math.max(2, Math.ceil(Math.hypot(b.x1 - b.x0, b.y1 - b.y0) * 8));
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const x = b.x0 + (b.x1 - b.x0) * f;
    const y = b.y0 + (b.y1 - b.y0) * f;
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= T.cols || ty >= T.rows) continue;
    const r = T.tileRoom[ty * T.cols + tx];
    if (r >= 0 && !out.includes(r)) out.push(r);
  }
  return out;
}

export function updateBeams(sim: Sim, dt: number) {
  for (const b of sim.beams) {
    if (b.done) continue;
    const T = sim.ships[b.to];
    b.t += dt;
    if (b.t < b.delay) continue;
    if (!b.started) {
      b.started = true;
      if (T.dead) {
        b.done = true;
        continue;
      }
      if (T.veilT > 0 && sim.rng.next() * 100 < T.evasion) {
        b.missed = true;
        sim.emit({ type: "miss", side: T.side, x: b.x0, y: b.y0, kind: "beam" });
      } else {
        const rooms = beamRooms(T, b);
        if (b.from === 0) sim.stats.shotsHit++;
        if (sim.specialShield(T, b.source, Math.max(1, rooms.length), b.x0, b.y0)) b.blocked = true;
        else {
          let shields = T.shields;
          if (b.ion > 0 && shields > 0 && T.sys.shields) {
            // The chime rings the mesh: one layer ionised away.
            T.shields--;
            shields--;
            applyIon(sim, T, T.sys.shields, 1);
            sim.emit({ type: "shield-hit", side: T.side, x: b.x0, y: b.y0, kind: "ion" });
          }
          b.dmg = Math.max(0, b.def.damage - shields);
          if (b.dmg <= 0 && !(b.ion > 0 && shields === 0)) {
            b.blocked = true;
            sim.emit({ type: "beam-blocked", side: T.side, x: b.x0, y: b.y0 });
          }
        }
      }
      sim.emit({ type: "beam-start", side: T.side, x: b.x0, y: b.y0, kind: b.def.color });
    }
    const f = Math.min(1, (b.t - b.delay) / b.dur);
    b.cx = b.x0 + (b.x1 - b.x0) * f;
    b.cy = b.y0 + (b.y1 - b.y0) * f;
    if (!b.blocked && !b.missed && !T.dead) {
      const tx = Math.floor(b.cx);
      const ty = Math.floor(b.cy);
      if (tx >= 0 && ty >= 0 && tx < T.cols && ty < T.rows) {
        const tile = ty * T.cols + tx;
        const ri = T.tileRoom[tile];
        if (ri >= 0 && !b.hit.includes(ri)) {
          b.hit.push(ri);
          hitRoom(sim, T, ri, tile, {
            dmg: b.dmg, ion: b.ion, fire: b.def.fireChance, breach: 0, crewDmg: b.def.crewDamage ?? TUNING.crewPerDamage,
            sysBonus: 0, from: b.from, kind: "beam",
          }, b.cx, b.cy);
        }
      }
    }
    if (f >= 1) b.done = true;
  }
  if (sim.beams.length > 16) sim.beams = sim.beams.filter((b) => !b.done || sim.t - b.t < 0);
}

export { effective };
