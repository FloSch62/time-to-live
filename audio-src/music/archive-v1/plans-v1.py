"""TIME TO LIVE score plans: one ABC plan per piece, rendered by YuE2 in one or more versions.

Every piece is a list of four-bar sections (chords + one Ins line per bar, L:1/32, every bar exactly 32 units) arranged
by a form. An area theme is rendered twice from the SAME plan (same key, BPM, chords, bar count, form): `explore` with a
calm style text and `battle` with a driving one; the battle version may replace a section's Ins line with a denser
rhythm on the same chords (`over`). Both takes are then conformed to the plan's exact bar grid (tools/conform.py), so
bar N starts at the same sample in both files and the game can crossfade them in sync, FTL-style. event-horizon is
rendered in three versions (custody / emergency / horizon), the boss phases, the same way.

Form: `intro` sections come before the loop, then the loop body, then `tail` (ring-out bars after loopEnd).
loopStart = first bar after the intro; loopEnd = first tail bar. The last loop section ends on the chord that the intro
ends on (usually the dominant), so the jump loopEnd -> loopStart repeats the intro's harmonic move into the body.

Block labels are non-vocal only (intro / instrumental / interlude / outro): YuE2 plans singing for verse/chorus/bridge
(faultline .work/lore/score/README.md, round 3). No voice words in the style texts; CFG pushes away from NEGATIVE.

Usage: python plans.py            -> check every plan, print a summary
       python plans.py <id> [ver] -> print the ABC of one version"""
import hashlib, re, sys

NOTE = re.compile(r"[=^_]*[A-Ga-gz][,']*(\d*)")
NEGATIVE = ("Vocals, a singer singing lyrics, sung words, spoken words, speech, narration, voice-over, rap, whispering, "
            "choir singing words, a solo voice, pop song with a lead vocalist. Generic EDM club dance track with a "
            "four-on-the-floor techno kick.")
SUFFIX = " Purely instrumental."

# ------------------------------------------------------------------------------------------------ style vocabulary
EXPLORE = ("Retro-cinematic space exploration soundtrack for a pixel-art starship game. Warm analog synthesizer "
           "arpeggios, a soft pulsing sequenced bass, lush evolving synth pads, spacious reverb")
BATTLE = ("Retro-cinematic space battle soundtrack for a pixel-art starship game. Fast driving analog synthesizer "
          "arpeggios, a pulsing sequenced bass, punchy live drums and big toms, a tense string ostinato, spacious reverb")
S1 = "a clean electric guitar melody, felt piano, cello, faint glass bells and a soft ticking pulse like a blinking lamp"
S2 = "violet glass mallets, celesta, harp and glass bells, felt piano and cello"
S3 = "low brass, deep ember drones, urgent strings, cello, felt piano and a steady heartbeat pulse"


def style(core, colour, scene, mood):
    return f"{core}, {colour}. {scene} {mood}"


# ------------------------------------------------------------------------------------------------ helpers
def sec(chords, bars):
    chords = chords.split() if isinstance(chords, str) else chords
    assert len(chords) == len(bars) == 4, (chords, bars)
    return (chords, list(bars))


def pads(chords, notes):
    """Four half-note pairs: soft sustained material."""
    return sec(chords, [f"{a}16 {b}16" for a, b in notes])


def eighths(chords, pats):
    """Four bars of eighth-note drive, one 8-note pattern per bar."""
    return sec(chords, [" ".join(f"{n}4" for n in p.split()) for p in pats])


def quarters(chords, pats):
    return sec(chords, [" ".join(f"{n}8" for n in p.split()) for p in pats])


def wholes(chords, notes):
    return sec(chords, [f"{n}32" for n in notes.split()])


# ================================================================================================ PIECES
P = {}

