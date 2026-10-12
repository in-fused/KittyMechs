/** Pure owner-control seam only: constructor/binding/SkinSole/source composer
 * NOT executed, no asset decoder/native world/render. Stubs record requested
 * travel blend, never emit or assert a fake rig/source-contact certificate. */
import {Object3D,Group} from 'three';
import {readFileSync,writeFileSync} from 'node:fs';
import {NativeOwner218 as Candidate} from './nativeOwner230';
import {NativeOwner218 as Baseline} from '../overhaul-native-integration-222/nativeOwner218';
const contract=JSON.parse(readFileSync('tools/overhaul-native-214/raw209-contract214.json','utf8'));
const evidence=JSON.parse(readFileSync('.sites-runtime/overhaul-20261011/native228-public/evidence.json','utf8'));
const actor=evidence.events.findLast((e:any)=>e.pilot==='Native228Host'&&e.actor)?.actor;
if(!actor)throw Error('230_SAVED_ACTOR_MISSING');
type Call={items:any[];phase:number;stance:number;travelWeight:number;clocks:any};
function controls(Type:any){
 const model=new Object3D(),root=new Group(),body=new Group();root.add(body);body.add(model);const calls:Call[]=[],owner:any=Object.create(Type.prototype);
 Object.assign(owner,{model,contract,task:{step(items:any[],phase:number,stance:number,travelWeight:number,clocks:any){calls.push(structuredClone({items,phase,stance,travelWeight,clocks}));return {positive:[]};}},completeClips:new Map(),rest:new Map(),phase:0,life:-1,generation:-1,yaw:null,previous:null,idleTime:0,travelWeight:0,previousItems:[],grounded:true,landingAt:-Infinity,blockedKey:null,lastSpeed:0,turnPhase:0,diagnostic:{status:'source',fatal:null,maxCostMs:0}});
 let time=actor.nativePose.time,position={...actor.position};const dt=1/60;
 return {owner,calls,step(distance:number,direction=1,stance='quadruped'){
  time+=dt;position={...position,z:position.z-direction*distance};const state={...structuredClone(actor),stance,stanceChangedAt:-100,pair:null,climb:null,strike:null,downed:null,hp:220,maxHp:220,pulseAt:-100,rocketAt:-100,hurtAt:-100};state.nativePose.time=time;state.nativePose.tick++;state.nativePose.nativeStepTick=state.nativePose.tick;
  const p:any={state,grounded:true,position:{...position},velocity:{x:0,y:0,z:0},yaw:0,time,climb:null,strike:null,climbProgress:0,distance,angularDistance:0,reset:false};owner.step(p,time,dt,root,body,true,1,time);return calls.at(-1)!;
 }};
}
const receipt:any={scope:'ACTUAL_OWNER_CONTROL_BRANCH_WITH_RECORDING_COMPOSER_STUB_ONLY',realRigOrNativeTest:false,contactQualified:false,cases:[]};
const check=(pass:boolean,reason:string,operands:any)=>{receipt.cases.push({reason,pass,...operands});if(!pass)throw Error(reason);};
try{
 const old=controls(Baseline),current=controls(Candidate),delta=actor.nativePose.movement.delta,drift=Math.hypot(delta.x,delta.z);
 for(let i=0;i<90;i++){old.step(drift);current.step(drift);}
 check(old.calls.at(-1)!.travelWeight===1&&current.calls.every(c=>c.travelWeight===0),'230_OBSERVED_DRIFT_NEGATIVE_CONTROL',{drift,oldFinal:old.calls.at(-1),candidateFinal:current.calls.at(-1)});
 const real=controls(Candidate);for(let i=0;i<30;i++)real.step(2/60);check(real.calls.at(-1)!.travelWeight===1,'230_REAL_TRAVEL_ACQUIRES',{final:real.calls.at(-1)});
 const phaseBefore=real.owner.phase;for(let i=0;i<30;i++)real.step(drift,-1);check(real.calls.at(-1)!.travelWeight===0,'230_STOP_WITH_DRIFT_RELEASES',{phaseBefore,phaseAfter:real.owner.phase,final:real.calls.at(-1)});check(real.owner.phase!==phaseBefore,'230_DISTANCE_PHASE_NOT_CLAMPED',{phaseBefore,phaseAfter:real.owner.phase});
 const above=controls(Candidate),below=controls(Candidate);for(let i=0;i<30;i++){above.step(.081/60);below.step(.079/60);}check(above.calls.at(-1)!.travelWeight===1&&below.calls.at(-1)!.travelWeight===0,'230_EXISTING_THRESHOLD_BOUNDARIES',{above:.081,below:.079,aboveFinal:above.calls.at(-1),belowFinal:below.calls.at(-1)});
 receipt.status='CONTROL_ONLY_PASS_UNADMITTED_GAMEPLAY';
}catch(e){receipt.status='FIRST_CONTROL_FAILURE';receipt.error=String(e);process.exitCode=1;}
finally{writeFileSync('tools/overhaul-native-idle-230/control-receipt230.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({status:receipt.status,cases:receipt.cases.length,error:receipt.error}));}
