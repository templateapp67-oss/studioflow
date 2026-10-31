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
  hair_salon: {
    foundingYear: '2019',
    foundingNarrative: 'Founded in Indiranagar by master hair artisans, Miraki was built to introduce geometric precision cutting, custom hair textures, and restorative botanical treatments without toxic formaldehyde or harsh chemical fumes.',
    specialties: ['Structural Bob & Layering', 'Formaldehyde-Free Smoothing', 'Scalp Barrier Detox', 'Bridal Blowouts'],
    certifications: [
      { icon: 'verified', title: '100% Autoclaved Shears', description: 'All Japanese steel shears & combs sanitized at 134°C between clients.' },
      { icon: 'eco', title: 'Cruelty-Free Formulas', description: 'Certified organic shampoos and European bond-building treatments.' },
      { icon: 'dry_cleaning', title: 'Single-Use Sealed Linen', description: 'Fresh biodegradable disposable salon capes for every appointment.' },
      { icon: 'workspace_premium', title: 'Vidal Sassoon Certified', description: 'Senior artists trained in international structural cutting techniques.' }
    ],
    gallery: [
      { id: 'hs-g1', url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80', title: 'Balayage Dimension & Blowdry', tag: 'Color & Cut' },
      { id: 'hs-g2', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', title: 'Precision Texturized Layers', tag: 'Precision Cut' },
      { id: 'hs-g3', url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80', title: 'Studio Styling Station & Chairs', tag: 'Studio Interior' },
      { id: 'hs-g4', url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=800&q=80', title: 'Mirror Shine Keratin Transformation', tag: 'Restoration' },
      { id: 'hs-g5', url: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=800&q=80', title: 'Thermal Soft Waves Styling', tag: 'Occasion Hair' },
      { id: 'hs-g6', url: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80', title: 'Consultation & Hair Diagnostics', tag: 'Consultation' }
    ],
    reviews: [
      { id: 'hs-r1', name: 'Pooja Mehra', location: 'Indiranagar, Bengaluru', rating: 5, serviceName: 'Formaldehyde-Free Keratin Smoothing', comment: 'Hands down the best hair studio in Bengaluru! My frizzy monsoon hair is silky straight yet retains natural bounce. The hygiene standard is unmatched.', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', date: '2 days ago' },
      { id: 'hs-r2', name: 'Aditya Sen', location: 'Koramangala, Bengaluru', rating: 5, serviceName: 'Master Stylist Precision Cut & Blowdry', comment: 'Ananya took 10 minutes just analyzing my face shape and crown geometry before picking up scissors. The precision is world-class.', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', date: '1 week ago' },
      { id: 'hs-r3', name: 'Kavita Rao', location: 'HSR Layout, Bengaluru', rating: 5, serviceName: 'Classic Layered Cut & Argan Wash', comment: 'Spotless salon, calming interior, and zero product pushing. You get exactly what you ask for with transparent ₹ pricing upfront.', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80', date: '2 weeks ago' }
    ],
    totalReviewCount: 524,
    averageRating: 4.96,
    landmark: 'Opposite Metro Pillar 128, Near 100 Feet Road Junction',
    parkingInfo: 'Valet parking available for all clients at studio entrance',
    openHourText: '10:00 AM',
    closeHourText: '8:30 PM'
  },

  barber: {
    foundingYear: '2018',
    foundingNarrative: 'The Royal Blade revives the gentleman’s sanctuary on Bandra’s 33rd Road. We pair time-honored straight razor hot towel shaves with modern skin fades, beard architecture, and imported organic pomades.',
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
      { id: 'bb-r1', name: 'Rohan Mehta', location: 'Bandra West, Mumbai', rating: 5, serviceName: 'Royal Maharaja Shave & Steam', comment: 'The eucalyptus hot towel followed by straight razor shave was pure heaven. Vikram is an absolute master of his craft. Unbelievable vibe!', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', date: 'Yesterday' },
      { id: 'bb-r2', name: 'Kabir Singhania', location: 'Juhu, Mumbai', rating: 5, serviceName: 'Signature Skin Fade & Beard Sculpt', comment: 'Found my permanent barber in Mumbai. Cleanest skin fade with razor-sharp beard edges. Super disciplined appointments with zero delays.', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80', date: '4 days ago' },
      { id: 'bb-r3', name: 'Farhan Merchant', location: 'Khar, Mumbai', rating: 5, serviceName: 'Executive Scissor Cut & Charcoal Hair Wash', comment: 'Old-world charm with top-tier hygiene. They sanitize every scissor and clippers right in front of you. Worth every single rupee.', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80', date: '1 week ago' }
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
    foundingNarrative: 'Aura was created as a welcoming unisex sanctuary in Koramangala where everyone — men, women and families — can look good and feel confident. From fresh haircuts and Inoa colour to de-tan cleanups and paraffin pedicures, our friendly team makes every visit comfortable, clean and relaxing.',
    specialties: ['Unisex Haircuts & Styling', 'Ammonia-Free Inoa Colour', 'Organic De-Tan Cleanups', 'Paraffin Spa Pedicures'],
    certifications: [
      { icon: 'verified', title: 'Hospital-Grade Hygiene', description: 'Dual UV-C autoclaves and sealed linen ensuring pristine equipment for every station.' },
      { icon: 'spa', title: 'Clean Dermatology Formulations', description: 'Hypoallergenic European & Korean aesthetic care lines, ammonia-free colour.' },
      { icon: 'group', title: 'Inclusive Care for Everyone', description: 'Dedicated Men’s Grooming, Women’s Beauty and Wellness zones under one roof.' },
      { icon: 'military_tech', title: 'Friendly Expert Team', description: 'Specialists in unisex cuts, colour and skin care with transparent ₹ pricing.' }
    ],
    gallery: [
      { id: 'us-g1', url: 'https://nexorasalon.online/templates/aura-unisex/hero.webp', title: 'Aura Salon — Look Good. Feel Fresh. Be You.', tag: 'Salon Hero' },
      { id: 'us-g2', url: 'https://nexorasalon.online/templates/aura-unisex/hero-men.webp', title: "Men's Haircut & Grooming", tag: 'Men\'s Grooming' },
      { id: 'us-g3', url: 'https://nexorasalon.online/templates/aura-unisex/hero-women.webp', title: "Women's Hair & Beauty", tag: 'Women\'s Beauty' },
      { id: 'us-g4', url: 'https://nexorasalon.online/templates/aura-unisex/about-interior.webp', title: 'Bright Unisex Salon with Sage Green Chairs', tag: 'Salon Interior' },
      { id: 'us-g5', url: 'https://nexorasalon.online/templates/aura-unisex/about-work.webp', title: 'Priya Nair — Salon Care', tag: 'Our Work' },
      { id: 'us-g6', url: 'https://nexorasalon.online/templates/aura-unisex/wellness.webp', title: 'Calm, Clean Wellness Room for All Customers', tag: 'Wellness' }
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
    foundingNarrative: 'Roop Mahal is a Connaught Place beauty parlour and makeover space celebrating Indian bridal artistry, signature herbal facials, graceful hair styling, and thoughtful everyday beauty care.',
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
    foundingNarrative: 'Polished Palette was established to turn nail aesthetics into bespoke micro-art. From mirror-chrome glazed donuts to Russian cuticle precision, our studio sets the benchmark for high-fashion nail extensions.',
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
      { id: 'ns-r1', name: 'Ayesha Shroff', location: 'Jubilee Hills, Hyderabad', rating: 5, serviceName: 'Russian Dry E-File Gel Manicure', comment: 'My nails have never looked this clean. The Russian technique is unbelievable—zero hangnails and still perfect after 3 weeks!', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', date: '3 days ago' },
      { id: 'ns-r2', name: 'Zoya Qureshi', location: 'Banjara Hills, Hyderabad', rating: 5, serviceName: 'Full Set Sculpted Hard Gel Extensions', comment: 'They created the exact Pinterest chrome design I requested. The studio has built-in dust collectors so no chemical smells whatsoever.', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80', date: '1 week ago' },
      { id: 'ns-r3', name: 'Sneha Reddy', location: 'Gachibowli, Hyderabad', rating: 5, serviceName: 'Cat-Eye Magnetic Gel Overlay', comment: 'The lighting, velvet chairs, and iced green tea they serve makes this a 5-star experience every single time.', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', date: '2 weeks ago' }
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
    foundingNarrative: 'Dermalux is a clinical medical-aesthetic clinic bridging certified dermatology science and luxurious restorative facial protocols. We specialize in non-invasive skin remodeling, pigmentation correction, and medical hydra-dermabrasion.',
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
      { id: 'sc-r1', name: 'Dr. Shalini Ghosh', location: 'Salt Lake Sector V, Kolkata', rating: 5, serviceName: 'Hydra-Facial MD with Peptides', comment: 'As a medical professional, I am extremely picky about clinics. Dermalux maintains flawless sterilization and top US-FDA machines. Skin looked radiant!', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', date: '2 days ago' },
      { id: 'sc-r2', name: 'Tanmoy Mukherjee', location: 'Park Street, Kolkata', rating: 5, serviceName: 'Clinical Carbon Laser Peel', comment: 'Removed stubborn open pores and hyperpigmentation after just 2 sessions. Transparent pricing and no false promises.', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', date: '5 days ago' },
      { id: 'sc-r3', name: 'Sayantani Sen', location: 'New Town, Kolkata', rating: 5, serviceName: 'Glutathione Brightening Peel', comment: 'Zero downtime and glowing skin for my cousin’s wedding. The team explains every ingredient they apply to your face.', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', date: '2 weeks ago' }
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
    foundingNarrative: 'Vogue Noir Makeup Studio & Academy blends editorial skin minimalism with heirloom Indian bridal artistry and hands-on certified pro makeup education.',
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
      { id: 'ms-r1', name: 'Ananya S.', location: 'Studio City', rating: 5, serviceName: 'Bridal Makeup', comment: 'Flawless skin finish that lasted 14 hours through tears and dancing. Looked natural in person and stunning on camera!', avatarUrl: '/templates/vogue-noir/testimonials/ananya.webp', date: 'Demo' },
      { id: 'ms-r2', name: 'Pooja R.', location: 'Studio City', rating: 5, serviceName: 'Pro Makeup Course', comment: 'Joined with zero experience, graduated with a full bridal portfolio and started taking paid clients within a month.', avatarUrl: '/templates/vogue-noir/testimonials/pooja.webp', date: 'Demo' },
      { id: 'ms-r3', name: 'Kriti M.', location: 'Studio City', rating: 5, serviceName: 'Airbrush Makeup', comment: 'Riya understood my skin tone perfectly. No cakey layers, just pure luxury glow.', avatarUrl: '/templates/vogue-noir/testimonials/kriti.webp', date: 'Demo' },
      { id: 'ms-r4', name: 'Sana K.', location: 'Studio City', rating: 5, serviceName: 'Bridal Masterclass', comment: 'Hands-on practice on real models, international products, and supportive mentors. Worth every rupee.', avatarUrl: '/templates/vogue-noir/testimonials/sana.webp', date: 'Demo' }
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
    foundingNarrative: 'Bodhi Tree is a calm massage and wellness place in the heart of Jaipur. Our trained therapists use pure oils and Ayurvedic methods to help you relax, sleep better and feel fresh. Four branches across the Pink City — C-Scheme, Malviya Nagar, Vaishali Nagar and Bani Park.',
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
    foundingNarrative: 'Prism & Chroma is a premium hair colour studio. We do balayage, global colour, fashion and pastel shades, highlights, colour correction, keratin and gloss treatments — with a full hair-health check and a clear price in ₹ before we start.',
    specialties: ['Signature Balayage', 'Fashion & Pastel Colours', 'Colour Correction', 'Keratin & Gloss Care'],
    certifications: [
      { icon: 'verified', title: 'Patch Test First', description: 'A small patch test 24-48 hours before full colour keeps your skin safe.' },
      { icon: 'palette', title: 'Fresh-Mixed Colour', description: 'Your shade is mixed fresh for your hair and skin tone, never from a ready tube mix.' },
      { icon: 'flare', title: 'Bond-Care in Every Lightening', description: 'Bond-care products in every bleach and lightening service keep hair strong.' },
      { icon: 'workspace_premium', title: 'Trained Colour Experts', description: 'Colourists trained in balayage, pastel shades and colour correction.' }
    ],
    gallery: [
      { id: 'hc-g1', url: '/templates/10/hero.jpg', title: 'Vivid balayage, fresh from the chair', tag: 'Balayage' },
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
    foundingNarrative: 'Shringaar Royal is Jaipur’s bridal atelier for Rajputana trousseaus, kundan heirloom styling and hand-draped poshaks. Eleven wedding seasons of private bridal chambers, written look books and pre-bridal ubtan rituals, styled for the bride who wants to be remembered.',
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
      { id: 'sr-r1', name: 'Gayatri Rathore', location: 'C-Scheme, Jaipur', rating: 5, serviceName: 'Royal Rajputana Bridal Trousseau', comment: 'Fifteen kilos of zardozi and not one pin slipped from the varmala to the vidaai. Anuradha set my grandmother’s polki herself, and the base was still flawless at 2 am.', avatarUrl: '/templates/11/testimonials/bride-1.jpg', date: '3 weeks ago' },
      { id: 'sr-r2', name: 'Ananya Singhal', location: 'London → Jaipur', rating: 5, serviceName: 'Sangeet & Wedding Look Book', comment: 'I flew in for a three-day wedding and had exactly one trial. The look book meant my sangeet and wedding looks matched without repeating a single thing.', avatarUrl: '/templates/11/testimonials/bride-2.jpg', date: '2 months ago' },
      { id: 'sr-r3', name: 'Meher Bhandari', location: 'Rambagh, Jaipur', rating: 5, serviceName: 'Pre-Bridal 7-Day Ubtan & Glow Ritual', comment: 'The seven-day ubtan plan is the reason my skin needed almost no base. My photographer asked who did my makeup before he asked for my name.', avatarUrl: '/templates/11/testimonials/bride-3.jpg', date: '4 months ago' }
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
    foundingNarrative: 'Iron & Ink is Bengaluru’s foremost sterile custom tattoo and body piercing studio on Church Street. We specialize in intricate fine-line micro-realism, sacred geometry, and custom Indian mythological sleeves.',
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
      { id: 'ts-r1', name: 'Devendra Gowda', location: 'Church Street, Bengaluru', rating: 5, serviceName: 'Custom Fine-Line Sacred Geometry Tattoo', comment: 'Rudra is a genius. Cleanest needle work in India. The studio hygiene looks cleaner than a hospital operating theatre. 10/10.', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', date: 'Yesterday' },
      { id: 'ts-r2', name: 'Natasha D’Souza', location: 'MG Road, Bengaluru', rating: 5, serviceName: 'Micro-Realism Pet Portrait', comment: 'The fine line detail on my dog’s portrait blew my mind. Healed seamlessly with the Derm-Shield they provided.', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', date: '3 days ago' },
      { id: 'ts-r3', name: 'Karthik Raman', location: 'Indiranagar, Bengaluru', rating: 5, serviceName: 'Implant-Grade Titanium Helix Piercing', comment: 'Pierced with surgical needle, not a gun! Virtually zero pain, and the titanium jewelry looks stunning.', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', date: '1 week ago' }
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
    foundingNarrative: 'Arch & Flutter is Jaipur’s eye-area-only atelier on Ashok Marg, C-Scheme. Seven seasons of feather-light Russian volume, golden-ratio brow mapping, brushed-up laminations and semi-permanent powder brows — every set face-mapped, patch tested and priced honestly in ₹, GST included.',
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
      { id: 'af-r1', name: 'Sneha Agarwal', location: 'Vaishali Nagar, Jaipur', rating: 5, serviceName: 'Russian Volume 2D–3D Full Set', comment: 'Third set with Meher and my natural lashes are healthier than before she started. Lightest lashes in Jaipur, I have compared.', avatarUrl: '/templates/13/art/team.svg', date: '3 days ago' },
      { id: 'af-r2', name: 'Priyanka Choudhary', location: 'Malviya Nagar, Jaipur', rating: 5, serviceName: 'Brow Lamination (Feathered Brushed-up)', comment: 'Ritika mapped my brows with actual calipers before touching them. Six weeks later they still brush up perfectly. Worth every rupee.', avatarUrl: '/templates/13/art/brow.svg', date: '1 week ago' },
      { id: 'af-r3', name: 'Farah Siddiqui', location: 'Raja Park, Jaipur', rating: 5, serviceName: 'Microblading Hair-stroke Brows (first sitting)', comment: 'Aisha explained the pigment, showed the sealed cartridge and numbed me properly. The strokes look like my own brow, just more of it.', avatarUrl: '/templates/13/art/microblading.svg', date: '2 weeks ago' }
    ],
    totalReviewCount: 1200,
    averageRating: 4.9,
    landmark: 'Ashok Marg, near Statue Circle and C-Scheme market',
    parkingInfo: 'Street parking plus a paid basement lot 50 m from the studio',
    openHourText: '10:00 AM',
    closeHourText: '8:00 PM'
  },

  ayurvedic_spa: {
    foundingYear: '2016',
    foundingNarrative: 'Sanjivani Ayurvedic Rejuvenation Spa honors the centuries-old Kerala Vaidya tradition in Chennai. We practice authentic Panchakarma therapies, continuous warm herbal Shirodhara oil streams, and Kizhi herbal poultice therapies.',
    specialties: ['Shirodhara Medicated Oil Stream', 'Traditional Kerala Abhyanga', 'Navara Kizhi Rice Poultice', 'Mukha Lepam Herbal Facial'],
    certifications: [
      { icon: 'verified', title: 'Authentic Kerala Droni Wooden Beds', description: 'Handcrafted seasoned Neem and Vengai wood massage tables.' },
      { icon: 'spa', title: 'Kottakkal Arya Vaidya Sala Oils', description: 'Certified classical medicated thailams prepared per Ashtanga Hridaya texts.' },
      { icon: 'local_pharmacy', title: 'Consultations by BAMS Ayurvedic Doctors', description: 'Prakriti (Vata, Pitta, Kapha) dosha analysis before oil formulation.' },
      { icon: 'eco', title: '100% Chemical-Free Botanical Care', description: 'Organic sun-dried wild herbs, cow’s milk, and Navara medicinal rice.' }
    ],
    gallery: [
      { id: 'ay-g1', url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80', title: 'Bronze Vessel Shirodhara Oil Stream', tag: 'Shirodhara' },
      { id: 'ay-g2', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80', title: 'Authentic Teakwood Droni Therapy Bed', tag: 'Traditional Bed' },
      { id: 'ay-g3', url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80', title: 'Warm Herbal Kizhi Poultice Preparation', tag: 'Herbal Kizhi' },
      { id: 'ay-g4', url: 'https://images.unsplash.com/photo-1512290900672-1f55b9e07506?auto=format&fit=crop&w=800&q=80', title: 'Brass Herb Steamer & Herbal Bath', tag: 'Herbal Steam' },
      { id: 'ay-g5', url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80', title: 'Ayurvedic Doctor Consultation Chamber', tag: 'Diagnostics' },
      { id: 'ay-g6', url: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=800&q=80', title: 'Classical Medicated Tailam Dispensary', tag: 'Herbal Oils' }
    ],
    reviews: [
      { id: 'ay-r1', name: 'Sundararajan Krishnan', location: 'Besant Nagar, Chennai', rating: 5, serviceName: 'Authentic Kerala Shirodhara & Abhyanga', comment: 'The Shirodhara with warm medicated sesame oil cured my insomnia within 2 sessions. Genuine Kerala Vaidyas and pristine herbal aromas.', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', date: '2 days ago' },
      { id: 'ay-r2', name: 'Lakshmi Narayanan', location: 'Adyar, Chennai', rating: 5, serviceName: 'Navara Kizhi Herbal Rice Poultice', comment: 'Healed severe joint stiffness in my knees. Dr. Nair conducted an in-depth pulse reading and prescribed the exact herbal regimen.', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', date: '6 days ago' },
      { id: 'ay-r3', name: 'Madhavan Venkat', location: 'Thiruvanmiyur, Chennai', rating: 5, serviceName: 'Traditional Mukha Lepam Herbal Facial', comment: 'Leaves you completely grounded and peaceful. The teakwood droni and copper vessels show their deep respect for classical tradition.', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', date: '2 weeks ago' }
    ],
    totalReviewCount: 810,
    averageRating: 4.98,
    landmark: 'Beach Road, Besant Nagar, Near Elliot’s Beach Promenade',
    parkingInfo: 'Private garden compound with ample car parking space',
    openHourText: '08:30 AM',
    closeHourText: '8:30 PM'
  }
};
