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
          "a choir, wordless choir aahs, vocal pads, humming, a solo voice, pop song with a lead vocalist.")
NEGATIVE = (VOICES + " Happy, cheerful, joyful, uplifting, hopeful, triumphant, heroic fanfare, major key, bright pop, "
            "feel-good, playful, whimsical, children's music, corporate, upbeat, epic trailer, sunny, upbeat synthwave, "
            "outrun. Generic EDM club dance track with a four-on-the-floor kick.")
NEGATIVE_ENDING = (VOICES + " Cheerful, bright pop, feel-good, playful, whimsical, children's music, corporate, upbeat, "
                   "sunny, epic trailer. Generic EDM club dance track with a four-on-the-floor kick.")
SUFFIX = " Purely instrumental."

# ------------------------------------------------------------------------------------------------ style vocabulary
EXPLORE = ("Dark, melancholic 1980s sci-fi film synth score for a lonely retro pixel-art space game, deep space "
           "ambient: slow-evolving retro analog synthesizer pads with filter sweeps, a soft low 16th-note "
           "arpeggiator, a sub-bass drone on a pedal tone, a sparse lonely lead with slow vibrato, tape echo and vast "
           "reverb, lots of space")
BATTLE = (EXPLORE + ", an anxious interlocking sequence of delicate analog arpeggios and pulsing muted bass, "
          "restrained syncopated percussion with brushed metallic ticks and dry rim clicks, evolving melodic "
          "counterpoint, a distant heartbeat under the music, fragile suspended minor harmonies. "
          "An intimate tactical encounter cue, with the same lonely reflective atmosphere as exploration")
S1 = "far-off rusted metallic percussion, a lonely cello, a soft felt piano and faint glass bells"
S1B = "rusted metallic percussion, a lonely cello line and heavy low toms"
S2 = "eerie glass tones, celesta and ghostly chimes, a soft felt piano and a lonely cello"
S2B = "eerie glass tones, fast glass mallet ostinati and ghostly chimes"
S3 = "ember drones, low brass swells, a slow heartbeat pulse and a lonely cello"
S3B = "ember drones, low brass swells and a heavy heartbeat kick"
MOOD_E = "Cold, lonely, mysterious and desolate."
MOOD_B = "Anxious, cold and unresolved; intricate, quietly dangerous momentum."


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


def pedal(r, n=4):
    """n bars of the pedal ostinato on one of the pre-spelled roots below (the chords above it keep changing)."""
    return [PEDAL[r]] * n


# pedal ostinati, spelled per key signature: root, root, minor second (Phrygian), root, root, low fifth, minor 7th, root
PEDAL = {
    "D@Dm": riff("D", "_E", "A,", "C"), "A@Dm": riff("A,", "B,", "E,", "G,"),          # K:Dm: B = Bb
    "A@Am": riff("A,", "_B,", "E,", "G,"), "D@Am": riff("D,", "_E,", "A,,", "C,"), "E@Am": riff("E,", "F,", "B,,", "D,"),
    "E@Em": riff("E,", "=F,", "B,,", "=D,"),                                         # K:Em: F = F#
    "C@Cm": riff("C,", "_D,", "G,,", "B,,"), "F@Cm": riff("F,", "_G,", "C,", "E,"),  # K:Cm: B, E, A flat
    "G@Cm": riff("G,", "A,", "D,", "=F,"),
}


def pulse(note, n=8):
    return " ".join([note] * n)


# ================================================================================================ PIECES
# Plans v2.1 (after the first v2 pilots): the tonic sits on about half of all bars and the major chords (bVI, bII) on
# at most a sixteenth; v is minor; battle grooves are pedal-tone ostinati on the tonic (or the chord root of i / iv / v),
# never on a major chord's root. (v2.0's Dm-Dm-Bb-Bb | Gm-Gm-Am-Am read as F / Bb major on key profiles.)
P = {}

# ---------------------------------------------------------------- the TTL theme, dark (D minor): slow, long notes
TTL1 = sec("Dm Dm Gm Gm", ["A32", "d16 c16", "B32", "A16 G16"])
TTL2 = sec("Dm Dm Am Am", ["F32", "E16 D16", "E32", "E24 z8"])

