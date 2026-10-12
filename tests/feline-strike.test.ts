import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {ACTOR_HEIGHT,ACTOR_RADII,QUADRUPED_HEIGHT,SENTINEL_HEIGHT,UPRIGHT_HEIGHT} from '../shared/config';
import {FELINE_CONTACT_TOLERANCE,STRIKE_PROFILES,sweepFelineContact,type ActorTravel,type FelineContact} from '../shared/felineStrike';

beforeAll(async()=>{await RAPIER.init();});
const options={facingYaw:-Math.PI/2,minFacingDot:.35,contactDistance:.02};
const body=(x0:number,x1:number,z0=0,z1=z0,y0=1,y1=y0,radius=1.75,height=2.6):ActorTravel=>({from:{x:x0,y:y0,z:z0},to:{x:x1,y:y1,z:z1},radius,height});
function finiteHit(hit:FelineContact|null){
  expect(hit).not.toBeNull();
  const h=hit!;for(const v of [h.point,h.witnessAttacker,h.witnessTarget,h.normal])for(const n of Object.values(v))expect(Number.isFinite(n)).toBe(true);
  expect(Number.isFinite(h.fraction)).toBe(true);expect(Number.isFinite(h.separation)).toBe(true);
  expect(Math.hypot(h.normal.x,h.normal.y,h.normal.z)).toBeCloseTo(1,5);
  expect(h.fraction).toBeGreaterThanOrEqual(0);expect(h.fraction).toBeLessThanOrEqual(1);return h;
}
// Arithmetic verification budget, separate from .0001 m admission tolerance.
const SURFACE_ERROR=1e-6;
function physicalWitnesses(h:FelineContact,a:ActorTravel,b:ActorTravel){
  for(const [r,p,sign] of [[a,h.witnessAttacker,-1],[b,h.witnessTarget,1]] as const){
    const c={x:r.from.x+(r.to.x-r.from.x)*h.fraction,y:r.from.y+(r.to.y-r.from.y)*h.fraction+r.height/2-1,z:r.from.z+(r.to.z-r.from.z)*h.fraction};
    const local={x:p.x-c.x,y:p.y-c.y,z:p.z-c.z},radial=Math.hypot(local.x,local.z),coreR=r.radius-.12,coreH=r.height/2-.12;
    const normal={x:h.normal.x*sign,y:h.normal.y*sign,z:h.normal.z*sign},horizontalNormal=Math.hypot(normal.x,normal.z);
    if(Math.abs(normal.y)<1e-10){expect(Math.abs(radial-r.radius)).toBeLessThan(SURFACE_ERROR);expect(Math.abs(local.y)).toBeLessThanOrEqual(coreH+SURFACE_ERROR);}
    else if(horizontalNormal<1e-10){expect(Math.abs(Math.abs(local.y)-r.height/2)).toBeLessThan(SURFACE_ERROR);expect(radial).toBeLessThanOrEqual(coreR+SURFACE_ERROR);}
    else {expect(radial).toBeGreaterThan(coreR);expect(Math.abs(local.y)).toBeGreaterThan(coreH);expect(Math.abs(Math.hypot(radial-coreR,Math.abs(local.y)-coreH)-.12)).toBeLessThan(SURFACE_ERROR);}
    // The point is on its own outward support plane, not merely near a target.
    const support=coreR*horizontalNormal+coreH*Math.abs(normal.y)+.12;
    expect(Math.abs(local.x*normal.x+local.y*normal.y+local.z*normal.z-support)).toBeLessThan(SURFACE_ERROR);
  }
  for(const axis of ['x','y','z'] as const)expect(Math.abs(h.witnessAttacker[axis]-h.witnessTarget[axis]-h.separation*h.normal[axis])).toBeLessThan(SURFACE_ERROR);
}
describe('actual rounded actor hulls under simultaneous accepted translation',()=>{
  for(const [chassis,radius] of Object.entries(ACTOR_RADII))it(`${chassis} returns side contact on the Scout physical hull and the independent exact fraction`,()=>{
    const h=finiteHit(sweepFelineContact(RAPIER,body(0,12,0,0,1,1,radius,QUADRUPED_HEIGHT),body(10,10,0,0,1,1,1.45,SENTINEL_HEIGHT),options));
    expect(h.fraction).toBeCloseTo((10-radius-1.45-.02)/12,4);
    expect(h.exactFraction).toBeCloseTo((10-radius-1.45)/12,4);
    expect(h.point.x).toBeCloseTo(8.55,4);expect(h.normal.x).toBeCloseTo(-1,4);
    // Native rounded-shape witnesses converge within .1 mm (first retained
    // run measured .056-.076 mm on three hulls); the requested skin stays .02.
    expect(Math.abs(h.separation-.02)).toBeLessThanOrEqual(.0001);expect(h.initialOverlap).toBe(false);
  });
  it('finds an intermediate crossing even though both endpoints are separated',()=>{
    const a=body(0,10),b=body(5,5,5,-5,1,1,1.45,3.2);
    const h=finiteHit(sweepFelineContact(RAPIER,a,b,options));
    expect(h.fraction).toBeCloseTo(.5-3.22/Math.sqrt(200),4);
    expect(h.exactFraction).toBeCloseTo(.5-3.2/Math.sqrt(200),4);
    expect(h.point.x).toBeCloseTo(5-1.45/Math.SQRT2,3);
    expect(h.normal.x).toBeCloseTo(-1/Math.SQRT2,3);expect(h.normal.z).toBeCloseTo(-1/Math.SQRT2,3);
  });
  it('does not hit geometrically crossing paths visited at different times',()=>{
    expect(sweepFelineContact(RAPIER,body(0,10),body(5,5,10,0,1,1,1.45,3.2),options)).toBeNull();
  });
  it('uses relative motion when a target escapes rather than its old location',()=>{
    expect(sweepFelineContact(RAPIER,body(0,10),body(8,20,0,0,1,1,1.45,3.2),options)).toBeNull();
  });
  it('does not use cuboid corners or an endpoint damage radius',()=>{
    // Their enclosing cuboids overlap at t=1, but the circular side hulls do not.
    expect(sweepFelineContact(RAPIER,body(0,.2),body(3.2,3.2,3,3,1,1,1.45,3.2),options)).toBeNull();
    expect(sweepFelineContact(RAPIER,body(0,2),body(5.3,5.3,0,0,1,1,1.45,3.2),options)).toBeNull();
  });
  it('keeps the feet offset and actual stance height when a crossing is above the player',()=>{
    expect(ACTOR_HEIGHT).toBe(1);expect(QUADRUPED_HEIGHT).toBe(2.6);expect(UPRIGHT_HEIGHT).toBe(3.8);
    const target=body(5,5,0,0,3.7,3.7,1.45,3.2); // target bottom2.7, quad top2.6
    expect(sweepFelineContact(RAPIER,body(0,10),target,options)).toBeNull();
    const upright=body(0,10,0,0,1,1,1.75,3.8);
    expect(finiteHit(sweepFelineContact(RAPIER,upright,target,options)).initialOverlap).toBe(false);
  });
  it('detects an actual downward dive on the target cap without horizontal radius damage',()=>{
    const a=body(0,0,0,0,8,2,1.75,2.6),b=body(0,0,0,0,1,1,1.45,3.2);
    const h=finiteHit(sweepFelineContact(RAPIER,a,b,{...options,facingYaw:2}));
    expect(h.fraction).toBeCloseTo((7-3.2-.02)/6,4);
    expect(h.exactFraction).toBeCloseTo((7-3.2)/6,4);
    expect(h.point.y).toBeCloseTo(3.2,4);expect(h.normal.y).toBeCloseTo(1,4);
    expect(sweepFelineContact(RAPIER,body(4,4,0,0,8,2,1.75,2.6),b,options)).toBeNull();
  });
  for(const fixture of [
    {chassis:'Pounce',radius:1.75,fromY:23.993333333404735,toY:23.916112751932815,fromZ:205.59999990463257,toZ:205.51999377459288,targetFromY:23.780000004451722,targetToY:23.725000004749745},
    {chassis:'Caracal',radius:1.85,fromY:23.964999999152496,toY:23.875555250095204,fromZ:205.75,toZ:205.6199999898672,targetFromY:23.725000004749745,targetToY:23.66388889355585},
  ])it(`refines the captured ${fixture.chassis} accepted KCC endpoint without widening contact`,()=>{
    // Actual simultaneous falling paths from the root rival fixture (seed1926,
    // x200/y24/z208 vs z202). The old cast-witness-only gate missed this contact.
    const a=body(200,200,fixture.fromZ,fixture.toZ,fixture.fromY,fixture.toY,fixture.radius,2.6);
    const b=body(200,200,202,202,fixture.targetFromY,fixture.targetToY,1.75,2.6);
    const shapeA=new RAPIER.RoundCylinder(1.18,fixture.radius-.12,.12),shapeB=new RAPIER.RoundCylinder(1.18,1.63,.12);
    const rotation={x:0,y:0,z:0,w:1};
    const centerA={...a.from,y:a.from.y+.3},centerB={...b.from,y:b.from.y+.3};
    const moveA={x:0,y:a.to.y-a.from.y,z:a.to.z-a.from.z},moveB={x:0,y:b.to.y-b.from.y,z:0};
    const raw=shapeA.castShape(centerA,rotation,moveA,shapeB,centerB,rotation,moveB,.02,1,true)!;
    expect(raw).not.toBeNull();expect(raw.time_of_impact).toBeGreaterThan(.9999);
    const t=raw.time_of_impact;
    const centerAtA={x:200,y:centerA.y+moveA.y*t,z:centerA.z+moveA.z*t},centerAtB={x:200,y:centerB.y+moveB.y*t,z:202};
    const approximateGap=(centerAtA.z+raw.witness1.z-centerAtB.z-raw.witness2.z)*raw.normal2.z;
    expect(approximateGap).toBeGreaterThan(.0201);
    const physical=shapeA.contactShape(centerAtA,rotation,shapeB,centerAtB,rotation,.0201)!;
    expect(physical).not.toBeNull();expect(physical.distance).toBeLessThan(.02);expect(physical.distance).toBeGreaterThan(0);
    const h=finiteHit(sweepFelineContact(RAPIER,a,b,{...options,facingYaw:0}));
    expect(h.fraction).toBe(t);expect(h.separation).toBeLessThanOrEqual(.0201);
    physicalWitnesses(h,a,b);expect(h.point).toEqual(h.witnessTarget);expect(h.normal.z).toBeCloseTo(1,6);
    expect(h.initialOverlap).toBe(false);expect(h.exactFraction).toBeNull();
    // The independent zero-skin cast still cannot reach physical intersection.
    expect(sweepFelineContact(RAPIER,a,b,{...options,facingYaw:0,contactDistance:0})).toBeNull();
    expect(sweepFelineContact(RAPIER,a,b,{...options,facingYaw:Math.PI})).toBeNull();
    // Moving the actual target beyond the tolerance must not extend this short
    // accepted endpoint, even though the contact-data query predicts farther.
    const outside={...b,from:{...b.from,z:b.from.z-.0003},to:{...b.to,z:b.to.z-.0003}};
    expect(sweepFelineContact(RAPIER,a,outside,{...options,facingYaw:0})).toBeNull();
  });
});

