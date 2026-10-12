/** Opt-in bounded observation. Does not change readiness, renderer or inputs. */
export function createLoadingTelemetry208({cap=240}={}){
 const rows={frames:[],longTasks:[],local:[],decoder:[],resources:[]},push=(kind,row)=>{const a=rows[kind];if(a.length>=cap)a.shift();a.push(row);};let closed=false,raf=null,last=null,observer=null,gpu=null;
 const now=()=>performance.now();
 const frame=at=>{if(closed)return;if(last!==null)push('frames',{at,intervalMs:at-last});last=at;raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);
 if(typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes?.includes('longtask')){observer=new PerformanceObserver(list=>{for(const e of list.getEntries())push('longTasks',{at:e.startTime,durationMs:e.duration,name:e.name});});observer.observe({type:'longtask',buffered:true});}
 const close=()=>{if(closed)return;closed=true;if(raf!==null)cancelAnimationFrame(raf);observer?.disconnect();window.removeEventListener('pagehide',close);};window.addEventListener('pagehide',close,{once:true});
 return {
  // Caller supplies actual current useProgress and SceneReady operands. Never
  // infer them from a screenshot/camera clock or force the overlay to clear.
  local:({generation,localId,sceneReady,visualCompleted,inputMountedAt,phase,manager})=>push('local',{at:now(),generation,localId,sceneReady,visualCompleted,inputMountedAt,phase,manager:{active:manager.active,loaded:manager.loaded,total:manager.total,progress:manager.progress,item:manager.item,errors:[...manager.errors]}}),
  decoder:r=>push('decoder',{at:now(),...r}),
  renderer:gl=>{const c=gl.getContext();gpu={renderer:c.getExtension('WEBGL_debug_renderer_info')?c.getParameter(c.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL):null,timerQueryAvailable:!!c.getExtension('EXT_disjoint_timer_query_webgl2'),width:c.drawingBufferWidth,height:c.drawingBufferHeight,scope:'CAPABILITY_ONLY_NOT_GPU_FRAME_TIMING'};},
  read:()=>({at:now(),closed,gpu,longTaskAPIAvailable:typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes?.includes('longtask'),rows:structuredClone(rows),resources:performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/')).slice(-cap).map(e=>({name:e.name,startTime:e.startTime,duration:e.duration,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize,responseEnd:e.responseEnd}))}),close
 };
}
