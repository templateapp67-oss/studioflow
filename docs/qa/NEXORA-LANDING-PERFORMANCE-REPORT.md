# NEXORA SALONOS landing page — performance report

**Scope:** the public marketing routes (`/`, `/pricing`, `/salon-os`, `/privacy`) and the demo-request endpoint.

> **Scope note (updated).** A **headless Chromium 153.0.8010.0** run (puppeteer-core 25.16.0) *was* executed
> against the built preview server (`node dist/server.cjs`, port 3210) with the `PerformanceObserver` API for
> LCP/CLS and the navigation entry for FCP/DCL/load — see §5. **No Lighthouse run, no WebPageTest run and no
> real-device or throttled-profile measurement was performed**; those stay listed as outstanding in §7.

---

## 1. Build artefacts (measured)

| Artefact | Size | Note |
|---|---|---|
| `dist/pricing/index.html` | 264,286 B | prerendered document: full copy, plan cards, complete comparison matrix, 15 FAQ entries, JSON-LD |
| `dist/salon-os/index.html` | 105,668 B | companion route; the duplicated comparison matrix was consolidated onto `/pricing`, which removed ~150 KB of markup from this document |
| `dist/index.html` | 195,670 B | public homepage with the 16 prerendered template pages |
| `dist/privacy/index.html` | 5,559 B | privacy notice |
| `dist/assets` | 8.6 MB total | the owner/customer application bundles; **not** loaded by a public marketing route (see §3) |
| `public/fonts/poppins` | 68 KB | self-hosted Poppins (400/500/600/700/800 + latin-ext), served from the same origin |

## 2. What the public routes actually load

* The marketing routes are prerendered documents; the crawler's first response already contains the page copy.
* The only scripts a public route pulls are the shared entry chunk and the stylesheet. The owner application
  (`App-*.js`, 228 KB), the customer preview bundle (`SalonWebsitePreview-*.js`, 1.1 MB) and the SEO/preview
  helpers are separate lazy chunks that a visitor on `/pricing` never requests.
* Fonts are self-hosted and preloaded (`preload … as="font"` for Poppins 400 and 600) — no third-party font
  request, no render-blocking Google Fonts call.
* The landing pages contain **no raster imagery**: the product previews are drawn with CSS, so there is no LCP
  image request and no image decoding cost. There is consequently no `loading="lazy"` candidate to add — the
  statement is recorded so the absence is not mistaken for an oversight.
* Motion is implemented with CSS transitions that are disabled under `prefers-reduced-motion`.

## 3. Bundle separation

`src/AppRouter.tsx` keeps the public marketing routes outside the owner application:

```tsx
const PUBLIC_MARKETING_ROUTES = new Set(['/salon-os', '/pricing', '/privacy']);
const FullApplication = lazy(() => loadScreen(() => import('./App')…));
```

A visitor on `/pricing` therefore downloads the marketing code only; the owner workspace is fetched when an
authenticated owner route is entered.

## 4. Server-side cost of the demo request

| Step | Cost |
|---|---|
| Browser → `/api/nexora-demo-lead` | one JSON POST |
| Server → Edge Function | one POST with an 8 s abort (`server/nexoraDemoLead.ts`) |
| Edge Function → database | one insert + one rate-limit function call |
| Optional CRM forward | one POST, only after the lead is stored |

The rate-limit counter is shared in the database, so the endpoint does not depend on an in-memory store that
would reset between serverless instances. The browser aborts a hanging request after 15 s and reports it as a
failure, so a slow upstream cannot hold a visitor indefinitely.

## 5. Static performance assertions in the test suite

* `scripts/verify-nexora-pricing-landing.mjs` — the pricing document carries exactly one JSON-LD block per
  schema, the approved prices are present, and no duplicate copy of the price list is emitted.
* `scripts/verify-nexora-link-integrity.mjs` — 74 internal links and 79 anchors resolve, so no navigation
  depends on a request that cannot be served.
* `npm run build` — the production build completes without an error; the pre-existing "> 500 kB chunk" advisory
  concerns the owner application chunks, not the marketing routes.

## 5b. Measured field metrics (headless Chromium 153, local preview server)

Measured twice per page (a warm and a cold run); the table shows the **worst** value of the runs that were
recorded in `screenshots/axe-and-metrics.json`.

| Page | Viewport | FCP | LCP | CLS | DOM content loaded | load |
|---|---|---|---|---|---|---|
| `/pricing` | 1440×900 | 244 ms | **448 ms** | **0** | 160 ms | 168 ms |
| `/salon-os` | 1440×900 | 168 ms | **344 ms** | **0.006** | 108 ms | 115 ms |
| `/privacy` | 1440×900 | 100 ms | **132 ms** | **0** | 62 ms | 66 ms |
| `/pricing` | 390×844 | 168 ms | **348 ms** | **0** | 104 ms | 110 ms |
| `/salon-os` | 390×844 | 140 ms | **320 ms** | **0** | 92 ms | 97 ms |
| `/privacy` | 390×844 | 68 ms | **100 ms** | **0** | 56 ms | 60 ms |

Targets from the specification are LCP ≤ 2.5 s and CLS ≤ 0.1 — the measured worst case is **448 ms / 0.006**,
i.e. roughly 5.6× faster than the LCP budget and ~16× inside the CLS budget. The local run is **not** a
Lighthouse score and carries no network/CPU throttling, so it must not be presented as one.

The numbers above were measured against the **production build** (`NODE_ENV=production node dist/server.cjs`),
which serves the prerendered documents — the same bytes the deployment serves. A second run against the
development shell (client-rendered) measured LCP 320–964 ms and CLS ≤ 0.0012, i.e. the prerendered document is
also the faster path.

Why the numbers are what they are: the marketing documents are prerendered (the copy is in the first response),
the product previews are CSS drawings rather than images (no LCP image request), the fonts are self-hosted and
preloaded, and the owner/customer application bundles are lazy chunks that a public route never requests.

## 6. Outstanding measurements (require a browser or a deployed preview)

| Measurement | Target from the specification | Status |
|---|---|---|
| LCP (desktop + mobile, 3 routes) | ≤ 2.5 s | **measured** — worst case 448 ms (see §5b) |
| CLS (desktop + mobile, 3 routes) | ≤ 0.1 | **measured** — worst case 0.006 (see §5b) |
| INP | ≤ 200 ms | **not measured** — needs a throttled profile with interaction |
| Lighthouse (performance / accessibility / SEO) | — | **not measured** — the local run measures the raw metrics, not the category scores |
| Real-device throttling profile | — | **not measured** |

The next action is to run Lighthouse (mobile profile) against the preview deployment of `/pricing` and attach the
report to the pull request.
