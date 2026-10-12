from pathlib import Path
import json,hashlib,urllib.request,sys,os
r=Path(__file__).resolve().parents[2]
frozen=r/'.sites-runtime/overhaul-20261009/build-050'
receipt=hashlib.sha256((frozen/'receipt.json').read_bytes()).hexdigest()
assert receipt=='7fb23695439b41446cfb120174ffde92c13091e9506fff3ab56142eeaea19c76'
def fetch(path):
    return urllib.request.urlopen('http://localhost:8799'+path,timeout=5).read()
health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0
assert json.loads(fetch('/client-report'))['clients']==[]
html=fetch('/').decode()
for meta in ['<meta name="kittymech-arena" content="same-origin"/>','<meta name="kittymech-client-report" content="local"/>']:
    assert meta in html;html=html.replace(meta,'')
assert html.encode('utf-8')==(frozen/'playable-root/dist/index.html').read_bytes()
for p in (frozen/'playable-root/dist/assets').glob('*.js'):
    assert fetch('/assets/'+p.name)==p.read_bytes()
def row(p):
    b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
files=[row(r/p) for p in ['tools/player-lag-105/capture.mjs','tools/player-lag-105/launch.py','tools/overhaul-play-ready.mjs','docs/overhaul/critic/player-lag-105-source-review.md','package-lock.json']]
protected=[row(p) for p in (frozen/'playable-root').rglob('*') if p.is_file()]+[row(frozen/'receipt.json')]
seal=r/'tools/player-lag-105/observation-seal.json';assert not seal.exists()
seal.write_text(json.dumps({'files':files,'protected':protected,'command':[sys.executable,'tools/player-lag-105/launch.py']},indent=2))
print(json.dumps({'exactHTTP':True,'idle':True,'freshReports':True,'receipt':receipt}))
