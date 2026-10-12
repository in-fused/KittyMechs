import {Matrix4,Quaternion,Vector3} from 'three';
import type {CityBlock} from '../../shared/cityDistrict';
import {getOverhaulComponent} from '../../shared/overhaulDistrict';
import {getOverhaulArchitectureComponent} from '../../shared/overhaulArchitecture';
import {isRainlineExtraction039Block} from '../../shared/rainlineExtraction039';
export function overhaulIdentityModule(block:CityBlock):string|undefined{
 if(isRainlineExtraction039Block(block))return undefined;
 const architecture=getOverhaulArchitectureComponent(block);if(architecture)return architecture.module;
 const component=getOverhaulComponent(block);if(component?.kind!=='facade')return undefined;
 const match=block.id.match(/facade-[a-z]+-(\d+)-(\d+)$/),ground=match?.[1]==='0',bay=Number(match?.[2]??0);
 const family=block.buildingId.endsWith(':spawn-west')||block.buildingId.endsWith(':east-relay-yard')?'loading':block.buildingId.endsWith(':west-relay-yard')?'transit':block.buildingId.endsWith(':spawn-east')||block.buildingId.endsWith(':core-west')?'control':block.buildingId.endsWith(':west-midrise')?'residential':component.usage==='works'?'loading':component.usage==='transit'?'transit':component.usage==='residential'?'residential':'control';
 if(!ground)return family+'_upper';
 if(bay!==1)return family+'_ground';
 // Label variants contain the same complete wall/profile as ordinary bays.
 // Every plaque remains part of this exact native intact/damaged/ruin owner.
 const parcels=new Map([
  ['spawn-west','loading_label_machine'],['relay-west-entry','loading_label_entry'],
  ['west-warehouse','loading_label_warehouse'],['east-workshop','loading_label_eastworks'],
  ['east-relay-yard','loading_label_freight'],['core-west-works','loading_label_corewest'],
  ['core-east-works','loading_label_coreeast'],['west-relay-yard','transit_label_west'],
  ['relay-east-entry','transit_label_east'],['rear-east-utility','transit_label_rear'],
  ['spawn-east','control_label_pump'],['core-west','control_label_grid'],
  ['core-east','control_label_power'],['east-midrise','control_label_city'],
  ['west-midrise','residential_label_quay'],['east-warehouse','residential_label_east'],
 ]);
 return parcels.get(block.buildingId.split(':').at(-1)??'')??family+'_label_'+(family==='loading'?'warehouse':family==='transit'?'rear':family==='residential'?'quay':'power');
}
export function orientationOffset(block:CityBlock):number{
 const component=getOverhaulComponent(block);if(component?.kind!=='facade')return 0;
 return component.side==='east'?Math.PI/2:component.side==='west'?-Math.PI/2:component.side==='north'?Math.PI:0;
}
export function overhaulIdentityMatrix(block:CityBlock):Matrix4{
 const component=getOverhaulComponent(block),swap=component?.kind==='facade'&&(component.side==='west'||component.side==='east'),[x,y,z]=block.halfExtents;
 return new Matrix4().compose(new Vector3(...block.position),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),block.yaw+orientationOffset(block)),new Vector3(2*(swap?z:x),2*y,2*(swap?x:z)));
}
