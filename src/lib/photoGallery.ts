import type {SalonProfile,BusinessTypeId} from '../types';
import {CATEGORY_STANDARDIZED_DATA} from '../templateData';
import {secureMediaUrl} from './socialVideoSource';
export const PHOTO_CATEGORIES=['Hair','Bridal','Skin','Nails','Men','Spa','Tattoo'] as const;
export type PhotoCategory=typeof PHOTO_CATEGORIES[number];
export type SalonGalleryPhoto={id:string;category:PhotoCategory;url:string;title:string;isDemo:boolean};
export const defaultGalleryCategory=(type:BusinessTypeId):PhotoCategory=>type==='tattoo_studio'?'Tattoo':type==='barber'?'Men':type==='nail_studio'?'Nails':['bridal_lounge','makeup_studio'].includes(type)?'Bridal':['skincare_clinic','beauty_parlour','lash_brow'].includes(type)?'Skin':['massage_wellness','ayurvedic_spa','hair_spa'].includes(type)?'Spa':'Hair';
export function standardGallery(type:BusinessTypeId='hair_salon'):SalonGalleryPhoto[]{return CATEGORY_STANDARDIZED_DATA[type].gallery.filter(p=>!p.url.includes('1517832606589')).slice(0,5).map((photo,i)=>({id:`template-gallery-${type}-${i+1}`,category:defaultGalleryCategory(type),url:photo.url,title:photo.title,isDemo:true}));}
const allDemoUrls=new Set(Object.values(CATEGORY_STANDARDIZED_DATA).flatMap(t=>t.gallery.map(p=>p.url)));
export function photoGallery(profile:SalonProfile,gallery:string[]=[]):SalonGalleryPhoto[]{
 if(profile.photoGalleryInitialized){const ids=new Set<string>();const saved=(Array.isArray(profile.photoGallery)?profile.photoGallery:[]).filter(photo=>photo&&typeof photo.id==='string'&&!ids.has(photo.id)&&!!(secureMediaUrl(photo.url)||allDemoUrls.has(photo.url))&&PHOTO_CATEGORIES.includes(photo.category)&&!!ids.add(photo.id)).map(photo=>({...photo,url:secureMediaUrl(photo.url)||photo.url,title:String(photo.title||photo.category+' photo'),isDemo:photo.isDemo===true}));
  // Upgrade the old six-category samples, retaining real photos and intentional deletions.
  if(profile.photoGalleryType===profile.businessType)return saved;
  const personal=saved.filter(p=>!p.isDemo);
  if(!profile.photoGalleryType&&!saved.some(p=>p.isDemo))return personal;
  return [...standardGallery(profile.businessType),...personal];
 }
 // Existing personal photos survive this one-time upgrade; old samples are replaced by five images from the selected template.
 const seen=new Set<string>();const personal=gallery.filter(url=>secureMediaUrl(url)&&!allDemoUrls.has(url)&&!seen.has(url)&&!!seen.add(url));
 return [...standardGallery(profile.businessType),...personal.map((url,i)=>({id:`existing-gallery-${i+1}`,category:defaultGalleryCategory(profile.businessType),url,title:`Salon photo ${i+1}`,isDemo:false}))];
}
export const withPhotoGallery=(profile:SalonProfile,photos:SalonGalleryPhoto[]):SalonProfile=>({...profile,photoGalleryInitialized:true,photoGalleryType:profile.businessType,photoGallery:photos,demoGalleryInitialized:true});
