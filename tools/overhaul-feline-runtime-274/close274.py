from pathlib import Path
import json,hashlib,statistics
R=Path(__file__).resolve().parents[2];H=Path(__file__).parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(R).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
data=json.loads((H/'owner274.json').read_text(encoding='utf-8'));a=data['cost']['baseline'];b=data['cost']['candidate'];last=data['failure']['last'];diag=last['candidate']
summary={k:data[k] for k in ['status','scope','frames','maxOrientationDifference','maxIndependentPadError','maxPhaseError','settledPrepSamples']}
summary['partialSettledOwnerCost']={'samples':len(a),'baselineMedianMs':statistics.median(a),'candidateMedianMs':statistics.median(b),'baselineP95Ms':sorted(a)[int(.95*len(a))],'candidateP95Ms':sorted(b)[int(.95*len(b))],'pairedMedianDifferenceMs':statistics.median([x-y for x,y in zip(a,b)]),'scope':'actual267/274 NativeOwner.step, constructed paths/client fixed terrain, alternating order; partial suite, nonisolated, no human/performance acceptance'}
summary['cases']=[{k:r[k] for k in ['name','frames','fulfilled','reasons','maxAbsMaterialNormalGap','maxTangential']} for r in data['cases']]
summary['firstFailure']={'reason':data['failure']['reason'],'case':last['name'],'frame':last['frame'],'distance':last['distance'],'phaseCounter':last['phaseCounter'],'ownerPhase':diag['phase'],'candidateStatus':diag['status'],'candidateFirstFailure':diag['firstFailure'],'clocks':[{'limb':c['limb'],'advance':c['advance'],'signedAdvance':c['signedAdvance'],'idleEvents':[e for e in c['events'] if e['clock']=='ACTUAL_IDLE_SOURCE_KEY_CLOCK']} for c in diag['sourceTasks']['grounded250']['clocks']]}
summary['unreached']=['remaining stop fade/idle','TURN_SUPPORTLOSS','LIFE_COMPLETE_UNSUPPORTED_RESTORE','dispose assertions'];(H/'summary274.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
oldseal=R/'tools/overhaul-feline-runtime-267/source-seal.json';old=json.loads(oldseal.read_text(encoding='utf-8'));checks=[]
for original in old['files']:
 actual=row(R/original['path']);checks.append({'path':original['path'],'matches':actual['sha256']==original['sha256'] and actual['bytes']==original['bytes']})
assert all(c['matches'] for c in checks),'CLOSED267_MUTATION'
(H/'protected-inputs274.json').write_text(json.dumps({'writer':'CLOSED','closed267Rows':checks,'files':[row(p) for p in [oldseal,R/'tools/overhaul-feline-admission-268/decoded-contract268.json',R/'tools/overhaul-feline-admission-268/source-seal268.json',R/'assets/source/overhaul-feline-animation-264/Pounce_Feline264.glb',R/'tools/overhaul-grounded-motion-256/source-seal.json',R/'tools/overhaul-grounded-motion-253/load-rig250.ts']]},indent=2),encoding='utf-8')
text='''# 274 CLOSED — settled preparation no-op retirement and coherent owner fixture

Writer CLOSED. Status: SOURCE_CANDIDATE / PARTIAL_NUMERIC_COVERAGE / FIRST_FIXTURE_ORACLE_FAILURE. No runtime pose guard failure observed through774 completed frames. No gameplay, contact, art or human lag acceptance. No production, assets, CLOSED267/256/268, browser/build/server/DCC/native-game changes. storage:clean completed first, zero deletions. All text reads/writes in274 recipes explicitly UTF-8; original267 bytes/preimages preserved.

## Runtime delta and integration exports

`preparation274.ts`: at EXACT progress===1 the residual is identity and carried residual has faded to identity. Clear saved carry/previous residual and return empty chart without sampling any prep action. Active progress<1 and interrupted carry math/NativeControl are unchanged. No constants, source clocks, gait laws, phase, support, skin, reach, pose admission or geometry changes. `sourceTask274.ts` constructs the FK-before snapshot only when a nonempty chart is applied, removing settled identity FK snapshot/write work.

`NativeActor274.tsx` retains export NativeActor218 and canonical `./nativeOwner218` import. `nativeOwner274.ts` retains export NativeOwner218 and imports SourceTask274 via explicit `../overhaul-feline-runtime-274/sourceTask274`; prep helper is also explicit274. Root canonical overlay maps original222 actor and owner URLs to these files; helper modules load by explicit new paths, one owner/module/registry. Actual root overlay/build is UNRUN. Expected catalog47, bones61, primitives4, complete39 unchanged. Passive observer/grounded/material diagnostic remains `sourceTasks.grounded250`; prep/schedule diagnostics retain267 field names.

## Corrected physical control operands

The fixture invokes the REAL267/274 owners over the SAME actual268 catalog/264 decoded asset and separate current fixed Rapier terrain. Constructed native readbacks are explicitly not real authoritative native trajectories. Frame XZ distance is actual displacement, speed=distance/dt, projection uses current owner visual yaw, stride is the actual selected weighted nativeDistancePerCycle, signed unwrapped advance=sign(projection)*distance/stride. Independent phaseCounter integrates that same advance; reset clears it and stop native distance sets it to zero. Each actual owner sets GroundContext from its unchanged internal calculation. This corrects267's contradictory fixture (+1/96 context versus ±1/48 phases/native travel and positive context while stopped). CLOSED267 nominal fulfillment counts are not faithful native-input evidence.

`terminal274.json`: type exit0/5.375s; ONE suite exit1/4.266s, no repair/retry. Both actual owner constructors47 loaded clips/catalog/rest guards passed; candidate complete39 map assertion passed. Completed all5 gait speed bands in both directions64 frames each, moving R both directions49 frames each, interrupted R/reversal and initial stopfade36 frames.774 completed frames. Maximum phase-counter error0; normalized orientation267vs274 difference1.0324e-7rad; p/scales exact; independent full weighted-pad versus affine minimum error2.2204e-16m. Active/interrupted chart poses remain equivalent in this coverage.

First assertion `STOP_GROUNDED_ADVANCE` at R_INTERRUPTION_STOP frame36 incorrectly equated ALL footClock.advance with native gait travel. Native distance0, owner phase and counter both .2234025534690562, perfoot signedAdvance0; both owners source status, currentReason/firstFailure null. Positive idle contributors legitimately publish ACTUAL_IDLE_SOURCE_KEY_CLOCK advance .01388888853101955 from advancing actual idle clips. The fixture wrongly required that separate idle advance to be0. This is a measurement oracle failure, not evidence of continued native gait travel or a runtime pose failure. Its exact input/clock/event operands remain in owner274.json and summary274.json. No runtime clock changed. Remaining stop/idle, turn/supportloss, life/complete/unsupported restoration/disposal fixture cases are UNREACHED; they are not relabeled passed.

## Actual settled-owner work/cost, partial only

532 paired settled NativeOwner.step samples (including actual progress1 context): baseline267 median1.2906ms/p951.7292; candidate274 median1.0793ms/p951.6150; pairedmedian difference .1937ms. Alternating order, constructed trajectories, nonisolated Node CPU; not a hardware/human FPS benchmark. Total settled graph samples2194→884 through reached coverage. This compares actual owner path rather than267's no-prep SourceTask surrogate, but suite partial status applies.

All10 coherent gait cases have some fulfilled material constraints (4–45 per64 frames), so267's zero counts were fixture-limited. These are NOT full planted movement acceptance: material normal/tangential errors across touch/recovery are substantial (case maxima up to .18828m normal and .45117m tangent during movingR down). Reason histograms and capped exact perlimb request/anchor/material/hip/limits/predicted-workspace/clock operands are preserved in owner274.json. Examples include OBSERVED_TRAVEL_YAW_WORKSPACE_EXIT, AUTHORED_UNLOAD_OR_RECOVERY, REVERSED_TOUCH_NO_REMAINING_PEAK and UP_WALK forward FINAL_SAME_POINT_OR_COMPLETE_PAD_CONSTRAINT_FAILED. ContactQualified=false and current client surface qualification unchanged. No force/balance/contact certificate.

## Remaining gate

Independent source review decides admission. The clock oracle should distinguish signed gait advance from separate idle source clocks; no motion/tolerance retune follows from this assertion. Full lifecycle/remaining stop checks and actual private gameplay/temporal pixels remain necessary. Root owns any subsequent authorization/integration. Candidate source is preserved without another suite or changed guards.
'''
(H/'HANDOFF.md').write_text(text,encoding='utf-8')
files=[p for p in H.rglob('*') if p.is_file() and p.name!='source-seal.json' and '__pycache__' not in p.parts]
(H/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','status':'PARTIAL_NUMERIC_FIRST_FIXTURE_ORACLE_FAILURE','files':[row(p) for p in sorted(files)]},indent=2),encoding='utf-8')
print(json.dumps({'writer':'CLOSED','seal':row(H/'source-seal.json'),'handoff':row(H/'HANDOFF.md'),'runtime':[row(H/n) for n in ['NativeActor274.tsx','nativeOwner274.ts','sourceTask274.ts','preparation274.ts']]}))
