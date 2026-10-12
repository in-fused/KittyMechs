"""Static JSON provenance/catalog/bounds only; no GLB accessor or pose execution."""
import json,hashlib,pathlib,struct
root=pathlib.Path(__file__).resolve().parents[2];folder=pathlib.Path(__file__).parent
catalogPath=root/'.sites-runtime/overhaul-20261010/delivery209-primary/decoded-catalog.json'
evidencePath=root/'.sites-runtime/overhaul-20261010/delivery209-primary/evidence.json'
catalog=json.loads(catalogPath.read_text());evidence=json.loads(evidencePath.read_text())
assetPath=root/'tools/overhaul-delivery-209/output/Pounce_Anatomy209.glb';raw=assetPath.read_bytes()
sha=hashlib.sha256(raw).hexdigest()
if sha!='64cc5c99ffb7ca038c20e56b50e0281643559cd44db2fd92deab48ca134864e7':raise RuntimeError('214_STATIC_ASSET_SHA')
doc=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
contract={'publicURL':'/UNROUTED_PRIVATE214/Pounce_Anatomy209.glb','sha256':sha,'scale':.8,'expectedPrimitives':4,'bones':catalog['rig']['skins'][0]['bones'],'clips':catalog['clips']}
assert len(contract['bones'])==61 and len(contract['clips'])==45
(folder/'raw209-contract214.json').write_text(json.dumps(contract,indent=2))
samples=evidence['dynamicEnvelope']['samples'];rows=[]
for s in samples:
 c=s['case'];minimum=[v*.8 for v in s['bodyFrameMinimum']];maximum=[v*.8 for v in s['bodyFrameMaximum']]
 height=3.8 if c['stance']>0 else 2.6
 rows.append({'case':c,'sourceNativeScaleMin':minimum,'sourceNativeScaleMax':maximum,'retainedPounceHull':{'height':height,'outerRadius':1.75,'border':.12},'AABBcornerRadialUpperBound':max((x*x+z*z)**.5 for x in [minimum[0],maximum[0]] for z in [minimum[2],maximum[2]]),'sourcePlaneVerticalOverHeight':maximum[1]-height,'clockAlignedNativeFit':'NOT_MEASURED_SOURCE_BOUNDS_ONLY'})
summary={'source':'actual209 primary72 full weighted skin poses, existing JSON only','scale':.8,'rootComposition':'native hull lower boundary + displayed carrier xz; source model PI mounting; unchanged rig root keys; NO global mount correction','minimum':[min(r['sourceNativeScaleMin'][i] for r in rows) for i in range(3)],'maximum':[max(r['sourceNativeScaleMax'][i] for r in rows) for i in range(3)],'samples':rows,'contactQualified':False,'headPad':{'completePadVertexCounts':evidence['completePadVertexCounts'],'headSkinVertexCount':evidence['headSkinVertexCount'],'worstForeToHeadSkinVerticalClearance':evidence['worstForeToHeadSkinClearance'],'maximumLoadedSourcePlaneGap':evidence['maximumLoadedSourceFloor']},'inputs':[{'path':str(p.relative_to(root)).replace('\\','/'),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [catalogPath,evidencePath,assetPath]]}
(folder/'source-envelope214.json').write_text(json.dumps(summary,indent=2))
counts={'mode':'STATIC_JSON_NO_PACK_OR_POSE_JOB','clips':len(doc['animations']),'primitives':sum(len(m['primitives']) for m in doc['meshes']),'bones':len(contract['bones']),'sourceAssetBytes':len(raw),'bufferViews':len(doc['bufferViews']),'accessors':len(doc['accessors']),'protectedInputs':summary['inputs']}
(folder/'static-preparation214.json').write_text(json.dumps(counts,indent=2));print(json.dumps(counts))
