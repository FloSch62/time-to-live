"""Spectrogram sheets (inspection only): sheet.py el <element ...>  -> specs/el-<first>.png (top 4 cropped takes each)
                                        sheet.py cues <ogg ...>     -> specs/cues-<n>.png"""
import json, sys
from pathlib import Path
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import soundfile as sf
import lib, rank

OUT = lib.HERE / "specs"
OUT.mkdir(exist_ok=True)


def draw(ax, y, title, xmax=None):
    m = lib.mono(y) if y.ndim == 2 else y
    ax.specgram(m + 1e-9, NFFT=512, Fs=lib.SR, noverlap=448, cmap="magma", vmin=-120, vmax=-10)
    t = np.arange(len(m)) / lib.SR
    ax.plot(t, 12000 + m * 11000, lw=0.3, color="cyan", alpha=0.7)
    ax.set_ylim(0, 24000); ax.set_xlim(0, xmax or max(0.2, len(m) / lib.SR))
    ax.set_title(title, fontsize=7); ax.tick_params(labelsize=5)


if sys.argv[1] == "el":
    ranked = json.loads((lib.EL / "ranked.json").read_text())
    names = sys.argv[2:]
    fig, axes = plt.subplots(len(names), 4, figsize=(12, 1.8 * len(names)), squeeze=False)
    for r, name in enumerate(names):
        for k in range(4):
            take = ranked[name][k]
            y, _ = rank.crop(take)
            draw(axes[r, k], y, f"{name} #{k} {Path(take['file']).stem} {take['score']:.2f}")
    fig.tight_layout(); fig.savefig(OUT / f"el-{names[0]}.png", dpi=70)
else:
    files = sys.argv[2:]
    cols = 4
    rows = (len(files) + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=(12, 1.8 * rows), squeeze=False)
    for i, f in enumerate(files):
        y, _ = lib.decode(f) if f.endswith(".ogg") else sf.read(f, always_2d=True)
        draw(axes[i // cols, i % cols], y, Path(f).stem)
    for i in range(len(files), rows * cols):
        axes[i // cols, i % cols].axis("off")
    fig.tight_layout(); fig.savefig(OUT / f"cues-{Path(files[0]).stem}.png", dpi=70)
