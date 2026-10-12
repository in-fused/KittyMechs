import pathlib,ast
root=pathlib.Path(__file__).resolve().parents[2];folder=pathlib.Path(__file__).parent
source=(folder/'supervisor219-preimage.py').read_text()
for a,b in [("KITTYMECH_219_ACTUAL_APPROVED","KITTYMECH_221_ACTUAL_APPROVED"),("219 root actual gate absent","221 root actual gate absent"),("out=r/'.sites-runtime/overhaul-20261011/loading219-supervisor'","out=r/'tools/overhaul-pack-221/loader-supervisor'"),("['node','tools/overhaul-loading-capture-219/capture.mjs']","['node','tools/overhaul-pack-221/browser-equivalence221.mjs','--root-approved-loader221']"),("'capSeconds':90","'capSeconds':30"),(">=89",">=27"),("90-(time.monotonic()-start)","30-(time.monotonic()-start)"),("<=90","<=30"),("http://localhost:8799/health","http://127.0.0.1:8799/health")]:source=source.replace(a,b)
source=source.replace("owned={};failure=None;child=None",'''def protection():
 rows=[]
 for name in ['pack-source-seal221.json','loader-source-seal221.json']:
  for row in json.loads((r/'tools/overhaul-pack-221'/name).read_text())['files']:
   actual=hashlib.sha256((r/row['path']).read_bytes()).hexdigest();rows.append({'path':row['path'],'expected':row['sha256'],'actual':actual,'match':actual==row['sha256']})
 for name in ['tools/overhaul-native-214/source-seal.json','tools/overhaul-native-wiring-218/source-seal.json','tools/overhaul-pack-221/protected-inputs221.json']:
  for row in json.loads((r/name).read_text())['files']:
   actual=hashlib.sha256((r/row['path']).read_bytes()).hexdigest();rows.append({'path':row['path'],'expected':row['sha256'],'actual':actual,'match':actual==row['sha256']})
 return rows
before=protection();(out/'protected-before.json').write_text(json.dumps(before,indent=2));assert all(x['match'] for x in before),'221 before protection failed'
owned={};failure=None;child=None''')
source=source.replace("assert data['pid']==370280", "(out/'native-preflight-operands.json').write_text(json.dumps(data,indent=2))\n  assert creation(370280)==134362153569448000,'221 retained server creation changed'\n  idle=subprocess.check_output(['powershell','-NoProfile','-Command',\"@(Get-CimInstance Win32_Process | Where-Object {$_.Name -in @('msedge.exe','blender.exe')}).Count\"],creationflags=subprocess.CREATE_NO_WINDOW,timeout=5).decode().strip();assert idle=='0','221 machine slot occupied'\n  assert data['pid']==370280")
source=source.replace("data['command'].endswith('--import tsx server/index.ts --production')", "data['command']=='\"C:\\\\Program Files\\\\nodejs\\\\node.exe\" --import tsx server/index.ts --production'")
source=source.replace("finally:\n k.CloseHandle(job)","except BaseException as error:\n failure=repr(error)\nfinally:\n k.CloseHandle(job)")
source=source.replace("(out/'process-receipt.json').write_text", "afterProtection=protection();(out/'protected-after.json').write_text(json.dumps(afterProtection,indent=2));receipt['protectedMatch']=all(x['match'] for x in afterProtection);receipt['finalOriginalIdentitiesAbsent']=all(v['originalIdentityAbsent'] for v in after.values());receipt['elapsedSeconds']=time.monotonic()-start;receipt['inclusiveBoundObserved']=receipt['elapsedSeconds']<=30;\n (out/'process-receipt.json').write_text")
source=source.replace("child.returncode else 0", "child.returncode or not receipt['protectedMatch'] or not receipt['finalOriginalIdentitiesAbsent'] or not receipt['inclusiveBoundObserved'] else 0")
ast.parse(source);(folder/'run-loader221.py').write_text(source)
