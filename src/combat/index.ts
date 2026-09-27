// Public API of the combat workstream (contract §9). The campaign creates the scene, the scene calls onEnd once with
// the result and never removes itself (the campaign switches scenes).
import type { App, Scene } from "../core/scene";
import type { CombatResult, CombatSetup, Inventory, ShipState } from "../game/types";
import type { LampColor, SpeciesId } from "../game/ids";
import { makePlayerShip } from "../data/ship";
import { createCombatScene as create } from "./scene";
import { pickCrewName, loadCombatMeta } from "./assets";

export { drawShipPreview, shipPreviewSize, type PreviewOpts, type PreviewResult, type PreviewRoom } from "./preview";
export { Sim } from "./sim/sim";
export { autoFight, AutoPlayer } from "./sim/autoplay";
export {
  newInventory, afterHop, rollReward, coupleCar, applyRefit, validateShip, normalizeShip, consistStats,
  deriveSystemRooms,
} from "../data";

export interface CombatSceneOpts {
  ship: ShipState;
  inventory: Inventory;
  setup: CombatSetup;
  onEnd: (r: CombatResult) => void;
  onMenu?: () => void;
}

export function createCombatScene(app: App, opts: CombatSceneOpts): Scene {
  void loadCombatMeta();
  return create(app, opts);
}

/** The Lamplighter at the start of a voyage (lead car only), crew names from src/content/names.ts. */
export function newPlayerShip(name: string, lamp: LampColor = "amber"): ShipState {
  const seed = Math.floor(Math.random() * 1000);
  return makePlayerShip(name, (species: SpeciesId, taken: string[]) => pickCrewName(species, taken, seed), lamp);
}

/** Preload hull/weapon/drone metadata (optional; the scene does it too). */
export function preloadCombat(): Promise<unknown> {
  return loadCombatMeta();
}
