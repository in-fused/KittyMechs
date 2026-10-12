/** Isolated source-domain prototype. No production imports or native admission.
 * All member transforms come from physical FK; accepted plants are immutable.
 */
export type V3 = readonly [number, number, number];
export type Q4 = readonly [number, number, number, number];
export type M4 = readonly number[]; // row-major, column-vector multiplication
export type LegKey = 'FR' | 'HR'; // preserved quarter preflight only
export interface LegGeometry {
  body: 'chest' | 'pelvis';
  hip: V3; flex: V3; axial: V3; knee: V3; wrist: V3;
  upperAxis: V3; kneeAxis: V3; wristAxis: V3;
  solePoint: V3; solePolygon: readonly V3[]; soleNormal: V3;
  upperBearingLength: number; lowerBearingLength: number;
  projectedUpperLength: number; projectedLowerLength: number;
  contactReachAllowance: number;
}
export interface MechanismGeometry {
  version: 'pounce-motion-v6-quarter';
  pelvisSpineSeat: V3; chestSpineSeat: V3;
  legs: Record<LegKey, LegGeometry>;
}
export interface LegCoordinates { abduct: number; flex: number; axial: number; knee: number; wrist: number }
export interface MechanicalState {
  version: 'pounce-motion-v6-quarter'; time: number; poseEpoch: number; lifeEpoch: number;
  rootPositionNative: V3; rootQuaternionNative: Q4;
  linearVelocityNative: V3; angularVelocityNative: V3;
  spine: number; chest: number; legs: Record<LegKey, LegCoordinates>;
  spineRate: number; chestRate: number; jointRates: Record<LegKey, LegCoordinates>;
}
export interface AcceptedPlant {
  leg: LegKey; contactEpoch: number; supportOwner: string;
  supportLocalPolygonNative: readonly V3[];
  supportLocalNormalNative: V3;
  policy: 'finite-rigid-patch-no-slide';
}
export interface ContactResidual {
  leg: LegKey; supportOwner: string; pointDriftMeters: number;
  normalAngleRadians: number; allCornersNative: readonly V3[];
  feasible: boolean;
}
export const I4: M4 = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
export const SOURCE_TO_NATIVE: M4 = [1,0,0,0, 0,0,1,0, 0,-1,0,0, 0,0,0,1];
export const add = (a: V3,b: V3): V3 => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const sub = (a: V3,b: V3): V3 => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const dot = (a: V3,b: V3) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const length = (a: V3) => Math.sqrt(dot(a,a));
export function multiply(a: M4,b: M4): M4 {
  const out=Array<number>(16).fill(0);
  for(let i=0;i<4;i++) for(let j=0;j<4;j++) for(let k=0;k<4;k++) out[4*i+j]+=a[4*i+k]*b[4*k+j];
  return out;
}
export function point(m: M4,v: V3): V3 {
  return [m[0]*v[0]+m[1]*v[1]+m[2]*v[2]+m[3],m[4]*v[0]+m[5]*v[1]+m[6]*v[2]+m[7],m[8]*v[0]+m[9]*v[1]+m[10]*v[2]+m[11]];
}
export function direction(m: M4,v: V3): V3 {
  return [m[0]*v[0]+m[1]*v[1]+m[2]*v[2],m[4]*v[0]+m[5]*v[1]+m[6]*v[2],m[8]*v[0]+m[9]*v[1]+m[10]*v[2]];
}
export function rigidInverse(m: M4): M4 {
  return [m[0],m[4],m[8],-m[0]*m[3]-m[4]*m[7]-m[8]*m[11],m[1],m[5],m[9],-m[1]*m[3]-m[5]*m[7]-m[9]*m[11],m[2],m[6],m[10],-m[2]*m[3]-m[6]*m[7]-m[10]*m[11],0,0,0,1];
}
export function translation(v: V3): M4 { return [1,0,0,v[0],0,1,0,v[1],0,0,1,v[2],0,0,0,1]; }
export function rotation(axis: V3,a: number): M4 {
  const n=length(axis); if(Math.abs(n-1)>1e-5 || !Number.isFinite(a)) throw new Error('Undeclared/nonunit axis or invalid coordinate');
  const [x,y,z]=axis,c=Math.cos(a),s=Math.sin(a),u=1-c;
  return [c+x*x*u,x*y*u-z*s,x*z*u+y*s,0,y*x*u+z*s,c+y*y*u,y*z*u-x*s,0,z*x*u-y*s,z*y*u+x*s,c+z*z*u,0,0,0,0,1];
}
export function around(p: V3,axis: V3,a: number): M4 { return multiply(multiply(translation(p),rotation(axis,a)),translation([-p[0],-p[1],-p[2]])); }
export function nativeRoot(s: MechanicalState): M4 {
  const [x,y,z,w]=s.rootQuaternionNative,n=x*x+y*y+z*z+w*w;
  if(Math.abs(n-1)>1e-6 || !s.rootPositionNative.every(Number.isFinite)) throw new Error('Root authority requires a finite unit quaternion');
  return [1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),s.rootPositionNative[0],2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),s.rootPositionNative[1],2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y),s.rootPositionNative[2],0,0,0,1];
}

