# StudioFlow Performance Report

**Date:** 2026-11-06  
**Measurement status:** Repository/build evidence only; no current production Web Vitals claim.

## Required targets

| Metric | Target | Current production measurement |
|---|---:|---|
| LCP | ≤ 2.5 s | Not measured in this execution |
| FCP | ≤ 1.8 s | Not measured in this execution |
| CLS | ≤ 0.1 | Not measured in this execution |
| INP | ≤ 200 ms | Not measured in this execution |

The older BugViso figures supplied in the task (mobile LCP/FCP around 3.96 s and the earlier bundle estimate) were not treated as current measurements.

## Repository/build evidence

- The recursive main tree contains several large JPG assets in the 700–850 KB range, including service/hero media. Some same-named assets exist in both `public/template-assets/` and `src/assets/images/`, so duplicate delivery and source-of-truth should be checked.
- A PR #69 CI build snapshot (not a current main or production measurement) reported `main-C_rhShpm.css` at 765.76 KB uncompressed / 127.48 KB gzip.
- The same CI build emitted many small feature chunks, which indicates some code splitting already exists. No claim is made that initial-route JavaScript is optimized to target.
- The HTML loads Google Fonts and Material Symbols from Google Fonts. The links use a print/onload pattern on the main HTML, but the login HTML uses direct stylesheet links.

## Prioritized work

1. Capture current Lighthouse/Web Vitals on the deployed production domain and the Vercel deployment URL at mobile/desktop widths.
2. Record initial HTML, LCP element, resource waterfall, JS/CSS transfer sizes, long tasks and CLS contributors.
3. Convert oversized above-the-fold images to responsive AVIF/WebP, supply width/height and responsive sizes, and prioritize only the true LCP image.
4. Lazy-load below-the-fold media and remove duplicated source/public image copies where import paths allow.
5. Split the large global stylesheet by feature/template and validate visual regression across all 16 templates.
6. Review route-level JS chunk sizes and dependencies before removing anything.
7. Self-host or subset fonts only after verifying brand typography and fallback behavior.

## Limitations

The available web fetch could not reach the supplied live URLs, and container DNS resolution failed. No current Lighthouse run, browser trace, image request measurement or before/after Core Web Vitals was produced. The report intentionally does not claim the performance targets are met.
