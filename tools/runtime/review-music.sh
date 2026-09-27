#!/usr/bin/env bash
# Review serially with synthesis so WSL retains enough working memory.
set -euo pipefail
cd /home/clab/projects/clab/time-to-live
mkdir -p /home/clab/projects/clab/faultline/.work/locks
exec flock /home/clab/projects/clab/faultline/.work/locks/gpu.lock \
  systemd-run --user --wait --pipe --collect --unit=ttl-music-review \
  -p MemoryHigh=2800M -p MemoryMax=3G -p MemorySwapMax=0 -p CPUQuota=200% \
  -p RuntimeMaxSec=900 -p OOMPolicy=stop \
  --working-directory=/home/clab/projects/clab/time-to-live \
  /usr/bin/env OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=2 \
  /home/clab/projects/clab/faultline/.venv-score/bin/python -u audio-src/music/tools/review_fresh.py "$@"
