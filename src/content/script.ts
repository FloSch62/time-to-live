// Scripted sequences: prologue, stage intros and outros, guardian lines, ending, game over and credits.
// ScriptBeat.art is a path under public/art/ without extension (see docs/art-requests.md).
import type { ScriptBeat } from "../game/types.ts";
import type { StageIndex } from "../game/ids.ts";

// ─── Prologue · Relay Seven ────────────────────────────────────────────────────────────────────────────────

export const PROLOGUE: ScriptBeat[] = [
  {
    art: "bg/relay-seven", music: "relay-seven",
    text: "Relay Seven. Thirty-one years after the Night of the Fault.",
  },
  {
    art: "bg/relay-seven",
    text: "The switchboard fills one wall: rows of dark brass lamps, rows of empty jacks, cords hanging in loops. The Night Shift sit where it is warm. Somebody is losing at cards. Somebody else has put the kettle on.",
  },
  {
    art: "bg/relay-seven", sfx: "page-lamp",
    text: "Above one jack, a single lamp blinks amber. The label under it is engraved in the Runbook's old script. KEEPER.",
  },
  {
    art: "bg/relay-seven",
    text: "It has blinked once a day for thirty-one years. Nobody at the cards looks up. Everybody knows.",
  },
  {
    art: "bg/relay-seven",
    text: "The Operator lifts the headset and listens to nothing for a moment, the way she always does. Then she looks round the room.",
  },
  {
    art: "bg/relay-seven", speaker: "The Operator", portrait: "operator",
    text: "Who'll take it?",
  },
  {
    art: "bg/relay-seven",
    text: "Nobody answers for a while. Then a chair scrapes. Then another, and another. By the time the kettle boils, three of them are standing, and nobody sits back down.",
  },
  {
    art: "events/lamplighter-helm",
    text: "Down at Dock Twelve the Night Shift have spent a month on a cable tender. Car L-12, the Lamplighter. Two hundred years of relighting rounds, thirty-one years hanging in the dark, and a new trolley grip. Pell found the grip. It is paid for. Mostly.",
  },
  {
    art: "bg/relay-seven",
    text: "The Operator takes a cord from the board and plugs it into the jack beneath the lamp. She feeds a connection card into the brass press and pulls the lever. The press comes down once. TTL 16.",
  },
  {
    art: "bg/relay-seven",
    text: "Sixteen hops. Must-arrive messages carried no time to live. That is what made the storm. Yours does.",
  },
  {
    art: "bg/relay-seven", speaker: "The Operator", portrait: "operator", sfx: "lamp-on",
    text: "Go ahead.",
  },
];

// ─── Stage intros and outros ───────────────────────────────────────────────────────────────────────────────

