"""Subject briefs for every TIME TO LIVE Krea asset (style-independent; specs.py wraps them in the locked recipe).
Sources: docs/contract.md §4-5, docs/lore.md (game canon), faultline/docs/lore.md."""

# ------------------------------------------------------------------------------------------------ vessels (DIRECTION v2.1)
# Side view (elevation cutaway). Player cars face RIGHT, hostiles face LEFT. The game draws the carrier cable itself,
# so crawlers show only their trolley/grip; installations show their anchoring; fliers show rotors.
TENDER_LOOK = ("in the Reach-dock pattern: chipped ivory ceramic panels framed by riveted tarnished-brass ribs, small "
               "round brass-rimmed portholes, verdigris copper pipe runs, small teal signal lights")
TROLLEY = ("a brass drive trolley on the roof with two grooved grip wheels and grip arms that clamp an overhead "
           "carrier cable, joined to the roof by hanger struts")
SHIPS = {
    "lamplighter": ("A cable tender, a long pressurised maintenance car that hangs from a carrier cable at the edge of "
                    f"space: the Lamplighter, lead car of its tender, {TENDER_LOOK}. {TROLLEY}. A rounded cab nose on "
                    "the right with a cab window glowing warm amber and a big round glass guide-lamp cupola glowing "
                    "amber at the nose tip, small tool hardpoints on the roof fore and aft and under the belly, a "
                    "gangway coupler at the flat rear end on the left, a slim belly with two hanger lugs and a hatch. "
                    "No wheels under the car, no rails, no track."),
    "glasswing": (f"Glasswing G-04, a compact lamplighter-pattern cable tender fitted for optical inspection: the same "
                  "family as the Lamplighter, shorter, four decks, built "
                  f"{TENDER_LOOK}. {TROLLEY}. Strict side elevation facing RIGHT. A rounded cab nose at the RIGHT "
                  "with a warm amber cab window and a round glass guide-lamp cupola at the nose tip, like the "
                  "Lamplighter's. Under the cupola, two short brass collimator lens tubes on an external brass "
                  "rail, one teal lens above one amber lens, lens caps hanging on small chains. On the forward roof "
                  "ahead of the trolley a faceted violet-and-teal glass prism housing with brass calibration rings; "
                  "slim brass survey horns pointing aft on the rear roof. The trolley's grip arms rise from the "
                  "roof and clamp the carrier; every roof fitting stands on the roof, nothing floats above it. A "
                  "keel of rounded air tanks and hanger lugs under the belly, a gangway coupler at the flat rear end "
                  "on the LEFT. Chipped ivory, dark brass collars, violet glass and teal accents, fine engraved "
                  "optics. No wheels under the car, no rails, no track."),
    "switchback": (f"Switchback S-08, a TALL lamplighter-pattern cable tender fitted for drone retrieval: the same family "
                   "as the Lamplighter, taller and broader, five decks, built "
                   f"{TENDER_LOOK}. {TROLLEY}. Strict side elevation facing RIGHT. A rounded cab nose at the RIGHT "
                   "with a warm amber cab window and a round glass guide-lamp cupola at the nose tip, like the "
                   "Lamplighter's. On the aft roof at LEFT, bolted to the roof, a jointed retrieval crane with a "
                   "trussed horizontal jib, hanging cable and hook, and three separate U-shaped brass launch "
                   "cradles with small parked dark rotor drones and teal indicators, open gaps between them. The "
                   "drive trolley sits at roof centre, its grip arms rising from the roof to clamp the carrier; "
                   "crane and trolley are separate assemblies and every roof fitting stands on the roof, nothing "
                   "floats. Heavy riveted plating, dark gunmetal retrieval shutters across the lower deck, a keel "
                   "of tanks and brass hanger lugs below, a gangway coupler at the flat rear end on the LEFT. "
                   "Chipped ivory, brass, dark gunmetal and amber accents. A heavy working car, clearly taller "
                   "than the optical inspection tender. No wheels under the car, no rails, no track."),
    "packet-leech": ("A hostile recovery-drone hulk clamped onto a carrier cable by a copper grip trolley on its top, "
                     "facing left: the Packet Leech. A bulbous overflowing round buffer tank of verdigris-green copper "
                     "plating with a big glowing amber buffer window, grasping jointed intake arms reaching forward "
                     "on the left around an intake mouth, corroded panels, rivets and pipes."),
    "cable-wraith": ("A hostile isolation cutter riding a carrier cable on a dark iron trolley, facing left: the Cable "
                     "Wraith. A long thin dark gunmetal body, enormous open steel shears at its nose on the left like "
                     "a giant pair of scissor blades, a small amber pivot lamp, severed copper cables hanging from "
                     "its tail with sparking frayed ends."),
    "rust-prophet": ("A hostile maintenance beacon built onto a relay gantry, facing left: the Rust Prophet. A tall "
                     "rusted beacon house on a stub of gantry girder, a mast on top carrying flared copper "
                     "broadcasting horns and a big red warning lamp, more horns on its front, flaking orange rust and "
                     "verdigris streaks."),
    "scrap-foreman": ("A hostile relay-yard gantry crane riding a rail on its roof trolley, facing left: the Scrap "
                      "Foreman. A rusted crane house, a long brass lattice jib reaching forward to the left with a "
                      "hoist cable and a heavy steel grab claw, a cross-braced container frame hung under the crane "
                      "house, hazard stripes and amber hazard lamps."),
    "scavenger-skiff": ("A small salvaged cable car hanging from a patched trolley on a carrier cable, facing left, "
                        "crewed by Night Shift scavengers: the Scavenger Skiff. A pointed cab on the left with a "
                        "small window, a body patched from mismatched plates (grey steel, copper, ivory, verdigris, "
                        "rust), welded seams, crates lashed on the roof, a salvage net slung under the belly."),
    "static-nest": ("A hostile brood hive hanging beneath a relay platform girder, facing left: the Static Nest. A "
                    "lumpy rounded hive of rusted copper cells like clustered domed pods, some pods open and glowing "
                    "teal with tiny sparks, launch tubes on the left, a warm amber core glow."),
    "ferric-colossus": ("A huge hostile foundry guardian standing on its foundry deck, facing left: the Ferric "
                        "Colossus. Massive heavy dark iron armour slabs, a glowing furnace mouth on the left blazing "
                        "orange and white, two chimney stacks with ember glow on top, riveted plates, heat-stained "
                        "metal."),
    "iron-regent": ("A colossal hostile gate machine, facing left, a boss: the Iron Regent, the Copper Gate itself. A "
                    "crowned armoured bulk of dark iron set in a massive iron gate frame (a lintel above, a pillar on "
                    "the right, a sill below), two huge ribbed brass gate leaves folded forward on its left side, a "
                    "tarnished brass crown of pointed tines on its top with an amber core light."),
    "prism-widow": ("A hostile optical repair automaton hanging from thin glowing glass-web cables by its upper legs, "
                    "facing left: the Prism Widow, with a spider silhouette. A dark violet glass body and a large "
                    "faceted glass abdomen glowing faintly violet, long thin jointed legs of violet glass, threads of "
                    "pale violet light strung between them, a cluster of small optical lenses at the front. A "
                    "machine of glass and metal, not an animal."),
    "glass-echo": ("A small fast hostile bell-drone flying on a rotor, facing left: the Glass Echo. A flared violet "
                   "glass bell mouth at the front on the left, a slim dark body, swept glass fins above and below at "
                   "the back, a spinning rotor on a mast above, a small teal thruster at the back."),
    "wire-weaver": ("A hostile wiring automaton riding a carrier cable on a brass trolley, facing left: the Wire "
                    "Weaver. A brass carriage body, several thin jointed steel arms reaching forward to the left like "
                    "a loom, copper cable spools mounted on it, taut wires strung between spools and arms."),
    "glass-choir": ("A hostile installation hanging from a hall beam on chains, facing left: the Glass Choir. A "
                    "long dark brass bell-house with violet glass panes, and three large violet glass announcement "
                    "bells hanging in a row beneath it, each with a pale glowing clapper."),
    "coil-serpent": ("A long hostile cable-recovery coil riding a carrier cable on two grips, facing left: the Coil "
                     "Serpent. A long chain of ring-shaped copper and verdigris segments joined by brass bands, a "
                     "steel gripper head with two jaws on the left and a small amber light, a tapered tail on the "
                     "right."),
    "echo-tender": ("A cable tender hanging from a trolley on a carrier cable, facing left, running on autopilot with "
                    f"nobody aboard: an Echo Tender, an older car {TENDER_LOOK}, dusty and faded, its round nose "
                    "lamp on the left still glowing warm amber, a dark cab window, tanks under the belly."),
    "hollow-choir": ("A colossal hostile cathedral engine hung on chains in a glass hall, facing left, a boss: the "
                     "Hollow Choir. A dark violet glass body with rows of tall organ-pipe spines of violet glass "
                     "rising from its top, large round violet glass bells glowing inside it, three glass bells "
                     "hanging beneath, a cluster of pale porcelain masks with closed eyes at its front on the left."),
    "gate-sentinel": ("A hostile checkpoint platform built onto a gantry, facing left: the Gate Sentinel. A heavy "
                      "iron checkpoint house, a tall barred gate of brass and iron bars on its front, a round "
                      "key-scanner lens glowing red on a boom arm above, warning stripes, struts below."),
    "null-marshal": ("A hostile angular armoured escort riding a carrier cable on an iron trolley, facing left: the "
                     "Null Marshal. Sharp angular chevron-shaped dark armour plates, a wedge nose on the left, a "
                     "boarding pod under the belly, thin ember-red running lights along its edges."),
    "ash-moth": ("A hostile cooling drone flying on rotors, facing left: the Ash Moth. A compact dark body with a "
                 "teal coolant lens at the front on the left and two huge wings of parallel steel radiator fins "
                 "above and below, the fins scorched and flaking grey ash, an ember glow at the back."),
    "grave-reaver": ("A hostile reactor dismantler riding a carrier cable on an iron trolley, facing left: the Grave "
                     "Reaver. A heavy dark body with two huge steel pincer claws reaching forward to the left, a round "
                     "cutting-disc housing with an amber glow, rusted racks."),
    "demolition-engine": ("A huge hostile decommissioning machine hanging from two iron trolleys on a carrier cable, "
                          "facing left: the Demolition Engine. A heavy dark iron body, a blunt steel wrecking ram at "
                          "the front on the left, rusted exhaust stacks glowing ember on top, an amber countdown "
                          "light strip, a heavy armoured tread-plated belly."),
    "quarantine-drone": ("A hostile sealing drone flying on two rotors, facing left: the Quarantine Drone of the "
                         "Seal. A smooth rounded matte black shell with a thin glowing red seam line around it, a red "
                         "sensor light at the front on the left, clamp plates below. Dark grey edge highlights keep "
                         "the black shell readable."),
    "blackout-core": ("A colossal hostile archive machine, a boss: the Blackout Core, the Heart's shell. A great "
                      "sphere of dark iron and blackened copper galleries in concentric shells, opening in rings "
                      "around a burning ember-red and white-hot core, braced to the ring by heavy struts above and "
                      "below, clamps at its corners."),
    "gate-warden": ("A small hostile drone flying on a rotor, facing left: a Gate Warden, a thick piece of a great "
                    "gate, brass-framed dark iron with bars, one teal lens at the front."),
    "sealing-drone": ("A tiny hostile drone flying on a rotor, facing left: a Sealing Drone, a smooth matte black "
                      "shell with a thin glowing red seam and a red light at the front."),
}

