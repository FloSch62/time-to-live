// Build sim ships from the player's ShipState (a consist of cars, ★v2.1) and from scaled enemy definitions. Doors
// between horizontally adjacent rooms and hatches (ladders) between vertically adjacent rooms are generated here,
// one per room pair, at the middle of the shared edge (★v2); consists add gangway doors / keel hatches.
import type { ShipState } from "../../game/types.ts";
import type { SystemId } from "../../game/ids.ts";
import type { LayoutDef, SysKey } from "../../data/layouts.ts";
import { enemyLayout } from "../../data/layouts.ts";
import { composeConsist, consistStats, normalizeShip } from "../../data/consist.ts";
import { weaponDef } from "../../data/weapons.ts";
import { DRONES } from "../../data/drones.ts";
import { MODULES } from "../../data/modules.ts";
import { CARS } from "../../data/cars.ts";
import { SYSTEMS, TUNING } from "../../data/systems.ts";
import type { ScaledEnemy } from "../../data/enemies.ts";
import type { SimDoor, SimRoom, SimShip, SimSystem, SimWeapon, SimDrone, Side, SimAdjunct } from "./model.ts";

export function emptySystem(id: SysKey, room: number, level: number): SimSystem {
  return { id, room, level, damage: 0, power: 0, want: 0, ion: 0, ionT: 0, repair: 0, wear: 0, bonus: 0, rust: 0 };
}

function shipFromLayout(L: LayoutDef, side: Side, defId: string, name: string): SimShip {
  const rooms: SimRoom[] = L.rooms.map((r, i) => {
    const tiles: number[] = [];
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tiles.push(y * L.cols + x);
    return {
      ...(r.lift ? { lift: { y: r.y + 0.5, rider: null } } : {}),
      i, id: r.id, name: r.name, x: r.x, y: r.y, w: r.w, h: r.h, sys: null, o2: 100,
      station: r.station ? r.station[1] * L.cols + r.station[0] : -1, stationDir: r.stationDir ?? null, tiles, bench: 0,
    };
  });
  const tileRoom = new Int16Array(L.cols * L.rows).fill(-1);
  for (const r of rooms) for (const t of r.tiles) tileRoom[t] = r.i;
  const ship: SimShip = {
    side, defId, name, face: L.face, cols: L.cols, rows: L.rows, rooms, tileRoom,
    fire: new Float32Array(L.cols * L.rows), breach: new Float32Array(L.cols * L.rows),
    doors: [], doorAt: new Map(), systems: [], sys: {}, reactor: 0, hull: 1, hullMax: 1, weapons: [], drones: [],
    shields: 0, shieldT: 0, hop: 0, veilT: 0, veilCd: 0, evasion: 0, augments: [], payloads: 0, spares: 0,
    kind: side === 0 ? "player" : "machine", mobility: side === 0 ? "player" : "crawler", adjuncts: [], boss: {},
    dead: false, deadT: 0, fleeing: false, chargeMul: 1, bonusLayers: 0, aiT: 0, holdT: 0, salvoOk: true, broodT: 0, repairArmT: 0, hitT: 99,
    tileCar: L.tileCar ?? null, mods: { sensors: 0, repair: 0, airDecay: 1, evasion: 0, weaponCharge: 0, droneCharge: 0, veilCooldown: 0, debrisProtection: 0 },
  };
  buildDoors(ship, L);
  return ship;
}

export const doorKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

