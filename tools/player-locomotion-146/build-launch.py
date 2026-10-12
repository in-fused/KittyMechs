from pathlib import Path
import subprocess
r=Path(__file__).resolve().parents[2]
for command in [['node','node_modules/typescript/bin/tsc','--noEmit'],['node','node_modules/vite/bin/vite.js','build']]:
 result=subprocess.call(command,cwd=r)
 if result:raise SystemExit(result)
