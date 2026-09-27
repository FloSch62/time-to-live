"""Measure reference arrangements over time and choose excerpts for audio description.

Flux and attack activity are signal measurements, not perceptual intensity verdicts.
No notes or melodies are transcribed. Recordings remain in the user's source folder.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

from core import FF, MUSIC

LIBRARY = Path('/mnt/c/Users/Flo/Downloads/ftl - multiverse soundtrack')
FAMILIES = ('Unexplored', 'Dynasty', 'Crystal', 'Ancient', 'Voyager', 'Haunted')
SR, HOP, NFFT = 16000, 320, 1024


def measure(path):
    raw = subprocess.check_output([FF, '-v', 'error', '-i', str(path), '-ar', str(SR),
                                   '-ac', '1', '-f', 'f32le', 'pipe:1'])
    x = np.frombuffer(raw, dtype='<f4')
    count = (len(x) - NFFT) // HOP + 1
    bands = ((30, 180), (180, 2000), (2000, 7900))
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    energy = np.empty((count, len(bands)), dtype=np.float32)
    for a in range(0, count, 512):
        idx = np.arange(a, min(a + 512, count))[:, None] * HOP + np.arange(NFFT)
        power = np.abs(np.fft.rfft(x[idx] * np.hanning(NFFT), axis=1)) ** 2
        for j, (lo, hi) in enumerate(bands):
            energy[a:a + len(idx), j] = 10 * np.log10(power[:, (freqs >= lo) & (freqs < hi)].sum(1) + 1e-9)
    flux = np.maximum(0, np.diff(energy, axis=0, prepend=energy[:1]))
    attack = flux.sum(1)
    threshold = max(2.0, float(np.percentile(attack, 75)))
    peaks = np.flatnonzero((attack[1:-1] > attack[:-2]) & (attack[1:-1] >= attack[2:]) & (attack[1:-1] > threshold)) + 1
    separated = []
    for p in peaks:
        if not separated or p - separated[-1] >= 4:
            separated.append(int(p))
        elif attack[p] > attack[separated[-1]]:
            separated[-1] = int(p)
    peak_times = np.array(separated) * HOP / SR
    rows = []
    duration = len(x) / SR
    for start in np.arange(0, max(1, duration - 10), 5):
        a, b = int(start * SR / HOP), int((start + 10) * SR / HOP)
        seg = x[int(start * SR):int((start + 10) * SR)]
        rows.append(dict(start=float(start), end=round(min(duration, start + 10), 2),
                         rms_db=round(float(10 * np.log10(np.mean(seg ** 2) + 1e-12)), 2),
                         attack_events_per_s=round(float(np.sum((peak_times >= start) & (peak_times < start + 10)) / 10), 2),
                         band_flux=np.round(flux[a:b].mean(0), 3).tolist(),
                         band_energy_db=np.round(energy[a:b].mean(0), 2).tolist()))
    # A pulse estimate has half/double-tempo ambiguity: keep candidates, not a claimed exact BPM.
    f = attack - attack.mean()
    candidates = []
    for lag in range(int(np.ceil(SR / HOP * 60 / 180)), int(SR / HOP * 60 / 55) + 1):
        score = float(np.mean(f[:-lag] * f[lag:]))
        candidates.append((score, 60 * SR / HOP / lag))
    top = []
    for score, bpm in sorted(candidates, reverse=True):
        if all(abs(bpm - t['bpm']) > 6 for t in top):
            top.append(dict(bpm=round(bpm, 1), strength=round(score, 3)))
        if len(top) == 3:
            break
    interior = [r for r in rows if r['start'] >= 25 and r['start'] <= duration - 40]
    activity = lambda r: sum(r['band_flux'])
    busiest = max(interior, key=activity)
    quietest = min(interior, key=activity)
    cues = [dict(role='opening', start=0, seconds=25),
            dict(role='strongest rhythmic activity', start=max(0, busiest['start'] - 5), seconds=25),
            dict(role='least rhythmic activity inside body', start=max(0, quietest['start'] - 5), seconds=25)]
    return dict(file=str(path), duration=round(duration, 3), source_sample_rate=sf.info(path).samplerate,
                bands_hz=bands, pulse_candidates=top, cues=cues, windows=rows)


def main():
    destination = MUSIC / 'references' / 'structure.json'
    report = dict(method='10s windows / 5s hop; mono 16kHz; positive changes in three spectral bands, RMS and attack activity.',
                  limitations='Activity is a proxy, not musical intensity. Pulse estimates may be half/double tempo. Audio descriptions are checked separately.', tracks=[])
    for family in FAMILIES:
        for layer in ('EXPLORE', 'BATTLE'):
            path = LIBRARY / f'mv_MUS_{family}{layer}.ogg'
            row = measure(path)
            row.update(family=family, layer=layer.lower())
            report['tracks'].append(row)
            destination.write_text(json.dumps(report, indent=2) + '\n')
            print(path.name, row['duration'], row['pulse_candidates'], row['cues'], flush=True)


if __name__ == '__main__':
    main()