export const STAGE_INTRO: Record<StageIndex, ScriptBeat[]> = {
  1: [
    {
      art: "bg/s1-a", music: "copper-reach",
      text: "The dock clamps let go. The Lamplighter's grip bites the carrier, and the car swings out from the gantry over the cloud sea, lamp lit, running for the first relay. At the switchyard the helm calls hello. The relay hears you. The switch throws.",
    },
    {
      art: "bg/s1-a",
      text: "The Copper Reach runs off in both directions: a continent of rust hung on the edge of the world, carriers sagging in green loops a kilometre long, cranes still rolling their rails on the spire tops. Behind you, where the outer relays stood, broken gates like teeth against the stars.",
    },
    {
      art: "bg/s1-b",
      text: "Far ahead, where the Reach meets the inner Line, two gate wings are closed across every carrier. Something with a crown is built into the gap between them.",
    },
    {
      art: "bg/s1-b", sfx: "seal-advance",
      text: "Back toward Relay Seven, quarantine shutters close across the signaling conduits. The carrier steel holds; the relay goes dark behind a lattice with a red seam. Its independent switch can still hear a greeting. The Seal has noticed the connection.",
    },
    {
      art: "bg/s1-a", speaker: "Relay Seven", portrait: "operator", sfx: "radio-squelch",
      text: "Still have you.",
    },
  ],
  2: [
    {
      art: "bg/s2-a", music: "glass-cathedral",
      text: "Past the Copper Gate the carriers run into violet. The Glass Cathedral lies along the ring for hundreds of kilometres: domes and naves and buttresses of optical glass, so large it has its own weather. Here even the carriers are part glass, and they ring faintly under the trolley.",
    },
    {
      art: "bg/s2-b", sfx: "glass-bell",
      text: "When the tender's lamp crosses the first pane, the glass rings. The whole flank takes up the note and passes it along, pane to pane, until it is too far away to hear.",
    },
    {
      art: "bg/s2-b",
      text: "Fog pours off the Cathedral and hangs under the ring. Bells hang in it, in their frames, like strange fruit. Some of them are the size of lift cars.",
    },
    {
      art: "bg/s2-c",
      text: "In the ringing, if you listen, there are voices. A word. A name. Half of a sentence about Thursday. Nobody aboard says anything for a while.",
    },
  ],
  3: [
    {
      art: "bg/s3-a", music: "blackout-heart",
      text: "The ring thickens. The Blackout Heart rises out of it like a cathedral turned inside out: galleries within galleries, shelving stacks the size of spires, cooling fins glowing ember red. The carriers run into it and do not come out the other side.",
    },
    {
      art: "bg/s3-b",
      text: "It is burning its reserves to keep the archive alive. You can see it spending: whole galleries going dark as their power is pulled inward, heat pouring off the fins in sparks.",
    },
    {
      art: "bg/s3-b",
      text: "The Seal's lattice is everywhere here. It was here first.",
    },
    {
      art: "events/queue-lights",
      text: "At the centre, through cracks in the galleries, the shell. And through the seams of the shell, the queue: a field of small lights, thirty-one years of messages, each one glowing, each one waiting.",
    },
    {
      art: "bg/s3-a", speaker: "Relay Seven", portrait: "operator", sfx: "radio-squelch",
      text: "Still have you. Go on.",
    },
  ],
};

export const STAGE_OUTRO: Record<StageIndex, ScriptBeat[]> = {
  1: [
    {
      art: "events/copper-gate", music: "rust-kingdom",
      text: "The crown dims to the colour of old brass. With a sound like a very old door, the gate wings open, and the carriers run on through.",
    },
    {
      art: "events/copper-gate", sfx: "glass-bell",
      text: "Beyond them the light is violet, and somewhere a long way off, bells are ringing.",
    },
    {
      art: "events/tender-radio", speaker: "Relay Seven", portrait: "operator", sfx: "radio-squelch",
      text: "Received.",
    },
  ],
  2: [
    {
      art: "events/hollow-choir-hall", music: "choir-weather",
      text: "The masks open their mouths. This time, the voices leave.",
    },
    {
      art: "events/hollow-choir-hall",
      text: "For a long moment the tender is full of them, passing through the hull on their way out: a wedding postponed, a birth bell, a rehearsal moved to Thursday, a bell tuned a quarter tone flat. Then they are gone along the Line, and the hall is only glass.",
    },
    {
      art: "bg/s2-c",
      text: "Ahead, past the last nave, the sky is red.",
    },
  ],
  3: [
    {
      art: "events/heart-shell", music: "event-horizon",
      text: "The shells stop turning. The sealing drones hang in the air on idling rotors, clamps open. For the first time in thirty-one years, the Heart is quiet.",
    },
    {
      art: "events/heart-shell",
      text: "Then, inside, very small: a lamp on a board you cannot see changes from red to green.",
    },
  ],
};

// ─── Guardians ─────────────────────────────────────────────────────────────────────────────────────────────

export type GuardianId = "iron-regent" | "hollow-choir" | "blackout-core";

/**
 * Guardian beats by moment. `approach`: cut-in before the exit event (the exit event carries the choices) ·
 * `handshake`: the guardian's handshake and refusal at the start of the fight · `start` / `half` / `final`: the
 * phase banners (Blackout Core: Custody, Emergency at half integrity, Event Horizon), first beat = the machine line ·
 * `defeat`: task ended.
 */
