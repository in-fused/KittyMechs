import pathlib,hashlib,json,shutil,sys
root=pathlib.Path(__file__).resolve().parents[2];folder=pathlib.Path(__file__).parent;folder.mkdir(parents=True,exist_ok=True)
if '--parent-only' not in sys.argv:
 for source in ['src/game/entities/Actors.tsx','tools/overhaul-native-214/nativeOwner214.ts','tools/overhaul-native-214/NativeActor214.tsx']:
  p=root/source;out=folder/'preimages'/source;out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,out)
 owner=(root/'tools/overhaul-native-214/nativeOwner214.ts').read_text()
 (folder/'nativeOwner218.ts').write_text(owner)
actors=(root/'src/game/entities/Actors.tsx').read_text();start=actors.index('export function Actors(){');end=actors.index('function Actor(',start)
imports=actors[:start].replace("from './","from '../../src/game/entities/").replace("from '../runtime'","from '../../src/game/runtime'").replace("from '../../state/","from '../../src/state/").replace("from '../rendering/","from '../../src/game/rendering/").replace("from '../camera/","from '../../src/game/camera/").replace("from '../../../shared/","from '../../shared/")
imports+="import {NativeSlot218,privateRequested218,createRegistry218,type PrivateDelivery218} from './wiring218';\n"
parent=(folder/'parent-body218.txt').read_text()
candidate=imports+parent+actors[end:];(folder/'ActorsCandidate218.tsx').write_text(candidate)
ledger={'productionEdited':False,'retainedStandardActorTailSHA':hashlib.sha256(actors[end:].encode()).hexdigest(),'changes':'relative imports relocated; ONLY parent Actors dispatcher replaced; complete standard Actor function text retained (candidate LF line endings, input preimage byte exact)','inputSHA':hashlib.sha256((root/'src/game/entities/Actors.tsx').read_bytes()).hexdigest()}
(folder/'parent-diff-ledger218.json').write_text(json.dumps(ledger,indent=2))
