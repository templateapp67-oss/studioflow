import type { PricingPlanId } from './nexoraPricing';

/** Customer-facing comparison specification. Keep ids stable; labels are copy. */
export type ComparisonValue = boolean | string;
export interface ComparisonFeature {
  id: string;
  label: string;
  type: 'boolean' | 'numeric';
  values: Record<PricingPlanId, ComparisonValue>;
}
export interface ComparisonCategory {
  id: string;
  name: string;
  features: ComparisonFeature[];
}

const boolRow = (
  id: string,
  label: string,
  lite: boolean,
  grow: boolean,
  standard: boolean,
  premium: boolean,
): ComparisonFeature => ({
  id,
  label,
  type: 'boolean',
  values: { lite, grow, standard, premium },
});

const numericRow = (
  id: string,
  label: string,
  lite: string,
  grow: string,
  standard: string,
  premium: string,
): ComparisonFeature => ({
  id,
  label,
  type: 'numeric',
  values: { lite, grow, standard, premium },
});

export const NEXORA_COMPARISON_PLANS: readonly PricingPlanId[] = [
  'lite', 'grow', 'standard', 'premium',
];

export const NEXORA_COMPARISON_MATRIX: ComparisonCategory[] = [
  {
    id: 'addons',
    name: 'Add-ons',
    features: [
      boolRow('official-whatsapp-api-included', 'Official WhatsApp API Included', false, false, true, true),
      boolRow('manual-attendance-register-included', 'Manual Attendance Register Included', false, false, true, true),
      boolRow('biometric-attendance-register-included', 'Biometric Attendance Register Included', false, false, false, true),
    ],
  },
  {
    id: 'essentials',
    name: 'Essentials',
    features: [
      boolRow('desktop-android-ios-tablets', 'Desktop/Android, iOS Phones and Tablets', true, true, true, true),
      boolRow('unlimited-devices', 'Unlimited Devices', true, true, true, true),
      boolRow('mini-website-for-store', 'Mini Website for the store', true, true, true, true),
      boolRow('seo-optimized-website', 'SEO Optimized Website', true, true, true, true),
      boolRow('digital-service-catalog', 'Digital Service Catalog', true, true, true, true),
      boolRow('digital-style-guide', 'Digital Style Guide', true, true, true, true),
      boolRow('image-gallery', 'Image Gallery', true, true, true, true),
      boolRow('online-booking', 'Online Booking', true, true, true, true),
      boolRow('offline-booking', 'Offline Booking', true, true, true, true),
      boolRow('appointment-management', 'Appointment Management', true, true, true, true),
      boolRow('multi-channel-reminders', 'Multi Channel Reminders', true, true, true, true),
      boolRow('point-of-sale', 'Point Of Sale (POS)', true, true, true, true),
      numericRow('appointments', 'Appointments', '300/month', 'Unlimited', 'Unlimited', 'Unlimited'),
      numericRow('products', 'Products', '25 SKUs', '50 SKUs', 'Unlimited', 'Unlimited'),
      numericRow('staff-included', 'Staff Included', '4', '10', '15', '50'),
      numericRow('customer', 'Customer', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'),
      boolRow('customer-management-crm', 'Customer Management (CRM)', true, true, true, true),
      boolRow('split-payments-options', 'Split Payments Options', true, true, true, true),
      boolRow('customer-sentiment', 'Customer Sentiment', true, true, true, true),
      boolRow('multi-staff-services', 'Multi-Staff Services', false, false, true, true),
      boolRow('todo-reminders', 'ToDo Reminders', false, false, true, true),
      boolRow('before-after-image-gallery', 'Image Gallery for before/after pictures', false, false, true, true),
      boolRow('google-review-collection', 'Google Review Collection', false, false, true, true),
    ],
  },
  {
    id: 'customer-acquisition',
    name: 'Customer Acquisition',
    features: [
      boolRow('marketplace', 'Marketplace', true, true, true, true),
      boolRow('google-my-business-integration', 'Google My Business Integration', true, true, true, true),
      boolRow('instagram-integration', 'Instagram Integration', true, true, true, true),
      boolRow('facebook-integration', 'Facebook Integration', true, true, true, true),
      boolRow('inquiry-lead-management', 'Inquiry/Lead Management', true, true, true, true),
      boolRow('qr-code-integration', 'QR Code Integration', true, true, true, true),
    ],
  },
  {
    id: 'retention-growth',
    name: 'Retention and Growth',
    features: [
      boolRow('loyalty-cashback-reward-programs', 'Loyalty Program/Cashback/Reward Programs', false, false, true, true),
      boolRow('referral-programs', 'Referral Programs', false, false, true, true),
      boolRow('membership', 'Membership', false, false, true, true),
      boolRow('packages', 'Packages', false, false, true, true),
      boolRow('wallet-prepaid-card', 'Wallet/Prepaid card', false, false, true, true),
      boolRow('gift-card', 'Gift Card', false, false, false, true),
      boolRow('flexible-loyalty-programs', 'All You want and However You want Loyalty Programs', false, false, false, true),
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    features: [
      boolRow('zap-ai-message-generator', 'ZAP AI Message Generator', true, true, true, true),
      boolRow('promotional-banners', 'Promotional Banners', true, true, true, true),
      boolRow('spin-2-save', 'Spin 2 Save (Kids & Adults)', true, true, true, true),
      boolRow('marketing-automation', 'Marketing Automation', false, false, true, true),
      boolRow('automatic-notifications', 'Automatic Notifications', false, false, true, true),
      boolRow('personalized-marketing-templates', 'Personalized Marketing Templates', false, false, true, true),
      boolRow('smart-outreach', 'Smart Outreach', true, true, true, true),
      boolRow('built-in-customer-segmentation', 'Built-in Customer Segmentation', true, true, true, true),
      boolRow('tags', 'Tags', false, false, true, true),
      boolRow('campaign-management', 'Campaign Management', true, true, true, true),
      boolRow('send-notifications-from-device', 'Send Notifications From Device', true, true, true, true),
      boolRow('send-notifications-whatsapp-api', 'Send Notifications From WhatsApp API²', false, false, true, true),
      boolRow('coupons', 'Coupons', false, false, true, true),
    ],
  },
  {
    id: 'business-management',
    name: 'Business Management',
    features: [
      boolRow('home-service', 'Home Service', false, false, true, true),
      boolRow('expenses', 'Expenses', false, false, true, true),
      boolRow('vendor-management', 'Vendor Management', false, false, true, true),
      boolRow('review-collection', 'Review Collection', true, true, true, true),
      boolRow('multi-store-access', 'Multi Store Access', true, true, true, true),
      boolRow('role-level-permissions', 'Role Level Permissions', false, false, true, true),
      boolRow('data-level-permissions', 'Data Level Permissions', false, false, false, true),
      boolRow('staff-revenue-goals', 'Staff Revenue Goals', false, false, false, true),
    ],
  },
  {
    id: 'advanced-features',
    name: 'Advanced Features',
    features: [
      boolRow('advanced-inventory-management', 'Advanced Inventory Management', true, true, true, true),
      boolRow('resource-management', 'Resource Management', false, false, false, true),
      boolRow('staff-sales-target-tracking', 'Staff Sales Target Tracking', false, false, false, true),
      boolRow('consent-form', 'Consent Form', false, false, false, true),
      boolRow('cash-register', 'Cash Register', false, false, false, true),
      boolRow('staff-access', 'Staff Access', false, false, true, true),
      boolRow('role-based-access', 'Role Based Access', false, false, true, true),
      boolRow('customer-data-abuse-prevention', 'Customer Data Abuse Prevention³', false, false, true, true),
      boolRow('attendance', 'Attendance', false, false, true, true),
      boolRow('employee-tips', 'Employee Tips', true, true, true, true),
      boolRow('pabbly-zapier-integration', 'Integration with 2000+ Software using Pabbly and Zapier API', true, true, true, true),
    ],
  },
  {
    id: 'analytics-reports',
    name: 'Analytics and Reports',
    features: [
      boolRow('business-overview', 'Business Overview', true, true, true, true),
      boolRow('customer-insights-revenue-potential', 'Customer Insights and Revenue Potential', false, false, true, true),
      boolRow('staff-reports', 'Staff Reports', true, true, true, true),
      boolRow('sales-reports', 'Sales Reports', true, true, true, true),
      boolRow('revenue-reports', 'Revenue reports', true, true, true, true),
      boolRow('payment-source', 'Payment Source', true, true, true, true),
      boolRow('inventory-reports', 'Inventory Reports', true, true, true, true),
      boolRow('appointment-reports', 'Appointment Reports', true, true, true, true),
      boolRow('product-consumption-reports', 'Product Consumption Reports', false, false, true, true),
      boolRow('staff-performance-tracking', 'Staff Performance Tracking', false, false, true, true),
      boolRow('staff-commission', 'Staff Commission', false, false, true, true),
      boolRow('expense-report', 'Expense Report', false, false, true, true),
    ],
  },
  {
    id: 'support',
    name: 'Support',
    features: [
      boolRow('chat-email-support', 'Chat / Email Support', true, true, true, true),
      boolRow('telephone-support', 'Telephone Support', false, false, true, true),
      boolRow('priority-support', 'Priority Support', false, false, false, true),
      boolRow('dedicated-account-manager', 'Dedicated Account Manager', false, false, false, true),
    ],
  },
];

export const NEXORA_COMPARISON_ROW_COUNT = NEXORA_COMPARISON_MATRIX.reduce(
  (total, category) => total + category.features.length,
  0,
);

/** Guard the reference specification against accidental drift at import time. */
const EXPECTED_COUNTS: Record<string, number> = {
  addons: 3,
  essentials: 23,
  'customer-acquisition': 6,
  'retention-growth': 7,
  marketing: 13,
  'business-management': 8,
  'advanced-features': 11,
  'analytics-reports': 12,
  support: 4,
};

if (
  NEXORA_COMPARISON_MATRIX.length !== 9 ||
  NEXORA_COMPARISON_ROW_COUNT !== 87 ||
  NEXORA_COMPARISON_MATRIX.some((category) => category.features.length !== EXPECTED_COUNTS[category.id])
) {
  throw new Error('Nexora comparison matrix does not match the approved nine-category, 87-feature specification.');
}

const allFeatures = NEXORA_COMPARISON_MATRIX.flatMap((category) => category.features);
if (new Set(allFeatures.map((feature) => feature.id)).size !== allFeatures.length) {
  throw new Error('Nexora comparison matrix contains duplicate feature IDs.');
}
