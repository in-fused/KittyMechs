import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {acceptedAim156,chooseLook156,createAimFeedback156} from './aim-feedback.mjs';
const path='.sites-runtime/overhaul-20261010/coop153-public/evidence.json',bytes=readFileSync(path),e=JSON.parse(bytes),steps=e.tracking[0].steps;
const model=step=>({actor:{id:'pilot',jumpEpoch:1,lastInput:10,aimYaw:step.gunYaw,aimPitch:step.gunPitch},identity:{generation:3,localId:'pilot',life:1,sendLife:1},keys:[],input:{forward:0,strafe:0,fire:false},look:{yaw:step.lookYaw,pitch:step.lookPitch,cameraRay:{yaw:step.lookYaw,pitch:step.lookPitch,frameClock:1}},sent:[{generation:3,localId:'pilot',input:{seq:10,jumpEpoch:1,forward:0,strafe:0,fire:false,aimYaw:step.lookYaw,pitch:step.gunPitch},aim:{lookYaw:step.lookYaw,lookPitch:step.lookPitch,cameraRay:{yaw:step.lookYaw,pitch:step.lookPitch,frameClock:1}}}]});
describe('156 recorded feedback and real coordination rules',()=>{
 it('does not confuse the retained old native gun with the current look command',()=>{
  const lagged=steps.filter(s=>Math.abs(s.gunYaw-s.lookYaw)>.045);expect(lagged.length).toBeGreaterThan(8);for(const s of lagged)expect(acceptedAim156(model(s)).accepted).toBe(false);
  const r=model(steps.at(-1));r.actor.aimYaw=r.look.yaw;r.actor.aimPitch=r.sent[0].input.pitch;expect(acceptedAim156(r).accepted).toBe(true);r.sent[0].input.fire=true;expect(acceptedAim156(r).accepted).toBe(false);r.sent[0].input.fire=false;r.keys=['KeyL'];expect(acceptedAim156(r).accepted).toBe(false);r.keys=[];r.actor.lastInput=9;expect(acceptedAim156(r).accepted).toBe(false);
 });
 it('uses the measured orbit response rather than repeating an oversized constant step',()=>{
  const a=steps[9],b=steps[10],previous={axis:'yaw',before:{look:{yaw:a.lookYaw,pitch:a.lookPitch}},after:{look:{yaw:b.lookYaw,pitch:b.lookPitch}},beforeAim:a,afterAim:b};
  const command=chooseLook156(b,previous);expect(command.gain).toBeGreaterThan(0);expect(command.requestedMs).toBeLessThan(70);expect(command.key).toBe('KeyJ');
  // Independent secant extrapolation from actual retained optical observations.
  // This hypothetical geometry response tests the command scale, not public hits.
  const slope=(b.dyaw-a.dyaw)/(b.lookYaw-a.lookYaw),response=b.dyaw+slope*(command.requestedMs/1000*1.9);expect(Math.abs(response)).toBeLessThan(.045);
  writeFileSync(new URL('./feedback-receipt.json',import.meta.url),JSON.stringify({writer:'CLOSED',scope:'ACTUAL_RETAINED_LAG_CLASSIFICATION_PLUS_HYPOTHETICAL_SECANT_COMMAND_NOT_NATIVE_PLAY',input:path,inputSha256:createHash('sha256').update(bytes).digest('hex'),savedFailure:e.failure,before:{dyaw:a.dyaw,lookYaw:a.lookYaw,gunYaw:a.gunYaw},after:{dyaw:b.dyaw,lookYaw:b.lookYaw,gunYaw:b.gunYaw},candidate:command,hypotheticalSecantResponse:response,oldRequestedMs:b.pulseMs,alignmentTolerance:.045},null,2));
 });
 it('issues one finite press, never reads while held and stops a lifecycle/read failure without a next command',async()=>{
  let held=false,reads=0;const keyboard={press:async()=>{held=true;held=false;},up:async()=>{held=false;}};
  const owner=createAimFeedback156({page:{keyboard,waitForTimeout:async()=>{}},read:async()=>{expect(held).toBe(false);reads++;throw Error('actual read failure');},guard:()=>{},record:{},deadline:Date.now()+20000});
  await expect(owner.pulse({axis:'yaw',error:.1,key:'KeyJ',requestedMs:50},{at:1})).rejects.toThrow('actual read failure');expect(reads).toBe(1);expect(held).toBe(false);
 });
 it('waits through delayed native input until a released current packet and a new stable optical frame coexist',async()=>{
  const r=model(steps[9]);r.at=0;r.seq=9;r.publication={roomEpoch:'fixture',sequence:1};r.sent[0].at=1;r.actor.hp=220;r.enemy={hp:95,visible:true,fireClear:true};r.camera={frameClock:1};r.actor.lastInput=9;let reads=0;const record={};
  const owner=createAimFeedback156({page:{waitForTimeout:async()=>{}},read:async()=>{reads++;const sample=structuredClone(r);if(reads===2){sample.at=2;sample.seq=10;sample.publication.sequence=2;sample.actor.lastInput=10;sample.actor.aimYaw=sample.sent[0].input.aimYaw;sample.camera.frameClock=sample.look.cameraRay.frameClock=2;}return sample;},guard:()=>{},record,deadline:Date.now()+20000});
  const ready=await owner.settled();expect(reads).toBe(2);expect(ready.actor.lastInput).toBe(10);expect(record.aimSettlements).toHaveLength(1);expect(record.aimSettlements[0].priorFrameClock).toBe(1);
 });
});
