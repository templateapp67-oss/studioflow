import type {
  SalonProfile,
  SalonService,
  Stylist,
  VogueNoirAcademyCourse,
  VogueNoirBeforeAfterItem,
  VogueNoirBridalPackage,
  VogueNoirConfig,
  VogueNoirFaqItem,
  VogueNoirPortfolioCategory,
  VogueNoirPortfolioItem,
  VogueNoirReviewItem,
  VogueNoirStatItem,
  VogueNoirThemeColors,
} from '../types';

export const VOGUE_NOIR_SELECTOR_LABEL = 'Vogue Noir (08)';
export const VOGUE_NOIR_BRAND_NAME = 'Vogue Noir Makeup Studio & Academy';
export const VOGUE_NOIR_HERO_HEADING = 'Luxury Makeup, Made For Every Indian Bride';
export const VOGUE_NOIR_TAGLINE =
  'Aapki Shaadi, Aapka Glow';
export const VOGUE_NOIR_DEFAULT_ADDRESS =
  'Greater Kailash, New Delhi, Delhi 110048 (demo address)';
export const VOGUE_NOIR_DEFAULT_CITY = 'New Delhi';
export const VOGUE_NOIR_DEFAULT_POSTAL_CODE = '110048';
export const VOGUE_NOIR_DEFAULT_PHONE = '+91 90000 00000';
export const VOGUE_NOIR_DEFAULT_EMAIL = 'hello@voguenoir.example';
export const VOGUE_NOIR_DEFAULT_HOURS =
  'Mon-Sat 10:00 AM - 8:00 PM, Sun by appointment';

export const VOGUE_NOIR_DEFAULT_COLORS: VogueNoirThemeColors = {
  bgPrimary: '#0B0B0C',
  bgSurface: '#151517',
  borderSubtle: '#2A2A2D',
  accentGold: '#C9A96E',
  textPrimary: '#F5EFE6',
  textMuted: '#A8A29A',
  highlightBlush: '#E8C4C4',
};

export const VOGUE_NOIR_IMAGES = {
  logoSvg: '/templates/vogue-noir/logo.svg',
  logoPng: '/templates/vogue-noir/logo.png',
  heroDesktop: '/templates/vogue-noir/hero-1.webp',
  heroMobile: '/templates/vogue-noir/hero-mobile.webp',
  about: '/templates/vogue-noir/about.webp',
  ogImage: '/templates/vogue-noir/og-image.jpg',
  faviconSvg: '/templates/vogue-noir/favicon.svg',
  favicon32: '/templates/vogue-noir/favicon-32x32.png',
  favicon192: '/templates/vogue-noir/favicon-192x192.png',
  appleTouchIcon: '/templates/vogue-noir/apple-touch-icon.png',
  services: {
    bridal: '/templates/vogue-noir/services/bridal.webp',
    engagement: '/templates/vogue-noir/services/engagement.webp',
    party: '/templates/vogue-noir/services/party.webp',
    hd: '/templates/vogue-noir/services/hd.webp',
    airbrush: '/templates/vogue-noir/services/airbrush.webp',
    photoshoot: '/templates/vogue-noir/services/photoshoot.webp',
    hair: '/templates/vogue-noir/services/hair.webp',
    draping: '/templates/vogue-noir/services/draping.webp',
    mehendiHaldi: '/templates/vogue-noir/services/mehendi-haldi.webp',
  },
  packages: {
    classic: '/templates/vogue-noir/packages/classic.webp',
    signature: '/templates/vogue-noir/packages/signature.webp',
    royal: '/templates/vogue-noir/packages/royal.webp',
  },
  academy: {
    hero: '/templates/vogue-noir/academy/hero.webp',
    beginner: '/templates/vogue-noir/academy/beginner-course.webp',
    pro: '/templates/vogue-noir/academy/pro-course.webp',
    bridalMasterclass: '/templates/vogue-noir/academy/bridal-masterclass.webp',
    selfMakeup: '/templates/vogue-noir/academy/self-makeup.webp',
  },
  artists: {
    riya: '/templates/vogue-noir/artists/riya-kapoor.webp',
    simran: '/templates/vogue-noir/artists/simran-sethi.webp',
    aarav: '/templates/vogue-noir/artists/aarav-mehta.webp',
    neha: '/templates/vogue-noir/artists/neha-joshi.webp',
  },
  testimonials: {
    ananya: '/templates/vogue-noir/testimonials/ananya.webp',
    pooja: '/templates/vogue-noir/testimonials/pooja.webp',
    kriti: '/templates/vogue-noir/testimonials/kriti.webp',
    sana: '/templates/vogue-noir/testimonials/sana.webp',
  },
  gallery: {
    bridal1: '/templates/vogue-noir/gallery/bridal-1.webp',
    bridal2: '/templates/vogue-noir/gallery/bridal-2.webp',
    bridal3: '/templates/vogue-noir/gallery/bridal-3.webp',
    bridal4: '/templates/vogue-noir/gallery/bridal-4.webp',
    bridal5: '/templates/vogue-noir/gallery/bridal-5.webp',
    bridal6: '/templates/vogue-noir/gallery/bridal-6.webp',
    party1: '/templates/vogue-noir/gallery/party-1.webp',
    party2: '/templates/vogue-noir/gallery/party-2.webp',
    party3: '/templates/vogue-noir/gallery/party-3.webp',
    party4: '/templates/vogue-noir/gallery/party-4.webp',
    editorial1: '/templates/vogue-noir/gallery/editorial-1.webp',
    editorial2: '/templates/vogue-noir/gallery/editorial-2.webp',
    editorial3: '/templates/vogue-noir/gallery/editorial-3.webp',
    academy1: '/templates/vogue-noir/gallery/academy-work-1.webp',
    academy2: '/templates/vogue-noir/gallery/academy-work-2.webp',
    academy3: '/templates/vogue-noir/gallery/academy-work-3.webp',
    before1: '/templates/vogue-noir/gallery/before-1.webp',
    after1: '/templates/vogue-noir/gallery/after-1.webp',
    before2: '/templates/vogue-noir/gallery/before-2.webp',
    after2: '/templates/vogue-noir/gallery/after-2.webp',
  },
} as const;

