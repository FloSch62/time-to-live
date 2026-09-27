#!/bin/bash
# Keep model loading inside a hard host-memory ceiling; preserve RAM for the editor and game.
if [ "${TTL_MEMORY_GUARDED:-0}" != "1" ]; then
  exec systemd-run --user --wait --pipe --collect --unit=ttl-music-generation \
    -p MemoryHigh=10500M -p MemoryMax=11G -p MemorySwapMax=0 -p CPUQuota=400% -p OOMPolicy=stop \
    --working-directory=/home/clab/projects/clab/time-to-live \
    /usr/bin/env TTL_MEMORY_GUARDED=1 OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=4 bash "$0" "$@"
fi
# One bounded GPU hold: everything inside runs sequentially under the shared lock (never in parallel with Krea 2 /
# other GPU jobs). Usage: audio-src/hold.sh <log> <sfx budget s|0> <music budget s> [music jobs ...]
# Each process exits (freeing the GPU) before the next starts; the lock is released when the script ends.
cd /home/clab/projects/clab/time-to-live
LOG=$1; SFXB=$2; MUSB=$3; shift 3
mkdir -p /home/clab/projects/clab/faultline/.work/locks
exec flock /home/clab/projects/clab/faultline/.work/locks/gpu.lock bash -c '
  set -eo pipefail
  echo "hold start $(date +%T)"
  if [ "'"$SFXB"'" != "0" ]; then
    /home/clab/projects/clab/faultline/.work/sfx/.venv/bin/python audio-src/sfx/gen.py --budget '"$SFXB"' 2>&1 | grep --line-buffered -v "it/s"
  fi
  if [ $# -gt 0 ]; then
    /home/clab/projects/clab/faultline/.venv-score/bin/python audio-src/music/gen.py --budget '"$MUSB"' "$@" 2>&1 | grep --line-buffered -v "it/s\]"
  fi
  echo "hold end $(date +%T)"
  if [ -x /usr/lib/wsl/lib/nvidia-smi ]; then /usr/lib/wsl/lib/nvidia-smi --query-compute-apps=pid,used_memory --format=csv || true; fi
' _ "$@" > audio-src/logs/$LOG 2>&1
