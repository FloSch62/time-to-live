#!/usr/bin/env python3
"""Build every sprite atlas (or the ones named on the command line) into public/sprites/.

    tools/sprites/.venv/bin/python tools/sprites/build.py            # all
    tools/sprites/.venv/bin/python tools/sprites/build.py crew ui    # some

Each atlas module (crew.py, icons.py, weapons.py, drones.py, fx.py, ui.py) exposes `build() -> Atlas`.
"""
import importlib
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ATLASES = ["crew", "icons", "fx", "ui", "rooms"]


def main(argv):
    names = argv or ATLASES
    for n in names:
        t0 = time.time()
        mod = importlib.import_module(n)
        atlas = mod.build()
        png, w, h, nf, na = atlas.save()
        print(f"{n:8s} {w}x{h}  {nf} frames  {na} anims  ({time.time() - t0:.2f}s) -> {os.path.relpath(png)}")


if __name__ == "__main__":
    main(sys.argv[1:])
