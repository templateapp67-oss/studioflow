import { addOnIncludedPlanIds, resolveApprovedEntitlements } from './nexoraPlanEntitlements';

export type BillingInterval = 'monthly' | 'annual';
export type PricingPlanId = 'lite' | 'grow' | 'standard' | 'premium';

// The attached landing-page reference flags generic metrics/testimonials as sample.
// This experience contains none of those claims; only user-approved pricing is shown.
export const SAMPLE_CONTENT = false;
export const PRICING_PAGE_COPY = {
  hero: {
    eyebrow: 'NEXORA SALONOS PRICING',
    title: 'The Right Tools to Grow Your',
    emphasis: 'Salon Business.',
    description: 'Whether you run an independent beauty studio or manage a growing salon chain, Nexora SalonOS gives you tools to manage bookings, customers, staff, payments and business operations from one platform.',
    note: 'Simple pricing. Powerful salon management. Built for Indian businesses.',
  },
  benefits: {
    eyebrow: 'MADE FOR EVERYDAY SALON WORK',
    title: 'Why Salons Choose Nexora SalonOS.',
    description: 'Bring supported salon workflows into a connected workspace, with tools designed around the way salons work.',
  },
  demo: {
    eyebrow: 'SEE NEXORA IN ACTION',
    title: 'Explore the workspace with our team.',
    description: 'Request a walkthrough of the salon workflows and plan details you want to review.',
  },
  closing: {
    eyebrow: 'YOUR NEXT STEP',
    title: 'Ready to Take Your Salon Business Forward?',
    description: 'Start managing your salon more professionally with Nexora SalonOS.',
  },
} as const;

export const PRICING_BENEFITS = [
  { title: 'Your salon business in one place', description: 'Keep supported salon workflows together in one owner workspace.', icon: 'workspace' },
  { title: 'Better appointment management', description: 'Review and manage appointments made through your published salon website.', icon: 'calendar' },
  { title: 'Organized customer records', description: 'Find customer and booking details in the tools your workspace supports.', icon: 'customers' },
  { title: 'Easier billing and payments', description: 'Use available owner-side POS tools for salon transactions.', icon: 'payments' },
  { title: 'Better staff coordination', description: 'Manage staff profiles and supported team workflows.', icon: 'staff' },
  { title: 'Customer retention tools', description: 'Explore existing customer engagement and loyalty tools.', icon: 'retention' },
  { title: 'Business analytics', description: 'See operational information provided by your existing workspace.', icon: 'analytics' },
  { title: 'A professional online presence', description: 'Build a salon website from Nexora’s existing templates.', icon: 'online' },
] as const;
export type EntitlementState = 'included' | 'excluded' | 'review';

export interface PricingPlan {
  id: PricingPlanId;
  name: string;
  annualMonthlyEquivalent: number;
  annualTotal: number;
  monthlyPrice: number | null;
  description: string;
  positioning: string;
  cta: string;
  popular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  { id: 'lite', name: 'Lite', annualMonthlyEquivalent: 625, annualTotal: 7500, monthlyPrice: null, description: 'Great for Solopreneurs and Just Getting Started.', positioning: 'For independent beauty professionals who need an organized way to manage their everyday salon business.', cta: 'Get Started' },
  { id: 'grow', name: 'Grow', annualMonthlyEquivalent: 1249, annualTotal: 14988, monthlyPrice: null, description: 'Great for small businesses with steady bookings.', positioning: 'For salons that want better customer management, booking control and business visibility.', cta: 'Choose Grow' },
  { id: 'standard', name: 'Standard', annualMonthlyEquivalent: 1999, annualTotal: 23988, monthlyPrice: null, description: 'Growing businesses with automation, reminders & insights.', positioning: 'For growing teams looking for more connected day-to-day salon operations.', cta: 'Choose Standard', popular: true },
  { id: 'premium', name: 'Premium', annualMonthlyEquivalent: 4999, annualTotal: 59988, monthlyPrice: null, description: 'For high-traffic businesses needing full control.', positioning: 'For established salons and larger beauty businesses requiring comprehensive management and advanced operational controls.', cta: 'Contact Sales' },
];