REAR = (f"A rear car of a cable tender, {TENDER_LOOK}; it hangs from its own small brass trolley with two grip "
        "wheels on an overhead carrier cable, has a gangway coupler at its right end and a closed rounded end on "
        "the left. No wheels under the car, no rails.")
KEEL = (f"A keel car of a cable tender, {TENDER_LOOK}; a low pressurised pod slung beneath a larger car on two "
        "brass hanger struts rising from its roof to the top edge, with a small hatch on top. No wheels, no rails.")
CARS = {
    "drone-car": f"{REAR} The Drone Car: two small maintenance drones resting in cradles on its roof, bay doors under its belly.",
    "armory-car": f"{REAR} The Armory Car: a heavy brass turret ring with a stubby emitter barrel on the rear of its roof.",
    "freight-car": f"{REAR} The Freight Car: cross-braced container frames on its roof, a rack of stubby brass payload shells with teal tips under its belly.",
    "bunk-car": f"{REAR} The Bunk Car: a raised clerestory along its roof with a row of small warmly lit amber windows, more little lit windows along its belly.",
    "veil-car": f"{REAR} The Veil Car: dark louvred lamp shrouds and shutters along its roof and belly, one small dimmed amber lamp.",
    "ballast-keel": f"{KEEL} The Ballast Keel: rounded pressure tanks at both ends and heavy iron ballast plates hung under it.",
    "listening-keel": f"{KEEL} The Listening Keel: a row of flared copper listening horns under its belly and one horn at its front.",
    "sling-keel": f"{KEEL} The Sling Keel: a long launcher rail under its belly pointing forward to the right, brass payload shells beside it.",
    "workshop-keel": f"{KEEL} The Workshop Keel: jointed steel tool arms folded under both ends and a small crane hook, a tool rack under its belly.",
}

