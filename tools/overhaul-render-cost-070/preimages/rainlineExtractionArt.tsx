import {Suspense,useEffect,useLayoutEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {BatchedMesh,BufferGeometry,Color,Float32BufferAttribute,Matrix4,Mesh,Quaternion,Vector3,type Material} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {buildOverhaulDistrict,getOverhaulComponent} from '../../../shared/overhaulDistrict';
import {cityBlockActive,type CityBlock} from '../../../shared/cityDistrict';
import {overhaulFragmentKey,overhaulFragmentRecipe} from '../../../shared/overhaulFracture';
import {clipOverhaulFragment} from './overhaulFragmentGeometry';
import type {CityPresentation} from './cityPresentation';

const URL='/assets/overhaul/extraction039/Rainline_Extraction039.glb';
export const RAINLINE_EXTRACTION_ART_PREFIX='7734:overhaul:extraction039:';
export const isRainlineExtractionArtBlock=(block:CityBlock)=>block.buildingId.startsWith(RAINLINE_EXTRACTION_ART_PREFIX);
interface Placement {block:CityBlock;index:number;module:string;piece?:number;instance:number;matrix:Matrix4;}
interface Group {mesh:BatchedMesh;placements:Placement[];}

function moduleFor(block:CityBlock):string {
 const component=getOverhaulComponent(block);
 switch(component?.kind){
  case 'foundation':return 'foundation';
  case 'column':return 'column';
  case 'beam':return 'beam';
  case 'slab':return block.id.includes(':roof-')?'roof':'slab';
  case 'facade':{
   const family=component.usage==='works'?'freight':component.usage==='utility'?'utility':'transit';
   const match=block.id.match(/facade-[a-z]+-(\d+)-(\d+)$/),upper=match?.[1]!=='0',bay=Number(match?.[2]??0);
   return family+(upper?'_upper':bay===0?'_label':'_ground');
  }
  default:throw Error('Extraction039 component kind has no authored module: '+block.id);
 }
}
function moduleYaw(block:CityBlock):number {
 const c=getOverhaulComponent(block);return c?.kind!=='facade'?0:c.side==='east'?Math.PI/2:c.side==='west'?-Math.PI/2:c.side==='north'?Math.PI:0;
}
/** Source kit spans [-1,1], therefore scale ONCE by native half extents.
 * Facade local +Z faces out, matching the existing component side rotation. */
export function rainlineExtractionArtMatrix(block:CityBlock):Matrix4 {
 const c=getOverhaulComponent(block),swap=c?.kind==='facade'&&(c.side==='west'||c.side==='east'),[x,y,z]=block.halfExtents;
 return new Matrix4().compose(new Vector3(...block.position),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),block.yaw+moduleYaw(block)),new Vector3(swap?z:x,y,swap?x:z));
}
/** Cosmetic kit follows the preloaded native structure, its active mask and
 * persistent ruin pose. This adapter never creates colliders or simulation. */
