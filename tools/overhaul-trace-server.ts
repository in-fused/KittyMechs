/** Local read-only climb diagnostics. Calls the unmodified authority method once. */
import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {Simulation} from '../shared/simulation';
import type {ActorState,InputState} from '../shared/types';

const destination=resolve('.sites-runtime/overhaul-20261009',process.argv[2]??'corner-002','authority-trace.jsonl');
mkdirSync(dirname(destination),{recursive:true});
const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
writeFileSync(destination,JSON.stringify({scope:'Read-only detach receipt; original method called exactly once, no input/state/collision changes.',source:hash(resolve('shared/Simulation.ts')),tool:hash(resolve('tools/overhaul-trace-server.ts')),receipt:process.argv[3]??null})+'\n',{flag:'wx'});
type ClimbAuthority={time:number;tick:number;detachClimb:(actor:ActorState,p:{input:InputState;received:number})=>void};
const prototype=Simulation.prototype as unknown as ClimbAuthority,original=prototype.detachClimb;
prototype.detachClimb=function(actor,p){
  if(actor.name==='ClimbReview'&&actor.climb){
    const stack=new Error().stack?.split('\n').slice(2,5);
    appendFileSync(destination,JSON.stringify({time:this.time,tick:this.tick,position:{...actor.position},energy:actor.energy,climb:structuredClone(actor.climb),input:{...p.input},inputAge:this.time-p.received,stack})+'\n');
  }
  return original.call(this,actor,p);
};
await import('../server/index');