# ------------------------------------------------------------------------------------------------ backdrops (480x270)
SKY = ("A wide side-view panorama from the outside of the Line at the very edge of space: a deep indigo-black sky "
       "with faint small stars, lighter only near the far horizon. ")
CALM = ("The middle of the picture, from a quarter to two thirds of its height, is calm open dark sky with only faint "
        "small stars and no large objects.")
BG = {
    "s1-d": ("The Cable Switchback Canyon, a completely different Copper Reach landmark. A close colossal "
             "verdigris switch tower is cropped by the LEFT edge, with enormous exposed copper pulley wheels, "
             "zigzag service stairs and long crane booms. A second narrow counterweight tower stands at the far "
             "RIGHT edge; several taut carrier cables cross the upper sixth diagonally between them. Between the "
             "towers lies a deep open indigo chasm. Far below, an island of stacked orange freight containers and "
             "tiny warm workshops rises from dark low cloud. Low oblique copper dawn catches the worn edges. "
             "Composition is asymmetrical and vertical, with enormous depth, NO continuous roof across the top. "),
    "s1-e": ("The Sunward Drydock, a remote Copper Reach midpoint repair harbor at the edge of space. A huge "
             "horseshoe-shaped ivory and dark copper maintenance dock rises at the lower RIGHT, with three "
             "distinct crane booms, a bank of sleeping cable-car cradles and tiny amber workshop windows. The "
             "upper LEFT holds a low pale gold SUN just above the far cloud horizon, partly behind the slender "
             "silhouette of a distant spire top, shining long golden horizontal streaks through thin rust dust. In the lower LEFT are quiet stacked fuel tanks and a "
             "small lamp-lit crew refuge on a suspended balcony. Most central space is deep midnight blue. "
             "No continuous roof or ring underside; strong diagonal silhouette from low left to high right. "),
    "s2-d": ("The Mirror Reservoir in the Glass Cathedral: a vast OPEN chamber framed by two immense cracked "
             "hexagonal violet-glass mirror dishes at the LEFT and RIGHT edges, both angled inward in dark brass "
             "gimbals. Low in the scene a descending staircase of translucent optical prisms catches thin cyan "
             "beams reflected between the mirrors. Fine frosted cables cross high above the empty midnight-blue "
             "center. The bottom is layered pale violet glass fog falling into a deep abyss, with a tiny isolated "
             "calibration shelter glowing warm amber at the far bottom left. No cathedral roof or row of bells; "
             "monumental angular mirror silhouettes and sparse light rather than repeating domes. "),
    "s2-e": ("The Quiet Observatory, a refuge at the midpoint of the Glass Cathedral. At the far RIGHT a tall "
             "slender ivory telescope tower carries one enormous open split violet-glass dome, a long horizontal "
             "brass telescope pointing LEFT over the dark chasm. Below it, a sheltered balcony has a row of tiny "
             "warm amber windows, a clearly visible kettle-shaped service tank and hung insulated cable coils. "
             "At the lower LEFT are three much smaller distant telescope domes separated by a sea of soft-edged "
             "stepped violet cloud. Delicate aurora-like glass refractions stripe the upper sky. Open starfield "
             "across the upper middle, no overhead ring band. Quiet and inhabited, distinct from a combat ruin. "),
    "s3-d": ("The Radiator Graveyard beside the Blackout Heart, an enormous abandoned heat exchanger field. "
             "At the LEFT edge three BROKEN industrial cooling towers lean inward, their black steel frames "
             "filled with hundreds of closely spaced thin radiator slats, heavy red copper coolant manifolds, "
             "ribbed pipes, valve wheels and riveted service galleries. These are complex engineered machines, "
             "NOT simple flat black feathers or solid fan shapes. Across the lower quarter, a graveyard of "
             "staggered rectangular exchanger banks, detailed ladders and catwalks descends into ash-gray cloud. "
             "At far RIGHT a distant white-hot reactor aperture glimmers THROUGH many dark structural ribs, "
             "with a few ember sparks rising. Warm maintenance lamps trace access gantries in the immense ruins. "
             "Broad central dark negative space, no continuous roof, no generic spires, strong diagonal depth. "
             "Intricate but clean secondary detail and worn copper edges on every major silhouette. "),
    "s3-e": ("The Last Maintenance Sanctuary, a small inhabited refuge embedded beneath the Blackout Heart. "
             "A huge diagonal black lattice buttress frames the upper LEFT and recedes into the far right abyss. "
             "Along the lower RIGHT a semicircular armored maintenance gallery has a chain of SMALL warm ivory "
             "and amber windows, a bright sheltered doorway, neat oxygen cylinders and a tiny suspended platform. "
             "Far lower LEFT, three concentric black archive shells are silhouetted around a dim red core. "
             "A narrow service bridge and one unbroken amber cable connect the refuge to the dark structure. "
             "Deep dark central void; warmth is concentrated only in the safe gallery, no continuous roof, no "
             "wall of red fire. A rare human foothold amid immense angular machinery. "),
    "s1-a": ("The Copper Reach. Along the top fifth of the picture the underside of the colossal ring fills the whole "
             "width: a dense band of dark riveted hull plating gone green and orange, girders, gantries, relay "
             "housings, long loops of copper cable hanging down and many tiny amber lamps. Along the bottom fifth, a "
             "sea of clouds lit copper and rose by a low sun, several slender dark relay spires rising out of it "
             "crowned with stacked shipping containers and cranes, a broken ring gate of rusted copper far away. "),
    "s1-b": ("The broken outer relays of the Copper Reach at night. Along the top fifth, the ring's dark underside "
             "with a line of tiny amber lamps that stops at a dark break, snapped girders and cables dangling at the "
             "break. Along the bottom fifth, a dark cloud sea with a few slender spires, and far away on the horizon "
             "the outer relay gates: huge circular lattice rings of rusted copper, like enormous broken wheels "
             "standing on edge, one snapped open with its broken ends bent apart, glittering debris drifting "
             "around them. "),
    "s1-c": ("The foundries of the Copper Reach on the sun side. Along the top fifth, the ring's rusted underside "
             "with banked furnace vents glowing dull red, smoke stacks and loops of green copper cable. Along the "
             "bottom fifth, a copper-gold cloud sea in low sun glare, rusted spire tops with cranes, and far away on "
             "the horizon the Copper Gate: two enormous closed gate wings on a spire. "),
    "s2-a": ("The Glass Cathedral. Along the top fifth, the ring turns into a range of domes, naves and flying "
             "buttresses of violet optical glass with dark brass ribs, glowing softly from within, frost on the "
             "panes. Along the bottom fifth, a violet-lit cloud sea with slender dark spires, glass fog pouring down "
             "from the ring in thin veils far away. "),
    "s2-b": ("Glass fog under the Glass Cathedral. Along the top fifth, the violet glass underside of the ring with "
             "frost and dark brass frames. Low banks of luminous violet-white fog lie along the bottom fifth over the "
             "cloud sea, with the tips of dark spires and faint glass bells showing through it. "),
    "s2-c": ("The bells of the Glass Cathedral. Along the top fifth, the ring's underside of violet glass and dark "
             "brass, with a row of huge violet glass bells hanging beneath it in brass frames, some the size of a "
             "lift car, faintly lit inside. Along the bottom fifth, a twilight cloud sea in violet and indigo with far "
             "spires. "),
    "s3-a": ("The Blackout Heart. Along the top fifth, the thickened ring of blackened copper and iron with ember-red "
             "lamps and the black lattice of the Seal. Along the bottom fifth, a dark cloud sea lit red from above, "
             "and rising from the horizon on one side a vast sphere of archive machinery, concentric galleries and "
             "cooling fins glowing ember red. "),
    "s3-b": ("A dark stretch near the Blackout Heart. Along the top fifth, the ring's underside covered by the "
             "Seal's black geometric lattice with thin glowing red seams. Along the bottom fifth, a black cloud sea "
             "with a few dim red lamps on distant spires and a faint ember glow on the horizon. Very dark. "),
    "s3-c": ("Inside the reach of the Blackout Heart. Along the top fifth, enormous cooling fins shedding drifting "
             "ember sparks and shelving stacks hanging from the ring like inverted spires. Along the bottom fifth, a "
             "dark ember-lit cloud sea, and low on the horizon, through cracks in dark galleries, a field of small "
             "warm lights. "),
}

