"""DIRECTION v5 production prompts (A3): pixel-art scenes in the R3 night recipe chosen by the A1 style study.

Installed into specs.ASSETS as version "v5" of the existing ids (bg/<id>:v5, ending/<id>:v5, events/<id>:v5), so the
candidates, manifest records and finals keep their usual paths. Scene briefs follow docs/art-briefs.md (L's
lore-checked briefs) and are written here in the order the style heads expect; `subjects.py` stays L's.

Scenes: 5120x2880 render -> 640x360 art px (tools/art/pixelscene.py --preset pix8), drawn 3x in game.
Events: 2560x1280 render -> 320x160 art px (--preset event), drawn 2x in the 640x320 event frame.
"""
import re
from pathlib import Path

from study import CARRIERS, LAYOUT3, NIGHT3, PIX_EVENT, PIX_SCENE, STUDY_NEG

SCENE_GEN = (5120, 2880)
SCENE_SIZE = (640, 360)

# the region's light lives in the brief, never in the shared heads (the copper horizon leaked into the Cathedral)
LIGHT = {
    "s1": ("Copper Reach palette: verdigris green and rust orange machinery, brass, small warm amber lamps; the thin "
           "horizon glow is copper and rose."),
    "s2": ("Glass Cathedral palette: violet optical glass, dark brass, frost white and small teal lights; the thin "
           "horizon glow is cold pale violet and teal, never orange."),
    "s3": ("Blackout Heart palette: blackened iron and dark copper, the Seal's black lattice with thin glowing red "
           "seams, ember red light and small amber and gold lights; the thin horizon glow is ember red."),
}

BG = {
    "s1-a": ("The Copper Reach, the loud end of the Line. Along the top edge, the riveted underside of the ring gone "
             "verdigris green and rust orange, with gantries, girder trusses, hanging loops of green copper cable and "
             "a row of small amber lamps. Far below, a cloud sea lit copper and rose near the horizon; slender dark "
             "relay spires rise out of it, crowned with stacked rusty shipping containers and lattice cranes with a "
             "few tiny warm windows; far away on the horizon a broken ring gate of rusted copper stands on a spire."),
    "s1-b": ("The broken outer relays of the Copper Reach. Along the top edge, the ring's dark underside with a row of "
             "small amber lamps that stops at a dark break, snapped girders and cut cable ends hanging down at the "
             "break. Far below, a dark cloud sea with a few slender spires; far away on the horizon the outer relay "
             "gates, huge circular lattice rings of rusted copper standing on edge like enormous broken wheels, one "
             "snapped open with its ends bent apart; tangled wreckage hangs snagged on the carrier cables near them. "
             "Nothing floats free."),
    "s1-c": ("The foundries of the Copper Reach on the sun side. Along the top edge, the ring's rusted underside with "
             "banked furnace vents glowing dull red and short smoke stacks. Far below, a copper-gold cloud sea with "
             "a low glare along the horizon; rusted spire tops with cranes; far away on the horizon the Copper Gate, "
             "two enormous closed gate wings on a spire with a dark crowned iron bulk between them."),
    "s1-d": ("The switch-tower canyon, a working landmark of the Copper Reach. A colossal verdigris switch tower is "
             "cropped by the left edge, with enormous exposed copper pulley wheels, zigzag service stairs and crane "
             "booms; a narrow counterweight tower stands at the far right edge; the carrier cables run between their "
             "tops. Between the towers, a deep open indigo chasm. Far below, an island of stacked orange shipping "
             "containers with tiny warm workshop windows sits on a spire top in dark low cloud. No roof across the "
             "top."),
    "s1-e": ("The Sunward Drydock, a refuge in the Copper Reach. A horseshoe-shaped maintenance dock of chipped ivory "
             "and dark copper rises at the lower right, with three crane booms, small cable cars sleeping in their "
             "cradles, each hanging by its trolley from a dock gantry, and small amber workshop windows. At the far "
             "left, a low pale gold sun sits just above the far cloud horizon, partly behind the dark silhouette of a "
             "distant spire top, with a few long thin golden streaks. At the lower left, stacked fuel tanks and a "
             "small lamp-lit balcony. No ring underside across the top."),
    "s2-a": ("The Glass Cathedral, the part of the voyage people talk about. Along the top edge the ring becomes a "
             "range of glass architecture: domes, naves and flying buttresses of violet optical glass on dark brass "
             "ribs, glowing faintly from within, frost on the panes. Veils of pale violet glass fog pour down from it "
             "toward the cloud sea far below; slender dark relay spires of machinery (antenna masts and optical "
             "relay housings, never churches) rise from a violet-lit cloud sea."),
    "s2-b": ("Glass fog under the Glass Cathedral. Along the top edge, the violet glass underside of the ring with "
             "frost and dark brass frames. Low luminous banks of violet-white fog lie in soft horizontal layers over "
             "the cloud sea far below; the tips of dark relay spires and a few faint glass bells show through the "
             "fog. Soft and banded."),
    "s2-c": ("The bells of the Glass Cathedral. Along the top edge, the ring's underside of violet glass and dark "
             "brass with a row of huge bells of translucent violet glass (not metal) hanging beneath it in brass "
             "yokes, some the size of a lift car, faintly lit inside. Far below, a twilight cloud sea in violet and "
             "indigo with distant relay spires."),
    "s2-d": ("The Mirror Reservoir, a working landmark of the Glass Cathedral: two immense cracked hexagonal mirror "
             "dishes of violet glass in dark brass gimbals stand at the left and right edges, angled inward; a "
             "staircase of translucent prisms descends low in the scene, catching thin cyan beams; the centre stays "
             "empty; far below, layered pale violet glass fog."),
    "s2-e": ("The Quiet Observatory, a refuge in the Glass Cathedral. At the right, a slender ivory telescope tower "
             "with a split violet glass dome and a long brass telescope; below it a sheltered balcony with a row of "
             "small warm amber windows, a kettle-shaped service tank and hung cable coils. At the lower left, three "
             "small distant telescope domes on spire tops above a soft stepped violet cloud sea. Quiet and "
             "inhabited."),
    "s3-a": ("The Blackout Heart, the archive spending itself. Along the top edge, the thickened ring of blackened "
             "copper and iron with ember-red lamps and the Seal's black geometric lattice with thin glowing red "
             "seams. Rising from the horizon at one side, a vast sphere of archive machinery: concentric galleries "
             "and cooling fins glowing ember red, never spiky, never an eye or a sun. A dark cloud sea lit red from "
             "above."),
    "s3-b": ("A dark stretch near the Blackout Heart. Almost everything is dark: overhead the Seal's black lattice "
             "with thin red seams, one clear value step lighter than the sky; a black cloud sea far below; one faint "
             "amber guide lamp on a spire top on its trickle of power; an ember glow low on the horizon."),
    "s3-c": ("Inside the reach of the Blackout Heart. Along the top edge, enormous cooling fins shedding a few "
             "drifting ember sparks and archive shelving stacks hanging from the ring like inverted spires. Low on "
             "the horizon, through cracks in dark galleries, a field of countless small gold lights: the queue. A "
             "dark ember-lit cloud sea."),
    "s3-d": ("The Radiator Graveyard, a working landmark beside the Blackout Heart. At the left, three broken "
             "industrial cooling towers lean inward, black steel frames full of closely spaced radiator slats, red "
             "copper coolant manifolds, ladders and catwalks; below, staggered exchanger banks descend into ash-grey "
             "cloud; at the far right a white-hot reactor aperture glimmers through dark structural ribs; small warm "
             "maintenance lamps along the gantries."),
    "s3-e": ("The Last Maintenance Sanctuary, a refuge beneath the Blackout Heart. A huge black lattice buttress "
             "frames the upper left; along the lower right a semicircular armoured gallery with a chain of small "
             "warm ivory and amber windows, a lit doorway and oxygen cylinders; far below at the left, three black "
             "archive shells around a dim red core. Warmth only in the refuge."),
}

