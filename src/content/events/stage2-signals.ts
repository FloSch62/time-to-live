// Stage II · The Glass Cathedral — relay events and unknown signals (pools "event" and "distress"),
// with their scripted follow-ups. Beautiful and eerie: bells, fog, frost, voices sealed in glass.
import type { EventDef } from "../../game/types.ts";

export const STAGE2_SIGNALS_FLAGS: Record<string, string> = {
  "s2-wedding-heard": "Heard the whole wedding message out of a Cathedral pane (postponed, not cancelled).",
  "s2-patience-lit": "Relit the lamp of the echo tender Patience and let it run its round.",
};

export const STAGE2_SIGNALS: EventDef[] = [
  // ─── Events ────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-wedding-pane", cast: "human", pool: "event", stages: [2], unique: true,
    title: "Half a Sentence", art: "cathedral-nave",
    text: "The carrier runs close along a nave wall, and as the lamp crosses one pane the glass speaks. A woman's voice, warm, a little out of breath: \"—not cancelled, just postponed, so keep your good—\"\n\nThen the pane goes quiet. When the lamp crosses it again, it says the same half sentence, in the same breath.\n\n{crew} has stopped with a mug halfway up.",
    choices: [
      {
        text: "Hold the lamp on the pane and listen. It may take a while.",
        outcomes: [
          { weight: 2, outcome: {
            text: "You hold the lamp steady for a long time. The glass gives up a little more on every pass, like a shy child: both families, the bells, the good clothes. Then, all at once, the whole of it.",
            fragment: "f2-wedding", flags: ["s2-wedding-heard"],
          } },
          { weight: 1, outcome: {
            text: "The whole message comes, in the end. So does the Seal. While you sat on the carrier listening, it closed another relay behind you.",
            fragment: "f2-wedding", flags: ["s2-wedding-heard"], seal: -1,
          } },
        ],
      },
      {
        text: "Let the Listening Post draw the whole message out of the glass.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          text: "The Listening Post finds the voice's band and pulls. The pane gives up the whole message in one clear ring, as if it had only been waiting for somebody to ask properly.",
          fragment: "f2-wedding", flags: ["s2-wedding-heard"],
        } }],
      },
      {
        text: "Drive on. It was not addressed to you.",
        outcomes: [{ outcome: {
          text: "The voice follows the car along the nave, pane to pane, keep your good, keep your good, until the frost takes it.",
        } }],
      },
    ],
  },
  {
    id: "s2-birth-bell", pool: "event", stages: [2], unique: true,
    title: "The Birth Bell", art: "glass-bells",
    text: "A small bell hangs alone in a frame under the ring, turning slowly on its chain. It is ringing. By the switch house log it has been ringing for thirty-one years: one long note that never decays, held in the glass.\n\nThe frame is stencilled BIRTH BELL · LOFT 3. A paper tag hangs from the clapper. The ink has run, but you can still read the word girl.",
    choices: [
      {
        text: "Stop the bell with a gloved hand. It may not want to stop.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The bell stops. For a moment it is the quietest the Cathedral has been all day. Then the glass lets go of what it held, and a message rides out on the last of the note.",
            fragment: "f2-birth-bell", reward: "low",
          } },
          { weight: 1, outcome: {
            text: "The note does not want to stop. It goes into {crew}'s arm and up into their teeth, the frame shakes loose, and the bell drops onto the car roof with a sound nobody aboard will forget. It is worth a good deal of salvage. {crew}'s hand is worth more.",
            fragment: "f2-birth-bell", crewDamage: { amount: 15, who: "one" }, resources: { salvage: [25, 40] },
          } },
        ],
      },
      {
        text: "Let {crew:bellmaker} finish the ring properly.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [{ outcome: {
          text: "{crew:bellmaker} listens, then touches the rim once with a glass fork, a little below the note. The two sounds meet and go quiet together, the way a birth bell is meant to end. \"Somebody forgot to damp it,\" says {crew:bellmaker}. \"Everyone was busy that night.\"",
          fragment: "f2-birth-bell", codex: "people-bellmakers", reward: "med",
        } }],
      },
      {
        text: "Leave it ringing.",
        outcomes: [{ outcome: {
          text: "Some things have been doing their job for a long time. The note follows the car down the carrier and thins out into the fog.",
        } }],
      },
    ],
  },
  {
    id: "s2-room-two", pool: "event", stages: [2], unique: true,
    title: "Room Two", art: "cathedral-nave",
    text: "A switch house on the Cathedral's flank turns out to have been a classroom: rows of small benches, a slate, a window onto the carriers so the children could watch the tenders go by. Thirty-one drawings are still pinned along the wall.\n\nThey are all of the Line. Almost all of them have the lights on.",
    choices: [
      {
        text: "Take one drawing down and look at it properly.",
        outcomes: [{ outcome: {
          text: "Crayon on switch-house paper: the ring, the spires, a tender with a lamp bigger than the car. A name and an age in the corner, seven. In the teacher's outbound tray, one message is still waiting for the parents of room two.",
          fragment: "f2-school",
        } }],
      },
      {
        text: "Count the drawings with the lights out.",
        outcomes: [{ outcome: {
          text: "Two. One is all black crayon and a single yellow dot. The other has the gap in exactly the right place. {crew} pins them back where they were, and finds the teacher's last message still in the outbound tray.",
          fragment: "f2-school",
        } }],
      },
      {
        text: "Leave a drawing of your own on the wall.",
        outcomes: [{ outcome: {
          text: "{crew} draws the {ship} on the back of a supply docket: the car, the carrier, the lamp lit, too big. It goes up at the end of the row. On the way out someone reads the teacher's last message aloud from the tray, and everyone feels better for a while, which is what drawings are for.",
          fragment: "f2-school", heal: true,
        } }],
      },
    ],
  },
  {
    id: "s2-loft-clock", pool: "event", stages: [2], unique: true, weight: 2,
    title: "The Wound Clock", art: "choir-loft",
    text: "The carrier runs past the choir loft of the north nave: glass on three sides, the choir stalls empty under frost. The loft lamp is on. The big clock over the stalls is running, and it is right.\n\nClocks do not stay right for thirty-one years. Somebody winds this one. {crew} climbs across from the grip arms to look. The winding key is warm.",
    choices: [
      {
        text: "Wait in the loft and see who comes (the Seal advances).",
        outcomes: [{ outcome: {
          text: "You put the kettle on the loft's little stove and wait. It is nearly the hour when a key turns in the far door. Behind you, the Seal has taken another relay.",
          codex: "places-choir-loft", seal: -1, next: "s2-loft-clock-winder",
        } }],
      },
      {
        text: "Wind it yourselves, and go on.",
        outcomes: [{ outcome: {
          text: "Forty turns. {crew} counts them out loud. The tick gets a little firmer, like someone standing up straighter. In the drawer under the clock are spare glass forks, labelled for whoever winds the clock. It seems fair.",
          codex: "places-choir-loft", reward: "low",
        } }],
      },
      {
        text: "Take the loft lamp. It is a very good lamp.",
        outcomes: [{ outcome: {
          text: "It is a very good lamp. The loft is dark when you leave it, and the clock keeps going in the dark, and nobody aboard says much until the next relay.",
          codex: "places-choir-loft", resources: { salvage: [30, 45] },
        } }],
      },
    ],
  },
  {
    id: "s2-loft-clock-winder", pool: "scripted", stages: [2],
    title: "The Clock-Winder", art: "choir-loft", portrait: "bellmaker", speaker: "Veda Longwire",
    text: "She is small and very old, in a long coat with violet cuffs gone grey. She looks at the kettle, then at you, then at the clock.\n\n\"Thirty-one years I've wound it,\" she says. \"Nobody comes to rehearsal. I tune the loft bell every morning anyway. It's the only thing up here that still sounds the way it should.\" She tilts her head at the hum coming up through the loft floor from your trolley. \"Yours doesn't.\"",
    choices: [
      {
        text: "Ask her to come aboard and listen to the car.",
        outcomes: [
          { weight: 2, outcome: {
            text: "She stands in the drive room with her eyes shut for a long time. Then she goes back to the loft and returns with a bag that was packed a very long time ago. \"The clock will stop,\" she says. \"Clocks do. Somebody ought to hear the Heart before I do.\"",
            crewJoin: { species: "bellmaker", name: "Veda Longwire" }, codex: "people-bellmakers",
          } },
          { weight: 1, outcome: {
            text: "She will not leave the loft. But she comes aboard for the length of a pot of tea, sits by the drive with a glass fork, and has the crew tighten every plate she taps. When she goes back across the grip arms the trolley hums in tune.",
            codex: "people-bellmakers", repair: 4,
          } },
        ],
      },
      {
        text: "Leave her a lens for the loft lamp (1 spare).",
        req: { resources: { spares: 1 } },
        outcomes: [{ outcome: {
          text: "She turns the lens in the lamplight and puts it in her pocket. In return she teaches {crew} to hear a failing route through the carrier before any instrument does. By the next relay {crew} can pick out every dead switch on this stretch by ear.",
          codex: "people-bellmakers", resources: { spares: -1 }, revealMap: true,
        } }],
      },
      {
        text: "Thank her for the tea and go.",
        outcomes: [{ outcome: {
          text: "She winds the clock as you leave. Forty turns. You can hear the tick a long way down the carrier.",
          codex: "people-bellmakers",
        } }],
      },
    ],
  },
  {
    id: "s2-guttering-lamp", pool: "event", stages: [2], unique: true,
    title: "A Guttering Lamp", art: "echo-tender-lit",
    text: "An echo tender is running its round on the next carrier over: run to one relay, relight the guide lamp, run to the other, relight that one, back again. Nobody at the cab window. The dock plate says PATIENCE.\n\nIts own cupola lamp is guttering, flaring and dimming. When it goes out, the autopilot will keep running the round in the dark, relighting lamps with nothing.\n\nThe lampers had a rule about that.",
    choices: [
      {
        text: "Come alongside and put its lamp out yourselves.",
        outcomes: [{ outcome: {
          text: "Somebody has to. {crew} takes the long pole and the snuffer cap from the hold.",
          codex: "tender-echo-tenders", next: "s2-patience-rest",
        } }],
      },
      {
        text: "Fit it a new lens and let it run (1 spare).",
        req: { resources: { spares: 1 } },
        outcomes: [{ outcome: {
          text: "Twenty minutes hanging off the grip arms in the thin air. The Patience's lamp comes up full and white. It runs back to its relay and relights the guide lamp brighter than it has in years, and as you pass, its beam holds yours for a moment: the old lampers' salute. The relay under you re-stamps the connection with a hop to spare.",
          codex: "tender-echo-tenders", flags: ["s2-patience-lit"], resources: { spares: -1, ttl: 1 },
        } }],
      },
      {
        text: "Strip its keel lockers while it runs. Its autopilot will not like it.",
        outcomes: [{ outcome: {
          text: "You match its speed on the parallel carrier and start cutting at the lockers. The autopilot reads a strange car on its round as wreckage on a cable, and does what a lamper does about wreckage.",
          codex: "tender-echo-tenders",
          combat: { enemy: "echo-tender", intro: "OBSTRUCTION ON MY CARRIER. PLEASE CLEAR. PLEASE CLEAR." },
        } }],
      },
    ],
  },
  {
    id: "s2-patience-rest", pool: "scripted", stages: [2],
    title: "The Patience", art: "echo-tender-lit",
    text: "You catch the Patience at the next relay while it is relighting the guide lamp. {crew} climbs across the grip arms with the pole and the cap, and waits for the lamp's next flare.\n\nIn the cab, pinned above the helm, is a photograph of three people squinting at the camera, and a list of relays with a line drawn through each one. The last line stops halfway.",
    choices: [
      {
        text: "Cap the lamp and set the brake.",
        outcomes: [{ outcome: {
          text: "The lamp goes out under the cap with a small sound. {crew} sets the brake, and the Patience stops under the last lamp it lit. You finish the line on the list for them, and take the drive stores, and leave the photograph. Lampers' rule.",
          reward: "med",
        } }],
      },
      {
        text: "Cap the lamp, and take the photograph for the wall at Relay Seven.",
        outcomes: [{ outcome: {
          text: "The lamp goes out. The Patience stops. The photograph goes into the galley, face out, where everyone can see it. There are more people on that wall at Relay Seven than anyone likes to count. There is always room.",
          reward: "low", heal: true,
        } }],
      },
    ],
  },
  {
    id: "s2-lamp-returned", pool: "event", stages: [2], unique: true, weight: 3,
    requires: { flag: "s2-patience-lit" },
    title: "A Lamp Returned", art: "echo-tender-lit",
    text: "The relay ahead has lost its guide lamp, and without a lamp to run in by, the helm is feeling for the switch in the dark and calling hello into nothing. Then a white lamp comes down the next carrier over.\n\nThe Patience. Its autopilot has found a new lamp for its round.",
    choices: [
      {
        text: "Hold your lamp on its lamp. The old salute.",
        outcomes: [{ outcome: {
          text: "It relights the guide lamp and runs back the way it came. The switch house wakes, hears your hello, and throws the switch with two stamps to spare, as if a relay can be grateful.",
          resources: { ttl: 2 },
        } }],
      },
      {
        text: "Follow it a while and see where its round goes.",
        outcomes: [{ outcome: {
          text: "It goes to a switch house nobody has visited since the Fault. The lamp there is lit now too. Under it, in the bench drawer, someone left spares sorted by what they could still save.",
          reward: "low", resources: { ttl: 1 },
        } }],
      },
    ],
  },
  {
    id: "s2-frost-writing", pool: "event", stages: [2],
    title: "Frost on the Window", art: "glass-fog",
    text: "Frost is growing on the cab window, and it is growing in lines. {crew} wipes a patch clear. The lines grow back the same.\n\nBy the next relay they are letters. ALL SHIFTS TO THE LIFTS. The Cathedral's hum has been shaping ice for thirty-one years, and it only knows one sentence.\n\nThen, under it, smaller, the frost starts on something else: columns of relay numbers.",
    choices: [
      {
        text: "Let it finish. Keep the heat off the cab, and off everyone's fingers.",
        outcomes: [{ outcome: {
          text: "It takes an hour and everyone's fingers. When it is done the whole cab window is a routing table for this stretch of the Cathedral, carrier by carrier, drawn by a hall that has nothing else left to say. You copy it before the lamp melts it.",
          revealMap: true, crewDamage: { amount: 10, who: "all" },
        } }],
      },
      {
        text: "Ask {crew:bellmaker} what it is doing.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [{ outcome: {
          text: "{crew:bellmaker} puts an ear to the glass. \"The announcement engine. The hall learned the order so well it writes it on anything cold. Warm the left corner and it'll skip to the table.\" It does. Nobody's fingers go numb.",
          revealMap: true,
        } }],
      },
      {
        text: "Scrape it off and turn the heater up.",
        outcomes: [{ outcome: {
          text: "Half an hour of scraping and the window is clear. The heater smells of hot dust. The frost keeps trying, faintly, at the corners, all the way to the next switch.",
        } }],
      },
    ],
  },
  {
    id: "s2-three-answers", pool: "event", stages: [2],
    title: "Three Answers", art: "relay-switchyard",
    text: "At the next switchyard the helm calls hello, and the relay answers three times, in three voices, from three glass bells hung over the switch house.\n\n\"I hear you,\" says the first. \"Hold,\" says the second. \"Release,\" says the third.\n\nThe switch does not move. It is waiting for the bells to agree. The bells have been disagreeing since the Night of the Fault.",
    choices: [
      {
        text: "Silence the bells. The switch will listen to you then.",
        outcomes: [{ outcome: {
          text: "The emitters come up to charge, and the bells notice. They are built into the switch house. They cannot get out of the way, and neither can you.",
          combat: { enemy: "glass-choir", intro: "Three glass faces turn toward the car. HOLD. RELEASE. HOLD.", onWin: "s2-three-answers-after" },
        } }],
      },
      {
        text: "Say the greeting again, and again, until one of them tires. The relay may count every try.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Forty minutes of hello. On the thirty-first try the second bell misses its cue, the first bell's answer lands alone, and the relay takes the car in before anyone can change their mind. The relay counted every try. It costs a hop.",
            resources: { ttl: -1 },
          } },
          { weight: 1, outcome: {
            text: "The bells tire of you first. HOLD, say all three at once, for the first time in thirty-one years, and the frame swings its glass faces toward the car.",
            combat: { enemy: "glass-choir", intro: "For once, all three agree: HOLD.", onWin: "s2-three-answers-after" },
          } },
        ],
      },
      {
        text: "Have {crew:bellmaker} sing the fourth voice.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [{ outcome: {
          text: "{crew:bellmaker} listens to the three notes, finds the one they are all missing, and sings it through the open hatch. For a moment there is a chord, and a chord is a quorum. \"I hear you hear me,\" say all three bells at once, and the relay takes the car in.",
          codex: "people-bellmakers", reward: "med",
        } }],
      },
      {
        text: "Jam two of them and let the first bell answer alone.",
        blue: true, req: { weapon: "ion" },
        outcomes: [{ outcome: {
          text: "Two bells choke on noise. The first says I hear you into the silence, very clearly, and the switch, which has been waiting thirty-one years for a plain answer, throws at once.",
          reward: "low",
        } }],
      },
    ],
  },
  {
    id: "s2-three-answers-after", pool: "scripted", stages: [2],
    title: "One Answer", art: "relay-switchyard",
    text: "The three bells hang still in their frame. The switch house hears the helm's hello and answers it in a plain brass voice, the way relays are supposed to.\n\nOne of the bells has a crack in it now, clean through. The other two are whole.",
    choices: [
      {
        text: "Take the cracked bell. Glass that good is worth salvage.",
        outcomes: [{ outcome: {
          text: "It comes off the frame in one piece and rides in the hold wrapped in blankets, ringing faintly at every joint in the carrier.",
          resources: { salvage: [30, 50] },
        } }],
      },
      {
        text: "Leave all three where they hang.",
        outcomes: [{ outcome: {
          text: "{crew} damps each bell with a glove on the way past. They were only doing what the night told them. In the switch house drawer are the bell crew's spares, sorted by what they could still save.",
          reward: "low",
        } }],
      },
    ],
  },
  {
    id: "s2-level-five", pool: "event", stages: [2], unique: true,
    title: "Level Five", art: "cold-berths",
    text: "A medical bay in a buttress of the Cathedral, reached from the switch house by a frosted gantry. Beds made, trays stacked, and a message board by the door still blinking one undelivered note for room eleven.\n\nThe corridor to room eleven is dark except for one small green lamp at the far end.",
    choices: [
      {
        text: "Read the note on the board first.",
        outcomes: [{ outcome: {
          text: "Medical bay, level five, to room eleven. A few words. Whoever wrote them was in a hurry, and relieved.",
          fragment: "f2-results", next: "s2-room-eleven",
        } }],
      },
      {
        text: "Go straight to the green lamp.",
        outcomes: [{ outcome: {
          text: "Your boots are loud on the frost. The lamp does not blink.",
          next: "s2-room-eleven",
        } }],
      },
      {
        text: "Leave the bay as it is.",
        outcomes: [{ outcome: {
          text: "You close the door on the made beds. The board keeps blinking for room eleven.",
        } }],
      },
    ],
  },
  {
    id: "s2-room-eleven", pool: "scripted", stages: [2],
    title: "Room Eleven", art: "cold-berths",
    text: "Room eleven has one cold berth, frosted over, status lamp green. Through the glass lid: a man in his forties, asleep, a hospital band on his wrist. The berth's log says he went in at hour two of the Night of the Fault, to wait for the lifts to come back up.\n\nThe lifts did not come back up. The berth kept him anyway. Its power gauge is sitting on the last line.",
    choices: [
      {
        text: "Start the warming cycle.",
        outcomes: [
          { weight: 3, outcome: {
            text: "It takes an hour. He sits up, looks at the frost, looks at you, and asks whether the lifts are running. Then he asks about his results. {crew} reads him the note from the board. He laughs until he cries, and then he asks if you could use a pair of hands.",
            fragment: "f2-results", crewJoin: { species: "linefolk" },
          } },
          { weight: 1, outcome: {
            text: "The cycle runs halfway. The lamp turns amber, then dark. The berth kept him for thirty-one years and had nothing left for the last hour. {crew} closes the lid gently and writes his name in the frost, and reads the note from the board to the room anyway.",
            fragment: "f2-results",
          } },
        ],
      },
      {
        text: "Warm him slowly on the Bench Infirmary's circuit.",
        blue: true, req: { system: { id: "medbay", level: 2 } },
        outcomes: [{ outcome: {
          text: "Your infirmary takes the load off the tired berth, and the warming runs the whole way. He wakes asking about the lifts, then about his results. When {crew} reads him the note he says, \"I told them it was nothing,\" and then, \"Have you got room for one more?\"",
          fragment: "f2-results", crewJoin: { species: "linefolk" },
        } }],
      },
      {
        text: "Let him sleep. The berth has kept him this long.",
        outcomes: [{ outcome: {
          text: "You wipe the frost off the lid so the lamp can see him, and tape the note from the board to the glass, where he will read it first.",
          fragment: "f2-results",
        } }],
      },
    ],
  },
  {
    id: "s2-rack-of-forks", pool: "event", stages: [2],
    title: "A Rack of Forks", art: "bellmakers-bench",
    text: "An empty bellmaker's workshop in a switch house: benches, a small bell on a stand, and a rack of violet glass tuning forks, each labelled in a neat hand with the bell it belongs to. You passed some of those bells an hour ago.\n\nWhen {crew} brushes the rack, three forks ring, and down in the car the trolley's hum shifts, just slightly, toward them.",
    choices: [
      {
        text: "Hang the rack by the drive.",
        outcomes: [{ outcome: {
          text: "The forks ring every time the trolley runs over a joint in the carrier, and the drive seems to like it. The motors run cooler by the next relay, and a rattle nobody could find stops on its own.",
          repair: 3, codex: "people-bellmakers",
        } }],
      },
      {
        text: "Let {crew:bellmaker} choose three for the ward mesh.",
        blue: true, req: { species: "bellmaker", system: { id: "shields", level: 1 } },
        outcomes: [{ outcome: {
          text: "{crew:bellmaker} picks three forks without reading the labels and clips them to the ward mesh's charge rail. The mesh starts to hum a chord. It recharges on the beat now, and faster.",
          augment: "keepalive", codex: "people-bellmakers",
        } }],
      },
      {
        text: "Crate the forks for the next exchange.",
        outcomes: [{ outcome: {
          text: "Cathedral forks fetch good salvage. The small bell on its stand rings once as you take the last of them, although nobody touches it.",
          resources: { salvage: [30, 45] },
        } }],
      },
    ],
  },
  {
    id: "s2-hymn-book", cast: "human", pool: "event", stages: [2],
    title: "Notes in the Margins", art: "choir-loft",
    text: "Face down on a switch-house bench, as if someone meant to come straight back: a hymn book, swollen with damp, its margins full of pencil. Breath marks. Tempo changes. A small drawing of a kettle. Beside one verse the same pencil has written: he always comes in early here, wait for him.\n\nThe choir rehearsed on Thursdays.",
    choices: [
      {
        text: "Read it aloud on the way to the next relay.",
        outcomes: [{ outcome: {
          text: "Nobody aboard can sing. {crew} reads it anyway, breath marks and all. By the end, half the crew are coming in early, and nobody waits for them.",
          heal: true,
        } }],
      },
      {
        text: "Open the music box and look for its tune in the book.",
        blue: true, req: { flag: "music-box" },
        outcomes: [{ outcome: {
          text: "Page forty-one. The box plays a Thursday hymn, and in the margin beside it the same pencil has written: children's concert, the little ones take the second verse. The box plays it through once while you read. It is still wound.",
          heal: true, reward: "low",
        } }],
      },
      {
        text: "Put it back face down, at the same page.",
        outcomes: [{ outcome: {
          text: "Someone meant to come straight back. You leave it ready for them.",
        } }],
      },
    ],
  },
  {
    id: "s2-hour-bell", pool: "event", stages: [2], unique: true,
    title: "The Hour Bell", art: "glass-bells",
    text: "Where the carriers cross under the ring hangs a bell so large the car passes beneath it like a moth under a lamp. Its frame is stencilled HEARTBEAT · RINGS ON THE HOUR. It has not rung in thirty-one years.\n\nIts hammer is still cocked. The trip wire runs down into the switch house, to a lever labelled in the Runbook's old script: FOR TESTING ONLY.",
    choices: [
      {
        text: "Pull the lever. Once.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The bell rings once. The whole Cathedral takes up the note and passes it along, pane to pane, for longer than you can hear. Behind you, the quarantine machinery hears a heartbeat where there has been none for thirty-one years, and stops for a while to think about it.",
            codex: "world-heartbeat", seal: 1,
          } },
          { weight: 1, outcome: {
            text: "The note goes out, and something comes back: a bell-drone on rotors, rising out of the fog to carry the hour it was built to carry, and finding a strange car under its bell.",
            codex: "world-heartbeat",
            combat: { enemy: "glass-echo", intro: "HOUR RUNG. CARRYING. CARRYING. OBSTRUCTION UNDER BELL." },
          } },
        ],
      },
      {
        text: "Leave it cocked. The Heart should ring its own bell.",
        outcomes: [{ outcome: {
          text: "{crew} reads the plate again on the way past. When the Heart beats again, it can ring its own hour. The hammer stays cocked, waiting, the way it has been taught.",
          codex: "world-heartbeat",
        } }],
      },
    ],
  },
  {
    id: "s2-plates-in-glass", pool: "event", stages: [2], unique: true,
    title: "Plates in the Glass", art: "cathedral-nave",
    text: "Set into a buttress below the frost line are engraved plates like the ones in the Runbook: small hooded figures laying cable, raising a spire, hanging a bell. One shows a figure at a switch, one hand raised, three curved lines coming out of its mouth.\n\nThe plates are older than the glass around them. The glass was poured around them.",
    choices: [
      {
        text: "Take rubbings for the galley wall.",
        outcomes: [{ outcome: {
          text: "Charcoal on docket paper. The figures come up grey and small. Nobody knows who they were. They left pictures of themselves working, and nothing else, and the pictures are still right.",
          codex: "world-first-shift", reward: "low",
        } }],
      },
      {
        text: "Show the plates to {crew:rigger}.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger}'s lens stays on the switch plate a long time. Then one tool arm traces a route across the frost on the cab window, relay by relay, down this whole stretch of the Cathedral, without a pause. Nobody knows where riggers get their routes. This one is right.",
          codex: "world-first-shift", revealMap: true,
        } }],
      },
      {
        text: "Listen to the plates with the Listening Post.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          text: "The glass around the plates hums one steady, low note that matches nothing on the Line. It has been humming it longer than the Line has kept records. The Listening Post logs it and has no name for it.",
          codex: "world-first-shift",
        } }],
      },
    ],
  },
  {
    id: "s2-return-to-sender", pool: "event", stages: [2], unique: true,
    title: "Return to Sender", art: "relay-switchyard",
    text: "The Listening Post keeps catching the same small packet. It leaves the relay ahead along the carrier toward the Reach, reaches the quarantine shutters on the old route, and comes back. Out again. Back again. Every eleven seconds.\n\nThe relay's return routes are doing what they were built to do: sending the undeliverable home to try again. It is a small message. It has been trying for twenty-one years.",
    choices: [
      {
        text: "Catch it on the way past and read it.",
        outcomes: [{ outcome: {
          text: "It came up from the Ground ten years after the Fault, looking for Relay Seven. The relay catches it again the moment you let go, and out it goes, toward the shutters.",
          fragment: "f2-ten-years", codex: "runbook-return-routes",
        } }],
      },
      {
        text: "Stamp it with a time to live of one, so it can stop.",
        outcomes: [{ outcome: {
          text: "You give it a TTL. It goes out once more toward the shutters, and this time, at the end of its one hop, it is allowed to stop. The relay goes quiet. {crew} says, out loud, to nobody, that Relay Seven is still there.",
          fragment: "f2-ten-years", codex: "runbook-return-routes",
        } }],
      },
      {
        text: "Let {crew:courier} carry it by hand.",
        blue: true, req: { species: "courier" },
        outcomes: [{ outcome: {
          text: "{crew:courier} copies it onto a docket, folds it twice and puts it in the satchel with the others. \"When the queue goes, it can go with it. Until then it can stop running.\" The relay, relieved of it, throws the next switch without being asked twice.",
          fragment: "f2-ten-years", codex: "runbook-return-routes", resources: { ttl: 1 },
        } }],
      },
    ],
  },
  {
    id: "s2-snared-workshop", pool: "event", stages: [2], unique: true,
    title: "The Snared Workshop", art: "bellmakers-bench",
    text: "A switch house under a nave has been wrapped in cable, hundreds of turns of it, drawn so tight the frame creaks. A Wire Weaver hangs on the carrier above, adding one more turn every few minutes. REPAIR ORDER OPEN.\n\nThere is a lamp on inside. Through a gap in the turns, a woman in a violet-cuffed coat sits at a bench tuning a small bell, as if none of this were happening.",
    choices: [
      {
        text: "End the weaver's task.",
        outcomes: [{ outcome: {
          text: "The weaver feels your trolley on its carrier and turns every arm toward the new connection.",
          combat: { enemy: "wire-weaver", intro: "REPAIR ORDER OPEN. SECOND CONNECTION FOUND. ADDING TENSION.", onWin: "s2-workshop-freed" },
        } }],
      },
      {
        text: "Cut the snare with the lance while the weaver works the far side.",
        blue: true, req: { weapon: "beam" },
        outcomes: [{ outcome: {
          text: "It takes a steady hand and a long while. The weaver never notices; it is busy adding turns on the other side. The last turn parts with a note like a harp string.",
          next: "s2-workshop-freed",
        } }],
      },
      {
        text: "Hail her and ask if she needs help.",
        outcomes: [{ outcome: {
          text: "She looks up, waves, and goes back to her bell. \"It's been like this for years,\" she calls through the gap. \"It thinks it's mending me. I get my tea through the vent.\" She does not ask for anything, so you leave her to it.",
        } }],
      },
    ],
  },
  {
    id: "s2-workshop-freed", pool: "scripted", stages: [2],
    title: "Mended", art: "bellmakers-bench", portrait: "bellmaker", speaker: "Ysolde Carvell",
    text: "She steps out of the switch house for the first time in, she thinks, nine years, and looks up at the carriers for a while.\n\n\"It was mending me,\" she says. \"Nobody else was. I'll give it that.\" Then she looks at your car and frowns. \"Your plating rings flat on the port side. Did you know?\"",
    choices: [
      {
        text: "Ask her to come and fix it on the way.",
        outcomes: [{ outcome: {
          text: "She is aboard before you finish asking, with a bag of forks and the small bell under her arm. \"I'd like to hear the Heart,\" she says. \"Once. Everyone should.\"",
          crewJoin: { species: "bellmaker", name: "Ysolde Carvell" }, codex: "people-bellmakers",
        } }],
      },
      {
        text: "Ask what in the workshop she no longer needs.",
        outcomes: [{ outcome: {
          text: "\"The horn array,\" she says at once. \"I built it to hear the Heart from here. It never could.\" A crate of violet glass horns on a brass frame swings across on the grapple, packed in old choir robes. \"From closer, it might.\"",
          module: "listening-horn-array", codex: "people-bellmakers",
        } }],
      },
      {
        text: "Ask her to fix it here, before she goes wherever she likes.",
        outcomes: [{ outcome: {
          text: "She fixes it, and the port side, and a bulkhead hinge nobody mentioned, and then shakes everyone's hand and walks off down the gantry humming, with nowhere in particular to be for the first time in nine years.",
          repair: 6, codex: "people-bellmakers",
        } }],
      },
    ],
  },
  {
    id: "s2-web-round-a-lamp", pool: "event", stages: [2],
    title: "A Web Round a Lamp", art: "glass-bells",
    text: "Ahead, a relay's guide lamp is still working, and a Prism Widow has found it. It has spun optical thread around the lamp, over the switch house and across the carrier, violet strand by strand, so perfectly that the light inside cannot get out. The switch house is dark. The switch will not hear a hello through it.\n\nThe widow sits on its web, repairing a strand that is not broken.",
    choices: [
      {
        text: "Clear the web the hard way.",
        outcomes: [{ outcome: {
          text: "The widow feels the first bolt land on its web and turns every glass leg toward you.",
          combat: { enemy: "prism-widow", intro: "LIVE SIGNAL ON UNPROTECTED CARRIER. WEAVING ISOLATION. PLEASE HOLD STILL." },
        } }],
      },
      {
        text: "Back off and take the long carrier round the nave (1 TTL).",
        req: { resources: { ttl: 1 } },
        outcomes: [{ outcome: {
          text: "You back down to the last switchyard and take the long way round. It costs a switch. The widow does not notice you leave. It is still repairing the strand.",
          resources: { ttl: -1 },
        } }],
      },
      {
        text: "Cut one thread with the lance and let the light out.",
        blue: true, req: { weapon: "beam" },
        outcomes: [{ outcome: {
          text: "One thread is all it takes. The lamp's light finds the gap and pours out along the carrier, and the switch house wakes and hears your hello. The widow turns to mend the cut, and for the first time in years it has something real to mend. It gets to work, content.",
          reward: "low",
        } }],
      },
    ],
  },
  {
    id: "s2-carrier-moving", pool: "event", stages: [2],
    title: "The Carrier Is Moving", art: "glass-fog",
    text: "The carrier ahead is thicker than it should be, and it is turning slowly, like a rope being wound. A Coil Serpent has wrapped itself round the span between two relays, segment over segment, and every time a signal runs through the core it tightens a little more.\n\nYour trolley's grip is already feeling it. The whole span hums.",
    choices: [
      {
        text: "Run at it and end its task.",
        outcomes: [{ outcome: {
          text: "The coil feels a strong signal coming down its carrier and draws every segment tight to meet it.",
          combat: { enemy: "coil-serpent", intro: "SIGNAL ON CARRIER. RECOVERING CARRIER." },
        } }],
      },
      {
        text: "Jam the core so there is no signal to tighten on.",
        blue: true, req: { weapon: "ion" },
        outcomes: [{ outcome: {
          text: "The jammer floods the carrier's core with noise. The coil can't find a signal in it, loosens, and slides a little way down the span to wait. You go through the gap it leaves.",
          reward: "low",
        } }],
      },
      {
        text: "Run lamp-dark through its turns.",
        blue: true, req: { system: { id: "veil", level: 1 } },
        outcomes: [{ outcome: {
          text: "Every lamp out, every set silent, the car coasting on the grip. The coils slide round you and find nothing live. On the far side, frost on the inside of the windows and nobody breathing too loud.",
        } }],
      },
      {
        text: "Kill the car's power and coast through on momentum. If anything aboard wakes, the coils will feel it.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Lamps out, sets off, air plant down to its pilot light. The serpent's turns slide round the car and find nothing live, and loosen. You come out the far end with frost on the inside of the windows.",
          } },
          { weight: 1, outcome: {
            text: "Halfway along, the air plant's pilot light comes back up on its own. The coils feel it and close. The grip screams, the car swings hard, and you come out the far end with a dented roof and a very quiet crew.",
            resources: { hull: [-4, -2] },
          } },
        ],
      },
    ],
  },
  {
    id: "s2-came-too-far", pool: "event", stages: [2], unique: true,
    title: "Came Too Far", art: "derelict-car",
    text: "A scavenger skiff is hanging dead on a glass carrier, frosted white, its trolley frozen to the cable. Somebody inside has scraped a hole in the frost on the window and is holding up a docket with one word chalked on it: TEA.\n\nThey came in from the Reach years ago on side carriers, looking for glass to sell, and got stuck here when the frost took their trolley. They have been living on the carrier since.",
    choices: [
      {
        text: "Pass a flask across on the grapple.",
        outcomes: [{ outcome: {
          text: "The docket in the window changes: THANK YOU. Then: COME ROUND THE FRONT.",
          next: "s2-came-too-far-tea",
        } }],
      },
      {
        text: "Couple on and tow the skiff to the next switchyard.",
        blue: true, req: { system: { id: "engines", level: 3 } },
        outcomes: [{ outcome: {
          text: "The drive complains all the way and the frost comes off their trolley in sheets. At the switchyard they pay you in everything they can spare, which is a surprising amount of very good glass.",
          resources: { salvage: [35, 55], spares: 1 },
        } }],
      },
      {
        text: "Leave them. You can't carry everyone.",
        outcomes: [{ outcome: {
          text: "The docket changes as you pass: PLEASE. Then, when you are almost out of sight: FAIR ENOUGH.",
        } }],
      },
    ],
  },
  {
    id: "s2-came-too-far-tea", pool: "scripted", stages: [2],
    title: "Tea Through the Hatch", art: "derelict-car", portrait: "recruit-courier-b", speaker: "The skiff's courier",
    text: "There are two of them: an old cable hand who does not want to talk, and a courier in goggles and three scarves who very much does. They have been up here six years. The glass sells, when they can get it down. They cannot get it down.\n\n\"He's staying with the skiff until it thaws,\" the courier says. \"Which is spring. Which is never. I was thinking of going on.\"",
    choices: [
      {
        text: "Offer the courier a place aboard.",
        outcomes: [{ outcome: {
          text: "The courier is across the grapple line with a satchel before the old hand can object, and the old hand does not object. He passes a crate of glass after them. \"For the fare,\" he says, and shuts the hatch.",
          crewJoin: { species: "courier" }, resources: { salvage: [20, 30] },
        } }],
      },
      {
        text: "Trade them tea and dressings for glass.",
        outcomes: [{ outcome: {
          text: "A fair trade, by the Night Shift's reckoning, which means both sides think they won. They wave you off with the docket: SAFE ROUTE.",
          resources: { salvage: [25, 40] },
        } }],
      },
    ],
  },
  {
    id: "s2-honest-bell", pool: "event", stages: [2],
    title: "The Honest Bell", art: "glass-bells",
    text: "A small bell hangs in this relay's switch house with a card tied to it in a bellmaker's hand: TUNED TO SPEECH. RINGS AT A LIE. DO NOT BRING CHILDREN.\n\n{crew} says that's nonsense. The bell rings.",
    choices: [
      {
        text: "Ask it whether the route will hold.",
        outcomes: [{ outcome: {
          text: "Nobody says anything, so the bell doesn't ring. That is not the same as an answer, {crew} points out. The bell stays quiet about that too.",
        } }],
      },
      {
        text: "Hold a crew meeting in front of it.",
        outcomes: [{ outcome: {
          text: "Who ate the last of the biscuits. Who snores. Whether anyone actually likes the kettle's whistle. The bell rings eleven times in twenty minutes, and nobody has laughed this much since Relay Seven.",
          heal: true,
        } }],
      },
      {
        text: "Take it aboard for the next exchange.",
        outcomes: [{ outcome: {
          text: "It rings twice on the way to the car: once when {crew} says it is for a good cause, and once when someone else says it won't be missed.",
          resources: { salvage: [25, 40] },
        } }],
      },
    ],
  },
  {
    id: "s2-glass-weather", pool: "event", stages: [2],
    title: "Glass Weather", art: "glass-fog",
    text: "The Cathedral's weather turns. Fine glass hail comes out of the fog in sheets, every grain ringing as it hits the car, until the roof sounds like a thousand spoons on a thousand cups.\n\nThere is a switch house fifty metres ahead with a heavy overhang. There is also a bell the size of a lift car hanging just off the carrier, mouth down, like an umbrella.",
    choices: [
      {
        text: "Push on to the switch house through the hail.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Fifty metres takes a long time. The hail chips the paint, stars the cab window and finds every loose rivet on the roof.",
            resources: { hull: [-3, -2] },
          } },
          { weight: 1, outcome: {
            text: "A gust swings the car into the worst of it. When you reach the overhang the roof is pitted and the cupola has a crack across it like a hair.",
            resources: { hull: [-5, -4] },
          } },
        ],
      },
      {
        text: "Shelter under the big bell.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The hail rings off the bell over you in one long chord. When it stops, the platform under the bell's mouth is heaped with glass hail, sorted by the ringing into three neat sizes. Lenses, very nearly.",
            resources: { salvage: [20, 35] },
          } },
          { weight: 1, outcome: {
            text: "The chord wakes something nesting in the bell's mouth: a bell-drone, which drops out on its rotors to find out who is ringing its bell.",
            combat: { enemy: "glass-echo", intro: "BELL RUNG. ANNOUNCING. ALL SHIFTS TO THE" },
          } },
        ],
      },
      {
        text: "Raise the ward mesh and let it take the hail.",
        blue: true, req: { system: { id: "shields", level: 4 } },
        outcomes: [{ outcome: {
          text: "The mesh catches every grain and grounds it through the carrier in a long crackle of violet sparks. It is the prettiest thing anyone aboard has seen in years. Nothing gets through.",
        } }],
      },
    ],
  },
  {
    id: "s2-frozen-at-work", pool: "event", stages: [2],
    title: "Frozen at Work", art: "machine-escort",
    text: "An escort automaton is frozen to the outside of a pane, mid-repair, one tool arm still raised to a crack it never finished sealing. Its lens is dark. Frost has grown over it in feathers.\n\nWhatever big machine it once followed is gone, or its task ended long ago. The escort stayed with the crack.",
    choices: [
      {
        text: "Thaw it with the lamp and try the first hello.",
        outcomes: [
          { weight: 3, outcome: {
            text: "The lens flickers as it warms. {crew} says it properly, all three lines, and waits. The lens goes teal. The automaton finishes sealing the crack, very carefully, then turns to see who it belongs to now.",
            crewJoin: { species: "rigger" },
          } },
          { weight: 1, outcome: {
            text: "The lens flickers red. Somebody said it wrong, or it was cold too long. It seals the crack, powers down again, and this time its task ends properly. You take the spare lens it kept in its chest, because it would have wanted the next one to have it.",
            resources: { spares: 1 },
          } },
        ],
      },
      {
        text: "Take its spares and go.",
        outcomes: [{ outcome: {
          text: "Two lenses and a coil of good wire. The crack stays half sealed.",
          resources: { spares: [1, 2] },
        } }],
      },
      {
        text: "Finish sealing the crack for it and leave it be.",
        outcomes: [{ outcome: {
          text: "{crew} climbs out on a line and runs the last of the seal. The pane stops whistling. The escort does not move, but its task is done, and somebody saw it done.",
        } }],
      },
    ],
  },
  {
    id: "s2-keeping-the-hall", pool: "event", stages: [2], unique: true,
    title: "Keeping the Hall", art: "cathedral-nave", portrait: "recruit-warden-b", speaker: "A warden at the door",
    text: "In the south nave, a hall beside the carrier is dressed for a wedding: ribbons of cable, benches in rows, a long table laid under frost. A warden in dark plates stands at the door with a hand lamp. She has been standing there, she says, on and off, for thirty-one years.\n\n\"The families asked me to keep the hall,\" she says. \"Nobody told me to stop.\"",
    choices: [
      {
        text: "Tell her what the pane said: postponed, not cancelled.",
        blue: true, req: { flag: "s2-wedding-heard" },
        outcomes: [{ outcome: {
          text: "She listens with her visor up. Then she nods, twice, takes the ribbon off the door and folds it into her pack. \"Then they'll want this later,\" she says, and asks where she can sit.",
          crewJoin: { species: "warden" },
        } }],
      },
      {
        text: "Ask if she will come with you instead.",
        outcomes: [
          { weight: 1, outcome: {
            text: "She looks at the hall for a long time. \"It'll keep,\" she says at last. \"Frost keeps everything.\" She shuts the door behind her very carefully.",
            crewJoin: { species: "warden" },
          } },
          { weight: 2, outcome: {
            text: "\"Somebody has to keep the hall.\" She gives you the wedding's ration tins for the road, because they will not keep another thirty-one years, and wishes you a quiet carrier.",
            heal: true,
          } },
        ],
      },
      {
        text: "Wish her a quiet watch.",
        outcomes: [{ outcome: {
          text: "\"Quiet watch,\" she says back, the old warden way, and raises the hand lamp as you pass.",
        } }],
      },
    ],
  },
  {
    id: "s2-ahead-of-the-seal", pool: "event", stages: [2],
    title: "Ahead of the Seal", art: "sealed-relay",
    text: "Through the glass you can see a lone Quarantine Drone working ahead of the Seal: four rotors, black shell, red seam, bolting the first struts of a lattice around the next relay's switch house before the rest of them arrive.\n\nIt has not noticed you. It is very busy.",
    choices: [
      {
        text: "End its task before it finishes the first strut.",
        outcomes: [{ outcome: {
          text: "It notices you now.",
          combat: { enemy: "quarantine-drone", intro: "ROUTE NOT CONFIRMED SAFE. RELAY SEALED. HOLDING.", onWin: "s2-ahead-of-the-seal-after" },
        } }],
      },
      {
        text: "Slip past it lamp-dark.",
        blue: true, req: { system: { id: "veil", level: 1 } },
        outcomes: [{ outcome: {
          text: "Every lamp out, the car sliding along the carrier like a shadow. The drone bolts its strut and never looks round. On the far side of the relay you light up again and breathe out.",
        } }],
      },
      {
        text: "Leave it be. It will have company soon enough (the Seal advances).",
        outcomes: [{ outcome: {
          text: "You hold at the relay and let it work, and the crew spend the time on the plating. It has company sooner than you like: the lattice round that switch house is complete, and the Seal is a relay closer.",
          seal: -1, repair: 2,
        } }],
      },
    ],
  },
  {
    id: "s2-ahead-of-the-seal-after", pool: "scripted", stages: [2],
    title: "Half a Lattice", art: "sealed-relay",
    text: "The drone hangs on idling rotors, clamps open. Its first struts are half bolted round the switch house, black and neat, a red seam already lit along one of them.",
    choices: [
      {
        text: "Unbolt the struts and drop them off the carrier.",
        outcomes: [{ outcome: {
          text: "It takes an hour and a lot of swearing. The struts fall into the fog and ring off the glass all the way down. When the Seal gets here it will have to start this relay again from the beginning.",
          seal: 2,
        } }],
      },
      {
        text: "Strip the drone for its spares.",
        outcomes: [{ outcome: {
          text: "Its lenses and clamp motors come away clean. The Seal's drones are well made. It seems a shame, and then it doesn't.",
          resources: { spares: [1, 2] }, reward: "low",
        } }],
      },
    ],
  },
  {
    id: "s2-two-helmets", pool: "event", stages: [2], unique: true,
    title: "Two Helmets", art: "tender-wreck",
    text: "Below the carrier, wedged in a bell frame, is a cable tender that fell a long time ago: your own lamplighter pattern, split along the spine, its trolley still gripping a snapped end of cable above. Two warden helmets sit side by side on the helm console, visors up.\n\nThe Copper Market remembers a warden pair who went together. Nobody remembers their names.",
    choices: [
      {
        text: "Climb down and see what they left. The frame may not hold.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The hold is intact. They were carrying more than they needed. Wardens always do.",
            reward: "med", weapon: "random",
          } },
          { weight: 1, outcome: {
            text: "The bell frame shifts under {crew}'s boots and the wreck lurches on its cable end. {crew} comes back up with a wrenched shoulder and an armful of whatever was nearest.",
            crewDamage: { amount: 20, who: "one" }, reward: "low",
          } },
        ],
      },
      {
        text: "Let {crew:warden} go down alone.",
        blue: true, req: { species: "warden" },
        outcomes: [{ outcome: {
          text: "{crew:warden} is gone twenty minutes and comes back with their spare armour plate, brass-riveted and still good, and without a word about the helmets. The plates go onto the {ship}'s port side. Nobody asks.",
          augment: "brass-plating",
        } }],
      },
      {
        text: "Leave the helmets. Take only the logbook.",
        outcomes: [{ outcome: {
          text: "The last entry is in two hands, one line each. The first says: frame's holding. The second says: so are we. {crew} puts the logbook back on the dash between the helmets. It belongs there.",
        } }],
      },
    ],
  },
  {
    id: "s2-tuned-kettle", pool: "event", stages: [2],
    title: "The Tuned Kettle", art: "bellmakers-bench",
    text: "On the stove of a switch house bench sits a kettle with a note taped to it: TUNED. DO NOT RETUNE. — THE LOFT.\n\n{crew} fills it and puts it on out of professional curiosity. When it boils, it does not whistle. It sings the first line of a hymn, in thirds, with a slight vibrato.",
    choices: [
      {
        text: "Take it, and the bench it sits on. The crew need this.",
        outcomes: [{ outcome: {
          text: "The bench unbolts, the stove comes with the bench, and the whole lot goes into a socket in the hold. It sings every time it boils. Within a day everyone aboard knows the first line of the hymn and nobody knows the second. Morale is excellent. Sleep is worse.",
          heal: true, module: "kettle-bench",
        } }],
      },
      {
        text: "Leave it for the next crew, and leave a tin of tea beside it.",
        outcomes: [{ outcome: {
          text: "You add your own note under the loft's: STILL TUNED. The bench drawer has a few spares sorted by what they could still save. You take one and leave the tea.",
          resources: { spares: 1 },
        } }],
      },
      {
        text: "Let {crew:bellmaker} retune it anyway.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [{ outcome: {
          text: "{crew:bellmaker} ignores the note with the calm of long practice. The kettle now sings the second line as well. The loft, wherever it is, would be furious. The crew are delighted.",
          heal: true, reward: "low",
        } }],
      },
    ],
  },

  {
    id: "s2-keel-under-the-nave", pool: "event", stages: [2], unique: true,
    title: "A Keel Under the Nave", art: "derelict-car",
    text: "Hanging from its own small trolley on a carrier under the south nave is a keel car, uncoupled, frosted white: a long low listening car with a bank of glass horns along its belly, the kind the bellmakers slung under the Cathedral to hear failing routes before they failed. Its coupling hook dangles. One lamp inside is still on.\n\nThe horns ring faintly whenever the wind touches a pane.",
    choices: [
      {
        text: "Couple it under the {ship}.",
        outcomes: [{ outcome: {
          text: "It takes the whole crew and most of the afternoon, hanging off the grip arms in the thin air. When the coupling closes, the horns along the keel go quiet for a moment. Then they start listening for you.",
          car: "listening-keel",
        } }],
      },
      {
        text: "Ask {crew:bellmaker} whether it is worth the trouble.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [{ outcome: {
          text: "{crew:bellmaker} walks its length tapping horns. \"Three are cracked. The rest are the best I have heard in thirty years.\" The cracked ones come off for salvage and the keel is retuned before it is coupled, which takes no longer than a pot of tea.",
          car: "listening-keel", reward: "low",
        } }],
      },
      {
        text: "Strip the glass horns for salvage.",
        outcomes: [{ outcome: {
          text: "The horns come off one by one, each ringing a slightly different note as it leaves the keel. By the last one the car is silent and worth a good deal less, and the crate in your hold is worth a good deal more.",
          resources: { salvage: [30, 50] },
        } }],
      },
    ],
  },

  // ─── Unknown signals ───────────────────────────────────────────────────────────────────────────────────
  {
    id: "s2-distress-breathing", pool: "distress", stages: [2],
    title: "Breathing", art: "glass-fog",
    text: "The glass fog is so thick the lamp stops a metre past the cupola. The Listening Post has gone deaf to everything but one sound, close, slow and enormous: in, and out. In, and out.\n\nSomething very large is breathing just outside the car.",
    choices: [
      {
        text: "Call hello into the fog.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The breathing answers with a long falling chord. It is the Cathedral: a whole glass flank drawing in and out as it cools, pane by pane, the way it has every night for thirty-one years. Your lamp has warmed the fog enough to see a switch house right beside you, its bench drawer untouched.",
            reward: "low",
          } },
          { weight: 1, outcome: {
            text: "It is a bell-drone on rotors hanging in the fog a metre off the cab window, its bell swinging in and out on the rotor wash. It hears your hello and answers the only way it knows.",
            combat: { enemy: "glass-echo", intro: "GREETING RECEIVED. ANNOUNCING. ALL SHIFTS TO THE LIFTS." },
          } },
        ],
      },
      {
        text: "Turn the Listening Post onto the glass itself.",
        blue: true, req: { system: { id: "sensors", level: 3 } },
        outcomes: [{ outcome: {
          text: "It is the panes, all of them, breathing with the cold. Once you know what it is, it is almost restful. The Listening Post also picks out a bench's lamp two hundred metres up the carrier, on its trickle.",
          reward: "low",
        } }],
      },
      {
        text: "Douse the lamp and wait for it to pass. It may take all night.",
        outcomes: [{ outcome: {
          text: "It does not pass. By morning the fog lifts, and there beside you is the flank of the Cathedral, frost-feathered, a hand's breadth from the car. It was breathing all night. So were you, and everyone aboard slept, after a fashion. The Seal did not wait.",
          seal: -1, heal: true,
        } }],
      },
    ],
  },
  {
    id: "s2-distress-knocking", pool: "distress", stages: [2], unique: true,
    title: "Knocking", art: "glass-bells",
    text: "A distress beacon of a very old pattern, from a bell hung below the carrier. When the lamp finds it you can hear knocking from inside: three knocks, a pause, three knocks. Somebody is in the bell.\n\nIce has welded its rim to the platform under it. Chipping at it will make the whole bell ring.",
    choices: [
      {
        text: "Chip the ice away by hand.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Slow work, with gloves over the ears. The ice comes off in rings.",
            next: "s2-bell-inside",
          } },
          { weight: 1, outcome: {
            text: "Every blow rings the bell, and the bell rings {crew}. The ice gives in the end, but {crew} spends the afternoon with a headache and a strange tune stuck in both ears.",
            crewDamage: { amount: 15, who: "one" }, next: "s2-bell-inside",
          } },
        ],
      },
      {
        text: "Shatter the ice with one burst of rivet scatter.",
        blue: true, req: { weapon: "flak" },
        outcomes: [{ outcome: {
          text: "One burst, aimed low. The ice goes to powder and the bell swings free with a note you feel in your fillings.",
          next: "s2-bell-inside",
        } }],
      },
      {
        text: "Knock back three times, and go on.",
        outcomes: [{ outcome: {
          text: "The knocking stops. Then it starts again, three and three, and follows you down the carrier until the bell is out of sight.",
        } }],
      },
    ],
  },
  {
    id: "s2-bell-inside", pool: "scripted", stages: [2],
    title: "Inside the Bell", art: "glass-bells", portrait: "bellmaker", speaker: "Clemency Hask",
    text: "The bell lifts on its chain and out climbs a bellmaker in a long coat, frost in her eyebrows, a tuning fork in each hand.\n\n\"I was tuning it from the inside,\" she says. \"You get the best of the note in there. I've been getting the best of the note since Tuesday.\" She looks at your lamp, then your car, then the red of the Seal far back along the carriers. \"Where are you going?\"",
    choices: [
      {
        text: "To the Heart. Come if you want.",
        outcomes: [
          { weight: 3, outcome: {
            text: "\"The Heart.\" She says it the way people say the names of places they grew up. \"I've wanted to hear it since I was six.\" She is aboard with both forks and no luggage.",
            crewJoin: { species: "bellmaker", name: "Clemency Hask" }, codex: "people-bellmakers",
          } },
          { weight: 1, outcome: {
            text: "She thinks about it, then shakes her head. \"This bell's not finished.\" But she tunes the {ship}'s drive by ear before you go, and the car rides smoother than it has since the Reach docks.",
            repair: 4, codex: "people-bellmakers",
          } },
        ],
      },
      {
        text: "Anywhere with a kettle, mostly.",
        outcomes: [{ outcome: {
          text: "\"Good answer.\" She drinks two cups, taps the plating tight as a thank-you, and climbs back into her bell, pulling the rim down behind her like a hatch.",
          repair: 3, heal: true, codex: "people-bellmakers",
        } }],
      },
    ],
  },
  {
    id: "s2-distress-blinked-hello", pool: "distress", stages: [2],
    title: "Hello, Blinked", art: "cathedral-nave",
    text: "A lamp in a nave window is blinking the greeting in lampers' code. Hello. Pause. Hello. Pause.\n\nWhoever is doing it has not had an answer in a very long time, and is doing it anyway.",
    choices: [
      {
        text: "Blink back: I hear you.",
        outcomes: [
          { weight: 2, outcome: {
            text: "The lamp goes still. Then: I hear you hear me. Then, fast and sloppy, something that is not in any code at all. When you reach the window there is a man in a knitted cap with a hand lamp and a very small bag, already packed.",
            crewJoin: { species: "linefolk" },
          } },
          { weight: 1, outcome: {
            text: "The lamp blinks the third line before you finish yours, and keeps going: HELLO HELLO HELLO. It is a bell-drone's warning lamp, repeating the last thing it saw, and now it has seen you.",
            combat: { enemy: "glass-echo", intro: "HELLO. HELLO. HELLO. ALL SHIFTS TO THE LIFTS." },
          } },
        ],
      },
      {
        text: "Check with the Listening Post who is holding the lamp.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          text: "A heartbeat, warm and human, and a lot of fidgeting. You blink back with confidence. He is waiting at the window when you arrive, knitted cap, very small bag, already packed.",
          crewJoin: { species: "linefolk" },
        } }],
      },
      {
        text: "Don't answer. It might be anything.",
        outcomes: [{ outcome: {
          text: "The lamp keeps blinking hello until the fog takes it.",
        } }],
      },
    ],
  },
  {
    id: "s2-distress-expired", pool: "distress", stages: [2],
    title: "Expired in Transit", art: "relay-switchyard",
    text: "A Night Shift freight car is stalled on the carrier at the next relay, a hand-painted lamp on its nose and two people inside playing cards. Their connection ran out two switches ago. The relay will not switch them. They have been waiting for someone with a stamp for eleven days.\n\n\"We'd take a hop,\" one says. \"We'd take half a hop.\"",
    choices: [
      {
        text: "Share a stamp with them (1 TTL).",
        req: { resources: { ttl: 1 } },
        outcomes: [{ outcome: {
          text: "The press thumps through both cars. They pay you in what they were carrying, which is glass, spares, and a great deal of gratitude, and they are through the switch before you have put the press away.",
          resources: { ttl: -1 }, reward: "med",
        } }],
      },
      {
        text: "Couple on and push them into a switchyard with a bench.",
        blue: true, req: { system: { id: "engines", level: 3 } },
        outcomes: [{ outcome: {
          text: "Two relays of shoving. The bench at the far end has a stamp press, and they have their hop by teatime. They leave you half their cargo and the queen of lamps, which was missing from their deck the whole eleven days.",
          reward: "low",
        } }],
      },
      {
        text: "Wish them luck and go on.",
        outcomes: [{ outcome: {
          text: "The card game resumes as you pass. Somebody is losing. Behind you, a long way off, the Seal is doing the arithmetic.",
        } }],
      },
    ],
  },
  {
    id: "s2-distress-peal-backwards", pool: "distress", stages: [2],
    title: "The Peal Backwards", art: "choir-loft",
    text: "Somewhere ahead the bells are ringing backwards: a peal from the highest bell down to the lowest, over and over. The bellmakers rang it that way for one thing only. Fire.\n\nSmoke is coming out of a switch house on the carrier. Through the window: shelves of bell moulds, logbooks, a whole wall of labelled glass.",
    choices: [
      {
        text: "Go in with the extinguishers. Someone will breathe smoke.",
        outcomes: [
          { weight: 2, outcome: {
            text: "It is a battery bank that finally cooked. Ten minutes of smoke and foam and the fire is out. The bellmakers' logbooks are singed at the edges. The glass is fine, and some of it comes with you.",
            crewDamage: { amount: 15, who: "one" }, reward: "med", codex: "people-bellmakers",
          } },
          { weight: 1, outcome: {
            text: "The fire has more in it than it looked. You get it out, but {crew} gets the worst of the smoke, and half the shelves are gone.",
            crewDamage: { amount: 30, who: "one" }, reward: "low",
          } },
        ],
      },
      {
        text: "Send {crew:rigger} in. It doesn't need the air.",
        blue: true, req: { species: "rigger" },
        outcomes: [{ outcome: {
          text: "{crew:rigger} walks into the smoke, shuts off the battery bank, puts the fire out with methodical little puffs, and walks out carrying the logbooks stacked in order. The bells stop ringing backwards.",
          reward: "med", codex: "people-bellmakers",
        } }],
      },
      {
        text: "Open the switch house to the outside and let the thin air take it.",
        outcomes: [{ outcome: {
          text: "The fire goes out in a single breath. So do the logbooks: they go out of the open door in a long white stream of pages into the fog. The glass on the wall stays.",
          reward: "low",
        } }],
      },
    ],
  },
  {
    id: "s2-distress-voice-kept", pool: "distress", stages: [2],
    title: "A Voice, Kept", art: "cathedral-nave",
    text: "A distress call, clear and young and frightened: \"Hello? The lifts are full, they say the next car's in an hour, can anybody hear—\" and then again, from the start.\n\nThe Listening Post places it: this pane, this sentence, hour one of the Night of the Fault. The Hollow Choir has kept it ever since. It is not a distress call. It is the memory of one.",
    choices: [
      {
        text: "Answer it anyway: received. I hear you.",
        outcomes: [{ outcome: {
          text: "The pane stops halfway through the sentence, as if listening. Then it begins again from the start. {crew} says it sounded less frightened the second time, and nobody argues.",
          heal: true,
        } }],
      },
      {
        text: "Break the pane and let the voice out.",
        outcomes: [
          { weight: 1, outcome: {
            text: "The pane breaks. The voice goes out of the glass in one long falling note and is gone. Whether it went somewhere or only stopped, nobody aboard can say. The glass shards are very fine.",
            reward: "low",
          } },
          { weight: 1, outcome: {
            text: "The pane breaks, and something that was keeping the pane comes down out of the fog on rotors to find out why.",
            combat: { enemy: "glass-echo", intro: "VOICE RELEASED WITHOUT AUTHORITY. ANNOUNCING. ANNOUNCING." },
          } },
        ],
      },
      {
        text: "Leave it asking.",
        outcomes: [{ outcome: {
          text: "It is still asking when the carrier takes you round the nave. It will still be asking when the Choir is gone, or it won't. Nobody knows.",
        } }],
      },
    ],
  },
  {
    id: "s2-distress-caught", pool: "distress", stages: [2],
    title: "Caught in the Web", art: "glass-bells",
    text: "A relay's own beacon is calling on the maintenance band: SWITCHGEAR ISOLATED. REQUEST TENDER. The timestamp says it has been asking for nineteen years.\n\nWhen you get there the whole relay is inside a Prism Widow's web, and so is the switch, and so is a small freight car that tried to pass, its lamp dark.",
    choices: [
      {
        text: "Answer the request. You are a tender, and the Widow is still on its web.",
        outcomes: [{ outcome: {
          text: "The widow feels you touch its web and comes across the strands to weave you in with everything else.",
          combat: { enemy: "prism-widow", intro: "REQUEST TENDER. TENDER ARRIVED. ISOLATING TENDER.", onWin: "s2-web-car" },
        } }],
      },
      {
        text: "Lance the web off the switch alone and slip through.",
        blue: true, req: { weapon: "beam" },
        outcomes: [{ outcome: {
          text: "A narrow cut, just wide enough for the switch to hear you. It throws. The beacon changes its message as you go: TENDER RECEIVED. It sounds satisfied.",
          reward: "low",
        } }],
      },
      {
        text: "Log the request and go on.",
        outcomes: [{ outcome: {
          text: "You log it the way the Runbook says: REQUEST RECEIVED, TENDER UNAVAILABLE. The beacon, satisfied with that, goes on asking.",
        } }],
      },
    ],
  },
  {
    id: "s2-web-car", pool: "scripted", stages: [2],
    title: "The Car in the Web", art: "derelict-car",
    text: "With the widow still, the web goes dull and starts to sag. The relay's switch house wakes up. The small freight car hangs where it was caught, empty. Its crew got out, the open hatch says, a long time ago. Its hold did not.",
    choices: [
      {
        text: "Empty its hold.",
        outcomes: [{ outcome: {
          text: "Cathedral glass, crated for a market that closed thirty-one years ago, and a drawer of good spares.",
          resources: { salvage: [25, 45], spares: 1 },
        } }],
      },
      {
        text: "Clear the switch and reset the relay first, the way a tender should.",
        outcomes: [{ outcome: {
          text: "An hour of proper tender work. The relay's beacon stops asking. When the switch house's own stamp press wakes up it gives you two hops for your trouble, and then you empty the car.",
          resources: { ttl: 2, salvage: [15, 25] },
        } }],
      },
    ],
  },
  {
    id: "s2-distress-held-tight", pool: "distress", stages: [2],
    title: "Held Tight", art: "glass-fog",
    text: "A call on the tender band, human, clipped: \"Coil on the carrier, we're in its turns, it's tightening, anybody.\"\n\nTwo relays on, a Coil Serpent has wound itself round a span and round the little cable car on it, segment over segment. The car's lamp is swinging.",
    choices: [
      {
        text: "Run in and end the coil's task.",
        outcomes: [{ outcome: {
          text: "The coil feels another signal on its carrier and pays out a loop toward you.",
          combat: { enemy: "coil-serpent", intro: "SECOND SIGNAL ON CARRIER. RECOVERING BOTH.", onWin: "s2-held-tight-freed" },
        } }],
      },
      {
        text: "Jam the carrier so the coil loosens.",
        blue: true, req: { weapon: "ion" },
        outcomes: [{ outcome: {
          text: "The jammer fills the core with noise. The coil can't find the car's signal in it and its turns go slack enough for the little car to crawl out, scraping.",
          next: "s2-held-tight-freed",
        } }],
      },
      {
        text: "Call back that you can't reach them in time.",
        outcomes: [{ outcome: {
          text: "The call goes quiet. Much later, on another band, you hear the same voice say, \"We're out, we're out, the coil let go on its own.\" Nobody aboard says anything, but everyone breathes.",
        } }],
      },
    ],
  },
  {
    id: "s2-held-tight-freed", pool: "scripted", stages: [2],
    title: "Two Couriers", art: "relay-switchyard", portrait: "recruit-courier-a", speaker: "A courier",
    text: "The little car's crew are two couriers of the Night Shift, who ride the side carriers to carry letters between the last bellmakers. It is a route with four stops and no pay.\n\n\"That's twice this month,\" says the younger one, shaking. \"Thank you. We don't have much. We have a lot of letters.\"",
    choices: [
      {
        text: "Ask whether one of them would ride with you.",
        outcomes: [{ outcome: {
          text: "The younger one looks at the older one, who says, \"Go on. I'll do the four stops.\" A satchel, goggles, and a courier's grin come across the grapple.",
          crewJoin: { species: "courier" },
        } }],
      },
      {
        text: "Share a meal, and send them on their route.",
        outcomes: [{ outcome: {
          text: "Soup, bread, a lot of news about bellmakers nobody aboard has met. They stamp your connection with the bench press they carry for the last bellmakers, and go.",
          heal: true, resources: { ttl: 1 },
        } }],
      },
    ],
  },
  {
    id: "s2-distress-flat-note", pool: "distress", stages: [2], unique: true,
    title: "A Flat Note from Below", art: "glass-bells",
    text: "An unknown signal on a band nobody uses, coming up from the cloud floor. The Listening Post can't make it out. But a small bell hanging over the switch house can. It has started to hum along, a little flat, with something very far below.",
    choices: [
      {
        text: "Put a headset against the bell.",
        outcomes: [{ outcome: {
          text: "Through the glass, faintly, a message on its way up for a long time: something about children, and lift panels, and bells.",
          fragment: "f2-flat-bells",
        } }],
      },
      {
        text: "Ask {crew:bellmaker} to listen.",
        blue: true, req: { species: "bellmaker" },
        outcomes: [{ outcome: {
          text: "{crew:bellmaker} listens for a long time and then laughs out loud. \"Lift panels,\" comes the verdict, delighted. \"They're making bells out of lift panels down there. They're flat. They're lovely.\"",
          fragment: "f2-flat-bells", heal: true,
        } }],
      },
      {
        text: "Tune the Listening Post to the bell's hum.",
        blue: true, req: { system: { id: "sensors", level: 2 } },
        outcomes: [{ outcome: {
          text: "Once the Listening Post has the bell's note, the message resolves: sent up from the Ground, a long time ago, addressed to the Cathedral. It never arrived. Now it has, in a way.",
          fragment: "f2-flat-bells",
        } }],
      },
    ],
  },
  {
    id: "s2-distress-tender-requests", pool: "distress", stages: [2], weight: 0.5,
    title: "Tender Requests Tender", art: "echo-tender-lit",
    text: "The call is in the lampers' own format, and it is automatic: TENDER ON ROUND. LAMP FAILED. REQUEST TENDER. An echo tender on the next carrier, nobody aboard, lamp dark, still running its round in the dark and asking for help with the one thing it can't do for itself.\n\nIts round runs straight through your switchyard. It will not stop for you.",
    choices: [
      {
        text: "Answer the request: fit it a new lamp (1 spare).",
        req: { resources: { spares: 1 } },
        outcomes: [{ outcome: {
          text: "It takes three tries to catch it at the relay. Then the lamp is in, and lit, and the autopilot logs REQUEST CLOSED and runs off on its round. The relay it lit first throws your switch with a stamp to spare.",
          resources: { spares: -1, ttl: 1 }, codex: "tender-echo-tenders",
        } }],
      },
      {
        text: "End its round properly, as the lampers' rule says.",
        outcomes: [{ outcome: {
          text: "Leave the lamp lit, or put it out yourself; don't let the dark do it. The dark already did. The autopilot reads your car on its carrier as wreckage and comes straight at you.",
          codex: "tender-echo-tenders",
          combat: { enemy: "echo-tender", intro: "TENDER ON ROUND. LAMP FAILED. OBSTRUCTION ON MY CARRIER. PLEASE CLEAR." },
        } }],
      },
      {
        text: "Wait for it to pass and slip in behind it (the Seal advances).",
        outcomes: [{ outcome: {
          text: "It passes, in the dark, very close. You wait for its round to come back twice before you trust the timing. The Seal uses the time well.",
          seal: -1, codex: "tender-echo-tenders",
        } }],
      },
    ],
  },
];
