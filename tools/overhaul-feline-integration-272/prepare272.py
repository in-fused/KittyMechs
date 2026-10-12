from pathlib import Path
import hashlib,json,re,ast,subprocess
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent
base=r/'tools/overhaul-grounded-integration-263'
runtime=r/'tools/overhaul-feline-runtime-274';admission=r/'tools/overhaul-feline-admission-268'
def row(p):
    b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
assert not (f/'binding.json').exists()
seals=[]
for folder in [runtime,admission]:
    p=folder/('source-seal268.json' if folder==admission else 'source-seal.json');s=json.loads(p.read_text(encoding='utf-8'));assert s['writer']=='CLOSED'
    for x in s['files']:assert row(r/x['path'])==x,x['path']
    seals += s['files']+[row(p)]
for name in ['plugin263.mjs','build263.mjs','supervise263.py']:
    target=f/name.replace('263','272');assert not target.exists()
    original=(base/name).read_text(encoding='utf-8');text=original.replace('263','272').replace('overhaul-grounded-integration-272','overhaul-feline-integration-272')
    for literal in re.findall(r'[0-9a-f]{64}',original):text=text.replace(literal.replace('263','272'),literal)
    if name=='plugin263.mjs':
        text=text.replace("import {createPrivatePlugins222} from '../overhaul-native-admission-225/plugin225.mjs';", "import {createPrivatePlugins268} from '../overhaul-feline-admission-268/plugin268.mjs';\nimport {receiptPath268,receiptSHA268} from '../overhaul-feline-admission-268/delivery-factory268.mjs';")
        needle="await createPrivatePlugins222({loaderReceiptPath:'tools/overhaul-pack-221/loader-evidence/evidence.json',loaderReceiptSHA256:'4ec83d8df252390f3cc991689229bf04861a2cb0effe8f3bd0a0baf7ef2d6232'})"
        assert text.count(needle)==1;text=text.replace(needle,'await createPrivatePlugins268({loaderReceiptPath:receiptPath268,loaderReceiptSHA256:receiptSHA268})')
    if name=='build263.mjs':
        text=text.replace('docs/overhaul/critic/grounded272-source-review.md','docs/overhaul/critic/feline274-design-review.md')
    if name=='supervise263.py':
        text=re.sub(r"os\.environ\.update\(KITTYMECH_225_BUILD_APPROVED=.*\)","os.environ.update(KITTYMECH_220_DELIVERY_APPROVED='1')",text)
        text=text.replace(".read_text())['files']",".read_text(encoding='utf-8'))['files']")
        text=text.replace('.write_text(json.dumps(before,indent=2))',".write_text(json.dumps(before,indent=2),encoding='utf-8')")
        text=text.replace('.write_text(json.dumps(data,indent=2))',".write_text(json.dumps(data,indent=2),encoding='utf-8')")
        text=text.replace('.write_text(json.dumps(afterProtection,indent=2))',".write_text(json.dumps(afterProtection,indent=2),encoding='utf-8')")
    target.write_text(text,encoding='utf-8')
rows=json.loads((base/'binding.json').read_text(encoding='utf-8'))['files']+seals
overrides=[]
for canonical,path in [
    ('src/game/GameCanvas.tsx','tools/overhaul-shader-startup-232/GameCanvas232.tsx'),
    ('tools/overhaul-shader-startup-232/shaderStartup232.tsx','tools/overhaul-shader-variant-240/shaderStartup240.tsx'),
    ('tools/overhaul-native-integration-222/nativeOwner218.ts','tools/overhaul-feline-runtime-274/nativeOwner274.ts'),
    ('tools/overhaul-native-integration-222/NativeActor222.tsx','tools/overhaul-feline-runtime-274/NativeActor274.tsx'),
]:
    x=row(r/path);overrides.append({'canonical':canonical,**x});rows.append(x)
rows += [row(p) for p in f.iterdir() if p.is_file() and p.name not in ['binding.json','source-seal.json']]
rows=list({x['path']:x for x in rows}.values())
scope='One private272 integration: authored26447clip asset,274single direction-aware ordinary owner and settled preparation retirement;274 partial fixture limitation and268originalsup1/later-retirement caveat preserved; actual movement/contact/gameplay approval pending.'
(f/'binding.json').write_text(json.dumps({'writer':'CLOSED','scope':scope,'files':rows,'overrides':overrides},indent=2),encoding='utf-8')
for name in ['prepare272.py','supervise272.py']:ast.parse((f/name).read_text(encoding='utf-8'))
for name in ['plugin272.mjs','build272.mjs']:subprocess.run(['node','--check',str(f/name)],cwd=r,check=True)
(f/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':scope,'files':[row(p) for p in sorted(f.iterdir()) if p.is_file() and p.name!='source-seal.json']},indent=2),encoding='utf-8')
print(json.dumps({'writer':'CLOSED','inputs':len(rows),'sourceSeal':row(f/'source-seal.json')}))