# title: the game composites the real Lamplighter hull onto this backdrop (Krea cannot draw the exact car)
TITLE = ("The title backdrop: a heavy braided carrier cable sags in one long curve across the lower right of the "
         "picture between the crowns of two dark slender spire tops, empty, ready for a cable car to hang from it. "
         "Above, high in the sky, the arc of the Line runs across the picture as a thin string of tiny amber lamps "
         "with one dark stretch in it where the lamps are out: the Faultline gap. Slender industrial spires stand in "
         "the cloud sea far below. The left half of the picture is dark, calm night sky; the upper third is quiet "
         "sky. A small warm lamp against vast cold machinery. Melancholy and a little hopeful.")
INTERIOR = ("A masterfully hand-crafted hi-bit pixel art interior for a modern story-driven game, drawn with very "
            "small, fine pixels on a strict square grid (a pixel canvas about 640 pixels wide): crisp deliberate "
            "pixel clusters, a restrained palette of about thirty colours in hue-shifted ramps, warm lamp light "
            "against cool indigo shadow, no noise, no grain, no blur.")
ROOMS = {
    "relay-seven": ("The Relay Seven switchboard room at night, seen from the side: a tall manual switchboard of "
                    "brass jacks, ivory panels and braided patch cords fills the back wall; every small lamp on it "
                    "is dark except one small round amber electric indicator lamp in the middle, lit above an empty "
                    "jack, with a small blank engraved brass plate under it; a worn operator's chair with a headset "
                    "hung on it; one kettle on a shelf; a round porthole showing the cloud sea and the arc of tiny "
                    "lamps outside. Warm, domestic, patient. No candle, no flame, no oil lamp, one kettle only."),
    "line-quiet": ("The same Relay Seven switchboard room, very late: the one small round amber indicator lamp is "
                   "blinking on the dark board, a patch cord hangs loose beside a cold jack, the operator's chair is "
                   "empty and the headset rests on the desk; the only light comes from the small lamp. Loss without "
                   "drama. No candle, no flame, no oil lamp, no work lamps."),
}
ENDINGS = {
    "e1": ("The shell of the Blackout Heart opens: the concentric iris plates of a vast sphere of archive machinery "
           "part, and a stream of thousands of small gold and white lights leaves the sphere along the carrier cables "
           "into the night. Release, not explosion: no fire, no debris."),
    "e2": ("The messages run: rivers of small gold lights run along the carrier cables and along the ring, past "
           "violet glass halls and rusted copper gates, and down the spires into the clouds. Seen from a carrier."),
    "e3": ("The Faultline closes: seen from a spire top on the Line, the arc of tiny lamps runs away to both "
           "horizons and comes back on, segment by segment; the last dark gap fills with light from both ends. "
           "First dawn light on the cloud sea below. No planet curve, no view from space, no halo ring."),
    "e4": ("The Ground looks up: at night, in rain, a small settlement of old lift cars turned into houses at the "
           "foot of a colossal spire among wet ferns; a few people in coats stand outside looking up; through thin "
           "cloud, the lit arc of the Line high above."),
    "e5": ("The radio answers: inside a lift-car house at night, a radio built from a brass-and-ivory lift panel "
           "with a transmit key, its small teal indicator lit, rain on a round window, a chipped mug. At most a "
           "hand on the key, no face."),
    "e6": ("GROUND: the Relay Seven switchboard close up; in a lower row, a lamp that has never been lit glows warm "
           "white-gold above a small blank brass plate; an old woman's hand reaches for the headset. No lettering."),
}
EXTERIOR_ENDINGS = {"e1", "e2", "e3", "e4"}


