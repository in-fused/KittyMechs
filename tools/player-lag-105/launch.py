import os,subprocess,sys
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']='7fb23695439b41446cfb120174ffde92c13091e9506fff3ab56142eeaea19c76'
raise SystemExit(subprocess.call(['node','--import','tsx','tools/player-lag-105/capture.mjs','.sites-runtime/overhaul-20261010/player-lag105-public'],env=env))
