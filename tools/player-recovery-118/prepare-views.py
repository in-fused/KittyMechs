from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
paths=[h/'render-anatomy.py',h/'prepare-views.py',r/'tools/overhaul-root-round-027/run-seal.py']
paths += [r/'assets/source/overhaul-pounce-anatomy-121'/n for n in ['Pounce_Motion121.blend','authored-motion-records.json','author-receipt.json','intentional-weight-ledger121.json']]
receipt=json.loads((r/'.sites-runtime/overhaul-20261010/anatomy121-author/process-receipt.json').read_text());assert receipt['exitCode']==0 and receipt['inclusiveBoundObserved'] and all(x['match'] for x in receipt['inputsAfter'])
author=json.loads(paths[-2].read_text());assert author['error'] is None
out=h/'views-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':[{'path':p.relative_to(r).as_posix(),'sha256':sha(p),'bytes':p.stat().st_size} for p in paths],'command':['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--threads','2','--python-exit-code','1','--python',str(h/'render-anatomy.py')],'scope':'ONE120s passive saved-source121 gait/idle/retainedcombat/climb views; no master save/export/gameplay. Missing actions reported, no silent replacement; first failureSTOP'},indent=2))
