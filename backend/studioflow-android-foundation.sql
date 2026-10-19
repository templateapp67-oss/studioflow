-- Gap closure: objects referenced by StudioFlow migrations or called by the
-- web client that were never created in this repository. Safe to apply on a
-- fresh project and idempotent on the shared project.
-- PART 2 of 3: android foundation. Apply after studioflow-schema.sql and
-- before customer-account-settings.sql / booking-coupons.sql / booking-add-ons.sql
-- (their bodies bind to this schema, tables and profile ensure at creation).
begin;
-- 1. Private schema -------------------------------------------------------
create schema if not exists studioflow_android_private;
revoke all on schema studioflow_android_private from public,anon;
grant usage on schema studioflow_android_private to authenticated,service_role;
-- Owner profile rows are created at signup (auth.users insert trigger).
create or replace function studioflow_android_private.create_profile_row() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),150)) on conflict(id) do nothing;
 return new;
end $$;
revoke all on function studioflow_android_private.create_profile_row() from public,anon,authenticated;
drop trigger if exists studioflow_profiles_insert on auth.users;
create trigger studioflow_profiles_insert after insert on auth.users for each row execute function studioflow_android_private.create_profile_row();

-- 3. Customer tables -------------------------------------------------------
create table if not exists public.studioflow_android_profiles(
 customer_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 phone text not null default '',
 photo_path text,
 referral_code text unique,
 referred_by uuid references auth.users(id) on delete set null,
 whatsapp_number text,
 date_of_birth date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.studioflow_android_profiles enable row level security;
drop policy if exists android_profiles_read_own on public.studioflow_android_profiles;
create policy android_profiles_read_own on public.studioflow_android_profiles for select to authenticated using(customer_id=(select auth.uid()));
revoke all on public.studioflow_android_profiles from public,anon,authenticated;
grant select on public.studioflow_android_profiles to authenticated;
grant all on public.studioflow_android_profiles to service_role;

create table if not exists public.studioflow_android_favorites(
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references auth.users(id) on delete cascade,
 salon_slug text not null,
 created_at timestamptz not null default now(),
 unique(customer_id,salon_slug)
);
alter table public.studioflow_android_favorites enable row level security;
drop policy if exists android_favorites_read_own on public.studioflow_android_favorites;
create policy android_favorites_read_own on public.studioflow_android_favorites for select to authenticated using(customer_id=(select auth.uid()));
drop policy if exists android_favorites_delete_own on public.studioflow_android_favorites;
create policy android_favorites_delete_own on public.studioflow_android_favorites for delete to authenticated using(customer_id=(select auth.uid()));
revoke all on public.studioflow_android_favorites from public,anon,authenticated;
grant select,delete on public.studioflow_android_favorites to authenticated;
grant all on public.studioflow_android_favorites to service_role;

create table if not exists public.studioflow_android_requests(
 request_id uuid primary key,
 customer_id uuid not null references auth.users(id) on delete cascade,
 booking_id uuid not null references public.studioflow_bookings(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.studioflow_android_requests enable row level security;
revoke all on public.studioflow_android_requests from public,anon,authenticated;
grant all on public.studioflow_android_requests to service_role;

-- Consumed by a future push worker; the enqueue trigger is intentionally not
-- attached until a consumer exists, so no dead rows are written.
create table if not exists public.studioflow_android_push_queue(
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references auth.users(id) on delete cascade,
 booking_id uuid not null references public.studioflow_bookings(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.studioflow_android_push_queue enable row level security;
revoke all on public.studioflow_android_push_queue from public,anon,authenticated;
grant all on public.studioflow_android_push_queue to service_role;
-- 4. Notification links ----------------------------------------------------
create table if not exists public.studioflow_notification_links(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 token text not null unique,
 created_at timestamptz not null default now(),
 used_at timestamptz
);
alter table public.studioflow_notification_links enable row level security;
drop policy if exists notification_links_read_own on public.studioflow_notification_links;
create policy notification_links_read_own on public.studioflow_notification_links for select to authenticated using(owner_id=(select auth.uid()));
revoke all on public.studioflow_notification_links from public,anon,authenticated;
grant select on public.studioflow_notification_links to authenticated;
grant all on public.studioflow_notification_links to service_role;
create or replace function studioflow_android_private.profile() returns public.studioflow_android_profiles
language plpgsql security definer set search_path='' as $$
declare me public.studioflow_android_profiles;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into public.studioflow_android_profiles(customer_id,full_name)
 values(auth.uid(),left(coalesce((select raw_user_meta_data->>'full_name' from auth.users where id=auth.uid()),''),150))
 on conflict(customer_id) do nothing returning * into me;
 if me.customer_id is null then select * into me from public.studioflow_android_profiles where customer_id=auth.uid(); end if;
 return me;
end $$;
revoke all on function studioflow_android_private.profile() from public,anon,authenticated;
grant execute on function studioflow_android_private.profile() to authenticated,service_role;
create or replace function public.studioflow_android_profile() returns jsonb
language sql stable security invoker set search_path='' as $$select to_jsonb(studioflow_android_private.profile())$$;
revoke all on function public.studioflow_android_profile() from public,anon,authenticated;
grant execute on function public.studioflow_android_profile() to authenticated,service_role;
create or replace function public.studioflow_android_save_profile(p_name text,p_phone text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to edit your profile.' using errcode='42501'; end if;
 if p_name is null or length(btrim(p_name)) not between 2 and 150 or p_phone is null or length(btrim(p_phone))>30 then raise exception 'Enter a valid name and phone'; end if;
 perform studioflow_android_private.profile();
 update public.studioflow_android_profiles set full_name=btrim(p_name),phone=btrim(p_phone),updated_at=now() where customer_id=auth.uid();
end $$;
revoke all on function public.studioflow_android_save_profile(text,text) from public,anon,authenticated;
grant execute on function public.studioflow_android_save_profile(text,text) to authenticated,service_role;
create or replace function public.studioflow_android_record_upload(p_path text,p_document boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_path is null or p_path<>auth.uid()::text||'/photos/'||split_part(p_path,'/',3) or right(p_path,4)<>'.jpg' then raise exception 'Invalid upload path'; end if;
 perform studioflow_android_private.profile();
 update public.studioflow_android_profiles set photo_path=p_path,updated_at=now() where customer_id=auth.uid();
end $$;
revoke all on function public.studioflow_android_record_upload(text,boolean) from public,anon,authenticated;
grant execute on function public.studioflow_android_record_upload(text,boolean) to authenticated,service_role;
create or replace function public.studioflow_android_referral() returns text
language plpgsql security definer set search_path='' as $$
declare code text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 perform studioflow_android_private.profile();
 select referral_code into code from public.studioflow_android_profiles where customer_id=auth.uid();
 if code is null then
  loop
   begin
    code:=upper(substr(md5(gen_random_uuid()::text),1,8));
    update public.studioflow_android_profiles set referral_code=code,updated_at=now() where customer_id=auth.uid() and referral_code is null;
    if found then exit; end if;
    select referral_code into code from public.studioflow_android_profiles where customer_id=auth.uid();
    exit;
   exception when unique_violation then null;
   end;
  end loop;
 end if;
 return code;
end $$;
revoke all on function public.studioflow_android_referral() from public,anon,authenticated;
grant execute on function public.studioflow_android_referral() to authenticated,service_role;
create or replace function public.get_my_referral_code() returns text
language plpgsql security definer set search_path='' as $$
declare code text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select referral_code into code from public.growth_partners where user_id=auth.uid();
 if code is null then
  loop
   begin
    code:=upper(substr(md5(gen_random_uuid()::text),1,12));
    insert into public.growth_partners(user_id,referral_code) values(auth.uid(),code) on conflict(user_id) do nothing;
    select referral_code into code from public.growth_partners where user_id=auth.uid();
    exit;
   exception when unique_violation then null;
   end;
  end loop;
 end if;
 return code;
end $$;
revoke all on function public.get_my_referral_code() from public,anon,authenticated;
grant execute on function public.get_my_referral_code() to authenticated,service_role;
create or replace function public.get_my_partner_referrals_filtered(p_limit integer default 100,p_offset integer default 0) returns jsonb
language sql stable security invoker set search_path='' as $$
with mine as (select id from public.growth_partners where user_id=auth.uid()),
rows as (select r.id,r.referred_email,r.registered_at,r.status from public.partner_referrals r join mine m on m.id=r.partner_id order by r.registered_at desc limit greatest(1,least(100,coalesce(p_limit,100))) offset greatest(0,coalesce(p_offset,0)))
select jsonb_build_object('total',(select count(*) from public.partner_referrals r join mine m on m.id=r.partner_id),
 'status_counts',jsonb_build_object('converted',(select count(*) from public.partner_referrals r join mine m on m.id=r.partner_id where r.status='converted')),
 'rows',coalesce((select jsonb_agg(jsonb_build_object('referral_id',id,'ref',referred_email,'joined_at',registered_at,'referral_status',status)) from rows),'[]'::jsonb))$$;
revoke all on function public.get_my_partner_referrals_filtered(integer,integer) from public,anon,authenticated;
grant execute on function public.get_my_partner_referrals_filtered(integer,integer) to authenticated,service_role;
create or replace function public.nexora_create_notification_link() returns text
language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 token:=encode(gen_random_bytes(32),'hex');
 insert into public.studioflow_notification_links(owner_id,token) values(auth.uid(),token);
 return token;
end $$;
revoke all on function public.nexora_create_notification_link() from public,anon,authenticated;
grant execute on function public.nexora_create_notification_link() to authenticated,service_role;
commit;
