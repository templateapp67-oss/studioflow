-- =============================================================================
-- NEXORA SALONOS — lead retention default (additive)
-- =============================================================================
-- The operations migration added `retention_expires_at` and backfilled the
-- rows that already existed, but a newly inserted lead still received NULL.
-- The default makes every new lead inherit the same 180 day retention window
-- that the backfill used, no matter which trusted writer created the row.
-- =============================================================================

alter table public.landing_leads
  alter column retention_expires_at set default (now() + interval '180 days');

update public.landing_leads
set retention_expires_at = created_at + interval '180 days'
where retention_expires_at is null;
