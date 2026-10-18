export const WEBSITE_EDIT_STEPS = [
 {id:2,label:'Business details',icon:'storefront',hint:'Salon name, owner, contact details aur tagline set karein.'},
 {id:9,label:'Choose template',icon:'dashboard_customize',hint:'Apni business category ke hisab se 14 templates mein se design choose karein.'},
 {id:10,label:'Logo, colours & hero',icon:'palette',hint:'Logo, favicon, brand colour aur home banner ki image edit karein.'},
 {id:27,label:'About our studio',icon:'person',hint:'Salon ki kahani, owner photo aur questions se About draft banayein.'},
 {id:3,label:'Services & packages',icon:'spa',hint:'Services, categories, descriptions, prices, duration, package images aur bundles edit karein.'},
 {id:4,label:'Team & specialists',icon:'groups',hint:'Staff profiles, photos, experience aur assigned services manage karein.'},
 {id:5,label:'Photo gallery',icon:'photo_library',hint:'Selected template ki gallery photos upload, replace ya remove karein.'},
 {id:6,label:'Socials, videos & reels',icon:'video_library',hint:'Social profile links aur promotional videos/reels manage karein.'},
 {id:7,label:'Location & hours',icon:'location_on',hint:'Map pin, address aur salon opening hours set karein.'},
 {id:8,label:'Booking rules',icon:'event_available',hint:'WhatsApp booking contact aur advance booking lead time check karein.'},
 {id:16,label:'Sections, menu & reviews',icon:'view_quilt',hint:'Website sections on/off, header menu, section headings aur client testimonials edit karein.'},
 {id:28,label:'Promotions & offers',icon:'campaign',hint:'Website promotion, offer content aur marketing banner edit karein.'},
 {id:29,label:'Loyalty & rewards',icon:'military_tech',hint:'Reward rules, points thresholds aur active benefits configure karein.'},
 {id:23,label:'Salon policies',icon:'policy',hint:'Cancellation, privacy aur salon policy text review karein.'},
 {id:11,label:'Content review',icon:'fact_check',hint:'Basic completeness checklist dekhein aur missing details edit karein.'},
 {id:12,label:'Preview website',icon:'preview',hint:'Publish se pehle mobile/desktop preview, images aur booking flow check karein.'},
 {id:13,label:'Publish / update',icon:'publish',hint:'Save status check karke website publish karein ya published site update karein.'},
 {id:14,label:'Live website & link',icon:'language',hint:'Published website ka link kholein aur final customer experience check karein.'},
] as const;
export const OWNER_BUSINESS_TOOLS = [
 {id:18,label:'Business overview',icon:'monitoring'},
 {id:20,label:'Bookings & calendar',icon:'calendar_month'},
 {id:21,label:'Payments & revenue',icon:'payments'},
 {id:26,label:'Customers & WhatsApp',icon:'contacts'},
 {id:22,label:'Marketing campaigns',icon:'campaign'},
 {id:24,label:'Share & referral',icon:'redeem'},
 {id:25,label:'Platform branding',icon:'verified'},
 {id:1,label:'Account & login',icon:'account_circle'},
] as const;
export function ownerModule(raw:string|null){
 const n=Number(raw);const canonical=({15:6,17:4,19:16} as Record<number,number>)[n]||n;
 return [...WEBSITE_EDIT_STEPS,...OWNER_BUSINESS_TOOLS].some(s=>s.id===canonical)?canonical:2;
}
export function adjacentOwnerStep(id:number,direction:-1|1){const index=WEBSITE_EDIT_STEPS.findIndex(s=>s.id===id);return index<0?null:WEBSITE_EDIT_STEPS[index+direction]?.id??null;}
