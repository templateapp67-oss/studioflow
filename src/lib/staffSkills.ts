import {CATEGORY_TEMPLATES} from '../categoryTemplates';
import type {BusinessTypeId} from '../types';
export const STAFF_SKILLS:Record<BusinessTypeId,string[]>={
 hair_salon:['Hair Cutting','Hair Coloring','Balayage','Keratin Treatment','Hair Highlights','Blowdry Styling','Hair Extensions','Scalp Detox'],
 barber:['Hair Cutting','Beard Sculpting','Beard Shaping','Fade Haircuts','Hot Towel Shave','Men’s Grooming'],
 unisex_salon:['Hair Cutting','Hair Coloring','Balayage','Keratin Treatment','Facial Treatments','Threading & Waxing'],
 beauty_parlour:['Bridal Makeup','Bridal Styling','Facial Treatments','Threading & Waxing','Skin Aesthetics','Party Makeup'],
 nail_studio:['Nail Art','Gel-X Extensions','Russian Manicure','Hailey Chrome','3D Jelly Art','Pedicure','Gel Polish'],
 hair_spa:['Scalp Detox','Hair Spa','Keratin Treatment','Scalp Massage','Hair Repair'],
 skincare_clinic:['Skin Aesthetics','Facial Treatments','Skin Consultation','Hydration Facial','D-Tan Care'],
 makeup_studio:['Bridal Makeup','Party Makeup','Airbrush Makeup','Editorial Makeup','Makeover Styling'],
 massage_wellness:['Deep Tissue Massage','Swedish Massage','Aromatherapy','Relaxation Massage','Foot Reflexology'],
 hair_coloring:['Hair Coloring','Balayage','Hair Highlights','Ombre Colour','Root Touch-up','Colour Correction'],
 bridal_lounge:['Bridal Makeup','Bridal Styling','Bridal Hair Styling','Airbrush Makeup','Draping'],
 tattoo_studio:['Fine-Line Tattoo','Portrait Tattoo','Geometric Tattoo','Tattoo Cover-up','Body Piercing'],
 lash_brow:['Lash Extensions','Brow Lamination','Microblading','Lash Lift','Brow Shaping'],
 ayurvedic_spa:['Ayurvedic Massage','Abhyangam','Shirodhara','Herbal Kizhi','Panchakarma','Dosha Consultation']
};
const key=(s:string)=>s.trim().toLowerCase();
const templateSkills=(category:BusinessTypeId)=>CATEGORY_TEMPLATES[category].stylists.flatMap(st=>st.specialties||[]);
const known=new Set([...Object.values(STAFF_SKILLS).flat(),...Object.values(CATEGORY_TEMPLATES).flatMap(t=>t.stylists.flatMap(st=>st.specialties||[]))].map(key));
export function categorySkills(skills:string[],category:BusinessTypeId):string[]{
 const allowed=new Set([...STAFF_SKILLS[category],...templateSkills(category)].map(key));
 return skills.filter(skill=>allowed.has(key(skill))||!known.has(key(skill)));
}