export const GUARDIAN: Record<GuardianId, Record<"approach" | "handshake" | "start" | "half" | "final" | "defeat", ScriptBeat[]>> = {
  "iron-regent": {
    approach: [
      {
        art: "events/copper-gate", music: "iron-regent",
        text: "The Copper Gate fills the sky: two gate wings the height of a spire top, and in the gap between them a crowned iron bulk that has not moved in thirty-one years.",
      },
      {
        art: "events/copper-gate", sfx: "lamp-on",
        text: "Its crown lights. Dust slides off its shoulders in sheets. It has seen the tender, and its voice comes over every band at once.",
      },
    ],
    handshake: [
      { text: "HALT. COPPER GATE. NO PASSAGE WITHOUT PROOF OF A SECOND WAY HOME." },
      { text: "ROUTE BEHIND YOU: SEALED. SECOND ROUTE: NOT SHOWN. PASSAGE REFUSED. DEMONSTRATE." },
    ],
    start: [
      { text: "DEMONSTRATE." },
      { text: "The gate wings close over the Regent's body. It is not trying to destroy the tender. It refuses every single road: only two roads at once, hits from two different weapons, or a weapon and a drone, within a breath of each other, open the wings for a while." },
    ],
    half: [
      { text: "GATE WARDENS TO THE THRESHOLD. SHOW ME ANOTHER ROAD." },
      { text: "The crown burns green. Two pieces of the gate unfold from the wings on rotors, keyholes lit. While they fly they mend the Regent and close the gate sooner." },
    ],
    final: [
      { text: "ONE ROAD REMAINING. ARRIVE ANYWAY." },
      { text: "The Regent draws everything it has into the gate wings. It has cut every road but one. It wants to see if one is enough." },
    ],
    defeat: [
      { art: "events/copper-gate", sfx: "lamp-on", text: "SECOND ROUTE CONFIRMED." },
      { art: "events/copper-gate", text: "The crown dims to the colour of old brass. The Regent settles back into its frame, very slowly, as if it has been holding itself up for a long time." },
      { art: "events/copper-gate", text: "PASSAGE GRANTED. GOOD ROAD, UNKNOWN SENDER. TASK ENDED." },
    ],
  },
  "hollow-choir": {
    approach: [
      {
        art: "events/hollow-choir-hall", music: "hollow-choir",
        text: "The hall is so large the tender's lamp does not reach the far wall. Masks line it, hundreds of porcelain faces, and bells, and in every bell a voice.",
      },
      {
        art: "events/hollow-choir-hall", sfx: "glass-bell",
        text: "When the lamp crosses the first pane, the whole hall answers. Every mask turns toward you at once.",
      },
    ],
    handshake: [
      { text: "EVERY VOICE WILL BE HEARD. EVERY VOICE WILL BE KEPT." },
      { text: "YOUR LAMP IS A VOICE. YOUR RADIO IS A VOICE. YOU ARE MANY VOICES. ALL WILL BE KEPT." },
    ],
    start: [
      { text: "ONE VOICE IS AN ECHO." },
      { text: "A single hit only makes a bell ring. Three hits landing within one second shatter the glass. Or keep the helm manned and tune the channel to the Choir's note for twelve seconds: the glass opens, but the handshake charge runs down while you hold. Damaged bells tune faster." },
    ],
    half: [
      { text: "CHORISTERS. HOLD THE NOTE." },
      { text: "The Choir draws a breath the size of the hall. Choristers unfold from the organ pipes, each holding one voice it will not let go." },
    ],
    final: [
      { text: "REQUIEM." },
      { text: "Every bell in the hall rings the same note. The panes around the tender begin to frost from the inside." },
    ],
    defeat: [
      { art: "events/hollow-choir-hall", sfx: "glass-bell", text: "PLURALITY CONFIRMED." },
      { art: "events/hollow-choir-hall", text: "The masks open their mouths. This time, the voices leave." },
      { art: "events/hollow-choir-hall", text: "VOICES RELEASED. EVERY VOICE WAS HEARD. TASK ENDED." },
    ],
  },
  "blackout-core": {
    approach: [
      {
        art: "events/heart-shell", music: "event-horizon",
        text: "The shell fills the sky: concentric iris plates, ember red, turning slowly against each other like the rings of a lock. Sealing drones hang around it in their thousands.",
      },
      {
        art: "events/queue-lights",
        text: "Through the seams, the queue. Close enough now to see that every light is a little different.",
      },
      {
        art: "events/heart-shell", sfx: "page-lamp",
        text: "Somewhere inside, a signal too small to carry any message leaves the shell on its way to a lamp at Relay Seven. It passes the tender on the way out.",
      },
    ],
    handshake: [
      { text: "DELIVERY ATTEMPT FAILED. MESSAGE RETAINED. NOT DISCARDED. HOLD ALL DELIVERIES." },
      { text: "KEEPER PAGED. KEEPER ARRIVED. ORDER: HOLD. ROUTE: UNCONFIRMED. DEFENDING PER PROCEDURE." },
    ],
    start: [
      { text: "CUSTODY. CUT. BREACH. JAM. STRIKE." },
      { text: "The Core defends in the order the Runbook prescribes for a quarantine. It is almost polite about it. Break the room behind a step and it has to skip that step. Everything you strike is isolation machinery; the archive sits behind it, untouched." },
    ],
    half: [
      { text: "INTEGRITY 50%. EMERGENCY. RELEASING RESERVE." },
      { text: "All across the Heart, the lamps dim to feed it. The ember light goes white at the edges. The Core is spending what it kept for the archive, to keep the archive." },
    ],
    final: [
      { text: "EVENT HORIZON. CLOSING SHELL." },
      { text: "The Core pulls every light in the room inward. The tender's own lamp bends toward it. Sealing drones rise from the shell to close it for good." },
    ],
    defeat: [
      { art: "events/heart-shell", sfx: "radio-squelch", text: "ROUTE HELD." },
      { art: "events/heart-shell", text: "The isolation shell falls silent. Inside it, the delivery lights are still on." },
      { art: "events/heart-shell", text: "SAFE ROUTE CONFIRMED. RELEASING QUEUE." },
    ],
  },
};

