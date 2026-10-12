import {cityDistrict,cityReserved} from './cityDistrict';
import { CHUNK_SIZE } from './config';
import { getMap, serviceApproaches, serviceWorkshops, type MapPropKind } from './maps';
import { randomSeed } from './math';
export type PropKind = MapPropKind;
export interface PropDescriptor { kind: PropKind; x: number; y: number; z: number; scale: number; rotation: number; id?:string; breakableHp?:number; elevation?:number;roofOwner?:{x:number;z:number}; }
export const authoredPropId=(seed:number,p:{kind:PropKind;x:number;z:number})=>`${seed}:${p.kind}:${p.x}:${p.z}`;
export interface WorldChunk { key: string; cx: number; cz: number; props: PropDescriptor[]; biome: 'district' | 'wilds'; }
export const PROP_MODELS: Record<PropKind, string> = { workshop:'SM_RainWorkshop',cargo:'SM_RainCargoCover',crane:'SM_RainDockCrane',tower:'SM_RainStormTower',rock:'Coastal_Basalt',cedar:'Pine_Evergreen',fern:'SM_RainFern',pipes:'SM_RainPipeBank',wall:'SM_RainRetainingWall',lamp:'SM_RainLamp' };
const smooth = (v: number) => { const t=Math.max(0,Math.min(1,v)); return t*t*(3-2*t); };
export function segmentDistance(x:number,z:number,a:{x:number;z:number;y:number},b:{x:number;z:number;y:number}) {
  const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
  return {distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t),height:a.y+(b.y-a.y)*t};
}
/** Road centers and landing pads are graded, with broad shoulders blending into sculpted terrain. */
function terrainBaseHeight(x: number, z: number, seed=7734): number {
  const map=getMap(seed);
  const grading=cityDistrict(map.seed)?.grading;
  const cityEdge=grading?Math.max(grading.minX-x,x-grading.maxX,grading.minZ-z,z-grading.maxZ,0):Infinity;
  // A single surveyed city plate prevents every worker/grid sample from
  // rescanning all city roads and pads. The outer shoulder blends continuously.
  if(grading&&cityEdge===0)return grading.height;
  let height:number;
  if(map.seed===1926) {
    const r=Math.hypot(x*.92,(z+40)*.8);
    const terrace=smooth((r-25)/24)*4+smooth((r-64)/22)*5+smooth((r-101)/26)*8;
    height=-4+terrace+Math.sin(x*.042)*Math.cos(z*.048)*1.7+Math.sin(x*.095+z*.071)*.6;
  } else if(map.seed===4107) {
    const north=Math.max(0,Math.min(15,(-z+14)*.086));
    const ridge=7*Math.exp(-Math.pow((x+39)/40,2))+9*Math.exp(-Math.pow((x-60)/27,2));
    height=-4+north+ridge+Math.sin(z*.042+x*.018)*2+Math.cos(x*.047)*1.4;
  } else {
    const outskirts=smooth((Math.hypot(x,z)-95)/90),coast=Math.min(7,Math.max(0,(-x-108)*.22));
    height=-.08+outskirts*(1.7+Math.sin(x*.023)*Math.cos(z*.026)*5+Math.sin(z*.058+x*.024)*1.5)-coast;
  }
  if(grading&&cityEdge<14)height=grading.height+(height-grading.height)*smooth(cityEdge/14);
  let nearest=Infinity,roadHeight=height,halfWidth=0;
  for(const road of map.roads) for(let i=1;i<road.points.length;i++) {
    const sample=segmentDistance(x,z,road.points[i-1],road.points[i]);
    const shoulderDistance=sample.distance-road.width/2;
    if(shoulderDistance<nearest){nearest=shoulderDistance;roadHeight=sample.height;halfWidth=road.width/2;}
  }
  // Flat landing pads retain the nearest road's authored elevation.
  for(const pad of [map.spawn,...map.objectives.map(o=>o.position)]) {
    const distance=Math.hypot(x-pad.x,z-pad.z);
    if(distance>=13)continue;
    let padDistance=Infinity,padHeight=roadHeight;
    for(const road of map.roads)for(let i=1;i<road.points.length;i++){
      const sample=segmentDistance(pad.x,pad.z,road.points[i-1],road.points[i]);
      if(sample.distance<padDistance){padDistance=sample.distance;padHeight=sample.height;}
    }
    height=height*(1-smooth((13-distance)/5))+padHeight*smooth((13-distance)/5);
  }
  const influence=1-smooth(Math.max(0,nearest)/(halfWidth+10));
  return height*(1-influence)+roadHeight*influence;
}

