/** Renderer-independent, deterministic structural compilation. Metres, Y up. */
export type StructuralClass = 'column' | 'beam' | 'slab' | 'wall' | 'roof' | 'glazing' | 'equipment';
export type Tuple3 = readonly [number, number, number];
export interface StructuralPart {
  readonly id: string;
  readonly structureId: string;
  readonly kind: StructuralClass;
  readonly center: Tuple3;
  readonly size: Tuple3;
  readonly material: string;
  readonly collision: boolean;
}
export interface ColliderBox { readonly id: string; readonly min: Tuple3; readonly max: Tuple3 }
export interface CompiledDistrict {
  readonly revision: string;
  readonly parts: readonly StructuralPart[];
  readonly colliders: readonly ColliderBox[];
  readonly bounds: number;
}
export const DISTRICT_REVISION = 'benchmark-district-v1';
export const MATERIALS: Readonly<Record<string, { color: string; roughness: number; metalness: number }>> = {
  concrete: { color: '#8a9399', roughness: .86, metalness: .03 },
  steel: { color: '#435563', roughness: .48, metalness: .7 },
  brick: { color: '#a97766', roughness: .92, metalness: .02 },
  glass: { color: '#395e71', roughness: .25, metalness: .45 },
  copper: { color: '#b88c5d', roughness: .6, metalness: .5 },
};
export function compileDistrict(): CompiledDistrict {
  const parts: StructuralPart[] = [], colliders: ColliderBox[] = [];
  const add = (structureId: string, suffix: string, kind: StructuralClass, center: Tuple3, size: Tuple3, material: string, collision = false) => {
    const id = `${structureId}/${suffix}`;
    parts.push({ id, structureId, kind, center, size, material, collision });
    if (collision) colliders.push({ id, min: center.map((n, i) => n - size[i] / 2) as unknown as Tuple3, max: center.map((n, i) => n + size[i] / 2) as unknown as Tuple3 });
  };
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
    const id = `block-${row}-${col}`, x = (col - 1.5) * 30, z = (row - 1.5) * 30;
    const floors = 2 + (row + col) % 4, width = 17, depth = 18, floorHeight = 5;
    const facade = (row + col) % 2 ? 'brick' : 'concrete';
    for (let floor = 0; floor < floors; floor++) {
      const y = floor * floorHeight;
      add(id, `slab-${floor}`, 'slab', [x, y + .2, z], [width, .4, depth], 'concrete', true);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        add(id, `column-${floor}-${sx}-${sz}`, 'column', [x + sx * (width / 2 - .5), y + 2.7, z + sz * (depth / 2 - .5)], [.9, 5, .9], 'steel', true);
      }
      for (const side of [-1, 1]) {
        add(id, `beam-z-${floor}-${side}`, 'beam', [x, y + 4.7, z + side * depth / 2], [width, .55, .6], 'steel', true);
        add(id, `beam-x-${floor}-${side}`, 'beam', [x + side * width / 2, y + 4.7, z], [.6, .55, depth], 'steel', true);
        add(id, `wall-z-${floor}-${side}`, 'wall', [x, y + 1.2, z + side * depth / 2], [width, 2, .45], facade, true);
        add(id, `wall-x-${floor}-${side}`, 'wall', [x + side * width / 2, y + 1.2, z], [.45, 2, depth], facade, true);
        for (let bay = 0; bay < 5; bay++) {
          const offset = (bay - 2) * 3.1;
          add(id, `window-z-${floor}-${side}-${bay}`, 'glazing', [x + offset, y + 3.2, z + side * (depth / 2 + .03)], [2.4, 1.8, .15], 'glass');
          add(id, `window-x-${floor}-${side}-${bay}`, 'glazing', [x + side * (width / 2 + .03), y + 3.2, z + offset], [.15, 1.8, 2.4], 'glass');
        }
      }
    }
    add(id, 'roof', 'roof', [x, floors * floorHeight + .15, z], [width + .7, .3, depth + .7], 'steel', true);
    add(id, 'plant', 'equipment', [x + 3, floors * floorHeight + 1.1, z - 3], [4, 1.7, 3], 'copper', true);
    // Navigation uses sealed building hulls. Structural pieces remain the source
    // representation; a future authority compiler can choose finer collision.
    colliders.push({ id: `${id}/navigation-hull`, min: [x - width / 2, 0, z - depth / 2], max: [x + width / 2, floors * floorHeight, z + depth / 2] });
  }
  for (let i = 0; i < 24; i++) {
    const x = i % 2 ? 4 : -4, z = -58 + i * 5;
    add('street', `barrier-${i}`, 'equipment', [x, .65, z], [1.3, 1.3, 2.2], 'copper', true);
  }
  return { revision: DISTRICT_REVISION, parts, colliders, bounds: 115 };
}
