from pathlib import Path
h=Path(__file__).resolve().parent
for name in ['install-route.py','freeze053.py','prepare-play.py']:
 p=h/name;(h/(name+'.unrun130')).write_bytes(p.read_bytes())
p=h/'install-route.py';s=p.read_text().replace('anatomy130-integration-source-review.md','anatomy131-integration-source-review.md').replace('anatomy130-batch/process-receipt.json','anatomy131-batch/process-receipt.json').replace('overhaul-anatomy-batch-130','overhaul-anatomy-batch-131').replace("witness['witness']['candidatePrimitives']==4", "witness['witness']['candidatePrimitives']==manifest['candidatePrimitives'] and 4<=manifest['candidatePrimitives']<=12");p.write_text(s)
p=h/'freeze053.py';p.write_text(p.read_text().replace('FOUR-material batched skin','compatible material/attribute batched skin'))
p=h/'prepare-play.py';p.write_text(p.read_text().replace('anatomy130-integration-source-review.md','anatomy131-integration-source-review.md'))
p=h/'prepare-batch130.py';s=p.read_text().replace('anatomy130-integration-source-review.md','anatomy131-integration-source-review.md').replace('overhaul-anatomy-batch-130','overhaul-anatomy-batch-131').replace('prepare-batch130.py','prepare-batch131.py').replace('batch130-seal.json','batch131-seal.json').replace('130 actual','131 actual');(h/'prepare-batch131.py').write_text(s)
print('Unrun staged helpers bound to compatible131 partition; no public changes')
