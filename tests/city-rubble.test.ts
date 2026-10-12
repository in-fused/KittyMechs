import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import asset from '../shared/data/city-fracture-v1.json';
import {CityRubbleOwner,CITY_RUBBLE_LIFETIME,MAX_CITY_RUBBLE_BODIES} from '../shared/cityRubble';
import {cityDistrict,type CityBlock} from '../shared/cityDistrict';
import {writeFileSync} from 'node:fs';
beforeAll(async()=>{await RAPIER.init();});
const block=(id='panel',x=0):CityBlock=>({id,buildingId:'building',part:'cell',position:[x,3,0],halfExtents:[1,1,.15],yaw:.4,material:'brick'});
function fixture(test:(w:RAPIER.World,o:CityRubbleOwner)=>void){const world=new RAPIER.World({x:0,y:-22,z:0}),owner=new CityRubbleOwner(RAPIER,world,asset);try{test(world,owner);}finally{try{owner.dispose();}finally{world.free();}}}
it('creates exactly eight dynamic owned source-sized hulls with no initial physical overlap',()=>fixture((w,o)=>{
 const source=block();o.spawn(source,0,{x:0,y:0,z:0});expect(o.bodyCount).toBe(8);const handles=[...o.colliderHandles()],states=o.snapshot();expect(states.map(s=>s.id)).toHaveLength(8);
 for(const h of handles){const c=w.getCollider(h),b=c.parent()!;expect(b.bodyType()).toBe(RAPIER.RigidBodyType.Dynamic);expect(b.isCcdEnabled()).toBe(true);expect(c.density()).toBe(300);const vertices=(c.shape as RAPIER.ConvexPolyhedron).vertices;expect(vertices.every(Number.isFinite)).toBe(true);expect(b.linvel()).toEqual({x:0,y:.25,z:0});}
 for(let i=0;i<handles.length;i++)for(let j=i+1;j<handles.length;j++){const contact=w.getCollider(handles[i]).contactCollider(w.getCollider(handles[j]),.01);if(contact)expect(contact.distance).toBeGreaterThanOrEqual(-1e-4);}
 // Hull vertex extents reconstructed via actual source yaw and piece centers.
 const local=[];for(let i=0;i<handles.length;i++){const c=w.getCollider(handles[i]),v=(c.shape as RAPIER.ConvexPolyhedron).vertices,p=asset.pieces[i];for(let j=0;j<v.length;j+=3)local.push([v[j]+p.center[0]*2,v[j+1]+p.center[1]*2,v[j+2]+p.center[2]*.3]);}
 for(let axis=0;axis<3;axis++){expect(Math.min(...local.map(v=>v[axis]))).toBeCloseTo(-source.halfExtents[axis],5);expect(Math.max(...local.map(v=>v[axis]))).toBeCloseTo(source.halfExtents[axis],5);}
}));
it('settles on native floor and a real KCC pushes dynamic rubble with configured mass',()=>fixture((w,o)=>{
 const floor=w.createCollider(RAPIER.ColliderDesc.cuboid(20,.5,20).setTranslation(0,-.5,0));o.spawn(block(),0,{x:0,y:0,z:0});w.timestep=1/60;for(let i=0;i<360;i++)w.step();const handles=[...o.colliderHandles()];expect(handles.some(h=>!!w.getCollider(h).contactCollider(floor,.05))).toBe(true);for(const s of o.snapshot()){expect(s.position.y).toBeGreaterThan(-.1);expect(Object.values(s.position).every(Number.isFinite)).toBe(true);}
 const body=w.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-4,.8,0)),collider=w.createCollider(RAPIER.ColliderDesc.capsule(.4,.4),body),controller=w.createCharacterController(.02);controller.setCharacterMass(1800);controller.setApplyImpulsesToDynamicBodies(true);w.step();const before=o.snapshot();let hits=0;
 for(let i=0;i<120;i++){controller.computeColliderMovement(collider,{x:.06,y:-.006,z:0},undefined,undefined,c=>c.handle!==collider.handle);for(let j=0;j<controller.numComputedCollisions();j++)if(o.colliderHandles().has(controller.computedCollision(j)!.collider!.handle))hits++;const m=controller.computedMovement(),at=body.translation();body.setNextKinematicTranslation({x:at.x+m.x,y:at.y+m.y,z:at.z+m.z});w.step();}
 expect(hits).toBeGreaterThan(0);expect(o.snapshot().some((s,i)=>s.position.x-before[i].position.x>.05)).toBe(true);expect(body.translation().x).toBeGreaterThan(-2);w.removeRigidBody(body);
}));
it('evicts complete oldest groups at total cap, expires exactly and never respawns canonical blocks',()=>fixture((w,o)=>{
 const foreign=w.createRigidBody(RAPIER.RigidBodyDesc.fixed());w.createCollider(RAPIER.ColliderDesc.ball(1),foreign);
 for(let i=0;i<4;i++)o.spawn(block(`b${i}`,i*4),i,{x:0,y:0,z:0});expect(o.bodyCount).toBe(MAX_CITY_RUBBLE_BODIES);expect(new Set(o.snapshot().map(s=>s.blockId))).toEqual(new Set(['b1','b2','b3']));o.spawn(block('b0'),5,{x:0,y:0,z:0});expect(o.bodyCount).toBe(24);o.expire(1+CITY_RUBBLE_LIFETIME);expect(o.bodyCount).toBe(16);o.expire(20);expect(o.bodyCount).toBe(0);o.spawn(block('b1'),21,{x:0,y:0,z:0});expect(o.bodyCount).toBe(0);o.dispose();expect(w.getRigidBody(foreign.handle)).toBe(foreign);expect(w.bodies.len()).toBe(1);
}));
it('transactional collider construction failure cleans all staged bodies and poisons owner',()=>fixture((w,o)=>{
 const foreign=w.createRigidBody(RAPIER.RigidBodyDesc.fixed()),create=w.createCollider.bind(w);let calls=0;w.createCollider=(...args)=>{if(++calls===4)throw Error('construction fault');return create(...args);};expect(()=>o.spawn(block(),0,{x:0,y:0,z:0})).toThrow('construction fault');expect(w.bodies.len()).toBe(1);expect(w.getRigidBody(foreign.handle)).toBe(foreign);expect(()=>o.snapshot()).toThrow('failed');expect(()=>o.spawn(block('later'),1,{x:0,y:0,z:0})).toThrow('failed');
}));
it('removal failure attempts every body, retains failed residual ownership and allows cleanup',()=>fixture((w,o)=>{
 o.spawn(block(),0,{x:0,y:0,z:0});const remove=w.removeRigidBody.bind(w);let calls=0;w.removeRigidBody=b=>{calls++;if(calls===1)throw Error('removal fault');remove(b);};expect(()=>o.expire(8)).toThrow('removal fault');expect(calls).toBe(8);expect(w.bodies.len()).toBe(1);expect(()=>o.snapshot()).toThrow('failed');o.dispose();expect(w.bodies.len()).toBe(0);
}));

