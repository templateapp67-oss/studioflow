import {CATEGORY_TEMPLATES} from '../categoryTemplates';
import type {BusinessTypeId,SalonService} from '../types';
const normalize=(value:string)=>value.trim().replace(/\s+/g,' ').toLowerCase();
/** Staff assignments use actual catalogue IDs, restricted to the selected business template. */
export function staffBookingServices(services:SalonService[],type:BusinessTypeId):SalonService[]{
 const template=CATEGORY_TEMPLATES[type];if(!template)return [];
 const ownIds=new Set(template.services.map(s=>s.id));
 const ownNames=new Set(template.services.map(s=>normalize(s.name)));
 const categories=new Set([...template.subCategories,...template.services.map(s=>s.category)].map(normalize));
 const foreign=Object.values(CATEGORY_TEMPLATES).filter(t=>t.id!==type);
 const foreignIds=new Set(foreign.flatMap(t=>t.services.map(s=>s.id)));
 const foreignNames=new Set(foreign.flatMap(t=>t.services.map(s=>normalize(s.name))).filter(name=>!ownNames.has(name)));
 const seen=new Set<string>();
 return services.filter(service=>{
  const name=normalize(service.name),category=normalize(service.category);
  if(foreignIds.has(service.id)||foreignNames.has(name))return false;
  if(foreign.some(t=>service.id.startsWith('template-pkg-'+t.id+'-')||name.startsWith(normalize(t.shortName)+' ')))return false;
  if(ownIds.has(service.id)&&!categories.has(category))return false;
  const key=JSON.stringify([name,category,service.price,service.durationMinutes]);
  if(seen.has(key))return false;seen.add(key);return true;
 });
}
/** Empty selection means all eligible template services, never the mixed catalogue. */
export function templateStaffAssignments(selected:string[],services:SalonService[]):string[]{
 const valid=services.filter(s=>selected.includes(s.id)||selected.includes(s.name)).map(s=>s.id);
 return valid.length?valid:services.map(s=>s.id);
}

/** Explicit owner action only; preserve existing menu entries and their prices. */
export function addStaffCategoryMenu(services:SalonService[],type:BusinessTypeId):SalonService[]{
 const eligible=staffBookingServices(services,type),ids=new Set(services.map(s=>s.id));
 const missing=CATEGORY_TEMPLATES[type].services.filter(s=>!eligible.some(old=>normalize(old.name)===normalize(s.name)&&normalize(old.category)===normalize(s.category)));
 const added=missing.slice(0,Math.max(0,500-services.length)).map(s=>({...s,id:ids.has(s.id)?`staff-menu-${type}-${crypto.randomUUID()}`:s.id,origin:'template' as const}));
 return [...services,...added];
}
