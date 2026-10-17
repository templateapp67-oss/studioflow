# Nexora customer PWA: supplied reference screens

The customer application at `/?app=1` follows the twelve user-supplied images dated 2026-10-15. The later 173837 image repeats the desired home layout. Published salon websites (`/?site=...`) and owner templates retain their separate layouts. Customer salon deep links (`/?app=1&site=...`) now use the customer app layout.

| Reference filename ending | Implemented screen |
| --- | --- |
| 144359, 173837 | Compact guest/profile/location header; points pill; theme switch; notification entry; large offer carousel with pagination; two-column service recommendation cards; five bottom navigation tabs |
| 144422, 144442 | My Bookings search, status tabs/counts, status summary tiles, appointment cards, payment amounts, directions/call, details, cancel and rebook |
| 144513 | Salon cover gallery, compact venue card, Services/Stylists/Packages/Reviews/About tabs, horizontal professional cards, fixed booking footer |
| 144536 | Published package/combo service cards and similar salons |
| 144553 | Actual customer review average, review cards and completed-visit review submission |
| 144629 | Salon description, address/directions, nearby salon explorer using published coordinates, amenities when published, policies |
| 144641 | Booking sheet with service images, multi-selection, professional selection and summary footer |
| 144652 | Today/Tomorrow/calendar controls and server-returned time-slot grid |
| 144729, 144754 | Seven separate summary cards: venue, services, professional, time, contact, instructions and payment; 25% advance with remainder |
| 144820 | Compact payment QR card, amount, real reservation countdown and server verification action |

Data remains in the same Supabase project. Example names, ratings, booking counts, services, slot prices and QR images from the references are not seeded as real records. Recommendations are deterministic selections from published services, prioritizing saved salons; no claim of an AI inference service is made. QR and checkout use the existing trusted payment functions; an unavailable payment configuration blocks reservation creation. User-editable names are display data only, never authorization inputs. Only the authenticated customer's booking/favorite data is queried. Existing database access policies remain unchanged.

Verification:
- TypeScript checks, production build and existing template/booking wiring suite.
- `node scripts/verify-customer-reference.mjs`: supplied-layout sections, CTA routing, service/slot payload, seven summary sections, 25% rounding, guest sign-in without reservation, real booking values, payment readiness before reservation, server-provided QR and trusted confirmation.
- `node scripts/verify-customer-pwa.mjs`: install manifest/icons and safe offline fallback.
- Browser/mobile visual comparison and device installation are not verified in this environment because the supported browser QA capability is unavailable.
