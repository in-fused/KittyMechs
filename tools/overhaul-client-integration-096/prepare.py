from pathlib import Path
import json,hashlib,sys
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
mode=sys.argv[1];assert mode in ['syntax','build','freeze','candidate']
review=r/'docs/overhaul/critic/client096-source-review.md';assert 'APPROVE' in review.read_text(encoding='utf8')
paths={p for n in ['tools/overhaul-client-report-092','tools/overhaul-client-integration-096','tools/overhaul-client-play-097'] for p in (r/n).rglob('*') if p.is_file() and not p.name.endswith('-seal.json')}
paths.update(r/x for x in ['tools/overhaul-root-round-027/run-seal.py','tools/overhaul-play-ready.mjs','package.json','package-lock.json','tsconfig.json','vite.config.ts']);paths.add(review)
source=json.loads((r/'tools/overhaul-client-report-092/source-seal.json').read_text());assert source['writer']=='CLOSED'
for x in source['files']:assert row(r/x['path'])['sha256']==x['sha256'];paths.add(r/x['path'])
paths.add(r/'tools/overhaul-client-report-092/source-seal.json')
testsPath=r/'.sites-runtime/overhaul-20261010/player095-tests/process-receipt.json';tests=json.loads(testsPath.read_text());assert tests['exitCode']==0 and tests['failure'] is None and all(x['match'] for x in tests['inputsAfter']);paths.add(testsPath)
assert row(r/'src/game/entities/movingRFfeet067.ts')['sha256']=='7d2f017354391143d497f797f12acfa649e703cbcf709b21160499f7dbbd5a61'
if mode=='build':paths.update(p for n in ['src','shared','server'] for p in (r/n).rglob('*') if p.is_file())
if mode=='freeze':
 paths.update(p for p in (r/'dist').rglob('*') if p.is_file());paths.add(r/'.sites-runtime/overhaul-20261010/client096-build/process-receipt.json')
build='048' if mode=='candidate' else '047';root=r/('.sites-runtime/overhaul-20261009/build-'+build);paths.add(root/'receipt.json')
protected=[row(root/'playable-root'/x['path']) for x in json.loads((root/'receipt.json').read_text())['files']]
commands={'syntax':['node','--check','tools/overhaul-client-play-097/capture.mjs'],'build':['npm.cmd','run','build'],'freeze':['python','tools/overhaul-client-integration-096/freeze048.py'],'candidate':['python','tools/overhaul-client-integration-096/launch.py']}
p=h/(mode+'-seal.json');assert not p.exists();p.write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'protected':protected,'command':commands[mode],'scope':'ONE092 diagnostics-only candidate,093 restored/rejected; firstfailureSTOP. No gait/performance/IAB/fullscope approval.'},indent=2));print(mode+' sealed')
