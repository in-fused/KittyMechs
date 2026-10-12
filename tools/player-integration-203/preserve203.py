from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261010/handoff-076'
assert sha(prior/'manifest.json')=='05fd0f5fb9ebe6ae7d0216015e31458a3806cac11ec720335e97ecac38eac452'
old=json.loads((prior/'manifest.json').read_text(encoding='utf8'))
for x in old['files']:assert sha(prior/'files'/x['path'])==x['sha256'],x['path']
for name,expected in [('tools/overhaul-coop-201/source-seal.json','2045aa6f91aebca672cd23a56fcb44edd7998c7af3127bfd78d037c81eb03e48'),('.sites-runtime/overhaul-20261010/coop201-supervisor/actual-output-seal.json','4ea9b9a8779b679b99b1c1317431a77b80587d88b964cccf295972c7a2acc1a1')]:
 p=r/name;assert sha(p)==expected;seal=json.loads(p.read_text(encoding='utf8'));assert seal['writer']=='CLOSED'
 for x in seal['files']:assert sha(r/x['path'])==x['sha256'],x['path']
base=r/'.sites-runtime/overhaul-20261009/build-062';assert sha(base/'receipt.json')=='5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c'
count=0
for x in json.loads((base/'receipt.json').read_text(encoding='utf8'))['files']:
 assert sha(base/'playable-root'/x['path'])==x['sha256'],x['path']
 if x['path'].startswith(('src/','shared/','server/')):assert sha(r/x['path'])==x['sha256'];count+=1
paths=['docs/overhaul/player-integration-203-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/coop201-handoff.md','docs/overhaul/critic/coop201-actual-review.md']
for folder in ['tools/overhaul-coop-201','tools/player-integration-203','.sites-runtime/overhaul-20261010/coop201-source-initial','.sites-runtime/overhaul-20261010/coop201-public','.sites-runtime/overhaul-20261010/coop201-supervisor','.sites-runtime/overhaul-20261010/coop201-review']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
dest=r/'.sites-runtime/overhaul-20261010/handoff-077';dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q),name
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'203 closed201 actual normal two-client failed approach and source correction, exact videos/602 parity/protected terminal receipts, derived temporal review and independent critic. Active202/204 private preparation excluded; exact062 runtime remains, full scope and human lag incomplete.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes'],'runtimeRowsMatched062':count,'active202_204Excluded':True}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-077.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))
