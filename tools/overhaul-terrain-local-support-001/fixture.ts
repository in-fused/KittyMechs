import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../../shared/simulation';
import { buildOverhaulDistrict } from '../../shared/overhaulDistrict';
import { cityBlockColliderDesc, rainlineStreetSource } from '../../shared/rainlineStreetAdmission';
import { terrainMesh } from '../../shared/world';

const OUT = resolve('.sites-runtime/overhaul-20261010/overhaul-terrain-local-support-001');
const ORIGINAL = '.sites-runtime/overhaul-20261010/rainline-street-admission-001/native-check.json';
const CART_ID = '7734:overhaul:street001:west-loading:00:solid';
const MICRO_STEPS = 120; // One fixed same-world microtest; canonical initialization adds one step.
const NUMERIC_EPS = 1e-4; // Receipt consistency check only; never penetration/admission tolerance.
type V = { x: number; y: number; z: number };
type Q = V & { w: number };
type Pose = { position: V; rotation: Q };
type Clock = { world: 'terrain-local-support001-authority'; nativeStep: number; seconds: number; timestep: number };
type TerrainRegistry = { chunks: Map<string, { terrain: RAPIER.Collider }> };
type OriginalRow = { id: string; position: V; penetrations: { handle: number; shape: number; distance: number; point1: V; point2: V; normal1: V; normal2: V }[] };
type RawContact = { distance: number; point1: V; point2: V; normal1: V; normal2: V };
const copy = (v: V): V => ({ x: v.x, y: v.y, z: v.z });
const plus = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const minus = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const norm = (v: V) => Math.hypot(v.x, v.y, v.z);
const dot = (a: V, b: V) => a.x * b.x + a.y * b.y + a.z * b.z;
const scale = (v: V, n: number): V => ({ x: v.x * n, y: v.y * n, z: v.z * n });
const sha = (data: Uint8Array | string) => createHash('sha256').update(data).digest('hex');
function finiteVector(v: V, label: string): void {
  assert.ok(v && [v.x, v.y, v.z].every(Number.isFinite), `${label}: nonfinite native vector`);
}
function finitePose(p: Pose): void {
  finiteVector(p.position, 'pose'); finiteVector(p.rotation, 'rotation');
  assert.ok(Number.isFinite(p.rotation.w) && Math.abs(Math.hypot(p.rotation.x, p.rotation.y, p.rotation.z, p.rotation.w) - 1) < NUMERIC_EPS, 'invalid native quaternion');
}
function currentPose(c: RAPIER.Collider): Pose { return { position: copy(c.translation()), rotation: { ...c.rotation() } }; }
function arrayHash(array: Float32Array | Uint32Array): string { return sha(new Uint8Array(array.buffer, array.byteOffset, array.byteLength)); }
function shapeData(c: RAPIER.Collider) {
  const vertices = c.vertices(), indices = c.indices();
  return { shapeType: c.shape.type, vertices: Array.from(vertices), indices: indices ? Array.from(indices) : null,
    verticesBytesSHA256: arrayHash(vertices), indicesBytesSHA256: indices ? arrayHash(indices) : null,
    trimeshFlags: c.shape.type === RAPIER.ShapeType.TriMesh ? (c.shape as RAPIER.TriMesh).flags : null };
}
function flags(c: RAPIER.Collider) {
  return { enabled: c.isEnabled(), sensor: c.isSensor(), collisionGroups: c.collisionGroups(), solverGroups: c.solverGroups(),
    activeCollisionTypes: c.activeCollisionTypes(), activeHooks: c.activeHooks(), activeEvents: c.activeEvents(),
    contactSkin: c.contactSkin(), friction: c.friction(), restitution: c.restitution(), density: c.density(), mass: c.mass(),
    parent: c.parent() ? { handle: c.parent()!.handle, bodyType: c.parent()!.bodyType(), enabled: c.parent()!.isEnabled(),
      mass: c.parent()!.mass(), position: copy(c.parent()!.translation()), rotation: { ...c.parent()!.rotation() } } : null };
}
function nativeRaw(contact: RAPIER.ShapeContact | null): RawContact | null {
  return contact ? { distance: contact.distance, point1: copy(contact.point1), point2: copy(contact.point2), normal1: copy(contact.normal1), normal2: copy(contact.normal2) } : null;
}
function rotate(v: V, q: Q): V {
  const tx = 2 * (q.y * v.z - q.z * v.y), ty = 2 * (q.z * v.x - q.x * v.z), tz = 2 * (q.x * v.y - q.y * v.x);
  return { x: v.x + q.w * tx + q.y * tz - q.z * ty, y: v.y + q.w * ty + q.z * tx - q.x * tz, z: v.z + q.w * tz + q.x * ty - q.y * tx };
}

