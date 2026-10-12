from pathlib import Path
import hashlib,json,urllib.request,sys
from closed_inputs import verified_input
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
frozen=r/'.sites-runtime/overhaul-20261009/build-057'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
def fetch(path):return urllib.request.urlopen('http://localhost:8799'+path,timeout=5).read()
checkpoint=json.loads((frozen/'playable-checkpoint.json').read_text(encoding='utf8'));assert checkpoint['verified'] and checkpoint['receiptSHA256']==sha(frozen/'receipt.json')
review=r/'docs/overhaul/critic/playability146-source-review.md'
assert 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8')
health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0
html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:
 assert meta in html;html=html.replace(meta,b'')
assert html==(frozen/'playable-root/dist/index.html').read_bytes()
files=[row(p) for p in h.glob('*') if p.is_file() and not p.name.endswith('-seal.json')]
for packet in ['overhaul-locomotion-143','overhaul-render-timeline-144','overhaul-training-worker-145']:
 seal=r/'tools'/packet/'source-seal.json';data=json.loads(seal.read_text(encoding='utf8'));assert data['writer']=='CLOSED';files.append(row(seal))
 for x in data['files']:files.append(row(verified_input(r,packet,x)))
 protected=r/'tools'/packet/'protected-inputs.json'
 if protected.exists():
  files.append(row(protected))
  for x in json.loads(protected.read_text(encoding='utf8'))['files']:assert sha(r/x['path'])==x['sha256'];files.append(row(r/x['path']))
files.extend(row(p) for p in [review,r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py'])
receipt=json.loads((frozen/'receipt.json').read_text(encoding='utf8'))
for x in receipt['files']:
 p=frozen/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'],x['path']
 if x['path'].startswith(('src/','shared/','server/')):assert sha(r/x['path'])==x['sha256'];files.append(row(r/x['path']))
protected=[row(frozen/'playable-root'/x['path']) for x in receipt['files']]+[row(frozen/'receipt.json')]
out=h/'play-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':files,'protected':protected,'command':[sys.executable,'tools/player-locomotion-146/play-launch.py'],'scope':'ONE public candidate057 ordinary both-rig locomotion and Solo worker lifecycle.100s root/90s child inclusive,70s work/20s cleanup. First genuine failure STOP; critic may reject quality despite tests. Human lag/full scope incomplete.'},indent=2),encoding='utf8')
print('146 public gate sealed after exact frozen HTTP identity, source hashes and idle check')
