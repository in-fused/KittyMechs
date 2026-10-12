/** Local renderer evidence only. It cannot carry names, positions or inputs. */
export interface ClientFrameReport092 {
 version:1;instance:string;sequence:number;browser:'headless-chromium'|'electron'|'chromium'|'firefox'|'safari'|'unknown';
 renderer:string|null;quality:'low'|'medium'|'high'|'ultra';prototype:boolean;phaseAtEnd:'hangar'|'loading'|'playing'|'paused'|'results';
 bufferWidth:number;bufferHeight:number;frames:number;tailSamples:number;
 elapsedMs:number;meanMs:number;p95Ms:number;maxMs:number;longFrames:number;
}
const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
const finite=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function parseClientFrameReport092(value:unknown):ClientFrameReport092|null {
 if(!value||typeof value!=='object')return null;const v=value as Record<string,unknown>;
 if(v.version!==1||typeof v.instance!=='string'||! /^[a-f0-9-]{36}$/.test(v.instance)||!integer(v.sequence,1,20)||
  !['headless-chromium','electron','chromium','firefox','safari','unknown'].includes(String(v.browser))||
  !(v.renderer===null||typeof v.renderer==='string'&&v.renderer.length<=256)||!['low','medium','high','ultra'].includes(String(v.quality))||typeof v.prototype!=='boolean'||!['hangar','loading','playing','paused','results'].includes(String(v.phaseAtEnd))||
  !integer(v.bufferWidth,1,32768)||!integer(v.bufferHeight,1,32768)||!integer(v.frames,1,10000)||!integer(v.tailSamples,1,512)||Number(v.tailSamples)>Number(v.frames)||
  !finite(v.elapsedMs,1,120000)||!finite(v.meanMs,0,120000)||!finite(v.p95Ms,0,120000)||!finite(v.maxMs,0,120000)||Number(v.p95Ms)>Number(v.maxMs)||!integer(v.longFrames,0,Number(v.frames)))return null;
 return {version:1,instance:v.instance,sequence:v.sequence,browser:v.browser as ClientFrameReport092['browser'],renderer:v.renderer as string|null,quality:v.quality as ClientFrameReport092['quality'],prototype:v.prototype,phaseAtEnd:v.phaseAtEnd as ClientFrameReport092['phaseAtEnd'],bufferWidth:v.bufferWidth,bufferHeight:v.bufferHeight,frames:v.frames,tailSamples:v.tailSamples,elapsedMs:v.elapsedMs,meanMs:v.meanMs,p95Ms:v.p95Ms,maxMs:v.maxMs,longFrames:v.longFrames};
}
