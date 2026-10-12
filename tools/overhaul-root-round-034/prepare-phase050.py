from pathlib import Path
r=Path(__file__).resolve().parents[2]
s=(r/'tools/overhaul-root-round-034/prepare-processor049.py').read_text().replace('049','050')
s=s.replace('strict packaging pass of048raw','strict packaging pass of048raw with explicit source-time-origin contract')
p=Path(__file__).with_name('prepare-processor050.py');assert not p.exists();p.write_text(s)
