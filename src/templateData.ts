import { MENS_DEFAULTS } from './lib/keshkraft';
import { BusinessTypeId } from './types';
import { SALON_IMAGES } from './assets/images';

export interface GalleryPhoto {
  id: string;
  url: string;
  title: string;
  tag: string;
}

export interface Testimonial {
  reviewImageUrl?:string;
  isDemo?:boolean;
  verified?:boolean;
  id: string;
  name: string;
  location: string;
  rating: number;
  serviceName: string;
  comment: string;
  avatarUrl: string;
  date: string;
}

export interface CategoryStandardData {
  foundingYear: string;
  foundingNarrative: string;
  specialties: string[];
  certifications: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  gallery: GalleryPhoto[];
  reviews: Testimonial[];
  totalReviewCount: number;
  averageRating: number;
  landmark: string;
  parkingInfo: string;
  openHourText: string;
  closeHourText: string;
}

export const CATEGORY_STANDARDIZED_DATA: Record<BusinessTypeId, CategoryStandardData> = {
 aurelia_beauty_parlour:{
  foundingYear:'2019',
  foundingNarrative:'Aurelia is a friendly beauty and wellness studio for hair, skin and self-care. Our team listens first and helps you choose a service that feels right for you.',
  specialties:['Hair Styling & Colour','Skin Rituals','Bridal & Occasion Beauty','Nail Care','Spa & Wellness'],
  certifications:[
   {icon:'verified',title:'Thoughtful Consultation',description:'Every service starts with a conversation about your needs, preferences and comfort.'},
   {icon:'spa',title:'A Calm Studio Experience',description:'A welcoming space with careful attention to cleanliness and personal care.'},
   {icon:'workspace_premium',title:'Skilled Beauty Team',description:'Hair, skin, bridal, nail and wellness specialists in one studio.'}
  ],
  gallery:[
   {id:'aur-g1',url:'https://raw.githubusercontent.com/vijay-facebook/Aurelia-app/main/src/assets/images/video_balayage_thumb_1793411344176.jpg',title:'Signature Hair Styling',tag:'Hair'},
   {id:'aur-g2',url:'https://raw.githubusercontent.com/vijay-facebook/Aurelia-app/main/src/assets/images/video_facial_thumb_1793411344736.jpg',title:'Radiance Skin Ritual',tag:'Skin'},
   {id:'aur-g3',url:'https://raw.githubusercontent.com/vijay-facebook/Aurelia-app/main/src/assets/images/video_bridal_thumb_1793411345160.jpg',title:'Bridal Styling',tag:'Bridal'},
   {id:'aur-g4',url:'https://raw.githubusercontent.com/vijay-facebook/Aurelia-app/main/src/assets/images/room_lookbook_interior_1793383607293.jpg',title:'Aurelia Studio Interior',tag:'Interior'},
   {id:'aur-g5',url:'https://raw.githubusercontent.com/vijay-facebook/Aurelia-app/main/src/assets/images/video_bts_thumb_1793411345197.jpg',title:'Behind the Studio',tag:'Interior'}
  ],
  // Do not seed made-up guest reviews; the website displays approved customer reviews only.
  reviews:[],
  totalReviewCount:0,averageRating:0,landmark:'Bandra West, Mumbai',parkingInfo:'Ask the studio about nearby parking',openHourText:'10:00 AM',closeHourText:'8:00 PM'
 },
 mens_hair_studio:{foundingYear:'',foundingNarrative:'A men-only studio for clean haircuts, colour and easy-to-follow grooming advice.',specialties:["Men's Haircuts","Men's Hair Colour"],certifications:[],gallery:MENS_DEFAULTS.gallery.map(g=>({id:g.id,url:g.url,title:g.title,tag:'Men'})),reviews:MENS_DEFAULTS.reviews.map(r=>({id:r.id,name:r.name,location:'Demo',rating:5,serviceName:r.service,comment:r.text,avatarUrl:'',date:'Demo',isDemo:true})),totalReviewCount:0,averageRating:0,landmark:'Udaipur',parkingInfo:'Ask the studio',openHourText:'10:00 AM',closeHourText:'08:00 PM'},
  hair_salon: {
    foundingYear: '2020',
    foundingNarrative: 'Ziya Women’s Hair Studio is a relaxed space for women’s haircuts and styling. We take time to understand your face shape, hair texture and daily routine before suggesting a look that feels like you.',
    specialties: ['Layer & Butterfly Haircuts', 'Precision Bob & Blunt Cuts', 'Curtain Bangs & Face-Framing', 'Curl-by-Curl Dry Shaping'],
    certifications: [
      { icon: 'verified', title: '100% Sanitized Japanese Shears', description: 'Every precision cutting shear and carbon sectioning comb is sterilized between appointments.' },
      { icon: 'face_3', title: 'Face-Shape Mapping First', description: 'Personalised cheekbone, jawline and hairline consultation included before every cut.' },
      { icon: 'dry_cleaning', title: 'All-Female Specialist Team', description: 'Dedicated female hairstylists trained exclusively in modern women’s cutting techniques.' },
      { icon: 'workspace_premium', title: 'Dry & Wet Cut Mastery', description: 'Custom elevation, point-cutting and curl-by-curl shaping for natural grow-out.' }
    ],
    gallery: [
      { id: 'hs-g1', url: '/templates/luxury-editorial/gallery-1-760.webp', title: 'Textured French Micro-Bob Cut', tag: 'Short Haircut' },
      { id: 'hs-g2', url: '/templates/luxury-editorial/gallery-2-760.webp', title: 'Cascading Long Layered Haircut', tag: 'Layered Cut' },
      { id: 'hs-g3', url: '/templates/luxury-editorial/gallery-3-760.webp', title: 'Voluminous Butterfly Haircut', tag: 'Butterfly Cut' },
      { id: 'hs-g4', url: '/templates/luxury-editorial/gallery-4-760.webp', title: 'Feathered Modern Pixie Cut', tag: 'Pixie Cut' },
      { id: 'hs-g5', url: '/templates/luxury-editorial/gallery-5-760.webp', title: 'Cheekbone Curtain Bangs & Long Cut', tag: 'Curtain Bangs' },
      { id: 'hs-g6', url: '/templates/luxury-editorial/gallery-6-760.webp', title: 'Curved U-Cut Back Silhouette', tag: 'Face-Framing Layers' },
      { id: 'hs-g7', url: '/templates/luxury-editorial/gallery-7-760.webp', title: 'Curl-by-Curl Dry Shape Haircut', tag: 'Curly Haircut' },
      { id: 'hs-g8', url: '/templates/luxury-editorial/gallery-8-760.webp', title: 'Jawline Sculpted Blunt Bob Cut', tag: 'Bob Cut' },
      { id: 'hs-g9', url: '/templates/luxury-editorial/gallery-9-760.webp', title: 'Before & After Step Haircut Result', tag: 'Haircut Result' }
    ],
    reviews: [
      { id: 'hs-r1', name: 'Ananya Deshmukh', location: 'Indiranagar, Bengaluru', rating: 5, serviceName: 'Layer Haircut', comment: 'Ziya took time to understand my hair and the look I wanted. My layers frame my face nicely and are easy to manage at home.', avatarUrl: '/templates/luxury-editorial/service-layer-480.webp', date: '2 days ago' },
      { id: 'hs-r2', name: 'Rhea Malhotra', location: 'Koramangala, Bengaluru', rating: 5, serviceName: 'Bob Haircut', comment: 'Meera gave me a lovely bob that makes my fine hair look fuller. It sits well even when I don’t style it every day.', avatarUrl: '/templates/luxury-editorial/service-bob-480.webp', date: '5 days ago' },
      { id: 'hs-r3', name: 'Sneha Iyer', location: 'HSR Layout, Bengaluru', rating: 5, serviceName: 'Face-Framing Haircut', comment: 'I wasn’t sure which style would suit me, but the team suggested soft curtain bangs and layers. I’m so happy with the cut.', avatarUrl: '/templates/luxury-editorial/service-bangs-480.webp', date: '1 week ago' },
      { id: 'hs-r4', name: 'Nandini Verma', location: 'Sadashivanagar, Bengaluru', rating: 5, serviceName: 'Butterfly Haircut', comment: 'I wanted layers without losing my length. Kavya got it just right, and my hair has lovely movement now.', avatarUrl: '/templates/luxury-editorial/service-butterfly-480.webp', date: '2 weeks ago' },
      { id: 'hs-r5', name: 'Kritika Menon', location: 'Jayanagar, Bengaluru', rating: 5, serviceName: 'Curly Haircut', comment: 'Diya understood my curls and shaped them carefully while dry. They feel lighter and fall much more evenly now.', avatarUrl: '/templates/luxury-editorial/service-curly-480.webp', date: '2 weeks ago' },
      { id: 'hs-r6', name: 'Pooja Kulkarni', location: 'Whitefield, Bengaluru', rating: 5, serviceName: 'Pixie Haircut', comment: 'I went for a short pixie cut and felt comfortable throughout. The team explained the price clearly and I love how it looks.', avatarUrl: '/templates/luxury-editorial/service-pixie-480.webp', date: '3 weeks ago' }
    ],
    totalReviewCount: 548,
    averageRating: 4.98,
    landmark: 'Opposite Metro Pillar 128, Near 100 Feet Road Junction',
    parkingInfo: 'Dedicated client parking available right outside the studio entrance',
    openHourText: '10:00 AM',
    closeHourText: '8:00 PM'
  },

  barber: {
    foundingYear: '2018',
    foundingNarrative: 'The Royal Blade is a neighbourhood barbershop on Bandra’s 33rd Road. Drop in for a clean fade, a classic shave or a beard trim, and get simple advice on keeping your look fresh.',
    specialties: ['Straight Razor Hot Shave', 'Low & Mid Skin Fades', 'Charcoal Beard Sculpting', 'Maharaja Head Massage'],
    certifications: [
      { icon: 'verified', title: 'Single-Use Japanese Blades', description: 'Fresh Feather Hi-Stainless razor blade unwrapped for every customer.' },
      { icon: 'wash', title: 'Steam & Hot Towel Sanitation', description: 'Towels sterilized in high-pressure thermal chambers infused with eucalyptus.' },
      { icon: 'shield', title: 'Skin Barrier Protection', description: 'Pre-shave essential oils and alcohol-free calming alum treatments.' },
      { icon: 'workspace_premium', title: 'Master Guild Barbers', description: 'Specialists trained in traditional British & Italian barbering arts.' }
    ],
    gallery: [
      { id: 'bb-g1', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80', title: 'Vintage Barber Chair & Brass Mirrors', tag: 'Interior' },
      { id: 'bb-g2', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80', title: 'Hot Towel Straight Razor Treatment', tag: 'Traditional Shave' },
      { id: 'bb-g3', url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80', title: 'Sculpted Beard Fade & Sharp Lines', tag: 'Beard Craft' },
      { id: 'bb-g4', url: 'https://images.unsplash.com/photo-1517832606589-7157be614532?auto=format&fit=crop&w=800&q=80', title: 'Classic Pompadour Precision Cut', tag: 'Haircut' },
      { id: 'bb-g5', url: 'https://images.unsplash.com/photo-1534778356534-d3d45b6df1da?auto=format&fit=crop&w=800&q=80', title: 'Authentic Grooming Stations', tag: 'Ambience' },
      { id: 'bb-g6', url: 'https://images.unsplash.com/photo-1593702295094-aea22597af65?auto=format&fit=crop&w=800&q=80', title: 'Eucalyptus Steamed Towel Ritual', tag: 'Relaxation' }
    ],
    reviews: [
      { id: 'bb-r1', name: 'Rohan Mehta', location: 'Bandra West, Mumbai', rating: 5, serviceName: 'Royal Maharaja Shave & Steam', comment: 'The hot towel shave was relaxing and Vikram did a great job. A lovely place to unwind and get a fresh look.', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', date: 'Yesterday' },
      { id: 'bb-r2', name: 'Kabir Singhania', location: 'Juhu, Mumbai', rating: 5, serviceName: 'Signature Skin Fade & Beard Sculpt', comment: 'A neat fade and a sharp beard trim, right on time. I’ll definitely be coming back.', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80', date: '4 days ago' },
      { id: 'bb-r3', name: 'Farhan Merchant', location: 'Khar, Mumbai', rating: 5, serviceName: 'Executive Scissor Cut & Charcoal Hair Wash', comment: 'The shop has a great feel and the team keeps everything clean. My haircut was worth the visit.', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80', date: '1 week ago' }
    ],
    totalReviewCount: 680,
    averageRating: 4.98,
    landmark: 'Near Linking Road Junction, Opposite Olive Bistro',
    parkingInfo: 'Dedicated valet parking stall on 33rd Road',
    openHourText: '09:30 AM',
    closeHourText: '9:00 PM'
  },

  unisex_salon: {
    foundingYear: '2020',
    foundingNarrative: 'Aura is a friendly unisex salon in Koramangala for men, women and families. Visit us for haircuts, colour, facials and grooming, with a team that will help you choose what works for you.',
    specialties: ['Unisex Haircuts & Styling', 'Ammonia-Free Inoa Colour', 'Organic De-Tan Cleanups', 'Paraffin Spa Pedicures'],
    certifications: [
      { icon: 'verified', title: 'Hospital-Grade Hygiene', description: 'Dual UV-C autoclaves and sealed linen ensuring pristine equipment for every station.' },
      { icon: 'spa', title: 'Clean Dermatology Formulations', description: 'Hypoallergenic European & Korean aesthetic care lines, ammonia-free colour.' },
      { icon: 'group', title: 'Inclusive Care for Everyone', description: 'Dedicated Men’s Grooming, Women’s Beauty and Wellness zones under one roof.' },
      { icon: 'military_tech', title: 'Friendly Expert Team', description: 'Specialists in unisex cuts, colour and skin care with transparent ₹ pricing.' }
    ],
    gallery: [
      { id: 'us-g1', url: '/templates/aura-unisex/gallery-1-760.webp', title: 'Men’s Haircut & Hairline Shaping', tag: 'Hair' },
      { id: 'us-g2', url: '/templates/aura-unisex/gallery-2-760.webp', title: 'Women’s Hair Styling & Blow Dry', tag: 'Hair' },
      { id: 'us-g3', url: '/templates/aura-unisex/gallery-3-760.webp', title: 'Hair Colour Work', tag: 'Hair' },
      { id: 'us-g4', url: '/templates/aura-unisex/gallery-4-760.webp', title: 'Aura Unisex Salon Interior', tag: 'Hair' },
      { id: 'us-g5', url: '/templates/aura-unisex/gallery-5-760.webp', title: 'Beard Grooming & Men’s Styling', tag: 'Hair' }
    ],
    reviews: [
      { id: 'us-r1', name: 'Aditi Sharma', location: 'Koramangala, Bengaluru', rating: 5, serviceName: 'Designer Unisex Haircut & Moroccan Conditioning', comment: 'The team explained the service and price before starting. The visit was comfortable and the team was helpful.', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', date: '2 days ago' },
      { id: 'us-r2', name: 'Rohan Mehta', location: 'Koramangala, Bengaluru', rating: 5, serviceName: 'Express Glow Organic Cleanup & De-Tan', comment: 'Booking was easy. The team listened to what I wanted and shared simple tips for care at home.', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', date: '1 week ago' },
      { id: 'us-r3', name: 'Neha Kapoor', location: 'Koramangala, Bengaluru', rating: 5, serviceName: 'Global Ammonia-Free Inoa Hair Color', comment: 'I liked the care and attention during my appointment. The salon was clean and welcoming and I felt comfortable throughout.', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', date: '2 weeks ago' }
    ],
    totalReviewCount: 710,
    averageRating: 4.95,
    landmark: 'Outer Ring Road, 4th Block, Koramangala — opposite Koramangala Bus Depot',
    parkingInfo: 'Street parking and nearby commercial complex parking available',
    openHourText: '10:00 AM',
    closeHourText: '8:30 PM'
  },

  beauty_parlour: {
    foundingYear: '2016',
    foundingNarrative: 'Roop Mahal is a beauty parlour in Connaught Place for bridal looks, facials, hair styling and everyday beauty care. Our team will listen to what you have in mind and help you feel at ease.',
    specialties: ['Bridal Makeovers & Shringaar', 'Signature Herbal Facials', 'Festive Hair Styling', 'Everyday Beauty Care'],
    certifications: [
      { icon: 'verified', title: '100% Female Staff Sanctuary', description: 'Private, secure, and serene environment managed completely by women.' },
      { icon: 'eco', title: 'Cold-Pressed Herbal Ingredients', description: 'Kashmiri saffron, sandalwood, and virgin coconut botanical elixirs.' },
      { icon: 'medical_services', title: 'No Double-Dipping Waxing', description: 'Single-use wooden spatulas and hypoallergenic Italian waxes.' },
      { icon: 'grade', title: 'Awarded Best South Delhi Parlour', description: 'Voted top neighbourhood beauty parlour 3 consecutive years.' }
    ],
    gallery: [
      { id: 'bp-g1', url: '/templates/roop-mahal/gallery-bridal-detail.jpg', title: 'Bridal Makeup & Shringaar', tag: 'Bridal Makeup' },
      { id: 'bp-g2', url: '/templates/roop-mahal/gallery-party-makeup.jpg', title: 'Soft-Glam Party Makeup', tag: 'Party Makeup' },
      { id: 'bp-g3', url: '/templates/roop-mahal/gallery-hair-styling.jpg', title: 'Festive Updo & Hair Styling', tag: 'Hair Styling' },
      { id: 'bp-g4', url: '/templates/roop-mahal/gallery-royal-bridal.jpg', title: 'Herbal Facial & Beauty Care', tag: 'Beauty Treatments' },
      { id: 'bp-g5', url: '/templates/roop-mahal/gallery-studio-stations.jpg', title: 'Roop Mahal Makeover Studio', tag: 'Salon Interior' }
    ],
    reviews: [
      { id: 'bp-r1', name: 'Neelam Oberoi', location: 'Connaught Place, New Delhi', rating: 5, serviceName: 'Shahnaz Husain 24K Gold Glow Facial', comment: 'Roop Mahal’s bridal artistry and warm, attentive care made the whole visit feel special.', avatarUrl: '', date: '3 days ago' },
      { id: 'bp-r2', name: 'Ritu Varma', location: 'Connaught Place, New Delhi', rating: 5, serviceName: 'Rica White Chocolate Full Body Waxing', comment: 'A calm, welcoming space and thoughtful care from consultation through the finish.', avatarUrl: '', date: '1 week ago' },
      { id: 'bp-r3', name: 'Tanya Grover', location: 'Connaught Place, New Delhi', rating: 5, serviceName: 'Karva Chauth & Diwali Shringaar Combo', comment: 'The team helped me feel radiant for my celebration with a beautifully considered makeover.', avatarUrl: '', date: '2 weeks ago' }
    ],
    totalReviewCount: 840,
    averageRating: 4.97,
    landmark: 'M-Block Market, GK-1, Near Nik Bakers',
    parkingInfo: 'Valet and dedicated market parking lot nearby',
    openHourText: '10:00 AM',
    closeHourText: '8:00 PM'
  },

  nail_studio: {
    foundingYear: '2021',
    foundingNarrative: 'Pinky Nails Studio is a cheerful spot for manicures, pedicures and nail art. Choose a simple, neat finish or share an idea with our nail artists and we’ll create a look you’ll love.',
    specialties: ['Russian Dry E-File Cuticle Care', 'Chrome & Cat-Eye Gel Art', 'Sculpted Gel Extensions', 'Spa Paraffin Pedicures'],
    certifications: [
      { icon: 'verified', title: 'Individual Sealed Drill Bits', description: 'Diamond and ceramic E-file bits sterilized in medical autoclave bags.' },
      { icon: 'eco', title: '9-Free Toxin-Safe Gel Polishes', description: 'Formulations free from formaldehyde, toluene, and DBP.' },
      { icon: 'airline_seat_recline_extra', title: 'Ergonomic Japanese Nail Desks', description: 'Built-in HEPA dust collectors for zero inhalation of fine nail powders.' },
      { icon: 'brush', title: 'Certified Russian Manicurists', description: 'Precision e-file cuticle techniques that last up to 4 weeks without peeling.' }
    ],
    gallery: [
      { id: 'ns-g1', url: '/templates/pinky-nails/gallery-chrome-art.jpg', title: 'Pearlescent Chrome Glaze Nail Art', tag: 'Nail Art' },
      { id: 'ns-g2', url: '/templates/pinky-nails/gallery-french-tips.jpg', title: 'Soft Pink French Manicure', tag: 'French Tips' },
      { id: 'ns-g3', url: '/templates/pinky-nails/gallery-floral-art.jpg', title: 'Hand-painted Floral Nail Art', tag: 'Handpainted Art' },
      { id: 'ns-g4', url: '/templates/pinky-nails/gallery-pedicure-care.jpg', title: 'Luxury Rose Petal Pedicure Station', tag: 'Pedicure Lounge' },
      { id: 'ns-g5', url: '/templates/pinky-nails/gallery-glitter-gold.jpg', title: 'Gold Glitter Encapsulation Nails', tag: 'Glitter Art' }
    ],
    reviews: [
      { id: 'ns-r1', name: 'Ayesha Shroff', location: 'Jubilee Hills, Hyderabad', rating: 5, serviceName: 'Russian Dry E-File Gel Manicure', comment: 'My manicure was neat and comfortable, and the gel finish still looked good after a few weeks.', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', date: '3 days ago' },
      { id: 'ns-r2', name: 'Zoya Qureshi', location: 'Banjara Hills, Hyderabad', rating: 5, serviceName: 'Full Set Sculpted Hard Gel Extensions', comment: 'They recreated the chrome nail design I showed them and checked every detail with me. Very happy with the finish.', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80', date: '1 week ago' },
      { id: 'ns-r3', name: 'Sneha Reddy', location: 'Gachibowli, Hyderabad', rating: 5, serviceName: 'Cat-Eye Magnetic Gel Overlay', comment: 'The studio is comfortable, the team is warm and my nails always come out beautifully.', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', date: '2 weeks ago' }
    ],
    totalReviewCount: 460,
    averageRating: 4.96,
    landmark: 'Road No. 36, Jubilee Hills, Beside Starbucks',
    parkingInfo: 'Complimentary valet parking right outside the studio',
    openHourText: '10:30 AM',
    closeHourText: '8:30 PM'
  },

  hair_spa: {
    foundingYear: '',
    foundingNarrative:
      'Welcome to Kesh Prakriti, a friendly salon for hair, skin and grooming care. Visit us for everyday services, a relaxing head massage or a special occasion.',
    specialties: ['Hair Spa & Head Massage', 'Threading & Waxing', 'Face Cleanup & D-Tan', 'Bridal & Groom Makeup'],
    certifications: [
      { icon: 'eco', title: 'Herbal Hair Care', description: 'Sample copy — tell customers about the products you use.' },
      { icon: 'spa', title: 'Comfortable Salon', description: 'Sample copy — tell customers what to expect at your salon.' },
      { icon: 'sanitizer', title: 'Clean Towels', description: 'Sample copy — share the hygiene practices your salon follows.' },
      { icon: 'verified', title: 'Our Team', description: 'Sample copy — tell customers about your team and their experience.' }
    ],
    // Bundled demo photographs live in /public/templates/kesh-prakriti and are
    // always labelled "Demo / sample" until the owner uploads their own photos.
    gallery: [
      { id: 'sp-g1', url: '/templates/kesh-prakriti/indian-head-massage.jpg', title: 'Traditional head massage', tag: 'Sample' },
      { id: 'sp-g2', url: '/templates/kesh-prakriti/indian-facial.jpg', title: 'Face cleanup at the salon', tag: 'Sample' },
      { id: 'sp-g3', url: '/templates/kesh-prakriti/indian-grooming.jpg', title: 'Beard grooming', tag: 'Sample' },
      { id: 'sp-g4', url: '/templates/kesh-prakriti/oils.jpg', title: 'Warm oil bottles', tag: 'Sample' },
      { id: 'sp-g5', url: '/templates/kesh-prakriti/sanctuary.jpg', title: 'Sanctuary interior', tag: 'Sample' },
      { id: 'sp-g6', url: '/templates/kesh-prakriti/botanical.jpg', title: 'Botanical ingredients', tag: 'Sample' }
    ],
    // No reviews are bundled: testimonials may only come from real published
    // customer reviews, so the demo shows an honest empty state instead.
    reviews: [],
    totalReviewCount: 0,
    averageRating: 0,
    landmark: '',
    parkingInfo: '',
    openHourText: '10:00 AM',
    closeHourText: '8:00 PM'
  },

  skincare_clinic: {
    foundingYear: '2019',
    foundingNarrative: 'Dermacure is a skin clinic offering consultations and treatments for concerns such as acne and pigmentation. We explain each option clearly and help you understand what to expect before you begin.',
    specialties: ['Medical Hydra-Dermabrasion', 'Glutathione Radiance Peel', 'LED Phototherapy', 'Acne Scar Rejuvenation'],
    certifications: [
      { icon: 'verified', title: 'US-FDA Approved Technology', description: 'All clinical medical devices certified for safety across Indian Fitzpatrick skin types.' },
      { icon: 'sanitizer', title: 'Sterile Clinical Environment', description: 'Hospital-standard laminar airflow and sterile disposables.' },
      { icon: 'dermatology', title: 'Board-Certified Cosmetologists', description: 'Skin assessments directed by licensed medical dermatologists.' },
      { icon: 'science', title: 'Targeted Active Ingredients', description: 'Medical grade serums with clinical actives including niacinamide & peptides.' }
    ],
    gallery: [
      { id: 'sc-g1', url: 'https://images.unsplash.com/photo-1512290900672-1f55b9e07506?auto=format&fit=crop&w=800&q=80', title: 'Clinical Medical Hydra-Facial Suite', tag: 'Treatment Room' },
      { id: 'sc-g2', url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80', title: 'Blue & Red Light LED Phototherapy', tag: 'Technology' },
      { id: 'sc-g3', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', title: 'Clinical Skin Consultation & Mapping', tag: 'Diagnostics' },
      { id: 'sc-g4', url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80', title: 'Targeted Hyaluronic Acid Infusion', tag: 'Hydration' },
      { id: 'sc-g5', url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80', title: 'Sterile Reception & Consultation Bay', tag: 'Interior' },
      { id: 'sc-g6', url: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=800&q=80', title: 'Glass Skin Radiance Transformation', tag: 'Results' }
    ],
    reviews: [
      { id: 'sc-r1', name: 'Dr. Shalini Ghosh', location: 'Salt Lake Sector V, Kolkata', rating: 5, serviceName: 'Hydra-Facial MD with Peptides', comment: 'The team explained the treatment clearly and kept the clinic clean. My skin felt fresh afterwards.', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', date: '2 days ago' },
      { id: 'sc-r2', name: 'Tanmoy Mukherjee', location: 'Park Street, Kolkata', rating: 5, serviceName: 'Clinical Carbon Laser Peel', comment: 'I was given clear advice and pricing before the treatment. My skin looks more even, and the team never made unrealistic promises.', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', date: '5 days ago' },
      { id: 'sc-r3', name: 'Sayantani Sen', location: 'New Town, Kolkata', rating: 5, serviceName: 'Glutathione Brightening Peel', comment: 'The team explained each step and made me feel comfortable. My skin looked fresh for the wedding.', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', date: '2 weeks ago' }
    ],
    totalReviewCount: 580,
    averageRating: 4.97,
    landmark: 'Block EP & GP, Sector V, Near Wipro Circle',
    parkingInfo: 'Free on-site basement visitor parking available',
    openHourText: '10:00 AM',
    closeHourText: '8:00 PM'
  },

  makeup_studio: {
    foundingYear: '2018',
    foundingNarrative: 'Vogue Noir Makeup Studio & Academy offers makeup for weddings, parties and photoshoots, along with practical classes for aspiring makeup artists.',
    specialties: ['HD & Silicone Airbrush Bridal', 'Engagement & Party Glam', 'Editorial Beauty', 'Certified Pro Makeup Academy'],
    certifications: [
      { icon: 'verified', title: '100% Authentic Global Vanity', description: 'Charlotte Tilbury, Dior Backstage, NARS, Huda Beauty, MAC & Temptu Pro.' },
      { icon: 'brush', title: 'Hospital-Grade Brush Hygiene', description: '99.9% antibacterial brush & spatula sanitation between every client.' },
      { icon: 'wb_incandescent', title: 'CRI 98+ 5500K Vanity Mirrors', description: 'Camera-calibrated studio illumination for true undertone precision.' },
      { icon: 'workspace_premium', title: 'Certified Pro Makeup Academy', description: '600+ graduates trained on live models with portfolio shoots & EMI plans.' }
    ],
    gallery: [
      { id: 'ms-g1', url: '/templates/vogue-noir/gallery/bridal-1.webp', title: 'Crimson Velvet Royal Bride', tag: 'Bridal' },
      { id: 'ms-g2', url: '/templates/vogue-noir/gallery/party-1.webp', title: 'Cocktail Night Smoked Bronze', tag: 'Party' },
      { id: 'ms-g3', url: '/templates/vogue-noir/gallery/editorial-1.webp', title: 'Blush Crystal Haute Beauty', tag: 'Editorial' },
      { id: 'ms-g4', url: '/templates/vogue-noir/gallery/academy-work-1.webp', title: 'Pro Batch Live Model Assessment', tag: 'Academy Work' },
      { id: 'ms-g5', url: '/templates/vogue-noir/gallery/bridal-2.webp', title: 'Temple Gold South Bridal Glow', tag: 'Bridal' },
      { id: 'ms-g6', url: '/templates/vogue-noir/gallery/party-2.webp', title: 'Sangeet Plum & Champagne', tag: 'Party' }
    ],
    reviews: [
      { id: 'ms-r1', name: 'Ananya S.', location: 'Studio City', rating: 5, serviceName: 'Bridal Makeup', comment: 'My makeup stayed fresh through the celebrations and looked natural in photos. The team understood exactly what I wanted.', avatarUrl: '/templates/vogue-noir/testimonials/ananya.webp', date: 'Demo' },
      { id: 'ms-r2', name: 'Pooja R.', location: 'Studio City', rating: 5, serviceName: 'Pro Makeup Course', comment: 'I joined as a beginner and learnt a lot through hands-on practice. The team was encouraging throughout.', avatarUrl: '/templates/vogue-noir/testimonials/pooja.webp', date: 'Demo' },
      { id: 'ms-r3', name: 'Kriti M.', location: 'Studio City', rating: 5, serviceName: 'Airbrush Makeup', comment: 'Riya matched my makeup to my skin tone beautifully. It felt light and looked lovely all evening.', avatarUrl: '/templates/vogue-noir/testimonials/kriti.webp', date: 'Demo' },
      { id: 'ms-r4', name: 'Sana K.', location: 'Studio City', rating: 5, serviceName: 'Bridal Masterclass', comment: 'The classes gave me plenty of practice and helpful feedback. I’m glad I joined.', avatarUrl: '/templates/vogue-noir/testimonials/sana.webp', date: 'Demo' }
    ],
    totalReviewCount: 2500,
    averageRating: 5.0,
    landmark: '2nd Floor, Galleria Market, Sector 28',
    parkingInfo: 'Dedicated Galleria Market visitor parking available',
    openHourText: '10:00 AM',
    closeHourText: '8:00 PM'
  },

  massage_wellness: {
    foundingYear: '2017',
    foundingNarrative: 'Bodhi Tree is a welcoming massage and wellness studio in Jaipur. Our therapists offer relaxing massages and Ayurvedic treatments at our C-Scheme, Malviya Nagar, Vaishali Nagar and Bani Park branches.',
    specialties: ['Ayurvedic Abhyanga & Shirodhara', 'Deep Tissue & Thai Massage', 'Jaipur Palace Collection', 'Couple & Bridal Packages'],
    certifications: [
      { icon: 'verified', title: 'Trained Therapists', description: 'Every therapist is trained in Ayurvedic and classic massage.' },
      { icon: 'spa', title: 'Pure Natural Oils', description: 'Cold-pressed oils and real Ayurvedic herbs. No chemicals.' },
      { icon: 'dry_cleaning', title: 'Fresh Towels, Every Guest', description: 'Clean, washed towels and bedsheets for every single visit.' },
      { icon: 'payments', title: 'Honest ₹ Prices', description: 'Clear prices in rupees, shared before we start. No hidden charges.' }
    ],
    gallery: [
      { id: 'mw-g1', url: '/templates/bodhi-tree/gallery/spa-room.webp', title: 'Our calm treatment room', tag: 'Spa Room' },
      { id: 'mw-g2', url: '/templates/bodhi-tree/gallery/treatment.webp', title: 'Oil massage in progress', tag: 'Treatment' },
      { id: 'mw-g3', url: '/templates/bodhi-tree/gallery/marigold-diyas.webp', title: 'Marigold and diyas, Jaipur style', tag: 'Jaipur' },
      { id: 'mw-g4', url: '/templates/bodhi-tree/gallery/candles.webp', title: 'Candle-lit evenings', tag: 'Calm' },
      { id: 'mw-g5', url: '/templates/bodhi-tree/gallery/oils.webp', title: 'Pure oils we use', tag: 'Oils' },
      { id: 'mw-g6', url: '/templates/bodhi-tree/gallery/towels-herbs.webp', title: 'Fresh towels & herbal care', tag: 'Care' },
      { id: 'mw-g7', url: '/templates/bodhi-tree/gallery/lounge.webp', title: 'Relax corner', tag: 'Lounge' },
      { id: 'mw-g8', url: '/templates/bodhi-tree/gallery/herbal-tea.webp', title: 'Herbal tea after your massage', tag: 'Herbal Tea' },
      { id: 'mw-g9', url: '/templates/bodhi-tree/gallery/entrance.webp', title: 'Welcome to Bodhi Tree', tag: 'Entrance' },
      { id: 'mw-g10', url: '/templates/bodhi-tree/gallery/stones-flowers.webp', title: 'Stones & fresh flowers', tag: 'Care' }
    ],
    reviews: [
      { id: 'mw-r1', name: 'Neha S.', location: 'C-Scheme, Jaipur', rating: 5, serviceName: 'Abhyanga (Ayurvedic Oil Massage)', comment: 'Very calm place. The Abhyanga massage was so relaxing, I slept like a baby that night. Staff is polite and the rooms are clean.', avatarUrl: '/templates/bodhi-tree/testimonials/neha.webp', date: 'Demo' },
      { id: 'mw-r2', name: 'Rohit M.', location: 'Malviya Nagar, Jaipur', rating: 5, serviceName: 'Deep Tissue Massage', comment: 'My back pain from long desk work feels much better after the deep tissue massage. Good pressure, no hurry. Price is also fair.', avatarUrl: '', date: 'Demo' },
      { id: 'mw-r3', name: 'Priya K.', location: 'Vaishali Nagar, Jaipur', rating: 5, serviceName: 'Shirodhara', comment: 'Tried Shirodhara for the first time. The warm oil on the forehead is a different level of peace. Will come again with my mother.', avatarUrl: '/templates/bodhi-tree/testimonials/priya.webp', date: 'Demo' },
      { id: 'mw-r4', name: 'Aman J.', location: 'Bani Park, Jaipur', rating: 5, serviceName: "Couple's Massage", comment: "Booked the couple's massage for our anniversary. Private room, nice smell, very good service. The herbal tea at the end was a sweet touch.", avatarUrl: '', date: 'Demo' },
      { id: 'mw-r5', name: 'Sunita D.', location: 'C-Scheme, Jaipur', rating: 5, serviceName: 'Foot Reflexology', comment: 'I go every month for foot reflexology. My feet feel light and fresh. Booking on WhatsApp is very easy.', avatarUrl: '/templates/bodhi-tree/testimonials/sunita.webp', date: 'Demo' }
    ],
    totalReviewCount: 1250,
    averageRating: 4.9,
    landmark: 'Sardar Patel Marg, C-Scheme — near Ahinsa Circle',
    parkingInfo: 'Easy parking near all four Jaipur branches',
    openHourText: '9:00 AM',
    closeHourText: '9:00 PM'
  },

  hair_coloring: {
    foundingYear: '2018',
    foundingNarrative: 'Prism & Chroma offers balayage, global colour, highlights and colour correction. We check your hair, discuss the shade you want and share the price in ₹ before we begin.',
    specialties: ['Signature Balayage', 'Fashion & Pastel Colours', 'Colour Correction', 'Keratin & Gloss Care'],
    certifications: [
      { icon: 'verified', title: 'Patch Test First', description: 'A small patch test 24-48 hours before full colour keeps your skin safe.' },
      { icon: 'palette', title: 'Fresh-Mixed Colour', description: 'Your shade is mixed fresh for your hair and skin tone, never from a ready tube mix.' },
      { icon: 'flare', title: 'Bond-Care in Every Lightening', description: 'Bond-care products in every bleach and lightening service keep hair strong.' },
      { icon: 'workspace_premium', title: 'Trained Colour Experts', description: 'Colourists trained in balayage, pastel shades and colour correction.' }
    ],
    gallery: [
      { id: 'hc-g1', url: '/templates/10/hero.webp', title: 'Vivid balayage, fresh from the chair', tag: 'Balayage' },
      { id: 'hc-g2', url: '/templates/10/about.jpg', title: 'Mixing fresh colour in the studio', tag: 'Colour Lab' },
      { id: 'hc-g3', url: '/templates/10/gallery/gallery-3.jpg', title: 'Magenta muse colour', tag: 'Fashion Colour' },
      { id: 'hc-g4', url: '/templates/10/gallery/gallery-8.jpg', title: 'Global colour and blow-dry', tag: 'Global Colour' },
      { id: 'hc-g5', url: '/templates/10/gallery/gallery-4.jpg', title: 'Face-light highlights', tag: 'Highlights' },
      { id: 'hc-g6', url: '/templates/10/gallery/gallery-5.jpg', title: 'Pastel pink shades', tag: 'Fashion Colour' }
    ],
    reviews: [
      { id: 'hc-r1', name: 'Ananya Kapoor', location: 'Bandra West, Mumbai', rating: 5, serviceName: 'Signature Balayage', comment: 'Best balayage in Mumbai! The team first checked my hair, told me the full price, and only then started. Hair looks soft and shiny.', avatarUrl: '/templates/10/testimonials/ananya.jpg', date: '2 days ago' },
      { id: 'hc-r2', name: 'Ishita Rao', location: 'Hauz Khas, Delhi', rating: 5, serviceName: 'Fashion & Pastel Colours', comment: 'I got violet-magenta colour done here. The shade is exactly like the photo I showed. Three months later it still looks fresh.', avatarUrl: '/templates/10/testimonials/ishita.jpg', date: '1 week ago' },
      { id: 'hc-r3', name: 'Meera Joshi', location: 'Vaishali Nagar, Jaipur', rating: 5, serviceName: 'Colour Correction', comment: 'My home colour went orange and patchy. They fixed it in one visit and did not push extra services. Very honest people.', avatarUrl: '/templates/10/testimonials/meera.jpg', date: '2 weeks ago' }
    ],
    totalReviewCount: 1250,
    averageRating: 4.9,
    landmark: 'Linking Road, Bandra West, Near National College',
    parkingInfo: 'Paid parking available on Linking Road',
    openHourText: '10:00 AM',
    closeHourText: '8:30 PM'
  },

  bridal_lounge: {
    foundingYear: '2014',
    foundingNarrative: 'Shringaar Royal is a Jaipur bridal studio for wedding makeup, hair and draping. Our team will plan each look with you, from your first trial to the celebrations on the big day.',
    specialties: ['Royal Rajputana Bridal Trousseau', 'Sabyasachi Crimson Bridal Glam', 'Heritage Bridal Hair Architecture', 'Poshak & Dupatta Draping', 'Pre-Bridal Ubtan Glow'],
    certifications: [
      { icon: 'verified', title: 'Private Bridal Chambers', description: 'A suite for the bride and her bridal party, with chai, mirrors and daylight-balanced lights.' },
      { icon: 'diamond', title: 'Heirloom Jewellery Setting', description: 'Kundan, polki and matha patti set by the founder — pinned so nothing slips through the pheras.' },
      { icon: 'water_drop', title: '18-Hour Sealed Base', description: 'Airbrush and HD bases sealed for heat, tears and a fourteen-hour wedding day.' },
      { icon: 'stars', title: 'Written Look Book', description: 'Every bride leaves her trial with photographs, a drape plan and a pre-bridal calendar.' }
    ],
    gallery: [
      { id: 'sr-g1', url: '/templates/11/gallery/gallery-1.jpg', title: 'Heirloom Bridal Mehendi', tag: 'Mehendi' },
      { id: 'sr-g2', url: '/templates/11/gallery/gallery-2.jpg', title: 'Kundan Polki Heirlooms', tag: 'Jewellery' },
      { id: 'sr-g3', url: '/templates/11/gallery/gallery-3.jpg', title: 'Zardozi Lehenga Detail', tag: 'Couture' },
      { id: 'sr-g4', url: '/templates/11/gallery/gallery-4.jpg', title: 'The Zari Veil', tag: 'Draping' },
      { id: 'sr-g5', url: '/templates/11/gallery/gallery-5.jpg', title: 'Royal Rajputana Bride', tag: 'Bridal Look' },
      { id: 'sr-g6', url: '/templates/11/gallery/gallery-6.jpg', title: 'Palace Mandap at Dusk', tag: 'Venue' },
      { id: 'sr-g7', url: '/templates/11/gallery/gallery-7.jpg', title: 'Royal Poshak on Display', tag: 'Trousseau' },
      { id: 'sr-g8', url: '/templates/11/gallery/gallery-8.jpg', title: 'Pre-Bridal Ubtan Ritual', tag: 'Pre-Bridal' }
    ],
    reviews: [
      { id: 'sr-r1', name: 'Gayatri Rathore', location: 'C-Scheme, Jaipur', rating: 5, serviceName: 'Royal Rajputana Bridal Trousseau', comment: 'Anuradha helped me feel comfortable in my bridal look all day. The jewellery and drape stayed in place through every ceremony.', avatarUrl: '/templates/11/testimonials/bride-1.jpg', date: '3 weeks ago' },
      { id: 'sr-r2', name: 'Ananya Singhal', location: 'London → Jaipur', rating: 5, serviceName: 'Sangeet & Wedding Look Book', comment: 'I had one trial before my wedding events, and the team planned each look so they felt different but still suited me.', avatarUrl: '/templates/11/testimonials/bride-2.jpg', date: '2 months ago' },
      { id: 'sr-r3', name: 'Meher Bhandari', location: 'Rambagh, Jaipur', rating: 5, serviceName: 'Pre-Bridal 7-Day Ubtan & Glow Ritual', comment: 'The pre-bridal care felt gentle and well planned. I felt confident in my skin on the wedding day.', avatarUrl: '/templates/11/testimonials/bride-3.jpg', date: '4 months ago' }
    ],
    totalReviewCount: 1200,
    averageRating: 4.9,
    landmark: 'MI Road, near Panch Batti and Raj Mandir Cinema',
    parkingInfo: 'Private bridal courtyard with valet',
    openHourText: '10:00 AM',
    closeHourText: '8:30 PM'
  },

  tattoo_studio: {
    foundingYear: '2017',
    foundingNarrative: 'Iron & Ink is a tattoo and piercing studio on Church Street, Bengaluru. Talk to our artists about your idea, design and placement, and we’ll explain the process and aftercare before you decide.',
    specialties: ['Single-Needle Fine Line', 'Sacred Geometry & Mandalas', 'Micro-Realism Portraits', 'Titanium Body Piercings'],
    certifications: [
      { icon: 'verified', title: 'Hospital Class-B Autoclave Sterilization', description: 'Every grip, tube, and tool sanitized in medical vacuum chambers.' },
      { icon: 'colorize', title: 'Single-Use Sealed Needle Cartridges', description: 'Cheyenne and Kwadron sterile cartridges opened fresh in front of the client.' },
      { icon: 'eco', title: '100% Vegan Certified Inks', description: 'Kuro Sumi and Dynamic pure black pigments, non-toxic and hypoallergenic.' },
      { icon: 'healing', title: 'Medical Derm-Shield Aftercare', description: 'Second-skin sterile waterproof barrier application for 100% infection prevention.' }
    ],
    gallery: [
      { id: 'ts-g1', url: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80', title: 'Fine-Line Micro Realism Mandala', tag: 'Fine Line' },
      { id: 'ts-g2', url: 'https://images.unsplash.com/photo-1562962230-16e4623d36e6?auto=format&fit=crop&w=800&q=80', title: 'Sterile Black Metal Tattoo Station', tag: 'Studio Interior' },
      { id: 'ts-g3', url: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&w=800&q=80', title: 'Intricate Sacred Geometry Sleeve', tag: 'Custom Sleeve' },
      { id: 'ts-g4', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80', title: 'Consultation & Digital Stencil Drafting', tag: 'Custom Design' },
      { id: 'ts-g5', url: 'https://images.unsplash.com/photo-1517832606589-7157be614532?auto=format&fit=crop&w=800&q=80', title: 'Minimalist Botanical Floral Ankle Tattoo', tag: 'Minimalist' },
      { id: 'ts-g6', url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80', title: 'Implant-Grade Titanium Ear Curation', tag: 'Piercing' }
    ],
    reviews: [
      { id: 'ts-r1', name: 'Devendra Gowda', location: 'Church Street, Bengaluru', rating: 5, serviceName: 'Custom Fine-Line Sacred Geometry Tattoo', comment: 'Rudra took time to discuss my design and placement. The studio was clean and the whole process was explained clearly.', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', date: 'Yesterday' },
      { id: 'ts-r2', name: 'Natasha D’Souza', location: 'MG Road, Bengaluru', rating: 5, serviceName: 'Micro-Realism Pet Portrait', comment: 'The fine lines in my dog’s portrait came out beautifully. I also got clear advice on aftercare.', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', date: '3 days ago' },
      { id: 'ts-r3', name: 'Karthik Raman', location: 'Indiranagar, Bengaluru', rating: 5, serviceName: 'Implant-Grade Titanium Helix Piercing', comment: 'The team explained the piercing and aftercare, and the process was quick. The titanium jewellery looks great.', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', date: '1 week ago' }
    ],
    totalReviewCount: 790,
    averageRating: 4.99,
    landmark: 'Church Street, Off Brigade Road, Above Blossoms Book House',
    parkingInfo: 'MG Road Metro station parking 2 mins walk away',
    openHourText: '11:00 AM',
    closeHourText: '9:00 PM'
  },

  lash_brow: {
    foundingYear: '2019',
    foundingNarrative: 'Arch & Flutter is a lash and brow studio in C-Scheme, Jaipur. We’ll help you choose a look to suit your features, carry out a patch test when needed and confirm the price in ₹ before starting.',
    specialties: ['Russian Volume & Mega Volume Lashes', 'Keratin Lash Lift & Tint', 'Brow Lamination & Henna', 'Microblading & Powder Brows', 'Bridal Eye Packages'],
    certifications: [
      { icon: 'verified', title: 'Vegan, Fume-Free Adhesives', description: 'Latex-free and formaldehyde-free adhesives, safe for sensitive eyes and contact-lens wearers.' },
      { icon: 'remove_red_eye', title: 'Natural Lash Weight Safety', description: 'One extension or one hand-made fan per natural lash — 0.05mm ultra-light fibres, never stuck together.' },
      { icon: 'sanitizer', title: 'Single-Use & Sterilised Tools', description: 'PMU cartridges opened in front of you; tweezers autoclaved and UV-stored before every client.' },
      { icon: 'workspace_premium', title: 'Internationally Certified Artists', description: 'Lash, brow and PMU certifications with annual re-training on adhesive chemistry and mapping.' }
    ],
    gallery: [
      { id: 'af-g1', url: '/templates/13/art/lash.svg', title: 'Classic 1:1 lash set, lash by lash', tag: 'Lashes' },
      { id: 'af-g2', url: '/templates/13/art/lash-volume.svg', title: 'Russian volume fans, hand-made', tag: 'Volume' },
      { id: 'af-g3', url: '/templates/13/art/brow-lamination.svg', title: 'Brushed-up brow lamination', tag: 'Brows' },
      { id: 'af-g4', url: '/templates/13/art/microblading.svg', title: 'Microblading hair strokes', tag: 'PMU' },
      { id: 'af-g5', url: '/templates/13/art/studio.svg', title: 'The blush and gold studio', tag: 'Studio' },
      { id: 'af-g6', url: '/templates/13/art/eye-care.svg', title: 'Under-eye brightening care', tag: 'Eye Care' },
      { id: 'af-g7', url: '/templates/13/art/bridal.svg', title: 'Bridal eye package', tag: 'Bridal' },
      { id: 'af-g8', url: '/templates/13/art/tools.svg', title: 'Sterilised tools, single-use cartridges', tag: 'Hygiene' }
    ],
    reviews: [
      { id: 'af-r1', name: 'Sneha Agarwal', location: 'Vaishali Nagar, Jaipur', rating: 5, serviceName: 'Russian Volume 2D–3D Full Set', comment: 'I’ve been back to Meher a few times now. My lashes feel light, and she always checks the look with me.', avatarUrl: '/templates/13/art/team.svg', date: '3 days ago' },
      { id: 'af-r2', name: 'Priyanka Choudhary', location: 'Malviya Nagar, Jaipur', rating: 5, serviceName: 'Brow Lamination (Feathered Brushed-up)', comment: 'Ritika took care with my brow shape, and the result still looks neat weeks later. Very happy with it.', avatarUrl: '/templates/13/art/brow.svg', date: '1 week ago' },
      { id: 'af-r3', name: 'Farah Siddiqui', location: 'Raja Park, Jaipur', rating: 5, serviceName: 'Microblading Hair-stroke Brows (first sitting)', comment: 'Aisha explained each step before starting. My brows look natural, and I felt comfortable throughout.', avatarUrl: '/templates/13/art/microblading.svg', date: '2 weeks ago' }
    ],
    totalReviewCount: 1200,
    averageRating: 4.9,
    landmark: 'Ashok Marg, near Statue Circle and C-Scheme market',
    parkingInfo: 'Street parking plus a paid basement lot 50 m from the studio',
    openHourText: '10:00 AM',
    closeHourText: '8:00 PM'
  },

  ayurvedic_spa: {
    foundingYear: '2014',
    foundingNarrative: 'Veda Sanjeevani is an Ayurvedic wellness studio in Civil Lines, Kota. Each visit starts with a consultation, followed by a treatment planned around your needs and carried out by our trained team.',
    specialties: ['Shirodhara warm oil stream', 'Abhyanga full-body massage', 'Herbal potli (Kizhi) therapy', 'Mukha Lepam herbal face ritual'],
    certifications: [
      { icon: 'verified', title: 'Physician-led consultations', description: 'Every plan starts with a BAMS-qualified physician and a pulse reading.' },
      { icon: 'spa', title: 'Classical medicated oils', description: 'Oils warmed to body temperature and mixed in small batches each morning.' },
      { icon: 'local_florist', title: 'Fresh herb preparation', description: 'Leaf poultices and herbal pastes prepared the same day they are used.' },
      { icon: 'eco', title: 'Four rooms only', description: 'Unhurried slots with no corridor full of waiting guests.' }
    ],
    gallery: [
      { id: 'vs-g1', url: '/templates/14/shirodhara-800.webp', title: 'Shirodhara warm oil stream', tag: 'Shirodhara' },
      { id: 'vs-g2', url: '/templates/14/abhyanga-800.webp', title: 'Abhyanga room and carved teak table', tag: 'Abhyanga' },
      { id: 'vs-g3', url: '/templates/14/potli-800.webp', title: 'Herbal potli poultices prepared to order', tag: 'Kizhi' },
      { id: 'vs-g4', url: '/templates/14/steam-800.webp', title: 'Herbal steam suite', tag: 'Swedana' },
      { id: 'vs-g5', url: '/templates/14/herbs-800.webp', title: 'Turmeric, brahmi and rose in the preparation room', tag: 'Ingredients' }
    ],
    reviews: [
      { id: 'vs-r1', name: 'Ira Bansal', location: 'Talwandi, Kota', rating: 5, serviceName: 'Shirodhara Warm Oil Stream', comment: 'I booked after a busy month and found the treatment very relaxing. The room was peaceful and the team never rushed me.', avatarUrl: '/templates/14/herbs-480.webp', date: '3 days ago' },
      { id: 'vs-r2', name: 'Nikhil Sharma', location: 'Civil Lines, Kota', rating: 5, serviceName: 'Panchakarma Consultation & Plan', comment: 'The consultation was clear and honest. I appreciated that the team explained what the treatment could and couldn’t do.', avatarUrl: '/templates/14/ingredients-480.webp', date: '1 week ago' },
      { id: 'vs-r3', name: 'Ritika Jain', location: 'Rajeev Gandhi Nagar', rating: 5, serviceName: 'Abhyanga Full-Body Ayurvedic Massage', comment: 'The Abhyanga massage was deeply relaxing. I’ve booked another visit with my mother.', avatarUrl: '/templates/14/ritual-480.webp', date: '2 weeks ago' }
    ],
    totalReviewCount: 214,
    averageRating: 4.9,
    landmark: 'Civil Lines, near Talwandi Circle, Kota',
    parkingInfo: 'Courtyard parking for four cars and two-wheelers',
    openHourText: '09:30 AM',
    closeHourText: '08:00 PM'
  }
};
