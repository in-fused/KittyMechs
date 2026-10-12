import os,subprocess
os.environ['KITTYMECH_BUILD_RECEIPT']='1022aa38c1dd3a29ed0214ca30ad56f8571c3f9a1bd19f3578a99eba63aca0c6'
raise SystemExit(subprocess.call(['node','tools/overhaul-guest-readiness-046/diagnostic.mjs','.sites-runtime/overhaul-20261010/guest-readiness-046-public']))
