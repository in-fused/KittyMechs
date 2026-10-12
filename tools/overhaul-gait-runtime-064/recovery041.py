from pathlib import Path
import json,hashlib,shutil,datetime
r=Path(__file__).resolve().parents[2];base=r/'.sites-runtime/overhaul-20261009/preserved-007';parent=r/'.sites-runtime/overhaul-20261010/handoff-040';dest=r/'.sites-runtime/overhaul-20261010/handoff-041'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
v=json.loads((r/'.sites-runtime/overhaul-20261010/continuation-verification-040.json').read_text());assert v['status']=='VERIFIED' and sha(parent/'manifest.json')==v['manifestSHA256']
m=json.loads((parent/'manifest.json').read_text());layers=[Path(p['path']) for p in m['parents']]+[parent];old={x['path']:x for x in json.loads((base/'manifest.json').read_text())['files']}
for layer in layers:old.update({x['path']:x for x in json.loads((layer/'manifest.json').read_text())['files']})
paths={p for folder in [r/'docs/overhaul',Path(__file__).resolve().parent] for p in folder.rglob('*') if p.is_file() and '__pycache__' not in p.parts};dest.mkdir(exist_ok=False);rows=[]
for source in sorted(paths):
 rel=source.relative_to(r).as_posix();digest=sha(source)
 if rel in old and old[rel]['sha256'].lower()==digest:continue
 target=dest/'files'/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target);assert sha(target)==digest and sha(source)==digest
 rows.append({'path':rel,'bytes':target.stat().st_size,'sha256':digest})
out={'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base':str(base),'baseManifestSha256':sha(base/'manifest.json'),'parents':[{'path':str(p),'manifestSHA256':sha(p/'manifest.json')} for p in layers],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Scoped064 source diagnosis, no game/asset/build change. Restore preserved007/files then027,029,030,031,032,033,034,035,036,037,038,039,040,041/files; no deletions, never028. Playable042 and source/assets040 retained. Full scope incomplete.'}
(dest/'manifest.json').write_text(json.dumps(out,indent=2),encoding='utf8');assert all(sha(Path(p['path'])/'manifest.json')==p['manifestSHA256'] for p in out['parents']);assert all(sha(dest/'files'/x['path'])==x['sha256'] and sha(r/x['path'])==x['sha256'] for x in rows)
receipt={'verifiedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'VERIFIED','files':len(rows),'bytes':out['bytes'],'manifestSHA256':sha(dest/'manifest.json'),'baseAndParentsManifestsUnchanged':True,'mismatches':[],'scope':out['scope']};(r/'.sites-runtime/overhaul-20261010/continuation-verification-041.json').write_text(json.dumps(receipt,indent=2),encoding='utf8');print(json.dumps(receipt))
