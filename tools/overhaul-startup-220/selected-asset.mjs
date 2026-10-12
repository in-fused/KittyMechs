/** Build-time schema/identity binding only. Actual loader/array qualification
 * and matching actor plugin admission belong to the root before a build. */
export function startupSelectedAsset220(delivery){
 if(delivery===undefined)return null;
 const {contract,qualification}=delivery??{};
 if(!contract||!qualification||qualification.privateOnly!==true)throw Error('220 private delivery binding required');
 if(!/^\/assets\/private\/Pounce_[A-Za-z0-9_-]+\.glb$/.test(contract.publicURL))throw Error('220 exact private unqueried publicURL required');
 for(const value of [contract.sha256,qualification.packedFromSHA256,qualification.allArrayLoaderReceiptSHA256])if(!/^[a-f0-9]{64}$/.test(value??''))throw Error('220 actual full SHA identities required; pending/missing proof rejected');
 return contract.publicURL+'?sha='+contract.sha256.slice(0,12);
}
