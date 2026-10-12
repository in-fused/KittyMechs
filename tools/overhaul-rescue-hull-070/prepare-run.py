from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
s=json.loads((h/'source-seal.json').read_text());assert s['writersClosed']
for x in s['files']:
 b=(r/x['path']).read_bytes();assert len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256']
s['command']=['node','node_modules/vitest/vitest.mjs','run','--config','tools/overhaul-rescue-hull-070/vitest.config.ts']
(h/'run-seal.json').write_text(json.dumps(s,indent=2),encoding='utf8');print('One unchanged real-Simulation rescue regression command prepared.')
