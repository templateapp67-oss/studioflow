-- =============================================================================
-- NEXORA SALONOS — retire the Salon Promotion Studio section
-- =============================================================================
-- The Salon Promotion Studio block (creative gallery, workflow list, sharing
-- list and its heading) has been removed from the public landing layout. This
-- migration removes the published content and the navigation entries that
-- pointed at its now-missing `#salon-marketing` anchor, so the database cannot
-- re-render the retired section or ship a dead navigation link.
--
-- Rows in `promotional_creatives` are intentionally left in place: they were
-- seeded as unpublished drafts, they are not rendered anywhere now, and
-- deleting them would discard data that is not part of the layout change.
--
-- Safe to run more than once: both statements are plain, idempotent deletes.
-- Pricing, plan entitlements, features, FAQs, testimonials, settings and every
-- other section are untouched.
-- =============================================================================

-- Landing section copy/content for the retired block.
delete from public.landing_sections
where section_key = 'salon_promotion_studio';

-- Header, mobile and footer links that target the removed anchor.
delete from public.navigation_items
where href = '#salon-marketing';
