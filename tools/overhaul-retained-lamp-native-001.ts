import fs from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import {createRetainedLampColliderDescriptors} from '../shared/rainlineLampCollision';
import mesh from '../shared/data/rainlineLampMeshCollision001.json';
await RAPIER.init();
const world=new RAPIER.World({x:0,y:0,z:0});
try{
 const prop={kind:'lamp' as const,x:12,y:.4,z:-8,scale:.9,rotation:.7};
 const collider=world.createCollider(createRetainedLampColliderDescriptors(prop)[0]);
 world.step();
 const ids=mesh.indices.slice(0,3),p=ids.map(i=>mesh.vertices.slice(i*3,i*3+3));
 const u=p[1].map((n,i)=>n-p[0][i]),v=p[2].map((n,i)=>n-p[0][i]);
 const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...normal);
 if(length<1e-8)throw Error('Degenerate source probe');
 const yaw=(a:number[])=>[Math.cos(prop.rotation)*a[0]+Math.sin(prop.rotation)*a[2],a[1],-Math.sin(prop.rotation)*a[0]+Math.cos(prop.rotation)*a[2]];
 const center=yaw([0,1,2].map(a=>(p[0][a]+p[1][a]+p[2][a])/3*prop.scale)).map((n,i)=>n+[prop.x,prop.y,prop.z][i]);
 const direction=yaw(normal.map(n=>n/length));
 const start=center.map((n,i)=>n+direction[i]*2),velocity=direction.map(n=>-n);
 const cast=(offset:number)=>world.castShape({x:start[0]+offset,y:start[1],z:start[2]},{x:0,y:0,z:0,w:1},{x:velocity[0],y:velocity[1],z:velocity[2]},new RAPIER.Ball(.26),0,4,true);
 const contact=cast(0),empty=cast(20);
 if(!contact||contact.collider.handle!==collider.handle||empty)throw Error('Native camera sweep did not distinguish retained surface from empty space');
 const result={revision:mesh.revision,sourceSha256:mesh.sourceSha256,probe:{prop,center,start,velocity},contact:{handle:contact.collider.handle,timeOfImpact:contact.time_of_impact},empty:empty??null,limitation:'Single actual-source camera sweep; ordinary play and presentation remain unreviewed.'};
 fs.mkdirSync('.sites-runtime/overhaul-20261010/retained-lamp-native-001',{recursive:true});
 fs.writeFileSync('.sites-runtime/overhaul-20261010/retained-lamp-native-001/result.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}finally{world.free();}