export const VOGUE_NOIR_DEFAULT_ABOUT =
  'Vogue Noir is a premium makeup studio and academy, trusted by brides across Delhi, Mumbai, Bengaluru and more. We believe makeup should make you look like the best version of yourself, not like someone else. Our artists are trained in every Indian skin tone and bridal tradition, so your look stays perfect from the pheras to the last dance at the reception.';

export const VOGUE_NOIR_DEFAULT_STATS: VogueNoirStatItem[] = [
  { id: 'vn-stat-1', value: '8+', label: 'Years Experience' },
  { id: 'vn-stat-2', value: '5,000+', label: 'Happy Brides' },
  { id: 'vn-stat-3', value: '1,200+', label: 'Students Trained' },
  { id: 'vn-stat-4', value: '11', label: 'Cities' },
];

export const VOGUE_NOIR_CORE_SERVICES: SalonService[] = [
  { id: "vn-s1", name: "Bridal Makeup", category: "Bridal Studio", durationMinutes: 180, price: 25000, description: "HD or airbrush makeup for wedding photos and videos.", icon: "Sparkles", imageUrl: VOGUE_NOIR_IMAGES.services.bridal },
  { id: "vn-s2", name: "Engagement / Roka Makeup", category: "Bridal Studio", durationMinutes: 150, price: 12000, description: "Elegant glam as per your outfit.", icon: "Sparkles", imageUrl: VOGUE_NOIR_IMAGES.services.engagement },
  { id: "vn-s10", name: "Reception Makeup", category: "Bridal Studio", durationMinutes: 150, price: 15000, description: "Bold, party-ready look.", icon: "Sparkles", imageUrl: VOGUE_NOIR_IMAGES.services.engagement },
  { id: "vn-s3", name: "Party Makeup", category: "Occasion Makeup", durationMinutes: 90, price: 4500, description: "Perfect for birthdays, cocktail nights and functions.", icon: "Sparkles", imageUrl: VOGUE_NOIR_IMAGES.services.party },
  { id: "vn-s4", name: "HD Makeup", category: "Complexion Artistry", durationMinutes: 120, price: 7500, description: "Flawless, camera-ready skin.", icon: "Sparkles", imageUrl: VOGUE_NOIR_IMAGES.services.hd },
  { id: "vn-s5", name: "Airbrush Makeup", category: "Complexion Artistry", durationMinutes: 120, price: 11000, description: "Lightweight, sweat-resistant finish.", icon: "Sparkles", imageUrl: VOGUE_NOIR_IMAGES.services.airbrush },
  { id: "vn-s9", name: "Mehendi / Haldi Makeup", category: "Bridal Studio", durationMinutes: 90, price: 4000, description: "Fresh, natural and photo-friendly.", icon: "Sparkles", imageUrl: VOGUE_NOIR_IMAGES.services.mehendiHaldi },
  { id: "vn-s11", name: "Sangeet Makeup", category: "Occasion Makeup", durationMinutes: 120, price: 8000, description: "Glam that lasts through the celebration.", icon: "Sparkles", imageUrl: VOGUE_NOIR_IMAGES.services.party },
  { id: "vn-s6", name: "Pre-Wedding Shoot Makeup", category: "Editorial & Shoot", durationMinutes: 120, price: 9000, description: "Camera-ready looks for your shoot.", icon: "Sparkles", imageUrl: VOGUE_NOIR_IMAGES.services.photoshoot },
  { id: "vn-s7", name: "Hair Styling", category: "Hair & Finishing", durationMinutes: 60, price: 3000, description: "Buns, curls, braids and bridal hairdos.", icon: "Sparkles", imageUrl: VOGUE_NOIR_IMAGES.services.hair },
  { id: "vn-s8", name: "Saree / Lehenga Draping", category: "Hair & Finishing", durationMinutes: 45, price: 2000, description: "Neat pleats, perfectly pinned.", icon: "Sparkles", imageUrl: VOGUE_NOIR_IMAGES.services.draping },
  { id: "vn-s12", name: "Family Makeup (Mom / Sister / Bridesmaid)", category: "Occasion Makeup", durationMinutes: 90, price: 5000, description: "Makeup for family and bridesmaids; price per person.", icon: "Sparkles", imageUrl: VOGUE_NOIR_IMAGES.services.party },
];

export const VOGUE_NOIR_PACKAGE_SERVICES: SalonService[] = [
  { id: "vn-pkg-classic", name: "Classic Dulhan", category: "Packages", durationMinutes: 180, price: 35000, description: "HD bridal makeup, hairstyle, draping and touch-up kit.", icon: "Crown", imageUrl: VOGUE_NOIR_IMAGES.packages.classic },
  { id: "vn-pkg-signature", name: "Signature Dulhan", category: "Packages", durationMinutes: 180, price: 60000, description: "Airbrush bridal makeup, hairstyle, draping, trial, lashes and touch-up kit.", icon: "Crown", imageUrl: VOGUE_NOIR_IMAGES.packages.signature },
  { id: "vn-pkg-royal", name: "Royal Dulhan", category: "Packages", durationMinutes: 180, price: 125000, description: "Two functions, senior artist, trial, family makeup for two, draping and premium touch-up kit.", icon: "Crown", imageUrl: VOGUE_NOIR_IMAGES.packages.royal },
];

export const VOGUE_NOIR_TEMPLATE_SERVICES: SalonService[] = [
  ...VOGUE_NOIR_CORE_SERVICES,
  ...VOGUE_NOIR_PACKAGE_SERVICES,
];

