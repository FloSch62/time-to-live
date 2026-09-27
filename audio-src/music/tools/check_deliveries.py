"""Whisper medium without VAD on delivered music, or --preview candidates.
Checks are reused only when the exact audio hash matches the saved report.
"""
import hashlib, json, subprocess, sys
from core import ROOT, WORK, MUSIC

todo = []
args = sys.argv[1:]
preview = '--preview' in args
if preview:
    args.remove('--preview')
directory = MUSIC/'previews' if preview else ROOT/'public/audio/music'
manifest = json.loads((directory/'music.json' if preview else ROOT/'public/audio/music.json').read_text())
files = sorted({directory / name.split('/')[-1] for entry in manifest.values() for name in entry['files'].values()})
for f in files:
    j = WORK / "speech" / f"{f.stem}.medium-novad.json"
    with f.open('rb') as source:
        sha = hashlib.file_digest(source,'sha256').hexdigest()
    if not j.exists() or json.loads(j.read_text()).get('audio_sha256') != sha:
        todo.append(str(f))
print("checking", len(todo), "files", flush=True)
if todo:
    subprocess.run([sys.executable, str(MUSIC / "tools/speech.py"), "--novad", *args, *todo], check=True)
