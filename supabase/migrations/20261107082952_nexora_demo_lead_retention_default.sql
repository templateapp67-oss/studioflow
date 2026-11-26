alter table public.landing_leads
  alter column retention_expires_at set default (now() + interval '180 days');

update public.landing_leads
set retention_expires_at = created_at + interval '180 days'
where retention_expires_at is null;