SCENES = {
    "title": ("The Lamplighter seen in strict side view, small in the lower middle of the picture: a long "
              "brass-and-ivory lamplighter-pattern cable tender with a rounded cab nose on the right, a round glass "
              "lamp cupola glowing amber at the nose tip and a warm amber cab window under it, riveted plates, a "
              "keel of tanks below. It hangs beneath its brass drive trolley, whose grip arms clamp a heavy braided "
              "carrier cable; the cable sags in a long curve between two dark spire tops. Above, the colossal dark "
              "arc of the Line, a ring of relay machinery at the edge of space, crosses the sky as a string of tiny "
              "lamps with one stretch dark: the Faultline gap. Slender industrial spires rise from the cloud sea far "
              "below. Stars. The upper third of the picture is quiet dark sky. No tram, no pantograph, no hanging "
              "lantern, no wheels under the car, no castle."),
    "relay-seven": ("Inside the Relay Seven switchboard room, night: a tall old manual switchboard of brass jacks, "
                    "ivory panels and braided patch cords, all its small lamps dark except one small round "
                    "indicator lamp in the middle blinking warm amber above an empty jack; no flame, no candle. A worn wooden operator's chair with a headset hanging on it in front of "
                    "the board, a round porthole showing the cloud sea and the arc of the Line, a kettle on a "
                    "shelf. Indigo shadows, warm amber light."),
    "line-quiet": ("Relay Seven switchboard room, very late at night: the tall brass-and-ivory switchboard, one "
                   "amber lamp blinking again on the board, a patch cord hanging loose from a cold jack, the "
                   "operator's chair empty, the headset resting on the desk. Quiet, dark indigo, a single warm "
                   "glow."),
    "e1": ("The shell of the Blackout Heart opening: the concentric ember-red shells of the great archive sphere "
           "part like petals and a flood of thousands of small warm white and amber lights streams out of it into "
           "the dark."),
    "e2": ("Streams of small bright lights race along the colossal dark ring of the Line at the edge of space, "
           "thousands of messages flowing along it like a river of light, across violet glass halls and rusted "
           "copper sections, down the tall spires into the clouds."),
    "e3": ("From a spire top on the Line: the long arc of relay lamps runs away to both horizons, coming back on "
           "segment by segment, and the dark gap in the arc is closing with light from both ends. Stars above, "
           "dawn light on the cloud sea far below. No planet curve, no view from space."),
    "e4": ("On the ground of the world below the clouds, at night: a settlement of old freight lift cars turned "
           "into homes at the foot of a colossal spire, windows lit warm amber, wet ferns and rain; people in "
           "coats stand outside looking up; the clouds above are thin and through them the arc of the Line is "
           "lit, a long string of lamps across the sky."),
    "e5": ("Inside a small home built from an old lift car on the rainy ground: a home-made radio built from a "
           "brass-and-ivory lift control panel with dials and a transmit key, a small warm lamp, rain on the round "
           "window, a chipped enamel mug; the radio's indicator glows teal: an answer has come."),
    "e6": ("The Relay Seven switchboard: a tall brass-and-ivory manual switchboard in the dark, and in a lower row a "
           "lamp that has never been lit is now glowing warm white-gold for the first time, beneath it a small "
           "blank brass label plate; an old woman's hand with a brass headset reaches up."),
}