it('poisons snapshot getter failure and still cleans every remaining native piece',()=>fixture((w,o)=>{
 o.spawn(block(),0,{x:0,y:0,z:0});const body=w.getCollider([...o.colliderHandles()][0]).parent()!;body.translation=()=>{throw Error('snapshot getter fault');};expect(()=>o.snapshot()).toThrow('snapshot getter fault');expect(()=>o.colliderHandles()).toThrow('failed');o.dispose();expect(w.bodies.len()).toBe(0);
}));
it('rejects externally lost ownership without silently publishing a partial group',()=>fixture((w,o)=>{
 o.spawn(block(),0,{x:0,y:0,z:0});w.removeRigidBody(w.getCollider([...o.colliderHandles()][0]).parent()!);expect(()=>o.snapshot()).toThrow('Lost native');expect(()=>o.colliderHandles()).toThrow('failed');o.dispose();expect(w.bodies.len()).toBe(0);
}));
for(const invalid of ['position','rotation'])it(`rejects invalid native ${invalid} and cleans all ownership`,()=>fixture((w,o)=>{
 o.spawn(block(),0,{x:0,y:0,z:0});const b=w.getCollider([...o.colliderHandles()][0]).parent()!;if(invalid==='position')b.translation=()=>({x:10000,y:0,z:0});else b.rotation=()=>({x:0,y:0,z:0,w:1.002});expect(()=>o.snapshot()).toThrow('Invalid native');o.dispose();expect(w.bodies.len()).toBe(0);
}));
it('applies actual normalized ±unit incoming velocity with independent upward velocity',()=>fixture((w,o)=>{
 for(const sign of [-1,1]){o.spawn(block(`direction${sign}`,sign*5),0,{x:sign,y:0,z:0});for(const state of o.snapshot().filter(s=>s.blockId===`direction${sign}`)){const handle=[...o.colliderHandles()].find(h=>w.getCollider(h).parent()!.translation().x===state.position.x)!;expect(w.getCollider(handle).parent()!.linvel()).toEqual({x:sign,y:.25,z:0});}}
}));
it('measures fixed-source approximate hull penetration and face-plane expansion on four actual Rainline cells',()=>{
 const district=cityDistrict(7734)!,facades=district.blocks.filter(b=>b.id.includes(':panel-')),largest=[...facades].sort((a,b)=>b.halfExtents.reduce((s,x)=>s*x,1)-a.halfExtents.reduce((s,x)=>s*x,1))[0],sources=[facades[0],largest,district.blocks.find(b=>b.id.includes(':support-'))!,district.blocks.find(b=>b.part==='deck')!],rows:{blockId:string;halfExtents:number[];minSignedGap:number;maxOutwardFacePlaneResidualMeters:number;scope:string}[]=[];
 for(const source of sources)fixture((w,o)=>{o.spawn(source,0,{x:0,y:0,z:0});const handles=[...o.colliderHandles()];let minGap=Infinity,maxExpansion=0;
 for(let i=0;i<handles.length;i++){const c=w.getCollider(handles[i]),hull=(c.shape as RAPIER.ConvexPolyhedron).vertices,p=asset.pieces[i],scale=source.halfExtents.map(x=>x*2);
 for(let j=0;j<p.indices.length;j+=3){const tri=p.indices.slice(j,j+3).map(k=>[0,1,2].map(a=>p.positions[k*3+a]*scale[a])),[a,b,d]=tri,u=b.map((x,k)=>x-a[k]),v=d.map((x,k)=>x-a[k]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);if(!length)continue;for(let k=0;k<hull.length;k+=3){const residual=n.reduce((sum,x,axis)=>sum+x*(hull[k+axis]-a[axis]),0)/length;maxExpansion=Math.max(maxExpansion,residual);}}
 for(let j=i+1;j<handles.length;j++){const hit=c.contactCollider(w.getCollider(handles[j]),.01);if(hit)minGap=Math.min(minGap,hit.distance);}}
 expect(minGap).toBeGreaterThanOrEqual(-1e-4);expect(Number.isFinite(maxExpansion)).toBe(true);rows.push({blockId:source.id,halfExtents:source.halfExtents,minSignedGap:minGap,maxOutwardFacePlaneResidualMeters:maxExpansion,scope:'Native convex approximation residual, not exact boundary equivalence; declared normalized source residual28.88micrometers'});
 });
 const destination=process.env.CITY_RUBBLE_MEASUREMENTS;if(destination)writeFileSync(destination,JSON.stringify(rows,null,2));
});

