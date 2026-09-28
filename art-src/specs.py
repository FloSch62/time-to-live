"""TIME TO LIVE art specs: prompts and recipes for every Krea 2 candidate.

Job spec strings (queue files, q.sh):  group/id[:version][@N | @seed,seed,...]
e.g.  ships/lamplighter:pix@3   bg/s1-a:v2@2   portraits/operator@1234,5678
Seeds default to a stable hash of (id, version, k).
"""
import hashlib
import re
from pathlib import Path

ART = Path(__file__).resolve().parent
ROOT = ART.parent
FAULTLINE = Path("/home/clab/projects/clab/faultline")
INIT = ART / "init"

REFS = {
    "card": {"path": str(Path.home() / ".local/share/faultline-imagegen/ComfyUI/input/faultline-original-style.png")},
    "cathedral": {"path": str(FAULTLINE / "public/art/relay-cathedral.png")},
}


def anchor(name, size=None):
    """A locked style anchor from art-src/refs/ (nearest-upscaled pixel finals)."""
    r = {"path": str(ART / "refs" / f"{name}.png")}
    if size:
        r["size"] = size
    return r


# ------------------------------------------------------------------------------------------------ style language
NEG = ("No text, no letters, no numbers, no writing, no logo, no watermark, no signature, no border, no frame, no "
       "interface. No swords, no torches, no open flames, no candles, no scrolls, no medieval props, no fantasy "
       "creatures, no faces on machines. Not cartoon, not chibi, not cute, not toy-like, no rounded mascot shapes, "
       "no big heads, no bright saturated candy colours.")

PIX = ("High-quality detailed pixel art in the style of a modern 32-bit indie game like FTL: Faster Than Light and "
       "Into the Breach: crisp hand-placed pixel clusters, a limited palette, clean hard-edged shapes with selective "
       "dark outlines, flat cel shading with two or three tones per material, no blur, no soft gradients.")
WORLD = ("The world of a ruined ancient relay network at the edge of space: worn engineered machinery of tarnished "
         "brass, chipped ivory ceramic plates and dark gunmetal, small teal signal lights and warm amber lamps.")

ILL = ("A clean, detailed hard-edged game sprite illustration with bold readable shapes, crisp edges, flat cel "
       "shading with two or three tones per material and thin dark outlines, like hand-painted concept sprites for "
       "a side-view game.")

ENV_HEAD = ("An extraordinarily detailed cinematic matte painting in the exact finished science-fiction environment "
            "art direction of the reference: a ring of relay machinery held up on spires above a permanent cloud sea at the edge of space, richly "
            "rendered surfaces, precise mechanical engineering and dramatic naturalistic volumetric lighting.")
ENV_TAIL = ("Sophisticated chiaroscuro, deep desaturated midnight-blue shadows, small warm amber highlights and "
            "restrained teal signal light, immense misty distance. Finished high-end game environment key art. Wide "
            "16:9 cinematic composition.")
FIG_HEAD = ("A dark atmospheric science-fiction oil painting matching the painted look of the reference, set on a "
            "ring of relay machinery held up on spires above a permanent cloud sea at the edge of space, where worn network hardware and futuristic equipment are dressed in "
            "chipped ivory and tarnished dark brass.")
FIG_TAIL = ("Rich layered oil-paint brushwork, intricate but clearly illustrated mechanical forms, chipped and pitted "
            "dark brass and worn ivory plates, deep indigo-black shadows, restrained luminous teal and warm amber "
            "gold, dramatic shadow masses and expressive painted light. A finished, richly painted illustration.")

TOPDOWN = ("A game sprite seen from directly above in a strict top-down orthographic bird's-eye view, like the ship "
           "hulls of FTL: Faster Than Light, isolated on a flat plain dark navy background, the whole hull lit from "
           "the upper left.")

SIDE = ("A game sprite seen in a strict side view (orthographic elevation), like the cutaway vessels of a "
        "side-scrolling game, isolated on a flat plain dark navy background, lit from the upper left.")
TENDER_V2 = ("A cable tender, a long pressurised maintenance car that hangs from a heavy carrier cable at the edge of "
             "space: the Lamplighter, built at the Reach docks. A long riveted car body of chipped ivory panels "
             "ribbed with tarnished brass, a rounded nose on the right with a cab window at the helm and a big round "
             "guide lamp glowing warm amber at the nose, a brass drive trolley with two grip wheels and grip arms on "
             "the roof that holds the cable, hanger struts, small tool mounts on the roof and belly, a keel of tanks "
             "and ballast blocks under the car, small portholes, teal and amber indicator lights, rivets and plates.")

