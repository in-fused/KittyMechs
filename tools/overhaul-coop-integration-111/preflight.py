from pathlib import Path
import hashlib,json,urllib.request,datetime,re
r=Path(__file__).resolve().parents[2];root=r/'.sites-runtime/overhaul-20261009/build-051/playable-root/dist'
def fetch(path):return urllib.request.urlopen('http://localhost:8799'+path,timeout=5).read()
html=fetch('/');assert b'<meta name="kittymech-arena" content="same-origin"/>' in html and b'<meta name="kittymech-client-report" content="local"/>' in html
clean=html.replace(b'<meta name="kittymech-arena" content="same-origin"/>',b'').replace(b'<meta name="kittymech-client-report" content="local"/>',b'');assert clean==(root/'index.html').read_bytes()
modules=re.findall(r'(?:src|href)="(/assets/[^" ]+\.js)"',html.decode());modules.extend('/assets/'+p.name for p in (root/'assets').glob('GameCanvas-*.js'));rows=[]
for path in sorted(set(modules)):
 data=fetch(path);assert data==(root/path.lstrip('/')).read_bytes();rows.append({'path':path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
health=json.loads(fetch('/health'));assert health['rooms']==0 and health['players']==0
out=r/'.sites-runtime/overhaul-20261010/coop111-preflight.json';assert not out.exists();out.write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'indexMatchesAfterKnownMetadata':True,'arenaMetadataEnabled':True,'clientReportEnabled':True,'modules':rows,'rooms':health['rooms'],'players':health['players'],'receipt':'671036323a86d63b5b65bbf66dc74f239079bd2f7d27d4d08833cf5d45576b4a','scope':'Current HTTP051 identity/idle admission only, not gameplay proof'},indent=2));print(json.dumps({'identity':'051 verified','rooms':health['rooms'],'players':health['players']}))


