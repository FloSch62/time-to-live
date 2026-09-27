// Message fragments: real packets from the queue, leaking as the voyage goes on (contract §2).
// kind "queue": the evacuation's last traffic · "ground": sent up from below over thirty-one years ·
// "teal": the evening radio calls (always "Unknown sender · priority low").
// Every fragment is unlocked by at least one event outcome (`fragment: "<id>"`).
import type { FragmentDef } from "../game/types.ts";

const EVENING = "Unknown sender · priority low";
const ANY_STATION = "Any station on this frequency";

export const FRAGMENTS: FragmentDef[] = [
  // ─── Stage I · The Copper Reach ──────────────────────────────────────────────────────────────────────────
  {
    id: "f1-music-box", stage: 1, kind: "queue",
    from: "Copper Reach sorting office", to: "Holder of ticket 0415",
    text: "Parcel held for collection. Contents: one music box, still wound.",
  },
  {
    id: "f1-varga", stage: 1, kind: "queue",
    from: "A. Varga · cable crew", to: "H. Tallis · Bench Nine",
    text: "Left you the good crimper in the second drawer. Don't lend it to Pell.",
  },
  {
    id: "f1-imre", stage: 1, kind: "queue",
    from: "Maintenance roster · yard six", to: "Shift office · yard six",
    text: "Swapped shifts with Imre. I owe him a coffee and a working coolant pump.",
  },
  {
    id: "f1-berth", stage: 1, kind: "queue",
    from: "Dock Twelve · harbour master", to: "Tender L-12 · I. Corran",
    text: "Your berth is open for the return trip. The lights stay on.",
  },
  {
    id: "f1-tally", stage: 1, kind: "queue",
    from: "Dock Twelve · tally office", to: "Harbour master · Dock Twelve",
    text: "Car nine away with four hundred and six. Car ten loading. I'll count myself onto the last one.",
  },
  {
    id: "f1-bread", stage: 1, kind: "queue",
    from: "Galley · relay yard six", to: "Oona Brisk · lift head two",
    text: "Sorry about the bread. I said it was fine. It was not fine. Save me a seat anyway.",
  },
  {
    id: "f1-furnace", stage: 1, kind: "queue",
    from: "Foundry three · furnace crew", to: "Night relief · foundry three",
    text: "Banked the furnace instead of dousing it. Seemed a waste. If you come back up, it'll light.",
  },
  {
    id: "f1-tobi", stage: 1, kind: "queue",
    from: "Yard crane three · cab", to: "Whoever has Tobi",
    text: "Tobi is with the Senna family on car fourteen. He has his own lamp. Please make sure he doesn't lend it to anyone.",
  },
  {
    id: "f1-rack-c", stage: 1, kind: "queue",
    from: "Hollow Exchange · outbound queue", to: "Maintenance · rack C",
    text: "Repair request 4471: the fan in rack C is still rattling. Low priority. I'll look at it after the storm.",
  },
  {
    id: "f1-heartbeat", stage: 1, kind: "queue",
    from: "Outer relay three · automated", to: "Any relay",
    text: "Heartbeat. Heartbeat. Heartbeat. Is anyone still keeping count?",
  },
  {
    id: "f1-window-seat", stage: 1, kind: "queue",
    from: "Lift head four · car 212", to: "Mum · Relay Seven hostel",
    text: "Got a window seat. Can't see anything but cloud. Save me the good cup.",
  },
  {
    id: "f1-roof-hatch", stage: 1, kind: "ground",
    from: "Lift foot · car 31", to: "Lift control · any desk",
    text: "Car 31 at the bottom. The doors won't open to our keys any more. We're climbing out through the roof hatch. Please reset the doors when convenient.",
  },
  {
    id: "f1-first-rain", stage: 1, kind: "ground",
    from: "Spire foot · north camp", to: "Anyone at the Reach docks",
    text: "We are all right. It rains here all the time. Everyone is wet and nobody is hurt. Is anyone still up there?",
  },
  {
    id: "f1-fern", stage: 1, kind: "ground",
    from: "North camp · births", to: "The Record",
    text: "First packet. Name: Fern Adair. Born under the cloud. Hope: that she sees the lights.",
  },
  {
    id: "f1-teal-first", stage: 1, kind: "teal",
    from: EVENING, to: ANY_STATION,
    text: "Is anyone still on this frequency? I'll try again tomorrow at the same time.",
  },
  {
    id: "f1-teal-beans", stage: 1, kind: "teal",
    from: EVENING, to: ANY_STATION,
    text: "It rained all day. The beans came up anyway. Is anyone still on this frequency? I'll try again tomorrow at the same time.",
  },
  {
    id: "f1-teal-cold", stage: 1, kind: "teal",
    from: EVENING, to: ANY_STATION,
    text: "Is anyone still on this frequency? My hands are cold tonight, so this will be short. Same time tomorrow.",
  },

  // ─── Stage II · The Glass Cathedral ──────────────────────────────────────────────────────────────────────
  {
    id: "f2-quarter-tone", stage: 2, kind: "queue",
    from: "Cathedral bell-ringer", to: "North nave · whoever is listening",
    text: "I tuned the north bell a quarter tone flat, so you would know it was me.",
  },
  {
    id: "f2-thursday", stage: 2, kind: "queue",
    from: "Glass Cathedral · choir loft", to: "All choir",
    text: "Rehearsal moved to Thursday. Bring the old hymn book, the one with your notes in the margins.",
  },
  {
    id: "f2-wedding", stage: 2, kind: "queue",
    from: "Cathedral · south nave", to: "Both families",
    text: "Wedding postponed, not cancelled. We'll ring the bells when we're down. Keep your good clothes dry.",
  },
  {
    id: "f2-birth-bell", stage: 2, kind: "queue",
    from: "Bell loft · birth bell", to: "The Record",
    text: "Rang the birth bell for the Tamsyn girl at hour three. Everyone heard it over the alarms. Good lungs, both of them.",
  },
  {
    id: "f2-school", stage: 2, kind: "queue",
    from: "Station school · room two", to: "Parents · room two",
    text: "The class drew the relays today. Almost all of them drew the lights still on.",
  },
  {
    id: "f2-pane-forty", stage: 2, kind: "queue",
    from: "Pane crew · gallery nine", to: "Bellmaker Seldon",
    text: "Pane forty is cracked. It rings a little sad now. Don't replace it. I've got used to it.",
  },
  {
    id: "f2-results", stage: 2, kind: "queue",
    from: "Medical bay · level five", to: "Room eleven",
    text: "The results are fine. Stop worrying and come home.",
  },
  {
    id: "f2-loft-lamp", stage: 2, kind: "queue",
    from: "Choir loft · night warden", to: "Whoever comes back first",
    text: "Left the loft lamp on. The bells are in their frames. Somebody wind the clock.",
  },
  {
    id: "f2-announcement", stage: 2, kind: "queue",
    from: "Cathedral announcement engine", to: "All naves",
    text: "All shifts to the lifts. All shifts to the lifts. This is not a drill. Leave your instruments.",
  },
  {
    id: "f2-flat-bells", stage: 2, kind: "ground",
    from: "Spire foot · east camp", to: "The Glass Cathedral",
    text: "The children have made bells out of lift panels. They ring flat. The bellmakers among us say that's fine.",
  },
  {
    id: "f2-heard-bell", stage: 2, kind: "ground",
    from: "East camp · radio", to: "Any station",
    text: "On clear nights we can see the lights. Some of us swear we heard a bell. Please confirm or deny.",
  },
  {
    id: "f2-ten-years", stage: 2, kind: "ground",
    from: "Spire foot · north camp", to: "Relay Seven",
    text: "Ten years down today. We had a meal and set places for the Night Shift, in case. Is Relay Seven still there?",
  },
  {
    id: "f2-thursday-choir", stage: 2, kind: "ground",
    from: "East camp · choir", to: "Glass Cathedral · choir loft",
    text: "We started a choir. We rehearse on Thursdays. Nobody has the hymn book, so we sing what we remember, and we remember most of it.",
  },
  {
    id: "f2-teal-thin", stage: 2, kind: "teal",
    from: EVENING, to: ANY_STATION,
    text: "Is anyone still on this frequency? The clouds were thin tonight. I could see your lights, most of them. Same time tomorrow.",
  },
  {
    id: "f2-teal-aerial", stage: 2, kind: "teal",
    from: EVENING, to: ANY_STATION,
    text: "I fixed the aerial again. If this sounds better, that's why. Is anyone still on this frequency?",
  },
  {
    id: "f2-teal-singing", stage: 2, kind: "teal",
    from: EVENING, to: ANY_STATION,
    text: "Somebody down the valley was singing tonight. You'd have liked it. I'll try again tomorrow at the same time.",
  },

  // ─── Stage III · The Blackout Heart ──────────────────────────────────────────────────────────────────────
  {
    id: "f3-order", stage: 3, kind: "queue",
    from: "Quarantine office · stamped", to: "Blackout Heart · custodian",
    text: "Hold all deliveries until a safe route is confirmed. Signed, and I am sorry.",
  },
  {
    id: "f3-gate-log", stage: 3, kind: "queue",
    from: "Warden crew · gate log", to: "Whoever reads this",
    text: "Closing the backbone now. If anyone reads this, we always meant to open it again.",
  },
  {
    id: "f3-kettle", stage: 3, kind: "queue",
    from: "Bench Four · the warming lamp", to: "Whoever finds this",
    text: "Kettle's on the shelf. Whoever finds this, take a cup before you go on.",
  },
  {
    id: "f3-attempt", stage: 3, kind: "queue",
    from: "Core archive · retained", to: "All recipients",
    text: "Delivery attempt 11,204 failed. Message retained. Not discarded.",
  },
  {
    id: "f3-last-ack", stage: 3, kind: "queue",
    from: "Blackout Heart · last acknowledgement", to: "Any route",
    text: "If this arrives, the route works. Please answer, even with one word.",
  },
  {
    id: "f3-second-shuttle", stage: 3, kind: "queue",
    from: "Evacuation desk · deck three", to: "Waiting passenger · deck three",
    text: "Your sister is on the second shuttle. She kept your jacket.",
  },
  {
    id: "f3-knees", stage: 3, kind: "queue",
    from: "Warden crew · conduit", to: "Commander Harrow",
    text: "Switch thrown. Coming back up the conduit now. Tight fit going up. Sorry about the knees of the uniform.",
  },
  {
    id: "f3-coat", stage: 3, kind: "queue",
    from: "Heart · archive staff", to: "Relief shift",
    text: "Shelves one to forty checked. The Record is warm. I've left my coat on the chair; wear it if you're cold.",
  },
  {
    id: "f3-desk", stage: 3, kind: "queue",
    from: "Relay Seven · evacuation desk", to: "All outbound traffic",
    text: "Marking all outbound must arrive. Every one of them. Nobody gets lost tonight.",
  },
  {
    id: "f3-courier", stage: 3, kind: "queue",
    from: "Tender Kittiwake · keeper", to: "The next one",
    text: "Got as far as the glass. The next one will get further. Leave my tender lit.",
  },
  {
    id: "f3-pell-letter", stage: 3, kind: "queue",
    from: "P. · Copper Market", to: "A. Varga · wherever you landed",
    text: "I didn't lend it. I sold it, to the keeper, at a fair price. You'd have liked the price. You still owe me a coffee.",
  },
  {
    id: "f3-uncle", stage: 3, kind: "queue",
    from: "Second Helping · M. Adair", to: "Fern Adair · north camp",
    text: "Your uncle is still up here. I've kept a lamp for you, for when the lifts run. It's a good one. Don't lend it.",
  },
  {
    id: "f3-thirty-years", stage: 3, kind: "ground",
    from: "Spire foot · all camps", to: "The Line",
    text: "Thirty years. The children want to know if you're real. We said yes. Please don't make liars of us.",
  },
  {
    id: "f3-tin-keys", stage: 3, kind: "ground",
    from: "Spire foot · repair shop", to: "Lift control",
    text: "We cut new keys for the lift doors out of tin. It worked once, for about a minute. Please advise.",
  },
  {
    id: "f3-thursday-born", stage: 3, kind: "ground",
    from: "South camp · births", to: "The Record",
    text: "First packet. Name: Imre Vale. Born under the cloud, on a Thursday. Hope: that the Record still has room.",
  },
  {
    id: "f3-teal-late", stage: 3, kind: "teal",
    from: EVENING, to: ANY_STATION,
    text: "Is anyone still on this frequency? I'm late tonight, sorry. I'll be on time tomorrow.",
  },
  {
    id: "f3-teal-counting", stage: 3, kind: "teal",
    from: EVENING, to: ANY_STATION,
    text: "I counted the evenings once. Then I stopped counting and kept calling. Is anyone still on this frequency?",
  },
  {
    id: "f3-teal-rain", stage: 3, kind: "teal",
    from: EVENING, to: ANY_STATION,
    text: "Rain on the roof of the car tonight. It sounds like a relay hall. Is anyone still on this frequency? Same time tomorrow.",
  },
];
