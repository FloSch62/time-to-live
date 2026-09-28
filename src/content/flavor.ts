// Display names, one-line descriptions and lore lines for every content id (contract §4).
// Pure data. Names match the contract exactly.
import type {
  AugmentId, BoarderId, DroneId, EnemyId, HazardId, KeelCarId, LampColor, LeadCarId, ModuleId, RearCarId, ResourceId,
  SpeciesId, StageIndex, SystemId, WeaponId,
} from "../game/ids.ts";

export interface Flavor {
  /** Display name, exactly as the contract lists it. */
  name: string;
  /** One line for tooltips and store cards. */
  desc: string;
  /** A short lore line (codex/tooltip footer). */
  lore: string;
}

/** Direction v2: how a hostile meets the tender. */
export type Mobility = "crawler" | "installation" | "flier";

export interface EnemyFlavor extends Flavor {
  /** crawler: rides a carrier or gantry rail · installation: built into a relay, gate or hall · flier: rotors. */
  mobility: Mobility;
  /** Class line under the name, e.g. "Recovery crawler · Copper Reach". */
  classLine: string;
  /** The machine handshake shown when combat starts (Runbook-speak). For human crews, their hail. */
  handshake: string;
  /** Shown on victory: the machine's last line. */
  taskEnded: string;
  /** One quiet prose sentence for the reward screen after the task ends. */
  aftermath: string;
  /** Human crews only: the surrender offer. */
  surrender?: string;
  /** Human crews only: what they say when the surrender is accepted. */
  surrenderAccepted?: string;
}

/** Roomless escorts of the guardians (not in ENEMY_IDS). */
export type EscortId = "gate-warden" | "sealing-drone";

// ─── Stages ────────────────────────────────────────────────────────────────────────────────────────────────

export interface StageFlavor {
  name: string; // used for the {stage} placeholder
  numeral: string;
  subtitle: string;
  plate: string; // map title plate line
  guardian: EnemyId;
}

export const STAGE_FLAVOR: Record<StageIndex, StageFlavor> = {
  1: {
    name: "The Copper Reach",
    numeral: "I",
    subtitle: "the rust kingdom",
    plate: "Docks, foundries and a thousand kilometres of green copper. The Iron Regent holds the gate.",
    guardian: "iron-regent",
  },
  2: {
    name: "The Glass Cathedral",
    numeral: "II",
    subtitle: "where the Line sang",
    plate: "Violet glass with its own weather. Voices in the panes. The Hollow Choir keeps them.",
    guardian: "hollow-choir",
  },
  3: {
    name: "The Blackout Heart",
    numeral: "III",
    subtitle: "the archive, spending itself",
    plate: "Ember light and the Seal's lattice. The queue glows inside the shell. The Core is waiting.",
    guardian: "blackout-core",
  },
};

// ─── Systems ───────────────────────────────────────────────────────────────────────────────────────────────

export const SYSTEM_FLAVOR: Record<SystemId, Flavor> = {
  shields: {
    name: "Shield Array",
    desc: "The ward mesh. Every 2 power raises one layer of charged ward-wire. Each hit strips a layer; layers recharge.",
    lore: "A lattice of ward-wire around the car that catches bolts and grounds them through the carrier. Wardens say it is the only honest system aboard.",
  },
  engines: {
    name: "Thrusters",
    desc: "The drive trolley's motors. Surge, brake and swing the car for evasion; spool up to take the next switch.",
    lore: "Lampers never stopped calling the drive the thrusters. The motors are older than the name, and they hum in B flat.",
  },
  weapons: {
    name: "Weapons Bay",
    desc: "Powers the tools bolted to the roof and belly mounts. Each needs its own power to charge.",
    lore: "The mounts were built for splicers and signal lamps. The Night Shift bolted on what they had.",
  },
  air: {
    name: "Air Plant",
    desc: "Keeps the decks breathable. Outside the car the air is too thin to live on. Unpowered, the air slowly goes.",
    lore: "Ilse Corran got nine people through it on a plant rated for four. It has not forgotten.",
  },
  medbay: {
    name: "Bench Infirmary",
    desc: "Heals crew standing in the room.",
    lore: "A cot, a lamp, a drawer of dressings sorted by what they could still save.",
  },
  helm: {
    name: "Helm",
    desc: "Must be attended to complete a relay greeting and provide evasion. Automation prepares the switch; a crew member answers.",
    lore: "Up in the nose, under the lamp, at the cab window. Scratched brass above the switch lever. The Runbook never trusted a greeting to a machine alone.",
  },
  sensors: {
    name: "Listening Post",
    desc: "L1 sees your own car in the dark, L2 enemy rooms and crew, L3 enemy weapon charge, L4 enemy power.",
    lore: "A headset, a dial and a patient ear. Most of the Line is quiet. The trick is hearing what is quiet on purpose.",
  },
  doors: {
    name: "Bulkheads",
    desc: "Doors and deck hatches. Open and close them; higher levels hold boarders back longer.",
    lore: "The corridor door sticks and the galley hatch squeals. Everyone knows the kick, and nobody oils the hatch.",
  },
  drones: {
    name: "Drone Bay",
    desc: "Launches re-keyed maintenance drones. Each launch uses spares.",
    lore: "A rack for the Line's small machines, re-keyed. They follow crews, as they were built to. Now they follow yours.",
  },
  veil: {
    name: "Lamp-Dark Veil",
    desc: "Douse every lamp and go silent on the carrier: high evasion, and enemy weapons stop charging while it lasts.",
    lore: "Lampers had a word for running with the cupola dark. They only used it when they had to.",
  },
};

