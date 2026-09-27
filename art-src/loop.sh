#!/usr/bin/env bash
# Keep painting while there is queued work. Each round waits for the shared GPU lock (blocking flock), runs one
# serve.sh hold (<= ~19 min incl. ComfyUI start/stop), releases the lock, then pauses so a waiting workstream
# (audio: YuE2 / Stable Audio) gets the GPU before we queue again. Exits after --quit-idle seconds with no work.
ART=/home/clab/projects/clab/time-to-live/art-src
LOCK=/home/clab/projects/clab/faultline/.work/locks/gpu.lock
QUIT_IDLE=${QUIT_IDLE:-1800}
cd "$ART" || exit 1
mkdir -p logs queue/pending queue/hold
idle=0
while true; do
  if compgen -G "queue/pending/*.txt" >/dev/null; then
    idle=0
    echo "hold wait $(date +%T)"
    flock "$LOCK" bash "$ART/serve.sh" "$@" > "logs/serve-$(date +%m%d-%H%M%S).log" 2>&1
    echo "hold end $(date +%T)"
    sleep 45   # let a waiting GPU job take the lock
  else
    idle=$((idle + 10)); [ $idle -gt "$QUIT_IDLE" ] && break
    sleep 10
  fi
done
echo "loop exit $(date +%T)"
