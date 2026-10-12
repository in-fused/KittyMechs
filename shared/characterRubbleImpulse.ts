import type RAPIER from '@dimforge/rapier3d-compat';
import type {Vec3} from './types';

export interface CharacterRubbleContact {colliderHandle:number;point:Vec3;normal:Vec3;remainingVelocity:Vec3}
export interface CharacterRubbleBody {id:string;body:RAPIER.RigidBody;collider:RAPIER.Collider}
export interface CharacterRubbleImpulseReceipt {
  rows:{id:string;point:Vec3;normal:Vec3;impulse:Vec3;bodyWork:number;actorWork:number;dissipated:number}[];
  actorVelocity:Vec3;bodyWork:number;actorWork:number;dissipated:number;
}
const dot=(a:Vec3,b:Vec3)=>a.x*b.x+a.y*b.y+a.z*b.z;
const add=(a:Vec3,b:Vec3):Vec3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a:Vec3,b:Vec3):Vec3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul=(a:Vec3,s:number):Vec3=>({x:a.x*s,y:a.y*s,z:a.z*s});
const cross=(a:Vec3,b:Vec3):Vec3=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const finite=(v:Vec3)=>[v.x,v.y,v.z].every(Number.isFinite);
const length=(v:Vec3)=>Math.hypot(v.x,v.y,v.z);
type Matrix=number[];
const product=(m:Matrix,v:Vec3):Vec3=>({x:m[0]*v.x+m[1]*v.y+m[2]*v.z,y:m[3]*v.x+m[4]*v.y+m[5]*v.z,z:m[6]*v.x+m[7]*v.y+m[8]*v.z});
function inverse(m:Matrix):Matrix {
  const [a,b,c,,d,e,,,f]=m,det=a*(d*f-e*e)-b*(b*f-c*e)+c*(b*e-c*d);
  if(!m.every(Number.isFinite)||a<=0||a*d-b*b<=0||det<=0||Math.max(Math.abs(m[1]-m[3]),Math.abs(m[2]-m[6]),Math.abs(m[5]-m[7]))>1e-5*Math.max(...m.map(Math.abs)))throw Error('Invalid native character-contact inertia');
  return [(d*f-e*e)/det,(c*e-b*f)/det,(b*e-c*d)/det,(c*e-b*f)/det,(a*f-c*c)/det,(b*c-a*e)/det,(b*e-c*d)/det,(b*c-a*e)/det,(a*d-b*b)/det];
}

/** One virtual reaction body per actor tick, shared by all committed queries.
 * This does not move the kinematic actor or pretend it has gravitational weight.
 * Moving debris may transfer energy to this virtual body; the signed work and
 * dissipated energy include that existing motion, rather than a fresh motor
 * budget for every witness. A failed response cannot be retried or rolled back. */
export class CharacterRubbleImpulseBudget {
  private current:Vec3;
  private failed=false;
  constructor(readonly mass:number,velocity:Vec3){
    if(!Number.isFinite(mass)||mass<=0||!finite(velocity))throw Error('Invalid character-contact reaction budget');
    this.current={...velocity};
  }
  get velocity():Vec3 {if(this.failed)throw Error('Character-contact reaction budget failed');return {...this.current};}
  react(impulse:Vec3):void {if(this.failed)throw Error('Character-contact reaction budget failed');this.current=sub(this.current,mul(impulse,1/this.mass));if(!finite(this.current))throw Error('Invalid character-contact reaction');}
  fail():void {this.failed=true;}
}

/** Replace the installed KCC's order-dependent automatic impulse pass, using
 * only its actual owned collision witnesses after movement commits. Preserve
 * native movement/geometry. Use the first native witness per owned body, then
 * stable ownership IDs; re-read current velocities for each successive body.
 * No contact points are projected, invented, or read in a WASM filter callback. */
