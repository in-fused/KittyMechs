from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];raw=r/'.sites-runtime/overhaul-20261011/native228-public/evidence.json';e=json.loads(raw.read_text());summary={'rawSHA256':hashlib.sha256(raw.read_bytes()).hexdigest(),'status':e['status'],'failure':e.get('failure'),'unfinishedPhase':e.get('unfinishedPhase'),'elapsedMs':e['elapsedMs'],'events':len(e['events']),'cases':e['cases'],'cleanup':e['cleanup'],'protectedBefore':all(x['match'] for x in e['protectedBefore']),'protectedAfter':all(x['match'] for x in e['protectedAfter']),'errors':e['errors'],'networkErrors':[x for x in e['network'] if x.get('type') in ['requestfailed','http-error']],'pilots':{}}
for name in ['Native228Host','Native228Guest']:
 rows=[x for x in e['events'] if x.get('pilot')==name];last=rows[-1] if rows else {};native=last.get('native') or {};reg=native.get('registry') or {};actor=last.get('actor') or {};diag=next((x.get('diagnostic') for x in reg.get('rows',[]) if x['actor']==actor.get('id')),None)
 summary['pilots'][name]={'observations':len(rows),'firstWallMs':rows[0]['wallMs'] if rows else None,'lastWallMs':last.get('wallMs'),'labels':list(dict.fromkeys(x.get('label') for x in rows)),'readiness':last.get('localReadiness'),'actor':{'id':actor.get('id'),'position':actor.get('position'),'stance':actor.get('stance'),'nativePose':actor.get('nativePose')},'nativeDiagnostic':diag,'visuals':native.get('visuals'),'performance':last.get('performance'),'resources':last.get('resources'),'telemetry':last.get('telemetry')}
summary['submitAndDeadlines']=[x for x in e['events'] if 'deadlineWallMs' in x]
out=Path(__file__).resolve().parent/'actual-summary.json';out.write_text(json.dumps(summary,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in summary.items() if k!='pilots'}))
for name,p in summary['pilots'].items():
 print(json.dumps({'pilot':name,**{k:v for k,v in p.items() if k not in ['actor','resources','telemetry','nativeDiagnostic','visuals']},'nativeDiagnostic':p['nativeDiagnostic'],'resources':len(p.get('resources') or []),'longTasks':(p.get('telemetry') or {}).get('longTasks')}))