# ------------------------------------------------------------------------------------------------ subjects
LAMPLIGHTER = ("A small spaceship, nose pointing to the right: the Lamplighter, an old relay tender built in the Reach "
               "docks. A narrow riveted hull of chipped ivory ceramic plates and tarnished brass, a round glass lamp "
               "cupola glowing warm amber at the nose on the right, two cable-thrust engine nacelles with teal "
               "glowing exhausts at the back on the left, dorsal and ventral weapon pods, dark brass outrigger "
               "plating, panel seams, vents, hatches, cable conduits and tiny amber and teal indicator lights.")
LEECH = ("A hostile flying machine facing left: the Packet Leech, an old recovery drone hulk. A bulbous overflowing "
         "round buffer tank of verdigris-green copper plating with a glowing amber buffer window, grasping jointed "
         "intake arms reaching forward on the left around an intake mouth, a copper thruster block at the back on "
         "the right with a teal glow, rivets, pipes and corroded panels. It is a worn engineered machine, not a "
         "creature.")
S1A = ("The view from the outside of the Line at the edge of space. An indigo-black sky full of small stars at the "
       "top. The long dark curved arc of a colossal ring of relay machinery crosses the upper part of the scene with "
       "tiny amber lamps along it, one stretch of it broken and dark. Far below along the bottom, a sea of clouds "
       "lit copper and rose by a low sun, with dark slender relay spires rising out of the clouds in the distance "
       "and broken outer relay ring gates of rusted copper and verdigris. The Copper Reach: copper-green, rust "
       "orange and verdigris machinery. The middle band of the picture is calm open dark sky with only faint stars.")
OPERATOR = ("Head-and-shoulders portrait of the Operator: an old woman of about seventy-two with a lined, calm, "
            "watchful face, white hair pinned up in a neat bun, wearing a brass-and-ivory single-ear telephony "
            "headset with a thin curved microphone arm and a heavy dark wool work coat with chipped ivory shoulder "
            "panels. Behind her a dark switchboard with rows of brass jacks and one glowing amber lamp that lights "
            "her face warmly from the lower left. Deep indigo shadows.")
LIFTCAR = ("An old freight lift car of chipped ivory panels and tarnished brass, torn loose from its cable, drifting "
           "slowly in the dark at the edge of space; its round windows are dark except one faint warm amber light; a "
           "snapped cable trails behind it. The cloud sea glows faintly far below, stars above, and the dark arc of "
           "the ring of relays with tiny lamps crosses the distance.")


def seed_for(key, version, k):
    return int(hashlib.sha1(f"{key}:{version}:{k}".encode()).hexdigest()[:8], 16) % 2_000_000_000


ASSETS = {}


def add(key, size, gen, versions, n=2):
    ASSETS[key] = {"size": size, "gen": gen, "versions": versions, "n": n}


def hull(sid):
    return {"init": str(INIT / f"{sid}-init.png"), "mask": str(INIT / f"{sid}-mask.png")}


# ------------------------------------------------------------------------------------------------ exploration (x*)
add("explore/lamplighter", (416, 224), (1664, 896), {
    "x-pix-t2i": {"prompt": f"{PIX} {TOPDOWN} {LAMPLIGHTER} {WORLD} {NEG}"},
    "x-pix-init": {"prompt": f"{PIX} {TOPDOWN} {LAMPLIGHTER} {WORLD} {NEG}", **hull("lamplighter"), "denoise": 0.92},
    "x-ill-init": {"prompt": f"{ILL} {TOPDOWN} {LAMPLIGHTER} {WORLD} {NEG}", **hull("lamplighter"), "denoise": 0.92},
    "x-pix-card": {"prompt": f"{PIX} {TOPDOWN} {LAMPLIGHTER} {WORLD} {NEG}", **hull("lamplighter"), "denoise": 0.92,
                   "refs": [REFS["card"]], "strength": 0.5, "shift": 1.5},
})
for d in (0.72, 0.8, 0.86):
    tag = str(int(d * 100))
    ASSETS["explore/lamplighter"]["versions"][f"x-ill-d{tag}"] = {
        "prompt": f"{ILL} {TOPDOWN} {LAMPLIGHTER} {WORLD} {NEG}", **hull("lamplighter"), "denoise": d}
