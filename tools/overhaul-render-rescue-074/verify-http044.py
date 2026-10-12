from pathlib import Path
import hashlib,json,re,urllib.request,datetime
r=Path(__file__).resolve().parents[2];root=r/'.sites-runtime/overhaul-20261009/build-044/playable-root/dist'
def fetch(path):return urllib.request.urlopen('http://localhost:8799'+path,timeout=5).read()
html=fetch('/');assert html.replace(b'<meta name="kittymech-arena" content="same-origin"/>',b'')==(root/'index.html').read_bytes()
paths=re.findall(r'(?:src|href)="(/assets/[^" ]+\.js)"',html.decode());paths.extend('/assets/'+p.name for p in (root/'assets').glob('GameCanvas-*.js'));rows=[]
for path in sorted(set(paths)):
 b=fetch(path);assert b==(root/path.lstrip('/')).read_bytes();rows.append({'path':path,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
out=r/'.sites-runtime/overhaul-20261010/live044-http-verification.json';assert not out.exists();out.write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'indexMatchesAfterKnownArenaMeta':True,'files':rows,'scope':'ActualHTTP044identity, notgameplayapproval'},indent=2),encoding='utf8');print(json.dumps(rows))
