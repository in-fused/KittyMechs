export const LOW_RENDER_PIXELS059=1280*720;
export const LOW_MIN_DPR059=.25;
/** Preserve CSS aspect; Low subsamples large canvases rather than stretching.
 * The legibility floor can exceed the area budget on exceptionally large views. */
export function renderPixelRatio059(low:boolean,width:number,height:number,deviceDpr:number,maxDpr:number):number {
 if(!low){const device=Number.isFinite(deviceDpr)&&deviceDpr>0?deviceDpr:1;return Math.min(Math.max(1,device),Number.isFinite(maxDpr)&&maxDpr>=1?maxDpr:1);}
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return 1;
 return Math.max(LOW_MIN_DPR059,Math.min(1,Math.sqrt(LOW_RENDER_PIXELS059/(width*height))));
}