add("explore/packet-leech", (256, 192), (1024, 768), {
    "x-pix-init": {"prompt": f"{PIX} {TOPDOWN} {LEECH} {WORLD} {NEG}", **hull("packet-leech"), "denoise": 0.92},
    "x-ill-init": {"prompt": f"{ILL} {TOPDOWN} {LEECH} {WORLD} {NEG}", **hull("packet-leech"), "denoise": 0.92},
    "x-ill-d72": {"prompt": f"{ILL} {TOPDOWN} {LEECH} {WORLD} {NEG}", **hull("packet-leech"), "denoise": 0.72},
    "x-ill-d80": {"prompt": f"{ILL} {TOPDOWN} {LEECH} {WORLD} {NEG}", **hull("packet-leech"), "denoise": 0.8},
})
add("explore/s1-a", (480, 270), (1920, 1088), {
    "x-pix": {"prompt": f"{PIX} A wide side-view pixel art game background. {S1A} {NEG}"},
    "x-env": {"prompt": f"{ENV_HEAD} {S1A} {ENV_TAIL} {NEG}", "refs": [REFS["cathedral"]], "strength": 0.45,
              "shift": 1.15},
    "x-pix-cath": {"prompt": f"{PIX} A wide side-view pixel art game background. {S1A} {NEG}",
                   "refs": [REFS["cathedral"]], "strength": 0.3, "shift": 1.15},
})
add("explore/operator", (96, 96), (1152, 1152), {
    "x-pix": {"prompt": f"{PIX} A pixel art character portrait for a game dialogue box. {OPERATOR} {WORLD} {NEG}"},
    "x-fig": {"prompt": f"{FIG_HEAD} {OPERATOR} {FIG_TAIL} Square portrait composition, the face large and clearly "
                        f"lit. {NEG}", "refs": [REFS["card"]], "strength": 0.8, "shift": 1.5},
})
add("explore/lift-car", (320, 160), (1280, 640), {
    "x-pix": {"prompt": f"{PIX} A wide pixel art event illustration for a space game. {LIFTCAR} {WORLD} {NEG}"},
    "x-fig": {"prompt": f"{FIG_HEAD} {LIFTCAR} {FIG_TAIL} Wide 2:1 composition, the lift car centred. {NEG}",
              "refs": [REFS["card"]], "strength": 0.8, "shift": 1.5},
})


add("explore/tender", (448, 200), (1792, 800), {
    "x-ill-d80": {"prompt": f"{ILL} {SIDE} {TENDER_V2} {WORLD} {NEG}", **hull("lamplighter"), "denoise": 0.8},
    "x-ill-d88": {"prompt": f"{ILL} {SIDE} {TENDER_V2} {WORLD} {NEG}", **hull("lamplighter"), "denoise": 0.88},
    "x-ill-t2i": {"prompt": f"{ILL} {SIDE} {TENDER_V2} {WORLD} {NEG}"},
})
ENV_ILL = ("A crisp, detailed 2D side-view game background illustration with hard clean edges, flat graphic "
           "cel-shaded forms with two or three tones each, clean silhouettes layered in depth, a limited palette, no "
           "blur and no soft airbrush gradients, in the manner of the painted backgrounds of FTL: Faster Than Light "
           "and Hyper Light Drifter.")
SCENE_ILL = ("A crisp, detailed 2D game event illustration with hard clean edges, flat graphic cel-shaded forms with "
             "two or three tones each, clean readable silhouettes, a limited palette, no blur and no soft airbrush "
             "gradients.")
ASSETS["explore/operator"]["versions"]["x-pix8"] = {
    "prompt": f"{PIX} A pixel art character portrait for a game dialogue box. {OPERATOR} {WORLD} {NEG}",
    "gen": (768, 768)}
ASSETS["explore/lift-car"]["versions"]["x-pix8"] = {
    "prompt": f"{PIX} A wide pixel art event illustration for a space game. {LIFTCAR} {WORLD} {NEG}",
    "gen": (2560, 1280)}
ASSETS["explore/lift-car"]["versions"]["x-ill"] = {"prompt": f"{SCENE_ILL} {LIFTCAR} {WORLD} {NEG}"}
ASSETS["explore/s1-a"]["versions"]["x-ill"] = {"prompt": f"{ENV_ILL} {S1A} {WORLD} {NEG}"}
S1A_RICH = ("A wide side-view panorama from the outside of the Line at the very edge of space, in the Copper Reach. "
            "Along the top fifth of the picture the underside of the colossal ring fills the whole width: a dense "
            "band of dark riveted hull plating gone green and orange, girders, gantries, relay housings, long loops "
            "of copper cable hanging down and many tiny amber lamps. Along the bottom fifth, a sea of clouds lit "
            "copper and rose by a low sun, several slender dark relay spires rising out of it crowned with stacked "
            "shipping containers and cranes, a broken ring gate of rusted copper far away. The middle of the picture "
            "is calm open indigo sky with faint small stars.")
ASSETS["explore/s1-a"]["versions"]["x-ill2"] = {"prompt": f"{ENV_ILL} {S1A_RICH} {WORLD} {NEG}"}
for d in (0.55, 0.68):
    ASSETS["explore/s1-a"]["versions"][f"x-hyb{int(d*100)}"] = {
        "prompt": f"{ENV_ILL} {S1A_RICH} {WORLD} {NEG}", "init": str(ART / "cand/explore/s1-a/s1-a-x-env-1283339149.png"),
        "denoise": d}
ASSETS["explore/s1-a"]["versions"]["x-pix8"] = {"prompt": f"{PIX} A wide pixel art game background. {S1A_RICH} {NEG}",
                                                 "gen": (3840, 2176)}


