"""Reproduce the accepted readability pass; never promote unreviewed candidates by glob."""
import json
from pathlib import Path
from objects import finalize_object
from finalize import finalize

root = Path(__file__).resolve().parents[2]
picks = json.loads((root / "art-src/readability-picks.json").read_text())
for key, pick in picks.items():
    promote = finalize if key.startswith("ships/") else finalize_object
    promote(key, root / pick["source"], overrides=pick["pixelize"], note=pick["note"])