# ------------------------------------------------------------------------------------------------ events (A3)
EVENT_GEN = (2560, 1280)
EVENT_SIZE = (320, 160)
EVENT_PAL = {"shared": "Palette: ink indigo, brass and chipped ivory with one teal or amber accent.",
             "I": "Palette: Copper Reach verdigris and rust with brass and warm amber lamps.",
             "II": "Palette: Glass Cathedral violet glass, frost white and teal.",
             "III": "Palette: Blackout Heart ember red, black lattice with red seams, amber and gold lights."}
EVENT_WORLD_V5 = ("In this world nothing flies between relays except small drones on rotors: cable cars hang from drive "
                  "trolleys on heavy braided carrier cables that sag between spire tops and relays. Outside, the sky "
                  "is the dark indigo-black of the edge of space and below lies only the cloud sea. Most scenes have "
                  "no people. When crew appear they are one to three small figures inside the car, at a hatch or on a "
                  "gantry in masks, never a crowd, never in the foreground edge, never standing on the cloud sea. No "
                  "close-up faces.")
EVENT_NEG = "No crowd, no audience, no wheels, no tram, no boat, no gondola, no church, no candles, no open flames."


def parse_event_briefs(path=None):
    """docs/art-briefs.md section 6: {event id: (stage, show, feel, never)} (the 'Now:' notes are dropped)."""
    path = Path(path or Path(__file__).resolve().parents[1] / "docs" / "art-briefs.md")
    text = path.read_text()
    sec = text[text.index("## 6. Event illustrations"):text.index("## 7. Portraits")]
    out, stage, cur, last = {}, "shared", None, None
    for line in sec.splitlines():
        h = re.match(r"^### .*Stage (I{1,3})\b", line)
        if h:
            stage = h.group(1)
            continue
        if line.startswith("### "):
            stage = "shared" if "Shared" in line else stage
            continue
        m = re.match(r"^- \*\*`(?:events/)?([a-z0-9-]+)`\*\*(.*)$", line)
        if m:
            cur = m.group(1)
            st = stage
            if "Stage II" in m.group(2):
                st = "II"
            elif "Stage I" in m.group(2):
                st = "I"
            out[cur] = {"stage": st, "show": [], "feel": "", "never": "", "palette": ""}
            last = None
            continue
        if cur is None:
            continue
        body = line.strip()
        if not body:
            continue
        if not body.startswith("- "):                        # wrapped continuation of the previous item
            if last == "show" and out[cur]["show"]:
                out[cur]["show"][-1] += " " + body
            elif last in ("feel", "never", "palette"):
                out[cur][last] += " " + body
            continue
        body = body[2:]
        key = body.split(":", 1)[0].strip().lower() if ":" in body else ""
        val = body.split(":", 1)[1].strip() if ":" in body else body
        if key in ("show", "feel", "never", "palette"):
            last = key
            if key == "show":
                out[cur]["show"].append(val)
            else:
                out[cur][key] = val
        elif key.startswith("now") or body.lower().startswith("now"):
            last = "now"
        else:
            last = "show"
            out[cur]["show"].append(body)
    return out


def event_prompt(eid, b):
    show = " ".join(b["show"])
    pal = f"Palette: {b['palette']}" if b["palette"] else EVENT_PAL[b["stage"]]
    never = f" Never: {b['never']}" if b["never"] else ""
    feel = f" Feel: {b['feel']}" if b["feel"] else ""
    return f"{PIX_EVENT} {pal} {show}{feel} {EVENT_WORLD_V5} {STUDY_NEG} {EVENT_NEG}{never}"


# ---- v5b events (lead, 27 Sep): the v5 prompt pulled Krea into JRPG sprite conventions (chibi, child-like figures,
# anime hair) and into trams, gondolas and houses on clouds. Default to no people; adults only where the brief needs
# a person; cars described the lore way; strong negatives.
PIX_EVENT_B = ("A masterfully hand-crafted pixel art scene illustration for a serious, grounded, melancholic adult game, "
               "in the tradition of The Last Night and Blasphemous: crisp deliberate pixel clusters on a strict square "
               "pixel grid, a restrained palette of about thirty colours in hue-shifted ramps (shadows cool indigo, "
               "lights warm amber), clean readable shapes, no noise, no grain, no blur. A wide 2:1 composition filling "
               "the frame edge to edge.")
WORLD_B = ("The world is a ring of relay machinery held up on spires above a permanent cloud sea at the edge of "
           "space; the sky is dark indigo-black.")
NO_PEOPLE = "No people, no figures, no faces: the scene is empty of people."
ADULTS = ("At most one to three adult workers with realistic adult proportions (head about one seventh of body "
          "height), small in the frame, seen from behind or in half-shadow, in worn work coats and headsets.")
CAR_B = ("Every car in the picture is a pressurised brass-and-ivory maintenance car with a lamp at its nose, hanging "
         "below a drive trolley whose grip clamps a heavy braided carrier cable; no passengers in its windows.")
AUTOMATON = ("Escort automatons are squat ivory machine shells with one teal camera lens and folded tool arms, "
             "machines, not people.")
EVENT_NEG_B = ("No children, no kids, no chibi, no anime, no big heads, no JRPG sprites, no bright anime hair colours. "
               "No tram, no streetcar, no train, no passengers in windows, no gondola, no ski lift, no church, no "
               "house on clouds, no wheels, no rails, no boat, no crowd, no audience, no candles, no open flames.")
