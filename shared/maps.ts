import {cityDistrict} from './cityDistrict';
import {workshopRoofFootprintHeight} from './workshopGeometry';
import type { EnemyRole, Vec3 } from './types';

export type MapPropKind = 'workshop' | 'cargo' | 'crane' | 'tower' | 'rock' | 'cedar' | 'fern' | 'pipes' | 'wall' | 'lamp';
export interface MapProp { kind: MapPropKind; x: number; z: number; scale: number; rotation: number; elevation?:number; roofOwner?:{x:number;z:number}; breakableHp?:number; }
export interface ServiceRoad { points: Vec3[]; width: number; }
export interface Landmark { kind: 'breakwater' | 'gantry' | 'dish'; position: Vec3; rotation: number; scale: number; }
export interface MapDefinition {
  seed: number; name: string; subtitle: string; sky: string; fog: string; ground: string; sun: string;
  sunIntensity: number; fogNear: number; fogFar: number; weather: 'rain' | 'ash' | 'snow';
  preview: string; spawn: Vec3;
  objectives: { id: string; name: string; position: Vec3; seconds: number }[];
  enemySpawns: [number, number, EnemyRole][]; routes: Vec3[][];
  roads: ServiceRoad[]; props: MapProp[]; landmarks: Landmark[];
}
const point = (x: number, z: number, y = -.08): Vec3 => ({ x, y, z });
const route = (points: [number, number, number?][]) => points.map(([x,z,y]) => point(x,z,y));
const prop = (kind: MapPropKind, x: number, z: number, scale = 1, rotation = 0): MapProp => ({kind,x,z,scale,rotation});
const objective = (id: string, name: string, x: number, z: number, seconds: number) => ({id,name,position:{x,y:0,z},seconds});
const COMBAT_WORKSHOPS:Record<number,MapProp>={7734:prop('workshop',56,-62,.9),1926:prop('workshop',84,-56,1.15,Math.PI/2),4107:prop('workshop',69,-83,.9,Math.PI/2)};
const rooftopCargo=(owner:MapProp,seed:number):MapProp[]=>[[-.5,6.5],[6,-5]].map(([x,z])=>({
  ...prop('cargo',owner.x+(x*Math.cos(owner.rotation)+z*Math.sin(owner.rotation))*owner.scale,owner.z+(-x*Math.sin(owner.rotation)+z*Math.cos(owner.rotation))*owner.scale,.32*owner.scale,owner.rotation),
  elevation:(()=>{const y=workshopRoofFootprintHeight(seed,x,z,4.3*.32,1.45*.32);if(y===null)throw new Error('Rooftop cargo has no shipping roof support');return y*owner.scale;})(),roofOwner:{x:owner.x,z:owner.z},breakableHp:100,
}));

