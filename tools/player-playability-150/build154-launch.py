from pathlib import Path
import subprocess
r=Path(__file__).resolve().parents[2]
raise SystemExit(subprocess.call(['cmd','/c','npm','run','build'],cwd=r))
