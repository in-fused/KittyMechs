from pathlib import Path
import hashlib,json
root=Path('.');out=root/'tools/overhaul-loading-208'
def row(p):
 b=p.read_bytes();return {'path':p.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
inventory=json.loads((out/'asset-inventory.json').read_text(encoding='utf-8'))
paths=[x['path'] for x in inventory['assets']]+[
 '.sites-runtime/overhaul-20261009/build-062/receipt.json',
 '.sites-runtime/overhaul-20261010/coop204-public/evidence.json',
 '.sites-runtime/overhaul-20261010/coop204-public/native-keyframes.json',
 '.sites-runtime/overhaul-20261010/coop204-public/failure.png',
 '.sites-runtime/overhaul-20261010/coop204-public/failure-guest.png',
 '.sites-runtime/overhaul-20261010/coop204-supervisor/actual-summary.json',
 '.sites-runtime/overhaul-20261010/coop204-supervisor/actual-output-seal.json',
 'tools/overhaul-coop-204/source-seal.json','tools/overhaul-coop-204/mission-capture.mjs',
 'src/game/GameCanvas.tsx','src/game/entities/Actors.tsx','src/game/rendering/materials.ts',
 'src/game/rendering/modelPaths.ts','src/game/Session.tsx','src/game/input.ts','src/state/store.ts','src/ui/Hangar.tsx',
 'node_modules/@react-three/drei/core/Gltf.js','node_modules/@react-three/drei/core/Progress.js',
 'node_modules/three-stdlib/index.js','node_modules/three-stdlib/libs/MeshoptDecoder.js',
 'node_modules/three-stdlib/loaders/GLTFLoader.js','node_modules/three-stdlib/package.json',
 'node_modules/three/src/loaders/LoadingManager.js','node_modules/three/src/loaders/FileLoader.js',
 'node_modules/three/src/loaders/ImageBitmapLoader.js','package.json','package-lock.json',
 'docs/overhaul/loading208-diagnosis.md']
# Explicit paths must resolve. Do not substitute similarly named files.
rows=[row(root/x) for x in paths]
assert next(x for x in rows if x['path'].endswith('build-062/receipt.json'))['sha256']=='5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c'
for asset in inventory['assets']:
 assert row(root/asset['path'])=={k:asset[k] for k in ['path','bytes','sha256']}
(out/'protected-inputs.json').write_text(json.dumps({'writer':'CLOSED','scope':'Static source/saved204 metadata; not current browser performance','files':rows},indent=2)+'\n',encoding='utf-8')
(out/'static-validation.json').write_text(json.dumps({'writer':'CLOSED','status':'PASS','checks':['metadata GLB/image headers; five asset hashes retained','original client/worker/installer syntax','original protocol fixture five PASS','reviewed client/installer/telemetry syntax','reviewed callback isolation/retirement fixture PASS'],'actualCodecExecuted':False,'actualWorkerExecuted':False,'actualBrowserExecuted':False,'productionEdits':False,'sourceAdmission':'UNADMITTED; source review and actual codec/worker compile required','prematureClosedLabels':'Original HANDOFF and diagnosis unchanged, initial-closed-snapshot byte-exact; REVIEWED-HANDOFF supersedes lifecycle'},indent=2)+'\n',encoding='utf-8')
files=sorted(p for p in out.rglob('*') if p.is_file() and p.name!='source-seal.json')+[root/'docs/overhaul/loading208-diagnosis.md']
(out/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','candidate':'UNADMITTED_STATIC_ONLY','files':[row(p) for p in files]},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'seal':row(out/'source-seal.json'),'reviewedHandoff':row(out/'REVIEWED-HANDOFF.md'),'protectedCount':len(rows)}))
