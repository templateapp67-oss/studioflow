/**
 * Template-wise automatic service setup — one configuration per NEXORA template.
 *
 * Every one of the 16 salon templates has its own service title library, badge
 * library, offer-type list, description voice, suggested tags and terms lines.
 * Nothing here is shared between unrelated templates: the ids, names and
 * categories are read from the real template registry (`CATEGORY_TEMPLATES`), so
 * an option can never leak from Template 03 into Template 04.
 *
 * The module is deliberately *suggestion only*:
 * - service names, categories, prices and durations are never rewritten;
 * - a badge is only suggested when the service data already supports it
 *   (featured flag, package category);
 * - an offer type is never invented for a service that has no offer;
 * - missing salon policies produce clearly flagged suggested wording that the
 *   owner has to confirm, and existing salon policies are reused verbatim.
 */
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import type { BusinessTypeId, ServiceMerchandising, ServiceOfferType, SalonService } from '../types';

/** The stable NEXORA template order (01 → 16) used across the platform. */
export const TEMPLATE_ORDER: BusinessTypeId[] = [
  'hair_salon',
  'barber',
  'beauty_parlour',
  'nail_studio',
  'unisex_salon',
  'mens_hair_studio',
  'hair_spa',
  'skincare_clinic',
  'makeup_studio',
  'bridal_lounge',
  'hair_coloring',
  'massage_wellness',
  'tattoo_studio',
  'lash_brow',
  'ayurvedic_spa',
  'aurelia_beauty_parlour',
];

/** Customer-facing label for every offer type. */
export const SERVICE_OFFER_TYPE_LABELS: Record<ServiceOfferType, string> = {
  none: 'No offer',
  percent: 'Percentage discount',
  flat: 'Flat discount',
  combo: 'Combo offer',
  bogo: 'Buy 1 Get 1',
  seasonal: 'Seasonal offer',
  festive: 'Festive offer',
  first_visit: 'First visit offer',
  membership: 'Membership offer',
  package: 'Package offer',
  limited_time: 'Limited-time offer',
};

/** Short form used on compact service cards. */
export const SERVICE_OFFER_TYPE_SHORT: Record<ServiceOfferType, string> = {
  none: 'No offer',
  percent: '% off',
  flat: 'Flat off',
  combo: 'Combo',
  bogo: 'Buy 1 Get 1',
  seasonal: 'Seasonal',
  festive: 'Festive',
  first_visit: 'First visit',
  membership: 'Membership',
  package: 'Package',
  limited_time: 'Limited time',
};

export interface TemplateTitleSuggestion {
  title: string;
  category: string;
  /** Where the suggestion came from: the template's live menu or its curated library. */
  source: 'menu' | 'library';
}

export interface TemplateServiceSetup {
  templateId: BusinessTypeId;
  /** "01" … "16" — matches the NEXORA template menu number. */
  templateNumber: string;
  /** Salon type, used in owner-facing helper text. */
  salonType: string;
  /** Curated titles that are not already in the template's starter menu. */
  titleLibrary: Array<{ title: string; category: string }>;
  badges: string[];
  /** Badge used when the owner marks a service as featured. */
  featuredBadge: string;
  /** Badge used for package / combo style services. */
  packageBadge: string;
  offerTypes: ServiceOfferType[];
  tags: string[];
  /** Category-specific positioning sentence used by the description writer. */
  categoryNotes: Record<string, string>;
  /** Used when a category has no dedicated note. */
  fallbackNote: string;
  /** Two or three closing lines so neighbouring services do not read identically. */
  closings: string[];
  /** Template-specific terms lines that are true of this salon type only. */
  termsLines: string[];
}

/* -------------------------------------------------------------------------- */
/* The 16 template configurations                                             */
/* -------------------------------------------------------------------------- */

