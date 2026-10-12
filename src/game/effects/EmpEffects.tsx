import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferAttribute,BufferGeometry,InstancedMesh,LineBasicMaterial,LineSegments,Mesh,MeshBasicMaterial,Object3D} from 'three';
import {empOrigin} from './empOrigin';
import {clamp} from '../../../shared/math';
import {runtime} from '../runtime';
import {useGameStore} from '../../state/store';
/** One fixed line pool links the admitted antenna only to authority-confirmed
 * EMP targets. It never invents hits through buildings or outside pulse range. */
export function EmpEffects(){
  const lines=useRef<LineSegments>(null),halo=useRef<Mesh>(null),material=useRef<MeshBasicMaterial>(null),disabled=useRef<InstancedMesh>(null);
  const object=useMemo(()=>new Object3D(),[]);
  const geometry=useMemo(()=>{const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Float32Array(16*12*6),3));g.setDrawRange(0,0);return g;},[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(()=>{
    const snap=runtime.snapshot;if(!snap||!lines.current||!halo.current)return;
    const reduced=useGameStore.getState().settings.reducedFlashes,attribute=geometry.getAttribute('position') as BufferAttribute;
    const events=snap.events.filter(e=>e.type==='emp-hit'&&snap.time-e.at<1.3).slice(-16);let count=0;
    for(const event of events){
      const origin=empOrigin(event,snap.events);if(!origin)continue;
      const target=snap.actors.find(a=>a.id===event.target)?.position??event.position,age=Math.max(0,snap.time-event.at);
      for(let i=0;i<12;i++)for(const t of [i/12,(i+1)/12]){
        const jitter=(reduced?.08:.24)*Math.sin(t*Math.PI)*Math.sin(t*47+event.id+age*9);
        attribute.setXYZ(count++,origin.x+(target.x-origin.x)*t+jitter,origin.y+(target.y+.6-origin.y)*t+Math.sin(t*Math.PI)*.8,origin.z+(target.z-origin.z)*t-jitter);
      }
    }
    attribute.needsUpdate=true;geometry.setDrawRange(0,count);lines.current.visible=count>0;
    (lines.current.material as LineBasicMaterial).opacity=reduced?.3:.55;
    const pulse=[...snap.events].reverse().find(e=>e.type==='area'&&e.effect==='emp'),age=pulse?snap.time-pulse.at:100;
    if(pulse)halo.current.position.set(pulse.position.x,pulse.position.y,pulse.position.z);
    halo.current.visible=age>=0&&age<1.8;halo.current.scale.setScalar(1.4+Math.max(0,age)*5);
    if(material.current)material.current.opacity=clamp(1-age/1.8,0,1)*(reduced?.15:.4);
    if(disabled.current){
      const targets=snap.actors.filter(a=>a.bot&&a.hp>0&&a.disruptedUntil>snap.time).slice(0,16);disabled.current.count=targets.length;
      targets.forEach((a,i)=>{object.position.set(a.position.x,a.position.y+2.4,a.position.z);object.rotation.set(-Math.PI/2,0,snap.time*.6);object.scale.setScalar(reduced?1:1+Math.sin(snap.time*2)*.08);object.updateMatrix();disabled.current!.setMatrixAt(i,object.matrix);});disabled.current.instanceMatrix.needsUpdate=true;
    }
  });
  return <><lineSegments ref={lines} geometry={geometry} frustumCulled={false}><lineBasicMaterial color="#93e6ff" transparent opacity={.55} depthWrite={false} toneMapped={false}/></lineSegments><mesh ref={halo} rotation={[-Math.PI/2,0,0]} visible={false}><ringGeometry args={[.94,1,48]}/><meshBasicMaterial ref={material} color="#93e6ff" transparent opacity={.4} depthWrite={false} toneMapped={false} side={2}/></mesh><instancedMesh ref={disabled} args={[undefined,undefined,16]} count={0} frustumCulled={false}><ringGeometry args={[.38,.47,20,1,0,Math.PI*1.6]}/><meshBasicMaterial color="#93e6ff" transparent opacity={.6} depthWrite={false} toneMapped={false} side={2}/></instancedMesh></>;
}
