import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { clamp } from '../../shared/math';
import { runtime } from './runtime';
import { useGameStore } from '../state/store';
import type { GameSnapshot,InputState,MechStance } from '../../shared/types';
import {MAX_INPUT_COUNTER} from '../../shared/inputProtocol';
import {cancelJumpOutbox,createJumpOutbox,expireJump,pressJump,retireJumpOutbox,sentJump,syncJumpOutbox} from './jumpOutbox';
import {createInputReceipt,recordSentInput,readSentInputs,readSentStrikes,type AimObservation} from './inputReceipt';
import {beginStanceRequest,cancelStanceRequest,createStanceRequest,syncStanceRequest} from './stanceRequest';
const stanceOutbox=createStanceRequest();
function reconcileStance(){syncStanceRequest(stanceOutbox,runtime.snapshot?.actors.find(a=>a.id===runtime.localId),runtime.generation,performance.now());}
export function inspectStanceDelivery(){reconcileStance();return {pending:stanceOutbox.pending?{...stanceOutbox.pending}:null,notice:stanceOutbox.notice?{...stanceOutbox.notice}:null};}
const outbox=createJumpOutbox();
const strikeOutbox=createJumpOutbox();
const sentReceipt=createInputReceipt();
let inputMountedAt:number|null=null;
const elementReceipt=(element:Element|null)=>element?{tag:element.tagName,id:element.id,role:element.getAttribute('role'),editable:element.matches('input,select,textarea,[contenteditable="true"]')}:null;
function sentReceiptNote(input:InputState,source:'frame'|'reset'|'authority'){recordSentInput(sentReceipt,input,performance.now(),source,runtime.generation,runtime.localId,{lookPitch:controls.pitch,lookYaw:controls.yaw,cameraRay:controls.cameraRay});}
const controlEvents:{kind:string;code:string|null;at:number;focused:boolean;target:ReturnType<typeof elementReceipt>}[]=[];
function noteControl(kind:string,code:string|null=null,target:Element|null=document.activeElement){if(!sentReceipt.enabled)return;if(controlEvents.length===64)controlEvents.shift();controlEvents.push({kind,code,at:performance.now(),focused:document.hasFocus(),target:elementReceipt(target)});}
type DeliveryEvent={kind:string;at:number;owner:string;epoch:number;id:number;cancel:number};
const events:DeliveryEvent[]=[];
function note(kind:string,id=outbox.pending){if(events.length===64)events.shift();events.push({kind,at:performance.now(),owner:outbox.owner,epoch:outbox.epoch,id,cancel:outbox.cancel});}
/** Detached read-only opt-in diagnostic; never exposes mutation methods. */
export function inspectJumpDelivery(){const actor=runtime.snapshot?.actors.find(a=>a.id===runtime.localId),sent=readSentInputs(sentReceipt);return {...outbox,seq:runtime.input.seq,input:{...runtime.input},keys:[...controls.keys],at:performance.now(),mountedAt:inputMountedAt,phase:useGameStore.getState().phase,look:{yaw:controls.yaw,pitch:controls.pitch,levelView:controls.levelView,shotYaw:controls.shotYaw,shotPitch:controls.shotPitch,cameraRay:controls.cameraRay?{...controls.cameraRay}:null},browser:{focused:document.hasFocus(),visibility:document.visibilityState,activeElement:elementReceipt(document.activeElement),pointerLock:elementReceipt(document.pointerLockElement)},native:actor?{tick:runtime.snapshot!.tick,lastInput:actor.lastInput,aimYaw:actor.aimYaw,aimPitch:actor.aimPitch,strikeReceipt:actor.strikeReceipt?{...actor.strikeReceipt}:null,velocity:{...actor.velocity},position:{...actor.position}}:null,strikeDelivery:inspectStrikeDelivery(),strikeSent:readSentStrikes(sentReceipt),lastSent:sent.at(-1)??null,sent,controlEvents:controlEvents.map(event=>({...event,target:event.target?{...event.target}:null})),events:events.map(event=>({...event}))};}
export function inspectStrikeDelivery(){return {...strikeOutbox,sent:readSentStrikes(sentReceipt)};}
export function markJumpSent(input:InputState){
  sentReceiptNote(input,runtime.authority?'authority':'frame');
  const owner=`${runtime.generation}:${runtime.localId}`,now=performance.now();
  if(outbox.pending>0&&input.jumpId===outbox.pending&&input.jumpEpoch===outbox.epoch&&outbox.owner===owner&&input.jump){if(outbox.sentAt<0)note('first-send');sentJump(outbox,now);}
  if(strikeOutbox.pending>0&&input.strikeId===strikeOutbox.pending&&input.strikeEpoch===strikeOutbox.epoch&&strikeOutbox.owner===owner&&input.strike)sentJump(strikeOutbox,now);
}
export function requestJump(){reconcileJump();const accepted=useGameStore.getState().phase==='playing'&&(runtime.snapshot?.actors.find(a=>a.id===runtime.localId)?.hp??0)>0&&pressJump(outbox);note(accepted?'press':'drop');return accepted;}
export function requestStrike(){reconcileJump();return useGameStore.getState().phase==='playing'&&(runtime.snapshot?.actors.find(a=>a.id===runtime.localId)?.hp??0)>0&&pressJump(strikeOutbox);}
function admitLocalJumpAck(state:GameSnapshot):boolean {
  const actor=state.actors.find(a=>a.id===runtime.localId),owner=`${runtime.generation}:${runtime.localId}`;
  if(!actor||outbox.owner!==owner||actor.jumpEpoch>outbox.epoch)return true;
  return actor.jumpEpoch===outbox.epoch&&actor.jumpProcessed>=outbox.processed&&actor.jumpProcessed<=outbox.issued&&
    (strikeOutbox.owner!==owner||actor.jumpEpoch>strikeOutbox.epoch||actor.jumpEpoch===strikeOutbox.epoch&&actor.strikeProcessed>=strikeOutbox.processed&&actor.strikeProcessed<=strikeOutbox.issued);
}
// Public press/sample entry points can run before the first passive input hook.
// The guard reads the current owner/life dynamically and survives hook gaps.
runtime.admitInputSnapshot=admitLocalJumpAck;
function reconcileJump(){
  const actor=runtime.snapshot?.actors.find(a=>a.id===runtime.localId);
  const owner=`${runtime.generation}:${runtime.localId}`;
  if(!actor){if(outbox.owner&&outbox.owner!==owner)retireJumpOutbox(outbox);if(strikeOutbox.owner&&strikeOutbox.owner!==owner)retireJumpOutbox(strikeOutbox);resetControls();return;}
  const changed=outbox.owner!==owner||outbox.epoch!==actor.jumpEpoch,prior=outbox.pending;
  syncJumpOutbox(outbox,owner,actor.jumpEpoch,actor.jumpProcessed,actor.hp>0);
  syncJumpOutbox(strikeOutbox,owner,actor.jumpEpoch,actor.strikeProcessed,actor.hp>0);
  if(changed){note('owner');resetControls();}else if(actor.hp<=0&&runtime.snapshot?.coop?.status!=='failed')resetControls();
  else if(prior&&outbox.pending===0)note('ack',prior);
}
export const controls={keys:new Set<string>(),yaw:0,pitch:.08,levelView:false,shotYaw:undefined as number|undefined,shotPitch:0,cameraRay:null as AimObservation['cameraRay'],touchX:0,touchY:0,touchFire:false,touchRocket:false,touchBoost:false,touchJump:false,touchInteract:false,touchClimb:false,boostUntil:0,rocketUntil:0,fireUntil:0,dragging:false,aiming:false,stance:'quadruped' as MechStance,stanceUntil:0};
// Explicit recovery preserves horizontal aim and never issues a movement/action edge.
export const cancelLevelView=()=>{controls.levelView=false;};
export const requestLevelView=()=>{const actor=runtime.snapshot?.actors.find(a=>a.id===runtime.localId);if(useGameStore.getState().phase!=='playing'||!actor||actor.hp<=0)return false;controls.levelView=true;return true;};
export const toggleStance=()=>{reconcileJump();const actor=runtime.snapshot?.actors.find(a=>a.id===runtime.localId);if(useGameStore.getState().phase!=='playing'||!actor||actor.hp<=0||runtime.input.seq>=MAX_INPUT_COUNTER)return;reconcileStance();beginStanceRequest(stanceOutbox,actor,runtime.input.seq+1,performance.now());controls.stance=stanceOutbox.pending?.target??actor.stance;};
export const resetControls=()=>{
  const hadStanceRequest=!!stanceOutbox.pending||(runtime.input.stanceRequest?.seq??0)>0;
  cancelStanceRequest(stanceOutbox,performance.now());const stanceActor=runtime.snapshot?.actors.find(a=>a.id===runtime.localId);if(stanceActor)runtime.input.stanceRequest={seq:0,life:stanceActor.jumpEpoch};else delete runtime.input.stanceRequest;
  const prior=outbox.pending,strikePrior=strikeOutbox.pending;cancelJumpOutbox(outbox);cancelJumpOutbox(strikeOutbox);if(prior)note('cancel',prior);
  const input=runtime.input,changed=hadStanceRequest||prior>0||strikePrior>0||input.forward!==0||input.strafe!==0||input.fire||input.rocket||input.jump||input.strike||input.boost||input.interact||input.climb||input.jumpCancel!==outbox.cancel||input.jumpEpoch!==outbox.epoch||input.strikeCancel!==strikeOutbox.cancel||input.strikeEpoch!==strikeOutbox.epoch;
  controls.keys.clear();controls.touchX=0;controls.touchY=0;controls.touchFire=false;controls.touchRocket=false;controls.touchBoost=false;controls.touchJump=false;controls.touchInteract=false;controls.touchClimb=false;controls.dragging=controls.aiming=false;
  cancelLevelView();controls.shotYaw=undefined;
  controls.cameraRay=null;
  controls.boostUntil=controls.rocketUntil=controls.fireUntil=controls.stanceUntil=0;controls.stance=runtime.snapshot?.actors.find(a=>a.id===runtime.localId)?.stance??'quadruped';
  if(changed)input.seq=Math.min(MAX_INPUT_COUNTER,input.seq+1);input.forward=input.strafe=0;input.fire=input.rocket=input.jump=input.boost=input.interact=input.climb=false;input.jumpId=0;input.jumpCancel=outbox.cancel;input.jumpEpoch=outbox.epoch;input.stance=controls.stance;
  input.strike=false;input.strikeId=0;input.strikeCancel=strikeOutbox.cancel;input.strikeEpoch=strikeOutbox.epoch;
  // Pause/blur cancellation is sent synchronously, before another physics sample.
  if(changed&&runtime.sendInput?.(input))sentReceiptNote(input,'reset');
};
export function useInput(){
  const {gl}=useThree();
  useEffect(()=>{
    sentReceipt.enabled=import.meta.env.DEV||new URLSearchParams(location.search).get('debug')==='1';sentReceipt.history.length=0;sentReceipt.strikeHistory.length=0;controlEvents.length=0;inputMountedAt=performance.now();
    const generation=runtime.generation;const reconcile=()=>{if(runtime.generation===generation)reconcileJump();};
    runtime.resetInput=resetControls;runtime.reconcileInput=reconcile;
    const unsubscribe=useGameStore.subscribe((state,previous)=>{if(runtime.generation===generation&&state.phase!==previous.phase&&state.phase!=='playing')resetControls();});
    controls.yaw=0;controls.pitch=.06;controls.shotYaw=undefined;controls.stance='quadruped';
    const down=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement)?.matches('input,select,textarea')){noteControl('keydown-editable',e.code,e.target as Element);return;}
      noteControl('keydown',e.code,e.target instanceof Element?e.target:null);
      if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
      if(e.code==='Escape'){
        const state=useGameStore.getState();if(state.phase==='playing'){document.exitPointerLock?.();useGameStore.setState({phase:'paused'});}else if(state.phase==='paused')useGameStore.setState({phase:'playing'});resetControls();return;
      }
      const held=controls.keys.has(e.code);controls.keys.add(e.code);
      // Space retains one acknowledged edge independently of sampler timing.
      // Keyboard repeat and duplicate down events never issue another press.
      if(!e.repeat&&!held){const until=performance.now()+150;if(e.code==='Space')requestJump();if(e.code==='ShiftLeft'||e.code==='ShiftRight'){if(!controls.keys.has(e.code==='ShiftLeft'?'ShiftRight':'ShiftLeft'))requestStrike();controls.boostUntil=until;}if(e.code==='KeyV')requestLevelView();if(e.code==='KeyQ')controls.rocketUntil=until;if(e.code==='KeyR'&&useGameStore.getState().phase==='playing')toggleStance();}
    };
    const up=(e:KeyboardEvent)=>{noteControl('keyup',e.code,e.target instanceof Element?e.target:null);controls.keys.delete(e.code);};
    const mouse=(e:MouseEvent)=>{
      if(document.pointerLockElement!==gl.domElement&&!controls.dragging)return;
      const settings=useGameStore.getState().settings;
      if(e.movementY)cancelLevelView();
      controls.yaw-=e.movementX*.0021*settings.sensitivity;
      controls.pitch=clamp(controls.pitch-e.movementY*.0018*settings.sensitivity*(settings.invertY?-1:1),-.9,.75);
    };
    const press=(e:MouseEvent)=>{if(document.pointerLockElement!==gl.domElement&&!controls.dragging)return;if(e.button===0){controls.keys.add('Fire');controls.fireUntil=performance.now()+120;}if(e.button===2){controls.aiming=true;controls.keys.add('Rocket');controls.rocketUntil=performance.now()+150;}};
    const release=(e:MouseEvent)=>{if(e.button===0)controls.keys.delete('Fire');if(e.button===2){controls.keys.delete('Rocket');controls.aiming=false;}controls.dragging=false;};
    const context=(e:Event)=>e.preventDefault();
    const lock=()=>{if(useGameStore.getState().phase==='playing'&&matchMedia('(pointer:fine)').matches&&document.pointerLockElement!==gl.domElement){const result=gl.domElement.requestPointerLock();result?.catch(()=>{controls.dragging=true;});}};
    const wheel=(e:WheelEvent)=>{e.preventDefault();const state=useGameStore.getState();state.setSettings({cameraDistance:clamp(state.settings.cameraDistance+e.deltaY*.01,6,18)});};
    const blur=()=>{noteControl('blur');resetControls();if(runtime.authority&&runtime.transport==='training'&&useGameStore.getState().phase==='playing')useGameStore.setState({phase:'paused'});};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('mousemove',mouse);window.addEventListener('mouseup',release);window.addEventListener('blur',blur);
    gl.domElement.addEventListener('mousedown',press);gl.domElement.addEventListener('click',lock);gl.domElement.addEventListener('contextmenu',context);gl.domElement.addEventListener('wheel',wheel,{passive:false});
    return()=>{unsubscribe();if(runtime.generation===generation){resetControls();if(runtime.resetInput===resetControls)runtime.resetInput=null;}if(runtime.reconcileInput===reconcile)runtime.reconcileInput=null;window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('mousemove',mouse);window.removeEventListener('mouseup',release);window.removeEventListener('blur',blur);gl.domElement.removeEventListener('mousedown',press);gl.domElement.removeEventListener('click',lock);gl.domElement.removeEventListener('contextmenu',context);gl.domElement.removeEventListener('wheel',wheel);inputMountedAt=null;sentReceipt.enabled=false;};
  },[gl]);
}
let previousReadAt=0;
export function readInput(){
  reconcileJump();const pending=outbox.pending;expireJump(outbox,performance.now());expireJump(strikeOutbox,performance.now());if(pending&&outbox.pending===0)note('cancel',pending);
  const k=controls.keys,active=useGameStore.getState().phase==='playing';
  const now=performance.now(),lookDt=previousReadAt?Math.min(.05,Math.max(0,(now-previousReadAt)/1000)):0;previousReadAt=now;
  if(active){
    controls.yaw+=((k.has('KeyJ')?1:0)-(k.has('KeyL')?1:0))*1.9*lookDt;
    if(k.has('KeyI')||k.has('KeyK'))cancelLevelView();
    if(controls.levelView){
      controls.pitch+=(.06-controls.pitch)*(1-Math.exp(-8*lookDt));
      if(Math.abs(controls.pitch-.06)<.003){controls.pitch=.06;cancelLevelView();}
    }else controls.pitch=clamp(controls.pitch+((k.has('KeyI')?1:0)-(k.has('KeyK')?1:0))*1.1*lookDt,-.9,.75);
  }
  const actor=runtime.snapshot?.actors.find(a=>a.id===runtime.localId);
  reconcileStance();
  controls.stance=stanceOutbox.pending?.target??actor?.stance??'quadruped';
  if(controls.touchJump)requestJump();if(controls.touchBoost){requestStrike();controls.boostUntil=now+150;}
  const input=runtime.input;
  if(!active||input.seq>=MAX_INPUT_COUNTER)resetControls();
  input.seq=Math.min(MAX_INPUT_COUNTER,input.seq+1);input.yaw=controls.yaw;input.aimYaw=Number.isFinite(controls.shotYaw)?controls.shotYaw:controls.yaw;input.pitch=controls.shotPitch;input.strikePitch=controls.pitch;input.stance=controls.stance;
  if(active&&stanceOutbox.pending)input.stanceRequest={seq:stanceOutbox.pending.seq,life:stanceOutbox.pending.life};else if(actor)input.stanceRequest={seq:0,life:actor.jumpEpoch};else delete input.stanceRequest;
  input.forward=active?clamp((k.has('KeyW')||k.has('ArrowUp')?1:0)-(k.has('KeyS')||k.has('ArrowDown')?1:0)-controls.touchY,-1,1):0;
  input.strafe=active?clamp((k.has('KeyD')||k.has('ArrowRight')?1:0)-(k.has('KeyA')||k.has('ArrowLeft')?1:0)+controls.touchX,-1,1):0;
  input.fire=active&&(k.has('Fire')||k.has('KeyF')||controls.touchFire||now<controls.fireUntil);input.rocket=active&&(k.has('Rocket')||k.has('KeyQ')||controls.touchRocket||now<controls.rocketUntil);
  input.jumpId=outbox.pending;input.jumpCancel=outbox.cancel;input.jumpEpoch=outbox.epoch;input.jump=active&&outbox.pending>outbox.cancel;
  input.strikeId=strikeOutbox.pending;input.strikeCancel=strikeOutbox.cancel;input.strikeEpoch=strikeOutbox.epoch;input.strike=active&&strikeOutbox.pending>strikeOutbox.cancel;
  if(input.jump&&!events.some(e=>e.kind==='sample'&&e.id===outbox.pending&&e.owner===outbox.owner&&e.epoch===outbox.epoch))note('sample');
  input.boost=active&&(k.has('ShiftLeft')||k.has('ShiftRight')||now<controls.boostUntil);input.interact=active&&(k.has('KeyE')||controls.touchInteract);
  input.climb=active&&(k.has('KeyC')||controls.touchClimb);
  controls.touchJump=false;controls.touchBoost=false;return input;
}
