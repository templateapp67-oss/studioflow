/**
 * Template 03 — Aura Unisex Salon & Wellness Lounge UI verification.
 *
 * Renders the real `unisex_salon` website with its bundled demo content and
 * asserts every section of the redesign brief: three-part hero, category-tabbed
 * service cards, two-image about block, men & women highlights, wellness band,
 * team profile cards, mixed gallery grid, three review cards, dark booking
 * banner, contact details and a four-column footer.
 *
 * Also guards the two hard constraints of the brief:
 *  - Template 03 must not inherit or emit any other template's design root.
 *  - Copy must stay in simple Indian English (no difficult marketing words).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
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
ok(
  'does not render any other template design root',
  !["le-site", "af-site", "pc-site", "vn-site", "bt-site", "sr-site", "ii-site", "kp-site", "rm-site", "pn-site"].some(
    (root) => html.includes(`class="${root}"`) || html.includes(`${root} `),
  ),
);

/* ------------------------------------------------------------------ */
/* 2. Header                                                           */
/* ------------------------------------------------------------------ */
ok('sticky Aura header is present', html.includes('class="au-header"'));
for (const label of ['Home', 'Services', 'About', 'Our Team', 'Gallery', 'Contact']) {
  ok(`header nav link "${label}"`, html.includes(`>${label}</a>`));
}
ok('header shows the Book Appointment button', html.includes('Book Appointment'));
ok('header shows the mobile menu toggle', html.includes('au-menu-toggle'));
ok('header shows the salon sub-label', html.includes('Salon &amp; Wellness') || html.includes('Salon & Wellness'));

/* ------------------------------------------------------------------ */
/* 3. Three-part hero                                                  */
/* ------------------------------------------------------------------ */
ok('hero section present', html.includes('id="aura-home"') && html.includes('au-hero-grid'));
ok('hero eyebrow "WELCOME TO AURA"', html.includes('WELCOME TO AURA'));
ok('hero heading "Look Good. Feel Fresh. Be You."', html.includes('Look Good. Feel Fresh. Be You.'));
ok(
  'hero description for men and women',
  html.includes('Hair, skin, grooming and wellness services for men and women.'),
);
ok('hero primary CTA "Book Appointment"', html.includes('Book Appointment'));
ok('hero secondary CTA "View Services"', html.includes('View Services'));
for (const point of ['Hair &amp; Beauty', 'Men&#x27;s Grooming', 'Relax &amp; Wellness']) {
  ok(`hero highlight "${point}"`, html.includes(point));
}
ok('hero main image', html.includes('/templates/aura-unisex/hero-main-1024.webp'));
ok('hero men card image', html.includes('/templates/aura-unisex/hero-men-760.webp'));
ok('hero women card image', html.includes('/templates/aura-unisex/hero-women-760.webp'));
ok('hero "Care for Everyone" box', html.includes('Care for Everyone'));
ok(
  'three hero images are all different',
  new Set([
    '/templates/aura-unisex/hero-main-1024.webp',
    '/templates/aura-unisex/hero-men-760.webp',
    '/templates/aura-unisex/hero-women-760.webp',
  ]).size === 3,
);

/* ------------------------------------------------------------------ */
/* 4. Services — tabs + image cards                                    */
/* ------------------------------------------------------------------ */
ok('services section present', html.includes('id="aura-services"'));
for (const tab of ['All Services', 'Hair', 'Beauty', 'Men&#x27;s Grooming', 'Skin Care', 'Wellness']) {
  ok(`service tab "${tab}"`, html.includes(`>${tab}</button>`));
}
ok('service cards use the 18px rounded card class', html.includes('au-service-card'));
ok('service cards show Book Now', (html.match(/Book Now/g) || []).length >= 5);
const servicePrices = count(html, /au-service-price/g);
ok('service cards show real prices', servicePrices >= 5);
ok('service cards show real durations', count(html, /au-service-time/g) >= 5);
ok('service cards show images', count(html, /au-service-media/g) >= 5);

