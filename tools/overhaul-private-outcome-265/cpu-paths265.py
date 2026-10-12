from pathlib import Path
import json, collections
r=Path(__file__).resolve().parents[2];run=r/'.sites-runtime/shader-startup-238'
raw=json.loads((run/'public259/host-post-admission-cpu259.json').read_text(encoding='utf-8'))
p=raw['profile'];nodes={n['id']:n for n in p['nodes']};parents={}
for n in p['nodes']:
    for child in n.get('children',[]):
        assert child not in parents
        parents[child]=n['id']
selfms=collections.defaultdict(float);inclusive=collections.defaultdict(float)
for node,delta in zip(p['samples'],p['timeDeltas']):
    selfms[node]+=delta/1000
    current=node
    while current in nodes:
        inclusive[current]+=delta/1000
        current=parents.get(current)
def frame(node):
    x=nodes[node]['callFrame']
    return {k:x[k] for k in ['functionName','url','lineNumber','columnNumber']}
groups={}
for node,value in selfms.items():
    f=frame(node);key=tuple(f.values())
    groups.setdefault(key,{**f,'sampledSelfMs':0})['sampledSelfMs']+=value
def path(node):
    result=[]
    while node in nodes:
        result.append(frame(node));node=parents.get(node)
    return list(reversed(result))
paths=[{'sampledSelfMs':selfms[n],'path':path(n)} for n in sorted(selfms,key=selfms.get,reverse=True) if nodes[n]['callFrame']['url'].startswith('wasm:')][:5]
functions=[{'sampledInclusiveMs':v,'path':path(n)} for n,v in sorted(inclusive.items(),key=lambda x:x[1],reverse=True) if '/assets/GameCanvas-' in nodes[n]['callFrame']['url'] and len(nodes[n]['callFrame']['functionName'])>2][:12]
result={'writer':'CLOSED','scope':'CPU-only grouping and calling paths from original single259 profile; no replay','profileDurationMs':(p['endTime']-p['startTime'])/1000,'sampledMs':sum(selfms.values()),'groupedSelf':sorted(groups.values(),key=lambda x:x['sampledSelfMs'],reverse=True)[:20],'topWasmPaths':paths,'gameCanvasInclusivePaths':functions,'limits':'Nominal3s timer yielded3.763s protocol profile. Inclusive paths overlap and must not be summed; same function at multiple callers can overlap recursively. Statistical observed work includes diagnostics, video and CDP overhead; not a GPU/human-lag diagnosis.'}
target=run/'review265/cpu-paths.json';assert not target.exists();target.write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({'groupedSelf':result['groupedSelf'][:5],'topWasmPath':[x['functionName'] for x in paths[0]['path']] if paths else [],'gameCanvasTop':[(x['sampledInclusiveMs'],[f['functionName'] for f in x['path']][-3:]) for x in functions[:6]]}))
