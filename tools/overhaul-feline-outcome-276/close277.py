from pathlib import Path
import json,hashlib,statistics
r=Path(__file__).resolve().parents[2];run=r/'.sites-runtime/shader-startup-238';out=run/'public277'
e=json.loads((out/'evidence.json').read_text(encoding='utf-8'))
p=json.loads((run/'supervisor277/process-receipt.json').read_text(encoding='utf-8'))
assert e['status']=='FIRST_GENUINE_FAILURE_STOP' and p['exitCode']==1 and p['failure'] is None
assert p['finalOriginalIdentitiesRetired'] and p['inclusiveBoundObserved']
assert all(x['match'] for x in e['protectedAfter277']) and all(x['status']=='CLOSED_OR_COMPLETED' for x in e['cleanup'])
def row(path):
    b=path.read_bytes();return {'path':path.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def stats(values):
    v=sorted(x for x in values if isinstance(x,(int,float)));return {'count':len(v),'median':statistics.median(v),'p95':v[min(len(v)-1,int(.95*len(v)))],'maximum':v[-1]} if v else {'count':0}
summary={'writer':'CLOSED','status':e['status'],'failure':e['failure'].splitlines()[0],'childElapsedMs':e['elapsedMs'],'inclusiveElapsedMs':e['inclusiveElapsedMs'],'supervisorSeconds':p['elapsedSeconds'],'ownedRetired':len(p['ownedPIDCreationTimes']),'protectedMatch':True,'cleanupClosed':len(e['cleanup']),'errors':e['errors'],'unfinishedPhase':e['unfinishedPhase'],'movingR':'UNTESTED','contactQualified':False,'publicUpgradeApproved':False,'actionReturn':e['actionReturn277'],'optional':e['optional277'],'lifecycle':e['lifecycle'],'performanceScope':'Two instrumented headless Edge processes with video/native history and controller reads; not causal saving, matched baseline or affected-human FPS.'}
summary['waypoints']=[]
for w in e['waypoints']:
    pulses=w.get('pulses',[])
    compact=[]
    for x in pulses:
        edge=x.get('keyEdges',{});compact.append({k:x.get(k) for k in ['iteration','keys','requestedLeaseMs','actualTravel','restDistance']}|{'start':x.get('start',{}).get('position'),'rest':x.get('rest',{}).get('position'),'heldMs':edge.get('heldEnd',0)-edge.get('heldStart',0)})
    summary['waypoints'].append({'name':w.get('name'),'target':w.get('target'),'status':w.get('status'),'pulseCount':len(pulses),'pulses':compact})
summary['performance']={}
for name in ['Mission177Host','Mission177Guest']:
    samples=[x for x in e['nativeModes277'] if x.get('name')==name]
    local=[next((a['diagnostic'] for a in x.get('native',{}).get('registry',{}).get('rows',[]) if a['actor']==x.get('actor',{}).get('id')),{}) for x in samples]
    summary['performance'][name]={'samples':len(samples),'HUDfps':stats([x.get('performance',{}).get('fps') for x in samples]),'ownerMs':stats([x.get('costMs') for x in local]),'modes':sorted(set(x.get('mode','UNKNOWN') for x in local))}
(out/'summary277.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
for folder in [out,run/'supervisor277']:
    assert not (folder/'output-seal.json').exists()
    files=[row(x) for x in sorted(folder.rglob('*')) if x.is_file()]
    (folder/'output-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':'One failed private277 mission capture; firstfailure preserved; no motion/contact/fullmission/public/humanlag approval','files':files},indent=2),encoding='utf-8')
print(json.dumps({'summary':{k:v for k,v in summary.items() if k!='waypoints'},'seals':[row(out/'output-seal.json'),row(run/'supervisor277/output-seal.json')]}))
