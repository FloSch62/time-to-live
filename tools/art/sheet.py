"""Small, bounded contact sheets of delivered art, for visual review without loading model weights.

Usage: python tools/art/sheet.py ships portraits weapons events ending regions
"""
import json
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
manifest = json.loads((ROOT / "art-src/manifest.json").read_text())
out = ROOT / "tools/shots/art"
out.mkdir(parents=True, exist_ok=True)
for group in sys.argv[1:]:
    entries = sorted(manifest.get("bg" if group == "regions" else group, {}).items())
    if group == "regions":
        entries = [(name, entry) for name, entry in entries if name.startswith(("s1-", "s2-", "s3-"))]
    if not entries:
        continue
    columns = 5 if group == "regions" else 4 if group in ("portraits", "weapons", "drones", "props") else 3
    cell_w, cell_h = (256, 220) if columns == 4 else (384, 240)
    sheet = Image.new("RGB", (columns * cell_w, math.ceil(len(entries) / columns) * cell_h), "#0b111c")
    draw = ImageDraw.Draw(sheet)
    for i, (name, entry) in enumerate(entries):
        x, y = i % columns * cell_w, i // columns * cell_h
        with Image.open(ROOT / "public" / entry["file"]) as source:
            image = source.convert("RGBA")
        scale = min((cell_w - 12) / image.width, (cell_h - 30) / image.height)
        image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.NEAREST)
        sheet.paste(image, (x + (cell_w - image.width) // 2, y + (cell_h - 24 - image.height) // 2), image)
        draw.text((x + 8, y + cell_h - 18), name, fill="#e8d8b0")
    path = out / f"{group}.png"
    sheet.save(path)
    print(f"{path}: {len(entries)} assets")
