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
  if(!ownIds.has(service.id)){
   if(foreignIds.has(service.id)||foreignNames.has(name))return false;
   if(foreign.some(t=>service.id.startsWith('template-pkg-'+t.id+'-')||name.startsWith(normalize(t.shortName)+' ')))return false;
   if(!categories.has(category))return false;
  }
  const key=JSON.stringify([name,category,service.price,service.durationMinutes]);
  if(seen.has(key))return false;seen.add(key);return true;
 });
}
/** Empty selection means all eligible template services, never the mixed catalogue. */
export function templateStaffAssignments(selected:string[],services:SalonService[]):string[]{
 const valid=services.filter(s=>selected.includes(s.id)||selected.includes(s.name)).map(s=>s.id);
 return valid.length?valid:services.map(s=>s.id);
}
