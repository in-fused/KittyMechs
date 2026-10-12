import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Matrix4,Vector3} from 'three';
import {buildOverhaulDistrict,getOverhaulComponent} from '../shared/overhaulDistrict';
import {buildOverhaulDressing,isOverhaulDressingBlock} from '../shared/overhaulDressing';
import {cityBlockActive,type CityBlock} from '../shared/cityDistrict';
import {Simulation} from '../shared/simulation';
import type {Vec3} from '../shared/types';

const district=buildOverhaulDistrict(7734)!,dressing=buildOverhaulDressing(district);
const published=district.blocks.filter(isOverhaulDressingBlock);
const source=(suffix:string)=>published.find(block=>block.id==='7734:overhaul:dressing:'+suffix)!;
beforeAll(async()=>{await RAPIER.init();await MeshoptDecoder.ready;});
function native(){
 const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'coop');
 for(const actor of [...sim.actors.values()])if(actor.bot)sim.removeActor(actor.id);
 sim.syncChunks(published.map(block=>({x:block.position[0],y:block.position[1],z:block.position[2]})));world.step();
 const colliders=new Map<string,RAPIER.Collider>();
 for(const block of published){
  const matches:RAPIER.Collider[]=[];world.colliders.forEach(c=>{
   const half=c.halfExtents(),position=c.translation();if(!(c.shape instanceof RAPIER.Cuboid)||!half)return;
   if(Math.abs(position.x-block.position[0])<1e-4&&Math.abs(position.y-block.position[1])<1e-4&&Math.abs(position.z-block.position[2])<1e-4&&Math.abs(half.x-block.halfExtents[0])<1e-4&&Math.abs(half.y-block.halfExtents[1])<1e-4&&Math.abs(half.z-block.halfExtents[2])<1e-4)matches.push(c);
  });
  expect(matches,block.id+' requires one exact native source collider').toHaveLength(1);colliders.set(block.id,matches[0]);
 }
 const breakCell=(block:CityBlock)=>{
  // Exercise production HP acceptance, support closure, retirement and native
  // persistent ruin admission; this is deliberately not a weapon-aim test.
  (sim as unknown as {damageCell:(b:CityBlock,n:number,owner:string,p:Vec3,incoming:Vec3,normal:Vec3)=>void}).damageCell(block,10000,'native-dressing-test',{x:block.position[0],y:block.position[1],z:block.position[2]},{x:0,y:-1,z:0},{x:0,y:1,z:0});
 };
 const assertRetired=(block:CityBlock)=>{
  expect(cityBlockActive(block,sim.structures),block.id).toBe(false);expect(colliders.get(block.id)?.isValid(),block.id).toBe(false);
  const index=district.blocks.indexOf(block),ruin=sim.snapshot().ruins?.find(ruin=>ruin.block===index);expect(ruin,block.id+' requires persistent authoritative source pose').toBeDefined();
  const owner=(sim as unknown as {ruinsOwner:{collider:(index:number)=>RAPIER.Collider|null}}).ruinsOwner,collider=owner.collider(index)!;
  expect(collider.isValid()).toBe(true);const half=collider.halfExtents()!;expect(half.x).toBeCloseTo(block.halfExtents[0],5);expect(half.y).toBeCloseTo(block.halfExtents[1],5);expect(half.z).toBeCloseTo(block.halfExtents[2],5);
 };
 return {sim,world,colliders,breakCell,assertRetired,close:()=>{sim.dispose();world.free();}};
}

