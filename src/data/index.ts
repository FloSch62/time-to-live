// Game data owned by the combat workstream (contract §9). Pure modules: safe to import from node tests and from the
// campaign. Display names/descriptions for the UI come from src/content/flavor.ts when present; the `name`/`desc`
// fields here are fallbacks and the rules text.
export { WEAPONS, ENEMY_WEAPONS, weaponDef, weaponTypeLabel, FLIGHT, type WeaponDef, type WeaponType } from "./weapons.ts";
export { DRONES, type DroneDef, type DroneKind } from "./drones.ts";
export { AUGMENTS, MAX_AUGMENTS, afterHop, hasAugment, type AugmentDef } from "./augments.ts";
export {
  SYSTEMS, TUNING, HOLD_ROOMS, DEFAULT_SYSTEM_ROOM, MAX_REACTOR, REACTOR_COSTS, reactorCost, upgradeCost,
  type SystemDef,
} from "./systems.ts";
export {
  SPECIES, BOARDERS, SKILL_IDS, SKILL_XP, SKILL_NAMES, MAN_BONUS, skillLevel, emptyXp, type SpeciesDef, type BoarderDef,
} from "./species.ts";
export {
  ENEMIES, STAGE_ENEMIES, GUARDIANS, scaleEnemy, type EnemyDef, type ScaledEnemy, type RewardTier,
} from "./enemies.ts";
export {
  TILE, enemyLayout, parseLayout, ENEMY_LAYOUTS, ENEMY_GRIDS, type LayoutDef, type RoomDef, type SysKey,
} from "./layouts.ts";
export { CARS, LEAD_CARS, REAR_CARS, KEEL_CARS, CAR_EVASION_MALUS, carDef, carSystems, type CarDef, type Hardpoint } from "./cars.ts";
export { MODULES, type ModuleDef } from "./modules.ts";
export {
  composeConsist, consistStats, deriveSystemRooms, normalizeShip, coupleCar, applyRefit, validateShip, freeSlot, carsOf,
  roomKey, type ConsistLayout, type ConsistStats, type CarPlacement,
} from "./consist.ts";
export { rollReward, surrenderOffer, randomWeapon, randomDrone, randomAugment, randomRecruitSpecies, itemCost, sellPrice } from "./rewards.ts";
export { makePlayerShip, newInventory, newCrew, installSystem, cloneShip, FALLBACK_NAMES } from "./ship.ts";
export { fallbackHull, type HullMeta } from "./hulls.ts";
