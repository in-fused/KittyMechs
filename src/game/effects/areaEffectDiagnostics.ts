import type {AreaEffectKind,Vec3} from '../../../shared/types';
export interface AreaDrawDiagnostic {
  id:number;kind:AreaEffectKind;role:'burst'|'field'|'dome';center:Vec3;radius:number;
  age:number;opacity:number;front?:number;vertices:number;triangles:number;
  shaderRadius?:number;shaderCenter?:{x:number;z:number};worldOrigin:Vec3;worldScale:Vec3;
}
export interface AreaMoteDiagnostic {field:number;kind:'repair'|'snare';position:Vec3;scale:number;opacity:number;}
let generation=-1,time=0,frame=0;
const draws:AreaDrawDiagnostic[]=[],motes:AreaMoteDiagnostic[]=[];
export function beginAreaFrame(nextGeneration:number,nextTime:number):void {generation=nextGeneration;time=nextTime;frame++;draws.length=motes.length=0;}
/** Render values come from mounted materials/matrices; IDs and center describe native events. */
export function recordAreaDraw(row:AreaDrawDiagnostic):void {draws.push(row);}
export function recordAreaMotes(rows:readonly AreaMoteDiagnostic[]):void {motes.push(...rows);}
export function readAreaEffects(){return{generation,time,frame,draws:draws.map(d=>({...d,center:{...d.center},shaderCenter:d.shaderCenter?{...d.shaderCenter}:undefined,worldOrigin:{...d.worldOrigin},worldScale:{...d.worldScale}})),motes:motes.map(m=>({...m,position:{...m.position}}))};}
