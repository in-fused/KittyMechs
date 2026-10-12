from pathlib import Path
r=Path('.');p=r/'tools/overhaul-entry-215'
s=(r/'tools/overhaul-codec-210/supervise.py').read_text(encoding='utf-8').replace("codec210-supervisor","entry215-supervisor").replace("tools/overhaul-codec-210/run.mjs","tools/overhaul-entry-215/build215.mjs").replace("'capSeconds':30","'capSeconds':60").replace('>=29','>=57').replace('30-(time.monotonic()-start)','60-(time.monotonic()-start)').replace("'inclusiveBoundObserved':time.monotonic()-start<=30","'inclusiveBoundObserved':time.monotonic()-start<=60")
s=s.replace("after={pid:","if child and child.returncode is not None:child._handle.Close()\n after={pid:")
before="""rows=json.loads((r/'tools/overhaul-entry-215/binding.json').read_text())['files']+json.loads((r/'tools/overhaul-entry-215/source-seal.json').read_text())['files']
def matches(x):
 b=(r/x['path']).read_bytes();return len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256']
assert all(matches(x) for x in rows)
"""
s=s.replace("owned={};failure=None;child=None",before+"owned={};failure=None;child=None")
s=s.replace("'inclusiveBoundObserved':time.monotonic()-start<=60}","'inclusiveBoundObserved':time.monotonic()-start<=60,'protectedAfter':[{'path':x['path'],'match':matches(x)} for x in rows]}")
s=s.replace("raise SystemExit(1 if failure or child.returncode else 0)","raise SystemExit(1 if failure or child is None or child.returncode or any(not x['match'] for x in receipt['protectedAfter']) else 0)")
(p/'supervise.py').write_text(s,encoding='utf-8')