// ─── Weapons ───────────────────────────────────────────────────────────────────────────────────────────────

export const WEAPON_FLAVOR: Record<WeaponId, Flavor> = {
  "packet-laser": {
    name: "Packet Laser",
    desc: "Signal emitter · 1 bolt, 1 damage · 1 power. Light, quick, reliable.",
    lore: "A relay's signal emitter pushed until its light cuts. It still says hello when it powers up.",
  },
  "burst-emitter": {
    name: "Burst Emitter",
    desc: "Signal emitter · 2 bolts, 1 damage each · 2 power.",
    lore: "Two emitters on one trigger. Built to relight a relay and its neighbour in one pass.",
  },
  "triple-burst": {
    name: "Triple Burst",
    desc: "Signal emitter · 3 bolts, 1 damage each · 2 power.",
    lore: "The Reach docks' answer to anything with three mesh layers. The answer is three.",
  },
  "jumbo-frame": {
    name: "Jumbo Frame",
    desc: "Signal emitter · 1 heavy bolt, 2 damage · 1 power.",
    lore: "One oversized pulse. The Runbook warns against them. The Runbook has not met a Scrap Foreman.",
  },
  "jumbo-frame-ii": {
    name: "Jumbo Frame II",
    desc: "Signal emitter · 2 heavy bolts, 2 damage each · 3 power.",
    lore: "Two oversized pulses. Somebody in the Copper Market thought the first one was too polite.",
  },
  "multicast-array": {
    name: "Multicast Array",
    desc: "Signal emitter · 5 bolts, 1 damage each · 4 power. Slow to charge.",
    lore: "A yard emitter built to relight a whole switchyard of lamps at once. Now it says one thing to five rooms.",
  },
  jammer: {
    name: "Jammer",
    desc: "Jammer · 1 ion · 1 power. Floods a machine's inputs with noise: strips mesh and stuns systems, no hull damage.",
    lore: "A fault-finder's tool: flood a relay with noise and see what goes quiet.",
  },
  "flood-cannon": {
    name: "Flood Cannon",
    desc: "Jammer · 2 ion · 3 power.",
    lore: "A storm in a barrel. People who remember the Null Storm do not like standing near it.",
  },
  "fiber-lance": {
    name: "Fiber Lance",
    desc: "Optical lance · 1 damage per room crossed, short · 2 power. Each mesh layer weakens it.",
    lore: "A lance cut from Cathedral glass, made for fusing optical carrier cores. It fuses other things too.",
  },
  "trunk-lance": {
    name: "Trunk Lance",
    desc: "Optical lance · 2 damage per room crossed, long · 3 power.",
    lore: "A trunk-carrier splicing lance of heavy Cathedral glass. Lampers held it with both hands and did not look at the light.",
  },
  "payload-launcher": {
    name: "Payload Launcher",
    desc: "Slug thrower · 3 damage · 1 power · uses 1 payload. Goes through the mesh.",
    lore: "It threw spliced repair charges onto relays nobody could reach. The charge has changed; the aim has not.",
  },
  "breach-spike": {
    name: "Breach Spike",
    desc: "Slug thrower · 4 damage, likely to breach · 3 power · uses 1 payload.",
    lore: "A cable anchor meant for pinning a carrier to a gantry. It pins very firmly.",
  },
  "thermite-payload": {
    name: "Thermite Payload",
    desc: "Slug thrower · 1 damage, very likely to start a fire · 1 power · uses 1 payload.",
    lore: "Foundry thermite in a repair shell. For welding, originally. Originally.",
  },
  "scatter-shot": {
    name: "Scatter Shot",
    desc: "Rivet scatter · 3 rivets in a spread, 1 damage each · 2 power.",
    lore: "A riveting gun from the Reach docks with the guide taken off. It clears wreckage off a carrier, and anything else in the way.",
  },
  "heartpulse-chain": {
    name: "Heartpulse Chain",
    desc: "Signal emitter · 2 bolts · 2 power. Charges faster with every volley.",
    lore: "Tuned to the old heartbeat. Once an hour became once a minute became now.",
  },
  "cathedral-chime": {
    name: "Cathedral Chime",
    desc: "Optical lance and jammer · 1 damage per room plus ion · 3 power.",
    lore: "A bellmaker's tuning lance of violet glass. The target rings. Everything near it rings too, a quarter tone flat.",
  },
};

// ─── Drones ────────────────────────────────────────────────────────────────────────────────────────────────

export const DRONE_FLAVOR: Record<DroneId, Flavor> = {
  "firewall-drone": {
    name: "Firewall Drone",
    desc: "Re-keyed defence drone on rotors. Shoots down incoming payloads.",
    lore: "Be strict in what you let through. It is very strict.",
  },
  "relay-drone": {
    name: "Relay Drone",
    desc: "Re-keyed repeater drone on rotors. Circles the enemy and fires a small emitter.",
    lore: "A repeater drone that carried a supervisor's voice. It carries yours now, loudly.",
  },
  "rigger-drone": {
    name: "Rigger Drone",
    desc: "Repair drone. Crawls the outside of the car patching the hull, then is spent.",
    lore: "A rigging automaton's little cousin. Braces the plates, runs out of rivets, rests.",
  },
  "bulwark-drone": {
    name: "Bulwark Drone",
    desc: "Re-keyed guard drone on rotors. Shoots down enemy drones.",
    lore: "Built to keep wreckage off the relay lamps. It has decided drones are wreckage.",
  },
  "crawler-drone": {
    name: "Crawler Drone",
    desc: "Boarding drone. Crawls across and into an enemy room and sabotages its system.",
    lore: "A cable-cleaning crawler. It cleans systems right out of their housings.",
  },
};

