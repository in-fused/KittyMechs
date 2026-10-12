import {INPUT_PROTOCOL_VERSION,inputCounter,jumpEnvelope,validStrikePitch} from './inputProtocol';
import {validStanceRequest} from './stanceFeedback';
import {WORLD_LAYOUT_VERSION} from './layout';
import {cityDistrict} from './cityDistrict';
import { clamp } from './math';
import { CHASSIS } from './config';
import {buildingFaces,faceCoordinates,type BuildingFace} from './buildingSurfaces';
import {climbAnchors} from './traversal';
import {workshopGeometry,workshopRoofMax} from './workshopGeometry';
import type { ClimbState,FelineStrikeState,InputState, JoinRequest, StrikeInputReceipt,StructureState,Vec3 } from './types';
import {overhaulCornerSample,parseOverhaulCorner} from './overhaulCornerClimb';
export function parseInput(value:unknown):InputState|null {
  if(!value||typeof value!=='object')return null;
  const v=value as Record<string,unknown>;
  if(!['seq','forward','strafe','yaw','pitch'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k])))return null;
  if(v.aimYaw!==undefined&&(typeof v.aimYaw!=='number'||!Number.isFinite(v.aimYaw)))return null;
  if(!validStrikePitch(v.strikePitch))return null;
  if(!inputCounter(v.seq)||!jumpEnvelope(v.jumpId,v.jumpCancel,v.jumpEpoch,v.jump)||!jumpEnvelope(v.strikeId,v.strikeCancel,v.strikeEpoch,v.strike))return null;
  if(!['fire','rocket','jump','boost','interact'].every(k=>typeof v[k]==='boolean'))return null;
  if(v.stance!==undefined&&v.stance!=='quadruped'&&v.stance!=='upright')return null;
  if(v.stanceRequest!==undefined&&!validStanceRequest(v.stanceRequest,Number(v.seq)))return null;
  if(v.climb!==undefined&&typeof v.climb!=='boolean')return null;
  return {seq:v.seq as number,jumpId:v.jumpId as number,jumpCancel:v.jumpCancel as number,jumpEpoch:v.jumpEpoch as number,strikeId:v.strikeId as number,strikeCancel:v.strikeCancel as number,strikeEpoch:v.strikeEpoch as number,strike:v.strike as boolean,forward:clamp(v.forward as number,-1,1),strafe:clamp(v.strafe as number,-1,1),yaw:(v.yaw as number)%(Math.PI*2),aimYaw:((v.aimYaw??v.yaw) as number)%(Math.PI*2),pitch:clamp(v.pitch as number,-1.3,1.3),...(v.strikePitch!==undefined?{strikePitch:v.strikePitch}:{}),fire:v.fire as boolean,rocket:v.rocket as boolean,jump:v.jump as boolean,boost:v.boost as boolean,interact:v.interact as boolean,stance:v.stance==='upright'?'upright':'quadruped',climb:v.climb===true,...(v.stanceRequest!==undefined?{stanceRequest:{...(v.stanceRequest as {seq:number;life:number})}}:{})};
}

/** Diagnostic admission cannot alter action acceptance. Exact queue values are
 * immutable for an id and discarded when its authority-issued life retires. */
