import {beforeAll,expect,it,vi} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {CharacterRubbleImpulseBudget,applyCharacterRubbleImpulses} from '../shared/characterRubbleImpulse';

beforeAll(async()=>{await RAPIER.init();});
type Owned={id:string;body:RAPIER.RigidBody;collider:RAPIER.Collider};
const length2=(v:{x:number;y:number;z:number})=>v.x*v.x+v.y*v.y+v.z*v.z;
function fixture(run:(world:RAPIER.World)=>void){const world=new RAPIER.World({x:0,y:0,z:0});try{run(world);}finally{world.free();}}
function piece(world:RAPIER.World,id:string,x=0):Owned{
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,0,0));
 const collider=world.createCollider(RAPIER.ColliderDesc.cuboid(.5,.4,.2).setDensity(300),body);
 body.recomputeMassPropertiesFromColliders();return{id,body,collider};
}
const contact=(p:Owned,point={x:p.body.translation().x-.5,y:0,z:0},normal={x:-1,y:0,z:0},remainingVelocity={x:6,y:0,z:0})=>({colliderHandle:p.collider.handle,point,normal,remainingVelocity});
// These energy fixtures never step or rotate the native body: its local principal
// axes remain world-aligned, so the actual native principal inertia is sufficient.
function energy(p:Owned){const v=p.body.linvel(),a=p.body.angvel(),i=p.body.principalInertia();return .5*p.body.mass()*length2(v)+.5*(i.x*a.x*a.x+i.y*a.y*a.y+i.z*a.z*a.z);}
function rotate(v:{x:number;y:number;z:number},q:{x:number;y:number;z:number;w:number}){
 const tx=2*(q.y*v.z-q.z*v.y),ty=2*(q.z*v.x-q.x*v.z),tz=2*(q.x*v.y-q.y*v.x);
 return{x:v.x+q.w*tx+q.y*tz-q.z*ty,y:v.y+q.w*ty+q.z*tx-q.x*tz,z:v.z+q.w*tz+q.x*ty-q.y*tx};
}
function rotatedEnergy(p:Owned){
 const q=p.body.rotation(),f=p.body.principalInertiaLocalFrame();
 // World orientation of native principal axes = body rotation * local frame.
 const axes={x:q.w*f.x+q.x*f.w+q.y*f.z-q.z*f.y,y:q.w*f.y-q.x*f.z+q.y*f.w+q.z*f.x,z:q.w*f.z+q.x*f.y-q.y*f.x+q.z*f.w,w:q.w*f.w-q.x*f.x-q.y*f.y-q.z*f.z};
 const a=rotate(p.body.angvel(),{x:-axes.x,y:-axes.y,z:-axes.z,w:axes.w}),i=p.body.principalInertia();
 return .5*p.body.mass()*length2(p.body.linvel())+.5*(i.x*a.x*a.x+i.y*a.y*a.y+i.z*a.z*a.z);
}

it('responds equivalently to clean native-order002 target contacts in every creation order',()=>{
 const results:{movement:unknown;hits:unknown;velocity:unknown;work:number}[]=[];
 for(const order of [['target'],['target','corner'],['corner','target']])fixture(w=>{
  const actor=w.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.4,0));
  const hull=w.createCollider(RAPIER.ColliderDesc.roundCylinder(.35,.38,.02),actor);
  const owned:Owned[]=[];for(const id of order){const body=w.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(id==='target'?.92:.53,.4,id==='target'?0:.53));const collider=w.createCollider(id==='target'?RAPIER.ColliderDesc.cuboid(.5,.4,.2):RAPIER.ColliderDesc.cuboid(.1,.4,.1),body);owned.push({id,body,collider});}
  const k=w.createCharacterController(.02);k.setApplyImpulsesToDynamicBodies(false);k.setCharacterMass(1800);k.disableAutostep();k.disableSnapToGround();w.step();
  k.computeColliderMovement(hull,{x:.1,y:0,z:0});
  const contacts=[];for(let j=0;j<k.numComputedCollisions();j++){const h=k.computedCollision(j)!;if(h.collider)contacts.push({colliderHandle:h.collider.handle,point:{...h.witness1},normal:{...h.normal1},remainingVelocity:{x:h.translationDeltaRemaining.x/w.timestep,y:h.translationDeltaRemaining.y/w.timestep,z:h.translationDeltaRemaining.z/w.timestep}});}
  expect(contacts.some(c=>c.colliderHandle===owned.find(p=>p.id==='target')!.collider.handle)).toBe(true);
  const receipt=applyCharacterRubbleImpulses(contacts,owned,new CharacterRubbleImpulseBudget(1800,{x:6,y:0,z:0}));
  const target=owned.find(p=>p.id==='target')!;expect(target.body.linvel().x).toBeGreaterThan(0);
  results.push({movement:k.computedMovement(),hits:contacts.map(c=>({id:owned.find(p=>p.collider.handle===c.colliderHandle)!.id,point:c.point,normal:c.normal})),velocity:target.body.linvel(),work:receipt.bodyWork});
 });
 expect(results[1]).toEqual(results[0]);expect(results[2]).toEqual(results[0]);
});

