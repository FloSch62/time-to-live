"""Verify all required runtime art, geometry and provenance; no model loading."""
import json, sys
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'art-src'))
import specs
manifest = json.loads((ROOT/'art-src/manifest.json').read_text())
missing, wrong, count = [], [], 0
for key, spec in specs.ASSETS.items():
    if key.startswith('explore/'): continue
    group, aid = key.split('/')
    entry = manifest.get(group, {}).get(aid)
    if not entry or not (ROOT/'public'/entry['file']).exists():
        missing.append(key); continue
    with Image.open(ROOT/'public'/entry['file']) as im:
        if im.size != tuple(spec['size']): wrong.append([key, list(im.size), spec['size']])
    count += 1
    if group in ('weapons','drones') and not (ROOT/f'public/art/{group}/{aid}-icon.png').exists():
        missing.append(key+'-icon')
result = dict(delivered=count, missing=missing, wrong_size=wrong)
print(json.dumps(result, indent=2))
if missing or wrong: sys.exit(1)
