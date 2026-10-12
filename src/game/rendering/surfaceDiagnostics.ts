import type { Texture } from 'three';
import type { SurfaceMaps } from './surfaceMaterials';

// These are committed hook leases, not claims about shader binding or GPU residency.
// The public reader returns detached metadata and never exposes mutable textures.
const leases = new Map<symbol, { seed: number; maps: SurfaceMaps }>();
export function registerSurfaceBank(seed: number, maps: SurfaceMaps) {
  const token = Symbol('surface-bank');
  leases.set(token, { seed, maps });
  return () => { leases.delete(token); };
}
function describe(texture: Texture) {
  const image = texture.image as { currentSrc?: string; src?: string; width?: number; height?: number } | undefined;
  return { uuid: texture.uuid, source: image?.currentSrc || image?.src || null, width: image?.width ?? null, height: image?.height ?? null, colorSpace: texture.colorSpace, wrapS: texture.wrapS, wrapT: texture.wrapT, anisotropy: texture.anisotropy };
}
export function readSurfaceBanks() {
  const banks = new Map<string, { seed: number; consumers: number; groundUsesRockNormal: boolean; roles: Record<keyof SurfaceMaps, ReturnType<typeof describe>> }>();
  for (const { seed, maps } of leases.values()) {
    const key = `${seed}:${Object.values(maps).map(texture => texture.uuid).join(':')}`;
    const bank = banks.get(key);
    if (bank) { bank.consumers++; continue; }
    const roles = Object.fromEntries(Object.entries(maps).map(([role, texture]) => [role, describe(texture)])) as Record<keyof SurfaceMaps, ReturnType<typeof describe>>;
    banks.set(key, { seed, consumers: 1, groundUsesRockNormal: maps.groundNormal === maps.rockNormal, roles });
  }
  return { mountedConsumers: leases.size, banks: [...banks.values()] };
}
