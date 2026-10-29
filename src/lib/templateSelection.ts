import {demoTestimonials} from './demoWebsiteContent';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { DEFAULT_CATEGORY_ACCENTS } from '../themeAccents';
import { isLegacyRoopStockCover, isLegacyRoopStockTagline } from './roopMahalReference';
import { isLegacyMakeupStudioStockUrl } from './vogueNoir';
import { isLegacyMassageWellnessStockUrl } from './bodhiTree';
import { PRISM_CHROMA_IMAGES } from './prismChroma';
import { SHRINGAAR_IMAGES, isLegacyBridalStockUrl } from './shringaarRoyal';
import type {SalonProfile,CategoryTemplateConfig} from '../types';
export function applyTemplateDesign(profile:SalonProfile,template:CategoryTemplateConfig):SalonProfile {
 const catalog=Object.values(CATEGORY_TEMPLATES);
 const inherited=(key:'tagline'|'about'|'coverImageUrl')=>!profile[key]||catalog.some(t=>t[key]===profile[key])||(key==='coverImageUrl'&&(isLegacyRoopStockCover(profile.coverImageUrl)||(template.id==='makeup_studio'&&isLegacyMakeupStudioStockUrl(profile.coverImageUrl))||(template.id==='massage_wellness'&&isLegacyMassageWellnessStockUrl(profile.coverImageUrl))||(template.id==='hair_coloring'&&profile.coverImageUrl!==PRISM_CHROMA_IMAGES.hero&&isLegacyMassageWellnessStockUrl(profile.coverImageUrl))||(template.id==='bridal_lounge'&&profile.coverImageUrl!==SHRINGAAR_IMAGES.hero&&isLegacyBridalStockUrl(profile.coverImageUrl))))||(key==='tagline'&&isLegacyRoopStockTagline(profile.tagline));
 return {...profile,...(profile.websiteTestimonials?.length&&profile.websiteTestimonials.every(r=>r.isDemo)?{websiteTestimonials:demoTestimonials(template.id)}:{}),businessType:template.id,themePreset:template.themePreset,themeAccentKey:DEFAULT_CATEGORY_ACCENTS[template.id],
  coverImageUrl:inherited('coverImageUrl')?template.coverImageUrl:profile.coverImageUrl,
  tagline:inherited('tagline')?template.tagline:profile.tagline,about:inherited('about')?template.about:profile.about};
}