const TEMPLATE_SETUPS: Record<BusinessTypeId, TemplateServiceSetup> = {
  hair_salon: {
    templateId: 'hair_salon',
    templateNumber: '01',
    salonType: 'Women’s haircut studio',
    titleLibrary: [
      { title: 'Butterfly Layer Cut with Blow-Dry Finish', category: 'Signature Cuts' },
      { title: 'Layered U-Cut', category: 'Long & Step Cuts' },
      { title: 'Blunt Bob Shape', category: 'Short & Bob Cuts' },
      { title: 'Curtain Fringe Trim', category: 'Bangs & Face-Framing' },
      { title: 'Curly Shape Consultation', category: 'Curly & Consultation' },
      { title: 'Wash, Cut & Style', category: 'Signature Cuts' },
    ],
    badges: ['Ziya Signature', 'Client Favourite', 'Trending Cut', 'New Style', 'Best Seller', 'Bridal Ready', 'First Visit Pick'],
    featuredBadge: 'Client Favourite',
    packageBadge: 'Ziya Signature',
    offerTypes: ['combo', 'first_visit', 'membership', 'package', 'limited_time', 'seasonal'],
    tags: ['women’s haircut', 'layer cut', 'butterfly cut', 'face-framing', 'curly cut', 'blow-dry finish'],
    categoryNotes: {
      'Signature Cuts': 'It is planned around the length and shape you ask for, with a clean finish.',
      'Short & Bob Cuts': 'It is for anyone choosing a shorter bob or cropped shape and wanting the length discussed first.',
      'Long & Step Cuts': 'It is for longer hair that needs an even shape with stepped layers.',
      'Bangs & Face-Framing': 'It is for a fringe or face-framing trim that sits with your usual parting.',
      'Curly & Consultation': 'It is a working consultation for curly hair before any cutting decision is made.',
      'Signature Packages': 'It combines more than one menu service into a single studio visit.',
    },
    fallbackNote: 'It is part of the studio’s cut and styling menu.',
    closings: [
      'Ask your stylist about the right length and finish for your hair during the appointment.',
      'The final shape is agreed with you before the cut begins.',
      'Book a slot to check availability for this cut.',
    ],
    termsLines: [
      'Haircut appointments are confirmed against the studio’s booking calendar.',
      'Please come with dry, detangled hair unless the booked service includes a wash.',
    ],
  },
  barber: {
    templateId: 'barber',
    templateNumber: '02',
    salonType: 'Men’s barber shop',
    titleLibrary: [
      { title: 'Skin Fade with Beard Line-Up', category: 'Executive Cuts' },
      { title: 'Charcoal Detox Hair Wash', category: 'Executive Cuts' },
      { title: 'Royal Shave with Hot Towel Finish', category: 'Hot Towel Shaves' },
      { title: 'Beard Trim & Moustache Shape', category: 'Beard Sculpting' },
      { title: 'Father & Son Cut Combo', category: 'Maharaja Packages' },
      { title: 'Groom Grooming Consultation', category: 'Maharaja Packages' },
    ],
    badges: ['Royal Classic', 'Barber’s Pick', 'Regulars’ Choice', 'Best Seller', 'New Menu', 'Maharaja Signature'],
    featuredBadge: 'Regulars’ Choice',
    packageBadge: 'Maharaja Signature',
    offerTypes: ['flat', 'combo', 'membership', 'first_visit', 'festive', 'limited_time'],
    tags: ['men’s grooming', 'skin fade', 'hot towel shave', 'beard sculpting', 'hair wash', 'groom package'],
    categoryNotes: {
      'Executive Cuts': 'It covers a men’s cut with a defined finish for the working week.',
      'Hot Towel Shaves': 'It is a straight-razor shave prepared with hot towels before the shave.',
      'Beard Sculpting': 'It is beard shaping and clean-up around the jaw and neckline.',
      'Maharaja Packages': 'It groups several club services into one longer chair session.',
      'Signature Packages': 'It combines more than one club service into a single visit.',
    },
    fallbackNote: 'It is part of the club’s grooming menu.',
    closings: [
      'Your barber confirms the clipper grade and beard shape with you before starting.',
      'Tell the barber your usual grade so the finish matches what you expect.',
      'Book a chair to check the next available slot.',
    ],
    termsLines: [
      'Chair bookings are confirmed against the club’s booking calendar.',
      'Shave and beard services are carried out with the studio’s own towels and tools.',
    ],
  },
  beauty_parlour: {
    templateId: 'beauty_parlour',
    templateNumber: '03',
    salonType: 'Beauty parlour',
    titleLibrary: [
      { title: 'Eyebrow Threading & Shape', category: 'Threading & Waxing' },
      { title: 'Full Arms Waxing', category: 'Threading & Waxing' },
      { title: 'Herbal Glow Facial', category: 'Herbal Facials' },
      { title: 'D-Tan Brightening Pack', category: 'D-Tan & Bleach' },
      { title: 'Karva Chauth Shringaar Combo', category: 'Festive Glow Combos' },
      { title: 'Bridal Glow Package', category: 'Festive Glow Combos' },
    ],
    badges: ['Parlour Favourite', 'Bridal Pick', 'Festive Special', 'Best Seller', 'Herbal Choice', 'New Arrival'],
    featuredBadge: 'Parlour Favourite',
    packageBadge: 'Festive Special',
    offerTypes: ['percent', 'flat', 'combo', 'festive', 'seasonal', 'package', 'first_visit'],
    tags: ['threading', 'waxing', 'herbal facial', 'd-tan', 'festive glow', 'bridal makeover'],
    categoryNotes: {
      'Threading & Waxing': 'It covers hair removal for the areas included in the booking.',
      'Herbal Facials': 'It is a facial on the parlour’s herbal menu, chosen for your skin type at the appointment.',
      'D-Tan & Bleach': 'It is a de-tan or bleach service for the area you choose.',
      'Festive Glow Combos': 'It groups parlour favourites for a festival or family function.',
      'Signature Packages': 'It combines more than one parlour service into a single visit.',
    },
    fallbackNote: 'It is part of the parlour’s beauty menu.',
    closings: [
      'The parlour confirms the products used for your skin type before starting.',
      'Let the beautician know about any sensitivity before the service begins.',
      'Book a slot to check availability for this service.',
    ],
    termsLines: [
      'Parlour appointments are confirmed against the booking calendar.',
      'Please mention any skin sensitivity or allergy before the service starts.',
    ],
  },
  nail_studio: {
    templateId: 'nail_studio',
    templateNumber: '04',
    salonType: 'Nail studio',
    titleLibrary: [
      { title: 'Gel-X Extensions Full Set', category: 'Gel Extensions' },
      { title: 'Russian Manicure with Cuticle Care', category: 'Russian Manicure' },
      { title: 'Chrome Glazed Nail Set', category: 'Chrome & Glaze' },
      { title: '3D Handpainted Art Set', category: 'Handpainted Art' },
      { title: 'Gel Removal & Nail Repair', category: 'Russian Manicure' },
      { title: 'Bridal Nail Set', category: 'Handpainted Art' },
    ],
    badges: ['Studio Favourite', 'Trending Set', 'Best Seller', 'New Design', 'Signature Art', 'Client Favourite'],
    featuredBadge: 'Client Favourite',
    packageBadge: 'Signature Art',
    offerTypes: ['percent', 'combo', 'package', 'membership', 'limited_time', 'first_visit'],
    tags: ['gel extensions', 'nail art', 'russian manicure', 'chrome nails', 'spa pedicure', 'bridal nails'],
    categoryNotes: {
      'Gel Extensions': 'It covers a full gel extension set shaped to the length you choose.',
      'Russian Manicure': 'It is detailed cuticle work followed by a dry manicure finish.',
      'Handpainted Art': 'It includes handpainted nail art within the time booked.',
      'Chrome & Glaze': 'It is a chrome or glazed finish over the base set you choose.',
      'Signature Packages': 'It combines more than one nail service into a single sitting.',
    },
    fallbackNote: 'It is part of the studio’s nail menu.',
    closings: [
      'Bring a reference photo if you have one — the artist confirms the design first.',
      'The nail artist confirms length and design with you before starting.',
      'Book a slot to check availability for this set.',
    ],
    termsLines: [
      'Nail appointments are confirmed against the studio’s booking calendar.',
      'Please arrive with clean, product-free nails unless the booking includes removal.',
    ],
  },
  unisex_salon: {
    templateId: 'unisex_salon',
    templateNumber: '05',
    salonType: 'Unisex salon and wellness lounge',
    titleLibrary: [
      { title: 'Designer Haircut & Blow Dry', category: 'Unisex Haircuts' },
      { title: 'Ammonia-Free Global Colour', category: 'Botanical Color' },
      { title: 'Glow Cleanup & De-Tan', category: 'Skin Cleanups' },
      { title: 'Spa Pedicure', category: 'Hands & Feet Care' },
      { title: 'Men’s Haircut & Beard Styling', category: 'Men’s Grooming' },
      { title: 'Head, Neck & Shoulder Relaxation', category: 'Wellness' },
    ],
    badges: ['Salon Favourite', 'Best Seller', 'New Menu', 'Trending', 'Aura Signature', 'Client Choice', 'Family Pick'],
    featuredBadge: 'Salon Favourite',
    packageBadge: 'Aura Signature',
    offerTypes: ['percent', 'flat', 'combo', 'membership', 'first_visit', 'package', 'seasonal'],
    tags: ['unisex haircut', 'hair colour', 'cleanup', 'pedicure', 'men’s grooming', 'relaxation'],
    categoryNotes: {
      'Unisex Haircuts': 'It is a cut and finish for any hair length on the salon menu.',
      'Skin Cleanups': 'It is a cleanup chosen for your skin type at the appointment.',
      'Botanical Color': 'It is a colour service with the shade confirmed by your stylist.',
      'Hands & Feet Care': 'It covers the hand or foot care listed in the booking.',
      'Men’s Grooming': 'It is a men’s cut or grooming service on the lounge menu.',
      'Hair Care': 'It is a hair care service selected for your hair type.',
      Wellness: 'It is a relaxation session on the lounge’s wellness menu.',
      'Hair Styling': 'It is a styling and finishing service for your chosen occasion.',
      Beauty: 'It is a quick beauty service from the salon menu.',
      'Signature Packages': 'It combines more than one salon service into a single visit.',
    },
    fallbackNote: 'It is part of the salon’s unisex menu.',
    closings: [
      'The stylist confirms the finish you want before starting the service.',
      'Tell the team your preferred finish so the service matches your routine.',
      'Book a slot to check availability across the team.',
    ],
    termsLines: [
      'Salon appointments are confirmed against the lounge’s booking calendar.',
      'Please mention any allergy or sensitivity before the service begins.',
    ],
  },
  mens_hair_studio: {
    templateId: 'mens_hair_studio',
    templateNumber: '06',
    salonType: 'Men’s haircut and hair colour studio',
    titleLibrary: [
      { title: 'Skin Fade Haircut', category: "Men's Haircuts" },
      { title: 'Textured Crop', category: "Men's Haircuts" },
      { title: 'Classic Scissor Cut', category: "Men's Haircuts" },
      { title: 'Men’s Global Colour', category: "Men's Hair Colour" },
      { title: 'Men’s Grey Coverage', category: "Men's Hair Colour" },
      { title: 'Men’s Hair Colour Consultation', category: "Men's Hair Colour" },
    ],
    badges: ['KeshKraft Favourite', 'Fade Specialist', 'Best Seller', 'New Style', 'Studio Pick', 'Colour Pick'],
    featuredBadge: 'KeshKraft Favourite',
    packageBadge: 'Studio Pick',
    offerTypes: ['flat', 'combo', 'membership', 'first_visit', 'limited_time', 'bogo'],
    tags: ['men’s haircut', 'skin fade', 'textured crop', 'hair colour', 'grey coverage', 'fade specialist'],
    categoryNotes: {
      "Men's Haircuts": 'It is a men’s cut finished at the grade and length you choose.',
      "Men's Hair Colour": 'It is a men’s colour service with the shade confirmed at the consultation.',
    },
    fallbackNote: 'It is part of the studio’s men-only menu.',
    closings: [
      'The barber confirms the grade and top length with you before the cut.',
      'Bring a reference photo if you have a specific fade or crop in mind.',
      'Book a chair to check the next available slot.',
    ],
    termsLines: [
      'Men-only studio: bookings are limited to the haircut and hair colour menu.',
      'Chair bookings are confirmed against the studio’s booking calendar.',
    ],
  },
  hair_spa: {
    templateId: 'hair_spa',
    templateNumber: '07',
    salonType: 'Salon and hair spa',
    titleLibrary: [
      { title: 'Hair Spa & Deep Conditioning', category: 'Hair Care' },
      { title: 'Herbal Hair Pack Ritual', category: 'Hair Care' },
      { title: 'Head Massage with Warm Oil', category: 'Hair Care' },
      { title: 'D-Tan Face Pack', category: 'Skin Care' },
      { title: 'Cleanup & Threading Combo', category: 'Packages' },
      { title: 'Bridal Hair & Makeup Trial', category: 'Bridal & Groom Makeup' },
    ],
    badges: ['Hair Spa Favourite', 'Best Seller', 'Herbal Care', 'New Ritual', 'Bridal Pick', 'Repeat Favourite'],
    featuredBadge: 'Hair Spa Favourite',
    packageBadge: 'Herbal Care',
    offerTypes: ['combo', 'package', 'seasonal', 'festive', 'membership', 'limited_time'],
    tags: ['hair spa', 'head massage', 'herbal hair pack', 'cleanup', 'threading', 'bridal makeup'],
    categoryNotes: {
      'Hair Care': 'It is a hair care service from the spa menu, chosen for your scalp and hair type.',
      'Threading & Waxing': 'It covers threading or waxing for the areas included in the booking.',
      'Skin Care': 'It is a skin care service selected for your skin type at the appointment.',
      'Men’s Grooming': 'It is a men’s grooming service from the spa menu.',
      'Bridal & Groom Makeup': 'It is a bridal or groom makeup booking for your function date.',
      Packages: 'It combines two or more spa services into a single appointment.',
    },
    fallbackNote: 'It is part of the salon and hair spa menu.',
    closings: [
      'The therapist checks your scalp and hair type before the service starts.',
      'Mention any oil or product preference when you arrive.',
      'Book a slot to check availability for this ritual.',
    ],
    termsLines: [
      'Spa appointments are confirmed against the salon’s booking calendar.',
      'Please mention any scalp sensitivity or product allergy before the service starts.',
    ],
  },
  skincare_clinic: {
    templateId: 'skincare_clinic',
    templateNumber: '08',
    salonType: 'Aesthetic skin clinic',
    titleLibrary: [
      { title: 'Initial Skin Consultation', category: 'Skin Consultation' },
      { title: 'Follow-up Review', category: 'Skin Consultation' },
      { title: 'Hydrating Medi-Facial', category: 'Medi-Facials' },
      { title: 'Hydra-Infusion Session', category: 'Hydra-Infusion' },
      { title: 'Pigmentation Consultation', category: 'Laser & Pigmentation' },
      { title: 'Scalp Care Session', category: 'Hair & Scalp' },
    ],
    badges: ['Clinic Favourite', 'Most Booked', 'New Offering', 'Follow-up Care', 'Consultation First', 'Package Option'],
    featuredBadge: 'Most Booked',
    packageBadge: 'Package Option',
    offerTypes: ['package', 'first_visit', 'membership', 'limited_time', 'combo'],
    tags: ['skin consultation', 'medi-facial', 'chemical peel', 'hydra-infusion', 'laser care', 'scalp care'],
    categoryNotes: {
      'Skin Consultation': 'It is a consultation where the clinician reviews your concern and explains the options.',
      'Skin Treatments': 'It is a clinic treatment session listed on the clinic’s menu.',
      'Chemical Peels': 'It is a supervised peel session from the clinic’s peel menu.',
      'Laser & Pigmentation': 'It is a pigmentation or laser care session listed on the clinic menu.',
      'Hair & Scalp': 'It is a scalp care session from the clinic’s hair and scalp menu.',
      'Medi-Facials': 'It is a clinic facial chosen for your skin during the appointment.',
      'Hydra-Infusion': 'It is a hydration infusion session from the clinic menu.',
      'Signature Packages': 'It groups clinic sessions into a planned course of visits.',
    },
    fallbackNote: 'It is part of the clinic’s treatment menu.',
    closings: [
      'The clinic confirms suitability for the session before it is carried out.',
      'Share your current skin routine with the clinician at the appointment.',
      'Book a consultation to check availability for this session.',
    ],
    termsLines: [
      'Clinic appointments are confirmed against the clinic’s booking calendar.',
      'Treatment sessions are carried out only after the clinic confirms suitability.',
    ],
  },
  makeup_studio: {
    templateId: 'makeup_studio',
    templateNumber: '09',
    salonType: 'Makeup studio and academy',
    titleLibrary: [
      { title: 'Bridal Makeup with Hair Styling', category: 'Bridal Studio' },
      { title: 'Engagement / Roka Makeup', category: 'Bridal Studio' },
      { title: 'Reception Makeup', category: 'Occasion Makeup' },
      { title: 'HD Party Makeup', category: 'Occasion Makeup' },
      { title: 'Airbrush Bridal Makeup', category: 'Complexion Artistry' },
      { title: 'Saree / Lehenga Draping', category: 'Hair & Finishing' },
    ],
    badges: ['Bridal Favourite', 'Signature Look', 'Editorial Pick', 'Best Seller', 'New Look', 'Trial Recommended'],
    featuredBadge: 'Bridal Favourite',
    packageBadge: 'Signature Look',
    offerTypes: ['package', 'seasonal', 'festive', 'combo', 'first_visit', 'limited_time'],
    tags: ['bridal makeup', 'occasion makeup', 'airbrush makeup', 'hair styling', 'draping', 'engagement look'],
    categoryNotes: {
      'Bridal Studio': 'It is a bridal makeup booking for your wedding function date.',
      'Occasion Makeup': 'It is an occasion makeup look for the function you are attending.',
      'Complexion Artistry': 'It is a makeup finish chosen with the artist for your skin.',
      'Editorial & Shoot': 'It is a shoot makeup booking planned around your brief.',
      'Hair & Finishing': 'It is a finishing service booked alongside your makeup.',
      Packages: 'It groups wedding functions into a planned booking.',
      'Signature Packages': 'It groups makeup and finishing services into one booking.',
    },
    fallbackNote: 'It is part of the studio’s makeup menu.',
    closings: [
      'The artist confirms the look and products with you before starting.',
      'Share any reference photos when you book so the artist can plan the look.',
      'Book a trial or slot to check availability for your date.',
    ],
    termsLines: [
      'Makeup bookings are confirmed against the studio’s booking calendar.',
      'Please arrive with clean skin unless the booking includes preparation.',
    ],
  },
  bridal_lounge: {
    templateId: 'bridal_lounge',
    templateNumber: '10',
    salonType: 'Bridal makeup and makeover lounge',
    titleLibrary: [
      { title: 'Royal Rajputana Bridal Makeup', category: 'Bridal Makeup' },
      { title: 'Sangeet & Cocktail Look', category: 'Bridal Makeup' },
      { title: 'Bridal Hair Styling', category: 'Bridal Hair' },
      { title: 'Poshak & Dupatta Draping', category: 'Draping & Styling' },
      { title: 'Heirloom Mehendi', category: 'Mehendi' },
      { title: 'Pre-Bridal Glow Ritual', category: 'Pre-Bridal Rituals' },
    ],
    badges: ['Bridal Signature', 'Maharani Heirloom', 'Most Booked', 'New Ritual', 'Trial Favourite', 'Family Pick'],
    featuredBadge: 'Most Booked',
    packageBadge: 'Maharani Heirloom',
    offerTypes: ['package', 'combo', 'seasonal', 'festive', 'first_visit', 'membership'],
    tags: ['bridal makeup', 'bridal hair', 'draping', 'mehendi', 'pre-bridal', 'sangeet look'],
    categoryNotes: {
      'Bridal Makeup': 'It is a bridal makeup booking for your wedding function date.',
      'Bridal Hair': 'It is bridal hair styling planned with your outfit and dupatta.',
      'Draping & Styling': 'It is outfit draping for the function you are attending.',
      Mehendi: 'It is a mehendi booking for the hands, feet or both as booked.',
      'Pre-Bridal Rituals': 'It is a pre-bridal preparation session before the wedding date.',
      'Heirloom Packages': 'It covers a set of wedding functions in one planned booking.',
      'Signature Packages': 'It groups lounge services into one planned booking.',
    },
    fallbackNote: 'It is part of the lounge’s bridal menu.',
    closings: [
      'The lounge confirms your function dates and look before the booking is finalised.',
      'Share your outfit and jewellery photos so the look can be planned.',
      'Book a trial to check availability for your wedding dates.',
    ],
    termsLines: [
      'Bridal bookings are confirmed against the lounge’s booking calendar.',
      'Wedding-date bookings are held only after the lounge confirms the date.',
    ],
  },
  hair_coloring: {
    templateId: 'hair_coloring',
    templateNumber: '11',
    salonType: 'Hair colour atelier',
    titleLibrary: [
      { title: 'Signature Balayage', category: 'Balayage & Highlights' },
      { title: 'Money Piece Highlights', category: 'Balayage & Highlights' },
      { title: 'Global Colour Refresh', category: 'Global Colour' },
      { title: 'Pastel Fashion Colour', category: 'Fashion Colours' },
      { title: 'Colour Correction Consultation', category: 'Colour Correction' },
      { title: 'Gloss & Shine Top-Up', category: 'Keratin & Care' },
    ],
    badges: ['Colour Studio Pick', 'Trending Shade', 'Best Seller', 'Signature Blend', 'New Palette', 'Client Favourite'],
    featuredBadge: 'Client Favourite',
    packageBadge: 'Signature Blend',
    offerTypes: ['percent', 'combo', 'package', 'seasonal', 'membership', 'limited_time'],
    tags: ['balayage', 'highlights', 'global colour', 'fashion colour', 'colour correction', 'gloss'],
    categoryNotes: {
      'Balayage & Highlights': 'It is a lightening and placement service planned with your colourist.',
      'Global Colour': 'It is a full-head colour with the shade confirmed at the consultation.',
      'Fashion Colours': 'It is a fashion or pastel shade chosen with your colourist.',
      'Colour Correction': 'It is a correction service that starts with a colour assessment.',
      'Keratin & Care': 'It is a smoothing or gloss service from the atelier menu.',
      Packages: 'It groups colour work and care into one planned appointment.',
    },
    fallbackNote: 'It is part of the atelier’s colour menu.',
    closings: [
      'Your colourist confirms the shade and aftercare with you before starting.',
      'Share any previous colour history at the consultation.',
      'Book a consultation to check availability for this colour service.',
    ],
    termsLines: [
      'Colour appointments are confirmed against the atelier’s booking calendar.',
      'Please share your recent colour history before the service starts.',
    ],
  },
  massage_wellness: {
    templateId: 'massage_wellness',
    templateNumber: '12',
    salonType: 'Massage and wellness sanctuary',
    titleLibrary: [
      { title: 'Abhyanga Oil Massage', category: 'Ayurvedic Massage' },
      { title: 'Deep Tissue Massage', category: 'Classic Massage' },
      { title: 'Shirodhara Ritual', category: 'Ayurvedic Massage' },
      { title: 'Head, Neck & Shoulder Champi', category: 'Head & Foot Care' },
      { title: 'Couple’s Massage', category: 'Couple & Specials' },
      { title: 'Foot Reflexology', category: 'Head & Foot Care' },
    ],
    badges: ['Guest Favourite', 'Signature Ritual', 'Palace Collection', 'Best Seller', 'New Therapy', 'Couple Pick'],
    featuredBadge: 'Guest Favourite',
    packageBadge: 'Palace Collection',
    offerTypes: ['package', 'combo', 'seasonal', 'membership', 'first_visit', 'flat'],
    tags: ['abhyanga', 'deep tissue', 'shirodhara', 'reflexology', 'couple massage', 'relaxation'],
    categoryNotes: {
      'Ayurvedic Massage': 'It is an Ayurvedic massage from the sanctuary’s therapy menu.',
      'Classic Massage': 'It is a classic massage with the pressure discussed with your therapist.',
      'Head & Foot Care': 'It is a head or foot therapy from the sanctuary menu.',
      'Couple & Specials': 'It is a shared session booked for two guests together.',
      'Palace Collection': 'It is a signature palace-inspired therapy from the sanctuary’s collection.',
      Packages: 'It groups therapies into a planned wellness visit.',
    },
    fallbackNote: 'It is part of the sanctuary’s therapy menu.',
    closings: [
      'Your therapist confirms the pressure and focus areas before the session.',
      'Tell the therapist about any area you would like worked on or avoided.',
      'Book a slot to check availability for this therapy.',
    ],
    termsLines: [
      'Therapy appointments are confirmed against the sanctuary’s booking calendar.',
      'Please tell your therapist about any area you would like avoided before the session.',
    ],
  },
  tattoo_studio: {
    templateId: 'tattoo_studio',
    templateNumber: '13',
    salonType: 'Tattoo and body art studio',
    titleLibrary: [
      { title: 'Custom Blackwork Piece', category: 'Blackwork / Dotwork' },
      { title: 'Fine-Line Tattoo', category: 'Minimalist / Fine Line' },
      { title: 'Realism / Portrait Tattoo', category: 'Realism / Portrait Tattoo' },
      { title: 'Cover-up Consultation', category: 'Cover-up Tattoo' },
      { title: 'Tattoo Touch-up & Rework', category: 'Tattoo Touch-up & Rework' },
      { title: 'Body Piercing', category: 'Body Piercing' },
    ],
    badges: ['Artist Pick', 'Studio Signature', 'Most Booked', 'New Flash', 'Fine-Line Favourite', 'Cover-up Special'],
    featuredBadge: 'Most Booked',
    packageBadge: 'Studio Signature',
    offerTypes: ['combo', 'package', 'limited_time', 'seasonal', 'first_visit', 'flat'],
    tags: ['custom tattoo', 'fine line', 'blackwork', 'cover-up', 'touch-up', 'body piercing'],
    categoryNotes: {
      'Realism / Portrait Tattoo': 'It is a portrait-style session planned from your reference with the artist.',
      'Black & Grey': 'It is a black and grey tattoo planned from your reference.',
      'Blackwork / Dotwork': 'It is a blackwork or dotwork piece planned with your artist.',
      'Traditional / Old School': 'It is a traditional-style piece planned from your reference.',
      'Minimalist / Fine Line': 'It is a fine-line piece planned at a size you choose.',
      'Cover-up Tattoo': 'It is a cover-up session that starts with an assessment of the existing tattoo.',
      'Tattoo Touch-up & Rework': 'It is a touch-up session on an existing piece by the studio.',
      'Custom Sleeve / Half Sleeve / Full Sleeve': 'It is a sleeve session planned across sittings with your artist.',
      'Body Piercing': 'It is a piercing service from the studio menu.',
      'Custom Design: Sketch Consultation': 'It is a design consultation before the tattoo is booked.',
      'Aftercare Products Shop': 'It is an aftercare product from the studio counter.',
      'Signature Packages': 'It groups studio sessions into one planned booking.',
    },
    fallbackNote: 'It is part of the studio’s body art menu.',
    closings: [
      'Your artist confirms the size, placement and reference before the session starts.',
      'Bring your reference image so the artist can plan the piece.',
      'Book a consultation to check availability for this piece.',
    ],
    termsLines: [
      'Studio sessions are confirmed against the studio’s booking calendar.',
      'The artist confirms design, size and placement before the session begins.',
    ],
  },
  lash_brow: {
    templateId: 'lash_brow',
    templateNumber: '14',
    salonType: 'Lash and brow bar',
    titleLibrary: [
      { title: 'Classic 1:1 Full Set', category: 'Classic Lash Extensions' },
      { title: 'Russian Volume Full Set', category: 'Volume Lash Extensions' },
      { title: 'Hybrid Wispy Set', category: 'Hybrid Lash Extensions' },
      { title: 'Lash Lift & Tint', category: 'Lash Lift & Tint' },
      { title: 'Brow Lamination', category: 'Brow Lamination' },
      { title: 'Brow Thread & Shape', category: 'Brow Shaping & Threading' },
      { title: 'Lash Refill (Within 3 Weeks)', category: 'Lash Refill & Removal' },
    ],
    badges: ['Lash Favourite', 'Flutter Club', 'Most Booked', 'New Set', 'Bridal Pick', 'Signature Set'],
    featuredBadge: 'Most Booked',
    packageBadge: 'Flutter Club',
    offerTypes: ['percent', 'combo', 'package', 'membership', 'first_visit', 'limited_time', 'festive'],
    tags: ['lash extensions', 'lash lift', 'brow lamination', 'brow threading', 'lash refill', 'bridal lashes'],
    categoryNotes: {
      'Classic Lash Extensions': 'It is a classic lash set applied lash by lash.',
      'Volume Lash Extensions': 'It is a volume lash set at the mapping you choose.',
      'Hybrid Lash Extensions': 'It is a hybrid set mixing classic and volume lashes.',
      'Mega Volume / Wispy / Anime / Manga': 'It is a statement lash set styled at the mapping you choose.',
      'Lash Lift & Tint': 'It is a lash lift with the tint option you book.',
      'Lash Refill & Removal': 'It is refill or removal work on an existing lash set.',
      'Brow Shaping & Threading': 'It is brow shaping for the finish you ask for.',
      'Brow Waxing & Tinting': 'It is brow wax or tint on the brow area.',
      'Brow Lamination': 'It is brow lamination planned around your brow growth.',
      'Henna Brows': 'It is a henna brow stain from the bar’s menu.',
      'Microblading & Powder Brows (Ombre)': 'It is a brow procedure that begins with a mapping and patch test.',
      'Eyeliner / Lip Blush Permanent Makeup': 'It is a permanent makeup booking that begins with a consultation and patch test.',
      'Under-eye Treatment & Eye Care Facials': 'It is an eye care treatment from the bar’s menu.',
      'Bridal Eye Rituals': 'It is a bridal eye booking planned around your function dates.',
      'Combo Packages & Memberships': 'It groups lash and brow services into one booking.',
    },
    fallbackNote: 'It is part of the bar’s lash and brow menu.',
    closings: [
      'Your technician confirms the mapping and curl with you before starting.',
      'Come with clean lashes and brows unless the booking includes removal.',
      'Book a slot to check availability for this set.',
    ],
    termsLines: [
      'Lash and brow appointments are confirmed against the bar’s booking calendar.',
      'Please arrive with clean lashes and brows unless the service includes removal.',
    ],
  },
  ayurvedic_spa: {
    templateId: 'ayurvedic_spa',
    templateNumber: '15',
    salonType: 'Ayurvedic wellness spa',
    titleLibrary: [
      { title: 'Abhyanga Full-Body Massage', category: 'Ayurvedic Massage & Body Therapies' },
      { title: 'Shirodhara Warm Oil Stream', category: 'Ayurvedic Massage & Body Therapies' },
      { title: 'Shiro Abhyanga Head Ritual', category: 'Head, Mind & Relaxation' },
      { title: 'Herbal Potli Massage (Kizhi)', category: 'Ayurvedic Massage & Body Therapies' },
      { title: 'Dosha Discovery Consultation', category: 'Consultation & Herbal Care' },
      { title: 'Couple Ayurvedic Spa Ritual', category: 'Luxury Spa Experiences' },
    ],
    badges: ['Therapist Pick', 'Signature Therapy', 'Guest Favourite', 'New Ritual', 'Couple Pick', 'Package Pick'],
    featuredBadge: 'Guest Favourite',
    packageBadge: 'Signature Therapy',
    offerTypes: ['package', 'combo', 'seasonal', 'festive', 'membership', 'first_visit', 'limited_time'],
    tags: ['abhyanga', 'shirodhara', 'herbal potli', 'dosha consultation', 'couple spa', 'ayurvedic therapy'],
    categoryNotes: {
      'Ayurvedic Massage & Body Therapies': 'It is a traditional body therapy from the spa’s Ayurvedic menu.',
      'Consultation & Herbal Care': 'It is a consultation or herbal care session with the spa’s therapist.',
      'Head, Mind & Relaxation': 'It is a relaxation therapy focused on the head and mind.',
      'Luxury Spa Experiences': 'It is a longer spa experience from the wellness menu.',
      'Signature Packages': 'It groups therapies into a planned wellness visit.',
    },
    fallbackNote: 'It is part of the spa’s Ayurvedic menu.',
    closings: [
      'Your therapist confirms the oils and pressure with you before the session.',
      'Mention any oil preference or sensitivity at the consultation.',
      'Book a slot to check availability for this therapy.',
    ],
    termsLines: [
      'Spa appointments are confirmed against the spa’s booking calendar.',
      'Therapies are carried out after the therapist confirms your suitability.',
    ],
  },
  aurelia_beauty_parlour: {
    templateId: 'aurelia_beauty_parlour',
    templateNumber: '16',
    salonType: 'Luxury beauty and wellness studio',
    titleLibrary: [
      { title: 'Signature Cut & Finish', category: 'Hair' },
      { title: 'Aurelia Blowout', category: 'Hair' },
      { title: 'Balayage & Gloss', category: 'Hair Colour' },
      { title: 'Radiance Facial', category: 'Skin' },
      { title: 'Hydra-Infusion Facial', category: 'Skin' },
      { title: 'Signature Gel Manicure', category: 'Nails' },
      { title: 'Botanical Head Spa', category: 'Spa' },
      { title: 'Bridal Trial & Styling', category: 'Bridal' },
    ],
    badges: ['Aurelia Signature', 'Studio Favourite', 'Best Seller', 'New Ritual', 'Bridal Pick', 'Guest Favourite'],
    featuredBadge: 'Studio Favourite',
    packageBadge: 'Aurelia Signature',
    offerTypes: ['percent', 'flat', 'combo', 'package', 'seasonal', 'membership'],
    tags: ['signature cut', 'blowout', 'balayage', 'radiance facial', 'gel manicure', 'head spa'],
    categoryNotes: {
      Hair: 'It is a hair service from the studio’s signature menu.',
      'Hair Colour': 'It is a colour service with the shade confirmed by your colourist.',
      Skin: 'It is a skin ritual selected for your skin at the appointment.',
      Nails: 'It is a nail service from the studio’s nail menu.',
      Spa: 'It is a spa ritual from the studio’s wellness menu.',
      Bridal: 'It is a bridal booking planned around your function date.',
      'Signature Packages': 'It groups studio rituals into one planned visit.',
    },
    fallbackNote: 'It is part of the studio’s beauty and wellness menu.',
    closings: [
      'Your artist confirms the finish with you before the service begins.',
      'Share any sensitivity or preference with your artist at the appointment.',
      'Book a slot to check availability in the studio.',
    ],
    termsLines: [
      'Studio appointments are confirmed against the studio’s booking calendar.',
      'Please mention any skin or scalp sensitivity before the service begins.',
    ],
  },
};

