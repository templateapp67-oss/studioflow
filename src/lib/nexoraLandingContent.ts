import { FEATURE_CATEGORIES, PRICING_PLANS, type FeatureItem } from './nexoraPricing';
import { NEXORA_TEMPLATE_META } from './nexoraTemplateCatalogue';

/**
 * Business content for the NEXORA SALONOS landing page.
 *
 * Content lives here so the landing components stay presentational. Every
 * feature row points at an entry of the approved product catalogue in
 * `nexoraPricing.ts` — nothing on this page is invented at the component
 * level, and anything that has not been commercially confirmed is labelled as
 * pending rather than presented as an entitlement.
 */

/** Real, configured destinations used by the landing page. */
export const NEXORA_LANDING_ROUTE = '/salon-os';
export const NEXORA_LOGIN_PATH = '/login';
export const NEXORA_SIGNUP_PATH = '/login?auth=signup';
/** The live Marketing campaigns module of the owner workspace (Promo Studio). */
export const NEXORA_PROMO_STUDIO_PATH = '/?app=1&module=22';
/** Public privacy notice for the demo-request form. */
export const NEXORA_PRIVACY_NOTICE_PATH = '/privacy';

export interface LandingNavLink {
  label: string;
  href: string;
  /** Anchors are resolved on the landing page itself. */
  external?: boolean;
}

export const NEXORA_LANDING_NAV: LandingNavLink[] = [
  { label: 'Home', href: '/', external: true },
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Resources', href: '#faq' },
];