// ─── Augments ──────────────────────────────────────────────────────────────────────────────────────────────

export const AUGMENT_FLAVOR: Record<AugmentId, Flavor> = {
  "startup-config": {
    name: "Startup Config",
    desc: "Weapons start every fight fully charged.",
    lore: "A card of settings clipped inside the tool mounts' junction box. Someone wrote READY in the margin.",
  },
  "hot-swap-rig": {
    name: "Hot Swap Rig",
    desc: "Weapons charge 10% faster.",
    lore: "You never take the Line down to fix it. The architects' proudest trick, bolted to a rack.",
  },
  "vargas-crimper": {
    name: "Varga's Crimper",
    desc: "Repairs 1 hull after every hop.",
    lore: "A. Varga's good crimper. Left to Hobb Tallis. Somehow Pell's. Now yours. Do not lend it.",
  },
  "harrows-kettle": {
    name: "Harrow's Kettle",
    desc: "All crew heal fully after every hop.",
    lore: "Warden-Commander Harrow's kettle. Take a cup before you go on.",
  },
  "salvage-arm": {
    name: "Salvage Arm",
    desc: "+15% salvage from victories.",
    lore: "A crane arm off a Scrap Foreman, bolted to the belly. It still chalks marks on what it picks up.",
  },
  "listening-horn": {
    name: "Listening Horn",
    desc: "Reveals the contents of relays next to you on the map.",
    lore: "A Rust Prophet's horn turned around and bolted to the cupola. It listens down the carriers now instead of warning. Much nicer company.",
  },
  "brass-plating": {
    name: "Brass Plating",
    desc: "15% chance to negate hull damage.",
    lore: "Dock Twelve's old plate stock. Tarnished, riveted, stubborn.",
  },
  "sprinkler-runbook": {
    name: "Sprinkler Runbook",
    desc: "Fires in empty rooms die out faster.",
    lore: "Procedure 31: fire in an unmanned room. Step one: do not panic. Step two onward: the sprinklers.",
  },
  "bench-kit": {
    name: "Bench Kit",
    desc: "Crew heal slowly anywhere in the car.",
    lore: "A bench keeper's roll of tools and dressings. Smells of tea.",
  },
  "lamp-dark-coating": {
    name: "Lamp-Dark Coating",
    desc: "+5% evasion.",
    lore: "Soot-black paint over the brass and a damper on the trolley's hum. The lampers hated it. It works.",
  },
  "second-way-home": {
    name: "Second Way Home",
    desc: "Once per stage, survive a hit that would break up the car, at 1 hull.",
    lore: "A shard of the Iron Regent's crown. Proof you had another road, when you needed it.",
  },
  keepalive: {
    name: "Keepalive",
    desc: "Mesh layers recharge 15% faster.",
    lore: "A small signal that says still here, sent every second to the ward mesh. It listens.",
  },
  "drone-recovery": {
    name: "Drone Recovery",
    desc: "Spent drones come home after a fight.",
    lore: "A return route for drones: a reel and a homing lamp. This one was built properly.",
  },
  "wireshark-tap": {
    name: "Wireshark Tap",
    desc: "See enemy weapon charge regardless of the Listening Post.",
    lore: "A tap spinner's sampler, re-keyed. The Night Shift call it a wireshark because it bites the wire and does not let go.",
  },
};

// ─── Crew species and boarders ─────────────────────────────────────────────────────────────────────────────

export const SPECIES_FLAVOR: Record<SpeciesId, Flavor> = {
  linefolk: {
    name: "Linefolk",
    desc: "100 HP. Learns station skills 1.5× faster.",
    lore: "The people who stayed. For thirty-one years they have had to learn every job there is.",
  },
  warden: {
    name: "Warden",
    desc: "130 HP. Strong in a fight, slow to move and repair. Takes half damage from fire; charges the ward mesh faster when manning it.",
    lore: "Trained from sixteen to hold a boundary. Some of them were holding it the night of the order.",
  },
  rigger: {
    name: "Rigger",
    desc: "90 HP. Repairs twice as fast, fights poorly. Needs no air; cannot use the Bench Infirmary, mends itself while repairing.",
    lore: "An escort automaton re-keyed with a first hello. It remembers nothing from before, except sometimes a route.",
  },
  courier: {
    name: "Courier",
    desc: "80 HP. Fast. +3% evasion while at the Helm or the Thrusters.",
    lore: "Message runners. What the Line could not carry, they carried, and some still do.",
  },
  bellmaker: {
    name: "Bellmaker",
    desc: "70 HP. Tunes the system in their room: +1 free power to it. Joins only by choice.",
    lore: "They stayed in the Cathedral and tuned bells nobody else could hear. They can hear your car.",
  },
};

export const BOARDER_FLAVOR: Record<BoarderId, Flavor> = {
  "spark-mite": {
    name: "Spark Mite",
    desc: "Small, fast boarder. Sabotages systems. 40 HP.",
    lore: "A cleaning mite built to strip corrosion from contacts. With no contacts left, it strips anything live.",
  },
  splicer: {
    name: "Splicer",
    desc: "Boarder that cuts doors and opens breaches. 80 HP.",
    lore: "A splicing rig that still cuts cables in order to repair them. Nobody closed its ticket.",
  },
  "marshal-trooper": {
    name: "Marshal Trooper",
    desc: "Armoured boarder of the Heart. 140 HP.",
    lore: "A Null Marshal's escort detail. It is here to see you safely out.",
  },
};