# ------------------------------------------------------------------------------------------------ production
# The locked recipe per group (see README.md). Versions: "a" = the recipe; later letters = retries/variants.
import subjects as SUBJ  # noqa: E402

HULL_DENOISE = 0.8
ILL2 = ("A serious, detailed hard-edged game sprite illustration in the grounded style of FTL: Faster Than Light "
        "and FAULTLINE: heavy engineered machinery with realistic proportions, crisp edges, restrained shading with "
        "two or three tones per material, thin dark outlines, weathered riveted metal, desaturated dark forms with "
        "colour only from small lit accents. Melancholic, worn, functional.")
MAT = {
    "I": ("Worn engineered machinery of the Line: tarnished brass, chipped ivory ceramic, verdigris copper, rust, "
          "dark gunmetal, small teal signal lights and warm amber lamps."),
    "II": ("Worn engineered machinery of the Glass Cathedral: violet optical glass, dark brass, frost-white glints, "
           "small teal signal lights."),
    "III": ("Worn engineered machinery of the Blackout Heart: blackened iron, dark copper, glowing ember-red light, "
            "black lattice, small amber lights."),
}
STAGE = {"packet-leech": "I", "cable-wraith": "I", "rust-prophet": "I", "scrap-foreman": "I", "scavenger-skiff": "I",
         "static-nest": "I", "ferric-colossus": "I", "iron-regent": "I", "gate-warden": "I",
         "prism-widow": "II", "glass-echo": "II", "wire-weaver": "II", "glass-choir": "II", "coil-serpent": "II",
         "echo-tender": "II", "hollow-choir": "II",
         "gate-sentinel": "III", "null-marshal": "III", "ash-moth": "III", "grave-reaver": "III",
         "demolition-engine": "III", "quarantine-drone": "III", "blackout-core": "III", "sealing-drone": "III"}
NEG_MACH = NEG.replace(" no faces on machines.", " no faces on machines, no wheels on rails.")
NEG_MASKS = NEG.replace(" no faces on machines.", "")


def _vessels():
    """v4: sizes/gen come from the hull metadata (image px at density 2; renders at 2x the final image)."""
    import json
    for sid, subject in SUBJ.SHIPS.items():
        meta = json.loads((INIT / f"{sid}.json").read_text())
        W, H = meta["canvas"]
        gw, gh = meta["gen"]
        if max(W, H) <= 200:            # tiny roomless fliers: render at 4x
            gw, gh = W * 4, H * 4
        mat = MAT[STAGE.get(sid, "I")]
        neg = NEG_MASKS if sid == "hollow-choir" else NEG_MACH
        base = {"prompt": f"{ILL2} {SIDE} {subject} {mat} {neg}", **hull(sid), "denoise": HULL_DENOISE}
        if sid in ("glasswing", "switchback"):
            base["denoise"] = 0.8
            base["prompt"] += (" Every exterior service fitting is a finished mechanical assembly: finely engraved "
                               "collars, inset bolts, joint housings, layered metal plates, cooling ribs and polished "
                               "lens glass. Paint the roof equipment and nose with the same detailed craftsmanship "
                               "as the body; no flat featureless geometric blocks.")
        ASSETS[f"ships/{sid}"] = {"size": (W, H), "gen": (gw, gh), "n": 3, "versions": {
            v: dict(base) for v in ("h", "h2", "h3", "h4", "h5", "h6", "h7")}}
        if sid == "switchback":
            ASSETS[f"ships/{sid}"]["versions"]["h5"].update(
                denoise=0.76,
                prompt=base["prompt"] + " The large rooftop cable grip is EXPOSED INDUSTRIAL PULLEY MACHINERY: "
                "two naked grooved brass wheels held by a triangular open support frame, clamp jaws and axles. "
                "Absolutely no vehicle, no truck, no car, no wheeled cart, no cabin, no window, no windshield "
                "on the roof. The ONLY cabin is at the far right of the main hull. The three small rooftop "
                "drone cradles contain compact dark teal sensor drones, each a distinct rotor hub in a U-shaped "
                "brass saddle. Paint every part of the crane, grip and cradle as finely detailed functional metal.")
            ASSETS[f"ships/{sid}"]["versions"]["h6"].update(
                denoise=0.78,
                prompt=f"{ILL2} {SIDE} A single large industrial cable-maintenance hull matching the input "
                "silhouette exactly. The main ivory pressure body is a broad rectangle, brass-framed panels "
                "and small portholes. Its ONLY glass window is in the body at the far RIGHT. The roof equipment "
                "is strictly EXPOSED MACHINERY with OPEN GAPS: a narrow lifting crane on the LEFT, three small "
                "dark cylindrical teal sensor drones in separate U-shaped brass cradles, and two large naked "
                "brass PULLEY WHEELS at roof center-right. The pulley wheels have visible spokes, axle hubs, "
                "an exposed narrow crossbar and thin diagonal hanger struts with OPEN DARK SKY between them. "
                "Keep both pulley wheels visible. No enclosed housing around these wheels. Lower belly has "
                "dark retrieval shutters and brass attachment lugs. Every metal component has inset bolts, "
                f"fine wear and clear mechanical detail. {MAT['I']} {NEG_MACH} No rooftop cabin, no rooftop "
                "windows, no truck, no additional vehicle, no second house on top, no living quarters on the roof.")
            ASSETS[f"ships/{sid}"]["versions"]["h7"] = dict(
                ASSETS[f"ships/{sid}"]["versions"]["h6"], denoise=0.8)
            ASSETS[f"ships/{sid}"]["versions"]["h7"]["prompt"] += (
                " The tall aft CRANE has a complete long horizontal TRUSSED JIB from its elbow to the hanging "
                "hook, with visible triangular braces, hinge pins and dark cables. Keep the entire crane jib "
                "inside the image. Paint the two pulley wheels with many precise spokes and layered brass rims; "
                "finish the crossbar in weathered dark metal with polished axle housings and bolts.")
    for cid, subject in SUBJ.CARS.items():
        meta = json.loads((INIT / f"{cid}.json").read_text())
        W, H = meta["canvas"]
        gw, gh = meta["gen"]
        base = {"prompt": f"{ILL2} {SIDE} {subject} {MAT['I']} {NEG_MACH}", **hull(cid), "denoise": HULL_DENOISE}
        ASSETS[f"cars/{cid}"] = {"size": (W, H), "gen": (gw, gh), "n": 3, "versions": {
            "h": dict(base), "h2": dict(base),
            # ha: the locked Lamplighter final (nearest-upscaled) as style reference for one shared design language
            "ha": dict(base, prompt=f"{ILL2} {SIDE} {subject} Match the materials, panel pattern, rivets, portholes and "
                                   f"lamp of the reference car exactly. {MAT['I']} {NEG_MACH}",
                       refs=[anchor("lamplighter-anchor")], strength=0.5, shift=1.5),
        }}


