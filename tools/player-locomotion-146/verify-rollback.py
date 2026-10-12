from pathlib import Path
import json,hashlib,urllib.request
r=Path(__file__).resolve().parents[2];f=r/'.sites-runtime/overhaul-20261009/build-056'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
d=json.loads((f/'receipt.json').read_text(encoding='utf8'))
assert sha(f/'receipt.json')=='64e158e208f75d4829a40afdaf6e4de1285149b307d7653807e33391ef5bce20'
assert all(sha(f/'playable-root'/x['path'])==x['sha256'] for x in d['files'])
html=urllib.request.urlopen('http://localhost:8799/',timeout=5).read()
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:
 assert meta in html;html=html.replace(meta,b'')
assert html==(f/'playable-root/dist/index.html').read_bytes()
health=json.loads(urllib.request.urlopen('http://localhost:8799/health',timeout=5).read());assert health['rooms']==health['players']==0
out={'restored':'056','receiptSHA256':sha(f/'receipt.json'),'originalFrozenFilesVerified':len(d['files']),'httpIdentityMatch':True,'rooms':health['rooms'],'players':health['players'],'pid':355996,'serverSession':51895,'port':8799,'candidate057':'REJECTED, stopped363804/session32946; source/frozen artifact retained'}
dest=r/'.sites-runtime/overhaul-20261010/playability146-review';dest.mkdir(exist_ok=True)
(dest/'rollback.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))
