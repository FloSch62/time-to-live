#!/usr/bin/env bash
# Queue job specs for the worker:  bash art-src/q.sh NAME SPEC...   (SPEC = group/id[:version][@N|@s1,s2])
ART=/home/clab/projects/clab/time-to-live/art-src
mkdir -p "$ART"/queue/{pending,running,done}
name=$1; shift
n=$(ls "$ART"/queue/{pending,running,done} 2>/dev/null | grep -c txt)
f="$ART/queue/pending/$(printf %03d $((n+1)))-$name.txt"
printf '%s\n' "$@" > "$f.tmp" && mv "$f.tmp" "$f"
echo "queued $f ($# specs)"