STAGE_PAL = {"shared": "Neutral ink, brass and ivory with a teal or amber accent; dark indigo-black sky at the edge of "
                       "space, the cloud sea far below where it shows.",
             "I": "Stage palette: copper-green verdigris and rust orange with brass, warm amber lamps.",
             "II": "Stage palette: violet glass, frost white and teal.",
             "III": "Stage palette: ember red, black lattice, amber lights."}
EVENT_HEAD_HD = ("A serious, richly detailed event illustration for a side-view game, a wide 2:1 scene filling the whole "
                 "frame edge to edge, in the grounded, melancholic style of FTL: Faster Than Light and FAULTLINE, one "
                 "strong light source, rich atmosphere, mostly dark and desaturated.")
EVENT_WORLD = ("In this world nothing flies between relays except small drones on rotors: cable cars hang from drive "
               "trolleys on heavy braided carrier cables that sag between spire tops and relays. Outside, the sky is "
               "the dark indigo-black of the edge of space and below lies only the cloud sea: no water, no boats, no "
               "sails. Most scenes have no people. When crew appear they are one to three small figures inside the car, at a "
               "hatch or on a gantry in masks, never a crowd, never in the foreground edge, never standing on the cloud "
               "sea. No close-up faces.")


def _portraits():
    req = SUBJ.parse_requests()["portraits"]
    items = {pid: f"Portrait of {t}" for pid, t in SUBJ.PORTRAITS.items()}
    items.update({pid: t for pid, (_st, t) in req.items()})
    # Explicit single-figure briefs avoid interpreting "a second recruit" as two people. Riggers are machines.
    items.update({
        "recruit-linefolk-b": "One elderly male linefolk clerk, age sixty-five, grey moustache, knitted cap, lined amused face, worn ivory work coat and amber chest lamp. Head and shoulders, alone.",
        "recruit-warden-a": "One young male warden, age twenty-five, shaved head and angular serious face, wearing heavy dark segmented armour over his shoulders, a raised brass protective visor and one ember stripe. Head and shoulders, alone.",
        "recruit-warden-b": "One older female warden, age fifty, short grey hair, a lowered opaque brass protective visor hiding her eyes, chipped dark armour repaired with rivets, tiny kettle charm on her strap. Head and shoulders, alone.",
        "recruit-rigger-a": "One maintenance automaton, a squat round ivory ceramic robot shell, a single large circular teal camera lens in place of a face, two folded brass tool arms, a tiny bird-shaped paint mark. No human anatomy. Close portrait of the robot alone.",
        "recruit-rigger-b": "One battered maintenance automaton, an angular rectangular ivory robot shell with a replaced copper cheek plate, one cracked teal camera lens in place of a face, a blue cloth tied round one folded brass tool arm. No human anatomy. Close portrait of the robot alone.",
        "recruit-courier-b": "One male courier, age forty, dark skin and a short greying beard, opaque round brass goggles over his eyes, indigo scarf, patched ivory coat, leather satchel strap and a bundle of envelopes tied with string. Head and shoulders, alone.",
    })
    for pid, subject in items.items():
        header = ("A serious hard-edged digital portrait of a functional industrial ROBOT for a game dialogue box. "
                  "Crisp edges, restrained cel shading, weathered brass and ivory ceramic, no blur, no skin, no human face. "
                  if "rigger" in pid else PORTRAIT_ILL)
        ASSETS[f"portraits/{pid}"] = {"size": (192, 192), "gen": (768, 768), "n": 3, "versions": {
            "h": {"prompt": f"{header} {subject} Only one subject in the entire picture, no people in the background. {WORLD} {NEG}"},
            "hp": {"prompt": f"{PORTRAIT_HEAD} {subject} {WORLD} {NEG}", "gen": (1152, 1152)},
        }}