PEOPLE_RX = re.compile(r"\b(figure|figures|crew|person|people|hand|hands|shoulder|woman|women|man|men|keeper|keepers|"
                       r"bellmaker|operator|warden|wardens|scavengers?|linefolk|courier|pell|marit|hobb|ennis|moss|"
                       r"lamper|lampers|someone|somebody|family|families|child|children|traders?)\b", re.I)
CAR_RX = re.compile(r"\b(car|cars|tender|tenders|skiff|skiffs|lift car|cable car|carriage|crawler)\b", re.I)


HANDS_ONLY = {"machine-escort", "pell-stall"}           # a hand in frame, never a whole person
NO_FIGURE = {"choir-loft", "wardens-post"}               # "one figure at most, or none" / armour on a wall: none


def event_needs(b, eid=""):
    """(people, car, interior) from a brief; sentences that say "no figures/people" do not count."""
    show = " ".join(b["show"])
    kept = " ".join(x for x in re.split(r"(?<=[.;])\s+", show)
                    if not re.search(r"\bno (figures|people|one)\b|drop the onlookers|figure at most", x, re.I))
    people = bool(PEOPLE_RX.search(kept)) and eid not in NO_FIGURE
    clean = re.sub(r"size of a lift car|lift-car house|lift car", "", show, flags=re.I)
    car = bool(CAR_RX.search(clean))
    head = show[:70].lower()
    interior = bool(re.search(r"inside|interior|room|galley|workshop|office|loft|shop|pigeonholes|bench|post,|"
                              r"board, very close|tuning forks", head))
    return people, car, interior


CRAWLER = ("The crawler is a heavy riveted machine hull clamped under the carrier by its grip arms, with no windows "
           "and no passengers.")
LIFT_CAR = ("The lift car is a boxy freight cage of chipped ivory panels in a brass frame, hung from its own lift "
            "cables; not a tram, not a gondola, nobody inside.")


def event_prompt_b(eid, b):
    people, car, interior = event_needs(b, eid)
    show = " ".join(b["show"])
    hands = eid in HANDS_ONLY
    pal = f"Palette: {b['palette']}" if b["palette"] else EVENT_PAL[b["stage"]]
    never = f" Never: {b['never']}" if b["never"] else ""
    feel = f" Feel: {b['feel']}" if b["feel"] else ""
    view = "An interior view, the camera inside the room. " if interior else ""
    who = ("Only one adult hand in a work glove enters the frame; no whole person, no face." if hands
           else ADULTS if people else NO_PEOPLE)
    extra = " ".join(x for x in (who, CAR_B if car else "",
                                 LIFT_CAR if re.search(r"freight lift car", show, re.I) else "",
                                 CRAWLER if re.search(r"\bcrawler\b", show, re.I) else "",
                                 AUTOMATON if re.search(r"automaton|rigger", show, re.I) else "") if x)
    return f"{PIX_EVENT_B} {view}{pal} {show}{feel} {extra} {WORLD_B} {STUDY_NEG} {EVENT_NEG_B}{never}"


# ---- v5c events: "car", "trolley", "tender" and "switch house" summon trams, pantographs and churches (v5b test,
# 27 Sep). The prompt describes the hanging capsule by its shape and never uses those words.
CAR_C = ("Any vehicle in the picture is a long pressurised capsule of chipped ivory plates and riveted brass ribs with "
         "a round glowing lamp at its nose, hanging in the air below a thick braided cable by two short brass struts "
         "from a clamp whose grooved wheels ride on top of the cable; it has no wheels underneath, no rails, no roof "
         "pole, and nobody in its windows.")
SUBS = [(r"\bdrive trolley\b", "cable clamp"), (r"\btrolleys?\b", "cable clamp"),
        (r"\bfreight lift car\b", "freight lift cage"), (r"\blift car\b", "lift cage"),
        (r"\bcable cars?\b", "hanging capsule"), (r"\brear car\b", "small hanging capsule"),
        (r"\bskiff\b", "patched hanging capsule"), (r"\b(the )?tender's\b", "the capsule's"),
        (r"\btenders?\b", "hanging capsule"), (r"\bcars\b", "hanging capsules"), (r"\bcar\b", "capsule"),
        (r"\bswitch house\b", "windowless riveted iron switch box"), (r"\bcrawler\b", "massive dead machine")]


def lore_to_shape(text):
    for a, b in SUBS:
        text = re.sub(a, b, text, flags=re.I)
    return text


def event_prompt_c(eid, b):
    people, car, interior = event_needs(b, eid)
    show = lore_to_shape(" ".join(b["show"]))
    pal = f"Palette: {b['palette']}" if b["palette"] else EVENT_PAL[b["stage"]]
    never = f" Never: {lore_to_shape(b['never'])}" if b["never"] else ""
    feel = f" Feel: {b['feel']}" if b["feel"] else ""
    view = "An interior view, the camera inside the room. " if interior else ""
    hands = eid in HANDS_ONLY
    who = ("Only one adult hand in a work glove enters the frame; no whole person, no face." if hands
           else ADULTS if people else NO_PEOPLE)
    raw = " ".join(b["show"])
    extra = " ".join(x for x in (who, CAR_C if car else "",
                                 AUTOMATON if re.search(r"automaton|rigger", raw, re.I) else "") if x)
    return (f"{PIX_EVENT_B} {view}{pal} {show}{feel} {extra} {WORLD_B} {STUDY_NEG} {EVENT_NEG_B} No pantograph, no "
            f"trolley pole, no roof pole, no steeple, no chapel.{never}")


# ---- v5t events (lead): events whose subject is a tender are painted from an init with our real hull art composited
# (tools/art/event_inits.py); Krea repaints it in the event style and keeps the silhouette.
TENDER_EVENTS = ("echo-tender-lit", "tender-wreck", "relay-switchyard", "derelict-car", "sun-glare", "resonance",
                 "glass-fog", "dark-stretch", "ember-draft", "copper-gate", "heart-shell", "hollow-choir-hall",
                 "switchback-seventh-drone", "glasswing-lamp-alignment", "refit-bay", "carrier-cut",
                 "scavenger-skiff-hail")