/** All 16 configurations, in NEXORA template order. */
export function allTemplateServiceSetups(): TemplateServiceSetup[] {
  return TEMPLATE_ORDER.map((id) => TEMPLATE_SETUPS[id]);
}

/** Setup for the selected template; unknown ids fall back to the first template. */
export function templateServiceSetup(templateId?: string): TemplateServiceSetup {
  return TEMPLATE_SETUPS[(templateId || '') as BusinessTypeId] || TEMPLATE_SETUPS.hair_salon;
}

/** True when the id is one of the 16 registered templates. */
export function isKnownTemplate(templateId?: string): boolean {
  return !!templateId && TEMPLATE_ORDER.includes(templateId as BusinessTypeId);
}

/** NEXORA display name of the selected template, used in owner helper text. */
export function templateDisplayName(templateId?: string): string {
  const setup = templateServiceSetup(templateId);
  const template = CATEGORY_TEMPLATES[setup.templateId];
  return `Template ${setup.templateNumber} · ${template?.title || 'Salon'}`;
}

/**
 * Title suggestions for the selected template only.
 * The template's own live menu comes first, then the curated library.
 * Service names are never renamed — the owner picks or types.
 */
export function templateTitleSuggestions(templateId?: string): TemplateTitleSuggestion[] {
  const setup = templateServiceSetup(templateId);
  const template = CATEGORY_TEMPLATES[setup.templateId];
  const seen = new Set<string>();
  const key = (value: string) => value.trim().toLowerCase();
  const suggestions: TemplateTitleSuggestion[] = [];
  for (const service of template?.services || []) {
    if (!service.name || seen.has(key(service.name))) continue;
    seen.add(key(service.name));
    suggestions.push({ title: service.name, category: service.category, source: 'menu' });
  }
  for (const item of setup.titleLibrary) {
    if (seen.has(key(item.title))) continue;
    seen.add(key(item.title));
    suggestions.push({ title: item.title, category: item.category, source: 'library' });
  }
  return suggestions;
}

