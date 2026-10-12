from pathlib import Path
r=Path(__file__).resolve().parents[2]
p=r/'src/game/input.ts';s=p.read_text()
s=s.replace("pitch:.08,shotYaw:","pitch:.08,levelView:false,shotYaw:",1)
s=s.replace("export const toggleStance=", "// Explicit recovery preserves horizontal aim and never issues a movement/action edge.\nexport const cancelLevelView=()=>{controls.levelView=false;};\nexport const requestLevelView=()=>{const actor=runtime.snapshot?.actors.find(a=>a.id===runtime.localId);if(useGameStore.getState().phase!=='playing'||!actor||actor.hp<=0)return false;controls.levelView=true;return true;};\nexport const toggleStance=",1)
s=s.replace("  controls.shotYaw=undefined;", "  cancelLevelView();controls.shotYaw=undefined;",1)
s=s.replace("if(e.code==='KeyQ')controls.rocketUntil=until;", "if(e.code==='KeyV')requestLevelView();if(e.code==='KeyQ')controls.rocketUntil=until;",1)
s=s.replace("      controls.yaw-=e.movementX", "      if(e.movementY)cancelLevelView();\n      controls.yaw-=e.movementX",1)
old="  if(active){controls.yaw+=((k.has('KeyJ')?1:0)-(k.has('KeyL')?1:0))*1.9*lookDt;controls.pitch=clamp(controls.pitch+((k.has('KeyI')?1:0)-(k.has('KeyK')?1:0))*1.1*lookDt,-.9,.75);}"
new="""  if(active){
    controls.yaw+=((k.has('KeyJ')?1:0)-(k.has('KeyL')?1:0))*1.9*lookDt;
    if(k.has('KeyI')||k.has('KeyK'))cancelLevelView();
    if(controls.levelView){
      controls.pitch+=(.06-controls.pitch)*(1-Math.exp(-8*lookDt));
      if(Math.abs(controls.pitch-.06)<.003){controls.pitch=.06;cancelLevelView();}
    }else controls.pitch=clamp(controls.pitch+((k.has('KeyI')?1:0)-(k.has('KeyK')?1:0))*1.1*lookDt,-.9,.75);
  }"""
assert old in s;s=s.replace(old,new,1);s=s.replace("look:{yaw:controls.yaw,pitch:controls.pitch,", "look:{yaw:controls.yaw,pitch:controls.pitch,levelView:controls.levelView,",1);p.write_text(s)
p=r/'src/ui/TouchControls.tsx';s=p.read_text().replace('requestJump,controls, toggleStance','requestJump,controls, toggleStance,requestLevelView,cancelLevelView',1)
s=s.replace("controls.yaw-=(e.clientX-look.current.x)","if(e.clientY!==look.current.y)cancelLevelView();controls.yaw-=(e.clientX-look.current.x)",1)
s=s.replace('<div className="touch-actions">','<div className="touch-actions"><button aria-label="Level view" onClick={requestLevelView}>LEVEL VIEW</button>',1);p.write_text(s)
p=r/'src/ui/Hud.tsx';s=p.read_text().replace('SHIFT POUNCE · AIM DOWN + SHIFT DIVE · UPRIGHT + SHIFT TACKLE','SHIFT POUNCE · AIM DOWN + SHIFT DIVE · UPRIGHT + SHIFT TACKLE · V LEVEL VIEW',1).replace('WASD MOVE · IJKL LOOK · R FORM','WASD MOVE · IJKL LOOK · V LEVEL VIEW · R FORM',1);p.write_text(s)
p=r/'tests/feline-strike-input.test.ts';s=p.read_text().replace('readInput,requestStrike,resetControls','readInput,requestStrike,requestLevelView,resetControls',1)
s+='''
describe('explicit level view through installed player controls',()=>{
  it('smoothly recovers from a dive without changing yaw, movement or issuing action edges',()=>{
    const clock=vi.spyOn(performance,'now').mockReturnValue(100000);readInput();
    controls.pitch=-.8;controls.yaw=1.2;controls.shotPitch=-.42;key('keydown','KeyW');
    const actor=runtime.snapshot!.actors[0],prior={...readInput()};key('keydown','KeyV');key('keyup','KeyV');
    clock.mockReturnValue(100016);const first={...readInput()};expect(controls.pitch).toBeGreaterThan(-.8);expect(controls.pitch).toBeLessThan(-.5);
    for(let n=2;n<=80;n++){clock.mockReturnValue(100000+n*16);readInput();}
    expect(controls.pitch).toBeGreaterThanOrEqual(.03);expect(controls.pitch).toBeLessThanOrEqual(.09);expect(controls.levelView).toBe(false);
    expect(controls.yaw).toBe(1.2);expect(runtime.snapshot!.actors[0]).toBe(actor);
    expect(first).toMatchObject({forward:1,yaw:1.2,pitch:-.42,jump:false,strike:false,stance:prior.stance,jumpId:prior.jumpId,jumpEpoch:prior.jumpEpoch,strikeId:prior.strikeId,strikeEpoch:prior.strikeEpoch});
    key('keydown','KeyV',true);expect(controls.levelView).toBe(false);
  });
  it('manual vertical keyboard and mouse aim override recovery immediately',()=>{
    const clock=vi.spyOn(performance,'now').mockReturnValue(200000);readInput();controls.pitch=-.4;requestLevelView();key('keydown','KeyK');clock.mockReturnValue(200016);readInput();expect(controls.levelView).toBe(false);expect(controls.pitch).toBeLessThan(-.4);key('keyup','KeyK');
    requestLevelView();controls.dragging=true;const e=new Event('mousemove');Object.assign(e,{movementX:0,movementY:25});window.dispatchEvent(e);expect(controls.levelView).toBe(false);
    const manual=controls.pitch;clock.mockReturnValue(200032);readInput();expect(controls.pitch).toBe(manual);
  });
  it('pause and blur cancel recovery and cannot queue it outside live play',()=>{
    controls.pitch=.7;expect(requestLevelView()).toBe(true);useGameStore.setState({phase:'paused'});expect(controls.levelView).toBe(false);expect(requestLevelView()).toBe(false);
    useGameStore.setState({phase:'playing'});expect(requestLevelView()).toBe(true);window.dispatchEvent(new Event('blur'));expect(controls.levelView).toBe(false);expect(controls.pitch).toBe(.7);
  });
});
''';p.write_text(s)
print('Edited input, desktop/touch hint and focused installed-control tests; no native/camera/asset edits')