KEEP_CAR = ("Keep the hanging car of the input exactly: its long brass-and-ivory body, the round lamp at its nose, the "
            "cab window, the grooved wheels of its grip riding on top of the cable, the sprung struts down to its "
            "roof, the tanks under its keel.")


# v5s: the scene alone, described without any vehicle word (every "car/tender/capsule on a cable" still became a tram
# or a cabin in v5c/v5t/v5m/v5e); our tender (hull + trolley + carrier) is composited onto the pixel scene.
ENV_BRIEF = {
    "echo-tender-lit": "Night under the Glass Cathedral: violet glass fog, a heavy braided cable crossing the picture, "
                       "slender lattice relay towers with small teal lamps rising from the fog.",
    "tender-wreck": "A broken riveted iron gantry below a heavy braided cable at night, snapped struts and loose cable "
                    "ends, dark lattice relay towers in the distance, copper glow on the cloud horizon.",
    "relay-switchyard": "A relay switchyard at night: three or four heavy braided cables converging on a squat "
                        "windowless riveted iron switch box with brass switchgear, a tall guide-lamp mast with one "
                        "amber lamp on top of it.",
    "derelict-car": "A lonely heavy braided cable sagging over the cloud sea at night between dark lattice relay "
                    "towers, one faint lamp far away.",
    "sun-glare": "The sun low over the cloud horizon at dusk, copper plating and heavy braided cables throwing a "
                 "blinding copper glare, dark lattice relay towers in silhouette.",
    "resonance": "The flank of the Glass Cathedral: a wall of violet glass panes in dark brass frames humming, "
                 "concentric rings of pale light pulsing through the glass, a heavy braided cable running along it.",
    "glass-fog": "Violet-white fog pouring off the glass flank of the Cathedral, ice-glass glitter, a frosted heavy "
                 "braided cable, lamps blurred to halos.",
    "dark-stretch": "Almost total darkness: a heavy braided cable, one faint guide lamp far off, an ember glow low "
                    "on the horizon.",
    "ember-draft": "Heat pouring off huge dark cooling fins in rivers of ember sparks, a heavy braided cable running "
                   "through the sparks.",
    "copper-gate": "Two enormous closed gate wings of rusted iron and copper standing on a tower top, every heavy "
                   "braided cable ending at them, a crowned iron machine bulk built into the gap, dust.",
    "heart-shell": "A vast sphere of ember-red iris plates closed like a lock with thin gold cracks, rotor drones "
                   "holding station, heavy braided cables ending at it.",
    "hollow-choir-hall": "A vast dark hall ringed with porcelain masks and violet glass bells on chains, organ-pipe "
                         "spines, faint voice-shapes in the glass, a heavy braided cable running in.",
    "switchback-seventh-drone": "Under a relay at night, a narrow work span of cable no one can walk, a small ivory "
                                "inspection drone wedged in a cable clamp with its lamp flickering, cloud sea below.",
    "glasswing-lamp-alignment": "A big warning lamp on a long brass arm off a relay's flank, its lens slipped so "
                                "light sprays in the wrong directions, violet glass panes lit unevenly.",
    "refit-bay": "A workshop in a relay switch box: brass hoists, a module crate with a stencilled stripe swinging "
                 "on a chain, tool racks, one work lamp.",
    "carrier-cut": "A side cable at night beside the main heavy braided cable, a hunched cutting machine with closed "
                   "shears clamped on the side cable, sparks, dark lattice relay towers.",
    "scavenger-skiff-hail": "Two heavy braided cables running side by side over the cloud sea at night, dark lattice "
                            "relay towers, a copper horizon glow.",
}
NO_VEHICLES = ("An empty scene: there are no vehicles, no cabins, no cars, no trams, no gondolas, no carriages and "
               "no lanterns hanging from the cables.")


def install_tender_events(assets, ev):
    from pathlib import Path as _P
    root = _P(__file__).resolve().parent / "init" / "events"
    for eid in TENDER_EVENTS:
        init = root / f"{eid}-init.png"
        if eid not in ev or not init.exists():
            continue
        b = ev[eid]
        prompt = event_prompt_c(eid, b).replace(CAR_C, KEEP_CAR)
        v = assets[f"events/{eid}"]["versions"]
        v["v5t"] = {"prompt": prompt, "gen": EVENT_GEN, "n": 2, "init": str(init), "denoise": 0.6}
        v["v5t7"] = dict(v["v5t"], denoise=0.7)
        if eid in ENV_BRIEF:
            pal = f"Palette: {b['palette']}" if b["palette"] else EVENT_PAL[b["stage"]]
            v["v5s"] = {"prompt": f"{PIX_EVENT_B} {pal} {ENV_BRIEF[eid]} {TOWERS} {NO_VEHICLES} {NO_PEOPLE} "
                                  f"{WORLD_B} {STUDY_NEG} {NEG_G.replace(' no vehicles,', '')} {EVENT_NEG_B}",
                        "gen": EVENT_GEN, "n": 2, "init": str(root / f"{eid}-env-init.png"), "denoise": 0.85}
        # v5e: the scene alone from the env init (empty carrier); our tender is composited onto the pixel scene
        env = root / f"{eid}-env-init.png"
        if env.exists():
            ep = prompt.replace(KEEP_CAR, "The heavy braided cable in the picture is empty: no vehicle, no car, no "
                                          "capsule, no cabin on it or anywhere in the picture.")
            v["v5e"] = {"prompt": ep, "gen": EVENT_GEN, "n": 2, "init": str(env), "denoise": 0.85}
        # v5m: the tender masked (repaint 50/255 over our hull, trolley and carrier), the scene repainted at 0.85
        mask = root / f"{eid}-mask.png"
        if mask.exists():
            v["v5m"] = dict(v["v5t"], mask=str(mask), denoise=0.85)


