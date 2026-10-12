from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];folder=Path(__file__).resolve().parent
rows=[]
for rel in ['src/ui/Settings.tsx','src/ui/styles.css']:
 p=r/rel;b=p.read_bytes();dest=folder/rel.replace('/','__');assert not dest.exists();dest.write_bytes(b)
 rows.append({'path':rel,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
out=folder/'preimages.json';assert not out.exists();out.write_text(json.dumps(rows,indent=2),encoding='utf8')
p=r/'src/ui/Settings.tsx';s=p.read_text(encoding='utf8');old='<div role="group" aria-label="Renderer report">';assert s.count(old)==1
p.write_text(s.replace(old,'<div className="renderer-report" role="group" aria-label="Renderer report">'),encoding='utf8')
p=r/'src/ui/styles.css';s=p.read_text(encoding='utf8');assert '.renderer-report{' not in s
p.write_text(s+'\n.settings-panel .renderer-report{display:grid;gap:6px}.settings-panel .renderer-report>strong{font-size:12px}.settings-panel .renderer-report .setting-note{margin-top:0}\n',encoding='utf8')
print('060report spacing source;059 preimages preserved; no build/visual qualification')
