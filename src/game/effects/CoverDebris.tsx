import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Color,InstancedMesh,Object3D} from 'three';
import {runtime} from '../runtime';
import {useGameStore} from '../../state/store';
import {randomSeed} from '../../../shared/math';
import {breakableCover} from '../../../shared/traversal';
import {propCollider,terrainHeight} from '../../../shared/world';
import {effectSurface} from '../../../shared/areaGeometry';
import type {Vec3} from '../../../shared/types';
interface Fragment {position:Vec3;velocity:Vec3;size:Vec3;spin:Vec3;floor:number;born:number;life:number;shade:number;}
/** Cosmetic rubble never becomes client-owned collision or changes the room's
 * authoritative cover state. One bounded instance pool survives every blast. */
export function CoverDebris(){
  const mesh=useRef<InstancedMesh>(null),fragments=useRef<Fragment[]>([]),last=useRef(0);
  const object=useMemo(()=>new Object3D(),[]),color=useMemo(()=>new Color(),[]);
  const quality=useGameStore(s=>s.settings.quality),budget=quality==='low'?32:quality==='medium'?64:96;
  useFrame(()=>{
    const snap=runtime.snapshot;if(!snap||!mesh.current)return;
    for(const event of snap.events)if(event.id>last.current){
      last.current=event.id;if(event.type!=='cover-break')continue;
      const p=breakableCover(snap.seed).find(p=>p.id===event.coverId),half=p&&propCollider(p),rng=randomSeed(event.id^snap.seed);
      for(let i=0;i<32;i++){
        const x=(rng()*2-1)*(half?.[0]??2),z=(rng()*2-1)*(half?.[2]??1),c=Math.cos(p?.rotation??0),s=Math.sin(p?.rotation??0);
        const position={x:(p?.x??event.position.x)+x*c+z*s,y:(p?.y??event.position.y)+.3+rng()*(half?.[1]??1)*1.7,z:(p?.z??event.position.z)-x*s+z*c};
        fragments.current.push({position,velocity:{x:(rng()-.5)*9,y:3+rng()*6,z:(rng()-.5)*9},size:{x:.15+rng()*.45,y:.1+rng()*.22,z:.15+rng()*.4},spin:{x:rng()*4,y:rng()*3,z:rng()*4},floor:terrainHeight(position.x,position.z,snap.seed)+.12,born:event.at,life:3.5+rng()*1.5,shade:.4+rng()*.35});
      }
    }
    fragments.current=fragments.current.filter(f=>snap.time-f.born<f.life).slice(-budget);mesh.current.count=fragments.current.length;
    fragments.current.forEach((f,i)=>{
      const age=Math.max(0,snap.time-f.born),sample={x:f.position.x+f.velocity.x*age,y:f.position.y,z:f.position.z+f.velocity.z*age};
      f.floor=(effectSurface(snap.seed,sample,snap.cover,64)?.center.y??terrainHeight(sample.x,sample.z,snap.seed))+.12;
      const landed=f.position.y+f.velocity.y*age-7*age*age<=f.floor,t=landed?Math.min(age,(f.velocity.y+Math.sqrt(f.velocity.y*f.velocity.y+28*Math.max(0,f.position.y-f.floor)))/14):age;
      object.position.set(f.position.x+f.velocity.x*t,Math.max(f.floor,f.position.y+f.velocity.y*age-7*age*age),f.position.z+f.velocity.z*t);
      object.rotation.set(f.spin.x*t,f.spin.y*t,f.spin.z*t);const fade=Math.min(1,(f.life-age)/.7);object.scale.set(f.size.x*fade,f.size.y*fade,f.size.z*fade);object.updateMatrix();mesh.current!.setMatrixAt(i,object.matrix);color.setRGB(f.shade,f.shade*.9,f.shade*.78);mesh.current!.setColorAt(i,color);
    });
    mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;
  });
  return <instancedMesh ref={mesh} args={[undefined,undefined,budget]} count={0} frustumCulled={false} castShadow receiveShadow><boxGeometry args={[1,1,1]}/><meshStandardMaterial roughness={.94}/></instancedMesh>;
}
