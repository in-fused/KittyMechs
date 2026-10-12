import type {CombatEvent,CoverState,StructureState} from '../../../shared/types';
import {parseCoverState} from '../../../shared/coverState';
import type {CityRubbleState} from '../../../shared/cityRubble';
import {Quaternion} from 'three';
import type {OverhaulRuinState} from '../../../shared/overhaulRuins';
import type {readStreetNativeColliders} from '../../../shared/rainlineStreetAdmission';

export interface PresentedCityState {tick:number;time:number;structures:readonly StructureState[];cover:readonly CoverState[];rubble:readonly CityRubbleState[];ruins?:readonly OverhaulRuinState[];events:readonly CombatEvent[];experimentalPhysicalRubble:boolean;signature:string;}
type Listener=(state:PresentedCityState)=>void;
export interface CityMeshDiagnostic {surface:'pbr'|'fallback';activeBlocks:number;removedBlocks:string[];cells:number;street?:{revision:string;materialGroups:number;native:ReturnType<typeof readStreetNativeColliders>};}
/** Discrete world revisions follow the local body's buffered presentation
 * clock. Geometry and guest collision listeners run in one World frame pass. */
export class CityPresentation {
  private history:PresentedCityState[]=[];
  private listeners=new Set<Listener>();
  private current:PresentedCityState|null=null;
  private clock=0;
  private changes=0;
  private meshes=new Map<symbol,()=>CityMeshDiagnostic>();
  constructor(private seed=7734){}
  push(tick:number,time:number,structures:readonly StructureState[],cover:readonly CoverState[]=[],rubble:readonly CityRubbleState[]=[],events:readonly CombatEvent[]=[],experimentalPhysicalRubble=false,ruins:readonly OverhaulRuinState[]=[]):void {
    const mode=experimentalPhysicalRubble===true;
    const last=this.history.at(-1);if(last&&(tick<=last.tick||last.experimentalPhysicalRubble!==mode))return;
    const acceptedCover=parseCoverState(cover,this.seed,time,last?.cover??[]);if(!acceptedCover)return;
    const copied=structures.map(s=>({...s,hp:[...s.hp]}));
    // Cover damage has the same discrete presentation clock as city damage.
    // Retain accepted removals when a later packet omits cover entries, including
    // for suspended mesh listeners and tiles admitted after that packet.
    const copiedCover=acceptedCover.sort((a,b)=>a.id.localeCompare(b.id));
    const copiedRubble=(mode?rubble:[]).map(r=>({...r,position:{...r.position},rotation:{...r.rotation}}));
    const copiedEvents=events.map(e=>({...e,position:{...e.position},...(e.incoming?{incoming:{...e.incoming}}:{}),...(e.normal?{normal:{...e.normal}}:{})}));
    const state={tick,time,structures:copied,cover:copiedCover,rubble:copiedRubble,events:copiedEvents,experimentalPhysicalRubble:mode,signature:String(mode)+';'+copied.map(s=>`${s.id}:${s.layoutVersion}:${s.revision}:${s.brokenMask}`).join('|')+';'+copiedCover.map(c=>`${c.id}:${c.hp}:${c.destroyedAt}`).join('|')};
    Object.assign(state,{ruins:ruins.map(r=>({...r,position:{...r.position},rotation:{...r.rotation}}))});
    this.history.push(state);if(this.history.length>8)this.history.shift();
  }
  present(time:number):PresentedCityState|null {
    if(!this.history.length)return null;
    let selected=this.history[0];for(const sample of this.history){if(sample.time>time)break;selected=sample;}
    if(Number.isFinite(time))this.clock=Math.max(this.clock,time,selected.time);
    // Rendering can revisit one native snapshot several times. Its detached
    // ruin poses are immutable; only the interpolation clock advances here.
    if(selected===this.current)return selected;
    if(this.current&&selected.tick<this.current.tick)return this.current;
    const changed=!this.current||selected.signature!==this.current.signature||!!selected.ruins?.length;
    this.current=selected;
    if(changed){this.changes++;for(const listener of this.listeners)listener(selected);}
    return selected;
  }
  register(listener:Listener):()=>void {this.listeners.add(listener);if(this.current)listener(this.current);return()=>{this.listeners.delete(listener);};}
  read():PresentedCityState|null{return this.current;}
  readClock():number{return this.clock;}
  /** Interpolate only an already displayed component. Birth/removal follows the
   * discrete snapshot selected on the actor clock; never extrapolate physics. */
  sampleRubble():CityRubbleState[]{
    const from=this.current;if(!from)return [];
    const next=this.history.find(s=>s.time>from.time),byId=new Map(next?.rubble.map(r=>[r.id,r])??[]);
    const alpha=next?Math.min(1,Math.max(0,(this.clock-from.time)/(next.time-from.time))):0;
    return from.rubble.filter(r=>r.born<=this.clock&&this.clock<r.expires).map(r=>{
      const b=byId.get(r.id);if(!b||b.born!==r.born)return {...r,position:{...r.position},rotation:{...r.rotation}};
      const q=new Quaternion(r.rotation.x,r.rotation.y,r.rotation.z,r.rotation.w).slerp(new Quaternion(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w),alpha);
      return {...r,position:{x:r.position.x+(b.position.x-r.position.x)*alpha,y:r.position.y+(b.position.y-r.position.y)*alpha,z:r.position.z+(b.position.z-r.position.z)*alpha},rotation:{x:q.x,y:q.y,z:q.z,w:q.w}};
    });
  }
  registerMesh(read:()=>CityMeshDiagnostic):()=>void {const key=Symbol('city-mesh');this.meshes.set(key,read);return()=>{this.meshes.delete(key);};}
  snapshot(){return {tick:this.current?.tick??null,time:this.current?.time??null,revisions:this.current?.structures.map(s=>({id:s.id,layoutVersion:s.layoutVersion,revision:s.revision,brokenMask:s.brokenMask}))??[],cover:this.current?.cover.map(c=>({...c}))??[],history:this.history.length,changes:this.changes,meshes:[...this.meshes.values()].map(read=>read())};}
}
