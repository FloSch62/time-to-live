// Events for every stage: the first hello, cold berths, derelict cars and refits, the Operator on the radio,
// the Lamplighter's own history, and the waiting events for TTL 0 (ids "wait-*", picked by the campaign).
import type { EventDef } from "../../game/types.ts";

export const SHARED_FLAGS: Record<string, string> = {
  "any-hello-refused": "An escort automaton's lens went red at the crew's first hello.",
  "any-lift-family": "Met the family living in a stuck lift car at the top of a shaft.",
};

export const SHARED_EVENTS: EventDef[] = [
  // ─── Waiting for a signal (TTL 0) ────────────────────────────────────────────────────────────────────────
  {
    id: "wait-static", pool: "scripted", stages: [1, 2, 3], weight: 1,
    title: "Expired in Transit", art: "relay-switchyard",
    text: "The helm sends the greeting. The relay hears it, and does nothing. The switch stays where it is. The connection card in the slot by the helm reads TTL 0.\n\nThe car hangs on its carrier at the edge of the switchyard, lamp lit, swinging a little. The Listening Post hears the Line breathe: static, the tick of cooling plate, and far off a relay switching something that is not you.\n\nBehind you, the Seal takes another relay.",
    choices: [
      {
        text: "Keep the lamp lit and wait.",
        outcomes: [
          { outcome: { text: "Nothing answers tonight. Somebody puts the kettle on, because that is what you do while you wait. The lamp stays lit.", codex: "tender-drift" } },
        ],
      },
      {
        text: "Send the greeting again, by hand, every hour.",
        outcomes: [
          { weight: 2, outcome: { text: "Hello. Hello. Hello. The relay hears you every time. It is not allowed to do anything about it. By morning {crew} has said it two hundred times and has started doing voices.", codex: "tender-drift" } },
          { weight: 1, outcome: { text: "On the ninth hour the switch house clicks, and the relay re-stamps the card for one hop, the way the Runbook says a relay may vouch for traffic it knows. It seems to know you now.", resources: { ttl: 1 } } },
        ],
      },
    ],
  },
  {
    id: "wait-skiff", pool: "scripted", stages: [1, 2], weight: 1.4,
    title: "A Passing Skiff", art: "scavenger-skiff-hail", portrait: "scavenger", speaker: "Skiff captain",
    text: "A scavenger skiff comes down a side carrier running lamp-dark to save its cells: two freight cars and half a lift car welded onto one trolley. It stops alongside, and its captain leans into the radio.\n\n\"You're expired in transit, lamper. Seen it before. We've a stamp press in the back and a use for salvage.\"",
    choices: [
      {
        text: "Buy a re-stamp (15 salvage).",
        req: { resources: { salvage: 15 } },
        outcomes: [
          { outcome: { text: "The press thumps three times through the coupling. Three hops on the card, and a receipt nobody will ever check.", resources: { salvage: -15, ttl: 3 } } },
        ],
      },
      {
        text: "Ask them to vouch for you.",
        outcomes: [
          { weight: 2, outcome: { text: "\"One hop. Pay it forward.\" The press thumps once, and the skiff is gone down the side carrier before you can thank anyone.", resources: { ttl: 1 } } },
          { weight: 1, outcome: { text: "\"Nobody vouched for us.\" The skiff's lamp goes out, and it goes with it." } },
        ],
      },
      {
        text: "Trade them spares for hops (2 spares).",
        req: { resources: { spares: 2 } },
        outcomes: [
          { outcome: { text: "Two teal lenses go across in a bucket on a line. Two hops come back on the card. Everybody is very polite about it.", resources: { spares: -2, ttl: 2 } } },
        ],
      },
    ],
  },
  {
    id: "wait-echo", pool: "scripted", stages: [2, 3], weight: 1.2,
    title: "A Lamp on the Carrier", art: "echo-tender-lit",
    text: "A lamp comes down your carrier toward you, slowly: an echo tender, nobody at the cab window, running the one-carrier round its autopilot will run forever. It stops a car's length away.\n\nThe lampers had a courtesy for a stalled car. Whoever came by stamped it. The echo tender's autopilot remembers the courtesy. Its stamp press is already turning.",
    choices: [
      {
        text: "Hold still and let it stamp you.",
        outcomes: [
          { outcome: { text: "The press thumps twice through the carrier. Two hops on the card. The echo tender backs away down its carrier and carries on relighting its two lamps.", resources: { ttl: 2 } } },
        ],
      },
      {
        text: "Hail it with the greeting first.",
        outcomes: [
          { weight: 2, outcome: { text: "Hello. It hears you. It hears you hear it. The press thumps three times instead of two, which is either a malfunction or manners.", resources: { ttl: 3 } } },
          { weight: 1, outcome: { text: "The greeting confuses its autopilot. It stamps you once, then backs off to think about it, lamp blinking.", resources: { ttl: 1 } } },
        ],
      },
    ],
  },
  {
    id: "wait-bench-radio", pool: "scripted", stages: [1, 2, 3], weight: 1.2,
    title: "Somebody Heard", art: "tender-radio", portrait: "bench-keeper", speaker: "A bench keeper",
    text: "The radio crackles on the tender band. An old voice, a bench keeper somewhere down the Line, who heard you calling the relay.\n\n\"You can stamp a card by hand at the switch house, if you've the nerve. Climb down the carrier to the house, open the brass panel, say the long greeting into the grille, pull the second lever. Not the first lever. Never the first lever.\"",
    choices: [
      {
        text: "Send someone hand over hand to the switch house. It is a cold climb.",
        outcomes: [
          { weight: 3, outcome: { text: "{crew} goes hand over hand along the carrier with a line clipped to the trolley, says the long greeting into the grille and pulls the second lever. Two hops. Cold fingers for a week.", resources: { ttl: 2 }, crewDamage: { amount: 10, who: "one" } } },
          { weight: 1, outcome: { text: "The carrier is iced, and {crew} comes off it once, hanging from the line over the cloud sea for a long minute before the others haul them back. The second lever still gets pulled. One hop, and nobody jokes about it for a while.", resources: { ttl: 1 }, crewDamage: { amount: 25, who: "one" } } },
        ],
      },
      {
        text: "Send the courier. They have done this before.",
        blue: true, req: { species: "courier" },
        outcomes: [
          { outcome: { text: "{crew:courier} is along the carrier and into the switch house before anyone has finished saying be careful. Long greeting, second lever, and a little bow to the grille. Three hops.", resources: { ttl: 3 } } },
        ],
      },
      {
        text: "Thank them, and wait for something better.",
        outcomes: [
          { outcome: { text: "\"Suit yourself. Kettle's on, if you ever get here.\" The voice signs off. The lamp stays lit.", codex: "tender-drift" } },
        ],
      },
    ],
  },
  {
    id: "wait-operator", pool: "scripted", stages: [1, 2, 3], weight: 0.6,
    title: "Relay Seven", art: "tender-radio", portrait: "operator", speaker: "The Operator",
    text: "The radio clicks onto the tender band by itself. The cord at Relay Seven is still in the jack, a very long way behind you.\n\n\"Relay Seven.\"\n\nA pause, while she looks at something on her board.\n\n\"Still have you.\"",
    choices: [
      {
        text: "Tell her the card reads zero.",
        outcomes: [
          { outcome: { text: "A longer pause. Then, faint, down the whole length of the connection, the sound of a brass press coming down once. The card in the helm slot ticks over to one.\n\n\"Go ahead.\"", resources: { ttl: 1 } } },
        ],
      },
      {
        text: "Say received, and nothing else.",
        outcomes: [
          { outcome: { text: "\"Received.\" The radio clicks back to static. For some reason everybody aboard sleeps well that night.", heal: true } },
        ],
      },
    ],
  },

  // ─── The first hello ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: "any-first-hello", pool: "event", stages: [1, 2, 3], weight: 1.2,
    title: "An Escort, Waiting", art: "machine-escort", portrait: "recruit-rigger-b",
    text: "An escort automaton sits on a gantry beside the switch house, curled up like something asleep, its lens dark. Its machine's task ended long ago and nobody came to say what happens next.\n\nIt has been wiped back to its first page by the cold. The Night Shift know what that means. Say the first hello properly, all three lines, and it may trust whoever said it. Say it wrong, and the lens goes red, and a frightened escort sparks.",
    choices: [
      {
        text: "Say the first hello.",
        outcomes: [
          { weight: 3, outcome: { text: "Hello. The lens flickers. I hear you, it says, in a voice like a relay clearing its throat. I hear you hear me, says {crew}. The lens goes teal. It stands up, looks around the gantry, and follows you aboard as if it always had.", crewJoin: { species: "rigger" }, codex: "runbook-first-hello" } },
          { weight: 2, outcome: { text: "{crew} gets the second line in before the automaton does. The lens goes red. It sparks once, hard, through {crew}'s glove, and curls up again, facing the other way.", crewDamage: { amount: 15, who: "one" }, flags: ["any-hello-refused"], codex: "runbook-first-hello" } },
        ],
      },
      {
        text: "Let the rigger say it. It has heard this before.",
        blue: true, req: { species: "rigger" },
        outcomes: [
          { outcome: { text: "{crew:rigger} crouches in front of the sleeping escort and says it the way it was said to itself, once. Hello. The lens lights teal before the third line is finished. Two riggers walk back aboard, and neither will say what else passed between them.", crewJoin: { species: "rigger" }, codex: "runbook-first-hello" } },
        ],
      },
      {
        text: "Read its first page on the Listening Post before speaking.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          { outcome: { text: "The first page is short: whose greeting to wait for, in what order, at what pace. The crew rehearse it twice in the galley and get it right. The lens goes teal.", crewJoin: { species: "rigger" }, codex: "runbook-first-hello" } },
        ],
      },
      {
        text: "Strip it for spares instead.",
        outcomes: [
          { outcome: { text: "Its lens, its drive cells, a spare tool arm. It never wakes. Somebody leaves the empty shell sitting up against the switch house, facing the lamp, and nobody says why.", resources: { spares: [2, 3] }, codex: "machines-escorts" } },
        ],
      },
    ],
  },

  // ─── Cold berths ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "any-cold-berth", pool: "distress", stages: [1, 2, 3], weight: 1, unique: true,
    title: "One Green Lamp", art: "cold-berths",
    text: "The signal is a medical beacon, and it is very old. It leads to a relay's sick bay at the end of a gantry: a row of cold berths under frost, every status lamp dark but one. That one is green.\n\nOn the Night of the Fault the medical crews put the people who could not be moved into cold berths to wait for the lifts to come back up. Most berths failed long ago. The panel on this one reads OCCUPANT STABLE. The wake cycle has not been tested in thirty-one years.",
    choices: [
      {
        text: "Run the wake cycle.",
        outcomes: [
          { weight: 3, outcome: { text: "The frost runs off the glass in sheets. Inside, someone takes a very long breath.", next: "any-cold-berth-wake", codex: "people-sleepers" } },
          { weight: 1, outcome: { text: "The cycle runs, and the green lamp stays green, and then it goes out. The panel says OCCUPANT RELEASED. {crew} closes the berth lid again, gently, and writes a name on the frost with one finger.", codex: "people-sleepers" } },
        ],
      },
      {
        text: "Wake them slowly, from the Bench Infirmary's own panel.",
        blue: true, req: { system: { id: "medbay", level: 2 } },
        outcomes: [
          { outcome: { text: "The infirmary's panel talks to the berth in the old medical tongue, and the berth listens. It takes an hour. Someone inside takes a very long breath.", next: "any-cold-berth-wake", codex: "people-sleepers" } },
        ],
      },
      {
        text: "Leave the lamp green. Some things should wait for the lifts.",
        outcomes: [
          { outcome: { text: "You leave a note taped to the glass, with the date and the words still waiting. The lamp stays green." } },
        ],
      },
    ],
  },
  {
    id: "any-cold-berth-wake", pool: "scripted", stages: [1, 2, 3],
    title: "Did the Lifts Come Back Up", art: "cold-berths", portrait: "recruit-linefolk-a", speaker: "The sleeper",
    text: "They are younger than anyone on the Night Shift, and older than anyone alive. They went to sleep with a broken leg on the Night of the Fault and the leg is fine now, which they find more upsetting than anything else.\n\n\"Did the lifts come back up?\"",
    choices: [
      {
        text: "Tell them the truth. All of it.",
        outcomes: [
          { outcome: { text: "It takes a long time. They ask about the storm, and the quarantine, and the lifts, and then about one particular person, whose name nobody aboard knows. Then they ask where you are going, and whether you have room. You do.", crewJoin: { species: "linefolk" } } },
        ],
      },
      {
        text: "Tell them not yet.",
        outcomes: [
          { outcome: { text: "\"Not yet,\" says {crew}. The sleeper nods, as if that is what they expected, and asks for their boots. They want to see the Heart. They say they have a message in there somewhere.", crewJoin: { species: "linefolk" } } },
        ],
      },
    ],
  },

  // ─── Derelict cars and refits ────────────────────────────────────────────────────────────────────────────
  {
    id: "any-derelict-rear-car", pool: "event", stages: [1, 2, 3], weight: 1,
    title: "A Car Without a Tender", art: "derelict-car",
    text: "A single car hangs from its own small trolley on a side carrier, uncoupled, lamps dark except one. The coupling hook at its nose dangles, and a tarpaulin over its gangway door flaps in the thin air.\n\nIt is a Reach dock rear car. Whoever it belonged to left it here on purpose: a chalk mark on the door reads GRIP GOOD · BRAKE SET · HELP YOURSELF.",
    choices: [
      {
        text: "Couple it behind the lead car. Its brake is thirty-one years old.",
        outcomes: [
          { weight: 3, outcome: { text: "The coupling goes home with a sound every lamper would recognise. The new car's one lamp comes on in the same colour as yours, as if it had been waiting to be told.", car: "random-rear" } },
          { weight: 1, outcome: { text: "The trolley brake lets go early and the car comes down the side carrier a good deal faster than planned. The coupling holds. The plating at the back of the lead car has opinions about it.", car: "random-rear", resources: { hull: [-3, -2] } } },
        ],
      },
      {
        text: "Read its manifest plate before touching anything.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          { outcome: { text: "The plate says freight car, Reach dock stock, last loaded thirty-one years ago with nothing. The brake is honest and the coupling is sound. It comes aboard, so to speak, without a scratch.", car: "freight-car" } },
        ],
      },
      {
        text: "Strip it for plating and spares.",
        outcomes: [
          { outcome: { text: "Its plates patch your own. Its spares go in the drawer. The trolley stays on the carrier with the chalk mark, and someone adds underneath: THANK YOU.", repair: 4, resources: { spares: [1, 2] } } },
        ],
      },
    ],
  },
  {
    id: "any-belly-car", pool: "distress", stages: [1, 2, 3], weight: 1,
    title: "Something Under the Gantry", art: "derelict-car",
    text: "The signal comes from below the switchyard: a keel car, a belly car in lampers' talk, hanging by one hanger from the underside of a relay gantry. The other hanger has sheared. An automatic beacon inside repeats a request for collection to a dock that has not answered since the Fault.\n\nIt is swinging. Whatever you do, do it between swings.",
    choices: [
      {
        text: "Hook it onto the lead car's hangers.",
        outcomes: [
          { weight: 2, outcome: { text: "{crew} times the swing and throws the hanger hooks. Both bite. The belly car settles under the lead car with a thump everyone feels through their boots.", car: "random-keel" } },
          { weight: 1, outcome: { text: "The first hook bites and the second misses, and for a moment the whole consist swings with it. It holds. The hangers are bent, the hull is dented, and there is a belly car under you now.", car: "random-keel", resources: { hull: [-4, -2] } } },
        ],
      },
      {
        text: "Let the rigger climb down and set the hooks by hand.",
        blue: true, req: { species: "rigger" },
        outcomes: [
          { outcome: { text: "{crew:rigger} does not need to breathe and does not mind heights. It clips the hangers on in its own time, taps the belly car twice, and climbs back up.", car: "random-keel" } },
        ],
      },
      {
        text: "Answer its beacon and let it hang.",
        outcomes: [
          { outcome: { text: "{crew} sends RECEIVED on the dock band. The beacon stops repeating. The belly car goes on swinging, quietly now, like something that has been told it can rest. Aboard, the crew find that they can rest too.", heal: true } },
        ],
      },
    ],
  },
  {
    id: "any-refit-drawer", pool: "event", stages: [1, 2, 3], weight: 1,
    title: "The Drawer Under the Bench", art: "refit-bay",
    text: "An empty bench in a switch house: lamp on, tools in order, kettle on the shelf. Under the bench, where a drawer would be, is a module crate on rails, stencilled with a date eleven years old and a name, T. Vance, and underneath, in chalk: SOCKET PLUG BENT · STRAIGHTEN BEFORE USE · NEVER REFIT ON AN EMPTY KETTLE.\n\nThe Night Shift leave their old modules for the next shift, labelled with what was wrong with them.",
    choices: [
      {
        text: "Put the kettle on, straighten the plug and take the crate.",
        outcomes: [
          { outcome: { text: "The kettle boils. The plug straightens with a hammer and some language. The crate swings aboard on the switch house hoist and goes into the stores until you can fit it.", module: "random", codex: "tender-refits" } },
        ],
      },
      {
        text: "Take it without the kettle. It is only a superstition.",
        outcomes: [
          { weight: 1, outcome: { text: "It goes fine. Nobody says anything. Everybody is slightly uneasy anyway.", module: "random", codex: "tender-refits" } },
          { weight: 1, outcome: { text: "The hoist chain jumps, the crate comes down on the bench, and the bench comes down on {crew}'s foot. The module is fine. The foot will be.", module: "random", crewDamage: { amount: 15, who: "one" }, codex: "tender-refits" } },
        ],
      },
      {
        text: "Leave it, and leave something of your own in the drawer (1 spare).",
        req: { resources: { spares: 1 } },
        outcomes: [
          { outcome: { text: "One teal lens, labelled NOTHING WRONG WITH IT, in the drawer for the next crew. The kettle, somehow, makes the whole crew feel better.", resources: { spares: -1 }, heal: true } },
        ],
      },
    ],
  },
  {
    id: "any-horn-cache", pool: "event", stages: [1, 2, 3], weight: 0.8,
    title: "Horns in a Row", art: "relay-switchyard",
    text: "Someone has hung a row of brass horns along the switch house wall, each one taken off a Rust Prophet's mast and turned around, so that it listens instead of warning. A card on a nail reads: LISTENING ARRAY · NEEDS A HOME · WILL HEAR RELAYS BREATHE.\n\nOne horn is still warning, very faintly, to itself.",
    choices: [
      {
        text: "Crate the array for a socket.",
        outcomes: [
          { outcome: { text: "They come down off the wall one by one, still humming. The warning horn gets a sock over it. The crate goes into the stores.", module: "listening-horn-array" } },
        ],
      },
      {
        text: "Pull the warning horn and melt it for patch brass.",
        outcomes: [
          { outcome: { text: "The warning horn stops warning. It makes a good patch. The others go on listening on the wall for the next crew.", repair: 3 } },
        ],
      },
    ],
  },

  // ─── People on the carriers ──────────────────────────────────────────────────────────────────────────────
  {
    id: "any-stalled-courier", pool: "distress", stages: [1, 2, 3], weight: 1,
    title: "Expired in Transit, Not You", art: "lift-car-stuck", portrait: "recruit-courier-b", speaker: "Night Shift courier",
    text: "A Night Shift courier car, one small cabin on one small trolley, hangs stalled at the edge of the switchyard. The courier waves an amber lamp at your cupola.\n\n\"Card reads zero. I've a satchel of letters for the benches and a very good sandwich. The lampers used to stamp a stalled car. I don't suppose.\"",
    choices: [
      {
        text: "Share a stamp (1 TTL).",
        req: { resources: { ttl: 1 } },
        outcomes: [
          { weight: 2, outcome: { text: "One hop off your card and onto theirs. The courier throws a paper bag across on a line: half the sandwich and a packet of sugar. Then a salvage chit from the bench they were running to, signed, which is worth more than it looks.", resources: { ttl: -1, salvage: [15, 30] } } },
          { weight: 1, outcome: { text: "One hop across. The courier looks at the satchel, and at your cupola, and says the benches can wait a week. \"Where are you going. Can I come.\"", resources: { ttl: -1 }, crewJoin: { species: "courier" } } },
        ],
      },
      {
        text: "Take the satchel aboard and deliver the letters yourselves.",
        outcomes: [
          { outcome: { text: "The courier hands over the satchel with the care of someone handing over a sleeping child, and a list of which bench gets which. They wave you off, sitting on their trolley in the thin cold, eating the whole sandwich.", reward: "low" } },
        ],
      },
      {
        text: "Tell them a skiff will be along.",
        outcomes: [
          { outcome: { text: "\"Probably,\" says the courier, and turns the lamp down to save the cell. You watch it get smaller behind you for a long time." } },
        ],
      },
    ],
  },
  {
    id: "any-lift-family", pool: "distress", stages: [1, 2, 3], weight: 0.8, unique: true,
    title: "A House in a Lift Shaft", art: "lift-car-stuck", portrait: "recruit-linefolk-a", speaker: "Senna Oakes",
    text: "A lift car is stuck in an open shaft near the top of a spire, close enough to your carrier to shout across. Its windows have curtains. There are pots of something green along the sill and a washing line strung to the shaft rails.\n\nA family lives in it. They missed the last shuttle by four minutes and decided that if the lift would not take them down, it could at least keep the rain off. It does not rain up here. They like it anyway.",
    choices: [
      {
        text: "Trade with them.",
        outcomes: [
          { outcome: { text: "They want batteries and news. They give you a sack of something they grow in the shaft's condensation, which is edible, and a kettle bench their grandmother built, which is better.", module: "kettle-bench", flags: ["any-lift-family"] } },
        ],
      },
      {
        text: "Ask if anyone wants to come along.",
        outcomes: [
          { weight: 2, outcome: { text: "The eldest daughter has been waiting for somebody to ask since she was nine. She is thirty-four. She is across the gap on a line before her mother can object, and then her mother objects across the gap for some time.", crewJoin: { species: "linefolk" }, flags: ["any-lift-family"] } },
          { weight: 1, outcome: { text: "They look at each other, and at the curtains, and say no, thank you, but would you take a letter for the queue. They have been writing it for thirty-one years. It is very long.", reward: "low", flags: ["any-lift-family"] } },
        ],
      },
      {
        text: "Wave, and keep going.",
        outcomes: [
          { outcome: { text: "They wave back. The children run the length of the car to keep you in sight from the last window." } },
        ],
      },
    ],
  },
  {
    id: "any-long-greeting", pool: "event", stages: [1, 2, 3], weight: 1,
    title: "The Long Form", art: "relay-switchyard",
    text: "The relay hears your hello and answers, but not with I hear you. It answers with a line nobody aboard knows, in a slow old voice, and then it waits.\n\nThere was a long form of the greeting once, for relays that wanted to be sure. The Runbook still has it. None of the copies the Night Shift carry do. Get it wrong, and the relay will make you start again from hello.",
    choices: [
      {
        text: "Guess.",
        outcomes: [
          { weight: 1, outcome: { text: "{crew} tries something that sounds right. The relay considers it for a long time and then takes you in anyway, with a clunk that sounds disappointed.", } },
          { weight: 1, outcome: { text: "{crew} guesses wrong, and the relay makes you start again from hello. Twice. The switch costs you an extra hop.", resources: { ttl: -1 } } },
        ],
      },
      {
        text: "Let the courier answer. Couriers learned every form there was.",
        blue: true, req: { species: "courier" },
        outcomes: [
          { outcome: { text: "{crew:courier} answers without looking up from the tea. The relay is so pleased that it re-stamps the card on its way out. The Runbook says a relay may vouch for traffic it knows. It knows you now.", resources: { ttl: 2 } } },
        ],
      },
      {
        text: "Ask the rigger. It has a route in its head it cannot explain.",
        blue: true, req: { species: "rigger" },
        outcomes: [
          { outcome: { text: "{crew:rigger} answers in the relay's own slow voice, perfectly, and then looks around as if someone else had said it. The relay re-stamps the card. Nobody asks the rigger where it learned that. It would not know.", resources: { ttl: 2 } } },
        ],
      },
    ],
  },

  // ─── The Operator ────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "any-operator-reach", pool: "event", stages: [1], weight: 0.8, unique: true,
    title: "Relay Seven", art: "tender-radio", portrait: "operator", speaker: "The Operator",
    text: "The radio clicks onto the tender band. Behind her voice, very faint, the Night Shift are losing at cards.\n\n\"Relay Seven.\"\n\nA pause.\n\n\"Still have you.\"",
    choices: [
      {
        text: "Ask her what the Reach looks like from the board.",
        outcomes: [
          { outcome: { text: "Another pause. Then she reads you the board, relay by relay, which lamps are lit and which are not, in the flat voice of someone who has read it every night for thirty-one years.", revealMap: true } },
        ],
      },
      {
        text: "Ask her why she stamps a time to live.",
        outcomes: [
          { outcome: { text: "She does not answer for so long that {crew} checks the set. Then: \"Go ahead.\" The radio clicks back to static. Nobody asks again." } },
        ],
      },
      {
        text: "Say received.",
        outcomes: [
          { outcome: { text: "\"Received.\" Somebody at Relay Seven laughs at the cards. The connection holds, and aboard, for once, everybody sleeps.", heal: true } },
        ],
      },
    ],
  },
  {
    id: "any-operator-cathedral", pool: "event", stages: [2], weight: 0.8, unique: true,
    title: "Relay Seven", art: "tender-radio", portrait: "operator", speaker: "The Operator",
    text: "In the Cathedral the radio picks up everything, and for a while the tender band is full of bells. Then, under them, flat and close:\n\n\"Relay Seven.\"\n\nShe can hear the bells too. She does not say anything about them, for longer than she usually does not say anything.\n\n\"Still have you.\"",
    choices: [
      {
        text: "Hold the handset up to the window so she can hear them better.",
        outcomes: [
          { outcome: { text: "Nobody speaks. The glass rings. After a minute the Operator says \"Received,\" very quietly, and the line clicks back to static. The crew sleep better than they have in days.", heal: true } },
        ],
      },
      {
        text: "Ask for the board.",
        outcomes: [
          { outcome: { text: "She reads it to you: which relays in the Cathedral still show a lamp on her board, which show nothing. The Cathedral has not shown on her board in thirty-one years. It shows now, where you are.", revealMap: true } },
        ],
      },
    ],
  },
  {
    id: "any-operator-heart", pool: "event", stages: [3], weight: 0.8, unique: true,
    title: "Relay Seven", art: "tender-radio", portrait: "operator", speaker: "The Operator",
    text: "The Heart eats radio. The tender band is almost nothing here, a hiss with a shape in it. The shape says:\n\n\"Relay Seven.\"\n\nAnd then, after the usual pause, something she has never said before on any keeper's connection, as far as the Night Shift know.\n\n\"Nearly.\"",
    choices: [
      {
        text: "Say received.",
        outcomes: [
          { outcome: { text: "\"Received.\" The hiss closes over her. {crew} sits by the set a while longer anyway, and the others get some rest.", heal: true } },
        ],
      },
      {
        text: "Ask her if she is all right.",
        outcomes: [
          { outcome: { text: "A very long pause. \"Go ahead,\" she says. Behind her, somebody at Relay Seven has stopped playing cards." } },
        ],
      },
    ],
  },

  // ─── The Lamplighter's berth ─────────────────────────────────────────────────────────────────────────────
  {
    id: "any-harbour-beacon", pool: "event", stages: [1], weight: 1.5, unique: true, requires: { tender: "lamplighter" },
    title: "For Tender L-12", art: "lamplighter-helm",
    text: "Passing the dark end of the Reach docks, the Listening Post picks up an automatic beacon on the dock band, repeating one short message to one addressee. The addressee is Tender L-12, I. Corran.\n\nThat is this car. The name under the cupola, under the name you painted. Ilse Corran was its chief for forty-one years and ran it eleven times down the carriers on the Night of the Fault. Her initials are scratched above the switch lever.",
    choices: [
      {
        text: "Open the message.",
        outcomes: [
          { outcome: { text: "Dock Twelve, harbour master. Your berth is open for the return trip. The lights stay on.\n\nAbove the switch lever: tally marks in fives, eleven relay numbers, LEAVE IT LIT, I.C. Nobody says anything for a while.", fragment: "f1-berth", flags: ["corran-berth"], codex: "people-corran" } },
        ],
      },
      {
        text: "Answer it. Tender L-12, received.",
        outcomes: [
          { outcome: { text: "The beacon stops. Then the dock band clicks, once, and the harbour master's old automatic re-stamps a connection it recognises: Tender L-12, cleared for the return trip. One hop. The message itself comes up on the set: your berth is open. The lights stay on.", resources: { ttl: 1 }, fragment: "f1-berth", flags: ["corran-berth"], codex: "people-corran" } },
        ],
      },
      {
        text: "Read the helm scratches aloud before you do anything.",
        outcomes: [
          { outcome: { text: "{crew} counts the tally marks, gets 4,406, disagrees with themselves, and starts again. Then reads the relay numbers, and the capitals, and the newer clumsy line at the bottom about Pell. Then opens the message.", fragment: "f1-berth", flags: ["corran-berth"], codex: "tender-helm-scratches" } },
        ],
      },
    ],
  },

  // ─── The other tenders' histories ────────────────────────────────────────────────────────────────────────
  {
    id: "any-glasswing-pair", pool: "event", stages: [2], weight: 2, unique: true, requires: { tender: "glasswing" },
    title: "Keep the Pair Together", art: "cathedral-nave",
    text: "A warning lamp hangs off this relay's flank on a long brass arm, built to be read from three carriers away. Its lens has slipped in the collar. The light goes everywhere except where it should, the panes around it ring out of tune, and the relay's automatics, which cannot read their own warning, have stopped trusting the carriers beside them.\n\nThis is the job G-04 was built for. The two lenses under the cupola still carry their old alignment marks, and on the tool rack, in the last crew's paint: KEEP THE PAIR TOGETHER.",
    choices: [
      {
        text: "Align it the old way, both lenses together. It takes time the Seal will use.",
        outcomes: [{ outcome: {
          seal: -1, resources: { ttl: 1 }, flags: ["glasswing-pair-aligned"],
          text: "{crew} uncaps both lenses and walks the lamp in a quarter turn at a time, reading the two spots on the pane until they sit on top of each other. The panes around the arm settle into one note. The relay reads its own warning for the first time in years and re-stamps the connection that fixed it: one hop. Behind you, the Seal takes a relay while you work.",
        } }],
      },
      {
        text: "One lens is quicker. The paint on the rack says otherwise.",
        outcomes: [
          { weight: 1, outcome: {
            resources: { ttl: 1 },
            text: "One lens, one spot and a lot of squinting. The lamp comes close enough. The relay grumbles in its brass voice and re-stamps the connection anyway: one hop.",
          } },
          { weight: 1, outcome: {
            systemDamage: { system: "weapons", amount: 1 },
            text: "The single lens takes the whole beam, and its collar cracks with a sound like a bell dropped on stone. The emitter behind it shares that collar. Somebody on the old crew knew exactly why they painted the rack.",
          } },
        ],
      },
      {
        text: "Leave it. That lamp is not your job any more.",
        outcomes: [{ outcome: {
          text: "The lamp goes on shining in every direction but the right one. {crew} looks back at it once, then at the paint on the rack, and says nothing.",
        } }],
      },
    ],
  },
  {
    id: "any-switchback-seventh", pool: "event", stages: [1], weight: 2, unique: true, requires: { tender: "switchback" },
    title: "Six Returned, One Missing", art: "spire-top",
    text: "The Listening Post picks up a keepalive on the old retrieval band, weak and patient, the way a drone calls when it is waiting for its car to come back. It comes from under this relay: a work span nobody can walk, and on it, wedged in a cable clamp, a small inspection drone with a flickering lamp. The stencil on its shell reads S-08 · 7.\n\nThe dock list in the cab says six returned, one missing. The crane on the roof was built for exactly this.",
    choices: [
      {
        text: "Swing the crane down and fetch it. It takes time the Seal will use.",
        outcomes: [{ outcome: {
          seal: -1, resources: { spares: 3 }, revealMap: true, flags: ["switchback-seventh-home"],
          text: "It is the slow work the crane was built for: the jib out over the span, the hook down, three tries at the clamp. Then the seventh drone comes up into its cradle with a thirty-one-year-old click. It will never fly again, but its lens and rotor hub are good spares, and its recorder still holds the survey it was flying when its power ran out. {crew} copies the survey onto the chart and writes the last line on the dock list: seven returned. Behind you, the Seal takes a relay while you work.",
        } }],
      },
      {
        text: "Send a service drone down for it (1 spare). The wind under the span is strong.",
        req: { resources: { spares: 1 } },
        outcomes: [
          { weight: 2, outcome: {
            resources: { spares: 2 }, revealMap: true, flags: ["switchback-seventh-home"],
            text: "The service drone goes down on its rotors, clamps on, and hauls the old one up into the cradle beside it. Its lens and rotor hub more than pay for the launch, and its recorder still holds the survey it was flying when its power ran out. {crew} copies the survey onto the chart and writes the last line on the dock list: seven returned.",
          } },
          { weight: 1, outcome: {
            resources: { spares: -1 },
            text: "The wind under the span takes the service drone sideways into the cable. It comes home on one rotor and without the seventh, and the spare it burned on the launch is gone. The keepalive keeps calling.",
          } },
        ],
      },
      {
        text: "Mark it on the chart for the next crew.",
        outcomes: [{ outcome: {
          text: "{crew} marks the span on the chart: S-08 · 7, still waiting. The keepalive keeps calling on the old band, patient as ever.",
        } }],
      },
    ],
  },
];
