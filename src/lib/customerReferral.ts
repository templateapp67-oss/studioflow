const KEY='nexora_customer_referral';
const valid=(code:string)=>/^[A-Z0-9-]{6,32}$/.test(code);
export function customerReferralLink(code:string,origin=location.origin){const url=new URL('/?app=1',origin);if(valid(code.trim().toUpperCase())){url.searchParams.set('auth','signup');url.searchParams.set('customer_ref',code.trim().toUpperCase())}return url.href}
export function captureCustomerReferral(){const params=new URLSearchParams(location.search);const code=(params.get('customer_ref')||(params.has('app')?params.get('ref'):'')||'').trim().toUpperCase();try{if(valid(code)){localStorage.setItem(KEY,JSON.stringify({code,expires:Date.now()+30*86400000}));return code}const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&saved.expires>Date.now()&&valid(saved.code))return saved.code;localStorage.removeItem(KEY)}catch{}return valid(code)?code:''}
export function clearCustomerReferral(){try{localStorage.removeItem(KEY)}catch{}const url=new URL(location.href);url.searchParams.delete('customer_ref');if(url.searchParams.get('auth')==='signup')url.searchParams.delete('auth');if(url.searchParams.has('app'))url.searchParams.delete('ref');history.replaceState(null,'',url)}

export function rememberCustomerReferral(code:string){clearCustomerReferral();const normalized=code.trim().toUpperCase();try{if(valid(normalized))localStorage.setItem(KEY,JSON.stringify({code:normalized,expires:Date.now()+30*86400000}))}catch{}window.dispatchEvent(new Event('nexora-referral-changed'))}

export function isCustomerInviteEntry(){const p=new URLSearchParams(location.search);return p.has('app')&&!!(p.get('customer_ref')||p.get('ref'))&&!p.has('recovery')}
