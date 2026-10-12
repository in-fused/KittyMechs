import pathlib,json,hashlib,sys
root=pathlib.Path(__file__).resolve().parents[2];folder=root/'tools/overhaul-delivery-primary-207';stage=sys.argv[1]
if stage not in ('before','after'):raise RuntimeError('207_VERIFICATION_STAGE')
path=folder/'readiness-seal207.json';sha=hashlib.sha256(path.read_bytes()).hexdigest()
if sha!='a7d478825fbe5ea9cda3f12d4dc9fe073e80aa180263cc6c7f43726cc75ea759':raise RuntimeError('207_READINESS_SEAL_CHANGED')
seal=json.loads(path.read_text());rows=[dict(r,actualSHA256=hashlib.sha256((root/r['path']).read_bytes()).hexdigest(),match=hashlib.sha256((root/r['path']).read_bytes()).hexdigest()==r['sha256']) for r in seal['files']+seal['protectedInputs']];result={'stage':stage,'readinessSealSHA':sha,'sealedRows':len(seal['files']),'protectedInputs':len(seal['protectedInputs']),'rows':rows,'allMatch':all(r['match'] for r in rows)};out=root/'.sites-runtime/overhaul-20261010/delivery206-primary';out.mkdir(parents=True,exist_ok=True);(out/('protected-'+stage+'.json')).write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps({k:result[k] for k in ('stage','sealedRows','protectedInputs','allMatch')}))
if not result['allMatch']:raise RuntimeError('207_PROTECTED_ROWS_CHANGED')