# ---------------------------------------------------------------- title: "Time to Live", the main theme (D minor, 96)
TTL1 = sec("Dm F C Bb", ["D12 E4 F8 A8", "c16 A8 F8", "G12 F4 E8 C8", "D24 F8"])
TTL2 = sec("Gm Dm Bb A", ["G12 A4 B8 d8", "f16 e8 d8", "d12 c4 B8 A8", "A32"])
P["title"] = dict(
    key="Dm", bpm=96, stage=0, kind="single",
    sections=dict(
        intro=sec("Dm Dm Bb A", ["D32", "F32", "D32", "^C32"]),
        T1=TTL1, T2=TTL2,
        A1=quarters("Dm Bb F C", ["D F A F", "B, D F D", "F A c A", "C E G E"]),
        A2=quarters("Gm Dm Bb A", ["G, B, D B,", "D F A F", "B, D F D", "A, ^C E ^C"]),
        B1=sec("Bb F C Dm", ["B8 d8 f16", "a24 f8", "g12 e4 c16", "d24 f8"]),
        B2=sec("Bb F C A", ["B8 d8 f8 b8", "a16 f16", "g12 f4 e8 c8", "^c16 e16"]),
        Q1=wholes("Dm F C Bb", "A A G F"),
        Q2=wholes("Gm Dm Bb A", "G F F E")),
    # rev 2 (after hold 1): the loop's last section (A2) repeats an earlier one, so the loop runs bars 20-60 and its
    # seam joins the same music (rev 1 ended on the quiet Q2 and looped back after the soft intro: +8 dB seam jump).
    form=[("intro", "intro"), ("T1", "intro"), ("T2", "intro"), ("A1", "instrumental"), ("A2", "instrumental"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("B1", "instrumental"), ("B2", "instrumental"),
          ("Q1", "interlude"), ("Q2", "interlude"), ("T1", "instrumental"), ("T2", "instrumental"),
          ("A1", "interlude"), ("A2", "interlude")],
    takes_from=4,
    tail=("Dm Dm", ["D32", "D32"]),
    versions=dict(main=dict(style=(
        "Main title theme of a retro-cinematic pixel-art starship game about a lone relay tender flying the dark "
        "outside of a ring of relays above the clouds. A soft ticking pulse like a blinking lamp and a felt piano "
        "state a melancholic, hopeful minor-key theme over warm analog synth pads; warm analog synthesizer arpeggios "
        "and a gentle sequenced bass join, then the theme returns on a clean electric guitar and a singing synth lead "
        "with cello, strings and glass bells, rising to a wide, heroic, bittersweet statement, and settles back to "
        "the piano and the lamp pulse. Spacious reverb, melodic and cinematic.")),
    ),
    use="title screen (single)",
)

# ---------------------------------------------------------------- relay-seven: the prologue (D minor, 80)
P["relay-seven"] = dict(
    key="Dm", bpm=80, stage=0, kind="single",
    sections=dict(
        intro=sec("Dm Dm Bb A", ["A32", "A32", "F32", "E32"]),
        P1=TTL1, P2=TTL2,
        L1=pads("Dm Bb F C", [("a", "a"), ("a", "a"), ("a", "a"), ("g", "g")]),
        L2=pads("Gm Dm Bb A", [("g", "g"), ("f", "f"), ("f", "d"), ("e", "^c")]),
    ),
    form=[("intro", "intro"), ("P1", "intro"), ("P2", "intro"), ("L1", "interlude"), ("L2", "interlude"),
          ("P1", "instrumental"), ("P2", "instrumental"), ("L1", "interlude"), ("L2", "interlude"),
          ("P1", "instrumental"), ("P2", "instrumental")],
    tail=("Dm Dm", ["D32", "D32"]),
    versions=dict(main=dict(style=(
        "Intimate, quiet prologue music in an old switchboard room at a lonely relay station above the clouds, late "
        "at night. A soft felt piano plays a tender, melancholic minor-key theme over a warm analog synth pad; the "
        "quiet steady tick of an old relay and a faint high pulse like a blinking amber lamp; a solo cello answers, "
        "glass bells far away. Sparse, patient, warm and lonely, with a small hope. Spacious reverb, no drums.")),
    ),
    use="prologue at Relay Seven (single)",
)

# ---------------------------------------------------------------- copper-reach: Stage I theme A (D minor, 110)
CR_A1 = sec("Dm Bb F C", ["A8 d8 e8 f8", "f12 e4 d16", "c8 A8 c8 f8", "e24 d8"])
CR_A2 = sec("Gm Bb Gm A", ["g12 f4 e8 d8", "f12 d4 B16", "d8 B8 G8 B8", "A8 ^c8 e16"])
P["copper-reach"] = dict(
    key="Dm", bpm=110, stage=1, kind="pair",
    sections=dict(
        intro=pads("Dm Bb C A", [("D", "A"), ("D", "F"), ("E", "G"), ("^C", "E")]),
        A1=CR_A1, A2=CR_A2,
        G1=pads("Dm C Bb A", [("D", "A"), ("C", "G"), ("B,", "F"), ("A,", "E")]),
        G2=quarters("Dm C Bb A", ["D F A d", "C E G c", "B, D F B", "A, ^C E A"]),
        B1=sec("Bb C Dm Dm", ["f16 g8 f8", "e16 c16", "d24 f8", "a32"]),
        B2=sec("Bb C A A", ["b16 a8 g8", "g16 e16", "f12 e4 ^c16", "e32"]),
        R1=wholes("Bb F C Dm", "d c e f"),
        R2=wholes("Bb F Gm A", "d c B ^c"),
    ),
    form=[("intro", "intro"),
          ("A1", "instrumental"), ("A2", "instrumental"), ("G1", "instrumental"), ("G2", "instrumental"),
          ("B1", "instrumental"), ("B2", "instrumental"), ("A1", "instrumental"), ("A2", "instrumental"),
          ("R1", "interlude"), ("R2", "interlude"), ("B1", "instrumental"), ("B2", "instrumental"),
          ("A1", "instrumental"), ("A2", "instrumental"), ("G1", "instrumental"), ("G2", "instrumental")],
    tail=("Dm Dm", ["D32", "D32"]),
    versions=dict(
        explore=dict(style=style(EXPLORE, S1, "Drifting past a rusted kingdom of copper relays and green cables "
                                 "above the clouds.", "Calm, lonely, adventurous and hopeful.")),
        battle=dict(style=style(BATTLE, "a bold clean electric guitar and synth lead melody, felt piano, cello and "
                                "glass bells", "A fight among rusted copper relays above the clouds.",
                                "Urgent, heroic and melodic, cinematic energy."),
                    over=dict(
                        G1=eighths("Dm C Bb A", ["D D A D d D A D", "C C G C c C G C", "B, B, F B, B B, F B,",
                                                 "A, A, E A, A A, ^C E"]),
                        G2=eighths("Dm C Bb A", ["D F A d A F D F", "C E G c G E C E", "B, D F B F D B, D",
                                                 "A, ^C E A E ^C A, ^C"]),
                        R1=eighths("Bb F C Dm", ["B, B, B, B, B, B, B, B,", "F, F, F, F, F, F, F, F,",
                                                 "C C C C C C C C", "D D D D D D D D"]),
                        R2=eighths("Bb F Gm A", ["B, B, B, B, d d d d", "F, F, F, F, c c c c",
                                                 "G, G, G, G, B B B B", "A, A, ^C ^C E E A A"]))),
    ),
    use="Stage I map + combat (pair)",
)

# ---------------------------------------------------------------- rust-kingdom: Stage I theme B (A minor, 102)
P["rust-kingdom"] = dict(
    key="Am", bpm=102, stage=1, kind="pair",
    sections=dict(
        intro=pads("Am F G E", [("A", "e"), ("A", "c"), ("B", "d"), ("^G", "B")]),
        R1=sec("Am F C G", ["A8 c8 e12 d4", "c16 A16", "G8 c8 e8 g8", "d16 B16"]),
        R2=sec("Am F E E", ["A8 c8 e12 a4", "a12 g4 f16", "e12 d4 c8 B8", "^G8 B8 e16"]),
        H1=pads("Am Am G G", [("A,", "E"), ("A,", "C"), ("G,", "D"), ("G,", "B,")]),
        H2=pads("F F E E", [("F,", "C"), ("F,", "A,"), ("E,", "B,"), ("E,", "^G,")]),
        S1=sec("C G Am Em", ["g24 e8", "d24 B8", "c16 e16", "B32"]),
        S2=sec("F C Dm E", ["a24 f8", "g24 e8", "f12 e4 d16", "^g32"]),
        W1=wholes("F G Am Am", "c d e e"),
        W2=wholes("F G E E", "c d B ^G"),
    ),
    form=[("intro", "intro"),
          ("R1", "instrumental"), ("R2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental"),
          ("S1", "instrumental"), ("S2", "instrumental"), ("R1", "instrumental"), ("R2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("S1", "instrumental"), ("S2", "instrumental"),
          ("R1", "instrumental"), ("R2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental")],
    tail=("Am Am", ["A32", "A32"]),
    versions=dict(
        explore=dict(style=style(EXPLORE, "a low cello melody, clean electric guitar, felt piano, soft metallic "
                                 "clockwork ticks and faint glass bells", "Slow cranes still moving over stacked "
                                 "containers in a rusted kingdom at the edge of space.",
                                 "Mysterious, proud, weathered and warm.")),
        battle=dict(style=style(BATTLE, "heavy metal percussion and taiko, a gritty analog bass, a bold cello and "
                                "clean electric guitar theme, low brass", "A fight among cranes and rusted containers "
                                "at the edge of space.", "Weighty, determined and melodic, cinematic energy."),
                    over=dict(
                        H1=eighths("Am Am G G", ["A, A, E A, A, A, E A,", "A, A, E A, c A, E A,",
                                                 "G, G, D G, G, G, D G,", "G, G, D G, B, G, D G,"]),
                        H2=eighths("F F E E", ["F, F, C F, F, F, C F,", "F, F, C F, A, F, C F,",
                                               "E, E, B, E, E, E, B, E,", "E, E, B, E, ^G, E, B, E,"]),
                        W1=eighths("F G Am Am", ["F, F, F, F, F, F, F, F,", "G, G, G, G, G, G, G, G,",
                                                 "A, A, A, A, A, A, A, A,", "A, A, A, A, c c c c"]),
                        W2=eighths("F G E E", ["F, F, F, F, A A A A", "G, G, G, G, B B B B",
                                               "E, E, E, E, ^G ^G ^G ^G", "E, E, ^G ^G B B e e"]))),
    ),
    use="Stage I map + combat (pair)",
)

# ---------------------------------------------------------------- exchange: the Salvage Exchange (F major, 100)
P["exchange"] = dict(
    key="F", bpm=100, stage=0, kind="single",
    sections=dict(
        intro=pads("F Dm Gm C", [("F", "c"), ("D", "A"), ("G", "B"), ("E", "G")]),
        M1=sec("F Dm Gm C", ["F4 A4 c4 A4 f8 e8", "d4 c4 A4 F4 A8 d8", "B4 A4 G4 B4 d8 c8", "c4 B4 A4 G4 E8 C8"]),
        M2=sec("F Dm Bb C", ["F4 A4 c4 A4 f8 a8", "g4 f4 e4 d4 c8 A8", "B4 d4 f4 d4 c8 B8", "G8 E8 C16"]),
        V1=pads("F Dm Gm C", [("F", "C"), ("D", "A,"), ("G,", "D"), ("C", "G,")]),
        V2=pads("F Dm Bb C", [("F", "A"), ("D", "F"), ("B,", "D"), ("C", "E")]),
        B1=quarters("Bb C Am Dm", ["f d B d", "e c G c", "c A E A", "d A F A"]),
        B2=sec("Gm C F C", ["B8 G8 D8 G8", "c8 E8 G8 c8", "f16 c16", "G8 E8 C16"]),
    ),
    form=[("intro", "intro"),
          ("M1", "instrumental"), ("M2", "instrumental"), ("V1", "interlude"), ("V2", "interlude"),
          ("B1", "instrumental"), ("B2", "instrumental"), ("M1", "instrumental"), ("M2", "instrumental"),
          ("V1", "interlude"), ("V2", "interlude"), ("B1", "instrumental"), ("B2", "instrumental")],
    tail=("F F", ["F32", "F32"]),
    versions=dict(main=dict(style=(
        "Warm, playful and slightly comic shop music for a salvage market run by old scavengers in a pixel-art "
        "starship game. Bouncy plucked clean electric guitar and marimba, pizzicato strings, a walking upright bass, "
        "brushed drums, a cheeky analog synth lead and a clarinet trading the tune, warm analog pads, a little "
        "clockwork tick. Cozy, friendly, wry and unhurried. Retro-cinematic, spacious.")),
    ),
    use="store / Copper Market (single)",
)

# ---------------------------------------------------------------- iron-regent: Guardian I (D minor, 120)
P["iron-regent"] = dict(
    key="Dm", bpm=120, stage=1, kind="single",
    sections=dict(
        intro=sec("Dm Dm Bb A", ["D,32", "D,32", "B,,32", "A,,16 A,16"]),
        T1=sec("Dm Dm Bb C", ["D8 A8 d12 c4", "d8 e8 f8 d8", "f12 e4 d8 B8", "e24 c8"]),
        T2=sec("Dm Dm Gm A", ["D8 A8 d12 e4", "f8 e8 d8 A8", "B12 A4 G8 B8", "A8 ^c8 e16"]),
        R1=eighths("Dm C Bb A", ["D D D A, D D F D", "C C C G, C C E C", "B, B, B, F, B, B, D B,",
                                 "A, A, A, E, A, A, ^C A,"]),
        R2=eighths("Dm C Bb A", ["D D A, D F D A, D", "C C G, C E C G, C", "B, B, F, B, D B, F, B,",
                                 "A, A, E, A, ^C E A, ^C"]),
        S1=sec("Gm Bb F C", ["d16 g16", "f24 d8", "c16 f16", "e32"]),
        S2=sec("Gm Bb A A", ["g16 b16", "a16 f16", "e12 f4 e8 ^c8", "e32"]),
        W1=quarters("Bb F C Dm", ["B, B, B, B,", "F, F, F, F,", "C C C C", "D D D D"]),
        W2=eighths("Bb F Gm A", ["B, B, B, B, B, B, B, B,", "F, F, F, F, F, F, F, F,",
                                 "G, G, G, G, G, G, G, G,", "A, A, A, A, ^C ^C E E"]),
    ),
    form=[("intro", "intro"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("R1", "instrumental"), ("R2", "instrumental"),
          ("S1", "instrumental"), ("S2", "instrumental"), ("T1", "instrumental"), ("T2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("S1", "instrumental"), ("S2", "instrumental"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("R1", "instrumental"), ("R2", "instrumental")],
    tail=("Dm Dm", ["D32", "D32"]),
    versions=dict(main=dict(style=(
        "Epic retro-cinematic boss battle music for a pixel-art starship game: a colossal crowned gate machine of "
        "armoured iron and tarnished brass blocks the way. Pounding live drums, taiko and big toms, a relentless "
        "pulsing analog bass and synthesizer arpeggio ostinato, massive low brass chords, a commanding horn and "
        "clean electric guitar theme doubled by strings, glass bells ringing over it. Regal, heavy, stern and heroic, "
        "melodic and cinematic, spacious reverb.")),
    ),
    use="Guardian I (single, battle)",
)

# ---------------------------------------------------------------- glass-cathedral: Stage II theme A (A minor, 96)
P["glass-cathedral"] = dict(
    key="Am", bpm=96, stage=2, kind="pair",
    sections=dict(
        intro=pads("Am Em F E", [("e", "a"), ("e", "g"), ("c", "a"), ("B", "^g")]),
        G1=sec("Am Em F C", ["a8 e8 c'8 b8", "g16 e16", "f8 a8 c'8 a8", "g24 e8"]),
        G2=sec("Dm Am E E", ["f8 a8 d'8 c'8", "c'16 a16", "b12 a4 ^g8 e8", "^g32"]),
        H1=quarters("Am F C G", ["A e a e", "F c f c", "C G c G", "G, D G D"]),
        H2=quarters("Am F E E", ["A e a e", "F c f c", "E B e B", "E ^G B e"]),
        L1=sec("F G Em Am", ["A16 c16", "B16 d16", "e24 g8", "a32"]),
        L2=sec("Dm Em F E", ["f16 a16", "g16 e16", "f12 e4 c16", "B32"]),
        W1=wholes("F G Am Am", "c d e e"),
        W2=wholes("F G E E", "c d B ^G"),
    ),
    form=[("intro", "intro"),
          ("G1", "instrumental"), ("G2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental"),
          ("L1", "instrumental"), ("L2", "instrumental"), ("G1", "instrumental"), ("G2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("L1", "instrumental"), ("L2", "instrumental"),
          ("G1", "instrumental"), ("G2", "instrumental")],
    tail=("Am Am", ["A32", "A32"]),
    versions=dict(
        explore=dict(style=style(EXPLORE, S2, "Inside a vast cathedral of violet optical glass whose panes ring "
                                 "softly as light passes.", "Luminous, strange, sad and beautiful.")),
        battle=dict(style=style(BATTLE, "fast violet glass mallet and harp ostinati, celesta, glass bells, felt piano "
                                "and a soaring cello and synth lead", "A fight inside a vast cathedral of violet "
                                "glass that rings with every hit.", "Tense, graceful and melodic, cinematic energy."),
                    over=dict(
                        H1=eighths("Am F C G", ["A c e a e c A c", "F A c f c A F A", "C E G c G E C E",
                                                "G, B, D G D B, G, B,"]),
                        H2=eighths("Am F E E", ["A c e a e c A c", "F A c f c A F A", "E ^G B e B ^G E ^G",
                                                "E ^G B e ^g e B ^G"]),
                        W1=eighths("F G Am Am", ["F, F, F, F, F, F, F, F,", "G, G, G, G, G, G, G, G,",
                                                 "A, A, A, A, A, A, A, A,", "A, A, A, A, c c c c"]),
                        W2=eighths("F G E E", ["F, F, F, F, A A A A", "G, G, G, G, B B B B",
                                               "E, E, E, E, ^G ^G ^G ^G", "E, E, ^G ^G B B e e"]))),
    ),
    use="Stage II map + combat (pair)",
)

# ---------------------------------------------------------------- choir-weather: Stage II theme B (E minor, 104)
P["choir-weather"] = dict(
    key="Em", bpm=104, stage=2, kind="pair",
    sections=dict(
        intro=pads("Em C Am B", [("B", "e"), ("c", "e"), ("c", "e"), ("^d", "f")]),
        W1=sec("Em C G D", ["B8 e8 g12 f4", "e24 B8", "d8 g8 b12 a4", "a16 f16"]),
        W2=sec("Em C Am B", ["g12 f4 e8 B8", "c24 e8", "e12 d4 c8 A8", "^d16 f16"]),
        X1=pads("Em Em C C", [("E", "B"), ("E", "G"), ("C", "G"), ("C", "E")]),
        X2=pads("Am Am B B", [("A,", "E"), ("A,", "C"), ("B,", "F"), ("B,", "^D")]),
        Y1=sec("C D Bm Em", ["g16 e16", "f16 a16", "b24 f8", "g32"]),
        Y2=sec("Am C B B", ["a16 e16", "g16 e16", "f12 e4 ^d16", "f32"]),
        Z1=wholes("C D Em Em", "e f g g"),
        Z2=wholes("C D B B", "e f ^d B"),
    ),
    form=[("intro", "intro"),
          ("W1", "instrumental"), ("W2", "instrumental"), ("X1", "instrumental"), ("X2", "instrumental"),
          ("Y1", "instrumental"), ("Y2", "instrumental"), ("W1", "instrumental"), ("W2", "instrumental"),
          ("Z1", "interlude"), ("Z2", "interlude"), ("Y1", "instrumental"), ("Y2", "instrumental"),
          ("W1", "instrumental"), ("W2", "instrumental"), ("X1", "instrumental"), ("X2", "instrumental")],
    tail=("Em Em", ["E32", "E32"]),
    versions=dict(
        explore=dict(style=style(EXPLORE, "glass harmonica pads, celesta, harp and glass mallets, soft wind-like "
                                 "noise swells, felt piano and cello", "Drifting through violet glass fog inside a "
                                 "hall so large it has its own weather; the panes ring faintly.",
                                 "Hazy, wistful, restless and luminous.")),
        battle=dict(style=style(BATTLE, "stormy rolling drums, fast glass mallet and harp arpeggios, cold shimmering "
                                "synth pads, a soaring cello and synth lead theme", "A fight in a storm of violet glass "
                                "and ringing light.", "Stormy, urgent and melodic, cinematic energy."),
                    over=dict(
                        X1=eighths("Em Em C C", ["E E B E e E B E", "E E B E G E B E", "C C G C c C G C",
                                                 "C C G C E C G C"]),
                        X2=eighths("Am Am B B", ["A, A, E A, A A, E A,", "A, A, E A, c A, E A,",
                                                 "B, B, F B, B B, F B,", "B, B, ^D F B F ^D B,"]),
                        Z1=eighths("C D Em Em", ["C C C C C C C C", "D D D D D D D D", "E E E E E E E E",
                                                 "E E E E G G G G"]),
                        Z2=eighths("C D B B", ["C C C C E E E E", "D D D D F F F F", "B, B, B, B, ^D ^D ^D ^D",
                                               "B, B, ^D ^D F F B B"]))),
    ),
    use="Stage II map + combat (pair)",
)

# ---------------------------------------------------------------- hollow-choir: Guardian II (A minor, 112)
P["hollow-choir"] = dict(
    key="Am", bpm=112, stage=2, kind="single",
    sections=dict(
        intro=sec("Am Am F E", ["A,32", "A,32", "F,32", "E,16 ^G,16"]),
        T1=sec("Am Dm E Am", ["E8 A8 c8 B8", "A16 F16", "^G8 B8 e16", "c24 A8"]),
        T2=sec("F G E E", ["A8 c8 f12 e4", "d16 B16", "e12 d4 c8 B8", "^G32"]),
        O1=eighths("Am Am F F", ["A, E A c A E A, E", "A, E A c e c A E", "F, C F A F C F, C", "F, C F A c A F C"]),
        O2=eighths("Dm Dm E E", ["D A, D F D A, D A,", "D A, D F A F D A,", "E B, E ^G E B, E B,",
                                 "E B, E ^G B ^G E B,"]),
        S1=sec("C G Am Em", ["g24 e8", "d24 B8", "c16 e16", "B32"]),
        S2=sec("F Dm E E", ["A16 c16", "d16 f16", "^G16 B16", "e32"]),
        W1=quarters("F G Am Am", ["F, F, F, F,", "G, G, G, G,", "A, A, A, A,", "A, A, c c"]),
        W2=eighths("F G E E", ["F, F, F, F, A A A A", "G, G, G, G, B B B B", "E, E, E, E, ^G ^G ^G ^G",
                               "E, E, ^G ^G B B e e"]),
    ),
    form=[("intro", "intro"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("O1", "instrumental"), ("O2", "instrumental"),
          ("S1", "instrumental"), ("S2", "instrumental"), ("T1", "instrumental"), ("T2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("S1", "instrumental"), ("S2", "instrumental"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("O1", "instrumental"), ("O2", "instrumental")],
    tail=("Am Am", ["A32", "A32"]),
    versions=dict(main=dict(style=(
        "Haunting retro-cinematic boss battle music for a pixel-art starship game: a cathedral engine of violet glass "
        "bells and organ pipes that will not let go. Tolling glass bells and tubular bells, a dark pipe organ, fast "
        "glass mallet and harp ostinati, pounding live drums and taiko, a pulsing analog bass and synthesizer "
        "arpeggios, tremolo strings and a soaring cello theme. Majestic, cold, tragic and urgent, melodic and "
        "cinematic, vast reverb.")),
    ),
    use="Guardian II (single, battle)",
)

# ---------------------------------------------------------------- blackout-heart: Stage III theme A (C minor, 116)
BH_H1 = sec("Cm Ab Eb Bb", ["G8 c8 d8 e8", "e12 d4 c16", "B8 e8 g12 f4", "f16 d16"])
BH_H2 = sec("Cm Ab Fm G", ["g12 f4 e8 d8", "c24 e8", "f12 e4 d8 c8", "=B16 d16"])
P["blackout-heart"] = dict(
    key="Cm", bpm=116, stage=3, kind="pair",
    sections=dict(
        intro=pads("Cm Ab Fm G", [("C", "G"), ("C", "A"), ("C", "A"), ("=B,", "D")]),
        H1=BH_H1, H2=BH_H2,
        P1=pads("Cm Cm Ab Ab", [("C", "G,"), ("C", "G,"), ("A,", "E"), ("A,", "C")]),
        P2=pads("Fm Fm G G", [("F,", "C"), ("F,", "A,"), ("G,", "D"), ("G,", "=B,")]),
        E1=sec("Ab Bb Cm Cm", ["c16 e16", "d16 f16", "g24 e8", "g32"]),
        E2=sec("Ab Bb G G", ["a16 g8 e8", "f16 d8 B8", "d12 c4 =B16", "d32"]),
        W1=wholes("Ab Eb Fm Cm", "c B c c"),
        W2=wholes("Ab Bb G G", "c d d =B"),
    ),
    form=[("intro", "intro"),
          ("H1", "instrumental"), ("H2", "instrumental"), ("P1", "instrumental"), ("P2", "instrumental"),
          ("E1", "instrumental"), ("E2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("E1", "instrumental"), ("E2", "instrumental"),
          ("H1", "instrumental"), ("H2", "instrumental"), ("P1", "instrumental"), ("P2", "instrumental")],
    tail=("Cm Cm", ["C32", "C32"]),
    versions=dict(
        explore=dict(style=style(EXPLORE, S3, "Approaching a vast ember-red sphere of archive machinery at the heart "
                                 "of a dark ring of relays.", "Dark, grave, patient and quietly hopeful.")),
        battle=dict(style=style(BATTLE, "pounding taiko and industrial drums, heavy low brass stabs, deep ember "
                                "drones, urgent spiccato strings and a bold cello and synth lead theme",
                                "A fight at the burning red heart of a dark archive machine.",
                                "Menacing, urgent and melodic, cinematic energy."),
                    over=dict(
                        P1=eighths("Cm Cm Ab Ab", ["C C G, C c C G, C", "C C G, C E C G, C",
                                                   "A, A, E A, A A, E A,", "A, A, E A, c A, E A,"]),
                        P2=eighths("Fm Fm G G", ["F, F, C F, F F, C F,", "F, F, C F, A F, C F,",
                                                 "G, G, D G, G G, D G,", "G, G, D G, =B G, D G,"]),
                        W1=eighths("Ab Eb Fm Cm", ["A, A, A, A, A, A, A, A,", "E, E, E, E, E, E, E, E,",
                                                   "F, F, F, F, F, F, F, F,", "C C C C C C C C"]),
                        W2=eighths("Ab Bb G G", ["A, A, A, A, c c c c", "B, B, B, B, d d d d",
                                                 "G, G, G, G, =B =B =B =B", "G, G, =B, =B, D D G G"]))),
    ),
    use="Stage III map + combat (pair)",
)

# ---------------------------------------------------------------- last-orders: Stage III theme B (C minor, 122)
P["last-orders"] = dict(
    key="Cm", bpm=122, stage=3, kind="pair",
    sections=dict(
        intro=pads("Cm Ab Fm G", [("G", "c"), ("A", "c"), ("A", "c"), ("G", "=B")]),
        O1=sec("Cm G Ab Eb", ["c12 =B4 c8 d8", "d16 G16", "e12 d4 c8 e8", "g24 f8"]),
        O2=sec("Fm Cm G G", ["a12 g4 f8 e8", "g16 e16", "d12 c4 =B8 G8", "=B32"]),
        M1=pads("Cm Cm Ab Ab", [("C", "G"), ("C", "E"), ("A,", "E"), ("A,", "C")]),
        M2=pads("Fm Fm G G", [("F,", "C"), ("F,", "A,"), ("G,", "D"), ("G,", "=B,")]),
        L1=sec("Eb Bb Cm Ab", ["B16 e16", "d16 f16", "e24 g8", "a32"]),
        L2=sec("Fm G Cm G", ["f12 g4 a16", "g16 d16", "e12 d4 c16", "=B32"]),
        W1=wholes("Ab Eb Fm Cm", "e e f g"),
        W2=wholes("Ab Bb G G", "e f d =B"),
    ),
    form=[("intro", "intro"),
          ("O1", "instrumental"), ("O2", "instrumental"), ("M1", "instrumental"), ("M2", "instrumental"),
          ("L1", "instrumental"), ("L2", "instrumental"), ("O1", "instrumental"), ("O2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("L1", "instrumental"), ("L2", "instrumental"),
          ("O1", "instrumental"), ("O2", "instrumental"), ("M1", "instrumental"), ("M2", "instrumental")],
    tail=("Cm Cm", ["C32", "C32"]),
    versions=dict(
        explore=dict(style=style(EXPLORE, "a slow low brass and cello chorale, deep ember drones, felt piano and a "
                                 "steady ticking pulse", "Machines at the heart of a dark archive still carrying out "
                                 "their last orders, thirty years on.", "Dutiful, sad, grave and patient.")),
        battle=dict(style=style(BATTLE, "a relentless snare and taiko march, heavy low brass, deep ember drones, "
                                "urgent string ostinato and a bold cello and synth lead theme", "A fight against the "
                                "dutiful machines guarding a dark archive.", "Relentless, dutiful and melodic, "
                                "cinematic energy."),
                    over=dict(
                        M1=eighths("Cm Cm Ab Ab", ["C C G, C C C G, C", "C C G, C E C G, C",
                                                   "A, A, E A, A, A, E A,", "A, A, E A, c A, E A,"]),
                        M2=eighths("Fm Fm G G", ["F, F, C F, F, F, C F,", "F, F, C F, A F, C F,",
                                                 "G, G, D G, G, G, D G,", "G, G, D G, =B G, D G,"]),
                        W1=eighths("Ab Eb Fm Cm", ["A, A, A, A, A, A, A, A,", "E, E, E, E, E, E, E, E,",
                                                   "F, F, F, F, F, F, F, F,", "C C C C C C C C"]),
                        W2=eighths("Ab Bb G G", ["A, A, A, A, c c c c", "B, B, B, B, d d d d",
                                                 "G, G, G, G, =B =B =B =B", "G, G, =B, =B, D D G G"]))),
    ),
    use="Stage III map + combat (pair)",
)

# ---------------------------------------------------------------- event-horizon: the Blackout Core (C minor, 128), 3 layers
P["event-horizon"] = dict(
    key="Cm", bpm=128, stage=3, kind="layers",
    sections=dict(
        intro=sec("Cm Cm Ab G", ["C,32", "C,32", "A,,32", "G,,16 =B,,16"]),
        H1=BH_H1, H2=BH_H2,
        Q1=quarters("Cm Ab Fm G", ["c c =B c", "e e d c", "f f e d", "=B d g d"]),
        Q2=quarters("Cm Ab Bb G", ["c c =B c", "e e d c", "d d c B", "=B =B d d"]),
        D1=eighths("Cm Cm Ab Ab", ["C C G, C c C G, C", "C C G, C E C G, C", "A, A, E A, A A, E A,",
                                   "A, A, E A, c A, E A,"]),
        D2=eighths("Fm Fm G G", ["F, F, C F, F F, C F,", "F, F, C F, A F, C F,", "G, G, D G, G G, D G,",
                                 "G, G, D G, =B G, D G,"]),
        E1=sec("Ab Bb Cm Cm", ["c16 e16", "d16 f16", "g24 e8", "g32"]),
        E2=sec("Ab Bb G G", ["a16 g8 e8", "f16 d8 B8", "d12 c4 =B16", "d32"]),
    ),
    form=[("intro", "intro"),
          ("H1", "instrumental"), ("H2", "instrumental"), ("D1", "instrumental"), ("D2", "instrumental"),
          ("Q1", "instrumental"), ("Q2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental"),
          ("E1", "instrumental"), ("E2", "instrumental"), ("D1", "instrumental"), ("D2", "instrumental"),
          ("Q1", "instrumental"), ("Q2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental")],
    tail=("Cm Cm", ["C32", "C32"]),
    versions=dict(
        custody=dict(style=(
            "Tense retro-cinematic final boss music for a pixel-art starship game, first phase: a vast ember-red sphere "
            "of archive machinery holds its shell closed. A steady heartbeat pulse and ticking analog sequencer, deep "
            "ember drones, measured low brass and cello, a pulsing analog bass, felt piano, glass bells, tom drums "
            "building. Controlled, grave and ominous, melodic and cinematic, spacious reverb.")),
        emergency=dict(style=(
            "Intense retro-cinematic final boss music for a pixel-art starship game, second phase: the ember-red archive "
            "machine spends its last reserves. Fast driving analog synthesizer arpeggios and pulsing sequenced bass, "
            "pounding taiko and live drums, heavy low brass, urgent string ostinato, a bold cello and synth lead theme, "
            "glass bells. Urgent, heroic and melodic, cinematic energy, spacious reverb.")),
        horizon=dict(style=(
            "Overwhelming retro-cinematic final boss music for a pixel-art starship game, last phase: the ember-red "
            "machine pulls every light inward. Relentless thundering drums and taiko, massive low brass and trombones, "
            "furious string ostinato, roaring analog bass and fast synthesizer arpeggios, a huge soaring cello, horn and "
            "synth lead theme, tolling glass bells. Epic, desperate, heroic and melodic, cinematic, vast reverb."),
            over=dict(
                Q1=eighths("Cm Ab Fm G", ["c c =B c c c =B c", "e e d c e e d c", "f f e d f f e d",
                                          "=B d g d =B d g d"]),
                Q2=eighths("Cm Ab Bb G", ["c c =B c c c =B c", "e e d c e e d c", "d d c B d d c B",
                                          "=B =B d d g g d d"]))),
    ),
    use="Blackout Core (three synced phase layers)",
)

# ---------------------------------------------------------------- an-answer: the ending (F major, 84)
P["an-answer"] = dict(
    key="F", bpm=84, stage=0, kind="single",
    sections=dict(
        intro=wholes("F Am Bb C", "A A B G"),
        Q1=sec("F Am Bb C", ["F12 G4 A8 c8", "e16 c8 A8", "d12 c4 B8 G8", "c24 e8"]),
        Q2=sec("Dm Bb Gm C", ["d12 e4 f8 a8", "b16 a8 f8", "g12 f4 d8 c8", "c32"]),
        S1=pads("Bb C Am Dm", [("B", "d"), ("c", "e"), ("c", "e"), ("d", "f")]),
        S2=pads("Bb C F C", [("d", "f"), ("e", "g"), ("f", "a"), ("e", "g")]),
        C1=wholes("F Am Bb C", "a a b g"),
        C2=wholes("Dm Bb Gm C", "a f g e"),
    ),
    form=[("intro", "intro"),
          ("Q1", "intro"), ("Q2", "intro"), ("S1", "instrumental"), ("S2", "instrumental"),
          ("Q1", "instrumental"), ("Q2", "instrumental"), ("S1", "instrumental"), ("S2", "instrumental"),
          ("Q1", "instrumental"), ("Q2", "instrumental"), ("C1", "interlude"), ("C2", "interlude")],
    tail=("F F", ["F32", "F32"]),
    versions=dict(main=dict(style=(
        "Hopeful, radiant ending music for a retro-cinematic pixel-art starship game: after thirty-one years of "
        "silence the lamps of a ring of relays come back on one by one and, far below the clouds, a radio finally "
        "receives an answer. A felt piano states a tender major-key theme with a soft blinking-lamp pulse, warm "
        "analog synth arpeggios and pads bloom, a clean electric guitar and a singing synth lead carry the theme with "
        "cello and warm strings, glass bells ring, rising to a wide glowing warmth, then a quiet piano close. "
        "Emotional, grateful and resolved, spacious reverb.")),
    ),
    use="ending (single)",
)

# ---------------------------------------------------------------- line-quiet: game over (D minor, 72), short
P["line-quiet"] = dict(
    key="Dm", bpm=72, stage=0, kind="single",
    sections=dict(
        intro=sec("Dm Dm Bb A", ["a16 a16", "a16 a16", "f16 f16", "e32"]),
        T1=TTL1,
        L1=pads("Gm Dm Bb Bb", [("B", "d"), ("A", "d"), ("F", "d"), ("F", "D")]),
    ),
    form=[("intro", "intro"), ("T1", "interlude"), ("L1", "outro")],
    tail=("Bb Bb", ["D32", "D32"]),
    versions=dict(main=dict(style=(
        "Short, quiet game over music for a retro-cinematic pixel-art starship game: the line goes quiet. A lonely "
        "felt piano plays a sad, tender minor-key phrase over a soft analog synth pad and a faint slow pulse like a "
        "blinking lamp; a distant glass bell; it fades and ends open and unresolved. Sparse, still, no drums, "
        "spacious reverb.")),
    ),
    use="game over (single, short; no loop)",
    loop=False,
)


# ================================================================================================ battle rev 2
# After the copper-reach pilots (hold 1): every take was instrumental (CLAP vocal <= 0.16), explore read cinematic
# (0.76-0.83), but the battle takes dipped to techno (CLAP 0.04-0.2) exactly in the override sections that were
# monotone eighth-note pulses (grooves, the break). Rev 2: contoured 3-3-2 cello-style ostinati (a dotted march for
# last-orders) instead of straight pulses, the break keeps the explore's sustained notes and builds with rising
# quarter-note arpeggios, and the battle style text leans hybrid-orchestral (live drums, taiko, cello/string
# ostinato) with the analog synths underneath.
BATTLE2 = ("Retro-cinematic hybrid battle score for a pixel-art starship game: pounding live drums, taiko and big toms, a "
           "driving cello and string ostinato, bright analog synthesizer arpeggios over a deep analog bass, spacious reverb")


def ost(chords, pats):
    """3-3-2 ostinato bars: six notes per bar -> a6 b6 c4 d6 e6 f4."""
    return sec(chords, [" ".join(f"{n}{d}" for n, d in zip(p.split(), (6, 6, 4, 6, 6, 4))) for p in pats])


def march(chords, pats):
    """Dotted march bars: six notes per bar -> a6 b2 c8 d6 e2 f8."""
    return sec(chords, [" ".join(f"{n}{d}" for n, d in zip(p.split(), (6, 2, 8, 6, 2, 8))) for p in pats])


def rev2(pid, scene, colour, mood, over):
    v = P[pid]["versions"]["battle"]
    v["style"] = style(BATTLE2, colour, scene, mood)
    v["over"] = over
    v["rev"] = 2


rev2("copper-reach", "A fight among rusted copper relays and green cables above the clouds.",
     "a bold clean electric guitar and synth lead melody, felt piano and glass bells",
     "Urgent, heroic and melodic, like an epic adventure film score.", dict(
         G1=ost("Dm C Bb A", ["D A, D F E D", "C G, C E D C", "B, F, B, D C B,", "A, E, A, ^C E A"]),
         G2=ost("Dm C Bb A", ["D F A d A F", "C E G c G E", "B, D F B F D", "A, ^C E A E ^C"]),
         R2=quarters("Bb F Gm A", ["B, D F B", "F, A, C F", "G, B, D G", "A, ^C E A"])))
rev2("rust-kingdom", "A fight among cranes and rusted containers at the edge of space.",
     "heavy metal percussion, a bold cello and clean electric guitar theme, low brass",
     "Weighty, determined and melodic, like an epic adventure film score.", dict(
         H1=ost("Am Am G G", ["A, E A c B A", "A, E A e d c", "G, D G B A G", "G, D G d c B"]),
         H2=ost("F F E E", ["F, C F A G F", "F, C F c B A", "E, B, E ^G F E", "E, B, E ^G B ^G"]),
         W2=quarters("F G E E", ["F, A, C F", "G, B, D G", "E, ^G, B, E", "E ^G B e"])))
rev2("glass-cathedral", "A fight inside a vast cathedral of violet glass that rings with every hit.",
     "fast violet glass mallet and harp ostinati, celesta, glass bells and a soaring cello and synth lead",
     "Tense, graceful and melodic, like an epic fantasy film score.", dict(
         H1=ost("Am F C G", ["A c e a e c", "F A c f c A", "C E G c G E", "G, B, D G D B,"]),
         H2=ost("Am F E E", ["A c e a e c", "F A c f c A", "E ^G B e B ^G", "E ^G B e ^g e"]),
         W2=quarters("F G E E", ["F, A, C F", "G, B, D G", "E, ^G, B, E", "E ^G B e"])))
rev2("choir-weather", "A fight in a storm of violet glass and ringing light.",
     "stormy rolling drums, fast glass mallet and harp arpeggios, cold shimmering pads, a soaring cello and synth lead",
     "Stormy, urgent and melodic, like an epic fantasy film score.", dict(
         X1=ost("Em Em C C", ["E B e g f e", "E B e b a g", "C G c e d c", "C G c g f e"]),
         X2=ost("Am Am B B", ["A, E A c B A", "A, E A e d c", "B, F B ^d B F", "B, ^D F B ^d f"]),
         Z2=quarters("C D B B", ["C E G c", "D F A d", "B, ^D F B", "B ^d f b"])))
rev2("blackout-heart", "A fight at the burning red heart of a dark archive machine.",
     "heavy low brass stabs, deep ember drones, urgent spiccato strings and a bold cello and synth lead theme",
     "Menacing, urgent and melodic, like an epic film score.", dict(
         P1=ost("Cm Cm Ab Ab", ["C G c e d c", "C G c g f e", "A, E A c B A", "A, E A e d c"]),
         P2=ost("Fm Fm G G", ["F, C F A G F", "F, C F c B A", "G, D G =B A G", "G, D G d c =B"]),
         W2=quarters("Ab Bb G G", ["A, C E A", "B, D F B", "G, =B, D G", "G =B d g"])))
rev2("last-orders", "A fight against the dutiful machines guarding a dark archive.",
     "a relentless snare and taiko march, heavy low brass, deep ember drones and a bold cello and synth lead theme",
     "Relentless, dutiful and melodic, like an epic film score.", dict(
         M1=march("Cm Cm Ab Ab", ["C C G, C C E", "C C G, E E G", "A, A, E A, A, C", "A, A, E C C E"]),
         M2=march("Fm Fm G G", ["F, F, C F, F, A,", "F, F, C A, A, C", "G, G, D G, G, =B,", "G, G, D =B, =B, D"]),
         W2=quarters("Ab Bb G G", ["A, C E A", "B, D F B", "G, =B, D G", "G =B d g"])))
# singles with driving sections: the same contoured ostinati instead of straight eighth pulses
P["iron-regent"]["sections"].update(
    R1=ost("Dm C Bb A", ["D A, D F E D", "C G, C E D C", "B, F, B, D C B,", "A, E, A, ^C E A"]),
    R2=ost("Dm C Bb A", ["D F A d A F", "C E G c G E", "B, D F B F D", "A, ^C E A E ^C"]),
    W2=quarters("Bb F Gm A", ["B, D F B", "F, A, C F", "G, B, D G", "A, ^C E A"]))
P["iron-regent"]["rev"] = 2
P["hollow-choir"]["sections"].update(
    O1=ost("Am Am F F", ["A, E A c B A", "A, E A e d c", "F, C F A G F", "F, C F c B A"]),
    O2=ost("Dm Dm E E", ["D A, D F E D", "D A, D A F D", "E B, E ^G F E", "E B, E ^G B ^G"]),
    W2=quarters("F G E E", ["F, A, C F", "G, B, D G", "E, ^G, B, E", "E ^G B e"]))
P["hollow-choir"]["rev"] = 2
P["event-horizon"]["sections"].update(
    D1=ost("Cm Cm Ab Ab", ["C G c e d c", "C G c g f e", "A, E A c B A", "A, E A e d c"]),
    D2=ost("Fm Fm G G", ["F, C F A G F", "F, C F c B A", "G, D G =B A G", "G, D G d c =B"]))
P["event-horizon"]["versions"]["horizon"].pop("over", None)
P["event-horizon"]["rev"] = 2


# ================================================================================================ rev 3 (groove sections)
# After hold 2: the windows that read as techno (CLAP cinematic 0.04-0.2) were the groove sections WITHOUT a melody
# (pads or a bare ostinato under a synth arp and a beat), in explore as well as battle (rust-kingdom H1/H2). Rev 3 gives
# every remaining pair's groove sections a lyrical counter-melody, the SAME in explore and battle (the battle style
# adds the drive; the crossfade partners then carry the same tune), keeps only the rising-quarter break build as a
# battle override, and drops "clockwork ticks"/"metal percussion" from the style texts (faultline lore: that
# vocabulary reads as techno).
def rev3(pid, sections, battle_over=None, explore_style=None, battle_style=None):
    P[pid]["sections"].update(sections)
    b = P[pid]["versions"]["battle"]
    b["over"] = battle_over or {}
    b["rev"] = 3
    P[pid]["versions"]["explore"]["rev"] = 3
    if explore_style:
        P[pid]["versions"]["explore"]["style"] = explore_style
    if battle_style:
        b["style"] = battle_style


rev3("rust-kingdom", dict(
        H1=sec("Am Am G G", ["e16 d8 c8", "B16 A16", "d16 c8 B8", "G32"]),
        H2=sec("F F E E", ["c16 A8 c8", "f16 e16", "e12 d4 B8 ^G8", "B32"])),
     battle_over=dict(W2=quarters("F G E E", ["F, A, C F", "G, B, D G", "E, ^G, B, E", "E ^G B e"])),
     explore_style=style(EXPLORE, "a low cello melody, clean electric guitar, felt piano and faint glass bells",
                         "Slow cranes still moving over stacked containers in a rusted kingdom at the edge of space.",
                         "Mysterious, proud, weathered and warm."),
     battle_style=style(BATTLE2, "a bold cello and clean electric guitar theme, low brass and big orchestral drums",
                        "A fight among cranes and rusted containers at the edge of space.",
                        "Weighty, determined and melodic, like an epic adventure film score."))
rev3("glass-cathedral", dict(
        H1=sec("Am F C G", ["e16 c8 A8", "c16 A16", "G16 c8 e8", "d32"]),
        H2=sec("Am F E E", ["e16 a8 e8", "f16 c16", "B16 ^G8 E8", "^G32"])),
     battle_over=dict(W2=quarters("F G E E", ["F, A, C F", "G, B, D G", "E, ^G, B, E", "E ^G B e"])))
rev3("choir-weather", dict(
        X1=sec("Em Em C C", ["g16 f8 e8", "B24 e8", "c16 G8 E8", "G32"]),
        X2=sec("Am Am B B", ["A16 c8 e8", "a24 g8", "f16 ^d8 B8", "B32"])),
     battle_over=dict(Z2=quarters("C D B B", ["C E G c", "D F A d", "B, ^D F B", "B ^d f b"])))
rev3("blackout-heart", dict(
        P1=sec("Cm Cm Ab Ab", ["c16 d8 e8", "g24 f8", "e16 c8 A8", "c32"]),
        P2=sec("Fm Fm G G", ["f16 e8 d8", "c24 A8", "=B16 d8 f8", "g32"])),
     battle_over=dict(W2=quarters("Ab Bb G G", ["A, C E A", "B, D F B", "G, =B, D G", "G =B d g"])))
rev3("last-orders", dict(
        M1=sec("Cm Cm Ab Ab", ["G16 c8 e8", "d24 c8", "c16 A8 E8", "A32"]),
        M2=sec("Fm Fm G G", ["A16 c8 f8", "e24 d8", "d16 =B8 G8", "=B32"])),
     battle_over=dict(W2=quarters("Ab Bb G G", ["A, C E A", "B, D F B", "G, =B, D G", "G =B d g"])))
# event-horizon (three layers from one plan): its drive sections carry the blackout-heart counter-melody too
P["event-horizon"]["sections"].update(D1=P["blackout-heart"]["sections"]["P1"], D2=P["blackout-heart"]["sections"]["P2"])
P["event-horizon"]["rev"] = 3
P["rust-kingdom"]["takes_from"] = 3          # t1/t2 (rev 2 plan) are superseded


# singles (after hold 2: iron-regent read as techno almost throughout, CLAP 0.49-0.62, min 0.08, with a style text of
# "relentless pulsing analog bass and synthesizer arpeggio ostinato" at 120 BPM): hybrid-orchestral style texts with
# the synths as pads/bass underneath, and counter-melodies in the drive sections.
P["iron-regent"]["sections"].update(
    R1=sec("Dm C Bb A", ["d16 c8 A8", "c16 G8 E8", "B16 F8 D8", "^c16 e16"]),
    R2=sec("Dm C Bb A", ["f16 e8 d8", "e16 d8 c8", "d16 c8 B8", "A32"]))
P["iron-regent"]["versions"]["main"]["style"] = (
    "Epic cinematic boss battle music for a retro pixel-art starship game: a colossal crowned gate machine of armoured "
    "iron and tarnished brass blocks the way. Thunderous taiko and orchestral percussion, massive low brass chords, a "
    "relentless cello and string ostinato, a commanding French horn and clean electric guitar theme doubled by strings, "
    "warm analog synth pads and a deep analog bass underneath, glass bells ringing over it. Regal, heavy, stern and "
    "heroic, melodic and cinematic, spacious reverb.")
P["iron-regent"]["rev"] = 3
P["iron-regent"]["takes_from"] = 3
P["hollow-choir"]["sections"].update(
    O1=sec("Am Am F F", ["e16 c8 A8", "a24 e8", "f16 c8 A8", "c32"]),
    O2=sec("Dm Dm E E", ["d16 f8 a8", "f24 d8", "e16 ^G8 B8", "e32"]))
P["hollow-choir"]["versions"]["main"]["style"] = (
    "Haunting cinematic boss battle music for a retro pixel-art starship game: a cathedral engine of violet glass bells "
    "and organ pipes that will not let go. Tolling glass bells and tubular bells, a dark pipe organ, fast glass mallet "
    "and harp ostinati, pounding taiko and orchestral drums, tremolo strings and a soaring cello and horn theme, cold "
    "analog synth pads underneath. Majestic, cold, tragic and urgent, melodic and cinematic, vast reverb.")
P["hollow-choir"]["rev"] = 3
EH = P["event-horizon"]["versions"]
EH["custody"]["style"] = (
    "Tense cinematic final boss music for a retro pixel-art starship game, first phase: a vast ember-red sphere of "
    "archive machinery holds its shell closed. A slow heartbeat on low drums, deep ember drones, measured low brass and "
    "cello, felt piano, glass bells, warm analog synth pads, toms building. Controlled, grave and ominous, melodic and "
    "cinematic, spacious reverb.")
EH["emergency"]["style"] = (
    "Intense cinematic final boss music for a retro pixel-art starship game, second phase: the ember-red archive machine "
    "spends its last reserves. Pounding taiko and live drums, heavy low brass, an urgent string ostinato, bright analog "
    "synthesizer arpeggios over a deep analog bass, a bold cello and synth lead theme, glass bells. Urgent, heroic and "
    "melodic, like an epic film score, spacious reverb.")
EH["horizon"]["style"] = (
    "Overwhelming cinematic final boss music for a retro pixel-art starship game, last phase: the ember-red machine pulls "
    "every light inward. Relentless thundering drums and taiko, massive low brass and trombones, a furious string "
    "ostinato, a huge soaring cello, horn and synth lead theme, analog synth pads, tolling glass bells. Epic, desperate, "
    "heroic and melodic, cinematic, vast reverb.")


# ================================================================================================ plan machinery
KEYACC = {"Dm": {"B": -1}, "Am": {}, "Em": {"F": 1}, "Cm": {"B": -1, "E": -1, "A": -1}, "F": {"B": -1}}


def bars_of(pid, version):
    """[(chord, ins, label, section_name)] for every bar of one version, intro + body + tail."""
    p = P[pid]
    over = p["versions"][version].get("over", {})
    out = []
    for name, label in p["form"]:
        chords, bars = over.get(name, p["sections"][name])
        assert over.get(name, p["sections"][name])[0] == p["sections"][name][0], f"{pid}/{version}/{name}: chords differ"
        out += [(c, b, label, name) for c, b in zip(chords, bars)]
    tc, tb = p["tail"]
    out += [(c, b, "outro", "tail") for c, b in zip(tc.split(), tb)]
    return out


def layout(pid):
    """Bar layout shared by every version: intro bars, loop [start, end) in bars, total bars, bar seconds."""
    p = P[pid]
    n_intro = 4 * sum(1 for name, _ in p["form"] if name == "intro")
    n_body = 4 * len(p["form"]) - n_intro
    n_tail = len(p["tail"][1])
    bar_s = 240.0 / p["bpm"]
    sections = []                      # (first bar, name, label) of each four-bar section, then the tail
    for i, (name, label) in enumerate(p["form"]):
        sections.append((4 * i, name, label))
    sections.append((n_intro + n_body, "tail", "outro"))
    # loopStart: right after an EARLIER occurrence of the loop's final section, so the jump loopEnd -> loopStart
    # continues exactly as the music already did at that point (the seam joins the same material). Else the intro end.
    body = [name for name, _ in p["form"] if name != "intro"]
    loop_start = n_intro
    if body[-1] in body[:-1]:
        loop_start = n_intro + 4 * (body.index(body[-1]) + 1)
    return dict(intro=n_intro, loop=(loop_start, n_intro + n_body), bars=n_intro + n_body + n_tail, tail=n_tail,
                bar_s=bar_s, sections=sections, loop_ok=p.get("loop", True))


def score(pid, version):
    p = P[pid]
    rows = bars_of(pid, version)
    out = (f'X:1\nT:\nM:4/4\nL:1/32\nQ:1/4={p["bpm"]}\nV: Vocal clef=treble name="Vocal Melody" snm="Vocal"\n'
           f'V: Ins clef=treble name="Ins Melody" snm="Inst."\nK:{p["key"]}\n')
    i = 0
    while i < len(rows):                           # one block per four-bar section (the tail is its own block)
        j = i + 4 if rows[i][3] != "tail" else len(rows)
        block = rows[i:j]
        out += (f"% {block[0][2]}\nV: Vocal\n" + "|".join(f'"{c}"z32' for c, *_ in block) + "|\nV: Ins\n"
                + "|".join(b for _, b, *_ in block) + "|\n")
        i = j
    return out


def style_text(pid, version):
    p = P[pid]
    return p["versions"][version]["style"] + SUFFIX + f' {p["key"]}, {p["bpm"]} BPM.'


def seed(pid, version, n):
    h = int(hashlib.sha256(f"ttl/{pid}/{version}".encode()).hexdigest()[:6], 16) % 900000 + 100000
    return h + 1000 * n


def check(pid):
    p = P[pid]
    for version in p["versions"]:
        rows = bars_of(pid, version)
        for i, (c, bar, *_rest) in enumerate(rows):
            units = sum(int(n or 1) for n in NOTE.findall(bar))
            if units != 32:
                raise ValueError(f"{pid}/{version} bar {i} ({bar}) has {units} units")
        assert len(rows) == layout(pid)["bars"], (pid, version)
    return layout(pid)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        pid = sys.argv[1]
        version = sys.argv[2] if len(sys.argv) > 2 else next(iter(P[pid]["versions"]))
        check(pid)
        print(style_text(pid, version) + "\n")
        print(score(pid, version))
        sys.exit()
    for pid in P:
        L = check(pid)
        dur = L["bars"] * L["bar_s"]
        print(f"{pid:16} {P[pid]['key']:3} {P[pid]['bpm']:4} BPM  bars {L['bars']:3} (intro {L['intro']}, loop "
              f"{L['loop'][0]}-{L['loop'][1]}, tail {L['tail']})  {dur:6.1f}s  loop {L['loop'][0] * L['bar_s']:.2f}-"
              f"{L['loop'][1] * L['bar_s']:.2f}s  versions {list(P[pid]['versions'])}")
