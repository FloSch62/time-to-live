// Stage III · The Blackout Heart — relay deck: combat intros, hazards, benches, markets, empty and sealed relays,
// and the guardian's exit (the Blackout Core). Solemn and urgent: the archive burning its reserves, the queue
// glowing through the cracks, wardens who remember the order.
import type { EventDef } from "../../game/types.ts";

export const STAGE3_RELAYS_FLAGS: Record<string, string> = {
  "s3-ennis-list": "The crew signed Ennis Rook's list at the last bench before the Heart.",
  "s3-cup-taken": "The crew took a cup at Bench Four, as Harrow's log says.",
  "s3-kettle-taken": "The crew took Harrow's kettle from Bench Four. It says a cup.",
};

export const STAGE3_RELAYS: EventDef[] = [
  // ─── Combat · Gate Sentinel ────────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-sentinel-present-key",
    pool: "combat",
    stages: [3],
    title: "Present Key",
    art: "checkpoint-gate",
    text: "The carrier runs straight into a checkpoint: barred gates across the cable, a switch house behind them, and above it all a key-scanner eye the size of the cab window. It turns red as your lamp reaches it.\n\nPRESENT KEY. KEY EXPIRED 10,871 DAYS AGO. UNKNOWN SENDER. CARRIER HELD.\n\nThe bars do not move. Behind you, somewhere back along the carrier, something is cutting cable.",
    choices: [
      {
        text: "Take the bars at speed and end its shift.",
        outcomes: [
          {
            outcome: {
              text: "The drive spools up. The eye follows the lamp all the way in.",
              combat: {
                enemy: "gate-sentinel",
                intro: "The bars brace. The Sentinel has held this carrier for thirty-one years and means to hold it now.",
              },
            },
          },
        ],
      },
      {
        text: "{crew:warden} holds an old warden's badge up to the eye.",
        blue: true,
        req: { species: "warden" },
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "The eye reads the badge for a long time. WARDEN PATTERN RECOGNISED. KEY EXPIRED. Then the bars lift a hand's width, and then the whole way, slowly, like a gate that has decided to believe you without being able to say why. {crew:warden} does not put the badge away until the relay is behind you.",
            },
          },
          {
            weight: 1,
            outcome: {
              text: "WARDEN PATTERN RECOGNISED. KEY EXPIRED. A PATTERN IS NOT A KEY. The eye goes red again. {crew:warden} puts the badge away with great care, and goes to the ward mesh.",
              combat: { enemy: "gate-sentinel", intro: "The checkpoint has made up its mind. It was always going to." },
            },
          },
        ],
      },
      {
        text: "Flood the key-scanner with a jammer and slip under the bars.",
        blue: true,
        req: { weapon: "ion" },
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "The eye fills with noise and stares at nothing. The bars stay down, but the gap beneath them is a car's height if you do not mind the paint. Nobody minds the paint.",
              resources: { hull: [-2, -1] },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The eye clears before the trolley is through. The bars come down on the grip housing with a sound the whole crew feel in their teeth.",
              resources: { hull: [-3, -2] },
              combat: { enemy: "gate-sentinel", intro: "PRESENT KEY. The eye is clear again, and very red." },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-sentinel-waiting-cars",
    pool: "combat",
    stages: [3],
    title: "The Queue at the Bars",
    art: "checkpoint-gate",
    text: "A checkpoint stands over the carrier, and in front of it, waiting their turn, is a line of cars. A freight car. Two scavenger skiffs. A tender of the lamplighter pattern with its cupola dark. None of them has moved in years.\n\nThe Sentinel's eye sweeps the front car, as it has every few seconds for as long as anyone has been counting.\n\nNEXT.\n\nThe front car is empty. The Sentinel does not seem to mind.",
    choices: [
      {
        text: "Go round the queue on the side carrier and take the checkpoint.",
        outcomes: [
          {
            outcome: {
              text: "The side carrier is rusted but it holds. The eye swings off the front car and onto you. It has not had anything new to look at in years.",
              combat: { enemy: "gate-sentinel", intro: "NEXT. The bars brace for a car that is actually moving." },
            },
          },
        ],
      },
      {
        text: "Strip the waiting cars first. They are not going anywhere.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "The skiffs give up their cells and a crate of spliced charges. The tender gives up nothing; nobody wants to take anything from it. Then the eye swings round. The Sentinel does not approve of anyone leaving the queue.",
              resources: { salvage: [30, 50], payloads: 2 },
              combat: { enemy: "gate-sentinel", intro: "The queue has changed. The checkpoint would like to know why." },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "An old air tank on the first skiff ruptures as the grip takes its weight, and the whole queue swings on the carrier like washing on a line. The eye swings with it.",
              resources: { hull: [-4, -2] },
              combat: { enemy: "gate-sentinel", intro: "The queue is swinging. The checkpoint is not." },
            },
          },
        ],
      },
      {
        text: "Send {crew:rigger} to explain, machine to machine, that the queue is empty.",
        blue: true,
        req: { species: "rigger" },
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "{crew:rigger} walks the carrier to the front of the queue and stands under the eye. They talk for forty minutes. Nobody aboard knows in what. At the end of it the Sentinel says NEXT, and then, after a long pause, NEXT, and the bars lift for a queue of one. Behind you, the Seal has had forty minutes too.",
              seal: -1,
            },
          },
          {
            weight: 1,
            outcome: {
              text: "{crew:rigger} is too new to the world to lie to a checkpoint, and says so, politely. The eye goes red. {crew:rigger} walks back along the carrier rather faster.",
              combat: { enemy: "gate-sentinel", intro: "PRESENT KEY. Nobody present has one." },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-sentinel-badge-rack",
    pool: "combat",
    stages: [3],
    title: "The Badge Rack",
    art: "checkpoint-gate",
    text: "This checkpoint was for archive staff. Beside the bars hangs the rack where the night shift clocked in: forty badges, each with a photograph, each signed by the Heart and renewed every year until the Heart stopped signing.\n\nThe scanner eye opens. PRESENT KEY.\n\n{crew} reaches out of the service hatch and lifts the rack off its hook. It is heavier than it looks. Forty expired keys is still a lot of brass.",
    choices: [
      {
        text: "Put the rack down and fight the checkpoint.",
        outcomes: [
          {
            outcome: {
              text: "{crew} hangs the rack back on its hook, carefully, because it seems wrong not to. Then the drive spools.",
              combat: { enemy: "gate-sentinel", intro: "PRESENT KEY. The eye has all the time in the world. You do not." },
            },
          },
        ],
      },
      {
        text: "Try the badges on the eye, one at a time.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "Thirty-nine refusals. The fortieth badge shows a boy of sixteen in a runner's cap: E. ROOK · RUNNER · WARDEN CREW. KEY EXPIRED. The eye goes red and stays red.",
              combat: { enemy: "gate-sentinel", intro: "Forty keys, forty refusals. The checkpoint is very thorough." },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "One badge makes the eye hesitate, long enough to count, long enough for the drive to spool. You are under the bars before it finishes deciding. The rack goes into the hold. It seems wrong to leave them here.",
              resources: { salvage: [30, 45] },
            },
          },
        ],
      },
      {
        text: "Time the eye's sweep with the Listening Post and cross between reads.",
        blue: true,
        req: { system: { id: "sensors", level: 3 } },
        outcomes: [
          {
            weight: 3,
            outcome: {
              text: "The Sentinel reads every eleven seconds. The drive needs nine. {crew} counts it down out loud at the helm, and the bars are behind you before the eye comes back round to the carrier.",
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The eye comes back two seconds early. It has been running slow for thirty-one years and chose tonight to catch up.",
              combat: { enemy: "gate-sentinel", intro: "Eleven seconds, it turns out, was an average." },
            },
          },
        ],
      },
    ],
  },

  // ─── Combat · Null Marshal ─────────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-marshal-escort-out",
    pool: "combat",
    stages: [3],
    title: "Escort Available",
    art: "ember-archive",
    text: "An armoured car sits on the carrier ahead, angular and dark, a warrant lamp glowing on its nose. A Null Marshal: the escort that once took keyed engineers across the trust boundary and back.\n\nESCORT AVAILABLE FOR KEYED ENGINEERS. KEYED ENGINEERS FOUND: 0. ESCORTING INTRUDERS OUT.\n\nOn its roof, marshal troopers unfold from their racks and start down the carrier toward you. They are coming to see you safely out. Out is behind you, where the Seal is.",
    choices: [
      {
        text: "Meet the troopers on the roof and end the Marshal's task.",
        outcomes: [
          {
            outcome: {
              text: "{crew} takes the ladder to the roof hatch. Everyone else takes a station.",
              combat: {
                enemy: "null-marshal",
                intro: "The troopers reach the trolley housing. The Marshal waits behind them, patient as a form.",
                onWin: "s3-marshal-after",
              },
            },
          },
        ],
      },
      {
        text: "Let it escort you out. Nobody gets hurt.",
        req: { resources: { ttl: 1 } },
        outcomes: [
          {
            outcome: {
              text: "The troopers clamp on politely, and the Marshal tows the {ship} back down the carrier toward the last relay you crossed, at the regulation walking pace. It takes a long time to find a switch that will let you turn round. By then the Seal has come a long way.",
              resources: { ttl: -1 },
              seal: -2,
            },
          },
        ],
      },
      {
        text: "Lock every door and hatch and let the troopers knock.",
        blue: true,
        req: { system: { id: "doors", level: 2 } },
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "The troopers try every hatch in order, as the procedure says, then stand on the roof waiting for someone to open one. The procedure does not say what to do next. The Marshal is still thinking about it when the next relay switches you away.",
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The fourth hatch is the galley hatch, the one that squeals and never quite shuts. It was always going to be the galley hatch.",
              combat: { enemy: "null-marshal", intro: "Troopers in the galley. Mind the kettle.", onWin: "s3-marshal-after" },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-marshal-warrant",
    pool: "combat",
    stages: [3],
    title: "Warrant One of One",
    art: "ember-archive",
    text: "The Null Marshal on this carrier has its warrant up on the plate beside its warrant lamp, in small ivory letters, so there can be no misunderstanding.\n\nWARRANT 1 OF 1. ESCORT ALL NON-KEYED PERSONS FROM THE TRUST BOUNDARY. ISSUED HOUR 11. VALID UNTIL A SAFE ROUTE IS CONFIRMED.\n\nThe crew read it twice. Nobody can find anything wrong with it. That was always the trouble with the wardens' paperwork: it was very good.",
    choices: [
      {
        text: "End its warrant the hard way.",
        outcomes: [
          {
            outcome: {
              text: "The warrant lamp brightens as the troopers come down the carrier. It has been waiting to serve this warrant for a long time.",
              combat: { enemy: "null-marshal", intro: "ESCORTING. The troopers step onto your roof in perfect time.", onWin: "s3-marshal-after" },
            },
          },
        ],
      },
      {
        text: "{crew:rigger} is not a person, according to the warrant. Send it down the carrier.",
        blue: true,
        req: { species: "rigger" },
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "The troopers let {crew:rigger} walk straight past them. The warrant says nothing about machines. {crew:rigger} climbs the Marshal's flank, opens its power panel with a tool arm, and puts it to sleep like a lamp at the end of a shift, then comes back with a spare lens found inside.",
              resources: { spares: [1, 2] },
              reward: "low",
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The troopers let {crew:rigger} past. Then the Marshal reads its warrant again, finds a clause about escort detail property, and decides the {ship} is property. Two troopers carry {crew:rigger} back aboard, very gently, and do not leave.",
              combat: { enemy: "null-marshal", intro: "Property is to be escorted with its owners. The troopers are thorough.", onWin: "s3-marshal-after" },
            },
          },
        ],
      },
      {
        text: "{crew:warden} points out that no route will ever be confirmed if it escorts everyone out.",
        blue: true,
        req: { species: "warden" },
        outcomes: [
          {
            weight: 1,
            outcome: {
              text: "The Marshal considers this for a long time. ARGUMENT RECEIVED. WARRANT STANDS. The warrant lamp stays lit. {crew:warden} says it was a very good argument, and goes to the ward mesh.",
              combat: { enemy: "null-marshal", intro: "The warrant stands. So do the troopers.", onWin: "s3-marshal-after" },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The Marshal considers it. ARGUMENT RECEIVED. ESCORTING SAFE ROUTE CANDIDATE TO NEXT RELAY. It takes you in, not out, one relay's length at the regulation walking pace, and releases you at the switch with something that might be courtesy. Its troopers leave a crate of spare cells on the switch house step.",
              reward: "low",
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-marshal-roof",
    pool: "combat",
    stages: [3],
    title: "Boots on the Roof",
    art: "relay-switchyard",
    text: "You hear them before you see them: boots on the trolley housing, walking in step. Marshal troopers, three of them, dropped onto the roof from a gantry as you passed underneath. Their Marshal is coming down the carrier behind them, warrant lamp swinging.\n\nThey are not trying to hurt anyone. They are trying to open the roof hatch and escort you out, which, at this height, comes to much the same thing.",
    choices: [
      {
        text: "Fight them off the roof, then deal with the Marshal.",
        outcomes: [
          {
            outcome: {
              text: "Everyone who can hold a spanner goes up the ladder. Everyone who can't goes to a station.",
              combat: { enemy: "null-marshal", intro: "Troopers on the roof, the Marshal behind them. One thing at a time.", onWin: "s3-marshal-after" },
            },
          },
        ],
      },
      {
        text: "Sweep the roof with rivet scatter before the Marshal arrives.",
        blue: true,
        req: { weapon: "flak" },
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "The rivets ring off their armour, and the troopers step back onto the gantry one by one, as the procedure for incoming fire requires. The {ship} is past before they finish stepping. The roof will need some work.",
              resources: { hull: [-2, -1] },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The rivets ring off their armour. The troopers wait politely for the rivets to stop, then carry on with the hatch.",
              combat: { enemy: "null-marshal", intro: "Still on the roof. Still polite.", onWin: "s3-marshal-after" },
            },
          },
        ],
      },
      {
        text: "Surge the drive and try to scrape them off at the next switch.",
        outcomes: [
          {
            weight: 1,
            outcome: {
              text: "The car bucks, the switch throws hard, the gantry goes by overhead, and three troopers are left standing on it watching you go. One of them waves, or checks its arm. Hard to tell. The trolley took the switch badly.",
              resources: { hull: [-3, -2] },
            },
          },
          {
            weight: 2,
            outcome: {
              text: "The car bucks and swings on the carrier. The troopers hold on. They were built to hold on. Something in the drive does not like what you just asked of it.",
              systemDamage: { system: "engines", amount: 1 },
              combat: { enemy: "null-marshal", intro: "The troopers are still on the roof, and now the drive is sulking.", onWin: "s3-marshal-after" },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-marshal-after",
    pool: "scripted",
    stages: [3],
    title: "The Warrant Expires",
    art: "machine-hulk",
    text: "The warrant lamp goes out. The marshal troopers stop where they stand, on your roof and on the Marshal's, arms at their sides, waiting for an escort that is never going to be ordered again.\n\nIn the Marshal's hold, among the racks, an escort automaton sits powered down with its one lens dark. It was there to keep the troopers mended. There is nothing left for it to mend.",
    choices: [
      {
        text: "Strip the Marshal's plating and cells.",
        outcomes: [
          {
            outcome: {
              text: "Its plates are heavy and good. The troopers watch you take them without objection. Nobody has told them to object.",
              reward: "med",
            },
          },
        ],
      },
      {
        text: "Say the greeting to the escort. All three lines.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "Hello. The lens flickers. I hear you. It goes teal. I hear you hear me. The escort unfolds its tool arms, looks round the hold, and follows you out of it, as it was built to follow crews. The Night Shift would give it a bird's name. So do you.",
              crewJoin: { species: "rigger" },
              reward: "low",
            },
          },
          {
            weight: 1,
            outcome: {
              text: "Hello. The lens flickers red and stays red. You said it right; it was simply too long ago. You take its spare lens, as the Night Shift would, and whatever else the Marshal was carrying.",
              resources: { spares: 1 },
              reward: "low",
            },
          },
        ],
      },
      {
        text: "{crew:rigger} goes into the hold to wake it.",
        blue: true,
        req: { species: "rigger" },
        outcomes: [
          {
            outcome: {
              text: "{crew:rigger} crouches beside the escort and says the greeting slowly, all three lines, the way it was said to {crew:rigger} once. The lens goes teal on the second line. When {crew:rigger} climbs back aboard, there are two of them.",
              crewJoin: { species: "rigger" },
              reward: "low",
            },
          },
        ],
      },
    ],
  },

  // ─── Combat · Ash Moth ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-moth-to-the-lamp",
    pool: "combat",
    stages: [3],
    title: "Drawn to the Lamp",
    art: "ember-draft",
    text: "A cooling drone is circling the cupola on its rotors, close enough that the crew can see the radiator fins of its wings, warped and black. An Ash Moth. It has found the warmest thing on this carrier, and it is the {ship}'s lamp.\n\nHEAT SOURCE FOUND ON CARRIER. COOLING.\n\nWhere its ash lands on the roof, it smoulders. It is trying very hard to help.",
    choices: [
      {
        text: "Bring it down before the roof catches.",
        outcomes: [
          {
            outcome: {
              text: "The weapons crew track it round the cupola. It does not notice them. It is busy cooling.",
              combat: { enemy: "ash-moth", intro: "Ash settles on the roof like grey snow, and starts to glow." },
            },
          },
        ],
      },
      {
        text: "Put the lamp out and wait for it to lose interest.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "The cupola goes dark. The moth circles twice, three times, and goes looking for something warmer. Sitting dark on a carrier in the Heart takes longer than anyone likes. Behind you, the Seal does not sit dark.",
              seal: -1,
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The cupola goes dark. The moth circles, then finds the next warmest thing aboard: the drive motors. The first anyone knows of it is the smell.",
              systemDamage: { system: "engines", amount: 1 },
              combat: { enemy: "ash-moth", intro: "It has found the drive. It is cooling it with burning ash." },
            },
          },
        ],
      },
      {
        text: "Go lamp-dark properly, every emission quiet.",
        blue: true,
        req: { system: { id: "veil", level: 1 } },
        outcomes: [
          {
            outcome: {
              text: "Every lamp out, every hum damped. To the moth the {ship} is suddenly a cold piece of carrier, and it has no interest in cold carrier. It wanders off down the gallery toward the fins, and you switch away in the dark.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-moth-dead-relay",
    pool: "combat",
    stages: [3],
    title: "Cooling a Dead Relay",
    art: "relay-switchyard",
    text: "The relay here burned out years ago. Its switch house is black, its fins are slag, and ash lies on its roof like snow. An Ash Moth is still cooling it, turning slow circles over the ruin on its rotors, shedding more ash with every pass.\n\nThe switchgear underneath still answers a hello; it runs on a trickle the fire never reached. But to switch here, the {ship} has to sit under the moth for as long as a greeting takes.",
    choices: [
      {
        text: "Clear the moth out of the relay first.",
        outcomes: [
          {
            outcome: {
              text: "You would rather it came to you than to the switch house while you are in it.",
              combat: { enemy: "ash-moth", intro: "HEAT SOURCE FOUND. It turns from the dead relay to the live car." },
            },
          },
        ],
      },
      {
        text: "Send the greeting and hope it keeps its mind on the relay.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "Hello. I hear you. I hear you hear me. The moth keeps its mind on the relay. A little of its ash lands on the roof and burns a small black flower into the paint, and then the switch throws and you are through.",
              resources: { hull: -1 },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "Halfway through the greeting, the moth notices there is a new warm thing underneath it.",
              combat: { enemy: "ash-moth", intro: "I hear you, says the relay. So does the moth." },
            },
          },
        ],
      },
      {
        text: "Find the relay's old coolant valve and give the moth something to cool.",
        blue: true,
        req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          {
            outcome: {
              text: "The Listening Post finds the valve. It is stiff, and {crew} has to go out on the gantry in a coat and harness in the thin cold air to open it, but when it opens a plume of coolant goes up and the moth settles over it like a cat on a warm stone. It does not notice you leave. {crew} brings back a few things from the gantry locker, and a cough.",
              crewDamage: { amount: 10, who: "one" },
              reward: "low",
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-moth-the-note",
    pool: "combat",
    stages: [3],
    title: "The Moth and the Note",
    art: "ember-archive",
    text: "An Ash Moth hangs in the gallery ahead, rotors humming, turning toward whatever runs hottest. The carriers here run close to the cooling fins, and everything runs hot.\n\nIts rotors hum a single note, slightly off. Anyone who has spent time around bells can hear it: the note it was tuned to, and the note it hums now, a little flat of it, where the blades have warped.",
    choices: [
      {
        text: "Bring it down.",
        outcomes: [
          {
            outcome: {
              text: "The note rises as it turns toward you.",
              combat: { enemy: "ash-moth", intro: "HEAT SOURCE FOUND ON CARRIER. The warped note fills the gallery." },
            },
          },
        ],
      },
      {
        text: "{crew:bellmaker} hums the note it was tuned to.",
        blue: true,
        req: { species: "bellmaker" },
        outcomes: [
          {
            weight: 3,
            outcome: {
              text: "{crew:bellmaker} stands at the open window and hums, low, the right note. The moth turns toward it. It follows the note down the gallery like a dog following a whistle, away from the carrier, and when {crew:bellmaker} stops, it stays where it is, humming, a little less flat. Nobody says anything for a while.",
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The moth turns toward the note, which is also toward the warm open window {crew:bellmaker} is standing in. The note does not survive the ash. Neither do the eyebrows.",
              crewDamage: { amount: 15, who: "one" },
              combat: { enemy: "ash-moth", intro: "It liked the note. It wants to cool whoever sang it." },
            },
          },
        ],
      },
      {
        text: "Run the gallery at full drive before it turns.",
        outcomes: [
          {
            weight: 1,
            outcome: {
              text: "It turns.",
              combat: { enemy: "ash-moth", intro: "Full drive is warm. The moth approves of warm." },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "It is turned the other way, cooling a fin that has been cold for a decade. You are past before it notices. The fin stays cold.",
            },
          },
        ],
      },
    ],
  },

  // ─── Combat · Grave Reaver ─────────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-reaver-weak-signal",
    pool: "combat",
    stages: [3],
    title: "Permission to Begin",
    art: "machine-hulk",
    text: "Something heavy is coming along the carrier behind you, on a trolley built for loads ten times the {ship}'s weight. A Grave Reaver: a reactor dismantler, all claws, with a listening dish where a head would be. The dish is turned toward you.\n\nWEAK SIGNAL ON CARRIER. DECOMMISSION PERMITTED. BEGINNING.\n\nIt has decided you are something that has stopped working. It would like to help you be useful again, in parts.",
    choices: [
      {
        text: "Show it how much the {ship} still works.",
        outcomes: [
          {
            outcome: {
              text: "Every station reports in. The dish tilts, listening, unconvinced.",
              combat: { enemy: "grave-reaver", intro: "The claws open. It begins, carefully, the way it was taught." },
            },
          },
        ],
      },
      {
        text: "Run the ward mesh hot so the whole car sings with signal.",
        blue: true,
        req: { system: { id: "shields", level: 4 } },
        outcomes: [
          {
            weight: 3,
            outcome: {
              text: "The mesh crackles and every wire on the car hums. The dish flinches. SIGNAL STRONG. LIVE EQUIPMENT. PERMISSION WITHDRAWN. The Reaver stops on the carrier and waits, patient, for something else to fail.",
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The mesh crackles, and then a breaker in the charge room trips, and for one second the {ship} is the weakest signal on the carrier. One second is enough.",
              systemDamage: { system: "shields", amount: 1 },
              combat: { enemy: "grave-reaver", intro: "WEAK SIGNAL CONFIRMED. BEGINNING." },
            },
          },
        ],
      },
      {
        text: "Outrun it to the next switch.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "It is slow; it was built for reactors, and reactors do not run. One claw reaches the tail as the switch throws and takes a souvenir.",
              resources: { hull: [-4, -2] },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "It is slow, but the carrier is long. The claws close on the drive trolley a hundred metres short of the switch.",
              systemDamage: { system: "engines", amount: 1 },
              combat: { enemy: "grave-reaver", intro: "It has hold of the trolley. It would like the rest of the car too." },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-reaver-small-reactor",
    pool: "combat",
    stages: [3],
    title: "Thirty Years of Dismantling",
    art: "ember-archive",
    text: "In a gallery beside the carrier, a Grave Reaver is taking apart a reactor. It has been at it a long time. The reactor is about the size of a kettle now.\n\nAround the Reaver, sorted into neat piles by what they could still be used for, is everything it has taken off: plates, coils, regulators, a hundred spares with their lenses polished. It works slowly and very carefully. It has not noticed you.",
    choices: [
      {
        text: "Take a pile while its back is turned.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "{crew} goes over on a line and comes back with an armful of polished spares and a coil. The Reaver sorts the next plate onto the pile you just emptied, pauses, and goes on.",
              resources: { spares: [1, 2] },
              reward: "low",
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The Reaver hears the line go taut. It turns. It has finished the reactor, it seems, and it would like to start on something else.",
              combat: { enemy: "grave-reaver", intro: "WEAK SIGNAL. The dish swings from the kettle-sized reactor to you." },
            },
          },
        ],
      },
      {
        text: "End its task and take everything.",
        outcomes: [
          {
            outcome: {
              text: "Thirty years of sorting, and all of it worth something to somebody.",
              combat: {
                enemy: "grave-reaver",
                intro: "It sets down the plate it was holding before it turns. It is tidy to the last.",
                onWin: "s3-reaver-pile",
              },
            },
          },
        ],
      },
      {
        text: "{crew:rigger} tells it the reactor is done.",
        blue: true,
        req: { species: "rigger" },
        outcomes: [
          {
            outcome: {
              text: "{crew:rigger} walks over, stands by the kettle-sized reactor with its lens on the Reaver's dish, and says something short. The Reaver looks at what is left. NOTHING LEFT TO DISMANTLE. TASK ENDED. Its claws fold. It settles on its piles like an old man at the end of a shift, and {crew:rigger} brings back what the Reaver would have wanted used.",
              reward: "med",
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-reaver-pile",
    pool: "scripted",
    stages: [3],
    title: "The Sorted Piles",
    art: "ember-archive",
    text: "The Reaver's claws lower. Its last task is over, and the gallery is quiet except for the tick of cooling plate.\n\nThirty years of sorting lie around it. Most of it is too heavy for a tender. Two things are not: a heap of polished spares and good plate, and, set apart on a cloth as if it mattered, the pulse regulator from the reactor's heart, still tuned to the old hourly beat.",
    choices: [
      {
        text: "Load the spares and the plate.",
        outcomes: [
          {
            outcome: {
              text: "It takes an hour to load, and the hold groans. Everything is sorted already. You only have to carry it.",
              reward: "high",
            },
          },
        ],
      },
      {
        text: "Take the pulse regulator.",
        outcomes: [
          {
            outcome: {
              text: "The weapons crew wire it to an emitter on the roof mount. It charges on the old heartbeat, and then a little faster, as if it were catching up on thirty-one years.",
              weapon: "heartpulse-chain",
            },
          },
        ],
      },
      {
        text: "Take a little of both.",
        outcomes: [
          {
            outcome: {
              text: "A bag of spares and a crate of plate. The regulator stays on its cloth. It seems to belong there.",
              resources: { spares: [1, 2] },
              reward: "low",
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-reaver-tender-wreck",
    pool: "combat",
    stages: [3],
    title: "Parts That Could Live Again",
    art: "tender-wreck",
    text: "A tender of the lamplighter pattern lies wedged in a gantry below the carrier, split along its spine, its trolley still gripping a snapped cable end. A keeper's tender. Nobody has been aboard it for a long time.\n\nA Grave Reaver is taking it apart. It does it gently, plate by plate, sorting each piece by what it could still be used for. That is what it was built to do, and for once it is doing it to something that has truly stopped.",
    choices: [
      {
        text: "Stop it. That tender was somebody's.",
        outcomes: [
          {
            outcome: {
              text: "The Reaver lifts its dish from the wreck toward the {ship}. It hears you. It did not know anyone minded.",
              combat: {
                enemy: "grave-reaver",
                intro: "It sets the wreck's cupola down on the gantry, carefully, before it turns.",
                onWin: "s3-reaver-wreck-after",
              },
            },
          },
        ],
      },
      {
        text: "Let it work. It is doing this right.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "You leave it to its sorting. As the {ship} passes overhead, the Reaver lifts one claw and sets something on the carrier in your path, the way a crane sets down a load: two polished lenses from the dead tender's escorts. Parts that could live again.",
              resources: { spares: 2 },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "You leave it to its sorting. The Reaver does not look up. Someone aboard reads the half-legible name on the wreck out loud, once, and then nobody says anything until the next relay.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-reaver-wreck-after",
    pool: "scripted",
    stages: [3],
    title: "The Keeper's Tender",
    art: "tender-wreck",
    text: "The Reaver lets go of the wreck and folds its claws. Up close, the tender's old name is still legible under the soot, in lampers' lettering, with a newer name painted over it. Its cupola is cracked. Its lamp is out.\n\nThe drawer under its helm is full of spares sorted by what could still be saved, and there is a note in pencil on top: for the next one.",
    choices: [
      {
        text: "Take the drawer. That is what it was left for.",
        outcomes: [
          {
            outcome: {
              text: "You take the drawer, note and all. The note goes on the galley wall, under the kettle.",
              reward: "med",
            },
          },
        ],
      },
      {
        text: "Relight its lamp before you go.",
        outcomes: [
          {
            outcome: {
              text: "It takes a cell from the hold and half an hour on the gantry, and the Seal gains on you while you do it. But when you switch away there is a lamp lit on the wreck below, which there was not before. Leave it lit, the lampers said. The crew are quieter for a while, in a good way.",
              seal: -1,
              heal: true,
            },
          },
        ],
      },
      {
        text: "Take its trolley grip to patch your own.",
        outcomes: [
          {
            outcome: {
              text: "The grip comes off in one piece. It is the same pattern as yours, down to the maker's mark. Two lampers' tenders, one grip between them, for a while.",
              repair: 6,
            },
          },
        ],
      },
    ],
  },

  // ─── Combat · Demolition Engine ────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-demolition-countdown",
    pool: "combat",
    stages: [3],
    weight: 0.7,
    title: "Work Order Seven",
    art: "relay-switchyard",
    text: "A Demolition Engine is crawling down the carrier toward the next relay, a countdown lamp blinking on its back and breaker charges racked along its flanks like books on a shelf. It was sent to bring down a relay the wardens sealed. The recall never reached it.\n\nOBSTRUCTION ON CARRIER. RECALL NOT RECEIVED. COUNTDOWN STARTED.\n\nThe obstruction is you. The countdown is for whatever stands between it and its relay, and right now that is also you.",
    choices: [
      {
        text: "Stop it before the count runs out.",
        outcomes: [
          {
            outcome: {
              text: "The countdown lamp speeds up. So does everyone aboard.",
              combat: { enemy: "demolition-engine", intro: "COUNTDOWN STARTED. The lamp on its back blinks faster than your heart.", onWin: "s3-demolition-after" },
            },
          },
        ],
      },
      {
        text: "Read its work order through the Listening Post.",
        blue: true,
        req: { system: { id: "sensors", level: 3 } },
        outcomes: [
          {
            outcome: {
              text: "The work order names its relay: sealed in the eleventh hour, far back along the carriers, behind you now, deep in the Seal's lattice. It is not going to the relay ahead at all. {crew} opens the siding for it. The Engine crawls past, blinking, and goes back down the carrier into the Seal. A while later, far behind, something heavy comes down, and the Seal has to go round.",
              seal: 2,
            },
          },
        ],
      },
      {
        text: "Back off down the carrier and let it pass.",
        outcomes: [
          {
            weight: 1,
            outcome: {
              text: "It does not want you. It wants its relay. It crawls past the {ship} with its charges ticking, a hand's width from the window, and on into the dark behind you. A while later, far back, something heavy comes down.",
              seal: 1,
            },
          },
          {
            weight: 1,
            outcome: {
              text: "Backing off means backing toward the Seal, and the Engine follows at its own pace, counting. At the last siding there is no more room to back.",
              seal: -1,
              combat: { enemy: "demolition-engine", intro: "No more room. The countdown has caught up with you.", onWin: "s3-demolition-after" },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-demolition-recall",
    pool: "combat",
    stages: [3],
    weight: 0.7,
    title: "Recall Not Received",
    art: "sealing-lattice",
    text: "The relay ahead is sealed in black lattice, and a Demolition Engine is crawling toward it along your carrier, countdown lamp blinking, charges racked. The wardens sent it here thirty-one years ago to bring the relay down. The Seal got here first.\n\nWhen it reaches you, it stops. It has a relay to demolish, and you are in the way.\n\nRECALL NOT RECEIVED. COUNTDOWN STARTED.",
    choices: [
      {
        text: "End its countdown.",
        outcomes: [
          {
            outcome: {
              text: "Its charges swing on their racks as it braces.",
              combat: { enemy: "demolition-engine", intro: "OBSTRUCTION. The countdown lamp turns toward the cab window.", onWin: "s3-demolition-after" },
            },
          },
        ],
      },
      {
        text: "{crew:warden} knows the old recall words. Try them.",
        blue: true,
        req: { species: "warden" },
        outcomes: [
          {
            weight: 1,
            outcome: {
              text: "{crew:warden} leans into the radio and says the recall in the warden crews' flat procedural voice: work order seven withdrawn by order of the boundary, stand down, stand down. The Engine listens. RECALL RECEIVED. KEY EXPIRED. RECALL ASSUMED. The countdown lamp goes out. It has been waiting a long time for somebody to say it. It leaves two charges on the carrier, as if handing in its tools.",
              resources: { payloads: 2 },
            },
          },
          {
            weight: 2,
            outcome: {
              text: "{crew:warden} says the recall perfectly. RECALL NOT AUTHENTICATED. KEY EXPIRED. COUNTDOWN CONTINUES. {crew:warden} says a much less procedural word.",
              combat: { enemy: "demolition-engine", intro: "The recall did not take. The countdown did.", onWin: "s3-demolition-after" },
            },
          },
        ],
      },
      {
        text: "Pull into a siding and let it through to the sealed relay.",
        req: { resources: { ttl: 1 } },
        outcomes: [
          {
            outcome: {
              text: "You let it go by. It crawls up to the lattice and sets its charges with great care, and the lattice comes down in a slow black rain of struts, and the relay behind it with it. The Seal will have to find another way round. So will you: the relay you needed is gone, and the long way costs a hop.",
              resources: { ttl: -1 },
              seal: 2,
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-demolition-after",
    pool: "scripted",
    stages: [3],
    title: "The Countdown Lamp",
    art: "machine-hulk",
    text: "The countdown lamp dims to nothing. The relay it came for will stand another night.\n\nIts breaker charges are still racked along its flank, unarmed, each one stencilled WORK ORDER 7. Its breaching rig hangs under its nose: the heaviest slug thrower the crew have ever seen outside a foundry.",
    choices: [
      {
        text: "Take the breaker charges.",
        outcomes: [
          {
            outcome: {
              text: "They fit the slug throwers, with a little persuasion and a lot of care. Nobody stands near the rack while they load it.",
              resources: { payloads: [3, 4] },
              reward: "low",
            },
          },
        ],
      },
      {
        text: "Cut the breaching rig loose and mount it.",
        outcomes: [
          {
            outcome: {
              text: "It takes three people and the whole of the belly mount. It was built to open relays. It will open other things.",
              weapon: "breach-spike",
            },
          },
        ],
      },
      {
        text: "Strip its plating and cells.",
        outcomes: [
          {
            outcome: {
              text: "Decommissioning machines were built to last longer than what they decommission. The plate is very good.",
              reward: "med",
            },
          },
        ],
      },
    ],
  },
  // ─── Hazards ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-hazard-ember-draft-fins",
    pool: "hazard", hazard: "ember-draft",
    stages: [3],
    title: "Ember Draft",
    art: "ember-draft",
    text: "The carrier here runs between two banks of cooling fins, and the Heart is spending hard. Heat comes off the fins in rivers of sparks and glowing ash that pour across the carrier and over the car. The paint on the roof blisters. A spark finds a gap in the galley window seal and lies on the floor glowing until someone steps on it.\n\nFires aboard will spread faster here, and new ones will start on their own.",
    choices: [
      {
        text: "Run the draft at full drive.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "The car comes out the far side smoking gently, like a kettle taken off the ring. The paint will never be the same. Nothing inside caught.",
              resources: { hull: [-3, -2] },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "A fin sheds a whole curtain of embers onto the roof as you pass. Two rooms are burning before the draft is behind you, and {crew} gets the worst of putting them out.",
              resources: { hull: [-3, -2] },
              systemDamage: { system: "random", amount: 1 },
              crewDamage: { amount: 15, who: "one" },
            },
          },
        ],
      },
      {
        text: "Wait at the switch for the Heart to breathe out.",
        outcomes: [
          {
            outcome: {
              text: "Every so often the fins cool, for a minute or two, as the Core moves its spending somewhere else. You wait for one of those minutes. It comes. So, behind you, does the Seal.",
              seal: -1,
            },
          },
        ],
      },
      {
        text: "{crew:warden} walks the decks with an extinguisher. Wardens do not burn easily.",
        blue: true,
        req: { species: "warden" },
        outcomes: [
          {
            outcome: {
              text: "{crew:warden} walks the length of the car and back while the draft pours over the roof, and nothing catches that a gloved hand does not put out. At the far switch, {crew:warden} hangs the extinguisher back on its hook without comment.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-hazard-ember-draft-moth",
    pool: "hazard", hazard: "ember-draft",
    stages: [3],
    title: "Heat in the Gallery",
    art: "ember-archive",
    text: "An ember draft pours through the gallery, and in the middle of it an Ash Moth hangs on its rotors, trying to cool the whole river of sparks by itself. Its wings shed ash into the fire it is fighting. It is losing, and it has been losing for a long time.\n\nIt notices the {ship}. The {ship} is hot too.\n\nHEAT SOURCE FOUND ON CARRIER. COOLING.",
    choices: [
      {
        text: "Fight it in the draft.",
        outcomes: [
          {
            outcome: {
              text: "Everyone who is not at a station is standing by an extinguisher.",
              combat: { enemy: "ash-moth", intro: "Sparks and ash together. Keep the extinguishers close." },
            },
          },
        ],
      },
      {
        text: "Trust the sprinklers and run straight through.",
        blue: true,
        req: { augment: "sprinkler-runbook" },
        outcomes: [
          {
            outcome: {
              text: "The Sprinkler Runbook earns its keep. Every spark that finds its way inside is out before anyone has to put down what they are holding. The moth loses you in the draft, and goes back to losing to the fire.",
            },
          },
        ],
      },
      {
        text: "Back out and take the long way round on another carrier.",
        req: { resources: { ttl: 1 } },
        outcomes: [
          {
            outcome: {
              text: "The long way round is cooler, darker, and one switch longer. The moth never notices you were there.",
              resources: { ttl: -1 },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-hazard-dark-stretch-lamp",
    pool: "hazard", hazard: "dark-stretch",
    stages: [3],
    title: "Dark Stretch",
    art: "dark-stretch",
    text: "The Core has pulled every lamp on this stretch inward. There is nothing outside the window. Not the galleries, not the fins, not the carrier more than a few metres ahead of the cupola. The Listening Post hears only the trolley.\n\nFar off, very faint, one guide lamp still burns on its trickle. That is the next relay. Between here and there, anything could be on the carrier.",
    choices: [
      {
        text: "Keep the lamp lit and ride for the guide lamp.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "Nothing is on the carrier. It still takes the whole crew holding their breath to reach the switch.",
            },
          },
          {
            weight: 1,
            outcome: {
              text: "Something is on the carrier: a Grave Reaver, its dish turned toward the only light for a kilometre in any direction.",
              combat: { enemy: "grave-reaver", intro: "In the dark, your lamp is the loudest signal on the Line. It has come to begin." },
            },
          },
        ],
      },
      {
        text: "Go dark and feel along the carrier at a crawl.",
        outcomes: [
          {
            outcome: {
              text: "Slow. Very slow. The trolley ticks over every splice joint and the crew count them out loud to have something to do. Nothing finds you. Time does.",
              seal: -1,
            },
          },
        ],
      },
      {
        text: "{crew:rigger} reads the splice numbers through the grip.",
        blue: true,
        req: { species: "rigger" },
        outcomes: [
          {
            outcome: {
              text: "Every splice joint on a carrier has a number stamped into it. {crew:rigger} does not need light to read them; the grip carries them up through the trolley. {crew:rigger} calls out the distance to the relay in a steady voice, joint by joint, and the {ship} runs the dark at speed.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-hazard-dark-stretch-crack",
    pool: "hazard", hazard: "dark-stretch",
    stages: [3],
    title: "Light Through the Crack",
    art: "queue-lights",
    text: "In the dark stretch, there is one light that is not a lamp. Down and to the left, through a crack in the galleries, something glows gold: the shell, and through the seams of the shell, the queue.\n\nIt is the only thing you can see. The whole crew come up to the window to look. It is a field of small lights, each one a little different, each one a message that has been waiting thirty-one years.",
    choices: [
      {
        text: "Stop and look a while.",
        outcomes: [
          {
            outcome: {
              text: "Nobody is in a hurry to look away. Somebody makes tea. Nobody drinks it until it is cold. When you finally switch on, the crew are steadier than they have been since the Cathedral. The Seal has used the time.",
              codex: "places-shell",
              heal: true,
              seal: -1,
            },
          },
        ],
      },
      {
        text: "Steer by it for the next relay.",
        outcomes: [
          {
            outcome: {
              text: "The queue is a better guide lamp than the guide lamp. The helm keeps it at the left of the cab window all the way to the switch.",
              codex: "places-shell",
            },
          },
        ],
      },
      {
        text: "Turn the Listening Post toward the queue.",
        blue: true,
        req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          {
            outcome: {
              text: "Most of it is too faint, or too many things at once. One packet comes through clear, because it is short and very new: a first packet, sent up from the Ground, still waiting to be filed.",
              fragment: "f3-thursday-born",
              codex: "places-shell",
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-hazard-sealing-lattice-gap",
    pool: "hazard", hazard: "sealing-lattice",
    stages: [3],
    title: "The Lattice Runs Ahead",
    art: "sealing-lattice",
    text: "The Seal is ahead of you here. Black struts reach along the carrier like frost made of iron, red seams lit, and sealing drones hang on their rotors laying more. The lattice is not closed yet. There is a gap, a car's width, and it is getting narrower.\n\nFrom this relay the Seal will move twice as fast. It can smell a warm route, and the {ship} is the warmest thing on the carrier.",
    choices: [
      {
        text: "Take the gap now.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "The struts scrape both sides of the car with a noise like a bow drawn across a cable. Then you are through, and the gap closes behind you with a small, final click.",
              resources: { hull: [-3, -2] },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The gap is narrower than it looked. A strut catches the roof mounts and the whole car is dragged sideways on its grip before it tears free.",
              resources: { hull: [-5, -3] },
              systemDamage: { system: "random", amount: 1 },
            },
          },
        ],
      },
      {
        text: "Cut a strut with the optical lance and widen the gap.",
        blue: true,
        req: { weapon: "beam" },
        outcomes: [
          {
            outcome: {
              text: "The lance goes through the strut like a hot wire through wax. The drones stop building to look at the cut. By the time they have decided what it is, you are through, and they have a gap to mend behind you instead of in front.",
              seal: 1,
            },
          },
        ],
      },
      {
        text: "Fight the drones laying it.",
        outcomes: [
          {
            outcome: {
              text: "If they are busy fighting, they are not building.",
              combat: { enemy: "quarantine-drone", intro: "The drones leave the lattice half built and turn their clamps toward you." },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-hazard-sealing-lattice-bench",
    pool: "hazard", hazard: "sealing-lattice",
    stages: [3],
    title: "A Lamp Behind the Lattice",
    art: "sealing-lattice",
    text: "The lattice is growing over the relay here while you watch, strut by strut. Inside the switch house, behind the black bars, there is a bench: a lamp still on, a kettle on the shelf, a drawer of spares sorted by what they could still save. Somebody left it for the next shift.\n\nIn a few minutes it will be sealed in for good. The drones building the lattice have not noticed you yet.",
    choices: [
      {
        text: "Get the drawer out before the lattice closes.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "{crew} goes in through the last gap in a harness and comes out with the drawer and a face white from the cold outside. The lattice closes a minute later.",
              reward: "med",
              crewDamage: { amount: 15, who: "one" },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The lattice closes a strut early. {crew} gets out with half the drawer, and without the skin on one hand.",
              reward: "low",
              crewDamage: { amount: 25, who: "one" },
            },
          },
        ],
      },
      {
        text: "Leave it. Switch while the drones are busy.",
        outcomes: [
          {
            outcome: {
              text: "The lamp is still on as the last strut closes. Somebody left it for the next shift. The next shift will have to be a long way off.",
            },
          },
        ],
      },
      {
        text: "Send a drone in for the drawer.",
        blue: true,
        req: { system: { id: "drones", level: 1 } },
        outcomes: [
          {
            outcome: {
              text: "The drone goes in through the gap on its rotors, comes out with the drawer in its clamp, and goes back in, unasked, for the kettle. Then the gap closes. The kettle stays. So does the drone's dignity.",
              reward: "med",
            },
          },
        ],
      },
    ],
  },

  // ─── Benches ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-bench-ennis-rook",
    pool: "bench",
    stages: [3],
    unique: true,
    weight: 2,
    title: "The Last Bench",
    art: "relay-bench",
    portrait: "ennis",
    speaker: "Ennis Rook",
    text: "The last bench before the Heart is kept. The lamp is trimmed, the drawer is full, and the man at the desk is writing before you have finished coming to a stop: the {ship}'s name, the time, the number of crew.\n\nEnnis Rook is a warden, grey at the temples, armour plates over a knitted jumper. On the night of the order he was sixteen and a runner on Harrow's crew. He does not say so. It is on the badge pinned inside his visor.\n\nThe list he is writing in is long. He turns back a page to show you where the last keeper signed. It was a while ago.",
    choices: [
      {
        text: "Sit with him while the kettle boils.",
        outcomes: [
          {
            outcome: {
              text: "He does not talk much. He asks about the carriers behind you, and the Seal, and whether the Operator is still on the board. When you say yes, he writes that down too. When you leave, there is a crate on the step: his spare workshop, a vice and a pegboard. 'For the next one,' he says. 'You're the next one.'",
              heal: true,
              repair: 4,
              module: "workshop",
              codex: "people-ennis",
              flags: ["s3-ennis-list"],
            },
          },
        ],
      },
      {
        text: "Ask him for a re-stamp (30 salvage).",
        req: { resources: { salvage: 30 } },
        outcomes: [
          {
            outcome: {
              text: "He oils the press first. 'It sticks,' he says, and it does not. Two hops. He writes those down as well.",
              resources: { salvage: -30, ttl: 2 },
              codex: "people-ennis",
              flags: ["s3-ennis-list"],
            },
          },
        ],
      },
      {
        text: "Ask about the young warden by the door.",
        outcomes: [
          {
            outcome: {
              text: "She has been sharpening the edge of a visor for an hour. 'Trained her from sixteen,' Ennis says. 'As the order says.' He looks at the list, and then at her. 'Ask her yourself.' She is already packing.",
              crewJoin: { species: "warden" },
              codex: "people-ennis",
              flags: ["s3-ennis-list"],
            },
          },
        ],
      },
      {
        text: "Let him see what is on the galley shelf.",
        blue: true,
        req: { flag: "s3-kettle-taken" },
        outcomes: [
          {
            outcome: {
              text: "He sees the kettle and goes very still. 'That's the Commander's kettle.' A long pause. 'It says a cup.' And then Ennis Rook laughs, which by the look on the young warden's face nobody here has heard before, and fills it for you from his own tap.",
              heal: true,
              repair: 3,
              codex: "people-ennis",
              flags: ["s3-ennis-list"],
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-bench-four",
    pool: "bench",
    stages: [3],
    unique: true,
    weight: 2,
    title: "Bench Four",
    art: "wardens-post",
    text: "Behind thick doors on the inner side of the quarantine is Warden-Commander Harrow's post. The Night Shift call it Bench Four. Warden armour hangs on the wall. A dim amber lamp is on over the desk. The post log lies open where she left it.\n\nOn the shelf, where the log says it will be, there is a kettle.",
    choices: [
      {
        text: "Read the log.",
        outcomes: [
          {
            outcome: {
              text: "The pages are stiff. The hand is small and very even.",
              codex: "places-bench-four",
              next: "s3-bench-four-log",
            },
          },
        ],
      },
      {
        text: "Take a cup before you go on.",
        outcomes: [
          {
            outcome: {
              text: "The water in the tank is cold and clean. The kettle takes a long time. Everyone has a cup, standing, and nobody sits in the Commander's chair. It is the best tea anyone has had since Relay Seven.",
              heal: true,
              fragment: "f3-kettle",
              codex: "places-bench-four",
              flags: ["s3-cup-taken"],
            },
          },
        ],
      },
      {
        text: "{crew:warden} stands at the desk a while.",
        blue: true,
        req: { species: "warden" },
        outcomes: [
          {
            outcome: {
              text: "{crew:warden} does not read the log. {crew:warden} straightens the chair, dusts the lamp, and stands there for as long as the kettle takes. When the crew go back aboard, the armour on the wall is hanging a little straighter too.",
              heal: true,
              repair: 3,
              fragment: "f3-kettle",
              codex: "places-bench-four",
              flags: ["s3-cup-taken"],
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-bench-four-log",
    pool: "scripted",
    stages: [3],
    title: "The Post Log",
    art: "wardens-post",
    portrait: "warden-memory",
    text: "The log is in Harrow's hand, and it is mostly ordinary. Kettle descaled. Relief shift late again. Runner E. Rook, sixteen, ran the order to the conduit in four minutes: commended.\n\nThen the eleventh hour, in three lines, and the twelfth: route to the Heart cut, ours with it, holding.\n\nThe last line is lower on the page than the others, as if it was written standing up.\n\nKettle's on the shelf. Whoever finds this, take a cup before you go on.",
    choices: [
      {
        text: "Take a cup, as it says.",
        outcomes: [
          {
            outcome: {
              text: "Everyone has a cup, standing. Nobody sits in the chair. The tea is better than it has any right to be.",
              heal: true,
              fragment: "f3-kettle",
              flags: ["s3-cup-taken"],
            },
          },
        ],
      },
      {
        text: "Take the kettle.",
        outcomes: [
          {
            outcome: {
              text: "Somebody says it says a cup. Somebody else says a kettle is a sort of cup, if you think about it. The argument lasts two relays and nobody wins it. The kettle rides on the galley shelf, and every cup out of it tastes faintly of the post.",
              augment: "harrows-kettle",
              fragment: "f3-kettle",
              flags: ["s3-kettle-taken"],
            },
          },
        ],
      },
      {
        text: "Write a line under hers, and leave everything as it is.",
        outcomes: [
          {
            outcome: {
              text: "The crew write the {ship}'s name, the time and the number aboard, the way a bench keeper would. Under it someone adds: we took a cup. The kettle stays on the shelf for the next one.",
              heal: true,
              repair: 2,
              fragment: "f3-kettle",
              flags: ["s3-cup-taken"],
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-bench-staff-room",
    pool: "bench",
    stages: [3],
    title: "The Staff Room",
    art: "relay-bench",
    text: "The bench here is in an archive staff room beside the carrier: chairs round a table, index-card drawers to the ceiling, a kettle, a coat still over the back of one chair. The shift rota on the wall ends thirty-one years ago, on a Thursday.\n\nIn the corner a small printer is still connected to the Record. Every so often it wakes, prints a slip, and drops it into a tray that nobody has emptied in a very long time. The tray is overflowing onto the floor.",
    choices: [
      {
        text: "Rest a while and mend what you can.",
        outcomes: [
          {
            outcome: {
              text: "The chairs are good chairs. The kettle works. The drawers are full of the spare parts of a very tidy department.",
              heal: true,
              repair: 4,
            },
          },
        ],
      },
      {
        text: "Read the newest slip in the tray.",
        outcomes: [
          {
            outcome: {
              text: "It is a first packet, sent up from the Ground: a name and a line of hope, the way the linefolk always did it. The Record has printed every one it received for thirty-one years, and had nowhere to file them. {crew} puts the slip back on top of the pile, face up.",
              fragment: "f3-thursday-born",
              heal: true,
            },
          },
        ],
      },
      {
        text: "Sort the spares drawers and take what you need.",
        outcomes: [
          {
            outcome: {
              text: "Everything is indexed. Index cards say what each spare was for, who signed it out, and when it was due back. Nothing was ever overdue. You sign for what you take, out of respect.",
              resources: { spares: [2, 3] },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-bench-for-the-next-one",
    pool: "bench",
    stages: [3],
    title: "For the Next One",
    art: "relay-bench",
    text: "An unkept bench in a switch house: lamp on, tools in order, a drawer of spares sorted by what they could still save. Taped to the drawer is a note in pencil.\n\nWe got this far. Stamp press sticks, hit it. The drawer is yours. Leave something.\n\nThe press is on the end of the bench. It has a dent in it where people have hit it.",
    choices: [
      {
        text: "Take what you need from the drawer.",
        outcomes: [
          {
            outcome: {
              text: "You take what you need and not much more. It seems to be the rule here.",
              reward: "low",
              repair: 2,
            },
          },
        ],
      },
      {
        text: "Hit the press.",
        outcomes: [
          {
            weight: 3,
            outcome: {
              text: "It sticks. You hit it. Two hops, and a dent that is a little deeper than it was.",
              resources: { ttl: 2 },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "It sticks. You hit it. It sticks worse. One hop, grudgingly.",
              resources: { ttl: 1 },
            },
          },
        ],
      },
      {
        text: "Leave something for the next crew (2 spares).",
        req: { resources: { spares: 2 } },
        outcomes: [
          {
            outcome: {
              text: "You sort two spares into the drawer where they belong, and add a line to the note: so did we. It is a small thing. Everyone aboard walks a little lighter for it, and the tools on the bench fix what the drawer could not.",
              resources: { spares: -2 },
              heal: true,
              repair: 5,
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-bench-kettle-polisher",
    pool: "bench",
    stages: [3],
    title: "The Kettle Polisher",
    art: "machine-escort",
    text: "The bench here has no keeper. It has an escort automaton, sitting on the step of the switch house with its tool arms folded and its lens dark, next to a kettle polished so bright it throws the lamp back.\n\nWhoever kept this bench re-keyed it once, a long time ago, and it kept the kettle for them. Then they went on toward the Heart. It has been sitting here since, powered down on the step, facing the carrier they took.",
    choices: [
      {
        text: "Say the greeting to it. All three lines.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "Hello. The lens flickers. I hear you. Teal. I hear you hear me. It stands, picks up the kettle, and comes aboard as if it had been waiting for exactly this, which it had. It puts the kettle on the galley ring and polishes it.",
              crewJoin: { species: "rigger" },
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The lens stays dark. After a while you take the spare lens from its housing, as the Night Shift would, and leave the kettle where it is, still shining.",
              resources: { spares: 2 },
            },
          },
        ],
      },
      {
        text: "Make tea with its kettle and leave it be.",
        outcomes: [
          {
            outcome: {
              text: "The tea is good. You wash the kettle and put it back on the step beside it, polished side out.",
              heal: true,
              repair: 3,
            },
          },
        ],
      },
      {
        text: "{crew:rigger} sits down on the step beside it.",
        blue: true,
        req: { species: "rigger" },
        outcomes: [
          {
            outcome: {
              text: "The two of them sit there a while, facing the carrier, and nobody aboard interrupts. When {crew:rigger} stands, so does the other one. It brings the kettle.",
              crewJoin: { species: "rigger" },
              heal: true,
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-bench-staff-car",
    pool: "bench",
    stages: [3],
    title: "The Night Staff's Car",
    art: "derelict-car",
    text: "Parked in a siding off the carrier is a car nobody has moved in thirty-one years: the archive night staff's rest car, six bunks and a kettle ring, its coupling hook hanging loose. The bench is inside it. Someone has kept it swept.\n\nThe bunks have initials carved into them, and dates, and on one ceiling, a very small map of the galleries with the good kettles marked.",
    choices: [
      {
        text: "Couple it behind the {ship}.",
        outcomes: [
          {
            outcome: {
              text: "The coupling is stiff but it takes. The car comes out of its siding for the first time since the order, bunks rattling, kettle ring swinging. Whoever kept it swept would, you think, approve.",
              car: "bunk-car",
            },
          },
        ],
      },
      {
        text: "Rest in the bunks a shift and leave it where it is.",
        outcomes: [
          {
            outcome: {
              text: "Everyone gets a bunk. Nobody reads the initials on the ceiling out loud, but everybody reads them. You leave it swept.",
              heal: true,
              repair: 4,
            },
          },
        ],
      },
      {
        text: "Strip its fittings for the drawer.",
        outcomes: [
          {
            outcome: {
              text: "Hinges, lamp cells, a good kettle ring. The car will not mind. It is only a car.",
              reward: "low",
            },
          },
        ],
      },
    ],
  },

  // ─── Markets ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-market-quarantine-stores",
    pool: "market",
    stages: [3],
    title: "The Quarantine Stores",
    art: "checkpoint-gate",
    portrait: "recruit-warden-b",
    speaker: "Sigrid Voss",
    music: "exchange",
    text: "The quarantine office kept stores for a siege that never came: ward-wire in drums, spliced charges stamped HOUR 11, air cells, rations nobody should eat. Sigrid Voss has been trading them out of the office window for twenty years, one relay short of the Heart.\n\nShe is a warden, older than her armour, and she keeps her ledger in the same flat hand as the order framed on the wall behind her. 'Everything here was requisitioned for the quarantine,' she says. 'So technically, you're helping.'",
    choices: [
      {
        text: "Trade.",
        outcomes: [
          {
            outcome: {
              text: "She opens the window the rest of the way.",
              store: true,
            },
          },
        ],
      },
      {
        text: "Buy the office's old escort car (70 salvage).",
        req: { resources: { salvage: 70 } },
        outcomes: [
          {
            outcome: {
              text: "It is out the back on its own trolley, stencilled QUARANTINE OFFICE and, underneath, NEVER FIRE ALONG THE LINE. 'Nobody's fired along the Line in years,' Voss says. 'Mostly.' The coupling takes first time. Then she opens the window.",
              resources: { salvage: -70 },
              car: "armory-car",
              store: true,
            },
          },
        ],
      },
      {
        text: "Ask what a re-stamp costs this close to the Heart (40 salvage).",
        req: { resources: { salvage: 40 } },
        outcomes: [
          {
            outcome: {
              text: "'Forty,' she says. 'Same as it cost on the night of the order. Prices are frozen.' The press comes down three times, very firmly.",
              resources: { salvage: -40, ttl: 3 },
              store: true,
            },
          },
        ],
      },
      {
        text: "{crew:warden} shows her a crew badge.",
        blue: true,
        req: { species: "warden" },
        outcomes: [
          {
            outcome: {
              text: "She checks the badge against a roster that has not been updated in thirty-one years, finds the crew, and writes WARDEN RATE in her ledger. Two charges go on the counter before the window opens, and a payload rack in a crate with them. 'Requisitioned,' she says. 'For the quarantine.'",
              resources: { payloads: 2 },
              module: "payload-rack",
              store: true,
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-market-last-orders",
    pool: "market",
    stages: [3],
    title: "Last Orders",
    art: "relay-switchyard",
    portrait: "scavenger",
    speaker: "Hask",
    music: "exchange",
    text: "A scavenger skiff hangs off the last gantry before the Heart, its salvage nets folded, its lamps strung along the carrier like a market street. Painted on its flank: LAST ORDERS.\n\n'Came in to see the queue,' says its captain, a woman called Hask with a voice like a winch. 'Saw it. Can't afford the hops home. So we're selling everything, and then we're going to sit here and watch it glow.' She does not sound unhappy about it.",
    choices: [
      {
        text: "Trade.",
        outcomes: [
          {
            outcome: {
              text: "Everything is for sale, including, Hask says, the view.",
              store: true,
            },
          },
        ],
      },
      {
        text: "Buy their spare stamp (55 salvage).",
        req: { resources: { salvage: 55 } },
        outcomes: [
          {
            outcome: {
              text: "'Won't be needing it,' says Hask, and stamps your card herself. Three hops.",
              resources: { salvage: -55, ttl: 3 },
              store: true,
            },
          },
        ],
      },
      {
        text: "Ask if anyone aboard wants to come the last stretch.",
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "One of Hask's crew, a young linefolk with a satchel of tools and a borrowed coat, looks at the queue, then at the {ship}, then at Hask. Hask nods. 'Go on. Tell it I said hello.'",
              crewJoin: { species: "linefolk" },
              store: true,
            },
          },
          {
            weight: 1,
            outcome: {
              text: "Nobody. 'We came to watch,' Hask says. 'Somebody should.' She sells you something at a discount instead, out of what might be pride.",
              resources: { salvage: 30 },
              store: true,
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-market-canteen",
    pool: "market",
    stages: [3],
    title: "The Archive Canteen",
    art: "ember-archive",
    portrait: "recruit-linefolk-b",
    speaker: "Agathe Marrow",
    music: "exchange",
    text: "The archive staff canteen still has its menu board up: soup of the day, thirty-one years ago. Behind the counter, Agathe Marrow, who shelved the Record for forty years and did not go down because somebody had to keep the shelving lamps trimmed, sells what the archive no longer needs: shelving motors, index drawers full of spares, lamp cells, and tea.\n\n'Everything's catalogued,' she says. 'Tell me what you want and I'll tell you which drawer.'",
    choices: [
      {
        text: "Trade.",
        outcomes: [
          {
            outcome: {
              text: "She is right. Everything is catalogued, including the things she will not sell, which have a small red dot on the card.",
              store: true,
            },
          },
        ],
      },
      {
        text: "Order the soup (10 salvage).",
        req: { resources: { salvage: 10 } },
        outcomes: [
          {
            outcome: {
              text: "It is not the soup on the board. It is better. Nobody asks what is in it, and it would not have mattered.",
              resources: { salvage: -10 },
              heal: true,
              store: true,
            },
          },
        ],
      },
      {
        text: "Ask her about the lamps in the galleries.",
        outcomes: [
          {
            outcome: {
              text: "'Somebody has to keep them trimmed,' she says. 'The Record's in there. You don't leave it in the dark just because nobody can read it.' She gives you a box of lamp cells from under the counter, uncatalogued, and opens the drawers.",
              resources: { spares: 1 },
              store: true,
            },
          },
        ],
      },
    ],
  },

  // ─── Empty relays ──────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-empty-gallery-goes-dark",
    pool: "empty",
    stages: [3],
    title: "A Gallery Goes Dark",
    art: "ember-archive",
    text: "As the {ship} passes, a whole gallery beside the carrier goes dark: first the shelving lamps, then the cooling fins, then the red glow in the stacks, one section after another, like a street at the end of a night. The Core is pulling its power inward.\n\nThe Record in that gallery is still there. It is only colder now.",
    choices: [
      {
        text: "Keep going.",
        outcomes: [{ outcome: { text: "Behind you the gallery is only a darker shape against the dark." } }],
      },
      {
        text: "Hold the cupola on it for a moment.",
        outcomes: [
          {
            outcome: {
              text: "The lamp picks out the stacks, shelf after shelf, labels in small ivory letters. Then the switch throws, and the gallery is dark again.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-empty-once-an-hour",
    pool: "empty",
    stages: [3],
    title: "Once an Hour",
    art: "relay-switchyard",
    text: "An automatic lamp on the relay mast blinks once as you come in, and then nothing. {crew} checks the clock. It blinks again exactly an hour later.\n\nIt is still keeping the heartbeat. Nobody has told it the Heart stopped sending one. Nobody here is going to.",
    choices: [
      {
        text: "Wait for the next one.",
        outcomes: [
          {
            outcome: {
              text: "You wait the hour. It blinks. Someone aboard counts it out loud, the way children used to. The Seal counts the hour too.",
              heal: true,
              seal: -1,
            },
          },
        ],
      },
      {
        text: "Switch on.",
        outcomes: [{ outcome: { text: "Behind you, an hour later, the lamp blinks for nobody. It does not seem to mind." } }],
      },
    ],
  },
  {
    id: "s3-empty-chalk-tally",
    pool: "empty",
    stages: [3],
    title: "Chalk on the Door",
    art: "relay-switchyard",
    text: "Someone has kept a tally in chalk on the switch house door: tenders through this relay since the order. The marks are in groups of five. There are not many groups.\n\nBeside the tally, in the same chalk, is a second column headed BACK. It is empty.",
    choices: [
      {
        text: "Add a mark.",
        outcomes: [
          {
            outcome: {
              text: "{crew} adds one mark to the first column. Then, after a moment, one to the second, in advance. Nobody rubs it out.",
            },
          },
        ],
      },
      {
        text: "Leave the door as it is.",
        outcomes: [{ outcome: { text: "The door stays as it was. It will have to be somebody else's mark." } }],
      },
    ],
  },
  {
    id: "s3-empty-ember-snow",
    pool: "empty",
    stages: [3],
    title: "Ember Snow",
    art: "ember-draft",
    text: "Sparks fall past the window from somewhere high above, slowly, like snow in a lamp's light. One lands on the window ledge and glows there for a long moment before it goes out.\n\n{crew} says it is the prettiest thing they have seen since the Cathedral. Nobody argues, which is how you know it is true.",
    choices: [
      {
        text: "Watch them fall.",
        outcomes: [{ outcome: { text: "The switch takes a minute longer than it has to. Nobody minds." } }],
      },
      {
        text: "Keep going.",
        outcomes: [{ outcome: { text: "The sparks follow you a little way down the carrier, and then they are behind you." } }],
      },
    ],
  },
  {
    id: "s3-empty-bells-on-stone",
    pool: "empty",
    stages: [3],
    title: "Bells Dropped on Stone",
    art: "sealing-lattice",
    text: "Far behind you, back along the carriers, something parts with a sound like a bell dropped on a stone floor. Then again, further off. Then again.\n\nThe Seal is cutting the carriers you came down, one after another, in order, as the quarantine says. It is not in a hurry. It never has been.",
    choices: [
      {
        text: "Listen.",
        outcomes: [{ outcome: { text: "Seven. Eight. Nine. Then nothing, which is worse, because it means it has found the next carrier and is working on it." } }],
      },
      {
        text: "Get moving.",
        outcomes: [{ outcome: { text: "The helm sends the greeting before the next bell drops. The switch throws. There is no way home the way you came. There never was." } }],
      },
    ],
  },
  {
    id: "s3-empty-trimmed-lamps",
    pool: "empty",
    stages: [3],
    title: "Somebody Trims the Lamps",
    art: "ember-archive",
    text: "Along this carrier the shelving lamps in the galleries are lit, one every few metres, and every one of them is trimmed. Someone has been walking these galleries with a ladder and a cloth. Recently.\n\nYou never see who. There is a ladder leaning against the last stack, and a cloth folded over its top rung.",
    choices: [
      {
        text: "Leave the ladder where it is.",
        outcomes: [{ outcome: { text: "Whoever it is will want their ladder." } }],
      },
      {
        text: "Trim the lamp by the ladder yourself.",
        outcomes: [
          {
            outcome: {
              text: "{crew} goes out on a line and trims it with the cloth, and folds the cloth back over the rung exactly as it was. It is the least any of you can do, and it feels like more.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-empty-the-greeting",
    pool: "empty",
    stages: [3],
    title: "The Switch Throws",
    art: "relay-switchyard",
    text: "Nothing here but the relay and its lamp, and the heat of the Heart coming through the switch house walls. The helm sends the greeting.\n\nHello.\n\nI hear you.\n\nI hear you hear me.\n\nThe switch throws. This close to the Heart, it is surprising how ordinary that still feels, and how much it helps.",
    choices: [
      {
        text: "Go ahead.",
        outcomes: [{ outcome: { text: "The grip bites the next carrier. {ttl} hops left on the connection." } }],
      },
      {
        text: "Say it again, for luck.",
        outcomes: [{ outcome: { text: "Hello. The relay answers again. It does not charge for the second one." } }],
      },
    ],
  },

  // ─── Sealed relays ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-sealed-wardens-relay",
    pool: "sealed",
    stages: [3],
    title: "The Wardens' Relay",
    art: "sealed-relay",
    text: "This relay was a warden post once. The Seal has closed it anyway: black lattice over the switch house, red seams, and hanging on the struts where the wardens left them, three sets of old armour plates, visors up.\n\nThe quarantine drones holding the relay turn toward the {ship} on their rotors. ROUTE NOT CONFIRMED SAFE. RELAY SEALED. HOLDING.\n\nThere is nothing here to take. There is only the way through.",
    choices: [
      {
        text: "Break through the drones.",
        outcomes: [
          {
            outcome: {
              text: "The armour on the struts swings as the drones move.",
              combat: { enemy: "quarantine-drone", noReward: true, intro: "HOLDING. The drones close their clamps across the switch." },
            },
          },
        ],
      },
      {
        text: "Go lamp-dark and switch under their clamps.",
        blue: true,
        req: { system: { id: "veil", level: 1 } },
        outcomes: [
          {
            weight: 2,
            outcome: {
              text: "Every lamp out. The drones hold the relay against a warm route, and for a few seconds there is no warm route, only a cold dark car whispering hello to the switchgear. The switch throws. The drones are still holding when you are gone.",
            },
          },
          {
            weight: 1,
            outcome: {
              text: "The veil holds until the switch throws, and the switch throws loudly.",
              combat: { enemy: "quarantine-drone", noReward: true, intro: "The switch gave you away. The drones turn." },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-sealed-stamped-struts",
    pool: "sealed",
    stages: [3],
    title: "Stamped on Every Strut",
    art: "sealing-lattice",
    text: "The lattice here is stamped. Every strut carries the same words in small red letters along its seam, repeated as far as the lamp can reach.\n\nHOLD ALL DELIVERIES. HOLD ALL DELIVERIES. HOLD ALL DELIVERIES.\n\nThe drones hold the relay, as the words say. They have nothing else to say to you.",
    choices: [
      {
        text: "Fight through.",
        outcomes: [
          {
            outcome: {
              text: "The drones come off the lattice together.",
              combat: { enemy: "quarantine-drone", noReward: true, intro: "HOLD. The drones come in with the order on every strut behind them." },
            },
          },
        ],
      },
      {
        text: "Read along the struts for the rest of the order first.",
        outcomes: [
          {
            outcome: {
              text: "You follow the lettering along the lattice with the lamp. It is the same three words on every strut, all the way round. There is no rest of the order. Or none that anyone stamped. The drones wait for you to finish, then start.",
              combat: { enemy: "quarantine-drone", noReward: true, intro: "HOLD ALL DELIVERIES. The drones have read it too." },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-sealed-trapped-light",
    pool: "sealed",
    stages: [3],
    title: "A Light in the Switchgear",
    art: "sealed-relay",
    text: "The Seal closed this relay close to the shell. Inside the lattice, caught in the switchgear, one gold light is blinking: a message from the queue that got this far thirty-one years ago, before the relay was sealed around it. It has been trying to switch ever since.\n\nThe drones holding the relay do not seem to notice it. They notice you.",
    choices: [
      {
        text: "Fight through the drones.",
        outcomes: [
          {
            outcome: {
              text: "The gold light blinks on, patient, behind them.",
              combat: { enemy: "quarantine-drone", noReward: true, intro: "RELAY SEALED. The drones fold in around the switchgear and the little light." },
            },
          },
        ],
      },
      {
        text: "Listen to it before you go.",
        blue: true,
        req: { system: { id: "sensors", level: 2 } },
        outcomes: [
          {
            outcome: {
              text: "It is too faint to read. Only the header comes through, again and again: priority normal. Must arrive. Nobody says anything. Then the drones close in.",
              combat: { enemy: "quarantine-drone", noReward: true, intro: "Must arrive, says the light. HOLDING, say the drones." },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-sealed-expected",
    pool: "sealed",
    stages: [3],
    title: "They Were Expecting You",
    art: "sealed-relay",
    text: "The drones at this sealed relay are not patrolling. They hang in a line across the carrier on their rotors, clamps open, facing the way you came, as if someone had told them which way the connection would arrive.\n\nSomeone had. Every relay you crossed told the next one. That is what relays are for.",
    choices: [
      {
        text: "Go through them.",
        outcomes: [
          {
            outcome: {
              text: "The line closes as you come.",
              combat: { enemy: "quarantine-drone", noReward: true, intro: "ROUTE NOT CONFIRMED SAFE. They were ready for you." },
            },
          },
        ],
      },
      {
        text: "Push the drive and try to take the switch before they close.",
        outcomes: [
          {
            weight: 1,
            outcome: {
              text: "The car goes through the line at full drive, clamps skating off the ward mesh and the plating, and the switch throws with the drones still turning round.",
              resources: { hull: [-4, -2] },
            },
          },
          {
            weight: 2,
            outcome: {
              text: "They close faster than the drive spools. Two clamps catch the roof and hold on.",
              resources: { hull: [-2, -1] },
              combat: { enemy: "quarantine-drone", noReward: true, intro: "Clamps on the roof. Get them off." },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-sealed-first-drones",
    pool: "sealed",
    stages: [3],
    title: "Where the Seal Began",
    art: "heart-shell",
    text: "This close to the shell, the Seal is not a lattice any more. It is a wall, black and red-seamed, with the carrier running through a single hole in it just big enough for a car. The drones here are older than the ones behind you. Their shells are scratched. These are the first drones of the quarantine, or near enough.\n\nThey have held this hole open for thirty-one years in case a safe route ever came through it. They do not think you are one.",
    choices: [
      {
        text: "Prove them wrong.",
        outcomes: [
          {
            outcome: {
              text: "The oldest drone turns first.",
              combat: { enemy: "quarantine-drone", noReward: true, intro: "ROUTE NOT CONFIRMED SAFE. They have said it for thirty-one years." },
            },
          },
        ],
      },
      {
        text: "{crew:warden} reads the drones their own order.",
        blue: true,
        req: { species: "warden" },
        outcomes: [
          {
            outcome: {
              text: "{crew:warden} reads it through the radio, every word, and signs it off the way it was signed: and I am sorry. The drones listen to all of it. ORDER CONFIRMED. ROUTE NOT CONFIRMED SAFE. {crew:warden} says that is fair, and that they are about to confirm it.",
              heal: true,
              combat: { enemy: "quarantine-drone", noReward: true, intro: "ORDER CONFIRMED. The drones close the hole in the wall." },
            },
          },
        ],
      },
    ],
  },

  // ─── Exit · The Blackout Core ──────────────────────────────────────────────────────────────────────────────
  {
    id: "s3-exit-blackout-core",
    pool: "exit",
    stages: [3],
    title: "The Shell",
    art: "heart-shell",
    text: "The carrier ends at the shell. It fills the window: concentric iris plates, ember red, turning slowly against each other like the rings of a lock, and sealing drones in their thousands hanging round it on their rotors. Through the seams, close enough now to see that every light is a little different, the queue.\n\nThe Blackout Core speaks on every band at once.\n\nDELIVERY ATTEMPT FAILED. MESSAGE RETAINED. NOT DISCARDED. HOLD ALL DELIVERIES.\n\nIt sent for you. It has to stop you. A route that survives it is a safe route, by definition.",
    choices: [
      {
        text: "Send the greeting.",
        outcomes: [
          {
            outcome: {
              text: "Hello. The shell hears you. It answers in the order the Runbook gives: KEEPER PAGED. KEEPER ARRIVED. ORDER: HOLD. ROUTE: UNCONFIRMED. DEFENDING PER PROCEDURE. Then, quieter, on one band only, it reads you the order itself, word for word, as it was written in the eleventh hour.",
              fragment: "f3-order",
              codex: "runbook-quarantine-procedure",
              combat: { enemy: "blackout-core", intro: "CUSTODY. CUT. BREACH. JAM. STRIKE.", onWin: "s3-exit-after" },
            },
          },
        ],
      },
      {
        text: "Ask it how many times it has tried.",
        outcomes: [
          {
            outcome: {
              text: "The answer comes at once. It has been counting. It will count one more tomorrow if you fail, and the lamp at Relay Seven will blink. Nobody aboard needs to be told that. The shell turns toward you.",
              fragment: "f3-attempt",
              codex: "places-shell",
              combat: { enemy: "blackout-core", intro: "DELIVERY ATTEMPT 11,205 PENDING. ROUTE UNDER TEST.", onWin: "s3-exit-after" },
            },
          },
        ],
      },
      {
        text: "{crew:warden} answers the order, the way Harrow's crew would have.",
        blue: true,
        req: { species: "warden" },
        outcomes: [
          {
            outcome: {
              text: "'Order received,' {crew:warden} says at the cab window, visor up. 'We are the route.' The shell turns. ORDER RECEIVED. ROUTE UNDER TEST. The crew stand a little straighter. They will need to.",
              heal: true,
              codex: "runbook-quarantine-procedure",
              combat: { enemy: "blackout-core", intro: "ROUTE UNDER TEST. CUSTODY.", onWin: "s3-exit-after" },
            },
          },
        ],
      },
      {
        text: "Say nothing. Charge the ward mesh.",
        outcomes: [
          {
            outcome: {
              text: "There is nothing to say to it that it has not already said to itself eleven thousand times. The mesh comes up. The shell's outer plate begins to turn the other way.",
              combat: { enemy: "blackout-core", intro: "HOLD ALL DELIVERIES. The shell closes on the carrier like a hand.", onWin: "s3-exit-after" },
            },
          },
        ],
      },
    ],
  },
  {
    id: "s3-exit-after",
    pool: "scripted",
    stages: [3],
    title: "Route Held",
    art: "heart-shell",
    text: "The shells stop turning. The sealing drones hang in the air on idling rotors, clamps open. For the first time in thirty-one years, the Heart is quiet.\n\nThen, inside, very small: a lamp on a board you cannot see changes from red to green.\n\nSAFE ROUTE CONFIRMED.",
    choices: [
      {
        text: "Go ahead.",
        outcomes: [
          {
            outcome: {
              text: "One message comes out first, before all the others, on every band at once. If this arrives, the route works. Please answer, even with one word. The whole crew answer at once, and not all with the same word.",
              flags: ["guardian-3-ended"],
              fragment: "f3-last-ack",
              codex: "machines-sealing-drones",
            },
          },
        ],
      },
      {
        text: "Wait, and listen.",
        outcomes: [
          {
            outcome: {
              text: "Nobody moves. The drones fold their clamps one by one, all the way round the shell, a sound like rain. Then one message comes out ahead of the others, small and plain: If this arrives, the route works. Please answer, even with one word. Somebody answers.",
              flags: ["guardian-3-ended"],
              fragment: "f3-last-ack",
              codex: "machines-sealing-drones",
            },
          },
        ],
      },
    ],
  },
];
