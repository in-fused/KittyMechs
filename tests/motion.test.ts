import { describe,expect,it,vi } from 'vitest';
import { combatPose,COMBAT_DURATIONS,createTurnPose,turnPose,turnPawSupport,TURN_GAITS,distancePhase,gaitCadence,gaitWeights,landingCompression,pawSupport,QUAD_DUTIES,QUAD_STRIDES,signedAngle,solveKnee,stancePose,terrainAttitude,traversalClip,wallContact,wallCycle,WALL_GAITS } from '../src/game/entities/felineMotion';
import { Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { ACTOR_RADII, CLIMB_HEIGHT, MECHS, QUADRUPED_HEIGHT, SENTINEL_HEIGHT, STANCE_TRANSITION, UPRIGHT_HEIGHT } from '../shared/config';
import type { ActorState, ClimbState, GameSnapshot } from '../shared/types';
import { createRenderTimeline, forgetRenderActor, pushRenderSample, sampleRenderActor, sampleRenderTimeline } from '../src/game/entities/renderTimeline';
import { runtime } from '../src/game/runtime';
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));

const motionActor=(x:number,yaw=0):ActorState=>({id:'timeline',name:'Timeline',chassis:'pounce',bot:false,position:{x,y:1,z:0},velocity:{x:6,y:0,z:0},yaw,aimYaw:yaw,aimPitch:0,hp:100,maxHp:100,energy:100,heat:0,kills:0,salvage:0,grounded:true,boostUntil:0,shieldUntil:0,windupUntil:0,abilityReadyAt:0,rocketReadyAt:0,stance:'quadruped',stanceChangedAt:-100,climb:null,climbDetachedAt:-100,pulseAt:-100,rocketAt:-100,abilityAt:-100,hurtAt:-100,diedAt:-100,disruptedUntil:0,respawnAt:0,hitAt:-100,fireAt:-100,aiState:'patrol',lastInput:0,jumpEpoch:1,strikeProcessed:0,strikeEndedAt:-100,strike:null,jumpProcessed:0});

