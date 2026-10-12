from pathlib import Path
import json,hashlib,sys
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
mode=sys.argv[1];assert mode in ['syntax','tests','build','freeze','candidate']
review=r/'docs/overhaul/critic/contact099-source-review.md';assert 'APPROVE' in review.read_text(encoding='utf8') and 'CLOSED' in review.read_text(encoding='utf8')
paths={p for n in ['tools/overhaul-foot-contact-098','tools/overhaul-contact-integration-099','tools/overhaul-contact-play-100'] for p in (r/n).rglob('*') if p.is_file() and not p.name.endswith('-seal.json') and '__pycache__' not in p.parts}
paths.update(r/x for x in ['tools/overhaul-root-round-027/run-seal.py','tools/overhaul-play-ready.mjs','package.json','package-lock.json','tsconfig.json','vite.config.ts']);paths.add(review)
source=json.loads((r/'tools/overhaul-foot-contact-098/source-seal.json').read_text());assert source['writer']=='CLOSED'
for x in source['files']:assert row(r/x['path'])['sha256']==x['sha256'];paths.add(r/x['path'])
paths.add(r/'tools/overhaul-foot-contact-098/source-seal.json')
assert row(r/'src/game/entities/movingRFfeet067.ts')['sha256']==row(r/'tools/overhaul-foot-contact-098/candidate-movingRFfeet067.ts')['sha256'];paths.add(r/'src/game/entities/movingRFfeet067.ts')
assert row(r/'tests/contact-skin098.test.ts')['sha256']==row(r/'tools/overhaul-foot-contact-098/candidate-test-contact-skin098.test.ts')['sha256'];paths.add(r/'tests/contact-skin098.test.ts')
if mode in ['build','freeze','candidate']:
 testsPath=r/'.sites-runtime/overhaul-20261010/contact099-tests/process-receipt.json';tests=json.loads(testsPath.read_text());assert tests['exitCode']==0 and tests['failure'] is None and all(x['match'] for x in tests['inputsAfter']);paths.add(testsPath)
if mode in ['tests','build']:paths.update(p for n in ['src','shared','server'] for p in (r/n).rglob('*') if p.is_file())
if mode=='freeze':
 paths.update(p for p in (r/'dist').rglob('*') if p.is_file());paths.add(r/'.sites-runtime/overhaul-20261010/contact099-build/process-receipt.json')
build='049' if mode=='candidate' else '048';root=r/('.sites-runtime/overhaul-20261009/build-'+build);paths.add(root/'receipt.json')
protected=[row(root/'playable-root'/x['path']) for x in json.loads((root/'receipt.json').read_text())['files']]
commands={'syntax':['node','--check','tools/overhaul-contact-play-100/capture.mjs'],'tests':['npx.cmd','vitest','run','tests/contact-skin098.test.ts'],'build':['npm.cmd','run','build'],'freeze':['python','tools/overhaul-contact-integration-099/freeze049.py'],'candidate':['python','tools/overhaul-contact-integration-099/launch.py']}
p=h/(mode+'-seal.json');assert not p.exists();p.write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'protected':protected,'command':commands[mode],'scope':'ONE task-space contact098 experiment; firstfailureSTOP. Retention only after actual independent motion/contact review. No IAB lag/performance/fullscope certificate.'},indent=2));print(mode+' sealed')
