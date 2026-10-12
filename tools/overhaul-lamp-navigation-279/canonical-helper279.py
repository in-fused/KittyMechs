from pathlib import Path
import json
R=Path(__file__).resolve().parents[2];H=Path(__file__).parent
s=(H/'lampNavigation279.ts').read_text(encoding='utf-8');p=R/'shared/lampNavigation279.ts';assert not p.exists()
p.write_text(s.replace("from '../../shared/data/rainlineLampMeshCollision001.json'","from './data/rainlineLampMeshCollision001.json'"),encoding='utf-8')
m=json.loads((H/'patch-manifest279.json').read_text(encoding='utf-8'));m['aliases'][0]['source']='shared/lampNavigation279.ts';m['aliases'][0]['mode']='new canonical module, same tested algorithm; JSON import adapted relative canonical shared path';m['canonicalSourceReplacement']='Navigation/planner/geometry-source copy contents must load under canonical source paths so original relative imports keep ownership';(H/'patch-manifest279.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
