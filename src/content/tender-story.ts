import type { ScriptBeat, ShipState } from "../game/types.ts";
import type { LeadCarId } from "../game/ids.ts";
import { STARTING_TENDERS } from "../data/ship.ts";
import { PROLOGUE } from "./script.ts";

/** Fleet records belong to the hull, even when its current crew paints a new name. */
export const DOCK_RECORDS: Record<LeadCarId, string> = {
  lamplighter: "L-12, Lamplighter. Ilse Corran brought this car down eleven times during the evacuation. Her tally marks remain above the helm. Pell found the replacement for its cracked grip; the debt belongs to this car.",
  glasswing: "G-04, Glasswing. A lamplighter-pattern car fitted for optical inspection. Its alignment crew kept the Reach's warning lamps in focus. When the glass routes closed, they parked it with the lenses capped and wrote KEEP THE PAIR TOGETHER on the tool rack. The Night Shift have uncapped both.",
  switchback: "S-08, Switchback. A lamplighter-pattern car built tall for drone retrieval. It fetched inspection drones from places no person could reach. Its last dock record lists six returned and one still missing. The Night Shift rebuilt the retrieval cradles and kept the heavy drive; there was never a ward mesh aboard.",
};

/** The dock beat of the opening: which car the Night Shift readied, and what it carries now. */
function dockBeats(ship: ShipState): ScriptBeat[] {
  const id = ship.consist?.lead ?? "lamplighter";
  const profile = STARTING_TENDERS.find(p => p.id === id)!;
  const plate = ship.name && ship.name !== profile.name ? ` Today its plate reads ${ship.name}; the old name shows through the paint.` : "";
  if (id === "glasswing") return [
    { art: "events/refit-bay",
      text: `Down at the Reach docks the Night Shift have spent a month on car G-04, the Glasswing: the old lamplighter pattern, lamp cupola and trolley and all, fitted with paired lenses for optical inspection. Its last crew capped the lenses and painted KEEP THE PAIR TOGETHER on the tool rack. The Night Shift have uncapped both.${plate}` },
    { art: "events/refit-bay",
      text: "Both alignment emitters light the dock's test lamp at once. The machines beyond the docks no longer trust a living sender, and the same pulses, driven harder, can break a hunter's ward mesh. Fire the two together. There is no payload launcher aboard, and no charges to run out." },
  ];
  if (id === "switchback") return [
    { art: "events/refit-bay",
      text: `Down at the Reach docks the Night Shift have spent a month on car S-08, the Switchback: the old lamplighter pattern built tall, with launch cradles and a retrieval crane on the roof beside the trolley. It fetched inspection drones from spans no person could reach. Its last dock list says six returned and one still missing.${plate}` },
    { art: "events/refit-bay",
      text: "A service drone settles into its cradle. The machines beyond the docks no longer trust a living sender, so the Relay Drone now carries an emitter, and the Firewall catches payloads, debris and crawlers, though not emitter light. There is no ward mesh. Give the Veil two reactor bars and close the retrieval shutters against a volley; the drones keep working outside." },
  ];
  return [
    { art: "events/lamplighter-helm",
      text: `Down at Dock Twelve the Night Shift have spent a month on car L-12, the Lamplighter. Two hundred years of relighting rounds, thirty-one years hanging in the dark, and a new trolley grip. Pell found the grip. It is paid for. Mostly.${plate}` },
    { art: "events/lamplighter-helm",
      text: "The paired emitter relights the dock's guide lamp. The machines beyond the docks no longer trust a living sender, so the old repair-charge launcher now throws combat payloads through a ward mesh. Every charge spent is one the crew must replace." },
  ];
}

/**
 * The opening in the real game (the session swaps it in for PROLOGUE): Relay Seven exactly as the prologue tells
 * it, with the Lamplighter's dock beat replaced by the chosen car's, and one line that states the job.
 */
export function tenderOpening(ship: ShipState): ScriptBeat[] {
  const beats: ScriptBeat[] = [];
  for (const b of PROLOGUE) {
    if (b.art === "events/lamplighter-helm") {
      beats.push(...dockBeats(ship));
      beats.push({ art: "events/queue-lights",
        text: "The job is the one the lamp has asked for every day for thirty-one years. Carry a live connection relay by relay to the Heart, show the Core a route that holds, and let the queue go home. Break the isolation machinery; keep the archive whole." });
    } else beats.push(b);
  }
  return beats;
}

export function departureIntro(ship: ShipState): ScriptBeat[] {
  return [
    { art: "bg/s1-a", music: "copper-reach", sfx: "arrive",
      text: `The dock clamps let go. ${ship.name}'s grip bites the carrier and the car swings out over the cloud sea, lamp lit. At the first switchyard the helm calls hello. I hear you. I hear you hear me. The switch throws beneath the trolley.` },
    { art: "bg/s1-b", sfx: "seal-advance",
      text: "Behind the tender, quarantine shutters close over the signal conduits of Relay Seven's yard, and a black lattice with a red seam grows over them. The carrier steel holds. The Seal has noticed the connection. Every hop spends one TTL and lets it follow; reading and a tactical pause cost nothing." },
    { art: "bg/s1-b", speaker: "Relay Seven", portrait: "operator", sfx: "radio-squelch",
      text: "Still have you." },
  ];
}
