import type { CityBlock, CityBuilding, CityDistrict, CityStreet, CityStructure } from './cityDistrict';
import type { Vec3 } from './types';
import {OVERHAUL_GANTRY_PORTAL,overhaulPortalRailSpan} from './overhaulGantryPortal';
import {buildOverhaulDressing} from './overhaulDressing';
import {buildOverhaulArchitecture} from './overhaulArchitecture';
import {buildRainlineStreetAdmission,RAINLINE_STREET_SUPERSEDED} from './rainlineStreetAdmission';
import {buildRainlineExtraction039} from './rainlineExtraction039';

export const OVERHAUL_DISTRICT_REVISION = 'rainline-first-district-v4';
export type OverhaulComponentKind = 'foundation' | 'column' | 'slab' | 'facade' | 'beam' | 'bridge-deck' | 'rail' | 'fixture';
export type OverhaulSide = 'west' | 'east' | 'north' | 'south';
export interface OverhaulComponent {
  kind: OverhaulComponentKind; side?: OverhaulSide; usage: CityBuilding['style']; maxHp: number; loadBearing: boolean;
}
interface Lot { id: string; x: number; z: number; width: number; depth: number; height: number; usage: CityBuilding['style'] }
const FLOOR = -.08;
const point = (x: number, z: number, y = FLOOR): Vec3 => ({ x, y, z });
/** Authored parcels face the mission roads; no seeded admission or hidden box proxy. */
export const OVERHAUL_LOTS: readonly Lot[] = [
  { id: 'spawn-west', x: -30, z: 25, width: 16, depth: 16, height: 9, usage: 'works' },
  { id: 'spawn-east', x: 14, z: 25, width: 16, depth: 16, height: 8, usage: 'utility' },
  { id: 'relay-west-entry', x: -25, z: -16, width: 12, depth: 12, height: 9, usage: 'works' },
  { id: 'relay-east-entry', x: 23, z: -12, width: 16, depth: 16, height: 9, usage: 'transit' },
  { id: 'west-warehouse', x: -55, z: 14, width: 14, depth: 16, height: 12, usage: 'works' },
  { id: 'east-warehouse', x: 49, z: 14, width: 16, depth: 16, height: 12, usage: 'residential' },
  { id: 'west-workshop', x: -58, z: -12, width: 14, depth: 12, height: 10, usage: 'utility' },
  { id: 'east-workshop', x: 51, z: -12, width: 16, depth: 12, height: 12, usage: 'works' },
  { id: 'west-relay-yard', x: -30, z: -56, width: 16, depth: 18, height: 11, usage: 'transit' },
  { id: 'east-relay-yard', x: 22, z: -55, width: 16, depth: 16, height: 11, usage: 'works' },
  { id: 'west-midrise', x: -57, z: -55, width: 14, depth: 16, height: 14, usage: 'residential' },
  { id: 'east-midrise', x: 52, z: -55, width: 16, depth: 16, height: 10, usage: 'civic' },
  { id: 'core-west', x: -23, z: -86, width: 16, depth: 14, height: 12, usage: 'civic' },
  { id: 'core-east', x: 22, z: -86, width: 16, depth: 14, height: 14, usage: 'utility' },
  { id: 'core-west-works', x: -54, z: -86, width: 18, depth: 16, height: 10, usage: 'works' },
  { id: 'core-east-works', x: 51, z: -87, width: 18, depth: 18, height: 12, usage: 'works' },
  { id: 'rear-west', x: -28, z: 52, width: 16, depth: 16, height: 12, usage: 'residential' },
  { id: 'rear-east', x: 16, z: 52, width: 18, depth: 16, height: 14, usage: 'civic' },
  { id: 'rear-west-utility', x: -55, z: 44, width: 14, depth: 16, height: 10, usage: 'utility' },
  { id: 'rear-east-utility', x: 51, z: 43, width: 18, depth: 16, height: 12, usage: 'transit' },
];
const metadata = new Map<string, OverhaulComponent>();
let compiled: CityDistrict | null = null;
export function getOverhaulComponent(block: CityBlock | string): OverhaulComponent | undefined {
  if (!compiled) buildOverhaulDistrict(7734);
  return metadata.get(typeof block === 'string' ? block : block.id);
}

