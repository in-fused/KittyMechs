from pathlib import Path
import hashlib,json,sys,urllib.request
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;b=r/'.sites-runtime/overhaul-20261009/build-060';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
expected='a17e8ae25f8f136e5a7d9ab145448f8fa977d41882e4d17cc5b2a24fa784867b';assert sha(b/'receipt.json')==expected
review=r/'docs/overhaul/critic/playability166-actual-review.md';assert sha(review)=='699d370ccd2ced7d3086184bd2bb9d74ca400e8cf489167510bb822c317cdc54';protected=[row(b/'receipt.json')]
for x in json.loads((b/'receipt.json').read_text())['files']:
 p=b/'playable-root'/x['path'];assert sha(p)==x['sha256'];protected.append(row(p))
fetch=lambda p:urllib.request.urlopen('http://localhost:8799'+p,timeout=5).read();health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0;html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:assert meta in html;html=html.replace(meta,b'')
assert html==(b/'playable-root/dist/index.html').read_bytes()
files=[row(p) for p in [h/'prepare.py',h/'launch.py',h/'profile.mjs',r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py',review,r/'package.json',r/'package-lock.json']]
p=h/'profile-seal.json';assert not p.exists();p.write_text(json.dumps({'files':files,'protected':protected,'command':[sys.executable,'tools/overhaul-profile-169/launch.py'],'scope':'ONE read-only retained060 main-thread CPU sampling measurement, no gameplay admission or source mutation;70work90child100root firstfailureSTOP.'},indent=2),encoding='utf8');print('Profile169 sealed')
