# TIME TO LIVE — deep game design and lore audit

**Date:** 27 September 2026  
**Scope:** The game in `time-to-live`, assessed against the FAULTLINE canon in the sibling `faultline` project. FTL is the design reference.  
**Deliverable:** Analysis and recommendations only. No game code, balance values, artwork, audio, or existing design documents were changed for this audit.

**Design clarification incorporated:** Some encounters should begin directly in combat, without a preceding decision. Autonomous robotic vessels should actively search for unknown, untrusted signals—including the Lamplighter—and the voyage must sustain real pressure and danger. These are requested design goals; the detailed treatments below are proposals for achieving them.

**Further requested direction:** Explain the tenders' working purpose and armament in the playable introduction. Offer three starting tenders: the existing Lamplighter, an additional laser-focused tender with no starting payload weapon, and an additional drone-focused tender. Improve visible shielding so protection and its loss can be understood during combat. The two additional choices supersede this audit's earlier recommendation to defer starting-vessel variety; one selected vessel and its crew still carry each complete voyage.

**Starting defenses and economy:** Shields are not universal starting equipment. Normal successful voyages should usually finish with specialized, incomplete builds rather than every system at maximum. Upgrading, installing a missing system, buying equipment, and preserving operating supplies must compete for the same limited budget. These are requested design constraints, including for the proposed longer campaign.

**Event danger and uncertainty:** Some events should simply hurt the expedition and leave real consequences. A sensible or compassionate choice can fail, and chance can change the outcome. There need not be a correct answer, a harmless exit, or a compensating reward in every encounter. These are requested design goals; particular odds, losses, and event treatments below remain proposals.

