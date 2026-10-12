import RAPIER from '@dimforge/rapier3d-compat';
import type {Vec3} from './types';
import type {NativeOwner004,NativeRotation004} from './felineNativePose004';
export interface RawContact004 {witness1:Vec3;witness2:Vec3;normal1:Vec3;normal2:Vec3;}
export interface ContactFrame004 {status:'UNKNOWN'|'WORLD_SURFACE_CORRESPONDENT';binding:'worldWitness1/worldWitness2/worldNormal1/worldNormal2';checks:unknown[];reason:string;}
const EPS=2e-4;
const plus=(a:Vec3,b:Vec3):Vec3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const scale=(v:Vec3,k:number):Vec3=>({x:v.x*k,y:v.y*k,z:v.z*k});
const distance=(a:Vec3,b:Vec3)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function rotated(v:Vec3,q:NativeRotation004):Vec3 {const tx=2*(q.y*v.z-q.z*v.y),ty=2*(q.z*v.x-q.x*v.z),tz=2*(q.x*v.y-q.y*v.x);return {x:v.x+q.w*tx+q.y*tz-q.z*ty,y:v.y+q.w*ty+q.z*tx-q.x*tz,z:v.z+q.w*tz+q.x*ty-q.y*tx};}
export function finiteContactEvidence004(v:unknown):void {if(typeof v==='number'&&!Number.isFinite(v))throw Error('NONFINITE_CONTACT_FRAME004');if(Array.isArray(v)||ArrayBuffer.isView(v))for(const n of Array.from(v as ArrayLike<unknown>))finiteContactEvidence004(n);else if(v&&typeof v==='object')for(const n of Object.values(v))finiteContactEvidence004(n);}
/** Only independent native point projection/ray surface correspondence. Never
 * repeats computeColliderMovement, mutates bodies or asserts force/load. */
export function measureContactFrame004(raw:RawContact004,support:RAPIER.Collider|null,hullShape:RAPIER.Shape,query:NativeOwner004,applied:Vec3,remaining:Vec3,toi:number,save:(row:unknown)=>void):ContactFrame004 {
  const checks:unknown[]=[];const row=(r:unknown)=>{save(r);checks.push(r);finiteContactEvidence004(r);};
  row({kind:'raw-before-frame-interpretation',raw,query,applied,remaining,toi,supportHandle:support?.handle??null});
  if(!support||!support.isValid()||!support.isEnabled())return {status:'UNKNOWN',binding:'worldWitness1/worldWitness2/worldNormal1/worldNormal2',checks,reason:'NO_LIVE_QUERY_SUPPORT'};
  if(Math.abs(Math.hypot(raw.normal1.x,raw.normal1.y,raw.normal1.z)-1)>1e-4||Math.abs(Math.hypot(raw.normal2.x,raw.normal2.y,raw.normal2.z)-1)>1e-4||toi<0||toi>1)throw Error('INVALID_CONTACT_NORMAL_OR_TOI004');
  const supportPose={position:{...support.translation()},rotation:{...support.rotation()}};
  const surface=(shape:RAPIER.Shape,pos:Vec3,rot:NativeRotation004,point:Vec3,normal:Vec3)=>{
    finiteContactEvidence004({shape,pos,rot,point,normal});const projection=shape.projectPoint(pos,rot,point,false);save({kind:'raw-native-projection-before-ray',query:{pos,rot,point},raw:projection?{point:{...projection.point},isInside:projection.isInside}:null});finiteContactEvidence004(projection);
    const ray=new RAPIER.Ray(plus(point,scale(normal,.01)),scale(normal,-1));
    const hit=shape.castRayAndGetNormal(ray,pos,rot,.02,false);
    save({kind:'raw-native-ray-before-derived',query:{origin:{...ray.origin},dir:{...ray.dir},maxToi:.02},raw:hit?{timeOfImpact:hit.timeOfImpact,normal:{...hit.normal},featureType:hit.featureType,featureId:hit.featureId}:null});finiteContactEvidence004(hit);if(hit&&(hit.timeOfImpact<0||hit.timeOfImpact>.02||Math.abs(Math.hypot(hit.normal.x,hit.normal.y,hit.normal.z)-1)>1e-4))throw Error('INVALID_NATIVE_SURFACE_RAY004');const hitPoint=hit?plus(ray.origin,scale(ray.dir,hit.timeOfImpact)):null;
    return {projection:projection?{point:{...projection.point},isInside:projection.isInside}:null,projectionResidual:projection?distance(point,projection.point):null,ray:{origin:{...ray.origin},dir:{...ray.dir},maxToi:.02},hit:hit?{timeOfImpact:hit.timeOfImpact,normal:{...hit.normal},featureType:hit.featureType,featureId:hit.featureId,point:hitPoint}:null,normalDot:hit?hit.normal.x*normal.x+hit.normal.y*normal.y+hit.normal.z*normal.z:null,rayResidual:hitPoint?distance(point,hitPoint):null};
  };
  const supportWorld=surface(support.shape,supportPose.position,supportPose.rotation,raw.witness1,raw.normal1);
  row({kind:'support-world-hypothesis',supportPose,result:supportWorld});
  const supportLocalPoint=plus(supportPose.position,rotated(raw.witness1,supportPose.rotation));
  row({kind:'support-local-hypothesis',point:supportLocalPoint,result:surface(support.shape,supportPose.position,supportPose.rotation,supportLocalPoint,rotated(raw.normal1,supportPose.rotation))});
  const poses=[{name:'query-start',position:query.position},{name:'reported-applied',position:plus(query.position,applied)},{name:'reported-applied-plus-toi-remaining',position:plus(plus(query.position,applied),scale(remaining,toi))}];
  const worldMatches:string[]=[];
  const matches=(s:ReturnType<typeof surface>)=>s.projectionResidual!==null&&s.projectionResidual<=EPS&&s.rayResidual!==null&&s.rayResidual<=EPS&&s.normalDot!==null&&s.normalDot>.999&&s.hit!==null&&s.hit.timeOfImpact>=0&&s.hit.timeOfImpact<=.02;
  for(const pose of poses){const world=surface(hullShape,pose.position,query.rotation,raw.witness2,raw.normal2);row({kind:'character-world-hypothesis',pose,rotation:query.rotation,result:world});if(matches(world))worldMatches.push(pose.name);const localPoint=plus(pose.position,rotated(raw.witness2,query.rotation));row({kind:'character-local-hypothesis',pose,point:localPoint,result:surface(hullShape,pose.position,query.rotation,localPoint,rotated(raw.normal2,query.rotation))});}
  const accepted=matches(supportWorld)&&worldMatches.length>0;
  return {status:accepted?'WORLD_SURFACE_CORRESPONDENT':'UNKNOWN',binding:'worldWitness1/worldWitness2/worldNormal1/worldNormal2',checks,reason:accepted?`Actual native surface correspondence at ${worldMatches.join(',')}; aliased hypotheses may remain; not exclusive frame or load proof`:'No complete raw world point/normal correspondence at frozen query-motion hypotheses'};
}

