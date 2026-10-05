const credentialName=/^(?:xsec_token|access_token|refresh_token|auth_token|authorization|bearer|api_key)(?:=|$)/i;
const credentialFragment=/(?:^|[?&#/])(?:xsec_token|access_token|refresh_token|auth_token|authorization|bearer|api_key)=/i;
function decoded(value){
 // ASCII delimiters/names are enough for credential detection. A malformed escape
 // elsewhere must not prevent detection; each replacement shortens the string.
 for(;;){const next=value.replace(/%([a-f\d]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16)));if(next===value)return value;value=next;}
}
export function hasLinkCredentials(url){return [...url.searchParams.keys()].some(key=>credentialName.test(decoded(key)))||credentialFragment.test(decoded(url.hash));}
export function stripLinkCredentials(url){for(const key of [...url.searchParams.keys()])if(credentialName.test(decoded(key)))url.searchParams.delete(key);if(credentialFragment.test(decoded(url.hash)))url.hash='';return url;}
