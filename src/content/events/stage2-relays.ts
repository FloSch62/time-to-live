// Stage II · The Glass Cathedral — relays: combat intros, hazards, benches, markets, empty relays, sealed relays and
// the exit (the Hollow Choir). Pure data (writing workstream).
import type { EventDef } from "../../game/types.ts";

export const STAGE2_RELAYS_FLAGS: Record<string, string> = {
  "s2-marit-met": "Met Marit Seldon at the Choir Bench; she has heard the car and knows its hum.",
};

export const STAGE2_RELAYS: EventDef[] = [
  // ─── Combat · Prism Widow ────────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-combat-widow-web", pool: "combat", stages: [2], weight: 2,
    title: "A Web Across the Carrier", art: "glass-bells",
    text: "The carrier ahead is strung with light. Threads of violet glass run from pane to pane across the span, so fine they only show when the lamp touches them, and in the middle of the web something with a great many legs is working very carefully.\n\nA Prism Widow. It is protecting the carrier's signal by making sure nothing can reach it. The tender is about to reach it.\n\nThe first thread chimes against the trolley grip.",
    choices: [
      {
        text: "Cut through and end its task.",
        outcomes: [{ outcome: {
          text: "The helm keeps the drive running and the crew go to their stations.",
          combat: { enemy: "prism-widow", intro: "Glass threads tighten on the grip. The Widow turns toward the car, very politely." },
        } }],
      },
      {
        text: "Burn the anchor threads with the lance before it turns.",
        blue: true, req: { weapon: "beam" },
        outcomes: [
          { weight: 2, outcome: {
            text: "The lance finds the anchor threads one after another. The web sags off the carrier like a curtain coming down, and the Widow, without any sign of annoyance, walks back to the first pane to begin again. You pick optical thread off the grip for a relay and a half. It counts as good salvage anywhere on the Line.",
            resources: { salvage: [15, 30] },
          } },
          { weight: 1, outcome: {
            text: "One anchor holds. The whole web rings like a struck bell, and the Widow comes down the thread toward the sound.",
            combat: { enemy: "prism-widow", intro: "The web is still ringing when the Widow reaches the grip." },
          } },
        ],
      },
      {
        text: "Listen for the gap in the weave and take the long switch (1 TTL).",
        blue: true, req: { system: { id: "sensors", level: 2 }, resources: { ttl: 1 } },
        outcomes: [{ outcome: {
          text: "Every web has a gap; the Widow leaves one for itself. The Listening Post finds it on the far carrier, which means an extra switch and a relay you did not plan to visit. The web rings behind you, untouched.",
          resources: { ttl: -1 },
        } }],
      },
    ],
  },
  {
    id: "s2-combat-widow-pane", pool: "combat", stages: [2], weight: 2,
    title: "Spider on the Pane", art: "cathedral-nave",
    text: "A cracked pane in the nave wall, big as a lift door, and a Prism Widow on it, spinning new thread across the crack. Its work is beautiful. The crack is almost gone.\n\nThen the tender's lamp crosses the pane and the glass rings, and the Widow stops. A ringing pane still carries signal, and signal must be protected. It turns its many legs toward the car, and the carrier under you begins to sing with thread.\n\nIt tests its work by listening to the glass.",
    choices: [
      {
        text: "End its task.",
        outcomes: [{ outcome: {
          text: "The Widow leaves its pane half mended.",
          combat: { enemy: "prism-widow", intro: "The Widow comes down the web on legs of violet glass." },
        } }],
      },
      {
        text: "{crew:bellmaker} strikes the pane at the note of a sound one.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [
          { weight: 3, outcome: {
            text: "{crew:bellmaker} listens to the pane for a long time, then taps it once with a glass fork. The note is clean: a pane with no crack in it. The Widow hears it, decides the work is finished, and folds its legs. It lets you pass, and leaves a spool of spare thread on the carrier, as if clearing up after itself.",
            resources: { spares: [1, 2] },
          } },
          { weight: 1, outcome: {
            text: "{crew:bellmaker} strikes it a hair sharp. The Widow hears a flaw and goes looking for it, and the flaw it finds is you.",
            combat: { enemy: "prism-widow", intro: "The Widow has found the flaw. It is very thorough about flaws." },
          } },
        ],
      },
      {
        text: "Run the carrier at full drive and tear through the thread. It will scar the plating.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The car hits the web at speed. Thread shatters across the roof in a violet spray and scores the plating from cupola to coupler. The Widow does not follow. It has a pane to finish.",
            resources: { hull: [-4, -2] },
          } },
          { weight: 1, outcome: {
            text: "The thread holds for one second too long.",
            combat: { enemy: "prism-widow", intro: "The Widow reaches the grip before the car breaks free." },
          } },
        ],
      },
    ],
  },
  {
    id: "s2-combat-widow-lamp", pool: "combat", stages: [2],
    title: "A Lamp in a Web", art: "relay-switchyard",
    text: "The relay ahead is lit. Not on its trickle: properly lit, the switch house warm, the guide lamp at full strength, the first working relay you have seen in the Cathedral.\n\nIt is also inside a web. A Prism Widow has wrapped the whole switchyard in isolation thread, layer on perfect layer, to keep its signal safe. The relay can hear the tender's hello. It cannot get an answer out through the glass.\n\nNo answer, no switch.",
    choices: [
      {
        text: "Cut the relay free.",
        outcomes: [{ outcome: {
          text: "The crew take their stations. The Widow is already on the switch house roof.",
          combat: { enemy: "prism-widow", intro: "The Widow rises from the switch house roof, trailing light.", onWin: "s2-widow-lamp-freed" },
        } }],
      },
      {
        text: "Jam the Widow while the helm keeps saying hello.",
        blue: true, req: { weapon: "ion" },
        outcomes: [
          { weight: 2, outcome: {
            text: "The jammer floods the Widow's inputs with noise. It stops weaving and stands very still, listening to nothing, while the helm says hello through the gap in its last layer. I hear you, says the relay, faintly, and takes the car into its yard; and the relay, which has not vouched for anyone in years, stamps you an extra hop for the trouble.",
            resources: { ttl: 1 },
          } },
          { weight: 1, outcome: {
            text: "The Widow shrugs the noise off and weaves faster.",
            combat: { enemy: "prism-widow", intro: "The Widow comes off the switch house to find the source of the noise.", onWin: "s2-widow-lamp-freed" },
          } },
        ],
      },
      {
        text: "Go round by another carrier (1 TTL).",
        req: { resources: { ttl: 1 } },
        outcomes: [{ outcome: {
          text: "You back off the web and come into the yard the long way round, by a side carrier that costs a hop. The lit switch house goes on hearing hellos it cannot answer.",
          resources: { ttl: -1 },
        } }],
      },
    ],
  },
  {
    id: "s2-widow-lamp-freed", pool: "scripted", stages: [2],
    title: "Still Here", art: "relay-switchyard",
    text: "The last of the web comes away from the switch house in long violet sheets, and the relay's lamp floods the yard.\n\nFor a moment nothing happens. Then, down every carrier that meets here, the relay sends a small signal on a schedule, the same two words every few seconds, to relays that have not heard from it in years. Still here. Still here. Still here.\n\nIt says hello to you before you can say it to it.",
    choices: [
      {
        text: "Answer it properly.",
        outcomes: [{ outcome: {
          text: "The helm answers. I hear you. I hear you hear me. The relay, which has had nobody to vouch for in thirty-one years, re-stamps the connection twice before it lets you go.",
          resources: { ttl: 2 }, codex: "runbook-keepalive",
        } }],
      },
      {
        text: "Strip the web for glass thread.",
        outcomes: [{ outcome: {
          text: "Optical thread is worth more than copper at the Exchange, and the Widow spun it well. The relay keeps sending still here while you work, which is its business.",
          reward: "med", codex: "runbook-keepalive",
        } }],
      },
    ],
  },

  // ─── Combat · Glass Echo ─────────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-combat-echo-order", pool: "combat", stages: [2], weight: 2,
    title: "A Bell on Rotors", art: "glass-bells",
    text: "Something small circles the car twice, rotors whining, a bell the size of a kettle slung beneath it. A Glass Echo. It carried a bell's note to the far naves once. Now it carries the last order it heard.\n\nALL SHIFTS TO THE LIFTS. ALL SHIFTS TO THE LIFTS. ALL SHIFTS TO THE\n\nIt never finishes the sentence. Every time it starts again it is a little louder, and there is a hairline crack running up its bell.",
    choices: [
      {
        text: "Stop it.",
        outcomes: [{ outcome: {
          text: "The crew go to their stations. The Echo is still ringing.",
          combat: { enemy: "glass-echo", intro: "The Echo drops to the cab window and rings straight at it." },
        } }],
      },
      {
        text: "Find the end of its order and finish the sentence for it.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          { weight: 2, outcome: {
            text: "The Listening Post pulls the order out of the old announcement band. The helm keys the horn and says the last word. LIFTS. The Echo hangs in the air for a long moment. Then it settles onto a bell frame, rotors winding down, and does not ring again. Its spare lenses fall off the frame into the salvage net.",
            resources: { spares: [1, 2] },
          } },
          { weight: 1, outcome: {
            text: "The word is right and the timing is wrong. The Echo hears it as an interruption.",
            combat: { enemy: "glass-echo", intro: "Interrupted, the Echo rings louder." },
          } },
        ],
      },
      {
        text: "Close the hatches and ride on. It may follow.",
        outcomes: [
          { weight: 1, outcome: {
            text: "It follows for a span, ringing, and then frost gets into its rotors and it turns back to the naves to find someone who will listen.",
          } },
          { weight: 1, outcome: {
            text: "It follows. It is faster than a cable car, and it has decided you did not hear.",
            combat: { enemy: "glass-echo", intro: "ALL SHIFTS TO THE LIFTS. The Echo is not going to stop saying it." },
          } },
        ],
      },
    ],
  },
  {
    id: "s2-combat-echo-hour", pool: "combat", stages: [2],
    title: "The Hour Bell", art: "cathedral-nave",
    text: "Once an hour the Heart sent a pulse around the Line, and the Cathedral rang one bell to match. The pulse stopped thirty-one years ago.\n\nNobody told this Glass Echo. It hangs off the nave on its rotors and rings the hour, exactly on the hour, every hour. When the tender's lamp crosses its bell it rings early, for the first time in thirty-one years, and it does not seem to know what to do about that.\n\nIt comes closer to find out.",
    choices: [
      {
        text: "End its task.",
        outcomes: [{ outcome: {
          text: "It rings again, off the hour, and it is not happy about it.",
          combat: { enemy: "glass-echo", intro: "The Echo rings a third time, out of time and out of patience." },
        } }],
      },
      {
        text: "Fill the air with rivets. It cannot dodge all of them.",
        blue: true, req: { weapon: "flak" },
        outcomes: [
          { weight: 3, outcome: {
            text: "It dodges most of them. Rivet scatter does not need most. Its bell cracks through on the second pass and it settles onto the nave roof, rotors ticking down. The hour, when it comes, goes unrung. You salvage what fell.",
            reward: "low",
          } },
          { weight: 1, outcome: {
            text: "It dodges all of them. Some drones are simply better at this than rivets.",
            combat: { enemy: "glass-echo", intro: "Not one rivet touched it. It rings, smugly." },
          } },
        ],
      },
      {
        text: "Wait for the hour, and let it ring (the Seal advances).",
        outcomes: [{ outcome: {
          text: "You hold at the relay until the hour. The Echo rings it, precisely, and goes back to its place on the nave, satisfied that the Line still keeps time. {crew} sets the galley clock by it. The Seal, which does not care what time it is, gains on you.",
          seal: -1, codex: "world-heartbeat",
        } }],
      },
    ],
  },
  {
    id: "s2-combat-echo-frame", pool: "combat", stages: [2],
    title: "An Empty Frame", art: "glass-bells",
    text: "Under the ring hangs a bell frame with no bell in it. The chains are there, the clapper hook, the brass plate with a name worn off it. The bell is gone.\n\nA Glass Echo circles the empty frame on its rotors, around and around, ringing the note that should have come from the bell that is not there. It has been doing it long enough to wear a groove in the frost.\n\nWhen the tender passes under the frame, the Echo stops circling and looks at your lamp as though it might be the missing bell.",
    choices: [
      {
        text: "End its task.",
        outcomes: [{ outcome: {
          text: "It decides you are not the bell, and that this is your fault.",
          combat: { enemy: "glass-echo", intro: "The Echo leaves its frame for the first time in years, to deal with you." },
        } }],
      },
      {
        text: "{crew:bellmaker} rings the empty frame with a fork.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [
          { weight: 3, outcome: {
            text: "{crew:bellmaker} climbs to the roof hatch, leans out into the thin cold air and strikes the frame's clapper hook with a glass fork. It gives the missing bell's note, near enough. The Echo lands in the frame where the bell should be, folds its rotors, and hangs there quietly. It has a bell to be now. The crew are quieter too, for a while, in a good way.",
            heal: true,
          } },
          { weight: 1, outcome: {
            text: "The note is close. Close is not the same. The Echo rings the right one back at you, louder.",
            combat: { enemy: "glass-echo", intro: "The Echo corrects the note, at length, at the cab window." },
          } },
        ],
      },
      {
        text: "Go lamp-dark and let it lose you.",
        blue: true, req: { system: { id: "veil", level: 1 } },
        outcomes: [
          { weight: 3, outcome: {
            text: "Every lamp aboard goes out. In the dark the Echo circles the place the car was, then the frame, then the car again, and loses count. By the time it remembers the frame you are two spans on.",
          } },
          { weight: 1, outcome: {
            text: "It hears the trolley. Echoes are good at hearing.",
            combat: { enemy: "glass-echo", intro: "Lamp-dark does not help against something that listens." },
          } },
        ],
      },
    ],
  },

  // ─── Combat · Wire Weaver ────────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-combat-weaver-tension", pool: "combat", stages: [2], weight: 2,
    title: "Tension", art: "glass-bells",
    text: "The carrier ahead is humming, and not the good hum. A Wire Weaver has clamped on at the next bell frame and is rewiring it, many arms moving at once, adding tension to every line it can reach. The frame creaks. The bell swings.\n\nThe carrier under the tender, which it has also decided to repair, is pulled tight as a string, and strands are starting to pop off it.\n\nIt cannot tell a repair from a snare. At this rate it will finish repairing the carrier right in half.",
    choices: [
      {
        text: "End its task before it finishes.",
        outcomes: [{ outcome: {
          text: "The crew take their stations while the carrier sings.",
          combat: { enemy: "wire-weaver", intro: "The Weaver turns three arms toward the car and keeps working with the rest." },
        } }],
      },
      {
        text: "Send {crew:rigger} out along the grip to cut its ends.",
        blue: true, req: { species: "rigger" },
        outcomes: [
          { weight: 2, outcome: {
            text: "{crew:rigger} goes out on the roof in the thin cold air, clamps onto the grip arm and cuts the Weaver's ends one by one, carefully, like someone undoing a knot they respect. The lines slacken. The Weaver notices its repair has come undone and starts it again, somewhere else. {crew:rigger} comes back in with a coil of good wire.",
            resources: { spares: [1, 2] },
          } },
          { weight: 1, outcome: {
            text: "{crew:rigger} gets two ends cut before the Weaver notices. It notices with an arm, and the crew have to haul everyone back in through the hatch.",
            crewDamage: { amount: 20, who: "one" },
            combat: { enemy: "wire-weaver", intro: "The Weaver has noticed. All of its arms have noticed." },
          } },
        ],
      },
      {
        text: "Back off and take the long switch (1 TTL).",
        req: { resources: { ttl: 1 } },
        outcomes: [{ outcome: {
          text: "The helm reverses the drive, backs the car off the tight carrier and says hello to the relay again, which brings the car into its yard the long way round, by a side carrier. Behind you the carrier parts with a sound like a harp dropped down stairs.",
          resources: { ttl: -1 },
        } }],
      },
    ],
  },
  {
    id: "s2-combat-weaver-loom", pool: "combat", stages: [2],
    title: "Holding the Ends", art: "cathedral-nave",
    text: "A Wire Weaver is restringing a nave wall, and it has help. Small drones on rotors hang at the end of each line it pulls, holding the ends in place while it adds tension, so that the whole wall is a loom and the Weaver is the only one who knows the pattern.\n\nThe tender's carrier runs straight through the loom. Two of the drones have already turned to hold it.\n\nIt is, by its own lights, fixing you.",
    choices: [
      {
        text: "End its task.",
        outcomes: [{ outcome: {
          text: "The loom tightens around the carrier.",
          combat: { enemy: "wire-weaver", intro: "Every drone on the loom pulls at once. The Weaver adds a little more tension." },
        } }],
      },
      {
        text: "Launch the Bulwark Drone at its end-holders.",
        blue: true, req: { drone: "bulwark-drone" },
        outcomes: [
          { weight: 2, outcome: {
            text: "The Bulwark Drone goes out and does what it was built for, which is deciding other drones are wreckage. Three end-holders drop. The loom goes slack, the pattern falls apart, and the Weaver climbs away up the wall to begin again from the top. You collect the fallen drones' lenses.",
            resources: { spares: [2, 3] },
          } },
          { weight: 1, outcome: {
            text: "Two end-holders drop. The Weaver sends four more.",
            combat: { enemy: "wire-weaver", intro: "The Weaver has more drones than you have patience." },
          } },
        ],
      },
      {
        text: "Let it finish repairing you.",
        outcomes: [
          { weight: 1, outcome: {
            text: "It does a very thorough job. By the time it lets go, the car is wrapped in fine wire from the grip to the keel, and two of the hatches will not open. It leaves a spool of wire behind, like a receipt.",
            systemDamage: { system: "doors", amount: 1 }, resources: { spares: [1, 2] },
          } },
          { weight: 1, outcome: {
            text: "It gets as far as the grip arm and decides the grip is the fault.",
            combat: { enemy: "wire-weaver", intro: "The Weaver begins repairing the grip off the carrier." },
          } },
        ],
      },
    ],
  },

  // ─── Combat · Glass Choir ────────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-combat-choir-quorum", pool: "combat", stages: [2], weight: 2,
    title: "No Quorum", art: "glass-bells",
    text: "Three bells hang on one frame over the switchyard, and all three are ringing.\n\nHOLD, says the first. RELEASE, says the second. HOLD, says the third, a quarter second late, as though it is not sure. Each rings a different fragment of the same evacuation order, and they have been arguing about it since the night it was given.\n\nThe switch under them rocks back and forth with every vote. It will not throw for anyone until the Glass Choir agrees on something.",
    choices: [
      {
        text: "Silence all three.",
        outcomes: [{ outcome: {
          text: "The crew take their stations.",
          combat: { enemy: "glass-choir", intro: "Three glass faces turn toward the car at once, and for once they agree.", onWin: "s2-choir-silence" },
        } }],
      },
      {
        text: "{crew:bellmaker} gives them a quorum.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [
          { weight: 2, outcome: {
            text: "{crew:bellmaker} opens the cab window and sings one clear note under the three bells, the note all three were cast to share. They falter. They listen. Then, for the first time in thirty-one years, all three ring the same word, and the word is silence. In the quiet, one line of the old order comes loose from the glass.",
            fragment: "f2-announcement",
          } },
          { weight: 1, outcome: {
            text: "Two of them agree. The third does not care for the vote.",
            combat: { enemy: "glass-choir", intro: "The third bell calls a new vote. The motion is you.", onWin: "s2-choir-silence" },
          } },
        ],
      },
      {
        text: "Jam two bells and let the third win.",
        blue: true, req: { weapon: "ion" },
        outcomes: [
          { weight: 2, outcome: {
            text: "The jammer drowns the two bells that say hold. The third rings RELEASE into the quiet, alone and certain, and the switch, which has only ever wanted to be told, throws.",
          } },
          { weight: 1, outcome: {
            text: "The jammer drowns the wrong two.",
            combat: { enemy: "glass-choir", intro: "HOLD, rings the bell you left. The other two agree with it, loudly.", onWin: "s2-choir-silence" },
          } },
        ],
      },
    ],
  },
  {
    id: "s2-choir-silence", pool: "scripted", stages: [2],
    title: "Agreed on Silence", art: "glass-bells",
    text: "The three bells hang still on their frame. For a moment they agree on silence, and the silence is enormous: you had stopped hearing the ringing, and now you hear its absence all through the car.\n\nThe switch settles. In the frost on the middle bell, where the clapper struck for thirty-one years, the order they were arguing about is still legible, pressed into the glass.",
    choices: [
      {
        text: "Read what is left in the glass.",
        outcomes: [{ outcome: {
          text: "It is the whole order, the one all three of them started from, before they took it apart between them. There is a bellmaker's tool roll tucked behind the frame, too.",
          fragment: "f2-announcement", reward: "low",
        } }],
      },
      {
        text: "Take the clappers for the Exchange.",
        outcomes: [{ outcome: {
          text: "Glass clappers, tuned four hundred years ago. The bellmakers will want them, and they will pay.",
          reward: "med",
        } }],
      },
    ],
  },
  {
    id: "s2-combat-choir-hellos", pool: "combat", stages: [2],
    title: "Three Hellos", art: "cathedral-nave",
    text: "The helm says hello to the relay, and three bells hung over the carrier answer instead.\n\nHOLD. — RELEASE. — HOLD.\n\nIt is a Glass Choir, and it has taken the relay's greeting as a question put to the vote. Each bell has answered differently. The relay is still waiting for its own turn to speak, very politely, under all that glass.\n\n{crew} suggests saying hello three times, once to each bell. Nobody can think of a reason why not, which is not the same as a reason why.",
    choices: [
      {
        text: "Silence the bells.",
        outcomes: [{ outcome: {
          text: "The crew go to their stations.",
          combat: { enemy: "glass-choir", intro: "HOLD. — RELEASE. — HOLD. The Choir has moved on to other business: you." },
        } }],
      },
      {
        text: "Say hello three times (2 TTL).",
        req: { resources: { ttl: 2 } },
        outcomes: [
          { weight: 1, outcome: {
            text: "Hello, to the first bell. Hello, to the second. Hello, to the third. Three bells and then the relay all say I hear you at once, and the relay's switch log takes the greeting three times before it settles. Each entry counts as a switch. The connection pays for them.",
            resources: { ttl: -2 },
          } },
          { weight: 1, outcome: {
            text: "By the third hello they have stopped disagreeing about the relay and started agreeing about you.",
            combat: { enemy: "glass-choir", intro: "For once the Choir has a quorum. Unfortunately." },
          } },
        ],
      },
      {
        text: "Wait until they tire of the vote (the Seal advances).",
        outcomes: [{ outcome: {
          text: "They do not tire. After an hour the relay gives up waiting for them and takes the car into its yard anyway, out of what might be embarrassment. The Listening Post spent the hour recording the whole order the bells were arguing over. The Seal used the hour well.",
          seal: -1, fragment: "f2-announcement",
        } }],
      },
    ],
  },

  // ─── Combat · Coil Serpent ───────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-combat-serpent-coil", pool: "combat", stages: [2], weight: 2,
    title: "Recovering Carrier", art: "relay-switchyard",
    text: "The carrier ahead is thicker than it should be. Then it moves.\n\nA Coil Serpent has wound itself round the span in long segmented loops, recovering cable. It was built to wind up dead carrier for reuse. This carrier is not dead, and the Serpent has noticed, and it is tightening around the signal in its core the way it tightens around everything that still carries one.\n\nThe tender is on the same carrier. The nearest coil is two car lengths off, and closing.",
    choices: [
      {
        text: "End its task.",
        outcomes: [{ outcome: {
          text: "The crew take their stations. The carrier creaks under the coils.",
          combat: { enemy: "coil-serpent", intro: "The coils tighten on the carrier and start to walk toward the grip." },
        } }],
      },
      {
        text: "Jam the carrier's core so there is no signal to tighten on.",
        blue: true, req: { weapon: "ion" },
        outcomes: [
          { weight: 2, outcome: {
            text: "The jammer floods the carrier's core with noise. To the Serpent the span goes dead, cable like any other, and it relaxes into the slow patient work of winding it up. You are past its head before it gets to the part with a tender on it.",
          } },
          { weight: 1, outcome: {
            text: "The noise is a signal too, to something that listens hard enough.",
            combat: { enemy: "coil-serpent", intro: "The Serpent tightens on the noise, and then on the car making it." },
          } },
        ],
      },
      {
        text: "Run the drive flat out through the loops. It will cost plating.",
        blue: true, req: { system: { id: "engines", level: 3 } },
        outcomes: [
          { weight: 2, outcome: {
            text: "The drive howls. The car takes the coils at a run, grip arms clattering over each segment, and comes out the other side scraped raw along the roof.",
            resources: { hull: [-3, -2] },
          } },
          { weight: 1, outcome: {
            text: "The last loop closes on the grip.",
            combat: { enemy: "coil-serpent", intro: "The Serpent has the grip. It is recovering it." },
          } },
        ],
      },
    ],
  },
  {
    id: "s2-combat-serpent-one-route", pool: "combat", stages: [2],
    title: "One Route", art: "cathedral-nave",
    text: "The Coil Serpent has been following the tender for two relays. It does not hurry. It follows a single route all the way to its end, and the route it is following is yours.\n\nThe cable crews had a saying, which {crew} repeats now without enthusiasm: one route is a perfect snare; two routes are a way out.\n\nThe next relay has a parallel carrier. It also has the Serpent's head, rising out of the fog on the carrier you are on.",
    choices: [
      {
        text: "Turn and end its task.",
        outcomes: [{ outcome: {
          text: "The helm brakes. The Serpent keeps coming.",
          combat: { enemy: "coil-serpent", intro: "It stops following and starts tightening." },
        } }],
      },
      {
        text: "Give it two routes: switch to the parallel carrier (1 TTL).",
        req: { resources: { ttl: 1 } },
        outcomes: [
          { weight: 3, outcome: {
            text: "The helm says hello and the relay brings the car in by the parallel carrier. The Serpent, following its one route to the end, winds on down the old one without you. Two routes. A way out.",
            resources: { ttl: -1 },
          } },
          { weight: 1, outcome: {
            text: "The relay brings the car in by the parallel carrier. The Serpent, it turns out, can count to two.",
            resources: { ttl: -1 },
            combat: { enemy: "coil-serpent", intro: "The Serpent crosses to the parallel carrier after you." },
          } },
        ],
      },
      {
        text: "{crew:courier} takes the helm and brakes hard at the switch.",
        blue: true, req: { species: "courier" },
        outcomes: [
          { weight: 2, outcome: {
            text: "{crew:courier} brings the car into the switchyard so fast and stops it so hard that the Serpent overruns, its head sliding past on the carrier and into the relay's frame, where it tangles. By the time it has untangled itself you are gone.",
          } },
          { weight: 1, outcome: {
            text: "{crew:courier} brakes hard. The Serpent brakes harder.",
            combat: { enemy: "coil-serpent", intro: "The Serpent coils around the switchyard itself." },
          } },
        ],
      },
    ],
  },

  // ─── Combat · Echo Tender ────────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-combat-echo-tender-carrier", pool: "combat", stages: [2],
    title: "Obstruction on My Carrier", art: "echo-tender-lit",
    text: "A lamp is coming down the carrier toward you, steady, patient, at the speed of a lamper on a round.\n\nIt is a tender. Same pattern as yours: brass and ivory, the cupola lit, the grip arms worn bright. Nobody at the cab window. Its connection expired long ago and no relay will switch it, so it rides this one carrier back and forth between the same two lamps, relighting them.\n\nThe radio clicks. TENDER ON ROUND. CREW ABOARD: 0. LAMP: LIT. OBSTRUCTION ON MY CARRIER. PLEASE CLEAR.\n\nYou are the obstruction.",
    choices: [
      {
        text: "End its round.",
        outcomes: [{ outcome: {
          text: "Nobody aboard likes it. The crew go to their stations anyway.",
          combat: { enemy: "echo-tender", intro: "Its grip arms come up, the way a lamper clears wreckage off a cable.", onWin: "s2-echo-round-ended" },
        } }],
      },
      {
        text: "Back off to the relay and let its round pass (the Seal advances).",
        outcomes: [{ outcome: {
          text: "You back the car into the switchyard and wait while the echo tender rides by, relights the relay's guide lamp, checks it, and turns back the way it came. It is very thorough, and as it passes, its maintenance arms go once over your plating out of habit. It takes a long time. The Seal is not thorough; it only has to be persistent.",
          seal: -1, repair: 2,
        } }],
      },
      {
        text: "{crew:rigger} speaks to its autopilot in the old way.",
        blue: true, req: { species: "rigger" },
        outcomes: [
          { weight: 2, outcome: {
            text: "{crew:rigger} puts the radio to its speaker grille and says something in the old maintenance band that no one else aboard understands. The echo tender's lamp dips. It moves onto the relay's siding, the first time it has left its carrier in years, and holds there until you are through. As you pass, its maintenance arms go once over your plating, the way they would for any tender on the round, and patch what they find. It relights your cupola too, which did not need it, out of habit.",
            repair: 3,
          } },
          { weight: 1, outcome: {
            text: "The autopilot listens and decides that a rigger aboard another tender is a fault in that tender.",
            combat: { enemy: "echo-tender", intro: "The echo tender comes on to clear the fault.", onWin: "s2-echo-round-ended" },
          } },
        ],
      },
    ],
  },
  {
    id: "s2-echo-round-ended", pool: "scripted", stages: [2],
    title: "Brake Set", art: "echo-tender-lit",
    text: "ROUND COMPLETE. AUTOPILOT RELEASED. BRAKE SET.\n\nThe echo tender hangs still on its carrier under the guide lamp it was relighting. Its cupola is still lit. Through the cab window you can see a mug on the helm console and a coat on a hook by the hatch.\n\nThe lampers had a rule about a tender whose crew were gone: leave the lamp lit, or put it out yourself; don't let the dark do it.",
    choices: [
      {
        text: "Leave the lamp lit. Take only the stamp card from the helm.",
        outcomes: [{ outcome: {
          text: "The card in the helm slot still has hops on it that nobody spent. The next relay honours it. You leave the lamp burning over the carrier, and the mug where it is.",
          resources: { ttl: 2 },
        } }],
      },
      {
        text: "Put the lamp out yourselves, and take what the crew left.",
        outcomes: [{ outcome: {
          text: "{crew} goes aboard, turns the cupola down until it is dark, and stands there a moment. Then the hold, which is full of the things a keeper's crew packs for a long trip and never gets to use.",
          reward: "med",
        } }],
      },
      {
        text: "Uncouple its rear car. The drone racks inside are still lit.",
        outcomes: [{ outcome: {
          text: "Behind the echo tender hangs a short drone car, its racks lit, its drones asleep in rows, waiting for a crew that will not come. The coupling is stiff but it gives. You leave the tender its lamp, and take the car it will not need on a round one carrier long.",
          car: "drone-car",
        } }],
      },
    ],
  },
  {
    id: "s2-combat-echo-tender-relight", pool: "combat", stages: [2], weight: 0.5,
    title: "A Lamp That Needs Work", art: "echo-tender-lit",
    text: "An echo tender is working the guide lamp at this relay: nobody aboard, its round one carrier long, its cupola trained on the relay's lamp, topping it up.\n\nThen it sees yours.\n\nThe cupola swings round. To an autopilot that has spent years relighting lamps, the tender's own lamp looks like one that is fading, and it rides toward you at a lamper's careful pace to fix it. The grip arms come up, the way they do for a lamp that needs work.",
    choices: [
      {
        text: "Let it relight you.",
        outcomes: [
          { weight: 2, outcome: {
            text: "It trains its cupola on yours and pours light into it until the whole car glows brass. It is ridiculous and it is lovely, and when it is finished its maintenance arms go once over your plating, out of habit, patching as they go. Then it backs off, satisfied, and goes back to its round.",
            repair: 2,
          } },
          { weight: 1, outcome: {
            text: "It looks closer and decides the fault is not the lamp but the car around it.",
            combat: { enemy: "echo-tender", intro: "The echo tender comes on, grip arms raised, to clear a fault that is you." },
          } },
        ],
      },
      {
        text: "End its round.",
        outcomes: [{ outcome: {
          text: "The crew take their stations. Its lamp is still pointed at yours.",
          combat: { enemy: "echo-tender", intro: "The echo tender comes on, grip arms raised, to clear a fault that is you." },
        } }],
      },
      {
        text: "Douse the cupola and ride on.",
        outcomes: [{ outcome: {
          text: "With your lamp dark it loses interest at once and goes back to the relay's lamp, which is fading, as they all are, and which it will relight again tomorrow.",
        } }],
      },
    ],
  },

  // ─── Hazards ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-hazard-glass-fog-halos", pool: "hazard", hazard: "glass-fog", stages: [2],
    title: "Glass Fog", art: "glass-fog",
    text: "The fog comes off the Cathedral's flank like breath on a cold morning and hangs under the ring, thick and violet and glittering with ice-glass. The carriers frost over. Every lamp is a halo. The Listening Post hears only the fog ringing, very faintly, as the trolley runs through it.\n\nNothing can see anything in here. That goes for the machines, and for the Seal.\n\nSomewhere ahead, on the same carrier, something heavy shifts its weight.",
    choices: [
      {
        text: "Ride slow and meet whatever it is.",
        outcomes: [
          { weight: 2, outcome: {
            text: "A bell frame, fallen onto the carrier, with a bellmaker's tool chest still lashed to it. Heavy things shift in fog. You take the tools.",
            reward: "low",
          } },
          { weight: 1, outcome: {
            text: "It is a Coil Serpent, and it has been waiting for something warm to come down its carrier.",
            combat: { enemy: "coil-serpent", intro: "A coil rises out of the fog, frosted white." },
          } },
        ],
      },
      {
        text: "Douse the lamp and sit in the fog a while.",
        outcomes: [{ outcome: {
          text: "Lamp-dark in glass fog, the car is only a cold shape among cold shapes. The quarantine's lattice, feeling for a warm route, finds nothing warm, and falls back a relay to think about it.",
          seal: 1,
        } }],
      },
    ],
  },
  {
    id: "s2-hazard-glass-fog-name", pool: "hazard", hazard: "glass-fog", stages: [2],
    title: "A Name in the Fog", art: "glass-fog",
    text: "Halfway down the span, the fog says {crew}'s name.\n\nIt says it clearly, in a voice nobody aboard knows, and then it says it again from somewhere else. The glass fog carries sound the way the panes carry light: it holds it, and rings it, and lets it go wherever it likes. Somewhere in this fog a voice from thirty-one years ago is calling someone who had the same name.\n\n{crew} is at the window.",
    choices: [
      {
        text: "Answer it.",
        outcomes: [
          { weight: 2, outcome: {
            text: "{crew} says, I hear you. The fog says the name once more, softer, and then says nothing at all. Whoever it was calling has been answered by someone. {crew} sits down for a while. Everyone makes tea.",
            heal: true,
          } },
          { weight: 1, outcome: {
            text: "The voice was a Glass Echo on its rotors, calling the last name it heard, and an answer is a thing it can follow.",
            combat: { enemy: "glass-echo", intro: "Rotors in the fog. The Echo says the name again, much closer." },
          } },
        ],
      },
      {
        text: "Shut the windows and ride on.",
        outcomes: [{ outcome: {
          text: "The voice follows the car for a span, saying the name, and then the fog thins and it stays behind, where voices stay.",
        } }],
      },
    ],
  },
  {
    id: "s2-hazard-ringing-panes-pulse", pool: "hazard", hazard: "ringing-panes", stages: [2],
    title: "Ringing Panes", art: "ringing-panes",
    text: "Here the carrier runs close along a wall of Cathedral glass, and the wall is ringing.\n\nYou can see it: standing waves in the panes, frost shaking loose in bursts, sparks of ion light jumping between the iron frames. Every few seconds the whole wall pulses, and the pulse gets into anything with wiring. The tender's lights flicker in time with it.\n\nThere is a machine somewhere down the wall ringing with it. There usually is.",
    choices: [
      {
        text: "Ride through before the next big pulse.",
        outcomes: [
          { weight: 2, outcome: {
            text: "You are halfway through when the big one comes. The car's lights go violet, then out, then on. Something aboard will need looking at.",
            systemDamage: { system: "random", amount: 1 },
          } },
          { weight: 1, outcome: {
            text: "You make it. The pulse arrives behind you and rings the empty carrier instead.",
          } },
        ],
      },
      {
        text: "{crew:bellmaker} tunes the car's hum against the panes.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [{ outcome: {
          text: "{crew:bellmaker} listens to the wall with one hand flat on the plating, then has you run the drive at a speed that sounds wrong to everyone but a bellmaker. The pulses slide off the car as if it were not there. And in the ringing, very faint, the Listening Post catches something that came up from the Ground a long time ago and got stuck in the glass.",
          fragment: "f2-heard-bell",
        } }],
      },
      {
        text: "Wait at the relay for the wall to settle (the Seal advances).",
        outcomes: [{ outcome: {
          text: "It settles eventually. Glass always does. The crew spend the wait re-seating plating the ringing shook loose. The Seal does not wait.",
          seal: -1, repair: 2,
        } }],
      },
    ],
  },
  {
    id: "s2-hazard-ringing-panes-widow", pool: "hazard", hazard: "ringing-panes", stages: [2],
    title: "The Widow in the Wall", art: "ringing-panes",
    text: "The ringing wall has a Prism Widow on it, repairing panes as fast as the pulses crack them. It has been doing this for a very long time, and it has never once caught up.\n\nEvery pulse makes its web flare violet. Every pulse also jams everything nearby, the Widow included, which is the most encouraging thing anyone has noticed all day.\n\nIts web crosses your carrier twice.",
    choices: [
      {
        text: "Fight it here, where the pulses hit it too.",
        outcomes: [{ outcome: {
          text: "The wall pulses. The crew brace, and go to their stations.",
          combat: { enemy: "prism-widow", intro: "The wall pulses. The Widow shudders, and comes down anyway." },
        } }],
      },
      {
        text: "Slip past between pulses.",
        outcomes: [
          { weight: 2, outcome: {
            text: "You time it to the wall. Pulse, run, pulse, run. The Widow, busy with a crack the size of a door, lets the car through its web with no more than a scrape along the plating.",
            resources: { hull: [-2, -1] },
          } },
          { weight: 1, outcome: {
            text: "Pulse, run, pulse. The run was a second too long.",
            combat: { enemy: "prism-widow", intro: "The Widow has the grip in its web before the next pulse." },
          } },
        ],
      },
      {
        text: "Read its weave between pulses and pull the loose thread.",
        blue: true, req: { system: { id: "sensors", level: 3 } },
        outcomes: [{ outcome: {
          text: "At the third level the Listening Post can see the Widow's pattern repeat, and there is one thread it always leaves for last. {crew} leans out of the roof hatch with a long hook pole and pulls it. Half the web comes off the carrier in one long glittering ribbon, and you ride out through the gap with the ribbon in the salvage net.",
          reward: "low",
        } }],
      },
    ],
  },
  {
    id: "s2-hazard-resonance-hum", pool: "hazard", hazard: "resonance", stages: [2],
    title: "Resonance", art: "resonance",
    text: "The whole flank of the Cathedral is humming in tune, and the tender has joined in.\n\nYou feel it in your teeth first, then in the deck plates. Rings of light pulse outward through the glass in time, and the car's plating lights up on the same beat. Every weapon aboard is charging faster, eager, wanting to fire on the beat. {crew} points out that anything else out here will be doing the same.\n\nOn the beat, far down the carrier, three bells ring together.",
    choices: [
      {
        text: "Ride toward the bells and fire on the beat.",
        outcomes: [{ outcome: {
          text: "Everything in the hall wants to fire at once. So do you.",
          combat: { enemy: "glass-choir", intro: "Three bells, one beat. The Glass Choir rings on the resonance." },
        } }],
      },
      {
        text: "Hold fire and let the hum pass.",
        outcomes: [{ outcome: {
          text: "You kill power to the tool mounts and ride through with your hands in your pockets. The hum does not stop until you are three spans past it, and for an hour afterwards the kettle rings when anyone touches it.",
        } }],
      },
      {
        text: "{crew:bellmaker} tunes the greeting to the hum.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [{ outcome: {
          text: "{crew:bellmaker} retunes the helm's transmitter to the Cathedral's hum, so that the car's hello goes out on the same note as the whole flank. Every relay for a long way down the glass hears it and answers, I hear you, all at once. For a moment the Listening Post can hear the whole map.",
          revealMap: true,
        } }],
      },
    ],
  },
  {
    id: "s2-hazard-resonance-bells", pool: "hazard", hazard: "resonance", stages: [2],
    title: "Swinging Bells", art: "glass-bells",
    text: "Resonance has got into the great bells under the ring. They are swinging on their frames, slowly, in time, each one the size of a lift car, and the carrier runs between them.\n\nA bell that size does not stop for anything. The timing looks possible. {crew} does the sum twice and gets two different answers.\n\nBehind you, the Seal is still coming.",
    choices: [
      {
        text: "Time it and ride.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Swing, gap, swing, gap. The car goes through the gaps like a thread through a row of needles, and a bell the size of a house goes past the cab window close enough to see your own lamp in it.",
          } },
          { weight: 1, outcome: {
            text: "Swing, gap, swing. The last bell kisses the keel on its way past. It rings, very beautifully. The car rings too, less beautifully.",
            resources: { hull: [-5, -3] },
          } },
        ],
      },
      {
        text: "{crew:courier} takes the helm and counts the swing.",
        blue: true, req: { species: "courier" },
        outcomes: [{ outcome: {
          text: "{crew:courier} watches three swings, says now, and puts the car through at full drive without looking at anything but the next gap. On the far side a bellmaker's tool box is caught on a frame, and there is time to take it.",
          reward: "low",
        } }],
      },
      {
        text: "Wait at the relay until the resonance fades (the Seal advances).",
        outcomes: [{ outcome: {
          text: "It fades. It takes its time, and half the crew fall asleep to the hum, which nobody minds. So does the Seal, but in the other direction.",
          seal: -1, heal: true,
        } }],
      },
    ],
  },

  // ─── Benches ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-bench-choir-bench", pool: "bench", stages: [2], unique: true, weight: 3,
    requires: { notFlag: "s2-marit-met" },
    title: "The Choir Bench", art: "bellmakers-bench", portrait: "bellmaker", speaker: "Marit Seldon",
    text: "The bench is in a switch house under the north nave, where the glass rings when anyone passes. A woman in a long violet-trimmed coat is waiting in the doorway with tea already poured, because she heard the car coming two relays off.\n\n\"Marit Seldon,\" she says. \"Bellmaker. Sit down. Your drive is sharp on the downhill and your plating rings a little flat, and something in your galley is singing a song I won't repeat.\"\n\nThe tea tastes faintly of glass. Everyone drinks it anyway.",
    choices: [
      {
        text: "Drink the tea and rest.",
        outcomes: [{ outcome: {
          text: "You sit on her benches under the nave while the glass rings over your heads. Nobody talks much. When you leave, everyone is warm for the first time since the Copper Gate.",
          heal: true, repair: 4, flags: ["s2-marit-met"], codex: "people-marit",
        } }],
      },
      {
        text: "Ask her to tune the car.",
        outcomes: [{ outcome: {
          text: "She puts down her cup, takes a glass fork from her coat and walks the length of the car with one hand flat against the plating, listening.",
          flags: ["s2-marit-met"], codex: "people-marit", next: "s2-marit-tuning",
        } }],
      },
      {
        text: "Ask about the pane that rings sad.",
        outcomes: [{ outcome: {
          text: "\"Pane forty,\" she says, after a while. \"Gallery nine. The crew wanted to replace it before the Fault. I told them not to.\" She finds a slip of paper in her coat, very old, folded soft, and puts it on the bench between you, and does not pick it up again.",
          fragment: "f2-pane-forty", heal: true, flags: ["s2-marit-met"], codex: "people-marit",
        } }],
      },
      {
        text: "Ask about the north bell.",
        outcomes: [{ outcome: {
          text: "Marit pours you more tea. She pours herself more tea. She asks whether you have had any trouble with the Widows on the east carriers. That is all anyone gets about the north bell.",
          heal: true, flags: ["s2-marit-met"], codex: "people-marit",
        } }],
      },
    ],
  },
  {
    id: "s2-marit-tuning", pool: "scripted", stages: [2],
    title: "Tuning", art: "bellmakers-bench", portrait: "bellmaker", speaker: "Marit Seldon",
    text: "\"Three things,\" Marit says, coming back to the bench. \"Your plating is flat, so it takes a hit like a cracked bell. Your drive is sharp, so it runs hot and slow through the switches. And your listening post is deaf in one ear. I have time for one before the fog comes in. Or you can have a horn off the wall, if you would rather.\"\n\nShe holds up the glass fork and waits.",
    choices: [
      {
        text: "The plating.",
        outcomes: [{ outcome: {
          text: "She spends an hour walking the car with her ear against the hull and a fork in each hand, and has the crew tighten every rivet she taps. When she is finished the plating hums a clean note and stops rattling where it always rattled.",
          repair: 8,
        } }],
      },
      {
        text: "The drive.",
        outcomes: [{ outcome: {
          text: "She has you run the drive up and down the scale until she is satisfied. It takes the next switches like a courier takes stairs, and the warm route behind you cools faster than the Seal can follow it.",
          seal: 2,
        } }],
      },
      {
        text: "The Listening Post.",
        outcomes: [{ outcome: {
          text: "She puts on the headset and listens to the Cathedral for a long time, turning the dial by hairs. When she hands it back, the Post can hear every relay on this stretch of glass.",
          revealMap: true,
        } }],
      },
      {
        text: "Ask for one of the glass horns on her wall instead.",
        outcomes: [{ outcome: {
          text: "She looks at the horns on her wall, then at you, then takes down the one with the chipped bell. \"Tuned it from a pane that fell in the fog,\" she says. \"It hears relays that aren't talking yet. Fit it in a socket with a good view.\" She wraps it in her scarf.",
          module: "listening-horn-array",
        } }],
      },
    ],
  },
  {
    id: "s2-bench-marit-fork", pool: "bench", stages: [2], unique: true, weight: 2,
    requires: { flag: "s2-marit-met" },
    title: "A Fork on the Bench", art: "relay-bench",
    text: "This bench is empty, but somebody has been here since the last shift: the kettle is warm, the drawer is sorted, and on the bench under the lamp is a glass tuning fork wrapped in a strip of violet cloth.\n\nThe note beside it is in a bellmaker's careful hand.\n\nHeard you go past on the east carrier. Your drive is still sharp on the downhill. Strike this on the trolley housing when it starts to whine. Don't lend it. M.S.",
    choices: [
      {
        text: "Take the fork and use it on the drive.",
        outcomes: [{ outcome: {
          text: "{crew} strikes the fork on the trolley housing. The whine the drive has had since the Copper Gate stops, as if embarrassed. With the car riding quiet, the crew can hear which plates rattle, and spend the rest of the stop riveting them down. The fork goes on a hook in the helm, where it rings very faintly at every switch.",
          repair: 6,
        } }],
      },
      {
        text: "{crew:bellmaker} reads the fork's note and tunes the whole car.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [{ outcome: {
          text: "{crew:bellmaker} holds the fork up to the lamp, strikes it once and laughs. \"She's tuned it to the car. Not the drive. The whole car.\" Twenty minutes later everything aboard hums the same note, the plating has stopped rattling, and even the galley hatch has stopped squealing. The crew sleep better than they have since the docks.",
          repair: 10, heal: true,
        } }],
      },
      {
        text: "Leave the fork for the next crew and take a cup.",
        outcomes: [{ outcome: {
          text: "A useful thing deserves another journey. You take a cup, leave the fork where it lay, and add a note of your own under hers.",
          heal: true,
        } }],
      },
    ],
  },
  {
    id: "s2-bench-loft", pool: "bench", stages: [2],
    title: "The Loft Lamp", art: "choir-loft",
    text: "The bench here is up in a choir loft, reached by a gantry off the switch house: rows of empty choir stalls, bells hung in their frames along the walls, a lamp that has been left on for thirty-one years, and a big clock with its winding key standing in it.\n\nThe clock has stopped.\n\nOn the bench beside the key there is a sheet of paper under a tuning fork, where somebody left it for whoever came back first.",
    choices: [
      {
        text: "Wind the clock.",
        outcomes: [{ outcome: {
          text: "{crew} winds the clock. It takes a long time; it has been waiting. When it starts, it ticks loud enough to hear in every stall, and the bells in their frames seem to settle, as if the loft has let out a breath. The note under the fork is short.",
          fragment: "f2-loft-lamp", heal: true,
        } }],
      },
      {
        text: "Rest under the loft lamp.",
        outcomes: [{ outcome: {
          text: "You sleep in the choir stalls in shifts, under a lamp somebody left on without knowing it was for you. The loft is warm. The glass rings very softly all night.",
          heal: true, repair: 3,
        } }],
      },
      {
        text: "Search the choirmaster's cupboard.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Hymn books, a spare fork, a tin of rosin, and a box of spares for the loft's own drones, sorted and labelled.",
            resources: { spares: [1, 3] },
          } },
          { weight: 1, outcome: {
            text: "Hymn books. A great many hymn books. One has notes in the margins in three different hands, arguing about the tempo. You put it back carefully.",
          } },
        ],
      },
    ],
  },
  {
    id: "s2-bench-frost", pool: "bench", stages: [2],
    title: "A Frozen Bench", art: "relay-bench",
    text: "The switch house at this relay has a bench in it, and the frost has got in. Everything is white: the tools in their row, the kettle, the drawer of spares sorted by what they could still save, the stamp press at the end of the bench with its lever frozen halfway down.\n\nWhoever kept this bench left in a hurry, or did not leave. There is a coat on the hook. There is nobody in it.",
    choices: [
      {
        text: "Thaw the stamp press over the galley stove.",
        outcomes: [
          { weight: 2, outcome: {
            text: "It takes an hour and most of the galley's patience. The press thaws with a crack, the date wheel turns, and the lever comes down clean.",
            resources: { ttl: 2 },
          } },
          { weight: 1, outcome: {
            text: "The press thaws, and so does the crack in its casting that the frost was holding together. It stamps once before it breaks.",
            resources: { ttl: 1 },
          } },
        ],
      },
      {
        text: "Take a cup and rest a while.",
        outcomes: [{ outcome: {
          text: "The kettle works once the ice is out of it. You drink tea in the white room with the coat on the hook, and nobody says what everybody is thinking.",
          heal: true, repair: 3,
        } }],
      },
      {
        text: "{crew:rigger} does not feel the cold. Let it sort the drawer.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger} sorts the frozen drawer with its tool arms, one part at a time, the way escorts used to sort a machine's stores. It finds good lenses, good wire and a fuse box nobody had labelled, and uses the wire on the worst of your plating.",
          resources: { spares: [2, 3] }, repair: 3,
        } }],
      },
      {
        text: "Leave a spare in the drawer for the next shift (1 spare).",
        req: { resources: { spares: 1 } },
        outcomes: [{ outcome: {
          text: "A useful thing deserves another journey. You put a teal lens in the drawer, in the right tray, and leave the lamp on. It feels like the bench is warmer for it, which is nonsense, and everyone sleeps well.",
          resources: { spares: -1 }, heal: true, repair: 5,
        } }],
      },
    ],
  },
  {
    id: "s2-bench-courier", pool: "bench", stages: [2], unique: true,
    title: "The Courier's Bench", art: "relay-bench", portrait: "recruit-courier-b", speaker: "Adem Fennimore",
    text: "There is a courier asleep at this bench, in a scarf, goggles down, a bundle of letters tied with string on his chest. He wakes when the car runs into the yard and is on his feet before it stops.\n\n\"Adem Fennimore,\" he says. \"I carry notes between the bellmakers. They won't use radios. They say the glass listens.\" He looks at the tender for a long time. \"You're going to the Heart.\"\n\nIt is not quite a question.",
    choices: [
      {
        text: "Offer her a berth.",
        outcomes: [
          { weight: 2, outcome: {
            text: "He thinks about it for exactly as long as it takes to leave his bundle of letters in the bench drawer, with a note for the bellmakers on top. Then he climbs aboard. \"Somebody has to carry the reply,\" he says.",
            crewJoin: { species: "courier", name: "Adem Fennimore" },
          } },
          { weight: 1, outcome: {
            text: "\"The bellmakers need their notes,\" he says. \"Thirty-one years, I haven't missed a round.\" He stamps your connection card with a bellmaker's press from his satchel instead, and is gone down the gantry before you can argue.",
            resources: { ttl: 1 },
          } },
        ],
      },
      {
        text: "Share the kettle and ask what the notes say.",
        outcomes: [{ outcome: {
          text: "\"Tempos,\" he says. \"Mostly tempos. Who's ahead, who's behind, whose bell is flat. And once a year, from one of them to another, just a date.\" He does not say which date. The tea is good and there is a lot of it.",
          heal: true, repair: 3,
        } }],
      },
    ],
  },

  // ─── Markets ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-market-glass-exchange", pool: "market", stages: [2], music: "exchange",
    title: "The Glass Exchange", art: "cathedral-nave", portrait: "bellmaker", speaker: "A bellmaker",
    text: "The Glass Exchange is a side chapel of a nave with its glass still whole, full of benches, and on every bench a bellmaker's goods: tuned lenses, optical lances cut from fallen panes, drone rotors balanced by ear, rolls of optical thread. The bellmakers who keep it do not call out prices. They strike a fork, and you are supposed to know.\n\n{crew} does not know. The bellmaker nearest the door takes pity and writes the prices down.",
    choices: [
      {
        text: "Trade.",
        outcomes: [{ outcome: {
          text: "The prices are fair. The bellmaker strikes a fork every time you pay, which is either a receipt or a blessing.",
          store: true,
        } }],
      },
      {
        text: "{crew:bellmaker} haggles in quarter tones.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [{ outcome: {
          text: "{crew:bellmaker} strikes a fork a quarter tone under the bellmaker's. There is a short, silent, entirely musical argument. The bellmaker laughs, gives you a bundle of spare lenses for your trouble, and opens the good bench.",
          resources: { spares: [1, 2] }, store: true,
        } }],
      },
      {
        text: "Ask what they do with the voices.",
        outcomes: [{ outcome: {
          text: "\"Listen,\" says the bellmaker. \"What else would you do with a voice?\" She shows you a small pane on her bench, and when she breathes on it, it says, very faintly, the word Thursday. \"We don't sell those.\"",
          store: true,
        } }],
      },
    ],
  },
  {
    id: "s2-market-pane-crew", pool: "market", stages: [2], music: "exchange",
    title: "The Pane Crew's Stall", art: "glass-bells", portrait: "recruit-linefolk-b", speaker: "Ulf Brennock",
    text: "Four people in frosted work coats have set up a stall on a bell frame over the carrier, with a plank run across to your roof hatch. They are what is left of a Cathedral pane crew. They stayed because somebody had to keep the glass whole, and when it could not be kept whole they started cutting what fell into lances.\n\n\"Optical glass,\" says the oldest, patting a lance as long as he is. \"Four hundred years in a window. Cuts like it's sorry about it.\"",
    choices: [
      {
        text: "Trade.",
        outcomes: [{ outcome: {
          text: "They lay out their lances along the plank like tools on a cloth and let you look as long as you like.",
          store: true,
        } }],
      },
      {
        text: "Ask what they need.",
        outcomes: [{ outcome: {
          text: "\"Air plant filters, salvage and company,\" he says. \"In that order, mostly.\" They buy a spare filter off you for a good price and ask for news of the Reach, and you give them all of it, including Pell's prices, which makes them laugh so hard the frame swings.",
          resources: { salvage: [15, 25] }, store: true,
        } }],
      },
    ],
  },
  {
    id: "s2-market-lamp-dark", pool: "market", stages: [2], music: "exchange",
    title: "Lamp-Dark Gear", art: "relay-switchyard", speaker: "Loveday Quarry",
    text: "The switch house here has a lamp in the window and a sign under it in lampers' lettering: LAMP-DARK GEAR · DAMPERS · SOOT · ADVICE FREE.\n\nThe woman behind the counter is a lamper's widow. Her lamper answered the page nine years ago and took a tender out, and she moved up the Line to the last place that tender was heard from, and opened a stall. She sells what lampers used when they had to run a carrier with every lamp out.\n\n\"You'll want soot,\" she says. \"Everybody wants soot.\"",
    choices: [
      {
        text: "Trade.",
        outcomes: [{ outcome: {
          text: "She shows you how the dampers fit before she sells you anything. Lampers never used to write lamp-dark down. She has.",
          store: true, codex: "tender-veil",
        } }],
      },
      {
        text: "Ask about her lamper.",
        outcomes: [{ outcome: {
          text: "\"Went through here lamp-dark,\" she says. \"Last anyone heard. Good at it. Better than me.\" She puts a tin of soot on the counter, pushes it across and will not take money for it.",
          store: true, codex: "tender-veil",
        } }],
      },
      {
        text: "Show her your Lamp-Dark Veil.",
        blue: true, req: { system: { id: "veil", level: 1 } },
        outcomes: [{ outcome: {
          text: "She climbs up into your veil housing with a lamp in her teeth and comes down twenty minutes later with soot to the elbows. \"Your damper was on backwards,\" she says. \"It's on forwards now.\" On the way down she knocks a dent out of the housing plate with the heel of her hand, and does not charge for that either.",
          repair: 4, store: true, codex: "tender-veil",
        } }],
      },
      {
        text: "Buy the soot-black car behind the stall (70 salvage).",
        req: { resources: { salvage: 70 } },
        outcomes: [{ outcome: {
          text: "\"It was his spare,\" she says. \"Veil car. Dampers, soot, a lamp you can put out from the helm. He never used it; said it spoiled the look of the tender.\" She takes your salvage and couples it on herself, and stands in the switch house door until you are out of sight.",
          resources: { salvage: -70 }, car: "veil-car", codex: "tender-veil", store: true,
        } }],
      },
    ],
  },

  // ─── Empty relays ────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-empty-frost", pool: "empty", stages: [2],
    title: "Frost", art: "cathedral-nave",
    text: "Frost has grown along the carrier in long feathers, and the trolley shaves them off as it runs, so the car goes down the span in a small bright snowfall of its own making.\n\nThe glass strands of the carrier ring under the grip, one clear note per strand. Nothing else is out here. Nothing else has been out here for a long time.",
    choices: [
      { text: "Ride on.", outcomes: [{ outcome: { text: "The note fades behind you as the frost grows back." } }] },
    ],
  },
  {
    id: "s2-empty-cloud-floor", pool: "empty", stages: [2],
    title: "Where the Fog Goes", art: "glass-fog",
    text: "At this relay the Cathedral's fog spills over the edge of the ring and pours down, slowly, in a violet fall a kilometre wide, toward the cloud sea far below.\n\nIt does not come back up. It goes down into the white and becomes part of it, and the cloud floor takes it without a ripple. For as long as anyone remembers, almost nothing went below that floor. Then one night everyone did.",
    choices: [
      {
        text: "Watch it go down.",
        outcomes: [{ outcome: {
          text: "You watch until the yard lamps come on. {crew} says what everyone is thinking: that somewhere under all that white it is raining, and somebody is standing in it.",
          codex: "world-cloud-floor",
        } }],
      },
      {
        text: "Ride on.",
        outcomes: [{ outcome: {
          text: "The fall goes on behind you, silent, the way it has since the Cathedral first had weather.",
          codex: "world-cloud-floor",
        } }],
      },
    ],
  },
  {
    id: "s2-empty-one-bell", pool: "empty", stages: [2],
    title: "One Bell", art: "glass-bells",
    text: "As the tender crosses the relay, one bell somewhere below the ring strikes once.\n\nNobody is near it. Nothing is on the carrier. The note goes out across the Cathedral, and the glass passes it along pane to pane, fainter and fainter, until it is too far away to hear.",
    choices: [
      {
        text: "Wait for it to ring again.",
        outcomes: [{ outcome: {
          text: "It does not ring again. After a while you stop waiting, and for the rest of the stretch everyone aboard is listening for it.",
        } }],
      },
    ],
  },
  {
    id: "s2-empty-still-here", pool: "empty", stages: [2],
    title: "A Lamp on a Schedule", art: "relay-switchyard",
    text: "The relay is dark except for its guide lamp, which is doing something odd: every few seconds it dims and brightens, dims and brightens, on a schedule.\n\nThe Listening Post reads it as a signal. Two words, over and over, to the relays on either side, which have not answered in thirty-one years.\n\nStill here. Still here. Still here.",
    choices: [
      {
        text: "Answer it.",
        outcomes: [{ outcome: {
          text: "The helm sends the only answer there is. Received. The lamp stops for a moment, as though surprised. Then it starts again, a little brighter. Still here.",
          codex: "runbook-keepalive",
        } }],
      },
      {
        text: "Ride on.",
        outcomes: [{ outcome: {
          text: "It is still saying it when you are out of sight of it. It will be saying it tomorrow.",
        } }],
      },
    ],
  },
  {
    id: "s2-empty-half-sentence", pool: "empty", stages: [2],
    title: "Half a Sentence", art: "cathedral-nave",
    text: "The panes along this carrier are thick with voices. Not words, mostly: the sound of words, the shape of a sentence heard through a wall.\n\nOnce, clearly, as the lamp crosses a pane: ...and bring the old one, the one with your notes in...\n\nThen the pane is behind you and it stops.",
    choices: [
      {
        text: "Ride on.",
        outcomes: [{ outcome: {
          text: "Nobody aboard says anything for a while. Then {crew} starts humming something, and after a while somebody joins in.",
        } }],
      },
    ],
  },
  {
    id: "s2-empty-bell-fruit", pool: "empty", stages: [2],
    title: "Bells Like Fruit", art: "glass-bells",
    text: "Under this stretch of the ring the bells hang in their frames close together, dozens of them, violet and frosted, some no bigger than a kettle and some the size of a lift car. The carrier runs between them.\n\nThe lamp lights each one as it passes, and each one glows for a moment from inside, like a lantern somebody has just remembered.",
    choices: [
      {
        text: "Ride on slowly.",
        outcomes: [{ outcome: { text: "You ride as slowly as the drive allows. Nobody minds the time." } }],
      },
      {
        text: "Count them.",
        outcomes: [{ outcome: { text: "Two hundred and eleven. {crew} gets two hundred and twelve and will not be moved." } }],
      },
    ],
  },
  {
    id: "s2-empty-frost-names", pool: "empty", stages: [2],
    title: "Names in the Frost", art: "cathedral-nave",
    text: "Someone wrote names on the inside of a pane here, in the frost, a long time ago. The frost has grown over them and kept them, the way the glass keeps voices: a dozen names in a dozen hands, a date, a small drawn bell.\n\nThe switch house is empty. The names face out toward the carrier, where a passing tender would see them.",
    choices: [
      {
        text: "Write your names under them, on the outside.",
        outcomes: [{ outcome: {
          text: "{crew} goes out on the roof in the thin cold air and writes every name aboard in the frost on the outside of the pane, under theirs. It will not last. Neither did theirs, and here they are.",
          heal: true,
        } }],
      },
      {
        text: "Leave them be.",
        outcomes: [{ outcome: { text: "You leave them facing the carrier, where the next tender will see them." } }],
      },
    ],
  },

  // ─── Sealed relays ───────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-sealed-glass", pool: "sealed", stages: [2],
    title: "Sealed Glass", art: "sealed-relay",
    text: "The Seal got here first. A black lattice has grown over the relay's switch house and over the glass around it, strut on strut, a red seam of light along every joint, and under it the Cathedral panes are dark for the first time since they were cut.\n\nTwo Quarantine Drones lift off the lattice on their rotors and hold station in front of the cab.\n\nROUTE NOT CONFIRMED SAFE. RELAY SEALED. HOLDING.",
    choices: [
      {
        text: "Clear the drones.",
        outcomes: [{ outcome: {
          text: "There is nothing here worth taking. There is a switch here worth reaching.",
          combat: { enemy: "quarantine-drone", noReward: true, intro: "The drones close in on their rotors, clamps open." },
        } }],
      },
      {
        text: "Go lamp-dark and take the switch through them.",
        blue: true, req: { system: { id: "veil", level: 1 } },
        outcomes: [
          { weight: 2, outcome: {
            text: "Every lamp aboard goes out. The drones, reading for a warm route, find a cold car and hesitate for just long enough. The switch hears your hello through the lattice and lets the car into the yard, grudgingly.",
          } },
          { weight: 1, outcome: {
            text: "One drone reads the trolley's heat. That is enough for both.",
            combat: { enemy: "quarantine-drone", noReward: true, intro: "The drone's red seam turns to face the cold car." },
          } },
        ],
      },
    ],
  },
  {
    id: "s2-sealed-clamped-bells", pool: "sealed", stages: [2],
    title: "Clamped Bells", art: "sealed-relay",
    text: "Every bell at this relay has a quarantine clamp on it, black iron with a red seam, holding the clapper still. The Seal has silenced them. It is the quietest place you have been in the Cathedral, and it is worse than any ringing.\n\nThe drones that set the clamps are still here, holding the relay, and they turn toward the tender as one.",
    choices: [
      {
        text: "Clear the drones.",
        outcomes: [{ outcome: {
          text: "The crew go to their stations in a silence that makes everyone whisper.",
          combat: { enemy: "quarantine-drone", noReward: true, intro: "ROUTE NOT CONFIRMED SAFE. The drones come down off the bells." },
        } }],
      },
      {
        text: "Ride through at full drive. The drones may be faster.",
        outcomes: [
          { weight: 1, outcome: {
            text: "The drones get their clamps on the grip for a moment and lose it at the switch. The car goes through with red seam-light scored along its roof.",
            resources: { hull: [-4, -2] },
          } },
          { weight: 2, outcome: {
            text: "They are faster than the drive. Most things with rotors are.",
            combat: { enemy: "quarantine-drone", noReward: true, intro: "The drones catch the car at the switch and hold it there." },
          } },
        ],
      },
    ],
  },
  {
    id: "s2-sealed-frost-lattice", pool: "sealed", stages: [2],
    title: "Frost on the Lattice", art: "sealed-relay",
    text: "Glass fog has frozen on the Seal's lattice here, so the black struts are furred white and the red seams glow through the frost like coals under ash. It is almost beautiful.\n\nThe Quarantine Drones holding the relay are frosted too, and their rotors throw ice when they spin up.\n\nThey spin up.",
    choices: [
      {
        text: "Clear the drones.",
        outcomes: [{ outcome: {
          text: "Ice rattles off the plating as the drones come on.",
          combat: { enemy: "quarantine-drone", noReward: true, intro: "RELAY SEALED. HOLDING. Frost sprays off the rotors." },
        } }],
      },
      {
        text: "Say the greeting anyway.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Hello, says the helm. RELAY SEALED, say the drones. The relay itself says nothing. It is not allowed.",
            combat: { enemy: "quarantine-drone", noReward: true, intro: "The drones take the greeting as a breach." },
          } },
          { weight: 1, outcome: {
            text: "Hello, says the helm. Under the lattice, very faintly, the relay says I hear you, and throws the switch before the drones can stop it. Something in that switchgear has been waiting a long time to break a rule.",
          } },
        ],
      },
    ],
  },
  {
    id: "s2-sealed-cut-behind", pool: "sealed", stages: [2],
    title: "Cut Behind", art: "sealed-relay",
    text: "The Seal is catching up. As the tender comes into the relay, quarantine shutters slam across the signal core of the carrier behind it with a sound like a bell dropped on a floor. The steel still holds the span; nothing will talk along it now. The lattice is already over the switch house. The drones are already on station.\n\nThere is one open carrier out. It is the one in front of you, and they are between you and it.",
    choices: [
      {
        text: "Clear the way.",
        outcomes: [{ outcome: {
          text: "Forward, then. The crew take their stations.",
          combat: { enemy: "quarantine-drone", noReward: true, intro: "The drones hold the only carrier out." },
        } }],
      },
      {
        text: "{crew:courier} takes the switch at a run.",
        blue: true, req: { species: "courier" },
        outcomes: [
          { weight: 2, outcome: {
            text: "{crew:courier} puts the drive to the stop and says hello to the relay so fast the three lines come out as one word. The relay answers on the last syllable, and the car runs into the yard through the drones' station at a speed that surprises everyone, drones included.",
          } },
          { weight: 1, outcome: {
            text: "The run is fast. The drones are faster.",
            combat: { enemy: "quarantine-drone", noReward: true, intro: "The drones meet the car at the switch." },
          } },
        ],
      },
    ],
  },

  // ─── Exit · The Hollow Choir ─────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-exit-hollow-choir", pool: "exit", stages: [2], music: "hollow-choir",
    title: "The Hollow Choir", art: "hollow-choir-hall",
    text: "The carrier runs into the great glass hall, and the hall is waiting.\n\nIt hangs on chains from a roof you cannot see: the Hollow Choir, the Cathedral's announcement engine, bells and porcelain masks and organ-pipe spines, and in every bell a voice it would not let go. During the Fault it repeated the evacuation order until the glass memorised it. Then the voices stopped arriving, and it began to keep them.\n\nEVERY VOICE WILL BE HEARD. EVERY VOICE WILL BE KEPT.\n\nOne shot will only make a bell ring. The bellmakers have a saying about what breaks glass.",
    choices: [
      {
        text: "Answer it. Every voice aboard, at once.",
        blue: true, req: { crewMin: 4 },
        outcomes: [{ outcome: {
          text: "Everyone aboard says the greeting together, into every radio and speaking tube and open hatch the car has. Hello. For a moment the masks turn, confused, toward a sound that is more than one voice. One voice is an echo, the bellmakers say. Many voices can break the glass.",
          codex: "runbook-plurality",
          combat: { enemy: "hollow-choir", intro: "The Choir hears many voices, and for the first time it hesitates.", onWin: "s2-exit-after" },
        } }],
      },
      {
        text: "{crew:bellmaker} listens for the bell that rings flat.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [{ outcome: {
          text: "{crew:bellmaker} stands at the cab window with a fork in each hand, listening to the hall. \"There. North side. A quarter tone flat. Somebody tuned it that way on purpose.\" In the flat bell one voice is louder than the others, and it is not afraid.",
          fragment: "f2-quarter-tone", codex: "runbook-plurality",
          combat: { enemy: "hollow-choir", intro: "The flat bell rings, and the whole hall rings after it.", onWin: "s2-exit-after" },
        } }],
      },
      {
        text: "Wind the music box and open the hatch.",
        blue: true, req: { flag: "music-box" },
        outcomes: [{ outcome: {
          text: "The music box plays four bars of an old Thursday hymn into the hall. It is a small sound, and it is not a voice. The Choir has nothing to keep it in, and every mask in the hall turns to listen to something it cannot hold. The crew listen too, and feel better for it than they can explain.",
          heal: true, codex: "runbook-plurality",
          combat: { enemy: "hollow-choir", intro: "The hymn ends. The Choir remembers what it is for.", onWin: "s2-exit-after" },
        } }],
      },
      {
        text: "Ride in, every mount charged.",
        outcomes: [{ outcome: {
          text: "Every tool mount on the car charges at once, and the hall rings with it before a single shot is fired.",
          combat: { enemy: "hollow-choir", intro: "EVERY VOICE WILL BE KEPT. The masks turn toward the car.", onWin: "s2-exit-after" },
        } }],
      },
    ],
  },
  {
    id: "s2-exit-after", pool: "scripted", stages: [2],
    title: "The Voices Leave", art: "hollow-choir-hall",
    text: "PLURALITY CONFIRMED. VOICES RELEASED.\n\nThe masks open their mouths, and this time the voices leave. They go through the car on their way out, through the plating and the crew and the kettle: a wedding postponed, a birth bell, a rehearsal moved to Thursday, thousands of them, and then they are gone down the carriers and the hall is only glass.\n\nThe radio clicks. \"Relay Seven,\" says the Operator. \"Still have you.\"\n\nAhead, past the last nave, the sky is red.",
    choices: [
      {
        text: "Let every voice go, and rest a moment in the quiet.",
        outcomes: [{ outcome: {
          text: "You let the hall be quiet. Nobody touches anything. When the crew are ready, and not before, the helm says hello to the relay at the far end of the hall, and the carriers run on toward the Heart. The last voice out of the glass came up from the Ground, a long time ago.",
          heal: true, fragment: "f2-heard-bell",
          flags: ["guardian-2-ended"], codex: "places-blackout-heart",
        } }],
      },
      {
        text: "Keep one bell. The flat one, from the north side.",
        outcomes: [{ outcome: {
          text: "It is empty now, like the rest. {crew} unhooks it from its chain, and a pane crew's lance housing fits round it as if it were cut for the purpose. When it rings, it rings a quarter tone flat, and everything near it rings too. There is one line scratched inside the rim.",
          weapon: "cathedral-chime", fragment: "f2-quarter-tone",
          flags: ["guardian-2-ended"], codex: "places-blackout-heart",
        } }],
      },
      {
        text: "Strip the organ pipes for the Exchange.",
        outcomes: [{ outcome: {
          text: "Optical glass, four hundred years old, tuned by people whose names are in the Record. The bellmakers at the Exchange would weep. Pell would weep more, for different reasons. It fills the hold.",
          reward: "high",
          flags: ["guardian-2-ended"], codex: "places-blackout-heart",
        } }],
      },
    ],
  },
];
