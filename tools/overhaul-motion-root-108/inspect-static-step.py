"""Preserve the failed LINEAR-only inspection; support exactly constant STEP.
No accessor, interpolation, output curve, source master or public bytes change.
"""
from pathlib import Path
old=Path(__file__).with_name('inspect-export.py').read_text()
before="assert sampler.get('interpolation','LINEAR')=='LINEAR'"
after="assert sampler.get('interpolation','LINEAR') in ('LINEAR','STEP')"
assert old.count(before)==1
old=old.replace(before,after)
before="assert len(times)==len(out)"
after="assert len(times)==len(out)\n  if sampler.get('interpolation')=='STEP':assert all(row==out[0] for row in out),('nonconstant STEP',animation['name'],name)"
assert old.count(before)==1
exec(compile(old.replace(before,after),str(__file__),'exec'))
