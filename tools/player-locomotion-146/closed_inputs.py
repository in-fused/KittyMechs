from pathlib import Path
import hashlib,json
def verified_input(root:Path,packet:str,row:dict)->Path:
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 current=root/row['path']
 if sha(current)==row['sha256'] and current.stat().st_size==row['bytes']:return current
 # CLOSED144 measured a predecessor animation consumer before parallel143
 # changed that consumer. Preserve144's receipt; reconcile only this exact
 # historical dependency against143's preserved preimage and final owner.
 assert packet=='overhaul-render-timeline-144' and row['path'].casefold()=='src/game/entities/identity57runtime005.ts',row['path']
 assert row['sha256']=='be5cf8888a46aed18c85828ecd67bb3ed3f713551ac39930d84baad898855dbe'
 predecessor=root/'tools/overhaul-locomotion-143/preimages/Identity57Runtime005.ts'
 assert sha(predecessor)==row['sha256'] and predecessor.stat().st_size==row['bytes']
 owner=json.loads((root/'tools/overhaul-locomotion-143/source-seal.json').read_text(encoding='utf8'))
 assert owner['writer']=='CLOSED'
 final=next(x for x in owner['files'] if x['path'].casefold()==row['path'].casefold())
 assert final['sha256']=='d6935561e0eb9afa1eda22a422c951f2ba54a042d9b2c4d12b3a79edd4b9cf73'
 assert sha(current)==final['sha256'] and current.stat().st_size==final['bytes']
 return predecessor
