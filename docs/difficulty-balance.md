# Difficulty and voyage balance

The three voyage modes use fixed rules selected before departure and preserved in the save. They never react to a player's wins, hull condition or losses. Older saves continue as Medium. All modes start with sixteen TTL and use the same seeded map geometry, encounter content and shop item catalogue.

This report replaces the earlier one, whose figures predate the current code (the Regent's rules, the Lamplighter's opening fit and the Medium rules below all changed since). Every figure here comes from the source fingerprint recorded under *Frozen cohorts and results*.

## Fixed rules

`src/data/difficulty.ts` is the authority. Multipliers below are relative to the enemy's existing stage/depth-scaled definition. Charge time is a duration multiplier: 1.40 means a volley takes 40% longer to charge. Enemy system damage still uses discrete bars; hull and crew impact damage receive the damage multiplier.

| Rule | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| Enemy and guardian hull | 80% | 100% | 100% |
| Enemy weapon charge duration | 1.40× | 1.25× | 1.15× |
| Enemy hull/crew impact damage | 85% | 95% | 100% |
| Enemy evasion | 80% | 90% | 100% |
| Starting salvage | 65 | 45 | 30 |
| Cleared relay allocation, I / II / III | 22 / 30 / 38 | 16 / 23 / 30 | 16 / 23 / 30 |
| Additional Seal hop budget per region | 4 | 2 | 0 |
| Hull repair price, I / II / III | 1 / 2 / 3 | 2 / 2 / 3 | 2 / 3 / 3 |
| Extra units in each exchange supply bin | 3 | 1 | 0 |
| TTL floor on entering a later region | 12 | 11 | 10 |
| TTL top-up on entering a later region | 6 | 5 | 4 |

Medium was tuned down in this pass with two broad knobs: full hostile and guardian hulls (was 90%) and Hard's relay allocations (was 18 / 26 / 34). It keeps slower volleys, lighter impact, lower evasion, more starting salvage, more Seal time, cheaper Stage II repairs, a larger supply bin and more generous TTL restamps than Hard.

Artillery and brood launch timing follow enemy charge pacing. Environmental hazards retain their own mechanics. Each exchange offers a rear wagon and a keel, and a dependable weapon that needs no payloads for its region. A Freight Car adds four to a positive eligible allocation. A Workshop Keel restores up to two actually missing hull points after securing an ordinary encounter, with an aftermath receipt. Neither reward can be farmed by reopening a cleared stop.

### Opening fits and guardian rules that affect these figures

- **Lamplighter:** Burst Emitter and Payload Launcher, plus a spare Packet Laser in mount 3 that stays unpowered until the Weapons Bay gets a fourth bar. Stage II opponents carry two-layer ward meshes; without that third ammunition-free bolt the Lamplighter could only break them with payloads and ran dry. This fit was chosen from measured variants (full payload rack, cheaper payloads, Weapons Bay 4 and reactor 9, the Packet Laser powered or unpowered).
- **Glasswing:** Burst Emitter and Packet Laser, one drone slot, extra sensing.
- **Switchback:** native Veil II (ten seconds of concealment for two power), Relay and Firewall drones, a Burst Emitter and no Shield Array. Its ten-bar reactor requires rerouting drive power when the Burst Emitter and both drones are active. Its Firewall intercepts payloads, crawlers and debris, not lasers. A shield retrofit remains an optional, paid route.
- **The Iron Regent:** its gate opens to two different routes landing within 2.2 seconds. Each weapon mount and each drone is a route, and a hit on a Gate Warden counts for its route. While the gate is sealed a combat drone aims at the gate and holds its bolt to answer the tender's guns. Its Routing Edict aims at the route (Helm, then Thrusters, then anywhere), never at the guns that would give it its proof. A charged ward layer stops the Edict like any other bolt.

## Method

`tools/balance/campaign.ts` drives complete voyages through the real campaign presenter and `Sim`, including all three guardians and deliberate final delivery. It uses existing shops, rewards, upgrades, sales, repairs, route costs and combat retreat transactions. It does not create supplies, install free equipment, force victories or select event outcomes by their hidden contents. Authored car rewards remain ordinary rewards; paid car purchases are counted separately. Dockside recovery uses real walking and existing clinic/bench healing. Field service spends its actual Seal step.

Two fixed policies share each seed and starting tender:

- **Equipment:** buys sustained weapons and drone equipment, reserves money for useful Armory/Drone/Sling/Workshop refits, and develops Switchback's native Veil. It keeps the unshielded Switchback identity.
- **Support:** buys the same usable weapon opportunities but seeks Freight/Workshop/Ballast/Bunk refits and can install a Shield Array on Switchback. It exchanges offensive purchases for protection and logistics.

