# Production Content Security Policy

Vercel serves an enforcing `Content-Security-Policy` header on application, published-site, template, and API routes. It is not a report-only header.

The executable-script policy is restricted to same-origin bundles plus runtime libraries loaded on demand: Razorpay Checkout from `checkout.razorpay.com`, Leaflet from `unpkg.com`, and Microsoft Clarity from `www.clarity.ms` / `*.clarity.ms`. Leaflet is pinned and loaded with Subresource Integrity; Razorpay's official Checkout SDK is a dynamic vendor script and is currently allowed by host without SRI. The Clarity bootstrap is served from the same origin as an asynchronous external script, then loads the Clarity tag asynchronously. Inline scripts and `eval` are not allowed. The JSON-LD blocks are non-executable data blocks.

The policy allows the configured Supabase project and its Realtime WebSocket for auth, database, storage, Edge Functions, and live updates; Razorpay for payment checkout; Microsoft Clarity for its tag and telemetry; Google Fonts only for the deferred full application; OpenStreetMap Nominatim/tiles; and the known image/video embed hosts used by salon templates. All other URLs use same-origin defaults.

**Framing is deny-by-default.** Non-root routes (including `/login`, `/owner`, `/staff`, `/admin`, and `/api`) keep `X-Frame-Options: DENY` and `frame-ancestors 'none'`. Only same-origin root app/storefront documents selected by `?app=1`, a validated `?site=<slug>`, `?s=<slug>`, or `?subdomain=<slug>` may use `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'self'`. Account, customer-auth, owner, invite, recovery, and token query flags override the public selector and keep framing blocked. No external parent origin is trusted; a Vercel preview embeds only its own same-origin app.

`style-src` and `style-src-attr` retain `unsafe-inline` because the current React templates rely on runtime style attributes for theme variables, image crops, and map geometry. This is a scoped compatibility exception: `script-src` and `script-src-attr` remain strict. Uploaded images should use Supabase Storage; a custom external image host must be explicitly reviewed and added to `img-src` (and `connect-src` only if browser-side URL import needs it).

Keep CSP changes paired with `scripts/verify-security-policy.mjs`. The offline policy verifier exercises public and private root query variants and confirms strict deny headers on all non-root routes. A live browser smoke test is still required to confirm the customer app loads inside all 16 template previews.
