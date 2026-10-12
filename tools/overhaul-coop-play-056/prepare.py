from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];base=r/'tools/overhaul-coop-play-053/mission-capture.mjs'
assert hashlib.sha256(base.read_bytes()).hexdigest()=='9086be81576fa02213d4ed2bd954704c09fbbcfd6c67f240bc3c72fca08c7229'
s=base.read_text(encoding='utf8').replace('frozen build037','frozen build038').replace("'.sites-runtime/overhaul-20261011/coop053-public'","'.sites-runtime/overhaul-20261010/coop056-public'")
# Read existing diagnostics only; gameplay control, readiness, routes, combat,
# extraction checks and all time/evidence bounds remain exactly053.
s=s.replace('camera:window.kittyMechDebug.camera(),performance:', 'camera:window.kittyMechDebug.camera(),owners:window.kittyIdentity57Runtime005?.read?.(),performance:')
out=r/'tools/overhaul-coop-play-056/mission-capture.mjs';assert not out.exists();out.write_text(s,encoding='utf8')
print(hashlib.sha256(out.read_bytes()).hexdigest())
