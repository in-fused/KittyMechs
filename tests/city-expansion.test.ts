import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {cityDistrict,cityBlockActive} from '../shared/cityDistrict';
import {cityGridEncounter,encounterBlocks,optionalEncounter,optionalEncounterSupported,rooftopEncounter} from '../shared/encounters';
import {actorHullRadius} from '../shared/config';
import {Simulation} from '../shared/simulation';
import {emptyInput,type ActorState,type Chassis,type InputState,type StructureState} from '../shared/types';
import {parseInput,parseStructures} from '../shared/protocol';
import {Navigation} from '../shared/navigation';
import {cityStreetRoute} from '../shared/cityNavigation';
import {supplyCandidates} from '../shared/supplies';
import {terrainHeight,chunkAt} from '../shared/world';
import {GuestCollisionTiles} from '../src/game/world/guestCollisionTiles';
import {buildCityGeometry,applyCityDamage} from '../src/game/world/cityGeometry';

beforeAll(async()=>{await RAPIER.init();});
const district=cityDistrict(7734)!,extensions=district.buildings.filter(b=>b.id.includes(':extension-'));
const withSim=(run:(s:Simulation)=>void,mode:'pvp'|'coop'|'pvpve'='pvp')=>{const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,mode);try{run(sim);}finally{sim.dispose();world.free();}};
const input=(s:Simulation,a:ActorState,patch:Partial<InputState>={})=>s.setInput(a.id,parseInput({...emptyInput(),seq:s.tick+1,jumpEpoch:a.jumpEpoch,stance:a.stance,...patch})!);
const advance=(s:Simulation,seconds:number,a?:ActorState,patch:Partial<InputState>={})=>{for(let i=0;i<Math.round(seconds*60);i++){if(a)input(s,a,patch);s.step(1/60);}};
const healthy=():StructureState[]=>district.structures.map(b=>({id:b.id,layoutVersion:1,revision:0,brokenMask:0,hp:b.cells.map(()=>b.maxHp)}));
const fire=(s:Simulation,a:ActorState,cell:typeof district.blocks[number])=>{
  const [x,y,z]=cell.position,dx=x-a.position.x,dz=z-a.position.z,yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(y-(a.position.y+.65),Math.max(.2,Math.hypot(dx,dz)-1.3));
  for(let i=0;i<240;i++){input(s,a,{fire:true,yaw,pitch});s.step(1/60);if(s.structures.find(b=>b.id===cell.structureId)!.hp[cell.cellId!]===0)return;}
  throw new Error(`Pulse failed to destroy ${cell.id}`);
};

