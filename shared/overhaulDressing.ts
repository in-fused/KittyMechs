import type {CityBlock,CityDistrict,CityStructure} from './cityDistrict';

export type DressingModule='plinth'|'post'|'pipe'|'vehicle_chassis'|'vehicle_cab'|'vehicle_cargo'|'tire'|'transformer'|'insulator'|'duct'|'canopy'|'bench'|'sign'|'roof_vent'|'tank'|'service_unit'|'power_unit'|'ticket_panel'|'roof_machine';
export interface DressingComponent {module:DressingModule;kind:'fixture'|'beam'|'column';usage:'works'|'utility'|'civic'|'transit';maxHp:number;loadBearing:boolean;}
export interface DressingYard {id:string;kind:'works'|'utility'|'civic';purpose:string;bounds:{minX:number;maxX:number;minZ:number;maxZ:number};}
export interface OverhaulDressing {blocks:CityBlock[];structures:CityStructure[];components:ReadonlyMap<string,DressingComponent>;yards:DressingYard[];}
export const OVERHAUL_DRESSING_PREFIX='7734:overhaul:dressing:';
export function isOverhaulDressingBlock(block:CityBlock|string):boolean{return (typeof block==='string'?block:block.id).startsWith(OVERHAUL_DRESSING_PREFIX);}
/** A deterministic, source-owned collection of exact native cuboids. Caller
 * appends returned blocks/banks to its draft before publishing the compiler. */
