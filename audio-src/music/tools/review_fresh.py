"""Bounded CPU review and audition mastering of completed fresh pairs.

Run inside the 2 GiB review service. This writes previews, not runtime deliveries.
Raw flags and paired comparisons stay visible for the selection decision.
"""
import argparse
import subprocess
import sys
from core import MUSIC, ROOT

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('pieces', nargs='+')
parser.add_argument('--take', default='t21')
parser.add_argument('--explore-take')
parser.add_argument('--battle-take')
args = parser.parse_args()
picks = {v:getattr(args,v+'_take') or args.take for v in ('explore','battle')}

def run(script, *arguments):
    subprocess.run([sys.executable, '-u', str(script), *arguments], check=True, cwd=ROOT)

for pid in args.pieces:
    run(MUSIC/'tools/process.py', pid)
    run(ROOT/'tools/runtime/master-music.py', pid, *[f'{v}/{t}' for v,t in picks.items()], '--preview',
        '--note', 'Fresh original composition candidate. Raw flags and sync report retained for selection review.')
    run(MUSIC/'tools/sync.py', pid, *[f'{v}={t}' for v,t in picks.items()])

run(MUSIC/'tools/reference_match.py', '--cached-library', '--library', '/mnt/c/Users/Flo/Downloads/ftl - multiverse soundtrack',
    '--compare', *[str(MUSIC/'takes'/pid/v/t/'audio.flac') for pid in args.pieces for v,t in picks.items()],
    '--out', str(MUSIC/'references'/f'fresh-{args.pieces[0]}-{picks["explore"]}-{picks["battle"]}.json'))
