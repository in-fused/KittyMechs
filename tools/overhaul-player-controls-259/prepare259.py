from pathlib import Path
import hashlib, json, subprocess, ast, sys

r=Path(__file__).resolve().parents[2]
f=Path(__file__).resolve().parent
run=r/'.sites-runtime/shader-startup-238'
base=r/'tools/overhaul-player-controls-251'
build=run/'private263'

def row(p):
    b=p.read_bytes()
    return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}

if sys.argv[1:] == ['--source']:
    for name in ['capture251.mjs','supervise251.py']:
        target=f/name.replace('251','259')
        assert not target.exists()
        text=(base/name).read_text(encoding='utf-8')
        text=text.replace("from './packetRetention251.mjs'", "from '../overhaul-player-controls-251/packetRetention251.mjs'")
        text=text.replace('251','259').replace('../overhaul-player-controls-259/packetRetention259.mjs','../overhaul-player-controls-251/packetRetention251.mjs').replace('retainPacket259','retainPacket251')
        text=text.replace('candidate253','candidate256').replace('player-controls259-observer-source-review.md','grounded258-source-review.md')
        text=text.replace('ONE candidate256 distinct idle LOOK, aligned movement steering and both R transitions observation', 'ONE ownership-optimized candidate256 controls, planted recovery and cost observation; previous251 is an unmatched instrumented reference')
        target.write_text(text,encoding='utf-8')
    subprocess.run(['node','--check',str(f/'capture259.mjs')],cwd=r,check=True)
    ast.parse((f/'supervise259.py').read_text(encoding='utf-8'))
    print('259 source ready for bounded review; UNSEALED and UNRUN')
    raise SystemExit(0)

assert run.is_junction() and run.resolve()==Path('D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238').resolve()
assert not (f/'binding.json').exists()
receipt=json.loads((run/'build263-supervisor/process-receipt.json').read_text(encoding='utf-8'))
assert receipt['exitCode']==0 and receipt['protectedMatch'] and receipt['finalOriginalIdentitiesRetired']
for folder in [build,run/'build263-supervisor']:
    assert not (folder/'output-seal.json').exists()
    files=[row(p) for p in sorted(folder.rglob('*')) if p.is_file()]
    (folder/'output-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':'One private263 ownership optimization build; gameplay/cost quality unadmitted','files':files},indent=2),encoding='utf-8')
original=json.loads((base/'binding.json').read_text(encoding='utf-8'))
integration=json.loads((r/'tools/overhaul-grounded-integration-263/binding.json').read_text(encoding='utf-8'))
rows=integration['files']+json.loads((r/'tools/overhaul-grounded-integration-263/source-seal.json').read_text(encoding='utf-8'))['files']
outputs=[row(p) for p in sorted((build/'dist').rglob('*')) if p.is_file()]
rows+=outputs+[row(build/'output-seal.json'),original['retainedIndex'],original['delivery']['asset'],row(base/'packetRetention251.mjs'),row(r/'docs/overhaul/critic/grounded263-source-review.md')]
rows += [row(p) for p in sorted(f.iterdir()) if p.is_file() and p.name not in ['binding.json','source-seal.json']]
rows=list({x['path']:x for x in rows}.values())
for x in rows:
    assert row(r/x['path'])==x,x['path']
scope='One actual259 optimized ordinary owner observation; controls/material/cost evidence only, independent temporal quality required; previous251 not a matched human-lag baseline'
binding={'writer':'CLOSED','scope':scope,'dist':(build/'dist').relative_to(r).as_posix(),'buildSeal':row(build/'output-seal.json'),'retainedIndex':original['retainedIndex'],'delivery':original['delivery'],'output':str((run/'public259').absolute()),'outputs':outputs,'files':rows}
(f/'binding.json').write_text(json.dumps(binding,indent=2),encoding='utf-8')
subprocess.run(['node','--check',str(f/'capture259.mjs')],cwd=r,check=True)
ast.parse((f/'supervise259.py').read_text(encoding='utf-8'))
(f/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':scope,'files':[row(p) for p in sorted(f.iterdir()) if p.is_file() and p.name!='source-seal.json']},indent=2),encoding='utf-8')
print(json.dumps({'writer':'CLOSED','sourceSeal':row(f/'source-seal.json'),'buildSeal':binding['buildSeal'],'inputs':len(rows)}))