// ─── Resources and hazards ─────────────────────────────────────────────────────────────────────────────────

export const RESOURCE_FLAVOR: Record<ResourceId, Flavor> = {
  salvage: {
    name: "Salvage",
    desc: "Night Shift currency. Buys weapons, systems, repairs and stamps.",
    lore: "Salvage is anything that outlived its owner. Pell says that includes her.",
  },
  ttl: {
    name: "TTL",
    desc: "Hops left on the connection. Every relay switch spends 1. At 0 no relay will switch you.",
    lore: "Must-arrive messages carried no time to live. That is what made the storm. Yours does.",
  },
  payloads: {
    name: "Payloads",
    desc: "Spliced charges for the slug throwers.",
    lore: "Stubby brass shells with teal tips. They used to carry repair foam and a splice.",
  },
  spares: {
    name: "Spares",
    desc: "Automaton spares. Drones use them; some events want them.",
    lore: "A teal lens in an ivory ring. Every escort has one. Every escort would like it back.",
  },
  hull: {
    name: "Hull",
    desc: "The car's plating. At 0 the car breaks up and the connection is lost.",
    lore: "Two hundred years of Reach dock rivets. Treat them kindly.",
  },
};

export const HAZARD_FLAVOR: Record<HazardId, Flavor> = {
  "debris-field": {
    name: "Debris Field",
    desc: "Wreckage from the outer relays snagged in the carriers. Small hull hits to both sides.",
    lore: "The Night of the Fault still hangs in the cables out here, swinging and ticking, piece by glittering piece.",
  },
  "rust-squall": {
    name: "Rust Squall",
    desc: "Corrosion in the air. Slowly eats the hull of machines.",
    lore: "A cloud of oxide off a thousand kilometres of cable. The machines have no paint left. You do.",
  },
  "sun-glare": {
    name: "Sun Glare",
    desc: "Sun-side of the ring. Fires break out in random rooms on both sides.",
    lore: "Copper throws the sun like a mirror. Keep a hand on the sprinklers.",
  },
  "glass-fog": {
    name: "Glass Fog",
    desc: "Listening Posts go blind on both sides. Machines are rarer; the Seal moves slower.",
    lore: "The Cathedral's own weather. The carriers frost over and ring faintly as the trolley runs through it.",
  },
  "ringing-panes": {
    name: "Ringing Panes",
    desc: "Periodic pulses ionise a random system on both sides.",
    lore: "The glass sings when light crosses it. Out here, the song gets into the wiring.",
  },
  resonance: {
    name: "Resonance",
    desc: "All weapons charge 10% faster, everyone's.",
    lore: "The whole flank of the Cathedral is humming in tune. Everything wants to fire on the beat.",
  },
  "ember-draft": {
    name: "Ember Draft",
    desc: "Fires spread faster and start on their own.",
    lore: "Heat pouring off the Heart's cooling fins. The archive is spending itself, and it burns.",
  },
  "dark-stretch": {
    name: "Dark Stretch",
    desc: "Listening Posts go blind. No markets.",
    lore: "The Core pulled every lamp here inward. Only the relay's guide lamp still burns, on its trickle.",
  },
  "sealing-lattice": {
    name: "Sealing Lattice",
    desc: "The Seal moves twice as fast from this relay.",
    lore: "The quarantine's black lattice runs ahead of itself along the carriers here. It can smell a warm route.",
  },
};

// ─── Enemies ───────────────────────────────────────────────────────────────────────────────────────────────
// Handshakes and task-ended lines follow the mobility class: crawlers talk about the carrier they ride,
// installations about the place they are built into, fliers about their patrol.

