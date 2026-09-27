// The Runbook: the in-game codex (contract §3, writing deliverable 4).
// unlock "start": open from the first voyage · "outcome": unlocked by an event outcome's `codex` field ·
// "enemy:<id>": unlocked the first time that machine is met.
// Comments name the event deck that unlocks each "outcome" entry (every one is referenced at least once).
import type { CodexEntry } from "../game/types.ts";

export const CODEX: CodexEntry[] = [
  // ─── World ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "world-line", category: "world", title: "The Line", unlock: "start", art: "bg/title",
    text: "A ring of relay halls, switching cathedrals, docks and archives circling the world just above the air, held up on spires that rise out of the cloud sea. The wardens' manuals call it the backbone. From the Ground on a clear night it is a thin arc of lights from one horizon to the other. Nobody alive knows who built it. The people who lived on it kept it running from a book, and made a life out of the work.",
  },
  {
    id: "world-faultline", category: "world", title: "The Faultline", unlock: "start",
    text: "Thirty-one years ago the outer relays broke. The break still shows from anywhere on the ring: a stretch of dark in the arc of lights. From the Ground the Line looks like a string of lamps with a gap in it. People below call the gap the Faultline, and so do the linefolk, now.",
  },
  {
    id: "world-ground", category: "world", title: "The Ground", unlock: "start", art: "events/radio-mast-ground",
    text: "Below the cloud floor is the world itself. About three hundred thousand people went down the spires in one night, into a place their people had not lived on for longer than memory. They lived. It is wet and green and dark down there, and it rains. They built houses out of lift cars and radio masts out of lift parts, and they called up, and nobody answered.",
  },
  {
    id: "world-night-of-fault", category: "world", title: "The Night of the Fault", unlock: "start",
    text: "Hour 0: the outer relays break. Hour 1: the wardens order the Line emptied down the spires. Hours 1 to 5: every goodbye is marked must arrive. Hours 2 to 9: the return routes send the undeliverable home, and home sends it out again, and it becomes a storm. Hour 10: the storm reaches the Heart. Hour 11: the quarantine order. The last shuttle leaves before dawn. None of the cars ever come back up.",
  },
  {
    id: "world-null-storm", category: "world", title: "The Null Storm", unlock: "outcome", // s1 signals
    text: "Must-arrive messages could not be dropped and could not age out. With the outer relays gone, the return routes sent each one home to try again, and each retry bred more retries. By the ninth hour the circling traffic was louder than anything else on the Line. What is left of it still goes round in places: retries of messages nobody is sending any more. A message that cannot die becomes a storm.",
  },
  {
    id: "world-quarantine", category: "world", title: "The Quarantine Order", unlock: "outcome", // s3 signals
    text: "Close the backbone. Hold all deliveries. Release nothing until a safe route is confirmed. Written in the eleventh hour by Warden-Commander Harrow, signed and I am sorry. The Heart obeyed. Its machines cut every route the storm could use, including the one the wardens needed to call the order off. The order has never been lifted, because nobody has been able to reach the room it would be lifted from.",
  },
  {
    id: "world-record", category: "world", title: "The Record", unlock: "outcome", // s3 relays
    text: "The Heart's archive: every message sent on the Line since Shift One, and the name of everyone ever born on it. When a child was born, the parents sent one message to the Record, a name and a line of hope. The storm began to overwrite it in the tenth hour. The quarantine saved it. It is still in there, warm, behind the shell.",
  },
  {
    id: "world-first-shift", category: "world", title: "Shift One", unlock: "outcome", // s2 signals
    text: "The Runbook's oldest pages are signed with shift numbers, not names, and the earliest is Shift One. So the builders are called the First Shift, because that is the only name they left. The engraved plates show small hooded figures laying cable and raising spires, drawn with the same care as the diagrams around them. Whether the linefolk are their children or their guests, nobody knows.",
  },
  {
    id: "world-upstream", category: "world", title: "Upstream and the Last Resort", unlock: "outcome", // s1 relays
    text: "Every route table on the Line ends with the same entry: whatever you do not know how to reach, send outward. The linefolk call it the Last Resort. It ended at the outer relays, great ring gates facing away from the world. The Runbook calls whatever lies out there upstream. Nothing upstream ever answered. The wardens' log says the outer relays were broken by debris. The bellmakers say something else. The Runbook does not say.",
  },
  {
    id: "world-handover", category: "world", title: "Handover", unlock: "outcome", // chains
    text: "The Runbook's last procedure is titled Handover. The page has no steps. Every copy the linefolk made by hand has the same blank page, copied faithfully, with a margin note in some of them: not yet.",
  },
  {
    id: "world-cloud-floor", category: "world", title: "The Cloud Floor", unlock: "outcome", // s2 relays
    text: "A permanent cloud sea under the Line. The oldest page of the Runbook anyone could still read said do not route below the cloud floor until the ground reports ready. Nobody knew what it meant, so they obeyed it, for as long as anyone remembered. Then one night everyone went below it at once.",
  },
  {
    id: "world-heartbeat", category: "world", title: "The Heartbeat", unlock: "outcome", // s2 signals
    text: "Once an hour the Heart sent a pulse around the Line, and the Glass Cathedral rang one bell to match. Children counted it. Lovers timed things by it. When it stopped, everyone knew something had gone wrong. Out on the dark relays some automatic lamps still blink it, on their own, to nobody.",
  },

  // ─── People ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "people-operator", category: "people", title: "The Operator", unlock: "start", art: "portraits/operator",
    text: "An old woman who has run the Relay Seven switchboard since before the Fault. The Night Shift call her the Operator and nothing else; if she has another name, it is in the Record. She answers every page the same way: she lifts the headset, looks at whoever is in the room, and asks, Who'll take it. She stamps every connection with a time to live. She was on the evacuation desk the night of the Fault. She says very little.",
  },
  {
    id: "people-night-shift", category: "people", title: "The Night Shift", unlock: "start",
    text: "The few hundred who did not go down: wardens who would not leave the gate, engineers who would not leave their machines, people too old or too stubborn, people who missed the last lift or were waiting for a message that never came. Fewer every year. They live around the last working lamps and answer the page when it comes. Leave the lamp on for the next shift, they say, and mean it.",
  },
  {
    id: "people-keeper", category: "people", title: "Whoever Answers", unlock: "start",
    text: "The first Night Shift argued for a long time about the KEEPER label on the Relay Seven board. A person, an office, a bloodline from Shift One. They settled it by what works: whoever answers the page becomes the keeper. This time a whole crew stood up at once. So the crew is the keeper, together, and nobody has to be anything more than they are.",
  },
  {
    id: "people-pell", category: "people", title: "Pell", unlock: "outcome", art: "portraits/pell", // s1 relays (market)
    text: "Keeps the biggest stall at the Copper Market. Sixties, a ledger for everything, a sense of humour like a crimper. Before the Fault she was the tally clerk at Dock Twelve and counted people onto the lifts all night, car by car. She did not count herself. She says she lost count. She sold the Night Shift the trolley grip that got the Lamplighter riding again, and she is still owed for part of it. Her sign reads: FAIR PRICES · NO LENDING.",
  },
  {
    id: "people-varga", category: "people", title: "A. Varga", unlock: "outcome", // s1 relays
    text: "Cable crew, the Reach, before the Fault. Went down on the lifts. Left a message in the queue that leaves the good crimper to Hobb Tallis and adds, don't lend it to Pell. The crimper is famous now, mostly for where it ended up. People who knew Varga say the message was a joke. People who know Pell say it was advice.",
  },
  {
    id: "people-hobb", category: "people", title: "Hobb Tallis, Bench Nine", unlock: "outcome", art: "portraits/bench-keeper", // s1 relays (bench)
    text: "Keeps Bench Nine in the Reach. Cable crew for fifty years, bench keeper for thirty. Talks to his kettle, which he says is a better listener than most. Re-stamps a connection with a dock-office press he keeps oiled. Has not got over the crimper and will tell you about it, whether or not you ask.",
  },
  {
    id: "people-marit", category: "people", title: "Marit Seldon, the Choir Bench", unlock: "outcome", art: "portraits/bellmaker", // s2 relays (bench)
    text: "A bellmaker who stayed in the Cathedral. She keeps the Choir Bench under the north nave, where the glass rings when anyone passes. She can tell which pane is ringing by ear and which of your systems is running rough by the hum of the car. She makes tea that tastes faintly of glass. She does not talk about the north bell.",
  },
  {
    id: "people-ennis", category: "people", title: "Ennis Rook, the Last Bench", unlock: "outcome", art: "portraits/ennis", // s3 relays (bench)
    text: "Keeps the last bench before the Heart. A warden; on the night of the order he was a runner on Harrow's crew, sixteen and fast. He does not say much about that night. He keeps the bench's lamp trimmed and its drawer full, and he writes down every tender that goes by, with the time. His list is long. He reads it every night.",
  },
  {
    id: "people-harrow", category: "people", title: "Warden-Commander Harrow", unlock: "outcome", art: "portraits/warden-memory", // s3 signals
    text: "I. Harrow, Warden-Commander, wrote the quarantine order in the eleventh hour and signed it and I am sorry. Her crew executed it. The last switch was at the end of a conduit too narrow for a grown warden in armour, so the youngest cadet threw it. Harrow's post is still there on the inner side, with its kettle on the shelf. The last line of her log says to take a cup before you go on.",
  },
  {
    id: "people-moss", category: "people", title: "Moss Adair and the Second Helping", unlock: "outcome", art: "portraits/moss", // chains
    text: "The Second Helping is a scavenger skiff made of three other cars on one trolley, captained by Moss Adair, who stayed up when his sister went down, and crewed by the Dunmore brothers, who agree about nothing except Moss. They strip the Reach for the Copper Market. They are not pirates. They are hungry, and they remember who spared them.",
  },
  {
    id: "people-courier", category: "people", title: "The Courier Who Went Furthest", unlock: "outcome", // chains
    text: "The Copper Market remembers a courier who answered the page alone and got as far as the Glass Cathedral. Nobody remembers the courier's name. Pell remembers the tender, the Kittiwake, and that the courier paid in full. The logbook is signed with a small drawn lamp.",
  },
  {
    id: "people-corran", category: "people", title: "Ilse Corran", unlock: "outcome", // shared
    text: "Tender chief of the Lamplighter for forty-one years. On the Night of the Fault she ran eleven trips down the carriers to the broken outer relays, taking crews off platforms that were venting air. On the last trip the air plant was failing and there were nine people in a hold built for four. Then she docked at Dock Twelve, set the brake, scratched her last tally, and the harbour master put her on the last shuttle.",
  },
  {
    id: "people-evening-caller", category: "people", title: "Unknown Sender, Priority Low", unlock: "outcome", art: "portraits/teal-jacket", // chains
    text: "Every evening at the same time, on an old lift-band frequency, a woman's voice comes up from the Ground. She asks whether anyone is still on the frequency. Sometimes she says what the weather did, or what came up in the garden. She says she will try again tomorrow at the same time. The queue marks her calls unknown sender, priority low. There are a great many of them.",
  },
  {
    id: "people-scavengers", category: "people", title: "Scavengers", unlock: "outcome", art: "events/scavenger-skiff-hail", // s1 signals
    text: "Night Shift crews in salvaged cable cars they call skiffs, dead cars welded together on whatever trolley still works, who strip the Reach for the Copper Market. They need parts more than they can afford to be kind. They will try to take what comes off easy, and when a fight goes badly they surrender. Accepting is always an option. Most of them have been doing this for thirty years, and all of them know what it is to be owed.",
  },
  {
    id: "people-sleepers", category: "people", title: "Cold Berths", unlock: "outcome", art: "events/cold-berths", // shared
    text: "On the Night of the Fault some people could not be moved: the injured, the very sick, a few who were in the middle of something that could not be stopped. The medical crews put them in cold berths to wait for the lifts to come back up. Most berths failed long ago. A few did not. The people in them went to sleep thirty-one years ago, and wake asking about the lifts.",
  },
  {
    id: "people-linefolk", category: "people", title: "Linefolk", unlock: "start",
    text: "The people of the Line. They lived on shifts, not days; greeted each other in three lines; sent a first packet to the Record when a child was born; ended letters with a request to acknowledge. An unanswered message was the saddest thing they knew. The ones who stayed learned every job there is, because for thirty-one years there has been nobody else to do it.",
  },
  {
    id: "people-wardens", category: "people", title: "Wardens", unlock: "start",
    text: "Wardens held the boundaries: firewalls, quarantines, checkpoints, and the Heart's keys. Their crews trained from sixteen. A few of Harrow's gate crews would not leave the gate, and they trained others, as the order says. They are slow and hard to burn and harder to stop, and most of them still believe the order was right.",
  },
  {
    id: "people-riggers", category: "people", title: "Riggers", unlock: "start", art: "portraits/recruit-rigger-a",
    text: "When a machine's task ends, its escort automatons power down. An escort wiped back to its first page will trust the first voice that greets it properly. The Night Shift have been re-keying escorts that way for years and giving them designations: a serial and a bird, Rigger 7-Tern, Rigger 2-Wren. Riggers do not breathe, mend anything twice as fast as a person, and remember nothing from before, except sometimes a route.",
  },
  {
    id: "people-couriers", category: "people", title: "Couriers", unlock: "start", art: "portraits/recruit-courier-a",
    text: "Before the Fault, couriers carried what the Line could not: signed papers, keys, parcels, an apology in person. The Night Shift's couriers still run messages by hand between the last lamps, along the gantries and hand over hand down the carriers, because somebody should. They are fast on their feet and faster at a helm, and they always know where the good kettles are.",
  },
  {
    id: "people-bellmakers", category: "people", title: "Bellmakers", unlock: "outcome", art: "portraits/bellmaker", // s2 signals
    text: "Bellmakers tuned the Glass Cathedral. Every bell rang for a band of traffic, and a good bellmaker could hear a failing route before any instrument showed it. A handful stayed in the choir loft after the Fault and have spent thirty-one years tuning bells nobody else hears. A bellmaker can sit in a room of your car and listen until the system there runs sweeter. They only come if they choose to.",
  },

  // ─── Places ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "places-relay-seven", category: "places", title: "Relay Seven", unlock: "start", art: "bg/relay-seven",
    text: "The switchboard room where automatic routing met human judgment. In an emergency the board could route the Line by hand. On the Night of the Fault it was the evacuation desk: one board, one operator. Now it is where the Night Shift gather, where the KEEPER lamp blinks once a day, and where the Operator sits with the headset.",
  },
  {
    id: "places-reach-docks", category: "places", title: "The Reach Docks", unlock: "start",
    text: "Where the cable tenders were built and berthed: forty-one cars over four hundred years, all to the lamplighter pattern, hung from the dock gantries by their trolleys. The docks are dark now except Dock Twelve, where the Night Shift keep one gantry lamp on. The harbour master's last message is still in the queue: your berth is open for the return trip.",
  },
  {
    id: "places-copper-reach", category: "places", title: "The Copper Reach", unlock: "start", art: "bg/s1-a",
    text: "The outer sector nearest the break: docks, foundries, freight gates, relay yards and a thousand kilometres of copper cable gone green and orange. Its crews were proud and rough and the first to go down. From the carriers it is a continent of rust hung at the edge of the sky, with cranes that still swing and leeches that still gather.",
  },
  {
    id: "places-copper-market", category: "places", title: "The Copper Market", unlock: "outcome", art: "events/copper-market", // s1 relays (market)
    text: "A stack of shipping containers on a Reach spire top, welded into a tower and strung with salvaged relay lamps, with stalls on every landing and a crane the market uses as a lift. Three carriers meet at the relay below it, and scavenger cars hang off its gantries like washing. The Night Shift trade here in salvage: cable, lenses, spares, stamps, and parts of machines whose tasks have ended. It is the loudest place left on the Line, which is not saying much.",
  },
  {
    id: "places-sorting-office", category: "places", title: "The Reach Sorting Office", unlock: "outcome", art: "events/sorting-office", // chains
    text: "Where parcels too big for the wire waited for collection. Pigeonholes to the ceiling, brass tickets, a counter polished by two hundred years of elbows. The clocks stopped at hour one. The parcels are still in their holes, each with a ticket, each held for collection.",
  },
  {
    id: "places-lift-heads", category: "places", title: "Lift Heads", unlock: "outcome", art: "events/lift-head", // s1 signals
    text: "The top stations of the spire lifts: freight gates, loading cages, departure boards. On the Night of the Fault the lifts ran all night, thousands of lit windows going down into the cloud sea. The boards still show the last departures. The cages hang where they stopped, because the machines at the spire feet no longer know anyone.",
  },
  {
    id: "places-foundries", category: "places", title: "The Reach Foundries", unlock: "outcome", art: "events/foundry-mouth", // s1 relays
    text: "The smelters that made the Line's copper and iron. Most were doused on the Night of the Fault. Foundry Three was banked instead, and it still glows dull red after thirty-one years, because its crew thought it would be a waste. A Ferric Colossus still guards the furnace mouth.",
  },
  {
    id: "places-outer-relays", category: "places", title: "The Outer Relays", unlock: "outcome", art: "events/debris-field", // s1 relays
    text: "Great ring gates at the edge of the Reach, facing away from the world, where the Last Resort sent whatever could not be delivered. They broke at hour zero. From the carriers they are broken teeth against the stars, and the wreckage of that night still hangs snagged in the cables around them, swinging and ticking, glittering.",
  },
  {
    id: "places-copper-gate", category: "places", title: "The Copper Gate", unlock: "outcome", art: "events/copper-gate", // s1 relays (exit)
    text: "The gate between the Reach and the inner Line: two gate wings the height of a spire top, closed across every carrier, and built into the gap between them, the Iron Regent. The gate and the Regent are the same machine. Everything that wanted to reach the inner Line from outside had to pass through it and prove it had a second way home.",
  },
  {
    id: "places-glass-cathedral", category: "places", title: "The Glass Cathedral", unlock: "outcome", art: "events/cathedral-nave", // s1 relays (exit aftermath)
    text: "The Line's great optical switching hall, laid along the ring for hundreds of kilometres in violet glass, so large it has its own weather. Light crossing its circuits makes the panes ring, so the hall sang whenever traffic passed. The linefolk built their bells, choirs and weddings around that sound. It still sings, faintly, when a tender's lamp crosses it.",
  },
  {
    id: "places-choir-loft", category: "places", title: "The Choir Loft", unlock: "outcome", art: "events/choir-loft", // s2 signals
    text: "High in the north nave, where the choir rehearsed on Thursdays and the bellmakers kept their forks. The loft lamp is still on. The bells are in their frames. Somebody wound the clock, and keeps winding it.",
  },
  {
    id: "places-blackout-heart", category: "places", title: "The Blackout Heart", unlock: "outcome", art: "events/ember-archive", // s2 relays (exit aftermath)
    text: "The archive: a sphere of machinery built around the ring like a cathedral turned inside out, galleries within galleries, shelving stacks the size of spires. Before the Fault it was simply the Heart, and its pulse set the Line's clock. It burns ember red now because it is spending its reserves to keep the Record and the queue alive.",
  },
  {
    id: "places-bench-four", category: "places", title: "Bench Four", unlock: "outcome", art: "events/wardens-post", // s3 relays (bench)
    text: "Warden-Commander Harrow's post, on the inner side of the quarantine. The Night Shift call it Bench Four. The kettle is still on the shelf. Harrow's log is still open at its last line: Kettle's on the shelf. Whoever finds this, take a cup before you go on. People do. Nobody takes the kettle. Mostly.",
  },
  {
    id: "places-shell", category: "places", title: "The Shell", unlock: "outcome", art: "events/heart-shell", // s3 relays
    text: "Concentric iris plates the Core closed around itself in the eleventh hour, and has kept closed since. Through its seams the queue glows like a field of small lights. Once a day the Core tries to deliver it and fails. Once a day, a signal too small to carry any message leaves the shell and lights a lamp at Relay Seven.",
  },
  {
    id: "places-benches", category: "places", title: "The Benches", unlock: "start", art: "events/relay-bench",
    text: "A lamp left on. Tools in order. A kettle on the shelf. A drawer of spares sorted by what they could still save. The benches along the route are what the keepers before left for the next one. A few have keepers living at them. The rest keep themselves, and every crew that passes leaves something.",
  },

  // ─── Machines (met in combat) ────────────────────────────────────────────────────────────────────────────
  {
    id: "machine-packet-leech", category: "machines", title: "Packet Leech", unlock: "enemy:packet-leech", art: "ships/packet-leech",
    text: "A recovery crawler that rode the outer carriers gathering stray traffic from their cores for the Hollow Exchange to redeliver. The exchange stopped answering. Its buffer tank is full and glowing amber, and it clamps onto anything live on its carrier and drains its power to keep from losing a single packet. When its task ends, the buffer is released, and the traffic it held joins your outbound queue.",
  },
  {
    id: "machine-cable-wraith", category: "machines", title: "Cable Wraith", unlock: "enemy:cable-wraith", art: "ships/cable-wraith",
    text: "An isolation cutter: a long thin crawler with enormous shears at the nose, trailing severed cable. Wraiths went down the carriers in the eleventh hour to cut every route the storm could travel, and never received the stand-down. They follow live routes shears first. They are the Seal's cutters: when a carrier parts behind you, a Wraith was there.",
  },
  {
    id: "machine-rust-prophet", category: "machines", title: "Rust Prophet", unlock: "enemy:rust-prophet", art: "ships/rust-prophet",
    text: "A maintenance beacon, a tall mast built over a relay yard, that broadcast corrosion warnings so yard crews could get to the rust before it spread. Nobody came. The warnings got louder, and then they were on the same bands as the corrosion itself. Its horns jam everything that passes on the carriers below. It is only trying to tell you something.",
  },
  {
    id: "machine-scrap-foreman", category: "machines", title: "Scrap Foreman", unlock: "enemy:scrap-foreman", art: "ships/scrap-foreman",
    text: "A yard crane on a gantry rail with a container frame slung beneath it. It ran a relay yard's inspections and hauled condemned hardware to the smelters. It still rolls the yard for an inspection nobody scheduled, condemns what it finds, and never files the paperwork that would spare it. It throws payloads the way it used to throw scrap into a skip.",
  },
  {
    id: "machine-scavenger-skiff", category: "machines", title: "Scavenger Skiff", unlock: "enemy:scavenger-skiff", art: "ships/scavenger-skiff",
    text: "Not a machine. A salvaged cable car, three dead cars welded onto one working trolley, mismatched plates, salvage nets, and a crew who need parts more than they can afford to be kind. They fight with signal emitters and they fight to live. At low hull they will offer to surrender. Accepting is always an option, and out here people remember.",
  },
  {
    id: "machine-static-nest", category: "machines", title: "Static Nest", unlock: "enemy:static-nest", art: "ships/static-nest",
    text: "A brood chamber for small retry drones, each of which holds one line open until the exchange answers. The exchange has not answered since the Fault. The nest, built under a relay platform, hatches spark mites and sends them down the carriers to hold lines on anything that has lines. Stop the mites, end the nest's task, and every line it held is let go.",
  },
  {
    id: "machine-ferric-colossus", category: "machines", title: "Ferric Colossus", unlock: "enemy:ferric-colossus", art: "ships/ferric-colossus",
    text: "A smelter guardian built into a Reach foundry wall over the carriers, heavy iron with a furnace mouth glowing in its chest. It was built to keep people away from the furnace. The furnace was banked, not doused, and it still guards it, trusting only iron and the redundant safety circuits its makers left it. Give it a wide berth, or a very good reason.",
  },
  {
    id: "machine-iron-regent", category: "machines", title: "The Iron Regent", unlock: "enemy:iron-regent", art: "ships/iron-regent",
    text: "The Copper Gate's border machine, built into the gate itself: a crowned armoured bulk between the gate wings, and a tarnished brass crown that is its routing authority. When the ring broke it closed its wings across every carrier. Its law: no passage without proof of a second way home. It opens only for a route that can lose any one road and still arrive. Its Gate Wardens are pieces of the gate itself, which unfold on rotors when it rises.",
  },
  {
    id: "machine-prism-widow", category: "machines", title: "Prism Widow", unlock: "enemy:prism-widow", art: "ships/prism-widow",
    text: "An optical repair automaton: a spider of violet glass legs that crawls its own glass-web cables and spun new optical thread across cracked Cathedral panes. It weaves isolation webs of light around the last working signals now, perfectly, so that nothing gets through. Its work is beautiful. That has never been the problem.",
  },
  {
    id: "machine-glass-echo", category: "machines", title: "Glass Echo", unlock: "enemy:glass-echo", art: "ships/glass-echo",
    text: "A small bell-drone on rotors, with glass fins, that carried a bell's note to the far naves. One of the few things on the Line that truly flies. It repeats the last order it heard, louder as it cracks. It is very fast and very hard to hit. When its bell finally cracks through, the echo goes out and does not come back.",
  },
  {
    id: "machine-wire-weaver", category: "machines", title: "Wire Weaver", unlock: "enemy:wire-weaver", art: "ships/wire-weaver",
    text: "The Hollow Exchange's wiring automaton, sent up to rewire the Cathedral's bell frames: many arms, cable spools, a patient mind. It cannot tell a repair from a snare. It adds tension until every line is ready to snap, and launches small drones to hold the ends.",
  },
  {
    id: "machine-glass-choir", category: "machines", title: "Glass Choir", unlock: "enemy:glass-choir", art: "ships/glass-choir",
    text: "Three announcement bells on one frame that rang the evacuation order across a nave. Each repeats a different fragment of it, and they never agree. Hold. Release. Hold. There is no quorum, and there never will be, unless someone gives them one.",
  },
  {
    id: "machine-coil-serpent", category: "machines", title: "Coil Serpent", unlock: "enemy:coil-serpent", art: "ships/coil-serpent",
    text: "A long segmented cable-recovery coil that wound up dead cable for reuse. It tightens around anything that still carries a signal and follows a single route all the way to its end. One route is a perfect snare. Two routes are a way out.",
  },
  {
    id: "machine-echo-tender", category: "machines", title: "Echo Tender", unlock: "enemy:echo-tender", art: "ships/echo-tender",
    text: "A tender like yours, running its last round with nobody aboard. When a keeper's crew are lost, the autopilot does what a lamper's autopilot was built to do: it relights guide lamps. Its connection expired long ago and no relay will switch it, so its round is one carrier long, back and forth between the same two lamps, which the Core pulls dark again by morning. It treats an unknown car on its carrier as wreckage on a cable. Most of the time it only hails.",
  },
  {
    id: "machine-hollow-choir", category: "machines", title: "The Hollow Choir", unlock: "enemy:hollow-choir", art: "ships/hollow-choir",
    text: "The Cathedral's announcement engine: violet glass bells, porcelain masks, organ-pipe spines. It repeated the evacuation order until the glass memorised it, then gathered every unanswered voice and sealed it in a bell, because a voice sealed in glass can still be heard. One voice is an echo. Many voices, arriving together, can break the glass.",
  },
  {
    id: "machine-gate-sentinel", category: "machines", title: "Gate Sentinel", unlock: "enemy:gate-sentinel", art: "ships/gate-sentinel",
    text: "A checkpoint built over the carriers at the archive's trust boundary: a key-scanner eye and barred gates. It checks keys that expired more than ten thousand days ago and finds every visitor a stranger. Its operators are gone and nobody relieved its shift.",
  },
  {
    id: "machine-null-marshal", category: "machines", title: "Null Marshal", unlock: "enemy:null-marshal", art: "ships/null-marshal",
    text: "An angular armoured escort car that took keyed engineers safely across the trust boundary. There are no keyed engineers any more. It bars the people it was built to protect, and sends marshal troopers down the carrier to see them safely out.",
  },
  {
    id: "machine-ash-moth", category: "machines", title: "Ash Moth", unlock: "enemy:ash-moth", art: "ships/ash-moth",
    text: "A cooling drone on rotors with radiator-fin wings, drawn to the relays that run hot. Its wings are ruined and shed conductive ash, and it starts fires in everything it tries to cool. It does not know. It keeps trying.",
  },
  {
    id: "machine-grave-reaver", category: "machines", title: "Grave Reaver", unlock: "enemy:grave-reaver", art: "ships/grave-reaver",
    text: "A reactor dismantler with huge claws on a heavy trolley, built to crawl out to dead reactors and take them apart so their parts could live again. It hears every weak signal as permission to begin. Keep your signal strong around it, or keep your distance.",
  },
  {
    id: "machine-demolition-engine", category: "machines", title: "Demolition Engine", unlock: "enemy:demolition-engine", art: "ships/demolition-engine",
    text: "A decommissioning crawler sent down the carriers to bring down a relay the wardens sealed. The recall never reached it. It counts down on everything it meets, because that is what the order said, and it has been counting for thirty-one years.",
  },
  {
    id: "machine-quarantine-drone", category: "machines", title: "Quarantine Drone", unlock: "enemy:quarantine-drone", art: "ships/quarantine-drone",
    text: "The Seal's sealing drone: black shell, red seam light, four rotors. These closed the Core's shell in the eleventh hour. Now they close every relay a live connection crosses, and hold the relays they have sealed. They carry the quarantine order in their clamps: close every route until a safe delivery is confirmed.",
  },
  {
    id: "machine-blackout-core", category: "machines", title: "The Blackout Core", unlock: "enemy:blackout-core", art: "ships/blackout-core",
    text: "The Heart's custodian, following the last order it received: hold everything until a safe route is confirmed. It also follows an older rule: a fault that cannot be mended must be escalated to a keeper. So it pages, and when the keeper arrives, it defends the shell with everything it has, in the order the Runbook prescribes. Custody. Emergency. Event Horizon. A route that survives all three is safe by definition.",
  },
  {
    id: "machines-escorts", category: "machines", title: "Escort Automatons", unlock: "outcome", // shared
    text: "Small maintenance machines that walk the decks of the big ones, putting out fires, patching breaches, repairing systems. They were built to follow work crews. With the crews gone, they follow whichever larger machine is nearest. When their machine's task ends they power down, and wait, and sometimes someone says hello to them.",
  },
  {
    id: "machines-boarders", category: "machines", title: "Spark Mites, Splicers, Marshal Troopers", unlock: "outcome", // s1 relays
    text: "Some machines send their small ones across, down the carrier, along a grapple line or off a rotor. Spark mites strip anything that carries current. Splicers cut doors and cables in order to repair them, and open breaches doing it. In the Heart, marshal troopers board to escort intruders out. None of them are killed. They are stopped, and they stay stopped.",
  },
  {
    id: "machines-gate-wardens", category: "machines", title: "Gate Wardens", unlock: "outcome", // s1 relays (exit)
    text: "Portcullis engines that answer only the Iron Regent's crown. When the Regent rises they step out of its gate wings, keyholes lit, to hold the threshold one more time. When their task ends they fold back into pieces of the gate.",
  },
  {
    id: "machines-sealing-drones", category: "machines", title: "Sealing Drones", unlock: "outcome", // s3 relays (exit)
    text: "The first drones of the Seal, kept close to the Core for thirty-one years. In the Event Horizon the Core raises them to close the shell for good. Each one is a hand on the shell. Every one that stops is one hand fewer.",
  },

  // ─── Runbook ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "runbook-greeting", category: "runbook", title: "The Greeting", unlock: "start",
    text: "Hello. — I hear you. — I hear you hear me. Children learned it before they could read. It is the Runbook's opening procedure for any two machines that want to talk, and nobody on the Line ever thought of it as borrowed. Every relay on the Line switches a tender for it and asks for nothing else. The other machines still know it too. Whether they answer is another matter.",
  },
  {
    id: "runbook-must-arrive", category: "runbook", title: "Must Arrive", unlock: "start",
    text: "A message marked must arrive may never be dropped. It carries no time to live. On the Night of the Fault the evacuation desk marked every goodbye must arrive, so that none would be lost. None were. That is the trouble.",
  },
  {
    id: "runbook-ttl", category: "runbook", title: "Time to Live", unlock: "start",
    text: "Every connection has a hop limit, its TTL. Every relay that switches it takes one off. At zero no relay will switch it: expired in transit. The Operator stamps every keeper's connection before she says go ahead: sixteen hops. Benches, markets and some relays can re-stamp it. Must-arrive messages carried no time to live. That is what made the storm. Yours does.",
  },
  {
    id: "runbook-keys", category: "runbook", title: "Keys and Unknown Senders", unlock: "start",
    text: "Every key, badge and credential on the Line was signed by the Heart and renewed each year. The machines obey anyone who carries a key they trust and treat anyone else as an unknown sender. The Heart stopped signing thirty-one years ago. Every key on the Line has expired. Everyone is a stranger to everything now.",
  },
  {
    id: "runbook-received", category: "runbook", title: "Received", unlock: "start",
    text: "A letter ended with a request to acknowledge, and a reply began with received. Acknowledgement was the closest thing the linefolk had to a sacrament. The belief underneath it was simple: every message deserves an answer.",
  },
  {
    id: "runbook-proverbs", category: "runbook", title: "Proverbs from the Margins", unlock: "outcome", // s1 signals
    text: "Be strict in what you send and generous in what you accept. Never trust one road. A message that cannot die becomes a storm. Leave the lamp on for the next shift. You never take the Line down to fix it. A useful thing deserves another journey. Lampers added their own: a beam has to be held; don't let the dark put out a lamp.",
  },
  {
    id: "runbook-return-routes", category: "runbook", title: "Return Routes", unlock: "outcome", // s2 signals
    text: "Routes that send whatever cannot be delivered back home, to try again. A young architect designed them a few years before the Fault, so that nothing undeliverable would ever be lost. They worked perfectly. On the Night of the Fault they became the loop the storm went round in.",
  },
  {
    id: "runbook-tickets", category: "runbook", title: "Tickets", unlock: "outcome", // s1 relays
    text: "Work orders. Every machine on the Line carries the tickets it was given, and executes them until someone closes them. Nobody has closed a ticket in thirty-one years. Most of what attacks you out here is a ticket that outlived its reason.",
  },
  {
    id: "runbook-keepalive", category: "runbook", title: "Keepalive", unlock: "outcome", // s2 relays
    text: "A small signal sent on a schedule that says only: still here. The heartbeat was a keepalive for the whole Line. Relays that stop hearing a neighbour's keepalive assume the worst. Out on the dark stretches, some lamps still send one, every few seconds, to relays that have not answered in thirty-one years.",
  },
  {
    id: "runbook-escalation", category: "runbook", title: "Escalation to a Keeper", unlock: "outcome", // s3 signals
    text: "A fault that cannot be mended must be escalated to a keeper. The rule is older than the wardens, written into the Heart by the First Shift. The quarantine is a fault the Core cannot mend on its own. So once a day it pages, and a lamp labelled KEEPER lights at Relay Seven.",
  },
  {
    id: "runbook-first-hello", category: "runbook", title: "The First Hello", unlock: "outcome", // shared
    text: "An escort automaton wiped back to its first page trusts the first voice that greets it properly. The Runbook describes it as commissioning. The Night Shift call it the first hello. Say it right, all three lines, and wait. If the lens goes teal, you have a rigger. If it goes red, you said it wrong, and should leave.",
  },
  {
    id: "runbook-second-way-home", category: "runbook", title: "Never Trust One Road", unlock: "outcome", // s1 relays (exit)
    text: "The Iron Regent's law is the oldest proverb on the Line: no passage without proof of a second way home. A network that can lose any one road and still arrive is a network that will survive what is ahead. The Regent does not want to be beaten. It wants to see you lose a road and keep coming.",
  },
  {
    id: "runbook-plurality", category: "runbook", title: "One Voice Is an Echo", unlock: "outcome", // s2 relays (exit)
    text: "The bellmakers' saying: one voice is an echo; many voices can break the glass. A single strike only makes a bell ring. Many landing at once, lasers and beams and payloads together, break it. The Hollow Choir only lets a voice go when more than one voice is speaking.",
  },
  {
    id: "runbook-quarantine-procedure", category: "runbook", title: "Quarantine Procedure", unlock: "outcome", // s3 relays (exit)
    text: "The Runbook's procedure for a quarantine is four words long: cut, breach, jam, strike. Custody holds them in rotation. If the custodian is pressed past half its integrity, it enters emergency and spends reserve. If pressed further, event horizon: draw in all light, raise the sealing drones, close the shell. A route that survives all three is a safe route by definition.",
  },
  {
    id: "runbook-restamping", category: "runbook", title: "Re-stamping", unlock: "outcome", // s1 relays (bench)
    text: "A relay may re-stamp traffic it is willing to vouch for. The benches keep old dock-office stamp presses for it, brass, heavy, a lever and a date wheel. You put the connection card in, you pull the lever, you get more hops. Hobb Tallis oils his every morning whether anyone comes or not.",
  },

  // ─── The tender ──────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "tender-lamplighter", category: "tender", title: "The Lamplighter", unlock: "start", art: "ships/lamplighter",
    text: "Car L-12, out of Reach Dock Twelve. A long brass-and-ivory cable tender: riveted plates, a lamp cupola at the nose, a cab window at the helm, the drive trolley and grip arms on the roof, a keel of air tanks below, tool mounts built for splicers and signal lamps. It ran relighting rounds for two hundred years. For thirty-one more it was the one tender nobody took, because its trolley grip had cracked. Pell found a grip this year. Every keeper paints a name over the old one. The old one shows through. Its maintenance key still opens the stores at every cleared relay: 24 salvage in the Reach, 36 in the Cathedral, 48 near the Heart. One locker, one claim. The Seal empties the lockers it reaches first.",
  },
  {
    id: "tender-consist", category: "tender", title: "Consists", unlock: "start",
    text: "The Reach docks never built a tender as one car. They built consists: a lead car with the cab, the helm and the drive trolley, and whatever the job needed coupled on. A rear car behind, through a gangway door: drones, an extra mount, freight, bunks, or the dark shutters of a veil car. A keel car slung beneath on hangers, reached by a service lift, which every lamper calls the belly car: ballast, horns, a sling, a workshop. Every car you couple is more mass on the carrier, and the car swings a little slower for it.",
  },
  {
    id: "tender-refits", category: "tender", title: "Refits", unlock: "outcome", art: "events/refit-bay", // shared
    text: "Every hold on a Reach tender is a socket: brass rails and a fixed plug board, so that a module crate can be swung in on a hoist and bolted down in a night. The Night Shift refit the way they do everything: at a bench, with the kettle on, from whatever the last crew left in the drawer. Their rules are few. Stencil the date on the crate. Never refit on an empty kettle. Leave the old module on the shelf for the next shift, labelled with what was wrong with it.",
  },
  {
    id: "tender-hopping", category: "tender", title: "Hopping", unlock: "start",
    text: "Relays are switchyards where the carriers meet. A tender rides into the yard, the helm sends the greeting, Hello, the relay answers I hear you, the helm answers I hear you hear me, and the switch throws the car onto the next carrier. It feels like missing a stair. The drive spools the trolley up to line speed so the car can take the switch at a run, and the greeting needs someone at the helm, because the Runbook never trusted it to a machine alone. Dark relays still switch. Nobody knows why the First Shift made sure of that.",
  },
  {
    id: "tender-seal", category: "tender", title: "The Seal", unlock: "start", art: "events/sealed-relay",
    text: "To the quarantine machinery a live connection crossing the Line looks exactly like storm traffic. So it follows. Cable Wraiths cut the carriers behind you; Quarantine Drones close and hold each relay you pass in a black lattice with a red seam. It is not a hunt. It is the order doing its job, from the direction you came. Lingering keeps a route warm, and the Seal moves faster toward warm routes.",
  },
  {
    id: "tender-crew", category: "tender", title: "The Crew", unlock: "start",
    text: "The first crew were Night Shift volunteers who stood up when the Operator asked. More join on the way: people from cold berths and stuck lift cars, escorts re-keyed with a first hello, bellmakers who choose to come. The crew man the stations, ride the service lifts between decks, mend the systems, fight off boarders and argue about the kettle. Together they are the keeper.",
  },
  {
    id: "tender-helm-scratches", category: "tender", title: "What Is Scratched in the Helm", unlock: "outcome", art: "events/lamplighter-helm", // shared
    text: "Above the switch lever, cut into the brass with a crimper point: rows of tally marks in fives, every lamp the Lamplighter's crews ever relit (the Night Shift counted 4,406, and argued about it). Eleven relay numbers in a column. In capitals, LEAVE IT LIT, and the initials I.C. And newer, clumsier, from the night the grip went in: grip from Pell. paid (mostly).",
  },
  {
    id: "tender-echo-tenders", category: "tender", title: "The Lampers' Rule", unlock: "outcome", art: "events/echo-tender-lit", // s2 signals
    text: "The lampers had a rule about a tender whose crew were gone: leave the lamp lit, or put it out yourself; don't let the dark do it. Echo tenders are what happens when nobody can do either. Their autopilots run the relighting round forever, back and forth along one carrier between two relays that will no longer switch them. The Seal ignores them. They are not going anywhere.",
  },
  {
    id: "tender-veil", category: "tender", title: "Lamp-Dark", unlock: "outcome", // s2 relays (market)
    text: "Lampers had a word for running a carrier with every lamp doused and the cupola dark: lamp-dark. It was forbidden in the Runbook and done anyway, when a relay's automatics were misfiring and a lit tender would be read as traffic. A Lamp-Dark Veil does it properly: every lamp out, every emission quiet, for as long as the crew can stand the dark.",
  },
  {
    id: "tender-drift", category: "tender", title: "Expired in Transit", unlock: "outcome", // shared (drift)
    text: "At TTL zero no relay will switch you. The tender stalls on its carrier at the relay, lamp lit, hanging over the cloud sea in the thin air, and waits. The Runbook calls it expired in transit. The Night Shift call it waiting for the kettle. Something usually comes along: a scavenger with a stamp to sell, an echo tender that shares its beam, a bench keeper who heard you on the radio. Usually.",
  },
  {
    id: "tender-radio", category: "tender", title: "The Tender's Radio", unlock: "outcome", art: "events/tender-radio", // chains
    text: "A lamper's set in the galley wall, brass dials and a cracked speaker grille, tuned by default to the tender band so Relay Seven can reach you. It also picks up the old lift bands, if you turn the dial far enough left and wait. Most of what is there is static. Some of it is not.",
  },
];
