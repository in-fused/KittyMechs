import type {CombatEvent,Vec3} from '../../../shared/types';
import {areaSeed} from './areaPresentation';
export interface CombatParticle {origin:Vec3;velocity:Vec3;born:number;life:number;size:number;repair:boolean;}
const noise=(seed:number,i:number)=>{let h=Math.imul(seed^(i+1),0x45d9f3b);h=Math.imul(h^(h>>>16),0x45d9f3b);return ((h^(h>>>16))>>>0)/4294967296;};
export function sparkEvent(e:CombatEvent,time:number):boolean {
  return !!e&&Number.isSafeInteger(e.id)&&e.id>=0&&Number.isFinite(e.at)&&time>=e.at&&time-e.at<1.1&&!!e.position&&[e.position.x,e.position.y,e.position.z].every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<10000)&&['impact','cover-hit','cover-break','death','explosion','pounce','transform','repair'].includes(e.type);
}
/** Retained particles are born at the accepted event time, never receipt time. */
export function combatParticle(e:CombatEvent,index:number):CombatParticle {
  const seed=areaSeed(e.id),big=['death','explosion','cover-break','pounce'].includes(e.type),angle=noise(seed,index*4)*Math.PI*2;
  const speed=big?3+noise(seed,index*4+1)*8:2+noise(seed,index*4+1)*4;
  return {origin:{...e.position},velocity:{x:Math.cos(angle)*speed,y:1+noise(seed,index*4+2)*speed,z:Math.sin(angle)*speed},born:e.at,life:big?.6+noise(seed,index*4+3)*.5:.2+noise(seed,index*4+3)*.25,size:big?.08:.04,repair:e.type==='repair'};
}
/** Analytic displacement: repeated/stalled/pause frames cannot accumulate dt. */
export function particlePosition(p:CombatParticle,time:number,out:Vec3):boolean {
  const age=time-p.born;if(!Number.isFinite(age)||age<0||time>=p.born+p.life)return false;
  out.x=p.origin.x+p.velocity.x*age;out.y=p.origin.y+p.velocity.y*age-4.5*age*age;out.z=p.origin.z+p.velocity.z*age;return true;
}