export function RainlineExtractionArt({seed,presentation,ruins=false,experimentalFragments=false}:{seed:number;presentation:CityPresentation;ruins?:boolean;experimentalFragments?:boolean}) {
 return seed===7734?<Suspense fallback={null}><ExtractionInstances seed={seed} presentation={presentation} ruins={ruins} experimentalFragments={experimentalFragments}/></Suspense>:null;
}
function ExtractionInstances({seed,presentation,ruins,experimentalFragments}:{seed:number;presentation:CityPresentation;ruins:boolean;experimentalFragments:boolean}) {
 const gltf=useGLTF(URL),district=useMemo(()=>buildOverhaulDistrict(seed),[seed]);
 const groups=useMemo(()=>{
  if(!district)return [];
  gltf.scene.updateMatrixWorld(true);
  const selected=district.blocks.flatMap((block,index)=>{
   if(!isRainlineExtractionArtBlock(block))return [];
   const whole={block,index,module:moduleFor(block),piece:undefined as number|undefined},recipe=overhaulFragmentRecipe(block);
   return ruins&&experimentalFragments&&recipe.length>1?[whole,...recipe.map(fragment=>({...whole,piece:fragment.piece}))]:[whole];
  });
  const sources=new Map<string,{material:Material;parts:Map<string,BufferGeometry[]>}>(),result:Group[]=[];
  const geometryKey=(p:typeof selected[number])=>p.module+(p.piece===undefined?'':':fragment:'+overhaulFragmentRecipe(p.block)[p.piece].canonicalOffset.join(','));
  try {
   for(const module of new Set(selected.map(p=>p.module))){
    const root=gltf.scene.getObjectByName(module);if(!root)throw Error('Extraction039 authored module missing '+module);
    root.traverse(object=>{
     if(!(object instanceof Mesh))return;if(Array.isArray(object.material))throw Error('Extraction039 requires one material per primitive');
     const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
     for(const name of Object.keys(geometry.attributes)){const attribute=geometry.getAttribute(name);if(attribute.normalized)geometry.setAttribute(name,new Float32BufferAttribute(Array.from({length:attribute.count},(_,i)=>Array.from({length:attribute.itemSize},(_,j)=>attribute.getComponent(i,j))).flat(),attribute.itemSize));}
     const source=sources.get(object.material.uuid)??{material:object.material,parts:new Map<string,BufferGeometry[]>()},parts=source.parts.get(module)??[];
     parts.push(geometry);source.parts.set(module,parts);sources.set(object.material.uuid,source);
    });
   }
   if(sources.size>4)throw Error('Extraction039 exceeds four material groups');
   for(const source of sources.values()){
    const geometries=new Map<string,BufferGeometry>();
    try {
     for(const [module,parts] of source.parts){const merged=mergeGeometries(parts,false);if(!merged)throw Error('Cannot merge Extraction039 module '+module);geometries.set(module,merged);}
     let placements=selected.filter(p=>geometries.has(p.module));
     for(const p of placements)if(p.piece!==undefined&&!geometries.has(geometryKey(p))){
      // Enter the shared clipper's [-.5,.5] source domain, clip with its
      // unchanged canonical recipe, then restore this kit's [-1,1] units.
      // The clipper subtracts quarter-centre translation before restoration.
      const canonical=geometries.get(p.module)!.clone().scale(.5,.5,.5);
      try {geometries.set(geometryKey(p),clipOverhaulFragment(canonical,overhaulFragmentRecipe(p.block)[p.piece].canonicalOffset).scale(2,2,2));}
      finally {canonical.dispose();}
     }
     placements=placements.filter(p=>geometries.get(geometryKey(p))!.getAttribute('position').count>0);
     for(const [key,g] of geometries)if(g.getAttribute('position').count===0){g.dispose();geometries.delete(key);}
     if(!placements.length)continue;
     const mesh=new BatchedMesh(placements.length,[...geometries.values()].reduce((n,g)=>n+g.getAttribute('position').count,0),[...geometries.values()].reduce((n,g)=>n+(g.index?.count??g.getAttribute('position').count),0),source.material);
     mesh.name='RainlineExtraction039_'+source.material.name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.perObjectFrustumCulled=true;mesh.sortObjects=false;
     const group:Group={mesh,placements:[]};result.push(group);
     const ids=new Map<string,number>();for(const [key,g] of geometries)ids.set(key,mesh.addGeometry(g));
     group.placements=placements.map(p=>({...p,instance:mesh.addInstance(ids.get(geometryKey(p))!),matrix:rainlineExtractionArtMatrix(p.block)}));
    }finally{for(const g of geometries.values())g.dispose();}
   }
   return result;
  }catch(error){for(const group of result)group.mesh.dispose();throw error;}
  finally{for(const source of sources.values())for(const parts of source.parts.values())for(const geometry of parts)geometry.dispose();}
 },[gltf,district,ruins,experimentalFragments]);
 useLayoutEffect(()=>{
  const matrix=new Matrix4(),position=new Vector3(),scale=new Vector3(),rotation=new Quaternion(),offset=new Quaternion(),color=new Color();
  const apply=(state:ReturnType<CityPresentation['read']>)=>{
   const poses=new Map(state?.ruins?.map(p=>[overhaulFragmentKey(p.block,p.piece),p])??[]),banks=new Map(state?.structures.map(s=>[s.id,s])??[]);
   for(const group of groups)for(const p of group.placements){
    if(ruins){
     const pose=poses.get(overhaulFragmentKey(p.index,p.piece)),matching=!!pose&&(p.piece===undefined?overhaulFragmentRecipe(p.block).length===1||pose.piece===undefined:pose.piece===p.piece);
     group.mesh.setVisibleAt(p.instance,matching);if(!pose||!matching)continue;
     p.matrix.decompose(position,rotation,scale);position.set(pose.position.x,pose.position.y,pose.position.z);offset.setFromAxisAngle(new Vector3(0,1,0),moduleYaw(p.block));rotation.set(pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w).multiply(offset);
     matrix.compose(position,rotation,scale);group.mesh.setMatrixAt(p.instance,matrix);group.mesh.setColorAt(p.instance,color.setRGB(.72,.72,.72));
    }else{
     const live=cityBlockActive(p.block,state?.structures??[]);group.mesh.setVisibleAt(p.instance,live);if(!live)continue;
     group.mesh.setMatrixAt(p.instance,p.matrix);const max=getOverhaulComponent(p.block)?.maxHp??1,hp=p.block.cellId===undefined?max:banks.get(p.block.structureId!)?.hp[p.block.cellId]??max,wear=1-Math.max(0,Math.min(1,hp/max));
     group.mesh.setColorAt(p.instance,color.setRGB(1-wear*.5,1-wear*.58,1-wear*.62));
    }
   }
  };apply(presentation.read());return presentation.register(apply);
 },[groups,presentation,ruins]);
 useLayoutEffect(()=>ruins?undefined:presentation.registerMesh(()=>{
  const blocks=district?.blocks.filter(isRainlineExtractionArtBlock)??[],states=presentation.read()?.structures??[],removedBlocks=blocks.filter(b=>!cityBlockActive(b,states)).map(b=>b.id);
  return {surface:'pbr',activeBlocks:blocks.length-removedBlocks.length,removedBlocks,cells:blocks.length};
 }),[district,presentation,ruins]);
 useEffect(()=>()=>{for(const group of groups)group.mesh.dispose();},[groups]);
 return <>{groups.map(group=><primitive key={group.mesh.uuid} object={group.mesh} dispose={null}/>)}</>;
}
useGLTF.preload(URL);
