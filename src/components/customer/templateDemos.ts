import {CATEGORY_TEMPLATES} from '../../categoryTemplates';
import {upgradeBeautyParlourTemplate} from '../../lib/roopMahalReference';
import {upgradeNailStudioTemplate} from '../../lib/pinkyNails';
import {upgradeLashBrowCustomerTemplate} from '../../lib/archFlutter';
import type {CustomerTemplate} from './useCustomerCatalog';
import {demoSalonOffers} from '../../lib/salonOffers';
import {isSalon, type Salon} from './model';

export const DEMO_TEMPLATE_PREFIX='demo-template-';
export const isTemplateDemo=(salon:Salon)=>!!salon.demoTemplateId;
export const templateDemoWebsite=(salon:Salon)=>'/?template='+encodeURIComponent(salon.demoTemplateId||'');

/** Published salons always win, independently for each exact template category. */
export function withTemplateDemos(published:Salon[],templates:CustomerTemplate[]):Salon[]{
 const real=(Array.isArray(published)?published:[]).filter(isSalon).filter(s=>!isTemplateDemo(s));
 const occupied=new Set(real.map(s=>s.content.profile.businessType));
 const seen=new Set<string>();
 const demos=templates.flatMap(rawMeta=>{
  const meta=upgradeLashBrowCustomerTemplate(upgradeNailStudioTemplate(upgradeBeautyParlourTemplate(rawMeta)),CATEGORY_TEMPLATES.lash_brow);
  const t=Object.hasOwn(CATEGORY_TEMPLATES,meta.id)?CATEGORY_TEMPLATES[meta.id]:null;
  if(!t||occupied.has(meta.id)||seen.has(meta.id))return [];
  seen.add(meta.id);
  return [{slug:DEMO_TEMPLATE_PREFIX+meta.id,owner_id:'template:'+meta.id,demoTemplateId:meta.id,content:{
   profile:{businessName:meta.title||t.title,businessType:t.id,tagline:meta.tagline||t.tagline,
    about:t.about,city:meta.defaultCity||t.defaultCity,coverImageUrl:meta.coverImageUrl||t.coverImageUrl,promoCampaign:meta.demoOffer,promoOffers:demoSalonOffers(t.id)},
   services:meta.services?.length?meta.services:t.services,stylists:(meta.stylists?.length?meta.stylists:t.stylists).map(s=>({...s,rating:undefined})),gallery:[],
  }} satisfies Salon];
 });
 return [...real,...demos];
}
