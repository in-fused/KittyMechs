from pathlib import Path
import json,hashlib,urllib.request
r=Path(__file__).resolve().parents[2];b=r/'.sites-runtime/overhaul-20261009/build-060';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
expected='a17e8ae25f8f136e5a7d9ab145448f8fa977d41882e4d17cc5b2a24fa784867b';assert sha(b/'receipt.json')==expected;d=json.loads((b/'receipt.json').read_text())
for x in d['files']:
 p=b/'playable-root'/x['path'];assert sha(p)==x['sha256'] and p.stat().st_size==x['bytes']
fetch=lambda p:urllib.request.urlopen('http://localhost:8799'+p,timeout=5).read();health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0;html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:assert meta in html;html=html.replace(meta,b'')
assert html==(b/'playable-root/dist/index.html').read_bytes();print(json.dumps({'publicBuild':'060','receiptSHA256':expected,'filesVerified':len(d['files']),'httpIdentityVerified':True,'rooms':0,'players':0}))
