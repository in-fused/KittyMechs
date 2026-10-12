from pathlib import Path
import json, hashlib, datetime, urllib.request
r=Path(__file__).resolve().parents[2];run=r/'.sites-runtime/shader-startup-238';out=run/'review265'
assert not (out/'output-seal.json').exists()
critic=r/'docs/overhaul/critic/player259-actual-review.md'
assert 'Writer: CLOSED' in critic.read_text(encoding='utf-8')
e=json.loads((run/'public259/evidence.json').read_text(encoding='utf-8'))
end=datetime.datetime.fromisoformat(e['endUTC'].replace('Z','+00:00')).timestamp()*1000
start=end-e['elapsedMs']
with urllib.request.urlopen('http://localhost:8799/client-report',timeout=5) as response:
    reports=json.load(response)
rows=[]
for c in reports['clients']:
    sample=c['reports'][-1];report=sample['report']
    rows.append({'receivedAt':sample['receivedAt'],'inActual259Window':start<=sample['receivedAt']<=end,**{k:report.get(k) for k in ['renderer','quality','prototype','bufferWidth','bufferHeight','phaseAtEnd']}})
(out/'renderer-reports.json').write_text(json.dumps({'writer':'CLOSED','scope':'Latest local server reports; window matching labels private259 only, not affected-human/IAB','rows':rows},indent=2),encoding='utf-8')
def receipt(path):
    p=r/path;b=p.read_bytes()
    return {'path':path,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
refs=[
    'tools/overhaul-grounded-motion-256/source-seal.json',
    'tools/overhaul-grounded-integration-258/source-seal.json',
    'tools/overhaul-grounded-integration-263/source-seal.json',
    'tools/overhaul-player-controls-259/source-seal.json',
    'tools/overhaul-feline-animation-261/source-seal261.json',
    'tools/overhaul-feline-animation-264/source-seal264.json',
    'docs/overhaul/critic/feline264-source-motion-review.md',
    'docs/overhaul/critic/grounded263-source-review.md',
    'docs/overhaul/critic/player259-actual-review.md',
    '.sites-runtime/shader-startup-238/private263/output-seal.json',
    '.sites-runtime/shader-startup-238/build263-supervisor/process-receipt.json',
    '.sites-runtime/shader-startup-238/public259/output-seal.json',
    '.sites-runtime/shader-startup-238/supervisor259/output-seal.json',
    'assets/source/overhaul-feline-animation-264/Pounce_Feline264.blend',
    'assets/source/overhaul-feline-animation-264/Pounce_Feline264.glb',
]
manifest={'writer':'CLOSED','goal':'ACTIVE_INCOMPLETE','publicUpgradeApproved':False,'humanLagResolved':False,'scope':'One ownership optimization and actual private controls/CPU diagnosis; one authored source animation repair/master/export/source-motion review;264 not runtime-integrated. Failed261 and unexecuted rejected258 retained.', 'storage':{'terminal':'1b8ea9_EXIT0','scratchGiB':34.88,'historyGiB':.15,'CFreeGiB':40.04,'DFreeGiB':688.41,'deleted':0},'live':{'port':8799,'pid':370280,'retainedSession':9510,'rooms':0,'players':0,'tickRate':60,'edgeOrBlenderCount':0},'next':'One direction-aware264 ordinary-owner integration with coherent source-pose scheduling, actual47-catalog/decoded/mixed-stride/R/contact/readability/performance gates; no new tiny arithmetic or unchanged replay loop. Full district combat/climb/destruction/co-op andfourmech/threemap scope incomplete.','references':[receipt(p) for p in refs]}
(out/'change-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
files=[receipt(p.relative_to(r).as_posix()) for p in sorted(out.rglob('*')) if p.is_file()]
(out/'output-seal.json').write_text(json.dumps({'writer':'CLOSED','goal':'ACTIVE_INCOMPLETE','files':files},indent=2),encoding='utf-8')
print(json.dumps({'writer':'CLOSED','files':len(files),'rendererReportsMatched':[x['inActual259Window'] for x in rows],'outputSeal':receipt((out/'output-seal.json').relative_to(r).as_posix())}))
