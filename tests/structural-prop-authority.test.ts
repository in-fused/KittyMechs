import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {getMap} from '../shared/maps';
import {authoredPropId,chunkAt,generateChunk,type PropDescriptor} from '../shared/world';
import {isStructuralPropKind,structuralPropCollision} from '../shared/structuralPropCollision';
import {GuestCollisionTiles} from '../src/game/world/guestCollisionTiles';
import {registerBuildingContacts,ownsBuildingContact} from '../src/game/world/buildingContacts';
import {CityPresentation} from '../src/game/world/cityPresentation';
import {emptyInput} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
const propsFor=(seed:number)=>getMap(seed).props.flatMap(p=>generateChunk(seed,chunkAt(p.x),chunkAt(p.z)).props.filter(q=>q.id===authoredPropId(seed,p)&&isStructuralPropKind(q.kind)));
function ray(world:RAPIER.World,collider:RAPIER.Collider,prop:PropDescriptor,x:number,y:number){
  const c=Math.cos(prop.rotation),s=Math.sin(prop.rotation),z=-10;
  return world.castRay(new RAPIER.Ray({x:prop.x+(x*c+z*s)*prop.scale,y:prop.y+y*prop.scale,z:prop.z+(-x*s+z*c)*prop.scale},{x:s,y:0,z:c}),20*prop.scale,false,undefined,undefined,undefined,undefined,hit=>hit.handle===collider.handle);
}
describe('actual authority and guest structural meshes',()=>{
  for(const ownership of ['authority','guest'] as const)it(`${ownership}: rolls back a failed crane mesh and its body without retiring preceding supports or foreign objects`,()=>{
    const seed=7734,prop=propsFor(seed).find(p=>p.kind==='crane')!,cx=chunkAt(prop.x),cz=chunkAt(prop.z),world=new RAPIER.World({x:0,y:-22,z:0}),mesh=structuralPropCollision('crane',prop.scale);let failing=false,failures=0;
    const instrumented=new Proxy(world,{get(target,key){if(key==='createCollider')return (...args:Parameters<RAPIER.World['createCollider']>)=>{if(failing&&args[0].shape instanceof RAPIER.TriMesh&&args[0].shape.indices.length===mesh.indices.length){failures++;throw Error('exact crane admission failed');}return target.createCollider(...args);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
    const sim=ownership==='authority'?new Simulation(instrumented,seed,'pvp'):null,guest=ownership==='guest'?new GuestCollisionTiles(instrumented,seed,'pvp'):null;
    const sync=(x:number,z:number)=>{if(sim)sim.syncChunks([{x:x*64+32,y:1,z:z*64+32}]);else guest!.sync(x,z);},read=()=>sim?.buildingCollider(`${prop.id}:mesh`)??guest?.buildingCollider(`${prop.id}:mesh`);
    const foreign=world.createCollider(RAPIER.ColliderDesc.ball(.1).setTranslation(500,500,500));
    try{
      sync(cx+2,cz);const before:RAPIER.Collider[]=[];world.colliders.forEach(c=>before.push(c));const bodies=world.bodies.len(),count=world.colliders.len();expect(read()).toBeUndefined();failing=true;
      expect(()=>sync(cx+1,cz)).toThrow('exact crane admission failed');expect(failures).toBe(1);expect(world.bodies.len()).toBe(bodies);expect(world.colliders.len()).toBe(count);for(const c of before)expect(c.isValid()).toBe(true);expect(read()).toBeUndefined();expect(foreign.isValid()).toBe(true);
      failing=false;sync(cx+1,cz);const first=read()!;expect(first).toBeDefined();expect(first.isValid()).toBe(true);sync(cx+8,cz+8);expect(first.isValid()).toBe(false);expect(read()).toBeUndefined();sync(cx+1,cz);const replacement=read()!;expect(replacement).toBeDefined();expect(replacement).not.toBe(first);expect(first.isValid()).toBe(false);expect(foreign.isValid()).toBe(true);
      sim?.dispose();guest?.dispose();expect(world.colliders.len()).toBe(1);world.removeCollider(foreign,true);expect(world.colliders.len()).toBe(0);expect(world.bodies.len()).toBe(0);
    }finally{sim?.dispose();guest?.dispose();world.free();}
  });
  for(const seed of [7734,1926,4107])it(`${seed}: owns one exact mesh per admitted prop with real transforms and holes`,()=>{
    const authorityWorld=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(authorityWorld,seed,'pvp'),guestWorld=new RAPIER.World({x:0,y:-22,z:0}),guest=new GuestCollisionTiles(guestWorld,seed,'pvp'),props=propsFor(seed);
    expect(props.length).toBeGreaterThan(0);
    try{for(const prop of props){
      const id=`${prop.id}:mesh`;sim.syncChunks([prop]);guest.sync(chunkAt(prop.x),chunkAt(prop.z));authorityWorld.step();guestWorld.step();
      const owned=[sim.buildingCollider(id),guest.buildingCollider(id)];
      for(const collider of owned){expect(collider).toBeDefined();expect(collider!.shape).toBeInstanceOf(RAPIER.TriMesh);const mesh=structuralPropCollision(prop.kind as Parameters<typeof structuralPropCollision>[0],prop.scale),shape=collider!.shape as RAPIER.TriMesh;
        expect(Array.from(shape.vertices)).toEqual(Array.from(mesh.vertices));expect(Array.from(shape.indices)).toEqual(Array.from(mesh.indices));
        const p=collider!.translation(),q=collider!.rotation();expect(p.x).toBeCloseTo(prop.x,4);expect(p.y).toBeCloseTo(prop.y,4);expect(p.z).toBeCloseTo(prop.z,4);expect(q.y).toBeCloseTo(Math.sin(prop.rotation/2),5);expect(q.w).toBeCloseTo(Math.cos(prop.rotation/2),5);
      }
      const matching=[...guest.tiles.get(`${chunkAt(prop.x)},${chunkAt(prop.z)}`)!.colliders].filter(c=>{const p=c.translation();return Math.abs(p.x-prop.x)<.001&&Math.abs(p.z-prop.z)<.001;});expect(matching).toHaveLength(1);
      for(const [world,collider] of [[authorityWorld,owned[0]!],[guestWorld,owned[1]!]] as const){
        if(prop.kind==='tower'){expect(ray(world,collider,prop,1,5)).toBeNull();expect(ray(world,collider,prop,0,5)).not.toBeNull();}
        if(prop.kind==='crane'){expect(ray(world,collider,prop,0,10)).toBeNull();expect(ray(world,collider,prop,1,10)).not.toBeNull();}
        if(prop.kind==='pipes'){expect(ray(world,collider,prop,0,.4)).toBeNull();expect(ray(world,collider,prop,0,1.2)).not.toBeNull();}
        if(prop.kind==='wall')expect(ray(world,collider,prop,0,4)).not.toBeNull();
      }
    }}finally{sim.dispose();guest.dispose();expect(authorityWorld.bodies.len()).toBe(0);expect(guestWorld.colliders.len()).toBe(0);authorityWorld.free();guestWorld.free();}
  });
  it('retires actual projectile-hit mesh ownership in the break tick, presents guest removal at its own clock, and keeps it absent on reentry/late join',()=>{
    const seed=7734,prop=propsFor(seed).find(p=>p.kind==='wall'&&p.breakableHp)!,id=`${prop.id}:mesh`,world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,'pvp'),guestWorld=new RAPIER.World({x:0,y:-22,z:0}),guest=new GuestCollisionTiles(guestWorld,seed,'pvp'),presentation=new CityPresentation();
    const cx=chunkAt(prop.x),cz=chunkAt(prop.z),c=Math.cos(prop.rotation),s=Math.sin(prop.rotation),actor=sim.addActor('shooter','Shooter','pounce',false,{x:prop.x-10*s,y:prop.y+1,z:prop.z-10*c});
    const unregister=registerBuildingContacts(world,key=>sim.buildingCollider(key)),unregisterGuest=registerBuildingContacts(guestWorld,key=>guest.buildingCollider(key));
    try{
      for(let i=0;i<180;i++)sim.step(1/60);guest.sync(cx,cz);const original=sim.buildingCollider(id)!,shown=guest.buildingCollider(id)!;expect(ownsBuildingContact(world,[id],original)).toBe(true);
      presentation.register(state=>guest.destroyCover(state.cover.filter(p=>p.destroyedAt!==null).map(p=>p.id)));
      const intact=sim.snapshot();presentation.push(intact.tick,intact.time,intact.structures,intact.cover);presentation.present(intact.time);
      let prior=sim.snapshot(),after=prior;for(let i=0;i<360&&sim.cover.get(prop.id!)!.hp>0;i++){
        prior=sim.snapshot();const pitch=Math.atan2(prop.y+4-(actor.position.y+.65),8.7);sim.setInput(actor.id,{...emptyInput(),seq:sim.tick+1,fire:true,yaw:Math.atan2(-s,-c),pitch});sim.step(1/60);after=sim.snapshot();
      }
      expect(after.cover.find(p=>p.id===prop.id)?.hp).toBe(0);expect(prior.cover.find(p=>p.id===prop.id)!.hp).toBeGreaterThan(0);expect(original.isValid()).toBe(false);expect(sim.buildingCollider(id)).toBeUndefined();expect(ownsBuildingContact(world,[id],original)).toBe(false);
      presentation.push(prior.tick,prior.time,prior.structures,prior.cover);presentation.push(after.tick,after.time,after.structures,after.cover);
      presentation.present(after.time-.00001);expect(shown.isValid()).toBe(true);expect(ownsBuildingContact(guestWorld,[id],shown)).toBe(true);
      presentation.present(after.time);expect(shown.isValid()).toBe(false);expect(guest.buildingCollider(id)).toBeUndefined();expect(ownsBuildingContact(guestWorld,[id],shown)).toBe(false);
      const foreign=guestWorld.createCollider(RAPIER.ColliderDesc.ball(.1).setTranslation(500,500,500));
      sim.syncChunks([{x:500,y:1,z:500}]);sim.syncChunks([prop]);expect(sim.buildingCollider(id)).toBeUndefined();guest.sync(cx+8,cz+8);guest.sync(cx,cz);expect(guest.buildingCollider(id)).toBeUndefined();expect(foreign.isValid()).toBe(true);
      guest.dispose();const late=new GuestCollisionTiles(guestWorld,seed,'pvp');late.sync(cx,cz,after.cover.filter(p=>p.destroyedAt!==null).map(p=>p.id));expect(late.buildingCollider(id)).toBeUndefined();late.dispose();guestWorld.removeCollider(foreign,true);
    }finally{unregister();unregisterGuest();sim.dispose();guest.dispose();world.free();guestWorld.free();}
  });
});