/** Deformation operators act on the preserved rig-space mesh, zero = actual rest.
 * Each child rotates about its receiving center, transformed by its parent.
 */
export function fk(g: MechanismGeometry,s: MechanicalState): Record<string,M4> {
  const D: Record<string,M4>={pelvis:I4};
  D.spine=around(g.pelvisSpineSeat,[1,0,0],s.spine);
  D.chest=multiply(D.spine,around(g.chestSpineSeat,[1,0,0],s.chest));
  for(const key of ['FR','HR'] as const) {
    const l=g.legs[key],q=s.legs[key];
    D[key+'_abduct']=multiply(D[l.body],around(l.hip,[0,1,0],q.abduct));
    D[key+'_flex']=multiply(D[key+'_abduct'],around(l.flex,[1,0,0],q.flex));
    D[key+'_upper_roll']=multiply(D[key+'_flex'],around(l.axial,l.upperAxis,q.axial));
    D[key+'_lower']=multiply(D[key+'_upper_roll'],around(l.knee,l.kneeAxis,q.knee));
    D[key+'_paw']=multiply(D[key+'_lower'],around(l.wrist,l.wristAxis,q.wrist));
  }
  return D;
}
export function partWorld(g: MechanismGeometry,s: MechanicalState,owner: string,scale=.8): M4 {
  const d=fk(g,s)[owner]; if(!d) throw new Error('Unowned member '+owner);
  const size: M4=[scale,0,0,0,0,scale,0,0,0,0,scale,0,0,0,0,1];
  return multiply(multiply(multiply(nativeRoot(s),SOURCE_TO_NATIVE),size),d);
}
export function solePolygonNative(g: MechanismGeometry,s: MechanicalState,key: LegKey,scale=.8): readonly V3[] {
  const m=partWorld(g,s,key+'_paw',scale);return g.legs[key].solePolygon.map(v=>point(m,v));
}
export function contactResiduals(g: MechanismGeometry,s: MechanicalState,plants: readonly AcceptedPlant[],supportWorld: Readonly<Record<string,M4>>,scale=.8): ContactResidual[] {
  return plants.map(p=> {
    const support=supportWorld[p.supportOwner]; if(!support) throw new Error('Missing real support owner '+p.supportOwner);
    const actual=solePolygonNative(g,s,p.leg,scale),expected=p.supportLocalPolygonNative.map(v=>point(support,v));
    if(actual.length!==expected.length || actual.length<3) throw new Error('Finite contact patch identity changed');
    const drift=Math.max(...actual.map((v,i)=>length(sub(v,expected[i]))));
    const a=direction(partWorld(g,s,p.leg+'_paw',1),g.legs[p.leg].soleNormal),b=direction(support,p.supportLocalNormalNative);
    const cos=dot(a,b)/(length(a)*length(b)); const normal=Math.acos(Math.max(-1,Math.min(1,cos)));
    return {leg:p.leg,supportOwner:p.supportOwner,pointDriftMeters:drift,normalAngleRadians:normal,allCornersNative:actual,feasible:drift<1e-5 && normal<1e-5};
  });
}
export interface PlanarSolve { feasible: boolean; reason: string; coordinates?: LegCoordinates; projectedReachRatio: number; physicalBearingReachRatio: number }
const wrapNearZero=(a: number)=>Math.atan2(Math.sin(a),Math.cos(a));
/** Exact planar contact-preserving solve, not the old upper/lower/paw matrices.
 * Root yaw/abduction/axial, support tilt and arbitrary six-axis contacts are outside
 * this subset. Rejection must produce a planned unload/lift/replant, never a clamp.
 */