const buildingPadCache=new Map<number,{x:number;z:number;height:number;hx:number;hz:number;c:number;s:number}[]>();
/** Broad, rigid kit pieces sit on graded construction pads, including their
 * corners. A center-only terrain sample would leave buildings floating on hills. */
export function terrainHeight(x:number,z:number,seed=7734):number {
  const map=getMap(seed);seed=map.seed;
  let pads=buildingPadCache.get(seed);
  if(!pads){
    pads=[];
    for(const p of map.props)if(p.elevation===undefined&&['workshop','cargo','pipes','tower','wall','crane'].includes(p.kind)){
      const [footprintX,hz]=propFootprint({...p,y:0});let hx=footprintX;
      const services=serviceWorkshops(seed);
      // A full-hull flat apron supports every allowed claw standoff, including
      // Bastion on Frostline's rising shoulder. Its facade base stays unchanged.
      if(p.kind==='workshop'&&services.some(service=>p.x===service.x&&p.z===service.z))hx=Math.max(hx,12*p.scale+3.8);
      const collider=propCollider({...p,y:0}),radius=collider?Math.hypot(collider[0],collider[2]):1;
      if(isRequiredLane(p.x,p.z,seed,radius))continue;
      pads.push({x:p.x,z:p.z,height:terrainBaseHeight(p.x,p.z,seed),hx,hz,c:Math.cos(p.rotation),s:Math.sin(p.rotation)});
    }
    for(const b of cityDistrict(seed)?.buildings??[])pads.push({x:b.position.x,z:b.position.z,height:b.position.y,hx:b.width/2+4,hz:b.depth/2,c:Math.cos(b.yaw),s:Math.sin(b.yaw)});
    buildingPadCache.set(seed,pads);
  }
  const height=terrainBaseHeight(x,z,seed);
  let nearest=Infinity,padHeight=height;
  for(const p of pads){
    const dx=x-p.x,dz=z-p.z,lx=dx*p.c-dz*p.s,lz=dx*p.s+dz*p.c;
    const edge=Math.max(Math.abs(lx)-p.hx-2,Math.abs(lz)-p.hz-2,0);
    if(edge===0)return p.height;
    if(edge<nearest){nearest=edge;padHeight=p.height;}
  }
  // Building shoulders may approach a road, but never regrade its traveled
  // corridor. Preserve the authored centerline and blend across its shoulder.
  let roadClearance=Infinity;
  for(const road of map.roads)for(let i=1;i<road.points.length;i++)roadClearance=Math.min(roadClearance,segmentDistance(x,z,road.points[i-1],road.points[i]).distance-road.width/2-2.2);
  const influence=(1-smooth(nearest/8))*smooth(roadClearance/6);return height*(1-influence)+padHeight*influence;
}

