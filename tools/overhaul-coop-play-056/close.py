from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261010/coop056-public'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s=json.loads((r/'tools/overhaul-coop-play-056/run-seal.json').read_text())
for x in s['files']+s['protected']:assert row(r/x['path'])==x,x['path']
proc=r/'.sites-runtime/overhaul-20261010/coop056-process/process-receipt.json';v=json.loads(proc.read_text());assert v['failure'] is None and v['inclusiveBoundObserved'] and all(x['match'] for x in v['inputsAfter'])
e=json.loads((p/'evidence.json').read_text(encoding='utf8'))
out={'status':e['status'],'failure':e.get('failure'),'unfinishedPhase':e.get('unfinishedPhase'),'errors':e['errors'],'elapsedMs':e['inclusiveElapsedMs'],'parity':len(e['native']['parity']),'mismatches':sum(not x['worldEqual'] for x in e['native']['parity']),'completion':e.get('completion'),'movementFailures':e.get('movementFailures'),'tracking':[{k:a.get(k) for k in ['name','target','exit','startedAt','finishedAt','lastObserved']} for a in e.get('tracking',[])],'events':[]}
for event in e['events']:
 out['events'].append({'label':event['label'],'phase':event['phase'],'at':event['at'],'clients':{label:{'actors':event[label]['snapshot']['actors'],'checkpoint':event[label]['snapshot']['checkpoint'],'objectives':event[label]['snapshot']['objectives'],'performance':event[label]['performance'],'camera':event[label]['camera'],'owners':event[label].get('owners')} for label in ['host','guest']}})
dest=p/'summary.json';assert not dest.exists();dest.write_text(json.dumps(out,indent=2),encoding='utf8')
paths=[proc,proc.parent/'stdout.txt']+sorted(p.glob('*'))
sealed=r/'tools/overhaul-coop-play-056/result-seal.json';assert not sealed.exists();sealed.write_text(json.dumps({'scope':'056 actual normal038mission result, independent review pending; original both own evidence','files':[row(x) for x in paths if x.is_file()]},indent=2),encoding='utf8')
print(json.dumps({k:out[k] for k in ['status','failure','unfinishedPhase','elapsedMs','parity','mismatches','completion']}));print(hashlib.sha256(sealed.read_bytes()).hexdigest())
