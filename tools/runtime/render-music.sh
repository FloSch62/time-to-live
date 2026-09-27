#!/usr/bin/env bash
# Short resumable music batch. Additional gen.py options and explicit jobs follow.
set -euo pipefail
cd /home/clab/projects/clab/time-to-live
mkdir -p /home/clab/projects/clab/faultline/.work/locks
exec flock /home/clab/projects/clab/faultline/.work/locks/gpu.lock \
  systemd-run --user --wait --pipe --collect --unit=ttl-music-generation \
  -p MemoryHigh=10500M -p MemoryMax=11G -p MemorySwapMax=0 -p CPUQuota=400% \
  -p RuntimeMaxSec=660 -p OOMPolicy=stop \
  --working-directory=/home/clab/projects/clab/time-to-live \
  /usr/bin/env OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 \
  /home/clab/projects/clab/faultline/.venv-score/bin/python -u audio-src/music/gen.py --budget 600 --cfg 1.6 "$@"