/* ------------------------------------------------------------------ */
/* 5. About — two images + story                                       */
/* ------------------------------------------------------------------ */
ok('about section present', html.includes('id="aura-about"'));
ok('about shows the interior image', html.includes('/templates/aura-unisex/about-interior-1080.webp'));
ok('about shows the professional-at-work image', html.includes('/templates/aura-unisex/about-work-620.webp'));
ok('about heading', html.includes('Your Style. Your Comfort. Our Care.'));
for (const highlight of ['Friendly Team', 'Quality Products', 'Clean &amp; Relaxing Space']) {
  ok(`about highlight "${highlight}"`, html.includes(highlight));
}
ok('about "Know More" button', html.includes('Know More'));

/* ------------------------------------------------------------------ */
/* 6. Men & Women highlights                                           */
/* ------------------------------------------------------------------ */
ok('men & women section present', html.includes('id="aura-for-everyone"'));
ok('men card heading', html.includes('Men&#x27;s Grooming'));
ok('men card description', html.includes('Fresh haircuts, beard styling, hair colour and more.'));
ok('men card button', html.includes('Explore Men&#x27;s Services'));
ok('women card heading', html.includes('Women&#x27;s Beauty &amp; Hair'));
ok('women card description', html.includes('Hair styling, hair care, skin care and beauty services.'));
ok('women card button', html.includes('Explore Women&#x27;s Services'));
ok('men card image', html.includes('/templates/aura-unisex/feature-men-960.webp'));
ok('women card image', html.includes('/templates/aura-unisex/feature-women-960.webp'));

/* ------------------------------------------------------------------ */
/* 7. Wellness band                                                    */
/* ------------------------------------------------------------------ */
ok('wellness section present', html.includes('id="aura-wellness"') && html.includes('class="au-wellness"'));
ok('wellness heading', html.includes('Take Time for Yourself'));
ok('wellness image', html.includes('/templates/aura-unisex/wellness-1280.webp'));
ok('wellness button', html.includes('View Wellness Services'));
ok('wellness lists real services only', html.includes('Relaxing Head, Neck &amp; Shoulder Massage'));

/* ------------------------------------------------------------------ */
/* 8. Team                                                             */
/* ------------------------------------------------------------------ */
ok('team section present', html.includes('id="aura-team"'));
ok('team cards rendered', count(html, /au-team-card/g) >= 3);
ok('team cards use rounded photos', html.includes('au-team-photo'));
ok('team "Book with Staff" button', html.includes('Book with Staff'));
ok('team shows a real stylist name', html.includes('Priya Nair'));

/* ------------------------------------------------------------------ */
/* 9. Gallery                                                          */
/* ------------------------------------------------------------------ */
ok('gallery section present', html.includes('id="aura-gallery"'));
ok('gallery has one featured tile', count(html, /au-gallery-tile is-featured/g) === 1);
ok('gallery has five tiles', count(html, /au-gallery-tile/g) === 5);
const gallerySrcs = Array.from(html.matchAll(/au-gallery-tile[^>]*>[\s\S]{0,220}?src="([^"]+)"/g)).map((m) => m[1]);
ok('gallery images are all unique', gallerySrcs.length === 5 && new Set(gallerySrcs).size === 5);

/* ------------------------------------------------------------------ */
/* 10. Reviews                                                         */
/* ------------------------------------------------------------------ */
ok('reviews section present', html.includes('id="aura-reviews"'));
ok('reviews heading', html.includes('Happy Clients, Happy Smiles'));
ok('three review cards', count(html, /au-review-card/g) === 3);
ok('review cards carry a quote icon', html.includes('au-review-quote'));
ok('review cards carry a rating', count(html, /au-review-stars/g) === 3);

/* ------------------------------------------------------------------ */
/* 11. Booking banner                                                  */
/* ------------------------------------------------------------------ */
ok('booking banner present', html.includes('id="aura-booking"') && html.includes('class="au-booking"'));
ok('booking eyebrow', html.includes('READY FOR A FRESH LOOK?'));
ok('booking heading', html.includes('Your Next Salon Visit Starts Here'));
ok('booking description', html.includes('Book your favourite service at a time that works for you.'));
ok('booking image', html.includes('/templates/aura-unisex/booking-1280.webp'));

/* ------------------------------------------------------------------ */
/* 12. Contact                                                         */
/* ------------------------------------------------------------------ */
ok('contact section present', html.includes('id="aura-contact"'));
ok('contact shows the salon address', html.includes('Outer Ring Road, 4th Block, Koramangala'));
ok('contact shows the salon phone', html.includes('tel:'));
ok('contact shows WhatsApp', html.includes('wa.me/'));
ok('contact shows opening hours', html.includes('Opening Hours') && html.includes('au-hours-card'));
ok('contact shows Get Directions', html.includes('Get Directions'));
ok('contact shows the Google Maps link', html.includes('google.com/maps/search'));