/** Keep required lanes free using the full collider footprint, not only prop centers. */
export function isRequiredLane(x:number,z:number,seed=7734,clearance=0):boolean {
  const map=getMap(seed);
  if([map.spawn,...map.objectives.map(o=>o.position),...map.enemySpawns.map(([x,z])=>({x,y:0,z}))].some(p=>Math.hypot(x-p.x,z-p.z)<10+clearance))return true;
  if(map.routes.some(route=>route.some((p,i)=>Math.hypot(x-p.x,z-p.z)<4+clearance||(i>0&&segmentDistance(x,z,route[i-1],p).distance<2+clearance))))return true;
  return map.roads.some(r=>r.points.some((p,i)=>i>0&&segmentDistance(x,z,r.points[i-1],p).distance<r.width/2+2+clearance));
}
export const chunkAt = (v: number) => Math.floor(v / CHUNK_SIZE);
export function isServiceApproach(x:number,z:number,seed:number,clearance=0):boolean {
  return serviceApproaches(seed).some(route=>route.some((p,i)=>i>0&&segmentDistance(x,z,route[i-1],p).distance<3+clearance));
}
export function chunkKeys(x: number,z: number,radius: number): string[] {
  const result:string[]=[];
  for(let cx=chunkAt(x)-radius;cx<=chunkAt(x)+radius;cx++) for(let cz=chunkAt(z)-radius;cz<=chunkAt(z)+radius;cz++) result.push(`${cx},${cz}`);
  return result;
}
export function generateChunk(seed:number,cx:number,cz:number): WorldChunk {
  const rng=randomSeed(seed ^ Math.imul(cx,73856093) ^ Math.imul(cz,19349663));
  const map=getMap(seed),biome=Math.hypot(cx,cz)<3?'district':'wilds';
  const props:PropDescriptor[]=[];
  const put=(kind:PropKind,x:number,z:number,scale=1,rotation=0)=>props.push({kind,x,y:terrainHeight(x,z,seed),z,scale,rotation});
  for(const p of map.props)if(chunkAt(p.x)===cx&&chunkAt(p.z)===cz){
    const district=cityDistrict(seed);
    if(district?.id.includes('overhaul')&&p.x>=district.grading.minX&&p.x<=district.grading.maxX&&p.z>=district.grading.minZ&&p.z<=district.grading.maxZ)continue;
    const size=propCollider({...p,y:0}),radius=size?Math.hypot(size[0],size[2]):1;
    const owner=p.roofOwner&&map.props.find(q=>q.kind==='workshop'&&q.x===p.roofOwner!.x&&q.z===p.roofOwner!.z),ownerSize=owner&&propCollider({...owner,y:0});
    const admitted=owner?!!ownerSize&&!isRequiredLane(owner.x,owner.z,seed,Math.hypot(ownerSize[0],ownerSize[2])):!p.roofOwner&&!isRequiredLane(p.x,p.z,seed,radius);
    if(admitted)props.push({...p,y:terrainHeight(owner?.x??p.x,owner?.z??p.z,seed)+(p.elevation??0),id:authoredPropId(seed,p),...((p.breakableHp??(p.kind==='wall'?180:0))?{breakableHp:p.breakableHp??180}: {})});
  }
  const count=map.seed===1926?27:map.seed===4107?24:36;
  for(let i=0;i<count;i++) {
    const x=cx*64+rng()*64,z=cz*64+rng()*64;
    if(isRequiredLane(x,z,seed,6)||isServiceApproach(x,z,seed,6)||cityReserved(seed,x,z,6))continue;
    if(props.some(p=>p.kind==='workshop'&&Math.hypot(x-p.x,z-p.z)<18)) continue;
    const kind:PropKind=map.seed===1926?'rock':map.seed===4107?(i<19?'rock':'cedar'):i<6?'rock':i<18?'cedar':'fern';
    const scale=kind==='rock'?.35+rng()*(map.seed===7734?.6:1):kind==='cedar'?.65+rng()*.65:.8+rng()*.8;
    put(kind,x,z,scale,rng()*Math.PI*2);
  }
  for(const road of map.roads)for(let i=0;i<road.points.length;i++){
    const p=road.points[i],x=p.x+road.width/2+2,z=p.z;
    if(chunkAt(x)===cx&&chunkAt(z)===cz&&i%2===0)put('lamp',x,z,.9);
  }
  return {key:`${cx},${cz}`,cx,cz,biome,props};
}
export function terrainMesh(cx:number,cz:number,segments=32,seed=7734) {
  const vertices=new Float32Array((segments+1)**2*3);
  const indices=new Uint32Array(segments*segments*6);
  let v=0,k=0;
  for(let z=0;z<=segments;z++) for(let x=0;x<=segments;x++) {const px=cx*64+x*64/segments,pz=cz*64+z*64/segments;vertices[v++]=px;vertices[v++]=terrainHeight(px,pz,seed);vertices[v++]=pz;}
  for(let z=0;z<segments;z++) for(let x=0;x<segments;x++) { const a=z*(segments+1)+x,b=a+1,c=a+segments+1,d=c+1;indices[k++]=a;indices[k++]=c;indices[k++]=b;indices[k++]=b;indices[k++]=c;indices[k++]=d; }
  return {vertices,indices};
}
export function propCollider(p:PropDescriptor): [number,number,number] | null {
  const sizes: Partial<Record<PropKind,[number,number,number]>>={workshop:[10.3,6,8.4],cargo:[4.3,2.1,1.45],tower:[2.8,11,2.8],pipes:[5,1.06,1.55],rock:[2.8,.48,3],wall:[6,1,3],cedar:[.34,6.5,.34]};
  const size=sizes[p.kind];return size?size.map(n=>n*p.scale) as [number,number,number]:null;
}
/** Ground supports include the rendered kit's roof/base overhang beyond its
 * simplified collision box. Values are conservative meter-scale GLB bounds. */
