# Template07 — final visual fixes & QA

Date: 2026-10-28. Existing Dermacure design, section order, tokens and booking integration retained. No application dependencies added for this pass.

## Fixes
- Reusable image handling now attempts the original source, a local fallback, then a terminal inline neutral SVG. Failed sources are tracked to prevent loops; fallback removes the original srcSet and retains meaningful accessible labels.
- Added local `care-neutral.svg` and `brand-mark.svg`; reused existing local illustrative assets. Extended protection to logo/account imagery, editorial panels, gallery and opt-in video posters.
- Failed gallery images lose their broken destination link. Failed consented comparison photos show an explicit unavailable state instead of fabricated patient results or replacement comparison imagery.
- Added a Template07-only stuck-reveal recovery watchdog. Reduced-motion CSS cancels an existing hero parallax transform even when the OS preference changes after load. Mobile parallax is disabled.
- Section anchor offsets account for the preview toolbar and header. Improved spacing below the unavailable-booking CTA.
- Shared image-error and resilient-poster props are optional; other templates retain their default behavior.

## Executed checks

| Viewport width | Chromium checks |
| --- | --- |
| 320px | Pass |
| 375px | Pass |
| 430px | Pass |
| 768px | Pass |
| 1024px | Pass |
| 1440px | Pass |

At each width: page scrolled through, no horizontal overflow, no broken rendered images after fallback, treatment image crops aligned at 4:3. Existing runner additionally checks section order and 44px visible button/link heights at 375px. Viewport screenshots of the personalised panel were inspected at 375px and 1440px; mobile booking screenshot review prompted the notice-spacing fix. Automated geometry checks are not a claim of exhaustive manual visual review at every width.

`scripts/check-dermacure-final.mjs` passes:
- Mobile open, close button, Escape, focus restoration, Tab/Shift+Tab loop, all six navigation destinations, auto-close and scroll unlock; no dangling local section anchors.
- Treatment filters, hero entrance/parallax, runtime reduced-motion preference, deliberately stalled reveal recovery, and reveal visibility with IntersectionObserver unavailable.
- Intercepted synthetic public-route fixture: availability loading/error/empty/retry, invalid phone rejection, populated available slot, actual BookingModal handoff and name/message prefill, dismissal, explicit non-confirmation notice.
- FAQ toggles, keyboard and mouse comparison adjustment, result next control, failed-result suppression, review next control and removal of failed gallery links.
- Forced remote AND local image failures terminate in inline SVG without broken image elements.
- Zero uncaught page errors and zero reservation writes.

`scripts/check-dermacure-browser.mjs` also passes after the final changes.

`npm test` passes: application TypeScript/lint (`tsc --noEmit`), edge TypeScript, production client/server build and **68/68 verification suites**. `git diff --check` passes. Existing test-renderer warnings and the build chunk-size warning remain.

## Network findings and remaining dependencies

Normal preview recorded these failed requests in the restricted sandbox:
- `fonts.googleapis.com`: 2
- `images.unsplash.com`: 6
- `zilwgiuiygqqardzutxi.supabase.co`: 2
- `img.youtube.com`: 5

There were 15 console error entries associated with external fetch failures, no failed local resources in the normal preview, and no uncaught JavaScript errors. Dermacure typography is locally hosted; failed imagery resolves locally. This does not establish that the external hosts are unavailable to production users.

Booking browser tests used intercepted synthetic API responses only. Successful transfer into checkout was verified, **not successful reservation/payment completion**. No real patients, testimonials, results, bookings or payments were created. Live authentication, availability, payment-provider responses, confirmation/email delivery and production authorization still require a connected staging/live environment. The consultation-message SQL migration remains a deployment prerequisite. External video playback and call/map destinations were not verified against live providers. No claim is made that every provider-backed control completed end to end.

## Reproduce

With the app running on port 3000 and temporary Chromium tools installed outside the repository:

```sh
npm test
BROWSER_TOOLS_ROOT=/tmp/dermacure-browser LD_LIBRARY_PATH=/tmp/dermacure-browser/libs/lib node scripts/check-dermacure-final.mjs
BROWSER_TOOLS_ROOT=/tmp/dermacure-browser LD_LIBRARY_PATH=/tmp/dermacure-browser/libs/lib node scripts/check-dermacure-browser.mjs
git diff --check
```

Use `PREVIEW_URL` to override the runner's preview URL. Browser tooling is not an application dependency.
