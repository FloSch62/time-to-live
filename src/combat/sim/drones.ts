// Drones: firewall (defence), relay (combat), rigger (hull repair), bulwark (anti-drone), crawler (boarding).
// Positions are in the tiles of the ship they fly around (`at`): defence/repair drones orbit their own ship, combat
// and anti-drone drones orbit the enemy.
import type { SimDrone, SimShip, Side } from "./model.ts";
import { other } from "./model.ts";
import type { Sim } from "./sim.ts";
import { spawnLocalShot } from "./weapons.ts";
import { effective, syncBayPower } from "./power.ts";

export function orbit(ship: SimShip, d: SimDrone, t: number): [number, number] {
  const cx = ship.cols / 2;
  const cy = ship.rows / 2;
  const rx = ship.cols / 2 + 1.2;
  const ry = ship.rows / 2 + 0.9;
  const a = d.ang + t * (0.35 + d.slot * 0.07) * (d.slot % 2 ? -1 : 1);
  return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
}

/** Deploy a powered drone (spends a spare for the player). */
export function deploy(sim: Sim, ship: SimShip, d: SimDrone): boolean {
  if (d.out || !d.powered || ship.dead) return false;
  if (ship.side === 0) {
    if (ship.spares <= 0) return false;
    ship.spares--;
  }
  d.out = true;
  d.launch = 0;
  d.deployed++;
  d.used = 0;
  d.cd = d.def.cooldown * 0.6;
  const foe = sim.ships[other(ship.side)];
  d.at = d.def.kind === "combat" || d.def.kind === "anti" ? foe.side : ship.side;
  if (d.def.kind === "boarding") {
    // A crawler flies across as a projectile, then bores in.
    const rooms = foe.rooms.filter((r) => r.sys);
    const room = sim.rng.pick(rooms.length ? rooms : foe.rooms);
    const p = spawnLocalShot(sim, ship.side, foe.side, 0, 0, { kind: "room", room: room.i }, {
      dmg: 0, kind: "crawler", source: `d${ship.side}:${d.slot}`, t2: 1.4, fromShip: true,
    });
    p.ox = ship.cols / 2;
    p.oy = -0.5;
    p.t1 = 0.8;
    d.at = ship.side;
    d.body = -2; // in flight
    (p as { drone?: number }).drone = d.slot;
  }
  const [x, y] = orbit(sim.ships[d.at], d, sim.t);
  d.x = x;
  d.y = y;
  sim.emit({ type: "drone-launch", side: ship.side, slot: d.slot, kind: d.def.kind });
  return true;
}

export function destroyDrone(sim: Sim, ship: SimShip, d: SimDrone, why = "shot") {
  if (!d.out) return;
  d.out = false;
  sim.emit({ type: "drone-down", side: d.at, x: d.x, y: d.y, kind: why, slot: d.slot, n: ship.side });
  if (d.def.kind === "boarding" && d.body >= 0) {
    const c = sim.crew.find((q) => q.uid === d.body);
    if (c && !c.dead) {
      c.hp = 0;
      c.dead = true;
      c.deadT = 0;
      sim.emit({ type: "crew-stopped", side: c.ship, uid: c.uid });
    }
  }
  d.body = -1;
}

