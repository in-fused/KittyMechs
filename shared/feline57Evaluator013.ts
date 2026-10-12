import type {Channel013,Feline57Packet013,Geometry013,M4_013,Pose013,Q4_013,V3_013,Vertex013} from './feline57Contract013';
export const identity013=():M4_013=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
export function multiply013(a:M4_013,b:M4_013):M4_013 { const r=Array<number>(16).fill(0);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r; }
export function point013(m:M4_013,p:V3_013):V3_013 {return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
function normalize(q:number[]):Q4_013 {const n=Math.hypot(...q);if(!(n>0))throw Error('ZERO_QUATERNION');return [q[0]/n,q[1]/n,q[2]/n,q[3]/n];}
export function compose013(t:V3_013,q:Q4_013,s:V3_013):M4_013 {
  const [x,y,z,w]=q,x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
  return [(1-yy-zz)*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,(xy-wz)*s[1],(1-xx-zz)*s[1],(yz+wx)*s[1],0,(xz+wy)*s[2],(yz-wx)*s[2],(1-xx-yy)*s[2],0,...t,1];
}
function slerp(a:number[],b:number[],u:number):Q4_013 {let dot=a.reduce((s,x,i)=>s+x*b[i],0);if(dot<0){b=b.map(x=>-x);dot=-dot;}if(dot>0.9995)return normalize(a.map((x,i)=>x+(b[i]-x)*u));const theta=Math.acos(Math.min(1,dot)),d=Math.sin(theta),ka=Math.sin((1-u)*theta)/d,kb=Math.sin(u*theta)/d;return normalize(a.map((x,i)=>ka*x+kb*b[i]));}
function sample(c:Channel013,t:number):number[] {
  const n=c.path==='rotation'?4:3, factor=c.interpolation==='CUBICSPLINE'?3:1;
  const value=(i:number)=>c.values.slice((i*factor+(factor===3?1:0))*n,(i*factor+(factor===3?1:0))*n+n);
  if(t<=c.times[0])return value(0);const last=c.times.length-1;if(t>=c.times[last])return value(last);
  let lo=0,hi=last;while(hi-lo>1){const mid=(lo+hi)>>1;if(c.times[mid]<=t)lo=mid;else hi=mid;}
  const dt=c.times[hi]-c.times[lo],u=(t-c.times[lo])/dt,a=value(lo),b=value(hi);
  if(c.interpolation==='STEP')return a;
  if(c.interpolation==='LINEAR')return c.path==='rotation'?slerp(a,b,u):a.map((x,i)=>x+(b[i]-x)*u);
  const u2=u*u,u3=u2*u,out=c.values.slice((lo*3+2)*n,(lo*3+3)*n),inc=c.values.slice(hi*3*n,(hi*3+1)*n);
  const r=a.map((x,i)=>(2*u3-3*u2+1)*x+(u3-2*u2+u)*dt*out[i]+(-2*u3+3*u2)*b[i]+(u3-u2)*dt*inc[i]);return c.path==='rotation'?normalize(r):r;
}
/** All four actual postloader slots retained, including their finite raw sum.
 * Shader homogeneous skinning has the weighted-origin correction (1-sum)*meshOrigin.
 * CPU applyBoneTransform drops the homogeneous w and is not the nonunit shader oracle. */
export function posedVertex013(packet:Feline57Packet013,world:M4_013[],meshNode:number,skinIndex:number|null,v:Vertex013):V3_013 {
  if(skinIndex===null)return point013(world[meshNode],v.position);
  if(!v.joints||!v.weights)throw Error('MISSING_SKIN_WEIGHTS');const skin=packet.skins[skinIndex],p:V3_013=[0,0,0];
  let sum=0;for(let k=0;k<4;k++){const w=v.weights[k];sum+=w;if(!w)continue;const m=multiply013(world[skin.joints[v.joints[k]]],skin.inverseBinds[v.joints[k]]),q=point013(m,v.position);for(let j=0;j<3;j++)p[j]+=w*q[j];}const mesh=world[meshNode];for(let j=0;j<3;j++)p[j]+=(1-sum)*mesh[12+j];return p;
}
export function evaluateFeline57Pose013(packet:Feline57Packet013,request:{clip:string|null;time:number;loop?:boolean}):Pose013 {
  if(!Number.isFinite(request.time)||request.time<0)throw Error('INVALID_POSE_CLOCK');
  const clip=request.clip===null?null:packet.clips.find(c=>c.name===request.clip);if(request.clip!==null&&!clip)throw Error('UNKNOWN_CLIP');
  const time=clip?(request.loop&&clip.duration>0?request.time%clip.duration:Math.min(request.time,clip.duration)):0;
  const trs=packet.nodes.map(n=>({t:[...n.translation] as V3_013,q:[...n.rotation] as Q4_013,s:[...n.scale] as V3_013}));
  for(const c of clip?.channels??[]){const v=sample(c,time);if(c.path==='translation')trs[c.node].t=v as V3_013;else if(c.path==='scale')trs[c.node].s=v as V3_013;else trs[c.node].q=v as Q4_013;}
  const local=packet.nodes.map((n,i)=>n.matrix?[...n.matrix]:compose013(trs[i].t,trs[i].q,trs[i].s));
  const world:M4_013[]=[],visiting=new Set<number>();function visit(i:number):M4_013 {if(world[i])return world[i];if(visiting.has(i))throw Error('NODE_CYCLE');visiting.add(i);const parent=packet.nodes[i].parent;world[i]=parent===null?local[i]:multiply013(visit(parent),local[i]);visiting.delete(i);return world[i];}packet.nodes.forEach((_,i)=>visit(i));
  return {clip:request.clip,time,local,world,bones:packet.boneNodes.map(node=>({node,name:packet.nodes[node].name,matrix:world[node]})),pads:packet.pads.map(p=>({id:p.id,limb:p.limb,triangles:p.triangles,points:p.vertices.map(v=>posedVertex013(packet,world,p.meshNode,p.skin,v))}))};
}
export interface Bounds013 {min:V3_013;max:V3_013;contributors:string[];}
/** Expensive offline descriptor generation ONLY. Selected clocks are not an admitted envelope. */
export function sampleFeline57Geometry013(packet:Feline57Packet013,geometry:Geometry013,pose:Pose013) {
  if(packet.identity.assetSha256!==geometry.assetSha256)throw Error('GEOMETRY_IDENTITY_MISMATCH');
  const groups:Record<string,Bounds013>={};const points:V3_013[][]=[];
  const add=(group:string,owner:string,p:V3_013)=>{const b=groups[group]??(groups[group]={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity],contributors:[]});for(let a=0;a<3;a++){b.min[a]=Math.min(b.min[a],p[a]);b.max[a]=Math.max(b.max[a],p[a]);}if(!b.contributors.includes(owner))b.contributors.push(owner);};
  for(const primitive of geometry.primitives){const pp=primitive.vertices.map(v=>posedVertex013(packet,pose.world,primitive.meshNode,primitive.skin,v));points.push(pp);for(let t=0;t<primitive.indices.length;t+=3){const owner=primitive.triangleOwners[t/3];if(!owner)throw Error('MISSING_SOURCE_OWNER');const region=owner.startsWith('tail_')?'tail':owner==='head'?'head':/^(FL|FR|HL|HR)_/.test(owner)?'limb':'core';for(const i of primitive.indices.slice(t,t+3)){const p=pp[i];add('full',owner,p);add(region,owner,p);if(region!=='tail')add('tailExcludedBody',owner,p);if(/^(FL|FR)_claw/.test(owner))add('foreClawAttackReach',owner,p);}}}
  return {status:'SAMPLED_SOURCE_OCCUPANCY_NOT_ADMITTED_ENVELOPE' as const,frame:'GLTF-model-units-Yup-before-runtime-scale-and-mount' as const,clip:pose.clip,time:pose.time,groups,points};
}
/** GLTF model→native actor-local. Source→GLTF is already baked in by export. */
export function nativeMount013(p:V3_013):V3_013 {return [-0.8*p[0],0.8*p[1],-0.8*p[2]];}
