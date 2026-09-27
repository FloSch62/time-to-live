"""Sequential conform/master for explicitly selected takes; all analysis is kept with the source."""
import sys, subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[2]
script = root/'audio-src/music/tools'
args = sys.argv[1:]
piece = args.pop(0)
preview = ['--preview'] if '--preview' in args else []
if preview: args.remove('--preview')
note = 'Alpha selected take; original analysis retained.'
if '--note' in args:
    i = args.index('--note'); note = args[i+1]; args = args[:i]
subprocess.run([sys.executable, str(script/'conform.py'), piece, *args], check=True)
subprocess.run([sys.executable, str(script/'master.py'), piece, *[a.replace('/','=') for a in args], *preview, '--note',note], check=True)
