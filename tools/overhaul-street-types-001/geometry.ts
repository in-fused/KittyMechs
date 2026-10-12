import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import RAPIER from '@dimforge/rapier3d-compat';
export type V = {x:number;y:number;z:number};
export type Q = V & {w:number};
export type Pose = {position:V;rotation:Q};
const NUMERIC_EPS=1e-4;
export type Clock = { world: 'terrain-local-support001-authority'; nativeStep: number; seconds: number; timestep: number };
export type TerrainRegistry = { chunks: Map<string, { terrain: RAPIER.Collider }> };
export type OriginalRow = { id: string; position: V; penetrations: { handle: number; shape: number; distance: number; point1: V; point2: V; normal1: V; normal2: V }[] };
export type RawContact = { distance: number; point1: V; point2: V; normal1: V; normal2: V };
export const copy = (v: V): V => ({ x: v.x, y: v.y, z: v.z });
export const plus = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const minus = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const norm = (v: V) => Math.hypot(v.x, v.y, v.z);
export const dot = (a: V, b: V) => a.x * b.x + a.y * b.y + a.z * b.z;
export const scale = (v: V, n: number): V => ({ x: v.x * n, y: v.y * n, z: v.z * n });
export const sha = (data: Uint8Array | string) => createHash('sha256').update(data).digest('hex');
export function finiteVector(v: V, label: string): void {
  assert.ok(v && [v.x, v.y, v.z].every(Number.isFinite), `${label}: nonfinite native vector`);
}
export function finitePose(p: Pose): void {
  finiteVector(p.position, 'pose'); finiteVector(p.rotation, 'rotation');
  assert.ok(Number.isFinite(p.rotation.w) && Math.abs(Math.hypot(p.rotation.x, p.rotation.y, p.rotation.z, p.rotation.w) - 1) < NUMERIC_EPS, 'invalid native quaternion');
}
export function currentPose(c: RAPIER.Collider): Pose { return { position: copy(c.translation()), rotation: { ...c.rotation() } }; }
export function arrayHash(array: Float32Array | Uint32Array): string { return sha(new Uint8Array(array.buffer, array.byteOffset, array.byteLength)); }
export function shapeData(c: RAPIER.Collider) {
  const vertices = c.vertices(), indices = c.indices();
  return { shapeType: c.shape.type, vertices: Array.from(vertices), indices: indices ? Array.from(indices) : null,
    verticesBytesSHA256: arrayHash(vertices), indicesBytesSHA256: indices ? arrayHash(indices) : null,
    trimeshFlags: c.shape.type === RAPIER.ShapeType.TriMesh ? (c.shape as RAPIER.TriMesh).flags : null };
}
export function flags(c: RAPIER.Collider) {
  return { enabled: c.isEnabled(), sensor: c.isSensor(), collisionGroups: c.collisionGroups(), solverGroups: c.solverGroups(),
    activeCollisionTypes: c.activeCollisionTypes(), activeHooks: c.activeHooks(), activeEvents: c.activeEvents(),
    contactSkin: c.contactSkin(), friction: c.friction(), restitution: c.restitution(), density: c.density(), mass: c.mass(),
    parent: c.parent() ? { handle: c.parent()!.handle, bodyType: c.parent()!.bodyType(), enabled: c.parent()!.isEnabled(),
      mass: c.parent()!.mass(), position: copy(c.parent()!.translation()), rotation: { ...c.parent()!.rotation() } } : null };
}
export function nativeRaw(contact: RAPIER.ShapeContact | null): RawContact | null {
  return contact ? { distance: contact.distance, point1: copy(contact.point1), point2: copy(contact.point2), normal1: copy(contact.normal1), normal2: copy(contact.normal2) } : null;
}
export function rotate(v: V, q: Q): V {
  const tx = 2 * (q.y * v.z - q.z * v.y), ty = 2 * (q.z * v.x - q.x * v.z), tz = 2 * (q.x * v.y - q.y * v.x);
  return { x: v.x + q.w * tx + q.y * tz - q.z * ty, y: v.y + q.w * ty + q.z * tx - q.x * tz, z: v.z + q.w * tz + q.x * ty - q.y * tx };
}

