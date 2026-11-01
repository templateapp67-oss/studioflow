# Step 3 — Complete frontend source files

Every new or changed text/source file for the Step 3 frontend is included in its own filename-headed code block. Binary source imagery and generated WebP/font assets remain at their paths in this project. Save paths relative to `veda-sanjeevani/`. `.env.local`, `node_modules/`, build output, and caches are intentionally omitted. `.env.example` retains the Step 2 server-functions template; `.env.frontend.example` is the public Vite template.

## `.env.example`

```text
# Copy to .env for local use. Never commit .env or expose service/provider keys in VITE_*.
# Local Supabase defaults: replace both keys with the values printed by `supabase status`.
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=replace-with-local-anon-key-at-least-20-characters
SUPABASE_SERVICE_ROLE_KEY=replace-with-different-local-service-key-at-least-20-characters

# Public browser origin, without a path. Use your real HTTPS origin in production.
SITE_URL=http://localhost:5173
ENVIRONMENT=development

# Optional until an AI/email feature is used. Keep model names configurable.
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
RESEND_API_KEY=
EMAIL_FROM=
OWNER_EMAIL=

# Required for request-review; optional for other functions. Generate at least 32 random characters.
# The same value must be stored as Vault secret cron_secret in Step 1.
CRON_SECRET=
```

## `.env.frontend.example`

```text
# Public browser configuration for this React/Vite website only.
# Copy to .env.local; never add service-role or provider secrets to VITE_ variables.
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
VITE_SITE_URL=http://localhost:5173
```

## `.gitignore`

```text
supabase/.temp/
supabase/.branches/
.env
.env.*
!.env.example
node_modules/
dist/
*.tsbuildinfo
playwright-report/
test-results/
.env.local
.env.*.local
```

## `README_FRONTEND.md`

````markdown
# Veda Sanjeevani — Step 3 frontend

A mobile-first public website built with React 18, Vite, strict TypeScript, Tailwind CSS, Framer Motion, React Router, TanStack Query, React Hook Form, Zod, Supabase JS, React Helmet Async and DOMPurify. Work in this directory; the repository root contains an unrelated StudioFlow application.

## Start locally

```bash
npm install
cp .env.frontend.example .env.local
# Set your Supabase project URL, public anon/publishable key, and public site URL.
npm run dev
```

Only a public Supabase anon/publishable key belongs in `VITE_SUPABASE_ANON_KEY`. The app checks configuration at startup and presents an actionable setup screen if values are absent, invalid, or look like a service-role secret. The sample `.env.local` used during verification points at a deliberately unavailable project; it is ignored by Git. Replace it with the values from your Supabase project before testing bookings. No service-role key is used by the browser.

The frontend reads `get_public_site()` and validates the full payload with Zod. It falls back to `src/data/site.config.json` on RPC failure, malformed data, or an unpublished site. The saved preview includes all twelve seed services and launch-ready educational copy; contact details, practitioner biographies, qualifications, photography, testimonials and journal copy are explicitly illustrative and must be verified/replaced by the business before publishing. In saved-preview mode, live calendar and booking controls never pretend to reserve a slot.

## Backend contract

| Browser action | Existing contract |
| --- | --- |
| Public content | `supabase.rpc('get_public_site')` |
| Available appointments | `supabase.rpc('get_available_slots', { p_service_id, p_staff_id, p_date })` |
| Anonymous dosha result | `supabase.rpc('save_quiz_result', { p_vata, p_pitta, p_kapha, p_result })` |
| Public booking | `POST /functions/v1/create-booking-public` with `service_id`, `staff_id`, `start_at`, `name`, normalized Indian `phone`, optional `email`, `notes`, and blank `website` honeypot |
| Public review | `supabase.rpc('submit_review', { p_token, p_rating, p_comment })` |
| Bookable days | Read-only `working_hours` RLS policy and per-day available-slot results. `blocked_dates` is not directly exposed to anon. |

Slot availability is always taken from the RPC. Open-day dates are prechecked over the visible week; days with no available slots are disabled. The server revalidates the slot during booking. `SLOT_TAKEN` invalidates cached slots and retains form values with a friendly message. Times are displayed in `Asia/Kolkata`. Booking requests remain pending until the studio confirms. Package buttons prefill an enquiry note, not a fictitious bundled appointment.

## Design, content and consent

- “Living Ayurveda” palette, five user-selectable theme presets, CSS custom-property overrides, paper grain, jharokha arch masks, botanical line art, mandala, responsive editorial layout and glass booking card.
- Cormorant Garamond, Manrope and Tiro Devanagari Hindi subsets are self-hosted in `public/fonts`; primary fonts are preloaded. `npm run assets` creates local WebP 400/800/1600 variants from the compact originals in `assets/source/`.
- Each website image uses descriptive alternative text, fixed dimensions, lazy loading (except the hero), `srcset` for generated variants and an on-error placeholder. Images are local and do not depend on third-party image hosts.
- Dosha quiz scoring is traditional/educational and never a diagnosis. Copy makes no disease treatment, cure, guarantee, or invented-certification claims. Service pages display the requested medical disclaimer.
- Blog markup is sanitized with DOMPurify. Optional analytics remain off; the consent event is an integration hook only and no analytics provider script is bundled.
- The seeded or demo material is labelled in the UI and privacy/terms pages. Obtain business approval and verified contacts, location, practitioner qualifications, cancellation policy, media permissions and guest-review consent before launch.

## Commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

`npm run build` creates responsive images, runs TypeScript project checks, compiles the Vite site, and writes `dist/sitemap.xml` and `dist/robots.txt`. `VITE_SITE_URL` supplies the canonical and sitemap origin. The sitemap contains configured service and article slugs and excludes admin/review routes. Client-side hosting should rewrite application paths (for example `/service/...`) to `index.html`.

Unit/component tests run under Vitest + jsdom. Optional Chromium smoke/a11y automation is `CHROMIUM_PATH=/path/to/chrome npm run test:browser`; it checks mobile/tablet/desktop overflow, fallback rendering, broken images, themes, mobile navigation, category filtering, lightbox, browser/console errors and axe WCAG 2.1 AA. Chromium must already be installed in the environment. The browser-binary download host was unreachable in the verification sandbox, and no system Chromium was installed; the browser automation and Lighthouse scores therefore remain unverified here. `lighthouse` is installed for a later browser-enabled audit.

## Step 3 acceptance checklist

- [x] React/Vite/strict TypeScript/Tailwind/Framer Motion/Router/Query/forms/Zod/Supabase stack
- [x] Eight homepage experience sections, twelve seed services and category filtering
- [x] Dosha scoring, balanced ties and recommended-service mapping
- [x] Public service, blog, review, privacy, terms, admin placeholder and not-found routes
- [x] Safe public-booking form, India-mobile validation, slots, pending confirmation and WhatsApp return path
- [x] Runtime-validated public content, saved-content fallback, image fallback and safe sanitized blog content
- [x] Five themes, local fonts, reduced-motion support, responsive/keyboard-operable controls
- [x] Consent-gated analytics hook, SEO metadata/structured data, sitemap and robots rules
- [x] Typecheck, lint, tests and production build
- [ ] Live Supabase/Auth/function/provider integration, hosted deployment and actual customer communications
- [ ] Chromium browser/a11y smoke suite, Lighthouse ≥90 scores and production screen-reader/device validation

**Verified in this sandbox:** `npm run typecheck`, `npm run lint`, `npm run test` (15 tests), and `npm run build`; native static preview HTTP responded with the Vite application shell. A browser rendering check was attempted but Chromium was unavailable, so do not treat HTTP shell delivery as browser-rendering, accessibility, or Lighthouse proof.
````

## `package.json`

```json
{
  "name": "veda-sanjeevani-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "typecheck": "tsc -b --pretty false",
    "lint": "eslint . --max-warnings 0",
    "test": "vitest run",
    "assets": "node scripts/prepare-assets.mjs",
    "build": "npm run assets && tsc -b && vite build && node scripts/generate-sitemap.mjs",
    "preview": "vite preview --host 0.0.0.0",
    "test:browser": "node scripts/browser-check.mjs"
  },
  "dependencies": {
    "@fontsource/cormorant-garamond": "^5.2.5",
    "@fontsource/manrope": "^5.2.5",
    "@fontsource/tiro-devanagari-hindi": "^5.2.5",
    "@hookform/resolvers": "^3.10.0",
    "@supabase/supabase-js": "2.57.4",
    "@tanstack/react-query": "^5.90.0",
    "dompurify": "^3.2.7",
    "framer-motion": "^12.23.24",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-helmet-async": "^2.0.5",
    "react-hook-form": "^7.65.0",
    "react-router-dom": "^6.30.1",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.14.0",
    "@eslint/js": "^9.38.0",
    "@playwright/test": "^1.56.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^22.18.0",
    "@types/react": "^18.3.26",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react": "^4.7.0",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.38.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.4.0",
    "jsdom": "^26.1.0",
    "lighthouse": "^13.6.0",
    "playwright-core": "^1.64.1",
    "postcss": "^8.5.6",
    "sharp": "^0.34.4",
    "tailwindcss": "^3.4.18",
    "typescript": "~5.8.3",
    "typescript-eslint": "^8.46.0",
    "vite": "^6.4.1",
    "vitest": "^3.2.4"
  }
}
```

## `package-lock.json`

```json
{
  "name": "veda-sanjeevani-frontend",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "veda-sanjeevani-frontend",
      "version": "1.0.0",
      "dependencies": {
        "@fontsource/cormorant-garamond": "^5.2.5",
        "@fontsource/manrope": "^5.2.5",
        "@fontsource/tiro-devanagari-hindi": "^5.2.5",
        "@hookform/resolvers": "^3.10.0",
        "@supabase/supabase-js": "2.57.4",
        "@tanstack/react-query": "^5.90.0",
        "dompurify": "^3.2.7",
        "framer-motion": "^12.23.24",
        "lucide-react": "^0.468.0",
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "react-helmet-async": "^2.0.5",
        "react-hook-form": "^7.65.0",
        "react-router-dom": "^6.30.1",
        "zod": "^3.25.76"
      },
      "devDependencies": {
        "@axe-core/playwright": "^4.14.0",
        "@eslint/js": "^9.38.0",
        "@playwright/test": "^1.56.1",
        "@testing-library/jest-dom": "^6.9.1",
        "@testing-library/react": "^16.3.0",
        "@testing-library/user-event": "^14.6.1",
        "@types/node": "^22.18.0",
        "@types/react": "^18.3.26",
        "@types/react-dom": "^18.3.7",
        "@vitejs/plugin-react": "^4.7.0",
        "autoprefixer": "^10.4.21",
        "eslint": "^9.38.0",
        "eslint-plugin-react-hooks": "^5.2.0",
        "eslint-plugin-react-refresh": "^0.4.24",
        "globals": "^16.4.0",
        "jsdom": "^26.1.0",
        "lighthouse": "^13.6.0",
        "playwright-core": "^1.64.1",
        "postcss": "^8.5.6",
        "sharp": "^0.34.4",
        "tailwindcss": "^3.4.18",
        "typescript": "~5.8.3",
        "typescript-eslint": "^8.46.0",
        "vite": "^6.4.1",
        "vitest": "^3.2.4"
      }
    },
    "node_modules/@adobe/css-tools": {
      "version": "4.5.0",
      "resolved": "https://registry.npmjs.org/@adobe/css-tools/-/css-tools-4.5.0.tgz",
      "integrity": "sha512-6OzddxPio9UiWTCemp4N8cYLV2ZN1ncRnV1cVGtve7dhPOtRkleRyx32GQCYSwDYgaHU3USMm84tNsvKzRCa1Q==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@alloc/quick-lru": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/@alloc/quick-lru/-/quick-lru-5.3.0.tgz",
      "integrity": "sha512-U4+70Pc5ZS9osnCBCE5Jha/ciHM+Yp+CNMNC/7HvYbNRk1Ldd+f7qO65W5qfhu/TCv+/ozljlXXe9Nj8419DMA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@asamuzakjp/css-color": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/@asamuzakjp/css-color/-/css-color-3.2.0.tgz",
      "integrity": "sha512-K1A6z8tS3XsmCMM86xoWdn7Fkdn9m6RSVtocUrJYIwZnFVkng/PvkEoWtOWmP+Scc6saYWHWZYbndEEXxl24jw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@csstools/css-calc": "^2.1.3",
        "@csstools/css-color-parser": "^3.0.9",
        "@csstools/css-parser-algorithms": "^3.0.4",
        "@csstools/css-tokenizer": "^3.0.3",
        "lru-cache": "^10.4.3"
      }
    },
    "node_modules/@asamuzakjp/css-color/node_modules/lru-cache": {
      "version": "10.4.3",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-10.4.3.tgz",
      "integrity": "sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/@axe-core/playwright": {
      "version": "4.14.0",
      "resolved": "https://registry.npmjs.org/@axe-core/playwright/-/playwright-4.14.0.tgz",
      "integrity": "sha512-SGUhG5PIHd2eMdpgBF2PyQLOhX+qyDR2PT4cmoS4Qk2ak+jX/rrSvst9l0PGv5WTHolKpUMvVmoHpr4cZgf1RQ==",
      "dev": true,
      "license": "MPL-2.0",
      "dependencies": {
        "axe-core": "~4.14.0"
      },
      "engines": {
        "node": ">=22.12.0"
      },
      "peerDependencies": {
        "playwright-core": ">= 1.0.0"
      }
    },
    "node_modules/@babel/code-frame": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.29.7.tgz",
      "integrity": "sha512-Aup7aUOfpbAUg2ROOJN6Iw5f9DMBlzu0mIkm/malLQFN/YQgO48wCj0Kxa3sEHJvPVFg7siR+qRInwXd2qhQKw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-validator-identifier": "^7.29.7",
        "js-tokens": "^4.0.0",
        "picocolors": "^1.1.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/compat-data": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/compat-data/-/compat-data-7.29.7.tgz",
      "integrity": "sha512-locTkQyKvwIEgBzVrn8693ebc97F2U8ZHjbXwDXJ5Fn2TCpNwTlKcaKLkdHop5c/icOFE7qt7Q9JC5hnKNa6Gg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/core": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/core/-/core-7.29.7.tgz",
      "integrity": "sha512-RgHBCvtjbOK2gXSNBNIkNoEc9qoVEtau3hj8gEqKQuL3HZAibKarWFEI3Lfm6EYKkLalOh8eSrj9b+ch9H/VBA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.7",
        "@babel/generator": "^7.29.7",
        "@babel/helper-compilation-targets": "^7.29.7",
        "@babel/helper-module-transforms": "^7.29.7",
        "@babel/helpers": "^7.29.7",
        "@babel/parser": "^7.29.7",
        "@babel/template": "^7.29.7",
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7",
        "@jridgewell/remapping": "^2.3.5",
        "convert-source-map": "^2.0.0",
        "debug": "^4.1.0",
        "gensync": "^1.0.0-beta.2",
        "json5": "^2.2.3",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/babel"
      }
    },
    "node_modules/@babel/generator": {
      "version": "7.29.12",
      "resolved": "https://registry.npmjs.org/@babel/generator/-/generator-7.29.12.tgz",
      "integrity": "sha512-2W76mhjrpQFO1lK5e8IvGYB2D0YZ7S2R1Z2BjO2ZUYuW+amcpK/z60U6ZZmzskwoa7sJ6XohP/Wg8H5KxXI/IA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.29.12",
        "@babel/types": "^7.29.11",
        "@jridgewell/gen-mapping": "^0.3.12",
        "@jridgewell/trace-mapping": "^0.3.28",
        "jsesc": "^3.0.2"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-compilation-targets/-/helper-compilation-targets-7.29.7.tgz",
      "integrity": "sha512-wem6WaBj4NaVYVdNhLPPVacES6ZJ+KBBfSkTMD3YZxbP3rm3Di85tJU5ljaUNhaOynt+Aj0xruhYuzQBt8n71g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/compat-data": "^7.29.7",
        "@babel/helper-validator-option": "^7.29.7",
        "browserslist": "^4.24.0",
        "lru-cache": "^5.1.1",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-globals": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-globals/-/helper-globals-7.29.7.tgz",
      "integrity": "sha512-3nQVUAtvkKH9zahfWgw96Jc/uFOmjACE1kQz82E2lqWmHBgjzbNlsC22nuQTfahmWeQtTq5nQ/4Nnd2A1wj4zA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-imports": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-imports/-/helper-module-imports-7.29.7.tgz",
      "integrity": "sha512-ejHwrQQYcm9xnTivShn2IDOlIzInN34AXskvq9QicvCtEzq1Vzclu/tKF8Jq1Cg8JG2GL6/EmjgsCT7lXepE3g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-transforms": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-transforms/-/helper-module-transforms-7.29.7.tgz",
      "integrity": "sha512-UPUVSyXbOh627KiCIGQSgwWzGeBKLkaJ9PJEdrngIwMSzxLR4jS4+f1f1jb7VzBbg8nFLaYotvVPFCTqdrmTAg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-imports": "^7.29.7",
        "@babel/helper-validator-identifier": "^7.29.7",
        "@babel/traverse": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-plugin-utils": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-plugin-utils/-/helper-plugin-utils-7.29.7.tgz",
      "integrity": "sha512-G7sHYigPY17oO5SYWnfD/0MTBwVR781S/JI643e/JhUYgVgWE/61SoW3NH9KWUKyKq5LVh3npif99Wkt6j86Jw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-string-parser": {
      "version": "7.29.11",
      "resolved": "https://registry.npmjs.org/@babel/helper-string-parser/-/helper-string-parser-7.29.11.tgz",
      "integrity": "sha512-snZbO7MEDOof+hvNa97EjEY7qD7h2kwvQr5AJC3ZhQudKW5dnej6k3kP9NQV88hJwaS8vDqRLFo9rivLEhle2g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-identifier": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-identifier/-/helper-validator-identifier-7.29.7.tgz",
      "integrity": "sha512-qehxGkRj55h/ff8EMaJ+cYhyaKlHIxqYDn682wQD7RNp9UujOQsHog2uS0r2vzr4pW+sXf90NeeayjcNaX3fFg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-option": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-option/-/helper-validator-option-7.29.7.tgz",
      "integrity": "sha512-N9ZErrD+yW5geCDtBqnOoxmR8+tNKiGuxKlDpuJxfsqpa2dFcexaziGAE/qoHLiDDreVNMupxGmSoNlyvsA3gw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helpers": {
      "version": "7.29.10",
      "resolved": "https://registry.npmjs.org/@babel/helpers/-/helpers-7.29.10.tgz",
      "integrity": "sha512-EMCx3AGZ3WfAl6ht7AyQoPm2Lh+BGYEMdc4Q6Hf7uSCDOZFuLq44qNwL+iaim8VlyYhRAo4X43+weadK8ZB4Yg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/template": "^7.29.7",
        "@babel/types": "^7.29.8"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/parser": {
      "version": "7.29.12",
      "resolved": "https://registry.npmjs.org/@babel/parser/-/parser-7.29.12.tgz",
      "integrity": "sha512-WJ7JBp/Q4+z/ImydtI7jS6NVco5++632ExBemSX+Ysb+G1lCwQ5BVo3SY+jGGOcZXI4ZccbZSUSJLNBW6eEpJg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.29.11"
      },
      "bin": {
        "parser": "bin/babel-parser.js"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-self": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-self/-/plugin-transform-react-jsx-self-7.29.7.tgz",
      "integrity": "sha512-TL0hMc9xzy86VD31nUiwzd5otRAcyEPcsegCxolO0PvcXuH1v0kECe/UIznYFihpkvU5wg/jk4v0TTEFfm53fw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-source": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-source/-/plugin-transform-react-jsx-source-7.29.7.tgz",
      "integrity": "sha512-06IyK09H3wi4cGbhDBwp5gUGo0IKtnYa8tyTiephirPCK6fbobVGiXMMI5zLQ4aKEYP3wZ3ArU44o+8KMrSG/Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/runtime": {
      "version": "7.29.10",
      "resolved": "https://registry.npmjs.org/@babel/runtime/-/runtime-7.29.10.tgz",
      "integrity": "sha512-NpugTzbKgGrNe45Ui32cN8vCFFMxVtP/9rtfwv0nP5FRDAjvYBxJcLVpYA9mr1jxP6cnIT7x9LUzuDTbWYYNRA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/template": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/template/-/template-7.29.7.tgz",
      "integrity": "sha512-puq+Gf35oI24FeN11LkoUQFqv9uwNeWpxXZi/Ji3rRIoKAzKnxRaZ+Gkj0vKS9ZCiTESfng1N9LyOyXvo+m+Gg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.7",
        "@babel/parser": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/traverse": {
      "version": "7.29.12",
      "resolved": "https://registry.npmjs.org/@babel/traverse/-/traverse-7.29.12.tgz",
      "integrity": "sha512-MscXe/NAZcOkYEsRajHZFt3ynsb22PUi6CTrp5U7+RYycR9By84mn9mFN54YgfITiqK4hFx3Ju3tZSyzfpS5ew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.7",
        "@babel/generator": "^7.29.12",
        "@babel/helper-globals": "^7.29.7",
        "@babel/parser": "^7.29.12",
        "@babel/template": "^7.29.7",
        "@babel/types": "^7.29.11",
        "debug": "^4.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/types": {
      "version": "7.29.11",
      "resolved": "https://registry.npmjs.org/@babel/types/-/types-7.29.11.tgz",
      "integrity": "sha512-WCsemW40Cpc6gouC1SrY6PBaZ+oLRlEVY9XBvZBI7il/HyUrb2nJ505wE1MHEFyDZNnrWDEuy4jL50WVHfTTSQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-string-parser": "^7.29.11",
        "@babel/helper-validator-identifier": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@csstools/color-helpers": {
      "version": "5.1.0",
      "resolved": "https://registry.npmjs.org/@csstools/color-helpers/-/color-helpers-5.1.0.tgz",
      "integrity": "sha512-S11EXWJyy0Mz5SYvRmY8nJYTFFd1LCNV+7cXyAgQtOOuzb4EsgfqDufL+9esx72/eLhsRdGZwaldu/h+E4t4BA==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/csstools"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/csstools"
        }
      ],
      "license": "MIT-0",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@csstools/css-calc": {
      "version": "2.1.4",
      "resolved": "https://registry.npmjs.org/@csstools/css-calc/-/css-calc-2.1.4.tgz",
      "integrity": "sha512-3N8oaj+0juUw/1H3YwmDDJXCgTB1gKU6Hc/bB502u9zR0q2vd786XJH9QfrKIEgFlZmhZiq6epXl4rHqhzsIgQ==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/csstools"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/csstools"
        }
      ],
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "peerDependencies": {
        "@csstools/css-parser-algorithms": "^3.0.5",
        "@csstools/css-tokenizer": "^3.0.4"
      }
    },
    "node_modules/@csstools/css-color-parser": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/@csstools/css-color-parser/-/css-color-parser-3.1.0.tgz",
      "integrity": "sha512-nbtKwh3a6xNVIp/VRuXV64yTKnb1IjTAEEh3irzS+HkKjAOYLTGNb9pmVNntZ8iVBHcWDA2Dof0QtPgFI1BaTA==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/csstools"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/csstools"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "@csstools/color-helpers": "^5.1.0",
        "@csstools/css-calc": "^2.1.4"
      },
      "engines": {
        "node": ">=18"
      },
      "peerDependencies": {
        "@csstools/css-parser-algorithms": "^3.0.5",
        "@csstools/css-tokenizer": "^3.0.4"
      }
    },
    "node_modules/@csstools/css-parser-algorithms": {
      "version": "3.0.5",
      "resolved": "https://registry.npmjs.org/@csstools/css-parser-algorithms/-/css-parser-algorithms-3.0.5.tgz",
      "integrity": "sha512-DaDeUkXZKjdGhgYaHNJTV9pV7Y9B3b644jCLs9Upc3VeNGg6LWARAT6O+Q+/COo+2gg/bM5rhpMAtf70WqfBdQ==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/csstools"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/csstools"
        }
      ],
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "peerDependencies": {
        "@csstools/css-tokenizer": "^3.0.4"
      }
    },
    "node_modules/@csstools/css-tokenizer": {
      "version": "3.0.4",
      "resolved": "https://registry.npmjs.org/@csstools/css-tokenizer/-/css-tokenizer-3.0.4.tgz",
      "integrity": "sha512-Vd/9EVDiu6PPJt9yAh6roZP6El1xHrdvIVGjyBsHR0RYwNHgL7FJPyIIW4fANJNG6FtyZfvlRPpFI4ZM/lubvw==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/csstools"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/csstools"
        }
      ],
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@emnapi/runtime": {
      "version": "1.11.3",
      "resolved": "https://registry.npmjs.org/@emnapi/runtime/-/runtime-1.11.3.tgz",
      "integrity": "sha512-Xz4Tpyki7XyrpbUK1jR1AhdAdaXyhhY4lZ3neLodmhpuWfy2PAQN5B46sAiU4liOXGLkHypn/qU+jvfWSCYYLA==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "tslib": "^2.4.0"
      }
    },
    "node_modules/@esbuild/aix-ppc64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/aix-ppc64/-/aix-ppc64-0.25.12.tgz",
      "integrity": "sha512-Hhmwd6CInZ3dwpuGTF8fJG6yoWmsToE+vYgD4nytZVxcu1ulHpUQRAB1UJ8+N1Am3Mz4+xOByoQoSZf4D+CpkA==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "aix"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm/-/android-arm-0.25.12.tgz",
      "integrity": "sha512-VJ+sKvNA/GE7Ccacc9Cha7bpS8nyzVv0jdVgwNDaR4gDMC/2TTRc33Ip8qrNYUcpkOHUT5OZ0bUcNNVZQ9RLlg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm64/-/android-arm64-0.25.12.tgz",
      "integrity": "sha512-6AAmLG7zwD1Z159jCKPvAxZd4y/VTO0VkprYy+3N2FtJ8+BQWFXU+OxARIwA46c5tdD9SsKGZ/1ocqBS/gAKHg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/android-x64/-/android-x64-0.25.12.tgz",
      "integrity": "sha512-5jbb+2hhDHx5phYR2By8GTWEzn6I9UqR11Kwf22iKbNpYrsmRB18aX/9ivc5cabcUiAT/wM+YIZ6SG9QO6a8kg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.25.12.tgz",
      "integrity": "sha512-N3zl+lxHCifgIlcMUP5016ESkeQjLj/959RxxNYIthIg+CQHInujFuXeWbWMgnTo4cp5XVHqFPmpyu9J65C1Yg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-x64/-/darwin-x64-0.25.12.tgz",
      "integrity": "sha512-HQ9ka4Kx21qHXwtlTUVbKJOAnmG1ipXhdWTmNXiPzPfWKpXqASVcWdnf2bnL73wgjNrFXAa3yYvBSd9pzfEIpA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-arm64/-/freebsd-arm64-0.25.12.tgz",
      "integrity": "sha512-gA0Bx759+7Jve03K1S0vkOu5Lg/85dou3EseOGUes8flVOGxbhDDh/iZaoek11Y8mtyKPGF3vP8XhnkDEAmzeg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-x64/-/freebsd-x64-0.25.12.tgz",
      "integrity": "sha512-TGbO26Yw2xsHzxtbVFGEXBFH0FRAP7gtcPE7P5yP7wGy7cXK2oO7RyOhL5NLiqTlBh47XhmIUXuGciXEqYFfBQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm/-/linux-arm-0.25.12.tgz",
      "integrity": "sha512-lPDGyC1JPDou8kGcywY0YILzWlhhnRjdof3UlcoqYmS9El818LLfJJc3PXXgZHrHCAKs/Z2SeZtDJr5MrkxtOw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-0.25.12.tgz",
      "integrity": "sha512-8bwX7a8FghIgrupcxb4aUmYDLp8pX06rGh5HqDT7bB+8Rdells6mHvrFHHW2JAOPZUbnjUpKTLg6ECyzvas2AQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ia32": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ia32/-/linux-ia32-0.25.12.tgz",
      "integrity": "sha512-0y9KrdVnbMM2/vG8KfU0byhUN+EFCny9+8g202gYqSSVMonbsCfLjUO+rCci7pM0WBEtz+oK/PIwHkzxkyharA==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-loong64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-loong64/-/linux-loong64-0.25.12.tgz",
      "integrity": "sha512-h///Lr5a9rib/v1GGqXVGzjL4TMvVTv+s1DPoxQdz7l/AYv6LDSxdIwzxkrPW438oUXiDtwM10o9PmwS/6Z0Ng==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-mips64el": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-mips64el/-/linux-mips64el-0.25.12.tgz",
      "integrity": "sha512-iyRrM1Pzy9GFMDLsXn1iHUm18nhKnNMWscjmp4+hpafcZjrr2WbT//d20xaGljXDBYHqRcl8HnxbX6uaA/eGVw==",
      "cpu": [
        "mips64el"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ppc64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ppc64/-/linux-ppc64-0.25.12.tgz",
      "integrity": "sha512-9meM/lRXxMi5PSUqEXRCtVjEZBGwB7P/D4yT8UG/mwIdze2aV4Vo6U5gD3+RsoHXKkHCfSxZKzmDssVlRj1QQA==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-riscv64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-riscv64/-/linux-riscv64-0.25.12.tgz",
      "integrity": "sha512-Zr7KR4hgKUpWAwb1f3o5ygT04MzqVrGEGXGLnj15YQDJErYu/BGg+wmFlIDOdJp0PmB0lLvxFIOXZgFRrdjR0w==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-s390x": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-s390x/-/linux-s390x-0.25.12.tgz",
      "integrity": "sha512-MsKncOcgTNvdtiISc/jZs/Zf8d0cl/t3gYWX8J9ubBnVOwlk65UIEEvgBORTiljloIWnBzLs4qhzPkJcitIzIg==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.25.12.tgz",
      "integrity": "sha512-uqZMTLr/zR/ed4jIGnwSLkaHmPjOjJvnm6TVVitAa08SLS9Z0VM8wIRx7gWbJB5/J54YuIMInDquWyYvQLZkgw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-arm64/-/netbsd-arm64-0.25.12.tgz",
      "integrity": "sha512-xXwcTq4GhRM7J9A8Gv5boanHhRa/Q9KLVmcyXHCTaM4wKfIpWkdXiMog/KsnxzJ0A1+nD+zoecuzqPmCRyBGjg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.25.12.tgz",
      "integrity": "sha512-Ld5pTlzPy3YwGec4OuHh1aCVCRvOXdH8DgRjfDy/oumVovmuSzWfnSJg+VtakB9Cm0gxNO9BzWkj6mtO1FMXkQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-arm64/-/openbsd-arm64-0.25.12.tgz",
      "integrity": "sha512-fF96T6KsBo/pkQI950FARU9apGNTSlZGsv1jZBAlcLL1MLjLNIWPBkj5NlSz8aAzYKg+eNqknrUJ24QBybeR5A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.25.12.tgz",
      "integrity": "sha512-MZyXUkZHjQxUvzK7rN8DJ3SRmrVrke8ZyRusHlP+kuwqTcfWLyqMOE3sScPPyeIXN/mDJIfGXvcMqCgYKekoQw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openharmony-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/openharmony-arm64/-/openharmony-arm64-0.25.12.tgz",
      "integrity": "sha512-rm0YWsqUSRrjncSXGA7Zv78Nbnw4XL6/dzr20cyrQf7ZmRcsovpcRBdhD43Nuk3y7XIoW2OxMVvwuRvk9XdASg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/sunos-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.25.12.tgz",
      "integrity": "sha512-3wGSCDyuTHQUzt0nV7bocDy72r2lI33QL3gkDNGkod22EsYl04sMf0qLb8luNKTOmgF/eDEDP5BFNwoBKH441w==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "sunos"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-arm64/-/win32-arm64-0.25.12.tgz",
      "integrity": "sha512-rMmLrur64A7+DKlnSuwqUdRKyd3UE7oPJZmnljqEptesKM8wx9J8gx5u0+9Pq0fQQW8vqeKebwNXdfOyP+8Bsg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-ia32": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-ia32/-/win32-ia32-0.25.12.tgz",
      "integrity": "sha512-HkqnmmBoCbCwxUKKNPBixiWDGCpQGVsrQfJoVGYLPT41XWF8lHuE5N6WhVia2n4o5QK5M4tYr21827fNhi4byQ==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.25.12.tgz",
      "integrity": "sha512-alJC0uCZpTFrSL0CCDjcgleBXPnCrEAhTBILpeAp7M/OFgoqtAetfBzX0xM00MUsVVPpVjlPuMbREqnZCXaTnA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@eslint-community/eslint-utils": {
      "version": "4.10.1",
      "resolved": "https://registry.npmjs.org/@eslint-community/eslint-utils/-/eslint-utils-4.10.1.tgz",
      "integrity": "sha512-cuadcxVFE8sDK6iWJbs8Sn0av2Nrh2QSGQhVlBW9AaAHqHwjWsZHT8LJ4hFGPh7ASBV2deFdM7H/DPjulmh8rg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "eslint-visitor-keys": "^3.4.3"
      },
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      },
      "peerDependencies": {
        "eslint": "^6.0.0 || ^7.0.0 || >=8.0.0"
      }
    },
    "node_modules/@eslint-community/eslint-utils/node_modules/eslint-visitor-keys": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-3.4.3.tgz",
      "integrity": "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint-community/regexpp": {
      "version": "4.12.2",
      "resolved": "https://registry.npmjs.org/@eslint-community/regexpp/-/regexpp-4.12.2.tgz",
      "integrity": "sha512-EriSTlt5OC9/7SXkRSCAhfSxxoSUgBm33OH+IkwbdpgoqsSsUg7y3uh+IICI/Qg4BBWr3U2i39RpmycbxMq4ew==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^12.0.0 || ^14.0.0 || >=16.0.0"
      }
    },
    "node_modules/@eslint/config-array": {
      "version": "0.21.2",
      "resolved": "https://registry.npmjs.org/@eslint/config-array/-/config-array-0.21.2.tgz",
      "integrity": "sha512-nJl2KGTlrf9GjLimgIru+V/mzgSK0ABCDQRvxw5BjURL7WfH5uoWmizbH7QB6MmnMBd8cIC9uceWnezL1VZWWw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/object-schema": "^2.1.7",
        "debug": "^4.3.1",
        "minimatch": "^3.1.5"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/config-helpers": {
      "version": "0.4.2",
      "resolved": "https://registry.npmjs.org/@eslint/config-helpers/-/config-helpers-0.4.2.tgz",
      "integrity": "sha512-gBrxN88gOIf3R7ja5K9slwNayVcZgK6SOUORm2uBzTeIEfeVaIhOpCtTox3P6R7o2jLFwLFTLnC7kU/RGcYEgw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^0.17.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/core": {
      "version": "0.17.0",
      "resolved": "https://registry.npmjs.org/@eslint/core/-/core-0.17.0.tgz",
      "integrity": "sha512-yL/sLrpmtDaFEiUj1osRP4TI2MDz1AddJL+jZ7KSqvBuliN4xqYY54IfdN8qD8Toa6g1iloph1fxQNkjOxrrpQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@types/json-schema": "^7.0.15"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/eslintrc": {
      "version": "3.3.7",
      "resolved": "https://registry.npmjs.org/@eslint/eslintrc/-/eslintrc-3.3.7.tgz",
      "integrity": "sha512-F42g89Qd5oAWtp0k0nnSrjziAKza7w8SVT4mStc18LZMaRb4J1HQAHLCalEtDCxrTuksx7NU9qsmeLwpOfPqWw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ajv": "^6.14.0",
        "debug": "^4.3.2",
        "espree": "^10.0.1",
        "globals": "^14.0.0",
        "ignore": "^5.2.0",
        "import-fresh": "^3.2.1",
        "js-yaml": "^4.3.2",
        "minimatch": "^3.1.5",
        "strip-json-comments": "^3.1.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint/eslintrc/node_modules/globals": {
      "version": "14.0.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-14.0.0.tgz",
      "integrity": "sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@eslint/js": {
      "version": "9.39.5",
      "resolved": "https://registry.npmjs.org/@eslint/js/-/js-9.39.5.tgz",
      "integrity": "sha512-QywQuszQh77pIXCsq998c8hbhSTI/azTty1Z6N53dmAudKHhy573j3yvRLsX2BSp8YpLtoCEG8E9DJe+8zUh4A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      }
    },
    "node_modules/@eslint/object-schema": {
      "version": "2.1.7",
      "resolved": "https://registry.npmjs.org/@eslint/object-schema/-/object-schema-2.1.7.tgz",
      "integrity": "sha512-VtAOaymWVfZcmZbp6E2mympDIHvyjXs/12LqWYjVw6qjrfF+VK+fyG33kChz3nnK+SU5/NeHOqrTEHS8sXO3OA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/plugin-kit": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/@eslint/plugin-kit/-/plugin-kit-0.4.1.tgz",
      "integrity": "sha512-43/qtrDUokr7LJqoF2c3+RInu/t4zfrpYdoSDfYyhg52rwLV6TnOvdG4fXm7IkSB3wErkcmJS9iEhjVtOSEjjA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^0.17.0",
        "levn": "^0.4.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@fontsource/cormorant-garamond": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/@fontsource/cormorant-garamond/-/cormorant-garamond-5.3.0.tgz",
      "integrity": "sha512-weuGsCirGVWBWqpt6YUp0yLThTe4G8YO45noq8wxeJCRvEpq5lFrxNMFSTxcyOyV5k5otzJ8guDzYegdYlcLMQ==",
      "license": "OFL-1.1",
      "funding": {
        "url": "https://github.com/sponsors/ayuhito"
      }
    },
    "node_modules/@fontsource/manrope": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/@fontsource/manrope/-/manrope-5.3.0.tgz",
      "integrity": "sha512-obJ1Dv3+uCA6HlHgW8u4BGYxJR9In2HW7gjJhlflEvkrj1X1iSEwu0fToL+JYGC/FEKFfIz1sBuPduvcL2gIAA==",
      "license": "OFL-1.1",
      "funding": {
        "url": "https://github.com/sponsors/ayuhito"
      }
    },
    "node_modules/@fontsource/tiro-devanagari-hindi": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/@fontsource/tiro-devanagari-hindi/-/tiro-devanagari-hindi-5.3.0.tgz",
      "integrity": "sha512-nlREPH/UItPmrRg2RY4O/oQNBtbwAzKyHk3ZexW1b75p8YrjmhdiPWOg9rm6dyM5v8FnIR392BG3Fdhu3+wTkg==",
      "license": "OFL-1.1",
      "funding": {
        "url": "https://github.com/sponsors/ayuhito"
      }
    },
    "node_modules/@formatjs/ecma402-abstract": {
      "version": "2.3.6",
      "resolved": "https://registry.npmjs.org/@formatjs/ecma402-abstract/-/ecma402-abstract-2.3.6.tgz",
      "integrity": "sha512-HJnTFeRM2kVFVr5gr5kH1XP6K0JcJtE7Lzvtr3FS/so5f1kpsqqqxy5JF+FRaO6H2qmcMfAUIox7AJteieRtVw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@formatjs/fast-memoize": "2.2.7",
        "@formatjs/intl-localematcher": "0.6.2",
        "decimal.js": "^10.4.3",
        "tslib": "^2.8.0"
      }
    },
    "node_modules/@formatjs/fast-memoize": {
      "version": "2.2.7",
      "resolved": "https://registry.npmjs.org/@formatjs/fast-memoize/-/fast-memoize-2.2.7.tgz",
      "integrity": "sha512-Yabmi9nSvyOMrlSeGGWDiH7rf3a7sIwplbvo/dlz9WCIjzIQAfy1RMf4S0X3yG724n5Ghu2GmEl5NJIV6O9sZQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "tslib": "^2.8.0"
      }
    },
    "node_modules/@formatjs/icu-messageformat-parser": {
      "version": "2.11.4",
      "resolved": "https://registry.npmjs.org/@formatjs/icu-messageformat-parser/-/icu-messageformat-parser-2.11.4.tgz",
      "integrity": "sha512-7kR78cRrPNB4fjGFZg3Rmj5aah8rQj9KPzuLsmcSn4ipLXQvC04keycTI1F7kJYDwIXtT2+7IDEto842CfZBtw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@formatjs/ecma402-abstract": "2.3.6",
        "@formatjs/icu-skeleton-parser": "1.8.16",
        "tslib": "^2.8.0"
      }
    },
    "node_modules/@formatjs/icu-skeleton-parser": {
      "version": "1.8.16",
      "resolved": "https://registry.npmjs.org/@formatjs/icu-skeleton-parser/-/icu-skeleton-parser-1.8.16.tgz",
      "integrity": "sha512-H13E9Xl+PxBd8D5/6TVUluSpxGNvFSlN/b3coUp0e0JpuWXXnQDiavIpY3NnvSp4xhEMoXyyBvVfdFX8jglOHQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@formatjs/ecma402-abstract": "2.3.6",
        "tslib": "^2.8.0"
      }
    },
    "node_modules/@formatjs/intl-localematcher": {
      "version": "0.6.2",
      "resolved": "https://registry.npmjs.org/@formatjs/intl-localematcher/-/intl-localematcher-0.6.2.tgz",
      "integrity": "sha512-XOMO2Hupl0wdd172Y06h6kLpBz6Dv+J4okPLl4LPtzbr8f66WbIoy4ev98EBuZ6ZK4h5ydTN6XneT4QVpD7cdA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "tslib": "^2.8.0"
      }
    },
    "node_modules/@hookform/resolvers": {
      "version": "3.10.0",
      "resolved": "https://registry.npmjs.org/@hookform/resolvers/-/resolvers-3.10.0.tgz",
      "integrity": "sha512-79Dv+3mDF7i+2ajj7SkypSKHhl1cbln1OGavqrsF7p6mbUv11xpqpacPsGDCTRvCSjEEIez2ef1NveSVL3b0Ag==",
      "license": "MIT",
      "peerDependencies": {
        "react-hook-form": "^7.0.0"
      }
    },
    "node_modules/@humanfs/core": {
      "version": "0.19.2",
      "resolved": "https://registry.npmjs.org/@humanfs/core/-/core-0.19.2.tgz",
      "integrity": "sha512-UhXNm+CFMWcbChXywFwkmhqjs3PRCmcSa/hfBgLIb7oQ5HNb1wS0icWsGtSAUNgefHeI+eBrA8I1fxmbHsGdvA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@humanfs/types": "^0.15.0"
      },
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/node": {
      "version": "0.16.8",
      "resolved": "https://registry.npmjs.org/@humanfs/node/-/node-0.16.8.tgz",
      "integrity": "sha512-gE1eQNZ3R++kTzFUpdGlpmy8kDZD/MLyHqDwqjkVQI0JMdI1D51sy1H958PNXYkM2rAac7e5/CnIKZrHtPh3BQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@humanfs/core": "^0.19.2",
        "@humanfs/types": "^0.15.0",
        "@humanwhocodes/retry": "^0.4.0"
      },
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/types": {
      "version": "0.15.0",
      "resolved": "https://registry.npmjs.org/@humanfs/types/-/types-0.15.0.tgz",
      "integrity": "sha512-ZZ1w0aoQkwuUuC7Yf+7sdeaNfqQiiLcSRbfI08oAxqLtpXQr9AIVX7Ay7HLDuiLYAaFPu8oBYNq/QIi9URHJ3Q==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanwhocodes/module-importer": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/module-importer/-/module-importer-1.0.1.tgz",
      "integrity": "sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=12.22"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@humanwhocodes/retry": {
      "version": "0.4.3",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/retry/-/retry-0.4.3.tgz",
      "integrity": "sha512-bV0Tgo9K4hfPCek+aMAn81RppFKv2ySDQeMoSZuvTASywNTnVJCArCZE2FWqpvIatKu7VMRLWlR1EazvVhDyhQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@img/colour": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@img/colour/-/colour-1.1.0.tgz",
      "integrity": "sha512-Td76q7j57o/tLVdgS746cYARfSyxk8iEfRxewL9h4OMzYhbW4TAcppl0mT4eyqXddh6L/jwoM75mo7ixa/pCeQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@img/sharp-darwin-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-darwin-arm64/-/sharp-darwin-arm64-0.34.5.tgz",
      "integrity": "sha512-imtQ3WMJXbMY4fxb/Ndp6HBTNVtWCUI0WdobyheGf5+ad6xX8VIDO8u2xE4qc/fr08CKG/7dDseFtn6M6g/r3w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-darwin-arm64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-darwin-x64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-darwin-x64/-/sharp-darwin-x64-0.34.5.tgz",
      "integrity": "sha512-YNEFAF/4KQ/PeW0N+r+aVVsoIY0/qxxikF2SWdp+NRkmMB7y9LBZAVqQ4yhGCm/H3H270OSykqmQMKLBhBJDEw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-darwin-x64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-libvips-darwin-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-darwin-arm64/-/sharp-libvips-darwin-arm64-1.2.4.tgz",
      "integrity": "sha512-zqjjo7RatFfFoP0MkQ51jfuFZBnVE2pRiaydKJ1G/rHZvnsrHAOcQALIi9sA5co5xenQdTugCvtb1cuf78Vf4g==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "darwin"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-darwin-x64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-darwin-x64/-/sharp-libvips-darwin-x64-1.2.4.tgz",
      "integrity": "sha512-1IOd5xfVhlGwX+zXv2N93k0yMONvUlANylbJw1eTah8K/Jtpi15KC+WSiaX/nBmbm2HxRM1gZ0nSdjSsrZbGKg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "darwin"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-arm": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-arm/-/sharp-libvips-linux-arm-1.2.4.tgz",
      "integrity": "sha512-bFI7xcKFELdiNCVov8e44Ia4u2byA+l3XtsAj+Q8tfCwO6BQ8iDojYdvoPMqsKDkuoOo+X6HZA0s0q11ANMQ8A==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-arm64/-/sharp-libvips-linux-arm64-1.2.4.tgz",
      "integrity": "sha512-excjX8DfsIcJ10x1Kzr4RcWe1edC9PquDRRPx3YVCvQv+U5p7Yin2s32ftzikXojb1PIFc/9Mt28/y+iRklkrw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-ppc64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-ppc64/-/sharp-libvips-linux-ppc64-1.2.4.tgz",
      "integrity": "sha512-FMuvGijLDYG6lW+b/UvyilUWu5Ayu+3r2d1S8notiGCIyYU/76eig1UfMmkZ7vwgOrzKzlQbFSuQfgm7GYUPpA==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-riscv64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-riscv64/-/sharp-libvips-linux-riscv64-1.2.4.tgz",
      "integrity": "sha512-oVDbcR4zUC0ce82teubSm+x6ETixtKZBh/qbREIOcI3cULzDyb18Sr/Wcyx7NRQeQzOiHTNbZFF1UwPS2scyGA==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-s390x": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-s390x/-/sharp-libvips-linux-s390x-1.2.4.tgz",
      "integrity": "sha512-qmp9VrzgPgMoGZyPvrQHqk02uyjA0/QrTO26Tqk6l4ZV0MPWIW6LTkqOIov+J1yEu7MbFQaDpwdwJKhbJvuRxQ==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-x64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-x64/-/sharp-libvips-linux-x64-1.2.4.tgz",
      "integrity": "sha512-tJxiiLsmHc9Ax1bz3oaOYBURTXGIRDODBqhveVHonrHJ9/+k89qbLl0bcJns+e4t4rvaNBxaEZsFtSfAdquPrw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linuxmusl-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-arm64/-/sharp-libvips-linuxmusl-arm64-1.2.4.tgz",
      "integrity": "sha512-FVQHuwx1IIuNow9QAbYUzJ+En8KcVm9Lk5+uGUQJHaZmMECZmOlix9HnH7n1TRkXMS0pGxIJokIVB9SuqZGGXw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linuxmusl-x64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-x64/-/sharp-libvips-linuxmusl-x64-1.2.4.tgz",
      "integrity": "sha512-+LpyBk7L44ZIXwz/VYfglaX/okxezESc6UxDSoyo2Ks6Jxc4Y7sGjpgU9s4PMgqgjj1gZCylTieNamqA1MF7Dg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-linux-arm": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-arm/-/sharp-linux-arm-0.34.5.tgz",
      "integrity": "sha512-9dLqsvwtg1uuXBGZKsxem9595+ujv0sJ6Vi8wcTANSFpwV/GONat5eCkzQo/1O6zRIkh0m/8+5BjrRr7jDUSZw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-arm": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-arm64/-/sharp-linux-arm64-0.34.5.tgz",
      "integrity": "sha512-bKQzaJRY/bkPOXyKx5EVup7qkaojECG6NLYswgktOZjaXecSAeCWiZwwiFf3/Y+O1HrauiE3FVsGxFg8c24rZg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-arm64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-ppc64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-ppc64/-/sharp-linux-ppc64-0.34.5.tgz",
      "integrity": "sha512-7zznwNaqW6YtsfrGGDA6BRkISKAAE1Jo0QdpNYXNMHu2+0dTrPflTLNkpc8l7MUP5M16ZJcUvysVWWrMefZquA==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-ppc64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-riscv64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-riscv64/-/sharp-linux-riscv64-0.34.5.tgz",
      "integrity": "sha512-51gJuLPTKa7piYPaVs8GmByo7/U7/7TZOq+cnXJIHZKavIRHAP77e3N2HEl3dgiqdD/w0yUfiJnII77PuDDFdw==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-riscv64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-s390x": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-s390x/-/sharp-linux-s390x-0.34.5.tgz",
      "integrity": "sha512-nQtCk0PdKfho3eC5MrbQoigJ2gd1CgddUMkabUj+rBevs8tZ2cULOx46E7oyX+04WGfABgIwmMC0VqieTiR4jg==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-s390x": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-x64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-x64/-/sharp-linux-x64-0.34.5.tgz",
      "integrity": "sha512-MEzd8HPKxVxVenwAa+JRPwEC7QFjoPWuS5NZnBt6B3pu7EG2Ge0id1oLHZpPJdn3OQK+BQDiw9zStiHBTJQQQQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-x64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linuxmusl-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linuxmusl-arm64/-/sharp-linuxmusl-arm64-0.34.5.tgz",
      "integrity": "sha512-fprJR6GtRsMt6Kyfq44IsChVZeGN97gTD331weR1ex1c1rypDEABN6Tm2xa1wE6lYb5DdEnk03NZPqA7Id21yg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linuxmusl-arm64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linuxmusl-x64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linuxmusl-x64/-/sharp-linuxmusl-x64-0.34.5.tgz",
      "integrity": "sha512-Jg8wNT1MUzIvhBFxViqrEhWDGzqymo3sV7z7ZsaWbZNDLXRJZoRGrjulp60YYtV4wfY8VIKcWidjojlLcWrd8Q==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linuxmusl-x64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-wasm32": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-wasm32/-/sharp-wasm32-0.34.5.tgz",
      "integrity": "sha512-OdWTEiVkY2PHwqkbBI8frFxQQFekHaSSkUIJkwzclWZe64O1X4UlUjqqqLaPbUpMOQk6FBu/HtlGXNblIs0huw==",
      "cpu": [
        "wasm32"
      ],
      "dev": true,
      "license": "Apache-2.0 AND LGPL-3.0-or-later AND MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/runtime": "^1.7.0"
      },
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-win32-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-arm64/-/sharp-win32-arm64-0.34.5.tgz",
      "integrity": "sha512-WQ3AgWCWYSb2yt+IG8mnC6Jdk9Whs7O0gxphblsLvdhSpSTtmu69ZG1Gkb6NuvxsNACwiPV6cNSZNzt0KPsw7g==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-win32-ia32": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-ia32/-/sharp-win32-ia32-0.34.5.tgz",
      "integrity": "sha512-FV9m/7NmeCmSHDD5j4+4pNI8Cp3aW+JvLoXcTUo0IqyjSfAZJ8dIUmijx1qaJsIiU+Hosw6xM5KijAWRJCSgNg==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-win32-x64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-x64/-/sharp-win32-x64-0.34.5.tgz",
      "integrity": "sha512-+29YMsqY2/9eFEiW93eqWnuLcWcufowXewwSNIT6UwZdUUCrM3oFjMWH/Z6/TMmb4hlFenmfAVbpWeup2jryCw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.13",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.13.tgz",
      "integrity": "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/remapping": {
      "version": "2.3.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/remapping/-/remapping-2.3.5.tgz",
      "integrity": "sha512-LI9u/+laYG4Ds1TDKSJW2YPrIlcVYOwi2fUC6xB43lueCjgxV4lffOCZCtYFiH6TNOX+tQKXx97T4IKHbhyHEQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.5",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.6.0.tgz",
      "integrity": "sha512-T7jf+5zgsZHwNJ4lvQ7/aezbyk0nNX+zJVWpmHA7VYsEx7a7qr5Rg5IbtJFqkgze5Y2sruq1RUY8Q837Od7iFw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.31",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.31.tgz",
      "integrity": "sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@napi-rs/lzma-linux-x64-gnu": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/@napi-rs/lzma-linux-x64-gnu/-/lzma-linux-x64-gnu-1.5.1.tgz",
      "integrity": "sha512-oTXEIha4SsuXdTA4Iyskj0kpdx2yVXdhd75c2v3xGrHFfVMsbhTPZU/nMPL4sWKo4pBHm3aucLaqGlF696dTyQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^22.20 || ^24.12 || >=25"
      }
    },
    "node_modules/@nodelib/fs.scandir": {
      "version": "2.1.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.scandir/-/fs.scandir-2.1.5.tgz",
      "integrity": "sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "2.0.5",
        "run-parallel": "^1.1.9"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.stat": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.stat/-/fs.stat-2.0.5.tgz",
      "integrity": "sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.walk": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.walk/-/fs.walk-1.2.8.tgz",
      "integrity": "sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.scandir": "2.1.5",
        "fastq": "^1.6.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@opentelemetry/api": {
      "version": "1.10.0",
      "resolved": "https://registry.npmjs.org/@opentelemetry/api/-/api-1.10.0.tgz",
      "integrity": "sha512-lMkyes8iHrG+mk6WH7X70MdCLI2RS0FwNBY1PyQ8UemaijE2m5mv5A0Niy3HtbYTFrgkUEQjFMXmSAk2hQDuPQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8.0.0"
      }
    },
    "node_modules/@oxc-parser/binding-android-arm-eabi": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-android-arm-eabi/-/binding-android-arm-eabi-0.152.0.tgz",
      "integrity": "sha512-393VtirINkae4XHBTkq/yQxhOwEr4V+r0et37P2fp+sYZSdYgZTRDPo5Um8vBh0QjMZ+RmaMy4PP0qwr4cTMwA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-android-arm64": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-android-arm64/-/binding-android-arm64-0.152.0.tgz",
      "integrity": "sha512-iYFcExATJNZ0rZj0o02THbD1Nc9jAW0nVgIQPee6ejbSASpbZXlIMw8jxtpzaG14JQTWwGSZ6U5dEtRJXE6V3Q==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-darwin-arm64": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-darwin-arm64/-/binding-darwin-arm64-0.152.0.tgz",
      "integrity": "sha512-fnU+DfUzi5/rFy0LzmipYRz06PAUUkOS8kCJQ3Eg6oqlunC1XZXoffFqxmdL51RmcbYtUG3P8DVG1U5fckoa2A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-darwin-x64": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-darwin-x64/-/binding-darwin-x64-0.152.0.tgz",
      "integrity": "sha512-Y3U2okryWTs7hDld6UhjJwLNf8/do+x4g4C+1U5SiGwrTLwbO83WJYJA8+l9iFSilWBgnfpd/+U76tfeNxUHzA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-freebsd-x64": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-freebsd-x64/-/binding-freebsd-x64-0.152.0.tgz",
      "integrity": "sha512-XkhkRrrPffEw+ZLv/d/5pEni0buxinm/E/N6fLbJCunD1DBbeCTtVP23ESV+4CWCWdSz397asks1ViGslpmWiQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-linux-arm-gnueabihf": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-linux-arm-gnueabihf/-/binding-linux-arm-gnueabihf-0.152.0.tgz",
      "integrity": "sha512-MLzsRRbdfmdzo6JEhbC1yKU9ItfvM8tEf18HM32jCiNYZEz6J3bRBRl3cTkKR0vBdrk9ZVlcARXtwHccs+epDA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-linux-arm-musleabihf": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-linux-arm-musleabihf/-/binding-linux-arm-musleabihf-0.152.0.tgz",
      "integrity": "sha512-HHerTEJz7Iy10Ji6BGsk4gqG6PU0UzFuBu91jIEOX89FnrI5ECWSEr7BLpkYQhp7U0QFtMnBhNfQKI0hYZK78w==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-linux-arm64-gnu": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-linux-arm64-gnu/-/binding-linux-arm64-gnu-0.152.0.tgz",
      "integrity": "sha512-9Bb8GyzZ2uSLzRDZ27usaKokr07mxiBe2dDF5b6bd2janmaJTT1gL51UfP7AU30yFiXrJvcRyFKREAgKwZYs0w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-linux-arm64-musl": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-linux-arm64-musl/-/binding-linux-arm64-musl-0.152.0.tgz",
      "integrity": "sha512-om7iDMUroI74A/lfRRWY9/Ev3VWrVsrUZ4tyvyh8raBey/sdcfyAD7tYWc+iykAiotnmftyKTpUKFr1QnaBrAQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-linux-ppc64-gnu": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-linux-ppc64-gnu/-/binding-linux-ppc64-gnu-0.152.0.tgz",
      "integrity": "sha512-Lf1OL2lMTqwDMFC6jnRb30B+WYHKV0XT+bPHcFM6xHtNVwxpobiTzUIvKH6a0LWpvfwyru8Yu6zCGHqqFHH+gg==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-linux-riscv64-gnu": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-linux-riscv64-gnu/-/binding-linux-riscv64-gnu-0.152.0.tgz",
      "integrity": "sha512-BYWSMQK+YJ9ZILStPcmmiSVq8KEG9Qdq/c4BHPC3rUEq/fEDCVjUIwdj5ZzjgZ9P9is9PKu0tcAXzq1ZXg4urQ==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-linux-riscv64-musl": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-linux-riscv64-musl/-/binding-linux-riscv64-musl-0.152.0.tgz",
      "integrity": "sha512-d2LqHNNNqdH185sRK5dPKWZu201JrNu9/CRFuVEuT+ht7n/QaVblEMWT9MALQPrDWYvhG10P+NSKJFquDWZ09w==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-linux-s390x-gnu": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-linux-s390x-gnu/-/binding-linux-s390x-gnu-0.152.0.tgz",
      "integrity": "sha512-8gBeHt5rA/8+pKhHl+zLggfa3L/V/L2at96p7ty6pBE7id6lFO19nFUc15u2PcjC4OYeYK465MKy1fhhbpFIGw==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-linux-x64-gnu": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-linux-x64-gnu/-/binding-linux-x64-gnu-0.152.0.tgz",
      "integrity": "sha512-ltgrSF6L+yPTVsIdaAyqKq3zTqzj/1VlNbxWZuxAe8flR3sWdyNsKvdXukoO8/ucJbLickhmieRBge+o/e8Ugw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-linux-x64-musl": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-linux-x64-musl/-/binding-linux-x64-musl-0.152.0.tgz",
      "integrity": "sha512-LcMp6BvrBnewSfdkLHoSqidhoAq4syKOTBV5TYHWd+2VnGkfD/nPRRVIzTBt/Lkbt7pfOFDGtkiTntFS0p6sQQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-openharmony-arm64": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-openharmony-arm64/-/binding-openharmony-arm64-0.152.0.tgz",
      "integrity": "sha512-jbhoMCslVxzRCRNQ8TSHxjYdSKRvk8O6ciLVDkahJvmyHDzBqba/bMQHM6ULKj/rgHNNbSzlIiakdx8SEfkJzA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-win32-arm64-msvc": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-win32-arm64-msvc/-/binding-win32-arm64-msvc-0.152.0.tgz",
      "integrity": "sha512-JZYVlhv36mr/nertnRB7vchJECOBb1Lz6lltalILsB+o9M/is+H6BEDRLQKdqA4JKs6NjJszo46+iM5sfwj6jQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-win32-ia32-msvc": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-win32-ia32-msvc/-/binding-win32-ia32-msvc-0.152.0.tgz",
      "integrity": "sha512-1X9oganvVsunRH0lH10UU05N+H9atpX6WsOybByUjwnfcd3h/0tYwvuv16XuHglrIUOnxV2TodbLVEwwafd64g==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-parser/binding-win32-x64-msvc": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-parser/binding-win32-x64-msvc/-/binding-win32-x64-msvc-0.152.0.tgz",
      "integrity": "sha512-sw0M80/dn9rcpu+Rqqph/C+MjvDDce6MlXmFjsNQtPEymha0eJy3ml6+foSUTqFfpDIDyHZZ4eoJ43IoMe8bJw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxc-project/types": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/@oxc-project/types/-/types-0.152.0.tgz",
      "integrity": "sha512-oM/5rLBm2tPkg0iBgkH/FOeR3PCDpY19GTgAZjMFM8h9WI9VW7cLgzp6nwtarYKmovavIQZ+Fe/RKX/8C8O/Rw==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/oxc-project"
      }
    },
    "node_modules/@paulirish/trace_engine": {
      "version": "0.0.67",
      "resolved": "https://registry.npmjs.org/@paulirish/trace_engine/-/trace_engine-0.0.67.tgz",
      "integrity": "sha512-AWZSKQDwbWKIO//xGvM8isSyDgEDZWDq12SbMQMxl6eE9ZgWaoc9n/2d7REjwcRANyA1Zjo1rVfJiSRFFGKUww==",
      "dev": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "third-party-web": "*"
      }
    },
    "node_modules/@playwright/test": {
      "version": "1.64.1",
      "resolved": "https://registry.npmjs.org/@playwright/test/-/test-1.64.1.tgz",
      "integrity": "sha512-IaYGml/nSOiZWROfPtuIL7neuu9qDOZ3TNvNljUIrhDMxiGTgPjzj/g9p9RxpS2tSepPDRY+UwAaEeiKtUvIAg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "playwright": "1.64.1"
      },
      "bin": {
        "playwright": "cli.js"
      },
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/@puppeteer/browsers": {
      "version": "3.2.6",
      "resolved": "https://registry.npmjs.org/@puppeteer/browsers/-/browsers-3.2.6.tgz",
      "integrity": "sha512-MJP29gVoHznmqmwhH1tlZqzfeQ3aylTpSSa6WKZXtkwYUH02i9imBmWGTyZrbnAou5paX78SE4jMAUqnEPf8ug==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "modern-tar": "^0.8.6",
        "yargs": "^18.0.0"
      },
      "bin": {
        "browsers": "lib/main-cli.js"
      },
      "engines": {
        "node": ">=22.12.0"
      },
      "peerDependencies": {
        "proxy-agent": ">=8.0.1",
        "yauzl": "^2.10.0 || ^3.4.0"
      },
      "peerDependenciesMeta": {
        "proxy-agent": {
          "optional": true
        },
        "yauzl": {
          "optional": true
        }
      }
    },
    "node_modules/@remix-run/router": {
      "version": "1.23.4",
      "resolved": "https://registry.npmjs.org/@remix-run/router/-/router-1.23.4.tgz",
      "integrity": "sha512-q7j5geK7xs3UJSdm9/iytUNclBnLmYx1EnSeCFXHPeutdqgIMeFeHtUZgS3EhlKxdBEAu8OwtJCwmLrEzpSs7Q==",
      "license": "MIT",
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@rolldown/pluginutils": {
      "version": "1.0.0-beta.27",
      "resolved": "https://registry.npmjs.org/@rolldown/pluginutils/-/pluginutils-1.0.0-beta.27.tgz",
      "integrity": "sha512-+d0F4MKMCbeVUJwG96uQ4SgAznZNSq93I3V+9NHA4OpvqG8mRCpGdKmK8l/dl02h2CCDHwW2FqilnTyDcAnqjA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@rollup/rollup-android-arm-eabi": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm-eabi/-/rollup-android-arm-eabi-4.67.4.tgz",
      "integrity": "sha512-/v/pUAPOcwp+r1Hjjdg0cBV1TE89CzGKrKh2FgkIQw2QBcIMmVPOCSfuOZStCn4Xh/98HXfo/ht6ztcssctPNg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-android-arm64": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm64/-/rollup-android-arm64-4.67.4.tgz",
      "integrity": "sha512-6tmmB/P52Vt167FXXEw5auiEUgTtZz7aqUgWHqYXToIUE0HFDY6fTdAyeekjjsNk6O/8dtpSKtClxSj1mMneKQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-android-x64": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-x64/-/rollup-android-x64-4.67.4.tgz",
      "integrity": "sha512-8Z9Q4RmotVmuL4llOvqX814JNiOK1oqoBv+glG5KbpRfUiypqzz2/fxIzK4Pq129l4dT5a8Gszmpc0/XPYoFuQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-darwin-arm64": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-arm64/-/rollup-darwin-arm64-4.67.4.tgz",
      "integrity": "sha512-pnq6hssxTtwuRAl6Kdi/+IDY+b1IhkUetjhUkdLAAJCssjfqtL2Oqy/FXJVJFtAWOu1oRlArIvf0Yk1O92x2HQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-darwin-x64": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-x64/-/rollup-darwin-x64-4.67.4.tgz",
      "integrity": "sha512-BeIrGZvHMVdJg/N+ohZfFywG/gF41684YhDj2wBvouj7m9ziP1tZDUNwzXRiDY+3WIKngaC4hiUBqVtBPGP5og==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-arm64": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-arm64/-/rollup-freebsd-arm64-4.67.4.tgz",
      "integrity": "sha512-fRFX/oqNg/g780DKoS8RIfYcZD59Ru5O/bSeK1N7gQljBFrTxJY/q5EX4eMs5SrJf32VgVBVVYCdfPpzAwPPnQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-x64": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-x64/-/rollup-freebsd-x64-4.67.4.tgz",
      "integrity": "sha512-bSrBRopG1q+0RuOsW0NtYTtIODlvNA3T3ebx5WnQVdSxWIoXFmj+rZdHUHdSLgFdZ5M6VGmekYE7r4RMGQXjfg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-gnueabihf": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-gnueabihf/-/rollup-linux-arm-gnueabihf-4.67.4.tgz",
      "integrity": "sha512-L8IvdrJVtl65g1ozwDSyjGPG+FmibhCdFUwmqTItJLw0S3+Oj4QzFs7rfgTUiK7rsPjkCLdG1/GApFxoynXFJQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-musleabihf": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-musleabihf/-/rollup-linux-arm-musleabihf-4.67.4.tgz",
      "integrity": "sha512-h7PcoQOzC31jshNpQ48J0akB9tsghjkSjSl5AZ6XsVGTxVsln7t7C4SQyw62tNVSaz2SeHgk4VT2ELbL17BSHQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-gnu": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-gnu/-/rollup-linux-arm64-gnu-4.67.4.tgz",
      "integrity": "sha512-KSPuOBNHoOl7AsVjeY1KZci8+0up0U4TFAHU5IzBYN8P+Z6cB9DZq28+JQycZW7f6WLLa/tSzhV7Rdy95bVi+g==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-musl": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-musl/-/rollup-linux-arm64-musl-4.67.4.tgz",
      "integrity": "sha512-0E/mKmVk1PlQeQYygIwQm0jlwjANTzGSiNBMPrFx+rdFGFj/2Axh4p6XwcrystQIqXZVudTaGsdbDpzYgJ4wSA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loong64-gnu": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-loong64-gnu/-/rollup-linux-loong64-gnu-4.67.4.tgz",
      "integrity": "sha512-Fvw7dOSc2Sa9UOipRZVI0zOgdLCzsjVyD/6JuHXzUHTXFu7mMgmeX/0/bCVBIut1dz+nWz3pV4WpS/Qg0XVnxw==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loong64-musl": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-loong64-musl/-/rollup-linux-loong64-musl-4.67.4.tgz",
      "integrity": "sha512-jzxbVHaE7V3F+P0wEK7UydQtvv7Twfdtx58jI5/3VRx1jJxyrn+qFwfXmqjVFxPhBl+zjaRs+ZJMFJw7vdHaQA==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-gnu": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-ppc64-gnu/-/rollup-linux-ppc64-gnu-4.67.4.tgz",
      "integrity": "sha512-fhtrzp9p4GjEJVaigaap9g6X9nP6xgJtKiLLXSDgpE18HXufA5aqfltGn+KAqMtVZReJZfOrXm//y5YSA9BWbA==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-musl": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-ppc64-musl/-/rollup-linux-ppc64-musl-4.67.4.tgz",
      "integrity": "sha512-uynaF7IUHwAckV0S+yC1f5esy9gB+aqCBsPH5BOck32TYdCuAn2lVG5tvUcFnEsrviGEmRZxE1NHSOieUPYJEg==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-gnu": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-gnu/-/rollup-linux-riscv64-gnu-4.67.4.tgz",
      "integrity": "sha512-uaqRFdfb8eIa2bVHN/FE3ndCvR0zV2xv0AwjCfxrqSu6l6fp/54VhjfhslKlf2RIik9L1jwlt4E56PeVX6tQtQ==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-musl": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-musl/-/rollup-linux-riscv64-musl-4.67.4.tgz",
      "integrity": "sha512-JZRow7kmxUDEASnxHuVG5itTm+nTXi9BQUABcVUnUEngC+OPwMrpx1uJ9hIA/v+IcAEBL52ktCSPXk5OJn9Jqg==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-s390x-gnu": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-s390x-gnu/-/rollup-linux-s390x-gnu-4.67.4.tgz",
      "integrity": "sha512-rdrh4e+Lq9fCNKoDPaCqeHXbQCe7yl77Ukl45tlSClwYdZ1gpFGZz1XLJdYtY++FRlfL5aHvb6/0n3GDW/Nxsw==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-gnu": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-gnu/-/rollup-linux-x64-gnu-4.67.4.tgz",
      "integrity": "sha512-wL7MS4r0fYcxluF3ne2plofHZiB/LsqNCnyaUlyiKpAJLb6agPSFz7DEFCfkonWAZXMrLwCmC08b2ZEnEdJkog==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-musl": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-musl/-/rollup-linux-x64-musl-4.67.4.tgz",
      "integrity": "sha512-4H0XHfd2VufGjX7NjUyeue78sD0bRIoKSGjGqO+F5nSvL6jN48NAU7esdmtFEYxZXwObLtt3MJ/kHS0jASMW3g==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-openbsd-x64": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-openbsd-x64/-/rollup-openbsd-x64-4.67.4.tgz",
      "integrity": "sha512-osRHQbE55pZpCLetpMsFmhkapyZnAUH73qRKMh+npi3boUom6u6hdaTTPSxlInXxwJHsn9r2uDhdz0V7Yoxx2A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ]
    },
    "node_modules/@rollup/rollup-openharmony-arm64": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-openharmony-arm64/-/rollup-openharmony-arm64-4.67.4.tgz",
      "integrity": "sha512-95+exYEyOwrZePsE0czi4q7X5lxKPa21+lmyAZlwbYENITQ0Unk4HAQAFp/p+KhXBHBx9mUABXRYjOC5A1wY3Q==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ]
    },
    "node_modules/@rollup/rollup-win32-arm64-msvc": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-arm64-msvc/-/rollup-win32-arm64-msvc-4.67.4.tgz",
      "integrity": "sha512-FOXOcKhNQpO4Po+Ynan6IbtM67SrXZbgpRJWVYwz53CT5veI7sVzDwVBmWS65N5Imv+wK3SVhIPAl+C5DXXNCg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-ia32-msvc": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-ia32-msvc/-/rollup-win32-ia32-msvc-4.67.4.tgz",
      "integrity": "sha512-cklKh0gJOkAZQcWziQa3hrjxZKN+PCHZ7SPTyGJDAiBVr05ZXlEjGFCG7zFJMaVibxsmzAe1FimN4u/HBns9+Q==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-gnu": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-gnu/-/rollup-win32-x64-gnu-4.67.4.tgz",
      "integrity": "sha512-AegwxJPc9bvUp8fQtlsUHkFMOMkGylWU7glyL+YD4vwG+QaYoGXYLSsQoeTD7kvoLZrVlMWNVhTg1dedY5C1VQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-msvc": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-msvc/-/rollup-win32-x64-msvc-4.67.4.tgz",
      "integrity": "sha512-RJZnrwTWj7Iq2ooBwoGbDdC65tDwYawneGcAfFMJqVUrRZMcskka6nTkBpXR/47G7kzn3EW2qupExnaBy11vwg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@sentry/bundler-plugins": {
      "version": "11.10.0",
      "resolved": "https://registry.npmjs.org/@sentry/bundler-plugins/-/bundler-plugins-11.10.0.tgz",
      "integrity": "sha512-+ngJ485rIYll5uOhWSvSO+Vx4S24MGe5KcLKlUZghr+BXK+ib32uBOZNG294wGyeauLTDvdjncLEYwiaBnP/5w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@sentry/core": "11.10.0",
        "dotenv": "^17.4.2",
        "glob": "^13.0.6",
        "magic-string": "~0.30.8 || ^1.0.0",
        "oxc-parser": "^0.152.0",
        "sentry": "^0.45.0",
        "supports-color": "^8.1.1"
      },
      "engines": {
        "node": ">=20.19.0 <22.0.0 || >=22.12.0 <23.0.0 || >=23.2.0"
      },
      "peerDependencies": {
        "rollup": ">=3.2.0",
        "webpack": ">=5.1.0"
      },
      "peerDependenciesMeta": {
        "rollup": {
          "optional": true
        },
        "webpack": {
          "optional": true
        }
      }
    },
    "node_modules/@sentry/bundler-plugins/node_modules/supports-color": {
      "version": "8.1.1",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-8.1.1.tgz",
      "integrity": "sha512-MpUEN2OodtUzxvKQl72cUF7RQ5EiHsGvSsVG0ia9c5RbWGL2CI4C7EpPS8UTBIplnlzZiNuV56w+FuNxy3ty2Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-flag": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/supports-color?sponsor=1"
      }
    },
    "node_modules/@sentry/conventions": {
      "version": "0.29.0",
      "resolved": "https://registry.npmjs.org/@sentry/conventions/-/conventions-0.29.0.tgz",
      "integrity": "sha512-kYq9/HJ/l6MYP/srIc20dy1W4mWyJfCF0OWFF+RhBGZwyr/wCmtabRFKyw7kqM+DTwZXQOjSTSZUcJhDowcInQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=14"
      }
    },
    "node_modules/@sentry/core": {
      "version": "11.10.0",
      "resolved": "https://registry.npmjs.org/@sentry/core/-/core-11.10.0.tgz",
      "integrity": "sha512-l/OtTo1v+TQgZtHG2Q5N4IX+gFdAE1tZ27K/P21UCzJglWk54TPEm+d9T2lulPqMK06kZcLwDgRAhE2GO4YS5w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@sentry/conventions": "^0.29.0"
      },
      "engines": {
        "node": ">=20.19.0 <22.0.0 || >=22.12.0 <23.0.0 || >=23.2.0"
      }
    },
    "node_modules/@sentry/node": {
      "version": "11.10.0",
      "resolved": "https://registry.npmjs.org/@sentry/node/-/node-11.10.0.tgz",
      "integrity": "sha512-ZsndrSn1NjL9AslpUdxz/kYPcv/i+plVZoyPe1ivlr5XPUpocB8pUL5noYbIUl96Wd/yGvPBw6zqO8d69rRKQQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@opentelemetry/api": "^1.9.1",
        "@sentry/bundler-plugins": "11.10.0",
        "@sentry/conventions": "^0.29.0",
        "@sentry/core": "11.10.0",
        "@sentry/opentelemetry": "11.10.0",
        "@sentry/server-runtime-injection": "11.10.0",
        "@sentry/server-utils": "11.10.0"
      },
      "engines": {
        "node": ">=20.19.0 <22.0.0 || >=22.12.0 <23.0.0 || >=23.2.0"
      }
    },
    "node_modules/@sentry/opentelemetry": {
      "version": "11.10.0",
      "resolved": "https://registry.npmjs.org/@sentry/opentelemetry/-/opentelemetry-11.10.0.tgz",
      "integrity": "sha512-YMV4ZgaRlW7QPCcMScVpSBvYOdvDlY+alqRT3KOTcmPKFZtf8O2hXHWFhl/M33kKDEfqOk2XtEVeHs3mZFOCaw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@sentry/conventions": "^0.29.0",
        "@sentry/core": "11.10.0"
      },
      "engines": {
        "node": ">=20.19.0 <22.0.0 || >=22.12.0 <23.0.0 || >=23.2.0"
      },
      "peerDependencies": {
        "@opentelemetry/api": "^1.9.0"
      }
    },
    "node_modules/@sentry/server-runtime-injection": {
      "version": "11.10.0",
      "resolved": "https://registry.npmjs.org/@sentry/server-runtime-injection/-/server-runtime-injection-11.10.0.tgz",
      "integrity": "sha512-1nc+HNPldrPEov16sL5m2cOLVgNJ+FsR7QtaWGOOv8qYFJkSp95lyc2qzLnaG2L72UzSMOv10peGRioAKrrZQQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@sentry/core": "11.10.0",
        "@sentry/server-utils": "11.10.0"
      },
      "engines": {
        "node": ">=20.19.0 <22.0.0 || >=22.12.0 <23.0.0 || >=23.2.0"
      }
    },
    "node_modules/@sentry/server-utils": {
      "version": "11.10.0",
      "resolved": "https://registry.npmjs.org/@sentry/server-utils/-/server-utils-11.10.0.tgz",
      "integrity": "sha512-m/MVCvPzQJJZZCTFlVPCrTuoncT7SR80+QKg1K7ul25AsL0byABr5KsHCbXVpOYXLVz04Omk+pOOR5Cv2IAlrA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@opentelemetry/api": "^1.9.1",
        "@sentry/conventions": "^0.29.0",
        "@sentry/core": "11.10.0"
      },
      "engines": {
        "node": ">=20.19.0 <22.0.0 || >=22.12.0 <23.0.0 || >=23.2.0"
      }
    },
    "node_modules/@supabase/auth-js": {
      "version": "2.71.1",
      "resolved": "https://registry.npmjs.org/@supabase/auth-js/-/auth-js-2.71.1.tgz",
      "integrity": "sha512-mMIQHBRc+SKpZFRB2qtupuzulaUhFYupNyxqDj5Jp/LyPvcWvjaJzZzObv6URtL/O6lPxkanASnotGtNpS3H2Q==",
      "license": "MIT",
      "dependencies": {
        "@supabase/node-fetch": "^2.6.14"
      }
    },
    "node_modules/@supabase/functions-js": {
      "version": "2.4.6",
      "resolved": "https://registry.npmjs.org/@supabase/functions-js/-/functions-js-2.4.6.tgz",
      "integrity": "sha512-bhjZ7rmxAibjgmzTmQBxJU6ZIBCCJTc3Uwgvdi4FewueUTAGO5hxZT1Sj6tiD+0dSXf9XI87BDdJrg12z8Uaew==",
      "license": "MIT",
      "dependencies": {
        "@supabase/node-fetch": "^2.6.14"
      }
    },
    "node_modules/@supabase/node-fetch": {
      "version": "2.6.15",
      "resolved": "https://registry.npmjs.org/@supabase/node-fetch/-/node-fetch-2.6.15.tgz",
      "integrity": "sha512-1ibVeYUacxWYi9i0cf5efil6adJ9WRyZBLivgjs+AUpewx1F3xPi7gLgaASI2SmIQxPoCEjAsLAzKPgMJVgOUQ==",
      "license": "MIT",
      "dependencies": {
        "whatwg-url": "^5.0.0"
      },
      "engines": {
        "node": "4.x || >=6.0.0"
      }
    },
    "node_modules/@supabase/postgrest-js": {
      "version": "1.21.4",
      "resolved": "https://registry.npmjs.org/@supabase/postgrest-js/-/postgrest-js-1.21.4.tgz",
      "integrity": "sha512-TxZCIjxk6/dP9abAi89VQbWWMBbybpGWyvmIzTd79OeravM13OjR/YEYeyUOPcM1C3QyvXkvPZhUfItvmhY1IQ==",
      "license": "MIT",
      "dependencies": {
        "@supabase/node-fetch": "^2.6.14"
      }
    },
    "node_modules/@supabase/realtime-js": {
      "version": "2.15.5",
      "resolved": "https://registry.npmjs.org/@supabase/realtime-js/-/realtime-js-2.15.5.tgz",
      "integrity": "sha512-/Rs5Vqu9jejRD8ZeuaWXebdkH+J7V6VySbCZ/zQM93Ta5y3mAmocjioa/nzlB6qvFmyylUgKVS1KpE212t30OA==",
      "license": "MIT",
      "dependencies": {
        "@supabase/node-fetch": "^2.6.13",
        "@types/phoenix": "^1.6.6",
        "@types/ws": "^8.18.1",
        "ws": "^8.18.2"
      }
    },
    "node_modules/@supabase/storage-js": {
      "version": "2.12.1",
      "resolved": "https://registry.npmjs.org/@supabase/storage-js/-/storage-js-2.12.1.tgz",
      "integrity": "sha512-QWg3HV6Db2J81VQx0PqLq0JDBn4Q8B1FYn1kYcbla8+d5WDmTdwwMr+EJAxNOSs9W4mhKMv+EYCpCrTFlTj4VQ==",
      "license": "MIT",
      "dependencies": {
        "@supabase/node-fetch": "^2.6.14"
      }
    },
    "node_modules/@supabase/supabase-js": {
      "version": "2.57.4",
      "resolved": "https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.57.4.tgz",
      "integrity": "sha512-LcbTzFhHYdwfQ7TRPfol0z04rLEyHabpGYANME6wkQ/kLtKNmI+Vy+WEM8HxeOZAtByUFxoUTTLwhXmrh+CcVw==",
      "license": "MIT",
      "dependencies": {
        "@supabase/auth-js": "2.71.1",
        "@supabase/functions-js": "2.4.6",
        "@supabase/node-fetch": "2.6.15",
        "@supabase/postgrest-js": "1.21.4",
        "@supabase/realtime-js": "2.15.5",
        "@supabase/storage-js": "2.12.1"
      }
    },
    "node_modules/@tanstack/query-core": {
      "version": "5.105.0",
      "resolved": "https://registry.npmjs.org/@tanstack/query-core/-/query-core-5.105.0.tgz",
      "integrity": "sha512-7p56vRmT/z4UJ6sctGIdl5WRUQyUv53IUpUwEKi2g97zMbO7zh8ZsCLffGAvCPBR4xD72e3VXsDyLwXHhoNTMQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/tannerlinsley"
      }
    },
    "node_modules/@tanstack/react-query": {
      "version": "5.105.0",
      "resolved": "https://registry.npmjs.org/@tanstack/react-query/-/react-query-5.105.0.tgz",
      "integrity": "sha512-y+hMuDERvgg6ay1da0V1a6ZC0ZONt7dELxSFkqRZuwm7p1TTZs0MoXrPlBRflIpRoYjvzQVYxycnLImpFLhWrw==",
      "license": "MIT",
      "dependencies": {
        "@tanstack/query-core": "5.105.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/tannerlinsley"
      },
      "peerDependencies": {
        "@types/react": "^18 || ^19",
        "react": "^18 || ^19"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@testing-library/dom": {
      "version": "10.4.2",
      "resolved": "https://registry.npmjs.org/@testing-library/dom/-/dom-10.4.2.tgz",
      "integrity": "sha512-yzr2S9HyAIdhz2/6qHgbs665Q7PKVcDF05vsOlHPxG1mo36gKVesdYVeDLnXgfjJ03CrKRk08knc6+E/9m8v2Q==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "@babel/code-frame": "^7.10.4",
        "@babel/runtime": "^7.12.5",
        "@types/aria-query": "^5.0.1",
        "aria-query": "5.3.0",
        "dom-accessibility-api": "^0.5.9",
        "lz-string": "^1.5.0",
        "picocolors": "1.1.1",
        "pretty-format": "^27.0.2"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@testing-library/jest-dom": {
      "version": "6.9.1",
      "resolved": "https://registry.npmjs.org/@testing-library/jest-dom/-/jest-dom-6.9.1.tgz",
      "integrity": "sha512-zIcONa+hVtVSSep9UT3jZ5rizo2BsxgyDYU7WFD5eICBE7no3881HGeb/QkGfsJs6JTkY1aQhT7rIPC7e+0nnA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@adobe/css-tools": "^4.4.0",
        "aria-query": "^5.0.0",
        "css.escape": "^1.5.1",
        "dom-accessibility-api": "^0.6.3",
        "picocolors": "^1.1.1",
        "redent": "^3.0.0"
      },
      "engines": {
        "node": ">=14",
        "npm": ">=6",
        "yarn": ">=1"
      }
    },
    "node_modules/@testing-library/jest-dom/node_modules/dom-accessibility-api": {
      "version": "0.6.3",
      "resolved": "https://registry.npmjs.org/dom-accessibility-api/-/dom-accessibility-api-0.6.3.tgz",
      "integrity": "sha512-7ZgogeTnjuHbo+ct10G9Ffp0mif17idi0IyWNVA/wcwcm7NPOD/WEHVP3n7n3MhXqxoIYm8d6MuZohYWIZ4T3w==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@testing-library/react": {
      "version": "16.3.3",
      "resolved": "https://registry.npmjs.org/@testing-library/react/-/react-16.3.3.tgz",
      "integrity": "sha512-Uo193NgQbPMz6lrrhtRQQFcMC6Re/ELLFbbuVL30WDlZxlpZf9/lMHTAVxPRLw1q1iu9OJmR1c2BLiENRstdBg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.12.5"
      },
      "engines": {
        "node": ">=18"
      },
      "peerDependencies": {
        "@testing-library/dom": "^10.0.0",
        "@types/react": "^18.0.0 || ^19.0.0",
        "@types/react-dom": "^18.0.0 || ^19.0.0",
        "react": "^18.0.0 || ^19.0.0",
        "react-dom": "^18.0.0 || ^19.0.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@testing-library/user-event": {
      "version": "14.6.8",
      "resolved": "https://registry.npmjs.org/@testing-library/user-event/-/user-event-14.6.8.tgz",
      "integrity": "sha512-vgSSqnANMnkcYR/vUNDbwS7aM3OErRLNUG8vCVVlj4oc6cKffUrccX7UAS5AmJQQNZTSibi9z5GvvRZ0aYgUCQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12",
        "npm": ">=6"
      },
      "peerDependencies": {
        "@testing-library/dom": ">=7.21.4"
      }
    },
    "node_modules/@types/aria-query": {
      "version": "5.0.4",
      "resolved": "https://registry.npmjs.org/@types/aria-query/-/aria-query-5.0.4.tgz",
      "integrity": "sha512-rfT93uj5s0PRL7EzccGMs3brplhcrghnDoV26NqKhCAS1hVo+WdNsPvE/yb6ilfr5hi2MEk6d5EWJTKdxg8jVw==",
      "dev": true,
      "license": "MIT",
      "peer": true
    },
    "node_modules/@types/babel__core": {
      "version": "7.20.5",
      "resolved": "https://registry.npmjs.org/@types/babel__core/-/babel__core-7.20.5.tgz",
      "integrity": "sha512-qoQprZvz5wQFJwMDqeseRXWv3rqMvhgpbXFfVyWhbx9X47POIA6i/+dXefEmZKoAgOaTdaIgNSMqMIU61yRyzA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.20.7",
        "@babel/types": "^7.20.7",
        "@types/babel__generator": "*",
        "@types/babel__template": "*",
        "@types/babel__traverse": "*"
      }
    },
    "node_modules/@types/babel__generator": {
      "version": "7.27.0",
      "resolved": "https://registry.npmjs.org/@types/babel__generator/-/babel__generator-7.27.0.tgz",
      "integrity": "sha512-ufFd2Xi92OAVPYsy+P4n7/U7e68fex0+Ee8gSG9KX7eo084CWiQ4sdxktvdl0bOPupXtVJPY19zk6EwWqUQ8lg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.0.0"
      }
    },
    "node_modules/@types/babel__template": {
      "version": "7.4.4",
      "resolved": "https://registry.npmjs.org/@types/babel__template/-/babel__template-7.4.4.tgz",
      "integrity": "sha512-h/NUaSyG5EyxBIp8YRxo4RMe2/qQgvyowRwVMzhYhBCONbW8PUsg4lkFMrhgZhUe5z3L3MiLDuvyJ/CaPa2A8A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.1.0",
        "@babel/types": "^7.0.0"
      }
    },
    "node_modules/@types/babel__traverse": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@types/babel__traverse/-/babel__traverse-7.28.0.tgz",
      "integrity": "sha512-8PvcXf70gTDZBgt9ptxJ8elBeBjcLOAcOtoO/mPJjtji1+CdGbHgm77om1GrsPxsiE+uXIpNSK64UYaIwQXd4Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.28.2"
      }
    },
    "node_modules/@types/chai": {
      "version": "5.2.3",
      "resolved": "https://registry.npmjs.org/@types/chai/-/chai-5.2.3.tgz",
      "integrity": "sha512-Mw558oeA9fFbv65/y4mHtXDs9bPnFMZAL/jxdPFUpOHHIXX91mcgEHbS5Lahr+pwZFR8A7GQleRWeI6cGFC2UA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/deep-eql": "*",
        "assertion-error": "^2.0.1"
      }
    },
    "node_modules/@types/deep-eql": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/@types/deep-eql/-/deep-eql-4.0.2.tgz",
      "integrity": "sha512-c9h9dVVMigMPc4bwTvC5dxqtqJZwQPePsWjPlpSOnojbor6pGqdk541lfA7AqFQr5pB1BRdq0juY9db81BwyFw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/estree": {
      "version": "1.0.10",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.10.tgz",
      "integrity": "sha512-lTyOMnOcmRBzdCv6/4zUZCrEhV0xrqQiUZBZtVcbmLHBXKLnN8q89v/wKRF/Q0HbwVsqbIG3o5HDoFl9sduM+g==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/json-schema": {
      "version": "7.0.15",
      "resolved": "https://registry.npmjs.org/@types/json-schema/-/json-schema-7.0.15.tgz",
      "integrity": "sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "22.20.5",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-22.20.5.tgz",
      "integrity": "sha512-U2+DNr+wSjpsTS/wZGYHq7GcwfuSmKiKvoPvK22zwTlRhU91yOniN4qRR5KhIjvif7ysw/dz/hKmfDH0Ris4aA==",
      "license": "MIT",
      "dependencies": {
        "undici-types": "~6.21.0"
      }
    },
    "node_modules/@types/phoenix": {
      "version": "1.6.8",
      "resolved": "https://registry.npmjs.org/@types/phoenix/-/phoenix-1.6.8.tgz",
      "integrity": "sha512-8uBiGk2kDk+e0/9eq8CWuDG5VLrS50roV4doR3xn21/EL8olbWSi2TBNa/CFJS00VLOuawH/UGQQsn+2W8tNrA==",
      "license": "MIT"
    },
    "node_modules/@types/prop-types": {
      "version": "15.7.15",
      "resolved": "https://registry.npmjs.org/@types/prop-types/-/prop-types-15.7.15.tgz",
      "integrity": "sha512-F6bEyamV9jKGAFBEmlQnesRPGOQqS2+Uwi0Em15xenOxHaf2hv6L8YCVn3rPdPJOiJfPiCnLIRyvwVaqMY3MIw==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/@types/react": {
      "version": "18.3.31",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-18.3.31.tgz",
      "integrity": "sha512-vfEqpXTvwT91yhmwdfouStN2hSKwTvyRs8qpLfADyrq/kxDw0hZM7Wk9Ug1FELj8hIby+S/+kQCSRFF32nv2Qw==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "@types/prop-types": "*",
        "csstype": "^3.2.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "18.3.7",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-18.3.7.tgz",
      "integrity": "sha512-MEe3UeoENYVFXzoXEWsvcpg6ZvlrFNlOQ7EOsvhI3CfAXwzPfO8Qwuxd40nepsYKqyyVQnTdEfv68q91yLcKrQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "^18.0.0"
      }
    },
    "node_modules/@types/trusted-types": {
      "version": "2.0.7",
      "resolved": "https://registry.npmjs.org/@types/trusted-types/-/trusted-types-2.0.7.tgz",
      "integrity": "sha512-ScaPdn1dQczgbl0QFTeTOmVHFULt394XJgOQNoyVhZ6r2vLnMLJfBPd53SB52T/3G36VI1/g2MZaX0cwDuXsfw==",
      "license": "MIT",
      "optional": true
    },
    "node_modules/@types/ws": {
      "version": "8.18.2",
      "resolved": "https://registry.npmjs.org/@types/ws/-/ws-8.18.2.tgz",
      "integrity": "sha512-67MQl+fpWKVTT1NYdnmo3U4sc/xPo/zQBncVnI74qmQa0z/b+1g6iYqNmGCPbxO+zz2aklb08a0oHfegiVd0/w==",
      "license": "MIT",
      "dependencies": {
        "@types/node": "*"
      }
    },
    "node_modules/@typescript-eslint/eslint-plugin": {
      "version": "8.72.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/eslint-plugin/-/eslint-plugin-8.72.1.tgz",
      "integrity": "sha512-5CokTWXpmbylfFabsbvHC0CAw3XLaGnoa+nFJX5FR592h/LoZsENUE6p/rg5xvkKrFEXz6pYmgI29AgXc2N3BQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/regexpp": "^4.12.2",
        "@typescript-eslint/scope-manager": "8.72.1",
        "@typescript-eslint/type-utils": "8.72.1",
        "@typescript-eslint/utils": "8.72.1",
        "@typescript-eslint/visitor-keys": "8.72.1",
        "ignore": "^7.0.5",
        "natural-compare": "^1.4.0",
        "ts-api-utils": "^2.5.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "@typescript-eslint/parser": "^8.72.1",
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/eslint-plugin/node_modules/ignore": {
      "version": "7.0.14",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-7.0.14.tgz",
      "integrity": "sha512-wCBiZ77u1tuWde6G/nfOtLaCTYcFDU5yCzARzK10y+rLhzYoL7a7yEemcopcc2Mzow7gZOIjnV2ym1NYmdiJOQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/@typescript-eslint/parser": {
      "version": "8.72.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/parser/-/parser-8.72.1.tgz",
      "integrity": "sha512-ZGwZP4OCfyA0AQTpEAMWz+rtX01DRhQWW5hB0ucKDEIX5U7jdmPSaMx94rQfaPAQzIYz2BimOgKOJtjfpRFQ9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/scope-manager": "8.72.1",
        "@typescript-eslint/types": "8.72.1",
        "@typescript-eslint/typescript-estree": "8.72.1",
        "@typescript-eslint/visitor-keys": "8.72.1",
        "debug": "^4.4.3"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/project-service": {
      "version": "8.72.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/project-service/-/project-service-8.72.1.tgz",
      "integrity": "sha512-fAuVMkwdO/huI8nyo/WKnNKf6Gag93S56Rh3Ts5mGcavwSdaN8tRg1gCeIGX8PF+nzp1BjGfO4gHhGzW1J6jTg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/tsconfig-utils": "^8.72.1",
        "@typescript-eslint/types": "^8.72.1",
        "debug": "^4.4.3"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/scope-manager": {
      "version": "8.72.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/scope-manager/-/scope-manager-8.72.1.tgz",
      "integrity": "sha512-lC/t6eMCZZQAAKZEYGL6RDVSuFehpdmMT6h+nJIjIa6oylN/PwDgDVtEIbB7O9xFfZYtZAYLoLlDNWKJhtF+uQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.72.1",
        "@typescript-eslint/visitor-keys": "8.72.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/tsconfig-utils": {
      "version": "8.72.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/tsconfig-utils/-/tsconfig-utils-8.72.1.tgz",
      "integrity": "sha512-e4D5R5vpeAEPBxT2BAzsFQL3sbwyeeeo5+aczgNSRK1V734jE7pTqaGFU+fXapWEQwnZbpFaTn32+Z8DwS6OTg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/type-utils": {
      "version": "8.72.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/type-utils/-/type-utils-8.72.1.tgz",
      "integrity": "sha512-iY2wlmyrXJmx4yxUGP3aYCFF3cA/6ShddOKmLU2dx7LnEykbAM8WThlxZEfd1NddqceF6eJmZUayxx9oKIYNlg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.72.1",
        "@typescript-eslint/typescript-estree": "8.72.1",
        "@typescript-eslint/utils": "8.72.1",
        "debug": "^4.4.3",
        "ts-api-utils": "^2.5.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/types": {
      "version": "8.72.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/types/-/types-8.72.1.tgz",
      "integrity": "sha512-LmE5IhQet1BWOWEXqBrVtBPsMAOQ6Nzk35d+WLh3mk4EUF33sqlfxjio1MdYeSvKSG5skactKKuixBIKXhL4Rw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree": {
      "version": "8.72.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/typescript-estree/-/typescript-estree-8.72.1.tgz",
      "integrity": "sha512-DAlUoUV93hIvrtIQLwCbmZQYVZwOMhiHJrOVUUIWicFZaIYjTRqlY3I/NZevfkLmSqkNHRu2qYDcq9lrn16oOQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/project-service": "8.72.1",
        "@typescript-eslint/tsconfig-utils": "8.72.1",
        "@typescript-eslint/types": "8.72.1",
        "@typescript-eslint/visitor-keys": "8.72.1",
        "debug": "^4.4.3",
        "minimatch": "^10.2.2",
        "semver": "^7.7.3",
        "tinyglobby": "^0.2.15",
        "ts-api-utils": "^2.5.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/balanced-match": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-4.0.4.tgz",
      "integrity": "sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "18 || 20 || >=22"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion": {
      "version": "5.0.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.12.tgz",
      "integrity": "sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^4.0.2"
      },
      "engines": {
        "node": "20 || >=22"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch": {
      "version": "10.2.6",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-10.2.6.tgz",
      "integrity": "sha512-vpLQEs+VLCr1nU0BXS07maYoFwlDAH0gngQuuttxIwutDFEMHq2blX+8vpgxDdK3J1PwjCJiep77OitTZ4Ll1A==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "brace-expansion": "^5.0.8"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/semver": {
      "version": "7.8.5",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.8.5.tgz",
      "integrity": "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@typescript-eslint/utils": {
      "version": "8.72.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/utils/-/utils-8.72.1.tgz",
      "integrity": "sha512-5v5liypurJBFHCBNqh/RjsymAD+VWcE0djuGY/BUqp5fC3Qn+luWDEksjuTtWjPn6i5zQlUtkZCRG/CYG0yCkA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.9.1",
        "@typescript-eslint/scope-manager": "8.72.1",
        "@typescript-eslint/types": "8.72.1",
        "@typescript-eslint/typescript-estree": "8.72.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/visitor-keys": {
      "version": "8.72.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/visitor-keys/-/visitor-keys-8.72.1.tgz",
      "integrity": "sha512-SB8xqipSzZHUePCCLNeYxqnxq83X61/qzNhjQGbTfjxGZIeOEP7tBgWYX05Tcd6CgE02WdTJnh5b8kMZJ/+bnQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.72.1",
        "eslint-visitor-keys": "^5.0.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/visitor-keys/node_modules/eslint-visitor-keys": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-5.0.1.tgz",
      "integrity": "sha512-tD40eHxA35h0PEIZNeIjkHoDR4YjjJp34biM0mDvplBe//mB+IHCqHDGV7pxF+7MklTvighcCPPZC7ynWyjdTA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@vitejs/plugin-react": {
      "version": "4.7.0",
      "resolved": "https://registry.npmjs.org/@vitejs/plugin-react/-/plugin-react-4.7.0.tgz",
      "integrity": "sha512-gUu9hwfWvvEDBBmgtAowQCojwZmJ5mcLn3aufeCsitijs3+f2NsrPtlAWIR6OPiqljl96GVCUbLe0HyqIpVaoA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.28.0",
        "@babel/plugin-transform-react-jsx-self": "^7.27.1",
        "@babel/plugin-transform-react-jsx-source": "^7.27.1",
        "@rolldown/pluginutils": "1.0.0-beta.27",
        "@types/babel__core": "^7.20.5",
        "react-refresh": "^0.17.0"
      },
      "engines": {
        "node": "^14.18.0 || >=16.0.0"
      },
      "peerDependencies": {
        "vite": "^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0"
      }
    },
    "node_modules/@vitest/expect": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/expect/-/expect-3.2.7.tgz",
      "integrity": "sha512-E8eBXaKibuvH2pSZErOjdVb5vF4PbKYcrnluBTYxEk1l/VhhwZg1kZQsdtjq+CsF5CFydf2Rdkz7jDHKSisi3w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/chai": "^5.2.2",
        "@vitest/spy": "3.2.7",
        "@vitest/utils": "3.2.7",
        "chai": "^5.2.0",
        "tinyrainbow": "^2.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/@vitest/mocker": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/mocker/-/mocker-3.2.7.tgz",
      "integrity": "sha512-Trr0hYO9CM3Wj6ksWHRhK9IZpIY6wTMO5u/MqXurMxT57sWBaOPEtP3Oq60ihZuh5JsiagKfz95OcxdEP6dBrA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@vitest/spy": "3.2.7",
        "estree-walker": "^3.0.3",
        "magic-string": "^0.30.17"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      },
      "peerDependencies": {
        "msw": "^2.4.9",
        "vite": "^5.0.0 || ^6.0.0 || ^7.0.0-0"
      },
      "peerDependenciesMeta": {
        "msw": {
          "optional": true
        },
        "vite": {
          "optional": true
        }
      }
    },
    "node_modules/@vitest/pretty-format": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/pretty-format/-/pretty-format-3.2.7.tgz",
      "integrity": "sha512-KUHlwqVu0sRlhCdyPdQ/wBoTfRahjUky1MubOmYw9fWfIZy1gNoHpuaaQBPAaMaVYdQYHJLurzj8ECCj5OwTqA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "tinyrainbow": "^2.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/@vitest/runner": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/runner/-/runner-3.2.7.tgz",
      "integrity": "sha512-sB9y4ovltoQP+WaUPwmSxO9WIg9Ig694Di5PalVPsYHklAdE027mehpWF2SQSVq+k6sFgaivbTjTJwZLSHbedA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@vitest/utils": "3.2.7",
        "pathe": "^2.0.3",
        "strip-literal": "^3.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/@vitest/snapshot": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/snapshot/-/snapshot-3.2.7.tgz",
      "integrity": "sha512-7C+MwShwtBSI5Buwoyg3s/iY1eHL9PKAf+O1wVh/TdnjXUtkoL/9YQtre90i4MtNXM6edP1wJ2zOBpfCyhIS7g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@vitest/pretty-format": "3.2.7",
        "magic-string": "^0.30.17",
        "pathe": "^2.0.3"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/@vitest/spy": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/spy/-/spy-3.2.7.tgz",
      "integrity": "sha512-Q2eQGI6d2L/hBtZ0qNuKcAGid68XK6cv1xsoaIma6PaJhHPoqcEJhYpXZ/5myCMqkNgtP6UKuBhbc0nHKnrkuQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "tinyspy": "^4.0.3"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/@vitest/utils": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/utils/-/utils-3.2.7.tgz",
      "integrity": "sha512-x6BDOd7dyo3PFLY3I9/HJ25X/6OurhGXk2/B9gOZNPF7XDVjeBK4k01lQE5uvDpbuheErh91qYuE1E2OEjK3Rw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@vitest/pretty-format": "3.2.7",
        "loupe": "^3.1.4",
        "tinyrainbow": "^2.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/acorn": {
      "version": "8.19.0",
      "resolved": "https://registry.npmjs.org/acorn/-/acorn-8.19.0.tgz",
      "integrity": "sha512-oJlA3XiRm7Cyk6qFD2Jn8ak9B7jSy0qy00ADO3+8dpT0LSjFihQYv4C02LFCSYJV3Q37xYwwRy5m+IpIiUzqWw==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "acorn": "bin/acorn"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/acorn-jsx": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/acorn-jsx/-/acorn-jsx-5.3.2.tgz",
      "integrity": "sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "acorn": "^6.0.0 || ^7.0.0 || ^8.0.0"
      }
    },
    "node_modules/agent-base": {
      "version": "7.1.4",
      "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-7.1.4.tgz",
      "integrity": "sha512-MnA+YT8fwfJPgBx3m60MNqakm30XOkyIoH1y6huTQvC0PwZG7ki8NacLBcrPbNoo8vEZy7Jpuk7+jMO+CUovTQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/ajv": {
      "version": "6.15.0",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-6.15.0.tgz",
      "integrity": "sha512-fgFx7Hfoq60ytK2c7DhnF8jIvzYgOMxfugjLOSMHjLIPgenqa7S7oaagATUq99mV6IYvN2tRmC0wnTYX6iPbMw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.1",
        "fast-json-stable-stringify": "^2.0.0",
        "json-schema-traverse": "^0.4.1",
        "uri-js": "^4.2.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/ajv-formats": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/ajv-formats/-/ajv-formats-3.0.1.tgz",
      "integrity": "sha512-8iUql50EUR+uUcdRQ3HDqa6EVyo3docL8g5WJ3FNcWmu62IbkGUue/pEyLBW8VGKKucTPgqeks4fIU1DA4yowQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ajv": "^8.0.0"
      },
      "peerDependencies": {
        "ajv": "^8.0.0"
      },
      "peerDependenciesMeta": {
        "ajv": {
          "optional": true
        }
      }
    },
    "node_modules/ajv-formats/node_modules/ajv": {
      "version": "8.20.0",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-8.20.0.tgz",
      "integrity": "sha512-Thbli+OlOj+iMPYFBVBfJ3OmCAnaSyNn4M1vz9T6Gka5Jt9ba/HIR56joy65tY6kx/FCF5VXNB819Y7/GUrBGA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.3",
        "fast-uri": "^3.0.1",
        "json-schema-traverse": "^1.0.0",
        "require-from-string": "^2.0.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/ajv-formats/node_modules/json-schema-traverse": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-1.0.0.tgz",
      "integrity": "sha512-NM8/P9n3XjXhIZn1lLhkFaACTOURQXjWhV4BA/RnOv8xvgqtqpAX9IO4mRQxSx1Rlo4tqzeqb0sOlruaOy3dug==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/ansi-colors": {
      "version": "4.1.3",
      "resolved": "https://registry.npmjs.org/ansi-colors/-/ansi-colors-4.1.3.tgz",
      "integrity": "sha512-/6w/C21Pm1A7aZitlI5Ni/2J6FFQN8i1Cvz3kHABAAbw93v/NlvKdVOqz7CCWz/3iv/JplRSEEZ83XION15ovw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/any-promise": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/any-promise/-/any-promise-1.3.0.tgz",
      "integrity": "sha512-7UvmKalWRt1wgjL1RrGxoSJW/0QZFIegpeGvZG9kjp8vrRu55XTHbwnqq2GpXm9uLbcuhxm3IqX9OB4MZR1b2A==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/anymatch": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/anymatch/-/anymatch-3.1.3.tgz",
      "integrity": "sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "normalize-path": "^3.0.0",
        "picomatch": "^2.0.4"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/arg": {
      "version": "5.0.2",
      "resolved": "https://registry.npmjs.org/arg/-/arg-5.0.2.tgz",
      "integrity": "sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/argparse": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/argparse/-/argparse-2.0.1.tgz",
      "integrity": "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==",
      "dev": true,
      "license": "Python-2.0"
    },
    "node_modules/aria-query": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/aria-query/-/aria-query-5.3.0.tgz",
      "integrity": "sha512-b0P0sZPKtyu8HkeRAfCq0IfURZK+SuwMjY1UXGBU27wpAiTwQAIlq56IbIO+ytk/JjS1fMR14ee5WBBfKi5J6A==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "dequal": "^2.0.3"
      }
    },
    "node_modules/assertion-error": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/assertion-error/-/assertion-error-2.0.1.tgz",
      "integrity": "sha512-Izi8RQcffqCeNVgFigKli1ssklIbpHnCYc6AknXGYoB6grJqyeby7jv12JUQgmTAnIDnbck1uxksT4dzN3PWBA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/atomically": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/atomically/-/atomically-2.1.1.tgz",
      "integrity": "sha512-P4w9o2dqARji6P7MHprklbfiArZAWvo07yW7qs3pdljb3BWr12FIB7W+p0zJiuiVsUpRO0iZn1kFFcpPegg0tQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "stubborn-fs": "^2.0.0",
        "when-exit": "^2.1.4"
      }
    },
    "node_modules/autoprefixer": {
      "version": "10.6.2",
      "resolved": "https://registry.npmjs.org/autoprefixer/-/autoprefixer-10.6.2.tgz",
      "integrity": "sha512-VOw9/yGTGwPPgzFcODtcv6zhEPIeIWkRSe10L2ri2f5vZ7ID7lCt6jZzRF5/ubgOZ+szYydmEF5AYsA5jxX1tA==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/autoprefixer"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "browserslist": "^4.28.9",
        "caniuse-lite": "^1.0.30001810",
        "fraction.js": "^5.3.4",
        "picocolors": "^1.1.1",
        "postcss-value-parser": "^4.2.0"
      },
      "bin": {
        "autoprefixer": "bin/autoprefixer"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      },
      "peerDependencies": {
        "postcss": "^8.1.0"
      }
    },
    "node_modules/axe-core": {
      "version": "4.14.0",
      "resolved": "https://registry.npmjs.org/axe-core/-/axe-core-4.14.0.tgz",
      "integrity": "sha512-9WTZxEjsZ7b13TH8JPmbV2z8CHbl80/2hm3XPEG4JgNdQLK81IBRXmSxHfMAOkSqQeRxT/0dwNDz2GOm3zzpcQ==",
      "dev": true,
      "license": "MPL-2.0",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/baseline-browser-mapping": {
      "version": "2.11.34",
      "resolved": "https://registry.npmjs.org/baseline-browser-mapping/-/baseline-browser-mapping-2.11.34.tgz",
      "integrity": "sha512-Aqr8mA1kIvyJ3UY5YAY7ib8LSo1DmDMbMnVqGPtsKW1LxaFQFwn9Eb3yvq2fUKJsRvaXjnAV7R5osqETapzNiA==",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "baseline-browser-mapping": "dist/cli.cjs"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/binary-extensions": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/binary-extensions/-/binary-extensions-2.3.0.tgz",
      "integrity": "sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/brace-expansion": {
      "version": "1.1.21",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.21.tgz",
      "integrity": "sha512-9zeA+KLZNNzglF2TPKRQEDyx6Yby7daAkuy8MiPzpXPsYDWi/DRM8jmwUDxokQjYqBpv5DgPiwD4h4ZZSy1Ujw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/braces": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/braces/-/braces-3.0.3.tgz",
      "integrity": "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fill-range": "^7.1.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/browserslist": {
      "version": "4.29.5",
      "resolved": "https://registry.npmjs.org/browserslist/-/browserslist-4.29.5.tgz",
      "integrity": "sha512-khTmKu5NGYTotqcYo8Bew2k4RAE9PuXRSFRXG2lQBrCEQHyeQ/vX6gKMxfokwywBsLiXZMnHsmWMG1pnO8J7uQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "baseline-browser-mapping": "^2.11.33",
        "caniuse-lite": "^1.0.30001819",
        "electron-to-chromium": "^1.5.464",
        "node-releases": "^2.0.60",
        "update-browserslist-db": "^1.3.4"
      },
      "bin": {
        "browserslist": "cli.js"
      },
      "engines": {
        "node": "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7"
      }
    },
    "node_modules/bundle-name": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/bundle-name/-/bundle-name-4.1.1.tgz",
      "integrity": "sha512-DdH81/zPLVS11EUgWq3tEu/xn+EzljlMYooDNdzWEnFha3R3NBMpMV1UqYIpjYHV/SgpFKMIX1Oh7o06SjM/oA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "run-applescript": "^7.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/cac": {
      "version": "6.7.14",
      "resolved": "https://registry.npmjs.org/cac/-/cac-6.7.14.tgz",
      "integrity": "sha512-b6Ilus+c3RrdDk+JhLKUAQfzzgLEPy6wcXqS7f/xe1EETvsDP6GORG7SFuOs6cID5YkqchW/LXZbX5bc8j7ZcQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/callsites": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/callsites/-/callsites-3.1.0.tgz",
      "integrity": "sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/camelcase-css": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/camelcase-css/-/camelcase-css-2.0.1.tgz",
      "integrity": "sha512-QOSvevhslijgYwRx6Rv7zKdMF8lbRmx+uQGx2+vDc+KI/eBnsy9kit5aj23AgGu3pa4t9AgwbnXWqS+iOY+2aA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001820",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001820.tgz",
      "integrity": "sha512-gfWD6MxqVCqAOwmODfZf7DchWvlrA+SRdNX7ceLfg3xRqe5ssjjpF7EgslC/0tiLiNTajdaNN/q8c/5u/7Gz8w==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/chai": {
      "version": "5.3.3",
      "resolved": "https://registry.npmjs.org/chai/-/chai-5.3.3.tgz",
      "integrity": "sha512-4zNhdJD/iOjSH0A05ea+Ke6MU5mmpQcbQsSOkgdaUMJ9zTlDTD/GYlwohmIE2u0gaxHYiVHEn1Fw9mZ/ktJWgw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "assertion-error": "^2.0.1",
        "check-error": "^2.1.1",
        "deep-eql": "^5.0.1",
        "loupe": "^3.1.0",
        "pathval": "^2.0.0"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/chalk": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz",
      "integrity": "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.1.0",
        "supports-color": "^7.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/chalk?sponsor=1"
      }
    },
    "node_modules/check-error": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/check-error/-/check-error-2.1.3.tgz",
      "integrity": "sha512-PAJdDJusoxnwm1VwW07VWwUN1sl7smmC3OKggvndJFadxxDRyFJBX/ggnu/KE4kQAB7a3Dp8f/YXC1FlUprWmA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 16"
      }
    },
    "node_modules/chokidar": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/chokidar/-/chokidar-3.6.0.tgz",
      "integrity": "sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "anymatch": "~3.1.2",
        "braces": "~3.0.2",
        "glob-parent": "~5.1.2",
        "is-binary-path": "~2.1.0",
        "is-glob": "~4.0.1",
        "normalize-path": "~3.0.0",
        "readdirp": "~3.6.0"
      },
      "engines": {
        "node": ">= 8.10.0"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/chokidar/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/chrome-launcher": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/chrome-launcher/-/chrome-launcher-1.2.2.tgz",
      "integrity": "sha512-sI90u5qf3854bTrWsQMMdsQfSjjMbeSn7QtxVb9zrikf+QgMfHQ71KepHW7ZfixQKrDlAFKb+qnVlSR+xepBzw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@types/node": "*",
        "escape-string-regexp": "^4.0.0",
        "is-wsl": "^2.2.0",
        "lighthouse-logger": "^2.0.1"
      },
      "bin": {
        "print-chrome-path": "bin/print-chrome-path.cjs"
      },
      "engines": {
        "node": ">=12.13.0"
      }
    },
    "node_modules/chromium-bidi": {
      "version": "157.0.8090-0",
      "resolved": "https://registry.npmjs.org/chromium-bidi/-/chromium-bidi-157.0.8090-0.tgz",
      "integrity": "sha512-KJw7IQgqXwxpJgJlEIPg5mr2ZoqA+jkTRtc5EABI7sUJ3bu3cpI7NuEBoj4Gn1AsF78CaT9So5WQWspK3/wYag==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "mitt": "^3.0.1",
        "zod": "^4.6.5"
      },
      "engines": {
        "node": ">=20.19.0 <22.0.0 || >=22.12.0"
      },
      "peerDependencies": {
        "devtools-protocol": "*"
      }
    },
    "node_modules/chromium-bidi/node_modules/zod": {
      "version": "4.6.7",
      "resolved": "https://registry.npmjs.org/zod/-/zod-4.6.7.tgz",
      "integrity": "sha512-g8W2D2kU6a8untc053fX1uVBKzM7yqAxW/3zwk83+6RyF2+SKOuV+c0wBDhUwzV1PaGapmZH+rmcUzPf+3CGwg==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/colinhacks"
      }
    },
    "node_modules/cliui": {
      "version": "9.0.1",
      "resolved": "https://registry.npmjs.org/cliui/-/cliui-9.0.1.tgz",
      "integrity": "sha512-k7ndgKhwoQveBL+/1tqGJYNz097I7WOvwbmmU2AR5+magtbjPWQTS1C5vzGkBC8Ym8UWRzfKUzUUqFLypY4Q+w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "string-width": "^7.2.0",
        "strip-ansi": "^7.1.0",
        "wrap-ansi": "^9.0.0"
      },
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/cliui/node_modules/ansi-regex": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-6.5.0.tgz",
      "integrity": "sha512-zhvbbbdt1kbw7EJ9OQoxmQcuaNR9P5kTj7e/YdmOSU10aHWbycofJxA6jKfoEy3vlLdctOF9ZHaxLtmSm998wQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-regex?sponsor=1"
      }
    },
    "node_modules/cliui/node_modules/string-width": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-7.2.0.tgz",
      "integrity": "sha512-tsaTIkKW9b4N+AEj+SVA+WhJzV7/zMhcSu78mLKWSk7cXMOSHsBKFWUs0fWwq8QyK3MgJBQRX6Gbi4kYbdvGkQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^10.3.0",
        "get-east-asian-width": "^1.0.0",
        "strip-ansi": "^7.1.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/cliui/node_modules/strip-ansi": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-7.2.0.tgz",
      "integrity": "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^6.2.2"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/strip-ansi?sponsor=1"
      }
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/commander": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/commander/-/commander-4.1.1.tgz",
      "integrity": "sha512-NOKm8xhkzAjzFx8B2v5OAHT+u5pRQc2UCa2Vq9jYL/31o2wi9mxBA7LIFs3sV5VSC49z6pEhfbMULvShKj26WA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/concat-map": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
      "integrity": "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/configstore": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/configstore/-/configstore-8.0.0.tgz",
      "integrity": "sha512-U51WPZg+o6FDFhBCV6yYFEspGMCoHvCgJSGFw9AwsW2u75gYBPoDlYca5XfDs4TdMUu3/y0R6FFdvvgyH31mKQ==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "atomically": "^2.1.0",
        "dot-prop": "^10.1.0",
        "graceful-fs": "^4.2.11",
        "is-safe-filename": "^0.1.0",
        "xdg-basedir": "^5.1.0"
      },
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/convert-source-map": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/convert-source-map/-/convert-source-map-2.0.0.tgz",
      "integrity": "sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/cross-spawn": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz",
      "integrity": "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "path-key": "^3.1.0",
        "shebang-command": "^2.0.0",
        "which": "^2.0.1"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/csp_evaluator": {
      "version": "1.1.8",
      "resolved": "https://registry.npmjs.org/csp_evaluator/-/csp_evaluator-1.1.8.tgz",
      "integrity": "sha512-EwOnfYuNbTytvbMKsLixTrRgnjOa0WZCxGy8A9nnSYAicrdwn+T/epU/yjgymmOxlgKnvH+8wXt+7p/8ak5Feg==",
      "dev": true,
      "license": "Apache-2.0"
    },
    "node_modules/css.escape": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/css.escape/-/css.escape-1.5.1.tgz",
      "integrity": "sha512-YUifsXXuknHlUsmlgyY0PKzgPOr7/FjCePfHNt0jxm83wHZi44VDMQ7/fGNkjY3/jV1MC+1CmZbaHzugyeRtpg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/cssesc": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/cssesc/-/cssesc-3.0.0.tgz",
      "integrity": "sha512-/Tb/JcjK111nNScGob5MNtsntNM1aCNUDipB/TkwZFhyDrrE47SOx/18wF2bbjgc3ZzCSKW1T5nt5EbFoAz/Vg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "cssesc": "bin/cssesc"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/cssstyle": {
      "version": "4.6.0",
      "resolved": "https://registry.npmjs.org/cssstyle/-/cssstyle-4.6.0.tgz",
      "integrity": "sha512-2z+rWdzbbSZv6/rhtvzvqeZQHrBaqgogqt85sqFNbabZOuFbCVFb8kPeEtZjiKkbrm395irpNKiYeFeLiQnFPg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@asamuzakjp/css-color": "^3.2.0",
        "rrweb-cssom": "^0.8.0"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/csstype": {
      "version": "3.2.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.2.3.tgz",
      "integrity": "sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/data-urls": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/data-urls/-/data-urls-5.0.0.tgz",
      "integrity": "sha512-ZYP5VBHshaDAiVZxjbRVcFJpc+4xGgT0bK3vzy1HLN8jTO975HEbuYzZJcHoQEY5K1a0z8YayJkyVETa08eNTg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "whatwg-mimetype": "^4.0.0",
        "whatwg-url": "^14.0.0"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/data-urls/node_modules/tr46": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/tr46/-/tr46-5.1.1.tgz",
      "integrity": "sha512-hdF5ZgjTqgAntKkklYw0R03MG2x/bSzTtkxmIRw/sTNV8YXsCJ1tfLAX23lhxhHJlEf3CRCOCGGWw3vI3GaSPw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "punycode": "^2.3.1"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/data-urls/node_modules/whatwg-url": {
      "version": "14.2.0",
      "resolved": "https://registry.npmjs.org/whatwg-url/-/whatwg-url-14.2.0.tgz",
      "integrity": "sha512-De72GdQZzNTUBBChsXueQUnPKDkg/5A5zp7pFDuQAj5UFoENpiACU0wlCvzpAGnTkj++ihpKwKyYewn/XNUbKw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "tr46": "^5.1.0",
        "webidl-conversions": "^7.0.0"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/decimal.js": {
      "version": "10.6.0",
      "resolved": "https://registry.npmjs.org/decimal.js/-/decimal.js-10.6.0.tgz",
      "integrity": "sha512-YpgQiITW3JXGntzdUmyUR1V812Hn8T1YVXhCu+wO3OpS4eU9l4YdD3qjyiKdV6mvV29zapkMeD390UVEf2lkUg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/deep-eql": {
      "version": "5.0.2",
      "resolved": "https://registry.npmjs.org/deep-eql/-/deep-eql-5.0.2.tgz",
      "integrity": "sha512-h5k/5U50IJJFpzfL6nO9jaaumfjO/f2NjK/oYB2Djzm4p9L+3T9qWpZqZ2hAbLPuuYq9wrU08WQyBTL5GbPk5Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/deep-is": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/deep-is/-/deep-is-0.1.4.tgz",
      "integrity": "sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/default-browser": {
      "version": "5.5.1",
      "resolved": "https://registry.npmjs.org/default-browser/-/default-browser-5.5.1.tgz",
      "integrity": "sha512-m1pAzaJgZ/gssEqlOhJkPJp8Xly7QyW6xcrkUa2KKcDeDSEMP7X8xipU3snUcfisTQx0w1AGae+9UtJSfVnXGw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "bundle-name": "^4.1.0",
        "default-browser-id": "^5.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/default-browser-id": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/default-browser-id/-/default-browser-id-5.0.1.tgz",
      "integrity": "sha512-x1VCxdX4t+8wVfd1so/9w+vQ4vx7lKd2Qp5tDRutErwmR85OgmfX7RlLRMWafRMY7hbEiXIbudNrjOAPa/hL8Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/define-lazy-prop": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/define-lazy-prop/-/define-lazy-prop-3.0.0.tgz",
      "integrity": "sha512-N+MeXYoqr3pOgn8xfyRPREN7gHakLYjhsHhWGT3fWAiL4IkAt0iDw14QiiEm2bE30c5XX5q0FtAA3CK5f9/BUg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/dequal": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/dequal/-/dequal-2.0.3.tgz",
      "integrity": "sha512-0je+qPKHEMohvfRTCEo3CrPG6cAzAYgmzKyxRiYSSDkS6eGJdyVJm7WaYA5ECaAD9wLB2T4EEeymA5aFVcYXCA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/detect-libc": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
      "integrity": "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/devtools-protocol": {
      "version": "0.0.1727723",
      "resolved": "https://registry.npmjs.org/devtools-protocol/-/devtools-protocol-0.0.1727723.tgz",
      "integrity": "sha512-laxmpDN+zItbpy5klVbHqBsZ38O2rC6VwI9W5daM11Pc3Dj2gruc2wwnHW48CB8wYiWHALDkA6vRg92U2cfdLA==",
      "dev": true,
      "license": "BSD-3-Clause"
    },
    "node_modules/didyoumean": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/didyoumean/-/didyoumean-1.2.2.tgz",
      "integrity": "sha512-gxtyfqMg7GKyhQmb056K7M3xszy/myH8w+B4RT+QXBQsvAOdc3XymqDDPHx1BgPgsdAA5SIifona89YtRATDzw==",
      "dev": true,
      "license": "Apache-2.0"
    },
    "node_modules/dlv": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/dlv/-/dlv-1.1.3.tgz",
      "integrity": "sha512-+HlytyjlPKnIG8XuRG8WvmBP8xs8P71y+SKKS6ZXWoEgLuePxtDoUEiH7WkdePWrQ5JBpE6aoVqfZfJUQkjXwA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/dom-accessibility-api": {
      "version": "0.5.16",
      "resolved": "https://registry.npmjs.org/dom-accessibility-api/-/dom-accessibility-api-0.5.16.tgz",
      "integrity": "sha512-X7BJ2yElsnOJ30pZF4uIIDfBEVgF4XEBxL9Bxhy6dnrm5hkzqmsWHGTiHqRiITNhMyFLyAiWndIJP7Z1NTteDg==",
      "dev": true,
      "license": "MIT",
      "peer": true
    },
    "node_modules/dompurify": {
      "version": "3.4.17",
      "resolved": "https://registry.npmjs.org/dompurify/-/dompurify-3.4.17.tgz",
      "integrity": "sha512-B/pSlYVHQ58kqISD/yDjuJ1yfzI34m1gF4lAod2bwSRhiN4K5Cl3H8Af7hqB2PmTL911tdEudnnXn5FnhRoz0w==",
      "license": "(MPL-2.0 OR Apache-2.0)",
      "optionalDependencies": {
        "@types/trusted-types": "^2.0.7"
      }
    },
    "node_modules/dot-prop": {
      "version": "10.2.0",
      "resolved": "https://registry.npmjs.org/dot-prop/-/dot-prop-10.2.0.tgz",
      "integrity": "sha512-BTJ9aZYL3vCfZlZOBLy9v8TUqWGQ0pzFnygKwFZt5udj6viBoFIBviKPUoZLDCPn1FoXffv6McQFDenrm5Krfw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "type-fest": "^5.0.0"
      },
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/dotenv": {
      "version": "17.4.2",
      "resolved": "https://registry.npmjs.org/dotenv/-/dotenv-17.4.2.tgz",
      "integrity": "sha512-nI4U3TottKAcAD9LLud4Cb7b2QztQMUEfHbvhTH09bqXTxnSie8WnjPALV/WMCrJZ6UV/qHJ6L03OqO3LcdYZw==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://dotenvx.com"
      }
    },
    "node_modules/electron-to-chromium": {
      "version": "1.5.472",
      "resolved": "https://registry.npmjs.org/electron-to-chromium/-/electron-to-chromium-1.5.472.tgz",
      "integrity": "sha512-s4+nfT29b0FKpVKoaIxl2pWsoNcn7A/nMPSrxayw4T3BsmPeV2lF9Y06BsAQeMGhCTQ4nYJ5XST7jkqe4ZEqFw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/emoji-regex": {
      "version": "10.6.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-10.6.0.tgz",
      "integrity": "sha512-toUI84YS5YmxW219erniWD0CIVOo46xGKColeNQRgOzDorgBi1v4D71/OFzgD9GO2UGKIv1C3Sp8DAn0+j5w7A==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/enquirer": {
      "version": "2.4.1",
      "resolved": "https://registry.npmjs.org/enquirer/-/enquirer-2.4.1.tgz",
      "integrity": "sha512-rRqJg/6gd538VHvR3PSrdRBb/1Vy2YfzHqzvbhGIQpDRKIa4FgV/54b5Q1xYSxOOwKvjXweS26E0Q+nAMwp2pQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-colors": "^4.1.1",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8.6"
      }
    },
    "node_modules/entities": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/entities/-/entities-6.0.1.tgz",
      "integrity": "sha512-aN97NXWF6AWBTahfVOIrB/NShkzi5H7F9r1s9mD3cDj4Ko5f2qhhVoYMibXF7GlLveb/D2ioWay8lxI97Ven3g==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.12"
      },
      "funding": {
        "url": "https://github.com/fb55/entities?sponsor=1"
      }
    },
    "node_modules/es-errors": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-module-lexer": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/es-module-lexer/-/es-module-lexer-1.7.0.tgz",
      "integrity": "sha512-jEQoCwk8hyb2AZziIOLhDqpm5+2ww5uIE6lkO/6jcOCusfk6LhMHpXXfBLXTZ7Ydyt0j4VoUQv6uGNYbdW+kBA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/esbuild": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/esbuild/-/esbuild-0.25.12.tgz",
      "integrity": "sha512-bbPBYYrtZbkt6Os6FiTLCTFxvq4tt3JKall1vRwshA3fdVztsLAatFaZobhkBC8/BrPetoa0oksYoKXoG4ryJg==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "bin": {
        "esbuild": "bin/esbuild"
      },
      "engines": {
        "node": ">=18"
      },
      "optionalDependencies": {
        "@esbuild/aix-ppc64": "0.25.12",
        "@esbuild/android-arm": "0.25.12",
        "@esbuild/android-arm64": "0.25.12",
        "@esbuild/android-x64": "0.25.12",
        "@esbuild/darwin-arm64": "0.25.12",
        "@esbuild/darwin-x64": "0.25.12",
        "@esbuild/freebsd-arm64": "0.25.12",
        "@esbuild/freebsd-x64": "0.25.12",
        "@esbuild/linux-arm": "0.25.12",
        "@esbuild/linux-arm64": "0.25.12",
        "@esbuild/linux-ia32": "0.25.12",
        "@esbuild/linux-loong64": "0.25.12",
        "@esbuild/linux-mips64el": "0.25.12",
        "@esbuild/linux-ppc64": "0.25.12",
        "@esbuild/linux-riscv64": "0.25.12",
        "@esbuild/linux-s390x": "0.25.12",
        "@esbuild/linux-x64": "0.25.12",
        "@esbuild/netbsd-arm64": "0.25.12",
        "@esbuild/netbsd-x64": "0.25.12",
        "@esbuild/openbsd-arm64": "0.25.12",
        "@esbuild/openbsd-x64": "0.25.12",
        "@esbuild/openharmony-arm64": "0.25.12",
        "@esbuild/sunos-x64": "0.25.12",
        "@esbuild/win32-arm64": "0.25.12",
        "@esbuild/win32-ia32": "0.25.12",
        "@esbuild/win32-x64": "0.25.12"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/escape-string-regexp": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz",
      "integrity": "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/eslint": {
      "version": "9.39.5",
      "resolved": "https://registry.npmjs.org/eslint/-/eslint-9.39.5.tgz",
      "integrity": "sha512-DgZS62aPLXKlnxILS/AYCoRvHaZeXceIzlXPkkGGzJWSow1aEk0lbTlxUSlyjC8jcaKxAdOnTDz+o1JFSBsyjw==",
      "deprecated": "This version is no longer supported. Please see https://eslint.org/version-support for other options.",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.8.0",
        "@eslint-community/regexpp": "^4.12.1",
        "@eslint/config-array": "^0.21.2",
        "@eslint/config-helpers": "^0.4.2",
        "@eslint/core": "^0.17.0",
        "@eslint/eslintrc": "^3.3.6",
        "@eslint/js": "9.39.5",
        "@eslint/plugin-kit": "^0.4.1",
        "@humanfs/node": "^0.16.6",
        "@humanwhocodes/module-importer": "^1.0.1",
        "@humanwhocodes/retry": "^0.4.2",
        "@types/estree": "^1.0.6",
        "ajv": "^6.14.0",
        "chalk": "^4.0.0",
        "cross-spawn": "^7.0.6",
        "debug": "^4.3.2",
        "escape-string-regexp": "^4.0.0",
        "eslint-scope": "^8.4.0",
        "eslint-visitor-keys": "^4.2.1",
        "espree": "^10.4.0",
        "esquery": "^1.5.0",
        "esutils": "^2.0.2",
        "fast-deep-equal": "^3.1.3",
        "file-entry-cache": "^8.0.0",
        "find-up": "^5.0.0",
        "glob-parent": "^6.0.2",
        "ignore": "^5.2.0",
        "imurmurhash": "^0.1.4",
        "is-glob": "^4.0.0",
        "json-stable-stringify-without-jsonify": "^1.0.1",
        "lodash.merge": "^4.6.2",
        "minimatch": "^3.1.5",
        "natural-compare": "^1.4.0",
        "optionator": "^0.9.3"
      },
      "bin": {
        "eslint": "bin/eslint.js"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      },
      "peerDependencies": {
        "jiti": "*"
      },
      "peerDependenciesMeta": {
        "jiti": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-plugin-react-hooks": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-hooks/-/eslint-plugin-react-hooks-5.2.0.tgz",
      "integrity": "sha512-+f15FfK64YQwZdJNELETdn5ibXEUQmW1DZL6KXhNnc2heoy/sg9VJJeT7n8TlMWouzWqSWavFkIhHyIbIAEapg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "eslint": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0"
      }
    },
    "node_modules/eslint-plugin-react-refresh": {
      "version": "0.4.26",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-refresh/-/eslint-plugin-react-refresh-0.4.26.tgz",
      "integrity": "sha512-1RETEylht2O6FM/MvgnyvT+8K21wLqDNg4qD51Zj3guhjt433XbnnkVttHMyaVyAFD03QSV4LPS5iE3VQmO7XQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "eslint": ">=8.40"
      }
    },
    "node_modules/eslint-scope": {
      "version": "8.4.0",
      "resolved": "https://registry.npmjs.org/eslint-scope/-/eslint-scope-8.4.0.tgz",
      "integrity": "sha512-sNXOfKCn74rt8RICKMvJS7XKV/Xk9kA7DyJr8mJik3S7Cwgy3qlkkmyS2uQB3jiJg6VNdZd/pDBJu0nvG2NlTg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "esrecurse": "^4.3.0",
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint-visitor-keys": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-4.2.1.tgz",
      "integrity": "sha512-Uhdk5sfqcee/9H/rCOJikYz67o0a2Tw2hGRPOG2Y1R2dg7brRe1uG0yaNQDHu+TO/uQPF/5eCapvYSmHUjt7JQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/espree": {
      "version": "10.4.0",
      "resolved": "https://registry.npmjs.org/espree/-/espree-10.4.0.tgz",
      "integrity": "sha512-j6PAQ2uUr79PZhBjP5C5fhl8e39FmRnOjsD5lGnWrFU8i2G776tBK7+nP8KuQUTTyAZUwfQqXAgrVH5MbH9CYQ==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "acorn": "^8.15.0",
        "acorn-jsx": "^5.3.2",
        "eslint-visitor-keys": "^4.2.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/esquery": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/esquery/-/esquery-1.7.0.tgz",
      "integrity": "sha512-Ap6G0WQwcU/LHsvLwON1fAQX9Zp0A2Y6Y/cJBl9r/JbW90Zyg4/zbG6zzKa2OTALELarYHmKu0GhpM5EO+7T0g==",
      "dev": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "estraverse": "^5.1.0"
      },
      "engines": {
        "node": ">=0.10"
      }
    },
    "node_modules/esrecurse": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/esrecurse/-/esrecurse-4.3.0.tgz",
      "integrity": "sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/estraverse": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/estraverse/-/estraverse-5.3.0.tgz",
      "integrity": "sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/estree-walker": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/estree-walker/-/estree-walker-3.0.3.tgz",
      "integrity": "sha512-7RUKfXgSMMkzt6ZuXmqapOurLGPPfgj6l9uRZ7lRGolvk0y2yocc35LdcxKC5PQZdn2DMqioAQ2NoWcrTKmm6g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/estree": "^1.0.0"
      }
    },
    "node_modules/esutils": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/esutils/-/esutils-2.0.3.tgz",
      "integrity": "sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/expect-type": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/expect-type/-/expect-type-1.4.0.tgz",
      "integrity": "sha512-KfYbmpRm0VbLjEvVa9yGwCi9GI34xvi7A/HXYWQO65CSD2u3MczUJSuwXKFIxlGsgBQizV9q5J9NHj4VG0n+pA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=12.0.0"
      }
    },
    "node_modules/fast-deep-equal": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
      "integrity": "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-glob": {
      "version": "3.3.3",
      "resolved": "https://registry.npmjs.org/fast-glob/-/fast-glob-3.3.3.tgz",
      "integrity": "sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "^2.0.2",
        "@nodelib/fs.walk": "^1.2.3",
        "glob-parent": "^5.1.2",
        "merge2": "^1.3.0",
        "micromatch": "^4.0.8"
      },
      "engines": {
        "node": ">=8.6.0"
      }
    },
    "node_modules/fast-glob/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/fast-json-stable-stringify": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/fast-json-stable-stringify/-/fast-json-stable-stringify-2.1.0.tgz",
      "integrity": "sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-levenshtein": {
      "version": "2.0.6",
      "resolved": "https://registry.npmjs.org/fast-levenshtein/-/fast-levenshtein-2.0.6.tgz",
      "integrity": "sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-uri": {
      "version": "3.1.9",
      "resolved": "https://registry.npmjs.org/fast-uri/-/fast-uri-3.1.9.tgz",
      "integrity": "sha512-hS/0Wt3Ya043oKXs0sIxrMpKQITXhMLIrVAKKXi4gozGC9v7YRWVnXIZzjNPTO02M9BdxLCWqK1yRXgNziVyJQ==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "BSD-3-Clause"
    },
    "node_modules/fastq": {
      "version": "1.20.3",
      "resolved": "https://registry.npmjs.org/fastq/-/fastq-1.20.3.tgz",
      "integrity": "sha512-XKv5nnLs6nLF71NgiKJLIZFLkPyIEuOselLG7ujZnGrRfQK8HpvY+WqKhAJUAdLomwVHErVS4LfxFlPq0/FTAw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "reusify": "^1.0.4"
      }
    },
    "node_modules/file-entry-cache": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/file-entry-cache/-/file-entry-cache-8.0.0.tgz",
      "integrity": "sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flat-cache": "^4.0.0"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/fill-range": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/fill-range/-/fill-range-7.1.1.tgz",
      "integrity": "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "to-regex-range": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/find-up": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/find-up/-/find-up-5.0.0.tgz",
      "integrity": "sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "locate-path": "^6.0.0",
        "path-exists": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/flat-cache": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/flat-cache/-/flat-cache-4.0.1.tgz",
      "integrity": "sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flatted": "^3.2.9",
        "keyv": "^4.5.4"
      },
      "engines": {
        "node": ">=16"
      }
    },
    "node_modules/flatted": {
      "version": "3.4.4",
      "resolved": "https://registry.npmjs.org/flatted/-/flatted-3.4.4.tgz",
      "integrity": "sha512-5+ybhBZANEJxaH3X5evAFatUxLfEHSr7n6kYJ+1Qd0mUqr4eu9gIf6GDbWHf8RJijHrjjO8G+la14SlL2SeS1Q==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/fraction.js": {
      "version": "5.3.4",
      "resolved": "https://registry.npmjs.org/fraction.js/-/fraction.js-5.3.4.tgz",
      "integrity": "sha512-1X1NTtiJphryn/uLQz3whtY6jK3fTqoE3ohKs0tT+Ujr1W59oopxmoEh7Lu5p6vBaPbgoM0bzveAW4Qi5RyWDQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "*"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/rawify"
      }
    },
    "node_modules/framer-motion": {
      "version": "12.43.0",
      "resolved": "https://registry.npmjs.org/framer-motion/-/framer-motion-12.43.0.tgz",
      "integrity": "sha512-1eaL3RvR/kAlbG7UYcpMptEyzPoENO0c6w7ZnB3/hh2vSAz/6uGAFn6fdoqTBguNstf3MsFhJHsD/0DHiclG+g==",
      "license": "MIT",
      "dependencies": {
        "motion-dom": "^12.43.0",
        "motion-utils": "^12.39.0",
        "tslib": "^2.4.0"
      },
      "peerDependencies": {
        "@emotion/is-prop-valid": "*",
        "react": "^18.0.0 || ^19.0.0",
        "react-dom": "^18.0.0 || ^19.0.0"
      },
      "peerDependenciesMeta": {
        "@emotion/is-prop-valid": {
          "optional": true
        },
        "react": {
          "optional": true
        },
        "react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/gensync": {
      "version": "1.0.0-beta.2",
      "resolved": "https://registry.npmjs.org/gensync/-/gensync-1.0.0-beta.2.tgz",
      "integrity": "sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/get-caller-file": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/get-caller-file/-/get-caller-file-2.0.5.tgz",
      "integrity": "sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": "6.* || 8.* || >= 10.*"
      }
    },
    "node_modules/get-east-asian-width": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/get-east-asian-width/-/get-east-asian-width-1.7.0.tgz",
      "integrity": "sha512-XjH1AECxf0giL2V1aU8vKyRR2ppRUb5c0EvT7zuJTokQ74bNo52zOtghqdWIqrhUD79fo3x0WfKZdOqxF6LG1Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/glob": {
      "version": "13.0.6",
      "resolved": "https://registry.npmjs.org/glob/-/glob-13.0.6.tgz",
      "integrity": "sha512-Wjlyrolmm8uDpm/ogGyXZXb1Z+Ca2B8NbJwqBVg0axK9GbBeoS7yGV6vjXnYdGm6X53iehEuxxbyiKp8QmN4Vw==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "minimatch": "^10.2.2",
        "minipass": "^7.1.3",
        "path-scurry": "^2.0.2"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/glob-parent": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-6.0.2.tgz",
      "integrity": "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/glob/node_modules/balanced-match": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-4.0.4.tgz",
      "integrity": "sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "18 || 20 || >=22"
      }
    },
    "node_modules/glob/node_modules/brace-expansion": {
      "version": "5.0.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.12.tgz",
      "integrity": "sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^4.0.2"
      },
      "engines": {
        "node": "20 || >=22"
      }
    },
    "node_modules/glob/node_modules/minimatch": {
      "version": "10.2.6",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-10.2.6.tgz",
      "integrity": "sha512-vpLQEs+VLCr1nU0BXS07maYoFwlDAH0gngQuuttxIwutDFEMHq2blX+8vpgxDdK3J1PwjCJiep77OitTZ4Ll1A==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "brace-expansion": "^5.0.8"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/globals": {
      "version": "16.5.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-16.5.0.tgz",
      "integrity": "sha512-c/c15i26VrJ4IRt5Z89DnIzCGDn9EcebibhAOjw5ibqEHsE1wLUgkPn9RDmNcUKyU87GeaL633nyJ+pplFR2ZQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/graceful-fs": {
      "version": "4.2.11",
      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/has-flag": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-4.0.0.tgz",
      "integrity": "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.4.tgz",
      "integrity": "sha512-T2UbfbBEF32wiepXIsMlTW9+dDYC6wMh/t/vYA4tuOMKqWz/n3vr1NFSxQiyP+zk2mXsoMA/i/7qV6LKut1t1A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/html-encoding-sniffer": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/html-encoding-sniffer/-/html-encoding-sniffer-4.0.0.tgz",
      "integrity": "sha512-Y22oTqIU4uuPgEemfz7NDJz6OeKf12Lsu+QC+s3BVpda64lTiMYCyGwg5ki4vFxkMwQdeZDl2adZoqUgdFuTgQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "whatwg-encoding": "^3.1.1"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/http-link-header": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/http-link-header/-/http-link-header-1.1.4.tgz",
      "integrity": "sha512-xT3GPW6/ZbGuw4UvwHqErSCEjNUlwbQJuZn9/q5U4WEKfp2kENVCAlousG1zLxHeaQ/ffOHUNpWamvkbBW0eNw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/http-proxy-agent": {
      "version": "7.0.2",
      "resolved": "https://registry.npmjs.org/http-proxy-agent/-/http-proxy-agent-7.0.2.tgz",
      "integrity": "sha512-T1gkAiYYDWYx3V5Bmyu7HcfcvL7mUrTWiM6yOfa3PIphViJ/gFPbvidQ+veqSOHci/PxBcDabeUNCzpOODJZig==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "agent-base": "^7.1.0",
        "debug": "^4.3.4"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/https-proxy-agent": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-7.0.6.tgz",
      "integrity": "sha512-vK9P5/iUfdl95AI+JVyUuIcVtd4ofvtrOr3HNtM2yxC9bnMbEdp3x01OhQNnjb8IJYi38VlTE3mBXwcfvywuSw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "agent-base": "^7.1.2",
        "debug": "4"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/iconv-lite": {
      "version": "0.6.3",
      "resolved": "https://registry.npmjs.org/iconv-lite/-/iconv-lite-0.6.3.tgz",
      "integrity": "sha512-4fCk79wshMdzMp2rH06qWrJE4iolqLhCUH+OiuIgU++RB0+94NlDL81atO7GX55uUKueo0txHNtvEyI6D7WdMw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "safer-buffer": ">= 2.1.2 < 3.0.0"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/ignore": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
      "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/image-ssim": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/image-ssim/-/image-ssim-0.2.0.tgz",
      "integrity": "sha512-W7+sO6/yhxy83L0G7xR8YAc5Z5QFtYEXXRV6EaE8tuYBZJnA3gVgp3q7X7muhLZVodeb9UfvjSbwt9VJwjIYAg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/import-fresh": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/import-fresh/-/import-fresh-3.3.1.tgz",
      "integrity": "sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "parent-module": "^1.0.0",
        "resolve-from": "^4.0.0"
      },
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/imurmurhash": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/imurmurhash/-/imurmurhash-0.1.4.tgz",
      "integrity": "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.8.19"
      }
    },
    "node_modules/indent-string": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/indent-string/-/indent-string-4.0.0.tgz",
      "integrity": "sha512-EdDDZu4A2OyIK7Lr/2zG+w5jmbuk1DVBnEwREQvBzspBJkCEbRa8GxU1lghYcaGJCnRWibjDXlq779X1/y5xwg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/intl-messageformat": {
      "version": "10.7.18",
      "resolved": "https://registry.npmjs.org/intl-messageformat/-/intl-messageformat-10.7.18.tgz",
      "integrity": "sha512-m3Ofv/X/tV8Y3tHXLohcuVuhWKo7BBq62cqY15etqmLxg2DZ34AGGgQDeR+SCta2+zICb1NX83af0GJmbQ1++g==",
      "dev": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "@formatjs/ecma402-abstract": "2.3.6",
        "@formatjs/fast-memoize": "2.2.7",
        "@formatjs/icu-messageformat-parser": "2.11.4",
        "tslib": "^2.8.0"
      }
    },
    "node_modules/invariant": {
      "version": "2.2.4",
      "resolved": "https://registry.npmjs.org/invariant/-/invariant-2.2.4.tgz",
      "integrity": "sha512-phJfQVBuaJM5raOpJjSfkiD6BpbCE4Ns//LaXl6wGYtUBY83nWS6Rf9tXm2e8VaK60JEjYldbPif/A2B1C2gNA==",
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.0.0"
      }
    },
    "node_modules/is-binary-path": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/is-binary-path/-/is-binary-path-2.1.0.tgz",
      "integrity": "sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "binary-extensions": "^2.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-core-module": {
      "version": "2.17.0",
      "resolved": "https://registry.npmjs.org/is-core-module/-/is-core-module-2.17.0.tgz",
      "integrity": "sha512-J/vG0zBCbIKOQFfufSwyXdMrsohyJIUNkrnmo6WZGzoM7tr/lsbfW5b2BvisL6zsyMzK9UxV9L6c7AoFbyXHOA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "hasown": "^2.0.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-docker": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/is-docker/-/is-docker-2.2.1.tgz",
      "integrity": "sha512-F+i2BKsFrH66iaUFc0woD8sLy8getkwTwtOBjvs56Cx4CgJDeKQeqfz8wAYiSb8JOprWhHH5p77PbmYCvvUuXQ==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "is-docker": "cli.js"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-extglob": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz",
      "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-glob": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/is-glob/-/is-glob-4.0.3.tgz",
      "integrity": "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-extglob": "^2.1.1"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-in-ssh": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/is-in-ssh/-/is-in-ssh-1.0.0.tgz",
      "integrity": "sha512-jYa6Q9rH90kR1vKB6NM7qqd1mge3Fx4Dhw5TVlK1MUBqhEOuCagrEHMevNuCcbECmXZ0ThXkRm+Ymr51HwEPAw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-inside-container": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/is-inside-container/-/is-inside-container-1.0.0.tgz",
      "integrity": "sha512-KIYLCCJghfHZxqjYBE7rEy0OBuTd5xCHS7tHVgvCLkx7StIoaxwNW3hCALgEUjFfeRk+MG/Qxmp/vtETEF3tRA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-docker": "^3.0.0"
      },
      "bin": {
        "is-inside-container": "cli.js"
      },
      "engines": {
        "node": ">=14.16"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-inside-container/node_modules/is-docker": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-docker/-/is-docker-3.0.0.tgz",
      "integrity": "sha512-eljcgEDlEns/7AXFosB5K/2nCM4P7FQPkGc/DWLy5rmFEWvZayGrik1d9/QIY5nJ4f9YsVvBkA6kJpHn9rISdQ==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "is-docker": "cli.js"
      },
      "engines": {
        "node": "^12.20.0 || ^14.13.1 || >=16.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-number": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz",
      "integrity": "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.12.0"
      }
    },
    "node_modules/is-potential-custom-element-name": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/is-potential-custom-element-name/-/is-potential-custom-element-name-1.0.1.tgz",
      "integrity": "sha512-bCYeRA2rVibKZd+s2625gGnGF/t7DSqDs4dP7CrLA1m7jKWz6pps0LpYLJN8Q64HtmPKJ1hrN3nzPNKFEKOUiQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/is-safe-filename": {
      "version": "0.1.1",
      "resolved": "https://registry.npmjs.org/is-safe-filename/-/is-safe-filename-0.1.1.tgz",
      "integrity": "sha512-4SrR7AdnY11LHfDKTZY1u6Ga3RuxZdl3YKWWShO5iyuG5h8QS4GD2tOb04peBJ5I7pXbR+CGBNEhTcwK+FzN3g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-wsl": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/is-wsl/-/is-wsl-2.2.0.tgz",
      "integrity": "sha512-fKzAra0rGJUUBwGBgNkHZuToZcn+TtXHpeCgmkMJMMYx1sQDYaCSyjJBSCa2nH1DGm7s3n1oBnohoVTBaN7Lww==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-docker": "^2.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/isexe": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
      "integrity": "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/jiti": {
      "version": "1.21.7",
      "resolved": "https://registry.npmjs.org/jiti/-/jiti-1.21.7.tgz",
      "integrity": "sha512-/imKNG4EbWNrVjoNC/1H5/9GFy+tqjGBHCaSsN+P2RnPqjsLmv6UD3Ej+Kj8nBWaRAwyk7kK5ZUc+OEatnTR3A==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "jiti": "bin/jiti.js"
      }
    },
    "node_modules/jpeg-js": {
      "version": "0.4.4",
      "resolved": "https://registry.npmjs.org/jpeg-js/-/jpeg-js-0.4.4.tgz",
      "integrity": "sha512-WZzeDOEtTOBK4Mdsar0IqEU5sMr3vSV2RqkAIzUEV2BHnUfKGyswWFPFwK5EeDo93K3FohSHbLAjj0s1Wzd+dg==",
      "dev": true,
      "license": "BSD-3-Clause"
    },
    "node_modules/js-library-detector": {
      "version": "6.7.0",
      "resolved": "https://registry.npmjs.org/js-library-detector/-/js-library-detector-6.7.0.tgz",
      "integrity": "sha512-c80Qupofp43y4cJ7+8TTDN/AsDwLi5oOm/plBrWI+iQt485vKXCco+yVmOwEgdo9VOdsYTuV0UlTeetVPTriXA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/js-tokens": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-4.0.0.tgz",
      "integrity": "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==",
      "license": "MIT"
    },
    "node_modules/js-yaml": {
      "version": "4.3.2",
      "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-4.3.2.tgz",
      "integrity": "sha512-SFNOvSJ+Dgf/9An904Yx+CgSlIPCkIpao4qo51lpee25TIRejdH3rhR4EZMGoNx3/TP3O+wzWuiTFl4sqbltzA==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/puzrin"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/nodeca"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "argparse": "^2.0.1"
      },
      "bin": {
        "js-yaml": "bin/js-yaml.js"
      }
    },
    "node_modules/jsdom": {
      "version": "26.1.0",
      "resolved": "https://registry.npmjs.org/jsdom/-/jsdom-26.1.0.tgz",
      "integrity": "sha512-Cvc9WUhxSMEo4McES3P7oK3QaXldCfNWp7pl2NNeiIFlCoLr3kfq9kb1fxftiwk1FLV7CvpvDfonxtzUDeSOPg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "cssstyle": "^4.2.1",
        "data-urls": "^5.0.0",
        "decimal.js": "^10.5.0",
        "html-encoding-sniffer": "^4.0.0",
        "http-proxy-agent": "^7.0.2",
        "https-proxy-agent": "^7.0.6",
        "is-potential-custom-element-name": "^1.0.1",
        "nwsapi": "^2.2.16",
        "parse5": "^7.2.1",
        "rrweb-cssom": "^0.8.0",
        "saxes": "^6.0.0",
        "symbol-tree": "^3.2.4",
        "tough-cookie": "^5.1.1",
        "w3c-xmlserializer": "^5.0.0",
        "webidl-conversions": "^7.0.0",
        "whatwg-encoding": "^3.1.1",
        "whatwg-mimetype": "^4.0.0",
        "whatwg-url": "^14.1.1",
        "ws": "^8.18.0",
        "xml-name-validator": "^5.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "peerDependencies": {
        "canvas": "^3.0.0"
      },
      "peerDependenciesMeta": {
        "canvas": {
          "optional": true
        }
      }
    },
    "node_modules/jsdom/node_modules/tr46": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/tr46/-/tr46-5.1.1.tgz",
      "integrity": "sha512-hdF5ZgjTqgAntKkklYw0R03MG2x/bSzTtkxmIRw/sTNV8YXsCJ1tfLAX23lhxhHJlEf3CRCOCGGWw3vI3GaSPw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "punycode": "^2.3.1"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/jsdom/node_modules/whatwg-url": {
      "version": "14.2.0",
      "resolved": "https://registry.npmjs.org/whatwg-url/-/whatwg-url-14.2.0.tgz",
      "integrity": "sha512-De72GdQZzNTUBBChsXueQUnPKDkg/5A5zp7pFDuQAj5UFoENpiACU0wlCvzpAGnTkj++ihpKwKyYewn/XNUbKw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "tr46": "^5.1.0",
        "webidl-conversions": "^7.0.0"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/jsesc": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/jsesc/-/jsesc-3.1.0.tgz",
      "integrity": "sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "jsesc": "bin/jsesc"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/json-buffer": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/json-buffer/-/json-buffer-3.0.1.tgz",
      "integrity": "sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-schema-traverse": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-0.4.1.tgz",
      "integrity": "sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-stable-stringify-without-jsonify": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/json-stable-stringify-without-jsonify/-/json-stable-stringify-without-jsonify-1.0.1.tgz",
      "integrity": "sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json5": {
      "version": "2.2.3",
      "resolved": "https://registry.npmjs.org/json5/-/json5-2.2.3.tgz",
      "integrity": "sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "json5": "lib/cli.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/keyv": {
      "version": "4.5.4",
      "resolved": "https://registry.npmjs.org/keyv/-/keyv-4.5.4.tgz",
      "integrity": "sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "json-buffer": "3.0.1"
      }
    },
    "node_modules/levn": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/levn/-/levn-0.4.1.tgz",
      "integrity": "sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1",
        "type-check": "~0.4.0"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/lighthouse": {
      "version": "13.6.0",
      "resolved": "https://registry.npmjs.org/lighthouse/-/lighthouse-13.6.0.tgz",
      "integrity": "sha512-2/HUPUpQyGm01VEgYCUjSlNZY7Zkhk1v3QI4c7UTbnaoRB7HF0qYMPzzaiidNf5iqw5wnmtm9LpGawKKqCfLmg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@paulirish/trace_engine": "0.0.67",
        "@sentry/node": "^11.8.0",
        "ajv-formats": "^3.0.1",
        "axe-core": "4.14.0",
        "chrome-launcher": "^1.2.2",
        "configstore": "^8.0.0",
        "csp_evaluator": "1.1.8",
        "devtools-protocol": "0.0.1727723",
        "enquirer": "^2.3.6",
        "http-link-header": "^1.1.1",
        "intl-messageformat": "^10.5.3",
        "js-library-detector": "^6.7.0",
        "lighthouse-logger": "^2.0.2",
        "lighthouse-stack-packs": "1.12.3",
        "open": "^11.0.4",
        "puppeteer-core": "^25.16.0",
        "robots-parser": "^3.0.1",
        "speedline-core": "^1.4.3",
        "third-party-web": "^0.30.0",
        "tldts-icann": "^7.4.19",
        "yargs": "^18.2.0",
        "yargs-parser": "^22.0.0"
      },
      "bin": {
        "chrome-debug": "core/scripts/manual-chrome-launcher.js",
        "lighthouse": "cli/index.js",
        "smokehouse": "cli/test/smokehouse/frontends/smokehouse-bin.js"
      },
      "engines": {
        "node": ">=22.19"
      }
    },
    "node_modules/lighthouse-logger": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/lighthouse-logger/-/lighthouse-logger-2.0.2.tgz",
      "integrity": "sha512-vWl2+u5jgOQuZR55Z1WM0XDdrJT6mzMP8zHUct7xTlWhuQs+eV0g+QL0RQdFjT54zVmbhLCP8vIVpy1wGn/gCg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "debug": "^4.4.1",
        "marky": "^1.2.2"
      }
    },
    "node_modules/lighthouse-stack-packs": {
      "version": "1.12.3",
      "resolved": "https://registry.npmjs.org/lighthouse-stack-packs/-/lighthouse-stack-packs-1.12.3.tgz",
      "integrity": "sha512-d8IsOpE83kbANgnM+Tp8+x6HcMpX9o2ITBiUERssgzAIFdZCQzs/f4k6D0DLQTE59enml9mbAOU52Wu35exWtg==",
      "dev": true,
      "license": "Apache-2.0"
    },
    "node_modules/lilconfig": {
      "version": "3.1.4",
      "resolved": "https://registry.npmjs.org/lilconfig/-/lilconfig-3.1.4.tgz",
      "integrity": "sha512-zJZyBmQhArDRefuWTypZxwDpFDIYmrj8ypSBvwGD5P13Y95s6DjzKgu4DVdGbeQa5PDEsAOCAPNk4X+QOR006w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/antonk52"
      }
    },
    "node_modules/lines-and-columns": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/lines-and-columns/-/lines-and-columns-1.2.4.tgz",
      "integrity": "sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/locate-path": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/locate-path/-/locate-path-6.0.0.tgz",
      "integrity": "sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-locate": "^5.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/lodash.merge": {
      "version": "4.6.2",
      "resolved": "https://registry.npmjs.org/lodash.merge/-/lodash.merge-4.6.2.tgz",
      "integrity": "sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/loose-envify": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/loose-envify/-/loose-envify-1.4.0.tgz",
      "integrity": "sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==",
      "license": "MIT",
      "dependencies": {
        "js-tokens": "^3.0.0 || ^4.0.0"
      },
      "bin": {
        "loose-envify": "cli.js"
      }
    },
    "node_modules/loupe": {
      "version": "3.2.1",
      "resolved": "https://registry.npmjs.org/loupe/-/loupe-3.2.1.tgz",
      "integrity": "sha512-CdzqowRJCeLU72bHvWqwRBBlLcMEtIvGrlvef74kMnV2AolS9Y8xUv1I0U/MNAWMhBlKIoyuEgoJ0t/bbwHbLQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lru-cache": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-5.1.1.tgz",
      "integrity": "sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "yallist": "^3.0.2"
      }
    },
    "node_modules/lucide-react": {
      "version": "0.468.0",
      "resolved": "https://registry.npmjs.org/lucide-react/-/lucide-react-0.468.0.tgz",
      "integrity": "sha512-6koYRhnM2N0GGZIdXzSeiNwguv1gt/FAjZOiPl76roBi3xKEXa4WmfpxgQwTTL4KipXjefrnf3oV4IsYhi4JFA==",
      "license": "ISC",
      "peerDependencies": {
        "react": "^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0-rc"
      }
    },
    "node_modules/lz-string": {
      "version": "1.5.0",
      "resolved": "https://registry.npmjs.org/lz-string/-/lz-string-1.5.0.tgz",
      "integrity": "sha512-h5bgJWpxJNswbU7qCrV0tIKQCaS3blPDrqKWx+QxzuzL1zGUzij9XCWLrSLsJPu5t+eWA/ycetzYAO5IOMcWAQ==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "bin": {
        "lz-string": "bin/bin.js"
      }
    },
    "node_modules/magic-string": {
      "version": "0.30.21",
      "resolved": "https://registry.npmjs.org/magic-string/-/magic-string-0.30.21.tgz",
      "integrity": "sha512-vd2F4YUyEXKGcLHoq+TEyCjxueSeHnFxyyjNp80yg0XV4vUhnDer/lvvlqM/arB5bXQN5K2/3oinyCRyx8T2CQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.5"
      }
    },
    "node_modules/marky": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/marky/-/marky-1.3.0.tgz",
      "integrity": "sha512-ocnPZQLNpvbedwTy9kNrQEsknEfgvcLMvOtz3sFeWApDq1MXH1TqkCIx58xlpESsfwQOnuBO9beyQuNGzVvuhQ==",
      "dev": true,
      "license": "Apache-2.0"
    },
    "node_modules/merge2": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/merge2/-/merge2-1.4.1.tgz",
      "integrity": "sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/micromatch": {
      "version": "4.0.8",
      "resolved": "https://registry.npmjs.org/micromatch/-/micromatch-4.0.8.tgz",
      "integrity": "sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "braces": "^3.0.3",
        "picomatch": "^2.3.1"
      },
      "engines": {
        "node": ">=8.6"
      }
    },
    "node_modules/min-indent": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/min-indent/-/min-indent-1.0.1.tgz",
      "integrity": "sha512-I9jwMn07Sy/IwOj3zVkVik2JTvgpaykDZEigL6Rx6N9LbMywwUSMtxET+7lVoDLLd3O3IXwJwvuuns8UB/HeAg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/minimatch": {
      "version": "3.1.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.5.tgz",
      "integrity": "sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/minipass": {
      "version": "7.1.3",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-7.1.3.tgz",
      "integrity": "sha512-tEBHqDnIoM/1rXME1zgka9g6Q2lcoCkxHLuc7ODJ5BxbP5d4c2Z5cGgtXAku59200Cx7diuHTOYfSBD8n6mm8A==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "engines": {
        "node": ">=16 || 14 >=14.17"
      }
    },
    "node_modules/mitt": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/mitt/-/mitt-3.0.1.tgz",
      "integrity": "sha512-vKivATfr97l2/QBCYAkXYDbrIWPM2IIKEl7YPhjCvKlG3kE2gm+uBo6nEXK3M5/Ffh/FLpKExzOQ3JJoJGFKBw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/modern-tar": {
      "version": "0.8.6",
      "resolved": "https://registry.npmjs.org/modern-tar/-/modern-tar-0.8.6.tgz",
      "integrity": "sha512-LYSks0tNVqbtez/9OB0YFP6qLRSqkdAxJWOQpVaR67lNTbj2zNLyYpowkRMia5lXLCZKzxwoxkxH2MbbBR2aEg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/motion-dom": {
      "version": "12.43.0",
      "resolved": "https://registry.npmjs.org/motion-dom/-/motion-dom-12.43.0.tgz",
      "integrity": "sha512-azKON4d9S65PEoFUiQTMTgPheEmzf2QngdRc50AKfJp9Q9mmcBVw22c8eMq9k8kxOFHdL7+WZY7N/5F/lwiDag==",
      "license": "MIT",
      "dependencies": {
        "motion-utils": "^12.39.0"
      }
    },
    "node_modules/motion-utils": {
      "version": "12.39.0",
      "resolved": "https://registry.npmjs.org/motion-utils/-/motion-utils-12.39.0.tgz",
      "integrity": "sha512-8nadJAJjTtqRkmRF36FoJTrywK9nnFmnPwnSMyxaOCU7GDjN9RTMJIxx9De8ErM+vpPhMccr/6fo5WciyQLnMQ==",
      "license": "MIT"
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/mz": {
      "version": "2.7.0",
      "resolved": "https://registry.npmjs.org/mz/-/mz-2.7.0.tgz",
      "integrity": "sha512-z81GNO7nnYMEhrGh9LeymoE4+Yr0Wn5McHIZMK5cfQCl+NDX08sCZgUc9/6MHni9IWuFLm1Z3HTCXu2z9fN62Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "any-promise": "^1.0.0",
        "object-assign": "^4.0.1",
        "thenify-all": "^1.0.0"
      }
    },
    "node_modules/nanoid": {
      "version": "3.3.20",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.20.tgz",
      "integrity": "sha512-uKdg2G3GNCKQn9byYOpxbGqrT2fGO5KRt5J/8b3pok8rT6qxGWF6hxMyJiEYtAf+FVyYuD9hRaDqX5uPFYJ4ZQ==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/natural-compare": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/natural-compare/-/natural-compare-1.4.0.tgz",
      "integrity": "sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/node-releases": {
      "version": "2.0.63",
      "resolved": "https://registry.npmjs.org/node-releases/-/node-releases-2.0.63.tgz",
      "integrity": "sha512-6li2QanLsAXpIH2R6j77MzRyvOyrvdTqlKtO4CgBdHGNvN99ZZfyxszHc5o5+IZBWD5u6Hzwg83JoGXmqZNG9Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/normalize-path": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/normalize-path/-/normalize-path-3.0.0.tgz",
      "integrity": "sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/nwsapi": {
      "version": "2.2.28",
      "resolved": "https://registry.npmjs.org/nwsapi/-/nwsapi-2.2.28.tgz",
      "integrity": "sha512-IlVB7OS7qrOsVYlpnFIkETjMwT9jwvmocJmmM+GZU/PAB3uGi9Ezd7vcWhWBUnSc0ya4ppmQITOyP1ez9gg8cg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-hash": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/object-hash/-/object-hash-3.0.0.tgz",
      "integrity": "sha512-RSn9F68PjH9HqtltsSnqYC1XXoWe9Bju5+213R98cNGttag9q9yAOTzdbsqvIa7aNm5WffBZFpWYr2aWrklWAw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/open": {
      "version": "11.0.4",
      "resolved": "https://registry.npmjs.org/open/-/open-11.0.4.tgz",
      "integrity": "sha512-++Zlftm0kVLPmzC06t6epuWmcRMDbI4z5P3NNX979WA/k23+NtSOynEGzsVfZwguKw2mi5umVgnBlJQMwRz4Pg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "default-browser": "^5.5.1",
        "define-lazy-prop": "^3.0.0",
        "is-in-ssh": "^1.0.0",
        "is-inside-container": "^1.0.0",
        "powershell-utils": "^0.2.1",
        "wsl-utils": "^1.0.0"
      },
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/optionator": {
      "version": "0.9.4",
      "resolved": "https://registry.npmjs.org/optionator/-/optionator-0.9.4.tgz",
      "integrity": "sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "deep-is": "^0.1.3",
        "fast-levenshtein": "^2.0.6",
        "levn": "^0.4.1",
        "prelude-ls": "^1.2.1",
        "type-check": "^0.4.0",
        "word-wrap": "^1.2.5"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/oxc-parser": {
      "version": "0.152.0",
      "resolved": "https://registry.npmjs.org/oxc-parser/-/oxc-parser-0.152.0.tgz",
      "integrity": "sha512-ZztsZgaCWmPeKYMdoTT5e0oV/oxD1NeLWNR3kAtr/G707cUPYaaozRlVDHLCGnszHJRszN9mJwmPNpqgwloC0A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@oxc-project/types": "^0.152.0"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/oxc-project"
      },
      "optionalDependencies": {
        "@oxc-parser/binding-android-arm-eabi": "0.152.0",
        "@oxc-parser/binding-android-arm64": "0.152.0",
        "@oxc-parser/binding-darwin-arm64": "0.152.0",
        "@oxc-parser/binding-darwin-x64": "0.152.0",
        "@oxc-parser/binding-freebsd-x64": "0.152.0",
        "@oxc-parser/binding-linux-arm-gnueabihf": "0.152.0",
        "@oxc-parser/binding-linux-arm-musleabihf": "0.152.0",
        "@oxc-parser/binding-linux-arm64-gnu": "0.152.0",
        "@oxc-parser/binding-linux-arm64-musl": "0.152.0",
        "@oxc-parser/binding-linux-ppc64-gnu": "0.152.0",
        "@oxc-parser/binding-linux-riscv64-gnu": "0.152.0",
        "@oxc-parser/binding-linux-riscv64-musl": "0.152.0",
        "@oxc-parser/binding-linux-s390x-gnu": "0.152.0",
        "@oxc-parser/binding-linux-x64-gnu": "0.152.0",
        "@oxc-parser/binding-linux-x64-musl": "0.152.0",
        "@oxc-parser/binding-openharmony-arm64": "0.152.0",
        "@oxc-parser/binding-win32-arm64-msvc": "0.152.0",
        "@oxc-parser/binding-win32-ia32-msvc": "0.152.0",
        "@oxc-parser/binding-win32-x64-msvc": "0.152.0"
      }
    },
    "node_modules/p-limit": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/p-limit/-/p-limit-3.1.0.tgz",
      "integrity": "sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "yocto-queue": "^0.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/p-locate": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/p-locate/-/p-locate-5.0.0.tgz",
      "integrity": "sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-limit": "^3.0.2"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/parent-module": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/parent-module/-/parent-module-1.0.1.tgz",
      "integrity": "sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "callsites": "^3.0.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/parse5": {
      "version": "7.3.0",
      "resolved": "https://registry.npmjs.org/parse5/-/parse5-7.3.0.tgz",
      "integrity": "sha512-IInvU7fabl34qmi9gY8XOVxhYyMyuH2xUNpb2q8/Y+7552KlejkRvqvD19nMoUW/uQGGbqNpA6Tufu5FL5BZgw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "entities": "^6.0.0"
      },
      "funding": {
        "url": "https://github.com/inikulin/parse5?sponsor=1"
      }
    },
    "node_modules/path-exists": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/path-exists/-/path-exists-4.0.0.tgz",
      "integrity": "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-key": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz",
      "integrity": "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-parse": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/path-parse/-/path-parse-1.0.7.tgz",
      "integrity": "sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/path-scurry": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/path-scurry/-/path-scurry-2.0.2.tgz",
      "integrity": "sha512-3O/iVVsJAPsOnpwWIeD+d6z/7PmqApyQePUtCndjatj/9I5LylHvt5qluFaBT3I5h3r1ejfR056c+FCv+NnNXg==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "lru-cache": "^11.0.0",
        "minipass": "^7.1.2"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/path-scurry/node_modules/lru-cache": {
      "version": "11.5.3",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-11.5.3.tgz",
      "integrity": "sha512-U4N8FgzmWxc8k1VH8Kr6lQg18U7Fjvby6wXHVRX/ZZ7IwWbRMgrRbP0Wrb5q5NVinryp4SQampHKdvtecItxUg==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "engines": {
        "node": "20 || >=22"
      }
    },
    "node_modules/pathe": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/pathe/-/pathe-2.0.3.tgz",
      "integrity": "sha512-WUjGcAqP1gQacoQe+OBJsFA7Ld4DyXuUIjZ5cc75cLHvJ7dtNsTugphxIADwspS+AraAUePCKrSVtPLFj/F88w==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/pathval": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/pathval/-/pathval-2.0.1.tgz",
      "integrity": "sha512-//nshmD55c46FuFw26xV/xFAaB5HF9Xdap7HJBBnrKdAd6/GxDBaNA1870O79+9ueg61cZLSVc+OaFlfmObYVQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 14.16"
      }
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "2.3.2",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-2.3.2.tgz",
      "integrity": "sha512-V7+vQEJ06Z+c5tSye8S+nHUfI51xoXIXjHQ99cQtKUkQqqO1kO/KCJUfZXuB47h/YBlDhah2H3hdUGXn8ie0oA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/pirates": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/pirates/-/pirates-4.0.7.tgz",
      "integrity": "sha512-TfySrs/5nm8fQJDcBDuUng3VOUKsd7S+zqvbOTiGXHfxX4wK31ard+hoNuvkicM/2YFzlpDgABOevKSsB4G/FA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/playwright": {
      "version": "1.64.1",
      "resolved": "https://registry.npmjs.org/playwright/-/playwright-1.64.1.tgz",
      "integrity": "sha512-HCrVhHr5QQuwYoswEUGTb7gGp522yflbv/ST8nF4sFWGuLjQCt17Q/EubpGGSNKYn1tsTCPZxqHhHCfVURu7UA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "playwright-core": "1.64.1"
      },
      "bin": {
        "playwright": "cli.js"
      },
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/playwright-core": {
      "version": "1.64.1",
      "resolved": "https://registry.npmjs.org/playwright-core/-/playwright-core-1.64.1.tgz",
      "integrity": "sha512-BC4s8y6SEVA6Q1rSxZTto8hI1KUI3xXlHGZgvGqP4IqPdI/a6FX9H29IDNz7vKo9l21b6LfYosScPL6M3xxyDQ==",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "playwright-core": "cli.js"
      },
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.32",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.32.tgz",
      "integrity": "sha512-LJlKCCAUFKOuZxipUdYw1NzIITEsPcgyOG9LkvRJvuKj/bRzbuRY0ARXvL0pWGpsZvn8jku+LMep2eU0seHp8g==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.20",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.2"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/postcss-import": {
      "version": "15.1.0",
      "resolved": "https://registry.npmjs.org/postcss-import/-/postcss-import-15.1.0.tgz",
      "integrity": "sha512-hpr+J05B2FVYUAXHeK1YyI267J/dDDhMU6B6civm8hSY1jYJnBXxzKDKDswzJmtLHryrjhnDjqqp/49t8FALew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "postcss-value-parser": "^4.0.0",
        "read-cache": "^1.0.0",
        "resolve": "^1.1.7"
      },
      "engines": {
        "node": ">=14.0.0"
      },
      "peerDependencies": {
        "postcss": "^8.0.0"
      }
    },
    "node_modules/postcss-js": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/postcss-js/-/postcss-js-4.1.0.tgz",
      "integrity": "sha512-oIAOTqgIo7q2EOwbhb8UalYePMvYoIeRY2YKntdpFQXNosSu3vLrniGgmH9OKs/qAkfoj5oB3le/7mINW1LCfw==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "camelcase-css": "^2.0.1"
      },
      "engines": {
        "node": "^12 || ^14 || >= 16"
      },
      "peerDependencies": {
        "postcss": "^8.4.21"
      }
    },
    "node_modules/postcss-load-config": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/postcss-load-config/-/postcss-load-config-6.0.1.tgz",
      "integrity": "sha512-oPtTM4oerL+UXmx+93ytZVN82RrlY/wPUV8IeDxFrzIjXOLF1pN+EmKPLbubvKHT2HC20xXsCAH2Z+CKV6Oz/g==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "lilconfig": "^3.1.1"
      },
      "engines": {
        "node": ">= 18"
      },
      "peerDependencies": {
        "jiti": ">=1.21.0",
        "postcss": ">=8.0.9",
        "tsx": "^4.8.1",
        "yaml": "^2.4.2"
      },
      "peerDependenciesMeta": {
        "jiti": {
          "optional": true
        },
        "postcss": {
          "optional": true
        },
        "tsx": {
          "optional": true
        },
        "yaml": {
          "optional": true
        }
      }
    },
    "node_modules/postcss-nested": {
      "version": "6.2.0",
      "resolved": "https://registry.npmjs.org/postcss-nested/-/postcss-nested-6.2.0.tgz",
      "integrity": "sha512-HQbt28KulC5AJzG+cZtj9kvKB93CFCdLvog1WFLf1D+xmMvPGlBstkpTEZfK5+AN9hfJocyBFCNiqyS48bpgzQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "postcss-selector-parser": "^6.1.1"
      },
      "engines": {
        "node": ">=12.0"
      },
      "peerDependencies": {
        "postcss": "^8.2.14"
      }
    },
    "node_modules/postcss-selector-parser": {
      "version": "6.1.5",
      "resolved": "https://registry.npmjs.org/postcss-selector-parser/-/postcss-selector-parser-6.1.5.tgz",
      "integrity": "sha512-TEHFzb5KRDKaOgJ4TYE+0jyJtFbjLvkdVOu0fZ2b6MTWzoqZd4Le+61aEppWkvTlYePgOX4ATL1wsAIPMLTw6Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "cssesc": "^3.0.0",
        "util-deprecate": "^1.0.2"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/postcss-value-parser": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/postcss-value-parser/-/postcss-value-parser-4.2.0.tgz",
      "integrity": "sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/powershell-utils": {
      "version": "0.2.1",
      "resolved": "https://registry.npmjs.org/powershell-utils/-/powershell-utils-0.2.1.tgz",
      "integrity": "sha512-C+y9x90UElAddDZmV4qOx9W53B61PO7cIqWz2dQsWlwswuq4mr8NEwytdGKboYbQlGZ3awrkTeNvcZiZNHnQ8A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/prelude-ls": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/prelude-ls/-/prelude-ls-1.2.1.tgz",
      "integrity": "sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/pretty-format": {
      "version": "27.5.1",
      "resolved": "https://registry.npmjs.org/pretty-format/-/pretty-format-27.5.1.tgz",
      "integrity": "sha512-Qb1gy5OrP5+zDf2Bvnzdl3jsTf1qXVMazbvCoKhtKqVs4/YK4ozX4gKQJJVyNe+cajNPn0KoC0MC3FUmaHWEmQ==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "ansi-regex": "^5.0.1",
        "ansi-styles": "^5.0.0",
        "react-is": "^17.0.1"
      },
      "engines": {
        "node": "^10.13.0 || ^12.13.0 || ^14.15.0 || >=15.0.0"
      }
    },
    "node_modules/pretty-format/node_modules/ansi-styles": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-5.2.0.tgz",
      "integrity": "sha512-Cxwpt2SfTzTtXcfOlzGEee8O+c+MmUgGrNiBcXnuWxuFJHe6a5Hz7qwhwe5OgaSYI0IJvkLqWX1ASG+cJOkEiA==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/punycode": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/punycode/-/punycode-2.3.1.tgz",
      "integrity": "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/puppeteer-core": {
      "version": "25.16.0",
      "resolved": "https://registry.npmjs.org/puppeteer-core/-/puppeteer-core-25.16.0.tgz",
      "integrity": "sha512-VA5Pf54N8shfopNkZZXCdiiwfnnY8ZJYAMqFQRhlH5mGUhfwf53Ar770GPtdpTDLUqvQeYpIBtC9/G2Jij2IJw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@puppeteer/browsers": "3.2.6",
        "chromium-bidi": "157.0.8090-0",
        "devtools-protocol": "0.0.1704951",
        "typed-query-selector": "^2.12.3",
        "webdriver-bidi-protocol": "1.0.1",
        "ws": "^8.22.0"
      },
      "engines": {
        "node": ">=22.12.0"
      }
    },
    "node_modules/puppeteer-core/node_modules/devtools-protocol": {
      "version": "0.0.1704951",
      "resolved": "https://registry.npmjs.org/devtools-protocol/-/devtools-protocol-0.0.1704951.tgz",
      "integrity": "sha512-GQhQOs9u/Mvm1zMtJIH872JS4AskuZdUSsPNPk4ChahtWAUqgz6atEtIsMt+nO7MqF1Ic4HxII/k8Cu36JivNg==",
      "dev": true,
      "license": "BSD-3-Clause"
    },
    "node_modules/queue-microtask": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/queue-microtask/-/queue-microtask-1.2.3.tgz",
      "integrity": "sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/react": {
      "version": "18.3.1",
      "resolved": "https://registry.npmjs.org/react/-/react-18.3.1.tgz",
      "integrity": "sha512-wS+hAgJShR0KhEvPJArfuPVN1+Hz1t0Y6n5jLrGQbkb4urgPE/0Rve+1kMB1v/oWgHgm4WIcV+i7F2pTVj+2iQ==",
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.1.0"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "18.3.1",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-18.3.1.tgz",
      "integrity": "sha512-5m4nQKp+rZRb09LNH59GM4BxTh9251/ylbKIbpe7TpGxfJ+9kv6BLkLBXIjjspbgbnIBNqlI23tRnTWT0snUIw==",
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.1.0",
        "scheduler": "^0.23.2"
      },
      "peerDependencies": {
        "react": "^18.3.1"
      }
    },
    "node_modules/react-fast-compare": {
      "version": "3.2.2",
      "resolved": "https://registry.npmjs.org/react-fast-compare/-/react-fast-compare-3.2.2.tgz",
      "integrity": "sha512-nsO+KSNgo1SbJqJEYRE9ERzo7YtYbou/OqjSQKxV7jcKox7+usiUVZOAC+XnDOABXggQTno0Y1CpVnuWEc1boQ==",
      "license": "MIT"
    },
    "node_modules/react-helmet-async": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/react-helmet-async/-/react-helmet-async-2.0.5.tgz",
      "integrity": "sha512-rYUYHeus+i27MvFE+Jaa4WsyBKGkL6qVgbJvSBoX8mbsWoABJXdEO0bZyi0F6i+4f0NuIb8AvqPMj3iXFHkMwg==",
      "license": "Apache-2.0",
      "dependencies": {
        "invariant": "^2.2.4",
        "react-fast-compare": "^3.2.2",
        "shallowequal": "^1.1.0"
      },
      "peerDependencies": {
        "react": "^16.6.0 || ^17.0.0 || ^18.0.0"
      }
    },
    "node_modules/react-hook-form": {
      "version": "7.91.0",
      "resolved": "https://registry.npmjs.org/react-hook-form/-/react-hook-form-7.91.0.tgz",
      "integrity": "sha512-5BEBUnCBwa28AFXYTYmOaB/+CSpJ/+CWVASHEvIGUzFdHyUiPHeRhG7r5hOZ8nZi0yP7pbHdFNXO/p31EKTJFQ==",
      "license": "MIT",
      "engines": {
        "node": ">=18.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/react-hook-form"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8.0 || ^17 || ^18 || ^19"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/react-is": {
      "version": "17.0.2",
      "resolved": "https://registry.npmjs.org/react-is/-/react-is-17.0.2.tgz",
      "integrity": "sha512-w2GsyukL62IJnlaff/nRegPQR94C/XXamvMWmSHRJ4y7Ts/4ocGRmTHvOs8PSE6pB3dWOrD/nueuU5sduBsQ4w==",
      "dev": true,
      "license": "MIT",
      "peer": true
    },
    "node_modules/react-refresh": {
      "version": "0.17.0",
      "resolved": "https://registry.npmjs.org/react-refresh/-/react-refresh-0.17.0.tgz",
      "integrity": "sha512-z6F7K9bV85EfseRCp2bzrpyQ0Gkw1uLoCel9XBVWPg/TjRj94SkJzUTGfOa4bs7iJvBWtQG0Wq7wnI0syw3EBQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-router": {
      "version": "6.30.6",
      "resolved": "https://registry.npmjs.org/react-router/-/react-router-6.30.6.tgz",
      "integrity": "sha512-5HfK7k5im7LTOB0EqCQmfvy4C13G92Ssj1VTmouTK3AJvyjKTnFuCV0vcMAD/JS+JC4DvDIBRrlAeJIFjh5VWg==",
      "license": "MIT",
      "dependencies": {
        "@remix-run/router": "1.23.4"
      },
      "engines": {
        "node": ">=14.0.0"
      },
      "peerDependencies": {
        "react": ">=16.8"
      }
    },
    "node_modules/react-router-dom": {
      "version": "6.30.6",
      "resolved": "https://registry.npmjs.org/react-router-dom/-/react-router-dom-6.30.6.tgz",
      "integrity": "sha512-0RHKZz7wwffvkU+2MFVT2NnjK44ssLEV+m0CAJaS2Ksmorrwj7WxH00jO0SOCW26/tINUnJHToXblDs33I38YQ==",
      "license": "MIT",
      "dependencies": {
        "@remix-run/router": "1.23.4",
        "react-router": "6.30.6"
      },
      "engines": {
        "node": ">=14.0.0"
      },
      "peerDependencies": {
        "react": ">=16.8",
        "react-dom": ">=16.8"
      }
    },
    "node_modules/read-cache": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/read-cache/-/read-cache-1.0.2.tgz",
      "integrity": "sha512-/peqiBB/n07gQGLsWaHho3WfvUyRscw0gYTsEFMhrIe/nWLkYaf5SbKYjGYqtRV3aPwykJgF2VEMo1ac4bnsGA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/readdirp": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/readdirp/-/readdirp-3.6.0.tgz",
      "integrity": "sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "picomatch": "^2.2.1"
      },
      "engines": {
        "node": ">=8.10.0"
      }
    },
    "node_modules/redent": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/redent/-/redent-3.0.0.tgz",
      "integrity": "sha512-6tDA8g98We0zd0GvVeMT9arEOnTw9qM03L9cJXaCjrip1OO764RDBLBfrB4cwzNGDj5OA5ioymC9GkizgWJDUg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "indent-string": "^4.0.0",
        "strip-indent": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/require-from-string": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/require-from-string/-/require-from-string-2.0.2.tgz",
      "integrity": "sha512-Xf0nWe6RseziFMu+Ap9biiUbmplq6S9/p+7w7YXP/JBHhrUDDUhwa+vANyubuqfZWTveU//DYVGsDG7RKL/vEw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/resolve": {
      "version": "1.22.13",
      "resolved": "https://registry.npmjs.org/resolve/-/resolve-1.22.13.tgz",
      "integrity": "sha512-Dj/cW9zBV2aRj6XzCxuGIs3ESZKv02jixne3q6jFZYZ3/Tg09gHHviSMDL4kObh9pqSahdRHEnDoaP2gn8YLhA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "is-core-module": "^2.17.0",
        "path-parse": "^1.0.7",
        "supports-preserve-symlinks-flag": "^1.0.0"
      },
      "bin": {
        "resolve": "bin/resolve"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/resolve-from": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/resolve-from/-/resolve-from-4.0.0.tgz",
      "integrity": "sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/reusify": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/reusify/-/reusify-1.1.0.tgz",
      "integrity": "sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "iojs": ">=1.0.0",
        "node": ">=0.10.0"
      }
    },
    "node_modules/robots-parser": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/robots-parser/-/robots-parser-3.0.1.tgz",
      "integrity": "sha512-s+pyvQeIKIZ0dx5iJiQk1tPLJAWln39+MI5jtM8wnyws+G5azk+dMnMX0qfbqNetKKNgcWWOdi0sfm+FbQbgdQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10.0.0"
      }
    },
    "node_modules/rollup": {
      "version": "4.67.4",
      "resolved": "https://registry.npmjs.org/rollup/-/rollup-4.67.4.tgz",
      "integrity": "sha512-Lsv3oKcz5jgOQJej/p7nfwbVEdAbDT+z6OPf/SCdI+nF+q2ENp0pTKT35ZwXAmH8g45mfrIiJeEyAqKYSYoL9Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/estree": "^1.0.10"
      },
      "bin": {
        "rollup": "dist/bin/rollup"
      },
      "engines": {
        "node": ">=18.0.0",
        "npm": ">=8.0.0"
      },
      "optionalDependencies": {
        "@napi-rs/lzma-linux-x64-gnu": "1.5.1",
        "@rollup/rollup-android-arm-eabi": "4.67.4",
        "@rollup/rollup-android-arm64": "4.67.4",
        "@rollup/rollup-android-x64": "4.67.4",
        "@rollup/rollup-darwin-arm64": "4.67.4",
        "@rollup/rollup-darwin-x64": "4.67.4",
        "@rollup/rollup-freebsd-arm64": "4.67.4",
        "@rollup/rollup-freebsd-x64": "4.67.4",
        "@rollup/rollup-linux-arm-gnueabihf": "4.67.4",
        "@rollup/rollup-linux-arm-musleabihf": "4.67.4",
        "@rollup/rollup-linux-arm64-gnu": "4.67.4",
        "@rollup/rollup-linux-arm64-musl": "4.67.4",
        "@rollup/rollup-linux-loong64-gnu": "4.67.4",
        "@rollup/rollup-linux-loong64-musl": "4.67.4",
        "@rollup/rollup-linux-ppc64-gnu": "4.67.4",
        "@rollup/rollup-linux-ppc64-musl": "4.67.4",
        "@rollup/rollup-linux-riscv64-gnu": "4.67.4",
        "@rollup/rollup-linux-riscv64-musl": "4.67.4",
        "@rollup/rollup-linux-s390x-gnu": "4.67.4",
        "@rollup/rollup-linux-x64-gnu": "4.67.4",
        "@rollup/rollup-linux-x64-musl": "4.67.4",
        "@rollup/rollup-openbsd-x64": "4.67.4",
        "@rollup/rollup-openharmony-arm64": "4.67.4",
        "@rollup/rollup-win32-arm64-msvc": "4.67.4",
        "@rollup/rollup-win32-ia32-msvc": "4.67.4",
        "@rollup/rollup-win32-x64-gnu": "4.67.4",
        "@rollup/rollup-win32-x64-msvc": "4.67.4",
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/rrweb-cssom": {
      "version": "0.8.0",
      "resolved": "https://registry.npmjs.org/rrweb-cssom/-/rrweb-cssom-0.8.0.tgz",
      "integrity": "sha512-guoltQEx+9aMf2gDZ0s62EcV8lsXR+0w8915TC3ITdn2YueuNjdAYh/levpU9nFaoChh9RUS5ZdQMrKfVEN9tw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/run-applescript": {
      "version": "7.1.0",
      "resolved": "https://registry.npmjs.org/run-applescript/-/run-applescript-7.1.0.tgz",
      "integrity": "sha512-DPe5pVFaAsinSaV6QjQ6gdiedWDcRCbUuiQfQa2wmWV7+xC9bGulGI8+TdRmoFkAPaBXk8CrAbnlY2ISniJ47Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/run-parallel": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/run-parallel/-/run-parallel-1.2.0.tgz",
      "integrity": "sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "queue-microtask": "^1.2.2"
      }
    },
    "node_modules/safer-buffer": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/safer-buffer/-/safer-buffer-2.1.2.tgz",
      "integrity": "sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/saxes": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/saxes/-/saxes-6.0.0.tgz",
      "integrity": "sha512-xAg7SOnEhrm5zI3puOOKyy1OMcMlIJZYNJY7xLBwSze0UjhPLnWfj2GF2EpT0jmzaJKIWKHLsaSSajf35bcYnA==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "xmlchars": "^2.2.0"
      },
      "engines": {
        "node": ">=v12.22.7"
      }
    },
    "node_modules/scheduler": {
      "version": "0.23.2",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.23.2.tgz",
      "integrity": "sha512-UOShsPwz7NrMUqhR6t0hWjFduvOzbtv7toDH1/hIrfRNIDBnnBWd0CwJTGvTpngVlmwGCdP9/Zl/tVrDqcuYzQ==",
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.1.0"
      }
    },
    "node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/sentry": {
      "version": "0.45.0",
      "resolved": "https://registry.npmjs.org/sentry/-/sentry-0.45.0.tgz",
      "integrity": "sha512-kgmEbLlC22lL7uneeUm9Sjz65rp5cvwYOMTxXbZCmBum4sbVre/lLT3zTV3kwXHJ9/BM8ZS0/GhZe9Cl1t6WyA==",
      "dev": true,
      "license": "FSL-1.1-Apache-2.0",
      "bin": {
        "sentry": "dist/bin.cjs"
      },
      "engines": {
        "node": ">=20.0"
      }
    },
    "node_modules/shallowequal": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/shallowequal/-/shallowequal-1.1.0.tgz",
      "integrity": "sha512-y0m1JoUZSlPAjXVtPPW70aZWfIL/dSP7AFkRnniLCrK/8MDKog3TySTBmckD+RObVxH0v4Tox67+F14PdED2oQ==",
      "license": "MIT"
    },
    "node_modules/sharp": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/sharp/-/sharp-0.34.5.tgz",
      "integrity": "sha512-Ou9I5Ft9WNcCbXrU9cMgPBcCK8LiwLqcbywW3t4oDV37n1pzpuNLsYiAV8eODnjbtQlSDwZ2cUEeQz4E54Hltg==",
      "dev": true,
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@img/colour": "^1.0.0",
        "detect-libc": "^2.1.2",
        "semver": "^7.7.3"
      },
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-darwin-arm64": "0.34.5",
        "@img/sharp-darwin-x64": "0.34.5",
        "@img/sharp-libvips-darwin-arm64": "1.2.4",
        "@img/sharp-libvips-darwin-x64": "1.2.4",
        "@img/sharp-libvips-linux-arm": "1.2.4",
        "@img/sharp-libvips-linux-arm64": "1.2.4",
        "@img/sharp-libvips-linux-ppc64": "1.2.4",
        "@img/sharp-libvips-linux-riscv64": "1.2.4",
        "@img/sharp-libvips-linux-s390x": "1.2.4",
        "@img/sharp-libvips-linux-x64": "1.2.4",
        "@img/sharp-libvips-linuxmusl-arm64": "1.2.4",
        "@img/sharp-libvips-linuxmusl-x64": "1.2.4",
        "@img/sharp-linux-arm": "0.34.5",
        "@img/sharp-linux-arm64": "0.34.5",
        "@img/sharp-linux-ppc64": "0.34.5",
        "@img/sharp-linux-riscv64": "0.34.5",
        "@img/sharp-linux-s390x": "0.34.5",
        "@img/sharp-linux-x64": "0.34.5",
        "@img/sharp-linuxmusl-arm64": "0.34.5",
        "@img/sharp-linuxmusl-x64": "0.34.5",
        "@img/sharp-wasm32": "0.34.5",
        "@img/sharp-win32-arm64": "0.34.5",
        "@img/sharp-win32-ia32": "0.34.5",
        "@img/sharp-win32-x64": "0.34.5"
      }
    },
    "node_modules/sharp/node_modules/semver": {
      "version": "7.8.5",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.8.5.tgz",
      "integrity": "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/shebang-command": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz",
      "integrity": "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "shebang-regex": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/shebang-regex": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz",
      "integrity": "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/siginfo": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/siginfo/-/siginfo-2.0.0.tgz",
      "integrity": "sha512-ybx0WO1/8bSBLEWXZvEd7gMW3Sn3JFlW3TvX1nREbDLRNQNaeNN8WK0meBwPdAaOI7TtRRRJn/Es1zhrrCHu7g==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/source-map-js": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.2.tgz",
      "integrity": "sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw==",
      "dev": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/speedline-core": {
      "version": "1.4.3",
      "resolved": "https://registry.npmjs.org/speedline-core/-/speedline-core-1.4.3.tgz",
      "integrity": "sha512-DI7/OuAUD+GMpR6dmu8lliO2Wg5zfeh+/xsdyJZCzd8o5JgFUjCeLsBDuZjIQJdwXS3J0L/uZYrELKYqx+PXog==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "*",
        "image-ssim": "^0.2.0",
        "jpeg-js": "^0.4.1"
      },
      "engines": {
        "node": ">=8.0"
      }
    },
    "node_modules/stackback": {
      "version": "0.0.2",
      "resolved": "https://registry.npmjs.org/stackback/-/stackback-0.0.2.tgz",
      "integrity": "sha512-1XMJE5fQo1jGH6Y/7ebnwPOBEkIEnT4QF32d5R1+VXdXveM0IBMJt8zfaxX1P3QhVwrYe+576+jkANtSS2mBbw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/std-env": {
      "version": "3.10.0",
      "resolved": "https://registry.npmjs.org/std-env/-/std-env-3.10.0.tgz",
      "integrity": "sha512-5GS12FdOZNliM5mAOxFRg7Ir0pWz8MdpYm6AY6VPkGpbA7ZzmbzNcBJQ0GPvvyWgcY7QAhCgf9Uy89I03faLkg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/string-width": {
      "version": "8.3.0",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-8.3.0.tgz",
      "integrity": "sha512-ZbmZM0JCihQN91dWnxoipT2KOEyHqEyfRXUyjuRhW8b/xnqPDoq4gWEVApTVa9db2wN8mmoikgFBbjh71+cGeQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "get-east-asian-width": "^1.5.0",
        "strip-ansi": "^7.1.2"
      },
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/string-width/node_modules/ansi-regex": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-6.5.0.tgz",
      "integrity": "sha512-zhvbbbdt1kbw7EJ9OQoxmQcuaNR9P5kTj7e/YdmOSU10aHWbycofJxA6jKfoEy3vlLdctOF9ZHaxLtmSm998wQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-regex?sponsor=1"
      }
    },
    "node_modules/string-width/node_modules/strip-ansi": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-7.2.0.tgz",
      "integrity": "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^6.2.2"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/strip-ansi?sponsor=1"
      }
    },
    "node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-indent": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/strip-indent/-/strip-indent-3.0.0.tgz",
      "integrity": "sha512-laJTa3Jb+VQpaC6DseHhF7dXVqHTfJPCRDaEbid/drOhgitgYku/letMUqOXFoWV0zIIUbjpdH2t+tYj4bQMRQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "min-indent": "^1.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-json-comments": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/strip-json-comments/-/strip-json-comments-3.1.1.tgz",
      "integrity": "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/strip-literal": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/strip-literal/-/strip-literal-3.1.0.tgz",
      "integrity": "sha512-8r3mkIM/2+PpjHoOtiAW8Rg3jJLHaV7xPwG+YRGrv6FP0wwk/toTpATxWYOW0BKdWwl82VT2tFYi5DlROa0Mxg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "js-tokens": "^9.0.1"
      },
      "funding": {
        "url": "https://github.com/sponsors/antfu"
      }
    },
    "node_modules/strip-literal/node_modules/js-tokens": {
      "version": "9.0.1",
      "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-9.0.1.tgz",
      "integrity": "sha512-mxa9E9ITFOt0ban3j6L5MpjwegGz6lBQmM1IJkWeBZGcMxto50+eWdjC/52xDbS2vy0k7vIMK0Fe2wfL9OQSpQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/stubborn-fs": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/stubborn-fs/-/stubborn-fs-2.0.0.tgz",
      "integrity": "sha512-Y0AvSwDw8y+nlSNFXMm2g6L51rBGdAQT20J3YSOqxC53Lo3bjWRtr2BKcfYoAf352WYpsZSTURrA0tqhfgudPA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "stubborn-utils": "^1.0.1"
      }
    },
    "node_modules/stubborn-utils": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/stubborn-utils/-/stubborn-utils-1.0.2.tgz",
      "integrity": "sha512-zOh9jPYI+xrNOyisSelgym4tolKTJCQd5GBhK0+0xJvcYDcwlOoxF/rnFKQ2KRZknXSG9jWAp66fwP6AxN9STg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/sucrase": {
      "version": "3.35.1",
      "resolved": "https://registry.npmjs.org/sucrase/-/sucrase-3.35.1.tgz",
      "integrity": "sha512-DhuTmvZWux4H1UOnWMB3sk0sbaCVOoQZjv8u1rDoTV0HTdGem9hkAZtl4JZy8P2z4Bg0nT+YMeOFyVr4zcG5Tw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.2",
        "commander": "^4.0.0",
        "lines-and-columns": "^1.1.6",
        "mz": "^2.7.0",
        "pirates": "^4.0.1",
        "tinyglobby": "^0.2.11",
        "ts-interface-checker": "^0.1.9"
      },
      "bin": {
        "sucrase": "bin/sucrase",
        "sucrase-node": "bin/sucrase-node"
      },
      "engines": {
        "node": ">=16 || 14 >=14.17"
      }
    },
    "node_modules/supports-color": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-7.2.0.tgz",
      "integrity": "sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-flag": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/supports-preserve-symlinks-flag": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/supports-preserve-symlinks-flag/-/supports-preserve-symlinks-flag-1.0.0.tgz",
      "integrity": "sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/symbol-tree": {
      "version": "3.2.4",
      "resolved": "https://registry.npmjs.org/symbol-tree/-/symbol-tree-3.2.4.tgz",
      "integrity": "sha512-9QNk5KwDF+Bvz+PyObkmSYjI5ksVUYtjW7AU22r2NKcfLJcXp96hkDWU3+XndOsUb+AQ9QhfzfCT2O+CNWT5Tw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/tagged-tag": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/tagged-tag/-/tagged-tag-1.0.0.tgz",
      "integrity": "sha512-yEFYrVhod+hdNyx7g5Bnkkb0G6si8HJurOoOEgC8B/O0uXLHlaey/65KRv6cuWBNhBgHKAROVpc7QyYqE5gFng==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/tailwindcss": {
      "version": "3.4.19",
      "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-3.4.19.tgz",
      "integrity": "sha512-3ofp+LL8E+pK/JuPLPggVAIaEuhvIz4qNcf3nA1Xn2o/7fb7s/TYpHhwGDv1ZU3PkBluUVaF8PyCHcm48cKLWQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@alloc/quick-lru": "^5.2.0",
        "arg": "^5.0.2",
        "chokidar": "^3.6.0",
        "didyoumean": "^1.2.2",
        "dlv": "^1.1.3",
        "fast-glob": "^3.3.2",
        "glob-parent": "^6.0.2",
        "is-glob": "^4.0.3",
        "jiti": "^1.21.7",
        "lilconfig": "^3.1.3",
        "micromatch": "^4.0.8",
        "normalize-path": "^3.0.0",
        "object-hash": "^3.0.0",
        "picocolors": "^1.1.1",
        "postcss": "^8.4.47",
        "postcss-import": "^15.1.0",
        "postcss-js": "^4.0.1",
        "postcss-load-config": "^4.0.2 || ^5.0 || ^6.0",
        "postcss-nested": "^6.2.0",
        "postcss-selector-parser": "^6.1.2",
        "resolve": "^1.22.8",
        "sucrase": "^3.35.0"
      },
      "bin": {
        "tailwind": "lib/cli.js",
        "tailwindcss": "lib/cli.js"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/thenify": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/thenify/-/thenify-3.3.1.tgz",
      "integrity": "sha512-RVZSIV5IG10Hk3enotrhvz0T9em6cyHBLkH/YAZuKqd8hRkKhSfCGIcP2KUY0EPxndzANBmNllzWPwak+bheSw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "any-promise": "^1.0.0"
      }
    },
    "node_modules/thenify-all": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/thenify-all/-/thenify-all-1.6.0.tgz",
      "integrity": "sha512-RNxQH/qI8/t3thXJDwcstUO4zeqo64+Uy/+sNVRBx4Xn2OX+OZ9oP+iJnNFqplFra2ZUVeKCSa2oVWi3T4uVmA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "thenify": ">= 3.1.0 < 4"
      },
      "engines": {
        "node": ">=0.8"
      }
    },
    "node_modules/third-party-web": {
      "version": "0.30.0",
      "resolved": "https://registry.npmjs.org/third-party-web/-/third-party-web-0.30.0.tgz",
      "integrity": "sha512-p+PfyL5U0ediGzvwPzMSdD9MnC8rHW6nWJJVLIQvqN7RsSqfaZ+7n4c9GILqH36EYR0eXB9CzAeCRnKFr/9uJg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/tinybench": {
      "version": "2.9.0",
      "resolved": "https://registry.npmjs.org/tinybench/-/tinybench-2.9.0.tgz",
      "integrity": "sha512-0+DUvqWMValLmha6lr4kD8iAMK1HzV0/aKnCtWb9v9641TnP/MFb7Pc2bxoxQjTXAErryXVgUOfv2YqNllqGeg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/tinyexec": {
      "version": "0.3.2",
      "resolved": "https://registry.npmjs.org/tinyexec/-/tinyexec-0.3.2.tgz",
      "integrity": "sha512-KQQR9yN7R5+OSwaK0XQoj22pwHoTlgYqmUscPYoknOoWCWfj/5/ABTMRi69FrKU5ffPVh5QcFikpWJI/P1ocHA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/tinyglobby": {
      "version": "0.2.17",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.17.tgz",
      "integrity": "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.4"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/tinyglobby/node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/tinyglobby/node_modules/picomatch": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.7.tgz",
      "integrity": "sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/tinypool": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/tinypool/-/tinypool-1.1.1.tgz",
      "integrity": "sha512-Zba82s87IFq9A9XmjiX5uZA/ARWDrB03OHlq+Vw1fSdt0I+4/Kutwy8BP4Y/y/aORMo61FQ0vIb5j44vSo5Pkg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.0.0 || >=20.0.0"
      }
    },
    "node_modules/tinyrainbow": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/tinyrainbow/-/tinyrainbow-2.0.0.tgz",
      "integrity": "sha512-op4nsTR47R6p0vMUUoYl/a+ljLFVtlfaXkLQmqfLR1qHma1h/ysYk4hEXZ880bf2CYgTskvTa/e196Vd5dDQXw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/tinyspy": {
      "version": "4.0.6",
      "resolved": "https://registry.npmjs.org/tinyspy/-/tinyspy-4.0.6.tgz",
      "integrity": "sha512-u8KszXvGfU68hVcZpRHKG28T0krMuv2G5nDhiHaMLen/gIuFEgIJhaJuO69qjnXg5paSrbPMFfx3brNuN8eVSg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/tldts": {
      "version": "6.1.86",
      "resolved": "https://registry.npmjs.org/tldts/-/tldts-6.1.86.tgz",
      "integrity": "sha512-WMi/OQ2axVTf/ykqCQgXiIct+mSQDFdH2fkwhPwgEwvJ1kSzZRiinb0zF2Xb8u4+OqPChmyI6MEu4EezNJz+FQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "tldts-core": "^6.1.86"
      },
      "bin": {
        "tldts": "bin/cli.js"
      }
    },
    "node_modules/tldts-core": {
      "version": "6.1.86",
      "resolved": "https://registry.npmjs.org/tldts-core/-/tldts-core-6.1.86.tgz",
      "integrity": "sha512-Je6p7pkk+KMzMv2XXKmAE3McmolOQFdxkKw0R8EYNr7sELW46JqnNeTX8ybPiQgvg1ymCoF8LXs5fzFaZvJPTA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/tldts-icann": {
      "version": "7.4.19",
      "resolved": "https://registry.npmjs.org/tldts-icann/-/tldts-icann-7.4.19.tgz",
      "integrity": "sha512-lnGUR5BZm5UpNDYMBFGAr9pxS2RTUr/euXuJ9o1irR+zKhsBAFUn7quHoZt8UP/eIwykp4ye5f56bCjMBytbTg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "tldts-core": "^7.4.19"
      }
    },
    "node_modules/tldts-icann/node_modules/tldts-core": {
      "version": "7.4.20",
      "resolved": "https://registry.npmjs.org/tldts-core/-/tldts-core-7.4.20.tgz",
      "integrity": "sha512-C630TWXZCZmLq0F2bW4QqwnaaxCQ/svpAqvJwnC4JvgEM5ohhBnGsEzTLSOXcN+xjz+kEaHS5uoWIw2klnqd0A==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/to-regex-range": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/to-regex-range/-/to-regex-range-5.0.1.tgz",
      "integrity": "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-number": "^7.0.0"
      },
      "engines": {
        "node": ">=8.0"
      }
    },
    "node_modules/tough-cookie": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/tough-cookie/-/tough-cookie-5.1.2.tgz",
      "integrity": "sha512-FVDYdxtnj0G6Qm/DhNPSb8Ju59ULcup3tuJxkFb5K8Bv2pUXILbf0xZWU8PX8Ov19OXljbUyveOFwRMwkXzO+A==",
      "dev": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "tldts": "^6.1.32"
      },
      "engines": {
        "node": ">=16"
      }
    },
    "node_modules/tr46": {
      "version": "0.0.3",
      "resolved": "https://registry.npmjs.org/tr46/-/tr46-0.0.3.tgz",
      "integrity": "sha512-N3WMsuqV66lT30CrXNbEjx4GEwlow3v6rr4mCcv6prnfwhS01rkgyFdjPNBYd9br7LpXV1+Emh01fHnq2Gdgrw==",
      "license": "MIT"
    },
    "node_modules/ts-api-utils": {
      "version": "2.5.0",
      "resolved": "https://registry.npmjs.org/ts-api-utils/-/ts-api-utils-2.5.0.tgz",
      "integrity": "sha512-OJ/ibxhPlqrMM0UiNHJ/0CKQkoKF243/AEmplt3qpRgkW8VG7IfOS41h7V8TjITqdByHzrjcS/2si+y4lIh8NA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18.12"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4"
      }
    },
    "node_modules/ts-interface-checker": {
      "version": "0.1.13",
      "resolved": "https://registry.npmjs.org/ts-interface-checker/-/ts-interface-checker-0.1.13.tgz",
      "integrity": "sha512-Y/arvbn+rrz3JCKl9C4kVNfTfSm2/mEp5FSz5EsZSANGPSlQrpRI5M4PKF+mJnE52jOO90PnPSc3Ur3bTQw0gA==",
      "dev": true,
      "license": "Apache-2.0"
    },
    "node_modules/tslib": {
      "version": "2.9.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.9.1.tgz",
      "integrity": "sha512-a4Ux9VKuIMHsOS7ENbEq6hK2ZGYIT27Rtl0E4eD9KqwxhKiQeMZE/9xb3IdYwWaSOyIBQLExhQgXDTYoiCxnWA==",
      "license": "0BSD"
    },
    "node_modules/type-check": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/type-check/-/type-check-0.4.0.tgz",
      "integrity": "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/type-fest": {
      "version": "5.10.0",
      "resolved": "https://registry.npmjs.org/type-fest/-/type-fest-5.10.0.tgz",
      "integrity": "sha512-NoSdpq/WEiAg5sjmBkmV/hfxv6HJH4NqPNrqjtSO5CwRmpsDfaf4begxW34KdJykH/l1yHtwBWQkCRdoXO8mPA==",
      "dev": true,
      "license": "(MIT OR CC0-1.0)",
      "dependencies": {
        "tagged-tag": "^1.0.0"
      },
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/typed-query-selector": {
      "version": "2.12.3",
      "resolved": "https://registry.npmjs.org/typed-query-selector/-/typed-query-selector-2.12.3.tgz",
      "integrity": "sha512-/dtuMZyutHLlrxWhhC1uib00ELUr2dZ8C9B8YzZYsJmeE3V56OxRblrSM2UaF142pcMtak7ehZ6+poWGeehNIg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/typescript": {
      "version": "5.8.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.8.3.tgz",
      "integrity": "sha512-p1diW6TqL9L07nNxvRMM7hMMw4c5XOo/1ibL4aAIGmSAt9slTE1Xgw5KWuof2uTOvCg9BY7ZRi+GaF+7sfgPeQ==",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/typescript-eslint": {
      "version": "8.72.1",
      "resolved": "https://registry.npmjs.org/typescript-eslint/-/typescript-eslint-8.72.1.tgz",
      "integrity": "sha512-3Li9FfPmQp45nxEtFD1ZCrYFI3cYK5kpyNtmm1H7lMagm8u9sy6PTjy3ytwQZs7KNukOyKFHAZ6z6GjYFeaeXw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/eslint-plugin": "8.72.1",
        "@typescript-eslint/parser": "8.72.1",
        "@typescript-eslint/typescript-estree": "8.72.1",
        "@typescript-eslint/utils": "8.72.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/undici-types": {
      "version": "6.21.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-6.21.0.tgz",
      "integrity": "sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ==",
      "license": "MIT"
    },
    "node_modules/update-browserslist-db": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/update-browserslist-db/-/update-browserslist-db-1.3.4.tgz",
      "integrity": "sha512-t8wonIOdQyOjtPd2VktlBu6QjTVTks6v8bSi7kd0r2Vll8TK1JYDZtRRdbmCHOAMphkZgrzK+L+vXK4pyZ8t4A==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "escalade": "^3.2.0",
        "picocolors": "^1.1.1"
      },
      "bin": {
        "update-browserslist-db": "cli.js"
      },
      "peerDependencies": {
        "browserslist": ">= 4.21.0"
      }
    },
    "node_modules/uri-js": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/uri-js/-/uri-js-4.4.1.tgz",
      "integrity": "sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "punycode": "^2.1.0"
      }
    },
    "node_modules/util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/vite": {
      "version": "6.4.5",
      "resolved": "https://registry.npmjs.org/vite/-/vite-6.4.5.tgz",
      "integrity": "sha512-4enwjFfi4IwtEh0w+jPzpLVOFQiPHmmzPxcHXQOyEur47o6u0jE573DmGpjA+7irXoMLYRZD5ZaFUEneS3abPg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "esbuild": "^0.25.0",
        "fdir": "^6.4.4",
        "picomatch": "^4.0.2",
        "postcss": "^8.5.3",
        "rollup": "^4.34.9",
        "tinyglobby": "^0.2.13"
      },
      "bin": {
        "vite": "bin/vite.js"
      },
      "engines": {
        "node": "^18.0.0 || ^20.0.0 || >=22.0.0"
      },
      "funding": {
        "url": "https://github.com/vitejs/vite?sponsor=1"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      },
      "peerDependencies": {
        "@types/node": "^18.0.0 || ^20.0.0 || >=22.0.0",
        "jiti": ">=1.21.0",
        "less": "*",
        "lightningcss": "^1.21.0",
        "sass": "*",
        "sass-embedded": "*",
        "stylus": "*",
        "sugarss": "*",
        "terser": "^5.16.0",
        "tsx": "^4.8.1",
        "yaml": "^2.4.2"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        },
        "jiti": {
          "optional": true
        },
        "less": {
          "optional": true
        },
        "lightningcss": {
          "optional": true
        },
        "sass": {
          "optional": true
        },
        "sass-embedded": {
          "optional": true
        },
        "stylus": {
          "optional": true
        },
        "sugarss": {
          "optional": true
        },
        "terser": {
          "optional": true
        },
        "tsx": {
          "optional": true
        },
        "yaml": {
          "optional": true
        }
      }
    },
    "node_modules/vite-node": {
      "version": "3.2.4",
      "resolved": "https://registry.npmjs.org/vite-node/-/vite-node-3.2.4.tgz",
      "integrity": "sha512-EbKSKh+bh1E1IFxeO0pg1n4dvoOTt0UDiXMd/qn++r98+jPO1xtJilvXldeuQ8giIB5IkpjCgMleHMNEsGH6pg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "cac": "^6.7.14",
        "debug": "^4.4.1",
        "es-module-lexer": "^1.7.0",
        "pathe": "^2.0.3",
        "vite": "^5.0.0 || ^6.0.0 || ^7.0.0-0"
      },
      "bin": {
        "vite-node": "vite-node.mjs"
      },
      "engines": {
        "node": "^18.0.0 || ^20.0.0 || >=22.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/vite/node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/vite/node_modules/picomatch": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.7.tgz",
      "integrity": "sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/vitest": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/vitest/-/vitest-3.2.7.tgz",
      "integrity": "sha512-KrxIJ62Fd89gfysR4WotlgZABiz2dqFPgqGzX7s+CwsqLFomRH7777ZcrOD6+WVAh7khPQP41A+BKbpcJFrdEg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/chai": "^5.2.2",
        "@vitest/expect": "3.2.7",
        "@vitest/mocker": "3.2.7",
        "@vitest/pretty-format": "^3.2.7",
        "@vitest/runner": "3.2.7",
        "@vitest/snapshot": "3.2.7",
        "@vitest/spy": "3.2.7",
        "@vitest/utils": "3.2.7",
        "chai": "^5.2.0",
        "debug": "^4.4.1",
        "expect-type": "^1.2.1",
        "magic-string": "^0.30.17",
        "pathe": "^2.0.3",
        "picomatch": "^4.0.2",
        "std-env": "^3.9.0",
        "tinybench": "^2.9.0",
        "tinyexec": "^0.3.2",
        "tinyglobby": "^0.2.14",
        "tinypool": "^1.1.1",
        "tinyrainbow": "^2.0.0",
        "vite": "^5.0.0 || ^6.0.0 || ^7.0.0-0",
        "vite-node": "3.2.4",
        "why-is-node-running": "^2.3.0"
      },
      "bin": {
        "vitest": "vitest.mjs"
      },
      "engines": {
        "node": "^18.0.0 || ^20.0.0 || >=22.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      },
      "peerDependencies": {
        "@edge-runtime/vm": "*",
        "@types/debug": "^4.1.12",
        "@types/node": "^18.0.0 || ^20.0.0 || >=22.0.0",
        "@vitest/browser": "3.2.7",
        "@vitest/ui": "3.2.7",
        "happy-dom": "*",
        "jsdom": "*"
      },
      "peerDependenciesMeta": {
        "@edge-runtime/vm": {
          "optional": true
        },
        "@types/debug": {
          "optional": true
        },
        "@types/node": {
          "optional": true
        },
        "@vitest/browser": {
          "optional": true
        },
        "@vitest/ui": {
          "optional": true
        },
        "happy-dom": {
          "optional": true
        },
        "jsdom": {
          "optional": true
        }
      }
    },
    "node_modules/vitest/node_modules/picomatch": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.7.tgz",
      "integrity": "sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/w3c-xmlserializer": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/w3c-xmlserializer/-/w3c-xmlserializer-5.0.0.tgz",
      "integrity": "sha512-o8qghlI8NZHU1lLPrpi2+Uq7abh4GGPpYANlalzWxyWteJOCsr/P+oPBA49TOLu5FTZO4d3F9MnWJfiMo4BkmA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "xml-name-validator": "^5.0.0"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/webdriver-bidi-protocol": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/webdriver-bidi-protocol/-/webdriver-bidi-protocol-1.0.1.tgz",
      "integrity": "sha512-WXWs/aXF2a6Al1Z2/V/7Gp2oPZOAAmHjJOTmv4KCXRJ122IMj3tSSMc6a4q3K4QOmhQbse/Ahr+oTVJOU2dUiw==",
      "dev": true,
      "license": "Apache-2.0"
    },
    "node_modules/webidl-conversions": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/webidl-conversions/-/webidl-conversions-7.0.0.tgz",
      "integrity": "sha512-VwddBukDzu71offAQR975unBIGqfKZpM+8ZX6ySk8nYhVoo5CYaZyzt3YBvYtRtO+aoGlqxPg/B87NGVZ/fu6g==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/whatwg-encoding": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/whatwg-encoding/-/whatwg-encoding-3.1.1.tgz",
      "integrity": "sha512-6qN4hJdMwfYBtE3YBTTHhoeuUrDBPZmbQaxWAqSALV/MeEnR5z1xd8UKud2RAkFoPkmB+hli1TZSnyi84xz1vQ==",
      "deprecated": "Use @exodus/bytes instead for a more spec-conformant and faster implementation",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "iconv-lite": "0.6.3"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/whatwg-mimetype": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/whatwg-mimetype/-/whatwg-mimetype-4.0.0.tgz",
      "integrity": "sha512-QaKxh0eNIi2mE9p2vEdzfagOKHCcj1pJ56EEHGQOVxp8r9/iszLUUV7v89x9O1p/T+NlTM5W7jW6+cz4Fq1YVg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/whatwg-url": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/whatwg-url/-/whatwg-url-5.0.0.tgz",
      "integrity": "sha512-saE57nupxk6v3HY35+jzBwYa0rKSy0XR8JSxZPwgLr7ys0IBzhGviA1/TUGJLmSVqs8pb9AnvICXEuOHLprYTw==",
      "license": "MIT",
      "dependencies": {
        "tr46": "~0.0.3",
        "webidl-conversions": "^3.0.0"
      }
    },
    "node_modules/whatwg-url/node_modules/webidl-conversions": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/webidl-conversions/-/webidl-conversions-3.0.1.tgz",
      "integrity": "sha512-2JAn3z8AR6rjK8Sm8orRC0h/bcl/DqL7tRPdGZ4I1CjdF+EaMLmYxBHyXuKL849eucPFhvBoxMsflfOb8kxaeQ==",
      "license": "BSD-2-Clause"
    },
    "node_modules/when-exit": {
      "version": "2.1.5",
      "resolved": "https://registry.npmjs.org/when-exit/-/when-exit-2.1.5.tgz",
      "integrity": "sha512-VGkKJ564kzt6Ms1dbgPP/yuIoQCrsFAnRbptpC5wOEsDaNsbCB2bnfnaA8i/vRs5tjUSEOtIuvl9/MyVsvQZCg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/which": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/which/-/which-2.0.2.tgz",
      "integrity": "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "isexe": "^2.0.0"
      },
      "bin": {
        "node-which": "bin/node-which"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/why-is-node-running": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/why-is-node-running/-/why-is-node-running-2.3.0.tgz",
      "integrity": "sha512-hUrmaWBdVDcxvYqnyh09zunKzROWjbZTiNy8dBEjkS7ehEDQibXJ7XvlmtbwuTclUiIyN+CyXQD4Vmko8fNm8w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "siginfo": "^2.0.0",
        "stackback": "0.0.2"
      },
      "bin": {
        "why-is-node-running": "cli.js"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/word-wrap": {
      "version": "1.2.5",
      "resolved": "https://registry.npmjs.org/word-wrap/-/word-wrap-1.2.5.tgz",
      "integrity": "sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/wrap-ansi": {
      "version": "9.0.2",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-9.0.2.tgz",
      "integrity": "sha512-42AtmgqjV+X1VpdOfyTGOYRi0/zsoLqtXQckTmqTeybT+BDIbM/Guxo7x3pE2vtpr1ok6xRqM9OpBe+Jyoqyww==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^6.2.1",
        "string-width": "^7.0.0",
        "strip-ansi": "^7.1.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/wrap-ansi/node_modules/ansi-regex": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-6.5.0.tgz",
      "integrity": "sha512-zhvbbbdt1kbw7EJ9OQoxmQcuaNR9P5kTj7e/YdmOSU10aHWbycofJxA6jKfoEy3vlLdctOF9ZHaxLtmSm998wQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-regex?sponsor=1"
      }
    },
    "node_modules/wrap-ansi/node_modules/ansi-styles": {
      "version": "6.2.3",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-6.2.3.tgz",
      "integrity": "sha512-4Dj6M28JB+oAH8kFkTLUo+a2jwOFkuqb3yucU0CANcRRUbxS0cP0nZYCGjcc3BNXwRIsUVmDGgzawme7zvJHvg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/wrap-ansi/node_modules/string-width": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-7.2.0.tgz",
      "integrity": "sha512-tsaTIkKW9b4N+AEj+SVA+WhJzV7/zMhcSu78mLKWSk7cXMOSHsBKFWUs0fWwq8QyK3MgJBQRX6Gbi4kYbdvGkQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^10.3.0",
        "get-east-asian-width": "^1.0.0",
        "strip-ansi": "^7.1.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/wrap-ansi/node_modules/strip-ansi": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-7.2.0.tgz",
      "integrity": "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^6.2.2"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/strip-ansi?sponsor=1"
      }
    },
    "node_modules/ws": {
      "version": "8.22.1",
      "resolved": "https://registry.npmjs.org/ws/-/ws-8.22.1.tgz",
      "integrity": "sha512-oyL6OPYme/CmiFvNuGzeoxCJ4nOrZE2O1FwM9MWM1AsGri6nLXB2pg+lNA8aLeXMSav0J6eIVS1j6vUPzUtK9g==",
      "license": "MIT",
      "engines": {
        "node": ">=10.0.0"
      },
      "peerDependencies": {
        "bufferutil": "^4.0.1",
        "utf-8-validate": ">=5.0.2"
      },
      "peerDependenciesMeta": {
        "bufferutil": {
          "optional": true
        },
        "utf-8-validate": {
          "optional": true
        }
      }
    },
    "node_modules/wsl-utils": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/wsl-utils/-/wsl-utils-1.0.1.tgz",
      "integrity": "sha512-c16PKLIRxBYpR3jSWsdS7SFp0COm5SOQdiFjY818dYFHJbMGuLBszpF07LBWmOS1uzrHa9VGdynsEgoeKy0oOQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-wsl": "^3.1.0",
        "powershell-utils": "^0.2.0"
      },
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/wsl-utils/node_modules/is-wsl": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/is-wsl/-/is-wsl-3.1.1.tgz",
      "integrity": "sha512-e6rvdUCiQCAuumZslxRJWR/Doq4VpPR82kqclvcS0efgt430SlGIk05vdCN58+VrzgtIcfNODjozVielycD4Sw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-inside-container": "^1.0.0"
      },
      "engines": {
        "node": ">=16"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/xdg-basedir": {
      "version": "5.1.0",
      "resolved": "https://registry.npmjs.org/xdg-basedir/-/xdg-basedir-5.1.0.tgz",
      "integrity": "sha512-GCPAHLvrIH13+c0SuacwvRYj2SxJXQ4kaVTT5xgL3kPrz56XxkF21IGhjSE1+W0aw7gpBWRGXLCPnPby6lSpmQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/xml-name-validator": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/xml-name-validator/-/xml-name-validator-5.0.0.tgz",
      "integrity": "sha512-EvGK8EJ3DhaHfbRlETOWAS5pO9MZITeauHKJyb8wyajUfQUenkIg2MvLDTZ4T/TgIcm3HU0TFBgWWboAZ30UHg==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/xmlchars": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/xmlchars/-/xmlchars-2.2.0.tgz",
      "integrity": "sha512-JZnDKK8B0RCDw84FNdDAIpZK+JuJw+s7Lz8nksI7SIuU3UXJJslUthsi+uWBUYOwPFwW7W7PRLRfUKpxjtjFCw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/y18n": {
      "version": "5.0.8",
      "resolved": "https://registry.npmjs.org/y18n/-/y18n-5.0.8.tgz",
      "integrity": "sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/yallist": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-3.1.1.tgz",
      "integrity": "sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/yargs": {
      "version": "18.2.0",
      "resolved": "https://registry.npmjs.org/yargs/-/yargs-18.2.0.tgz",
      "integrity": "sha512-9OpKOLeaoNFecEp7P6iYbzze/5CqWoH7N3SMs/6y1XF4nMvFMspEGZzJ6uFi9MmQwXhyzqYoSEKO3tvA3Z/o2w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "cliui": "^9.0.1",
        "escalade": "^3.1.1",
        "get-caller-file": "^2.0.5",
        "string-width": "^8.2.1",
        "y18n": "^5.0.5",
        "yargs-parser": "^22.0.0"
      },
      "engines": {
        "node": "^20.19.0 || ^22.12.0 || >=23"
      }
    },
    "node_modules/yargs-parser": {
      "version": "22.0.0",
      "resolved": "https://registry.npmjs.org/yargs-parser/-/yargs-parser-22.0.0.tgz",
      "integrity": "sha512-rwu/ClNdSMpkSrUb+d6BRsSkLUq1fmfsY6TOpYzTwvwkg1/NRG85KBy3kq++A8LKQwX6lsu+aWad+2khvuXrqw==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": "^20.19.0 || ^22.12.0 || >=23"
      }
    },
    "node_modules/yocto-queue": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/yocto-queue/-/yocto-queue-0.1.0.tgz",
      "integrity": "sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/zod": {
      "version": "3.25.76",
      "resolved": "https://registry.npmjs.org/zod/-/zod-3.25.76.tgz",
      "integrity": "sha512-gzUt/qt81nXsFGKIFcC3YnfEAx5NkunCfnDlvuBSSFS02bcXu4Lmea0AFIUwbLWxWPx3d9p8S5QoaujKcNQxcQ==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/colinhacks"
      }
    }
  }
}
```

## `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#2F4A3A" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preload" href="/fonts/cormorant-garamond-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/manrope-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/images/ritual-hero-800.webp" as="image" type="image/webp" imagesrcset="/images/ritual-hero-400.webp 400w, /images/ritual-hero-800.webp 800w, /images/ritual-hero-1600.webp 1600w" imagesizes="(max-width: 767px) 90vw, 44vw" />
    <title>Veda Sanjeevani | Ayurvedic Wellness & Spa</title>
  </head>
  <body>
    <div id="root"></div>
    <noscript><p style="padding:2rem;font-family:Georgia,serif">Veda Sanjeevani — please enable JavaScript to explore our rituals and book a visit.</p></noscript>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: ['.e2b.app'] },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: ['.e2b.app'] },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion': ['framer-motion'],
          'data': ['@supabase/supabase-js', '@tanstack/react-query'],
        },
      },
    },
  },
});
```

## `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], clearMocks: true, restoreMocks: true },
});
```

## `tsconfig.json`

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

## `tsconfig.app.json`

```json
{
  "compilerOptions": {
    "target": "ES2022", "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"], "module": "ESNext",
    "skipLibCheck": true, "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true, "resolveJsonModule": true,
    "isolatedModules": true, "verbatimModuleSyntax": true,
    "moduleDetection": "force", "noEmit": true, "jsx": "react-jsx",
    "strict": true, "noUnusedLocals": true, "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true, "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true, "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

## `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["ES2022"], "module": "ESNext",
    "skipLibCheck": true, "moduleResolution": "Bundler", "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true, "moduleDetection": "force", "noEmit": true,
    "strict": true, "noUnusedLocals": true, "noUnusedParameters": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

## `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sandal: 'rgb(var(--sandal-rgb) / <alpha-value>)',
        neem: 'rgb(var(--neem-rgb) / <alpha-value>)',
        turmeric: 'rgb(var(--turmeric-rgb) / <alpha-value>)',
        terracotta: 'rgb(var(--terracotta-rgb) / <alpha-value>)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        paper: 'var(--paper)', muted: 'var(--muted)', line: 'var(--line)',
      },
      fontFamily: { display: ['Cormorant Garamond', 'Georgia', 'serif'], body: ['Manrope', 'sans-serif'], hindi: ['Tiro Devanagari Hindi', 'serif'] },
      boxShadow: { soft: '0 20px 70px -25px rgb(30 27 22 / 22%)' },
    },
  },
  plugins: [],
};
```

## `postcss.config.js`

```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

## `eslint.config.js`

```javascript
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public', '*.tsbuildinfo'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.{ts,tsx}'], languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': hooks, 'react-refresh': refresh },
    rules: { ...hooks.configs.recommended.rules, 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }], '@typescript-eslint/no-explicit-any': 'error' },
  },
  { files: ['scripts/*.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
);
```

## `src/data/site.config.json`

```json
{
  "published": true,
  "settings": {
    "business_name": "Veda Sanjeevani",
    "tagline": "Ayurvedic Wellness & Spa",
    "logo_url": null,
    "phone": "",
    "whatsapp": "",
    "email": "",
    "address": "Jaipur, Rajasthan\nStudio address to be confirmed",
    "city": "Jaipur",
    "map_url": "https://www.openstreetmap.org/export/embed.html?bbox=75.72%2C26.86%2C75.88%2C26.96&layer=mapnik",
    "timings": {
      "monday_saturday": {
        "open": "10:00",
        "close": "19:00"
      },
      "sunday": {
        "closed": true
      }
    },
    "theme_preset": "neem",
    "colors": {
      "sandalwood": "#F6EEDD",
      "neem": "#2F4A3A",
      "turmeric": "#D9A233",
      "terracotta": "#B4572F",
      "ink": "#1E1B16"
    },
    "fonts": {
      "heading": "Cormorant Garamond",
      "body": "Manrope"
    },
    "seo": {
      "title": "Veda Sanjeevani | Ayurvedic Wellness & Spa in Jaipur",
      "description": "A quieter rhythm, rooted in Ayurveda. Explore thoughtful wellness rituals, warm-oil therapies and unhurried care in Jaipur. Illustrative website preview."
    },
    "social": {},
    "section_order": [
      "hero",
      "quiz",
      "services",
      "about",
      "team",
      "packages",
      "gallery",
      "testimonials",
      "blog",
      "booking",
      "faq",
      "contact"
    ]
  },
  "sections": [
    {
      "key": "hero",
      "title": "Return to your\nnatural rhythm.",
      "subtitle": "A quieter rhythm, rooted in Ayurveda.",
      "body": "{\"text\": \"Step away from the everyday. Discover warm oils, unhurried rituals and care that begins with listening.\", \"chips\": [\"Thoughtful practitioners\", \"Herbal oil rituals\", \"Kerala-inspired care\"]}",
      "image_url": "/images/ritual-hero-800.webp",
      "visible": true,
      "sort_order": 1
    },
    {
      "key": "quiz",
      "title": "What does your\nnature need?",
      "subtitle": "A gentle starting point",
      "body": "Five simple questions. A moment of reflection. Discover your dosha pattern through the lens of Ayurvedic tradition.",
      "image_url": "/images/herbal-ritual-800.webp",
      "visible": true,
      "sort_order": 2
    },
    {
      "key": "services",
      "title": "Rituals for your\nkind of balance.",
      "subtitle": "Ancient wisdom. Personal care.",
      "body": "From grounding warm-oil massage to a quiet moment of stillness, find a ritual that meets you where you are.",
      "image_url": "/images/sanctuary-800.webp",
      "visible": true,
      "sort_order": 3
    },
    {
      "key": "about",
      "title": "Rooted in tradition.\nMade for you.",
      "subtitle": "The Veda Sanjeevani philosophy",
      "body": "{\"text\": \"We believe wellbeing begins with making space. Space to slow down, to be heard, and to reconnect with your own natural rhythm. Our approach brings the warmth of Indian hospitality to thoughtfully guided Ayurvedic wellness.\", \"philosophy\": \"Not more. More meaningful. Every ritual is an invitation to return to yourself.\", \"stats\": [{\"value\": \"12\", \"label\": \"thoughtful rituals\"}, {\"value\": \"4\", \"label\": \"practitioner profiles\"}, {\"value\": \"1\", \"label\": \"moment just for you\"}]}",
      "image_url": "/images/sanctuary-800.webp",
      "visible": true,
      "sort_order": 4
    },
    {
      "key": "team",
      "title": "Good care begins\nwith good people.",
      "subtitle": "Meet your Vaidyas",
      "body": "A thoughtfully chosen team, a listening ear, and an approach shaped around your comfort. Meet the people behind the rituals.",
      "image_url": "/images/vaidya-ananya-800.webp",
      "visible": true,
      "sort_order": 5
    },
    {
      "key": "packages",
      "title": "A little more time.\nA little more you.",
      "subtitle": "Thoughtfully paired experiences",
      "body": "Our favourite rituals, brought together. Set aside an afternoon and let the rest of the world wait.",
      "image_url": "/images/herbal-ritual-800.webp",
      "visible": true,
      "sort_order": 6
    },
    {
      "key": "gallery",
      "title": "A space to\nsimply be.",
      "subtitle": "Inside the sanctuary",
      "body": "Warm light. Natural textures. Quiet corners. A glimpse into the world we are creating.",
      "image_url": "/images/sanctuary-800.webp",
      "visible": true,
      "sort_order": 7
    },
    {
      "key": "testimonials",
      "title": "Small moments.\nLasting feelings.",
      "subtitle": "Guest reflections",
      "body": "The reflections below are fictional examples, not verified guest reviews. Replace them with consented feedback before publishing.",
      "image_url": "/images/herbal-ritual-800.webp",
      "visible": true,
      "sort_order": 8
    },
    {
      "key": "blog",
      "title": "Notes on\nliving well.",
      "subtitle": "The wellness journal",
      "body": "Seasonal thoughts, simple practices and a little Ayurvedic wisdom for the everyday. These are illustrative editorial drafts.",
      "image_url": "/images/herbal-ritual-800.webp",
      "visible": true,
      "sort_order": 9
    },
    {
      "key": "booking",
      "title": "Make time\nfor yourself.",
      "subtitle": "Reserve your ritual",
      "body": "Choose your ritual and a moment that works for you. We will take care of the little details.",
      "image_url": "/images/ritual-hero-800.webp",
      "visible": true,
      "sort_order": 10
    },
    {
      "key": "faq",
      "title": "A little clarity,\nbefore you arrive.",
      "subtitle": "Before your visit",
      "body": "A few things you might be wondering. For anything else, our team is here to help.",
      "image_url": "/images/sanctuary-800.webp",
      "visible": true,
      "sort_order": 11
    },
    {
      "key": "contact",
      "title": "Your quieter corner\nof the city.",
      "subtitle": "Find us",
      "body": "This preview uses an illustrative Jaipur location. Add your verified studio address and contact details before accepting visitors.",
      "image_url": "/images/sanctuary-800.webp",
      "visible": true,
      "sort_order": 12
    }
  ],
  "services": [
    {
      "id": "a0000000-0000-4000-8000-000000000001",
      "slug": "abhyanga",
      "name": "Abhyanga",
      "category": "relax",
      "duration_min": 60,
      "price": 2400,
      "benefits": [
        "Supports relaxation",
        "Encourages a sense of grounding"
      ],
      "dosha_tags": [
        "vata",
        "kapha"
      ],
      "short_desc": "A warm-oil, full-body massage with flowing, rhythmic strokes.",
      "long_desc": "This placeholder ritual uses warm herbal oils selected for your preferences. Gentle, coordinated strokes support relaxation and a feeling of grounding. Your practitioner discusses pressure and sensitivities before the session. It is a wellness experience, not a medical treatment.",
      "image_url": "/images/ritual-hero-800.webp",
      "image_alt": "Illustrative imagery for Abhyanga",
      "sort_order": 1
    },
    {
      "id": "a0000000-0000-4000-8000-000000000002",
      "slug": "shirodhara",
      "name": "Shirodhara",
      "category": "mind",
      "duration_min": 45,
      "price": 2800,
      "benefits": [
        "Supports mental unwinding",
        "Encourages restful moments"
      ],
      "dosha_tags": [
        "vata",
        "pitta"
      ],
      "short_desc": "A steady stream of warm oil over the forehead invites quiet stillness.",
      "long_desc": "Shirodhara is traditionally used as a calming wellness practice. A practitioner gently pours warm oil across the forehead while you rest comfortably. The experience supports time away from everyday stimulation. Suitability and comfort are discussed before beginning.",
      "image_url": "/images/herbal-ritual-800.webp",
      "image_alt": "Illustrative imagery for Shirodhara",
      "sort_order": 2
    },
    {
      "id": "a0000000-0000-4000-8000-000000000003",
      "slug": "panchakarma-detox",
      "name": "Panchakarma Detox",
      "category": "detox",
      "duration_min": 90,
      "price": 4800,
      "benefits": [
        "Supports a mindful reset",
        "Encourages consistent self-care"
      ],
      "dosha_tags": [
        "kapha",
        "vata"
      ],
      "short_desc": "A spa-level wellness ritual inspired by traditional Ayurvedic practices.",
      "long_desc": "This introductory experience combines gentle warmth, massage and rest. It traditionally supports a considered self-care routine. The spa offering does not include medical cleansing procedures or guaranteed detoxification. A qualified clinician should advise on clinical Panchakarma.",
      "image_url": "/images/sanctuary-800.webp",
      "image_alt": "Illustrative imagery for Panchakarma Detox",
      "sort_order": 3
    },
    {
      "id": "a0000000-0000-4000-8000-000000000004",
      "slug": "udvartana",
      "name": "Udvartana",
      "category": "beauty",
      "duration_min": 60,
      "price": 2600,
      "benefits": [
        "Supports skin conditioning",
        "Leaves skin feeling refreshed"
      ],
      "dosha_tags": [
        "kapha"
      ],
      "short_desc": "An invigorating herbal-powder massage with upward, energising strokes.",
      "long_desc": "A blend of finely prepared herbs is used in a rhythmic dry massage. The ritual supports gentle exfoliation and skin conditioning. Your practitioner adapts pressure to your comfort and checks for sensitivities. Results vary and no body-shape changes are promised.",
      "image_url": "/images/herbal-ritual-800.webp",
      "image_alt": "Illustrative imagery for Udvartana",
      "sort_order": 4
    },
    {
      "id": "a0000000-0000-4000-8000-000000000005",
      "slug": "kati-basti",
      "name": "Kati Basti",
      "category": "pain_relief",
      "duration_min": 45,
      "price": 2200,
      "benefits": [
        "Supports lower-back comfort",
        "Encourages muscular relaxation"
      ],
      "dosha_tags": [
        "vata"
      ],
      "short_desc": "Localised warmth and warm oil are traditionally used for lower-back comfort.",
      "long_desc": "A comfortable oil reservoir is created over the lower back using a dough boundary. Warm oil is maintained for a short, supervised period. This wellness ritual supports relaxation around the lower back. Persistent or severe pain needs assessment by a qualified healthcare professional.",
      "image_url": "/images/ritual-hero-800.webp",
      "image_alt": "Illustrative imagery for Kati Basti",
      "sort_order": 5
    },
    {
      "id": "a0000000-0000-4000-8000-000000000006",
      "slug": "pizhichil",
      "name": "Pizhichil",
      "category": "pain_relief",
      "duration_min": 75,
      "price": 3800,
      "benefits": [
        "Supports whole-body relaxation",
        "Encourages a feeling of warmth"
      ],
      "dosha_tags": [
        "vata"
      ],
      "short_desc": "Continuous warm oil and gentle massage create a deeply restful ritual.",
      "long_desc": "Pizhichil combines warm oil application with coordinated massage. Traditionally used as a nourishing wellness practice, it encourages comfort and rest. Your practitioner explains each step and adjusts temperature carefully. It is not a substitute for care for joint or muscle conditions.",
      "image_url": "/images/ritual-hero-800.webp",
      "image_alt": "Illustrative imagery for Pizhichil",
      "sort_order": 6
    },
    {
      "id": "a0000000-0000-4000-8000-000000000007",
      "slug": "netra-tarpana",
      "name": "Netra Tarpana",
      "category": "relax",
      "duration_min": 30,
      "price": 1600,
      "benefits": [
        "Encourages screen-break rest",
        "Supports a calming pause"
      ],
      "dosha_tags": [
        "pitta",
        "vata"
      ],
      "short_desc": "A traditional eye-area wellness ritual centred on rest and stillness.",
      "long_desc": "This placeholder offering is a supervised, non-invasive eye-area comfort ritual. It encourages a quiet break from screens and everyday visual demands. No eye conditions are treated or diagnosed. Clinical eye procedures require an appropriately qualified practitioner and separate assessment.",
      "image_url": "/images/herbal-ritual-800.webp",
      "image_alt": "Illustrative imagery for Netra Tarpana",
      "sort_order": 7
    },
    {
      "id": "a0000000-0000-4000-8000-000000000008",
      "slug": "nasya",
      "name": "Nasya",
      "category": "detox",
      "duration_min": 30,
      "price": 1500,
      "benefits": [
        "Supports a feeling of freshness",
        "Encourages mindful breathing"
      ],
      "dosha_tags": [
        "kapha"
      ],
      "short_desc": "A gentle facial and steam experience inspired by the tradition of Nasya.",
      "long_desc": "This spa adaptation combines a gentle facial massage with comfortable external steam. It is traditionally associated with a feeling of freshness in the head and neck area. No nasal medication is administered in this wellness offering. Ask a clinician about clinical Nasya or persistent symptoms.",
      "image_url": "/images/sanctuary-800.webp",
      "image_alt": "Illustrative imagery for Nasya",
      "sort_order": 8
    },
    {
      "id": "a0000000-0000-4000-8000-000000000009",
      "slug": "mukha-lepa-herbal-facial",
      "name": "Mukha Lepa Herbal Facial",
      "category": "beauty",
      "duration_min": 60,
      "price": 2300,
      "benefits": [
        "Supports skin hydration",
        "Encourages a refreshed appearance"
      ],
      "dosha_tags": [
        "pitta"
      ],
      "short_desc": "A cooling herbal facial tailored to your skin preferences.",
      "long_desc": "Gentle cleansing is followed by a herbal mask and a relaxed facial massage. Ingredients are discussed in advance and a patch test may be recommended. The ritual supports skin conditioning and a refreshed appearance. It does not diagnose or treat skin disease.",
      "image_url": "/images/herbal-ritual-800.webp",
      "image_alt": "Illustrative imagery for Mukha Lepa Herbal Facial",
      "sort_order": 9
    },
    {
      "id": "a0000000-0000-4000-8000-000000000010",
      "slug": "garbhini-care",
      "name": "Garbhini Care",
      "category": "relax",
      "duration_min": 60,
      "price": 2700,
      "benefits": [
        "Supports relaxation during pregnancy",
        "Encourages comfortable rest"
      ],
      "dosha_tags": [
        "vata"
      ],
      "short_desc": "A gentle, position-adapted massage for expectant guests with clinical clearance.",
      "long_desc": "This placeholder ritual is adapted for comfort during pregnancy. Written clearance from the guest’s maternity clinician and a trained prenatal practitioner are required. Positioning and pressure are adjusted throughout the session. It does not replace antenatal care or treat pregnancy complications.",
      "image_url": "/images/sanctuary-800.webp",
      "image_alt": "Illustrative imagery for Garbhini Care",
      "sort_order": 10
    },
    {
      "id": "a0000000-0000-4000-8000-000000000011",
      "slug": "ayurvedic-consultation",
      "name": "Ayurvedic Consultation",
      "category": "detox",
      "duration_min": 45,
      "price": 1800,
      "benefits": [
        "Supports informed wellness choices",
        "Encourages a personalised routine"
      ],
      "dosha_tags": [
        "vata",
        "pitta",
        "kapha"
      ],
      "short_desc": "A wellness conversation about your routines, preferences and goals.",
      "long_desc": "A practitioner listens to your daily routine and self-care goals. The discussion explores traditional Ayurvedic concepts and suitable spa experiences. Educational guidance is individualised without promising medical outcomes. Medical diagnosis and medication decisions remain with your healthcare professional.",
      "image_url": "/images/vaidya-ananya-800.webp",
      "image_alt": "Illustrative imagery for Ayurvedic Consultation",
      "sort_order": 11
    },
    {
      "id": "a0000000-0000-4000-8000-000000000012",
      "slug": "yoga-meditation",
      "name": "Yoga & Meditation",
      "category": "mind",
      "duration_min": 60,
      "price": 1200,
      "benefits": [
        "Supports gentle movement",
        "Encourages mindful breathing"
      ],
      "dosha_tags": [
        "vata",
        "pitta",
        "kapha"
      ],
      "short_desc": "A gentle movement and guided-breathing session adaptable to experience.",
      "long_desc": "A practitioner guides comfortable movement, breathing awareness and rest. Options are offered for different mobility levels and experience. The session supports a mindful pause rather than athletic performance. Tell your practitioner about injuries or pregnancy before participating.",
      "image_url": "/images/vaidya-meera-800.webp",
      "image_alt": "Illustrative imagery for Yoga & Meditation",
      "sort_order": 12
    }
  ],
  "packages": [
    {
      "id": "a2000000-0000-4000-8000-000000000001",
      "name": "The Grounding Ritual",
      "description": "A warm-oil massage followed by a calming Shirodhara session. A little space to feel like yourself again.",
      "price": 4900,
      "includes": [
        "Abhyanga · 60 minutes",
        "Shirodhara · 45 minutes",
        "Herbal tea and quiet rest"
      ],
      "is_featured": true,
      "image_url": "/images/ritual-hero-800.webp",
      "image_alt": "Illustrative The Grounding Ritual experience",
      "sort_order": 1
    },
    {
      "id": "a2000000-0000-4000-8000-000000000002",
      "name": "The Refresh Edit",
      "description": "An invigorating herbal-powder massage and a conditioning facial, thoughtfully paired.",
      "price": 4500,
      "includes": [
        "Udvartana · 60 minutes",
        "Mukha Lepa Herbal Facial · 60 minutes",
        "Herbal tea"
      ],
      "is_featured": false,
      "image_url": "/images/herbal-ritual-800.webp",
      "image_alt": "Illustrative The Refresh Edit experience",
      "sort_order": 2
    },
    {
      "id": "a2000000-0000-4000-8000-000000000003",
      "name": "A Mindful Morning",
      "description": "A personalised wellness conversation, gentle movement and a quieter mind.",
      "price": 2700,
      "includes": [
        "Ayurvedic Consultation · 45 minutes",
        "Yoga & Meditation · 60 minutes",
        "Seasonal herbal tea"
      ],
      "is_featured": false,
      "image_url": "/images/sanctuary-800.webp",
      "image_alt": "Illustrative A Mindful Morning experience",
      "sort_order": 3
    }
  ],
  "staff": [
    {
      "id": "a1000000-0000-4000-8000-000000000001",
      "name": "Dr. Ananya Sharma",
      "role": "Lead Ayurvedic Practitioner",
      "qualification": "BAMS · illustrative profile",
      "specialty": [
        "Ayurvedic consultation",
        "Abhyanga"
      ],
      "bio": "An illustrative practitioner profile. Replace this biography, photograph and qualifications with verified information before publishing.",
      "photo_url": "/images/vaidya-ananya-800.webp",
      "photo_alt": "Illustrative portrait for Dr. Ananya Sharma",
      "sort_order": 1,
      "service_ids": [
        "a0000000-0000-4000-8000-000000000001",
        "a0000000-0000-4000-8000-000000000002",
        "a0000000-0000-4000-8000-000000000003",
        "a0000000-0000-4000-8000-000000000004",
        "a0000000-0000-4000-8000-000000000005",
        "a0000000-0000-4000-8000-000000000006",
        "a0000000-0000-4000-8000-000000000007",
        "a0000000-0000-4000-8000-000000000008",
        "a0000000-0000-4000-8000-000000000009",
        "a0000000-0000-4000-8000-000000000010",
        "a0000000-0000-4000-8000-000000000011"
      ],
      "gallery": [
        {
          "id": "a5000000-0000-4000-8000-000000000001",
          "image_url": "/images/herbal-ritual-400.webp",
          "caption": "The tools of a thoughtful ritual",
          "sort_order": 1
        }
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000000000002",
      "name": "Meera Iyer",
      "role": "Senior Wellness Therapist",
      "qualification": "Ayurvedic massage training · illustrative profile",
      "specialty": [
        "Shirodhara",
        "Pizhichil"
      ],
      "bio": "An illustrative practitioner profile. Replace this biography, photograph and qualifications with verified information before publishing.",
      "photo_url": "/images/vaidya-meera-800.webp",
      "photo_alt": "Illustrative portrait for Meera Iyer",
      "sort_order": 2,
      "service_ids": [
        "a0000000-0000-4000-8000-000000000001",
        "a0000000-0000-4000-8000-000000000002",
        "a0000000-0000-4000-8000-000000000003",
        "a0000000-0000-4000-8000-000000000005",
        "a0000000-0000-4000-8000-000000000006",
        "a0000000-0000-4000-8000-000000000007",
        "a0000000-0000-4000-8000-000000000008",
        "a0000000-0000-4000-8000-000000000010"
      ],
      "gallery": [
        {
          "id": "a5000000-0000-4000-8000-000000000002",
          "image_url": "/images/herbal-ritual-400.webp",
          "caption": "The tools of a thoughtful ritual",
          "sort_order": 1
        }
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000000000003",
      "name": "Rahul Menon",
      "role": "Wellness Therapist",
      "qualification": "Spa therapy training · illustrative profile",
      "specialty": [
        "Udvartana",
        "Herbal facial"
      ],
      "bio": "An illustrative practitioner profile. Replace this biography, photograph and qualifications with verified information before publishing.",
      "photo_url": "/images/vaidya-rahul-800.webp",
      "photo_alt": "Illustrative portrait for Rahul Menon",
      "sort_order": 3,
      "service_ids": [
        "a0000000-0000-4000-8000-000000000001",
        "a0000000-0000-4000-8000-000000000004",
        "a0000000-0000-4000-8000-000000000005",
        "a0000000-0000-4000-8000-000000000009",
        "a0000000-0000-4000-8000-000000000010"
      ],
      "gallery": [
        {
          "id": "a5000000-0000-4000-8000-000000000003",
          "image_url": "/images/herbal-ritual-400.webp",
          "caption": "The tools of a thoughtful ritual",
          "sort_order": 1
        }
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000000000004",
      "name": "Kavya Rao",
      "role": "Yoga & Mindfulness Guide",
      "qualification": "Yoga teaching · illustrative profile",
      "specialty": [
        "Yoga",
        "Meditation"
      ],
      "bio": "An illustrative practitioner profile. Replace this biography, photograph and qualifications with verified information before publishing.",
      "photo_url": "/images/vaidya-meera-800.webp",
      "photo_alt": "Illustrative portrait for Kavya Rao",
      "sort_order": 4,
      "service_ids": [
        "a0000000-0000-4000-8000-000000000012"
      ],
      "gallery": [
        {
          "id": "a5000000-0000-4000-8000-000000000004",
          "image_url": "/images/herbal-ritual-400.webp",
          "caption": "The tools of a thoughtful ritual",
          "sort_order": 1
        }
      ]
    }
  ],
  "gallery": [
    {
      "id": "a6000000-0000-4000-8000-000000000001",
      "image_url": "/images/sanctuary-800.webp",
      "image_alt": "Sunlight through a carved jharokha in an illustrative Ayurvedic spa",
      "caption": "The art of slowing down",
      "category": "spaces",
      "sort_order": 1
    },
    {
      "id": "a6000000-0000-4000-8000-000000000002",
      "image_url": "/images/ritual-hero-800.webp",
      "image_alt": "A brass bowl and warm oil in an illustrative wellness ritual",
      "caption": "Warmth, passed from hand to hand",
      "category": "rituals",
      "sort_order": 2
    },
    {
      "id": "a6000000-0000-4000-8000-000000000003",
      "image_url": "/images/herbal-ritual-800.webp",
      "image_alt": "Herbal oil, jasmine and neem leaves on sandstone",
      "caption": "Nature, in the little details",
      "category": "details",
      "sort_order": 3
    },
    {
      "id": "a6000000-0000-4000-8000-000000000004",
      "image_url": "/images/sanctuary-800.webp",
      "image_alt": "An ivory treatment bed in a warm sandstone room",
      "caption": "A room of your own",
      "category": "spaces",
      "sort_order": 4
    },
    {
      "id": "a6000000-0000-4000-8000-000000000005",
      "image_url": "/images/herbal-ritual-800.webp",
      "image_alt": "Fresh botanical ingredients and a traditional brass bowl",
      "caption": "Rooted in the everyday",
      "category": "details",
      "sort_order": 5
    },
    {
      "id": "a6000000-0000-4000-8000-000000000006",
      "image_url": "/images/ritual-hero-800.webp",
      "image_alt": "A calm, Kerala-inspired treatment space",
      "caption": "A gentler kind of luxury",
      "category": "rituals",
      "sort_order": 6
    }
  ],
  "testimonials": [
    {
      "id": "a4000000-0000-4000-8000-000000000001",
      "name": "A sample guest reflection",
      "rating": 5,
      "text": "Fictional example: the team explained every step and the space felt peaceful. A welcome pause in a busy week.",
      "photo_url": null,
      "sort_order": 1
    },
    {
      "id": "a4000000-0000-4000-8000-000000000002",
      "name": "A sample guest reflection",
      "rating": 5,
      "text": "Fictional example: thoughtful guidance and a comfortable, unhurried experience. Time to simply be.",
      "photo_url": null,
      "sort_order": 2
    },
    {
      "id": "a4000000-0000-4000-8000-000000000003",
      "name": "A sample guest reflection",
      "rating": 4,
      "text": "Fictional example: the gentle yoga session was easy to adapt to my experience. I appreciated the quiet.",
      "photo_url": null,
      "sort_order": 3
    }
  ],
  "faqs": [
    {
      "id": "a3000000-0000-4000-8000-000000000001",
      "question": "What should I expect on my first visit?",
      "answer": "Please arrive 15 minutes early. We will talk through your preferences, sensitivities and comfort before your ritual. Share any medical concerns with your clinician before booking.",
      "sort_order": 1
    },
    {
      "id": "a3000000-0000-4000-8000-000000000002",
      "question": "Are these rituals medical treatments?",
      "answer": "No. Our spa experiences support general wellness and do not replace medical diagnosis or treatment. Speak with a qualified clinician about health concerns.",
      "sort_order": 2
    },
    {
      "id": "a3000000-0000-4000-8000-000000000003",
      "question": "Can I book during pregnancy?",
      "answer": "Please tell us when booking. Garbhini Care requires clearance from your maternity clinician and an appropriately trained practitioner. Your safety comes first.",
      "sort_order": 3
    },
    {
      "id": "a3000000-0000-4000-8000-000000000004",
      "question": "How do I choose a service?",
      "answer": "Explore the ritual descriptions, try our educational dosha quiz, or choose a wellness consultation. Your practitioner can help you understand the spa options.",
      "sort_order": 4
    },
    {
      "id": "a3000000-0000-4000-8000-000000000005",
      "question": "What should I bring?",
      "answer": "Comfortable clothing and anything that helps you feel at ease. Please let us know about allergies, sensitivities or accessibility needs in your booking notes.",
      "sort_order": 5
    },
    {
      "id": "a3000000-0000-4000-8000-000000000006",
      "question": "What if I need to reschedule?",
      "answer": "Please contact the studio as soon as your plans change. The final cancellation and rescheduling policy will be provided by the studio before launch.",
      "sort_order": 6
    }
  ],
  "blog_posts": [
    {
      "id": "a7000000-0000-4000-8000-000000000001",
      "title": "Making room for a slower morning",
      "slug": "making-room-for-a-slower-morning",
      "excerpt": "Small, sustainable ideas for a more mindful start. No perfect routine required.",
      "body": "<p>Before the day asks anything of you, take a moment to notice how you feel. Open a curtain. Drink a glass of water. Let your shoulders settle.</p><h2>Begin with something small</h2><p>A few comfortable stretches or a quiet cup of herbal tea can become a gentle cue to slow down. There is no single routine that suits everyone.</p><p>Choose something enjoyable and realistic. Consistent rest and gentle routines support everyday wellbeing; they do not replace medical care.</p>",
      "cover_url": "/images/herbal-ritual-800.webp",
      "cover_alt": "Illustrative cover for Making room for a slower morning",
      "published_at": "2026-10-20T09:00:00+05:30"
    },
    {
      "id": "a7000000-0000-4000-8000-000000000002",
      "title": "Understanding the three doshas",
      "slug": "understanding-the-three-doshas",
      "excerpt": "An introductory, educational guide to Vata, Pitta and Kapha.",
      "body": "<p>Ayurvedic tradition describes three doshas as a framework for understanding individual patterns: Vata, Pitta and Kapha. This is a traditional lens, not a medical diagnosis.</p><h2>A language for observation</h2><p>Vata is often associated with movement, Pitta with transformation, and Kapha with stability. Everyone is described as a unique combination.</p><p>Our quiz is a simple educational introduction. It cannot determine your health needs or the suitability of a therapy. Discuss persistent symptoms with a qualified clinician.</p>",
      "cover_url": "/images/sanctuary-800.webp",
      "cover_alt": "Illustrative cover for Understanding the three doshas",
      "published_at": "2026-10-17T09:00:00+05:30"
    },
    {
      "id": "a7000000-0000-4000-8000-000000000003",
      "title": "Preparing for your first spa visit",
      "slug": "preparing-for-your-first-spa-visit",
      "excerpt": "A few thoughtful questions to ask before choosing your first ritual.",
      "body": "<p>Your first visit should feel comfortable from the moment you arrive. Allow a little extra time, wear comfortable clothing and bring any questions you have.</p><h2>Let your practitioner know</h2><p>Share relevant allergies, sensitivities, pregnancy, medications and access needs. Ask about ingredients, pressure, session length and aftercare before beginning.</p><p>Ayurvedic spa therapies support general wellness and do not replace medical treatment. Consult your doctor, especially if pregnant or under treatment.</p>",
      "cover_url": "/images/ritual-hero-800.webp",
      "cover_alt": "Illustrative cover for Preparing for your first spa visit",
      "published_at": "2026-10-14T09:00:00+05:30"
    }
  ]
}
```

## `src/data/categories.ts`

```typescript
import type { Category } from '../types';
export const CATEGORIES: { key: Category | 'all'; label: string }[] = [{ key: 'all', label: 'All rituals' }, { key: 'relax', label: 'Relax' }, { key: 'detox', label: 'Detox' }, { key: 'pain_relief', label: 'Pain relief' }, { key: 'beauty', label: 'Beauty' }, { key: 'mind', label: 'Mind' }];
```

## `src/data/quiz.ts`

```typescript
import type { Dosha } from '../types';

export const QUIZ_QUESTIONS: { question: string; hint: string; options: { label: string; dosha: Dosha }[] }[] = [
  { question: 'How would you describe your natural energy?', hint: 'Think about your usual rhythm, not just today.', options: [{ label: 'Quick bursts, then I need a recharge', dosha: 'vata' }, { label: 'Focused and driven, with a steady spark', dosha: 'pitta' }, { label: 'Steady and enduring, once I get going', dosha: 'kapha' }] },
  { question: 'What feels most like your natural build?', hint: 'There is no ideal shape. This is a traditional lens.', options: [{ label: 'Light, with a tendency to feel cool', dosha: 'vata' }, { label: 'Medium, and I often feel warm', dosha: 'pitta' }, { label: 'Solid, with a naturally grounded feeling', dosha: 'kapha' }] },
  { question: 'How do you usually approach a busy day?', hint: 'Choose the response that comes most naturally.', options: [{ label: 'I have lots of ideas and move between them', dosha: 'vata' }, { label: 'I make a plan and focus on getting it done', dosha: 'pitta' }, { label: 'I take my time and stay with one thing', dosha: 'kapha' }] },
  { question: 'Which kind of weather feels most comfortable?', hint: 'Your everyday preference, rather than a holiday memory.', options: [{ label: 'Warm, gently humid days', dosha: 'vata' }, { label: 'Cool, fresh mornings', dosha: 'pitta' }, { label: 'Warm, dry and bright afternoons', dosha: 'kapha' }] },
  { question: 'What would a restorative afternoon look like?', hint: 'Imagine an afternoon with nothing you have to do.', options: [{ label: 'A change of scene and a little creative freedom', dosha: 'vata' }, { label: 'A quiet walk somewhere cool and green', dosha: 'pitta' }, { label: 'A slow, comforting routine close to home', dosha: 'kapha' }] },
];
export const DOSHA_COPY: Record<string, { name: string; element: string; description: string }> = {
  vata: { name: 'Vata', element: 'Air & space', description: 'The rhythm of movement and creativity. In Ayurvedic tradition, Vata invites grounding, warmth and a little more stillness.' },
  pitta: { name: 'Pitta', element: 'Fire & water', description: 'The rhythm of focus and transformation. Pitta invites a softer pace, cooling moments and space to simply be.' },
  kapha: { name: 'Kapha', element: 'Earth & water', description: 'The rhythm of steadiness and connection. Kapha invites gentle movement, fresh experiences and a little lightness.' },
  'vata-pitta': { name: 'Vata-Pitta', element: 'Movement & transformation', description: 'Your answers share two rhythms. Explore grounding warmth alongside cooling, unhurried moments. This is a starting point, not a diagnosis.' },
  'vata-kapha': { name: 'Vata-Kapha', element: 'Movement & steadiness', description: 'Your answers share two rhythms. Explore a balance of gentle stimulation and comforting routine, guided by what feels right today.' },
  'pitta-kapha': { name: 'Pitta-Kapha', element: 'Transformation & steadiness', description: 'Your answers share two rhythms. Explore fresh, gentle movement with cooling moments of rest. A traditional lens, not a health assessment.' },
  tridoshic: { name: 'Tridoshic', element: 'A meeting of all three', description: 'Your answers are evenly balanced across all three patterns. Explore a gentle, adaptable ritual and let your comfort guide you.' },
};
export function scoreQuiz(answers: readonly Dosha[]) {
  if (answers.length !== QUIZ_QUESTIONS.length || answers.some((answer) => !['vata', 'pitta', 'kapha'].includes(answer))) throw new Error('Answer all five questions.');
  const scores = { vata: 0, pitta: 0, kapha: 0 };
  for (const answer of answers) scores[answer] += 1;
  const highest = Math.max(...Object.values(scores));
  const leaders = (Object.keys(scores) as Dosha[]).filter((key) => scores[key] === highest);
  const result = leaders.length === 3 ? 'tridoshic' : leaders.join('-');
  return { scores, result, doshas: leaders, copy: DOSHA_COPY[result]! };
}
```

## `src/hooks/siteContext.ts`

```typescript
import { createContext } from 'react';
import type { Env } from '../lib/env';
import type { SiteState } from '../types';
export const SiteContext = createContext<(SiteState & { env: Env; refresh: () => void }) | null>(null);
```

## `src/hooks/useFocusTrap.ts`

```typescript
import { useEffect, type RefObject } from 'react';
const selector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(selector) ?? []).filter((el) => el.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => (focusable()[0] ?? ref.current)?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const items = focusable(); const first = items[0]; const last = items.at(-1);
      if (!first) { event.preventDefault(); ref.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !ref.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !ref.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', keydown); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, [ref, active, onClose]);
}
```

## `src/hooks/useReducedMotionSafe.ts`

```typescript
import { useSyncExternalStore } from 'react';
const query = '(prefers-reduced-motion: reduce)';
function subscribe(callback: () => void) {
  const media = window.matchMedia?.(query);
  media?.addEventListener('change', callback);
  return () => media?.removeEventListener('change', callback);
}
const snapshot = () => window.matchMedia?.(query)?.matches ?? false;
const serverSnapshot = () => false;
/** Reactive OS preference; all motion consumers use this single safe hook. */
export function useReducedMotionSafe() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
```

## `src/hooks/useSite.ts`

```typescript
import { useContext } from 'react';
import { SiteContext } from './siteContext';
export function useSite() { const context = useContext(SiteContext); if (!context) throw new Error('SiteProvider is missing.'); return context; }
```

## `src/lib/analytics.ts`

```typescript
/** Consent-gated integration hook. No third-party script is included or loaded. */
export function initializeAnalytics(loader?: () => Promise<void>) {
  const allowed = () => { try { return localStorage.getItem('veda-consent') === 'accepted'; } catch { return false; } };
  let started = false;
  const start = () => { if (!loader || started || !allowed()) return; started = true; void loader().catch(() => { started = false; }); };
  const onConsent = (event: Event) => { if (event instanceof CustomEvent && event.detail === 'accepted') start(); };
  window.addEventListener('veda:consent', onConsent);
  start();
  return () => window.removeEventListener('veda:consent', onConsent);
}
```

## `src/lib/api.ts`

```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import fallbackJson from '../data/site.config.json';
import { siteSchema, slotsSchema, bookingResultSchema, quizResultSchema, reviewResultSchema, blogSchema, workingHoursSchema } from './schemas';
import type { Env } from './env';
import type { Site, SiteState, BookingResult } from '../types';
import { normalizePhone } from './format';

export const fallbackSite: Site = siteSchema.parse(fallbackJson);
let client: SupabaseClient | null = null;
export function getSupabase(env: Env) { return client ??= createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) } }); }
async function rpc(env: Env, name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await getSupabase(env).rpc(name, args);
  if (error) throw new Error('The live service is temporarily unavailable. Please try again.');
  return data as unknown;
}
export async function loadSite(env: Env): Promise<SiteState> {
  try { const parsed = siteSchema.parse(await rpc(env, 'get_public_site')); if (!parsed.published || !parsed.settings.business_name) throw new Error('Not published'); return { site: parsed, source: 'live' }; }
  catch { return { site: fallbackSite, source: 'saved' }; }
}
export async function loadBlog(env: Env, slug: string, source: SiteState['source']) {
  const saved = fallbackSite.blog_posts.find((post) => post.slug === slug);
  if (source === 'saved') { if (saved) return saved; throw new Error('This article is not in the saved collection.'); }
  try { const { data, error } = await getSupabase(env).from('blog_posts').select('id,title,slug,excerpt,body,cover_url,cover_alt,published_at').eq('slug', slug).eq('published', true).maybeSingle(); if (error) throw new Error('Could not load article'); if (!data) return null; return blogSchema.parse(data); }
  catch { if (saved) return saved; throw new Error('We could not load this article. Please retry.'); }
}
export async function loadSlots(env: Env, serviceId: string, staffId: string | null, date: string) { return slotsSchema.parse(await rpc(env, 'get_available_slots', { p_service_id: serviceId, p_staff_id: staffId || null, p_date: date })); }
export async function loadCalendar(env: Env) {
  const supabase = getSupabase(env);
  const hours = await supabase.from('working_hours').select('weekday,is_closed');
  if (hours.error) throw new Error('Calendar unavailable. You can still check a date.');
  return { blocked: [] as string[], closed: workingHoursSchema.parse(hours.data).filter((row) => row.is_closed).map((row) => row.weekday) };
}
export class ApiError extends Error { constructor(public code: string, message: string) { super(message); this.name = 'ApiError'; } }
const envelope = <T extends z.ZodTypeAny>(schema: T) => z.discriminatedUnion('ok', [z.object({ ok: z.literal(true), data: schema }), z.object({ ok: z.literal(false), error: z.object({ code: z.string(), message: z.string().max(1000) }) })]);
export interface BookingInput { service_id: string; staff_id: string | null; start_at: string; name: string; phone: string; email: string; notes: string; website: string }
export async function createBooking(env: Env, input: BookingInput): Promise<BookingResult> {
  const response = await fetch(`${env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/create-booking-public`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: env.VITE_SUPABASE_ANON_KEY }, body: JSON.stringify({ ...input, phone: normalizePhone(input.phone) }), signal: AbortSignal.timeout(15000) });
  const json: unknown = await response.json();
  const result = envelope(bookingResultSchema).parse(json);
  if (!result.ok) throw new ApiError(result.error.code, result.error.message);
  return result.data;
}
export async function saveQuiz(env: Env, scores: { vata: number; pitta: number; kapha: number }, result: string) { return quizResultSchema.parse(await rpc(env, 'save_quiz_result', { p_vata: scores.vata, p_pitta: scores.pitta, p_kapha: scores.kapha, p_result: result })); }
export async function submitReview(env: Env, token: string, rating: number, comment: string) { return reviewResultSchema.parse(await rpc(env, 'submit_review', { p_token: token, p_rating: rating, p_comment: comment })); }
```

## `src/lib/booking.ts`

```typescript
import { z } from 'zod';
import { isIndianPhone } from './format';
export const bookingDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Please enter at least 2 characters.').max(80, 'Please use no more than 80 characters.'),
  phone: z.string().refine(isIndianPhone, 'Enter a valid Indian mobile number: 10 digits starting with 6–9.'),
  email: z.string().trim().max(254).refine((value) => !value || z.string().email().safeParse(value).success, 'Please enter a valid email address, or leave it blank.'),
  notes: z.string().trim().max(500, 'Please keep notes under 500 characters.'),
  website: z.string().max(200),
});
export type BookingDetails = z.infer<typeof bookingDetailsSchema>;
export const BOOKING_ERROR_COPY: Record<string, string> = {
  SLOT_TAKEN: 'That slot was just taken, please pick another.',
  RATE_LIMITED: 'You’ve made a few requests recently. Please wait a little before trying again.',
  CLOSED: 'The studio is closed at that time. Please choose another available slot.',
  PAST_TIME: 'That time is too soon to book. Please choose a slot at least two hours ahead.',
  INVALID_INPUT: 'Please check your details and selected ritual, then try again.',
  INTERNAL: 'We couldn’t confirm your booking just now. Please try again or contact the studio.',
};
```

## `src/lib/env.ts`

```typescript
import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().refine((value) => /^https?:\/\//.test(value), 'Use an HTTP(S) project URL.'),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, 'Add your public Supabase anon key.'),
  VITE_SITE_URL: z.string().url(),
}).superRefine((value, ctx) => {
  if (/secret|service_role/i.test(value.VITE_SUPABASE_ANON_KEY)) ctx.addIssue({ code: 'custom', path: ['VITE_SUPABASE_ANON_KEY'], message: 'Only a public anon key belongs in the browser.' });
  try { const payload: unknown = JSON.parse(atob(value.VITE_SUPABASE_ANON_KEY.split('.')[1] ?? ''));
    if (typeof payload === 'object' && payload !== null && 'role' in payload && payload.role !== 'anon') ctx.addIssue({ code: 'custom', path: ['VITE_SUPABASE_ANON_KEY'], message: 'The browser key must have the anon role.' });
  } catch { /* Opaque publishable keys are also supported. */ }
  if (import.meta.env.PROD && !value.VITE_SITE_URL.startsWith('https://')) ctx.addIssue({ code: 'custom', path: ['VITE_SITE_URL'], message: 'Production requires HTTPS.' });
});
export type Env = z.infer<typeof envSchema>;
export type EnvResult = { ok: true; value: Env } | { ok: false; issues: string[] };
export function validateEnv(input: Record<string, unknown>): EnvResult {
  const result = envSchema.safeParse(input);
  return result.success ? { ok: true, value: result.data } : { ok: false, issues: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
}
export const envResult = validateEnv({ VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY, VITE_SITE_URL: import.meta.env.VITE_SITE_URL });
```

## `src/lib/format.ts`

```typescript
export const MEDICAL_DISCLAIMER = 'Ayurvedic therapies support general wellness and do not replace medical treatment. Consult your doctor, especially if pregnant or under treatment.';
export const inr = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
export const timeIST = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value));
export const dateIST = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value.length === 10 ? `${value}T12:00:00+05:30` : value));
export function todayIST(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
export function addDays(date: string, days: number) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
export function normalizePhone(value: string) { return value.replace(/\s+/g, '').replace(/^(\+91|0091|0)/, ''); }
export const isIndianPhone = (value: string) => /^[6-9]\d{9}$/.test(normalizePhone(value));
export function phoneHref(value: string) { const digits = value.replace(/\D/g, ''); return digits.length >= 10 ? `tel:+${digits.length === 10 ? '91' : ''}${digits}` : null; }
export function whatsappHref(value: string) { const digits = value.replace(/\D/g, ''); return digits.length >= 10 ? `https://wa.me/${digits.length === 10 ? '91' : ''}${digits}` : null; }
export function safeExternalUrl(value: string | null | undefined) { if (!value) return null; try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; } }
export function sectionContent(body: string) { try { const parsed: unknown = JSON.parse(body); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>; } catch { /* Plain text is the normal database format. */ } return { text: body }; }
export function textFrom(value: unknown, fallback = '') { return typeof value === 'string' ? value : fallback; }
```

## `src/lib/foundation.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { scoreQuiz } from '../data/quiz';
import { applyTheme, THEME_PRESETS } from './theme';
import { fallbackSite, loadSite } from './api';
import { siteSchema, serviceSchema, slotsSchema } from './schemas';
import { validateEnv } from './env';
import { isIndianPhone, normalizePhone, todayIST } from './format';
import type { Dosha } from '../types';
import type { Env } from './env';
const env: Env = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-anon-key-for-unit-tests-only', VITE_SITE_URL: 'https://example.com' };
describe('quiz', () => {
  it.each([{ answers: ['vata','vata','vata','pitta','kapha'], result: 'vata' }, { answers: ['vata','vata','pitta','pitta','kapha'], result: 'vata-pitta' }, { answers: ['pitta','pitta','kapha','kapha','vata'], result: 'pitta-kapha' }, { answers: ['vata','pitta','vata','pitta','kapha'], result: 'vata-pitta' }])('scores $result', ({ answers, result }) => { const scored = scoreQuiz(answers as Dosha[]); expect(scored.result).toBe(result); expect(Object.values(scored.scores).reduce((a,b) => a+b,0)).toBe(5); });
  it('handles a three-way tie only with the required five answers', () => { expect(scoreQuiz(['vata','vata','pitta','pitta','kapha']).result).not.toBe('tridoshic'); expect(() => scoreQuiz(['vata'])).toThrow(); });
});
describe('validation', () => {
  it('accepts Indian phones and normalizes prefixes', () => { expect(isIndianPhone('+91 98765 43210')).toBe(true); expect(normalizePhone('09876543210')).toBe('9876543210'); for (const phone of ['1234567890','98765','+1 9876543210']) expect(isIndianPhone(phone)).toBe(false); });
  it('validates the complete fallback and rejects malformed API data', () => { expect(siteSchema.parse(fallbackSite).services).toHaveLength(12); expect(serviceSchema.safeParse({ ...fallbackSite.services[0], price: -1 }).success).toBe(false); expect(slotsSchema.safeParse([{ slot_start: 'bad' }]).success).toBe(false); });
  it('requires browser-safe env', () => { expect(validateEnv({}).ok).toBe(false); expect(validateEnv(env).ok).toBe(true); expect(validateEnv({ ...env, VITE_SUPABASE_ANON_KEY: 'service_role-secret-should-never-be-here' }).ok).toBe(false); });
  it('uses India business dates', () => { expect(todayIST(new Date('2026-11-01T20:00:00Z'))).toBe('2026-11-02'); });
});
describe('themes and fallback', () => {
  it('applies every preset and runtime overrides', () => { for (const preset of Object.keys(THEME_PRESETS) as (keyof typeof THEME_PRESETS)[]) { applyTheme(preset); expect(document.documentElement.dataset.theme).toBe(preset); } applyTheme('neem', { neem: '#123456' }); expect(document.documentElement.style.getPropertyValue('--neem')).toBe('#123456'); });
  it('shows saved content when network fails', async () => { viFetch(false); const result = await loadSite(env); expect(result.source).toBe('saved'); expect(result.site.services).toHaveLength(12); });
});
import { vi } from 'vitest';
function viFetch(ok: boolean) { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(ok ? [] : { message: 'offline' }), { status: ok ? 200 : 503 }))); }
```

## `src/lib/schemas.ts`

```typescript
import { z } from 'zod';

const text = z.string().max(20000);
const nullableText = text.nullable().default(null);
const uuid = z.string().uuid();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const sortOrder = z.number().int().default(0);
export const themePresetSchema = z.enum(['neem', 'saffron', 'rose_clay', 'midnight_herb', 'sandal']);
export const categorySchema = z.enum(['relax', 'detox', 'pain_relief', 'beauty', 'mind']);
export const sectionKeySchema = z.enum(['hero', 'about', 'quiz', 'services', 'team', 'packages', 'gallery', 'testimonials', 'blog', 'booking', 'faq', 'contact']);
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const colorsSchema = z.object({
  sandalwood: colorSchema.optional(), neem: colorSchema.optional(), turmeric: colorSchema.optional(),
  terracotta: colorSchema.optional(), ink: colorSchema.optional(),
}).catch({});
const hourSchema = z.object({ open: z.string().regex(/^\d{2}:\d{2}$/).optional(), close: z.string().regex(/^\d{2}:\d{2}$/).optional(), closed: z.boolean().optional() });
export const settingsSchema = z.object({
  business_name: z.string().min(1).max(200), tagline: text.default(''), logo_url: nullableText,
  phone: z.string().max(30).default(''), whatsapp: z.string().max(30).default(''),
  email: z.string().max(254).default(''), address: text.default(''), city: z.string().max(120).default(''),
  map_url: nullableText, timings: z.record(hourSchema).catch({}),
  theme_preset: themePresetSchema.catch('neem'), colors: colorsSchema,
  fonts: z.record(z.string()).catch({}),
  seo: z.object({ title: z.string().max(200).optional(), description: z.string().max(500).optional(), og_image: z.string().url().optional() }).catch({}),
  social: z.record(z.string()).catch({}),
  section_order: z.array(sectionKeySchema).catch(['hero', 'quiz', 'services', 'about', 'team', 'packages', 'gallery', 'testimonials', 'blog', 'booking', 'faq', 'contact']),
});
export const sectionSchema = z.object({
  key: sectionKeySchema, title: text.default(''), subtitle: text.default(''), body: text.default(''),
  image_url: nullableText, sort_order: sortOrder, visible: z.boolean().default(true),
});
export const serviceSchema = z.object({
  id: uuid, slug, name: z.string().min(1).max(200), category: categorySchema,
  short_desc: text.default(''), long_desc: text.default(''), benefits: z.array(z.string().max(500)).max(20).default([]),
  duration_min: z.number().int().positive().max(480), price: z.coerce.number().finite().nonnegative(),
  image_url: nullableText, image_alt: text.default(''), dosha_tags: z.array(z.enum(['vata', 'pitta', 'kapha'])).default([]), sort_order: sortOrder,
});
export const packageSchema = z.object({
  id: uuid, name: z.string().min(1).max(200), description: text.default(''), price: z.coerce.number().finite().nonnegative(),
  includes: z.array(z.string().max(500)).max(30).default([]), is_featured: z.boolean().default(false),
  image_url: nullableText, image_alt: text.default(''), sort_order: sortOrder,
});
export const staffGallerySchema = z.object({ id: uuid, image_url: text, caption: text.default(''), sort_order: sortOrder });
export const staffSchema = z.object({
  id: uuid, name: z.string().min(1).max(200), role: text.default(''), qualification: text.default(''),
  specialty: z.array(z.string().max(200)).max(20).default([]), bio: text.default(''), photo_url: nullableText,
  photo_alt: text.default(''), sort_order: sortOrder, service_ids: z.array(uuid).default([]), gallery: z.array(staffGallerySchema).max(30).default([]),
});
export const gallerySchema = z.object({ id: uuid, image_url: text, image_alt: text.default(''), caption: text.default(''), category: z.string().max(100).default('general'), sort_order: sortOrder });
export const testimonialSchema = z.object({ id: uuid, name: z.string().max(200), rating: z.number().int().min(1).max(5), text, photo_url: nullableText, sort_order: sortOrder });
export const faqSchema = z.object({ id: uuid, question: text, answer: text, sort_order: sortOrder });
export const blogSchema = z.object({
  id: uuid, title: z.string().max(300), slug, excerpt: text.default(''), body: text.default(''),
  cover_url: nullableText, cover_alt: text.default(''), published_at: z.string().datetime({ offset: true }).nullable().default(null),
});
export const siteSchema = z.object({
  published: z.boolean().default(true), settings: settingsSchema,
  sections: z.array(sectionSchema).max(12), services: z.array(serviceSchema).max(500),
  packages: z.array(packageSchema).max(100), staff: z.array(staffSchema).max(100),
  gallery: z.array(gallerySchema).max(200), testimonials: z.array(testimonialSchema).max(100),
  faqs: z.array(faqSchema).max(100), blog_posts: z.array(blogSchema).max(100),
});
export const slotSchema = z.object({ slot_start: z.string().datetime({ offset: true }), slot_end: z.string().datetime({ offset: true }), staff_id: uuid });
export const slotsSchema = z.array(slotSchema).max(3000);
export const bookingResultSchema = z.object({
  booking_id: uuid, start_at: z.string().datetime({ offset: true }), end_at: z.string().datetime({ offset: true }),
  service_name: z.string(), staff_name: z.string(), whatsapp_url: z.string().url().nullable(),
});
export const reviewInputSchema = z.object({ rating: z.number().int().min(1, 'Please choose a rating.').max(5), comment: z.string().trim().min(1, 'Please share a few words.').max(1000, 'Please keep your review under 1,000 characters.') });
export const quizResultSchema = z.object({ ok: z.boolean(), result_id: uuid.optional(), error_code: z.string().optional() });
export const reviewResultSchema = z.object({ ok: z.boolean(), review_id: uuid.optional(), error_code: z.string().optional() });
export const blockedDatesSchema = z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }));
export const workingHoursSchema = z.array(z.object({ weekday: z.number().int().min(0).max(6), is_closed: z.boolean() }));
```

## `src/lib/theme.ts`

```typescript
import { colorsSchema, themePresetSchema } from './schemas';
import type { Settings, ThemePreset } from '../types';

export const THEME_PRESETS: Record<ThemePreset, { name: string; description: string; sandal: string; neem: string; turmeric: string; terracotta: string; ink: string; paper: string; muted: string; line: string }> = {
  neem: { name: 'Neem garden', description: 'Forest green & warm sandalwood', sandal: '#F6EEDD', neem: '#2F4A3A', turmeric: '#D9A233', terracotta: '#B4572F', ink: '#1E1B16', paper: '#FCFAF5', muted: '#62675C', line: '#DCDDD0' },
  saffron: { name: 'Saffron morning', description: 'Golden light & soft ivory', sandal: '#F8EDD9', neem: '#694522', turmeric: '#D9A233', terracotta: '#A34827', ink: '#2B2118', paper: '#FFFBF3', muted: '#72614C', line: '#E7D8BE' },
  rose_clay: { name: 'Rose clay', description: 'Earthly rose & handmade paper', sandal: '#F4E7E1', neem: '#633F3B', turmeric: '#C9974B', terracotta: '#A54F43', ink: '#2D201E', paper: '#FCF7F4', muted: '#78615B', line: '#E4D2CA' },
  midnight_herb: { name: 'Midnight herb', description: 'Deep botanical green & gold', sandal: '#20382E', neem: '#E4EAD6', turmeric: '#E2B95E', terracotta: '#EAA17D', ink: '#F6EEDD', paper: '#192F27', muted: '#BCC9B8', line: '#40564A' },
  sandal: { name: 'Sandalwood quiet', description: 'Soft timber & olive leaves', sandal: '#EFE8D9', neem: '#505A38', turmeric: '#C6A052', terracotta: '#995738', ink: '#29291E', paper: '#F9F7F0', muted: '#666B56', line: '#DADCCB' },
};
export const THEME_KEY = 'veda-theme';
export function readSavedTheme(): ThemePreset | null {
  try { const value = localStorage.getItem(THEME_KEY); const result = themePresetSchema.safeParse(value); return result.success ? result.data : null; } catch { return null; }
}
export function saveTheme(theme: ThemePreset) { try { localStorage.setItem(THEME_KEY, theme); } catch { /* Private browsing: theme remains available for this visit. */ } }
function rgb(hex: string) { return `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`; }
export function applyTheme(preset: ThemePreset, overrides: Settings['colors'] = {}, root: HTMLElement = document.documentElement) {
  const base = THEME_PRESETS[preset];
  const colors = colorsSchema.parse(overrides);
  const values = { sandal: colors.sandalwood ?? base.sandal, neem: colors.neem ?? base.neem, turmeric: colors.turmeric ?? base.turmeric, terracotta: colors.terracotta ?? base.terracotta, ink: colors.ink ?? base.ink };
  for (const [key, value] of Object.entries(values)) { root.style.setProperty(`--${key}`, value); root.style.setProperty(`--${key}-rgb`, rgb(value)); }
  const custom = Object.keys(colors).length > 0;
  root.style.setProperty('--paper', custom ? values.sandal : base.paper);
  root.style.setProperty('--muted', custom ? values.ink : base.muted);
  root.style.setProperty('--line', custom ? values.neem + '30' : base.line);
  root.dataset.theme = preset;
  root.style.colorScheme = preset === 'midnight_herb' && !custom ? 'dark' : 'light';
}
```

## `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });
class TestIntersectionObserver implements IntersectionObserver { root = null; rootMargin = '0px'; thresholds = [0]; takeRecords() { return []; } observe(target: Element) { this.callback([{ target, isIntersecting: true, intersectionRatio: 1, boundingClientRect: target.getBoundingClientRect(), intersectionRect: target.getBoundingClientRect(), rootBounds: null, time: 0 }], this); } unobserve() {} disconnect() {} constructor(private callback: IntersectionObserverCallback) {} }
vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();
```

## `src/types/index.ts`

```typescript
import type { z } from 'zod';
import type { siteSchema, settingsSchema, serviceSchema, packageSchema, staffSchema, gallerySchema, testimonialSchema, faqSchema, blogSchema, sectionSchema, slotSchema, bookingResultSchema, themePresetSchema, categorySchema, sectionKeySchema } from '../lib/schemas';

export type Site = z.infer<typeof siteSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Package = z.infer<typeof packageSchema>;
export type Staff = z.infer<typeof staffSchema>;
export type GalleryImage = z.infer<typeof gallerySchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;
export type Faq = z.infer<typeof faqSchema>;
export type BlogPost = z.infer<typeof blogSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type Slot = z.infer<typeof slotSchema>;
export type BookingResult = z.infer<typeof bookingResultSchema>;
export type ThemePreset = z.infer<typeof themePresetSchema>;
export type Category = z.infer<typeof categorySchema>;
export type SectionKey = z.infer<typeof sectionKeySchema>;
export type Dosha = 'vata' | 'pitta' | 'kapha';
export type SiteSource = 'live' | 'saved';
export interface SiteState { site: Site; source: SiteSource }
export interface ImageSource { url: string | null; url_400?: string | null; url_800?: string | null; url_1600?: string | null }
```

## `src/App.tsx`

```tsx
import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SiteProvider } from './components/SiteContext';
import { Header, Footer, MobileBar, StatusBanners, CookieConsent } from './components/Chrome';
import { PageSkeleton } from './components/UI';
import { envResult } from './lib/env';
import { initializeAnalytics } from './lib/analytics';
import { SetupPage } from './pages/SetupPage';
import Home from './pages/Home';
const ServicePage = lazy(() => import('./pages/ServicePage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const PrivacyPage = lazy(() => import('./pages/StaticPages').then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/StaticPages').then((module) => ({ default: module.TermsPage })));
const AdminPage = lazy(() => import('./pages/StaticPages').then((module) => ({ default: module.AdminPage })));
const NotFound = lazy(() => import('./pages/NotFound'));
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
function NavigationEffects() {
  const { pathname, hash } = useLocation(); const first = useRef(true);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (hash) { let id = hash.slice(1); try { id = decodeURIComponent(id); } catch { /* Use the original hash. */ } const target = document.getElementById(id); target?.scrollIntoView({ behavior: 'instant', block: 'start' }); if (!first.current) { const heading = target?.querySelector<HTMLElement>('h1,h2'); heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true }); } }
      else { window.scrollTo({ top: 0, behavior: 'instant' }); if (!first.current) document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true }); }
      first.current = false;
    }, 100);
    return () => window.clearTimeout(timer);
  }, [pathname, hash]);
  return null;
}
function Website() {
  useEffect(() => initializeAnalytics(), []);
  return <SiteProvider><NavigationEffects /><a href="#main-content" className="skip-link">Skip to content</a><Header /><StatusBanners /><main id="main-content" tabIndex={-1}><Suspense fallback={<PageSkeleton />}><Routes><Route path="/" element={<Home />} /><Route path="/service/:slug" element={<ServicePage />} /><Route path="/blog/:slug" element={<BlogPage />} /><Route path="/review/:token" element={<ReviewPage />} /><Route path="/privacy" element={<PrivacyPage />} /><Route path="/terms" element={<TermsPage />} /><Route path="/admin/*" element={<AdminPage />} /><Route path="*" element={<NotFound />} /></Routes></Suspense></main><Footer /><MobileBar /><CookieConsent /></SiteProvider>;
}
export default function App() { return <ErrorBoundary><HelmetProvider><QueryClientProvider client={queryClient}>{envResult.ok ? <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Website /></BrowserRouter> : <SetupPage issues={envResult.issues} />}</QueryClientProvider></HelmetProvider></ErrorBoundary>; }
```

## `src/components/Artwork.tsx`

```tsx
import { useId } from 'react';

export function Lotus({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"><path d="M32 49C13 38 16 20 32 11c16 9 19 27 0 38Z" /><path d="M32 49C18 45 8 32 12 22c13 1 20 12 20 27Zm0 0c14-4 24-17 20-27-13 1-20 12-20 27Z" /><path d="M32 49C18 53 7 45 5 34c10-3 21 3 27 15Zm0 0c14 4 25-4 27-15-10-3-21 3-27 15ZM32 49V23M20 56h24" /></g></svg>;
}
export function Mandala({ className = '' }: { className?: string }) {
  const id = useId();
  return <svg className={`mandala ${className}`} viewBox="0 0 600 600" fill="none" aria-hidden="true"><defs><path id={id} d="M300 290C250 235 245 135 300 48c55 87 50 187 0 242Zm0-28c-28-48-25-105 0-151 25 46 28 103 0 151Z" /></defs><g stroke="currentColor" strokeWidth=".8">{Array.from({ length: 16 }, (_, i) => <use key={i} href={`#${id}`} transform={`rotate(${i * 22.5} 300 300)`} />)}<circle cx="300" cy="300" r="252" /><circle cx="300" cy="300" r="265" strokeDasharray="2 8" /><circle cx="300" cy="300" r="82" /><circle cx="300" cy="300" r="65" /></g></svg>;
}
export function LeafDivider({ className = '' }: { className?: string }) {
  return <div className={`leaf-divider ${className}`} aria-hidden="true"><span /><svg viewBox="0 0 80 34" fill="none"><path d="M5 27C24 29 43 18 70 7M25 25C13 11 22 5 34 20M40 20C34 5 45 2 49 15M51 15C54 2 66 1 65 10M28 24c12 12 20 5 18-5M46 18c12 10 20 3 18-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg><span /></div>;
}
```

## `src/components/Chrome.tsx`

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, SlidersHorizontal, Phone, MessageCircle, CalendarDays, Check, WifiOff, ArrowUpRight, Leaf, MapPin, Clock3 } from 'lucide-react';
import { Brand, ButtonLink, Picture } from './UI';
import { Dialog } from './Dialog';
import { LeafDivider, Lotus } from './Artwork';
import { useSite } from '../hooks/useSite';
import { applyTheme, readSavedTheme, saveTheme, THEME_PRESETS } from '../lib/theme';
import { phoneHref, whatsappHref, safeExternalUrl } from '../lib/format';
import type { ThemePreset } from '../types';

export function Header() {
  const { site } = useSite();
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const [theme, setTheme] = useState<ThemePreset>(readSavedTheme() ?? site.settings.theme_preset);
  const location = useLocation();
  const closeMenu = useCallback(() => setMenu(false), []);
  const closeSettings = useCallback(() => setSettings(false), []);
  useEffect(() => { setMenu(false); }, [location.pathname, location.hash]);
  const links = [{ label: 'Our rituals', to: '/#services' }, { label: 'Our philosophy', to: '/#about' }, { label: 'The journal', to: '/#blog' }, { label: 'Visit us', to: '/#contact' }];
  return <><header className="site-header"><div className="container-shell header-inner"><Brand name={site.settings.business_name} tagline={site.settings.tagline} logoUrl={site.settings.logo_url} /><nav className="desktop-nav" aria-label="Main navigation">{links.map((link) => <Link key={link.to} to={link.to}>{link.label}</Link>)}</nav><div className="header-actions"><button className="icon-btn settings-trigger" onClick={() => setSettings(true)} aria-label="Open appearance settings" title="Appearance settings"><SlidersHorizontal size={19} /></button><ButtonLink to="/#booking" className="header-book">Book a ritual</ButtonLink><button className="icon-btn mobile-menu-trigger" onClick={() => setMenu(true)} aria-label="Open navigation" aria-expanded={menu}><Menu size={24} /></button></div></div></header>
    <Dialog open={menu} onClose={closeMenu} title="Navigation" className="nav-dialog"><Brand name={site.settings.business_name} tagline={site.settings.tagline} logoUrl={site.settings.logo_url} /><button className="icon-btn absolute right-4 top-4" onClick={closeMenu} aria-label="Close navigation"><X /></button><nav aria-label="Mobile navigation">{links.map((link) => <Link key={link.to} to={link.to} onClick={closeMenu}>{link.label}<ArrowUpRight size={20} /></Link>)}<Link to="/#quiz" onClick={closeMenu}>Discover your dosha<ArrowUpRight size={20} /></Link></nav><ButtonLink to="/#booking">Book a ritual</ButtonLink><p className="font-hindi text-2xl mt-8 text-neem">जीवन में संतुलन</p></Dialog>
    <Dialog open={settings} onClose={closeSettings} title="Appearance settings"><p className="eyebrow">Make yourself at home</p><h2 className="text-4xl mt-3 mb-3">Your kind of calm.</h2><p className="text-muted text-sm mb-6">Choose a palette for your visit. Your preference stays on this device.</p><fieldset><legend className="sr-only">Theme preset</legend><div className="theme-options">{(Object.entries(THEME_PRESETS) as [ThemePreset, typeof THEME_PRESETS[ThemePreset]][]).map(([key, preset]) => <label key={key} className={`theme-option ${theme === key ? 'selected' : ''}`}><input type="radio" name="theme" value={key} checked={theme === key} onChange={() => { setTheme(key); applyTheme(key, key === site.settings.theme_preset ? site.settings.colors : {}); saveTheme(key); }} /><span className="theme-swatch" style={{ background: preset.sandal, color: preset.neem }}><Leaf size={20} /></span><span><strong>{preset.name}</strong><small>{preset.description}</small></span>{theme === key && <Check size={18} />}</label>)}</div></fieldset><button className="text-link mt-5" onClick={() => { setTheme(site.settings.theme_preset); applyTheme(site.settings.theme_preset, site.settings.colors); try { localStorage.removeItem('veda-theme'); } catch { /* Storage is optional. */ } }}>Use the studio’s theme</button></Dialog>
  </>;
}
export function Footer() {
  const { site } = useSite(); const s = site.settings;
  return <footer className="site-footer"><div className="container-shell"><div className="footer-top"><div><Brand light name={site.settings.business_name} tagline={site.settings.tagline} logoUrl={site.settings.logo_url} /><p className="footer-mantra">A quieter rhythm.<br /><em>A little closer to yourself.</em></p><span className="font-hindi text-xl opacity-70">आयुर्वेद · जीवन का संतुलन</span></div><div><h3>Explore</h3><Link to="/#services">Our rituals</Link><Link to="/#quiz">Discover your dosha</Link><Link to="/#team">Our Vaidyas</Link><Link to="/#blog">The wellness journal</Link></div><div><h3>Come, slow down</h3><p>{s.address || `${s.city || 'Our sanctuary'} · address coming soon`}</p><p>Mon–Sat · {s.timings.monday_saturday?.open ?? '10:00'}–{s.timings.monday_saturday?.close ?? '19:00'}<br />Sunday · a day of rest</p></div><div><h3>Your next moment of calm</h3><ButtonLink to="/#booking" variant="light">Book a ritual</ButtonLink><div className="social-links">{Object.entries(s.social).filter((entry): entry is [string, string] => typeof entry[1] === 'string').map(([name, url]) => safeExternalUrl(url) && <a key={name} href={safeExternalUrl(url)!} target="_blank" rel="noreferrer">{name}<ArrowUpRight size={14} /></a>)}</div></div></div><LeafDivider /><div className="footer-bottom"><p>© {new Date().getFullYear()} {s.business_name}. Thoughtfully, naturally.</p><div><NavLink to="/privacy">Privacy</NavLink><NavLink to="/terms">Terms</NavLink><span>Made with intention <Leaf size={13} /></span></div></div><p className="preview-note">Illustrative website preview. Photography, practitioner profiles and guest reflections are examples; verify business details before publishing.</p></div></footer>;
}
export function MobileBar() {
  const { site } = useSite(); const tel = phoneHref(site.settings.phone); const wa = whatsappHref(site.settings.whatsapp);
  return <nav className="mobile-bar" aria-label="Quick actions">{tel ? <a href={tel}><Phone size={19} />Call</a> : <Link to="/#contact"><Phone size={19} />Call us</Link>}{wa ? <a href={wa} target="_blank" rel="noreferrer"><MessageCircle size={19} />WhatsApp</a> : <Link to="/#contact"><MessageCircle size={19} />WhatsApp</Link>}<Link to="/#booking" className="mobile-book"><CalendarDays size={19} />Book now</Link></nav>;
}
export function StatusBanners() {
  const { source, refresh } = useSite(); const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => { const update = () => setOffline(!navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  return <>{offline && <div className="offline-banner" role="status"><WifiOff size={16} />You’re offline. Saved stories are here; live booking needs a connection.</div>}{source === 'saved' && import.meta.env.DEV && <div className="saved-banner" role="status">Showing saved preview content · live availability is unavailable <button onClick={refresh}>Retry connection</button></div>}</>;
}
export function CookieConsent() {
  const [visible, setVisible] = useState(() => { try { return !['accepted', 'declined'].includes(localStorage.getItem('veda-consent') ?? ''); } catch { return true; } });
  const choose = (choice: string) => { try { localStorage.setItem('veda-consent', choice); } catch { /* Do not block browsing. */ } window.dispatchEvent(new CustomEvent('veda:consent', { detail: choice })); setVisible(false); };
  if (!visible) return null;
  return <aside className="cookie-banner" aria-label="Cookie preferences"><Lotus className="w-10 h-10 shrink-0 text-neem" /><div><strong>A little privacy, by design.</strong><p>Essential storage keeps your preferences. Optional analytics stay off unless you agree. <Link to="/privacy">Our privacy promise</Link></p></div><div className="flex gap-2"><button className="btn btn-outline btn-small" onClick={() => choose('declined')}>Essential only</button><button className="btn btn-primary btn-small" onClick={() => choose('accepted')}>Allow analytics</button></div></aside>;
}
export function ContactDetails() {
  const { site } = useSite(); const s = site.settings;
  return <div className="contact-details"><div><MapPin /><span><strong>Find our sanctuary</strong><p>{s.address || 'Studio address coming soon'}</p></span></div><div><Clock3 /><span><strong>Time for yourself</strong><p>Monday–Saturday · {s.timings.monday_saturday?.open ?? '10:00'}–{s.timings.monday_saturday?.close ?? '19:00'}<br />Sunday · closed</p></span></div><div><Phone /><span><strong>Let’s talk</strong>{phoneHref(s.phone) ? <a href={phoneHref(s.phone)!}>{s.phone}</a> : <p>Phone details coming soon</p>}{s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}</span></div></div>;
}
export function ImageCollage({ src, alt }: { src: string | null; alt: string }) { return <div className="image-collage"><Picture src={src} alt={alt} className="arch-image collage-main" /><Picture src="/images/herbal-ritual-800.webp" alt="Herbal oil and fresh botanicals, illustrative photography" className="collage-small" /><div className="collage-seal"><Lotus /><span>ROOTED IN<br />NATURE</span></div></div>; }
```

## `src/components/Dialog.tsx`

```tsx
import { useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
export function Dialog({ open, onClose, title, children, className = '' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={ref} className={`dialog ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}><button className="icon-btn dialog-close" onClick={onClose} aria-label={`Close ${title}`}><X size={21} /></button>{children}</div></div>;
}
```

## `src/components/ErrorBoundary.tsx`

```tsx
import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* Do not log customer data or provider responses. */ }
  render() { if (this.state.failed) return <main className="container-shell narrow-page"><p className="eyebrow">A MOMENT TO RESET</p><h1>Let’s take<br />a fresh breath.</h1><p className="page-lead">Something interrupted this page. Your confirmed bookings are unaffected. Please reload to try again.</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Reload the page</button></main>; return this.props.children; }
}
```

## `src/components/Seo.tsx`

```tsx
import { Helmet } from 'react-helmet-async';
import { safeExternalUrl } from '../lib/format';
import { useSite } from '../hooks/useSite';
import type { Service } from '../types';

export function Seo({ title, description, path = '/', noindex = false, service, image }: { title?: string; description?: string | undefined; path?: string; noindex?: boolean; service?: Service; image?: string | null | undefined }) {
  const { site, env } = useSite();
  const name = site.settings.business_name;
  const pageTitle = title ? `${title} | ${name}` : site.settings.seo.title ?? name;
  const desc = description ?? site.settings.seo.description ?? site.settings.tagline;
  const origin = env.VITE_SITE_URL.replace(/\/$/, '');
  const canonical = origin + (path === '/' ? '/' : path.replace(/\/$/, ''));
  const imageUrl = image?.startsWith('/') ? new URL(image, origin).href : safeExternalUrl(image) ?? new URL('/images/sanctuary-1600.webp', origin).href;
  const localBusiness = { '@context': 'https://schema.org', '@type': 'HealthAndBeautyBusiness', name, description: desc, url: origin, image: imageUrl, address: { '@type': 'PostalAddress', streetAddress: site.settings.address, addressLocality: site.settings.city, addressCountry: 'IN' }, ...(site.settings.email ? { email: site.settings.email } : {}), ...(site.settings.phone ? { telephone: site.settings.phone } : {}) };
  const serviceLd = service ? { '@context': 'https://schema.org', '@type': 'Service', name: service.name, description: service.short_desc, serviceType: 'Ayurvedic wellness spa', provider: { '@type': 'HealthAndBeautyBusiness', name, url: origin }, areaServed: site.settings.city, url: canonical, offers: { '@type': 'Offer', price: service.price, priceCurrency: 'INR' } } : null;
  return <Helmet><html lang="en" /><title>{pageTitle}</title><meta name="description" content={desc} /><link rel="canonical" href={canonical} /><meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} /><meta property="og:type" content={service ? 'service' : 'website'} /><meta property="og:title" content={pageTitle} /><meta property="og:description" content={desc} /><meta property="og:url" content={canonical} /><meta property="og:image" content={imageUrl} /><meta property="og:site_name" content={name} /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content={pageTitle} /><meta name="twitter:description" content={desc} /><meta name="twitter:image" content={imageUrl} /><script type="application/ld+json">{JSON.stringify(serviceLd ?? localBusiness).replace(/</g, '\\u003c')}</script></Helmet>;
}
```

## `src/components/SiteContext.tsx`

```tsx
import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadSite } from '../lib/api';
import { envResult } from '../lib/env';
import { applyTheme, readSavedTheme } from '../lib/theme';
import { PageSkeleton } from './UI';
import { SiteContext } from '../hooks/siteContext';

export function SiteProvider({ children }: { children: ReactNode }) {
  if (!envResult.ok) throw new Error('SiteProvider requires validated environment.');
  const env = envResult.value;
  const query = useQuery({ queryKey: ['public-site'], queryFn: () => loadSite(env), staleTime: 60000, retry: false });
  useEffect(() => { if (query.data) { const theme = readSavedTheme() ?? query.data.site.settings.theme_preset; applyTheme(theme, theme === query.data.site.settings.theme_preset ? query.data.site.settings.colors : {}); } }, [query.data]);
  if (!query.data) return <PageSkeleton />;
  return <SiteContext.Provider value={{ ...query.data, env, refresh: () => { void query.refetch(); } }}>{children}</SiteContext.Provider>;
}
```

## `src/components/UI.tsx`

```tsx
import { useState, type ReactNode, type ImgHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, RefreshCw, Leaf, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '../hooks/useReducedMotionSafe';
import { Lotus } from './Artwork';
import type { Section } from '../types';

export function Brand({ light = false, name, tagline, logoUrl }: { light?: boolean; name: string; tagline: string; logoUrl: string | null }) {
  const [logoFailed, setLogoFailed] = useState(false);
  return <Link to="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label={`${name} home`}>{logoUrl && !logoFailed ? <img className="brand-mark" src={logoUrl} alt="" width={45} height={49} loading="lazy" decoding="async" onError={() => setLogoFailed(true)} /> : <Lotus className="brand-mark" />}<span><span className="brand-name">{name}</span><span className="brand-subtitle">{tagline}</span></span></Link>;
}
export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) { return <p className={`eyebrow ${light ? 'eyebrow-light' : ''}`}><span />{children}</p>; }
export function ButtonLink({ to, children, variant = 'primary', className = '', arrow = true }: { to: string; children: ReactNode; variant?: 'primary' | 'outline' | 'light'; className?: string; arrow?: boolean }) {
  return <Link to={to} className={`btn btn-${variant} ${className}`}>{children}{arrow && <ArrowUpRight size={17} aria-hidden="true" />}</Link>;
}
export function Picture({ src, alt, className = '', width = 800, height = 1000, eager = false, sizes = '(max-width: 767px) 92vw, 45vw', ...props }: { src: string | null; alt: string; width?: number; height?: number; eager?: boolean } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height'>) {
  const [failed, setFailed] = useState(false);
  const local = src?.match(/^\/images\/(.+)-(400|800|1600)\.webp$/);
  const srcSet = local ? [400, 800, 1600].map((size) => `/images/${local[1]}-${size}.webp ${size}w`).join(', ') : undefined;
  if (!src || failed) return <div className={`image-placeholder ${className}`} role="img" aria-label={alt}><Lotus /><span>{alt}</span></div>;
  return <img src={src} alt={alt} width={width} height={height} srcSet={srcSet} sizes={srcSet ? sizes : undefined} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} className={className} {...props} />;
}
export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotionSafe();
  return <motion.div className={className} initial={{ opacity: 0, y: reduced ? 0 : 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: reduced ? 0 : .65, delay: reduced ? 0 : delay }}>{children}</motion.div>;
}
export function SectionHeading({ section, children, align = 'left' }: { section: Section; children?: ReactNode; align?: 'left' | 'center' }) {
  return <div className={`section-heading ${align === 'center' ? 'text-center mx-auto' : ''}`}><Eyebrow>{section.subtitle}</Eyebrow><h2>{section.title}</h2>{children}</div>;
}
export function SectionIntro({ section }: { section: Section }) { const body = section.body.startsWith('{') ? '' : section.body; return body ? <p className="section-intro">{body}</p> : null; }
export function Skeleton({ className = '' }: { className?: string }) { return <div className={`skeleton ${className}`} aria-hidden="true" />; }
export function PageSkeleton() { return <div className="container-shell py-16" role="status" aria-label="Loading page"><span className="sr-only">Loading…</span><Skeleton className="h-5 w-32 mb-8" /><Skeleton className="h-20 w-3/4 mb-8" /><div className="grid md:grid-cols-2 gap-10"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>; }
export function AsyncState({ loading, error, empty, onRetry, children, label = 'content' }: { loading: boolean; error?: string | null; empty?: boolean; onRetry?: () => void; children: ReactNode; label?: string }) {
  if (loading) return <div role="status" aria-label={`Loading ${label}`}><Skeleton className="h-24 w-full" /><span className="sr-only">Loading {label}…</span></div>;
  if (error) return <div className="state-panel" role="alert"><AlertCircle aria-hidden="true" /><p>{error}</p>{onRetry && <button className="text-link" onClick={onRetry}><RefreshCw size={16} />Try again</button>}</div>;
  if (empty) return <div className="state-panel"><Leaf aria-hidden="true" /><p>No {label} available just yet. Please check back soon.</p></div>;
  return <>{children}</>;
}
export function TextArrow({ children }: { children: ReactNode }) { return <span className="inline-flex items-center gap-3">{children}<ArrowRight size={17} aria-hidden="true" /></span>; }
```

## `src/main.tsx`

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
```

## `src/pages/BlogPage.tsx`

```tsx
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { ArrowLeft } from 'lucide-react';
import { useSite } from '../hooks/useSite';
import { Seo } from '../components/Seo';
import { AsyncState, Eyebrow, Picture, Reveal } from '../components/UI';
import { loadBlog } from '../lib/api';
import { dateIST, MEDICAL_DISCLAIMER } from '../lib/format';
import NotFound from './NotFound';
export default function BlogPage() {
  const { slug = '' } = useParams(); const { env, source } = useSite();
  const query = useQuery({ queryKey: ['blog', slug, source], queryFn: () => loadBlog(env, slug, source), retry: false });
  if (query.data === null) return <NotFound />;
  const post = query.data;
  return <><Seo title={post?.title ?? 'The wellness journal'} description={post?.excerpt} path={`/blog/${slug}`} image={post?.cover_url} /><article className="container-shell article-page page-enter"><Link to="/#blog" className="text-link breadcrumb"><ArrowLeft size={16} />The wellness journal</Link><AsyncState loading={query.isPending} error={query.isError ? 'We couldn’t load this story. Please try again.' : null} onRetry={() => void query.refetch()} label="article">{post && <><header className="article-header"><Eyebrow>EVERYDAY AYURVEDA</Eyebrow><h1 tabIndex={-1}>{post.title}</h1><p>{post.excerpt}</p><span className="article-date">{post.published_at ? dateIST(post.published_at) : 'From the journal'} · A moment to read</span></header><Picture src={post.cover_url} alt={post.cover_alt || post.title} className="article-cover" width={1200} height={700} eager /><Reveal className="article-body"><div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.body, { ALLOWED_TAGS: ['p', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'a', 'br', 'hr', 'code'], ALLOWED_ATTR: ['href', 'title'], FORBID_ATTR: ['style'] }) }} /><aside className="article-note">{MEDICAL_DISCLAIMER} This article is educational, not personalised medical advice.</aside></Reveal></>}</AsyncState></article></>;
}
```

## `src/pages/Home.tsx`

```tsx
import type { ComponentType } from 'react';
import { Seo } from '../components/Seo';
import { useSite } from '../hooks/useSite';
import { LeafDivider } from '../components/Artwork';
import { Hero } from '../sections/Hero';
import { Services } from '../sections/Services';
import { Quiz } from '../sections/Quiz';
import { About, Team, Packages, Faq } from '../sections/Story';
import { Gallery } from '../sections/Gallery';
import { Testimonials } from '../sections/Testimonials';
import { Blog } from '../sections/Blog';
import { Booking } from '../sections/Booking';
import { Contact } from '../sections/Contact';
import type { Section, SectionKey } from '../types';
const components: Record<SectionKey, ComponentType<{ section: Section }>> = { hero: Hero, services: Services, quiz: Quiz, about: About, team: Team, packages: Packages, gallery: Gallery, testimonials: Testimonials, blog: Blog, booking: Booking, faq: Faq, contact: Contact };
export default function Home() {
  const { site } = useSite();
  const ordered = [...site.settings.section_order, ...site.sections.map((section) => section.key).filter((key) => !site.settings.section_order.includes(key))];
  return <><Seo path="/" /><div className="page-enter">{[...new Set(ordered)].map((key) => { const section = site.sections.find((item) => item.key === key); if (!section || section.visible === false) return null; const Component = components[key]; return <div key={key}><Component section={section} />{['about', 'packages', 'blog'].includes(key) && <LeafDivider />}</div>; })}{!site.sections.length && <div className="container-shell section-space"><h1>A quieter rhythm is on its way.</h1><p>Our rituals are being thoughtfully prepared. Please check back soon.</p></div>}</div></>;
}
```

## `src/pages/NotFound.tsx`

```tsx
import { Seo } from '../components/Seo';
import { ButtonLink, Eyebrow } from '../components/UI';
import { Mandala } from '../components/Artwork';
export default function NotFound() { return <><Seo title="A little off the path" description="This page could not be found. Return to Veda Sanjeevani." path="/404" noindex /><div className="container-shell narrow-page not-found page-enter"><Mandala className="not-found-mandala" /><Eyebrow>404 · A SMALL DETOUR</Eyebrow><h1 tabIndex={-1}>A little off<br />the beaten path.</h1><p className="page-lead">This page isn’t here, but a moment of calm still is.<br />Let’s find your way back.</p><ButtonLink to="/">Return to the sanctuary</ButtonLink></div></>; }
```

## `src/pages/ReviewPage.tsx`

```tsx
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Star, Check, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { useSite } from '../hooks/useSite';
import { Seo } from '../components/Seo';
import { ButtonLink, Eyebrow } from '../components/UI';
import { Lotus } from '../components/Artwork';
import { reviewInputSchema } from '../lib/schemas';
import { submitReview } from '../lib/api';
const schema = reviewInputSchema.extend({ website: z.string().max(200) });
type Input = z.infer<typeof schema>;
const errors: Record<string, string> = { INVALID_TOKEN: 'This review link isn’t valid. Please check the link in your invitation.', EXPIRED: 'This review link has expired. Please ask the studio for a new invitation.', ALREADY_USED: 'This invitation has already been used. Thank you for sharing your experience.', INVALID_INPUT: 'Please choose a rating and write a comment of 1–1,000 characters.' };
export default function ReviewPage() {
  const { token = '' } = useParams(); const { env, source } = useSite(); const [rating, setRating] = useState(0); const [done, setDone] = useState(false); const [message, setMessage] = useState(''); const lock = useRef(false); const [pending, setPending] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors: validation } } = useForm<Input>({ resolver: zodResolver(schema), defaultValues: { rating: 0, comment: '', website: '' } });
  const submit = handleSubmit(async (input) => { if (lock.current) return; if (input.website) { setMessage('Please leave the website field empty and try again.'); return; } if (source !== 'live') { setMessage('Review submission needs a live connection. Your review has not been sent.'); return; } lock.current = true; setPending(true); setMessage(''); try { const result = await submitReview(env, token, input.rating, input.comment); if (result.ok) setDone(true); else setMessage(errors[result.error_code ?? ''] ?? 'We couldn’t save your review. Please try again.'); } catch { setMessage('We couldn’t reach the review service. Your words are still here; please retry.'); } finally { lock.current = false; setPending(false); } });
  return <><Seo title="Share your experience" path={`/review/${token}`} noindex /><div className="container-shell narrow-page page-enter"><Lotus className="page-lotus" />{done ? <div className="review-thanks" role="status"><span className="success-icon"><Check size={30} /></span><Eyebrow>Thank you for your words</Eyebrow><h1 tabIndex={-1}>A little reflection.<br />A lot of meaning.</h1><p>Your review has been received and will appear after the studio approves it.</p><ButtonLink to="/">Back to the sanctuary</ButtonLink></div> : <><Eyebrow>We’d love to listen</Eyebrow><h1 tabIndex={-1}>How did your<br />ritual feel?</h1><p className="page-lead">Share a little about your visit. Your honest reflection helps us care thoughtfully.</p><form onSubmit={(event) => void submit(event)} className="review-form" noValidate>{source !== 'live' && <p className="field-help" role="status">Saved-preview mode: the review service is not connected. You can draft a reflection, but it will not be sent or stored.</p>}<fieldset><legend>Your experience <span aria-hidden="true">*</span></legend><div className="rating-stars">{[1,2,3,4,5].map((value) => <label key={value} className={rating >= value ? 'filled' : ''}><input type="radio" name="rating" value={value} checked={rating === value} onChange={() => { setRating(value); setValue('rating', value, { shouldValidate: true }); }} aria-label={`${value} star${value > 1 ? 's' : ''}`} /><Star size={34} fill={rating >= value ? 'currentColor' : 'none'} /></label>)}</div>{validation.rating && <p className="field-error">{validation.rating.message}</p>}</fieldset><div className="form-field"><label htmlFor="review-comment">Your words</label><textarea id="review-comment" rows={5} maxLength={1000} className="form-input" placeholder="What felt meaningful? What could we do better?" {...register('comment')} />{validation.comment && <p className="field-error">{validation.comment.message}</p>}</div><div className="honeypot" aria-hidden="true"><label htmlFor="review-website">Leave empty</label><input id="review-website" tabIndex={-1} autoComplete="off" {...register('website')} /></div>{message && <p className="booking-message" role="alert">{message}</p>}<button className="btn btn-primary w-full" disabled={pending || source !== 'live'} type="submit">{pending ? 'Sharing your reflection…' : 'Share my reflection'}<ArrowRight size={17} /></button><p className="field-help mt-4">Please don’t include private medical information. Reviews are moderated before publication.</p></form></>}</div></>;
}
```

## `src/pages/ServicePage.tsx`

```tsx
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, Clock3, ShieldCheck } from 'lucide-react';
import { useSite } from '../hooks/useSite';
import { Seo } from '../components/Seo';
import { ButtonLink, Eyebrow, Picture, Reveal } from '../components/UI';
import { LeafDivider, Lotus } from '../components/Artwork';
import { ServiceCard } from '../sections/Services';
import { inr, MEDICAL_DISCLAIMER } from '../lib/format';
import NotFound from './NotFound';
export default function ServicePage() {
  const { slug } = useParams(); const { site } = useSite(); const service = site.services.find((item) => item.slug === slug);
  if (!service) return <NotFound />;
  const related = site.services.filter((item) => item.category === service.category && item.id !== service.id).slice(0, 3);
  return <><Seo title={service.name} description={service.short_desc} path={`/service/${service.slug}`} service={service} image={service.image_url} /><div className="container-shell service-detail page-enter"><Link to="/#services" className="text-link breadcrumb"><ArrowLeft size={16} />All rituals</Link><div className="service-detail-grid"><Reveal><Picture src={service.image_url} alt={service.image_alt || service.name} className="arch-image detail-image" width={800} height={1000} eager /></Reveal><Reveal className="service-detail-copy" delay={.1}><Eyebrow>{service.category.replace('_', ' ')} · A RITUAL BY VEDA SANJEEVANI</Eyebrow><h1 tabIndex={-1}>{service.name}</h1><p className="detail-lead">{service.short_desc}</p><div className="detail-meta"><span><Clock3 size={18} />{service.duration_min} minutes</span><strong>{inr(service.price)}</strong></div><p>{service.long_desc}</p><h2 className="detail-subheading">A little of what it offers</h2><ul className="detail-benefits">{service.benefits.map((benefit) => <li key={benefit}><Check size={18} />{benefit}</li>)}</ul><ButtonLink to={`/?service=${service.slug}#booking`}>Make time for this ritual</ButtonLink><div className="dosha-tags"><span>Traditionally associated with</span>{service.dosha_tags.map((tag) => <span key={tag}>{tag}</span>)}</div></Reveal></div><aside className="medical-disclaimer"><ShieldCheck size={25} /><div><h2>Your wellbeing comes first.</h2><p>{MEDICAL_DISCLAIMER}</p></div></aside><LeafDivider />{related.length > 0 && <section className="section-space"><h2 className="text-5xl mb-8">Kindred rituals</h2><div className="services-grid">{related.map((item) => <ServiceCard key={item.id} service={item} />)}</div></section>}<div className="detail-end"><Lotus /><p>Every visit begins with listening.</p></div></div></>;
}
```

## `src/pages/SetupPage.tsx`

```tsx
import { Eyebrow } from '../components/UI';
import { Lotus } from '../components/Artwork';
export function SetupPage({ issues }: { issues: string[] }) { return <main className="container-shell narrow-page"><Lotus className="page-lotus" /><Eyebrow>One thoughtful step before we begin</Eyebrow><h1>Let’s connect<br />your sanctuary.</h1><p className="page-lead">Copy .env.frontend.example to .env.local and add your public Supabase project details. Never put a service-role key in a VITE_ variable.</p><ul className="setup-issues">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul><p className="text-muted text-sm">Restart the dev server or rebuild after changing environment variables. See README_FRONTEND.md for the full setup.</p><button className="btn btn-primary mt-6" onClick={() => window.location.reload()}>Check again</button></main>; }
```

## `src/pages/StaticPages.tsx`

```tsx
import { useLocation, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Seo } from '../components/Seo';
import { ButtonLink, Eyebrow } from '../components/UI';
import { Lotus } from '../components/Artwork';
import { useSite } from '../hooks/useSite';
import { MEDICAL_DISCLAIMER } from '../lib/format';
export function PrivacyPage() {
  const { site } = useSite();
  return <><Seo title="Privacy" description="How this website handles booking details, preferences and optional analytics." path="/privacy" /><article className="container-shell legal-page page-enter"><Eyebrow>Thoughtful care includes your data</Eyebrow><h1 tabIndex={-1}>Your privacy,<br />by design.</h1><p className="legal-meta">Website privacy notice · Preview policy, pending business approval</p><h2>The details you choose to share</h2><p>When you request a booking, your name, mobile number, optional email, selected ritual, appointment time and notes are sent to the studio’s Supabase booking service. The studio uses these details to arrange and manage your visit. Do not include medical records or sensitive health information in booking notes.</p><h2>Anonymous quiz results</h2><p>The dosha quiz stores only the three scores and result label when a live connection is available. It does not ask for your name or contact details. In saved-preview mode, results remain in memory on your device.</p><h2>Preferences on your device</h2><p>We use local storage for your theme and cookie choice. These preferences are not advertising identifiers. You can clear them in your browser settings. If storage is unavailable, browsing and booking still work.</p><h2>Optional analytics</h2><p>Analytics are off by default. This template includes a consent hook but loads no third-party analytics script. Any future analytics integration must respect your choice and be described in the studio’s final policy.</p><h2>Email, maps and WhatsApp</h2><p>Booking and review emails are handled by the studio’s configured email provider. The embedded map contacts its map provider when loaded. WhatsApp opens only when you choose its link, and WhatsApp’s own privacy terms then apply.</p><h2>Retention and your choices</h2><p>Booking records are retained as needed for studio operations and legal obligations. The final retention period must be confirmed by the business before launch. To request access, correction or deletion, contact the studio through its verified contact details. Some records may need to be retained by law.</p><h2>Questions or requests</h2><p>{site.settings.email ? <a href={`mailto:${site.settings.email}`}>{site.settings.email}</a> : 'Verified privacy contact details will be added by the studio before launch.'}</p><Link to="/" className="text-link mt-8"><ArrowLeft size={16} />Back to the sanctuary</Link></article></>;
}
export function TermsPage() {
  return <><Seo title="Terms" description="Website and wellness booking terms for Veda Sanjeevani." path="/terms" /><article className="container-shell legal-page page-enter"><Eyebrow>A little clarity, before your visit</Eyebrow><h1 tabIndex={-1}>Terms of<br />your visit.</h1><p className="legal-meta">Preview terms · Final studio policies must be approved before launch</p><h2>Wellness, not medical treatment</h2><p>{MEDICAL_DISCLAIMER} Descriptions of traditional practices are educational and do not promise medical outcomes.</p><h2>Booking requests</h2><p>Submitting the booking form creates a pending request, not a guaranteed appointment. The studio must confirm your visit. Prices are shown in Indian rupees; no online payment is collected by this website. Package links register interest only and do not create a combined package reservation.</p><h2>Availability and timing</h2><p>Availability is checked against the live calendar. A slot may be taken while you complete your details; we will ask you to choose another. Appointment times are displayed in Asia/Kolkata. Please arrive early and contact the studio promptly if your plans change.</p><h2>Cancellations and rescheduling</h2><p>The studio’s verified cancellation, refund and rescheduling policy will be supplied before launch. No cancellation fee is charged by this preview website.</p><h2>Your comfort and safety</h2><p>Tell the studio about relevant allergies, pregnancy, medications, sensitivities and accessibility needs before your session. Some rituals require clinical clearance. A practitioner may adapt or decline a ritual when it is not appropriate.</p><h2>Website content</h2><p>Illustrative photographs, fictional practitioner profiles and sample reflections are labelled as preview content. They must be replaced with verified, consented business content before publication. The dosha quiz is educational and is not a diagnostic tool.</p><h2>Responsible use</h2><p>Please provide accurate contact details, keep review links private and do not attempt to disrupt the booking service. Reviews are moderated and may be declined if they contain private information or abusive content.</p><Link to="/" className="text-link mt-8"><ArrowLeft size={16} />Back to the sanctuary</Link></article></>;
}
export function AdminPage() { return <><Seo title="Admin" path="/admin" noindex /><div className="container-shell narrow-page page-enter"><Lotus className="page-lotus" /><Eyebrow>A space for your studio</Eyebrow><h1 tabIndex={-1}>Admin panel<br />coming in Step 4.</h1><p className="page-lead">Content, bookings, practitioners and studio settings will find their home here.</p><ButtonLink to="/">Return to the website</ButtonLink></div></>; }
export function RouteFocus() { const { pathname } = useLocation(); return <span data-route={pathname} className="sr-only" aria-hidden="true" />; }
```

## `src/sections/Blog.tsx`

```tsx
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { AsyncState, Picture, Reveal, SectionHeading, SectionIntro } from '../components/UI';
import { useSite } from '../hooks/useSite';
import { dateIST } from '../lib/format';
import type { Section } from '../types';
export function Blog({ section }: { section: Section }) {
  const { site } = useSite(); const posts = [...site.blog_posts].sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '')).slice(0, 3);
  return <section id="blog" className="section-space"><div className="container-shell"><Reveal className="section-topline"><SectionHeading section={section} /><SectionIntro section={section} /></Reveal><AsyncState loading={false} empty={!posts.length} label="journal articles"><div className="blog-grid">{posts.map((post, index) => <Reveal key={post.id} delay={index * .08}><article className="blog-card"><Link to={`/blog/${post.slug}`} className="blog-image-link" tabIndex={-1} aria-hidden="true"><Picture src={post.cover_url} alt={post.cover_alt || post.title} width={800} height={580} sizes="(max-width: 767px) 90vw, 33vw" /></Link><div className="blog-meta"><span>EVERYDAY AYURVEDA</span><span>{post.published_at ? dateIST(post.published_at).split(',').slice(0, 2).join(',') : 'From the journal'}</span></div><h3><Link to={`/blog/${post.slug}`}>{post.title}</Link></h3><p>{post.excerpt}</p><Link to={`/blog/${post.slug}`} className="text-link">Read the story<ArrowUpRight size={17} /></Link></article></Reveal>)}</div></AsyncState></div></section>;
}
```

## `src/sections/Booking.tsx`

```tsx
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, Leaf, MessageCircle, ShieldCheck } from 'lucide-react';
import { Eyebrow, Picture, Reveal, Skeleton } from '../components/UI';
import { useSite } from '../hooks/useSite';
import { ApiError, createBooking, loadCalendar, loadSlots } from '../lib/api';
import { bookingDetailsSchema, BOOKING_ERROR_COPY, type BookingDetails } from '../lib/booking';
import { addDays, dateIST, inr, MEDICAL_DISCLAIMER, timeIST, todayIST } from '../lib/format';
import type { BookingResult, Section, Slot } from '../types';

export function Booking({ section }: { section: Section }) {
  const { site, env, source } = useSite(); const [params] = useSearchParams(); const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState(site.services.find((service) => service.slug === params.get('service'))?.id ?? site.services[0]?.id ?? '');
  const [staffId, setStaffId] = useState(''); const [date, setDate] = useState(todayIST()); const [week, setWeek] = useState(0);
  const [slot, setSlot] = useState<Slot | null>(null); const [step, setStep] = useState(1); const [message, setMessage] = useState(''); const [pending, setPending] = useState(false); const lock = useRef(false);
  const [result, setResult] = useState<BookingResult | null>(null); const [packageName, setPackageName] = useState(params.get('package') ?? '');
  const service = site.services.find((item) => item.id === serviceId); const today = todayIST();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, week * 7 + i)).filter((day) => day <= addDays(today, 60));
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<BookingDetails>({ resolver: zodResolver(bookingDetailsSchema), defaultValues: { name: '', phone: '', email: '', notes: packageName ? `I would like to enquire about the ${packageName} package.` : '', website: '' } });
  useEffect(() => {
    const requestedSlug = params.get('service');
    const requested = site.services.find((item) => item.slug === requestedSlug);
    if (requested && requested.id !== serviceId) chooseService(requested.id);
    const requestedPackage = params.get('package') ?? '';
    if (requestedPackage && requestedPackage !== packageName) setPackageName(requestedPackage);
    if (packageName) setValue('notes', `I would like to enquire about the ${packageName} package.`);
  }, [params, packageName, serviceId, setValue, site.services]);
  const calendar = useQuery({ queryKey: ['calendar', source], queryFn: () => loadCalendar(env), enabled: source === 'live', staleTime: 60000, retry: false });
  const dailySlots = useQueries({ queries: days.map((day) => ({ queryKey: ['slots', serviceId, staffId, day, source], queryFn: () => loadSlots(env, serviceId, staffId || null, day), enabled: source === 'live' && !!serviceId, staleTime: 15000, retry: false })) });
  const selectedIndex = days.indexOf(date); const slots = selectedIndex >= 0 ? dailySlots[selectedIndex] : undefined;
  const uniqueSlots = (slots?.data ?? []).filter((item, index, all) => all.findIndex((other) => other.slot_start === item.slot_start) === index);
  const refreshSlots = () => { void queryClient.invalidateQueries({ queryKey: ['slots'] }); void calendar.refetch(); };
  const chooseService = (id: string) => { setServiceId(id); setStaffId(''); setSlot(null); setMessage(''); setPackageName(''); };
  const submit = handleSubmit(async (details) => {
    if (lock.current || !slot || !service) return;
    if (source !== 'live') { setMessage('This is a saved-content preview. Live booking is unavailable until Supabase is connected. No booking has been made.'); return; }
    lock.current = true; setPending(true); setMessage('');
    try { const booking = await createBooking(env, { ...details, service_id: service.id, staff_id: slot.staff_id, start_at: slot.slot_start }); setResult(booking); setStep(4); }
    catch (error) { const code = error instanceof ApiError ? error.code : 'NETWORK'; setMessage(BOOKING_ERROR_COPY[code] ?? 'We couldn’t reach the booking service. Your details are still here; please check your connection and retry.'); if (['SLOT_TAKEN', 'CLOSED', 'PAST_TIME'].includes(code)) { setSlot(null); setStep(2); refreshSlots(); } }
    finally { lock.current = false; setPending(false); }
  });
  return <section id="booking" className="booking-section section-space"><div className="container-shell booking-layout"><Reveal className="booking-story"><Eyebrow light>{section.subtitle}</Eyebrow><h2>{section.title}</h2><p>{section.body}</p><div className="booking-image-wrap"><Picture src={section.image_url} alt="A relaxing Ayurvedic warm-oil ritual, illustrative photography" className="arch-image booking-image" width={600} height={700} /><div className="booking-image-note"><Leaf size={22} /><span>Your time.<br /><em>Your ritual.</em></span></div></div><div className="booking-promises"><span><ShieldCheck size={18} />Thoughtful, personal care</span><span><Clock3 size={18} />Time just for you</span></div></Reveal><Reveal className="booking-card glass-card" delay={.12}><div className="booking-card-top"><span className="eyebrow-small">A MOMENT OF YOUR OWN</span><LotusSmall /></div>{step < 4 && <><h3>Let’s make space for you.</h3><ol className="booking-steps" aria-label="Booking progress">{['Your ritual', 'Date & time', 'Your details'].map((label, index) => <li key={label} className={step >= index + 1 ? 'active' : ''} aria-current={step === index + 1 ? 'step' : undefined}><span>{step > index + 1 ? <Check size={13} /> : index + 1}</span>{label}</li>)}</ol></>}
    {message && <div className="booking-message" role="alert">{message}{source === 'saved' && <small>Connect the real Supabase project to check availability and reserve a visit.</small>}</div>}
    {step === 1 && <div className="booking-stage"><label className="field-label" htmlFor="booking-service">Choose your ritual</label><select id="booking-service" value={serviceId} onChange={(event) => chooseService(event.target.value)} className="form-input"><option value="" disabled>Select a ritual</option>{site.services.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.duration_min} min · {inr(item.price)}</option>)}</select>{service && <div className="selected-service"><Picture src={service.image_url} alt={service.image_alt || service.name} width={88} height={96} /><div><h4>{service.name}</h4><p>{service.short_desc}</p><span>{service.duration_min} minutes <span>·</span> <strong>{inr(service.price)}</strong></span></div></div>}<label className="field-label" htmlFor="booking-staff">Your practitioner</label><select id="booking-staff" className="form-input" value={staffId} onChange={(event) => { setStaffId(event.target.value); setSlot(null); }}><option value="">Any Vaidya · let us find your fit</option>{site.staff.filter((person) => person.service_ids.includes(serviceId)).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><div className="booking-summary-line"><span>One ritual. A little more you.</span><strong>{service ? inr(service.price) : '—'}</strong></div><button className="btn btn-primary w-full" disabled={!service} onClick={() => setStep(2)}>Find a time<ArrowRight size={17} /></button><p className="booking-fineprint"><ShieldCheck size={14} />No payment is taken online.</p></div>}
    {step === 2 && service && <div className="booking-stage"><div className="booking-stage-heading"><h4><CalendarDays size={18} />Choose a day</h4><span>All times IST</span></div><div className="date-navigation"><button className="icon-btn" disabled={week === 0} onClick={() => setWeek(week - 1)} aria-label="Previous week"><ArrowLeft size={17} /></button><span>{dateIST(days[0] ?? date)} – {dateIST(days.at(-1) ?? date)}</span><button className="icon-btn" disabled={week >= 8} onClick={() => setWeek(week + 1)} aria-label="Next week"><ArrowRight size={17} /></button></div><div className="date-grid">{days.map((day) => { const d = new Date(`${day}T12:00:00+05:30`); const weekday = new Date(`${day}T12:00:00Z`).getUTCDay(); const closed = calendar.data?.closed.includes(weekday) || calendar.data?.blocked.includes(day); const noAvailability = dailySlots[days.indexOf(day)]?.isSuccess && dailySlots[days.indexOf(day)]?.data?.length === 0; return <button key={day} className={date === day ? 'selected' : ''} disabled={Boolean(closed || noAvailability)} aria-label={`${dateIST(day)}${closed || noAvailability ? ', unavailable' : ''}`} aria-pressed={date === day} onClick={() => { setDate(day); setSlot(null); setMessage(''); }}><span>{new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }).format(d)}</span><strong>{Number(day.slice(-2))}</strong><small>{closed ? 'Closed' : noAvailability ? 'Full' : day === today ? 'Today' : ' '}</small></button>; })}</div><label className="sr-only" htmlFor="booking-date">Or choose a date within 60 days</label><input id="booking-date" type="date" className="form-input date-input" min={today} max={addDays(today, 60)} value={date} onChange={(event) => { if (event.target.value >= today && event.target.value <= addDays(today, 60)) { setDate(event.target.value); setSlot(null); setWeek(Math.floor((new Date(event.target.value).getTime() - new Date(today).getTime()) / 604800000)); } }} />{calendar.isError && <p className="field-help">Closing dates couldn’t be loaded. Select a day to check live slots. <button className="text-link" onClick={() => void calendar.refetch()}>Retry</button></p>}<h4 className="slot-heading"><Clock3 size={17} />Available times</h4>{source === 'saved' ? <div className="state-panel"><p>Live times need a connected booking service. This preview never invents availability.</p><button className="text-link" onClick={() => window.location.reload()}>Retry connection</button></div> : !slots || slots.isPending ? <div className="slot-grid" role="status" aria-label="Loading available times">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-11" />)}<span className="sr-only">Checking available times…</span></div> : slots?.isError ? <div className="state-panel" role="alert"><p>We couldn’t load availability for this day.</p><button className="text-link" onClick={() => void slots?.refetch()}>Check again</button></div> : uniqueSlots.length ? <div className="slot-grid">{uniqueSlots.map((item) => <button key={item.slot_start} className={slot?.slot_start === item.slot_start ? 'selected' : ''} aria-pressed={slot?.slot_start === item.slot_start} onClick={() => { setSlot(item); setMessage(''); }}>{timeIST(item.slot_start)}</button>)}</div> : <div className="state-panel"><Leaf size={22} /><p>No available times on this day. A little room on another day, perhaps?</p><button className="text-link" onClick={() => void slots?.refetch()}>Refresh times</button></div>}<div className="stage-buttons"><button className="text-link" onClick={() => setStep(1)}><ArrowLeft size={16} />Your ritual</button><button className="btn btn-primary" disabled={!slot || source !== 'live'} onClick={() => setStep(3)}>Add your details<ArrowRight size={16} /></button></div></div>}
    {step === 3 && service && slot && <form className="booking-stage" onSubmit={(event) => void submit(event)} noValidate><div className="booking-recap"><CheckCircle2 size={19} /><div><strong>{service.name}</strong><p>{dateIST(slot.slot_start)} · {timeIST(slot.slot_start)} IST</p></div><button type="button" className="text-link" onClick={() => setStep(2)}>Edit</button></div>{packageName && <p className="field-help">Package enquiry only. The price shown is for the selected individual ritual; the studio will confirm package arrangements.</p>}<div className="form-field"><label htmlFor="booking-name">Your name <span>*</span></label><input id="booking-name" autoComplete="name" className="form-input" placeholder="How should we address you?" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} {...register('name')} />{errors.name && <p id="name-error" className="field-error">{errors.name.message}</p>}</div><div className="form-two"><div className="form-field"><label htmlFor="booking-phone">Mobile number <span>*</span></label><input id="booking-phone" type="tel" autoComplete="tel-national" className="form-input" placeholder="10-digit Indian mobile" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'phone-error' : undefined} {...register('phone')} />{errors.phone && <p id="phone-error" className="field-error">{errors.phone.message}</p>}</div><div className="form-field"><label htmlFor="booking-email">Email <small>(optional)</small></label><input id="booking-email" type="email" autoComplete="email" className="form-input" placeholder="you@example.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />{errors.email && <p id="email-error" className="field-error">{errors.email.message}</p>}</div></div><div className="form-field"><label htmlFor="booking-notes">Anything we should know? <small>(optional)</small></label><textarea id="booking-notes" className="form-input" rows={3} maxLength={500} placeholder="Preferences, sensitivities or accessibility needs…" {...register('notes')} />{errors.notes && <p className="field-error">{errors.notes.message}</p>}</div><div className="honeypot" aria-hidden="true"><label htmlFor="website">Leave this field empty</label><input id="website" tabIndex={-1} autoComplete="off" {...register('website')} /></div><p className="booking-privacy">Your details are used to arrange your visit. See our <a href="/privacy">privacy policy</a>. Please don’t include medical records.</p><div className="booking-summary-line"><span>Your ritual</span><strong>{inr(service.price)}</strong></div><button type="submit" className="btn btn-primary w-full" disabled={pending || source !== 'live'}>{pending ? 'Reserving your moment…' : 'Request booking'}{!pending && <ArrowRight size={17} />}</button><button type="button" className="text-link mx-auto mt-3" disabled={pending} onClick={() => setStep(2)}><ArrowLeft size={15} />Back to times</button><p className="booking-fineprint">Your booking is pending until the studio confirms it.</p></form>}
    {step === 4 && result && <div className="booking-success" role="status"><span className="success-icon"><Check size={30} /></span><Eyebrow>A little calm is on the calendar</Eyebrow><h3>We’ve received<br />your request.</h3><p>Thank you for making a little space for yourself. Your visit is pending studio confirmation.</p><dl><div><dt>Ritual</dt><dd>{result.service_name}</dd></div><div><dt>Date</dt><dd>{dateIST(result.start_at)}</dd></div><div><dt>Time</dt><dd>{timeIST(result.start_at)}–{timeIST(result.end_at)} IST</dd></div><div><dt>Practitioner</dt><dd>{result.staff_name}</dd></div></dl>{result.whatsapp_url ? <a className="btn btn-primary w-full" href={result.whatsapp_url} target="_blank" rel="noreferrer"><MessageCircle size={19} />Confirm on WhatsApp</a> : <p className="field-help">The studio will confirm your request. WhatsApp is not configured.</p>}<button className="text-link mt-5 mx-auto" onClick={() => { setResult(null); setSlot(null); setStep(1); setMessage(''); }}>Explore another ritual<ArrowRight size={16} /></button></div>}
  </Reveal></div><div className="container-shell"><p className="booking-disclaimer">{MEDICAL_DISCLAIMER}</p></div></section>;
}
function LotusSmall() { return <Leaf size={22} className="text-neem" aria-hidden="true" />; }
```

## `src/sections/Contact.tsx`

```tsx
import { ArrowUpRight, MapPin } from 'lucide-react';
import { Reveal, SectionHeading, SectionIntro } from '../components/UI';
import { ContactDetails } from '../components/Chrome';
import { useSite } from '../hooks/useSite';
import { safeExternalUrl } from '../lib/format';
import type { Section } from '../types';
export function Contact({ section }: { section: Section }) {
  const { site, source } = useSite(); const map = safeExternalUrl(site.settings.map_url);
  return <section id="contact" className="section-space bg-sandal/45"><div className="container-shell contact-grid"><Reveal><SectionHeading section={section} /><SectionIntro section={section} /><ContactDetails />{safeExternalUrl(site.settings.whatsapp ? `https://wa.me/${site.settings.whatsapp.replace(/\D/g, '')}` : null) && <a className="text-link mt-6" href={`https://wa.me/${site.settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">A conversation on WhatsApp<ArrowUpRight size={17} /></a>}</Reveal><Reveal className="map-card" delay={.1}>{map ? <iframe title={`Illustrative map of ${site.settings.city || 'the studio area'}`} src={map} loading="lazy" referrerPolicy="no-referrer" width={600} height={460} allowFullScreen /> : <div className="map-placeholder"><MapPin size={42} /><p>Our location will appear here once confirmed.</p></div>}<div className="map-caption"><MapPin size={17} /><span>{site.settings.city || 'Your sanctuary'} · {source === 'saved' ? 'Illustrative area map, not a verified studio location' : 'Find your way to a slower rhythm'}</span></div></Reveal></div></section>;
}
```

## `src/sections/Gallery.tsx`

```tsx
import { useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight, Expand } from 'lucide-react';
import { AsyncState, Picture, Reveal, SectionHeading } from '../components/UI';
import { Dialog } from '../components/Dialog';
import { useSite } from '../hooks/useSite';
import type { Section } from '../types';
export function Gallery({ section }: { section: Section }) {
  const { site } = useSite(); const [selected, setSelected] = useState<number | null>(null); const images = site.gallery;
  const close = useCallback(() => setSelected(null), []);
  const move = useCallback((direction: number) => setSelected((current) => current === null ? null : (current + direction + images.length) % images.length), [images.length]);
  const image = selected === null ? null : images[selected];
  return <section id="gallery" className="section-space bg-sandal/45"><div className="container-shell"><Reveal className="text-center"><SectionHeading section={section} align="center" /></Reveal><AsyncState loading={false} empty={!images.length} label="gallery images"><div className="masonry-gallery">{images.map((item, index) => <Reveal key={item.id} delay={(index % 3) * .05}><button className={`gallery-tile gallery-tile-${index}`} onClick={() => setSelected(index)} aria-label={`Open image ${index + 1}: ${item.image_alt || item.caption}`}><Picture src={item.image_url} alt={item.image_alt || item.caption} width={800} height={index % 3 === 0 ? 1000 : 650} sizes="(max-width: 640px) 90vw, 33vw" /><span className="gallery-caption"><span>{item.caption}</span><Expand size={18} /></span></button></Reveal>)}</div></AsyncState></div><Dialog open={!!image} onClose={close} title="Gallery image" className="lightbox"><div onKeyDown={(event) => { if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } }}>{image && <><Picture src={image.image_url} alt={image.image_alt || image.caption} className="lightbox-image" width={1200} height={900} eager /><div className="lightbox-caption"><p>{image.caption}</p><span>{(selected ?? 0) + 1} / {images.length}</span></div><div className="lightbox-controls"><button className="icon-btn" onClick={() => move(-1)} aria-label="Previous image"><ArrowLeft /></button><span>Use arrow keys to explore · Esc to close</span><button className="icon-btn" onClick={() => move(1)} aria-label="Next image"><ArrowRight /></button></div></>}</div></Dialog></section>;
}
```

## `src/sections/Hero.tsx`

```tsx
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, Leaf, Sparkles, Star } from 'lucide-react';
import { ButtonLink, Eyebrow, Picture } from '../components/UI';
import { Mandala } from '../components/Artwork';
import { useReducedMotionSafe } from '../hooks/useReducedMotionSafe';
import { sectionContent, textFrom } from '../lib/format';
import type { Section } from '../types';

export function Hero({ section }: { section: Section }) {
  const ref = useRef<HTMLElement>(null); const reduced = useReducedMotionSafe();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const content = sectionContent(section.body);
  const chips = Array.isArray(content.chips) ? content.chips.filter((item): item is string => typeof item === 'string').slice(0, 3) : [];
  return <section ref={ref} className="hero" id="hero" aria-labelledby="hero-heading"><div className="container-shell hero-grid"><div className="hero-copy"><motion.div initial={{ opacity: 0, y: reduced ? 0 : 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .8 }}><Eyebrow>{section.subtitle}</Eyebrow><h1 id="hero-heading" tabIndex={-1}>{section.title}</h1><p className="hero-description">{textFrom(content.text, section.body)}</p><div className="hero-buttons"><ButtonLink to="/#booking">Book your ritual</ButtonLink><ButtonLink to="/#services" variant="outline" arrow={false}>Explore therapies <ArrowDown size={16} /></ButtonLink></div><div className="hero-footnote"><span className="hero-small-leaves"><Leaf size={18} /></span><span>Ancient wisdom. A personal touch.<br /><strong>Care that feels like coming home.</strong></span></div></motion.div></div><div className="hero-visual"><motion.div className="hero-image-wrap" style={{ y: reduced ? 0 : y }}><motion.div initial={{ opacity: 0, scale: reduced ? 1 : .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduced ? 0 : 1.1 }}><Picture src={section.image_url} alt="A practitioner gently pouring warm herbal oil during an illustrative Ayurvedic ritual" className="arch-image hero-image" eager width={800} height={1000} /></motion.div></motion.div><div className="hero-outline-arch" /><Mandala className="hero-mandala" /><div className="hero-chip hero-chip-top"><Sparkles size={19} /><span>{chips[0] ?? 'Thoughtful care'}</span></div><div className="hero-chip hero-chip-bottom"><Leaf size={21} /><span>{chips[1] ?? 'Rooted in nature'}</span></div><span className="hero-vertical">SLOW DOWN. BREATHE DEEP. COME BACK TO YOU.</span></div></div><div className="hero-bottom container-shell"><span><span className="status-dot" /> A sanctuary for the senses</span><span className="hero-bottom-center">{chips[2] ?? 'Kerala-inspired care'}</span><span className="flex items-center gap-2"><Star size={13} /> Wellness, the way nature intended</span></div></section>;
}
```

## `src/sections/Quiz.tsx`

```tsx
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Eyebrow, Picture, Reveal } from '../components/UI';
import { LeafDivider, Lotus } from '../components/Artwork';
import { useSite } from '../hooks/useSite';
import { QUIZ_QUESTIONS, scoreQuiz } from '../data/quiz';
import { saveQuiz } from '../lib/api';
import type { Dosha, Section } from '../types';

export function Quiz({ section }: { section: Section }) {
  const { site, env, source } = useSite(); const [answers, setAnswers] = useState<Dosha[]>([]); const [step, setStep] = useState(0); const [done, setDone] = useState(false); const [saveStatus, setSaveStatus] = useState('');
  const question = QUIZ_QUESTIONS[step]!; const result = done ? scoreQuiz(answers) : null;
  const recommended = result ? site.services.filter((service) => service.dosha_tags.some((tag) => result.doshas.includes(tag))).slice(0, 3) : [];
  const choose = (dosha: Dosha) => { const next = [...answers]; next[step] = dosha; setAnswers(next); };
  const advance = async () => { if (!answers[step]) return; if (step < 4) { setStep(step + 1); return; } const scored = scoreQuiz(answers); setDone(true); if (source === 'live') { setSaveStatus('Saving your anonymous result…'); try { const saved = await saveQuiz(env, scored.scores, scored.result); setSaveStatus(saved.ok ? 'Your anonymous result has been saved.' : 'Your result is ready; saving was unavailable.'); } catch { setSaveStatus('Your result is ready; saving was unavailable.'); } } else setSaveStatus('Preview mode: your result stays on this device.'); };
  return <section id="quiz" className="quiz-section section-space"><div className="container-shell"><Reveal className="quiz-panel"><div className="quiz-art"><Picture src={section.image_url} alt="Natural herbal ingredients for a thoughtful Ayurvedic ritual" className="quiz-image" width={600} height={800} /><div className="quiz-art-caption"><Lotus /><span className="font-hindi">प्रकृति को जानें</span><p>Know your nature.<br />Find your balance.</p></div></div><div className="quiz-content"><Eyebrow>{section.subtitle}</Eyebrow><h2>{section.title}</h2>{!done ? <><p className="quiz-intro">{section.body}</p><div className="quiz-progress" aria-label={`Question ${step + 1} of 5`}>{QUIZ_QUESTIONS.map((_, index) => <span key={index} className={index <= step ? 'complete' : ''} />)}</div><fieldset><legend><span className="question-number">0{step + 1} / 05</span>{question.question}</legend><p className="question-hint">{question.hint}</p><div className="quiz-options">{question.options.map((option, index) => <label key={option.dosha} className={`quiz-option ${answers[step] === option.dosha ? 'selected' : ''}`}><input type="radio" name={`question-${step}`} value={option.dosha} checked={answers[step] === option.dosha} onChange={() => choose(option.dosha)} /><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option.label}</span>{answers[step] === option.dosha && <Check size={17} />}</label>)}</div></fieldset><div className="quiz-controls">{step > 0 ? <button className="text-link" onClick={() => setStep(step - 1)}><ArrowLeft size={16} />Back</button> : <span className="text-xs text-muted">About 2 minutes · just for you</span>}<button className="btn btn-primary" disabled={!answers[step]} onClick={() => void advance()}>{step === 4 ? 'Discover my dosha' : 'Next question'}<ArrowRight size={17} /></button></div></> : result && <div className="quiz-result" aria-live="polite"><span className="result-kicker"><Sparkles size={16} />Your dosha pattern</span><h3>{result.copy.name}</h3><p className="result-element">{result.copy.element}</p><p>{result.copy.description}</p><div className="score-row">{Object.entries(result.scores).map(([name, score]) => <div key={name}><span>{name}</span><div className="score-track"><span style={{ width: `${score * 20}%` }} /></div><strong>{score}/5</strong></div>)}</div><h4>Rituals to explore</h4><div className="recommended-rituals">{recommended.length ? recommended.map((service) => <Link key={service.id} to={`/service/${service.slug}`}>{service.name}<ArrowRight size={15} /></Link>) : <p>Explore our catalogue with your practitioner.</p>}</div><p className="quiz-save-status" role="status">{saveStatus}</p><button className="text-link" onClick={() => { setDone(false); setAnswers([]); setStep(0); setSaveStatus(''); }}><RotateCcw size={15} />Take the quiz again</button></div>}<p className="quiz-disclaimer">A traditional lens, not a diagnosis. This quiz does not assess medical suitability.</p></div></Reveal><LeafDivider /></div></section>;
}
```

## `src/sections/Services.tsx`

```tsx
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock3, Check } from 'lucide-react';
import { AsyncState, Picture, Reveal, SectionHeading, SectionIntro } from '../components/UI';
import { useSite } from '../hooks/useSite';
import { inr } from '../lib/format';
import { CATEGORIES } from '../data/categories';
import type { Category, Section, Service } from '../types';
export function ServiceCard({ service, index = 0 }: { service: Service; index?: number }) {
  return <Reveal delay={(index % 3) * .07}><article className="service-card"><Link to={`/service/${service.slug}`} className="service-image-link" tabIndex={-1} aria-hidden="true"><Picture src={service.image_url} alt={service.image_alt || service.name} width={800} height={600} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" /><span className="service-category">{service.category.replace('_', ' ')}</span></Link><div className="service-card-body"><div className="service-meta"><span><Clock3 size={13} />{service.duration_min} min</span><strong>{inr(service.price)}</strong></div><h3><Link to={`/service/${service.slug}`}>{service.name}</Link></h3><p>{service.short_desc}</p><ul>{service.benefits.slice(0, 2).map((benefit) => <li key={benefit}><Check size={13} />{benefit}</li>)}</ul><div className="service-card-actions"><Link to={`/?service=${service.slug}#booking`} className="text-link">Book this ritual <ArrowUpRight size={17} /></Link><Link to={`/service/${service.slug}`} className="service-details-link" aria-label={`Explore ${service.name}`}>Explore <ArrowUpRight size={15} /></Link></div></div></article></Reveal>;
}
export function Services({ section }: { section: Section }) {
  const { site, source, refresh } = useSite(); const [category, setCategory] = useState<Category | 'all'>('all'); const tabs = useRef<HTMLDivElement>(null);
  const services = site.services.filter((service) => category === 'all' || service.category === category);
  return <section id="services" className="section-space bg-sandal/45"><div className="container-shell"><Reveal className="section-topline"><SectionHeading section={section} /><div className="section-aside"><SectionIntro section={section} /><Picture src={section.image_url} alt="A quiet, sunlit Ayurvedic treatment room" className="section-mini-image" width={160} height={110} /></div></Reveal><div ref={tabs} className="filter-tabs" role="tablist" aria-label="Filter rituals by category">{CATEGORIES.map((item, index) => <button key={item.key} id={`tab-${item.key}`} role="tab" aria-selected={category === item.key} aria-controls="service-results" tabIndex={category === item.key ? 0 : -1} className={category === item.key ? 'active' : ''} onClick={() => setCategory(item.key)} onKeyDown={(event) => { let next = index; if (event.key === 'ArrowRight') next = (index + 1) % CATEGORIES.length; else if (event.key === 'ArrowLeft') next = (index - 1 + CATEGORIES.length) % CATEGORIES.length; else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = CATEGORIES.length - 1; else return; event.preventDefault(); const key = CATEGORIES[next]!.key; setCategory(key); tabs.current?.querySelector<HTMLButtonElement>(`#tab-${key}`)?.focus(); }}>{item.label}</button>)}</div><div id="service-results" role="tabpanel" aria-labelledby={`tab-${category}`}><AsyncState loading={false} empty={!services.length} onRetry={refresh} label="rituals" error={source === 'saved' && !site.services.length ? 'The saved catalogue is unavailable.' : null}><div className="services-grid">{services.map((service, index) => <ServiceCard key={service.id} service={service} index={index} />)}</div></AsyncState></div><p className="catalogue-note">{site.services.length} thoughtfully curated rituals · Prices in INR · Your comfort, always first</p></div></section>;
}
```

## `src/sections/Story.tsx`

```tsx
import { ArrowUpRight, Check, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonLink, Eyebrow, Picture, Reveal, SectionHeading, SectionIntro, AsyncState } from '../components/UI';
import { ImageCollage } from '../components/Chrome';
import { useSite } from '../hooks/useSite';
import { inr, sectionContent, textFrom } from '../lib/format';
import type { Section } from '../types';

export function About({ section }: { section: Section }) {
  const content = sectionContent(section.body);
  const stats = Array.isArray(content.stats) ? content.stats.filter((item): item is { value: string; label: string } => typeof item === 'object' && item !== null && 'value' in item && 'label' in item && typeof item.value === 'string' && typeof item.label === 'string').slice(0, 3) : [];
  return <section id="about" className="section-space"><div className="container-shell about-grid"><Reveal><ImageCollage src={section.image_url} alt="Warm sandstone, carved arches and natural light in an illustrative sanctuary" /></Reveal><Reveal className="about-copy" delay={.1}><SectionHeading section={section} /><p>{textFrom(content.text, section.body)}</p><blockquote>{textFrom(content.philosophy)}</blockquote><div className="about-stats">{stats.map((stat) => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div><ButtonLink to="/#team" variant="outline">Meet the people behind the care</ButtonLink></Reveal></div></section>;
}
export function Team({ section }: { section: Section }) {
  const { site } = useSite();
  return <section id="team" className="section-space bg-sandal/45"><div className="container-shell"><Reveal className="section-topline"><SectionHeading section={section} /><SectionIntro section={section} /></Reveal><AsyncState loading={false} empty={!site.staff.length} label="practitioner profiles"><div className="team-grid">{site.staff.map((person, index) => <Reveal key={person.id} delay={index * .06}><article className="team-card"><div className="team-photo"><Picture src={person.photo_url} alt={person.photo_alt || `Illustrative portrait of ${person.name}`} width={600} height={750} sizes="(max-width: 640px) 90vw, 25vw" /><span className="team-index">0{index + 1}</span></div><h3>{person.name}</h3><p className="team-role">{person.role}</p><p className="team-qualification">{person.qualification}</p><div className="specialty-tags">{person.specialty.slice(0, 2).map((item) => <span key={item}>{item}</span>)}</div>{person.gallery.length > 0 && <div className="staff-mini-gallery">{person.gallery.slice(0, 2).map((image) => <Link key={image.id} to="/#gallery" aria-label={image.caption || 'Explore our gallery'}><Picture src={image.image_url} alt={image.caption || 'The tools of a thoughtful ritual'} width={100} height={80} /><span>{image.caption}</span><ArrowUpRight size={14} /></Link>)}</div>}</article></Reveal>)}</div></AsyncState></div></section>;
}
export function Packages({ section }: { section: Section }) {
  const { site } = useSite();
  return <section id="packages" className="section-space packages-section"><div className="container-shell"><Reveal className="section-topline"><SectionHeading section={section} /><Picture src={section.image_url} alt="Brass, botanicals and linen for a paired wellness experience" className="section-mini-image" width={180} height={130} /></Reveal><AsyncState loading={false} empty={!site.packages.length} label="packages"><div className="packages-grid">{site.packages.map((item, index) => <Reveal key={item.id} delay={index * .08}><article className={`package-card ${item.is_featured ? 'featured' : ''}`}>{item.is_featured && <span className="featured-label"><Leaf size={13} />Most loved</span>}<Picture src={item.image_url} alt={item.image_alt || item.name} width={600} height={360} className="package-image" /><div className="package-body"><span className="eyebrow-small">A LITTLE MORE UNHURRIED</span><h3>{item.name}</h3><p>{item.description}</p><ul>{item.includes.map((include) => <li key={include}><Check size={15} />{include}</li>)}</ul><div className="package-bottom"><strong>{inr(item.price)}</strong><Link to={`/?package=${encodeURIComponent(item.name)}#booking`} className="text-link">Choose this experience<ArrowUpRight size={17} /></Link></div><p className="package-note">Package interest is an enquiry, not a combined booking. The studio will confirm arrangement and pricing.</p></div></article></Reveal>)}</div></AsyncState></div></section>;
}
export function Faq({ section }: { section: Section }) {
  const { site } = useSite();
  return <section id="faq" className="section-space"><div className="container-shell faq-grid"><Reveal><SectionHeading section={section} /><SectionIntro section={section} /><Picture src={section.image_url} alt="A peaceful corner of an illustrative Ayurvedic sanctuary" className="faq-image arch-image" width={400} height={400} /></Reveal><Reveal delay={.1}><AsyncState loading={false} empty={!site.faqs.length} label="questions"><div className="faq-list">{site.faqs.map((faq, index) => <details key={faq.id} className="faq-item" open={index === 0 ? true : undefined}><summary><span>{faq.question}</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></AsyncState><div className="faq-help"><Eyebrow>Still wondering?</Eyebrow><Link to="/#contact" className="text-link">We’re happy to help <ArrowUpRight size={17} /></Link></div></Reveal></div></section>;
}
```

## `src/sections/Testimonials.tsx`

```tsx
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play, Star, Quote } from 'lucide-react';
import { AsyncState, Picture, Reveal, SectionHeading } from '../components/UI';
import { Mandala } from '../components/Artwork';
import { useSite } from '../hooks/useSite';
import { useReducedMotionSafe } from '../hooks/useReducedMotionSafe';
import type { Section } from '../types';
export function Testimonials({ section }: { section: Section }) {
  const { site } = useSite(); const reviews = site.testimonials; const [index, setIndex] = useState(0); const [paused, setPaused] = useState(false); const [hovered, setHovered] = useState(false); const reduced = useReducedMotionSafe();
  useEffect(() => { if (reduced || paused || hovered || reviews.length < 2) return; const timer = window.setInterval(() => setIndex((value) => (value + 1) % reviews.length), 7000); return () => window.clearInterval(timer); }, [reduced, paused, hovered, reviews.length]);
  const review = reviews[index % Math.max(1, reviews.length)];
  return <section id="testimonials" className="section-space testimonial-section"><div className="container-shell"><Reveal><SectionHeading section={section} align="center" /></Reveal><Picture src={section.image_url} alt="Illustrative botanical oils and leaves prepared for a wellness ritual" className="testimonial-scene" width={240} height={320} sizes="(max-width: 767px) 18vw, 140px" /><AsyncState loading={false} empty={!review} label="guest reflections"><div className="testimonial-carousel" role="region" aria-roledescription="carousel" aria-label="Guest reflections" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setHovered(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}><Mandala className="testimonial-mandala" /><Quote className="quote-mark" size={42} aria-hidden="true" /><div className="testimonial-slide" aria-live={paused || hovered || reduced ? 'polite' : 'off'} aria-atomic="true"><div className="stars" aria-label={`${review!.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={17} fill={i < review!.rating ? 'currentColor' : 'none'} aria-hidden="true" />)}</div><blockquote>“{review!.text}”</blockquote><div className="review-author"><Picture src={review!.photo_url} alt={review!.name} width={48} height={48} className="review-avatar" /><span>{review!.name}</span></div></div><div className="carousel-controls"><button className="icon-btn" aria-label="Previous reflection" onClick={() => setIndex((index - 1 + reviews.length) % reviews.length)}><ArrowLeft size={19} /></button><div className="carousel-dots">{reviews.map((item, i) => <button key={item.id} className={i === index ? 'active' : ''} aria-label={`Show reflection ${i + 1}`} aria-current={i === index ? 'true' : undefined} onClick={() => setIndex(i)}><span /></button>)}</div><button className="icon-btn" aria-label="Next reflection" onClick={() => setIndex((index + 1) % reviews.length)}><ArrowRight size={19} /></button>{!reduced && <button className="icon-btn" aria-label={paused ? 'Play reflections' : 'Pause reflections'} onClick={() => setPaused(!paused)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>}</div><p className="sample-note">Illustrative reflections · not verified guest reviews</p></div></AsyncState></div></section>;
}
```

## `src/test/Booking.test.tsx`

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Booking } from '../sections/Booking';
import { SiteContext } from '../hooks/siteContext';
import { fallbackSite } from '../lib/api';
import { ApiError } from '../lib/api';
import { loadSlots, loadCalendar, createBooking } from '../lib/api';
import type { Env } from '../lib/env';
import type { SiteState } from '../types';
vi.mock('../lib/api', async (importOriginal) => { const actual = await importOriginal<typeof import('../lib/api')>(); return { ...actual, loadSlots: vi.fn(), loadCalendar: vi.fn(), createBooking: vi.fn() }; });
const env: Env = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-anon-key-for-unit-tests-only', VITE_SITE_URL: 'https://example.com' };
const section = fallbackSite.sections.find((item) => item.key === 'booking')!;
const start = '2026-11-03T10:00:00+05:30';
const slot = { slot_start: start, slot_end: '2026-11-03T11:00:00+05:30', staff_id: fallbackSite.staff[0]!.id };
function setup(source: SiteState['source'] = 'live') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/']}><SiteContext.Provider value={{ site: fallbackSite, source, env, refresh: vi.fn() }}><Booking section={section} /></SiteContext.Provider></MemoryRouter></QueryClientProvider>);
}
async function toDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Find a time' }));
  await user.clear(screen.getByLabelText('Or choose a date within 60 days'));
  await user.type(screen.getByLabelText('Or choose a date within 60 days'), '2026-11-03');
  await user.click(await screen.findByRole('button', { name: /10:00/ }));
  await user.click(screen.getByRole('button', { name: 'Add your details' }));
  await user.type(screen.getByLabelText('Your name', { exact: false }), 'Asha Sharma');
  await user.type(screen.getByLabelText('Mobile number', { exact: false }), '9876543210');
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-01T06:00:00Z'));
  vi.mocked(loadCalendar).mockResolvedValue({ blocked: [], closed: [0] });
  vi.mocked(loadSlots).mockResolvedValue([slot]);
});
afterEach(() => vi.useRealTimers());
describe('booking flow', () => {
  it('shows a slot skeleton before live availability resolves', async () => {
    const resolvers: ((value: typeof slot[]) => void)[] = [];
    vi.mocked(loadSlots).mockImplementation(() => new Promise((done) => { resolvers.push(done); }));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime }); setup();
    await user.click(screen.getByRole('button', { name: 'Find a time' }));
    await user.clear(screen.getByLabelText('Or choose a date within 60 days'));
    await user.type(screen.getByLabelText('Or choose a date within 60 days'), '2026-11-03');
    expect(await screen.findByRole('status', { name: 'Loading available times' })).toBeInTheDocument();
    for (const resolve of resolvers) resolve([slot]);
    expect(await screen.findByRole('button', { name: /10:00/ })).toBeInTheDocument();
  });
  it('refreshes slots and preserves entered details on SLOT_TAKEN', async () => {
    vi.mocked(createBooking).mockRejectedValueOnce(new ApiError('SLOT_TAKEN', 'Taken'));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime }); setup(); await toDetails(user);
    await user.click(screen.getByRole('button', { name: 'Request booking' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That slot was just taken, please pick another.');
    await waitFor(() => expect(vi.mocked(loadSlots).mock.calls.filter((call) => call[3] === '2026-11-03').length).toBeGreaterThanOrEqual(2));
    await user.click(await screen.findByRole('button', { name: /10:00/ }));
    await user.click(screen.getByRole('button', { name: 'Add your details' }));
    expect(screen.getByLabelText('Your name', { exact: false })).toHaveValue('Asha Sharma');
  });
  it('shows confirmation and the returned WhatsApp URL', async () => {
    vi.mocked(createBooking).mockResolvedValue({ booking_id: 'a8000000-0000-4000-8000-000000000001', start_at: start, end_at: slot.slot_end, service_name: 'Abhyanga', staff_name: 'Dr. Ananya Sharma', whatsapp_url: 'https://wa.me/919999999999?text=Booking' });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime }); setup(); await toDetails(user);
    await user.click(screen.getByRole('button', { name: 'Request booking' }));
    expect(await screen.findByText(/We’ve received/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Confirm on WhatsApp' })).toHaveAttribute('href', 'https://wa.me/919999999999?text=Booking');
    expect(createBooking).toHaveBeenCalledOnce();
  });
  it('never fabricates a booking in saved-preview mode', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime }); setup('saved');
    await user.click(screen.getByRole('button', { name: 'Find a time' }));
    expect(screen.getByText(/This preview never invents availability/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your details' })).toBeDisabled(); expect(createBooking).not.toHaveBeenCalled();
  });
});
```

## `src/styles/fonts.css`

```css
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:500;font-display:swap;src:url('/fonts/cormorant-garamond-latin-500-normal.woff2') format('woff2');size-adjust:100%}
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:600;font-display:swap;src:url('/fonts/cormorant-garamond-latin-600-normal.woff2') format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:500;font-display:swap;src:url('/fonts/cormorant-garamond-latin-500-italic.woff2') format('woff2')}
@font-face{font-family:'Manrope';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/manrope-latin-400-normal.woff2') format('woff2')}
@font-face{font-family:'Manrope';font-style:normal;font-weight:500;font-display:swap;src:url('/fonts/manrope-latin-500-normal.woff2') format('woff2')}
@font-face{font-family:'Manrope';font-style:normal;font-weight:600;font-display:swap;src:url('/fonts/manrope-latin-600-normal.woff2') format('woff2')}
@font-face{font-family:'Tiro Devanagari Hindi';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/tiro-devanagari-hindi-devanagari-400-normal.woff2') format('woff2');unicode-range:U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20B9,U+25CC,U+A830-A839,U+A8E0-A8FF}
```

## `src/styles/index.css`

```css
@import './fonts.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

:root{--sandal:#F6EEDD;--neem:#2F4A3A;--turmeric:#D9A233;--terracotta:#B4572F;--ink:#1E1B16;--paper:#FCFAF5;--muted:#62675C;--line:#DCDDD0;--sandal-rgb:246 238 221;--neem-rgb:47 74 58;--turmeric-rgb:217 162 51;--terracotta-rgb:180 87 47;--ink-rgb:30 27 22}
@layer base{
  *{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:104px}body{margin:0;background:var(--paper);color:var(--ink);font-family:Manrope,sans-serif;font-size:14px;line-height:1.7;-webkit-font-smoothing:antialiased}body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:80;opacity:.026;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath fill='%23000' filter='url(%23n)' opacity='.6' d='M0 0h160v160H0z'/%3E%3C/svg%3E")}
  h1,h2,h3,h4,p{margin:0}h1,h2,h3{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;line-height:1.04;letter-spacing:-.035em}h1{font-size:clamp(56px,6.2vw,90px)}h2{font-size:clamp(42px,4.4vw,64px)}h3{font-size:30px}h4{font-weight:600}em{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500}a{color:inherit;text-decoration:none}button,input,select,textarea{font:inherit}button,a,input,select,textarea{-webkit-tap-highlight-color:transparent}button{cursor:pointer}button:disabled{cursor:not-allowed;opacity:.45}button{color:inherit}img{display:block;max-width:100%;object-fit:cover}svg{flex-shrink:0}::selection{background:var(--turmeric);color:#1E1B16}:focus-visible{outline:3px solid var(--terracotta);outline-offset:5px;border-radius:3px}main:focus,h1:focus,h2:focus{outline:none}input,textarea,select{min-width:0}textarea{resize:vertical}fieldset{border:0;padding:0;margin:0;min-width:0}summary{cursor:pointer}a,button{touch-action:manipulation}
}
@layer components{
 .container-shell{@apply mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-14;} .section-space{@apply py-20 md:py-24 lg:py-28;} .section-heading h2{white-space:pre-line}.section-heading{max-width:650px}.section-topline{@apply flex flex-col md:flex-row md:items-end md:justify-between gap-7 mb-10;}.section-intro{max-width:380px;color:var(--muted);font-size:14px;line-height:1.9}.section-aside{@apply flex items-center gap-6;}.section-mini-image{width:145px;height:108px;border-radius:70px 70px 6px 6px;flex-shrink:0}.eyebrow{display:flex;align-items:center;gap:10px;font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--neem);margin-bottom:20px;line-height:1.7}.eyebrow>span{height:1px;width:26px;background:var(--turmeric)}.eyebrow-light{color:var(--sandal)}.eyebrow-small{font-size:9px;letter-spacing:.16em;font-weight:600;color:var(--neem)}
 .btn{display:inline-flex;align-items:center;justify-content:center;gap:20px;min-height:50px;padding:13px 24px;font-size:12px;font-weight:600;border:1px solid transparent;border-radius:5px;transition:background .2s,transform .25s,box-shadow .25s;line-height:1.5}.btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 22px -10px rgb(30 27 22 / 35%)}.btn-primary{background:var(--neem);color:var(--paper)}.btn-primary:hover:not(:disabled){background:var(--ink);color:var(--paper)}.btn-outline{border-color:rgb(var(--neem-rgb)/.3);color:var(--neem);background:transparent}.btn-outline:hover{background:rgb(var(--neem-rgb)/.06)}.btn-light{background:var(--sandal);color:#2F4A3A}.btn-small{min-height:44px;padding:10px 16px;font-size:11px;gap:8px}.text-link{display:inline-flex;align-items:center;gap:10px;min-height:44px;font-size:12px;font-weight:600;color:var(--neem);background:none;border:0;padding:0}.text-link:hover{color:var(--terracotta)}.text-link svg{transition:transform .2s}.text-link:hover svg{transform:translate(2px,-1px)}.icon-btn{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;flex-shrink:0;border:1px solid transparent;border-radius:50%;background:transparent;transition:background .2s}.icon-btn:hover{background:rgb(var(--neem-rgb)/.08)}
 .site-header{position:sticky;top:0;z-index:40;background:var(--paper);border-bottom:1px solid rgb(var(--neem-rgb)/.09)}.header-inner{height:90px;display:flex;align-items:center;justify-content:space-between;gap:28px}.brand{display:inline-flex;align-items:center;gap:11px;color:var(--neem);transition:transform .3s,filter .3s;transform-origin:left center;min-height:48px}.brand:hover{transform:scale(1.05);filter:drop-shadow(0 6px 9px rgb(47 74 58 / 14%))}.brand-mark{width:45px;height:49px}.brand-name{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:27px;letter-spacing:-.04em;line-height:1.1}.brand-subtitle{display:block;font-size:7px;letter-spacing:.19em;font-weight:600;margin-top:5px}.desktop-nav{display:flex;align-items:center;gap:29px}.desktop-nav a{font-size:11px;font-weight:500;position:relative;display:flex;align-items:center;min-height:44px}.desktop-nav a::after{content:'';position:absolute;bottom:6px;left:0;right:100%;height:1px;background:var(--terracotta);transition:right .2s}.desktop-nav a:hover::after{right:0}.header-actions{display:flex;align-items:center;gap:13px}.header-book{min-height:44px;padding:11px 20px;font-size:11px;gap:17px}.settings-trigger{color:var(--neem)}.mobile-menu-trigger{display:none}.brand-light{color:var(--sandal)}
 .hero{position:relative;background:linear-gradient(110deg,var(--paper) 45%,rgb(var(--sandal-rgb)/.7));overflow:hidden}.hero-grid{display:grid;grid-template-columns:1.06fr 1fr;gap:48px;align-items:center;padding-top:57px;padding-bottom:55px;min-height:664px}.hero-copy{position:relative;z-index:2;padding-bottom:12px}.hero-copy .eyebrow{font-size:9px;letter-spacing:.17em;margin-bottom:25px}.hero h1{white-space:pre-line;font-size:clamp(64px,6.6vw,94px);line-height:.99;color:var(--neem);letter-spacing:-.045em;max-width:610px}.hero-description{font-size:14px;line-height:1.95;color:var(--muted);max-width:365px;margin-top:26px}.hero-buttons{display:flex;gap:13px;margin-top:30px;flex-wrap:wrap}.hero-buttons .btn{font-size:11px;padding:14px 21px;gap:17px}.hero-footnote{display:flex;align-items:center;gap:12px;margin-top:39px;font-size:10px;color:var(--muted);line-height:1.8}.hero-footnote strong{font-weight:500;color:var(--neem)}.hero-small-leaves{display:grid;place-items:center;width:37px;height:37px;border:1px solid var(--line);border-radius:50%;color:var(--neem)}.hero-visual{position:relative;height:540px;max-width:490px;width:100%;justify-self:end;margin-right:20px}.hero-image-wrap{position:absolute;inset:0 12px 0 0;z-index:2}.hero-image-wrap>div{height:100%}.arch-image{border-radius:240px 240px 10px 10px}.hero-image{width:100%;height:540px;object-position:center 43%;border:7px solid var(--paper)}.hero-outline-arch{position:absolute;inset:-15px -3px 17px 17px;border:1px solid rgb(var(--neem-rgb)/.35);border-radius:250px 250px 10px 10px;z-index:1}.mandala{color:var(--neem);animation:mandala-turn 160s linear infinite;pointer-events:none}.hero-mandala{position:absolute;width:390px;height:390px;right:-145px;top:-87px;opacity:.18;z-index:0}.hero-chip{position:absolute;z-index:3;background:rgb(255 255 255 / 86%);border:1px solid rgb(255 255 255 / 75%);box-shadow:0 9px 35px rgb(30 27 22 / 9%);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-radius:6px;display:flex;align-items:center;gap:10px;padding:13px 17px;font-size:10px;font-weight:600;color:#2F4A3A;animation:chip-float 7s ease-in-out infinite}.hero-chip svg{color:#7B783E}.hero-chip-top{top:86px;left:-45px}.hero-chip-bottom{bottom:66px;right:-30px;animation-delay:-3s}.hero-vertical{position:absolute;right:-45px;top:175px;writing-mode:vertical-rl;font-size:7px;letter-spacing:.22em;color:var(--muted)}.hero-bottom{display:flex;justify-content:space-between;align-items:center;gap:20px;border-top:1px solid rgb(var(--neem-rgb)/.12);padding-top:18px;padding-bottom:18px;color:var(--muted);font-size:9px;letter-spacing:.025em}.hero-bottom>span:first-child{display:flex;align-items:center;gap:8px}.status-dot{width:5px;height:5px;background:var(--neem);border-radius:50%}.hero-bottom-center{text-transform:uppercase;letter-spacing:.15em;font-size:8px}.hero-bottom svg{color:var(--terracotta)}
 .leaf-divider{display:flex;align-items:center;justify-content:center;gap:18px;color:var(--neem);opacity:.55;padding:4px 24px}.leaf-divider span{height:1px;width:72px;background:var(--line)}.leaf-divider svg{width:65px;height:30px}.image-placeholder{background:linear-gradient(145deg,var(--sandal),rgb(var(--neem-rgb)/.15));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;color:var(--neem);min-height:100px;overflow:hidden}.image-placeholder svg{width:64px;height:64px;opacity:.65}.image-placeholder>span{font-family:'Cormorant Garamond',serif;font-size:22px;max-width:80%;text-align:center}.filter-tabs{display:flex;gap:8px;margin:35px 0 30px;flex-wrap:wrap}.filter-tabs button{min-height:44px;padding:10px 24px;border-radius:30px;border:1px solid rgb(var(--neem-rgb)/.17);font-size:11px;transition:all .2s;background:transparent}.filter-tabs button.active{background:var(--neem);color:var(--paper);border-color:var(--neem)}.filter-tabs button:hover:not(.active){background:rgb(var(--neem-rgb)/.06)}.services-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}.service-card{background:var(--paper);border:1px solid rgb(var(--neem-rgb)/.1);border-radius:8px;overflow:hidden;height:100%;transition:box-shadow .3s,transform .3s}.service-card:hover{box-shadow:0 18px 40px -24px rgb(30 27 22 / 30%);transform:translateY(-4px)}.service-image-link{display:block;position:relative;overflow:hidden}.service-image-link img,.service-image-link .image-placeholder{width:100%;height:224px;transition:transform .7s}.service-card:hover .service-image-link img{transform:scale(1.045)}.service-category{position:absolute;top:15px;left:15px;background:var(--paper);color:var(--neem);border-radius:3px;padding:5px 10px;font-size:8px;text-transform:uppercase;letter-spacing:.12em}.service-card-body{padding:21px 23px 12px}.service-meta{display:flex;align-items:center;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:12px}.service-meta>span{display:flex;align-items:center;gap:5px}.service-meta strong{font-size:15px;color:var(--neem);font-weight:600}.service-card h3{font-size:29px;margin-bottom:10px}.service-card h3 a:hover{color:var(--terracotta)}.service-card-body>p{font-size:11px;color:var(--muted);line-height:1.8;min-height:40px}.service-card ul{list-style:none;padding:0;margin:15px 0 12px;display:grid;gap:5px}.service-card li{display:flex;gap:7px;align-items:center;font-size:10px;color:var(--neem)}.service-card li svg{color:var(--terracotta)}.service-card-actions{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:4px}.service-details-link{display:flex;align-items:center;gap:4px;font-size:10px;min-height:44px;color:var(--muted)}.catalogue-note{text-align:center;margin-top:32px;font-size:10px;color:var(--muted);letter-spacing:.03em}
 .quiz-section{padding-bottom:20px}.quiz-panel{display:grid;grid-template-columns:.75fr 1.25fr;border:1px solid rgb(var(--neem-rgb)/.15);border-radius:10px;overflow:hidden;background:var(--paper)}.quiz-art{position:relative;min-height:630px;overflow:hidden}.quiz-image{width:100%;height:100%;position:absolute;inset:0}.quiz-art::after{content:'';position:absolute;inset:30% 0 0;background:linear-gradient(transparent,rgb(24 40 29 / 85%))}.quiz-art-caption{position:absolute;bottom:39px;left:35px;right:25px;z-index:2;color:#F6EEDD}.quiz-art-caption>svg{width:45px;height:45px;margin-bottom:17px}.quiz-art-caption>span{font-size:22px}.quiz-art-caption p{font-family:'Cormorant Garamond',serif;font-size:37px;line-height:1.1;margin-top:12px}.quiz-content{padding:43px 47px 26px}.quiz-content h2{font-size:48px;white-space:pre-line}.quiz-content .eyebrow{margin-bottom:13px}.quiz-intro{font-size:11px;line-height:1.8;color:var(--muted);margin-top:15px;max-width:450px}.quiz-progress{display:flex;gap:6px;margin:24px 0}.quiz-progress span{height:3px;flex:1;background:var(--line);border-radius:2px}.quiz-progress span.complete{background:var(--neem)}.quiz-content legend{font-family:'Cormorant Garamond',serif;font-size:25px;line-height:1.2;font-weight:500}.question-number{display:block;font-family:Manrope,sans-serif;font-size:9px;letter-spacing:.12em;color:var(--terracotta);margin-bottom:9px}.question-hint{font-size:10px;color:var(--muted);margin:9px 0 16px}.quiz-options{display:grid;gap:9px}.quiz-option{display:flex;align-items:center;gap:12px;padding:10px 13px;min-height:51px;border:1px solid var(--line);border-radius:5px;cursor:pointer;font-size:11px;transition:background .2s,border-color .2s;position:relative}.quiz-option input,.theme-option input,.rating-stars input{position:absolute;opacity:0;width:1px;height:1px}.quiz-option:has(input:focus-visible),.theme-option:has(input:focus-visible),.rating-stars label:has(input:focus-visible){outline:3px solid var(--terracotta);outline-offset:3px}.quiz-option.selected{border-color:var(--neem);background:rgb(var(--neem-rgb)/.06)}.option-letter{width:27px;height:27px;border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;font-size:10px;color:var(--neem);flex-shrink:0}.quiz-option.selected .option-letter{background:var(--neem);color:var(--paper);border-color:var(--neem)}.quiz-option>svg{margin-left:auto;color:var(--neem)}.quiz-controls{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:22px}.quiz-controls .btn{font-size:11px;min-height:45px;padding:11px 17px;gap:12px}.quiz-disclaimer{font-size:9px;color:var(--muted);margin-top:22px;padding-top:15px;border-top:1px solid var(--line)}.quiz-section .leaf-divider{margin-top:35px}.quiz-result{padding-top:22px}.result-kicker{display:flex;align-items:center;gap:7px;font-size:10px;color:var(--terracotta)}.quiz-result h3{font-size:51px;color:var(--neem);margin:10px 0 3px}.result-element{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:16px}.quiz-result>p:not(.result-element){font-size:12px;color:var(--muted)}.score-row{display:grid;gap:8px;margin:22px 0}.score-row>div{display:flex;align-items:center;gap:13px;font-size:10px;text-transform:capitalize}.score-row>div>span{width:38px}.score-row strong{font-size:10px;font-weight:500}.score-track{height:5px;background:var(--line);flex:1;border-radius:4px;overflow:hidden}.score-track>span{height:100%;display:block;background:var(--neem)}.quiz-result h4{font-size:12px;margin-bottom:8px}.recommended-rituals{display:flex;flex-wrap:wrap;gap:5px 14px}.recommended-rituals a{display:flex;align-items:center;gap:7px;font-size:11px;min-height:44px;color:var(--neem)}.quiz-save-status{font-size:9px!important;margin-top:10px}
 .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:90px;align-items:center}.image-collage{position:relative;min-height:510px;padding:0 65px 55px 0}.collage-main{width:100%;height:455px;object-position:40% center}.collage-small{position:absolute;width:195px;height:220px;right:0;bottom:0;border:7px solid var(--paper);border-radius:6px;box-shadow:0 15px 35px -20px rgb(30 27 22 / 30%)}.collage-seal{position:absolute;left:-27px;bottom:32px;width:110px;height:110px;background:var(--sandal);border:1px solid rgb(var(--neem-rgb)/.25);outline:5px solid var(--paper);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-12deg);color:var(--neem)}.collage-seal svg{width:39px;height:39px}.collage-seal span{font-size:8px;letter-spacing:.15em;text-align:center;line-height:1.5}.about-copy h2{font-size:54px}.about-copy>p{font-size:12px;line-height:1.95;color:var(--muted);margin-top:23px}.about-copy blockquote{font-family:'Cormorant Garamond',serif;font-size:25px;font-style:italic;line-height:1.3;color:var(--neem);border-left:2px solid var(--turmeric);padding-left:20px;margin:24px 0}.about-stats{display:flex;gap:33px;margin:28px 0}.about-stats>div{display:flex;flex-direction:column}.about-stats strong{font-family:'Cormorant Garamond',serif;font-size:39px;font-weight:500;line-height:1;color:var(--neem)}.about-stats span{font-size:9px;color:var(--muted);margin-top:7px}.about-copy .btn{font-size:10px}.team-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:25px}.team-photo{position:relative;overflow:hidden;border-radius:130px 130px 6px 6px;margin-bottom:21px}.team-photo img,.team-photo .image-placeholder{width:100%;height:300px;object-position:center 25%;transition:transform .5s}.team-card:hover img{transform:scale(1.035)}.team-index{position:absolute;bottom:12px;right:12px;background:var(--paper);border-radius:50%;width:31px;height:31px;display:grid;place-items:center;font-size:10px;color:var(--neem)}.team-card h3{font-size:27px}.team-role{font-size:10px;color:var(--neem);margin-top:7px}.team-qualification{font-size:9px;color:var(--muted);margin-top:7px;min-height:32px}.specialty-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:11px}.specialty-tags span{font-size:8px;border:1px solid rgb(var(--neem-rgb)/.18);padding:4px 8px;border-radius:3px;color:var(--neem)}.staff-mini-gallery{margin-top:14px;border-top:1px solid var(--line);padding-top:10px}.staff-mini-gallery a{display:flex;align-items:center;gap:8px;min-height:44px}.staff-mini-gallery img,.staff-mini-gallery .image-placeholder{width:40px;height:36px;min-height:0;border-radius:3px}.staff-mini-gallery .image-placeholder span{display:none}.staff-mini-gallery .image-placeholder svg{width:22px}.staff-mini-gallery span{font-size:8px;color:var(--muted);line-height:1.4}.staff-mini-gallery svg{margin-left:auto}.packages-section{background:var(--paper)}.packages-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;margin-top:43px}.package-card{border:1px solid var(--line);border-radius:8px;background:var(--paper);position:relative;height:100%;overflow:hidden}.package-card.featured{border-color:var(--neem);box-shadow:0 14px 40px -28px rgb(47 74 58 / 45%)}.featured-label{position:absolute;top:15px;left:15px;z-index:2;display:flex;align-items:center;gap:6px;background:var(--neem);color:var(--paper);padding:6px 11px;font-size:9px;border-radius:3px}.package-image{height:190px;width:100%}.package-body{padding:25px}.package-body h3{font-size:31px;margin:10px 0 13px}.package-body>p{font-size:11px;color:var(--muted);min-height:58px}.package-body ul{list-style:none;margin:20px 0;padding:0;display:grid;gap:9px}.package-body li{display:flex;align-items:center;gap:8px;font-size:10px}.package-body li svg{color:var(--neem)}.package-bottom{border-top:1px solid var(--line);padding-top:17px;display:flex;align-items:center;justify-content:space-between;gap:8px}.package-bottom>strong{font-size:20px;font-weight:500;color:var(--neem)}.package-bottom .text-link{font-size:9px;gap:5px}.package-body .package-note{font-size:8px;min-height:0;margin-top:9px;line-height:1.6}
 .masonry-gallery{columns:3;column-gap:22px;margin-top:42px}.masonry-gallery>div{break-inside:avoid;margin-bottom:22px}.gallery-tile{display:block;width:100%;position:relative;overflow:hidden;border-radius:6px;border:0;padding:0;background:var(--sandal)}.gallery-tile img{width:100%;height:285px;transition:transform .65s}.gallery-tile-0 img,.gallery-tile-3 img{height:365px}.gallery-tile:hover img{transform:scale(1.045)}.gallery-caption{position:absolute;inset:auto 0 0;display:flex;align-items:center;justify-content:space-between;gap:15px;padding:35px 20px 19px;background:linear-gradient(transparent,rgb(20 30 20 / 75%));color:#fff;font-size:11px;text-align:left}.testimonial-section{background:var(--neem);color:var(--sandal);position:relative;overflow:hidden}.testimonial-section .eyebrow{color:var(--sandal);justify-content:center}.testimonial-section .section-heading h2{font-size:52px}.testimonial-carousel{max-width:780px;margin:35px auto 0;text-align:center;position:relative}.testimonial-scene{position:absolute;right:6%;top:42%;width:118px;height:156px;border-radius:70px 70px 6px 6px;opacity:.2;pointer-events:none;filter:saturate(.55)}.testimonial-mandala{position:absolute;width:480px;height:480px;left:-330px;top:-100px;color:var(--sandal);opacity:.12}.quote-mark{margin:0 auto 17px;color:var(--turmeric);stroke-width:1}.stars{display:flex;gap:5px;justify-content:center;color:var(--turmeric);margin-bottom:21px}.testimonial-slide blockquote{font-family:'Cormorant Garamond',serif;font-size:33px;line-height:1.35;font-weight:500;margin:0;min-height:135px}.review-author{display:flex;align-items:center;justify-content:center;gap:11px;margin-top:25px;font-size:10px}.review-avatar{width:39px;height:39px;min-height:0;border-radius:50%}.review-avatar.image-placeholder svg{width:25px;height:25px}.review-avatar.image-placeholder span{display:none}.carousel-controls{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:18px}.carousel-dots{display:flex}.carousel-dots button{width:44px;height:44px;display:grid;place-items:center;background:none;border:0}.carousel-dots span{width:5px;height:5px;border-radius:50%;background:rgb(var(--sandal-rgb)/.35)}.carousel-dots .active span{background:var(--turmeric);width:7px;height:7px}.testimonial-section .icon-btn:hover{background:rgb(255 255 255 / 10%)}.sample-note{font-size:8px;opacity:.7;margin-top:4px}.blog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}.blog-image-link{display:block;overflow:hidden;border-radius:6px}.blog-image-link img,.blog-image-link .image-placeholder{width:100%;height:245px;transition:transform .6s}.blog-card:hover .blog-image-link img{transform:scale(1.04)}.blog-meta{display:flex;justify-content:space-between;gap:8px;font-size:8px;color:var(--muted);margin:20px 0 12px}.blog-meta>span:first-child{color:var(--terracotta);letter-spacing:.09em}.blog-card h3{font-size:31px;line-height:1.12}.blog-card>p{font-size:11px;color:var(--muted);line-height:1.8;margin:13px 0 8px}.blog-card .text-link{font-size:10px}
 .booking-section{background:var(--neem);color:var(--sandal);position:relative;overflow:hidden}.booking-layout{display:grid;grid-template-columns:.9fr 1.1fr;gap:85px;align-items:center}.booking-story h2{white-space:pre-line;font-size:72px}.booking-story>p{font-size:12px;line-height:1.9;max-width:330px;opacity:.8;margin-top:22px}.booking-image-wrap{position:relative;max-width:320px;margin:32px 0 24px}.booking-image{height:310px;width:270px;border:5px solid rgb(var(--sandal-rgb)/.15);object-position:center 40%}.booking-image-note{position:absolute;right:-24px;bottom:27px;background:var(--sandal);color:#2F4A3A;padding:18px 24px;display:flex;align-items:center;gap:14px;border-radius:5px;box-shadow:0 10px 30px rgb(0 0 0 / 10%)}.booking-image-note span{font-size:11px;line-height:1.4}.booking-image-note em{font-size:27px}.booking-promises{display:flex;gap:20px;font-size:9px;opacity:.85}.booking-promises>span{display:flex;align-items:center;gap:7px}.glass-card{background:rgb(255 255 255 / 94%);border:1px solid rgb(255 255 255 / 40%);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 20px 65px -20px rgb(0 0 0 / 20%);transition:transform .35s,box-shadow .35s}.glass-card:hover{transform:scale(1.015);box-shadow:0 28px 70px -20px rgb(0 0 0 / 30%)}.booking-card{color:#1E1B16;border-radius:10px;padding:32px 35px;max-width:570px;width:100%;justify-self:end;transform-origin:center}.booking-card:hover{transform:scale(1.05)}.booking-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.booking-card h3{font-size:35px;color:#2F4A3A}.booking-steps{display:flex;list-style:none;padding:0;margin:24px 0 27px;gap:8px;justify-content:space-between}.booking-steps li{display:flex;align-items:center;gap:7px;font-size:9px;color:#73796E;position:relative}.booking-steps li>span{display:grid;place-items:center;width:22px;height:22px;border:1px solid #D7DDCF;border-radius:50%;font-size:9px}.booking-steps li.active{color:#2F4A3A}.booking-steps li.active>span{background:#2F4A3A;color:#fff;border-color:#2F4A3A}.field-label{display:block;font-size:11px;font-weight:600;margin-bottom:9px;color:#2F4A3A}.form-input{display:block;width:100%;border:1px solid #D9DDD2;background:rgb(255 255 255 / 80%);border-radius:5px;min-height:47px;padding:12px 13px;font-size:11px;color:#1E1B16;line-height:1.6;transition:border-color .2s}.form-input:focus{border-color:#2F4A3A;outline:2px solid rgb(47 74 58 / 15%);outline-offset:1px}.form-input::placeholder{color:#777D72}.form-input[aria-invalid=true]{border-color:#A5432E}.selected-service{display:flex;gap:15px;padding:19px 0 23px;margin-bottom:3px}.selected-service img,.selected-service .image-placeholder{width:78px;height:91px;border-radius:45px 45px 4px 4px;flex-shrink:0}.selected-service .image-placeholder span{display:none}.selected-service h4{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:500;line-height:1.1;color:#2F4A3A}.selected-service p{font-size:10px;color:#62675C;line-height:1.7;margin:7px 0}.selected-service>div>span{font-size:10px;color:#62675C}.selected-service>div>span>span{margin:0 7px}.selected-service strong{color:#2F4A3A;font-size:13px;font-weight:600}.booking-summary-line{display:flex;justify-content:space-between;gap:15px;border-top:1px solid #D9DDD2;padding-top:20px;margin:23px 0 18px;font-size:11px;color:#62675C}.booking-summary-line strong{font-size:21px;color:#2F4A3A;font-weight:500}.booking-fineprint{display:flex;align-items:center;justify-content:center;gap:6px;font-size:9px;color:#62675C;margin-top:13px;text-align:center}.booking-card .btn-primary{background:#2F4A3A;color:#fff}.booking-card .text-link{color:#2F4A3A}.booking-disclaimer{text-align:center;font-size:9px;line-height:1.8;opacity:.75;max-width:740px;margin:40px auto 0}.booking-stage-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.booking-stage-heading h4,.slot-heading{display:flex;align-items:center;gap:8px;font-size:12px;color:#2F4A3A}.booking-stage-heading>span{font-size:9px;color:#62675C}.date-navigation{display:flex;align-items:center;justify-content:space-between;font-size:9px;color:#62675C}.date-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;margin:5px 0 12px}.date-grid button{border:1px solid #D9DDD2;border-radius:5px;padding:9px 2px;min-height:76px;background:transparent;display:flex;flex-direction:column;align-items:center;gap:3px}.date-grid span{font-size:8px}.date-grid strong{font-size:18px;font-weight:500}.date-grid small{font-size:7px;min-height:11px}.date-grid button.selected{background:#2F4A3A;color:white;border-color:#2F4A3A}.date-input{font-size:10px;min-height:44px}.slot-heading{margin:21px 0 12px}.slot-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-height:215px;overflow-y:auto;padding:3px}.slot-grid button{min-height:44px;border:1px solid #D9DDD2;border-radius:4px;font-size:10px;background:white;color:#2F4A3A}.slot-grid button.selected{background:#2F4A3A;color:white;border-color:#2F4A3A}.stage-buttons{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:23px}.stage-buttons .btn{font-size:10px;padding:12px 16px;gap:10px}.booking-message{padding:13px 15px;background:#FAEEE4;border:1px solid #E6C4AD;color:#7C3824;border-radius:5px;font-size:11px;line-height:1.7;margin:15px 0}.booking-message small{display:block;font-size:9px;margin-top:5px}.booking-recap{display:flex;align-items:center;gap:10px;background:rgb(47 74 58 / 6%);padding:13px;border-radius:5px;margin-bottom:20px;color:#2F4A3A}.booking-recap strong{font-size:12px}.booking-recap p{font-size:9px;margin-top:3px}.booking-recap .text-link{margin-left:auto;font-size:10px}.form-field{margin-bottom:16px}.form-field label{display:block;font-size:11px;font-weight:600;margin-bottom:7px;color:#2F4A3A}.form-field label>span{color:#A5432E}.form-field label small{font-size:9px;font-weight:400;color:#62675C}.form-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field-error{font-size:10px;line-height:1.5;color:#A5432E;margin-top:5px}.field-help{font-size:10px;line-height:1.7;color:#62675C}.booking-privacy{font-size:9px;color:#62675C;line-height:1.7}.booking-privacy a{text-decoration:underline}.honeypot{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}.booking-success{text-align:center;padding:10px 0}.success-icon{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:rgb(47 74 58 / 10%);color:#2F4A3A;margin:0 auto 23px}.booking-success .eyebrow{justify-content:center;font-size:8px;color:#2F4A3A;margin-bottom:15px}.booking-success h3{font-size:45px}.booking-success>p{font-size:11px;color:#62675C;margin:17px auto;max-width:330px}.booking-success dl{margin:24px 0;text-align:left;border-top:1px solid #D9DDD2;padding-top:12px}.booking-success dl>div{display:flex;justify-content:space-between;gap:15px;font-size:11px;padding:8px 0}.booking-success dt{color:#62675C}.booking-success dd{text-align:right;margin:0;color:#2F4A3A}.booking-card .state-panel{color:#62675C;background:rgb(47 74 58 / 4%);border-color:#D9DDD2;font-size:11px}.booking-card .state-panel .text-link{font-size:10px}
 .faq-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:95px}.faq-grid .section-intro{margin-top:20px}.faq-image{width:230px;height:210px;margin-top:30px;object-position:center}.faq-item{border-bottom:1px solid var(--line)}.faq-item:first-child{border-top:1px solid var(--line)}.faq-item summary{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:21px 0;list-style:none;font-size:12px;font-weight:500;min-height:64px}.faq-item summary::-webkit-details-marker{display:none}.faq-plus{font-size:22px;font-weight:400;color:var(--neem);transition:transform .2s}.faq-item[open] .faq-plus{transform:rotate(45deg)}.faq-item>p{font-size:11px;color:var(--muted);line-height:1.9;padding:0 28px 22px 0}.faq-help{margin-top:28px}.faq-help .eyebrow{margin-bottom:0;font-size:9px}.contact-grid{display:grid;grid-template-columns:1fr 1.1fr;gap:80px;align-items:center}.contact-grid .section-intro{margin-top:20px}.contact-details{display:grid;gap:23px;margin-top:30px}.contact-details>div{display:flex;gap:15px;align-items:flex-start}.contact-details>div>svg{width:19px;height:19px;color:var(--neem);margin-top:3px;stroke-width:1.5}.contact-details strong{font-size:11px;font-weight:600;color:var(--neem)}.contact-details p,.contact-details a{display:block;font-size:11px;color:var(--muted);margin-top:5px;white-space:pre-line}.contact-details a{min-height:44px;display:flex;align-items:center}.map-card{border:7px solid var(--paper);border-radius:140px 140px 7px 7px;overflow:hidden;box-shadow:0 15px 40px -25px rgb(30 27 22 / 30%);background:var(--paper)}.map-card iframe{width:100%;height:395px;border:0;filter:sepia(.2) saturate(.65)}.map-caption{display:flex;align-items:center;gap:9px;padding:15px 18px;font-size:9px;color:var(--neem)}.map-placeholder{height:395px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;background:var(--sandal);color:var(--neem);padding:30px;text-align:center}
 .site-footer{background:#20392D;color:#F6EEDD;padding:65px 0 22px}.footer-top{display:grid;grid-template-columns:1.35fr .8fr 1fr 1fr;gap:45px;margin-bottom:40px}.footer-mantra{font-family:'Cormorant Garamond',serif;font-size:28px;line-height:1.2;margin:23px 0 15px}.footer-top h3{font-family:Manrope,sans-serif;font-size:10px;font-weight:600;letter-spacing:.03em;margin:8px 0 20px}.footer-top>div>a:not(.brand):not(.btn){display:flex;align-items:center;min-height:36px;font-size:10px;opacity:.75}.footer-top>div>a:hover{opacity:1}.footer-top p:not(.footer-mantra){font-size:10px;line-height:1.9;opacity:.75;white-space:pre-line;margin-bottom:15px}.footer-top .btn{font-size:10px;min-height:45px;padding:12px 18px}.footer-top .brand-name{font-size:25px}.footer-top .brand-mark{width:39px}.footer-top .brand-subtitle{font-size:6px}.site-footer .leaf-divider{color:#F6EEDD;opacity:.5}.site-footer .leaf-divider span{background:rgb(246 238 221 / 20%)}.footer-bottom{display:flex;justify-content:space-between;gap:20px;font-size:8px;opacity:.7;margin-top:18px}.footer-bottom>div{display:flex;align-items:center;gap:22px}.footer-bottom a,.footer-bottom span{display:flex;align-items:center;gap:6px;min-height:44px}.preview-note{font-size:8px;opacity:.55;margin-top:12px;line-height:1.7}.social-links{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}.social-links a{display:flex;align-items:center;gap:4px;font-size:10px;min-height:44px;text-transform:capitalize}.mobile-bar{display:none}.skip-link{position:fixed;top:-100px;left:20px;z-index:100;background:var(--neem);color:var(--paper);padding:14px 22px;border-radius:4px}.skip-link:focus{top:12px}
 .dialog-backdrop{position:fixed;inset:0;z-index:90;background:rgb(20 29 21 / 65%);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto}.dialog{position:relative;background:var(--paper);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:38px;max-width:510px;width:100%;max-height:90dvh;overflow-y:auto;box-shadow:0 30px 90px rgb(0 0 0 / 25%)}.dialog-close{position:absolute;right:10px;top:10px;z-index:3;background:var(--paper)}.dialog>.eyebrow{margin-top:12px}.theme-options{display:grid;gap:9px}.theme-option{display:flex;align-items:center;gap:13px;border:1px solid var(--line);padding:12px;border-radius:6px;cursor:pointer;position:relative;min-height:67px}.theme-option.selected{border-color:var(--neem);background:rgb(var(--neem-rgb)/.04)}.theme-swatch{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;border:1px solid rgb(0 0 0 / 8%)}.theme-option strong{display:block;font-size:12px;font-weight:600}.theme-option small{display:block;font-size:9px;color:var(--muted);margin-top:3px}.theme-option>svg{margin-left:auto;color:var(--neem)}.nav-dialog{max-width:430px;padding-top:35px}.nav-dialog nav{display:grid;margin:30px 0}.nav-dialog nav a{display:flex;justify-content:space-between;align-items:center;min-height:57px;border-bottom:1px solid var(--line);font-family:'Cormorant Garamond',serif;font-size:28px}.lightbox{max-width:950px;padding:14px;background:var(--paper)}.lightbox-image{width:100%;height:min(65dvh,650px);object-fit:contain;background:#18241b;border-radius:6px}.lightbox-caption{display:flex;justify-content:space-between;gap:15px;padding:15px 8px 0;font-size:12px}.lightbox-caption span{font-size:10px;color:var(--muted);white-space:nowrap}.lightbox-controls{display:flex;align-items:center;justify-content:space-between;gap:12px}.lightbox-controls>span{font-size:9px;color:var(--muted)}.cookie-banner{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:20px;width:min(1040px,calc(100% - 40px));background:var(--paper);border:1px solid var(--line);box-shadow:0 10px 50px rgb(30 27 22 / 16%);padding:19px 23px;border-radius:9px}.cookie-banner strong{font-size:12px;font-weight:600}.cookie-banner p{font-size:10px;color:var(--muted);margin-top:4px;max-width:460px}.cookie-banner p a{text-decoration:underline}.cookie-banner>div:last-child{margin-left:auto;flex-shrink:0}.offline-banner,.saved-banner{display:flex;align-items:center;justify-content:center;gap:9px;padding:9px 20px;font-size:10px;background:var(--sandal);color:var(--neem);border-bottom:1px solid var(--line)}.saved-banner{font-size:9px;background:rgb(var(--turmeric-rgb)/.12)}.saved-banner button{text-decoration:underline;min-height:44px;background:none;border:0}.state-panel{border:1px dashed var(--line);border-radius:6px;padding:25px 20px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;color:var(--muted);font-size:12px}.state-panel>svg{color:var(--neem)}.skeleton{background:linear-gradient(100deg,rgb(var(--neem-rgb)/.06) 20%,rgb(var(--neem-rgb)/.12) 45%,rgb(var(--neem-rgb)/.06) 70%);background-size:250% 100%;animation:shimmer 1.8s infinite;border-radius:6px}
 .breadcrumb{margin:30px 0 40px;font-size:11px}.service-detail-grid{display:grid;grid-template-columns:1fr 1.1fr;gap:85px;align-items:center}.detail-image{width:100%;height:600px}.service-detail-copy .eyebrow{font-size:9px}.service-detail-copy h1{font-size:72px;color:var(--neem)}.detail-lead{font-family:'Cormorant Garamond',serif;font-size:27px!important;line-height:1.3!important;color:var(--neem)!important;margin-top:20px!important}.detail-meta{display:flex;align-items:center;gap:30px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:18px 0;margin:25px 0}.detail-meta>span{display:flex;align-items:center;gap:8px;font-size:12px}.detail-meta strong{font-size:24px;font-weight:500;color:var(--neem)}.service-detail-copy>p{font-size:12px;color:var(--muted);line-height:1.9}.detail-subheading{font-size:28px;margin-top:25px}.detail-benefits{list-style:none;padding:0;margin:17px 0 25px;display:grid;gap:10px}.detail-benefits li{display:flex;align-items:center;gap:9px;font-size:12px}.detail-benefits svg{color:var(--neem)}.dosha-tags{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:22px;font-size:9px;color:var(--muted)}.dosha-tags>span:not(:first-child){border:1px solid var(--line);padding:4px 10px;border-radius:20px;text-transform:capitalize;color:var(--neem)}.medical-disclaimer{display:flex;gap:20px;padding:26px 30px;background:var(--sandal);border:1px solid var(--line);border-radius:7px;margin:55px 0 35px;color:var(--neem)}.medical-disclaimer h2{font-size:27px}.medical-disclaimer p{font-size:11px;line-height:1.8;margin-top:8px}.detail-end{text-align:center;padding:0 0 65px;color:var(--neem)}.detail-end svg{width:50px;height:50px;margin:0 auto 15px}.detail-end p{font-family:'Cormorant Garamond',serif;font-size:27px}.article-page{max-width:1080px;padding-bottom:90px}.article-header{text-align:center;max-width:760px;margin:25px auto 40px}.article-header .eyebrow{justify-content:center}.article-header h1{font-size:72px;color:var(--neem)}.article-header>p{font-size:14px;color:var(--muted);max-width:570px;margin:23px auto 17px}.article-date{font-size:10px;color:var(--muted)}.article-cover{width:100%;height:460px;border-radius:9px}.article-body{max-width:700px;margin:45px auto 0;font-size:14px;line-height:1.95;color:var(--muted)}.article-body h2{font-size:37px;color:var(--neem);margin:32px 0 16px}.article-body h3{font-size:29px;color:var(--neem);margin:25px 0 12px}.article-body p{margin-bottom:20px}.article-body a{color:var(--neem);text-decoration:underline}.article-body ul,.article-body ol{padding-left:24px;margin-bottom:20px}.article-body blockquote{border-left:2px solid var(--turmeric);padding-left:20px;font-family:'Cormorant Garamond',serif;font-size:27px;color:var(--neem)}.article-note{font-size:11px;padding:22px;background:var(--sandal);border-radius:5px;margin-top:35px;color:var(--neem)}.narrow-page{max-width:760px;padding-top:75px;padding-bottom:95px;position:relative}.narrow-page h1{color:var(--neem);font-size:72px}.page-lotus{width:65px;height:65px;color:var(--neem);margin-bottom:30px}.page-lead{font-size:14px;line-height:1.9;color:var(--muted);margin:25px 0 30px;max-width:540px}.legal-page{max-width:820px;padding-top:75px;padding-bottom:85px}.legal-page h1{color:var(--neem);font-size:76px}.legal-meta{font-size:10px;color:var(--muted);margin:25px 0 40px}.legal-page h2{font-size:33px;margin:32px 0 13px;color:var(--neem)}.legal-page>p:not(.legal-meta):not(.eyebrow){font-size:13px;line-height:1.95;color:var(--muted)}.legal-page a{text-decoration:underline}.review-form{max-width:570px;margin-top:35px}.review-form legend{font-size:12px;font-weight:600;color:var(--neem)}.rating-stars{display:flex;gap:7px;margin:10px 0 25px;color:#9B7735}.rating-stars label{position:relative;display:grid;place-items:center;width:48px;height:48px;cursor:pointer}.rating-stars label.filled{color:#B58325}.review-thanks{text-align:center}.review-thanks .eyebrow{justify-content:center}.review-thanks>p{font-size:14px;color:var(--muted);margin:25px 0}.not-found{text-align:center;overflow:hidden}.not-found .eyebrow{justify-content:center}.not-found-mandala{position:absolute;width:600px;height:600px;opacity:.08;top:15px;left:50px;z-index:-1}.not-found .page-lead{margin-left:auto;margin-right:auto}.setup-issues{padding:20px 25px;background:var(--sandal);border:1px solid var(--line);border-radius:5px;font-size:12px;color:var(--terracotta);margin-bottom:25px}.setup-issues li{margin:7px 0}.page-enter{animation:page-in .4s ease-out}
}
@keyframes mandala-turn{to{transform:rotate(360deg)}}@keyframes chip-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes shimmer{to{background-position:-250% 0}}@keyframes page-in{from{opacity:0}to{opacity:1}}
@supports not ((backdrop-filter:blur(16px)) or (-webkit-backdrop-filter:blur(16px))){.glass-card,.hero-chip{background:#FCFAF5}.dialog-backdrop{background:rgb(20 29 21 / 92%)}}
@media(min-width:1450px){.hero-grid{min-height:720px}.hero-visual{height:580px}.hero-image{height:580px}.hero h1{font-size:98px}}
@media(max-width:1100px){.desktop-nav{gap:18px}.desktop-nav a{font-size:10px}.header-inner{gap:15px}.brand-name{font-size:24px}.brand-mark{width:39px}.header-actions{gap:6px}.hero-grid{gap:30px;min-height:620px}.hero h1{font-size:76px}.hero-visual{height:490px;margin-right:10px}.hero-image{height:490px}.hero-chip-top{left:-20px}.hero-chip-bottom{right:-15px}.hero-vertical{right:-30px}.hero-description{font-size:13px}.hero-buttons .btn{padding:13px 16px;font-size:10px}.about-grid{gap:55px}.about-copy h2{font-size:47px}.team-grid{gap:18px}.team-photo img{height:260px}.team-card h3{font-size:24px}.quiz-content{padding:35px 30px 25px}.quiz-content h2{font-size:44px}.booking-layout{gap:45px}.booking-card{padding:28px}.booking-card:hover{transform:scale(1.02)}.booking-story h2{font-size:65px}.package-body{padding:21px}.package-bottom{align-items:flex-start;flex-direction:column;gap:0}.faq-grid,.contact-grid{gap:55px}.footer-top{gap:28px}.footer-top .brand-name{font-size:22px}.footer-top .brand-mark{width:32px}.service-detail-grid{gap:50px}.service-detail-copy h1{font-size:62px}.cookie-banner{gap:14px}.cookie-banner>svg{display:none}}
@media(max-width:900px){.desktop-nav{display:none}.mobile-menu-trigger{display:inline-flex}.hero h1{font-size:66px}.hero-grid{gap:25px;padding-top:45px;padding-bottom:45px;min-height:570px}.hero-visual{height:440px}.hero-image{height:440px}.hero-chip{font-size:8px;padding:11px 12px;gap:7px}.hero-chip-top{left:-15px;top:65px}.hero-chip-bottom{bottom:45px}.hero-buttons{gap:9px}.hero-buttons .btn{font-size:9px;padding:12px 14px;gap:9px}.hero-copy .eyebrow{font-size:8px;letter-spacing:.1em}.hero-footnote{margin-top:28px}.hero-bottom{font-size:8px}.hero-bottom-center{display:none}.services-grid{gap:18px}.service-card-body{padding:17px 17px 9px}.service-image-link img{height:190px}.service-card h3{font-size:26px}.service-card-body>p{font-size:10px;min-height:54px}.service-card li{font-size:9px}.service-details-link{display:none}.section-aside .section-mini-image{display:none}.quiz-panel{grid-template-columns:.65fr 1fr}.quiz-content{padding:30px 25px 23px}.quiz-art-caption{left:23px}.quiz-art-caption p{font-size:30px}.quiz-content h2{font-size:40px}.quiz-controls{flex-wrap:wrap}.about-grid{gap:40px}.image-collage{min-height:440px;padding-right:35px}.collage-main{height:400px}.collage-small{width:150px;height:175px}.collage-seal{width:90px;height:90px;left:-15px}.about-copy h2{font-size:42px}.about-stats{gap:20px}.about-stats span{font-size:8px}.team-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:35px}.team-photo img{height:340px}.team-card h3{font-size:30px}.team-qualification{min-height:0}.packages-grid{gap:17px}.package-body{padding:18px}.package-body h3{font-size:28px}.package-body>p{font-size:10px;min-height:75px}.package-body li{font-size:9px}.package-image{height:160px}.blog-grid{gap:20px}.blog-image-link img{height:200px}.blog-card h3{font-size:27px}.blog-meta{flex-direction:column;gap:4px}.booking-layout{grid-template-columns:.8fr 1.2fr;gap:30px}.booking-story h2{font-size:55px}.booking-card{padding:25px 22px}.booking-card h3{font-size:30px}.booking-steps li{font-size:8px;gap:4px}.booking-image{width:220px;height:280px}.booking-image-note{right:-5px;padding:14px 18px}.booking-promises{flex-direction:column;gap:10px}.faq-grid{gap:40px}.contact-grid{gap:35px}.footer-top{grid-template-columns:1.2fr 1fr;gap:35px}.footer-bottom{flex-direction:column;gap:0}.cookie-banner{align-items:flex-start;flex-direction:column;gap:12px;max-width:550px}.cookie-banner>div:last-child{margin-left:0}.cookie-banner p{max-width:none}.service-detail-grid{gap:35px}.detail-image{height:540px}.service-detail-copy h1{font-size:54px}.detail-lead{font-size:24px!important}.masonry-gallery{column-gap:16px}.masonry-gallery>div{margin-bottom:16px}.gallery-tile img{height:230px}.gallery-tile-0 img,.gallery-tile-3 img{height:310px}}
@media(max-width:767px){html{scroll-padding-top:86px}.container-shell{padding-left:24px;padding-right:24px}.section-space{padding-top:65px;padding-bottom:65px}.header-inner{height:76px}.brand-name{font-size:25px}.brand-mark{width:39px;height:44px}.brand-subtitle{font-size:6px}.header-book{display:none}.header-actions{gap:3px}.hero-grid{grid-template-columns:1fr;gap:40px;padding-top:43px;padding-bottom:35px}.hero-copy{padding-bottom:0}.hero-copy .eyebrow{font-size:8px;margin-bottom:21px}.hero h1{font-size:clamp(64px,12vw,86px);line-height:.98;max-width:560px}.hero-description{font-size:13px;max-width:390px;margin-top:23px}.hero-buttons{margin-top:25px;gap:12px}.hero-buttons .btn{font-size:11px;min-height:49px;padding:13px 20px;gap:15px}.hero-footnote{margin-top:24px;font-size:9px}.hero-visual{height:490px;max-width:430px;justify-self:center;margin:0;width:calc(100% - 22px)}.hero-image{height:490px}.hero-image-wrap{inset:0 8px 0 0}.hero-outline-arch{inset:-12px -4px 14px 14px}.hero-chip{font-size:9px;padding:13px 15px}.hero-chip-top{left:-18px;top:75px}.hero-chip-bottom{right:-20px;bottom:65px}.hero-vertical{right:-29px;font-size:6px;top:160px}.hero-mandala{right:-130px;top:-75px;width:330px;height:330px}.hero-bottom{font-size:8px;padding-top:15px;padding-bottom:15px}.hero-bottom>span:last-child{font-size:7px;gap:5px}.section-heading h2{font-size:48px}.section-topline{gap:20px;margin-bottom:27px}.section-intro{font-size:12px;max-width:500px}.eyebrow{font-size:9px;margin-bottom:16px}.services-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.service-image-link img{height:200px}.service-card h3{font-size:28px}.service-card-body>p{min-height:54px}.filter-tabs{gap:7px;margin-top:25px}.filter-tabs button{padding:10px 18px;font-size:10px}.quiz-panel{grid-template-columns:1fr}.quiz-art{min-height:230px;max-height:230px}.quiz-image{object-position:center 53%}.quiz-art::after{inset:0;background:linear-gradient(90deg,rgb(24 40 29 / 70%),transparent)}.quiz-art-caption{bottom:25px;left:28px}.quiz-art-caption>svg{width:32px;height:32px;margin-bottom:8px}.quiz-art-caption>span{font-size:17px}.quiz-art-caption p{font-size:31px;margin-top:7px}.quiz-content{padding:30px 28px 25px}.quiz-content h2{font-size:45px}.quiz-intro{font-size:11px}.quiz-content legend{font-size:26px}.quiz-option{font-size:11px;min-height:56px}.quiz-controls{flex-wrap:nowrap}.quiz-controls .btn{font-size:10px}.quiz-disclaimer{font-size:9px}.about-grid{grid-template-columns:1fr;gap:40px}.image-collage{max-width:470px;width:100%;margin:auto;min-height:470px;padding-right:65px}.collage-main{height:420px}.collage-small{width:185px;height:205px}.collage-seal{left:-5px;bottom:25px;width:100px;height:100px}.about-copy h2{font-size:49px}.about-copy>p{font-size:12px}.about-stats{gap:40px}.about-stats span{font-size:9px}.team-grid{gap:28px 20px}.team-photo img{height:290px}.team-card h3{font-size:27px}.team-role{font-size:9px}.team-qualification{font-size:8px}.packages-grid{grid-template-columns:1fr;gap:25px;margin-top:30px}.package-card{display:grid;grid-template-columns:.65fr 1fr;overflow:visible}.package-image{height:100%;min-height:330px;border-radius:8px 0 0 8px}.package-body{padding:24px}.package-body h3{font-size:31px}.package-body>p{min-height:0;font-size:11px}.package-body li{font-size:10px}.package-bottom{flex-direction:row;align-items:center;gap:8px}.featured-label{top:12px;left:12px}.package-body .package-note{font-size:8px}.masonry-gallery{columns:2;margin-top:30px}.gallery-tile img{height:230px}.gallery-tile-0 img,.gallery-tile-3 img{height:300px}.gallery-caption{font-size:10px;padding:30px 14px 15px}.testimonial-section .section-heading h2{font-size:46px}.testimonial-slide blockquote{font-size:29px;min-height:160px}.testimonial-carousel{margin-top:28px}.blog-grid{grid-template-columns:1fr;gap:35px}.blog-card{display:grid;grid-template-columns:.8fr 1fr;column-gap:23px}.blog-image-link{grid-row:1/5;height:100%}.blog-image-link img{height:100%;min-height:245px}.blog-meta{margin:5px 0 10px;font-size:8px}.blog-card h3{font-size:30px}.blog-card>p{font-size:11px;margin:10px 0 3px}.blog-card .text-link{font-size:10px}.booking-layout{grid-template-columns:1fr;gap:35px}.booking-story{display:grid;grid-template-columns:1fr .65fr;column-gap:25px}.booking-story .eyebrow{grid-column:1/-1}.booking-story h2{font-size:58px;grid-column:1}.booking-story>p{grid-column:1;font-size:11px;margin-top:18px}.booking-image-wrap{grid-column:2;grid-row:2/4;margin:0;align-self:center}.booking-image{width:100%;height:245px;border-width:4px}.booking-image-note{right:-8px;bottom:18px;padding:10px 12px;gap:7px}.booking-image-note em{font-size:22px}.booking-image-note span{font-size:9px}.booking-image-note svg{width:17px}.booking-promises{grid-column:1/-1;flex-direction:row;margin-top:22px;font-size:8px}.booking-card{max-width:100%;padding:30px;justify-self:stretch}.booking-card:hover{transform:none}.booking-card h3{font-size:37px}.booking-steps{justify-content:flex-start;gap:28px}.booking-steps li{font-size:10px;gap:7px}.booking-disclaimer{font-size:9px;margin-top:28px}.booking-card .form-input{font-size:12px}.faq-grid{grid-template-columns:1fr;gap:30px}.faq-image{display:block;width:100%;height:150px;border-radius:80px 80px 5px 5px;margin-top:22px}.faq-grid .section-intro{max-width:100%}.faq-item summary{font-size:12px}.faq-item>p{font-size:12px}.contact-grid{grid-template-columns:1fr;gap:35px}.map-card{max-width:520px;width:100%;margin:auto}.map-card iframe{height:330px}.contact-details{grid-template-columns:1fr 1fr;gap:23px}.contact-details>div:first-child{grid-column:1/-1}.site-footer{padding-top:50px;padding-bottom:95px}.footer-top{gap:32px 25px}.footer-top>div:first-child{grid-column:1/-1}.footer-top>div:last-child{grid-column:1/-1}.footer-mantra{font-size:31px}.footer-top .brand-name{font-size:28px}.footer-top .brand-mark{width:43px}.footer-top>div>a:not(.brand):not(.btn){min-height:44px;font-size:11px}.footer-top h3{font-size:11px;margin-bottom:13px}.footer-top p:not(.footer-mantra){font-size:11px}.footer-bottom{font-size:9px}.footer-bottom>div{gap:25px;flex-wrap:wrap}.preview-note{font-size:8px}.mobile-bar{position:fixed;bottom:0;left:0;right:0;z-index:50;display:grid;grid-template-columns:1fr 1fr 1.2fr;background:var(--paper);border-top:1px solid var(--line);padding:8px 14px calc(8px + env(safe-area-inset-bottom));box-shadow:0 -5px 25px rgb(30 27 22 / 6%);gap:8px}.mobile-bar a{display:flex;align-items:center;justify-content:center;gap:7px;min-height:46px;font-size:10px;color:var(--neem);border-radius:5px}.mobile-bar .mobile-book{background:var(--neem);color:var(--paper)}.cookie-banner{bottom:80px;max-width:calc(100% - 30px);width:480px;padding:17px 19px;gap:12px}.cookie-banner strong{font-size:11px}.cookie-banner p{font-size:9px}.cookie-banner .btn{font-size:10px}.saved-banner{font-size:8px;flex-wrap:wrap;gap:4px;padding:6px 15px}.saved-banner button{min-height:30px}.offline-banner{font-size:9px}.service-detail-grid{grid-template-columns:1fr;gap:35px}.detail-image{height:480px;max-width:470px;margin:auto}.service-detail-copy h1{font-size:65px}.service-detail-copy>p{font-size:13px}.detail-lead{font-size:28px!important}.medical-disclaimer{padding:22px;gap:15px;margin-top:35px}.medical-disclaimer p{font-size:11px}.article-header h1{font-size:58px}.article-cover{height:340px}.article-body{font-size:13px}.article-header>p{font-size:13px}.narrow-page,.legal-page{padding-top:50px;padding-bottom:65px}.narrow-page h1,.legal-page h1{font-size:64px}.page-lead{font-size:13px}.dialog{padding:30px 24px}.lightbox{padding:10px}.lightbox-image{height:58dvh}.lightbox-controls>span{font-size:8px}.dialog-backdrop{padding:16px}.theme-option small{font-size:9px}}
@media(max-width:480px){.container-shell{padding-left:21px;padding-right:21px}.header-inner{height:72px}.brand-name{font-size:23px}.brand-mark{width:35px}.brand{gap:8px}.brand-subtitle{font-size:5.8px}.settings-trigger{width:39px;min-width:44px}.hero-grid{padding-top:35px;gap:35px}.hero h1{font-size:66px}.hero-copy .eyebrow{font-size:7px;letter-spacing:.11em;gap:8px}.hero-copy .eyebrow>span{width:19px}.hero-description{font-size:12px;max-width:310px}.hero-buttons{gap:9px}.hero-buttons .btn{font-size:10px;padding:13px 16px;gap:11px}.hero-visual{height:405px;width:calc(100% - 24px)}.hero-image{height:405px;border-width:5px}.hero-chip-top{top:60px;left:-15px}.hero-chip-bottom{bottom:48px;right:-17px}.hero-chip{font-size:8px;padding:11px 12px}.hero-chip svg{width:17px}.hero-vertical{right:-25px;font-size:5.5px}.hero-bottom>span:last-child{display:none}.hero-bottom{justify-content:center;font-size:8px}.section-heading h2{font-size:43px}.section-space{padding-top:55px;padding-bottom:55px}.services-grid{grid-template-columns:1fr;gap:25px}.service-image-link img{height:235px}.service-card-body{padding:21px 23px 12px}.service-card h3{font-size:33px}.service-card-body>p{font-size:12px;min-height:0}.service-card li{font-size:10px}.service-meta{font-size:10px}.service-details-link{display:flex}.filter-tabs{gap:7px}.filter-tabs button{font-size:10px;padding:9px 17px}.catalogue-note{font-size:9px}.quiz-content{padding:27px 21px 22px}.quiz-content h2{font-size:41px}.quiz-art{min-height:210px}.quiz-option{font-size:10px;padding:10px;gap:9px}.quiz-controls{gap:8px}.quiz-controls>.text-xs{font-size:8px}.quiz-controls .btn{font-size:9px;padding:12px;gap:7px}.quiz-content legend{font-size:24px}.quiz-intro{font-size:10px}.about-copy h2{font-size:44px}.image-collage{min-height:405px;padding-right:45px;padding-bottom:40px}.collage-main{height:365px}.collage-small{width:155px;height:175px;border-width:5px}.collage-seal{width:86px;height:86px;left:-3px;bottom:22px}.collage-seal svg{width:32px;height:32px}.collage-seal span{font-size:7px}.about-stats{gap:27px}.about-stats strong{font-size:36px}.about-stats span{font-size:8px}.about-copy blockquote{font-size:24px}.team-grid{gap:27px 15px}.team-photo{border-radius:90px 90px 5px 5px;margin-bottom:15px}.team-photo img{height:220px}.team-card h3{font-size:24px}.team-role{font-size:8px;min-height:27px}.team-qualification{font-size:8px;min-height:40px}.specialty-tags span{font-size:7px;padding:3px 6px}.staff-mini-gallery span{font-size:7px}.staff-mini-gallery img{width:31px;height:31px}.staff-mini-gallery svg{display:none}.package-card{display:block;overflow:hidden}.package-image{height:200px;min-height:0;border-radius:0}.package-body{padding:25px}.package-body h3{font-size:34px}.package-body>p{font-size:12px}.package-body li{font-size:11px}.package-bottom .text-link{font-size:10px}.package-body .package-note{font-size:9px}.masonry-gallery{column-gap:12px}.masonry-gallery>div{margin-bottom:12px}.gallery-tile img{height:190px}.gallery-tile-0 img,.gallery-tile-3 img{height:250px}.gallery-caption{font-size:8px;padding:28px 10px 12px;gap:7px}.gallery-caption svg{width:14px}.testimonial-section .section-heading h2{font-size:42px}.testimonial-slide blockquote{font-size:27px;min-height:195px}.review-author{font-size:9px}.blog-card{display:block}.blog-image-link img{height:235px;min-height:0}.blog-meta{flex-direction:row;margin-top:18px;font-size:8px}.blog-card h3{font-size:34px}.blog-card>p{font-size:12px;margin-top:12px}.blog-card .text-link{font-size:11px}.booking-story{display:block}.booking-story h2{font-size:62px}.booking-story>p{font-size:12px;max-width:300px}.booking-image-wrap{display:none}.booking-promises{font-size:8px;gap:17px}.booking-card{padding:26px 21px}.booking-card h3{font-size:32px}.booking-steps{gap:12px;justify-content:space-between}.booking-steps li{font-size:8px;gap:5px}.booking-steps li>span{width:20px;height:20px}.booking-card .eyebrow-small{font-size:8px}.selected-service{gap:12px}.selected-service img{width:68px;height:85px}.selected-service h4{font-size:25px}.selected-service p{font-size:9px}.form-two{grid-template-columns:1fr;gap:0}.date-grid{gap:3px}.date-grid button{min-height:70px}.date-grid span{font-size:7px}.date-grid strong{font-size:17px}.date-navigation{font-size:8px}.date-navigation .icon-btn{width:35px;min-width:44px}.stage-buttons .btn{font-size:9px;padding:12px;gap:7px}.stage-buttons .text-link{font-size:10px}.booking-recap{gap:8px;padding:11px}.booking-recap p{font-size:8px}.booking-success h3{font-size:41px}.booking-success dl>div{font-size:10px}.contact-details{grid-template-columns:1fr}.contact-details>div:first-child{grid-column:auto}.map-card iframe{height:300px}.map-caption{font-size:8px;padding:13px}.footer-top{gap:25px 20px}.footer-top h3{font-size:10px}.footer-top p:not(.footer-mantra){font-size:10px}.footer-top>div>a:not(.brand):not(.btn){font-size:10px}.footer-bottom>div{gap:18px}.footer-bottom{font-size:8px}.cookie-banner{padding:15px 17px}.cookie-banner .btn{font-size:9px;padding:10px 13px}.service-detail-copy h1{font-size:58px}.detail-image{height:420px}.medical-disclaimer{padding:20px 17px;gap:12px}.medical-disclaimer>svg{width:21px}.medical-disclaimer h2{font-size:25px}.article-header h1{font-size:49px}.article-cover{height:260px}.article-body{margin-top:30px}.narrow-page h1,.legal-page h1{font-size:58px}.page-lotus{width:53px;height:53px}.lightbox-caption{font-size:10px}.lightbox-controls>span{max-width:150px;text-align:center}.dialog{padding:30px 20px}.dialog h2{font-size:36px}.theme-option{padding:10px;gap:10px}.theme-option small{font-size:8px}.theme-option strong{font-size:11px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}.mandala,.hero-chip{animation:none!important}.glass-card:hover,.brand:hover,.service-card:hover,.btn:hover:not(:disabled){transform:none!important}.page-enter{animation:none!important}}
```

## `scripts/browser-check.mjs`

```javascript
import { chromium as playwright } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
const executablePath = process.env.CHROMIUM_PATH;
if (!executablePath) throw new Error('Set CHROMIUM_PATH to a locally installed Chrome/Chromium binary.');
const browser = await playwright.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'], headless: true });
const issues = []; const logs = [];
for (const viewport of [{ name: 'mobile 360', width: 360, height: 800 }, { name: 'mobile 390', width: 390, height: 844 }, { name: 'tablet 768', width: 768, height: 1024 }, { name: 'desktop 1440', width: 1440, height: 1000 }]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await page.route('**/rest/v1/rpc/get_public_site*', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'intentional preview fallback' }) }));
  page.on('pageerror', (error) => issues.push(`${viewport.name} page error: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') logs.push(`${viewport.name}: ${message.text()}`); });
  page.on('requestfailed', (request) => { if (new URL(request.url()).hostname !== 'offline.invalid') issues.push(`${viewport.name} request failed ${request.url()}: ${request.failure()?.errorText}`); });
  const response = await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('h1', { timeout: 15000 });
  const initial = await page.locator('h1').allTextContents();
  if (response?.status() !== 200 || !initial.some((text) => text.includes('Return to your'))) issues.push(`${viewport.name} home did not render expected fallback headline: ${initial.join(' | ')}`);
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  if (dimensions.scrollWidth > dimensions.clientWidth + 1) issues.push(`${viewport.name} horizontal overflow: ${JSON.stringify(dimensions)}`);
  const main = await page.locator('main h1').count(); if (main !== 1) issues.push(`${viewport.name} expected exactly one main h1, got ${main}`);
  const invalidImages = await page.locator('img').evaluateAll((imgs) => imgs.filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc));
  if (invalidImages.length) issues.push(`${viewport.name} broken images: ${invalidImages.join(', ')}`);
  if (viewport.width <= 767) {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    if (!(await page.getByRole('dialog', { name: 'Navigation' }).isVisible())) issues.push(`${viewport.name} mobile navigation did not open`);
    await page.keyboard.press('Escape');
    if (await page.getByRole('dialog', { name: 'Navigation' }).count()) issues.push(`${viewport.name} mobile navigation did not close with Escape`);
  }
  await page.getByRole('button', { name: 'Open appearance settings' }).click();
  for (const name of ['Neem garden', 'Saffron morning', 'Rose clay', 'Midnight herb', 'Sandalwood quiet']) if (await page.getByText(name).count() === 0) issues.push(`${viewport.name} theme missing ${name}`);
  await page.getByRole('radio', { name: /Rose clay/ }).check();
  const changed = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sandal').trim());
  if (changed !== '#F4E7E1') issues.push(`${viewport.name} theme switch failed: ${changed}`);
  await page.keyboard.press('Escape');
  await page.locator('#services').scrollIntoViewIfNeeded();
  await page.getByRole('tab', { name: 'Mind' }).click();
  if ((await page.locator('#service-results article').count()) === 0) issues.push(`${viewport.name} category filter has no mind service`);
  if (viewport.name === 'desktop 1440') {
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    for (const violation of axe.violations) issues.push(`axe ${violation.impact} ${violation.id}: ${violation.nodes.map((node) => node.target.join(', ')).join(' | ')}`);
    await page.getByRole('button', { name: /Open image/ }).first().click();
    if (!(await page.getByRole('dialog', { name: 'Gallery image' }).isVisible())) issues.push('Gallery lightbox failed to open');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Escape');
    if (await page.getByRole('dialog', { name: 'Gallery image' }).count()) issues.push('Gallery lightbox failed to close with Escape');
  }
  console.log(`${viewport.name}: ${response?.status()} home, fallback ${initial[0]?.replace(/\s+/g, ' ')}, viewport ${dimensions.clientWidth}px, content ${dimensions.scrollWidth}px`);
  await page.close();
}
if (logs.length) issues.push(...logs.map((entry) => `console error ${entry}`));
await browser.close();
if (issues.length) { console.error(`BROWSER CHECK FAILED (${issues.length})\n${issues.map((issue) => `- ${issue}`).join('\n')}`); process.exit(1); }
console.log('PASS: no page errors or console errors; all fallbacks, routes, accessible controls, themes, images, and viewport checks passed.');
```

## `scripts/generate-sitemap.mjs`

```javascript
import { readFile, writeFile } from 'node:fs/promises';
import { loadEnv } from 'vite';
const env = { ...loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), 'VITE_'), ...process.env };
const site = JSON.parse(await readFile('src/data/site.config.json', 'utf8'));
const origin = (env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const paths = ['/', '/privacy', '/terms', ...site.services.map((item) => `/service/${item.slug}`), ...site.blog_posts.map((item) => `/blog/${item.slug}`)];
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${escape(origin + path)}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile('dist/sitemap.xml', xml);
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /review/\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Sitemap: ${paths.length} public URLs. Admin and review routes excluded.`);
```

## `scripts/prepare-assets.mjs`

```javascript
import sharp from 'sharp';
import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

await mkdir('public/images', { recursive: true });
await mkdir('public/fonts', { recursive: true });
for (const file of await readdir('assets/source')) {
  if (!file.endsWith('.webp')) continue;
  const name = file.slice(0, -5);
  const input = `assets/source/${file}`;
  for (const width of [400, 800, 1600]) {
    const output = `public/images/${name}-${width}.webp`;
    await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: width === 400 ? 76 : 82 }).toFile(output);
  }
}
const fonts = [
  ['cormorant-garamond', 'latin-500-normal'], ['cormorant-garamond', 'latin-600-normal'],
  ['cormorant-garamond', 'latin-500-italic'], ['manrope', 'latin-400-normal'],
  ['manrope', 'latin-500-normal'], ['manrope', 'latin-600-normal'],
  ['tiro-devanagari-hindi', 'devanagari-400-normal'],
];
for (const [family, variant] of fonts) {
  const name = `${family}-${variant}.woff2`;
  await copyFile(resolve(`node_modules/@fontsource/${family}/files/${name}`), `public/fonts/${name}`);
}
console.log('Prepared local WebP variants and self-hosted font subsets.');
```

## `public/robots.txt`

```text
User-agent: *
Allow: /
Disallow: /admin
Disallow: /review/
# The build replaces this with the configured production sitemap URL.
```

## `public/favicon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#2F4A3A"/><g fill="none" stroke="#F6EEDD" stroke-width="1.6"><path d="M32 48C12 36 15 19 32 12c17 7 20 24 0 36Z"/><path d="M32 48C18 43 10 31 14 23c12 0 18 10 18 25Zm0 0c14-5 22-17 18-25-12 0-18 10-18 25Z"/><path d="M32 48V20"/></g></svg>
```
