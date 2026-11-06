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
  announcementText: 'Take a little time for yourself. We’d love to see you at Aurelia.',
  heroEyebrow: 'AURELIA · BANDRA WEST, MUMBAI',
  heroHeading: 'Feel good, look your best.',
  heroSubtext: 'A friendly space for hair, skin and a little self-care. We listen, share honest advice and plan each visit around you.',
  heroImageUrl: AURELIA_IMAGES.hero,
  heroBadge: 'A quiet kind of luxury',
  storyEyebrow: 'THE AURELIA STORY',
  storyHeading: 'Good care, with a personal touch.',
  storyText: 'Aurelia is a warm studio where good beauty work starts with listening. We take time to understand what you want, so your visit feels personal and never rushed.',
  storyImageUrl: AURELIA_IMAGES.story,
  servicesHeading: 'Services to make time for yourself',
  menuHeading: 'A menu made for you',
  teamHeading: 'Meet your beauty team',
  galleryHeading: 'A glimpse of Aurelia',
  videosHeading: 'Inside the studio',
  offersHeading: 'Something extra for your visit',
  reviewsHeading: 'Kind words, honestly shared',
  contactHeading: 'Your time at Aurelia',
  workingHoursDisplay: 'Monday – Saturday · 10:00 AM – 8:00 PM',
  galleryUrls: [AURELIA_IMAGES.galleryHair, AURELIA_IMAGES.gallerySkin, AURELIA_IMAGES.galleryBridal, AURELIA_IMAGES.galleryStudio, AURELIA_IMAGES.galleryBts],
  sectionOrder: ['hero','services','story','team','menu','gallery','videos','offers','reviews','contact'],
};

export const AURELIA_DEFAULT_SERVICES: SalonService[] = [
  {id:'aur-hair-01',name:'Signature Cut & Finish',category:'Hair',durationMinutes:75,price:1800,description:'We’ll talk through the look you want, then wash, cut and blow-dry your hair to suit your everyday routine.',icon:'content_cut',popular:true,imageUrl:AURELIA_IMAGES.hair,origin:'template'},
  {id:'aur-hair-02',name:'Aurelia Blowout',category:'Hair',durationMinutes:50,price:1400,description:'A smooth blow-dry with soft movement and volume, finished with heat protection.',icon:'styler',imageUrl:AURELIA_IMAGES.hair,origin:'template'},
  {id:'aur-colour-01',name:'Balayage & Gloss',category:'Hair Colour',durationMinutes:180,price:9500,description:'Hand-painted colour chosen to suit you, finished with a gloss for extra shine. We’ll confirm the final price after a quick consultation.',icon:'brush',popular:true,imageUrl:AURELIA_IMAGES.colour,origin:'template'},
  {id:'aur-colour-02',name:'Gloss & Tone',category:'Hair Colour',durationMinutes:90,price:4500,description:'Refresh your current shade with a gloss and tone chosen to suit your hair.',icon:'palette',imageUrl:AURELIA_IMAGES.colour,origin:'template'},
  {id:'aur-skin-01',name:'Radiance Facial',category:'Skin',durationMinutes:60,price:3200,description:'A gentle cleanse and exfoliation, followed by a hydrating facial to leave your skin feeling fresh.',icon:'sparkles',popular:true,imageUrl:AURELIA_IMAGES.skin,origin:'template'},
  {id:'aur-skin-02',name:'Hydra-Infusion Facial',category:'Skin',durationMinutes:75,price:4800,description:'A refreshing facial planned around your skin and what it needs.',icon:'droplets',imageUrl:AURELIA_IMAGES.skin,origin:'template'},
  {id:'aur-nails-01',name:'Signature Gel Manicure',category:'Nails',durationMinutes:60,price:1800,description:'Nail shaping and cuticle care, finished with gel colour that lasts.',icon:'hand',imageUrl:AURELIA_IMAGES.nails,origin:'template'},
  {id:'aur-spa-01',name:'Aromatherapy Massage',category:'Spa',durationMinutes:75,price:3800,description:'Unwind with a full-body massage and your choice of aromatic oil.',icon:'flower',imageUrl:AURELIA_IMAGES.spa,origin:'template'},
  {id:'aur-spa-02',name:'Botanical Head Spa',category:'Spa',durationMinutes:60,price:2600,description:'A relaxing scalp and hair treatment, followed by a wash and easy finish.',icon:'leaf',imageUrl:AURELIA_IMAGES.spa,origin:'template'},
  {id:'aur-bridal-01',name:'Bridal Trial & Styling',category:'Bridal',durationMinutes:150,price:11500,description:'Try your bridal look and plan your hair and makeup with our team.',icon:'gem',imageUrl:AURELIA_IMAGES.bridal,origin:'template'},
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