export function validateRecordedNumbers(value: unknown, path = 'row'): void {
  if (typeof value === 'number') { assert.ok(Number.isFinite(value), `nonfinite recorded native/numeric value at ${path}`); return; }
  if (value === null || value === undefined || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) validateRecordedNumbers(child, `${path}.${key}`);
  if(/\.(normal|normal1|normal2|localNormal1|localNormal2)$/.test(path)&&'x' in value&&'y' in value&&'z' in value){assert.ok(Math.abs(norm(value as V)-1)<NUMERIC_EPS,`nonunit recorded native normal at ${path}`);}
  if ('x' in value && 'y' in value && 'z' in value && 'w' in value) { const q=value as Q; assert.ok(Math.abs(Math.hypot(q.x,q.y,q.z,q.w)-1)<NUMERIC_EPS, `nonunit recorded quaternion at ${path}`); }
}

export type P2 = { x: number; z: number };
export type Bounds = { min: V; max: V };
export const cross2 = (a: P2, b: P2, c: P2) => (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
export function polygonArea(p: P2[]): number { return Math.abs(p.reduce((s,a,i) => { const b=p[(i+1)%p.length]; return s+a.x*b.z-a.z*b.x; },0))/2; }
export function convexFootprint(vertices: V[]): P2[] {
  const sorted=vertices.map(v=>({x:v.x,z:v.z})).sort((a,b)=>a.x-b.x || a.z-b.z).filter((p,i,a)=>!i || p.x!==a[i-1].x || p.z!==a[i-1].z);
  const half=(a:P2[])=>{const h:P2[]=[];for(const p of a){while(h.length>=2 && cross2(h[h.length-2],h[h.length-1],p)<=0)h.pop();h.push(p);}return h;};
  const lower=half(sorted),upper=half([...sorted].reverse()); return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
export function ccw(p:P2[]):P2[]{return p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.z-a.z*b.x;},0)<0?[...p].reverse():p;}
export function clipPolygon(subject:P2[],clip:P2[]):P2[]{
  let output=subject;
  for(let i=0;i<clip.length;i++){
    const a=clip[i],b=clip[(i+1)%clip.length],input=output;output=[];if(!input.length)break;
    let previous=input[input.length-1],previousSide=cross2(a,b,previous);
    for(const current of input){const currentSide=cross2(a,b,current);
      if((currentSide>=0)!==(previousSide>=0)){const t=previousSide/(previousSide-currentSide);output.push({x:previous.x+t*(current.x-previous.x),z:previous.z+t*(current.z-previous.z)});}
      if(currentSide>=0)output.push(current);previous=current;previousSide=currentSide;
    }
  }return output;
}
export function bounds(vertices:V[]):Bounds{return {min:{x:Math.min(...vertices.map(v=>v.x)),y:Math.min(...vertices.map(v=>v.y)),z:Math.min(...vertices.map(v=>v.z))},max:{x:Math.max(...vertices.map(v=>v.x)),y:Math.max(...vertices.map(v=>v.y)),z:Math.max(...vertices.map(v=>v.z))}};}
export function worldVertices(data:{vertices:number[]},pose:Pose):V[]{const result:V[]=[];for(let i=0;i<data.vertices.length;i+=3)result.push(plus(pose.position,rotate({x:data.vertices[i],y:data.vertices[i+1],z:data.vertices[i+2]},pose.rotation)));return result;}
export function intersectsXZ(a:Bounds,b:Bounds):boolean{return a.min.x<=b.max.x && a.max.x>=b.min.x && a.min.z<=b.max.z && a.max.z>=b.min.z;}
export function bodyData(body:RAPIER.RigidBody){return {handle:body.handle,bodyType:body.bodyType(),enabled:body.isEnabled(),numColliders:body.numColliders(),position:copy(body.translation()),rotation:{...body.rotation()},linvel:copy(body.linvel()),angvel:copy(body.angvel()),mass:body.mass(),invMass:body.invMass(),localCom:copy(body.localCom()),worldCom:copy(body.worldCom()),principalInertia:copy(body.principalInertia()),principalInertiaLocalFrame:{...body.principalInertiaLocalFrame()},gravityScale:body.gravityScale(),linearDamping:body.linearDamping(),angularDamping:body.angularDamping(),sleeping:body.isSleeping()};}
export function validateBody(data:ReturnType<typeof bodyData>):void{finitePose({position:data.position,rotation:data.rotation});finitePose({position:data.localCom,rotation:data.principalInertiaLocalFrame});assert.ok(Number.isSafeInteger(data.numColliders)&&data.numColliders>=0);}