# ------------------------------------------------------------------------------------------------ portraits 96x96
PORTRAITS = {
    "operator": ("the Operator: an old woman of about seventy-two with a lined, calm, watchful face and white hair "
                 "pinned up in a neat bun, a brass-and-ivory single-ear telephony headset with a thin curved "
                 "microphone arm, a heavy dark wool work coat with chipped ivory shoulder panels; behind her a dark "
                 "switchboard with brass jacks and one glowing amber lamp lighting her face from the side."),
    "pell": ("Pell, a salvage trader of the Copper Market: a sharp-eyed woman in her sixties with a wry half smile, "
             "short grey hair under a knitted cap, reading glasses pushed up, a patched oilskin work coat with many "
             "pockets, a pencil behind her ear and a crimping tool on a cord round her neck; behind her a stall of "
             "stacked salvage lit by strings of small amber lamps."),
    "scavenger": ("one of the Dunmore brothers, a Night Shift scavenger of the skiff Second Helping: a rangy man in his "
                  "forties with a long unshaven jaw, a dust mask pulled down round his neck, a patched padded jacket "
                  "of mismatched canvas panels with salvage hooks and cord on the shoulder, grime on his face, a "
                  "hard wary look; behind him the cramped cab of a patched skiff, a salvaged cable car, lit by an amber hand lamp."),
    "bench-keeper": ("Hobb Tallis, keeper of Bench Nine: an old cable-crew man in his seventies with a bald head, "
                     "big white moustache and bushy eyebrows, a friendly grumpy face, a worn brass-and-ivory cable "
                     "crew work vest with tools in its loops, holding a dented kettle; behind him a warm workbench "
                     "with a lamp and sorted drawers of spares."),
    "bellmaker": ("Marit Seldon, a bellmaker who stayed in the Glass Cathedral: a thin woman in her sixties with long "
                  "silver hair in a braid, calm listening eyes, a long dark coat, a violet glass tuning fork in her "
                  "hand held near her ear and a glass pendant at her throat; behind her violet glass panes and the "
                  "rim of a great bell glowing softly violet."),
    "teal-jacket": ("a grey-haired woman in her fifties sitting at a home-made radio built from a brass-and-ivory lift "
                    "panel, her face mostly in shadow, only the line of her cheek and hair lit by the radio's small "
                    "teal glow; she wears a faded, sun-washed teal canvas work jacket with a round plain ivory "
                    "relay-crew patch on the shoulder; rain on a round window behind her."),
    "warden-memory": ("an old faded badge photograph of Warden-Commander Harrow: a woman of about sixty with "
                      "close-cropped grey hair and a grave, tired, steady face, in chipped ivory and dark brass "
                      "warden armour with a high collar, framed like an old worn identity photo, sepia-tinted and "
                      "scratched."),
}