export const NEXORA_FOOTER_NAV: { title: string; links: LandingNavLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Salon solutions', href: '#solutions' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Compare plans', href: '#comparison' },
    ],
  },
  {
    title: 'Salon marketing',
    links: [
      { label: 'Marketing campaigns', href: NEXORA_PROMO_STUDIO_PATH, external: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Product preview', href: '#product-preview' },
      { label: 'Business benefits', href: '#benefits' },
      { label: 'FAQs', href: '#faq' },
      { label: 'Salon templates', href: '/', external: true },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Login', href: NEXORA_LOGIN_PATH, external: true },
      { label: 'Get started', href: NEXORA_SIGNUP_PATH, external: true },
      { label: 'Pricing detail', href: '/pricing', external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy notice', href: NEXORA_PRIVACY_NOTICE_PATH, external: true },
    ],
  },
];

/** Factual, repository-backed overview numbers; deliberately no ROI or testimonial claims. */
export const NEXORA_OVERVIEW_FACTS = [
  { value: String(NEXORA_TEMPLATE_META.length), label: 'salon website templates' },
  { value: String(FEATURE_CATEGORIES.length), label: 'feature comparison areas' },
  { value: '4', label: 'annual salon plans' },
] as const;

export const NEXORA_LANDING_COPY = {
  heroEyebrow: 'SALON MANAGEMENT SOFTWARE',
  heroTitle: 'Run Your Salon. Grow Your Business. All From One Place.',
  heroDescription:
    'Nexora SalonOS brings appointments, customers, staff, billing, marketing and business insights together in one easy-to-manage platform.',
  heroPrimary: 'Get Started',
  heroSecondary: 'Explore Features',
  heroNote: 'Illustrative interface preview — no live salon data is shown.',
  businessTypesTitle: 'Built for the Beauty and Wellness Industry',
  businessTypesDescription:
    'Whether you run a single chair or several locations, Nexora SalonOS is shaped around how beauty businesses actually work.',
  problemTitle: 'Stop Managing Your Salon With Disconnected Tools.',
  problemDescription:
    'Most salons run on notebooks, spreadsheets and personal apps. Nexora SalonOS brings the everyday parts of the job into one connected workspace.',
  featuresTitle: 'Everything Your Salon Needs to Operate Better.',
  featuresDescription:
    'Grouped by the work you do every day, using the tools that are already part of the Nexora SalonOS workspace.',
  howTitle: 'Get Started in Three Simple Steps.',
  howDescription: 'No parallel system to maintain. Start with the essentials and grow from there.',
  pricingTitle: 'Choose the Right Plan for Your Salon.',
  pricingDescription: 'Start with the essentials and upgrade as your business grows.',
  promotionTitle: 'Create Your Salon Promotions. Share Them Everywhere.',
  promotionDescription:
    'Make professional promotional creatives for your salon without depending on a designer for every small offer.',
  operationsTitle: 'Your Salon Deserves More Than Manual Management.',
  operationsSubtitle: 'One Connected Place for Your Salon Operations.',
  benefitsTitle: 'More Control Over Your Daily Salon Operations.',
  previewTitle: 'A Clear View of Your Salon Business.',
  previewDescription:
    'An illustrative look at the workspace areas a salon team uses every day.',
  testimonialsTitle: 'Built Around Real Salon Business Needs.',
  faqTitle: 'Frequently Asked Questions',
  finalTitle: 'Ready to Manage Your Salon More Simply?',
  finalDescription:
    'Bring your appointments, customers, team and business operations into one connected platform.',
} as const;

export const NEXORA_PRICING_INTRO = 'A tailored software solution for every salon, spa, tattoo studio, nail studio, pet grooming center, and skin clinic, regardless of business size.';

export interface BusinessType {
  id: string;
  title: string;
  description: string;
  icon: string;
}

/** The beauty and wellness business categories Nexora SalonOS is designed for. */
export const NEXORA_BUSINESS_TYPES: BusinessType[] = [
  { id: 'salon', title: 'Salons & beauty parlours', description: 'Appointments, services, billing and customer records in one workspace.', icon: 'scissors' },
  { id: 'barber', title: 'Barbershops', description: 'Chair-level scheduling, service menus and everyday POS billing.', icon: 'razor' },
  { id: 'spa', title: 'Spas & wellness centres', description: 'Package services, staff schedules and customer history.', icon: 'flower' },
  { id: 'nail', title: 'Nail studios', description: 'Frequent bookings, service add-ons and product stock.', icon: 'hand' },
  { id: 'tattoo', title: 'Tattoo studios', description: 'Consultation-to-session appointments and deposit billing.', icon: 'pen' },
  { id: 'clinic', title: 'Skin & beauty clinics', description: 'Service menus, practitioner allocation and reporting.', icon: 'heart' },
  { id: 'multi', title: 'Multi-location businesses', description: 'Branches, staff access and consolidated reporting.', icon: 'store' },
];

export interface ComparisonPoint {
  id: string;
  title: string;
  description: string;
}

/** "Before" column — the manual reality the product replaces. */
export const NEXORA_BEFORE_POINTS: ComparisonPoint[] = [
  { id: 'bookings', title: 'Appointments tracked manually', description: 'Bookings kept in notebooks, personal calendars or scattered chats.' },
  { id: 'customers', title: 'Customer information scattered', description: 'Contact details, preferences and visit history spread across files and phones.' },
  { id: 'staff', title: 'Staff schedules are hard to coordinate', description: 'Ch availability, working hours and leave are worked out by hand.' },
  { id: 'billing', title: 'Billing and expenses tracked separately', description: 'Daily sales, product costs and expenses never meet in one view.' },
  { id: 'marketing', title: 'Marketing handled manually', description: 'Every offer, reminder and promotion is prepared from scratch.' },
  { id: 'visibility', title: 'No clear business performance overview', description: 'Owners cannot see how the salon is actually performing.' },
];

/** "With Nexora" column — only capabilities that exist in the product today. */
export const NEXORA_WITH_POINTS: ComparisonPoint[] = [
  { id: 'bookings', title: 'Centralised appointment management', description: 'Owner-side booking tools alongside a published salon website.' },
  { id: 'customers', title: 'Connected customer records', description: 'Profiles, booking history and customer notes in one place.' },
  { id: 'staff', title: 'Better staff coordination', description: 'Staff profiles, scheduling and access controls for your team.' },
  { id: 'billing', title: 'Billing and business management tools', description: 'Owner-side POS, service and product billing with payment records.' },
  { id: 'marketing', title: 'Organised marketing workflows', description: 'Campaign creatives, customer communication and recall tools.' },
  { id: 'visibility', title: 'Useful business reports and insights', description: 'Appointment, revenue, staff and inventory reporting where supported.' },
];

export interface LandingFeatureCategory {
  id: string;
  title: string;
  benefit: string;
  icon: string;
  /** Ids of entries in the approved catalogue (nexoraPricing.FEATURE_CATEGORIES). */
  featureIds: string[];
}

/**
 * Landing feature groups. Each row points at the approved product catalogue so
 * the marketing page can never advertise a capability the product does not
 * have.
 */
export const NEXORA_LANDING_FEATURE_CATEGORIES: LandingFeatureCategory[] = [
  {
    id: 'appointments',
    title: 'Appointment management',
    benefit: 'See the day ahead and keep every slot accounted for.',
    icon: 'calendar',
    featureIds: ['online-booking', 'availability', 'booking-management', 'reminders'],
  },
  {
    id: 'customers',
    title: 'Customer management',
    benefit: 'Know who visited, what they booked and what they prefer.',
    icon: 'users',
    featureIds: ['customer-database', 'profiles', 'booking-history', 'crm', 'notes', 'segmentation'],
  },
  {
    id: 'billing',
    title: 'Billing and payments',
    benefit: 'Bill services and products at the counter, with the record kept.',
    icon: 'rupee',
    featureIds: ['pos', 'service-billing', 'payments', 'invoices', 'expenses', 'transactions'],
  },
  {
    id: 'staff',
    title: 'Staff management',
    benefit: 'Give the right people the right access, and track their day.',
    icon: 'staff',
    featureIds: ['staff-profiles', 'staff-access', 'scheduling', 'staff-management', 'attendance', 'performance'],
  },
  {
    id: 'inventory',
    title: 'Inventory and products',
    benefit: 'Know what is on the shelf before the customer asks for it.',
    icon: 'inventory',
    featureIds: ['catalogue', 'inventory', 'stock', 'alerts', 'product-sales'],
  },
  {
    id: 'marketing',
    title: 'Marketing and customer growth',
    benefit: 'Prepare campaigns and stay in touch with existing customers.',
    icon: 'megaphone',
    featureIds: ['campaigns', 'marketing', 'notifications', 'follow-up', 'recall', 'whatsapp'],
  },
  {
    id: 'analytics',
    title: 'Business analytics',
    benefit: 'Read bookings, revenue and team performance from actual records.',
    icon: 'chart',
    featureIds: ['analytics', 'booking-reports', 'revenue-analytics', 'staff-reports', 'stock-reports', 'insights'],
  },
  {
    id: 'presence',
    title: 'Digital salon presence',
    benefit: 'Give customers a real salon website to explore and book from.',
    icon: 'globe',
    featureIds: ['mini-website', 'business-profile', 'services', 'service-pricing', 'gallery', 'sharing'],
  },
];

/** Resolves approved catalogue entries for a landing feature group. */
export function landingFeatureItems(category: LandingFeatureCategory): FeatureItem[] {
  const catalogue = FEATURE_CATEGORIES.flatMap((entry) => entry.items);
  return category.featureIds
    .map((id) => catalogue.find((item) => item.id === id))
    .filter((item): item is FeatureItem => Boolean(item));
}

export interface LandingComparisonGroup {
  id: string;
  label: string;
  note?: string;
  featureIds: string[];
}

/**
 * Comparison groups for the pricing table. Every approved catalogue entry is
 * listed exactly once so the table is a complete, non-duplicated view of the
 * confirmed feature catalogue.
 */
export const NEXORA_LANDING_COMPARISON_GROUPS: LandingComparisonGroup[] = [
  {
    id: 'essentials',
    label: 'Essentials',
    featureIds: [
      'mini-website', 'business-profile', 'services', 'service-pricing', 'gallery',
      'location', 'social', 'sharing', 'availability', 'booking-management',
      'pos', 'service-billing', 'payments', 'invoices',
    ],
  },
  {
    id: 'acquisition',
    label: 'Customer Acquisition',
    featureIds: ['online-booking', 'customer-database', 'profiles', 'booking-history', 'segmentation', 'repeat'],
  },
  {
    id: 'retention',
    label: 'Customer Retention and Growth',
    featureIds: ['crm', 'notes', 'retention', 'loyalty', 'follow-up', 'recall'],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    featureIds: ['notifications', 'reminders', 'whatsapp', 'whatsapp-api', 'campaigns', 'marketing'],
  },
  {
    id: 'management',
    label: 'Business Management',
    featureIds: [
      'staff-profiles', 'staff-access', 'scheduling', 'staff-management', 'permissions',
      'multiple-staff', 'branches', 'advanced-permissions', 'advanced-salon-management',
      'performance-dashboard', 'expenses', 'qr', 'transactions',
    ],
  },
  {
    id: 'advanced',
    label: 'Advanced Features',
    featureIds: ['attendance', 'performance', 'catalogue', 'inventory', 'stock', 'alerts', 'product-sales'],
  },
  {
    id: 'analytics',
    label: 'Analytics and Reports',
    featureIds: [
      'analytics', 'booking-reports', 'customer-reports', 'revenue-analytics', 'staff-reports',
      'stock-reports', 'insights', 'advanced-analytics', 'daily-sales', 'revenue', 'inventory-reports',
    ],
  },
  {
    id: 'support',
    label: 'Support',
    note: 'Support channel and service-level commitments are not configured yet.',
    featureIds: ['priority-support', 'premium-support'],
  },
];

export interface LandingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
}

