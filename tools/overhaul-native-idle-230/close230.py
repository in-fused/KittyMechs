import pathlib,json,hashlib,difflib,datetime
root=pathlib.Path(__file__).resolve().parents[2];folder=pathlib.Path(__file__).parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
source=root/'tools/overhaul-native-integration-222/nativeOwner218.ts';before=folder/'nativeOwner222-preimage.ts';assert source.read_bytes()==before.read_bytes(),'230 baseline mutated'
old=before.read_text();new=(folder/'nativeOwner230.ts').read_text();expected=old.replace('const moving=p.distance>0;if(!complete&&moving)this.lastSpeed=speed;','const moving=speed>.08;if(!complete&&moving)this.lastSpeed=speed;').replace("from './nativeBasis218'","from '../overhaul-native-integration-222/nativeBasis218'");assert new==expected,'230 unexpected source delta'
(folder/'nativeOwner230.diff').write_text(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='immutable222/nativeOwner218.ts',tofile='230/nativeOwner230.ts')))
(folder/'check-receipts230.json').write_text(json.dumps({'writer':'CLOSED','staticType':{'command':'node tools/overhaul-native-idle-230/check-source230.mjs','exitCode':0,'seconds':6.0894655},'control':{'command':'node --import tsx tools/overhaul-native-idle-230/control-check230.ts','exitCode':0,'seconds':1.7335829,'assertions':5,'scope':'recording composer stub only; no constructor/rig/native/render proof'},'productionChanged':False,'baseline222Changed':False},indent=2))
inputs=[source,root/'tools/overhaul-native-integration-222/nativeBasis218.ts',root/'tools/overhaul-native-214/raw209-contract214.json',root/'tools/overhaul-native-observer-229/actual-summary.json',root/'.sites-runtime/overhaul-20261011/native228-public/evidence.json',root/'tools/overhaul-anatomy-motion-202/sourceTask202.ts']
protected=[row(p) for p in inputs];(folder/'protected-inputs230.json').write_text(json.dumps({'writer':'CLOSED','files':protected},indent=2))
files=[row(p) for p in sorted(folder.rglob('*')) if p.is_file() and p.name!='source-seal.json' and '__pycache__' not in p.parts]
(folder/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','status':'SOURCE_IDLE_CONTROL_PASS_UNADMITTED_GAMEPLAY','closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files,'protectedInputs':protected},indent=2))
print(json.dumps({'writer':'CLOSED','files':len(files),'seal':row(folder/'source-seal.json'),'handoff':row(folder/'HANDOFF.md'),'candidate':row(folder/'nativeOwner230.ts'),'baselineUnchanged':True}))
