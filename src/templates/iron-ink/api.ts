import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { IRON_INK_CATEGORIES, ironInkDurationMinutes } from '../../lib/ironInk';
import type { SalonProfile,SalonService,Stylist } from '../../types';
import type { InkAvailableSlot,InkSitePayload } from './database.types';

const phoneSchema=z.string().trim().min(10).max(24).refine(value=>value.replace(/\D/g,'').length>=10&&value.replace(/\D/g,'').length<=15,'Enter a valid phone number.');
const emailSchema=z.string().trim().email().max(254).or(z.literal(''));
export const inkBookingSchema=z.object({
  siteId:z.string().uuid(),branchId:z.string().uuid().optional(),customerName:z.string().trim().min(2).max(120),phone:phoneSchema,email:emailSchema,
  categoryId:z.string().uuid(),artistId:z.string().uuid(),bookingDate:z.string().date(),startTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  birthDate:z.string().date(),sizeCm:z.number().positive().max(300).nullable().optional(),placement:z.string().trim().max(200).default(''),description:z.string().trim().max(1000).default(''),referenceImages:z.array(z.string().max(512)).max(5).default([]),
});
export const inkEnquirySchema=z.object({siteId:z.string().uuid(),name:z.string().trim().min(2).max(120),phone:phoneSchema.or(z.literal('')),email:emailSchema,message:z.string().trim().min(2).max(2000)});
export type InkBookingInput=z.input<typeof inkBookingSchema>;
export type InkEnquiryInput=z.input<typeof inkEnquirySchema>;

export async function getTemplate12Site(siteId:string){
  const {data,error}=await supabase.rpc('get_template12_site',{p_site_id:siteId});
  if(error)throw error;
  return data as InkSitePayload|null;
}
export async function getTemplate12SiteBySlug(slug:string){
  if(!slug)return null;
  const {data,error}=await supabase.rpc('get_template12_site_by_slug',{p_slug:slug});
  if(error)throw error;
  return data as InkSitePayload|null;
}
export async function getInkAvailableSlots(siteId:string,artistId:string,date:string,durationMin=60,branchId?:string){
  const {data,error}=await (branchId
    ? supabase.rpc('get_branch_available_slots',{p_site_id:siteId,p_artist_id:artistId,p_date:date,p_duration_min:durationMin,p_branch_id:branchId})
    : supabase.rpc('get_available_slots',{p_site_id:siteId,p_artist_id:artistId,p_date:date,p_duration_min:durationMin}));
  if(error)throw error;
  return (data||[]) as InkAvailableSlot[];
}
export async function createInkBooking(input:InkBookingInput){
  const value=inkBookingSchema.parse(input);
  const {data,error}=await (value.branchId ? supabase.rpc('create_branch_booking',{
    p_site_id:value.siteId,p_branch_id:value.branchId,p_customer_name:value.customerName,p_phone:value.phone,p_email:value.email,
    p_category_id:value.categoryId,p_artist_id:value.artistId,p_booking_date:value.bookingDate,p_start_time:value.startTime,
    p_customer_birth_date:value.birthDate,p_size_cm:value.sizeCm??null,p_placement:value.placement,p_description:value.description,p_reference_images:value.referenceImages,
  }) : supabase.rpc('create_booking',{
    p_site_id:value.siteId,p_customer_name:value.customerName,p_phone:value.phone,p_email:value.email,
    p_category_id:value.categoryId,p_artist_id:value.artistId,p_booking_date:value.bookingDate,p_start_time:value.startTime,
    p_customer_birth_date:value.birthDate,p_size_cm:value.sizeCm??null,p_placement:value.placement,p_description:value.description,p_reference_images:value.referenceImages,
  }));
  if(error)throw error;
  return data;
}
export async function submitInkEnquiry(input:InkEnquiryInput){
  const value=inkEnquirySchema.parse(input);
  const {data,error}=await supabase.rpc('submit_ink_enquiry',{p_site_id:value.siteId,p_name:value.name,p_phone:value.phone,p_email:value.email,p_message:value.message});
  if(error)throw error;
  return data as string;
}
export async function uploadInkReference(siteId:string,file:File){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Choose a JPG, PNG or WebP image under 5 MB.');
  const extension=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
  const path=`${siteId}/${crypto.randomUUID()}.${extension}`;
  const {error}=await supabase.storage.from('ink-references').upload(path,file,{contentType:file.type,upsert:false});
  if(error)throw error;
  return path;
}
export async function ensureTemplate12Seeded(){
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)return null;
  const {error:ensureError}=await supabase.rpc('studioflow_ensure_account',{p_ref:null});
  if(ensureError)throw ensureError;
  const {data,error}=await supabase.rpc('seed_template12',{p_site_id:user.id});
  if(error)throw error;
  return data;
}

