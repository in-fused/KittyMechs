import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {isOptionalTelemetryAbort219} from './network-classification.mjs';
const retained=JSON.parse(await readFile('.sites-runtime/overhaul-20261011/loading217-actual/evidence.json','utf8'));
const actual=retained.network.find(r=>r.type==='requestfailed');
assert.equal(actual.url,'http://localhost:8799/client-report');assert.equal(actual.error.errorText,'net::ERR_ABORTED');
//217 omitted failure request method: saved row must NOT be retrospectively
// exempted. New observed method is mandatory; the POST case below is a source
// fixture, not fabricated actual217 method evidence.
const origin='http://localhost:8799',positive={...actual,method:'POST'};
const rows=[['retained217MissingMethod',actual,false],['futureExactPOST',positive,true],['otherOrigin',{...positive,url:'http://127.0.0.1:8799/client-report'},false],['lookalikePath',{...positive,url:origin+'/client-report-extra'},false],['query',{...positive,url:origin+'/client-report?x=1'},false],['GET',{...positive,method:'GET'},false],['GLB',{...positive,url:origin+'/assets/models/Sentinel_Scout.glb'},false],['differentNetworkFailure',{...positive,error:{errorText:'net::ERR_CONNECTION_RESET'}},false],['HTTPError',{...positive,type:'http-error'},false],['caseChangedMethod',{...positive,method:'post'},false]];
const result=rows.map(([name,row,expected])=>{const observed=isOptionalTelemetryAbort219(row,origin);assert.equal(observed,expected,name);return {name,row,expected,observed};});
await writeFile('tools/overhaul-loading-capture-219/fixture-receipt.json',JSON.stringify({writer:'CLOSED',status:'PASS',scope:'Static classification only; saved217 failure remains exact, future POST case is hypothetical source fixture',result},null,2)+'\n');console.log(JSON.stringify({status:'PASS',cases:result.length}));