export const ENEMY_FLAVOR: Record<EnemyId | EscortId, EnemyFlavor> = {
  // Stage I · Copper Reach
  "packet-leech": {
    name: "Packet Leech", mobility: "crawler",
    classLine: "Recovery crawler · Copper Reach",
    desc: "Crawls the carrier. Emitters, and a clamp that drains the ward mesh.",
    lore: "It gathered stray traffic off the carrier cores for an exchange that stopped answering. The buffer is full. It is still gathering.",
    handshake: "CARRIER TRAFFIC DETECTED. BUFFER 100%. EXCHANGE NOT ANSWERING. HOLDING YOUR TRAFFIC FOR COLLECTION.",
    taskEnded: "BUFFER RELEASED. 88,412 PACKETS TO OUTBOUND QUEUE. GRIP RELEASED. TASK ENDED.",
    aftermath: "The collector hangs light and still on its carrier. Its last packets join your outbound queue.",
  },
  "cable-wraith": {
    name: "Cable Wraith", mobility: "crawler",
    classLine: "Isolation cutter · the Seal",
    desc: "A long cutter crawling the carrier shears first. Cutting beam.",
    lore: "Sent crawling down the carriers in the eleventh hour to cut every route the storm could use. The stand-down never reached it.",
    handshake: "LIVE ROUTE ON THIS CARRIER. STORM PATH. CUTTING PER ORDER OF HOUR 11.",
    taskEnded: "SHEARS STOWED. CARRIER LEFT WHOLE. STAND-DOWN ASSUMED. TASK ENDED.",
    aftermath: "The shears fold away. For once, a carrier stays connected.",
  },
  "rust-prophet": {
    name: "Rust Prophet", mobility: "installation",
    classLine: "Maintenance beacon mast · Copper Reach",
    desc: "A beacon mast over a relay yard. Broadcasting horns that jam everything passing.",
    lore: "It warned the yards about corrosion. With nobody coming, the warnings got louder, and then they became the corrosion.",
    handshake: "CORROSION WARNING. CORROSION WARNING. ALL TRAFFIC PASSING THIS MAST WILL BE INFORMED.",
    taskEnded: "WARNING ACKNOWLEDGED. MAST SILENT. BROADCAST ENDED.",
    aftermath: "The horns go quiet. The warning lamp on the mast stops turning, and nobody has to be told anything.",
  },
  "scrap-foreman": {
    name: "Scrap Foreman", mobility: "crawler",
    classLine: "Gantry crane · Copper Reach",
    desc: "A yard crane rolling its gantry rail. Payloads and an emitter. Heavy.",
    lore: "It runs the yard's inspections along its rail and hauls condemned hardware to the smelters. It has condemned the whole yard twice.",
    handshake: "INSPECTION DUE. UNREGISTERED CAR ON YARD CARRIER. CONDEMNED PENDING PAPERWORK.",
    taskEnded: "INSPECTION CLOSED. PAPERWORK NOT FILED. CRANE PARKED. TASK ENDED.",
    aftermath: "The hammer rests at the end of its rail. The condemned list goes unsigned, forever.",
  },
  "scavenger-skiff": {
    name: "Scavenger Skiff", mobility: "crawler",
    classLine: "Salvaged cable car · Night Shift scavengers",
    desc: "Three dead cars welded together on a working trolley. Emitters. The crew can surrender.",
    lore: "Copper Market crews who need parts more than they can afford to be kind. Not pirates. Hungry.",
    handshake: "Nice lamp. We'll take it, and anything else that comes off easy.",
    taskEnded: "Their lamps go dark one by one. The skiff hangs on its carrier with its salvage nets out.",
    aftermath: "Nobody out here wanted it to go this way. Least of all them.",
    surrender: "All right. All right. Hold fire. We've got salvage and a spare stamp. Take it and let us limp home.",
    surrenderAccepted: "Received. We'll remember the lamp. In a good way, this time.",
  },
  "static-nest": {
    name: "Static Nest", mobility: "installation",
    classLine: "Brood hive under a relay platform · Copper Reach",
    desc: "Hatches spark mites and sends them down the carrier to board you.",
    lore: "Each hatchling holds one line open until the exchange answers. The exchange has not answered since the Fault.",
    handshake: "BROOD ACTIVE. 4,112 LINES HELD. PASSING CARRIER HAS LINES. HATCHING TO HOLD 1 MORE.",
    taskEnded: "BROOD DORMANT. ALL LINES RELEASED. TASK ENDED.",
    aftermath: "The nest under the platform goes quiet. For once, every line it held is let go.",
  },
  "ferric-colossus": {
    name: "Ferric Colossus", mobility: "installation",
    classLine: "Foundry guardian · elite · Copper Reach",
    desc: "Built into a foundry wall over the carriers. Heavy iron and a furnace mouth. Very dangerous.",
    lore: "It keeps people away from a furnace that was banked, not doused. It trusts only iron and redundant circuits.",
    handshake: "FOUNDRY THREE. UNKNOWN SENDER ON FOUNDRY CARRIER. NOT IRON. NOT REDUNDANT. FURNACE DOOR CLOSED.",
    taskEnded: "FURNACE UNATTENDED. GUARD RELIEVED. TASK ENDED.",
    aftermath: "The furnace door settles in the foundry wall. Even iron can learn to rest.",
  },
  "iron-regent": {
    name: "The Iron Regent", mobility: "installation",
    classLine: "The Copper Gate · Guardian of the Reach",
    desc: "The crowned gate machine built into the Copper Gate. Gate Wardens unfold from its wings.",
    lore: "When the ring broke it closed its wings across every carrier. Its law is older than the linefolk.",
    handshake: "HALT. COPPER GATE. NO PASSAGE WITHOUT PROOF OF A SECOND WAY HOME.",
    taskEnded: "SECOND ROUTE CONFIRMED. PASSAGE GRANTED. GATE OPEN. TASK ENDED.",
    aftermath: "The crown dims to the colour of old brass. The gate wings open on the carriers, and beyond them the glass bells are ringing.",
  },
  // Stage II · Glass Cathedral
  "prism-widow": {
    name: "Prism Widow", mobility: "crawler",
    classLine: "Optical repair automaton · Glass Cathedral",
    desc: "Glass legs on glass-web cables, and webs of light.",
    lore: "It spun optical thread across cracked panes. Now it weaves isolation around the last working signals. Flawlessly.",
    handshake: "LIVE SIGNAL ON UNPROTECTED CARRIER. WEAVING ISOLATION. PLEASE HOLD STILL.",
    taskEnded: "WEB COMPLETE. OR NOT. TASK ENDED.",
    aftermath: "The glass web unravels off the carrier. Light takes the long way home.",
  },
  "glass-echo": {
    name: "Glass Echo", mobility: "flier",
    classLine: "Bell-drone on rotors · Glass Cathedral",
    desc: "Small, fast, and very hard to hit.",
    lore: "It carried a bell's note to the far naves. It repeats the last order it heard, louder as it cracks.",
    handshake: "ALL SHIFTS TO THE LIFTS. ALL SHIFTS TO THE LIFTS. ALL SHIFTS TO THE",
    taskEnded: "— LIFTS.",
    aftermath: "The bell cracks through and the rotors wind down. Its last echo goes out and does not come back.",
  },
  "wire-weaver": {
    name: "Wire Weaver", mobility: "crawler",
    classLine: "Wiring automaton · Glass Cathedral",
    desc: "Many arms and cable spools on the carrier. Launches drones.",
    lore: "The Hollow Exchange sent it up to rewire the bell frames. It cannot tell a repair from a snare.",
    handshake: "REPAIR ORDER OPEN. CONNECTION FOUND ON CARRIER. ADDING TENSION.",
    taskEnded: "TENSION RELEASED. REPAIR ORDER CLOSED. TASK ENDED.",
    aftermath: "The threads slacken. Your connections are yours again.",
  },
  "glass-choir": {
    name: "Glass Choir", mobility: "installation",
    classLine: "Announcement bells on a frame · Glass Cathedral",
    desc: "Three linked bells hung over the carriers in a nave.",
    lore: "Three bells ring three fragments of the evacuation order. They never agree. There is no quorum.",
    handshake: "HOLD. — RELEASE. — HOLD. NO QUORUM. REPEATING TO PASSING TRAFFIC.",
    taskEnded: "QUORUM REACHED: SILENCE.",
    aftermath: "For a moment, all three bells agree on silence.",
  },
  "coil-serpent": {
    name: "Coil Serpent", mobility: "crawler",
    classLine: "Cable-recovery coil · Glass Cathedral",
    desc: "A long segmented coil wound round the carrier.",
    lore: "It wound up dead cable for reuse. Now it tightens around anything that still carries a signal.",
    handshake: "SIGNAL ON CARRIER. RECOVERING CARRIER.",
    taskEnded: "CABLE RECOVERED: 0 METRES. TASK ENDED.",
    aftermath: "The coils open and slide off the carrier. There is more than one way home.",
  },
  "echo-tender": {
    name: "Echo Tender", mobility: "crawler",
    classLine: "Keeper's tender on autopilot · nobody aboard",
    desc: "A tender like yours on its last carrier, lamp lit, running its round.",
    lore: "When a keeper's crew are lost, the autopilot keeps relighting two lamps, back and forth along one carrier, forever.",
    handshake: "TENDER ON ROUND. CREW ABOARD: 0. LAMP: LIT. OBSTRUCTION ON MY CARRIER. PLEASE CLEAR.",
    taskEnded: "ROUND COMPLETE. AUTOPILOT RELEASED. BRAKE SET.",
    aftermath: "The autopilot lets go. Leave the lamp lit, or put it out yourself; don't let the dark do it.",
  },
  "hollow-choir": {
    name: "The Hollow Choir", mobility: "installation",
    classLine: "Announcement engine · Guardian of the Glass Cathedral",
    desc: "Bells, masks and organ-pipe spines hung in the glass hall. Only many hits at once break the glass.",
    lore: "It seals every unanswered voice in a bell, because a voice sealed in glass can still be heard.",
    handshake: "EVERY VOICE WILL BE HEARD. EVERY VOICE WILL BE KEPT.",
    taskEnded: "PLURALITY CONFIRMED. VOICES RELEASED. TASK ENDED.",
    aftermath: "The masks open their mouths. This time, the voices leave.",
  },
  // Stage III · Blackout Heart
  "gate-sentinel": {
    name: "Gate Sentinel", mobility: "installation",
    classLine: "Checkpoint over the carriers · Blackout Heart",
    desc: "Key-scanner eye and barred gates across the carrier.",
    lore: "It checks keys at the archive's trust boundary. The keys expired more than ten thousand days ago.",
    handshake: "PRESENT KEY. KEY EXPIRED 10,871 DAYS AGO. UNKNOWN SENDER. CARRIER HELD.",
    taskEnded: "CHECKPOINT UNATTENDED. LOCK RELEASED. ARCHIVE INTACT.",
    aftermath: "The checkpoint's bars lift off the carrier. The archive remains intact.",
  },
  "null-marshal": {
    name: "Null Marshal", mobility: "crawler",
    classLine: "Trust-boundary escort car · Blackout Heart",
    desc: "An angular armoured car. Sends marshal troopers down the carrier.",
    lore: "It escorted keyed engineers across the boundary. There are no keyed engineers any more, so it escorts you out.",
    handshake: "ESCORT AVAILABLE FOR KEYED ENGINEERS. KEYED ENGINEERS FOUND: 0. ESCORTING INTRUDERS OUT.",
    taskEnded: "WARRANT EXPIRED. ESCORT STANDING DOWN.",
    aftermath: "The warrant expires. The carrier belongs to the living.",
  },
  "ash-moth": {
    name: "Ash Moth", mobility: "flier",
    classLine: "Cooling drone on rotors · Blackout Heart",
    desc: "Radiator-fin wings that shed burning ash.",
    lore: "It follows heat to the relays that need cooling. Its wings are ruined, and it sets fire to what it tries to save.",
    handshake: "HEAT SOURCE FOUND ON CARRIER. COOLING.",
    taskEnded: "HEAT SOURCE COOLED. ROTORS DOWN. TASK ENDED.",
    aftermath: "The wings fold around a lantern that no longer needs tending.",
  },
  "grave-reaver": {
    name: "Grave Reaver", mobility: "crawler",
    classLine: "Reactor dismantler · Blackout Heart",
    desc: "Huge claws on a heavy trolley. Breach payloads.",
    lore: "It took dead reactors apart so their parts could live again. It hears every weak signal as permission to begin.",
    handshake: "WEAK SIGNAL ON CARRIER. DECOMMISSION PERMITTED. BEGINNING.",
    taskEnded: "NOTHING LEFT TO DISMANTLE. TASK ENDED.",
    aftermath: "The claws lower. Its last task is finally over.",
  },
  "demolition-engine": {
    name: "Demolition Engine", mobility: "crawler",
    classLine: "Decommissioning machine · elite · Blackout Heart",
    desc: "Built to bring down relays. Very dangerous.",
    lore: "It was sent down the carriers to bring down a relay the wardens sealed. The recall never reached it.",
    handshake: "WORK ORDER 7: BRING DOWN SEALED RELAY. OBSTRUCTION ON CARRIER. RECALL NOT RECEIVED. COUNTDOWN STARTED.",
    taskEnded: "COUNTDOWN SUSPENDED. RECALL ASSUMED. TASK ENDED.",
    aftermath: "The countdown lamp dims to nothing. The relay it came for will stand another night.",
  },
  "blackout-core": {
    name: "The Blackout Core", mobility: "installation",
    classLine: "The Heart's shell · Guardian of the archive",
    desc: "Concentric shells and sealing drones. Custody, Emergency, Event Horizon.",
    lore: "It sent for you. It has to stop you. A route that survives it is safe by definition.",
    handshake: "DELIVERY ATTEMPT FAILED. MESSAGE RETAINED. NOT DISCARDED. HOLD ALL DELIVERIES.",
    taskEnded: "SAFE ROUTE CONFIRMED. RELEASING QUEUE.",
    aftermath: "The isolation shell falls silent. Inside it, the delivery lights are still on.",
  },
  // Any stage
  "quarantine-drone": {
    name: "Quarantine Drone", mobility: "flier",
    classLine: "Sealing drone on rotors · the Seal",
    desc: "Black shell, red seam light, four rotors. Holds sealed relays.",
    lore: "It closed the shell. Now it closes and holds every relay a live connection has crossed.",
    handshake: "ROUTE NOT CONFIRMED SAFE. RELAY SEALED. HOLDING.",
    taskEnded: "CLAMPS OPEN. ROUTE MARKED SAFE. TASK ENDED.",
    aftermath: "The clamps open and the rotors wind down. Somewhere behind the shell, a route is marked safe.",
  },
  // Guardian escorts (fliers)
  "gate-warden": {
    name: "Gate Warden", mobility: "flier",
    classLine: "Piece of the Copper Gate · escort",
    desc: "Unfolds from the Regent's gate wings on rotors to hold the threshold.",
    lore: "A portcullis engine that answers only the crown.",
    handshake: "THRESHOLD HELD.",
    taskEnded: "THRESHOLD RETURNED TO GATE.",
    aftermath: "The warden folds back into a piece of the gate. Its keyhole goes dark.",
  },
  "sealing-drone": {
    name: "Sealing Drone", mobility: "flier",
    classLine: "The Core's shell drone · escort",
    desc: "Raised in the Event Horizon to close the shell.",
    lore: "The first drones of the Seal, kept close to the Core for thirty-one years.",
    handshake: "SEAL.",
    taskEnded: "UNSEALED.",
    aftermath: "The drone's red seam goes dark, and the shell has one less hand on it.",
  },
};