export function solvePlanarPlant(g: MechanismGeometry,s: MechanicalState,key: LegKey,soleTargetNative: V3,scale=.8): PlanarSolve {
  const l=g.legs[key],D=fk(g,s)[l.body],R=nativeRoot(s);
  const rootRotationResidual=Math.max(...[0,1,2,4,5,6,8,9,10].map(i=>Math.abs(R[i]-I4[i])));
  if(rootRotationResidual>1e-7 || Math.abs(s.legs[key].abduct)+Math.abs(s.legs[key].axial)>1e-7) return {feasible:false,reason:'outside declared upright-root planar subset: plan a separately solved lift/replant turn',projectedReachRatio:Infinity,physicalBearingReachRatio:Infinity};
  const nativeLocal=point(rigidInverse(R),soleTargetNative);
  const sourceTarget: V3=[nativeLocal[0]/scale,-nativeLocal[2]/scale,nativeLocal[1]/scale];
  const sourceWristTarget=sub(sourceTarget,sub(l.solePoint,l.wrist));
  const bodyTarget=point(rigidInverse(D),sourceWristTarget),delta=sub(bodyTarget,l.flex);
  const a=l.projectedUpperLength,b=l.projectedLowerLength,d=Math.hypot(delta[1],delta[2]);
  const projected=d/(a+b),physical=length(delta)/(l.upperBearingLength+l.lowerBearingLength);
  const expectedX=l.wrist[0]-l.flex[0];
  if(Math.abs(delta[0]-expectedX)>1e-6 || projected>l.contactReachAllowance || physical>l.contactReachAllowance || d<Math.abs(a-b)+1e-6) return {feasible:false,reason:'actual wrist target outside fixed mechanical reach/contact subset; unload and replant required',projectedReachRatio:projected,physicalBearingReachRatio:physical};
  const v1=sub(l.knee,l.flex),v2=sub(l.wrist,l.knee),theta1=Math.atan2(v1[2],v1[1]),theta2=Math.atan2(v2[2],v2[1]);
  const c=(d*d-a*a-b*b)/(2*a*b);if(c < -1 || c > 1) return {feasible:false,reason:'no exact fixed-length solution',projectedReachRatio:projected,physicalBearingReachRatio:physical};
  const branch=Math.sign(v1[1]*v2[2]-v1[2]*v2[1]);
  const elbow=branch*Math.acos(c),first=Math.atan2(delta[2],delta[1])-Math.atan2(b*Math.sin(elbow),a+b*Math.cos(elbow));
  const flex=wrapNearZero(first-theta1),knee=wrapNearZero(elbow-wrapNearZero(theta2-theta1));
  const bodyPitch=Math.atan2(D[9],D[5]);
  // Actual wrist axis is source −X at rest. Its joint coordinate cancels the
  // parent X rotation; it does not override the paw orientation afterward.
  const wrist=bodyPitch+flex+knee;
  return {feasible:true,reason:'exact planar FK coordinates; exterior/support sweep remains required',coordinates:{abduct:0,flex,axial:0,knee,wrist},projectedReachRatio:projected,physicalBearingReachRatio:physical};
}

export function quaternionProduct(a: Q4,b: Q4): Q4 {
  return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
}
function gaussian(a: number[][],b: number[]): number[] | undefined {
  const m=a.map((r,i)=>[...r,b[i]]),n=b.length;
  for(let i=0;i<n;i++) {
    let p=i;for(let j=i+1;j<n;j++) if(Math.abs(m[j][i])>Math.abs(m[p][i])) p=j;
    if(Math.abs(m[p][i])<1e-14) return undefined;
    [m[p],m[i]]=[m[i],m[p]];const d=m[i][i];for(let j=i;j<=n;j++) m[i][j]/=d;
    for(let k=0;k<n;k++) if(k!==i) {const v=m[k][i];for(let j=i;j<=n;j++) m[k][j]-=v*m[i][j];}
  }
  return m.map(r=>r[n]);
}
/** Bounded offline coupled contact projection for the quarter turn requirement.
 * This proposes explicit root/joint states; it supplies no native reaction,
 * collision interval, geometry certificate, or authority acceptance.
 */