/** Theater data is shared by physics, bots and rendering. Road waypoint y values grade terrain. */
export const MAPS: MapDefinition[] = [
  {
    seed:7734,name:'Rainline Reach',subtitle:'COASTAL RECLAMATION ZONE',sky:'#98aeb9',fog:'#91a7ad',ground:'#8a9386',sun:'#ffe6c1',sunIntensity:2.4,fogNear:65,fogFar:235,weather:'rain',preview:'/assets/art/theater-rainline.webp',
    spawn:{x:-8,y:0,z:22},
    objectives:[objective('relay-west','WEST RELAY',-12,-35,3),objective('relay-east','EAST RELAY',34,-30,3),objective('core','STORM CORE',0,-76,4),objective('extraction','EXTRACTION',-8,12,8)],
    enemySpawns:[[-17,-53,'scout'],[19,-67,'mortar'],[27,-20,'scout'],[-42,-63,'anchor'],[9,-100,'mortar']],
    routes:[route([[-17,-53],[-12,-35],[-8,-14],[0,-42]]),route([[19,-67],[26,-54],[34,-30],[24,-24]]),route([[27,-20],[34,-30],[24,-46],[0,-42]]),route([[-42,-63],[-34,-54],[-12,-35],[-20,-58]]),route([[9,-100],[0,-90],[0,-76],[19,-67]])],
    roads:[{width:12,points:route([[-8,32],[-8,12],[0,-8],[0,-42],[0,-76],[0,-112]])},{width:8,points:route([[-46,-35],[-12,-35],[0,-42],[34,-30],[58,-30]])},{width:7,points:route([[-8,12],[-30,4],[-44,-14],[-46,-35]])}],
    props:[prop('workshop',33,-58,.9),prop('tower',46,-12),prop('crane',-1,-53,.85,Math.PI),prop('pipes',21,-44),prop('cargo',18,-17),prop('workshop',-35,-29),prop('tower',-52,-48),prop('cargo',-25,-8),prop('pipes',-30,-50),prop('workshop',31,-97),prop('tower',-1,-106,1.3),prop('cargo',19,-90),prop('crane',-48,28),prop('workshop',-36,52),prop('cargo',-29,14),prop('workshop',35,42),prop('pipes',26,10),prop('tower',50,6),prop('wall',-59,-7,1,Math.PI/2),COMBAT_WORKSHOPS[7734],...rooftopCargo(COMBAT_WORKSHOPS[7734],7734)],
    landmarks:[{kind:'breakwater',position:point(-151,-26,-3),rotation:0,scale:1},{kind:'gantry',position:point(-95,-143,0),rotation:0,scale:.75}],
  },
  {
    seed:1926,name:'Ember Quarry',subtitle:'ABANDONED VOLCANIC FOUNDRY',sky:'#bca897',fog:'#b9a28d',ground:'#ad9076',sun:'#ffd5a3',sunIntensity:3.4,fogNear:95,fogFar:300,weather:'ash',preview:'/assets/art/theater-ember.webp',
    spawn:{x:0,y:0,z:44},
    objectives:[objective('relay-west','CRUSHER RELAY',-62,-32,3),objective('relay-east','FURNACE RELAY',54,-54,3),objective('core','QUARRY CORE',0,-104,4),objective('extraction','HAULER EXTRACTION',0,32,8)],
    enemySpawns:[[-54,-48,'scout'],[44,-74,'mortar'],[53,-28,'scout'],[-38,-89,'anchor'],[16,-111,'mortar']],
    routes:[route([[-54,-48],[-62,-32],[-50,-5],[-24,18]]),route([[44,-74],[54,-54],[68,-27],[44,-7]]),route([[53,-28],[68,-27],[54,-54],[28,-34]]),route([[-38,-89],[-30,-105],[0,-104],[-27,-72]]),route([[16,-111],[0,-104],[26,-88],[44,-74]])],
    roads:[{width:13,points:route([[0,52,1],[0,32,1],[-24,18,.3],[-50,-5,1],[-62,-32,2],[-54,-64,3],[-30,-105,4],[0,-104,4],[26,-88,2],[54,-54,1],[68,-27,1],[44,-7,-1],[0,32,1]])},{width:9,points:route([[-62,-32,2],[-32,-30,-1],[0,-38,-3],[28,-34,-1],[54,-54,1]])},{width:8,points:route([[0,-38,-3],[0,-70,.2],[0,-104,4]])}],
    props:[prop('workshop',-83,-34,.95,Math.PI/2),COMBAT_WORKSHOPS[1926],prop('tower',-82,-85,1.2),prop('tower',74,-94,1.5),prop('crane',-18,-125,1.1),prop('pipes',16,-20,1.4,Math.PI/2),prop('pipes',-18,-56,1.2),prop('cargo',-39,-8,1.2,Math.PI/3),prop('cargo',36,-56,1.2),prop('wall',-35,-53,1.3),prop('wall',32,-12,1.1,Math.PI/3),prop('rock',-17,-88,1.7),prop('rock',22,-65,1.4),prop('lamp',-70,-28),prop('lamp',61,-49),prop('workshop',34,50,.85),...rooftopCargo(COMBAT_WORKSHOPS[1926],1926)],
    landmarks:[{kind:'gantry',position:point(102,-145,12),rotation:Math.PI/2,scale:1.25},{kind:'gantry',position:point(-125,-126,11),rotation:-.4,scale:.75}],
  },
  {
    seed:4107,name:'Frostline Basin',subtitle:'HIGH ALTITUDE STORM STATION',sky:'#b6c7d1',fog:'#b9cbd5',ground:'#e0e4e2',sun:'#e0f1ff',sunIntensity:2.1,fogNear:55,fogFar:230,weather:'snow',preview:'/assets/art/theater-frostline.webp',
    spawn:{x:0,y:0,z:36},
    objectives:[objective('relay-west','RIDGE RELAY',-48,-40,3),objective('relay-east','CAUSEWAY RELAY',44,-64,3),objective('core','WEATHER ARRAY',0,-118,4),objective('extraction','BASIN EXTRACTION',0,22,8)],
    enemySpawns:[[-48,-60,'scout'],[44,-84,'mortar'],[34,-48,'scout'],[-25,-96,'anchor'],[14,-133,'mortar']],
    routes:[route([[-48,-60],[-48,-40],[-36,-18],[-22,-52]]),route([[44,-84],[44,-64],[34,-48],[24,-96]]),route([[34,-48],[44,-64],[24,-96],[0,-76]]),route([[-25,-96],[-24,-82],[0,-76],[0,-118]]),route([[14,-133],[0,-118],[24,-96],[14,-133]])],
    roads:[{width:11,points:route([[0,46,0],[0,22,0],[-12,1,1],[-36,-18,3],[-48,-40,5],[-48,-60,6],[-24,-82,8],[0,-118,11],[0,-145,12]])},{width:10,points:route([[-12,1,1],[18,-24,3],[34,-48,6],[44,-64,8],[44,-84,9],[24,-96,10],[0,-118,11]])},{width:7,points:route([[-48,-40,5],[-22,-52,6],[0,-76,8],[34,-48,6]])}],
    props:[prop('workshop',-77,-38,.95,Math.PI/2),prop('tower',-67,-78,1.4),prop('tower',65,-51,1.5),COMBAT_WORKSHOPS[4107],prop('cargo',-28,-30,1.2,Math.PI/4),prop('cargo',20,-58,1.1),prop('pipes',-19,-105,1.1,Math.PI/2),prop('rock',-10,-32,1.4),prop('rock',23,-10,1.6),prop('wall',-34,-108,1.2,Math.PI/3),prop('wall',58,-113,1.3),prop('cargo',-16,8,.9),prop('lamp',-55,-34),prop('lamp',50,-59),prop('workshop',35,25,.85),...rooftopCargo(COMBAT_WORKSHOPS[4107],4107)],
    landmarks:[{kind:'dish',position:point(-94,-146,17),rotation:.5,scale:1.2},{kind:'dish',position:point(103,-123,18),rotation:-.6,scale:.8}],
  },
];
// Shared district streets extend Rainline without replacing its mission roads.
MAPS[0].roads.push(...cityDistrict(7734)!.streets.map(s=>({width:s.width,points:s.points})));
export const getMap = (seed: number): MapDefinition => MAPS.find(m=>m.seed===seed) ?? MAPS[0];
/** Optional service routes clear decoration footprints without filtering their
 * destination buildings through the main mission's authored lane admission. */