/** Badge library for the selected template. */
export function templateBadgeOptions(templateId?: string): string[] {
  return [...templateServiceSetup(templateId).badges];
}

/** Offer types allowed for the selected template ("none" is always available). */
export function templateOfferTypeOptions(templateId?: string): ServiceOfferType[] {
  return ['none', ...templateServiceSetup(templateId).offerTypes];
}

/** Suggested tags for the selected template. */
export function templateTagSuggestions(templateId?: string): string[] {
  return [...templateServiceSetup(templateId).tags];
}

/* -------------------------------------------------------------------------- */
/* Deterministic suggestion engine                                            */
/* -------------------------------------------------------------------------- */

const isPackageService = (service: Pick<SalonService, 'name' | 'category'>) =>
  /package|combo|bundle/i.test(`${service.category || ''} ${service.name || ''}`);

const hash = (value: string) => {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) % 100000;
  return result;
};

const money = (value: number) => `₹${Number(value).toLocaleString('en-IN')}`;

export interface DescriptionInput {
  templateId?: string;
  name: string;
  category: string;
  durationMinutes?: number;
  price?: number | null;
}

/**
 * Professional, template-specific description built only from data the service
 * already has (title, category, duration, price) plus neutral positioning copy.
 * No product, ingredient, treatment step or guaranteed result is ever invented.
 */
