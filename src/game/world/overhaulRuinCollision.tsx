import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import {cityDistrict} from '../../../shared/cityDistrict';
import {OverhaulRuinSurfaces,registerOverhaulRuinSurfaces} from '../../../shared/overhaulRuinSurfaces';
import {runtime} from '../runtime';
import type {CityPresentation} from './cityPresentation';
import {OverhaulRuinCollisionOwner,overhaulRuinCollisionRegistry as registry} from './overhaulRuinCollisionOwner';
export {OverhaulRuinCollisionOwner,overhaulRuinGuestCollision} from './overhaulRuinCollisionOwner';

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
