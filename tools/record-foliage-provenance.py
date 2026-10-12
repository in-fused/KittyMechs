"""Record retained package and derivative hashes for independent asset admission."""
import json, hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/source/environment-foliage'
def record(path):
    data=path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}

packages=[]
for folder in ['fir_tree_01-blend-1k','fern_02-gltf-1k']:
    package=BASE/folder/'package.json'
    packages.append({'receipt':record(package),'package':json.loads(package.read_text())})
derivatives=[record(p) for p in sorted((BASE/'prepared').glob('*')) if p.is_file()]
derivatives += [record(p) for p in sorted((BASE/'editable').glob('*.blend'))]
derivatives += [record(BASE/'derivative-bounds.json')]
derivatives += [record(ROOT/'assets/runtime/models'/name) for name in ['Forest_Fir.glb','Forest_Fern.glb']]
shipping=[record(ROOT/'public/assets/models'/name) for name in ['Forest_Fir.glb','Forest_Fern.glb']]
receipt={'schema':1,'license':'CC0-1.0','licenseUrl':'https://polyhaven.com/license','units':'meters','up':'Y',
    'sources':packages,'derivatives':derivatives,'shipping':shipping,
    'transforms':{'fir':'Provider fir_tree_01_b_LOD2; stem origin/ground normalized; uniform height normalization to 13 meters. Provider UVMap corner-vector attribute promoted to true UV layer with per-material source mapping. Scanned trunk root flare below 6.5m radially bounded to .33m for the existing .34m square proxy; branch canopy unchanged. Material-separated wood decimation and connected branch thinning; whole needle UV patches retained near/all, mid/half, far/quarter. Three shared-material LODs; original source package unchanged. Sparse c variant and .5 needle cutoff rejected in rendered diagnosis.',
                  'fern':'Provider fern_02_b and fern_02_d clumps; original meter scale; local origin with lowest vertex grounded. Two decimated LODs per clump; source JPEG albedo reconstructed with separately downloaded official Alpha map.',
                  'textures':'Matched base color/GL normal/roughness normalized to 512px; 16-bit scalar data normalized by 257 before 8-bit conversion. Double-sided MASK: needles .15 to retain fine needle mip coverage; fern .5. glTF-Transform weld/dedup/prune/Meshopt medium.'},
    'sourceBounds':json.loads((BASE/'derivative-bounds.json').read_text()),
    'canonicalGameDevCliGateRan':False,'admission':'Manual provider license/hash/package integrity and local derivative validation. Production visual and independent critic acceptance pending.'}
(ROOT/'assets/reference/foliage-provenance.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('Recorded complete foliage source/derivative/shipping provenance.')
