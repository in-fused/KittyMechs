from pathlib import Path
import hashlib,json,shutil,datetime,sys
r=Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261011/handoff-084'
assert sha(prior/'manifest.json')=='9130c7d9594bdad5ac52b25d1880482eb88c12ab1783c10a095c99a93ebd3929'
old=json.loads((prior/'manifest.json').read_text(encoding='utf8'))
for x in old['files']:assert sha(prior/'files'/x['path'])==x['sha256'],x['path']
assert len(sys.argv)==4,'Need CLOSED217 output path/SHA and CLOSED219 actual output SHA'
seals={
 'tools/overhaul-native-wiring-218/source-seal.json':'c9b169fa99ec072b51e33f780cb7c9fbfca812f34bd1534081ccb65d128a9b83',
 'tools/overhaul-native-214/source-seal.json':'b867aead417e6cb5098fdbaf0e0a44e21a5d09be62e65ad6dcfe3adc6f9fa618',
 '.sites-runtime/overhaul-20261011/entry215-private/output-seal.json':'9779527fee9be7fa0c842661a4f9505fa45cf36c8fff5df449ba88ba0147d588',
 '.sites-runtime/overhaul-20261011/loading216-actual/output-seal.json':'a0ee4ca2acf951b1ac374ef97dc846c110dcf8b7d3e244f182df585706bd0710',
 'tools/overhaul-loading-capture-217/source-seal.json':'bbaa6675452c985bd494ed84bbc4f639f652fc5531bc3ffbda7cda44c7f1d004',
 sys.argv[1]:sys.argv[2],
 'tools/overhaul-loading-capture-219/source-seal.json':'d6230ff62fd32aae67365d9cce59d9ab74193a5668df1ad62d4f51153463df7f',
 '.sites-runtime/overhaul-20261011/loading219-actual/output-seal.json':sys.argv[3],
}
for name,digest in seals.items():
 p=r/name;assert sha(p)==digest,name
 s=json.loads(p.read_text(encoding='utf8'));assert s['writer']=='CLOSED',name
 for x in s['files']:assert sha(r/x['path'])==x['sha256'],x['path']
paths=['docs/overhaul/player-integration-219-handoff.md','docs/overhaul/player-integration-212-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/critic/readiness213-actual-review.md','docs/overhaul/critic/native214-source-review.md']
review=r/'docs/overhaul/critic/readiness217-actual-review.md'
if review.exists():paths.append(review.relative_to(r).as_posix())
review=r/'docs/overhaul/critic/readiness219-actual-review.md'
if review.exists():paths.append(review.relative_to(r).as_posix())
folders=['tools/player-integration-212','tools/overhaul-native-214','tools/overhaul-native-wiring-218','tools/overhaul-entry-215','tools/overhaul-loading-capture-216','tools/overhaul-loading-capture-217','.sites-runtime/overhaul-20261011/entry215-private','.sites-runtime/overhaul-20261011/entry215-supervisor','.sites-runtime/overhaul-20261011/loading216-actual','.sites-runtime/overhaul-20261011/loading216-supervisor','.sites-runtime/overhaul-20261011/loading217-actual','.sites-runtime/overhaul-20261011/loading217-supervisor','tools/overhaul-loading-capture-219','.sites-runtime/overhaul-20261011/loading219-actual','.sites-runtime/overhaul-20261011/loading219-supervisor']
for folder in folders:
 assert (r/folder).is_dir(),folder
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
dest=r/'.sites-runtime/overhaul-20261011/handoff-085';dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;before=sha(p);q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert before==sha(p)==sha(q),name
 rows.append({'path':name,'bytes':q.stat().st_size,'sha256':before})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Final212 root handoff, CLOSED213 critic, CLOSED214 partialnative source/critic, CLOSED215 fixed-entrybuild, CLOSED216 failedinvite capture, CLOSED217 correctedpublichold capture/source and CLOSED219 optionaltelemetry classification/finalcapture. CLOSED218 source included; ACTIVE218 critic review excluded. No publicupgrade/fullgoal/humanlag acceptance.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes'],'closed218IncludedActiveCritic218Excluded':True}
(r/'.sites-runtime/overhaul-20261011/continuation-verification-085.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))
