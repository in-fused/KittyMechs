$ErrorActionPreference = 'Stop'
# Root-only: independently cap inclusive execution at <=300s and remaining
# budget before21:10cleanup, reserving actual termination/wait time.
& 'D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe' --background --factory-startup --python-exit-code 1 --python 'C:/Users/Taylor/Documents/GitHub/KittyMech-Web/assets/source/overhaul-pounce-paired-route-029/author.py'
exit $LASTEXITCODE
