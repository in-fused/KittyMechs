import {nativeFault273,read273} from './guards273.mjs';
/** Public keys inside the ORIGINAL177 one-pilot movement token and certified
 * direct corridor. Gesture quality is a recorded gate, not tiny-angle assertions. */
export async function shortOrdinary273({page,name,motion,planning,read,guard,evidence,output}){
 const rows=[];evidence.ordinary273={rows,qualification:'UNRUN',movingR:'UNRUN',contactQualified:false};
 await motion.run(name,{intent:'FINITE273_SHORT_WALK_R',partialCorridorStop:true},async observed=>{
  const fresh=planning(observed,name,guard),yaw=observed.input.input.yaw,target={x:fresh.actor.position.x-Math.sin(yaw)*24,z:fresh.actor.position.z-Math.cos(yaw)*24},plan=fresh.route(target);
  if(!plan.path||plan.path.length!==1){evidence.ordinary273.qualification='UNTESTED_NO_ORIGINAL177_CERTIFIED_DIRECT_CORRIDOR';evidence.ordinary273.rejection=plan.rejection;throw Error('273 short ordinary direct corridor not certified by original177');}
  motion.commit(plan);const began=Date.now(),life=fresh.actor.jumpEpoch,id=fresh.actor.id;
  const capture=async label=>{guard();const r=await read273(page,name),fault=nativeFault273(r,'a1aa8bab5601a12448a169602827146b226b126e6012bf7a94cf44d0c13fa9d6',true);if(fault)throw Error(fault);if(r.actor.id!==id||r.actor.jumpEpoch!==life)throw Error('273 life changed during finite ordinary trace');rows.push({label,wall:Date.now(),tick:r.tick,time:r.time,actor:r.actor,input:r.input,native:r.native,camera:r.camera,performance:r.performance});return r;};
  try{await page.keyboard.down('KeyW');for(let i=0;i<3;i++){await page.waitForTimeout(120);await capture('walk-'+i);}for(const direction of ['upright','quadruped']){const pre=await capture('before-R-'+direction);await page.keyboard.press('KeyR',{delay:45});for(let i=0;i<7;i++){await page.waitForTimeout(120);const current=await capture('R-'+direction+'-'+i);if([1,3,6].includes(i))await page.screenshot({path:output+'/ordinary273-'+direction+'-'+i+'.png',timeout:1500});}rows.push({label:'direction-summary',direction,preActor:pre.actor,lastActor:rows.at(-1).actor,phaseDurationMs:Date.now()-began});}}
  finally{await page.keyboard.up('KeyR');await page.keyboard.up('KeyW');}
  evidence.ordinary273.qualification='ACTUAL_PUBLIC_WALK_R_TIMELINE_CRITIC_REQUIRED';evidence.ordinary273.movingR=rows.filter(r=>r.label==='direction-summary').every(r=>Math.hypot(r.preActor.velocity.x,r.preActor.velocity.z)>.1&&r.lastActor.stance===r.direction)?'BOTH_NATIVE_DIRECTIONS_OBSERVED_MOVING':'INCOMPLETE_NATIVE_MOVING_R_WITNESS';
 });
}