export const VOGUE_NOIR_DEFAULT_BRIDAL_PACKAGES: VogueNoirBridalPackage[] = [
  { id: 'bridal-tier-classic', tier: 'Classic Dulhan', price: 35000, imageUrl: VOGUE_NOIR_IMAGES.packages.classic, linkedServiceId: 'vn-pkg-classic', inclusions: ['HD bridal makeup', 'Hairstyle', 'Saree / lehenga draping', 'Touch-up kit'] },
  { id: 'bridal-tier-signature', tier: 'Signature Dulhan', price: 60000, popular: true, badgeLabel: 'Most Popular', imageUrl: VOGUE_NOIR_IMAGES.packages.signature, linkedServiceId: 'vn-pkg-signature', inclusions: ['Airbrush bridal makeup', 'Hairstyle and draping', 'Pre-bridal trial', 'False lashes and touch-up kit'] },
  { id: 'bridal-tier-royal', tier: 'Royal Dulhan', price: 125000, imageUrl: VOGUE_NOIR_IMAGES.packages.royal, linkedServiceId: 'vn-pkg-royal', inclusions: ['Full-day service for two functions', 'Senior artist and trial', 'Family makeup for two', 'Draping and premium touch-up kit'] },
];

export const VOGUE_NOIR_DEFAULT_ACADEMY_HIGHLIGHTS: string[] = [
  'Small batches of up to 8 students and live model practice',
  'Product kit guidance, internship support and certificate on completion',
  'Offline classes and online batches; ask about available EMI options',
];

export const VOGUE_NOIR_DEFAULT_COURSES: VogueNoirAcademyCourse[] = [
  {
    id: 'vn-course-beginner',
    title: 'Beginner Makeup Artistry Course',
    duration: '2 Weeks',
    fee: 25000,
    imageUrl: VOGUE_NOIR_IMAGES.academy.beginner,
    imageAlt: 'Beginner Makeup Artistry Course skin prep and brush technique session',
    summary:
      'Build rock-solid fundamentals in skin anatomy, undertone matching, hygiene, and wearable day-to-evening beauty.',
    certification: 'Vogue Noir Foundation Certificate in Makeup Artistry',
    emiNote: '2-part installment plan available',
    syllabus: [
      'Module 1: Skin Types, Luxury Prep Rituals & Studio Hygiene Standards',
      'Module 2: Color Theory, Undertone Correction & Seamless Base Blending',
      'Module 3: Soft Sculpting, Blush Placement & Natural Brow Architecture',
      'Module 4: Daytime Soft-Glam & Classic Evening Smoky Eye Techniques',
      'Module 5: Lash Application, Lip Symmetry & Live Model Assessment',
    ],
  },
  {
    id: 'vn-course-pro',
    title: 'Professional Makeup Artist Course',
    duration: '8 Weeks',
    fee: 95000,
    imageUrl: VOGUE_NOIR_IMAGES.academy.pro,
    imageAlt: 'Professional Makeup Artist Course airbrush training and portfolio shoot',
    summary:
      'Our flagship career-launch diploma covering HD, silicone airbrush, bridal couture, editorial lighting, and client business.',
    certification: 'Certified Pro Makeup Artist Diploma + 4-Look Studio Portfolio Shoot',
    emiNote: 'Ask about EMI and flexible instalment options',
    syllabus: [
      'Module 1: Advanced Skin Dermatology Prep, Color Correction & Mature Skin',
      'Module 2: High-Definition (HD) vs Silicone Airbrush Complexion Mastery',
      'Module 3: Editorial Eye Artistry — Halo, Cut-Crease, Graphic & Waterproof Kohl',
      'Module 4: Complete Indian Bridal Looks (North, South, Reception & Nikah)',
      'Module 5: Bridal Hair Styling Fundamentals, Extensions & Couture Draping',
      'Module 6: 4K Studio Portfolio Shoot, Pricing Strategy & Client Acquisition',
    ],
  },
  {
    id: 'vn-course-bridal',
    title: 'Bridal Makeup Masterclass',
    duration: '3 Weeks',
    fee: 55000,
    imageUrl: VOGUE_NOIR_IMAGES.academy.bridalMasterclass,
    imageAlt: 'Bridal Makeup Masterclass couture bridal eye and jewelry styling demonstration',
    summary:
      'Intensive specialization for practicing artists upgrading to luxury high-ticket HD & airbrush bridal bookings.',
    certification: 'Master Bridal Specialist Certification + 2 Bridal Portfolio Looks',
    emiNote: 'Ask about instalment options',
    syllabus: [
      'Module 1: Long-Wear 16-Hour Humidity & Tear-Proof Bridal Skin Engineering',
      'Module 2: Signature Reception, Sangeet & Royal Red-Lehenga Eye Palettes',
      'Module 3: Luxury International Kit Curation (Dior, NARS, Charlotte Tilbury, Huda)',
      'Module 4: Double-Dupatta Pinning, Mathapatti/Nath Setting & Venue Speed Workflow',
      'Module 5: Bridal Trial Consultation Etiquette & High-Ticket Package Positioning',
    ],
  },
  {
    id: 'vn-course-self',
    title: 'Self-Makeup Workshop',
    duration: '1 Day',
    fee: 3999,
    imageUrl: VOGUE_NOIR_IMAGES.academy.selfMakeup,
    imageAlt: 'Self-Makeup Workshop luxury personal makeup kit and brush flatlay',
    summary:
      'Personalized 1-day hands-on workshop to master your own everyday office glow and 15-minute festive party look.',
    certification: 'Personal Beauty Lookbook Sheet + Curated Product Shopping Guide',
    emiNote: 'Full vanity & brushes provided during workshop',
    syllabus: [
      'Module 1: Personal Skin Analysis & Auditing Your Existing Makeup Pouch',
      'Module 2: 5-Minute Flawless Everyday Base, Concealer & Cream Blush',
      'Module 3: Effortless Winged Liner, Festive Shimmer Lid & Lash Curling',
      'Module 4: Day-to-Night Lip Transition & Longevity Setting Mist Technique',
    ],
  },
];

