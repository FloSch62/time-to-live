// Auto-resolved fights: the fallback until the combat scene exists, the dev "skip fight" option and the headless
// auto-run test. A rough strength comparison, not a simulation. Pure module.
import { Rng } from "../core/rng.ts";
import type { CombatResult, CombatSetup, Inventory, ShipState } from "../game/types.ts";
import { catalog } from "./catalog.ts";
import { rollReward } from "./rewards.ts";

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function playerStrength(ship: ShipState, inv: Inventory): number {
  let atk = 0;
  ship.weapons.forEach((w, i) => {
    if (!w) return;
    const info = catalog.weapons[w];
    let v = (info?.price ?? 40) / 30;
    if (info?.wtype === "payload" && inv.payloads <= 0) v = 0;
    atk += ship.weaponPower[i] || i < 2 ? v : v * 0.5;
  });
  const shields = Math.floor((ship.systems.shields?.level ?? 0) / 2);
  const engines = ship.systems.engines?.level ?? 0;
  const drones = ship.drones.filter(Boolean).length * (ship.systems.drones ? 0.8 : 0);
  const crew = Math.min(8, ship.crew.length) * 0.15;
  return atk + shields * 1.6 + engines * 0.25 + drones + crew;
}

export function enemyStrength(setup: CombatSetup): number {
  const elite = catalog.elites.includes(setup.enemy);
  return 2.4 + setup.stage * 1.6 + setup.depth * 1.6 + (setup.boss ? 3.5 + setup.stage : 0) + (elite ? 2 : 0);
}

export function autoResolve(ship0: ShipState, inv0: Inventory, setup: CombatSetup, opts: { force?: CombatResult["outcome"] } = {}): CombatResult {
  const rng = new Rng(setup.seed ^ 0x51f15e);
  const ship = clone(ship0);
  const inventory = clone(inv0);
  const ratio = playerStrength(ship, inventory) / enemyStrength(setup);
  const base = setup.stage * 1.6 + 2 + (setup.boss ? 5 : 0);
  let taken = Math.round(base * rng.range(0.4, 1.3) / Math.max(0.55, Math.min(2.2, ratio)));
  if (opts.force === "victory") taken = Math.min(Math.round(taken / 3), Math.max(0, ship.hull - 10));
  let outcome: CombatResult["outcome"] = "victory";
  if (opts.force) outcome = opts.force;
  else if (taken >= ship.hull) {
    // A losing fight: sometimes the hop drive charges in time.
    if (rng.chance(0.35) && !setup.boss) {
      outcome = "fled";
      taken = Math.max(0, ship.hull - rng.int(1, 4));
    } else outcome = "defeat";
  } else if (setup.surrenderable && rng.chance(0.35)) outcome = "surrendered";
  if (outcome === "defeat") taken = Math.max(taken, ship.hull);
  ship.hull = Math.max(0, ship.hull - taken);
  const hasPayload = ship.weapons.some((w) => w && catalog.weapons[w]?.wtype === "payload");
  if (hasPayload) inventory.payloads = Math.max(0, inventory.payloads - rng.int(0, 3));
  if (ship.drones.some(Boolean) && ship.systems.drones) inventory.spares = Math.max(0, inventory.spares - rng.int(0, 1));
  const crewLost: CombatResult["crewLost"] = [];
  for (const c of ship.crew) c.hp = Math.max(1, c.hp - rng.int(0, Math.round(taken * 3)));
  if (outcome !== "defeat" && ship.crew.length > 1 && rng.chance(0.04 + 0.02 * setup.stage)) {
    const i = rng.int(0, ship.crew.length - 1);
    const [c] = ship.crew.splice(i, 1);
    crewLost.push({ name: c.name, species: c.species });
  }
  if (outcome === "defeat") {
    for (const c of ship.crew) crewLost.push({ name: c.name, species: c.species });
  }
  let reward;
  if (!setup.noReward && (outcome === "victory" || outcome === "surrendered")) {
    const tier = setup.boss || catalog.elites.includes(setup.enemy) ? "high" : outcome === "surrendered" ? "low" : "med";
    reward = rollReward(tier, setup.stage, setup.depth, rng);
  }
  return {
    outcome,
    ship,
    inventory,
    reward,
    crewLost,
    stats: {
      seconds: rng.int(40, 160),
      damageDealt: outcome === "victory" ? rng.int(8, 20) : rng.int(0, 8),
      damageTaken: taken,
      shotsFired: rng.int(8, 30),
      shotsHit: rng.int(4, 20),
    },
  };
}
