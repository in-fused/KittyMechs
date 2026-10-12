from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[2];H=Path(__file__).parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(R).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
data=json.loads((H/'owner275.json').read_text(encoding='utf-8'))
summary={k:data[k] for k in ['status','scope','frames','maxOrientationDifference','maxIndependentPadError','maxPhaseError','settledPrepSamples','failure']}
summary['cost']=data['cost']['summary'];summary['cases']=[{k:r[k] for k in ['name','frames','fulfilled','reasons','maxAbsMaterialNormalGap','maxTangential']} for r in data['cases']]
(H/'summary275.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
oldseal=R/'tools/overhaul-feline-runtime-274/source-seal.json';old=json.loads(oldseal.read_text(encoding='utf-8'));checks=[]
for original in old['files']:
 actual=row(R/original['path']);checks.append({'path':original['path'],'matches':actual['sha256']==original['sha256'] and actual['bytes']==original['bytes']})
assert all(c['matches'] for c in checks),'CLOSED274_MUTATION'
runtime=[R/'tools/overhaul-feline-runtime-274'/n for n in ['NativeActor274.tsx','nativeOwner274.ts','sourceTask274.ts','preparation274.ts']]
(H/'protected-inputs275.json').write_text(json.dumps({'writer':'CLOSED','closed274Rows':checks,'files':[row(p) for p in [oldseal,*runtime,R/'tools/overhaul-feline-runtime-267/source-seal.json',R/'tools/overhaul-feline-admission-268/decoded-contract268.json',R/'assets/source/overhaul-feline-animation-264/Pounce_Feline264.glb']]},indent=2),encoding='utf-8')
text='''# 275 CLOSED — fixture-only signed gait / idle source clock correction

Writer CLOSED. PASS_COHERENT_OWNER_NUMERIC_ONLY. Exact CLOSED274 runtime is imported unchanged; actual267 baseline and268 catalog/264 asset are unchanged. No runtime/tolerance/constant/guard/asset/production modifications or browser/build/native-game/DCC jobs. storage:clean ran first with zero deletions. All text recipe reads/writes explicitly UTF-8; old274 failure source/data/terminal/seal are preserved byte-exact preimages.

The only semantic fixture correction separates native signed gait advance from authored idle source clock advancement. A stopped carrier still asserts perfoot signedAdvance===0 and owner gait phase equals the frozen independent distance counter. Every ACTUAL_IDLE_SOURCE_KEY_CLOCK event instead compares its advance to the wrapped delta of current versus previous actual sourceTasks.idleClocks[clip], divided by the exact catalog last-first source-key span; actual key range is also asserted. No zero check is removed without its correct source-clock replacement. R_INTERRUPTION_STOP runs86 frames (86/60=1.43333s) since its life reset, beyond the actual1.2s idle source span, reaching cycle wrap while the same actual-clock assertions run. No idle-motion claim is inferred from FK markers.

`terminal275.json`: one scoped type check exit0/5.672s (cap15); one finite owner suite exit0/5.953s (cap30). No repair/repeat. Actual267/274 constructors accepted47 clips,61 rest/bones,4 primitives and39 complete actions.876 owner frames cover five settled gait bands in both directions64 frames each; movingR up/down49 each; interruption/reverse/stop/idle86; turn/support loss48; life reset/Air complete/unsupported climb/restore4; both owners disposed. Complete dispatch here exercises Air only; retained39 compatibility has separate268 proof. Other pair/down/critical gameplay behavior remains unqualified.

Inputs are constructed RenderActorFrame/native-readback records with actual decoded264 rig, not actual authoritative native simulation/ACK trajectories. XZ displacement, distance/dt speed, current visual-yaw projection and selected weighted nativeDistancePerCycle produce one signed unwrapped phase advance; the independent counter integrates that exact value. Stops give native distance0 and reverse direction is negative where projection is negative. Source and camera/body/native authority code is unchanged.

Maximum independent phase-counter error0; normalized267vs274 bone orientation difference2.4576e-7rad; translations/scales exact; complete independently skinned weighted-pad versus affine minimum error2.2204e-16m. The final checks reached turn/supportloss, source return after unsupported with historical failure preserved, generation/life phase reset, and disposal. These are numeric/source lifecycle checks, not temporal gameplay/art/contact qualification.

591 settled actual NativeOwner.step paired samples including progress1 context:267 median1.5705ms/p953.5995;274 median1.3172ms/p952.8068; pairedmedian difference .2440ms. Alternating order, constructed paths/fixed terrain, nonisolated Node timing; not human FPS or native-browser performance proof. Settled distinct clip sample totals2475→1019. Both actual assets/code remain identical apart from274's exact identity-chart retirement/source wiring correction.

Material diagnostics remain first-class limitations: all ten gait cases have some fulfilled constraints (4–45 per64 frames), but fullpad/material errors during touch/recovery/failed workspace can be large (normal up to .18828m, tangent up to .45117m). MovingR up/down fulfilled29/10; R stop/interruption56; turn/supportloss34. Reason histograms and capped exact failed perlimb hip/target/anchor/material/min-max/projection/event-clock operands remain in owner275.json. ContactQualified=false, current fixed-client lease semantics, reach/skin guards and source recovery are unchanged. This does not certify believable planted gait, weight transfer or source264 preparation pixels.

Runtime integration remains the EXACT CLOSED274 four files;275 provides fixture/result only. Root canonical overlay maps original222 actor/owner to274; actor imports ./nativeOwner218; owner imports explicit274 sourceTask/helper, avoiding duplicate owner modules. Independent source review and one real private ordinary/R/critical performance/pixel gate remain root-owned; no public promotion from this PASS.
'''
(H/'HANDOFF.md').write_text(text,encoding='utf-8')
files=[p for p in H.rglob('*') if p.is_file() and p.name!='source-seal.json' and '__pycache__' not in p.parts]
(H/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','status':'PASS_COHERENT_OWNER_NUMERIC_ONLY','files':[row(p) for p in sorted(files)]},indent=2),encoding='utf-8')
print(json.dumps({'writer':'CLOSED','seal':row(H/'source-seal.json'),'handoff':row(H/'HANDOFF.md'),'runtimeUnchanged':[row(p) for p in runtime]}))