export const VOGUE_NOIR_DEFAULT_STYLISTS: Stylist[] = [
  {
    id: 'vn-st-1',
    name: 'Riya Kapoor',
    role: 'Founder & Lead Bridal Artist',
    experienceYears: 8,
    avatarUrl: VOGUE_NOIR_IMAGES.artists.riya,
    specialties: ['Couture Bridal', 'HD & Airbrush', 'Luxury Skin Minimalism'],
    rating: 5.0,
    bio: '8+ years crafting editorial bridal looks for destination and city weddings using luxury international formulations.',
  },
  {
    id: 'vn-st-2',
    name: 'Simran Sethi',
    role: 'Senior Makeup Artist',
    experienceYears: 6,
    avatarUrl: VOGUE_NOIR_IMAGES.artists.simran,
    specialties: ['Airbrush & Editorial Glam', 'Reception Looks', 'Photoshoot Beauty'],
    rating: 4.9,
    bio: '6+ years specializing in waterproof silicone airbrush finishes and sculpted red-carpet editorial glam.',
  },
  {
    id: 'vn-st-3',
    name: 'Aarav Mehta',
    role: 'Hair Styling Lead',
    experienceYears: 5,
    avatarUrl: VOGUE_NOIR_IMAGES.artists.aarav,
    specialties: ['Bridal Buns', 'Hollywood Curls', 'Seamless Extensions'],
    rating: 4.9,
    bio: '5+ years designing architectural bridal updos, floral gajra arrangements, and red-carpet waves.',
  },
  {
    id: 'vn-st-4',
    name: 'Neha Joshi',
    role: 'Academy Head Trainer',
    experienceYears: 7,
    avatarUrl: VOGUE_NOIR_IMAGES.artists.neha,
    specialties: ['Pro Makeup Education', 'Color Theory', 'Portfolio Direction'],
    rating: 5.0,
    bio: '7+ years mentoring 600+ certified makeup artists in skin science, brush precision, and bridal artistry.',
  },
];

export const VOGUE_NOIR_DEFAULT_PORTFOLIO: VogueNoirPortfolioItem[] = [
  { id: 'vn-gal-b1', category: 'Bridal', imageUrl: VOGUE_NOIR_IMAGES.gallery.bridal1, title: 'Crimson Velvet Royal Bride', alt: 'Royal crimson velvet bridal makeup with champagne gold shimmer eyes' },
  { id: 'vn-gal-b2', category: 'Bridal', imageUrl: VOGUE_NOIR_IMAGES.gallery.bridal2, title: 'Temple Gold South Bridal Glow', alt: 'Traditional temple gold bridal makeup with kohl-defined eyes and berry lips' },
  { id: 'vn-gal-b3', category: 'Bridal', imageUrl: VOGUE_NOIR_IMAGES.gallery.bridal3, title: 'Heirloom Polki Bridal Look', alt: 'Sculpted North Indian bridal makeup with heirloom polki nath and maang tikka' },
  { id: 'vn-gal-b4', category: 'Bridal', imageUrl: VOGUE_NOIR_IMAGES.gallery.bridal4, title: 'Zardozi Red Airbrush Bride', alt: 'Waterproof airbrush bridal makeup paired with classic red zardozi lehenga' },
  { id: 'vn-gal-b5', category: 'Bridal', imageUrl: VOGUE_NOIR_IMAGES.gallery.bridal5, title: 'Golden Silk Phera Radiance', alt: 'Warm golden silk wedding ceremony look with luminous bronzed skin' },
  { id: 'vn-gal-b6', category: 'Bridal', imageUrl: VOGUE_NOIR_IMAGES.gallery.bridal6, title: 'Daytime Anand Karaj Soft Glam', alt: 'Intimate daytime bridal soft glam with rose-blush cheeks and dewy base' },
  { id: 'vn-gal-p1', category: 'Party', imageUrl: VOGUE_NOIR_IMAGES.gallery.party1, title: 'Cocktail Night Smoked Bronze', alt: 'Cocktail evening party makeup with bronzed smoky eyes and drop earrings' },
  { id: 'vn-gal-p2', category: 'Party', imageUrl: VOGUE_NOIR_IMAGES.gallery.party2, title: 'Sangeet Plum & Champagne', alt: 'Sangeet party makeup featuring plum-gold shimmer lids and sculpted contour' },
  { id: 'vn-gal-p3', category: 'Party', imageUrl: VOGUE_NOIR_IMAGES.gallery.party3, title: 'Satin Rose Reception Guest', alt: 'Satin evening dress party makeup with soft winged liner and rose-nude lip' },
  { id: 'vn-gal-p4', category: 'Party', imageUrl: VOGUE_NOIR_IMAGES.gallery.party4, title: 'Midnight Sequin Glow', alt: 'Sequin party glam look with glass-skin cheekbone highlight and waves' },
  { id: 'vn-gal-e1', category: 'Editorial', imageUrl: VOGUE_NOIR_IMAGES.gallery.editorial1, title: 'Blush Crystal Haute Beauty', alt: 'Editorial beauty portrait with blush crystal eye accents on moody backdrop' },
  { id: 'vn-gal-e2', category: 'Editorial', imageUrl: VOGUE_NOIR_IMAGES.gallery.editorial2, title: 'Rouge Noir Couture Campaign', alt: 'High-fashion crimson couture editorial beauty look on dark studio background' },
  { id: 'vn-gal-e3', category: 'Editorial', imageUrl: VOGUE_NOIR_IMAGES.gallery.editorial3, title: 'Gilded Rim-Light Portrait', alt: 'Editorial metallic eye and sculpted contour beauty portrait under gold rim light' },
  { id: 'vn-gal-a1', category: 'Academy Work', imageUrl: VOGUE_NOIR_IMAGES.gallery.academy1, title: 'Pro Batch Live Model Assessment', alt: 'Vogue Noir Academy student applying precision blush during studio assessment' },
  { id: 'vn-gal-a2', category: 'Academy Work', imageUrl: VOGUE_NOIR_IMAGES.gallery.academy2, title: 'Editorial Eye Blending Lab', alt: 'Pro makeup course student perfecting eyeshadow gradient on live model' },
  { id: 'vn-gal-a3', category: 'Academy Work', imageUrl: VOGUE_NOIR_IMAGES.gallery.academy3, title: 'Illuminated Academy Stations', alt: 'Vogue Noir Makeup Academy vanity mirrors and luxury brush workstations' },
];

