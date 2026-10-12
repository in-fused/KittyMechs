from pathlib import Path
import json
r=Path(__file__).resolve().parents[2];run=r/'.sites-runtime/shader-startup-238'
e=json.loads((run/'public277/evidence.json').read_text(encoding='utf-8'))
print(json.dumps({'keys':list(e),'status':e['status'],'failure':e.get('failure'),'cleanup':e.get('cleanup'),'errors':e.get('errors'),'elapsed':e.get('elapsedMs'),'actionReturn':e.get('actionReturn277'),'modeRows':len(e.get('nativeModes277',[]))},indent=2))
for w in e.get('waypoints',[]):
    pulses=w.get('pulses',[])
    compact=[{k:p.get(k) for k in ['iteration','keys','requestedLeaseMs','actualTravel','restDistance']}|{'start':p.get('start',{}).get('position'),'rest':p.get('rest',{}).get('position'),'heldMs':p.get('keyEdges',{}).get('heldDurationMs')} for p in pulses]
    print(json.dumps({'name':w.get('name'),'target':w.get('target'),'status':w.get('status'),'pulseCount':len(pulses),'compact':compact},indent=2))
for event in e.get('events',[]):
    print(json.dumps({'event':event.get('label'),'hostPerf':event.get('host',{}).get('performance'),'guestPerf':event.get('guest',{}).get('performance')}))
