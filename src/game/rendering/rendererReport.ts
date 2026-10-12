export type RendererClassification='hardware-reported'|'software-reported'|'unknown';
export interface RendererIdentity {renderer:string|null;classification:RendererClassification;}
export interface RendererReport extends RendererIdentity {active:boolean;bufferWidth:number;bufferHeight:number;sampledAt:number|null;}
interface RendererIdentityContext {RENDERER:number;getExtension:(name:string)=>unknown;getParameter:(name:number)=>unknown;}
/** A label is evidence of the reported backend, not a GPU-time measurement. */
export function classifyRendererLabel(renderer:string|null):RendererClassification {
 if(!renderer)return 'unknown';
 if(/swiftshader|llvmpipe|softpipe|swrast|software|microsoft basic render/i.test(renderer))return 'software-reported';
 if(/nvidia|geforce|quadro|radeon|\bamd\b|\bintel\b|apple|adreno|\bmali\b|powervr/i.test(renderer))return 'hardware-reported';
 return 'unknown';
}
/** Called only when a current context is admitted or restored, never per frame. */
export function readRendererIdentity(context:RendererIdentityContext):RendererIdentity {
 let renderer:string|null=null;
 try{
  const debug=context.getExtension('WEBGL_debug_renderer_info') as {UNMASKED_RENDERER_WEBGL?:number}|null;
  const raw=context.getParameter(typeof debug?.UNMASKED_RENDERER_WEBGL==='number'?debug.UNMASKED_RENDERER_WEBGL:context.RENDERER);
  if(typeof raw==='string'&&raw.trim())renderer=raw.trim();
 }catch{ /* Browsers can withhold identity; gameplay must remain available. */ }
 return {renderer,classification:classifyRendererLabel(renderer)};
}
