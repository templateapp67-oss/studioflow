export type BillingInterval = 'monthly' | 'annual';
export type PricingPlanId = 'lite' | 'grow' | 'standard' | 'premium';
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
  { id: 'grow', name: 'Grow', annualMonthlyEquivalent: 1249, annualTotal: 14988, monthlyPrice: null, description: 'Great for small businesses with steady bookings.', positioning: 'For salons that want better customer management, booking control and business visibility.', cta: 'Choose Grow', popular: true },
  { id: 'standard', name: 'Standard', annualMonthlyEquivalent: 1999, annualTotal: 23988, monthlyPrice: null, description: 'Growing businesses with automation, reminders & insights.', positioning: 'For growing teams looking for more connected day-to-day salon operations.', cta: 'Choose Standard' },
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
 * No plan-entitlement matrix exists in the inspected application. Keep all tier
 * assignments in this single admin-editable map and use `review` until commercial
 * entitlements have been confirmed; the UI must not infer access from code presence.
 */
const unconfirmedEntitlements = { lite: 'review', grow: 'review', standard: 'review', premium: 'review' } as const;
export const FEATURE_PLAN_ENTITLEMENTS: Record<string, Record<PricingPlanId, EntitlementState>> = Object.fromEntries(
  FEATURE_CATEGORIES.flatMap(category => category.items.map(feature => [feature.id, { ...unconfirmedEntitlements }]))
) as Record<string, Record<PricingPlanId, EntitlementState>>;

// Only these Standard inclusions were explicitly approved in the product brief.
// All other tier assignments remain `review`; do not infer access from code presence.
FEATURE_PLAN_ENTITLEMENTS['whatsapp-api'].standard = 'included';
FEATURE_PLAN_ENTITLEMENTS.attendance.standard = 'included';
FEATURE_PLAN_ENTITLEMENTS['advanced-salon-management'].standard = 'included';

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
  { id: 'wa-api', name: 'WhatsApp Business API', description: 'Connect business messaging workflows with WhatsApp Business API.', price: null, availability: 'unconfigured', includedPlanIds: ['standard'] },
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
  ['Which plan is right for my salon?', 'Lite is positioned for independent professionals, Grow for small salons with steady bookings, Standard for growing businesses and Premium for established or higher-traffic operations. Confirm feature entitlements with Nexora before subscribing.'],
  ['Can I switch plans later?', 'Plan changes are not currently handled by a configured subscription workflow. Please confirm plan-change terms with Nexora before purchasing.'],
  ['Is there a monthly billing option?', 'Monthly subscription rates have not been configured. This page does not invent or charge a monthly amount. The displayed annual rate is a monthly equivalent billed annually.'],
  ['How does annual billing work?', 'The approved annual total is billed once for the annual period, and the displayed annual prices include GST. Prices shown as per month are monthly equivalents, not monthly installments. Monthly billed rates remain unconfigured.'],
  ['Is WhatsApp API included?', 'The approved pricing inputs list WhatsApp API in Standard. The other tiers are unconfirmed. API credentials, delivery setup and subscription checkout are separate platform configuration and are not activated by this pricing page.'],
  ['Does Nexora provide a mini website?', 'Nexora currently supports salon websites built from its existing templates. A mini website entitlement by plan has not been configured.'],
  ['Can customers book appointments online?', 'The existing product supports appointment booking through published salon websites. Exact plan availability has not yet been configured.'],
  ['Can I manage multiple staff members?', 'The workspace includes existing staff management tools. Staff limits and access by subscription tier are not configured on this page.'],
  ['Does Nexora support salon billing and POS?', 'The application includes owner-side POS tools. Plan availability and the scope of billing features should be confirmed with Nexora.'],
  ['Is inventory management available?', 'Inventory entitlements have not been confirmed in the subscription configuration. Please verify availability before purchase.'],
  ['Can I collect payments through my own salon QR code?', 'Salon QR collections are separate from Nexora subscription payments. QR collection support is not being represented as a subscription payment method here.'],
  ['What happens when my subscription expires?', 'Subscription lifecycle and expiry behavior have not been configured for this pricing page. No plan activation or expiry change is performed here.'],
  ['Can I contact support?', 'Support destinations and service levels are not configured in this repository. Please use the support channel already provided to your Nexora account.'],
  ['Are there additional charges?', 'Add-on rates, GST treatment and any additional fees have not been configured. Confirm the complete amount with Nexora before payment.'],
] as const;
