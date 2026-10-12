from pathlib import Path
r=Path(__file__).resolve().parents[2]
prefix='> COOP045 UPDATE 2026-10-11 00:30UTC: Stable8799 still serves immutable036, accepted LIMITED Solo preview only. ONE two-independent-client mission observation failed guest-own visual readiness before navigation;197 committed publication comparisons matched, zero objectives complete. Independent045 DENIES full mission/general guest readiness; cause UNKNOWN. Full finite overhaul ACTIVE / INCOMPLETE. See docs/overhaul/coop-play-045-handoff.md. ONE distinct bounded046 guest-view diagnostic is pending; no speculative fix or automatic mission retry.\n\n'
for n in ['current-state.md','playable-checkpoints.md','resource-limit-handoff-20261010.md','active-bounded-work-20261010.md']:
 p=r/'docs/overhaul'/n;s=p.read_text(encoding='utf8');assert not s.startswith('> COOP045 UPDATE');p.write_text(prefix+s,encoding='utf8')
