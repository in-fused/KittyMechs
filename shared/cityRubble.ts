import type RAPIER from '@dimforge/rapier3d-compat';
import type {CityBlock} from './cityDistrict';
import {cityFractureAssetFor,cityFractureCenter,type CityFractureAsset} from './cityFracture';
import type {Vec3} from './types';
import {applyCharacterRubbleImpulses,type CharacterRubbleContact,type CharacterRubbleImpulseBudget} from './characterRubbleImpulse';
import {applyCityRubbleImpact,validateCityRubbleImpact,type CityRubbleImpact,type CityRubbleImpulseReceipt} from './cityRubbleImpact';
export const MAX_CITY_RUBBLE_BODIES=24;
export const CITY_RUBBLE_LIFETIME=8;
export interface CityRubbleState {id:string;blockId:string;piece:number;born:number;expires:number;position:Vec3;rotation:{x:number;y:number;z:number;w:number}}
interface Piece {state:Omit<CityRubbleState,'position'|'rotation'>;body:RAPIER.RigidBody;collider:RAPIER.Collider}
interface Group {blockId:string;born:number;pieces:Piece[];impact?:CityRubbleImpulseReceipt}
/** Owns detached native bodies independently of streamed chunks. Failures latch
 * the owner: callers must abort physics/publication. Cleanup is best effort,
 * never a whole-world rollback; prior capacity evictions cannot be undone. */
