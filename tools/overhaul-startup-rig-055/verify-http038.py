from pathlib import Path
import hashlib,json,re,urllib.request,datetime
r=Path(__file__).resolve().parents[2];root=r/'.sites-runtime/overhaul-20261009/build-038/playable-root/dist'
def fetch(path):return urllib.request.urlopen('http://localhost:8799'+path,timeout=5).read()
def sha(b):return hashlib.sha256(b).hexdigest()
html=fetch('/');clean=html.replace(b'<meta name="kittymech-arena" content="same-origin"/>',b'')
assert clean==(root/'index.html').read_bytes()
paths=re.findall(r'(?:src|href)="(/assets/[^" ]+\.js)"',html.decode())
paths.extend('/assets/'+p.name for p in (root/'assets').glob('GameCanvas-*.js'))
rows=[]
for path in sorted(set(paths)):
 b=fetch(path);expected=(root/path.lstrip('/')).read_bytes();assert b==expected,path
 rows.append({'path':path,'bytes':len(b),'sha256':sha(b)})
out=r/'.sites-runtime/overhaul-20261010/live038-http-verification.json';assert not out.exists()
out.write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'indexMatchesAfterKnownArenaMeta':True,'files':rows,'scope':'Actual HTTP038 index/module identity, not gameplay approval'},indent=2),encoding='utf8');print(json.dumps(rows))
