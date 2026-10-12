import type {CityBlock,CityDistrict,CityStructure} from './cityDistrict';
import type {BuildingFace,BuildingSide} from './buildingSurfaces';

export const OVERHAUL_ARCHITECTURE_PREFIX='7734:overhaul:architecture:';
export type ArchitectureFamily='loading'|'transit'|'control'|'residential';
export interface ArchitectureComponent {
  module:string;family:ArchitectureFamily;assemblyId:string;name:string;kind:'wall'|'slab'|'solid-marker';
  wallFaceIds:string[];roofFaceIds:string[];
}
interface RoofSpec {id:string;lot:string;family:ArchitectureFamily;center:[number,number,number];width:number;depth:number;steps?:readonly number[];solidTiers?:readonly (readonly [number,number,number])[];chimneys?:boolean;}
/** Exact Y-up metre recipe from city-v3/roof_constructions.py. Array order is
 * wire/source identity: append only, never sort cells or the canonical district. */
export const OVERHAUL_ARCHITECTURE_SPECS:readonly RoofSpec[]=[
  {id:'loading-monitor',lot:'spawn-west',family:'loading',center:[-30,8.92,23],width:6.4,depth:1.8,steps:[1.1,1.7,2.4]},
  {id:'station-lantern',lot:'west-relay-yard',family:'transit',center:[-30,10.92,-52.5],width:6.4,depth:1.8,steps:[1.2,1.6]},
  {id:'control-crown',lot:'core-west',family:'control',center:[-23,11.92,-86],width:2.4,depth:2.4,solidTiers:[[2.4,2.4,.8],[1.7,1.7,1],[.9,.9,1.2]]},
  {id:'residential-crown',lot:'west-midrise',family:'residential',center:[-57,13.92,-55],width:4,depth:4,steps:[1.2,2.2],chimneys:true},
];
const components=new Map<string,ArchitectureComponent>();
export function isOverhaulArchitectureBlock(block:CityBlock|string):boolean{return(typeof block==='string'?block:block.id).startsWith(OVERHAUL_ARCHITECTURE_PREFIX);}
/** Compiled source metadata; caller must compile the district first. This
 * lookup has no lazy district import and cannot create a dependency cycle. */
export function getOverhaulArchitectureComponent(block:CityBlock|string):ArchitectureComponent|undefined{return components.get(typeof block==='string'?block:block.id);}
export interface OverhaulArchitecture {blocks:CityBlock[];structures:CityStructure[];components:ReadonlyMap<string,ArchitectureComponent>;faces:BuildingFace[];}
const epsilon=1e-7;
const sideNormal=(side:BuildingSide)=>({x:side==='east'?1:side==='west'?-1:0,y:0,z:side==='north'?1:side==='south'?-1:0});
const plane=(b:CityBlock,n:{x:number;z:number})=>b.position[0]*n.x+b.position[2]*n.z+Math.abs(n.x)*b.halfExtents[0]+Math.abs(n.z)*b.halfExtents[2];
const tangentBounds=(b:CityBlock,n:{x:number;z:number}):[number,number]=>{const center=-n.z*b.position[0]+n.x*b.position[2],half=Math.abs(n.z)*b.halfExtents[0]+Math.abs(n.x)*b.halfExtents[2];return[center-half,center+half];};

/** A descriptor owns only real wall/cap cells. The native five-point nearest
 * queries still reject holes, hidden/internal planes and retired cells. Each
 * roof candidate has ONE exact plate footprint, never a stepped union/AABB. */
export function overhaulArchitectureFaces(blocks:readonly CityBlock[]):BuildingFace[] {
  const owned=blocks.filter(isOverhaulArchitectureBlock),faces:BuildingFace[]=[];
  for(const roof of owned.filter(b=>b.part==='deck'||b.id.includes(':solid-tier-')||b.id.includes(':chimney-')))for(const side of ['west','east','south','north'] as const){
    const n=sideNormal(side),p=plane(roof,n),top=roof.position[1]+roof.halfExtents[1],rr=tangentBounds(roof,n);
    const candidates=owned.filter(b=>b.buildingId===roof.buildingId&&Math.abs(plane(b,n)-p)<epsilon&&b.position[1]-b.halfExtents[1]<top-epsilon);
    // Expand through connected real coplanar strips. Different-height panels
    // can share a query frame; missing/high regions never gain physical hits.
    let lo=rr[0],hi=rr[1],changed=true;const supporting=new Set<CityBlock>();
    while(changed){changed=false;for(const b of candidates){const r=tangentBounds(b,n);if(!supporting.has(b)&&r[0]<=hi+epsilon&&r[1]>=lo-epsilon){supporting.add(b);lo=Math.min(lo,r[0]);hi=Math.max(hi,r[1]);changed=true;}}}
    const cells=[...supporting].sort((a,b)=>a.id.localeCompare(b.id));
    const minY=Math.min(...cells.map(b=>b.position[1]-b.halfExtents[1]));
    // A thin plate side alone is not advertised as a climbable wall.
    if(!cells.some(b=>b.position[1]-b.halfExtents[1]<top-.15)||top-minY<.15)continue;
    const along=(lo+hi)/2,id=`${roof.id}:face:${side}`;
    faces.push({id,buildingId:roof.buildingId,kind:'city',side,
      origin:{x:n.x*p-n.z*along,y:minY,z:n.z*p+n.x*along},normal:n,tangent:{x:-n.z,y:0,z:n.x},
      width:hi-lo,height:top-minY,minY,topY:top,roofId:`${roof.id}:top`,supportingBlockIds:cells.map(b=>b.id),roofBlockIds:[roof.id],
      roofCenter:{x:roof.position[0],y:top,z:roof.position[2]},roofHalfExtents:{x:roof.halfExtents[0],z:roof.halfExtents[2]},yaw:roof.yaw});
  }
  return faces.sort((a,b)=>a.id.localeCompare(b.id));
}

