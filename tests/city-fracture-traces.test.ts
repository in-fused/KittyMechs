import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {cityDistrict} from '../shared/cityDistrict';
import {parseInput} from '../shared/protocol';
import {emptyInput,type CombatEvent,type GameSnapshot} from '../shared/types';
import {writeFileSync,mkdirSync} from 'node:fs';
beforeAll(async()=>{await RAPIER.init();});
const district=cityDistrict(7734)!;
const sources=[{family:'face',block:district.structures.find(s=>s.id==='7734:city:building-0:facade')!.cells[3],start:{x:123,y:.92,z:0},up:false},{family:'post',block:district.structures.find(s=>s.id==='7734:city:extension-0:supports')!.cells[1],start:{x:206.3,y:.92,z:11},up:false},{family:'slab',block:district.structures.find(s=>s.id==='7734:city:extension-0:roof-cells')!.cells[0],start:{x:205,y:.92,z:11.5},up:true}];
for(const source of sources)it(`records actual accepted parsed pulse ${source.family} through native expiry`,()=>{
 const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp','TRACE',RAPIER,{experimentalPhysicalRubble:true}),actor=sim.addActor('pilot','Source trace','pounce',false,{...source.start,z:source.family==='face'?source.block.position[2]:source.start.z}),frames:GameSnapshot[]=[],events=new Map<number,CombatEvent>();let sequence=0,winning:CombatEvent|undefined,terminalError:string|undefined;
 const step=(fire=false)=>{const dx=source.block.position[0]-actor.position.x,dz=source.block.position[2]-actor.position.z,yaw=source.up?0:Math.atan2(-dx,-dz),pitch=source.up?1.3:Math.atan2(source.block.position[1]-actor.position.y-.65,Math.hypot(dx,dz));const input=parseInput({...emptyInput(),seq:++sequence,jumpEpoch:actor.jumpEpoch,yaw,pitch,fire,weapon:'pulse'});if(!input)throw Error('Invalid parsed trace input');sim.setInput(actor.id,input);sim.step(1/60);const snapshot=sim.snapshot();frames.push(snapshot);for(const event of snapshot.events)events.set(event.id,event);};
 try{frames.push(sim.snapshot());for(let i=0;i<60;i++)step();for(let i=0;i<240;i++){step(true);if(sim.structures.find(s=>s.id===source.block.structureId)!.hp[source.block.cellId!]===0)break;}
 expect(sim.structures.find(s=>s.id===source.block.structureId)!.hp[source.block.cellId!]).toBe(0);winning=[...events.values()].find(e=>e.type==='structure-break'&&e.structureId===source.block.structureId&&e.cellId===source.block.cellId);expect(winning).toBeDefined();expect(winning!.weapon).toBe('pulse');expect(sim.rubble.filter(p=>p.blockId===source.block.id)).toHaveLength(0);const acceptedTick=sim.tick;step();const born=sim.rubble.filter(p=>p.blockId===source.block.id);expect(born).toHaveLength(8);expect(sim.tick).toBe(acceptedTick+1);expect(born.every(p=>p.born===sim.time&&p.expires===p.born+8)).toBe(true);
 for(let i=0;i<540;i++)step();for(const frame of frames){const pieces=frame.rubble.filter(p=>p.blockId===source.block.id);expect(pieces.length===0||pieces.length===8).toBe(true);for(const p of frame.rubble){expect(Object.values(p.position).every(Number.isFinite)).toBe(true);expect(Object.values(p.rotation).every(Number.isFinite)).toBe(true);}}
 expect(sim.rubble).toHaveLength(0);expect(world.bodies.getAll().filter(b=>b.isDynamic())).toHaveLength(0);
 }catch(error){terminalError=error instanceof Error?error.message:String(error);throw error;}
 finally{const directory=process.env.CITY_FRACTURE_TRACES;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(`${directory}/${source.family}.json`,JSON.stringify({scope:'Declared source placement, original Simulation dedicated native step and ordinary parsed pulse; not default-spawn/worldwide route',sourceBlock:source.block,event:winning,frames,events:[...events.values()],terminalError}));}sim.dispose();expect(world.bodies.len()).toBe(0);world.free();}
},30000);
