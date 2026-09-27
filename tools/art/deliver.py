"""Deliver current-resolution Krea candidates; preserve existing reviewed deliveries.

Run with art-src/.venv/bin/python tools/art/deliver.py [GROUP/ID ...].
Prompts, original generations and processing provenance remain in art-src/.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "art-src"))
import specs
from finalize import finalize
from objects import finalize_object

manifest = json.loads((ROOT / "art-src/manifest.json").read_text())
keys = sys.argv[1:] or [k for k in specs.ASSETS if not k.startswith("explore/")]
for key in keys:
    group, aid = key.split("/")
    wanted = specs.ASSETS[key]["size"]
    delivered = manifest.get(group, {}).get(aid)
    if delivered and tuple(delivered["size"]) == tuple(wanted):
        continue
    candidates = []
    for path in (ROOT / "art-src/cand" / key).glob("*.json"):
        rec = json.loads(path.read_text())
        if tuple(rec.get("size", [])) != tuple(wanted) or not path.with_suffix(".png").exists():
            continue
        version = rec.get("version", "")
        # The earlier market scene included boats; only the carrier-world recipe is eligible.
        if key == "events/copper-market" and version != "h":
            continue
        candidates.append((version == "ha", version.startswith("h"), -rec.get("seed", 0), path))
    if not candidates:
        continue
    source = max(candidates)[-1].with_suffix(".png")
    deliver = finalize_object if group in ("weapons", "drones", "props") else finalize
    deliver(key, source, note="Alpha production candidate; shared palette and current HD geometry.")