P["title"] = dict(
    key="Dm", bpm=92, stage=0, kind="single",
    sections=dict(
        intro=wholes("Dm Dm Dm Dm", "D D D D"),
        T1=TTL1, T2=TTL2,
        P1=wholes("Dm Dm Bb Bb", "F F F F"),
        P2=wholes("Gm Gm Am Am", "D D E E"),
        B1=sec("Dm Dm Eb Eb", ["d32", "f16 d16", "g32", "f16 _e16"]),
        B2=sec("Dm Dm Am Am", ["d32", "c16 A16", "c32", "A24 z8"]),
        Q1=wholes("Dm Dm Dm Dm", "A A A A"),
        Q2=wholes("Gm Gm Am Am", "B B A A")),
    form=[("intro", "intro"), ("T1", "intro"), ("T2", "intro"), ("P1", "instrumental"), ("P2", "instrumental"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("B1", "instrumental"), ("B2", "instrumental"),
          ("Q1", "interlude"), ("Q2", "interlude"), ("T1", "instrumental"), ("T2", "instrumental"),
          ("P1", "instrumental"), ("P2", "instrumental")],
    tail=("Dm Dm", ["D32", "D32"]),
    versions=dict(main=dict(style=(
        "Main title theme of a lonely retro pixel-art space game: a slow, dark, spacey 1980s sci-fi film synth score, "
        "deep space ambient. Cold analog synthesizer pads swelling with slow filter sweeps, a sub-bass drone on a pedal "
        "tone, a soft low 16th-note arpeggiator, a sparse melancholic square-wave lead with slow vibrato and tape echo, a "
        "felt piano and a lonely cello answering, faint glass bells, a soft slow pulse like a blinking lamp; vast reverb "
        "and space. Dark, mysterious, desolate and melancholic."))),
    use="title screen (single)",
)

P["relay-seven"] = dict(
    key="Dm", bpm=76, stage=0, kind="single",
    sections=dict(
        intro=wholes("Dm Dm Dm Dm", "A A A A"),
        P1=TTL1, P2=TTL2,
        L1=wholes("Dm Dm Dm Dm", "A A A A"),
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
        intro=wholes("Dm Dm Dm Dm", "D D D D"),
        A1=sec("Dm Dm Gm Gm", ["A32", "c16 A16", "B32", "A16 G16"]),
        A2=sec("Dm Dm Am Am", ["F32", "E16 D16", "E32", "E24 z8"]),
        G1=wholes("Dm Dm Bb Bb", "d d d d"),
        G2=wholes("Gm Gm Am Am", "d d e e"),
        B1=sec("Dm Dm Eb Eb", ["f32", "a16 f16", "g32", "f16 _e16"]),
        B2=sec("Dm Dm Am Am", ["d32", "f16 e16", "e32", "c16 A16"]),
        R1=wholes("Dm Dm Dm Dm", "A A A A"),
        R2=wholes("Gm Gm Am Am", "B B A A")),
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
                        G1=ost("Dm Dm Bb Bb", pedal("D@Dm")),
                        G2=ost("Gm Gm Am Am", pedal("D@Dm", 2) + pedal("A@Dm", 2)),
                        R2=ost("Gm Gm Am Am", [pulse("D")] * 2 + [pulse("A,"), "A, A, A, A, A A A A"]))),
    ),
    use="Stage I map + combat (pair)",
)

# ---------------------------------------------------------------- rust-kingdom: Stage I theme B (A minor, 100)
P["rust-kingdom"] = dict(
    key="Am", bpm=100, stage=1, kind="pair",
    sections=dict(
        intro=wholes("Am Am Am Am", "A A A A"),
        R1=sec("Am Am Dm Dm", ["E32", "G16 E16", "F32", "E16 D16"]),
        R2=sec("Am Am Em Em", ["C32", "B,16 A,16", "B,32", "B,24 z8"]),
        H1=wholes("Am Am F F", "e e f f"),
        H2=wholes("Dm Dm Em Em", "f f g g"),
        S1=sec("Am Am Bb Bb", ["c32", "e16 c16", "d32", "_B16 A16"]),
        S2=sec("Am Am Em Em", ["A32", "c16 B16", "B32", "G24 z8"]),
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
                        H1=ost("Am Am F F", pedal("A@Am")),
                        H2=ost("Dm Dm Em Em", pedal("D@Am", 2) + pedal("E@Am", 2)),
                        W2=ost("Dm Dm Em Em", [pulse("D,")] * 2 + [pulse("E,"), "E, E, E, E, E E E E"]))),
    ),
    use="Stage I map + combat (pair)",
)