it('retains construction primary error, cleans all staged bodies despite cleanup getter faults and poisons owner',()=>fixture((w,o)=>{
 const create=w.createCollider.bind(w),get=w.getRigidBody.bind(w),remove=w.removeRigidBody.bind(w),primary=Error('construction primary'),getter=Error('cleanup getter');let creates=0,attempts=0;
 w.createCollider=(...args)=>{if(++creates===4){w.getRigidBody=()=>{throw getter;};throw primary;}return create(...args);};w.removeRigidBody=body=>{attempts++;remove(body);};
 let caught:unknown;try{o.spawn(block(),0,{x:0,y:0,z:0});}catch(e){caught=e;}expect(caught).toBeInstanceOf(AggregateError);expect((caught as AggregateError).errors[0]).toBe(primary);expect((caught as AggregateError).errors).toContain(getter);expect(attempts).toBe(4);expect(w.bodies.len()).toBe(0);expect(()=>o.snapshot()).toThrow('failed');w.getRigidBody=get;o.dispose();expect(w.bodies.len()).toBe(0);
}));
it('dispose getter faults still attempt all eight removals and retain uncertain residuals for cleanup retry',()=>fixture((w,o)=>{
 o.spawn(block(),0,{x:0,y:0,z:0});const get=w.getRigidBody.bind(w),remove=w.removeRigidBody.bind(w),getter=Error('dispose getter'),removal=Error('dispose removal');let attempts=0;
 w.getRigidBody=()=>{throw getter;};w.removeRigidBody=body=>{attempts++;if(attempts===1)throw removal;remove(body);};let caught:unknown;try{o.dispose();}catch(e){caught=e;}expect(caught).toBeInstanceOf(AggregateError);expect((caught as AggregateError).errors).toContain(getter);expect((caught as AggregateError).errors).toContain(removal);expect(attempts).toBe(8);expect(w.bodies.len()).toBe(1);expect(()=>o.snapshot()).toThrow('failed');w.getRigidBody=get;w.removeRigidBody=remove;o.dispose();expect(w.bodies.len()).toBe(0);
}));
