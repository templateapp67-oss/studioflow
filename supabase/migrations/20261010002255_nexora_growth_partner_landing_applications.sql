create table public.nexora_growth_partner_applications (
 id uuid primary key,
 submission_id uuid not null unique,
 full_name text not null check(char_length(trim(full_name)) between 2 and 120),
 mobile text not null unique check(mobile ~ '^[6-9][0-9]{9}$'),
 email text not null check(char_length(email) <= 180 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 city text not null check(char_length(trim(city)) between 2 and 120),
 state text not null check(char_length(trim(state)) between 2 and 120),
 occupation text not null check(char_length(trim(occupation)) between 2 and 120),
 connections text not null check(connections in ('Yes','No')),
 approach integer not null check(approach between 0 and 9999),
 language text not null check(char_length(trim(language)) between 2 and 120),
 consent boolean not null check(consent is true),
 status text not null default 'submitted' check(status in ('submitted','in_review','approved','rejected')),
 consent_at timestamptz not null default now(),
 terms_version text not null default 'program-summary-v1',
 created_at timestamptz not null default now()
);
create index nexora_partner_applications_status_created_idx on public.nexora_growth_partner_applications(status,created_at desc);
alter table public.nexora_growth_partner_applications enable row level security;
revoke all on public.nexora_growth_partner_applications from anon,authenticated;
grant insert (id,submission_id,full_name,mobile,email,city,state,occupation,connections,approach,language,consent) on public.nexora_growth_partner_applications to anon;
grant all on public.nexora_growth_partner_applications to service_role;
create policy "Public application submission only" on public.nexora_growth_partner_applications for insert to anon with check (status='submitted' and consent is true and terms_version='program-summary-v1');
comment on table public.nexora_growth_partner_applications is 'Nexora Growth Partner landing-page applications. Public insert only; applicant data is not publicly readable.';
notify pgrst,'reload schema';
