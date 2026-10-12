/** The only authored (.8 scale, Z-up) / native (metres, Y-up) boundary. */
export type V3 = readonly [number, number, number];
export interface NativePoint { readonly space: 'native-m-y-up'; readonly value: V3 }
export interface SourcePoint { readonly space: 'authored-unit-z-up'; readonly value: V3 }
export const SOURCE_SCALE = 0.8;
export const nativePoint = (value: V3): NativePoint => ({ space: 'native-m-y-up', value });
export const sourceToNative = (p: SourcePoint): NativePoint => nativePoint([p.value[0] * .8, p.value[2] * .8, -p.value[1] * .8]);
export const nativeToSource = (p: NativePoint): SourcePoint => ({ space: 'authored-unit-z-up', value: [p.value[0] / .8, -p.value[2] / .8, p.value[1] / .8] });
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: V3): number => Math.hypot(...a);
export const unit = (a: V3): V3 => mul(a, 1 / length(a));
export const finite = (a: V3): boolean => a.every(Number.isFinite);
/** Bounding acceleration/jerk changes a force request, never a position or chain reach. */
export const boundedVector = (a: V3, maximum: number): V3 => length(a) > maximum ? mul(a, maximum / length(a)) : a;
export const yawRotate = (p: V3, yaw: number): V3 => [Math.cos(yaw) * p[0] + Math.sin(yaw) * p[2], p[1], -Math.sin(yaw) * p[0] + Math.cos(yaw) * p[2]];
export const xRotate = (p: V3, a: number): V3 => [p[0], Math.cos(a) * p[1] - Math.sin(a) * p[2], Math.sin(a) * p[1] + Math.cos(a) * p[2]];
export const angleDifference = (a: number, b: number): number => Math.atan2(Math.sin(a - b), Math.cos(a - b));
