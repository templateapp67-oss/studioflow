import type {SalonProfile} from '../types';
import {websiteSections} from './websiteContent';
export type HeaderLinkId='home'|'services'|'packages'|'gallery'|'about'|'contact'|'bookings';
export type HeaderLinkSetting={id:HeaderLinkId;enabled:boolean};
export const HEADER_LINKS:[HeaderLinkId,string,string,string][]=[
 ['home','Home','salon-home','hero'],['services','Services','services-section','services'],['packages','Packages','salon-packages','packages'],['gallery','Gallery','salon-lookbook','gallery'],['about','About','salon-about','about'],['contact','Contact','salon-location','location'],['bookings','My Bookings','','bookings']
];
export function headerSettings(profile:SalonProfile):HeaderLinkSetting[]{
 const result:HeaderLinkSetting[]=[],seen=new Set<string>();
 if(Array.isArray(profile.headerNavigation))for(const value of profile.headerNavigation){if(value&&HEADER_LINKS.some(([id])=>id===value.id)&&!seen.has(value.id)){result.push({id:value.id,enabled:value.enabled!==false});seen.add(value.id);}}
 for(const [id] of HEADER_LINKS)if(!seen.has(id))result.push({id,enabled:true});
 return result;
}
export function headerLinks(profile:SalonProfile){
 const sections=websiteSections(profile);
 return headerSettings(profile).filter(item=>item.enabled).flatMap(item=>{
  const [id,label,target,section]=HEADER_LINKS.find(([id])=>id===item.id)!;
  if(id!=='home'&&!sections[section])return [];
  return [{id,label,href:id==='bookings'?`/?customer=1&return=${encodeURIComponent(profile.subdomain||'')}`:`#${target}`}];
 });
}
