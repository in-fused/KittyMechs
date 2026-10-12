"""Read-only source migration. Run once, then normal builds use local assets only."""
import subprocess, os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
blender=Path(os.environ.get('BLENDER_PATH',r'D:\KittyMechTools\blender-4.5.14-windows-x64\blender.exe'))
if not blender.exists():
    raise SystemExit('Set BLENDER_PATH to a Blender executable. No Unreal installation is needed.')
subprocess.run([str(blender),'--background','--factory-startup','--threads','2','--python',str(root/'tools/export_blender.py')],cwd=root,check=True)
