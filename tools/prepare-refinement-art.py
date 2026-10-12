"""Normalize generated source images into bounded web assets; originals remain editable."""
import json, urllib.request
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
receipt = json.loads((root / 'assets/reference/higgsfield-refinement.json').read_text())
for asset in receipt['assets']:
    source, target = root / asset['original'], root / asset['runtime']
    source.parent.mkdir(parents=True, exist_ok=True)
    target.parent.mkdir(parents=True, exist_ok=True)
    if not source.exists():
        urllib.request.urlretrieve(asset['source_url'], source)
    image = Image.open(source).convert('RGB')
    image.thumbnail((1280, 720) if asset['index'] < 3 else (1024, 1024), Image.Resampling.LANCZOS)
    image.save(target, quality=86, method=6)
    print(target.name, target.stat().st_size)

for source in (root / 'assets/runtime/art').glob('chassis-*.png'):
    target = root / 'public/assets/art' / (source.stem + '.webp')
    image = Image.open(source).convert('RGBA')
    image.thumbnail((512, 512), Image.Resampling.LANCZOS)
    image.save(target, quality=88, method=6)
    print(target.name, target.stat().st_size)
