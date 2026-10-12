import { createInterface } from 'node:readline';
import { step } from './controller.js';
import { coreFrames, poseOf, toWorld } from './kinematics.js';
import { add, length, mul, nativePoint, sub } from './coordinates.js';
import type { V3 } from './coordinates.js';
import type { BindDefinition, Carrier, ContactProvider, Frame, Limb, LimbState, OwnerState, Pad, Pose, SupportLease, Witness } from './contract.js';

interface Actual { readonly paw: Record<Limb, V3>; readonly hip: Record<Limb, V3> }
interface Message { readonly kind: 'init' | 'next' | 'observe'; readonly bind?: BindDefinition; readonly carrier?: Carrier; readonly actual?: Actual }
let bind: BindDefinition, state: OwnerState, frame: Frame, observed: Actual;
const dt = 1 / 120;
const emit = (value: object): void => { process.stdout.write(JSON.stringify(value) + '\n'); };
function stateLimb(k: Limb): LimbState {
  const chain = bind.chains[k], sole = toWorld(chain.restPlant, state.carrier);
  return { mode: 'loaded', point: nativePoint(sub(sole, chain.restSoleFromPaw)), velocity: [0,0,0], acceleration: [0,0,0], yaw: 0, yawRate: 0, yawAcceleration: 0,
    lease: { owner: 'controlled-floor', generation: 'source-floor-001', revision: 0, localPoint: sole, localYaw: 0 }, departingLease: null, plantGoal: null, elapsedLoaded: 0 };
}
function currentFrame(): Frame {
  const t = state.clock.time + dt, previous = state.carrier;
  const stance: 0 | 1 = t >= 2.75 && t < 3.6 || t >= 4.2 && t < 6.3 ? 1 : 0;
  const cancel = t >= 3.6 && t < 4.2;
  const targetSpeed = t < .25 || t >= 9.5 ? 0 : t >= 5.4 && t < 6.3 ? 4.864 : 7.6;
  const speedBefore = Math.hypot(previous.velocity[0], previous.velocity[2]);
  const speed = speedBefore + Math.max(-20*dt, Math.min(20*dt, targetSpeed-speedBefore));
  const turn = t >= 1.75 && t < 2.75 || t >= 7 && t < 8;
  const targetYawRate = turn ? Math.PI / 2 : 0;
  const yawRate = previous.yawRate + Math.max(-10*dt, Math.min(10*dt, targetYawRate-previous.yawRate));
  const yaw = previous.yaw + (previous.yawRate+yawRate)*.5*dt;
  const velocity: V3 = [Math.sin(yaw)*speed, 0, Math.cos(yaw)*speed];
  const acceleration = mul(sub(velocity, previous.velocity), 1/dt);
  const position = nativePoint(add(previous.position.value, mul(add(previous.velocity, velocity), .5*dt)));
  return { clock: { tick: state.clock.tick+1, time: t }, carrier: { position, yaw, velocity, acceleration, yawRate, yawAcceleration: (yawRate-previous.yawRate)/dt }, command: { stance, cancel, move: speed>0, turn } };
}
const witness = (f: Frame, kind: string, accepted = true, detail: object = {}): Witness => ({ clock: f.clock, evidence: 'controlled-source', accepted, kind, receipt: { scope: 'DIAGNOSTIC_ONLY_NO_NATIVE_FORCES_OR_CONTINUOUS_BODY_PROOF', ...detail } });
function pad(f: Frame, sole: V3, yaw: number): Pad {
  const obstacle = f.clock.time >= 8.5 && sole[2] > f.carrier.position.value[2]+.3;
  const height = obstacle ? .20 : 0;
  const revision = f.clock.time >= 8 && f.clock.time < 8.25 ? 1 : 0;
  return { ...witness(f, 'SOURCE_AUTHORED_PAD_PLANE', Math.abs(sole[1]-height)<.002), lease: { owner: obstacle ? 'source-obstacle' : 'controlled-floor', generation: 'source-floor-001', revision, localPoint: [sole[0],height,sole[2]], localYaw: yaw }, point: nativePoint([sole[0],height,sole[2]]), yaw, normal: [0,1,0], velocity: [0,0,0] };
}
const provider: ContactProvider = {
  committedPose(f, expected) {
    let error = 0;
    for (const k of ['FL','FR','HL','HR'] as const) error = Math.max(error, length(sub(observed.paw[k],expected.chains[k].pawWorld.value)), length(sub(observed.hip[k],expected.chains[k].hipWorld.value)));
    return witness(f, 'ACTUAL_BLENDER_CURRENT_BONE_READBACK', error <= .00002, { maximumNativeMetreReadbackError: error, limitPurpose: 'float32 matrix readback, not physical contact tolerance' });
  },
  transport(f, _k, lease) { const current = pad(f, lease.localPoint, lease.localYaw); return { ...current, kind: 'STATIC_SOURCE_SUPPORT_TRANSPORT', acceleration: [0,0,0], yawRate: 0, yawAcceleration: 0 }; },
  pad(f, _k, sole, yaw) { return pad(f,sole.value,yaw); },
  findPlant(f,_k,hip,preference,reach) { const p = pad(f,[preference.value[0],0,preference.value[2]],f.carrier.yaw); return length(sub(p.point.value,hip.value)) < reach ? p : null; },
  authorizeUnload(f,_k,_lease,_pose,batch) { return witness(f,'SOURCE_LOAD_TRANSFER_APPROXIMATION',batch.length<=2,{ prototypeMassKg:1800, noCOMOrForceProof:true }); },
  release(f,k,lease,pose) { return witness(f,'ACTUAL_COMMITTED_SOURCE_SOLE_SEPARATION',pose.chains[k].soleWorld.value[1] - lease.localPoint[1] >= .002, { sole: pose.chains[k].soleWorld.value, sourceSurface: lease.localPoint }); },
  footSweep(f,_k,from,to) { return witness(f,'SOURCE_ENDPOINT_PATH_ONLY_CONTINUOUS_SWEEP_UNKNOWN',to.point.value[1] >= -.2,{ from:from.point, to:to.point }); },
  bodySweep(f,_from,_to) { return witness(f,'SOURCE_BODY_GEOMETRY_CHECK_AFTER_ADAPTER_ONLY',true,{ continuousClearance:'UNKNOWN' }); },
  loadSupport(f,_pose,limbs) { const loaded = (['FL','FR','HL','HR'] as const).filter(k=>limbs[k].lease!==null).length; return witness(f,'SOURCE_LOAD_COUNT_APPROXIMATION',loaded>=2,{ loaded, nativeForceProof:false }); },
};
// The source-only body receipt declares its missing continuous proof rather than standing in for a native adapter.

