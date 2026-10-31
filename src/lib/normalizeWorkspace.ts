import {photoGallery} from './photoGallery';
import {headerSettings} from './headerNavigation';
import {serviceOrigin} from './serviceCatalogue';
import {clientExperiences,lookbookPhotos} from './demoWebsiteContent';
import { showcaseVideos } from './showcaseVideos';
import { INITIAL_SALON_PROFILE } from '../mockData';
import { DEFAULT_LOYALTY_CONFIG } from '../loyaltyData';
import { DEFAULT_EXTRAS } from './workspaceDefaults';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { isLegacyRoopStockCover, isLegacyRoopStockOwnerPhoto, isLegacyRoopStockTagline, upgradeLegacyBeautyParlourStylists } from './roopMahalReference';
import { isLegacyNailStudioStockImage, isLegacyNailStudioStockTagline } from './pinkyNails';
import { isLegacyMakeupStudioStockUrl, upgradeLegacyMakeupStudioStylists } from './vogueNoir';
import { isLegacyMassageWellnessStockUrl, upgradeLegacyMassageWellnessStylists } from './bodhiTree';
import { isLegacyHairColoringStockUrl, upgradeLegacyHairColoringStylists } from './prismChroma';
import { isLegacyBridalStockUrl, upgradeLegacyBridalStylists } from './shringaarRoyal';
import { isLegacyLashStockTagline, isLegacyLashStockUrl, upgradeLegacyLashBrowStylists } from './archFlutter';
import { seedSalonOffers } from './salonOffers';
import type { SalonProfile, SalonService, Stylist, ClientRecord } from '../types';
const record=(value:any):Record<string,any>=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
export function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
const list=(value:any)=>Array.isArray(value)?value.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)):[];
export function normalizeWorkspace(value:unknown, identity:Record<string,any>={}) {
 const draft=record(value);const raw=record(draft.profile);
 const base:SalonProfile={...INITIAL_SALON_PROFILE,businessName:identity.salon_name||'',ownerName:identity.full_name||'',phone:identity.phone_number||'',whatsapp:identity.whatsapp||'',email:identity.email||'',city:identity.city||'',postalCode:identity.postal_code||'',address:'',about:'',tagline:'',ownerPhotoUrl:'',subdomain:'',instagramHandle:'',requireDeposit:true,depositPercentage:25};
 const profile={...base,...raw,requireDeposit:true,depositPercentage:25};
 for(const [key,fallback] of Object.entries(base)) if(typeof fallback==='string'&&typeof profile[key]!=='string') profile[key]=fallback;
 if(!CATEGORY_TEMPLATES[profile.businessType])profile.businessType='hair_salon';
 if(profile.businessType==='beauty_parlour'){
  if(isLegacyRoopStockCover(profile.coverImageUrl))profile.coverImageUrl=CATEGORY_TEMPLATES.beauty_parlour.coverImageUrl;
  if(isLegacyRoopStockOwnerPhoto(profile.ownerPhotoUrl))profile.ownerPhotoUrl=CATEGORY_TEMPLATES.beauty_parlour.ownerPhotoUrl;
  if(isLegacyRoopStockTagline(profile.tagline))profile.tagline=CATEGORY_TEMPLATES.beauty_parlour.tagline;
 }
 if(profile.businessType==='nail_studio'){
  if(!profile.coverImageUrl||isLegacyNailStudioStockImage(profile.coverImageUrl))profile.coverImageUrl=CATEGORY_TEMPLATES.nail_studio.coverImageUrl;
  if(!profile.ownerPhotoUrl||isLegacyNailStudioStockImage(profile.ownerPhotoUrl))profile.ownerPhotoUrl=CATEGORY_TEMPLATES.nail_studio.ownerPhotoUrl;
  if(!profile.tagline||isLegacyNailStudioStockTagline(profile.tagline))profile.tagline=CATEGORY_TEMPLATES.nail_studio.tagline;
 }
 if(profile.businessType==='makeup_studio'){
  if(!profile.coverImageUrl||isLegacyMakeupStudioStockUrl(profile.coverImageUrl))profile.coverImageUrl=CATEGORY_TEMPLATES.makeup_studio.coverImageUrl;
  if(!profile.ownerPhotoUrl||isLegacyMakeupStudioStockUrl(profile.ownerPhotoUrl))profile.ownerPhotoUrl=CATEGORY_TEMPLATES.makeup_studio.ownerPhotoUrl;
 }
 if(profile.businessType==='massage_wellness'){
  if(!profile.coverImageUrl||isLegacyMassageWellnessStockUrl(profile.coverImageUrl))profile.coverImageUrl=CATEGORY_TEMPLATES.massage_wellness.coverImageUrl;
  if(!profile.ownerPhotoUrl||isLegacyMassageWellnessStockUrl(profile.ownerPhotoUrl))profile.ownerPhotoUrl=CATEGORY_TEMPLATES.massage_wellness.ownerPhotoUrl;
 }
 if(profile.businessType==='hair_coloring'){
  if(!profile.coverImageUrl||isLegacyHairColoringStockUrl(profile.coverImageUrl))profile.coverImageUrl=CATEGORY_TEMPLATES.hair_coloring.coverImageUrl;
  if(!profile.ownerPhotoUrl||isLegacyHairColoringStockUrl(profile.ownerPhotoUrl))profile.ownerPhotoUrl=CATEGORY_TEMPLATES.hair_coloring.ownerPhotoUrl;
 }
 if(profile.businessType==='bridal_lounge'){
  if(!profile.coverImageUrl||isLegacyBridalStockUrl(profile.coverImageUrl))profile.coverImageUrl=CATEGORY_TEMPLATES.bridal_lounge.coverImageUrl;
  if(!profile.ownerPhotoUrl||isLegacyBridalStockUrl(profile.ownerPhotoUrl))profile.ownerPhotoUrl=CATEGORY_TEMPLATES.bridal_lounge.ownerPhotoUrl;

 }
 // Template 13 (Arch & Flutter): workspaces saved from the old plain lash demo
 // keep their stock cover, owner portrait and tagline; an owner's own upload or
 // edited tagline is never replaced.
 if(profile.businessType==='lash_brow'){
  if(!profile.coverImageUrl||isLegacyLashStockUrl(profile.coverImageUrl))profile.coverImageUrl=CATEGORY_TEMPLATES.lash_brow.coverImageUrl;
  if(!profile.ownerPhotoUrl||isLegacyLashStockUrl(profile.ownerPhotoUrl))profile.ownerPhotoUrl=CATEGORY_TEMPLATES.lash_brow.ownerPhotoUrl;
  if(!profile.tagline||isLegacyLashStockTagline(profile.tagline))profile.tagline=CATEGORY_TEMPLATES.lash_brow.tagline;
  // Offers are ordinary editable records: a workspace that has never had an offer
  // list is seeded with the six bundled sample offers, while an owner's own list
  // — including an empty one after deleting every offer — is kept exactly as
  // saved, so the friendly empty state stays reachable.
  const savedOffers=seedSalonOffers(profile as SalonProfile);
  if(savedOffers)profile.promoOffers=savedOffers;
 }
 profile.socialVideos=showcaseVideos(profile as SalonProfile);profile.demoVideosInitialized=true;
 const loyalty=record(draft.loyaltyConfig),extras=record(draft.extras);
 profile.websiteTestimonials=clientExperiences(profile as SalonProfile);profile.demoTestimonialsInitialized=true;
 if(profile.photoGalleryInitialized){profile.photoGallery=photoGallery(profile as SalonProfile);profile.photoGalleryType=profile.businessType;}
 const savedGallery=profile.photoGalleryInitialized?photoGallery(profile as SalonProfile).map(p=>p.url):lookbookPhotos(profile as SalonProfile,Array.isArray(extras.gallery)?extras.gallery.filter(x=>typeof x==='string'&&x.trim()):[]);
 profile.demoGalleryInitialized=true;profile.demoGalleryType=profile.businessType;
 profile.headerNavigation=headerSettings(profile as SalonProfile);
 profile.serviceCatalogueInitialized=raw.serviceCatalogueInitialized===true||list(draft.services).length>0;
 const normalizedStylists=list(draft.stylists).map(s=>({...s,name:typeof s.name==='string'?s.name:'',role:typeof s.role==='string'?s.role:'',avatarUrl:typeof s.avatarUrl==='string'?s.avatarUrl:'',specialties:Array.isArray(s.specialties)?s.specialties.filter(x=>typeof x==='string'):[],rating:Number.isFinite(s.rating)?s.rating:0})) as Stylist[];
 return {...draft,profile:profile as SalonProfile,
  services:list(draft.services).map(s=>({...s,origin:serviceOrigin(s as SalonService),name:typeof s.name==='string'?s.name:'',description:typeof s.description==='string'?s.description:'',category:typeof s.category==='string'?s.category:'',price:Number.isFinite(s.price)?s.price:(s.price===null||profile.businessType==='skincare_clinic'?null:0),durationMinutes:Number.isFinite(s.durationMinutes)?s.durationMinutes:30})) as SalonService[],
  stylists:upgradeLegacyLashBrowStylists(upgradeLegacyHairColoringStylists(upgradeLegacyMassageWellnessStylists(upgradeLegacyMakeupStudioStylists(upgradeLegacyBeautyParlourStylists(normalizedStylists,profile.businessType),profile.businessType),profile.businessType),profile.businessType),profile.businessType),
  clients:list(draft.clients) as ClientRecord[],
  loyaltyConfig:{...DEFAULT_LOYALTY_CONFIG,...loyalty,tierThresholds:{...DEFAULT_LOYALTY_CONFIG.tierThresholds,...record(loyalty.tierThresholds)},tierMultipliers:{...DEFAULT_LOYALTY_CONFIG.tierMultipliers,...record(loyalty.tierMultipliers)},rewards:Array.isArray(loyalty.rewards)?list(loyalty.rewards):DEFAULT_LOYALTY_CONFIG.rewards},
  extras:{...DEFAULT_EXTRAS,...extras,gallery:savedGallery,policies:{...DEFAULT_EXTRAS.policies,...record(extras.policies)},whiteLabel:{...DEFAULT_EXTRAS.whiteLabel,...record(extras.whiteLabel)}},
  onboardingComplete:draft.onboardingComplete===true};
}
