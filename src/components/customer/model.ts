export type Service={id:string;name:string;category?:string;price:number;durationMinutes:number;description?:string;imageUrl?:string};
export type Stylist={workGallery?:import('../../types').StaffWorkPhoto[];expertiseServiceIds?:string[];experienceYears?:number;bio?:string;status?:string;id:string;name:string;role?:string;avatarUrl?:string;specialties?:string[];assignedServices?:string[];rating?:number};
export type Salon={slug:string;owner_id:string;demoTemplateId?:string;content:{profile:any;services?:Service[];stylists?:Stylist[];gallery?:string[];policies?:Record<string,unknown>;loyaltyConfig?:any}};
export type Booking={id:string;owner_id:string;status:string;starts_at?:string;ends_at?:string;hold_expires_at?:string;payload:any};
export type Slot={time:string;label:string;stylistId:string};
export const menu=(s:Salon)=>Array.isArray(s.content.services)?s.content.services:[];
export const staff=(s:Salon)=>Array.isArray(s.content.stylists)?s.content.stylists:[];
export const rupees=(n:unknown)=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
export const starting=(s:Salon)=>{const p=menu(s).map(x=>Number(x.price)).filter(Number.isFinite);return p.length?Math.min(...p):null;};
export const salonLink=(slug:string)=>(typeof location==='undefined'?'':location.origin)+'/?app=1&site='+encodeURIComponent(slug);
export const istDate=(offset=0)=>{const now=new Date(Date.now()+offset*86400000);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);};
export const dateLabel=(date:string)=>new Date(date+'T12:00:00+05:30').toLocaleDateString('en-IN',{day:'numeric',month:'short',weekday:'short'});
export const advance=(amount:number)=>Math.ceil(Math.round(amount*100)/4)/100;
export function coordinates(s:Salon):[number,number]|null{const p=s.content.profile;if(p.latitude==null||p.longitude==null)return null;const lat=Number(p.latitude),lon=Number(p.longitude);return Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180?[lat,lon]:null;}
export function distanceFrom(point:[number,number]|null,s:Salon){const c=coordinates(s);if(!point||!c)return Infinity;const r=(v:number)=>v*Math.PI/180;const a=Math.sin(r(c[0]-point[0])/2)**2+Math.cos(r(point[0]))*Math.cos(r(c[0]))*Math.sin(r(c[1]-point[1])/2)**2;return 12742*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));}
export const directions=(s:Salon)=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([s.content.profile.address,s.content.profile.city].filter(Boolean).join(', '));
export async function shareLink(url:string,title:string,text?:string){if(navigator.share)await navigator.share({url,title,text});else {await navigator.clipboard.writeText([text,url].filter(Boolean).join('\n'));return 'Link copied';}}
export function message(error:unknown){return error instanceof Error?error.message:typeof (error as any)?.message==='string'?(error as any).message:'Please check your connection and try again.';}
