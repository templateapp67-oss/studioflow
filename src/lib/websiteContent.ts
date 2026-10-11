import type { SalonProfile } from '../types';
export const WEBSITE_SECTIONS = {header:true,hero:true,metrics:true,about:true,services:true,stylists:true,testimonials:true,gallery:true,location:true,whatsappFloat:true,videos:true,promo:true,social:true,loyalty:true,policies:true};
export function socialUrl(value: string | undefined, platform: string) {
  const raw=(value||'').trim();if(!raw)return '';
  if (/^https?:\/\//i.test(raw)) { try { const url=new URL(raw);return ['http:','https:'].includes(url.protocol)?url.href:''; } catch { return ''; } }
  if (raw.includes(':'))return '';
  if (/^(www\.)?(instagram|facebook|youtube|tiktok)\.com\//i.test(raw))return `https://${raw}`;
  const handle=raw.replace(/^@/,'');return /^[\w.\-]+$/.test(handle)?`https://${platform}.com/${platform==='youtube'||platform==='tiktok'?'@':''}${handle}`:'';
}
export function websiteSections(profile: SalonProfile) { return {...WEBSITE_SECTIONS,...profile.websiteSections}; }