# ------------------------------------------------------------------------------------------------ events 320x160
EVENTS = {
    "drifting-lift-car": ("An old freight lift car of chipped ivory panels and tarnished brass, stopped askew in an open "
                          "lattice lift shaft near a spire top; its round windows are dark except one faint warm "
                          "amber light; a slack cable hangs above it. The cloud sea glows faintly far below."),
    "relay-bench": ("A keeper's bench in a relay switch house: a small sheltered alcove with a workbench, a lamp left on "
                    "glowing warm amber, tools hung in order on a pegboard, a kettle on the shelf, a drawer of "
                    "sorted spare parts, a battered stool. A small window shows the carriers and stars outside."),
    "copper-market": ("The Copper Market: a tall tower of shipping containers welded together on a spire top above "
                      "the cloud sea, lit by strings of salvaged relay lamps, stalls on every landing, a crane used "
                      "as a lift, small figures trading salvage. Dusk sky."),
    "echo-tender": ("An old lamplighter-pattern cable tender with nobody aboard, hanging from its trolley on a "
                    "carrier and running slowly toward a dark relay, its nose cupola still lit warm amber, sweeping "
                    "its beam over a dark guide lamp; dust on its ivory panels, an empty cab window, stars."),
    "glass-bells": ("Huge violet glass bells hanging beneath the ring of the Glass Cathedral in dark brass frames, "
                    "glowing softly from within, glass fog drifting between them; one bell is ringing, rings of pale "
                    "violet light spreading from it."),
    "queue-lights": ("Through a crack in the dark galleries of a vast archive sphere: inside the sealed shell, a "
                     "field of thousands of small warm lights, each a waiting message, glowing in the dark like a "
                     "city seen from above, ember-red machinery framing the view."),
    "sealed-relay": ("A relay station on the ring sealed by the Seal: its lamp dark, its doors clamped shut by a "
                     "black lattice with thin glowing red seams, two small black quarantine drones on rotors with red "
                     "lights holding station beside it; the carrier under it still whole."),
    "debris-field": ("Wreckage from the broken outer relays snagged on the carriers and swinging from them: bent "
                     "ring-gate segments, snapped cables, torn plates and container pieces glittering in the light "
                     "of a low sun, a broken ring gate far behind."),
    "radio-mast": ("On the dark, wet green ground of the world below the clouds: a tall slender radio mast built "
                   "from old lift parts and cable beside a small house made from a lift car, one warm window, rain, "
                   "ferns, the foot of a colossal spire rising into low cloud behind."),
    "ground-lamp": ("Close view of a tall brass-and-ivory manual switchboard in the dark: one lamp in a lower row "
                    "glowing warm white-gold for the first time, lighting the dusty jacks around it; a small blank "
                    "brass label plate beneath it."),
}

# ------------------------------------------------------------------------------------------------ props <=160x160
PROPS = {
    "spire-top": "the top of a colossal relay spire rising out of a cloud bank: a dark lattice tower with gantries, "
                 "cable-hung platforms, stacked containers and a small amber lamp at its tip",
    "ring-gate": "a huge broken ring gate of rusted copper and verdigris: a great circular gate frame snapped open, "
                 "with jagged broken ends and hanging cables",
    "lamp-tower": "a relay lamp tower: a slender brass lattice tower on a relay platform with a big round glowing "
                  "amber guide lamp at its top",
    "market-stack": "the Copper Market: a tower of welded rusty shipping containers on a spire top, strings of small "
                    "amber lamps, a crane on top",
    "cathedral-dome": "a dome of the Glass Cathedral: a great dome of violet optical glass with dark brass ribs and "
                      "flying buttresses, glowing softly violet from within",
    "heart-sphere": "the Blackout Heart: a great sphere of archive machinery with concentric galleries and cooling "
                    "fins, glowing ember red from cracks",
    "faultline-gap": "a broken segment of the ring of relay machinery: two massive ends of dark ring structure with "
                     "lamps, separated by a jagged dark gap with dangling cables and debris",
    "lift-car": "an old freight lift car of chipped ivory panels and tarnished brass with round windows and a snapped "
                "cable on its roof",
    "cloud-bank": "a floating bank of the cloud sea: a big billowing cloud lit copper and rose by a low sun",
    "solar-array": "an old solar array wing on a spire-top mast: large dark blue panels in brass frames, some panels "
                   "broken, still turned to the sun",
    "bell-frame": "a huge violet glass bell hanging in a dark brass frame, glowing softly from within",
    "seal-lattice": "a node of the Seal's lattice: a black geometric lattice frame with thin glowing red seams and "
                    "clamps",
}

# ------------------------------------------------------------------------------------------------ weapons / drones (v2.2)
# Side view, facing RIGHT, at rest (lenses unlit or dim). Each weapon sits on a rail clamp mount (bottom) with a
# braided feed cable running into its back (left). Worn relay gear and maintenance tools, never a generic gun.
MOUNT = ("It sits on a small riveted brass rail-clamp mount at its base, and a braided copper feed cable runs into "
         "its back on the left.")
