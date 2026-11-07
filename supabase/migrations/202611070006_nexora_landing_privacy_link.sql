-- =============================================================================
-- NEXORA SALONOS — privacy notice link (additive)
-- =============================================================================
-- The demo-request form now links to a real public privacy notice, so the
-- published footer navigation carries that entry as well. The insert follows
-- the same "where not exists" pattern as the seed migration, so re-running it
-- never creates a duplicate row.
-- =============================================================================

insert into public.navigation_items (location, label, href, open_new_tab, sort_order, is_visible)
select 'footer', 'Privacy notice', '/privacy', true, 401, true
where not exists (
  select 1 from public.navigation_items n
  where n.location = 'footer' and n.label = 'Privacy notice' and n.href = '/privacy'
);
