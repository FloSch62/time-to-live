"""A1 pixel-art style study (design-audit-implementation.md §4 A1): prompts for the three test subjects.

Installed into specs.ASSETS under the group `study/`:  study/<subject>:<recipe>@N.

Subjects: `cr` (a Copper Reach regional background), `gc` (a Glass Cathedral regional background), `cm` (the Copper
Market event illustration, people visible).
Recipes (the Krea half; the post-process half lives in tools/art/pixelscene.py):
  cel      flat-shaded, hard-edged, limited-value graphic prompt, rendered at 4x the 640x360 grid (2560x1440);
           post-processed onto 640x360 (R1) or 480x270 (R2).
  pix8     explicit pixel-art prompt rendered at 8x the target grid, so Krea's pseudo-pixel (its 8 px latent cell)
           IS the art pixel: 3840x2160 -> 480x270 (R3a).
  pix8w    the same prompt at 5120x2880 -> 640x360 (R3b).
Events: 2560x1280 (cel/pix8 -> 320x160 art px, 2 backing px each) and 1280x640 (pix8 -> 160x80, the 4x grid).
"""

STUDY_NEG = ("No text, no letters, no numbers, no writing, no signs, no logo, no watermark, no signature, no border, no "
             "frame, no interface. No aircraft, no flying ships, no spaceships, no birds, no planets, no moon, no water, "
             "no sea, no boats, no sails. No swords, no torches, no open flames, no medieval props, no fantasy "
             "creatures, no faces on machines. Not cartoon, not chibi, not cute, no bright saturated candy colours.")

# ---------------------------------------------------------------------------------------------------- style heads
PIX_SCENE = ("A masterfully hand-crafted pixel art background for a modern side-scrolling game, in the tradition of "
             "the environment art of Eastward, The Last Night, Sea of Stars and Blasphemous: crisp deliberate pixel "
             "clusters on a strict square pixel grid, a restrained palette of about thirty colours arranged in "
             "hue-shifted ramps (shadows cool indigo and violet, lights warm amber), clean readable silhouettes layered "
             "in four depth planes with atmospheric perspective (far planes paler, bluer and lower in contrast, near "
             "planes dark), the sky a smooth gradient in clean horizontal bands with a little ordered dithering, no "
             "noise, no grain, no blur, no painterly texture.")
PIX_EVENT = ("A masterfully hand-crafted pixel art scene illustration for a modern story-driven game, in the tradition "
             "of Eastward, The Last Night and Sea of Stars: crisp deliberate pixel clusters on a strict square pixel "
             "grid, a restrained palette of about thirty colours in hue-shifted ramps (shadows cool indigo, lights "
             "warm amber), clean readable silhouettes, small expressive pixel figures, no noise, no grain, no blur, "
             "no painterly texture. A wide 2:1 composition filling the frame edge to edge.")
CEL_SCENE = ("A clean flat-colour graphic illustration for a side-scrolling game background, like a limited-palette "
             "screen print or a vector poster: large flat shapes of solid colour with hard crisp edges, only three or "
             "four values per material, no texture, no brushstrokes, no noise, no speckle, no gradients except a "
             "smooth banded sky, simple bold geometric machinery silhouettes with a few crisp highlight lines, strong "
             "atmospheric depth in four layered planes, each plane flatter, paler and bluer with distance.")
CEL_EVENT = ("A clean flat-colour graphic illustration for a story-driven game, like a limited-palette screen print: "
             "large flat shapes of solid colour with hard crisp edges, only three or four values per material, no "
             "texture, no brushstrokes, no noise, simple bold silhouettes and small clear human figures. A wide 2:1 "
             "composition filling the frame edge to edge.")

# ---------------------------------------------------------------------------------------------------- subjects
MOOD = "Melancholy, solemn, quiet and a little hopeful."
CR = ("The view from a cable car at the edge of space over the Copper Reach at dusk. Along the top fifth: the underside "
      "of a colossal ring of machinery spanning the whole width, dark riveted plates of verdigris-green copper and "
      "rust, girder trusses, a sparse row of tiny warm amber lamps, a few loops of green copper cable hanging down. "
      "The middle band of the picture, from a quarter to three fifths of its height, is calm open deep indigo sky with "
      "a few small stars and nothing else. Along the bottom third: a sea of clouds far below, lit copper and rose by a "
      "low sun on the horizon, with slender dark relay spires rising out of the clouds, their tops crowned with "
      "stacked rusty shipping containers, lattice cranes and one or two tiny warm lit windows; heavy braided carrier "
      "cables, thick and green with verdigris, sag in long catenary curves from spire top to spire top. Distant "
      "spires and cables are pale and hazy, the nearest spire a dark silhouette at one side. Small warm lamps against "
      "vast cold machinery. " + MOOD)
