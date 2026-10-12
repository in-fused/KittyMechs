from pathlib import Path
import json,math
r=Path(__file__).resolve().parents[2];out={}
for label in ['baseline','candidate']:
 folder=r/f'.sites-runtime/overhaul-20261010/experience057-{label}';e=json.loads((folder/'evidence.json').read_text(encoding='utf8'));s=json.loads((folder/'summary.json').read_text(encoding='utf8'));phases=[]
 for phase in dict.fromkeys(x['phase'] for x in e['samples']):
  rows=[x for x in e['samples'] if x['phase']==phase];actors=[next(a for a in x['snapshot']['actors'] if a['name']=='Experience057') for x in rows];positions=[a['position'] for a in actors]
  phases.append({'phase':phase,'stance':list(dict.fromkeys(a['stance'] for a in actors)),'hpFirstLast':[actors[0]['hp'],actors[-1]['hp']],'firstPosition':positions[0],'lastPosition':positions[-1],'horizontalDisplacement':math.hypot(positions[-1]['x']-positions[0]['x'],positions[-1]['z']-positions[0]['z']),'nonneutralSamples':sum(abs(x['input']['input']['forward'])+abs(x['input']['input']['strafe'])>0 for x in rows),'acknowledgedSentNonneutral':sum(x['input'].get('lastSent') is not None and actors[i]['lastInput']>=x['input']['lastSent']['input']['seq'] and abs(x['input']['lastSent']['input']['forward'])+abs(x['input']['lastSent']['input']['strafe'])>0 for i,x in enumerate(rows))})
 out[label]={'status':e['status'],'frameMs':s['frameMs'],'phases':phases,'renderer':s['gpu'].get('auxAttributes',{}).get('glRenderer')}
p=r/'.sites-runtime/overhaul-20261010/experience057-comparison.json';assert not p.exists();p.write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))
