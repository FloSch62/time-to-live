# Current design: TIME TO LIVE

This is the active rules reference after the [design audit](game-design-audit.md). The [contract](contract.md) records development history; older spacecraft, automatic greetings, free combat escapes and archive-destruction descriptions are superseded here. [Lore](lore.md) supplies the wider fiction.

## Carrier, connection and quarantine

The tender hangs from a physical carrier. A hop throws a relay switch and moves that trolley along the steel. The Seal quarantines signal conduits and closes route locks; it does not erase the supporting carrier. A sealed relay remains physically reachable, but each new arrival meets a quarantine patrol and earns no arrival allocation.

An attended greeting authorizes departure. An upgraded Helm retains partial evasion without its operator; it cannot greet a relay alone. At a calm berth, departure calls an available crew member to the Helm while preserving their saved station. Combat requires physical attendance and a charged handshake.

Every departure, including combat retreat, spends one TTL, advances the Seal, and arrives at a connected destination. The escape control names that destination and warns if it will be sealed. Zero TTL means no escape. The encounter remains at the old relay. Reading, tactical pause, inspecting a quiet stop and ordinary crew movement cost no route time. Waiting and marked service/actions advance the Seal. Its front stops before the guardian's established terminal perimeter.

The opening stamp is TTL 16. A released regional guardian acknowledges the onward connection and restamps it to at least 12/11/10 TTL on Easy/Medium/Hard, or adds 6/5/4 if that is higher.

## Three working tenders

All three are **lamplighter-pattern** cars from the Reach docks (lore §2, §6, §6a): brass-and-ivory body, lamp cupola
at the nose with the cab window under it, drive trolley and grip arms on the roof gripping the carrier, keel of tanks
below. They differ in fittings and proportions, and every view (new voyage, relay, combat, yard) hangs them from the
carrier at the same trolley height. Glasswing is the compact inspection car (paired nose lenses, roof prism housing,
survey horns; violet and teal accents). Switchback is the tall retrieval car (roof launch cradles and crane beside the
trolley, lower retrieval shutters; gunmetal and amber accents).

| Tender | Physical layout and native bays | Starting plan and constraint |
| --- | --- | --- |
| Lamplighter, L-12 | 12×4, 13 rooms, central lift; 3 mounts, 2 drone slots, 6 crew, 2 free sockets; 30 hull | Rescue tender with Burst Emitter + Payload Launcher and one mesh layer. Payload bypass spends charges. A spare Packet Laser sits in mount 3, unpowered until the Weapons Bay gets a fourth bar. |
| Glasswing, G-04 | Compact 10×4, 12 rooms, forward optics gallery and calibration cradle; 3 mounts, 1 drone slot, 5 crew, 1 free socket; 28 hull | Inspection tender with a Burst Emitter and two Packet Lasers, all powered from the start (reactor 9, Weapons Bay 4), one mesh layer and a survey lab (+1 Listening Post in combat; it does not reveal the chart). Synchronize volleys; limited room for extra systems. |
| Switchback, S-08 | 13×5, 16 rooms, retrieval workshop, native drone cradles and Veil shutters; 2 mounts, 3 drone slots, 5 crew, 2 free sockets; 34 hull | Relay + Firewall drones, Burst Emitter, reinforced drive and Veil II. No Shield Array. Reroute two power to Veil for its full defensive window. |

The Firewall catches payloads, debris and crawlers, not ordinary laser fire or beams. Veil timing, evasion and suppression are Switchback's visible alternatives to mesh. Exchanges offer shields at a base 90 salvage plus regional pricing: level two in the reserved lead-car room, requiring two reactor bars for the first layer.

Each hull has distinct art, dock history and an opening. Renaming changes its current plate, not its identity. The Runbook's **This Voyage** page keeps commitments, crew motives, remembered incidents and losses alongside that history.

## Expansion cars as run decisions

There is one rear coupling and one keel suspension. Each choice therefore excludes the other cars in that position. Replacing a car leaves it at the exchange; modules return to stores and displaced equipment goes to cargo or is sold if it cannot fit. Removing occupied crew capacity is blocked. An exchange buys an unwanted car for half its base value; abandoning one at a bench pays nothing.

