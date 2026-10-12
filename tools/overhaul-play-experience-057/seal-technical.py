from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
h=json.loads((r/'tools/overhaul-camera-057/source-handoff.json').read_text());c=json.loads((r/'tools/overhaul-render-cull-057/source-seal.json').read_text());b=json.loads((r/'tools/overhaul-play-experience-057/baseline-seal.json').read_text());rows={x['path']:x for x in h['files']+h['protected']+c['rows']+b['protected']}
for p in [Path(__file__),r/'tools/overhaul-camera-057/source-handoff.json',r/'tools/overhaul-render-cull-057/source-seal.json',r/'docs/overhaul/critic/camera-057-source-review.md',r/'tests/camera-framing.test.ts',r/'tests/camera-clearance.test.ts',r/'src/game/camera/clearance.ts',r/'package.json']:
 rows[p.relative_to(r).as_posix()]=row(p)
for x in rows.values():assert row(r/x['path'])==x,x['path']
for job,cmd in [('test',h['rootTestCommand']),('build',h['rootBuildCommand'])]:
 p=r/f'tools/overhaul-play-experience-057/{job}-seal.json';assert not p.exists();p.write_text(json.dumps({'files':list(rows.values()),'command':cmd,'scope':'057focusedcamera validation thenconditionalbuild. Frozen038 and sourcepreimagesprotected. No test-onlygameplayapproval.'},indent=2),encoding='utf8')
print(len(rows))