describe('connected four-neighborhood city expansion',()=>{
  it('keeps bounded banks, real interiors, exact roof dependencies and four facades per parcel',()=>{
    expect(extensions).toHaveLength(20);expect(new Set(extensions.map(b=>b.style))).toEqual(new Set(['residential','transit','civic','works']));
    expect(Buffer.byteLength(JSON.stringify(healthy()))).toBeLessThanOrEqual(49152);
    for(const b of extensions){
      expect(b.anchors.map(a=>[a.normal.x,a.normal.z])).toEqual([[-1,0],[1,0],[0,-1],[0,1]]);
      const banks=district.structures.filter(s=>s.buildingId===b.id);expect(banks).toHaveLength(6);expect(banks.every(s=>s.cells.length<=32)).toBe(true);
      for(const deck of district.blocks.filter(d=>d.buildingId===b.id&&d.part==='deck')){expect(deck.support?.cells).toHaveLength(2);expect(deck.support?.minIntact).toBe(1);expect(deck.structureId).toBe(`${b.id}:roof-cells`);expect(deck.anchorIds).toEqual(b.anchors.map(a=>a.id));}
      expect(terrainHeight(b.position.x,b.position.z,7734)).toBeCloseTo(b.position.y,6);
    }
  });
  it('connects the far city through bounded street legs, rejects blocked edges and keeps pickups on actual accessible streets',()=>{
    const navigation=new Navigation(7734),from={x:-8,y:.92,z:22},to={...extensions.at(-1)!.anchor.approach,y:.92},path=navigation.path(from,to);
    expect(path.length).toBeGreaterThan(0);expect(path.every(p=>navigation.walkable(p))).toBe(true);expect(Math.hypot(path.at(-1)!.x-to.x,path.at(-1)!.z-to.z)).toBeLessThan(4.5);
    const street=cityStreetRoute(7734,from,to,p=>navigation.walkable(p));expect(street?.length).toBeGreaterThan(0);expect(cityStreetRoute(7734,from,to,()=>false)).toBeNull();
    const supplies=supplyCandidates(7734).filter(p=>p.x>188);expect(supplies.length).toBeGreaterThan(20);expect(supplies.every(p=>navigation.walkable({...p,y:p.y+1}))).toBe(true);
  });
  for(const chassis of ['pounce','bastion','lynx','caracal'] as Chassis[])for(const b of extensions)for(const anchor of b.anchors.slice(1))it(`${chassis} climbs and mantles ${anchor.id} with normal inputs`,()=>withSim(s=>{
    const radius=actorHullRadius({chassis,bot:false}),a=s.addActor('pilot','Pilot',chassis,false,{x:anchor.position.x+anchor.normal.x*(radius+.3),y:.92,z:anchor.position.z+anchor.normal.z*(radius+.3)});
    advance(s,1,a);expect(a.grounded).toBe(true);let grabbed=false,mantled=false,done=false;
    for(let i=0;i<960;i++){input(s,a,{climb:true,forward:1,yaw:Math.atan2(anchor.normal.x,anchor.normal.z)});s.step(1/60);if(a.climb){grabbed=true;mantled||=a.climb.phase==='mantle';if(a.climb.phase==='mantle'){
      expect(a.climb.mantleStage).not.toBeNull();if(a.climb.mantleStage==='out'||a.climb.mantleStage==='lift')expect(a.climb.gripMask|a.climb.roofMask).toBe(0);else expect(a.position.y-1).toBeGreaterThanOrEqual(a.climb.top+.1);
    }}else if(grabbed){done=true;break;}}
    expect({grabbed,mantled,done}).toEqual({grabbed:true,mantled:true,done:true});advance(s,.5,a);expect(a.grounded).toBe(true);expect(a.position.y-1).toBeCloseTo(b.roof.center.y+.024,2);expect(a.energy).toBeGreaterThan(15);
  }));
  it('accepted support hits collapse only their own roof quadrant, cause a real fall and survive eviction',()=>withSim(s=>{
    const b=extensions[0],sector=district.blocks.find(d=>d.buildingId===b.id&&d.part==='deck')!,bank=district.structures.find(d=>d.id===sector.support!.structureId)!,a=s.addActor('shooter','Shooter','pounce',false,{...b.position,y:.92});advance(s,1,a);
    const standing=s.addActor('walker','Walker','bastion',false,{x:sector.position[0],y:b.roof.center.y+1,z:sector.position[2]});advance(s,.3,a);expect(standing.grounded).toBe(true);
    fire(s,a,bank.cells[sector.support!.cells[0]]);expect(cityBlockActive(sector,s.structures)).toBe(true);
    fire(s,a,bank.cells[sector.support!.cells[1]]);expect(cityBlockActive(sector,s.structures)).toBe(false);
    const other=district.blocks.filter(d=>d.buildingId===b.id&&d.part==='deck'&&d.id!==sector.id);expect(other.every(d=>cityBlockActive(d,s.structures))).toBe(true);
    advance(s,3,a);expect(standing.position.y).toBeLessThan(2);expect(standing.grounded).toBe(true);
    s.syncChunks([{x:-200,y:1,z:-200}]);s.syncChunks([a.position]);s.world.step();const down=new RAPIER.Ray({x:sector.position[0],y:b.roof.center.y+.5,z:sector.position[2]},{x:0,y:-1,z:0});expect(s.world.castRay(down,1,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC)).toBeNull();expect(parseStructures(s.snapshot().structures,7734)).toBeTruthy();
  }));
  it('a pulse can damage a roof sector directly and its cells never return after dependency retirement',()=>withSim(s=>{
    const b=extensions[0],sectors=district.blocks.filter(d=>d.buildingId===b.id&&d.part==='deck'),target=sectors[0],a=s.addActor('shooter','Shooter','pounce',false,{x:sectors[2].position[0],y:b.roof.center.y+1,z:sectors[2].position[2]});advance(s,1,a);fire(s,a,target);
    expect(cityBlockActive(target,s.structures)).toBe(false);expect(s.events.some(e=>e.type==='structure-break'&&e.structureId===target.structureId)).toBe(true);expect(sectors.slice(1).every(d=>cityBlockActive(d,s.structures))).toBe(true);
  }));
  it('broken facade cells remove all owned glazing and late guests retain the precise opening',()=>{
    const b=extensions[5],bank=district.structures.find(s=>s.buildingId===b.id&&s.id.endsWith('facade-west'))!,cell=bank.cells[1],before=healthy(),after=healthy(),state=after.find(s=>s.id===bank.id)!;state.hp[1]=0;state.brokenMask=2;state.revision=1;
    const batches=buildCityGeometry(district);applyCityDamage(batches,after);const ranges=batches.flatMap(batch=>batch.ranges.filter(r=>r.block.id===cell.id).map(range=>({batch,range})));expect(ranges.length).toBeGreaterThan(2);for(const {batch,range} of ranges)expect(new Set(Array.from({length:range.count},(_,i)=>batch.geometry.index!.getX(range.start+i))).size).toBe(1);
    const world=new RAPIER.World({x:0,y:-22,z:0}),owner=new GuestCollisionTiles(world,7734,'coop');owner.syncStructures(after);owner.sync(chunkAt(cell.position[0]),chunkAt(cell.position[2]));world.step();const ray=new RAPIER.Ray({x:cell.position[0]-2,y:cell.position[1],z:cell.position[2]},{x:1,y:0,z:0});expect(world.castRay(ray,3,true)).toBeNull();expect(owner.syncStructures(before)).toBe(false);owner.sync(-3,-3);owner.sync(chunkAt(cell.position[0]),chunkAt(cell.position[2]));world.step();expect(world.castRay(ray,3,true)).toBeNull();owner.dispose();expect(world.colliders.len()).toBe(0);world.free();for(const batch of batches)batch.geometry.dispose();
  });
  it('the city contract is genuinely defended, optional and omitted from rival-only PvP',()=>{
    expect(cityGridEncounter(1926)).toBeNull();const encounter=cityGridEncounter(7734)!;expect(encounter.objective.position.y).toBe(encounter.roof.center.y);
    withSim(s=>{expect(s.objectives.some(o=>o.id==='city-grid')).toBe(false);expect(s.actors.has('city-grid-guardian')).toBe(false);});
    withSim(s=>{const o=s.objectives.find(o=>o.id==='city-grid')!;expect(o.optional&&o.unlocked).toBe(true);expect(s.actors.get(encounter.guardian.id)!.hp).toBeGreaterThan(0);const a=s.addActor('pilot','Pilot','lynx',false,{...o.position,x:o.position.x-3,y:o.position.y+1});advance(s,.5,a);advance(s,1,a,{interact:true});expect(o.progress).toBe(0);for(const npc of [...s.actors.values()])if(npc.bot)s.removeActor(npc.id);advance(s,3.95,a,{interact:true});expect(o.complete).toBe(false);advance(s,.2,a,{interact:true});expect(o.complete).toBe(true);expect(a.salvage).toBe(250);expect(a.energy).toBe(100);expect(s.phase).toBe('active');},'coop');
  });
  it('selects each uplink definition and owns the city hardware exactly once',()=>{
    expect(optionalEncounter(7734,'sky-uplink')?.guardian.id).toBe('roof-guardian');expect(optionalEncounter(7734,'city-grid')?.guardian.id).toBe('city-grid-guardian');expect(optionalEncounter(7734,'unknown')).toBeNull();
    expect(encounterBlocks(7734,'sky-uplink')).toHaveLength(3);expect(encounterBlocks(7734,'city-grid')).toEqual([]);
    const blocks=district.blocks.filter(b=>b.id.includes(':grid-'));expect(blocks).toHaveLength(3);expect(blocks.every(b=>cityBlockActive(b,healthy()))).toBe(true);
    const state=healthy(),deck=state.find(s=>s.id===blocks[0].support!.also![0].structureId)!;deck.hp[0]=0;deck.brokenMask=1;deck.revision=1;
    expect(parseStructures(state,7734)).toBeTruthy();expect(blocks.every(b=>!cityBlockActive(b,state))).toBe(true);expect(optionalEncounterSupported(7734,'city-grid',state)).toBe(false);expect(optionalEncounterSupported(7734,'sky-uplink',state)).toBe(true);
  });
  it('holds two optional contracts independently and emits each accepted pulse from its own mast',()=>withSim(s=>{
    for(const npc of [...s.actors.values()])if(npc.bot)s.removeActor(npc.id);
    const city=cityGridEncounter(7734)!,sky=rooftopEncounter(7734),o=s.objectives.find(o=>o.id==='city-grid')!,so=s.objectives.find(o=>o.id==='sky-uplink')!;
    const a=s.addActor('city','City','lynx',false,{...city.objective.position,x:city.objective.position.x-3,y:city.objective.position.y+1}),b=s.addActor('sky','Sky','lynx',false,{...sky.objective.position,x:sky.objective.position.x-3,y:sky.objective.position.y+1});advance(s,.5);
    for(let i=0;i<120;i++){input(s,a,{interact:true});input(s,b,{interact:true});s.step(1/60);}expect(o.progress).toBeCloseTo(.5,2);expect(so.progress).toBeCloseTo(2/3,2);
    for(let i=0;i<130;i++){input(s,a,{interact:true});input(s,b,{interact:true});s.step(1/60);}
    expect(o.complete&&so.complete).toBe(true);expect(a.salvage).toBe(250);expect(b.salvage).toBe(200);const pulses=s.events.filter(e=>e.type==='area'&&e.effect==='emp');expect(pulses.map(e=>e.position)).toContainEqual(city.pulseOrigin);expect(pulses.map(e=>e.position)).toContainEqual(sky.pulseOrigin);
  },'coop'));
});
