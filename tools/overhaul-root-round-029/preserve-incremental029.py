from pathlib import Path
import json,hashlib,os,shutil,datetime
r=Path(__file__).resolve().parents[2]
base=r/'.sites-runtime/overhaul-20261009/preserved-007'
parent=r/'.sites-runtime/overhaul-20261010/handoff-027'
dest=r/'.sites-runtime/overhaul-20261010/handoff-029'
def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()
assert not dest.exists()
v=json.loads((r/'.sites-runtime/overhaul-20261010/continuation-verification-027.json').read_text())
assert v['status']=='VERIFIED' and digest(parent/'manifest.json')==v['manifestSHA256']
p=json.loads((parent/'manifest.json').read_text())
assert digest(base/'manifest.json')==p['baseManifestSha256']
old={x['path']:x for x in json.loads((base/'manifest.json').read_text())['files']}
old.update({x['path']:x for x in p['files']})
dest.mkdir();rows=[]
excluded={'.git','node_modules','.sites-runtime','test-results','test-results-online','playwright-report','__pycache__'}
for folder,dirs,names in os.walk(r):
    dirs[:]=[d for d in dirs if d not in excluded]
    for name in names:
        source=Path(folder)/name;rel=source.relative_to(r).as_posix();sha=digest(source)
        if rel in old and old[rel]['sha256'].lower()==sha:continue
        target=dest/'files'/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
        assert digest(target)==sha and digest(source)==sha,rel
        rows.append({'path':rel,'bytes':target.stat().st_size,'sha256':sha})
obj={'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'kind':'incremental','base':str(base),'baseManifestSha256':digest(base/'manifest.json'),'parent':str(parent),'parentManifestSha256':digest(parent/'manifest.json'),'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'files':rows,'scope':'Restore preserved-007/files, overlay handoff-027/files, then handoff-029/files. No deletions. Ignored editable assets retained in verified parent; original runtime evidence/builds/source036 stay at original paths. Failed handoff-028 is incomplete and is not a recovery layer.'}
(dest/'manifest.json').write_text(json.dumps(obj,indent=2));print(json.dumps({k:obj[k] for k in ['createdUTC','count','bytes','scope']}))
