"""TIME TO LIVE score plans, v2 "dark" (2026-09-27, after the user's feedback on v1: "very happy and far away from Ben
Prunty"; v1 is archived in archive-v1/ with its takes).

Target sound: Ben Prunty's FTL and FTL: Multiverse -- lonely, cold, mysterious deep-space melancholy: analog synth pads
and filter sweeps, a soft low 16th-note arpeggiator, sub-bass drones and pedal points, square/PWM leads with slow
vibrato, FM bell plucks, tape echo and big reverb; sparse, slow modal melodies that rarely resolve; harmony that barely
moves and stays minor. Battle versions keep the darkness: a driving dark synth-bass ostinato, an electronic drum machine
with a gated snare, tense arps, minor-second stabs; menacing and urgent, never heroic. FAULTLINE colours: felt piano,
cello, glass bells, the lamp pulse. Hope only as a rare glimmer; the ending (an-answer) is the one exception.

Rules of these plans:
- Minor modes only (Aeolian, Dorian, Phrygian bII for menace): i-bVI-iv-i, i-bVII-bVI-v, i-bII, i-iv over a pedal. No
  IV-V-I, no I-V-vi-IV, no landing on the relative major. v is minor.
- Explore: one chord per two bars, long notes (whole/dotted half), a rest at a phrase end at most; the arpeggiator in
  the style text carries the motion. Battle: the same chords and bars; groove sections become a synth-bass ostinato
  (root, minor second, fifth, seventh in eighths) and the break builds; theme sections keep the explore melody.
- Every bar is exactly one 4/4 measure of 32 units (L:1/32); four-bar sections arranged by a form: intro -> loop body ->
  2 tail bars. loopStart follows an EARLIER occurrence of the loop's final section (layout()), so the seam joins the
  same music. Block labels are non-vocal only (intro / instrumental / interlude / outro).
- CFG pushes away from NEGATIVE: voices, happy/uplifting/heroic vocabulary, generic EDM.

Usage: python plans.py            -> check every plan, print a summary
       python plans.py <id> [ver] -> print the style text and ABC of one version"""
import hashlib, re, sys

NOTE = re.compile(r"[=^_]*[A-Ga-gz][,']*(\d*)")
VOICES = ("Vocals, a singer singing lyrics, sung words, spoken words, speech, narration, voice-over, rap, whispering, "
          "choir singing words, a solo voice, pop song with a lead vocalist.")
NEGATIVE = (VOICES + " Happy, cheerful, joyful, uplifting, hopeful, triumphant, heroic fanfare, major key, bright pop, "
            "feel-good, playful, whimsical, children's music, corporate, upbeat, epic trailer, sunny. Generic EDM club "
            "dance track with a four-on-the-floor kick.")
NEGATIVE_ENDING = (VOICES + " Cheerful, bright pop, feel-good, playful, whimsical, children's music, corporate, upbeat, "
                   "sunny, epic trailer. Generic EDM club dance track with a four-on-the-floor kick.")
SUFFIX = " Purely instrumental."

# ------------------------------------------------------------------------------------------------ style vocabulary
EXPLORE = ("Dark, melancholic 1980s sci-fi film synth score for a lonely retro pixel-art space game, Vangelis-like deep "
           "space ambient: slow-evolving retro analog synthesizer pads with filter sweeps, a soft low 16th-note "
           "arpeggiator, a sub-bass drone on a pedal tone, a sparse lonely lead with slow vibrato, tape echo and vast "
           "reverb, lots of space")
BATTLE = ("Tense, menacing 1980s sci-fi synth battle score for a lonely retro pixel-art space game: a relentless dark "
          "synth-bass ostinato, an electronic drum machine with a gated snare, a tense low arpeggiator, minor-second "
          "synth stabs, cold analog pads, tape echo and big reverb")
S1 = "far-off rusted metallic percussion, a lonely cello, a soft felt piano and faint glass bells"
S1B = "rusted metallic percussion, a lonely cello line and heavy low toms"
S2 = "eerie glass tones, celesta and ghostly chimes, a soft felt piano and a lonely cello"
S2B = "eerie glass tones, fast glass mallet ostinati and ghostly chimes"
S3 = "ember drones, low brass swells, a slow heartbeat pulse and a lonely cello"
S3B = "ember drones, low brass swells and a heavy heartbeat kick"
MOOD_E = "Cold, lonely, mysterious and desolate."
MOOD_B = "Urgent, dark and relentless, menacing, never heroic."


def explore(colour, scene, mood=MOOD_E):
    return f"{EXPLORE}, {colour}. {scene} {mood}"


def battle(colour, scene, mood=MOOD_B):
    return f"{BATTLE}, {colour}. {scene} {mood}"


