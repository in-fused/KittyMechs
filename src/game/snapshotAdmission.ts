import {parseFelineNativePose004} from '../../shared/felineNativePose004';
import {parseClimbState,parseFelineStrike,parseStrikeReceipt,parseStructures} from '../../shared/protocol';
import {WORLD_LAYOUT_VERSION} from '../../shared/layout';
import {INPUT_PROTOCOL_VERSION,inputCounter} from '../../shared/inputProtocol';
import {parseCoverState} from '../../shared/coverState';
import {parseCityRubble,type RubbleHistory} from '../../shared/cityRubbleAdmission';
import type {ActorState,GameSnapshot} from '../../shared/types';
import {parsePair,validPair} from '../../shared/pairedCombat';
import {parseOverhaulRuins} from '../../shared/overhaulRuins';
import {cityDistrict,cityBlockActive} from '../../shared/cityDistrict';
import {overhaulRuinSnapshotFaces} from '../../shared/overhaulRuinSurfaces';
import {buildingFaces} from '../../shared/buildingSurfaces';
import {overhaulCornerSample,parseOverhaulCorner} from '../../shared/overhaulCornerClimb';
import {actorHullRadius,CHASSIS} from '../../shared/config';
import {parseStanceFeedback} from '../../shared/stanceFeedback';
import {overhaulFragmentKey} from '../../shared/overhaulFracture';
interface StrikeHistory {life:number;jumpProcessed:number;processed:number;active:ActorState['strike'];endedAt:number;seenAt:number;}
const strikeHistory=new WeakMap<GameSnapshot,Map<string,StrikeHistory>>();
const rubbleHistory=new WeakMap<GameSnapshot,Map<string,RubbleHistory>>();
const STRIKE_HISTORY_WINDOW=1.25,STRIKE_HISTORY_CAPACITY=128;
const historyEntry=(actor:ActorState,time:number):StrikeHistory=>({life:actor.jumpEpoch,jumpProcessed:actor.jumpProcessed,processed:actor.strikeProcessed,active:actor.strike?{...actor.strike,direction:{...actor.strike.direction}}:null,endedAt:actor.strikeEndedAt,seenAt:time});

/** Bounded structural envelope admission, not a claim of a complete gameplay
 * snapshot schema. Cell state is validated atomically and detached from senders. */
