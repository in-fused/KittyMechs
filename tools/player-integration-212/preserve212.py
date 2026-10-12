from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261010/handoff-083'
assert sha(prior/'manifest.json')=='0bdebe393b3196349b1a5044f90c2c29625a922e1009d0a4cf06a1bc608d932e'
old=json.loads((prior/'manifest.json').read_text(encoding='utf8'))
for x in old['files']:assert sha(prior/'files'/x['path'])==x['sha256'],x['path']
seals={
 'tools/overhaul-delivery-209/source-seal209.json':'9d8b3e4b51e126283f7f109094efc33c8f3cc7a345ffd770f2471c1a92988e97',
 'tools/overhaul-delivery-primary-209/final-source-seal209.json':'48563ddb42edc1ab8bd83fbf503fb4d29a04777200954d5dbfadc59951ab64a7',
 'tools/overhaul-preview-209/final-source-seal209.json':'01ac399b14cc1ae9887b9c98af2d7998ef99f8148aaaa4f22ebc3af806b69f99',
 'tools/overhaul-preview-wrapper-209/source-seal209.json':'ee1b02b9c6c81e55db91c7e68d2f043763269a1464e15c8b04ee2acfa3aae2b2',
 '.sites-runtime/overhaul-20261011/codec210-actual/output-seal.json':'c93a706ebe7e342b1b9885b840901c766f6677bc82f54e874eb7005abab16cf6',
 'tools/overhaul-readiness-211/source-seal211.json':'0c579f94b28e3560b27c90b578e98243622074e9c14e9e3aefad05a3bac3da47',
 '.sites-runtime/overhaul-20261011/loading212-actual/output-seal.json':'c0edb1a75d5d798e1a24eeb1ff673a324ef60b88025937ea82ce85a022853822',
 'tools/overhaul-loading-capture-213/source-seal.json':'7637c518072e0c1896aeab3407dd1f3f49b75600e8e2db1a66175d0e6acb09ab',
 '.sites-runtime/overhaul-20261011/loading213-actual/output-seal.json':'92689323836948a427af8d8cb14daf2ae451143a64b14ef97ca2dbeaa7da0abf',
}
for name,digest in seals.items():
 p=r/name;assert sha(p)==digest,name
 s=json.loads(p.read_text(encoding='utf8'));assert s['writer']=='CLOSED',name
 for x in s['files']:assert sha(r/x['path'])==x['sha256'],x['path']
base=r/'.sites-runtime/overhaul-20261009/build-062'
assert sha(base/'receipt.json')=='5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c'
runtime=0
for x in json.loads((base/'receipt.json').read_text(encoding='utf8'))['files']:
 assert sha(base/'playable-root'/x['path'])==x['sha256'],x['path']
 if x['path'].startswith(('src/','shared/','server/')):assert sha(r/x['path'])==x['sha256'];runtime+=1
paths=['docs/overhaul/player-integration-212-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/critic/motion209-temporal-review.md','docs/overhaul/critic/readiness211-source-review.md']
folders=['tools/player-integration-212','tools/overhaul-delivery-209','tools/overhaul-delivery-primary-209','tools/overhaul-preview-209','tools/overhaul-preview-wrapper-209','tools/overhaul-codec-210','tools/overhaul-readiness-211','tools/overhaul-loading-capture-212','tools/overhaul-loading-capture-213','.sites-runtime/overhaul-20261010/delivery209-primary','.sites-runtime/overhaul-20261011/codec210-actual','.sites-runtime/overhaul-20261011/readiness211-private','.sites-runtime/overhaul-20261011/loading212-actual','.sites-runtime/overhaul-20261011/loading212-supervisor','.sites-runtime/overhaul-20261011/loading213-actual','.sites-runtime/overhaul-20261011/loading213-supervisor']
for folder in folders:
 assert (r/folder).is_dir(),folder
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
dest=r/'.sites-runtime/overhaul-20261011/handoff-084';dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;before=sha(p);q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert before==sha(p)==sha(q),name
 rows.append({'path':name,'bytes':q.stat().st_size,'sha256':before})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'CLOSED209 actual delivery/full primary/temporal renders/critic; CLOSED210 actual codec; CLOSED211 private source/build/critic; CLOSED212 failed actual; CLOSED213 static adapter and failed actual. Active214 and215 excluded. No public upgrade; full overhaul and affected-human lag incomplete.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes'],'runtimeRowsMatched062':runtime,'active214And215Excluded':True}
(r/'.sites-runtime/overhaul-20261011/continuation-verification-084.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))
