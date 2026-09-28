// A reasonable automatic player for tests and the headless balance runner: FTL habits (volley weapons together to
// beat shields, strip the shield room first, keep the helm/weapons/shields manned, send crew to fires, breaches,
// damage and boarders, heal at the infirmary, use the veil when a volley is incoming, accept surrenders).
import type { SysKey } from "../../data/layouts.ts";
import type { SimCrew, SimShip, SimWeapon, Target } from "./model.ts";
import type { Sim } from "./sim.ts";
import { effective, usable, reactorFree } from "./power.ts";
import { chargeTime } from "./weapons.ts";

export interface AutoOpts {
  /** Exercise a real retreat: keep damage control working, reserve the drive, and leave at the first valid handshake. */
  escapeOnly?: boolean;
  /** Hop away when the hull drops below this fraction and the drive is ready (0 = never). */
  fleeAt?: number;
  /** Fire every weapon as soon as it is ready instead of volleying. */
  sloppy?: boolean;
  /** Preserve this many payloads for later fights. Guardians can explicitly use a zero reserve. */
  payloadReserve?: number;
}

const STATIONS: SysKey[] = ["helm", "weapons", "shields", "engines", "sensors", "doors"];

export class AutoPlayer {
  private t = 0;
  private sim: Sim;
  private opts: AutoOpts;
  constructor(sim: Sim, opts: AutoOpts = {}) {
    this.sim = sim;
    this.opts = opts;
  }

  tick(dt: number) {
    const sim = this.sim;
    if (sim.outcome) return;
    if (sim.deliveryReady) { sim.deliver(); return; }
    if (sim.surrender?.pending) sim.acceptSurrender();
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 0.25;
    const P = sim.ships[0];
    if (sim.ships[1].boss.glass && !sim.ships[1].boss.glass!.tuning) sim.tuneChoir(true);
    this.power(P);
    if (!this.opts.escapeOnly) this.weapons(P);
    this.crew(P);
    if (this.opts.escapeOnly && sim.hopReady()) { sim.hop(); return; }
    // Veil against an incoming volley (measured against the Iron Regent: casting as soon as a volley of two or more
    // bolts is inbound beat holding it for the heavy Edict or casting before a heavy gun fires).
    if (P.sys.veil && P.veilT <= 0 && P.veilCd <= 0 && effective(P.sys.veil) > 0) {
      let n = 0;
      for (const p of sim.projectiles) if (!p.dead && p.to === 0 && p.t > p.t1) n++;
      for (const b of sim.beams) if (!b.done && b.to === 0 && b.t < b.delay) n += 2;
      if (n >= 2) sim.activateVeil();
    }
    const f = this.opts.fleeAt ?? 0;
    if (f > 0 && P.hull / P.hullMax < f && sim.hopReady()) sim.hop();
  }