WEAPONS = {
    "packet-laser": "a salvaged relay signal lamp: a short brass drum housing with cooling fins, one teal glass lens under a hood at the front on the right, riveted clamp",
    "burst-emitter": "two relay signal lamps stacked on one yoke, ivory enamel chipped down to brass, twin teal glass lenses facing right, a shared feed box behind them",
    "triple-burst": "three small signal-lamp heads on a rotating ring yoke like a signal-lamp revolver, brass switch contacts on the ring, lenses facing right",
    "jumbo-frame": "a big old beacon lens of amber fresnel glass facing right in a heavy riveted iron frame on a trunnion",
    "jumbo-frame-ii": "a long frame carrying two big amber fresnel beacon lenses facing right, with a heavy counterweight at the back",
    "multicast-array": "a switchboard-like panel of twelve small glass lamp lenses in a grid on a tilting frame facing right, patch cables looping across its back",
    "jammer": "a squat transmitter box with a flared noise horn facing right, a violet induction coil on top and two whip antennas",
    "flood-cannon": "a long flared horn facing right with stacked violet induction coils along it and a finned cooling radiator",
    "fiber-lance": "a long glass rod in a brass sleeve with focusing collars, pointing right, ending in a faceted teal prism tip",
    "trunk-lance": "a thick bundle of glass rods bound in brass bands pointing right, a big faceted prism head, heat-blued steel collars",
    "payload-launcher": "a pneumatic slug thrower: an iron tube pointing right, a round compressed-air tank under it, a drum magazine of canisters wrapped in copper wire",
    "breach-spike": "a heavy spike driver: a piston cylinder with a long hardened steel spike pointing right and a compressed-air reservoir",
    "thermite-payload": "a short stubby mortar tube angled up to the right, a rack of glowing ember-hot canisters beside it, heat shields with ember warning chevrons",
    "scatter-shot": "a rivet scatter gun: a cluster of six short tubes pointing right, a rivet hopper on top, a crank handle on the side",
    "heartpulse-chain": "a clockwork pulse emitter: stacked brass rings around a core lamp facing right, a flywheel at the back",
    "cathedral-chime": "a violet glass bell-tube from the Glass Cathedral lying in a brass cradle, its mouth facing right, a small striker hammer above it",
}
HEAVY = {"jumbo-frame-ii", "multicast-array", "flood-cannon", "trunk-lance", "breach-spike", "cathedral-chime"}
DRONES = {
    "firewall-drone": "a ward picket drone: a small ivory disc body with a ring of charged ward wire around it and a tiny rotor on top",
    "relay-drone": "a relay repeater drone: a lamp-lens nose facing right, twin small rotors on top, a thin antenna",
    "rigger-drone": "a hull-mender drone: a squat ivory body on a rotor, a rivet arm reaching forward to the right, a spool of patch plates",
    "bulwark-drone": "an anti-drone picket drone: a brass guard cage around a small body, a net launcher facing right, a rotor on top",
    "crawler-drone": "a cable crawler drone: a small body with clamping legs and a cutter at the front on the right, built to latch onto a hull",
}


# ------------------------------------------------------------------------------------------------ docs/art-requests.md
def parse_requests(path=None):
    """Briefs from the writing workstream: {"events": {id: (stage, text)}, "portraits": {id: (stage, text)}}.
    Stage is 'shared', 'I', 'II' or 'III' from the section headings. Lettering requests are stripped (finals carry no
    text; the game draws any labels)."""
    import re
    from pathlib import Path
    path = Path(path or Path(__file__).resolve().parents[1] / "docs" / "art-requests.md")
    out = {"events": {}, "portraits": {}}
    stage, key, buf = "shared", None, []

    def flush():
        if key:
            grp, aid = key
            text = " ".join(" ".join(buf).split())
            # drop sign/lettering content: quoted capitals like "PELL · SALVAGE ..." or "LEAVE IT LIT"
            text = re.sub(r"\b[A-Z][A-Z0-9'\-]+(?:\s*[·,]?\s*[A-Z][A-Z0-9'\-]+)*\b(?<!\bI)", "", text)
            text = re.sub(r"\((?:e\.g\.)?\s*\)", "", text)
            text = re.sub(r"\s+([,.;:])", r"\1", text)
            text = re.sub(r"\s{2,}", " ", text).strip()
            for pat, rep in ((r"a column of numbers, and the words\.", "a column of scratched marks."),
                             (r"stencilled (?:Runbook )?lettering", "stencilled warning stripes"),
                             (r"old amber letters still showing the last departures", "rows of small dark amber indicator lamps"),
                             (r"a painted designation on the shell \(e\.g\. ?7-?\)", "painted stripes on the shell"),
                             (r"A name painted on the car is half legible\.", "Faded paint on the car."),
                             (r"a hand-painted sign", "a hanging sign board"),
                             (r"patched skiffs moored alongside", "patched skiffs (small cable cars) hanging from carriers alongside"),
                             (r"\(e\.g\.[^)]*\)", "")):
                text = re.sub(pat, rep, text)
            out[grp][aid] = (stage, text)

    for line in path.read_text().splitlines():
        m = re.match(r"^## .*Stage (I{1,3})\b", line)
        if m:
            flush(); key, buf = None, []
            stage = m.group(1)
            continue
        if line.startswith("## "):
            flush(); key, buf = None, []
            stage = "shared"
            continue
        m = re.match(r"^### `(events|portraits)/([a-z0-9-]+)`", line)
        if m:
            flush()
            key, buf = (m.group(1), m.group(2)), []
            continue
        if key and line.strip() and not line.startswith("---"):
            buf.append(line.strip())
    flush()
    return out


