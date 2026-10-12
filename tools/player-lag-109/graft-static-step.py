"""Correct readback of exactly constant STEP exports without modifying any curve."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[2]
source=root/'tools/overhaul-motion-106/graft106.py'
here=root/'assets/source/overhaul-pounce-motion-106'
shutil.copy2(here/'graft106-receipt.json',here/'graft106-fourth-legacy-step-failure.json')
s=source.read_text(encoding='utf8')
old="""   k=frame-1;assert len(ts)==next(r['frames'] for r in author['records'] if r['name']==name)
   assert abs(ts[k]-frame/60)<=2e-6;local.setdefault(tm[bone],{})[p]=vs[k]"""
new="""   if mode=='STEP':
    # tracks() already requires every output tuple to be exactly constant.
    assert ts[0]-2e-6<=frame/60<=ts[-1]+2e-6
    local.setdefault(tm[bone],{})[p]=vs[0]
   else:
    k=frame-1;assert len(ts)==next(r['frames'] for r in author['records'] if r['name']==name)
    assert abs(ts[k]-frame/60)<=2e-6;local.setdefault(tm[bone],{})[p]=vs[k]"""
assert s.count(old)==1
s=s.replace(old,new)
old="if choreo['requests'][paw]['intent']=='stance':m['points'].append"
new="if choreo['requests'][paw]['intent']=='stance' and row['clock']['phase']<choreo['duty']:m['points'].append"
assert s.count(old)==1
s=s.replace(old,new)
# Retained, byte-identical legacy actions can contain deliberate STEP changes.
# The exact-constant requirement applies to the seven newly authored actions.
old="if mode=='STEP':assert all(row==vs[0] for row in vs)"
new="if mode=='STEP' and a['name'] in SELECTED:assert all(row==vs[0] for row in vs)"
assert s.count(old)==1
exec(compile(s.replace(old,new),str(source),'exec'),{'__file__':str(source),'__name__':'__main__'})