export function admitStructuralSnapshot(value:unknown,previous:GameSnapshot|null,experimentalFacadeFracture=false):GameSnapshot|null {
  if(!value||typeof value!=='object')return null;
  const v=value as Record<string,unknown>;
  // This bounded material candidate has no admitted production guest path.
  // Sender metadata cannot activate experimental source ownership.
  if(v.bondedMaterial!==undefined)return null;
  if(v.experimentalPhysicalRubble!==undefined&&typeof v.experimentalPhysicalRubble!=='boolean')return null;
  if(previous&&(v.experimentalPhysicalRubble===true)!==(previous.experimentalPhysicalRubble===true))return null;
  if(v.experimentalPhysicalRubble!==true&&Array.isArray(v.rubble)&&v.rubble.length)return null;
  if(v.worldLayoutVersion!==WORLD_LAYOUT_VERSION||v.inputVersion!==INPUT_PROTOCOL_VERSION)return null;
  if(!Number.isSafeInteger(v.tick)||Number(v.tick)<0||typeof v.time!=='number'||!Number.isFinite(v.time)||v.time<0||![7734,1926,4107].includes(Number(v.seed))||typeof v.seed!=='number'||typeof v.room!=='string'||!v.room.length||v.room.length>64||!['training','coop','pvp','pvpve'].includes(String(v.mode)))return null;
  const limits={actors:64,projectiles:1024,events:4096,fields:64,supplies:256,objectives:32};
  for(const [key,limit] of Object.entries(limits))if(!Array.isArray(v[key])||v[key].length>limit||v[key].some(entry=>!entry||typeof entry!=='object'))return null;
  if(previous&&(v.room!==previous.room||v.seed!==previous.seed||v.mode!==previous.mode||Number(v.tick)<previous.tick||v.time<previous.time))return null;
  const structures=parseStructures(v.structures,v.seed,previous?.structures??[]);if(!structures)return null;
  const fragments=experimentalFacadeFracture&&v.ruinFragmentVersion==='facade-quad-1',legacy=!experimentalFacadeFracture&&(v.ruinFragmentVersion===undefined||v.ruinFragmentVersion==='whole-piece-legacy-1')&&v.worldLayoutVersion===WORLD_LAYOUT_VERSION;
  if(!fragments&&!legacy)return null;
  const district=cityDistrict(v.seed),ruins=parseOverhaulRuins(v.ruins,district,v.time,fragments);if(!ruins||legacy&&ruins.some(r=>r.piece!==undefined))return null;
  if(ruins.some(r=>cityBlockActive(district!.blocks[r.block],structures)))return null;
  const ruinsByIndex=new Map(ruins.map(r=>[overhaulFragmentKey(r.block,r.piece),r]));
  if(previous?.ruins?.some(r=>{const next=ruinsByIndex.get(overhaulFragmentKey(r.block,r.piece));if(!next||next.piece!==r.piece||next.born!==r.born||(next.revision??0)<(r.revision??0))return true;
    if(r.settled!==next.settled&&(next.revision??0)<=(r.revision??0))return true;
    return r.settled&&next.settled&&(next.revision??0)===(r.revision??0)&&([...(['x','y','z'] as const)].some(k=>Math.abs(next.position[k]-r.position[k])>.0001)||(['x','y','z','w'] as const).some(k=>Math.abs(next.rotation[k]-r.rotation[k])>.0001));}))return null;
  const ruinFaces=overhaulRuinSnapshotFaces(district,ruins);
  // Transactional copies: failed data or the later local ACK guard cannot
  // mutate an earlier admitted snapshot's bounded action metadata.
  const known=previous?strikeHistory.get(previous)??new Map(previous.actors.map(actor=>[actor.id,historyEntry(actor,previous.time)])):new Map<string,StrikeHistory>();
  const live=new Set(previous?.actors.map(actor=>actor.id)??[]);
  const retained=new Map([...known].filter(([id,entry])=>live.has(id)||Number(v.time)-entry.seenAt<=STRIKE_HISTORY_WINDOW));
  const ids=new Set<string>(),actors:ActorState[]=[];
  for(const actor of v.actors as Record<string,unknown>[]){
    if(actor.groundedOnRubble!==undefined&&typeof actor.groundedOnRubble!=='boolean')return null;
    if(typeof actor.id!=='string'||!actor.id.length||actor.id.length>128||ids.has(actor.id)||!inputCounter(actor.jumpEpoch)||actor.jumpEpoch===0||!inputCounter(actor.jumpProcessed)||!inputCounter(actor.strikeProcessed)||typeof actor.strikeEndedAt!=='number'||!Number.isFinite(actor.strikeEndedAt)||actor.strikeEndedAt< -100||actor.strikeEndedAt>v.time)return null;
    ids.add(actor.id);const old=previous?.actors.find(a=>a.id===actor.id);
    const strikeReceipt=parseStrikeReceipt(actor.strikeReceipt,actor.jumpEpoch,actor.lastInput as number,Number(v.tick),v.time,old?.strikeReceipt);if(strikeReceipt===null)return null;
    const stanceFeedback=parseStanceFeedback(actor.stanceFeedback,actor.jumpEpoch as number,actor.lastInput as number,v.time,old?.stanceFeedback);if(stanceFeedback===undefined)return null;
    const prior=retained.get(actor.id);
    if(prior&&(actor.jumpEpoch<prior.life||actor.jumpEpoch===prior.life&&(actor.jumpProcessed<prior.jumpProcessed||actor.strikeProcessed<prior.processed)))return null;
    const climb=parseClimbState(actor.climb,v.seed,v.time,ruinFaces);if(climb===undefined)return null;
    const previousStrike=prior?.life===actor.jumpEpoch?prior.active:old?.strike;
    const strike=parseFelineStrike(actor.strike,actor.jumpEpoch,actor.strikeProcessed,v.time,previousStrike);if(strike===undefined||strike&&climb||strike&&actor.strikeEndedAt!==-100)return null;
    if(strike&&prior?.life===actor.jumpEpoch&&prior.active?.id!==strike.id&&strike.id<=prior.processed||strike&&!prior&&previous&&strike.acceptedAt<previous.time)return null;
    if(!strike&&prior?.life===actor.jumpEpoch&&(actor.strikeEndedAt<prior.endedAt||prior.active&&actor.strikeEndedAt<prior.active.acceptedAt))return null;
    const state=actor as unknown as ActorState;
    if(climb?.corner){
      const parsed=parseOverhaulCorner(climb.corner,buildingFaces(v.seed),v.time,climb.anchor),p=state.position;
      if(!parsed||!CHASSIS.includes(state.chassis)||typeof state.bot!=='boolean'||!p||![p.x,p.y,p.z].every(Number.isFinite)||Math.abs(climb.corner.radius-actorHullRadius(state)-.09)>1e-6||Math.abs(climb.corner.height-p.y)>1e-5)return null;
      const sample=overhaulCornerSample(parsed.plan,climb.corner.distance,climb.corner.height);
      if(Math.hypot(p.x-sample.position.x,p.y-sample.position.y,p.z-sample.position.z)>.002)return null;
      const priorCorner=old?.climb?.corner;
      if(priorCorner&&priorCorner.from===climb.corner.from&&priorCorner.to===climb.corner.to&&priorCorner.side===climb.corner.side){
        const budget=1.4*(v.time-previous!.time)+.0001;
        if(Math.abs(priorCorner.radius-climb.corner.radius)>1e-6||Math.abs(priorCorner.height-climb.corner.height)>1e-5||(priorCorner.startedAt===climb.corner.startedAt?Math.abs(priorCorner.distance-climb.corner.distance)>budget:climb.corner.startedAt<previous!.time||priorCorner.distance+climb.corner.distance>budget))return null;
      }
    }
    const pair=parsePair(actor.pair,actor.jumpEpoch,v.time);if(pair===undefined||pair&&(strike||climb))return null;
    const downed=state.downed;
    if(downed&&(state.bot||state.hp!==0||climb||strike||pair||!Number.isFinite(downed.at)||downed.at<0||downed.at>v.time||!Number.isFinite(downed.reviveProgress)||downed.reviveProgress<0||downed.reviveProgress>1||downed.reviverId!==null&&typeof downed.reviverId!=='string'))return null;
    const nativePose=parseFelineNativePose004(actor.nativePose,state.id,state.jumpEpoch,Number(v.tick),Number(v.time),old?.nativePose);if(nativePose===null)return null;
    const admittedActor={...state,strikeReceipt,stanceFeedback,nativePose,climb,strike,pair,downed:downed?{...downed}:null};actors.push(admittedActor);retained.set(actor.id,historyEntry(admittedActor,v.time));
  }
  for(const actor of actors)if(actor.pair&&!validPair(actor,actors.find(a=>a.id===actor.pair!.other)))return null;
  const coop=(value as GameSnapshot).coop;
  if(coop&&(v.mode!=='coop'||!['active','failed'].includes(coop.status)||!Number.isSafeInteger(coop.attempt)||coop.attempt<1||coop.attempt<(previous?.coop?.attempt??1)||coop.status==='failed'&&(!Number.isFinite(coop.failedAt)||!Number.isFinite(coop.retryReadyAt)||coop.failedAt!<0||coop.failedAt!>v.time||coop.retryReadyAt!<coop.failedAt!)||coop.status==='active'&&(coop.failedAt!==null||coop.retryReadyAt!==null)))return null;
  const cover=parseCoverState(v.cover,v.seed,v.time,previous?.cover??[]);if(!cover)return null;
  const rubbleKnown=previous?rubbleHistory.get(previous)??new Map(previous.rubble.map(r=>[r.blockId,{born:r.born,retired:false}])):new Map<string,RubbleHistory>();
  const rubble=parseCityRubble(v.rubble,v.seed,v.time,structures,rubbleKnown);if(!rubble)return null;
  if(previous&&rubble.some(r=>!rubbleKnown.has(r.blockId)&&r.born<previous.time))return null;
  const activeRubble=new Set(rubble.map(r=>r.blockId));
  const nextRubble=new Map([...rubbleKnown].map(([id,entry])=>[id,{...entry,retired:entry.retired||!activeRubble.has(id)}]));
  for(const r of rubble)nextRubble.set(r.blockId,{born:r.born,retired:false});
  if(retained.size>STRIKE_HISTORY_CAPACITY)return null;
  const admitted={...value as GameSnapshot,actors,structures,cover,rubble,ruins,coop:coop?{...coop}:undefined};strikeHistory.set(admitted,retained);rubbleHistory.set(admitted,nextRubble);return admitted;
}

