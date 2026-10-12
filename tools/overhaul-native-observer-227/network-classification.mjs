/** Only this optional diagnostic transport abort is nonfatal. It says nothing
 * about the renderer report reaching the server or the abort's initiator. */
export function isOptionalTelemetryAbort219(row,origin){
 return row.type==='requestfailed'&&row.method==='POST'&&row.url===origin+'/client-report'&&row.error?.errorText==='net::ERR_ABORTED';
}