# ---------------------------------------------------------------- exchange: the Salvage Exchange (A minor lounge, 94)
P["exchange"] = dict(
    key="Am", bpm=94, stage=0, kind="single",
    sections=dict(
        intro=wholes("Am Am Am Am", "E E E E"),
        M1=sec("Am Am Dm Dm", ["e12 d4 c16", "A32", "f12 e4 d16", "A32"]),
        M2=sec("Am Am Em Em", ["c12 B4 A16", "E32", "B12 A4 G16", "E32"]),
        V1=wholes("Am Am Dm Dm", "A, A, D D"),
        V2=wholes("F F Em Em", "F, F, E, E,"),
        B1=sec("Dm Dm Am Am", ["f24 e8", "d32", "e24 d8", "c32"]),
        B2=sec("Dm Dm Em Em", ["d24 c8", "A32", "B24 A8", "B32"])),
    form=[("intro", "intro"),
          ("M1", "instrumental"), ("M2", "instrumental"), ("V1", "interlude"), ("V2", "interlude"),
          ("B1", "instrumental"), ("B2", "instrumental"), ("M1", "instrumental"), ("M2", "instrumental"),
          ("V1", "interlude"), ("V2", "interlude"), ("B1", "instrumental"), ("B2", "instrumental")],
    tail=("Am Am", ["A32", "A32"]),
    versions=dict(main=dict(style=(
        "A wry, dim late-night lounge-synth groove in A minor for a scavenger market in a lonely retro pixel-art space "
        "game: a mellow electric piano on minor seventh chords, a muted analog synth lead with slow vibrato, a round synth "
        "bass walking slowly, a soft brushed drum machine, a low arpeggiator, dusty tape echo and big reverb. Lonely, "
        "smoky and slightly sly, like a salvage market at night in the cold; dim, never happy."))),
    use="store / Copper Market (single)",
)

