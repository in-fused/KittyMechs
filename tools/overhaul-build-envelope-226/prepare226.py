from pathlib import Path
import hashlib,json,ast
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
original=(r/'tools/overhaul-loader-wrapper-223/run-loader223.py').read_bytes()
(f/'run-loader223-preimage.py').write_bytes(original)
s=('\n'.join(original.decode().splitlines())+'\n').replace("assert os.environ.get('KITTYMECH_221_ACTUAL_APPROVED')=='1','221 root actual gate absent; STATIC ONLY'", "assert os.environ.get('KITTYMECH_226_BUILD_APPROVED')=='1','226 root build gate absent; STATIC ONLY'")
s=s.replace("out=r/'tools/overhaul-pack-221/loader-supervisor'", "out=r/'.sites-runtime/overhaul-20261011/build-supervisor226'")
s=s.replace("def protection():\n rows=[]", "def protection():\n rows=[]\n for row in json.loads((r/'tools/overhaul-build-envelope-226/protected-inputs.json').read_text())['files']:\n  b=(r/row['path']).read_bytes();actual=hashlib.sha256(b).hexdigest();rows.append({'path':row['path'],'expected':row['sha256'],'actual':actual,'match':actual==row['sha256'] and len(b)==row['bytes']})")
s=s.replace("child=subprocess.Popen(['node','tools/overhaul-pack-221/browser-equivalence221.mjs','--root-approved-loader221']", "assert not (r/'.sites-runtime/overhaul-20261011/native225-private').exists(),'226 output must be fresh; no automatic repair/rebuild'\n  child=subprocess.Popen(['node','tools/overhaul-native-admission-225/build225.mjs']")
s=s.replace("'capSeconds':30", "'capSeconds':60").replace('>=27','>=55').replace('30-(time.monotonic()-start)','60-(time.monotonic()-start)').replace('<=30','<=60')
# Recognize an exited original process object as retired, without treating its PID as absent.
s=s.replace('k.OpenProcess(0x1000,False,pid)','k.OpenProcess(0x101000,False,pid)')
s=s.replace("k.GetProcessTimes.argtypes=", "k.WaitForSingleObject.argtypes=[W.HANDLE,W.DWORD];k.WaitForSingleObject.restype=W.DWORD\nk.GetProcessTimes.argtypes=")
s=s.replace('return (t[0].dwHighDateTime<<32)|t[0].dwLowDateTime if k.GetProcessTimes(h,*[C.byref(x) for x in t]) else None', 'return None if k.WaitForSingleObject(h,0)==0 else ((t[0].dwHighDateTime<<32)|t[0].dwLowDateTime if k.GetProcessTimes(h,*[C.byref(x) for x in t]) else None)')
s=s.replace('originalIdentityAbsent','originalIdentityRetired').replace('finalOriginalIdentitiesAbsent','finalOriginalIdentitiesRetired')
s=s.replace('before=protection();', "os.environ.update(KITTYMECH_225_BUILD_APPROVED='1',KITTYMECH_220_DELIVERY_APPROVED='1',KITTYMECH_222_LOADER_RECEIPT='tools/overhaul-pack-221/loader-evidence/evidence.json',KITTYMECH_222_LOADER_RECEIPT_SHA='4ec83d8df252390f3cc991689229bf04861a2cb0effe8f3bd0a0baf7ef2d6232')\nbefore=protection();")
assert "overhaul-build-envelope-226/protected-inputs.json" in s,'outer protection insertion missing'
ast.parse(s);(f/'run-build226.py').write_text(s,encoding='utf8',newline='\n')
rows={}
def bind(name,expected=None):
 b=(r/name).read_bytes();assert expected is None or sha(b)==expected,name
 rows[name]={'path':name,'bytes':len(b),'sha256':sha(b)}
 return b
for name,digest in [
 ('tools/overhaul-native-integration-222/source-seal.json','ddd7d34d26d154913c19645f7e8f5cb6e6371e00dafc43fc4f3d87ea70bf86d8'),
 ('tools/overhaul-native-admission-225/source-seal.json','ee34eb18068b8d967406379045648d91c90809542a164b4afb1ebdc8536b4f69'),
 ('tools/overhaul-startup-220/source-seal.json','5708c1d217ba0072ab4cc99d9bc1a05d45e20c8849afb2c7aeabd29d8a10be33'),
 ('tools/overhaul-startup-220/supplement/source-seal.json','6feea10565fe772d19130ed9c156fa416e42c0c2c45e728ad4a0bd2edbfbac50'),
 ('tools/overhaul-startup-220/compiler-identity-seal.json','f5bea027df64a2afd2bf20fc2d70ba599744521bcca93f51b42cf4f1fa39d1ae'),
 ('tools/overhaul-native-integration-222/binding.json',None)]:
 data=json.loads(bind(name,digest))
 for row in data['files']:bind(row['path'],row['sha256'])
bind('docs/overhaul/critic/native225-admission-source-review.md','6a30937e427e4c8c55b25c2c26024b01fe0e9f24626e5bf9897c4f68434a70c0')
for name in ['tools/overhaul-pack-221/loader-evidence/evidence.json','tools/overhaul-pack-221/output/Pounce_Anatomy221.glb','tools/overhaul-pack-221/loader-supervisor/process-receipt.json','tools/overhaul-pack-closure-224/final-native-closure224.json'] :bind(name)
for p in sorted(f.iterdir()):
 if p.is_file() and p.name!='protected-inputs.json':bind(p.relative_to(r).as_posix())
assert len([x for x in rows if x.startswith('tools/overhaul-native-integration-222/')])==32
(f/'protected-inputs.json').write_text(json.dumps({'writer':'CLOSED','scope':'ONE_PRIVATE_BUILD_ONLY; exact222 seal plus31 files,225,220 original/supplement/compiler, binding/runtime, fresh output; no player qualification','files':list(rows.values())},indent=2),encoding='utf8')
print(json.dumps({'status':'STATIC_READY','protectedFiles':len(rows),'own222FilesIncludingSeal':32,'nativeCapSeconds':60,'freshOutputRequired':True,'jobsRun':0,'protectedInputSHA256':sha((f/'protected-inputs.json').read_bytes())}))
