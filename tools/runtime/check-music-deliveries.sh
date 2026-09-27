#!/usr/bin/env bash
# Decode and scan delivered music without overlapping either local generator.
set -euo pipefail
cd /home/clab/projects/clab/time-to-live
score_env=/home/clab/projects/clab/faultline/.venv-score
cuda_libs="$score_env/lib/python3.12/site-packages/nvidia/cublas/lib:$score_env/lib/python3.12/site-packages/nvidia/cudnn/lib"
exec flock /home/clab/projects/clab/faultline/.work/locks/gpu.lock \
  systemd-run --user --wait --pipe --collect --unit=ttl-music-delivery-check \
  -p MemoryMax=4G -p MemorySwapMax=128M -p OOMPolicy=stop \
  --working-directory=/home/clab/projects/clab/time-to-live \
  /usr/bin/env OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=4 LD_LIBRARY_PATH="$cuda_libs${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
    "$score_env/bin/python" -u audio-src/music/tools/check_deliveries.py --device cuda "$@"
