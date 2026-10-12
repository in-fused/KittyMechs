import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {cityBlockActive,cityBlocks,cityDistrict} from '../shared/cityDistrict';
import {buildingFaces} from '../shared/buildingSurfaces';
import {actorHullRadius} from '../shared/config';
import {getMap} from '../shared/maps';
import {Navigation} from '../shared/navigation';
import {parseInput,parseJoin,parseStructures} from '../shared/protocol';
import {Simulation} from '../shared/simulation';
import {climbAnchors,roofSurfaces} from '../shared/traversal';
import {onRoof,roofPath} from '../shared/vertical-navigation';
import {chunkAt,generateChunk,landmarkBlocks,propCollider,terrainHeight} from '../shared/world';
import {emptyInput,type ActorState,type Chassis,type InputState,type StructureState,type Vec3} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
const district=cityDistrict(7734)!;
const withSim=(run:(sim:Simulation)=>void,mode:'pvp'|'coop'='pvp')=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,mode);
  try{run(sim);}finally{sim.dispose();world.free();}
};
const input=(sim:Simulation,a:ActorState,patch:Partial<InputState>={})=>sim.setInput(a.id,parseInput({...emptyInput(),stance:a.stance,seq:sim.tick+1,jumpEpoch:a.jumpEpoch,jumpId:patch.jump?sim.tick+1:0,...patch})!);
const advance=(sim:Simulation,seconds:number,a?:ActorState,patch:Partial<InputState>={})=>{for(let i=0;i<Math.round(seconds*60);i++){if(a)input(sim,a,patch);sim.step(1/60);}};
const states=():StructureState[]=>district.structures.map(d=>({id:d.id,layoutVersion:1,revision:0,brokenMask:0,hp:d.cells.map(()=>d.maxHp)}));
const fireAt=(sim:Simulation,a:ActorState,cell:{position:[number,number,number];cellId?:number;structureId?:string})=>{
  const dx=cell.position[0]-a.position.x,dz=cell.position[2]-a.position.z,yaw=Math.atan2(-dx,-dz);
  for(let i=0;i<180;i++) {
    input(sim,a,{fire:true,yaw});sim.step(1/60);
    if(sim.structures.find(s=>s.id===cell.structureId)!.hp[cell.cellId!]===0){advance(sim,.4,a);return;}
  }
  throw new Error(`Accepted pulses did not destroy ${cell.structureId}:${cell.cellId}`);
};