export interface FeatureItem { id: string; label: string; description: string; }
export interface FeatureCategory { id: string; label: string; items: FeatureItem[]; }
const items = (rows: Array<[string, string, string]>): FeatureItem[] => rows.map(([id, label, description]) => ({ id, label, description }));

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  { id: 'presence', label: 'Online Presence', items: items([
    ['mini-website','Mini Website','Published salon website experience.'],['business-profile','Custom Business Profile','Business details and brand profile.'],['services','Salon Services Display','Service catalogue and descriptions.'],['service-pricing','Service Pricing Display','Published prices for salon services.'],['gallery','Photo Gallery','Salon imagery and work gallery.'],['location','Location and Contact Details','Salon location and contact details.'],['social','Social Media Links','Links configured by the salon.'],['sharing','Website Sharing','Shareable public salon website.'],['online-booking','Online Booking','Appointment booking from a salon website.'],['availability','Booking Availability','Availability and slot handling.'],['booking-management','Booking Management','Owner-side appointment management.'],
  ]) },
  { id: 'customers', label: 'Customer Management', items: items([
    ['customer-database','Customer Database','Customer records associated with a salon.'],['profiles','Customer Profiles','Customer account and profile information.'],['booking-history','Booking History','Past and upcoming salon bookings.'],['crm','Customer CRM','Customer management tools.'],['notes','Customer Notes','Salon-side customer notes.'],['segmentation','Customer Segmentation','Audience grouping tools.'],['repeat','Repeat Customer Management','Tools to manage returning customers.'],['retention','Customer Retention Tools','Retention and follow-up workflows.'],['loyalty','Loyalty and Rewards','Rewards and loyalty capabilities.'],
  ]) },
  { id: 'billing', label: 'Billing and POS', items: items([
    ['pos','POS Billing','Salon-side point-of-sale billing.'],['invoices','Invoice Generation','Invoices or receipts generated in salon.'],['service-billing','Service Billing','Bill salon services.'],['payments','Payment Tracking','Record service payment status.'],['expenses','Expense Management','Business expense records.'],['daily-sales','Daily Sales Reports','Day-level salon sales summaries.'],['revenue','Revenue Reports','Revenue reporting.'],['qr','Salon QR Payment Collection','The salon’s own payment QR collection; separate from Nexora subscription payments.'],['transactions','Transaction History','Salon transaction history.'],
  ]) },
  { id: 'staff', label: 'Staff Management', items: items([
    ['staff-profiles','Staff Profiles','Team member profiles.'],['staff-access','Staff Access','Staff access to supported workspace tools.'],['scheduling','Staff Scheduling','Staff schedule management.'],['staff-management','Staff Management','Manage salon team members.'],['attendance','Attendance System','Staff attendance tracking.'],['performance','Staff Performance Reports','Staff performance reporting.'],['permissions','Role-Based Permissions','Role-based access controls.'],
  ]) },
  { id: 'automation', label: 'WhatsApp and Automation', items: items([
    ['notifications','Booking Notifications','Booking-related customer communications.'],['reminders','Appointment Reminders','Appointment reminder tools.'],['follow-up','Customer Follow-Up','Customer follow-up communication.'],['whatsapp','WhatsApp Integration','WhatsApp-related business workflows.'],['whatsapp-api','WhatsApp API','Meta/WhatsApp Business API integrations.'],['campaigns','Automated Campaigns','Automated marketing campaigns.'],['recall','Customer Recall','Customer recall workflows.'],['marketing','Marketing Notifications','Marketing notification capabilities.'],
  ]) },
  { id: 'inventory', label: 'Inventory Management', items: items([
    ['catalogue','Product Catalogue','Salon product cataloguing.'],['inventory','Inventory Tracking','Inventory quantity tracking.'],['stock','Stock Management','Stock management tools.'],['alerts','Stock Alerts','Low-stock alerts.'],['product-sales','Product Sales','Product sale management.'],['inventory-reports','Inventory Reports','Inventory reporting.'],
  ]) },
  { id: 'analytics', label: 'Analytics and Reports', items: items([
    ['analytics','Dashboard Analytics','Owner dashboard summaries.'],['booking-reports','Booking Reports','Booking activity reporting.'],['customer-reports','Customer Reports','Customer reporting.'],['revenue-analytics','Revenue Analytics','Revenue analytics.'],['staff-reports','Staff Reports','Staff reporting.'],['stock-reports','Inventory Reports','Inventory reporting.'],['insights','Business Insights','Business performance insights.'],['advanced-analytics','Advanced Analytics','Advanced analytics capabilities.'],
  ]) },
  { id: 'business', label: 'Business Management', items: items([
    ['advanced-salon-management','Advanced Salon Management','Advanced salon operations, as named in the approved Standard plan inputs.'],['multiple-staff','Multiple Staff Support','Multiple staff member support.'],['branches','Multi-Branch Management','Multiple salon location support.'],['advanced-permissions','Advanced Permissions','Advanced role and access controls.'],['performance-dashboard','Business Performance Dashboard','Business operations overview.'],['priority-support','Priority Support','Priority support service.'],['premium-support','Premium Support','Premium support service.'],
  ]) },
];

