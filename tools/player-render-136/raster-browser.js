import * as T from 'three';
window.raster136=async shaders=>{
 const renderer=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(960,540);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;document.body.appendChild(renderer.domElement);
 const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info'),gpu=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
 const scene=new T.Scene();scene.fog=new T.FogExp2('#89999f',.0008);
 const camera=new T.PerspectiveCamera(62,960/540,.1,850);camera.position.set(0,5,0);camera.lookAt(0,5,-10);
 const uniform=()=>T.UniformsUtils.merge([T.UniformsLib.fog,{uSky:{value:new T.Color('#99acb6')},uClouds:{value:.6},uLight:{value:.8},uDrift:{value:[12,30]}}]);
 const materials=Object.fromEntries(Object.entries(shaders).map(([k,s])=>[k,new T.ShaderMaterial({uniforms:uniform(),vertexShader:s.vertex,fragmentShader:s.fragment,fog:true,side:T.BackSide,depthTest:true,depthWrite:false})]));
 const sky=new T.Mesh(new T.SphereGeometry(700,32,16),materials.baseline);sky.position.copy(camera.position);sky.frustumCulled=false;scene.add(sky);
 const near=new T.Mesh(new T.BoxGeometry(11,11,1),new T.MeshBasicMaterial({color:'#486673'}));near.position.set(-3,5,-12);
 const far=new T.Mesh(new T.BoxGeometry(200,150,10),new T.MeshBasicMaterial({color:'#bc6849'}));far.position.set(230,35,-760);
 const glass=new T.Mesh(new T.PlaneGeometry(4,3),new T.MeshBasicMaterial({color:'#eeb72c',transparent:true,opacity:.35,depthWrite:false}));glass.position.set(1,5,-7);
 const floor=new T.Mesh(new T.PlaneGeometry(1600,1600),new T.MeshBasicMaterial({color:'#565d61'}));floor.rotation.x=-Math.PI/2;floor.position.z=-600;
 const width=960,height=540,pixels=()=>{const p=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
 const render=label=>{sky.material=materials[label];sky.renderOrder=label==='baseline'?-100:1000;renderer.render(scene,camera);};
 const cases=[];
 for(const name of ['visible-sky','opaque-occlusion','mixed-horizon-far-transparent']){
  if(name!=='visible-sky')scene.add(near);
  if(name.startsWith('mixed'))scene.add(far,glass,floor);
  render('baseline');const a=pixels();render('candidate');const b=pixels();let different=0,maxDelta=0;
  for(let i=0;i<a.length;i++){const delta=Math.abs(a[i]-b[i]);if(delta)different++;maxDelta=Math.max(maxDelta,delta);}
  cases.push({name,differentChannels:different,maxByteDelta:maxDelta});
 }
 // Synchronous completion includes submission and GPU work; it is not an
 // exclusive GPU timer or an ordinary game frame-rate measurement.
 const timing=[];for(const label of ['baseline','candidate','candidate','baseline','baseline','candidate']){
  for(let i=0;i<8;i++)render(label);gl.finish();const began=performance.now();for(let i=0;i<20;i++){render(label);gl.finish();}timing.push({label,synchronizedMsPerFrame:(performance.now()-began)/20});
 }
 render('candidate');
 return{pixelEquivalent:cases.every(c=>c.differentChannels===0),cases,timing,renderer:gpu,buffer:[width,height],timer:'performance.now around render+gl.finish, fixed mixed scene',limits:'Static diagnostic scene with native Three/WebGL. Driver/backend-specific wall timings, shader warmup8frames; not exclusive GPU timing or game/client performance.'};
};
