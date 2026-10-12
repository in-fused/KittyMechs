import RAPIER from '@dimforge/rapier3d-compat';
import type {CityBlock} from './cityDistrict';
import type {CityRubbleImpact} from './cityRubbleImpact';
import {validateCityRubbleImpact} from './cityRubbleImpact';
import type {Vec3} from './types';

export interface RuinImpactBody {id:number;block:CityBlock;body:RAPIER.RigidBody;collider:RAPIER.Collider;}
export interface RuinImpactReceipt {
  budget:number;work:number;impulseScale:number;
  pieces:{block:number;point:Vec3;impulse:Vec3;work:number;mass:number}[];
}
// Same finite gameplay material energy scale as existing cityRubbleImpact;
// these are authored game units, not measured projectile/real material data.
export const RUIN_IMPACT_JOULES_PER_DAMAGE={brick:240,steel:120,concrete:180} as const;
const dot=(a:Vec3,b:Vec3)=>a.x*b.x+a.y*b.y+a.z*b.z;
const mul=(v:Vec3,s:number):Vec3=>({x:v.x*s,y:v.y*s,z:v.z*s});
const sub=(a:Vec3,b:Vec3):Vec3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const add=(a:Vec3,b:Vec3):Vec3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const cross=(a:Vec3,b:Vec3):Vec3=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const finite=(p:Vec3)=>Object.values(p).every(Number.isFinite);
const norm=(p:Vec3)=>Math.hypot(p.x,p.y,p.z);
const matrixProduct=(m:number[],v:Vec3):Vec3=>({x:m[0]*v.x+m[1]*v.y+m[2]*v.z,y:m[3]*v.x+m[4]*v.y+m[5]*v.z,z:m[6]*v.x+m[7]*v.y+m[8]*v.z});
function inertia(m:number[]):number[]{
  const [a,b,c,,d,e,,,f]=m,det=a*(d*f-e*e)-b*(b*f-c*e)+c*(b*e-c*d);
  if(!m.every(Number.isFinite)||a<=0||a*d-b*b<=0||det<=0)throw Error('Invalid persistent wreck native inertia');
  return[(d*f-e*e)/det,(c*e-b*f)/det,(b*e-c*d)/det,(c*e-b*f)/det,(a*f-c*c)/det,(b*c-a*e)/det,(b*e-c*d)/det,(b*c-a*e)/det,(a*d-b*b)/det];
}
/** Native surface projection must remain on this actual owned cuboid, in its
 * current quaternion. It never substitutes an AABB contact or a source pivot. */
export function ruinImpactSurface(c:RAPIER.Collider,p:Vec3):Vec3 {
  const projection=c.projectPoint(p,false);if(!projection||!finite(projection.point))throw Error('Missing native wreck impact surface');
  // For the explicitly admitted convex street envelope, native projection and
  // its idempotent surface witness replace cuboid-axis checks. The same native
  // mass/inertia/work calculation below remains unchanged.
  if(c.shape.type===RAPIER.ShapeType.ConvexPolyhedron){
    const check=c.projectPoint(projection.point,false);if(!check||!finite(check.point)||norm(sub(check.point,projection.point))>1e-4)throw Error('Persistent convex wreck impulse lacks native surface witness');
    return {...projection.point};
  }
  const q=c.rotation(),d=sub(projection.point,c.translation()),u={x:-q.x,y:-q.y,z:-q.z},t=mul(cross(u,d),2),local=add(d,add(mul(t,q.w),cross(u,t)));
  const half=(c.shape as RAPIER.Cuboid).halfExtents;
  if(!half)throw Error('Persistent wreck impact requires its exact source cuboid');
  const distances=[Math.abs(local.x)-half.x,Math.abs(local.y)-half.y,Math.abs(local.z)-half.z];
  if(Math.max(...distances)>1e-4||Math.min(...distances.map(Math.abs))>1e-4)throw Error('Persistent wreck impulse is outside its actual native surface');
  return{...projection.point};
}
/** One accepted hit's total work budget, including current linear/angular
 * motion. No zero-velocity reset, extra budget per target or position writes.
 * The caller admits current visible owners and wakes fixed bodies first. */
