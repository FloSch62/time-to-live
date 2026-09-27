// Crew: creation, walking (decks, doors, service lifts), automatic tasks in their room (fight, fires, breaches, repairs,
// stations), environment damage, healing and skills. Also boarders, escort automatons and crawler bodies.
import type { SkillId, CrewMember } from "../../game/types.ts";
import type { BoarderId, SpeciesId } from "../../game/ids.ts";
import { SPECIES, BOARDERS, ESCORT_AUTOMATON, CRAWLER_BODY, MAN_BONUS, skillLevel, emptyXp } from "../../data/species.ts";
import { TUNING } from "../../data/systems.ts";
import type { SimCrew, SimShip, Side } from "./model.ts";
import type { Sim } from "./sim.ts";
import { findPath, distances } from "./path.ts";
import { doorKey } from "./build.ts";
import { effective, usable, damageSystem } from "./power.ts";
import { doorOpen, startBreach } from "./env.ts";

const MANNED = new Set(["shields", "engines", "weapons", "helm", "sensors", "doors"]);

let UID = 1;

function base(side: Side, ship: Side, tile: number, cols: number): Pick<SimCrew, "side" | "ship" | "tile" | "x" | "y" | "path" | "dest" | "task" | "target" | "dead" | "deadT" | "facing" | "climbing" | "taskT" | "kills" | "repairs" | "hurtT" | "healT" | "think" | "orderRoom" | "stationRoom"> {
  const x = tile % cols;
  const y = (tile - x) / cols;
  return {
    side, ship, tile, x: x + 0.5, y: y + 0.5, path: [], dest: -1, task: "idle", target: -1, dead: false, deadT: 0,
    facing: side === 0 ? 1 : -1, climbing: false, taskT: 0, kills: 0, repairs: 0, hurtT: 9, healT: 9, think: 0,
    orderRoom: -1, stationRoom: -1,
  };
}

export function makeCrewFromMember(m: CrewMember, side: Side, tile: number, cols: number): SimCrew {
  const sp = SPECIES[m.species];
  return {
    uid: UID++, id: m.id, name: m.name, kind: "crew", species: m.species, hp: Math.min(m.hp, sp.hp), maxHp: sp.hp,
    move: sp.move, repair: sp.repair, combat: sp.combat, breathes: sp.breathes, fireMul: sp.fireMul, learn: sp.learn,
    medbay: sp.medbay, armour: 1, sabotage: 0, doorCut: 1, breacher: false, xp: { ...emptyXp(), ...m.xp }, member: m,
    ...base(side, side, tile, cols),
  };
}

export function makeHumanCrew(species: SpeciesId, name: string, side: Side, tile: number, cols: number): SimCrew {
  const sp = SPECIES[species];
  return {
    uid: UID++, id: `e${UID}`, name, kind: "crew", species, hp: sp.hp, maxHp: sp.hp, move: sp.move, repair: sp.repair,
    combat: sp.combat, breathes: sp.breathes, fireMul: sp.fireMul, learn: sp.learn, medbay: sp.medbay, armour: 1,
    sabotage: 0, doorCut: 1, breacher: false, xp: emptyXp(), ...base(side, side, tile, cols),
  };
}

export function makeEscort(side: Side, tile: number, cols: number, n: number): SimCrew {
  const e = ESCORT_AUTOMATON;
  return {
    uid: UID++, id: `esc${UID}`, name: `${e.name} ${n}`, kind: "escort", species: "escort", hp: e.hp, maxHp: e.hp,
    move: e.move, repair: e.repair, combat: e.combat, breathes: false, fireMul: 1, learn: 0, medbay: false, armour: 1,
    sabotage: 0, doorCut: 1, breacher: false, xp: emptyXp(), ...base(side, side, tile, cols),
  };
}

export function makeBoarder(kind: BoarderId, side: Side, onShip: Side, tile: number, cols: number): SimCrew {
  const b = BOARDERS[kind];
  return {
    uid: UID++, id: `b${UID}`, name: b.name, kind: "boarder", species: kind, hp: b.hp, maxHp: b.hp, move: b.move,
    repair: 0, combat: b.combat, breathes: false, fireMul: 1, learn: 0, medbay: false, armour: b.armour,
    sabotage: b.sabotage, doorCut: b.doorCut, breacher: b.breacher, xp: emptyXp(), ...base(side, onShip, tile, cols),
  };
}

