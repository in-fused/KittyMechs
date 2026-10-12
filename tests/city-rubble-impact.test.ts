import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Quaternion,Vector3} from 'three';
import {CityRubbleOwner} from '../shared/cityRubble';
import {cityFractureCatalog} from '../shared/cityFractureCatalog';
import {cityDistrict,type CityBlock} from '../shared/cityDistrict';
import type {CityRubbleImpact,CityRubbleImpulseReceipt} from '../shared/cityRubbleImpact';
import {Simulation} from '../shared/simulation';
import {emptyInput} from '../shared/types';
import {parseInput} from '../shared/protocol';
beforeAll(async()=>{await RAPIER.init();});
const district=cityDistrict(7734)!;
const source=district.structures[0].cells[3];
const receipt=(owner:CityRubbleOwner)=>(owner as unknown as {groups:{impact:CityRubbleImpulseReceipt}[]}).groups[0].impact;
function run(block:CityBlock,impact:CityRubbleImpact){
  const world=new RAPIER.World({x:0,y:-22,z:0}),owner=new CityRubbleOwner(RAPIER,world,cityFractureCatalog);
  try{owner.spawn(block,0,impact.incoming,impact);const r=receipt(owner);let independentlyMeasuredEnergy=0;const momentum=new Vector3();
    for(const handle of owner.colliderHandles()){const body=world.getCollider(handle).parent()!,v=new Vector3().copy(body.linvel()),w=new Vector3().copy(body.angvel()),q=new Quaternion().copy(body.rotation()).multiply(new Quaternion().copy(body.principalInertiaLocalFrame())).invert(),localW=w.applyQuaternion(q),inertia=body.principalInertia();
      independentlyMeasuredEnergy+=.5*body.mass()*v.lengthSq()+.5*(inertia.x*localW.x**2+inertia.y*localW.y**2+inertia.z*localW.z**2);momentum.add(v.multiplyScalar(body.mass()));expect(body.isCcdEnabled()).toBe(true);
    }
    expect(independentlyMeasuredEnergy).toBeCloseTo(r.deliveredEnergy,1);expect(r.deliveredEnergy).toBeGreaterThan(0);expect(r.deliveredEnergy).toBeLessThanOrEqual(r.budget*1.0001);expect(momentum.distanceTo(new Vector3().copy(r.momentum))).toBeLessThan(.01);
    for(const row of r.pieces){expect(Math.hypot(...Object.values(row.velocity))).toBeLessThanOrEqual(20.0001);expect(Math.hypot(...Object.values(row.angularVelocity))).toBeLessThanOrEqual(20.0001);}
    return r;
  }finally{owner.dispose();world.free();}
}
it('uses reproducible localized native inertia, energy and momentum for both faces and off-center impacts',()=>{
  const b={...source,yaw:.47},c=Math.cos(b.yaw),s=Math.sin(b.yaw);
  for(const sign of [-1,1]){const impact:CityRubbleImpact={point:{x:b.position[0]+sign*b.halfExtents[0]*c,y:b.position[1]+b.halfExtents[1]-.08,z:b.position[2]-sign*b.halfExtents[0]*s+.12},incoming:{x:-sign*c,y:0,z:sign*s},normal:{x:sign*c,y:0,z:-sign*s},weapon:'pulse',strength:22};const a=run(b,impact),repeat=run(b,impact);expect(repeat).toEqual(a);expect(a.pieces.some(p=>p.weight===0)).toBe(true);expect(a.pieces.some(p=>Math.hypot(...Object.values(p.angularVelocity))>.1)).toBe(true);}
});
it('covers the tallest actual post and a slab with bounded wider rocket energy',()=>{
  const posts=district.structures.flatMap(s=>s.cells).filter(b=>b.id.includes(':support-')),post=posts.sort((a,b)=>b.halfExtents[1]-a.halfExtents[1])[0],slab=district.structures.flatMap(s=>s.cells).find(b=>b.part==='deck')!;
  for(const b of [post,slab])for(const offset of [0,2])run(b,{point:{x:b.position[0]+b.halfExtents[0]+offset,y:b.position[1]-b.halfExtents[1]+.2,z:b.position[2]+.1},incoming:{x:-1,y:0,z:0},normal:{x:1,y:0,z:0},weapon:'rocket',strength:offset?32:64});
});
it('poisons an impulse application fault and cleans all eight staged owned bodies',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),owner=new CityRubbleOwner(RAPIER,world,cityFractureCatalog),create=world.createRigidBody.bind(world);world.createRigidBody=(...args)=>{const body=create(...args);body.applyImpulseAtPoint=()=>{throw Error('impulse application fault');};return body;};
  try{expect(()=>owner.spawn(source,0,{x:-1,y:0,z:0},{point:{x:source.position[0]+source.halfExtents[0],y:source.position[1],z:source.position[2]},incoming:{x:-1,y:0,z:0},normal:{x:1,y:0,z:0},weapon:'pulse',strength:22})).toThrow('impulse application fault');expect(world.bodies.len()).toBe(0);expect(world.colliders.len()).toBe(0);expect(()=>owner.snapshot()).toThrow('failed');}finally{owner.dispose();world.free();}
});
it('preserves winning parsed pulse metadata and full strength across the final HP clamp and next-tick activation',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp','TRAINING',RAPIER,{experimentalPhysicalRubble:true}),a=sim.addActor('pilot','Pilot','pounce',false,{x:123,y:.92,z:source.position[2]});
  try{for(let i=0;i<60;i++)sim.step(1/60);for(let i=0;i<120&&sim.structures[0].hp[3]>0;i++){sim.setInput(a.id,parseInput({...emptyInput(),seq:sim.tick+1,fire:true,yaw:Math.PI/2})!);sim.step(1/60);}
    expect(sim.structures[0].hp[3]).toBe(0);const event=sim.events.filter(e=>e.type==='structure-break').at(-1)!;expect(event.amount).toBe(21);expect(sim.rubble).toHaveLength(0);
    sim.setInput(a.id,parseInput({...emptyInput(),seq:sim.tick+1,yaw:-Math.PI/2})!);sim.step(1/60);
    const r=receipt((sim as unknown as {rubbleOwner:CityRubbleOwner}).rubbleOwner);expect(r.impact.strength).toBe(22);expect(r.impact.point).toEqual(event.position);expect(r.impact.incoming).toEqual(event.incoming);expect(r.impact.normal).toEqual(event.normal);expect(r.impact.weapon).toBe('pulse');expect(sim.rubble).toHaveLength(8);
  }finally{sim.dispose();world.free();}
});
