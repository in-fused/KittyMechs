import {getMap} from './maps';
import {Navigation} from './navigation';
import {horizontalDistance} from './math';
import {terrainHeight} from './world';
import type {SupplyKind,Vec3} from './types';
export const SUPPLIES:Record<SupplyKind,{name:string;color:string;description:string;texture:string}>={
  repair:{name:'NANOREPAIR',color:'#a7ebbe',description:'Restore 25% armor to nearby squadmates',texture:'/assets/textures/supply-repair.webp'},
  energy:{name:'POWER CELL',color:'#86dfff',description:'Restore 45 energy',texture:'/assets/textures/supply-energy.webp'},
  coolant:{name:'COOLANT',color:'#ffbd78',description:'Vent 65 heat and reset missile cooldown',texture:'/assets/textures/supply-coolant.webp'},
};
export const SUPPLY_REACH=3,REPAIR_SHARE_RADIUS=10,SUPPLY_COUNT=6;
const cache=new Map<number,Vec3[]>();
/** Random supply choices use admitted road candidates, keeping pickups reachable
 * by every chassis without planting them inside buildings or mission terminals. */
export function supplyCandidates(seed:number):Vec3[]{
  const map=getMap(seed);seed=map.seed;const cached=cache.get(seed);if(cached)return cached;
  const navigation=new Navigation(seed),positions:Vec3[]=[];
  for(const road of map.roads)for(let i=1;i<road.points.length;i++){
    const a=road.points[i-1],b=road.points[i],length=horizontalDistance(a,b),steps=Math.max(1,Math.ceil(length/16));
    for(let j=0;j<steps;j++){
      const t=(j+.5)/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      const position={x,y:terrainHeight(x,z,seed),z};
      if(horizontalDistance(position,map.spawn)<10||map.objectives.some(o=>horizontalDistance(position,o.position)<9)||positions.some(p=>horizontalDistance(p,position)<9)||!navigation.walkable({...position,y:position.y+1}))continue;
      positions.push(position);
    }
  }
  navigation.clear();cache.set(seed,positions);return positions;
}
