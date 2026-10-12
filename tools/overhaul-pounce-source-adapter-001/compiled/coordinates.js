export const SOURCE_SCALE = 0.8;
export const nativePoint = (value) => ({ space: 'native-m-y-up', value });
export const sourceToNative = (p) => nativePoint([p.value[0] * .8, p.value[2] * .8, -p.value[1] * .8]);
export const nativeToSource = (p) => ({ space: 'authored-unit-z-up', value: [p.value[0] / .8, -p.value[2] / .8, p.value[1] / .8] });
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a) => Math.hypot(...a);
export const unit = (a) => mul(a, 1 / length(a));
export const finite = (a) => a.every(Number.isFinite);
/** Bounding acceleration/jerk changes a force request, never a position or chain reach. */
export const boundedVector = (a, maximum) => length(a) > maximum ? mul(a, maximum / length(a)) : a;
export const yawRotate = (p, yaw) => [Math.cos(yaw) * p[0] + Math.sin(yaw) * p[2], p[1], -Math.sin(yaw) * p[0] + Math.cos(yaw) * p[2]];
export const xRotate = (p, a) => [p[0], Math.cos(a) * p[1] - Math.sin(a) * p[2], Math.sin(a) * p[1] + Math.cos(a) * p[2]];
export const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
