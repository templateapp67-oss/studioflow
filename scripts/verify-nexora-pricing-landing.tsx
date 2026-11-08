import React from 'react';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { NexoraPricingLandingPage } from '../src/components/nexora-landing/NexoraPricingLandingPage';
import { FEATURE_CATEGORIES, PRICING_FAQS, PRICING_PLANS, PUBLISHED_COMPARISON_FEATURE_IDS } from '../src/lib/nexoraPricing';
import { PRICING_ADD_ONS } from '../src/lib/nexoraPricing';
import { PlanSummaryDialog } from '../src/components/nexora-landing/sections/PlanSummaryDialog';

const html = renderToStaticMarkup(<NexoraPricingLandingPage />);
const strip = (value: string) =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
// The disclosure list states what the page does NOT promise; it is checked
// separately so a negated statement is never read as a promise.
const disclosuresBlock = html.match(/<ul class="sl-final__disclosures">[\s\S]*?<\/ul>/)?.[0] ?? '';
const disclosureText = strip(disclosuresBlock);
const pageText = strip(html.replace(disclosuresBlock, ' '));

/* --- Structure ------------------------------------------------------------ */
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'The pricing landing page has exactly one H1');
assert.ok(html.includes('id="sl-hero-title"'), 'The H1 is the hero headline');
assert.ok(html.includes('<main id="sl-main">'), 'A main landmark exists');
assert.ok(html.includes('href="#sl-main"'), 'A skip link targets the main landmark');
assert.ok(html.includes('<header class="sl-header'), 'A banner landmark exists');
assert.ok(html.includes('<footer class="sl-footer"'), 'A contentinfo landmark exists');

