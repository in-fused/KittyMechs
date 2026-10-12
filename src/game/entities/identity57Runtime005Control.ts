import type {ActorState} from '../../../shared/types';
import type {Identity57Diagnostic005} from './identity57Runtime005';
export const IDENTITY57_EVENT005='kitty-identity57-runtime-005';
const diagnostics=new Map<string,Identity57Diagnostic005>();let enabled=false;let selection:Set<string>|null=null;
const local=()=>typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);
export function configureIdentity57Runtime005(value:{enabled:boolean;actors?:string[]}){if(!local())throw new Error('Root-local partial-action prototype only');enabled=value.enabled;selection=value.actors?new Set(value.actors):null;window.dispatchEvent(new Event(IDENTITY57_EVENT005));}
export function identity57Selected005(actor:Pick<ActorState,'id'|'bot'|'chassis'>){return local()&&enabled&&!actor.bot&&actor.chassis==='pounce'&&(!selection||selection.has(actor.id));}
export function registerIdentity57Runtime005(id:string,d:Identity57Diagnostic005){diagnostics.set(id,d);return()=>{if(diagnostics.get(id)===d)diagnostics.delete(id);};}
export function readIdentity57Runtime005(){return JSON.parse(JSON.stringify({enabled,actors:selection?[...selection]:null,diagnostics:[...diagnostics.values()]})) as {enabled:boolean;actors:string[]|null;diagnostics:Identity57Diagnostic005[]};}
declare global{interface Window{kittyIdentity57Runtime005?:{configure:typeof configureIdentity57Runtime005;read:typeof readIdentity57Runtime005};}}
if(typeof window!=='undefined'&&local())window.kittyIdentity57Runtime005={configure:configureIdentity57Runtime005,read:readIdentity57Runtime005};
