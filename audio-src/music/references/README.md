# Multiverse reference direction

The requested direction is the overall FTL / Ben Prunty / FTL: Multiverse sound,
not one particular reference track. The user's local folder is:

`C:\Users\Flo\Downloads\ftl - multiverse soundtrack`

WSL reads it at `/mnt/c/Users/Flo/Downloads/ftl - multiverse soundtrack`.
There are 64 audio files, including 28 exploration/battle pairs. They stay in that
folder; the game's output remains original compositions and generated performances.

## What the generator receives

The installed `yue2-infer` 0.1.6 request supports style text and ABC notation. It has
no audio-reference input. The references are used for analysis and comparison;
they are **not** passed as audio conditioning. See the upstream
[generation interface](https://github.com/multimodal-art-projection/YuE/blob/main/skills/yue2-music/references/generation-and-covers.md).

`tools/reference_match.py` compares three 10-second excerpts per reference with
the same excerpt sampling of TTL takes, using CLAP audio embeddings. It caches
file hashes, sample positions and embeddings in `embeddings.json`. Comparisons
use the matching exploration/battle group, not just the closest one track.
`baseline.json` records the original delivered music before replacement.

These measurements are selection aids. They do not establish that a track sounds
good, contains no voices, is original, or will loop and crossfade correctly.

## Arrangement brief

- Exploration: melodic electronic space music; a soft pulse-wave lead, small
  plucked synthesizer patterns, rounded bass, filtered pads, delay and space.
  Melancholy and curiosity can coexist. Avoid turning every cue into a piano/cello
  lament or an almost static drone.
- Battle: the same composition and clock, with a clearly audible increase in
  rhythmic activity. Syncopated kick/snare, ticking hats, bass motion and synth
  counterpoint carry the urgency. Keep the melody audible and leave room for SFX.
- Use recurring original motifs with rests, short figures and answering phrases.
  Long notes remain useful contrast, but should not occupy almost every bar.
- Keep the six areas distinct through their electronic timbres. Stage I uses
  dusty pulse waves and metallic accents; Stage II uses FM bells and glassy
  sequences; Stage III uses lower, more tense resonant synths.
- Preserve shared BPM, harmony, bar count and loop boundaries between versions.
  Check actual rendered alignment; supplying identical scores does not guarantee it.

The library comparison also shows why the older categorical "not club" test
needs interpretation: many supplied battle references have strong electronic
beat descriptors. Do not reject the requested energy simply for scoring against
a broad dance-music label. Speech, audio faults, harmonic mismatch and timing
remain separate checks.

## Current work

The user rejected preserving Copper Reach's melody. V3 takes 10–13 are superseded.
V4 starts from a blank symbolic score and the [arrangement study](arrangement-study.md),
which examines complete reference tracks over time. New compositions are recorded
in `../compositions/`; `selected.json` names the score used for each new pair.
Native Copper take 20 was rejected for form alignment. The new editorial performances start at 21. The prior score and deliveries remain in
`../archive-v2/`. A candidate is not a runtime replacement until the delivery
manifest selects it.
