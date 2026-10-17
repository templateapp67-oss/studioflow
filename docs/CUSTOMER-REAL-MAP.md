# Real salon map

Explore Map View now uses the real OpenStreetMap raster map through a shared, pinned Leaflet 1.9.4 loader. The same loader is used by the owner location editor. The canvas supports pan/pinch, zoom controls, fit-all, fullscreen, and optional 3/5/10 km filters after the visitor chooses their location. User coordinates are held in browser state, never written to Supabase or sent to the geocoder.

All matching shop markers and swipeable shop cards share the catalogue filters and existing protected booking flow. Marker popups and labels use DOM textContent, not untrusted HTML. Same-coordinate listings group together, without inventing different positions. Prices on map cards use the matching services, not an unrelated starting price. Map View and filters persist in the URL.

Location precedence:

- Real owner-published latitude/longitude: owner pin, immediately supersedes cached lookups.
- Public shop address/postcode: approximate address or postal area; never written into the owner profile as a confirmed pin.
- Active template default city: labelled demo city area, never presented as an actual shop.
- Missing/unlocatable address: no pin; listing remains below the map.

`studioflow-map-locations` v2 accepts only this project's public API key and a validated published salon slug or active template ID. Its server-only RPCs derive the lookup text from public catalogue data, cache by source hash, and enforce a global 1.2-second provider request interval. Callers cannot supply arbitrary addresses, coordinates, storage keys or user IDs. Private cache/RPC access is revoked from anon/authenticated roles; only the trusted server can claim/complete lookups. CORS is public because the output is public business-location data.

The current 14 template-city lookups and one public postcode-area lookup were obtained from Nominatim with an identifying User-Agent and sequential requests, then cached in Supabase. Auditable public lookup data is in `backend/data/customer-map-area-cache.json`. One real salon has an empty address/city; the other has a Mumbai postcode/address and Jaipur city. The latter therefore appears as an approximate published-address area, pending an owner pin. No owner profile was altered.

The upstream geocoder is not consistently reachable from the Supabase Edge runtime. Current cached lookups are verified through the deployed endpoint. New uncached addresses may return a temporary lookup error; the map handles it without inventing a pin and owner-published coordinates work independently of that provider. The geocoder endpoint is configurable through STUDIOFLOW_GEOCODER_URL. Empty successful results cache for 24 hours; transient upstream failures remain retryable. Cache data invalidates when the public lookup source changes.

Verification: TypeScript; Explore and existing booking/profile regressions; real coordinate precedence and unknown/demo exclusion from owner pins; grouped coordinates and distinct accuracy labels; anon/customer RPC denial; private-schema denial; public cached endpoint response; no owner coordinate writes. Security advisors report informational RLS-without-policy notices on the two intentionally server-only private tables; no public grants were added to them. Browser verification checks real map tiles, markers, shop cards and zoom after publication.
