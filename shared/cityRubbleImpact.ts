import type RAPIER from '@dimforge/rapier3d-compat';
import type {CityBlock} from './cityDistrict';
import type {Vec3,WeaponId} from './types';

export interface CityRubbleImpact {point:Vec3;incoming:Vec3;normal:Vec3;weapon:WeaponId;strength:number}
export interface CityRubbleImpulseReceipt {
  impact:CityRubbleImpact;budget:number;deliveredEnergy:number;momentum:Vec3;angularMomentumAboutHit:Vec3;
  pieces:{id:number;point:Vec3;distance:number;mass:number;weight:number;impulse:Vec3;velocity:Vec3;angularVelocity:Vec3;energy:number}[];
}
// Gameplay fracture energy, not a claim about real-world weapon equivalence.
// Tougher materials absorb more of a hit; rockets distribute a wider blast.
const joulesPerDamage={brick:240,steel:120,concrete:180};
const maxLinearSpeed=20,maxAngularSpeed=20;
const dot=(a:Vec3,b:Vec3)=>a.x*b.x+a.y*b.y+a.z*b.z;
const sub=(a:Vec3,b:Vec3):Vec3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul=(a:Vec3,s:number):Vec3=>({x:a.x*s,y:a.y*s,z:a.z*s});
const cross=(a:Vec3,b:Vec3):Vec3=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const add=(a:Vec3,b:Vec3):Vec3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const length=(v:Vec3)=>Math.hypot(v.x,v.y,v.z);
const finite=(v:Vec3)=>Object.values(v).every(Number.isFinite);

export function validateCityRubbleImpact(impact:CityRubbleImpact):void {
  if(!finite(impact.point)||!finite(impact.incoming)||!finite(impact.normal)||!Object.values(impact.point).every(v=>Math.abs(v)<10000)||length(impact.incoming)<1e-6||!Number.isFinite(impact.strength)||impact.strength<=0||impact.strength>256||!['pulse','rocket'].includes(impact.weapon))throw Error('Invalid accepted city rubble impact');
}
type Matrix=number[];
const product=(m:Matrix,v:Vec3):Vec3=>({x:m[0]*v.x+m[1]*v.y+m[2]*v.z,y:m[3]*v.x+m[4]*v.y+m[5]*v.z,z:m[6]*v.x+m[7]*v.y+m[8]*v.z});
function inverse(m:Matrix):Matrix {
  const [a,b,c,,d,e,,,f]=m,det=a*(d*f-e*e)-b*(b*f-c*e)+c*(b*e-c*d);
  if(!m.every(Number.isFinite)||a<=0||a*d-b*b<=0||det<=0)throw Error('Invalid native rubble inertia');
  return [(d*f-e*e)/det,(c*e-b*f)/det,(b*e-c*d)/det,(c*e-b*f)/det,(a*f-c*c)/det,(b*c-a*e)/det,(b*e-c*d)/det,(b*c-a*e)/det,(a*d-b*b)/det];
}
function onNativeSurface(collider:RAPIER.Collider,point:Vec3):boolean {
  // The cached descriptor shape has no triangulation after convexHull(input).
  // Read the generated hull through the collider's native accessors.
  const vertices=collider.vertices(),indices=collider.indices();
  if(!vertices||!indices||indices.length%3)return false;
  const q=collider.rotation(),d=sub(point,collider.translation()),u={x:-q.x,y:-q.y,z:-q.z},t=mul(cross(u,d),2),local=add(d,add(mul(t,q.w),cross(u,t)));
  const vertex=(i:number):Vec3=>({x:vertices[i*3],y:vertices[i*3+1],z:vertices[i*3+2]});
  let center={x:0,y:0,z:0};for(let i=0;i<vertices.length/3;i++)center=add(center,mul(vertex(i),3/vertices.length));
  let boundary=Infinity,maxOutside=-Infinity,planes=0;
  for(let i=0;i<indices.length;i+=3){const a=vertex(indices[i]),normal=cross(sub(vertex(indices[i+1]),a),sub(vertex(indices[i+2]),a)),norm=length(normal);if(norm<1e-12)continue;
    const outward=mul(normal,(dot(normal,sub(a,center))>=0?1:-1)/norm),distance=dot(outward,sub(local,a));
    boundary=Math.min(boundary,Math.abs(distance));maxOutside=Math.max(maxOutside,distance);planes++;
  }
  return finite(local)&&planes>=4&&maxOutside<=1e-4&&boundary<=1e-4;
}
/** Local impulses use each native hull's own surface projection. A single
 * energy normalization includes both translation and native world-basis torque.
 * No actor positions, route deadlines, global relocation or collider exclusions. */
