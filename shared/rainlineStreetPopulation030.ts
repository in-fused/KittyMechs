import {rainlinePopulatedPlacements as retained} from './rainlineStreetPopulation002';
import plan from './data/rainlineStreetPopulation030.json' with {type:'json'};

// Existing source geometry, mass and convex hull remain one physical/art owner.
// Append only: checkpoint damage indices for all retained components stay stable.
const templates=new Map(retained.map(p=>[p.module,p]));
const additional=plan.placements.map(p=>{
 const template=templates.get(p.module);
 if(!template)throw Error('Missing authored street module '+p.module);
 return {...template,id:p.id,pivot:p.pivot,yaw:p.yaw};
});
export const rainlinePopulatedPlacements=[...retained,...additional];

