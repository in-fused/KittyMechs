import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Matrix4,Vector3} from 'three';
import {capturePawLeasePose,clearPawAnchor,clearPawObstruction,createPawAnchor,createPawProbe,PAW_PROFILES,partialPawClearanceAllowed,pawFootprint,pawQueryContains,pawRequestAdmitted,pawRequestWithinJointLimits,plantedPawTarget,preparePawLease,probeAuthoredPawFallback,probeGroundPaw,retirePawLease,sampleStaticPaw} from '../src/game/entities/pawContact';

beforeAll(async()=>{await RAPIER.init();});
const shape=()=>[-.1,.1].flatMap(x=>[-.1,.1].flatMap(y=>[-.15,.15].map(z=>new Vector3(x,y,z))));
function fixture(){const world=new RAPIER.World({x:0,y:-9.8,z:0});world.createCollider(RAPIER.ColliderDesc.cuboid(5,.1,5).setTranslation(0,-.1,0));world.step();const probe=createPawProbe(),corners=shape();pawFootprint(corners,new Matrix4(),new Vector3(),probe);return {world,probe,anchor:createPawAnchor(),corners};}

describe('expired paw leases and independent solve admission',()=>{
  it('rejects exact reserve and inner limits without changing either endpoint',()=>{
    const hip=new Vector3(),target=new Vector3(.98,0,0),saved=target.clone();
    expect(pawRequestAdmitted(hip,target,.5,.5)).toBe(false);expect(target).toEqual(saved);
    target.x=.979;expect(pawRequestAdmitted(hip,target,.5,.5)).toBe(true);
    target.x=.5001;expect(pawRequestAdmitted(hip,target,1,.5)).toBe(false);
    target.x=.9;expect(pawRequestAdmitted(hip,target,1,.5)).toBe(true);
    target.x=NaN;expect(pawRequestAdmitted(hip,target,1,.5)).toBe(false);
  });
  it('does not mistake outer-ball convexity for inner-joint feasibility',()=>{
    const hip=new Vector3(),left=new Vector3(-.9,0,0),right=new Vector3(.9,0,0);
    expect(pawRequestAdmitted(hip,left,1,.5)).toBe(true);expect(pawRequestAdmitted(hip,right,1,.5)).toBe(true);
    expect(pawRequestAdmitted(hip,left.clone().lerp(right,.5),1,.5)).toBe(false);
  });
  it('enforces the solver outer margin even for tiny chains below the reserve threshold',()=>{
    const hip=new Vector3(),target=new Vector3(.00115,0,0),saved=target.clone();
    expect(target.length()).toBeLessThan((.0006+.0006)*.98);
    expect(pawRequestAdmitted(hip,target,.0006,.0006)).toBe(false);
    expect(pawRequestWithinJointLimits(hip,target,.0006,.0006)).toBe(false);expect(target).toEqual(saved);
  });
  it('keeps inherited near-extension correction distinct from qualified contact reach',()=>{
    const hip=new Vector3(),target=new Vector3(.99,0,0),saved=target.clone();
    expect(pawRequestAdmitted(hip,target,.5,.5)).toBe(false);
    expect(pawRequestWithinJointLimits(hip,target,.5,.5)).toBe(true);expect(target).toEqual(saved);
    target.x=1;expect(pawRequestWithinJointLimits(hip,target,.5,.5)).toBe(false);
    target.x=.5001;expect(pawRequestWithinJointLimits(hip,target,1,.5)).toBe(false);
  });
  it('expires an unreachable world plant before querying its bounded animation fade without moving the anchor',()=>{
    const {world,probe,anchor,corners}=fixture(),hip=new Vector3(0,.8,0),paw=new Vector3(0,.104,0),target=new Vector3();
    sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);anchor.planted=true;anchor.weight=1;anchor.position.copy(paw);
    capturePawLeasePose(anchor,hip,paw,.5,.5);const held=anchor.position.clone();hip.x=.8;paw.x=.8;
    preparePawLease(anchor,paw,hip,.104,1,1,1/60,1,PAW_PROFILES.pounce);
    expect(anchor.planted).toBe(false);expect(anchor.releasing).toBe(true);expect(anchor.position).toEqual(held);
    const matrix=new Matrix4().makeTranslation(paw.x,paw.y,paw.z);
    expect(probeGroundPaw(world,probe,anchor,corners,matrix,paw,0,1,PAW_PROFILES.pounce,1,1/60,1)).toBe(5);
    plantedPawTarget(anchor,paw,hip,.104,1,1,1/60,1,PAW_PROFILES.pounce,target);
    clearPawObstruction(anchor.surface,paw,.104,.104,target);
    expect(target.x).toBeCloseTo(.8-.42*(1-10/60));expect(pawRequestAdmitted(hip,target,.5,.5)).toBe(true);
    expect(pawQueryContains(anchor.surface,corners,matrix,paw,target,probe)).toBe(true);expect(anchor.position).toEqual(held);world.free();
  });
  it('saves qualified plant requests and never refreshes the released reference',()=>{
    const anchor=createPawAnchor(),hip=new Vector3(0,.8,0),paw=new Vector3(.2,.104,0),target=new Vector3(0,.104,0);
    anchor.planted=true;anchor.weight=.6;anchor.surface.valid=true;anchor.surface.height=0;anchor.position.copy(target);
    capturePawLeasePose(anchor,hip,target,.5,.5);const stored=anchor.pose.clone();
    preparePawLease(anchor,paw,hip,.104,1,0,.01,1,PAW_PROFILES.pounce);
    expect(anchor.planted).toBe(false);expect(anchor.releaseStartWeight).toBe(.6);
    let previous=1;
    for(let i=0;i<5;i++){plantedPawTarget(anchor,paw,hip,.104,1,0,.01,1,PAW_PROFILES.pounce,target);const fraction=anchor.weight/anchor.releaseStartWeight;expect(fraction).toBeLessThan(previous);previous=fraction;capturePawLeasePose(anchor,hip,new Vector3(20,20,20),.5,.5);expect(anchor.pose).toEqual(stored);}
    clearPawAnchor(anchor);expect(anchor.poseValid).toBe(false);expect(anchor.plan.ready).toBe(false);expect(anchor.releaseStartWeight).toBe(0);
  });
  it('does not save an unqualified request even when a plant flag is present',()=>{
    const anchor=createPawAnchor();anchor.planted=true;
    capturePawLeasePose(anchor,new Vector3(),new Vector3(1,0,0),.5,.5);expect(anchor.poseValid).toBe(false);
  });
  it('queries the selected pose and refreshes a different authored fallback independently',()=>{
    const {world,probe,anchor,corners}=fixture(),paw=new Vector3(.25,.104,0),hip=new Vector3(.25,.8,0),target=new Vector3();
    sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);anchor.position.set(0,.104,0);anchor.planted=true;anchor.weight=1;
    capturePawLeasePose(anchor,new Vector3(0,.8,0),anchor.position,.5,.5);
    preparePawLease(anchor,paw,hip,.104,1,1,1/60,1,PAW_PROFILES.pounce);
    const matrix=new Matrix4().makeTranslation(paw.x,paw.y,paw.z);
    expect(probeGroundPaw(world,probe,anchor,corners,matrix,paw,0,1,PAW_PROFILES.pounce,1,1/60,1)).toBe(5);
    plantedPawTarget(anchor,paw,hip,.104,1,1,1/60,1,PAW_PROFILES.pounce,target);
    expect(pawQueryContains(anchor.surface,corners,matrix,paw,target,probe)).toBe(true);
    expect(pawQueryContains(anchor.surface,corners,matrix,paw,paw,probe)).toBe(false);
    expect(pawQueryContains(anchor.surface,corners,matrix,paw,new Vector3(3,.104,0),probe)).toBe(false);
    retirePawLease(anchor);expect(probeAuthoredPawFallback(world,probe,anchor,corners,matrix,paw,0,1,PAW_PROFILES.pounce,1)).toBe(5);
    expect(anchor.surface.x).toBe(paw.x);expect(pawQueryContains(anchor.surface,corners,matrix,paw,paw,probe)).toBe(true);world.free();
  });
  it('rejects mixed-height selected support while retaining its real ceiling',()=>{
    const {world,probe,anchor,corners}=fixture();
    const paw=new Vector3(.25,.104,0),hip=new Vector3(.25,.8,0);sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);anchor.position.set(0,.104,0);anchor.planted=true;anchor.weight=1;
    expect(anchor.surface.valid).toBe(true);world.createCollider(RAPIER.ColliderDesc.cuboid(.3,.04,.5).setTranslation(.35,.04,0));world.step();
    preparePawLease(anchor,paw,hip,.104,1,1,1/60,1,PAW_PROFILES.pounce);
    expect(probeGroundPaw(world,probe,anchor,corners,new Matrix4().makeTranslation(paw.x,paw.y,paw.z),paw,0,1,PAW_PROFILES.pounce,1,1/60,1)).toBe(5);
    expect(anchor.surface.valid).toBe(false);expect(anchor.surface.ceiling).toBeGreaterThan(.07);world.free();
  });
  it('discovers a raised fallback corner hidden from the selected pose samples',()=>{
    const {world,probe,anchor,corners}=fixture(),paw=new Vector3(.25,.104,0),hip=new Vector3(.25,.8,0),matrix=new Matrix4().makeTranslation(paw.x,paw.y,paw.z);
    sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);anchor.position.set(0,.104,0);anchor.planted=true;anchor.weight=1;
    world.createCollider(RAPIER.ColliderDesc.cuboid(.012,.04,.012).setTranslation(.35,.04,.15));world.step();
    preparePawLease(anchor,paw,hip,.104,1,1,1/60,1,PAW_PROFILES.pounce);
    expect(probeGroundPaw(world,probe,anchor,corners,matrix,paw,0,1,PAW_PROFILES.pounce,1,1/60,1)).toBe(5);expect(anchor.surface.valid).toBe(true);
    retirePawLease(anchor);expect(probeAuthoredPawFallback(world,probe,anchor,corners,matrix,paw,0,1,PAW_PROFILES.pounce,1)).toBe(5);
    expect(anchor.surface.valid).toBe(false);expect(anchor.surface.ceiling).toBeGreaterThan(.079);
    const target=paw.clone();clearPawObstruction(anchor.surface,paw,.104,.104,target);expect(target.y).toBeGreaterThan(.183);expect(anchor.planted).toBe(false);world.free();
  });
  it('does not borrow complete selected support for a missing fallback corner',()=>{
    const world=new RAPIER.World({x:0,y:-9.8,z:0});
    for(const [minX,maxX,minZ,maxZ] of [[-2,.34,-2,2],[.36,2,-2,2],[.34,.36,-2,.14],[.34,.36,.16,2]])world.createCollider(RAPIER.ColliderDesc.cuboid((maxX-minX)/2,.1,(maxZ-minZ)/2).setTranslation((minX+maxX)/2,-.1,(minZ+maxZ)/2));
    world.step();const probe=createPawProbe(),anchor=createPawAnchor(),corners=shape(),paw=new Vector3(.25,.104,0),hip=new Vector3(.25,.8,0),matrix=new Matrix4().makeTranslation(paw.x,paw.y,paw.z);
    pawFootprint(corners,matrix,paw,probe);sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);anchor.position.set(0,.104,0);anchor.planted=true;anchor.weight=1;
    preparePawLease(anchor,paw,hip,.104,1,1,1/60,1,PAW_PROFILES.pounce);probeGroundPaw(world,probe,anchor,corners,matrix,paw,0,1,PAW_PROFILES.pounce,1,1/60,1);expect(anchor.surface.valid).toBe(true);
    retirePawLease(anchor);expect(probeAuthoredPawFallback(world,probe,anchor,corners,matrix,paw,0,1,PAW_PROFILES.pounce,1)).toBe(5);
    expect(anchor.surface.envelope).toBe(false);expect(anchor.surface.valid).toBe(false);expect(pawQueryContains(anchor.surface,corners,matrix,paw,paw,probe)).toBe(false);world.free();
  });
  it('keeps a floor-corrected infeasible authored fallback explicitly infeasible',()=>{
    const anchor=createPawAnchor(),hip=new Vector3(0,.8,0),paw=new Vector3(.9,.104,0),target=paw.clone();
    anchor.surface.valid=false;clearPawObstruction(anchor.surface,paw,.104,.104,target);
    expect(pawRequestAdmitted(hip,target,.5,.5)).toBe(false);const saved=target.clone();retirePawLease(anchor);expect(target).toEqual(saved);expect(anchor.planted).toBe(false);expect(anchor.weight).toBe(0);
  });
  it('preserves upward obstruction clearance over partial support without borrowing a plane or cached receipt',()=>{
    const world=new RAPIER.World({x:0,y:-9.8,z:0}),ceiling=world.createCollider(RAPIER.ColliderDesc.cuboid(.4,.04,.11).setTranslation(0,.04,-.1));world.step();
    const probe=createPawProbe(),anchor=createPawAnchor(),corners=shape(),paw=new Vector3(0,.104,0),matrix=new Matrix4().makeTranslation(paw.x,paw.y,paw.z),target=paw.clone();
    expect(probeAuthoredPawFallback(world,probe,anchor,corners,matrix,paw,0,1,PAW_PROFILES.pounce,1)).toBe(5);expect(anchor.surface.envelope).toBe(false);expect(anchor.surface.ceiling).toBeGreaterThan(.079);
    clearPawObstruction(anchor.surface,paw,.104,.104,target);
    expect(partialPawClearanceAllowed(anchor.surface,corners,matrix,paw,target,probe,5,.104)).toBe(true);
    expect(pawQueryContains(anchor.surface,corners,matrix,paw,target,probe)).toBe(false);expect(anchor.planted).toBe(false);expect(anchor.weight).toBe(0);
    expect(partialPawClearanceAllowed(anchor.surface,corners,matrix,paw,target,probe,0,.104)).toBe(false);
    expect(partialPawClearanceAllowed(anchor.surface,corners,matrix,paw,paw,probe,5,.104)).toBe(false);
    const moved=target.clone();moved.x=.01;expect(partialPawClearanceAllowed(anchor.surface,corners,matrix,paw,moved,probe,5,.104)).toBe(false);
    moved.copy(target);moved.y=paw.y-.01;expect(partialPawClearanceAllowed(anchor.surface,corners,matrix,paw,moved,probe,5,.104)).toBe(false);
    // Valid geometry does not relax either hard joint limit.
    expect(pawRequestWithinJointLimits(new Vector3(2,.8,0),target,.5,.5)).toBe(false);
    world.removeCollider(ceiling,true);expect(partialPawClearanceAllowed(anchor.surface,corners,matrix,paw,target,probe,5,.104)).toBe(false);world.free();
  });
  it('rejects zero-hit partial receipts and grants them no support authority',()=>{
    const world=new RAPIER.World({x:0,y:-9.8,z:0}),probe=createPawProbe(),anchor=createPawAnchor(),corners=shape(),paw=new Vector3(0,.104,0),matrix=new Matrix4().makeTranslation(0,.104,0);
    expect(probeAuthoredPawFallback(world,probe,anchor,corners,matrix,paw,0,1,PAW_PROFILES.pounce,1)).toBe(5);
    expect(anchor.surface.ceilingCollider).toBeNull();expect(partialPawClearanceAllowed(anchor.surface,corners,matrix,paw,paw,probe,5,.104)).toBe(false);expect(anchor.planted).toBe(false);expect(anchor.weight).toBe(0);world.free();
  });
});