Both prioritize visible capability choices, charted reachable relays, supplies and repairs. They can accept surrender, disable a machine's duty mechanism, or make a legal retreat. The combat driver (`AutoPlayer`) uses real power budgets, weapon timing, crew movement, repairs and healing, and casts the Veil when a volley of two or more bolts is inbound (three alternative Veil timings measured worse against the Regent). It reserves three payloads during ordinary encounters only when its ammunition-free volley can penetrate the opponent's visible mesh; guardians use the remaining ammunition. It tops payloads up last, after weapons, upgrades and wagons. Injured crew walk to a safe powered clinic or fitted repair bench. No instant combat healing is added.

Diagnostic thresholds for this particular capable driver: roughly Easy 45–70%, Medium 38–42% (the target of this pass), Hard 5–20%, with the three starts within about ±25% of each other on Medium. These are diagnostic thresholds, not human win-rate predictions. A sampled rate is not a guarantee for every seed or every build.

## Frozen cohorts and results

**Glasswing starting fit changed after these cohorts (27 Sep, user decision).** Glasswing now starts with a Burst Emitter
and two Packet Lasers, all powered (reactor 8 → 9, Weapons Bay 3 → 4). No other rule was retuned. The tables below
predate that change. Re-measured on the same seeds, Medium only, both policies (source fingerprint
`608780f7c6893a1b98abaa5b431109cddef3d59165dcda297f72e16b64b044fe`):

| Glasswing, Medium | Before | After |
| --- | ---: | ---: |
| Training (24 seeds × 2 policies) | 15/48 | 23/48 |
| Verification (32 seeds × 2 policies) | 21/64 (32.8%) (equipment 13, support 8) | 32/64 (50.0%) (equipment 14, support 18) |
| Both cohorts | 36/112 | 55/112 |

The other two starts do not change. Glasswing moves from last to level with Switchback on Medium (both cohorts:
Lamplighter 40/112, Glasswing 55/112, Switchback 55/112, which is −20%, +10% and +10% against their mean). Medium
overall moves from 39.0% to 44.6% (150/336), above the 38–42% target. Easy and Hard were not re-run.

Training uses seed indices **1–24** (432 voyages); verification uses disjoint indices **1001–1032** (576 voyages). Actual seeds are `index * 31337`; every index is shared by all three starts, all three modes and both policies, so the rows are paired rather than independent. Medium was tuned on both cohorts together (the target applies to their combined rate); no rule or policy was changed after the final run below. Both artifacts record the same gameplay/policy source fingerprint:

`9e554a1e1b2b0104dd27a9df554c1d28f698ea16074f48addc71d4fbd299bde8`

| Mode | Training wins | Verification wins | Combined | Verification normal completion |
| --- | ---: | ---: | ---: | ---: |
| Easy | 114/144 (79.2%) | 155/192 (80.7%) | 80.1% | 191/192 |
| Medium | 59/144 (41.0%) | 72/192 (37.5%) | 39.0% | 191/192 |
| Hard | 28/144 (19.4%) | 38/192 (19.8%) | 19.6% | 192/192 |

Training completed 432/432 voyages normally; verification completed 574/576. The two remaining cases exceeded the combat policy budget without a confirmed legal retreat and count as failures in every rate above: Lamplighter/Easy/equipment at index 1030 (at the Hollow Choir, hull 13) and Glasswing/Medium/support at index 1032 (at the Null Marshal, hull 29). Neither receives a synthetic victory or unearned departure.

Easy is above its initial 45–70% band; it was left unchanged because the ordering Easy > Medium > Hard holds and this pass only targeted Medium.

### Per tender: wins and where the losses end

Wins over 48 training and 64 verification voyages per tender and mode (both policies). Loss locations are Stage I / Iron Regent / Stage II / Hollow Choir / Stage III / Blackout Core; a loss "in a stage" ended at an ordinary encounter, event or policy limit there.

