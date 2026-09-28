// Dev entries (open with ?dev=<name>):
//   /?dev=combat&enemy=<id>&stage=<n>[&depth=0.5][&hazard=<id>][&seed=n][&auto=1][&level=starter|typical|strong]
//   /?dev=combat-strong&enemy=<id>[&stage=n]      upgraded ship for that stage
//   /?dev=combat-ship[&rear=<car>][&keel=<car>]    drawShipPreview of a consist
// Extra: &rear=<car> &keel=<car> couple cars; &lamp=teal; &paused=0 starts running; &tender=glasswing|switchback
// starts from that lead car's opening fit instead of the bench Lamplighter; &crew=n adds bench crew up to n.
import type { DevFactory } from "../dev";
import type { App, Scene } from "../core/scene";
import { P, C } from "../core/palette";
import { settings } from "../core/save";
import type { CombatResult, ShipState } from "../game/types";
import type { EnemyId, HazardId, KeelCarId, LampColor, LeadCarId, RearCarId, StageIndex, WeaponId } from "../game/ids";
import { makePlayerShip } from "../data/ship";
import { ENEMY_IDS } from "../game/ids";
import { ENEMIES } from "../data/enemies";
import { coupleCar, applyRefit } from "../data/consist";
import { createCombatScene } from "./index";
import { drawShipPreview } from "./preview";
import { benchShip, benchInventory, type BenchLevel } from "./sim/bench";

function shipFor(params: URLSearchParams, stage: StageIndex, level: BenchLevel): ShipState {
  const tender = params.get("tender") as LeadCarId | null;
  let s = tender ? makePlayerShip("", undefined, "amber", tender) : benchShip(stage, level);
  const want = Number(params.get("crew") ?? 0);
  const extra = benchShip(3, "strong").crew.slice(3);
  for (let i = 0; s.crew.length < want && i < extra.length; i++) s.crew.push({ ...extra[i], id: `${extra[i].id}-x${i}` });
  const rear = params.get("rear") as RearCarId | null;
  const keel = params.get("keel") as KeelCarId | null;
  if (rear) s = coupleCar(s, "rear", rear === ("none" as string) ? null : rear);
  if (keel) s = coupleCar(s, "keel", keel === ("none" as string) ? null : keel);
  const mod = params.get("module");
  if (mod) s = applyRefit(s, "lead:hold-a", mod as never);
  const lamp = params.get("lamp") as LampColor | null;
  if (lamp) s.livery = { lamp };
  // &weapons=id,id,… fills every mount (dev only), to check mount placement on each hull.
  const weapons = params.get("weapons")?.split(",").filter(Boolean) as WeaponId[] | undefined;
  if (weapons?.length) {
    s.weaponSlots = Math.max(s.weaponSlots, weapons.length);
    s.weapons = weapons;
    s.weaponPower = weapons.map(() => true);
  }
  return s;
}

function combat(app: App, params: URLSearchParams, level: BenchLevel): Scene {
  const enemy = (params.get("enemy") ?? "packet-leech") as EnemyId;
  const def = ENEMIES[enemy] ?? ENEMIES["packet-leech"];
  const stage = Number(params.get("stage") ?? def.stage) as StageIndex;
  const lv = (params.get("level") as BenchLevel) ?? level;
  if (params.get("paused") === "0") settings.autoPause = { ...settings.autoPause, onArrive: false };
  const ship = shipFor(params, stage, lv);
  const setup = {
    enemy, stage, seed: Number(params.get("seed") ?? 7), depth: Number(params.get("depth") ?? 0.4),
    hazard: (params.get("hazard") as HazardId) ?? undefined, boss: !!def.boss, surrenderable: def.kind === "human",
    intro: params.get("intro") ?? undefined,
  };
  const again = () => app.scenes.switchTo(combat(app, params, level));
  return createCombatScene(app, {
    ship, inventory: benchInventory(stage), setup,
    onEnd: (r: CombatResult) => app.scenes.switchTo(resultScene(app, r, again, () => {
      const i = ENEMY_IDS.indexOf(enemy);
      const next = new URLSearchParams(params);
      next.set("enemy", ENEMY_IDS[(i + 1) % ENEMY_IDS.length]);
      next.delete("stage");
      app.scenes.switchTo(combat(app, next, level));
    })),
    ...(params.get("auto") === "1" ? { auto: true } : {}),
    ...(params.get("warp") ? { warp: Number(params.get("warp")) } : {}),
  } as never);
}

function resultScene(app: App, r: CombatResult, again: () => void, next: () => void): Scene {
  return {
    draw(g) {
      g.rect(0, 0, 960, 540, P.ink0);
      g.panel(280, 120, 400, 280, "dialog");
      g.text(`Outcome: ${r.outcome}`, 300, 140, { font: "head", color: P.brass1 });
      const lines = [
        `hull ${r.ship.hull}/${r.ship.hullMax} · payloads ${r.inventory.payloads} · spares ${r.inventory.spares}`,
        `seconds ${r.stats.seconds} · dealt ${r.stats.damageDealt} · taken ${r.stats.damageTaken}`,
        `shots ${r.stats.shotsFired} · hits ${r.stats.shotsHit}`,
        `crew lost: ${r.crewLost.map((c) => c.name).join(", ") || "none"}`,
        `reward: ${JSON.stringify(r.reward ?? {})}`,
      ];
      g.text(lines.join("\n"), 300, 180, { color: C.text, width: 360 });
      if (app.ui.button("again", 300, 350, 170, 26, "Again", { hotkey: "KeyR", showKey: true })) again();
      if (app.ui.button("next", 490, 350, 170, 26, "Next enemy", { hotkey: "KeyN", showKey: true })) next();
    },
  };
}

function preview(app: App, params: URLSearchParams): Scene {
  const stage = Number(params.get("stage") ?? 1) as StageIndex;
  const ship = shipFor(params, stage, (params.get("level") as BenchLevel) ?? "starter");
  return {
    draw(g) {
      g.rect(0, 0, 960, 540, P.ink1);
      const r = drawShipPreview(g, ship, 40, 60, { t: app.time, sockets: true });
      g.text(`consist ${JSON.stringify(ship.consist)} · ${r.w}×${r.h} · rooms ${r.rooms.length}`, 40, 20, { font: "small", color: C.textDim });
      const hover = r.rooms.find((q) => app.input.inRect(q.x, q.y, q.w, q.h));
      if (hover) app.ui.setTooltip(`${hover.id} ${hover.name}${hover.system ? ` [${hover.system}]` : ""}${hover.socket ? " socket" : ""}${hover.module ? ` (${hover.module})` : ""}`);
    },
  };
}

export const dev: Record<string, DevFactory> = {
  combat: (app, params) => combat(app, params, "starter"),
  "combat-strong": (app, params) => combat(app, params, "strong"),
  "combat-ship": (app, params) => preview(app, params),
};