export const VOGUE_NOIR_DEFAULT_BEFORE_AFTER: VogueNoirBeforeAfterItem[] = [
  {
    id: 'vn-ba-1',
    title: 'Signature HD Bridal Transformation',
    category: 'Bridal Complexion & Eye Artistry',
    beforeUrl: VOGUE_NOIR_IMAGES.gallery.before1,
    afterUrl: VOGUE_NOIR_IMAGES.gallery.after1,
    beforeAlt: 'Before bridal transformation: hydrated bare skin prior to base and eye makeup',
    afterAlt: 'After bridal transformation: luminous HD bridal glow with champagne-gold eyes',
  },
  {
    id: 'vn-ba-2',
    title: 'Evening Reception Sculpt & Glow',
    category: 'Airbrush Party Glam',
    beforeUrl: VOGUE_NOIR_IMAGES.gallery.before2,
    afterUrl: VOGUE_NOIR_IMAGES.gallery.after2,
    beforeAlt: 'Before party makeup: natural prepped skin before contour and lip artistry',
    afterAlt: 'After party makeup: sculpted rose-gold cheekbone highlight and satin lip finish',
  },
];

export const VOGUE_NOIR_DEFAULT_REVIEWS: VogueNoirReviewItem[] = [
  { id: 'vn-rev-1', name: 'Ananya S.', tag: 'Delhi', rating: 5, quote: 'Riya didi ne meri shaadi ke din mujhe bilkul perfect banaya. Makeup 12 ghante tak waisa hi raha, photos mind-blowing aaye!', avatarUrl: VOGUE_NOIR_IMAGES.testimonials.ananya },
  { id: 'vn-rev-2', name: 'Pooja R.', tag: 'Pune', rating: 5, quote: 'Academy join karne ke baad meri career hi badal gayi. Practical training aur portfolio shoot se bahut confidence mila.', avatarUrl: VOGUE_NOIR_IMAGES.testimonials.pooja },
  { id: 'vn-rev-3', name: 'Kriti M.', tag: 'Mumbai', rating: 5, quote: 'Engagement ke liye book kiya tha. Time par aaye, hygiene ka full dhyan aur result stunning.', avatarUrl: VOGUE_NOIR_IMAGES.testimonials.kriti },
  { id: 'vn-rev-4', name: 'Divya N.', tag: 'Bengaluru', rating: 5, quote: 'Best airbrush work in Bengaluru. Humare poore family ko makeup bahut pasand aaya.', avatarUrl: VOGUE_NOIR_IMAGES.testimonials.ananya },
  { id: 'vn-rev-5', name: 'Sana K.', tag: 'Hyderabad', rating: 5, quote: 'Nikah ke liye soft glam look chahiye tha, bilkul waisa hi mila. Highly recommended!', avatarUrl: VOGUE_NOIR_IMAGES.testimonials.sana },
];

