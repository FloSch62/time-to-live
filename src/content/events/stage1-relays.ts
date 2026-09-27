// Stage I · The Copper Reach — relay decks: combat intros, hazards, benches, markets, empty and sealed relays,
// and the exit (the Copper Gate and the Iron Regent). Pure data.
import type { EventDef } from "../../game/types.ts";

export const STAGE1_RELAYS_FLAGS: Record<string, string> = {
  "s1-grip-paid": "Settled the Night Shift's debt to Pell for the Lamplighter's trolley grip.",
  "s1-tollands-friendly": "Paid or spared the Tolland sisters of the skiff Short Measure; Reach scavengers hear of it.",
};

export const STAGE1_RELAYS: EventDef[] = [
  // ─── Combat ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s1-combat-leech-clamped", pool: "combat", stages: [1], weight: 2,
    title: "A Leech on the Carrier", art: "spire-top",
    text: "Halfway down the span, the carrier ahead is wearing something. A Packet Leech sits clamped over the braid like a knot in a bootlace, its buffer tank swollen amber and ticking as it cools.\n\nIts intake arms turn toward your trolley. The Listening Post picks up its hail, patient and enormous.\n\nBUFFER 100%. HOLDING YOUR TRAFFIC FOR COLLECTION.",
    choices: [
      {
        text: "Engage before it gets a clamp on the trolley.",
        outcomes: [{ outcome: { text: "The drive surges. The leech lets go of the carrier with two arms and reaches for you with the rest.", combat: { enemy: "packet-leech", intro: "The leech crawls up the span toward you, tank sloshing." } } }],
      },
      {
        text: "Flood its intake with noise and slip past.", blue: true, req: { weapon: "ion" },
        outcomes: [
          { weight: 1, outcome: { text: "The jammer fills its intake with static. The leech forgets which arm it was using, lets go of the carrier with all of them, and hangs there by its tail, thinking about it. You run past underneath. A loose packet rattles off its tank and onto your roof.", resources: { salvage: [8, 15] } } },
          { weight: 1, outcome: { text: "The static only makes it hungrier. Noise is still traffic, as far as a leech is concerned.", combat: { enemy: "packet-leech", intro: "It swallows the static and comes for more." } } },
        ],
      },
      {
        text: "Back up the span and ask the relay for another switch (1 TTL).", req: { resources: { ttl: 1 } },
        outcomes: [{ outcome: { text: "The relay hears you, switches you onto a side carrier and takes a hop off the connection for its trouble. Behind you the leech settles back onto its braid, still holding, still waiting for an exchange that stopped answering before most of your crew were born.", resources: { ttl: -1 } } }],
      },
    ],
  },
  {
    id: "s1-combat-leech-lift-cage", pool: "combat", stages: [1],
    title: "Collector at the Lift Head", art: "lift-head",
    text: "A Packet Leech has wrapped itself round the loading cage of a lift head, drinking from the cage's old signal line. Every few seconds its tank pulses brighter, as if it has found something worth keeping.\n\nThe cage is not empty. Through the grille you can see crates stencilled HOLD FOR COLLECTION, and a tarpaulin over something shaped like a person asleep. It is not a person. It is almost certainly not a person.",
    choices: [
      {
        text: "Pry the leech off the cage.",
        outcomes: [{ outcome: { combat: { enemy: "packet-leech", intro: "The leech unwinds from the cage and comes along the carrier after you.", onWin: "s1-combat-leech-lift-cage-after" } } }],
      },
      {
        text: "Find the one line it is drinking from and cut it.", blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          { weight: 2, outcome: { text: "The Listening Post traces the line in a minute. {crew} leans out with a pair of cutters and snips it. The leech goes dim, lets go of the cage one arm at a time, and hangs off the gantry, very still, as if it has been told something sad. The crates are yours.", reward: "low" } },
          { weight: 1, outcome: { text: "The line is found, cut, and replaced at once by the next nearest line, which is yours.", combat: { enemy: "packet-leech", intro: "It lets go of the cage and takes hold of your signal instead.", onWin: "s1-combat-leech-lift-cage-after" } } },
        ],
      },
      {
        text: "Leave the cage to it.",
        outcomes: [{ outcome: { text: "You ride on. In the rear window the leech pulses, and pulses, keeping the cage's manifest safe for a collector who is not coming." } }],
      },
    ],
  },
  {
    id: "s1-combat-leech-lift-cage-after", pool: "scripted", stages: [1],
    title: "Held for Collection", art: "lift-head",
    text: "The leech hangs light and still. The cage swings free on its rails.\n\nThe crates hold dock stores: rivets, lamp glass, a case of payload shells packed in straw. Under the tarpaulin is a dressmaker's form wearing a lift attendant's coat, cap and all, with a brass name badge that says HELLO, I AM HERE TO HELP.\n\nIt has been helping in the dark for thirty-one years.",
    choices: [
      {
        text: "Take the crates.",
        outcomes: [{ outcome: { text: "Rivets, lamp glass and a case of shells, stowed in the hold. {crew} salutes the attendant on the way out, and nobody laughs, quite.", reward: "med" } }],
      },
      {
        text: "Take the coat as well. It is cold out here.",
        outcomes: [{ outcome: { text: "The coat fits {crew} perfectly. In its pocket is a stamp card, punched and never used. The next relay honours it without comment.", reward: "low", resources: { ttl: 1 } } }],
      },
    ],
  },
  {
    id: "s1-combat-leech-swollen", pool: "combat", stages: [1],
    title: "A Full Buffer", art: "relay-switchyard",
    text: "The switchyard is dim, and the reason hangs from its main carrier: a Packet Leech so full that its tank has split along a seam. Amber light leaks out of the crack. So does traffic, a thin hiss on every band, spilling out and being gathered back up and spilling again.\n\nIt has been doing this for a long time. It has not noticed you yet.",
    choices: [
      {
        text: "Hit it while it is busy.",
        outcomes: [{ outcome: { text: "It notices.", combat: { enemy: "packet-leech", intro: "The leech turns from its spilled traffic to the car, which is fuller." } } }],
      },
      {
        text: "Lance the split seam from range.", blue: true, req: { weapon: "beam" },
        outcomes: [
          { weight: 2, outcome: { text: "The lance opens the seam the rest of the way. Thirty-one years of held traffic goes out of the tank in one long sigh on every band, and the leech hangs empty, grip slack, its task ended by the simple fact of having nothing left to hold. Its escorts have left a few useful things lying about.", reward: "med" } },
          { weight: 1, outcome: { text: "The lance skates off the tank. The leech notices you, and the lance, and takes both personally.", combat: { enemy: "packet-leech", intro: "Amber light floods out of the seam as it turns." } } },
        ],
      },
      {
        text: "Creep through the yard with the lamps down.",
        outcomes: [
          { weight: 1, outcome: { text: "You take the switch at a whisper. The leech never looks up from its leaking tank." } },
          { weight: 1, outcome: { text: "The switch clanks. The leech looks up.", combat: { enemy: "packet-leech", intro: "It lets the leak run and comes for the car." } } },
        ],
      },
    ],
  },
  {
    id: "s1-combat-leech-derelict", pool: "combat", stages: [1],
    title: "A Car Nobody Came Back For", art: "derelict-car",
    text: "A derelict car hangs on a side carrier by one corroded coupling pin: a rear car from some old consist, dock paint faded to nothing, windows dark. It would couple to anything with the right pins, and {ship} has the right pins.\n\nIt also has a Packet Leech on its roof, clamped over its old signal line, holding whatever the car was carrying the night it was left.",
    choices: [
      {
        text: "Clear the leech off the car.",
        outcomes: [{ outcome: { combat: { enemy: "packet-leech", intro: "The leech lets go of the derelict and comes along the carrier for something livelier.", onWin: "s1-combat-leech-derelict-after" } } }],
      },
      {
        text: "Leave the car and the leech together.",
        outcomes: [{ outcome: { text: "You ride past. In the rear window the old car sways on its one pin, and the leech on its roof keeps holding whatever it is holding." } }],
      },
    ],
  },
  {
    id: "s1-combat-leech-derelict-after", pool: "scripted", stages: [1],
    title: "One Coupling Pin", art: "derelict-car",
    text: "The leech hangs light and still. The derelict sways on its one pin, and the carrier creaks.\n\nInside it is dust, a dock manifest from the last night, some useful stores, and a coupling that still works if somebody climbs out and persuades it. The pin it hangs from will not hold for ever.",
    choices: [
      {
        text: "Couple it on behind.",
        outcomes: [{ outcome: { text: "{crew} goes out on a line, persuades the coupling with a hammer and some language, and the old car comes in behind {ship} with a clank that sounds like relief.", car: "random-rear" } }],
      },
      {
        text: "Strip it for stores and let it hang.",
        outcomes: [{ outcome: { text: "Stores, a crate of spares and the manifest, which you keep because somebody should. The car stays on its pin, lighter.", reward: "med" } }],
      },
    ],
  },
  {
    id: "s1-combat-wraith-behind", pool: "combat", stages: [1], weight: 2,
    title: "Something Behind You", art: "carrier-cut",
    text: "The carrier sings a new note under the trolley, lower and tighter. {crew} goes to the rear window and does not say anything for a moment.\n\nA Cable Wraith is on your carrier, a hundred metres back, shears first. Behind it the span you just ran hangs in two pieces over the cloud sea.\n\nLIVE ROUTE ON THIS CARRIER. STORM PATH. CUTTING PER ORDER OF HOUR 11.",
    choices: [
      {
        text: "Turn the tools aft and fight it on the span.",
        outcomes: [{ outcome: { combat: { enemy: "cable-wraith", intro: "The wraith closes. Its shears open wide enough to take the trolley." } } }],
      },
      {
        text: "Run for the next switch at full surge.", blue: true, req: { system: { id: "engines", level: 3 } },
        outcomes: [
          { weight: 2, outcome: { text: "The drive howls. The car swings wide on the carrier and comes back and keeps going, and you take the switch with the shears a car-length behind. The relay throws you. The wraith cuts the empty span and waits for the next live route." } },
          { weight: 1, outcome: { text: "Not quite. The shears catch the keel as you reach the yard.", resources: { hull: [-3, -2] }, combat: { enemy: "cable-wraith", intro: "It has you at the switch." } } },
        ],
      },
      {
        text: "Let {crew:warden} send the wardens' stand-down.", blue: true, req: { species: "warden" },
        outcomes: [
          { weight: 1, outcome: { text: "{crew:warden} keys the code from memory, the one every warden learned at sixteen. The wraith stops. Its shears hang open. For a long moment it is a machine that has been told something it waited thirty-one years to hear. Then: KEY EXPIRED. But you are already through the switch." } },
          { weight: 2, outcome: { text: "{crew:warden} keys the code from memory. The wraith considers it for exactly one second.", combat: { enemy: "cable-wraith", intro: "KEY EXPIRED. STAND-DOWN NOT RECEIVED. CUTTING." } } },
        ],
      },
    ],
  },
  {
    id: "s1-combat-wraith-ahead", pool: "combat", stages: [1],
    title: "A Cutter on the Next Span", art: "carrier-cut",
    text: "The relay switches you, and the car runs out onto the next carrier, and halfway along it a Cable Wraith is working. Not at you. At the carrier. Its shears are closed on the braid and it is leaning into them, patiently, the way you lean on a stuck door.\n\nIf it finishes, this span comes down, and the car with it.",
    choices: [
      {
        text: "Stop it before it finishes.",
        outcomes: [{ outcome: { combat: { enemy: "cable-wraith", intro: "The wraith lets go of the braid and turns its shears on the car instead." } } }],
      },
      {
        text: "Brake, back into the yard, ask for another switch (1 TTL).", req: { resources: { ttl: 1 } },
        outcomes: [{ outcome: { text: "The relay switches you onto a side carrier. Behind you the span parts with a sound like a bell dropped on a floor, and the wraith hangs from the stub on its shears, satisfied, already listening for the next route.", resources: { ttl: -1 } } }],
      },
      {
        text: "Put a slug through its grip from here.", blue: true, req: { weapon: "payload" },
        outcomes: [
          { weight: 2, outcome: { text: "The slug takes its grip clean off. The wraith falls, shears still closed on a length of nothing, and fetches up on a gantry far below, where it will cut nothing for a long time. A spare shell of yours is gone; the span is whole.", resources: { payloads: -1 }, reward: "low" } },
          { weight: 1, outcome: { text: "The slug rings off its shears. Now it knows where you are.", resources: { payloads: -1 }, combat: { enemy: "cable-wraith", intro: "It comes up the span, shears first." } } },
        ],
      },
    ],
  },
  {
    id: "s1-combat-wraith-stub", pool: "combat", stages: [1],
    title: "The Cutter and the Car", art: "carrier-cut",
    text: "A carrier has been cut here, recently: the braid ends are still bright. On the stub hangs a small salvage car with its lamp flashing the old distress pattern, three long, three short.\n\nBetween you and it, a Cable Wraith turns on its grip, looking for the next live route. It finds you.",
    choices: [
      {
        text: "Fight it off the stranded car.",
        outcomes: [{ outcome: { combat: { enemy: "cable-wraith", intro: "The wraith leaves the stub and comes along the carrier toward your lamp.", onWin: "s1-combat-wraith-stub-after" } } }],
      },
      {
        text: "Run past. Someone else will come for the car.",
        outcomes: [{ outcome: { text: "You take the switch. In the rear window the little car's lamp keeps flashing, three long, three short, until the relay's bulk hides it. Nobody aboard says anything about it for the next hop, which says plenty." } }],
      },
    ],
  },
  {
    id: "s1-combat-wraith-stub-after", pool: "scripted", stages: [1],
    title: "Three Long, Three Short", art: "scavenger-skiff-hail", portrait: "recruit-linefolk-a", speaker: "Wenna Pollard",
    text: "The wraith folds its shears. You bring the car up to the stub, and the salvage car's hatch opens on one woman, one toolbag and a great deal of cable dust.\n\n\"I was hoping somebody would be stupid enough,\" says Wenna Pollard. \"No offence. I've been hanging here two days. My trolley's shot, my lamp's nearly flat, and I have eaten a soup I would not wish on a leech.\"",
    choices: [
      {
        text: "Take her aboard.",
        outcomes: [{ outcome: { text: "Wenna climbs across with her toolbag, looks round the galley, and puts the kettle on without being asked. Nobody objects.", crewJoin: { species: "linefolk", name: "Wenna Pollard" } } }],
      },
      {
        text: "Tow her car to the next relay for a share of its salvage.",
        outcomes: [{ outcome: { text: "You tow the little car into the next yard and she pays you out of her hold, fair and square, with a handshake that is mostly cable dust. \"Leave the lamp on,\" she says, and means it.", reward: "med" } }],
      },
    ],
  },
  {
    id: "s1-combat-prophet-mast", pool: "combat", stages: [1], weight: 2,
    title: "A Warning Mast", art: "rust-yard",
    text: "The carrier runs past a relay yard, and over the yard stands a mast with a horned beacon at the top, its warning lamp turning. As you come in range every speaker in the car talks at once.\n\nCORROSION WARNING. CORROSION WARNING. ALL TRAFFIC PASSING THIS MAST WILL BE INFORMED.\n\nThe Listening Post hisses. The ward mesh crackles. Something in the galley starts to smell of pennies.",
    choices: [
      {
        text: "Silence the horns as you pass.",
        outcomes: [{ outcome: { combat: { enemy: "rust-prophet", intro: "The horns swing to follow the car. The warning gets louder." } } }],
      },
      {
        text: "Send it one word: received.",
        outcomes: [
          { weight: 1, outcome: { text: "WARNING ACKNOWLEDGED. The horns fall silent. The lamp keeps turning, but quietly, the way a person nods after they have finally been listened to. You ride past under the mast without another word from it." } },
          { weight: 2, outcome: { text: "ACKNOWLEDGEMENT FROM UNKNOWN SENDER NOT ACCEPTED. WARNING REPEATED.", combat: { enemy: "rust-prophet", intro: "It will keep telling you until you understand." } } },
        ],
      },
      {
        text: "Listen to what it is actually warning about.", blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: { text: "Under all the shouting there is data, and the data is about you: the trolley grip's bearing is going green. It is right. {crew} climbs up and cleans the bearing while the mast shouts. Then you deal with the mast.", repair: 3, combat: { enemy: "rust-prophet", intro: "Grip clean. Now the horns." } } }],
      },
    ],
  },
  {
    id: "s1-combat-prophet-horn", pool: "combat", stages: [1],
    title: "Horns in the Yard", art: "rust-yard",
    text: "Two masts stood in this yard once. One has fallen across the carriers and taken its beacon with it. The other is still up and still warning, and seems to hold you personally responsible for the first.\n\nIts horns are old Reach work, big bell-mouthed things of green brass. Lampers used to say you could hear a Reach horn from the Ground. Nobody ever checked.",
    choices: [
      {
        text: "End the broadcast.",
        outcomes: [{ outcome: { combat: { enemy: "rust-prophet", intro: "Every horn on the mast swings round to the car.", onWin: "s1-combat-prophet-horn-after" } } }],
      },
      {
        text: "Duck under the fallen mast and keep going.",
        outcomes: [
          { weight: 2, outcome: { text: "The car scrapes under the fallen mast with a noise like a dropped tray of cutlery, and comes out the other side missing some paint and a little plating. The standing mast warns you about the corrosion on the scrape.", resources: { hull: [-3, -1] } } },
          { weight: 1, outcome: { text: "You get halfway under. The standing mast has opinions about that.", resources: { hull: -2 }, combat: { enemy: "rust-prophet", intro: "CORROSION WARNING. OBSTRUCTION WARNING. ALL WARNINGS." } } },
        ],
      },
    ],
  },
  {
    id: "s1-combat-prophet-horn-after", pool: "scripted", stages: [1],
    title: "A Horn That Could Listen", art: "rust-yard",
    text: "The mast goes quiet. The warning lamp stops turning. The horns hang silent over the yard, green-brass mouths open on nothing.\n\n{crew} looks at the biggest one for a long time and says that a horn built to be heard from the Ground could probably listen just as far, if somebody turned it round.",
    choices: [
      {
        text: "Unbolt the big horn and mount it on the cupola.",
        outcomes: [{ outcome: { text: "It takes two hours, three spanners and one argument. Mounted backwards on the cupola, the horn picks up the carriers ahead: the hum of a relay, the tick of a machine, the silence of an empty yard. Much nicer company than it was.", augment: "listening-horn" } }],
      },
      {
        text: "Strip the mast for brass and spares.",
        outcomes: [{ outcome: { text: "Good Reach brass, a coil of signal cable and a box of warning-lamp bulbs, stowed in the hold.", reward: "med" } }],
      },
    ],
  },
  {
    id: "s1-combat-foreman-inspection", pool: "combat", stages: [1], weight: 2,
    title: "Inspection Due", art: "rust-yard",
    text: "A gantry crane rolls out along its rail over the carrier and stops directly above the car. Something clanks onto the roof: a chalk arm, drawing a large X.\n\nINSPECTION DUE. UNREGISTERED CAR ON YARD CARRIER. CONDEMNED PENDING PAPERWORK.\n\nThe Scrap Foreman's hook is already coming down. It is very large. It has condemned larger.",
    choices: [
      {
        text: "Refuse the inspection.",
        outcomes: [{ outcome: { combat: { enemy: "scrap-foreman", intro: "The hook drops. The foreman means to put you in the skip." } } }],
      },
      {
        text: "Let {crew:courier} present a signed work order.", blue: true, req: { species: "courier" },
        outcomes: [
          { weight: 2, outcome: { text: "{crew:courier} has carried a great many signed papers in their life and knows exactly what one looks like. The forgery is held up to the crane's lens. A long pause. INSPECTION PASSED. HAVE A SAFE SHIFT. The foreman lowers a bin marked SURPLUS TO INSPECTION onto the roof and rolls away.", resources: { spares: 2 } } },
          { weight: 1, outcome: { text: "The foreman studies the work order for a long time. SIGNATURE KEY EXPIRED. PAPERWORK CONDEMNED.", combat: { enemy: "scrap-foreman", intro: "It condemns the paperwork, then the car." } } },
        ],
      },
      {
        text: "Let {crew:rigger} answer in yard code.", blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: { text: "{crew:rigger} raises a tool arm and chalks a mark of its own under the X: a circle with a line through it, which in yard code means escort, returning to base. The foreman reads it, reclassifies the car as its own property, and rolls away satisfied. Nobody asks the rigger how it knew." } }],
      },
    ],
  },
  {
    id: "s1-combat-foreman-skip", pool: "combat", stages: [1],
    title: "The Condemned Skip", art: "rust-yard",
    text: "A Scrap Foreman is working the far end of the yard, feeding a skip. Everything goes in: a lamp housing, a pump, a whole trolley, a length of good carrier with the chalk still wet on it. The skip is full of things condemned for the crime of being in the yard when the foreman came by.\n\nSome of it is perfectly good. Some of it is better than what you have.",
    choices: [
      {
        text: "Draw the foreman off and raid the skip.",
        outcomes: [{ outcome: { combat: { enemy: "scrap-foreman", intro: "The foreman sees you near its skip and takes it personally.", onWin: "s1-combat-foreman-skip-after" } } }],
      },
      {
        text: "Wait for it to roll to the far end, then dash in.",
        outcomes: [
          { weight: 2, outcome: { text: "It takes the foreman an age to roll away, and the Seal gains on you while you wait, but the dash works. {crew} comes back with an armful of condemned but excellent parts and chalk on both sleeves.", reward: "low", seal: -1 } },
          { weight: 1, outcome: { text: "The foreman stops halfway down its rail, turns, and rolls back, as if it forgot something. It did. It forgot you.", seal: -1, combat: { enemy: "scrap-foreman", intro: "CONDEMNED. CONDEMNED. CONDEMNED." } } },
        ],
      },
      {
        text: "Leave the skip to the foreman.",
        outcomes: [{ outcome: { text: "You ride on. The foreman drops a perfectly good pump into the skip behind you, chalks it, and goes back for the next." } }],
      },
    ],
  },
  {
    id: "s1-combat-foreman-skip-after", pool: "scripted", stages: [1],
    title: "Surplus to Inspection", art: "machine-escort",
    text: "The hammer rests at the end of its rail. The skip is yours.\n\nSo, possibly, is the foreman's escort automaton, which stopped mid-step when its machine's task ended and still stands at the edge of the skip holding a condemned lamp, its single lens dark. It is squat, ivory, patient. It looks like it is waiting to be told what to do next.",
    choices: [
      {
        text: "Pick through the skip.",
        outcomes: [
          { weight: 2, outcome: { text: "Pumps, lamp glass, a nearly new drive motor and a tin of rivets that someone condemned for rattling.", reward: "med" } },
          { weight: 1, outcome: { text: "At the bottom of the skip, under a condemned pump, is a tool mount with the weapon still on it. The chalk says UNSAFE. It is not, particularly.", weapon: "random" } },
        ],
      },
      {
        text: "Let {crew:rigger} give the escort its first hello.", blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: { text: "{crew:rigger} stands in front of the escort and says the three lines slowly, the way somebody once said them to it. Hello. The lens flickers. I hear you. It goes teal. I hear you hear me. The escort puts down the condemned lamp and follows the rigger across to the car.", crewJoin: { species: "rigger" } } }],
      },
      {
        text: "Try the first hello yourselves.",
        outcomes: [
          { weight: 1, outcome: { text: "You say it right, all three lines, and wait. The lens goes teal. The escort looks at each of you in turn, as if memorising you, and climbs aboard.", crewJoin: { species: "rigger" } } },
          { weight: 1, outcome: { text: "Somebody rushes the second line. The lens goes red, the escort swings the condemned lamp at {crew} with great precision, and then powers down for good, looking faintly embarrassed.", crewDamage: { amount: 15, who: "one" } } },
        ],
      },
    ],
  },
  {
    id: "s1-combat-skiff-toll", pool: "combat", stages: [1], weight: 2,
    title: "Toll on the Span", art: "scavenger-skiff-hail", portrait: "scavenger", speaker: "Captain Tolland",
    text: "A salvage car comes down the parallel carrier and matches your speed: three dead cars welded onto one working trolley, nets out, hand lamps waving from an open hatch. The paint on the nose says SHORT MEASURE.\n\n\"Toll span,\" the captain calls over the radio. She sounds bored. \"Thirty salvage, or we take it out of your plating. Nothing personal. The Reach doesn't feed anybody.\"",
    choices: [
      {
        text: "Pay the toll (30 salvage).", req: { resources: { salvage: 30 } },
        outcomes: [{ outcome: { text: "You send the salvage across on a line. \"Pleasure,\" says Captain Tolland, and sounds as if she means it. \"Tell anyone who asks the Short Measure was civil.\" Her sister waves a lamp from the hatch as they brake away.", resources: { salvage: -30 }, flags: ["s1-tollands-friendly"] } }],
      },
      {
        text: "Tell her the plating is spoken for.",
        outcomes: [{ outcome: { combat: { enemy: "scavenger-skiff", surrenderable: true, intro: "The Short Measure swings in on its carrier, emitters warming.", onSurrender: "s1-combat-skiff-toll-surrender" } } }],
      },
      {
        text: "Have {crew:warden} stand in the hatch in full plate.", blue: true, req: { species: "warden" },
        outcomes: [
          { weight: 2, outcome: { text: "{crew:warden} stands in the open hatch, visor down, ember stripe catching the light, and says nothing at all. The captain looks at the visor for a while. \"Toll's waived for wardens,\" she says. \"New rule.\" The Short Measure brakes away." } },
          { weight: 1, outcome: { text: "\"Nice armour,\" says the captain. \"We'll take that too.\"", combat: { enemy: "scavenger-skiff", surrenderable: true, intro: "Nets swing. Emitters warm.", onSurrender: "s1-combat-skiff-toll-surrender" } } },
        ],
      },
    ],
  },
  {
    id: "s1-combat-skiff-toll-surrender", pool: "scripted", stages: [1],
    title: "Short Measure", art: "scavenger-skiff-hail", portrait: "scavenger", speaker: "Captain Tolland",
    text: "\"All right. All right,\" says Captain Tolland. Her voice has lost its boredom. \"Hold fire. We've got salvage in the hold and a stamp my sister's been saving. Take it and let us limp home.\"\n\nBehind her, somebody is holding a rag to a burned hand.",
    choices: [
      {
        text: "Take what they offer and let them go.",
        outcomes: [{ outcome: { text: "The salvage comes across on a line, and the stamp with it. \"Civil,\" says the captain, as the Short Measure limps away. \"I'll tell them you were civil.\"", resources: { salvage: [15, 25], ttl: 1 }, flags: ["s1-tollands-friendly"] } }],
      },
      {
        text: "Take everything they have.",
        outcomes: [{ outcome: { text: "They hand it over without a word. The Short Measure brakes away with its hatch shut and its lamps dark, and the Reach will hear about this before you reach the next relay.", reward: "med" } }],
      },
      {
        text: "Let them keep it. Tell them to buy something hot.",
        outcomes: [{ outcome: { text: "There is a silence on the radio. Then: \"Received.\" Just that. The Short Measure goes, and a moment later its lamp flashes twice at you from the far carrier, which among Reach scavengers is either thanks or a very rude gesture.", flags: ["s1-tollands-friendly"] } }],
      },
    ],
  },
  {
    id: "s1-combat-skiff-nets", pool: "combat", stages: [1],
    title: "Nets", art: "scavenger-skiff-hail",
    text: "Something slaps across the roof and the trolley shudders: a salvage net, thrown from a skiff that has come up behind you on your own carrier. Its crew are already paying out a second net, whistling.\n\nThey are not trying to hurt anyone. They are trying to haul {ship} onto the gantry at the next relay and take it apart there, which, from {ship}'s point of view, is worse.",
    choices: [
      {
        text: "Cut the nets and turn the tools on them.",
        outcomes: [{ outcome: { combat: { enemy: "scavenger-skiff", surrenderable: true, intro: "The skiff reels in its nets and brings its emitters up.", onSurrender: "s1-combat-skiff-nets-surrender" } } }],
      },
      {
        text: "Put rivet scatter through the nets.", blue: true, req: { weapon: "flak" },
        outcomes: [
          { weight: 2, outcome: { text: "Rivets go through the nets like a comb through wet hair. The skiff's crew stop whistling. Their captain waves a lamp in something like respect and brakes away, and the tangle of their best net stays on your roof, which {crew} says is worth good salvage at the Copper Market.", resources: { salvage: [10, 20] } } },
          { weight: 1, outcome: { text: "The nets part. The crew are not impressed enough.", combat: { enemy: "scavenger-skiff", surrenderable: true, intro: "Plan B, their captain shouts. Plan B is emitters.", onSurrender: "s1-combat-skiff-nets-surrender" } } },
        ],
      },
      {
        text: "Throw them a line and talk.",
        outcomes: [
          { weight: 1, outcome: { text: "They are hungry, not stupid. A spare off your rack buys the nets off your roof and a warning about a leech two relays on. Fair trade.", resources: { spares: -1 } } },
          { weight: 2, outcome: { text: "They laugh, kindly, and throw the second net.", combat: { enemy: "scavenger-skiff", surrenderable: true, intro: "The second net lands. So do their emitters.", onSurrender: "s1-combat-skiff-nets-surrender" } } },
        ],
      },
    ],
  },
  {
    id: "s1-combat-skiff-nets-surrender", pool: "scripted", stages: [1], art: "scavenger-skiff-hail",
    title: "Nets Down",
    text: "The skiff brakes hard and its nets drop slack. A white work shirt is waved from the hatch on the end of a boathook.\n\n\"Fair's fair,\" calls their captain. \"You're harder than you look. We've got a bit in the hold. And our Linnet has been asking to see the glass bells since she was nine, if you're going that way. She's no use to us. She reads.\"",
    choices: [
      {
        text: "Take the salvage and let them go.",
        outcomes: [{ outcome: { text: "The salvage comes across. The skiff reels in its nets and goes looking for something easier, which in the Reach will not take long.", resources: { salvage: [10, 20] } } }],
      },
      {
        text: "Take Linnet, if she wants to come.",
        outcomes: [
          { weight: 2, outcome: { text: "Linnet comes across the gap on a line with a bag of books on her back and does not look down once. \"The Cathedral,\" she says, as soon as her boots hit the deck. \"Is it true it sings.\"", crewJoin: { species: "linefolk", name: "Linnet Sutter" } } },
          { weight: 1, outcome: { text: "Linnet looks at the car for a long time and shakes her head. \"Next one,\" she says. The captain throws you a bag of salvage for asking.", resources: { salvage: 10 } } },
        ],
      },
    ],
  },
  {
    id: "s1-combat-skiff-hungry", pool: "combat", stages: [1],
    title: "A Hungry Crew", art: "scavenger-skiff-hail", portrait: "scavenger", speaker: "Skiff captain",
    text: "The skiff that comes alongside has not been fed properly for a while, and neither has its crew. Their captain is polite about it, which is somehow worse.\n\n\"We've been three weeks on a leech that didn't pay,\" he says. \"We'd like your spares, please. And whatever's in your galley that smells like that. We'll take them either way, but I thought I'd ask.\"\n\nBehind him, somebody is sharpening a splicer.",
    choices: [
      {
        text: "Give them spares (2 spares).", req: { resources: { spares: 2 } },
        outcomes: [{ outcome: { text: "The spares go across on a line. The captain counts them twice, then throws back a stamp card. \"We were saving it for a bad day,\" he says. \"Yours looks worse.\"", resources: { spares: -2, ttl: 1 } } }],
      },
      {
        text: "Share the galley, keep the spares.",
        outcomes: [
          { weight: 2, outcome: { text: "They come aboard two at a time and eat standing up, fast, like people who have learned not to trust a table. Their captain thanks you properly and tells you where the Seal is cutting: two relays back and closing. You take the long carrier and gain a hop on it.", seal: 1 } },
          { weight: 1, outcome: { text: "They eat, and thank you, and then decide they would like the spares as well.", combat: { enemy: "scavenger-skiff", surrenderable: true, intro: "Full bellies, bad manners. Their emitters come up.", onSurrender: "s1-combat-skiff-hungry-surrender" } } },
        ],
      },
      {
        text: "No.",
        outcomes: [{ outcome: { combat: { enemy: "scavenger-skiff", surrenderable: true, intro: "\"Shame,\" says the captain, and means it.", onSurrender: "s1-combat-skiff-hungry-surrender" } } }],
      },
    ],
  },
  {
    id: "s1-combat-skiff-hungry-surrender", pool: "scripted", stages: [1], art: "scavenger-skiff-hail", portrait: "scavenger", speaker: "Skiff captain",
    title: "Fair",
    text: "The captain raises both hands in the hatch. \"Fair,\" he says. \"We'd have done the same. We did do the same, just worse.\"\n\nHis crew look at you with the tired eyes of people who have been hungry for a long time. One of them, a courier by the satchel and the goggles, is looking past you at the chart on your wall.",
    choices: [
      {
        text: "Take their salvage.",
        outcomes: [{ outcome: { text: "It is not much. They hand it over and ride off on their carrier, looking for a leech that pays.", resources: { salvage: [15, 30] } } }],
      },
      {
        text: "Leave them their salvage. Let whoever wants to come, come.",
        outcomes: [
          { weight: 2, outcome: { text: "The courier is across the gap before the captain can say anything. \"I want to see where the chart ends,\" they say. The captain shrugs and throws their bag after them.", crewJoin: { species: "courier" } } },
          { weight: 1, outcome: { text: "Nobody moves. The captain thanks you anyway, and gives you a warning worth having: a nest two relays on. You take a different carrier.", seal: 1 } },
        ],
      },
    ],
  },
  {
    id: "s1-combat-nest-platform", pool: "combat", stages: [1], weight: 2,
    title: "Under the Platform", art: "relay-switchyard",
    text: "The relay platform hangs low over the carriers, and something has built underneath it: a Static Nest, a lumpy grey hive of cable and resin the size of a lift car, crackling with small sounds. As the car comes into the yard, the sounds change.\n\nSpark mites. Dozens of them, pouring out along the carriers, each one looking for a line to hold.\n\nBROOD ACTIVE. 4,112 LINES HELD. PASSING CARRIER HAS LINES. HATCHING TO HOLD 1 MORE.",
    choices: [
      {
        text: "Hold the hatches and end the nest's task.",
        outcomes: [{ outcome: { text: "The first mites reach the roof and start looking for a way in.", codex: "machines-boarders", combat: { enemy: "static-nest", intro: "Mites on the roof. Mites on the trolley. The nest hatches more." } } }],
      },
      {
        text: "Seal every hatch and run the switch.", blue: true, req: { system: { id: "doors", level: 2 } },
        outcomes: [
          { weight: 2, outcome: { text: "Every hatch dogged, every door shut. The mites scrabble on the roof for a whole span, looking for a gap that is not there, and fall off in a crackling shower at the switch.", resources: { hull: -1 }, codex: "machines-boarders" } },
          { weight: 1, outcome: { text: "One hatch sticks. There is always one hatch.", codex: "machines-boarders", combat: { enemy: "static-nest", intro: "They are through the galley hatch." } } },
        ],
      },
      {
        text: "Let {crew:rigger} tell the mites the exchange has answered.", blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: { text: "{crew:rigger} opens its speaker grille and plays a tone none of you have heard before: short, clean, final. All lines answered. The mites stop. They stand on the carrier for a moment like people at a platform when the last lift has been announced, and then they go home to the nest. The rigger cannot say where it learned the tone.", codex: "machines-boarders" } }],
      },
    ],
  },
  {
    id: "s1-combat-nest-lines", pool: "combat", stages: [1],
    title: "Lines Held", art: "relay-switchyard",
    text: "Every line into this relay is being held. The Listening Post shows them all open, all waiting, and at the end of each one a spark mite clinging to the contact, patient as a limpet, waiting for an exchange to answer.\n\nThe nest that sent them hangs under the platform, still hatching. When the car's own lines come into range, a few hundred small lenses turn toward you at once.",
    choices: [
      {
        text: "End the nest's task.",
        outcomes: [{ outcome: { combat: { enemy: "static-nest", intro: "A few hundred mites let go of their lines and come for yours.", onWin: "s1-combat-nest-lines-after" } } }],
      },
      {
        text: "Answer one of the held lines: received.", blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: { text: "The Listening Post finds a held line and sends one word down it. The mite on the far end lets go, drops, and sits on the carrier looking pleased with itself. Then the nest notices that somebody is answering its lines, and it wants all of yours.", codex: "machines-boarders", combat: { enemy: "static-nest", intro: "ANSWER RECEIVED. HOLDING ALL LINES FROM SENDER.", onWin: "s1-combat-nest-lines-after" } } }],
      },
      {
        text: "Back out and take the other carrier (1 TTL).", req: { resources: { ttl: 1 } },
        outcomes: [{ outcome: { text: "You reverse out of the yard and the relay switches you round the long way. The nest keeps its 4,112 lines and does not miss you.", resources: { ttl: -1 } } }],
      },
    ],
  },
  {
    id: "s1-combat-nest-lines-after", pool: "scripted", stages: [1],
    title: "All Lines Released", art: "relay-switchyard",
    text: "The nest goes quiet. All over the relay, 4,112 held lines let go at once, and for a second the Listening Post is full of dial tone, like a hall full of people all putting down their handsets together.\n\nThe mites curl up on the carrier like spent tools. Nothing is waiting any more.",
    choices: [
      {
        text: "Scrape the nest for spares.",
        outcomes: [{ outcome: { text: "Mite lenses by the handful, good as spares once they are cleaned. {crew} cleans them in the galley sink and complains the whole time.", resources: { spares: [1, 3] } } }],
      },
      {
        text: "Search the platform above it.",
        outcomes: [{ outcome: { text: "The relay platform was a sorting point once. Among the crates is a dock ledger nobody finished and some stores that nobody will miss.", reward: "low" } }],
      },
    ],
  },
  {
    id: "s1-combat-colossus-foundry", pool: "combat", stages: [1], unique: true,
    title: "Foundry Three", art: "foundry-mouth",
    text: "The carrier runs straight past Foundry Three, close enough to feel the heat through the plating. The furnace was banked, not doused, thirty-one years ago, and it still glows dull red, like a coal left in a grate.\n\nBuilt into the foundry wall above the carrier, the Ferric Colossus turns its head. Its chest is a furnace door. Its hands are the size of the car.\n\nFOUNDRY THREE. UNKNOWN SENDER ON FOUNDRY CARRIER. NOT IRON. NOT REDUNDANT. FURNACE DOOR CLOSED.",
    choices: [
      {
        text: "Run the carrier under its hands.",
        outcomes: [{ outcome: { codex: "places-foundries", combat: { enemy: "ferric-colossus", intro: "The Colossus leans out of its wall. The furnace door opens a crack.", onWin: "s1-combat-colossus-after" } } }],
      },
      {
        text: "Launch a drone down a second line to show it a redundant circuit.", blue: true, req: { system: { id: "drones", level: 1 } },
        outcomes: [
          { weight: 1, outcome: { text: "The drone runs the far carrier while the car runs the near one: two routes, one arrival. The Colossus watches both. REDUNDANT CIRCUIT OBSERVED. It folds its hands. You pass under the furnace in a silence so heavy you can hear the plating tick.", codex: "places-foundries" } },
          { weight: 2, outcome: { text: "The Colossus watches the drone, then the car, then the drone again. NOT IRON. It was never going to be enough.", codex: "places-foundries", combat: { enemy: "ferric-colossus", intro: "Iron hands come down on the carrier.", onWin: "s1-combat-colossus-after" } } },
        ],
      },
      {
        text: "Wait at the relay until the foundry wall cools.",
        outcomes: [{ outcome: { text: "It does cool, eventually, the way a furnace cools, which is slowly. The Colossus settles. You pass under it in the small hours. Behind you, the Seal has spent the whole wait catching up.", seal: -2, codex: "places-foundries" } }],
      },
    ],
  },
  {
    id: "s1-combat-colossus-after", pool: "scripted", stages: [1],
    title: "The Furnace Door Settles", art: "foundry-mouth",
    text: "The furnace door settles in the foundry wall. The great hands rest on the carrier, open. Even iron can learn to rest.\n\nThe foundry is still warm inside. The crew's shift board hangs by the furnace, with its last entry in chalk, and beside it an outbound tray with one message in it that never went out.",
    choices: [
      {
        text: "Read the message in the tray.",
        outcomes: [{ outcome: { text: "It is short, and practical, and hopeful, and it was written by someone who thought they would be back in a week. {crew} puts it back in the tray very carefully, then takes the foundry's good tools, because they would have wanted that too.", fragment: "f1-furnace", reward: "med" } }],
      },
      {
        text: "Rake the banked furnace for good iron.",
        outcomes: [{ outcome: { text: "The iron inside is the best in the Reach, thirty-one years in the making. The furnace is also still very hot, which everyone knew, and {crew} proves anyway.", reward: "high", crewDamage: { amount: 15, who: "one" } } }],
      },
    ],
  },

  // ─── Hazards ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s1-hazard-debris-field-lamp-cage", pool: "hazard", hazard: "debris-field", stages: [1],
    title: "Wreckage in the Carriers", art: "debris-field",
    text: "Toward the outer gates, the wreckage of the Night of the Fault still hangs in the carriers: plates, cable, a whole lift cage, a relay lamp on a snapped mast, all of it snagged in the braid and swinging, ticking against itself in the sunlight.\n\nThe outer relays stand beyond it, broken teeth against the stars. Everything out here is moving a little. Nothing out here is going anywhere.",
    choices: [
      {
        text: "Thread it slowly and pick up what you can reach.",
        outcomes: [
          { weight: 2, outcome: { text: "Plate by plate, hook by hook, {crew} fishes useful things out of the tangle from the roof hatch.", reward: "low", codex: "places-outer-relays" } },
          { weight: 1, outcome: { text: "A plate the size of a door swings in on its snag and hits the car broadside.", resources: { hull: [-4, -2] }, codex: "places-outer-relays" } },
        ],
      },
      {
        text: "Stop by the snapped relay lamp and listen.",
        outcomes: [{ outcome: { text: "The lamp is still blinking on its broken mast, once, a pause, once, and the Listening Post picks up the automatic message that goes with each blink, sent to any relay that might still be there to count.", fragment: "f1-heartbeat", codex: "places-outer-relays" } }],
      },
      {
        text: "Send a drone into the tangle for the lift cage.", blue: true, req: { system: { id: "drones", level: 1 } },
        outcomes: [{ outcome: { text: "The drone threads the wreckage where the car could not and comes back towing a cage of dock stores. It looks pleased with itself, as far as a drone can.", reward: "med" } }],
      },
    ],
  },
  {
    id: "s1-hazard-debris-field-gatherer", pool: "hazard", hazard: "debris-field", stages: [1],
    title: "Gatherer in the Wreckage", art: "debris-field",
    text: "A Packet Leech is working the wreckage, crawling from one snagged piece to the next, pressing its intake to each dead lamp and cable end to see if anything is still in them. It has been at this a long time. Its tank is barely a quarter full. Almost everything out here is empty.\n\nThen it finds the car, which is not empty at all.",
    choices: [
      {
        text: "Fight it among the wreckage.",
        outcomes: [{ outcome: { combat: { enemy: "packet-leech", intro: "It comes through the debris toward you, and the debris comes with it." } } }],
      },
      {
        text: "Hide behind the hanging lift cage and let it pass.",
        outcomes: [
          { weight: 1, outcome: { text: "You ease in behind the cage and wait while the leech feels its way past, arm over arm. Something heavy swings into the car as you pull out again.", resources: { hull: -2 } } },
          { weight: 1, outcome: { text: "The leech feels its way round the cage and finds you on the other side.", combat: { enemy: "packet-leech", intro: "Arm over arm, it comes round the cage." } } },
        ],
      },
      {
        text: "Feed it a dead lamp's worth of static and slip by.", blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: { text: "The Listening Post plays it the sound of a full buffer somewhere else. The leech turns toward the promise and crawls off into the wreckage after it, very pleased, and you ride out of the field without a scratch." } }],
      },
    ],
  },
  {
    id: "s1-hazard-rust-squall-lamps", pool: "hazard", hazard: "rust-squall", stages: [1],
    title: "Rust Squall", art: "rust-squall",
    text: "The squall comes along the carriers like weather in an old story: a brown-orange wall of oxide dust off a thousand kilometres of cable, lamps showing through it as smudged amber dots. It gets into everything. It gets into the air plant. {crew} says it tastes like sucking a coin.\n\nThe machines out here have no paint left, and the squall eats them slowly. You still have paint. For now.\n\nIn the dust ahead, a rust-eaten leech hangs from the carrier, half gone.",
    choices: [
      {
        text: "Run straight through at speed.",
        outcomes: [{ outcome: { text: "The car comes out the far side orange from nose to keel and a little thinner in places. The air plant coughs for an hour.", resources: { hull: [-3, -1] } } }],
      },
      {
        text: "Seal the vents and wait it out at the relay.",
        outcomes: [{ outcome: { text: "You sit in the switch house with the vents shut and the lamp on while the squall goes over. It takes most of a shift. The Seal does not wait for weather.", seal: -1 } }],
      },
      {
        text: "Strip the rust-eaten leech while the squall blinds it.",
        outcomes: [
          { weight: 2, outcome: { text: "It is more rust than leech. {crew} goes out on a line and comes back with its buffer valves and an orange face.", reward: "low", resources: { hull: -1 } } },
          { weight: 1, outcome: { text: "It is less rust than it looked.", combat: { enemy: "packet-leech", intro: "The half-eaten leech turns in the squall and takes hold." } } },
        ],
      },
      {
        text: "Find the clear lane in the dust.", blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: { text: "The Listening Post finds a lane where the wind has cleared the dust off the carrier. You ride through the squall in a tunnel of clean air, and come out with your paint on." } }],
      },
    ],
  },
  {
    id: "s1-hazard-rust-squall-prophet", pool: "hazard", hazard: "rust-squall", stages: [1],
    title: "The Mast in the Squall", art: "rust-squall",
    text: "Inside the squall a warning lamp is turning, and a horned mast is shouting into the dust at the top of its voice. CORROSION WARNING. CORROSION WARNING.\n\nThe Rust Prophet has finally got the weather it always said was coming, and it has never sounded happier. Its horns are aimed along your carrier.",
    choices: [
      {
        text: "Silence it in the squall.",
        outcomes: [{ outcome: { combat: { enemy: "rust-prophet", intro: "CORROSION CONFIRMED. ALL TRAFFIC WILL BE INFORMED." } } }],
      },
      {
        text: "Douse the lamps and slip past lamp-dark.", blue: true, req: { system: { id: "veil", level: 1 } },
        outcomes: [
          { weight: 2, outcome: { text: "Every lamp out, every emission quiet. The mast shouts its warning at the empty dust where the car was, and keeps shouting it long after you have gone." } },
          { weight: 1, outcome: { text: "The squall scours the soot off the cupola and the lamp glass catches the warning light.", combat: { enemy: "rust-prophet", intro: "It has seen you, and it has a great deal to tell you." } } },
        ],
      },
      {
        text: "Answer it: warning received.",
        outcomes: [
          { weight: 1, outcome: { text: "WARNING ACKNOWLEDGED. THANK YOU. The mast goes back to shouting at the weather, which has earned it more than you have." } },
          { weight: 2, outcome: { text: "ACKNOWLEDGEMENT FROM UNKNOWN SENDER NOT ACCEPTED.", combat: { enemy: "rust-prophet", intro: "It repeats the warning, louder." } } },
        ],
      },
    ],
  },
  {
    id: "s1-hazard-sun-glare-curtain", pool: "hazard", hazard: "sun-glare", stages: [1],
    title: "Sun-Side", art: "sun-glare",
    text: "The carrier swings round to the sun side of the ring, and the Reach turns into a mirror. Every copper plate, every green-crusted cable, throws the light back at you. The cab window goes white. Somewhere aft, a curtain starts to smoke.\n\n\"Is that ours,\" says {crew}. It is.",
    choices: [
      {
        text: "Put out the curtain and push on.",
        outcomes: [
          { weight: 2, outcome: { text: "Out with a blanket and a great deal of language. The curtain is lost. So is some wiring behind it.", systemDamage: { system: "random", amount: 1 } } },
          { weight: 1, outcome: { text: "Out with a blanket. {crew} singes both hands doing it and is very brave about it for nearly a minute.", crewDamage: { amount: 10, who: "one" } } },
        ],
      },
      {
        text: "Soot the cab window with galley grease and ride half-blind.",
        outcomes: [{ outcome: { text: "It works, mostly. The car rides the sun side with a window like a smoked lens, and the only thing that burns is dinner." } }],
      },
      {
        text: "Let the Sprinkler Runbook deal with it.", blue: true, req: { augment: "sprinkler-runbook" },
        outcomes: [{ outcome: { text: "Procedure 31, step two onward. The sprinklers get the curtain before anyone can reach it. The galley floor is wet for a day, which is the correct amount of wet." } }],
      },
    ],
  },
  {
    id: "s1-hazard-sun-glare-ambush", pool: "hazard", hazard: "sun-glare", stages: [1],
    title: "Out of the Sun", art: "sun-glare",
    text: "Something is coming down the parallel carrier with the sun directly behind it, which is either a coincidence or a scavenger who knows their business. By the time the Listening Post can make it out it is alongside: a salvaged car with its nets already swinging.\n\n\"Morning,\" says a voice on the radio. \"Hot one, isn't it.\"",
    choices: [
      {
        text: "Fight them in the glare.",
        outcomes: [{ outcome: { combat: { enemy: "scavenger-skiff", surrenderable: true, intro: "Their emitters come at you out of the white. Yours go back into it." } } }],
      },
      {
        text: "Offer them salvage to find somebody else (20 salvage).", req: { resources: { salvage: 20 } },
        outcomes: [{ outcome: { text: "\"Very reasonable,\" says the voice. The salvage goes across on a line and the skiff slides back into the glare it came out of.", resources: { salvage: -20 } } }],
      },
      {
        text: "Read their power through the glare and aim for the trolley.", blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          { weight: 2, outcome: { text: "One bolt, placed exactly. Their trolley's grip starts to smoke, and their captain has the good sense to brake before it does anything worse. They leave some salvage hanging on the carrier as a peace offering, which is also an admission.", reward: "low" } },
          { weight: 1, outcome: { text: "The glare throws the bolt wide.", combat: { enemy: "scavenger-skiff", surrenderable: true, intro: "\"Rude,\" says the voice." } } },
        ],
      },
    ],
  },

  // ─── Benches ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s1-bench-hobb", pool: "bench", stages: [1], unique: true, weight: 2,
    title: "Bench Nine", art: "relay-bench", portrait: "bench-keeper", speaker: "Hobb Tallis",
    text: "Bench Nine is a switch house with a lamp in the window and a man in the doorway, in a cable-crew jacket older than most of your crew. He watches the car come in, then turns and says something to the kettle on the shelf behind him.\n\n\"Told you,\" says Hobb Tallis. \"Lampers. Sit down, the lot of you. The kettle's been waiting. So has the press.\"\n\nOn the end of his bench is a brass stamp press, lever oiled, date wheel set to a day thirty-one years ago.",
    choices: [
      {
        text: "Accept the tea, the bench and the mending.",
        outcomes: [{ outcome: { text: "Hobb mends the car while you drink his tea, and tells the kettle everything he is doing, in case it is interested. It seems to be.", heal: true, repair: 4, codex: "people-hobb" } }],
      },
      {
        text: "Ask him to re-stamp the connection.",
        outcomes: [{ outcome: { text: "\"Put the card in,\" says Hobb. \"Hello,\" he tells the press. The press does not answer, because it is a press, but Hobb waits for it anyway, out of courtesy. Then he pulls the lever twice. \"There. Two more. Don't waste them on the Regent.\"", resources: { ttl: 2 }, codex: "runbook-restamping" } }],
      },
      {
        text: "Ask about the date on the press.",
        outcomes: [{ outcome: { codex: "people-hobb", next: "s1-bench-hobb-varga" } }],
      },
      {
        text: "Show him Varga's crimper.", blue: true, req: { flag: "pell-crimper" },
        outcomes: [{ outcome: { codex: "people-hobb", next: "s1-bench-hobb-shown" } }],
      },
    ],
  },
  {
    id: "s1-bench-hobb-varga", pool: "scripted", stages: [1],
    title: "The Second Drawer", art: "relay-bench", portrait: "bench-keeper", speaker: "Hobb Tallis",
    text: "\"The day Varga went down,\" says Hobb. \"Best hands in the Reach. Left me the good crimper. Second drawer, he said. It's in the queue, the message, if you don't believe me.\"\n\nHe looks at the second drawer. It is empty.\n\n\"Pell,\" he tells the kettle. The kettle says nothing, which Hobb seems to find supportive.",
    choices: [
      {
        text: "Tell him you'll keep an eye out for it.",
        outcomes: [{ outcome: { text: "\"You won't have to look far,\" says Hobb. \"It'll be on a hook with a price on it.\" He pours you another cup anyway, and mends your plating while it cools. When you go, he makes you take his spare kettle bench, bolts and all. \"For the next lot,\" he tells the kettle, \"and the lot after.\"", fragment: "f1-varga", codex: "people-varga", heal: true, repair: 3, module: "kettle-bench" } }],
      },
      {
        text: "Ask for the stamp while he's in the mood.",
        outcomes: [{ outcome: { text: "He pulls the lever so hard the date wheel turns over for the first time in thirty-one years. He looks at it, surprised, and does not turn it back.", fragment: "f1-varga", codex: "people-varga", resources: { ttl: 2 } } }],
      },
    ],
  },
  {
    id: "s1-bench-hobb-shown", pool: "scripted", stages: [1], requires: { flag: "pell-crimper" },
    title: "That's His", art: "relay-bench", portrait: "bench-keeper", speaker: "Hobb Tallis",
    text: "Hobb takes the crimper in both hands and turns it over under the lamp. He finds the nick in the jaw, the one only the owner would know about, and runs his thumb across it.\n\n\"That's his,\" he says. \"That's Varga's.\" A long pause. \"She sold it to you.\"\n\nThe kettle begins, very quietly, to boil.",
    choices: [
      {
        text: "Offer it back to him.",
        outcomes: [{ outcome: { text: "He holds it a moment longer, then puts it back in your hands and closes your fingers round it. \"No,\" he says. \"He'd want it used. Not lent.\" Then he re-stamps the connection three times, which is against every rule he has, and tells the kettle not to tell anyone.", fragment: "f1-varga", codex: "people-varga", resources: { ttl: 3 } } }],
      },
      {
        text: "Tell him Pell swears she never borrowed it.",
        outcomes: [{ outcome: { text: "Hobb laughs until he has to sit down on his own bench. It is a good laugh, and it goes on a long time, and when it stops he mends the whole car without being asked, humming.", fragment: "f1-varga", codex: "people-varga", repair: "full", heal: true } }],
      },
    ],
  },
  {
    id: "s1-bench-drawer", pool: "bench", stages: [1],
    title: "The Keeper's Drawer", art: "relay-bench",
    text: "Nobody lives at this bench any more, but somebody kept it. A lamp on a timer comes on as the car pulls in. The tools are laid out in order. There is a drawer of spares, sorted into trays, each tray labelled in pencil by what it can still save: PUMPS. LAMPS. ALMOST ANYTHING. NOTHING, PROBABLY.\n\nA card on the drawer says: take what you need, leave what you can.",
    choices: [
      {
        text: "Take what you need.",
        outcomes: [{ outcome: { text: "Two spares from ALMOST ANYTHING and an hour with the bench's good tools.", resources: { spares: 2 }, repair: 3 } }],
      },
      {
        text: "Take what you need and leave parts behind (10 salvage).", req: { resources: { salvage: 10 } },
        outcomes: [{ outcome: { text: "You sort your leftovers into the right trays, carefully, the way the keeper would have. Under the card on the drawer is a second card, and it says: thank you. Everyone feels better than a card should make them feel.", resources: { salvage: -10, spares: 2 }, repair: 5, heal: true } }],
      },
      {
        text: "Look in the tray marked NOTHING, PROBABLY.",
        outcomes: [
          { weight: 2, outcome: { text: "A spring, a button, a lamp fuse and a note that says told you." } },
          { weight: 1, outcome: { text: "Under a heap of odd bolts is something that is very much not nothing. The pencil on the tray was being modest.", reward: "med" } },
          { weight: 1, outcome: { text: "At the bottom of the tray, wrapped in a dock-office tablecloth, is a whole refit module, sockets greased, labelled in the same pencil: NOTHING, PROBABLY. It is something.", module: "random" } },
        ],
      },
    ],
  },
  {
    id: "s1-bench-half-repair", pool: "bench", stages: [1],
    title: "A Repair Left Half Finished", art: "relay-bench",
    text: "The work lamp over this bench shines on a trolley bearing, stripped and cleaned and half put back together, the rest of the parts laid out in the order they go in. Whoever was doing it stopped in the middle and never came back.\n\nThe bearing is from a lamplighter-pattern car. It is exactly the size of yours.",
    choices: [
      {
        text: "Finish the repair and fit the bearing.",
        outcomes: [{ outcome: { text: "The last parts go in the order they were laid out. The bearing runs sweet. {ship}'s trolley stops making the noise nobody had mentioned.", repair: 6 } }],
      },
      {
        text: "Finish it and leave it for the next crew.",
        outcomes: [{ outcome: { text: "You finish the bearing, wrap it in an oily rag and leave it on the bench under the lamp, with a card: fits a lamplighter. Some things you do for the next shift. The crew rest easy that night.", heal: true } }],
      },
      {
        text: "Let {crew:rigger} finish it.", blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: { text: "{crew:rigger} finishes the bearing in half the time and fits it without being told where it goes. Afterwards it stands looking at the bench for a while. It says it remembers this bearing. It cannot say from where.", repair: 6, heal: true } }],
      },
    ],
  },
  {
    id: "s1-bench-press", pool: "bench", stages: [1],
    title: "A Press That Wants a Hello", art: "relay-bench",
    text: "The bench is dark, but the stamp press on the end of it has its own small lamp, and a brass voice-grille beside it, and a card taped above the grille in careful capitals: SAY IT PROPERLY.\n\nIt is the relay's re-stamping press. It still works. It still wants the greeting, all three lines, before it will vouch for anyone.",
    choices: [
      {
        text: "Say it properly.",
        outcomes: [
          { weight: 3, outcome: { text: "Hello. The press's lamp brightens. I hear you. I hear you hear me. The lever comes down twice by itself, heavy and certain, and the connection card comes out warm.", resources: { ttl: 2 }, codex: "runbook-restamping" } },
          { weight: 1, outcome: { text: "Somebody says the second line slightly wrong. The press thinks about it for a long time, then stamps once, grudgingly.", resources: { ttl: 1 }, codex: "runbook-restamping" } },
        ],
      },
      {
        text: "Let {crew:linefolk} say it the way the school taught it.", blue: true, req: { species: "linefolk" },
        outcomes: [{ outcome: { text: "{crew:linefolk} says it slowly, the way children learn it before they can read, with the little pause in the middle. The press stamps three times, and then, as if it could not help itself, once more for luck. The last one does not take, but it is the thought.", resources: { ttl: 3 }, codex: "runbook-restamping" } }],
      },
      {
        text: "Rest here a while.",
        outcomes: [{ outcome: { text: "The press's little lamp is company enough. You sleep in the switch house in shifts.", heal: true } }],
      },
    ],
  },
  {
    id: "s1-bench-sleeper", pool: "bench", stages: [1], unique: true,
    title: "Somebody Asleep at the Bench", art: "relay-bench", portrait: "recruit-linefolk-b", speaker: "Ottilie Crimp",
    text: "There is a cot at this bench, and someone in it, under three blankets and a cable-crew coat, snoring like a trolley with a bad bearing. The kettle beside her is still warm.\n\nShe wakes when the car's lamp crosses the window, sits up, and looks at you with great suspicion.\n\n\"If you're the Seal,\" says Ottilie Crimp, \"you're very small.\"",
    choices: [
      {
        text: "Share her kettle and the bench.",
        outcomes: [{ outcome: { text: "She pours, and complains about the Seal, the cold, the tea, the Copper Market's prices and a man called Hobb, in that order. It is the most restful hour anyone has had since Relay Seven.", heal: true, repair: 3 } }],
      },
      {
        text: "Ask if she wants to come.",
        outcomes: [
          { weight: 2, outcome: { text: "\"To the Heart,\" she says. \"In that.\" She looks at the car. She looks at her cot. She looks at the car again. \"Somebody should keep you lot fed.\" She brings the kettle.", crewJoin: { species: "linefolk", name: "Ottilie Crimp" } } },
          { weight: 1, outcome: { text: "\"No,\" she says. \"Somebody has to keep this kettle warm for the next lot.\" She fills your flask and sends you off.", heal: true } },
        ],
      },
      {
        text: "Tell her the Seal is two relays behind you.",
        outcomes: [{ outcome: { text: "She is out of the cot and packing before you finish the sentence. On her way out she presses a bag of spares on you. \"Used to be my husband's,\" she says. \"He'd want them to go further than me.\"", resources: { spares: 2 } } }],
      },
    ],
  },
  {
    id: "s1-bench-shelf", pool: "bench", stages: [1],
    title: "Things Left Behind", art: "relay-bench",
    text: "There is a shelf over this bench, and every crew that has passed has left something on it. A scarf. A spoon. A child's drawing of a relay with every lamp lit. A tin of payload shells with a note under it. A card in faded pencil: gone on, back soon.\n\nNobody has come back for any of it. That was never the point.",
    choices: [
      {
        text: "Leave a spare on the shelf for the next crew (1 spare).", req: { resources: { spares: 1 } },
        outcomes: [{ outcome: { text: "Your spare goes on the shelf between the spoon and the drawing. The shelf is a little fuller than it was. The bench's tools are good, and you use them.", resources: { spares: -1 }, repair: 4, heal: true } }],
      },
      {
        text: "Read the notes.",
        outcomes: [{ outcome: { text: "Gone on, back soon. Took the good pliers, sorry. Kettle leaks, use the blue one. Tell Pell I paid. Got as far as the next relay, then the next. The notes stop being sad about halfway down the pile and become simply practical, which is how the Night Shift says it loves you.", heal: true } }],
      },
      {
        text: "Take the tin of payload shells.",
        outcomes: [{ outcome: { text: "The note under the tin says: for whoever needs them more than I did. You decide that is you, and hope it is true.", resources: { payloads: 2 } } }],
      },
    ],
  },

  // ─── Markets ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s1-market-pell", pool: "market", stages: [1], weight: 2, music: "exchange",
    title: "Pell's Stall", art: "pell-stall", portrait: "pell", speaker: "Pell",
    text: "The Copper Market climbs the spire top in welded containers, lamp-strung, noisy, smelling of solder and soup. Pell's stall is the biggest, three landings up, under a hand-painted sign: PELL · SALVAGE · FAIR PRICES · NO LENDING.\n\nPell looks up from her ledger at the car, down at the ledger, and back up.\n\n\"Dock Twelve's grip,\" she says. \"Riding nicely. The Night Shift still owe me for it, but I don't hold that against the car.\"\n\nBehind her, on its own hook, hangs one very good crimper.",
    choices: [
      {
        text: "Trade.",
        outcomes: [{ outcome: { text: "\"Everything's fair,\" says Pell. \"Some things are fairer than others.\"", store: true, codex: "places-copper-market" } }],
      },
      {
        text: "Ask about the crimper on its own hook.", req: { notFlag: "pell-crimper" }, hideIfUnmet: true,
        outcomes: [{ outcome: { codex: "people-pell", next: "s1-market-pell-crimper" } }],
      },
      {
        text: "Ask how she came to know Dock Twelve.", req: { notFlag: "pell-letter" }, hideIfUnmet: true,
        outcomes: [{ outcome: { codex: "people-pell", next: "s1-market-pell-tally" } }],
      },
      {
        text: "Settle what the Night Shift owe for the grip (20 salvage).", req: { resources: { salvage: 20 }, notFlag: "s1-grip-paid" }, hideIfUnmet: true,
        outcomes: [{ outcome: { text: "Pell takes the salvage, finds the page, and writes PAID beside the grip, and underlines it twice. \"Mostly,\" she adds, from habit, and then crosses that out too. It is the first time anybody has seen her cross anything out.", resources: { salvage: -20 }, flags: ["s1-grip-paid"], codex: "people-pell", store: true } }],
      },
    ],
  },
  {
    id: "s1-market-pell-crimper", pool: "scripted", stages: [1], music: "exchange",
    title: "One Very Good Crimper", art: "pell-stall", portrait: "pell", speaker: "Pell",
    text: "\"That,\" says Pell, \"is A. Varga's crimper. Cable crew. Best hands in the Reach. He went down on the lifts and left it to Hobb Tallis, who keeps Bench Nine and has never forgiven me.\"\n\n\"I did not borrow it,\" she adds. \"Nobody could find Hobb for a week, so I kept it safe. That's different. It's for sale, if you like. Seventy. I don't lend.\"",
    choices: [
      {
        text: "Buy Varga's crimper (70 salvage).", req: { resources: { salvage: 70 } },
        outcomes: [{ outcome: { text: "Pell takes it off its hook, wipes the jaws on her sleeve, and hands it over handle first. \"Crimp a plate after every switch and she'll hold,\" she says. \"Don't lend it.\" She writes the sale in the ledger in very small letters, as if Hobb might read it.", resources: { salvage: -70 }, augment: "vargas-crimper", flags: ["pell-crimper"], codex: "people-varga" } }],
      },
      {
        text: "Ask why Varga didn't want it lent to her.",
        outcomes: [{ outcome: { text: "Pell laughs, a short surprised bark. \"Because I'd never have given it back,\" she says. \"He knew me. Everyone knew me.\" She turns the ledger round to the trading pages. \"Buy something.\"", codex: "people-varga", store: true } }],
      },
      {
        text: "Back to the stall.",
        outcomes: [{ outcome: { store: true } }],
      },
    ],
  },
  {
    id: "s1-market-pell-tally", pool: "scripted", stages: [1], music: "exchange",
    title: "The Tally", art: "pell-stall", portrait: "pell", speaker: "Pell",
    text: "Pell turns the ledger round so you can see the first page. It is not salvage. It is a list of lift cars, numbered, and beside each one a count in small neat figures, car after car, down the page and onto the next.\n\n\"Tally clerk, Dock Twelve,\" she says. \"Somebody had to count them on. I counted every one.\" She closes the book. \"Lost count at the end. It happens.\"\n\nThen she takes a sheet from under the ledger. It is an invoice. On the back of it she has written a letter, folded twice.",
    choices: [
      {
        text: "Offer to carry the letter to the Heart.",
        outcomes: [{ outcome: { text: "\"It's for Varga,\" says Pell, handing it over. \"Put it in the queue with the rest when you get there. He owes me a coffee, and I want it in writing.\" She does not look at you while she says it. Then she opens the ledger to the trading pages, briskly.", fragment: "f1-tally", flags: ["pell-letter"], store: true } }],
      },
      {
        text: "Tell her you can't promise it will ever arrive.",
        outcomes: [{ outcome: { text: "\"Nobody can,\" says Pell. \"That's never stopped anybody sending.\" She puts the letter back under the ledger for the next crew, and opens the trading pages.", fragment: "f1-tally", store: true } }],
      },
    ],
  },
  {
    id: "s1-market-crane-stall", pool: "market", stages: [1], music: "exchange",
    title: "A Stall on a Hook", art: "copper-market", speaker: "Stallholder",
    text: "The exchange at this relay hangs from a crane: a single shipping container on a hook, swung out over the carrier so it hangs level with your cab window. A hatch in its side opens, and a woman in a welder's apron leans out on her elbows.\n\n\"Mind the gap,\" she says. \"It's four kilometres.\"\n\nShe lowers a basket on a rope for your salvage, and a clipboard for your order.",
    choices: [
      {
        text: "Trade.",
        outcomes: [{ outcome: { text: "The basket goes up and down all afternoon.", store: true } }],
      },
      {
        text: "Mention that Pell says you're good for it.", blue: true, req: { flag: "s1-grip-paid" },
        outcomes: [{ outcome: { text: "\"Pell has never said that about anybody,\" says the stallholder. \"Including her own mother.\" She sends down two spares in the basket, on the house, out of pure astonishment.", resources: { spares: 2 }, store: true } }],
      },
      {
        text: "Ask for a re-stamp (25 salvage).", req: { resources: { salvage: 25 } },
        outcomes: [{ outcome: { text: "The container has a dock-office press bolted to its floor. You hear the lever twice through the plating. The receipt comes down in the basket.", resources: { salvage: -25, ttl: 2 }, store: true } }],
      },
      {
        text: "Buy the freight car hanging off the crane's other hook (60 salvage).", req: { resources: { salvage: 60 } },
        outcomes: [{ outcome: { text: "\"She's sound,\" says the stallholder, \"mostly.\" The crane swings the freight car down onto the carrier behind you and holds it steady while {crew} couples it on, swearing gently at the pins. It rides well. It rattles a little. Everything in the Reach rattles a little.", resources: { salvage: -60 }, car: "freight-car", store: true } }],
      },
    ],
  },
  {
    id: "s1-market-skiff-exchange", pool: "market", stages: [1], music: "exchange",
    title: "Three Skiffs Tied Together", art: "scavenger-skiff-hail",
    text: "Three scavenger skiffs are lashed together on a side carrier with a plank across the gap, and on the plank is a trestle table, and on the table is everything the Reach gave them this month: cable, lenses, a jar of assorted bolts, two payload shells and a lamp that works if you hold it at an angle.\n\nThe crews watch you come in. Nobody reaches for anything. It is a market, today. Tomorrow it might be something else.",
    choices: [
      {
        text: "Trade.",
        outcomes: [{ outcome: { text: "Everyone is very polite. Everyone keeps one hand free.", store: true } }],
      },
      {
        text: "Let them hear you were civil to the Short Measure.", blue: true, req: { flag: "s1-tollands-friendly" },
        outcomes: [{ outcome: { text: "One of the Tolland sisters is here, at the far end of the table. She nods at you. After that, somebody slides two payload shells across the plank without being asked, and the prices go down a little.", resources: { payloads: 2 }, store: true } }],
      },
      {
        text: "Buy a stamp off the trestle (20 salvage).", req: { resources: { salvage: 20 } },
        outcomes: [
          { weight: 3, outcome: { text: "The stamp is genuine, the press behind the trestle is sound, and the relay honours it.", resources: { salvage: -20, ttl: 2 }, store: true } },
          { weight: 1, outcome: { text: "The press behind the trestle is tired. It manages one good stamp and a smudge.", resources: { salvage: -20, ttl: 1 }, store: true } },
        ],
      },
    ],
  },
  {
    id: "s1-market-lower-landings", pool: "market", stages: [1], music: "exchange",
    title: "The Lower Landings", art: "copper-market",
    text: "Pell's stall is three landings up and the queue for it reaches the crane. Down here on the lower landings the Copper Market is quieter: a soup stall, a man who sharpens things, a woman who sells only lenses and will not discuss other products, and a Salvage Exchange run out of an old ticket office by two brothers who finish each other's sums.\n\nThe soup smells very good.",
    choices: [
      {
        text: "Trade at the Exchange.",
        outcomes: [{ outcome: { text: "\"Forty for the lot,\" says one brother. \"Minus handling,\" says the other.", store: true } }],
      },
      {
        text: "Buy soup for the whole crew (10 salvage).", req: { resources: { salvage: 10 } },
        outcomes: [{ outcome: { text: "It is copper-pot soup, the Reach kind, with something in it that was probably a vegetable once. Everybody has seconds. Everybody feels better.", resources: { salvage: -10 }, heal: true, store: true } }],
      },
      {
        text: "Buy the bunk car the brothers keep coupled at the landing (50 salvage).", req: { resources: { salvage: 50 } },
        outcomes: [{ outcome: { text: "\"Six bunks,\" says one brother. \"Five and a half,\" says the other. It is a lift attendants' rest car from before the Fault, curtains and all, and the brothers help you couple it on behind with the air of men glad to see the back of it.", resources: { salvage: -50 }, car: "bunk-car", store: true } }],
      },
      {
        text: "Let {crew:rigger} browse the lens stall.", blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: { text: "The lens woman looks at {crew:rigger}'s teal lens for a long time, then at her own stock, then back. She gives it a spare lens for nothing, the way you might give a child a sweet, and will not discuss it.", resources: { spares: 1 }, store: true } }],
      },
    ],
  },

  // ─── Empty ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s1-empty-green-loops", pool: "empty", stages: [1], weight: 2,
    title: "Verdigris", art: "spire-top",
    text: "Nothing here but the carrier, sagging away ahead in a green loop a kilometre long, and the cloud sea under it, and the trolley's hum.\n\n{crew} counts the relays left on the chart and gets a different number each time.",
    choices: [{ text: "Ride on.", outcomes: [{ outcome: { text: "The next relay's lamp comes up out of the green, right where the chart said, give or take." } }] }],
  },
  {
    id: "s1-empty-crane", pool: "empty", stages: [1],
    title: "A Crane on Schedule", art: "rust-yard",
    text: "On the spire top across the gap, a gantry crane rolls to the end of its rail, lifts a container, turns, sets it down exactly where it was, and rolls back. It does this twice while you watch.\n\nSomewhere in its memory is a schedule, and it is keeping it.",
    choices: [
      { text: "Ride on.", outcomes: [{ outcome: { text: "Behind you, the container goes up again." } }] },
      { text: "Wave.", outcomes: [{ outcome: { text: "The crane does not wave back. It is busy. {crew} waves anyway, for both of you." } }] },
    ],
  },
  {
    id: "s1-empty-outer-gates", pool: "empty", stages: [1],
    title: "The Outer Gates", art: "debris-field",
    text: "From this relay you can see all the way back to the outer gates: great ring gates that used to face away from the world, broken now, standing against the stars like the ribs of something enormous.\n\nEverything that could not be delivered used to go out through them. Nobody ever found out where.",
    choices: [
      { text: "Look for a while.", outcomes: [{ outcome: { text: "Nobody says anything. Someone puts the kettle on. The gates stay broken.", codex: "places-outer-relays" } }] },
      { text: "Ride on.", outcomes: [{ outcome: { text: "You turn the car toward the Copper Gate, which is at least the right way round." } }] },
    ],
  },
  {
    id: "s1-empty-switch-house", pool: "empty", stages: [1],
    title: "A Dark Switch House", art: "relay-switchyard",
    text: "The relay is dark, but it hears your hello and throws the switch like any other. There is a note chalked on the switch-house door, in a cable-crew hand: GONE DOWN. KEY UNDER THE MAT.\n\nThere is no mat.",
    choices: [
      { text: "Ride on.", outcomes: [{ outcome: { text: "The switch throws. The note stays." } }] },
      {
        text: "Look under where a mat would be.",
        outcomes: [
          { weight: 2, outcome: { text: "Under where a mat would be is a key, a key tag that says BACK DOOR, and no back door. {crew} pockets them anyway.", resources: { salvage: 5 } } },
          { weight: 1, outcome: { text: "Nothing. Somebody got here first, thirty years ago, and left a smiley face in chalk." } },
        ],
      },
    ],
  },
  {
    id: "s1-empty-departures", pool: "empty", stages: [1],
    title: "Departures", art: "lift-head",
    text: "The relay sits beside a lift head, and the lift head's departure board is still lit, amber letters on black:\n\nCAR 31 DEPARTED. CAR 32 DEPARTED. CAR 33 DEPARTED. CAR 34 BOARDING.\n\nIt has said BOARDING for thirty-one years.",
    choices: [{ text: "Ride on.", outcomes: [{ outcome: { text: "Nobody looks back at the board. Everybody looks back at the board." } }] }],
  },
  {
    id: "s1-empty-heartbeat", pool: "empty", stages: [1],
    title: "Somebody Still Counting", art: "relay-switchyard",
    text: "An automatic lamp on the switch house is blinking. Once. A long pause. Once. The same rhythm, over and over, patient as a clock.\n\n{crew} says it before anyone else can. It is the heartbeat, the hourly pulse the Heart used to send round the whole Line, being kept by one small lamp on its own, to nobody.",
    choices: [
      { text: "Count with it.", outcomes: [{ outcome: { text: "The Listening Post picks up the message it sends with every blink. It has been sending it for thirty-one years.", fragment: "f1-heartbeat" } }] },
      { text: "Ride on.", outcomes: [{ outcome: { text: "The lamp blinks behind you, once, and once." } }] },
    ],
  },
  {
    id: "s1-empty-joke", pool: "empty", stages: [1],
    title: "Between Relays", art: "tender-radio",
    text: "Nothing out here. The kettle goes on. {crew} tells the one about the lamper, the leech and the Copper Market, which has no punchline, only a price, and which lampers have found funny for two hundred years.\n\nNobody else aboard is a lamper. Everybody laughs anyway, at the wrong moment, which is somehow funnier.",
    choices: [{ text: "Ride on.", outcomes: [{ outcome: { text: "The trolley hums. The carrier runs on. Someone is still laughing at the next relay." } }] }],
  },

  // ─── Sealed ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s1-sealed-lattice", pool: "sealed", stages: [1], weight: 2,
    title: "Sealed", art: "sealed-relay",
    text: "The Seal got here first. The relay is closed behind a black lattice with a thin red seam of light running along every joint, and the switch-house lamp is a dim glow somewhere behind it. Two Quarantine Drones hold station over the yard on idling rotors.\n\nROUTE NOT CONFIRMED SAFE. RELAY SEALED. HOLDING.\n\nThe switchgear still answers a hello. The drones will read anything that arrives as a breach.",
    choices: [
      {
        text: "Say hello and fight through.",
        outcomes: [{ outcome: { combat: { enemy: "quarantine-drone", noReward: true, intro: "The drones tilt toward the car, clamps opening." } } }],
      },
      {
        text: "Douse every lamp and ride through lamp-dark.", blue: true, req: { system: { id: "veil", level: 1 } },
        outcomes: [
          { weight: 2, outcome: { text: "Every lamp out. The car goes through the yard like a shadow through a shadow, and the drones hold station over nothing." } },
          { weight: 1, outcome: { text: "The switch throws with a clank the veil cannot hide.", combat: { enemy: "quarantine-drone", noReward: true, intro: "The drones turn on the sound." } } },
        ],
      },
    ],
  },
  {
    id: "s1-sealed-cut-carrier", pool: "sealed", stages: [1],
    title: "A Cut Carrier", art: "carrier-cut",
    text: "The carrier you came in on is gone behind you, cut at the relay, its end hanging over the cloud sea. The relay itself is sealed in lattice and red seams, and a Quarantine Drone lifts off the switch-house roof as you come in, clamps opening.\n\nThere is no way back. There never was. The Seal only makes it obvious.",
    choices: [
      {
        text: "Clear the drone off the switch.",
        outcomes: [{ outcome: { combat: { enemy: "quarantine-drone", noReward: true, intro: "ROUTE NOT CONFIRMED SAFE. SEALING." } } }],
      },
      {
        text: "Take the switch at full speed and hope.",
        outcomes: [
          { weight: 1, outcome: { text: "The drone's clamps close on the place the car was a second ago. You take the switch at a run and it costs you some plating on the frog.", resources: { hull: -3 } } },
          { weight: 1, outcome: { text: "The drone is faster than hope.", resources: { hull: -2 }, combat: { enemy: "quarantine-drone", noReward: true, intro: "Its clamps are on the keel." } } },
        ],
      },
    ],
  },
  {
    id: "s1-sealed-bench", pool: "sealed", stages: [1],
    title: "A Bench Behind the Lattice", art: "sealed-relay",
    text: "There was a bench here. You can see its lamp through the lattice, still on, and the shape of a kettle on a shelf, and a cup beside it. Somebody left the lamp on for the next shift, and then the Seal came and closed the shift.\n\nA Quarantine Drone hangs in front of the window, red seam glowing, as if it is guarding the kettle.",
    choices: [
      {
        text: "Fight the drone.",
        outcomes: [{ outcome: { combat: { enemy: "quarantine-drone", noReward: true, intro: "The drone turns from the window to you." } } }],
      },
      {
        text: "Leave the kettle to it and take the switch.",
        outcomes: [
          { weight: 1, outcome: { text: "The drone does not move from the window. You take the switch quietly, and nobody looks at the lamp as you go, because it is easier." } },
          { weight: 2, outcome: { text: "The drone follows you to the switch.", combat: { enemy: "quarantine-drone", noReward: true, intro: "ROUTE NOT CONFIRMED SAFE." } } },
        ],
      },
    ],
  },
  {
    id: "s1-sealed-rotation", pool: "sealed", stages: [1],
    title: "Drones on Rotation", art: "sealed-relay",
    text: "Three Quarantine Drones patrol this sealed relay in a slow triangle, each pausing over the switch house for exactly eleven seconds before it moves on. The Listening Post times them twice to be sure. Eleven seconds, every time.\n\nThe Seal is patient, and it is precise. Eleven seconds is not very long.",
    choices: [
      {
        text: "Fight through.",
        outcomes: [{ outcome: { combat: { enemy: "quarantine-drone", noReward: true, intro: "The triangle breaks. All three come for the car." } } }],
      },
      {
        text: "Time the gap and take the switch inside it.", blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          { weight: 3, outcome: { text: "Hello, I hear you, I hear you hear me, switch. You are through in ten seconds, with one to spare, and nobody breathes for all ten." } },
          { weight: 1, outcome: { text: "Twelve seconds. One too many.", combat: { enemy: "quarantine-drone", noReward: true, intro: "The drone over the switch house turns." } } },
        ],
      },
      {
        text: "Put {crew:courier} on the helm for the dash.", blue: true, req: { species: "courier" },
        outcomes: [
          { weight: 2, outcome: { text: "{crew:courier} takes the car in like a letter through a door slot: fast, flat and exactly where it needs to go. The drones never turn." } },
          { weight: 1, outcome: { text: "Fast, but not fast enough.", combat: { enemy: "quarantine-drone", noReward: true, intro: "Three red seams swing toward the car." } } },
        ],
      },
    ],
  },

  // ─── Exit: the Copper Gate ───────────────────────────────────────────────────────────────────────────────
  {
    id: "s1-exit-copper-gate", pool: "exit", stages: [1], music: "iron-regent",
    title: "The Copper Gate", art: "copper-gate",
    text: "Every carrier in the Reach ends here. The Copper Gate stands across the ring, two gate wings the height of a spire top, closed, and the carriers run into the gap between them and stop at a crowned iron bulk built into the frame. The crown is tarnished brass. It is the only part of the gate that is lit.\n\nBehind you the Seal is cutting the carriers relay by relay. Ahead of you the Iron Regent has held this gate for thirty-one years, and it keeps one law, older than the linefolk.\n\nHALT. COPPER GATE. NO PASSAGE WITHOUT PROOF OF A SECOND WAY HOME.",
    choices: [
      {
        text: "Answer the gate properly. Hello.",
        outcomes: [{ outcome: { codex: "places-copper-gate", next: "s1-exit-greeting" } }],
      },
      {
        text: "Tell it the way home is behind you.",
        outcomes: [{ outcome: { text: "ROUTE BEHIND YOU: SEALED. The Regent checks, carefully, the way it has checked everything for thirty-one years. SECOND ROUTE: NOT SHOWN. PASSAGE REFUSED. DEMONSTRATE.", codex: "places-copper-gate", combat: { enemy: "iron-regent", intro: "The gate wings flex. DEMONSTRATE.", onWin: "s1-exit-after" } } }],
      },
      {
        text: "Charge the mesh and take the gate.",
        outcomes: [{ outcome: { text: "The drive surges. The crown turns toward you like a lamp being lit.", codex: "places-copper-gate", combat: { enemy: "iron-regent", intro: "NO PASSAGE WITHOUT PROOF. THE GATE WILL SEE PROOF.", onWin: "s1-exit-after" } } }],
      },
    ],
  },
  {
    id: "s1-exit-greeting", pool: "scripted", stages: [1], music: "iron-regent",
    title: "I Hear You", art: "copper-gate",
    text: "Hello, says the helm.\n\nThe crown brightens. For a moment the whole gate seems to lean down to listen. I HEAR YOU. The helm answers: I hear you hear me.\n\nROUTE ACKNOWLEDGED. ROUTE SINGLE. A SINGLE ROAD IS A PRAYER. SHOW ME A SECOND WAY HOME.\n\nThe gate wings flex. Deep inside them, pieces of the gate are unfolding on rotors, keyholes lighting one by one.",
    choices: [
      {
        text: "Send a drone down a second carrier and let the gate watch it arrive.", blue: true, req: { system: { id: "drones", level: 1 } },
        outcomes: [{ outcome: { text: "The drone runs the far carrier while the car holds the near one, and arrives at the gate beside you. SECOND ROAD NOTED. The Regent does not open. It does ease the first pressure off your plating, as if to be fair. NOW LOSE THE FIRST.", repair: 5, codex: "machines-gate-wardens", combat: { enemy: "iron-regent", intro: "SECOND ROAD NOTED. NOW LOSE THE FIRST.", onWin: "s1-exit-after" } } }],
      },
      {
        text: "Let {crew:rigger} draw a route the gate has never seen.", blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: { text: "{crew:rigger} projects a route onto the cab window from somewhere inside itself: carriers that are not on any chart, running round the gate on the far side of the ring. It cannot say where it learned them. The Regent studies the route for a long time. ROUTE UNVERIFIED. ROUTE PLAUSIBLE. DEMONSTRATE. The crew breathe easier for having seen it.", heal: true, codex: "runbook-second-way-home", combat: { enemy: "iron-regent", intro: "ROUTE PLAUSIBLE. DEMONSTRATE.", onWin: "s1-exit-after" } } }],
      },
      {
        text: "There is no second way home. Show it the car will keep coming anyway.",
        outcomes: [{ outcome: { text: "A network that can lose any road and still arrive, the Runbook says, is the only kind worth sending anything down. The Regent was built to believe that. So, it turns out, were you.", codex: "runbook-second-way-home", combat: { enemy: "iron-regent", intro: "THEN DEMONSTRATE.", onWin: "s1-exit-after" } } }],
      },
    ],
  },
  {
    id: "s1-exit-after", pool: "scripted", stages: [1], music: "rust-kingdom",
    title: "Passage Granted", art: "copper-gate",
    text: "The crown dims to the colour of old brass. The Regent lowers its gauntlets very slowly, as if it has been holding them up for a long time, and the Gate Wardens fold back into the wings, keyholes going dark.\n\nPASSAGE GRANTED. GOOD ROAD, UNKNOWN SENDER.\n\nWith a sound like a very old door, the gate wings open, and the carriers run on through. Beyond them the light is violet, and a long way off, bells are ringing.",
    choices: [
      {
        text: "Pry a shard loose from the crown.",
        outcomes: [{ outcome: { text: "It comes away in {crew}'s hands, a curved piece of tarnished brass still faintly warm. Proof of a second way home, for later, when you need it. The Regent does not object. It has granted passage. Nothing else is its business now.", augment: "second-way-home", flags: ["guardian-1-ended"], codex: "places-glass-cathedral" } }],
      },
      {
        text: "Strip the fallen Gate Wardens.",
        outcomes: [{ outcome: { text: "The wardens that did not fold back in time hang in the gate wings like pieces of a puzzle. Gate iron, crown brass, rotor motors that will fetch a good price if you ever see a market again.", reward: "high", flags: ["guardian-1-ended"], codex: "places-glass-cathedral" } }],
      },
      {
        text: "Leave the gate whole. Rest in its shadow and mend.",
        outcomes: [{ outcome: { text: "You stop in the open gate for a whole shift. Somebody makes tea. Somebody mends the plating. Nobody says much. When you ride on toward the violet, you leave the Regent exactly as it is, crown and all, holding the gate open now instead of shut.", repair: 10, heal: true, flags: ["guardian-1-ended"], codex: "places-glass-cathedral" } }],
      },
    ],
  },
];