export function generateServiceDescription(input: DescriptionInput): string {
  const setup = templateServiceSetup(input.templateId);
  const template = CATEGORY_TEMPLATES[setup.templateId];
  const brand = template?.title || 'the salon';
  const name = (input.name || '').trim();
  if (!name) return '';
  const category = (input.category || '').trim() || 'salon';
  const duration = Number(input.durationMinutes);
  const categoryNote = setup.categoryNotes[category] || setup.fallbackNote;
  const opening = Number.isFinite(duration) && duration > 0
    ? `${name} is a ${duration}-minute ${category} service at ${brand}.`
    : `${name} is a ${category} service at ${brand}.`;
  const price = typeof input.price === 'number' && Number.isFinite(input.price) ? input.price : null;
  const priceLine = price === null
    ? 'The salon confirms the fee for this service on enquiry.'
    : `The menu price is ${money(price)}.`;
  const closing = setup.closings[hash(`${setup.templateId}|${name}|${category}`) % setup.closings.length];
  return `${opening} ${categoryNote} ${priceLine} ${closing}`;
}

/** Salon policies that the terms writer is allowed to reuse. */
export interface SalonTermsPolicies {
  cancellation?: string;
  lateArrival?: string;
  refund?: string;
}

export interface TermsInput {
  templateId?: string;
  name: string;
  category: string;
  offerType?: ServiceOfferType;
  offerDetails?: string;
  price?: number | null;
  policies?: SalonTermsPolicies;
  /** Minutes/hours notice the salon already stores for cancellations. */
  cancellationWindow?: number;
  requireDeposit?: boolean;
  depositPercentage?: number;
}

