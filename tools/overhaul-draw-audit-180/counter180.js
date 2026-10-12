/* Test-page observation only. Every wrapped graphics call delegates unchanged.
 * Counts are submissions, not GPU timings, pixel visibility or human lag proof. */
(()=>{
 const ids=new WeakMap(),contexts=new WeakMap(),meta=new Map(),shaders=new WeakMap(),programs=new WeakMap(),wrapped=new WeakSet();let next=1,armed=null,lastTimestamp=null;
 const id=o=>{if(!o)return 0;if(!ids.has(o))ids.set(o,next++);return ids.get(o);};
 const state=gl=>{let s=contexts.get(gl);if(!s){s={gl,program:null,vao:null,element:null,array:null,framebuffer:null,vaos:new Map()};contexts.set(gl,s);}return s;};
 const fail=message=>{if(armed&&!armed.error)armed.error=message;};
 const record=(gl,api,mode,count,instances,offset,type,nativeCall)=>{
  if(!armed?.open||armed.done||armed.error)return;
  if(![count,instances,offset].every(Number.isFinite)||count<0||instances<0){fail('Nonfinite draw operands');return;}
  const s=state(gl),key=[api,id(s.program),id(s.element),mode,count,instances,offset,type,id(s.framebuffer)].join(':');
  if(!armed.rows.has(key)&&armed.rows.size>=4096){fail('4096 draw-group bound');return;}
  const triangles=(mode===4?count/3:mode===5||mode===6?Math.max(0,count-2):0)*instances;
  const row=armed.rows.get(key)??{api,program:id(s.program),shaderNames:programs.get(s.program)?.names??[],skinned:programs.get(s.program)?.skinned??null,indexBuffer:id(s.element),indexBufferBytes:meta.get(id(s.element))?.bytes??null,mode,count,instances,offset,type,framebuffer:id(s.framebuffer),occurrences:0,triangles:0};
  row.occurrences++;row.triangles+=triangles;armed.rows.set(key,row);
  armed.current.logicalDraws++;armed.current.nativeCalls+=nativeCall;armed.current.triangles+=triangles;
 };
 const patch=(object,name,observe)=>{
  const original=object?.[name];if(typeof original!=='function'||wrapped.has(original))return;
  function observed(...args){const result=Reflect.apply(original,this,args);try{observe(this,args,result);}catch(error){fail('Counter observation: '+String(error));}return result;}
  wrapped.add(observed);object[name]=observed;
 };
 const multi=(gl,extension)=>{
  for(const [name,indexed,instanced] of [['multiDrawElementsWEBGL',true,false],['multiDrawElementsInstancedWEBGL',true,true],['multiDrawArraysWEBGL',false,false],['multiDrawArraysInstancedWEBGL',false,true]]){
   patch(extension,name,(_,[mode,...a])=>{
    if(!armed?.open||armed.done)return;
    const counts=indexed?a[0]:a[2],co=indexed?a[1]:a[3],type=indexed?a[2]:null,offsets=indexed?a[3]:a[0],oo=indexed?a[4]:a[1],instanceCounts=instanced?a[indexed?5:4]:null,io=instanced?a[indexed?6:5]:0,n=a[indexed?(instanced?7:5):(instanced?6:4)];
    if(!Number.isInteger(n)||n<0||n>4096){fail('4096 multi-draw bound');return;}
    for(let i=0;i<n;i++)record(gl,name,mode,counts[co+i],instanced?instanceCounts[io+i]:1,offsets[oo+i],type,i===0?1:0);
   });
  }
 };
 for(const proto of [globalThis.WebGLRenderingContext?.prototype,globalThis.WebGL2RenderingContext?.prototype]){
  patch(proto,'useProgram',(gl,[program])=>{state(gl).program=program;});
  patch(proto,'bindVertexArray',(gl,[vao])=>{const s=state(gl);s.vao=vao;s.element=s.vaos.get(id(vao))??null;});
  patch(proto,'bindBuffer',(gl,[target,buffer])=>{const s=state(gl);if(target===34963){s.element=buffer;s.vaos.set(id(s.vao),buffer);}if(target===34962)s.array=buffer;});
  patch(proto,'bindFramebuffer',(gl,[target,buffer])=>{if(target===36160||target===36009)state(gl).framebuffer=buffer;});
  patch(proto,'bufferData',(gl,[target,data])=>{if(meta.size>=4096){fail('4096 buffer metadata bound');return;}const s=state(gl),buffer=target===34963?s.element:target===34962?s.array:null;if(buffer)meta.set(id(buffer),{bytes:typeof data==='number'?data:data?.byteLength??null});});
  patch(proto,'shaderSource',(_,[shader,source])=>{shaders.set(shader,{names:[...String(source).matchAll(/#define\s+SHADER_NAME\s+(\S+)/g)].map(m=>m[1].slice(0,80)).slice(0,4),skinned:/#define\s+USE_SKINNING\b/.test(source)});});
  patch(proto,'attachShader',(_,[program,shader])=>{const a=programs.get(program)??{names:[],skinned:false},b=shaders.get(shader);if(b){a.names=[...new Set([...a.names,...b.names])].slice(0,8);a.skinned ||=b.skinned;}programs.set(program,a);});
  patch(proto,'getExtension',(gl,[name],result)=>{if(name==='WEBGL_multi_draw'&&result)multi(gl,result);});
  patch(proto,'drawElements',(gl,[mode,count,type,offset])=>record(gl,'drawElements',mode,count,1,offset,type,1));
  patch(proto,'drawElementsInstanced',(gl,[mode,count,type,offset,instances])=>record(gl,'drawElementsInstanced',mode,count,instances,offset,type,1));
  patch(proto,'drawArrays',(gl,[mode,first,count])=>record(gl,'drawArrays',mode,count,1,first,null,1));
  patch(proto,'drawArraysInstanced',(gl,[mode,first,count,instances])=>record(gl,'drawArraysInstanced',mode,count,instances,first,null,1));
 }
 const raf=window.requestAnimationFrame;
 window.requestAnimationFrame=function(callback){return Reflect.apply(raf,this,[timestamp=>{
  if(timestamp!==lastTimestamp){lastTimestamp=timestamp;if(armed&&!armed.done){
   if(armed.open){armed.frames.push(armed.current);if(armed.frames.length>=armed.requested){armed.done=true;armed.open=false;}}
   if(!armed.done){armed.open=true;armed.current={timestamp,nativeCalls:0,logicalDraws:0,triangles:0};}
  }}return Reflect.apply(callback,window,[timestamp]);
 }]);};
 window.__drawAudit180={
  arm(label,frames){if(armed&&!armed.done)throw Error('Capture already active');if(!Number.isInteger(frames)||frames<1||frames>24)throw Error('24-frame cap');armed={label,requested:frames,done:false,open:false,current:null,error:null,frames:[],rows:new Map()};},
  read(){return armed?{label:armed.label,requested:armed.requested,done:armed.done,error:armed.error,frames:armed.frames,groups:[...armed.rows.values()].sort((a,b)=>b.triangles-a.triangles)}:null;}
 };
})();
