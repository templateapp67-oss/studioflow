import {CATEGORY_TEMPLATES} from '../categoryTemplates';
import type {SalonProfile,SalonService,CategoryTemplateConfig} from '../types';

export const MAX_SERVICES=500;
const STARTER_SERVICES=new Map(Object.values(CATEGORY_TEMPLATES).flatMap(template=>template.services).map(service=>[service.id,service]));
/** Keep inline edits consistent with the clinic verification state machine. */
export function updateInlineService<K extends 'name'|'description'|'price'|'durationMinutes'>(service:SalonService,key:K,value:SalonService[K],clinicContext:boolean):SalonService {
 if (service[key]===value) return service;
 if (key==='price' && (typeof value!=='number' || !Number.isFinite(value) || value<0)) return service;
 if (key==='durationMinutes' && (typeof value!=='number' || !Number.isInteger(value) || value<1 || value>720)) return service;
 const clinic=clinicContext || service.clinicServiceApproved!==undefined || service.clinicPriceVerified!==undefined;
 const details=key==='name'||key==='description';
 return {...service,[key]:value,origin:'custom',...(clinic ? {
  ...(details?{clinicServiceApproved:false,clinicPublicationStatus:'draft' as const,clinicServiceVerifiedBy:undefined,clinicServiceVerifiedAt:undefined}:{}),
  clinicPriceVerified:false,clinicFeeStatus:'unverified' as const,clinicFeeVerifiedBy:undefined,clinicFeeVerifiedAt:undefined,
 }: {})};
}
export function serviceValidation(service:Pick<SalonService,'name'|'category'|'description'|'price'|'durationMinutes'>,allowMissingPrice=false):string {
 if(!service.name.trim()||service.name.trim().length>160)return 'Enter a service name of 1–160 characters.';
 if(!service.category.trim()||service.category.trim().length>100)return 'Enter a category of 1–100 characters.';
 if(service.description.length>2000)return 'Keep the description within 2,000 characters.';
 if(!(allowMissingPrice && service.price===null) && (!Number.isFinite(service.price)||service.price<0||service.price>10000000||Math.abs(service.price*100-Math.round(service.price*100))>0.00001))return 'Enter a price from ₹0 to ₹1,00,00,000 with at most two decimal places.';
 if(!Number.isInteger(service.durationMinutes)||service.durationMinutes<1||service.durationMinutes>720)return 'Duration must be 1–720 whole minutes.';
 return '';
}
export function serviceOrigin(service:SalonService):'custom'|'template'{
 if(service.origin)return service.origin as 'custom'|'template';
 const original=STARTER_SERVICES.get(service.id);
 if(!original)return 'custom';
 return ['name','description','category','price','durationMinutes','popular','showDuration','imageUrl','imagePath'].every(key=>{
  const field=key as keyof SalonService;
  if(field==='showDuration')return (service[field]!==false)===(original[field]!==false);
  if(field==='popular')return !!service[field]===!!original[field];
  return service[field]===original[field];
 })?'template':'custom';
}
export function servicesForTemplate(services:SalonService[],profile:SalonProfile,template:CategoryTemplateConfig):SalonService[]{
 const seeded=()=>template.services.map(service=>({...service,origin:'template' as const}));
 if(!profile.serviceCatalogueInitialized&&!services.length)return seeded();
 // An intentionally empty or fully custom catalogue stays exactly as configured.
 if(!services.length||profile.businessType===template.id)return services;
 if(!services.some(service=>serviceOrigin(service)==='template'))return services;
 const custom=services.filter(service=>serviceOrigin(service)==='custom');
 const ids=new Set(custom.map(service=>service.id));
 return [...custom,...seeded().filter(service=>!ids.has(service.id)).slice(0,MAX_SERVICES-custom.length)];
}