/** The onboarding path a new salon owner actually follows. */
export const NEXORA_HOW_IT_WORKS: LandingStep[] = [
  {
    id: 'account',
    title: 'Create your salon account',
    description: 'Add your salon details and configure your business profile from the start.',
    icon: 'store',
  },
  {
    id: 'setup',
    title: 'Set up your services and team',
    description: 'Add services, staff, schedules and the business settings your salon works with.',
    icon: 'layers',
  },
  {
    id: 'manage',
    title: 'Manage and grow your business',
    description: 'Use the workspace tools for appointments, customers, operations and marketing.',
    icon: 'chart',
  },
];

export interface PromotionCreative {
  id: string;
  category: string;
  offer: string;
  headline: string;
  detail: string;
  /** Visual recipe for the original in-page creative. */
  palette: 'ink' | 'blush' | 'sun' | 'sage' | 'rose' | 'night' | 'sand' | 'neon';
  format: '1:1' | '9:16' | '16:9';
}

/**
 * Original Nexora sample creatives. These are hand-built in the page (no
 * third-party artwork, no source-brand assets) and mirror the themes the
 * in-app Marketing campaigns module can render.
 */
export const NEXORA_PROMOTION_CREATIVES: PromotionCreative[] = [
  { id: 'haircut', category: 'Hair & styling', offer: 'SPECIAL PRICE', headline: 'Signature Haircut Week', detail: 'Cut, wash & finish · Mon to Sat', palette: 'ink', format: '1:1' },
  { id: 'bridal', category: 'Bridal & occasion', offer: 'BRIDAL PACKAGE', headline: 'Bridal Glow Package', detail: 'Trial session included', palette: 'blush', format: '9:16' },
  { id: 'festival', category: 'Festival offers', offer: 'FESTIVE SPECIAL', headline: 'Festive Glow Offer', detail: 'Limited slots this week', palette: 'sun', format: '1:1' },
  { id: 'spa', category: 'Spa & wellness', offer: 'RELAX & REFRESH', headline: 'Spa Reset Session', detail: '60 min full body ritual', palette: 'sage', format: '16:9' },
  { id: 'nail', category: 'Nail studio', offer: 'NAIL ART SESSION', headline: 'Gel Nail Art Session', detail: 'Includes maintenance', palette: 'rose', format: '1:1' },
  { id: 'tattoo', category: 'Tattoo studio', offer: 'CUSTOM INK SESSION', headline: 'Custom Ink Session', detail: 'Design consultation included', palette: 'night', format: '9:16' },
  { id: 'barber', category: 'Barber shop', offer: 'BEARD & SHAVE', headline: 'Grooming Combo', detail: 'Haircut + beard trim', palette: 'sand', format: '16:9' },
  { id: 'membership', category: 'Membership & packages', offer: 'MONTHLY PACKAGE', headline: 'Salon Membership', detail: 'Priority booking slots', palette: 'neon', format: '1:1' },
];

