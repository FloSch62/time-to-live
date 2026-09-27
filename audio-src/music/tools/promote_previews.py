"""Promote the explicitly selected, checked six fresh pairs without re-encoding.

All preflight checks finish before any runtime file is replaced. The delivery
manifest is written last; prior deliveries remain in archive-v2.
"""
import hashlib
import json
import shutil
from pathlib import Path

MUSIC = Path(__file__).resolve().parents[1]
ROOT = MUSIC.parents[1]
PUBLIC = ROOT/'public/audio'

def read(path):
    return json.loads(path.read_text())

def sha(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f,'sha256').hexdigest()

selection = read(MUSIC/'compositions/delivery-selection.json')
assert set(selection) == set(read(MUSIC/'compositions/selected.json')), 'Select every fresh area pair'
previews = read(MUSIC/'previews/music.json')
ready = {}
for pid, config in selection.items():
    master = read(MUSIC/'work'/pid/'preview-master.json')
    assert master['entry'] == previews[pid], f'{pid}: preview metadata differs'
    assert master['entry']['revision'] == 'v4-new-composition'
    assert master['entry']['takes'] == config['takes'], f'{pid}: selection differs'
    sync = read(MUSIC/'work'/pid/'sync.json')
    assert sync['_takes'] == config['takes'], f'{pid}: stale paired check'
    assert sync['_loop_bars'] == master['layout']['loop'], f'{pid}: stale loop check'
    assert sync['battle vs explore beat shift']['best'] == 0, f'{pid}: beat mismatch'
    assert sync['battle vs explore pitch shift']['best'] == 0, f'{pid}: harmonic mismatch'
    start, end = sync['_loop_bars']
    windows = [r for r in sync['battle vs explore'] if start <= r['bar'] < end]
    confident = [r for r in windows if r['corr'] >= .3]
    assert len(confident) >= len(windows)/2, f'{pid}: insufficient shared rhythmic evidence'
    def aligned(row):
        if abs(row['lag_ms']) <= 35:
            return True
        # Different sixteenth-note patterns can correlate slightly better one
        # subdivision apart. Accept this ambiguity only when zero-lag correlation
        # remains strong AND both recordings independently lock to the same grid.
        sixteenth_ms = 15000/master['entry']['bpm']
        if abs(abs(row['lag_ms'])-sixteenth_ms) > 5 or row['corr0'] < .5 or row['corr']-row['corr0'] > .06:
            return False
        window = row['bar']//4
        return all(v['conform']['verify']['window_conf'][window] >= 2.5
                   and abs(v['conform']['verify']['window_error_ms'][window]) <= 5
                   for v in master['versions'].values())
    assert all(aligned(r) for r in confident), f'{pid}: audible-loop timing drift'
    assert master['entry']['loopStart'] < master['entry']['loopEnd'] < master['entry']['duration']
    counts = set()
    for version, meta in master['versions'].items():
        delivery = ROOT/meta['delivery']
        assert sha(delivery) == meta['delivery_sha256'], f'{pid}: delivery changed'
        assert sha(ROOT/meta['master']) == meta['master_sha256'], f'{pid}: lossless master changed'
        assert meta['decoded_samples'] == meta['samples'], f'{pid}: decoded sample count'
        assert meta['delivered']['tp'] <= -2, f'{pid}: peak ceiling'
        assert meta['conform']['seam']['crossfade_s'] > 1, f'{pid}: missing musical loop blend'
        speech = read(MUSIC/'work/speech'/f'{delivery.stem}.medium-novad.json')
        assert speech.get('audio_sha256') == meta['delivery_sha256'], f'{pid}: stale speech scan'
        assert not any(s['speech'] for s in speech['segments']), f'{pid}: lexical voice detection'
        counts.add(meta['samples'])
    assert len(counts) == 1, f'{pid}: paired durations'
    master['note'] = config['note']
    ready[pid] = master

manifest = read(PUBLIC/'music.json')
for pid, master in ready.items():
    for version, meta in master['versions'].items():
        for key, destdir in [('delivery',PUBLIC/'music'), ('master',MUSIC/'masters')]:
            src = ROOT/meta[key]
            destdir.mkdir(parents=True, exist_ok=True)
            dest = destdir/src.name
            temporary = dest.with_suffix(dest.suffix+'.new')
            shutil.copyfile(src,temporary)
            temporary.replace(dest)
            meta[key] = str(dest.relative_to(ROOT))
    manifest[pid] = master['entry']
    (MUSIC/'work'/pid/'master.json').write_text(json.dumps(master,indent=1)+'\n')
temporary = PUBLIC/'music.json.new'
temporary.write_text(json.dumps(manifest,indent=1)+'\n')
temporary.replace(PUBLIC/'music.json')
print('Promoted fresh exploration/battle pairs:', ', '.join(ready))