describe('feline visual motion',()=>{
  it('keeps blend weights normalized across the full speed range',()=>{
    for(let speed=0;speed<25;speed+=.13){const g=gaitWeights(speed,7.6,true);expect(Object.values(g).reduce((sum,n)=>sum+n,0)).toBeCloseTo(1);expect(Object.values(g).every(n=>n>=0&&n<=1)).toBe(true);}
    expect(gaitWeights(0,7.6,true).idle).toBe(1);expect(gaitWeights(10,7.6,true).gallop).toBe(1);expect(gaitWeights(5,7.6,false).air).toBe(1);
  });
  it('transitions continuously at each gait boundary and scales for a slower chassis',()=>{
    for(const ratio of [.16,.52,.88]){const before=gaitWeights(7.6*(ratio-.00001),7.6,true),after=gaitWeights(7.6*(ratio+.00001),7.6,true);for(const key of Object.keys(before) as (keyof typeof before)[])expect(Math.abs(before[key]-after[key])).toBeLessThan(.001);}
    expect(gaitWeights(3.8,7.6,true)).toEqual(gaitWeights(2.8,5.6,true));
  });
  it('matches paw support travel to body speed for each distinct authored stride and duty',()=>{
    for(const chassis of ['pounce','bastion','lynx','caracal'] as const)for(let i=0;i<3;i++){const speed=MECHS[chassis].speed,scale=MECHS[chassis].scale,stride=QUAD_STRIDES[chassis][i],duty=QUAD_DUTIES[chassis][i],duration=[70/60,42/60,31/60][i],rate=gaitCadence(speed,stride,duty,duration,scale);
      expect(stride/duty/duration*rate*scale).toBeCloseTo(speed);
    }
  });
  it('keeps shared distance footfalls continuous through stopping, reversal and gait changes',()=>{
    let phase=.93;phase=distancePhase(phase,.2,.9);expect(phase).toBeCloseTo(.93+.2/.9-1);
    expect(distancePhase(phase,0,.5)).toBe(phase);expect(distancePhase(phase,.2,.9,-1)).toBeCloseTo(.93);
    for(let i=0;i<120;i++){phase=distancePhase(phase,.05,i<60?.9:1.6);expect(phase).toBeGreaterThanOrEqual(0);expect(phase).toBeLessThan(1);}
  });
  it('releases low-lift swing paws and preserves each authored support duty',()=>{
    const gentle=gaitWeights(.18,7.6,true);expect(gentle.walk).toBeGreaterThan(.5);expect(pawSupport('pounce','FL',.9,gentle)).toBe(0);expect(pawSupport('pounce','FL',.35,gentle)).toBe(1);
    for(const chassis of ['pounce','bastion','lynx','caracal'] as const)for(let gait=0;gait<3;gait++)for(const limb of ['FL','FR','HL','HR']){const weights={idle:0,walk:0,trot:0,gallop:0,air:0};weights[(['walk','trot','gallop'] as const)[gait]]=1;let support=0;
      for(let frame=0;frame<1000;frame++)support+=pawSupport(chassis,limb,frame/1000,weights)/1000;
      expect(support).toBeCloseTo(QUAD_DUTIES[chassis][gait]-.04,2);
    }
    expect(pawSupport('pounce','HL',.8,gentle,true)).toBe(0);expect(pawSupport('pounce','HR',.8,gentle,true)).toBe(1);
  });
  it('drives turn cycles from realized angular travel and freezes all phases during a held snapshot',()=>{
    for(const chassis of ['pounce','bastion','lynx','caracal'] as const){const pose=createTurnPose(),g=TURN_GAITS[chassis];
      turnPose(chassis,.1,0,8,1/60,true,false,pose);expect(pose.phase).toBeCloseTo(.1*g.duty/g.arc);expect(pose.weight).toBeGreaterThan(0);
      const held=pose.phase;for(let i=0;i<90;i++)turnPose(chassis,0,0,8,1/60,true,false,pose);expect(pose.phase).toBe(held);expect(pose.weight).toBe(0);
      turnPose(chassis,-.1,0,8,1/60,true,false,pose);expect(pose.phase).toBeCloseTo(.2*g.duty/g.arc);expect(pose.left).toBeLessThan(1);
      const before=pose.left;turnPose(chassis,.48,0,8,1/60,true,false,pose);expect(pose.left-before).toBeLessThan(.27);expect(pose.phase).toBeCloseTo((.68*g.duty/g.arc)%1);
      turnPose(chassis,.2,0,8,1/60,true,true,pose);expect(pose).toEqual(createTurnPose());
    }
  });
  it('replants stationary turn paws using distinct mirrored footfalls without acquiring a swinging lock',()=>{
    const idle=gaitWeights(0,8,true),profiles=new Set<string>();
    for(const chassis of ['pounce','bastion','lynx','caracal'] as const){const turn=createTurnPose();turn.weight=1;profiles.add(JSON.stringify(TURN_GAITS[chassis]));let swings=0;
      for(let frame=0;frame<300;frame++){turn.phase=frame/300;let supports=0;
        for(const limb of ['FL','FR','HL','HR']){const s=pawSupport(chassis,limb,0,idle,false,turn);if(s===0)swings++;if(s>.55)supports++;
          expect(s).toBeCloseTo(turnPawSupport(chassis,limb,turn.phase,true),12);expect(turnPawSupport(chassis,limb,turn.phase,false)).toBe(turnPawSupport(chassis,limb[0]+(limb[1]==='L'?'R':'L'),turn.phase,true));
        }expect(supports).toBeGreaterThanOrEqual(2);
      }expect(swings).toBeGreaterThan(100);
      turn.left=.5;turn.phase=.9;for(const limb of ['FL','FR','HL','HR'])expect(pawSupport(chassis,limb,0,idle,false,turn)).toBeLessThanOrEqual(Math.min(turnPawSupport(chassis,limb,.9,true),turnPawSupport(chassis,limb,.9,false)));
      expect(pawSupport(chassis,'HL',.8,idle,true,turn)).toBe(pawSupport(chassis,'HL',.8,idle,true));
      expect(pawSupport(chassis,'HL',0,idle,true,turn,true)).toBe(1);
      expect(pawSupport(chassis,'FL',.9,gaitWeights(.2,8,true),false,undefined,true)).toBe(1);
      turn.left=1;expect(pawSupport(chassis,'FL',.9,{idle:0,walk:1,trot:0,gallop:0,air:0},false,turn)).toBeCloseTo(turnPawSupport(chassis,'FL',turn.phase,true),12);
    }expect(profiles.size).toBe(4);
  });
  it('suppresses turn actions for resets and excluded forms while blending out at travel speed',()=>{
    const pose=createTurnPose();for(let i=0;i<60;i++)turnPose('pounce',.02,0,8,1/60,true,false,pose);expect(pose.weight).toBeGreaterThan(.99);
    const phase=pose.phase;turnPose('pounce',0,0,8,1/60,true,false,pose);expect(pose.phase).toBe(phase);expect(pose.weight).toBeGreaterThan(.7);
    for(let i=0;i<60;i++)turnPose('pounce',.02,4,8,1/60,true,false,pose);expect(pose.weight).toBe(0);
    turnPose('pounce',.48,0,8,1/60,false,false,pose);expect(pose).toEqual(createTurnPose());
  });
  it('limits steep terrain lean and takes the short route across a heading wrap',()=>{
    expect(terrainAttitude(0,0,0,0,1,.7)).toEqual({pitch:0,roll:0});expect(terrainAttitude(100,-100,100,-100,1,.7)).toEqual({pitch:.2,roll:.18});
    expect(signedAngle(-Math.PI*2+.1)).toBeCloseTo(.1);expect(signedAngle(Math.PI*2-.1)).toBeCloseTo(-.1);
    expect(landingCompression(-30)).toBe(1);expect(landingCompression(5)).toBe(0);
  });
  it('keeps contact IK limb lengths fixed and clamps an unreachable paw',()=>{
    const hip=new Vector3(0,2,0),knee=new Vector3(0,1,.4),joint=new Vector3(),axis=new Vector3(),pole=new Vector3();
    for(const target of [new Vector3(0,.1,0),new Vector3(.3,.2,.4),new Vector3(0,-20,0)]){
      solveKnee(hip,knee,target,1.1,1,joint,axis,pole);expect(hip.distanceTo(joint)).toBeCloseTo(1.1);expect(joint.distanceTo(target)).toBeCloseTo(1);expect(joint.z).toBeGreaterThan(0);
    }
  });
  it('samples the same replicated transformation for a late observer and reverses smoothly',()=>{
    const halfway=stancePose('upright',10,10.35,.7);expect(halfway.amount).toBeCloseTo(.5);expect(halfway.clipTime).toBeCloseTo(.35);expect(halfway.transitionWeight).toBe(1);
    expect(stancePose('quadruped',10,10.35,.7).amount).toBeCloseTo(.5);
    expect(stancePose('upright',10,10,.7).amount).toBe(0);expect(stancePose('upright',10,11,.7).amount).toBe(1);expect(stancePose('quadruped',10,11,.7).amount).toBe(0);
    expect(stancePose('quadruped',-100,0,.7).transitionWeight).toBe(0);
  });
  it('keeps transformation and locomotion blend weights normalized through both directions',()=>{
    for(const stance of ['upright','quadruped'] as const)for(let t=0;t<.8;t+=.003){const pose=stancePose(stance,0,t,.7),remaining=1-pose.transitionWeight;expect((1-pose.amount)*remaining+pose.amount*remaining+pose.transitionWeight).toBeCloseTo(1);expect(pose.amount).toBeGreaterThanOrEqual(0);expect(pose.amount).toBeLessThanOrEqual(1);}
  });
  it('keeps authored rear forms within the collision hull with planted transition hind paws',()=>{
    for(const chassis of ['pounce','bastion','lynx','caracal'] as const){
      const evidence=JSON.parse(readFileSync(new URL(`../assets/reference/upright-bounds-${chassis}.json`,import.meta.url),'utf8')) as {clips:{clip:string;duration:number;height:number;radius:number;floor:number;hindPawMin:number;hindPawMax:number;forePawMin:number}[]};
      expect(evidence.clips.map(clip=>clip.clip)).toContain('FelineUprightAir');
      for(const clip of evidence.clips){expect(clip.height).toBeLessThan(UPRIGHT_HEIGHT);expect(clip.radius).toBeLessThan(ACTOR_RADII[chassis]+.025);expect(clip.floor).toBeGreaterThan(-.025);
        if(clip.clip.includes('Transform')){expect(clip.duration).toBe(STANCE_TRANSITION);expect(clip.hindPawMax-clip.hindPawMin).toBeLessThan(.003);}
        if(clip.clip==='FelineUprightIdle'){expect(clip.height).toBeGreaterThan(3);expect(clip.forePawMin).toBeGreaterThan(1.7);}
      }
    }
  });
  it('locks support stride to actual ascent distance for all chassis, including a stalled grip',()=>{
    for(const chassis of ['pounce','bastion','lynx','caracal'] as const){
      const gait=WALL_GAITS[chassis],scale=MECHS[chassis].scale,height=13.1,distance=.02,progress=.017;
      const before=wallCycle(chassis,scale,progress,height),after=wallCycle(chassis,scale,progress+distance/height,height);
      // Relative support travel cancels the authoritative ascent during stance.
      expect((after-before)*gait.stride*scale*gait.depth/gait.duty).toBeCloseTo(distance);
      expect(wallCycle(chassis,scale,progress,height)).toBe(before);
    }
  });
  it('projects pads onto rotated wall planes without changing height or tangent offsets',()=>{
    const n={x:Math.SQRT1_2,y:0,z:Math.SQRT1_2},point={x:12,y:0,z:8},paw=new Vector3(13,4,6),out=new Vector3();
    wallContact(paw,point,n,.14,1,out);expect((out.x-point.x)*n.x+(out.z-point.z)*n.z).toBeCloseTo(.14);expect(out.y).toBe(4);
    expect((out.x-paw.x)*n.z-(out.z-paw.z)*n.x).toBeCloseTo(0);expect(wallContact(paw,point,n,.14,0,out)).toEqual(paw);
  });
  it('samples replicated grab and mantle progress while holding a stopped wall pose',()=>{
    const climb:ClimbState={anchor:'test',phase:'grab',startedAt:10,progress:.5,normal:{x:1,y:0,z:0},contact:{x:0,y:1.4,z:0},top:13.1,base:0,height:13.1,gripMask:15,roofMask:0,mantleStage:null,mantleStageAt:0};
    expect(traversalClip(climb,100,.7)).toEqual({index:10,phase:.5,wall:.5,roof:0});
    climb.phase='cling';expect(traversalClip(climb,11,.3).phase).toBe(0);expect(traversalClip(climb,20,.3).phase).toBe(0);
    climb.phase='climb';expect(traversalClip(climb,11,.3).phase).toBe(.3);expect(traversalClip(climb,20,.3).phase).toBe(.3);
    climb.phase='mantle';expect(traversalClip(climb,11,0)).toEqual({index:13,phase:.5,wall:.5,roof:.5});climb.progress=1;expect(traversalClip(climb,11,0).wall).toBe(0);expect(traversalClip(climb,11,0).roof).toBe(1);
  });
  it('keeps authored traversal armor in its hull and wall paws on the facade plane',()=>{
    for(const chassis of ['pounce','bastion','lynx','caracal'] as const){
      const evidence=JSON.parse(readFileSync(new URL(`../assets/reference/climb-bounds-${chassis}.json`,import.meta.url),'utf8')) as {clips:{clip:string;height:number;coreRadius:number;sideExtent:number;floor:number;rootTranslation:number;rootRotation:number;wallClearanceMin:number;stanceContactError:number}[]};
      expect(evidence.clips.map(c=>c.clip)).toEqual(['FelineGrab','FelineCling','FelineClimb','FelineMantle']);
      for(const clip of evidence.clips){expect(clip.height).toBeLessThan(CLIMB_HEIGHT);expect(clip.coreRadius).toBeLessThan(ACTOR_RADII[chassis]+.025);expect(clip.sideExtent).toBeLessThan(ACTOR_RADII[chassis]);expect(clip.floor).toBeGreaterThan(-.025);expect(clip.rootTranslation).toBeLessThan(.00001);expect(clip.rootRotation).toBeLessThan(.00001);
        if(clip.clip!=='FelineMantle')expect(clip.wallClearanceMin).toBeGreaterThan(-.00001);
        if(clip.clip==='FelineCling')expect(clip.stanceContactError).toBeLessThan(.002);
      }
    }
  });
  it('plays only accepted timestamp windows, with late observers and repeated hits agreeing',()=>{
    expect(combatPose([-100,-100,-100,-100,-100],true,0).index).toBe(-1);
    expect(combatPose([0,-100,-100,-100,-100],true,.05).index).toBe(0);
    const times=[10,9,8,9,-100];expect(combatPose(times,true,10.08)).toEqual(combatPose(times,true,10.08));
    times[3]=10.1;expect(combatPose(times,true,10.15).index).toBe(0);expect(combatPose(times,true,10.25).index).toBe(3);expect(combatPose(times,true,10.25).elapsed).toBeCloseTo(.15);
    expect(combatPose(times,true,10.1+COMBAT_DURATIONS[3]+.01).index).toBe(-1);
  });
  it('preserves visible accepted-fire recoil under every-tick area damage',()=>{
    const timestamps=[-100,-100,-100,-100,-100];let visible=0;
    for(let tick=0;tick<60;tick++){const time=20+tick/60;timestamps[3]=time;if(tick%10===0)timestamps[0]=time;const pose=combatPose(timestamps,true,time);if(pose.index===0&&pose.weight>.1)visible++;expect(pose.index).not.toBe(3);}
    expect(visible).toBeGreaterThanOrEqual(48);
    timestamps[0]=19;expect(combatPose(timestamps,true,21.05).index).toBe(3);
  });
  it('holds death final pose by authority time and clears all reactions on respawn',()=>{
    const times=[4,4,4,4,4],dead=combatPose(times,false,9);expect(dead.index).toBe(4);expect(dead.weight).toBe(1);expect(dead.elapsed).toBe(COMBAT_DURATIONS[4]);
    expect(combatPose(times,true,9).index).toBe(-1);expect(combatPose([-100,-100,-100,-100,-100],true,9).index).toBe(-1);
    expect(combatPose([11,-100,-100,-100,-100],true,10).index).toBe(-1);
  });
  it('admits every rig clip against its actual body envelope with rigid limb lengths',()=>{
    for(const [name,radius,bot] of [['pounce',1.75,false],['bastion',2.05,false],['lynx',1.65,false],['caracal',1.85,false],['sentinel_scout',1.45,true],['sentinel_mortar',1.75,true],['sentinel_anchor',2.2,true]] as const){
      const evidence=JSON.parse(readFileSync(new URL(`../assets/reference/rig-bounds-${name}.json`,import.meta.url),'utf8')) as {gaitStyle:{strides:number[];duties:number[]};clips:{clip:string;height:number;coreRadius:number;floor:number;rootTranslation:number;rootRotation:number;limbLengthError:number}[]};
      expect(evidence.clips.length).toBe(bot?17:32);
      if(!bot){expect(evidence.gaitStyle.strides).toEqual(QUAD_STRIDES[name]);expect(evidence.gaitStyle.duties).toEqual(QUAD_DUTIES[name]);}
      for(const clip of evidence.clips){const tall=clip.clip.includes('Upright')||clip.clip.includes('Transform');expect(clip.height).toBeLessThan(tall?UPRIGHT_HEIGHT:bot?SENTINEL_HEIGHT:QUADRUPED_HEIGHT);expect(clip.coreRadius).toBeLessThan(radius+.025);expect(clip.rootTranslation).toBeLessThan(.00001);expect(clip.rootRotation).toBeLessThan(.00001);expect(clip.limbLengthError).toBeLessThan(.005);
        if(clip.clip.includes('Death'))expect(clip.floor).toBeGreaterThan(-.01);
      }
    }
  });
  it('keeps full additive attack poses within the measured core armor envelope',()=>{
    const evidence=JSON.parse(readFileSync(new URL('../assets/reference/combat-composition-evidence.json',import.meta.url),'utf8')) as {name:string;samples:number;quad:{coreRadius:number;coreHeight:number};upright:{coreRadius:number;coreHeight:number}}[];
    const radii:Record<string,number>={Pounce:1.75,Bastion:2.05,Lynx:1.65,Caracal:1.85,Sentinel_Scout:1.45,Sentinel_Mortar:1.75,Sentinel_Anchor:2.2};
    expect(evidence.length).toBe(7);
    for(const rig of evidence){const bot=rig.name.startsWith('Sentinel');expect(rig.samples).toBe(bot?320:512);expect(rig.quad.coreRadius).toBeLessThan(radii[rig.name]+.025);expect(rig.quad.coreHeight).toBeLessThan(bot?SENTINEL_HEIGHT:QUADRUPED_HEIGHT);
      if(!bot){expect(rig.upright.coreRadius).toBeLessThan(radii[rig.name]+.025);expect(rig.upright.coreHeight).toBeLessThan(UPRIGHT_HEIGHT);}
    }
  });
});