export function updateDrones(sim: Sim, ship: SimShip, dt: number) {
  const foe = sim.ships[other(ship.side)];
  const bay = ship.sys.drones;
  for (const d of ship.drones) {
    if (!d.powered && d.out) destroyDrone(sim, ship, d, "unpowered");
    if (!d.out) {
      // Enemies launch their drones on their own; the player launches by powering (auto-launch too, like FTL).
      if (d.powered && effective(bay) > 0 && !ship.dead && !sim.outcome) deploy(sim, ship, d);
      continue;
    }
    if (ship.dead || foe.dead) continue;
    d.launch = Math.min(1, d.launch + dt * 1.2);
    if (d.stun > 0) {
      d.stun -= dt;
      continue;
    }
    const around = sim.ships[d.at];
    const [x, y] = orbit(around, d, sim.t);
    d.x += (x - d.x) * Math.min(1, dt * 3);
    d.y += (y - d.y) * Math.min(1, dt * 3);
    d.cd -= dt * (1 + ship.mods.droneCharge);
    if (d.cd > 0) continue;
    switch (d.def.kind) {
      case "combat": {
        // While the Regent's gate is sealed a combat drone is the tender's second voice: it works the gate itself,
        // so a drone and a gun can prove "a second way home" together. Otherwise it harries a random room.
        const gate = foe.boss.gate?.up && foe.sys.gate ? foe.rooms[foe.sys.gate.room] : null;
        if (gate) {
          // It answers the tender's gun: a charged bolt waits (up to a few seconds) for a gun's bolt to be about to
          // land on the gate, or to have just landed, so the two routes arrive inside the gate's 2.2 s window.
          const g = foe.boss.gate!;
          const answered = g.locks.some((l) => l.source.startsWith(`w${ship.side}:`) && sim.t - l.t < 1.5);
          const inbound = sim.projectiles.some((p) => !p.dead && p.from === ship.side && p.to === foe.side && p.source.startsWith("w")
            && p.target.kind !== "adj" && p.t1 + p.t2 - p.t < 1.2);
          if (!answered && !inbound && d.cd > -5) continue;
        }
        const room = gate ?? sim.rng.pick(foe.rooms);
        spawnLocalShot(sim, ship.side, foe.side, d.x, d.y, { kind: "room", room: room.i }, {
          dmg: d.def.damage, source: `d${ship.side}:${d.slot}`, color: "teal", kind: "drone",
        });
        if (ship.side === 0) sim.stats.shotsFired++;
        sim.emit({ type: "drone-fire", side: ship.side, slot: d.slot, x: d.x, y: d.y, n: d.at });
        d.cd = d.def.cooldown;
        break;
      }
      case "defence": {
        // Shoot down incoming payloads, debris and crawlers in their arrival leg.
        let best = null;
        for (const p of sim.projectiles) {
          if (p.dead || p.claimed || p.to !== ship.side) continue;
          if (p.kind !== "payload" && p.kind !== "debris" && p.kind !== "crawler") continue;
          if (p.t < p.t1 + p.t2 * 0.25) continue;
          if (!best || p.t / (p.t1 + p.t2) > best.t / (best.t1 + best.t2)) best = p;
        }
        if (best) {
          best.claimed = true;
          best.dead = true;
          sim.emit({ type: "shot-down", side: ship.side, x: best.px, y: best.py, n: best.id, slot: d.slot, kind: best.kind });
          if (best.kind === "crawler") sim.crawlerShot(best);
          d.cd = d.def.cooldown;
        } else d.cd = 0.1;
        break;
      }
      case "anti": {
        const targets = sim.ships[foe.side].drones.filter((q) => q.out && q.launch >= 1);
        if (targets.length) {
          const t = sim.rng.pick(targets);
          sim.emit({ type: "drone-fire", side: ship.side, slot: d.slot, x: d.x, y: d.y, n: d.at, kind: "anti" });
          if (sim.rng.chance(0.85)) destroyDrone(sim, foe, t, "shot");
          d.cd = d.def.cooldown;
        } else d.cd = 0.3;
        break;
      }
      case "repair": {
        if (ship.hull < ship.hullMax) {
          ship.hull = Math.min(ship.hullMax, ship.hull + d.def.damage);
          d.used += d.def.damage;
          sim.emit({ type: "hull-repair", side: ship.side, x: d.x, y: d.y });
          if (d.used >= (d.def.capacity ?? 4)) {
            destroyDrone(sim, ship, d, "spent");
            d.deployed = Math.max(0, d.deployed - 1); // spent drones are never recovered
            d.powered = false;
            d.want = false;
            syncBayPower(ship);
          }
        }
        d.cd = d.def.cooldown;
        break;
      }
      case "boarding":
        d.cd = 1;
        break;
    }
  }
}

export function aliveDrones(sim: Sim, side: Side): SimDrone[] {
  return sim.ships[side].drones.filter((d) => d.out);
}
