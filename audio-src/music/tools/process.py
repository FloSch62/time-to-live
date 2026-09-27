"""Analyse every new take of the given pieces (CPU): align -> CLAP judge -> Whisper (VAD) -> evaluate table.
Usage: process.py <piece> [<piece> ...]"""
import subprocess, sys
from core import plans, list_takes, load_json, WORK, MUSIC

PY = "/home/clab/projects/clab/faultline/.venv-score/bin/python"
T = MUSIC / "tools"


def run(*args):
    r = subprocess.run([PY, *map(str, args)], capture_output=True, text=True, cwd=T)
    if r.returncode:
        raise RuntimeError(f"Analysis failed ({r.returncode}): {args}\n{r.stderr[-2000:]}")
    out = [l for l in (r.stdout + r.stderr).splitlines() if "Warn" not in l and "warn(" not in l]
    return "\n".join(out)


for pid in sys.argv[1:]:
    jobs = [(v, t) for v in plans.P[pid]["versions"] for t in list_takes(pid, v)]
    todo = [f"{v}/{t}" for v, t in jobs if not (WORK / pid / f"{v}-{t}.align.json").exists()]
    if todo:
        print(run("align.py", pid, *todo))
    judge = load_json(WORK / pid / "judge.json")
    todo = [f"{v}/{t}" for v, t in jobs if f"{v}/{t}" not in judge]
    if todo:
        print(run("judge.py", pid, *todo))
    todo = [str(MUSIC / "takes" / pid / v / t / "audio.flac") for v, t in jobs
            if not (WORK / "speech" / f"{pid}-{v}-{t}.medium.json").exists()]
    if todo:
        print("\n".join(l for l in run("speech.py", *todo).splitlines() if l.startswith("==") or "SPEECH" in l))
    print(run("evaluate.py", pid))
