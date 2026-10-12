import {PerspectiveCamera,Vector3} from 'three';
export interface Rect280 {left:number;top:number;right:number;bottom:number;name?:string;}
export interface Layout280 {width:number;height:number;revision:number;rect:Rect280|null;obstacles:Rect280[];measuredAt:number;}
const overlap=(a:Rect280,b:Rect280)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
/** Largest empty rectangle around the useful central subject region. Called
 * only for cached layout changes, never from the render loop. */
export function usableLayout280(width:number,height:number,rectangles:Rect280[],revision=0):Layout280{
 const marginX=Math.max(12,width*.045),marginY=Math.max(12,height*.05),viewport={left:marginX,top:marginY,right:width-marginX,bottom:height-marginY};
 const obstacles=rectangles.map(r=>({...r,left:Math.max(0,r.left-8),right:Math.min(width,r.right+8),top:Math.max(0,r.top-8),bottom:Math.min(height,r.bottom+8)})).filter(r=>r.right>r.left&&r.bottom>r.top);
 const ys=[...new Set([viewport.top,viewport.bottom,...obstacles.flatMap(r=>[Math.max(viewport.top,r.top),Math.min(viewport.bottom,r.bottom)])])].filter(y=>y>=viewport.top&&y<=viewport.bottom).sort((a,b)=>a-b);let best:Rect280|null=null,bestScore=-Infinity;
 for(let a=0;a<ys.length-1;a++)for(let b=a+1;b<ys.length;b++){
  const top=ys[a],bottom=ys[b];if(bottom-top<height*.28)continue;
  const blocked=obstacles.filter(r=>r.top<bottom&&r.bottom>top).sort((x,y)=>x.left-y.left);let left=viewport.left;
  const consider=(right:number)=>{if(right-left<width*.28)return;const r={left,top,right,bottom},cx=(left+right)/2,cy=(top+bottom)/2;if(obstacles.some(o=>overlap(r,o)))return;const central=width*.5>=left&&width*.5<=right&&height*.5>=top&&height*.5<=bottom;const score=(right-left)*(bottom-top)*(central?1:.45)-Math.abs(cx-width*.5)*height*.1-Math.abs(cy-height*.55)*width*.08;if(score>bestScore){best=r;bestScore=score;}};
  for(const o of blocked){consider(Math.min(viewport.right,o.left));left=Math.max(left,o.right);if(left>=viewport.right)break;}consider(viewport.right);
 }
 return {width,height,revision,rect:best,obstacles,measuredAt:0};
}
export function projection280(camera:PerspectiveCamera,corners:readonly Vector3[],layout:Layout280,point:Vector3){
 const result={pass:false,contained:false,useful:false,left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity,areaFraction:0,heightFraction:0,blockedBy:[] as string[],layoutRevision:layout.revision,usableRect:layout.rect};if(!corners.length||!layout.rect)return result;camera.updateMatrixWorld();
 for(const corner of corners){point.copy(corner).applyMatrix4(camera.matrixWorldInverse);if(!Number.isFinite(point.x+point.y+point.z)||point.z>=-camera.near)return result;point.applyMatrix4(camera.projectionMatrix);const x=(point.x+1)*layout.width/2,y=(1-point.y)*layout.height/2;if(!Number.isFinite(x+y))return result;result.left=Math.min(result.left,x);result.right=Math.max(result.right,x);result.top=Math.min(result.top,y);result.bottom=Math.max(result.bottom,y);}
 const r=layout.rect;result.blockedBy=layout.obstacles.filter(o=>overlap(result,o)).map(o=>o.name??'HUD');result.contained=result.left>=r.left&&result.right<=r.right&&result.top>=r.top&&result.bottom<=r.bottom&&result.blockedBy.length===0;result.areaFraction=(result.right-result.left)*(result.bottom-result.top)/(layout.width*layout.height);result.heightFraction=(result.bottom-result.top)/layout.height;result.useful=result.areaFraction>=.015&&result.heightFraction>=.16;result.pass=result.contained&&result.useful;return result;
}
/** Composition shift, not body translation or aim authority: orient the optical
 * body bracket toward a measured empty region before public-look admission. */
export function compose280(camera:PerspectiveCamera,corners:readonly Vector3[],focus:Vector3,layout:Layout280,point:Vector3,aim:Vector3,right:Vector3,up:Vector3){
 camera.lookAt(focus);if(!layout.rect)return;const r=layout.rect,nx=(r.left+r.right)/layout.width-1,ny=1-2*(r.top+(r.bottom-r.top)*.55)/layout.height;aim.copy(focus);
 for(let i=0;i<2;i++){const p=projection280(camera,corners,layout,point);if(!Number.isFinite(p.left+p.top+p.right+p.bottom))break;const cx=(p.left+p.right)/layout.width-1,cy=1-(p.top+p.bottom)/layout.height,distance=camera.position.distanceTo(focus),half=Math.tan(camera.fov*Math.PI/360);right.set(1,0,0).applyQuaternion(camera.quaternion);up.set(0,1,0).applyQuaternion(camera.quaternion);aim.addScaledVector(right,(cx-nx)*distance*half*camera.aspect).addScaledVector(up,(cy-ny)*distance*half);camera.lookAt(aim);}
}
const selectors='.mech-status,.weapons-hud,.mission-status,.hud-topright,.controls-hint,.interaction-prompt,.touch-stick,.touch-actions,.touch-climb,.debug-overlay,.death-overlay,.scoreboard,.loading-overlay,.modal-scrim';
/** DOM reads are capped at4Hz, observer-driven and disposed on unmount. */
export function createLayoutCache280(){
 let layout=usableLayout280(1,1,[]),timer:ReturnType<typeof setTimeout>|null=null,last=-Infinity,closed=false,mutation:MutationObserver|null=null,resize:ResizeObserver|null=null;const observed=new Set<Element>();
 const refresh=()=>{timer=null;if(closed)return;last=performance.now();const elements=[...document.querySelectorAll<HTMLElement>(selectors)],rects:Rect280[]=[];for(const el of elements){if(!observed.has(el)){resize?.observe(el);observed.add(el);}const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;const r=el.getBoundingClientRect();if(r.width<=0||r.height<=0)continue;let left=r.left,top=r.top,right=r.right,bottom=r.bottom;const pseudo=getComputedStyle(el,'::before');if(pseudo.content!=='none'&&pseudo.content!=='normal'&&pseudo.display!=='none'){const px=(v:string)=>Number.isFinite(parseFloat(v))?parseFloat(v):0;left+=Math.min(0,px(pseudo.left));right-=Math.min(0,px(pseudo.right));top+=Math.min(0,px(pseudo.top));bottom-=Math.min(0,px(pseudo.bottom));}rects.push({name:el.className,left,top,right,bottom});}for(const el of observed)if(!el.isConnected){resize?.unobserve(el);observed.delete(el);}layout=usableLayout280(window.innerWidth,window.innerHeight,rects,layout.revision+1);layout.measuredAt=last;};
 const invalidate=()=>{if(closed||timer!==null)return;timer=setTimeout(refresh,Math.max(0,250-(performance.now()-last)));};
 return {read:()=>layout,start(){closed=false;resize=new ResizeObserver(invalidate);resize.observe(document.documentElement);mutation=new MutationObserver(invalidate);mutation.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true,attributeFilter:['class','style','hidden']});window.addEventListener('resize',invalidate);invalidate();return()=>{closed=true;if(timer!==null)clearTimeout(timer);timer=null;resize?.disconnect();mutation?.disconnect();window.removeEventListener('resize',invalidate);observed.clear();};}};
}
