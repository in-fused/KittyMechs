import {readFileSync,writeFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {createAimFeedback156,chooseLook156} from '../overhaul-coop-156/aim-feedback.mjs';
const original=readFileSync(new URL('../overhaul-coop-156/mission-capture.mjs',import.meta.url),'utf8'),candidate=readFileSync(new URL('./mission-capture.mjs',import.meta.url),'utf8');
function loadTrack(source,deps){const start=source.indexOf('const trackFire=async'),end=source.indexOf('let pilots=[];',start);if(start<0||end<0)throw Error('Exact mission combat function missing');return new Function('deps',`const {createAimFeedback156,chooseLook156,combatRead156,guard,evidence,settle,pilotGunAligned,opticalAim,squadThreats,inputRead,delivered}=deps;${source.slice(start,end)};return trackFire;`)(deps);}
async function exercise(source,{deliveryError=false}={}){
 const log=[],evidence={},stop={routeThreat:true,stop:false};let held=false,seq=0,fires=0;
 const page={bringToFront:async()=>log.push('front'),keyboard:{down:async key=>{log.push('down:'+key);if(key==='KeyF')held=true;},up:async key=>{log.push('up:'+key);if(key==='KeyF')held=false;},press:async key=>log.push('press:'+key)},waitForTimeout:async ms=>log.push('wait:'+ms)};
 const read=async()=>{
  log.push('settlement-read:'+held);
  // Surviving visible target exposes the old order before its1.5s timer.
  if(held)throw Error('SURVIVING_TARGET_NEUTRAL_READ_WITH_FIRE_HELD');
  seq++;const ray={yaw:0,pitch:0,frameClock:seq},actor={id:'pilot',name:'Pilot',jumpEpoch:1,hp:220,aimYaw:0,aimPitch:0,lastInput:seq,position:{x:0,y:1,z:0},velocity:{x:0,y:0,z:0}},enemy={id:'enemy',hp:95,visible:true,fireClear:true,position:{x:0,y:1,z:-10},velocity:{x:0,y:0,z:0}};
  return {at:seq*20,seq,tick:seq,time:seq/60,publication:{roomEpoch:'fixture',sequence:seq},identity:{generation:1,localId:'pilot',life:1,sendLife:1},actor,enemy,humans:[actor],keys:[],input:{forward:0,strafe:0,fire:false},look:{yaw:0,pitch:0,cameraRay:ray},camera:{frameClock:seq,lookYaw:0,lookPitch:0},sent:[{at:seq*20,generation:1,localId:'pilot',input:{seq,jumpEpoch:1,forward:0,strafe:0,fire:false,aimYaw:0,pitch:0},aim:{lookYaw:0,lookPitch:0,cameraRay:ray}}]};
 };
 const track=loadTrack(source,{createAimFeedback156,chooseLook156,combatRead156:read,guard:()=>{},evidence,settle:async()=>log.push('movement-settled'),pilotGunAligned:()=>true,opticalAim:()=>({dyaw:0,dpitch:0,yaw:0,pitch:0,lead:0,target:{x:0,y:1,z:-10}}),squadThreats:()=>[],inputRead:async()=>({seq}),delivered:async()=>{log.push('delivered-fire');fires++;if(deliveryError)throw Error('DELIVERY_FAILURE_FIXTURE');if(fires===2)stop.stop=true;}});
 let failure=null;try{await track(page,'Pilot','enemy',false,stop);}catch(error){failure=String(error);}return {log,failure,fires,held,settlements:evidence.tracking?.[0].aimSettlements?.length??0};
}
describe('159 actual mission combat fire/release ordering',()=>{
 it('preserves the denied baseline and exercises two surviving-target fire cycles through new neutral/native settlements',async()=>{
  const before=await exercise(original),after=await exercise(candidate);
  expect(before.failure).toContain('SURVIVING_TARGET_NEUTRAL_READ_WITH_FIRE_HELD');expect(before.fires).toBe(1);
  expect(after.failure).toBeNull();expect(after.fires).toBe(2);expect(after.settlements).toBe(3);expect(after.held).toBe(false);
  const downs=after.log.map((v,i)=>v==='down:KeyF'?i:-1).filter(i=>i>=0);for(const d of downs){const release=after.log.indexOf('up:KeyF',d+1),nextRead=after.log.findIndex((v,i)=>i>d&&v.startsWith('settlement-read:'));expect(release).toBeGreaterThan(d);expect(release).toBeLessThan(nextRead);}
  writeFileSync(new URL('./fire-order-receipt.json',import.meta.url),JSON.stringify({writer:'CLOSED',scope:'EXACT_MISSION_FUNCTION_CONTROL_ORDER_WITH_AUTHORED_SURVIVING_TARGET_AND_ACK_FIXTURE_NOT_NATIVE_PLAY',before,after},null,2));
 });
 it('releases fire through the aligned branch finally when delivery fails before the100ms wait',async()=>{
  const r=await exercise(candidate,{deliveryError:true});expect(r.failure).toContain('DELIVERY_FAILURE_FIXTURE');expect(r.held).toBe(false);const failed=r.log.indexOf('delivered-fire');expect(r.log[failed+1]).toBe('up:KeyF');expect(r.log).not.toContain('wait:100');expect(r.fires).toBe(1);
 });
});
