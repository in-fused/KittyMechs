import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const calls=[],queue=[],extension={multiDrawElementsWEBGL(...args){calls.push({api:'multi',receiver:this,args});return 'multi-result';}};
class GL {
 useProgram(...args){calls.push({api:'useProgram',receiver:this,args});return 7;}
 bindVertexArray(){}bindBuffer(){}bindFramebuffer(){}bufferData(){}shaderSource(){}attachShader(){}
 getExtension(name){return name==='WEBGL_multi_draw'?extension:null;}
 drawElements(...args){calls.push({api:'elements',receiver:this,args});return 'draw-result';}
 drawElementsInstanced(...args){calls.push({api:'instanced',receiver:this,args});return 'instance-result';}
 drawArrays(){}drawArraysInstanced(){}
}
const window={requestAnimationFrame(callback){queue.push(callback);return 19;}},context={window,WebGLRenderingContext:GL,WebGL2RenderingContext:GL};
runInNewContext(readFileSync(new URL('./counter180.js',import.meta.url),'utf8'),context);
const gl=new GL(),program={},buffer={},vao={},shader={};
assert.equal(gl.useProgram(program),7);assert.equal(calls.at(-1).receiver,gl);
gl.bindVertexArray(vao);gl.bindBuffer(34963,buffer);gl.bufferData(34963,new Uint16Array(300));
gl.shaderSource(shader,'#define SHADER_NAME Fixture\n#define USE_SKINNING\n');gl.attachShader(program,shader);
window.__drawAudit180.arm('fixture',2);
function frame(t){let actualThis;assert.equal(window.requestAnimationFrame(function(){actualThis=this;assert.equal(gl.drawElements(4,300,5123,0),'draw-result');assert.equal(gl.drawElementsInstanced(4,6,5123,600,10),'instance-result');assert.equal(gl.getExtension('WEBGL_multi_draw').multiDrawElementsWEBGL(4,new Int32Array([3,6]),0,5123,new Int32Array([0,6]),0,2),'multi-result');}),19);queue.shift().call(window,t);assert.equal(actualThis,window);}
frame(100);frame(116);frame(132);
const report=window.__drawAudit180.read();assert.equal(report.done,true);assert.equal(report.frames.length,2);assert.equal(report.error,null);
for(const f of report.frames){assert.equal(f.nativeCalls,3);assert.equal(f.logicalDraws,4);assert.equal(f.triangles,123);}
assert.equal(report.groups.reduce((n,g)=>n+g.triangles,0),246);assert.equal(report.groups.filter(g=>g.indexBufferBytes===600).length,4);
assert.equal(report.groups.every(g=>g.skinned&&g.shaderNames.includes('Fixture')),true);
assert.equal(calls.filter(c=>c.api==='multi').every(c=>c.receiver===extension),true);
assert.throws(()=>window.__drawAudit180.arm('unbounded',25));
console.log(JSON.stringify({status:'PASS',finiteFrames:2,unchangedDelegation:true,perFrameNativeCalls:3,perFrameLogicalDraws:4,perFrameTriangles:123,boundReject:true}));
