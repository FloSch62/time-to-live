"""Compare original TTL takes with a local reference library using CLAP audio embeddings.

This is an analysis aid, not audio conditioning or a listening verdict. Reference recordings
stay in their original folder. Three evenly spaced 10-second excerpts represent each file.
Run with the score environment inside the project's bounded analysis service.
"""
import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from transformers import ClapModel, ClapProcessor

from core import FF, MUSIC

MODEL = "laion/clap-htsat-unfused"
DESCRIPTIONS = {
    "synth_sequences": "Instrumental electronic space game music with synthesizer arpeggios and sequenced bass.",
    "synth_melody": "Melodic synthesizer video game soundtrack with a soft square wave lead and atmospheric pads.",
    "ambient": "Ambient space music with slowly evolving synthesizer pads and sparse electronic tones.",
    "piano_strings": "Melancholic cinematic music with soft piano, cello and orchestral strings.",
    "chiptune": "Melodic chiptune video game music with eight bit electronic tones.",
    "breakbeat": "Instrumental electronic music with syncopated breakbeats, synthesizers and a bass groove.",
    "rock": "Instrumental progressive rock music with electric guitar, bass and drums.",
    "club": "Electronic dance music with a four on the floor kick, a big drop and pumping supersaw chords.",
    "orchestral": "Epic cinematic orchestral battle music with brass, strings and massive percussion.",
    "vocals": "Music with a singer singing words and a choir.",
}


def layer(path):
    name = path.name.lower()
    if name == "audio.flac":
        name = path.parent.parent.name.lower()
    return "battle" if "battle" in name else "explore" if "explore" in name else "main"


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def excerpts(path):
    info = sf.info(path)
    starts = [round(max(0, info.duration - 10) * f, 3) for f in (0.15, 0.45, 0.75)]
    chunks = []
    for start in starts:
        data = subprocess.check_output([
            FF, "-v", "error", "-ss", str(start), "-i", str(path), "-t", "10",
            "-f", "f32le", "-ac", "1", "-ar", "48000", "pipe:1",
        ])
        chunks.append(np.frombuffer(data, dtype="<f4").copy())
    return info.duration, starts, chunks


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--library", type=Path, required=True)
    parser.add_argument("--compare", type=Path, nargs="*", default=[])
    parser.add_argument("--cached-library", action="store_true", help="Reuse previously hashed reference embeddings without rereading Windows audio files")
    parser.add_argument("--out", type=Path, default=MUSIC / "references" / "comparison.json")
    args = parser.parse_args()
    torch.set_num_threads(int(os.environ.get('OMP_NUM_THREADS', '4')))
    model = ClapModel.from_pretrained(MODEL, local_files_only=True).eval()
    processor = ClapProcessor.from_pretrained(MODEL, local_files_only=True)
    with torch.inference_mode():
        text_inputs = processor(text=list(DESCRIPTIONS.values()), return_tensors="pt", padding=True)
        text_emb = torch.nn.functional.normalize(model.get_text_features(**text_inputs), dim=-1).numpy()

    cache_path = MUSIC / "references" / "embeddings.json"
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}

    def analyse(path, reference=False):
        path = path.resolve()
        key = str(path)
        row = cache.get(key)
        sha = row['sha256'] if reference and args.cached_library and row else digest(path)
        if not row or row.get("sha256") != sha:
            duration, starts, chunks = excerpts(path)
            with torch.inference_mode():
                inputs = processor(audio=chunks, sampling_rate=48000, return_tensors="pt")
                emb = torch.nn.functional.normalize(model.get_audio_features(**inputs), dim=-1).numpy()
            row = dict(file=key, sha256=sha, duration=round(duration, 3), layer=layer(path),
                       excerpts=starts, embeddings=emb.round(7).tolist())
            cache[key] = row
            cache_path.write_text(json.dumps(cache, indent=1) + "\n")
            print("analysed", path.name, flush=True)
        emb = np.asarray(row["embeddings"])
        centroid = emb.mean(axis=0)
        centroid /= np.linalg.norm(centroid)
        tags = dict(zip(DESCRIPTIONS, (emb @ text_emb.T).mean(axis=0)))
        return row, centroid, tags

    refs = []
    for path in sorted(args.library.iterdir()):
        if path.suffix.lower() in (".ogg", ".mp3", ".flac", ".wav"):
            refs.append(analyse(path, reference=True))
    if not refs:
        raise ValueError("No reference audio found")
    reference_summary = {}
    for group in ("explore", "battle", "main"):
        rows = [r for r in refs if r[0]["layer"] == group]
        if rows:
            reference_summary[group] = dict(
                count=len(rows),
                descriptions={k: round(float(np.mean([r[2][k] for r in rows])), 4) for k in DESCRIPTIONS},
            )
    comparisons = []
    for path in args.compare:
        row, centroid, tags = analyse(path)
        group = row["layer"]
        pool = [r for r in refs if r[0]["layer"] == group] or refs
        similarities = sorted([(float(centroid @ r[1]), Path(r[0]["file"]).name) for r in pool], reverse=True)
        result = dict(file=str(path), sha256=row["sha256"], layer=group,
                      reference_mean=round(float(np.mean([s for s, _ in similarities])), 4),
                      closest=[dict(file=name, cosine=round(score, 4)) for score, name in similarities[:5]],
                      descriptions={k: round(float(v), 4) for k, v in tags.items()})
        comparisons.append(result)
        print(path, "reference mean", result["reference_mean"], "closest", result["closest"][0], flush=True)
    report = dict(model=MODEL, source_folder=str(args.library), cached_reference_library=args.cached_library,
                  method="Normalized CLAP centroid of three 10s excerpts at 15/45/75% of available start range; compare same-layer files.",
                  limitation="Automated timbre/style similarity only. Not a perceptual quality score, melodic originality check or listening approval.",
                  descriptions=DESCRIPTIONS, reference_summary=reference_summary, comparisons=comparisons)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
