import type {CityBlock,CityBuilding,CityDistrict,CityStructure} from './cityDistrict';
import type {OverhaulComponent,OverhaulComponentKind,OverhaulSide} from './overhaulDistrict';
import type {Vec3} from './types';

export const RAINLINE_EXTRACTION039_PREFIX='7734:overhaul:extraction039:';
export const RAINLINE_EXTRACTION039_SPECS=[
  {id:'freight-hall',x:-28,z:-112,width:20,depth:10,height:6,usage:'works',front:'east'},
  {id:'switching-house',x:28,z:-112,width:20,depth:10,height:4.8,usage:'utility',front:'west'},
  {id:'pump-house',x:-50,z:-112,width:12,depth:10,height:5.4,usage:'transit',front:'east'},
] as const;
export function isRainlineExtraction039Block(block:CityBlock|string):boolean{return(typeof block==='string'?block:block.id).startsWith(RAINLINE_EXTRACTION039_PREFIX);}
export interface RainlineExtraction039 {blocks:CityBlock[];buildings:CityBuilding[];structures:CityStructure[];approaches:Vec3[][];components:ReadonlyMap<string,OverhaulComponent>;}

/** Append to the FULL legacy compiler result. Native solids, roof navigation,
 * support ancestry and artist transforms share these same metre coordinates.
 * Never insert these lots into the original parcel/dressing admission order. */