GC = ("The view from a cable car at the edge of space under the Glass Cathedral at night. Along the top fifth: the "
      "underside of the ring turned into a range of glass architecture spanning the whole width, pointed naves, domes "
      "and flying buttresses of violet optical glass in dark brass frames, softly glowing from within, frost on the "
      "panes, and a row of great violet glass bells hanging beneath in brass yokes. The middle band of the picture, "
      "from a quarter to three fifths of its height, is calm open deep indigo-violet sky with faint small stars and "
      "nothing else. Along the bottom third: a violet-lit cloud sea far below with slender dark spires rising out of "
      "it, thin pale veils of violet glass fog pouring down from the ring far away, a heavy braided carrier cable "
      "sagging in a long curve between two spire tops, one tiny warm amber window on the nearest spire. Cold, "
      "beautiful and eerie. " + MOOD)
CM = ("The Copper Market at dusk: a tall tower of rusty green and orange shipping containers welded together on top of "
      "a relay spire high above the cloud sea, stalls with small awnings on every landing, strings of warm amber "
      "relay lamps, ladders and gangways between the landings, a lattice crane at the top lifting a container like a "
      "lift, and two small patched cable cars hanging from their trolleys on heavy braided cables that sag past the "
      "tower. Several small human figures, people in long worn ivory work coats, dark caps and small amber chest "
      "lamps, stand at the stalls and walk the gangways, trading bundles of cable and salvaged parts. Deep indigo "
      "sky with faint stars above, a copper-lit cloud sea below. Busy, warm and a little funny against the cold "
      "machinery around it.")

# Round 2 (after the first in-game check): the dusk sky was too pale behind the ivory hulls and a big spire sat under
# the tender. Night values, the warm glow only as a thin horizon line, landmarks in the outer thirds, the centre open.
NIGHT = ("Deep night at the edge of space: the upper two thirds of the sky are deep indigo-black with small sparse "
         "stars, darkening upward; the only warm light in the sky is a thin copper-rose glow along the far horizon "
         "just above the cloud sea. The picture stays dark and low in contrast, like a quiet night scene behind the "
         "action of a game.")
LAYOUT = ("Composition for a game backdrop: the tallest, nearest spires stand in the left third and the right third "
          "of the picture; the centre of the lower half is open cloud sea with only small, pale, distant spires; the "
          "horizon of the cloud sea lies at about three quarters of the height.")
CR_N = ("The view from a cable car over the Copper Reach at the edge of space. Along the top sixth: the underside of a "
        "colossal ring of machinery spanning the whole width, dark riveted plates of verdigris-green copper and rust, "
        "girder trusses, a sparse row of tiny warm amber lamps, a few loops of green copper cable hanging down. The "
        "middle band, from a fifth to three fifths of the height, is calm open night sky with nothing in it. Below: "
        "a sea of clouds far below, dim slate blue with copper-rose light on the cloud tops near the horizon; slender "
        "dark relay spires rise out of it, their tops crowned with stacked rusty shipping containers, lattice cranes "
        "and one or two tiny warm lit windows; heavy braided carrier cables, green with verdigris, sag in long "
        "catenary curves from spire top to spire top. Distant spires and cables pale and hazy. Small warm lamps "
        "against vast cold machinery. " + MOOD)
GC_N = ("The view from a cable car under the Glass Cathedral at the edge of space. Along the top sixth: the underside "
        "of the ring turned into glass architecture spanning the whole width, pointed naves, domes and flying "
        "buttresses of violet optical glass in dark brass frames, glowing faintly from within, frost on the panes, "
        "and a row of great violet glass bells hanging beneath in brass yokes. The middle band, from a fifth to three "
        "fifths of the height, is calm open night sky with nothing in it. Below: a violet-lit cloud sea far below; "
        "slender dark spires with small glass lanterns rise out of it; thin pale veils of violet glass fog pour down "
        "from the ring far away; heavy braided carrier cables sag in long curves between spire tops; one tiny warm "
        "amber window on the nearest spire. Cold, beautiful and eerie. " + MOOD)

# Round 3: the night/layout prompt dropped the carriers (seeds 980868189, 607726298), which are the world's key
# element; the copper horizon leaked into the Glass Cathedral; the horizon at 3/4 hid behind the relay/combat panels.
NIGHT3 = ("Deep night at the edge of space: the upper two thirds of the sky are deep indigo-black with small sparse "
         "stars, darkening upward; the only light in the sky is a thin glow along the far horizon just above the "
         "cloud sea, in the colour of the region. The picture stays dark and low in contrast, like a quiet night "
         "scene behind the action of a game.")
