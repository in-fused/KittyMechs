from pathlib import Path
import hashlib,json,statistics,collections
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
seal=json.loads(Path(__file__).with_name('play-seal.json').read_text())
for x in seal['files']:assert row(r/x['path'])==x,x['path']
folder=r/'.sites-runtime/overhaul-20261010/low059-play';e=json.loads((folder/'evidence.json').read_text());a=sorted(e['frames']);groups=collections.defaultdict(list)
for s in e['samples']:groups[s['phase']].append(s)
analysis={'scope':'ONE041 Low ordinary movement/two stances and actual report/resize/resume. Buffer area confirmed; no causal speedup/IAB lag/60FPS/GPUtime or fullcamera/gait/contact/mission acceptance. Report spacing overlap found in actual PNG;060source only repair remains unbuilt.', 'status':e['status'],'errors':e['errors'],'frames':len(a),'rAFms':{'median':statistics.median(a),'p95':a[int(.95*(len(a)-1))],'p99':a[int(.99*(len(a)-1))],'mean':statistics.mean(a)},'buffers':e['buffers'],'phases':[]}
for phase,s in groups.items():
 local=s[-1]['snapshot']['actors']; ident=s[-1]['owner'].get('actor') if s[-1].get('owner') else None
 analysis['phases'].append({'phase':phase,'samples':len(s),'fpsRange':[min(v['performance']['fps'] for v in s),max(v['performance']['fps'] for v in s)],'lastOwner':s[-1].get('owner'),'local':next((v for v in local if v['id']==ident),None),'lastInput':s[-1]['input']})
out=folder/'analysis.json';assert not out.exists();out.write_text(json.dumps(analysis,indent=2),encoding='utf8')
paths=[p for name in ['low059-play','low059-play-process'] for p in (r/'.sites-runtime/overhaul-20261010'/name).rglob('*') if p.is_file()]
paths += [r/'.sites-runtime/overhaul-20261010/low059-cleanup.json',Path(__file__),Path(__file__).with_name('cleanup.ps1')]
out=Path(__file__).with_name('play-result-seal.json');assert not out.exists();out.write_text(json.dumps({'scope':analysis['scope'],'files':[row(p) for p in paths],'inputsVerified':len(seal['files'])},indent=2),encoding='utf8');print(row(out))
