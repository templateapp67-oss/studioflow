# Explore & Discover Salons

Explore is the sixth footer navigation item, placed after Home. Direct route: `/?app=1&tab=explore`. The pink/white page follows the reference's compact heading/count, List/Map switch, search, Advanced Filters, horizontal categories, date/time/deal controls and full-width salon cards.

Data comes from the existing shared Supabase catalogue. Counts distinguish published salons from labelled template demos; six is never hard-coded. Search covers salon, city/address, service and stylist. Category, treatment, city, price and professional filters combine on the same candidate services. Sort supports saved/recommended salons, price and known distance. Code and 20%+ package filters require an active campaign tied to the matching service.

Date/time filters call `studioflow_android_slots` for matching published services, with at most four salon workers. Demos are excluded from live-slot results. Morning is before noon, afternoon noon–17:00, evening 17:00 onward. Requests refresh every 30 seconds; stale results are ignored and errors can be retried.

Book Slot carries the matching service, professional, date and slot into checkout. Checkout re-fetches server availability before preselection. The displayed minimum deposit links to the same cheapest matching service. Searching creates no reservation or payment. Existing trusted payment verification remains unchanged.

Map View uses an interactive Leaflet/OpenStreetMap map with all matching locations, grouped markers and linked shop cards. Owner-published pins take priority. Public address areas and template city areas can be resolved through the protected location cache and are explicitly approximate/demo, never confirmed shop pins. Unknown addresses remain in the list without fabricated positions. User location remains local and optional.

Filters persist in `e_` URL parameters. Salon details preserve the Explore tab and filters; back navigation restores the tab. Profile avatar, booking badge, rewards, favorites and language remain intact.

Verification: combined filter/count fixtures; nearest/price sort; demo exclusion from live slots; exact service/deposit/date/staff/slot handoff and checkout revalidation; real-coordinate map; six-tab and profile/Hindi/photo regression checks. Public Supabase verification returned 12 and 13 tomorrow slots for the current two published salons.
