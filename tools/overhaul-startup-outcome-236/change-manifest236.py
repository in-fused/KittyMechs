"""Small active-source reference manifest. No snapshot or file copies."""
from pathlib import Path
import hashlib,json,os
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent
source=r/'assets/source/overhaul-anatomy-motion-202/Pounce_Anatomy202.blend'
assert source.stat().st_size==84561157 and hashlib.sha256(source.read_bytes()).hexdigest()=='7f83683dc332e6075c1965ed4d393ae1a4be72d747c92771fc5cff0fffa55857'
resource=r/'docs/overhaul/resource-limit-handoff-20261010.md';temporary=resource.with_name('resource-limit-handoff-20261010.md.236-tmp')
temporary.write_text('''# Exact current handoff — ACTIVE / INCOMPLETE

Current decisions: docs/overhaul/player-integration-236-handoff.md. Small active-source reference manifest: tools/overhaul-startup-outcome-236/change-manifest.json. No089 snapshot was created. Deleted historical chains must not be reconstructed under the new owner AGENTS.md storage policy.

Sole public LIMITED062 http://localhost:8799/, PID370280/session9510, exactnativeFILETIME134362153569448006; receipt5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c. Finalhealthok/0rooms/0players/60Hz,8799owner370280,noEdge. Source/assets/playable unchanged by this turn; ordinary editable202 master hashverified. Concurrent package/AGENTS storage changes retained.

232 shader source closed/13fixtures/types only. 233 blankKHR capability0shaders only. ONE private234 build terminal0/35.187s/60,5ownedretired/protectedMATCH; emittedsinglecanonicalCanvas/owner/registry/entryPASS. Exact230 idlefix integrated privately, no public upgrade. Shader/draw/input/motion/art/combat/contact/co-op/humanlag unqualified.

235 actual terminal1/7.422s/180 BEFORE browser/assets/shader/gameplay,solepackagehash mismatch from3newstorage scripts; allotherparsedpackagefields unchanged. 237 scripts-boundary observer source conditionallyaccepted, ACTUALUNRUN. Both original219/228 truegameplaydeadlinefailures and221decodecleanupcaveat retained. Critic236 DENIES public upgrade without actualplayer evidence.

Newmandatory storage:clean check16919 terminal1: Appliedtrue/Deleted0/Candidates0,Artifact68.05GiB>32,C25.24GiB<30,History.3GiB<2,D684.09GiB>100. Captures/builds/snapshots stopped. Scoped120s inventory18684 terminal0 INCOMPLETE; exact identified remainingC/D folders in docs/overhaul/storage236-report.md,includingeditableblend files. No extra deletions/moves/budgetwaiver. No active newjob or agent apart from062 server. UseDscratch afterbudgetPASS; CLOSED237 Coutput path needsreviewednarrowDadapter,notdirectexecution. Protectedinputs mustmatchwithoutreconstructingdeletedarchives.

GameStudio/GamePlaytest firstminuteOct9 used;audit193/localBlender/Playwright; companionCLIunavailable. No duplicatedX/sessionresearch. Architecture003closed; nofarcityretry/Unreal/paidgeneration/newports/recurringloop. LeadSol6.1Medium/Standard; difficultspecialists/criticHigh; max2implementation+critic.

Nextfinite gate afterstoragebudgetPASS: ONE exact234two-clientLOW publiccontrols/native/shader/canvas observation underunchanged20s/140work30cleanup180supervisor,withindependenttemporalpixelsreview. Fullscope INCOMPLETE: acceptintegrateddetailedmovement/two-stances/R/physicalpair/climbing/supportdestruction/genuinecheckpointdownrevivefailretryextraction,then4distinctmechs/3populatedmaps/PvP/PvPvE/progression/weather/audio/polish. Thefirstdistrictisnotcompletion. Never approvefromcompilation/fixtures/blankcapability.
''',encoding='utf-8')
os.replace(temporary,resource)
paths=['AGENTS.md','package.json','docs/overhaul/player-integration-236-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/storage236-report.md','tools/player-integration-193/plugin-usage-audit193.json','tools/overhaul-shader-startup-232/source-seal.json','tools/overhaul-shader-capability-233/source-seal.json','tools/overhaul-startup-integration-234/source-seal.json','tools/overhaul-shader-observer-235/source-seal.json','tools/overhaul-package-observer-237/source-seal.json','.sites-runtime/overhaul-20261011/startup234-private/output-seal.json','.sites-runtime/overhaul-20261011/startup234-supervisor/output-seal.json','.sites-runtime/overhaul-20261011/shader235-supervisor/output-seal.json','assets/source/overhaul-anatomy-motion-202/Pounce_Anatomy202.blend']
paths+=['docs/overhaul/critic/'+n for n in ['startup234-source-review.md','shader235-observer-source-review.md','shader235-prebrowser-review.md','package237-observer-source-review.md','startup236-outcome-review.md']]
paths+= [p.relative_to(r).as_posix() for p in f.iterdir() if p.is_file() and p.name!='change-manifest.json']
rows=[]
for name in sorted(set(paths)):
 p=r/name;b=p.read_bytes();rows.append({'path':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
out=f/'change-manifest.json';assert not out.exists();out.write_text(json.dumps({'writer':'CLOSED','scope':'SMALL_ACTIVE_SOURCE_REFERENCES_ONLY; no snapshot/copy/archive reconstruction. Full goal ACTIVE_INCOMPLETE; reported human lag unresolved;237 actualUNRUN/storageFAIL.','files':rows},indent=2),encoding='utf-8');print(json.dumps({'status':'SMALL_REFERENCE_HANDOFF_CLOSED','rows':len(rows),'manifestSHA256':hashlib.sha256(out.read_bytes()).hexdigest(),'editableSource202':'EXACT_HASH_MATCH','snapshotCopies':0,'publicUpgrade':False,'fullGoal':'ACTIVE_INCOMPLETE'}))