def scene_prompt(sid, brief):
    return f"{PIX_SCENE} {NIGHT3} {LAYOUT3} {CARRIERS} {LIGHT[sid[:2]]} {brief} {STUDY_NEG}"


# 27 Sep: the user capped every Krea render at 2560x1440. Recipe test on s1-a (three renders, judged in game):
#   t320  the R3 pixel-art prompt at 2560x1440; Krea's 8-px pixel -> 320x180 art px drawn 6x
#   t640i a night illustration prompt at 2560x1440 -> 640x360 via 4x4 median + cleanup
#   t640p a fine hi-bit pixel-art prompt asking for 4-px pixels -> 640x360 via 4x4 cells
ENV_NIGHT_ILL = ("A crisp, detailed 2D side-view game background illustration with hard clean edges, flat graphic "
                 "cel-shaded forms with two or three tones each, clean silhouettes layered in depth, a limited palette, "
                 "no blur, no soft airbrush gradients, no painterly texture, every detail at least four pixels wide.")
PIX_FINE = ("A masterfully hand-crafted hi-bit pixel art background for a modern side-scrolling game, in the "
            "tradition of the environment art of Eastward, The Last Night, Sea of Stars and Blasphemous, drawn with "
            "very small, fine pixels on a strict square grid (a high-resolution pixel canvas about 640 pixels wide): "
            "crisp deliberate pixel clusters, a restrained palette of about thirty colours in hue-shifted ramps "
            "(shadows cool indigo and violet, lights warm amber), clean readable silhouettes layered in four depth "
            "planes with atmospheric perspective, the sky a smooth gradient in clean horizontal bands with a little "
            "ordered dithering, no noise, no grain, no blur, no painterly texture.")
CAP_GEN = (2560, 1440)


def test_versions(bid, brief):
    tail = f"{NIGHT3} {LAYOUT3} {CARRIERS} {LIGHT[bid[:2]]} {brief} {STUDY_NEG}"
    return {"t320": {"prompt": f"{PIX_SCENE} {tail}", "gen": CAP_GEN, "n": 1},
            "t640i": {"prompt": f"{ENV_NIGHT_ILL} {tail}", "gen": CAP_GEN, "n": 1},
            "t640p": {"prompt": f"{PIX_FINE} {tail}", "gen": CAP_GEN, "n": 1}}


# The approved A3 recipe (lead, 27 Sep): t640p at 2560x1440 -> 640x360, plus more world in the outer thirds.
RICH = ("The outer thirds are rich with world: carriers at several depths, the regional landmarks, spire tops with "
        "small warm lamps, a textured cloud sea; only the middle band stays calm and empty.")


def v5c_prompt(bid, brief):
    return f"{PIX_FINE} {NIGHT3} {LAYOUT3} {CARRIERS} {RICH} {LIGHT[bid[:2]]} {brief} {STUDY_NEG}"


# v5e (lead's Copper review): every region recognisable from a thumbnail, and distant planes dissolving into haze.
LIGHT_E = {
    "s1": ("Copper Reach colours, a continent of rust: riveted plates gone verdigris green and rust orange, carriers "
           "crusted with verdigris green, spire tops crowned with stacked rusty shipping containers and cranes, small "
           "warm amber lamps, and near the horizon the dull red ember glow of banked foundries; the thin horizon glow "
           "is copper and rose."),
    "s2": ("Glass Cathedral colours: violet optical glass glowing faintly from within, frost white on the panes and "
           "on the carriers, great glass bells, pale violet veils of glass fog, small teal lights; the thin horizon "
           "glow is cold violet and teal, never orange."),
    "s3": ("Blackout Heart colours: blackened iron and dark copper, the Seal's black geometric lattice with thin "
           "glowing red seams, ember-red archive galleries and cooling fins, small amber and gold lights; the thin "
           "horizon glow is ember red."),
}
HAZE = ("Atmospheric perspective: distant spires and far machinery are dim, dark and cool, dissolving into the night "
        "haze with low contrast, never pale, never white and never brighter than the nearer planes.")


def v5e_prompt(bid, brief):
    return f"{PIX_FINE} {NIGHT3} {LAYOUT3} {CARRIERS} {RICH} {HAZE} {LIGHT_E[bid[:2]]} {brief} {STUDY_NEG}"


# v5f (Copper, second review): the region must read from a thumbnail; carriers are verdigris, and foundry fire shows.
CARRIERS_COPPER = ("Most important: two or three enormous braided carrier cables, each as thick as a lift car, crusted "
                   "bright verdigris green along their tops, sag in deep catenary curves across the lower half of the "
                   "picture from spire crown to spire crown, always below the middle band of sky.")
COPPER_IDENTITY = ("Unmistakably the Copper Reach: every spire top is a rusty crown of stacked orange and rust-red "
                   "shipping containers and lattice cranes with warm amber windows; riveted plates and girders are "
                   "verdigris green and rust orange; near the horizon the banked furnaces of foundries glow dull red "
                   "and orange through vents and doorways, the warmest colour in the picture.")


def v5f_prompt(bid, brief):
    return (f"{PIX_FINE} {NIGHT3} {LAYOUT3} {CARRIERS_COPPER} {RICH} {HAZE} {COPPER_IDENTITY} {LIGHT_E['s1']} "
            f"{brief} {STUDY_NEG}")