# ------------------------------------------------------------------------------------------------ helpers
def sec(chords, bars):
    chords = chords.split() if isinstance(chords, str) else chords
    assert len(chords) == len(bars) == 4, (chords, bars)
    return (chords, list(bars))


def wholes(chords, notes):
    return sec(chords, [f"{n}32" for n in notes.split()])


def ost(chords, pats):
    """Synth-bass ostinato in eighths: each pattern is 8 notes for one bar."""
    return sec(chords, [" ".join(f"{n}4" for n in p.split()) for p in pats])


def riff(root, b2, fifth, sev):
    """One bar of the dark ostinato: root root b2 root root fifth(low) seventh root."""
    return f"{root} {root} {b2} {root} {root} {fifth} {sev} {root}"


def pulse(note, n=8):
    return " ".join([note] * n)


# ================================================================================================ PIECES
P = {}

# ---------------------------------------------------------------- the TTL theme, dark (D minor): slow, long notes
TTL1 = sec("Dm Dm Bb Bb", ["A32", "d16 c16", "A32", "G16 F16"])
TTL2 = sec("Gm Gm Am Am", ["B32", "A16 G16", "E32", "E24 z8"])

P["title"] = dict(
    key="Dm", bpm=92, stage=0, kind="single",
    sections=dict(
        intro=wholes("Dm Dm Dm Dm", "D D D D"),
        T1=TTL1, T2=TTL2,
        P1=wholes("Dm Dm C C", "F F E E"),
        P2=wholes("Bb Bb Am Am", "D F E E"),
        B1=sec("Gm Gm Dm Dm", ["d32", "c16 B16", "A32", "F16 A16"]),
        B2=sec("Bb Bb Am Am", ["d32", "c16 B16", "c32", "B16 A16"]),
        Q1=wholes("Dm Dm Dm Dm", "A A A A"),
        Q2=wholes("Bb Bb Am Am", "F F E E")),
    form=[("intro", "intro"), ("T1", "intro"), ("T2", "intro"), ("P1", "instrumental"), ("P2", "instrumental"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("B1", "instrumental"), ("B2", "instrumental"),
          ("Q1", "interlude"), ("Q2", "interlude"), ("T1", "instrumental"), ("T2", "instrumental"),
          ("P1", "instrumental"), ("P2", "instrumental")],
    tail=("Dm Dm", ["D32", "D32"]),
    versions=dict(main=dict(style=(
        "Main title theme of a lonely retro pixel-art space game: a slow, dark, spacey 1980s sci-fi film synth score, "
        "Vangelis-like deep space ambient. Cold analog synthesizer pads swelling with slow filter sweeps, a sub-bass "
        "drone on a pedal tone, a soft low 16th-note arpeggiator, a sparse melancholic lead with slow vibrato and tape "
        "echo, a felt piano and a lonely cello answering, faint glass bells, a soft slow pulse like a blinking lamp; vast "
        "reverb and space. Dark, mysterious, desolate and melancholic."))),
    use="title screen (single)",
)

P["relay-seven"] = dict(
    key="Dm", bpm=76, stage=0, kind="single",
    sections=dict(
        intro=wholes("Dm Dm Dm Dm", "A A A A"),
        P1=TTL1, P2=TTL2,
        L1=wholes("Dm Dm Bb Bb", "A A F F"),
        L2=wholes("Gm Gm Am Am", "G G E E")),
    form=[("intro", "intro"), ("P1", "intro"), ("P2", "intro"), ("L1", "interlude"), ("L2", "interlude"),
          ("P1", "interlude"), ("P2", "interlude"), ("L1", "interlude"), ("L2", "interlude"),
          ("P1", "interlude"), ("P2", "interlude")],
    tail=("Dm Dm", ["D32", "D32"]),
    versions=dict(main=dict(style=(
        "Intimate, sad and quiet prologue music in an old switchboard room at a lonely relay station at the edge of "
        "space, late at night. A soft felt piano plays a slow, melancholic minor phrase over a cold analog synth pad and "
        "a low sub-bass drone, the quiet tick of an old relay and a faint slow pulse like a blinking amber lamp, a lonely "
        "cello, glass bells far away, tape echo and big reverb. Sparse, still, sad and lonely. No drums."))),
    use="prologue at Relay Seven (single)",
)

# ---------------------------------------------------------------- copper-reach: Stage I theme A (D minor, 108)
P["copper-reach"] = dict(
    key="Dm", bpm=108, stage=1, kind="pair",
    sections=dict(
        intro=wholes("Dm Dm Am Am", "D D E E"),
        A1=sec("Dm Dm Bb Bb", ["A32", "c16 A16", "F32", "G16 F16"]),
        A2=sec("Gm Gm Am Am", ["D32", "F16 E16", "E32", "E24 z8"]),
        G1=wholes("Dm Dm C C", "d d c c"),
        G2=wholes("Bb Bb Am Am", "B B A A"),
        B1=sec("Dm Dm C C", ["f24 e8", "d32", "e24 d8", "c32"]),
        B2=sec("Bb Bb Am Am", ["d24 c8", "B32", "c24 B8", "A32"]),
        R1=wholes("Dm Dm Dm Dm", "A A A A"),
        R2=wholes("Gm Gm Am Am", "G G E E")),
    form=[("intro", "intro"),
          ("A1", "instrumental"), ("A2", "instrumental"), ("G1", "instrumental"), ("G2", "instrumental"),
          ("B1", "instrumental"), ("B2", "instrumental"), ("A1", "instrumental"), ("A2", "instrumental"),
          ("R1", "interlude"), ("R2", "interlude"), ("B1", "instrumental"), ("B2", "instrumental"),
          ("A1", "instrumental"), ("A2", "instrumental"), ("G1", "instrumental"), ("G2", "instrumental")],
    tail=("Dm Dm", ["D32", "D32"]),
    versions=dict(
        explore=dict(style=explore(S1, "Drifting past a dead frontier of rusted copper relays and cables gone green, "
                                   "far out at the edge of space.")),
        battle=dict(style=battle(S1B, "A fight among rusted copper relays at the edge of space."),
                    over=dict(
                        G1=ost("Dm Dm C C", [riff("D", "_E", "A,", "C")] * 2 + [riff("C", "_D", "G,", "B,")] * 2),
                        G2=ost("Bb Bb Am Am", [riff("B,", "C", "F,", "A,")] * 2 + [riff("A,", "B,", "E,", "G,")] * 2),
                        R2=ost("Gm Gm Am Am", [pulse("G,")] * 2 + [pulse("A,"), "A, A, A, A, A A A A"]))),
    ),
    use="Stage I map + combat (pair)",
)

# ---------------------------------------------------------------- rust-kingdom: Stage I theme B (A minor, 100)
P["rust-kingdom"] = dict(
    key="Am", bpm=100, stage=1, kind="pair",
    sections=dict(
        intro=wholes("Am Am Em Em", "A A B B"),
        R1=sec("Am Am F F", ["E32", "G16 E16", "C32", "D16 C16"]),
        R2=sec("Dm Dm Em Em", ["A32", "c16 B16", "B32", "G24 z8"]),
        H1=wholes("Am Am G G", "e e d d"),
        H2=wholes("F F Em Em", "c c B B"),
        S1=sec("Dm Dm Am Am", ["f24 e8", "d32", "e24 d8", "c32"]),
        S2=sec("F F Em Em", ["c24 B8", "A32", "B24 A8", "B32"]),
        W1=wholes("Am Am Am Am", "E E E E"),
        W2=wholes("Dm Dm Em Em", "F F E E")),
    form=[("intro", "intro"),
          ("R1", "instrumental"), ("R2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental"),
          ("S1", "instrumental"), ("S2", "instrumental"), ("R1", "instrumental"), ("R2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("S1", "instrumental"), ("S2", "instrumental"),
          ("R1", "instrumental"), ("R2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental")],
    tail=("Am Am", ["A32", "A32"]),
    versions=dict(
        explore=dict(style=explore(S1, "Slow cranes still moving over stacked rusted containers in a dead frontier at "
                                   "the edge of space.")),
        battle=dict(style=battle(S1B, "A fight among cranes and rusted containers at the edge of space."),
                    over=dict(
                        H1=ost("Am Am G G", [riff("A,", "_B,", "E,", "G,")] * 2 + [riff("G,", "_A,", "D,", "F,")] * 2),
                        H2=ost("F F Em Em", [riff("F,", "_G,", "C,", "E,")] * 2 + [riff("E,", "F,", "B,,", "D,")] * 2),
                        W2=ost("Dm Dm Em Em", [pulse("D,")] * 2 + [pulse("E,"), "E, E, E, E, E E E E"]))),
    ),
    use="Stage I map + combat (pair)",
)

# ---------------------------------------------------------------- exchange: the Salvage Exchange (D Dorian, 96)
P["exchange"] = dict(
    key="Dm", bpm=96, stage=0, kind="single",
    sections=dict(
        intro=wholes("Dm Dm G G", "A A =B =B"),
        M1=sec("Dm Dm G G", ["d12 c4 A16", "c16 A16", "=B12 A4 G16", "A32"]),
        M2=sec("Em Em Am Am", ["=B12 A4 G16", "E32", "c12 =B4 A16", "E32"]),
        V1=wholes("Dm Dm G G", "D D =B, =B,"),
        V2=wholes("C C Am Am", "C C A, A,"),
        B1=sec("Dm Dm Em Em", ["f24 e8", "d32", "e24 d8", "=B32"]),
        B2=sec("C C Am Am", ["e24 d8", "c32", "c24 =B8", "A32"])),
    form=[("intro", "intro"),
          ("M1", "instrumental"), ("M2", "instrumental"), ("V1", "interlude"), ("V2", "interlude"),
          ("B1", "instrumental"), ("B2", "instrumental"), ("M1", "instrumental"), ("M2", "instrumental"),
          ("V1", "interlude"), ("V2", "interlude"), ("B1", "instrumental"), ("B2", "instrumental")],
    tail=("Dm Dm", ["D32", "D32"]),
    versions=dict(main=dict(style=(
        "A wry, dim late-night lounge-synth groove for a scavenger market in a lonely retro pixel-art space game, "
        "D Dorian: a mellow electric piano and a muted analog synth lead with slow vibrato, a round synth bass walking "
        "slowly, a soft brushed drum machine, a low arpeggiator, dusty tape echo and big reverb. Lonely, smoky and "
        "slightly sly, like a salvage market at night in the cold; dim, not happy."))),
    use="store / Copper Market (single)",
)

# ---------------------------------------------------------------- iron-regent: Guardian I (D minor / Phrygian, 116)
P["iron-regent"] = dict(
    key="Dm", bpm=116, stage=1, kind="single",
    sections=dict(
        intro=wholes("Dm Dm Eb Eb", "D, D, _E, _E,"),
        T1=sec("Dm Dm Eb Eb", ["D16 A16", "d24 c8", "B32", "G24 F8"]),
        T2=sec("Dm Dm C C", ["A16 F16", "D32", "E16 G16", "C32"]),
        R1=ost("Dm Dm Eb Eb", [riff("D", "_E", "A,", "C")] * 2 + [riff("_E", "F", "B,", "_D")] * 2),
        R2=ost("Dm Dm C C", [riff("D", "_E", "A,", "C")] * 2 + [riff("C", "_D", "G,", "B,")] * 2),
        S1=sec("Gm Gm Dm Dm", ["d32", "c16 B16", "A32", "F16 D16"]),
        S2=sec("Eb Eb Dm Dm", ["B32", "G16 B16", "A32", "A24 z8"]),
        W1=wholes("Dm Dm Dm Dm", "D, D, D, D,"),
        W2=ost("Eb Eb C C", [pulse("_E,")] * 2 + [pulse("C,"), "C, C, C, C, C C C C"])),
    form=[("intro", "intro"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("R1", "instrumental"), ("R2", "instrumental"),
          ("S1", "instrumental"), ("S2", "instrumental"), ("T1", "instrumental"), ("T2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("S1", "instrumental"), ("S2", "instrumental"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("R1", "instrumental"), ("R2", "instrumental")],
    tail=("Dm Dm", ["D32", "D32"]),
    versions=dict(main=dict(style=(
        "Dark, menacing boss battle music for a lonely retro pixel-art space game, a 1980s sci-fi synth score with "
        "cinematic weight: a colossal crowned gate machine of armoured iron blocks the way. A relentless dark synth-bass "
        "ostinato, an electronic drum machine with a gated snare and huge low toms, minor-second synth stabs, massive "
        "low brass swells, a lonely cello line, cold analog pads, rusted metallic percussion, tape echo and vast reverb. "
        "Stern, heavy, tense and relentless, never heroic."))),
    use="Guardian I (single, battle)",
)

# ---------------------------------------------------------------- glass-cathedral: Stage II theme A (A minor, 92)
P["glass-cathedral"] = dict(
    key="Am", bpm=92, stage=2, kind="pair",
    sections=dict(
        intro=wholes("Am Am Bb Bb", "e e d d"),
        G1=sec("Am Am F F", ["e32", "a16 e16", "f32", "e16 c16"]),
        G2=sec("Dm Dm Bb Bb", ["d32", "f16 e16", "f32", "d32"]),
        H1=wholes("Am Am Em Em", "c c B B"),
        H2=wholes("F F Bb Bb", "c c d d"),
        L1=sec("Dm Dm Am Am", ["f24 e8", "d32", "e24 c8", "A32"]),
        L2=sec("Bb Bb Em Em", ["d24 c8", "d32", "B24 G8", "E32"]),
        W1=wholes("Am Am Am Am", "e e e e"),
        W2=wholes("F F Bb Bb", "f f d d")),
    form=[("intro", "intro"),
          ("G1", "instrumental"), ("G2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental"),
          ("L1", "instrumental"), ("L2", "instrumental"), ("G1", "instrumental"), ("G2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("L1", "instrumental"), ("L2", "instrumental"),
          ("G1", "instrumental"), ("G2", "instrumental")],
    tail=("Am Am", ["A32", "A32"]),
    versions=dict(
        explore=dict(style=explore(S2, "Inside a vast abandoned cathedral of violet optical glass whose panes ring "
                                   "faintly when light passes.", "Eerie, cold, lonely and haunted.")),
        battle=dict(style=battle(S2B, "A fight inside a vast cathedral of violet glass that rings with every hit."),
                    over=dict(
                        H1=ost("Am Am Em Em", [riff("A,", "_B,", "E,", "G,")] * 2 + [riff("E,", "F,", "B,,", "D,")] * 2),
                        H2=ost("F F Bb Bb", [riff("F,", "_G,", "C,", "E,")] * 2 + [riff("_B,", "=B,", "F,", "_A,")] * 2),
                        W2=ost("F F Bb Bb", [pulse("F,")] * 2 + [pulse("_B,"), "_B, _B, _B, _B, _B _B _B _B"]))),
    ),
    use="Stage II map + combat (pair)",
)

# ---------------------------------------------------------------- choir-weather: Stage II theme B (E minor / Phrygian, 100)
P["choir-weather"] = dict(
    key="Em", bpm=100, stage=2, kind="pair",
    sections=dict(
        intro=wholes("Em Em F F", "B B A A"),
        W1=sec("Em Em C C", ["B32", "e16 d16", "c32", "B16 G16"]),
        W2=sec("Am Am Bm Bm", ["A32", "c16 B16", "B32", "f16 d16"]),
        X1=wholes("Em Em C C", "g g e e"),
        X2=wholes("F F Em Em", "a a g g"),
        Y1=sec("Am Am Em Em", ["c24 B8", "A32", "B24 G8", "E32"]),
        Y2=sec("C C Bm Bm", ["e24 d8", "c32", "d24 B8", "f32"]),
        Z1=wholes("Em Em Em Em", "B B B B"),
        Z2=wholes("C C F F", "c c A A")),
    form=[("intro", "intro"),
          ("W1", "instrumental"), ("W2", "instrumental"), ("X1", "instrumental"), ("X2", "instrumental"),
          ("Y1", "instrumental"), ("Y2", "instrumental"), ("W1", "instrumental"), ("W2", "instrumental"),
          ("Z1", "interlude"), ("Z2", "interlude"), ("Y1", "instrumental"), ("Y2", "instrumental"),
          ("W1", "instrumental"), ("W2", "instrumental"), ("X1", "instrumental"), ("X2", "instrumental")],
    tail=("Em Em", ["E32", "E32"]),
    versions=dict(
        explore=dict(style=explore("eerie glass harmonica pads, celesta and ghostly chimes, soft wind-like noise "
                                   "swells, a felt piano and a lonely cello", "Drifting through violet glass fog inside "
                                   "a hall so large it has its own weather; the panes ring faintly in the wind.",
                                   "Hazy, cold, restless and eerie.")),
        battle=dict(style=battle("stormy rolling toms, fast glass mallet arpeggios and ghostly chimes",
                                 "A fight in a storm of violet glass and ringing light."),
                    over=dict(
                        X1=ost("Em Em C C", [riff("E,", "=F,", "B,,", "D,")] * 2 + [riff("C,", "_D,", "G,,", "B,,")] * 2),
                        X2=ost("F F Em Em", [riff("=F,", "G,", "C,", "E,")] * 2 + [riff("E,", "=F,", "B,,", "D,")] * 2),
                        Z2=ost("C C F F", [pulse("C,")] * 2 + [pulse("=F,"), "=F, =F, =F, =F, =F =F =F =F"]))),
    ),
    use="Stage II map + combat (pair)",
)

# ---------------------------------------------------------------- hollow-choir: Guardian II (A minor / Phrygian, 108)
P["hollow-choir"] = dict(
    key="Am", bpm=108, stage=2, kind="single",
    sections=dict(
        intro=wholes("Am Am Bb Bb", "A, A, _B, _B,"),
        T1=sec("Am Am Bb Bb", ["e32", "f16 e16", "d32", "f16 d16"]),
        T2=sec("F F Em Em", ["c32", "A16 c16", "B32", "E24 z8"]),
        O1=ost("Am Am Bb Bb", [riff("A,", "_B,", "E,", "G,")] * 2 + [riff("_B,", "=B,", "F,", "_A,")] * 2),
        O2=ost("F F Em Em", [riff("F,", "_G,", "C,", "E,")] * 2 + [riff("E,", "F,", "B,,", "D,")] * 2),
        S1=sec("Dm Dm Am Am", ["f32", "e16 d16", "e32", "c16 A16"]),
        S2=sec("Bb Bb Em Em", ["d32", "f16 d16", "B32", "B24 z8"]),
        W1=wholes("Am Am Am Am", "A, A, A, A,"),
        W2=ost("F F Em Em", [pulse("F,")] * 2 + [pulse("E,"), "E, E, E, E, E E E E"])),
    form=[("intro", "intro"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("O1", "instrumental"), ("O2", "instrumental"),
          ("S1", "instrumental"), ("S2", "instrumental"), ("T1", "instrumental"), ("T2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("S1", "instrumental"), ("S2", "instrumental"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("O1", "instrumental"), ("O2", "instrumental")],
    tail=("Am Am", ["A32", "A32"]),
    versions=dict(main=dict(style=(
        "Haunting, dark boss battle music for a lonely retro pixel-art space game, a 1980s sci-fi synth score with "
        "cinematic weight: a cathedral engine of violet glass bells and organ pipes that will not let go. Tolling glass "
        "bells, a dark pipe organ, eerie glass tones and fast glass mallet ostinati, a relentless dark synth-bass "
        "ostinato, an electronic drum machine with a gated snare and huge toms, minor-second stabs, cold analog pads, "
        "tape echo and vast reverb. Cold, tragic, menacing and relentless, never heroic."))),
    use="Guardian II (single, battle)",
)

# ---------------------------------------------------------------- blackout-heart: Stage III theme A (C minor / Phrygian, 116)
BH_H1 = sec("Cm Cm Ab Ab", ["G32", "c16 B16", "A32", "G16 E16"])
BH_H2 = sec("Fm Fm Gm Gm", ["c32", "A16 F16", "B32", "G24 z8"])
BH_P1 = ost("Cm Cm Db Db", [riff("C,", "_D,", "G,,", "B,,")] * 2 + [riff("_D,", "=D,", "A,,", "C,")] * 2)
BH_P2 = ost("Ab Ab Gm Gm", [riff("A,", "=A,", "E,", "G,")] * 2 + [riff("G,", "A,", "D,", "F,")] * 2)
BH_E1 = sec("Fm Fm Cm Cm", ["A24 G8", "F32", "G24 E8", "C32"])
BH_E2 = sec("Db Db Cm Cm", ["F24 E8", "F32", "E24 =D8", "C32"])
P["blackout-heart"] = dict(
    key="Cm", bpm=116, stage=3, kind="pair",
    sections=dict(
        intro=wholes("Cm Cm Db Db", "G, G, A, A,"),
        H1=BH_H1, H2=BH_H2,
        P1=wholes("Cm Cm Db Db", "C C _D _D"),
        P2=wholes("Ab Ab Gm Gm", "C C B, B,"),
        E1=BH_E1, E2=BH_E2,
        W1=wholes("Cm Cm Cm Cm", "C, C, C, C,"),
        W2=wholes("Ab Ab Gm Gm", "C C B, D")),
    form=[("intro", "intro"),
          ("H1", "instrumental"), ("H2", "instrumental"), ("P1", "instrumental"), ("P2", "instrumental"),
          ("E1", "instrumental"), ("E2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("E1", "instrumental"), ("E2", "instrumental"),
          ("H1", "instrumental"), ("H2", "instrumental"), ("P1", "instrumental"), ("P2", "instrumental")],
    tail=("Cm Cm", ["C32", "C32"]),
    versions=dict(
        explore=dict(style=explore(S3, "Approaching a vast ember-red sphere of archive machinery at the dark heart of a "
                                   "ring of relays; its slow heartbeat still sounds.", "Grave, dark, lonely and ominous.")),
        battle=dict(style=battle(S3B, "A fight at the burning red heart of a dark archive machine."),
                    over=dict(P1=BH_P1, P2=BH_P2,
                              W2=ost("Ab Ab Gm Gm", [pulse("A,")] * 2 + [pulse("G,"), "G, G, G, G, G G G G"]))),
    ),
    use="Stage III map + combat (pair)",
)

# ---------------------------------------------------------------- last-orders: Stage III theme B (C minor, 120)
P["last-orders"] = dict(
    key="Cm", bpm=120, stage=3, kind="pair",
    sections=dict(
        intro=wholes("Cm Cm Gm Gm", "C C D D"),
        O1=sec("Cm Cm Ab Ab", ["c32", "B16 G16", "A32", "c16 A16"]),
        O2=sec("Fm Fm Gm Gm", ["A32", "G16 F16", "G32", "D24 z8"]),
        M1=wholes("Cm Cm Db Db", "E E F F"),
        M2=wholes("Ab Ab Gm Gm", "E E D D"),
        L1=sec("Fm Fm Cm Cm", ["c24 B8", "A32", "G24 F8", "E32"]),
        L2=sec("Db Db Gm Gm", ["F24 E8", "F32", "D24 B,8", "D32"]),
        W1=wholes("Cm Cm Cm Cm", "G, G, G, G,"),
        W2=wholes("Ab Ab Gm Gm", "A, A, G, G,")),
    form=[("intro", "intro"),
          ("O1", "instrumental"), ("O2", "instrumental"), ("M1", "instrumental"), ("M2", "instrumental"),
          ("L1", "instrumental"), ("L2", "instrumental"), ("O1", "instrumental"), ("O2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("L1", "instrumental"), ("L2", "instrumental"),
          ("O1", "instrumental"), ("O2", "instrumental"), ("M1", "instrumental"), ("M2", "instrumental")],
    tail=("Cm Cm", ["C32", "C32"]),
    versions=dict(
        explore=dict(style=explore("a slow low brass and cello chorale, deep ember drones and a steady ticking pulse",
                                   "Machines at the heart of a dark archive still carrying out their last orders, "
                                   "thirty years on.", "Dutiful, grave, cold and lonely.")),
        battle=dict(style=battle("a marching drum machine, low brass stabs and ember drones",
                                 "A fight against the dutiful machines guarding a dark archive."),
                    over=dict(
                        M1=ost("Cm Cm Db Db", [riff("C,", "_D,", "G,,", "B,,")] * 2 + [riff("_D,", "=D,", "A,,", "C,")] * 2),
                        M2=ost("Ab Ab Gm Gm", [riff("A,", "=A,", "E,", "G,")] * 2 + [riff("G,", "A,", "D,", "F,")] * 2),
                        W2=ost("Ab Ab Gm Gm", [pulse("A,")] * 2 + [pulse("G,"), "G, G, G, G, G G G G"]))),
    ),
    use="Stage III map + combat (pair)",
)

# ---------------------------------------------------------------- event-horizon: the Blackout Core (C minor, 126), 3 layers
P["event-horizon"] = dict(
    key="Cm", bpm=126, stage=3, kind="layers",
    sections=dict(
        intro=wholes("Cm Cm Db Db", "C, C, _D, _D,"),
        H1=BH_H1, H2=BH_H2, D1=BH_P1, D2=BH_P2,
        Q1=sec("Cm Cm Db Db", ["c8 c8 c8 =B8", "c32", "_d8 _d8 _d8 c8", "_d32"]),
        Q2=sec("Ab Ab Gm Gm", ["e8 e8 e8 d8", "c32", "d8 d8 d8 c8", "B32"]),
        E1=BH_E1, E2=BH_E2),
    form=[("intro", "intro"),
          ("H1", "instrumental"), ("H2", "instrumental"), ("D1", "instrumental"), ("D2", "instrumental"),
          ("Q1", "instrumental"), ("Q2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental"),
          ("E1", "instrumental"), ("E2", "instrumental"), ("D1", "instrumental"), ("D2", "instrumental"),
          ("Q1", "instrumental"), ("Q2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental")],
    tail=("Cm Cm", ["C32", "C32"]),
    versions=dict(
        custody=dict(style=(
            "Tense, dark final boss music for a lonely retro pixel-art space game, first phase, a 1980s sci-fi synth "
            "score: a vast ember-red sphere of archive machinery holds its shell closed. A slow heavy heartbeat on low "
            "drums, a dark synth-bass pulse, ember drones, low brass swells, cold analog pads, a tense low arpeggiator, "
            "tape echo and vast reverb. Controlled, grave, ominous and cold.")),
        emergency=dict(style=(
            "Intense, dark final boss music for a lonely retro pixel-art space game, second phase, a 1980s sci-fi synth "
            "score: the ember-red archive machine spends its last reserves. A relentless dark synth-bass ostinato, an "
            "electronic drum machine with a gated snare and pounding toms, a tense fast arpeggiator, minor-second synth "
            "stabs, ember drones and low brass, tape echo. Urgent, menacing and relentless, never heroic.")),
        horizon=dict(style=(
            "Overwhelming, dark final boss music for a lonely retro pixel-art space game, last phase, a 1980s sci-fi "
            "synth score: the ember-red machine pulls every light inward. A thundering drum machine and huge toms with a "
            "gated snare, a roaring distorted synth-bass ostinato, screaming minor-second synth stabs, massive low brass "
            "and a desperate cello line, ember drones, tolling glass bells, tape echo and vast reverb. Desperate, "
            "menacing and relentless, never heroic.")),
    ),
    use="Blackout Core (three synced phase layers)",
)

# ---------------------------------------------------------------- an-answer: the ending (D minor -> F major, 84), the exception
P["an-answer"] = dict(
    key="F", bpm=84, stage=0, kind="single",
    negative=NEGATIVE_ENDING,
    sections=dict(
        intro=wholes("Dm Dm Bb Bb", "A A F F"),
        Q1=sec("Dm Dm Bb Bb", ["A32", "d16 c16", "A32", "G16 F16"]),
        Q2=sec("Gm Gm C C", ["B32", "A16 G16", "G32", "E16 G16"]),
        S1=sec("F F C C", ["A32", "c16 A16", "G32", "E16 G16"]),
        S2=sec("Bb Bb F F", ["F32", "D16 F16", "A32", "c32"]),
        T1=sec("F F Dm Dm", ["c32", "f16 e16", "d32", "A16 d16"]),
        T2=sec("Bb Bb C C", ["d32", "c16 B16", "c32", "G32"]),
        C1=wholes("F F F F", "A A A A"),
        C2=wholes("Bb Bb C C", "F F E E")),
    form=[("intro", "intro"), ("Q1", "intro"), ("Q2", "intro"), ("S1", "instrumental"), ("S2", "instrumental"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("C1", "interlude"), ("C2", "interlude"),
          ("S1", "instrumental"), ("S2", "instrumental"), ("T1", "instrumental"), ("T2", "instrumental"),
          ("C1", "interlude"), ("C2", "interlude")],
    tail=("F F", ["F32", "F32"]),
    versions=dict(main=dict(style=(
        "Hopeful, luminous ending music for a lonely retro pixel-art space game, a 1980s sci-fi film synth score, "
        "Vangelis-like: after thirty-one years of silence the lamps of a ring of relays come back on one by one and, far "
        "below the clouds, a radio finally receives an answer. It begins dark and lonely, a felt piano and a cold analog "
        "pad on a slow minor phrase; then warm analog synth pads swell with slow filter sweeps, a soft low arpeggiator "
        "starts, a singing synth lead with slow vibrato and a cello carry the theme into a major key, glass bells ring, "
        "tape echo and vast reverb. Bittersweet, grateful and finally hopeful; slow and spacious."))),
    use="ending (single; the one hopeful piece)",
)

# ---------------------------------------------------------------- line-quiet: game over (D minor, 70), short
P["line-quiet"] = dict(
    key="Dm", bpm=70, stage=0, kind="single",
    sections=dict(
        intro=wholes("Dm Dm Dm Dm", "A A A A"),
        T1=TTL1,
        L1=wholes("Gm Gm Am Am", "G F E E")),
    form=[("intro", "intro"), ("T1", "interlude"), ("L1", "outro")],
    tail=("Bb Bb", ["F32", "F32"]),
    versions=dict(main=dict(style=(
        "Short, quiet game over music for a lonely retro pixel-art space game: the line goes quiet. A lonely felt piano "
        "plays a slow, sad minor phrase over a cold analog synth pad and a sub-bass drone, a faint slow pulse like a "
        "blinking lamp, a distant glass bell, tape echo and vast reverb; it fades and ends open and unresolved. Sparse, "
        "still, desolate. No drums."))),
    use="game over (single, short; no loop)",
    loop=False,
)


# ================================================================================================ plan machinery
KEYACC = {"Dm": {"B": -1}, "Am": {}, "Em": {"F": 1}, "Cm": {"B": -1, "E": -1, "A": -1}, "F": {"B": -1}}
TONIC = {"Dm": "D", "Am": "A", "Em": "E", "Cm": "C", "F": "F"}


def negative(pid):
    return P[pid].get("negative", NEGATIVE)


def bars_of(pid, version):
    """[(chord, ins, label, section_name)] for every bar of one version, intro + body + tail."""
    p = P[pid]
    over = p["versions"][version].get("over", {})
    out = []
    for name, label in p["form"]:
        chords, bars = over.get(name, p["sections"][name])
        assert chords == p["sections"][name][0], f"{pid}/{version}/{name}: chords differ"
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
    sections = [(4 * i, name, label) for i, (name, label) in enumerate(p["form"])]
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
    h = int(hashlib.sha256(f"ttl2/{pid}/{version}".encode()).hexdigest()[:6], 16) % 900000 + 100000
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
        print(style_text(pid, version) + "\n\nNEGATIVE: " + negative(pid) + "\n")
        print(score(pid, version))
        sys.exit()
    for pid in P:
        L = check(pid)
        dur = L["bars"] * L["bar_s"]
        print(f"{pid:16} {P[pid]['key']:3} {P[pid]['bpm']:4} BPM  bars {L['bars']:3} (intro {L['intro']}, loop "
              f"{L['loop'][0]}-{L['loop'][1]}, tail {L['tail']})  {dur:6.1f}s  loop {L['loop'][0] * L['bar_s']:.2f}-"
              f"{L['loop'][1] * L['bar_s']:.2f}s  versions {list(P[pid]['versions'])}")
