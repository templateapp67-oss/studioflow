# Public content and SEO audit — PR #163

Scope: repository/build inspection on 2026-11-25. These are offline findings, not a crawl of production. Existing routing, robots, redirects, crawler policies and Clarity were not changed in this audit.

## Changes and automated checks

- The partner-rewards social card was an SVG with 1600×1000 viewBox but declared 1200×630. It now uses the existing 1200×630 JPEG card for both prerendered and client metadata, improving social-crawler compatibility and correcting the declared dimensions. The awards artwork remains on the page.
- Privacy now declares its own Twitter image and image alt in both prerendered and client metadata, and resets OG dimensions and alt on client navigation. This prevents inheriting another route's card properties.
- All 16 template documents now use their full document title for OG and Twitter titles. The homepage awards poster declares its 1600×1000 dimensions and asynchronous decoding to reserve space.
- `verify-public-emitted-content.mjs` examines the eight static public routes plus 16 template documents: unique nonempty titles/descriptions, canonical and OG URLs, OG type/title/description and local images, one nonempty H1, valid JSON-LD with primary page URL matching canonical where schema is present, image alt attributes and local image/srcset assets, internal links and prerendered anchors, inbound links from other prerendered documents, and one sitemap entry per document. Empty alt is allowed for decorative images. The seven empty alts on growth rewards are decorative hero medallions; their reward cards have meaningful alternatives. The privacy notice deliberately has no JSON-LD; structured data is optional.
- Existing suites separately exercise public routing/SEO, breadcrumbs, published salon SSR, link integrity, demo-lead server and client response contracts, and the Jaipur competition/directory. The static test does not prove client hydration, full schema eligibility, external link availability, dynamic salon/listing contents or deployed HTTP behavior.

## Media and performance observations

The homepage hero already uses 480/680/960px WebP sources (31,858 / 55,522 / 92,228 bytes) with a JPEG fallback, explicit dimensions and high priority; the OG JPEG is 111,062 bytes. The homepage font is local. Vercel config declares long-lived immutable caching for `/assets/*` and revalidation for `/index.html`; deployed response headers for these and other routes were not checked here. Production build warns about large JS chunks: the main bundle was 866.29 kB (245.38 kB gzip), and SalonWebsitePreview was 1,074.17 kB (267.65 kB gzip); these are individual emitted files, not a measurement of a user's total download. Review code splitting using real network traces before changing loading boundaries.

Larger files for later review include the customer-app poster PNG (1,961,381 bytes; also downloadable and shared as PNG), template-asset JPEGs (847,423 and 820,255 bytes), and Kesh Prakriti's team photo (839,137 bytes). No risky blanket conversion or replacement was made: use depends on template/customer journeys, and visual quality, alpha, downloads and compatibility need review. The existing Template 15 media inventory reports 26 requested images present, 30 requested images and six process videos missing; these are inventory requests, not necessarily broken rendered URLs. Review that manifest separately with the owner. No current Lighthouse, LCP, CLS or field Core Web Vitals measurement was made; historical reports and screenshots describe earlier builds only.

## Editorial, directory and lead forms

No verified author names, biographies or editorial bylines were supplied for these product/marketing pages. Do not invent people, expertise, reviews, ratings or schema. Before publishing articles or bios, obtain approved real identity, role, credentials, review date and consent; add author/schema only where supported by visible content. The competition directory is populated client-side from its public RPC for approved, opted-in profiles, with an empty state and owner visibility settings; no listings or third-party review profiles were fabricated. Public prerendering does not contain live listing data; verify the intended search/discovery strategy with owners before adding indexable listing pages or LocalBusiness schema.

The demo dialog has required fields/consent, pending and error/success states, a honeypot and shared idempotency key across primary and fallback calls. Existing offline tests exercise validation, rate limiting, upstream errors, response parsing, timeout, idempotency forwarding and redacted logging using mocks. They do not prove the deployed service is configured or that an actual lead is stored/received. No live submission was made. With owner approval, perform one clearly labelled test in an authorized environment, verify durable storage and notification/follow-up, then clean up according to policy; also test required fields, consent, pending, failure/retry and keyboard/screen-reader behavior.

No active Google Analytics tag, Search Console verification tag, G2 or Capterra profile link was found in the searched main application sources and public assets; this cannot establish external account or tag-manager state. Do not add tracking or claim profiles without owner authorization and privacy review.

## Owner and post-merge checklist

1. Owner reviews and explicitly approves PR #163 and performs the merge; this audit does not merge it. Monitor the main Production workflow, deployment and live SEO checks on the merged commit.
2. Independently verify Vercel Production has the plain-text `VITE_SUPABASE_URL` value `https://zilwgiuiygqqardzutxi.supabase.co` without exposing other configuration or secrets.
3. Inspect live public and representative published salon pages, metadata, sharing previews, images, links, sitemap, HTTP cache headers and live performance after deployment. In particular, prior direct mock tests of unknown salon slugs did not verify Vercel's actual vanity rewrite; confirm unknown-slug routing/status and noindex on the deployed platform.
4. Verify Search Console property ownership, submit/inspect sitemap and indexing, link the correct GA property if authorized, and perform a Google `site:` search. Search results and indexing can lag and are not guaranteed.
5. Have the owner verify/create or claim genuine G2 and Capterra profiles, using accurate approved descriptions and authentic reviews only.
6. Perform the authorized lead-form QA above and verify competition directory approval, opt-in, visibility changes and public output with consented test data. No production data or external account settings were changed during this audit.
