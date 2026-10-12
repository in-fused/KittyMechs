import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {describe,expect,it} from 'vitest';
import {buildingFaces,facePoint} from '../shared/buildingSurfaces';
import {cityDistrict} from '../shared/cityDistrict';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import {climbAnchors} from '../shared/traversal';
import {workshopRoofMax,workshopGeometry} from '../shared/workshopGeometry';
import {parseClimbState} from '../shared/protocol';
import type {ActorState,ClimbState,GameSnapshot} from '../shared/types';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';

function contact():ClimbState{
  const f=buildingFaces(7734).find(f=>f.kind==='workshop'&&f.side==='east')!;
  return {anchor:f.id,phase:'cling',startedAt:4,progress:.3,base:f.minY,height:f.height,top:f.roofCenter.y,normal:{...f.normal},contact:facePoint(f,0,f.minY+3),gripMask:3,roofMask:0,mantleStage:null,mantleStageAt:0};
}
function packet():GameSnapshot{
  const climb=contact(),actor={id:'pilot',jumpEpoch:1,strikeProcessed:0,strikeEndedAt:-100,strike:null,jumpProcessed:0,climb} as ActorState;
  return {worldLayoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION,tick:100,time:5,seed:7734,room:'CLIMB',mode:'coop',actors:[actor],projectiles:[],events:[],fields:[],rubble:[],cover:[],structures:cityDistrict(7734)!.structures.map(s=>({id:s.id,layoutVersion:1,revision:0,brokenMask:0,hp:s.cells.map(()=>s.maxHp)})),supplies:[],objectives:[],checkpoint:null,phase:'active',winner:null};
}
describe('atomic replicated climb contacts',()=>{
  it('copies supported face metadata and distinguishes detach from malformed input',()=>{
    const source=contact(),parsed=parseClimbState(source,7734,5)!;expect(parsed).toEqual(source);
    source.normal.x=99;source.contact.y=99;expect(parsed.normal.x).not.toBe(99);expect(parsed.contact.y).not.toBe(99);
    expect(parseClimbState(null,7734,5)).toBeNull();expect(parseClimbState(undefined,7734,5)).toBeUndefined();
  });
  it('rejects unknown faces, arbitrary planes, invalid phase clocks and impossible paw masks',()=>{
    const c=contact();
    for(const change of [{anchor:'forged'},{phase:'fly'},{base:c.base+1},{height:c.height+1},{top:c.top+1},{progress:1.1},{startedAt:5.1},{mantleStage:'out'},{mantleStageAt:6},{gripMask:16},{gripMask:3.1},{roofMask:1},{normal:{x:2,y:0,z:0}},{contact:{...c.contact,y:c.top+1}},{contact:{...c.contact,x:c.contact.x+3}},{progress:NaN}])expect(parseClimbState({...c,...change},7734,5)).toBeUndefined();
    const vault={...c,phase:'mantle',mantleStage:'lift',mantleStageAt:4.5,gripMask:0,roofMask:0};expect(parseClimbState(vault,7734,5)).toEqual(vault);
    for(const change of [{mantleStage:null},{mantleStageAt:3},{gripMask:3,roofMask:1},{gripMask:1},{roofMask:1},{mantleStage:'out',roofMask:1},{mantleStage:'transfer',gripMask:1},{mantleStage:'settle',gripMask:1}])expect(parseClimbState({...vault,...change},7734,5)).toBeUndefined();
    for(const mantleStage of ['transfer','settle'])for(const roofMask of [0,1,15])expect(parseClimbState({...vault,mantleStage,roofMask},7734,5)).toEqual({...vault,mantleStage,roofMask});
  });
  it('rejects the whole snapshot on a bad actor contact and retains the previous complete structural revision',()=>{
    const first=admitStructuralSnapshot(packet(),null)!;expect(first).toBeTruthy();const bad=packet();bad.tick++;bad.time+=.1;bad.actors[0].climb!.anchor='foreign-map:face:east';bad.structures[0].hp[0]=0;bad.structures[0].brokenMask=1;bad.structures[0].revision++;
    expect(admitStructuralSnapshot(bad,first)).toBeNull();expect(first.structures[0].brokenMask).toBe(0);
    const source=packet(),copy=admitStructuralSnapshot(source,null)!;source.actors[0].climb!.normal.x=99;source.actors[0].climb!.contact.y=99;source.actors[0].climb=null;
    expect(copy.actors[0].climb).toBeTruthy();expect(copy.actors[0].climb!.normal.x).not.toBe(99);expect(copy.actors[0].climb!.contact.y).not.toBe(99);
  });
  it('resolves retained AI aliases to the same canonical face and admits actual raised roof trim',()=>{
    const anchor=climbAnchors(7734)[0],f=buildingFaces(7734).find(f=>f.buildingId===anchor.propId&&f.side==='east')!,base=contact();
    const candidate={...base,anchor:anchor.id,phase:'mantle',mantleStage:'transfer',mantleStageAt:4.5,base:f.minY,height:f.height,normal:{...f.normal},contact:facePoint(f,0,f.topY),top:f.minY+workshopRoofMax(7734)*f.height/workshopGeometry(7734).wallTop,gripMask:0,roofMask:1};
    expect(parseClimbState(candidate,7734,5)).toEqual(candidate);
    expect(parseClimbState({...candidate,top:candidate.top+.1},7734,5)).toBeUndefined();
  });
});
