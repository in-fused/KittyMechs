import type {ActorState} from '../../../shared/types';
import type {PracticalMotionDiagnostic002} from './practicalFelineMotionOwner002';
export const PRACTICAL_MOTION_EVENT002='kitty-practical-motion-002';
const diagnostics=new Map<string,PracticalMotionDiagnostic002>();
let enabled=false;let selection:Set<string>|null=null;
const rootLocal=()=>typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);
export function configurePracticalMotion002(value:{enabled:boolean;actors?:string[]}){
  if(!rootLocal())throw new Error('Practical motion002 is a root-local pending candidate.');
  enabled=value.enabled;selection=value.actors?new Set(value.actors):null;window.dispatchEvent(new Event(PRACTICAL_MOTION_EVENT002));
}
export function practicalMotionSelected002(actor:Pick<ActorState,'id'|'bot'>){return rootLocal()&&enabled&&!actor.bot&&(!selection||selection.has(actor.id));}
export function registerPracticalMotion002(id:string,d:PracticalMotionDiagnostic002){diagnostics.set(id,d);return()=>{if(diagnostics.get(id)===d)diagnostics.delete(id);};}
export function readPracticalMotion002(){return JSON.parse(JSON.stringify({enabled,actors:selection?[...selection]:null,diagnostics:[...diagnostics.values()]})) as {enabled:boolean;actors:string[]|null;diagnostics:PracticalMotionDiagnostic002[]};}
declare global {interface Window {kittyPracticalMotion002?:{configure:typeof configurePracticalMotion002;read:typeof readPracticalMotion002};}}
if(typeof window!=='undefined'&&rootLocal())window.kittyPracticalMotion002={configure:configurePracticalMotion002,read:readPracticalMotion002};
