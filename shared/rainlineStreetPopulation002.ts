import source from './data/rainlineStreetAdmission001.json' with {type:'json'};

/** Retained, locally authored meter-scale assets. Each added prop keeps its
 * own damage bank, native source hull and persistent wreck owner. Original
 * placements remain first, preserving every existing block index. */
type Placement = typeof source.placements[number];
type Pocket = {id:string;x:number;z:number;modules:readonly string[]};
const freight=['stacked_industrial_cases','covered_machine_pallet','freight_service_cart','service_bollard','inspection_hatch'];
const power=['generator_skid','hydraulic_manifold','cable_reel','repair_trolley','inspection_hatch'];
const service=['repair_trolley','stacked_industrial_cases','cable_reel','service_bollard','inspection_hatch'];
export const RAINLINE_POPULATION_POCKETS:readonly Pocket[]=[
 {id:'west-warehouse-yard',x:-67,z:29,modules:freight},
 {id:'west-workshop-service',x:-67,z:0,modules:power},
 {id:'west-relay-maintenance',x:-67,z:-36,modules:service},
 {id:'west-midrise-delivery',x:-67,z:-70,modules:freight},
 {id:'west-core-reserve',x:-65,z:-105,modules:power},
 {id:'east-warehouse-yard',x:67,z:29,modules:freight},
 {id:'east-workshop-service',x:67,z:0,modules:service},
 {id:'east-relay-maintenance',x:67,z:-36,modules:power},
 {id:'east-midrise-delivery',x:67,z:-70,modules:service},
 {id:'east-core-reserve',x:65,z:-106,modules:freight},
 {id:'machine-shop-forecourt',x:-29,z:3,modules:service},
 {id:'pump-station-forecourt',x:14,z:3,modules:power},
];
// Two working rows leave their central aisle open. Hatches occupy the floor;
// upright carts and equipment sit outside the aisle, with no random scatter.
const offsets:readonly (readonly [number,number])[]=[[-3.4,-2.5],[3.4,-2.5],[-3.4,2.5],[3.4,2.5],[0,0]];
const templates=new Map(source.placements.map(p=>[p.module,p]));
const additional:Placement[]=RAINLINE_POPULATION_POCKETS.flatMap(pocket=>pocket.modules.map((module,i)=>{
 const template=templates.get(module);if(!template)throw Error('Retained street module absent '+module);
 return {...template,id:`street001:population002:${pocket.id}:${i}`,pivot:[pocket.x+offsets[i][0],-.08,pocket.z+offsets[i][1]],yaw:0};
}));
export const rainlinePopulatedPlacements:readonly Placement[]=[...source.placements,...additional];