export function parseStrikeReceipt(value:unknown,life:number,lastInput:number,tick:number,time:number,previous?:StrikeInputReceipt):StrikeInputReceipt|null|undefined {
  if(value===undefined)return previous?.life===life?null:undefined;
  if(!value||typeof value!=='object')return null;
  const v=value as Record<string,unknown>;
  // lastInput describes the currently applied sample and can reset to seq0 on
  // native timeout. It cannot upper-bound a durable earlier admitted sequence.
  if(!inputCounter(lastInput)||!inputCounter(v.id)||v.id===0||v.life!==life||!inputCounter(v.inputSeq)||v.inputSeq===0||!inputCounter(v.queuedTick)||v.queuedTick>tick||
    typeof v.queuedAt!=='number'||!Number.isFinite(v.queuedAt)||v.queuedAt<0||v.queuedAt>time||typeof v.aimYaw!=='number'||!Number.isFinite(v.aimYaw)||
    typeof v.strikePitch!=='number'||!validStrikePitch(v.strikePitch)||typeof v.weaponPitch!=='number'||!Number.isFinite(v.weaponPitch)||Math.abs(v.weaponPitch)>1.3||
    v.pitchSource!=='look'&&v.pitchSource!=='legacy-weapon'||v.pitchSource==='legacy-weapon'&&v.strikePitch!==v.weaponPitch)return null;
  const receipt:StrikeInputReceipt={id:v.id,life,inputSeq:v.inputSeq,queuedTick:v.queuedTick,queuedAt:v.queuedAt,aimYaw:v.aimYaw,strikePitch:v.strikePitch,weaponPitch:v.weaponPitch,pitchSource:v.pitchSource};
  if(previous?.life===life&&(receipt.id<previous.id||receipt.id===previous.id&&(Object.keys(receipt) as (keyof StrikeInputReceipt)[]).some(key=>receipt[key]!==previous[key])||receipt.id>previous.id&&(receipt.inputSeq<=previous.inputSeq||receipt.queuedTick<previous.queuedTick||receipt.queuedAt<previous.queuedAt)))return null;
  return receipt;
}

/** Only finite life-bound, time-bound accepted actions enter presentation. */
export function parseFelineStrike(value:unknown,life:number,processed:number,time:number,previous:FelineStrikeState|null=null):FelineStrikeState|null|undefined {
  if(value===null)return null;
  if(!value||typeof value!=='object')return undefined;
  const v=value as Record<string,unknown>;
  if(!inputCounter(v.id)||v.id===0||v.id>processed||v.life!==life||!['pounce','tackle','dive'].includes(String(v.kind))||!['flight','recovery'].includes(String(v.stage))||
    !['acceptedAt','stageAt','endsAt'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k]))||Number(v.acceptedAt)<0||Number(v.acceptedAt)>time||time-Number(v.acceptedAt)>1.25||Number(v.stageAt)<Number(v.acceptedAt)||Number(v.stageAt)>time||Number(v.endsAt)<=Number(v.stageAt)||Number(v.endsAt)-Number(v.stageAt)>2||
    v.stage==='flight'&&v.stageAt!==v.acceptedAt||!finiteVector(v.direction)||Math.abs(Math.hypot(v.direction.x,v.direction.y,v.direction.z)-1)>1e-5||v.side!==-1&&v.side!==1)return undefined;
  if(previous?.life===life&&previous.id===v.id&&(previous.acceptedAt!==v.acceptedAt||previous.kind!==v.kind||previous.side!==v.side||previous.direction.x!==v.direction.x||previous.direction.y!==v.direction.y||previous.direction.z!==v.direction.z||previous.stage==='recovery'&&v.stage!=='recovery'||previous.stage===v.stage&&(previous.stageAt!==v.stageAt||previous.endsAt!==v.endsAt)))return undefined;
  return {id:v.id,life,kind:v.kind as FelineStrikeState['kind'],acceptedAt:Number(v.acceptedAt),stage:v.stage as FelineStrikeState['stage'],stageAt:Number(v.stageAt),endsAt:Number(v.endsAt),direction:{...v.direction},side:v.side};
}

const finiteVector=(value:unknown):value is Vec3=>!!value&&typeof value==='object'&&['x','y','z'].every(axis=>typeof (value as Record<string,unknown>)[axis]==='number'&&Number.isFinite((value as Record<string,unknown>)[axis]));
/** Undefined means invalid; null is the legitimate detached state. Never admit
 * a forged face, an arbitrary wall plane or aliased sender-owned contact data. */
