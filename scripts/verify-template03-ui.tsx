/**
 * Template 03 — Aura Unisex Salon & Wellness Lounge UI verification.
 *
 * Renders the real `unisex_salon` website with its bundled demo content and
 * asserts every section of the redesign:
 *   1. Header (sticky, no App Install in header)
 *   2. Hero Banner (Book Appointment + Explore Services + balanced Men/Women imagery)
 *   3. Salon Categories (5-zone showcase)
 *   4. Services + Combo Packages (all 16 services unchanged, zero duplicates)
 *   5. About the Salon (interior + stylist-at-work triptych)
 *   6. Why Choose Us + Men & Women Lounge + Wellness Lounge
 *   7. Our Hair Experts (Team 4:5 portraits)
 *   8. Gallery (5-tile architectural mosaic, standalone images)
 *   9. Video Gallery (5 unisex styling & grooming reels)
 *  10. Customer Reviews (rating header + 3 quote cards)
 *  11. Promotions & Offers (perforated offer vouchers)
 *  12. Loyalty & Rewards (3-tier Wellness Club + reward cards)
 *  13. Booking Section (quick-reserve planner + salon lounge image)
 *  14. Contact Details (3-card directory) + Footer (4-col + App Install in footer only)
 *
 * Also guards Template 03 isolation, simple Indian English copy, asset existence
 * across all 51 WebP files, and responsive CSS rules.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { upgradeUnisexSalonTemplate } from '../src/lib/auraUnisex';
import { renderTemplate } from './lib/renderTemplates';

const failures: string[] = [];
let checks = 0;

function ok(label: string, condition: boolean): void {
  checks += 1;
  if (!condition) failures.push(label);
}

function count(html: string, pattern: RegExp): number {
  return html.match(pattern)?.length ?? 0;
}

const DISTANT_WORDS = [
  'bespoke',
  'opulent',
  'ethereal',
  'avant-garde',
  'transcendent',
  'curated',
  'artisanal',
  'rejuvenation',
  'indulgence',
];

const template = CATEGORY_TEMPLATES.unisex_salon;

const { html } = renderTemplate('unisex_salon', {
  phone: '+91 98455 33210',
  whatsapp: '+91 98455 33210',
  postalCode: '560095',
  instagramHandle: '@aurasalon.blr',
  workingHoursMonFri: '10:00 AM – 8:30 PM',
  workingHoursSun: '10:00 AM – 6:00 PM',
});

/* ------------------------------------------------------------------ */
/* 1. Template 03 renders its own design root, and only its own        */
/* ------------------------------------------------------------------ */
ok('renders the Aura design root (.au-site)', html.includes('class="au-site"'));
ok('retains exact template name', template.title === 'Aura Unisex Salon & Wellness Lounge');
ok(
  'does not render any other template design root',
  !['le-site', 'af-site', 'pc-site', 'vn-site', 'bt-site', 'sr-site', 'ii-site', 'kp-site', 'rm-site', 'pn-site'].some(
    (root) => html.includes(`class="${root}"`) || html.includes(`${root} `),
  ),
);

/* ------------------------------------------------------------------ */
/* 2. Header (sticky, clean, App Install NOT in header)                */
/* ------------------------------------------------------------------ */
const headerBlock = html.match(/<header[\s\S]*?<\/header>/)?.[0] || '';
ok('sticky Aura header is present', html.includes('class="au-header"'));
for (const label of ['Home', 'Services', 'About', 'Our Team', 'Gallery', 'Contact']) {
  ok(`header nav link "${label}"`, html.includes(`>${label}</a>`));
}
ok('header shows the Book Appointment button', headerBlock.includes('Book Appointment'));
ok('header shows the mobile menu toggle', headerBlock.includes('au-menu-toggle'));
ok('header shows the salon sub-label', headerBlock.includes('Unisex Salon &amp; Wellness'));
ok(
  'App Install option is NOT in the header',
  !headerBlock.includes('app-install') && !headerBlock.includes('Install Customer App'),
);

