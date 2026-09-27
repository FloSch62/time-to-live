// Small helpers shared by tests and tools.
import type { SimShip } from "./model.ts";
import type { Sim } from "./sim.ts";
export { chargeTime } from "./weapons.ts";

/** Hit a boss shield with one projectile from `source`; true = absorbed. */
export function specialShieldForTest(sim: Sim, T: SimShip, source: string): boolean {
  return sim.specialShield(T, source, 1, 0, 0);
}
