# Reference study: movement, contrast and new compositions

The user rejected Copper Reach's melody and explicitly asked not to preserve TTL's
existing melodies. The v3 reinterpretations are superseded. The next compositions
start with a blank score: no old TTL melody or Multiverse transcription is supplied.

## Evidence and limits

The local library has 64 recordings. `baseline.json` compares the previous TTL
deliveries with that library. Six complete exploration/battle pairs were then
examined over time: Unexplored, Dynasty, Crystal, Ancient, Voyager and Haunted.

`structure.json` contains 10-second signal measurements with a 5-second step:
level, spectral activity in three frequency bands and attack activity. `timeline.json`
contains the existing CLAP model's descriptive similarities in consecutive
10-second windows. These are audio-derived measurements and classifications, not
human listening notes. Instrument labels can be wrong; relative activity is not
equivalent to musical quality. Exact key/BPM and melodic transcription are not
claimed. The separate audio-caption model download was stopped after a resource
failure and WSL restart; no captions from that model are used.

Each of the six reference pairs has exactly matching decoded duration. Exploration
and battle are alternative arrangements of a continuous timeline, which is the
useful design principle to retain in TTL. The previous TTL tunes are not an invariant.

## Useful passages

| Reference pair | Time range | Evidence and composition lesson |
| --- | --- | --- |
| Unexplored | 0:00–0:30, then 0:30–1:10 | Exploration strongly favors sustained melodic/bell/ambient descriptions. Battle shifts from a restrained opening toward driving descriptions. Establish atmosphere and identity, then let the rhythm gain presence. |
| Crystal | 1:10–1:50, then 1:50–2:30 | Battle relaxes in the earlier passage and becomes markedly more driving afterward. Exploration simultaneously emphasizes bell and arpeggio descriptions later on. Use a real contrast passage and a developed return, not a constant maximum-energy loop. |
| Ancient | 0:30–1:10, then 1:50–2:30 | Exploration already shows rhythmic/arpeggio activity; battle reaches stronger driving classifications early, then eases. Exploration does not have to mean near-static pads. |
| Voyager | 0:30–1:10 and 2:30 onward | Exploration has substantial sequenced/arpeggio character, with later increased driving character. Keep forward motion and allow the calm version to develop. |
| Haunted | 0:00–1:10 | The largest contrast is between restrained exploration and an assertive battle arrangement, whose strongest driving classification is around 0:30–1:10. Combat needs a recognisable rhythmic change, not just a louder master. |
| Dynasty | 1:10–2:30 | Battle sustains more driving character while exploration moves toward calmer sustained/lead descriptions. The two versions can make different arrangement choices over the same harmonic structure. |

## New musical direction

These are design conclusions from the reference study, to be checked by listening:

- Write fresh, identifiable motifs and answering phrases. Let them develop through
  harmonic changes, register changes and counterpoint. Do not decorate or retain
  Copper Reach's rejected tune.
- Give exploration a moving inner pattern: plucks, a sequencer or melodic bass.
  Pads provide space around this motion. Do not equate melancholy with inactivity.
- Make battle's pulse unmistakable: articulate the bass, add a defined kick/snare
  groove, tighter subdivisions and answering synth figures. Preserve melodic space.
- Compose a dynamic form: establish the motif, build a first full statement,
  contrast with a genuinely thinner passage, then return with a developed version.
- Avoid making every section equally intense. Conversely, a battle version must
  remain useful when entered at any loop position; its quieter passage still needs
  a tactical pulse.
- Choose new keys, tempos, harmony and forms as needed. Once a new piece works,
  its own exploration and battle versions share a timeline for crossfading.

The source of each new composition and every generated performance is recorded
separately. Automated comparisons help reject faults; listening decides musical quality.

## Composition implementation

The first blank-score planner produced a valid but poorly aligned Copper performance,
and several other drafts contained vocal lines or changed meter. These remain saved
for traceability and are not selected. `../compose_editorial.py` instead writes six
new explicit scores from blank: fresh lead phrases, answers, sequenced passages,
contrasting sustained phrases and higher-register returns. None imports the earlier
TTL notes. The generated performances start at take 21.

Exploration and battle share each new score's harmony and timeline, with separate
instrumentation prompts. The source scores differ in key, tempo, melodic rhythm,
register and phrase order. Rendered form, tempo, voice detection and harmonic
compatibility are checked before delivery. The old v2 classifier rules that banned
major-key colour or any brighter passage are retained as advisory measurements, not
as hard musical requirements: they did not describe the supplied references.
