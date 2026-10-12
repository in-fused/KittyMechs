"""Retain an official, closed model source package before deriving runtime art.

This verifies provider MD5/size and local SHA256. It is not the unavailable
game-dev package/vendor workflow and makes no engine or artistic acceptance claim.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
from urllib.request import Request, urlopen
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/source/environment-foliage'

def fetch(url):
    if urlparse(url).hostname not in ('api.polyhaven.com', 'dl.polyhaven.org', 'polyhaven.com'):
        raise ValueError('Unexpected official source host')
    with urlopen(Request(url, headers={'User-Agent': 'KittyMech source preservation'}), timeout=90) as response:
        return response.read()

def digest(data, kind='sha256'):
    return hashlib.new(kind, data).hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('asset', choices=['fern_02', 'fir_tree_01'])
    parser.add_argument('--format', choices=['gltf', 'blend'], default='gltf')
    parser.add_argument('--resolution', choices=['1k', '2k'], default='1k')
    args = parser.parse_args()
    destination = (BASE / (args.asset + '-' + args.format + '-' + args.resolution)).resolve()
    if not destination.is_relative_to(BASE.resolve()):
        raise ValueError('Source package escaped staging')
    destination.mkdir(parents=True, exist_ok=True)
    info_url = 'https://api.polyhaven.com/info/' + args.asset
    files_url = 'https://api.polyhaven.com/files/' + args.asset
    info_bytes, files_bytes = fetch(info_url), fetch(files_url)
    info, files = json.loads(info_bytes), json.loads(files_bytes)
    selected = files[args.format][args.resolution][args.format]
    roster = []
    entries = [(Path(urlparse(selected['url']).path).name, selected), *selected.get('include', {}).items()]
    # Provider glTF declares MASK but embeds JPEG diffuse; retain its separately
    # published alpha so the derivative can reconstruct actual leaf cutouts.
    if args.asset == 'fern_02' and args.format == 'gltf':
        alpha = files['Alpha'][args.resolution]['png']
        entries.append(('textures/' + Path(urlparse(alpha['url']).path).name, alpha))
    if sum(entry['size'] for _, entry in entries) > 1_500_000_000:
        raise ValueError('Source package exceeds bounded download size')
    for relative, entry in entries:
        path = PurePosixPath(relative)
        if path.is_absolute() or '..' in path.parts:
            raise ValueError('Source dependency escaped package')
        target = (destination / path).resolve()
        if not target.is_relative_to(destination):
            raise ValueError('Source dependency resolved outside package')
        target.parent.mkdir(parents=True, exist_ok=True)
        data = target.read_bytes() if target.exists() else fetch(entry['url'])
        if len(data) != entry['size'] or digest(data, 'md5') != entry['md5']:
            raise ValueError('Provider size/MD5 mismatch: ' + relative)
        if not target.exists():
            target.write_bytes(data)
        roster.append({'path': relative, 'url': entry['url'], 'bytes': len(data), 'providerMd5': entry['md5'], 'sha256': digest(data)})
        print('VERIFIED', relative, len(data), flush=True)
    for name, data in [('info.json', info_bytes), ('files.json', files_bytes), ('license.html', fetch('https://polyhaven.com/license'))]:
        (destination / name).write_bytes(data)
        roster.append({'path': name, 'bytes': len(data), 'sha256': digest(data)})
    manifest = {'asset': args.asset, 'name': info['name'], 'authors': info['authors'], 'license': 'CC0-1.0',
                'licenseUrl': 'https://polyhaven.com/license', 'assetUrl': 'https://polyhaven.com/a/' + args.asset,
                'metadataUrl': info_url, 'format': args.format, 'resolution': args.resolution, 'files': roster,
                'sourcePolycount': info.get('polycount'), 'integrity': 'Complete declared provider dependency set; MD5/size and SHA256 verified',
                'artisticAcceptance': 'pending', 'vendoringCliUsed': False}
    (destination / 'package.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
    print('SOURCE_PACKAGE', destination, flush=True)

if __name__ == '__main__':
    main()