export const NEXORA_PROMOTION_WORKFLOW: LandingStep[] = [
  { id: 'register', title: 'Register your salon', description: 'Your business details are already in the Nexora workspace.', icon: 'store' },
  { id: 'choose', title: 'Choose a creative', description: 'Pick an approved design that fits the offer you are running.', icon: 'palette' },
  { id: 'details', title: 'Add your offer details', description: 'Salon name, offer, code and booking link are added by you.', icon: 'type' },
  { id: 'generate', title: 'Generate the creative', description: 'The campaign module renders the creative in the format you need.', icon: 'wand' },
  { id: 'share', title: 'Download and share', description: 'Export the creative and publish it on the channels you use.', icon: 'share' },
];

export interface PromotionChannel {
  id: string;
  label: string;
  status: 'available' | 'planned';
  note: string;
}

/** Sharing destinations, split by what the product supports today. */
export const NEXORA_PROMOTION_CHANNELS: PromotionChannel[] = [
  { id: 'whatsapp-status', label: 'WhatsApp Status', status: 'available', note: 'Download the creative and post it to your status.' },
  { id: 'whatsapp-groups', label: 'WhatsApp groups', status: 'available', note: 'Share with customer groups you already manage.' },
  { id: 'instagram-post', label: 'Instagram posts', status: 'available', note: 'Square and portrait formats are supported.' },
  { id: 'instagram-story', label: 'Instagram stories', status: 'available', note: '9:16 and 16:9 formats are supported.' },
  { id: 'facebook-page', label: 'Facebook page', status: 'planned', note: 'Direct publishing is not connected yet.' },
  { id: 'google-business', label: 'Google Business Profile', status: 'planned', note: 'Posting integration is not connected yet.' },
  { id: 'telegram', label: 'Telegram', status: 'planned', note: 'Direct publishing is not connected yet.' },
  { id: 'qr', label: 'Printable QR poster', status: 'planned', note: 'QR creative generation is not connected yet.' },
];