# ---------------------------------------------------------------- iron-regent: Guardian I (D minor / Phrygian, 116)
P["iron-regent"] = dict(
    key="Dm", bpm=116, stage=1, kind="single",
    sections=dict(
        intro=wholes("Dm Dm Dm Dm", "D, D, D, D,"),
        T1=sec("Dm Dm Eb Eb", ["D16 A16", "d24 c8", "B32", "G24 F8"]),
        T2=sec("Dm Dm Am Am", ["A16 F16", "D32", "E16 C16", "A,32"]),
        R1=ost("Dm Dm Eb Eb", pedal("D@Dm")),
        R2=ost("Dm Dm Am Am", pedal("D@Dm", 2) + pedal("A@Dm", 2)),
        S1=sec("Gm Gm Dm Dm", ["d32", "c16 B16", "A32", "F16 D16"]),
        S2=sec("Dm Dm Am Am", ["F32", "D16 F16", "E32", "E24 z8"]),
        W1=wholes("Dm Dm Dm Dm", "D, D, D, D,"),
        W2=ost("Gm Gm Am Am", [pulse("D")] * 2 + [pulse("A,"), "A, A, A, A, A A A A"])),
    form=[("intro", "intro"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("R1", "instrumental"), ("R2", "instrumental"),
          ("S1", "instrumental"), ("S2", "instrumental"), ("T1", "instrumental"), ("T2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("S1", "instrumental"), ("S2", "instrumental"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("R1", "instrumental"), ("R2", "instrumental")],
    tail=("Dm Dm", ["D32", "D32"]),
    versions=dict(main=dict(style=(
        "Dark, menacing boss battle music for a lonely retro pixel-art space game, a 1980s sci-fi film synth score with "
        "cinematic weight: a colossal crowned gate machine of armoured iron blocks the way. A relentless dark synth-bass "
        "ostinato on a pedal tone, huge gated-reverb toms and a gated snare, minor-second synth stabs, massive low brass "
        "swells, a lonely cello line, cold analog pads, rusted metallic percussion, tape echo and vast reverb. Stern, "
        "heavy, tense and relentless, never heroic."))),
    use="Guardian I (single, battle)",
)

# ---------------------------------------------------------------- glass-cathedral: Stage II theme A (A minor, 92)
P["glass-cathedral"] = dict(
    key="Am", bpm=92, stage=2, kind="pair",
    sections=dict(
        intro=wholes("Am Am Am Am", "e e e e"),
        G1=sec("Am Am Dm Dm", ["e32", "a16 e16", "f32", "e16 d16"]),
        G2=sec("Am Am Em Em", ["c32", "B16 A16", "B32", "B24 z8"]),
        H1=wholes("Am Am Bb Bb", "c c d d"),
        H2=wholes("Dm Dm Em Em", "f f g g"),
        L1=sec("Am Am F F", ["A32", "c16 e16", "c32", "A16 F16"]),
        L2=sec("Dm Dm Em Em", ["d32", "f16 d16", "e32", "E32"]),
        W1=wholes("Am Am Am Am", "e e e e"),
        W2=wholes("Dm Dm Em Em", "f f e e")),
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
                        H1=ost("Am Am Bb Bb", pedal("A@Am")),
                        H2=ost("Dm Dm Em Em", pedal("D@Am", 2) + pedal("E@Am", 2)),
                        W2=ost("Dm Dm Em Em", [pulse("D,")] * 2 + [pulse("E,"), "E, E, E, E, E E E E"]))),
    ),
    use="Stage II map + combat (pair)",
)

# ---------------------------------------------------------------- choir-weather: Stage II theme B (E minor / Phrygian, 100)
P["choir-weather"] = dict(
    key="Em", bpm=100, stage=2, kind="pair",
    sections=dict(
        intro=wholes("Em Em Em Em", "B B B B"),
        W1=sec("Em Em Am Am", ["B32", "e16 =d16", "c32", "B16 A16"]),
        W2=sec("Em Em Bm Bm", ["G32", "F16 E16", "F32", "F24 z8"]),
        X1=wholes("Em Em C C", "g g g g"),
        X2=wholes("Am Am Bm Bm", "e e f f"),
        Y1=sec("Em Em F F", ["B32", "g16 e16", "a32", "=f16 e16"]),
        Y2=sec("Em Em Bm Bm", ["e32", "g16 f16", "f32", "=d24 z8"]),
        Z1=wholes("Em Em Em Em", "B B B B"),
        Z2=wholes("Am Am Bm Bm", "c c B B")),
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
                        X1=ost("Em Em C C", pedal("E@Em")),
                        X2=ost("Am Am Bm Bm", pedal("E@Em")),
                        Z2=ost("Am Am Bm Bm", [pulse("A,")] * 2 + [pulse("B,"), "B, B, B, B, B B B B"]))),
    ),
    use="Stage II map + combat (pair)",
)

