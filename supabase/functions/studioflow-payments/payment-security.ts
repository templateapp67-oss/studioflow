export function depositPaise(price:number){
 if(!Number.isFinite(Number(price))||Number(price)<0)throw new Error('Invalid service price');
 const [whole,fraction='']=Number(price).toLocaleString('en-US',{useGrouping:false,maximumFractionDigits:20}).split('.');
 const scale=10n**BigInt(fraction.length);const numerator=(BigInt(whole)*scale+BigInt(fraction||'0'))*100n;const denominator=4n*scale;
 return Number((numerator+denominator-1n)/denominator);
}
export async function signatureMatches(secret:string,message:string,signature:string){
 if(!/^[a-f0-9]{64}$/i.test(signature))return false;
 const bytes=new TextEncoder();const key=await crypto.subtle.importKey('raw',bytes.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes.encode(message)));
 const hex=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');let diff=0;
 for(let i=0;i<hex.length;i++)diff|=hex.charCodeAt(i)^signature.toLowerCase().charCodeAt(i);return diff===0;
}

// Constant-time comparison for the service-role bearer. A plain `!==` leaks
// length and the matching-prefix position through timing; submit-landing-lead
// already compares this way, so the payments path now matches it.
export function sameSecret(given:string,expected:string){
 if(!expected||typeof given!=='string'||given.length!==expected.length)return false;
 let diff=0;for(let i=0;i<given.length;i++)diff|=given.charCodeAt(i)^expected.charCodeAt(i);
 return diff===0;
}
