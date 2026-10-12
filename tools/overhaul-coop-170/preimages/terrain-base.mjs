import {getMap} from '../../shared/maps.ts';
import {cityDistrict} from '../../shared/cityDistrict.ts';
import {segmentDistance} from '../../shared/world.ts';
const smooth=v=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
export function terrainBaseHeight165(x, z, seed=7734) {
  const map=getMap(seed);
  const grading=cityDistrict(map.seed)?.grading;
  const cityEdge=grading?Math.max(grading.minX-x,x-grading.maxX,grading.minZ-z,z-grading.maxZ,0):Infinity;
  // A single surveyed city plate prevents every worker/grid sample from
  // rescanning all city roads and pads. The outer shoulder blends continuously.
  if(grading&&cityEdge===0)return grading.height;
  let height;
  if(map.seed===1926) {
    const r=Math.hypot(x*.92,(z+40)*.8);
    const terrace=smooth((r-25)/24)*4+smooth((r-64)/22)*5+smooth((r-101)/26)*8;
    height=-4+terrace+Math.sin(x*.042)*Math.cos(z*.048)*1.7+Math.sin(x*.095+z*.071)*.6;
  } else if(map.seed===4107) {
    const north=Math.max(0,Math.min(15,(-z+14)*.086));
    const ridge=7*Math.exp(-Math.pow((x+39)/40,2))+9*Math.exp(-Math.pow((x-60)/27,2));
    height=-4+north+ridge+Math.sin(z*.042+x*.018)*2+Math.cos(x*.047)*1.4;
  } else {
    const outskirts=smooth((Math.hypot(x,z)-95)/90),coast=Math.min(7,Math.max(0,(-x-108)*.22));
    height=-.08+outskirts*(1.7+Math.sin(x*.023)*Math.cos(z*.026)*5+Math.sin(z*.058+x*.024)*1.5)-coast;
  }
  if(grading&&cityEdge<14)height=grading.height+(height-grading.height)*smooth(cityEdge/14);
  let nearest=Infinity,roadHeight=height,halfWidth=0;
  for(const road of map.roads) for(let i=1;i<road.points.length;i++) {
    const sample=segmentDistance(x,z,road.points[i-1],road.points[i]);
    const shoulderDistance=sample.distance-road.width/2;
    if(shoulderDistance<nearest){nearest=shoulderDistance;roadHeight=sample.height;halfWidth=road.width/2;}
  }
  // Flat landing pads retain the nearest road's authored elevation.
  for(const pad of [map.spawn,...map.objectives.map(o=>o.position)]) {
    const distance=Math.hypot(x-pad.x,z-pad.z);
    if(distance>=13)continue;
    let padDistance=Infinity,padHeight=roadHeight;
    for(const road of map.roads)for(let i=1;i<road.points.length;i++){
      const sample=segmentDistance(pad.x,pad.z,road.points[i-1],road.points[i]);
      if(sample.distance<padDistance){padDistance=sample.distance;padHeight=sample.height;}
    }
    height=height*(1-smooth((13-distance)/5))+padHeight*smooth((13-distance)/5);
  }
  const influence=1-smooth(Math.max(0,nearest)/(halfWidth+10));
  return height*(1-influence)+roadHeight*influence;
}


