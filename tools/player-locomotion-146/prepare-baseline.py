from pathlib import Path
import hashlib,json,urllib.request,sys
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;frozen=r/'.sites-runtime/overhaul-20261009/build-056'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
expected='64e158e208f75d4829a40afdaf6e4de1285149b307d7653807e33391ef5bce20'
assert sha(frozen/'receipt.json')==expected
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
def fetch(p):return urllib.request.urlopen('http://localhost:8799'+p,timeout=5).read()
health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0
html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:assert meta in html;html=html.replace(meta,b'')
assert html==(frozen/'playable-root/dist/index.html').read_bytes()
data=json.loads((frozen/'receipt.json').read_text(encoding='utf-8'));protected=[]
for x in data['files']:
 p=frozen/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'];protected.append(row(p))
files=[row(p) for p in [h/'solo-baseline.mjs',h/'baseline-launch.py',h/'prepare-baseline.py',r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py']]
out=h/'baseline-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':files,'protected':protected+[row(frozen/'receipt.json')],'command':[sys.executable,'tools/player-locomotion-146/baseline-launch.py'],'scope':'ONE frozen056 actual SOLO baseline90sroot80inclusive; source worktree changes are not inputs to this immutable build. No netperformance/humanlag claim.'},indent=2),encoding='utf-8')
print('Fresh immutable056 solo baseline sealed; HTTP/receipt/idle verified.')