export function applyOverhaulRuinImpact(pieces:readonly RuinImpactBody[],impact:CityRubbleImpact,budget:number):RuinImpactReceipt {
  validateCityRubbleImpact(impact);
  if(!pieces.length||!Number.isFinite(budget)||budget<=0||new Set(pieces.map(p=>p.id)).size!==pieces.length)throw Error('Invalid persistent wreck impact budget');
  const direction=mul(impact.incoming,1/norm(impact.incoming)),radius=impact.weapon==='rocket'?2.5:.9;
  const planned=pieces.map(piece=>{
    if(piece.collider.parent()!==piece.body||!piece.body.isDynamic()||!piece.body.isEnabled()||!piece.collider.isEnabled())throw Error('Invalid persistent wreck impact owner');
    piece.body.recomputeMassPropertiesFromColliders();
    const mass=piece.body.mass(),point=ruinImpactSurface(piece.collider,impact.point),arm=sub(point,piece.body.worldCom()),velocity={...piece.body.linvel()},angular={...piece.body.angvel()},tensor=piece.body.effectiveWorldInvInertia();
    const invI=[tensor.m11,tensor.m12,tensor.m13,tensor.m21,tensor.m22,tensor.m23,tensor.m31,tensor.m32,tensor.m33],I=inertia(invI);
    if(!Number.isFinite(mass)||mass<=0||![point,arm,velocity,angular].every(finite))throw Error('Invalid persistent wreck current mass/motion');
    return{...piece,mass,point,arm,velocity,angular,invI,I,distance:norm(sub(point,impact.point))};
  }).sort((a,b)=>a.id-b.id);
  const nearest=Math.min(...planned.map(p=>p.distance));
  const rows=planned.map(p=>{
    const weight=Math.max(0,1-(p.distance-nearest)/radius)**2,unit=mul(direction,weight),moment=cross(p.arm,unit),dv=mul(unit,1/p.mass),dw=matrixProduct(p.invI,moment);
    return{...p,unit,dv,dw,linear:dot(p.velocity,unit)+dot(p.angular,moment),quadratic:.5*(dot(unit,dv)+dot(moment,dw))};
  });
  const linear=rows.reduce((s,p)=>s+p.linear,0),quadratic=rows.reduce((s,p)=>s+p.quadratic,0);
  if(!Number.isFinite(linear)||!Number.isFinite(quadratic)||quadratic<=0)throw Error('Invalid persistent wreck impact work');
  const discriminant=Math.sqrt(linear*linear+4*quadratic*budget);
  // Stable positive quadratic root when current forward motion is large.
  const scale=linear>=0?2*budget/(linear+discriminant):(discriminant-linear)/(2*quadratic);
  if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid persistent wreck impulse scale');
  const receipt:RuinImpactReceipt={budget,work:0,impulseScale:scale,pieces:[]};
  for(const p of rows){
    const impulse=mul(p.unit,scale),before=.5*p.mass*dot(p.velocity,p.velocity)+.5*dot(p.angular,matrixProduct(p.I,p.angular));
    if(norm(impulse)>0)p.body.applyImpulseAtPoint(impulse,p.point,true);
    const v={...p.body.linvel()},w={...p.body.angvel()},after=.5*p.mass*dot(v,v)+.5*dot(w,matrixProduct(p.I,w)),work=after-before,predicted=p.linear*scale+p.quadratic*scale*scale;
    if(!finite(v)||!finite(w)||!Number.isFinite(work)||Math.abs(work-predicted)>3e-4*Math.max(1,budget,Math.abs(before),Math.abs(after)))throw Error('Invalid applied persistent wreck native work');
    receipt.pieces.push({block:p.id,point:p.point,impulse,work,mass:p.mass});receipt.work+=work;
  }
  if(receipt.work>budget*(1+3e-4)||receipt.work< -budget*3e-4)throw Error('Persistent wreck exceeded accepted impact work');
  return receipt;
}
