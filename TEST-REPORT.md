# StudioFlow Test Report

**Date:** 2026-11-06  
**Baseline:** main @ `dfd03cb`

## Results observed

| Test / check | Result | Evidence |
|---|---|---|
| Repository tree inspection | Complete recursive tree returned (1,964 paths) | GitHub tree API |
| Current main CI status | Failed / blocked | GitHub commit status reports Vercel deployment rate limit |
| PR #80 prior verification | 113 passed / 5 failed | Completed GitHub Actions job log from earlier PR head |
| TypeScript check | Passed on that earlier PR job | Job log |
| Vite production build | Passed on that earlier PR job | Job log |
| Dependency audit | Passed on that earlier PR job | Job log |
| Current main `npm test` | Not run | No local repository checkout/build runner available through connected GitHub tool |
| Browser E2E | Not run | Connected browser extension could not read site host due missing extension permission |
| Live Supabase schema and advisors | Inspected read-only | Supabase tools |
| Vercel deployment list | Blocked | Vercel API returned 403 for deployment listing |
| Accessibility report | Not imported | BrowserStack email found; temporary export link not accessible to this retrieval channel |
| Live Core Web Vitals | Not measured | No Lighthouse/PageSpeed run available |

## Known earlier verification failures

- App-install contrast: 4.10:1 vs 4.5:1.
- Customer catalogue test expected 15; DB contains 16.
- Homepage heading assertion stale.
- Service-photo owner image rendering assertion.
- Website owner-video normalization/rendering assertion.

These are open until reproduced and resolved against current main.

## Required next run

On the fresh repair branch:

1. `npm ci`
2. `npm run lint`
3. `npm run lint:edge`
4. `npm run build`
5. `node scripts/run-all-verifications.mjs`
6. `npm test`
7. Playwright/browser E2E against preview with isolated test identities.
8. Supabase SQL policy/grant assertions.
9. Accessibility and responsive checks at 390, 430, 768, 1024, 1440 and 1920px.
10. Lighthouse/mobile performance and security-header probes.

## Release gate

Do not merge or deploy until all required checks pass or a failure has a documented, approved reason. Never suppress a failing test merely to make the workflow green.
