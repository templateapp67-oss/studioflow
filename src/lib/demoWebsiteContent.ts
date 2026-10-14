import {CATEGORY_TEMPLATES} from '../categoryTemplates';
import type {ReviewCarouselItem} from '../components/ReviewCarousel';
import {CATEGORY_STANDARDIZED_DATA} from '../templateData';
import type {Testimonial} from '../templateData';
import type {BusinessTypeId,SalonProfile} from '../types';
export function demoTestimonials(type:BusinessTypeId):Testimonial[]{return (CATEGORY_STANDARDIZED_DATA[type]?.reviews||[]).slice(0,3).map((review,index)=>({...review,id:`demo-review-${type}-${index+1}`,isDemo:true,verified:false,date:'Demo'}));}
export function clientExperiences(profile:SalonProfile):Testimonial[]{
 if(profile.websiteTestimonials?.length)return profile.websiteTestimonials;
 return profile.demoTestimonialsInitialized?[]:demoTestimonials(profile.businessType);
}
export function lookbookPhotos(profile:SalonProfile,gallery:string[]=[]):string[]{
 if(gallery.length){
  if(profile.demoGalleryType&&profile.demoGalleryType!==profile.businessType&&gallery.every(url=>CATEGORY_STANDARDIZED_DATA[profile.demoGalleryType]?.gallery.some(photo=>photo.url===url)))return CATEGORY_STANDARDIZED_DATA[profile.businessType].gallery.slice(0,6).map(photo=>photo.url);
  return gallery;
 }
 return profile.demoGalleryInitialized?[]:(CATEGORY_STANDARDIZED_DATA[profile.businessType]?.gallery||[]).slice(0,6).map(photo=>photo.url);
}
export function isDemoLookbook(profile:SalonProfile,gallery:string[]){return gallery.length>0&&gallery.every(url=>CATEGORY_STANDARDIZED_DATA[profile.businessType]?.gallery.some(photo=>photo.url===url));}


// Each category has ten distinct sample stories. Real submissions take priority.
export function tenDemoTestimonials(type:BusinessTypeId):Testimonial[]{
 const template=CATEGORY_TEMPLATES[type]||CATEGORY_TEMPLATES.hair_salon;
 const names=['Aditi Sharma','Rohan Mehta','Neha Kapoor','Arjun Singh','Kavya Rao','Sameer Joshi','Isha Verma','Dev Patel','Meera Nair','Nikhil Shah'];
 const stories=[
  'The consultation helped me explain exactly what I wanted. I appreciated the careful attention throughout the appointment.',
  'Booking was straightforward and my appointment started on time. The team explained each step clearly.',
  'A calm studio and a thoughtful specialist made this a relaxing visit. The finishing touches were especially lovely.',
  'I tried this service for the first time. The team listened to my questions and helped me feel comfortable.',
  'The specialist took time to understand my preferences. I left with useful advice for looking after the result at home.',
  'Clear pricing and a welcoming reception made the whole visit easy. I would happily book another appointment.',
  'I appreciated the clean setup and the care taken with every detail. The appointment never felt rushed.',
  'The team helped me choose an option that suited my routine. The service felt personal from start to finish.',
  'I booked ahead of a special occasion and enjoyed the attentive preparation. Everything was explained before we began.',
  'A friendly welcome, a comfortable appointment and a polished finish. It was a pleasant way to take some time for myself.'
 ];
 return names.map((name,index)=>({id:`demo-distinct-${type}-${index+1}`,name,rating:index%4===1?4:5,comment:stories[index],serviceName:template.services[index%template.services.length].name,location:template.defaultCity,avatarUrl:'',date:'Demo',isDemo:true,verified:false}));
}
export function tenClientExperiences(type:BusinessTypeId,items:ReviewCarouselItem[]):ReviewCarouselItem[]{
 const ids=new Set<string>(),comments=new Set<string>();
 const distinct:ReviewCarouselItem[]=[];
 // Replace older sample sets while retaining owner-curated and customer stories.
 for(const item of [...items.filter(item=>!item.isDemo),...tenDemoTestimonials(type)]){
  const comment=item.comment.trim().toLowerCase();
  if(ids.has(item.id)||comments.has(comment))continue;
  ids.add(item.id);comments.add(comment);distinct.push(item);
  if(distinct.length===10)break;
 }
 return distinct;
}
