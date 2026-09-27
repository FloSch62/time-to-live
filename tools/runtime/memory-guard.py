"""Protect the host while an inherited generation job finishes outside its new cgroup.
Only monitors explicitly supplied PIDs; never kills unrelated applications.
"""
import os, signal, sys, time
pids = {int(p) for p in sys.argv[1:]}
while pids:
    mem = dict((s.split(':')[0], int(s.split()[1])) for s in open('/proc/meminfo'))
    for pid in list(pids):
        try:
            status = dict((s.split(':')[0], s.split(':', 1)[1].strip()) for s in open(f'/proc/{pid}/status'))
            rss = int(status.get('VmRSS', '0 kB').split()[0])
            if rss > 15 * 1024**2 or mem['MemAvailable'] < 3 * 1024**2:
                print(f'Stopping generation PID {pid}: RSS={rss//1024} MiB, available={mem["MemAvailable"]//1024} MiB', flush=True)
                os.kill(pid, signal.SIGTERM)
                time.sleep(2)
                if os.path.exists(f'/proc/{pid}'):
                    os.kill(pid, signal.SIGKILL)
                pids.remove(pid)
        except (FileNotFoundError, ProcessLookupError):
            pids.discard(pid)
    time.sleep(1)
