"""Load new compositions. Native planner scores remain immutable; normalize the loop grid."""
import json
import re
from fractions import Fraction
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOKEN = re.compile(r"([=^_]*[A-Ga-gzZ][,']*)(\d*)(/*\d*)")


def read_score(path):
    text = path.read_text()
    key = re.search(r'^K:(\S+)', text, re.M)[1]
    bpm = int(re.search(r'^Q:1/4=(\d+)', text, re.M)[1])
    unit = Fraction(re.search(r'^L:(\d+/\d+)', text, re.M)[1])
    if not re.search(r'^M:4/4$', text, re.M):
        raise ValueError('Only validated 4/4 source scores are supported')
    rows, chords, voice = [], [], None
    for line in text.splitlines():
        if line.startswith('V:'):
            voice = line.split()[1]
            continue
        if not line or line[0] in '%XTMLQK' or '|' not in line:
            continue
        bars = [b.strip() for b in line.strip('|').split('|') if b.strip()]
        if voice == 'Vocal':
            chords = []
            for bar in bars:
                found = re.findall(r'"([^"]+)"', bar)
                if len(found) != 1 or re.search(r'[A-Ga-g]', re.sub(r'"[^"]+"', '', bar)):
                    raise ValueError(f'Unexpected vocal/chord bar: {bar}')
                chords.append(found[0])
        elif voice == 'Ins':
            if len(bars) != len(chords):
                raise ValueError('Chord/melody bar count mismatch')
            for chord, bar in zip(chords, bars):
                units = 0
                def convert(match):
                    nonlocal units
                    note, amount, slash = match.groups()
                    if note == 'Z':
                        value = Fraction(32 * int(amount or 1))
                        note = 'z'
                    else:
                        value = Fraction(int(amount or 1)) * unit * 32
                        if slash:
                            value /= int(slash[1:]) if slash[1:].isdigit() else 2 ** len(slash)
                    if value.denominator != 1:
                        raise ValueError(f'Unsupported sub-32nd value: {match.group(0)}')
                    units += int(value)
                    return f'{note}{int(value)}'
                normalized = TOKEN.sub(convert, bar)
                if units != 32:
                    raise ValueError(f'{path}: bar {len(rows)} has {units}/32 units: {bar}')
                rows.append((chord, normalized))
    if not rows or len(rows) % 4:
        raise ValueError(f'Need complete four-bar source sections; got {len(rows)} bars')
    return key, bpm, rows


def apply(pieces, sec, key_accidentals, tonics):
    selection = HERE / 'compositions/selected.json'
    if not selection.exists():
        return
    for pid, config in json.loads(selection.read_text()).items():
        source = HERE / 'compositions' / config['score']
        key, bpm, rows = read_score(source)
        if key not in key_accidentals:
            key_accidentals[key] = config['key_accidentals']
            tonics[key] = config['tonic_note']
        sections, form = {}, []
        for start in range(0, len(rows), 4):
            block = rows[start:start + 4]
            name = 'intro' if start == 0 else f'phrase{start // 4:02}'
            sections[name] = sec([c for c, _ in block], [b for _, b in block])
            rests = sum(int(n) for _, b in block for n in re.findall(r'z(\d+)', b))
            labels = config.get('section_labels')
            label = labels[start // 4] if labels else 'intro' if start == 0 else 'interlude' if rests >= 32 else 'instrumental'
            form.append((name, label))
        pieces[pid] = dict(
            key=key, bpm=bpm, stage=pieces[pid]['stage'], kind='pair', sections=sections, form=form,
            tail=(f'{rows[-1][0]} {rows[-1][0]}', [f"{config['tonic_note']}32"] * 2),
            loop_bars=tuple(config.get('loop_bars',(4,len(rows)))), versions={v:dict(style=config[v]) for v in ('explore','battle')},
            loop_crossfade_bars=1 if '/editorial-' in config['score'] else 0,
            takes_from=config.get('takes_from',20), revision='v4-new-composition', composition_source=str(source.relative_to(HERE)),
            reference_method=config.get('source_kind','New symbolic composition from blank score.')+' Arrangement informed by Multiverse timeline analysis.',
            negative='Vocals, sung lyrics, spoken words, choir, humming, a pop singer. Festival EDM drops, cheerful pop song, heroic trailer fanfare.',
            use=pieces[pid]['use'])