/**
 * The plan-entitlement matrix now lives in `nexoraPlanEntitlements.ts` as one
 * explicit, approved line per catalogue feature. Every cell is `included` or
 * `excluded`; `review` is kept in the type so an unapproved row can fail closed,
 * but it must never appear in that matrix (the pricing verification suite fails
 * the build if it does).
 *
 * The UI must still not infer access from code presence — it reads this map only.
 */
export const FEATURE_PLAN_ENTITLEMENTS: Record<string, Record<PricingPlanId, EntitlementState>> =
  resolveApprovedEntitlements();

/** True only when every cell of a feature is an approved binary entitlement. */
export function isEntitlementApproved(featureId: string): boolean {
  const plans = FEATURE_PLAN_ENTITLEMENTS[featureId];
  return Boolean(plans) && PRICING_PLANS.every(plan => plans[plan.id] === 'included' || plans[plan.id] === 'excluded');
}

/**
 * Catalogue entries the comparison table may render. Unapproved (`review`) cells
 * are never published, so a row missing from the approved matrix cannot leak a
 * half-answered comparison into the customer-facing table.
 */
export const PUBLISHED_COMPARISON_FEATURE_IDS: string[] = FEATURE_CATEGORIES
  .flatMap(category => category.items.map(item => item.id))
  .filter(isEntitlementApproved);

export const PENDING_PRICING_SELECTION_KEY = 'nexora_pending_pricing_selection';
export interface PendingPricingSelection { planId: PricingPlanId; billingInterval: BillingInterval; savedAt: number; }
export function isPricingPlanId(value: string | null | undefined): value is PricingPlanId {
  return PRICING_PLANS.some(plan => plan.id === value);
}
export function isBillingInterval(value: string | null | undefined): value is BillingInterval {
  return value === 'monthly' || value === 'annual';
}
export function savePendingPricingSelection(selection: PendingPricingSelection): void {
  try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(PENDING_PRICING_SELECTION_KEY, JSON.stringify(selection)); } catch { /* URL redirect also carries the non-sensitive plan identifiers. */ }
}
export function readPendingPricingSelection(): PendingPricingSelection | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_PRICING_SELECTION_KEY) || 'null') as Partial<PendingPricingSelection> | null;
    if (!value || !isPricingPlanId(value.planId) || !isBillingInterval(value.billingInterval) || !Number.isFinite(value.savedAt)) return null;
    if (Date.now() - Number(value.savedAt) > 30 * 60 * 1000) return null;
    return { planId: value.planId, billingInterval: value.billingInterval, savedAt: Number(value.savedAt) };
  } catch { return null; }
}
export function clearPendingPricingSelection(): void {
  try { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(PENDING_PRICING_SELECTION_KEY); } catch { /* Storage can be unavailable in privacy-restricted contexts. */ }
}
export function pricingAuthPath(selection: Pick<PendingPricingSelection, 'planId' | 'billingInterval'>): string {
  const params = new URLSearchParams({ auth: 'signup', pricing_plan: selection.planId, billing_interval: selection.billingInterval });
  return `/login?${params.toString()}`;
}
export function pricingResumePath(selection: Pick<PendingPricingSelection, 'planId' | 'billingInterval'>): string {
  const params = new URLSearchParams({ resume_plan: selection.planId, billing_interval: selection.billingInterval });
  return `/pricing?${params.toString()}`;
}

