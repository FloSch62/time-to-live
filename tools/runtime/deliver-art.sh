#!/usr/bin/env bash
set -euo pipefail
cd /home/clab/projects/clab/time-to-live
while true; do
  available=$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)
  if [ "$available" -gt 4194304 ]; then
    systemd-run --user --wait --pipe --collect --unit=ttl-art-delivery \
      -p MemoryMax=1G -p MemorySwapMax=0 -p OOMPolicy=stop \
      --working-directory=/home/clab/projects/clab/time-to-live \
      /usr/bin/env OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 \
      /home/clab/projects/clab/time-to-live/art-src/.venv/bin/python -u tools/art/deliver.py
    if ! compgen -G 'art-src/queue/pending/*.txt' >/dev/null && ! compgen -G 'art-src/queue/running/*.txt' >/dev/null; then exit 0; fi
  fi
  sleep 30
done
