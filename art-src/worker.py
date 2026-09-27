#!/usr/bin/env python3
"""Queue worker for one GPU hold (started by serve.sh, which owns ComfyUI and runs under the GPU lock).

Takes job files from queue/pending/*.txt (whitespace separated specs, see specs.resolve), oldest first. Specs are
resolved when they run, so prompts edited meanwhile are picked up. Stops starting jobs after --max-hold seconds,
yields early (after --yield-after s) when another process waits on the GPU lock, and exits when the queue has been
empty for --idle seconds. Unfinished specs are written back to queue/pending/ as a carry file.
"""
import argparse
import importlib
import os
import subprocess
import sys
import time
import traceback
import uuid
from pathlib import Path

import gen

ART = Path(__file__).resolve().parent
Q = ART / "queue"


def fresh_resolve():
    sys.modules.pop("specs", None)
    return importlib.import_module("specs").resolve


def others_waiting():
    """True when another process (not this session) is queued on the GPU lock."""
    mine = set()
    pid = os.getpid()
    while pid > 1:
        mine.add(pid)
        try:
            pid = int(open(f"/proc/{pid}/stat").read().rsplit(")", 1)[1].split()[1])
        except (OSError, IndexError, ValueError):
            break
    out = subprocess.run(["pgrep", "-af", "flock .*gpu.lock"], capture_output=True, text=True).stdout
    for line in out.splitlines():
        parts = line.split()
        if len(parts) > 1 and parts[1].endswith("flock") and int(parts[0]) not in mine:
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-hold", type=float, default=1080)
    ap.add_argument("--idle", type=float, default=20)
    ap.add_argument("--yield-after", type=float, default=300)
    a = ap.parse_args()
    for d in ("pending", "running", "done"):
        (Q / d).mkdir(parents=True, exist_ok=True)
    print(f"worker: max_hold={a.max_hold}s idle={a.idle}s", flush=True)
    client = str(uuid.uuid4())
    t0 = time.monotonic()
    est = 60.0
    last_work = time.monotonic()

    def must_stop():
        el = time.monotonic() - t0
        if el + est > a.max_hold:
            return "max hold reached"
        if el > a.yield_after and others_waiting():
            return "yield: another GPU job is waiting"
        return None

    while True:
        files = sorted((Q / "pending").glob("*.txt"))
        if not files:
            if time.monotonic() - last_work > a.idle or time.monotonic() - t0 > a.max_hold:
                break
            time.sleep(3)
            continue
        f = files[0]
        run = Q / "running" / f.name
        f.rename(run)
        specs = run.read_text().split()
        print(f"== {f.name}: {len(specs)} specs", flush=True)
        try:
            resolve = fresh_resolve()
        except Exception:
            print(f"FAIL loading specs:\n{traceback.format_exc()}", flush=True)
            run.rename(Q / "pending" / f.name)
            break
        left = []
        stop = None
        for i, spec in enumerate(specs):
            try:
                jobs = resolve(spec)
            except Exception as e:
                print(f"SKIP {spec}: {e}", flush=True)
                continue
            for k, job in enumerate(jobs):
                stop = must_stop()
                if stop:
                    left = [f"{job['group']}/{job['id']}:{job['version']}@{j['seed']}" for j in jobs[k:]] + specs[i + 1:]
                    break
                try:
                    secs = gen.run_one(job, client)
                except Exception:
                    print(f"FAIL {spec}:\n{traceback.format_exc()}", flush=True)
                    continue
                if secs:
                    est = max(est * 0.5 + secs * 0.5, 10)
            last_work = time.monotonic()
            if stop:
                break
        run.rename(Q / "done" / f.name)
        if left:
            (Q / "pending" / ("000-carry-" + f.name)).write_text("\n".join(left) + "\n")
            print(f"{stop}; carry {len(left)} specs to next hold", flush=True)
            break
    print(f"worker exit after {round(time.monotonic() - t0)} s", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
