import {expect,it} from 'vitest';
import {CityPresentation} from '../src/game/world/cityPresentation';
import type {CityRubbleState} from '../shared/cityRubble';
import type {CombatEvent} from '../shared/types';
const rubble:CityRubbleState={id:'block:0',blockId:'block',piece:0,born:0,expires:8,position:{x:1,y:2,z:3},rotation:{x:0,y:0,z:0,w:1}};
it('pins strict default cosmetic or explicit native-only presentation and deep copies event vectors',()=>{
 const event={id:1,type:'structure-break',at:0,position:{x:1,y:2,z:3},incoming:{x:1,y:0,z:0},normal:{x:0,y:0,z:1}} as CombatEvent;
 const cosmetic=new CityPresentation();cosmetic.push(1,0,[],[],[rubble],[event]);cosmetic.present(0);
 expect(cosmetic.read()!.experimentalPhysicalRubble).toBe(false);expect(cosmetic.read()!.rubble).toEqual([]);expect(cosmetic.sampleRubble()).toEqual([]);
 event.position.x=99;event.incoming!.x=99;event.normal!.z=99;expect(cosmetic.read()!.events[0].position.x).toBe(1);expect(cosmetic.read()!.events[0].incoming!.x).toBe(1);expect(cosmetic.read()!.events[0].normal!.z).toBe(1);
 cosmetic.push(2,1,[],[],[rubble],[],true);cosmetic.present(1);expect(cosmetic.read()!.tick).toBe(1);expect(cosmetic.read()!.experimentalPhysicalRubble).toBe(false);
 const physical=new CityPresentation();physical.push(1,0,[],[],[],[event],true);physical.present(0);expect(physical.read()!.experimentalPhysicalRubble).toBe(true);expect(physical.sampleRubble()).toEqual([]);
 physical.push(2,1,[],[],[rubble],[],true);physical.present(1);expect(physical.sampleRubble()).toHaveLength(1);rubble.position.x=99;expect(physical.read()!.rubble[0].position.x).toBe(1);
 physical.push(3,2,[],[],[],[],false);physical.present(2);expect(physical.read()!.tick).toBe(2);expect(physical.read()!.experimentalPhysicalRubble).toBe(true);
 // Native mode remains explicit even without native pieces. The graphics branch
 // consumes this flag; no inference from array emptiness or event presence.
});
