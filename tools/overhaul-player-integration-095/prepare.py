from pathlib import Path
import json,hashlib,sys
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
mode=sys.argv[1];assert mode in ['tests','build','freeze','candidate']
review=r/'docs/overhaul/critic/client094-source-review.md';assert 'APPROVE' in review.read_text(encoding='utf8')
paths={p for n in ['tools/overhaul-client-report-092','tools/overhaul-foot-contact-093','tools/overhaul-player-integration-095'] for p in (r/n).rglob('*') if p.is_file() and not p.name.endswith('-seal.json')}
paths.update(r/x for x in ['tools/overhaul-root-round-027/run-seal.py','tools/overhaul-play-ready.mjs','tools/overhaul-player-view-089/capture.mjs','package.json','package-lock.json','tsconfig.json','vite.config.ts']);paths.add(review)
source=json.loads((r/'tools/overhaul-client-report-092/source-seal.json').read_text());assert source['writer']=='CLOSED'
for x in source['files']:assert row(r/x['path'])['sha256']==x['sha256'];paths.add(r/x['path'])
paths.add(r/'tools/overhaul-client-report-092/source-seal.json')
if mode!='tests':
 observer=r/'docs/overhaul/critic/player095-observer-review.md';assert 'APPROVE' in observer.read_text(encoding='utf8');paths.add(observer)
 feet=json.loads((r/'tools/overhaul-foot-contact-093/source-seal.json').read_text());assert feet['writer']=='CLOSED'
 for x in feet['inputsAndOutputs']:assert row(r/x['path'])['sha256']==x['sha256'];paths.add(r/x['path'])
 paths.add(r/'tools/overhaul-foot-contact-093/source-seal.json')
if mode=='build':
 tests=json.loads((r/'.sites-runtime/overhaul-20261010/player095-tests/process-receipt.json').read_text());assert tests['exitCode']==0 and tests['failure'] is None and all(x['match'] for x in tests['inputsAfter']);paths.add(r/'.sites-runtime/overhaul-20261010/player095-tests/process-receipt.json')
 paths.update(p for n in ['src','shared','server'] for p in (r/n).rglob('*') if p.is_file())
if mode=='freeze':
 paths.update(p for p in (r/'dist').rglob('*') if p.is_file());paths.add(r/'.sites-runtime/overhaul-20261010/player095-build/process-receipt.json')
build='048' if mode=='candidate' else '047';root=r/('.sites-runtime/overhaul-20261009/build-'+build);paths.add(root/'receipt.json')
protected=[row(root/'playable-root'/x['path']) for x in json.loads((root/'receipt.json').read_text())['files']]
commands={'tests':['npm.cmd','exec','--','vitest','run','tests/client-reports092.test.ts'],'build':['npm.cmd','run','build'],'freeze':['python','tools/overhaul-player-integration-095/freeze048.py'],'candidate':['python','tools/overhaul-player-integration-095/launch.py']}
p=h/(mode+'-seal.json');assert not p.exists();p.write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'protected':protected,'command':commands[mode],'scope':'ONE092 local-evidence admission check and093 contact-design candidate; first genuinefailure stops; no netFPS/IAB or fullscope approval.'},indent=2));print(mode+' sealed')