export function buildOverhaulDressing(district:CityDistrict):OverhaulDressing {
 const blocks:CityBlock[]=[],structures:CityStructure[]=[],components=new Map<string,DressingComponent>(),yards:DressingYard[]=[];
 if(district.seed!==7734)return {blocks,structures,components,yards};
 const floor=district.grading.height;
 const bank=(id:string,hp=100)=>{const s:CityStructure={id:OVERHAUL_DRESSING_PREFIX+id+':bank',buildingId:OVERHAUL_DRESSING_PREFIX+id,maxHp:hp,cells:[]};structures.push(s);return s;};
 const condition=(s:CityStructure,cells:number[]):NonNullable<CityBlock['support']>=>({structureId:s.id,cells,minIntact:cells.length});
 const add=(s:CityStructure,name:string,module:DressingModule,center:[number,number,number],size:[number,number,number],usage:DressingComponent['usage'],support?:CityBlock['support'],kind:DressingComponent['kind']='fixture')=>{
  if(s.cells.length>=32)throw Error('Dressing bank exceeds native mask '+s.id);
  const b:CityBlock={id:s.buildingId+':'+name,buildingId:s.buildingId,part:'cell',position:center,halfExtents:[size[0]/2,size[1]/2,size[2]/2],yaw:0,material:module==='plinth'||module==='bench'?'concrete':'steel',structureId:s.id,cellId:s.cells.length,...(support?{support}:{})};s.cells.push(b);blocks.push(b);components.set(b.id,{module,kind,usage,maxHp:s.maxHp,loadBearing:kind!=='fixture'});return b;
 };
 // Works: opposing pipe rack and parked maintenance crawler in the open
 // inter-parcel yard; central north/south facade approaches remain empty.
 yards.push({id:'works-yard',kind:'works',purpose:'West warehouse service pipes and a parked maintenance crawler',bounds:{minX:-62.0,maxX:-47.6,minZ:25.4,maxZ:33.2}});
 const pipes=bank('works-pipes',130),vehicle=bank('works-crawler',110);
 for(const z of [26.1,32.1]){
  const f=add(pipes,'foot-'+z,'plinth',[-60.7,floor+.12,z],[1.8,.24,1.4],'works');
  add(pipes,'stanchion-'+z,'post',[-60.7,floor+1.4,z],[.34,2.56,.34],'works',condition(pipes,[f.cellId!]),'column');
 }
 for(const [i,x] of [-61.2,-60.65,-60.1].entries())add(pipes,'pipe-'+i,'pipe',[x,floor+2.5,29.1],[.32,.32,6.3],'works',condition(pipes,[1,3]),'beam');
 add(pipes,'valve-cabinet','duct',[-61.1,floor+.7,29.1],[1.2,1.4,.75],'works');
 const vx=-49.0,vz=29.0;
 const wheels=[] as number[];
 for(const [index,dx,dz] of [[0,-1.1,-1.6],[1,1.1,-1.6],[2,-1.1,1.6],[3,1.1,1.6]])wheels.push(add(vehicle,'tire-'+index,'tire',[vx+dx,floor+.38,vz+dz],[.48,.76,.95],'works').cellId!);
 const chassis=add(vehicle,'chassis','vehicle_chassis',[vx,floor+.65,vz],[2.5,.50,4.8],'works',condition(vehicle,wheels));
 add(vehicle,'cab','vehicle_cab',[vx,floor+1.70,vz+1.30],[2.2,1.6,1.55],'works',condition(vehicle,[chassis.cellId!]));
 add(vehicle,'tool-bed','vehicle_cargo',[vx,floor+1.27,vz-.85],[2.25,.75,2.6],'works',condition(vehicle,[chassis.cellId!]));
 // Utility: tucked against the far side of the east service-yard frontage,
 // with transformer rows and a duct manifold visibly separate from shops.
 yards.push({id:'utility-yard',kind:'utility',purpose:'Transformer service yard at east workshop/warehouse gap',bounds:{minX:56.2,maxX:62.2,minZ:-3.4,maxZ:3.4}});
 const utility=bank('utility-bank',125);
 const pad=add(utility,'pad','plinth',[59.2,floor+.10,0],[6,.20,6.8],'utility');
 const uSupport=condition(utility,[pad.cellId!]);
 for(const [i,z] of [-2.0,2.0].entries()){
  const body=add(utility,'transformer-'+i,'transformer',[58.0,floor+1.30,z],[2.2,2.4,1.6],'utility',uSupport);
  for(const [j,x] of [57.4,58.0,58.6].entries())add(utility,'insulator-'+i+'-'+j,'insulator',[x,floor+2.95,z],[.28,.9,.28],'utility',condition(utility,[body.cellId!]));
 }
 const ductFoot=add(utility,'duct-base','plinth',[61.0,floor+.27,0],[1.6,.34,4.6],'utility',uSupport);
 add(utility,'duct-manifold','duct',[61.0,floor+1.37,0],[1.3,1.86,4.4],'utility',condition(utility,[ductFoot.cellId!]));
 const warningPost=add(utility,'warning-post','post',[59.5,floor+.775,-3.2],[.10,1.15,.10],'utility',uSupport,'column');
 add(utility,'warning','sign',[59.5,floor+1.75,-3.2],[1.4,.8,.12],'utility',condition(utility,[warningPost.cellId!]));
 // Civic/transit: a proper open shelter, separate owned post/roof solids,
 // bench and display boards. The waiting-space volume has no hidden wall.
 yards.push({id:'civic-plaza',kind:'civic',purpose:'Rear-east transit waiting plaza off the east service road',bounds:{minX:27.3,maxX:32.7,minZ:54.4,maxZ:61.6}});
 const shelter=bank('civic-shelter',110),seat=bank('civic-seating',80);
 const plaza=add(shelter,'plaza','plinth',[30,floor+.08,58],[5.4,.16,7.2],'civic');
 const posts=[] as number[];
 for(const [i,x,z] of [[0,28.0,55.3],[1,32.0,55.3],[2,28.0,60.7],[3,32.0,60.7]])posts.push(add(shelter,'post-'+i,'post',[x,floor+1.60,z],[.20,3.04,.20],'transit',condition(shelter,[plaza.cellId!]),'column').cellId!);
 const roof=add(shelter,'canopy','canopy',[30,floor+3.25,58],[5.2,.26,6.8],'transit',condition(shelter,posts),'beam');
 add(shelter,'route-board','sign',[30,floor+2.745,60.8],[2.6,.75,.12],'transit',condition(shelter,[roof.cellId!]));
 for(const [i,z] of [56.4,59.7].entries()){
  const leg1=add(seat,'bench-'+i+'-leg0','post',[28.8,floor+.35,z],[.18,.54,.55],'civic',{structureId:shelter.id,cells:[plaza.cellId!],minIntact:1},'column');
  const leg2=add(seat,'bench-'+i+'-leg1','post',[31.2,floor+.35,z],[.18,.54,.55],'civic',{structureId:shelter.id,cells:[plaza.cellId!],minIntact:1},'column');
  const bench=add(seat,'bench-'+i+'-seat','bench',[30,floor+.72,z],[3.0,.20,.62],'civic',condition(seat,[leg1.cellId!,leg2.cellId!]),'beam');
  add(seat,'bench-'+i+'-back','bench',[30,floor+1.12,z+.27],[3.0,.6,.10],'civic',condition(seat,[bench.cellId!]));
 }
 // Roof assemblies sit fully inside quadrant3 interiors, clear of perimeter
 // landings/patrols and both authored objective hardware roofs.
 for(const [lot,module] of [['spawn-west','roof_vent'],['spawn-east','tank'],['rear-west','roof_vent'],['rear-east','tank']] as const){
  const b=district.buildings.find(b=>b.id==='7734:overhaul:'+lot);if(!b)throw Error('Roof dressing owner absent '+lot);
  const roof=district.blocks.find(block=>block.id===b.id+':roof-3');if(!roof?.structureId||roof.cellId===undefined)throw Error('Roof dressing native support absent '+lot);
  const owner=bank('roof-'+lot,100),x=b.position.x+2.5,z=b.position.z+2.5,y=b.roof.center.y;
  const base=add(owner,'apparatus-pad','plinth',[x,y+.12,z],[2.8,.24,2.8],module==='tank'?'utility':'works',{structureId:roof.structureId,cells:[roof.cellId],minIntact:1});
  const body=add(owner,'apparatus',module,[x,y+1.25,z],[2.25,2.02,2.25],module==='tank'?'utility':'works',condition(owner,[base.cellId!]));
  add(owner,'exhaust','pipe',[x+.65,y+2.45,z],[.38,.38,1.6],module==='tank'?'utility':'works',condition(owner,[body.cellId!]),'beam');
 }
 // Density candidate: real individually supported components at visible route
 // margins, never a whole-assembly collider. Existing v1 identities stay stable.
 const crawler=(id:string,x:number,z:number)=>{
  const s=bank(id,110),wheels:number[]=[];
  for(const [i,dx,dz] of [[0,-1.1,-1.6],[1,1.1,-1.6],[2,-1.1,1.6],[3,1.1,1.6]])wheels.push(add(s,'wheel-'+i,'tire',[x+dx,floor+.38,z+dz],[.48,.76,.95],'works').cellId!);
  const body=add(s,'chassis','vehicle_chassis',[x,floor+.65,z],[2.5,.5,4.8],'works',condition(s,wheels));
  add(s,'cab','vehicle_cab',[x,floor+1.7,z+1.3],[2.2,1.6,1.55],'works',condition(s,[body.cellId!]));
  add(s,'compressor','service_unit',[x,floor+1.35,z-.85],[2.25,.9,2.6],'works',condition(s,[body.cellId!]));
 };
 const narrowRack=(id:string,x:number,z:number)=>{
  const s=bank(id,120),posts:number[]=[];
  for(const [i,dz] of [-2,2].entries()){
   const pad=add(s,'pad-'+i,'plinth',[x,floor+.12,z+dz],[1.4,.24,.8],'works');
   posts.push(add(s,'post-'+i,'post',[x,floor+1.25,z+dz],[.24,2.26,.24],'works',condition(s,[pad.cellId!]),'column').cellId!);
  }
  for(const [i,dx] of [-.45,0,.45].entries())add(s,'feed-'+i,'pipe',[x+dx,floor+2.2,z],[.22,.22,4.3],'works',condition(s,posts),'beam');
  add(s,'controller','service_unit',[x,floor+.85,z],[1.3,1.7,1.1],'works');
 };
 const power=(id:string,x:number,z:number)=>{
  const s=bank(id,125),base=add(s,'pad','plinth',[x,floor+.1,z],[1.8,.2,3.5],'utility');
  const body=add(s,'body','power_unit',[x,floor+1.3,z],[1.5,2.4,2.8],'utility',condition(s,[base.cellId!]));
  for(const [i,dz] of [-.9,0,.9].entries())add(s,'ceramic-'+i,'insulator',[x,floor+2.9,z+dz],[.26,.8,.26],'utility',condition(s,[body.cellId!]));
  const labelPost=add(s,'label-post','post',[x-.55,floor+1.1,z-1.55],[.1,2,.1],'utility',condition(s,[base.cellId!]),'column');
  add(s,'label','ticket_panel',[x-.55,floor+1.9,z-1.55],[.8,.5,.1],'utility',condition(s,[labelPost.cellId!]));
 };
 crawler('vista-spawn-crawler',-16,20);
 narrowRack('vista-spawn-pipes',-16,29);
 power('vista-spawn-control',0,25);
 const transit=bank('vista-relay-transit',110),tx=-13,tz=-56;
 const plaza2=add(transit,'plaza','plinth',[tx,floor+.08,tz],[5.4,.16,7.2],'transit'),tp:number[]=[];
 for(const [i,dx,dz] of [[0,-2,-2.7],[1,2,-2.7],[2,-2,2.7],[3,2,2.7]])tp.push(add(transit,'post-'+i,'post',[tx+dx,floor+1.6,tz+dz],[.2,3.04,.2],'transit',condition(transit,[plaza2.cellId!]),'column').cellId!);
 const canopy2=add(transit,'canopy','canopy',[tx,floor+3.25,tz],[5.2,.26,6.8],'transit',condition(transit,tp),'beam');
 add(transit,'departure-board','ticket_panel',[tx,floor+2.745,tz+2.8],[2.6,.75,.12],'transit',condition(transit,[canopy2.cellId!]));
 for(const [i,dz] of [-1.6,1.6].entries()){
  const legs=[-.9,.9].map((dx,j)=>add(transit,'bench-'+i+'-leg-'+j,'post',[tx+dx,floor+.35,tz+dz],[.18,.54,.55],'transit',condition(transit,[plaza2.cellId!]),'column').cellId!);
  const seat2=add(transit,'bench-'+i,'bench',[tx,floor+.72,tz+dz],[2.4,.2,.62],'transit',condition(transit,legs),'beam');
  add(transit,'bench-'+i+'-back','bench',[tx,floor+1.12,tz+dz+.27],[2.4,.6,.1],'transit',condition(transit,[seat2.cellId!]));
 }
 // A ticket kiosk is assembled from its own thin wall cells, not an invisible
 // enclosing box. The open front remains physically open.
 const kiosk=bank('vista-relay-ticket',90),kx=-13,kz=-48.1;
 const kp=add(kiosk,'floor','plinth',[kx,floor+.1,kz],[2.8,.2,3],'transit');
 const kw:number[]=[];
 for(const [i,dx] of [-1.3,1.3].entries())kw.push(add(kiosk,'side-'+i,'ticket_panel',[kx+dx,floor+1.4,kz],[.2,2.6,3],'transit',condition(kiosk,[kp.cellId!])).cellId!);
 kw.push(add(kiosk,'rear','ticket_panel',[kx,floor+1.4,kz+1.4],[2.4,2.6,.2],'transit',condition(kiosk,[kp.cellId!])).cellId!);
 add(kiosk,'roof','canopy',[kx,floor+2.85,kz],[2.8,.3,3],'transit',condition(kiosk,kw),'beam');
 add(kiosk,'counter','service_unit',[kx,floor+1.1,kz-.5],[2.2,.4,.8],'transit',condition(kiosk,[kp.cellId!]));
 power('vista-east-power',7.8,-49);narrowRack('vista-east-feeds',7.8,-62);
 crawler('vista-east-service',27,-40);
 narrowRack('vista-core-pump',-8.2,-86);
 for(const lot of ['east-warehouse','relay-east-entry','east-relay-yard']){
  const building=district.buildings.find(b=>b.id==='7734:overhaul:'+lot)!;
  const quarters=district.blocks.filter(b=>b.id.startsWith(building.id+':roof-'));
  const s=bank('vista-roof-'+lot,110),x=building.position.x,z=building.position.z,y=building.roof.center.y;
  const pad2=add(s,'pad','plinth',[x,y+.12,z],[2.8,.24,2.8],'utility',{structureId:quarters[0].structureId!,cells:quarters.map(q=>q.cellId!),minIntact:4});
  const machine=add(s,'machine','roof_machine',[x,y+1.15,z],[2.5,1.82,2.5],'utility',condition(s,[pad2.cellId!]));
  for(const [i,dx] of [-.65,.65].entries())add(s,'conduit-'+i,'pipe',[x+dx,y+2.22,z],[.28,.32,2.1],'utility',condition(s,[machine.cellId!]),'beam');
  add(s,'pressure-head','insulator',[x,y+2.65,z],[.35,.54,.35],'utility',condition(s,[machine.cellId!]));
 }
 // Existing roof hardware acquires full-sided authored skin at unchanged pose.
 for(const [id,component] of components)if(id.includes(':roof-')&&id.endsWith(':apparatus'))component.module='roof_machine';
 yards.push(
  {id:'vista-loading',kind:'works',purpose:'Cold-store frontage loading crawler and pipe service rack',bounds:{minX:-17.35,maxX:.9,minZ:17.6,maxZ:31.15}},
  {id:'vista-transit',kind:'civic',purpose:'West relay open waiting shelter and staffed ticket kiosk',bounds:{minX:-15.7,maxX:-10.3,minZ:-59.6,maxZ:-46.6}},
  {id:'vista-east',kind:'utility',purpose:'East relay power feeds and parked maintenance crawler',bounds:{minX:6.9,maxX:28.35,minZ:-64.15,maxZ:-37}},
  {id:'vista-core',kind:'utility',purpose:'Core approach pump and pressure feed rack',bounds:{minX:-8.9,maxX:-7.5,minZ:-88.15,maxZ:-83.85}}
 );
 return {blocks,structures,components,yards};
}
