import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Matrix4,Vector3} from 'three';
import {envelopeFaces} from '../shared/buildingSurfaces';
import {workshopCollision,workshopCollisionReceipt} from '../shared/workshopCollision';
import {workshopGeometry,workshopRoofHeight,workshopRoofFootprintHeight,workshopRoofMax} from '../shared/workshopGeometry';
import {createClimbingProbe,probeClimbingContact} from '../src/game/entities/climbingContact';
import {registerBuildingContacts} from '../src/game/world/buildingContacts';

beforeAll(async()=>{await RAPIER.init();});
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
describe('shipping workshop triangle collision',()=>{
  for(const [seed,triangles] of [[7734,17143],[1926,12196]])it(`retains exact hashed shipping triangles and actual roof/eave surfaces for ${seed}`,async()=>{
    const receipt=workshopCollisionReceipt(seed),mesh=workshopCollision(seed),fit=workshopGeometry(seed);
    expect(sha(await readFile(receipt.source))).toBe(receipt.sourceSha256);expect(mesh.indices.length/3).toBe(triangles);expect(receipt.skippedDegenerate).toBe(0);
    expect(sha(new Uint8Array(mesh.vertices.buffer))).toBe(receipt.positionsSha256);expect(sha(new Uint8Array(mesh.indices.buffer))).toBe(receipt.indicesSha256);
    expect([...mesh.indices].every(i=>i<mesh.vertices.length/3)).toBe(true);expect([...mesh.vertices].every(Number.isFinite)).toBe(true);
    const world=new RAPIER.World({x:0,y:-9.8,z:0}),collider=world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices));world.step();
    const down=world.castRayAndGetNormal(new RAPIER.Ray({x:0,y:16,z:0},{x:0,y:-1,z:0}),8,false)!,roof=16-down.timeOfImpact;
    expect(down.collider).toBe(collider);expect(down.normal.y).toBeGreaterThan(.95);expect(roof).toBeCloseTo(workshopRoofHeight(seed,0,0)!,4);expect(roof).toBeLessThan(13.1-.2);
    expect(roof).toBeLessThanOrEqual(workshopRoofMax(seed)+1e-5);expect(workshopRoofHeight(seed,11.2,0)).toBeCloseTo(fit.roofTop,4);
    expect(workshopRoofHeight(seed,40,0)).toBeNull();expect(workshopRoofFootprintHeight(seed,0,0,2,2)).toBeCloseTo(roof,4);
    // The real eave is solid, but there is no invented wall underneath it.
    const edgeX=11.2,underside=world.castRayAndGetNormal(new RAPIER.Ray({x:edgeX,y:11,z:0},{x:0,y:1,z:0}),3,false)!;
    expect(underside.collider).toBe(collider);expect(underside.normal.y).toBeLessThan(-.95);
    const empty=world.castRay(new RAPIER.Ray({x:12,y:6,z:0},{x:-1,y:0,z:0}),.7,false);expect(empty).toBeNull();
    world.free();
  });
  it('bakes instance scale, translation and yaw once while keeping source buffers reusable',()=>{
    const scale=.85,yaw=.7,c=Math.cos(yaw),s=Math.sin(yaw),mesh=workshopCollision(7734,scale),source=workshopCollision(7734),world=new RAPIER.World({x:0,y:-9.8,z:0});
    const collider=world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices).setTranslation(17,4,-21).setRotation({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)}));world.step();
    const roof=world.castRayAndGetNormal(new RAPIER.Ray({x:17,y:20,z:-21},{x:0,y:-1,z:0}),20,false)!;expect(20-roof.timeOfImpact).toBeCloseTo(4+workshopRoofHeight(7734,0,0)!*scale,4);
    const x=17+12*scale*c,z=-21-12*scale*s,hit=world.castRayAndGetNormal(new RAPIER.Ray({x,y:4+6*scale,z},{x:-c,y:0,z:s}),4,false)!;
    expect(hit.collider).toBe(collider);expect(hit.normal.x*c-hit.normal.z*s).toBeGreaterThan(.95);expect(mesh.vertices).not.toBe(source.vertices);expect(mesh.indices).toBe(source.indices);world.free();
  });
});
describe('displayed claw footprint truth',()=>{
  const face=envelopeFaces({id:'test',kind:'city',center:{x:-5,y:0,z:0},yaw:0,halfExtents:{x:5,z:5},height:10,roofId:'roof',roofBlockIds:['deck'],faceBlockIds:{west:[],east:['wall'],south:[],north:[]}}).find(f=>f.side==='east')!;
  const corners:Vector3[]=[];for(const x of [-.1,.1])for(const y of [-.1,.1])for(const z of [-.1,.1])corners.push(new Vector3(x,y,z));
  it('requires all five owned wall hits, rejects a foreign obstruction and releases immediately on removal',()=>{
    const world=new RAPIER.World({x:0,y:-9.8,z:0}),wall=world.createCollider(RAPIER.ColliderDesc.cuboid(.15,5,5).setTranslation(-.15,5,0)),remove=registerBuildingContacts(world,id=>id==='wall'&&wall.isValid()?wall:undefined),probe=createClimbingProbe(),paw=new Vector3(.102,5,0),matrix=new Matrix4().makeTranslation(paw.x,paw.y,paw.z);
    world.step();expect(probeClimbingContact(world,probe,face,corners,matrix,paw,paw.clone(),false,1)).toBe(true);expect(probe.casts).toBe(5);
    const obstruction=world.createCollider(RAPIER.ColliderDesc.cuboid(.01,1,1).setTranslation(.1,5,0));world.step();expect(probeClimbingContact(world,probe,face,corners,matrix,paw,paw.clone(),false,1)).toBe(false);
    world.removeCollider(obstruction,true);world.removeCollider(wall,true);world.step();expect(probeClimbingContact(world,probe,face,corners,matrix,paw,paw.clone(),false,1)).toBe(false);remove();world.free();
  });
  it('cannot bridge a footprint corner hole using a surviving center or a cached collider handle',()=>{
    const world=new RAPIER.World({x:0,y:-9.8,z:0}),wall=world.createCollider(RAPIER.ColliderDesc.cuboid(.15,5,.08).setTranslation(-.15,5,0)),remove=registerBuildingContacts(world,id=>id==='wall'?wall:undefined),probe=createClimbingProbe(),paw=new Vector3(.102,5,0),matrix=new Matrix4().makeTranslation(paw.x,paw.y,paw.z);
    world.step();expect(world.castRay(new RAPIER.Ray({x:.5,y:5,z:0},{x:-1,y:0,z:0}),1,false)).toBeTruthy();expect(probeClimbingContact(world,probe,face,corners,matrix,paw,paw.clone(),false,1)).toBe(false);expect(probe.casts).toBeLessThanOrEqual(5);
    remove();world.free();
  });
  it('rejects a ten-millimeter corner rise even when the center and all hit normals look valid',()=>{
    const world=new RAPIER.World({x:0,y:-9.8,z:0}),angle=.05,wall=world.createCollider(RAPIER.ColliderDesc.cuboid(.15,5,5).setTranslation(-.15,5,0).setRotation({x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)})),remove=registerBuildingContacts(world,id=>id==='wall'?wall:undefined),probe=createClimbingProbe(),paw=new Vector3(.104,5,0),matrix=new Matrix4().makeTranslation(paw.x,paw.y,paw.z);
    world.step();expect(probeClimbingContact(world,probe,face,corners,matrix,paw,paw.clone(),false,1)).toBe(false);expect(probe.casts).toBe(5);
    expect(Math.max(...probe.heights)-Math.min(...probe.heights)).toBeGreaterThan(.009);remove();world.free();
  });
});