const requiredSections = [
  'id="salon-categories"',
  'id="platform"',
  'id="features"',
  'id="how-it-works"',
  'id="pricing"',
  'id="comparison"',
  'id="benefits"',
  'id="customer-app-experience"',
  'id="multi-device-experience"',
  'id="recurring-packages"',
  'id="group-management"',
  'id="customer-recall"',
  'id="birthday-special-gifts"',
  'id="customer-loyalty"',
  'id="whatsapp-communication"',
  'id="staff-commission-performance"',
  'id="nearby-customer-discovery"',
  'id="testimonials"',
  'id="faq"',
  'id="get-started"',
];
const positions = requiredSections.map((marker) => html.indexOf(marker));
assert.ok(positions.every((position) => position >= 0), 'Every documented section is rendered');
assert.ok(
  positions.every((position, index) => index === 0 || position > positions[index - 1]),
  'The sections render in the documented order',
);
assert.equal((html.match(/id="customer-app-experience"/g) || []).length, 1, 'The customer app experience is added once');
assert.ok(pageText.includes('A simpler path from salon discovery to booking.'), 'The new section explains the customer-facing app journey');
assert.ok(pageText.includes('Live in the customer app.'), 'The customer app capabilities are described as live');
assert.ok(html.includes('href="/?app=1"'), 'The new customer app action opens its configured route');
assert.equal((html.match(/id="multi-device-experience"/g) || []).length, 1, 'The multi-device experience section is added once');
assert.ok(
  pageText.includes('Preview your salon website across desktop, tablet and mobile.'),
  'The multi-device section describes the verified website preview modes',
);
assert.ok(pageText.includes('Live in the existing website editor'), 'The website preview modes are described as live');
assert.ok(pageText.includes('not separate native apps'), 'The multi-device section avoids implying native apps');
assert.equal((html.match(/id="recurring-packages"/g) || []).length, 1, 'The recurring packages section is rendered exactly once');
assert.equal((html.match(/id="group-management"/g) || []).length, 1, 'The group management section is rendered exactly once');
assert.ok(pageText.includes('Sell Service Packages. Manage Every Session Without Confusion.'), 'The package section has its approved heading');
assert.ok(pageText.includes('PARTIAL · package listings in some templates'), 'Existing package listings are distinguished from planned session management');
assert.ok(pageText.includes('automated recurring booking are not available'), 'Recurring renewal and booking are not claimed as live');
for (const sample of ['Priya Sharma', 'Hair Treatment Package', 'Total sessions', 'Completed', 'Remaining', 'DEMONSTRATION DATA']) {
  assert.ok(pageText.includes(sample), `The package illustration identifies sample data and shows ${sample}`);
}
assert.ok(pageText.includes('Manage Group Sessions and Multiple Participants in One Place.'), 'The group-management section has its approved heading');
assert.ok(pageText.includes('PLANNED · NOT LIVE'), 'The unimplemented group workflow is explicitly labelled planned');
for (const sample of ['Beauty & Skin Care Workshop', '15 December', '11:00 AM', 'Capacity', 'Registered', 'Available']) {
  assert.ok(pageText.includes(sample), `The group illustration includes ${sample}`);
}
assert.ok(pageText.includes('Interactive demo only · no data is saved'), 'The group tabs are disclosed as local-only demonstration controls');
assert.ok(html.includes('role="tablist" aria-label="Group management demo views"'), 'The group demo tabs are accessible');
assert.equal((html.match(/role="tab"/g) || []).length, 4, 'All four group demo tabs render');
assert.ok(html.includes('no booking, participant or attendance data is created or stored'), 'The group demo does not imply backend persistence');
for (const [id, label] of [
  ['customer-recall', 'Customer Recall & Rebooking'],
  ['birthday-special-gifts', 'Birthday Wishes & Special Gifts'],
  ['customer-loyalty', 'Customer Loyalty & Rewards'],
  ['whatsapp-communication', 'WhatsApp Customer Communication'],
]) {
  assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${label} renders exactly once`);
}
assert.ok(pageText.includes('Make the next visit easier to remember—and easier to book.'), 'Recall section has its approved showcase heading');
assert.ok(pageText.includes('Owner-selected inactivity thresholds and an automated recall schedule are not verified'), 'Recall thresholds and automation are not claimed as live');
assert.ok(pageText.includes('Illustrative only · not interactive'), 'Recall thresholds are clearly identified as demo-only');
assert.ok(pageText.includes('not medical or clinical advice'), 'Recall examples do not imply medical recommendations');
assert.ok(pageText.includes('From the last visit to a customer-led rebooking'), 'Recall section includes a visual customer journey');
assert.ok(pageText.includes('Customer DOB and per-salon birthday-sharing preferences are supported'), 'Birthday section reflects verified customer profile and consent behavior');
assert.ok(pageText.includes('Birthdays this month'), 'Birthday section identifies the existing month filter');
assert.ok(pageText.includes('Scheduled birthday sends and birthday-gift fulfilment are not verified features'), 'Birthday automation and gifts are not claimed as live');
assert.ok(pageText.includes('DEMO · DOES NOT SAVE'), 'Birthday gift controls are identified as non-persistent demo UI');
assert.ok(pageText.includes('Current message tokens'), 'Birthday message preview uses supported personalization tokens');
assert.ok(pageText.includes('no sample points or transactions are shown here'), 'Loyalty section discloses its no-sample-balance policy');
assert.ok(pageText.includes('NO SAMPLE BALANCE'), 'Loyalty wallet does not show a fabricated customer balance');
assert.ok(pageText.includes('Bronze · Silver · Gold · Platinum'), 'Loyalty section uses supported tier labels');
assert.ok(pageText.includes('Custom tier names, VIP perks and automated VIP journeys are not verified'), 'Unsupported loyalty tiers and perks are not presented as live');
assert.ok(pageText.includes('checked-in backend rules include a points award after a qualifying first paid visit'), 'Loyalty section identifies the source-backed referral rule and its qualification');
assert.ok(pageText.includes('Click-to-Chat drafts'), 'WhatsApp section distinguishes manual Click-to-Chat drafts');
assert.ok(pageText.includes('Manual campaign preparation'), 'WhatsApp section distinguishes manual campaign preparation from sending');
assert.ok(pageText.includes('Scheduled automation & receipts'), 'WhatsApp section does not imply an automated send schedule');
assert.ok(pageText.includes('BUSINESS PLATFORM / API'), 'WhatsApp section distinguishes provider/API sending from Click-to-Chat');
assert.ok(pageText.includes('Campaign outcome labels'), 'WhatsApp section shows honest outcome categories without invented counts');
assert.ok(pageText.includes('sender source exists under backend/functions'), 'WhatsApp sender source is acknowledged without claiming deployment');
assert.ok(pageText.includes('deployment, allowed origins, credentials and approved templates are not verified in this checkout'), 'WhatsApp deployment and provider configuration remain explicitly unverified');
assert.ok(pageText.includes('accepted” as not confirmed delivery'), 'WhatsApp provider acceptance is distinguished from delivery');
assert.ok(pageText.includes('Unknown not auto-retried'), 'WhatsApp unknown outcomes are not portrayed as automatically retried');
assert.ok(pageText.includes('More merge fields'), 'WhatsApp section distinguishes live tokens from illustrative tokens');
assert.ok(pageText.includes('opt-out / STOP instructions'), 'WhatsApp section explains opt-out handling');

/* --- Phase 3: staff commission and nearby discovery ----------------------- */
for (const [id, label] of [
  ['staff-commission-performance', 'Staff Commission & Performance Management'],
  ['nearby-customer-discovery', 'Nearby Customer Discovery & Salon Growth'],
]) {
  assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${label} renders exactly once`);
}
const sectionHtml = (source: string, id: string) => {
  const start = source.indexOf(id);
  const sectionStart = start < 0 ? -1 : source.lastIndexOf('<section', start);
  const sectionEnd = start < 0 ? -1 : source.indexOf('</section>', start);
  return sectionStart < 0 || sectionEnd < 0 ? '' : source.slice(sectionStart, sectionEnd + '</section>'.length);
};
const staffShowcase = sectionHtml(html, 'id="staff-commission-performance"');
const discoveryShowcase = sectionHtml(html, 'id="nearby-customer-discovery"');
assert.ok(staffShowcase, 'The commission showcase is present as a scoped section');
assert.ok(staffShowcase.includes('aria-label="Sample profile rate, not a saved account value"'), 'The sample commission rate is not described as a saved account value');
assert.ok(discoveryShowcase, 'The nearby discovery showcase is present as a scoped section');
for (const sample of [
  'Your Team Works Better When Everyone Knows Their Performance.',
  'PARTIAL · profile-rate configuration',
  'LIVE · staff-linked appointments',
  'Service-wise sales',
  '₹20,000 × 10% = ₹2,000',
  'NOT AN APP CALCULATION',
  'Pending commission',
  'Paid commission',
  'No commission transactions are recorded by the reviewed app path.',
  'No commission ledger, approval queue, pending/paid state or payout history is currently verified.',
  'not a delivery date or product commitment',
]) {
  assert.ok(pageText.includes(sample), `The staff commission showcase accurately discloses ${sample}`);
}
assert.ok(staffShowcase.includes('colSpan="6"'), 'The commission-history table shows an empty state rather than a fake transaction');
assert.ok(staffShowcase.includes('All sample inputs and arithmetic are illustrative'), 'The example commission arithmetic is explicitly illustrative');
for (const sample of [
  'Be Discoverable When Customers Search for a Salon Nearby.',
  'LIVE · directory, search and categories',
  'PARTIAL · location coverage varies',
  'DEMO · sample cards only',
  'Location permission is requested only when selected',
  'Manual city or area search remains available',
  'postal-code matching depends on salon address data',
  'Nearest sorting and displayed distances need the customer’s location and usable salon coordinates.',
  'distance needs customer permission and usable salon coordinates',
  'Map pins may be approximate and are labelled',
  'production catalogue availability and individual listing data were not independently verified',
  'TEMPLATE DEMO',
  'Hair Salon',
  'Beauty Parlour',
  'Nail Studio',
  'Spa',
  'Sample area · demo profile',
  'From published menu',
  'Not shown in demo',
  'Active salon offers only',
  'Sort by nearest · only when location data allows',
  'View salon profile',
  'not a promise of placement, enquiries, bookings or revenue',
  'no paid placement or ranking is implied',
]) {
  assert.ok(pageText.includes(sample), `The nearby discovery showcase accurately describes ${sample}`);
}
assert.ok(discoveryShowcase.includes('aria-label="Template-demo salon cards; no live listings or distances shown"'), 'The listing illustration is labelled as non-live template data');
assert.ok(!discoveryShowcase.includes(' km'), 'No fabricated distance appears in the discovery preview');
for (const asset of ['/templates/10/interior.jpg', '/templates/pinky-nails/studio-interior.jpg', '/templates/14/treatment-room-800.webp']) {
  assert.ok(discoveryShowcase.includes(asset), `The discovery preview reuses the local asset ${asset}`);
  assert.ok(existsSync(`public${asset}`), `The local discovery asset ${asset} exists`);
}
const phase3CssFiles = [
  ['staff commission', 'src/components/nexora-landing/sections/staffCommissionPerformanceSection.css'],
  ['nearby discovery', 'src/components/nexora-landing/sections/nearbyCustomerDiscoverySection.css'],
];
for (const [name, path] of phase3CssFiles) {
  assert.ok(existsSync(path), `${name} section has a dedicated stylesheet`);
  const css = readFileSync(path, 'utf8');
  for (const width of ['1024px', '820px', '480px', '390px', '360px']) {
    assert.ok(css.includes(`max-width: ${width}`), `${name} section includes responsive rules for ${width}`);
  }
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), `${name} section respects reduced-motion preferences`);
  assert.ok(css.includes('.sl-page .sl-'), `${name} CSS selectors are scoped to the NEXORA page`);
  assert.ok(css.includes('var(--nx-color-primary)'), `${name} section uses the Nexora design tokens`);
  assert.ok(!['\nbody {', '\nhtml {', '\n:root {'].some((selector) => css.includes(selector)), `${name} stylesheet does not add global rules`);
}
const retentionCssFiles = [
  ['recall', 'src/components/nexora-landing/sections/customerRecallSection.css'],
  ['birthday', 'src/components/nexora-landing/sections/birthdaySpecialGiftsSection.css'],
  ['loyalty', 'src/components/nexora-landing/sections/customerLoyaltySection.css'],
  ['WhatsApp', 'src/components/nexora-landing/sections/whatsappCommunicationSection.css'],
];
for (const [name, path] of retentionCssFiles) {
  assert.ok(existsSync(path), `${name} section has a dedicated stylesheet`);
  const css = readFileSync(path, 'utf8');
  for (const width of ['1024px', '820px', '480px', '390px', '360px']) {
    assert.ok(css.includes(`max-width: ${width}`), `${name} section includes responsive rules for ${width}`);
  }
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), `${name} section respects reduced-motion preferences`);
  for (const color of ['#1f5f53', '#0f2924', '#2f9a80', '#d62976', '#fbfbfd', '#ffffff', '#0b1020', '#6b7280']) {
    assert.ok(css.includes(color), `${name} section uses the requested scoped palette color ${color}`);
  }
  assert.ok(css.includes('.sl-page .sl-'), `${name} CSS selectors are scoped to the NEXORA page`);
  assert.ok(!['\nbody {', '\nhtml {', '\n:root {'].some((selector) => css.includes(selector)), `${name} stylesheet does not add global rules`);
}
const wcagContrastRatio = (foreground: string, background: string) => {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255);
    const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};
