from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2];folder=r/'.sites-runtime/overhaul-20261010/handoff-029'
def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()
m=json.loads((folder/'manifest.json').read_text());errors=[]
assert digest(Path(m['base'])/'manifest.json')==m['baseManifestSha256']
assert digest(Path(m['parent'])/'manifest.json')==m['parentManifestSha256']
for x in m['files']:
    for side,p in [('copy',folder/'files'/x['path']),('current',r/x['path'])]:
        if not p.is_file() or p.stat().st_size!=x['bytes'] or digest(p)!=x['sha256']:errors.append({'path':x['path'],'side':side})
o={'verifiedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'VERIFIED' if not errors else 'STOP','manifestSHA256':digest(folder/'manifest.json'),'files':m['count'],'bytes':m['bytes'],'baseManifestUnchanged':True,'parentManifestUnchanged':True,'mismatches':errors,'scope':m['scope']}
target=r/'.sites-runtime/overhaul-20261010/continuation-verification-029.json';assert not target.exists();target.write_text(json.dumps(o,indent=2));print(json.dumps(o));raise SystemExit(bool(errors))
