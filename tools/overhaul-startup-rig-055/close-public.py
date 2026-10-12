from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261010/startup055-public'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
seal=json.loads((r/'tools/overhaul-startup-rig-055/public-seal.json').read_text())
for x in seal['files']+seal['protected']:assert row(r/x['path'])==x,x['path']
proc=r/'.sites-runtime/overhaul-20261010/startup055-public-process/process-receipt.json';v=json.loads(proc.read_text());assert v['exitCode']==0 and v['failure'] is None and all(x['match'] for x in v['inputsAfter'])
e=json.loads((p/'evidence.json').read_text(encoding='utf8'));assert not e.get('errors') and not e.get('cleanupFailure')
summary={'status':e['status'],'readiness':e['readiness'],'parityComparisons':len(e['native']['parity']),'parityMismatches':sum(not x['worldEqual'] for x in e['native']['parity']),'startUTC':e['startUTC'],'closedUTC':e['closedUTC'],'clients':{}}
last=e['events'][-1]
for label,name in [('host','MissionHost'),('guest','MissionGuest')]:
 state=last[label];actor=next(a for a in state['snapshot']['actors'] if a['name']==name);owner=next(o for o in state['owners']['diagnostics'] if o['actor']==actor['id'])
 summary['clients'][label]={'camera':state['camera'],'owner':owner,'performance':state['performance'],'inputMountedAt':state['input'].get('browser',{}).get('mountedAt'),'humanNames':[a['name'] for a in state['snapshot']['actors']],'scope':'Single startup observation; no movement/mission/performance qualification'}
out=p/'summary.json';assert not out.exists();out.write_text(json.dumps(summary,indent=2),encoding='utf8')
paths=[proc,proc.parent/'stdout.txt',r/'.sites-runtime/overhaul-20261010/live038-http-verification.json',r/'.sites-runtime/overhaul-20261010/live038-server.json']+sorted(p.glob('*'))
dest=r/'tools/overhaul-startup-rig-055/public-result-seal.json';assert not dest.exists()
dest.write_text(json.dumps({'scope':'055 ONE uninstrumented actual038 startup success, independent review pending','files':[row(x) for x in paths if x.is_file()]},indent=2),encoding='utf8')
print(json.dumps({'status':summary['status'],'readiness':summary['readiness'],'parityComparisons':summary['parityComparisons'],'parityMismatches':summary['parityMismatches'],'resultSealSHA256':hashlib.sha256(dest.read_bytes()).hexdigest()}))
