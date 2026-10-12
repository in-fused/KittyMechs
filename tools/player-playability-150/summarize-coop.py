from pathlib import Path
import json,hashlib,urllib.request,sys
n=sys.argv[1] if len(sys.argv)>1 else '151';assert n in ['151','153']
r=Path(__file__).resolve().parents[2];base=r/'.sites-runtime/overhaul-20261010';out=base/('playability150-coop-review' if n=='151' else 'playability153-coop-review');out.mkdir(exist_ok=False)
e=json.loads((base/f'coop{n}-public/evidence.json').read_text(encoding='utf8'));receipt=json.loads((base/f'coop{n}-public-observation/process-receipt.json').read_text(encoding='utf8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
events=[]
for v in e['events']:
 s=v['host']['snapshot'];events.append({'label':v['label'],'phase':v['phase'],'tick':s['tick'],'checkpoint':s.get('checkpoint'),'coop':s.get('coop'),'objectives':s.get('objectives'),'performance':{k:v[k]['performance'] for k in ['host','guest']}})
health=json.loads(urllib.request.urlopen('http://localhost:8799/health',timeout=5).read())
assert receipt['inclusiveBoundObserved'] and all(x['match'] for x in receipt['inputsAfter'])
assert health['rooms']==health['players']==0
summary={'packet':n,'status':e['status'],'failure':e.get('failure'),'unfinishedPhase':e.get('unfinishedPhase'),'events':events,'planningDecisions':len(e.get('planning151',[])),'lastPlanning':e.get('planning151',[])[-1:] ,'lifecycle':e.get('lifecycle'),'parityCount':len(e['native']['parity']),'parityAllEqual':all(v['worldEqual'] and v['actorsEqual'] and v['tickEqual'] for v in e['native']['parity']),'errors':e['errors'],'cleanup':e['cleanup'],'resourceInventory':e['resourceInventory'],'rootSeconds':receipt['elapsedSeconds'],'rootExit':receipt['exitCode'],'inputRows':len(receipt['inputsAfter']),'allInputsMatch':True,'idleHealth':health,'evidenceSHA256':sha(base/f'coop{n}-public/evidence.json'),'processReceiptSHA256':sha(base/f'coop{n}-public-observation/process-receipt.json'),'videos':{k:e[k+'Video'] for k in ['host','guest']},'scope':'Ordinary frozen056 check stopped at first failure; only explicitly recorded phases qualify. Full co-op/lifecycle/latejoin unqualified. No automatic replay.'}
(out/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
print(json.dumps({k:summary[k] for k in ['status','failure','unfinishedPhase','parityCount','parityAllEqual','rootSeconds','rootExit','inputRows','allInputsMatch','scope']}))
