import {isRainlineExtraction039Block} from '../../../shared/rainlineExtraction039';
import {Suspense,useEffect,useLayoutEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {createVisibleInstances178,commitVisibleInstances178,disposeVisibleInstances178,registerVisibleInstances178,type VisibleInstances178,districtModule178 as moduleFor,districtModuleYaw178 as moduleYaw,districtMatrix178 as componentMatrix,type DistrictModule178 as Module} from './visibleInstances178';
import {Color,BufferGeometry,Matrix4,Mesh,Quaternion,Vector3,type Material} from 'three';
import {buildOverhaulDistrict,getOverhaulComponent} from '../../../shared/overhaulDistrict';
import {isOverhaulDressingBlock} from '../../../shared/overhaulDressing';
import {isRainlineStreetBlock} from '../../../shared/rainlineStreetAdmission';
import {cityBlockActive,type CityBlock} from '../../../shared/cityDistrict';
import type {StructureState} from '../../../shared/types';
import type {CityPresentation} from './cityPresentation';
import {OverhaulIdentityArt,overhaulIdentityModule} from './overhaulIdentityArt';

const URL='/assets/overhaul/city-v2/Rainline_Modular_City_v2.glb';
interface RuinPose {block:number;position:{x:number;y:number;z:number};rotation:{x:number;y:number;z:number;w:number};settled:boolean;born:number;}
interface Placement {block:CityBlock;index:number;matrix:Matrix4;}
interface Batch {key:string;geometry:BufferGeometry;material:Material|Material[];placements:Placement[];instances:VisibleInstances178;}
/** The shared compiler owns every visible component. No whole-building proxy or
 * additional solid scenery is created by this adapter. GLB details share the
 * instance transform and active mask of their owning gameplay component. */
export function OverhaulDistrictArt({seed,presentation}:{seed:number;presentation:CityPresentation}) {
  return <Suspense fallback={null}><DistrictInstances seed={seed} presentation={presentation}/></Suspense>;
}
export function OverhaulRuinsArt({seed,presentation}:{seed:number;presentation:CityPresentation}) {
  return <Suspense fallback={null}><DistrictInstances seed={seed} presentation={presentation} ruins/></Suspense>;
}
function update(batches:Batch[],states:readonly StructureState[],ruinPoses?:readonly RuinPose[]) {
  const ruins=ruinPoses?new Map(ruinPoses.map(pose=>[pose.block,pose])):null;
  const banks=new Map(states.map(state=>[state.id,state])),color=new Color();
  const matrix=new Matrix4(),translation=new Vector3(),scale=new Vector3(),orientation=new Quaternion(),originalOrientation=new Quaternion();
  for(const batch of batches){
    const mesh=batch.instances.mesh;let count=0;
    for(const placement of batch.placements){
      if(ruins){
        const pose=ruins.get(placement.index);if(!pose)continue;
        placement.matrix.decompose(translation,originalOrientation,scale);
        // Ruin pose is already the complete collider world orientation.
        originalOrientation.setFromAxisAngle(new Vector3(0,1,0),moduleYaw(placement.block));
        translation.set(pose.position.x,pose.position.y,pose.position.z);
        orientation.set(pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w).multiply(originalOrientation);
        matrix.compose(translation,orientation,scale);mesh.setColorAt(count,color.setRGB(.72,.72,.72));mesh.setMatrixAt(count++,matrix);
      }else if(cityBlockActive(placement.block,states)){
        const block=placement.block,hp=block.cellId===undefined?1:(banks.get(block.structureId!)?.hp[block.cellId]??getOverhaulComponent(block)?.maxHp??1),max=getOverhaulComponent(block)?.maxHp??hp;
        const wear=1-Math.max(0,Math.min(1,hp/max));mesh.setColorAt(count,color.setRGB(1-wear*.5,1-wear*.58,1-wear*.62));mesh.setMatrixAt(count++,placement.matrix);
      }
    }
    commitVisibleInstances178(batch.instances,count);
  }
}
function DistrictInstances({seed,presentation,ruins=false}:{seed:number;presentation:CityPresentation;ruins?:boolean}) {
  const gltf=useGLTF(URL),district=useMemo(()=>buildOverhaulDistrict(seed),[seed]),gl=useThree(s=>s.gl);
  const multiDraw=gl.extensions.has('WEBGL_multi_draw');
  const batches=useMemo(()=>{
    if(!district)return [];
    gltf.scene.updateMatrixWorld(true);
    const placements=new Map<Module,Placement[]>();
    for(const [index,block] of district.blocks.entries()){if(isRainlineExtraction039Block(block)||isOverhaulDressingBlock(block)||isRainlineStreetBlock(block)||overhaulIdentityModule(block))continue;const module=moduleFor(block),group=placements.get(module)??[];group.push({block,index,matrix:componentMatrix(block)});placements.set(module,group);}
    const result:Batch[]=[];
    for(const [module,group] of placements){
      const root=gltf.scene.getObjectByName(module);
      if(!root)throw new Error(`Rainline art module missing: ${module}`);
      root.traverse(object=>{if(object instanceof Mesh){
        // Bake asset transforms once, then instance the exact shared collider box.
        const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
        result.push({key:object.name,geometry,material:object.material,placements:group,instances:createVisibleInstances178(geometry,object.material,group.length,multiDraw,`District178_${ruins?'ruins':'intact'}_${object.name}`)});
      }});
    }
    return result;
  },[gltf,district,multiDraw,ruins]);
  useLayoutEffect(()=>{const unregister=batches.map(b=>registerVisibleInstances178(b.instances));return()=>unregister.forEach(f=>f());},[batches]);
  useLayoutEffect(()=>{
    const apply=(state:ReturnType<CityPresentation['read']>)=>update(batches,state?.structures??[],ruins?((state as (NonNullable<typeof state>&{ruins?:readonly RuinPose[]})|null)?.ruins??[]):undefined);
    apply(presentation.read());
    return presentation.register(apply);
  },[batches,presentation,ruins]);
  useLayoutEffect(()=>ruins?undefined:presentation.registerMesh(()=>{
    const states=presentation.read()?.structures??[],blocks=(district?.blocks??[]).filter(block=>!isRainlineExtraction039Block(block)&&!isOverhaulDressingBlock(block)&&!isRainlineStreetBlock(block));
    const removedBlocks=blocks.filter(block=>!cityBlockActive(block,states)).map(block=>block.id);
    return {surface:'pbr',activeBlocks:blocks.length-removedBlocks.length,removedBlocks,cells:blocks.filter(block=>block.structureId!==undefined).length};
  }),[district,presentation,ruins]);
  useEffect(()=>()=>{for(const batch of batches){disposeVisibleInstances178(batch.instances);batch.geometry.dispose();}},[batches]);
  return <><OverhaulIdentityArt seed={seed} presentation={presentation} ruins={ruins}/>{batches.map(batch=><primitive key={batch.key} object={batch.instances.mesh} dispose={null}/>)}</>;
}
useGLTF.preload(URL);