| Car | Job during the voyage | Investment and tradeoff |
| --- | --- | --- |
| Armory, rear | Extra roof mount and 10% faster weapon charging | 75 salvage, −3% evasion. Guns, weapon capacity and reactor power are separate purchases. Good once the current weapons work. |
| Drone, rear | Drone Bay IV, an extra slot, six more spare capacity and 15% faster drone cycles | 90 salvage, −3% evasion. Drones and reactor power are separate. Switchback can use it for a fourth drone and faster support. |
| Freight, rear | Four extra cargo slots and payload capacity, three hull, +4 salvage at supplying arrivals | 65 salvage, −2% evasion. An early logistics investment; exhausted, revisited, sealed and guardian berths do not pay repeatedly. |
| Bunk, rear | Three berths plus a 2 HP/s recovery bench for people and riggers | 65 salvage, −2% evasion. Recruitment costs extra; recovery needs actual crew movement into the bench. |
| Veil, rear | Veil II and 10% shorter cooldown | 110 salvage, −3% evasion. Reroute or buy two power for the full window. Dedicated defense frees a socket for other work. |
| Ballast, keel | Eight hull, half debris hull damage and half air loss | 70 salvage, −3% evasion. Broad endurance for storms or thin-air faults; system damage remains discrete. |
| Listening, keel | Extra sensing and nearby route information | 70 salvage, −1% evasion. Helps choose useful stops and avoid poor commitments without consuming weapon power. |
| Sling, keel | Extra belly mount and four payload capacity | 65 salvage, −1% evasion. A lighter firepower alternative; weapon and power are separate. |
| Workshop, keel | 35% faster repairs, equipped bench, two spare capacity, up to two missing hull restored after secured ordinary fights | 85 salvage, −2% evasion. Repeated attrition support; no recovery on player retreat or guardians. The receipt shows actual recovered hull. |

Rear cars and the Workshop Keel also add a room socket. Native systems retain their bay when a duplicate-system car is attached, while its capacity and cycle benefits still apply. Duplicate housing modules cannot waste another socket. Reusable ballast modules increase maximum hull without granting free repairs when repeatedly removed and fitted.

The exchange shows the complete fitted vessel, effects and handling cost before every car purchase. Refit animation uses the actual car, its gangway or suspension and a final lamp test.

## Difficulty

Choose Easy, Medium or Hard before beginning; it stays with the save and is shown on Continue, pause and the final voyage report. Rules are fixed for the whole voyage: no hidden adjustment follows success, failure or remaining hull. Easy provides slower hostile volleys, lighter opponents, cheaper repairs, more salvage and extra route time. Medium keeps full hostile hulls and asks for preparation under a limited budget, with slower volleys and more time than Hard. Hard adds full hostile damage and evasion, faster volleys, leaner stores and a closer Seal. The authoritative multipliers and stock values are in `src/data/difficulty.ts`.

## Recovery and spending

Wounds and system faults survive ordinary hops. After victory, accepted surrender or an opponent's departure, the crew patches system bars at the secured berth; the aftermath receipt records this. Hull and wounds remain, except for the Workshop Keel's explicitly recorded limited hull recovery. Player retreat receives no such repair. Event faults remain until combat repairs or field service resolve them. At a quiet berth, shore power supplies an intact Infirmary: eligible crew recover while inside it, even with reactor power reserved for travel. Riggers use a repair bench or field service. **Field service** restores crew and system bars for one Seal step, without repairing hull or replenishing supplies. Cleared sealed berths permit service to avoid a broken-drive deadlock. Service that newly lets quarantine reach a berth warns of the resulting patrol.

Resolved, eligible unsealed arrivals unlock a single stage- and difficulty-specific allocation: Easy 22/30/38, Medium and Hard 16/23/30 salvage in Copper/Glass/Heart. An attached Freight Car adds four. The receipt says **arrival allocation**, not payment for an unperformed job. Start/guardian relays, revisits and sealed arrivals cannot be farmed. Adverse events can waive the allocation. Hull repair, ammunition, spares, equipment, system capacity and reactor support compete for these stores; deep upgrades become more expensive.

