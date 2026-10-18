export type ComparisonPhoto={id:string;title:string;beforeUrl:string;afterUrl:string;category:'Hair'|'Lash'|'Brow';consented:boolean};
export type ReviewSource={mode:'off'|'link'|'curated'|'simulation';provider:'Google'|'Instagram';url:string;items:{id:string;name:string;text:string;rating:number}[]};
export type WebsiteLanguage='en'|'hi'|'hinglish';
export function reviewSourceUrl(raw:string,provider:'Google'|'Instagram'){try{const u=new URL(raw);if(u.protocol!=='https:')return '';const h=u.hostname.toLowerCase();return (provider==='Instagram'?h==='instagram.com'||h==='www.instagram.com':h==='g.page'||h==='maps.app.goo.gl'||h==='google.com'||h==='www.google.com'||h==='maps.google.com')?u.href:'';}catch{return '';}}