export function applyCharacterRubbleImpulses(contacts:readonly CharacterRubbleContact[],owned:readonly CharacterRubbleBody[],budget:CharacterRubbleImpulseBudget):CharacterRubbleImpulseReceipt {
  try {
    if(new Set(owned.map(p=>p.id)).size!==owned.length||new Set(owned.map(p=>p.body.handle)).size!==owned.length||new Set(owned.map(p=>p.collider.handle)).size!==owned.length)throw Error('Ambiguous character-contact ownership');
    const byHandle=new Map(owned.map(p=>[p.collider.handle,p])),selected=new Map<string,{piece:CharacterRubbleBody;contact:CharacterRubbleContact}>();
    for(const contact of contacts){const piece=byHandle.get(contact.colliderHandle);if(!piece)continue;if(!selected.has(piece.id))selected.set(piece.id,{piece,contact});}
    const rows:CharacterRubbleImpulseReceipt['rows']=[];
    for(const {piece,contact} of [...selected.values()].sort((a,b)=>a.piece.id<b.piece.id?-1:a.piece.id>b.piece.id?1:0)){
      if(!piece.id||piece.collider.parent()!==piece.body||!piece.body.isDynamic()||!piece.body.isEnabled()||!piece.collider.isEnabled())throw Error('Invalid native character-contact owner');
      const point={...contact.point},normal={...contact.normal},norm=length(normal);
      if(!finite(point)||!finite(normal)||!finite(contact.remainingVelocity)||Object.values(point).some(v=>Math.abs(v)>=10000)||norm<1e-6)throw Error('Invalid native character-contact witness');
      const direction=mul(normal,-1/norm),mass=piece.body.mass(),com={...piece.body.worldCom()},velocity={...piece.body.linvel()},angular={...piece.body.angvel()},tensor=piece.body.effectiveWorldInvInertia();
      const invI=[tensor.m11,tensor.m12,tensor.m13,tensor.m21,tensor.m22,tensor.m23,tensor.m31,tensor.m32,tensor.m33],inertia=inverse(invI);
      if(!Number.isFinite(mass)||mass<=0||![com,velocity,angular].every(finite))throw Error('Invalid native character-contact mass/motion');
      const arm=sub(point,com),momentAxis=cross(arm,direction),pointVelocity=add(velocity,cross(angular,arm)),actorVelocity=budget.velocity;
      const angularInverse=dot(momentAxis,product(invI,momentAxis)),bodyInverse=1/mass+angularInverse,inverseMass=1/budget.mass+bodyInverse;
      const virtualClosing=dot(sub(actorVelocity,pointVelocity),direction),pathClosing=dot(sub(contact.remainingVelocity,pointVelocity),direction),closing=Math.min(virtualClosing,pathClosing);
      if(!Number.isFinite(closing)||!Number.isFinite(inverseMass)||angularInverse< -1e-10||inverseMass<=0)throw Error('Invalid character-contact effective mass');
      // A previous native collision may already have removed this component.
      // Never turn the original command into a push absent from the remaining
      // KCC path, nor refresh the virtual reaction after an earlier response.
      if(dot(contact.remainingVelocity,direction)<=0||closing<=0)continue;
      const magnitude=closing/inverseMass,impulse=mul(direction,magnitude),angularDelta=product(invI,cross(arm,impulse));
      const bodyWork=dot(pointVelocity,impulse)+.5*magnitude*magnitude*bodyInverse;
      const actorWork=dot(actorVelocity,impulse)-.5*magnitude*magnitude/budget.mass,dissipated=magnitude*virtualClosing-.5*magnitude*magnitude*inverseMass;
      if(![magnitude,bodyWork,actorWork,dissipated].every(Number.isFinite)||magnitude<=0||dissipated<0||Math.abs(actorWork-bodyWork-dissipated)>1e-7*Math.max(1,Math.abs(actorWork),Math.abs(bodyWork),dissipated))throw Error('Unbounded character-contact work');
      piece.body.applyImpulseAtPoint(impulse,point,true);
      const afterVelocity={...piece.body.linvel()},afterAngular={...piece.body.angvel()};
      const dv=sub(afterVelocity,velocity),dw=sub(afterAngular,angular),actualWork=mass*dot(velocity,dv)+.5*mass*dot(dv,dv)+dot(angular,product(inertia,dw))+.5*dot(dw,product(inertia,dw));
      const tolerance=2e-4*Math.max(1,length(afterVelocity),length(afterAngular));
      const expectedVelocity=add(velocity,mul(impulse,1/mass)),expectedAngular=add(angular,angularDelta);
      // Rapier stores motion/impulses/inertia in float32. A tiny impulse into
      // an already falling199680kg slab can round its vertical delta to zero.
      // Bound the representable native update (multiply/add and3x3 torque)
      // component by component, then propagate those bounds through kinetic
      // energy. Never use a mass-independent work tolerance to waive a miss.
      const roundoff=8*2**-23;
      const velocityError={x:roundoff*(Math.abs(velocity.x)+Math.abs(impulse.x/mass)),y:roundoff*(Math.abs(velocity.y)+Math.abs(impulse.y/mass)),z:roundoff*(Math.abs(velocity.z)+Math.abs(impulse.z/mass))};
      const absMoment=cross(arm,impulse),angularError={x:roundoff*(Math.abs(angular.x)+Math.abs(invI[0]*absMoment.x)+Math.abs(invI[1]*absMoment.y)+Math.abs(invI[2]*absMoment.z)),y:roundoff*(Math.abs(angular.y)+Math.abs(invI[3]*absMoment.x)+Math.abs(invI[4]*absMoment.y)+Math.abs(invI[5]*absMoment.z)),z:roundoff*(Math.abs(angular.z)+Math.abs(invI[6]*absMoment.x)+Math.abs(invI[7]*absMoment.y)+Math.abs(invI[8]*absMoment.z))};
      const linearEnergyBound=mass*(dot({x:Math.abs(expectedVelocity.x),y:Math.abs(expectedVelocity.y),z:Math.abs(expectedVelocity.z)},velocityError)+.5*dot(velocityError,velocityError));
      const expectedMomentum=product(inertia,expectedAngular),absoluteInertia=inertia.map(Math.abs),angularEnergyBound=dot({x:Math.abs(expectedMomentum.x),y:Math.abs(expectedMomentum.y),z:Math.abs(expectedMomentum.z)},angularError)+.5*dot(angularError,product(absoluteInertia,angularError));
      const subnormalBound=8*2**-149;
      const representable=(actual:Vec3,expected:Vec3,bound:Vec3)=>Math.abs(actual.x-expected.x)<=bound.x+subnormalBound&&Math.abs(actual.y-expected.y)<=bound.y+subnormalBound&&Math.abs(actual.z-expected.z)<=bound.z+subnormalBound;
      const workTolerance=Math.max(2e-4*Math.max(1,Math.abs(bodyWork),Math.abs(actualWork)),linearEnergyBound+angularEnergyBound);
      if(![afterVelocity,afterAngular].every(finite)||length(sub(afterVelocity,expectedVelocity))>tolerance||length(sub(afterAngular,expectedAngular))>tolerance||!representable(afterVelocity,expectedVelocity,velocityError)||!representable(afterAngular,expectedAngular,angularError)||!Number.isFinite(actualWork)||Math.abs(actualWork-bodyWork)>workTolerance)throw Error(`Invalid applied native character-contact response: ${JSON.stringify({id:piece.id,point,normal,mass,velocity,angular,impulse,expectedVelocity,expectedAngular,afterVelocity,afterAngular,bodyWork,actualWork,workTolerance,velocityError,angularError})}`);
      budget.react(impulse);
      rows.push({id:piece.id,point,normal:mul(normal,1/norm),impulse,bodyWork,actorWork,dissipated});
    }
    return {rows,actorVelocity:budget.velocity,bodyWork:rows.reduce((s,r)=>s+r.bodyWork,0),actorWork:rows.reduce((s,r)=>s+r.actorWork,0),dissipated:rows.reduce((s,r)=>s+r.dissipated,0)};
  }catch(error){budget.fail();throw error;}
}
