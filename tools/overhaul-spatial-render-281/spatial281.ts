import type {InstancedMesh} from 'three';

// Partition ownership records, never geometry or gameplay components. Bounds
// include each complete authored instance even when it crosses a cell edge.
export const SPATIAL_CELL281=32;
export function spatialPlacements281<T extends {block:{position:readonly number[]}}>(placements:readonly T[]):{key:string;placements:T[]}[]{
 const cells=new Map<string,T[]>();
 for(const p of placements){const [x,,z]=p.block.position;if(!Number.isFinite(x)||!Number.isFinite(z))throw Error('281 nonfinite component position');const key=Math.floor(x/SPATIAL_CELL281)+','+Math.floor(z/SPATIAL_CELL281);let values=cells.get(key);if(!values){values=[];cells.set(key,values);}values.push(p);}
 return [...cells].map(([key,placements])=>({key,placements}));
}
export function refreshInstanceBounds281(mesh:InstancedMesh):void {
 // THREE does not refresh an existing instance sphere after setMatrixAt.
 // Call after compaction/ruin pose writes, including removals and restoration.
 mesh.computeBoundingSphere();
 const s=mesh.boundingSphere;
 if(mesh.count>0&&(!s||![s.center.x,s.center.y,s.center.z,s.radius].every(Number.isFinite)||s.radius<0))throw Error('281 invalid active-instance sphere');
}
