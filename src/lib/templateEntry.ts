import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { INITIAL_SALON_PROFILE } from '../mockData';
import { applyTemplateDesign } from './templateSelection';
import { normalizeWorkspace } from './normalizeWorkspace';
import type { CategoryTemplateConfig } from '../types';
const aliases:Record<string,string>={hair:'hair_salon',barber:'barber',spa:'hair_spa',nails:'nail_studio',tattoo:'tattoo_studio',beauty:'beauty_parlour',makeup:'makeup_studio','08':'makeup_studio','template-08':'makeup_studio','vogue-noir':'makeup_studio',voguenoir:'makeup_studio','09':'massage_wellness','template-09':'massage_wellness','bodhi-tree':'massage_wellness',bodhitree:'massage_wellness',massage:'massage_wellness',wellness:'massage_wellness','10':'hair_coloring','template-10':'hair_coloring','prism-chroma':'hair_coloring',prismchroma:'hair_coloring','hair-coloring':'hair_coloring',haircoloring:'hair_coloring',prism:'hair_coloring','11':'bridal_lounge','template-11':'bridal_lounge','shringaar':'bridal_lounge','shringaar-royal':'bridal_lounge','shringaarroyal':'bridal_lounge','bridal':'bridal_lounge','bridal-lounge':'bridal_lounge','bridal_lounge':'bridal_lounge','roop-mahal-bridal':'bridal_lounge','13':'lash_brow','template-13':'lash_brow','template 13':'lash_brow','arch-flutter':'lash_brow','archflutter':'lash_brow','arch & flutter':'lash_brow','lash-brow':'lash_brow','lashbrow':'lash_brow'};
export function requestedTemplate(search:string):CategoryTemplateConfig|null {
 const query=new URLSearchParams(search);const rawExplicit=(query.get('template')||'').trim();
 const explicitAlias=Object.hasOwn(aliases,rawExplicit.toLowerCase())?aliases[rawExplicit.toLowerCase()]:rawExplicit;
 const categoryKey=(query.get('category')||'').toLowerCase();
 const id=explicitAlias||(Object.hasOwn(aliases,categoryKey)?aliases[categoryKey]:'');
 return id&&Object.hasOwn(CATEGORY_TEMPLATES,id)?CATEGORY_TEMPLATES[id]:null;
}
export function developmentTemplateForSiteSlug(slug:string,isDevelopment:boolean):CategoryTemplateConfig|null {
 if(!isDevelopment)return null;
 const key=slug.trim().toLowerCase().replace(/[^a-z0-9]/g,'');
 if(!key)return null;
 const lower=slug.trim().toLowerCase();
 const alias=(Object.hasOwn(aliases,lower)?aliases[lower]:undefined) || (key === 'keshprakritihairspa' ? 'hair_spa' : key === 'voguenoirmakeupstudio' || key === 'voguenoir' ? 'makeup_studio' : key === 'prismchroma' || key === 'prismchromahaircoloratelier' ? 'hair_coloring' : key === 'shringaarroyal' || key === 'shringaarroyalindianbridallounge' || key === 'shringaar' || key === 'shringaarroyalbridallounge' ? 'bridal_lounge' : undefined);
 if(alias&&Object.hasOwn(CATEGORY_TEMPLATES,alias))return CATEGORY_TEMPLATES[alias];
 return Object.values(CATEGORY_TEMPLATES).find(template=>{
  const id=template.id.toLowerCase().replace(/[^a-z0-9]/g,'');
  const title=template.title.toLowerCase().replace(/[^a-z0-9]/g,'');
  const shortName=template.shortName.toLowerCase().replace(/[^a-z0-9]/g,'');
  return key===id||key===title||key===shortName||(key.length>=7&&(title.startsWith(key)||key.startsWith(title)));
 })||null;
}
export function templateDraft(template:CategoryTemplateConfig){
 return normalizeWorkspace({profile:{...applyTemplateDesign({...INITIAL_SALON_PROFILE,tagline:'',about:'',coverImageUrl:''},template),businessName:template.title,ownerName:template.ownerName,ownerPhotoUrl:template.ownerPhotoUrl,city:template.defaultCity,address:template.defaultAddress,postalCode:template.defaultPostalCode,phone:'',whatsapp:'',email:'',subdomain:''},services:template.services,stylists:template.stylists});
}
