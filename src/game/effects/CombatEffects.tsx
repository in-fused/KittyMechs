import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Color,InstancedMesh,Object3D,Vector3} from 'three';
import {runtime} from '../runtime';
import {QUALITY,useGameStore} from '../../state/store';
import {AreaEffects} from './AreaEffects';
import {CoverDebris} from './CoverDebris';
import {areaArenaKey} from './areaTimeline';
import {readEffectTime} from './effectClock';
import {combatParticle,particlePosition,sparkEvent,type CombatParticle} from './combatParticles';
export function CombatEffects(){
  const bullet=useRef<InstancedMesh>(null),spark=useRef<InstancedMesh>(null),blast=useRef<InstancedMesh>(null);
  const particles=useRef<(CombatParticle&{color:Color})[]>([]),seen=useRef(new Set<number>()),arena=useRef(''),lastTime=useRef(-Infinity);
  const object=useMemo(()=>new Object3D(),[]),up=useMemo(()=>new Vector3(0,1,0),[]),velocity=useMemo(()=>new Vector3(),[]),position=useMemo(()=>({x:0,y:0,z:0}),[]);
  const warm=useMemo(()=>new Color('#ffb456'),[]),cool=useMemo(()=>new Color('#c1f7e6'),[]),repair=useMemo(()=>new Color('#a7f4a1'),[]);
  const quality=useGameStore(s=>s.settings.quality),reduced=useGameStore(s=>s.settings.reducedFlashes),budget=QUALITY[quality].particles;
  useFrame(()=>{
    const snap=runtime.snapshot;if(!bullet.current||!spark.current||!blast.current)return;
    const key=snap?areaArenaKey(runtime.generation,snap):'';
    if(!snap||key!==arena.current||snap.time<lastTime.current){particles.current.length=0;seen.current.clear();arena.current=key;bullet.current.count=spark.current.count=blast.current.count=0;}
    if(!snap)return;lastTime.current=snap.time;
    const time=readEffectTime();
    particles.current=particles.current.filter(p=>time>=p.born&&time-p.born<p.life).slice(-budget);
    for(const event of snap.events){
      if(!Number.isSafeInteger(event.id)||seen.current.has(event.id))continue;
      // Do not consume a future event until its native timestamp is reached.
      if(time<event.at)continue;
      seen.current.add(event.id);if(seen.current.size>512)seen.current.delete(seen.current.values().next().value!);
      if(!sparkEvent(event,time))continue;
      const big=['death','explosion','cover-break','pounce'].includes(event.type),count=big?(reduced?12:24):(reduced?3:6);
      for(let i=0;i<count&&particles.current.length<budget;i++){const p=combatParticle(event,i);if(time-p.born<p.life)particles.current.push({...p,color:p.repair?repair:i%3===0?cool:warm});}
    }
    const shots=snap.projectiles.filter(s=>s?.position&&s?.velocity&&[s.position.x,s.position.y,s.position.z,s.velocity.x,s.velocity.y,s.velocity.z].every(n=>typeof n==='number'&&Number.isFinite(n))).slice(0,192);bullet.current.count=shots.length;
    shots.forEach((shot,i)=>{const extrapolate=runtime.authority?0:Math.max(0,Math.min(.06,(performance.now()-runtime.receivedAt)/1000));object.position.set(shot.position.x+shot.velocity.x*extrapolate,shot.position.y+shot.velocity.y*extrapolate,shot.position.z+shot.velocity.z*extrapolate);velocity.set(shot.velocity.x,shot.velocity.y,shot.velocity.z);object.quaternion.setFromUnitVectors(up,velocity.normalize());object.scale.set(shot.kind==='rocket'?.18:.065,shot.kind==='rocket'?.7:1.1,shot.kind==='rocket'?.18:.065);object.updateMatrix();bullet.current!.setMatrixAt(i,object.matrix);bullet.current!.setColorAt(i,shot.kind==='rocket'?warm:cool);});
    bullet.current.instanceMatrix.needsUpdate=true;if(bullet.current.instanceColor)bullet.current.instanceColor.needsUpdate=true;
    let count=0;for(const p of particles.current){if(!particlePosition(p,time,position))continue;const age=time-p.born;object.position.set(position.x,position.y,position.z);object.quaternion.identity();object.scale.setScalar(p.size*(1-age/p.life));object.updateMatrix();spark.current.setMatrixAt(count,object.matrix);spark.current.setColorAt(count,p.color);count++;}
    spark.current.count=count;spark.current.instanceMatrix.needsUpdate=true;if(spark.current.instanceColor)spark.current.instanceColor.needsUpdate=true;
    const events=snap.events.filter(e=>(e.type==='death'||e.type==='explosion')&&sparkEvent(e,time)&&time-e.at<.3).slice(-16);blast.current.count=events.length;
    events.forEach((e,i)=>{const age=time-e.at;object.position.set(e.position.x,e.position.y,e.position.z);object.quaternion.identity();object.scale.setScalar(Math.sin(age/.3*Math.PI)*1.4);object.updateMatrix();blast.current!.setMatrixAt(i,object.matrix);blast.current!.setColorAt(i,warm);});blast.current.instanceMatrix.needsUpdate=true;if(blast.current.instanceColor)blast.current.instanceColor.needsUpdate=true;
  });
  return <><AreaEffects/><CoverDebris/>
    <instancedMesh ref={bullet} args={[undefined,undefined,192]} count={0} frustumCulled={false}><cylinderGeometry args={[1,1,1,5]}/><meshBasicMaterial toneMapped={false} color="#c9ffe8"/></instancedMesh>
    <instancedMesh ref={spark} args={[undefined,undefined,budget]} count={0} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshBasicMaterial toneMapped={false} color="#ffd195" transparent opacity={reduced?.45:.9}/></instancedMesh>
    <instancedMesh ref={blast} args={[undefined,undefined,16]} count={0} frustumCulled={false}><icosahedronGeometry args={[1,1]}/><meshBasicMaterial color="#ffffff" transparent opacity={reduced?.06:.24} toneMapped={false} depthWrite={false}/></instancedMesh>
  </>;
}
