import subprocess,time,json,pathlib,datetime,hashlib
r=pathlib.Path.cwd();p=r/'tools/overhaul-motion-audit-176';inputs=['tools/overhaul-motion-174/source-seal.json','tools/overhaul-motion-174/validate174.mts','tools/overhaul-motion-174/decoded-receipt174.json','assets/source/overhaul-pounce-motion-174/authored-motion-records174.json','public/assets/overhaul/pounce-motion-174/Pounce_Motion174.glb','docs/overhaul/critic/motion174-failure-review.md','tools/overhaul-locomotion-143/load-rig143.ts','src/game/entities/movingRFfeet067.ts']
def row(n):
 b=(r/n).read_bytes();return {'path':n,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
ledger=[row(n) for n in inputs];seal=json.loads((r/'tools/overhaul-motion-174/source-seal.json').read_text());pre=[{'path':x['path'],'match':row(x['path'])['sha256']==x['sha256']} for x in seal['files']];assert all(x['match'] for x in pre)
(p/'protected-inputs176.json').write_text(json.dumps({'writer':'CLOSED','inputs':ledger,'174sealRows':len(pre),'174preMatches':True},indent=2))
command=['node','node_modules/tsx/dist/cli.mjs','tools/overhaul-motion-audit-176/audit176.mts'];start=time.monotonic();receipt={'writer':'CLOSED','command':command,'capSeconds':30,'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat()}
with (p/'stdout176.txt').open('w',encoding='utf8') as f:
 proc=subprocess.Popen(command,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW);receipt['pid']=proc.pid
 try:receipt['exitCode']=proc.wait(timeout=30);receipt['status']='TERMINAL'
 except subprocess.TimeoutExpired:proc.kill();receipt['exitCode']=proc.wait(timeout=10);receipt['status']='TIMEOUT_OWN_PID_KILLED'
receipt['elapsedSeconds']=time.monotonic()-start;receipt['closedUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();receipt['inputMatchesAfter']=[{'path':x['path'],'match':row(x['path'])['sha256']==x['sha256']} for x in ledger];receipt['all174RowsMatchAfter']=all(row(x['path'])['sha256']==x['sha256'] for x in seal['files']);(p/'process176.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt));raise SystemExit(receipt['exitCode'])
