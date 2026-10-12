"""UNRUN. One hidden CPU converter, 15-second cap, only after root approval."""
import subprocess,time,json,pathlib,datetime,hashlib
root=pathlib.Path(__file__).resolve().parents[2];folder=root/'tools/overhaul-delivery-209'
def check():
 seal=json.loads((folder/'source-seal209.json').read_text());return [dict(r,match=hashlib.sha256((root/r['path']).read_bytes()).hexdigest()==r['sha256'] and (root/r['path']).stat().st_size==r['bytes']) for r in seal['files']+seal['protectedInputs']]
before=check()
if not all(r['match'] for r in before):raise RuntimeError('209_SOURCE_OR_PROTECTED_INPUT_CHANGED')
if (folder/'output/Pounce_Anatomy209.glb').exists() or (folder/'conversion209-receipt.json').exists():raise RuntimeError('209_FRESH_DESTINATION_ONLY')
command=['node',str(folder/'convert209.mjs')];start=time.monotonic();receipt={'command':command,'capSeconds':15,'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'protectedBefore':before}
with (folder/'converter-stdout209.txt').open('w',encoding='utf8') as log:
 p=subprocess.Popen(command,cwd=root,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW);receipt['pid']=p.pid
 try:receipt['exitCode']=p.wait(timeout=15);receipt['status']='TERMINAL'
 except subprocess.TimeoutExpired:p.kill();receipt['exitCode']=p.wait(timeout=5);receipt['status']='TIMEOUT_OWN_NODE_KILLED'
receipt['elapsedSeconds']=time.monotonic()-start;receipt['closedUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();receipt['protectedAfter']=check();(folder/'converter-process209.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt));raise SystemExit(0 if receipt['exitCode']==0 and all(r['match'] for r in receipt['protectedAfter']) else 1)