/** Same CityBlock is the visual solid, damage cell, collider recipe and grip
 * surface. Every structural node is carried by an existing <=32-cell bank. */
export function buildOverhaulDistrict(seed: number): CityDistrict | null {
  if (seed !== 7734) return null;
  if (compiled) return compiled;
  const blocks: CityBlock[] = [], buildings: CityBuilding[] = [], structures: CityStructure[] = [], streets: CityStreet[] = [];
  const street = (id: string, coordinates: readonly [number, number][], width: number) => {
    for (let i = 1; i < coordinates.length; i++) {
      const a = point(...coordinates[i - 1]), b = point(...coordinates[i]);
      const dx = b.x - a.x, dz = b.z - a.z;
      streets.push({ id: `7734:overhaul:street:${id}-${i}`, center: point((a.x + b.x) / 2, (a.z + b.z) / 2), yaw: Math.atan2(dx, dz), halfExtents: { x: width / 2, z: Math.hypot(dx, dz) / 2 }, points: [a, b], width });
    }
  };
  street('mission-spine', [[-8, 62], [-8, 32], [-8, 12], [0, -8], [0, -42], [0, -76], [0, -112]], 12);
  street('relay-link', [[-70, -35], [-46, -35], [-12, -35], [0, -42], [34, -30], [70, -30]], 8);
  street('west-return', [[-8, 12], [-30, 4], [-44, -14], [-46, -35]], 7);
  street('rear-cross', [[-41.5, 38.5], [36.5, 38.5]], 7);
  street('rear-service', [[-70, 66], [70, 66]], 7);
  street('core-cross', [[-70, -72], [70, -72]], 7);
  street('west-service', [[-43, 66], [-43, -70], [-38, -72], [-38, -102]], 6);
  street('east-service', [[36, 66], [36, -102]], 6);
  street('east-entry', [[34, -30], [36, -22], [36, 38.5]], 6);
  const bank = (buildingId: string, suffix: string, maxHp: number) => {
    const result: CityStructure = { id: `${buildingId}:${suffix}`, buildingId, maxHp, cells: [] }; structures.push(result); return result;
  };
  const cell = (owner: CityStructure, name: string, kind: OverhaulComponentKind, center: [number, number, number], halfExtents: [number, number, number], material: CityBlock['material'], usage: CityBuilding['style'], support?: CityBlock['support'], side?: OverhaulSide) => {
    if (owner.cells.length >= 32) throw new Error(`Structural bank exceeds wire mask: ${owner.id}`);
    const part: CityBlock['part'] = kind === 'foundation' ? 'foundation' : kind === 'slab' || kind === 'bridge-deck' ? 'deck' : kind === 'fixture' ? 'fixture' : 'cell';
    const block: CityBlock = { id: `${owner.buildingId}:${name}`, buildingId: owner.buildingId, part, position: center, halfExtents, yaw: 0, material, structureId: owner.id, cellId: owner.cells.length, ...(support ? { support } : {}) };
    owner.cells.push(block); blocks.push(block);
    metadata.set(block.id, { kind, ...(side ? { side } : {}), usage, maxHp: owner.maxHp, loadBearing: ['foundation', 'column', 'slab', 'beam', 'bridge-deck'].includes(kind) });
    return block;
  };
  const condition = (owner: CityStructure, cells: number[], minIntact = 1): NonNullable<CityBlock['support']> => ({ structureId: owner.id, cells, minIntact });
  for (const lot of OVERHAUL_LOTS) {
    const { x, z, width, depth, height, usage } = lot, id = `7734:overhaul:${lot.id}`;
    const foundation = bank(id, 'foundation-bank', 320), frame = bank(id, 'frame-bank', 140), roofBank = bank(id, 'roof-bank', 170), facadeBank = bank(id, 'facade-bank', usage === 'civic' ? 100 : 75);
    cell(foundation, 'foundation', 'foundation', [x, FLOOR - .2, z], [width / 2, .2, depth / 2], 'concrete', usage);
    const quadrantColumns: number[][] = [], roofCells: CityBlock[] = [];
    for (let quadrant = 0; quadrant < 4; quadrant++) {
      const sx = quadrant % 2 ? 1 : -1, sz = quadrant >= 2 ? 1 : -1;
      const ids: number[] = [];
      for (let redundant = 0; redundant < 2; redundant++) {
        const block = cell(frame, `column-${quadrant}-${redundant}`, 'column', [x + sx * (width / 2 - .65 - redundant * 1.4), FLOOR + (height - .4) / 2, z + sz * (depth / 2 - .65)], [.3, (height - .4) / 2, .3], 'steel', usage, condition(foundation, [0]));
        ids.push(block.cellId!);
      }
      quadrantColumns.push(ids);
      roofCells.push(cell(roofBank, `roof-${quadrant}`, 'slab', [x + sx * width / 4, FLOOR + height - .2, z + sz * depth / 4], [width / 4, .2, depth / 4], 'steel', usage, condition(frame, ids)));
    }
    const anchors: CityBuilding['anchors'] = [];
    for (const [side, nx, nz] of [['west', -1, 0], ['east', 1, 0], ['north', 0, -1], ['south', 0, 1]] as const) {
      const anchorId = `${id}:grip-${side}`, faceX = x + nx * width / 2, faceZ = z + nz * depth / 2, length = nx ? depth : width;
      const anchor: CityBuilding['anchor'] = { id: anchorId, propId: id, position: point(faceX, faceZ), normal: { x: nx, y: 0, z: nz }, width: Math.max(4, length - 2), height, landing: point(x + nx * (width / 2 - 2), z + nz * (depth / 2 - 2), FLOOR + height), approach: point(faceX + nx * 3, faceZ + nz * 3) };
      anchors.push(anchor);
      for (let row = 0; row < 2; row++) for (let bay = 0; bay < 4; bay++) {
        const along = -length / 2 + (bay + .5) * length / 4;
        const sx = nx || (bay >= 2 ? 1 : -1), sz = nz || (bay >= 2 ? 1 : -1), quadrant = (sx > 0 ? 1 : 0) + (sz > 0 ? 2 : 0);
        const block = cell(facadeBank, `facade-${side}-${row}-${bay}`, 'facade', [faceX - nx * .2 + (nz ? along : 0), FLOOR + (row + .5) * (height - .4) / 2, faceZ - nz * .2 + (nx ? along : 0)], [nx ? .2 : length / 8, (height - .4) / 4, nz ? .2 : length / 8], usage === 'civic' ? 'concrete' : usage === 'transit' || usage === 'utility' ? 'steel' : 'brick', usage, condition(roofBank, [quadrant]), side);
        block.anchorId = anchorId;
      }
    }
    for (let quadrant = 0; quadrant < 4; quadrant++) {
      roofCells[quadrant].anchorIds = [anchors[quadrant % 2 ? 1 : 0].id, anchors[quadrant >= 2 ? 3 : 2].id];
    }
    const roof: CityBuilding['roof'] = { id: `${id}:roof`, anchorIds: anchors.map(a => a.id), center: point(x, z, FLOOR + height), halfExtents: { x: width / 2, z: depth / 2 }, patrol: [point(x - width / 4, z - depth / 4, FLOOR + height), point(x + width / 4, z - depth / 4, FLOOR + height), point(x + width / 4, z + depth / 4, FLOOR + height), point(x - width / 4, z + depth / 4, FLOOR + height)], exit: { ...anchors[0].landing }, outside: { ...anchors[0].approach } };
    if(lot.id==='relay-east-entry'){
      anchors[0].position.z=-8;anchors[0].landing.z=-8;anchors[0].approach.z=-8;
    }
    buildings.push({ id, position: point(x, z), width, depth, height, yaw: 0, fixtures: [], facade: 'panel-bank', style: usage, anchor: anchors[0], anchors, roof });
  }
  // A real bridge spans the approach above capsule height. Redundant pylons
  // at each end carry two longitudinal beams; deck cells depend on both ends.
  const bridgeId = '7734:overhaul:entry-gantry', bridgeZ = -14, leftX = -19, rightX = 15, bridgeHeight = 9;
  const footBank = bank(bridgeId, 'foundation-bank', 320), pylonBank = bank(bridgeId, 'frame-bank', 160), beamBank = bank(bridgeId, 'beam-bank', 180), deckBank = bank(bridgeId, 'roof-bank', 140), railBank = bank(bridgeId, 'rail-bank', 60);
  for (let end = 0; end < 2; end++) {
    const x = end ? rightX : leftX;
    cell(footBank, `foundation-${end}`, 'foundation', [x, FLOOR - .2, bridgeZ], [1.2, .2, 2.2], 'concrete', 'transit');
    for (let side = 0; side < 2; side++) cell(pylonBank, `column-${end}-${side}`, 'column', [x, FLOOR + (bridgeHeight - .6) / 2, bridgeZ + (side ? 1.7 : -1.7)], [.4, (bridgeHeight - .6) / 2, .4], 'steel', 'transit', condition(footBank, [end]));
  }
  const span = rightX - leftX, middleX = (leftX + rightX) / 2;
  for (let side = 0; side < 2; side++) cell(beamBank, `beam-${side}`, 'beam', [middleX, FLOOR + bridgeHeight - .45, bridgeZ + (side ? 1.7 : -1.7)], [span / 2, .25, .3], 'steel', 'transit', { ...condition(pylonBank, [0, 1]), also: [condition(pylonBank, [2, 3])] });
  for (let segment = 0; segment < 6; segment++) {
    const x = leftX + (segment + .5) * span / 6;
    const deck = cell(deckBank, `bridge-deck-${segment}`, 'bridge-deck', [x, FLOOR + bridgeHeight - .15, bridgeZ], [span / 12, .15, 2], 'steel', 'transit', condition(beamBank, [0, 1]));
    for (const [side, direction] of [['north', -1], ['south', 1]] as const){
      const [min,max]=side==='north'?overhaulPortalRailSpan(x-span/12,x+span/12):[x-span/12,x+span/12];
      cell(railBank, `rail-${side}-${segment}`, 'rail', [(min+max)/2, FLOOR + bridgeHeight + .45, bridgeZ + direction * 1.9], [(max-min)/2, .45, .1], 'steel', 'transit', condition(deckBank, [deck.cellId!]), side);
    }
  }
  // Gantry roof metadata grants deck ownership only to its actual end-pylon
  // faces, never to an invisible continuous wall underneath the span.
  const portal=OVERHAUL_GANTRY_PORTAL,anchorId=`${bridgeId}:grip-south`;
  const gantryAnchors: CityBuilding['anchors'] = [{id:anchorId,propId:bridgeId,position:point(portal.x,portal.z),normal:{x:0,y:0,z:-1},width:portal.width,height:portal.topY-FLOOR,landing:point(portal.x,-14.17,FLOOR+bridgeHeight),approach:point(portal.x,portal.z-3)}];
  const portalBank=bank(bridgeId,'portal-bank',160);
  cell(portalBank,'portal-frame','facade',[portal.x,(portal.topY+portal.minY)/2,portal.z+portal.halfThickness],[portal.width/2,(portal.topY-portal.minY)/2,portal.halfThickness],'steel','transit',condition(beamBank,[0,1]),'north').anchorId=anchorId;
  deckBank.cells.forEach(c => { c.anchorIds = gantryAnchors.map(a => a.id); });
  const gantryRoof: CityBuilding['roof'] = { id: `${bridgeId}:roof`, anchorIds: gantryAnchors.map(a => a.id), center: point(middleX, bridgeZ, FLOOR + bridgeHeight), halfExtents: { x: span / 2, z: 2 }, patrol: [point(leftX + 2, bridgeZ, FLOOR + bridgeHeight), point(rightX - 2, bridgeZ, FLOOR + bridgeHeight)], exit: { ...gantryAnchors[0].landing }, outside: { ...gantryAnchors[0].approach } };
  buildings.push({ id: bridgeId, position: point(middleX, bridgeZ), width: span, depth: 4.4, height: bridgeHeight, yaw: 0, fixtures: [], facade: 'panel-bank', style: 'transit', anchor: gantryAnchors[0], anchors: gantryAnchors, roof: gantryRoof });
  const fixtureBank = bank('7734:overhaul:street-utility', 'fixture-bank', 85);
  for (const [index, x, z] of [[0, -17, 22], [1, 1, 22], [2, -8.5, -6], [3, 8.5, -6], [4, -8.5, -20], [5, 8.5, -20], [6, -8.5, -64], [7, 8.5, -64]]) {
    cell(fixtureBank, `cabinet-${index}`, 'fixture', [x, FLOOR + 1.1, z], [.9, 1.1, .4], 'steel', 'utility');
  }
  for(const [lotId,objective] of [['west-relay-yard','sky-uplink'],['east-midrise','city-grid']] as const){
    const b=buildings.find(b=>b.id.endsWith(':'+lotId))!,roof=blocks.find(block=>block.buildingId===b.id&&block.id.endsWith(':roof-0'))!;
    const terminal=bank(b.id,objective+'-hardware-bank',80),x=b.position.x-3,z=b.position.z-3,y=b.roof.center.y;
    const support={structureId:roof.structureId!,cells:[roof.cellId!],minIntact:1};
    cell(terminal,objective+'-mast','fixture',[x,y+2.3,z],[.12,2,.12],'steel','utility',support);
    cell(terminal,objective+'-signal','fixture',[x,y+4.2,z],[1.2,.09,.16],'steel','utility',support);
    cell(terminal,objective+'-terminal','fixture',[x,y+1.7,z+.35],[.65,.35,.22],'steel','utility',support);
  }
  const guards = [buildings[2], buildings[9]].map((b, i) => ({ id: `overhaul-roof-guard-${i}`, role: 'anchor' as const, position: { ...b.roof.patrol[0] }, roofId: b.roof.id, patrol: b.roof.patrol }));
  compiled = { id: '7734:overhaul:first-district', seed, buildings, blocks, structures, streets, approaches: buildings.flatMap(b => b.anchors.map(a => [{ ...a.approach }, { ...a.position }])), grading: { minX: -72, maxX: 72, minZ: -118, maxZ: 72, height: FLOOR }, npcs: [...guards, { id: 'overhaul-street-scout', role: 'scout', position: point(0, -16), patrol: [point(0, -16), point(0, -42), point(34, -30), point(38, 4)] }] };
  const dressing=buildOverhaulDressing(compiled);
  const retainedDressing=dressing.structures.filter(s=>!RAINLINE_STREET_SUPERSEDED.has(s.id)),retainedIds=new Set(retainedDressing.flatMap(s=>s.cells.map(b=>b.id)));
  compiled.blocks.push(...dressing.blocks.filter(b=>retainedIds.has(b.id)));compiled.structures.push(...retainedDressing);
  for(const [id,component] of dressing.components)if(retainedIds.has(id))metadata.set(id,{kind:component.kind,usage:component.usage,maxHp:component.maxHp,loadBearing:component.loadBearing});
  const architecture=buildOverhaulArchitecture(compiled);
  compiled.blocks.push(...architecture.blocks);compiled.structures.push(...architecture.structures);
  for(const [id,component] of architecture.components)metadata.set(id,{kind:component.kind==='slab'?'slab':component.kind==='wall'?'facade':'column',usage:component.family==='loading'?'works':component.family==='control'?'civic':component.family,maxHp:150,loadBearing:true});
  const streetAdmission=buildRainlineStreetAdmission(compiled);compiled.blocks.push(...streetAdmission.blocks);compiled.structures.push(...streetAdmission.structures);
  for(const block of streetAdmission.blocks)metadata.set(block.id,{kind:'fixture',usage:'works',maxHp:110,loadBearing:false});
  // Wire ruin references use block indices. Preserve the entire existing
  // compilation, including dressing, architecture and street admission.
  const extraction=buildRainlineExtraction039(compiled);
  compiled.blocks.push(...extraction.blocks);compiled.structures.push(...extraction.structures);
  compiled.buildings.push(...extraction.buildings);compiled.approaches.push(...extraction.approaches);
  for(const [id,component] of extraction.components)metadata.set(id,component);
  return compiled;
}
