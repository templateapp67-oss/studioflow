# Template 11 — Shringaar Royal Indian Bridal Lounge

**Category id:** `bridal_lounge` · **Picker label:** "Shringaar Royal (11)" · **Layout:** `palace_heritage` · **Theme preset:** `royal_crimson_gold`

## How to preview

| What | How |
| --- | --- |
| Template storefront (demo data) | `npm run dev` → `http://localhost:3000/?template=11` |
| Aliases that all open it | `?template=bridal_lounge`, `?template=shringaar-royal`, `?template=shringaar`, `?template=bridal` |
| Live tenant site | `https://nexorasalon.online/?site=<your-slug>` once a salon is published on this template |
| Template picker | Landing page card 11 → "Live Preview" → device canvas (desktop / tablet / mobile) |
| Onboarding | Pick "Bridal Makeup & Makeover Lounge" in the guided setup, edit services/prices/team/gallery, then publish |

## Owner-editable content

Everything on the page comes from the onboarding workspace: business identity,
services and ₹ prices, artists, gallery photos, working hours, phone/WhatsApp,
address, socials, offers and policies. `ShringaarRoyalEditor` adds the
template-specific fields (hero copy, collections, lookbook, package tiers,
before/after pairs, journey steps, bride reviews, FAQs, map embed). Demo
content in `src/lib/shringaarRoyal.ts` is only the fallback for a brand-new
workspace.

## Files

| Path | Purpose |
| --- | --- |
| `src/lib/shringaarRoyal.ts` | Brand constants, images, demo services/stylists, resolver, ₹ + SEO helpers, legacy upgrade |
| `src/components/ShringaarRoyalWebsite.tsx` | The storefront (17 sections) |
| `src/components/shringaarRoyal.css` | `.sr-*` styles, glass spec, arch masks, reduced-motion rules |
| `src/components/shringaar-royal/*` | Ornaments, motion primitives, SafeImage, DeviceMockup, BeforeAfterSlider, TestimonialCarousel, editor |
| `src/lib/motion.ts` | Shared Framer Motion variants used by Templates 09–11 |
| `public/templates/11/` | 59 bundled photographs + logo/favicon + manifest & crop script |
| `design/templates/11-sources/` | The 10 source photographs (never deployed) |
| `backend/shringaar-royal-template-11.sql` | Idempotent catalogue sync (title, palette, services, stylists, offer) |
| `scripts/verify-shringaar-royal-template.{mjs,tsx}` | 7-part acceptance suite for this template |

## Verification

```
npm run lint        # tsc --noEmit
npm run lint:edge   # Deno edge functions
npm run build
npm test            # 78/78 suites (includes verify-shringaar-royal-template)
```
