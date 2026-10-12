from pathlib import Path
import json
r=Path(__file__).resolve().parents[2];e=json.loads((r/'.sites-runtime/overhaul-20261010/coop056-public/evidence.json').read_text())
for f in e.get('movementFailures',[]):
 a=next(a for a in f['snapshot']['actors'] if a['name']==f['name'])
 print(json.dumps({'pilot':f['name'],'target':f['target'],'desired':f['desired'],'actor':{k:a.get(k) for k in ['id','hp','position','velocity','grounded','lastInput','climb','pair','downed']},'input':f['input'],'camera':f['camera'],'transport':f['transport']}))
last=e['events'][-1]
for label in ['host','guest']:
 s=last[label]['snapshot'];print(json.dumps({'client':label,'humans':[a for a in s['actors'] if not a['bot']],'objectiveComplete':[o['id'] for o in s['objectives'] if o['complete']],'checkpoint':s['checkpoint'],'performance':last[label]['performance'],'owners':last[label].get('owners')}))
