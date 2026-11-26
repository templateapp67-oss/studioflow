-- =============================================================================
-- NEXORA SALONOS — retire the Product Experience section
-- =============================================================================
-- The "A Clear View of Your Salon Business" product-preview block (section
-- heading, description, the three illustrative preview cards and the "Open
-- your workspace" button) has been removed from the public landing layout.
-- This migration removes the published content and the navigation entries that
-- pointed at its now-missing `#product-preview` anchor, so the database cannot
-- re-render the retired section or ship a dead navigation link.
--
-- Safe to run more than once: both statements are plain, idempotent deletes.
-- Pricing, plan entitlements, features, FAQs, testimonials, settings and every
-- other section are untouched.
-- =============================================================================

-- Landing section copy/content for the retired block.
delete from public.landing_sections
where section_key = 'product_preview';

-- Header, mobile and footer links that target the removed anchor.
delete from public.navigation_items
where href = '#product-preview';
