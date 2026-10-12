import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {BatchedMesh,Group,Matrix4,Mesh,MeshStandardMaterial,Quaternion,Vector3} from 'three';
import {cityDistrict,type CityBlock} from '../shared/cityDistrict';
import {cityFractureAssetFor,cityFractureCenter,cityFractureTextureUV} from '../shared/cityFracture';
import {cityFractureCatalog} from '../shared/cityFractureCatalog';
import {CityRubbleOwner} from '../shared/cityRubble';
import {buildCityFractureGeometry} from '../src/game/world/cityFractureGeometry';
import {CityFractureRenderer} from '../src/game/world/cityFractureRenderer';
import {writeFileSync} from 'node:fs';
beforeAll(async()=>{await RAPIER.init();});
const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
const fixture=(halfExtents:[number,number,number]):CityBlock=>({id:'fixture',buildingId:'fixture',part:'cell',position:[2,3,4],halfExtents,yaw:.37,material:'brick'});
function volume(p:ReturnType<typeof cityFractureAssetFor>['pieces'][number]){let sum=0;for(let i=0;i<p.indices.length;i+=3){const [a,b,c]=p.indices.slice(i,i+3).map(j=>new Vector3(...p.positions.slice(j*3,j*3+3) as [number,number,number]));sum+=a.dot(b.clone().cross(c))/6;}return sum;}
it('corrects all six axis permutations including odd winding and covariant normals',()=>{
 for(const axes of permutations){const half:[number,number,number]=[0,0,0];axes.forEach((a,i)=>half[a]=[4.425,2.5,.15][i]);const asset=cityFractureAssetFor(fixture(half),cityFractureCatalog);expect(asset.template).toContain('source-shape-v2/');for(const p of asset.pieces){expect(volume(p)).toBeGreaterThan(0);
 for(let i=0;i<p.indices.length;i+=3){const [a,b,c]=p.indices.slice(i,i+3).map(j=>new Vector3(...p.positions.slice(j*3,j*3+3) as [number,number,number])),normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),n=new Vector3(...p.normals.slice(p.indices[i]*3,p.indices[i]*3+3) as [number,number,number]);expect(normal.dot(n)).toBeGreaterThan(.999);}}
 }
});
it('reassembles every distinct actual eligible source dimension with positive volume and exact source extents',()=>{
 const cells=cityDistrict(7734)!.structures.flatMap(s=>s.cells),distinct=new Map(cells.map(c=>[c.halfExtents.join(','),c]));expect(distinct.size).toBeGreaterThan(10);
 for(const block of distinct.values()){const asset=cityFractureAssetFor(block,cityFractureCatalog),all=asset.pieces.flatMap(p=>Array.from({length:p.positions.length/3},(_,i)=>[0,1,2].map(j=>(p.positions[i*3+j]+p.center[j])*block.halfExtents[j]*2)));for(let j=0;j<3;j++){expect(Math.min(...all.map(v=>v[j]))).toBeCloseTo(-block.halfExtents[j],5);expect(Math.max(...all.map(v=>v[j]))).toBeCloseTo(block.halfExtents[j],5);}expect(asset.pieces.reduce((s,p)=>s+volume(p),0)).toBeCloseTo(1,5);}
});
it('matches actual native pose matrices and source-sized visible geometry while measuring hull approximation',()=>{
 const district=cityDistrict(7734)!,cells=district.structures.flatMap(s=>s.cells),posts=cells.filter(c=>c.id.includes(':support-')),faces=cells.filter(c=>c.id.includes(':panel-')),slabs=cells.filter(c=>c.part==='deck'),largest=(list:CityBlock[])=>[...list].sort((a,b)=>Math.max(...b.halfExtents)-Math.max(...a.halfExtents))[0],sources=[posts[0],faces[0],slabs[0],largest(posts),largest(faces),largest(slabs)],rows:{id:string;template:string;minGap:number;maxExpansion:number}[]=[];
 for(const block of sources){const world=new RAPIER.World({x:0,y:0,z:0}),owner=new CityRubbleOwner(RAPIER,world,cityFractureCatalog),factory=new Group();const materials=['modular_factory_facade_brick','modular_factory_facade_garage'].map(name=>{const m=new MeshStandardMaterial();m.name=name;factory.add(new Mesh(undefined,m));return m;});
 // CPU material fixtures exercise batch transforms/UVs only, not shipping texture qualification.
 const local={...district,blocks:[block],structures:[{id:block.structureId!,buildingId:block.buildingId,maxHp:100,cells:[block]}]},renderer=new CityFractureRenderer(local,cityFractureCatalog,factory,null);
 try{owner.spawn(block,0,{x:0,y:0,z:0});const states=owner.snapshot(),asset=cityFractureAssetFor(block,cityFractureCatalog),handles=[...owner.colliderHandles()],size={x:block.halfExtents[0]*2,y:block.halfExtents[1]*2,z:block.halfExtents[2]*2};let minGap=Infinity,maxExpansion=0;
 renderer.updateRubble(states,0);const matrices:Matrix4[]=[];for(const batch of renderer.group.children as BatchedMesh[])for(let i=0;i<48;i++)if(batch.getVisibleAt(i)){const m=new Matrix4();batch.getMatrixAt(i,m);matrices.push(m);}expect(matrices).toHaveLength(8);
 for(let k=0;k<8;k++){const p=asset.pieces[k],state=states[k],expected=new Matrix4().compose(new Vector3().copy(state.position),new Quaternion().copy(state.rotation),new Vector3(1,1,1));matrices[k].elements.forEach((v,i)=>expect(v).toBeCloseTo(expected.elements[i],5));const center=cityFractureCenter(block,p);for(const axis of ['x','y','z'] as const)expect(state.position[axis]).toBeCloseTo(center[axis],4);const geometry=buildCityFractureGeometry(p,size,block.material==='brick'?2:4),hull=(world.getCollider(handles[k]).shape as RAPIER.ConvexPolyhedron).vertices;
 try{for(let i=0;i<p.indices.length;i++){const index=p.indices[i],normal=new Vector3(...p.normals.slice(index*3,index*3+3) as [number,number,number]),physicalNormal=new Vector3(normal.x/size.x,normal.y/size.y,normal.z/size.z).normalize(),actual=new Vector3().fromBufferAttribute(geometry.attributes.normal,i);expect(actual.dot(physicalNormal)).toBeCloseTo(1,5);const uv=cityFractureTextureUV({x:p.positions[index*3]+p.center[0],y:p.positions[index*3+1]+p.center[1],z:p.positions[index*3+2]+p.center[2]},{x:normal.x,y:normal.y,z:normal.z},size,block.material==='brick'?2:4);expect(geometry.attributes.uv.getX(i)).toBeCloseTo(uv[0],5);expect(geometry.attributes.uv.getY(i)).toBeCloseTo(uv[1],5);}
 for(let i=0;i<p.indices.length;i+=3){const [a,b,c]=p.indices.slice(i,i+3).map(j=>new Vector3(p.positions[j*3]*size.x,p.positions[j*3+1]*size.y,p.positions[j*3+2]*size.z)),n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();for(let j=0;j<hull.length;j+=3)maxExpansion=Math.max(maxExpansion,n.dot(new Vector3(hull[j],hull[j+1],hull[j+2]).sub(a)));}}
 finally{geometry.dispose();}for(let j=k+1;j<8;j++){const hit=world.getCollider(handles[k]).contactCollider(world.getCollider(handles[j]),.01);if(hit)minGap=Math.min(minGap,hit.distance);}}
 expect(minGap).toBeGreaterThanOrEqual(-1e-4);rows.push({id:block.id,template:asset.template,minGap,maxExpansion});
 }finally{renderer.dispose();owner.dispose();materials.forEach(m=>m.dispose());world.free();}}
 if(process.env.CITY_FRACTURE_CATALOG_MEASUREMENTS)writeFileSync(process.env.CITY_FRACTURE_CATALOG_MEASUREMENTS,JSON.stringify(rows,null,2));
});