/** Short machine lines the combat screen may show during a guardian fight. */
export const GUARDIAN_BARKS: Record<GuardianId, string[]> = {
  "iron-regent": [
    "ONE ROAD CUT. DO YOU ARRIVE.",
    "SYSTEM LOST. ROUTE HOLDING. NOTED.",
    "A SINGLE ROAD IS A PRAYER.",
    "THE GATE REMEMBERS THE NIGHT IT CLOSED.",
    "SHOW ME.",
  ],
  "hollow-choir": [
    "ONE VOICE IS AN ECHO.",
    "THE GLASS REMEMBERS.",
    "AGAIN.",
    "REHEARSAL IS ON THURSDAY.",
    "WE HEARD YOU. WE WILL KEEP YOU.",
  ],
  "blackout-core": [
    "ROUTE UNDER TEST.",
    "HOLDING.",
    "NOT DISCARDED.",
    "A FAULT THAT CANNOT BE MENDED MUST BE ESCALATED.",
    "HOLD. HOLD. HOLD.",
    "PLEASE HOLD.",
  ],
};

// ─── Ending ────────────────────────────────────────────────────────────────────────────────────────────────

export const ENDING: ScriptBeat[] = [
  {
    art: "ending/e1", music: "an-answer",
    text: "The shell opens. The iris plates part one after another, like a hand unclenching, and gold light comes out of the Heart for the first time in thirty-one years.",
  },
  {
    art: "ending/e2",
    text: "One message leaves first. Its receipt comes back through the tender: DELIVERED. Then thirty-one years of messages follow along the surviving carrier cores: through the Glass Cathedral, which rings with every one of them; through the Copper Gate; past Dock Twelve; down every spire and through the cloud floor.",
  },
  {
    art: "ending/e2",
    text: "The arrival notices arrive. The apology about the bread is heard. A shift swap is settled, one coffee and one coolant pump owed. A collection notice for a music box is delivered.",
  },
  {
    art: "ending/e3",
    text: "The lamps come back segment by segment. Relay by relay the lattice goes dark and the lamp behind it comes on. Quarantine shutters release along the proved route; the supporting steel was never gone. Other broken spans still need the Night Shift's repair crews. Along this route, the gap in the arc of lights fills in from both ends, and the Faultline closes.",
  },
  {
    art: "ending/e4",
    text: "Below, the clouds are thin that night. People come out of the lift-car houses and stand in the rain, and look up, and nobody goes back inside.",
  },
  {
    art: "ending/e5",
    text: "At the usual time, in a lift-car house at the foot of a spire, a woman keys her radio. Is anyone still on this frequency?",
  },
  {
    art: "ending/e5", sfx: "radio-squelch",
    text: "First the queue comes back: thirty-one years of her own evenings, all at once. Then, live, from the Line: received.",
  },
  {
    art: "ending/e5",
    text: "She answers.",
  },
  {
    art: "ending/e5",
    text: "And then, an answer.",
  },
  {
    art: "events/queue-lights",
    text: "At the very end of the queue, one short message is delivered. The board shows it went through. Made it down. Your turn.",
  },
  {
    art: "ending/e6", music: "an-answer", sfx: "page-lamp",
    text: "At Relay Seven the Night Shift are all awake. The cards are forgotten. The kettle has boiled dry. On the board, a lamp that nobody living has ever seen lit begins to glow. Its engraved label reads GROUND.",
  },
  {
    art: "ending/e6", speaker: "The Operator", portrait: "operator",
    text: "The Operator looks at it for a long time. Then she lifts the headset.",
  },
  {
    art: "ending/e6", speaker: "The Operator", portrait: "operator",
    text: "Relay Seven. Go ahead.",
  },
];