describe('surveyed connected Rainline district',()=>{
  it('keeps 28 non-overlapping full footprints clear of lanes, authored props and landmarks within 1025 boxes',()=>{
    expect(district.buildings).toHaveLength(28);expect(climbAnchors(7734)).toHaveLength(91);expect(cityBlocks(7734)).toHaveLength(1025);expect(district.structures.filter(s=>s.id.endsWith(':facade')).flatMap(s=>s.cells)).toHaveLength(64);
    expect(new Set(cityBlocks(7734).map(b=>b.id)).size).toBe(1025);expect(cityDistrict(1926)).toBeNull();expect(cityDistrict(4107)).toBeNull();
    expect(district.structures).toHaveLength(123);expect(district.structures.flatMap(s=>s.cells)).toHaveLength(952);
    for(const b of district.buildings) {
      const hx=b.width/2,hz=b.depth/2;
      for(const other of district.buildings)if(b!==other)expect(Math.abs(b.position.x-other.position.x)>=hx+other.width/2||Math.abs(b.position.z-other.position.z)>=hz+other.depth/2).toBe(true);
      // Sample each full road segment against the closest point of the footprint,
      // not just its center. Dense samples include every possible narrow crossing.
      for(const road of getMap(7734).roads)for(let i=1;i<road.points.length;i++) {
        const a=road.points[i-1],end=road.points[i],length=Math.hypot(a.x-end.x,a.z-end.z);
        for(let step=0;step<=Math.ceil(length*2);step++) {
          const t=step/Math.ceil(length*2),x=a.x+(end.x-a.x)*t,z=a.z+(end.z-a.z)*t;
          const distance=Math.hypot(Math.max(0,Math.abs(x-b.position.x)-hx),Math.max(0,Math.abs(z-b.position.z)-hz));
          expect(distance).toBeGreaterThanOrEqual(road.width/2+2-1e-6);
        }
      }
      for(let cx=chunkAt(b.position.x-hx-18);cx<=chunkAt(b.position.x+hx+18);cx++)for(let cz=chunkAt(b.position.z-hz-18);cz<=chunkAt(b.position.z+hz+18);cz++)for(const p of generateChunk(7734,cx,cz).props){
        const box=propCollider(p);if(!box)continue;
        const radius=Math.hypot(box[0],box[2]);
        expect(Math.hypot(Math.max(0,Math.abs(p.x-b.position.x)-hx),Math.max(0,Math.abs(p.z-b.position.z)-hz))).toBeGreaterThan(radius);
      }
      for(const p of landmarkBlocks(7734))expect(Math.hypot(Math.max(0,Math.abs(p.position[0]-b.position.x)-hx),Math.max(0,Math.abs(p.position[2]-b.position.z)-hz))).toBeGreaterThan(Math.hypot(p.halfExtents[0],p.halfExtents[2]));
      for(let x=-14;x<=14;x+=2)for(let z=-9;z<=9;z+=2)expect(terrainHeight(b.position.x+x,b.position.z+z,7734)).toBeCloseTo(b.position.y,6);
    }
  });
  it('owns the exact122 static boxes, with no unlisted solid cuboid behind panel banks',()=>withSim(sim=>{
    sim.syncChunks(district.buildings.map(b=>b.position));sim.world.step();
    const actual:{position:Vec3;size:Vec3;handle:number}[]=[];
    sim.world.colliders.forEach(c=>{const shape=c.shape,position=c.translation();if(shape instanceof RAPIER.Cuboid&&position.x>=93.7&&position.x<=166.3&&position.z>=6.7&&position.z<=115.3)actual.push({position,size:shape.halfExtents,handle:c.handle});});
    expect(actual).toHaveLength(122);const handles=new Set<number>();
    for(const block of district.blocks.filter(b=>b.buildingId.includes(':building-'))){const found=actual.filter(c=>Math.abs(c.position.x-block.position[0])<1e-4&&Math.abs(c.position.y-block.position[1])<1e-4&&Math.abs(c.position.z-block.position[2])<1e-4&&Math.abs(c.size.x-block.halfExtents[0])<1e-4&&Math.abs(c.size.y-block.halfExtents[1])<1e-4&&Math.abs(c.size.z-block.halfExtents[2])<1e-4);expect(found,block.id).toHaveLength(1);handles.add(found[0].handle);}
    expect(handles.size).toBe(122);
    expect(sim.world.intersectionWithShape({x:109,y:1.3,z:16},{x:0,y:0,z:0,w:1},new RAPIER.Cuboid(2.05,1.25,2.05),RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC)).toBeNull();
  }));
  it('has supported, decoration-free connectors and navigable routes from the actual map spawn to every grip',()=>{
    const navigation=new Navigation(7734);
    for(const b of district.buildings){const route=navigation.path({...getMap(7734).spawn,y:.92},{...b.anchor.approach,y:.92});expect(route.length,`${b.id} route`).toBeGreaterThan(0);expect(route.every(p=>navigation.walkable(p))).toBe(true);}
    for(const street of district.streets)for(let i=0;i<=20;i++){
      const a=street.points[0],b=street.points[1],p={x:a.x+(b.x-a.x)*i/20,z:a.z+(b.z-a.z)*i/20};
      expect(terrainHeight(p.x,p.z,7734)).toBeCloseTo(-.08,5);
      for(let cx=chunkAt(p.x-8);cx<=chunkAt(p.x+8);cx++)for(let cz=chunkAt(p.z-8);cz<=chunkAt(p.z+8);cz++)for(const prop of generateChunk(7734,cx,cz).props){const box=propCollider(prop);if(box)expect(Math.hypot(prop.x-p.x,prop.z-p.z)).toBeGreaterThan(Math.hypot(box[0],box[2])+2.2);}
    }
  });
  it('a default-spawn Bastion walks the real terrain route to the farthest formerly excluded grip',()=>withSim(sim=>{
    const a=sim.addActor('traveler','Pilot','bastion'),building=district.buildings[7],navigation=new Navigation(7734);
    advance(sim,1,a);const path=navigation.path(a.position,{...building.anchor.approach,y:.92});expect(path.length).toBeGreaterThan(0);
    let next=0;for(let i=0;i<6000&&next<path.length;i++) {
      const point=path[next],dx=point.x-a.position.x,dz=point.z-a.position.z;
      if(Math.hypot(dx,dz)<.9){next++;continue;}
      input(sim,a,{forward:1,yaw:Math.atan2(-dx,-dz)});sim.step(1/60);
    }
    expect(next).toBe(path.length);expect(Math.hypot(a.position.x+8,a.position.z-22)).toBeGreaterThan(150);
    const grip={x:building.anchor.position.x+2.35,z:building.anchor.position.z};
    for(let i=0;i<180;i++){const dx=grip.x-a.position.x,dz=grip.z-a.position.z;if(Math.hypot(dx,dz)<.25)break;input(sim,a,{forward:1,yaw:Math.atan2(-dx,-dz)});sim.step(1/60);}
    const arrivalZ=a.position.z,face=buildingFaces(7734).find(f=>f.buildingId===building.id&&f.side==='east')!;
    let attached=false,finished=false;for(let i=0;i<960;i++){
      input(sim,a,{climb:true,forward:1,yaw:Math.PI/2});sim.step(1/60);
      if(a.climb){attached=true;expect(a.climb.anchor).toBe(face.id);expect(a.climb.base).toBe(face.minY);}
      else if(attached){finished=true;break;}
    }
    expect(attached,JSON.stringify({pathEnd:path.at(-1),position:a.position,grounded:a.grounded})).toBe(true);
    expect(finished).toBe(true);advance(sim,.4,a);expect(a.grounded).toBe(true);expect(onRoof(roofSurfaces(7734).find(r=>r.id===building.roof.id)!,a.position)).toBe(true);
    // The ordinary path's lateral arrival stays on this face; no center warp.
    expect(a.position.z).toBeCloseTo(arrivalZ,2);
  }));
  for(const chassis of ['pounce','bastion','lynx','caracal'] as Chassis[])for(const b of district.buildings)it(`${chassis} naturally grips, full-hull mantles and walks ${b.id}`,()=>withSim(sim=>{
    const anchor=b.anchor,radius=actorHullRadius({bot:false,chassis}),a=sim.addActor('pilot','Pilot',chassis,false,{x:anchor.position.x+anchor.normal.x*(radius+.3),y:terrainHeight(anchor.approach.x,anchor.approach.z,7734)+1,z:anchor.position.z+anchor.normal.z*(radius+.3)});
    advance(sim,1,a);expect(a.grounded).toBe(true);let grabbed=false,mantled=false,finished=false;
    const yaw=Math.atan2(anchor.normal.x,anchor.normal.z);
    for(let i=0;i<960;i++) {
      input(sim,a,{climb:true,forward:1,yaw});sim.step(1/60);
      if(a.climb){grabbed=true;if(a.climb.phase==='mantle'){
        mantled=true;expect(a.climb.mantleStage).not.toBeNull();
        if(a.climb.mantleStage==='out'||a.climb.mantleStage==='lift')expect(a.climb.gripMask|a.climb.roofMask).toBe(0);
        else expect(a.position.y-1).toBeGreaterThanOrEqual(a.climb.top+.1);
      }else expect((a.position.x-anchor.position.x)*anchor.normal.x+(a.position.z-anchor.position.z)*anchor.normal.z).toBeGreaterThanOrEqual(radius+.065);}
      else if(grabbed){finished=true;break;}
    }
    expect(finished).toBe(true);expect(mantled).toBe(true);expect(a.energy).toBeGreaterThan(b.id.includes(':extension-')?15:35);
    advance(sim,.4,a);expect(a.grounded).toBe(true);advance(sim,1,a,{forward:1,yaw:b.id.endsWith(':entry-gantry')?-Math.PI/2:yaw});expect(a.position.y-1).toBeGreaterThanOrEqual(b.roof.center.y-.01);
  }));
  it('routes around the exact roof fixture and physically jumps onto its supported top',()=>withSim(sim=>{
    const b=district.buildings[3],fixture=b.fixtures[0],roof=roofSurfaces(7734).find(r=>r.id===b.roof.id)!;
    const a=sim.addActor('pilot','Pilot','bastion',false,{x:fixture.position.x,y:fixture.position.y+1,z:fixture.position.z-5});advance(sim,1,a);
    const path=roofPath(roof,a.position,{x:fixture.position.x,y:fixture.position.y+1,z:fixture.position.z+4},2.05,p=>Math.abs(p.x-fixture.position.x)>4.6||Math.abs(p.z-fixture.position.z)>2.9);
    expect(path.length).toBeGreaterThan(0);expect(path.some(p=>Math.abs(p.x-fixture.position.x)>4.6)).toBe(true);
    input(sim,a,{jump:true,forward:1,yaw:Math.PI});sim.step(1/60);let supported=false;
    for(let i=0;i<80;i++){input(sim,a,{forward:i<25?1:0,yaw:Math.PI});sim.step(1/60);if(a.grounded&&a.position.y-1>fixture.position.y+1)supported=true;}
    expect(supported).toBe(true);
  }));
  it('adds six city NPCs with role homes and safe roof respawns, and no NPCs in rival-only mode',()=>{
    withSim(sim=>{
      const npcs=district.npcs.map(n=>sim.actors.get(n.id)!);expect(npcs).toHaveLength(6);expect(npcs.every(n=>n.hp>0)).toBe(true);expect(npcs.filter(n=>n.role==='anchor')).toHaveLength(3);
      const before=npcs.map(n=>({...n.position}));advance(sim,7);
      npcs.forEach((n,i)=>{expect(Math.hypot(n.position.x-before[i].x,n.position.z-before[i].z)).toBeGreaterThan(1);if(n.role==='anchor')expect(n.position.y-1).toBeCloseTo(district.npcs[i].position.y,1);});
      const guard=npcs[0];guard.hp=0;guard.respawnAt=sim.time;advance(sim,.1);expect(guard.hp).toBe(guard.maxHp);expect(guard.position.y-1).toBeGreaterThan(7.8);
    },'coop');
    withSim(sim=>expect([...sim.actors.values()].some(a=>a.id.startsWith('city-'))).toBe(false));
  });
});

