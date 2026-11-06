# NEXORA public homepage QA

Latest continuation: [PR #81 production hardening + quality gate — 2026-11-06](pr81-production-hardening-2026-11-06.md) (SEO origin pinned to nexorasalon.online, lazy owner editors, public-access-hardening migration file, sitemap custom-domain fix, quality-gate workflow, 120/120 suites, no deployment).

Previous: [Accessibility contrast fix — 2026-11-06](accessibility-contrast-fix-2026-11-06.md) (BrowserStack `color-contrast` export: 17 confirmed + 69 indeterminate SC 1.4.3 findings fixed, new contrast regression suite, 120/120 suites, no deployment).

Earlier: [End-to-end fix report — 2026-11-06](end-to-end-fix-2026-11-06.md) (auth/email/CSP/route fixes, 119/119 suites, no deployment).

Earlier: [Production audit — 2026-11-06](production-audit-2026-11-06.md) (PR #79 baseline, Vercel rate-limit investigation, no deployment).

Verified on 2026-11-05 against the signed-out `/`, `/login`, public template preview and template-aware signup handoff.

## Screenshots

- [Desktop homepage — hero](homepage-desktop-hero.png)
- [Desktop homepage — full page](homepage-desktop.jpg)
- [Tablet homepage — hero](homepage-tablet-hero.png)
- [Tablet homepage — full page](homepage-tablet.jpg)
- [Mobile homepage — hero](homepage-mobile-hero.png)
- [Mobile homepage — full page, 75% capture scale](homepage-mobile.jpg)
- [Desktop sign-in](login-desktop.png)
- [Mobile sign-in](login-mobile.png)
- [Desktop interactive template preview](template-preview-desktop.png)
- [Direct mobile template preview route](template-preview-direct.png)

The long tablet/mobile pages were captured in independent segments and assembled to avoid the headless browser's repeated-image artifact above its capture height limit. No duplicate sections exist in the DOM.

## Passing checks

- `npm run build` — production homepage and login HTML entries plus server bundle built successfully.
- `npm run lint:edge` — passed.
- `node scripts/verify-public-homepage.mjs` — exact homepage/login content and metadata, canonical URLs, 16 templates, 15 categories and signup handoff passed.
- Focused existing registry/template verification suites — 9/9 passed after reconciling obsolete 15-template expectations with the canonical 16-template registry.
- Responsive Chromium checks at 1440, 1024, 768, 390 and 360px — no horizontal overflow, broken homepage images or page errors; navigation, controlled filters, login metadata and selected-template signup URLs passed.
- All 16 interactive iframe previews rendered their actual template content publicly. Public Customize on a template with an owner demo editor opened signup instead of that editor.
- Raw `/` and `/login` HTML responses returned their own exact metadata; `/login?auth=signup&template=hair_salon&create=1` retained its query string.
- `public/nexora-homepage-og.jpg` is a real 1200×630 homepage capture and returns `image/jpeg`.
- Full offline suite: **99/109 passed**.

## Existing baseline failures (not introduced by this change)

The ten remaining offline-suite failures were each reproduced independently on base commit `c36c29e8395b8ed06fe399791b4dd719b1edbc89`:

- `verify-app-install-section.mjs`
- `verify-customer-account-settings.mjs`
- `verify-customer-reference.mjs`
- `verify-loyalty-themes.mjs`
- `verify-photo-gallery.mjs`
- `verify-service-photos.mjs`
- `verify-staff-category-switch.mjs`
- `verify-starter-packages.mjs`
- `verify-stylist-profile.mjs`
- `verify-website-wiring.mjs`

They concern existing Aurelia Beauty Parlour feature coverage and are outside the public-homepage scope. `npm run lint` also retains exactly the four baseline errors in `AureliaBeautyEditor.tsx`, `loyaltyTheme.ts`, `staffProfile.ts` and `staffSkills.ts`; production build and edge TypeScript pass.

No deployment, database migration, dashboard redesign, template-registry content change or automatic merge is part of this work.
