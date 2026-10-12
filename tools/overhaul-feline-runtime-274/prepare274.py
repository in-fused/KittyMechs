from pathlib import Path
import json,shutil
R=Path(__file__).resolve().parents[2];H=Path(__file__).parent;B=R/'tools/overhaul-feline-runtime-267'
for n in ['NativeActor267.tsx','nativeOwner267.ts','sourceTask267.ts','preparation267.ts','composed267.test.ts','composed267.json','terminal267.json','source-seal.json']:
 shutil.copy2(B/n,H/'preimages'/n)
p=(B/'preparation267.ts').read_text(encoding='utf-8')
needle="  const out=new Map<string,Quaternion>(),a=sample('start'),b=sample('end'),p=sample('current');"
assert needle in p
p=p.replace(needle,"  // At u=1 both carry and residual are exactly identity. Retire the chart\n  // without sampling clips or writing a pose; a later reversal starts at zero.\n  if(u===1){this.previous.clear();this.carry.clear();return new Map<string,Quaternion>();}\n"+needle)
(H/'preparation274.ts').write_text(p,encoding='utf-8')
s=(B/'sourceTask267.ts').read_text(encoding='utf-8').replace("from './preparation267'","from './preparation274'").replace('class SourceTask267','class SourceTask274')
line="  const names267=this.bones.map(b=>b.name),before267=new Map(names267.map(n=>{const b=this.model.getObjectByName(n)!;return [n,{world:this.world267(b),rotation:this.quaternion267(b)}] as const;}));"
assert line in s
s=s.replace(line,'  const names267=this.bones.map(b=>b.name);')
s=s.replace('  if(chart.size){this.soles.invalidatePose256();','  if(chart.size){const before267=new Map(names267.map(n=>{const b=this.model.getObjectByName(n)!;return [n,{world:this.world267(b),rotation:this.quaternion267(b)}] as const;}));this.soles.invalidatePose256();')
(H/'sourceTask274.ts').write_text(s,encoding='utf-8')
n=(B/'nativeOwner267.ts').read_text(encoding='utf-8').replace("import {SourceTask267} from './sourceTask267';","import {SourceTask274} from '../overhaul-feline-runtime-274/sourceTask274';").replace("from './preparation267'","from '../overhaul-feline-runtime-274/preparation274'").replace('SourceTask267','SourceTask274')
(H/'nativeOwner274.ts').write_text(n,encoding='utf-8')
a=(B/'NativeActor267.tsx').read_text(encoding='utf-8').replace("from './nativeOwner267'","from './nativeOwner218'")
(H/'NativeActor274.tsx').write_text(a,encoding='utf-8')
shutil.copy2(B/'visualRegistry267.typecheck.ts',H/'visualRegistry274.typecheck.ts')
a=a.replace("from './nativeOwner218'","from './nativeOwner274'").replace("from '../../src/game/camera/visualRegistry'","from './visualRegistry274.typecheck'")
(H/'NativeActor274.typecheck.tsx').write_text(a,encoding='utf-8')
(H/'tsconfig274.json').write_text(json.dumps({'extends':'../../tsconfig.json','include':['sourceTask274.ts','nativeOwner274.ts','preparation274.ts','NativeActor274.typecheck.tsx','owner274.test.ts']},indent=2),encoding='utf-8')
