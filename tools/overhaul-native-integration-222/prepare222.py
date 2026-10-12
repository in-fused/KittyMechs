from pathlib import Path
import hashlib,json
r=Path('.');p=r/'tools/overhaul-native-integration-222';old=r/'tools/overhaul-native-wiring-218'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
parent=old/'source-seal.json';assert row(parent)['sha256']=='c9b169fa99ec072b51e33f780cb7c9fbfca812f34bd1534081ccb65d128a9b83';closed=json.loads(parent.read_text(encoding='utf-8'))
for x in closed['files']:assert row(r/x['path'])==x
pre=p/'preimage';pre.mkdir(exist_ok=False)
for name in ['ActorsCandidate218.tsx','NativeActor218.tsx','wiring218.tsx','nativeOwner218.ts','nativeBasis218.ts','source-seal.json']:(pre/name).write_bytes((old/name).read_bytes())
(pre/'visualRegistry062.ts').write_bytes((r/'src/game/camera/visualRegistry.ts').read_bytes())
for name in ['nativeOwner218.ts','nativeBasis218.ts']:(p/name).write_bytes((old/name).read_bytes())
actor=(old/'NativeActor218.tsx').read_text(encoding='utf-8');actor=actor.replace('{registerCameraVisual,completeCameraVisual}','{registerCameraVisual,completeCameraVisual,ownsCameraVisual222}')
before='if(!cameraCleanup.current||cameraGeneration.current!==runtime.generation)';after='if(!cameraCleanup.current||cameraGeneration.current!==runtime.generation||!ownsCameraVisual222(actor.id,root.current,runtime.generation))'
assert actor.count(before)==1;actor=actor.replace(before,after)
before='<group ref={root} visible={false}>';after='<group ref={root} name={`native222:${actor.id}:${contract.sha256}`} visible={false}>'
assert actor.count(before)==1;actor=actor.replace(before,after)
(p/'NativeActor222.tsx').write_text(actor,encoding='utf-8')
wiring=(old/'wiring218.tsx').read_text(encoding='utf-8').replace("from './NativeActor218'","from './NativeActor222'");(p/'wiring222.tsx').write_text(wiring,encoding='utf-8')
actors=(old/'ActorsCandidate218.tsx').read_text(encoding='utf-8').replace("from './wiring218'","from './wiring222'");(p/'ActorsCandidate222.tsx').write_text(actors,encoding='utf-8')
registry=(r/'src/game/camera/visualRegistry.ts').read_text(encoding='utf-8')
append='''
/** Pure ownership test: cleanup refs do not establish map ownership. */
export function ownsCameraVisual222(id:string,root:Object3D,generation:number){const entry=visuals.get(id);return !!entry&&entry.root===root&&entry.generation===generation;}
/** Detached read-only diagnostics. No transforms, provider sampling or matrix
 * updates. Candidate roots cover named native222 groups and current winner;
 * unregistered/unlabelled standard roots are not claimed exhaustively. */
export function inspectCameraVisual222(id:string,scene?:Object3D){
 const entry=visuals.get(id),prefix=`native222:${id}:`,visibility=(root:Object3D)=>{const ancestors:{uuid:string;name:string;visible:boolean}[]=[];for(let p:Object3D|null=root;p;p=p.parent)ancestors.push({uuid:p.uuid,name:p.name,visible:p.visible});return {uuid:root.uuid,name:root.name,rootVisible:root.visible,effectiveVisible:ancestors.every(p=>p.visible),ancestors};};
 const roots=new Map<string,ReturnType<typeof visibility>>();if(scene)scene.traverse(o=>{if(o.name.startsWith(prefix))roots.set(o.uuid,visibility(o));});if(entry)roots.set(entry.root.uuid,visibility(entry.root));
 const winningProvider=entry?{...visibility(entry.root),generation:entry.generation,frameClock:entry.result.frameClock,kind:entry.root.name.startsWith(prefix)?'named-native222':'standard-or-unlabelled'}:null;
 return {actor:id,winningProvider,roots:[...roots.values()],visibleRootCount:[...roots.values()].filter(o=>o.effectiveVisible).length,duplicateVisibleRoots:[...roots.values()].filter(o=>o.effectiveVisible).length>1,scope:'CURRENT_WINNER_AND_NAMED_NATIVE_ROOTS_READONLY_NOT_PIXEL_PROOF'};
}
'''
(p/'visualRegistry222.ts').write_text(registry+append,encoding='utf-8')
binding=json.loads((r/'tools/overhaul-startup-220/binding.json').read_text(encoding='utf-8'));binding['scope']='222 private218 parent/owner plus220 same-key preload, one canonical original visualRegistry module with pure ownership extension'
extras=closed['files']+[row(parent),row(r/'src/game/camera/visualRegistry.ts'),row(r/'tools/overhaul-startup-220/source-seal.json'),row(r/'tools/overhaul-startup-220/supplement/source-seal.json'),row(r/'tools/overhaul-startup-220/compiler-identity-seal.json')]
for sealpath in ['tools/overhaul-startup-220/source-seal.json','tools/overhaul-startup-220/supplement/source-seal.json','tools/overhaul-startup-220/compiler-identity-seal.json']:
 doc=json.loads((r/sealpath).read_text(encoding='utf-8'));extras+=doc['files']
binding['files']=list({x['path']:x for x in binding['files']+extras}.values())
for x in binding['files']:assert row(r/x['path'])==x
(p/'binding.json').write_text(json.dumps(binding,indent=2)+'\n',encoding='utf-8')
(p/'delta-ledger.json').write_text(json.dumps({'writer':'CLOSED','actorDelta':['import pure ownsCameraVisual222','actual maproot/generation in registration condition','native outer diagnosticname only'],'parentDelta':'Only wiring import path','wiringDelta':'Only NativeActor import path','ownerBasisDelta':'BYTE_IDENTICAL218','registryDelta':'Original runtimefunctions unchanged; append pure owns and detached inspector','expectedAssetSHA':'5147c2c2e46f4b2328d5d97ac091da70204244cb68882592d6328cec53489473','proofBinding':'PENDING; no fake qualification defaults','protectedRows':len(binding['files'])},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PREPARED','protectedRows':len(binding['files'])}))