describe('coherent feline presentation timeline',()=>{
  it('releases a confirmed powered vault at its clock without admitting future roof contact',()=>{
    const wall:ClimbState={anchor:'face',phase:'climb',startedAt:.8,progress:.12,normal:{x:1,y:0,z:0},contact:{x:0,y:2,z:0},top:10,base:0,height:10,gripMask:3,roofMask:0,mantleStage:null,mantleStageAt:0};
    const sample=(time:number,after:ClimbState)=>{const track=createRenderTimeline();pushRenderSample(track,{...motionActor(0),climb:wall},1);pushRenderSample(track,{...motionActor(.01),climb:after},1.05);return sampleRenderTimeline(track,0,0,0,1.05-time)!;};
    const vault:ClimbState={...wall,phase:'mantle',startedAt:1.02,progress:.09,gripMask:0,mantleStage:'out',mantleStageAt:1.02};
    expect(sample(1.019,vault).climb?.phase).toBe('climb');
    for(const time of [1.02,1.025,1.04]){const pose=sample(time,vault);expect(pose.climb?.phase).toBe('mantle');expect(pose.climb?.startedAt).toBe(1.02);expect(pose.climb?.gripMask).toBe(0);expect(pose.climb?.roofMask).toBe(0);expect(pose.climbProgress).toBeCloseTo(.09*(time-1.02)/.03);}
    const track=createRenderTimeline(),lift={...vault,startedAt:.8,mantleStage:'lift' as const,mantleStageAt:.9,progress:.39},transfer={...lift,mantleStage:'transfer' as const,mantleStageAt:1.02,progress:.42,roofMask:3};
    pushRenderSample(track,{...motionActor(0),climb:lift},1);pushRenderSample(track,{...motionActor(.01),climb:transfer},1.05);
    const between=sampleRenderTimeline(track,0,0,0,.02)!;expect(between.climb?.mantleStage).toBe('transfer');expect(between.climb?.mantleStageAt).toBe(1.02);expect(between.climb?.roofMask).toBe(0);
    const received=sampleRenderTimeline(track,1,.05,0,0)!;expect(received.climb?.roofMask).toBe(3);
    expect(wall.gripMask).toBe(3);expect(transfer.roofMask).toBe(3);
    expect(sample(1.04,{...vault,anchor:'other-face'}).climb?.phase).toBe('climb');
  });
  it('absorbs jittered20Hz packets without spatial stair steps or extrapolation',()=>{
    const track=createRenderTimeline();let packet=0,arrival=0,previous=0;const steps:number[]=[];
    for(let frame=0;frame<=120;frame++){const now=frame/120;
      while(packet<21&&packet*.05+[0,0,.028,0,.018][packet%5]<=now+.000001){arrival=packet*.05+[0,0,.028,0,.018][packet%5];pushRenderSample(track,motionActor(packet*.3),packet*.05);packet++;}
      const pose=sampleRenderTimeline(track,now,1/120,now-arrival,.1)!;
      expect(pose.position.x).toBeGreaterThanOrEqual(previous-.000001);expect(pose.position.x).toBeLessThanOrEqual((packet-1)*.3+.000001);
      if(frame>24)steps.push(pose.position.x-previous);previous=pose.position.x;
    }
    expect(Math.min(...steps)).toBeGreaterThan(.035);expect(Math.max(...steps)).toBeLessThan(.061);expect(track.count).toBe(8);
  });
  it('keeps advancing on unchanged snapshots and shares exactly one sample with the camera',()=>{
    const saved={snapshot:runtime.snapshot,previous:runtime.previous,sim:runtime.sim,authority:runtime.authority,receivedAt:runtime.receivedAt},clock=vi.spyOn(performance,'now');
    try {runtime.authority=false;runtime.sim=null;runtime.previous={time:0,actors:[motionActor(0)]} as GameSnapshot;runtime.snapshot={time:.05,actors:[motionActor(.3)]} as GameSnapshot;runtime.receivedAt=0;
      const positions:number[]=[];let resets=0;
      for(let frame=0;frame<36;frame++){clock.mockReturnValue(frame/120*1000);const a=sampleRenderActor('timeline',frame/120,1/120)!,x=a.position.x,b=sampleRenderActor('timeline',frame/120,1/120)!;expect(b).toBe(a);expect(b.position.x).toBe(x);positions.push(x);if(a.reset)resets++;}
      expect(resets).toBe(1);expect(new Set(positions).size).toBeGreaterThan(4);expect(positions.at(-1)).toBe(.3);expect(sampleRenderActor('timeline',1,1/120)!.velocity.x).toBe(0);
    }finally{forgetRenderActor('timeline');Object.assign(runtime,saved);clock.mockRestore();}
  });
  it('reads live60Hz authority actors while20Hz broadcast snapshots are unchanged',()=>{
    const saved={snapshot:runtime.snapshot,previous:runtime.previous,sim:runtime.sim,authority:runtime.authority},clock=vi.spyOn(performance,'now'),live=motionActor(0);
    const sim={time:0,actors:new Map([[live.id,live]])};
    try{runtime.authority=true;runtime.previous=null;runtime.snapshot={time:0,actors:[motionActor(-10)]} as GameSnapshot;runtime.sim=sim as unknown as NonNullable<typeof runtime.sim>;let previous=0;const steps:number[]=[];
      for(let frame=0;frame<=120;frame++){const now=frame/120;clock.mockReturnValue(now*1000);if(frame%2===0){sim.time=now;live.position.x=now*6;}const pose=sampleRenderActor(live.id,now,1/120)!;
        if(frame>8)steps.push(pose.position.x-previous);expect(pose.position.x).toBeLessThanOrEqual(live.position.x+.000001);previous=pose.position.x;
      }
      expect(Math.min(...steps)).toBeGreaterThan(.045);expect(Math.max(...steps)).toBeLessThan(.055);expect(previous).toBeCloseTo(5.9,1);
    }finally{forgetRenderActor(live.id);Object.assign(runtime,saved);clock.mockRestore();}
  });
  it('uses the shortest heading path, bounded segment positions and matching climb progress',()=>{
    const track=createRenderTimeline(),a=motionActor(0,Math.PI-.1),b=motionActor(.3,-Math.PI+.1);
    a.climb={anchor:'wall',phase:'climb',startedAt:0,progress:.2,normal:{x:1,y:0,z:0},contact:{x:0,y:1.4,z:0},top:13,base:0,height:13,gripMask:15,roofMask:0,mantleStage:null,mantleStageAt:0};b.climb={...a.climb,progress:.4,gripMask:3,contact:{x:.2,y:1.7,z:.4}};b.position.y=1.3;
    pushRenderSample(track,a,0);pushRenderSample(track,b,.05);const pose=sampleRenderTimeline(track,0,0,0,.025)!;
    expect(pose.position.x).toBeCloseTo(.15);expect(pose.position.y).toBeCloseTo(1.15);expect(Math.abs(signedAngle(pose.yaw))).toBeCloseTo(Math.PI);expect(pose.climbProgress).toBeCloseTo(.3);expect(pose.climb!.contact.x).toBeCloseTo(.1);expect(pose.climb!.contact.y).toBeCloseTo(1.55);expect(pose.climb!.contact.z).toBeCloseTo(.2);expect(pose.climb!.gripMask).toBe(15);
  });
  it('snaps deaths, respawns and teleports without stale travel or reactions',()=>{
    const track=createRenderTimeline();pushRenderSample(track,motionActor(0),0);sampleRenderTimeline(track,0,0,0,.1);
    const dead=motionActor(.3);dead.hp=0;dead.diedAt=.05;pushRenderSample(track,dead,.05);let pose=sampleRenderTimeline(track,1,1/60,0,.1)!;expect(pose.reset).toBe(true);expect(pose.time).toBe(.05);expect(combatPose([dead.pulseAt,dead.rocketAt,dead.abilityAt,dead.hurtAt,dead.diedAt],false,pose.time).death).toBe(true);
    pushRenderSample(track,motionActor(20),.1);pose=sampleRenderTimeline(track,2,1/60,0,.1)!;expect(pose.position.x).toBe(20);expect(pose.distance).toBe(0);expect(pose.state.diedAt).toBe(-100);
    pushRenderSample(track,motionActor(40),.15);pose=sampleRenderTimeline(track,3,1/60,0,.1)!;expect(pose.reset).toBe(true);expect(pose.position.x).toBe(40);
  });
});
