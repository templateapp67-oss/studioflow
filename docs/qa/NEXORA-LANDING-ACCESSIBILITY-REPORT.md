# NEXORA SALONOS landing page — accessibility report

**Target:** WCAG 2.2 AA for the public marketing pages (`/`, `/pricing`, `/salon-os`, `/privacy`) and the shared
components they use.

> **Scope note (updated).** An automated browser pass **was executed** in this environment: headless
> **Chromium 153.0.8010.0** (`@sparticuz/chromium`), driven by **puppeteer-core 25.16.0**, with
> **axe-core 4.14.0** running the full rule set (WCAG 2.0/2.1/2.2 A and AA) against `/pricing`, `/salon-os` and
> `/privacy` at 1440×900 and 390×844. The raw output is stored in
> [`screenshots/axe-and-metrics.json`](screenshots/axe-and-metrics.json) and the captures in
> [`screenshots/`](screenshots/). **Six runs, six runs with zero violations.** Keyboard walk-throughs and a
> screen-reader pass were *not* performed here and stay listed in §6.

---

## 1. What is asserted automatically

| Requirement | Where it is enforced | Test |
|---|---|---|
| Skip link to the main content | `.sl-skip` as the first focusable element of every marketing page | `scripts/verify-nexora-pricing-landing.mjs` |
| Exactly one `h1` per page and a heading order that does not skip levels | section components render one `h1`/`h2` per section with `aria-labelledby` | `scripts/verify-nexora-pricing-landing.mjs` |
| Landmarks | `header`/`nav`/`main`/`footer`; every `nav` carries an accessible name, including the mobile action bar (`<nav aria-label="Quick actions">`) | axe `region` rule + `verify-nexora-pricing-landing.mjs` |
| Visible focus indicator | `:focus-visible { outline: 3px solid var(--nx-color-primary-dark) }` (light) and `#ff2323` on the dark surfaces — never a zero-pixel ring | `src/components/nexora-landing/nexoraLanding.css` |
| Contrast | body text `#151c27` on white (≥ 14:1), muted text `#4b4f58` on white (≈ 8.6:1), primary button `#cc1c1c` with white text (5.6:1); `#ff2323` is used only for large text and non-text accents | axe `color-contrast` + `verify-nexora-salon-landing.mjs` |
| Accessible names of links | the brand link exposes its visible text; no `aria-label` overrides the visible name | axe `label-content-name-mismatch` |
| Keyboard reachability of every control | all CTAs are real `<a>`/`<button>` elements; the mobile menu, the FAQ accordion and the demo dialog are implemented with buttons and `aria-expanded` / `aria-controls` | `scripts/verify-nexora-pricing-landing.mjs` |
| FAQ accordion state | `aria-expanded` + `aria-controls` on each question button, panels toggled with `visibility` and grid-rows so the content is not focusable when collapsed | `scripts/verify-nexora-pricing-landing.mjs` |
| Focus trap and focus return in the demo dialog | `DemoProvider` traps `Tab` inside `#nexora-demo-dialog` and returns focus to the trigger on close | `scripts/verify-nexora-pricing-landing.mjs` |
| Form labels, required state and error announcements | every field has a `<label for>`; `maxLength` and `required` are set; the result message is announced with `role="status"` | `scripts/verify-nexora-pricing-landing.mjs` |
| Honeypot is not announced or focusable | `aria-hidden="true"` container and `tabIndex={-1}` | `scripts/verify-nexora-pricing-landing.mjs` |
| Reduced motion | `prefers-reduced-motion` block disables transitions and animations | `src/components/nexora-landing/nexoraLanding.css` |
| No nested interactive elements | header, footer, cards and buttons are siblings, never nested | code inspection |
| Touch targets | primary controls use a 44 px minimum height; the mobile action bar uses 48 px targets | `src/components/nexora-landing/nexoraLanding.css` |
| Table semantics | the comparison matrix is a real `<table>` with `<caption>`, `scope="col"` headers and a focusable scroll region that announces "scroll horizontally on small screens" | `scripts/verify-nexora-pricing-landing.mjs` |
| Decorative imagery | every image carries an `alt` (empty for decoration); the landing pages ship **zero raster images** (CSS/SVG illustrations only) | code inspection of the section library |

## 2. Browser evidence (axe-core 4.14.0)

