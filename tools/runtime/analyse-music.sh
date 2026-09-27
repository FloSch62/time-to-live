#!/usr/bin/env bash
set -euo pipefail
cd /home/clab/projects/clab/time-to-live
exec flock /home/clab/projects/clab/faultline/.work/locks/gpu.lock \
  systemd-run --user --wait --pipe --collect --unit=ttl-music-analysis \
  -p MemoryMax=4G -p MemorySwapMax=128M -p OOMPolicy=stop \
  --working-directory=/home/clab/projects/clab/time-to-live \
  /usr/bin/env OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=4 \
  /home/clab/projects/clab/faultline/.venv-score/bin/python -u audio-src/music/tools/process.py "$@"