describe('published owned yard dressing native contract',()=>{
 it('publishes all143 bounded component identities and places every GLB vertex inside its exact native collider',async()=>{
  expect(published).toHaveLength(143);expect(dressing.structures).toHaveLength(21);expect(new Set(published.map(block=>block.id)).size).toBe(143);
  for(const bank of dressing.structures)expect(bank.cells.length).toBeLessThanOrEqual(32);
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const moduleVertices=new Map<string,Vector3[]>();
  for(const file of ['public/assets/overhaul/dressing-v1/Rainline_Dressing_v1.glb','public/assets/overhaul/dressing-v2/Rainline_Dressing_v2.glb']){
   const doc=await io.read(file);expect(doc.getRoot().listMaterials()).toHaveLength(1);expect(doc.getRoot().listTextures()).toHaveLength(0);
   for(const root of doc.getRoot().listScenes()[0].listChildren()){
   const vertices:Vector3[]=[];for(const node of root.listChildren())for(const primitive of node.getMesh()?.listPrimitives()??[]){
    expect(primitive.getAttribute('COLOR_0')).toBeTruthy();const positions=primitive.getAttribute('POSITION')!,transform=new Matrix4().fromArray(node.getWorldMatrix());
    for(let i=0;i<positions.getCount();i++)vertices.push(new Vector3().fromArray(positions.getElement(i,[])).applyMatrix4(transform));
   }
   for(const axis of ['x','y','z'] as const){expect(Math.min(...vertices.map(v=>v[axis]))).toBeCloseTo(-.5,3);expect(Math.max(...vertices.map(v=>v[axis]))).toBeCloseTo(.5,3);}
   moduleVertices.set(root.getName(),vertices);
   }
  }
  const run=native();try{
   for(const block of published){expect(getOverhaulComponent(block)).toBeDefined();expect(block.yaw).toBe(0);const module=dressing.components.get(block.id)!.module,vertices=moduleVertices.get(module);expect(vertices,module).toBeDefined();
    for(const v of vertices!)for(const [axis,i] of [['x',0],['y',1],['z',2]] as const){const world=v[axis]*2*block.halfExtents[i]+block.position[i];expect(world).toBeGreaterThanOrEqual(block.position[i]-block.halfExtents[i]-1e-4);expect(world).toBeLessThanOrEqual(block.position[i]+block.halfExtents[i]+1e-4);}
   }
  }finally{run.close();}
 },20000);
 it('retires the new open shelter canopy and its board when one real post breaks',()=>{
  const run=native();try{run.breakCell(source('vista-relay-transit:post-0'));for(const suffix of ['post-0','canopy','departure-board'])run.assertRetired(source('vista-relay-transit:'+suffix));expect(cityBlockActive(source('vista-relay-transit:bench-0'),run.sim.structures)).toBe(true);}finally{run.close();}
 },20000);
 it('retires every new power component from its pad and every centered roof apparatus from any supporting quarter',()=>{
  const run=native();try{run.breakCell(source('vista-east-power:pad'));for(const block of published.filter(b=>b.buildingId.endsWith(':vista-east-power')))run.assertRetired(block);
   run.breakCell(district.blocks.find(b=>b.id==='7734:overhaul:relay-east-entry:roof-0')!);for(const block of published.filter(b=>b.buildingId.endsWith(':vista-roof-relay-east-entry')))run.assertRetired(block);
   expect(cityBlockActive(source('vista-spawn-crawler:cab'),run.sim.structures)).toBe(true);
  }finally{run.close();}
 },20000);
 it('removes a damaged shelterpost and its canopy/board through production support closure, preserving seating',()=>{
  const run=native();try{const post=source('civic-shelter:post-0');run.breakCell(post);for(const block of [post,source('civic-shelter:canopy'),source('civic-shelter:route-board')])run.assertRetired(block);expect(cityBlockActive(source('civic-seating:bench-0-seat'),run.sim.structures)).toBe(true);expect(run.colliders.get(source('civic-shelter:post-1').id)!.isValid()).toBe(true);}finally{run.close();}
 },20000);
 it('removes every transformer/insulator/duct/sign dependent when its real utility pad breaks',()=>{
  const run=native();try{run.breakCell(source('utility-bank:pad'));for(const block of published.filter(b=>b.buildingId==='7734:overhaul:dressing:utility-bank'))run.assertRetired(block);expect(cityBlockActive(source('works-crawler:cab'),run.sim.structures)).toBe(true);}finally{run.close();}
 },20000);
 it('drops all three service pipes when one supporting post breaks while grounded cabinet survives',()=>{
  const run=native();try{const post=source('works-pipes:stanchion-26.1');run.breakCell(post);run.assertRetired(post);for(let i=0;i<3;i++)run.assertRetired(source('works-pipes:pipe-'+i));expect(cityBlockActive(source('works-pipes:valve-cabinet'),run.sim.structures)).toBe(true);}finally{run.close();}
 },20000);
 it('drops only the selected roof quadrant apparatus and preserves other roof assemblies',()=>{
  const run=native();try{const roof=district.blocks.find(block=>block.id==='7734:overhaul:spawn-west:roof-3')!;run.breakCell(roof);for(const block of published.filter(b=>b.buildingId==='7734:overhaul:dressing:roof-spawn-west'))run.assertRetired(block);expect(cityBlockActive(source('roof-spawn-east:apparatus'),run.sim.structures)).toBe(true);expect(run.colliders.get(source('roof-spawn-east:apparatus').id)!.isValid()).toBe(true);}finally{run.close();}
 },20000);
});
