import {describe,it,expect} from 'vitest';
import {terrainHeight} from '../../shared/world.ts';
import {groundPointClear138,planGroundPath138} from './exposure-planner.mjs';
import {createPlanningRead151,chooseStage151} from './planning-read.mjs';
const actor=(id,bot,x=0,z=0)=>({id,name:id,bot,chassis:'pounce',role:'raider',hp:220,grounded:true,jumpEpoch:1,position:{x,y:terrainHeight(x,z,7734)+1,z},velocity:{x:0,y:0,z:0}});
const geometry=()=>({snapshot:{seed:7734,cover:[]},blocks:[],props:new Map(['-1,-1','-1,0','0,-1','0,0'].map(id=>[id,[]])),parked:[],moverId:'host',movementYaw:0});
describe('151 exact current planning contract without native world',()=>{
 it('retains NPC occupancy as a live obstacle and distinguishes it from static bounds',()=>{
  const g=geometry(),npc=actor('npc',true);g.parked=[npc];expect(groundPointClear138(g,{x:0,z:0})).toBe(false);expect(g.lastBlock).toMatchObject({kind:'NPC_OCCUPANCY',owner:'npc'});
  npc.position.x=12;expect(groundPointClear138(g,{x:0,z:0})).toBe(true);
  g.blocks=[{id:'wall',position:[0,terrainHeight(0,0,7734)+1,0],halfExtents:[1,1,1],yaw:0}];expect(groundPointClear138(g,{x:0,z:0})).toBe(false);expect(g.lastBlock).toMatchObject({kind:'STATIC_BLOCK',owner:'wall'});
 });
 it('returns the actual target rejection branch and owner before searching or issuing controls',()=>{
  const g=geometry();g.parked=[actor('npc',true)];expect(planGroundPath138(g,{x:8,z:0},{x:0,z:0})).toBeNull();expect(g.rejection).toMatchObject({branch:'TARGET_BLOCKED',blocker:{owner:'npc',kind:'NPC_OCCUPANCY'}});
 });
 it('detaches one admitted read, uses its actual camera yaw and rejects missing send/life identity',()=>{
  const a=actor('host',false),s={seed:7734,tick:44,time:44/60,room:'fixture',publication:{roomEpoch:'fixture',sequence:7,kind:'broadcast'},actors:[a],structures:[],cover:[],ruins:[]},view={snapshot:s,camera:{movementYaw:.7},input:{lastSent:{generation:2,localId:a.id,input:{jumpEpoch:1}}}};
  const current=createPlanningRead151(view,'host');s.tick=45;a.position.x=99;view.camera.movementYaw=1;expect(current.read.tick).toBe(44);expect(current.actor.position.x).toBe(0);expect(current.read.movementYaw).toBe(.7);
  expect(()=>createPlanningRead151({...view,input:{lastSent:{generation:2,localId:a.id,input:{jumpEpoch:2}}}},'host')).toThrow(/identity/);
  expect(()=>createPlanningRead151(view,'host',()=>{throw Error('first genuine failure');})).toThrow('first genuine failure');
 });
 it('assesses every staging candidate using exactly one current read and retains unchanged arrival/reach',()=>{
  const read={tick:60,publication:{sequence:12}},calls=[],current={read,actor:{position:{x:0,z:0}},route:p=>{calls.push({p,read});return {read,target:p,path:calls.length===3?[p]:null,rejection:calls.length===3?null:{branch:'TARGET_BLOCKED',blocker:{kind:'NPC_OCCUPANCY',owner:'npc'}}};}};
  const selected=chooseStage151(current,{x:0,z:8},{reach:4});expect(calls).toHaveLength(3);expect(calls.every(c=>c.read===read)).toBe(true);expect(selected.read).toBe(read);expect(selected.assessed).toHaveLength(3);expect(selected.worstArrivalDistance).toBeLessThan(4);
 });
});
