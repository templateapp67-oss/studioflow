import { MENS_DEFAULTS } from './keshkraft';
import { AURELIA_DEFAULT_CONFIG, AURELIA_DEFAULT_OFFERS } from './aureliaBeauty';
import {demoTestimonials} from './demoWebsiteContent';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { DEFAULT_CATEGORY_ACCENTS } from '../themeAccents';
import { isLegacyRoopStockCover } from './roopMahalReference';
import { isLegacyMakeupStudioStockUrl } from './vogueNoir';
import { isLegacyMassageWellnessStockUrl } from './bodhiTree';
import { PRISM_CHROMA_IMAGES } from './prismChroma';
import { SHRINGAAR_IMAGES, isLegacyBridalStockUrl } from './shringaarRoyal';
import { ARCH_FLUTTER_IMAGES, isLegacyLashStockUrl } from './archFlutter';
import { isLegacyHairSalonStockUrl } from './luxuryEditorial';
import type {SalonProfile,CategoryTemplateConfig} from '../types';
import { hasManualTagline, hasManualAbout } from './copyProvenance';
export function applyTemplateDesign(profile:SalonProfile,template:CategoryTemplateConfig):SalonProfile {
 const catalog=Object.values(CATEGORY_TEMPLATES);
 const cover=profile.coverImageUrl;
 const inheritedCover=!cover || catalog.some(t=>t.coverImageUrl===cover) || isLegacyRoopStockCover(cover)
  || (template.id==='makeup_studio' && isLegacyMakeupStudioStockUrl(cover))
  || (template.id==='massage_wellness' && isLegacyMassageWellnessStockUrl(cover))
  || (template.id==='hair_coloring' && cover!==PRISM_CHROMA_IMAGES.hero && isLegacyMassageWellnessStockUrl(cover))
  || (template.id==='bridal_lounge' && isLegacyBridalStockUrl(cover))
  || (template.id==='lash_brow' && isLegacyLashStockUrl(cover))
  || (template.id==='hair_salon' && isLegacyHairSalonStockUrl(cover));
 return {...profile,...(template.id==='aurelia_beauty_parlour'?{aureliaBeauty:profile.aureliaBeauty||structuredClone(AURELIA_DEFAULT_CONFIG),promoOffers:profile.promoOffers??structuredClone(AURELIA_DEFAULT_OFFERS)}:{}),...(template.id==='mens_hair_studio'?{mensStudio:profile.businessType==='mens_hair_studio'?profile.mensStudio:structuredClone(MENS_DEFAULTS),coverImageUrl:template.coverImageUrl,ownerPhotoUrl:template.ownerPhotoUrl}:{}),...(profile.websiteTestimonials?.length&&profile.websiteTestimonials.every(r=>r.isDemo)?{websiteTestimonials:demoTestimonials(template.id)}:{}),businessType:template.id,themePreset:template.themePreset,themeAccentKey:DEFAULT_CATEGORY_ACCENTS[template.id],
  coverImageUrl:inheritedCover?template.coverImageUrl:profile.coverImageUrl,
  tagline:hasManualTagline(profile)?profile.tagline:template.tagline,
  ...(!hasManualTagline(profile) ? { onboardingGeneratedTagline: template.tagline, taglineEditedByOwner: false } : {}),
  about:hasManualAbout(profile)?profile.about:template.about,
  ...(!hasManualAbout(profile) ? { onboardingSeededAbout: template.about, aboutEditedByOwner: false } : {})};
}