export function parseClimbState(value:unknown,seed:number,time:number,additionalFaces:readonly BuildingFace[]=[]):ClimbState|null|undefined {
  if(value===null)return null;
  if(!value||typeof value!=='object')return undefined;
  const v=value as Record<string,unknown>;
  if(typeof v.anchor!=='string'||!['grab','cling','climb','mantle'].includes(String(v.phase))||
    !['startedAt','progress','base','height','top','mantleStageAt'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k]))||
    Number(v.startedAt)<0||Number(v.startedAt)>time+1e-6||Number(v.progress)<0||Number(v.progress)>1||
    !['gripMask','roofMask'].every(k=>Number.isInteger(v[k])&&Number(v[k])>=0&&Number(v[k])<=15)||
    (Number(v.gripMask)&Number(v.roofMask))!==0||v.phase!=='mantle'&&v.roofMask!==0||!finiteVector(v.normal)||!finiteVector(v.contact)||
    (v.phase==='mantle'?!['out','lift','transfer','settle'].includes(String(v.mantleStage)):v.mantleStage!==null)||
    v.phase==='mantle'&&(v.gripMask!==0||['out','lift'].includes(String(v.mantleStage))&&v.roofMask!==0)||
    Number(v.mantleStageAt)<0||Number(v.mantleStageAt)>time+1e-6||v.phase==='mantle'&&Number(v.mantleStageAt)<Number(v.startedAt))return undefined;
  const faces=[...buildingFaces(seed),...additionalFaces],direct=faces.find(f=>f.id===v.anchor),legacy=direct?undefined:climbAnchors(seed).find(a=>a.id===v.anchor);
  const face=direct??(legacy?faces.find(f=>f.buildingId===legacy.propId&&f.normal.x*legacy.normal.x+f.normal.z*legacy.normal.z>.999):undefined);
  if(!face&&!legacy)return undefined;
  const corner=v.corner===undefined?undefined:parseOverhaulCorner(v.corner,faces,time,String(v.anchor));
  if(v.corner!==undefined&&(!corner||!direct||!['cling','climb'].includes(String(v.phase))||!corner.state.pawFaces||[0,1,2,3].filter(i=>Number(v.gripMask)&(1<<i)).length<2))return undefined;
  const normal=face?.normal??legacy!.normal,base=face?.minY??legacy!.position.y,height=face?.height??legacy!.height,top=face?.roofCenter.y??legacy!.landing.y;
  const maxTop=face?.kind==='workshop'?base+workshopRoofMax(seed)*height/workshopGeometry(seed).wallTop:top;
  if(Math.abs(Number(v.base)-base)>1e-5||Math.abs(Number(v.height)-height)>1e-5||Number(v.top)<top-1e-5||Number(v.top)>maxTop+1e-5||
    (!corner&&Math.hypot(v.normal.x-normal.x,v.normal.y-normal.y,v.normal.z-normal.z)>1e-6)||v.contact.y<base-.35||v.contact.y>top+.35)return undefined;
  if(corner){const sample=overhaulCornerSample(corner.plan,corner.state.distance,corner.state.height);
    if(Math.hypot(v.normal.x-sample.normal.x,v.normal.y-sample.normal.y,v.normal.z-sample.normal.z)>1e-6||Math.hypot(v.contact.x-sample.contact.x,v.contact.y-sample.contact.y,v.contact.z-sample.contact.z)>1e-5)return undefined;
  }
  const q=face?faceCoordinates(face,v.contact):{normal:(v.contact.x-legacy!.position.x)*normal.x+(v.contact.z-legacy!.position.z)*normal.z,tangent:-(v.contact.x-legacy!.position.x)*normal.z+(v.contact.z-legacy!.position.z)*normal.x};
  let outward=.5;
  if(face&&v.phase==='mantle'){
    const roofHalf=face.side==='east'||face.side==='west'?face.roofHalfExtents.x:face.roofHalfExtents.z;
    const roofDx=face.roofCenter.x-face.origin.x,roofDz=face.roofCenter.z-face.origin.z;
    outward=Math.max(outward,roofDx*normal.x+roofDz*normal.z+roofHalf+.5);
  }
  if(!corner&&(q.normal<-.5||q.normal>outward||Math.abs(q.tangent)>(face?.width??legacy!.width)/2+.1))return undefined;
  return {anchor:v.anchor,phase:v.phase as ClimbState['phase'],startedAt:Number(v.startedAt),progress:Number(v.progress),base,height,top:Number(v.top),
    gripMask:Number(v.gripMask),roofMask:Number(v.roofMask),mantleStage:v.mantleStage as ClimbState['mantleStage'],mantleStageAt:Number(v.mantleStageAt),normal:{...v.normal},contact:{...v.contact},...(corner?{corner:corner.state}:{})};
}
export function parseJoin(value:unknown):JoinRequest|null {
  if(!value||typeof value!=='object')return null;
  const v=value as Record<string,unknown>;
  if(v.inputVersion!==INPUT_PROTOCOL_VERSION||v.type!=='join'||v.layoutVersion!==WORLD_LAYOUT_VERSION||typeof v.name!=='string'||typeof v.room!=='string'||!CHASSIS.includes(v.chassis as JoinRequest['chassis'])||!['coop','pvp','pvpve'].includes(v.mode as string))return null;
  return {type:'join',inputVersion:INPUT_PROTOCOL_VERSION,layoutVersion:WORLD_LAYOUT_VERSION,room:v.room.replace(/[^A-Za-z0-9-]/g,'').slice(0,64).toUpperCase(),name:Array.from(v.name).filter(c=>c.charCodeAt(0)>=32&&c!=='<'&&c!=='>').join('').trim().slice(0,20)||'Pilot',chassis:v.chassis as JoinRequest['chassis'],mode:v.mode as JoinRequest['mode'],create:v.create===true,seed:typeof v.seed==='number'&&[7734,1926,4107].includes(v.seed)?v.seed:7734};
}

