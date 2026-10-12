import type { ColliderBox, CompiledDistrict } from './district';

export interface InputCommand { forward: boolean; back: boolean; left: boolean; right: boolean; jump: boolean; transform: boolean }
export interface Pose { x: number; y: number; z: number; yaw: number; speed: number; grounded: boolean; stance: 'quad' | 'upright'; stanceChangedAt: number }
export const emptyInput = (): InputCommand => ({ forward: false, back: false, left: false, right: false, jump: false, transform: false });
const initialPose = (): Pose => ({ x: 0, y: 0, z: 35, yaw: Math.PI, speed: 0, grounded: true, stance: 'quad', stanceChangedAt: -100 });
/** This isolated authority measures scheduling; it does not replace Rapier or
 * the retained game's networking / collision / combat implementation. */
export class BenchmarkAuthority {
  readonly fixedStep = 1 / 60;
  readonly previous = initialPose();
  readonly current = initialPose();
  tick = 0;
  private velocityY = 0;
  private jumpHeld = false;
  private transformHeld = false;
  private readonly colliders: readonly ColliderBox[];
  constructor(private readonly district: CompiledDistrict) {
    this.colliders = district.colliders.filter(c => c.id.endsWith('/navigation-hull') || c.id.startsWith('street/'));
  }
  reset() { Object.assign(this.previous, initialPose()); Object.assign(this.current, initialPose()); this.tick = 0; this.velocityY = 0; this.jumpHeld = false; this.transformHeld = false; }
  step(input: Readonly<InputCommand>, cameraYaw: number) {
    const p = this.current, dt = this.fixedStep;
    Object.assign(this.previous, p);
    if (input.transform && !this.transformHeld && this.tick / 60 - p.stanceChangedAt >= .7) {
      const obstructed = this.colliders.some(c => p.y + 2.6 < c.max[1] && p.y + 3.8 > c.min[1] && p.x + 1.4 > c.min[0] && p.x - 1.4 < c.max[0] && p.z + 1.4 > c.min[2] && p.z - 1.4 < c.max[2]);
      if (p.stance === 'upright' || !obstructed) { p.stance = p.stance === 'quad' ? 'upright' : 'quad'; p.stanceChangedAt = this.tick / 60; }
    }
    this.transformHeld = input.transform;
    let right = Number(input.right) - Number(input.left), forward = Number(input.forward) - Number(input.back);
    const length = Math.hypot(right, forward); if (length > 0) { right /= length; forward /= length; }
    const speed = 7.6 * (p.stance === 'upright' ? .64 : 1);
    const dx = (right * Math.cos(cameraYaw) - forward * Math.sin(cameraYaw)) * speed * dt;
    const dz = (-right * Math.sin(cameraYaw) - forward * Math.cos(cameraYaw)) * speed * dt;
    if (input.jump && !this.jumpHeld && p.grounded) { this.velocityY = p.stance === 'upright' ? 5.76 : 12.2; p.grounded = false; }
    this.jumpHeld = input.jump;
    const blocked = (x: number, z: number) => this.colliders.some(c => p.y + .2 < c.max[1] && p.y + (p.stance === 'upright' ? 3.8 : 2.6) > c.min[1] && x + 1.4 > c.min[0] && x - 1.4 < c.max[0] && z + 1.4 > c.min[2] && z - 1.4 < c.max[2]);
    if (!blocked(p.x + dx, p.z)) p.x += dx;
    if (!blocked(p.x, p.z + dz)) p.z += dz;
    p.x = Math.max(-this.district.bounds, Math.min(this.district.bounds, p.x));
    p.z = Math.max(-this.district.bounds, Math.min(this.district.bounds, p.z));
    this.velocityY -= 22 * dt;
    const nextY = p.y + this.velocityY * dt;
    let floor = 0;
    for (const c of this.colliders) if (p.y >= c.max[1] - .01 && nextY <= c.max[1] && p.x > c.min[0] - 1 && p.x < c.max[0] + 1 && p.z > c.min[2] - 1 && p.z < c.max[2] + 1) floor = Math.max(floor, c.max[1]);
    p.y = Math.max(floor, nextY); p.grounded = p.y === floor && this.velocityY <= 0;
    if (p.grounded) this.velocityY = 0;
    p.speed = Math.hypot(p.x - this.previous.x, p.z - this.previous.z) / dt;
    if (p.speed > .01) p.yaw = Math.atan2(dx, dz);
    this.tick++;
  }
}