  private power(P: SimShip) {
    const sim = this.sim;
    const hurt = sim.crew.some((c) => c.side === 0 && c.kind === "crew" && !c.dead && c.hp < c.maxHp * 0.6 && c.species !== "rigger");
    const lowAir = P.rooms.some((r) => r.o2 < 45);
    // Keep air and urgent medical care running before spending the remaining power on evasion.
    let budget = P.reactor;
    const target = new Map<SysKey, number>();
    const take = (id: SysKey, want: number) => {
      const s = P.sys[id];
      if (!s) return;
      const cap = Math.max(0, usable(s) - s.bonus);
      let n = Math.min(cap, want, budget);
      if (id === "shields") n -= (n + s.bonus) % 2;
      target.set(id, n);
      budget -= n;
    };
    if (this.opts.escapeOnly) take("engines", 2);
    take("shields", 99);
    const ws = P.sys.weapons;
    const weaponsOn = new Set<number>();
    if (ws && !this.opts.escapeOnly) {
      let load = 0;
      P.weapons.forEach((w, i) => {
        if (w.def.ammo && P.payloads - w.def.ammo < (this.opts.payloadReserve ?? 0)) return;
        const need = w.def.power;
        if (load + need <= usable(ws) && need <= budget + Math.max(0, ws.bonus - load)) {
          const draw = Math.max(0, load + need - ws.bonus) - Math.max(0, load - ws.bonus);
          budget -= draw;
          load += need;
          weaponsOn.add(i);
        }
      });
    }
    take("air", lowAir ? 99 : 1);
    take("medbay", hurt ? 99 : 0);
    if (!this.opts.escapeOnly) take("engines", 1);
    const dronesOn = new Set<number>();
    const ds = P.sys.drones;
    if (ds && P.spares + P.drones.filter((d) => d.out).length > 0) {
      let load = 0;
      P.drones.forEach((d, i) => {
        if (this.opts.escapeOnly && ["combat", "anti", "boarding"].includes(d.def.kind)) return;
        const E = sim.ships[1];
        const interceptable = E.weapons.some(w => w.def.type === "payload") || E.drones.some(q => q.def.kind === "boarding") || sim.setup.hazard === "debris-field";
        if (d.def.kind === "defence" && !interceptable) return;
        if (d.def.kind === "repair" && P.hull > P.hullMax * 0.6 && !d.out) return;
        if (!d.out && P.spares <= 0) return;
        const need = d.def.power;
        if (load + need <= usable(ds) && need <= budget) {
          budget -= need;
          load += need;
          dronesOn.add(i);
        }
      });
    }
    take("veil", 99);
    const engines = target.get("engines") ?? 0;
    budget += engines;
    take("engines", 99);
    // Apply: remove first, then add.
    for (const [id, n] of target) {
      const s = P.sys[id]!;
      while (s.power > n && sim.removePower(id)) {}
    }
    P.weapons.forEach((w, i) => {
      if (w.powered && !weaponsOn.has(i)) sim.setWeaponPower(i, false);
    });
    P.drones.forEach((d, i) => {
      if (d.powered && !dronesOn.has(i)) sim.setDronePower(i, false);
    });
    for (const [id, n] of target) {
      const s = P.sys[id]!;
      while (s.power < n && sim.addPower(id)) {}
    }
    P.weapons.forEach((w, i) => {
      if (!w.powered && weaponsOn.has(i)) sim.setWeaponPower(i, true);
    });
    P.drones.forEach((d, i) => {
      if (!d.powered && dronesOn.has(i)) sim.setDronePower(i, true);
    });
    // Clear the event noise from power changes.
    sim.events = sim.events.filter((e) => e.type !== "power-denied" && e.type !== "power-up" && e.type !== "power-down");
  }

  private pickTarget(E: SimShip, w: SimWeapon): Target {
    const sim = this.sim;
    const sh = E.sys.shields;
    const dutySystem = sim.setup.scenario && E.sys[sim.setup.scenario.system];
    if (dutySystem && (!sh || effective(sh) < 2)) {
      const r = E.rooms[dutySystem.room];
      return w.def.type === "beam" ? { kind: "beam", x0: r.x + .2, y0: r.y + .5, x1: r.x + r.w - .2, y1: r.y + .5 } : { kind: "room", room: dutySystem.room };
    }
    // Split a ready volley across exposed repair/sealing craft. Sending every
    // gun at the first four-HP drone wastes the volley and lets the other keep firing.
    if (["laser", "payload", "flak"].includes(w.def.type)) {
      const pending = (i: number) => sim.projectiles.filter(p => !p.dead && p.from === 0 && p.target.kind === "adj" && p.target.i === i).reduce((n, p) => n + p.dmg, 0)
        + sim.ships[0].weapons.reduce((n, q) => n + (q.target?.kind === "adj" && q.target.i === i ? q.def.damage * q.def.shots : 0)
          + (q.volleyTarget?.kind === "adj" && q.volleyTarget.i === i ? q.def.damage * q.queue : 0), 0);
      const damage = w.def.damage * w.def.shots;
      const craft = E.adjuncts.filter(a => a.alive && a.active).map(a => ({ a, remaining: a.hp - pending(a.i) })).filter(a => a.remaining > 0);
      craft.sort((a, b) => (a.remaining < damage ? 1 : 0) - (b.remaining < damage ? 1 : 0) || a.remaining - b.remaining);
      if (craft.length) return { kind: "adj", i: craft[0].a.i };
    }
    let room: number;
    if (sh && effective(sh) >= 2) room = sh.room;
    else {
      const order: SysKey[] = ["weapons", "gate", "bells", "heart", "artillery", "helm", "engines", "shields", "drones", "brood"];
      const cand = order.map((id) => E.sys[id]).find((s) => s && s.damage < s.level);
      room = cand ? cand.room : sim.rng.pick(E.rooms).i;
      // Artillery (the Core): hit the active step.
      const act = E.weapons.find((x) => x.art && x.active && usable(x.art) > 0);
      if (E.boss.core && act?.art && (!sh || effective(sh) < 2)) room = act.art.room;
    }
    if (w.def.type === "beam") {
      const r = E.rooms[room];
      const y = r.y + 0.5;
      return { kind: "beam", x0: r.x + 0.2, y0: y, x1: r.x + 0.2 + 4, y1: y };
    }
    return { kind: "room", room };
  }