export function solveCoupledQuarterTurn(g: MechanismGeometry,initial: MechanicalState,yaw: number,plants: readonly AcceptedPlant[],supportWorld: Readonly<Record<string,M4>>,scale=.8): { feasible:boolean; state:MechanicalState; iterations:number; maxPatchDrift:number; reason:string } {
  const properties=['abduct','flex','axial','knee','wrist'] as const;
  const original=[...initial.rootPositionNative,0,0,initial.spine,initial.chest,...properties.map(p=>initial.legs.FR[p]),...properties.map(p=>initial.legs.HR[p])];
  const state=(v:number[]):MechanicalState=> {
    const qx:Q4=[Math.sin(v[3]/2),0,0,Math.cos(v[3]/2)],qy:Q4=[0,Math.sin(yaw/2),0,Math.cos(yaw/2)],qz:Q4=[0,0,Math.sin(v[4]/2),Math.cos(v[4]/2)];
    const legs={FR:{...initial.legs.FR},HR:{...initial.legs.HR}};for(let k=0;k<2;k++) for(let i=0;i<5;i++) legs[k===0?'FR':'HR'][properties[i]]=v[7+k*5+i];
    return {...initial,rootPositionNative:[v[0],v[1],v[2]],rootQuaternionNative:quaternionProduct(quaternionProduct(qy,qx),qz),spine:v[5],chest:v[6],legs};
  };
  const residual=(s:MechanicalState):number[]=>plants.flatMap(p=> {
    const actual=solePolygonNative(g,s,p.leg,scale),support=supportWorld[p.supportOwner];if(!support) throw new Error('Missing turn support');
    return actual.flatMap((v,i)=>sub(v,point(support,p.supportLocalPolygonNative[i])));
  });
  let v=[...original],s=state(v),r=residual(s),cost=r.reduce((a,x)=>a+x*x,0),iteration=0;
  for(;iteration<24;iteration++) {
    // The initial 2µm component stop allowed a 13µrad sole tilt, above the
    // unchanged 10µrad contact normal requirement. This sole correction tightens
    // convergence; it does not relax contact tolerance or move accepted patches.
    const max=Math.max(...r.map(Math.abs));if(max<1e-8 && contactResiduals(g,s,plants,supportWorld,scale).every(x=>x.feasible)) break;
    const J:number[][]=[];
    for(let k=0;k<v.length;k++) {const w=[...v];w[k]+=1e-5;const z=residual(state(w));J.push(z.map((x,i)=>(x-r[i])/1e-5));}
    const A=J.map((a,i)=>J.map((b,j)=>a.reduce((sum,x,k)=>sum+x*b[k],0)+(i===j?1e-5:0))),b=J.map(a=>-a.reduce((sum,x,k)=>sum+x*r[k],0));
    const step=gaussian(A,b);if(!step) break;
    const ratio=Math.max(1,...step.map((x,i)=>Math.abs(x)/(i<3?.035:.12)));let improved=false;
    for(let line=0;line<8;line++) {
      const w=v.map((x,i)=>x+step[i]/ratio/2**line);
      // Search bounds select the connected near-rest branch, not a certified
      // geometric joint box. Every proposed state still needs source sweeps.
      if(w.slice(3).some(x=>Math.abs(x)>1.25)) continue;
      const t=state(w),z=residual(t),c=z.reduce((a,x)=>a+x*x,0);
      if(c<cost) {v=w;s=t;r=z;cost=c;improved=true;break;}
    }
    if(!improved) break;
  }
  const actual=contactResiduals(g,s,plants,supportWorld,scale),max=Math.max(...actual.map(x=>x.pointDriftMeters));
  return {feasible:actual.every(x=>x.feasible),state:s,iterations:iteration,maxPatchDrift:max,reason:actual.every(x=>x.feasible)?'coupled finite patches solved; source/native sweep and forces unproved':'finite coupled solve could not retain the accepted patches; no contact commit permitted'};
}