LAYOUT3 = ("Composition for a game backdrop: the tallest, nearest spires stand in the left third and the right third "
          "of the picture; the centre of the lower half is open cloud sea with only small, pale, distant spires; the "
          "horizon of the cloud sea lies at about two thirds of the height, just below the vessels.")
CR_C = ("The view from a cable car over the Copper Reach at the edge of space. Along the top sixth: the underside of a "
        "colossal ring of machinery spanning the whole width, dark riveted plates of verdigris-green copper and rust, "
        "girder trusses, a sparse row of tiny warm amber lamps, a few loops of green copper cable hanging down. The "
        "middle band, from a fifth to three fifths of the height, is calm open night sky with nothing in it. Below: "
        "a sea of clouds far below, dim slate blue with copper-rose light on the cloud tops and a thin copper-rose "
        "horizon glow; slender "
        "dark relay spires rise out of it, their tops crowned with stacked rusty shipping containers, lattice cranes "
        "and one or two tiny warm lit windows; heavy braided carrier cables, green with verdigris, sag in long "
        "catenary curves from spire top to spire top. Distant spires and cables pale and hazy. Small warm lamps "
        "against vast cold machinery. " + MOOD)
GC_C = ("The view from a cable car under the Glass Cathedral at the edge of space. Along the top sixth: the underside "
        "of the ring turned into glass architecture spanning the whole width, pointed naves, domes and flying "
        "buttresses of violet optical glass in dark brass frames, glowing faintly from within, frost on the panes, "
        "and a row of great bells of translucent violet glass (not metal) hanging beneath in brass yokes, faintly lit "
        "from inside. The middle band, from a fifth to three fifths of the height, is calm open night sky with "
        "nothing in it; the horizon glow is cold pale violet and teal, never orange. Below: a violet-lit cloud sea "
        "far below; "
        "slender dark relay spires of machinery (antenna masts and optical relay housings, not churches) with small "
        "glass lanterns rise out of it; thin pale veils of violet glass fog pour down "
        "from the ring far away; heavy carrier cables, optical trunks sheathed in dark braid with faint violet glass "
        "glinting through, sag in long curves between spire tops; one tiny warm "
        "amber window on the nearest spire. Cold, beautiful and eerie. " + MOOD)

CARRIERS = ("Most important: two or three enormous braided carrier cables, each as thick as a lift car, dark and "
            "with a thin rim of light along their tops, sag in deep catenary curves across the lower "
            "half of the picture from the crown of the left spire to the crown of the right spire and on to more "
            "distant spires, always below the middle band of sky.")


def install(assets):
    def add(sid, size, versions, n=3):
        assets[f"study/{sid}"] = {"size": size, "gen": (2560, 1440), "n": n, "versions": versions}

    for sid, text in (("cr", CR), ("gc", GC)):
        add(sid, (640, 360), {
            "cel": {"prompt": f"{CEL_SCENE} {text} {STUDY_NEG}", "gen": (2560, 1440)},
            "pix8": {"prompt": f"{PIX_SCENE} {text} {STUDY_NEG}", "gen": (3840, 2160)},
            "pix8w": {"prompt": f"{PIX_SCENE} {text} {STUDY_NEG}", "gen": (5120, 2880), "n": 2},
        })
    for sid, text in (("cr", CR_N), ("gc", GC_N)):
        assets[f"study/{sid}"]["versions"]["pix8n"] = {
            "prompt": f"{PIX_SCENE} {NIGHT} {LAYOUT} {text} {STUDY_NEG}", "gen": (5120, 2880), "n": 2}
    for sid, text in (("cr", CR_C), ("gc", GC_C)):
        assets[f"study/{sid}"]["versions"]["pix8c"] = {
            "prompt": f"{PIX_SCENE} {NIGHT3} {LAYOUT3} {CARRIERS} {text} {STUDY_NEG}", "gen": (5120, 2880), "n": 2}
    add("cm", (320, 160), {
        "cel": {"prompt": f"{CEL_EVENT} {CM} {STUDY_NEG}", "gen": (2560, 1280)},
        "pix8": {"prompt": f"{PIX_EVENT} {CM} {STUDY_NEG}", "gen": (2560, 1280)},
        "pix8s": {"prompt": f"{PIX_EVENT} {CM} {STUDY_NEG}", "gen": (1280, 640)},
        # 8 px lattice at 3 backing px per art px (the 640x360 grid) inside the 640x320 frame: 214x106 -> 213x106
        "pix8m": {"prompt": f"{PIX_EVENT} {CM} {STUDY_NEG}", "gen": (1712, 848), "n": 2},
    })