| Page | Viewport | axe violations | LCP | CLS |
|---|---|---|---|---|
| `/pricing` | 1440×900 | **0** | 448 ms | 0 |
| `/salon-os` | 1440×900 | **0** | 344 ms | 0.006 |
| `/privacy` | 1440×900 | **0** | 132 ms | 0 |
| `/pricing` | 390×844 | **0** | 348 ms | 0 |
| `/salon-os` | 390×844 | **0** | 320 ms | 0 |
| `/privacy` | 390×844 | **0** | 100 ms | 0 |

The scan ran against the **production build** (`NODE_ENV=production node dist/server.cjs`), i.e. against the
prerendered documents that the deployment serves — not against the development shell.

Command that produced it (run from the review environment against the built preview server on port 3210):

```bash
node /tmp/shotkit/shoot.mjs     # axe.run(document) + PerformanceObserver LCP/CLS + screenshots
```

## 3. Defects the browser pass found — and the fixes

| # | axe rule / symptom | Where | Fix |
|---|---|---|---|
| 1 | `color-contrast` — the step counter `#9aa0a8` on white = 2.9:1 (large text needs 3:1) | `.sl-step__number` | darkened to `#7d828b` (4.5:1) |
| 2 | `label-content-name-mismatch` — the brand link had `aria-label="NEXORA SalonOS home"` while its visible text was "NEXORA" | `SiteHeader.tsx`, `SiteFooter.tsx` | removed the redundant `aria-label`; the accessible name is now the visible text |
| 3 | `region` — the mobile action bar sat outside every landmark | `MobileActionBar.tsx` | changed to `<nav className="sl-mobile-bar" aria-label="Quick actions">` |
| 4 | `color-contrast` — the accent link button rendered black on `#cc1c1c` (3.75:1). Cause: `.sl-page a { color: inherit }` (0,1,1) outranks the single-class variant `.sl-btn--accent` (0,1,0) | `nexoraLanding.css` | restated the variant colours with matching specificity (`.sl-page a.sl-btn--accent`) → white on `#cc1c1c` = **5.6:1** |
| 5 | `color-contrast` — the "recommended" flag was white on `#ff2323` = 3.8:1 | `.sl-plan__flag` | background changed to the accessible `#cc1c1c` (5.6:1) |
| 6 | `color-contrast` — the neon creative poster used tinted white on `#ff2323` (2.8–3.0:1) | `.sl-creative__poster--neon` | background `#cc1c1c` and fully opaque copy → 5.6:1 |
| 7 | Horizontal overflow — the 760 px comparison matrix leaked into the root scroll width at ≤ 767 px (`document.documentElement.scrollWidth` 726 vs client 390) | `.sl-table-wrap` | added `contain: paint` to the scroll region, so the matrix stays inside its own scrollport; the page no longer scrolls sideways |

Defect 7 was also caught by a dedicated responsive sweep (`/pricing` at 320, 360, 375, 390, 411, 425, 480, 600, 767,
820, 921, 1024, 1280 and 1440 px): after the fix `scrollWidth === clientWidth` at **every** width and
`window.scrollTo(500, 0)` leaves `window.scrollX === 0`, i.e. there is no page-level horizontal scroll; the table
itself remains swipeable inside the labelled scroll region.

## 4. Improvements made in this change

* The demo dialog now announces the failure reason with `role="status"` instead of silently swallowing it, and the
  success state is only rendered after a confirmed `{ ok: true }`.
* The privacy notice is a real, reachable document, so the consent copy links to something the visitor can read.
* The manager view of the lead register uses a real table with scoped headers, labelled controls and a status
  region for feedback.
* The accent, primary, secondary and on-dark link buttons now share one specificity rule, so no link variant can
  silently fall back to inherited black text again.

## 5. Known accessibility risks carried over

| Risk | Detail | Mitigation |
|---|---|---|
| Sticky header on small screens | a sticky header plus the mobile action bar can cover the first row of a section on very short viewports | the scroll-padding on the anchor targets keeps the heading visible; verified by the anchor assertions |
| Comparison matrix on narrow screens | 65 feature rows × 4 plans cannot fit | the table is a horizontally scrollable region with `tabIndex={0}` and an accessible name; the font size is never reduced below the readable minimum |
| Testimonial section | no approved testimonial exists | the section states that no approved testimonial is published; no placeholder quote is rendered |

## 6. Still outstanding (needs a browser **and** a person)

* Keyboard walk-through of the header menu, the FAQ accordion, the plan selection and the demo dialog.
* Screen-reader pass (NVDA/VoiceOver) over the hero, the pricing cards and the form.
* Lighthouse accessibility score on the preview deployment (the local run measures LCP/CLS/FCP, not the Lighthouse
  category scores).

These are listed as **not performed** rather than as passes.