export interface TermsResult {
  text: string;
  /**
   * Terms that had no salon policy behind them. The editor highlights these so
   * the owner confirms the wording before it reaches the website.
   */
  needsConfirmation: Array<'cancellation' | 'lateArrival' | 'refund' | 'offer' | 'package'>;
}

const firstSentence = (value: string) => {
  const clean = (value || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const match = clean.match(/^[^.!?]{8,320}[.!?]/);
  return (match ? match[0] : clean.slice(0, 300)).trim();
};

/** Offer lines are only produced when the service actually has an offer. */
function offerTermsLines(offerType: ServiceOfferType, details: string): string[] {
  if (offerType === 'none') return [];
  const lines: string[] = [];
  const detail = (details || '').trim();
  lines.push(`This offer applies to this service only${detail ? ` (${detail})` : ''}.`);
  switch (offerType) {
    case 'percent':
    case 'flat':
      lines.push('The discount is applied at billing and cannot be combined with another offer on the same service.');
      break;
    case 'combo':
      lines.push('The combo price covers the services listed in the offer and is booked as one appointment.');
      break;
    case 'bogo':
      lines.push('The second service in this offer is booked in the same visit or in the slot the salon confirms.');
      break;
    case 'seasonal':
    case 'festive':
      lines.push('The offer is available for the dates the salon announces and is not carried forward after the season ends.');
      break;
    case 'first_visit':
      lines.push('The offer is available for a customer’s first visit to the salon and is confirmed at booking.');
      break;
    case 'membership':
      lines.push('Membership pricing is available while the membership is active and is confirmed by the salon at booking.');
      break;
    case 'package':
      lines.push('Package pricing covers the sessions included in the package and cannot be exchanged for other services.');
      break;
    case 'limited_time':
      lines.push('The offer is available only within the period the salon announces.');
      break;
    default:
      break;
  }
  return lines;
}

/**
 * Terms & Conditions for one service. Existing salon policies are reused as-is
 * (first sentence only); anything the salon has not saved is written as clearly
 * flagged suggested wording instead of an invented rule.
 */
export function generateServiceTerms(input: TermsInput): TermsResult {
  const setup = templateServiceSetup(input.templateId);
  const policies = input.policies || {};
  const needsConfirmation: TermsResult['needsConfirmation'] = [];
  const lines: string[] = [];

  for (const line of setup.termsLines) lines.push(line);

  const window = Number(input.cancellationWindow);
  const hours = Number.isFinite(window) && window >= 0 ? Math.floor(window) : 24;
  const cancellation = firstSentence(policies.cancellation || '');
  if (cancellation) {
    lines.push(`Cancellation and rescheduling: ${cancellation}`);
  } else {
    lines.push(`Cancellation and rescheduling: please inform the salon at least ${hours} hours before your appointment.`);
    needsConfirmation.push('cancellation');
  }

  const lateArrival = firstSentence(policies.lateArrival || '');
  if (lateArrival) {
    lines.push(`Late arrival: ${lateArrival}`);
  } else {
    lines.push('Late arrival: tell the salon as early as possible if you are running late; the slot may need to be shortened to protect the next appointment.');
    needsConfirmation.push('lateArrival');
  }

  const refund = firstSentence(policies.refund || '');
  if (refund) {
    lines.push(`Advance payment and refunds: ${refund}`);
  } else if (input.requireDeposit && Number(input.depositPercentage) > 0) {
    lines.push(`Advance payment and refunds: a ${Number(input.depositPercentage)}% advance is collected to confirm the booking and the balance is payable at the salon.`);
    needsConfirmation.push('refund');
  }

  if (typeof input.price !== 'number' || !Number.isFinite(input.price)) {
    lines.push('The fee for this service is confirmed by the salon before the appointment.');
  }

  if (isPackageService({ name: input.name, category: input.category })) {
    lines.push('Package and combo bookings are used for the services listed in the package and are booked as one appointment.');
    needsConfirmation.push('package');
  }

  const offerLines = offerTermsLines(input.offerType || 'none', input.offerDetails || '');
  if (offerLines.length) {
    lines.push(...offerLines);
    needsConfirmation.push('offer');
  }

  return { text: lines.join('\n'), needsConfirmation };
}

/* -------------------------------------------------------------------------- */
/* Reading, writing and sanitising saved values                               */
/* -------------------------------------------------------------------------- */

const OFFER_TYPES = Object.keys(SERVICE_OFFER_TYPE_LABELS) as ServiceOfferType[];
const cleanText = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const cleanList = (value: unknown, maxItems: number, maxLength = 60) =>
  Array.isArray(value)
    ? Array.from(new Set(value.map((item) => cleanText(item, maxLength)).filter(Boolean))).slice(0, maxItems)
    : [];

/**
 * Tolerant reader for saved merchandising. Anything malformed is dropped so an
 * older or hand-edited record can never break the editor or the website.
 */
export function sanitizeServiceMerchandising(value: unknown): ServiceMerchandising | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, any>;
  const templateId = isKnownTemplate(record.templateId) ? (record.templateId as BusinessTypeId) : undefined;
  if (!templateId) return undefined;
  const offerType = OFFER_TYPES.includes(record.offerType) ? (record.offerType as ServiceOfferType) : 'none';
  const suggestions = record.suggestions && typeof record.suggestions === 'object' ? record.suggestions : {};
  const editedRecord = record.edited && typeof record.edited === 'object' ? record.edited : {};
  const edited: ServiceMerchandising['edited'] = {};
  for (const key of ['description', 'terms', 'badges', 'offerType', 'offerDetails'] as const) {
    if (editedRecord[key] === true) edited[key] = true;
  }
  return {
    templateId,
    badges: cleanList(record.badges, 6, 40),
    offerType,
    offerDetails: cleanText(record.offerDetails, 300),
    tags: cleanList(record.tags, 12, 40),
    terms: cleanText(record.terms, 4000),
    suggestions: {
      badges: cleanList(suggestions.badges, 6, 40),
      offerType: OFFER_TYPES.includes(suggestions.offerType) ? suggestions.offerType : 'none',
      offerDetails: cleanText(suggestions.offerDetails, 300),
      description: cleanText(suggestions.description, 2000),
      terms: cleanText(suggestions.terms, 4000),
      generatedAt: cleanText(suggestions.generatedAt, 40),
    },
    edited,
  };
}