The three regions have longer connected routes, patrol territory, early benches and midpoint Exchanges. Some interceptions begin directly, without a story-choice gate. The audit's visit/fight ranges remain tuning targets, not runtime quotas. Reading never spawns an extra enemy.

## Battles, duties and delivery

Selected duty-release encounters require suppression of named machinery and an uninterrupted attended Helm channel. Losing attendance, power or suppression interrupts the attempt. Successful release preserves the machine.

The Iron Regent tests distinct attack sources: its gate stops every hit until two different routes land within 2.2 seconds. Each weapon mount and each drone is its own route, and a hit on a Gate Warden (a piece of the gate stepped out) counts for the route that made it. While the gate is sealed, a combat drone aims at the gate and holds its bolt a few seconds to answer the tender's guns. The Gate Wardens mend the Regent and shorten the opening. The Regent asks for proof of a second way home, not the tender's destruction, so its Routing Edict aims at the route (Helm, then Thrusters, then anywhere) and never at the guns that would give the proof. The Hollow Choir opens to three hits within one second or to a twelve-second attended helm channel; damaged bells speed the channel and lengthen the opening, and holding the channel drains the departure handshake charge. The Blackout Core's isolation shell surrounds an archive that must survive. Opening that shell makes delivery safe. The player explicitly sends **I hear you hear me** to complete the connection.

Guardians open, unfold or separate when their tasks end. Routine combat has one aftermath presentation. Human surrender, safely disabled vessels, shutdown and fatal losses receive distinct wording and statistics. Autonomous hunters use controllers and mechanical repair, with no walking crew. Boarders traverse a visible grapple; disrupting their launcher can cancel transit.

## Words

One term per thing, in UI and prose (lore §13): Shield Array (system) = ward mesh (prose), counted in mesh layers,
never "shields"; payloads (slug-thrower charges, never missiles); spares (automaton spares); salvage (currency);
Exchange (market relay); Thrusters (system) = the drive (prose); at the helm (never piloting); the Veil douses (never
cloaks). Text that assumes the Lamplighter is gated to it.

## Presentation

Each region has five paintings, including distinct working landmarks and refuges. Parallax machinery, stars and hazard light animate behind the vessels; local sun glare, glass dust, debris and other weather also pass in front of the world while leaving the HUD clear. Quiet berths choose refuge scenes and sunward docks place their glare at the visible light source.

Every view where a tender or crawler hangs draws the same carrier (`src/combat/carrier.ts`): a braided cable **6 layout units thick at zoom 1** (12 px in the 2× hull art; sheave grooves are sized to it), scaled with the vessel it carries, crisp on the vessel sprites' pixel grid. Copper Reach carriers are verdigris-crusted copper, Glass Cathedral carriers violet-sheathed optical trunks with a teal core, Blackout Heart carriers soot-dark with ember glints; views without a region use dark steel. At a relay the carrier runs through the tower's switch frame. Hull art may provide a separately painted drive trolley (`trolley` in `ships.json`, back and front layers); the carrier then passes through the carriage: hull, trolley back, carrier, trolley front.

Mesh status separates installed capacity, powered capacity and charged layers. An unfitted vessel has no phantom field or recharge state. Its contour follows rear/keel cars; impact, collapse, recharge and bypass cues follow actual rules. Guardian barriers are explained separately.

Critical hails remain readable while paused and in history. Capability choices identify uncertainty; preparation changes odds only where a modifier is authored. Some adverse events and costly rescues provide no compensating reward.

Reduced motion freezes ambient/machinery cycles and skips refit travel while keeping labeled states. Text speed is configurable. Refit couples or hoists the actual car, latches it and tests its lamp; skipping preserves the transaction.

## Validation boundary

Automated checks cover state transitions, legal purchases, fixed-seed combat and browser layout. They cannot establish enjoyable session length or an unfamiliar player's understanding. The [implementation record](design-audit-implementation.md) separates evidence from remaining player evaluation.
