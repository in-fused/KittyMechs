from pathlib import Path
import hashlib,json,ast
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;parent=r/'tools/overhaul-native-observer-227';sha=lambda b:hashlib.sha256(b).hexdigest()
seal=(parent/'source-seal.json').read_bytes();assert sha(seal)=='1cca3f042c09ce7b4a81ca49b66391b37186fffad1dc80e7da3afebe67c792f6'
for row in json.loads(seal)['files']:assert sha((r/row['path']).read_bytes())==row['sha256'],row['path']
for name in ['capture.mjs','guards.mjs','supervise.py','network-classification.mjs']:
 b=(parent/name).read_bytes();(f/(name+'.227-preimage')).write_bytes(b);s='\n'.join(b.decode().splitlines())+'\n'
 if name in ['capture.mjs','supervise.py']:
  for old,new in [('overhaul-native-observer-227','overhaul-native-observer-228'),('KITTYMECH_227','KITTYMECH_228'),('native227-observer-source-review','native228-observer-source-review'),('native227-public','native228-public'),('native227-supervisor','native228-supervisor'),('Native227Host','Native228Host'),('Native227Guest','Native228Guest')]:s=s.replace(old,new)
 if name=='guards.mjs':
  old="if(d?.firstFailure&&d.status==='temporary-standard'&&d.mode!=='unsupported-action')return 'SUPPORTED_NATIVE_SOURCE_TASK_FELL_BACK';"
  new="if(d?.firstFailure&&d.firstFailure.mode!=='unsupported-action')return 'SUPPORTED_NATIVE_SOURCE_TASK_FELL_BACK';\n if(d?.firstFailure&&d.status==='temporary-standard'&&d.mode!=='unsupported-action')return 'SUPPORTED_NATIVE_SOURCE_TASK_FELL_BACK';"
  assert s.count(old)==1;s=s.replace(old,new)
  s+="\nexport function removedRosterAndRegistry228(r,id){return Array.isArray(r.actors)&&Array.isArray(r.native?.registry?.rows)&&!r.actors.some(a=>a.id===id)&&!r.native.registry.rows.some(row=>row.actor===id);}\n"
 if name=='capture.mjs':
  s=s.replace("{ready219227,nativeFault227}","{ready219227,nativeFault227,removedRosterAndRegistry228}")
  old="if(!missing.actors.some(a=>a.id===old.actor.id))break;";assert s.count(old)==1;s=s.replace(old,"if(removedRosterAndRegistry228(missing,old.actor.id))break;")
  old="status:missing.actors.some(a=>a.id===old.actor.id)?'INCOMPLETE_REMOTE_REMOVAL_NOT_OBSERVED':'ACTUAL_ROSTER_AND_REGISTRY_REMOVAL_OBSERVED'";assert s.count(old)==1;s=s.replace(old,"status:removedRosterAndRegistry228(missing,old.actor.id)?'ACTUAL_ROSTER_AND_REGISTRY_REMOVAL_OBSERVED':missing.actors.some(a=>a.id===old.actor.id)?'INCOMPLETE_REMOTE_REMOVAL_NOT_OBSERVED':'ROSTER_ONLY_INCOMPLETE_REGISTRY_RETIREMENT'")
 if name=='supervise.py':
  s=s.replace('k.OpenProcess(0x1000,False,pid)','k.OpenProcess(0x101000,False,pid)')
  s=s.replace('k.GetProcessTimes.argtypes=', 'k.WaitForSingleObject.argtypes=[W.HANDLE,W.DWORD];k.WaitForSingleObject.restype=W.DWORD\nk.GetProcessTimes.argtypes=')
  s=s.replace('return (t[0].dwHighDateTime<<32)|t[0].dwLowDateTime if k.GetProcessTimes(h,*[C.byref(x) for x in t]) else None','return None if k.WaitForSingleObject(h,0)==0 else ((t[0].dwHighDateTime<<32)|t[0].dwLowDateTime if k.GetProcessTimes(h,*[C.byref(x) for x in t]) else None)')
  s=s.replace('originalIdentityAbsent','originalIdentityRetired')
  s=s.replace("(out/'process-receipt.json').write_text", "receipt['finalOriginalIdentitiesRetired']=all(row['originalIdentityRetired'] for row in after.values())\n (out/'process-receipt.json').write_text")
  s=s.replace('failure or child is None or child.returncode else 0','failure or child is None or child.returncode or not receipt[\'inclusiveBoundObserved\'] or not receipt[\'finalOriginalIdentitiesRetired\'] else 0')
  ast.parse(s)
 (f/name).write_text(s,encoding='utf8',newline='\n')
binding=json.loads((parent/'binding.json').read_text());rows=binding['files'];rows.append({'path':(parent/'source-seal.json').relative_to(r).as_posix(),'bytes':len(seal),'sha256':sha(seal)})
for row in json.loads(seal)['files']:rows.append(row)
binding['scope']='228 corrected observer only: exact CLOSED227 parent; truthful roster+registry removal and immutable supported failure; retired-or-absent native lifecycle. No runtime/build/model change.'
(f/'binding.json').write_text(json.dumps(binding,indent=2),encoding='utf8')
print(json.dumps({'status':'PREPARED_SOURCE_ONLY','parentSHA256':sha(seal),'boundFiles':len(rows),'actualJobs':0}))
