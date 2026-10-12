import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {PerspectiveCamera,Vector3} from 'three';
import type {ActorState} from '../shared/types';
import {createPair} from '../shared/pairedCombat';
import {advancePairCamera,advancePairCameraDistance,cameraPairOther,createPairCamera,PAIR_CAMERA_LIMITS} from '../src/game/camera/pairFraming';
import {cameraClearance} from '../src/game/camera/clearance';
import {cameraPose} from '../src/game/camera/framing';

beforeAll(async()=>{await RAPIER.init();});
const local={x:0,y:2,z:0},other={x:0,y:2,z:-3.5};
it('frames only the reciprocal actual live participant, never a nearby unpaired bystander',()=>{
  const a={id:'a',hp:100,chassis:'pounce',bot:false,stance:'quadruped',jumpEpoch:1,grounded:true,shieldUntil:0,climb:null,position:local} as ActorState;
  const b={...a,id:'b',position:other} as ActorState;
  const pair=createPair(a,b,1,{x:0,y:0,z:1},1)!;a.pair=pair[0];b.pair=pair[1];
  expect(cameraPairOther(a,[a,b])).toBe(b);
  expect(cameraPairOther(a,[a,{...b,pair:null}])).toBeNull();
  expect(cameraPairOther(a,[a,{...b,jumpEpoch:2}])).toBeNull();
  expect(cameraPairOther(a,[a,{...b,hp:0}])).toBeNull();
  expect(cameraPairOther(a,[a,{...b,position:{...other,z:-20}}])).toBeNull();
});
it('acquires a readable side bias with finite translation/rotation/zoom and releases along the same path',()=>{
  const s=createPairCamera(),dt=1/60;
  for(let frame=0;frame<60;frame++){
    const before={offset:{...s.offset},yaw:s.yaw,extra:s.extra};advancePairCamera(s,local,other,'pair',0,.06,false,dt);advancePairCameraDistance(s,40,dt);
    expect(Math.hypot(s.offset.x-before.offset.x,s.offset.y-before.offset.y,s.offset.z-before.offset.z)).toBeLessThanOrEqual(PAIR_CAMERA_LIMITS.focusRate*dt+1e-12);
    expect(Math.abs(s.yaw-before.yaw)).toBeLessThanOrEqual(PAIR_CAMERA_LIMITS.yawRate*dt+1e-12);expect(s.extra-before.extra).toBeLessThanOrEqual(PAIR_CAMERA_LIMITS.extraRate*dt+1e-12);
    expect(Math.hypot(s.offset.x,s.offset.y,s.offset.z)).toBeLessThanOrEqual(2.5);expect(Math.abs(s.yaw)).toBeLessThanOrEqual(.7);expect(s.extra).toBeLessThanOrEqual(4);
  }
  const camera=new PerspectiveCamera(59,1.6,.1,850),focus=new Vector3(local.x+s.offset.x,local.y+s.offset.y,local.z+s.offset.z),look=new Vector3();cameraPose(focus,s.yaw,.06,10+s.extra,camera.position,look);camera.lookAt(look);camera.updateMatrixWorld();
  const p=new Vector3(local.x,local.y,local.z).project(camera),q=new Vector3(other.x,other.y,other.z).project(camera);expect(Math.abs(p.x-q.x)).toBeGreaterThan(.15);
  const initial={focus:Math.hypot(s.offset.x,s.offset.y,s.offset.z),yaw:Math.abs(s.yaw),extra:s.extra};
  for(let i=0;i<120;i++){
    const previous={offset:{...s.offset},yaw:s.yaw,extra:s.extra};advancePairCamera(s,local,null,'',0,.06,false,dt);advancePairCameraDistance(s,0,dt);
    expect(Math.abs(s.yaw-previous.yaw)).toBeLessThanOrEqual(1.2*dt+1e-12);
    expect(Math.hypot(s.offset.x-previous.offset.x,s.offset.y-previous.offset.y,s.offset.z-previous.offset.z)).toBeLessThanOrEqual(3*dt+1e-12);
    expect(s.extra).toBeLessThanOrEqual(previous.extra);expect(previous.extra-s.extra).toBeLessThanOrEqual(3*dt+1e-12);
  }
  // Finite capped acquisition/release is followed by an asymptotic tail, not
  // a timer snap to zero. Bound that tail from the declared 5 Hz response,
  // rate limit and at most one quantized frame at the linear/exponential seam.
  const tailBound=(start:number,rate:number)=>{
    const seam=rate*dt/(1-Math.exp(-5*dt)),linearTime=Math.max(0,(start-seam)/rate)+dt;
    return linearTime>=2?start:Math.min(start,seam*Math.exp(-5*(2-linearTime)));
  };
  expect(Math.hypot(s.offset.x,s.offset.y,s.offset.z)).toBeLessThanOrEqual(tailBound(initial.focus,3));
  expect(Math.abs(s.yaw)).toBeLessThanOrEqual(tailBound(initial.yaw,1.2));expect(s.extra).toBeLessThanOrEqual(tailBound(initial.extra,3));
});
it('yields to unrestricted deliberate user orbit, aim and steep pitch without snapping the bias',()=>{
  for(const mode of ['orbit','aim','pitch']){
    const s=createPairCamera();for(let i=0;i<60;i++)advancePairCamera(s,local,other,'pair',0,.06,false,1/60);
    const initial=Math.abs(s.yaw);let userYaw=0;
    for(let i=0;i<60;i++){if(mode==='orbit')userYaw+=.06;const before=s.yaw;advancePairCamera(s,local,other,'pair',userYaw,mode==='pitch'?.75:.06,mode==='aim',1/60);expect(Math.abs(before-s.yaw)).toBeLessThanOrEqual(1.2/60+1e-12);}
    expect(Math.abs(s.yaw)).toBeLessThan(initial*.02);expect(s.previousYaw).toBe(userYaw);expect(s.active).toBe(false);
  }
});
it('applies the unchanged real native sphere sweep to the pair focus and boom',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0});try{
    world.createCollider(RAPIER.ColliderDesc.cuboid(.2,8,8).setTranslation(3,4,0));world.step();
    const s=createPairCamera(),wanted=new Vector3(),look=new Vector3();
    for(let i=0;i<90;i++){
      advancePairCamera(s,local,other,'pair',0,.06,false,1/60);const focus=cameraClearance(world,local,{x:local.x+s.offset.x,y:local.y+s.offset.y,z:local.z+s.offset.z});cameraPose(focus,s.yaw,.06,12,wanted,look);
      const safe=cameraClearance(world,focus,wanted);expect(world.intersectionWithShape(safe,{x:0,y:0,z:0,w:1},new RAPIER.Ball(.245))).toBeNull();
      // Actual finite box, not an infinite x=2.8 plane: the boom may sweep
      // around its z=8 edge while still retaining the full .26 m sphere.
      const dx=Math.max(2.8-safe.x,0,safe.x-3.2),dy=Math.max(-4-safe.y,0,safe.y-12),dz=Math.max(-8-safe.z,0,safe.z-8);
      expect(Math.hypot(dx,dy,dz)).toBeGreaterThanOrEqual(.26);
    }
  }finally{world.free();}
});
