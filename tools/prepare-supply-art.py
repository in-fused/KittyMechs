"""Admit provider-generated supply faceplates into the local browser game."""
from pathlib import Path
import hashlib
import json
import urllib.request
from PIL import Image

root = Path(__file__).resolve().parents[1]
path = root / 'assets/reference/higgsfield-supplies.json'
receipt = json.loads(path.read_text(encoding='utf-8'))
for asset in receipt['assets']:
    original = root / asset['original']
    original.parent.mkdir(parents=True, exist_ok=True)
    if not original.exists():
        urllib.request.urlretrieve(asset['source_url'], original)
    with Image.open(original) as image:
        image.load()
        if image.width < 256 or image.height < 256:
            raise ValueError('Supply texture is below the shipping resolution')
        output = root / asset['runtime']
        output.parent.mkdir(parents=True, exist_ok=True)
        image.convert('RGB').resize((256, 256), Image.Resampling.LANCZOS).save(output, 'WEBP', quality=90)
        asset['sourceDimensions'] = [image.width, image.height]
    asset['sourceSha256'] = hashlib.sha256(original.read_bytes()).hexdigest()
    asset['runtimeSha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
    asset['runtimeBytes'] = output.stat().st_size
path.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print('Prepared three 256px Higgsfield supply faceplates with retained originals and hashes.')
