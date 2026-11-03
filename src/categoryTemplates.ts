import { MENS_SERVICES, MENS_STAFF, MENS_CATEGORIES, MENS_HERO, MENS_DESCRIPTION } from './lib/keshkraft';
import { AURELIA_DEFAULT_SERVICES, AURELIA_DEFAULT_STAFF, AURELIA_IMAGES } from './lib/aureliaBeauty';
import {seedTemplatePackages} from './lib/packageCatalogue';
import {
  VEDA_DEFAULT_ADDRESS,
  VEDA_DEFAULT_CITY,
  VEDA_DEFAULT_INSTAGRAM,
  VEDA_DEFAULT_PHONE,
  VEDA_SERVICE_CATEGORIES,
  VEDA_SERVICES,
  VEDA_TAGLINE,
  VEDA_THERAPISTS,
  vedaImage,
} from './lib/vedaSanjeevani';
import {createIronInkServices} from './lib/ironInk';
import {
  LUXURY_EDITORIAL_ABOUT,
  LUXURY_EDITORIAL_IMAGES,
  LUXURY_EDITORIAL_SELECTOR_LABEL,
  LUXURY_EDITORIAL_TAGLINE,
} from './lib/luxuryEditorial';
import { CategoryTemplateConfig, BusinessTypeOption } from './types';
import {
  compareTemplatesByPriority,
  nexoraCategory,
  nexoraTemplateMeta,
  type NexoraTemplateMeta,
} from './lib/nexoraTemplateCatalogue';
import { SALON_IMAGES } from './assets/images';
import {
  VOGUE_NOIR_BRAND_NAME,
  VOGUE_NOIR_DEFAULT_ABOUT,
  VOGUE_NOIR_DEFAULT_ADDRESS,
  VOGUE_NOIR_DEFAULT_CITY,
  VOGUE_NOIR_DEFAULT_PHONE,
  VOGUE_NOIR_DEFAULT_POSTAL_CODE,
  VOGUE_NOIR_DEFAULT_STYLISTS,
  VOGUE_NOIR_IMAGES,
  VOGUE_NOIR_SELECTOR_LABEL,
  VOGUE_NOIR_TAGLINE,
  VOGUE_NOIR_TEMPLATE_SERVICES,
} from './lib/vogueNoir';
import {
  PRISM_CHROMA_BRAND_NAME,
  PRISM_CHROMA_DEFAULT_CITY,
  PRISM_CHROMA_DEFAULT_POSTAL_CODE,
  PRISM_CHROMA_DEFAULT_STYLISTS,
  PRISM_CHROMA_IMAGES,
  PRISM_CHROMA_SELECTOR_LABEL,
  PRISM_CHROMA_TAGLINE,
  PRISM_CHROMA_TEMPLATE_SERVICES,
} from './lib/prismChroma';
import {
  SHRINGAAR_BRAND_NAME,
  SHRINGAAR_DEFAULT_ABOUT,
  SHRINGAAR_DEFAULT_ADDRESS,
  SHRINGAAR_DEFAULT_CITY,
  SHRINGAAR_DEFAULT_PHONE,
  SHRINGAAR_DEFAULT_POSTAL_CODE,
  SHRINGAAR_DEFAULT_STYLISTS,
  SHRINGAAR_IMAGES,
  SHRINGAAR_SELECTOR_LABEL,
  SHRINGAAR_TAGLINE,
  SHRINGAAR_TEMPLATE_SERVICES,
} from './lib/shringaarRoyal';
import {
  ARCH_FLUTTER_BRAND_NAME,
  ARCH_FLUTTER_CATEGORIES,
  ARCH_FLUTTER_DEFAULT_ABOUT,
  ARCH_FLUTTER_DEFAULT_ADDRESS,
  ARCH_FLUTTER_DEFAULT_CITY,
  ARCH_FLUTTER_DEFAULT_PHONE,
  ARCH_FLUTTER_DEFAULT_POSTAL_CODE,
  ARCH_FLUTTER_DEFAULT_STYLISTS,
  ARCH_FLUTTER_IMAGES,
  ARCH_FLUTTER_TAGLINE,
  ARCH_FLUTTER_TEMPLATE_SERVICES,
} from './lib/archFlutter';
import {
  BODHI_TREE_BRAND_NAME,
  BODHI_TREE_DEFAULT_ABOUT,
  BODHI_TREE_DEFAULT_ADDRESS,
  BODHI_TREE_DEFAULT_CITY,
  BODHI_TREE_DEFAULT_PHONE,
  BODHI_TREE_DEFAULT_POSTAL_CODE,
  BODHI_TREE_DEFAULT_STYLISTS,
  BODHI_TREE_IMAGES,
  BODHI_TREE_SELECTOR_LABEL,
  BODHI_TREE_TAGLINE,
  BODHI_TREE_TEMPLATE_SERVICES,
} from './lib/bodhiTree';

