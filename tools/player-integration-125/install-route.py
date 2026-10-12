from pathlib import Path
import json,hashlib,shutil
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
review=r/'docs/overhaul/critic/anatomy131-integration-source-review.md';assert 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE' in review.read_text(encoding='utf8')
receipt=json.loads((r/'.sites-runtime/overhaul-20261010/anatomy131-batch/process-receipt.json').read_text());assert receipt['exitCode']==0 and receipt['inclusiveBoundObserved'] and all(x['match'] for x in receipt['inputsAfter'])
p=r/'tools/overhaul-anatomy-batch-131';route=json.loads((p/'route-proposal.json').read_text());manifest=json.loads((r/route['generatedManifest']).read_text())
assert manifest['schema']=='identity57-anatomy121-exact-compatible-attribute-batch' and manifest['browserLoaderValidationRequired'] is True and len(manifest['clips'])==45
candidate=p/'output/Pounce_Anatomy121Batched.glb'
witness=json.loads((p/'output/receipt.json').read_text());assert witness['status']=='EXACT_ATTRIBUTE_BATCH_BROWSER_UNADMITTED' and witness['witness']['candidatePrimitives']==manifest['candidatePrimitives']==5 and witness['witness']['shaderVertexTriangleBytesExact']
assert sha(candidate)==manifest['sha256']
public=r/'public/assets/models/Pounce_Anatomy121Batched.glb';assert not public.exists()
changes=[];pre=h/'route-preimages';pre.mkdir(exist_ok=False)
for key,subkey in [('actor','actorSubstitutions'),('preload','preloadSubstitutions')]:
 target=r/route[key];old=target.read_text(encoding='utf8');new=old
 for before,after in route[subkey].items():assert before in new,(key,before);new=new.replace(before,after)
 changes.append((target,new));shutil.copy2(target,pre/target.name)
for a,b in [('generatedManifest','installManifest'),('assetModuleProposal','installAssetModule')]:
 target=r/route[b];assert not target.exists();changes.append((target,(r/route[a]).read_text(encoding='utf8')))
shutil.copy2(candidate,public)
assert sha(public)==manifest['sha256']
for target,new in changes:target.write_text(new,encoding='utf8')
(h/'route-receipt.json').write_text(json.dumps({'scope':'UNADMITTED route only; browser45 contracts and ordinarygameplay pending','files':[{'path':p.relative_to(r).as_posix(),'sha256':sha(p)} for p,_ in changes]},indent=2))
print('Exact generated manifest + public actor/preload cache route installed; no build/server/browser job')
