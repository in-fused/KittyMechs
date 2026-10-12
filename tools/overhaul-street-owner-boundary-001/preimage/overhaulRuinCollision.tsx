import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import RAPIER from '@dimforge/rapier3d-compat';
import {cityBlockColliderDesc,trackStreetCollider} from '../../../shared/rainlineStreetAdmission';
import { cityDistrict, type CityDistrict } from '../../../shared/cityDistrict';
import { overhaulRuinPatches, parseOverhaulRuins, type OverhaulRuinState } from '../../../shared/overhaulRuins';
import {overhaulFragmentBlock,overhaulFragmentKey} from '../../../shared/overhaulFracture';
import {OverhaulRuinSurfaces,registerOverhaulRuinSurfaces} from '../../../shared/overhaulRuinSurfaces';
import { runtime } from '../runtime';
import type { CityPresentation } from './cityPresentation';

interface Proxy { body: RAPIER.RigidBody; collider: RAPIER.Collider; state: OverhaulRuinState }
const registry = new WeakMap<RAPIER.World, OverhaulRuinCollisionOwner>();
/** Pose-owned native guest collision; active proxies are kinematic and settled
 * proxies are fixed. No guest impulse, gravity simulation or hidden carrier. */
export class OverhaulRuinCollisionOwner {
  private proxies = new Map<number, Proxy>();
  private lastTick = -1;
  private disposed = false;
  private created = 0;
  private retired = 0;
  constructor(private world: RAPIER.World, readonly district: CityDistrict | null) {}
  sync(value: readonly OverhaulRuinState[], tick: number, time: number): boolean {
    if (this.disposed || !Number.isSafeInteger(tick) || tick < this.lastTick) return false;
    if (tick === this.lastTick) return true;
    const poses = parseOverhaulRuins(value, this.district, time); if (!poses) return false;
    const wanted = new Set(poses.map(p => overhaulFragmentKey(p.block,p.piece))), incoming: number[] = [];
    // Create the full incoming set before retiring old native support; rollback
    // leaves the previous presented set intact if allocation fails.
    try {
      for (const pose of poses) if (!this.proxies.has(overhaulFragmentKey(pose.block,pose.piece))) {
        const source = pose.piece===undefined?this.district!.blocks[pose.block]:overhaulFragmentBlock(this.district!.blocks[pose.block],pose.piece),key=overhaulFragmentKey(pose.block,pose.piece);
        const desc = pose.settled ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.kinematicPositionBased();
        const body = this.world.createRigidBody(desc.setTranslation(pose.position.x, pose.position.y, pose.position.z).setRotation(pose.rotation));
        let collider: RAPIER.Collider;
        try { collider = trackStreetCollider(this.world,source,this.world.createCollider(cityBlockColliderDesc(source).setFriction(.85).setRestitution(0), body)); }
        catch (error) { this.world.removeRigidBody(body); throw error; }
        this.proxies.set(key, { body, collider, state: pose }); incoming.push(key); this.created++;
      }
    } catch (error) { incoming.forEach(block => this.remove(block)); throw error; }
    for (const pose of poses) {
      const proxy = this.proxies.get(overhaulFragmentKey(pose.block,pose.piece))!;
      proxy.body.setBodyType(pose.settled ? RAPIER.RigidBodyType.Fixed : RAPIER.RigidBodyType.KinematicPositionBased, false);
      proxy.body.setTranslation(pose.position, false); proxy.body.setRotation(pose.rotation, false);
      if (!pose.settled) { proxy.body.setNextKinematicTranslation(pose.position); proxy.body.setNextKinematicRotation(pose.rotation); }
      proxy.state = pose;
    }
    for (const block of this.proxies.keys()) if (!wanted.has(block)) this.remove(block);
    this.world.propagateModifiedBodyPositionsToColliders(); this.lastTick = tick; return true;
  }
  collider(block: number,piece?:number): RAPIER.Collider | undefined { return this.proxies.get(overhaulFragmentKey(block,piece))?.collider; }
  handles(): Set<number> { return new Set([...this.proxies.values()].map(p => p.collider.handle)); }
  patches(settledOnly = true) {
    return [...this.proxies.values()].filter(p => !settledOnly || p.state.settled).flatMap(p => overhaulRuinPatches(p.state.piece===undefined?this.district!.blocks[p.state.block]:overhaulFragmentBlock(this.district!.blocks[p.state.block],p.state.piece), p.state).map(face => ({ ...face, colliderHandle: p.collider.handle })));
  }
  snapshot() { return { tick: this.lastTick, created: this.created, retired: this.retired, count: this.proxies.size, active: [...this.proxies.values()].filter(p => !p.state.settled).length, blocks: [...new Set([...this.proxies.values()].map(p=>p.state.block))].sort((a, b) => a - b) }; }
  private remove(block: number) { const proxy = this.proxies.get(block); if (!proxy) return; if (proxy.body.isValid()) this.world.removeRigidBody(proxy.body); this.proxies.delete(block); this.retired++; }
  dispose() { if (this.disposed) return; for (const block of this.proxies.keys()) this.remove(block); this.disposed = true; }
}
export function overhaulRuinGuestCollision(world: RAPIER.World): OverhaulRuinCollisionOwner | undefined { return registry.get(world); }
/** Mount outside asset Suspense. World presents at -1.25; collision follows at
 * -1.2 before actor contact/animation at -1. Both art and collision consume the
 * exact same discrete CityPresentation snapshot, with no extrapolation. */
export function OverhaulRuinCollision({ seed, presentation, authority = runtime.authority }: { seed: number; presentation: CityPresentation; authority?: boolean }) {
  const { world } = useRapier(), owner = useRef<OverhaulRuinCollisionOwner | null>(null), generation = useRef(runtime.generation);
  const surfaces=useRef<OverhaulRuinSurfaces|null>(null);
  useLayoutEffect(() => {
    if (authority) return;
    generation.current = runtime.generation;
    const collision = new OverhaulRuinCollisionOwner(world, cityDistrict(seed)); owner.current = collision; registry.set(world, collision);
    const contact=new OverhaulRuinSurfaces(collision),releaseSurfaces=registerOverhaulRuinSurfaces(world,contact);surfaces.current=contact;
    const apply = () => { if (generation.current !== runtime.generation) return; const state = presentation.read(); if (state&&collision.sync(state.ruins ?? [], state.tick, state.time))contact.sync(); };
    const unregister = presentation.register(apply); apply();
    return () => { unregister();releaseSurfaces();collision.dispose();if(surfaces.current===contact)surfaces.current=null; if (registry.get(world) === collision) registry.delete(world); if (owner.current === collision) owner.current = null; };
  }, [world, seed, presentation, authority]);
  useFrame(() => { if (generation.current !== runtime.generation) return; const state = presentation.read(); if (state&&owner.current?.sync(state.ruins ?? [], state.tick, state.time))surfaces.current?.sync(); }, -1.2);
  return null;
}