export function applyCityRubbleImpact(block:CityBlock,pieces:{id:number;body:RAPIER.RigidBody;collider:RAPIER.Collider}[],impact:CityRubbleImpact):CityRubbleImpulseReceipt {
  validateCityRubbleImpact(impact);
  const direction=mul(impact.incoming,1/length(impact.incoming)),radius=impact.weapon==='rocket'?2.5:.9;
  const budget=impact.strength*joulesPerDamage[block.material]*(impact.weapon==='rocket'?1.5:1);
  const planned=pieces.map(piece=>{
    piece.body.recomputeMassPropertiesFromColliders();
    const mass=piece.body.mass(),com={...piece.body.worldCom()},projection=piece.collider.projectPoint(impact.point,false),tensor=piece.body.effectiveWorldInvInertia();
    const invI=[tensor.m11,tensor.m12,tensor.m13,tensor.m21,tensor.m22,tensor.m23,tensor.m31,tensor.m32,tensor.m33],inertia=inverse(invI);
    if(!Number.isFinite(mass)||mass<=0||!finite(com)||!projection||!finite(projection.point)||length(piece.body.linvel())>1e-6||length(piece.body.angvel())>1e-6)throw Error('Invalid native rubble impulse source');
    // Surface-mode re-projection is not idempotent at native float32 edges.
    // Check the projected point against the ACTUAL convex hull's own face
    // halfspaces and boundary, in its own collider basis, at100µm plane distance.
    // This is not a100µm Euclidean distance bound to the finite triangle surface.
    const point={...projection.point};
    if(!onNativeSurface(piece.collider,point))throw Error(`Rubble impulse point is not on its owned surface: piece${piece.id}`);
    return {...piece,mass,com,point,distance:length(sub(point,impact.point)),invI,inertia};
  });
  const nearest=Math.min(...planned.map(p=>p.distance));
  const weighted=planned.map(p=>{
    // Relative distance keeps the nearest actual surface active even when a
    // splash impact originates outside the damaged component.
    const weight=Math.max(0,1-(p.distance-nearest)/radius)**2;
    const unitImpulse=mul(direction,weight),moment=cross(sub(p.point,p.com),unitImpulse),unitVelocity=mul(unitImpulse,1/p.mass),unitAngularVelocity=product(p.invI,moment);
    return {...p,weight,unitImpulse,unitVelocity,unitAngularVelocity,unitEnergy:.5*dot(unitImpulse,unitVelocity)+.5*dot(moment,unitAngularVelocity)};
  });
  const unitEnergy=weighted.reduce((sum,p)=>sum+p.unitEnergy,0);
  if(!Number.isFinite(unitEnergy)||unitEnergy<=0)throw Error('Invalid rubble impulse energy');
  const scale=Math.min(Math.sqrt(budget/unitEnergy),...weighted.map(p=>maxLinearSpeed/Math.max(1e-12,length(p.unitVelocity))),...weighted.map(p=>maxAngularSpeed/Math.max(1e-12,length(p.unitAngularVelocity))));
  const rows=weighted.map(p=>{
    const impulse=mul(p.unitImpulse,scale);if(p.weight>0)p.body.applyImpulseAtPoint(impulse,p.point,true);
    const velocity={...p.body.linvel()},angularVelocity={...p.body.angvel()},energy=.5*p.mass*dot(velocity,velocity)+.5*dot(angularVelocity,product(p.inertia,angularVelocity));
    if(!finite(velocity)||!finite(angularVelocity)||!Number.isFinite(energy)||energy<0||length(velocity)>maxLinearSpeed+1e-4||length(angularVelocity)>maxAngularSpeed+1e-4)throw Error('Invalid applied native rubble impulse');
    return {id:p.id,point:p.point,distance:p.distance,mass:p.mass,weight:p.weight,impulse,velocity,angularVelocity,energy};
  });
  const deliveredEnergy=rows.reduce((sum,p)=>sum+p.energy,0);
  if(deliveredEnergy>budget*(1+1e-4))throw Error('Native rubble exceeded accepted energy budget');
  return {impact:{...impact,point:{...impact.point},incoming:{...impact.incoming},normal:{...impact.normal}},budget,deliveredEnergy,
    momentum:rows.reduce((sum,p)=>add(sum,p.impulse),{x:0,y:0,z:0}),
    angularMomentumAboutHit:rows.reduce((sum,p)=>add(sum,cross(sub(p.point,impact.point),p.impulse)),{x:0,y:0,z:0}),pieces:rows};
}