function buildDoors(ship: SimShip, L: LayoutDef) {
  const { cols, rows, tileRoom } = ship;
  const car = L.tileCar;
  const pairs = new Map<string, { hatch: boolean; edges: [number, number][] }>();
  const add = (t: number, n: number, hatch: boolean) => {
    const ra = tileRoom[t];
    const rb = tileRoom[n];
    if (ra < 0 || rb < 0 || ra === rb) return;
    if (car && car[t] !== car[n]) return; // cars connect only through their couplers
    const k = `${hatch ? "h" : "d"}${Math.min(ra, rb)}:${Math.max(ra, rb)}`;
    const p = pairs.get(k) ?? { hatch, edges: [] };
    p.edges.push([t, n]);
    pairs.set(k, p);
  };
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = y * cols + x;
      if (x + 1 < cols) add(t, t + 1, false);
      // Vertical travel stays inside lift shafts. Car connectors are explicit below.
    }
  }
  const hp = TUNING.doorHp[1];
  const push = (ta: number, tb: number, hatch: boolean) => {
    const ax = ta % cols;
    const ay = Math.floor(ta / cols);
    const bx = tb % cols;
    const d: SimDoor = {
      i: ship.doors.length, a: tileRoom[ta], b: tileRoom[tb], ta, tb,
      x: hatch ? ax : Math.max(ax, bx), y: hatch ? Math.max(ay, Math.floor(tb / cols)) : ay, hatch, airlock: false,
      open: false, held: 0, hp, broken: 0, anim: 0, gangway: !!car && car[ta] !== car[tb],
    };
    ship.doors.push(d);
    ship.doorAt.set(doorKey(ta, tb), d.i);
  };
  const sorted = [...pairs.values()].sort((a, b) => a.edges[0][0] - b.edges[0][0] || (a.hatch ? 1 : 0) - (b.hatch ? 1 : 0));
  for (const p of sorted) {
    const [ta, tb] = p.edges[Math.floor((p.edges.length - 1) / 2)];
    push(ta, tb, p.hatch);
  }
  for (const c of L.connectors ?? []) {
    if (tileRoom[c.ta] < 0 || tileRoom[c.tb] < 0) continue;
    push(c.ta, c.tb, c.hatch);
  }
  for (const al of L.airlocks) {
    const r = ship.rooms.find((q) => q.id === al.room);
    if (!r) continue;
    const ta = al.y * cols + al.x;
    const hatch = al.side === "up" || al.side === "down";
    ship.doors.push({
      i: ship.doors.length, a: r.i, b: -1, ta, tb: -1,
      x: al.side === "right" ? al.x + 1 : al.x, y: al.side === "down" ? al.y + 1 : al.y,
      hatch, airlock: true, open: false, held: 0, hp, broken: 0, anim: 0, gangway: false, side: al.side,
    });
  }
}

function placeSystem(ship: SimShip, id: SysKey, level: number, roomId?: string): SimSystem | null {
  const room = ship.rooms.find((r) => r.id === (roomId ?? id));
  if (!room || room.sys) return null;
  const s = emptySystem(id, room.i, level);
  room.sys = s;
  ship.systems.push(s);
  if (id !== "artillery") ship.sys[id] = s;
  return s;
}

/** The player's tender from its persistent state (all coupled cars become one ship). */
export function buildPlayerShip(input: ShipState): SimShip {
  const state = normalizeShip(JSON.parse(JSON.stringify(input)) as ShipState);
  const L = composeConsist(state.consist, state.modules);
  const ship = shipFromLayout(L, 0, state.defId, state.name);
  ship.kind = "player";
  ship.mobility = "player";
  ship.cars = L.cars.map((p) => ({ slot: p.slot, id: p.def.id, ox: p.ox, oy: p.oy, cols: p.cols, rows: p.rows }));
  ship.reactor = state.reactor;
  ship.hull = state.hull;
  ship.hullMax = state.hullMax;
  ship.augments = [...state.augments];
  const st = consistStats(state.consist, state.modules);
  ship.mods = { sensors: st.sensors, repair: st.repair, airDecay: st.airDecay, evasion: -st.evasionMalus, weaponCharge: st.weaponCharge, droneCharge: st.droneCharge, veilCooldown: st.veilCooldown, debrisProtection: st.debrisProtection };
  // Bench rooms (bunk car) and kettle-bench modules heal slowly.
  for (const r of ship.rooms) {
    r.socket = L.sockets.includes(r.id);
    const [slot, rid] = r.id.split(":");
    const carId = state.consist[slot as "lead" | "rear" | "keel"];
    const lg = carId ? Object.values(CARS[carId].legend).find((q) => q.id === rid) : undefined;
    r.bench = lg?.bench ?? 0;
    const m = state.modules[r.id];
    if (m) {
      r.module = m;
      r.bench += MODULES[m]?.effects.bench ?? 0;
    }
  }
  for (const [id, sst] of Object.entries(state.systems) as [SystemId, NonNullable<ShipState["systems"][SystemId]>][]) {
    if (!sst || sst.level <= 0) continue;
    // A purchasable array may occupy a native lead-car bay (e.g. optional shields).
    const roomId = state.systemRooms[id] ?? `lead:${id}`;
    if (!roomId) continue; // stored (no car or module hosts it)
    const s = placeSystem(ship, id, sst.level, roomId);
    if (!s) continue;
    s.damage = Math.min(sst.level, sst.damage);
    if (!SYSTEMS[id].subsystem && id !== "weapons" && id !== "drones") {
      s.power = Math.min(sst.power, sst.level - s.damage);
      s.want = sst.power;
    }
  }
  state.weapons.forEach((wid, i) => {
    if (!wid) return;
    const w = makeWeapon(weaponDef(wid), i);
    w.want = !!state.weaponPower[i];
    ship.weapons.push(w);
  });
  state.drones.forEach((did, i) => {
    if (!did) return;
    const d = makeDrone(did, i, 0);
    d.want = !!state.dronePower?.[i];
    ship.drones.push(d);
  });
  return ship;
}

