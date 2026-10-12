import type {CityDistrict} from '../../../shared/cityDistrict';
import {cityBlockActive} from '../../../shared/cityDistrict';
import {cityFractureAssetFor,cityFractureCenter,type CityFractureAsset} from '../../../shared/cityFracture';
import bakedAsset from '../../../shared/data/city-fracture-v1.json';
import type {CombatEvent,StructureState,Vec3} from '../../../shared/types';

export const CITY_DEBRIS_LIMIT=48,CITY_DEBRIS_LIFETIME=2.8;
export type CityFragmentSurface='brick'|'steel'|'concrete'|'panel'|'stone';
export interface CityFragment {key:string;blockId:string;piece:number;at:number;position:Vec3;velocity:Vec3;spin:Vec3;size:Vec3;yaw:number;material:'brick'|'steel'|'concrete';surface:CityFragmentSurface;}
const finite=(p:Vec3|undefined):p is Vec3=>!!p&&[p.x,p.y,p.z].every(Number.isFinite);
const normalize=(p:Vec3)=>{const d=Math.hypot(p.x,p.y,p.z);return d>1e-6?{x:p.x/d,y:p.y/d,z:p.z/d}:null;};
/** Reassemble the source at age zero; yaw * local tumble * scale has no shear. */
export function sampleCityFragment(fragment:CityFragment,time:number){
  const age=Math.max(0,time-fragment.at),shrink=Math.max(0,Math.min(1,(CITY_DEBRIS_LIFETIME-age)/.45));
  const [sx,cx,sy,cy,sz,cz]=[Math.sin(fragment.spin.x*age/2),Math.cos(fragment.spin.x*age/2),Math.sin(fragment.spin.y*age/2),Math.cos(fragment.spin.y*age/2),Math.sin(fragment.spin.z*age/2),Math.cos(fragment.spin.z*age/2)];
  const q={x:sx*cy*cz+cx*sy*sz,y:cx*sy*cz-sx*cy*sz,z:cx*cy*sz+sx*sy*cz,w:cx*cy*cz-sx*sy*sz},y=Math.sin(fragment.yaw/2),w=Math.cos(fragment.yaw/2);
  return {visible:Number.isFinite(time)&&time>=fragment.at&&age<CITY_DEBRIS_LIFETIME,
    position:{x:fragment.position.x+fragment.velocity.x*age,y:fragment.position.y+fragment.velocity.y*age-11*age*age,z:fragment.position.z+fragment.velocity.z*age},
    quaternion:{x:w*q.x+y*q.z,y:w*q.y+y*q.w,z:w*q.z-y*q.x,w:w*q.w-y*q.y},
    size:{x:fragment.size.x*shrink,y:fragment.size.y*shrink,z:fragment.size.z*shrink}};
}
/** Cosmetic, deterministic and bounded. Persistent holes/support retirement
 * come only from accepted structures. Pending events outlive the shorter ring. */
export class CityDebrisPool {
  readonly fragments:CityFragment[]=[];
  private pending=new Map<string,CombatEvent>();
  private retired=new Set<string>();
  private cells:Map<string,CityDistrict['structures'][number]['cells'][number]>;
  private styles:Map<string,CityDistrict['buildings'][number]['style']>;
  constructor(district:CityDistrict,private asset:CityFractureAsset=bakedAsset){
    this.cells=new Map(district.structures.flatMap(s=>s.cells.map(c=>[`${s.id}:${c.cellId}`,c] as const)));
    this.styles=new Map(district.buildings.map(b=>[b.id,b.style]));
  }
  update(events:readonly CombatEvent[],structures:readonly StructureState[],time:number):void {
    if(!Number.isFinite(time)||time<0)return;
    for(let i=this.fragments.length-1;i>=0;i--)if(time-this.fragments[i].at>=CITY_DEBRIS_LIFETIME)this.fragments.splice(i,1);
    for(const event of events){
      if(event.type!=='structure-break'||!Number.isSafeInteger(event.id)||event.id<0||!Number.isFinite(event.at)||event.at<0||event.at>time+8||time-event.at>=CITY_DEBRIS_LIFETIME||!Number.isInteger(event.cellId)||!finite(event.position)||!finite(event.incoming)||!finite(event.normal)||!normalize(event.incoming)||!normalize(event.normal))continue;
      const key=`${event.structureId}:${event.cellId}`;
      if(!this.cells.has(key)||this.retired.has(key))continue;
      const before=this.pending.get(key);
      if(!before||event.at<before.at||event.at===before.at&&event.id<before.id)this.pending.set(key,{...event,position:{...event.position},incoming:{...event.incoming},normal:{...event.normal}});
      while(this.pending.size>96)this.pending.delete(this.pending.keys().next().value!);
    }
    for(const [key,event] of [...this.pending].sort((a,b)=>a[1].at-b[1].at||a[1].id-b[1].id)){
      if(time-event.at>=CITY_DEBRIS_LIFETIME){this.pending.delete(key);continue;}
      if(event.at>time)continue;
      const cell=this.cells.get(key)!,state=structures.find(s=>s.id===cell.structureId);
      if(!state||state.hp[cell.cellId!]!==0||((state.brokenMask>>>cell.cellId!)&1)!==1||cityBlockActive(cell,structures))continue;
      this.pending.delete(key);this.retired.add(key);
      const incoming=normalize(event.incoming!)!,normal=normalize(event.normal!)!;
      const style=this.styles.get(cell.buildingId),surface:CityFragmentSurface=cell.id.includes(':panel-')&&style==='transit'?'panel':cell.id.includes(':panel-')&&style==='civic'?'stone':cell.material;
      for(const piece of cityFractureAssetFor(cell,this.asset).pieces){
        const i=piece.id;
        const angle=i*Math.PI*.75+(event.id%29)*.19,spread=.7+(i%3)*.3,speed=3.2+(i%4)*.6;
        // Winning incoming trajectory gives the push; the impacted face gives
        // restrained outward scatter, including shots from the opposite side.
        const velocity={x:incoming.x*speed+normal.x*.65+Math.cos(angle)*spread,y:incoming.y*speed+1.5+(i%3)*.6,z:incoming.z*speed+normal.z*.65+Math.sin(angle)*spread};
        if(this.fragments.length>=CITY_DEBRIS_LIMIT)this.fragments.shift();
        this.fragments.push({key:`${event.id}:${i}`,blockId:cell.id,piece:i,at:event.at,position:cityFractureCenter(cell,piece),velocity,spin:{x:2+i*.17,y:1.1+(i%3),z:3-i*.19},size:{x:cell.halfExtents[0]*2,y:cell.halfExtents[1]*2,z:cell.halfExtents[2]*2},yaw:cell.yaw,material:cell.material,surface});
      }
    }
  }
}
