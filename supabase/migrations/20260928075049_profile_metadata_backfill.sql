create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  insert into public.profiles (
    id, email, full_name, salon_name, phone_number, phone, whatsapp, city
  ) values (
    new.id,
    new.email,
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'salon_name'), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone_number', new.raw_user_meta_data ->> 'phone')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone_number', new.raw_user_meta_data ->> 'phone')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone_number', new.raw_user_meta_data ->> 'phone')), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'city'), '')
  )
  on conflict (id) do update set
    email = coalesce(public.profiles.email, excluded.email),
    full_name = case
      when nullif(btrim(public.profiles.full_name), '') is null or lower(btrim(public.profiles.full_name)) = 'user'
        then excluded.full_name else public.profiles.full_name end,
    salon_name = coalesce(nullif(btrim(public.profiles.salon_name), ''), excluded.salon_name),
    phone_number = coalesce(nullif(btrim(public.profiles.phone_number), ''), excluded.phone_number),
    phone = coalesce(nullif(btrim(public.profiles.phone), ''), excluded.phone),
    whatsapp = coalesce(nullif(btrim(public.profiles.whatsapp), ''), excluded.whatsapp),
    city = coalesce(nullif(btrim(public.profiles.city), ''), excluded.city),
    updated_at = now();
  return new;
end;
$$;

update public.profiles p
set
  email = coalesce(nullif(btrim(p.email), ''), u.email),
  full_name = case
    when nullif(btrim(p.full_name), '') is null or lower(btrim(p.full_name)) = 'user'
      then nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '') else p.full_name end,
  salon_name = coalesce(nullif(btrim(p.salon_name), ''), nullif(btrim(u.raw_user_meta_data ->> 'salon_name'), '')),
  phone_number = coalesce(nullif(btrim(p.phone_number), ''), nullif(btrim(coalesce(u.raw_user_meta_data ->> 'phone_number', u.raw_user_meta_data ->> 'phone')), '')),
  phone = coalesce(nullif(btrim(p.phone), ''), nullif(btrim(coalesce(u.raw_user_meta_data ->> 'phone_number', u.raw_user_meta_data ->> 'phone')), '')),
  whatsapp = coalesce(nullif(btrim(p.whatsapp), ''), nullif(btrim(coalesce(u.raw_user_meta_data ->> 'phone_number', u.raw_user_meta_data ->> 'phone')), '')),
  city = coalesce(nullif(btrim(p.city), ''), nullif(btrim(u.raw_user_meta_data ->> 'city'), '')),
  updated_at = now()
from auth.users u
where p.id = u.id
  and (
    nullif(btrim(p.full_name), '') is null
    or lower(btrim(coalesce(p.full_name, ''))) = 'user'
    or nullif(btrim(p.salon_name), '') is null
    or nullif(btrim(p.phone_number), '') is null
    or nullif(btrim(p.city), '') is null
  );

revoke all on function public.handle_new_user() from public, anon, authenticated;
notify pgrst, 'reload schema';