# ------------------------------------------------------------------------------------------------ hull parts (A2 kit)
# Component sprites for assembling lamplighter-pattern tenders (tools/art/assemble_hull.py). Every part: strict side
# view, facing RIGHT, lit from the upper left, the Reach-dock materials; painted alone on a flat backdrop and cut out.
# id -> (target size in hull image px (1 px = 1 backing px at TILE 72), brief). Body strips are six 72-px modules wide
# (roof strip on top, the plated wall, the keel strip below) and are sliced into modules by the assembler.
PARTS = {
    # shared
    "roof-plate": ((64, 18), "a low rectangular riveted brass hardpoint base plate for bolting equipment onto the roof "
                             "of a car, four heavy bolts, a raised rim, worn edges"),
    "belly-plate": ((64, 14), "a flat riveted brass hardpoint plate for the underside of a car, two hanging lugs with "
                              "bolt holes, worn dark bronze"),
    "roof-hatch": ((52, 22), "a small round-cornered pressure hatch lid on a car roof, riveted brass rim, a wheel "
                             "handle, chipped ivory lid"),
    "signal-lamp": ((18, 26), "a small electric signal lamp on a short brass bracket, a glowing teal glass lens in a "
                              "brass cage"),
    "antenna-mast": ((24, 76), "a slim brass antenna mast on a bolted foot, two small cross arms, a tiny amber tip lamp"),
    "rear-cap": ((56, 360), "the flat rear end of a pressurised cable car seen from the side: a narrow rounded end "
                            "cap of chipped ivory plates framed by riveted brass, a sealed gangway coupler hatch in the "
                            "middle with a heavy clamp, a small red marker lamp near the top"),
    "gangway-door": ((40, 92), "a narrow riveted gangway door with a small round window and a brass handle, chipped "
                               "ivory panels in a brass frame"),
    # body plating strips: roof strip (30 px), wall (288 or 360 px), keel strip (42 px); six modules each
    "body-4a": ((432, 360), "a straight side section of a long pressurised cable car body, six equal vertical panels "
                            "side by side: chipped ivory ceramic plates framed by riveted tarnished brass ribs, a "
                            "narrow brass roof rail along the top edge, a dark gunmetal keel strip with small tanks "
                            "along the bottom edge; the panels alternate plain riveted plates, round brass portholes "
                            "and verdigris pipe runs"),
    "body-4b": ((432, 360), "a straight side section of a long pressurised cable car body, six equal vertical panels "
                            "side by side: chipped ivory ceramic plates framed by riveted tarnished brass ribs, a "
                            "narrow brass roof rail along the top edge, a dark gunmetal keel strip along the bottom "
                            "edge; one panel is a riveted service door, one has a pair of small portholes, the others "
                            "are plain plates with strap seams and inspection covers"),
    "body-5a": ((432, 432), "a straight side section of a tall pressurised cable car body, six equal vertical panels "
                            "side by side, five decks high: chipped ivory ceramic plates framed by riveted tarnished "
                            "brass ribs, a narrow brass roof rail along the top edge, a dark gunmetal keel strip along "
                            "the bottom edge; round brass portholes, verdigris pipe runs, strap seams"),
    "body-5b": ((432, 432), "a straight side section of a tall pressurised cable car body, six equal vertical panels "
                            "side by side, five decks high: chipped ivory ceramic plates framed by riveted tarnished "
                            "brass ribs, a narrow brass roof rail along the top edge, a dark gunmetal keel strip along "
                            "the bottom edge; one riveted service door, inspection covers, dark gunmetal retrieval "
                            "shutters along the lowest deck"),
    # noses (the right end of the car)
    "nose-lamp": ((150, 360), "the rounded front end of a pressurised cable car, facing right: a bullet-shaped nose "
                              "of chipped ivory plates framed by riveted brass, a slanted amber-lit cab window high "
                              "up, and under it a big round glass guide lamp in a heavy brass ring glowing warm amber "
                              "at the nose tip, a dark gunmetal keel curving up underneath"),
    "nose-optical": ((150, 360), "the front end of a compact optical inspection cable car, facing right: a rounded "
                                 "nose of chipped ivory plates framed by riveted brass, a slanted amber-lit cab "
                                 "window high up, and a round glass lamp cupola at the nose tip with a violet-tinted "
                                 "lens ring, a dark gunmetal keel curving up underneath"),
    "nose-heavy": ((160, 432), "the blunt front end of a tall heavy cable car, facing right: a high flat-fronted "
                               "nose of chipped ivory plates framed by thick riveted brass, a wide cab window high "
                               "up, a round glass guide lamp glowing amber at the nose, dark gunmetal louvred "
                               "retrieval shutters below it, a heavy keel underneath"),
    # Glasswing G-04 fittings
    "collimators": ((104, 92), "two short brass collimator lens tubes mounted one above the other on a vertical brass "
                               "rail bracket, pointing right: the upper tube ends in a teal glass lens, the lower in an "
                               "amber lens, small lens caps hanging on chains"),
    "prism-housing": ((168, 96), "a faceted optical prism housing for a car roof: a low trapezoid cabin of violet and "
                                 "teal glass panes in a dark brass frame with two brass calibration rings, standing "
                                 "on a riveted base plate"),
    "survey-horns": ((64, 76), "two slim brass survey horns (trumpet-shaped acoustic horns) on short masts facing "
                               "left, on a small riveted base plate"),
    # Switchback S-08 fittings
    "drone-cradle": ((84, 96), "a U-shaped brass launch cradle bolted to a base plate, holding a parked compact "
                               "maintenance drone with a dark teal cylindrical body, a rotor hub on top and a small "
                               "teal lens"),
    "retrieval-crane": ((300, 124), "a jointed retrieval crane on a round roof turntable: a small gunmetal crane cab, "
                                    "a short knuckle arm and a long horizontal trussed brass jib pointing right, a "
                                    "hook hanging on a cable from the jib tip"),
    "heavy-drive": ((520, 100), "a heavy drive trolley seen from the side: two drive bogies, each with two grooved "
                                "brass sheaves on top, joined by one long riveted brass yoke beam, a boxy motor "
                                "housing in the middle, grip arms and two pairs of hanger struts going down"),
    # keel
    "keel-air-tanks": ((150, 42), "a row of three horizontal riveted air tanks in dark gunmetal slung under a car, "
                                  "with brass straps and a small valve"),
    "keel-ballast": ((150, 42), "a long ballast tank block in rusty dark gunmetal with riveted brass straps, slung "
                                "under a car"),
    "keel-lug": ((40, 30), "a heavy brass hanger lug with a bolt eye, bolted under a car"),
}
