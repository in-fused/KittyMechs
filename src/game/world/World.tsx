import {RainlineExtractionArt} from './rainlineExtractionArt';
import {OverhaulRuinCollision} from './overhaulRuinCollision';
import {OverhaulDressingArt} from './overhaulDressingArt';
import {RainlineStreetArt} from './rainlineStreetArt';
import { Suspense, useCallback,useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useRapier } from '@react-three/rapier';
import { BufferAttribute, BufferGeometry, Color, InstancedMesh, Matrix4, Mesh, type Material } from 'three';
import { QUALITY, useGameStore } from '../../state/store';
import { chunkAt, generateChunk, PROP_MODELS, terrainHeight, type PropDescriptor, type PropKind } from '../../../shared/world';
import { getMap } from '../../../shared/maps';
import { runtime } from '../runtime';
import {presentSessionCityAuthority} from '../sessionAuthority';
import {retireFailedArena} from '../network';
import { dressMaterial, useSurfaces } from '../rendering/materials';
import { Landmarks } from './Landmarks';
import { FarTerrain } from './FarTerrain';
import { buildRoadGeometry } from '../../../shared/roadGeometry';
import { ServiceClimb } from './ServiceClimb';
import {Supplies} from './Supplies';
import {renderChunkKeys,visibleProp} from '../../../shared/streaming';
import {acquireTerrain} from './terrainCache';
import {subscribeTerrain} from './terrainSubscription';
import {createGuestCollisionTiles, type GuestCollisionTiles} from './guestCollisionTiles';
import {registerBuildingContacts} from './buildingContacts';
import {registerWorldStreamingObserver} from './streamingDiagnostics';
import {initialWorldWindow} from './worldWindow';
import type {terrainRenderData} from '../../../shared/streaming';
import {MOUNTAIN_INNER_RADIUS,scenicOcean} from '../../../shared/scenery';
import {FoliageInstances} from './FoliageInstances';
import {CityDistrict} from './CityDistrict';
import {CityPresentation} from './cityPresentation';
import {createPropPresentation} from './propPresentation';
import {Objectives} from './Objectives';
import {useCityTextures,type CityTextures} from '../rendering/cityTextures';
import {sampleRenderActor} from '../entities/renderTimeline';

