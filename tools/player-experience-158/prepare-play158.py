from pathlib import Path
import hashlib,json,sys,re,urllib.request
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;frozen=r/'.sites-runtime/overhaul-20261009/build-059'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
review=r/'docs/overhaul/critic/playability158-observer-review.md';expected=sys.argv[1]
assert re.fullmatch('[a-f0-9]{64}',expected) and sha(review)==expected
text=review.read_text(encoding='utf8');assert 'CLOSED' in text and 'APPROVE_ONE_PUBLIC_GATE' in text
assert sha(frozen/'receipt.json')=='532b81110d44452c641548b42b9672bd1aa042933558320fdf85a77062b6a2ac'
prod=r/'docs/overhaul/critic/playability155-source-review.md';assert sha(prod)=='7aacb8db970ffe8c4a0ee11aa580f1395066c12cf7253d1aaa7910b7ffd75ae0'
files=[row(p) for p in [review,prod,h/'prepare-play158.py',h/'play158-launch.py',h/'play158.mjs',h/'prepare-observer158.py',r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py']]
seal=r/'tools/overhaul-locomotion-155/source-seal.json';assert sha(seal)=='210db53611d60202ff00f83fba550c8f192896ac3b108e33ba13b1f1ef5c0664'
data=json.loads(seal.read_text());assert data['writer']=='CLOSED';files.append(row(seal))
for x in data['files']:
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'];files.append(row(p))
receipt=json.loads((frozen/'receipt.json').read_text());protected=[row(frozen/'receipt.json')]
for x in receipt['files']:
 p=frozen/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'];protected.append(row(p))
 if x['path'].startswith(('src/','shared/','server/')):assert sha(r/x['path'])==x['sha256'];files.append(row(r/x['path']))
old=r/'.sites-runtime/overhaul-20261009/build-058'
assert sha(old/'receipt.json')=='34d18375f05622f2eedbc269419ede6359b843e3a23b62d38d772478563717cf'
protected.append(row(old/'receipt.json'))
for x in json.loads((old/'receipt.json').read_text())['files']:
 p=old/'playable-root'/x['path'];assert sha(p)==x['sha256'];protected.append(row(p))
fetch=lambda p:urllib.request.urlopen('http://localhost:8799'+p,timeout=5).read()
health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0;html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:assert meta in html;html=html.replace(meta,b'')
assert html==(frozen/'playable-root/dist/index.html').read_bytes()
p=h/'play158-seal.json';assert not p.exists();p.write_text(json.dumps({'files':list({x['path']:x for x in files}.values()),'protected':protected,'command':[sys.executable,'tools/player-experience-158/play158-launch.py'],'scope':'ONE freshly bound059 actual155 sourceheading/event/mount default6m ON/OFF/nativeR/aimprobe/13actorSoloWorker startup/pause/teardown;70work20cleanup90child100root. No affectedhumanlag/contact/fullscope proof, firstfailureSTOP independentretention required.'},indent=2),encoding='utf8')
print('ONE158 actual059 gate freshly sealed;058 rollback protected')
