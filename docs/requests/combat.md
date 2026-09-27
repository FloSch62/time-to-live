# Requests from the COMBAT workstream

## 1. `CombatResult.outcome`: add `"escaped"` (resolved)
Human crews (scavenger-skiff) can run away down their carrier after a declined surrender (lore: "their fight ends
when they give up, or run"). Combat now reports `outcome: "escaped"` with no reward. The campaign clears the relay without recording a player retreat or leaving a rematch.
Implemented: `outcome: "victory" | "fled" | "surrendered" | "defeat" | "escaped"` (distinct from player retreat).

## 2. `ShipState.swhStage?: number` (resolved)
The Second Way Home augment works once per stage. Combat stores the stage it was spent in as `ship.swhStage` on
the returned `CombatResult.ship` (an extra JSON field that survives saves). It is now an optional typed field on `ShipState`: `/** Stage in which Second Way Home was spent (augment, once per stage). */ swhStage?: number;`

## 3. Reward tiers (info)
`rollReward(rng, stage, depth, tier)` accepts `"low" | "med" | "high" | "elite" | "boss"`; `Outcome.reward` uses
the first three, enemies use all five.
