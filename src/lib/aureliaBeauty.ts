import type { AureliaBeautyConfig, SalonOffer, SalonService, Stylist } from '../types';

const ROOT = 'https://raw.githubusercontent.com/vijay-facebook/Aurelia-app/main/src/assets/images/';
export const AURELIA_IMAGES = {
  hero: ROOT + 'hero_aurelia_arch_1793409239063.jpg',
  hair: ROOT + 'service_hairstyling_1793409240754.jpg',
  colour: ROOT + 'service_haircolour_1793409239777.jpg',
  skin: ROOT + 'service_skincare_1793409239190.jpg',
  bridal: ROOT + 'service_bridal_1793409259837.jpg',
  nails: ROOT + 'service_nailstudio_1793409259976.jpg',
  spa: ROOT + 'service_spa_1793409260106.jpg',
  story: ROOT + 'story_stylist_1793409260598.jpg',
  ananya: ROOT + 'staff_ananya_sharma_1793411018334.jpg',
  leah: ROOT + 'staff_leah_dsouza_1793411018649.jpg',
  maya: ROOT + 'staff_maya_kapoor_1793411019553.jpg',
  rohan: ROOT + 'staff_rohan_mehta_1793411019601.jpg',
  galleryHair: ROOT + 'video_balayage_thumb_1793411344176.jpg',
  gallerySkin: ROOT + 'video_facial_thumb_1793411344736.jpg',
  galleryBridal: ROOT + 'video_bridal_thumb_1793411345160.jpg',
  galleryStudio: ROOT + 'room_lookbook_interior_1793383607293.jpg',
  galleryBts: ROOT + 'video_bts_thumb_1793411345197.jpg',
};

export const AURELIA_DEFAULT_CONFIG: AureliaBeautyConfig = {
  announcementText: 'A little more time for yourself. Discover the Aurelia experience.',
  heroEyebrow: 'AURELIA · BANDRA WEST, MUMBAI',
  heroHeading: 'Beauty, considered.',
  heroSubtext: 'A thoughtful space for hair, skin and self-care. Expert hands, honest advice and rituals made around you.',
  heroImageUrl: AURELIA_IMAGES.hero,
  heroBadge: 'A quiet kind of luxury',
  storyEyebrow: 'THE AURELIA STORY',
  storyHeading: 'A softer way to feel your best.',
  storyText: 'Aurelia brings together thoughtful beauty, skilled artistry and a welcoming studio atmosphere. Every appointment begins with a conversation, so your service feels personal rather than one-size-fits-all.',
  storyImageUrl: AURELIA_IMAGES.story,
  servicesHeading: 'The Aurelia edit',
  menuHeading: 'A menu made for you',
  teamHeading: 'The craftspeople',
  galleryHeading: 'A glimpse of Aurelia',
  videosHeading: 'Inside the studio',
  offersHeading: 'A little something extra',
  reviewsHeading: 'Kind words, honestly shared',
  contactHeading: 'Your time at Aurelia',
  workingHoursDisplay: 'Monday – Saturday · 10:00 AM – 8:00 PM',
  galleryUrls: [AURELIA_IMAGES.galleryHair, AURELIA_IMAGES.gallerySkin, AURELIA_IMAGES.galleryBridal, AURELIA_IMAGES.galleryStudio, AURELIA_IMAGES.galleryBts],
  sectionOrder: ['hero','services','story','team','menu','gallery','videos','offers','reviews','contact'],
};