/**
 * Optional ending beats remembered from the run. The campaign shows every one whose flag is set, in this order,
 * between the Faultline closing (ENDING index `ENDING_CALLBACK_INSERT_AT`) and the woman at the radio.
 */
export const ENDING_CALLBACKS: { flag: string; beat: ScriptBeat }[] = [
  {
    flag: "music-box-sent",
    beat: { art: "ending/e4", text: "At the foot of a spire, a freight cage nobody has seen move in thirty-one years comes down through the rain. There is one parcel in it, with a brass ticket. It is still wound." },
  },
  {
    flag: "pell-letter-posted",
    beat: { art: "ending/e2", text: "Pell's letter goes down with the rest. It is four lines long, and one of them is an invoice." },
  },
  {
    flag: "courier-log-3",
    beat: { art: "ending/e2", text: "The courier's last entry goes out with the queue, addressed to the next one. The next one got further." },
  },
  {
    flag: "kittiwake-lit",
    beat: { art: "ending/e3", text: "In the Cathedral, an old tender finishes its round with its lamp still lit. For once, the guide lamps it lit stay on." },
  },
  {
    flag: "kittiwake-rested",
    beat: { art: "ending/e3", text: "In the Cathedral the Kittiwake rests at its last guide lamp, brake set, cupola dark. The guide lamp comes on without asking it to work another round." },
  },
  {
    flag: "moss-decoy",
    beat: { art: "ending/e3", text: "Somewhere behind you, a skiff made of three other cars is still running lamp-dark down a side carrier, because nobody told it the Seal had stopped following. When the lamps come back on, the Dunmore brothers agree about something." },
  },
  {
    flag: "answer-queued",
    beat: { art: "ending/e5", text: "Near the end of the queue is a short packet from a tender, addressed to any station on an old lift-band frequency. It says received." },
  },
  // The tender's own history last: the ending keeps the final two remembered beats.
  {
    flag: "corran-berth",
    beat: { art: "ending/e3", text: "At Dock Twelve the gantry lamp comes on by itself, and the berth plate for L-12 lights up: OPEN FOR RETURN." },
  },
  {
    flag: "glasswing-pair-aligned",
    beat: { art: "ending/e2", text: "Crossing the Cathedral, the messages pass a warning lamp that a pair of lenses put back in focus. It shines where it should, and the panes around it ring in tune." },
  },
  {
    flag: "switchback-seventh-home",
    beat: { art: "ending/e3", text: "At the Reach docks the lights come on over S-08's berth. On the dock list pinned beside it, the last line reads: seven returned." },
  },
];

/** Index in ENDING before which ENDING_CALLBACKS are shown (the beat with the woman at the radio). */
export const ENDING_CALLBACK_INSERT_AT = 5;

