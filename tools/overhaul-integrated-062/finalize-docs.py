from pathlib import Path
r=Path(__file__).resolve().parents[2];p=r/'docs/overhaul/resource-limit-handoff-20261010.md'
prefix='> LATEST058–063 CHECKPOINT: http://localhost:8799/?overhaul=1 serves immutable042, receipt e849a169d97519e5546ea33ad8dcc5d474132a1c3f53e2185147b879800338ee, pid350256/session41029. Independent063 RETAIN LIMITED new gait/control/report; DENY convincing planted movement/contact/all-view camera/art/IAB/fullmission. Actual user Lowest extreme lag remains UNRESOLVED. Full finite goal ACTIVE / INCOMPLETE. Exact recovery/failed jobs/next action: docs/overhaul/player-recovery-063-handoff.md. Latest scoped source delta040 is usable only after continuation-verification-040.json says VERIFIED. Earlier entries below are historical.\n\n'
s=p.read_text(encoding='utf8');assert not s.startswith(prefix);p.write_text(prefix+s,encoding='utf8')
print('latest pointer preserved; doc writer closed')