export const CATEGORY_TEMPLATES: Record<string, CategoryTemplateConfig> = {
  // 1. Ziya Women’s Hair Studio — dedicated women’s haircut specialist salon for hair_salon.
  hair_salon: {
    id: 'hair_salon',
    title: 'Ziya Women’s Hair Studio',
    shortName: LUXURY_EDITORIAL_SELECTOR_LABEL,
    tagline: LUXURY_EDITORIAL_TAGLINE,
    about: LUXURY_EDITORIAL_ABOUT,
    icon: 'content_cut',
    layoutStyle: 'editorial_bento',
    paletteLabel: 'Soft Ivory, Rose Beige, Muted Blush & Gold',
    themePreset: 'chic_nude_beige',
    subCategories: [
      'Signature Cuts',
      'Short & Bob Cuts',
      'Long & Step Cuts',
      'Bangs & Face-Framing',
      'Curly & Consultation',
    ],
    defaultCity: 'Bengaluru, Karnataka',
    defaultAddress: '100 Feet Road, HAL 2nd Stage, Indiranagar',
    defaultPostalCode: '560038',
    phone: '+91 98450 12890',
    whatsapp: '+91 98450 12890',
    ownerName: 'Ziya Khan',
    ownerRole: 'Founder & Master Women’s Haircut Specialist',
    ownerPhotoUrl: LUXURY_EDITORIAL_IMAGES.team[0].src,
    coverImageUrl: LUXURY_EDITORIAL_IMAGES.hero.src,
    instagramHandle: '@ziya.hairstudio',
    themeStyle: {
      heroBackground: 'bg-[#FAF6F1]',
      heroTextColor: 'text-[#2A1E1B]',
      cardBorder: 'border-[#ECDCD3]',
      cardBackground: 'bg-[#FAF6F1]',
      cardRadius: 'rounded-none',
      accentColor: 'text-[#2A1E1B]',
      accentBg: 'bg-[#2A1E1B]',
      badgeBg: 'bg-[#F5ECE4]',
      badgeText: 'text-[#2A1E1B]',
      buttonBg: 'bg-[#2A1E1B] hover:bg-[#3E2E2A]',
      buttonText: 'text-[#FAF6F1]',
      priceColor: 'text-[#2A1E1B]',
      isDark: false,
      headerBanner: 'border-b border-[#E4C5BE] bg-[#FAF6F1]'
    },
    services: [
      {
        id: 'hs-1',
        name: 'Layer Haircut',
        category: 'Signature Cuts',
        durationMinutes: 45,
        price: 950,
        description: 'Multi-tiered cascading layers customized to your hair density and face shape for airy movement and natural bounce.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.layer.src,
        icon: 'content_cut',
        popular: true
      },
      {
        id: 'hs-2',
        name: 'Butterfly Haircut',
        category: 'Signature Cuts',
        durationMinutes: 50,
        price: 1250,
        description: 'Voluminous crown layers paired with feathered chin-to-collarbone wings that add lift while preserving full length.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.butterfly.src,
        icon: 'styler',
        popular: true
      },
      {
        id: 'hs-3',
        name: 'Bob Haircut',
        category: 'Short & Bob Cuts',
        durationMinutes: 45,
        price: 1100,
        description: 'Precision chin-to-collarbone classic or French bob sculpted to flatter your jawline and neckline.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.bob.src,
        icon: 'content_cut',
        popular: true
      },
      {
        id: 'hs-4',
        name: 'U Cut & V Cut',
        category: 'Long & Step Cuts',
        durationMinutes: 40,
        price: 850,
        description: 'Softly curved U-perimeter or tapered V-silhouette designed for healthy flow and movement through medium-to-long hair.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.uvCut.src,
        icon: 'content_cut'
      },
      {
        id: 'hs-5',
        name: 'Step Haircut',
        category: 'Long & Step Cuts',
        durationMinutes: 45,
        price: 900,
        description: 'Defined graduated tiers creating structured cascading steps, visible volume and lively bounce.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.step.src,
        icon: 'styler'
      },
      {
        id: 'hs-6',
        name: 'Pixie Haircut',
        category: 'Short & Bob Cuts',
        durationMinutes: 50,
        price: 1200,
        description: 'Modern feminine pixie crop with soft tapered sides, clean nape detailing and feathery crown texture.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.pixie.src,
        icon: 'content_cut'
      },
      {
        id: 'hs-7',
        name: 'Blunt Cut',
        category: 'Short & Bob Cuts',
        durationMinutes: 40,
        price: 950,
        description: 'Zero-elevation one-length precision cut for crisp glass-like edges and fuller, thicker-looking ends.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.blunt.src,
        icon: 'content_cut'
      },
      {
        id: 'hs-8',
        name: 'Long Haircut',
        category: 'Long & Step Cuts',
        durationMinutes: 45,
        price: 900,
        description: 'Length-preserving precision trim with internal weight balancing and split-end dusting for long hair.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.long.src,
        icon: 'content_cut'
      },
      {
        id: 'hs-9',
        name: 'Short Haircut',
        category: 'Short & Bob Cuts',
        durationMinutes: 45,
        price: 1050,
        description: 'Tailored above-the-shoulder cropped silhouette shaped for effortless wash-and-wear everyday confidence.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.short.src,
        icon: 'content_cut'
      },
      {
        id: 'hs-10',
        name: 'Curtain Bangs & Fringe',
        category: 'Bangs & Face-Framing',
        durationMinutes: 25,
        price: 550,
        description: 'Cheekbone-grazing curtain bangs or soft wispy fringe custom-cut to frame your eyes and forehead.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.bangs.src,
        icon: 'styler',
        popular: true
      },
      {
        id: 'hs-11',
        name: 'Face-Framing Haircut',
        category: 'Bangs & Face-Framing',
        durationMinutes: 40,
        price: 950,
        description: 'Contoured front angles around cheekbones and jawline for an instant flattering lift when worn open or tied up.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.framing.src,
        icon: 'content_cut'
      },
      {
        id: 'hs-12',
        name: 'Curly Haircut',
        category: 'Curly & Consultation',
        durationMinutes: 60,
        price: 1350,
        description: 'Curl-by-curl dry shape cut tailored to your natural wave or curl pattern for balanced volume without bulk.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.curly.src,
        icon: 'waves',
        popular: true
      },
      {
        id: 'hs-13',
        name: 'Haircut Consultation',
        category: 'Curly & Consultation',
        durationMinutes: 20,
        price: 350,
        description: 'One-on-one face-shape mapping, hair texture assessment and personalized haircut recommendation with a senior stylist.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.consult.src,
        icon: 'psychology'
      },
      {
        id: 'hs-14',
        name: 'Hair Wash & Hair Styling with Haircut',
        category: 'Signature Cuts',
        durationMinutes: 60,
        price: 1450,
        description: 'Complete relaxing shampoo wash, custom women’s precision haircut and signature round-brush blowout finish.',
        imageUrl: LUXURY_EDITORIAL_IMAGES.services.styling.src,
        icon: 'waves',
        popular: true
      }
    ],
    stylists: [
      {
        id: 'hs-st-1',
        name: 'Ziya Khan',
        role: 'Founder & Master Cut Specialist',
        experienceYears: 9,
        bio: '9+ years crafting face-shape-matched women’s haircuts, voluminous butterfly cuts and cascading layers.',
        avatarUrl: LUXURY_EDITORIAL_IMAGES.team[0].src,
        specialties: ['Layer & Butterfly Cuts', 'Face-Shape Mapping', 'Hair Cutting'],
        rating: 4.98
      },
      {
        id: 'hs-st-2',
        name: 'Meera Nair',
        role: 'Senior Bob & Short Cut Specialist',
        experienceYears: 7,
        bio: '7 years specializing in architectural chin-to-collarbone bobs, crisp blunt cuts and feminine pixie crops.',
        avatarUrl: LUXURY_EDITORIAL_IMAGES.team[1].src,
        specialties: ['Bob & Blunt Cuts', 'Pixie & Short Cuts', 'Hair Cutting'],
        rating: 4.95
      },
      {
        id: 'hs-st-3',
        name: 'Kavya Sharma',
        role: 'Curtain Bangs & Layering Stylist',
        experienceYears: 6,
        bio: '6 years designing cheekbone-skimming curtain bangs, contoured face-framing layers and step haircuts.',
        avatarUrl: LUXURY_EDITORIAL_IMAGES.team[2].src,
        specialties: ['Curtain Bangs & Fringe', 'Face-Framing Layers', 'Blowdry Styling'],
        rating: 4.93
      },
      {
        id: 'hs-st-4',
        name: 'Diya Kulkarni',
        role: 'Curly & Long Haircut Specialist',
        experienceYears: 6,
        bio: '6 years dedicated to curl-by-curl dry shaping, natural texture balance and length-preserving U & V cuts.',
        avatarUrl: LUXURY_EDITORIAL_IMAGES.team[3].src,
        specialties: ['Curly Haircuts', 'Layer & Butterfly Cuts', 'Hair Cutting'],
        rating: 4.94
      }
    ]
  },

  // 2. Barber Shop / Men's Grooming
  barber: {
    id: 'barber',
    title: "The Royal Blade Barber & Men's Club",
    shortName: "Barber Shop / Men's Grooming",
    tagline: 'Vintage Heritage Shaves, Bespoke Fades & Handcrafted Beard Sculpting',
    about: 'Situated on Bandra’s iconic 33rd Road, The Royal Blade revives the timeless charm of Victorian barbershops infused with vintage mahogany, genuine brass fittings, and old-school hot towel straight razor mastery.',
    icon: 'content_cut',
    layoutStyle: 'vintage_industrial',
    paletteLabel: 'Dark Wood & Brass Theme',
    themePreset: 'vintage_brass',
    subCategories: ['Executive Cuts', 'Beard Sculpting', 'Hot Towel Shaves', 'Maharaja Packages'],
    defaultCity: 'Mumbai, Maharashtra',
    defaultAddress: '33rd Road, Off Linking Road, Bandra West',
    defaultPostalCode: '400050',
    phone: '+91 98200 45671',
    whatsapp: '+91 98200 45671',
    ownerName: 'Vikram Malhotra',
    ownerRole: 'Master Barber & Razor Craftsman',
    ownerPhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
    instagramHandle: '@royalblade.bandra',
    themeStyle: {
      heroBackground: 'bg-[#18110b]',
      heroTextColor: 'text-[#f5e6d3]',
      cardBorder: 'border-[#c59b27]/40',
      cardBackground: 'bg-[#211711]',
      cardRadius: 'rounded-lg',
      accentColor: 'text-[#d4af37]',
      accentBg: 'bg-[#c59b27]',
      badgeBg: 'bg-[#3b2a1e]',
      badgeText: 'text-[#f3d99e]',
      buttonBg: 'bg-[#c59b27] hover:bg-[#b58b1d]',
      buttonText: 'text-[#18110b]',
      priceColor: 'text-[#e5c068]',
      isDark: true,
      headerBanner: 'bg-[#140d07] border-b border-[#c59b27]/30'
    },
    services: [
      {
        id: 'bb-1',
        name: 'Executive Scissor Cut & Charcoal Hair Wash',
        category: 'Executive Cuts',
        durationMinutes: 40,
        price: 450,
        description: 'Tailored fade or gentleman taper, tea-tree scalp rinse, and matte pomade finish.',
        icon: 'content_cut',
        popular: true
      },
      {
        id: 'bb-2',
        name: 'Signature Hot Towel Straight Razor Shave',
        category: 'Hot Towel Shaves',
        durationMinutes: 30,
        price: 350,
        description: 'Eucalyptus pre-shave oil, badger brush warm lather, feather-edge razor shave, and cold stone alum splash.',
        icon: 'face'
      },
      {
        id: 'bb-3',
        name: 'Precision Beard Sculpting & Ozone Steam',
        category: 'Beard Sculpting',
        durationMinutes: 35,
        price: 400,
        description: 'Sharp cheek line outlining, bulk graduation, steam softening, and organic cedarwood beard butter massage.',
        icon: 'cleaning_services',
        popular: true
      },
      {
        id: 'bb-4',
        name: 'The Royal Maharaja Grooming Ritual',
        category: 'Maharaja Packages',
        durationMinutes: 75,
        price: 1350,
        description: 'Full haircut, hot lather straight shave, charcoal blackhead face scrub, neck & shoulder acupressure.',
        icon: 'workspace_premium',
        popular: true
      },
      {
        id: 'bb-5',
        name: 'Grey Camo Beard Toning & Mustache Wax',
        category: 'Beard Sculpting',
        durationMinutes: 30,
        price: 550,
        description: 'Natural subtle grey blending for beards with premium Hungarian mustache wax shape.',
        icon: 'brush'
      }
    ],
    stylists: [
      {
        id: 'bb-st-1',
        name: 'Vikram Malhotra',
        role: 'Master Barber & Proprietor',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        specialties: ['Straight Razor Shaves', 'Skin Fades', 'Royal Grooming'],
        rating: 4.98
      },
      {
        id: 'bb-st-2',
        name: 'Rajesh Verma',
        role: 'Senior Beard Artisan',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
        specialties: ['Beard Geometry', 'Ozone Steam Facials', 'Tapers'],
        rating: 4.93
      },
      {
        id: 'bb-st-3',
        name: 'Kabir Khan',
        role: 'Modern Fade Specialist',
        avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
        specialties: ['Low/Mid Fades', 'Textured Crops', 'Scissor Work'],
        rating: 4.88
      }
    ]
  },

  // 3. Unisex Salon
  unisex_salon: {
    id: 'unisex_salon',
    title: 'Aura Unisex Salon & Wellness Lounge',
    shortName: 'Aura Unisex Salon',
    tagline: 'Look Good. Feel Fresh. Be You. — Hair, skin, grooming and wellness for men and women',
    about: 'At Aura, we believe everyone deserves to look good and feel confident. From a fresh haircut to relaxing salon care, our team is here to make every visit special. Friendly experts, quality products and a clean, relaxing space in the heart of Koramangala.',
    icon: 'diversity_3',
    layoutStyle: 'contemporary_balanced',
    paletteLabel: 'Warm White & Sage Green',
    themePreset: 'sage_cream_gold',
    subCategories: ['Unisex Haircuts', "Men's Grooming", 'Botanical Color', 'Skin Care', 'Wellness'],
    defaultCity: 'Bengaluru, Karnataka',
    defaultAddress: 'Outer Ring Road, 4th Block, Koramangala',
    defaultPostalCode: '560095',
    phone: '+91 98455 33210',
    whatsapp: '+91 98455 33210',
    ownerName: 'Priya Nair',
    ownerRole: 'Executive Salon Director',
    ownerPhotoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=500&q=80',
    coverImageUrl: '/templates/aura-unisex/hero-main-1024.webp',
    instagramHandle: '@aurasalon.blr',
    themeStyle: {
      heroBackground: 'bg-[#FAF8F5]',
      heroTextColor: 'text-[#252525]',
      cardBorder: 'border-[#E6E2DB]',
      cardBackground: 'bg-white',
      cardRadius: 'rounded-[18px]',
      accentColor: 'text-[#738B78]',
      accentBg: 'bg-[#738B78]',
      badgeBg: 'bg-[#E7EEE7]',
      badgeText: 'text-[#5C7362] font-bold',
      buttonBg: 'bg-[#738B78] hover:bg-[#5C7362]',
      buttonText: 'text-white font-bold',
      priceColor: 'text-[#252525] font-extrabold',
      isDark: false,
      headerBanner: 'bg-[#FAF8F5] border-b border-[#E6E2DB]'
    },
    services: [
      {
        id: 'us-1',
        name: 'Designer Unisex Haircut & Moroccan Conditioning',
        category: 'Unisex Haircuts',
        durationMinutes: 45,
        price: 650,
        description: 'A hair wash, haircut and styling to suit your everyday look.',
        icon: 'content_cut',
        imageUrl: SALON_IMAGES.hero,
        popular: true
      },
      {
        id: 'us-2',
        name: 'Express Glow Organic Cleanup & De-Tan',
        category: 'Skin Cleanups',
        durationMinutes: 40,
        price: 850,
        description: 'A gentle face cleanup with steam, scrub and a face mask.',
        icon: 'face',
        imageUrl: SALON_IMAGES.toolsSetup,
        popular: true
      },
      {
        id: 'us-3',
        name: 'Global Ammonia-Free Inoa Hair Color',
        category: 'Botanical Color',
        durationMinutes: 90,
        price: 2800,
        description: 'Full hair colour with an ammonia-free formula. Ask our team for the right shade.',
        icon: 'brush',
        imageUrl: SALON_IMAGES.hero
      },
      {
        id: 'us-4',
        name: 'Deluxe Paraffin Spa Pedicure',
        category: 'Hands & Feet Care',
        durationMinutes: 50,
        price: 850,
        description: 'A foot soak, nail care and a warm paraffin treatment for soft, fresh feet.',
        icon: 'pan_tool',
        imageUrl: SALON_IMAGES.nailArt
      },
      {
        id: 'us-5',
        name: 'Olaplex No. 1 & 2 Molecular Bond Repair',
        category: 'Botanical Color',
        durationMinutes: 45,
        price: 1650,
        description: 'A hair care treatment to help care for dry or damaged hair.',
        icon: 'auto_awesome',
        imageUrl: SALON_IMAGES.toolsSetup
      },
      {
        id: 'us-6',
        name: 'Men’s Haircut & Beard Styling',
        category: 'Men’s Grooming',
        durationMinutes: 45,
        price: 550,
        description: 'A hair wash, haircut and beard shaping to keep your look neat and fresh.',
        icon: 'content_cut',
        imageUrl: SALON_IMAGES.hero,
        popular: true
      },
      {
        id: 'us-7',
        name: 'Hair Spa & Deep Conditioning',
        category: 'Hair Care',
        durationMinutes: 60,
        price: 1200,
        description: 'A hair spa with massage and deep conditioning for dry or tired hair.',
        icon: 'spa',
        imageUrl: SALON_IMAGES.toolsSetup
      },
      {
        id: 'us-8',
        name: 'Relaxing Head, Neck & Shoulder Massage',
        category: 'Wellness',
        durationMinutes: 30,
        price: 700,
        description: 'A short relaxing massage to ease head, neck and shoulder tension.',
        icon: 'self_improvement',
        imageUrl: SALON_IMAGES.toolsSetup
      },
      {
        id: 'us-9',
        name: 'Aroma Foot Reflexology',
        category: 'Wellness',
        durationMinutes: 30,
        price: 650,
        description: 'A warm foot soak followed by a gentle pressure-point foot massage.',
        icon: 'spa',
        imageUrl: SALON_IMAGES.nailArt
      },
      {
        id: 'us-10',
        name: 'Women’s Hair Styling & Blow Dry',
        category: 'Hair Styling',
        durationMinutes: 45,
        price: 800,
        description: 'A hair wash, blow dry and styling for a smooth, finished look.',
        icon: 'brush',
        imageUrl: SALON_IMAGES.hero
      },
      {
        id: 'us-11',
        name: 'Threading & Eyebrow Shaping',
        category: 'Beauty',
        durationMinutes: 20,
        price: 150,
        description: 'Eyebrow shaping and face threading done with care by our team.',
        icon: 'face',
        imageUrl: SALON_IMAGES.toolsSetup
      }
    ],
    stylists: [
      {
        id: 'us-st-1',
        name: 'Priya Nair',
        role: 'Salon Director & Colorist',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
        specialties: ['Inoa Color', 'De-Tan Cleanups', 'Unisex Cuts'],
        rating: 4.95
      },
      {
        id: 'us-st-2',
        name: 'Arjun Mehra',
        role: 'Senior Styling Director',
        avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
        specialties: ['Layered Blowouts', 'Beard & Hair Combos'],
        rating: 4.91
      },
      {
        id: 'us-st-3',
        name: 'Saniya Sheikh',
        role: 'Skin & Nail Aesthetician',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        specialties: ['Paraffin Pedicures', 'Organic Facials'],
        rating: 4.89
      }
    ]
  },

  // 4. Beauty Parlour
  beauty_parlour: {
    id: 'beauty_parlour',
    title: 'Roop Mahal Beauty Parlour & Makeover Space',
    shortName: 'Beauty Parlour',
    tagline: 'Bridal Makeovers, Signature Facials, Hair Care & Everyday Beauty Studio',
    about: 'Serving patrons for over 18 years in Connaught Place, Roop Mahal blends classic Indian herbal beauty secrets like turmeric, saffron, and sandalwood with modern waxing and gold facials.',
    icon: 'brush',
    layoutStyle: 'curved_elegant',
    paletteLabel: 'Warm Cream, Soft Rose, Deep Maroon & Champagne Gold',
    themePreset: 'rose_gold_ivory',
    subCategories: ['Threading & Waxing', 'Herbal Facials', 'D-Tan & Bleach', 'Festive Glow Combos'],
    defaultCity: 'New Delhi',
    defaultAddress: 'Inner Circle, Block E, Connaught Place',
    defaultPostalCode: '110001',
    phone: '+91 98110 99882',
    whatsapp: '+91 98110 99882',
    ownerName: 'Sunita Agarwal',
    ownerRole: 'Founder & Herbal Beauty Master',
    ownerPhotoUrl: '/templates/roop-mahal/staff-sunita.jpg',
    coverImageUrl: '/templates/roop-mahal/hero-bridal.jpg',
    instagramHandle: '@roopmahal.delhi',
    themeStyle: {
      heroBackground: 'bg-[#FFF8F1]',
      heroTextColor: 'text-[#352622]',
      cardBorder: 'border-[#C5A16B]/40',
      cardBackground: 'bg-[#FFFFFF]',
      cardRadius: 'rounded-2xl',
      accentColor: 'text-[#6D2638]',
      accentBg: 'bg-[#6D2638]',
      badgeBg: 'bg-[#D9A6A1]/25',
      badgeText: 'text-[#6D2638]',
      buttonBg: 'bg-[#6D2638] hover:bg-[#581e2d]',
      buttonText: 'text-white',
      priceColor: 'text-[#6D2638]',
      isDark: false,
      headerBanner: 'bg-[#FFF8F1] border-b border-[#C5A16B]/35'
    },
    services: [
      {
        id: 'bp-1',
        name: 'Full Face Organic Threading & Brow Shaping',
        category: 'Threading & Waxing',
        durationMinutes: 25,
        price: 250,
        description: 'Gentle cotton thread shaping for upper lip, chin, forehead with soothing rose water mist.',
        icon: 'content_cut',
        popular: true
      },
      {
        id: 'bp-2',
        name: 'Shahnaz Husain 24K Gold Glow Facial',
        category: 'Herbal Facials',
        durationMinutes: 60,
        price: 1450,
        description: 'Authentic 24k gold leaf serum, lymphatic face massage, and radiant brightening peel-off mask.',
        icon: 'spa',
        popular: true
      },
      {
        id: 'bp-3',
        name: 'Rica White Chocolate Full Body Waxing',
        category: 'Threading & Waxing',
        durationMinutes: 75,
        price: 1550,
        description: 'Colophony-free Italian wax, painless hair removal, and post-wax soothing chamomile lotion.',
        icon: 'clean_hands'
      },
      {
        id: 'bp-4',
        name: 'O3+ Ayurvedic D-Tan Brightening Pack',
        category: 'D-Tan & Bleach',
        durationMinutes: 30,
        price: 600,
        description: 'Instant tan removal formula with eucalyptus and mint extracts for sun-damaged skin.',
        icon: 'flare'
      },
      {
        id: 'bp-5',
        name: 'Karva Chauth & Diwali Shringaar Combo',
        category: 'Festive Glow Combos',
        durationMinutes: 90,
        price: 2100,
        description: 'Gold facial, full arms Rica waxing, threading, and express festive party blowout.',
        icon: 'celebration',
        popular: true
      }
    ],
    stylists: [
      {
        id: 'bp-st-1',
        name: 'Sunita Agarwal',
        role: 'Master Aesthetician',
        avatarUrl: '/templates/roop-mahal/staff-sunita.jpg',
        specialties: ['Gold Facials', 'Threading', 'Herbal Recipes'],
        rating: 4.96
      },
      {
        id: 'bp-st-2',
        name: 'Meenakshi Joshi',
        role: 'Senior Skin Therapist',
        avatarUrl: '/templates/roop-mahal/staff-meenakshi.jpg',
        specialties: ['Rica Waxing', 'Anti-Tan Peels'],
        rating: 4.92
      },
      {
        id: 'bp-st-3',
        name: 'Pooja Sundaram',
        role: 'Threading & Henna Expert',
        avatarUrl: '/templates/roop-mahal/staff-pooja.jpg',
        specialties: ['Eyebrow Arching', 'Festive Combos'],
        rating: 4.87
      }
    ]
  },

  // 5. Nail Studio
  nail_studio: {
    id: 'nail_studio',
    title: 'Pinky Nails Studio',
    shortName: 'Nail & Lash Studio',
    tagline: 'Beautiful Nails. Beautiful You.',
    about: 'At Pinky Nails Studio, we believe beautiful nails start with good care and attention to detail. Enjoy a clean, comfortable space and a nail look that suits your style.',
    icon: 'pan_tool_alt',
    layoutStyle: 'chic_nude',
    paletteLabel: 'Soft Pink, Blush & Deep Berry Nail Studio Theme',
    themePreset: 'pastel_blush',
    subCategories: ['Gel Extensions', 'Russian Manicure', 'Handpainted Art', 'Chrome & Glaze'],
    defaultCity: 'Hyderabad, Telangana',
    defaultAddress: 'Road No. 36, Near Peddamma Temple, Jubilee Hills',
    defaultPostalCode: '500033',
    phone: '+91 98490 77654',
    whatsapp: '+91 98490 77654',
    ownerName: 'Aanya Sen',
    ownerRole: 'Celebrity Nail Designer & Lash Artist',
    ownerPhotoUrl: '/templates/pinky-nails/team-nail-artist.jpg',
    coverImageUrl: '/templates/pinky-nails/hero-nail-artist.jpg',
    instagramHandle: '@pinkynails.studio',
    themeStyle: {
      heroBackground: 'bg-[#FFF5F7]',
      heroTextColor: 'text-[#30242A]',
      cardBorder: 'border-[#F4C8D5]',
      cardBackground: 'bg-[#FFFCFA]',
      cardRadius: 'rounded-[18px]',
      accentColor: 'text-[#702D4B]',
      accentBg: 'bg-[#702D4B]',
      badgeBg: 'bg-[#FFF5F7]',
      badgeText: 'text-[#702D4B] font-bold',
      buttonBg: 'bg-[#702D4B] hover:bg-[#5c233d]',
      buttonText: 'text-[#FFFCFA] font-bold',
      priceColor: 'text-[#702D4B] font-extrabold',
      isDark: false,
      headerBanner: 'bg-[#FFFCFA] border-b border-[#F4C8D5]'
    },
    services: [
      {
        id: 'ns-1',
        name: 'Full Set Gel-X Sculpted Extensions',
        category: 'Gel Extensions',
        durationMinutes: 90,
        price: 2400,
        description: 'Damage-free soft gel tips custom fitted to your natural nail bed with glossy UV seal.',
        icon: 'pan_tool_alt',
        popular: true
      },
      {
        id: 'ns-2',
        name: 'Russian Dry Cuticle Precision Manicure',
        category: 'Russian Manicure',
        durationMinutes: 60,
        price: 1100,
        description: 'E-file precision diamond bit cuticle cleanup, keratin basecoat, and high-shine gel polish.',
        icon: 'auto_awesome',
        popular: true
      },
      {
        id: 'ns-3',
        name: '10-Finger 3D Handpainted & Chrome Art',
        category: 'Handpainted Art',
        durationMinutes: 60,
        price: 1500,
        description: 'Custom micro-art, metallic chrome powder, pearl drops, and encapsulated glitter flakes.',
        icon: 'palette'
      },
      {
        id: 'ns-4',
        name: 'Hailey Glazed Donut Pearlescent Finish',
        category: 'Chrome & Glaze',
        durationMinutes: 45,
        price: 1600,
        description: 'Milky sheer nude base topped with ultra-fine iridescent white chrome powder.',
        icon: 'flare',
        popular: true
      },
      {
        id: 'ns-5',
        name: 'Luxury Rose Petal & Champagne Spa Pedicure',
        category: 'Russian Manicure',
        durationMinutes: 50,
        price: 1350,
        description: 'Warm bubbling floral foot soak, volcanic pumice scrub, and cooling mint gel massage.',
        icon: 'spa'
      }
    ],
    stylists: [
      {
        id: 'ns-st-1',
        name: 'Aanya Sen',
        role: 'Master Nail Artist',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        specialties: ['Gel-X Extensions', 'Hailey Chrome', '3D Jelly Art'],
        rating: 4.99
      },
      {
        id: 'ns-st-2',
        name: "Rhea D'Souza",
        role: 'Russian Manicurist',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        specialties: ['E-file Cuticles', 'Ombre Nails'],
        rating: 4.94
      },
      {
        id: 'ns-st-3',
        name: 'Kritika Bose',
        role: 'Creative Nail Stylist',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
        specialties: ['French Tips', 'Glitter Encapsulation'],
        rating: 4.90
      }
    ]
  },

  // 6. Hair Spa & Treatment
  hair_spa: {
    id: 'hair_spa',
    title: 'Kesh Prakriti Salon & Hair Spa',
    shortName: 'Salon & Hair Spa',
    tagline: 'Hair, skin and grooming care for every occasion',
    about: 'Welcome to Kesh Prakriti. From a relaxing head massage to everyday grooming and wedding-ready makeup, we are here to help you look and feel your best.',
    icon: 'spa',
    layoutStyle: 'zen_emerald',
    paletteLabel: 'Forest Green & Soft Sage',
    themePreset: 'emerald_sage',
    subCategories: ['Hair Care', 'Skin Care', 'Threading & Waxing', 'Men’s Grooming', 'Bridal & Groom Makeup'],
    defaultCity: 'Chennai, Tamil Nadu',
    defaultAddress: 'Alwarpet High Road, Near TTK Road, Alwarpet',
    defaultPostalCode: '600018',
    phone: '+91 98400 11993',
    whatsapp: '+91 98400 11993',
    ownerName: 'Dr. Gayatri Raman',
    ownerRole: 'Scalp Care Lead & Trichologist',
    ownerPhotoUrl: '',
    coverImageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    instagramHandle: '@keshprakriti.chennai',
    themeStyle: {
      heroBackground: 'bg-[#102B24]',
      heroTextColor: 'text-[#F9F6EF]',
      cardBorder: 'border-[#DEE4D8]',
      cardBackground: 'bg-[#FFFFFF]',
      cardRadius: 'rounded-2xl',
      accentColor: 'text-[#183D32]',
      accentBg: 'bg-[#183D32]',
      badgeBg: 'bg-[#E4EBDD]',
      badgeText: 'text-[#183D32]',
      buttonBg: 'bg-[#183D32] hover:bg-[#102B24]',
      buttonText: 'text-[#F9F6EF]',
      priceColor: 'text-[#183D32]',
      isDark: false,
      headerBanner: 'bg-[#F9F6EF] border-b border-[#C5A46D]/30'
    },
    services: [
      // Sample prices and services for the template. Published salons use their saved menu.
      {id: 'hsp-1', name: 'Hair Spa', category: 'Hair Care', durationMinutes: 60, price: 900, description: 'A relaxing hair wash, conditioning treatment and gentle head massage.', icon: 'spa', popular: true},
      {id: 'hsp-2', name: 'Traditional Head Massage', category: 'Hair Care', durationMinutes: 30, price: 350, description: 'A relaxing head massage with warm hair oil. Please tell us about any allergies before your visit.', icon: 'spa', popular: true},
      {id: 'hsp-3', name: 'Herbal Hair Pack', category: 'Hair Care', durationMinutes: 45, price: 650, description: 'A herbal hair pack followed by a wash. Ask our team about the ingredients before booking.', icon: 'eco'},
      {id: 'hsp-4', name: 'Eyebrow Threading', category: 'Threading & Waxing', durationMinutes: 15, price: 60, description: 'Neat eyebrow shaping with threading.', icon: 'face'},
      {id: 'hsp-5', name: 'Full Arms Waxing', category: 'Threading & Waxing', durationMinutes: 30, price: 400, description: 'Full arms waxing for smooth skin. Ask us about the wax used.', icon: 'spa'},
      {id: 'hsp-6', name: 'D-Tan Face Pack', category: 'Skin Care', durationMinutes: 30, price: 500, description: 'A face cleanse followed by a D-Tan pack. Let us know if you have sensitive skin.', icon: 'face'},
      {id: 'hsp-7', name: 'Face Cleanup', category: 'Skin Care', durationMinutes: 45, price: 700, description: 'A simple face cleanup with cleansing, gentle exfoliation and a face pack.', icon: 'face'},
      {id: 'hsp-8', name: 'Beard Grooming', category: 'Men’s Grooming', durationMinutes: 30, price: 250, description: 'Beard trimming and shaping to suit your style.', icon: 'content_cut'},
      {id: 'hsp-9', name: 'Bridal Makeup', category: 'Bridal & Groom Makeup', durationMinutes: 120, price: 6500, description: 'Makeup for your wedding day. Discuss your look, products and inclusions with our team before booking.', icon: 'face'},
      {id: 'hsp-10', name: 'Groom Makeup', category: 'Bridal & Groom Makeup', durationMinutes: 60, price: 2500, description: 'A natural makeup look for the groom. Discuss your preferences and inclusions before booking.', icon: 'face'},
      {id: 'template-pkg-hair_spa-1', name: 'Hair Spa & Head Massage Combo', category: 'Packages', durationMinutes: 90, price: 1150, description: 'Hair spa and a traditional head massage. Ask the salon about the services included.', icon: 'spa'},
      {id: 'template-pkg-hair_spa-2', name: 'Cleanup & Threading Combo', category: 'Packages', durationMinutes: 60, price: 730, description: 'Face cleanup and eyebrow threading in one visit.', icon: 'face'},
      {id: 'template-pkg-hair_spa-3', name: 'D-Tan & Threading Combo', category: 'Packages', durationMinutes: 45, price: 530, description: 'D-Tan face pack and eyebrow threading.', icon: 'face'},
      {id: 'template-pkg-hair_spa-4', name: 'Herbal Hair Care Combo', category: 'Packages', durationMinutes: 75, price: 950, description: 'Herbal hair pack and a relaxing head massage.', icon: 'eco'},
      {id: 'template-pkg-hair_spa-5', name: 'Grooming Combo', category: 'Packages', durationMinutes: 60, price: 700, description: 'Beard grooming and a D-Tan face pack.', icon: 'content_cut'}
    ],
    stylists: [
      {
        id: 'hsp-st-1',
        name: 'Dr. Gayatri Raman',
        role: 'Scalp Care Lead & Trichologist',
        bio: 'Gayatri helps clients choose hair and scalp care that suits their needs.',
        avatarUrl: '/templates/kesh-prakriti/team-gayatri.jpg',
        specialties: ['Scalp Care', 'Hair Spa', 'Hair Care'],
        rating: 4.97
      },
      {
        id: 'hsp-st-2',
        name: 'Karthik Sundaram',
        role: 'Senior Hair Spa Therapist',
        bio: 'Karthik offers relaxing head massages and hair spa services.',
        avatarUrl: '/templates/kesh-prakriti/team-karthik.jpg',
        specialties: ['Head Massage', 'Steam Treatments', 'Acupressure'],
        rating: 4.93
      },
      {
        id: 'hsp-st-3',
        name: 'Deepa Pillai',
        role: 'Herbal Treatment Specialist',
        bio: 'Deepa looks after herbal hair packs and oil treatments.',
        avatarUrl: '/templates/kesh-prakriti/team-deepa.jpg',
        specialties: ['Herbal Lepam', 'Oil Treatments', 'Root Care'],
        rating: 4.90
      }
    ]
  },

  // 7. Facial & Skincare Clinic
  skincare_clinic: {
    id: 'skincare_clinic',
    title: 'Dermacure Aesthetic Dermatology & Laser Clinic',
    shortName: 'Facial & Skincare Clinic',
    tagline: 'Evidence-Based Medi-Facials, Chemical Peels & Certified Dermatological Care',
    about: 'Dermacure in Gurugram brings US-FDA approved technologies, medical-grade HydraFacials, and customized peeling regimens under the direct guidance of certified dermatologists for radiant, healthy Indian skin.',
    icon: 'medical_services',
    layoutStyle: 'clinical_clean',
    paletteLabel: 'Fresh Blue & Crisp White Theme',
    themePreset: 'clinical_sky_blue',
    subCategories: ['Medi-Facials', 'Chemical Peels', 'Hydra-Infusion', 'Laser & Pigmentation'],
    defaultCity: 'Gurugram, Haryana',
    defaultAddress: 'Sector 29, Near IFFCO Chowk, Golf Course Road',
    defaultPostalCode: '122002',
    phone: '+91 98124 55432',
    whatsapp: '+91 98124 55432',
    ownerName: 'Dr. Tanvi Deshmukh',
    ownerRole: 'MD Dermatology & Aesthetic Consultant',
    // Bundled reference photography, served from this repository (never a
    // remote stock host) so the template renders offline and in CI.
    ownerPhotoUrl: '/templates/dermacure/reference-consultation.webp',
    coverImageUrl: '/templates/dermacure/hero-wide.webp',
    instagramHandle: '@dermacure.clinic',
    themeStyle: {
      heroBackground: 'bg-[#f0f9ff]',
      heroTextColor: 'text-sky-950',
      cardBorder: 'border-sky-200',
      cardBackground: 'bg-white',
      cardRadius: 'rounded-xl',
      accentColor: 'text-[#0284c7]',
      accentBg: 'bg-[#0284c7]',
      badgeBg: 'bg-sky-100',
      badgeText: 'text-sky-800',
      buttonBg: 'bg-[#0284c7] hover:bg-[#0369a1]',
      buttonText: 'text-white',
      priceColor: 'text-[#0284c7]',
      isDark: false,
      headerBanner: 'bg-sky-50 border-b border-sky-100'
    },
    services: [
      {
        id: 'sk-1', name: 'Initial Dermatology Consultation', category: 'Skin Consultation',
        durationMinutes: 30, price: 900,
        description: 'A first visit to discuss skin concerns, relevant history and possible next steps with a qualified clinician. Any assessment or plan depends on an in-person review.',
        icon: 'medical_services', popular: true, imageUrl: '/templates/dermacure/reference-consultation.webp', clinicDemoData: true, clinicServiceApproved: false, clinicPriceVerified: false, clinicFeeStatus: 'unverified', clinicPublicationStatus: 'draft'
      },
      {
        id: 'sk-2', name: 'Follow-up Dermatology Consultation', category: 'Skin Consultation',
        durationMinutes: 20, price: 600,
        description: 'A follow-up appointment to review progress, discuss questions and revisit the care plan with the clinician.',
        icon: 'medical_services', imageUrl: '/templates/dermacure/reference-consultation.webp', clinicDemoData: true, clinicServiceApproved: false, clinicPriceVerified: false, clinicFeeStatus: 'unverified', clinicPublicationStatus: 'draft'
      },
      {
        id: 'sk-3', name: 'Acne & Skin Concern Consultation', category: 'Skin Treatments',
        durationMinutes: 30, price: 1000,
        description: 'A clinician-led discussion of acne or other skin concerns, with suitable options considered after assessment. Results and treatment suitability vary by person.',
        icon: 'dermatology', popular: true, imageUrl: '/templates/dermacure/reference-rejuvenation.webp', clinicDemoData: true, clinicServiceApproved: false, clinicPriceVerified: false, clinicFeeStatus: 'unverified', clinicPublicationStatus: 'draft'
      },
      {
        id: 'sk-4', name: 'Supervised Chemical Peel Session', category: 'Chemical Peels',
        durationMinutes: 45, price: 2400,
        description: 'A skin-renewal peel selected by the clinician after reviewing skin type and concerns. Pre-care, aftercare and expected downtime are discussed before treatment.',
        icon: 'science', imageUrl: '/templates/dermacure/service-peel.webp', clinicDemoData: true, clinicServiceApproved: false, clinicPriceVerified: false, clinicFeeStatus: 'unverified', clinicPublicationStatus: 'draft'
      },
      {
        id: 'sk-5', name: 'LED Light Therapy Session', category: 'Skin Treatments',
        durationMinutes: 30, price: 1800,
        description: 'A comfortable LED session using the clinic’s configured light device. The clinician can advise whether it is appropriate as part of an individual care plan.',
        icon: 'lightbulb', imageUrl: '/templates/dermacure/reference-led.webp', clinicDemoData: true, clinicServiceApproved: false, clinicPriceVerified: false, clinicFeeStatus: 'unverified', clinicPublicationStatus: 'draft'
      },
      {
        id: 'sk-6', name: 'Pigmentation & Laser Consultation', category: 'Laser & Pigmentation',
        durationMinutes: 30, price: 1200,
        description: 'A consultation to discuss uneven tone and available options. Any laser treatment requires clinician assessment, suitability checks and a separate plan.',
        icon: 'flash_on', imageUrl: '/templates/dermacure/service-laser.webp', clinicDemoData: true, clinicServiceApproved: false, clinicPriceVerified: false, clinicFeeStatus: 'unverified', clinicPublicationStatus: 'draft'
      },
      {
        id: 'sk-7', name: 'Hair & Scalp Consultation', category: 'Hair & Scalp',
        durationMinutes: 30, price: 1000,
        description: 'Discuss hair or scalp concerns and relevant history with a clinician. Recommendations depend on an individual assessment; this sample fee is editable.',
        icon: 'health_and_safety', imageUrl: '/templates/dermacure/reference-consultation.webp', clinicDemoData: true, clinicServiceApproved: false, clinicPriceVerified: false, clinicFeeStatus: 'unverified', clinicPublicationStatus: 'draft'
      },
      {
        id: 'sk-8', name: 'Scalp Care Session', category: 'Hair & Scalp',
        durationMinutes: 45, price: 2200,
        description: 'A gentle scalp-care appointment planned around your needs and the clinic’s available services. Confirm suitability and aftercare with the clinic before booking.',
        icon: 'spa', imageUrl: '/templates/dermacure/treatment.webp', clinicDemoData: true, clinicServiceApproved: false, clinicPriceVerified: false, clinicFeeStatus: 'unverified', clinicPublicationStatus: 'draft'
      },
      {
        id: 'sk-9', name: 'Hydrating Medi-Facial', category: 'Medi-Facials',
        durationMinutes: 60, price: 3200,
        description: 'A professional cleansing and hydration-focused facial, tailored after a skin check. Products and steps can be adjusted to the clinic’s actual offering.',
        icon: 'water_drop', popular: true, imageUrl: '/templates/dermacure/service-hydration.webp', clinicDemoData: true, clinicServiceApproved: false, clinicPriceVerified: false, clinicFeeStatus: 'unverified', clinicPublicationStatus: 'draft'
      },
      {
        id: 'sk-10', name: 'Sensitive-Skin Comfort Facial', category: 'Medi-Facials',
        durationMinutes: 45, price: 2600,
        description: 'A gentle facial example for clients seeking a calming skincare visit. The clinician should review sensitivities and confirm suitable products first.',
        icon: 'face', imageUrl: '/templates/dermacure/reference-rejuvenation.webp', clinicDemoData: true, clinicServiceApproved: false, clinicPriceVerified: false, clinicFeeStatus: 'unverified', clinicPublicationStatus: 'draft'
      },
      {
        id: 'sk-11', name: 'Carbon Laser Facial', category: 'Laser & Pigmentation',
        durationMinutes: 45, price: 3800,
        description: 'An illustrative laser-service listing. Treatment parameters, eligibility, expected effects and aftercare must be confirmed by the clinic’s qualified clinician.',
        icon: 'flash_on', imageUrl: '/templates/dermacure/service-laser.webp', clinicDemoData: true, clinicServiceApproved: false, clinicPriceVerified: false, clinicFeeStatus: 'unverified', clinicPublicationStatus: 'draft'
      },
      {
        id: 'sk-12', name: 'Hyaluronic Hydration Infusion', category: 'Hydra-Infusion',
        durationMinutes: 50, price: 2600,
        description: 'A hydration-focused facial add-on example. The clinic should replace this description with its actual products, steps and suitability guidance.',
        icon: 'opacity', imageUrl: '/templates/dermacure/service-hydration.webp', clinicDemoData: true, clinicServiceApproved: false, clinicPriceVerified: false, clinicFeeStatus: 'unverified', clinicPublicationStatus: 'draft'
      }
    ],
    stylists: [
      {
        id: 'sk-st-1',
        name: 'Dr. Tanvi Deshmukh',
        role: 'MD Dermatologist',
        avatarUrl: '/templates/dermacure/team-tanvi.jpg',
        specialties: ['HydraFacial', 'Laser Toning', 'Chemical Peels'],
        rating: 4.99
      },
      {
        id: 'sk-st-2',
        name: 'Dr. Sameer Gill',
        role: 'Clinical Cosmetologist',
        avatarUrl: '/templates/dermacure/team-sameer.jpg',
        specialties: ['Carbon Laser', 'Acne Scar Revision'],
        rating: 4.95
      },
      {
        id: 'sk-st-3',
        name: 'Neha Saxena',
        role: 'Senior Aesthetic Therapist',
        avatarUrl: '/templates/dermacure/team-neha.jpg',
        specialties: ['LED Phototherapy', 'Hydra Infusion'],
        rating: 4.91
      }
    ]
  },

  // 8. Makeup Studio — Template 08: Vogue Noir Makeup Studio & Academy
  makeup_studio: {
    id: 'makeup_studio',
    title: VOGUE_NOIR_BRAND_NAME,
    shortName: VOGUE_NOIR_SELECTOR_LABEL,
    tagline: VOGUE_NOIR_TAGLINE,
    about: VOGUE_NOIR_DEFAULT_ABOUT,
    icon: 'face_retouching_natural',
    layoutStyle: 'dark_glam',
    paletteLabel: 'Obsidian Noir & Antique Gold',
    themePreset: 'obsidian_gold',
    subCategories: ['Bridal Studio', 'Complexion Artistry', 'Occasion Makeup', 'Editorial & Shoot', 'Hair & Finishing'],
    defaultCity: VOGUE_NOIR_DEFAULT_CITY,
    defaultAddress: VOGUE_NOIR_DEFAULT_ADDRESS,
    defaultPostalCode: VOGUE_NOIR_DEFAULT_POSTAL_CODE,
    phone: VOGUE_NOIR_DEFAULT_PHONE,
    whatsapp: VOGUE_NOIR_DEFAULT_PHONE,
    ownerName: 'Riya Kapoor',
    ownerRole: 'Founder & Lead Bridal Artist',
    ownerPhotoUrl: VOGUE_NOIR_IMAGES.artists.riya,
    coverImageUrl: VOGUE_NOIR_IMAGES.heroDesktop,
    instagramHandle: '@voguenoir.studio',
    themeStyle: {
      heroBackground: 'bg-[#0B0B0C]',
      heroTextColor: 'text-[#F5EFE6]',
      cardBorder: 'border-[#2A2A2D]',
      cardBackground: 'bg-[#151517]',
      cardRadius: 'rounded-none',
      accentColor: 'text-[#C9A96E]',
      accentBg: 'bg-[#C9A96E]',
      badgeBg: 'bg-[#151517]',
      badgeText: 'text-[#C9A96E]',
      buttonBg: 'bg-[#C9A96E] hover:bg-[#b89658]',
      buttonText: 'text-[#0B0B0C]',
      priceColor: 'text-[#C9A96E]',
      isDark: true,
      headerBanner: 'bg-[#0B0B0C] border-b border-[#2A2A2D]'
    },
    services: VOGUE_NOIR_TEMPLATE_SERVICES,
    stylists: VOGUE_NOIR_DEFAULT_STYLISTS
  },

  // 9. Massage, Spa & Wellness — Template 09: Bodhi Tree Massage & Wellness Sanctuary (bodhi-tree)
  massage_wellness: {
    id: 'massage_wellness',
    title: BODHI_TREE_BRAND_NAME,
    shortName: BODHI_TREE_SELECTOR_LABEL,
    tagline: BODHI_TREE_TAGLINE,
    about: BODHI_TREE_DEFAULT_ABOUT,
    icon: 'self_improvement',
    layoutStyle: 'palace_heritage',
    paletteLabel: 'Sage Green, Cream & Soft Gold — Royal Jaipur Retreat',
    themePreset: 'sage_cream_gold',
    subCategories: ['Ayurvedic Massage', 'Classic Massage', 'Head & Foot Care', 'Couple & Specials', 'Palace Collection', 'Packages'],
    defaultCity: BODHI_TREE_DEFAULT_CITY,
    defaultAddress: BODHI_TREE_DEFAULT_ADDRESS,
    defaultPostalCode: BODHI_TREE_DEFAULT_POSTAL_CODE,
    phone: BODHI_TREE_DEFAULT_PHONE,
    whatsapp: BODHI_TREE_DEFAULT_PHONE,
    ownerName: 'Anand Bodhi',
    ownerRole: 'Founder & Ayurvedic Wellness Lead',
    ownerPhotoUrl: BODHI_TREE_IMAGES.team.deepak,
    coverImageUrl: BODHI_TREE_IMAGES.heroDesktop,
    instagramHandle: '@bodhitree.jaipur',
    themeStyle: {
      heroBackground: 'bg-[#1E3A2F]',
      heroTextColor: 'text-[#FAF6EE]',
      cardBorder: 'border-[#C5A46D]/50',
      cardBackground: 'bg-[#FFFDF8]',
      cardRadius: 'rounded-[20px]',
      accentColor: 'text-[#1E3A2F]',
      accentBg: 'bg-[#4E6E58]',
      badgeBg: 'bg-[#EAF0E2]',
      badgeText: 'text-[#1E3A2F]',
      buttonBg: 'bg-[#4E6E58] hover:bg-[#1E3A2F]',
      buttonText: 'text-white',
      priceColor: 'text-[#1E3A2F]',
      isDark: false,
      headerBanner: 'bg-[#FAF6EE] border-b border-[#C5A46D]/40'
    },
    services: BODHI_TREE_TEMPLATE_SERVICES,
    stylists: BODHI_TREE_DEFAULT_STYLISTS
  },

  // 10. Hair Coloring Studio — Template 10: Prism & Chroma Hair Color Atelier (prism-chroma)
  hair_coloring: {
    id: 'hair_coloring',
    title: PRISM_CHROMA_BRAND_NAME,
    shortName: PRISM_CHROMA_SELECTOR_LABEL,
    tagline: PRISM_CHROMA_TAGLINE,
    about: 'Prism & Chroma is a premium hair colour studio in Bandra West, Mumbai. We do balayage, global colour, fashion and pastel shades, highlights, colour correction, keratin and gloss treatments. Before any colour, we check your hair health, do a patch test, and tell you the full price in ₹ — no surprises later.',
    icon: 'palette',
    layoutStyle: 'prism_holographic',
    paletteLabel: 'Ink Black & Holographic Prism Gradient (Violet · Magenta · Coral · Cyan)',
    themePreset: 'chroma_gradient',
    subCategories: ['Balayage & Highlights', 'Global Colour', 'Fashion Colours', 'Colour Correction', 'Keratin & Care', 'Packages'],
    defaultCity: PRISM_CHROMA_DEFAULT_CITY,
    defaultAddress: 'Linking Road, Bandra West',
    defaultPostalCode: PRISM_CHROMA_DEFAULT_POSTAL_CODE,
    phone: '+91 98200 10010',
    whatsapp: '+91 98200 10010',
    ownerName: 'Aarushi Mehta',
    ownerRole: 'Master Colourist & Founder',
    ownerPhotoUrl: PRISM_CHROMA_IMAGES.team.aarushi,
    coverImageUrl: PRISM_CHROMA_IMAGES.hero,
    instagramHandle: '@prismchroma.color',
    themeStyle: {
      heroBackground: 'bg-[#0B0B14]',
      heroTextColor: 'text-[#F5F3FF]',
      cardBorder: 'border-white/20',
      cardBackground: 'bg-white/5',
      cardRadius: 'rounded-[28px]',
      accentColor: 'text-[#FF4FD8]',
      accentBg: 'bg-gradient-to-r from-[#7C5CFF] via-[#FF4FD8] to-[#35E0F0]',
      badgeBg: 'bg-white/10',
      badgeText: 'text-[#F5F3FF]',
      buttonBg: 'bg-gradient-to-r from-[#7C5CFF] via-[#FF4FD8] to-[#FF8A5B] hover:opacity-95',
      buttonText: 'text-white font-bold',
      priceColor: 'text-[#F5F3FF] font-extrabold',
      isDark: true,
      headerBanner: 'bg-[#0B0B14]/80 border-b border-white/10'
    },
    services: PRISM_CHROMA_TEMPLATE_SERVICES,
    stylists: PRISM_CHROMA_DEFAULT_STYLISTS
  },

  // 11. Bridal Makeup & Makeover Lounge — Shringaar Royal Indian Bridal Lounge
  // "Royal Rajputana × Sabyasachi": ivory paper, oxblood maroon, royal gold.
  // Photography and demo content come from src/lib/shringaarRoyal.ts so the
  // template picker, onboarding draft and storefront share one source.
  bridal_lounge: {
    id: 'bridal_lounge',
    title: SHRINGAAR_BRAND_NAME,
    shortName: 'Bridal Makeup & Makeover Lounge',
    tagline: SHRINGAAR_TAGLINE,
    about: SHRINGAAR_DEFAULT_ABOUT,
    icon: 'diamond',
    layoutStyle: 'palace_heritage',
    paletteLabel: 'Royal Rajputana Maroon & Gold',
    themePreset: 'royal_crimson_gold',
    subCategories: ['Bridal Makeup', 'Bridal Hair', 'Draping & Styling', 'Mehendi', 'Pre-Bridal Rituals'],
    defaultCity: SHRINGAAR_DEFAULT_CITY,
    defaultAddress: SHRINGAAR_DEFAULT_ADDRESS,
    defaultPostalCode: SHRINGAAR_DEFAULT_POSTAL_CODE,
    phone: SHRINGAAR_DEFAULT_PHONE,
    whatsapp: SHRINGAAR_DEFAULT_PHONE,
    ownerName: 'Anuradha Rathore',
    ownerRole: 'Founder & Bridal Couture Director',
    ownerPhotoUrl: SHRINGAAR_IMAGES.owner,
    coverImageUrl: SHRINGAAR_IMAGES.hero,
    instagramHandle: '@shringaarroyal.jaipur',
    themeStyle: {
      heroBackground: 'bg-[#5A0F1E]',
      heroTextColor: 'text-[#FBF4E6]',
      cardBorder: 'border-[#C9A24B]/45',
      cardBackground: 'bg-[#FBF4E6]',
      cardRadius: 'rounded-2xl',
      accentColor: 'text-[#5A0F1E]',
      accentBg: 'bg-[#5A0F1E]',
      badgeBg: 'bg-[#C9A24B]/20',
      badgeText: 'text-[#5A0F1E]',
      buttonBg: 'bg-[#5A0F1E] hover:bg-[#4a0c18]',
      buttonText: 'text-[#FBF4E6]',
      priceColor: 'text-[#5A0F1E]',
      isDark: false,
      headerBanner: 'bg-[#FBF4E6] border-b border-[#C9A24B]/40'
    },
    services: SHRINGAAR_TEMPLATE_SERVICES,
    stylists: SHRINGAAR_DEFAULT_STYLISTS
  },

  // 12. Tattoo & Body Art Studio (Newly Added)
  tattoo_studio: {
    id: 'tattoo_studio',
    title: 'Iron & Ink Urban Tattoo & Body Art Studio',
    shortName: 'Template 12 – Iron & Ink',
    tagline: 'High-Contrast Monochrome, Custom Dark Realism & Surgical Piercings',
    about: 'Located in bohemian Hauz Khas Village, New Delhi, Iron & Ink is a studio dedicated to custom blackwork, fine-line realism, and sterile body piercings using 100% single-use disposable needles.',
    icon: 'draw',
    layoutStyle: 'urban_monochrome',
    paletteLabel: 'Edgy Dark Urban Layout & Monochrome Design',
    themePreset: 'urban_monochrome',
    subCategories: ['Custom Blackwork', 'Fine-Line Realism', 'Body Piercing', 'Tattoo Cover-ups'],
    defaultCity: 'New Delhi',
    defaultAddress: 'Building 14, Hauz Khas Village, Near Deer Park',
    defaultPostalCode: '110016',
    phone: '+91 98118 77621',
    whatsapp: '+91 98118 77621',
    ownerName: "Varun 'Ink' Mathur",
    ownerRole: 'Founder & Realism Tattooist',
    ownerPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=1200&q=80',
    instagramHandle: '@ironandink.delhi',
    themeStyle: {
      heroBackground: 'bg-[#0a0a0a]',
      heroTextColor: 'text-white',
      cardBorder: 'border-white/20',
      cardBackground: 'bg-[#141414]',
      cardRadius: 'rounded-none',
      accentColor: 'text-white',
      accentBg: 'bg-white',
      badgeBg: 'bg-neutral-800',
      badgeText: 'text-neutral-200',
      buttonBg: 'bg-white hover:bg-neutral-200',
      buttonText: 'text-black',
      priceColor: 'text-white',
      isDark: true,
      headerBanner: 'bg-[#050505] border-b border-white/20'
    },
    services: createIronInkServices(),
    stylists: [
      {
        id: 'ts-st-1',
        name: "Varun 'Ink' Mathur",
        role: 'Chief Tattoo Artist',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        specialties: ['Dark Realism', 'Geometric Blackwork', 'Sleeves'],
        rating: 4.98
      },
      {
        id: 'ts-st-2',
        name: 'Tanya Roy',
        role: 'Fine-Line & Script Specialist',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        specialties: ['Single-Needle Florals', 'Micro Tattoos'],
        rating: 4.95
      },
      {
        id: 'ts-st-3',
        name: 'Chetan Rawat',
        role: 'Senior Body Piercing Artist',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        specialties: ['Cartilage Piercing', 'Titanium Jewelry Styling'],
        rating: 4.92
      }
    ]
  },

  // 13. Arch & Flutter Lash & Brow Bar (editorial-luxury eye-area atelier)
  lash_brow: {
    id: 'lash_brow',
    title: ARCH_FLUTTER_BRAND_NAME,
    shortName: 'Lash & Brow Bar',
    tagline: ARCH_FLUTTER_TAGLINE,
    about: ARCH_FLUTTER_DEFAULT_ABOUT,
    icon: 'visibility',
    layoutStyle: 'editorial_bento',
    paletteLabel: 'Blush Rose, Warm Ivory & Champagne Gold',
    themePreset: 'blush_champagne',
    subCategories: ARCH_FLUTTER_CATEGORIES.map((category) => category.name),
    defaultCity: ARCH_FLUTTER_DEFAULT_CITY,
    defaultAddress: ARCH_FLUTTER_DEFAULT_ADDRESS,
    defaultPostalCode: ARCH_FLUTTER_DEFAULT_POSTAL_CODE,
    phone: ARCH_FLUTTER_DEFAULT_PHONE,
    whatsapp: ARCH_FLUTTER_DEFAULT_PHONE,
    ownerName: 'Meher Kothari',
    ownerRole: 'Founder & Master Lash Artist',
    ownerPhotoUrl: ARCH_FLUTTER_IMAGES.owner.src,
    coverImageUrl: ARCH_FLUTTER_IMAGES.hero.src,
    instagramHandle: '@archandflutter.jaipur',
    themeStyle: {
      heroBackground: 'bg-[#FBF6F1]',
      heroTextColor: 'text-[#2B1B17]',
      cardBorder: 'border-[#C9A66B]/45',
      cardBackground: 'bg-white/80',
      cardRadius: 'rounded-2xl',
      accentColor: 'text-[#9A6B73]',
      accentBg: 'bg-[#9A6B73]',
      badgeBg: 'bg-[#F4D7D3]',
      badgeText: 'text-[#7A4F57]',
      buttonBg: 'bg-[#2B1B17] hover:bg-[#3A2620]',
      buttonText: 'text-[#FBF6F1]',
      priceColor: 'text-[#8A6A2F]',
      isDark: false,
      headerBanner: 'bg-[#F4D7D3]/60 border-b border-[#C9A66B]/40'
    },
    services: ARCH_FLUTTER_TEMPLATE_SERVICES,
    stylists: ARCH_FLUTTER_DEFAULT_STYLISTS
  },

  // 14. Veda Sanjeevani Ayurvedic Wellness & Spa
  ayurvedic_spa: {
    id: 'ayurvedic_spa',
    title: 'Veda Sanjeevani Ayurvedic Wellness & Spa',
    shortName: 'Ayurvedic Wellness & Spa',
    tagline: 'Ayurveda, unhurried. Warm-oil rituals, Shirodhara and physician-led care in Kota.',
    about: 'A small Ayurvedic sanctuary in Civil Lines, Kota: four treatment rooms, a physician who reads the pulse before recommending anything, oil warmed to body temperature and therapists who ask how much pressure you actually want.',
    icon: 'eco',
    layoutStyle: 'ayurvedic_terracotta',
    paletteLabel: 'Deep Forest Green, Warm Ivory, Muted Sage & Antique Gold',
    themePreset: 'ayurvedic_terracotta',
    subCategories: [...VEDA_SERVICE_CATEGORIES],
    defaultCity: VEDA_DEFAULT_CITY,
    defaultAddress: VEDA_DEFAULT_ADDRESS,
    defaultPostalCode: '324005',
    phone: VEDA_DEFAULT_PHONE,
    whatsapp: VEDA_DEFAULT_PHONE,
    ownerName: 'Vaidya Ananya Sharma',
    ownerRole: 'BAMS Ayurvedic Physician',
    ownerPhotoUrl: VEDA_THERAPISTS[0].avatarUrl,
    coverImageUrl: vedaImage('hero'),
    instagramHandle: VEDA_DEFAULT_INSTAGRAM,
    themeStyle: {
      heroBackground: 'bg-[#14251D]',
      heroTextColor: 'text-[#F7F2E7]',
      cardBorder: 'border-[#B08D4F]/35',
      cardBackground: 'bg-[#F7F2E7]/92',
      cardRadius: 'rounded-3xl',
      accentColor: 'text-[#B08D4F]',
      accentBg: 'bg-[#1F3B2E]',
      badgeBg: 'bg-[#DCE4D6]',
      badgeText: 'text-[#1F3B2E]',
      buttonBg: 'bg-[#1F3B2E] hover:bg-[#14251D]',
      buttonText: 'text-[#F7F2E7]',
      priceColor: 'text-[#1F3B2E]',
      isDark: false,
      headerBanner: 'bg-[#EADFCB]/60 border-b border-[#B08D4F]/30',
    },
    services: VEDA_SERVICES,
    stylists: VEDA_THERAPISTS,
  },
  mens_hair_studio: {
    id:'mens_hair_studio', title:"KeshKraft Men's Hair Studio", shortName:"Men's Haircut & Hair Colour Studio",
    tagline:MENS_DESCRIPTION, about:"Precision haircuts. Considered colour. A dedicated men-only studio for your individual style.",
    icon:'content_cut', layoutStyle:'mens_olive_editorial', paletteLabel:'Charcoal, Deep Olive, Warm Beige & Matte Bronze', themePreset:'vintage_brass',
    subCategories:[...MENS_CATEGORIES], defaultCity:'Udaipur, Rajasthan', defaultAddress:'Studio address to be confirmed', defaultPostalCode:'313001', phone:'', whatsapp:'',
    ownerName:'Arjun Rathore',ownerRole:"Men's Haircut Specialist",ownerPhotoUrl:MENS_STAFF[0].avatarUrl,coverImageUrl:MENS_HERO,instagramHandle:'',
    themeStyle:{heroBackground:'bg-[#161817]',heroTextColor:'text-[#f3eee5]',cardBorder:'border-[#b08a61]',cardBackground:'bg-[#20231f]',cardRadius:'rounded-xl',accentColor:'text-[#b08a61]',accentBg:'bg-[#353d2c]',badgeBg:'bg-[#353d2c]',badgeText:'text-[#f3eee5]',buttonBg:'bg-[#b08a61]',buttonText:'text-[#161817]',priceColor:'text-[#b08a61]',isDark:true,headerBanner:'bg-[#353d2c]'},
    services:MENS_SERVICES,stylists:MENS_STAFF,
  },
  aurelia_beauty_parlour: {
    id:'aurelia_beauty_parlour',
    title:'Aurelia Luxury Beauty & Wellness Studio',
    shortName:'Beauty Parlour & Wellness Studio',
    tagline:'A thoughtful space for hair, skin and self-care.',
    about:'Aurelia is a warm, modern beauty and wellness studio inspired by thoughtful service, skilled artistry and a personal approach to every visit.',
    icon:'auto_awesome',
    layoutStyle:'aurelia_editorial',
    paletteLabel:'Warm Ivory, Coffee Brown, Sandstone & Champagne',
    themePreset:'rose_gold_ivory',
    subCategories:['Hair Styling','Hair Colour','Skin Rituals','Bridal','Nail Studio','Spa & Wellness'],
    defaultCity:'Mumbai, Maharashtra',
    defaultAddress:'Bandra West, Mumbai',
    defaultPostalCode:'400050',
    phone:'',
    whatsapp:'',
    ownerName:'Aurelia Studio Team',
    ownerRole:'Beauty & Wellness Studio',
    ownerPhotoUrl:AURELIA_IMAGES.leah,
    coverImageUrl:AURELIA_IMAGES.hero,
    instagramHandle:'',
    themeStyle:{
      heroBackground:'bg-[#F6F1EA]',
      heroTextColor:'text-[#1D1612]',
      cardBorder:'border-[#D8C8B4]',
      cardBackground:'bg-[#EFE6DA]',
      cardRadius:'rounded-sm',
      accentColor:'text-[#8C6A43]',
      accentBg:'bg-[#1D1612]',
      badgeBg:'bg-[#E8DDCF]',
      badgeText:'text-[#5A4635]',
      buttonBg:'bg-[#1D1612] hover:bg-[#8C6A43]',
      buttonText:'text-[#F6F1EA]',
      priceColor:'text-[#1D1612]',
      isDark:false,
      headerBanner:'bg-[#F6F1EA] border-b border-[#D8C8B4]'
    },
    services:AURELIA_DEFAULT_SERVICES,
    stylists:AURELIA_DEFAULT_STAFF
  }

};

