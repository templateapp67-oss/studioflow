import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { INITIAL_SALON_PROFILE } from '../mockData';
import { applyTemplateDesign } from './templateSelection';
import { normalizeWorkspace } from './normalizeWorkspace';
import type { CategoryTemplateConfig } from '../types';
const aliases:Record<string,string>={hair:'hair_salon',barber:'barber',spa:'hair_spa',nails:'nail_studio',tattoo:'tattoo_studio',beauty:'beauty_parlour'};
export function requestedTemplate(search:string):CategoryTemplateConfig|null {
 const query=new URLSearchParams(search);const explicit=query.get('template');
 const id=explicit||aliases[(query.get('category')||'').toLowerCase()];
 return id&&Object.hasOwn(CATEGORY_TEMPLATES,id)?CATEGORY_TEMPLATES[id]:null;
}
export function templateDraft(template:CategoryTemplateConfig){
 return normalizeWorkspace({profile:{...applyTemplateDesign({...INITIAL_SALON_PROFILE,tagline:'',about:'',coverImageUrl:''},template),businessName:template.title,ownerName:template.ownerName,ownerPhotoUrl:template.ownerPhotoUrl,city:template.defaultCity,address:template.defaultAddress,postalCode:template.defaultPostalCode,phone:'',whatsapp:'',email:'',subdomain:''},services:template.services,stylists:template.stylists});
}