  private weapons(P: SimShip) {
    const sim = this.sim;
    const E = sim.ships[1];
    if (E.dead) return;
    sim.setAutofire(false);
    if (sim.dutyProgress > 0) return; // Keep the disabled machine intact while the helm acknowledges.
    const live = P.weapons.filter((w) => w.powered && w.def.type !== "beam" && !(w.def.ammo && P.payloads - w.def.ammo < (this.opts.payloadReserve ?? 0)));
    if (!live.length && !P.weapons.some(w => w.powered && w.def.type === "beam")) return;
    const shields = E.shields + (E.boss.gate?.up ? 1 : 0) + (E.boss.glass?.up ? 1 : 0);
    const allReady = live.every((w) => w.charge >= chargeTime(w) - 0.05);
    const volley = this.opts.sloppy || shields === 0 || allReady;
    // Don't wait forever for a slow weapon: fire when the rest have been ready a while.
    const longest = Math.max(0, ...live.map((w) => chargeTime(w) - w.charge));
    const force = longest > 6 && live.filter((w) => w.charge >= chargeTime(w) - 0.05).length >= 2;
    // Beams go in after the bolts have stripped the mesh (FTL habit).
    const inbound = sim.projectiles.filter((p) => !p.dead && p.from === 0 && p.to === 1 && p.kind !== "payload" && p.t > p.t1 + p.t2 - 0.45).length;
    for (let i = 0; i < P.weapons.length; i++) {
      const w = P.weapons[i];
      if (!w.powered || w.target) continue;
      if (w.def.ammo && P.payloads - w.def.ammo < (this.opts.payloadReserve ?? 0)) continue;
      if (w.charge < chargeTime(w) - 0.05) continue;
      if (w.def.type === "beam") {
        const through = E.shields < w.def.damage || inbound >= E.shields || !!w.def.ion;
        if (!through && !(E.boss.gate || E.boss.glass)) continue;
      } else if (!(volley || force)) continue;
      sim.setTarget(i, this.pickTarget(E, w));
    }
  }

