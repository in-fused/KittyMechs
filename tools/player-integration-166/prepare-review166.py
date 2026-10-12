from pathlib import Path
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
s=(r/'tools/player-experience-158/review158.py').read_text(encoding='utf8').replace('158','166').replace('155','164')
s=s.replace("[10,11,12,13,16,20,21,22]","[13,14,15,16,19,23,24,25]").replace("[33,34,35,36,39,43,44,45]","[36,37,38,39,42,46,47,48]")
s=s.replace("'scope':d['scope']","'scope':d['scope'],'sharedCamera167':d['sharedCamera167'],'coordination164':d['coordination164']")
p=h/'review166.py';assert not p.exists();p.write_text(s,encoding='utf8');print('Prepared read-only review166')