export function buildRainlineExtraction039(district:CityDistrict):RainlineExtraction039 {
  const blocks:CityBlock[]=[],buildings:CityBuilding[]=[],structures:CityStructure[]=[],components=new Map<string,OverhaulComponent>();
  if(district.seed!==7734)return {blocks,buildings,structures,approaches:[],components};
  if(district.blocks.some(isRainlineExtraction039Block))throw Error('Extraction039 must append once after legacy compilation');
  const floor=district.grading.height,point=(x:number,z:number,y=floor):Vec3=>({x,y,z});
  const bank=(id:string,suffix:string,maxHp:number)=>{const b:CityStructure={id:id+':'+suffix,buildingId:id,maxHp,cells:[]};structures.push(b);return b;};
  const condition=(owner:CityStructure,cells:number[],minIntact=1):NonNullable<CityBlock['support']>=>({structureId:owner.id,cells,minIntact});
  const cell=(owner:CityStructure,name:string,kind:OverhaulComponentKind,position:CityBlock['position'],halfExtents:CityBlock['halfExtents'],usage:CityBuilding['style'],material:CityBlock['material'],support?:CityBlock['support'],side?:OverhaulSide)=>{
    if(owner.cells.length>=32)throw Error('Extraction039 bank exceeds wire mask '+owner.id);
    const block:CityBlock={id:owner.buildingId+':'+name,buildingId:owner.buildingId,part:kind==='foundation'?'foundation':kind==='slab'?'deck':'cell',position,halfExtents,yaw:0,material,structureId:owner.id,cellId:owner.cells.length,...(support?{support}:{})};
    owner.cells.push(block);blocks.push(block);components.set(block.id,{kind,usage,maxHp:owner.maxHp,loadBearing:kind!=='facade',...(side?{side}:{})});return block;
  };
  for(const spec of RAINLINE_EXTRACTION039_SPECS){
    const {x,z,width,depth,height,usage,front}=spec,id=RAINLINE_EXTRACTION039_PREFIX+spec.id;
    const foundations=bank(id,'foundation-bank',320),frame=bank(id,'frame-bank',150),beams=bank(id,'beam-bank',160),slabs=bank(id,'roof-bank',170),facades=bank(id,'facade-bank',85);
    cell(foundations,'foundation','foundation',[x,floor-.2,z],[width/2,.2,depth/2],usage,'concrete');
    // Six metres of flush loading apron: no curb crosses the mission spine.
    const frontSign=front==='east'?1:-1;
    cell(foundations,'forecourt','foundation',[x+frontSign*(width/2+3),floor-.2,z],[3,.2,depth/2],usage,'concrete',condition(foundations,[0]));
    for(let sector=0;sector<4;sector++){
      const sx=sector%2?1:-1,sz=sector>=2?1:-1,cx=x+sx*width/4,cz=z+sz*depth/4,beamIds:number[]=[];
      // Two real bearing lines per slab; each line has two separated posts.
      // One lost post can cantilever locally; loss of an entire line releases
      // its beam, slab and attached facade without retiring adjacent sectors.
      for(let line=0;line<2;line++){
        const bz=cz+(line?1:-1)*(depth/4-.65),postIds:number[]=[];
        for(let end=0;end<2;end++)postIds.push(cell(frame,`column-${sector}-${line}-${end}`,'column',[cx+(end?1:-1)*(width/4-.65),floor+(height-.4)/2,bz],[.3,(height-.4)/2,.3],usage,'steel',condition(foundations,[0])).cellId!);
        beamIds.push(cell(beams,`beam-${sector}-${line}`,'beam',[cx,floor+height-.55,bz],[width/4-.35,.15,.3],usage,'steel',condition(frame,postIds)).cellId!);
      }
      cell(slabs,`roof-${sector}`,'slab',[cx,floor+height-.2,cz],[width/4,.2,depth/4],usage,'steel',condition(beams,beamIds,2));
    }
    const anchors:CityBuilding['anchors']=[];
    for(const [side,nx,nz] of [['west',-1,0],['east',1,0],['north',0,-1],['south',0,1]] as const){
      const faceX=x+nx*width/2,faceZ=z+nz*depth/2,length=nx?depth:width,anchorId=id+':grip-'+side;
      // Front anchor lies on the surviving wall beside the loading opening;
      // every other actual facade location remains available to native claws.
      const anchorZ=side===front?z+depth/4:faceZ;
      const anchor:CityBuilding['anchor']={id:anchorId,propId:id,position:point(faceX,anchorZ),normal:{x:nx,y:0,z:nz},width:length,height,landing:point(faceX-nx*2,anchorZ-nz*2,floor+height),approach:point(faceX+nx*3,anchorZ+nz*3)};
      anchors.push(anchor);
      for(let bay=0;bay<2;bay++)for(let row=0;row<2;row++){
        if(side===front&&bay===0&&row===0)continue;
        const along=(bay?1:-1)*length/4,sx=nx||(bay?1:-1),sz=nz||(bay?1:-1),sector=(sx>0?1:0)+(sz>0?2:0);
        const bottom=side===front&&bay===0?4:row*(height-.4)/2,top=side===front&&bay===0?height-.4:(row+1)*(height-.4)/2;
        const panel=cell(facades,`facade-${side}-${row}-${bay}`,'facade',[faceX-nx*.2+(nz?along:0),floor+(bottom+top)/2,faceZ-nz*.2+(nx?along:0)],[nx?.2:length/4,(top-bottom)/2,nz?.2:length/4],usage,usage==='works'?'brick':'steel',condition(slabs,[sector]),side);
        panel.anchorId=anchorId;
      }
    }
    for(let sector=0;sector<4;sector++)slabs.cells[sector].anchorIds=[anchors[sector%2?1:0].id,anchors[sector>=2?3:2].id];
    const anchor=anchors.find(a=>a.id===id+':grip-'+front)!;
    const roof:CityBuilding['roof']={id:id+':roof',anchorIds:anchors.map(a=>a.id),center:point(x,z,floor+height),halfExtents:{x:width/2,z:depth/2},patrol:[point(x-width/4,z-depth/4,floor+height),point(x+width/4,z-depth/4,floor+height),point(x+width/4,z+depth/4,floor+height),point(x-width/4,z+depth/4,floor+height)],exit:{...anchor.landing},outside:{...anchor.approach}};
    buildings.push({id,position:point(x,z),width,depth,height,yaw:0,fixtures:[],facade:'panel-bank',style:usage,anchor,anchors,roof});
  }
  return {blocks,buildings,structures,approaches:buildings.flatMap(b=>b.anchors.map(a=>[{...a.approach},{...a.position}])),components};
}
