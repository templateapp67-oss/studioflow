import type {BusinessTypeId,SalonService} from '../types';
import {CATEGORY_STANDARDIZED_DATA} from '../templateData';
import {barberServiceImage} from './barberReference';
import {roopMahalServiceImage} from './roopMahalReference';
import {pinkyNailsServiceImage} from './pinkyNails';
import {KESH_PRAKRITI_IMAGES,keshPrakritiServiceImage} from './keshPrakriti';
import {VOGUE_NOIR_IMAGES,vogueNoirServiceImage} from './vogueNoir';

/** Category-matched image templates shared by the editor and storefront. */
export function serviceImageTemplates(service:Pick<SalonService,'id'|'name'|'category'>,type:BusinessTypeId='hair_salon'):Array<{id:string;url:string;label:string}> {
 const text=`${service.category} ${service.name}`.toLowerCase();
 // Template 06 ships its own local spa photography, so hair-spa menu cards never
 // borrow unrelated stock portraits from another category.
 if(type==='hair_spa'){
  const local=Array.from(new Set([keshPrakritiServiceImage(service),KESH_PRAKRITI_IMAGES.sanctuary,KESH_PRAKRITI_IMAGES.botanical]));
  return local.slice(0,3).map((url,index)=>({id:`hair_spa-${index+1}`,url,label:`Image template ${index+1}`}));
 }
 if(type==='makeup_studio'){
  const local=Array.from(new Set([vogueNoirServiceImage({...service,imageUrl:''}),VOGUE_NOIR_IMAGES.services.bridal,VOGUE_NOIR_IMAGES.services.party,VOGUE_NOIR_IMAGES.services.airbrush]));
  return local.slice(0,3).map((url,index)=>({id:`makeup_studio-${index+1}`,url,label:`Image template ${index+1}`}));
 }
 let source: BusinessTypeId = type;
 if(/nail|manicure|pedicure/.test(text))source='nail_studio';
 else if(/lash|brow|thread/.test(text))source='lash_brow';
 else if(/facial|skin|bleach|d-tan|wax/.test(text))source='skincare_clinic';
 else if(/bridal|makeup|make-up/.test(text))source='makeup_studio';
 else if(/hair|cut|blow|keratin|balayage/.test(text))source='hair_salon';
 if(type==='barber')source='barber';
 if(type==='beauty_parlour')source='beauty_parlour';
 if(type==='nail_studio')source='nail_studio';
 const gallery=CATEGORY_STANDARDIZED_DATA[source].gallery.filter(p=>!p.url.includes('1517832606589'));
 const words=text.match(/[a-z]{4,}/g)||[];
 const ranked=gallery.map((p,index)=>({p,index,score:words.filter(word=>`${p.tag} ${p.title}`.toLowerCase().includes(word)).length})).sort((a,b)=>b.score-a.score||a.index-b.index);
 const urls=Array.from(new Set([...(type==='barber'?[barberServiceImage(text)]:type==='beauty_parlour'?[roopMahalServiceImage(service)]:type==='nail_studio'?[pinkyNailsServiceImage(service)]:[]),...ranked.map(item=>item.p.url)]));
 return urls.slice(0,3).map((url,index)=>({id:`${source}-${index+1}`,url,label:`Image template ${index+1}`}));
}
export function defaultServiceImage(service:Pick<SalonService,'id'|'name'|'category'>,type:BusinessTypeId='hair_salon'):string{return serviceImageTemplates(service,type)[0].url;}
export const servicePhotoUrl=(service:SalonService,type:BusinessTypeId='hair_salon')=>service.imageUrl||defaultServiceImage(service,type);
