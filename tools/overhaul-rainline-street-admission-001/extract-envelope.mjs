import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Matrix4,Quaternion,Vector3} from 'three';
import {ConvexHull} from 'three/examples/jsm/math/ConvexHull.js';
const source='assets/source/overhaul-rainline-street-population-001/Rainline_StreetPopulation_001.glb',data=readFileSync(source),hash=createHash('sha256').update(data).digest('hex');
if(hash!=='387db23d0128df59c215b927ecfcadffb0492faa2bcee1c54a9264f98fcad70a')throw Error('Frozen source mismatch');
const len=data.readUInt32LE(12),g=JSON.parse(data.subarray(20,20+len)),binary=data.subarray(28+len);
const selected=JSON.parse(readFileSync('.sites-runtime/overhaul-20261010/rainline-street-admission-001/source-lock.json','utf8')).selected;
const names=new Set(selected.map(p=>p.module)),points=new Map([...names].map(n=>[n,[]]));
function matrix(node){return node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(new Vector3(...(node.translation??[0,0,0])),new Quaternion(...(node.rotation??[0,0,0,1])),new Vector3(...(node.scale??[1,1,1])));}
function walk(index,parent,owner){const node=g.nodes[index],world=parent.clone().multiply(matrix(node));if(names.has(node.name))owner=node.name;
 if(owner&&node.mesh!==undefined)for(const primitive of g.meshes[node.mesh].primitives){const a=g.accessors[primitive.attributes.POSITION],v=g.bufferViews[a.bufferView];if(a.componentType!==5126||a.type!=='VEC3'||a.sparse)throw Error('Unsupported unchanged source POSITION');const start=(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??12;
  for(let i=0;i<a.count;i++){const off=start+i*stride;points.get(owner).push(new Vector3(binary.readFloatLE(off),binary.readFloatLE(off+4),binary.readFloatLE(off+8)).applyMatrix4(world));}}
 for(const child of node.children??[])walk(child,world,owner);
}
for(const root of g.scenes[g.scene??0].nodes)walk(root,new Matrix4());
const masses=[240,75,650,220,180,180,420,85,60,35];
const rows=selected.map((p,i)=>{const verts=points.get(p.module);if(!verts.length)throw Error('Missing source vertices');const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const v of verts)for(let a=0;a<3;a++){min[a]=Math.min(min[a],v.getComponent(a));max[a]=Math.max(max[a],v.getComponent(a));}
 const center=min.map((v,a)=>(v+max[a])/2),halfExtents=min.map((v,a)=>(max[a]-v)/2),hull=new ConvexHull().setFromPoints(verts),unique=new Map();
 for(const face of hull.faces){let e=face.edge;do{const v=e.head().point;unique.set(v.toArray().join(','),v.toArray().map((n,a)=>n-center[a]));e=e.next;}while(e!==face.edge);}
 return {id:p.id,module:p.module,pivot:p.worldPositionXYZ,yaw:p.yawRadians,center,halfExtents,massKg:masses[i],sourcePositionCount:verts.length,hullVertices:[...unique.values()].flat()};});
mkdirSync('shared/data',{recursive:true});
writeFileSync('shared/data/rainlineStreetAdmission001.json',JSON.stringify({revision:'rainline-west-street-001',sourceSha256:hash,method:'unchanged source-position convex envelope; internal gaps filled; not exact source contact',placements:rows},null,2));
console.log('UNCHANGED_SOURCE_ENVELOPES_EXTRACTED',rows.map(p=>({id:p.id,sourcePositions:p.sourcePositionCount,hullPoints:p.hullVertices.length/3})));
