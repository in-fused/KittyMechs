import * as THREE from '../.sites-runtime/destruction-lab-001/node_modules/three/build/three.module.js';
import {DestructibleMesh} from '../assets/source/city-fracture/three-pinata-offline-patch/src/DestructibleMesh.ts';
import {FractureOptions} from '../assets/source/city-fracture/three-pinata-offline-patch/src/entities/FractureOptions.ts';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex'),dir=process.argv[2];if(!dir||existsSync(dir))throw Error('Fresh attempt required');mkdirSync(dir,{recursive:true});
function topology(g){

 const p=g.attributes.position,indices=g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i),edges=new Map(),directions=new Map();let volume=0,degenerate=0;

 const v=i=>new THREE.Vector3().fromBufferAttribute(p,i),key=a=>[a.x,a.y,a.z].map(x=>Math.round(x*1e6)).join(',');

 for(let i=0;i<indices.length;i+=3){const a=v(indices[i]),b=v(indices[i+1]),c=v(indices[i+2]);volume+=a.dot(b.clone().cross(c))/6;if(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()<1e-20)degenerate++;

 for(const [u,w]of [[a,b],[b,c],[c,a]]){const x=key(u),y=key(w),k=[x,y].sort().join('|');edges.set(k,(edges.get(k)??0)+1);directions.set(k,(directions.get(k)??0)+(x<y?1:-1));}}

 return {triangles:indices.length/3,finite:Array.from(p.array).every(Number.isFinite),signedVolume:volume,degenerate,boundaryEdges:[...edges.values()].filter(n=>n===1).length,nonManifoldEdges:[...edges.values()].filter(n=>n>2).length,orientationErrors:[...directions.values()].filter(n=>n!==0).length,weldPrecision:1e-6};

}




const definitions=[{id:'post',size:[17.7,.5,.5],grid:[8,1],span:[.14,1,1]},{id:'face',size:[8.85,5,.3],grid:[4,2],span:[.32,.65,1]},{id:'slab',size:[10,9,.3],grid:[4,2],span:[.32,.62,1]}];
const outer=new THREE.MeshStandardMaterial(),inner=new THREE.MeshStandardMaterial();
const templates=[],reports=[];
for(const definition of definitions){const {id,size,grid,span}=definition;
 const seeds=Array.from({length:8},(_,i)=>{const column=i%grid[0],row=Math.floor(i/grid[0]);return[(column+.5)/grid[0]-.5,grid[1]===1?((i%3)-1)*.012:(row+.5)/grid[1]-.5+((i%3)-1)*.008,((i%3)-1)*.017].map((v,j)=>v*size[j]);});
 function bake(){const mesh=new DestructibleMesh(new THREE.BoxGeometry(...size),outer,inner);mesh.updateMatrixWorld(true);const fragments=mesh.fracture(new FractureOptions({fractureMethod:'voronoi',fragmentCount:8,seed:1926,voronoiOptions:{mode:'3D',seedPoints:seeds.map(s=>new THREE.Vector3(...s)),useApproximation:false}}));
 return fragments.map((piece,index)=>{const g=piece.geometry,t=topology(g),positions=Array.from(g.attributes.position.array).map((v,i)=>v/size[i%3]),center=piece.position.toArray().map((v,i)=>v/size[i]),normals=[];for(let i=0;i<g.attributes.normal.array.length;i+=3){const v=new THREE.Vector3(...Array.from(g.attributes.normal.array.slice(i,i+3)).map((x,j)=>x*size[j])).normalize();normals.push(...v.toArray());}
 const vertices=Array.from({length:positions.length/3},(_,i)=>[0,1,2].map(j=>(positions[i*3+j]+center[j])*size[j]));
 const violations=seeds.map((seed,i)=>Math.max(...vertices.flatMap(v=>seeds.map((other,j)=>{if(i===j)return 0;const n=other.map((x,k)=>x-seed[k]),length=Math.hypot(...n);return n.reduce((sum,x,k)=>sum+x*(v[k]-(seed[k]+other[k])/2),0)/length;}))));const seedId=violations.findIndex(v=>v<=1e-5);
 const axisSpan=[0,1,2].map(a=>Math.max(...positions.filter((_,i)=>i%3===a))-Math.min(...positions.filter((_,i)=>i%3===a)));
 return{id:index,center,positions,normals,uv:Array.from(g.attributes.uv.array),indices:g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i),groups:g.groups,volume:t.signedVolume/size.reduce((n,x)=>n*x,1),seedId,halfspaceViolation:seedId<0?Math.min(...violations):violations[seedId],axisSpan,validation:t,sharedMaterials:piece.material[0]===outer&&piece.material[1]===inner};});}
 const a=bake(),b=bake(),repeatEqual=JSON.stringify(a)===JSON.stringify(b),volume=a.reduce((n,p)=>n+p.volume,0);const bounds=[0,1,2].map(j=>{const v=a.flatMap(p=>p.positions.filter((_,i)=>i%3===j).map(x=>x+p.center[j]));return[Math.min(...v),Math.max(...v)];});
 const valid=repeatEqual&&a.length===8&&Math.abs(volume-1)<1e-5&&new Set(a.map(p=>p.seedId)).size===8&&a.every(p=>p.seedId>=0&&p.volume>0&&p.sharedMaterials&&p.validation.finite&&!p.validation.degenerate&&!p.validation.boundaryEdges&&!p.validation.nonManifoldEdges&&!p.validation.orientationErrors&&p.axisSpan.every((x,j)=>x<=span[j]+1e-6)&&p.groups.every(g=>g.materialIndex===0||g.materialIndex===1))&&bounds.every(b=>Math.abs(b[0]+.5)<1e-5&&Math.abs(b[1]-.5)<1e-5);
 reports.push({id,valid,repeatEqual,volume,bounds,maxSpan:[0,1,2].map(j=>Math.max(...a.map(p=>p.axisSpan[j]))),pieces:a.map(p=>({id:p.id,seedId:p.seedId,halfspaceViolation:p.halfspaceViolation,validation:p.validation,axisSpan:p.axisSpan}))});templates.push({id,representativeSize:size,seedPointsMetric:seeds,maxSpan:span,pieces:a.map(({validation:_validation,sharedMaterials:_sharedMaterials,...p})=>p)});
}
const source={package:'@dgreenheck/three-pinata',version:'2.0.1',three:'0.180.0',license:'MIT',seed:1926,method:'full3D-exact-neighbors',generatorSha256:sha(readFileSync('tools/bake-city-fracture-shapes.mjs')),patchManifest:JSON.parse(readFileSync('assets/source/city-fracture/three-pinata-offline-patch/manifest.json','utf8'))};
const payload={schema:2,axes:['long','middle','thin'],fragmentCount:8,source,templates},asset={...payload,contentSha256:sha(JSON.stringify(payload))},passed=reports.every(r=>r.valid);writeFileSync(`${dir}/candidate.json`,JSON.stringify(asset));writeFileSync(`${dir}/validation.json`,JSON.stringify({passed,reports},null,2));
if(passed){if(existsSync('shared/data/city-fracture-shapes-v2.json'))throw Error('Canonical already frozen');writeFileSync('shared/data/city-fracture-shapes-v2.json',JSON.stringify(asset));}
console.log(JSON.stringify({passed,reports:reports.map(({pieces:_pieces,...r})=>r)}));process.exitCode=passed?0:1;
