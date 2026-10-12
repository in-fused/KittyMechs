from pathlib import Path
import json,hashlib
r=Path('.');p=r/'tools/overhaul-startup-220';parent=r/'tools/overhaul-readiness-211'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
seal=parent/'source-seal211.json';assert row(seal)['sha256']=='0c579f94b28e3560b27c90b578e98243622074e9c14e9e3aefad05a3bac3da47'
closed=json.loads(seal.read_text(encoding='utf-8'))
for x in closed['files']:assert row(r/x['path'])==x
pre=p/'preimage';pre.mkdir(exist_ok=False)
for x in ['GameCanvas211.tsx','build211.mjs','deploymentReadiness211.ts','source-seal211.json']:(pre/x).write_bytes((parent/x).read_bytes())
source=(parent/'GameCanvas211.tsx').read_text(encoding='utf-8')
needle='class CanvasBoundary extends Component';assert source.count(needle)==1
candidate=source.replace(needle,'// Private binding defaults to the exact retained57 individual loader key.\nconst selectedPounceURL220 = IDENTITY57_ASSET_URL034;\n\n'+needle)
needle='  // Retain the standard/fallback rig prerequisite and its original cache key.'
replacement='  // Start the selected detailed rig before the fallback hook can suspend.\n  // preload and the later useGLTF consume the same individual cache key.\n  if(initialPublicPounce)useGLTF.preload(selectedPounceURL220);\n\n'+needle
assert candidate.count(needle)==1;candidate=candidate.replace(needle,replacement)
needle='  useGLTF(IDENTITY57_ASSET_URL034);';assert candidate.count(needle)==1;candidate=candidate.replace(needle,'  useGLTF(selectedPounceURL220);')
(p/'GameCanvas220.tsx').write_text(candidate,encoding='utf-8')
prove=(r/'tools/overhaul-entry-215/prove-entry.mjs').read_text(encoding='utf-8').replace('proveEntry215','proveEntry220').replace("'215 ","'220 ");(p/'prove-entry.mjs').write_text(prove,encoding='utf-8')
binding=json.loads((r/'tools/overhaul-loading-capture-219/binding.json').read_text(encoding='utf-8'));binding['scope']='220 isolated preload scheduling; working/frozen062 and CLOSED211/215/219 unchanged'
extras=closed['files']+[row(seal),row(r/'tools/overhaul-loading-capture-219/source-seal.json'),row(r/'.sites-runtime/overhaul-20261011/loading219-actual/output-seal.json'),row(r/'.sites-runtime/overhaul-20261011/loading219-actual/readiness-operands.json'),row(r/'.sites-runtime/overhaul-20261011/loading219-actual/startup-profile-summary.json'),row(r/'node_modules/@react-three/drei/core/Gltf.js'),row(r/'node_modules/@react-three/fiber/dist/events-9ce18a08.esm.js'),row(r/'node_modules/three/src/renderers/WebGLRenderer.js'),row(r/'node_modules/three/src/renderers/webgl/WebGLProgram.js')]
binding['files']=list({x['path']:x for x in binding['files']+extras}.values())
for x in binding['files']:assert row(r/x['path'])==x
(p/'binding.json').write_text(json.dumps(binding,indent=2)+'\n',encoding='utf-8')
operands=json.loads((r/'.sites-runtime/overhaul-20261011/loading219-actual/readiness-operands.json').read_text(encoding='utf-8'));resources=operands['pilots'][1]['resources']
rows=[x for x in resources if 'Pounce_Overhaul' in x['name'] or 'Pounce_Anatomy' in x['name'] or 'coastal-overcast' in x['name']]
(p/'observed-operands.json').write_text(json.dumps({'writer':'CLOSED','scope':'Exact saved219 guest input, not new observation','resources':rows,'sourceParent':row(parent/'GameCanvas211.tsx'),'standardBlockingHook':'DeploymentAssets useGLTF(actorModelPath(...)) before returning PublicPounceAssets child','detailedBlockingHook':'PublicPounceAssets useGLTF(IDENTITY57_ASSET_URL034)','KHRAvailability':'UNQUALIFIED_NOT_RECORDED','gain':'UNQUALIFIED;overlap is a source scheduling change, not measured20s acceptance'},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'SOURCE_PREPARED','protectedRows':len(binding['files']),'candidate':row(p/'GameCanvas220.tsx')}))
