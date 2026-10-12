from pathlib import Path
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
s=(r/'tools/overhaul-coop-133/mission-capture.mjs').read_text()
s=s.replace("from './lifecycle-adapter.mjs'","from '../overhaul-coop-133/lifecycle-adapter.mjs'").replace("from './exposure-planner.mjs'","from '../overhaul-coop-133/exposure-planner.mjs'")
a=s.index('const buildReceipt=');b=s.index('\nconst start=',a)
s=s[:a]+"const buildReceipt=process.env.KITTYMECH_BUILD_RECEIPT;if(!/^[a-f0-9]{64}$/.test(buildReceipt??''))throw Error('134 mission requires exact frozen receipt SHA256');"+s[b:]
s=s.replace("owners:window.kittyIdentity57Runtime005?.read?.(),", "owners:window.kittyIdentity57Runtime005?.read?.(),publicFeline:window.kittyFelinePrototype008?.read?.(),")
(h/'mission-capture.mjs').write_text(s)
print('Derived133 mission bound by root exact frozen134 launcher; no job')