function validateRecordedNumbers(value: unknown, path = 'row'): void {
  if (typeof value === 'number') { assert.ok(Number.isFinite(value), `nonfinite recorded native/numeric value at ${path}`); return; }
  if (value === null || value === undefined || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) validateRecordedNumbers(child, `${path}.${key}`);
  if ('x' in value && 'y' in value && 'z' in value && 'w' in value) { const q=value as Q; assert.ok(Math.abs(Math.hypot(q.x,q.y,q.z,q.w)-1)<NUMERIC_EPS, `nonunit recorded quaternion at ${path}`); }
}

type P2 = { x: number; z: number };
type Bounds = { min: V; max: V };
const cross2 = (a: P2, b: P2, c: P2) => (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
function polygonArea(p: P2[]): number { return Math.abs(p.reduce((s,a,i) => { const b=p[(i+1)%p.length]; return s+a.x*b.z-a.z*b.x; },0))/2; }
function convexFootprint(vertices: V[]): P2[] {
  const sorted=vertices.map(v=>({x:v.x,z:v.z})).sort((a,b)=>a.x-b.x || a.z-b.z).filter((p,i,a)=>!i || p.x!==a[i-1].x || p.z!==a[i-1].z);
  const half=(a:P2[])=>{const h:P2[]=[];for(const p of a){while(h.length>=2 && cross2(h[h.length-2],h[h.length-1],p)<=0)h.pop();h.push(p);}return h;};
  const lower=half(sorted),upper=half([...sorted].reverse()); return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
function ccw(p:P2[]):P2[]{return p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.z-a.z*b.x;},0)<0?[...p].reverse():p;}
function clipPolygon(subject:P2[],clip:P2[]):P2[]{
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
function bounds(vertices:V[]):Bounds{return {min:{x:Math.min(...vertices.map(v=>v.x)),y:Math.min(...vertices.map(v=>v.y)),z:Math.min(...vertices.map(v=>v.z))},max:{x:Math.max(...vertices.map(v=>v.x)),y:Math.max(...vertices.map(v=>v.y)),z:Math.max(...vertices.map(v=>v.z))}};}
function worldVertices(data:{vertices:number[]},pose:Pose):V[]{const result:V[]=[];for(let i=0;i<data.vertices.length;i+=3)result.push(plus(pose.position,rotate({x:data.vertices[i],y:data.vertices[i+1],z:data.vertices[i+2]},pose.rotation)));return result;}
function intersectsXZ(a:Bounds,b:Bounds):boolean{return a.min.x<=b.max.x && a.max.x>=b.min.x && a.min.z<=b.max.z && a.max.z>=b.min.z;}
function bodyData(body:RAPIER.RigidBody){return {handle:body.handle,bodyType:body.bodyType(),enabled:body.isEnabled(),numColliders:body.numColliders(),position:copy(body.translation()),rotation:{...body.rotation()},linvel:copy(body.linvel()),angvel:copy(body.angvel()),mass:body.mass(),invMass:body.invMass(),localCom:copy(body.localCom()),worldCom:copy(body.worldCom()),principalInertia:copy(body.principalInertia()),principalInertiaLocalFrame:{...body.principalInertiaLocalFrame()},gravityScale:body.gravityScale(),linearDamping:body.linearDamping(),angularDamping:body.angularDamping(),sleeping:body.isSleeping()};}
function validateBody(data:ReturnType<typeof bodyData>):void{finitePose({position:data.position,rotation:data.rotation});finitePose({position:data.localCom,rotation:data.principalInertiaLocalFrame});assert.ok(Number.isSafeInteger(data.numColliders)&&data.numColliders>=0);}

it('records locality-aware actual terrain coverage and one conditional unchanged-cart microtest',async()=>{
  mkdirSync(OUT,{recursive:true});
  const receipt:{status:string;started:string;closed?:string;rows:unknown[];failure?:string;disposal?:unknown}={status:'RUNNING_LOCAL_SUPPORT_DIAGNOSTIC_NOT_ADMISSION',started:new Date().toISOString(),rows:[]};
  const save=()=>writeFileSync(resolve(OUT,'receipt.json'),JSON.stringify(receipt,(_k,v)=>typeof v==='number'&&!Number.isFinite(v)?{nonfiniteRawNumber:String(v)}:v,2));
  const row=(value:unknown)=>{receipt.rows.push(value);save();validateRecordedNumbers(value);};
  const worlds:RAPIER.World[]=[];let sim:Simulation|undefined;let originalFailure:unknown;
  try{
    const seal=JSON.parse(readFileSync(resolve(OUT,'source-seal.json'),'utf8')) as {inputs:{path:string;sha256:string}[]};
    const verifyInputs=()=>seal.inputs.map(input=>{const hash=sha(readFileSync(input.path));assert.equal(hash.toUpperCase(),input.sha256.toUpperCase(),`frozen input changed ${input.path}`);return {path:input.path,sha256:hash};});
    row({kind:'frozen-input-verification-before-allocation',files:verifyInputs()});
    const originalBytes=readFileSync(ORIGINAL),prior=(JSON.parse(originalBytes.toString()) as {checks:OriginalRow[]}).checks[0];assert.equal(prior.id,CART_ID);
    await RAPIER.init();const world=new RAPIER.World({x:0,y:-22,z:0});worlds.push(world);
    sim=new Simulation(world,7734,'pvp','STREET_NATIVE');sim.syncChunks([{x:-55,y:1,z:27}]);world.step();
    let nativeStep=1;const clock=():Clock=>({world:'terrain-local-support001-authority',nativeStep,seconds:nativeStep*world.timestep,timestep:world.timestep});
    const cart=sim.buildingCollider(CART_ID);assert.ok(cart,'missing canonical cart');const cartPose=currentPose(cart),cartData=shapeData(cart),cartFlags=flags(cart),body=cart.parent();assert.ok(body,'missing cart fixed parent');
    row({kind:'actual-canonical-cart',clock:clock(),id:CART_ID,revision:1,generation:clock().world,handle:cart.handle,pose:cartPose,data:cartData,flags:cartFlags,body:bodyData(body),colliderOffset:{position:cart.translationWrtParent(),rotation:cart.rotationWrtParent()},priorPosition:prior.position});
    finitePose(cartPose);validateBody(bodyData(body));assert.equal(cart.shape.type,RAPIER.ShapeType.ConvexPolyhedron);assert.ok(norm(minus(cartPose.position,prior.position))<NUMERIC_EPS);assert.equal(body.numColliders(),1);assert.equal(body.collider(0).handle,cart.handle);assert.equal(cart.parent()!.handle,body.handle);assert.equal(body.bodyType(),RAPIER.RigidBodyType.Fixed);assert.equal(world.getCollider(cart.handle),cart);assert.equal(sim.buildingCollider(CART_ID),cart);
    const block=buildOverhaulDistrict(7734)!.blocks.find(b=>b.id===CART_ID);assert.ok(block);const source=rainlineStreetSource(block);assert.ok(source);const descriptor=cityBlockColliderDesc(block);
    row({kind:'unchanged-source-factory-mass',clock:clock(),block,source,descriptor:{shapeType:descriptor.shape.type,mass:descriptor.mass,friction:descriptor.friction,restitution:descriptor.restitution},actualColliderMass:cart.mass(),actualBodyMass:body.mass(),physicalCalibrationClaim:false});
    assert.equal(cart.mass(),descriptor.mass);assert.ok(cartData.vertices.length>=9&&cartData.vertices.length%3===0);if(cartData.indices)assert.ok(cartData.indices.length%3===0&&cartData.indices.every(i=>Number.isSafeInteger(i)&&i>=0&&i<cartData.vertices.length/3));
    const hull=worldVertices(cartData,cartPose),cartBounds=bounds(hull),footprint=convexFootprint(hull),footprintArea=polygonArea(footprint);assert.ok(footprint.length>=3&&footprintArea>0);
    row({kind:'actual-projected-full-convex-hull-footprint',clock:clock(),hullWorldVertices:hull,cartBounds,footprint,footprintArea,meaning:'XZ projection of entire actual native convex hull; not its loaded contact patch'});
    const registry=(sim as unknown as TerrainRegistry).chunks;
    const terrains=[...registry].map(([tile,entry])=>{const pose=currentPose(entry.terrain),data=shapeData(entry.terrain);return {id:`terrain:7734:${tile}`,tile,collider:entry.terrain,pose,data,vertices:worldVertices(data,pose)};});
    const sceneRows=terrains.map(t=>({id:t.id,tile:t.tile,revision:1,generation:clock().world,handle:t.collider.handle,pose:t.pose,flags:flags(t.collider),data:t.data,worldBounds:bounds(t.vertices)}));
    row({kind:'all-current-terrain-owner-native-readback',clock:clock(),owners:sceneRows,worldColliderCount:world.colliders.len()});
    for(const t of terrains){finitePose(t.pose);assert.equal(t.collider.shape.type,RAPIER.ShapeType.TriMesh);assert.equal(world.getCollider(t.collider.handle),t.collider);assert.equal(registry.get(t.tile)?.terrain,t.collider);assert.ok(t.collider.isEnabled()&&!t.collider.isSensor());assert.ok(t.data.indices&&t.data.indices.length%3===0&&t.data.vertices.length%3===0&&t.data.indices.every(i=>Number.isSafeInteger(i)&&i>=0&&i<t.vertices.length));const [cx,cz]=t.tile.split(',').map(Number),generated=terrainMesh(cx,cz,32,7734);assert.equal(t.data.verticesBytesSHA256,arrayHash(generated.vertices));assert.equal(t.data.indicesBytesSHA256,arrayHash(generated.indices));}
    const remote=terrains.find(t=>t.collider.handle===prior.penetrations[0].handle);assert.ok(remote);row({kind:'protected-remote-failure-owner',clock:clock(),originalSHA256:sha(originalBytes),owner:remote.id,worldBounds:bounds(remote.vertices),priorContact:prior.penetrations[0],contactUsable:false,requeried:false});
    // Snapshot handles only inside query borrow. Native reads happen after callback returns.
    const prismCenter={x:(cartBounds.min.x+cartBounds.max.x)/2,y:cartPose.position.y,z:(cartBounds.min.z+cartBounds.max.z)/2};
    const prismHalf={x:(cartBounds.max.x-cartBounds.min.x)/2,y:2,z:(cartBounds.max.z-cartBounds.min.z)/2};
    const broadphaseHandles:number[]=[];world.collidersWithAabbIntersectingAabb(prismCenter,prismHalf,(c:RAPIER.Collider)=>{broadphaseHandles.push(c.handle);return true;});
    const geometricNeighbors=terrains.filter(t=>intersectsXZ(bounds(t.vertices),cartBounds));
    row({kind:'locality-candidate-contract',clock:clock(),prism:{center:prismCenter,halfExtents:prismHalf,meaning:'exact footprint AABB times frozen ray vertical interval; query envelope only'},nativeBroadphaseHandles:broadphaseHandles,nativeBroadphaseTerrainOwners:terrains.filter(t=>broadphaseHandles.includes(t.collider.handle)).map(t=>t.id),allRegistryXZNeighbors:geometricNeighbors.map(t=>t.id),selectionUsesContactScalar:false});
    const patches:{owner:string;triangle:number;worldTriangle:V[];polygon:P2[];area:number}[]=[];
    for(const t of geometricNeighbors){const indices=t.data.indices!;for(let i=0;i<indices.length;i+=3){const tri=[t.vertices[indices[i]],t.vertices[indices[i+1]],t.vertices[indices[i+2]]],projected=ccw(tri.map(v=>({x:v.x,z:v.z})));if(polygonArea(projected)===0)continue;const clipped=clipPolygon(footprint,projected),area=polygonArea(clipped);if(area>0)patches.push({owner:t.id,triangle:i/3,worldTriangle:tri,polygon:clipped,area});}}
    row({kind:'actual-triangle-footprint-clips',clock:clock(),patches});
    const patchOwners=[...new Set(patches.map(p=>p.owner))];for(const owner of patchOwners){const t=terrains.find(t=>t.id===owner)!;assert.ok(broadphaseHandles.includes(t.collider.handle),'native broadphase missed exact current local triangle owner');}
    const coverageArea=patches.reduce((s,p)=>s+p.area,0);let overlapArea=0;for(let i=0;i<patches.length;i++)for(let j=i+1;j<patches.length;j++)overlapArea+=polygonArea(clipPolygon(patches[i].polygon,ccw(patches[j].polygon)));
    const planeYs=patches.flatMap(p=>p.worldTriangle.map(v=>v.y)),planeMin=planeYs.length?Math.min(...planeYs):null,planeMax=planeYs.length?Math.max(...planeYs):null;
    const areaResidual=Math.abs(coverageArea-footprintArea),horizontal=planeMin!==null&&planeMax!==null&&planeMax-planeMin<NUMERIC_EPS;
    // Exact factory array identity establishes complete 32x32 regular grid topology, without holes.
    // Require one such current axis-aligned grid rectangle to contain every footprint vertex.
    // Area coherence is supplemental arithmetic evidence, never permission to fill a small hole.
    const continuousGridOwners=geometricNeighbors.filter(t=>{const b=bounds(t.vertices);return t.pose.rotation.x===0&&t.pose.rotation.y===0&&t.pose.rotation.z===0&&t.pose.rotation.w===1&&footprint.every(p=>p.x>=b.min.x&&p.x<=b.max.x&&p.z>=b.min.z&&p.z<=b.max.z);}).map(t=>t.id);
    const boundedCoverage=patches.length>0&&continuousGridOwners.length===1&&patchOwners.length===1&&patchOwners[0]===continuousGridOwners[0]&&areaResidual<NUMERIC_EPS&&overlapArea<NUMERIC_EPS&&horizontal;
    row({kind:'finite-geometric-coverage-contract',clock:clock(),footprintArea,coverageArea,areaResidualSquareMetres:areaResidual,overlapAreaSquareMetres:overlapArea,planeMin,planeMax,horizontalWithinRecordedNumericalBound:horizontal,continuousGridOwners,boundedCoverage,topologyProof:'current native full arrays match complete generated 32x32 two-triangles-per-cell grid; one grid rectangle contains every convex footprint vertex',areaCoherenceBoundSquareMetres:NUMERIC_EPS,heightCoherenceBoundMetres:NUMERIC_EPS,limits:'one coplanar horizontal finite regular TriMesh grid under projected hull only; multi-owner/tilted/non-grid coverage unsupported; no loaded hull contact/force/COM certificate'});
    const samples:V[]=[...footprint.map(p=>({x:p.x,y:cartBounds.min.y,z:p.z})),...footprint.map((p,i)=>{const b=footprint[(i+1)%footprint.length];return {x:(p.x+b.x)/2,y:cartBounds.min.y,z:(p.z+b.z)/2};}),{x:footprint.reduce((s,p)=>s+p.x,0)/footprint.length,y:cartBounds.min.y,z:footprint.reduce((s,p)=>s+p.z,0)/footprint.length},...hull.filter(v=>Math.abs(v.y-cartBounds.min.y)<NUMERIC_EPS)];
    let samplesAgree=true;
    for(const [sampleIndex,point] of samples.entries()){
      let acceptedOwnerCount=0;
      for(const t of geometricNeighbors){const origin={x:point.x,y:cartPose.position.y+2,z:point.z},direction={x:0,y:-1,z:0};const hit=t.collider.castRayAndGetNormal(new RAPIER.Ray(origin,direction),4,true),projection=t.collider.projectPoint(point,false);
        const raw=hit?{timeOfImpact:hit.timeOfImpact,normal:copy(hit.normal),featureType:hit.featureType,featureId:hit.featureId,point:plus(origin,scale(direction,hit.timeOfImpact))}:null;
        row({kind:'native-local-footprint-ray-projection',clock:clock(),sampleIndex,point,owner:t.id,handle:t.collider.handle,pose:t.pose,origin,direction,maxDistance:4,raw,projection});
        if(raw){assert.ok(raw.timeOfImpact>=0&&raw.timeOfImpact<=4);assert.ok(Math.abs(norm(raw.normal)-1)<NUMERIC_EPS,'nonunit native ray normal');}if(projection)finiteVector(projection.point,'native projection');
        const agree=!!raw&&!!projection&&raw.normal.y>0&&planeMin!==null&&Math.abs(raw.point.y-planeMin)<NUMERIC_EPS&&Math.abs(raw.point.x-point.x)<NUMERIC_EPS&&Math.abs(raw.point.z-point.z)<NUMERIC_EPS&&norm(minus(projection.point,raw.point))<NUMERIC_EPS;
        if(agree)acceptedOwnerCount++;row({kind:'local-sample-coherence',clock:clock(),sampleIndex,owner:t.id,agree,sampledSignedPlaneGap:raw?point.y-raw.point.y:null,completeHullBearingClaim:false});
      }if(!acceptedOwnerCount)samplesAgree=false;
    }
    const initialPlaneGap=planeMin!==null?cartBounds.min.y-planeMin:null;
    const microEligible=boundedCoverage&&samplesAgree&&initialPlaneGap!==null&&Math.abs(initialPlaneGap)<NUMERIC_EPS;
    row({kind:'conditional-microtest-gate',clock:clock(),boundedCoverage,samplesAgree,initialPlaneGap,microEligible,geometryEvidence:'full projected footprint coverage to recorded numerical bounds',nativeEvidence:'finite listed samples only',physicalSupport:'UNKNOWN_BEFORE_TRAJECTORY',plannedMicroSteps:MICRO_STEPS});
    if(microEligible){
      const before=bodyData(body);row({kind:'microtest-exact-body-before-type-change',clock:clock(),body:before,cartOwner:CART_ID,numColliders:body.numColliders(),colliderHandle:body.collider(0).handle,colliderPose:currentPose(cart),colliderOffset:{position:cart.translationWrtParent(),rotation:cart.rotationWrtParent()},colliderFlags:flags(cart),nativeHullHash:arrayHash(cart.vertices()),operation:'setBodyType(RigidBodyType.Dynamic,true) ONLY; no transform/velocity/mass/damping/impulse mutation'});
      validateBody(before);assert.equal(body.numColliders(),1);assert.equal(body.collider(0).handle,cart.handle);assert.equal(body.handle,cart.parent()!.handle);assert.equal(norm(before.linvel),0);assert.equal(norm(before.angvel),0);const offsetPosition=cart.translationWrtParent(),offsetRotation=cart.rotationWrtParent();assert.ok(offsetPosition&&offsetRotation);finitePose({position:offsetPosition,rotation:offsetRotation});
      body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);
      const after=bodyData(body);row({kind:'microtest-body-after-type-change',clock:clock(),body:after,colliderPose:currentPose(cart),colliderFlags:flags(cart)});validateBody(after);assert.deepEqual(currentPose(cart),cartPose);assert.equal(after.mass,before.mass);assert.equal(after.gravityScale,before.gravityScale);assert.equal(after.linearDamping,before.linearDamping);assert.equal(after.angularDamping,before.angularDamping);assert.equal(arrayHash(cart.vertices()),cartData.verticesBytesSHA256);
      for(let tick=1;tick<=MICRO_STEPS;tick++){
        world.step();nativeStep++;
        const pairHandles:number[]=[];world.contactPairsWith(cart,(c:RAPIER.Collider)=>{pairHandles.push(c.handle);});
        const contacts:unknown[]=[];
        for(const handle of pairHandles){const other=world.getCollider(handle);assert.ok(other);const owner=terrains.find(t=>t.collider.handle===handle);const otherPose=currentPose(other),currentCartPose=currentPose(cart);
          const manifolds:{flipped:boolean;normal:V;localNormal1:V;localNormal2:V;subshape1:number;subshape2:number;contactCount:number;solverCount:number;contacts:{localPoint1:V|null;localPoint2:V|null;distance:number;impulse:number}[];solver:{point:V;distance:number;friction:number;restitution:number;tangentVelocity:V}[]}[]=[];
          world.contactPair(other,cart,(m:RAPIER.TempContactManifold,flipped:boolean)=>{const n=m.numContacts(),s=m.numSolverContacts();manifolds.push({flipped,normal:copy(m.normal()),localNormal1:copy(m.localNormal1()),localNormal2:copy(m.localNormal2()),subshape1:m.subshape1(),subshape2:m.subshape2(),contactCount:n,solverCount:s,contacts:Number.isSafeInteger(n)&&n>=0&&n<=10000?Array.from({length:n},(_,i)=>({localPoint1:m.localContactPoint1(i),localPoint2:m.localContactPoint2(i),distance:m.contactDist(i),impulse:m.contactImpulse(i)})):[],solver:Number.isSafeInteger(s)&&s>=0&&s<=10000?Array.from({length:s},(_,i)=>({point:copy(m.solverContactPoint(i)),distance:m.solverContactDist(i),friction:m.solverContactFriction(i),restitution:m.solverContactRestitution(i),tangentVelocity:copy(m.solverContactTangentVelocity(i))})):[]});});
          row({kind:'microtest-native-manifold-raw',clock:clock(),tick,first:{owner:owner?.id??'UNKNOWN_NON_TERRAIN_OWNER',handle,pose:otherPose,shapeType:other.shape.type,parent:flags(other).parent,colliderOffset:{position:other.translationWrtParent(),rotation:other.rotationWrtParent()}},second:{owner:CART_ID,handle:cart.handle,pose:currentCartPose},manifolds});finitePose(otherPose);finitePose(currentCartPose);
          for(const m of manifolds){assert.ok(Number.isSafeInteger(m.contactCount)&&m.contactCount>=0&&m.contactCount<=10000);assert.ok(Number.isSafeInteger(m.solverCount)&&m.solverCount>=0&&m.solverCount<=10000);assert.ok(Number.isSafeInteger(m.subshape1)&&Number.isSafeInteger(m.subshape2));if(m.contactCount||m.solverCount)assert.ok([m.normal,m.localNormal1,m.localNormal2].every(n=>Math.abs(norm(n)-1)<NUMERIC_EPS),'nonunit manifold normal');
            const firstPose=m.flipped?currentCartPose:otherPose,secondPose=m.flipped?otherPose:currentCartPose;
            for(const c of m.contacts){assert.ok(c.localPoint1&&c.localPoint2,'counted manifold contact unavailable STOP');const point1=plus(firstPose.position,rotate(c.localPoint1,firstPose.rotation)),point2=plus(secondPose.position,rotate(c.localPoint2,secondPose.rotation)),delta=minus(point2,point1);row({kind:'microtest-contact-local-to-world',clock:clock(),tick,flipped:m.flipped,localFrame1:m.flipped?CART_ID:owner?.id??`unknown:${handle}`,localFrame2:m.flipped?owner?.id??`unknown:${handle}`:CART_ID,point1,point2,nativeSignedDistance:c.distance,nativeNormalImpulse:c.impulse,pointDistanceResidual:Math.abs(norm(delta)-Math.abs(c.distance)),signedDistanceAlongRawNormal:dot(delta,m.normal),signedNormalDistanceResidual:Math.abs(dot(delta,m.normal)-c.distance),pointNormalVectorResidual:norm(minus(delta,scale(m.normal,c.distance))),normalInterpretation:'raw native manifold order normal and collider-local frames, flipped as captured; these consistency metrics do not qualify a full-hull load distribution'});}
          }contacts.push({handle,owner:owner?.id??'UNKNOWN_NON_TERRAIN_OWNER',manifoldCount:manifolds.length,totalNormalImpulse:manifolds.reduce((sum,m)=>sum+m.contacts.reduce((a,c)=>a+c.impulse,0),0)});
        }
        const trajectoryBody=bodyData(body);row({kind:'microtest-native-trajectory',clock:clock(),tick,body:trajectoryBody,cartPose:currentPose(cart),nativePairHandles:pairHandles,contacts,emptyContactsAreNotSupportPass:!contacts.length});validateBody(trajectoryBody);finitePose(currentPose(cart));assert.equal(cart.parent()!.handle,body.handle);assert.equal(body.numColliders(),1);assert.equal(body.collider(0).handle,cart.handle);
      }
      row({kind:'microtest-complete-no-admission',clock:clock(),dynamicSteps:MICRO_STEPS,totalWorldSteps:nativeStep,body:bodyData(body),claim:'finite actual same-cart trajectory and native contact impulses only; no settlement threshold, COM calibration, full-hull load or gameplay qualification'});
    }else row({kind:'microtest-unrun-local-qualification-not-met',clock:clock(),noAlternateCandidate:true});
    for(const t of terrains){assert.equal(registry.get(t.tile)?.terrain,t.collider);assert.deepEqual(currentPose(t.collider),t.pose);assert.equal(arrayHash(t.collider.vertices()),t.data.verticesBytesSHA256);assert.equal(arrayHash(t.collider.indices()!),t.data.indicesBytesSHA256);}assert.equal(arrayHash(cart.vertices()),cartData.verticesBytesSHA256);
    row({kind:'final-locality-integration-decision',clock:clock(),localCandidateOwners:patchOwners,remoteOwner:remote.id,remoteScalarContactUsable:false,boundedCoverage,samplesAgree,microEligible,canonicalCartShapeUnchanged:true,terrainPosesShapesUnchanged:true,productionRepair:'NONE',decision:'Require current registry identity plus broadphase plus exact triangle coverage before interpreting finite local sample/trajectory witnesses; unconditional all-terrain scalar-contact admission is unusable',nativeStreetAdmission:'DENIED_PENDING_REAL_GATES',Gate1:'INCOMPLETE'});
    row({kind:'frozen-input-verification-after-native',files:verifyInputs()});receipt.status='LOCALITY_AND_CONDITIONAL_TRAJECTORY_RECORDED_NOT_STREET_ADMISSION';
  }catch(error){originalFailure=error;receipt.status='FIRST_GENUINE_FAILURE_STOP_NO_RETRY';receipt.failure=error instanceof Error?error.stack:String(error);save();}
  finally{const disposed:string[]=[],cleanupErrors:{owner:string;error:string}[]=[];if(sim)try{sim.dispose();disposed.push('Simulation');}catch(error){cleanupErrors.push({owner:'Simulation',error:error instanceof Error?error.stack??error.message:String(error)});}let freedWorlds=0;for(const [i,w]of worlds.entries())try{w.free();freedWorlds++;disposed.push(`World:${i}`);}catch(error){cleanupErrors.push({owner:`World:${i}`,error:error instanceof Error?error.stack??error.message:String(error)});}receipt.disposal={disposed,allocatedWorlds:worlds.length,freedWorlds,remainingOrUnknownWorlds:worlds.length-freedWorlds,cleanupErrors};if(cleanupErrors.length){receipt.status='CLEANUP_FAILURE_STOP_NO_RETRY';if(!originalFailure)originalFailure=Error(JSON.stringify(cleanupErrors));}receipt.closed=new Date().toISOString();save();}
  if(originalFailure)throw originalFailure;
},60000);

