from pathlib import Path
import json, hashlib, statistics, collections

r=Path(__file__).resolve().parents[2]
run=r/'.sites-runtime/shader-startup-238'
assert run.is_junction() and run.resolve()==Path('D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238').resolve()
d=json.loads((run/'public259/evidence.json').read_text(encoding='utf-8'))
p=json.loads((run/'supervisor259/process-receipt.json').read_text(encoding='utf-8'))
assert d['writer']=='CLOSED' and p['exitCode']==0
out=run/'review265';out.mkdir(exist_ok=False)

def q(v):
    return {'count':len(v),'median':statistics.median(v) if v else None,'p95':sorted(v)[int(.95*(len(v)-1))] if v else None,'max':max(v) if v else None}

s={'writer':'CLOSED','status':d['status'],'supervisorSeconds':p['elapsedSeconds'],'childMs':d['elapsedMs'],'knownOriginalIdentities':len(p['ownedPIDCreationTimes']),'retired':p['finalOriginalIdentitiesRetired'],'rootTerminal':'12026_EXIT0_CONSUMED_8ea730','cleanupClosed':all(x['status']=='CLOSED' for x in d['cleanup']),'cleanupCount':len(d['cleanup']),'errors':len(d['errors']),'protectedBeforeMatch':all(x['match'] for x in d['protectedBefore']),'protectedAfterMatch':all(x['match'] for x in d['protectedAfter']),'publicPulses':d['pulseCount'],'qualityApproved':False,'humanLagResolved':False,'pilots':{}}
for name in ['Controls259Host','Controls259Guest']:
    ev=[e for e in d['events'] if e.get('pilot')==name]
    role='host' if name.endswith('Host') else 'guest'
    submit=next(e for e in d['events'] if e['label']==role+'-submit')
    admitted=next(e for e in ev if e['label']=='canvas-input-admission-complete')
    seen={}
    for e in ev:
        for row in (e.get('native') or {}).get('registry',{}).get('rows',[]):
            dg=row['diagnostic'];g=(dg.get('sourceTasks') or {}).get('grounded250')
            if row['actor']==(e.get('actor') or {}).get('id') and g:
                seen[dg['frameClock']]={'event':e['label'],'ownerCostMs':dg.get('costMs'),'grounded':g,'mainRenderNormal':dg.get('grounded246')}
    samples=list(seen.values())
    fulfilled=[f for x in samples for f in x['grounded']['feet'] if f.get('fulfilled')]
    last=next(e for e in reversed(ev) if e.get('telemetry'))
    s['pilots'][name]={'admissionMs':admitted['wallMs']-submit['wallMs'],'timely':admitted['wallMs']<=submit['deadlineWallMs'],'uniqueKernelFrames':len(samples),'fulfilledFootSamples':len(fulfilled),'fulfilledPointResidualMetres':q([f['samePointError'] for f in fulfilled]),'kernelCostMs':q([x['grounded']['costMs'] for x in samples]),'ownerCostMs':q([x['ownerCostMs'] for x in samples if x['ownerCostMs'] is not None]),'last300MixedInstrumentedRAFMsecs':q([x['ms'] for x in last['telemetry']['frames'][-300:]]),'lastHUD':last['performance'],'limits':'Unmatched mixed two-client video/observer/profile workload; no measured human gain or whole-gait contact qualification. Kernel included in owner cost, passive observer additional.'}

raw=json.loads((run/'public259/host-post-admission-cpu259.json').read_text(encoding='utf-8'))
assert raw['writer']=='CLOSED'
profile=raw['profile'];nodes={n['id']:n for n in profile['nodes']};cost=collections.defaultdict(float)
for node,delta in zip(profile.get('samples',[]),profile.get('timeDeltas',[])):
    cost[node]+=delta/1000
total=sum(cost.values())
s['cpuProfile']={'scope':raw['scope'],'wallMs':raw['endedWall']-raw['startedWall'],'profileMicros':profile['endTime']-profile['startTime'],'samples':len(profile.get('samples',[])),'sampledMs':total,'topSelfSamples':[{'function':nodes[n]['callFrame']['functionName'],'url':nodes[n]['callFrame']['url'],'lineZeroBased':nodes[n]['callFrame']['lineNumber'],'columnZeroBased':nodes[n]['callFrame']['columnNumber'],'sampledSelfMs':v,'fraction':v/total if total else 0} for n,v in sorted(cost.items(),key=lambda x:x[1],reverse=True)[:20]],'limits':'Statistical CPU self samples including observers; not GPU, exact function timers, matched causal comparison or affected-human diagnosis. Minified names may need source mapping.'}
(out/'actual-summary.json').write_text(json.dumps(s,indent=2),encoding='utf-8')
for folder in [run/'public259',run/'supervisor259']:
    assert not (folder/'output-seal.json').exists()
    rows=[{'path':x.relative_to(r).as_posix(),'bytes':x.stat().st_size,'sha256':hashlib.sha256(x.read_bytes()).hexdigest()} for x in sorted(folder.rglob('*')) if x.is_file()]
    (folder/'output-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':'One completed optimized-owner259/profile observation; no public/gameplay/human-lag approval','files':rows},indent=2),encoding='utf-8')
print(json.dumps(s))