| Mode | Tender | Training wins | Training losses | Verification wins | Verification losses |
| --- | --- | ---: | --- | ---: | --- |
| Easy | Lamplighter | 39/48 | 0 / 0 / 0 / 0 / 5 / 4 | 47/64 | 0 / 0 / 2 / 1 / 9 / 5 |
| Easy | Glasswing | 37/48 | 0 / 0 / 1 / 0 / 7 / 3 | 53/64 | 0 / 0 / 0 / 0 / 7 / 4 |
| Easy | Switchback | 38/48 | 0 / 0 / 3 / 0 / 4 / 3 | 55/64 | 0 / 1 / 2 / 0 / 3 / 3 |
| Medium | Lamplighter | 19/48 | 0 / 0 / 2 / 1 / 13 / 13 | 21/64 | 0 / 0 / 6 / 1 / 25 / 11 |
| Medium | Glasswing | 15/48 | 0 / 0 / 6 / 0 / 19 / 8 | 21/64 | 2 / 0 / 7 / 0 / 20 / 14 |
| Medium | Switchback | 25/48 | 0 / 6 / 5 / 2 / 7 / 3 | 30/64 | 0 / 9 / 16 / 1 / 7 / 1 |
| Hard | Lamplighter | 7/48 | 0 / 2 / 14 / 3 / 15 / 7 | 8/64 | 1 / 0 / 18 / 4 / 19 / 14 |
| Hard | Glasswing | 4/48 | 0 / 3 / 20 / 1 / 12 / 8 | 9/64 | 1 / 5 / 20 / 0 / 22 / 7 |
| Hard | Switchback | 17/48 | 0 / 7 / 17 / 0 / 6 / 1 | 21/64 | 0 / 15 / 18 / 3 / 6 / 1 |

Medium parity (both cohorts): Lamplighter 40/112, Glasswing 36/112, Switchback 55/112, that is −8%, −18% and +26% against their mean. Switchback's lead comes from the support policy, which buys it a Shield Array (verification Medium: support 21/32, equipment 9/32). On Hard the Switchback support path is the only strong build; the unshielded equipment path and both other starts win 2–5 of 32.

### Complete starter / mode / policy matrix

Wins are shown over 24 training runs and 32 verification runs per cell. Paid wagon counts can exceed voyage counts because a consist has two attachment positions.

| Mode | Tender | Policy | Training wins | Verification wins | Paid wagons, training / verification |
| --- | --- | --- | ---: | ---: | ---: |
| Easy | Lamplighter | equipment | 20/24 | 23/32 | 3 / 8 |
| Easy | Lamplighter | support | 19/24 | 24/32 | 11 / 20 |
| Easy | Glasswing | equipment | 19/24 | 28/32 | 6 / 9 |
| Easy | Glasswing | support | 18/24 | 25/32 | 9 / 21 |
| Easy | Switchback | equipment | 15/24 | 24/32 | 15 / 20 |
| Easy | Switchback | support | 23/24 | 31/32 | 13 / 29 |
| Medium | Lamplighter | equipment | 8/24 | 9/32 | 1 / 3 |
| Medium | Lamplighter | support | 11/24 | 12/32 | 3 / 17 |
| Medium | Glasswing | equipment | 10/24 | 13/32 | 1 / 5 |
| Medium | Glasswing | support | 5/24 | 8/32 | 2 / 8 |
| Medium | Switchback | equipment | 6/24 | 9/32 | 3 / 6 |
| Medium | Switchback | support | 19/24 | 21/32 | 6 / 16 |
| Hard | Lamplighter | equipment | 5/24 | 4/32 | 0 / 5 |
| Hard | Lamplighter | support | 2/24 | 4/32 | 3 / 6 |
| Hard | Glasswing | equipment | 3/24 | 4/32 | 2 / 4 |
| Hard | Glasswing | support | 1/24 | 5/32 | 3 / 5 |
| Hard | Switchback | equipment | 3/24 | 2/32 | 2 / 0 |
| Hard | Switchback | support | 14/24 | 19/32 | 6 / 9 |

Every start won in every mode in both cohorts. The measured builds remain gun/drone hybrids; a pure-drone campaign was not tested and is not claimed viable.

### Economy, encounters and losses on verification seeds

Values below average all 192 voyages per mode, including early defeats. Earned salvage includes legal sales; starting salvage is separate. Ordinary fights exclude guardians, and an unreached later region contributes zero. Negative entries are recorded resource payments/losses and crew/system consequences, not distinct event counts.

| Mode | Mean earned / spent / remaining | Ordinary fights I / II / III | Failures ending in I / II / III | Paid wagon purchases | Winning runs with paid wagons | Negative outcome entries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Easy | 1455.6 / 1405 / 115.6 | 4.7 / 5.6 / 5.7 | 1 / 5 / 31 | 107 | 83 | 257 |
| Medium | 1002.5 / 976.2 / 71.3 | 4.7 / 5 / 3.9 | 11 / 31 / 78 | 55 | 34 | 257 |
| Hard | 782.8 / 742.5 / 70.3 | 4.6 / 4.1 / 2.8 | 22 / 63 / 69 | 29 | 11 | 216 |

