import {CATEGORY_TEMPLATES} from '../../categoryTemplates';
import type {Salon} from './model';
export const CUSTOMER_CATEGORY_GROUPS=[
 {id:'hair',label:'Hair Salon',types:['hair_salon','hair_coloring','unisex_salon'],image:CATEGORY_TEMPLATES.hair_salon.coverImageUrl},
 {id:'barber',label:'Barber Shop',types:['barber'],image:CATEGORY_TEMPLATES.barber.coverImageUrl},
 {id:'beauty',label:'Beauty Parlour',types:['beauty_parlour','bridal_lounge','makeup_studio','skincare_clinic','nail_studio','lash_brow','unisex_salon'],image:CATEGORY_TEMPLATES.beauty_parlour.coverImageUrl},
 {id:'spa',label:'Spa',types:['ayurvedic_spa','hair_spa'],image:CATEGORY_TEMPLATES.ayurvedic_spa.coverImageUrl},
 {id:'massage',label:'Massage',types:['massage_wellness'],image:CATEGORY_TEMPLATES.massage_wellness.coverImageUrl},
 {id:'tattoo',label:'Tattoo Studio',types:['tattoo_studio'],image:CATEGORY_TEMPLATES.tattoo_studio.coverImageUrl}
];
export function matchesCustomerCategory(salon:Salon,group:string){const entry=CUSTOMER_CATEGORY_GROUPS.find(g=>g.id===group);return !entry||entry.types.includes(salon.content.profile.businessType)}
