"""Draft entirely new symbolic compositions; no old TTL or reference melodies supplied.

The reference study guides instrumentation and energy development only. Inspect and
validate the model's ABC before rendering. Run under the shared GPU lock/memory guard.
"""
import argparse
import hashlib
import json
from pathlib import Path

from yue2 import YuE2Pipeline
from yue2.protocol import SongRequest, Sampling

ROOT = Path(__file__).resolve().parent

BRIEFS = {
    'copper-reach': (
        104, 'E minor',
        'Instrumental progressive electronic space exploration game soundtrack. Compose a completely new piece '
        'with memorable interlocking synthesizer motifs, expressive rounded analog lead, flowing arpeggios, '
        'deep melodic bass and spacious evolving pads. Wistful, curious and mysterious. A supple syncopated '
        'rhythmic pulse creates forward motion. An opening texture establishes a distinctive short motif, '
        'then the bass and answering melodic patterns enter; the theme develops through changing harmonies, '
        'opens into a quieter contrasting middle passage, and returns with an intricate layered variation. '
        'The piece should have musical phrases and contrasts rather than repeating a single hook unchanged. '
        'Approximately two and a half minutes. Entirely instrumental.'),
}

for name, bpm, key, colour in [
    ('rust-kingdom', 100, 'G minor', 'Dusty pulse-wave motifs, a resonant plucked synth bass, metallic ticks and echoing electronic answers.'),
    ('glass-cathedral', 112, 'F sharp minor', 'Crystalline FM bell sequences, glassy synth plucks and a graceful expressive electronic melody in a vast resonant hall.'),
    ('choir-weather', 108, 'C sharp minor', 'Airy wavering synthesizer melodies, shifting interlocking digital patterns and a deep smooth bass; an eerie moving electronic atmosphere.'),
    ('blackout-heart', 120, 'A minor', 'Deep resonant synth bass, dark pulsing sequences and a distant plaintive electronic lead, steadily mounting pressure inside an immense machine.'),
    ('last-orders', 126, 'B minor', 'Precise clockwork synthesizer patterns, a wistful memorable electronic melody and restless melodic bass; determined momentum with a bittersweet release.'),
]:
    BRIEFS[name] = (bpm, key,
        'Entirely instrumental progressive electronic space strategy game soundtrack. Compose a completely new '
        'piece, approximately three minutes, with distinctive melodic phrases and answering motifs. ' + colour +
        ' Introduce a motif and a moving inner pattern, develop a first full statement with changing harmony, '
        'thin the texture into a contrasting middle passage, then return with a developed variation and '
        'interlocking counterpoint. Atmospheric but rhythmically alive, curious and mysterious, never a static '
        'drone or an unchanged repeated hook. This score will support calm and driving arrangements.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pieces', nargs='*', default=list(BRIEFS))
    parser.add_argument('--drafts', type=int, default=1)
    args = parser.parse_args()
    with YuE2Pipeline.from_pretrained('m-a-p/YuE2-3B', vae='m-a-p/YuE2-Vae', device='cuda',
                                     memory_budget_gib=12, offload_ar=True) as pipe:
        for name, (bpm, key, brief) in BRIEFS.items():
            if name not in args.pieces:
                continue
            for take in range(1, args.drafts + 1):
                seed = int(hashlib.sha256(f'ttl-fresh/{name}/{take}'.encode()).hexdigest()[:8], 16)
                dest = ROOT / 'compositions' / name / f'draft-{take}'
                if (dest / 'score.abc').exists():
                    continue
                style = f'{brief} {bpm} BPM, 4/4, {key}.'
                request = SongRequest(style=style, lyrics='', cot='full', seed=seed,
                                      id=f'ttl-fresh-{name}-{take}')
                plan = pipe.plan(request=request, abc_sampling=Sampling(
                    temperature=.8, top_p=.95, top_k=40, repetition_penalty=1.005,
                    penalty_window=100, min_tokens=32, max_tokens=6000))
                plan.save(dest)
                (dest / 'composition.json').write_text(json.dumps(dict(
                    brief=brief, request=request.to_dict(), truncated=plan.truncated,
                    source='New symbolic generation. No previous TTL melody or reference score supplied.',
                    reference_study='audio-src/music/references/structure.json and timeline.json'), indent=2)+'\n')
                print(name, take, 'truncated', plan.truncated, 'characters', len(plan.abc or ''), flush=True)


if __name__ == '__main__':
    main()
