import {beforeAll, expect, it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {createHash} from 'node:crypto';
import asset from '../shared/data/city-fracture-v1.json';
import {cityDistrict,type CityBlock} from '../shared/cityDistrict';
beforeAll(async()=>{await RAPIER.init();});
const pieces=asset.pieces;
const district=cityDistrict(7734)!;
function points(block:CityBlock,p:typeof pieces[number]){const c=Math.cos(block.yaw),s=Math.sin(block.yaw);return Array.from({length:p.positions.length/3},(_,i)=>{const x=(p.positions[i*3]+p.center[0])*block.halfExtents[0]*2,y=(p.positions[i*3+1]+p.center[1])*block.halfExtents[1]*2,z=(p.positions[i*3+2]+p.center[2])*block.halfExtents[2]*2;return{x:x*c+z*s,y,z:-x*s+z*c};});}
it('binds canonical eight-piece source provenance and exact content hash',()=>{
 const {contentSha256,...payload}=asset;expect(createHash('sha256').update(JSON.stringify(payload)).digest('hex')).toBe(contentSha256);expect(asset.seed).toBe(1926);expect(asset.fragmentCount).toBe(8);expect(pieces).toHaveLength(8);expect(asset.source.version).toBe('2.0.1');expect(asset.source.license).toBe('MIT');expect(asset.source.patchManifest.changes).toHaveLength(3);
 expect(pieces.reduce((s,p)=>s+p.volume,0)).toBeCloseTo(1,5);
 for(const p of pieces){expect(p.positions.length).toBeLessThan(10000);expect(p.positions.every(Number.isFinite)).toBe(true);expect(p.normals.length).toBe(p.positions.length);expect(p.uv.length).toBe(p.positions.length/3*2);expect(p.indices.length%3).toBe(0);expect(p.indices.every(i=>Number.isInteger(i)&&i>=0&&i<p.positions.length/3)).toBe(true);expect(p.volume).toBeGreaterThan(0);expect(p.groups.map(g=>g.materialIndex).sort()).toEqual([0,1]);}
});
it('has closed oriented source triangles without filling holes or changing weld precision',()=>{
 for(const p of pieces){const edges=new Map<string,{count:number;direction:number}>();let volume=0;const at=(i:number)=>p.positions.slice(i*3,i*3+3),key=(v:number[])=>v.map(x=>Math.round(x*1e6)).join(',');
 for(let i=0;i<p.indices.length;i+=3){const [a,b,c]=p.indices.slice(i,i+3).map(at);volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
 for(const [u,v]of [[a,b],[b,c],[c,a]]){const x=key(u),y=key(v),k=[x,y].sort().join('|'),e=edges.get(k)??{count:0,direction:0};e.count++;e.direction+=x<y?1:-1;edges.set(k,e);}}
 expect([...edges.values()].every(e=>e.count===2&&e.direction===0)).toBe(true);expect(volume).toBeGreaterThan(0);expect(volume).toBeCloseTo(p.volume,10);}
});
it('reconstructs actual city source box bounds and volumes for every nonfixture block',()=>{
 const blocks=district.blocks.filter(b=>b.part!=='fixture');expect(blocks.length).toBeGreaterThan(100);
 for(const b of blocks){const vertices=pieces.flatMap(p=>points(b,p));for(let j=0;j<3;j++){const values=vertices.map(v=>[v.x,v.y,v.z][j]);expect(Math.min(...values)).toBeCloseTo(-b.halfExtents[j],5);expect(Math.max(...values)).toBeCloseTo(b.halfExtents[j],5);}const determinant=b.halfExtents.reduce((s,x)=>s*x*2,1);expect(pieces.reduce((s,p)=>s+p.volume*determinant,0)).toBeCloseTo(determinant,4);}
});
it('creates matching native convex fragment hulls and finite ray witnesses for actual first/largest facade, support and deck',()=>{
 const facades=district.blocks.filter(b=>b.id.includes(':panel-')),largest=[...facades].sort((a,b)=>b.halfExtents.reduce((s,x)=>s*x,1)-a.halfExtents.reduce((s,x)=>s*x,1))[0];const samples=[facades[0],largest,district.blocks.find(b=>b.id.includes(':support-'))!,district.blocks.find(b=>b.part==='deck')!];
 const world=new RAPIER.World({x:0,y:0,z:0});try{for(const b of samples)for(const p of pieces){const vertices=points(b,p),buffer=new Float32Array(vertices.flatMap(v=>[v.x,v.y,v.z]));const desc=RAPIER.ColliderDesc.convexHull(buffer);expect(desc).not.toBeNull();const body=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...b.position)),collider=world.createCollider(desc!,body);expect(collider.parent()?.handle).toBe(body.handle);
 const center=vertices.reduce((s,v)=>({x:s.x+v.x/vertices.length,y:s.y+v.y/vertices.length,z:s.z+v.z/vertices.length}),{x:0,y:0,z:0});const extent=Math.max(...b.halfExtents)*4;const ray=new RAPIER.Ray({x:b.position[0]+center.x+extent,y:b.position[1]+center.y,z:b.position[2]+center.z},{x:-1,y:0,z:0});const hit=collider.castRayAndGetNormal(ray,extent*2,true);expect(hit).not.toBeNull();expect(Number.isFinite(hit!.timeOfImpact)).toBe(true);expect(Object.values(hit!.normal).every(Number.isFinite)).toBe(true);world.removeRigidBody(body);}
 expect(world.bodies.len()).toBe(0);expect(world.colliders.len()).toBe(0);}finally{world.free();}
 // These standalone fixed hulls qualify buffer validity only, not dynamic rubble/support.
});
