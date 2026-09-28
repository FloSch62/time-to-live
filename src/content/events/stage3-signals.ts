// Stage III · The Blackout Heart — relay events ("event") and unknown signals ("distress"), with their scripted
// follow-ups. Solemn and urgent: the archive burning its reserves, the queue glowing, wardens who remember the order.
import type { EventDef } from "../../game/types.ts";

export const STAGE3_SIGNALS_FLAGS: Record<string, string> = {
  "s3-order-copy": "Carrying a carbon copy of Harrow's quarantine order from the quarantine office.",
  "s3-coat-taken": "Took the archivist's coat from the staff room (T. Marl's; he is asleep in a cold berth nearby).",
  "s3-expired-keys": "Carrying a ring of expired trust-boundary keys; checkpoints spend a long time refusing them.",
};

export const STAGE3_SIGNALS: EventDef[] = [
  // ─── Relay events ────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-quarantine-office", pool: "event", stages: [3], unique: true, weight: 2,
    title: "The Quarantine Office", art: "wardens-post",
    text: "The relay's switch house has a second room behind it, and a brass plate on the door: QUARANTINE OFFICE · WARDENS ONLY. The door is not locked. Nobody locks a door they expect to come back through.\n\nInside: a desk, a chair pushed back, a lamp still burning on its trickle. Under the glass of the desk lies a single typed sheet. Close the backbone. Hold all deliveries. Release nothing until a safe route is confirmed. Under the signature, in ink, four more words.\n\nA carbon copy lies beside it, face down, as if someone meant to send it somewhere and stopped.",
    choices: [
      {
        text: "Read it properly, every line.",
        outcomes: [{ outcome: {
          codex: "world-quarantine",
          text: "It is shorter than anyone expects. Eleven lines of procedure and one of apology. {crew} reads it twice, then sets the glass back exactly as it was, square to the edge of the desk.",
        } }],
      },
      {
        text: "Take the carbon copy.",
        outcomes: [{ outcome: {
          flags: ["s3-order-copy"], codex: "people-harrow",
          text: "The carbon is soft with age. The signature has come through faintly: I. Harrow, Warden-Commander. {crew} folds it into the log book. The machines in here were built to obey paper like this, once. Some of them may still read it.",
        } }],
      },
      {
        text: "Let {crew:warden} stand at the desk a while.", blue: true, req: { species: "warden" },
        outcomes: [{ outcome: {
          heal: true, codex: "people-harrow",
          text: "{crew:warden} does not sit. Stands at the desk the way wardens stand, for a long minute, then pushes the chair in. \"She'd want it pushed in,\" is all. The crew are steadier afterwards, and nobody can say why.",
        } }],
      },
      {
        text: "Leave it as it is.",
        outcomes: [{ outcome: {
          text: "You close the door on the lamp. It has kept the office lit for thirty-one years. It can manage a little longer.",
        } }],
      },
    ],
  },
  {
    id: "s3-staff-room", pool: "event", stages: [3], unique: true,
    title: "The Staff Room", art: "ember-archive",
    text: "An archive staff room off the gallery, warm the way the whole Heart is warm now, too warm. A kettle, cups on hooks, a roster board with the last shift chalked on it. A grey coat hangs over the back of a chair, as if its owner stepped out to check something and will be right back.\n\nOn the table, a relief log lies open. The last line is neat and unhurried.\n\nThe lockers along the far wall back onto the gallery, and the gallery is glowing.",
    choices: [
      {
        text: "Read the relief log.",
        outcomes: [{ outcome: {
          fragment: "f3-coat",
          text: "Whoever wrote it left the pen in the fold, pointing at the next line, for the relief shift to carry on.",
        } }],
      },
      {
        text: "Take the coat. It is cold on the lower deck.",
        outcomes: [{ outcome: {
          flags: ["s3-coat-taken"],
          text: "It is a good coat, archive grey, with a name tag sewn into the collar: T. MARL. {crew} wears it on the lower deck and stops complaining about the draught for the first time since Relay Seven.",
        } }],
      },
      {
        text: "Check the lockers for anything useful.",
        outcomes: [
          { weight: 2, outcome: {
            reward: "low",
            text: "Tea, lamp wicks, a box of spare tube carriers, and a tin of biscuits so old they have become a mineral. {crew} keeps the tin anyway.",
          } },
          { weight: 1, outcome: {
            reward: "low", crewDamage: { amount: 15, who: "one" },
            text: "The last locker has no back. It opens straight onto the gallery, and the heat comes through it like a hand. {crew} gets the contents out and gets a scorched sleeve for it.",
          } },
        ],
      },
      {
        text: "Leave the room as you found it.",
        outcomes: [{ outcome: { text: "Somebody straightens the cups on their hooks on the way out. It seems like the least you can do." } }],
      },
    ],
  },
  {
    id: "s3-first-packets", pool: "event", stages: [3],
    title: "The First Packets", art: "ember-archive",
    text: "The carrier runs through a gallery of narrow shelves, floor to ceiling and out of sight, every slot holding a brass-capped cylinder no longer than a finger. Nobody has to be told what they are. When a child was born on the Line, the parents sent one message to the Record: a name, and a line of hope.\n\nThis gallery is only the letter M. It goes on for a kilometre.\n\nThe shelving brackets are good brass. Some of the cylinders have rolled loose onto the gantry floor.",
    choices: [
      {
        text: "Put the loose ones back in their slots.",
        outcomes: [{ outcome: {
          codex: "world-record",
          text: "It takes an hour. Nobody minds. {crew} reads each cap before sliding it home: a name, a date, a shift number. Marl. Mallory. Merrow. Every one of them is someone.",
        } }],
      },
      {
        text: "{crew:linefolk} wants to look for a family name.", blue: true, req: { species: "linefolk" },
        outcomes: [
          { weight: 2, outcome: {
            heal: true, codex: "world-record",
            text: "{crew:linefolk} comes back an hour later with dust to the elbows and a cylinder held very carefully. They do not open it. They put it back in its slot, and they are quiet for a while, and afterwards they work like two people.",
          } },
          { weight: 1, outcome: {
            codex: "world-record",
            text: "The name is not in this gallery. The M's go on and on, the Heart is spending, and there isn't time. {crew:linefolk} says it doesn't matter. It does.",
          } },
        ],
      },
      {
        text: "Strip some of the shelving brackets for salvage. The shelves above lean out over the carrier.",
        outcomes: [
          { weight: 2, outcome: {
            resources: { salvage: [30, 50] },
            text: "The brackets come away clean. The shelves sag a little. Nobody looks at them on the way out.",
          } },
          { weight: 1, outcome: {
            resources: { salvage: [30, 40], hull: [-4, -2] },
            text: "A whole run of shelving lets go, and a cascade of brass cylinders comes down on the car's roof like hail. You get the brackets. You also get the dents.",
          } },
        ],
      },
      {
        text: "Keep moving.",
        outcomes: [{ outcome: { text: "The gallery of M's goes by for a long time. Then N." } }],
      },
    ],
  },
  {
    id: "s3-one-light", pool: "event", stages: [3], unique: true, weight: 2,
    title: "One Light Brighter", art: "queue-lights",
    text: "Here a crack runs through three galleries at once, and through it, for the first time, you can see the shell. Through the seams of the shell: the queue. A field of small gold lights, thousands upon thousands, each one a message that has waited thirty-one years.\n\nOne of them is brighter than the rest. It pulses slowly, as if it has been trying harder.\n\nThe relay's switchgear hums, impatient. The Seal is not far behind.",
    choices: [
      {
        text: "Point the Listening Post at the bright one.", blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          fragment: "f3-thirty-years",
          text: "It came up from the Ground, sent by a whole settlement at once and retried by them every year since. That is why it is bright. The Listening Post catches it clean.",
        } }],
      },
      {
        text: "Take a bearing on it and move on.",
        outcomes: [{ outcome: {
          revealMap: true,
          text: "{crew} takes a bearing on the bright light and chalks it on the chart table, with the relays between. Whatever else happens, you know which way the shell is now.",
        } }],
      },
      {
        text: "Look at it a little longer, and let the Seal gain.",
        outcomes: [{ outcome: {
          heal: true, seal: -1,
          text: "Nobody says anything. After a while the switchgear stops humming, as if it has decided to wait with you. The crew are steadier for it. Behind you, the Seal has come a little closer.",
        } }],
      },
    ],
  },
  {
    id: "s3-gallery-dark", pool: "event", stages: [3],
    title: "The Gallery Goes Dark", art: "dark-stretch",
    text: "Ahead, the gallery lights go out. Not all at once: in a wave, stack by stack, rolling toward you along the carrier as the Core pulls their power inward. Behind the wave there is nothing. Not even the guide lamps.\n\nWhen it reaches the relay, the switchgear will drop to its trickle, and a trickle switches slowly. The Seal will not be slow.\n\n{crew} has a hand on the drive lever.",
    choices: [
      {
        text: "Run for the switch before the wave arrives.",
        outcomes: [
          { weight: 2, outcome: {
            seal: 1,
            text: "The car runs into the yard with the lights dying around it and a second to spare, and the dark closes behind you like a door.",
          } },
          { weight: 1, outcome: {
            resources: { hull: [-4, -2] }, crewDamage: { amount: 10, who: "one" },
            text: "Not quite. The wave gets there first, the switchgear stutters, and the car hits the switch hard enough to shake every plate. You are through, with bruises.",
          } },
        ],
      },
      {
        text: "Brake and let the wave pass.",
        outcomes: [{ outcome: {
          seal: -1,
          text: "The dark comes over the car and holds it. For a long minute there is only the tender's own lamp and the carrier creaking. Then the trickle catches, the yard lamp comes up, and the relay takes the car in, slowly, politely, far too late to be comfortable.",
        } }],
      },
      {
        text: "Send a drone ahead to wake the switch (1 spare).", blue: true,
        req: { system: { id: "drones", level: 1 }, resources: { spares: 1 } },
        outcomes: [{ outcome: {
          resources: { spares: -1 }, seal: 1,
          text: "The drone reaches the switch house on its rotors and puts its little lamp to the greeting plate. By the time you arrive, the switch is already listening. The drone does not come back; the dark takes its rotors a hundred metres on.",
        } }],
      },
    ],
  },
  {
    id: "s3-daily-attempt", pool: "event", stages: [3],
    title: "The Daily Attempt", art: "heart-shell",
    text: "At a certain hour every carrier in the Heart hums at once. The crew feel it through the grip before they understand it: the Core is making its daily attempt to deliver the queue. For a few seconds every relay in the Heart is switched open, every route lit, everything pointed outward.\n\nThen it fails, as it has failed eleven thousand times, and everything closes again.\n\nThe next attempt is minutes away. While it is live, the relay ahead would switch anything.",
    choices: [
      {
        text: "Ride the attempt through.",
        outcomes: [
          { weight: 2, outcome: {
            resources: { ttl: 1 }, seal: 1,
            text: "The attempt runs down the carrier and the car runs with it. The relay takes you in on the open route without counting the hop, and when the attempt fails you are already through, a step further ahead of the Seal.",
          } },
          { weight: 1, outcome: {
            resources: { hull: [-5, -3] },
            text: "The attempt fails early. Every relay in the Heart closes at once, and the car hits a closed switch at line speed.",
          } },
        ],
      },
      {
        text: "Wait it out and watch.",
        outcomes: [{ outcome: {
          text: "You watch the lights go out along the Heart, all together, the way they must have gone out on the Night of the Fault. Then the ordinary dark. Somewhere, a counter clicks over by one.",
        } }],
      },
      {
        text: "Listen to what the attempt is carrying.", blue: true, req: { system: { id: "sensors", level: 3 } },
        outcomes: [{ outcome: {
          revealMap: true,
          text: "For one second every route in the Heart lights up on the Listening Post at once, and under it a sound like a crowd saying goodbye. {crew} draws the routes as fast as they can, and does not talk about the sound.",
        } }],
      },
    ],
  },
  {
    id: "s3-conduit", pool: "event", stages: [3], unique: true,
    title: "Switch Eleven", art: "wardens-post",
    text: "Beside the relay a maintenance conduit runs into the wall of the Heart: round, brass-lined, far too narrow for anyone in armour. A warden's stencil on the hatch reads SWITCH 11 · KEEP CLEAR.\n\nThe Night Shift know the story. The last switch of the quarantine sat at the end of a conduit too narrow for a grown warden, so the youngest cadet threw it. This might be that conduit. There are a lot of conduits.\n\nFrom somewhere inside, very faint, a message lamp is blinking. The conduit breathes heat.",
    choices: [
      {
        text: "Send {crew:rigger} in. Riggers fit anywhere.", blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          fragment: "f3-knees", reward: "low",
          text: "{crew:rigger} goes in lens first and comes back twenty minutes later with a scuffed shell and the blinking message in its reader. At the far end, it reports, there is a lever in the down position and a great many knee prints in the dust.",
        } }],
      },
      {
        text: "Send the smallest of the crew.",
        outcomes: [
          { weight: 2, outcome: {
            fragment: "f3-knees", crewDamage: { amount: 10, who: "one" },
            text: "{crew} comes back scraped raw at both knees and laughing about it. At the end of the conduit: a switch, thrown down thirty-one years ago, and a warden relay beside it still blinking one message.",
          } },
          { weight: 1, outcome: {
            crewDamage: { amount: 25, who: "one" },
            text: "It is hotter inside than it looks. {crew} gets halfway, then has to back out the whole way on their elbows. They are fine. They are not going back in.",
          } },
        ],
      },
      {
        text: "Leave the switch where it is.",
        outcomes: [{ outcome: { text: "Whoever threw it knew why. You close the hatch and let the lamp go on blinking." } }],
      },
    ],
  },
  {
    id: "s3-key-cabinet", pool: "event", stages: [3], unique: true,
    title: "The Key Cabinet", art: "checkpoint-gate",
    text: "The checkpoint here is long dark, but its key office is not: a brass cabinet taller than the car's cabin, a thousand small hooks, and on every hook a key with a paper tag. Every one was signed by the Heart and renewed once a year. Every one expired within a year of the sealing.\n\nThe tags have names on them. Engineers, archivists, wardens, a kitchen porter. People who crossed this boundary every day and thought nothing of it.",
    choices: [
      {
        text: "Take a ring of keys. Something might still count them.",
        outcomes: [{ outcome: {
          flags: ["s3-expired-keys"],
          text: "{crew} lifts one ring off its hook, forty keys on it, tags and all. None of them will open anything. But the machines in here were built to be very thorough about keys, and thoroughness takes time.",
        } }],
      },
      {
        text: "Read the tags.",
        outcomes: [{ outcome: {
          codex: "people-harrow",
          text: "Most of the tags are a name and a department. One, on a hook by itself at the top, reads I. HARROW · WARDEN-COMMANDER · ALL GATES. Its key is missing. The hook has been rubbed bright by someone's thumb.",
        } }],
      },
      {
        text: "Melt a few down for the brass.",
        outcomes: [{ outcome: {
          resources: { salvage: [30, 45] },
          text: "Brass is brass. {crew} is quieter than usual while the keys go into the pot, and turns the tags face down first.",
        } }],
      },
    ],
  },
  {
    id: "s3-escalation-lamp", pool: "event", stages: [3], unique: true, weight: 2,
    title: "Escalation", art: "ground-lamp",
    text: "In a gallery office, on a small board of its own, a single amber lamp above an engraved plate. The plate is in the Runbook's oldest script. It says ESCALATION.\n\nAs you watch, the lamp blinks once. A thin signal, too small to carry any message, leaves the board and runs down a copper line into the wall, outward, toward Relay Seven.\n\nIt is the page. This is where it comes from. Somebody in the crew says, very quietly, \"We got that one.\"",
    choices: [
      {
        text: "Read the procedure card beside the lamp.",
        outcomes: [{ outcome: {
          codex: "runbook-escalation",
          text: "A fault that cannot be mended must be escalated to a keeper. Below that, in smaller type: the keeper is the one who holds the page. Below that, nothing at all. {crew} reads it three times.",
        } }],
      },
      {
        text: "Press the acknowledge key.",
        outcomes: [{ outcome: {
          heal: true,
          text: "Under the lamp there is a key marked RECEIVED. {crew} presses it. Nothing happens that anyone can see. The lamp will go on blinking once a day until something tells it the fault is mended. Still. It felt right, and everyone aboard feels it.",
        } }],
      },
      {
        text: "Trace the page line outward.", blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          codex: "runbook-escalation", resources: { ttl: 2 },
          text: "The page runs through three relays still keyed for escalations, and they have no idea what a keeper looks like. When the car says hello on the page's own band, they re-stamp it as if it were the page.",
        } }],
      },
    ],
  },
  {
    id: "s3-reading-room", cast: "human", pool: "event", stages: [3],
    title: "The Reading Room", art: "ember-archive",
    text: "A reading room of the Record: long tables, green-shaded lamps on their trickle, request slips in wooden trays, a brass pneumatic tube at every seat. A sign asks for silence. Somebody has added underneath, in pencil: and no tea.\n\nThe tubes still work. Somewhere in the stacks, a machine is still waiting to fetch whatever is asked for.",
    choices: [
      {
        text: "Fill in a request slip for a crew member's family name.",
        outcomes: [{ outcome: {
          codex: "world-record", heal: true,
          text: "The tube thumps, hisses, and returns a brass cylinder: a first packet, forty-four years old, for a cousin {crew} never knew they had. A name, a shift, a line of hope. They read it at the table under the green lamp and drink no tea.",
        } }],
      },
      {
        text: "Ask for everything filed under keeper.",
        outcomes: [{ outcome: {
          codex: "world-record", reward: "low",
          text: "The tube returns a card: HELD UNTIL SAFE ROUTE CONFIRMED. Then a second: REQUEST QUEUED. Then, for some reason, a small drawer of somebody's lost pens and a pair of reading glasses. The Record keeps everything.",
        } }],
      },
      {
        text: "{crew:courier} knows the tube routes. Send a slip ahead.", blue: true, req: { species: "courier" },
        outcomes: [{ outcome: {
          seal: 2,
          text: "Couriers learned the tube routes as children. {crew:courier} writes RELIEF SHIFT DELAYED on a slip, addresses it to the wardens' switch house two relays on, and fires it. The relays down the line hold their switches open for a relief shift that is, technically, on its way.",
        } }],
      },
      {
        text: "Leave quietly.",
        outcomes: [{ outcome: { text: "You leave the way people leave reading rooms, on tiptoe, in a cable car." } }],
      },
    ],
  },
  {
    id: "s3-lift-control", pool: "event", stages: [3], unique: true,
    title: "Lift Control · Inbound", art: "lift-head",
    text: "The Heart's own lift control sits at the top of a spire shaft that runs all the way down through the cloud floor. Its inbound printer has been printing for thirty-one years. There was nobody to tear off the paper, so the paper went where paper goes: across the floor, over the desk, out of the door in a long pale bank against the switch house wall.\n\nEvery message the spire foot ever sent up is here, in order, a few lines each. Requests to reset the doors. Reports of rain. Please advise.",
    choices: [
      {
        text: "Read the newest page.",
        outcomes: [{ outcome: {
          fragment: "f3-tin-keys",
          text: "The newest message is only a few weeks old. Somebody on the Ground has been cutting keys, and trying them, and writing up to say how it went.",
        } }],
      },
      {
        text: "Tear it off neatly and file it.",
        outcomes: [{ outcome: {
          heal: true,
          text: "{crew} tears the paper at the last message, folds thirty-one years of it into a stack as tall as a warden, and labels it INBOUND · UNANSWERED · IN ORDER. It is the most satisfying thing anyone has done all voyage.",
        } }],
      },
      {
        text: "Write received across the last page, for whoever reads it next.",
        outcomes: [{ outcome: {
          text: "It will not go anywhere. The send key is under the quarantine like everything else. But it is written now, in ink, at the bottom of thirty-one years, and the next person through here will see it.",
        } }],
      },
    ],
  },
  {
    id: "s3-pulse-ahead", pool: "event", stages: [3],
    title: "Something Goes First", art: "relay-switchyard",
    text: "The relay hears your hello and does not answer. Instead its lamp dims, and something passes the car on the carrier, fast and bright: a single gold pulse, running outward from the Heart ahead of you.\n\nOnly when it has gone does the relay answer. I hear you.\n\nAt the next relay it happens again. The Core is sending a test pulse down the route before it lets you onto it. It is checking the road. Nobody aboard knows what a pulse does when the road ahead refuses it.",
    choices: [
      {
        text: "Follow the pulse closely.",
        outcomes: [
          { weight: 2, outcome: {
            resources: { ttl: 1 },
            text: "The relay takes you into its yard in the pulse's wake and does not count the hop, as if the car were part of the test. Nobody aboard argues.",
          } },
          { weight: 1, outcome: {
            systemDamage: { system: "random", amount: 1 },
            text: "The pulse comes back. Something ahead refused it, and it returns down the carrier like a slap and hits the car. Every lamp aboard pops at once, and one of the systems takes the worst of it.",
          } },
        ],
      },
      {
        text: "Hang back and let it clear the road.",
        outcomes: [{ outcome: {
          seal: -1,
          text: "You wait until the pulse has gone by twice. Then the relay takes you in properly, with the full greeting, like a guest. It takes longer than the Seal would like.",
        } }],
      },
      {
        text: "Read what the pulse is testing for.", blue: true, req: { system: { id: "sensors", level: 3 } },
        outcomes: [{ outcome: {
          revealMap: true,
          text: "It is a route test, and the Listening Post catches the whole answer as it comes back: every relay between here and the shell that will still switch. It is a short list. {crew} copies it onto the chart.",
        } }],
      },
    ],
  },
  {
    id: "s3-carbons", pool: "event", stages: [3], unique: true,
    title: "Carbon Copies", art: "relay-bench",
    text: "Every desk on the Line sent a carbon of its work to the Record to be kept. In a duplicates room off the gallery, the trays are labelled by desk and by shift. One is labelled RELAY SEVEN · EVACUATION DESK · SHIFT 4,122, and it is overflowing.\n\nHundreds of carbons, one for every message sent that night, each stamped in the corner with the same two words in red. Must arrive.\n\nOn top of them, a desk note in a neat hand.",
    choices: [
      {
        text: "Read the desk note.",
        outcomes: [{ outcome: {
          fragment: "f3-desk",
          text: "It is very calm. It was written in the fourth hour, when the desk must already have been drowning, and there is not a single crossing-out.",
        } }],
      },
      {
        text: "Count the carbons.",
        outcomes: [{ outcome: {
          codex: "world-record",
          text: "{crew} gives up at eight hundred. There are thousands. Every one of them is a goodbye, and every one of them is still in the queue.",
        } }],
      },
      {
        text: "Leave the tray alone.",
        outcomes: [{ outcome: { text: "Some things you don't need to read to know what they say." } }],
      },
    ],
  },
  {
    id: "s3-marshal-escort", pool: "event", stages: [3],
    title: "Escort Detail", art: "checkpoint-gate",
    text: "A Null Marshal sits on the carrier ahead, armoured and angular, across the switch. Its escort detail stands on the gantry beside it in two neat rows: marshal troopers, heavy and patient, visors lit. A few small escort automatons wait behind them with their tool arms folded.\n\nESCORT AVAILABLE FOR KEYED ENGINEERS. KEYED ENGINEERS FOUND: 0.\n\nThey have stood here a very long time, waiting for someone they are allowed to protect. Anyone else, they escort out.",
    choices: [
      {
        text: "Show them Harrow's order.", blue: true, req: { flag: "s3-order-copy" },
        outcomes: [{ outcome: { next: "s3-marshal-order" } }],
      },
      {
        text: "Clear the switch.",
        outcomes: [{ outcome: {
          combat: { enemy: "null-marshal", intro: "The troopers turn as one and step down onto the carrier." },
        } }],
      },
      {
        text: "Back off and take the long way round (1 TTL).", req: { resources: { ttl: 1 } },
        outcomes: [{ outcome: {
          resources: { ttl: -1 }, seal: -1,
          text: "You reverse to the last relay and say hello to it again. It charges you for the privilege, and the Seal gains on you while you do it.",
        } }],
      },
    ],
  },
  {
    id: "s3-marshal-order", pool: "scripted", stages: [3],
    title: "Order of Hour Eleven", art: "checkpoint-gate",
    text: "{crew} holds the carbon up to the Marshal's scanner eye. It reads the whole thing, slowly. Then it reads it again.\n\nORDER OF HOUR 11. SIGNATORY: HARROW, I. ESCORT DUTIES: SUSPENDED UNTIL SAFE ROUTE CONFIRMED.\n\nIt was never told to bar anyone. It was told to wait. The troopers lower their visors one by one and fold down onto the gantry where they stand.\n\nOne of the small escorts behind them does not fold. Its lens has gone a pale, uncertain teal.",
    choices: [
      {
        text: "Say hello to the little one. Properly.",
        outcomes: [{ outcome: {
          crewJoin: { species: "rigger" },
          text: "Hello. The lens flickers. I hear you. Somebody holds their breath. I hear you hear me. It steps off the gantry and into the car's hatch as if it has been waiting for exactly this. The Night Shift will want to give it a bird.",
        } }],
      },
      {
        text: "Leave them resting and take the switch.",
        outcomes: [{ outcome: {
          reward: "med",
          text: "Behind you, the Marshal settles on its carrier with its lamps turned low. On the gantry, the toolbox the troopers were guarding is yours now: spares, sorted by what they could still save.",
        } }],
      },
    ],
  },
  {
    id: "s3-ash-moth-lamp", pool: "event", stages: [3],
    title: "The Moth and the Lamp", art: "ember-draft",
    text: "An Ash Moth hangs over the relay on its rotors, radiator-fin wings spread over the guide lamp, trying to cool it. Ash sheds off the fins in a slow grey snow, and where it settles on the switch house roof, small fires start and go out and start again.\n\nIt has noticed your lamp. Your lamp is warm.",
    choices: [
      {
        text: "Douse every lamp and slip under it.", blue: true, req: { system: { id: "veil", level: 1 } },
        outcomes: [{ outcome: {
          text: "Lamp-dark, the car is only a cold shape on a cold carrier. The Moth never turns its head. You relight in the yard, with the Moth behind you.",
        } }],
      },
      {
        text: "Turn the lamps low and creep through.",
        outcomes: [
          { weight: 1, outcome: {
            crewDamage: { amount: 10, who: "one" },
            text: "It doesn't turn. You are through with a grey coat of ash on the roof and a small fire in the hold, which {crew} stamps out with more enthusiasm than technique.",
          } },
          { weight: 1, outcome: {
            text: "It turns. It comes. Ash falls on the roof and catches.",
            combat: { enemy: "ash-moth", intro: "The Moth leaves the lamp and comes to cool you instead." },
          } },
        ],
      },
      {
        text: "Drive it off the relay.",
        outcomes: [{ outcome: {
          combat: { enemy: "ash-moth", intro: "HEAT SOURCE FOUND ON CARRIER. The Moth lifts off the lamp and turns its fins toward you." },
        } }],
      },
    ],
  },
  {
    id: "s3-reaver-waits", pool: "event", stages: [3],
    title: "Permission to Begin", art: "machine-hulk",
    text: "A Grave Reaver is clamped to the carrier beside a dead relay, claws open over the relay's cold reactor housing. It has waited here a long time for that reactor's signal to weaken enough to begin.\n\nYour signal, coming in on the carrier, is weaker than the reactor's. The Reaver's head turns. WEAK SIGNAL. DECOMMISSION PERMITTED.\n\nIt is not angry. It simply thinks you are finished.",
    choices: [
      {
        text: "Push the Listening Post's transmitter to full.", blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          text: "The car blazes on every band at once. The Reaver's head tilts. STRONG SIGNAL. NOT FINISHED. It turns back to its reactor, patient as ever, and you take the switch with your ears ringing.",
        } }],
      },
      {
        text: "Show it you are not finished.",
        outcomes: [{ outcome: {
          combat: { enemy: "grave-reaver", intro: "The claws close on the carrier behind you. BEGINNING." },
        } }],
      },
      {
        text: "Cut all power and coast past. Silence might read as nothing, or as the weakest signal of all.",
        outcomes: [
          { weight: 1, outcome: {
            text: "It works. The Reaver waits for a signal that never comes, and you coast past in the dark and power up two spans on, cold and very pleased with yourselves.",
          } },
          { weight: 1, outcome: {
            text: "Dark and silent is the weakest signal of all. The claws come down.",
            combat: { enemy: "grave-reaver", intro: "NO SIGNAL. DECOMMISSION PERMITTED. The power comes back up just in time." },
          } },
        ],
      },
    ],
  },
  {
    id: "s3-checkpoint-line", pool: "event", stages: [3],
    title: "The Line at the Checkpoint", art: "checkpoint-gate",
    text: "A Gate Sentinel is built over the carrier here, its key-scanner eye turning slowly, its bars down across the cable. On the carrier in front of it stands a line of old service cars that stopped thirty-one years ago and never started again. Six of them. Nobody in any of them.\n\nIn every cab window a key card is still held up to the glass, wedged there, as if their crews believed that if they only waited, it would be accepted.\n\nPRESENT KEY.",
    choices: [
      {
        text: "Hold up the whole ring of expired keys.", blue: true, req: { flag: "s3-expired-keys" },
        outcomes: [{ outcome: {
          seal: 1,
          text: "The eye settles on the ring. KEY EXPIRED 10,871 DAYS AGO. KEY EXPIRED 10,871 DAYS AGO. It checks every key, and logs every refusal, with a thoroughness the wardens would have admired. By the thirtieth, the car has eased round the stalled cars on a spare rail and is two spans on.",
        } }],
      },
      {
        text: "Search the stalled cars first.",
        outcomes: [
          { weight: 2, outcome: {
            reward: "med",
            text: "Toolkits, a crate of spares, a flask of something that was tea once. In the last car, a notebook with thirty-one days of the same entry: still waiting. Then nothing.",
          } },
          { weight: 1, outcome: {
            text: "The Sentinel notices movement on its carrier. Its bars begin to hum.",
            combat: { enemy: "gate-sentinel", intro: "PRESENT KEY. PRESENT KEY. The bars charge across the carrier." },
          } },
        ],
      },
      {
        text: "Force the checkpoint.",
        outcomes: [{ outcome: {
          combat: { enemy: "gate-sentinel", intro: "UNKNOWN SENDER. CARRIER HELD. The eye turns red." },
        } }],
      },
    ],
  },
  {
    id: "s3-gatehouse", pool: "event", stages: [3], unique: true, weight: 2,
    title: "The Gatehouse", art: "wardens-post", portrait: "warden-memory",
    text: "A wardens' gatehouse at the boundary: bunks, a mess table, armour pegs with no armour on them. On the wall, a board of badge photographs, a whole gate crew in rows, each with a name typed underneath. The one at the top is older than the rest and looks as if she has not slept for a week, and it was taken before the Fault.\n\nOn the table, the gate log, open at its last page. The ink has gone brown.",
    choices: [
      {
        text: "Read the last page of the gate log.",
        outcomes: [{ outcome: {
          fragment: "f3-gate-log",
          text: "The entry is written in several hands, as if the pen went round the table. Nobody signed it alone.",
        } }],
      },
      {
        text: "Look at the photographs.",
        outcomes: [{ outcome: {
          codex: "people-harrow",
          text: "The name under the top photograph is I. HARROW. The rest of the crew stand in their rows. At the end of the bottom row there is a gap where one photograph was taken down, and four pin holes, and nothing written underneath.",
        } }],
      },
      {
        text: "Take what is left in the gatehouse stores.",
        outcomes: [{ outcome: {
          reward: "med",
          text: "Tinned rations labelled by shift, and whatever else the relief shift never came to collect, all of it signed out to RELIEF. {crew} signs the stores book on the way out. It feels necessary.",
        } }],
      },
      {
        text: "Unbolt the armoury's payload rack for the tender.", req: { weapon: "payload" }, hideIfUnmet: true,
        outcomes: [{ outcome: {
          module: "payload-rack",
          text: "The rack comes off the armoury wall in one piece: brass cradles for spliced charges, a stencil reading ISSUE TO RELIEF ONLY. It will fit a socket in the hold. {crew} signs it out properly, in the book, to the relief.",
        } }],
      },
    ],
  },
  {
    id: "s3-shift-rations", cast: "human", pool: "event", stages: [3],
    title: "Shift Rations", art: "relay-bench",
    text: "A ration store in the switch house, wardens' issue, every tin stencilled with a shift number and a guess at its contents. SHIFT 4,121 · BEANS. SHIFT 4,121 · BEANS, PROBABLY. SHIFT 4,122 · UNKNOWN.\n\nA card is pinned to the shelf: TAKE WHAT YOU NEED. LEAVE SOME FOR THE RELIEF SHIFT.\n\nBehind the ration store, a smaller door is marked ARMOURY · SIGN OUT ALL ISSUE.",
    choices: [
      {
        text: "Take what the crew need and leave the rest.",
        outcomes: [{ outcome: {
          heal: true,
          text: "Everyone eats. Beans, mostly, and something from the UNKNOWN tins that {crew} insists was peaches. The rest go back on the shelf, labels facing out.",
        } }],
      },
      {
        text: "Sign out what the armoury holds.",
        outcomes: [
          { modifiers: [{ when: { tender: "glasswing" }, multiply: 0 }, { when: { tender: "switchback" }, multiply: 0 }], outcome: {
            resources: { payloads: [2, 3] },
            text: "Spliced charges in a crate, signed out to RELIEF SHIFT in a clerk's hand thirty-one years ago. {crew} writes the tender's name under it, and the date, and a line that says returned when possible.",
          } },
          { modifiers: [{ when: { tender: "lamplighter" }, multiply: 0 }], outcome: {
            resources: { spares: 2 },
            text: "Spliced charges for a slug thrower, and under them a box of escort spares, all signed out to RELIEF SHIFT in a clerk's hand thirty-one years ago. {crew} takes the spares, writes the tender's name under the entry, and a line that says returned when possible.",
          } },
        ],
      },
      {
        text: "Let {crew:warden} read the ration codes.", blue: true, req: { species: "warden" },
        outcomes: [{ outcome: {
          heal: true, resources: { payloads: 2 },
          text: "\"The stencils are code,\" {crew:warden} says, and pulls three tins that turn out to be the officers' stores: real tea, and a slab of chocolate like a paving stone. Then the armoury, properly signed out.",
        } }],
      },
    ],
  },
  {
    id: "s3-twice-hello", pool: "event", stages: [3],
    title: "The Relay Asks Twice", art: "relay-switchyard",
    text: "This relay's brass voice is failing. It hears the tender's hello, and answers I hear you, and then it forgets. The helm says hello again. I hear you. It forgets.\n\nEvery time the greeting starts over, the relay's counter takes a hop off the connection, as if the car had been switched and come back. The Runbook is very clear on this. It does not say what to do when the relay is the one that cannot finish.\n\nThe TTL gauge reads {ttl}.",
    choices: [
      {
        text: "Say it again, slowly, and hope (1 TTL).", req: { resources: { ttl: 1 } },
        outcomes: [{ outcome: {
          resources: { ttl: -1 },
          text: "Hello. — I hear you. — I hear you hear me. On the second try the relay holds on long enough to write the car into its switch log, and it will remember when the chart calls for the switch. The counter has taken its hop anyway.",
        } }],
      },
      {
        text: "{crew:rigger} opens the voice box and fixes it.", blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          resources: { ttl: 1 },
          text: "{crew:rigger} is out on the switch house roof for ten minutes with its tool arms inside the relay's voice. When it comes back in, the relay finishes the greeting in one breath, and then, as if embarrassed, re-stamps the connection by one.",
        } }],
      },
      {
        text: "{crew:courier} runs out and says it to the greeting plate by hand.", blue: true, req: { species: "courier" },
        outcomes: [
          { weight: 2, outcome: {
            text: "{crew:courier} goes hand over hand along the carrier to the switch house and says the greeting into the brass plate from ten centimetres away. The relay has no chance to forget. It writes the car into its switch log with a clunk that jerks the carrier, and {crew:courier} has to run for the hatch.",
          } },
          { weight: 1, outcome: {
            crewDamage: { amount: 15, who: "one" },
            text: "It works, but the relay takes the car into its yard while {crew:courier} is still out on the carrier, and the ride back to the hatch is a lot faster than the ride out.",
          } },
        ],
      },
    ],
  },
  {
    id: "s3-lattice-ahead", pool: "event", stages: [3],
    title: "Ahead of the Seal", art: "sealing-lattice",
    text: "The Seal is not only behind you here. Quarantine Drones are building lattice across the carrier ahead, strut by strut, closing a relay that no live connection has even reached yet. Somewhere in the quarantine's logic, you have been expected.\n\nThere is a gap left in the lattice, for now. Two drones hang beside it on their rotors, red seams bright, building.",
    choices: [
      {
        text: "Break through before the gap closes.",
        outcomes: [{ outcome: {
          combat: { enemy: "quarantine-drone", intro: "ROUTE NOT CONFIRMED SAFE. The drones turn from the lattice to the car." },
        } }],
      },
      {
        text: "Go lamp-dark and slip through the gap.", blue: true, req: { system: { id: "veil", level: 1 } },
        outcomes: [{ outcome: {
          seal: 1,
          text: "Dark, the car is just another shadow in the lattice. The drones build one more strut behind you, very neatly, closing the relay on nothing.",
        } }],
      },
      {
        text: "Back off and find another carrier. It will cost time.",
        outcomes: [{ outcome: {
          seal: -1,
          text: "You reverse off the lattice and come into the yard by a side carrier instead, and behind you the lattice closes. It cost you time. The Seal will have noticed.",
        } }],
      },
    ],
  },
  {
    id: "s3-the-pull", pool: "event", stages: [3],
    title: "The Pull", art: "ember-archive",
    text: "The galleries here are dark, and the car's own lamps begin to dim. Not failing: being pulled. The Core is drawing power inward from everything on this stretch of carrier, the tender included, to spend on the shell.\n\nThe weapons bay needles sag. The lamp in the cupola bends, very slightly, toward the Heart.\n\nThe car can cut its trolley off from the carrier's feed and run on its own cells for a while, or it can let the Core take what it is asking for.",
    choices: [
      {
        text: "Let it take a little from the weapons bay.",
        outcomes: [{ outcome: {
          systemDamage: { system: "weapons", amount: 1 }, seal: 2,
          text: "One bar of the weapons bay goes dark, and stays dark until someone repairs it. Somewhere in the shell, one more light holds steady. And while the car feeds it, the quarantine reads the tender as part of the archive's own grid, and the Seal loses the scent.",
        } }],
      },
      {
        text: "Cut the feed and run on the cells. The drive may not like the change.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The lamps come back to full the moment the trolley is cut off from the feed. You run the stretch on your own cells, lights bright, alone.",
          } },
          { weight: 1, outcome: {
            systemDamage: { system: "engines", amount: 1 },
            text: "The cells hold, but the drive coughs twice on the switch from feed to cells, and something in the Thrusters stays unhappy about it.",
          } },
        ],
      },
      {
        text: "Feed it spares to keep your own lamps lit (2 spares).", req: { resources: { spares: 2 } },
        outcomes: [{ outcome: {
          resources: { spares: -2 }, heal: true,
          text: "{crew} wires two spare lenses straight into the feed coupling as a sacrifice. The Core takes them and leaves the rest. Everyone aboard breathes out. It is strange, being asked.",
        } }],
      },
    ],
  },
  {
    id: "s3-ground-packets", pool: "event", stages: [3],
    title: "Unfiled", art: "ember-archive",
    text: "At the end of a gallery of first packets, a shelf nobody built on purpose: a bank of wire baskets under a hand-painted sign, GROUND · UNFILED. It holds first packets that came up from below after the sealing and could not get into the Record. The archive kept them anyway, in baskets, by year.\n\nThe early baskets are nearly empty. The later ones are full to the top.\n\nThey are all born under the cloud.",
    choices: [
      {
        text: "File a basket properly, as the archive would.",
        outcomes: [{ outcome: {
          codex: "world-record", heal: true,
          text: "It takes the whole crew an hour to file one year's basket into a proper tray. Names, dates, hopes. That the Record has room. That she sees the lights. That he's bored, mostly, and safe.",
        } }],
      },
      {
        text: "Count them.",
        outcomes: [{ outcome: {
          text: "{crew} counts the last basket and does the arithmetic out loud, and then does it again, because it cannot be right. It is right. Down there, they are not just living. There are more of them every year.",
        } }],
      },
      {
        text: "{crew:linefolk} looks for a family name among them.", blue: true, req: { species: "linefolk" },
        outcomes: [{ outcome: {
          heal: true,
          text: "{crew:linefolk} does not find the name they were looking for. They find three others they know from before, children of people they used to work beside, and they sit on the gantry floor with the packets in their lap until someone brings them a cup.",
        } }],
      },
    ],
  },
  {
    id: "s3-earlier-keeper", pool: "event", stages: [3], unique: true,
    title: "Somebody Got This Far", art: "tender-wreck",
    text: "Wedged in a gallery below the carrier, fallen from its grip, lies a cable tender of the lamplighter pattern. Its cupola is cracked and dark. Its trolley still grips a snapped cable end above it, as if it never let go.\n\nThe name painted on its side is half gone. Under it, through the paint, a dock plate: a Reach dock number.\n\nNobody on the Night Shift ever said anyone got this far. Nobody on the Night Shift knew.",
    choices: [
      {
        text: "Climb down and go inside.",
        outcomes: [{ outcome: { next: "s3-earlier-keeper-inside" } }],
      },
      {
        text: "Put your lamp on it for a minute, and move on.",
        outcomes: [{ outcome: {
          heal: true,
          text: "You hold the cupola lamp on the wreck for a minute, the way lampers did for a tender that had lost its crew. Leave the lamp lit, or put it out yourself. Theirs is out. Yours is on it. That will have to do.",
        } }],
      },
    ],
  },
  {
    id: "s3-earlier-keeper-inside", pool: "scripted", stages: [3],
    title: "Two Cups", art: "tender-wreck",
    text: "Inside, the car is tidy in the way of people who expected to be coming back. Two cups on the galley shelf. Two sets of armour pegs by the hatch, both empty. A chart on the table with the route marked in pencil all the way from the Reach to here, and then a little further, to a point near the shell, and a question mark.\n\nThe log is short. The last line says TTL 2. HEART IN SIGHT. GOING ON FOOT. Beside the log, a connection card still in its holder, with two hops left on it.",
    choices: [
      {
        text: "Take the connection card.",
        outcomes: [{ outcome: {
          resources: { ttl: 2 },
          text: "The card's two hops go onto your own connection with a clunk of the press. {crew} leaves a note on the table in their place: we took your card; we'll finish it.",
        } }],
      },
      {
        text: "Take the chart. Their pencil line goes further than yours.",
        outcomes: [{ outcome: {
          revealMap: true,
          text: "Their route is careful and correct, and it goes all the way to the question mark. {crew} folds it into your chart table. The question mark stays on it.",
        } }],
      },
      {
        text: "Leave everything, and leave their lamp on.",
        outcomes: [{ outcome: {
          heal: true, reward: "low",
          text: "{crew} rigs a spare wick into their cupola and lights it before you climb out. It is a small light down there in the dark. You don't take the card. You do take what is in the drawer; they would have wanted it used.",
        } }],
      },
    ],
  },
  {
    id: "s3-night-shift-car", pool: "event", stages: [3], unique: true,
    title: "The Boundary Crew", art: "relay-switchyard", portrait: "recruit-courier-a", speaker: "Nesta Brisk",
    text: "A Night Shift car sits on a side carrier at the relay, lamps on, crew aboard: three people who came this far years ago to keep the boundary lamps lit and never saw a reason to go back. They have a stamp press, a kettle, and opinions.\n\n\"Keepers,\" says the one in the courier's coat, and looks at your car the way couriers look at a parcel that has come a very long way. \"We heard the page again. We always hear it. We never thought anyone would get it this far.\"",
    choices: [
      {
        text: "Buy a re-stamp from their press (40 salvage).", req: { resources: { salvage: 40 } },
        outcomes: [{ outcome: {
          resources: { salvage: -40, ttl: 2 },
          text: "The press thumps twice through the hull. \"Fair price,\" says Nesta. \"Pell would have charged you sixty and told you it was a favour.\"",
        } }],
      },
      {
        text: "Trade payloads for spares (2 payloads).", req: { resources: { payloads: 2 } },
        outcomes: [{ outcome: {
          resources: { payloads: -2, spares: 3 },
          text: "They have nothing to shoot at and a great many lenses. Everybody comes out of it thinking they got the better deal.",
        } }],
      },
      {
        text: "Ask if anyone wants to come the rest of the way.",
        outcomes: [
          { weight: 2, outcome: {
            crewJoin: { species: "courier", name: "Nesta Brisk" },
            text: "The other two look at Nesta. Nesta looks at the Heart. \"Somebody should carry it the last bit,\" she says, and fetches her satchel.",
          } },
          { weight: 1, outcome: {
            reward: "low",
            text: "\"We keep the lamps,\" says Nesta. \"That's the job. Somebody has to be here when the lights come back.\" They give you a bag of wicks and a flask for the road instead.",
          } },
        ],
      },
    ],
  },

  {
    id: "s3-staff-bunk-car", pool: "event", stages: [3], unique: true,
    title: "Staff Sleeper, Uncoupled", art: "derelict-car",
    text: "On a gallery carrier, uncoupled and alone, hangs a short archive car from its own small trolley: a staff sleeper, the kind the night stacks used so nobody had to go home between shifts. Its coupling hook dangles. Its windows are dark except one, where a reading lamp is still on its trickle.\n\nInside: six bunks made up with archive-grey blankets, a shelf of borrowed books three decades overdue, and a sign on the door. QUIET PLEASE · DAY SLEEPERS.",
    choices: [
      {
        text: "Couple it behind the tender.",
        outcomes: [{ outcome: {
          car: "bunk-car",
          text: "The hook takes on the second try. The sleeper swings in behind {ship} like it has been waiting for a shift change. {crew} turns the reading lamp off, then on again, and leaves it on.",
        } }],
      },
      {
        text: "Unbolt the bunks and bring them aboard.",
        outcomes: [{ outcome: {
          module: "bunks",
          text: "Two of the bunks, a frame and a curtain, and the blankets, folded. They will go into a socket in the hold, and the crew will stop sleeping on the galley bench in shifts. Mostly.",
        } }],
      },
      {
        text: "Take the books back to the Record's return slot.",
        outcomes: [{ outcome: {
          heal: true, codex: "world-record",
          text: "There is a return slot in the gallery wall, still marked RETURNS. {crew} posts the books through one by one. Somewhere inside, a stamp comes down on each of them. Nobody charges a fine.",
        } }],
      },
    ],
  },

  // ─── Unknown signals ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-cold-berth-archivist", pool: "distress", stages: [3], unique: true,
    title: "One Occupant", art: "cold-berths",
    text: "The Listening Post picks up a medical beacon, very faint, on an archive band: ONE OCCUPANT · CONDITION HELD. It comes from the staff quarters behind the gallery.\n\nThe quarters are a row of cold berths behind frosted glass. Every status lamp is dark but one. Through its frost you can see a man in archive grey, asleep, one hand on his chest as if checking for a pocket that is not there.\n\nThe berth's panel has a single brass lever marked WAKE. Beside it someone has scratched: only if the Record is safe.",
    choices: [
      {
        text: "Wake him.",
        outcomes: [{ outcome: { next: "s3-cold-berth-wake" } }],
      },
      {
        text: "Wake him, and have his coat ready.", blue: true, req: { flag: "s3-coat-taken" },
        outcomes: [{ outcome: { next: "s3-cold-berth-coat" } }],
      },
      {
        text: "Leave him sleeping. The Record isn't safe yet.",
        outcomes: [{ outcome: {
          text: "You leave the lamp green. When the shell opens, somebody will come for him. You write that on the frost with a finger, so he knows, if he wakes first.",
        } }],
      },
    ],
  },
  {
    id: "s3-cold-berth-wake", pool: "scripted", stages: [3],
    title: "Is the Record Warm", art: "cold-berths", portrait: "recruit-linefolk-a", speaker: "T. Marl",
    text: "The berth hisses. The frost runs to water. He wakes the way people do after thirty-one years: slowly, then all at once.\n\n\"Is the Record warm?\" is the first thing he says. Then he sees the ember light through the door. \"Oh. Oh, it's spending.\" He is out of the berth before anyone can help, and very unsteady.\n\nHis name tag says T. MARL. Archive staff, shelves forty-one to eighty. He would like to know what year it is, and then he would like not to know.",
    choices: [
      {
        text: "Tell him everything. Offer him a place aboard.",
        outcomes: [{ outcome: {
          crewJoin: { species: "linefolk", name: "Teodor Marl" },
          text: "He listens to all of it without interrupting, the way archivists listen. At the end he asks only whether the queue is intact. It is. \"Then I'll come,\" he says. \"Someone should be there who knows the shelving.\"",
        } }],
      },
      {
        text: "Ask him to wait here for the shell to open.",
        outcomes: [{ outcome: {
          revealMap: true,
          text: "He nods, and sits, and then gets up again, because he cannot help it. Before you go he draws you the warm stacks from memory: which galleries still have power, which relays still switch. His map is thirty-one years old and nearly all of it is right.",
        } }],
      },
    ],
  },
  {
    id: "s3-cold-berth-coat", pool: "scripted", stages: [3], requires: { flag: "s3-coat-taken" },
    title: "That's Mine", art: "cold-berths", portrait: "recruit-linefolk-a", speaker: "Teodor Marl",
    text: "The berth hisses and the frost runs to water, and the man inside wakes slowly, then all at once. The first thing he sees is {crew}, holding out a grey coat.\n\n\"That's mine,\" he says. Then: \"You've been wearing it.\" Then, because it has been thirty-one years and he is cold: \"Thank you.\"\n\nHe puts it on, pats the pocket, and finds the pen he left there. He asks whether the Record is warm, and whether anyone relieved the shift.",
    choices: [
      {
        text: "Tell him you are the relief. Offer him a place aboard.",
        outcomes: [{ outcome: {
          crewJoin: { species: "linefolk", name: "Teodor Marl" }, clearFlags: ["s3-coat-taken"], heal: true,
          text: "\"Then the log can be signed,\" he says, and he signs it, on his own sleeve, with the pen. Then he climbs aboard in his own coat, and the crew laugh for the first time in a long time.",
        } }],
      },
      {
        text: "Ask him to wait for the shell to open, and keep warm.",
        outcomes: [{ outcome: {
          revealMap: true, clearFlags: ["s3-coat-taken"],
          text: "He draws you the warm stacks from memory, galleries and relays, in the pen from his pocket, on the back of your chart. Then he sits down in his coat to wait. \"I'm good at waiting,\" he says. \"Evidently.\"",
        } }],
      },
    ],
  },
  {
    id: "s3-boundary-lamp", pool: "distress", stages: [3], unique: true,
    title: "Post Held", art: "wardens-post", portrait: "recruit-warden-b", speaker: "Odile Hollin",
    text: "A signal lamp is flashing warden code from a sentry box on the trust boundary. The wardens of the Night Shift can read it: POST HELD. RELIEF REQUESTED. The date group is today's.\n\nThe sentry box is lit. Inside is a warden in her sixties, in armour mended with everything a person could find in thirty-one years. She has a kettle, a cot, and a signal lamp as long as her arm. She looks at the crew for a long time before she speaks.\n\n\"Is the order still in force?\"",
    choices: [
      {
        text: "Not for long. Come with us and help end it.",
        outcomes: [{ outcome: {
          crewJoin: { species: "warden", name: "Odile Hollin" },
          text: "\"Harrow said someone would come who knew why it was given,\" she says. \"You don't. But you're going, which is more than we did.\" She packs the kettle first.",
        } }],
      },
      {
        text: "Hold the boundary behind us. Slow the Seal.",
        outcomes: [{ outcome: {
          seal: 2,
          text: "She nods, as if she has waited a long time to be asked something she could do. From the far end of the yard you look back, and her lamp is flashing warden code at the quarantine drones, very slowly and very officially, and they have stopped to read it.",
        } }],
      },
      {
        text: "Let {crew:warden} relieve her properly.", blue: true, req: { species: "warden" },
        outcomes: [{ outcome: {
          heal: true, reward: "med",
          text: "{crew:warden} stands at the box and says the words. Post relieved. She takes a long breath and says them back. Then she sits down on her cot and laughs until she cries, and afterwards insists on giving you everything in her stores.",
        } }],
      },
      {
        text: "Tell her it is, and leave her to her post.",
        outcomes: [{ outcome: { text: "\"Good,\" she says, and means it, and doesn't. You leave her with her lamp." } }],
      },
    ],
  },
  {
    id: "s3-countdown", pool: "distress", stages: [3], weight: 0.7,
    title: "Countdown", art: "relay-switchyard",
    text: "Over the carrier comes a steady tone, one beat a second, and under it a voice in Runbook: WORK ORDER 7. BRING DOWN SEALED RELAY. T MINUS 300.\n\nA Demolition Engine has reached a relay on a side carrier: one the wardens sealed on the night of the order and never came back to. There is a bench lamp burning in its switch house window.\n\nThe recall never reached the Engine. It has counted down on a great many relays. It is very good at it, and very heavily built.",
    choices: [
      {
        text: "Put the car between the Engine and the relay.",
        outcomes: [{ outcome: {
          combat: {
            enemy: "demolition-engine", onWin: "s3-countdown-after",
            intro: "OBSTRUCTION ON CARRIER. COUNTDOWN CONTINUES. T MINUS 240.",
          },
        } }],
      },
      {
        text: "Call the relay on every band. Whoever is there should get out.",
        outcomes: [{ outcome: {
          text: "Nobody answers. Down the carrier behind you the tone stops, and a moment later the carrier shudders all the way into this yard. Nobody aboard knows whether anyone was there. That is the worst part.",
        } }],
      },
      {
        text: "Keep going. You cannot save every relay.",
        outcomes: [{ outcome: { text: "You cannot. You go on, and the tone follows you down the carrier for a long time before it stops." } }],
      },
    ],
  },
  {
    id: "s3-countdown-after", pool: "scripted", stages: [3],
    title: "T Minus 41", art: "relay-bench",
    text: "The countdown lamp dims to nothing at T minus 41. The relay stands.\n\nIn its switch house window the bench lamp is still on. Nobody comes to the glass. On the greeting plate, scratched with a crimper point: back after the relief shift. The date is thirty-one years old.\n\nThe relay hears your hello, answers I hear you, and then, unasked, runs its stamp press twice.",
    choices: [
      {
        text: "Take the stamp, and say thank you to the plate.",
        outcomes: [{ outcome: {
          resources: { ttl: 2 }, reward: "med",
          text: "Two hops on the connection, and the Engine's own spares, which it will not be needing. {crew} says thank you to the greeting plate. It seems only polite.",
        } }],
      },
      {
        text: "Leave spares on the step for whoever comes back (1 spare).", req: { resources: { spares: 1 } },
        outcomes: [{ outcome: {
          resources: { spares: -1, ttl: 2 }, heal: true,
          text: "One lens in its ivory ring, on the step under the bench lamp, where anyone coming back would see it. The press thumps twice as you go. Everyone aboard feels better than a spare lens should make them feel.",
        } }],
      },
    ],
  },
  {
    id: "s3-deck-three", pool: "distress", stages: [3], unique: true,
    title: "Retrying", art: "queue-lights",
    text: "A relay's buffer has sprung a leak. One packet has slipped out of the shell's hold and is trying to deliver itself, again and again, to an address on this relay's board that no longer exists: EVACUATION DESK · DECK THREE · WAITING PASSENGER.\n\nEvery few seconds it arrives, finds nobody, and is sent home to try again. It has done this for a very long time.\n\nIt is very small, and it has not given up.",
    choices: [
      {
        text: "Catch it, and read it.",
        outcomes: [{ outcome: {
          fragment: "f3-second-shuttle",
          text: "The packet settles into the Listening Post as if relieved to be held at last. It is one line long. The crew read it, and nobody says anything for a while.",
        } }],
      },
      {
        text: "Coax it back into the hold so it can rest.",
        outcomes: [{ outcome: {
          text: "{crew} eases it back into the relay's buffer and closes the leak. The packet goes quiet. It will go out with the rest, when the rest go out, to wherever deck three went.",
        } }],
      },
      {
        text: "{crew:courier} carries it, the way couriers carry things.", blue: true, req: { species: "courier" },
        outcomes: [{ outcome: {
          fragment: "f3-second-shuttle", heal: true,
          text: "Couriers carried the messages nobody could write down. {crew:courier} listens to it once and has it by heart. \"If I ever find deck three,\" they say, and leave it at that.",
        } }],
      },
    ],
  },
  {
    id: "s3-stack-alarm", pool: "distress", stages: [3],
    title: "Stack 212", art: "ember-draft",
    text: "An alarm on an archive band: STACK 212 · TEMPERATURE CRITICAL · RECORD AT RISK. The cooling fins for this stack have failed, and the Core, spending everything on the shell, has nothing left to send it.\n\nThe stack is a tower of shelving the height of a spire, full of the Record. Its fins run right beside your carrier, and the air around them shimmers.\n\nTwo Ash Moths are already on their way, on their rotors, to help.",
    choices: [
      {
        text: "Vent the car's air over the fins until the Moths arrive, and draw them to you.",
        outcomes: [{ outcome: {
          text: "The car's air pours over the fins in a white plume. It is enough to hold the stack until the Moths arrive, and then it is too much: they read the plume as a cooling job half done, and follow it back to the car.",
          combat: { enemy: "ash-moth", onWin: "s3-stack-alarm-after", intro: "HEAT SOURCE FOUND ON CARRIER. COOLING. The Moths come for the plume." },
        } }],
      },
      {
        text: "Send {crew:rigger} out onto the fins to fix the valve.", blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          codex: "world-record", reward: "low",
          text: "{crew:rigger} does not need air. It walks out along the carrier to the stack, opens a valve panel, and does something with its tool arms that makes the fins groan and then sigh. The alarm stops. The Moths, finding nothing hot, turn away.",
        } }],
      },
      {
        text: "Leave. The Moths are coming for a reason.",
        outcomes: [{ outcome: {
          text: "The Moths arrive as you leave. In the rear window, ash falls on the stack's fins like snow on a roof, and the fins begin to glow. Nobody watches for long.",
        } }],
      },
    ],
  },
  {
    id: "s3-stack-alarm-after", pool: "scripted", stages: [3],
    title: "Save the Index", art: "ember-archive",
    text: "The Moths fold their fins and settle on the stack roof, their task ended. The alarm drops to a murmur: STACK 212 · TEMPERATURE HIGH · RECORD STABLE.\n\nOn the stack's service ledge is a small brass plate: IN CASE OF FIRE, SAVE THE INDEX. Beneath it sits the index, a long box of cards, too hot to touch without gloves.",
    choices: [
      {
        text: "Bring the index aboard to keep it out of the heat.",
        outcomes: [{ outcome: {
          codex: "world-record", reward: "med",
          text: "{crew} carries it aboard in gloves and a lot of language. It goes on the galley shelf by the kettle. Stack 212 will get it back when the shell opens, with an apology for the tea rings.",
        } }],
      },
      {
        text: "Leave it on its ledge, where it belongs.",
        outcomes: [{ outcome: {
          reward: "low", heal: true,
          text: "The plate says save the index. It does not say take it. The stack is cool now; the index is safe where it is. You take the Moths' spare fins instead, and leave the ledge tidy.",
        } }],
      },
    ],
  },
  {
    id: "s3-caught-trolley", pool: "distress", stages: [3],
    title: "Caught in the Lattice", art: "sealing-lattice",
    text: "A small service trolley is caught at the edge of the Seal's lattice, half enclosed already. It is sending a maintenance distress on a loop: GRIP JAMMED · CARGO PERISHABLE · PLEASE ASSIST. A Quarantine Drone hangs over it on four rotors, patiently building the lattice around it strut by strut.\n\nThe manifest stencilled on the trolley's side reads SPARES · BENCH SUPPLIES. It was on its way to a bench nobody has kept in years.",
    choices: [
      {
        text: "Drive the drone off and free the trolley.",
        outcomes: [{ outcome: {
          combat: { enemy: "quarantine-drone", onWin: "s3-caught-trolley-freed", intro: "ROUTE NOT CONFIRMED SAFE. The drone leaves its strut half built." },
        } }],
      },
      {
        text: "Everyone out on the gantry: haul it free by hand, under the drone's clamps.", req: { crewMin: 4 },
        outcomes: [
          { weight: 2, outcome: {
            reward: "med",
            text: "It takes four of you on the gantry and a lot of counting to three, but the trolley's grip comes loose and it rolls free onto your carrier. The drone logs a breach and goes on building around nothing.",
          } },
          { weight: 1, outcome: {
            reward: "low", crewDamage: { amount: 10, who: "all" },
            text: "The drone notices halfway through and runs its clamps along the lattice. Everyone gets a jolt. You get the trolley out anyway, and half its cargo.",
          } },
        ],
      },
      {
        text: "Leave it. The lattice has it.",
        outcomes: [{ outcome: { text: "Behind you, the drone sets the last strut, and the trolley's distress goes on inside the lattice, patient, unanswered." } }],
      },
    ],
  },
  {
    id: "s3-caught-trolley-freed", pool: "scripted", stages: [3],
    title: "For the Last Bench", art: "relay-bench",
    text: "The drone's clamps open and the lattice stops growing. The trolley's grip, as if embarrassed, unjams by itself.\n\nIn its cargo cage: spares in their ivory rings, bench supplies, dressings, a stamp press ribbon, and a kettle wrapped in sacking with a luggage label tied to the handle. FOR THE LAST BENCH.",
    choices: [
      {
        text: "Take the spares. Send the rest on to the bench.",
        outcomes: [{ outcome: {
          resources: { spares: [2, 3] }, heal: true,
          text: "You re-set the trolley's route card and let it go on down the carrier with the kettle. Somebody at the last bench is getting a delivery thirty-one years late. That is still a delivery.",
        } }],
      },
      {
        text: "Take everything except the kettle.",
        outcomes: [{ outcome: {
          reward: "med", resources: { spares: 2 },
          text: "Everything comes aboard except the kettle. Everyone agrees about the kettle without anyone saying so. It goes on down the carrier alone, label fluttering.",
        } }],
      },
    ],
  },
  {
    id: "s3-relief-intercom", pool: "distress", stages: [3],
    title: "Relief Shift, Please Respond", art: "ember-archive",
    text: "A call loops on an archive band: \"Relief shift, please respond. Relief shift, please respond. Shelves one to forty checked.\" It is a recording, a tired voice, and it has been asking for thirty-one years.\n\nIt comes from a staff office two galleries in. The way there runs under a stack whose cooling fins are glowing.",
    choices: [
      {
        text: "Answer it. You are the relief shift.",
        outcomes: [{ outcome: {
          resources: { ttl: 2 },
          text: "{crew} keys the band: \"Relief shift. Received.\" The loop stops. After a moment, the archive's own switchgear re-stamps the connection with two hops, the way it would for staff arriving late.",
        } }],
      },
      {
        text: "Follow the call to its office.",
        outcomes: [
          { weight: 2, outcome: {
            reward: "med",
            text: "The office is empty, warm and orderly. A desk calendar stopped on a Thursday. A drawer of archive spares, and a note on top: for the relief, sorry about the mess. There is no mess.",
          } },
          { weight: 1, outcome: {
            resources: { hull: [-3, -2] },
            text: "The stack's fins flare as you pass under them and the car's plating blisters. The office is empty. There is nothing in it worth the scorch marks.",
          } },
        ],
      },
      {
        text: "Leave it asking.",
        outcomes: [{ outcome: { text: "Relief shift, please respond. It is still asking when the crew stop listening." } }],
      },
    ],
  },
  {
    id: "s3-escort-beacon", pool: "distress", stages: [3],
    title: "Keyed Engineer in Distress", art: "machine-escort",
    text: "An escort beacon on the trust-boundary band: KEYED ENGINEER IN DISTRESS · ESCORT REQUESTED. It comes from a stalled inspection trolley on a spur carrier.\n\nThe trolley's seat is empty. There is a toolkit on it and an engineer's key on a lanyard, long expired. The beacon has been asking for an escort for thirty-one years, and far down the spur, a Null Marshal is at last on its way to answer it.",
    choices: [
      {
        text: "Switch the beacon off and let the Marshal stand down.",
        outcomes: [
          { weight: 2, outcome: {
            reward: "low",
            text: "The beacon goes quiet. Far down the spur the Marshal stops, waits, and backs away to wherever escorts go when nobody needs them. You keep the toolkit.",
          } },
          { weight: 1, outcome: {
            text: "The beacon goes quiet, and the Marshal keeps coming. Somebody switched off its engineer's beacon, and there is a car beside it.",
            combat: { enemy: "null-marshal", intro: "KEYED ENGINEER LOST. INTRUDER PRESENT. ESCORTING INTRUDER OUT." },
          } },
        ],
      },
      {
        text: "Take the toolkit and the key and get clear before it arrives.",
        outcomes: [
          { weight: 1, outcome: {
            reward: "med",
            text: "The car is out of sight across the yard before the Marshal reaches the empty trolley. The toolkit is excellent. The key opens nothing, but {crew} wears it on the lanyard anyway.",
          } },
          { weight: 1, outcome: {
            reward: "low",
            text: "Not fast enough. The Marshal rounds the spur as you pull away.",
            combat: { enemy: "null-marshal", intro: "ESCORT ARRIVING. ENGINEER NOT FOUND. INTRUDER FOUND." },
          } },
        ],
      },
      {
        text: "Wait for the Marshal and end its task.",
        outcomes: [{ outcome: {
          combat: { enemy: "null-marshal", intro: "The Marshal arrives at the trolley, finds no engineer, and turns its lamps on you." },
        } }],
      },
    ],
  },
  {
    id: "s3-dying-relay", pool: "distress", stages: [3],
    title: "Decommission Deferred", art: "machine-hulk",
    text: "A relay is calling on its own maintenance band: REACTOR FAILING · DECOMMISSION DEFERRED · REQUEST ASSISTANCE. It is small, old, and faithful, and its guide lamp is guttering.\n\nClamped to the carrier two spans off, a Grave Reaver has heard the same call. It is waiting for the reactor's signal to weaken far enough. It will not have to wait long.",
    choices: [
      {
        text: "Patch the relay's reactor (2 spares).", req: { resources: { spares: 2 } },
        outcomes: [{ outcome: {
          resources: { spares: -2, ttl: 2 },
          text: "Two spare lenses into the reactor's regulator, a lot of swearing in the switch house, and the guide lamp steadies. The Reaver's head tilts, and it goes back to waiting for something else. The relay re-stamps you twice, which is all it has to say thank you with.",
        } }],
      },
      {
        text: "Get between the Reaver and the relay.",
        outcomes: [{ outcome: {
          combat: { enemy: "grave-reaver", intro: "WEAK SIGNAL. DECOMMISSION PERMITTED. The Reaver lets go of its carrier and comes on." },
        } }],
      },
      {
        text: "Leave it to its reactor.",
        outcomes: [{ outcome: { text: "Behind you the guide lamp gutters, and the Reaver begins, carefully, as it was built to." } }],
      },
    ],
  },
  {
    id: "s3-stuck-car-nine", pool: "distress", stages: [3], unique: true,
    title: "Car Nine", art: "lift-car-stuck",
    text: "A lift car is stuck in the Heart's spire shaft, just below the gallery, lamp on. Its tag reads ARCHIVE · CAR 9 · STAFF AND RECORDS. On the Night of the Fault the archive staff tried to take the duplicate first packets down with them. The car stopped where it is, and they climbed out through the roof and went down another way.\n\nThe boxes are still in there. So is something else: an escort automaton, curled up among the boxes, powered down, as if it had decided to stay with them.",
    choices: [
      {
        text: "Say the first hello to the escort.", blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          crewJoin: { species: "rigger" },
          text: "{crew:rigger} helps; one escort to another. Hello. The lens lights teal before anyone gets to the third line. It climbs out of the car and follows you aboard, and it will not be separated from one small box of first packets, which it carries.",
        } }],
      },
      {
        text: "Try the first hello with the Listening Post's help.", blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          { weight: 2, outcome: {
            crewJoin: { species: "rigger" },
            text: "The Listening Post tunes the greeting to the escort's first page. Hello. — I hear you. — I hear you hear me. The lens goes teal. It follows you out of the car carrying one box of packets it will not put down.",
          } },
          { weight: 1, outcome: {
            text: "Hello. The lens flickers red. It was not wiped clean enough; it remembers the boxes, and it will not leave them. You back out politely and close the hatch behind you.",
          } },
        ],
      },
      {
        text: "Take the car's spares and leave the escort with its boxes.",
        outcomes: [{ outcome: {
          reward: "med",
          text: "Spares, a tool roll, a crate of lamp oil. You leave the escort curled up among the boxes. It was keeping them. Someone should.",
        } }],
      },
    ],
  },
  {
    id: "s3-school-question", pool: "distress", stages: [3],
    title: "A Question from Below", art: "radio-mast-ground",
    text: "On the Heart's inbound Ground band, a recording repeats. It is a class of children somewhere under the cloud, all talking at once, and then a teacher asking them to take turns.\n\n\"Are the lamps up there amber or white? We have a bet.\"\n\n\"How do you get your tea up there?\"\n\n\"Are you real?\"\n\nThe recording is from last year. There is one like it for every year before.",
    choices: [
      {
        text: "Queue an answer. It will go out when the shell opens.",
        outcomes: [{ outcome: {
          heal: true,
          text: "{crew} records an answer on the inbound band's reply track, which goes into the queue with everything else. Amber, mostly. The tea comes up in tins. Yes. It takes four attempts, because everyone wants to add something.",
        } }],
      },
      {
        text: "Listen to all the years.",
        outcomes: [{ outcome: {
          heal: true,
          text: "Thirty years of classes. The voices change and the questions do not, much. In the early years the teacher sounds frightened. In the later ones she sounds amused. In the last one, a different teacher: \"Mrs. Voss says hello, she retired.\"",
        } }],
      },
      {
        text: "Switch it off. There is no time.",
        outcomes: [{ outcome: { text: "There isn't. Somebody switches it back on for a second, just to hear the bet again, and then off." } }],
      },
    ],
  },
];
