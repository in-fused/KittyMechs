import { create } from 'zustand';
import type { Chassis, GameSnapshot, Mode } from '../../shared/types';
export type Quality = 'low' | 'medium' | 'high' | 'ultra';
export interface Settings {quality:Quality;volume:number;sensitivity:number;cameraDistance:number;reducedFlashes:boolean;invertY:boolean;}
export const QUALITY={low:{dpr:1,shadows:false,shadowSize:512,radius:1,vegetation:.3,particles:80,post:false},medium:{dpr:1.25,shadows:true,shadowSize:1024,radius:1,vegetation:.6,particles:160,post:false},high:{dpr:1.5,shadows:true,shadowSize:2048,radius:2,vegetation:.85,particles:260,post:true},ultra:{dpr:2,shadows:true,shadowSize:2048,radius:2,vegetation:1,particles:420,post:true}};
const defaults:Settings={quality:window.innerWidth<768?'low':'medium',volume:.45,sensitivity:1,cameraDistance:10,reducedFlashes:false,invertY:false};
export function parseSettings(raw:string|null):Settings {
  try{const v=JSON.parse(raw??'null');if(!v||typeof v!=='object')return defaults;return {quality:['low','medium','high','ultra'].includes(v.quality)?v.quality:defaults.quality,volume:typeof v.volume==='number'&&Number.isFinite(v.volume)?Math.max(0,Math.min(1,v.volume)):defaults.volume,sensitivity:typeof v.sensitivity==='number'&&Number.isFinite(v.sensitivity)?Math.max(.2,Math.min(3,v.sensitivity)):defaults.sensitivity,cameraDistance:typeof v.cameraDistance==='number'&&Number.isFinite(v.cameraDistance)?Math.max(6,Math.min(18,v.cameraDistance)):defaults.cameraDistance,reducedFlashes:v.reducedFlashes===true,invertY:v.invertY===true};}catch{return defaults;}
}
let initial=defaults;try{initial=parseSettings(localStorage.getItem('kittymech-settings'));}catch{ /* storage can be disabled */ }
interface AppState {
  phase:'hangar'|'loading'|'playing'|'paused'|'results';settingsOpen:boolean;settings:Settings;
  name:string;chassis:Chassis;mode:Exclude<Mode,'training'>;seed:number;
  hud:GameSnapshot|null;playerId:string;error:string|null;connection:string;invite:string;latency:number;
  performance:{fps:number;calls:number;triangles:number;geometries:number;textures:number;chunks:number;bodies:number};
  setPhase:(phase:AppState['phase'])=>void;setSettings:(patch:Partial<Settings>)=>void;
}
export const useGameStore=create<AppState>((set,get)=>({
  phase:'hangar',settingsOpen:false,settings:initial,name:'Mochi',chassis:'pounce',mode:'coop',seed:7734,hud:null,playerId:'local',error:null,connection:'Offline',invite:'',latency:0,
  performance:{fps:0,calls:0,triangles:0,geometries:0,textures:0,chunks:0,bodies:0},
  setPhase:phase=>set({phase}),setSettings:patch=>{const settings={...get().settings,...patch};try{localStorage.setItem('kittymech-settings',JSON.stringify(settings));}catch{ /* settings remain usable for this session */ }set({settings});},
}));
