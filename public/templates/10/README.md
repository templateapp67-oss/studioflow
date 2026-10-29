# Prism & Chroma (Template 10) — Local Image Manifest

All images for **Prism & Chroma Hair Color Atelier (`hair_coloring` / Template 10)** are
stored locally under `/public/templates/10/` — zero external stock hotlinks.
Owners can replace any slot via onboarding (logo, cover/hero, about, booking photo,
gallery, team portraits, service photos); when a custom upload is removed or broken,
the storefront falls back to these local files via `SafeImage`.

## Source & license

- All photographs are **AI-generated for StudioFlow** (synthetic; no real private
  individuals), royalty-free for commercial & SaaS template use.
- Shade variants (cyan/coral/rose-gold), before/after "before" frames, team and
  testimonial portraits, process steps and gallery crops are derived locally
  (ImageMagick/Pillow) from the generated set — hair-only tints, face crops and
  varied crops, created for StudioFlow.
- `logo.svg` / `favicon.svg`: original prism-triangle vector artwork for StudioFlow.

## Complete image list (44 JPG + 2 SVG)

| Folder | Files | Used in |
| --- | --- | --- |
| root | `hero.jpg`, `about.jpg`, `interior.jpg` | Hero + booking CTA, About, gallery fallback |
| `services/` | balayage, global-colour, pastel, highlights, correction, keratin, gloss, root-touchup | Services bento grid (8 cards) + packages |
| `shades/` | violet, magenta, coral, cyan, rose-gold, honey | Shade Studio (6 swatches) |
| `results/` | before-1..3, after-1..3 | Before/After sliders (3) |
| `process/` | consultation, mapping, application, finish | Process — 4 steps |
| `team/` | aarushi, kiara, priya, tara | Colour Experts (4 cards) |
| `testimonials/` | ananya, ishita, meera | Testimonial avatars |
| `gallery/` | gallery-1 .. gallery-10 | Masonry gallery (10) |

Images below the fold lazy-load with fixed width/height (no layout shift) and
descriptive alt text; images carry a dark gradient overlay wherever text sits on top.

## Template 10 — Feature Coverage (spec → implementation)

Design: "Light through a Prism" — ink base #0B0B14, holographic gradient
violet → magenta → coral → cyan, Syne-style display type + Manrope body,
glass bento cards (28px radius), aurora blobs, gradient borders, marquee.

| # | Section / Feature | Where |
|---|---|---|
| 1 | Announcement offer bar (owner-editable, dismissible) | Chrome.tsx + editor Brand tab |
| 2 | Navbar — logo, links, call, gradient Book Now, account cluster | PrismChromaWebsite |
| 3 | Hero — staggered headline, Open-Now chip, rating + trust chips, stats, floating shade chips | PrismChromaWebsite |
| 4 | Interactive phone DeviceMockup (pick service/day/time → real booking) | DeviceMockup.tsx |
| 5 | Marquee strip | PrismChromaWebsite |
| 6 | About + 4 stat cards | PrismChromaWebsite |
| 7 | Services bento — category filter chips, What's-included accordion, INR prices | PrismChromaWebsite + prismServiceIncludes |
| 8 | Shade Studio — swatches, length price estimator, maintenance meter, care tips | ShadeStudio.tsx |
| 9 | Shade Compare (two shades side by side) | ShadeStudio.tsx |
| 10 | Find My Shade quiz (3 questions → shade + price estimate + caution) | ShadeFinder.tsx + recommendShade |
| 11 | Before/After ×3 — drag slider, auto-sweep, service/sittings/expert meta | BeforeAfterSlider.tsx |
| 12 | Process 4 steps — photos, duration chips, check points | config.processSteps |
| 13 | Colour Care Guide (48 hrs → Week 6-8 timeline) | config.careGuide |
| 14 | Pricing — 3 glass packages, Care-Plan toggle, savings/validity chips | PrismChromaWebsite |
| 15 | Full Price List table (grouped, print / Save-PDF) | PriceList.tsx |
| 16 | Colour Experts — photos, ratings, specialties, Book-with-expert | PrismChromaWebsite |
| 17 | Gallery — tag filters + lightbox (Esc / arrows / focus) | GalleryGrid.tsx |
| 18 | Testimonials — rating summary + distribution, autoplay carousel | TestimonialCarousel.tsx |
| 19 | Local SEO guide block (city/services/shades/areas) | SeoContentSection.tsx |
| 20 | FAQ — search + topic filter chips + accordion | PrismChromaWebsite |
| 21 | Booking CTA — quick service chips, WhatsApp, call, timings | PrismChromaWebsite |
| 22 | Branches — landmark, metro, parking, per-branch call + directions | PrismChromaWebsite |
| 23 | Footer — visit/call/timings/map embed, socials, newsletter signup | PrismChromaWebsite |
| 24 | Mobile sticky Book bar + back-to-top + scroll progress + cursor glow | Chrome.tsx |
| 25 | Colour-ring loader (reduced-motion safe) | PrismChromaWebsite |

Owner editor (9 tabs): Brand & Hero · Shade Studio (incl. quiz family,
care level) · Packages · Before & After · Journey & Care · Branches & FAQs ·
Reviews · SEO & Share · Brand Colours. Everything above is editable after
onboarding; onboarding data (name, logo, phone, city, services, prices,
team, gallery, colours) fills the template automatically.

SEO: LocalBusiness + FAQPage + ItemList JSON-LD, aggregate rating,
per-branch locations, owner meta/OG fields. Motion: framer-motion with
MotionConfig reducedMotion="user" throughout.
