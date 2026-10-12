from pathlib import Path
import hashlib,json,re,urllib.request,datetime
r=Path(__file__).resolve().parents[2];build=r/'.sites-runtime/overhaul-20261009/build-036'
def sha(b):return hashlib.sha256(b).hexdigest()
assert sha((build/'receipt.json').read_bytes())=='1022aa38c1dd3a29ed0214ca30ad56f8571c3f9a1bd19f3578a99eba63aca0c6'
health=json.load(urllib.request.urlopen('http://localhost:8799/health',timeout=10));raw=urllib.request.urlopen('http://localhost:8799/',timeout=10).read()
index=raw.decode();clean=index.replace('<meta name="kittymech-arena" content="same-origin"/>','');expected=(build/'playable-root/dist/index.html').read_bytes()
assert sha(clean.encode())==sha(expected)
script=re.search(r'<script[^>]*src="([^"]+)"',index).group(1);served=urllib.request.urlopen('http://localhost:8799'+script,timeout=10).read();frozen=(build/'playable-root/dist'/script.lstrip('/')).read_bytes();assert sha(served)==sha(frozen)
o={'verifiedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'health':{k:health[k] for k in ['status','rooms','players']},'defaultBuild':'036','receiptSHA256':sha((build/'receipt.json').read_bytes()),'indexMatchesAfterKnownServerMeta':True,'servedJS':script,'servedJSSHA256':sha(served),'frozenJSMatch':True,'scope':'Read-only current live identity, not player-machine performance or historical cleanup proof. No050 candidate published.'}
p=r/'.sites-runtime/overhaul-20261010/live036-http-verification-050.json';assert not p.exists();p.write_text(json.dumps(o,indent=2));print(json.dumps(o))
