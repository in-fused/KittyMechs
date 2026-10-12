import type {ActorState} from '../../../shared/types';
import {useGameStore} from '../../state/store';
import {runtime} from '../runtime';
import {readIdentity57Runtime005} from './identity57Runtime005Control';
import {SOURCE_POLICY154} from './sourcePresentation154';

export const FELINE_PROTOTYPE_EVENT008='kitty-feline-prototype-008';
const fallback=new Map<string,{generation:number;reason:unknown}>();
const temporary=new Map<string,{generation:number;life:number;reason:string}>();
const history154=new Map<string,{generation:number;life:number;reason:string}>();
const changed=()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event(FELINE_PROTOTYPE_EVENT008));};

/** Fatal asset errors remain fenced for the generation. Expected action gaps
 * select the complete standard rig only while that current action persists. */
export function publicFelineRequested008(actor:Pick<ActorState,'id'|'bot'|'chassis'>){
 return useGameStore.getState().settings.felinePrototype&&!actor.bot&&actor.chassis==='pounce'&&fallback.get(actor.id)?.generation!==runtime.generation;
}
export function publicFelineSelected008(actor:Pick<ActorState,'id'|'bot'|'chassis'>){return publicFelineRequested008(actor)&&temporary.get(actor.id)?.generation!==runtime.generation;}
export function updateTemporaryFeline154(actor:string,life:number,reason:string|null){
 const old=temporary.get(actor);if(reason===null){if(old){temporary.delete(actor);changed();}return;}
 if(old?.generation===runtime.generation&&old.life===life&&old.reason===reason)return;
 const record={generation:runtime.generation,life,reason};temporary.set(actor,record);if(!history154.has(actor))history154.set(actor,Object.freeze({...record}));changed();
}
export function forgetTemporaryFeline154(actor:string){if(temporary.delete(actor))changed();}
export function fallbackFeline008(actor:string,reason:unknown){
 if(fallback.get(actor)?.generation===runtime.generation)return;
 fallback.set(actor,{generation:runtime.generation,reason});
 changed();
}
export function resetFelineFallback008(){
 if(!fallback.size&&!temporary.size)return;
 fallback.clear();temporary.clear();changed();
}
export function readFelinePrototype008(){
 return {enabled:useGameStore.getState().settings.felinePrototype,generation:runtime.generation,policy154:SOURCE_POLICY154,
  temporary154:[...temporary].filter(([,v])=>v.generation===runtime.generation).map(([actor,v])=>({actor,...v})),history154:[...history154].map(([actor,v])=>({actor,...v})),
  fallbacks:[...fallback].filter(([,v])=>v.generation===runtime.generation).map(([actor,v])=>({actor,...v})),
  diagnostics:readIdentity57Runtime005().diagnostics};
}
declare global{interface Window{kittyFelinePrototype008?:{read:typeof readFelinePrototype008};}}
if(typeof window!=='undefined')window.kittyFelinePrototype008={read:readFelinePrototype008};
