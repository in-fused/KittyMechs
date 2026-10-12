from pathlib import Path
import shutil, hashlib, json
root=Path(__file__).resolve().parents[1]
base=root/'.sites-runtime/overhaul-20261009/preserved-006/files'
out=root/'.sites-runtime/overhaul-20261009/clock-runtime-001'
out.mkdir(exist_ok=False)
for folder in ('shared','src','server'):
    shutil.copytree(base/folder,out/folder)
for name in ('server/index.ts','server/arenaRooms.ts','server/arenaDiagnostics.ts'):
    shutil.copy2(root/name,out/name)
p=out/'shared/simulation.ts';s=p.read_text(encoding='utf-8')
def once(old,new,count=1):
    global s
    found=s.count(old)
    if found!=count:raise RuntimeError(f'Frozen base witness mismatch {found}, expected {count}: {old[:90]}')
    s=s.replace(old,new)
once("  time=0; tick=0; phase:GameSnapshot['phase']='active'; winner:string|null=null;", "  time=0; tick=0; phase:GameSnapshot['phase']='active'; winner:string|null=null;\n  onStepTiming:((stage:'world-step'|'bot-input'|'pair'|'climb'|'locomotion',durationMs:number)=>void)|undefined;\n  inspectRequestedInput(id:string){const p=this.physics.get(id);return p?{input:{...p.input},receivedAt:p.received}:null;}")
once('this.world.step();', "if(this.onStepTiming){const at=performance.now();this.world.step();this.onStepTiming('world-step',performance.now()-at);}else this.world.step();",2)
once('      let input=actor.bot?this.botInput(actor):{...p.input,jump};', "      const botAt=actor.bot&&this.onStepTiming?performance.now():0;\n      let input=actor.bot?this.botInput(actor):{...p.input,jump};\n      if(actor.bot&&this.onStepTiming)this.onStepTiming('bot-input',performance.now()-botAt);")
once('if(actor.pair)this.advancePair(actor,input,dt);', "if(actor.pair){if(this.onStepTiming){const at=performance.now();this.advancePair(actor,input,dt);this.onStepTiming('pair',performance.now()-at);}else this.advancePair(actor,input,dt);}")
once('this.advanceClimb(actor,p,input,dt);continue;', "if(this.onStepTiming){const at=performance.now();this.advanceClimb(actor,p,input,dt);this.onStepTiming('climb',performance.now()-at);}else this.advanceClimb(actor,p,input,dt);continue;")
once('const beforeY=actor.position.y,locomotion=this.moveLocomotion(p,desired,actor.position,!striking),rubbleMovement=locomotion.movement;', "const beforeY=actor.position.y,locomotionAt=this.onStepTiming?performance.now():0,locomotion=this.moveLocomotion(p,desired,actor.position,!striking),rubbleMovement=locomotion.movement;\n      if(this.onStepTiming)this.onStepTiming('locomotion',performance.now()-locomotionAt);")
p.write_text(s,encoding='utf-8')
rows=[{'path':str(f.relative_to(out)), 'sha256':hashlib.sha256(f.read_bytes()).hexdigest(), 'bytes':f.stat().st_size} for f in sorted(out.rglob('*')) if f.is_file()]
(out/'source-manifest.json').write_text(json.dumps({'scope':'Frozen preserved006 1084-cell/world support2 authority; ONLY server clock diagnostics and optional step/locomotion timing overlays. Root cwd serves unchanged build008 dist. No new roof/art/layout admission.', 'files':rows},indent=2),encoding='utf-8')
print(json.dumps({'runtime':str(out),'files':len(rows),'bytes':sum(r['bytes'] for r in rows)}))
