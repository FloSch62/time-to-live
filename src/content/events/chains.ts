// Multi-relay story chains that run across the stages, carried by run flags (see flags.ts):
//   1. The evening caller        chain-radio-*       evening-frequency → answer-queued
//   2. The music box             chain-music-box-*   music-box → music-box-wound → music-box-sent
//   3. The courier's log         chain-courier-*     courier-log-1 → courier-log-2 (+ kittiwake-lit/-rested) → courier-log-3
//   4. Moss Adair                chain-moss-*        moss-met (+ moss-owes / moss-robbed) → moss-paid → moss-decoy
//   5. Pell's letter             chain-pell-letter   pell-letter (set at Pell's stall, Stage I) → pell-letter-posted
import type { EventDef } from "../../game/types.ts";

export const CHAIN_FLAGS: Record<string, string> = {};

const EVENING = "Unknown sender · priority low";

export const CHAIN_EVENTS: EventDef[] = [
  // ─── 1. The evening caller ───────────────────────────────────────────────────────────────────────────────
  {
    id: "chain-radio-reach", pool: "event", stages: [1], weight: 2, unique: true,
    title: "Same Time Tomorrow", art: "tender-radio", portrait: "teal-jacket", speaker: EVENING,
    text: "At dusk, when the sun goes under the ring and the carriers tick as they cool, {crew} turns the galley radio off the tender band to see what else is out there. Static. The old lift bands, empty for thirty-one years. Static.\n\nThen a woman's voice, from very far down, patient, as if she has said it many times.\n\n\"Is anyone still on this frequency? I'll try again tomorrow at the same time.\"\n\nThe set's queue lamp glows red. Whatever comes up from below the cloud floor goes into the queue, and nothing in the queue comes out.",
    choices: [
      {
        text: "Answer her.",
        outcomes: [
          { outcome: { text: "{crew} keys the set and says received, and the tender's name, and where you are. The reply lamp flickers, and then the queue lamp: HELD. The quarantine holds all deliveries, both ways. She did not hear. She will be back tomorrow at the same time.", fragment: "f1-teal-first", flags: ["evening-frequency"], codex: "people-evening-caller" } },
        ],
      },
      {
        text: "Mark the frequency on the dial.",
        outcomes: [
          { outcome: { text: "{crew} scratches a mark in the brass beside the dial, next to the tender band. Tomorrow, same time, the kettle will be on.", fragment: "f1-teal-first", flags: ["evening-frequency"], codex: "tender-radio" } },
        ],
      },
      {
        text: "Turn it back to the tender band.",
        outcomes: [
          { outcome: { text: "The tender band hisses. Relay Seven is quiet. Nobody marks the dial, and everybody remembers where it was.", fragment: "f1-teal-first" } },
        ],
      },
    ],
  },
  {
    id: "chain-radio-reach-beans", pool: "event", stages: [1], weight: 3, unique: true,
    requires: { flag: "evening-frequency" },
    title: "The Beans Came Up", art: "tender-radio", portrait: "teal-jacket", speaker: EVENING,
    text: "Dusk again, and the kettle is on without anybody saying why. The dial sits on the mark. At the same time, to the minute, the voice comes up through the static.\n\n\"It rained all day. The beans came up anyway. Is anyone still on this frequency? I'll try again tomorrow at the same time.\"\n\nIt is the most ordinary thing anyone aboard has heard in weeks. {crew} asks what beans look like, coming up. Nobody on the Line has grown anything in soil for longer than memory.",
    choices: [
      {
        text: "Listen to the static after she signs off.",
        outcomes: [
          { outcome: { text: "Under the static, fainter, other voices: a whole world of people calling up, on every band there is. The queue lamp holds them all. HELD. NOT DISCARDED.", fragment: "f1-teal-beans" } },
        ],
      },
      {
        text: "Trace her signal down through the cloud floor.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          { outcome: { text: "The Listening Post follows her carrier wave down a spire, through the cloud floor, to its foot: a mast built out of lift parts, rain on the aerial loud as a hiss. The trace ends at a lift car with one window lit. That is all the Listening Post can see, and it is a great deal.", fragment: "f1-teal-beans" } },
        ],
      },
    ],
  },
  {
    id: "chain-radio-reach-cold", pool: "event", stages: [1], weight: 3, unique: true,
    requires: { flag: "evening-frequency" },
    title: "Short Tonight", art: "tender-radio", portrait: "teal-jacket", speaker: EVENING,
    text: "\"Is anyone still on this frequency? My hands are cold tonight, so this will be short. Same time tomorrow.\"\n\nShe signs off. {crew} looks at the galley stove, and then at the heater dial, and turns it up a notch, which makes no difference to anyone below the cloud floor at all.",
    choices: [
      {
        text: "Leave the heater turned up.",
        outcomes: [
          { outcome: { text: "It stays turned up. Nobody mentions it. It is a very warm galley for the rest of the Reach.", fragment: "f1-teal-cold", heal: true } },
        ],
      },
      {
        text: "Start a page in the log for her calls.",
        outcomes: [
          { outcome: { text: "{crew} starts a page: date, time, what she said. Three lines so far. The page has a lot of room left.", fragment: "f1-teal-cold" } },
        ],
      },
    ],
  },
  {
    id: "chain-radio-glass", pool: "event", stages: [2], weight: 2, unique: true,
    title: "The Glass Picks Her Up", art: "cathedral-nave", portrait: "teal-jacket", speaker: EVENING,
    text: "At dusk the panes along the carrier start to ring before the radio does. In the Cathedral, light and sound get into everything, and so does the old lift band.\n\nThe voice comes out of the glass before it comes out of the set: a woman, very far down.\n\n\"Is anyone still on this frequency? The clouds were thin tonight. I could see your lights, most of them. Same time tomorrow.\"\n\nIf anyone aboard has heard her before, they say nothing, and turn the set up.",
    choices: [
      {
        text: "Answer her, into the glass.",
        outcomes: [
          { outcome: { text: "The panes take {crew}'s reply and ring it back a quarter tone flat. The queue lamp on the set glows red: HELD. The Cathedral keeps everything. That was always the trouble with it.", fragment: "f2-teal-thin", flags: ["evening-frequency"], codex: "people-evening-caller" } },
        ],
      },
      {
        text: "Flash the cupola lamp down through the fog.",
        outcomes: [
          { outcome: { text: "It is a long way down through the fog and the cloud floor, and it is almost certainly pointless. The whole crew stands at the windows while the lamp goes on and off, on and off, anyway.", fragment: "f2-teal-thin", flags: ["evening-frequency"], codex: "tender-radio" } },
        ],
      },
    ],
  },
  {
    id: "chain-radio-glass-aerial", pool: "event", stages: [2], weight: 3, unique: true,
    requires: { flag: "evening-frequency" },
    title: "A Better Aerial", art: "tender-radio", portrait: "teal-jacket", speaker: EVENING,
    text: "\"I fixed the aerial again. If this sounds better, that's why. Is anyone still on this frequency?\"\n\nIt does sound better. The bellmakers say you can hear a person's hands in their voice. Hers sound like someone who has fixed an aerial in the rain many times, and will again.",
    choices: [
      {
        text: "Tune the set to match her.",
        outcomes: [
          { outcome: { text: "{crew} nudges the dial until her carrier wave and the glass agree. For a moment the whole nave is humming her frequency, very softly, and then she is gone.", fragment: "f2-teal-aerial" } },
        ],
      },
      {
        text: "Let the bellmaker listen.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [
          { outcome: { text: "{crew:bellmaker} listens with eyes shut to the very end of the carrier wave. \"She does her own soldering,\" she says. \"Good joints.\" Then nothing else, for the rest of the evening.", fragment: "f2-teal-aerial" } },
        ],
      },
    ],
  },
  {
    id: "chain-radio-glass-singing", pool: "event", stages: [2], weight: 3, unique: true,
    requires: { flag: "evening-frequency" },
    title: "Somebody Singing", art: "glass-bells", portrait: "teal-jacket", speaker: EVENING,
    text: "\"Somebody down the valley was singing tonight. You'd have liked it. I'll try again tomorrow at the same time.\"\n\nThe Cathedral takes the word singing and does something with it, and for a moment the panes around the carrier ring in a chord nobody aboard has heard before.",
    choices: [
      {
        text: "Sing something back.",
        outcomes: [
          { outcome: { text: "{crew} sings the only thing everyone aboard knows all the words to, which is the greeting, badly, in three parts. The glass joins in. HELD, says the queue lamp. The crew agree it counts.", fragment: "f2-teal-singing" } },
        ],
      },
      {
        text: "Just listen.",
        outcomes: [
          { outcome: { text: "Nobody moves until the glass is quiet again. It takes a long time. Nobody minds.", fragment: "f2-teal-singing" } },
        ],
      },
    ],
  },
  {
    id: "chain-radio-heart", pool: "event", stages: [3], weight: 2, unique: true,
    title: "Late", art: "tender-radio", portrait: "teal-jacket", speaker: EVENING,
    text: "The Heart eats radio. The galley set is a hiss with the queue lamp glowing red in the middle of it. At dusk the hiss thins, as if the archive itself were listening, and the old lift band comes through.\n\n\"Is anyone still on this frequency? I'm late tonight, sorry. I'll be on time tomorrow.\"\n\nLate. After thirty-one years. {crew} laughs, and then has to go and stand in the corridor for a minute.",
    choices: [
      {
        text: "Mark the time she called.",
        outcomes: [
          { outcome: { text: "Eleven minutes late. {crew} writes it down and underlines it, as if it were the most important thing on the page. It might be.", fragment: "f3-teal-late", flags: ["evening-frequency"], codex: "people-evening-caller" } },
        ],
      },
      {
        text: "Ask the queue how many of her calls it is holding.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          { outcome: { text: "The Listening Post asks the queue, politely, and the queue answers with a number. It is a very large number. Every one is marked unknown sender, priority low. Every one is held.", fragment: "f3-teal-late", flags: ["evening-frequency"], codex: "tender-radio" } },
        ],
      },
    ],
  },
  {
    id: "chain-radio-heart-counting", pool: "event", stages: [3], weight: 3, unique: true,
    requires: { flag: "evening-frequency" },
    title: "Counting the Evenings", art: "queue-lights", portrait: "teal-jacket", speaker: EVENING,
    text: "\"I counted the evenings once. Then I stopped counting and kept calling. Is anyone still on this frequency?\"\n\nThrough a crack in the gallery wall the queue glows, a field of small lights. Somewhere in there are all her evenings.",
    choices: [
      {
        text: "Look for them.",
        outcomes: [
          { outcome: { text: "Through the crack there is no telling one light from another. {crew} picks one anyway, low down and a little to the left, and decides it is hers.", fragment: "f3-teal-counting" } },
        ],
      },
      {
        text: "Count them for her, from the page in the log.",
        outcomes: [
          { outcome: { text: "{crew} starts adding up evenings since the Fault, gets to the fourth year, and stops. Keeps the page. Some things you do not finish for someone else.", fragment: "f3-teal-counting" } },
        ],
      },
    ],
  },
  {
    id: "chain-radio-heart-answer", pool: "event", stages: [3], weight: 3, unique: true,
    requires: { flag: "evening-frequency" },
    title: "Received", art: "queue-lights", portrait: "teal-jacket", speaker: EVENING,
    text: "Dusk, the last one before the shell, as far as anyone can tell. The dial is on the mark. The kettle is on.\n\n\"Rain on the roof of the car tonight. It sounds like a relay hall. Is anyone still on this frequency? Same time tomorrow.\"\n\nThe Heart's intake is close enough now that the set can reach it. Anything you send will not go down. It will go into the queue with everything else, and be held. Held, the archive promises. Not discarded.",
    choices: [
      {
        text: "Send one word: received.",
        outcomes: [
          { outcome: { text: "The reply lamp goes amber, then red: ACCEPTED. HELD. Somewhere in the queue there is a very small new light, near the end.", fragment: "f3-teal-rain", flags: ["answer-queued"] } },
        ],
      },
      {
        text: "Send the whole greeting.",
        outcomes: [
          { outcome: { text: "Hello. I hear you. I hear you hear me. ACCEPTED. HELD. It will not reach her tonight. The whole crew agrees that it will reach her.", fragment: "f3-teal-rain", flags: ["answer-queued"] } },
        ],
      },
      {
        text: "Just listen tonight.",
        outcomes: [
          { outcome: { text: "Same time tomorrow, she said. {crew} writes it in the log like an appointment.", fragment: "f3-teal-rain" } },
        ],
      },
    ],
  },

  // ─── 2. The music box ────────────────────────────────────────────────────────────────────────────────────
  {
    id: "chain-sorting-office", pool: "event", stages: [1], weight: 2, unique: true,
    title: "Held for Collection", art: "sorting-office",
    text: "The Reach sorting office hangs off a spire top beside the switchyard, its windows dusty and whole. Inside: pigeonholes to the ceiling, every one with a parcel and a brass ticket, a counter polished by two hundred years of elbows, clocks stopped at hour one.\n\nOn the counter lies one small parcel, as if someone had come to the front with it and been called away. HELD FOR COLLECTION · TICKET 0415. It ticks faintly when you pick it up. It is a music box, and it is still wound.",
    choices: [
      {
        text: "Take it along for collection.",
        outcomes: [
          { outcome: { text: "{crew} writes CARRIED BY {ship} on the counter slip, in case anyone comes. The box goes in a padded drawer in the galley.", flags: ["music-box"], fragment: "f1-music-box", codex: "places-sorting-office" } },
        ],
      },
      {
        text: "Wind it, and hear what it plays.",
        outcomes: [
          { outcome: { text: "Four bars of a slow tune every linefolk grandparent would know, and nobody aboard can name. Then it stops, mid-phrase. Nobody can put it back in its hole after that. It comes with you.", flags: ["music-box"], fragment: "f1-music-box", codex: "places-sorting-office" } },
        ],
      },
      {
        text: "Sign for it properly, the way couriers did.",
        blue: true, req: { species: "courier" },
        outcomes: [
          { outcome: { text: "A brass plate over the counter says a courier may sign for a parcel held for collection when the addressee cannot be reached. {crew:courier} signs with a flourish. The office's franking machine, glad of the work, franks the connection card too. One hop.", flags: ["music-box"], fragment: "f1-music-box", codex: "places-sorting-office", resources: { ttl: 1 } } },
        ],
      },
      {
        text: "Leave it held. Someone may still come.",
        outcomes: [
          { outcome: { text: "The parcel stays on the counter. You leave the ticket stub on top so whoever comes will know where to look.", codex: "places-sorting-office" } },
        ],
      },
    ],
  },
  {
    id: "chain-music-box-glass", pool: "event", stages: [2], weight: 3, unique: true,
    requires: { flag: "music-box" },
    title: "Four Bars", art: "cathedral-nave",
    text: "Crossing a nave, the panes ring under the trolley, and in the galley drawer the music box answers. Its comb catches the note and plays four bars by itself, slow, a little flat.\n\nThe glass hears it. The ringing along the carrier changes to match, and for a moment the whole flank of the Cathedral is playing the same tune, very quietly, like a choir humming before anyone has found the page.",
    choices: [
      {
        text: "Wind it properly, and let the Cathedral hear all of it.",
        outcomes: [
          { outcome: { text: "The box plays its whole tune and the Cathedral plays it back, and somewhere in the glass a voice that was sealed there thirty-one years ago says a sentence about Thursday.", fragment: "f2-thursday", flags: ["music-box-wound"], next: "chain-music-box-glass-choir" } },
        ],
      },
      {
        text: "Ask the bellmaker what the tune is.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [
          { outcome: { text: "{crew:bellmaker} does not need more than two notes. \"The Thursday hymn. The choir sang it every week.\" She winds the box herself and holds it up to the glass.", fragment: "f2-thursday", flags: ["music-box-wound"], next: "chain-music-box-glass-choir" } },
        ],
      },
      {
        text: "Shut the drawer. It is not yours to play.",
        outcomes: [
          { outcome: { text: "The drawer closes on the last note. The glass goes on humming the tune by itself for a while, and then forgets it." } },
        ],
      },
    ],
  },
  {
    id: "chain-music-box-glass-choir", pool: "scripted", stages: [2],
    title: "Thursday", art: "glass-bells",
    text: "When the box winds down, the glass does not stop. Down in the ringing, faint and cheerful and badly out of time, there is another choir. Not sealed in the glass: coming up through it, from below the cloud floor, on the old lift band.\n\nIt is Thursday somewhere.",
    choices: [
      {
        text: "Listen to the end.",
        outcomes: [
          { outcome: { text: "They sing what they remember. They remember most of it. When they finish somebody down there claps, and the Cathedral rings with the clapping all along the carrier.", fragment: "f2-thursday-choir" } },
        ],
      },
    ],
  },
  {
    id: "chain-music-box-freight", pool: "event", stages: [3], weight: 3, unique: true,
    requires: { flag: "music-box" },
    title: "The Freight Rail", art: "ember-archive",
    text: "The archive has its own freight rail: a cage on a cable running down the inside of the spire from the Heart's lift head to the collection desk at the spire foot, for parcels the wire could not carry. The cage hangs at the top with its door open. The rail's lamp shows HOLD, like everything else here.\n\nThe label slot takes a collection ticket. The music box has one. 0415.",
    choices: [
      {
        text: "Put the box in the cage with its ticket.",
        outcomes: [
          { outcome: { text: "{crew} winds it once more, sets it in the cage and slides the ticket into the slot. The door closes. The cage goes down one metre, and stops, and waits, like everything else here, for a safe route.", flags: ["music-box-sent"] } },
        ],
      },
      {
        text: "Let the rigger set the cage brake to let go on the first delivery.",
        blue: true, req: { species: "rigger" },
        outcomes: [
          { outcome: { text: "{crew:rigger} opens the brake housing, looks at it for a long time, and resets one small lever. \"When the queue goes, this goes.\" The cage waits at the top with the box inside and the ticket in the slot.", flags: ["music-box-sent"] } },
        ],
      },
      {
        text: "Keep it aboard. Deliver it yourselves, after.",
        outcomes: [
          { outcome: { text: "The box stays in the galley drawer. After, says everyone, as if after were a relay on the chart." } },
        ],
      },
    ],
  },

  // ─── 3. The courier's log and the Kittiwake ──────────────────────────────────────────────────────────────
  {
    id: "chain-courier-log", pool: "event", stages: [1], weight: 2, unique: true,
    title: "A Logbook on the Shelf", art: "relay-bench",
    text: "An empty bench in a switch house at the far end of a Reach yard: lamp on, tools in order, a kettle, a drawer sorted by what it could still save. On the shelf over the kettle, a lamper's logbook, left open.\n\nThe first page is dated eleven years ago. It is signed with a small drawn lamp instead of a name.\n\nTTL 16. Took the Kittiwake, because it was the only tender in the docks with a kettle. Pell says I'm mad. Pell is right, but she gave me a discount, which I think means she hopes I'm not.",
    choices: [
      {
        text: "Read the rest of the Reach pages.",
        outcomes: [
          { outcome: { next: "chain-courier-log-read" } },
        ],
      },
      {
        text: "Take a cup from the kettle and leave the log for the next crew.",
        outcomes: [
          { outcome: { text: "The kettle still works. The tea in the tin has not been good for years, and everybody drinks it anyway, standing, reading over each other's shoulders.", flags: ["courier-log-1"], codex: "people-courier", heal: true } },
        ],
      },
    ],
  },
  {
    id: "chain-courier-log-read", pool: "scripted", stages: [1],
    title: "Going Anyway", art: "relay-bench",
    text: "The Reach pages are short and practical. Relay numbers. Which switch houses have benches. Which leeches to give a wide berth. A long argument with a Scrap Foreman, lost. A note: the Copper Gate wants a second way home, and the only one I know is back. Then, underlined: going anyway.\n\nThe last Reach page says only: through the gate. Glass ahead. It rings.",
    choices: [
      {
        text: "Copy the useful pages into your own log.",
        outcomes: [
          { outcome: { text: "Relay numbers, benches, leeches. The courier's notes are eleven years old and still mostly right. Mostly.", flags: ["courier-log-1"], codex: "people-courier", revealMap: true } },
        ],
      },
      {
        text: "Add a line of your own under the last page.",
        outcomes: [
          { outcome: { text: "{crew} writes the date, and {ship}, and after some thought: going anyway. Then uses the bench's stamp press, because it is there, and because the courier would have.", flags: ["courier-log-1"], codex: "people-courier", resources: { ttl: 1 } } },
        ],
      },
    ],
  },
  {
    id: "chain-kittiwake", pool: "event", stages: [2], weight: 3, unique: true,
    requires: { flag: "courier-log-1" },
    title: "The Kittiwake", art: "echo-tender-lit",
    text: "A lamp on the carrier ahead, coming toward you, slowly: an echo tender on its round, nobody at the cab window. On the name plate under the cupola, in lampers' lettering: KITTIWAKE.\n\nThe courier's tender. It runs back and forth along one frosted carrier between two relays that will not switch it any more, relighting their two guide lamps, which the Core pulls dark again by morning. It has been doing this for eleven years.\n\nTENDER ON ROUND. CREW ABOARD: 0. LAMP: LIT. OBSTRUCTION ON MY CARRIER. PLEASE CLEAR.",
    choices: [
      {
        text: "Pull onto the side carrier, let it pass, then couple to its tail.",
        outcomes: [
          { outcome: { text: "It passes close enough to touch. {crew} lines up the coupling on its rear car and the hooks go home. The Kittiwake's autopilot, finding itself held, politely stops.", next: "chain-kittiwake-aboard" } },
        ],
      },
      {
        text: "Hail it the way couriers hailed each other.",
        blue: true, req: { species: "courier" },
        outcomes: [
          { outcome: { text: "{crew:courier} sends three short and one long on the cupola lamp, and then the greeting, and then a word that is not in the Runbook. The Kittiwake stops dead on its carrier and opens its cab door.", next: "chain-kittiwake-aboard" } },
        ],
      },
      {
        text: "Hold your ground on its carrier.",
        outcomes: [
          { outcome: { text: "The Kittiwake's autopilot reads {ship} as wreckage on its carrier, and it was built to clear wreckage.", combat: { enemy: "echo-tender", intro: "The Kittiwake comes on, lamp lit, to clear its carrier. Nobody is aboard to call it off.", onWin: "chain-kittiwake-aboard" } } },
        ],
      },
    ],
  },
  {
    id: "chain-kittiwake-aboard", pool: "scripted", stages: [2],
    title: "Leave My Tender Lit", art: "echo-tender-lit",
    text: "The Kittiwake's cab smells of cold tea. The kettle is still on its ring. The rest of the logbook lies open on the helm beside a cup with an eleven-year-old ring in it.\n\nThe Cathedral pages are longer. Glass rings all the time. Heard a whole wedding in a pane today, vows and all. Air plant failing, patched, failing. Then, in a shakier hand: got as far as the glass. Autopilot set to the round, so the lamps get lit whatever happens. Leave my tender lit.\n\nThe lampers had a rule for a tender whose crew were gone. Leave the lamp lit, or put it out yourself. Don't let the dark do it.",
    choices: [
      {
        text: "Leave the lamp lit, and let it run its round.",
        outcomes: [
          { outcome: { text: "You take a cup from its kettle first, because the courier would have wanted the kettle used. Then {crew} uncouples, and the Kittiwake backs away down its carrier, lamp lit, to relight its two lamps. The courier asked. That settles it.", flags: ["courier-log-2", "kittiwake-lit"], heal: true } },
        ],
      },
      {
        text: "Finish its round for it, and put the lamp out yourselves.",
        outcomes: [
          { outcome: { text: "You run the Kittiwake to the end of its carrier and light both lamps yourselves, properly, once. Then {crew} sets the brake and puts out the cupola lamp by hand. A useful thing deserves another journey: its drawer of spares comes with you.", flags: ["courier-log-2", "kittiwake-rested"], reward: "med" } },
        ],
      },
      {
        text: "Take its rear car along, and leave the lamp lit.",
        outcomes: [
          { outcome: { text: "Its rear car is a bunk car, one bunk made up, a courier's satchel for a pillow. The Kittiwake does not need it for its round. You couple it behind your own and leave the lamp lit.", flags: ["courier-log-2", "kittiwake-lit"], car: "bunk-car" } },
        ],
      },
    ],
  },
  {
    id: "chain-courier-last", pool: "event", stages: [3], weight: 3, unique: true,
    requires: { flag: "courier-log-2" },
    title: "Got as Far as the Glass", art: "queue-lights",
    text: "Through a crack in the gallery wall the queue glows, and the Listening Post, pressed against the crack, reads what it can of the nearest lights. Most are from the Night of the Fault.\n\nOne is eleven years old. Its sender is Tender Kittiwake, keeper. It was sent from the Glass Cathedral on the day of the logbook's last entry, and it came here, like everything else, and was held.",
    choices: [
      {
        text: "Read it.",
        outcomes: [
          { outcome: { text: "Got as far as the glass. The next one will get further. Leave my tender lit.\n\nThe next one has got further. {crew} says so, out loud, to the crack in the wall. It is a silly thing to do, and everyone does it in turn.", fragment: "f3-courier", flags: ["courier-log-3"] } },
        ],
      },
      {
        text: "Read what came with it.",
        outcomes: [
          { outcome: { text: "Got as far as the glass. The next one will get further. Leave my tender lit.\n\nAttached: one page copied by hand from the back of a Runbook, headed Handover. The page is blank. In the margin, in the courier's hand, two words: not yet.", fragment: "f3-courier", flags: ["courier-log-3"], codex: "world-handover" } },
        ],
      },
    ],
  },

  // ─── 4. Moss Adair and the Second Helping ────────────────────────────────────────────────────────────────
  {
    id: "chain-moss-reach", pool: "event", stages: [1], weight: 2, unique: true,
    title: "The Second Helping", art: "scavenger-skiff-hail", portrait: "moss", speaker: "Moss Adair",
    text: "A skiff comes alongside on the parallel carrier: a freight car, half a lift car and something that used to be a tender's galley, welded onto one working trolley and painted the same patient brown. Salvage nets. Two men arguing in the hatch. The name on the side, in three different hands: SECOND HELPING.\n\nIts captain leans out with a hand lamp. \"That's a Dock Twelve car. That's Pell's grip on your trolley. So you've got spares, and you owe Pell, which means you understand debt.\" He smiles. \"Moss Adair. Let's talk about what comes off easy.\"",
    choices: [
      {
        text: "Offer them a fair trade (20 salvage).",
        req: { resources: { salvage: 20 } },
        outcomes: [
          { outcome: { text: "Moss counts it twice, which is manners, not suspicion.", resources: { salvage: -20 }, flags: ["moss-met", "moss-owes"], next: "chain-moss-reach-trade" } },
        ],
      },
      {
        text: "Keep a hand on the emitters and tell them to move on.",
        outcomes: [
          { outcome: { text: "Moss sighs, the sigh of a man who has done this before and never enjoyed it.", flags: ["moss-met"], combat: { enemy: "scavenger-skiff", surrenderable: true, intro: "The Dunmore brothers agree, for once, that this is a bad idea. Moss does it anyway.", onWin: "chain-moss-reach-stripped", onSurrender: "chain-moss-reach-spared" } } },
        ],
      },
      {
        text: "Let the warden stand in the open hatch where they can see her.",
        blue: true, req: { species: "warden" },
        outcomes: [
          { outcome: { text: "{crew:warden} stands in the hatch with the visor up and says nothing at all. Moss looks at the ember stripe for a long moment. \"Another day,\" he says cheerfully, and the Second Helping backs off down its carrier, the Dunmores arguing about whose idea it was.", flags: ["moss-met"], codex: "people-moss" } },
        ],
      },
    ],
  },
  {
    id: "chain-moss-reach-trade", pool: "scripted", stages: [1],
    title: "First Packet", art: "scavenger-skiff-hail", portrait: "moss", speaker: "Moss Adair",
    text: "Moss pulls a folded paper out of his coat, very carefully.\n\n\"Pulled this out of a Packet Leech's buffer three years back. Sent up from below. First packet.\" He does not hand it over. He reads it to you, and you can tell he has read it every night since.\n\nName: Fern Adair. Born under the cloud. Hope: that she sees the lights.\n\n\"My sister's girl. Never met her.\" He folds it again along the old creases. \"If you get to the Heart. Well. If you get to the Heart.\"",
    choices: [
      {
        text: "Promise to look for her name in the Record.",
        outcomes: [
          { outcome: { text: "\"Good.\" He stamps your card twice from the press in the back, for luck, which is not how stamps work, and nobody tells him.", fragment: "f1-fern", codex: "people-moss", resources: { ttl: 2 } } },
        ],
      },
      {
        text: "Ask for payloads instead of promises.",
        outcomes: [
          { outcome: { text: "He laughs, throws in a crate of payloads, and reads you the packet again anyway.", fragment: "f1-fern", codex: "people-moss", resources: { payloads: 3 } } },
        ],
      },
    ],
  },
  {
    id: "chain-moss-reach-spared", pool: "scripted", stages: [1],
    title: "Three Short, One Long", art: "scavenger-skiff-hail", portrait: "moss", speaker: "Moss Adair",
    text: "The Second Helping's lamps blink the old lampers' signal for giving up: three short, one long. Moss comes on the radio sounding more embarrassed than hurt.\n\n\"All right. That's fair. We've a spare stamp and some salvage. Take it and let us limp home, and I'll owe you. I pay what I owe. Ask Pell.\"",
    choices: [
      {
        text: "Accept. Take the stamp and let them go.",
        outcomes: [
          { outcome: { text: "The stamp comes across on a line with a paper tied to it, a first packet copied out in careful capitals. \"My niece,\" says Moss. \"Born under the cloud. If you get to the Heart.\" Then the skiff limps off down its carrier.", flags: ["moss-owes"], fragment: "f1-fern", codex: "people-moss", resources: { ttl: 2, salvage: [10, 20] } } },
        ],
      },
      {
        text: "Accept, and send them a spare for their trolley (1 spare).",
        req: { resources: { spares: 1 } },
        outcomes: [
          { outcome: { text: "Moss is quiet for a moment when the lens comes across. \"Now that I will remember.\" A stamp comes back, and a paper with a first packet copied on it: Fern Adair, born under the cloud. \"My sister's girl. If you get to the Heart.\"", flags: ["moss-owes"], fragment: "f1-fern", codex: "people-moss", resources: { spares: -1, ttl: 2 } } },
        ],
      },
    ],
  },
  {
    id: "chain-moss-reach-stripped", pool: "scripted", stages: [1],
    title: "What Comes Off Easy", art: "scavenger-skiff-hail", portrait: "moss", speaker: "Moss Adair",
    text: "The Second Helping hangs on its carrier with its lamps out and its crew in the hatch, hands where you can see them. Three men who have lived thirty years on what comes off easy, watching what comes off them.",
    choices: [
      {
        text: "Take everything worth taking.",
        outcomes: [
          { outcome: { text: "Nets, cells, the payload rack, the stamp press. Moss watches every piece go across. \"We'll remember,\" he says, not loudly. It does not sound like a threat. It sounds like a fact.", flags: ["moss-robbed"], reward: "high" } },
        ],
      },
      {
        text: "Take what you need and leave them their trolley and lamps.",
        outcomes: [
          { outcome: { text: "You leave the cells and the lamps. Moss nods once, as if something had been settled that was not about salvage at all.", flags: ["moss-owes"], reward: "low", codex: "people-moss" } },
        ],
      },
    ],
  },
  {
    id: "chain-moss-glass", pool: "event", stages: [2], weight: 3, unique: true,
    requires: { flag: "moss-owes" },
    title: "Paid in Full", art: "glass-fog", portrait: "moss", speaker: "Moss Adair",
    text: "Out of the glass fog, down a side carrier, frost on its nets: the Second Helping, a very long way from the Copper Market. The Dunmore brothers are arguing about the fog. Moss is at the hatch with a lamp.\n\n\"Told you I pay what I owe. We followed the Seal's cuts in, side carriers all the way. No place for a skiff.\" He looks up at the ringing panes. \"Beautiful, though. So. What'll it be.\"",
    choices: [
      {
        text: "Stamps.",
        outcomes: [
          { outcome: { text: "The press in the back thumps three times. Moss tries a fourth, for interest, and the card refuses it on principle. Three hops.", resources: { ttl: 3 }, flags: ["moss-paid"] } },
        ],
      },
      {
        text: "Payloads, and a rack to keep them in.",
        outcomes: [
          { outcome: { text: "A payload rack off the skiff's own freight car, crated for your socket, and the payloads to fill it. \"Cleared us out,\" Moss says, delighted.", resources: { payloads: 3 }, module: "payload-rack", flags: ["moss-paid"] } },
        ],
      },
      {
        text: "One of the Dunmores, if he wants to come.",
        outcomes: [
          { outcome: { text: "Tam Dunmore wants to see the Heart. Ivo Dunmore says it is the stupidest thing he has ever heard. They agree, for once, that Tam should go.", crewJoin: { species: "linefolk", name: "Tam Dunmore" }, flags: ["moss-paid"] } },
        ],
      },
    ],
  },
  {
    id: "chain-moss-glass-grudge", pool: "event", stages: [2], weight: 3, unique: true,
    requires: { flag: "moss-robbed" },
    title: "We Remember", art: "glass-fog",
    text: "The fog is thick enough that the Listening Post misses them until the grapples bite. The Second Helping, lamp-dark, on your carrier behind you, hooked onto your tail. By the time {crew} gets to the rear window the grapples are gone, there is a note tucked into the coupling, and the payload rack is lighter.\n\nThe note says: WE REMEMBER. It is not signed. It does not need to be.",
    choices: [
      {
        text: "Call them on the radio and pay back what you took (30 salvage).",
        req: { resources: { salvage: 30 } },
        outcomes: [
          { outcome: { text: "A long silence on the band. Then Moss: \"That's not nothing.\" The payloads come back across on a line. The skiff's lamps come on, once, and it goes back into the fog.", resources: { salvage: -30 }, clearFlags: ["moss-robbed"], flags: ["moss-owes"] } },
        ],
      },
      {
        text: "Let them have it. Fair is fair.",
        outcomes: [
          { outcome: { text: "The fog closes over them. Fair is fair, says {crew}, and nobody argues.", resources: { payloads: [-3, -2] } } },
        ],
      },
    ],
  },
  {
    id: "chain-moss-heart", pool: "event", stages: [3], weight: 3, unique: true,
    requires: { flag: "moss-met" },
    title: "Be the Storm", art: "sealing-lattice", portrait: "moss", speaker: "Moss Adair",
    text: "The lattice is growing faster than you can run, and the Wraiths are close behind on the carrier. Then the tender band clicks.\n\n\"Adair here. Side carriers go everywhere if you know them, and I know them.\" The Second Helping comes out of a side carrier with every lamp it owns lit, loud as a storm.\n\nWhatever happened between you in the Reach, Moss does not mention it. \"The Seal chases warm routes, right. We're very warm. Somebody's got to be the storm for a bit.\"",
    choices: [
      {
        text: "Let him draw them off.",
        outcomes: [
          { outcome: { text: "\"One thing.\" Moss reads a message into your set to carry into the queue, fast, before he can change his mind. Then the Second Helping goes roaring off down a side carrier, lamps blazing, and the lattice turns to follow it.", seal: 3, flags: ["moss-decoy"], fragment: "f3-uncle" } },
        ],
      },
      {
        text: "Tell him to go home.",
        outcomes: [
          { outcome: { text: "\"Home's behind the Seal, lamper.\" But he goes, after he has stamped your card twice and read you a message for the queue, fast, before he can change his mind.", resources: { ttl: 2 }, fragment: "f3-uncle" } },
        ],
      },
    ],
  },

  // ─── 5. Pell's letter ────────────────────────────────────────────────────────────────────────────────────
  {
    id: "chain-pell-letter", pool: "event", stages: [3], weight: 3, unique: true,
    requires: { flag: "pell-letter" },
    title: "The Intake Slot", art: "ember-archive",
    text: "In the outer gallery there is a brass slot in the wall with a lamp over it: the archive's intake. It still accepts traffic addressed anywhere. It still stamps it HELD.\n\nPell's letter is in the galley drawer, on the back of an invoice, folded in four, addressed to A. Varga, wherever you landed.",
    choices: [
      {
        text: "Post it.",
        outcomes: [
          { outcome: { text: "The slot takes it with a small brass noise. ACCEPTED. HELD. Somewhere in the queue, Pell's letter goes and sits with everything else and waits for a safe route. It is the first time in thirty-one years anything of Pell's has waited for anything.", flags: ["pell-letter-posted"], fragment: "f3-pell-letter" } },
        ],
      },
      {
        text: "Read it first. She never said not to.",
        outcomes: [
          { outcome: { text: "It is four lines long. One of them is an invoice. {crew} folds it again along the same creases, a little ashamed of themselves, and posts it. ACCEPTED. HELD.", flags: ["pell-letter-posted"], fragment: "f3-pell-letter" } },
        ],
      },
    ],
  },
];