const extractCssVariable = (css: string, variable: string) =>
  css.match(new RegExp(`${variable}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
const birthdayCss = readFileSync('src/components/nexora-landing/sections/birthdaySpecialGiftsSection.css', 'utf8');
const recallCss = readFileSync('src/components/nexora-landing/sections/customerRecallSection.css', 'utf8');
const whatsappCss = readFileSync('src/components/nexora-landing/sections/whatsappCommunicationSection.css', 'utf8');
const birthdayFilterRule = birthdayCss.split('.sl-page .sl-birthday-gifts__filters small {')[1]?.split('}')[0] ?? '';
const recallColumnsRule = recallCss.split('.sl-page .sl-customer-recall__columns {')[1]?.split('}')[0] ?? '';
const whatsappPhoneRule = whatsappCss.split('.sl-page .sl-whatsapp-communication__phone-input {')[1]?.split('}')[0] ?? '';
const birthdayMuted = extractCssVariable(birthdayCss, '--sl-bg-muted');
const recallMuted = extractCssVariable(recallCss, '--sl-cr-muted');
const whatsappMuted = extractCssVariable(whatsappCss, '--sl-wc-muted');
assert.ok(birthdayFilterRule.includes('color: var(--sl-bg-muted)'), 'Birthday filter metadata uses the accessible muted token');
assert.ok(recallColumnsRule.includes('color: var(--sl-cr-muted)'), 'Recall column labels use the accessible muted token');
assert.ok(whatsappPhoneRule.includes('color: var(--sl-wc-muted)'), 'WhatsApp phone preview text uses the accessible muted token');
assert.ok(birthdayMuted && wcagContrastRatio(birthdayMuted, '#ffffff') >= 4.5, 'Birthday filter text meets 4.5:1 contrast on white');
assert.ok(recallMuted && wcagContrastRatio(recallMuted, '#fbfbfd') >= 4.5, 'Recall column text meets 4.5:1 contrast on near-white');
assert.ok(whatsappMuted && wcagContrastRatio(whatsappMuted, '#ffffff') >= 4.5, 'WhatsApp phone preview text meets 4.5:1 contrast on white');
const recurringCss = readFileSync('src/components/nexora-landing/sections/recurringPackagesSection.css', 'utf8');
const groupManagementCss = readFileSync('src/components/nexora-landing/sections/groupManagementSection.css', 'utf8');
for (const [name, css] of [['package', recurringCss], ['group', groupManagementCss]]) {
  for (const width of ['1024px', '820px', '480px', '390px', '360px']) {
    assert.ok(css.includes(`max-width: ${width}`), `${name} section includes responsive rules for ${width}`);
  }
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), `${name} section respects reduced-motion preferences`);
  for (const color of ['#1f5f53', '#0f2924', '#2f9a80', '#d62976', '#fbfbfd', '#ffffff', '#0b1020', '#6b7280']) {
    assert.ok(css.includes(color), `${name} section uses the requested scoped palette color ${color}`);
  }
}
assert.ok(groupManagementCss.includes('grid-template-columns: minmax(0, 1.55fr) minmax(260px, 0.75fr)'), 'The group demo begins with a balanced dashboard and mobile-preview split');
const multiDeviceCss = readFileSync('src/components/nexora-landing/sections/multiDeviceExperienceSection.css', 'utf8');
assert.ok(multiDeviceCss.includes('grid-template-columns: minmax(0, 0.96fr) minmax(0, 1.04fr)'), 'The multi-device section uses a shrinkable desktop layout');
assert.ok(multiDeviceCss.includes('@media (max-width: 820px)'), 'The multi-device section stacks at tablet/mobile widths');
assert.ok(multiDeviceCss.includes('@media (max-width: 480px)'), 'The multi-device section has small-screen adjustments');
const customerAppCss = readFileSync('src/components/nexora-landing/sections/customerAppExperienceSection.css', 'utf8');
assert.ok(customerAppCss.includes('grid-template-columns: minmax(0, 0.96fr) minmax(0, 1.04fr)'), 'The desktop customer app section uses a shrinkable two-column layout');
assert.ok(customerAppCss.includes('@media (max-width: 820px)'), 'The customer app section stacks at tablet/mobile widths');
assert.ok(customerAppCss.includes('@media (max-width: 480px)'), 'The customer app section has small-screen adjustments');
assert.ok(customerAppCss.includes('flex-wrap: wrap') && customerAppCss.includes('overflow-wrap: anywhere'), 'Customer app controls and text can wrap on narrow screens');

/* --- Navigation ----------------------------------------------------------- */
const sectionIds = new Set(Array.from(html.matchAll(/id="([^"]+)"/g)).map((match) => match[1]));
const anchors = Array.from(html.matchAll(/href="(#[^"]*)"/g)).map((match) => match[1]);
assert.ok(anchors.length > 10, 'The page uses section anchors for in-page navigation');
for (const anchor of anchors) {
  assert.notEqual(anchor, '#', 'No placeholder "#" links are used');
  assert.ok(sectionIds.has(anchor.slice(1)), `Anchor ${anchor} resolves to a rendered section`);
}
for (const label of ['Platform', 'Features', 'Salon categories', 'Pricing', 'FAQs']) {
  assert.ok(pageText.includes(label), `The header navigation exposes "${label}"`);
}
const absoluteLinks = Array.from(html.matchAll(/href="(\/[^"#]*)"/g)).map((match) => match[1].replace(/&amp;/g, '&'));
const allowedRoutes = new Set([
  '/',
  '/?app=1',
  '/login',
  '/login?auth=signup',
  '/login?auth=signup&pricing_plan=lite&billing_interval=annual',
  '/login?auth=signup&pricing_plan=grow&billing_interval=annual',
  '/login?auth=signup&pricing_plan=standard&billing_interval=annual',
  '/login?auth=signup&pricing_plan=premium&billing_interval=annual',
  '/?app=1&module=22',
  '/pricing',
  '/salon-os',
  '/privacy',
]);
for (const route of absoluteLinks) {
  assert.ok(allowedRoutes.has(route), `Route ${route} is a configured destination`);
}

/* --- Hero ----------------------------------------------------------------- */
assert.ok(
  pageText.includes('Run Your Salon. Grow Your Business. All From One Place.'),
  'The hero uses the approved headline',
);
assert.ok(pageText.includes('Explore Plans'), 'The primary hero action leads to the plans');
assert.ok(html.includes('href="#pricing"'), 'The primary hero action targets the plans section');
assert.ok(pageText.includes('Request a Demo'), 'The secondary hero action requests a demo');
assert.ok(html.includes('sl-btn--secondary'), 'The demo action is rendered as an interactive control');
assert.ok(pageText.includes('Illustrative'), 'The preview is labelled as illustrative');

/* --- Approved pricing ----------------------------------------------------- */
for (const plan of PRICING_PLANS) {
  const monthly = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(plan.annualMonthlyEquivalent);
  const total = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(plan.annualTotal);
  assert.ok(pageText.includes(plan.name), `Plan ${plan.name} is shown`);
  assert.ok(pageText.includes(monthly), `Plan ${plan.name} shows its monthly equivalent (${monthly})`);
  assert.ok(pageText.includes(total), `Plan ${plan.name} shows its annual total (${total})`);
}
assert.ok(pageText.includes('GST inclusive'), 'GST inclusion is explained');
assert.ok(pageText.includes('billed annually'), 'The annual billing basis is unmistakable');
assert.ok(pageText.includes('subscription checkout'), 'The missing subscription checkout is disclosed');
assert.ok(!pageText.includes('Free trial'), 'No free-trial promise is published');
assert.ok(!pageText.includes('money back'), 'No money-back promise is published');
assert.ok(!/\d+% off/i.test(pageText), 'No invented discount percentage is published');
assert.ok(!/\bper month\b(?![^.]{0,40}equivalent)/i.test(pageText) || pageText.includes('Monthly equivalent'), 'No monthly instalment is implied');

const annualSummary = renderToStaticMarkup(
  <PlanSummaryDialog plan={PRICING_PLANS[0]} interval="annual" onClose={() => undefined} />,
);
assert.ok(annualSummary.includes('role="dialog"') && annualSummary.includes('aria-modal="true"'), 'The plan summary renders a modal dialog');
assert.ok(annualSummary.includes('aria-labelledby="sl-dialog-title"') && annualSummary.includes('aria-describedby="sl-dialog-checkout-note"'), 'The plan summary has accessible title and description references');
assert.ok(annualSummary.includes('Subscription checkout is not configured.'), 'The dialog does not imply that plan selection charges or activates a subscription');
const planDialogSource = readFileSync('src/components/nexora-landing/sections/PlanSummaryDialog.tsx', 'utf8');
assert.match(planDialogSource, /event\.key === 'Escape'/, 'The plan summary closes on Escape');
assert.match(planDialogSource, /event\.key !== 'Tab'/, 'The plan summary traps keyboard focus');
assert.match(planDialogSource, /event\.shiftKey && focused === first/, 'Shift+Tab wraps focus to the final dialog control');
assert.match(planDialogSource, /!event\.shiftKey && focused === last/, 'Tab wraps focus to the first dialog control');
assert.match(planDialogSource, /previousFocus\.focus\(\)/, 'Closing the plan summary restores focus to its trigger');

/* --- Comparison matrix ---------------------------------------------------- */
const catalogueIds = FEATURE_CATEGORIES.flatMap((category) => category.items).map((item) => item.id);
assert.ok(html.includes('<table class="nx-compare">'), 'The comparison uses real table semantics');
assert.ok(html.includes('scope="row"'), 'Feature rows use row headers');
assert.ok(html.includes('scope="colgroup"'), 'Feature groups use column group headers');
assert.ok(
  html.includes('role="region"') && html.includes('aria-label="Feature comparison by plan.'),
  'The scrollable table region is labelled',
);
// The customer-facing table publishes exactly two binary states; no cell is
// allowed to sit in an unresolved "pending" state.
for (const label of ['Included', 'Not included']) {
  assert.ok(html.includes(label), `Every published entitlement state has a text alternative: ${label}`);
}
assert.ok(!html.includes('Pending plan confirmation'), 'No plan cell is published as pending');
assert.ok(!html.includes('lucide-circle-help'), 'No question-mark icon appears in the comparison table');
const renderedFeatureRows = (html.match(/class="nx-compare__feature-label"/g) || []).length;
assert.equal(renderedFeatureRows, PUBLISHED_COMPARISON_FEATURE_IDS.length, 'Every approved catalogue feature is listed exactly once');
const renderedGroups = (html.match(/class="nx-cat__cell"/g) || []).length;
assert.equal(renderedGroups, 9, 'Every documented comparison group renders a heading row');

/* --- Add-ons -------------------------------------------------------------- */
assert.equal(PRICING_ADD_ONS.length, 8, 'Eight add-ons are documented');
for (const addon of PRICING_ADD_ONS) {
  assert.ok(pageText.includes(addon.name), `Add-on "${addon.name}" is listed`);
}
assert.ok(
  pageText.includes('Add-ons cannot be purchased on this page'),
  'The page states that add-ons cannot be purchased here',
);
assert.ok(!/₹\s?\d[\d,]*\s*(?:\/|per )\s*(month|user|seat)/i.test(pageText), 'No add-on price is invented');

/* --- Product experience section is removed -------------------------------- */
assert.ok(!html.includes('product-preview'), 'The retired product preview anchor is not rendered');
assert.ok(!html.includes('sl-preview'), 'No product preview styling hook is rendered');
assert.ok(!pageText.includes('A Clear View of Your Salon Business'), 'The product preview heading is removed');
assert.ok(
  !pageText.includes('Illustrative interface preview. The panels show layout only and contain no live salon data.'),
  'The product preview note is removed',
);
assert.ok(!pageText.includes('Open your workspace'), 'The product preview CTA is removed');

/* --- Salon Promotion Studio is removed ------------------------------------ */
assert.ok(!html.includes('salon-marketing'), 'The retired Salon Promotion Studio anchor is not rendered');
assert.ok(!html.includes('sl-promo'), 'No Salon Promotion Studio styling hook is rendered');
assert.ok(!pageText.includes('SALON PROMOTION STUDIO'), 'The Salon Promotion Studio heading is removed');
assert.ok(!pageText.includes('Original sample creatives built for this page'), 'The creative gallery is removed');
assert.ok(!pageText.includes('Where you can share'), 'The promotion sharing list is removed');

/* --- Honest social proof -------------------------------------------------- */
assert.ok(
  pageText.includes('Approved customer quotes are published here as they are collected.'),
  'The empty testimonial state is disclosed',
);
assert.ok(!html.includes('★'), 'No fake rating is rendered');
assert.ok(!/\b\d+\+?\s*(happy|customers|clients|salons|reviews)\b/i.test(pageText), 'No invented customer counts are published');
assert.ok(!/guarantee/i.test(pageText), 'No guarantee claim is published');
assert.ok(
  disclosureText.includes('refund guarantee') || disclosureText.includes('money-back'),
  'The page explicitly discloses that no refund or money-back term is offered',
);

/* --- FAQ ------------------------------------------------------------------ */
assert.equal(PRICING_FAQS.length, 15, 'The published FAQ answers the fifteen documented questions');
assert.equal(
  (html.match(/aria-expanded="[^"]*" aria-controls="sl-faq-panel-/g) || []).length,
  15,
  'Every FAQ trigger exposes its state',
);
assert.equal(
  (html.match(/role="region" aria-labelledby="sl-faq-button-/g) || []).length,
  15,
  'Every FAQ answer panel is a labelled region',
);
for (const [question] of PRICING_FAQS) {
  assert.ok(pageText.includes(question), `FAQ question "${question}" is visible`);
}

/* --- Route and deployment wiring ------------------------------------------ */
const appRouter = readFileSync('src/AppRouter.tsx', 'utf8');
assert.ok(
  appRouter.includes("publicPath === '/pricing'") && appRouter.includes('<NexoraPricingLandingPage />'),
  '/pricing renders the complete NEXORA SALONOS landing page',
);
assert.ok(
  appRouter.includes("publicPath === '/salon-os'") && appRouter.includes('<NexoraSalonLandingPage />'),
  '/salon-os keeps its own public landing page',
);
assert.ok(
  appRouter.includes("new Set(['/salon-os', '/pricing', '/privacy'])"),
  'The public marketing routes stay outside the owner workspace bundle',
);
const vercel = readFileSync('vercel.json', 'utf8');
assert.ok(
  vercel.includes('"source": "/pricing"') && vercel.includes('"destination": "/pricing/index.html"'),
  'Vercel serves the prerendered /pricing document',
);
assert.ok(vercel.includes('"source": "/salon-os"'), 'The existing /salon-os rewrite is preserved');
const server = readFileSync('server.ts', 'utf8');
assert.ok(
  server.includes('nexoraDemoLeadHandler') && server.includes('"/api/nexora-demo-lead"'),
  'The Express server delegates the demo endpoint to the shared handler',
);
assert.ok(server.includes('path.join(distPath, "pricing", "index.html")'), 'The Node server serves dist/pricing');
const apiAdapter = readFileSync('api/nexora-demo-lead.ts', 'utf8');
assert.ok(
  apiAdapter.includes('nexoraDemoLeadHandler'),
  'A Vercel-compatible API adapter exposes the same handler',
);

/* --- Secrets never reach the browser -------------------------------------- */
const envExample = readFileSync('.env.example', 'utf8');
assert.ok(envExample.includes('VITE_SUPABASE_URL'), 'The browser project URL is configurable');
assert.ok(envExample.includes('VITE_SUPABASE_PUBLISHABLE_KEY'), 'The publishable browser key is configurable');
assert.ok(
  !/VITE_[A-Z_]*SERVICE_ROLE/.test(envExample) && !/VITE_[A-Z_]*SECRET/.test(envExample),
  'No service-role or secret key is exposed through a VITE_ variable',
);
const supabaseClient = readFileSync('src/lib/supabase.ts', 'utf8');
assert.ok(
  supabaseClient.includes('VITE_SUPABASE_PUBLISHABLE_KEY') && supabaseClient.includes('VITE_SUPABASE_ANON_KEY'),
  'The single browser client accepts the publishable key and keeps the legacy alias',
);
const browserSources = [
  'src/lib/nexoraLandingData.ts',
  'src/lib/supabase.ts',
  'src/components/nexora-landing/LandingContentProvider.tsx',
  'src/components/nexora-landing/NexoraPricingLandingPage.tsx',
  'src/components/nexora-pricing/DemoProvider.tsx',
]
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');
assert.ok(!/service_role|SUPABASE_SERVICE_ROLE_KEY/.test(browserSources), 'No privileged credential is referenced in browser code');
assert.ok(
  !/\.from\(\s*['"\`]landing_leads['"\`]\s*\)/.test(browserSources),
  'The browser never queries the private lead table',
);
assert.ok(browserSources.includes("supabase.functions.invoke('submit-landing-lead'"), 'Leaves are submitted through the Edge Function');

/* --- Prerendered document -------------------------------------------------- */
const prerendered = 'dist/pricing/index.html';
if (existsSync(prerendered)) {
  const document = readFileSync(prerendered, 'utf8');
  assert.ok(
    document.includes('<link rel="canonical" href="https://nexorasalon.online/pricing"'),
    'The prerendered page owns its canonical URL',
  );
  assert.ok(
    document.includes('<title>NEXORA SalonOS | Salon Management Software, Pricing &amp; Features</title>'),
    'The prerendered page ships the published title',
  );
  assert.ok(document.includes('application/ld+json'), 'The prerendered page ships structured data');
  assert.ok(document.includes('"FAQPage"'), 'The structured data describes the visible FAQ');
  assert.ok(document.includes('"AggregateOffer"'), 'The structured data describes the approved price range');
  assert.ok(!document.includes('AggregateRating'), 'No aggregate rating is published');
  assert.ok(document.includes('poppins-latin-400-normal.woff2'), 'The prerendered page preloads its local font');
  assert.ok(!document.includes('fonts.googleapis.com'), 'The prerendered page has no third-party font request');
}

console.log(
  'PASS: /pricing renders the complete NEXORA SALONOS landing page with approved annual pricing, a complete comparison matrix, honest add-on and FAQ content, a working route, a Vercel-compatible demo endpoint and a prerendered SEO document.',
);
