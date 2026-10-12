from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;run=r/'.sites-runtime/shader-startup-238';build=run/'private272';base=r/'tools/overhaul-player-controls-259'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
assert not (f/'binding.json').exists()
seal=row(build/'output-seal.json');assert seal['sha256']=='a3da73174c3e3b9e2968fba6fbd75abd8ebb08943eba67d102c8d38e4964819e'
supervisorSeal=row(run/'build272-supervisor/output-seal.json');assert supervisorSeal['sha256']=='d720b17fb132abbd0e7712e73645836d4a58661a349438f921ddc531b6723fe0'
original=json.loads((base/'binding.json').read_text(encoding='utf-8'));upstream=json.loads((r/'tools/overhaul-feline-integration-272/binding.json').read_text(encoding='utf-8'))
outputs=[x for x in json.loads((build/'output-seal.json').read_text(encoding='utf-8'))['files'] if x['path'].startswith((build/'dist').relative_to(r).as_posix()+'/')]
asset=row(r/'assets/source/overhaul-feline-animation-264/Pounce_Feline264.glb');assert asset['sha256']=='a1aa8bab5601a12448a169602827146b226b126e6012bf7a94cf44d0c13fa9d6'
rows=upstream['files']+outputs+[seal,supervisorSeal,row(r/'tools/overhaul-feline-integration-272/source-seal.json'),original['retainedIndex'],asset,row(r/'tools/overhaul-feline-admission-268/decoder-receipt268.json'),row(r/'tools/overhaul-feline-admission-268/retirement-observation268.json'),row(r/'tools/overhaul-program-observer-242/guards.mjs'),row(r/'tools/overhaul-program-observer-242/network-classification.mjs')]
rows += [row(p) for p in (r/'tools/overhaul-coop-177').glob('*.mjs')]
rows += [row(r/p) for p in ['tools/overhaul-pilot-aim.ts','tools/overhaul-squad-policy.ts','tools/overhaul-coop-156/aim-feedback.mjs']]
rows += [row(p) for p in f.iterdir() if p.is_file() and p.name not in ('binding.json','source-seal.json')]
rows=list({x['path']:x for x in rows}.values())
binding={'writer':'CLOSED','scope':'ONE finite277 mission-only two-client travel/lifecycle actual-play proposal; movingR and gesture UNTESTED; native/source/contact/art/performance unadmitted','dist':(build/'dist').relative_to(r).as_posix(),'buildSeal':seal,'buildSupervisorSeal':supervisorSeal,'retainedIndex':original['retainedIndex'],'delivery':{'url':'/assets/private/Pounce_Feline264.glb?sha=a1aa8bab5601','asset':asset,'loaderReceiptSHA256':'1a29eec64f502d2d2dfecd76890a1bfec7d9d4e4322ede57535c6305063351f3'},'output':str((run/'public277').absolute()),'outputs':outputs,'files':rows,'actual':'UNRUN'}
(f/'binding.json').write_text(json.dumps(binding,indent=2),encoding='utf-8')
(f/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':binding['scope'],'files':[row(p) for p in f.iterdir() if p.is_file() and p.name!='source-seal.json'],'actual':'UNRUN'},indent=2),encoding='utf-8')
print(json.dumps({'writer':'CLOSED','binding':row(f/'binding.json'),'sourceSeal':row(f/'source-seal.json'),'inputs':len(rows),'actual':'UNRUN'}))
