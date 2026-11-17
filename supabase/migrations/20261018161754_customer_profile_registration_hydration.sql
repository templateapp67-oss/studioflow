-- Both website and native APK call the same authenticated profile RPC.
-- Fill missing contact details from registration only; preserve customer edits.
create or replace function studioflow_android_private.profile() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid(); meta jsonb; dob date; raw_dob text;
 v_name text; v_phone text; v_whatsapp text;
begin
 if uid is null then raise exception 'Sign in required'; end if;
 select raw_user_meta_data into meta from auth.users where id=uid;
 if not found then raise exception 'Sign in required'; end if;
 v_name := left(coalesce(nullif(nullif(btrim(meta->>'full_name'),''),'null'),nullif(nullif(btrim(meta->>'name'),''),'null'),''),150);
 v_whatsapp := nullif(nullif(btrim(meta->>'whatsapp_number'),''),'null');
 if v_whatsapp is not null and v_whatsapp !~ '^\+91[1-9][0-9]{9}$' then v_whatsapp := null; end if;
 v_phone := left(coalesce(nullif(nullif(btrim(meta->>'phone'),''),'null'),nullif(nullif(btrim(meta->>'phone_number'),''),'null'),v_whatsapp,''),30);
 raw_dob := meta->>'date_of_birth';
 if raw_dob ~ '^\d{4}-\d{2}-\d{2}$' then
  begin dob := raw_dob::date; exception when datetime_field_overflow or invalid_datetime_format then dob := null; end;
 end if;
 if dob < date '1900-01-01' or dob > (now() at time zone 'Asia/Kolkata')::date then dob := null; end if;
 insert into public.studioflow_android_profiles as p(customer_id,full_name,phone,whatsapp_number,date_of_birth)
 values(uid,v_name,v_phone,v_whatsapp,dob)
 on conflict(customer_id) do update set
  full_name=coalesce(nullif(nullif(btrim(p.full_name),''),'null'),excluded.full_name),
  phone=coalesce(nullif(nullif(btrim(p.phone),''),'null'),nullif(excluded.phone,''),nullif(nullif(btrim(p.whatsapp_number),''),'null'),''),
  whatsapp_number=coalesce(nullif(nullif(btrim(p.whatsapp_number),''),'null'),excluded.whatsapp_number),
  date_of_birth=coalesce(p.date_of_birth,excluded.date_of_birth);
 return (select (to_jsonb(p)-'referred_by') || jsonb_build_object(
  'full_name',coalesce(nullif(p.full_name,'null'),''),'phone',coalesce(nullif(p.phone,'null'),''),
  'whatsapp_number',coalesce(nullif(p.whatsapp_number,'null'),''),'date_of_birth',coalesce(p.date_of_birth::text,''))
  from public.studioflow_android_profiles p where customer_id=uid);
end $$;
