from pathlib import Path
import hashlib,json,statistics
R=Path(__file__).resolve().parents[2];H=Path(__file__).parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(R).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
inputs=[R/'tools/overhaul-grounded-motion-256'/n for n in ['source-seal.json','NativeActor256.tsx','nativeOwner256.ts','sourceTask256.ts','groundedFeet256.ts','skinSole256.ts','contactObservation256.ts']]
inputs += [R/p for p in ['assets/source/overhaul-feline-animation-264/Pounce_Feline264.glb','assets/source/overhaul-feline-animation-264/motion-contract264.json','tools/overhaul-feline-animation-264/source-seal264.json','tools/overhaul-feline-admission-268/decoded-contract268.json','tools/overhaul-feline-admission-268/source-seal268.json','tools/overhaul-grounded-motion-253/load-rig250.ts','assets/source/overhaul-anatomy-motion-202/anatomical-basis202.json']]
(H/'protected-inputs267.json').write_text(json.dumps({'writer':'CLOSED','files':[row(p) for p in inputs]},indent=2))
data=json.loads((H/'composed267.json').read_text());a=data['costs']['baseline'];b=data['costs']['candidate'][:len(a)]
summary={k:data[k] for k in ['status','scope','frames','cases','schedule','maxScheduleOrientationDifference','maxIndependentPadError','maxFrameOrientationChange','failure']}
summary['pairedSchedulingCostMs']={'samples':len(a),'baselineMedian':statistics.median(a),'candidateMedian':statistics.median(b),'pairedMedianDifference':statistics.median([x-y for x,y in zip(a,b)]),'baselineP95':sorted(a)[int(.95*len(a))],'candidateP95':sorted(b)[int(.95*len(b))],'scope':'first480 same264 gait frames WITHOUT preparation request; fixed order baseline then candidate, nonisolated, not actual owner/human FPS'}
(H/'summary267.json').write_text(json.dumps(summary,indent=2))
handoff='''# 267 CLOSED — authored264 preparation chart and current-frame pose scheduling

Writer CLOSED. New source proposal only; no production/asset/public route writes, browser, build, server, DCC, export or native-game job. storage:clean completed with zero deletions before artifact creation. CLOSED256/264/268 files are unchanged inputs.

## Actual ownership

`NativeActor267.tsx`, `nativeOwner267.ts`, `sourceTask267.ts`, `preparation267.ts` are the candidate runtime files. Owner still exports `NativeOwner218`, actor exports `NativeActor218`, source task exports `SourceTask267`. GroundedFeet256, SkinSole256, contactObservation256, sourceCycle171 and nativeBasis218 are reused unchanged. The47 loaded catalog accepts five264 revised gaits plus two264 preparations; preparations/neutral Arc/five gaits are excluded from the39 complete-action owner. All actual47 tracks/rest/parents/primitives are guarded at construction. Actual constructor/browser execution of267 is UNRUN (268 independently parsed47/61/4).

The two preparation endpoints are **Trot first key and UprightWalkLong first key**, not idle. Relative local rotation = actual preparation quaternion times inverse quaternion of its actual endpoint interpolation. Root/head are excluded; translations/scales never come from prep. Zero endpoint chart preserves the current gait/idle pose and the revised upright-idle WalkLong override. World FK displacement/orientation produced by the chart adjusts the SAME existing source task endpoints/poles/hock vectors before unchanged strict chain/fullpad/hemisphere/grounded guards. The preparation is not a full action lock. Phase, native movement, root mounting, support truth and complete39 remain separate authority.

Interrupted R begins its displayed stance from the previous displayed stance and carries the prior chart residual while fading it to identity. This is a source chart over current gait, not exact equivalence to an absolute authored prep, not force balance or contact qualification. Complete/unsupported/life-reset cancel residual state. Existing complete-facing snap and fallback seam limitations remain.

## Coherent schedule

Each SourceTask call clears its cache; identical clip/time samples within that call share their immutable pose map. The source graph samples only the previous/current active action, updates its world matrices once per distinct sample, then reads those matrices directly rather than calling recursive getWorld helpers for each bone. The live solve's rotation writer still invalidates skin maps and updates each written subtree; the redundant full model traversal between that solve and affine read is removed. Full parent/bulk-pose refresh and every SkinSole/lease/reach guard remain. No cross-frame material/pose admission cache.

**Important remaining cost limitation:** NativeOwner supplies a progress=1 preparation request after a completed transition. The chart still samples endpoint poses and performs identity FK work on those settled frames. This unnecessary no-op work is retained in the tested candidate; it must be reviewed before actual integration. The cost comparison below intentionally used no preparation request and does not measure this actual settled-owner overhead. No whole-owner or human-lag improvement is claimed.

## Finite terminal evidence

`terminal267.json`: scoped tsc exit0/5.750s; one Node numeric suite exit0/3.031s. No repair or repeat. `composed267.json`/`summary267.json`:657 frames across all5 gaits±, turning constructed native-distance paths, moving R±, interrupted R while stopping/idle, support loss, explicit ground/chart cancel, and complete FelineAir restoration. Constructed paths/ground are not actual native ACK trajectories.

Scheduler equivalence against unchanged256 with the SAME actual264 asset:480 gait frames; maximum normalized quaternion difference5.9605e-8rad; local translations/scales exact; independent complete weighted-pad minima error4.4409e-16m. Raw quaternion/unit/rest/reach thresholds are unchanged. Preparation fore unloading was recorded95 footframes each direction. Maximum adjacent R local orientation change .1802078rad; this is disclosure, not a certified continuity bound. Chart/control reversal boundary stance continuity asserted; full owner generation/fatal/fallback dispatch is source/type-only here. Only one complete action was replayed; retained39 equivalence comes from268's separate195 cases, not this fixture.

Same480 no-prep source-step diagnostic: baseline median1.0249ms/p951.6574;267 median .9358ms/p951.5598; pairedmedian difference .0951ms. Fixed order baseline then candidate, nonisolated Node process; no public or human benchmark. Schedule totals1569 distinct samples/15 within-call hits across657 frames. Chart frames cost extra samples.

Grounded fulfillment is NOT acceptance: forward Trot, UprightWalkLong and UprightStride each recorded ZERO fulfilled feet in their48-frame constructed cases (other cases1–12). No artificial floor/support certificate or tolerance relaxation was introduced. Full policy/contactQualified=false remains. Source motions/torso/gesture/contact quality still need independent actual pixels.

## Integration contract and limits

Use268 exact decoded-contract268.json/SHA and264 asset SHA, not old45 catalog. Route only after independent source review. If loading candidate actor/owner text under canonical222 module URLs, the plugin must resolve `./nativeOwner267` from canonical actor to the SAME canonical `nativeOwner218` module (avoid duplicate owner identity), `./sourceTask267` from canonical owner to this new source task and `./preparation267` to this new helper. Candidate standalone file imports/typecheck are valid; canonical overlay aliases are root-owned and UNRUN. Keep one registry/provider/life/generation.

Next permissible gate is one private distance-owned ordinary/R/complete experiment after source review, including settled-state owner cost and actual pad/gesture pixels. No contact/art/native-envelope/performance acceptance; existing public checkpoint unchanged. Review the settled no-op chart cost before admitting an integration experiment.
'''
(H/'HANDOFF.md').write_text(handoff)
files=[p for p in H.rglob('*') if p.is_file() and p.name!='source-seal.json' and '__pycache__' not in p.parts]
(H/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','status':'SOURCE_CANDIDATE_NUMERIC_ONLY_INTEGRATION_COST_UNVERIFIED','files':[row(p) for p in sorted(files)]},indent=2))
print(json.dumps({'writer':'CLOSED','seal':row(H/'source-seal.json'),'handoff':row(H/'HANDOFF.md'),'runtime':[row(H/n) for n in ['NativeActor267.tsx','nativeOwner267.ts','sourceTask267.ts','preparation267.ts']]}))
