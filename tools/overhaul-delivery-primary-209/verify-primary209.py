"""Readiness/protection verifier only; does not launch primary or mutate inputs."""
import json,pathlib,hashlib,sys
root=pathlib.Path(__file__).resolve().parents[2];folder=root/'tools/overhaul-delivery-primary-209';stage=sys.argv[1] if len(sys.argv)>1 else 'before'
seal=json.loads((folder/'readiness-seal209.json').read_text());rows=[]
for r in seal['files']+seal['protectedInputs']:
 p=root/r['path'];rows.append(dict(r,match=p.stat().st_size==r['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256']))
out={'stage':stage,'sealedRows':len(seal['files']),'protectedInputs':len(seal['protectedInputs']),'allMatch':all(r['match'] for r in rows),'rows':rows};site=root/'.sites-runtime/overhaul-20261010/delivery209-primary';site.mkdir(parents=True,exist_ok=True);(site/('protected-'+stage+'.json')).write_text(json.dumps(out,indent=2));print(json.dumps({k:v for k,v in out.items() if k!='rows'}));raise SystemExit(0 if out['allMatch'] else 1)