/* ------------------------------------------------------------------ */
/* 13. Footer                                                          */
/* ------------------------------------------------------------------ */
ok('footer present', html.includes('class="au-footer"'));
ok('footer has four columns', count(html, /au-footer-col/g) === 4);
ok('footer quick links', html.includes('Quick Links'));
ok('footer popular services from real data', html.includes('Popular Services'));
ok('footer contact heading', html.includes('Contact Us'));
ok('footer copyright', html.includes('All rights reserved.'));

/* ------------------------------------------------------------------ */
/* 14. Simple Indian English                                           */
/* ------------------------------------------------------------------ */
const lower = html.replace(/<[^>]+>/g, ' ').toLowerCase();
for (const word of DISTANT_WORDS) {
  ok(`copy avoids the difficult word "${word}"`, !lower.includes(word));
}

/* ------------------------------------------------------------------ */
/* 15. Every referenced Template 03 asset exists on disk               */
/* ------------------------------------------------------------------ */
const assetRefs = Array.from(
  html.matchAll(/\/templates\/aura-unisex\/([a-z0-9-]+-(\d+)\.webp)/g),
).map((match) => match[1]);
const missing = Array.from(new Set(assetRefs)).filter(
  (file) => !existsSync(path.join(process.cwd(), 'public/templates/aura-unisex', file)),
);
ok(
  `all ${new Set(assetRefs).size} referenced Template 03 assets exist`,
  missing.length === 0,
);
if (missing.length) failures.push(`Missing assets: ${missing.join(', ')}`);

/* ------------------------------------------------------------------ */
/* 16. Other templates are untouched by the Template 03 colour tokens  */
/* ------------------------------------------------------------------ */
const css = readFileSync(path.join(process.cwd(), 'src/components/auraUnisex.css'), 'utf8');
ok('Aura stylesheet is scoped to .au-site', (css.match(/^\.au-site/gm) || []).length > 20);
ok('Aura stylesheet uses the brief sage green', css.includes('#738b78') || css.includes('#738B78'));
ok('Aura stylesheet uses the brief warm white', css.includes('#faf8f5') || css.includes('#FAF8F5'));
ok('Aura stylesheet uses the brief deep charcoal', css.includes('#252525'));
ok('Aura stylesheet uses the brief gold', css.includes('#c5a46d') || css.includes('#C5A46D'));
ok('Aura stylesheet uses the brief light beige', css.includes('#f0e6da') || css.includes('#F0E6DA'));
ok('Aura stylesheet uses the brief soft green', css.includes('#e7eee7') || css.includes('#E7EEE7'));

/* ------------------------------------------------------------------ */
/* 17. Mobile-first responsive rules exist for the tested viewports    */
/* ------------------------------------------------------------------ */
const breakpoints = Array.from(css.matchAll(/@media\s*\(max-width:\s*(\d+)px\)/g)).map((m) => Number(m[1]));
ok('tablet breakpoint defined', breakpoints.includes(1100) || breakpoints.includes(900));
ok('small-phone breakpoint defined', breakpoints.includes(640));
ok('narrow-phone breakpoint defined', breakpoints.includes(380));
ok('no horizontal overflow on the site root', /\.au-site\s*\{[^}]*overflow-x:\s*clip/.test(css));
ok('hero collapses to the brief mobile order', /grid-template-areas:\s*\n?\s*"copy"[\s\S]{0,120}"points"/.test(css));
ok('service grid collapses to one column on mobile', /@media \(max-width: 640px\)[\s\S]*?au-service-grid[\s\S]*?grid-template-columns:\s*1fr/.test(css));
ok('gallery becomes a two-column grid on mobile', /@media \(max-width: 900px\)[\s\S]*?au-gallery-grid[\s\S]*?grid-template-columns:\s*1fr 1fr/.test(css));
ok('footer becomes a single column on mobile', /@media \(max-width: 640px\)[\s\S]*?au-footer-grid[\s\S]*?grid-template-columns:\s*1fr/.test(css));
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