createInterface({ input:process.stdin }).on('line',(line:string)=>{
  try {
    const m: Message = JSON.parse(line);
    if (m.kind==='init') {
      if (!m.bind || !m.carrier) throw Error('BIND_AND_CARRIER_REQUIRED'); bind=m.bind;
      const placeholder: LimbState = { mode:'recovery',point:nativePoint([0,0,0]),velocity:[0,0,0],acceleration:[0,0,0],yaw:0,yawRate:0,yawAcceleration:0,lease:null,departingLease:null,plantGoal:null,elapsedLoaded:0 };
      state={ executionEvidence:'controlled-source',clock:{tick:0,time:0},carrier:m.carrier,body:{amount:0,rate:0,acceleration:0,target:0,requestedAt:0},limbs:{FL:placeholder,FR:placeholder,HL:placeholder,HR:placeholder} };
      state={...state,limbs:{FL:stateLimb('FL'),FR:stateLimb('FR'),HL:stateLimb('HL'),HR:stateLimb('HR')}};
      emit({kind:'initial',state,pose:poseOf(bind,state.carrier,0,state.limbs),core:coreFrames(bind,0)});
    } else if (m.kind==='next') {
      frame=currentFrame(); emit({kind:'observe',frame,pose:poseOf(bind,frame.carrier,state.body.amount,state.limbs),core:coreFrames(bind,state.body.amount)});
    } else {
      if (!m.actual) throw Error('CURRENT_BLENDER_READBACK_REQUIRED'); observed=m.actual;
      const result=step(bind,state,frame,provider); emit({kind:'proposed',result,core:coreFrames(bind,result.pose.coreAmount)}); if(result.ok)state=result.state;
    }
  } catch(error) { emit({kind:'execution-error',error:String(error)}); process.exitCode=1; }
});