export function makeWeapon(def: SimWeapon["def"], slot: number): SimWeapon {
  return {
    def, slot, powered: false, want: false, charge: 0, target: null, chain: 0, queue: 0, queueT: 0, volley: 0,
    volleyTarget: null, fired: 99, art: null, active: true,
  };
}

export function makeDrone(id: keyof typeof DRONES, slot: number, side: Side): SimDrone {
  return {
    def: DRONES[id], slot, side, out: false, powered: false, want: false, at: side, x: 0, y: 0, ang: slot * 2.1, cd: 1,
    used: 0, launch: 0, body: -1, stun: 0, deployed: 0,
  };
}

/** An enemy vessel from its scaled definition. */
export function buildEnemyShip(e: ScaledEnemy): SimShip {
  const L = enemyLayout(e.id);
  const ship = shipFromLayout(L, 1, e.id, e.name);
  ship.kind = e.kind === "human" ? "human" : e.kind === "autopilot" ? "autopilot" : "machine";
  ship.mobility = e.mobility;
  ship.enemy = e;
  ship.reactor = e.reactor;
  ship.hull = e.hull;
  ship.hullMax = e.hull;
  for (const [id, level] of Object.entries(e.systems) as [SysKey, number][]) {
    if (!level || id === "artillery") continue;
    placeSystem(ship, id, level);
  }
  if (e.systems.artillery) {
    for (const r of ship.rooms) {
      if (L.rooms[r.i].system === "artillery" && !r.sys) {
        const s = emptySystem("artillery", r.i, e.systems.artillery);
        r.sys = s;
        ship.systems.push(s);
      }
    }
  }
  e.weapons.forEach((wid, i) => {
    const w = makeWeapon(weaponDef(wid), i);
    w.want = true;
    const artRoom = e.artillery?.[i];
    if (artRoom) {
      const r = ship.rooms.find((q) => q.id === artRoom);
      w.art = r?.sys ?? null;
    }
    ship.weapons.push(w);
  });
  (e.drones ?? []).forEach((did, i) => ship.drones.push(makeDrone(did, i, 1)));
  for (const a of e.adjuncts ?? []) {
    for (let k = 0; k < a.count; k++) {
      const top = k % 2 === 0;
      const hy = top ? -1.2 : L.rows + 1.2;
      const adj: SimAdjunct = {
        kind: a.kind, i: ship.adjuncts.length, hp: a.hp, maxHp: a.hp, alive: true, active: a.kind === "gate-warden",
        evasion: a.evasion, x: -1.8, y: hy, hx: -1.8, hy, cd: 6 + k * 3, stun: 0, hitT: 99,
      };
      ship.adjuncts.push(adj);
    }
  }
  if (e.id === "iron-regent") ship.boss.gate = { up: true, downT: 0, locks: [], repairT: 9 };
  if (e.id === "hollow-choir") ship.boss.glass = { up: true, downT: 0, hits: [], channel: 0, tuning: false };
  if (e.id === "blackout-core") {
    ship.boss.core = { phase: 1, step: 0, phaseT: 0 };
    ship.weapons.forEach((w, i) => (w.active = i === 0));
    const heartRoom = ship.sys.heart ? ship.rooms[ship.sys.heart.room] : null;
    if (heartRoom) heartRoom.name = "Isolation regulator";
  }
  if (e.autonomous) {
    for (const r of ship.rooms) {
      r.station = -1;
      r.stationDir = null;
      r.name = r.sys?.id === "helm" ? "Tracking controller" : r.sys?.id === "engines" ? "Drive actuators"
        : r.sys?.id === "weapons" ? "Weapon feed" : r.sys?.id === "shields" ? "Ward capacitors"
        : r.lift ? "Maintenance rail" : "Coolant manifold";
    }
  }
  return ship;
}
