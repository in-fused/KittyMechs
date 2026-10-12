from pathlib import Path
import hashlib,json,sys,urllib.request
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;frozen=r/'.sites-runtime/overhaul-20261009/build-058'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
assert sha(frozen/'receipt.json')=='34d18375f05622f2eedbc269419ede6359b843e3a23b62d38d772478563717cf'
review=r/'docs/overhaul/critic/playability154-source-addendum.md';assert sha(review)=='442be44cb490e4aa72c548165f9fd5f5d281f60f3f5e487435414a9313f0096d'
assert 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8')
assert sha(h/'play154.mjs')=='8f90c670e0d83444e8fa50741e943767883823c5454b5129c2af98023dbb1f43'
files=[row(p) for p in [review,r/'docs/overhaul/critic/playability154-source-review.md',h/'prepare-play154.py',h/'play154-launch.py',h/'play154.mjs',r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py']]
seal=r/'tools/overhaul-locomotion-154/source-seal.json';data=json.loads(seal.read_text(encoding='utf8'));assert data['writer']=='CLOSED';files.append(row(seal))
for x in data['files']:
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'];files.append(row(p))
receipt=json.loads((frozen/'receipt.json').read_text(encoding='utf8'));protected=[row(frozen/'receipt.json')]
for x in receipt['files']:
 p=frozen/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'];protected.append(row(p))
 if x['path'].startswith(('src/','shared/','server/')):assert sha(r/x['path'])==x['sha256'];files.append(row(r/x['path']))
def fetch(path):return urllib.request.urlopen('http://localhost:8799'+path,timeout=5).read()
health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0;html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:
 assert meta in html;html=html.replace(meta,b'')
assert html==(frozen/'playable-root/dist/index.html').read_bytes()
out=h/'play154-seal.json';assert not out.exists();out.write_text(json.dumps({'files':list({x['path']:x for x in files}.values()),'protected':protected,'command':[sys.executable,'tools/player-playability-150/play154-launch.py'],'scope':'ONE freshly bound public058 actual154 source animation view/normalinputs/bothrigs/R/Cprobe/native13ActorSoloWorker lifecycle;70work20cleanup90child100root. FirstfailureSTOP, independentactualretention required. No affectedhumanlag/contact/fullgoal qualification.'},indent=2),encoding='utf8')
print('154 ONE public058 gate sealed against actual HTTP and exact immutable source')
