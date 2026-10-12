import type { CityBlock, CityDistrict } from './cityDistrict';
import { getOverhaulComponent } from './overhaulDistrict';
import {getOverhaulArchitectureComponent} from './overhaulArchitecture';
import type { StructureState, Vec3 } from './types';

export interface OverhaulCellRef { structureId: string; cellId: number; blockId: string }
export interface OverhaulSupportCondition { refs: OverhaulCellRef[]; minIntact: number }
export interface OverhaulSupportNode extends OverhaulCellRef { block: CityBlock; conditions: OverhaulSupportCondition[]; maxHp: number }
export interface OverhaulSupportGraph { districtId: string; nodes: OverhaulSupportNode[]; byBlock: ReadonlyMap<string, OverhaulSupportNode>; byBank: ReadonlyMap<string, readonly OverhaulSupportNode[]> }
export interface DetachedOverhaulCluster {
  id: string; buildingId: string; persistent: true; center: Vec3;
  blockIds: string[]; cellRefs: OverhaulCellRef[]; blocks: CityBlock[];
  /** Source solids retained verbatim; offsets locate compound children around center. */
  parts: { blockId: string; offset: [number, number, number]; halfExtents: [number, number, number]; yaw: number; material: CityBlock['material']; maxHp: number }[];
  unsupportedBlockIds: string[];
}
export interface OverhaulSupportClosure {
  brokenBlockIds: string[];
  /** Includes directly damaged cells and every recursively unsupported cell. */
  brokenByBank: { structureId: string; cellIds: number[]; brokenMask: number }[];
  unsupportedBlockIds: string[];
  newlyDetachedBlockIds: string[];
  detachedClusters: DetachedOverhaulCluster[];
}
export function compileOverhaulSupport(district: CityDistrict): OverhaulSupportGraph {
  const nodes: OverhaulSupportNode[] = [], byBlock = new Map<string, OverhaulSupportNode>(), byBank = new Map<string, OverhaulSupportNode[]>();
  for (const bank of district.structures) {
    if (bank.cells.length > 32 || byBank.has(bank.id)) throw new Error(`Invalid bank: ${bank.id}`);
    const bankNodes: OverhaulSupportNode[] = [];
    for (let i = 0; i < bank.cells.length; i++) {
      const block = bank.cells[i];
      if (block.structureId !== bank.id || block.cellId !== i || byBlock.has(block.id)) throw new Error(`Invalid structural cell identity: ${block.id}`);
      const node: OverhaulSupportNode = { structureId: bank.id, cellId: i, blockId: block.id, block, conditions: [], maxHp: bank.maxHp };
      nodes.push(node); bankNodes.push(node); byBlock.set(block.id, node);
    }
    byBank.set(bank.id, bankNodes);
  }
  for (const node of nodes) for (const condition of node.block.support ? [node.block.support, ...(node.block.support.also ?? [])] : []) {
    const source = byBank.get(condition.structureId);
    if (!source || !Number.isInteger(condition.minIntact) || condition.minIntact < 1 || condition.minIntact > condition.cells.length || new Set(condition.cells).size !== condition.cells.length) throw new Error(`Invalid support condition: ${node.blockId}`);
    const refs = condition.cells.map(cellId => {
      const owner = source[cellId]; if (!owner) throw new Error(`Missing support cell: ${condition.structureId}/${cellId}`);
      return { structureId: owner.structureId, cellId, blockId: owner.blockId };
    });
    node.conditions.push({ refs, minIntact: condition.minIntact });
  }
  // An accidental cyclic floating island cannot certify its own support. Only
  // grounded roots and conditions satisfied by grounded ancestry are admitted.
  const admitted = new Set(nodes.filter(n => !n.conditions.length).map(n => n.blockId));
  let changed = true;
  while (changed) { changed = false; for (const node of nodes) if (!admitted.has(node.blockId) && node.conditions.every(c => c.refs.filter(r => admitted.has(r.blockId)).length >= c.minIntact)) { admitted.add(node.blockId); changed = true; } }
  if (admitted.size !== nodes.length) throw new Error('Support graph contains ungrounded dependency cycle');
  nodes.sort((a, b) => a.blockId.localeCompare(b.blockId));
  return { districtId: district.id, nodes, byBlock, byBank };
}
function reference(node: OverhaulSupportNode): OverhaulCellRef { return { structureId: node.structureId, cellId: node.cellId, blockId: node.blockId }; }
function stableHash(ids: readonly string[]) {
  let hash = 2166136261;
  for (const id of ids) for (const c of `${id}\n`) { hash ^= c.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
function touches(a: CityBlock, b: CityBlock) {
  return a.position.every((value, axis) => Math.abs(value - b.position[axis]) <= a.halfExtents[axis] + b.halfExtents[axis] + .12);
}
function clusters(graph: OverhaulSupportGraph, newlyDetached: ReadonlySet<string>, unsupported: ReadonlySet<string>): DetachedOverhaulCluster[] {
  const nodes = graph.nodes.filter(n => newlyDetached.has(n.blockId)), groups = new Map<string, OverhaulSupportNode[]>();
  for (const node of nodes) { const prior = groups.get(node.block.buildingId) ?? []; prior.push(node); groups.set(node.block.buildingId, prior); }
  const result: DetachedOverhaulCluster[] = [];
  for (const [buildingId, members] of groups) {
    const remaining = new Set(members.map(n => n.blockId));
    while (remaining.size) {
      const seed = members.find(n => remaining.has(n.blockId))!, component: OverhaulSupportNode[] = [seed]; remaining.delete(seed.blockId);
      for (let i = 0; i < component.length; i++) {
        const a = component[i];
        for (const b of members) if (remaining.has(b.blockId)) {
          const connected = touches(a.block, b.block) || a.conditions.some(c => c.refs.some(r => r.blockId === b.blockId)) || b.conditions.some(c => c.refs.some(r => r.blockId === a.blockId));
          if (connected) { remaining.delete(b.blockId); component.push(b); }
        }
      }
      component.sort((a, b) => a.blockId.localeCompare(b.blockId));
      let volume = 0, x = 0, y = 0, z = 0;
      for (const node of component) { const weight = node.block.halfExtents.reduce((product, n) => product * n, 8); volume += weight; x += node.block.position[0] * weight; y += node.block.position[1] * weight; z += node.block.position[2] * weight; }
      const center = { x: x / volume, y: y / volume, z: z / volume }, blockIds = component.map(n => n.blockId);
      result.push({ id: `${buildingId}:detached:${stableHash(blockIds)}`, buildingId, persistent: true, center, blockIds, cellRefs: component.map(reference), blocks: component.map(n => n.block), unsupportedBlockIds: blockIds.filter(id => unsupported.has(id)), parts: component.map(n => ({ blockId: n.blockId, offset: [n.block.position[0] - center.x, n.block.position[1] - center.y, n.block.position[2] - center.z], halfExtents: [...n.block.halfExtents], yaw: n.block.yaw, material: n.block.material, maxHp: n.maxHp })) });
    }
  }
  return result.sort((a, b) => a.id.localeCompare(b.id));
}
/** Pure deterministic closure. Does not mutate wire state or create physics.
 * Feed the persistent retired-source ID set to avoid respawning old chunks. */
export function resolveOverhaulSupport(graph: OverhaulSupportGraph, states: readonly StructureState[], retiredBlockIds: ReadonlySet<string> = new Set()): OverhaulSupportClosure {
  const statesById = new Map(states.map(s => [s.id, s])), broken = new Set<string>(), unsupported = new Set<string>();
  for (const node of graph.nodes) {
    const state = statesById.get(node.structureId);
    // Missing streamed wire state means the initial intact bank, matching the
    // existing cityBlockActive convention; a retired source remains retired.
    if (retiredBlockIds.has(node.blockId) || state && (((state.brokenMask >>> node.cellId) & 1) !== 0 || state.hp[node.cellId] <= 0)) broken.add(node.blockId);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of graph.nodes) if (!broken.has(node.blockId) && node.conditions.some(c => c.refs.filter(r => !broken.has(r.blockId)).length < c.minIntact)) { broken.add(node.blockId); unsupported.add(node.blockId); changed = true; }
  }
  const brokenBlockIds = [...broken].sort(), newlyDetachedBlockIds = brokenBlockIds.filter(id => !retiredBlockIds.has(id));
  const brokenByBank = [...graph.byBank].sort(([a], [b]) => a.localeCompare(b)).map(([structureId, nodes]) => {
    const cellIds = nodes.filter(n => broken.has(n.blockId)).map(n => n.cellId).sort((a, b) => a - b);
    return { structureId, cellIds, brokenMask: cellIds.reduce((mask, id) => (mask | (1 << id)) >>> 0, 0) };
  }).filter(bank => bank.cellIds.length > 0);
  return { brokenBlockIds, brokenByBank, unsupportedBlockIds: [...unsupported].sort(), newlyDetachedBlockIds, detachedClusters: clusters(graph, new Set(newlyDetachedBlockIds), unsupported) };
}

/** Apply once per authority transaction before collider retirement/publication.
 * The existing wire shape and uint32 mask remain unchanged. */
export function commitOverhaulSupport(closure: OverhaulSupportClosure, states: StructureState[]): string[] {
  const changed: string[] = [], statesById = new Map(states.map(s => [s.id, s]));
  for (const bank of closure.brokenByBank) {
    const state = statesById.get(bank.structureId); if (!state) continue;
    let bankChanged = false;
    for (const cellId of bank.cellIds) if (state.hp[cellId] > 0 || ((state.brokenMask >>> cellId) & 1) === 0) { state.hp[cellId] = 0; state.brokenMask = (state.brokenMask | (1 << cellId)) >>> 0; bankChanged = true; }
    if (bankChanged) { state.revision++; changed.push(state.id); }
  }
  return changed;
}
export function overhaulContactOwnership(block: CityBlock): { wallAnchorIds: string[]; roofAnchorIds: string[] } {
  const architecture=getOverhaulArchitectureComponent(block);
  if(architecture)return{wallAnchorIds:[...architecture.wallFaceIds],roofAnchorIds:[...architecture.roofFaceIds]};
  const kind = getOverhaulComponent(block)?.kind;
  return { wallAnchorIds: block.anchorId && (kind === 'facade' || kind === 'column') ? [block.anchorId] : [], roofAnchorIds: block.part === 'deck' ? [...(block.anchorIds ?? (block.anchorId ? [block.anchorId] : []))] : [] };
}
export interface OverhaulContactReceipt { generation: number; blockId: string; structureId: string; cellId: number; revision: number; anchorId: string; surface: 'wall' | 'roof' }
export function overhaulContactLive(receipt: OverhaulContactReceipt, graph: OverhaulSupportGraph, states: readonly StructureState[], generation: number, closure?: OverhaulSupportClosure): boolean {
  const node = graph.byBlock.get(receipt.blockId), state = states.find(s => s.id === receipt.structureId);
  if (receipt.generation !== generation || !node || node.structureId !== receipt.structureId || node.cellId !== receipt.cellId || state && (receipt.revision > state.revision || state.hp[receipt.cellId] <= 0 || ((state.brokenMask >>> receipt.cellId) & 1) !== 0)) return false;
  const broken = closure?.brokenBlockIds ?? resolveOverhaulSupport(graph, states).brokenBlockIds;
  if (broken.includes(receipt.blockId)) return false;
  const ownership = overhaulContactOwnership(node.block);
  return (receipt.surface === 'wall' ? ownership.wallAnchorIds : ownership.roofAnchorIds).includes(receipt.anchorId);
}
