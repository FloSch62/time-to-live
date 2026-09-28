import type { CrewMember, ScriptBeat } from "../game/types.ts";
import type { RunState } from "../campaign/model.ts";

export interface VoyageRecord { title: string; state: string; text: string }

/** Derived from saved decisions, not a second quest state that can drift from the actual story. */
export function promises(run: RunState): VoyageRecord[] {
  const has = (flag: string) => run.flags.includes(flag);
  const seen = (id: string) => run.usedEvents.includes(id);
  const records: VoyageRecord[] = [];
  const waiting = run.ended ? "UNFINISHED" : "CARRIED";
  if (has("music-box")) records.push({ title: "The sorting office's music box",
    state: has("music-box-sent") ? "HANDED OVER" : seen("chain-music-box-freight") ? "KEPT ABOARD" : waiting,
    text: has("music-box-sent") ? "Placed in the Heart's freight cage. Its dispatch waits for the route to open."
      : seen("chain-music-box-freight") ? "The crew chose to keep the box. The freight opportunity has passed."
      : `${has("music-box-wound") ? "The Cathedral heard its complete tune. " : "The Glass Cathedral may recognize its tune. "}Look for the freight rail near the Heart; there is a handover before its guardian.` });
  if (has("courier-log-1")) records.push({ title: "The courier's unfinished road",
    state: has("courier-log-3") ? "LAST PAGE FOUND" : run.stage > 2 && !has("courier-log-2") ? "MISSED IN GLASS" : waiting,
    text: has("courier-log-3") ? "The last entry was copied near the Heart. The next crew got further."
      : has("courier-log-2") ? `The Kittiwake was ${has("kittiwake-rested") ? "put to rest after its round" : "left running with its lamp lit"}. Seek the final entry in the Heart.`
      : run.stage > 2 ? "The crew left the Cathedral without completing the Kittiwake visit. Its pages remain there."
      : "Find the Kittiwake in the Glass Cathedral. Its old round carries the next pages; a contact is available before leaving the region." });
  if (has("pell-letter")) records.push({ title: "Pell's letter to A. Varga",
    state: has("pell-letter-posted") ? "POSTED" : waiting,
    text: has("pell-letter-posted") ? "Accepted into the queue. Delivery still depends on the final connection."
      : "Keep the folded invoice safe. Find the posting point in the Blackout Heart, before the isolation shell." });
  if (has("evening-frequency")) records.push({ title: "The evening caller",
    state: has("answer-queued") ? run.ended === "victory" ? "ANSWER DELIVERED" : "REPLY QUEUED" : waiting,
    text: has("answer-queued") ? "The reply says received. It shares the archive's route out."
      : "Keep the lift-band frequency. An opportunity to queue a reply comes near the Heart." });
  if (has("moss-met")) records.push({ title: "Moss and the Second Helping",
    state: has("moss-decoy") ? "DREW THE PATROL" : has("moss-robbed") ? "TERMS REMEMBERED" : has("moss-paid") ? "MET AGAIN" : waiting,
    text: has("moss-decoy") ? "The skiff drew quarantine aside. Its crew made that choice."
      : has("moss-robbed") ? "The crew took Moss's stores. That meeting remains on the skiff's radio log."
      : "Listen for the Second Helping in Glass and near the Heart. Their next call remembers how this crew treated them." });
  return records;
}

const MOTIVES: Record<CrewMember["species"], [string, string]> = {
  linefolk: ["Volunteered to hear whether a delayed shift-swap message ever reached home. Checks the lamp before every departure.", "Volunteered because someone must answer the board. Keeps a spare cup for whoever joins next."],
  warden: ["Volunteered to finish a handover the old gate crew never received. Counts everyone through a hatch before closing it.", "Volunteered to keep this crew moving through the quarantine. Checks each brace twice, quietly."],
  rigger: ["Volunteered to bring unfinished maintenance receipts back to their senders. Sorts loose fasteners by what can still be saved.", "Volunteered when the dock called for working hands. Leaves each borrowed tool facing its next user."],
  courier: ["Volunteered to carry one connection farther than the last runner managed. Reads relay numbers aloud at crossings.", "Volunteered because a held message still needs a route. Checks every seal before trusting a parcel."],
  bellmaker: ["Volunteered to hear an answer without the glass repeating it forever. Listens through the receiver before speaking.", "Volunteered to take a live voice through the Cathedral. Hums a tuning note while checking the instruments."],
};

export function volunteerRecord(crew: CrewMember): string {
  return crew.joinedAt ? `Joined at ${crew.joinedAt}. Chose to make the next crossing with this crew.` : MOTIVES[crew.species][crew.look % 2];
}

export function rememberedIncident(crew: CrewMember): string {
  return crew.memory ?? (crew.repairs ? `Kept the tender working through ${crew.repairs} completed repairs.` : "No personal incident entered yet. There is room on the page.");
}

/** A few specific reflections; the Runbook retains the complete record. */
export function endingReflections(run: RunState, callbacks: { flag: string; beat: ScriptBeat }[]): ScriptBeat[] {
  const beats = callbacks.filter(c => run.flags.includes(c.flag)).slice(-2).map(c => c.beat);
  const lost = run.stats.crewLost.at(-1);
  if (lost) beats.push({ art: "ending/e2", text: `The reply reaches the tender. ${lost.name}'s name remains in the log, beside the crossing they did not finish. Nobody strikes it out.` });
  else {
    const unfinished = promises(run).find(p => ["UNFINISHED", "CARRIED", "MISSED IN GLASS"].includes(p.state));
    if (unfinished) beats.push({ art: "ending/e2", text: `${unfinished.title} remains on the crew's page. The connection is open; that unfinished work still belongs to someone.` });
    else {
      const crew = run.ship.crew.find(c => c.memory);
      if (crew) beats.push({ art: "ending/e2", text: `${crew.name} makes one last entry before handing over the watch: ${crew.memory}` });
    }
  }
  return beats;
}
