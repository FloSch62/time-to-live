# Campaign economy and difficulty audit

The original campaign reachability tests used a simplified combat resolver. Those tests establish that event
chains and saves work; they do not establish that a player can afford the benchmark tender or win actual fights.
`tools/balance/campaign.ts` now exercises complete voyages using the same combat simulation as the running game.

## What changed

The initial 24-run pilot never passed the first guardian. Several routes earned almost no salvage, despite visiting
eight to ten relays. The original guardian benchmarks assumed equipment that those runs could not afford.

- A cleared relay now opens its one-time maintenance stores: 24 salvage in stage one, 36 in stage two, 48 in stage
  three. The claim is visible in the relay view and explained on the chart, in the Field Guide and in the Runbook.
  Starting relays, guardians, unfinished encounters and sealed relays do not pay. Claims persist across saves.
- Shield upgrades now cost 20/30 salvage for the second layer, 40/60 for the third, and 80/100 for the fourth.
  Each layer still requires two powered bars, so reactor allocation and timing remain meaningful.
- Each exchange offers a dependable ammunition-free weapon for its stage alongside random stock. Random items
  respect their earliest-stage restriction. Buying a particular rare drop is no longer the only way to progress.
- The Regent retains its two-source gate and repair wardens but has one ordinary shield layer. The Core retains
  all three phases, rotating artillery, sealing drones and the Horizon beam, with two ordinary shield layers and
  ten-second Custody charges. Its phase changes still accelerate and combine attacks.
- The benchmark pilot now preserves air and urgent medical power before evasion, attacks exposed gate wardens,
  saves for equipment, resells unused cargo, and uses real power/crew orders to retreat from prolonged fights.

## Final evidence

Command: `npm run test:campaign`.

The deterministic sample is 128 seeds (`31337 × 1…128`). All 128 ended in victory or defeat; there were no policy
timeouts. Eighty reached stage two, 32 reached stage three, and six completed the campaign. Raw per-fight loadouts,
hull, crew, purchases, stage progress and outcome data are in `tools/shots/qa/campaign-balance.json`.

The pilot starts with the normal tender and inventory. It uses the real stock, prices, resource deductions,
repairs, equipment moves, upgrades, encounter outcomes and combat rewards. It does not grant equipment, refill
resources, skip guardians, inspect hidden event outcomes or force victories. It selects visible blue options or
the first legal choice, prefers safe unvisited relays, saves for weapons and attempts to repair at exchanges.

The separate 1,116-fight benchmark gives this guardian result with 12 fights per loadout:

| Guardian | Starter for that stage | Typical | Strong |
| --- | ---: | ---: | ---: |
| Iron Regent | 0% | 100% | 100% |
| Hollow Choir | 58% | 100% | 100% |
| Blackout Core | 0% | 75% | 100% |

These results support a demanding progression where preparation changes outcomes, and prove that normal campaign
income can fund victorious runs. They are **not human win-rate targets**. The fixed pilot cannot interpret prose,
plan around a particular event, optimize beam paths, or use every drone/Veil combination. It sometimes spends or
routes badly. The sample sizes are modest and some runs are punishing. Further human playtesting remains useful;
the evidence does not establish that every build or route should win.
