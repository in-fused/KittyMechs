"""Observation-only wrapper around the exact approved run-primary209.py.
Records owned descendant PID+creation identity; kills only surviving verified
owned identities after a primary timeout. It changes no closed source rows."""
import pathlib,subprocess,time,json,datetime,sys
root=pathlib.Path(__file__).resolve().parents[2];site=root/'.sites-runtime/overhaul-20261010/delivery209-primary';site.mkdir(parents=True,exist_ok=True)
def census():
 command="Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('python.exe','node.exe','msedge.exe') } | Select-Object ProcessId,ParentProcessId,Name,@{n='CreationIdentity';e={$_.CreationDate.ToUniversalTime().ToString('o')}} | ConvertTo-Json -Compress"
 out=subprocess.run(['powershell.exe','-NoProfile','-NonInteractive','-Command',command],capture_output=True,text=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=5).stdout.strip();r=json.loads(out) if out else [];return r if isinstance(r,list) else [r]
started=time.monotonic();owned={};status='TERMINAL';command=[sys.executable,str(root/'tools/overhaul-delivery-primary-209/run-primary209.py')]
with (site/'tracked-wrapper-stdout.txt').open('w',encoding='utf8') as log:
 p=subprocess.Popen(command,cwd=root,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 while p.poll() is None:
  rows=census();parents={p.pid}|set(owned)
  while True:
   fresh=[r for r in rows if r['ParentProcessId'] in parents and r['ProcessId'] not in parents]
   if not fresh:break
   for r in fresh:owned[r['ProcessId']]=r;parents.add(r['ProcessId'])
  if time.monotonic()-started>38:
   status='OUTER_TIMEOUT';break
  time.sleep(.1)
 after=census();survivors=[r for r in after if r['ProcessId'] in owned and r['CreationIdentity']==owned[r['ProcessId']]['CreationIdentity']];cleanup=[]
 for r in survivors:
  # Verify the PID has not been recycled immediately before termination.
  current=next((x for x in census() if x['ProcessId']==r['ProcessId'] and x['CreationIdentity']==r['CreationIdentity']),None)
  if current:
   result=subprocess.run(['taskkill','/PID',str(r['ProcessId']),'/T','/F'],stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW,timeout=5);cleanup.append({'identity':r,'exitCode':result.returncode})
 if p.poll() is None:p.kill();p.wait(timeout=5)
 final=census();remaining=[r for r in final if r['ProcessId'] in owned and r['CreationIdentity']==owned[r['ProcessId']]['CreationIdentity']]
receipt={'scope':'observation-only exact primary wrapper; no changed source guards','command':command,'wrapperPID':p.pid,'wrapperExitCode':p.returncode,'status':status,'elapsedSeconds':time.monotonic()-started,'ownedDescendants':list(owned.values()),'survivorsAfterPrimary':survivors,'cleanup':cleanup,'remainingOwnedIdentities':remaining,'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat()};(site/'owned-process-identities209.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt));raise SystemExit(0 if p.returncode==0 and not remaining and status=='TERMINAL' else 1)