export function makeCrawler(side: Side, onShip: Side, tile: number, cols: number): SimCrew {
  const b = CRAWLER_BODY;
  return {
    uid: UID++, id: `cr${UID}`, name: b.name, kind: "crawler", species: "crawler", hp: b.hp, maxHp: b.hp, move: b.move,
    repair: 0, combat: b.combat, breathes: false, fireMul: 0.5, learn: 0, medbay: false, armour: 1,
    sabotage: b.sabotage, doorCut: 1.5, breacher: false, xp: emptyXp(), ...base(side, onShip, tile, cols),
  };
}

// ─── queries ────────────────────────────────────────────────────────────────────────────────────────────────

export function isHostileTo(c: SimCrew, ship: SimShip): boolean {
  return c.side !== ship.side;
}

/** Tiles in a room already taken (standing or heading there) by crew of `side`. */
export function takenTiles(sim: Sim, ship: SimShip, side: Side, except?: SimCrew): Set<number> {
  const s = new Set<number>();
  for (const c of sim.crew) {
    if (c.dead || c === except || c.ship !== ship.side || c.side !== side) continue;
    s.add(c.path.length ? c.dest : c.tile);
  }
  return s;
}

/** Pick a free tile in a room for `c` (station first for system rooms). */
export function freeTileIn(sim: Sim, ship: SimShip, room: number, c: SimCrew): number {
  const r = ship.rooms[room];
  const taken = takenTiles(sim, ship, c.side, c);
  const friendly = c.side === ship.side;
  if (friendly && r.station >= 0 && !taken.has(r.station)) return r.station;
  // Prefer the tile closest to the crew member's current position.
  let best = -1;
  let bd = Infinity;
  for (const t of r.tiles) {
    if (taken.has(t)) continue;
    const tx = (t % ship.cols) + 0.5;
    const ty = Math.floor(t / ship.cols) + 0.5;
    const d = Math.abs(tx - c.x) + Math.abs(ty - c.y) * 2 + (t === r.station ? -0.1 : 0);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best;
}

/** Send a crew member to a room. Returns false if the room is full or unreachable. */
export function orderMove(sim: Sim, c: SimCrew, room: number, exactTile = -1): boolean {
  if (c.dead) return false;
  const ship = sim.ships[c.ship];
  const tile = exactTile >= 0 ? exactTile : freeTileIn(sim, ship, room, c);
  if (tile < 0) return false;
  const start = c.path.length ? c.path[0] : c.tile;
  const hostile = c.side !== ship.side;
  const p = tile === start ? [] : findPath(ship, start, tile, hostile);
  if (tile !== start && p.length === 0) return false;
  c.path = c.path.length && start !== c.tile ? [start, ...p] : p;
  c.dest = tile;
  c.orderRoom = room;
  c.task = c.path.length ? "walk" : "idle";
  c.taskT = 0;
  return true;
}

export function addXp(c: SimCrew, skill: SkillId, n: number) {
  if (c.kind !== "crew" || c.side !== 0) return;
  c.xp[skill] = (c.xp[skill] ?? 0) + n * c.learn;
}

export function crewTile(ship: SimShip, c: SimCrew): [number, number] {
  const x = c.tile % ship.cols;
  return [x, (c.tile - x) / ship.cols];
}

// ─── per tick ───────────────────────────────────────────────────────────────────────────────────────────────

const combatXpAcc = new WeakMap<SimCrew, number>();

export function updateCrew(sim: Sim, dt: number) {
  for (const ship of sim.ships) for (const room of ship.rooms) {
    if (!room.lift || room.lift.rider === null) continue;
    const rider = sim.crew.find(c => c.uid === room.lift!.rider);
    if (!rider || rider.dead || rider.ship !== ship.side || !rider.path.length) room.lift.rider = null;
  }
  for (const c of sim.crew) {
    if (c.dead) {
      c.deadT += dt;
      continue;
    }
    c.hurtT += dt;
    c.healT += dt;
    const ship = sim.ships[c.ship];
    if (c.path.length) walk(sim, ship, c, dt);
    if (!c.path.length) act(sim, ship, c, dt);
    environment(sim, ship, c, dt);
  }
  // Remove long-dead boarders/crawlers from the list? Keep them for the fade animation; the renderer skips old ones.
}

function walk(sim: Sim, ship: SimShip, c: SimCrew, dt: number) {
  const next = c.path[0];
  const nx = (next % ship.cols) + 0.5;
  const ny = Math.floor(next / ship.cols) + 0.5;
  const vertical = Math.abs(ny - c.y) > 0.01 && Math.abs(nx - c.x) < 0.01;
  const shaft = ship.rooms[ship.tileRoom[c.tile]]?.lift;
  if (vertical && shaft) {
    if (shaft.rider !== null && shaft.rider !== c.uid) {
      c.climbing = false;
      return;
    }
    if (shaft.rider === null) {
      const distance = c.y - shaft.y;
      shaft.y += Math.sign(distance) * Math.min(Math.abs(distance), dt / 0.6);
      if (Math.abs(shaft.y - c.y) > 0.01) return;
      shaft.rider = c.uid;
    }
  }
  // Crossing into another room: doors/hatches.
  const rFrom = ship.tileRoom[c.tile];
  const rTo = ship.tileRoom[next];
  if (rFrom !== rTo && next !== c.tile) {
    const di = ship.doorAt.get(doorKey(c.tile, next));
    if (di !== undefined) {
      const d = ship.doors[di];
      if (c.side === ship.side) d.held = Math.max(d.held, 0.45);
      else if (!doorOpen(d)) {
        // Boarders cut through closed doors.
        c.task = "door";
        c.target = di;
        c.taskT += dt;
        d.hp -= dt * 11 * c.doorCut;
        c.facing = nx > c.x ? 1 : nx < c.x ? -1 : c.facing;
        if (d.hp <= 0) {
          d.broken = 10;
          sim.emit({ type: "door-broken", side: ship.side, n: di });
        }
        return;
      }
    }
  }
  c.task = "walk";
  c.climbing = vertical;
  const speed = vertical ? 1 / 0.6 : TUNING.crewWalk * c.move;
  const dx = nx - c.x;
  const dy = ny - c.y;
  const dist = Math.hypot(dx, dy);
  if (Math.abs(dx) > 0.01) c.facing = dx > 0 ? 1 : -1;
  const step = speed * dt;
  if (dist <= step) {
    c.x = nx;
    c.y = ny;
    c.tile = next;
    c.path.shift();
    if (!c.path.length) {
      c.task = "idle";
      c.climbing = false;
    }
  } else {
    c.x += (dx / dist) * step;
    c.y += (dy / dist) * step;
  }
  if (shaft?.rider === c.uid) {
    shaft.y = c.y;
    if (!vertical || !c.path.length) shaft.rider = null;
  }
}

/** Automatic behaviour of a crew member standing in a room. */
function act(sim: Sim, ship: SimShip, c: SimCrew, dt: number) {
  c.climbing = false;
  const ri = ship.tileRoom[c.tile];
  if (ri < 0) return;
  const room = ship.rooms[ri];
  const friendly = c.side === ship.side;
  // 1. Fight anyone hostile in the room.
  let foe: SimCrew | null = null;
  let fd = Infinity;
  for (const o of sim.crew) {
    if (o.dead || o.ship !== c.ship || o.side === c.side) continue;
    if (ship.tileRoom[o.tile] !== ri) continue;
    const d = Math.abs(o.x - c.x);
    if (d < fd) {
      fd = d;
      foe = o;
    }
  }
  if (foe) {
    if (c.task !== "fight") c.taskT = 0;
    c.task = "fight";
    c.target = foe.uid;
    c.taskT += dt;
    c.facing = foe.x >= c.x ? 1 : -1;
    const bonus = c.kind === "crew" ? MAN_BONUS.combatDamage[skillLevel(c.xp, "combat")] : 1;
    const dmg = TUNING.meleeDps * c.combat * bonus * foe.armour * dt;
    hurt(sim, foe, dmg, c);
    if (c.kind === "crew" && c.side === 0) {
      const acc = (combatXpAcc.get(c) ?? 0) + dmg;
      if (acc >= 12) {
        addXp(c, "combat", 1);
        combatXpAcc.set(c, acc - 12);
      } else combatXpAcc.set(c, acc);
    }
    return;
  }
  if (!friendly) {
    hostileAct(sim, ship, c, ri, dt);
    return;
  }
  // 2. Fires, then breaches: walk to the nearest one in this room and work it.
  const workTile = nearestWork(ship, room.tiles, c);
  if (workTile >= 0) {
    if (workTile !== c.tile) {
      const p = findPath(ship, c.tile, workTile);
      if (p.length) {
        c.path = p;
        c.dest = workTile;
        return;
      }
    }
    const rate = c.repair * MAN_BONUS.repairSpeed[skillLevel(c.xp, "repair")] * (1 + ship.mods.repair);
    if (ship.fire[c.tile] > 0) {
      c.task = "fire";
      ship.fire[c.tile] -= TUNING.fireFight * rate * dt;
      if (ship.fire[c.tile] <= 0) {
        ship.fire[c.tile] = 0;
        addXp(c, "repair", 0.5);
        sim.emit({ type: "fire-out", side: ship.side, n: c.tile });
      }
    } else {
      c.task = "breach";
      ship.breach[c.tile] -= TUNING.breachRepair * rate * dt;
      if (ship.breach[c.tile] <= 0) {
        ship.breach[c.tile] = 0;
        c.repairs++;
        addXp(c, "repair", 1);
        sim.emit({ type: "breach-fixed", side: ship.side, n: c.tile });
      }
    }
    return;
  }
  // 3. Repair the room's system.
  const s = room.sys;
  if (s && s.damage > 0) {
    c.task = "repair";
    const rate = c.repair * MAN_BONUS.repairSpeed[skillLevel(c.xp, "repair")] * (1 + ship.mods.repair);
    s.repair += (dt * rate) / TUNING.repairBar;
    if (c.species === "rigger") c.hp = Math.min(c.maxHp, c.hp + dt);
    if (s.repair >= 1) {
      s.repair = 0;
      s.damage--;
      s.wear = 0;
      c.repairs++;
      addXp(c, "repair", 1);
      sim.emit({ type: "repaired", side: ship.side, room: ri });
    }
    return;
  }
  // 4. Stations.
  if (s && MANNED.has(s.id) && room.station >= 0) {
    if (c.tile === room.station) {
      c.task = usable(s) > 0 ? "man" : "idle";
      if (room.stationDir === "left") c.facing = -1;
      else if (room.stationDir === "right") c.facing = 1;
      return;
    }
    // Step onto the free station.
    const taken = takenTiles(sim, ship, c.side, c);
    if (!taken.has(room.station) && c.kind !== "escort") {
      const p = findPath(ship, c.tile, room.station);
      if (p.length) {
        c.path = p;
        c.dest = room.station;
        return;
      }
    }
  }
  c.task = "idle";
}

function nearestWork(ship: SimShip, tiles: number[], c: SimCrew): number {
  let best = -1;
  let bd = Infinity;
  for (const pass of [ship.fire, ship.breach]) {
    for (const t of tiles) {
      if (pass[t] <= 0) continue;
      const d = Math.abs((t % ship.cols) + 0.5 - c.x) + Math.abs(Math.floor(t / ship.cols) + 0.5 - c.y) * 3;
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    if (best >= 0) return best;
  }
  return best;
}

/** Boarders and crawler bodies: sabotage systems, cut breaches, move on. */
function hostileAct(sim: Sim, ship: SimShip, c: SimCrew, ri: number, dt: number) {
  const room = ship.rooms[ri];
  const s = room.sys;
  if (s && s.damage < s.level) {
    if (c.task !== "sabotage") c.taskT = 0;
    c.task = "sabotage";
    c.taskT += dt;
    s.wear += (dt * c.sabotage) / 7;
    if (s.wear >= 1) {
      s.wear = 0;
      damageSystem(sim, ship, s, 1);
      sim.emit({ type: "sabotage", side: ship.side, room: ri });
    }
    return;
  }
  if (c.breacher) {
    let has = false;
    for (const t of room.tiles) if (ship.breach[t] > 0) has = true;
    if (!has) {
      if (c.task !== "cut") c.taskT = 0;
      c.task = "cut";
      c.taskT += dt;
      if (c.taskT > 5) {
        startBreach(sim, ship, c.tile);
        c.taskT = 0;
      }
      return;
    }
  }
  c.think -= dt;
  if (c.think > 0) {
    c.task = "idle";
    return;
  }
  c.think = 1.5;
  // Next target: the nearest room with a system that still has bars; prefer where crew aren't.
  const dist = distances(ship, c.tile, true);
  let best = -1;
  let bd = Infinity;
  for (const r of ship.rooms) {
    if (r.i === ri || !r.sys || r.sys.damage >= r.sys.level) continue;
    let dmin = Infinity;
    for (const t of r.tiles) dmin = Math.min(dmin, dist[t]);
    const crewThere = sim.crewInRoom(ship.side, r.i, ship.side) ? 6 : 0;
    const score = dmin + crewThere + sim.rng.next() * 2;
    if (score < bd) {
      bd = score;
      best = r.i;
    }
  }
  if (best >= 0) orderMove(sim, c, best);
  else c.task = "idle";
}

function environment(sim: Sim, ship: SimShip, c: SimCrew, dt: number) {
  const ri = ship.tileRoom[c.tile];
  if (ri < 0) return;
  const room = ship.rooms[ri];
  if (c.breathes && room.o2 < TUNING.suffocateAt) hurt(sim, c, TUNING.suffocateDps * dt, null);
  if (ship.fire[c.tile] > 0) hurt(sim, c, TUNING.fireDps * c.fireMul * dt, null);
  if (c.dead) return;
  // Healing.
  let heal = 0;
  const med = ship.sys.medbay;
  if (med && med.room === ri && c.side === ship.side && c.medbay && c.kind === "crew") {
    const lv = effective(med);
    if (lv > 0) heal += TUNING.medbayHps[Math.min(3, lv)];
  }
  if (c.side === 0 && c.kind === "crew" && sim.ships[0].augments.includes("bench-kit")) heal += TUNING.benchKitHps;
  if (c.side === ship.side && c.kind === "crew" && room.bench > 0) heal += room.bench;
  if (heal > 0 && c.hp < c.maxHp) {
    c.hp = Math.min(c.maxHp, c.hp + heal * dt);
    c.healT = 0;
  }
}

export function hurt(sim: Sim, c: SimCrew, dmg: number, by: SimCrew | null) {
  if (c.dead || dmg <= 0) return;
  c.hp -= dmg;
  if (dmg > 0.5) c.hurtT = 0;
  else if (c.hurtT > 0.4) c.hurtT = 0.2;
  if (c.hp <= 0) {
    c.hp = 0;
    c.dead = true;
    c.deadT = 0;
    c.path = [];
    c.task = "idle";
    if (by) by.kills++;
    sim.crewDied(c);
  }
}

export function crewAt(sim: Sim, side: Side, tile: number): SimCrew | null {
  for (const c of sim.crew) if (!c.dead && c.ship === side && c.tile === tile) return c;
  return null;
}

/** Dockside movement shares real doors and lifts, without combat, damage, healing or XP ticks. */
export function updateDeckMovement(sim: Sim, dt: number) {
  const ship = sim.ships[0];
  sim.t += dt;
  for (const d of ship.doors) d.held = Math.max(0, d.held - dt);
  for (const r of ship.rooms) if (r.lift?.rider !== null && r.lift) {
    const c = sim.crew.find(c => c.uid === r.lift!.rider);
    if (!c || !c.path.length) r.lift.rider = null;
  }
  for (const c of sim.playerCrew()) {
    if (c.path.length) walk(sim, ship, c, dt);
    else {
      const room = ship.rooms[ship.tileRoom[c.tile]];
      c.task = room?.station === c.tile ? "man" : "idle";
    }
  }
  sim.takeEvents();
}
