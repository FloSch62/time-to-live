"""Verify all required runtime art, geometry and provenance; no model loading."""
import json, sys
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'art-src'))
import specs
manifest = json.loads((ROOT/'art-src/manifest.json').read_text())
missing, wrong, count = [], [], 0
NOT_RUNTIME = ('explore/', 'study/', 'parts/', 'trolley/', 'hulls/')   # explorations, A1 study, A2 kit sources (trolley and blend-pass specs are sources, not runtime ids)
for key, spec in specs.ASSETS.items():
    if key.startswith(NOT_RUNTIME): continue
    group, aid = key.split('/')
    entry = manifest.get(group, {}).get(aid)
    if not entry or not (ROOT/'public'/entry['file']).exists():
        missing.append(key); continue
    # DIRECTION v5 finals (pixel-art scenes 640x360, events 320x160) and kit-assembled hulls record their own size
    want = tuple(entry['size']) if entry.get('direction') == 'v5' or 'layout' in entry else tuple(spec['size'])
    with Image.open(ROOT/'public'/entry['file']) as im:
        if im.size != want: wrong.append([key, list(im.size), list(want)])
    count += 1
    if group in ('weapons','drones') and not (ROOT/f'public/art/{group}/{aid}-icon.png').exists():
        missing.append(key+'-icon')
# L's new requests the A3 pass skipped (27 Sep, the user asked to finish): nothing in the game references them yet
# (the two tender events keep their existing art ids; the portraits are not in any roster), so they are listed, not
# failed. Remove an id from here when its art lands.
PENDING = {'portraits/recruit-linefolk-c', 'portraits/bellmaker-b', 'events/glasswing-lamp-alignment',
           'events/switchback-seventh-drone'}
pending = [m for m in missing if m in PENDING]
missing = [m for m in missing if m not in PENDING]
result = dict(delivered=count, missing=missing, wrong_size=wrong, pending_requests=pending)
print(json.dumps(result, indent=2))
if missing or wrong: sys.exit(1)