export const AURELIA_DEFAULT_SERVICES: SalonService[] = [
  {id:'aur-hair-01',name:'Signature Cut & Finish',category:'Hair',durationMinutes:75,price:1800,description:'A considered cut, tailored consultation, wash and polished finish.',icon:'content_cut',popular:true,imageUrl:AURELIA_IMAGES.hair,origin:'template'},
  {id:'aur-hair-02',name:'Aurelia Blowout',category:'Hair',durationMinutes:50,price:1400,description:'Soft movement, shape and long-lasting volume with a heat-safe finish.',icon:'styler',imageUrl:AURELIA_IMAGES.hair,origin:'template'},
  {id:'aur-colour-01',name:'Balayage & Gloss',category:'Hair Colour',durationMinutes:180,price:9500,description:'Personalised hand-painted colour, tone and gloss. Final pricing is confirmed after consultation.',icon:'brush',popular:true,imageUrl:AURELIA_IMAGES.colour,origin:'template'},
  {id:'aur-colour-02',name:'Gloss & Tone',category:'Hair Colour',durationMinutes:90,price:4500,description:'Refresh your existing shade with a custom gloss and tone service.',icon:'palette',imageUrl:AURELIA_IMAGES.colour,origin:'template'},
  {id:'aur-skin-01',name:'Radiance Facial',category:'Skin',durationMinutes:60,price:3200,description:'A calming cleanse, gentle exfoliation and hydration-focused facial ritual.',icon:'sparkles',popular:true,imageUrl:AURELIA_IMAGES.skin,origin:'template'},
  {id:'aur-skin-02',name:'Hydra-Infusion Facial',category:'Skin',durationMinutes:75,price:4800,description:'A refreshing hydration session tailored to your skin consultation.',icon:'droplets',imageUrl:AURELIA_IMAGES.skin,origin:'template'},
  {id:'aur-nails-01',name:'Signature Gel Manicure',category:'Nails',durationMinutes:60,price:1800,description:'Nail shaping, cuticle care and a long-wear gel finish.',icon:'hand',imageUrl:AURELIA_IMAGES.nails,origin:'template'},
  {id:'aur-spa-01',name:'Aromatherapy Massage',category:'Spa',durationMinutes:75,price:3800,description:'A relaxing full-body massage with a choice of gentle aromatic oils.',icon:'flower',imageUrl:AURELIA_IMAGES.spa,origin:'template'},
  {id:'aur-spa-02',name:'Botanical Head Spa',category:'Spa',durationMinutes:60,price:2600,description:'A slow scalp and hair ritual with a relaxing wash and finish.',icon:'leaf',imageUrl:AURELIA_IMAGES.spa,origin:'template'},
  {id:'aur-bridal-01',name:'Bridal Trial & Styling',category:'Bridal',durationMinutes:150,price:11500,description:'A detailed bridal look trial with hair and makeup planning.',icon:'gem',imageUrl:AURELIA_IMAGES.bridal,origin:'template'},
];

export const AURELIA_DEFAULT_STAFF: Stylist[] = [
  {id:'aur-staff-leah',name:"Leah D'Souza",role:'Creative Hair Director',avatarUrl:AURELIA_IMAGES.leah,specialties:['Balayage','Signature cuts','Hair styling'],rating:4.9,experienceYears:9,bio:'Known for thoughtful consultations and natural-looking colour.'},
  {id:'aur-staff-ananya',name:'Ananya Sharma',role:'Senior Skin Specialist',avatarUrl:AURELIA_IMAGES.ananya,specialties:['Facials','Skin rituals','Hydration care'],rating:4.9,experienceYears:8,bio:'A calm, detail-led approach to personalised skin services.'},
  {id:'aur-staff-rohan',name:'Rohan Mehta',role:'Senior Stylist',avatarUrl:AURELIA_IMAGES.rohan,specialties:['Precision cuts','Blowouts','Hair styling'],rating:4.8,experienceYears:7,bio:'Brings a refined finish and a relaxed studio experience.'},
  {id:'aur-staff-maya',name:'Maya Kapoor',role:'Nail & Wellness Artist',avatarUrl:AURELIA_IMAGES.maya,specialties:['Gel manicure','Nail care','Spa rituals'],rating:4.9,experienceYears:6,bio:'Creates careful nail and wellness rituals with a personal touch.'},
];

export const AURELIA_DEFAULT_OFFERS: SalonOffer[] = [
  {id:'aur-offer-gloss',title:'Golden Hour Balayage & Gloss',description:'A weekday colour session with a gloss finish. Ask the studio to confirm availability and final pricing.',image:AURELIA_IMAGES.colour,badge:'Demo offer',offerType:'flat',discountValue:2500,originalPriceINR:12000,offerPriceINR:9500,applicableServices:['aur-colour-01'],couponCode:'',validFrom:'2026-11-03',validTo:'2027-03-31',terms:'Demo offer only. Salon approval and consultation required.',isActive:true,isDemo:true},
  {id:'aur-offer-radiance',title:'First Visit Radiance Ritual',description:'A welcome offer on selected skin services for new guests.',image:AURELIA_IMAGES.skin,badge:'Demo offer',offerType:'percent',discountValue:20,originalPriceINR:4800,offerPriceINR:3840,applicableServices:['aur-skin-02'],couponCode:'',validFrom:'2026-11-03',validTo:'2027-03-31',terms:'Demo offer only. Salon approval and consultation required.',isActive:true,isDemo:true},
  {id:'aur-offer-bridal',title:'Bridal Trial & Glow',description:'A bridal trial session with a personalised look plan.',image:AURELIA_IMAGES.bridal,badge:'Demo offer',offerType:'flat',discountValue:3000,originalPriceINR:14500,offerPriceINR:11500,applicableServices:['aur-bridal-01'],couponCode:'',validFrom:'2026-11-03',validTo:'2027-03-31',terms:'Demo offer only. Advance booking and salon approval required.',isActive:true,isDemo:true},
];

export function aureliaConfigFor(profile: { aureliaBeauty?: AureliaBeautyConfig }): AureliaBeautyConfig {
  return {...AURELIA_DEFAULT_CONFIG, ...(profile.aureliaBeauty || {})};
}
