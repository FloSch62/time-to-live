#!/usr/bin/env bash
# Resumable bounded holds. The shared lock serializes YuE, Krea and expensive audio analysis.
set -euo pipefail
cd /home/clab/projects/clab/time-to-live
mapfile -t jobs < <(python3 - <<'PY'
import sys
sys.path.insert(0,'audio-src/music')
import plans
order = ["copper-reach", "exchange"] + [k for k in plans.P if k not in ("copper-reach", "exchange")]
for pid in order:
    p = plans.P[pid]
    for v in p['versions']:
        n = 3 if pid == 'copper-reach' and v == 'battle' else 2 if pid in ('title','exchange','copper-reach') else 1
        print(f'{pid}:{v}:{n}')
PY
)
for round in 1 2 3 4 5; do
  bash audio-src/hold.sh "continuation-rest-$round.log" 0 900 --cfg 2.2 "${jobs[@]}"
  if python3 - <<'PY'
import sys
from pathlib import Path
sys.path.insert(0,'audio-src/music')
import plans
missing=[]
for pid,p in plans.P.items():
    for v in p['versions']:
        n = 3 if pid == 'copper-reach' and v == 'battle' else 2 if pid in ('title','exchange','copper-reach') else 1
        if not Path(f'audio-src/music/takes/{pid}/{v}/t{n}/audio.flac').exists(): missing.append(f'{pid}/{v}/t{n}')
print('Music still needed:', missing)
sys.exit(bool(missing))
PY
  then exit 0; fi
  sleep 5
done
exit 1
