from pathlib import Path
import shutil,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
p=r/'docs/overhaul/resource-limit-handoff-20261010.md';prior=h/'preimages/resource-pointer-before172.md'
if not prior.exists():shutil.copy2(p,prior)
header='''# Continuation172 ACTIVE — single8799 frozen061 under independent review

Full original finite overhaul goal remains ACTIVE/INCOMPLETE. Latest precise continuation: `docs/overhaul/player-integration-172-handoff.md`. Public8799 frozen061 receipt0f85163eac0dbc7047caf84ae725b094f38b1ca3ceccc3ee0bfbb9b4bb612215,435files,6 admitted168/171 source changes,PID359304/server70124 LIVE. Old06061854 TERMINALexit1 after exact idle PID stop;060/058 preserved rollbacks. No new public port. Current061 is not full gameplay acceptance.

Source168 seal a715f9ea3234ee08311224f07ad73cd0d95ed0766d34d71bed226beb598d6a7c and171 seal e2b6038786f3c96d7ca973b94a453f15557c4c7af9cbe5ef8bed0e9fcb70bcd2 CLOSED; independent source reviews approve one assembled gate. Build1723153 TERMINALexit0/29.734s180cap; frozen verified. Actualsolo17218411 TERMINALexit0/79.672s130cap,child74.933s188samples1995sealedrowsMATCH/noerrors/pauseheld/workerclosed; actualcritic review PENDING. ONforward6s ran into roadside lamps,8.24m total vsOFF44.08,not a matchedspeedbenchmark. HeadlessLowest48/54medianforward is not affected-human lag resolution.

169 profile is CLOSED first failure after OFFtoggle/resume, strict authored Walk cycle; original captures/profiles and critic hold remain preserved. New171 corrects all-positive measured gait clocks; passing source and solo capture do not certify footcontact or art. Native168 safe deployment/checkpoint policy still unqualified in actualco-op. NEW170 mission tool-only specialist ACTIVE, firstsource fixture staging failure preserved and one permitted narrowrepair at most; no170publicjob launched. Critic has authority to reject.

Latest verified closed sourceoverlay remains063 manifest928e3f2df557466478ceba644dcb2e2259ca4c57d869560d05784537942989bc; orderedparents through062 then063,never028. New064 must preserve closed168/169/170/171/root172, exact original media/receipts/verdicts and current handoff; not yet created. If allowance ends, retain current source/writer state and explicitly leave fullscope incomplete. No reset/credit consumed or authorized.

---

'''
p.write_text(header+prior.read_text(encoding='utf8'),encoding='utf8')
q=r/'docs/overhaul/player-integration-172-handoff.md';old=h/'preimages/in-progress-handoff-before-update.md'
if not old.exists():shutil.copy2(q,old)
q.write_text(header+'''Next actions: await independent actual172 retention verdict and170 bounded tool-only closure; do not re-run closed169/165/172. If171 retained and170 independently admitted, prepare NEW170 supervisor binding exactfrozen061 parent (notplayable-root), idle currentHTTP andclosedsource, then ONE ordinary two-client mission with unchanged20/420/30/450/480limits. First failureSTOP/save; no margin/arrival disk/range waiver. Root owns browsers/server; specialist must not launch. Contact/gait/art/destruction/climbing/combat/affected-humanperformance and fourmechs/threemaps/fullmode/progression/weather/audio remain INCOMPLETE. Preserve all sourceassets/Blender/licenses, current061 and rollbacks. Before future serverreplacement reverify currentPIDcommand/listener/receiptHTTP/idle and wait owned70124 terminal; only reuse8799.
''',encoding='utf8')
print('Exact ACTIVE172 pointer updated; immutable predecessor preserved')