// ─── The consist: cars, modules, livery (contract "★ v2.1 — The modular tender") ──────────────────────────────

export interface CarFlavor extends Flavor {
  /** Where it couples: the lead car, behind it (rear), or slung beneath it (keel, the "belly car"). */
  slot: "lead" | "rear" | "keel";
}

export const CAR_FLAVOR: Record<LeadCarId | RearCarId | KeelCarId, CarFlavor> = {
  lamplighter: {
    name: "Lamplighter", slot: "lead",
    desc: "The lead car: cab and helm at the nose, drive trolley on the roof, three tool mounts, two socket holds.",
    lore: "Car L-12 out of Dock Twelve. Two hundred years of relighting rounds. Grip from Pell, paid (mostly).",
  },
  glasswing: {
    name: "Glasswing", slot: "lead",
    desc: "Lamplighter-pattern inspection car: paired emitters, a survey lab and a ward mesh. No payloads, one drone slot.",
    lore: "G-04 kept the Reach's warning lamps in focus. KEEP THE PAIR TOGETHER is still painted on its tool rack.",
  },
  switchback: {
    name: "Switchback", slot: "lead",
    desc: "Tall lamplighter-pattern retrieval car: launch cradles, a heavy drive and Veil shutters. No ward mesh fitted.",
    lore: "S-08 fetched inspection drones back from spans no person could reach. Its last dock list reads six returned, one missing.",
  },
  "drone-car": {
    name: "Drone Car", slot: "rear",
    desc: "Drone Bay IV, +1 drone slot, +6 spare capacity, 15% faster drone cycles and a socket. Drones and power sold separately.",
    lore: "A rigger-yard car with a rotor hatch in the roof. The drones come home to it like lampers to a bar at the end of a shift.",
  },
  "armory-car": {
    name: "Armory Car", slot: "rear",
    desc: "One extra roof mount, 10% faster weapon charging and a socket. Buy the gun and reactor power separately.",
    lore: "A warden escort car from the Copper Gate garrison. The mount ring is still stencilled NEVER FIRE ALONG THE LINE.",
  },
  "freight-car": {
    name: "Freight Car", slot: "rear",
    desc: "Logistics car: +4 salvage at each supplying relay, +4 cargo, +4 payload capacity, +3 hull and a socket.",
    lore: "A Reach freight car with a sliding door that sticks halfway. It has carried everything from cable drums to a piano, once.",
  },
  "bunk-car": {
    name: "Bunk Car", slot: "rear",
    desc: "Crew support: +3 berths, an equipped recovery bench and a socket. Recruit crew separately.",
    lore: "A lift crew's rest car: six bunks, a curtain, a kettle ring. Somebody carved initials into every bunk, including the ceiling.",
  },
  "veil-car": {
    name: "Veil Car", slot: "rear",
    desc: "Veil II, 10% shorter cooldown and a socket. Reserve two reactor power for its full dark window.",
    lore: "A dampened car the lampers took to misfiring relays: soot-black inside and out, lamps on shutters, the quietest room on the Line.",
  },
  "ballast-keel": {
    name: "Ballast Keel", slot: "keel",
    desc: "Storm protection: +8 hull, half the hull damage from debris and half the air loss.",
    lore: "Tanks and lead slung under the lead car on hangers. The car swings less and breathes longer. The crew call it the cellar.",
  },
  "listening-keel": {
    name: "Listening Keel", slot: "keel",
    desc: "Belly car. A horn array: +1 Listening Post, and nearby relays show on the chart.",
    lore: "A belly car full of brass horns pointed down the carriers. Most of them came off Rust Prophets, who were not asked.",
  },
  "sling-keel": {
    name: "Sling Keel", slot: "keel",
    desc: "A light weapon cradle: one belly mount and +4 payload capacity. Buy the gun and power separately.",
    lore: "A slung cradle for a slug thrower. Scavengers call it the underarm, and throw from it accordingly.",
  },
  "workshop-keel": {
    name: "Workshop Keel", slot: "keel",
    desc: "35% faster repairs, +2 hull recovered after secured ordinary fights, an equipped bench, +2 spare capacity and a socket.",
    lore: "A bench keeper's belly car: a vice, a lathe, and a drawer sorted by what it could still save.",
  },
};