export interface LandingBenefit {
  id: string;
  title: string;
  description: string;
  icon: string;
}

/** Six practical benefits of running a salon in one connected workspace. */
export const NEXORA_BUSINESS_BENEFITS: LandingBenefit[] = [
  { id: 'appointments', title: 'Manage appointments', description: 'Bookings, availability and appointment status stay in one owner-side view.', icon: 'calendar' },
  { id: 'customers', title: 'Understand your customers', description: 'Customer profiles, visit history and notes are available when you need them.', icon: 'users' },
  { id: 'team', title: 'Coordinate your team', description: 'Give staff the access they need and keep schedules and roles clear.', icon: 'staff' },
  { id: 'tracking', title: 'Track business activity', description: 'Read appointment, revenue, staff and inventory reports from real records.', icon: 'chart' },
  { id: 'products', title: 'Organise your products', description: 'Catalogue products, watch stock levels and record what was consumed.', icon: 'inventory' },
  { id: 'promote', title: 'Promote your salon', description: 'Prepare campaign creatives for the offers you want to run next.', icon: 'megaphone' },
];

export interface LandingFaq {
  question: string;
  answer: string;
}

/**
 * Landing-page FAQ. Every answer reflects the product, infrastructure and
 * commercial settings that are actually configured in this repository.
 */
export const NEXORA_LANDING_FAQS: LandingFaq[] = [
  {
    question: 'What is Nexora SalonOS?',
    answer:
      'Nexora SalonOS is a connected platform for beauty and wellness businesses. It brings a published salon website together with owner-side tools for services, staff, customers, appointments, billing, campaigns and business reporting, so a salon can run from one workspace instead of several disconnected tools.',
  },
  {
    question: 'Which types of businesses can use it?',
    answer:
      'Nexora SalonOS is designed for salons and beauty parlours, barbershops, spas and wellness centres, nail studios, tattoo studios, skin and beauty clinics, and multi-location salon businesses. You choose the business type and template when you set up your workspace.',
  },
  {
    question: 'How can I get started?',
    answer:
      'Create a Nexora account from the Get Started button on this page, add your salon details, then configure your services, staff and business settings. Publishing your salon website and sharing its booking link is part of the same workspace.',
  },
  {
    question: 'What features are included in each plan?',
    answer:
      'Only plan inclusions that have been explicitly confirmed are marked in the comparison table. Standard explicitly includes WhatsApp API, attendance and advanced salon management. Other feature-by-plan assignments are still under commercial review, and the table marks them as pending rather than guessing. Displayed annual prices include GST.',
  },
  {
    question: 'Can I change my subscription plan?',
    answer:
      'Subscription plan changes are not handled by a configured billing workflow at the moment. Please confirm plan-change terms with Nexora before you purchase, and choose the plan that matches how you run your salon today.',
  },
  {
    question: 'Can I manage multiple staff members?',
    answer:
      'Yes. The workspace includes staff profiles, staff access, scheduling and staff management tools. The number of staff seats included in each subscription tier has not been configured, so confirm the limit that applies to you before you subscribe.',
  },
  {
    question: 'Does Nexora support online bookings?',
    answer:
      'Yes. Customers can request appointments through your published salon website, and the owner side includes appointment and booking management tools. Plan availability for online booking is still being confirmed, so check the comparison table before you purchase.',
  },
  {
    question: 'Can I manage products and billing?',
    answer:
      'The application includes owner-side point-of-sale billing, service billing, payment tracking, invoices and expense records, plus a product catalogue with inventory tracking and stock alerts. Which of these are included in each plan is still being confirmed.',
  },
  {
    question: 'Does Nexora support salon marketing?',
    answer:
      'Yes. The Marketing campaigns module builds promotion creatives from your services, offer, promo code and booking link, and exports them for the formats used on social channels. Customer communication, recall and loyalty tools are also part of the workspace. WhatsApp API is confirmed for the Standard plan only.',
  },
  {
    question: 'Can I use Nexora on mobile and desktop?',
    answer:
      'Yes. Nexora runs in the browser and works on phones, tablets and desktops, and the salon websites you publish are responsive. For the day-to-day counter work, a larger screen is easier to use, but nothing is locked to a desktop.',
  },
  {
    question: 'Where is my business data stored?',
    answer:
      'Your workspace data is stored in the Supabase project configured for Nexora, and salon media is stored in Supabase storage. Nexora has not published a specific storage region, so please ask if a data-residency requirement applies to your business.',
  },
  {
    question: 'How is my data protected?',
    answer:
      'Workspace access is tied to your Nexora account, the application supports role-based access for staff, and database policies restrict what each signed-in user can read or change. Nexora does not publish security certifications on this page, so please request the current documentation if a formal assurance is needed.',
  },
  {
    question: 'Are WhatsApp API features included?',
    answer:
      'WhatsApp API is confirmed as included in the Standard plan. The other tiers are still under review. API credentials, message template approval and delivery setup are separate platform configuration, and any messaging charged by your provider applies on top of your Nexora plan.',
  },
  {
    question: 'Are third-party integrations included?',
    answer:
      'No third-party integration is included with a Nexora plan today. Add-on capabilities such as WhatsApp API, advanced marketing automation, extra staff seats, extra branches, advanced inventory, advanced analytics, premium website customisation and priority support exist as options, but their rates are not configured and are confirmed directly with Nexora.',
  },
  {
    question: 'How can I contact support?',
    answer:
      'Use the support channel already provided inside your Nexora account. If you are still deciding, the Book a Demo form on this page sends your request through the configured server-side demo integration, and the team can also walk you through plan details. Nexora has not published a support phone number or support email on this page.',
  },
];