describe('bounded persistent directional cells',()=>{
  it('requires exact world identity independently of bank layout/revision',()=>withSim(sim=>{
    const join={type:'join',name:'Pilot',room:'CITY',chassis:'bastion',mode:'coop',create:true};
    expect(parseJoin(join)).toBeNull();expect(parseJoin({...join,layoutVersion:'v11'})).toBeNull();expect(parseJoin({...join,inputVersion:INPUT_PROTOCOL_VERSION,layoutVersion:WORLD_LAYOUT_VERSION})).toMatchObject({inputVersion:INPUT_PROTOCOL_VERSION,layoutVersion:WORLD_LAYOUT_VERSION});
    expect(sim.snapshot().worldLayoutVersion).toBe(WORLD_LAYOUT_VERSION);
  }));
  it('atomically validates layout/revisions/masks/HP, rejects restoration and copies all nested state',()=>{
    const original=states();expect(parseStructures(original,7734)).toEqual(original);
    const sparse=states();sparse[2].hp=Array(8);expect(parseStructures(sparse,7734)).toBeNull();
    const next=states();next[0].hp[31]=0;next[0].brokenMask=0x80000000;next[0].revision=1;
    const parsed=parseStructures(next,7734,original)!;expect(parsed[0].brokenMask).toBe(0x80000000);parsed[0].hp[0]=0;expect(next[0].hp[0]).toBe(65);
    const all=states();all[0]={...all[0],revision:32,brokenMask:0xffffffff,hp:Array(32).fill(0)};expect(parseStructures(all,7734)![0].brokenMask).toBe(0xffffffff);
    for(const wrong of [[],[...next,next[0]],next.map((s,i)=>({...s,id:i?'unknown':s.id})),next.map(s=>({...s,layoutVersion:2})),next.map(s=>({...s,hp:[NaN,...s.hp.slice(1)]})),next.map(s=>({...s,brokenMask:-1})),original])expect(parseStructures(wrong,7734,next)).toBeNull();
    expect(parseStructures([],4107)).toEqual([]);expect(parseStructures(original,4107)).toBeNull();
    expect(parseInput({...emptyInput(),structures:next})!).not.toHaveProperty('structures');
  });
  it('winning accepted pulse damages only the struck cell, retains neighbors and survives chunk reload/late snapshots',()=>withSim(sim=>{
    const cell=district.structures[0].cells[3],a=sim.addActor('pilot','Pilot','pounce',false,{x:123,y:.92,z:cell.position[2]});advance(sim,1,a);
    advance(sim,.65,a,{fire:true,yaw:Math.PI/2});const state=sim.structures[0];expect(state.hp[3]).toBe(0);expect(state.hp.filter(h=>h<65)).toHaveLength(1);expect(state.brokenMask).toBe(8);
    const events=sim.events.filter(e=>e.type==='structure-break');expect(events).toHaveLength(1);expect(events[0].incoming?.x).toBeCloseTo(-1);expect(events[0].normal?.x).toBeCloseTo(1);
    const snap=sim.snapshot();snap.structures[0].hp[0]=0;expect(state.hp[0]).toBe(65);snap.events.find(e=>e.type==='structure-break')!.incoming!.x=99;expect(events[0].incoming!.x).toBeCloseTo(-1);
    sim.syncChunks([{x:-200,y:1,z:-200}]);sim.syncChunks([a.position]);sim.world.step();
    const ray=new RAPIER.Ray({x:122,y:1.5,z:cell.position[2]},{x:-1,y:0,z:0});const hit=sim.world.castRay(ray,10,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);expect(hit).toBeNull();
    const adjacent=sim.world.castRay(new RAPIER.Ray({x:122,y:1.5,z:cell.position[2]+2.25},{x:-1,y:0,z:0}),10,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);expect(adjacent).not.toBeNull();
    expect(parseStructures(sim.snapshot().structures,7734)).toEqual(sim.structures);expect(cityBlockActive(cell,sim.structures)).toBe(false);
    advance(sim,1.3,a);expect(sim.snapshot().events.some(e=>e.type.startsWith('structure-'))).toBe(false);expect(parseStructures(sim.snapshot().structures,7734)![0].brokenMask).toBe(8);
  }));
  it('a nearer enemy wins over the cell, and an immutable back frame never acquires cell damage',()=>withSim(sim=>{
    const cell=district.structures[0].cells[3],a=sim.addActor('pilot','Pilot','pounce',false,{x:123,y:.92,z:cell.position[2]}),other=sim.addActor('other','Rival','bastion',false,{x:118,y:.92,z:cell.position[2]});advance(sim,3,a);
    advance(sim,.2,a,{fire:true,yaw:Math.PI/2});expect(other.hp).toBeLessThan(other.maxHp);expect(sim.structures[0].hp.every(h=>h===65)).toBe(true);
    sim.removeActor('other');sim.removeActor('pilot');const frame=sim.addActor('frame','Pilot','pounce',false,{x:84,y:.92,z:cell.position[2]});advance(sim,.8,frame,{fire:true,yaw:-Math.PI/2});expect(sim.structures.every(s=>s.hp.every(h=>h===district.structures.find(d=>d.id===s.id)!.maxHp))).toBe(true);
  }));
  it('a rocket samples actor LOS before retiring the wall cells it damages',()=>withSim(sim=>{
    const cell=district.structures[0].cells[3],a=sim.addActor('pilot','Pilot','bastion',false,{x:123,y:.92,z:cell.position[2]}),victim=sim.addActor('victim','Rival','lynx',false,{x:110,y:.92,z:cell.position[2]});advance(sim,3,a);
    input(sim,a,{rocket:true,yaw:Math.PI/2});sim.step(1/60);advance(sim,.5,a);
    expect(sim.structures[0].hp.some(h=>h===0)).toBe(true);expect(victim.hp).toBe(victim.maxHp);expect(sim.events.some(e=>e.type==='structure-break')).toBe(true);
  }));
  it('different aimed impacts create different cells and a measured four-column/two-row breach passes a real Bastion',()=>withSim(sim=>{
    const navigation=new Navigation(7734),from={x:126,y:.92,z:15},to={x:105,y:.92,z:15};expect(navigation.path(from,to)).toHaveLength(0);
    const bank=district.structures[0],a=sim.addActor('pilot','Pilot','bastion',false,{x:123,y:.92,z:16});advance(sim,1,a);
    for(const r of [0,1])for(const c of [2,3,4,5]) {
      const cell=bank.cells[r*8+c],dx=cell.position[0]-a.position.x,dz=cell.position[2]-a.position.z;
      const yaw=Math.atan2(-dx,-dz),horizontal=Math.hypot(dx,dz),pitch=Math.atan2(cell.position[1]-(a.position.y+.65),horizontal-1.3);
      advance(sim,.65,a,{fire:true,yaw,pitch});
    }
    expect(sim.structures[0].hp.filter(h=>h===0)).toHaveLength(8);expect(sim.structures[0].hp[0]).toBe(65);expect(sim.structures[0].hp[7]).toBe(65);
    advance(sim,2.6,a,{forward:1,yaw:Math.PI/2});expect(a.position.x+2.05).toBeLessThan(114-.02);expect(a.grounded).toBe(true);expect(a.position.y-1).toBeGreaterThan(-.08+.015);expect(a.position.y-1).toBeLessThan(-.08+.035);
    navigation.setStructureFilter(b=>cityBlockActive(b,sim.structures));
    expect(navigation.path(from,to).length).toBeGreaterThan(0);
    expect(navigation.walkable({x:114,y:.92,z:15})).toBe(true);
    sim.removeActor(a.id);const scout=sim.addActor('city-scout','Scout','pounce',true,{x:108,y:.92,z:16},'scout');
    let passed=false;for(let i=0;i<720;i++){sim.step(1/60);if(scout.position.x-1.45>114+.02){passed=true;break;}}
    expect(passed).toBe(true);expect(scout.grounded).toBe(true);
  }));
  it('opposite accepted shot directions retain their real contact normals and select different damage cells',()=>withSim(sim=>{
    const bank=district.structures[0],outside=sim.addActor('outside','Pilot','pounce',false,{x:123,y:.92,z:bank.cells[2].position[2]});advance(sim,1,outside);
    advance(sim,.65,outside,{fire:true,yaw:Math.PI/2});sim.removeActor(outside.id);
    const inside=sim.addActor('inside','Pilot','pounce',false,{x:109,y:.92,z:bank.cells[5].position[2]});advance(sim,1,inside);advance(sim,.65,inside,{fire:true,yaw:-Math.PI/2});
    const hits=sim.events.filter(e=>e.type==='structure-hit');expect(hits.some(e=>e.cellId===5&&e.incoming!.x>.99&&e.normal!.x<-.99)).toBe(true);expect(sim.structures[0].hp[2]).toBe(0);expect(sim.structures[0].hp[5]).toBe(0);expect(sim.structures[0].hp[3]).toBe(65);
  }));
});

