# Barber design reference

Source: https://github.com/profit-studio-projects-free/barbershop-booking-website
User-supplied archive: `barbershop-booking-website-main.zip`.
GitHub Hero.tsx blob inspected: `82ec3ee4bf8fa8afa9834bd28858a70e3db409a4`.

The dark ink/bronze/cream palette, split editorial hero, floating image card, rounded service cards, craft section and source image catalogue are adapted for the `barber` category only. Styles are scoped to `.sf-barber`. Existing owner business data, INR prices, service images, reviews, team, 25% payment checkout, authentication and Supabase workspace remain connected. Reference demo identities, location, review totals and booking/backend schema are not imported.

Every category uses the same validated header-navigation configuration. Website sections & content exposes enable/disable and up/down ordering. Services, Packages, Gallery, About, Contact and Home use real anchors; My Bookings opens the existing authenticated customer booking route. Packages are services whose category/name includes package, combo or bundle; manage them through the existing service catalogue. The navigation configuration is saved inside the owner profile by the existing revision-checked workspace RPC and synchronized to published content in the same transaction; no separate navigation table or write path is introduced.
