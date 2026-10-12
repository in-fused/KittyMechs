from pathlib import Path
import json,hashlib,urllib.request,sys
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;frozen=r/'.sites-runtime/overhaul-20261009/build-055'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
mode=sys.argv[1];assert mode in ['movement']
checkpoint=json.loads((frozen/'playable-checkpoint.json').read_text());assert checkpoint['verified'] and checkpoint['receiptSHA256']==sha(frozen/'receipt.json')
review=r/'docs/overhaul/critic/performance135-source-review.md';assert 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE' in review.read_text(encoding='utf8')
def fetch(path):return urllib.request.urlopen('http://localhost:8799'+path,timeout=5).read()
health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0
html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:
 assert meta in html;html=html.replace(meta,b'')
assert html==(frozen/'playable-root/dist/index.html').read_bytes()
manifest=json.loads((frozen/'playable-root/src/game/entities/identity57Runtime121Manifest.json').read_text());assert hashlib.sha256(fetch(manifest['publicURL'])).hexdigest()==manifest['sha256']
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
files=[row(p) for p in h.glob('*') if p.is_file() and not p.name.endswith('-seal.json')]
for packet in ['overhaul-performance-135']:
 seal=r/'tools'/packet/'source-seal.json';data=json.loads(seal.read_text());assert data['writer']=='CLOSED';files.append(row(seal))
 for x in data['files']:assert row(r/x['path'])==x;files.append(x)
 inputs=r/'tools'/packet/'protected-inputs.json'
 if inputs.exists():
  for x in json.loads(inputs.read_text())['files']:assert row(r/x['path'])==x;files.append(x)
files += [row(p) for p in [r/'tools/overhaul-play-ready.mjs',review,r/'tools/overhaul-root-round-027/run-seal.py',r/'tools/overhaul-root-round-033/run-mission-seal045.py']]
receipt=json.loads((frozen/'receipt.json').read_text())
for x in receipt['files']:
 p=frozen/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'],x['path']
 if x['path'].startswith(('src/','shared/','server/')):
  current=r/x['path'];assert sha(current)==x['sha256'];files.append(row(current))
protected=[row(frozen/'playable-root'/x['path']) for x in receipt['files']]+[row(frozen/'receipt.json')]
out=h/(mode+'-seal.json');assert not out.exists();out.write_text(json.dumps({'files':files,'protected':protected,'command':[sys.executable,'tools/player-performance-135/'+('launch.py' if mode=='movement' else 'mission-launch.py')],'scope':'ONE actualpublic '+mode+' observation. Movement90root80inclusive. No mission retry. First genuinefailureSTOP. Humanlag/fullscope unqualified'},indent=2))
print(mode+' sealed after original frozen055 rows and exact HTTP identity/idle verification')