describe('authored directional support loss',()=>{
  for(const phase of ['climb','mantle'] as const)it(`accepted load-post hits remove only the dependent roof and interrupt ${phase} into an actual supported fall`,()=>withSim(sim=>{
    const supports=district.structures[2],sector=district.blocks.find(b=>b.support)!,building=district.buildings[0];
    const shooter=sim.addActor('shooter','Pilot','bastion',false,{x:109,y:.92,z:16});advance(sim,1,shooter);
    for(const cell of supports.cells.slice(0,4))fireAt(sim,shooter,cell);
    expect(cityBlockActive(sector,sim.structures)).toBe(true);
    const a=sim.addActor('climber','Pilot','pounce',false,{x:building.anchor.position.x-2.05,y:.92,z:16});advance(sim,1,a);
    const yaw=-Math.PI/2;let reached=false;
    for(let i=0;i<500;i++){
      const forward=phase==='mantle'||a.position.y<3.1?1:0;
      input(sim,a,{climb:true,forward,yaw});sim.step(1/60);
      if(a.climb?.phase===phase&&(phase!=='climb'||forward===0&&a.position.y>3.1)){reached=true;break;}
    }
    expect(reached).toBe(true);const before={...a.position};
    const walker=sim.addActor('walker','Pilot','caracal',false,{x:101.8,y:8.92,z:16});sim.world.step();
    const target=supports.cells[4],aim=Math.atan2(-(target.position[0]-shooter.position.x),-(target.position[2]-shooter.position.z));
    for(let i=0;i<110&&cityBlockActive(sector,sim.structures);i++){input(sim,a,{climb:true,forward:phase==='mantle'?1:0,yaw});input(sim,shooter,{fire:true,yaw:aim});input(sim,walker);sim.step(1/60);}
    expect(cityBlockActive(sector,sim.structures)).toBe(false);expect(sim.structures[2].hp.filter(h=>h===0)).toHaveLength(5);expect(sim.structures[0].hp.every(h=>h===65)).toBe(true);
    advance(sim,3,a);expect(a.climb).toBeNull();expect(a.grounded).toBe(true);expect(a.position.y).toBeLessThan(before.y+.1);expect(walker.position.y).toBeLessThan(2);expect(walker.grounded).toBe(true);
    const holeRay=sim.world.castRay(new RAPIER.Ray({x:99,y:9,z:16},{x:0,y:-1,z:0}),2,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);expect(holeRay).toBeNull();
    const solidRay=sim.world.castRay(new RAPIER.Ray({x:109,y:9,z:16},{x:0,y:-1,z:0}),2,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);expect(solidRay).not.toBeNull();
    sim.syncChunks([{x:-200,y:1,z:-200}]);sim.syncChunks([a.position,walker.position,shooter.position]);sim.world.step();expect(sim.world.castRay(new RAPIER.Ray({x:99,y:9,z:16},{x:0,y:-1,z:0}),2,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC)).toBeNull();
    sim.removeActor(a.id);sim.removeActor(walker.id);sim.removeActor(shooter.id);
    const alternate=building.anchors[1],returning=sim.addActor('returning','Pilot','bastion',false,{x:109,y:.92,z:alternate.position.z-2.35});advance(sim,1,returning);
    let grabbed=false,done=false;for(let i=0;i<500;i++){input(sim,returning,{climb:true,forward:1,yaw:Math.PI});sim.step(1/60);if(returning.climb)grabbed=true;else if(grabbed){done=true;break;}}
    expect(done).toBe(true);expect(returning.position.y-1).toBeGreaterThan(7.9);
  }));
  it('a collapsed roof home rejects the unsupported nominal spawn and admits its guardian on the surviving supported sector',()=>withSim(sim=>{
    const supports=district.structures[2],shooter=sim.addActor('shooter','Pilot','bastion',false,{x:109,y:.92,z:16});advance(sim,1,shooter);
    for(const cell of supports.cells.slice(0,5))fireAt(sim,shooter,cell);
    sim.removeActor(shooter.id);
    const guard=sim.addActor('test-guardian','Guardian','pounce',true,{x:99,y:8.92,z:16},'anchor');guard.hp=0;guard.respawnAt=sim.time;
    advance(sim,.1);expect(guard.hp).toBe(guard.maxHp);expect(guard.position.x).toBeGreaterThan(106);expect(guard.position.y-1).toBeGreaterThan(7.9);
    const roof=roofSurfaces(7734).find(r=>r.id===district.buildings[0].roof.id)!;
    const path=roofPath(roof,{x:109,y:8.92,z:11},{x:109,y:8.92,z:21},2.2,p=>{
      for(const [dx,dz] of [[0,0],[-2.2,-2.2],[2.2,-2.2],[-2.2,2.2],[2.2,2.2]])if(!sim.world.castRay(new RAPIER.Ray({x:p.x+dx,y:8.1,z:p.z+dz},{x:0,y:-1,z:0}),.4,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC))return false;
      return true;
    });
    expect(path.length).toBeGreaterThan(0);expect(path.every(p=>p.x>=106.2)).toBe(true);
  }));
  it('delays a collapsed-home guardian when every surviving supported candidate is covered, then safely retries',()=>withSim(sim=>{
    const supports=district.structures[2],shooter=sim.addActor('shooter','Pilot','bastion',false,{x:109,y:.92,z:16});advance(sim,1,shooter);for(const cell of supports.cells.slice(0,5))fireAt(sim,shooter,cell);sim.removeActor(shooter.id);
    const blocker=sim.world.createCollider(RAPIER.ColliderDesc.cuboid(5,2,9).setTranslation(109,9.92,16));sim.world.step();
    const guardian=sim.addActor('pending-guardian','Guardian','pounce',true,{x:99,y:8.92,z:16},'anchor');guardian.hp=0;guardian.respawnAt=sim.time;advance(sim,1);
    expect(guardian.hp).toBe(0);expect(guardian.respawnAt).toBeGreaterThan(sim.time);
    sim.world.removeCollider(blocker,true);advance(sim,.6);expect(guardian.hp).toBe(guardian.maxHp);expect(guardian.position.x).toBeGreaterThan(106);expect(guardian.grounded).toBe(true);
  }));
});