export const MODULE_FLAVOR: Record<ModuleId, Flavor> = {
  "drone-bay": {
    name: "Drone Bay Refit",
    desc: "Fits a socket room with the Drone Bay system, when no drone car carries one.",
    lore: "Racks, a rotor hatch and a reel of homing line, all in one crate. Assembly takes a night and a lot of opinions.",
  },
  "veil-housing": {
    name: "Veil Housing",
    desc: "Fits a socket room with the Lamp-Dark Veil system, when no veil car carries one.",
    lore: "Shutters for every lamp, a damper for the trolley, and a switch labelled DARK in very small letters.",
  },
  workshop: {
    name: "Workshop",
    desc: "Repairs go 25% faster.",
    lore: "A vice bolted to the deck and a pegboard of tools. Every tool has an outline painted behind it, so you know which one is missing.",
  },
  bunks: {
    name: "Bunks",
    desc: "Room for 1 more crew member.",
    lore: "Two fold-down bunks and a curtain. The top one is warmer. This is argued about.",
  },
  "cargo-hold": {
    name: "Cargo Hold",
    desc: "+2 cargo.",
    lore: "Straps, rails and a chalk board of what is where. The chalk board is always wrong.",
  },
  "payload-rack": {
    name: "Payload Rack",
    desc: "+3 max payloads.",
    lore: "A rack of brass cradles with teal clips. Payloads sit in it like eggs in a box, and are handled the same way.",
  },
  ballast: {
    name: "Ballast Tanks",
    desc: "+3 maximum hull. Repair the added capacity at an exchange; refitting does not restore hull.",
    lore: "Water and lead in riveted tanks. Heavy is safe, the Reach docks said. The Reach docks were usually right.",
  },
  "listening-horn-array": {
    name: "Listening Horn Array",
    desc: "+1 Listening Post level.",
    lore: "A cluster of horns, brass or glass, pointed down the carrier. A bellmaker can tune one until it hears a relay breathe.",
  },
  "kettle-bench": {
    name: "Kettle Bench",
    desc: "Crew heal slowly in this room.",
    lore: "A bench, a lamp, a kettle on a ring. Nothing else. It is enough.",
  },
};