export type AddOn = { id: string; name: string; description: string; price: number | null; availability: 'unconfigured' | 'available'; includedPlanIds: PricingPlanId[]; };
export const PRICING_ADD_ONS: AddOn[] = [
  // Bundling is derived from the approved entitlement matrix so an add-on can
  // never be billed on top of a plan that already includes the capability.
  { id: 'wa-api', name: 'WhatsApp Business API', description: 'Connect business messaging workflows with WhatsApp Business API.', price: null, availability: 'unconfigured', includedPlanIds: addOnIncludedPlanIds('wa-api') },
  { id: 'marketing', name: 'Advanced Marketing Automation', description: 'Build more connected campaign and customer recall workflows.', price: null, availability: 'unconfigured', includedPlanIds: [] },
  { id: 'staff-seats', name: 'Additional Staff Seats', description: 'Extend team access for a larger salon team.', price: null, availability: 'unconfigured', includedPlanIds: [] },
  { id: 'branches', name: 'Additional Branches', description: 'Manage operations across additional salon locations.', price: null, availability: 'unconfigured', includedPlanIds: [] },
  { id: 'inventory', name: 'Advanced Inventory Management', description: 'Add deeper product and stock management workflows.', price: null, availability: 'unconfigured', includedPlanIds: [] },
  { id: 'analytics', name: 'Advanced Analytics', description: 'Explore deeper operational and business reporting.', price: null, availability: 'unconfigured', includedPlanIds: [] },
  { id: 'website', name: 'Premium Website Customization', description: 'Explore additional customization for your salon website.', price: null, availability: 'unconfigured', includedPlanIds: [] },
  { id: 'support', name: 'Priority Support', description: 'Ask about support options for your salon team.', price: null, availability: 'unconfigured', includedPlanIds: [] },
];

export const PRICING_FAQS = [
  ['What is Nexora SalonOS?', 'Nexora SalonOS is a connected platform for creating a salon website and managing supported salon workflows such as services, staff and appointments. Available features can vary by workspace configuration.'],
  ['Which plan is right for my salon?', 'Lite is positioned for independent professionals, Grow for small salons with steady bookings, Standard for growing businesses and Premium for established or higher-traffic operations. The comparison table lists the approved feature entitlements for each plan.'],
  ['Can I switch plans later?', 'Plan changes are not currently handled by a configured subscription workflow. Please confirm plan-change terms with Nexora before purchasing.'],
  ['Is there a monthly billing option?', 'Monthly subscription rates have not been configured. This page does not invent or charge a monthly amount. The displayed annual rate is a monthly equivalent billed annually.'],
  ['How does annual billing work?', 'The approved annual prices include GST. Prices shown per month are monthly equivalents, not installments. Monthly billed rates remain unconfigured, and subscription checkout is not available on this page, so no subscription charge is made here.'],
  ['Is WhatsApp API included?', 'The approved plan entitlements include the official WhatsApp Business API from the Standard plan onward, at no separate add-on charge. Lite and Grow do not include it. API credentials, delivery setup and subscription checkout are separate platform configuration and are not activated by this pricing page.'],
  ['Does Nexora provide a mini website?', 'Yes. A mini website for the store is included in every plan, Lite through Premium, built from Nexora\u2019s existing salon templates.'],
  ['Can customers book appointments online?', 'Yes. Online booking, booking availability and owner-side booking management are included in every plan, Lite through Premium.'],
  ['Can I manage multiple staff members?', 'Grow, Standard and Premium include staff profiles, staff access, scheduling and staff management. Lite is a single-operator plan for independent professionals and does not include team management.'],
  ['Does Nexora support salon billing and POS?', 'Yes. Owner-side POS billing, service billing, invoices, payment tracking and day-level sales reports are included in every plan. Expense management and revenue reporting start from Grow.'],
  ['Is inventory management available?', 'Inventory tracking, stock management, low-stock alerts and product sales are included from the Grow plan onward. Inventory reports start from Standard. Lite does not include inventory management.'],
  ['Can I collect payments through my own salon QR code?', 'Salon QR payment collection is included in every plan, and it stays separate from Nexora subscription payments. QR collection is not a subscription payment method.'],
  ['What happens when my subscription expires?', 'Subscription lifecycle and expiry behavior have not been configured for this pricing page. No plan activation or expiry change is performed here.'],
  ['Can I contact support?', 'Support service levels are not configured yet, so no plan currently promises Priority or Premium Support. Please use the support channel already provided to your Nexora account.'],
  ['Are there additional charges?', 'Add-on rates, GST treatment and any additional fees have not been configured. Confirm the complete amount with Nexora before payment.'],
] as const;
