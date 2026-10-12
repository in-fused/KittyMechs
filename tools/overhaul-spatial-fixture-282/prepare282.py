from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;base=r/'tools/overhaul-spatial-render-281'
assert not (f/'test282.ts').exists()
t=(base/'test281.ts').read_text(encoding='utf-8').replace("import {BufferGeometry,Float32BufferAttribute", "import {BufferGeometry,BufferAttribute,Float32BufferAttribute")
t=t.replace("from './spatial281'","from '../overhaul-spatial-render-281/spatial281'")
old=""" const a=gltf.accessors[primitive.attributes.POSITION],v=gltf.bufferViews[a.bufferView];assert.equal(a.componentType,5126);assert.equal(a.type,'VEC3');assert(!a.sparse&&!v.extensions);
 const positions:number[]=[];for(let i=0;i<a.count;i++)for(let k=0;k<3;k++)positions.push(bin.readFloatLE((v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??12)+k*4));
 geometries.push(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(positions,3)));"""
new=""" const a=gltf.accessors[primitive.attributes.POSITION],v=gltf.bufferViews[a.bufferView];assert([5122,5126].includes(a.componentType));assert.equal(a.type,'VEC3');assert(!a.sparse&&!v.extensions);assert.equal(v.buffer??0,0);
 const size=a.componentType===5122?2:4,stride=v.byteStride??3*size;assert(stride>=3*size&&stride%size===0);assert(((v.byteOffset??0)+(a.byteOffset??0))%size===0);
 const positions:number[]=[];for(let i=0;i<a.count;i++)for(let k=0;k<3;k++){const offset=(v.byteOffset??0)+(a.byteOffset??0)+i*stride+k*size;assert(offset+size<=bin.length&&offset+size<=(v.byteOffset??0)+v.byteLength);positions.push(a.componentType===5122?bin.readInt16LE(offset):bin.readFloatLE(offset));}
 const raw=a.componentType===5122?new Int16Array(positions):new Float32Array(positions);assert(a.componentType!==5126||!a.normalized);
 geometries.push(new BufferGeometry().setAttribute('position',new BufferAttribute(raw,3,a.normalized===true)));"""
assert t.count(old)==1;t=t.replace(old,new).replace("'tools/overhaul-spatial-render-281/result281.json'","'tools/overhaul-spatial-fixture-282/result282.json'")
(f/'test282.ts').write_text(t,encoding='utf-8')
check=(base/'check281.py').read_text(encoding='utf-8').replace('overhaul-spatial-render-281/test281.ts','overhaul-spatial-fixture-282/test282.ts').replace('terminal281.json','terminal282.json')
check=check.replace("pre=json.loads((f/'preimage281.json').read_text(encoding='utf-8'))", "pre=json.loads((r/'tools/overhaul-spatial-render-281/preimage281.json').read_text(encoding='utf-8'))")
check=check.replace("assert row(r/pre['source']['path'])==pre['source']","assert row(r/pre['source']['path'])==pre['source'];assert row(r/pre['candidate']['path'])==pre['candidate']")
(f/'check282.py').write_text(check,encoding='utf-8')
print('282 fixture-only component representation correction prepared; unchanged281 runtime')