/** Publish the existing workspace projection and its Template 12 normalized data in lockstep. */
export async function syncIronInkWorkspace(siteId:string,profile:SalonProfile,services:SalonService[],stylists:Stylist[],galleryUrls:string[]=[]){
  const savedCategories=profile.ironInk?.categories||[];
  const categories=[
    ...IRON_INK_CATEGORIES.map(category=>savedCategories.find(saved=>saved.slug===category.slug)||category),
    ...savedCategories.filter(saved=>!IRON_INK_CATEGORIES.some(category=>category.slug===saved.slug)),
  ];
  const serviceFor=(slug:string,name:string)=>services.find(service=>service.id===`ii-${slug}`||service.category===name);
  const {error:settingsError}=await supabase.from('ink_studio_settings').upsert({
    site_id:siteId,template_key:'iron-ink',studio_name:profile.businessName,tagline:profile.tagline||'Your Story. Our Ink.',logo_url:profile.logoUrl||'',
    brand_color:profile.customAccentColor||'#E11D48',phone:profile.phone||'',whatsapp:profile.whatsapp||'',email:profile.email||'',address:[profile.address,profile.city,profile.postalCode].filter(Boolean).join(', '),
    map_url:profile.latitude&&profile.longitude?`https://maps.google.com/?q=${profile.latitude},${profile.longitude}`:'',
    timings:{mon:profile.workingHoursMonFri||'11:00-20:00',tue:profile.workingHoursTue||profile.workingHoursMonFri||'11:00-20:00',wed:profile.workingHoursMonFri||'11:00-20:00',thu:profile.workingHoursMonFri||'11:00-20:00',fri:profile.workingHoursMonFri||'11:00-20:00',sat:profile.workingHoursSat||'11:00-20:00',sun:profile.workingHoursSun||'by-appointment'},
    socials:{instagram:profile.instagramHandle||'',facebook:profile.facebookPage||'',youtube:profile.youtubeChannel||'',tiktok:profile.tiktokProfile||''},deposit_amount:profile.ironInk?.bookingDeposit??1000,min_age:18,hero_images:[profile.ironInk?.heroImage||profile.coverImageUrl||''].filter(Boolean),
  },{onConflict:'site_id'});
  if(settingsError)throw settingsError;
  const categoryRows=categories.map((category,index)=>{const service=serviceFor(category.slug,category.name);return{site_id:siteId,template_key:'iron-ink',slug:category.slug,name:category.name,group:index<21?'tattoo_style':index<28?'body_art':'extra',description:category.description,image_url:service?.imageUrl||category.image,starting_price:service?.price??category.price,duration_min:service?.durationMinutes??ironInkDurationMinutes(category.duration),duration_label:category.duration,is_active:category.enabled,sort_order:index+1};});
  const {error:categoryError}=await supabase.from('ink_categories').upsert(categoryRows,{onConflict:'site_id,slug'});
  if(categoryError)throw categoryError;
  const artistRows=stylists.map((artist,index)=>({site_id:siteId,template_key:'iron-ink',name:artist.name,photo_url:artist.avatarUrl||'',bio:artist.bio||artist.role||'',specialties:artist.specialties||[],instagram:'',experience_years:artist.experienceYears||0,is_active:artist.status!=='Inactive',sort_order:index+1}));
  if(artistRows.length){const {error}=await supabase.from('ink_artists').upsert(artistRows,{onConflict:'site_id,name'});if(error)throw error;}
  const categoryIds=(await supabase.from('ink_categories').select('id,slug').eq('site_id',siteId)).data||[];
  const portfolioRows=galleryUrls.filter(Boolean).map((url,index)=>({site_id:siteId,template_key:'iron-ink',category_id:categoryIds[index%Math.max(categoryIds.length,1)]?.id||null,image_url:url,title:`Studio portfolio ${index+1}`,placement:'Custom placement',is_featured:index<4,is_published:true,sort_order:index+1}));
  if(portfolioRows.length){const {error}=await supabase.from('ink_portfolio').upsert(portfolioRows,{onConflict:'site_id,image_url,title'});if(error)throw error;}
  return {settings:settingsError===null,categories:categoryRows.length,artists:artistRows.length,portfolio:portfolioRows.length};
}