def _events():
    for eid, (st, brief) in SUBJ.parse_requests()["events"].items():
        if eid == "copper-market":
            brief = ("INTERIOR of an enclosed salvage market inside a vast rectangular freight terminal. "
                     "A solid riveted steel floor fills the foreground. Parallel stalls made from old relay cabinets, "
                     "spare ceramic lenses, coils of copper cable, stacked brass valves, a shopkeeper behind a counter. "
                     "Amber lamps hang from straight steel ceiling beams. A small rear window shows clouds far below. "
                     "Architecture is entirely angular industrial rooms: no boat shapes, no hulls, no sails, no flags.")
        ASSETS[f"events/{eid}"] = {"size": (640, 320), "gen": (1280, 640), "n": 3, "versions": {
            "h": {"prompt": f"{SCENE_ILL} {EVENT_HEAD_HD} {STAGE_PAL[st]} {brief} {EVENT_WORLD} {NEG}"},
            "h4": {"prompt": f"{SCENE_ILL} {EVENT_HEAD_HD} {STAGE_PAL[st]} {brief} {EVENT_WORLD} {NEG}",
                   "gen": (2560, 1280)},
            "e": {"prompt": f"{ENV_ILL} {EVENT_HEAD_HD} {STAGE_PAL[st]} {brief} {EVENT_WORLD} {NEG}",
                  "gen": (2560, 1280)},
        }}


ISO = ("A single object seen in a strict side view, isolated and centered on a flat plain dark navy background, lit "
       "from the upper left, nothing else in the picture.")


def _weapons():
    for wid, subject in SUBJ.WEAPONS.items():
        W, H = (150, 70) if wid in SUBJ.HEAVY else (120, 60)
        ASSETS[f"weapons/{wid}"] = {"size": (W, H), "gen": (W * 8, H * 8), "n": 3, "versions": {
            "a": {"prompt": f"{ILL2} {ISO} A piece of worn relay equipment bolted onto a cable car as a weapon: "
                            f"{subject}, facing right. {SUBJ.MOUNT} It is at rest, its lenses unlit. {MAT['I']} "
                            f"{NEG_MACH}"},
            "p": {"prompt": f"{PIX} {ISO} The object is small in the middle of the frame with wide empty space around "
                            f"it. A piece of worn relay equipment bolted onto a cable car as a weapon: {subject}, "
                            f"facing right. {SUBJ.MOUNT} It is at rest, its lenses unlit. {MAT['I']} {NEG_MACH}",
                  "gen": (W * 8, H * 8)},
        }}
    for did, subject in SUBJ.DRONES.items():
        ASSETS[f"drones/{did}"] = {"size": (72, 54), "gen": (864, 648), "n": 3, "versions": {
            "a": {"prompt": f"{ILL2} {ISO} A small maintenance drone of the Line, re-keyed to fly for a cable tender: "
                            f"{subject}, facing right, at rest. {MAT['I']} {NEG_MACH}"},
            "p": {"prompt": f"{PIX} {ISO} The object is small in the middle of the frame with wide empty space around "
                            f"it. A small worn maintenance drone of the Line, re-keyed to fly for a cable tender: "
                            f"{subject}, facing right, at rest, heavy and functional. {MAT['I']} {NEG_MACH}"},
        }}


PORTRAIT_ILL = ("A serious, detailed hard-edged digital portrait illustration for a game dialogue box, in the grounded, "
                "melancholic style of FTL: Faster Than Light and FAULTLINE: crisp edges, restrained cel shading with "
                "several tones per material, a limited palette, no blur. Head and shoulders of a real, tired, "
                "weathered person with realistic proportions, muted clothing in ivory, brass, indigo and grey, the face "
                "clearly lit by one small warm or teal light.")
