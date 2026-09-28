// Short operational arrivals: a scene, a real cost or a battle whose premise changes the simulation.
import type { EventDef } from "../../game/types.ts";

export const OPERATIONS: EventDef[] = [
  ...([1, 2, 3] as const).map(stage => ({
    id: `s${stage}-patrol-acquisition`, pool: "combat" as const, stages: [stage], weight: 3,
    title: "Unknown Sender", art: "sealed-relay",
    text: "A search optic stops sweeping. It has found the tender's live connection. UNKNOWN SENDER. TRUST NOT ESTABLISHED. INTERCEPTING.",
    directCombat: { enemy: "quarantine-drone" as const, intro: "SIGNAL ACQUIRED. INTERCEPTING. A sealing drone: nobody aboard, and its controller repairs its own machinery. Disable the controller or its weapons. If you cannot hold, retreat through the switch; it costs a hop and moves the Seal." },
    choices: [],
  })),
  { id: "ops-lamp-kept", pool: "empty", stages: [1], weight: 3, glimpse: true,
    title: "Someone Came Before", art: "spire-top",
    text: "One guide lamp has clean glass. Beside it, a brush hangs by its cord. Someone stopped here and did the job, then went on.", choices: [] },
  { id: "ops-glass-answer", pool: "empty", stages: [2], weight: 3, glimpse: true,
    title: "A Second Note", art: "cathedral-nave",
    text: "The relay answers once. A distant pane catches the answer and returns it softly, an octave lower. For this crossing, neither voice is held.", choices: [] },
  { id: "ops-warm-cup", pool: "empty", stages: [3], weight: 3, glimpse: true,
    title: "Ready for the Next Shift", art: "tender-radio",
    text: "A maintenance lamp burns inside a shuttered gallery. On the sill sits a cup and a folded cloth. Somebody is still keeping a place ready.", choices: [] },
  { id: "ops-failed-fastening", pool: "event", stages: [1, 2, 3], weight: 1.4, unique: true,
    title: "Under the Paint", art: "relay-switchyard", maintenance: false,
    text: "A service gantry settles as the grip takes the tender's weight. Its concealed fastening gives way before anyone can reach the brake.",
    arrival: { text: "The falling beam tears a strip from {ship}'s outer plating. The crew secure it, but the car has lost four hull. The gantry's locker fell with it; this stop supplies nothing.", resources: { hull: -4 } }, choices: [] },
  { id: "ops-seized-grip", pool: "event", stages: [1, 2], weight: 1.5, unique: true,
    title: "A Grip That Will Not Open", art: "relay-switchyard", maintenance: false,
    text: "The relay's auxiliary grip closes over a hull brace. Its release motor is burned out. Every available way off the gantry costs something. The service cabinet is crushed beneath the motor.",
    choices: [
      { text: "Cut away the brace. Lose 3 hull; keep the route time.", outcomes: [{ outcome: { text: "The brace drops through the clouds. {ship} pulls clear with an open scar in its plating.", resources: { hull: -3 } } }] },
      { text: "Dismantle the grip. Let the Seal advance one step.", outcomes: [{ outcome: { text: "The bolts come out one by one. The hull stays intact. Behind the crew, another relay closes while the work is done.", seal: -1 } }] },
      { text: "Use the rigger's cutting guide. Sacrifice only 1 hull.", blue: true, req: { species: "rigger" }, outcomes: [{ outcome: { text: "{crew:rigger} finds the unloaded edge and cuts there. One small plate is lost. The rigger's preparation made the loss smaller; it did not make the grip harmless.", resources: { hull: -1 } } }] },
    ] },
  { id: "ops-genuine-distress", pool: "distress", stages: [1, 2, 3], weight: 2, unique: true,
    title: "The Last Dry Landing", art: "lift-head", maintenance: false,
    text: "A worker answers from a lift landing that is coming apart. The distress call is real. Getting a line across may save them, but the wet mounting plate could give way. There are no service stores here.",
    choices: [
      { text: "Attempt the rescue. A rigger helps; if the landing fails, it takes the line and whoever holds it.", outcomes: [
        { weight: 3, modifiers: [{ when: { species: "rigger" }, multiply: 2 }], outcome: { text: "The line takes. The worker climbs aboard shaking and offers the only thing left: another pair of hands. {crew} clears a place by the heater.", crewJoin: { species: "linefolk" } } },
        { weight: 2, outcome: { text: "The mounting plate tears out during the crossing. The worker's light disappears below the cloud. {crew} is pulled hard against the rail trying to hold the line. The damage and the silence remain.", resources: { hull: -2 }, crewDamage: { who: "one", amount: 24 } } },
      ] },
      { text: "Stay clear. There is no safe attachment point.", outcomes: [{ outcome: { text: "The crew pass the landing's number to the next relay. No receipt comes back. The landing disappears into the fog behind the tender." } }] },
    ] },
  { id: "ops-buffer-release", pool: "combat", stages: [1], weight: 2,
    title: "A Buffer That Cannot Let Go", art: "relay-switchyard",
    text: "A Packet Leech has trapped a maintenance reply in its buffer. Its intake and weapons share a controller. Break that controller's working capacity, stop firing, and hold a manned greeting for five seconds to release the duty while its hull remains intact.",
    choices: [
      { text: "Keep the buffer intact. Suppress its weapon controller and hold the greeting.", outcomes: [{ outcome: { combat: { enemy: "packet-leech", intro: "RELEASE THE BUFFER: disable Weapons, then hold a working attended helm for 5 seconds. Cease hull fire while it acknowledges.", scenario: { objective: "release-duty", system: "weapons", holdSeconds: 5, label: "Release held traffic" } } } }] },
      { text: "Force it off the carrier. A conventional fight.", outcomes: [{ outcome: { combat: { enemy: "packet-leech" } } }] },
    ] },
  { id: "ops-echo-last-round", pool: "combat", stages: [2], weight: 2,
    title: "At the End of the Round", art: "echo-tender-lit",
    text: "An empty tender repeats the last few metres of its relighting round. It fires whenever your greeting reaches its receiver. Its damaged drive can be stopped without breaking up the car; hold the greeting once the drive is disabled to set its final brake.",
    choices: [
      { text: "Stop the drive, then attend the helm through its five-second acknowledgement.", outcomes: [{ outcome: { combat: { enemy: "echo-tender", intro: "END THE ROUND: suppress Drive, keep the hull intact, and hold an attended greeting for 5 seconds.", scenario: { objective: "release-duty", system: "engines", holdSeconds: 5, enemyDamage: { engines: 1 }, label: "Set the final brake" } } } }] },
      { text: "Fight through. There is no time to preserve its round.", outcomes: [{ outcome: { combat: { enemy: "echo-tender" } } }] },
    ] },
  { id: "ops-stay-of-demolition", pool: "combat", stages: [3], weight: 2,
    title: "An Order Never Recalled", art: "sealed-relay",
    text: "A Demolition Engine holds an old work order against this relay. Its cutting machinery is still live. Disable its weapon feed and hold the recall on an attended helm; five uninterrupted seconds will let the mechanism park without tearing the Engine apart.",
    choices: [
      { text: "Suppress the weapon feed and hold the recall. Keep its hull intact.", outcomes: [{ outcome: { combat: { enemy: "demolition-engine", intro: "RECALL THE WORK ORDER: suppress Weapons, then keep the helm attended and working for 5 seconds.", scenario: { objective: "release-duty", system: "weapons", holdSeconds: 5, label: "Recall the demolition order" } } } }] },
      { text: "Break its machinery before it can act. A conventional fight.", outcomes: [{ outcome: { combat: { enemy: "demolition-engine" } } }] },
    ] },
];
