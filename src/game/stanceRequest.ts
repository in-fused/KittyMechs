import type {ActorState,MechStance} from '../../shared/types';
export const STANCE_REQUEST_TIMEOUT_MS=3000;
export interface StanceRequestState {
  owner:string;pending:{seq:number;life:number;target:MechStance;expiresAt:number}|null;
  notice:{text:string;status:'pending'|'accepted'|'blocked'|'timeout'|'canceled';expiresAt:number}|null;
}
export const createStanceRequest=():StanceRequestState=>({owner:'',pending:null,notice:null});
export function cancelStanceRequest(s:StanceRequestState,now:number,visible=true){if(s.pending&&visible)s.notice={text:'Transform canceled',status:'canceled',expiresAt:now+2500};s.pending=null;}
export function syncStanceRequest(s:StanceRequestState,actor:Pick<ActorState,'id'|'jumpEpoch'|'hp'|'stanceFeedback'>|undefined,generation:number,now:number){
  const owner=actor?`${generation}:${actor.id}:${actor.jumpEpoch}`:'';
  if(s.owner!==owner||!actor||actor.hp<=0){s.owner=owner;s.pending=null;s.notice=null;return;}
  const p=s.pending,f=actor.stanceFeedback;
  if(p&&f?.life===p.life&&f.requestSeq===p.seq&&f.target===p.target){
    if(f.status==='deferred')s.notice={text:f.reason==='ground'?'Land to transform':f.reason==='climbing'?'Release the wall to transform':f.reason==='paired'?'Finish the grapple to transform':'Waiting for form recovery',status:'pending',expiresAt:p.expiresAt};
    else {s.pending=null;s.notice={text:f.status==='accepted'?(f.target==='upright'?'Combat form accepted':'Quadruped form accepted'):f.reason==='headroom'?'Not enough room overhead · move clear and press R':'Transform unavailable',status:f.status,expiresAt:now+3000};}
  }
  if(s.pending&&now>=s.pending.expiresAt){s.pending=null;s.notice={text:'Transform timed out · press R to retry',status:'timeout',expiresAt:now+3000};}
  if(s.notice&&now>=s.notice.expiresAt)s.notice=null;
}
export function beginStanceRequest(s:StanceRequestState,actor:Pick<ActorState,'jumpEpoch'|'stance'>,seq:number,now:number){
  if(s.pending){cancelStanceRequest(s,now);return;}
  const target=actor.stance==='upright'?'quadruped':'upright';
  s.pending={seq,life:actor.jumpEpoch,target,expiresAt:now+STANCE_REQUEST_TIMEOUT_MS};
  s.notice={text:target==='upright'?'Requesting combat form':'Requesting quadruped form',status:'pending',expiresAt:now+STANCE_REQUEST_TIMEOUT_MS};
}