# ---------------------------------------------------------------- hollow-choir: Guardian II (A minor / Phrygian, 108)
P["hollow-choir"] = dict(
    key="Am", bpm=108, stage=2, kind="single",
    sections=dict(
        intro=wholes("Am Am Am Am", "A, A, A, A,"),
        T1=sec("Am Am Bb Bb", ["e32", "f16 e16", "d32", "f16 d16"]),
        T2=sec("Am Am Em Em", ["c32", "A16 c16", "B32", "E24 z8"]),
        O1=ost("Am Am Bb Bb", pedal("A@Am")),
        O2=ost("Dm Dm Em Em", pedal("D@Am", 2) + pedal("E@Am", 2)),
        S1=sec("Dm Dm Am Am", ["f32", "e16 d16", "e32", "c16 A16"]),
        S2=sec("Am Am Em Em", ["c32", "e16 c16", "B32", "B24 z8"]),
        W1=wholes("Am Am Am Am", "A, A, A, A,"),
        W2=ost("Dm Dm Em Em", [pulse("D,")] * 2 + [pulse("E,"), "E, E, E, E, E E E E"])),
    form=[("intro", "intro"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("O1", "instrumental"), ("O2", "instrumental"),
          ("S1", "instrumental"), ("S2", "instrumental"), ("T1", "instrumental"), ("T2", "instrumental"),
          ("W1", "interlude"), ("W2", "interlude"), ("S1", "instrumental"), ("S2", "instrumental"),
          ("T1", "instrumental"), ("T2", "instrumental"), ("O1", "instrumental"), ("O2", "instrumental")],
    tail=("Am Am", ["A32", "A32"]),
    versions=dict(main=dict(style=(
        "Haunting, dark boss battle music for a lonely retro pixel-art space game, a 1980s sci-fi film synth score with "
        "cinematic weight: a cathedral engine of violet glass bells and organ pipes that will not let go. Tolling glass "
        "bells, a dark pipe organ, eerie glass tones and fast glass mallet ostinati, a relentless dark synth-bass "
        "ostinato on a pedal tone, huge gated-reverb toms and a gated snare, minor-second stabs, cold analog pads, tape "
        "echo and vast reverb. Cold, tragic, menacing and relentless, never heroic."))),
    use="Guardian II (single, battle)",
)

# ---------------------------------------------------------------- blackout-heart: Stage III theme A (C minor / Phrygian, 116)
BH_H1 = sec("Cm Cm Fm Fm", ["G32", "c16 B16", "A32", "G16 F16"])
BH_H2 = sec("Cm Cm Gm Gm", ["E32", "D16 C16", "D32", "D24 z8"])
BH_P1 = ost("Cm Cm Db Db", pedal("C@Cm"))
BH_P2 = ost("Fm Fm Gm Gm", pedal("F@Cm", 2) + pedal("G@Cm", 2))
BH_E1 = sec("Cm Cm Ab Ab", ["e32", "g16 e16", "e32", "c16 A16"])
BH_E2 = sec("Fm Fm Gm Gm", ["c32", "A16 F16", "B32", "G24 z8"])
P["blackout-heart"] = dict(
    key="Cm", bpm=116, stage=3, kind="pair",
    sections=dict(
        intro=wholes("Cm Cm Cm Cm", "G, G, G, G,"),
        H1=BH_H1, H2=BH_H2,
        P1=wholes("Cm Cm Db Db", "G G A A"),
        P2=wholes("Fm Fm Gm Gm", "c c d d"),
        E1=BH_E1, E2=BH_E2,
        W1=wholes("Cm Cm Cm Cm", "G, G, G, G,"),
        W2=wholes("Fm Fm Gm Gm", "A, A, B, B,")),
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
                              W2=ost("Fm Fm Gm Gm", [pulse("F,")] * 2 + [pulse("G,"), "G, G, G, G, G G G G"]))),
    ),
    use="Stage III map + combat (pair)",
)

# ---------------------------------------------------------------- last-orders: Stage III theme B (C minor, 120)
P["last-orders"] = dict(
    key="Cm", bpm=120, stage=3, kind="pair",
    sections=dict(
        intro=wholes("Cm Cm Cm Cm", "C C C C"),
        O1=sec("Cm Cm Ab Ab", ["c32", "B16 G16", "c32", "E16 C16"]),
        O2=sec("Cm Cm Gm Gm", ["G32", "F16 E16", "D32", "D24 z8"]),
        M1=wholes("Cm Cm Fm Fm", "E E F F"),
        M2=wholes("Cm Cm Gm Gm", "E E D D"),
        L1=sec("Cm Cm Fm Fm", ["G32", "c16 B16", "A32", "G16 F16"]),
        L2=sec("Cm Cm Gm Gm", ["E32", "D16 C16", "B,32", "D24 z8"]),
        W1=wholes("Cm Cm Cm Cm", "G, G, G, G,"),
        W2=wholes("Fm Fm Gm Gm", "A, A, B, B,")),
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
        battle=dict(style=battle("a marching snare, low brass stabs and ember drones",
                                 "A fight against the dutiful machines guarding a dark archive."),
                    over=dict(
                        M1=ost("Cm Cm Fm Fm", pedal("C@Cm", 2) + pedal("F@Cm", 2)),
                        M2=ost("Cm Cm Gm Gm", pedal("C@Cm", 2) + pedal("G@Cm", 2)),
                        W2=ost("Fm Fm Gm Gm", [pulse("F,")] * 2 + [pulse("G,"), "G, G, G, G, G G G G"]))),
    ),
    use="Stage III map + combat (pair)",
)