it('deduplicates repeated contacts and orders distinct bodies by semantic ownership rather than native handles',()=>{
 const run=(reverse:boolean,duplicate:boolean)=>{let result:unknown;fixture(w=>{const owned=(reverse?['b','a']:['a','b']).map((id,i)=>piece(w,id,i*3));const contacts=owned.map(p=>contact(p));const receipt=applyCharacterRubbleImpulses(duplicate?[...contacts,...contacts]:contacts,owned,new CharacterRubbleImpulseBudget(1800,{x:6,y:0,z:0}));result={rows:receipt.rows.map(r=>({id:r.id,impulse:r.impulse,bodyWork:r.bodyWork})),actor:receipt.actorVelocity};});return result;};
 expect(run(false,true)).toEqual(run(false,false));expect(run(true,true)).toEqual(run(false,false));
});

it('accounts for actual moving and angular target cross-term work at an oblique witness',()=>fixture(w=>{
 const p=piece(w,'moving');p.body.setLinvel({x:1,y:.5,z:0},true);p.body.setAngvel({x:0,y:0,z:.7},true);
 const before=energy(p),budget=new CharacterRubbleImpulseBudget(1800,{x:6,y:2,z:0});
 const receipt=applyCharacterRubbleImpulses([contact(p,{x:-.5,y:.25,z:0},{x:-.8,y:-.6,z:0},{x:6,y:2,z:0})],[p],budget);
 expect(receipt.rows).toHaveLength(1);expect(receipt.bodyWork).toBeCloseTo(energy(p)-before,3);
 const actorLoss=.5*1800*(40-length2(receipt.actorVelocity));
 expect(receipt.actorWork).toBeCloseTo(actorLoss,3);expect(receipt.dissipated).toBeGreaterThanOrEqual(-1e-3);
 expect(receipt.actorWork-receipt.bodyWork).toBeCloseTo(receipt.dissipated,3);
}));

it('does not kick a receding target',()=>fixture(w=>{
 const p=piece(w,'receding');p.body.setLinvel({x:8,y:0,z:0},true);
 const receipt=applyCharacterRubbleImpulses([contact(p)],[p],new CharacterRubbleImpulseBudget(1800,{x:6,y:0,z:0}));
 expect(p.body.linvel()).toEqual({x:8,y:0,z:0});expect(receipt.bodyWork).toBe(0);expect(receipt.actorWork).toBe(0);
}));