function Terrain({cx,cz,priority,onReady}:{cx:number;cz:number;priority:number;onReady:(key:string,ready:boolean)=>void}){
  const maps=useSurfaces(),seed=useGameStore(s=>s.seed),map=getMap(seed);
  const key=`${seed}:${cx},${cz}`,priorityRef=useRef(priority);priorityRef.current=priority;
  const [loaded,setLoaded]=useState<{key:string;data:ReturnType<typeof terrainRenderData>}|null>(null);
  useEffect(()=>subscribeTerrain(()=>acquireTerrain(cx,cz,seed,priorityRef.current),data=>setLoaded({key,data})),[cx,cz,seed,key]);
  const data=loaded?.key===key?loaded.data:null;
  const geometry=useMemo(()=>{
    if(!data)return null;const g=new BufferGeometry();
    g.setAttribute('position',new BufferAttribute(data.vertices,3));g.setAttribute('uv',new BufferAttribute(data.uv,2));g.setAttribute('normal',new BufferAttribute(data.normals,3));g.setIndex(new BufferAttribute(data.indices,1));return g;
  },[data]);
  useEffect(()=>{if(!geometry)return;const key=`${cx},${cz}`;onReady(key,true);return()=>{onReady(key,false);geometry.dispose();};},[geometry,cx,cz,onReady]);
  if(!geometry)return null;
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color={map.ground} map={maps.ground} normalMap={maps.groundNormal} normalScale={[.7,.7]} roughnessMap={maps.groundRough} roughness={seed===7734?.46:.8} metalness={seed===7734?.06:.02}/></mesh>;
}
interface Part {geometry:BufferGeometry;material:Material|Material[];matrix:Matrix4;}
function PropInstances({kind,props,seed,presentation}:{kind:PropKind;props:PropDescriptor[];seed:number;presentation:CityPresentation}){
  const factory=kind==='workshop'&&seed===7734;
  const gltf=useGLTF(`/assets/models/${factory?'Factory_Workshop':PROP_MODELS[kind]}.glb`),surfaces=useSurfaces();
  const parts=useMemo(()=>{
    const result:Part[]=[];gltf.scene.updateMatrixWorld(true);
    const material=(original:Material)=>factory?original.clone():dressMaterial(original,surfaces,seed);
    gltf.scene.traverse(obj=>{if(obj instanceof Mesh)result.push({geometry:obj.geometry,material:Array.isArray(obj.material)?obj.material.map(material):material(obj.material),matrix:obj.matrixWorld.clone()});});return result;
  },[gltf,surfaces,seed,factory]);
  useEffect(()=>()=>parts.forEach(p=>(Array.isArray(p.material)?p.material:[p.material]).forEach(m=>m.dispose())),[parts]);
  return <>{parts.map((part,i)=><InstancePart key={i} part={part} props={props} shadow={kind!=='fern'&&kind!=='cedar'} presentation={presentation}/>)}</>;
}
function InstancePart({part,props,shadow,presentation}:{part:Part;props:PropDescriptor[];shadow:boolean;presentation:CityPresentation}){
  const ref=useRef<InstancedMesh>(null);
  // Instance buffers belong to this streamed batch; GLB geometry remains shared in the cache.
  useEffect(()=>{const mesh=ref.current;return()=>{mesh?.dispose();};},[part,props.length]);
  useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const apply=createPropPresentation(mesh,props,part.matrix);apply(presentation.read()??{tick:0,time:0,structures:[],cover:[],rubble:[],events:[],experimentalPhysicalRubble:false,signature:''});return presentation.register(apply);},[part,props,presentation]);
  return <instancedMesh ref={ref} args={[part.geometry,part.material,props.length]} castShadow={shadow} receiveShadow dispose={null}/>;
}
function Mountains(){
  const seed=useGameStore(s=>s.seed),maps=useSurfaces();
  const geometry=useMemo(()=>{
    const g=new BufferGeometry(),vertices:number[]=[],indices:number[]=[],uv:number[]=[],colors:number[]=[];const segments=320,rings=14;
    for(let r=0;r<=rings;r++)for(let a=0;a<=segments;a++){
      const angle=a/segments*Math.PI*2,dist=MOUNTAIN_INNER_RADIUS+r*23,x=Math.cos(angle)*dist,z=Math.sin(angle)*dist;
      const ridge=38+30*Math.sin(angle*3+seed)+25*Math.sin(angle*7.3+seed*.1)+14*Math.cos(angle*13.7);
      const envelope=Math.sin(Math.min(1,r/11)*Math.PI*.65);
      const detail=Math.sin(x*.061)*Math.cos(z*.057)*5+Math.sin(x*.131+z*.105)*2;
      const height=r===0?-6:Math.max(0,ridge)*envelope+r*3+detail;
      vertices.push(x,height,z);uv.push(x/16,z/16);
      const base=new Color(seed===1926?'#806852':'#5a6e61');
      if(seed===4107)base.lerp(new Color('#e4eaeb'),Math.min(1,Math.max(0,(height-27)/38)));
      base.multiplyScalar(.82+.18*Math.sin(x*.12+z*.09));colors.push(base.r,base.g,base.b);
    }
    for(let r=0;r<rings;r++)for(let a=0;a<segments;a++){const i=r*(segments+1)+a,j=i+segments+1;indices.push(i,j,i+1,i+1,j,j+1);}
    g.setAttribute('position',new BufferAttribute(new Float32Array(vertices),3));g.setAttribute('uv',new BufferAttribute(new Float32Array(uv),2));g.setAttribute('color',new BufferAttribute(new Float32Array(colors),3));g.setIndex(indices);g.computeVertexNormals();return g;
  },[seed]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial map={maps.rock} normalMap={maps.rockNormal} normalScale={[.9,.9]} vertexColors roughness={.95} side={2}/></mesh>;
}
export function World(){
  const {world}=useRapier();
  const settings=useGameStore(s=>s.settings),seed=useGameStore(s=>s.seed),q=QUALITY[settings.quality];
  const mode=useGameStore(s=>s.hud?.mode??s.mode),room=useGameStore(s=>s.hud?.room??''),authority=runtime.authority;
  const ocean=scenicOcean(seed);
  const cityArt=useCityTextures(seed);
  const [initialWindow]=useState(()=>initialWorldWindow(seed,q.radius,runtime.localId,runtime.snapshot?.actors));
  const [center,setCenter]=useState(initialWindow.center);const next=useRef(0);
  const [centerX,centerZ]=center.split(',').map(Number);
  const [visibleKeys,setVisibleKeys]=useState(initialWindow.visibleKeys);
  const [loadedKeys,setLoadedKeys]=useState<string[]>([]);
  const terrainReady=useCallback((key:string,ready:boolean)=>setLoadedKeys(old=>ready?(old.includes(key)?old:[...old,key]):old.filter(item=>item!==key)),[]);
  const guestOwner=useRef<GuestCollisionTiles|null>(null);
  const authorityGeneration=useRef(runtime.generation);
  const cityPresentation=useMemo(()=>new CityPresentation(seed),[world,seed,mode,room,authority]);
  useFrame(state=>{if(state.clock.elapsedTime<next.current)return;next.current=state.clock.elapsedTime+.1;const actor=runtime.sim?.actors.get(runtime.localId)??runtime.snapshot?.actors.find(a=>a.id===runtime.localId);if(actor){const key=`${chunkAt(actor.position.x)},${chunkAt(actor.position.z)}`;setCenter(old=>old===key?old:key);const visible=renderChunkKeys(actor.position,actor.velocity,q.radius).join('|');setVisibleKeys(old=>old===visible?old:visible);}});
  useFrame((state,dt)=>{
    // Host queries own the live authority world: its mesh must follow the same
    // accepted structural step, rather than waiting for a20Hz transport copy.
    if(authority){const sim=runtime.sim;if(sim)presentSessionCityAuthority(sim,authorityGeneration.current,{world,seed},cityPresentation,retireFailedArena);return;}
    for(const snapshot of [runtime.previous,runtime.snapshot])if(snapshot&&snapshot.seed===seed&&snapshot.room===room)cityPresentation.push(snapshot.tick,snapshot.time,snapshot.structures,snapshot.cover,snapshot.rubble,snapshot.events,snapshot.experimentalPhysicalRubble===true,snapshot.ruins);
    const presented=sampleRenderActor(runtime.localId,state.clock.elapsedTime,dt);if(presented)cityPresentation.present(presented.time);
  },-1.25);
  const chunks=useMemo(()=>visibleKeys.split('|').map(key=>{const [x,z]=key.split(',').map(Number);return generateChunk(seed,x,z);}),[visibleKeys,seed]);
  const terrainChunks=useMemo(()=>[...chunks].sort((a,b)=>Math.max(Math.abs(a.cx-centerX),Math.abs(a.cz-centerZ))-Math.max(Math.abs(b.cx-centerX),Math.abs(b.cz-centerZ))||a.key.localeCompare(b.key)),[chunks,centerX,centerZ]);
  const groups=useMemo(()=>{
    const groups:Partial<Record<PropKind,PropDescriptor[]>>={};
    for(const chunk of chunks)for(const prop of chunk.props){if(!visibleProp(prop,q.vegetation))continue;(groups[prop.kind]??=[]).push(prop);}
    return groups;
  },[chunks,q.vegetation]);
  const detailedKeys=useMemo(()=>chunks.map(c=>c.key).filter(key=>loadedKeys.includes(key)),[chunks,loadedKeys]);
  // Center updates sync this owner, rather than running its layout cleanup.
  // Construct inside setup so StrictMode layout replay creates fresh ownership.
  useLayoutEffect(()=>{
    const owner=createGuestCollisionTiles(world,seed,mode,authority);guestOwner.current=owner;
    const unregister=owner?cityPresentation.register(state=>{owner.syncStructures(state.structures);owner.destroyCover(state.cover.filter(c=>c.destroyedAt!==null).map(c=>c.id));}):()=>{};
    const unregisterContacts=registerBuildingContacts(world,id=>authority?runtime.sim?.buildingCollider(id):owner?.buildingCollider(id));
    return()=>{unregisterContacts();unregister();owner?.dispose();if(guestOwner.current===owner)guestOwner.current=null;};
  },[world,seed,mode,room,authority,cityPresentation]);
  useLayoutEffect(()=>{const [cx,cz]=center.split(',').map(Number);guestOwner.current?.sync(cx,cz);},[center,world,seed,mode,room,authority]);
  const observed=useRef({seed,mode,authority,center,cityArt:cityArt.status,visibleKeys:[] as string[],readyKeys:[] as string[]});
  useLayoutEffect(()=>{observed.current={seed,mode,authority,center,cityArt:cityArt.status,visibleKeys:visibleKeys.split('|'),readyKeys:loadedKeys};});
  useLayoutEffect(()=>registerWorldStreamingObserver(()=>({...observed.current,city:cityPresentation.snapshot(),guest:guestOwner.current?.snapshot()??{tiles:[],created:0,retired:0,peakTiles:0,createdColliders:0,removedColliders:0,coverCount:0,destroyedCoverCount:0}})),[world,cityPresentation]);
  useEffect(()=>{useGameStore.setState({performance:{...useGameStore.getState().performance,chunks:chunks.length}});},[chunks.length]);
  return <>
    <OverhaulRuinCollision seed={seed} presentation={cityPresentation}/>
    <FarTerrain seed={seed} detailedKeys={detailedKeys}/>
    {terrainChunks.map(c=><Terrain key={`${seed}:${c.key}`} cx={c.cx} cz={c.cz} priority={Math.max(Math.abs(c.cx-centerX),Math.abs(c.cz-centerZ))} onReady={terrainReady}/>)}
    {/* Late prop assets cannot retire the World-owned guest collision tiles. */}
    {(Object.entries(groups) as [PropKind,PropDescriptor[]][]).map(([kind,props])=><Suspense key={kind} fallback={null}>{kind==='cedar'||kind==='fern'?<FoliageInstances kind={kind} props={props} quality={settings.quality} seed={seed}/>:<PropInstances kind={kind} props={props} seed={seed} presentation={cityPresentation}/>}</Suspense>)}
    <Mountains/>
    {ocean&&<mesh position={[ocean.x,ocean.y,ocean.z]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[ocean.width,ocean.depth]}/><meshStandardMaterial color="#456775" roughness={.16} metalness={.55}/></mesh>}
    <Landmarks seed={seed}/>
    <ServiceClimb seed={seed}/>
    <CityDistrict seed={seed} presentation={cityPresentation} textures={cityArt.maps}/>
    <OverhaulDressingArt seed={seed} presentation={cityPresentation}/>
    <RainlineStreetArt seed={seed} presentation={cityPresentation}/>
    <RainlineExtractionArt seed={seed} presentation={cityPresentation}/>
    <RainlineExtractionArt seed={seed} presentation={cityPresentation} ruins experimentalFragments/>
    <Objectives presentation={cityPresentation}/>
    <DistrictDetails seed={seed} textures={cityArt.maps}/>
    <Supplies/>
  </>;
}
function DistrictDetails({seed,textures}:{seed:number;textures:CityTextures|null}){
  const materials=useSurfaces();
  const map=getMap(seed);
  const geometry=useMemo(()=>{
    const build=(markings:boolean)=>{
      const data=buildRoadGeometry(seed,markings),g=new BufferGeometry();
      g.setAttribute('position',new BufferAttribute(data.vertices,3));g.setAttribute('uv',new BufferAttribute(data.uv,2));g.setIndex(new BufferAttribute(data.indices,1));g.computeVertexNormals();return g;
    };
    return {roads:build(false),markings:build(true)};
  },[map,seed]);
  useEffect(()=>()=>{geometry.roads.dispose();geometry.markings.dispose();},[geometry]);
  const extraction=map.objectives[3].position;
  return <>
    <mesh geometry={geometry.roads} receiveShadow><meshStandardMaterial map={textures?.asphalt??materials.concrete} color={textures?'#b1babc':seed===1926?'#66584e':seed===4107?'#71838a':'#6f7d80'} roughness={textures?.68:seed===7734?.55:.82} metalness={textures?.025:.08} polygonOffset polygonOffsetFactor={-1}/></mesh>
    <mesh geometry={geometry.markings}><meshStandardMaterial color={seed===4107?'#b8d8de':'#e7b768'} roughness={.65} polygonOffset polygonOffsetFactor={-2}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[extraction.x,terrainHeight(extraction.x,extraction.z,seed)+.08,extraction.z]}><ringGeometry args={[5.5,5.7,48]}/><meshStandardMaterial color="#91dace" emissive="#52b5a4" emissiveIntensity={.65}/></mesh>
  </>;
}
