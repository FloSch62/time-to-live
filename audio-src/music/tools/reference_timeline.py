"""Time-resolved audio classification of reference pairs with the existing cached CLAP model.

These are descriptive similarities, not a listening transcript or quality verdict.
Bound to two CPU threads and small inference batches; no new model downloads.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
import torch
from transformers import ClapModel, ClapProcessor

from core import FF, MUSIC

LABELS = {
    'driving': 'Driving intense instrumental electronic music with a strong syncopated drum groove and active bass.',
    'calm': 'Calm spacious ambient electronic music with very light percussion and sustained synthesizer pads.',
    'arpeggios': 'Interlocking fast repeated synthesizer arpeggios and sequenced melodic patterns.',
    'long_lead': 'A synthesizer plays a long expressive melody over sustained chords.',
    'drum_groove': 'An electronic breakbeat with a strong kick drum, snare drum and rapid hi hats.',
    'pulsing_bass': 'A pulsing rhythmic synthesizer bass ostinato.',
    'pads': 'Sustained atmospheric synthesizer pad chords and ambient drones.',
    'bells': 'Delicate high glassy bells and chiming mallet tones.',
    'guitar': 'Distorted electric guitar riffs with rock drums.',
    'strings': 'Orchestral string melodies with electronic accompaniment.',
}


def main():
    torch.set_num_threads(2)
    model = ClapModel.from_pretrained('laion/clap-htsat-unfused', local_files_only=True).eval()
    processor = ClapProcessor.from_pretrained('laion/clap-htsat-unfused', local_files_only=True)
    with torch.inference_mode():
        te = model.get_text_features(**processor(text=list(LABELS.values()), return_tensors='pt', padding=True))
        te = torch.nn.functional.normalize(te, dim=-1)
    report = dict(model='laion/clap-htsat-unfused', descriptions=LABELS,
                  limitation='Raw descriptive similarity, not a human listening judgement. Read trends with the paired signal measurements.', tracks=[])
    source = json.loads((MUSIC / 'references/structure.json').read_text())
    out = MUSIC / 'references/timeline.json'
    for track in source['tracks']:
        raw = subprocess.check_output([FF, '-v', 'error', '-i', track['file'], '-ar', '48000', '-ac', '1', '-f', 'f32le', 'pipe:1'])
        x = np.frombuffer(raw, dtype='<f4')
        starts = list(range(0, max(1, int(track['duration']) - 9), 10))
        rows = []
        for a in range(0, len(starts), 2):
            batch = starts[a:a + 2]
            chunks = [x[s * 48000:(s + 10) * 48000].copy() for s in batch]
            with torch.inference_mode():
                ae = model.get_audio_features(**processor(audio=chunks, sampling_rate=48000, return_tensors='pt'))
                scores = (torch.nn.functional.normalize(ae, dim=-1) @ te.T).numpy()
            for t, score in zip(batch, scores):
                row = dict(start=t, **{k:round(float(v),4) for k,v in zip(LABELS,score)})
                row['drive_minus_calm'] = round(row['driving'] - row['calm'], 4)
                rows.append(row)
        result = dict(file=track['file'], family=track['family'], layer=track['layer'], duration=track['duration'], windows=rows)
        report['tracks'].append(result)
        out.write_text(json.dumps(report, indent=2) + '\n')
        print(track['family'], track['layer'], 'most driving windows',
              [(r['start'],r['drive_minus_calm']) for r in sorted(rows,key=lambda r:-r['drive_minus_calm'])[:4]], flush=True)


if __name__ == '__main__':
    main()