it('balances signed negative work for an approaching rotated anisotropic target at its actual projected witness',()=>fixture(w=>{
 const angle=.73,axis={x:1/Math.sqrt(14),y:2/Math.sqrt(14),z:3/Math.sqrt(14)},s=Math.sin(angle/2);
 const body=w.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setRotation({x:axis.x*s,y:axis.y*s,z:axis.z*s,w:Math.cos(angle/2)}));
 const collider=w.createCollider(RAPIER.ColliderDesc.cuboid(.8,.3,.12).setDensity(300),body),p={id:'rotated',body,collider};body.recomputeMassPropertiesFromColliders();
 body.setLinvel({x:-8,y:.4,z:-.2},true);body.setAngvel({x:.7,y:-.5,z:.9},true);
 const projection=collider.projectPoint({x:-2,y:.18,z:.15},false);if(!projection)throw Error('Native fixture projection missing');const point={...projection.point},before=rotatedEnergy(p);
 const receipt=applyCharacterRubbleImpulses([contact(p,point,{x:-1,y:0,z:0},{x:6,y:0,z:0})],[p],new CharacterRubbleImpulseBudget(1800,{x:6,y:0,z:0}));
 expect(receipt.rows).toHaveLength(1);expect(receipt.bodyWork).toBeLessThan(0);
 // Native float32 impulse updates are compared with independently transformed
 // principal-axis energy, not the helper's world inverse-inertia calculation.
 expect(Math.abs(receipt.bodyWork-(rotatedEnergy(p)-before))).toBeLessThan(.01);
 expect(receipt.actorWork-receipt.bodyWork).toBeCloseTo(receipt.dissipated,6);expect(receipt.dissipated).toBeGreaterThan(0);
}));

it('does not restore a blocked component when the actual remaining path is zero or nonclosing',()=>{
 for(const remaining of [{x:0,y:0,z:0},{x:0,y:0,z:6},{x:-1,y:0,z:0}])fixture(w=>{
  const p=piece(w,'blocked');const receipt=applyCharacterRubbleImpulses([contact(p,undefined,undefined,remaining)],[p],new CharacterRubbleImpulseBudget(1800,{x:6,y:0,z:0}));
  expect(receipt.rows).toHaveLength(0);expect(p.body.linvel()).toEqual({x:0,y:0,z:0});expect(receipt.actorVelocity).toEqual({x:6,y:0,z:0});
 });
});

it('uses actual remaining KCC slide motion after a static wall removes the original x component',()=>fixture(w=>{
 const actor=w.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.4,0));
 const hull=w.createCollider(RAPIER.ColliderDesc.roundCylinder(.35,.38,.02),actor);
 const wall=w.createCollider(RAPIER.ColliderDesc.cuboid(.1,.5,3).setTranslation(.65,.4,0));
 const body=w.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(.1,.4,1.4));
 const collider=w.createCollider(RAPIER.ColliderDesc.cuboid(.5,.4,.2).setDensity(300),body),target={id:'slide-target',body,collider};
 const k=w.createCharacterController(.02);k.setApplyImpulsesToDynamicBodies(false);k.disableAutostep();k.disableSnapToGround();w.step();
 k.computeColliderMovement(hull,{x:.4,y:0,z:1.2});
 const hits=[];for(let j=0;j<k.numComputedCollisions();j++){const h=k.computedCollision(j)!;if(h.collider)hits.push({colliderHandle:h.collider.handle,point:{...h.witness1},normal:{...h.normal1},remainingVelocity:{x:h.translationDeltaRemaining.x/w.timestep,y:h.translationDeltaRemaining.y/w.timestep,z:h.translationDeltaRemaining.z/w.timestep}});}
 const wallIndex=hits.findIndex(h=>h.colliderHandle===wall.handle),targetIndex=hits.findIndex(h=>h.colliderHandle===collider.handle);
 expect(wallIndex).toBeGreaterThanOrEqual(0);expect(targetIndex).toBeGreaterThan(wallIndex);
  const hit=hits[targetIndex];expect(Math.abs(hit.remainingVelocity.x)).toBeLessThan(.02);expect(hit.remainingVelocity.z).toBeGreaterThan(0);
 const norm=Math.hypot(hit.normal.x,hit.normal.y,hit.normal.z),direction={x:-hit.normal.x/norm,y:-hit.normal.y/norm,z:-hit.normal.z/norm};
 const com=body.worldCom(),arm={x:hit.point.x-com.x,y:hit.point.y-com.y,z:hit.point.z-com.z};
 const moment={x:arm.y*direction.z-arm.z*direction.y,y:arm.z*direction.x-arm.x*direction.z,z:arm.x*direction.y-arm.y*direction.x};
 // The fixture body is unrotated. Independently use its native principal
 // inertia, including the off-center witness torque, rather than helper math.
 const inertia=body.principalInertia(),pointVelocity=body.velocityAtPoint(hit.point);
 const inverseMass=1/1800+1/body.mass()+moment.x*moment.x/inertia.x+moment.y*moment.y/inertia.y+moment.z*moment.z/inertia.z;
 const closing=(v:{x:number;y:number;z:number})=>(v.x-pointVelocity.x)*direction.x+(v.y-pointVelocity.y)*direction.y+(v.z-pointVelocity.z)*direction.z;
 const requestedClosing=closing({x:24,y:0,z:72}),remainingClosing=closing(hit.remainingVelocity);
 const expectedJ=Math.max(0,Math.min(requestedClosing,remainingClosing))/inverseMass;
 expect(remainingClosing).toBeGreaterThan(0);expect(requestedClosing/inverseMass).toBeGreaterThan(expectedJ);
  const receipt=applyCharacterRubbleImpulses(hits,[target],new CharacterRubbleImpulseBudget(1800,{x:24,y:0,z:72}));
  expect(receipt.rows).toHaveLength(1);expect(body.linvel().z).toBeGreaterThan(0);
 // Small X impulse is legitimate when the actual target normal has X.
 // Its magnitude must use remaining motion, not recharge the original command.
 const impulse=receipt.rows[0].impulse,magnitude=Math.hypot(impulse.x,impulse.y,impulse.z);
 // Rapier exposes float32 principal inertia and float32 world inverse inertia
 // through separate accessors. Their reciprocal calculation is not bit-exact.
 const nativeInertiaTolerance=1e-6*Math.max(1,expectedJ);
 expect(Math.abs(magnitude-expectedJ)).toBeLessThan(nativeInertiaTolerance);
 for(const axis of ['x','y','z'] as const)expect(Math.abs(impulse[axis]-direction[axis]*expectedJ)).toBeLessThan(nativeInertiaTolerance);
 expect(receipt.actorWork-receipt.bodyWork).toBeCloseTo(receipt.dissipated,6);
}));