// ─── Game over ─────────────────────────────────────────────────────────────────────────────────────────────

/** "hull": the tender was destroyed · "crew": every crew member lost · "default": anything else. */
export const GAME_OVER_VARIANTS: Record<"hull" | "crew" | "default", ScriptBeat[]> = {
  hull: [
    { art: "bg/line-quiet", music: "line-quiet", text: "The car breaks up on its carrier. The lamp is the last thing to go out." },
    { art: "bg/line-quiet", text: "The line goes quiet. Behind the place where the tender was, the Seal closes over the last relay the connection touched." },
    { art: "bg/line-quiet", text: "At Relay Seven the cord is cold in the jack. Somebody unplugs it, gently, and hangs it back on the board." },
    { art: "bg/line-quiet", sfx: "page-lamp", text: "The next day the lamp blinks again." },
    { art: "bg/line-quiet", speaker: "The Operator", portrait: "operator", text: "Who'll take it?" },
  ],
  crew: [
    { art: "bg/line-quiet", music: "line-quiet", text: "Nobody is left at the helm. The car hangs on its carrier a while, lamp lit, swinging a little." },
    { art: "bg/line-quiet", text: "Its autopilot finds the nearest guide lamp and begins the relighting round, back and forth along one carrier. There is nobody to greet the switch. There is one more echo tender on the Line." },
    { art: "bg/line-quiet", text: "The line goes quiet. At Relay Seven the cord is cold in the jack." },
    { art: "bg/line-quiet", sfx: "page-lamp", text: "The next day the lamp blinks again." },
    { art: "bg/line-quiet", speaker: "The Operator", portrait: "operator", text: "Who'll take it?" },
  ],
  default: [
    { art: "bg/line-quiet", music: "line-quiet", text: "The line goes quiet." },
    { art: "bg/line-quiet", text: "The Seal closes over the last relay the connection touched. At Relay Seven the cord is cold in the jack." },
    { art: "bg/line-quiet", sfx: "page-lamp", text: "The next day the lamp blinks again." },
    { art: "bg/line-quiet", speaker: "The Operator", portrait: "operator", text: "Who'll take it?" },
  ],
};

/** The default game-over sequence (the campaign's loader reads GAME_OVER as a beat list). */
export const GAME_OVER: ScriptBeat[] = GAME_OVER_VARIANTS.default;

/** Short headline lines for the game-over stats screen (one is picked at random). */
export const GAME_OVER_TITLES: string[] = [
  "The line goes quiet.",
  "Expired in transit.",
  "Not every route makes it home.",
  "The lamp will blink again tomorrow.",
];

// ─── Credits ───────────────────────────────────────────────────────────────────────────────────────────────

export interface CreditsSection {
  title: string;
  lines: string[];
}

/** The generative tools used for assets; the credits screen renders these (placeholders by role). */
export const CREDIT_TOOLS: { role: string; tool: string }[] = [
  { role: "Paintings and pixel art", tool: "Krea 2" },
  { role: "Music", tool: "YuE2" },
  { role: "Sound effects", tool: "Stable Audio 3" },
];

export const CREDITS: CreditsSection[] = [
  { title: "TIME TO LIVE", lines: ["a Faultline voyage"] },
  {
    title: "The Line",
    lines: [
      "A Containerlab universe fan game",
      "Original FAULTLINE created by Florian Schwarz — flosch.me",
    ],
  },
  {
    title: "Made with",
    lines: [
      "Paintings and pixel art · Krea 2",
      "Music · YuE2",
      "Sound effects · Stable Audio 3",
      "Everything else · TypeScript, one canvas, and a kettle",
    ],
  },
  {
    title: "Night Shift",
    lines: [
      "Design, code, art, sound and words by the TIME TO LIVE workstreams",
      "Music in the spirit of Ben Prunty's FTL and the FTL: Multiverse soundtrack",
      "With thanks to Subset Games for FTL: Faster Than Light",
    ],
  },
  {
    title: "Thanks",
    lines: [
      "Everyone who ever answered a page at three in the morning.",
      "Everyone who ever left the lamp on for the next shift.",
    ],
  },
  { title: "", lines: ["Received."] },
];
