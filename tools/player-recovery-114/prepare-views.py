from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
paths=[h/'render-source.py',h/'prepare-views.py',r/'tools/overhaul-root-round-027/run-seal.py']
paths += [r/'assets/source/overhaul-pounce-motion-112'/n for n in ['Pounce_Motion112.blend','authored-motion-records.json','author-receipt.json']]
receipt=json.loads((r/'.sites-runtime/overhaul-20261010/motion112-author/process-receipt.json').read_text());assert receipt['exitCode']==0 and receipt['inclusiveBoundObserved'] and all(x['match'] for x in receipt['inputsAfter'])
out=h/'views-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':[{'path':p.relative_to(r).as_posix(),'sha256':sha(p),'bytes':p.stat().st_size} for p in paths],'command':['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--threads','2','--python-exit-code','1','--python',str(h/'render-source.py')],'scope':'ONE120s passive source view job; no master save or export or gameplay; first failure stops'},indent=2))
