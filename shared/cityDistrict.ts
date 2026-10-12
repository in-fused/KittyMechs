import type {EnemyRole,StructureState,Vec3} from './types';
import {buildOverhaulDistrict} from './overhaulDistrict';

/** Pure authored meter-scale contract. No renderer, physics or terrain imports. */
export interface CityBlock {
  id:string;buildingId:string;part:'wall'|'deck'|'foundation'|'cell'|'fixture';
  position:[number,number,number];halfExtents:[number,number,number];yaw:number;
  material:'brick'|'steel'|'concrete';anchorId?:string;anchorIds?:string[];support?:{structureId:string;cells:number[];minIntact:number;also?:{structureId:string;cells:number[];minIntact:number}[]};structureId?:string;cellId?:number;
}
export interface CityBuilding {
  id:string;position:Vec3;width:number;depth:number;height:number;yaw:number;
  fixtures:{id:string;kind:'coolant';position:Vec3;scale:number;size:Vec3}[];
  facade:'brick-loading'|'brick-window'|'panel-bank';style:'works'|'utility'|'residential'|'transit'|'civic';
  anchor:{id:string;propId:string;position:Vec3;normal:Vec3;width:number;height:number;landing:Vec3;approach:Vec3};
  anchors:CityBuilding['anchor'][];
  roof:{id:string;anchorIds?:string[];center:Vec3;halfExtents:{x:number;z:number};patrol:Vec3[];exit:Vec3;outside:Vec3};
}
export interface CityStreet {id:string;center:Vec3;yaw:number;halfExtents:{x:number;z:number};points:Vec3[];width:number;}
export interface CityStructure {id:string;buildingId:string;maxHp:number;cells:CityBlock[];}
export interface CityDistrict {
  id:string;seed:number;buildings:CityBuilding[];blocks:CityBlock[];streets:CityStreet[];approaches:Vec3[][];
  grading:{minX:number;maxX:number;minZ:number;maxZ:number;height:number};
  structures:CityStructure[];npcs:{id:string;role:EnemyRole;position:Vec3;roofId?:string;patrol:Vec3[]}[];
}
const floor=-.08;
const p=(x:number,z:number,y=floor):Vec3=>({x,y,z});
const cache=new Map<number,CityDistrict>();
export function cityDistrict(seed:number):CityDistrict|null {
  const overhaul=buildOverhaulDistrict(seed);if(overhaul)return overhaul;
  if(seed!==7734)return null;
  const prior=cache.get(seed);if(prior)return prior;
  const blocks:CityBlock[]=[],buildings:CityBuilding[]=[],structures:CityStructure[]=[],streets:CityStreet[]=[];
  const street=(id:string,a:Vec3,b:Vec3,width:number)=>{
    const dx=b.x-a.x,dz=b.z-a.z;
    streets.push({id,center:p((a.x+b.x)/2,(a.z+b.z)/2),yaw:Math.atan2(dx,dz),halfExtents:{x:width/2,z:Math.hypot(dx,dz)/2},points:[a,b],width});
  };
  street('city-connector',p(58,-30),p(130,-30),8);
  street('city-avenue',p(130,-30),p(130,121),10);
  for(const z of [1,31,61,91,121])street(`city-cross-${z}`,p(86,z),p(174,z),6);
  for(const x of [86,174])street(`city-service-${x}`,p(x,1),p(x,121),6);
  for(let row=0;row<4;row++)for(let column=0;column<2;column++) {
    const index=row*2+column,id=`7734:city:building-${index}`,x=column?156:104,z=16+row*30,height=index%3===1?11:8;
    const normal={x:column?1:-1,y:0,z:0},face=x+normal.x*10,anchorId=`${id}:grip`;
    const anchor={id:anchorId,propId:id,position:p(face,z),normal,width:12,height,landing:p(x+normal.x*4,z,floor+height),approach:p(face+normal.x*2.5,z)};
    const roof:CityBuilding['roof']={id:`${id}:roof`,center:p(x,z,floor+height),halfExtents:{x:10,z:9},patrol:[p(x-5,z-4,floor+height),p(x+5,z-4,floor+height),p(x+5,z+4,floor+height),p(x-5,z+4,floor+height)],exit:p(face+normal.x*2.5,z,floor+height),outside:p(face+normal.x*2.5,z)};
    const breakable=index===0||index===6;
    buildings.push({id,position:p(x,z),width:20,depth:18,height,yaw:0,fixtures:[],anchors:[anchor],facade:breakable?'panel-bank':index%2?'brick-window':'brick-loading',style:index%3?'works':'utility',anchor,roof});
    const box=(part:CityBlock['part'],name:string,bx:number,by:number,bz:number,hx:number,hy:number,hz:number,material:CityBlock['material'],grip=false):CityBlock=>{
      const block:CityBlock={id:`${id}:${name}`,buildingId:id,part,position:[bx,by,bz],halfExtents:[hx,hy,hz],yaw:0,material,...(grip?{anchorId}: {})};blocks.push(block);return block;
    };
    box('foundation','floor',x,floor-.15,z,10,.15,9,'concrete');
    if(index!==0)box('deck','roof',x,floor+height-.15,z,10,.15,9,'steel',true);
    else {
      const structureId=`${id}:supports`,cells:CityBlock[]=[];
      for(const sx of [95.5,102.5])for(const sz of [11.5,13,19,20.5]) {
        const cell=box('cell',`support-${cells.length}`,sx,floor+(height-.3)/2,sz,.25,(height-.3)/2,.25,'steel');
        cell.structureId=structureId;cell.cellId=cells.length;cells.push(cell);
      }
      structures.push({id:structureId,buildingId:id,maxHp:85,cells});
      const sector=box('deck','dependent-roof',99,floor+height-.15,16,5,.15,5,'steel',true);
      sector.support={structureId,cells:cells.map(c=>c.cellId!),minIntact:4};
      box('deck','east-roof',109,floor+height-.15,16,5,.15,9,'steel',true);
      for(const sz of [9,23])box('deck',`roof-frame-${sz}`,99,floor+height-.15,sz,5,.15,2,'steel',true);
      const secondary={id:`${id}:return-grip`,propId:id,position:p(109,7),normal:{x:0,y:0,z:-1},width:8,height,landing:p(109,11,floor+height),approach:p(109,4.5)};
      buildings[buildings.length-1].anchors.push(secondary);roof.anchorIds=[anchor.id,secondary.id];
      for(const b of blocks.filter(b=>b.buildingId===id&&b.part==='deck'))b.anchorIds=[anchor.id,secondary.id];
    }
    // Every interior is real, supported space. No whole-workshop proxy remains.
    box('wall','back',face-normal.x*.15,floor+(height-.3)/2,z,.15,(height-.3)/2,9,'brick',true);
    for(const side of [-1,1]){const wall=box('wall',`side-${side}`,x,floor+(height-.3)/2,z+side*8.85,9.7,(height-.3)/2,.15,'brick');if(index===0&&side===-1)wall.anchorId=`${id}:return-grip`;}
    if(index===3){
      const size={x:5,y:1.05533,z:1.54988},position=p(x,z+4,floor+height);
      const fixture=box('fixture','coolant',x,position.y+size.y/2,z+4,size.x/2,size.y/2,size.z/2,'steel');
      buildings[buildings.length-1].fixtures.push({id:fixture.id,kind:'coolant',position,scale:.5,size});
    }
    const front=x-normal.x*10;
    if(!breakable)box('wall','front',front+normal.x*.15,floor+(height-.3)/2,z,.15,(height-.3)/2,9,'brick');
    else {
      const structureId=`${id}:facade`,cells:CityBlock[]=[];
      for(let r=0;r<4;r++)for(let c=0;c<8;c++) {
        const cell=box('cell',`panel-${r*8+c}`,front+normal.x*.15,floor+(r+.5)*(height-.3)/4,z-9+(c+.5)*2.25,.15,(height-.3)/8,1.125,'brick');
        cell.structureId=structureId;cell.cellId=r*8+c;cells.push(cell);
      }
      structures.push({id:structureId,buildingId:id,maxHp:65,cells});
    }
  }
  structures.sort((a,b)=>Number(a.id.endsWith(':supports'))-Number(b.id.endsWith(':supports'))||a.id.localeCompare(b.id));
  // Four new neighborhoods use the same surveyed solids as collision, damage,
  // claws and roof navigation. Each bank stays below the 32-bit wire limit.
  street('city-east-link',p(130,-30),p(355,-30),8);
  street('city-north-link',p(86,151),p(355,151),8);
  street('city-west-return',p(86,121),p(86,151),6);
  for(const x of [188,229,271,313,355])street(`city-east-service-${x}`,p(x,-30),p(x,151),8);
  for(const z of [1,31,61,91,121])street(`city-east-cross-${z}`,p(174,z),p(355,z),8);
  const styles=['residential','transit','civic','works'] as const;
  for(let column=0;column<4;column++)for(let row=0;row<5;row++){
    const index=column*5+row,id=`7734:city:extension-${index}`,x=208+column*42,z=16+row*30;
    const style=styles[column],height=[11,8,14,17][column]+(row%2?0:1),width=20,depth=18;
    const box=(part:CityBlock['part'],name:string,bx:number,by:number,bz:number,hx:number,hy:number,hz:number,material:CityBlock['material']):CityBlock=>{
      const block:CityBlock={id:`${id}:${name}`,buildingId:id,part,position:[bx,by,bz],halfExtents:[hx,hy,hz],yaw:0,material};blocks.push(block);return block;
    };
    const anchors:CityBuilding['anchors']=[];
    for(const [name,nx,nz] of [['west',-1,0],['east',1,0],['south',0,-1],['north',0,1]] as const){
      const normal={x:nx,y:0,z:nz},position=p(x+nx*width/2,z+nz*depth/2),anchorId=`${id}:grip-${name}`;
      anchors.push({id:anchorId,propId:id,position,normal,width:nx?12:14,height,landing:p(x+nx*4,z+nz*3,floor+height),approach:p(position.x+nx*3,position.z+nz*3)});
      const structureId=`${id}:facade-${name}`,cells:CityBlock[]=[];
      const length=nx?depth:width;
      for(let r=0;r<2;r++)for(let c=0;c<4;c++){
        const along=-length/2+(c+.5)*length/4;
        const block=box('cell',`panel-${name}-${r*4+c}`,position.x-nx*.15+(nz?along:0),floor+(r+.5)*(height-.3)/2,position.z-nz*.15+(nx?along:0),nx?.15:length/8,(height-.3)/4,nz?.15:length/8,style==='transit'?'steel':style==='civic'?'concrete':'brick');
        block.structureId=structureId;block.cellId=r*4+c;block.anchorId=anchorId;cells.push(block);
      }
      structures.push({id:structureId,buildingId:id,maxHp:style==='works'?90:75,cells});
    }
    box('foundation','floor',x,floor-.15,z,width/2,.15,depth/2,'concrete');
    const supportId=`${id}:supports`,supports:CityBlock[]=[];
    for(const sx of [-1,1])for(const sz of [-1,1])for(const offset of [-.8,.8]){
      const block=box('cell',`support-${supports.length}`,x+sx*6+offset,floor+(height-.3)/2,z+sz*5,.25,(height-.3)/2,.25,'steel');
      block.structureId=supportId;block.cellId=supports.length;supports.push(block);
    }
    structures.push({id:supportId,buildingId:id,maxHp:120,cells:supports});
    const roofId=`${id}:roof-cells`,decks:CityBlock[]=[];
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const block=box('deck',`roof-sector-${decks.length}`,x+sx*width/4,floor+height-.15,z+sz*depth/4,width/4,.15,depth/4,'steel'),supportCells=supports.filter(s=>Math.sign(s.position[0]-x)===sx&&Math.sign(s.position[2]-z)===sz).map(s=>s.cellId!);
      block.anchorIds=anchors.map(a=>a.id);block.structureId=roofId;block.cellId=decks.length;block.support={structureId:supportId,cells:supportCells,minIntact:1};decks.push(block);
    }
    structures.push({id:roofId,buildingId:id,maxHp:160,cells:decks});
    const roof:CityBuilding['roof']={id:`${id}:roof`,anchorIds:anchors.map(a=>a.id),center:p(x,z,floor+height),halfExtents:{x:width/2,z:depth/2},patrol:[p(x-3,z-3,floor+height),p(x+3,z-3,floor+height),p(x+3,z+3,floor+height),p(x-3,z+3,floor+height)],exit:p(x-13,z,floor+height),outside:p(x-13,z)};
    buildings.push({id,position:p(x,z),width,depth,height,yaw:0,fixtures:[],anchors,anchor:anchors[0],roof,facade:'panel-bank',style});
  }
  const transit=buildings.find(b=>b.id.endsWith(':extension-7'))!,terminalRoof=blocks.find(b=>b.buildingId===transit.id&&b.part==='deck'&&b.cellId===0)!;
  const terminalX=transit.position.x-3,terminalZ=transit.position.z-3,terminalY=transit.roof.center.y;
  for(const [name,dx,dy,dz,hx,hy,hz] of [['mast',0,2.1,0,.12,2.1,.12],['antenna',0,4.2,0,1.2,.09,.16],['console',0,1.7,.35,.65,.35,.22]] as const){
    blocks.push({id:`${transit.id}:grid-${name}`,buildingId:transit.id,part:'wall',position:[terminalX+dx,terminalY+dy,terminalZ+dz],halfExtents:[hx,hy,hz],yaw:0,material:'steel',support:{...terminalRoof.support!,also:[{structureId:terminalRoof.structureId!,cells:[terminalRoof.cellId!],minIntact:1}]}});
  }
  const approaches=buildings.flatMap(b=>b.anchors.map(a=>Math.abs(a.normal.z)>.5?[p(a.position.x,b.position.z-15),{...a.approach}]:[p(a.approach.x<130?86:a.approach.x<188?174:a.approach.x,1),p(a.approach.x,b.position.z),{...a.approach}]));
  const guards=[buildings[0],buildings[5]].map((b,i)=>({id:`city-guardian-${i}`,role:'anchor' as const,position:i===0?p(99,16,b.roof.center.y):p(b.position.x,b.position.z-4,b.roof.center.y),roofId:b.roof.id,patrol:b.roof.patrol}));
  const district:CityDistrict={id:'7734:works-district',seed,buildings,blocks,structures,streets,approaches,grading:{minX:80,maxX:362,minZ:-36,maxZ:158,height:floor},npcs:[...guards,{id:'city-scout',role:'scout',position:p(130,55),patrol:[p(130,31),p(130,61),p(130,91),p(130,121)]},{id:'city-grid-guardian',role:'anchor',position:p(transit.position.x+3,transit.position.z+3,transit.roof.center.y),roofId:transit.roof.id,patrol:transit.roof.patrol},{id:'city-grid-scout',role:'scout',position:p(229,61),patrol:[p(229,61),p(271,61),p(271,91),p(229,91)]},{id:'city-grid-mortar',role:'mortar',position:p(313,151),patrol:[p(313,151),p(355,151),p(355,121),p(313,121)]}]};
  cache.set(seed,district);return district;
}
export function cityBlocks(seed:number):CityBlock[]{return cityDistrict(seed)?.blocks??[];}
export function cityBlockActive(block:CityBlock,states:readonly StructureState[]):boolean {
  if(block.support)for(const condition of [block.support,...(block.support.also??[])]){const state=states.find(s=>s.id===condition.structureId);if(state&&condition.cells.filter(i=>state.hp[i]>0).length<condition.minIntact)return false;}
  if(block.structureId===undefined||block.cellId===undefined)return true;
  const state=states.find(s=>s.id===block.structureId);return !state||((state.brokenMask>>>block.cellId)&1)===0;
}
/** Reserve full foundations/aprons and streets before seeded decoration emits. */
export function cityReserved(seed:number,x:number,z:number,radius=0):boolean {
  const district=cityDistrict(seed);if(!district)return false;
  if(district.buildings.some(b=>{const dx=x-b.position.x,dz=z-b.position.z,c=Math.cos(b.yaw),s=Math.sin(b.yaw);return Math.abs(dx*c-dz*s)<b.width/2+4+radius&&Math.abs(dx*s+dz*c)<b.depth/2+2+radius;}))return true;
  return district.streets.some(s=>{
    const dx=x-s.center.x,dz=z-s.center.z,c=Math.cos(s.yaw),n=Math.sin(s.yaw);
    return Math.abs(dx*c-dz*n)<s.halfExtents.x+2+radius&&Math.abs(dx*n+dz*c)<s.halfExtents.z+radius;
  });
}