export function propFootprint(p:PropDescriptor):[number,number] {
  const footprint:Partial<Record<PropKind,[number,number]>>={workshop:[11.5,10.4],cargo:[4.3,1.5],pipes:[5,1.55],tower:[2.8,2.8],wall:[6,3],crane:[10,9]};
  const size=footprint[p.kind];return size?[size[0]*p.scale,size[1]*p.scale]:[1*p.scale,1*p.scale];
}

export interface LandmarkBlock {position:[number,number,number];halfExtents:[number,number,number];yaw:number;material:'concrete'|'steel'|'signal';groundSupport?:boolean;}
const landmarkCache=new Map<number,LandmarkBlock[]>();
/** A small shared box kit gives each theater a readable silhouette and matching collision. */
export function landmarkBlocks(seed:number):LandmarkBlock[] {
  seed=getMap(seed).seed;
  const cached=landmarkCache.get(seed);if(cached)return cached;
  const blocks:LandmarkBlock[]=[];
  for(const landmark of getMap(seed).landmarks){
    const {position:p,rotation:yaw,scale:s}=landmark,c=Math.cos(yaw),n=Math.sin(yaw);
    const base=terrainHeight(p.x,p.z,seed);
    const add=(x:number,y:number,z:number,hx:number,hy:number,hz:number,material:LandmarkBlock['material']='steel')=>blocks.push({position:[p.x+(x*c+z*n)*s,base+y*s,p.z+(-x*n+z*c)*s],halfExtents:[hx*s,hy*s,hz*s],yaw,material});
    // Supports extend below the lowest sampled footing, while all cross-beams
    // keep their authored height. This grounds sloping foundations without moving
    // the physics box independently of its visible instanced mesh.
    const support=(x:number,top:number,z:number,hx:number,hz:number,material:LandmarkBlock['material']='steel')=>{
      const wx=p.x+(x*c+z*n)*s,wz=p.z+(-x*n+z*c)*s,heights:number[]=[];
      for(const a of [-1,0,1])for(const b of [-1,0,1])heights.push(terrainHeight(wx+(a*hx*c+b*hz*n)*s,wz+(-a*hx*n+b*hz*c)*s,seed));
      const bottom=Math.min(...heights)-.35,roof=Math.max(base+top*s,Math.max(...heights)+.25);
      blocks.push({position:[wx,(bottom+roof)/2,wz],halfExtents:[hx*s,(roof-bottom)/2,hz*s],yaw,material,groundSupport:true});
    };
    if(landmark.kind==='breakwater'){
      for(let i=0;i<12;i++){support(0,6,i*13-72,7,5.8,'concrete');add(0,6.2,i*13-72,7.5,.3,6,'steel');}
      support(0,18,-78,1.3,1.3,'concrete');add(0,18.4,-78,1.8,.5,1.8,'signal');
    } else if(landmark.kind==='gantry') {
      for(const x of [-15,15]){support(x,24,0,1.4,2.3);support(x,2,0,3,4,'concrete');support(x,32,12,1.2,1.2);}
      add(0,26,0,17,1.4,3);add(0,31,12,17,1,2);add(0,27,5,18,.5,7);add(-5,29,0,4,2,4,'concrete');add(5,28.5,0,3,.2,3,'signal');
      for(let i=0;i<5;i++)add(-12+i*6,22,0,.35,2.6,.4);
    } else {
      support(0,4,0,6,6,'concrete');add(0,10,0,1.4,8,1.4);add(0,17,0,9,.65,7);add(0,18,-7,9,1.7,.5);add(0,18,7,9,1.7,.5);
      add(-9,18,0,.5,1.7,7);add(9,18,0,.5,1.7,7);add(0,21,0,.5,4,.5);add(0,25,0,1.2,.45,1.2,'signal');
      for(const x of [-5,5])add(x,15,0,.5,3.5,.5);
    }
  }
  landmarkCache.set(seed,blocks);return blocks;
}
