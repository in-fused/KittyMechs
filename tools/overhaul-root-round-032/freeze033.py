from pathlib import Path
import hashlib,json,os,shutil,datetime
r=Path(__file__).resolve().parents[2]
old=r/'.sites-runtime/overhaul-20261009/build-032';new=r/'.sites-runtime/overhaul-20261009/build-033'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(old/'receipt.json')=='457c1f10ff23bdeae812c0ab19d9e7df1c383e733a6b3a72b0f559e95b9350f2'
before=json.loads((old/'receipt.json').read_text());mapping={x['path']:x for x in before['files']}
receipt=json.loads((new/'receipt.json').read_text());dest=new/'playable-root';assert not dest.exists()
links=0;copies=0;copyBytes=0
for x in receipt['files']:
    p=(r/x['path']).resolve();target=(dest/x['path']).resolve()
    assert p.is_relative_to(r) and target.is_relative_to(dest)
    assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256']
    previous=mapping.get(x['path'])
    if previous and previous['sha256']==x['sha256']:
        frozen=(old/'playable-root'/x['path']).resolve()
        assert frozen.is_relative_to((old/'playable-root').resolve()) and frozen.is_file() and sha(frozen)==x['sha256']
dest.mkdir()
for x in receipt['files']:
    target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True)
    previous=mapping.get(x['path'])
    if previous and previous['sha256']==x['sha256']:
        os.link(old/'playable-root'/x['path'],target);links+=1
    else:
        shutil.copy2(r/x['path'],target);copies+=1;copyBytes+=x['bytes']
    assert target.stat().st_size==x['bytes'] and sha(target)==x['sha256']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in before['files'])
out={'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'verified':True,'files':len(receipt['files']),'bytes':sum(x['bytes'] for x in receipt['files']),'immutable032Hardlinks':links,'changedCopies':copies,'copiedBytes':copyBytes,'receiptSha256':sha(new/'receipt.json'),'parentReceiptSha256':sha(old/'receipt.json'),'scope':'Both checkpoints immutable. Never edit either hardlinked root. No mutable source/dist files linked. All033 and original032 bytes verified; no gameplay approval.'}
(new/'playable-checkpoint.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))

