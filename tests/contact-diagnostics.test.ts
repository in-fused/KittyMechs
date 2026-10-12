import { describe, expect, it } from 'vitest';
import { copyContactDiagnostics } from '../src/debug/contactSnapshot';
import { createContactDiagnostic, recordPawIKRequest } from '../src/game/entities/pawContact';
import { solveKnee } from '../src/game/entities/felineMotion';
import { Vector3 } from 'three';

describe('completed render/contact snapshots',()=>{
  it('preserves the unreachable requested pose after the solver shortens its mutable target',()=>{
    const diagnostic=createContactDiagnostic().paws[0],hip=new Vector3(0,1,0),knee=new Vector3(.3,.5,0),target=new Vector3(0,-.25,0);
    const original=target.clone();recordPawIKRequest(hip,target,.5,.5,diagnostic);
    expect(target).toEqual(original);expect(diagnostic.requestedReach).toBe(1.25);expect(diagnostic.ikClamped).toBe(true);
    solveKnee(hip,knee,target,.5,.5,new Vector3(),new Vector3(),new Vector3());
    expect(hip.distanceTo(target)).toBeCloseTo(.9999,10);expect(diagnostic.requestedReach).toBe(1.25);
    const source=createContactDiagnostic();Object.assign(source.paws[0],diagnostic);
    const [saved]=copyContactDiagnostics([['pilot',source]]);source.paws[0].requestedReach=0;source.paws[0].ikClamped=false;
    expect(saved.paws[0].requestedReach).toBe(1.25);expect(saved.paws[0].ikClamped).toBe(true);
  });
  it('detects inner joint-limit clamps and overwrites the prior request on a reachable pose',()=>{
    const d=createContactDiagnostic().paws[0],hip=new Vector3(),target=new Vector3(0,.1,0);
    recordPawIKRequest(hip,target,.7,.3,d);expect(d.requestedReach).toBe(.1);expect(d.ikClamped).toBe(true);
    target.y=.75;recordPawIKRequest(hip,target,.7,.3,d);expect(d.requestedReach).toBe(.75);expect(d.ikClamped).toBe(false);
  });
  it('keeps the measured torso/tail reaction and its elapsed interval on the copied frame',()=>{
    const source=createContactDiagnostic();
    Object.assign(source,{renderElapsed:.1,cosmeticDt:.05,yawDelta:.01,yawRate:.1,reactionSpeed:3,reactionStrafe:0,bodyLeanBefore:.001,bodyLeanTarget:-.0027,bodyLean:-.00086,terrainRoll:0,bodyRoll:-.000516,tailYaw:-.0020624});
    const [saved]=copyContactDiagnostics([['pilot',source]]);
    Object.assign(source,{renderElapsed:1/60,cosmeticDt:1/60,yawDelta:-.02,yawRate:-1.2,reactionSpeed:0,reactionStrafe:1,bodyLeanBefore:0,bodyLeanTarget:0,bodyLean:0,terrainRoll:.04,bodyRoll:0,tailYaw:0});
    expect(saved.renderElapsed).toBe(.1);expect(saved.cosmeticDt).toBe(.05);expect(saved.yawDelta).toBe(.01);expect(saved.yawRate).toBe(.1);
    expect(saved.reactionSpeed).toBe(3);expect(saved.reactionStrafe).toBe(0);expect(saved.bodyLeanBefore).toBe(.001);expect(saved.bodyLeanTarget).toBe(-.0027);expect(saved.bodyLean).toBe(-.00086);expect(saved.terrainRoll).toBe(0);expect(saved.bodyRoll).toBe(-.000516);expect(saved.tailYaw).toBe(-.0020624);
  });
  it('keeps presentation time, state, root coordinates and contacts together after the next pooled frame changes',()=>{
    const source=createContactDiagnostic();
    Object.assign(source,{frameClock:18.2,renderTime:14.1,grounded:false,alive:true,stance:'quadruped',stanceAmount:0,transitionWeight:0,climbing:false,climbWeight:0,contactAllowed:false,resetting:false,probes:0,carrierSettle:0});
    Object.assign(source.position,{x:3,y:4,z:5});source.paws[0].support=0;source.paws[0].weight=0;
    const [saved]=copyContactDiagnostics([['pilot',source]]);
    source.frameClock=18.3;source.renderTime=14.2;source.grounded=true;source.contactAllowed=true;source.position.y=3;source.paws[0].weight=1;
    expect(saved.id).toBe('pilot');expect(saved.frameClock).toBe(18.2);expect(saved.renderTime).toBe(14.1);
    expect(saved.grounded).toBe(false);expect(saved.contactAllowed).toBe(false);expect(saved.position).toEqual({x:3,y:4,z:5});expect(saved.paws[0].weight).toBe(0);
  });
  it('returns detached editable rows without mutating the live registry',()=>{
    const source=createContactDiagnostic();source.position.x=8;source.paws[0].valid=true;
    const [saved]=copyContactDiagnostics(new Map([['pilot',source]]));
    saved.position.x=50;saved.paws[0].valid=false;saved.paws.pop();
    expect(source.position.x).toBe(8);expect(source.paws[0].valid).toBe(true);expect(source.paws).toHaveLength(4);
  });
  it('bounds copied actors and paws without trimming live diagnostic storage',()=>{
    const sources=Array.from({length:70},(_,i)=>{const value=createContactDiagnostic();value.paws.push({...value.paws[0]},{...value.paws[0]});return [`pilot-${i}`,value] as const;});
    const saved=copyContactDiagnostics(sources);
    expect(saved).toHaveLength(64);expect(saved[63].id).toBe('pilot-63');expect(saved.every(row=>row.paws.length===4)).toBe(true);
    expect(sources).toHaveLength(70);expect(sources.every(([,value])=>value.paws.length===6)).toBe(true);
  });
  it('binds copied paw receipts to the same presented surface and vault stage without aliasing vectors',()=>{
    const source=createContactDiagnostic();source.renderTime=4.25;source.climbing=true;
    source.climb={anchor:'building:face:east',phase:'mantle',startedAt:4,progress:.42,normal:{x:1,y:0,z:0},contact:{x:10,y:8,z:2},top:12.8,base:0,height:12,gripMask:0,roofMask:1,mantleStage:'transfer',mantleStageAt:4.2};
    Object.assign(source.paws[0],{surface:'roof',valid:true,clearance:.004,reach:.92});
    const [saved]=copyContactDiagnostics([['pilot',source]]);source.climb.mantleStage='settle';source.climb.roofMask=15;source.climb.contact.y=12;source.paws[0].clearance=-1;
    expect(saved.renderTime).toBe(4.25);expect(saved.climb?.mantleStage).toBe('transfer');expect(saved.climb?.roofMask).toBe(1);expect(saved.climb?.contact.y).toBe(8);expect(saved.paws[0].clearance).toBe(.004);
    saved.climb!.normal.x=9;expect(source.climb.normal.x).toBe(1);
  });
});