# v5g (Glass and Heart, 27 Sep): v5e lost the regions to the shared heads (generic dark gothic spires, giant catenary
# arcs, no violet glass ring, no ember or lattice) and "spire" drew Earth churches. Subject and identity come first,
# towers are named as machinery, carriers sag shallowly, the heads are short.
IDENTITY = {
    "s2": ("Unmistakably the Glass Cathedral: along the top edge of the picture the underside of the ring is a range "
           "of violet optical glass domes, pointed naves and buttresses in dark brass frames, glowing violet from "
           "within, frost on the panes; great translucent violet glass bells hang beneath it; pale violet veils of "
           "glass fog pour down toward the cloud sea; the light is violet, frost white and teal."),
    "s3": ("Unmistakably the Blackout Heart: along the top edge the thickened ring of blackened iron is covered by the "
           "Seal's black geometric lattice with thin glowing ember-red seams; ember-red archive galleries and cooling "
           "fins glow below it; drifting embers; the thin horizon glow is ember red; small amber and gold lights."),
}
TOWERS = ("The towers rising from the cloud sea are slender industrial relay towers of machinery: lattice masts, "
          "antenna towers and riveted relay housings with small lamps, never church spires.")
CARRIERS_G = ("Two or three heavy braided cables sag in shallow curves between the tops of the relay towers at "
              "different depths.")
NIGHT_G = ("Night at the edge of space; the middle band of the picture, from a quarter to two thirds of the height, "
           "is calm dark indigo sky with a few stars. Distant towers are dim and hazy.")
NEG_G = ("No church, no cathedral facade, no steeple, no gothic spires, no chapel on the clouds, no crosses, no "
         "planet, no vehicles.")


SKY_H = ("The sky is dark indigo-black all the way to the top edge of the picture, where the black lattice of the "
         "Seal clamps over the ring in a dark band with thin red seams; no pink, salmon or sunset sky anywhere.")


def v5h_prompt(bid, brief):
    return v5g_prompt(bid, brief).replace(NIGHT_G, NIGHT_G + " " + SKY_H)


def v5g_prompt(bid, brief):
    brief = re.sub(r"\bspires?\b", "relay towers", brief)
    return (f"{PIX_FINE} {IDENTITY[bid[:2]]} {brief} {TOWERS} {CARRIERS_G} {NIGHT_G} {STUDY_NEG} {NEG_G}")


# v5d title and exterior endings (27 Sep): the v5c heads (night, haze, shared light) flattened e1-e3 into generic
# spire skylines and the title painted its own tiny car. Subject first; the title leaves the carrier and the tender to
# the game (title.ts draws the real Lamplighter on its carrier over the art).
TITLE_D = ("The title backdrop of a game: a vast night view from the Line at the edge of space. High above, the arc "
           "of the Line runs across the whole picture as a thin curved string of tiny amber lamps with one dark stretch "
           "where the lamps are out: the Faultline gap. Far below, a quiet cloud sea with slender industrial relay "
           "towers of machinery (lattice masts and relay housings with small lamps) rising out of it, a few heavy "
           "braided cables sagging between distant tower tops, far away and small. The left half is dark calm sky; "
           "the right half keeps an open space in the middle distance. No vehicles, no cable cars, no foreground "
           "cable. Melancholy and a little hopeful.")
ENDINGS_D = {
    "e1": ("A vast sphere of archive machinery glowing ember red sits on the horizon above the cloud sea; its "
           "concentric iris plates are opening like a great lock, and a bright stream of thousands of small gold and "
           "white lights pours out of the opening and runs away along several heavy braided cables into the night "
           "sky. Release, not explosion: no fire, no debris, no people."),
    "e2": ("Rivers of countless small gold lights run along heavy braided cables that sag between tower tops across "
           "the whole picture, and along the dark ring of machinery high above, past violet glass halls in the "
           "distance, and down the relay towers into the glowing cloud sea. Seen from a cable. No people."),
    "e3": ("Dawn on the Line: seen from a high tower top, the great arc of the Line's lamps curves away to both "
           "horizons above the cloud sea, and the lamps are coming back on segment by segment; the last dark gap in "
           "the middle of the arc fills with light from both ends. First pale gold dawn light on the cloud sea. No "
           "planet curve, no view from space, no halo ring, no people."),
}


ROOM_NEG = ("A full-bleed image filling the frame edge to edge: no rounded frame, no vignette border. Exactly one "
            "operator's chair, exactly one kettle. No lanterns, no oil lamps, no candles, no open flames, no modern "
            "computer consoles, no screens, no monitors.")
ROOMS_D = {
    "relay-seven": ("The Relay Seven switchboard room at night, seen from the side: an old manual telephone "
                    "switchboard of brass jacks, chipped ivory panels and braided patch cords fills the back wall; "
                    "every small lamp on it is dark except one small round amber electric indicator lamp in the "
                    "middle, lit above an empty jack, with a small blank brass plate under it; in front of it one "
                    "worn wooden operator's chair with a headset hung on its back; one brass kettle on a shelf at the "
                    "side; a round porthole showing the cloud sea and a far arc of tiny lamps. Warm, domestic, "
                    "patient."),
    "line-quiet": ("The same old Relay Seven switchboard room of brass jacks, chipped ivory panels and braided patch "
                   "cords, very late: the room is dark; the one small round amber indicator lamp in the middle of the "
                   "board is lit, the only light; a patch cord hangs loose beside a cold jack; the worn wooden "
                   "operator's chair is empty and the headset lies on the desk; a round porthole shows the dark cloud "
                   "sea. Loss without drama."),
}


E2_E = ("Rivers of countless small gold lights run along heavy braided cables that sag between the tops of lattice "
        "relay towers across the whole picture, like strings of beads, and climb down the towers into the dark cloud "
        "sea; high above, the dark underside of the ring of machinery glows faintly violet. Seen from a cable at "
        "night. No buildings on the clouds, no people.")


