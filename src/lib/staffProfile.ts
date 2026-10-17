import type {BusinessTypeId} from '../types';
export const STAFF_TITLES:Record<BusinessTypeId,string[]>={
 hair_salon:['Hair Stylist','Senior Hair Stylist','Hair Dresser'],barber:['Barber','Senior Barber','Beard Specialist'],unisex_salon:['Hair Stylist','Senior Stylist','Beauty Expert'],beauty_parlour:['Beauty Expert','Senior Makeup Artist','Skin Expert'],nail_studio:['Nail Technician','Senior Nail Artist','Pedicure Specialist'],hair_spa:['Hair Spa Therapist','Scalp Care Specialist','Hair Treatment Specialist'],skincare_clinic:['Skin Expert','Facial Therapist','Aesthetician'],makeup_studio:['Makeup Artist','Senior Makeup Artist','Makeover Specialist'],massage_wellness:['Massage Therapist','Spa Therapist','Wellness Therapist'],hair_coloring:['Hair Colorist','Senior Color Specialist','Balayage Specialist'],bridal_lounge:['Bridal Makeup Artist','Senior Makeup Artist','Bridal Hair Stylist'],tattoo_studio:['Tattoo Artist','Senior Tattoo Artist','Body Art Specialist'],lash_brow:['Lash Technician','Brow Artist','Lash Extension Specialist'],ayurvedic_spa:['Spa Therapist','Ayurvedic Therapist','Panchakarma Therapist']};
export const validStaffUrl=(url:string)=>{try{return ['https:','http:'].includes(new URL(url).protocol)}catch{return false}};
export function staffCrop(w:number,h:number){if(w<=0||h<=0||!Number.isFinite(w*h)||w*h>60_000_000)throw new Error('Choose a photo under 60 megapixels.');const side=Math.min(w,h);return {x:(w-side)/2,y:(h-side)/2,side};}
export async function prepareStaffPhoto(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP photo.');
 if(file.size>20*1024*1024)throw new Error('Choose a photo smaller than 20 MB.');
 const url=URL.createObjectURL(file);
 try{const img=new Image();await new Promise<void>((ok,no)=>{img.onload=()=>ok();img.onerror=()=>no(new Error('Cannot open this photo. Try another image.'));img.src=url});
 const {x,y,side}=staffCrop(img.naturalWidth,img.naturalHeight);const c=document.createElement('canvas');c.width=640;c.height=640;const ctx=c.getContext('2d');if(!ctx)throw new Error('Photo resizing unavailable.');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,640,640);ctx.drawImage(img,x,y,side,side,0,0,640,640);const blob=await new Promise<Blob>((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('Photo resizing failed.')),'image/jpeg',.88));return new File([blob],'staff-profile.jpg',{type:'image/jpeg'});
 }finally{URL.revokeObjectURL(url)}
}
