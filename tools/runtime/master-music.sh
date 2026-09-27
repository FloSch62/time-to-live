#!/usr/bin/env bash
# Bounded CPU processing of already reviewed takes. Usage: PIECE VERSION/TAKE ... --note TEXT
set -euo pipefail
cd /home/clab/projects/clab/time-to-live
exec systemd-run --user --wait --pipe --collect --unit=ttl-music-master \
  -p MemoryMax=1536M -p MemorySwapMax=0 -p OOMPolicy=stop \
  --working-directory=/home/clab/projects/clab/time-to-live \
  /usr/bin/env OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 \
  /home/clab/projects/clab/faultline/.venv-score/bin/python -u tools/runtime/master-music.py "$@"
