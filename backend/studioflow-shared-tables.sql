-- Gap closure: objects referenced by StudioFlow migrations or called by the
-- web client that were never created in this repository. Safe to apply on a
-- fresh project and idempotent on the shared project.
-- PART 1 of 3: shared tables. Apply FIRST, before studioflow-schema.sql
-- (save_workspace/ensure_account bodies reference these at creation time).
begin;
-- 2. Shared tables (extend, never replace) --------------------------------
create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 salon_name text,
 phone_number text,
 phone text,
 whatsapp text,
 city text,
 postal_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists salon_name text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists whatsapp text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists postal_code text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles enable row level security;
drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select to authenticated using(id=(select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
revoke all on public.profiles from public,anon,authenticated;
grant select,update on public.profiles to authenticated;
grant all on public.profiles to service_role;


create table if not exists public.growth_partners(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 referral_code text not null unique,
 is_active boolean not null default true,
 banned_at timestamptz,
 deleted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.growth_partners enable row level security;
drop policy if exists growth_partners_read_own on public.growth_partners;
create policy growth_partners_read_own on public.growth_partners for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.growth_partners from public,anon,authenticated;
grant select on public.growth_partners to authenticated;
grant all on public.growth_partners to service_role;

create table if not exists public.growth_onboarding(
 user_id uuid primary key references auth.users(id) on delete cascade,
 growth_partner_id uuid,
 start_template_at timestamptz,
 complete_template_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.growth_onboarding enable row level security;
drop policy if exists growth_onboarding_read_own on public.growth_onboarding;
create policy growth_onboarding_read_own on public.growth_onboarding for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.growth_onboarding from public,anon,authenticated;
grant select on public.growth_onboarding to authenticated;
grant all on public.growth_onboarding to service_role;

create table if not exists public.partner_referrals(
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.growth_partners(id) on delete cascade,
 referred_user_id uuid not null unique references auth.users(id) on delete cascade,
 referral_code text,
 status text not null default 'registered',
 registered_at timestamptz not null default now(),
 source text,
 referred_email text,
 website_created_at timestamptz,
 website_published_at timestamptz,
 last_activity_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.partner_referrals enable row level security;
drop policy if exists partner_referrals_read_own on public.partner_referrals;
create policy partner_referrals_read_own on public.partner_referrals for select to authenticated
 using(partner_id in (select id from public.growth_partners where user_id=(select auth.uid())));
revoke all on public.partner_referrals from public,anon,authenticated;
grant select on public.partner_referrals to authenticated;
grant all on public.partner_referrals to service_role;

-- Growth linking + onboarding progress (called by ensure_account/save/publish).
create or replace function public.link_my_growth_referral(p_code text) returns void
language plpgsql security definer set search_path='' as $$
declare referrer public.growth_partners;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into referrer from public.growth_partners where referral_code=upper(btrim(coalesce(p_code,''))) and is_active and banned_at is null and deleted_at is null;
 if referrer.user_id is null then raise exception 'Invalid or inactive referral code' using errcode='22023'; end if;
 if referrer.user_id=auth.uid() then raise exception 'You cannot use your own referral code' using errcode='22023'; end if;
 insert into public.growth_onboarding(user_id,growth_partner_id) values(auth.uid(),referrer.user_id)
 on conflict(user_id) do update set growth_partner_id=excluded.growth_partner_id,updated_at=now();
end $$;
revoke all on function public.link_my_growth_referral(text) from public,anon,authenticated;
grant execute on function public.link_my_growth_referral(text) to authenticated,service_role;

create or replace function public.update_my_onboarding_progress(p_stage text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_stage not in ('start_template','complete_template') then raise exception 'Unknown onboarding stage'; end if;
 insert into public.growth_onboarding(user_id,start_template_at,complete_template_at)
 values(auth.uid(),case when p_stage='start_template' then now() end,case when p_stage='complete_template' then now() end)
 on conflict(user_id) do update set
  start_template_at=coalesce(public.growth_onboarding.start_template_at,excluded.start_template_at),
  complete_template_at=coalesce(public.growth_onboarding.complete_template_at,excluded.complete_template_at),
  updated_at=now();
end $$;
revoke all on function public.update_my_onboarding_progress(text) from public,anon,authenticated;
grant execute on function public.update_my_onboarding_progress(text) to authenticated,service_role;

commit;
