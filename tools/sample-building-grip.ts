/** Read-only shipping rig extraction. Re-run when an admitted player rig changes. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {Bone,SkinnedMesh,Vector3,type Object3D} from 'three';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {MECHS} from '../shared/config';
import {texturelessGeometryGlb} from './textureless-geometry-glb';
/** Weld only decoded seam duplicates; this is not a physical contact tolerance. */
export const CLAW_WELD_QUANTUM=1e-6;
export interface DecodedClaw {
  id:string; mesh:string; material:string; primitive:number;
  vertices:number[][]; triangles:number[][]; sourceTriangles:number[];
  sourceVertices:number[][]; signedVolume:number; min:number[]; max:number[];
}
export function extractShippingClaws(scene:Object3D,paw:Bone):DecodedClaw[]{
  const result:DecodedClaw[]=[];
  scene.traverse(object=>{
    if(!(object instanceof SkinnedMesh))return;
    const bone=object.skeleton.bones.indexOf(paw);if(bone<0)return;
    const pos=object.geometry.attributes.position,skin=object.geometry.attributes.skinIndex,weight=object.geometry.attributes.skinWeight,index=object.geometry.index;
    const point=(i:number)=>new Vector3().fromBufferAttribute(pos,i).applyMatrix4(object.bindMatrix).applyMatrix4(object.skeleton.boneInverses[bone]).toArray();
    const rigid=(i:number)=>skin.getX(i)===bone&&weight.getX(i)===1&&weight.getY(i)===0&&weight.getZ(i)===0&&weight.getW(i)===0;
    const groups=object.geometry.groups.length?object.geometry.groups:[{start:0,count:index?.count??pos.count,materialIndex:0}];
    for(let primitive=0;primitive<groups.length;primitive++){
      const group=groups[primitive],material=Array.isArray(object.material)?object.material[group.materialIndex??0]:object.material;
      const vertices:number[][]=[],sourceVertices:number[][]=[],triangles:number[][]=[],sourceTriangles:number[]=[],keys=new Map<string,number>(),parent:number[]=[];
      const find=(i:number):number=>parent[i]===i?i:parent[i]=find(parent[i]);
      for(let n=group.start;n<group.start+group.count;n+=3){
        const ids=[0,1,2].map(k=>index?index.getX(n+k):n+k);if(!ids.every(rigid))continue;
        const tri=ids.map(id=>{const v=point(id),key=v.map(x=>Math.round(x/CLAW_WELD_QUANTUM)).join(',');let i=keys.get(key);if(i===undefined){i=vertices.length;keys.set(key,i);vertices.push(v);sourceVertices.push([]);parent.push(i);}if(!sourceVertices[i].includes(id))sourceVertices[i].push(id);return i;});
        triangles.push(tri);sourceTriangles.push(n/3);for(let k=1;k<3;k++)parent[find(tri[k])]=find(tri[0]);
      }
      const components=new Map<number,number[]>();for(let i=0;i<vertices.length;i++){const k=find(i),list=components.get(k)??[];list.push(i);components.set(k,list);}
      for(const ids of components.values()){
        const vs=ids.map(i=>vertices[i]),min=[0,1,2].map(k=>Math.min(...vs.map(v=>v[k]))),max=[0,1,2].map(k=>Math.max(...vs.map(v=>v[k])));
        // Fail closed against the seven admitted shipping identities. These are
        // disconnected bevel claws, not the pad/knuckle or a material heuristic.
        if(vs.length!==56||min[1]<=.35||max[1]<=.49||max[0]-min[0]>=.075)continue;
        const map=new Map(ids.map((id,i)=>[id,i])),ts:number[][]=[],source:number[]=[];
        triangles.forEach((tri,i)=>{if(map.has(tri[0])){ts.push(tri.map(v=>map.get(v)!));source.push(sourceTriangles[i]);}});
        const center=new Vector3();for(const v of vs)center.add(new Vector3().fromArray(v));center.multiplyScalar(1/vs.length);
        let volume=0;const edges=new Map<string,number[]>();
        for(const t of ts){const a=new Vector3().fromArray(vs[t[0]]).sub(center),b=new Vector3().fromArray(vs[t[1]]).sub(center),c=new Vector3().fromArray(vs[t[2]]).sub(center);
          if(new Vector3().subVectors(b,a).cross(new Vector3().subVectors(c,a)).length()<1e-12)throw Error(`${paw.name}: degenerate claw triangle`);
          volume+=a.dot(b.cross(c))/6;
          for(let k=0;k<3;k++){const from=t[k],to=t[(k+1)%3],key=Math.min(from,to)+':'+Math.max(from,to),directions=edges.get(key)??[];directions.push(from<to?1:-1);edges.set(key,directions);}
        }
        if(volume<=0||[...edges.values()].some(e=>e.length!==2||e[0]+e[1]!==0))throw Error(`${paw.name}: nonclosed/inverted claw`);
        result.push({id:'',mesh:object.name,material:material.name,primitive,vertices:vs,triangles:ts,sourceTriangles:source,sourceVertices:ids.map(i=>sourceVertices[i]),signedVolume:volume,min,max});
      }
    }
  });
  result.sort((a,b)=>a.min[0]-b.min[0]);if(result.length!==3)throw Error(`${paw.name}: expected3 actual claws, got${result.length}`);
  result.forEach((c,i)=>c.id=`${paw.name}:claw:${i}`);return result;
}
export async function sampleBuildingGrip(output='shared/building-grip-profiles.json'){
const rigs=[];

const encode=(values:readonly number[])=>Buffer.from(new Float32Array(values).buffer).toString('base64');
const entries=[...(['pounce','bastion','lynx','caracal'] as const).map(chassis=>({chassis,key:chassis,file:MECHS[chassis].model,scale:MECHS[chassis].scale})),
  {key:'scout',chassis:'lynx',file:'Sentinel_Scout',scale:.65},{key:'mortar',chassis:'caracal',file:'Sentinel_Mortar',scale:.8},{key:'anchor',chassis:'bastion',file:'Sentinel_Anchor',scale:1.05}];
for(const {chassis,key,file,scale} of entries){
  const path=`public/assets/models/${file}.glb`,bytes=readFileSync(path);
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(bytes),'');
  gltf.scene.updateWorldMatrix(true,true);
  const selected=new Set<Bone>();
  for(const name of ['FL','FR','HL','HR'])for(let bone=gltf.scene.getObjectByName(`${name}_paw`);bone instanceof Bone;bone=bone.parent??undefined)selected.add(bone);
  const bones=[...selected].map(bone=>({name:bone.name,parent:bone.parent instanceof Bone?bone.parent.name:null,position:bone.position.toArray(),rotation:bone.quaternion.toArray(),scale:bone.scale.toArray()}));
  const point=new Vector3(),paws=['FL','FR','HL','HR'].map(name=>{
    const paw=gltf.scene.getObjectByName(`${name}_paw`) as Bone,min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
    gltf.scene.traverse(object=>{if(!(object instanceof SkinnedMesh))return;const bone=object.skeleton.bones.indexOf(paw);if(bone<0)return;
      const pos=object.geometry.attributes.position,idx=object.geometry.attributes.skinIndex,weights=object.geometry.attributes.skinWeight;
      for(let n=0;n<pos.count;n++){if(idx.getX(n)!==bone||weights.getX(n)!==1)continue;point.fromBufferAttribute(pos,n).applyMatrix4(object.bindMatrix).applyMatrix4(object.skeleton.boneInverses[bone]);min.min(point);max.max(point);}
    });
    if(!Number.isFinite(min.x))throw new Error(`${path}: missing rigid ${name} geometry`);
    return {name,min:min.toArray(),max:max.toArray(),claws:extractShippingClaws(gltf.scene,paw)};
  });
  const names=new Set(bones.map(b=>b.name));
  const clips=['FelineIdle','FelineAir','FelineGrab','FelineCling','FelineClimb','FelineMantle'].map(name=>{
    const clip=gltf.animations.find(c=>c.name===name);if(!clip)throw new Error(`${path}: missing ${name}`);
    return {name,duration:clip.duration,tracks:clip.tracks.filter(t=>names.has(t.name.split('.')[0])).map(track=>{
      const size=track.getValueSize(),constant=Array.from(track.values).every((v,i)=>v===track.values[i%size]);
      return {name:track.name,kind:track.ValueTypeName,timesLE:encode(constant?[0]:Array.from(track.times)),valuesLE:encode(constant?Array.from(track.values.slice(0,size)):Array.from(track.values)),interpolation:track.getInterpolation()};
    })};
  });
  rigs.push({chassis,key,path,sha256:createHash('sha256').update(bytes).digest('hex'),scale,bones,paws,clips});
}
writeFileSync(output,JSON.stringify({version:2,clawMethod:'Exact rigid decoded disconnected claw topology and source triangle/vertex provenance; outward closed components. Finite posed face selection is geometry metadata only, not contact admission.',method:'Exact decoded traversal/Idle/Air bone channels and rigid paw-local extrema from admitted shipping GLBs. Constant channels compacted without numeric changes; no geometry or source mutation.',rigs}));
console.log(JSON.stringify({output,bytes:readFileSync(output).length,rigs:rigs.map(r=>({chassis:r.chassis,sha256:r.sha256,bones:r.bones.length}))}));

}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await sampleBuildingGrip(process.argv[2]);
