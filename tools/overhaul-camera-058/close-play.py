from pathlib import Path
import hashlib,json,collections
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
seal=json.loads(Path(__file__).with_name('play-seal.json').read_text())
for x in seal['files']:assert row(r/x['path'])==x,x['path']
folder=r/'.sites-runtime/overhaul-20261010/camera058-play';e=json.loads((folder/'evidence.json').read_text());groups=collections.defaultdict(list)
for s in e['samples']:groups[s['phase']].append(s)
analysis={'scope':'ONE040 ordinary movement/pitch completed; observer FIRSTFAILURE wrong postplay settings locator. No retry/no rAF aggregate retained. Sampled FPS not actualIAB/GPUtime. Upward .75 view constrained/obstructed; level/downward self visible. Gait034 unchanged.', 'status':e['status'],'failure':e['failure'],'errors':e['errors'],'phases':[]}
for phase,a in groups.items():
 analysis['phases'].append({'phase':phase,'samples':len(a),'fpsRange':[min(s['performance']['fps'] for s in a),max(s['performance']['fps'] for s in a)],'cameraContainedSamples':sum(bool(s['camera'].get('fitAvailable')) for s in a),'lastCamera':a[-1]['camera'],'lastLook':a[-1]['input'].get('look'),'lastPerformance':a[-1]['performance']})
out=folder/'analysis.json';assert not out.exists();out.write_text(json.dumps(analysis,indent=2),encoding='utf8')
paths=[p for name in ['camera058-play','camera058-play-process'] for p in (r/'.sites-runtime/overhaul-20261010'/name).rglob('*') if p.is_file()]
paths += [r/'.sites-runtime/overhaul-20261010/camera058-cleanup.json',Path(__file__),Path(__file__).with_name('cleanup.ps1')]
out=Path(__file__).with_name('play-result-seal.json');assert not out.exists();out.write_text(json.dumps({'scope':analysis['scope'],'files':[row(p) for p in paths],'inputsVerified':len(seal['files'])},indent=2),encoding='utf8');print(row(out))
