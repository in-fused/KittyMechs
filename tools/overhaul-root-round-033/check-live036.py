from pathlib import Path
import json,urllib.request,hashlib,datetime
r=Path(__file__).resolve().parents[2]
m=json.loads((r/'.sites-runtime/overhaul-20261009/build-036/receipt.json').read_text())
checks=[]
for relative in ['dist/index.html','dist/assets/index-feiYOhcd.js']:
 x=next(x for x in m['files'] if x['path']==relative)
 b=urllib.request.urlopen('http://localhost:8799/'+relative.removeprefix('dist/'),timeout=5).read()
 raw=hashlib.sha256(b).hexdigest()
 if relative=='dist/index.html':b=b.replace(b'<meta name="kittymech-arena" content="same-origin"/>',b'')
 checks.append({'path':relative,'rawServedSHA256':raw,'serverArenaMetadataRemoved':relative=='dist/index.html','matches036':hashlib.sha256(b).hexdigest()==x['sha256']})
h=json.load(urllib.request.urlopen('http://localhost:8799/health',timeout=5))
out={'verifiedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'health':{k:h[k] for k in ['status','rooms','players']}}
p=r/'.sites-runtime/overhaul-20261010/live036-http-verification-045.json';assert not p.exists();p.write_text(json.dumps(out,indent=2));print(json.dumps(out));assert all(x['matches036'] for x in checks)
