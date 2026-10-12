from pathlib import Path
import hashlib,json,shutil,os,datetime
r=Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261010/handoff-082'
assert sha(prior/'manifest.json')=='68a77ccc6a0277c98b8ddc69f9b879667b6ebaf5394eb7e1293895b893e17417'
old=json.loads((prior/'manifest.json').read_text(encoding='utf8'))
for x in old['files']:assert sha(prior/'files'/x['path'])==x['sha256'],x['path']
p=r/'tools/overhaul-loading-208/source-seal.json'
assert sha(p)=='2b48ef227f1c7d7cc6c1da21890f234d6089c23b48f15e375ce4d1b1670bc185'
seal=json.loads(p.read_text(encoding='utf8'));assert seal['writer']=='CLOSED'
for x in seal['files']:assert sha(r/x['path'])==x['sha256'],x['path']
def atomic(p,text):
 q=p.with_name(p.name+'.207-final-tmp');q.write_text(text,encoding='utf8');os.replace(q,p)
p=r/'docs/overhaul/player-integration-207-handoff.md'
atomic(p,p.read_text(encoding='utf8')+'\n\nPreservation082 VERIFIED:68a77ccc6a0277c98b8ddc69f9b879667b6ebaf5394eb7e1293895b893e17417,76files45018130B,248working-runtime rows and437frozen rows MATCH062. CLOSED207 final sealdf127bd3f2f19be75d8e02877653c5e935527938ebcb656f86b0d099cc6165dc includes private asset/actual primary/forensics. Quaternion failed-interval Hermite midpoint norm.0104004234, normalized angle1.531367rad from left endpoint despite nearly equivalent neighboring rotations.\n\n208 now CLOSED source seal2b48ef227f1c7d7cc6c1da21890f234d6089c23b48f15e375ce4d1b1670bc185. Original premature CLOSED docs preserved unchanged, reviewed installer/client supplements isolate telemetry callback errors and retire page owner with rejecting tombstone; bfcache restore requires full reload for new compressed assets, product limitation explicit. Static fixtures only; no actual codec/performance claim. Root reviewed actual installed shared factory/async loader source and revised lifecycle. NEW210 bounded private compiled real-codec qualification assigned: one30s browser/worker run conditional on successful syntax/bundle/codec singleton preflight, five protected assets all meshopt resources byteequivalence versus retained sync codec, source buffers protected, no production changes/gameplay/two-client capture. First failure STOP/no repair/retry.209 remains STATIC. At this writing210 result pending; snapshot083 excludes active209/210. Full goal/human lag remain incomplete.\n')
p=r/'docs/overhaul/resource-limit-handoff-20261010.md';text=p.read_text(encoding='utf8')
text=text.replace('New082 preservation is prepared, not yet claimed verified at this pointer version.','082 VERIFIED manifest68a77ccc6a0277c98b8ddc69f9b879667b6ebaf5394eb7e1293895b893e17417,76files45018130B;248runtime/437frozenMATCH062. Final083 preserves CLOSED208 and current root decisions; active209/210 excluded.')
start=text.index('Active gait_contact088 owns NEW209')
end=text.index('\n\nGame Studio/',start)
text=text[:start]+'Active gait_contact088 owns NEW209 STATIC six-clip quaternion delivery comparison/recipe only; no converter/decode/preview authorized. CLOSED208 seal2b48ef227f1c7d7cc6c1da21890f234d6089c23b48f15e375ce4d1b1670bc185, reviewed installer/client supplemental recipe includes rejecting retired page owner and explicit bfcache reload limitation. Actual codec/FPS unproved. Active coop_controller101 owns NEW210 real-codec qualification: ONE private browser/worker30s conditional compile/syntax/singleton preflight, all meshopt resources in five protected assets strict byteequivalence/safe buffer ownership. No production/gameplay/two-client capture authorized. FirstfailureSTOP/no repair/retry; source/current actual process/result still pending at this pointer version.'+text[end:]
text=text.replace('Preserve active208/209 only after writers close','Preserve active209/210 only after writers close');atomic(p,text)
paths=[x['path'] for x in seal['files']]+['tools/overhaul-loading-208/source-seal.json','docs/overhaul/player-integration-207-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','tools/player-integration-207/preserve-final207.py','.sites-runtime/overhaul-20261010/continuation-verification-082.json']
dest=r/'.sites-runtime/overhaul-20261010/handoff-083';dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;before=sha(p);q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert before==sha(p)==sha(q),name
 rows.append({'path':name,'bytes':q.stat().st_size,'sha256':before})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Final207 root handoff and CLOSED208 static loading/worker reviewed source. Active209/210 excluded. No public upgrade; full goal and affected-human lag incomplete.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes'],'active209_210Excluded':True}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-083.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))
