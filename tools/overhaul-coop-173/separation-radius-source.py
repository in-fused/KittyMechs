from pathlib import Path
p=Path('tools/overhaul-coop-173/interaction-separation.mjs');t=p.read_text().replace('Full active1.1 endpoint disk plus1.9 centre travel lies within3m phase bound.','One actual hull-radius centre leg plus full1.1 endpoint disk fits3m phase bound.').replace('step=3-1.1,target=', 'step=actorHullRadius(a),target=');p.write_text(t)