/**
 * Badges that the existing service data already supports. Nothing is guessed:
 * a featured service earns the template's featured badge, a package earns the
 * package badge, and everything else gets no automatic badge at all.
 */
export function suggestServiceBadges(
  service: Pick<SalonService, 'name' | 'category' | 'popular'>,
  templateId?: string,
): string[] {
  const setup = templateServiceSetup(templateId);
  const badges: string[] = [];
  if (service.popular) badges.push(setup.featuredBadge);
  if (isPackageService(service)) badges.push(setup.packageBadge);
  return Array.from(new Set(badges));
}

/** Offer type suggested from the service itself — `none` unless data says otherwise. */
export function suggestServiceOfferType(
  service: Pick<SalonService, 'name' | 'category'>,
  templateId?: string,
): ServiceOfferType {
  const setup = templateServiceSetup(templateId);
  if (isPackageService(service) && setup.offerTypes.includes('package')) return 'package';
  return 'none';
}

export interface SuggestionContext {
  templateId?: string;
  service: Pick<SalonService, 'name' | 'category' | 'description' | 'price' | 'durationMinutes' | 'popular'>;
  previous?: ServiceMerchandising;
  policies?: SalonTermsPolicies;
  cancellationWindow?: number;
  requireDeposit?: boolean;
  depositPercentage?: number;
}