Verification includes **191 paid wagon purchases**: Freight 46, Workshop 50, Bunk 30, Sling 29, Ballast 17, Armory 14 and Drone Car 5. Listening Keel and Veil Car were not paid purchase targets of these two policies; their mechanics have unit/UI coverage, but this cohort does not establish their campaign value. Buying a wagon correlates with longer surviving voyages, so the purchase/win counts are not a causal estimate of a wagon's benefit.

Leading final opponents on verification seeds: Null Marshal on Easy (14) and Medium (40), Quarantine Drone on Hard (27). Guardian failures: Iron Regent 1 / 9 / 20 and Blackout Core 12 / 26 / 22 on Easy / Medium / Hard. The campaign does not bypass the Regent, replenish combat ammunition secretly, or heal wounds on a normal hop.

### Illustrative completed paths

Examples from the verification population, not a replacement for its rates. A paid-wagon victory is used when one exists. Each row completed all three guardians; the weapons are those brought to the Core.

| Mode | Tender | Seed index / policy | Ordinary fights I / II / III | Core weapons | Paid wagons | Earned / spent / remaining |
| --- | --- | --- | ---: | --- | --- | ---: |
| Easy | Lamplighter | 1004 / equipment | 5 / 6 / 6 | jumbo-frame, jumbo-frame, jumbo-frame-ii, fiber-lance | armory-car, sling-keel | 1442 / 1448 / 59 |
| Easy | Glasswing | 1003 / equipment | 5 / 6 / 6 | triple-burst, triple-burst, jumbo-frame-ii, jumbo-frame-ii | sling-keel | 1478 / 1528 / 15 |
| Easy | Switchback | 1002 / equipment | 4 / 5 / 6 | jumbo-frame, scatter-shot | workshop-keel | 1450 / 1071 / 444 |
| Medium | Lamplighter | 1004 / equipment | 5 / 6 / 6 | triple-burst, jumbo-frame, jumbo-frame-ii, fiber-lance | armory-car | 1318 / 1326 / 37 |
| Medium | Glasswing | 1006 / equipment | 3 / 4 / 7 | multicast-array, triple-burst, triple-burst, payload-launcher | sling-keel | 1463 / 1486 / 22 |
| Medium | Switchback | 1006 / equipment | 3 / 5 / 6 | triple-burst, triple-burst, payload-launcher | sling-keel | 1298 / 1204 / 139 |
| Hard | Lamplighter | 1003 / equipment | 4 / 6 / 6 | triple-burst, jumbo-frame, jumbo-frame-ii, scatter-shot | sling-keel | 1344 / 1372 / 2 |
| Hard | Glasswing | 1004 / equipment | 5 / 6 / 6 | jumbo-frame, jumbo-frame, jumbo-frame, fiber-lance | armory-car | 1321 / 1332 / 19 |
| Hard | Switchback | 1001 / support | 2 / 5 / 6 | triple-burst, scatter-shot | freight-car | 1210 / 1227 / 13 |

## Reproduction and limits

Run from the repository root with Node 24 or another Node version supporting TypeScript type stripping. The raw JSON evidence is in the ignored local QA directory; these commands regenerate it. A full cohort takes a few minutes.

```sh
node --experimental-strip-types tools/balance/campaign.ts --n 24 --difficulty all --policy equipment,support --out tools/shots/qa/difficulty-training-final.json
node --experimental-strip-types tools/balance/campaign.ts --n 32 --offset 1000 --difficulty all --policy equipment,support --out tools/shots/qa/difficulty-verification.json
node tools/balance/summarize.mjs tools/shots/qa/difficulty-training-final.json tools/shots/qa/difficulty-verification.json
node --experimental-strip-types --test src/campaign/*.test.ts
```

The runner also accepts `--tender`, `--difficulty`, `--policy`, `--offset` and `--trace` for reproducing a particular case. The `--find-win` search mode was not used for either cohort. Full traces classify unresolved combat/route limits as policy failures and never reinterpret them as campaign victories.

This is a capable deterministic driver with two specific purchasing policies, not a human usability study or an exhaustive build search. Native Veil timing, shield retrofits, ammunition reserves, payload purchases, wounded-crew movement and paid recovery remain player decisions. Human observation is still needed to assess whether those decisions are sufficiently taught, whether slower tactics feel good, and whether less successful wagon or pure-drone builds need further work. No future win-rate claim should reuse these figures after changing the gameplay/policy source fingerprint.