  private crew(P: SimShip) {
    const sim = this.sim;
    const mine = sim.crew.filter((c) => c.side === 0 && c.kind === "crew" && !c.dead && c.ship === 0);
    if (!mine.length) return;
    const stations = STATIONS.map((id) => P.sys[id]).filter((s) => s && P.rooms[s.room].station >= 0);
    // Station plan: keep crew already at a manned station; fill helm > weapons > shields > engines with the rest.
    const plan = new Map<number, number>();
    const wanted = stations.slice();
    const free: SimCrew[] = [];
    for (const c of mine) {
      const k = wanted.findIndex((s) => s!.room === c.stationRoom);
      if (k >= 0) {
        plan.set(c.uid, c.stationRoom);
        wanted.splice(k, 1);
      } else free.push(c);
    }
    for (const c of free) {
      const s = wanted.shift();
      if (s) {
        plan.set(c.uid, s.room);
        c.stationRoom = s.room;
      }
    }
    const pilotRoom = P.sys.helm?.room ?? -1;
    const med = P.sys.medbay;
    const medOk = !!med && effective(med) > 0 && P.rooms[med.room].o2 > 20 && !P.rooms[med.room].tiles.some((t) => P.fire[t] > 0);
    // Work: boarders, fires, breaches, damaged systems — by importance.
    const IMP: Partial<Record<SysKey, number>> = { shields: 6, weapons: 5, helm: 5, engines: 4, air: 3, medbay: 3, drones: 2, doors: 1, sensors: 1, veil: 2 };
    if (this.opts.escapeOnly) { IMP.helm = 8; IMP.engines = 7; IMP.weapons = 0; }
    const work: { room: number; w: number; fight: boolean }[] = [];
    for (const r of P.rooms) {
      let w = 0;
      let fight = false;
      const foes = sim.crew.filter((c) => !c.dead && c.ship === 0 && c.side === 1 && P.tileRoom[c.tile] === r.i).length;
      if (foes) {
        w += 10 + foes * 3;
        fight = true;
      }
      for (const t of r.tiles) {
        if (P.fire[t] > 0) w += 6;
        if (P.breach[t] > 0) w += 5;
      }
      if (r.sys && r.sys.damage > 0) w += (IMP[r.sys.id] ?? 1) + r.sys.damage;
      if (w > 0) work.push({ room: r.i, w, fight });
    }
    work.sort((a, b) => b.w - a.w);
    const assigned = new Set<number>();
    const heading = (c: SimCrew) => P.tileRoom[c.path.length ? c.dest : c.tile];
    // Begin recovery before a long lift journey becomes lethal. Riggers use
    // real workshop/recovery benches; people can use them when the clinic is down.
    for (const c of mine) {
      const healing = P.rooms.filter(r => (r.bench > 0 || c.medbay && medOk && r.i === med!.room)
        && (!c.breathes || r.o2 > 35) && !r.tiles.some(t => P.fire[t] > 0 || P.breach[t] > 0)
        && !sim.crew.some(e => !e.dead && e.side === 1 && e.ship === 0 && P.tileRoom[e.tile] === r.i));
      const current = healing.find(r => r.i === heading(c));
      if (current && c.hp < c.maxHp * .8) { assigned.add(c.uid); continue; }
      if (c.hp >= c.maxHp * .5) continue;
      healing.sort((a, b) => {
        const score = (r: typeof a) => Math.abs(c.x - r.x - r.w / 2) + Math.abs(c.y - r.y - .5) * 3 - (r.bench + (c.medbay && medOk && r.i === med!.room ? 4 : 0)) * 2;
        return score(a) - score(b);
      });
      for (const room of healing) {
        sim.moveCrew([c.uid], room.i);
        if (heading(c) === room.i) { assigned.add(c.uid); break; }
      }
    }
    for (const job of work) {
      const crewThere = mine.filter((c) => heading(c) === job.room).length;
      const need = job.fight ? Math.min(3, 1 + Math.floor(job.w / 12)) : job.w >= 10 ? 2 : 1;
      let have = crewThere;
      while (have < need) {
        // Nearest free, non-pilot (unless the helm is what needs work) crew member; wardens preferred for fights.
        let best: SimCrew | null = null;
        let bd = Infinity;
        for (const c of mine) {
          if (assigned.has(c.uid) || heading(c) === job.room) continue;
          if (plan.get(c.uid) === pilotRoom && job.room !== pilotRoom && mine.length > 1) continue;
          const [x0, y0] = [c.x, c.y];
          const r = P.rooms[job.room];
          let d = Math.abs(r.x + r.w / 2 - x0) + Math.abs(r.y + 0.5 - y0) * 2;
          if (job.fight && c.species === "warden") d -= 6;
          if (job.fight && c.species === "rigger") d += 6;
          if (!job.fight && c.species === "rigger") d -= 4;
          if (d < bd) {
            bd = d;
            best = c;
          }
        }
        if (!best) break;
        sim.moveCrew([best.uid], job.room);
        assigned.add(best.uid);
        have++;
      }
      for (const c of mine) if (heading(c) === job.room) assigned.add(c.uid);
    }
    // Everyone else to their station.
    for (const c of mine) {
      if (assigned.has(c.uid)) continue;
      const st = plan.get(c.uid);
      if (st !== undefined && heading(c) !== st) sim.moveCrew([c.uid], st);
    }
    sim.events = sim.events.filter((e) => e.type !== "crew-move" && e.type !== "room-full");
  }
}

/** Run a whole fight headlessly with the autopilot. */
export function autoFight(sim: Sim, opts: AutoOpts = {}, maxSeconds = 600): Sim {
  const ap = new AutoPlayer(sim, opts);
  const dt = 1 / 60;
  const n = Math.round(maxSeconds / dt);
  for (let i = 0; i < n && !sim.outcome; i++) {
    ap.tick(dt);
    sim.step(dt);
    if (sim.events.length > 200) sim.events.length = 0;
  }
  return sim;
}
