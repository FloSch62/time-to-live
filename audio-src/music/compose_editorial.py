"""Original v4 scores, written from blank after the native planner failed form checks.

No earlier TTL melody or reference notes are used. Explicit phrases make the paired
arrangements reproducible; the audio model supplies instrumentation and performance.
The untouched native drafts remain in compositions/*/draft-* for provenance.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# Each theme has its own lead, rhythm, harmony and contrasting answer, in L:1/32.
# Four-bar phrases deliberately mix short pickup notes, held answers and silence.
THEMES = {
 'copper-reach': dict(key='Em', bpm=104, tonic='E', acc={'F':1},
  colour='Warm rounded analog lead, rippling FM plucks, a deep melodic synth bass and drifting string-synth pads; curious, wistful frontier travel.',
  chords=['Em','Cmaj7','Am7','Bm7'], contrast=['Am7','D','Cmaj7','Bm7'],
  a=['B4 e6 g2 f4 e8 B4 z4','G4 B4 e8 d6 B2 G4 z4','A4 c6 B2 A4 e8 d4 c4','B8 f4 a4 g6 f2 e4 z4'],
  answer=['g6 f2 e4 B4 d8 e4 z4','e4 d4 B8 G4 B4 d4 z4','c8 e4 g4 f8 e4 c4','d6 f2 B8 A4 F4 B4 z4'],
  b=['E4 B4 e4 f4 g4 f4 e4 B4','C4 G4 B4 e4 d4 B4 G4 E4','A,4 E4 A4 B4 c4 B4 A4 E4','B,4 F4 B4 d4 f4 d4 B4 F4'],
  c=['e12 c4 B8 A4 z4','f8 e4 d4 A8 d4 z4','g8 e8 d4 B4 G4 z4','f12 d4 B8 F4 z4']),
 'rust-kingdom': dict(key='Gm', bpm=100, tonic='G', acc={'B':-1,'E':-1},
  colour='Dry hollow pulse-synth lead, dusty metallic plucks, elastic resonant bass and slow tape echoes; rusted machinery and lonely distant signals.',
  chords=['Gm','Ebmaj7','Cm7','Dm7'], contrast=['Cm7','Bb','Ebmaj7','Dm7'],
  a=['D6 G2 z4 B4 A6 G2 F4 D4','G8 F4 E4 B,8 D4 z4','C6 G2 c4 B4 G8 E4 z4','A6 F2 D8 C4 D4 F4 z4'],
  answer=['G4 B4 d8 c6 B2 A4 z4','B8 G8 F4 E4 D4 z4','E6 G2 B4 c4 G8 E4 z4','F4 A4 d8 c4 A4 D4 z4'],
  b=['G,6 D2 G4 D4 B4 D4 A4 D4','E,6 B,2 E4 B,4 G4 B,4 F4 B,4','C6 G2 c4 G4 E4 G4 D4 G4','D6 A2 d4 A4 F4 A4 E4 A4'],
  c=['c16 B4 G4 E4 z4','d12 B4 A8 F4 z4','B16 G8 F4 E4','A12 F4 E8 D4 z4']),
 'glass-cathedral': dict(key='F#m', bpm=112, tonic='F', acc={'F':1,'C':1,'G':1},
  colour='Clear crystalline FM bells, delicate high synth plucks, an expressive analog synth lead and deep rounded bass in a spacious resonant hall; intricate and mysterious.',
  chords=['F#m','Dmaj7','Bm7','C#m7'], contrast=['Dmaj7','A','Bm7','C#m7'],
  a=['c4 f4 a6 g2 f4 c4 e4 z4','a8 f4 e4 d8 c4 z4','f4 b4 a6 f2 e4 d4 c4 B4','e8 g4 c4 B6 A2 G4 z4'],
  answer=['f4 e4 c8 A4 c4 e4 z4','d6 f2 a8 g4 f4 e4 z4','b8 a4 f4 d4 f4 a4 z4','g6 e2 c8 B4 c4 e4 z4'],
  b=['F2 c2 A2 c2 e4 c4 f4 c4 e4 c4','D2 A2 F2 A2 c4 A4 d4 A4 c4 A4','B,2 F2 D2 F2 A4 F4 B4 F4 A4 F4','C2 G2 E2 G2 B4 G4 c4 G4 B4 G4'],
  c=['a16 f8 e4 d4','e12 c4 B8 A4 z4','d16 f8 e4 d4','g12 e4 c8 B4 z4']),
 'choir-weather': dict(key='C#m', bpm=108, tonic='C', acc={'F':1,'C':1,'G':1,'D':1},
  colour='Rounded FM synthesizer lead with slow pitch vibrato, interlocking glass-pluck sequences, filtered electronic chords, long digital delays and a warm low synthesizer bass; an eerie shifting signal cloud.',
  chords=['C#m','Amaj7','F#m7','G#m7'], contrast=['F#m7','E','Amaj7','G#m7'],
  a=['G4 c8 e4 d6 c2 B4 z4','e6 c2 B8 A4 E4 G4 z4','A4 c4 f8 e6 c2 A4 z4','B8 G4 B4 d6 c2 B4 z4'],
  answer=['e8 g4 f4 e4 d4 c4 z4','c8 B4 A4 E8 B4 z4','f6 e2 c8 A4 B4 c4 z4','d4 B4 G8 B4 d4 c4 z4'],
  b=['C4 G2 B2 c4 G4 e4 G4 d4 G4','A,4 E2 G2 A4 E4 c4 E4 B4 E4','F,4 C2 E2 F4 C4 A4 C4 G4 C4','G,4 D2 F2 G4 D4 B4 D4 A4 D4'],
  c=['c16 A8 G4 F4','B12 G4 E8 F4 z4','e16 c8 B4 A4','d12 B4 G8 F4 z4']),
 'blackout-heart': dict(key='Am', bpm=120, tonic='A', acc={},
  colour='Resonant low analog sequences, deep rounded bass, distant plaintive square-synth lead and slowly moving filtered pads; mounting pressure inside an immense archive.',
  chords=['Am','Fmaj7','Dm7','Em7'], contrast=['Dm7','G','Fmaj7','Em7'],
  a=['E4 A6 c2 B4 A4 E4 G4 z4','A8 G4 F4 C8 E4 z4','D4 A4 d8 c6 A2 F4 z4','G6 E2 B8 d4 B4 G4 z4'],
  answer=['c8 e4 d4 c6 B2 A4 z4','c4 A4 G8 F4 A4 c4 z4','f8 e4 d4 A4 c4 d4 z4','e8 d4 B4 G8 E4 z4'],
  b=['A,4 E2 A2 c4 E4 A4 E2 G2 A4 E4','F,4 C2 F2 A4 C4 F4 C2 E2 F4 C4','D,4 A,2 D2 F4 A,4 D4 A,2 C2 D4 A,4','E,4 B,2 E2 G4 B,4 E4 B,2 D2 E4 B,4'],
  c=['d16 c8 A4 F4','B12 A4 G8 D4 z4','c16 A8 G4 F4','B12 G4 E8 D4 z4']),
 'last-orders': dict(key='Bm', bpm=126, tonic='B', acc={'F':1,'C':1},
  colour='Precise clockwork synth plucks, an expressive wistful electronic lead, restless melodic bass and warm slowly opening pads; determined momentum with a bittersweet release.',
  chords=['Bm','Gmaj7','Em7','F#m7'], contrast=['Em7','A','Gmaj7','F#m7'],
  a=['F4 B4 d6 c2 B4 F4 A4 z4','d8 B4 A4 G8 F4 z4','G6 B2 e8 d4 B4 G4 z4','A4 F4 c8 e6 c2 A4 z4'],
  answer=['d4 f4 e8 d6 c2 B4 z4','B8 A4 G4 D8 F4 z4','e4 d4 B8 G4 B4 d4 z4','c6 A2 F8 E4 F4 A4 z4'],
  b=['B,2 F2 B4 d4 c4 B,2 F2 B4 A4 F4','G,2 D2 G4 B4 A4 G,2 D2 G4 F4 D4','E,2 B,2 E4 G4 F4 E,2 B,2 E4 D4 B,4','F,2 C2 F4 A4 G4 F,2 C2 F4 E4 C4'],
  c=['e16 d8 B4 G4','c12 B4 A8 E4 z4','d16 B8 A4 G4','c12 A4 F8 E4 z4']),
}


def octave(bar):
    def shift(m):
        n, marks = m.groups()
        if ',' in marks:
            return n + marks[1:]
        return n.lower() + marks if n.isupper() else n + marks + "'"
    return re.sub(r"([A-Ga-g])([,']*)", shift, bar)


def main():
    selected = {}
    for name, t in THEMES.items():
        def block(notes, chords=None, label='instrumental'):
            return (chords or t['chords'], notes, label)
        # Sparse motif fragments introduce the phrase. The final four bars use
        # exactly these notes/harmonies, so the loop returns to the first theme.
        opening = []
        for bar in t['a']:
            first = re.match(r'([A-Ga-g][,\']*)\d+', bar)[1]
            opening.append(f'{first}8 z8 {first}8 z8')
        quiet = [re.sub(r'z4$', 'z4', b) for b in t['c']]
        # One melodic event per beat at most in the contrasting passage; long
        # answers give the accompaniment room to thin without losing its pulse.
        quiet = [re.match(r'([A-Ga-g][,\']*)', b)[1]+'16 z8 '+t['tonic']+'4 z4' for b in quiet]
        form = [block(opening,label='intro'), block(t['a']), block(t['answer']),
                block(t['b']), block(t['a']), block(t['answer']), block([octave(b) for b in t['a']]),
                block(t['c'],t['contrast']), block(t['answer'],t['chords']),
                block(quiet,t['contrast'],'interlude'), block(t['c'],t['contrast'],'interlude'),
                block(t['b']), block(t['answer']), block([octave(b) for b in t['a']]),
                block(t['answer']), block(t['c'],t['contrast']), block(opening)]
        arrangements = {
            'rust-kingdom': [0,3,1,2,4,6,7,8,9,10,11,12,13,14,5,15,16],
            'glass-cathedral': [0,1,2,3,5,6,7,8,4,9,10,7,11,12,13,14,6,15,16],
            'choir-weather': [0,1,2,7,3,5,6,9,10,8,11,12,13,15,16],
            'blackout-heart': [0,3,1,2,11,4,6,7,8,9,10,11,12,13,14,6,5,15,16],
            'last-orders': [0,1,3,2,4,5,6,7,8,11,9,10,7,12,13,14,6,11,5,15,16],
        }
        form = [form[i] for i in arrangements.get(name,range(len(form)))]
        lines=['X:1',f'T:{name} - new composition', 'M:4/4','L:1/32',f'Q:1/4={t["bpm"]}',
               'V: Vocal clef=treble','V: Ins clef=treble',f'K:{t["key"]}']
        for chords, notes, label in form:
            for bar in notes:
                assert sum(int(n) for n in re.findall(r'\d+',bar)) == 32, (name,bar)
            lines += ['% '+label,'V: Vocal','|'.join(f'"{c}"z32' for c in chords)+'|',
                      'V: Ins','|'.join(notes)+'|']
        dest=ROOT/'compositions'/name/'editorial-1'
        dest.mkdir(parents=True,exist_ok=True)
        (dest/'score.abc').write_text('\n'.join(lines)+'\n')
        (dest/'composition.json').write_text(json.dumps(dict(
            source='Original editorial composition from blank, with explicit phrases and a contrasting middle. No prior TTL or reference notes copied.',
            sections=[dict(bar=i*4,label=b[2]) for i,b in enumerate(form)],
            reference_study='references/arrangement-study.md', supersedes='Native draft did not satisfy synchronized instrumental form.'),indent=2)+'\n')
        common=('Instrumental electronic science fiction strategy game soundtrack in the musical world of '
                'Ben Prunty FTL and FTL Multiverse. '+t['colour']+' An evolving melodic instrumental with '
                'arpeggiated inner motion, subtle harmonic colour and clear phrasing. ')
        selected[name]=dict(score=f'{name}/editorial-1/score.abc',key_accidentals=t['acc'],tonic_note=t['tonic'],
            source_kind='Original editorial composition; no old melody retained.',takes_from=21,
            loop_bars=[4, (len(form)-1)*4],
            section_labels=[b[2] for b in form],
            explore=common+'Exploration arrangement: spacious, reflective and curious. Soft detailed electronic percussion, '
                'a gently moving bass and delicate repeating synthesizer patterns support the expressive lead. '
                'The middle passage opens into lighter suspended textures before the developed theme returns. '
                'Intimate game underscore with room between phrases. Steady tempo throughout; the quiet bass pulse '
                'and small percussion stay precisely on the beat through the thinner passage, return and ending.',
            battle='Driving instrumental electronic space battle game soundtrack, inspired by FTL and FTL Multiverse. '
                'A firm syncopated electronic drum groove, active deep synth bass, crisp snare and hi-hats, '
                'small tom fills and layered answering arpeggios. Urgent, tense and focused. '+t['colour']+' '
                'Build the full rhythmic arrangement through the first theme, thin it in the middle while keeping '
                'the pulse audible, then return with richer counterpoint and stronger drums. A tactical space battle.')
        if name == 'blackout-heart':
            selected[name]['explore'] = (
                'Reflective, hushed instrumental electronic space exploration soundtrack, inspired by Ben Prunty FTL '
                'and FTL Multiverse. A distant wistful square-synth melody answers delicate filtered plucks. '
                'Slowly moving warm analog pads and deep sustained bass notes leave wide spaces around the lead. '
                'Sparse light electronic percussion: soft taps and a quiet steady pulse beneath the melody. '
                'Curiosity and solitude inside an immense silent archive. Gentle melodic development, a thinner '
                'middle passage, then a warm restrained return. Keep the written tempo steady through every passage.')
    (ROOT/'compositions/selected.json').write_text(json.dumps(selected,indent=2)+'\n')


if __name__ == '__main__':
    main()
