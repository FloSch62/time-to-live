// Stage I · The Copper Reach — "signals": ordinary relay events (pool "event"), unknown signals coming down the
// carrier (pool "distress"), and their scripted follow-ups. Rough, rusty, loud and a little funny.
import type { EventDef } from "../../game/types.ts";

export const STAGE1_SIGNALS_FLAGS: Record<string, string> = {
  "s1-condemned": "A Scrap Foreman chalked CONDEMNED on the tender's roof; other yard cranes can read it.",
  "s1-relief-owed": "The crew shared a hop with the stalled Night Shift relief car; the wardens owe them one.",
};

export const STAGE1_SIGNALS: EventDef[] = [
  // ─── pool: event ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s1-departure-board", pool: "event", stages: [1], unique: true,
    title: "The Departure Board", art: "lift-head",
    text: "This relay sits on a lift head: freight gates, a loading cage hanging open over a shaft that drops into cloud, and a departure board in old amber letters. It still shows the last departures of the Night of the Fault.\n\nCAR 212 · DEPARTED. CAR 213 · DEPARTED. CAR 214 · BOARDING.\n\nCar 214 has been boarding for thirty-one years. The board's terminal still takes messages for passengers, and its outbound tray is full.",
    choices: [
      {
        text: "Read the outbound tray.",
        outcomes: [{ outcome: {
          text: "Seat numbers and goodbyes, mostly. One is from car 212: a window seat, nothing to see but cloud, save the good cup. Somebody reads it twice and then goes and puts the kettle on without saying anything.",
          fragment: "f1-window-seat", codex: "places-lift-heads",
        } }],
      },
      {
        text: "Prise the brass letters off the board.",
        outcomes: [
          { weight: 2, outcome: {
            text: "They come off with a screwdriver and a bad conscience. The board now reads CAR 2 4 · BO RDING, which is somehow worse.",
            reward: "low",
          } },
          { weight: 1, outcome: {
            text: "A letter gives. The crew member holding it does not, and the gantry over the shaft is a long way from anything soft. A bruised shoulder and a pocketful of brass.",
            resources: { salvage: [10, 20] }, crewDamage: { amount: 15, who: "one" },
          } },
        ],
      },
      {
        text: "Set car 214 to DEPARTED.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          text: "The terminal wants a dispatcher's key. The Listening Post finds the dispatcher's override instead, which only wants to be asked nicely. CAR 214 · DEPARTED. The lift head's relay, relieved that something has finally left, stamps an extra hop on your connection on the way out.",
          resources: { ttl: 1 }, codex: "places-lift-heads",
        } }],
      },
      {
        text: "Leave the board as it is.",
        outcomes: [{ outcome: { text: "Some things are allowed to keep boarding." } }],
      },
    ],
  },
  {
    id: "s1-spilled-buffer", pool: "event", stages: [1],
    title: "A Leaking Leech", art: "machine-hulk",
    text: "A Packet Leech hangs on the carrier ahead, grip locked, lamps dark. Its buffer tank has split along a seam, and traffic is leaking out of it into the carrier core in a thin amber stream: thirty-one years of stray packets, gathered and never delivered.\n\nIt is not finished. Leeches are never finished. Its intake arms twitch every time the stream flickers, as if it is trying to catch what it is losing.",
    choices: [
      {
        text: "Sift the stream for anything readable.",
        outcomes: [
          { weight: 3, outcome: {
            text: "Most of it is noise. Some of it is an apology about bread, sent from a galley in yard six, which the crew agree is the most important packet on the Line.",
            fragment: "f1-bread",
          } },
          { weight: 1, outcome: {
            text: "The Listening Post lingers on the stream a moment too long. The leech's lamps come up, one by one, and its clamps turn toward the one live thing on its carrier.",
            fragment: "f1-bread",
            combat: { enemy: "packet-leech", intro: "Its buffer tank shudders. The clamps swing round to hold what is left." },
          } },
        ],
      },
      {
        text: "Weld the seam shut so it stops losing traffic.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger} welds the seam in four minutes. The leech's arms go still. Its lamps come up once, and it passes a packet across to your outbound queue the way it used to hand over what it had gathered. Then it goes back to sleep, full. The packet is an apology about bread.",
          fragment: "f1-bread", reward: "low",
        } }],
      },
      {
        text: "Cut the tank loose and sell it at the market.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The tank is the leech's whole reason for being. The moment the cutter touches it, the lamps come up.",
            combat: { enemy: "packet-leech", intro: "BUFFER THREATENED. HOLDING YOUR TRAFFIC FOR COLLECTION." },
          } },
          { weight: 1, outcome: {
            text: "It comes away clean. The leech does not even stir. The crew spend the next hop feeling faintly guilty and quite rich.",
            resources: { salvage: [20, 35] },
          } },
        ],
      },
      {
        text: "Leave it leaking.",
        outcomes: [{ outcome: { text: "Behind you, the amber stream flickers on into the dark." } }],
      },
    ],
  },
  {
    id: "s1-null-retry", pool: "event", stages: [1], unique: true,
    title: "One Last Retry", art: "relay-switchyard",
    text: "The switch house at this relay is talking to itself. The same message goes out down the carrier, comes back, and goes out again: a must-arrive packet from the Night of the Fault, still circling on a return route nobody closed, thirty-one years into its retries.\n\nIt is small and it is not loud. What is left of the Null Storm mostly isn't. But the switchgear is so busy repeating it that it keeps losing your greeting halfway through.",
    choices: [
      {
        text: "Say hello louder and take the switch anyway.",
        outcomes: [
          { weight: 2, outcome: {
            text: "It takes two full greetings, and the relay charges you for both. You go.",
            resources: { ttl: -1 },
          } },
          { weight: 1, outcome: { text: "Third time, it hears you. No charge." } },
        ],
      },
      {
        text: "Answer the retry with received.",
        outcomes: [
          { weight: 3, outcome: {
            text: "Someone keys the switch-house console and types the oldest reply on the Line. RECEIVED. The retry stops. The relay is quiet for the first time in thirty-one years, and it is so pleased about it that it re-stamps your connection.",
            resources: { ttl: 1 }, codex: "world-null-storm",
          } },
          { weight: 1, outcome: {
            text: "The retry stops. Then the console asks who is acknowledging, and when nobody can give it a key, it starts again, a little louder.",
            codex: "world-null-storm",
          } },
        ],
      },
      {
        text: "Trace where the retry is trying to go.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          text: "It is a shift swap. Yard six, relief shift, a coffee and a coolant pump owed. Thirty-one years of retries, and all it ever wanted was to reach the shift office four relays away. The Listening Post takes a copy. The retry keeps going. It does not know it has been read.",
          fragment: "f1-imre", codex: "world-null-storm",
        } }],
      },
      {
        text: "Leave it circling.",
        outcomes: [{ outcome: { text: "A message that cannot die becomes a storm. This one has become a very small, very patient weather." } }],
      },
    ],
  },
  {
    id: "s1-yard-inspection", pool: "event", stages: [1],
    title: "Inspection Due", art: "rust-yard",
    text: "The yard's gantry crane rolls out along its rail as you come in, hook swinging, and stops right over the tender. A lamp on its cab blinks. INSPECTION DUE.\n\nIt is a Scrap Foreman, and it is not attacking. It is inspecting. A chalk arm unfolds from its frame and begins to write on your roof. You can hear it through the plating: a line, a line, a circle. Everything in the yard below has the same mark on it. The mark means CONDEMNED.",
    choices: [
      {
        text: "Hold still and let it finish.",
        outcomes: [{ outcome: {
          text: "The chalk arm finishes its circle and folds away. INSPECTION CLOSED. PAPERWORK PENDING. The crane rolls off to inspect a skip it has inspected every day for thirty-one years. There is now a large chalk circle on your roof, and nobody can reach it to wipe it off.",
          flags: ["s1-condemned"], codex: "runbook-tickets",
        } }],
      },
      {
        text: "File the paperwork it is waiting for.",
        blue: true, req: { species: "courier" },
        outcomes: [{ outcome: {
          text: "{crew:courier} knows the form by heart: yard inspection, no defects found, signed by the inspector. Couriers carried a thousand of them. The Foreman reads the slip, stamps it with its cab lamp, and rolls away satisfied. For the first time in thirty-one years, a ticket in this yard closes. The skip it was guarding is yours.",
          reward: "low", codex: "runbook-tickets",
        } }],
      },
      {
        text: "Run for the switch before it finishes.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The greeting goes out, the switch throws, and you leave the Foreman writing on air. Its hook catches the tail on the way past.",
            resources: { hull: [-3, -2] },
          } },
          { weight: 1, outcome: {
            text: "The Foreman does not like an unfinished inspection. The hook comes down.",
            combat: { enemy: "scrap-foreman", intro: "INSPECTION OBSTRUCTED. CONDEMNING OBSTRUCTION." },
          } },
        ],
      },
      {
        text: "Knock the chalk arm off.",
        outcomes: [{ outcome: {
          text: "It takes that as a comment on its work.",
          combat: { enemy: "scrap-foreman", intro: "INSPECTOR INTERFERED WITH. INSPECTING INTERFERENCE." },
        } }],
      },
    ],
  },
  {
    id: "s1-second-inspection", pool: "event", stages: [1], unique: true, weight: 3,
    requires: { flag: "s1-condemned" },
    title: "Condemned Item in Transit", art: "rust-yard",
    text: "Another yard, another crane. This one reads the chalk circle on your roof from forty metres away and goes very still.\n\nCONDEMNED ITEM IN TRANSIT. RETURNING TO SMELTER.\n\nIts hook is already coming down. It is not angry. It is tidying up.",
    choices: [
      {
        text: "Scrub the chalk off from the roof hatch.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Someone goes up through the hatch into air too thin to breathe with a wet rag and a lot of courage. The circle comes off. The crane stops, confused, and rolls away to find something that is actually condemned.",
            clearFlags: ["s1-condemned"], crewDamage: { amount: 10, who: "one" },
          } },
          { weight: 1, outcome: {
            text: "The rag comes back pink. The circle stays. The hook arrives.",
            crewDamage: { amount: 20, who: "one" },
            combat: { enemy: "scrap-foreman", intro: "CONDEMNED ITEM RESISTING. RESISTANCE CONDEMNED." },
          } },
        ],
      },
      {
        text: "Show it the closed paperwork.",
        blue: true, req: { species: "courier" },
        outcomes: [{ outcome: {
          text: "{crew:courier} holds a hand-written release slip up to the window. The crane reads it for a long time. APPEAL UPHELD. It rolls back to its skip. The chalk stays, but it now has a small tick next to it.",
          clearFlags: ["s1-condemned"],
        } }],
      },
      {
        text: "End its task before it hooks the car.",
        outcomes: [{ outcome: {
          text: "The crew get the weapons up before the hook arrives. Just.",
          clearFlags: ["s1-condemned"],
          combat: { enemy: "scrap-foreman", intro: "CONDEMNED ITEM IN TRANSIT. RETURNING TO SMELTER." },
        } }],
      },
    ],
  },
  {
    id: "s1-exchange-terminal", pool: "event", stages: [1], unique: true,
    title: "The Outbound Queue", art: "relay-switchyard",
    text: "A spur of this relay runs into the Hollow Exchange's old outbound hall, and one terminal there still has power. Its screen shows the outbound queue for this sector, scrolling slowly: request after request, each one marked LOW PRIORITY, each one waiting for a shift that will look at it after the storm.\n\nThe terminal will accept one new entry. It does not ask from whom.",
    choices: [
      {
        text: "Read the queue.",
        outcomes: [{ outcome: {
          text: "Request 4471: the fan in rack C is still rattling. Low priority. I'll look at it after the storm. Somewhere in the dark hall, very faintly, a fan is still rattling.",
          fragment: "f1-rack-c",
        } }],
      },
      {
        text: "File a repair request for the tender.",
        outcomes: [
          { weight: 2, outcome: {
            text: "REQUEST 88,413 LOGGED. LOW PRIORITY. WILL BE LOOKED AT AFTER THE STORM. The crew wait for twenty minutes, out of respect.",
            fragment: "f1-rack-c",
          } },
          { weight: 1, outcome: {
            text: "Nothing happens. Then a maintenance drone the size of a kettle crawls out of a duct, patches three plates, and crawls back in without a word. REQUEST 88,413: CLOSED. Nobody on the crew has ever seen a request closed before.",
            repair: 4,
          } },
        ],
      },
      {
        text: "Let the rigger talk to the terminal.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger}'s lens flickers against the screen for a long time. \"It thinks I am an escort,\" it says. \"It has tasks for me.\" The terminal prints its whole outstanding queue onto a spool of paper. Most of it is fans. One ticket is for a relay two carriers on: there is a stamp press there, still oiled, waiting for a service visit. The crew pay it one.",
          resources: { ttl: 2 }, codex: "runbook-tickets", fragment: "f1-rack-c",
        } }],
      },
      {
        text: "Leave it scrolling.",
        outcomes: [{ outcome: { text: "The queue scrolls on. After the storm, it says. After the storm." } }],
      },
    ],
  },
  {
    id: "s1-last-resort", pool: "event", stages: [1], unique: true,
    title: "The Last Resort", art: "debris-field",
    text: "Your carrier runs out toward the break, past a switchyard nobody has used since hour zero. Beyond it stands an outer relay: one of the great ring gates of the Reach, aimed away from the world, torn in half. Wreckage hangs in the carriers around it and ticks against the windows.\n\nIts switch house still works. Its route table still ends the way every route table on the Line ends: whatever you do not know how to reach, send outward.\n\nThere is nothing out there. There is also, the Listening Post says, nothing out there answering, which is a different thing.",
    choices: [
      {
        text: "Send something outward. Just to see.",
        outcomes: [{ outcome: {
          text: "The crew argue about what to send. In the end someone types the greeting. Hello. The gate takes it and sends it upstream, the way it sent everything it could not deliver for as long as anyone remembers. Nobody answers. Nobody expected anyone to. The crew wait anyway, longer than they meant to.",
          codex: "world-upstream",
        } }],
      },
      {
        text: "Strip the dead gate's lamp housings.",
        outcomes: [
          { weight: 2, outcome: { text: "Good brass, and nobody coming back for it.", reward: "med" } },
          { weight: 1, outcome: {
            text: "A plate works loose from the gate while the crew are at the housings and swings into the car on its snagged cable like a bell clapper.",
            resources: { salvage: [15, 30], hull: [-4, -2] },
          } },
        ],
      },
      {
        text: "Listen upstream as far as the Listening Post will reach.",
        blue: true, req: { system: { id: "sensors", level: 3 } },
        outcomes: [{ outcome: {
          text: "Static. The ticking of the wreckage. Then, at the very edge of hearing, something that might be a pattern, or might be the Listening Post wanting one. {crew} says it was nothing. {crew} writes the time down anyway.",
          codex: "world-upstream",
        } }],
      },
      {
        text: "Turn back to the switchyard.",
        outcomes: [{ outcome: { text: "Behind you, the broken gate keeps pointing at the stars, patient as a question." } }],
      },
    ],
  },
  {
    id: "s1-condemned-skip", pool: "event", stages: [1],
    title: "A Condemned Skip", art: "rust-yard",
    text: "A skip on the yard gantry, painted with a chalk circle: CONDEMNED. Under a tarpaulin inside, forty payload shells in a rack, brass going green. The Scrap Foreman that condemned them rolled away years ago and never came back to take them to the smelter.\n\nSome of them are fine. Some of them have been sweating in the damp for thirty-one years. From the outside, you cannot tell which.",
    choices: [
      {
        text: "Take as many as the hold will carry.",
        outcomes: [
          { weight: 2, outcome: { text: "Four good shells, and a hold that smells of old brass.", resources: { payloads: [3, 4] } } },
          { weight: 1, outcome: {
            text: "One of the sweaty ones goes off in the hold. Nobody is standing next to it, which is the best that can be said.",
            resources: { payloads: 2, hull: [-5, -3] },
          } },
        ],
      },
      {
        text: "Have the rigger sort the good from the bad.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger} taps each shell and listens. Thirty-six go back in the skip. Four come aboard. None of them go off, which the rigger mentions several times.",
          resources: { payloads: 4 },
        } }],
      },
      {
        text: "Unbolt the whole rack and take that instead.",
        outcomes: [{ outcome: {
          text: "The rack is dock-pattern brass, made to sit in a tender's socket room. It comes out of the skip with one shell still in it, which behaves. It goes into the module stores until someone refits it.",
          module: "payload-rack", resources: { payloads: 1 },
        } }],
      },
      {
        text: "Leave the condemned alone.",
        outcomes: [{ outcome: { text: "The Foreman was right about something, probably." } }],
      },
    ],
  },
  {
    id: "s1-ticket-machine", pool: "event", stages: [1],
    title: "Tickets", art: "relay-switchyard",
    text: "In the switch house a ticket machine is printing. It has been printing for some time: the floor is knee-deep in paper. Work orders, the same seven in rotation. REPLACE GRIP, RELAY 212. CLEAR SPARK MITES, PLATFORM 4. INSPECT YARD. INSPECT YARD. INSPECT YARD.\n\nEvery machine in the Reach is working one of these. Nobody has closed a ticket in thirty-one years, and nobody out here has the authority to close one. So the machine keeps printing, and somewhere a crane reads INSPECT YARD and goes to inspect the yard.",
    choices: [
      {
        text: "Read through the pile.",
        outcomes: [{ outcome: {
          text: "Mostly the yard. A few newer ones, still warm: UNKNOWN CAR ON CARRIER 9. INVESTIGATE. Carrier 9 is the one you came in on. The crew decide not to be on it much longer.",
          codex: "runbook-tickets",
        } }],
      },
      {
        text: "Stamp CLOSED on the oldest ticket.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The machine stops. The switch house is so quiet the crew can hear the carrier hum. Out on the yard a crane halts halfway through an inspection, parks, and lowers its load onto the gantry. The load is spares.",
            resources: { spares: [1, 2] }, codex: "runbook-tickets",
          } },
          { weight: 1, outcome: {
            text: "The machine considers this and prints a new ticket. TICKET CLOSED WITHOUT AUTHORITY. INVESTIGATE. Outside, a crane starts to roll.",
            codex: "runbook-tickets",
            combat: { enemy: "scrap-foreman", intro: "INVESTIGATING UNAUTHORISED CLOSURE." },
          } },
        ],
      },
      {
        text: "Print a ticket of your own.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          text: "The machine takes a work order from the Listening Post without asking who sent it. SERVICE CAR L-12. PRIORITY IMMEDIATE. Ten minutes later two escort automatons crawl down the carrier with a toolbox, fix what they find, and leave without being thanked, which they seem to prefer.",
          repair: 5, codex: "runbook-tickets",
        } }],
      },
      {
        text: "Leave it printing.",
        outcomes: [{ outcome: { text: "INSPECT YARD, it says, as you go. INSPECT YARD." } }],
      },
    ],
  },
  {
    id: "s1-barter-across", pool: "event", stages: [1],
    title: "Shopping", art: "scavenger-skiff-hail", portrait: "scavenger", speaker: "Captain of the Fair Enough",
    text: "A skiff comes alongside on the parallel carrier: two lift cars and half a freight cage welded onto one trolley, salvage nets out, hand lamps waving. It is called the Fair Enough, which is painted on its side in three different hands.\n\n\"Don't shoot, we're shopping,\" their captain calls across the gap. \"You've got a lamp that works and we've got a stamp press that works. Let's be adults about this.\"",
    choices: [
      {
        text: "Trade for a re-stamp (25 salvage).",
        req: { resources: { salvage: 25 } },
        outcomes: [{ outcome: {
          text: "They pass the press across on a boathook. It thumps twice through the connection card. \"Pleasure,\" says the captain, and seems to mean it.",
          resources: { salvage: -25, ttl: 2 }, codex: "people-scavengers",
        } }],
      },
      {
        text: "Trade spares for payloads (2 spares).",
        req: { resources: { spares: 2 } },
        outcomes: [{ outcome: {
          text: "Two teal lenses go across, three payload shells come back, and everybody pretends the shells were not condemned once.",
          resources: { spares: -2, payloads: 3 }, codex: "people-scavengers",
        } }],
      },
      {
        text: "Ask what they want for the press itself.",
        outcomes: [{ outcome: { next: "s1-barter-press" } }],
      },
      {
        text: "Wave them on.",
        outcomes: [{ outcome: {
          text: "They wave back, cheerfully, and go looking for someone with fewer weapons.",
          codex: "people-scavengers",
        } }],
      },
    ],
  },
  {
    id: "s1-barter-press", pool: "scripted", stages: [1],
    title: "Shopping", art: "scavenger-skiff-hail", portrait: "scavenger", speaker: "Captain of the Fair Enough",
    text: "The captain laughs. Then stops laughing and looks at your lamp cupola for longer than is polite.\n\n\"Tell you what. The press, for the lamp.\"\n\nBehind the captain, two of the crew are casually unhooking boathooks that nobody asked them to unhook.",
    choices: [
      {
        text: "Offer 40 salvage for the press instead.",
        req: { resources: { salvage: 40 } },
        outcomes: [{ outcome: {
          text: "\"You drive a hard bargain, lamper,\" says the captain, who has driven it. The press comes across. You stamp yourselves three hops before handing it back, because it turns out 40 salvage buys the use of a press, not the press. Fair enough.",
          resources: { salvage: -40, ttl: 3 },
        } }],
      },
      {
        text: "No. The lamp stays.",
        outcomes: [
          { weight: 2, outcome: { text: "\"Worth asking,\" the captain says, and the boathooks go back on their hooks. The Fair Enough rolls away." } },
          { weight: 1, outcome: {
            text: "\"Worth asking,\" the captain says, and a boathook comes across the gap for the mesh line.",
            combat: { enemy: "scavenger-skiff", surrenderable: true, intro: "The Fair Enough swings in close, nets out." },
          } },
        ],
      },
    ],
  },
  {
    id: "s1-stutter-relay", pool: "event", stages: [1],
    title: "A Relay with a Stutter", art: "relay-switchyard",
    text: "This relay has a stutter. The helm sends Hello. The relay answers I hear you. The helm answers I hear you hear me, and the relay says I hear you again, as if it wasn't listening the first time.\n\nIts switch will not move until the greeting finishes. At this rate it will finish around the next shift. Behind you, the Seal is not waiting for the next shift.",
    choices: [
      {
        text: "Keep saying it until it takes.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Forty minutes and a great many hellos. The switch throws. Somewhere behind you, the lattice gained a relay while you were being polite.",
            seal: -1,
          } },
          { weight: 1, outcome: { text: "Eleventh time lucky." } },
        ],
      },
      {
        text: "Say it slower, the way teachers do.",
        blue: true, req: { species: "linefolk" },
        outcomes: [{ outcome: {
          text: "{crew:linefolk} leans into the helm mic and says it the way it was said to children in the relay schools, one line at a time, with a pause for the answer. The relay gets it in one. It is so pleased to be spoken to like that it stamps an extra hop on the way through.",
          resources: { ttl: 1 },
        } }],
      },
      {
        text: "Open the switch house and find the stutter.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger} finds a contact that has been bouncing since before the Fault, bends it back with one tool arm, and closes the panel. The relay says I hear you exactly once, and seems embarrassed about the rest. There are spares in the panel nobody will miss.",
          resources: { ttl: 1 }, reward: "low",
        } }],
      },
      {
        text: "Kick the switch house.",
        outcomes: [
          { weight: 1, outcome: { text: "The Runbook does not mention kicking. It works anyway, and {crew} is unbearable about it for the next three relays." } },
          { weight: 1, outcome: {
            text: "The switch house is two hundred years of Reach iron. It wins.",
            crewDamage: { amount: 10, who: "one" }, seal: -1,
          } },
        ],
      },
    ],
  },
  {
    id: "s1-sunside-kit", pool: "event", stages: [1],
    title: "Back After Lunch", art: "sun-glare",
    text: "Sun-side of a spire top, where the copper throws the light back so hard the crew work with their eyes half shut, a lamp crew left their kit on the gantry: smoked goggles on a hook, a coil of splice cable, a fire blanket folded square, and a work order clipped to it.\n\nRELIGHT LAMP 7. BACK AFTER LUNCH.\n\nLamp 7 is out. It has been after lunch for thirty-one years. Out there on the gantry, in that glare, things catch fire.",
    choices: [
      {
        text: "Take the kit.",
        outcomes: [
          { weight: 2, outcome: { text: "Goggles, cable, blanket, and a procedure card for fires in unmanned rooms. All useful. All somebody's.", reward: "low" } },
          { weight: 1, outcome: {
            text: "Under the blanket is a whole fire kit, bolted to a board with the Runbook's fire procedure printed on it. It fits the tender's wiring as if it was made for it. It was: every lamper's car used the same one.",
            augment: "sprinkler-runbook",
          } },
        ],
      },
      {
        text: "Relight lamp 7 for them.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Twenty minutes on the gantry in the glare. Lamp 7 comes on. The relay under it, vouching for anyone who finishes a work order, stamps your connection.",
            resources: { ttl: 1 },
          } },
          { weight: 1, outcome: {
            text: "Lamp 7 comes on. So does the sleeve of the crew member who lit it. The relay stamps your connection anyway, which is small comfort in the infirmary.",
            resources: { ttl: 1 }, crewDamage: { amount: 20, who: "one" },
          } },
        ],
      },
      {
        text: "Send the warden out; fire barely bothers them.",
        blue: true, req: { species: "warden" },
        outcomes: [{ outcome: {
          text: "{crew:warden} relights lamp 7 while their armour smokes gently, and comes back in complaining about the smell. The relay stamps your connection.",
          resources: { ttl: 1 },
        } }],
      },
      {
        text: "Leave it for the lamp crew.",
        outcomes: [{ outcome: { text: "Someone turns the work order face down, so it will not get sunburnt." } }],
      },
    ],
  },
  {
    id: "s1-cut-carrier", pool: "event", stages: [1],
    title: "A Cut Carrier", art: "carrier-cut",
    text: "Behind you, the carrier you came down is cut. The Seal did it an hour ago; the severed end hangs from the last relay, swinging, its core still glowing where the shears went through.\n\nThere is a lampers' trick: splice it again, and the quarantine reads a warm route where it thought it had closed one. The Wraiths go back to cut it a second time, and every hour they spend on that is an hour they are not spending behind you.\n\nThe trick has a weakness. Sometimes a Wraith is still close enough to see you do it.",
    choices: [
      {
        text: "Splice it (2 spares).",
        req: { resources: { spares: 2 } },
        outcomes: [
          { weight: 2, outcome: {
            text: "The splice takes. Somewhere back along the Line, a lattice pauses, turns, and goes back to cut a carrier it already cut.",
            resources: { spares: -2 }, seal: 2,
          } },
          { weight: 1, outcome: {
            text: "The splice takes. So does the attention of the Wraith that made the cut, which was closer than the Listening Post said.",
            resources: { spares: -2 },
            combat: { enemy: "cable-wraith", intro: "LIVE ROUTE ON THIS CARRIER. AGAIN." },
          } },
        ],
      },
      {
        text: "Fuse the core with the Fiber Lance.",
        blue: true, req: { weapon: "fiber-lance" },
        outcomes: [{ outcome: {
          text: "The lance was made for exactly this. Thirty seconds, one clean weld of light, and a carrier that looks alive to anyone counting. Behind you, the Seal goes back to check its work.",
          seal: 2,
        } }],
      },
      {
        text: "Leave it cut and keep moving.",
        outcomes: [{ outcome: { text: "The severed end swings behind you like a pendulum, counting." } }],
      },
    ],
  },
  {
    id: "s1-wedged-tender", pool: "event", stages: [1], unique: true,
    title: "L-31", art: "tender-wreck",
    text: "Below the relay, a cable tender like yours is wedged in the gantry where it fell, split along its spine, its trolley still gripping a snapped end of carrier twenty metres up. Its name has been painted over twice. You can read the dock plate underneath: L-31. Someone took it out before you.\n\nThe cupola is cracked and dark. The keel tanks look intact. Climbing down to it means trusting a gantry that has already dropped one tender.",
    choices: [
      {
        text: "Climb down and strip it.",
        outcomes: [
          { weight: 2, outcome: { text: "Good fittings, a toolbox, a crate of spares still in its straps. The crew are quick and quiet about it.", reward: "med" } },
          { weight: 1, outcome: {
            text: "The gantry lets go under a boot. A safety line holds. The crew member on the end of it does not enjoy the next ten seconds, and brings back less than hoped.",
            reward: "low", crewDamage: { amount: 20, who: "one" },
          } },
        ],
      },
      {
        text: "Bleed its keel tanks into ours.",
        outcomes: [{ outcome: {
          text: "The tanks still hold air, and the ballast is brass. The air goes into the Lamplighter's keel with a long sigh; the brass goes into the hold. Somehow it feels like being given something.",
          repair: 3, resources: { salvage: [10, 20] },
        } }],
      },
      {
        text: "Read what is scratched in its helm.",
        outcomes: [{ outcome: { next: "s1-wedged-tender-helm" } }],
      },
    ],
  },
  {
    id: "s1-wedged-tender-helm", pool: "scripted", stages: [1],
    title: "L-31", art: "lamplighter-helm",
    text: "The helm is the same pattern as yours, down to the dent in the switch lever. The lampers' tallies are there, hundreds of them. Under them, newer, in a shaky hand:\n\nTTL 2 AT THE YARD. SAID HELLO WRONG TWICE. STALLED HERE. GRIP WENT IN THE NIGHT. GOING ON FOOT ALONG THE GANTRY. — K.\n\nThere is nothing after that.",
    choices: [
      {
        text: "Scratch your crew's names under K's.",
        outcomes: [{ outcome: {
          text: "The crew take turns with a crimper point. It feels like saying goodbye to someone you never met, and then like saying hello. The lampers would have understood both.",
          heal: true,
        } }],
      },
      {
        text: "Take the cupola lens for spares.",
        outcomes: [{ outcome: {
          text: "It comes out whole. K would not have minded, probably. Lampers never did like a good lens going to waste.",
          resources: { spares: 2 },
        } }],
      },
    ],
  },
  {
    id: "s1-lampers-bar", pool: "event", stages: [1], unique: true,
    title: "The Lampers' Bar", art: "relay-bench",
    text: "The switch house at this relay was a lampers' bar once. The counter is still there, and the stools, and a slate on the wall where crews chalked their lamp tallies to settle arguments. The last entry on the slate: L-12 · CORRAN · 4,401. Under it, in a different hand: LIAR.\n\nThe walls are covered in margin notes. Someone has written the Runbook's proverbs over the door, and someone else has corrected the spelling.",
    choices: [
      {
        text: "Read the walls.",
        outcomes: [{ outcome: {
          text: "Be strict in what you send and generous in what you accept. Never trust one road. A message that cannot die becomes a storm. And under them, in lampers' capitals: A BEAM HAS TO BE HELD. DON'T LET THE DARK PUT OUT A LAMP. CORRAN OWES EVERYONE A DRINK.",
          codex: "runbook-proverbs",
        } }],
      },
      {
        text: "Drink to the lampers. The tap still runs.",
        outcomes: [{ outcome: {
          text: "It is only water. The crew drink it anyway, standing, the way lampers drank, and somebody chalks a new line on the slate under Corran's: {ship} · 0 · WATCH THIS SPACE.",
          heal: true, codex: "runbook-proverbs",
        } }],
      },
      {
        text: "Search behind the counter.",
        outcomes: [
          { weight: 2, outcome: { text: "Bottle caps, a dartboard, a tin of salvage somebody was saving for a round.", reward: "low" } },
          { weight: 1, outcome: { text: "A lamper's emergency stash, labelled FOR EMERGENCIES in a hand that meant it.", resources: { payloads: 2, spares: 1 } } },
        ],
      },
    ],
  },
  {
    id: "s1-heartbeat-lamp", pool: "event", stages: [1],
    title: "Top of the Hour", art: "relay-switchyard",
    text: "The guide lamp on this relay is blinking. Not the slow standby pulse of every dark relay in the Reach: a double beat, once an hour, exactly. The heartbeat. It must have been set to follow the Heart's pulse before the Fault, and when the pulse stopped it went on counting by itself.\n\nIt blinks as you arrive. The crew all look at the clock. Someone says, \"Top of the hour,\" and nobody laughs.",
    choices: [
      {
        text: "Answer it with the cupola.",
        outcomes: [
          { weight: 3, outcome: {
            text: "The helm flashes the cupola twice. The lamp blinks back, early, as if startled, and the switch comes over before the greeting is even finished. It stamps an extra hop on the connection, the way relays used to for traffic that kept good time.",
            resources: { ttl: 1 },
          } },
          { weight: 1, outcome: { text: "The lamp does not answer. It is counting, not listening. Some machines are like that. Some people too." } },
        ],
      },
      {
        text: "Listen to what it has been counting.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          { weight: 2, outcome: {
            text: "Its counter reads 271,560: thirty-one years of hours, give or take a few it slept through. The crew write the number on the galley wall under the kettle, and take the lamp's spare timer while they are there.",
            reward: "low",
          } },
          { weight: 1, outcome: {
            text: "The lamp's pulse timer is a keepalive unit, the old kind that told a relay's neighbours it was still there. It comes out of its housing in one piece and fits the ward mesh as if it had been waiting to.",
            augment: "keepalive",
          } },
        ],
      },
      {
        text: "Leave it counting.",
        outcomes: [{ outcome: { text: "Behind you, at the top of the next hour, it blinks twice for nobody." } }],
      },
    ],
  },
  {
    id: "s1-crane-cab", pool: "event", stages: [1], unique: true,
    title: "Yard Crane Three", art: "rust-yard",
    text: "Yard crane three is parked at the end of its gantry rail with its cab door open and its boom lowered, the way drivers left them when the lifts were called. Its cab radio is still on. The queue light on it is blinking: one message, outbound, never sent.\n\nThe cab is forty metres up a ladder nobody has climbed since. There is a small child's lamp hanging in the cab window.",
    choices: [
      {
        text: "Climb up to the cab.",
        outcomes: [
          { weight: 3, outcome: {
            text: "The message is from the driver. Tobi is with the Senna family on car fourteen. He has his own lamp. The lamp in the window is not Tobi's, then. It is the driver's, hung there so a small boy on a loading platform could see which crane was his. It went out a long time ago. The crew leave it where it is.",
            fragment: "f1-tobi",
          } },
          { weight: 1, outcome: {
            text: "A rung gives two-thirds of the way up. The crew member on it gets to the cab anyway, bleeding, and reads the message out over the radio: Tobi is with the Senna family on car fourteen. He has his own lamp.",
            fragment: "f1-tobi", crewDamage: { amount: 15, who: "one" },
          } },
        ],
      },
      {
        text: "Send the rigger up the boom.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger} goes up the boom like a beetle and comes down with the crane's toolbox and the message. Tobi is with the Senna family on car fourteen. He has his own lamp. \"The small lamp stays,\" the rigger says. Nobody asked it to say that.",
          fragment: "f1-tobi", reward: "low",
        } }],
      },
      {
        text: "Leave the lamp where it hangs.",
        outcomes: [{ outcome: { text: "Some lamps are not yours to take down." } }],
      },
    ],
  },
  {
    id: "s1-shift-office", pool: "event", stages: [1], unique: true,
    title: "Yard Six Shift Office", art: "relay-bench",
    text: "Yard six's shift office is a hut on the relay platform: a roster board, a coffee pot, and a coolant pump on the desk in forty pieces, half repaired, with a note under it. DON'T TOUCH. I'LL FINISH IT AFTER SHIFT.\n\nThe relay's switchgear runs hot. You can smell it through the walls. It has been running hot for thirty-one years, waiting for this pump. Finishing it means an afternoon with your hands in a pump that bites.",
    choices: [
      {
        text: "Finish the pump.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Two hours, one missing washer found in a coffee cup, and the switchgear cools with a long tick. The relay, with nobody else left to vouch for, vouches for you twice.",
            resources: { ttl: 2 }, fragment: "f1-imre",
          } },
          { weight: 1, outcome: {
            text: "The pump bites. It takes a knuckle's worth of skin before it agrees to run, and then it runs sweetly. The relay stamps your connection, and the roster board gets a new name in the relief column.",
            resources: { ttl: 1 }, crewDamage: { amount: 10, who: "one" }, fragment: "f1-imre",
          } },
        ],
      },
      {
        text: "Let the rigger finish it.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger} finishes it in eleven minutes and then reassembles the coffee pot for good measure. The switchgear cools. The relay stamps two hops and a third for the coffee pot.",
          resources: { ttl: 3 }, fragment: "f1-imre",
        } }],
      },
      {
        text: "Read the roster board.",
        outcomes: [{ outcome: {
          text: "Names in chalk, shift by shift, ending on the Night of the Fault. One line in the margin: swapped shifts with Imre, I owe him a coffee and a working coolant pump. So that is whose pump it is.",
          fragment: "f1-imre",
        } }],
      },
      {
        text: "Make coffee instead.",
        outcomes: [{ outcome: {
          text: "There is coffee in the tin. It is thirty-one years old. The crew drink it anyway, agree it is the worst coffee on the Line, and feel better.",
          heal: true,
        } }],
      },
    ],
  },
  {
    id: "s1-prophet-warning", pool: "event", stages: [1],
    title: "Corrosion Warning", art: "relay-switchyard",
    text: "A Rust Prophet stands over this relay yard: a mast of flaking iron, horns on every side, a warning lamp turning at the top. CORROSION WARNING. CORROSION WARNING. It has been saying so for thirty-one years to a yard with nobody in it, and the rust came anyway, as it said it would.\n\nYour carrier runs right under its horns. When it notices you, it will want you informed. Loudly. On every band the tender listens with.",
    choices: [
      {
        text: "Run under it and take the noise.",
        outcomes: [{ outcome: {
          text: "It informs you. Every system on the tender hears about the corrosion at once, and one of them takes it personally.",
          systemDamage: { system: "random", amount: 1 },
        } }],
      },
      {
        text: "Acknowledge the warning on its own band.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          text: "WARNING ACKNOWLEDGED. The horns go quiet. The lamp keeps turning, but slower, like something that has finally been heard. At the foot of the mast there is a maintenance locker nobody opened because nobody came.",
          reward: "low",
        } }],
      },
      {
        text: "Jam its horns before it gets going.",
        blue: true, req: { weapon: "ion" },
        outcomes: [
          { weight: 2, outcome: { text: "The jammer floods its inputs. For a whole hop's worth of time, the Prophet has nothing to say. You go.", reward: "low" } },
          { weight: 1, outcome: {
            text: "It shrugs off the jam and turns every horn toward you.",
            combat: { enemy: "rust-prophet", intro: "ALL TRAFFIC PASSING THIS MAST WILL BE INFORMED." },
          } },
        ],
      },
      {
        text: "End its broadcast for good.",
        outcomes: [{ outcome: {
          text: "The warning lamp stops, turns, and points at you.",
          combat: { enemy: "rust-prophet", intro: "CORROSION WARNING. INFORMING." },
        } }],
      },
    ],
  },
  {
    id: "s1-mites-in-switch", pool: "event", stages: [1],
    title: "Mites in the Switch", art: "relay-switchyard",
    text: "The relay will not switch. Its switch house is full of spark mites: a Static Nest's brood, hatched to hold lines, holding this relay's lines as hard as they can. They crawl over the contacts in a glittering crust. The greeting goes in and comes out chewed.\n\nThey are cleaning mites, really. They were built to strip corrosion off contacts. They are stripping the relay. They also bite.",
    choices: [
      {
        text: "Go in and clear them by hand.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Brooms, gloves and a good deal of language. The mites go. The relay switches. The crew member who did the most sweeping will be itching for days.",
            crewDamage: { amount: 15, who: "one" }, reward: "low",
          } },
          { weight: 1, outcome: {
            text: "The mites go, eventually, after they have been everywhere. Everyone is bitten. Nobody is happy. The relay switches.",
            crewDamage: { amount: 15, who: "all" },
          } },
        ],
      },
      {
        text: "Send the warden in; the armour doesn't mind mites.",
        blue: true, req: { species: "warden" },
        outcomes: [{ outcome: {
          text: "{crew:warden} walks into the switch house, stands still, and lets the mites climb on. They swarm the armour for a while, find nothing live, and get bored. The warden walks out again carrying most of them and shakes them off onto the gantry.",
        } }],
      },
      {
        text: "Find the nest they came from.",
        outcomes: [{ outcome: {
          text: "Under the relay platform, a hive the size of a lift car is humming. It has noticed you noticing it.",
          combat: { enemy: "static-nest", intro: "PASSING CARRIER HAS LINES. HATCHING TO HOLD 1 MORE." },
        } }],
      },
    ],
  },
  {
    id: "s1-foundry-canteen", pool: "event", stages: [1],
    title: "Staff Only", art: "foundry-mouth",
    text: "The carrier runs along the wall of Foundry Four, doused on the Night of the Fault and cold ever since. Its canteen hangs off the side of the foundry on brackets, with a window onto the carrier and a sign: STAFF ONLY · WIPE YOUR BOOTS · NO CRANES.\n\nThe stove is cold. The larder is not empty. Foundry crews ate as if every shift was the last one.",
    choices: [
      {
        text: "Raid the larder.",
        outcomes: [{ outcome: {
          text: "Tinned beans, hard biscuit, and a jar labelled NOT YOURS, which the crew respect for nearly a minute. Everyone eats properly for the first time since Relay Seven.",
          heal: true,
        } }],
      },
      {
        text: "Take the stove apart for salvage.",
        outcomes: [{ outcome: {
          text: "It is foundry iron and weighs as much as a warden. It comes aboard in pieces, and the pieces are worth something.",
          reward: "low",
        } }],
      },
      {
        text: "Leave it for the foundry crew.",
        outcomes: [{ outcome: { text: "Someone wipes their boots on the way out. You never know." } }],
      },
    ],
  },
  {
    id: "s1-leech-on-carrier", pool: "event", stages: [1],
    title: "Something Asleep", art: "machine-hulk",
    text: "A Packet Leech is clamped to your carrier a hundred metres ahead, asleep. It is between you and the relay. Its buffer tank glows amber in slow pulses, like breathing.\n\nYou cannot go round it; there is only one carrier. You can go past it, if you are quiet, and the trolley is not.",
    choices: [
      {
        text: "Creep past with the drive throttled back.",
        outcomes: [
          { weight: 2, outcome: { text: "The trolley rolls past a metre from its intake arms. Nobody breathes. The leech does not wake." } },
          { weight: 1, outcome: {
            text: "The trolley squeals on a frosted splice. The pulses in the buffer tank stop.",
            combat: { enemy: "packet-leech", intro: "The clamps unfold toward the one live thing on the carrier." },
          } },
        ],
      },
      {
        text: "Go lamp-dark and run past.",
        blue: true, req: { system: { id: "veil", level: 1 } },
        outcomes: [{ outcome: { text: "Every lamp out, every hum damped. To the leech, the tender is a slightly colder patch of carrier. It dreams on." } }],
      },
      {
        text: "Knock it off the carrier while it sleeps.",
        blue: true, req: { weapon: "laser" },
        outcomes: [
          { weight: 2, outcome: {
            text: "One bolt to the grip. It lets go and hangs from its safety line, still asleep, buffer tank swinging. It will be fine. It will be furious, by leech standards. It drops a tray of spares on the way down.",
            reward: "low",
          } },
          { weight: 1, outcome: {
            text: "The grip holds. The leech does not sleep through that.",
            combat: { enemy: "packet-leech", intro: "Woken, it clamps down on the carrier and turns." },
          } },
        ],
      },
      {
        text: "Wake it and end its task.",
        outcomes: [{ outcome: {
          text: "The crew hammer on the hull until the amber pulses stop.",
          combat: { enemy: "packet-leech", intro: "CARRIER TRAFFIC DETECTED. HOLDING FOR COLLECTION." },
        } }],
      },
    ],
  },
  {
    id: "s1-wraith-behind", pool: "event", stages: [1],
    title: "Behind You", art: "carrier-cut",
    text: "The Listening Post hears it before anyone sees it: something on your carrier, behind you, closing. Long and thin, shears at the nose, trailing cut cable. A Cable Wraith, crawling the route you just made and cutting it as it comes.\n\nIt is not chasing you. It is following the order. The order says to cut every route the storm could use, and your route is right in front of it.",
    choices: [
      {
        text: "Run for the next relay.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The greeting goes out at a run. The switch throws with the shears ten metres behind the trolley. Behind you, the carrier parts with a sound like a dropped bell.",
            seal: -1,
          } },
          { weight: 1, outcome: {
            text: "The relay is slow to answer. The shears are not.",
            combat: { enemy: "cable-wraith", intro: "LIVE ROUTE ON THIS CARRIER. CUTTING." },
          } },
        ],
      },
      {
        text: "Open the drive all the way.",
        blue: true, req: { system: { id: "engines", level: 3 } },
        outcomes: [{ outcome: { text: "The trolley screams on the carrier and the car swings like a bell. The Wraith falls behind, patient, cutting. You are three relays on before it reaches the first." } }],
      },
      {
        text: "Turn and end its task.",
        outcomes: [{ outcome: {
          text: "The crew bring the weapons round to the tail.",
          combat: { enemy: "cable-wraith", intro: "STORM PATH. CUTTING PER ORDER OF HOUR 11." },
        } }],
      },
    ],
  },
  {
    id: "s1-escort-hello", pool: "event", stages: [1],
    title: "Curled on the Gantry", art: "machine-escort",
    text: "An escort automaton is curled on the gantry at this relay, powered down, lens dark. Its machine must have finished its task somewhere nearby; this one stayed where it was put, the way escorts do, waiting for a crew to follow.\n\nThe Night Shift know a way. Wipe it back to its first page, and it will trust the first voice that greets it properly. Say it right, all three lines, and the lens goes teal. Say it wrong, and it goes red, and you should step back quickly.",
    choices: [
      {
        text: "Let the rigger talk it through.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger} crouches beside it and says nothing for a long time. Then the greeting, all three lines, slow and exact. The lens flickers and settles teal. \"It asked where the crew was,\" {crew:rigger} says. \"I said: here.\"",
          crewJoin: { species: "rigger" },
        } }],
      },
      {
        text: "Wipe it with the Listening Post and greet it.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          { weight: 3, outcome: {
            text: "The Listening Post walks it back to its first page. {crew} says hello. The lens goes teal. It stands up, looks at the crew one by one, and follows you aboard.",
            crewJoin: { species: "rigger" },
          } },
          { weight: 1, outcome: {
            text: "The lens goes red. A tool arm comes round fast, and then the escort curls up again and stays curled.",
            crewDamage: { amount: 15, who: "one" },
          } },
        ],
      },
      {
        text: "Try the first hello anyway.",
        outcomes: [
          { weight: 1, outcome: {
            text: "Hello. A pause. I hear you. A longer pause. I hear you hear me. The lens goes teal, and everyone lets out a breath they did not know they were holding.",
            crewJoin: { species: "rigger" },
          } },
          { weight: 1, outcome: {
            text: "Somebody says it in the wrong order. The lens goes red, a tool arm lashes out, and then it curls up and will not wake again.",
            crewDamage: { amount: 20, who: "one" },
          } },
        ],
      },
      {
        text: "Take its spares instead.",
        outcomes: [{ outcome: {
          text: "Two teal lenses, carefully removed. It would have been someone. The crew are quiet about it for a while.",
          resources: { spares: 2 },
        } }],
      },
    ],
  },
  {
    id: "s1-debris-snag", pool: "event", stages: [1],
    title: "Snagged", art: "debris-field",
    text: "A piece of the Night of the Fault is hanging on your carrier: half a freight cage, snagged by one corner, swinging in the wind off the break. The trolley cannot pass it. The cage weighs more than the tender.\n\nThere is a way round: back up to the last relay and take the long carrier, which costs a switch. Or somebody goes out on the grip arms with a cutter, in air too thin to breathe, and cuts it loose.",
    choices: [
      {
        text: "Back up and take the long way (1 TTL).",
        req: { resources: { ttl: 1 } },
        outcomes: [{ outcome: { text: "The long carrier sags over a spire top for twenty kilometres. It is a very nice view. It cost a hop.", resources: { ttl: -1 } } }],
      },
      {
        text: "Send someone out with a cutter.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Twenty minutes on the grip arms in a mask. The cage lets go and falls into the cloud sea, but not before the crew have helped themselves to what was in it.",
            reward: "low",
          } },
          { weight: 1, outcome: {
            text: "The cage swings on its last strand and catches the crew member cutting it. They come back in grey-faced and holding one arm, and the cage goes into the cloud sea with everything in it.",
            crewDamage: { amount: 25, who: "one" },
          } },
        ],
      },
      {
        text: "Shoot the snag loose with rivet scatter.",
        blue: true, req: { weapon: "flak" },
        outcomes: [{ outcome: { text: "Three rivets through the snagged corner, and the cage drops away into the clouds. It is the most useful thing the scatter gun has ever done, and it knows it." } }],
      },
      {
        text: "Send the rigger; it doesn't need air.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger} walks out along the grip arm, cuts the cage loose one-handed, and passes its contents in through the hatch before letting it go.",
          reward: "low",
        } }],
      },
    ],
  },
  {
    id: "s1-derelict-freight", pool: "event", stages: [1], unique: true,
    title: "Return to Dock 9", art: "derelict-car",
    text: "A freight car is stalled alone on the carrier ahead, uncoupled, its coupling hook swinging. Dock stencil on the side: REACH FREIGHT · RETURN TO DOCK 9. Its trolley brake is set. Someone uncoupled it here on the Night of the Fault to make a tender faster, and never came back for it.\n\nIt would couple to the Lamplighter's tail. Wrestling a thirty-year-old hook onto a live car takes time, though, and the Seal is not far behind.",
    choices: [
      {
        text: "Couple it to the tail.",
        outcomes: [{ outcome: {
          text: "An hour of swearing at a hook that has not moved since the Fault, and it closes with a clang the whole car feels. The Lamplighter has a freight car. Behind you, the lattice has had an hour too.",
          car: "freight-car", seal: -1,
        } }],
      },
      {
        text: "Let the rigger couple it.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger} climbs out along the tail, frees the hook with one tool arm and seats it with another. Six minutes. The freight car follows the Lamplighter down the carrier like it was always meant to.",
          car: "freight-car",
        } }],
      },
      {
        text: "Strip its hold out for the module stores.",
        outcomes: [{ outcome: {
          text: "Its cargo hold is a dock-standard socket frame. It unbolts in one piece and goes into the module stores, and the empty car stays where it is, still waiting for Dock 9.",
          module: "cargo-hold",
        } }],
      },
      {
        text: "Leave it for Dock 9.",
        outcomes: [{ outcome: { text: "RETURN TO DOCK 9, it says. Someone will, one day." } }],
      },
    ],
  },
  {
    id: "s1-relief-returns", pool: "event", stages: [1], unique: true, weight: 3,
    requires: { flag: "s1-relief-owed" },
    title: "Night Relief", art: "relay-switchyard", portrait: "recruit-warden-b", speaker: "Night relief warden",
    text: "A Night Shift repair car overtakes you on the parallel carrier with its lamp flashing: the stalled relief car you shared a hop with, running again. The two wardens are on the roof, as before, as if they never came down.\n\n\"Found a press,\" the older one calls across. \"Found a crate, too. Don't ask where. We said we'd pay you back.\"",
    choices: [
      {
        text: "Received, with thanks.",
        outcomes: [{ outcome: {
          text: "Two hops stamped across the gap and a crate of payloads on a line. \"Leave the lamp on,\" they call, and the relief car drops back onto its own carrier.",
          resources: { ttl: 2, payloads: 2 }, clearFlags: ["s1-relief-owed"],
        } }],
      },
      {
        text: "Ask where the crate came from.",
        outcomes: [{ outcome: {
          text: "\"A Scrap Foreman condemned it,\" says the younger one. \"We appealed.\" The hops and the crate come across anyway.",
          resources: { ttl: 2, payloads: 2 }, clearFlags: ["s1-relief-owed"],
        } }],
      },
    ],
  },

  // ─── pool: distress ──────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s1-sos-lift-car", pool: "distress", stages: [1],
    title: "Three Taps", art: "lift-car-stuck",
    text: "An unknown signal on the lift band: three taps, a pause, three taps. It comes from a lift car stuck in an open shaft near the top of a spire, hanging askew on its rails. Every window is dark but one.\n\nThe car has been there since the machines at the spire foot stopped knowing anyone. Something inside is still tapping. Your carrier passes close enough to the shaft to reach the roof hatch, just.",
    choices: [
      {
        text: "Bring the tender close and open the roof hatch.",
        outcomes: [{ outcome: { next: "s1-sos-lift-car-inside" } }],
      },
      {
        text: "Tap back first.",
        outcomes: [
          { weight: 2, outcome: { text: "Three taps come back, faster. Then a fourth, which in any language means hurry up.", next: "s1-sos-lift-car-inside" } },
          { weight: 1, outcome: { text: "The tapping stops. It does not start again, however long you wait. Whatever was keeping time in there has decided you are not the one it was waiting for." } },
        ],
      },
      {
        text: "Leave it. Something tapping for thirty-one years is not a person.",
        outcomes: [{ outcome: { text: "The tapping follows you down the carrier for a while, on the lift band, then fades." } }],
      },
    ],
  },
  {
    id: "s1-sos-lift-car-inside", pool: "scripted", stages: [1],
    title: "Three Taps", art: "lift-car-stuck", portrait: "recruit-linefolk-b", speaker: "The woman in the lift car",
    text: "Inside: somebody else's luggage, a lamp rigged to a battery by someone clever, and a radio patched into the car's own shaft aerial. And a woman in a Night Shift coat, sixty or so, who climbed down from the gantry six weeks ago to strip the car and could not climb back up.\n\n\"You took your time,\" she says. \"I've been listening to this all month.\" The radio is playing a message it caught years ago, coming up the shaft from the spire foot, over and over.",
    choices: [
      {
        text: "Offer her a place on the crew.",
        outcomes: [{ outcome: {
          text: "\"Somewhere with a kettle,\" she says. \"Yes.\" She brings the radio log with her. The message on it is from car 31, at the bottom of this very shaft, thirty years ago: the doors won't open, we're climbing out of the roof hatch.",
          crewJoin: { species: "linefolk" }, fragment: "f1-roof-hatch",
        } }],
      },
      {
        text: "Take her to the next bench and let her go home.",
        outcomes: [{ outcome: {
          text: "She pays for the trip with everything in the luggage that isn't clothes, and the radio log, which she says she doesn't need any more. The message on it is from car 31, at the foot of the shaft: the doors won't open, we're climbing out of the roof hatch, please reset the doors when convenient.",
          reward: "low", fragment: "f1-roof-hatch",
        } }],
      },
    ],
  },
  {
    id: "s1-sos-courier", pool: "distress", stages: [1],
    title: "Hand over Hand", art: "spire-top", portrait: "recruit-courier-a", speaker: "The courier",
    text: "A signal on a hand lamp: long, short, long. Help, but polite about it.\n\nAhead, a courier is hanging from your carrier, hand over hand, satchel across the chest, a hundred metres short of the next relay and quite clearly out of arm.\n\n\"Evening,\" says the courier, when you come alongside. \"Don't suppose you're going my way.\"",
    choices: [
      {
        text: "Get them in through the hatch.",
        outcomes: [{ outcome: { next: "s1-sos-courier-aboard" } }],
      },
      {
        text: "Throw them a line and tow them to the relay.",
        outcomes: [{ outcome: {
          text: "They ride the line to the switch house, drop onto the gantry, and pay you in the only currency couriers carry: a sealed envelope of salvage chits from the Copper Market, and a very good bit of gossip about Pell.",
          reward: "low",
        } }],
      },
      {
        text: "Ask what is in the satchel first.",
        outcomes: [
          { weight: 2, outcome: { text: "\"Letters,\" says the courier. \"What else would it be. Can I come in, please, my hands have stopped working.\"", next: "s1-sos-courier-aboard" } },
          { weight: 1, outcome: { text: "\"None of your business,\" says the courier, and lets go, and lands neatly on a gantry you had not seen, and walks off without looking back. Couriers." } },
        ],
      },
    ],
  },
  {
    id: "s1-sos-courier-aboard", pool: "scripted", stages: [1],
    title: "Hand over Hand", art: "tender-radio", portrait: "recruit-courier-a", speaker: "The courier",
    text: "Inside, the courier stamps some life back into their feet, drinks two cups of tea without being offered either, and explains. Letters for Bench Nine, a key for the Copper Market, and a parcel for nobody in particular that they have been carrying so long they have forgotten who gave it to them.\n\n\"I'd rather be on something with a lamp,\" the courier says. \"If you're hiring.\"",
    choices: [
      {
        text: "Welcome aboard.",
        outcomes: [{ outcome: {
          text: "The satchel goes on a hook by the galley hatch and stays there. So does the courier.",
          crewJoin: { species: "courier" },
        } }],
      },
      {
        text: "Drop them at the next bench, with thanks.",
        outcomes: [{ outcome: {
          text: "At the next relay the courier leaves you the parcel for nobody in particular. It turns out to be spares, carefully wrapped. Somebody, once, was very organised.",
          resources: { spares: 2 },
        } }],
      },
    ],
  },
  {
    id: "s1-sos-skiff-grip", pool: "distress", stages: [1],
    title: "Grip Failed", art: "scavenger-skiff-hail",
    text: "UNKNOWN SIGNAL · GRIP FAILED · PLEASE.\n\nA scavenger skiff is hanging by one grip arm from a carrier below yours, tilted thirty degrees, its crew waving hand lamps from every window. The other grip is open and slipping.\n\nIt might be exactly what it looks like. Scavengers have also been known to hang a skiff at an angle and wave lamps at passing cars, and then come aboard with boathooks.",
    choices: [
      {
        text: "Lower a cable and haul them level.",
        outcomes: [
          { weight: 2, outcome: { text: "The cable takes the weight. The skiff comes level with a groan, and the waving turns into cheering.", next: "s1-sos-skiff-grateful" } },
          { weight: 1, outcome: {
            text: "The first one up the cable has a boathook and an apologetic expression.",
            combat: { enemy: "scavenger-skiff", surrenderable: true, intro: "\"Sorry about this,\" someone calls. \"Times are hard.\"" },
          } },
        ],
      },
      {
        text: "Listen to the grip motor before you commit.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          text: "The Listening Post hears a grip motor straining and a bearing that has given up. It is real. You lower the cable.",
          next: "s1-sos-skiff-grateful",
        } }],
      },
      {
        text: "Keep going.",
        outcomes: [{ outcome: { text: "Behind you the lamps stop waving. Whether they got the grip back, you will not find out." } }],
      },
    ],
  },
  {
    id: "s1-sos-skiff-grateful", pool: "scripted", stages: [1],
    title: "Grip Failed", art: "scavenger-skiff-hail", portrait: "scavenger", speaker: "Skiff captain",
    text: "The skiff is called the Gristle, and it will not be winning any prizes. Its captain comes across on the cable to shake hands, still shaking.\n\n\"We owe you,\" she says. \"We haven't got much. We've got some salvage. We've also got our Pim, who's been saying for two years he wants off this skiff and onto something with a proper kettle.\" Pim, in the window, waves.",
    choices: [
      {
        text: "Take the salvage.",
        outcomes: [{ outcome: { text: "It is not much. It is everything they could spare, and they spare it gladly.", reward: "med" } }],
      },
      {
        text: "Take Pim.",
        outcomes: [{ outcome: {
          text: "Pim comes across the cable with one bag and a grin, and goes straight to the galley to inspect the kettle. It passes.",
          crewJoin: { species: "linefolk", name: "Pim Latchford" },
        } }],
      },
    ],
  },
  {
    id: "s1-sos-downlink", pool: "distress", stages: [1],
    title: "From Below", art: "radio-mast-ground",
    text: "A very faint signal, coming up this relay's downlink from under the cloud floor. The relay cannot deliver it; the quarantine holds everything. So it has kept this one packet in its switch-house buffer, and every few minutes, patiently, it tries again.\n\nIt was sent up from the Ground. It is thirty years old.",
    choices: [
      {
        text: "Read it.",
        outcomes: [{ outcome: {
          text: "We are all right. It rains here all the time. Everyone is wet and nobody is hurt. Is anyone still up there? The crew are quiet for a while. Then somebody laughs, because it rains down there all the time, and everyone is wet, and nobody is hurt.",
          fragment: "f1-first-rain",
        } }],
      },
      {
        text: "Answer it.",
        outcomes: [{ outcome: {
          text: "The relay takes your reply, and holds it too. It can no more go down than the other could come up. It will go when everything goes. The crew read the old packet while they wait: we are all right, it rains here all the time.",
          fragment: "f1-first-rain",
        } }],
      },
      {
        text: "Listen further down the downlink.",
        blue: true, req: { system: { id: "sensors", level: 3 } },
        outcomes: [{ outcome: {
          text: "Below the first packet there are more. Hundreds, stacked in the dark, all waiting. Births. Weather. A recipe. We are all right, says the oldest. It rains. Is anyone still up there. The Listening Post has to be turned down before it overflows.",
          fragment: "f1-first-rain", reward: "low",
        } }],
      },
    ],
  },
  {
    id: "s1-sos-relief-car", pool: "distress", stages: [1],
    title: "Expired in Transit", art: "relay-switchyard", portrait: "recruit-warden-b", speaker: "Night relief warden",
    text: "A Night Shift repair car is stalled on the carrier at this relay, lamp lit, trolley braked. Its TTL ran out two days ago; no relay will switch it. Two wardens sit on its roof in their armour, playing cards on an upturned toolbox, waiting for anything with a stamp.\n\n\"We'd get up,\" one calls, \"but we've been sitting so long it would look like showing off.\"",
    choices: [
      {
        text: "Share a hop with them (1 TTL).",
        req: { resources: { ttl: 1 } },
        outcomes: [{ outcome: {
          text: "Your press card goes across on a line and comes back one hop lighter. The relief car's lamp flickers as the relay hears it again. \"We'll pay you back,\" the older warden says. Wardens generally do.",
          resources: { ttl: -1 }, flags: ["s1-relief-owed"],
        } }],
      },
      {
        text: "Offer one of them a place on the crew.",
        outcomes: [{ outcome: {
          text: "The younger one looks at the older one. The older one says she will wait for the next car; she is very good at waiting. The younger one comes across with a kitbag and a deck of cards.",
          crewJoin: { species: "warden" },
        } }],
      },
      {
        text: "Leave them to their game.",
        outcomes: [{ outcome: { text: "\"Mind how you go,\" they call, and deal another hand." } }],
      },
    ],
  },
  {
    id: "s1-sos-leech-echo", pool: "distress", stages: [1],
    title: "A Calm Voice", art: "machine-hulk",
    text: "A distress call on the lamp band: a voice, calm and clear, asking any tender to come alongside. The voice is a recording. The Listening Post can hear the hiss where it was cut and joined.\n\nPacket Leeches keep what they gather, and some of what they gathered on the Night of the Fault was distress calls. A leech that wants a live connection close enough to drain has everything it needs to ask for one.",
    choices: [
      {
        text: "Go and look anyway. Someone recorded it for a reason.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The recording stops mid-word when you come alongside. The clamps open.",
            combat: { enemy: "packet-leech", intro: "BUFFER 100%. HOLDING YOUR TRAFFIC FOR COLLECTION." },
          } },
          { weight: 1, outcome: {
            text: "It really is a recording, playing from a stalled freight car with nobody in it. Whoever set it going left long ago, and left a crate behind.",
            reward: "low",
          } },
        ],
      },
      {
        text: "Find the original call inside the broadcast.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          text: "The Listening Post finds it: a tender chief calling for help at hour two, and, under it, the answer she got. A tender came. Both calls ended up in a leech's buffer, the question and the answer together. You leave the leech with its recording, and go the long way round it.",
        } }],
      },
      {
        text: "Keep the lamp dim and go past.",
        outcomes: [{ outcome: { text: "The calm voice keeps asking, behind you, for a tender that already came." } }],
      },
    ],
  },
  {
    id: "s1-sos-crane-driver", pool: "distress", stages: [1],
    title: "Condemned, Twice", art: "rust-yard",
    text: "Somebody is swearing on the yard band, fluently and with feeling. A Night Shift scavenger climbed into the cab of a gantry crane to strip its radio, and the crane, which turns out to be a Scrap Foreman, locked the cab and began to inspect her.\n\nShe has been condemned, she says, twice, and she would like to get out before it files the paperwork.",
    choices: [
      {
        text: "End the Foreman's task.",
        outcomes: [{ outcome: {
          text: "\"Mind the cab,\" she shouts. \"I'm in it.\"",
          combat: { enemy: "scrap-foreman", intro: "INSPECTION IN PROGRESS. PLEASE DO NOT DISTURB THE INSPECTED.", onWin: "s1-sos-crane-driver-free" },
        } }],
      },
      {
        text: "Have the rigger open the cab lockout.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger} climbs the crane's rail while it is busy inspecting and opens the lockout with a tool arm and a quiet hello. The cab door swings open.",
          next: "s1-sos-crane-driver-free",
        } }],
      },
      {
        text: "File a release for her.",
        blue: true, req: { species: "courier" },
        outcomes: [{ outcome: {
          text: "{crew:courier} writes out a release slip: condemned item reclassified as personnel, returned to owner. The Foreman reads it through the cab window, considers, and opens the door.",
          next: "s1-sos-crane-driver-free",
        } }],
      },
      {
        text: "Wish her luck.",
        outcomes: [{ outcome: { text: "\"Luck,\" she says, in a tone. The swearing follows you down the carrier." } }],
      },
    ],
  },
  {
    id: "s1-sos-crane-driver-free", pool: "scripted", stages: [1],
    title: "Condemned, Twice", art: "rust-yard", portrait: "recruit-linefolk-a", speaker: "Hester",
    text: "She comes down the crane's ladder with the radio she came for under one arm and a chalk circle on her back.\n\n\"Hester,\" she says. \"Scavenger, formerly. I've had enough of cranes for one life. I've also got this radio, which is worth something to someone.\"",
    choices: [
      {
        text: "Ask her to come with you.",
        outcomes: [{ outcome: {
          text: "\"Anywhere without a gantry,\" says Hester, and then looks at the carrier, and sighs, and comes anyway.",
          crewJoin: { species: "linefolk", name: "Hester Gantry" },
        } }],
      },
      {
        text: "Take the radio as the fee.",
        outcomes: [{ outcome: { text: "She hands it over without argument. It is a very good radio. She tells you so twice.", reward: "med" } }],
      },
    ],
  },
  {
    id: "s1-sos-nest-hut", pool: "distress", stages: [1],
    title: "HELP · MITES · KETTLE", art: "relay-bench",
    text: "A distress call from a switch house, in three words: HELP · MITES · KETTLE. Then nothing.\n\nThe relay's platform is crawling with spark mites, glittering. Under the platform something the size of a lift car is humming: a Static Nest. There is a light on in the switch house window, and a face in it, and, in front of the face, a kettle.",
    choices: [
      {
        text: "End the nest's task.",
        outcomes: [{ outcome: {
          text: "The face in the window gives you a thumbs up and ducks.",
          combat: { enemy: "static-nest", intro: "BROOD ACTIVE. HATCHING TO HOLD 1 MORE.", onWin: "s1-sos-nest-hut-after" },
        } }],
      },
      {
        text: "Walk the warden through the mites to the door.",
        blue: true, req: { species: "warden" },
        outcomes: [{ outcome: {
          text: "{crew:warden} wades across the platform with mites climbing the armour and brings the switch-house keeper back out on one shoulder, kettle and all.",
          next: "s1-sos-nest-hut-after",
        } }],
      },
      {
        text: "Signal that you cannot help.",
        outcomes: [{ outcome: { text: "The face in the window nods, as if it had expected that, and turns back to the kettle." } }],
      },
    ],
  },
  {
    id: "s1-sos-nest-hut-after", pool: "scripted", stages: [1],
    title: "HELP · MITES · KETTLE", art: "relay-bench", portrait: "bench-keeper", speaker: "Old Dunstan",
    text: "The switch-house keeper is called Dunstan. He has kept this relay for twenty-nine years for nobody in particular, and he has a stamp press, a drawer of spares, and a kettle that has been waiting for company.\n\n\"The mites came up in the spring,\" he says. \"I kept thinking someone would come by. Someone did. Sit down.\"",
    choices: [
      {
        text: "Take a cup, and a re-stamp.",
        outcomes: [{ outcome: {
          text: "The tea is strong enough to stand a spoon in. The press thumps twice. Dunstan writes the tender's name in his log with the time, and underlines it.",
          heal: true, resources: { ttl: 2 },
        } }],
      },
      {
        text: "Take what he can spare from the drawer.",
        outcomes: [{ outcome: {
          text: "\"Sorted by what they could still save,\" Dunstan says, handing over the good ones. \"Bring some back if you're passing.\"",
          reward: "med",
        } }],
      },
    ],
  },
  {
    id: "s1-sos-kettle-alarm", pool: "distress", stages: [1],
    title: "A Long Whistle", art: "relay-bench",
    text: "The unknown signal is a single long whistle on the lamp band, rising in pitch. It takes the crew a minute to work out what it is. Somebody at this relay wired their kettle to the alarm transmitter, so it would tell them it had boiled wherever they were on the Line.\n\nThe kettle is still on. It has been boiling dry, refilling from a drip line, and boiling again for longer than anyone wants to calculate.",
    choices: [
      {
        text: "Turn off the kettle.",
        outcomes: [{ outcome: {
          text: "Silence on the lamp band for the first time in years. Then somebody on the crew turns it back on again, because it would be rude to waste a kettle that has been waiting this long, and everyone has a cup.",
          heal: true,
        } }],
      },
      {
        text: "Look for whoever put it on.",
        outcomes: [{ outcome: { next: "s1-sos-kettle-note" } }],
      },
      {
        text: "Take the kettle.",
        outcomes: [{ outcome: {
          text: "{crew} lifts it off the ring, looks at it for a while, and puts it back. You do not take a bench's kettle. Everybody knows that.",
        } }],
      },
    ],
  },
  {
    id: "s1-sos-kettle-note", pool: "scripted", stages: [1],
    title: "A Long Whistle", art: "relay-bench",
    text: "A note is pinned under the kettle's handle.\n\nGONE TO RELIGHT LAMP 12. BACK BEFORE IT BOILS. — J.\n\nLamp 12 is on the next gantry out. It is dark. It is always dark. The gantry to it is missing a section, and there is a coat on the far side, folded, as if someone put it down to have both hands free.",
    choices: [
      {
        text: "Relight lamp 12 for J.",
        outcomes: [
          { weight: 2, outcome: {
            text: "It takes the tender's longest splice line and a steady hand. Lamp 12 comes on. The relay, which has been waiting for J. to come back and finish, stamps your connection instead. The coat stays where it is.",
            resources: { ttl: 1 },
          } },
          { weight: 1, outcome: {
            text: "The splice line slips once, badly, before it holds. Lamp 12 comes on. The relay stamps your connection. The crew member who went across does not want to talk about the gap in the gantry.",
            resources: { ttl: 1 }, crewDamage: { amount: 15, who: "one" },
          } },
        ],
      },
      {
        text: "Leave the kettle on for J.",
        outcomes: [{ outcome: { text: "Someone tops up the drip line before you go. Back before it boils, the note says. It is always about to boil." } }],
      },
    ],
  },
  {
    id: "s1-sos-foundry", pool: "distress", stages: [1],
    title: "Foundry Three", art: "foundry-mouth",
    text: "A signal from Foundry Three, where the furnace was banked, not doused, and still glows dull red after thirty-one years. Someone is signalling with a hand lamp from the old control gallery above the furnace mouth.\n\nBetween you and them is the thing that guards the furnace: a Ferric Colossus, built into the foundry wall, iron to the shoulders. Foundry crews used to say it was the best-built machine in the Reach. They said it with feeling. It is far heavier than anything you have met so far.",
    choices: [
      {
        text: "End the Colossus's task.",
        outcomes: [{ outcome: {
          text: "The furnace door in its chest opens a crack, and the heat reaches you through the plating.",
          combat: { enemy: "ferric-colossus", intro: "UNKNOWN SENDER ON FOUNDRY CARRIER. NOT IRON. FURNACE DOOR CLOSED.", onWin: "s1-sos-foundry-gallery" },
        } }],
      },
      {
        text: "Jam it long enough to get the gallery door open.",
        blue: true, req: { weapon: "ion" },
        outcomes: [
          { weight: 2, outcome: {
            text: "The jammer floods its inputs, and for ninety seconds the Colossus stands in its wall trying to remember what iron is. It is long enough.",
            next: "s1-sos-foundry-gallery",
          } },
          { weight: 1, outcome: {
            text: "It remembers faster than you hoped.",
            combat: { enemy: "ferric-colossus", intro: "NOT IRON. NOT REDUNDANT.", onWin: "s1-sos-foundry-gallery" },
          } },
        ],
      },
      {
        text: "Signal back that it is too dangerous.",
        outcomes: [{ outcome: { text: "The hand lamp blinks: understood. Then: good luck. Then it goes out, and you do not know if that means anything." } }],
      },
    ],
  },
  {
    id: "s1-sos-foundry-gallery", pool: "scripted", stages: [1],
    title: "Foundry Three", art: "foundry-mouth", portrait: "recruit-warden-a", speaker: "The foundry warden",
    text: "In the control gallery is a young warden, armour scorched, sitting on a crate with her hand lamp in her lap. She came to see if the banked furnace could be lit again, for the Night Shift's winter, and the Colossus disagreed.\n\n\"Three days,\" she says. \"I've been reading the foundry stores list to stay awake. There's good stuff in here. Nobody's been able to get to it.\"",
    choices: [
      {
        text: "Bring her aboard, and the best of the stores.",
        outcomes: [{ outcome: {
          text: "She walks out past the quiet Colossus without looking at it, carrying a crate. \"I'll come,\" she says. \"I'm done with furnaces.\"",
          crewJoin: { species: "warden" }, reward: "low",
        } }],
      },
      {
        text: "Take everything the stores list says is worth taking.",
        outcomes: [{ outcome: {
          text: "She reads the list aloud and the crew carry. At the end she shakes everyone's hand and goes home along the gantry, and the hold is heavier than it has ever been.",
          reward: "high",
        } }],
      },
    ],
  },
  {
    id: "s1-sos-lost-rigger", pool: "distress", stages: [1],
    title: "Awaiting Instruction", art: "machine-escort",
    text: "A signal on the maintenance band, repeating: RIGGER 12-PIPIT · CREW NOT FOUND · AWAITING INSTRUCTION.\n\nOn the gantry below the relay stands a rigger with a painted designation and a scrap of red cloth tied round one tool arm. A Night Shift rigger, re-keyed years ago. Its crew's car is nowhere. Its lens turns to follow the tender in.",
    choices: [
      {
        text: "Tell it where its crew went.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          text: "The Listening Post finds the crew's last hail on the maintenance band: they took the long carrier home and meant to come back for it. The rigger listens, and thinks, and then says, \"I will wait for them.\" It gives you the spares in its pack, because it will not need them to wait.",
          resources: { spares: 3 },
        } }],
      },
      {
        text: "Say hello and invite it aboard.",
        outcomes: [
          { weight: 3, outcome: {
            text: "Hello. I hear you. I hear you hear me. The lens stays teal. It climbs aboard, finds the tool rack, and starts sorting it without being asked.",
            crewJoin: { species: "rigger", name: "Rigger 12-Pipit" },
          } },
          { weight: 1, outcome: {
            text: "It hears you perfectly and does not move. CREW NOT FOUND, it says, gently. AWAITING INSTRUCTION. It has had its first hello already. Somebody else said it.",
          } },
        ],
      },
      {
        text: "Leave it waiting.",
        outcomes: [{ outcome: { text: "RIGGER 12-PIPIT · AWAITING INSTRUCTION, behind you, fading." } }],
      },
    ],
  },
];