# ---------------------------------------------------------------- event-horizon: the Blackout Core (C minor, 126), 3 layers
P["event-horizon"] = dict(
    key="Cm", bpm=126, stage=3, kind="layers",
    sections=dict(
        intro=wholes("Cm Cm Cm Cm", "C, C, C, C,"),
        H1=BH_H1, H2=BH_H2, D1=BH_P1, D2=BH_P2,
        Q1=sec("Cm Cm Db Db", ["c8 c8 c8 =B8", "c32", "_d8 _d8 _d8 c8", "_d32"]),
        Q2=sec("Fm Fm Gm Gm", ["A8 A8 A8 G8", "F32", "G8 G8 G8 F8", "G32"]),
        E1=BH_E1, E2=BH_E2),
    form=[("intro", "intro"),
          ("H1", "instrumental"), ("H2", "instrumental"), ("D1", "instrumental"), ("D2", "instrumental"),
          ("Q1", "instrumental"), ("Q2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental"),
          ("E1", "instrumental"), ("E2", "instrumental"), ("D1", "instrumental"), ("D2", "instrumental"),
          ("Q1", "instrumental"), ("Q2", "instrumental"), ("H1", "instrumental"), ("H2", "instrumental")],
    tail=("Cm Cm", ["C32", "C32"]),
    versions=dict(
        custody=dict(style=(
            "Tense, dark final boss music for a lonely retro pixel-art space game, first phase, a 1980s sci-fi film synth "
            "score: a vast ember-red sphere of archive machinery holds its shell closed. A slow heavy heartbeat on low "
            "drums, a dark synth-bass pulse on a pedal tone, ember drones, low brass swells, cold analog pads, a tense low "
            "arpeggiator, tape echo and vast reverb. Controlled, grave, ominous and cold.")),
        emergency=dict(style=(
            "Intense, dark final boss music for a lonely retro pixel-art space game, second phase, a 1980s sci-fi film "
            "synth score: the ember-red archive machine spends its last reserves. A relentless dark synth-bass ostinato on "
            "a pedal tone, big gated-reverb toms and a gated snare, a tense fast arpeggiator, minor-second synth stabs, "
            "ember drones, low brass and cello swells, tape echo. Urgent, menacing and relentless, never heroic.")),
        horizon=dict(style=(
            "Overwhelming, dark final boss music for a lonely retro pixel-art space game, last phase, a 1980s sci-fi film "
            "synth score: the ember-red machine pulls every light inward. Thundering gated-reverb drums and huge toms, a "
            "roaring distorted synth-bass ostinato, screaming minor-second synth stabs, massive low brass and a desperate "
            "cello line, ember drones, tolling glass bells, tape echo and vast reverb. Desperate, menacing and relentless, "
            "never heroic.")),
    ),
    use="Blackout Core (three synced phase layers)",
)

# ---------------------------------------------------------------- an-answer: the ending (D minor -> F major, 84), the exception
P["an-answer"] = dict(
    key="F", bpm=84, stage=0, kind="single",
    negative=NEGATIVE_ENDING,
    sections=dict(
        intro=wholes("Dm Dm Dm Dm", "A A A A"),
        Q1=TTL1, Q2=TTL2,
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
        "Hopeful, luminous ending music for a lonely retro pixel-art space game, a 1980s sci-fi film synth score: after "
        "thirty-one years of silence the lamps of a ring of relays come back on one by one and, far below the clouds, a "
        "radio finally receives an answer. It begins dark and lonely, a felt piano and a cold analog pad on a slow minor "
        "phrase; then warm analog synth pads swell with slow filter sweeps, a soft low arpeggiator starts, a singing "
        "synth lead with slow vibrato and a cello carry the theme into a major key, glass bells ring, tape echo and vast "
        "reverb. Bittersweet, grateful and finally hopeful; slow and spacious."))),
    use="ending (single; the one hopeful piece)",
)