/** Reject unknown banks, impossible masks and nonfinite HP before guest admission.
 * Full snapshots carry every authored bank; transient events cannot rebuild geometry. */
export function parseStructures(value:unknown,seed:number,previous:readonly StructureState[]=[]):StructureState[]|null {
  const definitions=cityDistrict(seed)?.structures??[];
  if(!Array.isArray(value)||value.length!==definitions.length)return null;
  const result:StructureState[]=[],seen=new Set<string>();
  for(const entry of value) {
    if(!entry||typeof entry!=='object')return null;
    const v=entry as Record<string,unknown>,definition=definitions.find(d=>d.id===v.id);
    if(!definition||seen.has(definition.id)||v.layoutVersion!==1||!Number.isSafeInteger(v.revision)||Number(v.revision)<0||Number(v.revision)>1e9||!Number.isInteger(v.brokenMask)||Number(v.brokenMask)<0||Number(v.brokenMask)>0xffffffff||!Array.isArray(v.hp)||v.hp.length!==definition.cells.length)return null;
    const mask=Number(v.brokenMask)>>>0;
    if(definition.cells.length<32&&(mask>>>definition.cells.length)!==0)return null;
    if(Array.from(v.hp).some((hp,i)=>typeof hp!=='number'||!Number.isFinite(hp)||hp<0||hp>definition.maxHp||(((mask>>>i)&1)===1)!==(hp===0)))return null;
    const prior=previous.find(s=>s.id===definition.id);
    if(prior&&(Number(v.revision)<prior.revision||((mask&prior.brokenMask)>>>0)!==prior.brokenMask||v.hp.some((hp,i)=>Number(hp)>prior.hp[i])||(Number(v.revision)===prior.revision&&(mask!==prior.brokenMask||v.hp.some((hp,i)=>hp!==prior.hp[i])))))return null;
    seen.add(definition.id);result.push({id:definition.id,layoutVersion:1,revision:Number(v.revision),brokenMask:mask,hp:[...v.hp]});
  }
  return definitions.map(d=>result.find(s=>s.id===d.id)!);
}
