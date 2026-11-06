# StudioFlow Performance Report

**Date:** 2026-11-06

## Measurements available

| Metric | Value | Source / status |
|---|---:|---|
| Main JS chunk | ~1,453.54 KB uncompressed | Prior PR #80 Vite build output; not a fresh current-main measurement. |
| Salon website preview chunk | ~1,094.50 KB uncompressed | Prior PR #80 Vite build output; not a fresh current-main measurement. |
| Main JS gzip | ~438.94 KB | Prior PR #80 Vite build output. |
| Mobile LCP | ~3,960 ms | Historical BugViso audit lead supplied in the project brief; not independently re-measured. |
| Mobile FCP | ~3,960 ms | Historical BugViso audit lead supplied in the project brief; not independently re-measured. |
| CLS / INP | Not measured | Requires live browser performance run. |
| Current bundle | Not measured | Current main build was not run in an isolated local runner in this session. |

## Findings and likely causes

- `AppRouter` lazy-loads the full application, but template previews/editors still produce a large chunk.
- Template-specific website components and media may be imported through shared modules.
- Fonts and hero assets have preload behavior; preload must be route-aware to avoid downloading a non-visible hero.
- The app includes both `framer-motion` and `motion`; verify duplicate runtime usage before removal.
- Image savings and responsive srcset behavior require actual asset-level and browser-network inspection.

## Priorities

1. Profile current main bundle and generate a module/chunk treemap.
2. Lazy-load template editors individually and keep preview cards lightweight.
3. Use responsive AVIF/WebP variants with explicit dimensions and accurate sizes.
4. Preload only the actual LCP image for the current route.
5. Defer below-the-fold gallery, reels and map media.
6. Check font-display, preload usage and unused font weights.
7. Measure real mobile LCP/FCP/CLS/INP with Lighthouse/PageSpeed or field data.

## Targets (not yet achieved/verified)

- LCP <= 2.5s
- FCP <= 1.8s
- CLS <= 0.1
- INP <= 200ms

No target is marked achieved without a fresh measurement.
