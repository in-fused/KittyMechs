from pathlib import Path
import hashlib,json,subprocess,time,datetime
r=Path(__file__).resolve().parents[2];out=r/'.sites-runtime/overhaul-20261011/readiness211-private';out.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
sealPath=r/'tools/overhaul-readiness-211/source-seal211.json'
assert sha(sealPath)=='0c579f94b28e3560b27c90b578e98243622074e9c14e9e3aefad05a3bac3da47'
seal=json.loads(sealPath.read_text(encoding='utf8'));rows=seal['files']+seal['protectedInputs']
for x in rows:assert sha(r/x['path'])==x['sha256'],x['path']
frozen=r/'.sites-runtime/overhaul-20261009/build-062'
assert sha(frozen/'receipt.json')=='5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c'
receipt=json.loads((frozen/'receipt.json').read_text(encoding='utf8'));protected=[]
for x in receipt['files']:
 p=frozen/'playable-root'/x['path'];assert sha(p)==x['sha256'],x['path'];protected.append((p,x['sha256']))
 if x['path'].startswith(('src/','shared/','server/')):
  p=r/x['path'];assert sha(p)==x['sha256'],x['path'];protected.append((p,x['sha256']))
command=['node','tools/overhaul-readiness-211/build211.mjs'];start=time.monotonic();result={'command':command,'capSeconds':60,'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceSealSHA':sha(sealPath)}
with (out/'build-stdout.txt').open('w',encoding='utf8') as log:
 p=subprocess.Popen(command,cwd=r,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW);result['pid']=p.pid
 try:result['exitCode']=p.wait(timeout=60);result['status']='TERMINAL'
 except subprocess.TimeoutExpired:
  subprocess.run(['taskkill','/PID',str(p.pid),'/T','/F'],stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW,timeout=5);result['exitCode']=p.wait(timeout=5);result['status']='TIMEOUT_OWN_BUILD_TREE_KILLED'
result['elapsedSeconds']=time.monotonic()-start
result['sourceAfter']=[{'path':x['path'],'match':sha(r/x['path'])==x['sha256']} for x in rows]
result['frozenAndRuntimeProtectedCount']=len(protected);result['protectedMatch']=all(sha(p)==s for p,s in protected)
result['outputs']=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in (out/'dist').rglob('*') if p.is_file()]
(out/'build-process-receipt.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in result.items() if k not in ['outputs','sourceAfter']}))
assert result['protectedMatch'] and all(x['match'] for x in result['sourceAfter'])
raise SystemExit(result['exitCode'])