# ---------------------------------------------------------------- line-quiet: game over (D minor, 70), short
P["line-quiet"] = dict(
    key="Dm", bpm=70, stage=0, kind="single",
    sections=dict(
        intro=wholes("Dm Dm Dm Dm", "A A A A"),
        T1=TTL1,
        L1=wholes("Dm Dm Am Am", "F F E E")),
    form=[("intro", "intro"), ("T1", "interlude"), ("L1", "outro")],
    tail=("Gm Gm", ["B32", "B32"]),
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


# Explore/battle retain the same melodic score; the performance supplies the extra motion.
# Dense low-root overrides in the pilot repeatedly pushed YuE toward club music.
for _piece in P.values():
    if "battle" in _piece["versions"]:
        _piece["versions"]["battle"].pop("over", None)

# Pilot-informed v2.2 timbres: retain melodic tension without the club-oriented gated-drum treatment.
P["exchange"]["versions"]["main"]["style"] = explore(
    "dusty electric piano, muted glass plucks, a subdued bass pedal and small mechanical relay clicks",
    "A dim salvage exchange above the cloud floor, a place to trade quietly and remember the missing.",
    "Wry and introspective, suspended and minor, tired night-shift melancholy.")
P["exchange"]["versions"]["main"]["style"] = (
    "Intimate, sad and quiet music in an abandoned switchboard exchange at the edge of space, late at night. "
    "Soft felt piano plays a sparse melancholic minor phrase over a cold analog synthesizer pad and a low sustained "
    "sub-bass drone; slow tape echoes, distant glass bells, a lonely cello and the quiet tick of an old relay. "
    "Still, desolate and suspended, a tired night-shift room. No drums.")
P["iron-regent"]["versions"]["main"]["style"] = battle(
    "a deep bowed cello, quiet metallic gate creaks, sustained low brass answering the sparse synth melody",
    "An ancient copper gate machine tests the greeting; solemn and restrained, with fragmented mechanical percussion.")
P["iron-regent"]["sections"].update(
    R1=wholes("Dm Dm Eb Eb", "A A B B"),
    R2=wholes("Dm Dm Am Am", "F F E E"),
    W2=wholes("Gm Gm Am Am", "D D E E"))
P["hollow-choir"]["versions"]["main"]["style"] = battle(
    "resonant glass mallets, muted celesta, quiet bowed metal and deep sustained synthesizer tones",
    "A monumental glass bell engine answers the signal in sparse, ominous overlapping patterns.")
P["hollow-choir"]["sections"].update(
    O1=wholes("Am Am Bb Bb", "e e f f"),
    O2=wholes("Dm Dm Em Em", "f f e e"),
    W2=wholes("Dm Dm Em Em", "D D E E"))
P["choir-weather"]["versions"]["explore"]["style"] = explore(
    "muted celesta, sparse plucked glass tones, a low bowed cello and soft analog synthesizer pads",
    "Frost drifts through an abandoned signal hall. Distant glass chimes answer a lonely repeating electronic figure.")
P["choir-weather"]["versions"]["battle"]["style"] = battle(
    "muted celesta, interlocking glass mallet sequences, a low bowed cello and a sparse clicking rhythm",
    "Cold violet windows tremble under machinery; a tense, intimate tactical encounter in an abandoned signal hall.")
P["event-horizon"]["versions"]["custody"]["style"] = explore(
    S3, "A vast ember-red archive holds its shell closed, a narrow heartbeat and measured mechanical ticks.")
P["event-horizon"]["versions"]["emergency"]["style"] = battle(
    S3B, "The archive spends its reserve; layered counterpoint and syncopated toms gather beneath the lonely melody.")
P["event-horizon"]["versions"]["horizon"]["style"] = battle(
    "insistent syncopated low toms, interlocking analog arpeggios, tolling glass bells and a desperate cello line",
    "The last light is pulled inward; an urgent, intricate final encounter, full of unresolved grief.")

# Last-stage review: low eighth-note figures encouraged dance arrangements, and
# the word 'chorale' encouraged vocal textures. Preserve the themes with held notes.
P["event-horizon"]["sections"].update(
    D1=wholes("Cm Cm Db Db", "G G A A"),
    D2=wholes("Fm Fm Gm Gm", "c c d d"))
P["blackout-heart"]["versions"]["explore"]["style"] = (
    "Quiet, desolate instrumental music inside an immense abandoned archive. Sparse felt piano, "
    "a cold slowly evolving analog synthesizer pad, deep sustained cello and distant glass bells. "
    "A lonely minor melody suspended over a low drone, slow tape echoes, long dark reverberation. "
    "Intimate and still, a faint mechanical tick in the distance. No drums.")
P["last-orders"]["versions"]["explore"]["style"] = explore(
    "soft felt piano, sparse muted celesta, a sustained low cello and quiet mechanical ticks",
    "Empty archive corridors at the end of the line, solemn and desolate, with lamps slowly going dark.")
P["last-orders"]["versions"]["battle"]["style"] = battle(
    "soft metallic rim clicks, interlocking muted glass plucks, a low cello and sustained analog pads",
    "A tense encounter among the last functioning archive machines, cold and introspective.")
P["choir-weather"]["versions"]["explore"]["style"] = (
    "Quiet instrumental music in an empty glass signal hall at night. A soft felt piano and muted celesta "
    "play sparse, sad minor phrases above a cold analog synthesizer pad and sustained low cello. "
    "Long tape echoes and distant metal chimes, restrained and desolate, lots of silence between notes. No drums.")
P["choir-weather"]["versions"]["battle"]["style"] = (
    "Intimate instrumental tactical game score in a dark glass signal hall. A felt piano, muted celesta "
    "and plucked synthesizer sequences interlock over a sustained low cello and cold analog pad. "
    "Small irregular metallic clicks and dry rim taps add anxious motion beneath a slow, sad minor melody. "
    "Quiet, mysterious, unresolved, with long tape echoes and no large drum beat.")
P["hollow-choir"]["versions"]["main"]["style"] = (
    "Somber instrumental music for an ancient glass machine in an abandoned hall at the edge of space. "
    "Sparse felt piano and muted glass bells repeat a sad minor phrase over a cold analog synthesizer pad "
    "and a deep sustained cello. Slow tape echoes, vast dark reverberation, isolated metallic creaks and "
    "a very quiet low heartbeat. Intimate, desolate and ominous, suspended and unresolved. No drums.")
# Both selected Choir Weather performances soften into an outro at bar 60.
# Join their preceding B-minor/F-sharp cadence to the matching cadence before bar 20.
P["choir-weather"]["loop_bars"] = (20, 60)
# Paired beat-chroma review found that this take anticipates exploration by one beat.
P["last-orders"]["conform_offsets"] = {"battle/t2": -1}
P["event-horizon"]["conform_offsets"] = {"horizon/t3": 1}
P["event-horizon"]["versions"]["custody"]["style"] = P["blackout-heart"]["versions"]["explore"]["style"]
P["event-horizon"]["versions"]["horizon"]["style"] = (
    "Cold, melancholic instrumental tactical game score at the heart of an abandoned archive. "
    "A felt piano, muted celesta and interlocking plucked analog synthesizer figures rise over sustained "
    "low cello and a dark synthesizer pad. Small irregular metallic clicks and dry rim taps add anxious motion "
    "beneath a slow, sad minor melody. Suspended, mysterious and unresolved, long tape echoes, no large drum beat.")


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
    loop = p.get("loop_bars", (loop_start, n_intro + n_body))
    assert 0 <= loop[0] < loop[1] <= n_intro + n_body, f"{pid}: invalid loop bars"
    return dict(intro=n_intro, loop=loop, bars=n_intro + n_body + n_tail, tail=n_tail,
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
    h = int(hashlib.sha256(f"ttl21/{pid}/{version}".encode()).hexdigest()[:6], 16) % 900000 + 100000
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
