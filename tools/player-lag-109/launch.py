import os,subprocess
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']='671036323a86d63b5b65bbf66dc74f239079bd2f7d27d4d08833cf5d45576b4a'
raise SystemExit(subprocess.call(['node','tools/player-lag-109/capture.mjs','.sites-runtime/overhaul-20261010/motion110-public'],env=env))
