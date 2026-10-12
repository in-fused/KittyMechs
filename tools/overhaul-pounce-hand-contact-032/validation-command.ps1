$ErrorActionPreference = 'Stop'
# ROOT ONLY after independent preflight and serial grant. Inclusive wall cap
# <=60s covers source hashes/startup/load/query/save/child close; reserve10s
# termination/wait INSIDE that cap and stop earlier for21:33cleanup.
& 'D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe' --background --factory-startup --python-exit-code 1 --python 'C:/Users/Taylor/Documents/GitHub/KittyMech-Web/assets/source/overhaul-pounce-hand-contact-032/validate_hand.py'
exit $LASTEXITCODE
