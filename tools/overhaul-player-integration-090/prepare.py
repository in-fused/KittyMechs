from pathlib import Path
import json,hashlib,sys
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
mode=sys.argv[1];assert mode in ['syntax','baseline','build','freeze','candidate']
paths={p for n in ['tools/overhaul-camera-087','tools/overhaul-gait-088','tools/overhaul-player-view-089','tools/overhaul-player-integration-090'] for p in (r/n).rglob('*') if p.is_file() and not p.name.endswith('-seal.json')}
paths.update(r/x for x in ['tools/overhaul-root-round-027/run-seal.py','tools/overhaul-play-ready.mjs','package.json','package-lock.json'])
if mode in ['build','freeze','candidate']:
 review=r/'docs/overhaul/critic/player089-source-review.md';assert 'APPROVE' in review.read_text(encoding='utf8');paths.add(review)
if mode=='build':
 paths.update(p for n in ['src','shared','server'] for p in (r/n).rglob('*') if p.is_file());paths.update(r/x for x in ['tsconfig.json','vite.config.ts'])
if mode=='freeze':
 paths.update(p for p in (r/'dist').rglob('*') if p.is_file());paths.add(r/'.sites-runtime/overhaul-20261010/player090-build/process-receipt.json')
build='047' if mode=='candidate' else '045';root=r/('.sites-runtime/overhaul-20261009/build-'+build);paths.add(root/'receipt.json')
protected=[row(root/'playable-root'/x['path']) for x in json.loads((root/'receipt.json').read_text())['files']]
commands={'syntax':['node','--check','tools/overhaul-player-view-089/capture.mjs'],'build':['npm.cmd','run','build'],'freeze':['python','tools/overhaul-player-integration-090/freeze047.py']}
command=commands.get(mode,['python','tools/overhaul-player-integration-090/launch.py',mode])
p=h/(mode+'-seal.json');assert not p.exists();p.write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'protected':protected,'command':command,'scope':'One camera087/gait088 public review; first failure stops; no FPS/IAB or mission approval.'},indent=2));print(mode+' sealed')