for(const template of Object.values(CATEGORY_TEMPLATES))if(template.id!=='mens_hair_studio')template.services=seedTemplatePackages(template);

/**
 * Raw picker options. Order here is irrelevant: `ALL_CATEGORY_OPTIONS` below
 * normalises every entry with its NEXORA name, category and priority rank and
 * then sorts with the one shared priority comparator.
 */
const CATEGORY_OPTION_SEED: BusinessTypeOption[] = [
  {
    id: 'hair_salon',
    title: 'Ziya Women’s Hair Studio',
    categoryTag: 'Women’s Haircut Studio',
    icon: 'content_cut',
    aestheticDescription: 'Specialist women’s haircut studio in soft ivory, rose beige, muted blush & champagne gold.',
    paletteName: 'Soft Ivory, Rose Beige & Gold',
    badge: 'Popular',
    defaultServices: CATEGORY_TEMPLATES.hair_salon.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'barber',
    title: "Barber Shop / Men's Grooming",
    categoryTag: "Men's Luxury",
    icon: 'content_cut',
    aestheticDescription: 'Vintage industrial barbershop aesthetic, dark wood & brass theme.',
    paletteName: 'Dark Wood & Brass',
    badge: 'Classic',
    defaultServices: CATEGORY_TEMPLATES.barber.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'unisex_salon',
    title: 'Unisex Salon',
    categoryTag: 'All-Gender Care',
    icon: 'diversity_3',
    aestheticDescription: 'Contemporary balanced layout, warm neutral & pastel pink/grey theme.',
    paletteName: 'Pastel Blush & Stone',
    badge: 'Trending',
    defaultServices: CATEGORY_TEMPLATES.unisex_salon.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'beauty_parlour',
    title: 'Beauty Parlour',
    categoryTag: 'Herbal & Skin',
    icon: 'brush',
    aestheticDescription: 'Soft, elegant aesthetic with curved cards, rose gold & ivory theme.',
    paletteName: 'Rose Gold & Ivory',
    badge: 'Traditional',
    defaultServices: CATEGORY_TEMPLATES.beauty_parlour.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'nail_studio',
    title: 'Nail Studio',
    categoryTag: 'Nail Couture',
    icon: 'pan_tool_alt',
    aestheticDescription: 'Trendy bento-grid layout, vibrant neon pastel & gloss theme.',
    paletteName: 'Neon Pastel & Gloss',
    badge: 'Bento Layout',
    defaultServices: CATEGORY_TEMPLATES.nail_studio.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'hair_spa',
    title: 'Hair Spa & Treatment',
    categoryTag: 'Trichology & Zen',
    icon: 'spa',
    aestheticDescription: 'Relaxing, zen-inspired layout, deep emerald green & sage theme.',
    paletteName: 'Deep Emerald & Sage',
    badge: 'Zen Sanctuary',
    defaultServices: CATEGORY_TEMPLATES.hair_spa.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'skincare_clinic',
    title: 'Facial & Skincare Clinic',
    categoryTag: 'Medi-Aesthetic',
    icon: 'medical_services',
    aestheticDescription: 'Clean clinical/dermatology feel, fresh blue & crisp white theme.',
    paletteName: 'Clinical Sky Blue & White',
    badge: 'Derm Approved',
    defaultServices: CATEGORY_TEMPLATES.skincare_clinic.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'makeup_studio',
    title: VOGUE_NOIR_SELECTOR_LABEL,
    categoryTag: 'Bridal Studio & Academy',
    icon: 'face_retouching_natural',
    aestheticDescription: 'Dark luxury editorial beauty storefront with Bridal Packages & Pro Makeup Academy.',
    paletteName: 'Obsidian Noir & Antique Gold',
    badge: 'Template 08',
    defaultServices: CATEGORY_TEMPLATES.makeup_studio.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'massage_wellness',
    title: BODHI_TREE_SELECTOR_LABEL,
    categoryTag: 'Massage, Spa & Wellness',
    icon: 'self_improvement',
    aestheticDescription: 'A royal Jaipur retreat — calm, premium and peaceful with jharokha arch cards, jaali patterns and a Jaipur Palace Collection.',
    paletteName: 'Sage Green, Cream & Soft Gold',
    badge: 'Template 09',
    defaultServices: CATEGORY_TEMPLATES.massage_wellness.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'hair_coloring',
    title: PRISM_CHROMA_SELECTOR_LABEL,
    categoryTag: 'Hair Colour Studio',
    icon: 'palette',
    aestheticDescription: 'Light through a Prism — dark premium atelier with holographic gradient glow, bento cards, Shade Studio and before/after sliders.',
    paletteName: 'Ink Black & Holographic Prism Gradient',
    badge: 'Template 10',
    defaultServices: CATEGORY_TEMPLATES.hair_coloring.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'bridal_lounge',
    title: SHRINGAAR_SELECTOR_LABEL,
    categoryTag: 'Royal Weddings',
    icon: 'diamond',
    aestheticDescription: 'Royal Rajputana × Sabyasachi — ivory paper, oxblood maroon, gold jharokha arches, editorial bridal lookbook and heirloom package cards.',
    paletteName: 'Royal Rajputana Maroon & Gold',
    badge: 'Template 11',
    defaultServices: CATEGORY_TEMPLATES.bridal_lounge.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'tattoo_studio',
    title: 'Iron & Ink Urban Tattoo & Body Art Studio',
    categoryTag: 'Urban Body Art',
    icon: 'draw',
    aestheticDescription: 'Template 12 · dark luxury tattoo atelier, editorial image-led sections, artist portfolios and custom booking.',
    paletteName: 'Iron & Ink · Blood Red',
    badge: 'Template 12',
    defaultServices: CATEGORY_TEMPLATES.tattoo_studio.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'lash_brow',
    title: 'Arch & Flutter Lash & Brow Bar',
    categoryTag: 'Eye-Area Atelier',
    icon: 'visibility',
    aestheticDescription: 'Template 13 · editorial-luxury lash & brow bar: bento grid of fifteen eye-area categories, arch-masked photography, glass cards, featured video with vertical reels and an honest ₹ menu.',
    paletteName: 'Blush Rose & Champagne Gold',
    badge: 'Template 13',
    defaultServices: CATEGORY_TEMPLATES.lash_brow.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  },
  {
    id: 'ayurvedic_spa',
    title: 'Ayurvedic Rejuvenation Spa',
    categoryTag: 'Vedic Healing',
    icon: 'eco',
    aestheticDescription: 'Traditional Indian heritage aesthetic with terracotta & copper accents.',
    paletteName: 'Terracotta & Copper',
    badge: 'Newly Added',
    defaultServices: CATEGORY_TEMPLATES.ayurvedic_spa.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.durationMinutes,
      category: s.category
    }))
  }
];