PORTRAIT_HEAD = (f"{PIX} A serious pixel art character portrait for a game dialogue box, in the grounded, "
                 "melancholic style of FTL: Faster Than Light and FAULTLINE: head and shoulders of a real, tired, "
                 "weathered person with realistic proportions, muted clothing in ivory, brass, indigo and grey, the "
                 "face clearly lit by one small warm or teal light.")
SCENE_STAGE = {"s1": "I", "s2": "II", "s3": "III"}
BG_CALM = ("The middle band of the picture, from a quarter to two thirds of its height, is calm open dark sky with only "
           "faint small stars and no large objects, so that the game can draw cable cars and carriers over it.")


def _scenes():
    """Full-screen art 480x270 (drawn 2x): stage backdrops, title, Relay Seven, game over, endings.
    'a' = clean hard-edged illustration at 4x (1920x1088); 'p' = pixel art at 8x (3840x2176), snapped."""
    items = {}
    for bid, text in SUBJ.BG.items():
        st = SCENE_STAGE[bid[:2]]
        items[("bg", bid)] = (f"{SUBJ.SKY}{text}{SUBJ.CALM} {STAGE_PAL[st]}", MAT[st])
    for sid, text in SUBJ.SCENES.items():
        grp = "ending" if sid.startswith("e") and sid[1:].isdigit() else "bg"
        items[(grp, sid)] = (text, WORLD)
    for (grp, sid), (text, mat) in items.items():
        ASSETS[f"{grp}/{sid}"] = {"size": (1920, 1080), "gen": (2560, 1440), "n": 2, "versions": {
            "h": {"prompt": f"{ENV_ILL} Serious, grounded and melancholic, richly detailed. {text} {mat} {NEG}"},
            "h2": {"prompt": f"{ENV_ILL} Serious, grounded and melancholic, richly detailed. {text} {mat} {NEG}"},
            "a": {"prompt": f"{ENV_ILL} Serious, grounded and melancholic. {text} {mat} {NEG}"},
            "b": {"prompt": f"{ENV_ILL} Serious, grounded and melancholic. {text} {mat} {NEG}"},
            "p": {"prompt": f"{PIX} A wide pixel art game background. {text} {NEG}", "gen": (3840, 2176)},
        }}


def _props():
    for pid, text in SUBJ.PROPS.items():
        ASSETS[f"props/{pid}"] = {"size": (320, 320), "gen": (1280, 1280), "n": 3, "versions": {
            "a": {"prompt": f"{ILL2} {ISO} A set piece for a side-view game background: {text}. {MAT['I']} {NEG}"},
            "p": {"prompt": f"{PIX} {ISO} A set piece for a side-view game background: {text}. {NEG}"},
        }}


_vessels()
_portraits()
_weapons()
_events()
_scenes()
_props()

# Clouds need atmospheric shading, rather than the machinery material prompt used by solid props.
ASSETS["props/cloud-bank"]["versions"]["h"] = {"prompt": (
    "Detailed pixel art sprite for a serious atmospheric side-view game. A single broad bank of natural "
    "billowing stratocumulus clouds, soft ivory cloud tops lit by a low copper and rose sunset, layered "
    "slate-blue and indigo shadows underneath. Irregular rounded vapor silhouette, one isolated cloud bank "
    "centered on a completely flat dark navy background, generous empty margin. Crisp limited-palette "
    "pixel clusters. Natural weather only: no building, machinery, metal, pipes, lamps, wheels, towers, "
    "text or frame.")}


from readability_weapons import install as install_readability
install_readability(ASSETS, PIX)
from readability_rooms import install as install_rooms
install_rooms(ASSETS, PIX)
from readability_hulls import install as install_hulls
install_hulls(ASSETS, SUBJ.SHIPS, STAGE, MAT, SIDE, PIX)
from study import install as install_study  # A1 pixel-art style study (study.py)
install_study(ASSETS)
from v5 import install as install_v5  # DIRECTION v5 production prompts (v5.py)
install_v5(ASSETS)
from hullparts import install as install_parts  # A2 hull kit (hullparts.py, subjects.PARTS)
install_parts(ASSETS, ILL2)
from hullparts import install_trolley  # A2 drive trolley family (tools/art/trolley.py)
install_trolley(ASSETS)
from hullparts import install_keyed  # A2 fittings on a magenta key backdrop
install_keyed(ASSETS, ILL2)
from hullparts import install_hulls_v5  # A2 hulls: volume init + keyed fittings, one repaint
install_hulls_v5(ASSETS, ILL2, SIDE, SUBJ.SHIPS, MAT['I'], NEG_MACH)
from hullparts import install_blend  # A2 blend pass over the assembled hulls
install_blend(ASSETS, ILL2, SIDE, SUBJ.SHIPS, MAT['I'], NEG_MACH)

