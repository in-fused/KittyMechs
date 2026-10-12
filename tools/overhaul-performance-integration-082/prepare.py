from pathlib import Path
import json,hashlib,sys
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;a=r/'tools/overhaul-performance-081'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
mode=sys.argv[1];assert mode in ['syntax','containment','baseline','build','candidate']
if mode in ['baseline','build','candidate']:
 assert json.loads((a/'containment-result.json').read_text())['status']=='PASS_REVIEW_REQUIRED'
review=r/'docs/overhaul/critic/performance081-source-review.md';assert review.exists() and 'APPROVE' in review.read_text(encoding='utf8')
source=json.loads((a/'source-seal.json').read_text());assert all(row(r/x['path'])['sha256']==x['sha256'].lower() for x in source['files'])
paths={r/x['path'] for x in source['files']};paths.update([a/'source-seal.json',review,Path(__file__),h/'launch.py',r/'tools/overhaul-performance-integration-078/capture.mjs',r/'tools/overhaul-root-round-027/run-seal.py',r/'tools/overhaul-play-ready.mjs',r/'package.json',r/'package-lock.json'])
if mode=='syntax': command=['node','--check','tools/overhaul-performance-integration-078/capture.mjs']
elif mode=='containment': command=['node','--import','tsx','tools/overhaul-performance-081/containment-check.ts']
elif mode=='build':
 test=a/'containment-result.json';assert json.loads(test.read_text())['status']=='PASS_REVIEW_REQUIRED';paths.add(test)
 baseline=r/'.sites-runtime/overhaul-20261010/performance082-baseline/evidence.json';assert json.loads(baseline.read_text())['status']=='CAPTURED_INDEPENDENT_REVIEW_REQUIRED';paths.add(baseline)
 paths.update(p for n in ['src','shared','server'] for p in (r/n).rglob('*') if p.is_file());paths.update(r/p for p in ['tsconfig.json','vite.config.ts'])
 command=['npm.cmd','run','build']
else: command=['python','tools/overhaul-performance-integration-082/launch.py',mode]
build='046' if mode=='candidate' else '045';root=r/('.sites-runtime/overhaul-20261009/build-'+build);paths.add(root/'receipt.json')
protected=[row(root/'playable-root'/x['path']) for x in json.loads((root/'receipt.json').read_text())['files']]
p=h/(mode+'-seal.json');assert not p.exists();p.write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'protected':protected,'command':command,'scope':'082 directed081 attached skin cache lifecycle correction conservative enemy animated culling; containment plus ONEidentical baseline/candidate normal capture; no animation/contact/physics throttling, firstfailure stop. Fullgoal/userlag unresolved.'},indent=2));print(mode+' sealed')