/** Pure draft compiler; no renderer or physics. Original cells/banks/buildings
 * are read only. Every chamber consists of visible independent native solids. */
export function buildOverhaulArchitecture(district:CityDistrict):OverhaulArchitecture {
  const blocks:CityBlock[]=[],structures:CityStructure[]=[],local=new Map<string,ArchitectureComponent>();
  if(district.seed!==7734)return{blocks,structures,components:local,faces:[]};
  if(district.blocks.some(isOverhaulArchitectureBlock))throw Error('Architecture compiler must append once');
  for(const spec of OVERHAUL_ARCHITECTURE_SPECS){
    const parent=district.buildings.find(b=>b.id===`7734:overhaul:${spec.lot}`);
    if(!parent||Math.abs(parent.roof.center.y-spec.center[1])>epsilon)throw Error('Architecture roof datum mismatch '+spec.id);
    const [x,y,z]=spec.center,w=spec.width,d=spec.depth;
    if(parent.width/2-Math.abs(x-parent.position.x)-w/2<4.2-epsilon||parent.depth/2-Math.abs(z-parent.position.z)-d/2<4.2-epsilon)throw Error('Architecture invades perimeter '+spec.id);
    const original=district.structures.find(s=>s.id===parent.id+':roof-bank');
    if(!original||original.cells.length!==4)throw Error('Architecture needs four original roof quarters '+spec.id);
    const assemblyId=OVERHAUL_ARCHITECTURE_PREFIX+spec.id,bank:CityStructure={id:assemblyId+':bank',buildingId:assemblyId,maxHp:150,cells:[]};structures.push(bank);
    const originalSupport:NonNullable<CityBlock['support']>={structureId:original.id,cells:[0,1,2,3],minIntact:4};
    const add=(name:string,module:'wall'|'deck',center:[number,number,number],size:[number,number,number],depends:CityBlock['support']|string[],kind:ArchitectureComponent['kind'])=>{
      if(bank.cells.length>=32)throw Error('Architecture bank exceeds mask '+bank.id);
      const support=Array.isArray(depends)?{structureId:bank.id,cells:depends.map(name=>{const owner=bank.cells.find(b=>b.id===assemblyId+':'+name);if(!owner)throw Error('Unknown architecture support '+name);return owner.cellId!;}),minIntact:depends.length}:depends;
      const b:CityBlock={id:assemblyId+':'+name,buildingId:assemblyId,part:module==='deck'?'deck':'wall',position:center,halfExtents:[size[0]/2,size[1]/2,size[2]/2],yaw:0,material:spec.family==='control'?'concrete':'steel',structureId:bank.id,cellId:bank.cells.length,support};
      bank.cells.push(b);blocks.push(b);local.set(b.id,{module:spec.family+'_'+module,family:spec.family,assemblyId,name,kind,wallFaceIds:[],roofFaceIds:[]});
    };
    if(spec.solidTiers){let bottom=y;for(const [i,[tw,td,h]] of spec.solidTiers.entries()){add('solid-tier-'+i,'wall',[x,bottom+h/2,z],[tw,h,td],i===0?originalSupport:['solid-tier-'+(i-1)],'solid-marker');bottom+=h;}}
    else{
      add('pad','deck',[x,y+.06,z],[w,.12,d],originalSupport,'slab');const bottom=y+.12,steps=spec.steps!,sw=w/steps.length;
      for(const [i,top] of steps.entries()){
        const cx=x-w/2+(i+.5)*sw,h=top-.24;
        for(const [side,sign] of [['north',-1],['south',1]] as const)add(side+'-'+i,'wall',[cx,bottom+h/2,z+sign*(d/2-.06)],[sw,h,.12],['pad'],'wall');
        add('cap-'+i,'deck',[cx,y+top-.06,z],[sw,.12,d],['north-'+i,'south-'+i],'slab');
      }
      for(const [side,sign,i] of [['west',-1,0],['east',1,steps.length-1]] as const){const h=steps[i]-.24;add(side,'wall',[x+sign*(w/2-.06),bottom+h/2,z],[.12,h,d-.24],['pad'],'wall');}
      for(let i=0;i<steps.length-1;i++){const h=Math.max(steps[i],steps[i+1])-.24;add('step-riser-'+i,'wall',[x-w/2+(i+1)*sw,bottom+h/2,z],[.12,h,d-.24],['pad'],'wall');}
      if(spec.chimneys)for(const [i,dx] of [.35,1.15].entries())add('chimney-'+i,'wall',[x+dx,y+steps.at(-1)!+.25,z+.6],[.3,.5,.3],['cap-'+(steps.length-1)],'solid-marker');
    }
  }
  if(blocks.length!==39||blocks.length>48||district.blocks.length+blocks.length>1132)throw Error('Architecture cell budget mismatch');
  // The solid control crown has actual top surfaces, though too narrow for
  // either complete mech hull. Keep its source part kind, register tops below.
  const faces=overhaulArchitectureFaces(blocks);
  for(const f of faces){for(const id of f.supportingBlockIds)local.get(id)!.wallFaceIds.push(f.id);for(const id of f.roofBlockIds)local.get(id)!.roofFaceIds.push(f.id);}
  for(const [id,c] of local)components.set(id,c);
  return{blocks,structures,components:local,faces};
}
