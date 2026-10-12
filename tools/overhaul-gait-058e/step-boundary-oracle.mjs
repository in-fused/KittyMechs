// Pure installed Three.js math oracle: no browser/GLTF load/render/export/build.
import {DiscreteInterpolant} from '../../node_modules/three/src/math/interpolants/DiscreteInterpolant.js';
const cases=[];
for(const [path,rows] of [['translation',[[10,20,30],[110,120,130],[210,220,230]]],['rotation',[[0,0,0,1],[0,0,1,0],[0,1,0,0]]]]){
 const times=[1,3,6],samples=rows.flat(),oracle=new DiscreteInterpolant(new Float64Array(times),new Float64Array(samples),rows[0].length);
 // Include exact keys and nonmonotonic queries to exercise cached seek/clamps.
 for(const t of [.5,1,1.1,2.999,3,3.001,5.999,6,7,2,1])cases.push({path,t,times,values:rows,expected:[...oracle.evaluate(t)]});
}
process.stdout.write(JSON.stringify({primarySource:'installed Three DiscreteInterpolant/Interpolant; GLTFLoader STEP->InterpolateDiscrete',cases}));
