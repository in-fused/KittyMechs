import pathlib,json,hashlib,ast
root=pathlib.Path(__file__).resolve().parents[2];folder=pathlib.Path(__file__).parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
paths=['tools/overhaul-delivery-209/output/Pounce_Anatomy209.glb','tools/overhaul-native-214/pack214.mjs','tools/overhaul-native-214/source-seal.json','tools/overhaul-native-wiring-218/source-seal.json','tools/overhaul-delivery-206/convert206.mjs','tools/overhaul-delivery-209/convert209.mjs','assets/source/overhaul-anatomy-motion-202/Pounce_Anatomy202.blend','tools/overhaul-anatomy-motion-202/sourceTask202.ts']
rows=[row(root/p) for p in paths]
if rows[0]['sha256']!='64cc5c99ffb7ca038c20e56b50e0281643559cd44db2fd92deab48ca134864e7' or rows[1]['sha256']!='e20755b7c776968b14e61782ad29cdd92af525c6b79521c291d1efdb5b615bfe':raise RuntimeError('221_EXPECTED_INPUT_CHANGED')
ast.parse((folder/'run-pack221.py').read_text())
(folder/'protected-inputs221.json').write_text(json.dumps({'writer':'CLOSED','files':rows},indent=2))
files=[row(folder/p) for p in ['pack221.mjs','run-pack221.py','prepare221.py','protected-inputs221.json']]
(folder/'pack-source-seal221.json').write_text(json.dumps({'writer':'CLOSED','status':'PACK_SOURCE_READY_ACTUAL_UNRUN','files':files,'protectedInputs':rows},indent=2));print(json.dumps({'seal':row(folder/'pack-source-seal221.json'),'source':files}))
