from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
p=r/'src/game/GameCanvas.tsx';raw=p.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='8fa2de3d7aaea5b31ad496ee74b4c8645a1dde51731c44bf12ebd1e6c7dbec63'
s=raw.decode('utf8');(h/'GameCanvas062-preimage.tsx').write_bytes(raw)
def replace(a,b):
 global s
 assert s.count(a)==1,a
 s=s.replace(a,b)
replace("import { Component,", "import {deploymentBlocks211,readinessTransition211,observeReadiness211,type DeploymentReady211} from './rendering/deploymentReadiness211';\nimport { Component,")
replace('const [sceneReady,setSceneReady]=useState(false);',"const [sceneReady,setSceneReady]=useState<DeploymentReady211>(()=>({localId:runtime.localId,generation:runtime.generation,ready:false}));")
replace('function SceneReady({onReady}:{onReady:(ready:boolean)=>void}){const sent=useRef(false);useFrame(()=>{if(!sent.current&&hasCompletedCameraVisual044(runtime.localId,runtime.generation)){sent.current=true;onReady(true);}});return null;}',
'''function SceneReady({onReady}:{onReady:(ready:DeploymentReady211)=>void}){
  const sent=useRef<DeploymentReady211|null>(null);
  useFrame(()=>{const next=readinessTransition211(sent.current,runtime.localId,runtime.generation,hasCompletedCameraVisual044(runtime.localId,runtime.generation));if(next!==sent.current){sent.current=next;onReady(next);}});
  return null;
}''')
replace('function LoadingOverlay({sceneReady}:{sceneReady:boolean}){const {active,progress,item}=useProgress(),settled=useRef(false);useEffect(()=>{if(sceneReady&&!active)settled.current=true;},[sceneReady,active]);return (!sceneReady||active)&&!settled.current?<div className="loading-overlay"><span className="eyebrow">ESTABLISHING NEURAL LINK</span><h2>Preparing your mech</h2><div className="load-track"><i style={{width:`${progress}%`}}/></div><p>{Math.round(progress)}% · {item.split(\'/\').pop()}</p><button className="quiet" onClick={leaveGame}>Cancel deployment</button></div>:null;}',
'''function LoadingOverlay({sceneReady}:{sceneReady:DeploymentReady211}){
  const {active,progress,item,loaded,total,errors}=useProgress(),localId=runtime.localId,generation=runtime.generation;
  useEffect(()=>{observeReadiness211(sceneReady,localId,generation,{active,progress,item,loaded,total,errors});},[sceneReady,localId,generation,active,progress,item,loaded,total,errors]);
  return deploymentBlocks211(sceneReady,localId,generation)?<div className="loading-overlay"><span className="eyebrow">ESTABLISHING NEURAL LINK</span><h2>Preparing your mech</h2><div className="load-track"><i style={{width:`${progress}%`}}/></div><p>Loading the district and your mech…</p><button className="quiet" onClick={leaveGame}>Cancel deployment</button></div>:null;
}''')
(h/'GameCanvas211.tsx').write_text(s,encoding='utf8')
assert p.read_bytes()==raw
print(json.dumps({'status':'PRIVATE_SOURCE_PREPARED','productionChanges':[],'sourceSHA256':hashlib.sha256(s.encode()).hexdigest()}))
