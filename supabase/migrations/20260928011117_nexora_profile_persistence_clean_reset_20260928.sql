-- Clean-reset compatibility layer: profile persistence and editor state.
begin;

alter table public.profiles
  add column if not exists phone text,
  add column if not exists mobile text,
  add column if not exists pincode text,
  add column if not exists area text,
  add column if not exists preferred_city text,
  add column if not exists preferred_area text,
  add column if not exists avatar_url text,
  add column if not exists photo_url text,
  add column if not exists date_of_birth date,
  add column if not exists dob date,
  add column if not exists whatsapp_notifications boolean not null default true,
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.profiles set user_id = id where user_id is null;

create table if not exists public.owner_editor_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.owner_editor_state enable row level security;
drop policy if exists owner_editor_state_owner_all on public.owner_editor_state;
create policy owner_editor_state_owner_all on public.owner_editor_state
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create or replace function public.get_my_profile_settings()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'ownerName', coalesce(p.full_name, ''),
    'phone', coalesce(p.phone, p.phone_number, ''),
    'whatsapp', coalesce(p.whatsapp, ''),
    'postalCode', coalesce(p.postal_code, p.pincode, ''),
    'city', coalesce(p.city, p.preferred_city, ''),
    'area', coalesce(p.area, p.preferred_area, ''),
    'email', coalesce(p.email, ''),
    'address', coalesce(p.full_address, ''),
    'state', coalesce(p.state, ''),
    'landmark', coalesce(p.landmark, ''),
    'dob', coalesce(p.dob, p.date_of_birth)::text,
    'avatar', coalesce(p.avatar_url, p.owner_photo_url, p.photo_url, ''),
    'notifications', p.whatsapp_notifications
  )
  from public.profiles p
  where p.id = (select auth.uid());
$$;

create or replace function public.save_my_profile_settings(p_profile jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  actor uuid := auth.uid();
  date_value date;
begin
  if actor is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_profile is null or jsonb_typeof(p_profile) <> 'object' then raise exception 'Invalid profile payload'; end if;
  begin
    date_value := nullif(coalesce(p_profile->>'dob', p_profile->>'dateOfBirth'), '')::date;
  exception when invalid_datetime_format then
    date_value := null;
  end;
  insert into public.profiles (id, user_id, full_name, email, phone, phone_number, mobile, whatsapp, postal_code, pincode, city, preferred_city, area, preferred_area, full_address, state, landmark, dob, date_of_birth, avatar_url, owner_photo_url, photo_url, whatsapp_notifications)
  values (actor, actor, nullif(p_profile->>'ownerName',''), nullif(p_profile->>'email',''), nullif(p_profile->>'phone',''), nullif(p_profile->>'phone',''), nullif(p_profile->>'phone',''), nullif(p_profile->>'whatsapp',''), nullif(p_profile->>'postalCode',''), nullif(p_profile->>'postalCode',''), nullif(p_profile->>'city',''), nullif(p_profile->>'city',''), nullif(p_profile->>'areaLocality',''), nullif(p_profile->>'areaLocality',''), nullif(p_profile->>'address',''), nullif(p_profile->>'state',''), nullif(p_profile->>'landmark',''), date_value, date_value, nullif(p_profile->>'ownerPhotoUrl',''), nullif(p_profile->>'ownerPhotoUrl',''), nullif(p_profile->>'ownerPhotoUrl',''), coalesce((p_profile->>'whatsappNotificationsEnabled')::boolean, true))
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name), email = coalesce(excluded.email, profiles.email),
    phone = coalesce(excluded.phone, profiles.phone), phone_number = coalesce(excluded.phone_number, profiles.phone_number), mobile = coalesce(excluded.mobile, profiles.mobile),
    whatsapp = coalesce(excluded.whatsapp, profiles.whatsapp), postal_code = coalesce(excluded.postal_code, profiles.postal_code), pincode = coalesce(excluded.pincode, profiles.pincode),
    city = coalesce(excluded.city, profiles.city), preferred_city = coalesce(excluded.preferred_city, profiles.preferred_city), area = coalesce(excluded.area, profiles.area), preferred_area = coalesce(excluded.preferred_area, profiles.preferred_area),
    full_address = coalesce(excluded.full_address, profiles.full_address), state = coalesce(excluded.state, profiles.state), landmark = coalesce(excluded.landmark, profiles.landmark),
    dob = coalesce(excluded.dob, profiles.dob), date_of_birth = coalesce(excluded.date_of_birth, profiles.date_of_birth), avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    owner_photo_url = coalesce(excluded.owner_photo_url, profiles.owner_photo_url), photo_url = coalesce(excluded.photo_url, profiles.photo_url), whatsapp_notifications = excluded.whatsapp_notifications;
  return public.get_my_profile_settings();
end;
$$;

create or replace function public.get_owner_editor_state()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$ select state from public.owner_editor_state where owner_id = (select auth.uid()) $$;

create or replace function public.save_owner_editor_state(p_state jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then raise exception 'Invalid editor state'; end if;
  insert into public.owner_editor_state(owner_id, state) values(actor, p_state)
  on conflict(owner_id) do update set state = excluded.state, updated_at = now();
  return p_state;
end;
$$;

revoke all on function public.get_my_profile_settings() from public, anon;
revoke all on function public.save_my_profile_settings(jsonb) from public, anon;
revoke all on function public.get_owner_editor_state() from public, anon;
revoke all on function public.save_owner_editor_state(jsonb) from public, anon;
grant execute on function public.get_my_profile_settings(), public.save_my_profile_settings(jsonb), public.get_owner_editor_state(), public.save_owner_editor_state(jsonb) to authenticated;
grant select, insert, update, delete on public.owner_editor_state to authenticated;
commit;