const SERVICE_APPROACHES:Record<number,Vec3[]>={
  7734:route([[-8,22],[-8,52],[-21,52]]),
  1926:route([[0,44],[0,66],[47,66],[47,50]]),
  4107:route([[0,36],[0,42],[48,42],[48,25]]),
};
export const serviceApproach=(seed:number)=>SERVICE_APPROACHES[getMap(seed).seed];
const SERVICE_WORKSHOPS:Record<number,{x:number;z:number}>={7734:{x:-36,z:52},1926:{x:34,z:50},4107:{x:35,z:25}};
export const serviceWorkshop=(seed:number)=>SERVICE_WORKSHOPS[getMap(seed).seed];
export const combatWorkshop=(seed:number)=>COMBAT_WORKSHOPS[getMap(seed).seed];
export const serviceWorkshops=(seed:number)=>[serviceWorkshop(seed),combatWorkshop(seed)];
const COMBAT_APPROACHES:Record<number,Vec3[]>={
  7734:route([[34,-30],[73,-30],[73,-62],[70,-62]]),
  1926:route([[54,-54],[65,-54],[65,-78],[84,-78],[84,-73]]),
  4107:route([[44,-64],[52,-64],[52,-105],[69,-105],[69,-97]]),
};
export const serviceApproaches=(seed:number)=>[serviceApproach(seed),COMBAT_APPROACHES[getMap(seed).seed]];
