from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261010/handoff-081'
assert sha(prior/'manifest.json')=='a896d4c49660ba15b9f03f6b33484c35d5172305cbb3f7e8b7b87928106caabb'
old=json.loads((prior/'manifest.json').read_text(encoding='utf8'))
for x in old['files']:assert sha(prior/'files'/x['path'])==x['sha256'],x['path']
for name,expected in [
 ('tools/overhaul-delivery-206/source-seal.json','7838a1577f6c14c6678e1cd76eb1d90783248566b219e79617ab09413ac3a4a0'),
 ('tools/overhaul-delivery-primary-207/readiness-seal207.json','a7d478825fbe5ea9cda3f12d4dc9fe073e80aa180263cc6c7f43726cc75ea759'),
 ('.sites-runtime/overhaul-20261010/coop204-supervisor/actual-output-seal.json','d2bdd2f367ef0f6a36bdd16031d1d82918d504437a1af415a156201a9f35d9cc')]:
 p=r/name;assert sha(p)==expected,name;seal=json.loads(p.read_text(encoding='utf8'));assert seal['writer']=='CLOSED'
 for x in seal['files']:assert sha(r/x['path'])==x['sha256'],x['path']
# Caller supplies the independently closed primary-output seal path and digest.
import sys
assert len(sys.argv)==3,'Need closed primary seal path and exact SHA'
p=r/sys.argv[1];assert sha(p)==sys.argv[2]
seal=json.loads(p.read_text(encoding='utf8'));assert seal['writer']=='CLOSED'
for x in seal['files']:assert sha(r/x['path'])==x['sha256'],x['path']
base=r/'.sites-runtime/overhaul-20261009/build-062'
assert sha(base/'receipt.json')=='5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c'
runtime=0
for x in json.loads((base/'receipt.json').read_text(encoding='utf8'))['files']:
 assert sha(base/'playable-root'/x['path'])==x['sha256'],x['path']
 if x['path'].startswith(('src/','shared/','server/')):assert sha(r/x['path'])==x['sha256'];runtime+=1
paths=['docs/overhaul/player-integration-207-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/critic/coop204-actual-review.md']
for folder in ['tools/player-integration-207','tools/overhaul-delivery-206','tools/overhaul-delivery-primary-207','.sites-runtime/overhaul-20261010/delivery206-primary','.sites-runtime/overhaul-20261010/coop204-public','.sites-runtime/overhaul-20261010/coop204-supervisor','.sites-runtime/overhaul-20261010/coop204-supervisor-preparation']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
dest=r/'.sites-runtime/overhaul-20261010/handoff-082';dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;before=sha(p);q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert before==sha(q)==sha(p),name
 rows.append({'path':name,'bytes':q.stat().st_size,'sha256':before})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'207 closed204 actual readiness failure/videos/critic and206 exact delivery implementation/sole alias repair/private asset/primary evidence. Active208 source preparation excluded. Full overhaul and affected-human lag incomplete; runtime062 retained.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes'],'runtimeRowsMatched062':runtime,'active208Excluded':True}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-082.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))
