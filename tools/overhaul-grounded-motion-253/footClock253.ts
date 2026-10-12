/** Source event clocks, not animation-pose/root/native authority.
 * Touch ends at the existing loaded sin² curve's midpoint peak, leaving
 * peak→unload as an actual holding interval. A touch arriving after that
 * event is skipped; it is never accelerated into a one-frame plant. */
export function footClock253(semantic:any,source:any,catalog:any,signedStep:number,moving:boolean,previousIdle:Record<string,number>,lastDirection:number){
 const direction=signedStep<0?-1:signedStep>0?1:lastDirection,step=Math.abs(signedStep),events:any[]=[];
 let remaining=Infinity,toPeak=Infinity,recoveryIncrement=Infinity,bodyLoadedIncrement=0,bodyUnloadedIncrement=0,total=0;
 for(const role of semantic.roles??[]){const c=catalog[role.clip],g=c?.measuredGait,weight=role.weight??1;total+=weight;
  if(g){const q=role.q,peak=g.sourceDuty/2,loadedRemaining=direction>0?g.sourceDuty-q:q,peakRemaining=direction>0?peak-q:q-peak;
   events.push({clip:role.clip,weight,q,role:role.role,duty:g.sourceDuty,direction,loadedRemaining,peakRemaining,clock:'SIGNED_UNWRAPPED_DISTANCE_PHASE'});
   if(role.role==='stance'){remaining=Math.min(remaining,loadedRemaining);toPeak=Math.min(toPeak,peakRemaining);}
   recoveryIncrement=Math.min(recoveryIncrement,step/(1-g.sourceDuty));bodyLoadedIncrement+=weight*step/g.sourceDuty;bodyUnloadedIncrement+=weight*step/(1-g.sourceDuty);
  }else{
   const first=Math.min(...c.tracks.map((t:any)=>t.first)),last=Math.max(...c.tracks.map((t:any)=>t.last)),span=last-first,time=source.idleClocks[role.clip],q=span>0?(time-first)/span:0,previous=previousIdle[role.clip],advance=previous===undefined?0:((time-previous)/span+1)%1;
   events.push({clip:role.clip,weight,q,role:role.role,duty:1,direction:1,loadedRemaining:1-q,peakRemaining:.5-q,clock:'ACTUAL_IDLE_SOURCE_KEY_CLOCK',advance});
   if(!moving){remaining=Math.min(remaining,1-q);toPeak=Math.min(toPeak,.5-q);recoveryIncrement=Math.min(recoveryIncrement,advance);bodyLoadedIncrement+=weight*advance;bodyUnloadedIncrement+=weight*advance;}
  }
 }
 const heldIdle=events.filter(e=>e.clock==='ACTUAL_IDLE_SOURCE_KEY_CLOCK'),idleAdvance=heldIdle.length?Math.min(...heldIdle.map(e=>e.advance)):0;
 const advance=moving?step:idleAdvance;
 return {events,direction,signedAdvance:signedStep,advance,remainingLoaded:remaining,toLoadPeak:toPeak,acquisitionPossible:Number.isFinite(toPeak)&&toPeak>2*advance&&toPeak>0,recoveryIncrement:Number.isFinite(recoveryIncrement)?recoveryIncrement:0,bodyLoadedIncrement:total?bodyLoadedIncrement/total:0,bodyUnloadedIncrement:total?bodyUnloadedIncrement/total:0,discontinuous:step>=1};
}
