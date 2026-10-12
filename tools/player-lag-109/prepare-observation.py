from pathlib import Path
import json,hashlib,urllib.request,sys
r=Path(__file__).resolve().parents[2];frozen=r/'.sites-runtime/overhaul-20261009/build-051'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(frozen/'receipt.json')=='671036323a86d63b5b65bbf66dc74f239079bd2f7d27d4d08833cf5d45576b4a'
def fetch(path):return urllib.request.urlopen('http://localhost:8799'+path,timeout=5).read()
h=json.loads(fetch('/health'));assert h['rooms']==h['players']==0
html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:
 assert meta in html;html=html.replace(meta,b'')
assert html==(frozen/'playable-root/dist/index.html').read_bytes()
assert fetch('/assets/models/Pounce_Motion106.glb')==(frozen/'playable-root/dist/assets/models/Pounce_Motion106.glb').read_bytes()
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
files=[row(r/p) for p in ['tools/player-lag-109/capture.mjs','tools/player-lag-109/launch.py','tools/overhaul-play-ready.mjs','tools/overhaul-motion-106/playable-seal.json','package-lock.json','src/game/rendering/modelPaths.ts','docs/overhaul/critic/motion110-runtime-source-review.md']]
protected=[row(p) for p in (frozen/'playable-root').rglob('*') if p.is_file()]+[row(frozen/'receipt.json')]
seal=r/'tools/player-lag-109/observation-seal.json';assert not seal.exists()
seal.write_text(json.dumps({'files':files,'protected':protected,'command':[sys.executable,'tools/player-lag-109/launch.py']},indent=2))
print('Exact plain-URL candidate HTML/asset and idle server verified')