export const VOGUE_NOIR_DEFAULT_FAQS: VogueNoirFaqItem[] = [
  { id: "vn-faq-1", question: "When should I book bridal makeup?", answer: "For shaadi season (October to February), book 2–3 months ahead; otherwise 3–4 weeks ahead." },
  { id: "vn-faq-2", question: "Do you offer a trial?", answer: "A trial is included with Signature and Royal. The Classic trial is ₹3,000, adjusted against your booking." },
  { id: "vn-faq-3", question: "Do you travel to the venue?", answer: "Yes, we travel within the city. For outstation or destination weddings in India, please request a quote." },
  { id: "vn-faq-4", question: "Which products do you use?", answer: "We use premium professional products with shades for Indian skin tones." },
  { id: "vn-faq-5", question: "How can I pay?", answer: "Ask the studio about available payment methods and your booking advance. The balance is due on the event day." },
  { id: "vn-faq-6", question: "Is EMI available for academy fees?", answer: "Ask the academy about current EMI eligibility and part-payment options." },
  { id: "vn-faq-7", question: "What is the cancellation policy?", answer: "If you notify us at least 7 days ahead, your advance may be adjusted once, subject to availability." },
  { id: "vn-faq-8", question: "Will I get a certificate?", answer: "Yes, after completing your course and assessment." },
];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function sanitizeHexColor(input: string | undefined, fallback: string): string {
  const trimmed = (input || '').trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed.toUpperCase() : fallback;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Generates upcoming Academy batch start dates anchored on the 1st and 15th of the month
 * so storefront schedules and enquiry dropdowns never display stale past dates.
 */
export function upcomingAcademyBatchDates(fromDate: Date = new Date(), count = 4): string[] {
  const results: string[] = [];
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(fromDate);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const startYear = part('year');
  const startMonth = part('month') - 1;
  const todayDay = part('day');

  let year = startYear;
  let month = startMonth;

  for (let guard = 0; guard < 24 && results.length < count; guard += 1) {
    for (const day of [1, 15]) {
      const isFutureOrToday =
        year > startYear ||
        (year === startYear && month > startMonth) ||
        (year === startYear && month === startMonth && day >= todayDay);
      if (isFutureOrToday) {
        results.push(`${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`);
        if (results.length >= count) break;
      }
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return results;
}

export function vogueNoirServiceImage(
  service: Pick<SalonService, 'id' | 'name' | 'category' | 'imageUrl'>,
): string {
  if (service.imageUrl && service.imageUrl.trim()) return service.imageUrl.trim();
  const text = `${service.id} ${service.name} ${service.category}`.toLowerCase();
  if (/royal/.test(text)) return VOGUE_NOIR_IMAGES.packages.royal;
  if (/signature/.test(text)) return VOGUE_NOIR_IMAGES.packages.signature;
  if (/classic/.test(text)) return VOGUE_NOIR_IMAGES.packages.classic;
  if (/airbrush/.test(text)) return VOGUE_NOIR_IMAGES.services.airbrush;
  if (/\bhd\b|high[- ]definition/.test(text)) return VOGUE_NOIR_IMAGES.services.hd;
  if (/engagement|reception/.test(text)) return VOGUE_NOIR_IMAGES.services.engagement;
  if (/party|cocktail|sangeet|guest/.test(text)) return VOGUE_NOIR_IMAGES.services.party;
  if (/editorial|photoshoot|shoot/.test(text)) return VOGUE_NOIR_IMAGES.services.photoshoot;
  if (/hair|bun|curl|updo|gajra/.test(text)) return VOGUE_NOIR_IMAGES.services.hair;
  if (/drap|saree|lehenga|dupatta/.test(text)) return VOGUE_NOIR_IMAGES.services.draping;
  if (/mehendi|mehndi|haldi/.test(text)) return VOGUE_NOIR_IMAGES.services.mehendiHaldi;
  return VOGUE_NOIR_IMAGES.services.bridal;
}

export function isLegacyMakeupStudioStockUrl(url?: string | null): boolean {
  const value = (url || '').trim();
  if (!value) return false;
  return value.includes('images.unsplash.com');
}

export function upgradeLegacyMakeupStudioStylists<T extends Pick<Stylist, 'id' | 'avatarUrl'>>(
  stylists: T[],
  businessType?: string,
): T[] {
  if (businessType !== 'makeup_studio' || !Array.isArray(stylists)) return stylists;
  const fallbackPortraits = [
    VOGUE_NOIR_IMAGES.artists.riya,
    VOGUE_NOIR_IMAGES.artists.simran,
    VOGUE_NOIR_IMAGES.artists.aarav,
    VOGUE_NOIR_IMAGES.artists.neha,
  ];
  return stylists.map((stylist, index) => {
    const current = (stylist.avatarUrl || '').trim();
    if (!current || isLegacyMakeupStudioStockUrl(current)) {
      return {
        ...stylist,
        avatarUrl: fallbackPortraits[index % fallbackPortraits.length],
      };
    }
    return stylist;
  });
}

export function upgradeMakeupStudioTemplate<T extends { id: string }>(
  remote: T,
  local: Record<string, any>,
): T {
  if (!remote || remote.id !== 'makeup_studio') return remote;
  const raw = remote as Record<string, any>;
  const remoteStylists =
    Array.isArray(raw.stylists) && raw.stylists.length >= 4 && !raw.stylists.some((s: any) => isLegacyMakeupStudioStockUrl(s?.avatarUrl))
      ? raw.stylists
      : local.stylists;
  // The remote catalogue may be customised; never replace it based on partial fingerprints.
  const remoteServices =
    Array.isArray(raw.services) && raw.services.length >= 9 && raw.services.some((s: any) => String(s?.imageUrl || '').startsWith('/templates/vogue-noir/'))
      ? raw.services
      : local.services;
  return {
    ...raw,
    ...local,
    services: remoteServices,
    stylists: remoteStylists,
  } as unknown as T;
}

/** Demo preferences, not a claim that a branch or batch is operational. */
export const VOGUE_NOIR_ACADEMY_CITIES = [
  'Delhi', 'Gurugram', 'Noida', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Online',
];

export function parseAcademySchedules(text: string): Record<string, string[]> {
  const result: Record<string, string[]> = Object.create(null);
  for (const line of (text || '').split('\n').slice(0, 100)) {
    const [city, ...rest] = line.split('|');
    const key = city.trim();
    const values = rest.join('|').split(',').map(value => value.trim()).filter(Boolean).slice(0, 30);
    if (key && key.length <= 100 && values.length) result[key] = values.filter(value => value.length <= 120);
  }
  return result;
}

export interface ResolvedVogueNoirConfig {
  selectorLabel: string;
  heroHeading: string;
  heroSubtext: string;
  heroDesktopUrl: string;
  heroMobileUrl: string;
  aboutHeading: string;
  aboutStory: string;
  aboutImageUrl: string;
  publicEmail: string;
  workingHoursDisplay: string;
  mapEmbedUrl: string;
  gstin: string;
  sacCode: string;
  gstPricing: 'inclusive' | 'exclusive' | '';
  colors: VogueNoirThemeColors;
  stats: VogueNoirStatItem[];
  bridalPackages: VogueNoirBridalPackage[];
  academyEnabled: boolean;
  academyHeading: string;
  academySubtext: string;
  academyHeroUrl: string;
  academyHighlights: string[];
  academyScheduleText: string;
  courses: VogueNoirAcademyCourse[];
  portfolio: VogueNoirPortfolioItem[];
  beforeAfter: VogueNoirBeforeAfterItem[];
  reviews: VogueNoirReviewItem[];
  faqs: VogueNoirFaqItem[];
}

export function resolveVogueNoirConfig(profile: SalonProfile): ResolvedVogueNoirConfig {
  const raw = profile.vogueNoir || {};
  const rawColors = raw.colors || {};
  const colors: VogueNoirThemeColors = {
    bgPrimary: sanitizeHexColor(
      rawColors.bgPrimary,
      VOGUE_NOIR_DEFAULT_COLORS.bgPrimary,
    ),
    bgSurface: sanitizeHexColor(
      rawColors.bgSurface,
      VOGUE_NOIR_DEFAULT_COLORS.bgSurface,
    ),
    borderSubtle: sanitizeHexColor(
      rawColors.borderSubtle,
      VOGUE_NOIR_DEFAULT_COLORS.borderSubtle,
    ),
    accentGold: sanitizeHexColor(
      rawColors.accentGold || profile.customAccentColor,
      VOGUE_NOIR_DEFAULT_COLORS.accentGold,
    ),
    textPrimary: sanitizeHexColor(
      rawColors.textPrimary,
      VOGUE_NOIR_DEFAULT_COLORS.textPrimary,
    ),
    textMuted: sanitizeHexColor(
      rawColors.textMuted,
      VOGUE_NOIR_DEFAULT_COLORS.textMuted,
    ),
    highlightBlush: sanitizeHexColor(
      rawColors.highlightBlush,
      VOGUE_NOIR_DEFAULT_COLORS.highlightBlush,
    ),
  };

  const heroDesktopCandidate = (raw.heroDesktopUrl || profile.coverImageUrl || '').trim();
  const heroDesktopUrl =
    heroDesktopCandidate && !isLegacyMakeupStudioStockUrl(heroDesktopCandidate)
      ? heroDesktopCandidate
      : VOGUE_NOIR_IMAGES.heroDesktop;

  const heroMobileUrl = (raw.heroMobileUrl || '').trim() || VOGUE_NOIR_IMAGES.heroMobile;
  const aboutImageUrl = (raw.aboutImageUrl || '').trim() || VOGUE_NOIR_IMAGES.about;
  const academyHeroUrl = (raw.academyHeroUrl || '').trim() || VOGUE_NOIR_IMAGES.academy.hero;

  const stats =
    Array.isArray(raw.stats) && raw.stats.length > 0
      ? raw.stats.map((item, idx) => ({
          id: item.id || `vn-stat-${idx + 1}`,
          value: (item.value || '').trim() || VOGUE_NOIR_DEFAULT_STATS[idx % VOGUE_NOIR_DEFAULT_STATS.length].value,
          label: (item.label || '').trim() || VOGUE_NOIR_DEFAULT_STATS[idx % VOGUE_NOIR_DEFAULT_STATS.length].label,
        }))
      : VOGUE_NOIR_DEFAULT_STATS;

  const bridalPackages =
    Array.isArray(raw.bridalPackages) && raw.bridalPackages.length > 0
      ? raw.bridalPackages.map((pkg, idx) => {
          const fallback = VOGUE_NOIR_DEFAULT_BRIDAL_PACKAGES[idx % VOGUE_NOIR_DEFAULT_BRIDAL_PACKAGES.length];
          return {
            id: pkg.id || fallback.id,
            tier: (pkg.tier || '').trim() || fallback.tier,
            price: Number.isFinite(Number(pkg.price)) && Number(pkg.price) > 0 ? Number(pkg.price) : fallback.price,
            popular: typeof pkg.popular === 'boolean' ? pkg.popular : fallback.popular,
            badgeLabel: (pkg.badgeLabel || '').trim() || fallback.badgeLabel,
            imageUrl: (pkg.imageUrl || '').trim() || fallback.imageUrl,
            imageAlt: (pkg.imageAlt || '').trim() || fallback.imageAlt,
            linkedServiceId: pkg.linkedServiceId || fallback.linkedServiceId,
            inclusions:
              Array.isArray(pkg.inclusions) && pkg.inclusions.filter(Boolean).length > 0
                ? pkg.inclusions.map((line) => String(line).trim()).filter(Boolean)
                : fallback.inclusions,
          };
        })
      : VOGUE_NOIR_DEFAULT_BRIDAL_PACKAGES;

  const courses =
    Array.isArray(raw.courses) && raw.courses.length > 0
      ? raw.courses.map((course, idx) => {
          const fallback = VOGUE_NOIR_DEFAULT_COURSES[idx % VOGUE_NOIR_DEFAULT_COURSES.length];
          return {
            id: course.id || fallback.id,
            title: (course.title || '').trim() || fallback.title,
            duration: (course.duration || '').trim() || fallback.duration,
            fee: Number.isFinite(Number(course.fee)) && Number(course.fee) >= 0 ? Number(course.fee) : fallback.fee,
            imageUrl: (course.imageUrl || '').trim() || fallback.imageUrl,
            imageAlt: (course.imageAlt || '').trim() || fallback.imageAlt,
            summary: (course.summary || '').trim() || fallback.summary,
            batchOverride: (course.batchOverride || '').trim(),
            certification: (course.certification || '').trim() || fallback.certification,
            emiNote: (course.emiNote || '').trim() || fallback.emiNote,
            syllabus:
              Array.isArray(course.syllabus) && course.syllabus.filter(Boolean).length > 0
                ? course.syllabus.map((line) => String(line).trim()).filter(Boolean)
                : fallback.syllabus,
          };
        })
      : VOGUE_NOIR_DEFAULT_COURSES;

  const validCategories: VogueNoirPortfolioCategory[] = ['Bridal', 'Party', 'Editorial', 'Academy Work'];
  const portfolio =
    Array.isArray(raw.portfolio) && raw.portfolio.length > 0
      ? raw.portfolio.map((item, idx) => {
          const fallback = VOGUE_NOIR_DEFAULT_PORTFOLIO[idx % VOGUE_NOIR_DEFAULT_PORTFOLIO.length];
          const category = validCategories.includes(item.category) ? item.category : fallback.category;
          return {
            id: item.id || `vn-gal-${idx + 1}`,
            category,
            imageUrl: (item.imageUrl || '').trim() || fallback.imageUrl,
            title: (item.title || '').trim() || fallback.title,
            alt: (item.alt || item.title || '').trim() || fallback.alt,
          };
        })
      : VOGUE_NOIR_DEFAULT_PORTFOLIO;

  const beforeAfter =
    Array.isArray(raw.beforeAfter) && raw.beforeAfter.length > 0
      ? raw.beforeAfter.map((pair, idx) => {
          const fallback = VOGUE_NOIR_DEFAULT_BEFORE_AFTER[idx % VOGUE_NOIR_DEFAULT_BEFORE_AFTER.length];
          return {
            id: pair.id || fallback.id,
            title: (pair.title || '').trim() || fallback.title,
            category: (pair.category || '').trim() || fallback.category,
            beforeUrl: (pair.beforeUrl || '').trim() || fallback.beforeUrl,
            afterUrl: (pair.afterUrl || '').trim() || fallback.afterUrl,
            beforeAlt: (pair.beforeAlt || '').trim() || fallback.beforeAlt,
            afterAlt: (pair.afterAlt || '').trim() || fallback.afterAlt,
          };
        })
      : VOGUE_NOIR_DEFAULT_BEFORE_AFTER;

  const reviews =
    Array.isArray(raw.reviews) && raw.reviews.length > 0
      ? raw.reviews.map((rev, idx) => {
          const fallback = VOGUE_NOIR_DEFAULT_REVIEWS[idx % VOGUE_NOIR_DEFAULT_REVIEWS.length];
          return {
            id: rev.id || fallback.id,
            name: (rev.name || '').trim() || fallback.name,
            tag: (rev.tag || '').trim() || fallback.tag,
            rating: Math.min(5, Math.max(1, Math.round(Number(rev.rating) || 5))),
            quote: (rev.quote || '').trim() || fallback.quote,
            avatarUrl: (rev.avatarUrl || '').trim() || fallback.avatarUrl,
          };
        })
      : VOGUE_NOIR_DEFAULT_REVIEWS;

  const faqs =
    Array.isArray(raw.faqs) && raw.faqs.length > 0
      ? raw.faqs.map((faq, idx) => {
          const fallback = VOGUE_NOIR_DEFAULT_FAQS[idx % VOGUE_NOIR_DEFAULT_FAQS.length];
          return {
            id: faq.id || `vn-faq-${idx + 1}`,
            question: (faq.question || '').trim() || fallback.question,
            answer: (faq.answer || '').trim() || fallback.answer,
          };
        })
      : VOGUE_NOIR_DEFAULT_FAQS;

  const academyEnabled =
    raw.academyEnabled !== undefined
      ? Boolean(raw.academyEnabled)
      : profile.websiteSections?.academy !== false;

  return {
    selectorLabel: (raw.selectorLabel || '').trim() || VOGUE_NOIR_SELECTOR_LABEL,
    heroHeading: (raw.heroHeading || '').trim() || VOGUE_NOIR_HERO_HEADING,
    heroSubtext: (raw.heroSubtext || (profile.tagline !== VOGUE_NOIR_TAGLINE ? profile.tagline : '') || '').trim() || 'Bridal, party and HD makeup by certified artists across India’s top cities, plus professional makeup courses to start your career.',
    heroDesktopUrl,
    heroMobileUrl,
    aboutHeading: (raw.aboutHeading || '').trim() || 'Editorial Precision Meets Timeless Bridal Luxury',
    aboutStory: (raw.aboutStory || profile.about || '').trim() || VOGUE_NOIR_DEFAULT_ABOUT,
    aboutImageUrl,
    publicEmail: (raw.publicEmail || '').trim() || VOGUE_NOIR_DEFAULT_EMAIL,
    workingHoursDisplay: (raw.workingHoursDisplay || '').trim() || VOGUE_NOIR_DEFAULT_HOURS,
    mapEmbedUrl: (raw.mapEmbedUrl || '').trim(),
    gstin: typeof raw.gstin === 'string' ? raw.gstin.trim().toUpperCase().slice(0, 15) : '',
    sacCode: typeof raw.sacCode === 'string' ? raw.sacCode.trim().slice(0, 6) : '',
    gstPricing: raw.gstPricing === 'inclusive' || raw.gstPricing === 'exclusive' ? raw.gstPricing : '',
    colors,
    stats,
    bridalPackages,
    academyEnabled,
    academyHeading:
      (raw.academyHeading || '').trim() || 'Certified Pro Makeup & Hair Artistry Academy',
    academySubtext:
      (raw.academySubtext || '').trim() ||
      'Small-cohort studio mentorship with live model practice, international luxury kits, portfolio photography, and flexible EMI options.',
    academyHeroUrl,
    academyHighlights:
      Array.isArray(raw.academyHighlights) && raw.academyHighlights.filter(Boolean).length > 0
        ? raw.academyHighlights.map((item) => String(item).trim()).filter(Boolean)
        : VOGUE_NOIR_DEFAULT_ACADEMY_HIGHLIGHTS,
    academyScheduleText: typeof raw.academyScheduleText === 'string' ? raw.academyScheduleText.slice(0, 10000) : '',
    courses,
    portfolio,
    beforeAfter,
    reviews,
    faqs,
  };
}

export function vogueNoirCssVariables(colors: VogueNoirThemeColors): Record<string, string> {
  return {
    '--bg-primary': colors.bgPrimary,
    '--bg-surface': colors.bgSurface,
    '--border-subtle': colors.borderSubtle,
    '--accent-gold': colors.accentGold,
    '--text-primary': colors.textPrimary,
    '--text-muted': colors.textMuted,
    '--highlight-blush': colors.highlightBlush,
  };
}

export function buildVogueNoirSeo(
  profile: SalonProfile,
  config: ResolvedVogueNoirConfig,
  siteUrl = 'https://voguenoir.example',
) {
  const brand = (profile.businessName || '').trim() || VOGUE_NOIR_BRAND_NAME;
  const city = (profile.city || '').trim() || VOGUE_NOIR_DEFAULT_CITY;
  const address = (profile.address || '').trim() || VOGUE_NOIR_DEFAULT_ADDRESS;
  const phone = (profile.phone || profile.whatsapp || '').trim() || VOGUE_NOIR_DEFAULT_PHONE;

  const title =
    (profile.seo?.metaTitle || '').trim() ||
    `${brand} | Bridal Makeup & Makeup Courses in India`;
  const description =
    (profile.seo?.metaDescription || '').trim() ||
    (brand === VOGUE_NOIR_BRAND_NAME
      ? 'Book bridal, party and HD makeup in Delhi, Mumbai, Bengaluru, Hyderabad, Pune and more. Join our professional makeup academy. Prices in INR.'
      : `Explore makeup services and courses at ${brand} in ${city}.`);
  const ogImage = (profile.seo?.ogImageUrl || '').trim() || VOGUE_NOIR_IMAGES.ogImage;

  const localBusinessSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': ['BeautySalon', 'LocalBusiness'],
    name: brand,
    description,
    image: ogImage,
    logo: (profile.logoUrl || '').trim() || VOGUE_NOIR_IMAGES.logoPng,
    url: siteUrl,
    telephone: phone,
    email: config.publicEmail,
    priceRange: '₹₹₹',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressLocality: city,
      postalCode: (profile.postalCode || '').trim() || VOGUE_NOIR_DEFAULT_POSTAL_CODE,
      addressCountry: 'IN',
    },
    openingHours: ['Mo-Sa 10:00-20:00'],
  };

  const upcomingBatches = upcomingAcademyBatchDates(new Date(), 4);
  const courseSchemas = config.academyEnabled
    ? config.courses.map((course, idx) => ({
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: course.title,
        description: course.summary,
        provider: {
          '@type': 'Organization',
          name: brand,
          sameAs: siteUrl,
        },
        offers: {
          '@type': 'Offer',
          price: String(course.fee),
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
        },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'onsite',
          courseWorkload: course.duration,
          startDate: course.batchOverride || upcomingBatches[idx % upcomingBatches.length],
        },
      }))
    : [];

  return {
    title,
    description,
    ogImage,
    jsonLd: [localBusinessSchema, ...courseSchemas],
  };
}
