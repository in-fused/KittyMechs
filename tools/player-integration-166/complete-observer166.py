from pathlib import Path
import hashlib
h=Path(__file__).resolve().parent;p=h/'play166.mjs'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='f8b342d26d9abf32d97caac655725d386b621c20138cf8cb2a60419779f8f4db'
s=p.read_text(encoding='utf8')
s="import {assertCoordination166,finishCoordination166} from './assert-coordination166.mjs';\n"+s
s=s.replace('stance:a.stance,grounded:a.grounded','stance:a.stance,jumpEpoch:a.jumpEpoch,grounded:a.grounded')
needle="if(!sample.worker||sample.worker.mainAuthority"
assert needle in s;s=s.replace(needle,"assertCoordination166(sample,phase,local);"+needle,1)
needle="evidence.status='CAPTURED_INDEPENDENT_REVIEW_REQUIRED';"
assert needle in s;s=s.replace(needle,"evidence.coordination164=finishCoordination166(evidence.samples);"+needle,1)
p.write_text(s,encoding='utf8');print('Observer166 complete, UNRUN; final-pose/lease assertions added')