CATEGORY_OPTION_SEED.push({id:'mens_hair_studio',title:"KeshKraft Men's Hair Studio",categoryTag:"Men's Haircut & Hair Colour Studio",icon:'content_cut',aestheticDescription:'Men only. Precision haircuts and considered colour in charcoal, olive and bronze.',paletteName:'Charcoal, Olive & Bronze',badge:'New · 15',defaultServices:MENS_SERVICES.map(s=>({name:s.name,price:s.price,duration:s.durationMinutes,category:s.category}))});
CATEGORY_OPTION_SEED.push({id:'aurelia_beauty_parlour',title:'Aurelia Luxury Beauty & Wellness Studio',categoryTag:'Beauty Parlour',icon:'auto_awesome',aestheticDescription:'A warm editorial beauty studio in ivory, coffee brown and champagne, with hair, skin, bridal, nails and wellness services.',paletteName:'Warm Ivory, Coffee Brown & Champagne',badge:'New · 16',defaultServices:AURELIA_DEFAULT_SERVICES.map(s=>({name:s.name,price:Number(s.price||0),duration:s.durationMinutes,category:s.category}))});

/**
 * NEXORA presentation for the template picker.
 *
 * Adds the platform display name, the customer-facing category and the stable
 * 1–15 priority rank to each option, then applies the shared priority
 * comparator. Template IDs, services and prices are untouched, so anything
 * holding a reference to an option keeps working.
 */
function nexoraOption(option: BusinessTypeOption): BusinessTypeOption {
  const meta: NexoraTemplateMeta | undefined = nexoraTemplateMeta(option.id);
  const category = meta ? nexoraCategory(meta.categoryId) : undefined;
  return {
    ...option,
    title: meta?.displayName || option.title,
    categoryTag: meta?.categoryName || option.categoryTag,
    displayName: meta?.displayName || option.title,
    categoryId: meta?.categoryId,
    categoryName: meta?.categoryName || category?.categoryName,
    priorityRank: meta?.priorityRank,
    displayOrder: meta?.displayOrder,
    templateNumber: meta?.templateNumber,
    searchTags: meta?.searchTags,
  };
}

export const ALL_CATEGORY_OPTIONS: BusinessTypeOption[] = [...CATEGORY_OPTION_SEED]
  .map(nexoraOption)
  .sort((a, b) => compareTemplatesByPriority({ id: a.id, priorityRank: a.priorityRank, displayOrder: a.displayOrder }, { id: b.id, priorityRank: b.priorityRank, displayOrder: b.displayOrder }));
