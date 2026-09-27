// Air, fire, breaches and doors.
import { TUNING } from "../../data/systems.ts";
import type { SimShip } from "./model.ts";
import type { Sim } from "./sim.ts";
import { effective, usable, damageSystem } from "./power.ts";

export function doorOpen(d: { open: boolean; held: number; broken: number }): boolean {
  return d.open || d.held > 0 || d.broken > 0;
}

export function startFire(sim: Sim, ship: SimShip, tile: number): boolean {
  if (tile < 0 || ship.tileRoom[tile] < 0 || ship.fire[tile] > 0) return false;
  const room = ship.rooms[ship.tileRoom[tile]];
  if (room.o2 < 15) return false;
  ship.fire[tile] = TUNING.fireHp;
  sim.emit({ type: "fire-start", side: ship.side, room: room.i, n: tile });
  return true;
}

export function startBreach(sim: Sim, ship: SimShip, tile: number): boolean {
  if (tile < 0 || ship.tileRoom[tile] < 0 || ship.breach[tile] > 0) return false;
  ship.breach[tile] = TUNING.breachHp;
  sim.emit({ type: "breach", side: ship.side, room: ship.tileRoom[tile], n: tile });
  return true;
}

export function roomFires(ship: SimShip, room: number): number {
  let n = 0;
  for (const t of ship.rooms[room].tiles) if (ship.fire[t] > 0) n++;
  return n;
}

export function roomBreaches(ship: SimShip, room: number): number {
  let n = 0;
  for (const t of ship.rooms[room].tiles) if (ship.breach[t] > 0) n++;
  return n;
}

export function doorMaxHp(sim: Sim, ship: SimShip): number {
  const lv = effective(ship.sys.doors);
  let hp = TUNING.doorHp[Math.min(3, lv)] ?? TUNING.doorHp[0];
  if (ship.side === 0 || ship.kind === "human") {
    // Manned bulkheads hold longer.
    const s = ship.sys.doors;
    if (s) {
      const room = ship.rooms[s.room];
      for (const c of sim.crew) if (!c.dead && c.side === ship.side && c.ship === ship.side && c.tile === room.station && c.path.length === 0) hp *= 1.5;
    }
  }
  return hp;
}

export function updateEnv(sim: Sim, ship: SimShip, dt: number) {
  const { rooms, fire, breach, doors } = ship;
  const hz = sim.setup.hazard;
  // ── Doors
  const maxHp = doorMaxHp(sim, ship);
  for (const d of doors) {
    if (d.held > 0) d.held -= dt;
    if (d.broken > 0) {
      d.broken -= dt;
      if (d.broken <= 0) d.hp = maxHp;
    } else if (d.hp < maxHp) d.hp = Math.min(maxHp, d.hp + dt * 4);
    const target = doorOpen(d) ? 1 : 0;
    if (d.anim !== target) d.anim = target > d.anim ? Math.min(1, d.anim + dt * 5) : Math.max(0, d.anim - dt * 5);
  }

  // ── Air
  const air = ship.sys.air;
  const airLv = effective(air);
  const machine = ship.kind === "machine" || ship.kind === "autopilot";
  let refill = 0;
  if (airLv > 0) refill = TUNING.airRefill[Math.min(3, airLv)];
  else if (machine && !air) refill = 1.2; // machines keep their holds pressurised passively
  for (const r of rooms) {
    if (refill > 0) r.o2 = Math.min(100, r.o2 + refill * dt);
    else r.o2 = Math.max(0, r.o2 - TUNING.airDecay * ship.mods.airDecay * dt);
    let vents = 0;
    for (const t of r.tiles) {
      if (breach[t] > 0) vents += 7;
      if (fire[t] > 0) r.o2 = Math.max(0, r.o2 - 1.1 * dt);
    }
    if (vents) r.o2 = Math.max(0, r.o2 - vents * dt);
  }
  for (const d of doors) {
    if (!doorOpen(d)) continue;
    if (d.airlock) {
      const r = rooms[d.a];
      r.o2 = Math.max(0, r.o2 - 14 * dt);
      continue;
    }
    const a = rooms[d.a];
    const b = rooms[d.b];
    const na = a.tiles.length;
    const nb = b.tiles.length;
    const flow = (a.o2 - b.o2) * Math.min(1, 2.2 * dt);
    // Conserve air volume: tile counts weight the exchange.
    const moved = flow * (na * nb) / (na + nb);
    a.o2 -= moved / na;
    b.o2 += moved / nb;
  }

  // ── Fire
  const spread = (hz === "ember-draft" ? 0.16 : 0.07) * dt;
  const lit: number[] = [];
  for (let t = 0; t < fire.length; t++) if (fire[t] > 0) lit.push(t);
  for (const t of lit) {
    const ri = ship.tileRoom[t];
    const room = rooms[ri];
    if (room.o2 < 10) fire[t] -= 30 * dt; // starved
    if (ship.side === 0 && ship.augments.includes("sprinkler-runbook") && !sim.crewInRoom(ship.side, ri, ship.side)) fire[t] -= 14 * dt;
    if (fire[t] <= 0) {
      fire[t] = 0;
      continue;
    }
    // Systems slowly burn.
    const s = room.sys;
    if (s && s.damage < s.level) {
      s.wear += dt / 11;
      if (s.wear >= 1) {
        s.wear = 0;
        damageSystem(sim, ship, s, 1);
        sim.emit({ type: "sys-burn", side: ship.side, room: ri });
      }
    }
    // Spread within the room and through open doors.
    if (room.o2 > 20 && sim.rng.chance(spread * 1.5)) {
      const x = t % ship.cols;
      const y = (t - x) / ship.cols;
      const cand: number[] = [];
      if (x > 0) cand.push(t - 1);
      if (x < ship.cols - 1) cand.push(t + 1);
      if (y > 0) cand.push(t - ship.cols);
      if (y < ship.rows - 1) cand.push(t + ship.cols);
      const n = sim.rng.pick(cand);
      const rn = ship.tileRoom[n];
      if (rn === ri) startFire(sim, ship, n);
      else if (rn >= 0) {
        const di = ship.doorAt.get(t < n ? `${t}:${n}` : `${n}:${t}`);
        if (di !== undefined && doorOpen(doors[di]) && sim.rng.chance(0.5)) startFire(sim, ship, n);
      }
    }
  }
  // Doors burn through slowly when a fire sits next to them (FTL): skip; fires stay in their room unless doors open.
  void usable;
}