export class CityRubbleOwner {
 private groups:Group[]=[];
 private readonly seen=new Set<string>();
 private failed=false;
 private active=false;
 constructor(private readonly rapier:typeof RAPIER,private readonly world:RAPIER.World,private readonly asset:CityFractureAsset){
  if(asset.pieces.length!==8||asset.fragmentCount!==8||new Set(asset.pieces.map(p=>p.id)).size!==8)throw Error('Eight unique city fracture pieces required');
 }
 private enter(){if(this.active)throw Error('Reentrant city rubble ownership');if(this.failed)throw Error('City rubble ownership failed');}
 private fail(errors:unknown[]):never{this.failed=true;if(errors.length===1)throw errors[0];throw new AggregateError(errors,'City rubble construction/cleanup failure');}
 private remove(groups:Group[],errors:unknown[]){for(const g of groups)for(const p of g.pieces){
  let present=true;try{present=this.world.getRigidBody(p.body.handle)!=null;}catch(error){errors.push(error);this.failed=true;}
  if(present)try{this.world.removeRigidBody(p.body);}catch(error){errors.push(error);this.failed=true;}
 }}
 private prune(errors:unknown[]){this.groups=this.groups.filter(g=>{let residual=false;for(const p of g.pieces){try{if(this.world.getRigidBody(p.body.handle)!=null)residual=true;}catch(error){errors.push(error);this.failed=true;residual=true;}}return residual;});}
 get bodyCount(){return this.groups.reduce((n,g)=>n+g.pieces.filter(p=>this.world.getRigidBody(p.body.handle)!=null).length,0);}
 spawn(block:CityBlock,at:number,incoming:Vec3,impact?:CityRubbleImpact):void {
  this.enter();this.active=true;
  const staged:Piece[]=[];
  try{
   if(this.seen.has(block.id))return;
   if(!block.id||block.part==='fixture'||![at,at+CITY_RUBBLE_LIFETIME,block.yaw,...block.position,...block.halfExtents,...Object.values(incoming)].every(Number.isFinite)||block.halfExtents.some(x=>x<=0))throw Error('Invalid city rubble source');
   if(impact)validateCityRubbleImpact(impact);
   // Build every convex descriptor before eviction or body creation.
   const selected=cityFractureAssetFor(block,this.asset);
   if(selected.fragmentCount!==8||selected.pieces.length!==8||new Set(selected.pieces.map(p=>p.id)).size!==8)throw Error('Eight unique city fracture pieces required');
   const descriptors=selected.pieces.map(piece=>{const scaled=new Float32Array(piece.positions.map((v,i)=>v*block.halfExtents[i%3]*2));if(scaled.length<12||scaled.length%3||!scaled.every(Number.isFinite))throw Error('Invalid city rubble vertices');const collider=this.rapier.ColliderDesc.convexHull(scaled);if(!collider)throw Error('Invalid city rubble convex hull');return{piece,collider:collider.setFriction(.65).setRestitution(.05).setDensity(300),center:cityFractureCenter(block,piece)};});
   const evict:Group[]=[];let count=this.bodyCount;for(const group of [...this.groups].sort((a,b)=>a.born-b.born)){if(count+8<=MAX_CITY_RUBBLE_BODIES)break;evict.push(group);count-=group.pieces.length;}
   const evictionErrors:unknown[]=[];this.remove(evict,evictionErrors);this.prune(evictionErrors);if(evictionErrors.length)this.fail(evictionErrors);
   const length=Math.hypot(incoming.x,incoming.y,incoming.z),factor=length?1/length:0;
   const rotation={x:0,y:Math.sin(block.yaw/2),z:0,w:Math.cos(block.yaw/2)};
   // Ownership is retained before any body allocation; a getter fault cannot lose residuals.
   const group:Group={blockId:block.id,born:at,pieces:staged};this.groups.push(group);
   for(const {piece,collider,center}of descriptors){const body=this.world.createRigidBody(this.rapier.RigidBodyDesc.dynamic().setTranslation(center.x,center.y,center.z).setRotation(rotation).setLinvel(impact?0:incoming.x*factor,impact?0:incoming.y*factor+.25,impact?0:incoming.z*factor).setCcdEnabled(true).setLinearDamping(.8).setAngularDamping(1));
    // Track the body before createCollider can throw.
    const record={state:{id:`${block.id}:${piece.id}`,blockId:block.id,piece:piece.id,born:at,expires:at+CITY_RUBBLE_LIFETIME},body,collider:null as unknown as RAPIER.Collider};staged.push(record);record.collider=this.world.createCollider(collider,body);
   }
   if(impact)group.impact=applyCityRubbleImpact(block,staged.map(p=>({id:p.state.piece,body:p.body,collider:p.collider})),impact);
   this.seen.add(block.id);
  }catch(primary){this.failed=true;const errors=[primary];this.remove([{blockId:block.id,born:at,pieces:staged}],errors);this.prune(errors);this.fail(errors);}finally{this.active=false;}
 }
 expire(at:number):void{this.enter();this.active=true;try{if(!Number.isFinite(at))throw Error('Invalid rubble clock');const expired=this.groups.filter(g=>g.born+CITY_RUBBLE_LIFETIME<=at),errors:unknown[]=[];this.remove(expired,errors);this.prune(errors);if(errors.length)this.fail(errors);}catch(error){this.failed=true;throw error;}finally{this.active=false;}}
 private readState():CityRubbleState[]{return this.groups.flatMap(g=>g.pieces.map(p=>{
  if(this.world.getRigidBody(p.body.handle)!==p.body||this.world.getCollider(p.collider.handle)!==p.collider||p.collider.parent()?.handle!==p.body.handle)throw Error('Lost native city rubble ownership');
  const position={...p.body.translation()},rotation={...p.body.rotation()};
  if(!Object.values(position).every(v=>Number.isFinite(v)&&Math.abs(v)<10000)||!Object.values(rotation).every(Number.isFinite)||Math.abs(Math.hypot(rotation.x,rotation.y,rotation.z,rotation.w)-1)>.001)throw Error('Invalid native city rubble pose');
  return {...p.state,position,rotation};
 }));}
 snapshot():CityRubbleState[]{this.enter();this.active=true;try{return this.readState();}catch(error){this.failed=true;throw error;}finally{this.active=false;}}
 colliderHandles():ReadonlySet<number>{this.enter();this.active=true;try{this.readState();return new Set(this.groups.flatMap(g=>g.pieces.map(p=>p.collider.handle)));}catch(error){this.failed=true;throw error;}finally{this.active=false;}}
 applyCharacterContacts(contacts:readonly CharacterRubbleContact[],budget:CharacterRubbleImpulseBudget):void {
  this.enter();this.active=true;try{this.readState();applyCharacterRubbleImpulses(contacts,this.groups.flatMap(g=>g.pieces.map(p=>({id:p.state.id,body:p.body,collider:p.collider}))),budget);}catch(error){this.failed=true;throw error;}finally{this.active=false;}
 }
 dispose():void{if(this.active)throw Error('Reentrant city rubble cleanup');this.active=true;try{const errors:unknown[]=[];this.remove(this.groups,errors);this.prune(errors);if(errors.length)this.fail(errors);}finally{this.active=false;}}
}
