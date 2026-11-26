-- Ensure studioflow_bookings.hold_expires_at exists in every environment
-- (including QA/fresh databases whose availability/book RPCs reference it).
alter table public.studioflow_bookings
  add column if not exists hold_expires_at timestamptz;