def ending_d_prompt(eid):
    return f"{PIX_FINE} {ENDINGS_D[eid]} {TOWERS} {STUDY_NEG} {NEG_G.replace(' no vehicles,', '')}"


# re-briefs after a region review (new versions, so earlier candidates stay reproducible)
BG_V5D = {
    "s1-c": ("The foundries of the Copper Reach on the sun side. Along the top edge, the ring's rusted underside with a "
             "row of banked furnace vents glowing dull red-orange, the warmest light in the picture, short smoke "
             "stacks and loops of green copper cable. Far below, a copper-gold cloud sea with a low glare along the "
             "horizon; rusted spire tops crowned with cranes and small foundry sheds with glowing doors; far away at "
             "the right, the Copper Gate: two enormous closed gate wings standing on a spire, a dark crowned iron bulk "
             "between them, silhouetted against the glare."),
}


def install(assets):
    for bid, brief in BG.items():
        key = f"bg/{bid}"
        entry = assets.setdefault(key, {"size": SCENE_SIZE, "gen": SCENE_GEN, "n": 2, "versions": {}})
        entry["versions"]["v5"] = {"prompt": scene_prompt(bid, brief), "gen": SCENE_GEN, "n": 2}
        entry["versions"].update(test_versions(bid, brief))
        entry["versions"]["v5c"] = {"prompt": v5c_prompt(bid, brief), "gen": CAP_GEN, "n": 2}
    for bid, brief in BG.items():
        brief = BG_V5D.get(bid, brief)
        assets[f"bg/{bid}"]["versions"]["v5e"] = {"prompt": v5e_prompt(bid, brief), "gen": CAP_GEN, "n": 2}
    assets["bg/title"]["versions"]["v5d"] = {"prompt": f"{PIX_FINE} {TITLE_D} {STUDY_NEG} {NEG_G}", "gen": CAP_GEN,
                                             "n": 3}
    for rid, brief in ROOMS_D.items():
        assets[f"bg/{rid}"]["versions"]["v5d"] = {"prompt": f"{INTERIOR} {brief} {ROOM_NEG} {STUDY_NEG}",
                                                  "gen": CAP_GEN, "n": 2}
    for eid in ENDINGS_D:
        assets[f"ending/{eid}"]["versions"]["v5d"] = {"prompt": ending_d_prompt(eid), "gen": CAP_GEN, "n": 2}
    assets["ending/e2"]["versions"]["v5e"] = {
        "prompt": f"{PIX_FINE} {E2_E} {TOWERS} {STUDY_NEG} {NEG_G.replace(' no vehicles,', '')}", "gen": CAP_GEN, "n": 2}
    for bid, brief in BG.items():
        if bid[:2] in ("s2", "s3"):
            assets[f"bg/{bid}"]["versions"]["v5g"] = {"prompt": v5g_prompt(bid, brief), "gen": CAP_GEN, "n": 2}
        if bid[:2] == "s3":
            assets[f"bg/{bid}"]["versions"]["v5h"] = {"prompt": v5h_prompt(bid, brief), "gen": CAP_GEN, "n": 2}
    for bid, brief in BG.items():
        if bid.startswith("s1"):
            assets[f"bg/{bid}"]["versions"]["v5f"] = {"prompt": v5f_prompt(bid, BG_V5D.get(bid, brief)),
                                                      "gen": CAP_GEN, "n": 2}
    for bid, brief in BG_V5D.items():
        assets[f"bg/{bid}"]["versions"]["v5d"] = {"prompt": v5c_prompt(bid, brief), "gen": CAP_GEN, "n": 2}
    shared_light = ("Palette: ink indigo, brass and chipped ivory with small amber lamps and one teal accent.")
    assets.setdefault("bg/title", {"size": SCENE_SIZE, "gen": CAP_GEN, "n": 2, "versions": {}})["versions"]["v5c"] = {
        "prompt": f"{PIX_FINE} {NIGHT3} {HAZE} {shared_light} {TITLE} {STUDY_NEG}", "gen": CAP_GEN, "n": 2}
    for rid, brief in ROOMS.items():
        assets.setdefault(f"bg/{rid}", {"size": SCENE_SIZE, "gen": CAP_GEN, "n": 2, "versions": {}})[
            "versions"]["v5c"] = {"prompt": f"{INTERIOR} {brief} {STUDY_NEG}", "gen": CAP_GEN, "n": 2}
    for eid, b in parse_event_briefs().items():
        assets.setdefault(f"events/{eid}", {"size": EVENT_SIZE, "gen": EVENT_GEN, "n": 3, "versions": {}})[
            "versions"]["v5"] = {"prompt": event_prompt(eid, b), "gen": EVENT_GEN, "n": 2}
        assets[f"events/{eid}"]["versions"]["v5b"] = {"prompt": event_prompt_b(eid, b), "gen": EVENT_GEN, "n": 2}
        assets[f"events/{eid}"]["versions"]["v5c"] = {"prompt": event_prompt_c(eid, b), "gen": EVENT_GEN, "n": 2}
    install_tender_events(assets, parse_event_briefs())
    for eid, brief in ENDINGS.items():
        head = f"{PIX_FINE} {NIGHT3} {HAZE} {shared_light}" if eid in EXTERIOR_ENDINGS else INTERIOR
        assets.setdefault(f"ending/{eid}", {"size": SCENE_SIZE, "gen": CAP_GEN, "n": 2, "versions": {}})[
            "versions"]["v5c"] = {"prompt": f"{head} {brief} {STUDY_NEG}", "gen": CAP_GEN, "n": 2}
