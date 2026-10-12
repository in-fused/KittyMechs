import {Suspense,useEffect,useLayoutEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {Mesh,MeshStandardMaterial,RepeatWrapping,type Material} from 'three';
import {cityDistrict,type CityBuilding} from '../../../shared/cityDistrict';
import {buildCityGeometry,applyCityDamage,cityMeshDiagnostic,type CitySurface} from './cityGeometry';
import type {CityPresentation} from './cityPresentation';
import {CityDebris} from './CityDebris';
import type {CityTextures} from '../rendering/cityTextures';
import {OverhaulDistrictArt,OverhaulRuinsArt} from './overhaulDistrictArt';

export function CityDistrict({seed,presentation,textures}:{seed:number;presentation:CityPresentation;textures:CityTextures|null}){
  const district=cityDistrict(seed);
  if(district?.id.includes('overhaul'))return <><OverhaulDistrictArt seed={seed} presentation={presentation}/><OverhaulRuinsArt seed={seed} presentation={presentation}/></>;
  return district?<><Suspense fallback={<CityFallback seed={seed} presentation={presentation}/>}><CityArchitecture seed={seed} presentation={presentation} textures={textures}/></Suspense><Suspense fallback={null}><CityDebris seed={seed} presentation={presentation} textures={textures}/></Suspense></>:null;
}
function CityFallback({seed,presentation}:{seed:number;presentation:CityPresentation}){
  const district=cityDistrict(seed)!,batches=useMemo(()=>buildCityGeometry(district),[district]);
  useLayoutEffect(()=>presentation.register(state=>applyCityDamage(batches,state.structures)),[presentation,batches]);
  useLayoutEffect(()=>presentation.registerMesh(()=>({surface:'fallback',...cityMeshDiagnostic(batches)})),[presentation,batches]);
  const colors:Record<CitySurface,string>={brick:'#655950',steel:'#506062',concrete:'#899187',window:'#48626a',trim:'#787e78',road:'#3e4949',marking:'#baad78',sign:'#97afa4',panel:'#7d9692',stone:'#c0b8a2'};
  const materials=useMemo(()=>Object.fromEntries(batches.map(b=>[b.surface,new MeshStandardMaterial({color:colors[b.surface],roughness:.75})])) as Partial<Record<CitySurface,MeshStandardMaterial>>,[batches]);
  useEffect(()=>()=>{for(const batch of batches)batch.geometry.dispose();for(const material of Object.values(materials))material.dispose();},[batches,materials]);
  return <>{batches.map(batch=><mesh key={batch.surface} geometry={batch.geometry} material={materials[batch.surface]} castShadow receiveShadow dispose={null}/>)}{district.buildings.flatMap(b=>b.fixtures.map(f=><FixtureFallback key={f.id} fixture={f}/>))}</>;
}
function CityArchitecture({seed,presentation,textures}:{seed:number;presentation:CityPresentation;textures:CityTextures|null}){
  const district=cityDistrict(seed)!;
  const factory=useGLTF('/assets/models/Factory_Workshop.glb');
  const batches=useMemo(()=>buildCityGeometry(district,!!textures),[district,textures]);
  const materials=useMemo(()=>{
    const originals=new Map<string,MeshStandardMaterial>();
    factory.scene.traverse(object=>{if(object instanceof Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material instanceof MeshStandardMaterial)originals.set(material.name,material);});
    const matched=(name:string,color:string,roughness:number,copyMaps=true)=>{
      const source=originals.get(name),material=source?.clone()??new MeshStandardMaterial({color,roughness});
      if(!source)throw new Error(`City material is absent from admitted factory: ${name}`);
      // Repeat sampler belongs to a clone, so existing factory UVs remain intact.
      if(copyMaps){const maps=new Map();for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'] as const){const original=material[key];if(!original)continue;let copy=maps.get(original);if(!copy){copy=original.clone();copy.wrapS=copy.wrapT=RepeatWrapping;maps.set(original,copy);}material[key]=copy;}}
      return material;
    };
    const brick=matched('modular_factory_facade_brick','#69574b',.85),steel=matched('modular_factory_facade_garage','#455353',.6),trim=matched('modular_factory_facade_trim_01','#777c76',.6),window=matched('modular_factory_facade_windows_glass','#4c686c',.22,!textures);
    window.transparent=false;window.opacity=1;window.emissive.set('#15272a');window.emissiveIntensity=.15;
    const sign=originals.get('Factory_Original_RainlineWorks_Sign_Paint')?.clone();if(!sign)throw new Error('City reused Higgsfield works sign is missing.');
    const panel=steel.clone();panel.color.set('#9ebeb8');panel.roughness=.48;
    const stone=brick.clone();stone.color.set('#e2d8c1');stone.roughness=.87;
    if(textures){
      window.map=textures.window;window.normalMap=window.roughnessMap=window.metalnessMap=window.aoMap=null;window.color.set('#ffffff');window.roughness=.72;window.metalness=.08;
      sign.map=textures.sign;sign.normalMap=sign.roughnessMap=sign.metalnessMap=sign.aoMap=null;sign.color.set('#ffffff');sign.roughness=.8;
      stone.map=textures.concrete;stone.normalMap=stone.roughnessMap=stone.metalnessMap=stone.aoMap=null;stone.color.set('#e2d8c1');
    }
    return {brick,steel,trim,window,sign,panel,stone,concrete:new MeshStandardMaterial({map:textures?.concrete??null,color:textures?'#ffffff':'#899187',roughness:.88}),road:new MeshStandardMaterial({color:'#3e4949',roughness:.68,metalness:.025}),marking:new MeshStandardMaterial({color:'#baad78',roughness:.83})} satisfies Record<CitySurface,Material>;
  },[factory,textures]);
  useLayoutEffect(()=>presentation.register(state=>applyCityDamage(batches,state.structures)),[presentation,batches]);
  useLayoutEffect(()=>presentation.registerMesh(()=>({surface:'pbr',...cityMeshDiagnostic(batches)})),[presentation,batches]);
  useEffect(()=>()=>{
    for(const batch of batches)batch.geometry.dispose();
    const maps=new Set();for(const material of Object.values(materials)){if(material instanceof MeshStandardMaterial)for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'] as const)if(material[key])maps.add(material[key]);material.dispose();}
    // Only cloned city samplers are disposed; loaded source maps stay cached.
    const sourceMaps=new Set();factory.scene.traverse(object=>{if(object instanceof Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material instanceof MeshStandardMaterial)for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'] as const)if(material[key])sourceMaps.add(material[key]);});
    const sceneMaps=new Set(Object.values(textures??{}));for(const map of maps)if(!sourceMaps.has(map)&&!sceneMaps.has(map as import('three').Texture))(map as import('three').Texture).dispose();
  },[batches,materials,factory,textures]);
  return <>
    {batches.map(batch=><mesh key={batch.surface} geometry={batch.geometry} material={materials[batch.surface]} castShadow={!['road','marking','concrete','window','sign'].includes(batch.surface)} receiveShadow dispose={null}/>)}
    {district.buildings.flatMap(b=>b.fixtures.map(f=><Suspense key={f.id} fallback={<FixtureFallback fixture={f}/>}><CoolantFixture fixture={f}/></Suspense>))}
  </>;
}
type Fixture=CityBuilding['fixtures'][number];
function FixtureFallback({fixture}:{fixture:Fixture}){return <mesh position={[fixture.position.x,fixture.position.y+fixture.size.y/2,fixture.position.z]} castShadow receiveShadow><boxGeometry args={[fixture.size.x,fixture.size.y,fixture.size.z]}/><meshStandardMaterial color="#506466" roughness={.7}/></mesh>;}
function CoolantFixture({fixture}:{fixture:Fixture}){
  const gltf=useGLTF('/assets/models/City_Coolant_Higgsfield.glb');
  // Cached source owns geometry/material textures; this scene owns only a clone.
  const scene=useMemo(()=>{const copy=gltf.scene.clone(true);copy.traverse(object=>{if(object instanceof Mesh){object.castShadow=true;object.receiveShadow=true;}});return copy;},[gltf]);
  return <primitive object={scene} position={[fixture.position.x,fixture.position.y+.00004,fixture.position.z]} scale={fixture.scale} dispose={null}/>;
}
