import assert from 'node:assert/strict';
import {Evidence} from './evidence';
const bytes=new ArrayBuffer(4),view=new DataView(bytes);
export function f32Bits(n:number){view.setFloat32(0,n,true);return view.getUint32(0,true);}
// Positive finite masses have monotonically ordered IEEE754 float32 bit patterns.
// Source input rounding plus density/volume division/product and mass readback
// can introduce successive nearest-f32 rounding. Four ULPs is a representation
// ceiling for this fixed single-hull allocation/readback, never a gameplay tolerance.
const MASS_MAX_ULPS=4;
export function assertNativeMass(e:Evidence,actual:number,factory:number,context:unknown){
  const expected=Math.fround(factory),actualBits=f32Bits(actual),expectedBits=f32Bits(expected),ulpDistance=Math.abs(actualBits-expectedBits);
  e.row('explicit-native-float32-mass-representation',{context,actual,factory,expectedFloat32:expected,actualBits,expectedBits,ulpDistance,maxAllocationReadbackUlps:MASS_MAX_ULPS,meaning:'numeric representation only; source mass unchanged'});
  assert.ok(Number.isFinite(actual)&&actual>0&&Number.isFinite(factory)&&factory>0);assert.equal(actual,Math.fround(actual));assert.ok(ulpDistance<=MASS_MAX_ULPS,'native factory mass outside bounded float32 allocation representation');
}
export function assertNativeFriction(e:Evidence,actual:number,factory:number,context:unknown){
  e.row('explicit-native-float32-friction-representation',{context,actual,factory,expectedFloat32:Math.fround(factory),actualBits:f32Bits(actual),expectedBits:f32Bits(factory)});assert.equal(actual,Math.fround(factory));
}
