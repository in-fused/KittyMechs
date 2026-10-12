import subprocess
for p in ['controller.mjs','capture.mjs']:
 code=subprocess.call(['node','--check','tools/overhaul-coop-play-076/'+p])
 if code: raise SystemExit(code)