export interface ServiceSuggestionSet {
  /** Timestamp of this automatic preparation (kept with the saved suggestions). */
  generatedAt: string;
  description: string;
  badges: string[];
  offerType: ServiceOfferType;
  offerDetails: string;
  terms: string;
  termsNeedsConfirmation: TermsResult['needsConfirmation'];
  tags: string[];
}

/** Everything the selected template can prepare for one service, in one call. */
export function prepareServiceSuggestions(context: SuggestionContext): ServiceSuggestionSet {
  const templateId = context.templateId;
  const setup = templateServiceSetup(templateId);
  const previous = context.previous;
  const badges = suggestServiceBadges(context.service, templateId);
  const offerType = previous?.edited?.offerType
    ? previous.offerType
    : suggestServiceOfferType(context.service, templateId);
  const offerDetails = previous?.edited?.offerDetails ? previous.offerDetails : '';
  const description = generateServiceDescription({
    templateId,
    name: context.service.name,
    category: context.service.category,
    durationMinutes: context.service.durationMinutes,
    price: context.service.price,
  });
  const terms = generateServiceTerms({
    templateId,
    name: context.service.name,
    category: context.service.category,
    offerType,
    offerDetails,
    price: context.service.price,
    policies: context.policies,
    cancellationWindow: context.cancellationWindow,
    requireDeposit: context.requireDeposit,
    depositPercentage: context.depositPercentage,
  });
  return {
    generatedAt: new Date().toISOString(),
    description,
    badges,
    offerType,
    offerDetails,
    terms: terms.text,
    termsNeedsConfirmation: terms.needsConfirmation,
    tags: setup.tags.slice(0, 6),
  };
}

/**
 * Owner-confirmed merchandising for a saved service, or `undefined` when the
 * owner has not saved anything yet (the website then renders the service exactly
 * as before this feature existed).
 */
export function confirmedServiceMerchandising(service: Pick<SalonService, 'merchandising'>): {
  badges: string[];
  offerType: ServiceOfferType;
  offerDetails: string;
  terms: string;
  tags: string[];
} {
  const saved = sanitizeServiceMerchandising(service.merchandising);
  return {
    badges: saved?.badges || [],
    offerType: saved?.offerType || 'none',
    offerDetails: saved?.offerDetails || '',
    terms: saved?.terms || '',
    tags: saved?.tags || [],
  };
}

/** Public badge chips for a service — confirmed values only. */
export function serviceBadgesForDisplay(service: Pick<SalonService, 'merchandising'>): string[] {
  return confirmedServiceMerchandising(service).badges.slice(0, 4);
}

/** Saved offer type for a service (confirmed values only). */
export function serviceOfferTypeForDisplay(service: Pick<SalonService, 'merchandising'>): ServiceOfferType {
  return confirmedServiceMerchandising(service).offerType;
}

/** Public offer line for a service; empty when the service has no offer. */
export function serviceOfferForDisplay(service: Pick<SalonService, 'merchandising'>): { label: string; details: string } | undefined {
  const { offerType, offerDetails } = confirmedServiceMerchandising(service);
  if (offerType === 'none') return undefined;
  const details = offerDetails.trim();
  return {
    label: details || SERVICE_OFFER_TYPE_LABELS[offerType],
    details,
  };
}

/** Public terms for a service; empty string when nothing is saved. */
export function serviceTermsForDisplay(service: Pick<SalonService, 'merchandising'>): string {
  return confirmedServiceMerchandising(service).terms;
}

/** True when stored copy was prepared for a different template than the selected one. */
export function merchandisingNeedsTemplateRefresh(
  service: Pick<SalonService, 'merchandising'>,
  templateId?: string,
): boolean {
  const saved = sanitizeServiceMerchandising(service.merchandising);
  return !!saved && !!templateId && saved.templateId !== templateId;
}

/**
 * Owner action: attach the selected template's prepared suggestions to services
 * that have none yet. Names, categories, prices, durations, staff and booking
 * data are untouched, and nothing becomes public until the owner saves.
 */
export function applyTemplateSetupToServices(
  services: SalonService[],
  templateId: BusinessTypeId,
  options: {
    policies?: SalonTermsPolicies;
    cancellationWindow?: number;
    requireDeposit?: boolean;
    depositPercentage?: number;
    now?: string;
  } = {},
): { services: SalonService[]; updated: number } {
  let updated = 0;
  const next = services.map((service) => {
    const existing = sanitizeServiceMerchandising(service.merchandising);
    if (existing && existing.templateId === templateId) return service;
    const suggestions = prepareServiceSuggestions({
      templateId,
      service,
      previous: existing,
      policies: options.policies,
      cancellationWindow: options.cancellationWindow,
      requireDeposit: options.requireDeposit,
      depositPercentage: options.depositPercentage,
    });
    updated += 1;
    const base: ServiceMerchandising = {
      templateId,
      badges: existing?.badges || suggestions.badges,
      offerType: existing?.offerType || suggestions.offerType,
      offerDetails: existing?.offerDetails || suggestions.offerDetails,
      tags: existing?.tags?.length ? existing.tags : suggestions.tags,
      terms: existing?.terms || suggestions.terms,
      suggestions: {
        badges: suggestions.badges,
        offerType: suggestions.offerType,
        offerDetails: suggestions.offerDetails,
        description: suggestions.description,
        terms: suggestions.terms,
        generatedAt: options.now || new Date().toISOString(),
      },
      edited: existing?.edited || {},
    };
    return { ...service, merchandising: base };
  });
  return { services: next, updated };
}
