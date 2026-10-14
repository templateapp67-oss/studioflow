import {demoTestimonials} from './demoWebsiteContent';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { DEFAULT_CATEGORY_ACCENTS } from '../themeAccents';
import type {SalonProfile,CategoryTemplateConfig} from '../types';
export function applyTemplateDesign(profile:SalonProfile,template:CategoryTemplateConfig):SalonProfile {
 const catalog=Object.values(CATEGORY_TEMPLATES);
 const inherited=(key:'tagline'|'about'|'coverImageUrl')=>!profile[key]||catalog.some(t=>t[key]===profile[key]);
 return {...profile,...(profile.websiteTestimonials?.length&&profile.websiteTestimonials.every(r=>r.isDemo)?{websiteTestimonials:demoTestimonials(template.id)}:{}),businessType:template.id,themePreset:template.themePreset,themeAccentKey:DEFAULT_CATEGORY_ACCENTS[template.id],
  coverImageUrl:inherited('coverImageUrl')?template.coverImageUrl:profile.coverImageUrl,
  tagline:inherited('tagline')?template.tagline:profile.tagline,about:inherited('about')?template.about:profile.about};
}
