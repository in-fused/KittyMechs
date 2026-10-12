import pathlib,json,hashlib,difflib,datetime
root=pathlib.Path(__file__).resolve().parents[2];folder=pathlib.Path(__file__).parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
pairs=[('src/game/entities/Actors.tsx','ActorsCandidate218.tsx'),('tools/overhaul-native-214/nativeOwner214.ts','nativeOwner218.ts'),('tools/overhaul-native-214/NativeActor214.tsx','NativeActor218.tsx')]
for source,candidate in pairs:
 before=(folder/'preimages'/source).read_bytes()
 if before!=(root/source).read_bytes():raise RuntimeError('218_PROTECTED_INPUT_CHANGED:'+source)
 old=before.decode().splitlines(True);fresh=(folder/candidate).read_text().splitlines(True)
 (folder/(candidate+'.diff')).write_text(''.join(difflib.unified_diff([s.rstrip('\r\n')+'\n' for s in old],fresh,fromfile=source,tofile='tools/overhaul-native-wiring-218/'+candidate)))
base=(folder/'preimages/src/game/entities/Actors.tsx').read_text();candidate=(folder/'ActorsCandidate218.tsx').read_text()
if base[base.index('function Actor('):]!=candidate[candidate.index('function Actor('):]:raise RuntimeError('218_COMPLETE_STANDARD_ACTOR_CHANGED')
protected=[root/p for p in ['src/game/entities/Actors.tsx','src/game/entities/Identity57Runtime005.ts','tools/overhaul-native-214/source-seal.json','tools/overhaul-native-214/nativeOwner214.ts','tools/overhaul-native-214/NativeActor214.tsx','tools/overhaul-native-214/pack214.mjs','tools/overhaul-anatomy-motion-202/sourceTask202.ts','docs/overhaul/critic/native214-source-review.md','src/game/entities/renderTimeline.ts','shared/felineNativePose004.ts','shared/felineNativePoseSource004.ts','src/debug/diagnostics.ts']]
protectedRows=[row(p) for p in protected]
(folder/'protected-inputs218.json').write_text(json.dumps({'writer':'CLOSED','files':protectedRows},indent=2))
files=[row(p) for p in sorted(folder.rglob('*')) if p.is_file() and p.name!='source-seal.json' and '__pycache__' not in p.parts]
(folder/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','status':'STATIC_ASSEMBLED_WIRING_UNADMITTED','closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files,'protectedInputs':protectedRows},indent=2))
print(json.dumps({'writer':'CLOSED','files':len(files),'seal':row(folder/'source-seal.json'),'handoff':row(folder/'HANDOFF.md'),'candidate':[row(folder/p) for p in ['ActorsCandidate218.tsx','nativeOwner218.ts','NativeActor218.tsx','wiring218.tsx','nativeBasis218.ts']],'production':'UNCHANGED','closed214':'UNCHANGED'}))
