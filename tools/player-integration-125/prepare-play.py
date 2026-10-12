from pathlib import Path
import json,hashlib,urllib.request,sys
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;frozen=r/'.sites-runtime/overhaul-20261009/build-053'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checkpoint=json.loads((frozen/'playable-checkpoint.json').read_text());assert checkpoint['verified'] and checkpoint['receiptSHA256']==sha(frozen/'receipt.json')
review=r/'docs/overhaul/critic/anatomy131-integration-source-review.md';assert 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE' in review.read_text(encoding='utf8')
def fetch(path):return urllib.request.urlopen('http://localhost:8799'+path,timeout=5).read()
health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0
html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:
 assert meta in html;html=html.replace(meta,b'')
assert html==(frozen/'playable-root/dist/index.html').read_bytes()
manifest=json.loads((frozen/'playable-root/src/game/entities/identity57Runtime121Manifest.json').read_text())
assert hashlib.sha256(fetch(manifest['publicURL'])).hexdigest()==manifest['sha256']
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
files=[row(p) for p in [h/'capture.mjs',h/'launch.py',h/'prepare-play.py',r/'tools/overhaul-play-ready.mjs',review,r/'tools/overhaul-root-round-027/run-seal.py']]
receipt=json.loads((frozen/'receipt.json').read_text())
for x in receipt['files']:
 p=frozen/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'],x['path']
protected=[row(frozen/'playable-root'/x['path']) for x in receipt['files']]+[row(frozen/'receipt.json')]
out=h/'play-seal.json';assert not out.exists();out.write_text(json.dumps({'files':files,'protected':protected,'command':[sys.executable,'tools/player-integration-125/launch.py'],'scope':'ONE actualplainURL newskin45-browsercontract/gait/liveR observation;90root80inclusive,firstfailureSTOP. HumanIABlag/fullscope unqualified'},indent=2))
print('Actual053 HTTP HTML/asset identity+idle confirmed, one ordinarypublic observation sealed')
