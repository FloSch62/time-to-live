"""Re-encode already selected and conformed takes, retaining their review notes."""
import json, subprocess, sys
from pathlib import Path
root = Path(__file__).resolve().parents[2]
for piece in sys.argv[1:]:
    selected = json.loads((root / f"audio-src/music/work/{piece}/master.json").read_text())
    picks = [f"{v}={row['take']}" for v, row in selected['versions'].items()]
    subprocess.run([sys.executable, str(root/'audio-src/music/tools/master.py'), piece, *picks,
                    '--note', selected['note']], check=True)
