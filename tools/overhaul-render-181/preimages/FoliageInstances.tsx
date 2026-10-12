import {useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {InstancedMesh,Matrix4,Mesh,MeshStandardMaterial,Object3D,type BufferGeometry,type Material} from 'three';
import {foliageLod,fernVariant,type FoliageQuality} from '../../../shared/foliage';
import type {PropDescriptor} from '../../../shared/world';

interface Part {geometry:BufferGeometry;material:Material|Material[];matrix:Matrix4;lod:number;variant:number;}
/** Cached GLBs contain every LOD, so crossing a detail boundary cannot trigger a
 * new download or hide a solid trunk. Instance storage is bounded by loaded props. */
export function FoliageInstances({kind,props,quality,seed}:{kind:'cedar'|'fern';props:PropDescriptor[];quality:FoliageQuality;seed:number}){
  const gltf=useGLTF(`/assets/models/${kind==='cedar'?'Forest_Fir':'Forest_Fern'}.glb`);
  const camera=useThree(s=>s.camera),refs=useRef<(InstancedMesh|null)[]>([]),next=useRef(0);
  const prepared=useMemo(()=>{
    const parts:Part[]=[],materials=new Map<Material,Material>();gltf.scene.updateMatrixWorld(true);
    const clone=(original:Material)=>{
      let result=materials.get(original);if(result)return result;
      result=original.clone();materials.set(original,result);
      if(result instanceof MeshStandardMaterial){
        // Preserve the source's matched UV/PBR maps and color spaces.
        if(result.alphaTest>0)result.alphaToCoverage=true;
        if(seed===4107)result.color.set('#d7e3df');
      }
      return result;
    };
    gltf.scene.traverse(object=>{
      if(!(object instanceof Mesh))return;
      let parent:Object3D|null=object,match:RegExpMatchArray|null=null;
      while(parent&&!match){match=parent.name.match(kind==='cedar'?/^Fir_LOD(\d)/:/^Fern_V(\d)_LOD(\d)/);parent=parent.parent;}
      if(!match)throw new Error(`Unclassified foliage mesh ${object.name}`);
      parts.push({geometry:object.geometry,material:Array.isArray(object.material)?object.material.map(clone):clone(object.material),matrix:object.matrixWorld.clone(),lod:Number(match[kind==='cedar'?1:2]),variant:kind==='cedar'?0:Number(match[1])});
    });
    return {parts,materials:[...materials.values()]};
  },[gltf,kind,seed]);
  const placements=useMemo(()=>{
    const object=new Object3D();
    return props.map(p=>{object.position.set(p.x,p.y,p.z);object.rotation.set(0,p.rotation,0);object.scale.setScalar(p.scale);object.updateMatrix();return object.matrix.clone();});
  },[props]);
  const lods=useMemo(()=>new Int8Array(props.length).fill(-1),[props,quality]);
  const scratch=useMemo(()=>new Matrix4(),[]);
  const sync=(force:boolean)=>{
    let changed=force;
    for(let i=0;i<props.length;i++){
      const p=props[i],lod=foliageLod(kind,Math.hypot(camera.position.x-p.x,camera.position.z-p.z),quality,lods[i]);
      if(lod!==lods[i]){lods[i]=lod;changed=true;}
    }
    if(!changed)return;
    for(let partIndex=0;partIndex<prepared.parts.length;partIndex++){
      const mesh=refs.current[partIndex];if(!mesh)continue;
      const part=prepared.parts[partIndex];let count=0;
      for(let i=0;i<props.length;i++)if(lods[i]===part.lod&&(kind==='cedar'||fernVariant(props[i].x,props[i].z)===part.variant)){
        scratch.multiplyMatrices(placements[i],part.matrix);mesh.setMatrixAt(count++,scratch);
      }
      mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;
      if(count)mesh.computeBoundingSphere();
    }
  };
  useLayoutEffect(()=>{sync(true);});
  useLayoutEffect(()=>()=>prepared.materials.forEach(material=>material.dispose()),[prepared]);
  useFrame(state=>{if(state.clock.elapsedTime<next.current)return;next.current=state.clock.elapsedTime+.1;sync(false);});
  return <>{prepared.parts.map((part,index)=><FoliageBatch key={index} part={part} capacity={props.length} shadow={kind==='cedar'&&part.lod===0&&quality!=='low'} assign={mesh=>{refs.current[index]=mesh;}}/>)}</>;
}
function FoliageBatch({part,capacity,shadow,assign}:{part:Part;capacity:number;shadow:boolean;assign:(mesh:InstancedMesh|null)=>void}){
  const ref=useRef<InstancedMesh|null>(null);
  useLayoutEffect(()=>{const mesh=ref.current;return()=>{mesh?.dispose();};},[part,capacity]);
  return <instancedMesh ref={mesh=>{ref.current=mesh;assign(mesh);}} args={[part.geometry,part.material,capacity]} castShadow={shadow} receiveShadow dispose={null}/>;
}
