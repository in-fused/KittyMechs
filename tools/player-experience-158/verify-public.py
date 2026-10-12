from pathlib import Path
import hashlib,json,sys,urllib.request
r=Path(__file__).resolve().parents[2];name=sys.argv[1];assert name in ['058','059'];b=r/'.sites-runtime/overhaul-20261009'/('build-'+name)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
expected={'058':'34d18375f05622f2eedbc269419ede6359b843e3a23b62d38d772478563717cf','059':'532b81110d44452c641548b42b9672bd1aa042933558320fdf85a77062b6a2ac'}[name]
assert sha(b/'receipt.json')==expected;d=json.loads((b/'receipt.json').read_text())
for x in d['files']:
 p=b/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256']
fetch=lambda p:urllib.request.urlopen('http://localhost:8799'+p,timeout=5).read();health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0;html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:
 assert meta in html;html=html.replace(meta,b'')
assert html==(b/'playable-root/dist/index.html').read_bytes()
print(json.dumps({'publicBuild':name,'receiptSHA256':expected,'filesVerified':len(d['files']),'httpIdentityVerified':True,'rooms':0,'players':0}))
