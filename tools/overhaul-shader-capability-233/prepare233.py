from pathlib import Path
import ast
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent
old=(r/'tools/overhaul-native-observer-228/supervise.py').read_bytes();(f/'supervise228-preimage.py').write_bytes(old)
s='\n'.join(old.decode().splitlines())+'\n'
s=s.replace("assert os.environ.get('KITTYMECH_228_ACTUAL_APPROVED')=='1'","assert os.environ.get('KITTYMECH_233_CAPABILITY_APPROVED')=='1'")
s=s.replace('native228-supervisor','shader233-supervisor').replace('tools/overhaul-native-observer-228/capture.mjs','tools/overhaul-shader-capability-233/probe233.mjs')
s=s.replace("'capSeconds':180","'capSeconds':30").replace('>=179','>=27').replace('180-(time.monotonic()-start)','30-(time.monotonic()-start)').replace('<=180','<=30')
# Preserve a creation identity once observed; a later exited/null query must not erase it.
s=s.replace('for pid in ids.ids[:ids.count]:owned[str(pid)]=creation(pid)',"for pid in ids.ids[:ids.count]:\n    stamp=creation(pid)\n    if stamp is not None:owned.setdefault(str(pid),stamp)")
ast.parse(s);(f/'supervise233.py').write_text(s,encoding='utf8',newline='\n')
print('STATIC supervisor ready, no capability query yet')