ASSETS["weapons/thermite-payload"]["versions"]["readable2"] = dict(ASSETS["weapons/thermite-payload"]["versions"]["readable"], prompt=(PIX + " Single wide horizontal side elevation game sprite on plain flat navy background. A thermite shell launcher aimed RIGHT: one broad short BLACK CERAMIC launch tube, riveted brass receiver, a fat RED-ORANGE THERMITE CANISTER loaded on a top rack with an ivory cap, copper cooling fins at the rear, short mechanical rail clamp base. Compact rectangular silhouette. Unlike a laser weapon: NO long slender barrels, NO multiple barrels. Big readable three-tone material planes with fine crisp industrial details, chipped ivory enamel, dark blue steel, copper. At rest, no shooting, no flames. No text, no labels, no scenery, no border. Entire object visible."))

ASSETS["ships/iron-regent"]["versions"]["readable-regent"] = dict(ASSETS["ships/iron-regent"]["versions"]["h"], denoise=0.83, prompt=(PIX + " " + SIDE + " The Iron Regent, a massive armored industrial gate engine built into the Copper Gate between two gate wings. Strict side elevation facing LEFT. Preserve the reference silhouette and proportions: solid broad compact rectangular central pressure hull, a massive sloping brass-and-black front shield on the LEFT with a recessed circular amber gate-lock lens, an armored raised command citadel above with a horizontal teal observation slit and three blunt sensor blocks, thick copper hydraulic rams joining the command citadel to the shoulders, two ribbed power blocks under the keel, a vertical fixed gate clamp attached tightly at the RIGHT rear. Heavy beveled interlocking brass armor panels and blue-black iron structural ribs, worn ivory edge guards, small amber lamps, realistic rivets and precise piston detail. Strong iconic silhouette, dense convincing mechanical details, restrained broad planes. Formidable and ancient. All structural parts physically connected. No giant enclosing rectangular frame, no empty cage, no triangular crown spikes, no medieval ornament, no castle, no face, no eyes, no creatures, no arms or legs. The central hull must stay solid to contain the cutaway rooms. Flat plain dark navy background. Entire object visible, no ground, no background scenery, no writing or text."))

# ------------------------------------------------------------------------------------------------ resolve
# Finishing pass (user decision, 27 Sep 2026): never more than two Krea candidates per item.
MAX_CANDIDATES = 2

def resolve(spec):
    m = re.fullmatch(r"([\w-]+)/([\w-]+)(?::([\w-]+))?(?:@([\d,]+))?", spec)
    if not m:
        raise ValueError(f"bad job spec {spec}")
    group, aid, version, seeds = m.groups()
    key = f"{group}/{aid}"
    entry = ASSETS[key]
    version = version or next(iter(entry["versions"]))
    v = dict(entry["versions"][version])
    if seeds and ("," in seeds or len(seeds) > 3):
        seed_list = [int(x) for x in seeds.split(",")][:MAX_CANDIDATES]
    else:
        n = min(int(seeds or v.pop("n", entry["n"])), MAX_CANDIDATES)
        seed_list = [seed_for(key, version, k) for k in range(1, n + 1)]
    v.pop("n", None)
    W, H = v.pop("gen", entry["gen"])
    base = {"group": group, "id": aid, "version": version, "size": list(entry["size"]), "width": W, "height": H,
            "refs": [], "strength": 0.0, "shift": None}
    base.update(v)
    return [dict(base, seed=s) for s in seed_list]

# ------------------------------------------------------------------------------------------------ A4 (27 Sep)
# r2: the "readable" hostile hulls used the pixel-art head at 2x, so Krea's 8-px pseudo-pixels became 4-px blocks in
# the final (Packet Leech's mosaic). Same subject and readability text in the illustration head (ILL2).
from readability_hulls import HULLS as _RH  # noqa: E402
for _k in _RH:
    _e = ASSETS["ships/" + _k]
    if "readable" in _e["versions"]:
        _r = dict(_e["versions"]["readable"])
        _r["prompt"] = _r["prompt"].replace(PIX + " ", ILL2 + " ", 1)
        _r["n"] = 3
        _e["versions"]["r2"] = _r
# slug: the Payload Launcher read as a finned missile; lore and flavour say a pneumatic slug thrower
ASSETS["weapons/payload-launcher"]["versions"]["slug"] = dict(
    ASSETS["weapons/payload-launcher"]["versions"]["readable"], n=4, prompt=ASSETS["weapons/payload-launcher"][
        "versions"]["readable"]["prompt"].replace(
        "a squat single open-ended rectangular launch tube aimed right, ONE visible orange-tipped cylindrical missile "
        "resting in the tube, ivory blast shield above and dark iron loading mechanism below",
        "a pneumatic slug thrower: a short heavy iron barrel aimed right on a riveted brass receiver, a round riveted "
        "compressed-air tank bolted under the barrel, a revolving drum magazine of stubby brass slugs with teal tips "
        "at the breech, a coiled copper air hose; not a missile, no fins, no rocket, no warhead"))