it('shares one actor-tick reaction budget across calls instead of recharging per target',()=>fixture(w=>{
 const a=piece(w,'a'),b=piece(w,'b',3),budget=new CharacterRubbleImpulseBudget(1800,{x:6,y:0,z:0});
 const first=applyCharacterRubbleImpulses([contact(a)],[a,b],budget),second=applyCharacterRubbleImpulses([contact(b)],[a,b],budget);
 expect(second.actorVelocity.x).toBeLessThan(first.actorVelocity.x);expect(second.rows[0].impulse.x).toBeLessThan(first.rows[0].impulse.x);
 expect(first.actorWork+second.actorWork).toBeCloseTo(.5*1800*(36-length2(second.actorVelocity)),3);
 expect(first.bodyWork+second.bodyWork).toBeLessThanOrEqual(.5*1800*36);
}));

it('leaves foreign contacts untouched and rejects mismatched native owner bindings',()=>fixture(w=>{
 const own=piece(w,'own'),foreign=piece(w,'foreign',3);
 const receipt=applyCharacterRubbleImpulses([contact(foreign)],[own],new CharacterRubbleImpulseBudget(1800,{x:6,y:0,z:0}));
 expect(receipt.rows).toHaveLength(0);expect(foreign.body.linvel()).toEqual({x:0,y:0,z:0});
 expect(()=>applyCharacterRubbleImpulses([contact(foreign)],[{...own,collider:foreign.collider}],new CharacterRubbleImpulseBudget(1800,{x:6,y:0,z:0}))).toThrow();
 expect(own.body.linvel()).toEqual({x:0,y:0,z:0});expect(foreign.body.linvel()).toEqual({x:0,y:0,z:0});
}));

it('propagates a native getter failure without fabricating response',()=>fixture(w=>{
 const p=piece(w,'fault');const spy=vi.spyOn(p.body,'mass').mockImplementation(()=>{throw Error('native mass fault');});
 try{expect(()=>applyCharacterRubbleImpulses([contact(p)],[p],new CharacterRubbleImpulseBudget(1800,{x:6,y:0,z:0}))).toThrow('native mass fault');expect(p.body.linvel()).toEqual({x:0,y:0,z:0});}finally{spy.mockRestore();}
}));