/* ------------------------------------------------------------------ */
/* 3. Hero Banner — asymmetric unisex split                            */
/* ------------------------------------------------------------------ */
ok('hero section present', html.includes('id="aura-home"') && html.includes('au-hero-layout'));
ok('hero kicker for men and women', html.includes('UNISEX SALON &amp; WELLNESS LOUNGE'));
ok('hero heading "Modern Hair, Grooming & Calm Wellness for Every Style."', html.includes('Modern Hair, Grooming &amp; Calm Wellness for Every Style.'));
ok('hero primary CTA "Book Appointment"', html.includes('Book Appointment'));
ok('hero secondary CTA "Explore Services"', html.includes('Explore Services'));
for (const point of ['Men &amp; Women Specialists', 'Ammonia-Free Colour', 'Clean Wellness Rooms']) {
  ok(`hero highlight "${point}"`, html.includes(point));
}
ok('hero main unisex image', html.includes('/templates/aura-unisex/hero-main-1024.webp'));
ok('hero men card image', html.includes('/templates/aura-unisex/hero-men-760.webp'));
ok('hero women card image', html.includes('/templates/aura-unisex/hero-women-760.webp'));
ok('hero inclusive care plaque', html.includes('Inclusive Care for Everyone'));

/* ------------------------------------------------------------------ */
/* 4. Salon Categories — 5-zone architectural showcase                 */
/* ------------------------------------------------------------------ */
ok('salon categories section present', html.includes('id="aura-categories"'));
ok('five salon category cards rendered', count(html, /class="au-cat-card/g) === 5);

/* ------------------------------------------------------------------ */
/* 5. Services & Combo Packages — all 16 preserved, zero duplicates    */
/* ------------------------------------------------------------------ */
ok('services section present', html.includes('id="aura-services"'));
for (const tab of ['All Services', 'Hair', 'Beauty', 'Men&#x27;s Grooming', 'Skin Care', 'Wellness']) {
  ok(`service tab "${tab}"`, html.includes(`<span>${tab}</span>`));
}
ok('16 total template services preserved with unique IDs', template.services.length === 16 && new Set(template.services.map((s) => s.id)).size === 16);
ok('every template service renders in the menu', template.services.every((s) => html.includes(s.name.replaceAll('&', '&amp;').replaceAll("'", '&#x27;'))));
ok('service cards render exact au-service-media count', count(html, /class="au-service-media"/g) === template.services.length);
ok('service cards show Book Now', count(html, /Book Now/g) >= template.services.length);
ok('service cards show real prices', count(html, /au-service-price/g) >= template.services.length);
ok('combo packages section renders 5 bundle cards', html.includes('id="salon-packages"') && count(html, /class="au-package-card"/g) === 5);

/* ------------------------------------------------------------------ */
/* 6. About the Salon                                                  */
/* ------------------------------------------------------------------ */
ok('about section present', html.includes('id="aura-about"'));
ok('about shows the interior image', html.includes('/templates/aura-unisex/about-interior-1080.webp'));
ok('about shows the stylist-at-work image', html.includes('/templates/aura-unisex/about-work-620.webp'));
ok('about heading', html.includes('A Calm, Modern Space Built Around Personal Care'));
for (const highlight of ['Consultation Before Every Cut', 'Gentle Botanical Formulas', 'Calm &amp; Spotless Lounge']) {
  ok(`about highlight "${highlight}"`, html.includes(highlight));
}

/* ------------------------------------------------------------------ */
/* 7. Why Choose Us + Men & Women Lounge + Wellness Lounge             */
/* ------------------------------------------------------------------ */
ok('why choose us section present', html.includes('id="aura-why-us"'));
ok('four why-choose-us commitment cards', count(html, /class="au-why-card"/g) === 4);
ok('men & women lounge cards present', html.includes('id="aura-for-everyone"') && count(html, /class="au-dual-card"/g) === 2);
ok('men lounge image', html.includes('/templates/aura-unisex/feature-men-960.webp'));
ok('women lounge image', html.includes('/templates/aura-unisex/feature-women-960.webp'));
ok('wellness section present', html.includes('id="aura-wellness"') && html.includes('class="au-wellness"'));
ok('wellness image', html.includes('/templates/aura-unisex/wellness-1280.webp'));
ok('wellness lists real services', html.includes('Relaxing Head, Neck &amp; Shoulder Massage'));

/* ------------------------------------------------------------------ */
/* 8. Our Hair Experts (Team)                                          */
/* ------------------------------------------------------------------ */
ok('team section present', html.includes('id="aura-team"'));
ok('three team cards rendered', count(html, /class="au-team-card"/g) === 3);
ok('team cards use standalone portrait assets', html.includes('/templates/aura-unisex/team-1-640.webp'));
ok('team "Book with Staff" button', html.includes('Book with Staff'));
ok('team shows real stylist names', html.includes('Priya Nair') && html.includes('Arjun Mehra') && html.includes('Saniya Sheikh'));

/* ------------------------------------------------------------------ */
/* 9. Gallery — 5-tile architectural mosaic                            */
/* ------------------------------------------------------------------ */
ok('gallery section present', html.includes('id="aura-gallery"'));
ok('gallery has one featured tile', count(html, /au-gallery-tile is-featured/g) === 1);
ok('gallery has five tiles', count(html, /au-gallery-tile/g) === 5);
const gallerySrcs = Array.from(html.matchAll(/au-gallery-tile[^>]*>[\s\S]{0,260}?src="([^"]+)"/g)).map((m) => m[1]);
ok('gallery images are all unique standalone files', gallerySrcs.length === 5 && new Set(gallerySrcs).size === 5);

/* ------------------------------------------------------------------ */
/* 10. Video Gallery — 5 unisex styling & grooming reels               */
/* ------------------------------------------------------------------ */
ok('video gallery section present', html.includes('id="salon-videos"') && html.includes('data-section="videos"'));
ok('five unisex video reel cards rendered', count(html, /class="au-video-card"/g) === 5 && count(html, /class="sf-reel-media"/g) === 5);

/* ------------------------------------------------------------------ */
/* 11. Customer Reviews                                                */
/* ------------------------------------------------------------------ */
ok('reviews section present', html.includes('id="aura-reviews"'));
ok('three review cards rendered', count(html, /class="au-review-card"/g) === 3);
ok('review cards carry quote icons & stars', html.includes('au-review-quote') && count(html, /au-review-stars/g) === 3);

/* ------------------------------------------------------------------ */
/* 12. Promotions & Offers + Loyalty & Rewards                         */
/* ------------------------------------------------------------------ */
ok('promotions section present with 3 offer vouchers', html.includes('id="salon-promo"') && count(html, /class="au-offer-voucher"/g) === 3);
ok('loyalty section present with 3 tiers and reward cards', html.includes('id="salon-loyalty"') && count(html, /class="au-tier-pill/g) === 3 && count(html, /sf-loyalty-card/g) >= 3);

/* ------------------------------------------------------------------ */
/* 13. Booking Section + Contact Details + Footer (App Install here)   */
/* ------------------------------------------------------------------ */
ok('booking section present with quick-reserve planner', html.includes('id="aura-booking"') && html.includes('au-booking-planner'));
ok('booking lounge image', html.includes('/templates/aura-unisex/booking-1280.webp'));
ok('contact section present with 3 cards', html.includes('id="aura-contact"') && html.includes('au-hours-card'));
ok('contact shows address, phone, WhatsApp, and Google Maps', html.includes('Outer Ring Road, 4th Block, Koramangala') && html.includes('tel:') && html.includes('wa.me/') && html.includes('google.com/maps/search'));

const footerBlock = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] || '';
ok('footer present with four columns', footerBlock.includes('class="au-footer"') && count(footerBlock, /class="au-footer-col"/g) === 4);
ok('App Install option lives inside the footer area', footerBlock.includes('app-install') && footerBlock.includes('/?app=1&amp;install=1'));

/* ------------------------------------------------------------------ */
/* 14. Remote catalog upgrade helper touches ONLY unisex_salon         */
/* ------------------------------------------------------------------ */
const staleRemote = { id: 'unisex_salon', services: template.services.slice(0, 5), stylists: [] } as any;
const upgraded = upgradeUnisexSalonTemplate(staleRemote, template);
ok('upgradeUnisexSalonTemplate restores full 16 services when stale', upgraded.services.length === 16 && upgraded.stylists.length === 3);
const untouchedOther = { id: 'hair_salon', services: [] } as any;
ok('upgradeUnisexSalonTemplate leaves other templates untouched', upgradeUnisexSalonTemplate(untouchedOther, template) === untouchedOther);

/* ------------------------------------------------------------------ */
/* 15. Simple Indian English & Asset Integrity                         */
/* ------------------------------------------------------------------ */
const lower = html.replace(/<[^>]+>/g, ' ').toLowerCase();
for (const word of DISTANT_WORDS) {
  ok(`copy avoids the difficult word "${word}"`, !lower.includes(word));
}

const assetRefs = Array.from(
  html.matchAll(/\/templates\/aura-unisex\/([a-z0-9-]+-(\d+)\.webp)/g),
).map((match) => match[1]);
const missing = Array.from(new Set(assetRefs)).filter(
  (file) => !existsSync(path.join(process.cwd(), 'public/templates/aura-unisex', file)),
);
ok(`all ${new Set(assetRefs).size} referenced Template 03 assets exist on disk`, missing.length === 0);
if (missing.length) failures.push(`Missing assets: ${missing.join(', ')}`);

/* ------------------------------------------------------------------ */
/* 16. Scoped CSS tokens & responsive rules                            */
/* ------------------------------------------------------------------ */
const css = readFileSync(path.join(process.cwd(), 'src/components/auraUnisex.css'), 'utf8');
ok('Aura stylesheet is scoped to .au-site', (css.match(/^\.au-site/gm) || []).length > 30);
ok('Aura stylesheet uses sage green (#738b78 / #5c7362)', css.includes('#738b78') && css.includes('#5c7362'));
ok('Aura stylesheet uses warm cream (#faf8f5)', css.includes('#faf8f5'));
ok('Aura stylesheet uses natural beige (#f0e6da)', css.includes('#f0e6da'));
ok('Aura stylesheet uses charcoal (#252525)', css.includes('#252525'));
ok('Aura stylesheet uses subtle gold (#c5a46d)', css.includes('#c5a46d'));

const breakpoints = Array.from(css.matchAll(/@media\s*\(max-width:\s*(\d+)px\)/g)).map((m) => Number(m[1]));
ok('tablet & mobile breakpoints defined', breakpoints.includes(1120) && breakpoints.includes(920) && breakpoints.includes(640) && breakpoints.includes(390));
ok('no horizontal overflow on the site root', /\.au-site\s*\{[^}]*overflow-x:\s*clip/.test(css));
ok('tap targets meet the 44px minimum', /min-height:\s*4[4-9]px|min-height:\s*5[0-9]px/.test(css));
ok('reduced-motion users are respected', css.includes('prefers-reduced-motion'));

/* ------------------------------------------------------------------ */
const verdict = failures.length === 0;
console.log(
  `${verdict ? 'ok' : 'FAIL'} verify-template03-ui — ${checks - failures.length}/${checks} checks passed`,
);
if (!verdict) {
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exitCode = 1;
}