export const LIVERY_FLAVOR: Record<LampColor, { name: string; lore: string }> = {
  amber: { name: "Amber", lore: "The old lampers' colour. Warm, and it says you mean it." },
  teal: { name: "Teal", lore: "The colour of fibre light. Architects liked it; it looks like a route." },
  violet: { name: "Violet", lore: "Cathedral glass. Bellmakers swear the lamp rings, very faintly." },
  ember: { name: "Ember", lore: "The warden stripe. Nobody on a carrier argues with an ember lamp." },
  ivory: { name: "Ivory", lore: "Plain work light. Honest, and easy to read by." },
};

// ─── Map relay types (for tooltips on the stage map) ───────────────────────────────────────────────────────

export const RELAY_FLAVOR: Record<
  "combat" | "event" | "distress" | "market" | "hazard" | "bench" | "empty" | "exit" | "sealed" | "unknown",
  { name: string; desc: string }
> = {
  combat: { name: "Hostile", desc: "Something here keeps a duty that includes you." },
  event: { name: "Relay", desc: "A relay with something going on." },
  distress: { name: "Unknown signal", desc: "A signal nobody signed, coming down the carrier. Could be anyone. Could be anything." },
  market: { name: "Exchange", desc: "Salvage, stamps, repairs. Bring something to trade." },
  hazard: { name: "Hazard", desc: "The weather out here has opinions." },
  bench: { name: "Bench", desc: "A lamp left on for the next shift." },
  empty: { name: "Quiet relay", desc: "Nothing here but the lamp." },
  exit: { name: "Guardian", desc: "The way on. Something is standing in it." },
  sealed: { name: "Sealed", desc: "The Seal has closed this relay and holds it. Drones only; nothing worth taking." },
  unknown: { name: "Unknown", desc: "Out of range of the Listening Post." },
};
