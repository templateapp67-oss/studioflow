# AI Studio template updates

Website preview → owner editing tools → Visual Customizer → **AI Studio** tab now updates
the active salon template, not just copy. It covers the same settings as Owner
workspace module 10 (Step 3: Logo, colours & hero), so either place edits the same
live workspace draft:

- Template switcher across all 14 category templates.
- Brand colour: curated accent palettes plus a custom hex override.
- Hero banner: active-template cover and gallery presets, or a custom image URL.
- Logo: one-click AI logo suite, plus a jump to the full Branding tab.
- Light/dark canvas toggle.

The copywriter presets (luxury, bridal, Gen-Z, ayurvedic) and the custom prompt box
now call the live server endpoint `POST /api/generate-bio` with the salon name,
category, owner, vibe and top services. Copy is treated as AI only when the server
reports `"source": "ai"` with non-empty text. Offline servers, static hosting,
missing `GEMINI_API_KEY`, empty responses and 20s timeouts fall back to curated
local copy, and the preview notice explicitly says the result is offline copy and
not AI-generated. Section-heading refreshes are local layout behaviour and apply in
both paths.

Verification: `node scripts/verify-ai-studio.mjs` (live-AI contract, fallback copy,
timeout, and every AI-tab template control), plus TypeScript and the production
build. Existing website-wiring and screen-recovery suites still pass.

## Unisex template image repair

The Aura/Unisex template was the only one whose hero cover, 6 gallery photos and
5 service images pointed at `/templates/aura-unisex/*.webp` files that were never
committed to the repo, so its AI Studio preview was broken on every deployment.
Those 12 URLs now use the same Unsplash CDN pattern as the other 13 templates
(titles, prices, text and all other templates untouched). The verify suite fails
if any template image ever points outside Unsplash/local/data URLs again.
