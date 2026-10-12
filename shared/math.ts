import type { Vec3 } from './types';
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const horizontalDistance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.z - b.z);
export const angleLerp = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
export const direction = (yaw: number, pitch = 0): Vec3 => ({ x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) });
export function randomSeed(seed: number) {
  let state = seed >>> 0;
  return () => { state += 0x6d2b79f5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function segmentSphere(a: Vec3, b: Vec3, center: Vec3, radius: number): number | null {
  const dx = b.x-a.x, dy=b.y-a.y, dz=b.z-a.z;
  const ox=a.x-center.x, oy=a.y-center.y, oz=a.z-center.z;
  const aa=dx*dx+dy*dy+dz*dz, bb=2*(ox*dx+oy*dy+oz*dz), cc=ox*ox+oy*oy+oz*oz-radius*radius;
  if (cc <= 0) return 0;
  const disc=bb*bb-4*aa*cc;
  if (disc < 0 || aa < 1e-9) return null;
  const t=(-bb-Math.sqrt(disc))/(2*aa);
  return t >= 0 && t <= 1 ? t : null;
}
/** Crosshair proxy for a vertical hull; authority still uses its actual collider. */
export function segmentCylinder(a:Vec3,b:Vec3,center:Vec3,radius:number,halfHeight:number):number|null {
  const dx=b.x-a.x,dz=b.z-a.z,ox=a.x-center.x,oz=a.z-center.z;
  const aa=dx*dx+dz*dz,bb=2*(ox*dx+oz*dz),cc=ox*ox+oz*oz-radius*radius;
  let enter=0,exit=1;
  if(aa<1e-9){if(cc>0)return null;}
  else {const disc=bb*bb-4*aa*cc;if(disc<0)return null;const root=Math.sqrt(disc);enter=Math.max(enter,(-bb-root)/(2*aa));exit=Math.min(exit,(-bb+root)/(2*aa));}
  const dy=b.y-a.y,oy=a.y-center.y;
  if(Math.abs(dy)<1e-9){if(Math.abs(oy)>halfHeight)return null;}
  else {const first=(-halfHeight-oy)/dy,second=(halfHeight-oy)/dy;enter=Math.max(enter,Math.min(first,second));exit=Math.min(exit,Math.max(first,second));}
  return enter<=exit&&enter<=1&&exit>=0?enter:null;
}
