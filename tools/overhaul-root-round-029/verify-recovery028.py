from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2];folder=r/'.sites-runtime/overhaul-20261010/handoff-028'
def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()
manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'));errors=[]
assert digest(Path(manifest['base'])/'manifest.json')==manifest['baseManifestSha256']
for row in manifest['files']:
    for label,p in [('copy',folder/'files'/row['path']),('current',r/row['path'])]:
        if not p.is_file() or p.stat().st_size!=row['bytes'] or digest(p)!=row['sha256']:errors.append({'path':row['path'],'side':label})
receipt={'verifiedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'VERIFIED' if not errors else 'MISMATCH_STOP','checkpoint':str(folder),'files':manifest['count'],'bytes':manifest['bytes'],'baseManifestUnchanged':True,'manifestSHA256':digest(folder/'manifest.json'),'copiedAndCurrentSourceChecked':True,'mismatches':errors,'scope':'Source including ignored editable assets; original runtime evidence and playable roots remain at original paths; no deletions'}
target=r/'.sites-runtime/overhaul-20261010/continuation-verification-028.json';assert not target.exists();target.write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(json.dumps(receipt,ensure_ascii=True));raise SystemExit(1 if errors else 0)

