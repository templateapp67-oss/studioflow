import type {CategoryTemplateConfig,SalonService} from '../types';
export const isPackage=(service:Pick<SalonService,'name'|'category'>)=>/package|combo|bundle/i.test(`${service.category} ${service.name}`);
/** Five category-specific starters, using only services offered by that template. */
export function packageStarters(template:CategoryTemplateConfig):SalonService[]{
 const services=template.services.filter(service=>!isPackage(service));
 const pairs=[[0,1],[0,2],[1,2],[2,3],[0,3]],titles=['Refresh Duo','Signature Care','Complete Ritual','Premium Pair','Self-care Combo'];
 return pairs.map(([a,b],index)=>{
  const first=services[a%services.length],second=services[b%services.length];
  return {id:`template-pkg-${template.id}-${index+1}`,name:`${template.shortName} ${titles[index]} Package`.slice(0,160),category:'Signature Packages',description:`Includes ${first.name} and ${second.name}. A coordinated ${template.shortName.toLowerCase()} visit. Starter package: ask the salon to confirm suitability and inclusions.`,price:Math.round(first.price+second.price),durationMinutes:Math.min(720,first.durationMinutes+second.durationMinutes),icon:first.icon||'spa',imageUrl:first.imageUrl,origin:'template',showDuration:true,...(template.id==='skincare_clinic'?{clinicDemoData:true,clinicServiceApproved:false,clinicPriceVerified:false,clinicFeeStatus:'unverified' as const,clinicPublicationStatus:'draft' as const}:{})};
 });
}
export function seedTemplatePackages(template:CategoryTemplateConfig):SalonService[]{
 const missing=Math.max(0,5-template.services.filter(isPackage).length);
 return [...template.services,...packageStarters(template).filter(item=>!template.services.some(s=>s.id===item.id)).slice(0,missing)];
}