**New design details:** [Bad events and chance](#77-bad-events-failed-good-intentions-and-chance--requested-direction-p1) · [What tenders do and why they are armed](#46-explain-the-working-vessel-and-its-armament--p1) · [Meaningful upgrade spending](#99-upgrades-must-compete-with-purchases--requested-direction-p0p1) · [Visible shielding](#175-visible-shielding-needs-a-clearer-physical-and-interface-language--p0p1) · [Three starting tenders](#185-three-starting-tenders--requested-direction-p1) · [Starting without shields](#186-shields-are-optional-starting-equipment--requested-direction-p1).

**Navigation:** [Verdict](#1-verdict) · [Evidence limits](#2-what-was-examined-and-what-the-evidence-means) · [Lore fit](#4-lore-fit-what-belongs-what-needs-clarification-what-conflicts) · [FTL and identity](#5-what-to-learn-from-ftl-and-how-to-remain-distinct) · [Game flow](#6-game-flow-the-current-rhythm-and-the-desired-rhythm) · [Encounter stories](#7-should-every-encounter-have-a-story) · [Travel and economy](#9-travel-map-pressure-and-the-economy) · [Crew](#10-crew-and-the-interior-life-of-the-tender) · [Direct fights and robotic hunters](#116-direct-fights-and-autonomous-signal-hunters--requested-direction-p1) · [Guardians](#12-the-three-guardians-should-prove-three-different-things) · [Enemy roster](#13-enemy-by-enemy-opportunities) · [Encounter examples](#14-seven-encounter-treatments-worth-prototyping) · [Animation](#15-animation-audit-what-exists-and-what-is-actually-missing) · [Sound](#16-sound-and-music-already-substantial-still-missing-world-behavior) · [Interface](#17-interface-information-and-accessibility) · [Endings and replay](#18-endings-defeat-replay-and-persistence) · [Prioritized register](#19-missing-work-register) · [Work order](#20-recommended-order-of-work) · [Player validation](#21-how-to-tell-whether-these-changes-actually-help) · [Source map](#23-evidence-and-source-map).

## 1. Verdict

TIME TO LIVE has a strong setting, an unusually good central vehicle, extensive writing, and a real tactical game underneath its presentation. The Lamplighter, its modular cars, the three-line greeting, the Operator's finite stamp, and machines trapped in obsolete duties belong together. This can become a distinctive FAULTLINE game.

The largest weakness is the connection between those ideas and what the player actually does. The prose often describes maintenance, responsibility, release, or reconciliation. The repeatable action is usually selecting a text option, fighting a conventional systems-and-hull battle, receiving resources, and selecting another node. The world describes more specific situations than the simulation can express.

**The next major design step should make the lore observable and actionable.** A machine should visibly perform its duty, including detecting and attacking an untrusted connection. Some confrontations begin before the crew can negotiate or inspect anything. The player learns through the machine's behavior and responds through combat. Ending it should change the machine, the relay, or the traffic it was holding.

**Danger is a central part of that identity.** The Line contains autonomous vessels whose standing orders make the Lamplighter a target. Direct, unavoidable combat openings should recur throughout the voyage. Surviving can mean defeating the hunter, disabling its pursuit, or earning enough time to escape. A special story choice or peaceful solution is not required for every fight.

The same danger should exist outside combat. Sometimes a cable fails, a plausible repair goes wrong, or help arrives too late. The player may have to absorb a loss and change the next purchase or route. Making a reasonable decision should improve the voyage's prospects without guaranteeing a favorable result at every stop.

The game does not primarily need more events, more currencies, more weapons, or more lore explanations. It needs better encounter consequences, clearer travel rules, more varied objectives, a stronger emotional connection to the crew, and animation that communicates what the world is doing.

### The ten most important changes

1. **Make ending a machine's task a playable and visible outcome.** Differentiate stopping, disabling, releasing, escaping, and destroying.
2. **Resolve the carrier/Seal/return-path logic.** Explain how the final connection works if the physical carriers behind the tender have been cut.
3. **Make combat retreat agree with travel.** “Hop” currently ends combat without spending TTL or moving to another relay, including at TTL zero.
4. **Give encounter premises mechanical expression.** A damaged machine, threatened family, unstable cable, or protected parcel needs corresponding battle conditions or objectives.
5. **Give direct fights a proper place in the flow.** Robotic interception can lead straight into combat, with no event-choice gate. Reduce repeated outcome and reward confirmations afterward.
6. **Make the guardians test different ideas.** Regent and Choir currently emphasize similar volley timing. The final victory needs to communicate successful connection, not destruction of the archive.
7. **Connect authored guardian writing to actual combat states.** Much of the intermediate guardian script is present but unused; some also needs revision to match the current mechanics.
8. **Animate the shipped world, not only fallback art.** Add regional machinery, weather, traffic, and persistent responses to player actions.
9. **Give the crew a small amount of personal continuity.** Names and skills need memories, a reason to volunteer, and reactions to what happened to them.
10. **Repair the safe-stop experience.** Dockside healing, capability descriptions, risk communication, and the meaning of maintenance rewards should be consistent and understandable.

### A useful identity statement

> You lead a maintenance crew across a quarantined Line, keeping a fragile tender and a finite connection alive under automated pursuit long enough to let old messages arrive.

Use this to judge additions. Does an idea make the player feel responsible for a working vessel, other people, a connection, or an unfinished duty? If its only benefit is making the feature list resemble FTL, it has a weaker claim on development time.

## 2. What was examined, and what the evidence means

This audit compares the original [FAULTLINE lore](../../faultline/docs/lore.md), this game's [lore expansion](lore.md), the evolving [design contract](contract.md), the campaign and combat implementations, authored event decks, presentation code, and existing balance/validation reports. Browser inspection covered campaign and combat presentation, including the guardians; additional combat views were inspected at 1366 × 768. The larger views were inspected at 1920 × 1080.

Small read-only state probes confirmed the zero-TTL combat retreat behavior and the lack of dockside infirmary healing. Content inspection counted the current event definitions. Browser probes used isolated contexts, without changing a player's saved voyage.

**Limits:** This is a design audit, not a fresh full-campaign human playtest, a new balance benchmark, or a subjective audio listening sign-off. Developer combat presets help inspect presentation; they do not prove those loadouts are affordable during an ordinary voyage. Existing automated results are cited as existing evidence, not as tests rerun for this document. Recommendations about enjoyment and pacing remain hypotheses to test with players.

Terms used below:

| Label | Meaning |
| --- | --- |
| **Exists** | Present in the current implementation; preserve or refine it. |
| **Partial** | Some support exists, but the full player-facing experience does not. |
| **Mismatch** | Current behavior, writing, or presentation makes conflicting promises. |
| **Missing** | No corresponding support was found in the examined gameplay path. |
| **Proposal** | A design direction suggested by this audit, not existing canon or an approved implementation plan. |

Priorities are about design dependency, not estimated development time:

| Priority | Meaning |
| --- | --- |
| **P0** | Resolve before expanding the affected feature: contradictions, misleading behavior, central identity decisions. |
| **P1** | Build into the next representative playable slice. |
| **P2** | Expand after the core experience has demonstrated its value. |
| **P3** | Optional breadth or polish; do not let it displace the central work. |

The contract contains superseded directions. Its early spacecraft and race language should not override the later cable-tender revisions. That history is useful, but a compact current design reference is missing. Some apparent contradictions are documentation drift rather than a mandate to redesign the game.

## 3. What already works and should be protected

### The Lamplighter is a strong protagonist

Keeping one tender and one crew throughout a voyage creates continuity. Its cupola lamp, worn brass, warm interior, cracked-grip history, and previous rescue work are more memorable than a generic unlockable spaceship. Rear and keel cars make progression visible in the vessel's silhouette and change the distance crew must travel.

Keep the sense that this is an old working machine whose usefulness has outlasted the institution that built it. Upgrades should look installed, salvaged, and maintained. A late-game tender should look like the same vessel carrying the history of the voyage.

The requested selection of three starting tenders extends this principle: choose the working vessel before departure, then remain with it throughout that run. L-12 retains its particular history; the other two should be distinct members of the same maintenance fleet, with their own former jobs and visible fittings. They should offer more than different paint on an otherwise identical starting experience.

### The setting explains several FTL-like systems unusually well

The ward mesh grounds shots through a carrier. Evasion is surging and swinging on that carrier. Air, breaches, fires, bulkheads, and crew movement make sense in a pressurized vehicle above the cloud floor. TTL is a finite connection stamp rather than an arbitrary fuel crystal. The three-part handshake gives travel a ritual and a physical mechanism.

These are valuable foundations. They need clearer animation and a few rule corrections, not replacement.

### The writing has an identity

Kettles, borrowed tools, awkward kindness, unfinished rounds, procedural refusals, and small ordinary messages support FAULTLINE's tone. The Kittiwake, Moss and the Second Helping, Pell's letter, the music box, and courier material already establish recurring human concerns. The story is not absent.

The strongest emotional unit is often a small thing that finally becomes possible: a lamp put out properly, a letter accepted, a duty released. Keep that scale even when the final machinery is enormous.

### There is already a substantial game

Pause and command, reactor allocation, layered defenses, distinct weapon behavior, crew skills, damage control, lifts, boarding, drones, Veil, refits, surrender, retreat, route pressure, and permanent loss all exist. So do story chains, a Runbook, a Field Guide, persistent knowledge, adaptive music, animated crew, projectile effects, doors, shields, and vessel movement.

The interface uses a coherent game-like visual language. The cutaway tender is large and recognizable. Player and enemy occupy separate areas, with independent view controls. These are strengths to preserve when making intent and status clearer.

**Do not restart the design as a generic survival game.** Most of the required building blocks are already available.

## 4. Lore fit: what belongs, what needs clarification, what conflicts

### 4.1 Canon that should remain fixed

The original lore establishes the Line above the cloud floor, the Fault thirty-one years ago, the evacuation to Ground, the Runbook, the Record, the Operator, and the Core's impossible obligations. The disaster follows several acts of care whose procedures interacted catastrophically. There is no need for a hidden evil mastermind.

Protect these constraints:

- The Core is trying to preserve and deliver. It is neither a demon nor a conventional villain.
- The Keeper is whoever answers. The crew's choice to volunteer matters more than destiny.
- Ground continued living. The world is not simply an empty universe waiting for the player to restore all life.
- The archive and its messages are the reason to reach the Heart. They must not read as targets to erase.
- The First Shift, the initiating strike, the missing Handover, and other designated uncertainties should remain uncertain.
- Do not explicitly settle the identity behind every personal message or connect the masked Ghost and teal-jacket caller beyond what canon allows.
- Mechanical and architectural strangeness should remain industrial. Avoid turning tuning forks, wards, and cathedral forms into literal spellcasting or fantasy religion.

These constraints still leave ample room for new local people, working practices, damaged relays, and unfinished jobs.

### 4.2 Fit matrix

| Element | Assessment | Design consequence |
| --- | --- | --- |
| Crew as the Keeper | **Fits strongly.** Responsibility belongs to the people aboard. | Keep collective acknowledgement and individual crew contributions. |
| Cable tender and modular cars | **Fits strongly.** Maintenance becomes physical and spatial. | Let the vessel's history and refits remain visible. |
| Finite TTL | **Fits strongly.** A finite stamp responds to the catastrophe caused by traffic without an expiry. | Teach hops, re-stamping, and expiry as one clear rule. |
| Quarantine pressure | **Fits in motive; physical consequences unresolved.** | Clarify what is locked, severed, still conducting, and still traversable. |
| Ward mesh, air, evasion | **Fits.** | Show carrier grounding, constrained movement, and pressurized interiors. |
| Crewless hostile machines | **Fits strongly.** Existing machines treat living arrivals as unknown senders. Escort automatons explain some internal repair activity. | Include autonomous vessels whose bodies contain only machinery, alongside machines carrying service automatons. Give some the explicit job of detecting and intercepting untrusted signals. |
| Human scavengers | **Fits if treated as people.** | Preserve fear, bargaining, surrender, and remembered conduct. |
| “Task ended” victory | **Fits in text; partial in mechanics and animation.** | Show the duty actually ending and what it releases. |
| Instant materialization of boarders | **Conflicts with the stated physical boarding explanation.** | Show carrier travel, grapples, rotors, or an entry point. |
| Unmanned handshake at higher Helm level | **Conflicts with the expansion's explicit manned-greeting rule.** | Decide whether an attended acknowledgement is required or revise that rule deliberately. |
| Destroying the Core's hull to win | **Ambiguous.** Can mean breaking its isolation shell, but the presentation must establish that. | Separate isolation machinery from the archive and finish with delivery. |
| Crew “species” taxonomy | **Terminology drift.** Most categories are human occupations/cultures; riggers are automata. | Prefer crew background, training, or kind in writing. Internal identifiers need not drive a rewrite. |
| Gothic forms | **Fits as industrial architecture and distant spires.** | Keep gates, optics, bells, ribs, and conduits functional; avoid generic haunted-castle props. |

### 4.3 The largest unresolved causal question: what connection survives the Seal? — P0

The expansion says Cable Wraiths cut the carriers behind the tender. It also says the final messages travel out along carriers, while sealed relays remain reachable through the map and retain working switchgear. A standby switch explains how a dark relay operates. It does not, by itself, explain how a physically severed span carries the tender or the final return signal.

This is an unresolved world-model question, not proof that the entire premise fails. It deserves one explicit design decision before more travel scenes are written.

**Recommended direction, subject to canon approval:** most Seal progression closes and isolates routes while leaving their physical supports intact. Actual severing becomes a specific, visible threat or event. The ending releases quarantine on a viable signaling route that the voyage established or made possible. If the story instead requires widespread literal severing, establish a distinct surviving communications path and show how the crew proves it. Do not imply that a final light pulse repairs missing steel.

The player should be able to answer:

1. What is keeping the car suspended?
2. What carries its messages?
3. What does sealing this relay prevent?
4. What can still pass through it?
5. Why can the final reply reach the Operator or Ground?

A diagram in the lore reference and one short in-world demonstration would do more than additional exposition scattered across random events. The game does not need to import FAULTLINE's original deck-and-network puzzle to answer these questions.

### 4.4 The machine is not its task — P0/P1

The lore explicitly distinguishes ending a task from killing a machine. Current ordinary victory usually comes from reducing enemy hull to zero, followed by destructive effects and a task-ended line. Crawlers and fliers can fall away. The text carries most of the distinction.

Keep physical danger, weapons, sparks, and irreversible damage. The needed change is a clearer vocabulary of outcomes:

| Outcome | What the player sees | What it means |
| --- | --- | --- |
| Duty released | Clamp opens, held traffic leaves, mechanism settles. | The original purpose can finally complete. |
| Safely disabled | Motor winds down, tool retracts, standby lamp remains. | The crew interrupted a dangerous procedure. |
| Forced shutdown | Broken actuator, emergency brake, smoke, exhausted power. | The crew survived by damaging the machinery. |
| Human surrender | Weapons lower, a person answers, terms are honored. | Other people live with this result. |
| Destruction or fatal loss | Structural failure and an appropriate aftermath. | Something was actually lost; do not use the same cheerful receipt. |

These need not become five new reward systems. They need correct end states, language, and occasional persistent consequences. A single mandatory pacifist solution would also flatten the setting: sometimes the crew must fight to survive.

Ending a task can require a hard, damaging battle. A robotic hunter can keep firing until its control machinery or structure fails, refuse every attempted hail, and seriously injure or kill the crew. Its procedural origin explains its behavior; it does not make it gentle or guarantee an alternative to fighting. Many ordinary encounters should remain straightforward battles with a clear physical ending.

### 4.5 Preserve mystery without making the objective obscure

The builders' identity can remain unknown. What the player is doing at the next switch cannot. The audience should understand that the crew is opening a route and ending isolation, while remaining uncertain about the deeper history.

Keep technical metaphors understandable through material actions: a stamp, a clamp, a lamp, a reply, a released brake. Dense networking terminology should enrich the world after the player understands the consequence.

### 4.6 Explain the working vessel and its armament — P1

**The lore already answers these questions, but the explanation needs to reach the player before the tender reads as an inexplicably armed cable car.** A codex entry alone is insufficient for the vehicle at the center of the game.

Before the Fault, cable tenders were pressurized maintenance and rescue cars. They reached outside cable runs and relay equipment where internal corridors did not go. Lampers used them to relight guide lamps, splice carrier cores, clear snagged wreckage, tow stalled freight, and take people off broken platforms. Their cabins, grips, lifts, tool mounts, and modular cars follow from that work.

Their armament also has an established material history:

| Equipment | Established working origin | Why it is dangerous now |
| --- | --- | --- |
| Packet Laser | A relay signal emitter. | It is driven hard enough that its light cuts. |
| Burst Emitter | Paired emitters for relighting neighboring relays in one pass. | The same paired pulses can strip defenses and damage machinery. |
| Fiber / Trunk Lance | Optical tools for fusing and splicing carrier cores. | Concentrated cutting/fusing power can be directed at a hostile machine. |
| Payload Launcher | A launcher for repair charges sent to inaccessible relay equipment. | Its charges have been changed; the mount and aiming function remain useful. |
| Breach Spike | A carrier anchor used to pin cable to a gantry. | The modified projectile can penetrate a hull. |
| Jammer | A fault-finding tool that tests which systems respond to noise. | It can overwhelm inputs and interrupt a machine's power or control. |

This is supported by the current [tender lore](lore.md) and [equipment flavor](../src/content/flavor.ts), rather than a new claim that the original fleet was secretly military.

**Why take those weapons on this voyage?** The crew will travel through machines that classify them as untrusted traffic and through quarantine enforcement that can cut their route, seize the tender, or kill them. Some old tools have been repurposed; some fittings are later additions. The Night Shift prepares a vessel that can do useful work and survive that journey. The mission is delivery, but the danger makes armament necessary.

State this plainly. Avoid making every gun a harmless tool in dialogue while it causes obvious lethal damage on screen. Its origin explains its shape; its present use is an intentional combat adaptation. Equally, do not imply that lampers routinely shot at people during ordinary pre-Fault maintenance rounds.

**Put the explanation in three places, each doing a different job:**

1. **Tender selection:** one short statement of the vessel's former job, with visible tool mounts and the actual starting equipment. Explain the gameplay tradeoff beside the history.
2. **Departure:** show a brief working action—a lamp relit, a test pulse sent, a repair drone docking—then show the equipment checked for the hostile route. A few well-staged lines can establish purpose without adding another long opening sequence.
3. **The first relevant encounter:** let the player see the relationship. The same emitter that answered a relay now fires into a hunter's ward mesh; the same drone bay used for external service launches the vessel's defense.

Suggested introductory copy, for adaptation to the selected tender:

> Cable tenders went where the inside crews could not: relighting lamps, splicing carriers, towing stalled cars, and taking people off broken platforms. Their mounts carried signal lamps and repair tools. Since the Fault, the machines outside no longer trust a living sender. The Night Shift has changed the tools accordingly. This one will carry your crew—and keep the route open long enough for an answer.

Use a short version in the opening and keep the full history optional. The player should leave knowing **what the vessel was built to do, why it runs on a carrier, why it is armed now, and why these volunteers are aboard**.

## 5. What to learn from FTL, and how to remain distinct

FTL's official description emphasizes managing a ship and crew through dangerous, varied situations, choosing between tactical responses, and pausing to plan. Those are useful reference points for TIME TO LIVE's pressure, preparation, and crew responsibility. [FTL official store description](https://store.steampowered.com/app/212680/FTL_Faster_Than_Light/)

The developers' GDC session description also emphasizes designing around a particular feeling and allowing mechanics and genre choices to change in service of it. That is the most useful lesson here: define the experience of being this crew before matching another game's feature list. This audit uses the published session synopsis, not a claim to have watched the talk. [Designing Without a Pitch: FTL](https://www.gdcvault.com/play/1019036/Designing-Without-a-Pitch-FTL)

The following comparison is this audit's design interpretation:

| Design principle | Keep | Transform for TIME TO LIVE |
| --- | --- | --- |
| Scarcity | A detour has consequences; preparation matters. | Spend finite permission and dwindling route safety, with socially meaningful re-stamping. |
| Shared power | Several good systems compete for a limited supply. | Show rerouting power through a working tender; tuning and salvaged equipment fit its culture. |
| Crew vulnerability | A bad room-level decision can become a personal loss. | Give volunteers local knowledge and a few memories beyond their statistical role. |
| Route pressure | You cannot inspect everything in one run. | Quarantine closes connections for understandable procedural reasons. |
| Tactical pause | The player can think under simulated pressure. | Reading a message or inspecting the Runbook must not secretly consume route time. |
| Emergent stories | Mechanical consequences create memorable incidents. | “We kept the old round going with one engineer” should be as memorable as “we won the fight.” |
| Build identity | Different equipment makes different problems manageable. | Cars, access routes, duty-ending tools, and information capabilities distinguish the tender. |
| Climactic preparation test | The final encounter asks whether earlier decisions were adequate. | Prove that a live route can hold while the Core's isolation machinery resists. |

### Three differentiators worth concentrating on

**1. Machines with jobs.** Their original duty changes their behavior, their vulnerabilities, and the result of defeating them. Some maintain old infrastructure; others actively search for untrusted traffic and attack it. The latter supply a recurring threat that needs no preliminary dilemma.

**2. A physically evolving maintenance tender.** Refits change movement, emergency access, silhouette, and the kind of work the crew can undertake. This already has substantial implementation support.

**3. A voyage of acknowledgement.** Greetings, promises, carried messages, and replies connect the tactical journey to its ending. Keep the mechanic compact: a handful of consequential commitments, not another sprawling resource economy.

These can produce a recognizable identity without adding hunger, oxygen tanks as a second travel fuel, a full crafting tree, faction reputation meters, romance simulation, or a separate management game.

## 6. Game flow: the current rhythm and the desired rhythm

### 6.1 Current structure

The campaign begins with an eleven-beat prologue and a five-beat first-stage introduction before the first hub. Later stages also use introductions and outros. Skipping exists, but new players must decide whether to skip material before knowing which parts matter.

A regular encounter can follow this sequence:

> Arrival → event introduction → choice → written outcome → combat → combat-end confirmation → reward/aftermath confirmation → relay hub → chart → next hop.

Some paths are shorter, some have overflow decisions, stores, chained events, or extra scripts. Guardians can add approach, defeat, stage-outro, and next-stage-intro sequences. This is not a claim that every relay takes the maximum number of clicks. It is a structural risk: several systems independently ask the player to acknowledge the same transition.

The combat scene has its own end presentation, and the campaign can then present another victory window. An empty relay still uses the event-window structure. The player can spend considerable time moving between presentation layers rather than operating the tender.

### 6.2 Target rhythm — P1

Use four distinct cadences:

| Cadence | Appropriate flow |
| --- | --- |
| Routine travel | Arrive; see a brief transmission or environmental change; collect a clear receipt; plan the next hop. |
| Direct interception | Arrive or come under detection; a robotic vessel acquires the tender; combat begins without an event-choice window; survive and receive one integrated aftermath. |
| Consequential situation | Understand the problem; make a decision; play its consequence; receive one integrated aftermath. |
| Landmark | Approach and anticipation; major decision or confrontation; a distinct release; quiet aftermath. |

Preserve the ability to linger. Remove the requirement to repeatedly confirm that nothing new happened.

**For a direct fight:** the scan, locking weapon, or approaching vessel establishes the situation. A short transmission such as “UNTRUSTED SIGNAL. INTERCEPTING.” can accompany the action. There is no required “Fight / Talk / Leave” menu and no artificial single “Continue” option pretending to be a choice. Existing tactical pause and arrival auto-pause preferences still apply; the encounter is committed regardless. The player makes decisions about power, targets, crew, and escape once the confrontation is underway.

**For a normal fight:** show the machine settling in the combat scene, attach salvage and important changes to that same aftermath, and allow departure planning from there. Open a separate event only if a new decision actually follows.

**For a quiet relay:** let the scene carry the moment. A kettle steaming behind a repaired window can communicate more than a full modal describing a kettle. Offer optional inspection and record the text in the Runbook.

**For a guardian:** avoid stacking several full-screen explanations after the emotional climax. Let the shutdown breathe, let one crew response land, then move into the next region.

### 6.3 The opening should teach through one small job

The current opening has atmosphere, but front-loads terminology and passive beats. Test an alternative opening that preserves the Operator and first stamp while giving the player a meaningful action earlier.

Suggested first three hops, as a prototype rather than a fixed mandatory campaign:

1. **Leave Relay Seven.** Answer the greeting with a crew member at the helm, see the press stamp sixteen hops, and watch the physical switch transfer. Teach pause and the difference between capacity and powered equipment.
2. **Handle a modest working fault.** A clearly forecasted jam or damaged mechanism introduces a repair order and one power tradeoff. The result visibly opens the carrier or lights the relay. Avoid a hidden lethal roll in the tutorial.
3. **Choose a route and meet its danger.** Offer a legible service stop and a riskier opportunity. Introduce TTL and the next Seal step through the chart. Include an early, manageable autonomous interception once the basic controls are understood, so the player learns that some enemies attack without asking permission.

Make detailed controls and remembered lore optional through the existing Field Guide and Runbook. Do not require the player to memorize all systems before commanding one crew member. Returning players need a short departure path that preserves the same starting rules.

### 6.4 Rest is part of tension

All-dark, all-danger, all-important storytelling becomes flat. The voyage needs safe competence, humor, quiet, and loss in different proportions.

Copper should give the player useful work and human contact. Glass should make familiar sounds and procedures feel uncertain. The Heart should compress choices and reveal the cost of keeping everything indefinitely. A bench before a hard leg should feel materially different from a fight with no enemy on screen.

Treat these as pacing goals, not fixed quotas. A director can avoid long accidental streaks of combat or dense prose while preserving uncertainty.

Dangerous stretches should also be allowed to contain successive fights. Guaranteed alternation between a fight and a free recovery stop would make pursuit predictable. Keep credible refuges and viable preparation, but let an encounter leave the crew damaged, short of supplies, and forced to reconsider the next route. The relief at a bench should be felt because reaching it mattered.

### 6.5 More stages or longer stages? — recommendation grounded in the current fight count

**Keep the three major lore regions. Increase combat frequency first, then moderately lengthen the route actually traveled through each region.** Adding more named regions would increase art, writing, and guardian scope before correcting the sparse combat within the existing journey. Longer maps with the same encounter distribution could simply produce more reading and service stops.

The available evidence supports the reported lack of fights:

- Each generated chart contains 20–24 relays, but the shortest route is only 6–8 hops in Copper and 6–9 in Glass and the Heart. The chart's total node count is not the length of a played stage.
- After fixed service/hazard/distress locations are assigned, the remaining random relay slots have approximately 31%, 32%, and 38% combat weight by region. This is not the probability that a visited relay produces a fight: route selection, fixed locations, and event choices all change that.
- The generator has a 60% chance to convert a combat-type relay adjacent to the start into an event-type relay. That gentler opening applies to every stage, not just the initial tutorial; an event-type relay can still lead to combat.
- A scan of the 45 combat-pool events found ten with an unconditional choice whose outcomes end without combat or a follow-up. Additional conditional technical options can also bypass combat. Useful avoidance should remain, but a combat label does not guarantee an actual battle.
- In the **existing saved 128-run campaign benchmark**, the six winning runs contained **7–10 total fights, including the three guardians**. That leaves only **4–7 ordinary fights across the entire voyage**. Two of those winning runs cleared one region with no ordinary fight in it.

For runs that reached the respective guardian, the stored ordinary-fight counts were:

| Region | Runs reaching its guardian | Median ordinary fights before it | Observed range |
| --- | ---: | ---: | ---: |
| Copper Reach | 123 | 2 | 0–6 |
| Glass Cathedral | 61 | 2 | 0–6 |
| Blackout Heart | 25 | 1 | 0–3 |

These are aggregates of the saved benchmark, not a newly executed campaign test or a measurement of human players. The pilot chooses visible blue options or the first legal option and uses a fixed routing policy. Winning runs are a small, selected sample. Nevertheless, they demonstrate that very sparse combat and even a guardian-only stage are currently possible.

**Proposed first pacing targets:**

| Region | Relays actually visited, including start and guardian | Ordinary combat encounters, including any elite | Guardian |
| --- | ---: | ---: | ---: |
| Copper Reach | 12–14 | 4–5 | Iron Regent |
| Glass Cathedral | 12–14 | 5–6 | Hollow Choir |
| Blackout Heart | 10–12 | 6–7 | Blackout Core |

That proposes roughly **18–21 fights in a completed voyage, including the three guardians**. These are tuning hypotheses for a representative route, not exact quotas for every seed or requirements that the player win every ordinary fight. Retreats still count as combat experiences. Specialists and deliberate evasive routing may reduce the number, while dangerous detours may increase it.

Copper gets room to learn and try an early upgrade. Glass gives the developing build several different tests. The Heart is somewhat shorter but more densely contested, so the final approach feels compressed and dangerous. Each new piece of equipment should have a reasonable chance to see use before the next guardian or ending.

Make a substantial share of ordinary encounters direct robotic interceptions as described in section 11.6. Retain fights that emerge from decisions, optional dangerous salvage, and successful evasion. Important passages can contain committed hostiles, but do not make every route identical or secretly spawn an enemy solely because a fight quota has not been met. Use coherent patrol territory and route composition to keep danger present.

**Give longer regions a midpoint.** A transfer yard, change in local infrastructure, or patrol boundary can divide a region into two recognizable stretches. This can provide a meaningful refit opportunity or stronger confrontation without requiring a fourth biome, an extra guardian, or a mandatory full-screen chapter break. First test the longer route as one region; split it into separate charts only if navigation or pacing benefits.

**Length and attrition must be tuned together.** The present low automated completion rate does not mean the ordinary-fight density is sufficient, and the low fight count does not mean the game is easy. A voyage can have long quiet stretches and then a very severe guardian spike. Adding several full-strength fights before an unchanged boss could make that worse.

Review routine enemy damage, encounter duration, ammunition, repair access, crew recovery, income, upgrade prices, and the Seal's travel allowance as one progression. Extra visited relays currently grant additional maintenance stores, so simply adding stops can also overfund upgrades. Preserve real costs and the danger of bad decisions while giving players enough resources and varied combat opportunities to learn their build. Do not inflate enemy hull just to extend playtime.

Test the increased combat share on the existing route length first. Then extend the traveled route if players still reach guardians before their build has developed or before upgrades have had useful play. Measure full session duration with tactical pauses and reading; fight counts alone do not establish a satisfying run length. Additional major stages should come later only if they have a distinct purpose that the three regions cannot provide.

Sources: [map generation](../src/campaign/map.ts), [event definitions](../src/content/events/index.ts), [benchmark policy](../tools/balance/campaign.ts), and [saved campaign results](../tools/shots/qa/campaign-balance.json).

## 7. Should every encounter have a story?

**Every encounter should have context and a consequence. Every encounter does not need a separate authored story window.**

**Some encounters should simply be fights.** A crewless vessel detects the tender's unknown signal, closes the distance, and attacks. Its silhouette, scan, radio identification, and tactics provide enough context. The player is not owed a pre-combat decision, negotiation, unique quest, or peaceful resolution. The tactical struggle itself can become the story.

“A cutter is trying to remove this live carrier” is enough context for a routine encounter if the cutter actually behaves that way. A choice about the Kittiwake deserves more attention because the player's interpretation matters. An intact relay with a lamp someone recently polished may work best without a choice at all.

### 7.1 The present content is already extensive

The current decks contain **336 event definitions and 1,126 authored outcomes**. Those definitions include scripted follow-ups as well as randomly drawn arrivals. **217 outcomes initiate combat.** These are content counts, not the number of encounters in one voyage or the number of unique tactical scenarios.

| Pool | Definitions | Pacing implication |
| --- | ---: | --- |
| General event | 108 | Largest source of variety; needs stronger distinction between moments and dilemmas. |
| Scripted follow-up | 65 | Existing story continuity; avoid excessive fragmentation. |
| Combat | 45 | The prose distinguishes more situations than the battle setup currently supports. |
| Distress | 36 | Strong source of voluntary responsibility; should not all resolve as payment or damage rolls. |
| Empty | 21 | An opportunity for quiet environmental storytelling. |
| Hazard | 18 | Good candidates for playable operations rather than another ordinary duel. |
| Bench | 17 | Preserve refuge, care, and practical preparation. |
| Sealed | 13 | Needs clear quarantine consequences and understandable route rules. |
| Market | 10 | Enough prose variety; improve recurring people and material service. |
| Exit | 3 | Major pacing and preparation gates. |

Ordinary event introductions commonly occupy roughly seventy to eighty words; the empty pool's median is roughly fifty-four. Add choices, outcomes, and combat text, and a supposedly minor stop can become a substantial reading interruption. The remedy is editing and presentation tiers, not simply doubling the event count.

### 7.2 Four narrative tiers — proposal

| Tier | Purpose | Presentation | What earns its place |
| --- | --- | --- | --- |
| Glimpse | Establish a living world or a past event. | World animation, brief radio line, optional inspect text. | A specific observation; no fake strategic choice. |
| Operational problem | Ask the player to use knowledge or equipment, including surviving an interception. | Brief setup or direct combat; the relevant action and risk can be communicated during play. | A mechanical consequence that follows the situation. |
| Dilemma or commitment | Make the player choose what the crew stands for or carries forward. | Focused event with room for character and aftermath. | A real tradeoff, expression, or later callback. |
| Landmark | Change the voyage's understanding or direction. | Deliberate staging and a memorable audiovisual action. | Irreplaceable dramatic value. |

Initial editing targets could be one or two sentences for a glimpse, roughly twenty to fifty words before a routine operational choice, and more room for a genuine dilemma. These are prototype targets, not mandatory word limits. A beautifully written short story belongs where the player has attention for it.

These are narrative presentation tiers, not a requirement for four kinds of dialogue. A direct fight can have no prose setup at all. Reserve extended writing for a situation that benefits from it; repeated hunters can be recognized by their behavior and a brief signal.

Do not make all quiet encounters secretly dangerous. If the game never lets a moment be safe, players learn to read every person as a loot trap.

### 7.3 Choices need different kinds of honesty

An inspection found seventeen multi-choice events whose serialized non-prose outcomes are identical. That does **not** automatically make them bad. Choosing what to say at a memorial can be valuable expression without a stat reward.

The distinction should be legible:

- **Strategic choices** change costs, risk, state, timing, equipment, or access.
- **Expressive choices** let the crew respond in character. A changed line, remembered response, or animation can be sufficient.
- **Inspection choices** reveal optional information. They should not pretend to be mutually exclusive major decisions unless they consume something meaningful.

Avoid presenting three ways to obtain the same reward as if the player is solving a tactical problem. Conversely, avoid forcing every humane response to produce a currency bonus. Some moments should matter because the player decided they mattered.

### 7.4 Blue options need a clearer promise — P1

There are **198 blue choices; 53 contain multiple random outcomes**. Blue currently means a capability-enabled option, not guaranteed safety. That is a valid rule, but it needs to be explicit.

For example, the Packet Leech option to flood its intake with noise has equal-weight outcomes: slipping past with salvage, or starting the fight anyway. A player can reasonably mistake its blue color for a reliably superior technical solution.

Recommended presentation:

- Show the capability that unlocks the action.
- State whether it is certain, a calculated risk, or poorly understood.
- Communicate known risks in natural language: “May draw it toward the transmitter.” When the crew lacks information, allow that uncertainty to remain; the interface need not reveal every hidden cause or possible consequence.
- Let relevant observation improve the decision when that makes sense.
- Reserve some reliable options for expertise. If preparation never produces confidence, specialization feels weak.

Exact percentages are useful for some mechanical actions but need not appear in every social encounter. Consistent risk language is more important than pretending all uncertainty can be measured.

Expertise can improve the odds, reduce the severity of failure, or enable a different approach without guaranteeing success. Some specific specialist actions can still be reliable. A blue option promises access to that action, not the best overall result, an automatic reward, or protection against every unknown. Preserve explicit guarantees when the game actually makes them; distinguish a character's confident advice from a verified system fact.

The authored decks currently contain no explicit `crewLoss` outcomes. Crew damage can still kill an already injured person. The fairness concern is communication and attribution, not an unsupported claim that the game constantly rolls arbitrary instant deaths.

### 7.5 Stories need reliable opportunities to finish

Existing multi-stage chains are a strength. However, availability conditions and weighted random selection are not the same as a player being able to pursue a commitment.

For a carried letter, log, box, or promise:

1. Record what was accepted and why it matters.
2. Give a plausible location or regional lead, without revealing every outcome.
3. Distinguish “not yet found,” “missed the route,” “completed,” and “deliberately abandoned.”
4. Give a reserved or strongly supported opportunity for important follow-ups once the player commits.
5. Allow some stories to remain unfinished, with an honest acknowledgement rather than a silent flag.

A dedicated Runbook page for **promises and carried messages** would help. It should be a small in-world record, not a screen of generic quest checkboxes. It should not consume scarce weapon cargo space unless carrying that particular object is intentionally a meaningful freight decision.

An opportunity to pursue a promise does not guarantee a happy ending. A rescue can arrive too late or a delivery can reach someone unable to help. Show that outcome and its cause; an unresolved scheduling flag is not a substitute for an authored failure.

Several flags are written without a later narrative consumer, including the Kittiwake's rested resolution, Ennis's list, and the cup at Bench Four. Some are valid records, not defects. Review which deserve a later line or visible trace. Both leaving the Kittiwake lit and ending its round properly deserve recognition; do not quietly imply that only one compassionate interpretation counts.

### 7.6 Use consequences outside the event window

Good persistent traces can be small:

- A repaired lamp remains lit when the chart or relay is revisited.
- A rescued person's name is attached to a berth or later transmission.
- A kept promise changes who vouches for a re-stamp.
- A tool borrowed at a bench appears in the car until returned or passed on.
- A released machine's radio channel becomes quiet.
- A crew member changes one habitual line after a loss.

The visible world should remember at least a few of the decisions that the flags already remember.

### 7.7 Bad events, failed good intentions, and chance — requested direction, P1

**Some encounters should leave the crew worse off even after a reasonable decision.** Their purpose can be to force recovery, consume a reserve, close an opportunity, or create a remembered loss. They do not need to contain a hidden profitable answer. An automatic mishap can resolve on arrival with a brief visible aftermath; it does not need a preliminary menu pretending the player could have prevented it. Where there is a choice, deciding which loss to accept is meaningful play.

This already has a foundation. The [event resolver](../src/campaign/events.ts) selects weighted outcomes and applies resource losses, injuries, combat, flags, and Seal changes. Existing [Copper encounters](../src/content/events/stage1-relays.ts) include a technical bypass that attracts a Packet Leech and a curtain fire whose extinguishing attempt can damage equipment or injure someone. The latter also has a harmless ordinary response, illustrating the difference between **one risky option** and **an encounter with unavoidable costs**. Randomness and negative outcomes are present; their distribution, practical consequences, and presentation need deliberate review.

#### Different ways an encounter can go badly

| Encounter role | Proposed FAULTLINE treatment | What it should mean in play |
| --- | --- | --- |
| Unavoidable setback | A concealed fastening fails as the tender settles at a relay; falling equipment damages the car before anyone can act. | Real hull loss, a short physical impact, and an updated condition display. No salvage gift is required afterward. |
| Choice between losses | A jammed service grip catches an external repair crate. Cut the crate free, or attempt a hazardous recovery while the Seal gains ground. | Every available route has a cost. A relevant tool can reduce a cost without making this encounter profitable. The contents and resources at stake must match what the tender carries. |
| Good intention, bad outcome | A distress message is authentic, but the platform gives way during the rescue. | A compassionate attempt can consume supplies, injure the participating crew member, or fail to save the caller. Failure need not reveal that the person was secretly a villain. |
| Sensible technique, uncertain result | A recorded greeting releases one old interlock but is repeated by a damaged relay into a watched span. | A plausible action can attract an autonomous hunter. The later interception identifies that transmission as the cause, without claiming the crew should have known everything in advance. |
| Voluntary gamble | A sealed parts locker may contain useful stock, spoiled material, or a live fault. | Weighted success, partial success, and failure where appropriate. A specialist may change the odds or limit the loss; inspection can consume time or supplies. Some ordinary salvage should remain straightforward. |

These are design treatments, not newly implemented events or fixed balance values. They fit worn infrastructure, incomplete records, interrupted duties, and automatic trust enforcement. They do not require an omniscient adversary arranging a punishment whenever the player tries to help.

Let generosity sometimes cost the crew without later repayment. Let caution sometimes miss an opportunity and self-interest sometimes work. Other rescues should succeed, honest people should remain honest, and safe refuges should provide relief. Neither “always help” nor “never help” should become a universal reward-selection rule.

#### Chance should change outcomes without making decisions irrelevant

Use authored outcome weights where the situation can plausibly resolve in several ways. Choosing the better odds can still produce the worse result on this visit. A good result from a reckless choice does not retrospectively make it wise, and a failed rescue does not establish that attempting it was foolish. The aftermath should describe what happened rather than grade the player's morality or intelligence.

Not every event needs a roll. Fixed bad outcomes, uncertain outcomes, reliable actions, and uncomplicated benefits should coexist. Do not replace the whole deck with identical success/failure coin flips. Preparation should affect something concrete when relevant: available actions, exposure, failure severity, or the chance of success. A required item should not imply an advantage the mechanics never provide.

Unknown outcomes can genuinely surprise the player. A concealed defect need not be advertised as an exact percentage, and a speaker can be mistaken or dishonest. Preserve the game's reliable rules: a confirmed cost, an explicit guarantee, or a known equipment effect should not secretly reverse just to manufacture a twist. Afterward, give enough causal detail to understand the loss without inventing a warning that was never present.

Crew death and the end of a run remain possible consequences. Reserve the most severe standalone rolls for situations whose stakes justify them; a routine benign-looking inspection should not commonly erase a healthy expedition in one result. Ordinary bad luck can also become fatal when previous damage and depleted reserves leave no margin. Do not guarantee recovery from every sequence or quietly cap all event damage at one remaining hull point.

#### The loss must survive the result window

Show the actual change: who was hurt or lost, which supplies were consumed, how far the Seal advanced, what route was closed, or which repair must now be funded. Apply it to the named participant and actual vessel. A shieldless tender cannot suffer a failure of an array it never fitted; a lost drone or crate must have existed. Resolve an exposed crew member's existing injuries honestly.

The transient system-damage issue in section 9.7 matters especially here. A threatening paragraph followed by free clearance before the damage can affect play does not deliver the requested consequence. Prefer existing durable costs first. If a persistent fault or delayed pursuit is proposed, define its duration, resolution, and later appearance before claiming the event supports it. Flags alone are not a completed consequence.

Include normal relay payouts in that accounting. A nominal loss immediately outweighed by the stop's automatic stores may still feel like a reward encounter. Some bad stops should be a net loss after all receipts and recovery costs, with the explanation for any inaccessible stores grounded in the situation. Do not quietly confiscate unrelated income to force that result.

#### Balance the distribution across the whole voyage

Check the combined cost of bad events, more fights, and higher upgrade prices for all three starting tenders. Compare average results and runs with repeated failures; an average budget hides the routes where injuries, lost spares, and repair bills compound. Also compare cautious, generous, and risk-seeking policies so the obvious strategy does not become declining every interaction.

Reserves and alternate plans should improve the chance of surviving bad luck. The expedition does not owe the player a payout immediately after a loss, and several bad events can occur consecutively. Avoid rigid per-stage damage quotas, wealth-triggered punishments, or a guaranteed compensation cycle. The balance target is consequential uncertainty with useful preparation and genuine relief, while allowing some well-played voyages to fail.

## 8. The missing bridge between a situation and its gameplay — P0/P1

### 8.1 What is currently lost at the combat boundary

The campaign sends combat an enemy, stage, seed, relay hazard, surrender settings, boss status, introductory text, and a few reward/progression parameters. Event outcomes can also damage the player before the fight or attach a custom aftermath.

That supports a lot of content, but it does not represent many of the situations described in the writing. There is no general scenario state for a wounded enemy, an escort to protect, cargo whose survival matters, an exposed clamp, a cable about to part, or a repair objective that ends the confrontation.

Consequently, two well-written encounters can become mechanically the same fight. A claim that the crew ambushed a distracted machine should produce a readable advantage. If a passage promises to save a structure, the battle needs to make that structure's survival meaningful.

Before writing more combat introductions, classify the existing ones:

| Classification | Action |
| --- | --- |
| Context only | Keep the fight standard; the text should not promise different mechanics. |
| Different starting state | Carry damage, position, charge, boarding, or an exposed subsystem into the battle. |
| Different objective | Add an explicit success condition, failure condition, and visible progress. |
| Different consequence | Preserve the result in rewards, world state, route access, or a later encounter. |
| Too expensive for its value | Rewrite the premise to match the supported experience. |

### 8.2 Start with a small objective vocabulary

Do not build a unique minigame for each of 336 events. A few reusable objectives can change the experience substantially:

| Objective | Meaningful decisions | Existing systems it can reuse |
| --- | --- | --- |
| End the task | Disable the part performing the dangerous duty, then interrupt or acknowledge its procedure. | System targeting, ion, repair automata, crew stations, handshake. |
| Hold a connection | Keep a route or transmitter operational through a forecasted sequence. | Power allocation, repairs, boarding defense, timed attacks. |
| Recover something intact | Balance suppression, time, and collateral damage. | Target selection, drones, volleys, hull/system distinction. |
| Finish work under pressure | Assign crew to work while others keep the tender safe. | Crew travel, lifts, repair tasks, power competition. |
| Get away with someone | Survive and complete a physical transfer or departure. | Helm, drive, boarding/transit presentation, escape charge. |

These are proposals. Prototype **one** alongside a normal fight first. A new objective must remain understandable under pause, support several builds, and produce a visible result. If it requires another full interface, several new currencies, or constant micromanagement, reduce its scope.

### 8.3 A minimal “diagnose, act, acknowledge” loop

This is a promising identity prototype for selected encounters, alongside direct combat. It is not a required ritual for every machine:

1. **Observe a duty.** The machine's movement, radio line, and target show what it is doing.
2. **Find the operational problem.** A scan, crew background, repeated behavior, or exposed component gives useful information.
3. **Choose an intervention.** Suppress the machine, interrupt its procedure, repair the condition holding it in a loop, or escape.
4. **Survive the intervention.** The tactical systems still matter.
5. **Acknowledge the result.** The machine ends its duty; something it held is released; the world records the change.

Avoid making this a universal “scan, then press the blue win button.” Observation should open choices, shorten exposure, improve preservation, or reveal counterplay. It need not eliminate all danger.

Also avoid adding a mandatory repair phase after every hull victory. That would become a chore. For routine enemies the final acknowledgement can be automatic once the player has done the meaningful work.

An interceptor whose job is to neutralize an untrusted signal may require only a conventional tactical fight or a hard-earned escape. Do not retrofit a special maintenance puzzle into it merely to satisfy this loop.

## 9. Travel, map, pressure, and the economy

### 9.1 Combat retreat and map travel disagree — confirmed mismatch, P0

The combat simulator's `hopReady()` requires charged departure and an unfinished battle. `hop()` ends the battle as fled. It does not check or spend TTL. The campaign then leaves the player at the same relay, marks the unresolved fight for later, and returns to the hub. Selecting a destination afterward spends TTL and advances the Seal.

A read-only probe with TTL set to zero and departure charged returned a successful flee, still with zero TTL. This conflicts with the lore and the UI's promise of hopping to another relay. It also makes the temporary safe hub state after retreat difficult to explain.

**Recommended rule:** select or confirm a reachable destination as part of a combat departure, then resolve the switch, TTL cost, Seal step, and arrival as one action. Show the destination and cost before commitment. Preserve whatever emergency behavior is deliberately chosen for TTL zero, but name and animate it accurately.

An alternative is to keep a same-span disengagement. In that case call it disengaging, establish where the tender waits, and specify what remains dangerous. It should not masquerade as a completed relay switch. Retreating from a guardian must not count as clearing it.

### 9.2 The manned greeting needs one authoritative rule — P0

The lore states that the Runbook never trusted a greeting to a machine alone. Combat supports a slower unmanned handshake with upgraded Helm.

Choose deliberately between:

- **Attended greeting:** automation can prepare the switch, but a crew member must make the final acknowledgement.
- **Limited approved automation:** revise the lore to explain precisely what automation can do and why the old rule has an exception.

The first direction better supports crew responsibility. Whichever rule wins, explain why unattended Echo Tenders can continue an old single-span round without granting them unrestricted new travel. The lore already distinguishes moving along one carrier from switching onto another; use that distinction.

### 9.3 The Seal is an action clock, not a reading timer — preserve this

The current campaign advances the Seal through hops, waiting, and certain outcomes. It does not continuously advance while the player reads or plans. This is good for a thoughtful tactical game.

The prose about lingering can imply real-time pressure. Say clearly that inspection, dialogue reading, and tactical pause are safe. Show the next action's Seal movement on the chart and at costly choices. Avoid animating the Seal as if it is secretly consuming real seconds in a menu.

The current front also stops short of the guardian. If that remains the rule, communicate the terminal boundary through the fiction: perhaps quarantine has already established a perimeter there. Do not sell an endlessly advancing wave if the final relay is mechanically exempt.

### 9.4 Give the three regions different route problems — P1/P2

The map already provides connected graphs, known landmarks, hazards, markets, benches, exit information, and pressure. The missing opportunity is regional geography with recognizable strategic character.

| Region | Proposed topology emphasis | Player question |
| --- | --- | --- |
| Copper Reach | Branching yards, service spurs, salvage loops, visible transfer points. | How much useful preparation can we afford before leaving familiar support? |
| Glass Cathedral | Alternative spans, partial information, resonance hazards, observation points. | Which reading do we trust, and what can our crew discover before committing? |
| Blackout Heart | Converging approaches, quarantine choke points, fewer but meaningful refuges. | What do we preserve, spend, or leave behind to reach the shell ready? |

These should be families of generated layouts, not three fixed maps. Keep adequate route legality and access to essential preparation. Randomness should vary the problem, not occasionally remove the tools required to solve it.

More informative local geography would also help the setting. Distinguish a service spur, crossing, high exposed span, and enclosed gallery visually. A string of anonymous question marks gives little sense of traveling through infrastructure.

### 9.5 TTL and Seal need distinct strategic jobs

Two route constraints can be useful if they ask different questions:

- **TTL:** Can this connection make the planned switches, and who will vouch for more?
- **Seal:** How much opportunity can the crew take before access behind them closes?

If both merely punish every detour by the same amount, they risk becoming duplicate fuel meters. Re-stamping can connect TTL to people and preparation; quarantine can connect route pressure to the geography. Keep their costs visible separately.

The automatic stage transition top-up currently supplies at least six TTL, or adds three if that is higher. Its economic purpose is understandable. Give it a visible cause, such as the released guardian's relay acknowledging the connection. A stamp should appear to come from somewhere.

### 9.6 Maintenance stores are necessary, but their meaning needs repair — P0/P1

Resolved, eligible relays currently provide one-time stores worth 24, 36, or 48 salvage by stage, separately from event and combat rewards. This is an important support for the campaign economy. Existing balance work found that earlier routes could not finance the required progression.

Retain enough predictable income for a viable voyage, but do not treat the current 24/36/48 amounts as protected values. Their meaning, incentives, and relationship to prices need review together. With more visited relays and more fights, the same payments could fund too much progression. A stable foundation can coexist with much tighter discretionary spending.

An encounter counts as resolved even when the crew chooses to ignore or leave the situation. The stores then pay, although the surrounding language associates them with clearing or restoring a relay. That can make the dominant behavior “decline the risk and collect the maintenance allowance.” Whether it actually dominates requires policy comparisons, not assumption.

Two coherent directions:

1. **Arrival entitlement:** completing the relay handshake establishes the crew's right to a working allocation. Present it as that, with a visible connection receipt.
2. **Service completion:** a small, varied, meaningful operation establishes access. Avoid adding a repetitive repair click at every stop, and retain enough guaranteed income through other means.

The first is simpler and preserves the current economic safety net. Voluntary fights and service jobs can then offer additional opportunities whose rewards justify their expected cost.

### 9.7 Some written penalties evaporate before they can matter — P1

System damage is cleared between relays. Several events apply system damage without starting combat or another event afterward. For example, taking the Rust Prophet's warning damages a random system, then a normal departure repairs it before the next fight. The content scan found nine system-damage outcomes without an immediate combat or follow-up.

This can make a threatening consequence effectively harmless in normal onward travel. It is not an argument for permanent component wear everywhere. Choose among:

- Treat it honestly as a transient scare or minor repair, without presenting it as a major strategic penalty.
- Make it affect an immediate situation where the player can respond.
- Exchange it for a clear resource, route-time, or hull consequence appropriate to the scene.
- Introduce a limited persistent fault only if the game also offers readable diagnosis and fair service access.

Likewise, combat results automatically repair system damage after non-defeat, including retreat. Hull and crew injuries persist. This is a reasonable abstraction if the game explains that the crew patches machinery during recovery. It becomes confusing when that abstraction creates a safe repair benefit in the middle of an allegedly urgent escape.

### 9.8 Balance should measure viable choices, not just completed campaigns

The existing [campaign balance report](balance-campaign.md) records six victories in 128 deterministic automated voyages, with eighty reaching stage two and thirty-two reaching stage three. It explicitly warns that the pilot is limited and these are not human win-rate targets. Respect that boundary.

Use future analysis to compare strategies the design actually invites:

- Take every affordable fight versus avoid optional fights.
- Invest in tools/information versus immediate weapon throughput.
- Keep the tender compact versus add rear/keel capacity.
- Spend on preservation and service versus take destructive shortcuts.
- Pursue a promise versus take the direct economic route.

Investigate clear dominance, inaccessible preparation, and repeated dead ends. Do not insist that every build can beat every situation or that all choices should have equal expected salvage. Some choices purchase information, safety, or a different story.

### 9.9 Upgrades must compete with purchases — requested direction, P0/P1

**A normal successful voyage should end with a capable but incomplete tender.** The player should have invested deeply in a few strengths, kept other systems adequate, and knowingly left some capabilities uninstalled or below their maximum. Exceptional runs can be richer; filling every upgrade track should not be the routine expected finish.

This is a stronger requirement than “there are more upgrades than the player can buy.” Decisions must still matter among the options a particular build actually wants. A laser build that can afford every useful weapon, reactor, and defense upgrade has little meaningful scarcity even if it leaves an irrelevant Drone Bay unpurchased.

#### Current price evidence and its limits

| Current cost or income | Amount | Implication to examine |
| --- | ---: | --- |
| Early reactor bar | 15 salvage | One relay's stores can fund a bar with money left over. |
| Early upgrade to several systems | 20–35 salvage | A purchase can feel routine beside 24–48 salvage from a relay, before event/fight rewards. |
| Second ordinary shield layer, capacity only | 50 salvage across two levels | Compare its value against a new weapon; also include the power needed to use it. |
| Third ordinary shield layer, capacity only | A further 100 salvage | A meaningful defensive step should compete with other major plans. |
| Full upgrade of all systems installed on the current Lamplighter, plus reactor | 1,795 salvage from its starting levels | This is a theoretical total, not a measure of the cost of only the strongest or most relevant choices. |
| Above, plus buying and maximizing Drone Bay and Veil | 2,345 salvage at base installation prices | Excludes equipment, supplies, repairs, hosting/refits, and any store markup. |

The six saved winning benchmark runs recorded 808–1,165 salvage earned. Those figures include the benchmark's recorded sales as well as other income and are not a complete human-economy study. They do **not** establish that fully maximizing every system is already routine. The feedback is still actionable: early purchases may be too cheap, the important upgrade path may dominate alternatives, and the proposed longer campaign creates additional income unless the economy changes with it.

Sources: [system and reactor prices](../src/data/systems.ts), [campaign upgrade handling](../src/campaign/upgrades.ts), [store prices](../src/campaign/store.ts), and [saved benchmark results](../tools/shots/qa/campaign-balance.json). The costs above are inspected values; no price changes have been made by this audit.

#### Budget the whole voyage before choosing new prices

Distinguish **gross receipts** from **money genuinely available for permanent improvements**. Repairs, TTL, payloads, drone spares, required installations, mistakes, and unavoidable or unlucky event losses all consume income. A reserve can be a deliberate purchase decision even after competent play. Selling an item recovers some value; repeated buying and selling must not be counted as new economic production when evaluating the budget. Include the distribution of event losses from section 7.7, rather than budgeting only an average damage bill.

For each of the three starts, estimate a representative route's receipts and operating costs under the proposed fight count. Then decide how many major commitments its remaining budget should support. The player should face choices such as:

- Improve weapon capacity and reactor support, or buy a new weapon that changes targeting options.
- Fit a missing Shield Array, or strengthen drones and the drive while retaining the risks of an unshielded vessel.
- Purchase the next shield layer, or take a valuable car or specialist system before that store is left behind.
- Pay for complete repairs, or leave with a known hull margin and keep money for equipment.
- Maximize a primary system, or fund several smaller supporting improvements.

There must be more than one viable answer. If a mandatory guardian requires a particular upgrade regardless of build, its price is an entry fee rather than an interesting choice. Build requirements should allow several equipment and tactical solutions.

#### Make the price curve express commitment

Keep basic functionality attainable. Increase the cost of deep specialization more sharply than the first useful improvements. Review the final system levels and late reactor bars together: buying more capacity should not be trivial, and powering every major system simultaneously should not become automatic.

| Progression tier | Intended role |
| --- | --- |
| Basic readiness | Affordable enough to establish a functional build and recover from a modest setback. |
| Meaningful improvement | Competes directly with a useful item, operating reserve, or a different system upgrade. |
| Advanced specialization | Requires saving and leaves something else underdeveloped. |
| Maximum capability | A deliberate commitment whose opportunity cost remains visible near the ending. |

Do not merely multiply every price by the same number. That can preserve a dominant upgrade order while making everything slower and early mistakes unrecoverable. Similarly, a cheap universal defense upgrade may be the real problem even when expensive top levels are rarely reached.

Show the **complete useful cost** of a plan: weapon purchase, bay capacity, reactor support, and any required fitting. Preserve the distinction between installed capacity and actual power. A tender may own more capacity than it can run concurrently; rerouting power should remain a tactical decision late in the voyage.

#### Keep installations and equipment purchases meaningful

A missing system should require an intentional fitting purchase, appropriate space, and power support. It should not appear for free through upgrade levels that were originally placeholders for starter equipment. This matters especially for an unshielded tender purchasing its first Shield Array.

An interesting store visit should contain things the player wants but cannot all afford. Some useful equipment will be left on the shelf. The player should understand the sacrifice and be able to plan for it through visible costs and reasonable opportunities, rather than needing a rare random item simply to survive.

Keep a new weapon or drone attractive beside system upgrades. If every item is a poor use of salvage until all key systems are maximized, the economy has produced an upgrade checklist. If the newest weapon always dominates repairs and defense, it has produced a different checklist. Compare plausible full builds and operating costs, including the ammunition-free laser start's savings and the drone start's repeated spare expenditure.

#### A satisfying endgame build

Use this as a qualitative target, not a hard limit on the number of maxed systems:

> One or two major capabilities are strongly developed. Supporting systems are sufficient for the crew's strategy. Some tempting capabilities remain absent or modest. The player can explain which purchases made the voyage possible and which improvements they chose to go without.

Cheap utility systems need not obey the same pattern as the major weapon, drone, engine, and shield tracks. Reaching a small subsystem's cap is not equivalent to obtaining maximum offense and defense everywhere. Evaluate remaining **relevant** tradeoffs and the resulting play, not just the number of full bars.

Do not force this outcome with invisible loot penalties when the player becomes wealthy, mandatory late confiscation, or arbitrary upgrade locks. Scarcity should emerge from understandable income, prices, route pressure, and operating costs. Skillful low-damage play and smart purchases should leave the player better off.

#### Validation for meaningful spending

Record purchases and rejected opportunities by stage, plus installed levels, reactor usage, repairs, supplies, and end-of-run cash. Compare conservative, aggressive, equipment-focused, and upgrade-focused policies for each starting tender. Include the longer routes; do not reuse the short campaign's income assumptions.

Ask human players what they wanted but could not afford, why they chose their last major purchase, and what weakness they took into the guardian. Repeated “I bought everything useful” answers indicate excess disposable income or underpriced choices. Repeated “I had to buy the same thing or the run was impossible” answers indicate a mandatory cost rather than a strategic tradeoff.

The success criterion is strong, distinct builds with meaningful omissions and several viable buying priorities. Ordinary completion should not routinely coincide with maximizing every important system.

## 10. Crew and the interior life of the tender

### 10.1 What the crew already has

Crew members have names, backgrounds/kinds, health, skill experience, stations, locations, visual variants, and some history such as joining location and repairs. Movement, lifts, fighting, repair, and station work already produce tactical stories.

The missing layer is personal continuity. There is little persistent representation of why a person volunteered, what happened specifically to them, what promise they care about, or how an experience changed their next reaction.

### 10.2 Add a small amount of character, not a life simulator — P1/P2

For each starting volunteer, aim for:

- One concrete reason to go.
- One recognizable habit or point of view.
- One optional event or reaction connected to their background.
- One remembered incident from the current voyage.
- One possible ending or loss acknowledgement.

These can be short and selected from modest pools. They should not require constant conversation, personality stat bars, or mandatory loyalty missions. The main game remains commanding the tender.

Useful triggers include surviving a breach, making a difficult repair, receiving a reply, recruiting someone from their region, and losing a colleague. Avoid unsolicited commentary after every shot. The silence between rare responses gives them weight.

### 10.3 Event casting needs to respect bodies and knowledge — P1

The general `{crew}` substitution can select any crew member. Human bodily actions and particular expertise do not always fit a rigger or every background. Role-specific substitutions also need neutral or appropriate pronouns; some prose assigns a fixed gender to a procedurally named recruit.

Author events around eligible participants, with a fallback when nobody fits. If the story follows one injured person, the damage and later response should refer to that same person. If a rigger participates in a tea ritual, write the automaton's version deliberately rather than accidentally giving it human needs.

The human categories should read as training, upbringing, equipment, and practice. Bellmaker tuning should feel like skilled attention to inefficient machinery, not unexplained energy creation. Wardens' resilience should have a material/cultural explanation rather than implying a separate biological species.

### 10.4 Dockside recovery is a real flow gap — confirmed, P0/P1

The dockside controller explicitly updates movement without healing. A probe moved an injured crew member into the infirmary, supplied medical power, and advanced sixty seconds of dockside movement; health remained unchanged. Combat can heal crew, while safe movement cannot. The bunk-car bench and similar descriptions deserve the same consistency review.

This creates a perverse incentive to keep a disabled enemy alive while the crew recovers. It also makes the safe tender feel less functional than the tender under fire.

Recommended direction:

- Allow an explicit safe recovery/service action where fiction and resources permit it.
- Resolve routine movement and recovery efficiently; do not require watching several minutes of idle healing.
- State any actual tradeoff, such as supplies or a deliberate Seal step, before the action.
- Distinguish biological medical care and automaton maintenance without making either crew type tedious to use.
- Preserve persistent injuries only where they produce meaningful preparation decisions.

A universal free full heal might flatten attrition; a paid or limited service action may fit better. That choice needs an economy test. The immediate requirement is that an infirmary behave intelligibly and that the best healing method not be prolonging a won battle.

### 10.5 Crew loss should leave a trace

Keep permanent loss consequential, but do not compensate with a long mandatory eulogy every time. An empty station, a name in the Runbook, a held item, a quiet reaction, and a later acknowledgment can be enough.

Do not reduce the final voyage summary to damage dealt and machines stopped. Include people brought aboard, promises kept, important messages carried, and who did not come back. These are observations, not a moral score.

### 10.6 Make the physical layout earn its complexity

Lifts and attached cars already distinguish crew movement from a flat abstract grid. Build on that with useful previews:

- Show a queued route and its destination before or immediately after an order.
- Make waiting for a lift readable.
- Indicate when a damaged area or crowded passage delays emergency response.
- Explain a refit's travel and staffing consequences before purchase.
- Preserve quick station recall and easy correction while paused.

Avoid forcing the player to manually perform domestic chores. A kettle can steam because someone uses the room; it does not need a recurring “boil water” command.

## 11. Combat identity, fairness, and information

### 11.1 The tactical foundation is good; the objectives are narrow

Weapon timing, power tradeoffs, crew repairs, fires, doors, and boarding already interact. Do not confuse the need for different objectives with a need to replace this engine.

The current enemy variety is substantially expressed through loadouts, targeting preferences, durability, escorts, mobility, and special boss rules. Broaden what those systems are for. A duty-ending encounter can use the same weapon and repair systems while producing a different decision than maximizing hull damage.

### 11.2 Enemy intent should describe the next problem

Prioritize information in this order:

1. What will happen next?
2. Where will it happen?
3. How soon, in simulation time?
4. What can interrupt, resist, or avoid it?
5. What will change if it succeeds?

Not every ordinary shot needs a large forecast panel. High-impact boarding, carrier cutting, self-destruction, phase changes, and unusual guardian rules do. Advanced sensors can improve detail, but a basic player must still understand a mandatory boss rule.

Critical introductory text currently expires with scene time even while the fight is paused and can be constrained to one line. Keep important hails and tactical instructions available until understood, with a readable history. Pausing should give the player time to read.

### 11.3 Physical boarding is both a lore fix and a counterplay opportunity — P1

Boarders currently appear directly in selected internal rooms with materialization-style effects and sound. The lore describes travel along carriers, grapples, or rotors.

Show a physical sequence:

> launch or approach → visible route/attachment → indicated entry point → breach or hatch entry → internal threat.

This creates choices before the boarding party is already damaging a room: intercept a rotor, damage the launch machinery, close an access path, move defenders, or accept the boarding while pursuing another objective. If a particular boarder can enter directly through an exterior room, show how it reaches that surface.

Do not make every boarding sequence slow. A short visible transit and a clear target marker can communicate enough. Its warning must remain available under reduced motion and with sound muted.

### 11.4 Human combat needs an honest outcome vocabulary

Scavengers are people from the same surviving world. Surrender and the Moss chain already support this. Preserve them.

Review generic results and statistics that treat every victory as a machine stopped. Also review reward incentives: the simulator contains a higher reward-tier rule for a human crew kill when the ordinary tier is medium. This is a generic rule; it does not establish how often that bonus is reachable in today's human encounters.

Decide what the game is encouraging. Killing everyone should not accidentally be the cleanest universal upgrade path while the prose insists that the crew treats others with care. It may still be profitable or desperate in a particular situation. Make that situation and its consequences honest, without adding a morality meter or ensuring that mercy always pays more.

### 11.5 Equipment capabilities need consistent meaning

Combat sensor strength can include manning and module bonuses. Campaign checks often inspect the base system level. Some event tool checks can find equipment in storage as well as installed equipment.

These may be intentional abstractions, but players need a coherent explanation:

- Does this option require an installed working system or merely a tool aboard?
- Does a listening keel help with this signal, or only with battle inspection?
- Does damage or lack of power matter for this action?
- Will the action consume a spare, payload, or stamp?

Use one player-facing concept of capability, with explicit exceptions when physical context matters. Avoid making expensive information upgrades appear useful in one screen and inexplicably irrelevant in another.

### 11.6 Direct fights and autonomous signal hunters — requested direction, P1

Some hostile vessels should actively search the Line for unknown or untrusted signals. The Lamplighter is alive, transmitting, and unable to provide credentials the old enforcement system accepts. Detection commits the hunter to interception. It may announce its classification, but it does not wait for an answer before acting.

This fits the existing unknown-sender and quarantine lore. The Cable Wraith already identifies a live route and moves to isolate it; the Quarantine Drone already closes a connection. The missing emphasis is a felt process of searching, acquiring, and pursuing the tender, with a direct path into combat. The presence of machine enemy definitions alone does not establish that full experience.

Use several encounter openings:

| Opening | What happens | Player agency |
| --- | --- | --- |
| Sudden interception | A hunter resolves out of clutter or closes from an adjacent carrier. Combat begins. | Immediate tactical orders; no pre-combat dialogue choice. |
| Patrol contact | A scan crosses the tender and locks onto its signal. The vessel turns its weapons. | A short readable acquisition sequence; any evasion opportunity belongs to a supported mechanic, not a universal leave button. |
| Pursuit contact | A previously observed hunter or patrol reaches the next relevant crossing. | Earlier route/preparation decisions shape the encounter; the hunter's arrival has a cause. |
| Blocked passage | An autonomous vessel holds a switch the crew needs. It engages on approach. | Defeat, disable, or survive long enough for a valid alternate departure. |

There can be surprise about **whether** a hostile vessel is present while its dangerous actions remain readable once it appears. Keep tactical pause. A direct fight should not deal unavoidable damage while an arrival animation or modal has taken control away from the player.

Not every hunter needs a named personality, tragic backstory, or unique salvage reward. Some are anonymous enforcement machinery carrying out an old standing order. Their repeated appearance can make the region feel patrolled and unsafe. Ordinary battles need good tactics and atmosphere more than a bespoke explanation every time.

### 11.7 A robotic vessel should feel built without a crew — P1

Distinguish three cases in art and gameplay:

| Vessel type | What occupies it | Tactical identity |
| --- | --- | --- |
| Crewed tender or skiff | People, stations, breathable rooms, living needs. | Crew movement, injury, air, and possible surrender; reactions can express fear without a new morale meter. |
| Machine with service automatons | Machinery plus small maintenance units. | Repairs and dispatch depend partly on those units; there is still no human crew to bargain with. |
| Fully autonomous robotic vessel | Sensors, controllers, actuators, power and weapons; no independently walking crew. | Damage control follows mechanical rules such as repair arms, redundant control, or limited self-repair. |

The last category should visibly exist. Show control cores, coolant channels, drive assemblies, sensor arrays, and weapon feeds in place of a copied galley, infirmary, and occupied bridge. The vessel itself is the robot. Keep the readable cutaway and subsystem targeting, but let its internal layout explain its functions.

Consequences should follow that construction:

- It does not lose the fight because nonexistent crew suffocate, and it does not make a human surrender offer.
- If it repairs itself, show what performs the repair and how that can be interrupted. Some simple models may have no repair capability at all.
- Disabling sensors, drive, weapons, or a controller can produce different tactical opportunities where that behavior is supported and explained.
- Crew-focused effects should clearly indicate when they have no relevant target; ordinary hull and system damage must still offer useful options.
- Machine construction does not justify stacking universal immunity to fire, ion, or other established tools. Define vulnerabilities by function and material, and preserve several viable builds.

Within the current carrier lore, larger robotic vessels should ride carriers or gantry rails; small drones can fly. They can feel like dangerous autonomous ships without becoming a new fleet of freely flying capital vessels. If that physical rule is ever changed, update the world model deliberately.

### 11.8 Build pressure through detection, pursuit, and costly survival — P1

The desired feeling is that the crew must keep going through infrastructure that actively rejects their presence. Support that on three scales:

| Scale | Source of pressure | What makes it tangible |
| --- | --- | --- |
| Voyage | The Seal closes routes and reduces room for detours. | Chart changes, closure sounds, lost service access, approaching patrol territory. |
| Local route | Autonomous vessels search crossings and react to live signals. | Distant scan sweeps, intercepted classifications, a patrol silhouette, an acquisition signal. |
| Combat | A hunter attacks systems that keep the tender alive or able to leave. | Visible attack preparation, damage control, limited power and supplies, a departure the crew must earn. |

**Proposed patrol behavior:** search → acquire → intercept → engage → lose contact or resume patrol. Keep this comprehensible and bounded. Begin with encounter scheduling and visible local state; a hidden global threat meter is not required.

Detection should have an understandable cause. Crossing a held relay, broadcasting through watched infrastructure, or performing a specifically marked operation could expose the crew. Ordinary reading, paused planning, and time spent inspecting a menu should not secretly increase detection. A warm route can attract the next patrol as a consequence of travel without becoming a real-time menu timer.

Retreat should preserve consequences. Hull damage, injuries, ammunition spent, the TTL cost, and the Seal's advance can make escape expensive even when it saves the crew. Selected pursuit encounters could carry an alert toward a later crossing, provided the player can see enough to reason about it. Do not make every escaped enemy reappear indefinitely or make every viable exit lead straight to another unavoidable interception.

Escalate through coordination and geography as well as numbers. Copper can establish local detection and isolated interceptors. Glass can obscure patrol positions and carry misleading echoes. The Heart can coordinate containment around the remaining passages. These are proposed regional treatments, not a claim that this patrol model already exists.

Use danger in sound and motion: a searching optic keeps sweeping until it finds the tender; the sweep stops; an acquisition tone changes; the machine pivots; weapon mechanisms engage. The transition from indifferent machinery to focused attack is a strong source of dread. The ensuing battle must make that threat real.

Quiet moments remain useful because the player can feel the contrast in their damaged tender and limited resources. The game should sometimes force a fight, sometimes force a costly retreat, and sometimes allow a genuinely quiet crossing. It should not settle into either constant negotiation or constant ambush.

## 12. The three guardians should prove three different things

### 12.1 Iron Regent: redundancy

**Exists:** a gate requiring hits from two different weapon/drone sources within a 2.2-second window, gate repair machinery, wardens, and an opening duration affected by surviving wardens and gate damage. This is more than a large health bar.

**Gap:** the UI speaks of routes, but the implemented test counts attack sources. Two emitters firing together are not automatically a convincing proof of a second way home. The encounter's thematic claim and mechanical explanation need to meet.

**Near-term refinement:** describe the actual rule clearly, animate two independent acknowledgements arriving at the gate, show the opening duration, and make warden repair visibly shorten it. Let the Regent's gate structure dominate its presentation rather than reading as another free-floating vessel.

**Deeper prototype:** a small redundant-connection objective in which maintaining or re-establishing a second working channel changes the battle. Reuse tender systems and targetable gate machinery; do not introduce an entire second network-building game. This requires testing and is not necessary for the first clarity pass.

**Desired release:** the interlock accepts redundancy, heavy gate leaves unlock, carrier traffic can pass, and the furnace tone settles. The player should remember opening a gate, not watching a gold enemy explode.

### 12.2 Hollow Choir: plurality

**Exists:** a glass defense broken by three hits within one second, an opening period, bell systems, escorts, and a distinct sound/visual identity. Multiple hits from one source can qualify, including beam interactions.

**Gap:** this is another synchronized damage burst. It asks a different arithmetic question from the Regent, but the player's central solution is similar. The lore's many voices become shot count.

**Near-term refinement:** clearly show which hits count, why the glass opens, when the bells will restore it, and how attacking the bells changes that timing. Do not imply that three crew voices are required if a single weapon can satisfy the rule.

**Deeper prototype:** let the player manage several sustained or alternating signals rather than only a larger volley. One approach could involve holding a tuned channel while interrupting the dominating bell; another could use a deliberate multi-source burst. Choose one simple variation that feels different from the Regent and has several equipment solutions.

Do not require a rare Bellmaker recruit or one specific weapon to complete the campaign. A specialist can reveal or simplify an approach; ordinary crews still need a viable answer.

**Desired release:** masks or shutters open, trapped voices disperse outward, bell motion loses its compulsory synchronization, and a distinct silence remains. Avoid a generic shower of glass that makes destroying the stored voices look like the objective.

### 12.3 Blackout Core: the route holds

**Exists:** a multi-phase confrontation with rotating Custody attacks, escalating simultaneous pressure, sealing drones, recovery at phase boundaries, and a final major beam. The basis for a strong final test is present.

**Gap:** the common hull bar, a target called the Heart, and guidance to “Silence the Heart” can obscure the intended distinction between breaking isolation and harming the archive. Phase restoration also needs to read as deliberate emergency machinery, not hidden healing that invalidates progress.

**Near-term refinement:** label the isolation shell and its operational parts clearly. Show phase reserves engaging, the consequences of each Custody step, and why particular targets weaken the shell. Keep archive lights visibly protected or still working behind it.

**Recommended final action:** after the isolation machinery is overcome, the crew completes and receives a connection acknowledgement. Use the game's established greeting, helm, and transmission language. Let the player's last meaningful action concern delivery. It should be earned and clear, not a surprise extra boss or a hidden fail-state after an apparent victory.

**Desired release:** isolation rings separate or settle, defensive shutters open, then individual message lights begin leaving. Build from one successful delivery toward a larger flow. The emotional payoff is that ordinary words can arrive, not that the largest object on screen has been destroyed.

### 12.4 Authored guardian material is not fully connected — P1

The script contains approach, handshake, start, half, final, and defeat material for the guardians, plus barks. The normal session path consumes approach and defeat. The intermediate sequences account for twenty-four authored beats that are not connected to normal combat through that path; the bark collection is registered but has no normal combat consumer.

This is partly a missing presentation connection and partly a writing review. Some intermediate writing assumes mechanics or timing that no longer match the current fight: for example, when supporting units appear. **Do not blindly attach every existing line to a health threshold.** First decide the real phase structure, then retain the lines that explain or deepen those actual events.

Use short radio barks during play, pausable critical information, and selective staging. Adding eight modal interruptions to each boss would worsen the flow.

## 13. Enemy-by-enemy opportunities

These are proposals for sharpening the existing roster, not a request to rebuild all twenty-two enemies at once. Preserve ordinary tactical fights between more elaborate encounters. Give each recurring silhouette a recognizable job, an attack preparation, a vulnerability, and an ending.

Use the existing roster for some signal-hunting roles before expanding it. A Quarantine Drone can establish detection and interception; a Cable Wraith can threaten the route; selected larger autonomous vessels can hold or pursue along carriers. Test at least one fully autonomous vessel with no internal crew or escort units. Its ordinary battle should remain compelling without a pre-combat choice or special objective.

| Enemy | Design emphasis to strengthen | Missing or useful presentation/mechanical hook |
| --- | --- | --- |
| Packet Leech | Accumulation and refusal to release traffic. | Tank pressure and clamp movement; an intact-release variant in which the buffer contents matter. |
| Cable Wraith | Isolation by cutting. | Shears visibly approach a specific span; a cut deadline with suppression or escape counterplay. |
| Rust Prophet | Warning machinery that overwhelms what it warns. | Turning horns, channel saturation, a visible acknowledgement that changes its behavior. |
| Scrap Foreman | Dangerous maintenance or reclamation authority. | Tool-specific gestures and a work sequence the player can interrupt; recovery rather than generic aggression. |
| Scavenger Skiff | Human scarcity and bargaining. | Crew on the radio, lowered weapons at surrender, a physically surviving vessel when spared. |
| Static Nest | Repeated deployment from a fixed structure. | Readable launch chambers, approach paths, temporary relief when the launch mechanism is damaged. |
| Ferric Colossus | Foundry-scale endurance. | Furnace cycle, pressure or heat anticipation, a heavy shutdown that preserves the surrounding structure. |
| Iron Regent | Redundancy and controlled passage. | Gate structure, distinct lock confirmations, visible warden repair, opening traffic. |
| Prism Widow | Optical threat and changing exposure. | Lens/shutter preparation and a clearly indicated firing line; optics visibly fail or fold. |
| Glass Echo | Repetition in a small flying machine. | Rotor movement, repeated signal/attack rhythm, a way to exploit the repetition. |
| Wire Weaver | Repair action that binds or harms. | A physical tether or winding motion; targetable work that can be stopped before another cycle. |
| Glass Choir | Local accumulation of voices. | Bell-bank activity with readable roles; introduce a principle later developed by the guardian. |
| Coil Serpent | Capturing a live signal. | Coil tension and an attempted grip; a brief decision between breaking contact and enduring capture. |
| Echo Tender | An abandoned round repeating. | Familiar Lamplighter-like behavior used poignantly; manual release or a changed last round where appropriate. |
| Hollow Choir | Plurality and release. | Distinct voice indicators, bell/shutter movement, a release of voices rather than ordinary wreckage. |
| Gate Sentinel | Procedural refusal at a fixed checkpoint. | A gate physically blocks passage; failed and accepted procedures are visible. |
| Null Marshal | Enforcement and escort. | Visible deployment and entry of troopers; changing the warrant or stopping dispatch has a readable result. |
| Ash Moth | A cooling response that endangers the tender. | Heat-seeking movement and wings/fins; show why a bright or hot system draws it. |
| Grave Reaver | A machine reading a weak signal as permission. | Inspecting claws and a recovery sequence; make its misclassification observable. |
| Demolition Engine | A procedure approaching irreversible completion. | An actual readable countdown and interruptible machinery; distinguish demolition risk from another damage race. |
| Blackout Core | Custody continuing despite the requested answer. | Reserve engagement, isolating rings, causal attack machinery, final acknowledgement and delivery. |
| Quarantine Drone | Detection of untrusted signals and enforcement of quarantine. | Search sweep, target acquisition, direct interception and containment; sealed-relay variants retain the established lack of loot. |

For each enemy, ask: **if its name and introductory text were hidden, could the player infer its job from one action and its shutdown?** If not, the next asset should probably explain that job rather than add decorative detail.

## 14. Seven encounter treatments worth prototyping

These examples illustrate how existing lore and systems could connect. They are not additions to canon and are not all required for the next milestone.

### A. The full buffer — deepen a common Packet Leech encounter

**Premise:** its buffer cannot release an old packet and its intake keeps drawing in more traffic.

**Choices:** pass with minimal contact; interrupt it forcefully; use observation and suppression to release the buffer intact.

**Gameplay difference:** an intake/clamp state and a visible opportunity to release held traffic. A technical choice might delay its first clamp or reveal the relevant system, rather than simply rolling the same fight or no fight.

**Aftermath:** the tank's activity changes, the clamp opens, and one ordinary message becomes readable. Routine repeats can use a very short version.

### B. The family above the shaft — make rescue a transfer

**Premise:** people inhabit a stranded lift or platform and want help, supplies, or passage.

**Choices:** provide a useful resource; undertake a transfer; establish a later connection; continue onward.

**Gameplay difference:** if the crew undertakes a dangerous transfer, staffing and keeping the tender stable matter. Do not claim a rescue happened while presenting an unrelated enemy duel.

**Aftermath:** a new person actually boards, supplies move across, or the shaft lamp lights. Let refusing be a legible choice under scarcity without writing every refusal as cruelty.

### C. One carrier left — turn the Wraith into a route problem

**Premise:** shears are advancing along a particular live carrier near a switch.

**Choices:** interrupt the shears; complete the alternate switch; accept damage while protecting a transfer.

**Gameplay difference:** show the span, a simulation-time deadline, and what a cut would do. Let damage to the actuator interrupt the duty. The player's route decision and combat departure must use the same travel rules.

**Aftermath:** the surviving route is visible on the chart. If the carrier is lost, the map and final connection model must honor that loss.

### D. Bench Nine — a refuge that performs care

**Premise:** a maintained bench, tools in order, Hobb's kettle, and a person who has done this work for a long time.

**Choices:** one meaningful service decision, an optional conversation, and departure when ready.

**Gameplay difference:** explicit recovery or refit, transparent cost, no hidden reading timer. The crew can be seen doing ordinary work while the player plans.

**Aftermath:** a repaired patch, a stamp, a borrowed tool, or a short line that can return later. Do not force a surprise ambush into every refuge to make it feel like content.

### E. The Kittiwake — keep an expressive encounter expressive

**Premise:** another tender repeats an unfinished round.

**Choices:** honor its wish to remain lit or finish the round and put it to rest, as the existing writing allows.

**Gameplay difference:** this does not need a new battle. A short physical act—travel the span, set the brake, touch the lamp—can carry the choice.

**Aftermath:** different lamp and movement states, both recorded respectfully. A later message or ending line acknowledges the interpretation without assigning virtue points.

### F. The first delivery — turn victory into the act the voyage promised

**Premise:** the isolation shell has released, but the connection must complete.

**Choices/actions:** recover the crew's stations, send the final acknowledgement, and let the first reply arrive. Keep the interaction short and safe once the combat victory is earned.

**Gameplay difference:** the player uses an established command in a changed emotional context. No unrelated final puzzle.

**Aftermath:** a single outgoing light, an answer, then wider traffic and selected personal callbacks. Give silence and the Operator's response enough space to matter.

### G. Unknown sender — a fight with no opening decision

**Premise:** the tender enters a crossing watched by an autonomous robotic vessel. Its search optic stops on the Lamplighter's transmitting line. A brief classification arrives: “UNKNOWN SENDER. TRUST NOT ESTABLISHED. INTERCEPTING.”

**Entry:** the vessel commits immediately. There is no event choice, negotiation, required acknowledgment window, or offer to inspect safely first. The battle appears under the player's chosen pause behavior.

**Gameplay:** this is a straightforward fight against a vessel with no crew. The player allocates power, chooses targets, handles damage, and decides whether to defeat it or charge a valid escape. Its weapon configuration and targeting behavior create the difficulty. A visible controller or repair assembly provides understandable system targets; neither requires an additional puzzle.

**Presentation:** the hunter moves along its carrier, optics tracking the tender, weapon mounts turning together. Internal machinery operates with no walking people. Its pursuit drive loses tension when disabled; its weapon control goes dark when the battle is won. Even without a separate story window, the player sees why it attacked and what stopped it.

**Aftermath:** a short integrated result records damage, expenditure, and any relevant salvage. No mandatory moral choice follows. If the crew escapes, travel costs and injuries remain, and any special continued pursuit must be communicated explicitly. The memorable story may simply be that the last intact gun bought enough time for the helm to finish the greeting.

## 15. Animation audit: what exists and what is actually missing

### 15.1 The game is not generally unanimated

Existing presentation includes crew idle/walk/work/fight responses, doors and lifts, projectiles and beams, muzzle and hit effects, shield responses, fire/breach/ion effects, drones and rotor overlays, weapon recoil, tender sway, handshake effects, departure/arrival movement, and various lamps and particles.

The missing layer is **large, specific, meaningful motion**: the machine doing its job, the setting continuing its old work, the ship's major equipment changing state, and an action leaving a visible result.

Asset/frame totals alone do not establish that experience. Hundreds of small reusable frames can coexist with a completely static guardian body and a static background image.

### 15.2 Shipped artwork bypasses some environmental motion — confirmed, P1

The combat backdrop uses the loaded illustration when available. Animated procedural clouds and stars belong to the fallback branch. Dust and some hazard overlays remain, but they do not animate the illustrated machinery or depth layers.

The relay scene adds twinkles, pylon signals, lamps, sway, and movement around its artwork, so it is not wholly static. The story scene similarly has text reveal and transitions, but some special blinking/scene elements only exist in its no-art fallback. The main illustrated scene can remain still while the prose describes a lamp, cable, hand, or mechanism moving.

Room props have a related issue: major painted fixtures can remain static even where fallback drawing contains mechanical activity. Surrounding room architecture and overlays do animate, but the main object does not necessarily convey its operating state.

**Design requirement:** judge the normal asset-loaded experience. Fallback animation is not evidence that the shipped painting is alive.

### 15.3 Prioritize motion by what it communicates

| Priority | Motion category | Why it comes first |
| --- | --- | --- |
| **A — essential** | Threat preparation, targeted entry, active objective, hit response, shutdown, successful switch. | The player needs it to understand cause and effect. |
| **B — world response** | Restored lamps, released traffic, changed mechanisms, damage traces, physical refits. | The player needs it to believe their actions mattered. |
| **C — atmosphere** | Cloud drift, distant cranes, cloth, steam, subtle idle life. | It gives the journey rhythm and place. |
| **D — embellishment** | Extra particles, camera flourishes, elaborate menu transitions. | Useful only after clarity and continuity work. |

Atmosphere is important, but making a boss's dangerous tool readable is a better first use of animation effort than another full-screen particle layer.

### 15.4 Scene-by-scene inventory

| Scene or object | Current state | Missing or weak behavior | Priority |
| --- | --- | --- | --- |
| Title / Relay Seven | Illustrated scene and interface effects. | A restrained invitation: the particular lamp asks, the board responds, machinery has a quiet physical presence. | P2 |
| Prologue board | Typewriter text, fades, illustrated beat. | Stamp press, indicator sequence, hand or receiver movement at the moments the text emphasizes. | P1 |
| Tender at a relay | Crew movement, sway, lamps, carrier detail. | Grip settling, local service activity, selected crew idle actions, room use visible at rest. | P1 |
| Departure | Existing departure motion and handshake presentation. | Stronger causal sequence: attended reply, switch movement, grip transfer, trolley acceleration, lamps passing. | P0/P1 |
| Arrival | Existing slide/settle presentation. | Relay identity, warning/permission state, physical braking and the immediate consequence of the last visit. | P1 |
| Route chart | Nodes, connections, Seal representation and hints. | Physical route distinctions and remembered world changes; a clear action-driven quarantine step. | P1/P2 |
| Copper backdrop | Main illustration with overlays. | Slow cloud layers, working/stalled cranes, sag and tension in distant carriers, sparse local traffic. | P1 |
| Glass backdrop | Main illustration with overlays. | Optical sweeps, moving fog strata, resonant hanging elements, irregular beacon echoes. | P1 |
| Heart backdrop | Main illustration with overlays. | Heat drafts, failing reserve lights, pressure shutters, conduits responding to Custody and release. | P1 |
| Ordinary event | Art, portrait, revealed text, choices. | State changes in the scene; targeted motion for important objects; many quiet events need less modal presentation. | P1 |
| Human radio contact | Portrait and text. | A few deliberate expressions or gestures, transmission/response timing, current relationship reflected in staging. | P2 |
| Bench | Thematic art and service choices. | Kettle steam, hands at work, a visible recovery/repair result, signs of a place kept ready for the next crew. | P1 |
| Market | Store interface and illustrated context. | Physical trade/service feedback, recurring person's presence, items actually being handed or fitted aboard. | P2 |
| Refit yard | Preview and real layout changes. | Coupler aligning, lift/hoist taking load, car docking, cable connection, lamp/power test. | P1 |
| Powered room fixture | Detailed prop art and surrounding effects. | Main mechanism loops tied to actual power, damage, ion, work, and recovery. | P1 |
| Ward mesh | Faint rectangular layers, HUD pips, edge ripples, and shield sounds already exist. | A readable protective envelope, truthful charged/depleted/offline states, correctly placed impacts, visible collapse and recharge, and distinct guardian barriers. See section 17.5. | P0/P1 |
| Weapon | Distinct object, charge indicators, recoil and shot effects. | Per-family preparation/recovery: capacitor fill, breech action, spool spin, lens focus. | P1/P2 |
| Drone | Orbit, hardware image, rotor treatment. | Physical launch/recovery at its bay and distinctive disabled behavior where not already conveyed. | P1/P2 |
| Boarding | Warning support and internal entry effect. | Visible transit, attachment, entry point, defender response, consistent physical sound. | P1 |
| Ordinary hostile body | Recognizable hull, glow/hit/sway behavior. | Its clamp, tool, intake, sensor, or wing actually performs its duty. | P1 |
| Autonomous signal hunter | Machine enemies and detection/quarantine fiction already exist. | Search optic, acquisition, coordinated turn/acceleration, weapon engagement, machinery-only interior, and a readable loss of pursuit. | P1 |
| Machine victory | Generic result effects and task-ended text. | Machine-specific release, standby or damage state, something visibly let go. | P1 |
| Human surrender | Choice and reward flow. | Guns lower, incoming fire stops coherently, surviving people/vessel remain present, terms visibly resolve. | P1 |
| Regent | Gate state effects and supporting units. | Crown/gate/locks physically move; wardens visibly maintain the interlock; passage opens. | P1 |
| Choir | Glass/boss effects. | Masks, shutters and bells move in the attack cycle; multiple voices visibly leave on release. | P1 |
| Core | Phase effects and attacks. | Iris/rings/shutters engage by phase, reserves visibly change, shell and archive remain distinct. | P1 |
| Crew death/loss | Combat loss and records. | A restrained persistent absence: empty work position, personal trace, selected later response. | P1/P2 |
| Ending | Authored script, art and callbacks. | Actual final handshake, first delivered message, changed Line lighting, patient visual response from Ground/Operator as canon permits. | P1 |
| Defeat | Written conclusion and statistics. | A specific final condition—stalled, dark, abandoned—without implying every failure is the same explosion. | P2 |

### 15.5 Regional background direction

**Copper Reach:** large automated cranes can repeat a small obsolete motion, pause against a stop, and repeat. One nearby maintenance light can be healthier than a distant row. Cloud layers should establish altitude and depth. Market traffic should be sparse and local, consistent with the surviving population; do not turn the Reach into a bustling restored industrial metropolis.

**Glass Cathedral:** let fog move differently at different depths. Glass can catch a slow sweep from an unseen optic. Hanging structures can respond after a transmitted pulse rather than moving constantly. Reflections should suggest architecture and signal, not floating magical runes. Silence after a resonant event matters as much as the resonance.

**Blackout Heart:** heat and failing power should feel like stored reserves being spent. Use a few long conduits and shutters whose state changes during the encounter. The final release should alter a small set of established motifs, so the player recognizes that the same place now behaves differently.

**Across all stages:** the camera and parallax must respect a tender attached to infrastructure. Avoid an endless starfield scroll that makes it look like free flight through space. Keep far motion slow enough that crew silhouettes, incoming shots, and target outlines remain dominant.

### 15.6 Make backgrounds reactive, not merely moving

For each location, define a handful of meaningful states:

> unvisited or unknown → encountered → active danger → helped/cleared/abandoned → sealed or released.

Not every state needs a new full painting. A lamp group, a moving shutter, a removed clamp, a stopped warning sweep, a handful of released lights, or a changed sound can communicate the transition.

Examples:

- Shut down the Rust Prophet: its beacon stops turning and the repeated radio warning ends.
- End a Wire Weaver task: tension in its line relaxes.
- Recover the relay: one visible circuit of lamps comes on.
- Accept surrender: targeting lights retract and the skiff remains suspended.
- Let a cutter finish: the particular cable changes, and the chart agrees.
- Open the Heart: the established isolation lights change before the stream of messages begins.

Do not show the same triumphant light-up when the player ignored the people or merely looted the area. A neutral or mixed result can still be visually satisfying.

### 15.7 Crew animation should reveal activity and condition

Most essential crew actions already have animation support. The next additions should increase specificity:

- Warden braces against a surge or checks a bulkhead.
- Rigger folds tools away and locks into a repair task.
- Courier waits impatiently for the lift and moves confidently through a clear route.
- Bellmaker listens, then adjusts a physical control.
- Injured crew move and idle differently enough to support health awareness.
- A volunteer briefly uses the mess or bench during safe time.

Use subtle variants and infrequent interactions. Do not bury a fire or failed repair under theatrical idle behavior. Crew should return to readable work poses immediately when commanded.

### 15.8 Large machinery needs an animation grammar

For each important hostile, specify:

1. **Idle:** what old work continues while nothing changes?
2. **Notice:** how does it recognize an unknown sender?
3. **Prepare:** what makes the dangerous action readable?
4. **Act:** which physical part performs it?
5. **Recover:** when can the player exploit its commitment?
6. **Damaged:** what function visibly degrades?
7. **Task ended:** what stops, opens, or is released?

This can begin with a few independently moving parts and controlled light states. It does not require regenerating every illustration or replacing the renderer. Split the most important painted mechanisms into movable layers where worthwhile; use the existing art as the visual reference.

For the guardians, reserve framing time for the mechanism, not just the health bar. The current cutaway overlays are useful tactically, but can hide the guardian's identity. Keep targetable internals legible while allowing the gate, masks, or iris to perform the major action around them.

### 15.9 Motion rules and restraint

- Freeze simulation-dependent motion and deadlines while paused. Ambient clouds and harmless lamp glow may continue if they cannot be mistaken for advancing danger.
- Provide reduced-motion settings beyond screen-shake suppression: parallax, sway, repeated pulses, and flashes.
- Replace a dangerous animation with a stable icon/timer when reduced motion is enabled; do not remove information.
- Separate a decorative flicker from a failing-power warning through shape, rhythm, position, and text.
- Keep most backgrounds quiet during peak combat. A few bright, moving threats are easier to read than universal blinking.
- Critical sound cues also need visible equivalents.
- Avoid forced camera movement while the player is issuing room or weapon orders.
- Let ordinary transitions become short after their first use. Preserve an option to watch them, but do not charge the player's real time for identical routine departures.

## 16. Sound and music: already substantial, still missing world behavior

The game already has adaptive music, theme changes, material sound effects, crossfades, and many action cues. More tracks are not the obvious first need. Existing audio validation demonstrates asset/runtime checks; it is not a substitute for listening to full play sessions.

The next sound pass should ask what each place and machine is doing:

| Layer | What to add or strengthen | Purpose |
| --- | --- | --- |
| Tender | Trolley hum, grip strain, interior air plant, changing system load. | Make the vehicle feel inhabited and functional. |
| Relay | Signal relay clicks, a specific lamp circuit, distant structure-borne movement. | Give stops an identity without dialogue. |
| Bench | Kettle, tools, small room sounds, comfortable space in the mix. | Let refuge reduce tension. |
| Hostile | A characteristic operating rhythm before the attack. | Teach recognition and anticipation. |
| Signal hunter | Scanning pulses that stop on acquisition, a distinct lock tone, then drive and weapon engagement. | Make the moment of becoming a target unmistakable and threatening. |
| Damage | Material-specific stress and interruption, rather than only louder explosions. | Connect sound to a failing function. |
| Shutdown | Motor wind-down, latch release, escaped pressure, the end of repetition. | Make ending a task emotionally different from destruction. |
| Seal | A deliberate closure or distant cut associated with a real action. | Communicate pressure without a constant alarm. |
| Ending | One unmistakable successful reply followed by widening traffic. | Make delivery the musical and mechanical resolution. |

Respect the physical setting: interior vibration and sound conducted through carriers can make more sense than every distant exterior machine roaring at full volume. This is an aesthetic direction, not a demand for a rigid acoustics simulation.

Music should leave room for those cues. Let a machine's repeated sound disappear after its duty ends. A short absence can be more effective than adding a victory sting. Avoid full voice acting as a prerequisite; selective radio textures and well-timed text can preserve intimacy at a manageable scope.

A listening pass should include pause/resume, several consecutive fights, a quiet bench, an extended boss phase, surrender, crew loss, and the ending. Check fatigue, repeated cue stacking, the relative loudness of warnings, and whether important moments remain clear at low volume.

## 17. Interface, information, and accessibility

### 17.1 Preserve the visual language, strengthen the hierarchy

The current large cutaway rooms and game-like controls are worth keeping. At 1366 × 768, the guardian and expanded tender remain visible, but fine text, resource icons, power labels, and short hail areas demand more attention. Fitting every element inside the canvas is not the same as comfortable reading.

The critical combat hierarchy should be:

1. Immediate threat or active objective.
2. Player hull, vulnerable crew, and dangerous room state.
3. Enemy defense condition and currently useful targets.
4. Weapon readiness and power tradeoffs.
5. Departure readiness and destination/cost.
6. Secondary detail on demand.

Avoid giving a decorative frame or a minor system glyph the same visual weight as an incoming boarding party. Keep player and enemy status surfaces distinct, and use optional labels where icons are insufficient.

### 17.2 Distinguish observation from omniscience

Sensors should reward information investment. However, the player still needs to know the basic purpose of an encounter and the existence of meaningful counterplay.

An unupgraded crew might see a launcher open and know boarders are coming; a skilled listening post might reveal the exact entry room and timing. A guardian's core rule should be discoverable in the fight without already owning the answer to that rule.

The Runbook can keep known facts after first discovery. It should distinguish a reliable observation from a rumor or a crew interpretation. Do not turn incomplete knowledge into misleading certainty.

### 17.3 Missing or incomplete usability work

| Need | Current position | Recommended direction |
| --- | --- | --- |
| Text readability | Whole-canvas scale modes exist. | Independent text/readability options or layouts that do not require shrinking all tactical detail. |
| Text reveal | Typewriter presentation exists. | Adjustable speed and immediate reveal, without losing the ability to pause and reread. |
| Motion | Screen-shake control exists. | Broader reduced-motion and flash controls. |
| Color interpretation | A strong palette and icons exist. | Redundant shapes/labels for hazards, disabled systems, route states, and choice types. |
| Controls | Shortcuts and mouse commands exist. | Discoverable mappings, remapping where practical, and fewer important right-click-only assumptions. |
| Narrative history | Runbook and collected material exist. | Readable recent hails and a concise record of active commitments. |
| Orders | Movement and station controls exist. | Better destination/path/waiting feedback and a clear reason when an order cannot execute. |
| Equipment purchase | Stats and previews exist. | Show the operational consequences: power, staffing, travel distance, capacity, and compatible room. |
| Warnings | Tactical feedback exists. | Prioritized, persistent critical warnings rather than several competing small text areas. |

Accessibility should preserve the game's atmosphere. Brass panels and in-world instruments can still carry readable text and clear control states.

### 17.4 Explain recovery and capability rules where they matter

The best location for “safe medical care costs one deliberate wait” would be the service action, if that rule is adopted. The best location for “this listening keel improves battle scans but not relay reach” is the upgrade preview, if that split remains intentional.

Do not solve every confusing mechanic by adding another Field Guide page. A reference is useful after the rule has been communicated at the decision point.

### 17.5 Visible shielding needs a clearer physical and interface language — P0/P1

**The current shield presentation is insufficiently clear for a game built around stripping defenses, volley timing, and damage control.** This becomes especially important with the requested laser and drone starts. Improve the presentation before using player impressions to judge those loadouts' strength.

The current renderer does have shields. It draws one faint rounded rectangular mesh per available layer around the vessel's bounds; inactive layers can retain a very low-opacity trace. It also draws shield pips in the HUD and ripple/spark effects for shield hits. The inspected expanded-tender view at 1366 × 768 showed the problem: the field surrounds a large rectangular area containing empty space and can read as a selection or view border. The small pips carry much of the actual state information.

Additional source findings:

- Layer brightness/shimmer communicates some state, but an exhausted field can still leave mesh traces. That weakens the distinction between protection and exposure.
- Shield-hit effects are positioned at a fixed left or right vessel edge, using the event's vertical position. They are not generally placed at the visible field's intersection with the incoming shot path.
- The player's recharge indicator is a very small line below a pip; the enemy header uses a different shield treatment. Immediate comparison is harder than it needs to be.
- Regent gate and Choir glass effects reuse the mesh drawing with different color and dimensions. Those defenses have different rules and need a distinction stronger than tint.

These findings identify presentation problems; they do not establish that the combat simulation is calculating ordinary shield layers incorrectly. Relevant sources are [ward-mesh drawing](../src/combat/draw-ship.ts), [combat hit effects](../src/combat/scene.ts), and [shield HUD](../src/combat/hud.ts).

#### A. Show an actual protective field around the vessel

Use one coherent, rounded protective envelope fitted to the **connected hull and its attached cars**, with a subtle ward-wire pattern and a clearly readable energized edge. It should relate to the vessel's silhouette rather than the rectangular combat viewing area. Fit it deliberately around rear and keel additions; do not leave a huge box around mostly empty air.

It need not trace every rivet or become a perfect collision outline. It does need enough geometric agreement that an incoming shot visibly meets the protection before reaching the hull. Keep the interior largely transparent so that rooms, crew, fires, targeting, and weapon paths remain easy to read.

Tie the field to visible hardware: emitters or ward-wire fixtures on the car and a restrained discharge toward the carrier when appropriate. That supports FAULTLINE's charged-wire-and-grounding explanation. The effect can be striking without resembling an unrelated magical aura.

Do not rely on counting four almost identical concentric rectangles. The field answers **“is this vessel protected?”**; a nearby clear layer display answers **“how much protection remains?”** If layer count also changes the envelope, use a restrained number of readable bands or edge details, not expanding screen clutter.

The field should belong visibly to its vessel at every camera zoom. Player and enemy ownership must remain clear through placement and UI framing, with color as an additional cue rather than the only distinction.

#### B. Separate charged layers, available capacity, and installed capacity

These are different quantities:

- **Charged layers:** protection that can stop a relevant incoming attack now.
- **Available capacity:** how many layers the currently working and powered system can sustain, including supported external bonuses.
- **Installed capacity:** what the tender could sustain with the system repaired and adequately powered.

Show an always-readable charged/available value near both vessels—for example, **MESH 2/3**—with sufficiently large filled, empty, and unavailable indicators. Explain lost capacity through a compact power/damage/ion marker or inspection detail. A missing layer because the system is unpowered must not look identical to a layer that will finish recharging in a moment.

| State | Field behavior | HUD behavior |
| --- | --- | --- |
| Charged | Continuous energized edge with restrained idle motion. | Filled indicators and a readable count. |
| Hit absorbed | Local response at the actual incoming contact; the consumed layer is reflected immediately. | One relevant layer goes out at the same moment; hull stays unchanged for a fully blocked ordinary shot. |
| Partially depleted | Protection remains visible while at least one layer is charged. | Remaining count stays clear; show the next layer's actual recharge progress. |
| Last charged layer lost | A brief break or collapse, followed by no energized protective edge. | Zero charged layers, a clear exposure cue, and honest recharge status. |
| Recharging | A controlled recovery effect that completes when a layer actually becomes usable. | Progress for the next layer; one indicator lights at completion. |
| Shield Array not fitted | No protective field or phantom recharge animation. | NOT FITTED, distinct from a damaged or depleted installed system; any future fitting cost is shown where it can actually be purchased. |
| No effective capacity | Emitters or fixed wire hardware may remain visible, but no active protective envelope. | OFFLINE, UNPOWERED, DAMAGED, or ION-LOCKED as appropriate; no fake recharge. |
| Partial ion/power impairment | Indicate impaired machinery without erasing protection that still exists. | Preserve the charged count and explain the reduced available capacity. |
| External bonus protection | A recognizable source connection or distinct indicator. | Identify the supplying drone or mechanism; update when that source is lost. |

The point is truthful state, not a new shield resource or more management. Keep the existing basic rule of power supporting layers unless a separate balance decision changes it.

#### C. Make each attack's result visually different

| Attack/result | Required feedback |
| --- | --- |
| Laser stopped by mesh | The shot terminates at the visible boundary; a local ripple/discharge accompanies the layer change. No hull explosion for a fully absorbed shot. |
| Laser reaches hull after defenses are down | A clearly separate impact on the targeted hull/room, with the existing damage response. |
| Payload bypasses ordinary mesh | The projectile visibly passes through without falsely consuming a layer, then hits or is intercepted by another defense. Teach that bypass through the first relevant encounter or tooltip. |
| Beam weakened or blocked | The beam visibly loses strength or terminates consistently with the actual result. Do not imply that every ordinary beam consumes a mesh layer if the rule only reduces its damage. |
| Ion interaction | A distinct electrical interruption and truthful capacity/lock feedback. Color alone is insufficient. |
| Evasion/miss | The shot passes clear. Do not play a shield-block effect that claims the field stopped it. |
| Guardian gate or glass stops the attack | The specific gate/glass responds, with its own rule indicator. Do not misreport the event as an ordinary shield layer removed. |

Use a short, strong local impact rather than making the entire vessel flash equally for every event. Make the loss of the final layer more noticeable than an ordinary absorbed hit. Let a regained layer give a concise visual and audio confirmation. Repeated drone fire should not turn the whole battle into a continuous bloom or sound overload.

The event, projectile, field, HUD, and damage result must agree in time and place. A shield that visibly catches a shot after the same shot has exploded in a room teaches the wrong rule even when the damage calculation is correct.

#### D. Give guardian defenses their own physical language

The Regent's gate can show an interlock, separate acknowledgements, and gate leaves holding or releasing. The Choir's glass can show a resonant shell, stress, fracture, and reformation. The Core's ordinary mesh and any drone-supported protection should identify their sources independently of the isolation machinery.

A player should distinguish **ordinary layers**, **the Regent's special gate**, and **the Choir's glass condition** without reading a color legend during an attack. Make the relevant rule indicator persistent enough to inspect while paused.

#### E. Check the visual system in the situations that matter

Before calling the shield presentation complete, inspect:

- Player and enemy with no Shield Array, or with zero, one, and several charged layers in an installed array.
- Last-layer collapse, partial depletion, and one layer returning.
- Reduced power, system damage, and partial/full ion impairment.
- A compact tender and a full rear/keel consist at normal desktop sizes.
- Laser volleys, continuous drone pressure, beams, bypassing payloads, and misses.
- Ordinary mesh beneath or alongside each special guardian defense.
- Tactical pause, reduced motion, muted audio, and a visually busy background.

The player should be able to answer **“am I protected, how many layers remain, why did that shot stop, and when can protection return?”** without hovering over a tiny icon. During pause, the meaningful state must remain readable even if decorative movement is suppressed.

## 18. Endings, defeat, replay, and persistence

### 18.1 The ending should answer the voyage, not explain the universe

Existing writing already supports personal callbacks and ordinary messages. Preserve that. The strongest conclusion has three layers:

1. **Mechanical:** the crew establishes that a reply can get through.
2. **World:** isolation releases and messages begin to move.
3. **Personal:** a few people and commitments from this voyage are acknowledged.

Do not exhaust every mystery or recite every acquired codex entry. Select callbacks that the player is likely to remember. Give an unfinished promise an honest absence or short acknowledgment where appropriate.

The final presentation should visibly distinguish the surviving archive from disabled isolation machinery. A small successful signal can carry the emotional climax before the grander view.

### 18.2 Failure needs specific causes and humane re-entry

Running out of stamps, losing the hull, losing the crew, and abandoning an impossible confrontation are different stories. Defeat material should reflect the actual cause, then offer a readable account of how the run reached it.

Useful post-run information:

- Where the crew got to and what stopped them.
- Which preparations materially helped or failed.
- People met, messages carried, and duties ended.
- Names of those lost.
- A small amount of newly understood world knowledge.

Avoid a long sequence of punishment screens. Let a returning player restart quickly while retaining optional reflection.

### 18.3 Preserve knowledge progression without a power treadmill

Persistent codex/fragment discovery is a good fit. The player becomes more literate in the Line. Permanent stat escalation would make it harder to tell whether a later success came from learning or grinding.

Replay can vary route families, regional conditions, voluntary commitments, specialist recruits, and the requested three starting tenders. Keep the choices within the Line's maintenance fleet and give each a persistent identity throughout its voyage. Further refits remain available during play; starting equipment should guide a build without permanently locking it into a class.

The current new-voyage variation is chiefly naming and appearance; “other volunteers” rerolls names rather than offering a substantially different crew composition. The two requested additional tenders are therefore a new design requirement, not a description of an existing selector. They belong in the next playable design pass, with their loadouts tested against the longer, more combative voyage.

Also decide how repeated attempts relate to chronology. The failure fiction can evoke another unanswered page or an echo, but the game need not imply that the same uniquely identified tender and every named person literally resurrect. Treat alternate runs as alternate voyages unless canon deliberately says otherwise.

### 18.4 Saving should support the player's life

Current saving centers on arrival, resolved encounters, and hub activity rather than exact mid-combat suspension. Restoring a checkpoint can replay an encounter. Seeded outcomes constrain some rerolls but do not prevent revisiting tactical decisions, so broad claims of “no save scumming” should be qualified.

A future suspend-and-resume system can preserve a single ongoing voyage without creating a menu of reloadable saves. This is a usability proposal, not a requirement to redesign persistence before fixing the core loop. Be clear today about where a resumed game starts.

The game's dramatic finite connection should not require the player to finish a long encounter before attending to real life.

### 18.5 Three starting tenders — requested direction, P1

**Offer the Lamplighter plus two additional tenders at the beginning.** The laser-focused tender starts without a payload weapon; the other begins ready to operate drones. Make all three selectable without a grind or a previous victory. The Lamplighter can remain the suggested first choice.

Choose a tender once, before departure. Keep its crew and vessel identity throughout the run, with the existing opportunities for recruitment, attached cars, and refits. This preserves responsibility for one vessel while giving replay an immediate strategic difference.

“Optics Tender” and “Drone Tender” below are working role labels, not final names or additions already made to canon. The proposed equipment uses existing definitions so the first comparison can focus on play rather than a large new weapons catalog.

| Starting tender | Former working role | Proposed starting equipment | Distinctive play |
| --- | --- | --- | --- |
| **Lamplighter, L-12** | Lamp rounds, general cable work, towing, and emergency rescue; retain its established personal history. | Existing Burst Emitter plus Payload Launcher; its current basic Shield Array. | Flexible direct fire with a limited stock of shield-bypassing payloads. Spend ammunition to solve a dangerous problem quickly or conserve it. |
| **Optics Tender** | A fleet variant equipped for signal alignment, lamp banks, and optical carrier service. | Burst Emitter plus Packet Laser; **no payload weapon and no starting payload ammunition**. A basic Shield Array is proposed for this profile. | Ammunition-free laser volleys. Coordinate independent emitters to remove shield layers and land damage; manage charging and power rather than payload stock. |
| **Drone Tender** | A fleet variant used for inspection and external work by small service drones. | A working, installed Drone Bay; Relay Drone as its main offensive drone; Firewall Drone available for interception; Burst Emitter as its fallback weapon. **Proposed unshielded start: no Shield Array fitted.** No starting payload weapon. | Drone operation, drive/evasion, and suppressing dangerous enemy systems provide its opening plan. The cost of fitting shields later competes with deepening that plan. Its alternative defenses require validation; interception is not blanket protection. |

These are starting candidates, not balance-validated loadouts. The original loadout exists today; the two others and their starting vessels remain proposed implementations of the requested choices.

**Why these laser weapons?** Both are classified as lasers in the current data, both use no ammunition, and together they require three weapon power. They also provide two independent firing sources. Starting with only a low-damage beam would risk making an intact shield an absolute obstacle. An optical lance can be an attractive later purchase once the player has a reliable way to suppress the enemy's defenses.

The laser tender's weakness should be meaningful: it cannot immediately bypass mesh with a payload, and poor volley timing can waste shots on recharging layers. Its strength is sustained fire without ammunition expenditure. Avoid turning that tradeoff into a damage bonus applied to every future energy weapon.

**Make the drone tender usable from the first fight.** The bay is fitted, its system has sufficient capacity, the offensive drone is installed, and the inventory contains a clearly explained reserve of spares. A starting allowance around six to eight spares is a candidate to test against the proposed first-stage fight count, not an adopted balance value. The current starter's two spares should not be copied automatically into a drone-dependent start.

For this proposed unshielded profile, establish a complete viable power and defense plan before fixing the Drone Bay level. Test a configuration that can support offense and interception together, with a genuine remaining power tradeoff against the drive, weapon, or medical system. Do not retain the earlier one-active-drone assumption merely for symmetry with shielded starts. The selection preview must state exactly what the initial reactor and bay can run simultaneously. A supplied defensive option that cannot be used alongside a workable attack is not sufficient compensation for removing the shield.

The current deployment rules consume a spare and can charge another spare after loss of bay power. This is consequential for a drone-focused start: make deployment, recall, disabled power, destruction, and redeployment costs explicit. Test whether the rule creates useful commitment or merely punishes normal power management. The drone tender should have a usable fallback when its bay is damaged or parts run short; the two-shot Burst Emitter is a more credible fallback against a basic shield than a lone one-shot laser.

**Keep tradeoffs visible and comparable:**

- Compare overall viability and meaningful limitations, rather than copying identical defenses onto every vessel. Keep the common TTL/travel rules, but make the presence or absence of a Shield Array an explicit part of the starting profile.
- The Optics Tender gains ammunition independence but gives up the starting payload bypass. Do not automatically convert all unused ammunition value into a large free salvage bonus.
- The Drone Tender's missing Shield Array is a substantial tradeoff. Give it enough bay capacity, operating power, mobility, and supplies to make its alternative plan work; do not also strip unrelated systems until it becomes a punishment start. Any additional advantage should have a clear role in that plan rather than making it superior in every area.
- Explain the reactor's actual simultaneous operating budget. A list of installed weapons and drones must not imply they can all run alongside maximum shields and drive.
- Ensure ordinary stores and rewards support all three starts. Drone parts and useful upgrades need credible acquisition paths, while the laser tender still needs worthwhile purchases.
- Preserve later build freedom. These are different beginnings, not permanent prohibitions on buying payloads, beams, or drones.

**The vessels must also look different.** Keep the shared carrier grip, pressurized working hull, lamp, service access, and maintenance materials. Give the optical specialist a recognizable emitter/optics assembly and associated machinery. Give the drone specialist a visible launch hatch, docking racks, service arms, and a bay the crew can actually reach. Change room placement where it supports the former job and creates a readable operational tradeoff. A recolor and a changed inventory list are insufficient for two additional tenders.

**Give each its own identity in the story.** L-12's eleven rescue trips, Ilse Corran's tally marks, cracked grip, and replacement from Pell belong to L-12. The other tenders need their own short dock record and reason they are available. The existing fleet and lamplighter pattern provide room for that expansion, but do not silently assign L-12's personal history to every selectable hull. Adapt the opening, nameplate, tool descriptions, references during events, save identity, and ending callbacks to the selected vessel. The Operator, finite stamp, volunteer crew, guardians, and final delivery remain shared.

**Selection should answer a few concrete questions:**

1. What was this tender's original job?
2. What starts installed, powered, and in reserve?
3. How does it win an early fight, and what is its main limitation?
4. Which supplies does its starting equipment consume?
5. Does it start with shields, and how does it defend itself if it does not?
6. What is distinctive about its rooms, mounts, and crew access?

Show the actual hull and usable layout, a short role description, equipment, and one clear tradeoff. Keep renaming and lamp color, but make choosing the tender separate from naming it. A short equipment demonstration or readable firing/deployment preview could help more than a long page of statistics.

**Required design validation:** play each start through the same early seeds, a forced interception, a limited-supply stretch, a retreat, and its preparation for the Regent. Check at least one plausible progression into Glass and the Heart. The current Regent distinguishes weapon/drone sources, while the Choir needs sufficient timely hits; every start needs reasonable upgrade routes to meet those tests. Do not assume an automatic drone's firing cycle will conveniently synchronize with every boss window. Validate that it is controllable or predictably usable, and change the interaction if its required timing leaves the player without effective agency.

Visible shielding is a prerequisite for judging these starts fairly. A laser or drone build will feel unreliable if players cannot tell whether its attacks missed, removed a layer, were blocked by a guardian rule, or reached the hull.

### 18.6 Shields are optional starting equipment — requested direction, P1

**Not every tender starts with a shield.** A vessel without a Shield Array should be a distinct playable starting design. It must not be represented as a normal shielded ship whose shield happens to be switched off or waiting to recharge.

The drone specialist is the proposed unshielded member of the initial trio; the user requirement is the difference in starting defenses, while this particular assignment remains a design proposal. The Lamplighter keeps its current basic array, and the optical specialist can retain basic mesh while giving up payload bypass. Show those differences before departure.

An unshielded vessel needs a credible answer to common early attacks. The current Firewall Drone intercepts payloads, debris, and crawlers; it does not stop ordinary laser fire or every beam. A viable profile therefore needs a tested combination of interception, drive/evasion, suppression, offensive timing, repair access, and escape. No single one of those should be described as immunity. Do not secretly grant the ship damage reduction that the player cannot see merely to rescue an otherwise unworkable design.

The first encounters must allow learning this approach without requiring perfect luck. The vessel should be viable through a meaningful opening stretch without making “buy shields at the first shop” its only sensible instruction. Acquiring shields later can be a valuable strategic decision; it should not be an obligatory fee for having selected the wrong start. Retaining an unshielded approach farther into the voyage should have a plausible progression path, without promising every seed or tactic will succeed.

**Fitting shields later needs an explicit design.** Current data treats the Shield Array as non-purchasable starter equipment and gives its initial levels zero upgrade cost. The new design cannot simply remove the array and assume the current store will sell one, or leave a zero-level placeholder that grants the first functional layers for free. Specify a priced installation, where it is hosted, the starting capacity it buys, and its reactor requirement. Its availability should be understandable and achievable when pursued, while its purchase competes with other valuable improvements.

Visually, the ship has no energized field and no shield recharge state before fitting. Show NOT FITTED in the appropriate status/upgrade context, and show the alternative defensive equipment where the player can read its readiness. If an external effect later grants a temporary layer, identify that source explicitly rather than implying a hidden installed array.

Test the unshielded start against lasers, payloads, beams, and boarding threats, across low-resource routes as well as favorable ones. Include the added fights proposed in section 6.5 and the constrained upgrade economy in section 9.9. The goal is a tense, distinct approach with meaningful purchases, not a preset whose viability depends on restoring the standard loadout immediately.

## 19. Missing-work register

This register consolidates the recommendations. “Missing” here includes unresolved design decisions and partially delivered experiences; it does not mean all listed systems are absent. The sections above provide the reasoning and scope limits.

### P0 — establish consistent rules and the central promise

| ID | Gap | Completion criterion |
| --- | --- | --- |
| D01 | Carrier, quarantine, and return-signal model. | Lore, chart traversal, cuts, and the ending agree about what remains connected. |
| D02 | Combat Hop is separate from actual travel. | Departure location, TTL, Seal, and arrival resolve under one understandable rule. |
| D03 | Manned greeting versus automated Helm behavior. | One authoritative rule is taught and reflected by both living and echo tenders. |
| D04 | Archive versus isolation target ambiguity. | A new player can explain what is being disabled and what is being saved. |
| D05 | Maintenance-store eligibility versus service fiction. | Reward receipts describe the action that actually earned access; viable income is retained. |
| D06 | Safe infirmary/service semantics. | Players understand recovery and do not need to prolong won fights for ordinary care. |
| D07 | Encounter promises unsupported by battle setup. | A representative set is classified and either given matching conditions or rewritten accurately. |
| D08 | Current design truth spread through revisions. | A concise current reference resolves superseded terminology and points to the active rules. |
| D67 | Truthful, readable shield state. | Player and enemy clearly distinguish charged layers, recharging layers, unavailable capacity, and no protection; the field cannot be mistaken for a view border. |
| D69 | Endgame specialization and spending constraints. | Ordinary successful runs retain meaningful relevant weaknesses; maximizing every useful major system is not routine, and several purchase priorities remain viable. |

### P1 — the next strong playable slice

| ID | Gap | Completion criterion |
| --- | --- | --- |
| D09 | Task-ending gameplay. | One common machine supports a meaningful duty-specific intervention using the existing combat systems. |
| D10 | Machine-specific shutdown. | The same encounter visibly releases, stops, or disables the relevant mechanism. |
| D11 | Alternative objective. | One hold/recover/work/escape situation plays differently from ordinary hull combat and is understandable without external explanation. |
| D12 | Repeated result and aftermath confirmations. | A routine fight ends in one integrated useful aftermath. |
| D13 | Quiet encounter tier. | A set of low-stakes arrivals works through scene, sound, and optional text. |
| D14 | Faster first meaningful action. | A first-time player operates the tender before needing to absorb the full vocabulary. |
| D15 | Capability and blue-choice promise. | Players know what expertise guarantees and what remains risky. |
| D16 | System-damage consequences with no practical effect. | Each affected outcome has an honest consequence or is framed as a transient event. |
| D17 | Physical boarding. | Threat, transit, entry, and counterplay agree with the lore. |
| D18 | Regent's actual rule and gate release. | Attack-source requirement and interlock state are clear; victory opens a physical passage. |
| D19 | Choir distinction and readability. | Players can articulate how its problem differs from the Regent's beyond hit count. |
| D20 | Core phase causality. | Reserves, Custody actions, and shell changes are forecast and visually explained. |
| D21 | Guardian writing integration. | Selected authored lines are tied to correct gameplay events without excessive interruption. |
| D22 | Final delivery action. | The conclusion uses established play to complete the promised connection. |
| D23 | Reactive shipped backgrounds. | At least one location in each region has normal-asset motion and a visible state change. |
| D24 | Operational room fixtures. | Important equipment communicates powered, inactive, damaged, and recovering states. |
| D25 | Physical departure/arrival. | The switch and grip make the hop intelligible; the transition does not suggest free flight. |
| D26 | Refit materiality. | Adding a car visibly attaches and powers a physical part of the same tender. |
| D27 | High-impact intent and hail readability. | Critical information remains readable while paused and identifies meaningful counterplay. |
| D28 | Human outcome clarity. | Surrender, survival, and fatal loss receive accurate presentation and statistics. |
| D29 | Crew event casting. | Participant, body, knowledge, pronouns, and applied consequence agree. |
| D30 | Commitment record. | The player can recall what they accepted, where to pursue it, and whether it remains possible. |
| D31 | Important follow-up opportunity. | A committed story has a credible chance to continue, with an explicit missed/unfinished state. |
| D32 | World response to a choice. | Several meaningful decisions alter an observable place, sound, person, or object. |
| D33 | Reduced motion and critical cue redundancy. | Required information survives low motion, muted audio, and non-color reading. |
| D34 | Readability at normal desktop sizes. | Unfamiliar players can read urgent status and target systems without constant zoom or guessing icons. |
| D35 | Safe-stop audiovisual identity. | A bench changes practical behavior and the sensory rhythm of the voyage. |
| D59 | Direct combat entry without a story-choice gate. | Selected encounters begin as committed fights, respect tactical pause, and require no preliminary dialogue decision. |
| D60 | Fully autonomous robotic vessel identity. | At least one vessel has no crew or walking escort units; its layout, repair behavior, vulnerabilities, and defeat are visibly mechanical. |
| D61 | Active detection and interception. | A hunter visibly acquires an unknown signal and acts on it; local patrol/pursuit behavior has understandable, bounded consequences. |
| D62 | Sustained danger between refuges. | Forced fights, attrition, route closure, and costly escape produce pressure without punishing reading. Review compounded losses and escape routes; occasional defeats through bad luck remain possible under section 7.7. |
| D63 | Stage length and ordinary-fight density. | Test the proposed region-specific visit/fight ranges; measure traveled routes rather than total chart nodes, and preserve useful combat time for new upgrades. |
| D64 | Progression budget for a longer, more combative voyage. | Routine damage, supplies, healing, income, upgrade access, guardian difficulty, and Seal allowance support the revised pacing without removing attrition. |
| D50 | Three selectable starting tenders. | Lamplighter, a laser-focused start without payloads, and a drone-focused start each have a usable loadout, visible working identity, clear tradeoffs, and viable early progression. |
| D65 | Tender purpose and armament explained in play. | Before the first serious fight, the player understands the original maintenance/rescue job and why tools were adapted or supplemented for this dangerous voyage. |
| D66 | Selected-vessel narrative continuity. | Each tender has an appropriate nameplate, dock history, opening, event references, and persistent identity; L-12's specific history remains its own. |
| D68 | Shield interaction and guardian-defense presentation. | Projectile contact, blocked/bypassing/missed attacks, collapse, recharge, and special barriers communicate the actual rule without obscuring the battle. |
| D70 | A viable unshielded starting tender. | One of the initial profiles lacks a Shield Array, has a tested alternative defense, and can pursue an explicit priced installation later without it being a mandatory first-shop fix. |
| D71 | Upgrade and installation prices matched to actual income. | Early readiness remains achievable, advanced upgrades require saving, and longer routes do not erase the choice between systems, equipment, and operating reserves. |
| D72 | Genuinely adverse events and costly good intentions. | Representative encounters impose a lasting net cost without requiring a bad decision; not every event offers a harmless exit, profitable answer, or compensating reward. |
| D73 | Contextual chance and capability effects. | Weighted failures can follow sensible choices; relevant preparation has a concrete effect, explicit guarantees remain true, and the aftermath explains what happened. |
| D74 | Event losses within the voyage budget. | All three starts are evaluated with repeated adverse outcomes, operating reserves, longer routes, and higher upgrade costs; luck can hurt or defeat the crew without making every strategy equivalent. |

### P2 — deepen the voyage after the slice works

| ID | Gap | Completion criterion |
| --- | --- | --- |
| D36 | Regional route families. | Copper, Glass, and Heart create recognizable but variable planning problems. |
| D37 | Event pacing control. | Long accidental streaks of dense prose or similar fights are limited without making the voyage predictable. |
| D38 | Wider objective coverage. | A curated portion of the existing events uses the proven scenario vocabulary. |
| D39 | Wider enemy mechanical animation. | Each recurring silhouette has a recognizable working action and ending. |
| D40 | Small crew personal arcs. | Starting volunteers gain reasons, memories, and a few specific reactions. |
| D41 | Loss continuity. | A lost crew member leaves a restrained trace beyond a numerical roster change. |
| D42 | Both Kittiwake resolutions and selected flags acknowledged. | Important interpretations receive fitting callbacks without a moral scoreboard. |
| D43 | Information specialization consistency. | Upgrades and modules have clearly described effects in combat and encounters. |
| D44 | Layout and staffing previews. | Refit decisions reveal travel, capacity, power, and staffing consequences. |
| D45 | Soundscape by machine and place. | Operating rhythm, danger, and release are recognizable by sound without masking the music. |
| D46 | Ambient crew activity. | The tender feels inhabited during safe time without adding chores. |
| D47 | Text and control options. | Text reveal/readability and important input behavior accommodate a wider range of players. |
| D48 | Exact suspension or clearly taught checkpoint behavior. | Resuming is predictable and compatible with long sessions. |
| D49 | Strategy-level economy comparisons. | Several preparation styles are viable and large incentive traps are understood. |
| D51 | More specific defeat/ending selection. | The final reflection corresponds to the actual voyage and avoids exhausting every callback. |
| D52 | Consistent replay chronology. | Repeated runs do not accidentally contradict the unique vessel and named-character history. |

### P3 — optional expansion

| ID | Candidate | Condition before adding it |
| --- | --- | --- |
| D53 | More event volume. | Existing events have sufficient pacing distinction, consequence, and coverage. |
| D54 | More weapons and cars beyond the three requested starts. | Each adds a supported play style rather than a slightly different number. |
| D55 | More elaborate cinematic scenes. | They improve an important beat without slowing routine play. |
| D56 | Full portrait animation or voice work. | It fits the restrained tone and does not displace physical world feedback. |
| D57 | Additional challenge modes. | The normal campaign's learning curve and viable preparations are understood. |
| D58 | More collectible lore. | It deepens optional interpretation instead of repairing an unclear main objective. |

## 20. Recommended order of work

### Pass 1: decide the rules the rest depends on

Resolve D01–D08, the shield-state presentation in D67, and the spending target in D69 as concrete design decisions. Some will require small behavioral changes later; others require clearer writing or presentation. Document the adopted travel model, safe recovery, maintenance allocation, and final objective in one place. Treat the requested three-tender selection as the new scope for starting-vessel design, including different starting defenses and an explicitly unshielded profile.

Do not commission many new cut scenes of severed carriers before deciding how those carriers relate to the final connection. Do not redesign the whole economy before deciding what a resolved relay means.

### Pass 2: make one short stretch prove the identity

Build a representative Copper stretch using existing content:

> Relay Seven departure → manageable direct robotic interception → quiet relay → consequential choice → safe bench → distinctive machine confrontation → release and visible aftermath.

Include one meaningful refit or equipment decision if the segment can support it. The stretch should demonstrate a physical hop, understandable costs, an encounter whose premise changes play, a world response, useful safe recovery, and a crew member the player can recall.

The interception must demonstrate D59–D62 as well: the robot finds the tender, combat begins without an event-choice gate, the vessel visibly has no crew, and survival requires meaningful tactical decisions under a credible threat. Good play may prevent damage in that battle; do not append a scripted injury that contradicts its result. Separately include an adverse event and an uncertain choice from D72–D74, with fixed outcome cases available for evaluation. These demonstrate that some losses happen despite sensible decisions and still affect the next route or purchase.

This is the right place to test whether duty-ending gameplay adds value. If players experience it as an extra chore after a standard fight, simplify or revise it before spreading it across the campaign.

Use this same stretch to compare all three starting tenders, including the proposed unshielded profile. Explain their old working roles during selection/departure and show the weapon adaptations in action. Finish shield-state readability before judging the laser or drone start's feedback. Prove that the drone tender can deploy its supplied equipment immediately and that both new starts have a practical response when defenses, power, or supplies constrain their preferred approach. Check that the first several purchases present real alternatives rather than one compulsory correction to the starting loadout.

### Pass 3: prove regional and guardian contrast

Build one Glass and one Heart encounter around the same proven vocabulary, then refine the three guardians. Show that the regions ask different questions and that the final interaction pays off the early greeting.

Use existing guardian text selectively. A complete causal sequence is more valuable than displaying every authored line.

Evaluate the stage-length and fight-density targets in section 6.5 before adding new regions. First establish the desired combat share, then test the benefit of a longer route and a midpoint within the existing geography. Apply D63–D64 together so extra fights do not become an unbudgeted damage tax or extra stops an unlimited upgrade subsidy.

### Pass 4: edit and extend the existing content

Assign events to narrative tiers; shorten routine presentation; connect important promises; remove misleading mechanical claims; add a small number of crew-specific reactions. Also classify each event's possible net benefit and loss, which outcomes are fixed or random, and what relevant expertise actually changes. Add or revise adverse encounters where the existing choices always offer a harmless escape, preserving some genuine safe stops. Expand objective variety only where it earns its complexity.

### Pass 5: finish presentation and validate the full rhythm

Extend background states, enemy mechanisms, soundscapes, accessibility, and session usability. Evaluate a whole voyage with human players. At that point, decide whether there is a real need for more content volume or whether existing material simply needs better distribution.

No calendar estimates are attached here. A new objective, a travel-rule correction, a layered guardian animation, and a wording clarification have very different costs. The order reflects dependencies, not equal-sized tasks.

## 21. How to tell whether these changes actually help

Automated simulation is useful for affordability, reachability, and strategy comparisons. It cannot establish whether a person cares about a volunteer, understands a guardian, or feels that a quiet stop was worth visiting.

Use small human playtests with three perspectives: someone comfortable with FTL, someone who enjoys narrative games but knows little FTL, and someone unfamiliar with both. Observe before explaining.

| Question | What to observe | A useful success signal |
| --- | --- | --- |
| What is the crew trying to accomplish? | Ask after the opening, before correcting terminology. | They describe delivery/connection and preservation, not simply killing three bosses. |
| Why is a cable tender here, and why does it have weapons? | Ask after selection and departure without opening the codex. | They describe outside maintenance/rescue work and the adaptation needed to survive untrusted-signal enforcement. |
| Are the three starts meaningfully different? | Let players select and explain an opening plan, then play comparable early encounters. | They understand laser timing, payload expenditure, and drone deployment as different decisions, and can name each start's limitation. |
| Are shields readable? | Observe depletion, an absorbed laser, a bypassing payload, recharge, and a special guardian barrier. | They correctly identify protection, exposure, capacity loss, and the reason each attack did or did not reach the hull. |
| Is the unshielded start a real alternative? | Observe common early threats and the first installation opportunity. | Players can use its alternate defense and can explain a credible reason to buy or defer a Shield Array. |
| Do purchases remain meaningful near the ending? | Ask what useful equipment/upgrades the player passed up and inspect the final build. | The player identifies deliberate sacrifices; success does not routinely mean buying everything relevant. |
| How does travel work? | Ask them to predict a hop, zero TTL, retreat, and the next Seal step. | Their predictions match the actual result. |
| Why is this machine dangerous? | Let them watch one attack preparation. | They connect its duty to a specific threat and a plausible response. |
| Can a fight begin without a dialogue decision? | Observe the first autonomous interception without explaining it in advance. | They recognize that they have been targeted and issue tactical orders rather than search for an event-choice window. |
| Does a robotic vessel feel crewless? | Ask what controls it and what damage would stop it. | They identify machinery and relevant vulnerabilities, rather than assuming an invisible human crew. |
| Is the voyage threatening? | Observe a stretch between refuges, including a retreat. | They adapt to damage and route pressure, can identify the cause of danger, and feel relief at reaching service. |
| Does each stage contain enough useful combat? | Record visited relays, ordinary fights, guardian attempts, and uses of newly acquired equipment. | The build receives several varied tests before its guardian; longer travel adds meaningful play rather than repeated prose or inflated enemy health. |
| Does the encounter premise matter? | Compare a standard fight and one objective variant. | They make a different tactical decision because of the situation. |
| Can the player read the battle? | Observe at 1366 and 1920 widths, including an expanded tender. | Critical status and targets are understood without repeated searching. |
| Is pausing safe and useful? | Watch reading, target inspection, and crew orders. | They can plan without text disappearing or implied route-time pressure. |
| Do they understand blue options? | Ask for the expected downside before selection. | They identify capability separately from certainty. |
| Can a reasonable choice end badly? | Observe a failed plausible action without explaining the outcome in advance. | The player understands the cause afterward and distinguishes an unlucky outcome from a broken promise in the interface. |
| Do bad events leave a real loss? | Follow the consequence through departure, the next fight, and the next purchase; include relay payouts. | Damage, lost supplies, injury, or route pressure remains relevant, and some events have no compensating gain. |
| Does preparation matter under bad luck? | Compare the three starts, different reserves, and repeated adverse outcomes. | Preparation improves survival or limits losses; helping, declining, and taking risks remain contextual choices rather than one universal winning policy. |
| Are quiet stops valuable? | Watch whether they inspect, listen, or simply click to escape a modal. | They remember a detail without feeling repeatedly interrupted. |
| Do crew feel like people? | Ask who they would most regret losing and why. | At least one answer refers to a remembered action or motive, not only repair speed. |
| Does care work at a safe stop? | Give them an injured crew member and a bench/infirmary. | They can recover or understand the tradeoff without fighting the interface. |
| Are guardian tests distinct? | Ask for an explanation after each fight. | Their answer differs in actions and ideas, not merely number of shots. |
| Does victory fit the lore? | Ask what happened to the Core and archive. | They understand that isolation ended and messages survived. |

For pacing, measure the share of a sample session spent making decisions, managing live situations, reading new material, and acknowledging already-understood results. Count repeated confirmation gates. The goal is not “less reading” in the abstract; it is more attention spent on meaningful material.

For balance, retain the existing deterministic baselines and compare deliberate policies. For presentation, test the normal asset-loaded game, muted audio, reduced motion, and real pause/resume. For story, inspect whether a promise can be accepted and then become silently impossible through random scheduling.

Do not use a single target win percentage as a substitute for these questions. A difficult loss can be satisfying when the player understands what happened, what preparation could have helped, and what remained outside their control. Do not assume every defeat proves that the player chose incorrectly.

## 22. Things this game does not currently need

- Another hundred events before the current ones have clearer pacing and consequences.
- A moral alignment bar to tell the player whether a compassionate interpretation was correct.
- Permanent stat grinding as the primary replay incentive.
- A mandatory minigame after every combat victory.
- A pre-combat dialogue choice or a peaceful bypass for every hostile encounter.
- A bespoke story explanation for every recurring patrol.
- A full crew hunger, hygiene, romance, and mood simulation.
- A completely separate deck/network game inside each guardian battle.
- Full voice acting before the world visibly responds to actions.
- More particle effects used as a substitute for operating machinery.
- A general renderer or UI rewrite just to add motion.
- A newly invented villain or a definitive explanation for the First Shift.
- Every quiet encounter becoming a trap.
- A final surprise failure after the player has already earned the delivery.

The strongest next version would keep the present tactical depth and substantial writing, while making a smaller number of situations more physically credible, more distinct to play, and more responsive to the crew's decisions.

## 23. Evidence and source map

Paths below identify the material behind the findings. They are inspection references, not requests to implement every proposal in those files. Counts and behavior describe the snapshot examined on the date above.

| Topic | Main sources |
| --- | --- |
| Original canon, mysteries, guardian meanings, ending | [FAULTLINE lore](../../faultline/docs/lore.md) |
| Tender, carrier, TTL, Seal, crew, enemy duties | [TIME TO LIVE lore](lore.md) |
| Original and superseding design directions | [Contract](contract.md) |
| Existing delivered scope and its limits | [Objective audit](objective-audit.md), [alpha validation](alpha-validation.md) |
| Campaign sequence, aftermath, retreat bridge | [Voyage](../src/campaign/voyage.ts), [session presentation](../src/screens/session.ts), [victory screen](../src/screens/victory.ts) |
| TTL, stores, stage transition, map knowledge | [Run lifecycle](../src/campaign/run.ts), [map generation](../src/campaign/map.ts), [chart](../src/screens/map.ts) |
| Event requirements, substitutions, consequences | [Event resolution](../src/campaign/events.ts), [game types](../src/game/types.ts) |
| Existing weighted failures, hazardous choices, and outcome presentation | [Copper relay encounters](../src/content/events/stage1-relays.ts), [event window](../src/screens/event.ts) |
| Event counts and narrative pools | [Event deck index](../src/content/events/index.ts) and its eight imported decks |
| Promises and callbacks | [Story chains](../src/content/events/chains.ts), [script](../src/content/script.ts), [Runbook](../src/screens/runbook.ts) |
| Crew, starting ship, cars and modules | [Ship](../src/data/ship.ts), [crew traits](../src/data/species.ts), [cars](../src/data/cars.ts), [consist](../src/data/consist.ts) |
| Proposed starting loadouts and existing tool origins | [Weapons](../src/data/weapons.ts), [drones](../src/data/drones.ts), [equipment flavor](../src/content/flavor.ts), [current new-voyage screen](../src/screens/newvoyage.ts) |
| Combat retreat, outcomes, repair persistence | [Combat simulator](../src/combat/sim/sim.ts) |
| Medical behavior and safe movement | [Crew simulation](../src/combat/sim/crew.ts), [dockside control](../src/combat/deck.ts) |
| Helm, sensor strength, power and evasion | [Power simulation](../src/combat/sim/power.ts), [combat simulator](../src/combat/sim/sim.ts) |
| Boss rules, boarding, phase behavior | [Enemy simulation](../src/combat/sim/ai.ts), [enemy definitions](../src/data/enemies.ts) |
| Existing visual effects, hails, backdrop and victory | [Combat scene](../src/combat/scene.ts), [ship drawing](../src/combat/draw-ship.ts), [effects](../src/combat/fx.ts) |
| Current shield field, layer indicators, and hit feedback | [Ward-mesh drawing](../src/combat/draw-ship.ts), [combat HUD](../src/combat/hud.ts), [combat scene](../src/combat/scene.ts) |
| Shipped props versus fallback machinery | [Room art](../src/combat/room-art.ts), [room details](../src/combat/room-detail.ts) |
| Environmental presentation and narrative staging | [Backdrop](../src/screens/backdrop.ts), [relay](../src/screens/relay.ts), [story scene](../src/screens/script.ts) |
| Refit, equipment, onboarding and options | [Yard](../src/screens/yard.ts), [ship screen](../src/screens/ship.ts), [Field Guide](../src/screens/guide.ts), [settings](../src/screens/settings.ts) |
| Persistence and replay knowledge | [Savegame](../src/campaign/savegame.ts), [persistence](../src/campaign/persist.ts), [meta](../src/campaign/meta.ts), [new voyage](../src/screens/newvoyage.ts) |
| Existing economy and combat measurements | [Campaign balance](balance-campaign.md), [combat balance](balance-combat.md) |
| Upgrade prices, installations, and operating costs | [Systems](../src/data/systems.ts), [upgrades](../src/campaign/upgrades.ts), [store](../src/campaign/store.ts), [catalog mapping](../src/campaign/catalog.ts) |

Primary FTL references are linked beside the claims they support in section 5. The enemy treatments, narrative tiers, new objectives, proposed route families, and prioritization in this document are design judgments, not assertions that those features already exist or that they are established FAULTLINE canon.
