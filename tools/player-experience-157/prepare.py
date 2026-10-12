from pathlib import Path
import json,hashlib,sys,urllib.request
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
b=r/'.sites-runtime/overhaul-20261009/build-058';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
receipt=sha(b/'receipt.json');assert receipt=='34d18375f05622f2eedbc269419ede6359b843e3a23b62d38d772478563717cf'
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
protected=[row(b/'receipt.json')]
for x in json.loads((b/'receipt.json').read_text())['files']:
 p=b/'playable-root'/x['path'];assert sha(p)==x['sha256'];protected.append(row(p))
health=json.load(urllib.request.urlopen('http://localhost:8799/health',timeout=5));assert health['rooms']==health['players']==0
html=urllib.request.urlopen('http://localhost:8799/',timeout=5).read()
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:assert meta in html;html=html.replace(meta,b'')
assert html==(b/'playable-root/dist/index.html').read_bytes()
files=[row(p) for p in [h/'camera-baseline.mjs',h/'prepare.py',h/'launch.py',r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py']]
p=h/'seal.json';assert not p.exists();p.write_text(json.dumps({'files':files,'protected':protected,'command':[sys.executable,'tools/player-experience-157/launch.py'],'scope':'ONE default6 noV camera diagnostic on frozen058, separate from154 locomotion gate.40child60root inclusive, readonly public ordinary controls.'},indent=2),encoding='utf8')
print('ONE157 frozen058/default6 camera diagnostic sealed')
