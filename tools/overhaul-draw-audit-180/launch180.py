from pathlib import Path
import hashlib,json,sys,urllib.request
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
review=r/'docs/overhaul/critic/draw180-source-review.md';assert sha(review)==sys.argv[1] and 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8')
seal=h/'source-seal.json';assert sha(seal)==sys.argv[2];d=json.loads(seal.read_text());assert d['writer']=='CLOSED'
for x in d['files']+d['protected']:
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'],x['path']
b=r/'.sites-runtime/overhaul-20261009/build-061'
fetch=lambda path:urllib.request.urlopen('http://localhost:8799'+path,timeout=5).read()
health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0
html=fetch('/')
for tag in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:assert tag in html;html=html.replace(tag,b'')
assert html==(b/'playable-root/dist/index.html').read_bytes()
out=h/'public-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':d['files']+[row(review),row(seal)],'protected':d['protected'],'command':['node','tools/overhaul-draw-audit-180/capture180.mjs'],'scope':'ONE read-only draw-attribution counter in isolated ordinary browser page on frozen061.60work20cleanup80child90root,12frames per3phases. FirstfailureSTOP/no replay or semantic graphics/game override. Counters NOT GPU timing or human lag proof.'},indent=2),encoding='utf8');print('Prepared180 exact061')
