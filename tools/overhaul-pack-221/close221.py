import pathlib,json,hashlib,ast,difflib,datetime
root=pathlib.Path(__file__).resolve().parents[2];folder=pathlib.Path(__file__).parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
for name in ['run-loader221.py','adapt-supervisor221.py']:ast.parse((folder/name).read_text())
old=(folder/'supervisor219-preimage.py').read_text().splitlines(True);new=(folder/'run-loader221.py').read_text().splitlines(True);(folder/'supervisor-diff221.txt').write_text(''.join(difflib.unified_diff(old,new,fromfile='verified219/supervise.py',tofile='221/run-loader221.py')))
loaderNames=['equivalence-entry221.ts','equivalence-bundle221.js','esbuild-metafile221-final.json','bundle-summary221.json','prepare-browser-bundle221.mjs','browser-equivalence221.mjs','run-loader221.py','adapt-supervisor221.py','supervisor219-preimage.py','output/Pounce_Anatomy221.glb']
loaderRows=[row(folder/name) for name in loaderNames]
for p in ['tools/overhaul-native-214/raw209-contract214.json','tools/overhaul-native-wiring-218/nativeOwner218.ts','tools/overhaul-native-wiring-218/nativeBasis218.ts','tools/overhaul-anatomy-motion-202/sourceTask202.ts','.sites-runtime/overhaul-20261009/build-062/playable-root/dist/index.html']:
 loaderRows.append(row(root/p))
(folder/'loader-source-seal221.json').write_text(json.dumps({'writer':'CLOSED','status':'ACTUAL_BROWSER_READY_UNRUN','files':loaderRows},indent=2))
files=[row(p) for p in sorted(folder.rglob('*')) if p.is_file() and p.name!='source-seal.json' and '__pycache__' not in p.parts]
protected=json.loads((folder/'protected-inputs221.json').read_text())['files']
for r in protected:
 if row(root/r['path'])!=r:raise RuntimeError('221_PROTECTED_CHANGED:'+r['path'])
(folder/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','status':'PACK_PASS_BROWSER_SOURCE_READY_UNRUN','closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files,'protectedInputs':protected},indent=2))
print(json.dumps({'writer':'CLOSED','files':len(files),'seal':row(folder/'source-seal.json'),'handoff':row(folder/'HANDOFF.md'),'loaderSeal':row(folder/'loader-source-seal221.json'),'asset':row(folder/'output/Pounce_Anatomy221.glb'),'wrapper':row(folder/'run-loader221.py'),'bundle':row(folder/'equivalence-bundle221.js')}))