export interface LandingTestimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  business: string;
}

/**
 * Approved customer testimonials. Nexora has not published customer quotes for
 * this page yet, so the array stays empty and the section renders an honest
 * product-positioning panel instead of invented social proof. Add approved
 * entries here and the carousel renders them automatically.
 */
export const NEXORA_LANDING_TESTIMONIALS: LandingTestimonial[] = [];

export const NEXORA_LANDING_DISCLOSURES = [
  'No independently verified revenue-uplift, ranking or customer-count claim is made on this page.',
  'No refund guarantee, free-trial promise or money-back term is offered on this page.',
  'Plan entitlements are shown only where they have been confirmed; everything else is marked as pending.',
  'Displayed annual prices include GST. Monthly billing rates and subscription checkout are not configured yet.',
] as const;

/** Route-owned public metadata. Shared by the client renderer and the prerenderer. */
export const NEXORA_LANDING_SEO = {
  title: 'NEXORA SALONOS | Salon Management Software for Salons, Spas & Beauty Businesses',
  description:
    'Nexora SalonOS brings appointments, customers, staff, billing, marketing and business reports into one connected platform for salons, spas, nail studios and beauty businesses in India.',
  canonicalPath: '/salon-os',
  ogImagePath: '/nexora-homepage-og.jpg',
  themeColor: '#FF2323',
} as const;

/**
 * Structured data for the landing page. Only verifiable facts are described:
 * the approved annual price range and the FAQ answers that are published on
 * the page itself.
 *
 * The published database rows can be passed in so the structured data matches
 * what the visitor actually sees; without them the reviewed bundled values
 * are used.
 */
export function nexoraSalonLandingSchema(
  origin: string,
  options?: {
    faqs?: LandingFaq[];
    plans?: { annualTotal: number }[];
    description?: string;
    canonicalPath?: string;
  },
) {
  const totals = (options?.plans?.length ? options.plans : PRICING_PLANS).map((plan) => plan.annualTotal);
  const faqs = options?.faqs?.length ? options.faqs : NEXORA_LANDING_FAQS;
  const canonicalPath = options?.canonicalPath ?? NEXORA_LANDING_SEO.canonicalPath;
  const description = options?.description ?? NEXORA_LANDING_SEO.description;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'NEXORA SALONOS',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: `${origin}${canonicalPath}`,
        description,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'INR',
          lowPrice: String(Math.min(...totals)),
          highPrice: String(Math.max(...totals)),
          offerCount: totals.length,
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
      },
    ],
  };
}
