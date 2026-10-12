from pathlib import Path
import json,shutil
R=Path(__file__).resolve().parents[2];H=Path(__file__).parent;B=R/'tools/overhaul-feline-runtime-274'
for n in ['owner274.test.ts','owner274.json','terminal274.json','source-seal.json']:
 shutil.copy2(B/n,H/'preimages'/n)
s=(B/'owner274.test.ts').read_text(encoding='utf-8')
s=s.replace("from './nativeOwner274'","from '../overhaul-feline-runtime-274/nativeOwner274'").replace("const output='tools/overhaul-feline-runtime-274/owner274.json';","const output='tools/overhaul-feline-fixture-275/owner275.json';")
s=s.replace('let time=10,tick=0,life=1,phaseCounter=0,', 'let previousIdleClocks:Record<string,number>={};let time=10,tick=0,life=1,phaseCounter=0,')
s=s.replace('life++;phaseCounter=0;', 'life++;phaseCounter=0;previousIdleClocks={};')
s=s.replace("phaseCounter=db.phase;r.frames++;result.frames++;frameCount++;return;", "phaseCounter=db.phase;previousIdleClocks={};r.frames++;result.frames++;frameCount++;return;")
old="  const ga=db.sourceTasks?.grounded250;if(ga)for(const c of ga.clocks){if(advance===0)assert.equal(c.advance,0,'STOP_GROUNDED_ADVANCE');if(advance<0)assert.equal(c.direction,-1,'REVERSE_GROUNDED_DIRECTION');}"
new="""  const ga=db.sourceTasks?.grounded250;if(ga)for(const c of ga.clocks){
   if(advance===0)assert.equal(c.signedAdvance,0,'STOP_NATIVE_SIGNED_GAIT_ADVANCE');
   if(advance<0)assert.equal(c.direction,-1,'REVERSE_GROUNDED_DIRECTION');
   for(const event of c.events.filter((e:any)=>e.clock==='ACTUAL_IDLE_SOURCE_KEY_CLOCK')){
    const clock=db.sourceTasks.idleClocks[event.clip],definition=contract.clips[event.clip],first=Math.min(...definition.tracks.map((v:any)=>v.first)),last=Math.max(...definition.tracks.map((v:any)=>v.last));
    assert.ok(clock>=first&&clock<=last,'ACTUAL_IDLE_KEY_CLOCK_RANGE');
    const previousClock=previousIdleClocks[event.clip],expected=previousClock===undefined?0:wrap((clock-previousClock)/(last-first));
    assert.ok(Math.abs(event.advance-expected)<=2e-5,'IDLE_SOURCE_KEY_ADVANCE');
   }
  }
  previousIdleClocks=db.sourceTasks?{...db.sourceTasks.idleClocks}:{};"""
assert old in s;s=s.replace(old,new)
(H/'owner275.test.ts').write_text(s,encoding='utf-8')
(H/'tsconfig275.json').write_text(json.dumps({'extends':'../../tsconfig.json','include':['owner275.test.ts','../overhaul-feline-runtime-274/NativeActor274.typecheck.tsx']},indent=2),encoding='utf-8')
