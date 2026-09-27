// Browser: the seam to the combat workstream. Finds createCombatScene / drawShipPreview in src/combat (Vite glob, so
// the campaign runs before combat lands) and falls back to an auto-resolved fight and a code-drawn tender.
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import type { CombatResult, CombatSetup, Inventory, ShipState } from "../game/types";
import { autoResolve } from "./autoresolve";

type CreateCombatScene = (app: App, opts: { ship: ShipState; inventory: Inventory; setup: CombatSetup; onEnd: (r: CombatResult) => void; onMenu?: () => void }) => Scene;
type DrawShipPreview = (g: Gfx, ship: ShipState, x: number, y: number, opts?: Record<string, unknown>) => void;

const mods = import.meta.glob<Record<string, unknown>>(["../combat/**/*.ts", "!../combat/**/*.test.ts", "!../combat/**/dev.ts"], { eager: true });

function find<T>(name: string): T | null {
  // Prefer the combat index, then any module that exports the name.
  const entries = Object.entries(mods).sort(([a], [b]) => (b.endsWith("/index.ts") ? 1 : 0) - (a.endsWith("/index.ts") ? 1 : 0));
  for (const [, m] of entries) {
    const f = m[name];
    if (typeof f === "function") return f as T;
  }
  return null;
}

export const combatApi = {
  createCombatScene: find<CreateCombatScene>("createCombatScene"),
  drawShipPreview: find<DrawShipPreview>("drawShipPreview"),
};

export function combatAvailable(): boolean {
  return !!combatApi.createCombatScene;
}

/** Build the real combat scene when it exists. */
export function makeCombatScene(app: App, ship: ShipState, inventory: Inventory, setup: CombatSetup, onEnd: (r: CombatResult) => void, onMenu?: () => void): Scene | null {
  const f = combatApi.createCombatScene;
  if (!f) return null;
  return f(app, { ship: JSON.parse(JSON.stringify(ship)), inventory: { ...inventory }, setup, onEnd, onMenu });
}

export function autoFight(ship: ShipState, inventory: Inventory, setup: CombatSetup, force?: CombatResult["outcome"]): CombatResult {
  return autoResolve(ship, inventory, setup, force ? { force } : {});
}

// ─── the consist preview on a carrier ──────────────────────────────────────────────────────────────────────

import { hullMeta } from "../combat/assets";
import { GANGWAY_GAP, PLAYER_RIGHT, PLAYER_TOP } from "../combat/view";
import { shipPreviewSize } from "../combat/preview";

/**
 * Where the lead car's drive trolley grips the carrier, relative to the top-left of drawShipPreview's bounding box
 * (mirrors combat's buildPlayerView composition: rear car to the left, keel car underneath).
 */
export function previewGrip(ship: ShipState): { x: number; y: number; w: number; h: number } | null {
  if (!combatApi.drawShipPreview) return null;
  try {
    const lm = hullMeta(ship.consist?.lead ?? "lamplighter", "player");
    const lx = PLAYER_RIGHT - lm.w;
    const ly = PLAYER_TOP;
    let bx = lx;
    let by = ly;
    if (ship.consist?.rear) {
      const rm = hullMeta(ship.consist.rear, "player");
      const cr = lm.couplerRear ?? { x: 0, y: lm.gy + 48 };
      const cf = rm.couplerFront ?? { x: rm.w, y: rm.gy + 48 };
      bx = Math.min(bx, lx + cr.x - GANGWAY_GAP - cf.x);
      by = Math.min(by, ly + lm.gy - rm.gy);
    }
    const size = shipPreviewSize(ship);
    const grip = lm.cable ?? { x: lm.w / 2, y: 6 };
    return { x: lx + grip.x - bx, y: ly + grip.y - by, w: size.w, h: size.h };
  } catch {
    return null;
  }
}