describe('exact physical side/cap/rounded-edge witnesses at the native candidate',()=>{
  for(const [chassis,radius] of Object.entries(ACTOR_RADII))for(const height of [2.6,3.8])it(`${chassis} height${height} verifies unequal tall hull surfaces under translated side/cap/edge approach`,()=>{
    const targetRadius=2.05,targetHeight=3.8;
    for(const [radialWeight,verticalWeight] of [[1,0],[0,1],[.8,.6]]){
      const normal={x:.6*radialWeight,y:verticalWeight,z:.8*radialWeight};
      // Native f32 casts at x200 can miss a positive only1 micrometre inside
      // skin; retained geometry-006 probe confirms .0198 reliably reaches.
      const radial=radius+targetRadius-.24+(.24+.0198)*radialWeight;
      const vertical=height/2+targetHeight/2-.24+(.24+.0198)*verticalWeight;
      const cb={x:200,y:31,z:-142};
      const end={x:cb.x+(radialWeight?radial*.6:0),y:cb.y+(verticalWeight?vertical:0),z:cb.z+(radialWeight?radial*.8:0)};
      const a:ActorTravel={from:{x:end.x+normal.x,y:end.y+normal.y-height/2+1,z:end.z+normal.z},to:{x:end.x,y:end.y-height/2+1,z:end.z},radius,height};
      const b:ActorTravel={from:{x:cb.x,y:cb.y-targetHeight/2+1,z:cb.z},to:{x:cb.x,y:cb.y-targetHeight/2+1,z:cb.z},radius:targetRadius,height:targetHeight};
      const h=finiteHit(sweepFelineContact(RAPIER,a,b,{...options,facingYaw:Math.atan2(normal.x,normal.z)}));
      physicalWitnesses(h,a,b);expect(h.initialOverlap).toBe(false);expect(h.exactFraction).toBeNull();
      expect(h.separation).toBeGreaterThan(0);expect(h.separation).toBeLessThanOrEqual(.0201);
      const outside={...a,to:{x:a.to.x+normal.x*.0004,y:a.to.y+normal.y*.0004,z:a.to.z+normal.z*.0004}};
      expect(sweepFelineContact(RAPIER,outside,b,{...options,facingYaw:Math.atan2(normal.x,normal.z)})).toBeNull();
    }
  });
  it('confirms the actual accepted pre-slide KCC rounded corner instead of its inaccurate native contact-query distance',()=>{
    const a:ActorTravel={from:{x:-7.102247106864382,y:3.308433329790132,z:21.998115344253012},to:{x:-6.917716401650836,y:3.334469463779824,z:21.99772850699431},radius:1.75,height:2.6};
    const b:ActorTravel={from:{x:-3.3999985473011622,y:.9401000286906492,z:21.99999761453776},to:{x:-3.3999985473011622,y:.9400999829444093,z:21.99999649231676},radius:1.75,height:2.6};
    const h=finiteHit(sweepFelineContact(RAPIER,a,b,{...options,facingYaw:-1.5687}));
    physicalWitnesses(h,a,b);expect(h.fraction).toBeGreaterThan(.9999);expect(h.separation).toBeCloseTo(.02000025,6);expect(h.initialOverlap).toBe(false);
    const shape=new RAPIER.RoundCylinder(1.18,1.63,.12),rotation={x:0,y:0,z:0,w:1};
    const inaccurate=shape.contactShape({...a.to,y:a.to.y+.3},rotation,shape,{...b.to,y:b.to.y+.3},rotation,.0201)!;
    expect(inaccurate.distance).toBeGreaterThan(.022); // actual .02252766 counterexample retained
    const chord={...a,to:{x:-6.890772390201022,y:3.5085568782978225,z:21.997423275770263}};
    expect(sweepFelineContact(RAPIER,chord,b,{...options,facingYaw:-1.5687})).toBeNull();
  });
  it('handles coincident radial centers, dy0 and exact side/cap ties deterministically without admitting fresh damage',()=>{
    for(const [a,b,yaw] of [[body(0,-1,0,0,1,1,.62,1.24),body(0,0,0,0,1,1,.62,1.24),-Math.PI/2],[body(0,1),body(2.5,2.5),-Math.PI/2]] as const){
      const first=sweepFelineContact(RAPIER,a,b,{...options,facingYaw:yaw}),again=sweepFelineContact(RAPIER,a,b,{...options,facingYaw:yaw});
      expect(first).toEqual(again);physicalWitnesses(finiteHit(first),a,b);expect(first!.initialOverlap).toBe(true);expect(first!.separation).toBeLessThan(0);
    }
  });
});
describe('directed skin contact and fail-closed inputs',()=>{
  for(const [chassis,radius] of Object.entries(ACTOR_RADII))it(`${chassis} keeps axial and oblique endpoint admission within the named numerical tolerance`,()=>{
    expect(FELINE_CONTACT_TOLERANCE).toBe(.0001);
    for(const direction of [{x:1,z:0},{x:.6,z:.8}]){
      const a:ActorTravel={from:{x:0,y:1,z:0},to:{x:direction.x*4,y:1,z:direction.z*4},radius,height:2.6};
      const target=(gap:number):ActorTravel=>{
        const position={x:direction.x*(4+radius+1.75+gap),y:1,z:direction.z*(4+radius+1.75+gap)};
        return {from:{...position},to:{...position},radius:1.75,height:2.6};
      };
      const facingYaw=Math.atan2(-direction.x,-direction.z);
      // Native Bastion oblique endpoint .020000005 m has no cast hit at t<=1;
      // move the positive fixture 1 micrometre INSIDE skin, not beyond its path.
      // Retained geometry-004 probe records this float-boundary behavior.
      const h=finiteHit(sweepFelineContact(RAPIER,a,target(.019999),{...options,facingYaw}));
      expect(h.fraction).toBeGreaterThan(.9999);expect(h.initialOverlap).toBe(false);expect(h.exactFraction).toBeNull();
      expect(Math.abs(h.separation-.02)).toBeLessThanOrEqual(FELINE_CONTACT_TOLERANCE);
      for(const gap of [.02011,.0203,.021])expect(sweepFelineContact(RAPIER,a,target(gap),{...options,facingYaw})).toBeNull();
      expect(sweepFelineContact(RAPIER,a,target(.019999),{...options,facingYaw:facingYaw+Math.PI})).toBeNull();
      if(direction.x===1){
        const boundary=finiteHit(sweepFelineContact(RAPIER,a,target(.02),{...options,facingYaw}));
        expect(Math.abs(boundary.separation-.02)).toBeLessThanOrEqual(FELINE_CONTACT_TOLERANCE);
      }
    }
  });
  it('returns only physical witnesses at controller skin and no exact hit beyond accepted travel',()=>{
    const h=finiteHit(sweepFelineContact(RAPIER,body(0,4.79),body(8,8,0,0,1,1,1.45,3.2),options));
    expect(h.exactFraction).toBeNull();expect(h.point.x).toBeCloseTo(6.55,4);
    expect(h.witnessTarget.x-h.witnessAttacker.x).toBeCloseTo(.02,4);
    const exact=sweepFelineContact(RAPIER,body(0,4.79),body(8,8,0,0,1,1,1.45,3.2),{...options,contactDistance:0});expect(exact).toBeNull();
  });
  it('rejects a target behind the strike facing, including a rapid aim reversal',()=>{
    const a=body(0,10),b=body(8,8,0,0,1,1,1.45,3.2);
    expect(sweepFelineContact(RAPIER,a,b,{...options,facingYaw:Math.PI/2})).toBeNull();
    expect(sweepFelineContact(RAPIER,a,b,{...options,facingYaw:0})).toBeNull();
    expect(sweepFelineContact(RAPIER,a,b,{...options,facingYaw:Math.PI*2-Math.PI/2})).not.toBeNull();
  });
  it('does not let incoming targets damage via an idle or retreating attacker',()=>{
    const target=body(8,0,0,0,1,1,1.45,3.2);
    expect(sweepFelineContact(RAPIER,body(0,0),target,options)).toBeNull();
    expect(sweepFelineContact(RAPIER,body(0,-1),target,options)).toBeNull();
  });
  it('reports penetrating initial contact for the caller to reject, never as a fresh hit',()=>{
    const h=finiteHit(sweepFelineContact(RAPIER,body(0,1),body(2.5,2.5,0,0,1,1,1.45,3.2),options));
    expect(h.fraction).toBe(0);expect(h.initialOverlap).toBe(true);expect(h.separation).toBeLessThan(0);
  });
  it('returns a finite contact for a directed start within skin, without inventing penetration',()=>{
    const h=finiteHit(sweepFelineContact(RAPIER,body(0,1),body(3.21,3.21,0,0,1,1,1.45,3.2),options));
    expect(h.fraction).toBe(0);expect(h.initialOverlap).toBe(false);expect(h.separation).toBeGreaterThanOrEqual(0);
  });
  it('handles coincident/degenerate hulls without emitting NaN',()=>{
    expect(sweepFelineContact(RAPIER,body(0,0),body(0,0),options)).toBeNull();
    const h=sweepFelineContact(RAPIER,body(0,1),body(0,0),options);if(h)finiteHit(h);
  });
  it('rejects malformed dimensions, numeric overflow and an enlarged damage margin',()=>{
    const a=body(0,10),b=body(8,8);
    for(const value of [NaN,Infinity,-1,0,.12,1e100])expect(sweepFelineContact(RAPIER,{...a,radius:value},b,options)).toBeNull();
    for(const value of [NaN,Infinity,-1,0,.24,1e100])expect(sweepFelineContact(RAPIER,{...a,height:value},b,options)).toBeNull();
    for(const value of [NaN,Infinity,1e100])expect(sweepFelineContact(RAPIER,{...a,to:{...a.to,x:value}},b,options)).toBeNull();
    for(const contactDistance of [NaN,Infinity,-.01,.021])expect(sweepFelineContact(RAPIER,a,b,{...options,contactDistance})).toBeNull();
    expect(sweepFelineContact(RAPIER,a,b,{...options,facingYaw:NaN})).toBeNull();
    for(const minFacingDot of [-2,2,NaN])expect(sweepFelineContact(RAPIER,a,b,{...options,minFacingDot})).toBeNull();
  });
  it('does not mutate accepted travel or returned witness aliases',()=>{
    const a=body(0,10),b=body(8,8),before=JSON.stringify({a,b});const h=finiteHit(sweepFelineContact(RAPIER,a,b,options));
    h.point.x+=100;expect(h.witnessTarget.x).toBeLessThan(10);expect(JSON.stringify({a,b})).toBe(before);
  });
  it('provides four bounded differentiated immutable profiles',()=>{
    expect(Object.keys(STRIKE_PROFILES)).toEqual(['pounce','bastion','lynx','caracal']);
    expect(STRIKE_PROFILES.lynx.speed).toBeGreaterThan(STRIKE_PROFILES.pounce.speed);expect(STRIKE_PROFILES.bastion.damage).toBeGreaterThan(STRIKE_PROFILES.pounce.damage);
    for(const p of Object.values(STRIKE_PROFILES)){
      expect(Object.isFrozen(p)).toBe(true);for(const n of Object.values(p))expect(Number.isFinite(n)&&n>0).toBe(true);
      expect(p.energy).toBeLessThanOrEqual(35);expect(p.speed*p.duration).toBeLessThan(6.5);expect(p.damage).toBeLessThanOrEqual(65);
    }
  });
});
